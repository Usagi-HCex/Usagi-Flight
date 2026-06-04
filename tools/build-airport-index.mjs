import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "assets", "data");
const OUT_INDEX = path.join(OUT_DIR, "airport-index.json");
const OUT_META = path.join(OUT_DIR, "airport-index-meta.json");

const SOURCE_URL = process.env.OURAIRPORTS_AIRPORTS_CSV_URL ||
  "https://davidmegginson.github.io/ourairports-data/airports.csv";

const INCLUDE_NON_SCHEDULED = process.env.AIRPORT_INDEX_INCLUDE_NON_SCHEDULED === "1";
const INCLUDE_CLOSED = process.env.AIRPORT_INDEX_INCLUDE_CLOSED === "1";

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsv(text) {
  const normalized = String(text || "").replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const row = {};

    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]] = values[j] ?? "";
    }

    rows.push(row);
  }

  return { headers, rows };
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  const text = cleanText(value);
  return text ? text.toUpperCase() : "";
}

function toNumber(value) {
  const number = Number(cleanText(value));
  return Number.isFinite(number) ? number : null;
}

function normalizeType(type) {
  return cleanText(type).toLowerCase();
}

function normalizeIata(row) {
  const iata = upper(row.iata_code);
  return /^[A-Z0-9]{3}$/.test(iata) ? iata : "";
}

function normalizeIcao(row) {
  const candidates = [row.icao_code, row.gps_code, row.ident].map(upper);
  return candidates.find((code) => /^[A-Z0-9]{4}$/.test(code)) || "";
}

function lookupCodesForRow(row) {
  const iata = normalizeIata(row);
  const icao = normalizeIcao(row);
  const codes = [];

  if (iata) codes.push({ code: iata, type: "IATA" });
  if (icao && icao !== iata) codes.push({ code: icao, type: "ICAO" });

  return codes;
}

function shouldIndexAirport(row) {
  if (lookupCodesForRow(row).length === 0) return false;

  const type = normalizeType(row.type);
  if (!INCLUDE_CLOSED && type === "closed") return false;

  const lat = toNumber(row.latitude_deg);
  const lon = toNumber(row.longitude_deg);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;

  if (!INCLUDE_NON_SCHEDULED) {
    const scheduled = cleanText(row.scheduled_service).toLowerCase();
    const importantTypes = new Set(["large_airport", "medium_airport"]);
    if (scheduled !== "yes" && !importantTypes.has(type)) return false;
  }

  return true;
}

function scoreAirport(row, lookupType) {
  const type = normalizeType(row.type);
  const scheduled = cleanText(row.scheduled_service).toLowerCase() === "yes" ? 100 : 0;
  const typeScore = {
    large_airport: 50,
    medium_airport: 40,
    small_airport: 25,
    seaplane_base: 10,
    heliport: 5,
    balloonport: 1,
    closed: -100
  }[type] ?? 0;

  const codeScore = lookupType === "IATA" ? 8 : 6;
  const hasGps = normalizeIcao(row) ? 5 : 0;
  const hasWiki = cleanText(row.wikipedia_link) ? 2 : 0;
  return scheduled + typeScore + codeScore + hasGps + hasWiki;
}

function toAirportIndexEntry(row, lookupCode, lookupType) {
  const iata = normalizeIata(row);
  const icao = normalizeIcao(row);
  const gpsCode = upper(row.gps_code);

  return {
    lookup_code: lookupCode,
    lookup_code_type: lookupType,
    display_code: lookupCode,
    iata_code: lookupCode,
    original_iata_code: iata,
    icao_code: icao,
    gps_code: gpsCode,
    ident: upper(row.ident),
    name: cleanText(row.name),
    latitude_deg: toNumber(row.latitude_deg),
    longitude_deg: toNumber(row.longitude_deg),
    iso_country: upper(row.iso_country),
    municipality: cleanText(row.municipality),
    type: cleanText(row.type),
    scheduled_service: cleanText(row.scheduled_service),
    source_id: Number(cleanText(row.id)) || null
  };
}

async function main() {
  console.log(`Fetching OurAirports CSV: ${SOURCE_URL}`);
  const response = await fetch(SOURCE_URL, {
    headers: {
      accept: "text/csv, text/plain;q=0.9, */*;q=0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch OurAirports CSV: HTTP ${response.status}`);
  }

  const csvText = await response.text();
  const parsed = parseCsv(csvText);
  const airportMap = {};
  const selectedScores = new Map();
  let duplicateLookupCodeCount = 0;
  let indexedSourceRows = 0;
  let selectedLookupCodeRows = 0;
  let indexedIataLookupCodes = 0;
  let indexedIcaoLookupCodes = 0;

  for (const row of parsed.rows) {
    if (!shouldIndexAirport(row)) continue;

    const lookupCodes = lookupCodesForRow(row);
    if (lookupCodes.length === 0) continue;

    indexedSourceRows += 1;

    for (const lookup of lookupCodes) {
      const score = scoreAirport(row, lookup.type);
      const previousScore = selectedScores.get(lookup.code);

      if (previousScore !== undefined) {
        duplicateLookupCodeCount += 1;
        if (score <= previousScore) continue;
      }

      airportMap[lookup.code] = toAirportIndexEntry(row, lookup.code, lookup.type);
      selectedScores.set(lookup.code, score);
      selectedLookupCodeRows += 1;
    }
  }

  const sortedAirports = Object.fromEntries(
    Object.entries(airportMap).sort(([a], [b]) => a.localeCompare(b))
  );

  for (const entry of Object.values(sortedAirports)) {
    if (entry.lookup_code_type === "IATA") indexedIataLookupCodes += 1;
    if (entry.lookup_code_type === "ICAO") indexedIcaoLookupCodes += 1;
  }

  const generatedAt = new Date().toISOString();
  const meta = {
    generated_at: generatedAt,
    source_url: SOURCE_URL,
    source_last_modified: response.headers.get("last-modified") || "",
    source_etag: response.headers.get("etag") || "",
    source_content_length: response.headers.get("content-length") || String(csvText.length),
    source_total_rows: parsed.rows.length,
    indexed_lookup_code_count: Object.keys(sortedAirports).length,
    indexed_iata_lookup_code_count: indexedIataLookupCodes,
    indexed_icao_lookup_code_count: indexedIcaoLookupCodes,
    indexed_source_row_count_before_alias_expansion: indexedSourceRows,
    selected_lookup_code_rows_before_dedup: selectedLookupCodeRows,
    duplicate_lookup_code_rows_seen: duplicateLookupCodeCount,
    filters: {
      iata_or_icao_code_required: true,
      include_non_scheduled: INCLUDE_NON_SCHEDULED,
      include_closed: INCLUDE_CLOSED,
      default_policy: INCLUDE_NON_SCHEDULED
        ? "IATA/ICAO-coded airports only"
        : "IATA/ICAO-coded airports with scheduled_service=yes, plus large/medium airports"
    },
    compatibility: {
      airports_object_keys: "IATA and ICAO lookup codes",
      iata_code_field: "kept as the lookup/display code for existing map renderer compatibility",
      original_iata_code_field: "original OurAirports iata_code"
    }
  };

  const indexPayload = {
    meta,
    airports: sortedAirports
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_INDEX, JSON.stringify(indexPayload), "utf8");
  await fs.writeFile(OUT_META, JSON.stringify(meta, null, 2) + "\n", "utf8");

  console.log(`Airport index written: ${path.relative(ROOT, OUT_INDEX)}`);
  console.log(`Airport meta written: ${path.relative(ROOT, OUT_META)}`);
  console.log(`Source rows: ${meta.source_total_rows}`);
  console.log(`Indexed lookup codes: ${meta.indexed_lookup_code_count}`);
  console.log(`Indexed IATA lookup codes: ${meta.indexed_iata_lookup_code_count}`);
  console.log(`Indexed ICAO lookup codes: ${meta.indexed_icao_lookup_code_count}`);
  console.log(`Duplicate lookup code rows seen: ${meta.duplicate_lookup_code_rows_seen}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_FILE = path.join(ROOT, "data", "airlines_code.csv");
const OUT_DIR = path.join(ROOT, "assets", "data");
const OUT_FILE = path.join(OUT_DIR, "airline-index.json");
const META_FILE = path.join(OUT_DIR, "airline-index-meta.json");

function parseDelimitedLine(line, delimiter = "^") {
  const values = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (ch === delimiter && !quoted) {
      values.push(current);
      current = "";
      continue;
    }
    current += ch;
  }

  values.push(current);
  return values;
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function cleanText(value) {
  return String(value || "").trim();
}

function cleanDate(value) {
  const text = cleanText(value).replaceAll("/", "-");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function appliesOnDate(record, date) {
  if (!date) return false;
  if (record.effective_from && date < record.effective_from) return false;
  if (record.effective_until && date > record.effective_until) return false;
  return true;
}

function compareVariant(a, b) {
  return (a.effective_from || "0000-00-00").localeCompare(b.effective_from || "0000-00-00") ||
    (a.effective_until || "9999-99-99").localeCompare(b.effective_until || "9999-99-99") ||
    a.name.localeCompare(b.name);
}

function chooseDefaultVariant(records) {
  const today = new Date().toISOString().slice(0, 10);
  const active = records
    .filter((record) => appliesOnDate(record, today))
    .sort((a, b) => compareVariant(b, a));

  if (active.length) return active[0];

  return [...records].sort((a, b) => compareVariant(a, b)).at(-1) || null;
}

function makeRecord(row) {
  const iata = normalizeCode(row.iata_code);
  const icao = normalizeCode(row.icao_code);
  const name = cleanText(row.name);
  const alias = cleanText(row.alias);
  const displayName = name || alias;

  if (!displayName || (!iata && !icao)) return null;

  return {
    iata_code: iata,
    icao_code: icao,
    name: displayName,
    alias,
    effective_from: cleanDate(row.effective_from),
    effective_until: cleanDate(row.effective_until)
  };
}

async function main() {
  const raw = await fs.readFile(SOURCE_FILE, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) throw new Error("airlines_code.csv is empty");

  const headers = parseDelimitedLine(lines[0]).map((h) => cleanText(h));
  const required = ["iata_code", "icao_code", "name", "alias"];
  for (const key of required) {
    if (!headers.includes(key)) throw new Error(`Missing airline CSV header: ${key}`);
  }

  const airlines = {};
  const byIcao = {};
  const airlineVariants = {};
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cells = parseDelimitedLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    const record = makeRecord(row);
    if (!record) {
      skipped += 1;
      continue;
    }
    if (record.iata_code) {
      if (!airlineVariants[record.iata_code]) airlineVariants[record.iata_code] = [];
      airlineVariants[record.iata_code].push(record);
    }
    if (record.icao_code) byIcao[record.icao_code] = record;
  }

  for (const [code, records] of Object.entries(airlineVariants)) {
    records.sort(compareVariant);
    airlines[code] = chooseDefaultVariant(records);
  }

  const meta = {
    generated_at: new Date().toISOString(),
    source_file: "data/airlines_code.csv",
    source_rows: Math.max(0, lines.length - 1),
    indexed_iata_codes: Object.keys(airlines).length,
    indexed_iata_variants: Object.values(airlineVariants).reduce((sum, records) => sum + records.length, 0),
    indexed_icao_codes: Object.keys(byIcao).length,
    skipped_rows: skipped,
    delimiter: "^"
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify({ meta, airlines, airline_variants: airlineVariants, by_icao: byIcao }, null, 2) + "\n");
  await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2) + "\n");

  console.log(`Airline index written: ${path.relative(ROOT, OUT_FILE)}`);
  console.log(`Airline meta written: ${path.relative(ROOT, META_FILE)}`);
  console.log(`Indexed IATA codes: ${meta.indexed_iata_codes}`);
  console.log(`Indexed ICAO codes: ${meta.indexed_icao_codes}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

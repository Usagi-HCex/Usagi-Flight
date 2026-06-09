const bulkImportBtn = document.getElementById("bulkImportBtn");
const bulkImportInput = document.getElementById("bulkImportInput");
const importPanel = document.getElementById("importPanel");
const importPanelClose = document.getElementById("importPanelClose");
const importProgressBar = document.getElementById("importProgressBar");
const importProgressText = document.getElementById("importProgressText");
const importSummaryText = document.getElementById("importSummaryText");

const IMPORT_FIELDS = [
  "flight_number",
  "aircraft_model",
  "flight_type",
  "flight_date",
  "departure_station",
  "departure_terminal",
  "departure_time",
  "arrival_station",
  "arrival_terminal",
  "arrival_time",
  "arrival_next_day",
  "baggage_no_weight",
  "additional_fares",
  "additional_fares_detail",
  "remarks"
];

const IMPORT_COPY = {
  en: {
    waiting: "Waiting for CSV file.",
    reading: "Reading CSV file...",
    parsing: "Parsing CSV rows...",
    uploading: "Importing encrypted flight records...",
    done: "Import complete.",
    failed: "Import failed.",
    noRows: "No importable flight records were found.",
    summary: ({ total, inserted, skipped, failed }) =>
      `${total} row(s): ${inserted} imported, ${skipped} duplicate(s) skipped, ${failed} failed.`
  },
  zh: {
    waiting: "等待 CSV 文件。",
    reading: "正在读取 CSV 文件...",
    parsing: "正在解析 CSV 行...",
    uploading: "正在导入加密航班记录...",
    done: "导入完成。",
    failed: "导入失败。",
    noRows: "没有找到可导入的航班记录。",
    summary: ({ total, inserted, skipped, failed }) =>
      `${total} 行：已导入 ${inserted} 条，跳过重复 ${skipped} 条，失败 ${failed} 条。`
  },
  ja: {
    waiting: "CSV ファイル待機中。",
    reading: "CSV ファイルを読み込み中...",
    parsing: "CSV 行を解析中...",
    uploading: "暗号化フライト記録をインポート中...",
    done: "インポート完了。",
    failed: "インポート失敗。",
    noRows: "インポート可能なフライト記録が見つかりません。",
    summary: ({ total, inserted, skipped, failed }) =>
      `${total} 行: ${inserted} 件をインポート、重複 ${skipped} 件をスキップ、失敗 ${failed} 件。`
  }
};

function currentLanguage() {
  return window.FlightLogLanguage?.get?.() || window.AzureXFlightLanguage?.get?.() || "en";
}

function importText(key, values = {}) {
  const copy = IMPORT_COPY[currentLanguage()] || IMPORT_COPY.en;
  const value = copy[key] || IMPORT_COPY.en[key] || "";
  return typeof value === "function" ? value(values) : value;
}

function updateCurrentTime() {
  const target = document.getElementById("currentTime");
  if (!target) return;
  const now = new Date();
  const formatted = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-") +
    " " +
    [String(now.getHours()).padStart(2, "0"), String(now.getMinutes()).padStart(2, "0"), String(now.getSeconds()).padStart(2, "0")].join(":");
  target.textContent = formatted;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function updateCacheStatus() {
  try {
    const url = new URL("./api/flights", window.location.href);
    url.searchParams.set("limit", "1");
    url.searchParams.set("page", "1");
    const response = await fetch(url.toString(), { headers: { accept: "application/json" } });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) throw new Error(result?.error || `HTTP ${response.status}`);
    const cache = result.cache || {};
    setText("cacheStatus", `${cache.status || "unknown"}${cache.content_encoding ? ` / ${cache.content_encoding}` : ""}`);
    setText("cacheRevision", cache.source_revision == null ? "-" : `rev.${cache.source_revision}`);
  } catch (error) {
    setText("cacheStatus", "unavailable");
    setText("cacheRevision", "-");
    console.warn("Failed to load dashboard cache status", error);
  }
}

function setImportProgress(percent, message, summary = "") {
  if (!importPanel) return;
  importPanel.hidden = false;
  if (importProgressBar) importProgressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  if (importProgressText) importProgressText.textContent = message || "";
  if (importSummaryText) importSummaryText.textContent = summary || "";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const input = String(text || "").replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => String(value || "").trim()));
}

function normalizeHeader(value) {
  return String(value || "").trim().replace(/^\uFEFF/, "").toLowerCase();
}

function normalizeYesNo(value) {
  const text = String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  return ["yes", "y", "true", "1", "+1", "+1 day", "next day"].includes(text) ? "Yes" : "No";
}

function normalizeImportRecord(record) {
  const output = {};
  for (const field of IMPORT_FIELDS) output[field] = String(record[field] ?? "").trim();
  output.flight_number = output.flight_number.toUpperCase();
  output.aircraft_model = output.aircraft_model.toUpperCase();
  output.departure_station = output.departure_station.toUpperCase();
  output.arrival_station = output.arrival_station.toUpperCase();
  output.arrival_next_day = normalizeYesNo(output.arrival_next_day);
  output.baggage_no_weight = output.baggage_no_weight ? output.baggage_no_weight.toUpperCase() : "No";
  output.additional_fares = normalizeYesNo(output.additional_fares || (output.additional_fares_detail ? "Yes" : "No"));
  if (output.additional_fares !== "Yes") output.additional_fares_detail = "";
  return output;
}

function recordsFromCsvRows(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  const records = [];

  for (const cells of rows.slice(1)) {
    const raw = {};
    headers.forEach((header, index) => {
      if (IMPORT_FIELDS.includes(header)) raw[header] = cells[index] ?? "";
    });
    const record = normalizeImportRecord(raw);
    if (!record.flight_number && !record.flight_date && !record.departure_station && !record.arrival_station) continue;
    records.push(record);
  }
  return records;
}

async function importCsvFile(file) {
  setImportProgress(8, importText("reading"));
  const text = await file.text();
  setImportProgress(28, importText("parsing"));
  const records = recordsFromCsvRows(parseCsv(text));
  if (!records.length) {
    setImportProgress(100, importText("failed"), importText("noRows"));
    return;
  }

  setImportProgress(62, importText("uploading"));
  const response = await fetch("./api/import_flights", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ records })
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result || !result.ok) throw new Error(result?.error || `HTTP ${response.status}`);

  const failed = Number(result.failed || 0);
  const summary = importText("summary", {
    total: Number(result.total || records.length),
    inserted: Number(result.inserted || 0),
    skipped: Number(result.skipped_duplicates || 0),
    failed
  });
  setImportProgress(100, failed ? importText("failed") : importText("done"), summary);
  await updateCacheStatus();
}

bulkImportBtn?.addEventListener("click", () => {
  bulkImportInput?.click();
});

bulkImportInput?.addEventListener("change", async () => {
  const file = bulkImportInput.files?.[0];
  if (!file) return;
  bulkImportBtn.disabled = true;
  try {
    await importCsvFile(file);
  } catch (error) {
    setImportProgress(100, importText("failed"), error.message);
    window.alert(error.message);
  } finally {
    bulkImportBtn.disabled = false;
    bulkImportInput.value = "";
  }
});

importPanelClose?.addEventListener("click", () => {
  if (importPanel) importPanel.hidden = true;
  setImportProgress(0, importText("waiting"));
});

updateCurrentTime();
updateCacheStatus();
setInterval(updateCurrentTime, 1000);

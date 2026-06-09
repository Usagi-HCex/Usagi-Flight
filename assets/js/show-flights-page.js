const API_LIST_URL = "./api/flights";
const API_SINGLE_URL = "./api/flight";

const pageLimit = document.getElementById("pageLimit");
const applyPageLimitBtn = document.getElementById("applyPageLimitBtn");
const filterText = document.getElementById("filterText");
const clearFilterBtn = document.getElementById("clearFilterBtn");
const refreshBtn = document.getElementById("refreshBtn");
const forceRebuildBtn = document.getElementById("forceRebuildBtn");
const recordsBody = document.getElementById("recordsBody");
const paginationInfo = document.getElementById("paginationInfo");
const statusChip = document.getElementById("statusChip");
const firstPageBtn = document.getElementById("firstPageBtn");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");

let currentRecords = [];
let currentPagination = { page: 1, limit: 10, total_records: 0, total_pages: 1, has_more: false, has_prev: false };
let currentPage = 1;
let isLoading = false;
let currentCache = null;
let currentSearch = null;
let searchTimer = null;
let listRequestId = 0;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function display(value) {
  const text = value == null ? "" : String(value);
  return text.trim() ? text : "-";
}

function setStatus(message) {
  statusChip.textContent = message || "Ready";
}

function isYes(value) {
  return String(value || "").trim().toLowerCase() === "yes";
}

function joinStationTerminalTime(station, terminal, time, nextDay = "No") {
  const s = String(station ?? "").trim();
  const t = String(terminal ?? "").trim();
  const rawTime = String(time ?? "").trim();
  const tm = rawTime && isYes(nextDay) ? `${rawTime} +1 Day` : rawTime;
  return [s, t, tm].filter(Boolean).join(" ") || "-";
}

function searchQuery() {
  return filterText.value.trim().replace(/\s+/g, " ");
}

function setLoadingState(loading) {
  isLoading = loading;
  refreshBtn.disabled = loading;
  forceRebuildBtn.disabled = loading;
  applyPageLimitBtn.disabled = loading;
  firstPageBtn.disabled = loading || currentPage <= 1;
  prevPageBtn.disabled = loading || !currentPagination.has_prev;
  nextPageBtn.disabled = loading || !currentPagination.has_more;
}

function buildListUrl(page, forceRebuild = false) {
  const url = new URL(API_LIST_URL, window.location.href);
  const query = searchQuery();
  url.searchParams.set("limit", pageLimit.value || "10");
  url.searchParams.set("page", String(page || 1));
  if (query) url.searchParams.set("q", query);
  if (forceRebuild) url.searchParams.set("force_rebuild", "1");
  return url.toString();
}

function normalizeRecord(record) {
  return {
    internal_id: record?.id ?? "",
    record_no: record?.record_no ?? record?.id ?? "",
    flight_date: record?.flight_date ?? "",
    flight_number: record?.flight_number ?? "",
    aircraft_model: record?.aircraft_model ?? "",
    departure: joinStationTerminalTime(record?.departure_station, record?.departure_terminal, record?.departure_time),
    arrival: joinStationTerminalTime(record?.arrival_station, record?.arrival_terminal, record?.arrival_time, record?.arrival_next_day)
  };
}

function renderRows() {
  if (!currentRecords.length) {
    const message = searchQuery() ? "No matching flight records found." : "No flight records found.";
    recordsBody.innerHTML = `<tr><td colspan="7">${escapeHtml(message)}</td></tr>`;
    updatePaginationInfo();
    return;
  }

  recordsBody.innerHTML = currentRecords.map((record) => {
    const n = normalizeRecord(record);
    const id = encodeURIComponent(n.internal_id);
    return `<tr><td>${escapeHtml(display(n.record_no))}</td><td>${escapeHtml(display(n.flight_date))}</td><td>${escapeHtml(display(n.flight_number))}</td><td>${escapeHtml(display(n.aircraft_model))}</td><td><div class="route route-inline">${escapeHtml(display(n.departure))}</div></td><td><div class="route route-inline">${escapeHtml(display(n.arrival))}</div></td><td><div class="actions"><a class="btn" href="./flight_view.html?id=${id}">View</a><a class="btn" href="./flight_edit.html?id=${id}">Edit</a><button class="btn delete" type="button" data-delete-id="${escapeHtml(n.internal_id)}" data-delete-no="${escapeHtml(n.record_no)}">Delete</button></div></td></tr>`;
  }).join("");

  updatePaginationInfo();
}

function updatePaginationInfo() {
  const shown = currentRecords.length;
  const matched = Number(currentPagination.total_records || 0);
  const total = Number(currentSearch?.total_records || matched);
  const isSearching = Boolean(currentSearch?.active || searchQuery());
  const countText = isSearching
    ? `Showing ${shown} of ${matched} matching records · Total ${total}`
    : `Showing ${shown} of ${matched} records`;
  const cacheText = currentCache ? ` <span class="cache-chip">Cache: ${escapeHtml(currentCache.status || "unknown")} / rev.${escapeHtml(currentCache.source_revision ?? "")} / ${escapeHtml(currentCache.content_encoding || "")}</span>` : "";
  paginationInfo.innerHTML = `Page ${currentPagination.page || currentPage} of ${currentPagination.total_pages || 1} · ${countText}${cacheText}`;
}

function updatePaginationButtons() {
  firstPageBtn.disabled = isLoading || currentPage <= 1;
  prevPageBtn.disabled = isLoading || !currentPagination.has_prev;
  nextPageBtn.disabled = isLoading || !currentPagination.has_more;
}

async function loadPage(page = 1, forceRebuild = false) {
  const requestId = ++listRequestId;
  const isSearching = Boolean(searchQuery());
  setLoadingState(true);
  setStatus(forceRebuild ? "Rebuilding cache" : isSearching ? "Searching" : "Loading");
  recordsBody.innerHTML = '<tr><td colspan="7">Loading flight records...</td></tr>';

  try {
    const response = await fetch(buildListUrl(page, forceRebuild), { headers: { accept: "application/json" } });
    const result = await response.json().catch(() => null);
    if (requestId !== listRequestId) return;
    if (!response.ok || !result || !result.ok) throw new Error(result?.error || `Request failed with status ${response.status}`);

    currentRecords = Array.isArray(result.records) ? result.records : [];
    currentPagination = result.pagination || { page, limit: Number(pageLimit.value || 10), total_records: currentRecords.length, total_pages: 1, has_more: false, has_prev: false };
    currentPage = currentPagination.page || page;
    currentCache = result.cache || null;
    currentSearch = result.search || null;
    renderRows();
    setStatus("Ready");
  } catch (error) {
    if (requestId !== listRequestId) return;
    currentRecords = [];
    currentPagination = { page, limit: Number(pageLimit.value || 10), total_records: 0, total_pages: 1, has_more: false, has_prev: false };
    currentSearch = null;
    recordsBody.innerHTML = `<tr><td colspan="7">${escapeHtml("Failed to load flight records: " + error.message)}</td></tr>`;
    paginationInfo.textContent = "Failed to load page information.";
    setStatus("Error");
  } finally {
    if (requestId === listRequestId) {
      setLoadingState(false);
      updatePaginationButtons();
    }
  }
}

function resetPaginationAndLoad(force = false) {
  currentPage = 1;
  loadPage(1, force);
}

function scheduleSearch() {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => resetPaginationAndLoad(false), 220);
}

async function deleteRecord(id, recordNo) {
  if (!window.confirm(["Delete this flight record?", "", `Record No.: ${recordNo || "-"}`, "", "This action cannot be undone."].join("\n"))) return;
  setLoadingState(true);
  setStatus("Deleting");

  try {
    const url = new URL(API_SINGLE_URL, window.location.href);
    url.searchParams.set("id", String(id));
    const response = await fetch(url.toString(), { method: "DELETE", headers: { accept: "application/json" } });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) throw new Error(result?.error || `Request failed with status ${response.status}`);
    resetPaginationAndLoad(true);
  } catch (error) {
    window.alert("Failed to delete flight record: " + error.message);
    setStatus("Error");
  } finally {
    setLoadingState(false);
    updatePaginationButtons();
  }
}

recordsBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (button) deleteRecord(button.dataset.deleteId, button.dataset.deleteNo);
});

filterText.addEventListener("input", scheduleSearch);
clearFilterBtn.addEventListener("click", () => {
  filterText.value = "";
  resetPaginationAndLoad(false);
});
refreshBtn.addEventListener("click", () => loadPage(currentPage, false));
forceRebuildBtn.addEventListener("click", () => resetPaginationAndLoad(true));
applyPageLimitBtn.addEventListener("click", () => resetPaginationAndLoad(false));
firstPageBtn.addEventListener("click", () => loadPage(1, false));
prevPageBtn.addEventListener("click", () => loadPage(Math.max(1, currentPage - 1), false));
nextPageBtn.addEventListener("click", () => loadPage(currentPage + 1, false));

loadPage(1, false);

const MOBILE_API_LIST_URL = "../api/flights";
const MOBILE_API_SINGLE_URL = "../api/flight";

const mobileRecordsList = document.getElementById("mobileRecordsList");
const mobileFilterText = document.getElementById("mobileFilterText");
const mobileFilterPanel = document.getElementById("mobileFilterPanel");
const mobileFilterToggle = document.getElementById("mobileFilterToggle");
const mobilePageLimit = document.getElementById("mobilePageLimit");
const mobileRefreshBtn = document.getElementById("mobileRefreshBtn");
const mobilePrevBtn = document.getElementById("mobilePrevBtn");
const mobileNextBtn = document.getElementById("mobileNextBtn");
const mobilePageInfo = document.getElementById("mobilePageInfo");
const mobileListStatus = document.getElementById("mobileListStatus");
const mobileTotalSectors = document.getElementById("mobileTotalSectors");
const mobileAirportCount = document.getElementById("mobileAirportCount");
const mobileAirlineCount = document.getElementById("mobileAirlineCount");
const mobileTotalDistance = document.getElementById("mobileTotalDistance");

let mobileRecords = [];
let mobilePagination = { page: 1, limit: 10, total_records: 0, total_pages: 1, has_more: false, has_prev: false };
let mobileCurrentPage = 1;
let mobileLoading = false;
let mobileAirportIndexPromise = null;
let mobileDistanceRequestId = 0;
let mobileListRequestId = 0;
let mobileSearchTimer = null;

function escapeMobileHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayMobile(value, fallback = "-") {
  const text = value == null ? "" : String(value).trim();
  return text || fallback;
}

function formatMobileStat(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat("en-US").format(number);
}

function formatMobileDistance(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "-";
  return `${new Intl.NumberFormat("en-US").format(Math.round(number))} km`;
}

function setMobileSummary(summary = {}) {
  mobileTotalSectors.textContent = formatMobileStat(summary.total_sectors);
  mobileAirportCount.textContent = formatMobileStat(summary.airport_count);
  mobileAirlineCount.textContent = formatMobileStat(summary.airline_count);
  mobileTotalDistance.textContent = formatMobileDistance(summary.total_distance_km);
}

function mobileToRad(value) {
  return Number(value) * Math.PI / 180;
}

function mobileNormalizeLonDelta(delta) {
  return ((Number(delta) + 540) % 360) - 180;
}

function mobileAuthalicFallbackDistanceKm(lat1, lon1, lat2, lon2) {
  const radius = 6371.007180918475;
  const dLat = mobileToRad(lat2 - lat1);
  const dLon = mobileToRad(mobileNormalizeLonDelta(lon2 - lon1));
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(mobileToRad(lat1)) * Math.cos(mobileToRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

function mobileDistanceKm(fromAirport, toAirport) {
  const lat1 = Number(fromAirport?.latitude_deg);
  const lon1 = Number(fromAirport?.longitude_deg);
  const lat2 = Number(toAirport?.latitude_deg);
  const lon2 = Number(toAirport?.longitude_deg);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0;
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const a = 6378137;
  const f = 1 / 298.257223563;
  const phi1 = mobileToRad(lat1);
  const phi2 = mobileToRad(lat2);
  const fMean = (phi1 + phi2) / 2;
  const g = (phi1 - phi2) / 2;
  const l = Math.abs(mobileToRad(mobileNormalizeLonDelta(lon2 - lon1))) / 2;
  const sinG = Math.sin(g);
  const cosG = Math.cos(g);
  const sinF = Math.sin(fMean);
  const cosF = Math.cos(fMean);
  const sinL = Math.sin(l);
  const cosL = Math.cos(l);
  const sinG2 = sinG * sinG;
  const cosG2 = cosG * cosG;
  const sinF2 = sinF * sinF;
  const cosF2 = cosF * cosF;
  const sinL2 = sinL * sinL;
  const cosL2 = cosL * cosL;
  const s = sinG2 * cosL2 + cosF2 * sinL2;
  const c = cosG2 * cosL2 + sinF2 * sinL2;
  if (s <= Number.EPSILON) return 0;
  if (c <= 1e-15) return mobileAuthalicFallbackDistanceKm(lat1, lon1, lat2, lon2);
  const omega = Math.atan2(Math.sqrt(s), Math.sqrt(c));
  if (!Number.isFinite(omega) || omega <= Number.EPSILON) return 0;
  const r = Math.sqrt(s * c) / omega;
  const h1 = (3 * r - 1) / (2 * c);
  const h2 = (3 * r + 1) / (2 * s);
  const distance = 2 * omega * a * (1 + f * h1 * sinF2 * cosG2 - f * h2 * cosF2 * sinG2);
  return Number.isFinite(distance) && distance >= 0 ? distance / 1000 : mobileAuthalicFallbackDistanceKm(lat1, lon1, lat2, lon2);
}

function loadMobileAirportIndex() {
  if (!mobileAirportIndexPromise) {
    mobileAirportIndexPromise = fetch(new URL("../assets/data/airport-index.json", window.location.href).toString(), {
      headers: { accept: "application/json" }
    }).then(async (response) => {
      if (!response.ok) throw new Error(`airport index HTTP ${response.status}`);
      const text = await response.text();
      const trimmed = text.trimStart();
      if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) throw new Error("airport index returned non-JSON");
      return JSON.parse(text);
    });
  }
  return mobileAirportIndexPromise;
}

async function loadMobileDistanceFallback() {
  const response = await fetch(new URL("../api/flight_map_summary", window.location.href).toString(), {
    headers: { accept: "application/json" }
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result || !result.ok) throw new Error(result?.error || `HTTP ${response.status}`);
  const apiDistance = Number(result.route_summary?.total_distance_km);
  if (Number.isFinite(apiDistance) && apiDistance > 0) return apiDistance;
  const index = await loadMobileAirportIndex();
  return (Array.isArray(result.records) ? result.records : []).reduce((sum, record) => {
    const from = index?.airports?.[String(record.departure_station || "").trim().toUpperCase()];
    const to = index?.airports?.[String(record.arrival_station || "").trim().toUpperCase()];
    return sum + mobileDistanceKm(from, to);
  }, 0);
}

async function hydrateMobileDistance(summary = {}) {
  const apiDistance = Number(summary.total_distance_km);
  const requestId = ++mobileDistanceRequestId;
  if (Number.isFinite(apiDistance) && apiDistance > 0) return;
  mobileTotalDistance.textContent = "Calculating";
  try {
    const fallbackDistance = await loadMobileDistanceFallback();
    if (requestId !== mobileDistanceRequestId) return;
    mobileTotalDistance.textContent = formatMobileDistance(fallbackDistance);
  } catch (error) {
    if (requestId !== mobileDistanceRequestId) return;
    mobileTotalDistance.textContent = "-";
  }
}

function airlineCode(flightNumber) {
  const match = String(flightNumber || "").trim().toUpperCase().match(/^[A-Z0-9]{1,3}/);
  return match ? match[0].slice(0, 2) : "FL";
}

function formatDateParts(dateValue) {
  const text = String(dateValue || "");
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { day: "--", year: "----" };
  return { day: `${match[2]}-${match[3]}`, year: match[1] };
}

function stationLabel(station, terminal) {
  return [station, terminal].map((v) => String(v || "").trim()).filter(Boolean).join(" ") || "-";
}

function normalizedMobileRecord(record) {
  return {
    id: record?.id ?? "",
    record_no: record?.record_no ?? record?.id ?? "",
    flight_date: record?.flight_date ?? "",
    flight_number: record?.flight_number ?? "",
    aircraft_model: record?.aircraft_model ?? "",
    flight_type: record?.flight_type ?? "",
    departure_station: record?.departure_station ?? "",
    departure_terminal: record?.departure_terminal ?? "",
    departure_time: record?.departure_time ?? "",
    arrival_station: record?.arrival_station ?? "",
    arrival_terminal: record?.arrival_terminal ?? "",
    arrival_time: record?.arrival_time ?? ""
  };
}

function mobileFlightCard(record, options = {}) {
  const r = normalizedMobileRecord(record);
  const date = formatDateParts(r.flight_date);
  const id = encodeURIComponent(r.id);
  const active = options.active ? " active" : "";
  return `
    <article class="mobile-flight-item" data-record-id="${escapeMobileHtml(r.id)}" data-from="${escapeMobileHtml(r.departure_station)}" data-to="${escapeMobileHtml(r.arrival_station)}">
      <div class="mobile-date-rail">
        <strong>${escapeMobileHtml(date.day)}</strong>
        <span>${escapeMobileHtml(date.year)}</span>
        <small>Local</small>
      </div>
      <div class="mobile-flight-stack">
        <div class="mobile-flight-card${active}">
          <div class="mobile-flight-card-header">
            <div class="mobile-airline"><span class="mobile-airline-mark">${escapeMobileHtml(airlineCode(r.flight_number))}</span><span>${escapeMobileHtml(displayMobile(r.flight_type || "Flight"))}</span></div>
            <span class="mobile-flight-no">${escapeMobileHtml(displayMobile(r.flight_number))}</span>
          </div>
          <div class="mobile-route-mini">
            <time>${escapeMobileHtml(displayMobile(r.departure_time, "--:--"))}</time>
            <span class="mobile-dot depart" aria-hidden="true"></span>
            <strong>${escapeMobileHtml(stationLabel(r.departure_station, r.departure_terminal))}</strong>
            <time>${escapeMobileHtml(displayMobile(r.arrival_time, "--:--"))}</time>
            <span class="mobile-dot arrive" aria-hidden="true"></span>
            <strong>${escapeMobileHtml(stationLabel(r.arrival_station, r.arrival_terminal))}</strong>
          </div>
        </div>
        <div class="mobile-card-actions">
          <a href="./flight.html?id=${id}">View</a>
          <a href="./edit.html?id=${id}">Edit</a>
          <button class="danger" type="button" data-delete-id="${escapeMobileHtml(r.id)}" data-delete-no="${escapeMobileHtml(r.record_no)}">Delete</button>
        </div>
      </div>
    </article>`;
}

function setMobileListStatus(message, type = "") {
  mobileListStatus.textContent = message || "";
  mobileListStatus.className = "mobile-status-text" + (type ? ` ${type}` : "");
}

function setMobileLoading(loading) {
  mobileLoading = loading;
  mobileRefreshBtn.disabled = loading;
  mobilePrevBtn.disabled = loading || !mobilePagination.has_prev;
  mobileNextBtn.disabled = loading || !mobilePagination.has_more;
}

function updateMobilePager(shown) {
  mobilePageInfo.textContent = `Page ${mobilePagination.page || mobileCurrentPage} / ${mobilePagination.total_pages || 1}`;
  setMobileLoading(mobileLoading);
  setMobileListStatus("");
}

function renderMobileFlights() {
  const rows = mobileRecords;
  if (!rows.length) {
    mobileRecordsList.innerHTML = '<p class="mobile-muted">No flight records found.</p>';
    updateMobilePager(0);
    return;
  }
  mobileRecordsList.innerHTML = rows.map((record) => mobileFlightCard(record)).join("");
  updateMobilePager(rows.length);
}

function buildMobileListUrl(page) {
  const url = new URL(MOBILE_API_LIST_URL, window.location.href);
  const query = mobileFilterText.value.trim().replace(/\s+/g, " ");
  url.searchParams.set("limit", mobilePageLimit.value || "10");
  url.searchParams.set("page", String(page || 1));
  if (query) url.searchParams.set("q", query);
  return url.toString();
}

async function loadMobilePage(page = 1) {
  const requestId = ++mobileListRequestId;
  setMobileLoading(true);
  setMobileListStatus(mobileFilterText.value.trim() ? "Searching" : "Loading");
  mobileRecordsList.innerHTML = '<p class="mobile-muted">Loading...</p>';
  try {
    const response = await fetch(buildMobileListUrl(page), { headers: { accept: "application/json" } });
    const result = await response.json().catch(() => null);
    if (requestId !== mobileListRequestId) return;
    if (!response.ok || !result || !result.ok) throw new Error(result?.error || `HTTP ${response.status}`);
    mobileRecords = Array.isArray(result.records) ? result.records : [];
    mobilePagination = result.pagination || mobilePagination;
    mobileCurrentPage = mobilePagination.page || page;
    setMobileSummary(result.summary || {});
    hydrateMobileDistance(result.summary || {});
    renderMobileFlights();
  } catch (error) {
    if (requestId !== mobileListRequestId) return;
    mobileRecords = [];
    mobileDistanceRequestId += 1;
    setMobileSummary();
    mobileRecordsList.innerHTML = `<p class="mobile-muted">${escapeMobileHtml("Failed to load flights: " + error.message)}</p>`;
    setMobileListStatus("Offline / API unavailable", "error");
  } finally {
    if (requestId === mobileListRequestId) setMobileLoading(false);
  }
}

async function deleteMobileRecord(id, recordNo) {
  if (!window.confirm(["Delete this flight record?", "", `Record No.: ${recordNo || "-"}`, "", "This action cannot be undone."].join("\n"))) return;
  setMobileLoading(true);
  setMobileListStatus("Deleting");
  try {
    const url = new URL(MOBILE_API_SINGLE_URL, window.location.href);
    url.searchParams.set("id", String(id));
    const response = await fetch(url.toString(), { method: "DELETE", headers: { accept: "application/json" } });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) throw new Error(result?.error || `HTTP ${response.status}`);
    await loadMobilePage(mobileCurrentPage);
  } catch (error) {
    window.alert("Failed to delete flight record: " + error.message);
    setMobileListStatus("Error", "error");
  } finally {
    setMobileLoading(false);
  }
}

function setMobileFilterOpen(open) {
  mobileFilterPanel.hidden = !open;
  mobileFilterToggle.setAttribute("aria-expanded", String(open));
  mobileFilterToggle.classList.toggle("active", open);
  if (open) {
    setTimeout(() => mobileFilterText.focus(), 80);
  }
}

mobileRecordsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (button) deleteMobileRecord(button.dataset.deleteId, button.dataset.deleteNo);
});
mobileFilterToggle.addEventListener("click", () => setMobileFilterOpen(mobileFilterPanel.hidden));
mobileFilterText.addEventListener("input", () => {
  window.clearTimeout(mobileSearchTimer);
  mobileSearchTimer = window.setTimeout(() => loadMobilePage(1), 220);
});
mobileFilterText.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMobileFilterOpen(false);
});
mobilePageLimit.addEventListener("change", () => loadMobilePage(1));
mobileRefreshBtn.addEventListener("click", () => loadMobilePage(mobileCurrentPage));
mobilePrevBtn.addEventListener("click", () => loadMobilePage(Math.max(1, mobileCurrentPage - 1)));
mobileNextBtn.addEventListener("click", () => loadMobilePage(mobileCurrentPage + 1));

setMobileSummary();
loadMobilePage(1);

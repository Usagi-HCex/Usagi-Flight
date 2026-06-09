const MOBILE_SINGLE_API_URL = "../api/flight";
const mobileEditLink = document.getElementById("mobileEditLink");
const mobileDetailFields = document.getElementById("mobileDetailFields");
const mobileDetailStatus = document.getElementById("mobileDetailStatus");
const mobileSingleMap = document.getElementById("mobileSingleFlightMap");
const mobileSingleMapStatus = document.getElementById("mobileSingleMapStatus");
const mobileRouteDistance = document.getElementById("mobileRouteDistance");
const mobileAirlineName = document.getElementById("mobileAirlineName");

let mobileDetailMapController = null;
let mobileLoadedRecord = null;
let mobileAirportIndexPromise = null;
let mobileAirlineIndexPromise = null;

function escapeDetailHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayDetail(value, fallback = "-") {
  const text = value == null ? "" : String(value).trim();
  return text || fallback;
}

function isYes(value) {
  return String(value || "").trim().toLowerCase() === "yes";
}

function mobileArrivalTimeText(record) {
  const time = displayDetail(record.arrival_time, "--:--");
  return isYes(record.arrival_next_day) && time !== "--:--" ? `${time} +1 Day` : time;
}

function getMobileRecordId() {
  const id = Number(new URLSearchParams(window.location.search).get("id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid record reference");
  return id;
}

function setDetailText(id, value, fallback = "-") {
  const el = document.getElementById(id);
  if (el) el.textContent = displayDetail(value, fallback);
}

function formatMobileRouteDistance(km) {
  const n = Number(km);
  return Number.isFinite(n) && n > 0 ? `${Math.round(n).toLocaleString("en-US")} km est.` : "-";
}

function setAirportName(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<span class="mobile-airport-name-track">${escapeDetailHtml(displayDetail(value))}</span>`;
}

function refreshAirportNameMarquee() {
  document.querySelectorAll(".mobile-airport-name").forEach((el) => {
    const track = el.querySelector(".mobile-airport-name-track");
    if (!track) return;
    const overflow = Math.max(0, Math.ceil(track.scrollWidth - el.clientWidth));
    el.style.setProperty("--airport-scroll-distance", `${overflow}px`);
    el.classList.toggle("scrolling", overflow > 4);
  });
}

function airportLookupCode(value) {
  return String(value || "").trim().toUpperCase();
}

function airportNameForCode(index, code) {
  const airport = index?.airports?.[airportLookupCode(code)];
  return displayDetail(airport?.name);
}

function loadMobileAirportIndex() {
  if (!mobileAirportIndexPromise) {
    mobileAirportIndexPromise = FlightMapToolkit.loadAirportIndex();
  }
  return mobileAirportIndexPromise;
}

function loadMobileAirlineIndex() {
  if (!mobileAirlineIndexPromise) {
    mobileAirlineIndexPromise = fetch(new URL("../assets/data/airline-index.json", window.location.href).toString(), {
      headers: { accept: "application/json" }
    }).then(async (response) => {
      if (!response.ok) return { airlines: {} };
      const text = await response.text();
      const trimmed = text.trimStart();
      if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return { airlines: {} };
      try {
        return JSON.parse(text);
      } catch (error) {
        return { airlines: {} };
      }
    }).catch(() => ({ airlines: {} }));
  }
  return mobileAirlineIndexPromise;
}

function airlineCodeForFlight(flightNumber) {
  const match = String(flightNumber || "").trim().toUpperCase().match(/^[A-Z0-9]{2}/);
  return match ? match[0] : "";
}

function normalizeAirlineDate(value) {
  const text = String(value || "").trim().replaceAll("/", "-");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function airlineRecordApplies(record, date) {
  if (!record || !date) return false;
  if (record.effective_from && date < record.effective_from) return false;
  if (record.effective_until && date > record.effective_until) return false;
  return true;
}

function airlineRecordForFlight(index, flightNumber, flightDate) {
  const code = airlineCodeForFlight(flightNumber);
  if (!code) return null;
  const date = normalizeAirlineDate(flightDate);
  const variants = Array.isArray(index?.airline_variants?.[code]) ? index.airline_variants[code] : [];
  if (date && variants.length) {
    const matched = variants.find((record) => airlineRecordApplies(record, date));
    if (matched) return matched;
  }
  return index?.airlines?.[code] || variants.at(-1) || null;
}

function airlineNameForFlight(index, flightNumber, flightDate) {
  const record = airlineRecordForFlight(index, flightNumber, flightDate);
  return String(record?.name || "").trim();
}

function refreshAirlineNameMarquee() {
  if (!mobileAirlineName) return;
  const track = mobileAirlineName.querySelector(".mobile-airline-name-track");
  if (!track) return;
  const overflow = Math.max(0, Math.ceil(track.scrollWidth - mobileAirlineName.clientWidth));
  mobileAirlineName.style.setProperty("--mobile-airline-scroll-distance", `${overflow}px`);
  mobileAirlineName.classList.toggle("scrolling", overflow > 4);
}

async function fillMobileAirlineName(record) {
  if (!mobileAirlineName) return;
  const track = mobileAirlineName.querySelector(".mobile-airline-name-track");
  try {
    const index = await loadMobileAirlineIndex();
    const name = airlineNameForFlight(index, record.flight_number, record.flight_date);
    mobileAirlineName.hidden = !name;
    if (track) track.textContent = name;
    setTimeout(refreshAirlineNameMarquee, 80);
  } catch (error) {
    mobileAirlineName.hidden = true;
    if (track) track.textContent = "";
  }
}

function setMobileDetailStatus(message, type = "") {
  mobileDetailStatus.textContent = message || "";
  mobileDetailStatus.className = "mobile-detail-status" + (type ? ` ${type}` : "");
}

function fillDetailHero(record) {
  setDetailText("mobileDetailDate", record.flight_date);
  setDetailText("mobileDetailFlight", record.flight_number, "Flight");
  setDetailText("mobileDetailType", record.flight_type);
  setDetailText("mobileDepartureTime", record.departure_time, "--:--");
  setDetailText("mobileDepartureStation", record.departure_station);
  setDetailText("mobileDepartureTerminal", record.departure_terminal);
  setDetailText("mobileArrivalTime", mobileArrivalTimeText(record), "--:--");
  setDetailText("mobileArrivalStation", record.arrival_station);
  setDetailText("mobileArrivalTerminal", record.arrival_terminal);
}

function fillAirportNames(record, airportIndex) {
  setAirportName("mobileDepartureAirportName", airportNameForCode(airportIndex, record.departure_station));
  setAirportName("mobileArrivalAirportName", airportNameForCode(airportIndex, record.arrival_station));
  const from = airportIndex?.airports?.[airportLookupCode(record.departure_station)];
  const to = airportIndex?.airports?.[airportLookupCode(record.arrival_station)];
  if (mobileRouteDistance) mobileRouteDistance.textContent = formatMobileRouteDistance(FlightMapToolkit.distanceKm(from, to));
  setTimeout(refreshAirportNameMarquee, 80);
}

function renderDetailFields(record) {
  const rows = [
    ["Record No.", record.record_no ?? record.id],
    ["Aircraft", record.aircraft_model],
    ["Arrival +1 Day", isYes(record.arrival_next_day) ? "Yes" : "No"],
    ["Baggage", record.baggage_no_weight],
    ["Additional Fares", isYes(record.additional_fares) ? "Yes" : "No"],
    ["Additional Fares Detail", record.additional_fares_detail],
    ["Remarks", record.remarks],
    ["HMAC", record.hmac_value],
    ["Created (UTC)", record.created_at],
    ["Updated (UTC)", record.updated_at]
  ];
  mobileDetailFields.innerHTML = rows.map(([label, value]) => `
    <div class="mobile-detail-field">
      <span>${escapeDetailHtml(label)}</span>
      <strong>${escapeDetailHtml(displayDetail(value))}</strong>
    </div>
  `).join("");
}

async function drawMobileSingleMap(record) {
  mobileDetailMapController = FlightMapToolkit.createController({
    canvas: mobileSingleMap,
    statusElement: mobileSingleMapStatus,
    mapOptions: { showAirportLabels: true, showLand: true, showAirports: true, showRoutes: true }
  });
  try {
    const index = await loadMobileAirportIndex();
    const built = FlightMapToolkit.buildRouteFromRecord(record, index, { highlight: true, thin: true });
    if (!built.ok) {
      mobileSingleMapStatus.textContent = "Airport coordinate not found: " + built.missing.join(", ");
      return;
    }
    mobileDetailMapController.setData([{ ...built.route, highlight: true, thin: true }], {});
  } catch (error) {
    mobileSingleMapStatus.textContent = "Failed to draw map: " + error.message;
  }
}

async function loadMobileRecord() {
  try {
    const id = getMobileRecordId();
    mobileEditLink.href = `./edit.html?id=${encodeURIComponent(id)}`;
    const url = new URL(MOBILE_SINGLE_API_URL, window.location.href);
    url.searchParams.set("id", String(id));
    const response = await fetch(url.toString(), { headers: { accept: "application/json" } });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) throw new Error(result?.error || `HTTP ${response.status}`);
    mobileLoadedRecord = result.record || {};
    fillDetailHero(mobileLoadedRecord);
    await fillMobileAirlineName(mobileLoadedRecord);
    renderDetailFields(mobileLoadedRecord);
    setMobileDetailStatus("Ready");
    try {
      fillAirportNames(mobileLoadedRecord, await loadMobileAirportIndex());
    } catch (error) {
      if (mobileRouteDistance) mobileRouteDistance.textContent = "-";
    }
    await drawMobileSingleMap(mobileLoadedRecord);
  } catch (error) {
    setMobileDetailStatus("Failed: " + error.message, "error");
    if (mobileRouteDistance) mobileRouteDistance.textContent = "-";
    if (mobileAirlineName) mobileAirlineName.hidden = true;
    mobileDetailFields.innerHTML = `<p class="mobile-muted">${escapeDetailHtml(error.message)}</p>`;
  }
}

document.getElementById("mobileMapZoomIn").addEventListener("click", () => mobileDetailMapController?.zoomIn());
document.getElementById("mobileMapZoomOut").addEventListener("click", () => mobileDetailMapController?.zoomOut());
document.getElementById("mobileMapFit").addEventListener("click", () => mobileDetailMapController?.fit());
window.addEventListener("resize", () => {
  setTimeout(refreshAirportNameMarquee, 80);
  setTimeout(refreshAirlineNameMarquee, 80);
});
document.addEventListener("DOMContentLoaded", loadMobileRecord);

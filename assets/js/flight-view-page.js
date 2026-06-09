const API_SINGLE_URL = "./api/flight";
const statusMessage = document.getElementById("statusMessage");
const editLink = document.getElementById("editLink");
const fields = ["record_no", "payload_version", "flight_number", "aircraft_model", "flight_type", "flight_date", "departure_station", "departure_terminal", "departure_time", "arrival_station", "arrival_terminal", "arrival_time", "arrival_next_day", "baggage_no_weight", "additional_fares", "additional_fares_detail", "remarks", "hmac_value", "created_at", "updated_at"];

let mapController = null;
let loadedRecord = null;
let airportIndexPromise = null;
let airlineIndexPromise = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getRecordId() {
  const id = Number(new URLSearchParams(window.location.search).get("id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid record reference");
  return id;
}

function display(v) {
  const t = v == null ? "" : String(v);
  return t.trim() ? t : "-";
}

function isYes(value) {
  return String(value || "").trim().toLowerCase() === "yes";
}

function arrivalTimeText(record) {
  const time = display(record.arrival_time);
  return isYes(record.arrival_next_day) && time !== "-" ? `${time} +1 Day` : time;
}

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = display(v);
}

function formatRouteDistance(km) {
  const n = Number(km);
  return Number.isFinite(n) && n > 0 ? `${Math.round(n).toLocaleString("en-US")} km est.` : "-";
}

function setStatus(m, t = "") {
  statusMessage.textContent = m || "";
  statusMessage.className = "v status inline-status" + (t ? ` ${t}` : "");
}

function loadAirportIndex() {
  if (!airportIndexPromise) airportIndexPromise = FlightMapToolkit.loadAirportIndex();
  return airportIndexPromise;
}

function loadAirlineIndex() {
  if (!airlineIndexPromise) {
    airlineIndexPromise = fetch(new URL("./assets/data/airline-index.json", window.location.href).toString(), {
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
  return airlineIndexPromise;
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

function airportNameForCode(index, code) {
  return display(index?.airports?.[String(code || "").trim().toUpperCase()]?.name);
}

function setAirportName(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<span class="airport-name-track">${escapeHtml(display(value))}</span>`;
}

function refreshAirportMarquee() {
  document.querySelectorAll(".airport-marquee").forEach((el) => {
    const track = el.querySelector(".airport-name-track");
    if (!track) return;
    const overflow = Math.max(0, Math.ceil(track.scrollWidth - el.clientWidth));
    el.style.setProperty("--airport-scroll-distance", `${overflow}px`);
    el.classList.toggle("scrolling", overflow > 4);
  });
}

function refreshAirlineMarquee() {
  document.querySelectorAll(".airline-marquee").forEach((el) => {
    const track = el.querySelector(".airline-name-track");
    if (!track) return;
    const overflow = Math.max(0, Math.ceil(track.scrollWidth - el.clientWidth));
    el.style.setProperty("--airline-scroll-distance", `${overflow}px`);
    el.classList.toggle("scrolling", overflow > 4);
  });
}

async function fillAirlineName(record) {
  const el = document.getElementById("airline_name");
  const track = el?.querySelector(".airline-name-track");
  if (!el || !track) return;
  try {
    const index = await loadAirlineIndex();
    const name = airlineNameForFlight(index, record.flight_number, record.flight_date);
    el.hidden = !name;
    track.textContent = name ? `(${name})` : "";
    setTimeout(refreshAirlineMarquee, 80);
  } catch (error) {
    el.hidden = true;
    track.textContent = "";
  }
}

async function fillAirportNames(record) {
  const index = await loadAirportIndex();
  setAirportName("departure_airport_name", airportNameForCode(index, record.departure_station));
  setAirportName("arrival_airport_name", airportNameForCode(index, record.arrival_station));
  setTimeout(refreshAirportMarquee, 80);
  return index;
}

function setRouteDistance(record, index) {
  const from = index?.airports?.[String(record.departure_station || "").trim().toUpperCase()];
  const to = index?.airports?.[String(record.arrival_station || "").trim().toUpperCase()];
  setText("route_distance", formatRouteDistance(FlightMapToolkit.distanceKm(from, to)));
}

async function drawSingleMap(record, index = null) {
  const canvas = document.getElementById("singleFlightMap");
  const status = document.getElementById("singleMapStatus");
  mapController = FlightMapToolkit.createController({ canvas, statusElement: status, mapOptions: { showAirportLabels: true } });
  try {
    const airportIndex = index || await loadAirportIndex();
    const built = FlightMapToolkit.buildRouteFromRecord(record, airportIndex, { highlight: true, thin: true });
    if (!built.ok) {
      status.textContent = "Airport coordinate not found: " + built.missing.join(", ");
      return;
    }
    mapController.setData([{ ...built.route, highlight: true, thin: true }], {});
  } catch (error) {
    status.textContent = "Failed to draw map: " + error.message;
  }
}

async function loadRecord() {
  try {
    const id = getRecordId();
    editLink.href = `./flight_edit.html?id=${encodeURIComponent(id)}`;
    const url = new URL(API_SINGLE_URL, window.location.href);
    url.searchParams.set("id", String(id));
    const response = await fetch(url.toString(), { headers: { accept: "application/json" } });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) throw new Error(result?.error || `Request failed with status ${response.status}`);
    const r = result.record || {};
    loadedRecord = r;
    fields.forEach((f) => setText(f, r[f]));
    setText("record_no", r.record_no ?? r.id);
    setText("arrival_time", arrivalTimeText(r));
    setText("arrival_next_day", isYes(r.arrival_next_day) ? "Yes (+1 Day)" : "No");
    setText("additional_fares", isYes(r.additional_fares) ? "Yes" : "No");
    await fillAirlineName(r);
    setStatus("Flight record loaded.");
    const index = await fillAirportNames(r).catch(() => {
      return null;
    });
    setRouteDistance(r, index);
    await drawSingleMap(r, index);
  } catch (error) {
    fields.forEach((f) => setText(f, "-"));
    setText("route_distance", "-");
    const airline = document.getElementById("airline_name");
    if (airline) airline.hidden = true;
    editLink.href = "./show_flights.html";
    setStatus(`Failed to load flight record: ${error.message}`, "error");
  }
}

document.getElementById("mapZoomIn").addEventListener("click", () => mapController?.zoomIn());
document.getElementById("mapZoomOut").addEventListener("click", () => mapController?.zoomOut());
document.getElementById("mapFit").addEventListener("click", () => mapController?.fit());
document.getElementById("mapFullscreen").addEventListener("click", () => mapController?.toggleFullscreen(document.getElementById("singleMapWrap")));
document.getElementById("mapExport").addEventListener("click", () => mapController?.exportPng(`flight-${loadedRecord?.flight_number || "route"}-${loadedRecord?.flight_date || "map"}.png`));
window.addEventListener("resize", () => {
  setTimeout(refreshAirportMarquee, 80);
  setTimeout(refreshAirlineMarquee, 80);
});
document.addEventListener("DOMContentLoaded", loadRecord);

const canvas = document.getElementById("flightMapCanvas");
const mapPanel = document.getElementById("mapPanel");
const mapStatus = document.getElementById("mapStatus");
const mapTooltip = document.getElementById("mapTooltip");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const routeMode = document.getElementById("routeMode");
const labelToggle = document.getElementById("labelToggle");
const airportToggle = document.getElementById("airportToggle");
const routeToggle = document.getElementById("routeToggle");
const drawBtn = document.getElementById("drawBtn");
const resetBtn = document.getElementById("resetBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const fitBtn = document.getElementById("fitBtn");
const clearHighlightBtn = document.getElementById("clearHighlightBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const exportBtn = document.getElementById("exportBtn");
const recordStat = document.getElementById("recordStat");
const routeStat = document.getElementById("routeStat");
const airportStat = document.getElementById("airportStat");
const missingStat = document.getElementById("missingStat");
const summaryStat = document.getElementById("summaryStat");
const distanceStat = document.getElementById("distanceStat");
const baggageStat = document.getElementById("baggageStat");
const topRoutesList = document.getElementById("topRoutesList");
const airportList = document.getElementById("airportList");
const missingList = document.getElementById("missingList");

let controller = null;
let airportIndex = null;
let currentRecords = [];
let currentBuiltRoutes = [];
let selectedRouteKey = "";
let selectedAirportCode = "";
const ROUTE_ARROW = " ➔ ";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function routeKey(from, to) {
  return `${String(from || "").trim().toUpperCase()}->${String(to || "").trim().toUpperCase()}`;
}

function formatTimes(n) {
  return `${Number(n || 0)} ${Number(n || 0) === 1 ? "time" : "times"}`;
}

function formatDistance(km) {
  const n = Number(km);
  return Number.isFinite(n) && n > 0 ? `${Math.round(n).toLocaleString("en-US")} km est.` : "-";
}

function airportCountry(airport) {
  return String(airport?.iso_country || "").trim().toUpperCase();
}

function airportIcao(airport) {
  return String(airport?.icao_code || airport?.gps_code || airport?.ident || "").trim().toUpperCase();
}

function airportDisplayCode(airport, fallbackCode) {
  return String(airport?.original_iata_code || airport?.iata_code || fallbackCode || "").trim().toUpperCase();
}

function airportTooltipCode(airport, fallbackCode) {
  const primary = airportDisplayCode(airport, fallbackCode);
  const icao = airportIcao(airport);
  return icao && icao !== primary ? `${primary}(${icao})` : primary;
}

function airportLocation(airport) {
  return [airport?.municipality, airport?.iso_country].map((value) => String(value || "").trim()).filter(Boolean).join(", ");
}

function routeLabelHasCountryCodes(label) {
  return (String(label || "").match(/\([A-Z]{2}\)/g) || []).length >= 2;
}

function displayRouteArrow(label) {
  return String(label || "").replace(/\s*(?:->|→|➔)\s*/g, ROUTE_ARROW);
}

function routeDisplayLabel(from, to, route = null) {
  const fromCode = String(from || route?.from || "").trim().toUpperCase();
  const toCode = String(to || route?.to || "").trim().toUpperCase();
  const fromAirport = route?.from_airport || airportIndex?.airports?.[fromCode];
  const toAirport = route?.to_airport || airportIndex?.airports?.[toCode];
  const fromCountry = airportCountry(fromAirport);
  const toCountry = airportCountry(toAirport);
  if (fromCountry && toCountry) return `${fromCode} (${fromCountry})${ROUTE_ARROW}${toCode} (${toCountry})`;
  if (routeLabelHasCountryCodes(route?.label)) return displayRouteArrow(route.label);
  const fromText = fromCountry ? `${fromCode} (${fromCountry})` : fromCode;
  const toText = toCountry ? `${toCode} (${toCountry})` : toCode;
  return `${fromText}${ROUTE_ARROW}${toText}`;
}

function refreshMarquees() {
  document.querySelectorAll(".marquee").forEach((el) => {
    const track = el.querySelector(".marquee-track");
    if (!track) return;
    const overflow = Math.max(0, Math.ceil(track.scrollWidth - el.clientWidth));
    el.style.setProperty("--marquee-distance", `${overflow}px`);
    el.classList.toggle("scrolling", overflow > 4);
  });
}

function currentMapOptions() {
  return {
    routeMode: routeMode.value,
    showAirportLabels: labelToggle.checked,
    showLand: true,
    showAirports: airportToggle.checked,
    showRoutes: routeToggle.checked,
    onHover: handleMapHover,
    onSelect: handleMapSelect
  };
}

function setBusy(busy) {
  if (drawBtn) drawBtn.disabled = busy;
  if (resetBtn) resetBtn.disabled = busy;
  if (mapStatus) mapStatus.textContent = busy ? "Loading..." : mapStatus.textContent;
}

function showTooltip(html, point) {
  if (!html || !point) {
    mapTooltip.hidden = true;
    return;
  }
  mapTooltip.innerHTML = html;
  mapTooltip.hidden = false;
  const panel = mapPanel.getBoundingClientRect();
  let x = point.x + 14;
  let y = point.y + 14;
  if (x + 260 > panel.width) x = Math.max(10, point.x - 274);
  if (y + 132 > panel.height) y = Math.max(10, point.y - 144);
  mapTooltip.style.left = `${x}px`;
  mapTooltip.style.top = `${y}px`;
}

function handleMapHover(target, point) {
  if (!target) {
    showTooltip(null, null);
    return;
  }
  if (target.type === "airport") {
    const a = target.airport;
    showTooltip(`<strong>${escapeHtml(airportTooltipCode(a, target.code))}</strong>${escapeHtml(a.name || "")}<br>${escapeHtml(airportLocation(a))}`, point);
    return;
  }
  if (target.type === "route") {
    const r = target.route;
    const km = Number(r?.distance_km) || FlightMapToolkit.distanceKm(r?.from_airport, r?.to_airport);
    showTooltip(`<strong>${escapeHtml(routeDisplayLabel(target.from, target.to, r))}</strong>${escapeHtml(formatDistance(km))}<br>Click to highlight this sector.`, point);
  }
}

function handleMapSelect(target) {
  selectedRouteKey = "";
  selectedAirportCode = "";
  if (target?.type === "route") selectedRouteKey = target.key || routeKey(target.from, target.to);
  if (target?.type === "airport") selectedAirportCode = String(target.code || "").toUpperCase();
  refreshSideActiveState();
}

async function fetchMapSummary() {
  const url = new URL("./api/flight_map_summary", window.location.href);
  if (startDate.value) url.searchParams.set("start_date", startDate.value);
  if (endDate.value) url.searchParams.set("end_date", endDate.value);
  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.ok) throw new Error(data?.error || `Failed to load map summary: HTTP ${res.status}`);
  return data;
}

function uniqueAirportCount(routes) {
  const s = new Set();
  routes.forEach((r) => {
    if (r.from) s.add(r.from);
    if (r.to) s.add(r.to);
  });
  return s.size;
}

function airportUsage(records) {
  const map = new Map();
  for (const record of records) {
    for (const code of [record.departure_station, record.arrival_station]) {
      const c = String(code || "").trim().toUpperCase();
      if (c) map.set(c, (map.get(c) || 0) + 1);
    }
  }
  return map;
}

function totalDistanceKm(records) {
  let total = 0;
  for (const record of records) {
    const from = airportIndex?.airports?.[String(record.departure_station || "").trim().toUpperCase()];
    const to = airportIndex?.airports?.[String(record.arrival_station || "").trim().toUpperCase()];
    total += FlightMapToolkit.distanceKm(from, to);
  }
  return total;
}

function parseBaggageKg(value) {
  const text = String(value || "").trim().toUpperCase();
  if (!text || text === "NO") return 0;
  const match = text.match(/(?:^|[\/\s])([0-9]+(?:\.[0-9]+)?)\s*KG\b/);
  return match ? Number(match[1]) : 0;
}

function totalBaggageKg(records) {
  return records.reduce((sum, record) => sum + parseBaggageKg(record.baggage_no_weight), 0);
}

function routeSummaryLookup(summaryRoutes) {
  const map = new Map();
  for (const route of Array.isArray(summaryRoutes) ? summaryRoutes : []) {
    map.set(routeKey(route.from, route.to), route);
  }
  return map;
}

function enrichBuiltRoutes(routes, summaryRoutes) {
  const lookup = routeSummaryLookup(summaryRoutes);
  for (const route of routes) {
    const summary = lookup.get(routeKey(route.from, route.to));
    if (!summary) continue;
    route.distance_km = Number(summary.distance_km) || 0;
    route.label = routeDisplayLabel(route.from, route.to, { ...route, label: summary.label });
  }
}

function refreshSideActiveState() {
  document.querySelectorAll("[data-route-key]").forEach((el) => el.classList.toggle("active", el.dataset.routeKey === selectedRouteKey));
  document.querySelectorAll("[data-airport-code]").forEach((el) => el.classList.toggle("active", el.dataset.airportCode === selectedAirportCode));
}

function renderTopRoutes(summary) {
  const routes = Array.isArray(summary.route_summary?.routes) ? summary.route_summary.routes.slice(0, 14) : [];
  topRoutesList.innerHTML = routes.length ? routes.map((r) => {
    const key = routeKey(r.from, r.to);
    return `<button class="item route-item interactive" type="button" data-route-key="${escapeHtml(key)}" data-from="${escapeHtml(r.from)}" data-to="${escapeHtml(r.to)}"><strong>${escapeHtml(routeDisplayLabel(r.from, r.to, r))}</strong><span>${escapeHtml(formatTimes(r.count))}</span></button>`;
  }).join("") : '<p class="muted">No route data.</p>';
  refreshSideActiveState();
}

function airportListData(summary, records) {
  const apiAirports = summary.route_summary?.airports;
  if (Array.isArray(apiAirports) && apiAirports.length && typeof apiAirports[0] === "object") return apiAirports;
  return [...airportUsage(records).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([code, count]) => {
    const airport = airportIndex?.airports?.[code] || {};
    return { code, count, label: `${code} (${count})`, location: airportLocation(airport), name: airport.name || "" };
  });
}

function renderAirportList(summary, records) {
  const airports = airportListData(summary, records);
  airportList.innerHTML = airports.length ? airports.map((airport) => {
    const code = airport.code;
    const localAirport = airportIndex?.airports?.[String(code || "").trim().toUpperCase()] || {};
    const location = airport.location || airportLocation(localAirport) || airport.country || "";
    const count = Number(airport.count || 0);
    return `<button class="item airport-item interactive" type="button" data-airport-code="${escapeHtml(code)}" title="${escapeHtml(airport.name || localAirport.name || code)}"><strong>${escapeHtml(`${code} (${count})`)}</strong><span class="airport-location marquee"><span class="marquee-track">${escapeHtml(location)}</span></span></button>`;
  }).join("") : '<p class="muted">No airport data.</p>';
  setTimeout(refreshMarquees, 80);
  refreshSideActiveState();
}

function renderMissing(missing) {
  const unique = [...new Set((missing || []).map((x) => x.code).filter(Boolean))];
  missingList.innerHTML = unique.length ? unique.map((code) => `<div class="item"><strong>${escapeHtml(code)}</strong><span>not found</span></div>`).join("") : '<p class="muted">None</p>';
}

async function draw() {
  setBusy(true);
  try {
    const summary = await fetchMapSummary();
    currentRecords = Array.isArray(summary.records) ? summary.records : [];
    const built = FlightMapToolkit.buildRoutesFromRecords(currentRecords, airportIndex, { mode: routeMode.value });
    currentBuiltRoutes = built.routes;
    enrichBuiltRoutes(built.routes, summary.route_summary?.routes);
    selectedRouteKey = "";
    selectedAirportCode = "";
    controller.setData(built.routes, currentMapOptions());
    recordStat.textContent = `Records: ${currentRecords.length}`;
    routeStat.textContent = `Routes: ${built.routes.length}`;
    airportStat.textContent = `Airports: ${uniqueAirportCount(built.routes)}`;
    missingStat.textContent = `Missing: ${built.missing.length}`;
    summaryStat.textContent = `Summary: ${summary.route_summary?.total_sectors ?? summary.route_summary?.route_count ?? "-"} sectors`;
    const apiDistance = Number(summary.route_summary?.total_distance_km);
    const apiBaggage = Number(summary.route_summary?.total_baggage_kg);
    if (distanceStat) distanceStat.textContent = `Distance: ${formatDistance(Number.isFinite(apiDistance) && apiDistance > 0 ? apiDistance : totalDistanceKm(currentRecords))}`;
    if (baggageStat) baggageStat.textContent = `Baggage: ${Math.round(Number.isFinite(apiBaggage) ? apiBaggage : totalBaggageKg(currentRecords)).toLocaleString("en-US")} kg`;
    renderTopRoutes(summary);
    renderAirportList(summary, currentRecords);
    renderMissing(built.missing);
    if (built.missing.length) console.warn("Missing airport codes", built.missing);
  } catch (error) {
    mapStatus.textContent = "Failed: " + error.message;
    mapStatus.classList.add("error");
    console.error(error);
  } finally {
    setBusy(false);
  }
}

async function init() {
  try {
    setBusy(true);
    controller = FlightMapToolkit.createController({ canvas, statusElement: mapStatus, mapOptions: currentMapOptions() });
    airportIndex = await FlightMapToolkit.loadAirportIndex();
    await draw();
  } catch (error) {
    mapStatus.textContent = "Failed: " + error.message;
    mapStatus.classList.add("error");
    console.error(error);
  } finally {
    setBusy(false);
  }
}

function updateLayerOptions() {
  controller?.setOptions(currentMapOptions());
}

function addListener(element, type, handler) {
  if (element) element.addEventListener(type, handler);
}

addListener(drawBtn, "click", draw);
addListener(labelToggle, "change", updateLayerOptions);
addListener(airportToggle, "change", updateLayerOptions);
addListener(routeToggle, "change", updateLayerOptions);
addListener(routeMode, "change", draw);
addListener(resetBtn, "click", () => {
  startDate.value = "";
  endDate.value = "";
  routeMode.value = "layered";
  labelToggle.checked = true;
  airportToggle.checked = true;
  routeToggle.checked = true;
  selectedRouteKey = "";
  selectedAirportCode = "";
  draw();
});
addListener(zoomInBtn, "click", () => controller?.zoomIn());
addListener(zoomOutBtn, "click", () => controller?.zoomOut());
addListener(fitBtn, "click", () => controller?.fit());
addListener(clearHighlightBtn, "click", () => {
  selectedRouteKey = "";
  selectedAirportCode = "";
  controller?.clearHighlight();
  refreshSideActiveState();
});
addListener(fullscreenBtn, "click", () => controller?.toggleFullscreen(mapPanel));
addListener(exportBtn, "click", () => controller?.exportPng(`flight-map-${new Date().toISOString().slice(0, 10)}.png`));
addListener(topRoutesList, "click", (event) => {
  const item = event.target.closest("[data-route-key]");
  if (!item) return;
  selectedRouteKey = item.dataset.routeKey;
  selectedAirportCode = "";
  controller?.setHighlightedRoute(item.dataset.from, item.dataset.to);
  refreshSideActiveState();
});
addListener(airportList, "click", (event) => {
  const item = event.target.closest("[data-airport-code]");
  if (!item) return;
  selectedAirportCode = item.dataset.airportCode;
  selectedRouteKey = "";
  controller?.focusAirport(selectedAirportCode, 12);
  refreshSideActiveState();
});
document.addEventListener("DOMContentLoaded", init);

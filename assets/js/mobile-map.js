const mobileMapCanvas = document.getElementById("mobileFlightMapCanvas");
const mobileMapPanel = document.getElementById("mobileMapPanel");
const mobileMapStatus = document.getElementById("mobileMapStatus");
const mobileMapTooltip = document.getElementById("mobileMapTooltip");
const mobileZoomInBtn = document.getElementById("mobileZoomInBtn");
const mobileZoomOutBtn = document.getElementById("mobileZoomOutBtn");
const mobileFitBtn = document.getElementById("mobileFitBtn");
const mobileMapTabbar = document.querySelector(".mobile-map-body .mobile-tabbar");

let mobileMapController = null;
let mobileAirportIndex = null;
let mobileMapLayoutFrame = 0;
const MOBILE_ROUTE_ARROW = " ➔ ";

function escapeMapHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mobileRouteKey(from, to) {
  return `${String(from || "").trim().toUpperCase()}->${String(to || "").trim().toUpperCase()}`;
}

function mobileAirportCountry(airport) {
  return String(airport?.iso_country || "").trim().toUpperCase();
}

function mobileAirportIcao(airport) {
  return String(airport?.icao_code || airport?.gps_code || airport?.ident || "").trim().toUpperCase();
}

function mobileAirportDisplayCode(airport, fallbackCode) {
  return String(airport?.original_iata_code || airport?.iata_code || fallbackCode || "").trim().toUpperCase();
}

function mobileAirportTooltipCode(airport, fallbackCode) {
  const primary = mobileAirportDisplayCode(airport, fallbackCode);
  const icao = mobileAirportIcao(airport);
  return icao && icao !== primary ? `${primary}(${icao})` : primary;
}

function mobileAirportLocation(airport) {
  return [airport?.municipality, airport?.iso_country].map((value) => String(value || "").trim()).filter(Boolean).join(", ");
}

function mobileRouteLabelHasCountryCodes(label) {
  return (String(label || "").match(/\([A-Z]{2}\)/g) || []).length >= 2;
}

function mobileDisplayRouteArrow(label) {
  return String(label || "").replace(/\s*(?:->|→|➔)\s*/g, MOBILE_ROUTE_ARROW);
}

function mobileRouteLabel(from, to, route = null) {
  const fromCode = String(from || route?.from || "").trim().toUpperCase();
  const toCode = String(to || route?.to || "").trim().toUpperCase();
  const fromAirport = route?.from_airport || mobileAirportIndex?.airports?.[fromCode];
  const toAirport = route?.to_airport || mobileAirportIndex?.airports?.[toCode];
  const fromCountry = mobileAirportCountry(fromAirport);
  const toCountry = mobileAirportCountry(toAirport);
  if (fromCountry && toCountry) return `${fromCode} (${fromCountry})${MOBILE_ROUTE_ARROW}${toCode} (${toCountry})`;
  if (mobileRouteLabelHasCountryCodes(route?.label)) return mobileDisplayRouteArrow(route.label);
  const fromText = fromCountry ? `${fromCode} (${fromCountry})` : fromCode;
  const toText = toCountry ? `${toCode} (${toCountry})` : toCode;
  return `${fromText}${MOBILE_ROUTE_ARROW}${toText}`;
}

function formatMobileMapDistance(km) {
  const n = Number(km);
  return Number.isFinite(n) && n > 0 ? `${Math.round(n).toLocaleString("en-US")} km est.` : "-";
}

function enrichMobileRoutes(routes, summaryRoutes) {
  const lookup = new Map();
  for (const route of Array.isArray(summaryRoutes) ? summaryRoutes : []) {
    lookup.set(mobileRouteKey(route.from, route.to), route);
  }
  for (const route of routes) {
    const summary = lookup.get(mobileRouteKey(route.from, route.to));
    if (!summary) continue;
    route.distance_km = Number(summary.distance_km) || 0;
    route.label = mobileRouteLabel(route.from, route.to, { ...route, label: summary.label });
  }
}

function showMapTooltip(html, point) {
  if (!html || !point) {
    mobileMapTooltip.hidden = true;
    return;
  }
  mobileMapTooltip.innerHTML = html;
  mobileMapTooltip.hidden = false;
  const panel = mobileMapPanel.getBoundingClientRect();
  let x = point.x + 12;
  let y = point.y + 12;
  if (x + 240 > panel.width) x = Math.max(8, point.x - 252);
  if (y + 110 > panel.height) y = Math.max(8, point.y - 122);
  mobileMapTooltip.style.left = `${x}px`;
  mobileMapTooltip.style.top = `${y}px`;
}

function handleMobileMapHover(target, point) {
  if (!target) {
    showMapTooltip(null, null);
    return;
  }
  if (target.type === "airport") {
    const airport = target.airport || {};
    showMapTooltip(`<strong>${escapeMapHtml(mobileAirportTooltipCode(airport, target.code))}</strong>${escapeMapHtml(airport.name || "")}<br>${escapeMapHtml(mobileAirportLocation(airport))}`, point);
    return;
  }
  if (target.type === "route") {
    const km = Number(target.route?.distance_km) || FlightMapToolkit.distanceKm(target.route?.from_airport, target.route?.to_airport);
    showMapTooltip(`<strong>${escapeMapHtml(mobileRouteLabel(target.from, target.to, target.route))}</strong>${escapeMapHtml(formatMobileMapDistance(km))}<br>Click to highlight this sector.`, point);
  }
}

function currentMobileMapOptions() {
  return {
    routeMode: "layered",
    showAirportLabels: true,
    showLand: true,
    showAirports: true,
    showRoutes: true,
    onHover: handleMobileMapHover
  };
}

function updateMobileMapLayout() {
  mobileMapLayoutFrame = 0;
  if (!mobileMapPanel) return;

  const viewportHeight = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0;
  const panelTop = mobileMapPanel.getBoundingClientRect().top;
  const tabbarTop = mobileMapTabbar?.getBoundingClientRect().top || viewportHeight;
  const bottomGap = 8;
  const availableHeight = Math.floor(tabbarTop - panelTop - bottomGap);
  const compactLandscape = window.matchMedia?.("(orientation: landscape) and (max-height: 620px)")?.matches;
  const fallbackHeight = compactLandscape ? Math.max(160, viewportHeight - panelTop - 66) : Math.min(520, Math.max(260, viewportHeight * 0.62));
  const height = availableHeight > 0 ? availableHeight : fallbackHeight;

  mobileMapPanel.style.setProperty("--mobile-map-panel-height", `${height}px`);
  mobileMapController?.render();
}

function scheduleMobileMapLayout() {
  if (mobileMapLayoutFrame) return;
  mobileMapLayoutFrame = requestAnimationFrame(updateMobileMapLayout);
}

async function fetchMobileMapSummary() {
  const response = await fetch(new URL("../api/flight_map_summary", window.location.href).toString(), {
    headers: { accept: "application/json" }
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result || !result.ok) throw new Error(result?.error || `HTTP ${response.status}`);
  return result;
}

async function drawMobileMap() {
  mobileMapStatus.textContent = "Loading...";
  try {
    const summary = await fetchMobileMapSummary();
    const records = Array.isArray(summary.records) ? summary.records : [];
    const built = FlightMapToolkit.buildRoutesFromRecords(records, mobileAirportIndex, { mode: "layered" });
    enrichMobileRoutes(built.routes, summary.route_summary?.routes);
    mobileMapController.setData(built.routes, currentMobileMapOptions());
    if (built.missing.length) console.warn("Missing airport codes", built.missing);
  } catch (error) {
    mobileMapStatus.textContent = "Failed: " + error.message;
    mobileMapStatus.classList.add("error");
    console.error(error);
  }
}

async function initMobileMap() {
  try {
    updateMobileMapLayout();
    mobileMapController = FlightMapToolkit.createController({
      canvas: mobileMapCanvas,
      statusElement: mobileMapStatus,
      mapOptions: currentMobileMapOptions()
    });
    mobileAirportIndex = await FlightMapToolkit.loadAirportIndex();
    await drawMobileMap();
  } catch (error) {
    mobileMapStatus.textContent = "Failed: " + error.message;
    mobileMapStatus.classList.add("error");
    console.error(error);
  }
}

mobileZoomInBtn.addEventListener("click", () => mobileMapController?.zoomIn());
mobileZoomOutBtn.addEventListener("click", () => mobileMapController?.zoomOut());
mobileFitBtn.addEventListener("click", () => mobileMapController?.fit());
document.addEventListener("fullscreenchange", () => {
  scheduleMobileMapLayout();
  setTimeout(() => mobileMapController?.render(), 80);
});
window.addEventListener("resize", scheduleMobileMapLayout, { passive: true });
window.addEventListener("orientationchange", scheduleMobileMapLayout, { passive: true });
window.visualViewport?.addEventListener("resize", scheduleMobileMapLayout, { passive: true });
document.addEventListener("DOMContentLoaded", initMobileMap);

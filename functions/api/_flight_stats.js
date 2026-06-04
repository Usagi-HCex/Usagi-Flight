const AIRPORT_INDEX_URL = "/assets/data/airport-index.json";
const ROUTE_ARROW = " ➔ ";
export const STATS_SCHEMA_VERSION = 3;

let airportIndexPromise = null;

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function toRad(value) {
  return Number(value) * Math.PI / 180;
}

function airlinePrefix(flightNumber) {
  const match = normalizeCode(flightNumber).match(/^[A-Z0-9]{2}/);
  return match ? match[0] : "";
}

export function airportForCode(index, code) {
  return index?.airports?.[normalizeCode(code)] || null;
}

function authalicFallbackDistanceMeters(lat1, lon1, lat2, lon2) {
  const radius = 6371007.180918475;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(normalizeLongitudeDelta(lon2 - lon1));
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

function normalizeLongitudeDelta(delta) {
  return ((Number(delta) + 540) % 360) - 180;
}

export function wgs84GeodesicDistanceKm(fromAirport, toAirport) {
  const lat1 = Number(fromAirport?.latitude_deg);
  const lon1 = Number(fromAirport?.longitude_deg);
  const lat2 = Number(toAirport?.latitude_deg);
  const lon2 = Number(toAirport?.longitude_deg);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0;
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const a = 6378137;
  const f = 1 / 298.257223563;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const fMean = (phi1 + phi2) / 2;
  const g = (phi1 - phi2) / 2;
  const l = Math.abs(toRad(normalizeLongitudeDelta(lon2 - lon1))) / 2;
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
  if (c <= 1e-15) return authalicFallbackDistanceMeters(lat1, lon1, lat2, lon2) / 1000;

  const omega = Math.atan2(Math.sqrt(s), Math.sqrt(c));
  if (!Number.isFinite(omega) || omega <= Number.EPSILON) return 0;
  const r = Math.sqrt(s * c) / omega;
  const h1 = (3 * r - 1) / (2 * c);
  const h2 = (3 * r + 1) / (2 * s);
  const distance = 2 * omega * a * (1 + f * h1 * sinF2 * cosG2 - f * h2 * cosF2 * sinG2);
  return Number.isFinite(distance) && distance >= 0
    ? distance / 1000
    : authalicFallbackDistanceMeters(lat1, lon1, lat2, lon2) / 1000;
}

export function parseBaggageKg(value) {
  const text = String(value || "").trim().toUpperCase();
  if (!text || text === "NO") return 0;
  const match = text.match(/(?:^|[\/\s])([0-9]+(?:\.[0-9]+)?)\s*KG\b/);
  return match ? Number(match[1]) : 0;
}

export function airportCountry(airport) {
  return normalizeCode(airport?.iso_country);
}

export function airportLocation(airport) {
  return [airport?.municipality, airport?.iso_country].map((value) => String(value || "").trim()).filter(Boolean).join(", ");
}

export function airportIcao(airport) {
  return normalizeCode(airport?.icao_code || airport?.gps_code || airport?.ident);
}

export function airportDisplayCode(airport, fallbackCode) {
  const fallback = normalizeCode(fallbackCode);
  return normalizeCode(airport?.original_iata_code) || normalizeCode(airport?.iata_code) || fallback;
}

export function airportTooltipCode(airport, fallbackCode) {
  const primary = airportDisplayCode(airport, fallbackCode);
  const icao = airportIcao(airport);
  return icao && icao !== primary ? `${primary}(${icao})` : primary;
}

export function routeLabel(fromCode, toCode, airportIndex) {
  const from = airportForCode(airportIndex, fromCode);
  const to = airportForCode(airportIndex, toCode);
  const fromCountry = airportCountry(from);
  const toCountry = airportCountry(to);
  const fromLabel = fromCountry ? `${normalizeCode(fromCode)} (${fromCountry})` : normalizeCode(fromCode);
  const toLabel = toCountry ? `${normalizeCode(toCode)} (${toCountry})` : normalizeCode(toCode);
  return `${fromLabel}${ROUTE_ARROW}${toLabel}`;
}

export function routeDistanceKm(fromCode, toCode, airportIndex) {
  return wgs84GeodesicDistanceKm(airportForCode(airportIndex, fromCode), airportForCode(airportIndex, toCode));
}

export function buildFlightStatsSummary(records, airportIndex = null) {
  const airports = new Set();
  const airlines = new Set();
  let totalDistanceKm = 0;
  let totalBaggageKg = 0;

  for (const record of records || []) {
    const from = normalizeCode(record?.departure_station);
    const to = normalizeCode(record?.arrival_station);
    const airline = airlinePrefix(record?.flight_number);

    if (from) airports.add(from);
    if (to) airports.add(to);
    if (airline) airlines.add(airline);
    if (from && to && airportIndex) totalDistanceKm += routeDistanceKm(from, to, airportIndex);
    totalBaggageKg += parseBaggageKg(record?.baggage_no_weight);
  }

  return {
    stats_schema_version: STATS_SCHEMA_VERSION,
    distance_algorithm: "WGS-84 ellipsoid geodesic estimate",
    total_sectors: Array.isArray(records) ? records.length : 0,
    airport_count: airports.size,
    airline_count: airlines.size,
    total_distance_km: Math.round(totalDistanceKm),
    total_baggage_kg: Math.round(totalBaggageKg)
  };
}

export function buildMapSummary(records, airportIndex = null) {
  const airportSet = new Set();
  const airportUsage = new Map();
  const routeMap = new Map();

  for (const record of records || []) {
    const from = normalizeCode(record?.departure_station);
    const to = normalizeCode(record?.arrival_station);
    if (!from || !to) continue;

    airportSet.add(from);
    airportSet.add(to);
    airportUsage.set(from, (airportUsage.get(from) || 0) + 1);
    airportUsage.set(to, (airportUsage.get(to) || 0) + 1);

    const key = `${from}->${to}`;
    if (!routeMap.has(key)) {
      routeMap.set(key, {
        from,
        to,
        count: 0,
        record_ids: [],
        distance_km: airportIndex ? Math.round(routeDistanceKm(from, to, airportIndex)) : 0,
        label: airportIndex ? routeLabel(from, to, airportIndex) : `${from}${ROUTE_ARROW}${to}`
      });
    }

    const route = routeMap.get(key);
    route.count += 1;
    route.record_ids.push(record.id);
  }

  const routes = Array.from(routeMap.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return `${a.from}-${a.to}`.localeCompare(`${b.from}-${b.to}`);
  });

  const airports = Array.from(airportUsage.entries()).map(([code, count]) => {
    const airport = airportForCode(airportIndex, code);
    return {
      code,
      count,
      label: `${code} (${count})`,
      country: airportCountry(airport),
      location: airportLocation(airport),
      name: airport?.name || "",
      icao_code: airportIcao(airport)
    };
  }).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  return {
    ...buildFlightStatsSummary(records, airportIndex),
    route_count: routes.length,
    airport_count: airportSet.size,
    airport_codes: Array.from(airportSet).sort(),
    airports,
    routes
  };
}

export async function loadAirportIndexForStats(request, env = null) {
  if (!airportIndexPromise) {
    const url = new URL(AIRPORT_INDEX_URL, request.url);
    const assetFetch = typeof env?.ASSETS?.fetch === "function"
      ? () => env.ASSETS.fetch(new Request(url.toString(), { headers: { accept: "application/json" } }))
      : () => fetch(url.toString(), { headers: { accept: "application/json" } });

    airportIndexPromise = assetFetch()
      .then((response) => {
        if (!response.ok) throw new Error(`airport index HTTP ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        airportIndexPromise = null;
        console.warn("Failed to load airport index for stats", error);
        return null;
      });
  }
  return airportIndexPromise;
}

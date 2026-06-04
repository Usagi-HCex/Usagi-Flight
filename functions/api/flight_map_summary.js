import { createD1Session, jsonWithSession } from "./_d1session.js";
import { getFlightRecordsListWithSession } from "./_flight_records_list_service.js";
import {
  buildMapSummary,
  loadAirportIndexForStats
} from "./_flight_stats.js";

function dateParam(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function keepByDate(record, startDate, endDate) {
  const date = String(record.flight_date || "");
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

function trimRecord(record) {
  return {
    id: record.id,
    record_no: record.record_no,
    flight_number: record.flight_number || "",
    aircraft_model: record.aircraft_model || "",
    flight_type: record.flight_type || "",
    flight_date: record.flight_date || "",
    departure_station: record.departure_station || "",
    departure_terminal: record.departure_terminal || "",
    departure_time: record.departure_time || "",
    arrival_station: record.arrival_station || "",
    arrival_terminal: record.arrival_terminal || "",
    arrival_time: record.arrival_time || "",
    baggage_no_weight: record.baggage_no_weight || ""
  };
}

export async function onRequestGet(context) {
  const d1 = createD1Session(context, "primary");

  try {
    const url = new URL(context.request.url);
    const startDate = dateParam(url.searchParams.get("start_date"));
    const endDate = dateParam(url.searchParams.get("end_date"));
    const forceRebuild = url.searchParams.get("force_rebuild") === "1";
    const airportIndex = await loadAirportIndexForStats(context.request, context.env);

    const listPayload = await getFlightRecordsListWithSession(d1.session, context.env, {
      forceRebuild,
      airportIndex
    });

    const allRecords = Array.isArray(listPayload.records) ? listPayload.records : [];
    const records = allRecords.filter((record) => keepByDate(record, startDate, endDate)).map(trimRecord);

    return jsonWithSession({
      ok: true,
      range: { start_date: startDate, end_date: endDate },
      records_total: allRecords.length,
      records_used: records.length,
      records,
      route_summary: buildMapSummary(records, airportIndex),
      cache: listPayload.cache || null,
      generated_at: new Date().toISOString()
    }, 200, d1);
  } catch (error) {
    return jsonWithSession({ ok: false, error: error.message }, 500, d1);
  }
}

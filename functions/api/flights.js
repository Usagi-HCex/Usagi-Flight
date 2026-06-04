import { encryptFlightPayload } from "./_flight_crypto.js";
import { createD1Session, jsonWithSession } from "./_d1session.js";
import { bumpFlightRecordsRevision } from "./_flight_revision.js";
import {
  getFlightRecordsListWithSession,
  paginateFlightRecords
} from "./_flight_records_list_service.js";
import {
  buildFlightStatsSummary,
  loadAirportIndexForStats
} from "./_flight_stats.js";

const DEFAULT_PAGE_LIMIT = 10;
const MAX_PAGE_LIMIT = 50;

async function getNextRecordNo(session) {
  const row = await session.prepare(`
    SELECT
      CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM flight_records
          WHERE record_no = 1
        )
        THEN 1
        ELSE (
          SELECT MIN(a.record_no + 1)
          FROM flight_records a
          LEFT JOIN flight_records b
            ON b.record_no = a.record_no + 1
          WHERE a.record_no IS NOT NULL
            AND b.record_no IS NULL
        )
      END AS next_record_no
  `).first();

  const nextNo = Number(row?.next_record_no || 1);
  return Number.isInteger(nextNo) && nextNo > 0 ? nextNo : 1;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getListParams(request) {
  const url = new URL(request.url);
  const page = parsePositiveInteger(url.searchParams.get("page"), 1);
  const requestedLimit = parsePositiveInteger(url.searchParams.get("limit"), DEFAULT_PAGE_LIMIT);
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_PAGE_LIMIT);
  const forceRebuild = url.searchParams.get("force_rebuild") === "1";

  return {
    page,
    limit,
    forceRebuild
  };
}

function validateRequiredFields(body) {
  if (!body.flight_number) throw new Error("flight_number is required");
  if (!body.flight_date) throw new Error("flight_date is required");
  if (!body.departure_station) throw new Error("departure_station is required");
  if (!body.arrival_station) throw new Error("arrival_station is required");
}

export async function onRequestGet(context) {
  const d1 = createD1Session(context, "primary");

  try {
    const { page, limit, forceRebuild } = getListParams(context.request);
    const airportIndex = await loadAirportIndexForStats(context.request, context.env);
    const listPayload = await getFlightRecordsListWithSession(
      d1.session,
      context.env,
      { forceRebuild, airportIndex }
    );

    const allRecords = Array.isArray(listPayload.records) ? listPayload.records : [];
    const paged = paginateFlightRecords(allRecords, page, limit);
    const summary = listPayload.summary || buildFlightStatsSummary(allRecords, airportIndex);

    return jsonWithSession({
      ok: true,
      records: paged.records,
      pagination: paged.pagination,
      summary,
      sort: listPayload.sort || {
        key: "flight_date",
        order: "desc",
        tie_breaker: "record_no desc, id desc"
      },
      cache: listPayload.cache || null,
      warnings: listPayload.warnings || [],
      loader: listPayload.loader || null,
      generated_at: listPayload.generated_at || ""
    }, 200, d1);
  } catch (err) {
    return jsonWithSession({ ok: false, error: err.message }, 500, d1);
  }
}

export async function onRequestPost(context) {
  const d1 = createD1Session(context, "primary");

  try {
    const body = await context.request.json();
    validateRequiredFields(body);

    const encrypted = await encryptFlightPayload(body, context.env);
    const recordNo = await getNextRecordNo(d1.session);

    const result = await d1.session.prepare(`
      INSERT INTO flight_records (
        record_no,
        record_uuid,
        key_version,
        wrapped_dek,
        data_iv,
        ciphertext,
        hmac_value_blob,
        payload_version
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 2)
    `).bind(
      recordNo,
      encrypted.record_uuid,
      encrypted.key_version,
      encrypted.wrapped_dek,
      encrypted.data_iv,
      encrypted.ciphertext,
      encrypted.hmac_value_blob
    ).run();

    await bumpFlightRecordsRevision(d1.session);

    return jsonWithSession({
      ok: true,
      id: result.meta?.last_row_id ?? null,
      record_no: recordNo,
      hmac_value: encrypted.hmac_value
    }, 201, d1);
  } catch (err) {
    return jsonWithSession({ ok: false, error: err.message }, 400, d1);
  }
}

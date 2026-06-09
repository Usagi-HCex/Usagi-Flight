import {
  calculateLegacyFlightHmac,
  calculateFlightHmac,
  encryptFlightPayload,
  sanitizeFlightPayload
} from "./_flight_crypto.js";
import { createD1Session, jsonWithSession } from "./_d1session.js";
import { bumpFlightRecordsRevision } from "./_flight_revision.js";

const MAX_IMPORT_ROWS = 1000;

function validateRequiredFields(record) {
  if (!record.flight_number) throw new Error("flight_number is required");
  if (!record.flight_date) throw new Error("flight_date is required");
  if (!record.departure_station) throw new Error("departure_station is required");
  if (!record.arrival_station) throw new Error("arrival_station is required");
}

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

async function findExistingByHmac(session, hmacValue) {
  return session.prepare(`
    SELECT id, record_no
    FROM flight_records
    WHERE lower(hex(hmac_value_blob)) = ?
    LIMIT 1
  `).bind(String(hmacValue || "").toLowerCase()).first();
}

async function insertRecord(session, encrypted) {
  const recordNo = await getNextRecordNo(session);
  const result = await session.prepare(`
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
    VALUES (?, ?, ?, ?, ?, ?, ?, 3)
  `).bind(
    recordNo,
    encrypted.record_uuid,
    encrypted.key_version,
    encrypted.wrapped_dek,
    encrypted.data_iv,
    encrypted.ciphertext,
    encrypted.hmac_value_blob
  ).run();

  return {
    id: result.meta?.last_row_id ?? null,
    record_no: recordNo
  };
}

function canUseLegacyHmac(payload) {
  return payload.arrival_next_day !== "Yes" &&
    payload.additional_fares !== "Yes" &&
    !payload.additional_fares_detail;
}

export async function onRequestPost(context) {
  const d1 = createD1Session(context, "primary");

  try {
    const body = await context.request.json().catch(() => null);
    const records = Array.isArray(body?.records) ? body.records : [];
    if (!records.length) throw new Error("No records to import");
    if (records.length > MAX_IMPORT_ROWS) throw new Error(`Import is limited to ${MAX_IMPORT_ROWS} rows per request`);

    let inserted = 0;
    let skippedDuplicates = 0;
    let failed = 0;
    const imported = [];
    const duplicates = [];
    const errors = [];
    const seenHmac = new Set();

    for (let index = 0; index < records.length; index += 1) {
      try {
        const payload = sanitizeFlightPayload(records[index]);
        validateRequiredFields(payload);
        const hmacValue = await calculateFlightHmac(payload, context.env);
        const legacyHmacValue = canUseLegacyHmac(payload)
          ? await calculateLegacyFlightHmac(payload, context.env)
          : "";

        if (seenHmac.has(hmacValue) || (legacyHmacValue && seenHmac.has(legacyHmacValue))) {
          skippedDuplicates += 1;
          duplicates.push({ row: index + 1, duplicate_scope: "csv", hmac_value: hmacValue });
          continue;
        }

        const existing = await findExistingByHmac(d1.session, hmacValue) ||
          (legacyHmacValue ? await findExistingByHmac(d1.session, legacyHmacValue) : null);
        if (existing) {
          seenHmac.add(hmacValue);
          if (legacyHmacValue) seenHmac.add(legacyHmacValue);
          skippedDuplicates += 1;
          duplicates.push({
            row: index + 1,
            duplicate_scope: "database",
            id: existing.id,
            record_no: existing.record_no ?? existing.id,
            hmac_value: hmacValue
          });
          continue;
        }

        const encrypted = await encryptFlightPayload(payload, context.env);
        const row = await insertRecord(d1.session, encrypted);
        seenHmac.add(hmacValue);
        if (legacyHmacValue) seenHmac.add(legacyHmacValue);
        inserted += 1;
        imported.push({
          row: index + 1,
          id: row.id,
          record_no: row.record_no,
          hmac_value: encrypted.hmac_value
        });
      } catch (error) {
        failed += 1;
        if (errors.length < 25) {
          errors.push({ row: index + 1, error: error.message });
        }
      }
    }

    if (inserted > 0) await bumpFlightRecordsRevision(d1.session);

    return jsonWithSession({
      ok: true,
      total: records.length,
      inserted,
      skipped_duplicates: skippedDuplicates,
      failed,
      imported,
      duplicates,
      errors
    }, 200, d1);
  } catch (error) {
    return jsonWithSession({ ok: false, error: error.message }, 400, d1);
  }
}

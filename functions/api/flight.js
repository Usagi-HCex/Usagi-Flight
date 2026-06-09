import { encryptFlightPayload, decryptFlightRecordRow, getRowHmacHex } from "./_flight_crypto.js";
import { createD1Session, jsonWithSession } from "./_d1session.js";
import { bumpFlightRecordsRevision } from "./_flight_revision.js";

const SELECT_COLUMNS = `
  id,
  record_no,
  record_uuid,
  key_version,
  wrapped_dek,
  data_iv,
  ciphertext,
  hmac_value_blob,
  payload_version,
  created_at,
  updated_at
`;

function getInternalId(request) {
  const url = new URL(request.url);
  const internalId = Number(url.searchParams.get("id"));

  if (!Number.isInteger(internalId) || internalId <= 0) {
    throw new Error("Invalid record reference");
  }

  return internalId;
}

function validateRequiredFields(body) {
  if (!body.flight_number) throw new Error("flight_number is required");
  if (!body.flight_date) throw new Error("flight_date is required");
  if (!body.departure_station) throw new Error("departure_station is required");
  if (!body.arrival_station) throw new Error("arrival_station is required");
}

export async function onRequestGet(context) {
  const d1 = createD1Session(context, "default");

  try {
    const internalId = getInternalId(context.request);

    const row = await d1.session.prepare(`
      SELECT ${SELECT_COLUMNS}
      FROM flight_records
      WHERE id = ?
    `).bind(internalId).first();

    if (!row) {
      return jsonWithSession({ ok: false, error: "Flight record not found" }, 404, d1);
    }

    const payload = await decryptFlightRecordRow(row, context.env);

    return jsonWithSession({
      ok: true,
      record: {
        id: row.id,
        record_no: row.record_no ?? row.id,
        ...payload,
        hmac_value: getRowHmacHex(row),
        payload_version: row.payload_version ?? 2,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    }, 200, d1);
  } catch (err) {
    return jsonWithSession({ ok: false, error: err.message }, 400, d1);
  }
}

export async function onRequestPut(context) {
  const d1 = createD1Session(context, "primary");

  try {
    const internalId = getInternalId(context.request);
    const body = await context.request.json();
    validateRequiredFields(body);

    const existing = await d1.session.prepare(`
      SELECT id, record_no, record_uuid
      FROM flight_records
      WHERE id = ?
    `).bind(internalId).first();

    if (!existing) {
      return jsonWithSession({ ok: false, error: "Flight record not found" }, 404, d1);
    }

    const encrypted = await encryptFlightPayload(body, context.env, {
      recordUuid: existing.record_uuid
    });

    await d1.session.prepare(`
      UPDATE flight_records
      SET
        record_uuid = ?,
        key_version = ?,
        wrapped_dek = ?,
        data_iv = ?,
        ciphertext = ?,
        hmac_value_blob = ?,
        payload_version = 3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      encrypted.record_uuid,
      encrypted.key_version,
      encrypted.wrapped_dek,
      encrypted.data_iv,
      encrypted.ciphertext,
      encrypted.hmac_value_blob,
      internalId
    ).run();

    await bumpFlightRecordsRevision(d1.session);

    return jsonWithSession({
      ok: true,
      record_no: existing.record_no ?? existing.id,
      hmac_value: encrypted.hmac_value
    }, 200, d1);
  } catch (err) {
    return jsonWithSession({ ok: false, error: err.message }, 400, d1);
  }
}

export async function onRequestDelete(context) {
  const d1 = createD1Session(context, "primary");

  try {
    const internalId = getInternalId(context.request);
    const existing = await d1.session.prepare(`
      SELECT id, record_no
      FROM flight_records
      WHERE id = ?
    `).bind(internalId).first();

    if (!existing) {
      return jsonWithSession({ ok: false, error: "Flight record not found" }, 404, d1);
    }

    const sql = ["DELETE", "FROM flight_records", "WHERE id = ?"].join(" ");
    await d1.session.prepare(sql).bind(internalId).run();
    await bumpFlightRecordsRevision(d1.session);

    return jsonWithSession({
      ok: true,
      id: internalId,
      record_no: existing.record_no ?? existing.id,
      deleted: true
    }, 200, d1);
  } catch (err) {
    return jsonWithSession({ ok: false, error: err.message }, 400, d1);
  }
}

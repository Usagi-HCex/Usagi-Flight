import { decryptFlightRecordRow, getRowHmacHex } from "./_flight_crypto.js";
import { createD1Session, jsonWithSession } from "./_d1session.js";

function csvEscape(value) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return '"' + stringValue.replaceAll('"', '""') + '"';
}

function buildCsv(rows, columns) {
  const header = columns.map((column) => csvEscape(column.header)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => csvEscape(row[column.key])).join(",")
  );

  return [header, ...body].join("\r\n");
}

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

export async function onRequestGet(context) {
  const d1 = createD1Session(context, "primary");

  try {
    const columns = [
      { key: "record_no", header: "No." },
      { key: "flight_number", header: "flight_number" },
      { key: "aircraft_model", header: "aircraft_model" },
      { key: "flight_type", header: "flight_type" },
      { key: "flight_date", header: "flight_date" },
      { key: "departure_station", header: "departure_station" },
      { key: "departure_terminal", header: "departure_terminal" },
      { key: "departure_time", header: "departure_time" },
      { key: "arrival_station", header: "arrival_station" },
      { key: "arrival_terminal", header: "arrival_terminal" },
      { key: "arrival_time", header: "arrival_time" },
      { key: "arrival_next_day", header: "arrival_next_day" },
      { key: "baggage_no_weight", header: "baggage_no_weight" },
      { key: "additional_fares", header: "additional_fares" },
      { key: "additional_fares_detail", header: "additional_fares_detail" },
      { key: "remarks", header: "remarks" },
      { key: "payload_version", header: "payload_version" },
      { key: "created_at", header: "created_at_UTC" },
      { key: "updated_at", header: "updated_at_UTC" },
      { key: "hmac_value", header: "hmac_value" }
    ];

    const result = await d1.session.prepare(`
      SELECT ${SELECT_COLUMNS}
      FROM flight_records
      ORDER BY COALESCE(record_no, id) ASC
    `).all();

    const rows = [];

    for (const row of result.results || []) {
      const payload = await decryptFlightRecordRow(row, context.env);
      rows.push({
        record_no: row.record_no ?? row.id,
        ...payload,
        payload_version: row.payload_version ?? 2,
        created_at: row.created_at,
        updated_at: row.updated_at,
        hmac_value: getRowHmacHex(row)
      });
    }

    const csv = buildCsv(rows, columns);
    const now = new Date();
    const stamp =
      now.getUTCFullYear() +
      String(now.getUTCMonth() + 1).padStart(2, "0") +
      String(now.getUTCDate()).padStart(2, "0") +
      "-" +
      String(now.getUTCHours()).padStart(2, "0") +
      String(now.getUTCMinutes()).padStart(2, "0") +
      String(now.getUTCSeconds()).padStart(2, "0");

    const response = new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=UTF-8",
        "content-disposition": 'attachment; filename="flight-records-' + stamp + '.csv"',
        "cache-control": "no-store"
      }
    });

    return d1.applyBookmark(response);
  } catch (err) {
    return jsonWithSession({ ok: false, error: err.message }, 500, d1);
  }
}

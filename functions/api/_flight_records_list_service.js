import {
  decryptFlightRecordRow,
  getRowHmacHex
} from "./_flight_crypto.js";
import {
  decryptCacheRow,
  encryptCachePayload
} from "./_cache_crypto.js";
import {
  FLIGHT_RECORDS_LIST_CACHE_KEY,
  deleteFlightCache,
  getFlightRecordsRevision,
  isFlightCacheRowValid,
  loadFlightCacheRow,
  saveFlightCache
} from "./_flight_cache.js";
import {
  buildFlightStatsSummary,
  STATS_SCHEMA_VERSION
} from "./_flight_stats.js";

const LOAD_BATCH_SIZE = 100;
const FLIGHT_RECORD_SELECT_COLUMNS = `
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

function compareFlightRecords(a, b) {
  const aDate = String(a.flight_date || "");
  const bDate = String(b.flight_date || "");

  if (aDate !== bDate) return aDate > bDate ? -1 : 1;

  const aNo = Number(a.record_no) || 0;
  const bNo = Number(b.record_no) || 0;
  if (aNo !== bNo) return bNo - aNo;

  const aId = Number(a.id) || 0;
  const bId = Number(b.id) || 0;
  return bId - aId;
}

function buildListRecord(row, payload) {
  return {
    id: row.id,
    record_no: row.record_no ?? row.id,
    flight_number: payload.flight_number ?? "",
    aircraft_model: payload.aircraft_model ?? "",
    flight_type: payload.flight_type ?? "",
    flight_date: payload.flight_date ?? "",
    departure_station: payload.departure_station ?? "",
    departure_terminal: payload.departure_terminal ?? "",
    departure_time: payload.departure_time ?? "",
    arrival_station: payload.arrival_station ?? "",
    arrival_terminal: payload.arrival_terminal ?? "",
    arrival_time: payload.arrival_time ?? "",
    arrival_next_day: payload.arrival_next_day ?? "No",
    baggage_no_weight: payload.baggage_no_weight ?? "",
    additional_fares: payload.additional_fares ?? "No",
    additional_fares_detail: payload.additional_fares_detail ?? "",
    hmac_value: getRowHmacHex(row),
    payload_version: row.payload_version ?? 2,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? ""
  };
}

async function loadEncryptedRows(session) {
  const rows = [];
  let beforeId = null;

  while (true) {
    const statement = beforeId
      ? session.prepare(`
          SELECT ${FLIGHT_RECORD_SELECT_COLUMNS}
          FROM flight_records
          WHERE id < ?
          ORDER BY id DESC
          LIMIT ?
        `).bind(beforeId, LOAD_BATCH_SIZE)
      : session.prepare(`
          SELECT ${FLIGHT_RECORD_SELECT_COLUMNS}
          FROM flight_records
          ORDER BY id DESC
          LIMIT ?
        `).bind(LOAD_BATCH_SIZE);

    const result = await statement.all();
    const pageRows = result.results || [];
    if (pageRows.length === 0) break;

    rows.push(...pageRows);
    beforeId = pageRows[pageRows.length - 1].id;
    if (pageRows.length < LOAD_BATCH_SIZE) break;
  }

  return rows;
}

function isListPayloadValid(payload) {
  return Boolean(
    payload &&
    payload.ok === true &&
    Array.isArray(payload.records) &&
    payload.stats_schema_version === STATS_SCHEMA_VERSION &&
    payload.summary &&
    payload.sort &&
    payload.sort.key === "flight_date"
  );
}

async function buildFreshListPayload(session, env, options = {}) {
  const encryptedRows = await loadEncryptedRows(session);
  const records = [];
  const warnings = [];

  for (const row of encryptedRows) {
    try {
      const payload = await decryptFlightRecordRow(row, env);
      records.push(buildListRecord(row, payload));
    } catch (error) {
      warnings.push({
        code: "DECRYPT_FAILED",
        message: `Flight record decryption failed and was excluded from the list: ${error.message}`,
        id: row.id ?? null,
        record_no: row.record_no ?? row.id ?? null
      });
    }
  }

  records.sort(compareFlightRecords);

  return {
    ok: true,
    stats_schema_version: STATS_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    records,
    total_records: records.length,
    summary: buildFlightStatsSummary(records, options.airportIndex || null),
    sort: {
      key: "flight_date",
      order: "desc",
      tie_breaker: "record_no desc, id desc"
    },
    warnings,
    loader: {
      records_total_loaded: encryptedRows.length,
      records_decrypted: records.length,
      decrypt_warning_count: warnings.length
    }
  };
}

function withoutRuntimeCacheInfo(payload) {
  const { cache, ...storable } = payload || {};
  return storable;
}

function withCacheInfo(payload, cacheInfo) {
  return {
    ...payload,
    cache: cacheInfo
  };
}

async function saveListCache(session, env, payload, sourceRevision) {
  const storablePayload = withoutRuntimeCacheInfo(payload);
  const encrypted = await encryptCachePayload(storablePayload, env, {
    cacheKey: FLIGHT_RECORDS_LIST_CACHE_KEY,
    contentEncoding: "gzip"
  });

  await saveFlightCache(session, {
    cache_key: FLIGHT_RECORDS_LIST_CACHE_KEY,
    cache_uuid: encrypted.cache_uuid,
    key_version: encrypted.key_version,
    wrapped_dek: encrypted.wrapped_dek,
    data_iv: encrypted.data_iv,
    ciphertext: encrypted.ciphertext,
    hmac_value: encrypted.hmac_value,
    content_encoding: encrypted.content_encoding,
    source_revision: sourceRevision,
    records_total: Number(storablePayload.total_records || 0),
    records_processed: Array.isArray(storablePayload.records) ? storablePayload.records.length : 0,
    warning_count: Array.isArray(storablePayload.warnings) ? storablePayload.warnings.length : 0,
    generated_at: storablePayload.generated_at || new Date().toISOString()
  });
}

export async function getFlightRecordsListWithSession(session, env, options = {}) {
  const sourceRevision = await getFlightRecordsRevision(session);
  const forceRebuild = options.forceRebuild === true;
  const noSave = options.noSave === true;

  if (!forceRebuild) {
    const cacheRow = await loadFlightCacheRow(session, FLIGHT_RECORDS_LIST_CACHE_KEY);

    if (isFlightCacheRowValid(cacheRow, sourceRevision)) {
      try {
        const decrypted = await decryptCacheRow(cacheRow, env);
        if (!isListPayloadValid(decrypted.payload)) {
          throw new Error("Invalid flight records list cache payload");
        }

        return withCacheInfo(decrypted.payload, {
          hit: true,
          status: "hit",
          cache_key: FLIGHT_RECORDS_LIST_CACHE_KEY,
          source_revision: sourceRevision,
          generated_at: cacheRow.generated_at,
          updated_at: cacheRow.updated_at,
          content_encoding: cacheRow.content_encoding || "gzip"
        });
      } catch (error) {
        if (!noSave) {
          await deleteFlightCache(session, FLIGHT_RECORDS_LIST_CACHE_KEY);
        }

        const freshPayload = await buildFreshListPayload(session, env, options);

        if (noSave) {
          return withCacheInfo(freshPayload, {
            hit: false,
            status: "rebuilt_read_only_after_cache_error",
            cache_key: FLIGHT_RECORDS_LIST_CACHE_KEY,
            source_revision: sourceRevision,
            previous_error: error.message,
            write_policy: "no_save"
          });
        }

        try {
          await saveListCache(session, env, freshPayload, sourceRevision);
          return withCacheInfo(freshPayload, {
            hit: false,
            status: "rebuilt_after_cache_error",
            cache_key: FLIGHT_RECORDS_LIST_CACHE_KEY,
            source_revision: sourceRevision,
            previous_error: error.message,
            content_encoding: "gzip"
          });
        } catch (saveError) {
          return withCacheInfo(freshPayload, {
            hit: false,
            status: "rebuild_ok_save_failed",
            cache_key: FLIGHT_RECORDS_LIST_CACHE_KEY,
            source_revision: sourceRevision,
            previous_error: error.message,
            save_error: saveError.message
          });
        }
      }
    }
  }

  const freshPayload = await buildFreshListPayload(session, env, options);

  if (noSave) {
    return withCacheInfo(freshPayload, {
      hit: false,
      status: forceRebuild ? "force_rebuilt_read_only" : "miss_rebuilt_read_only",
      cache_key: FLIGHT_RECORDS_LIST_CACHE_KEY,
      source_revision: sourceRevision,
      write_policy: "no_save"
    });
  }

  try {
    await saveListCache(session, env, freshPayload, sourceRevision);
    return withCacheInfo(freshPayload, {
      hit: false,
      status: forceRebuild ? "force_rebuilt" : "miss_rebuilt",
      cache_key: FLIGHT_RECORDS_LIST_CACHE_KEY,
      source_revision: sourceRevision,
      content_encoding: "gzip"
    });
  } catch (error) {
    return withCacheInfo(freshPayload, {
      hit: false,
      status: "rebuild_ok_save_failed",
      cache_key: FLIGHT_RECORDS_LIST_CACHE_KEY,
      source_revision: sourceRevision,
      save_error: error.message
    });
  }
}

export function paginateFlightRecords(records, page, limit) {
  const totalRecords = records.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
  const actualPage = Math.min(Math.max(page, 1), totalPages);
  const offset = (actualPage - 1) * limit;

  return {
    records: records.slice(offset, offset + limit),
    pagination: {
      page: actualPage,
      limit,
      total_records: totalRecords,
      total_pages: totalPages,
      has_more: actualPage < totalPages,
      has_prev: actualPage > 1
    }
  };
}

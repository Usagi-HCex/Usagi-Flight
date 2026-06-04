export const FLIGHT_RECORDS_LIST_CACHE_KEY = "flight_records_list_v1";
export const FLIGHT_MAP_SUMMARY_CACHE_KEY = "flight_map_summary_v1";
export const FLIGHT_STATS_SUMMARY_CACHE_KEY = "flight_stats_summary_v1";

function toInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

export async function getFlightRecordsRevision(session) {
  const row = await session.prepare(`
    SELECT value
    FROM system_meta
    WHERE key = 'flight_records_revision'
    LIMIT 1
  `).first();

  return toInteger(row?.value, 0);
}

export async function loadFlightCacheRow(session, cacheKey) {
  const row = await session.prepare(`
    SELECT
      cache_key,
      cache_uuid,
      key_version,
      wrapped_dek,
      data_iv,
      ciphertext,
      hmac_value,
      content_encoding,
      source_revision,
      records_total,
      records_processed,
      warning_count,
      generated_at,
      updated_at
    FROM flight_cache
    WHERE cache_key = ?
    LIMIT 1
  `).bind(cacheKey).first();

  return row || null;
}

export function isFlightCacheRowValid(row, sourceRevision) {
  if (!row) return false;
  if (toInteger(row.source_revision, -1) !== toInteger(sourceRevision, 0)) return false;

  return Boolean(
    row.cache_key &&
    row.cache_uuid &&
    row.key_version &&
    row.wrapped_dek &&
    row.data_iv &&
    row.ciphertext &&
    row.hmac_value
  );
}

export async function saveFlightCache(session, cacheData) {
  await session.prepare(`
    INSERT INTO flight_cache (
      cache_key,
      cache_uuid,
      key_version,
      wrapped_dek,
      data_iv,
      ciphertext,
      hmac_value,
      content_encoding,
      source_revision,
      records_total,
      records_processed,
      warning_count,
      generated_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(cache_key) DO UPDATE SET
      cache_uuid = excluded.cache_uuid,
      key_version = excluded.key_version,
      wrapped_dek = excluded.wrapped_dek,
      data_iv = excluded.data_iv,
      ciphertext = excluded.ciphertext,
      hmac_value = excluded.hmac_value,
      content_encoding = excluded.content_encoding,
      source_revision = excluded.source_revision,
      records_total = excluded.records_total,
      records_processed = excluded.records_processed,
      warning_count = excluded.warning_count,
      generated_at = excluded.generated_at,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    cacheData.cache_key,
    cacheData.cache_uuid,
    cacheData.key_version,
    cacheData.wrapped_dek,
    cacheData.data_iv,
    cacheData.ciphertext,
    cacheData.hmac_value,
    cacheData.content_encoding,
    cacheData.source_revision,
    cacheData.records_total,
    cacheData.records_processed,
    cacheData.warning_count,
    cacheData.generated_at
  ).run();
}

export async function deleteFlightCache(session, cacheKey) {
  await session.prepare(`
    DELETE FROM flight_cache
    WHERE cache_key = ?
  `).bind(cacheKey).run();
}

export async function bumpFlightRecordsRevision(session) {
  await session.prepare(`
    INSERT INTO system_meta (key, value, updated_at)
    VALUES ('flight_records_revision', '1', CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = CAST(value AS INTEGER) + 1,
      updated_at = CURRENT_TIMESTAMP
  `).run();
}

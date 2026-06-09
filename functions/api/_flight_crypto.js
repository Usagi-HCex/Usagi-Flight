const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const LEGACY_FLIGHT_RECORD_FIELDS = [
  "flight_number",
  "aircraft_model",
  "flight_type",
  "flight_date",
  "departure_station",
  "departure_terminal",
  "departure_time",
  "arrival_station",
  "arrival_terminal",
  "arrival_time",
  "baggage_no_weight",
  "remarks"
];

export const FLIGHT_RECORD_FIELDS = [
  "flight_number",
  "aircraft_model",
  "flight_type",
  "flight_date",
  "departure_station",
  "departure_terminal",
  "departure_time",
  "arrival_station",
  "arrival_terminal",
  "arrival_time",
  "arrival_next_day",
  "baggage_no_weight",
  "additional_fares",
  "additional_fares_detail",
  "remarks"
];

const UPPERCASE_FIELDS = new Set([
  "flight_number",
  "aircraft_model",
  "departure_station",
  "arrival_station",
  "baggage_no_weight"
]);

const YES_NO_FIELDS = new Set([
  "arrival_next_day",
  "additional_fares"
]);

function base64ToBytes(base64) {
  const binary = atob(String(base64 || ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToHex(bytes) {
  const array = binaryValueToBytes(bytes);
  return Array.from(array).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex) {
  const text = String(hex || "").trim();
  if (!/^[0-9a-fA-F]*$/.test(text) || text.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }
  const bytes = new Uint8Array(text.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(text.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function binaryValueToBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (Array.isArray(value)) return new Uint8Array(value);
  throw new Error("Unsupported binary value");
}

function hasBinaryValue(value) {
  if (value === null || value === undefined) return false;
  if (value instanceof ArrayBuffer) return value.byteLength > 0;
  if (ArrayBuffer.isView(value)) return value.byteLength > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function requireBlobField(row, fieldName) {
  const value = row?.[fieldName];
  if (!hasBinaryValue(value)) throw new Error(`Missing BLOB field: ${fieldName}`);
  return binaryValueToBytes(value);
}

function normalizeKeyVersion(keyVersion) {
  return String(keyVersion || "v1").trim();
}

function secretNameForKeyVersion(keyVersion) {
  return `KEK_${normalizeKeyVersion(keyVersion).toUpperCase()}_B64`;
}

function getActiveKeyVersion(env) {
  return normalizeKeyVersion(env.ACTIVE_KEK_VERSION || "v1");
}

function getAad(recordUuid, keyVersion) {
  return textEncoder.encode(`flight_records:${recordUuid}:${keyVersion}`);
}

async function importKekFromEnv(env, keyVersion) {
  const secretName = secretNameForKeyVersion(keyVersion);
  const keyBase64 = env[secretName];
  if (!keyBase64) throw new Error(`Missing KEK secret: ${secretName}`);
  return crypto.subtle.importKey("raw", base64ToBytes(keyBase64), { name: "AES-KW" }, false, ["wrapKey", "unwrapKey"]);
}

async function importHmacKeyFromEnv(env) {
  const secret = env.HMAC_SECRET;
  if (!secret) throw new Error("Missing HMAC_SECRET");
  return crypto.subtle.importKey("raw", textEncoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export function getRowHmacHex(row) {
  if (!hasBinaryValue(row?.hmac_value_blob)) throw new Error("Missing BLOB field: hmac_value_blob");
  return bytesToHex(row.hmac_value_blob);
}

function splitStationAndTerminal(stationValue, terminalValue) {
  const terminal = String(terminalValue ?? "").trim();
  const station = String(stationValue ?? "").trim();

  if (!station || terminal) {
    return { station, terminal };
  }

  let match = station.match(/^([A-Za-z0-9]{3,4})[\s/_-]+(.+)$/);
  if (match) {
    return {
      station: match[1].toUpperCase(),
      terminal: match[2].trim()
    };
  }

  match = station.match(/^([A-Za-z0-9]{3})([0-9A-Za-z].*)$/);
  if (match && !/^[A-Za-z0-9]{4}$/.test(station)) {
    return {
      station: match[1].toUpperCase(),
      terminal: match[2].trim()
    };
  }

  return { station, terminal };
}

function normalizeYesNo(value) {
  const text = String(value ?? "").trim();
  if (!text) return "No";
  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  if (["yes", "y", "true", "1", "+1", "+1 day", "next day"].includes(normalized)) return "Yes";
  return "No";
}

export function sanitizeFlightPayload(input) {
  const output = {};
  const hasExplicitAdditionalFares = input?.additional_fares !== null &&
    input?.additional_fares !== undefined &&
    String(input.additional_fares).trim() !== "";

  for (const field of FLIGHT_RECORD_FIELDS) {
    const value = input?.[field];
    let normalized = value === null || value === undefined ? "" : String(value).trim();
    if (UPPERCASE_FIELDS.has(field)) normalized = normalized.toUpperCase();
    if (YES_NO_FIELDS.has(field)) normalized = normalizeYesNo(normalized);
    output[field] = normalized;
  }

  const departure = splitStationAndTerminal(output.departure_station, output.departure_terminal);
  output.departure_station = departure.station.toUpperCase();
  output.departure_terminal = departure.terminal;

  const arrival = splitStationAndTerminal(output.arrival_station, output.arrival_terminal);
  output.arrival_station = arrival.station.toUpperCase();
  output.arrival_terminal = arrival.terminal;

  output.arrival_next_day = normalizeYesNo(output.arrival_next_day);
  if (!output.baggage_no_weight || output.baggage_no_weight.toUpperCase() === "NO") output.baggage_no_weight = "No";
  if (!hasExplicitAdditionalFares && output.additional_fares_detail) {
    output.additional_fares = "Yes";
  } else {
    output.additional_fares = normalizeYesNo(output.additional_fares);
  }
  if (output.additional_fares !== "Yes") output.additional_fares_detail = "";

  return output;
}

function canonicalizeFlightPayloadFields(input, fields) {
  const payload = sanitizeFlightPayload(input);
  const ordered = {};
  for (const field of fields) ordered[field] = payload[field];
  return JSON.stringify(ordered);
}

export function canonicalizeFlightPayload(input) {
  return canonicalizeFlightPayloadFields(input, FLIGHT_RECORD_FIELDS);
}

async function calculateFlightHmacForFields(inputPayload, env, fields) {
  const key = await importHmacKeyFromEnv(env);
  const canonical = canonicalizeFlightPayloadFields(inputPayload, fields);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(canonical));
  return bytesToHex(new Uint8Array(signature));
}

export async function calculateFlightHmac(inputPayload, env) {
  return calculateFlightHmacForFields(inputPayload, env, FLIGHT_RECORD_FIELDS);
}

export async function calculateLegacyFlightHmac(inputPayload, env) {
  return calculateFlightHmacForFields(inputPayload, env, LEGACY_FLIGHT_RECORD_FIELDS);
}

export async function encryptFlightPayload(inputPayload, env, options = {}) {
  const payload = sanitizeFlightPayload(inputPayload);
  const hmacValue = await calculateFlightHmac(payload, env);
  const hmacValueBlob = hexToBytes(hmacValue);

  const keyVersion = getActiveKeyVersion(env);
  const kek = await importKekFromEnv(env, keyVersion);
  const recordUuid = options.recordUuid || crypto.randomUUID();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = getAad(recordUuid, keyVersion);

  const dek = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const plaintext = textEncoder.encode(JSON.stringify(payload));
  const ciphertextBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, dek, plaintext);
  const wrappedDekBuffer = await crypto.subtle.wrapKey("raw", dek, kek, { name: "AES-KW" });

  return {
    record_uuid: recordUuid,
    key_version: keyVersion,
    wrapped_dek: new Uint8Array(wrappedDekBuffer),
    data_iv: iv,
    ciphertext: new Uint8Array(ciphertextBuffer),
    hmac_value_blob: hmacValueBlob,
    hmac_value: hmacValue
  };
}

async function decryptBlobFlightRecordRow(row, env, keyVersion) {
  const kek = await importKekFromEnv(env, keyVersion);
  const wrappedDekBytes = requireBlobField(row, "wrapped_dek");
  const ivBytes = requireBlobField(row, "data_iv");
  const ciphertextBytes = requireBlobField(row, "ciphertext");

  const dek = await crypto.subtle.unwrapKey(
    "raw",
    wrappedDekBytes,
    kek,
    { name: "AES-KW" },
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const aad = getAad(row.record_uuid, keyVersion);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes, additionalData: aad }, dek, ciphertextBytes);
  return sanitizeFlightPayload(JSON.parse(textDecoder.decode(plaintext)));
}

export async function decryptFlightRecordRow(row, env) {
  if (!row) throw new Error("Flight record row is empty");
  const keyVersion = normalizeKeyVersion(row.key_version);

  if (!hasBinaryValue(row.wrapped_dek) || !hasBinaryValue(row.data_iv) || !hasBinaryValue(row.ciphertext)) {
    throw new Error("Flight record BLOB ciphertext is missing");
  }

  return decryptBlobFlightRecordRow(row, env, keyVersion);
}

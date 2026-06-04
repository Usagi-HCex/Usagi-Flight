const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function base64ToBytes(base64) {
  const binary = atob(String(base64 || ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToHex(bytes) {
  const array = binaryValueToBytes(bytes);
  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
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

function getAad(cacheKey, cacheUuid, keyVersion) {
  return textEncoder.encode(`flight_cache:${cacheKey}:${cacheUuid}:${keyVersion}`);
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

async function gzipBytes(bytes) {
  if (typeof CompressionStream !== "function") {
    throw new Error("CompressionStream is not available in this runtime");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzipBytes(bytes) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("DecompressionStream is not available in this runtime");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function encodePayload(payload, contentEncoding) {
  const jsonBytes = textEncoder.encode(JSON.stringify(payload));
  if (contentEncoding === "gzip") return gzipBytes(jsonBytes);
  if (contentEncoding === "identity" || contentEncoding === "json") return jsonBytes;
  throw new Error(`Unsupported cache content encoding: ${contentEncoding}`);
}

async function decodePayload(bytes, contentEncoding) {
  let jsonBytes;
  if (contentEncoding === "gzip") {
    jsonBytes = await gunzipBytes(bytes);
  } else if (contentEncoding === "identity" || contentEncoding === "json") {
    jsonBytes = bytes;
  } else {
    throw new Error(`Unsupported cache content encoding: ${contentEncoding}`);
  }
  return JSON.parse(textDecoder.decode(jsonBytes));
}

async function calculateCacheHmac(cacheKey, cacheUuid, contentEncoding, payloadBytes, env) {
  const key = await importHmacKeyFromEnv(env);
  const prefix = textEncoder.encode(`${cacheKey}:${cacheUuid}:${contentEncoding}:`);
  const bytes = new Uint8Array(prefix.byteLength + payloadBytes.byteLength);
  bytes.set(prefix, 0);
  bytes.set(payloadBytes, prefix.byteLength);
  const signature = await crypto.subtle.sign("HMAC", key, bytes);
  return bytesToHex(new Uint8Array(signature));
}

function safeEqualHex(a, b) {
  const left = String(a || "").trim().toLowerCase();
  const right = String(b || "").trim().toLowerCase();
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

export async function encryptCachePayload(payload, env, options = {}) {
  const cacheKey = String(options.cacheKey || "").trim();
  if (!cacheKey) throw new Error("cacheKey is required");

  const contentEncoding = options.contentEncoding || "gzip";
  const cacheUuid = options.cacheUuid || crypto.randomUUID();
  const payloadBytes = await encodePayload(payload, contentEncoding);
  const hmacHex = await calculateCacheHmac(cacheKey, cacheUuid, contentEncoding, payloadBytes, env);

  const keyVersion = getActiveKeyVersion(env);
  const kek = await importKekFromEnv(env, keyVersion);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = getAad(cacheKey, cacheUuid, keyVersion);

  const dek = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const ciphertextBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, dek, payloadBytes);
  const wrappedDekBuffer = await crypto.subtle.wrapKey("raw", dek, kek, { name: "AES-KW" });

  return {
    cache_key: cacheKey,
    cache_uuid: cacheUuid,
    key_version: keyVersion,
    wrapped_dek: new Uint8Array(wrappedDekBuffer),
    data_iv: iv,
    ciphertext: new Uint8Array(ciphertextBuffer),
    hmac_value: hexToBytes(hmacHex),
    hmac_hex: hmacHex,
    content_encoding: contentEncoding
  };
}

export async function decryptCacheRow(row, env) {
  if (!row) throw new Error("Cache row is empty");

  const cacheKey = String(row.cache_key || "").trim();
  const cacheUuid = String(row.cache_uuid || "").trim();
  const keyVersion = normalizeKeyVersion(row.key_version);
  const contentEncoding = row.content_encoding || "gzip";

  if (!cacheKey || !cacheUuid) throw new Error("Cache key or uuid is missing");

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

  const aad = getAad(cacheKey, cacheUuid, keyVersion);
  const payloadBytes = new Uint8Array(await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes, additionalData: aad },
    dek,
    ciphertextBytes
  ));

  if (hasBinaryValue(row.hmac_value)) {
    const expected = bytesToHex(row.hmac_value);
    const actual = await calculateCacheHmac(cacheKey, cacheUuid, contentEncoding, payloadBytes, env);
    if (!safeEqualHex(expected, actual)) throw new Error("Cache HMAC verification failed");
  }

  return {
    payload: await decodePayload(payloadBytes, contentEncoding),
    content_encoding: contentEncoding
  };
}

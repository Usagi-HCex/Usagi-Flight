const mobileFormMode = document.body.dataset.mobileFormMode || "add";
const mobileFlightForm = document.getElementById("mobileFlightForm");
const mobileSubmitBtn = document.getElementById("mobileSubmitBtn");
const mobileFormStatus = document.getElementById("mobileFormStatus");
const mobileBcbpStatus = document.getElementById("mobileBcbpStatus");
const mobileBcbpRaw = document.getElementById("mobileBcbpRaw");
const mobileBcbpLegPanel = document.getElementById("mobileBcbpLegPanel");
const mobileBcbpLegSelect = document.getElementById("mobileBcbpLegSelect");
const mobileApplyLegBtn = document.getElementById("mobileApplyLegBtn");
const mobileParseBcbpBtn = document.getElementById("mobileParseBcbpBtn");
const mobileCameraScanBtn = document.getElementById("mobileCameraScanBtn");
const mobileStopScanBtn = document.getElementById("mobileStopScanBtn");
const mobileCameraPanel = document.getElementById("mobileCameraPanel");
const mobileBarcodeVideo = document.getElementById("mobileBarcodeVideo");
const mobileBarcodeImage = document.getElementById("mobileBarcodeImage");
const baggageStatus = document.getElementById("baggage_status");
const baggageDetail = document.getElementById("baggage_no_weight");
const mobileViewLink = document.getElementById("mobileViewLink");

const BCBP_HEADER_LENGTH = 23;
const BCBP_MANDATORY_LEG_LENGTH = 35;
const BCBP_LENGTH_FIELD_SIZE = 2;
const BCBP_BARCODE_FORMATS = ["aztec", "pdf417", "qr_code"];
const BCBP_CAMERA_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
};
const REGIONAL_COUNTRIES = new Set(["CN", "HK", "MO", "TW"]);

let currentRecordId = null;
let lastParsedBcbp = null;
let airportIndexPromise = null;
let barcodeDetectorPromise = null;
let activeDetector = null;
let zxingReader = null;
let zxingControls = null;
let cameraStream = null;
let cameraFrameId = 0;
let cameraDetecting = false;
let cameraScanComplete = false;

function escapeMobileFormHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setFormStatus(message, type = "") {
  mobileFormStatus.textContent = message || "";
  mobileFormStatus.className = "mobile-status-text" + (type ? ` ${type}` : "");
}

function setBcbpStatus(message, type = "") {
  mobileBcbpStatus.textContent = message || "";
  mobileBcbpStatus.className = "mobile-form-chip" + (type ? ` ${type}` : "");
}

function setField(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value == null ? "" : String(value);
}

function fieldValue(id) {
  return String(document.getElementById(id)?.value || "").trim();
}

function upper(input) {
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.value = input.value.toUpperCase();
  try {
    input.setSelectionRange(start, end);
  } catch (error) {}
}

function updateBaggageState() {
  const enabled = baggageStatus.value === "Yes";
  baggageDetail.disabled = !enabled;
  baggageDetail.required = enabled;
  if (!enabled) baggageDetail.value = "";
}

function normalizeBcbpText(value) {
  const text = String(value || "").replace(/[\r\n\t]/g, "").trim();
  const start = text.indexOf("M");
  return start > 0 ? text.slice(start) : text;
}

function fixed(text, offset, length) {
  return text.slice(offset, offset + length);
}

function cleanCode(value) {
  return String(value || "").replace(/\s+/g, "").trim().toUpperCase();
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseHexLength(value) {
  const text = cleanCode(value);
  return /^[0-9A-F]{2}$/.test(text) ? Number.parseInt(text, 16) : null;
}

function daysInYear(year) {
  return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromJulianDay(value) {
  const day = Number(String(value || "").trim());
  if (!Number.isInteger(day) || day < 1 || day > 366) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const candidates = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]
    .filter((year) => day <= daysInYear(year))
    .map((year) => new Date(year, 0, day));
  if (!candidates.length) return "";
  candidates.sort((a, b) => Math.abs(a - today) - Math.abs(b - today));
  return formatLocalDate(candidates[0]);
}

function normalizeFlightNumber(carrier, flightNumber) {
  const designator = cleanCode(carrier);
  let number = cleanCode(flightNumber);
  if (/^0\d{4}$/.test(number)) number = number.slice(1);
  return `${designator}${number}`.toUpperCase();
}

function normalizeSeat(value) {
  const seat = cleanCode(value);
  const match = seat.match(/^0*([1-9]\d{0,2}[A-Z])$/);
  if (match) return match[1];
  return seat && !/^0+$/.test(seat) ? seat : "";
}

function parseBcbp(rawValue) {
  const data = normalizeBcbpText(rawValue);
  if (!data) throw new Error("BCBP data is empty");
  if (data[0] !== "M") throw new Error("Unsupported BCBP format");

  const legCount = Number(data[1]);
  if (!Number.isInteger(legCount) || legCount < 1) throw new Error("Invalid BCBP segment count");

  const legs = [];
  let offset = BCBP_HEADER_LENGTH;
  for (let index = 0; index < legCount; index += 1) {
    if (data.length < offset + BCBP_MANDATORY_LEG_LENGTH) break;
    const pnr = fixed(data, offset, 7);
    const from = fixed(data, offset + 7, 3);
    const to = fixed(data, offset + 10, 3);
    const carrier = fixed(data, offset + 13, 3);
    const flight = fixed(data, offset + 16, 5);
    const julianDay = fixed(data, offset + 21, 3);
    const cabin = fixed(data, offset + 24, 1);
    const seat = fixed(data, offset + 25, 4);
    const sequence = fixed(data, offset + 29, 5);
    const passengerStatus = fixed(data, offset + 34, 1);
    const variableFieldSize = parseHexLength(fixed(data, offset + BCBP_MANDATORY_LEG_LENGTH, BCBP_LENGTH_FIELD_SIZE));

    legs.push({
      index,
      pnr: cleanText(pnr),
      from: cleanCode(from),
      to: cleanCode(to),
      carrier: cleanCode(carrier),
      flightField: cleanCode(flight),
      flightNumber: normalizeFlightNumber(carrier, flight),
      julianDay: cleanCode(julianDay),
      flightDate: dateFromJulianDay(julianDay),
      cabin: cleanText(cabin),
      seat: normalizeSeat(seat),
      sequence: cleanText(sequence),
      passengerStatus: cleanText(passengerStatus),
      variableFieldSize: variableFieldSize ?? 0
    });

    offset += BCBP_MANDATORY_LEG_LENGTH;
    if (variableFieldSize != null && data.length >= offset + BCBP_LENGTH_FIELD_SIZE) {
      offset += BCBP_LENGTH_FIELD_SIZE + Math.min(variableFieldSize, Math.max(0, data.length - offset - BCBP_LENGTH_FIELD_SIZE));
    }
  }

  if (legs.length < 1) throw new Error("BCBP mandatory segment data is incomplete");

  return {
    format: "M",
    legCount,
    readableLegs: legs.length,
    passengerName: cleanText(fixed(data, 2, 20)),
    electronicTicketIndicator: cleanText(fixed(data, 22, 1)),
    legs
  };
}

function legLabel(leg) {
  const date = leg.flightDate || "Date";
  const flight = leg.flightNumber || "Flight";
  const route = [leg.from || "---", leg.to || "---"].join(" ➔ ");
  return `${date} ${flight} ${route}`;
}

async function readStaticJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) return null;
  const text = await response.text();
  const trimmed = text.trimStart();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function loadAirportIndex() {
  if (!airportIndexPromise) {
    airportIndexPromise = readStaticJson(new URL("../assets/data/airport-index.json", window.location.href).toString());
  }
  return airportIndexPromise;
}

async function inferFlightType(fromCode, toCode) {
  const index = await loadAirportIndex();
  const fromCountry = cleanCode(index?.airports?.[cleanCode(fromCode)]?.iso_country);
  const toCountry = cleanCode(index?.airports?.[cleanCode(toCode)]?.iso_country);
  if (!fromCountry || !toCountry) return "";
  if (fromCountry === toCountry) return "Domestic";
  if (REGIONAL_COUNTRIES.has(fromCountry) && REGIONAL_COUNTRIES.has(toCountry)) return "Regional";
  return "International";
}

function setParsedLegOptions(parsed) {
  lastParsedBcbp = parsed;
  mobileBcbpLegSelect.innerHTML = parsed.legs
    .map((leg) => `<option value="${leg.index}">${escapeMobileFormHtml(legLabel(leg))}</option>`)
    .join("");
  mobileBcbpLegPanel.hidden = parsed.legs.length <= 1;
}

function appendBcbpRemarks(leg) {
  const detail = [];
  if (leg.seat) detail.push(`Seat ${leg.seat}`);
  if (leg.cabin) detail.push(`Cabin ${leg.cabin}`);
  if (leg.passengerStatus) detail.push(`Status ${leg.passengerStatus}`);
  if (!detail.length) return;
  const line = `BCBP: ${detail.join(" / ")}`;
  const remarks = document.getElementById("remarks");
  if (!remarks || remarks.value.includes(line)) return;
  remarks.value = [remarks.value.trim(), line].filter(Boolean).join("\n");
}

async function applyBcbpLeg(leg) {
  if (!leg) return;
  if (leg.flightNumber) setField("flight_number", leg.flightNumber);
  if (leg.flightDate) setField("flight_date", leg.flightDate);
  if (leg.from) setField("departure_station", leg.from);
  if (leg.to) setField("arrival_station", leg.to);
  appendBcbpRemarks(leg);

  const inferredType = await inferFlightType(leg.from, leg.to).catch(() => "");
  if (inferredType) setField("flight_type", inferredType);

  setBcbpStatus("Applied", "success");
  setFormStatus("Boarding pass data applied.", "success");
}

async function parseAndApplyBcbp() {
  try {
    const parsed = parseBcbp(mobileBcbpRaw.value);
    setParsedLegOptions(parsed);
    await applyBcbpLeg(parsed.legs[0]);
  } catch (error) {
    setBcbpStatus("Unreadable", "error");
    setFormStatus(error.message, "error");
  }
}

async function getBarcodeDetector() {
  if (barcodeDetectorPromise) return barcodeDetectorPromise;
  barcodeDetectorPromise = (async () => {
    if (!("BarcodeDetector" in window)) throw new Error("Barcode scanner unavailable");
    let formats = BCBP_BARCODE_FORMATS;
    if (typeof BarcodeDetector.getSupportedFormats === "function") {
      const supported = await BarcodeDetector.getSupportedFormats();
      formats = BCBP_BARCODE_FORMATS.filter((format) => supported.includes(format));
    }
    if (!formats.length) throw new Error("BCBP barcode formats unavailable");
    return new BarcodeDetector({ formats });
  })();
  return barcodeDetectorPromise;
}

function getZxingReader() {
  if (zxingReader) return zxingReader;
  const zxing = window.ZXingBrowser;
  if (!zxing || typeof zxing.BrowserMultiFormatReader !== "function") return null;
  zxingReader = new zxing.BrowserMultiFormatReader();
  return zxingReader;
}

function barcodeTextFromResult(result) {
  return String(result?.rawValue || result?.getText?.() || result?.text || "").trim();
}

async function detectNativeBarcode(source) {
  const detector = activeDetector || await getBarcodeDetector();
  const results = await detector.detect(source);
  const rawValue = barcodeTextFromResult(results?.[0]);
  if (!rawValue) throw new Error("No barcode detected");
  return rawValue;
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be loaded"));
    };
    image.src = url;
  });
}

async function detectZxingImage(file) {
  const reader = getZxingReader();
  if (!reader) throw new Error("Barcode scanner unavailable");
  const { image, url } = await loadImageElement(file);
  try {
    const result = await reader.decodeFromImageElement(image);
    const rawValue = barcodeTextFromResult(result);
    if (!rawValue) throw new Error("No barcode detected");
    return rawValue;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function detectFromImage(file) {
  if (!file) return;
  setBcbpStatus("Reading");
  try {
    let rawValue = "";
    let nativeError = null;

    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(file);
        try {
          rawValue = await detectNativeBarcode(bitmap);
        } finally {
          bitmap.close?.();
        }
      } catch (error) {
        nativeError = error;
      }
    }

    if (!rawValue) {
      try {
        rawValue = await detectZxingImage(file);
      } catch (error) {
        throw nativeError && !getZxingReader() ? nativeError : error;
      }
    }

    mobileBcbpRaw.value = rawValue;
    await parseAndApplyBcbp();
  } catch (error) {
    setBcbpStatus(/unavailable/i.test(error.message) ? "Unavailable" : "Unreadable", "error");
    setFormStatus(error.message, "error");
  } finally {
    mobileBarcodeImage.value = "";
  }
}

function stopCameraScan() {
  if (cameraFrameId) cancelAnimationFrame(cameraFrameId);
  cameraFrameId = 0;
  cameraDetecting = false;
  if (zxingControls) {
    try {
      zxingControls.stop();
    } catch (error) {}
  }
  zxingControls = null;
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }
  cameraStream = null;
  activeDetector = null;
  mobileBarcodeVideo.srcObject = null;
  mobileCameraPanel.hidden = true;
}

async function acceptCameraBarcode(rawValue) {
  if (!rawValue || cameraScanComplete) return;
  cameraScanComplete = true;
  mobileBcbpRaw.value = rawValue;
  stopCameraScan();
  await parseAndApplyBcbp();
}

function scanCameraFrame() {
  if (!cameraStream) return;
  if (!cameraDetecting && mobileBarcodeVideo.readyState >= 2) {
    cameraDetecting = true;
    detectNativeBarcode(mobileBarcodeVideo)
      .then(acceptCameraBarcode)
      .catch(() => {})
      .finally(() => {
        cameraDetecting = false;
      });
  }
  if (cameraStream) cameraFrameId = requestAnimationFrame(scanCameraFrame);
}

async function startCameraScan() {
  try {
    stopCameraScan();
    cameraScanComplete = false;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
    const reader = getZxingReader();
    activeDetector = reader ? null : await getBarcodeDetector().catch(() => null);
    if (!reader && !activeDetector) throw new Error("Barcode scanner unavailable");

    mobileCameraPanel.hidden = false;
    setBcbpStatus("Scanning");

    if (activeDetector) {
      cameraStream = await navigator.mediaDevices.getUserMedia(BCBP_CAMERA_CONSTRAINTS);
      mobileBarcodeVideo.srcObject = cameraStream;
      await mobileBarcodeVideo.play();
      scanCameraFrame();
      return;
    }

    zxingControls = await reader.decodeFromConstraints(
      BCBP_CAMERA_CONSTRAINTS,
      mobileBarcodeVideo,
      (result) => {
        const rawValue = barcodeTextFromResult(result);
        if (rawValue) acceptCameraBarcode(rawValue).catch((error) => {
          setBcbpStatus("Unreadable", "error");
          setFormStatus(error.message, "error");
        });
      }
    );
    cameraStream = typeof MediaStream !== "undefined" && mobileBarcodeVideo.srcObject instanceof MediaStream
      ? mobileBarcodeVideo.srcObject
      : null;
  } catch (error) {
    stopCameraScan();
    setBcbpStatus("Unavailable", "error");
    setFormStatus(error.message, "error");
  }
}

function getPayload() {
  return {
    flight_number: fieldValue("flight_number").toUpperCase(),
    aircraft_model: fieldValue("aircraft_model").toUpperCase(),
    flight_type: fieldValue("flight_type"),
    flight_date: fieldValue("flight_date"),
    departure_station: fieldValue("departure_station").toUpperCase(),
    departure_terminal: fieldValue("departure_terminal"),
    departure_time: fieldValue("departure_time"),
    arrival_station: fieldValue("arrival_station").toUpperCase(),
    arrival_terminal: fieldValue("arrival_terminal"),
    arrival_time: fieldValue("arrival_time"),
    baggage_no_weight: baggageStatus.value === "Yes" ? fieldValue("baggage_no_weight").toUpperCase() : "No",
    remarks: fieldValue("remarks")
  };
}

function validatePayload(payload) {
  if (!payload.flight_number) return "Flight Number is required.";
  if (!payload.flight_date) return "Date is required.";
  if (!payload.departure_station) return "Departure Station is required.";
  if (!payload.arrival_station) return "Arrival Station is required.";
  if (baggageStatus.value === "Yes" && !payload.baggage_no_weight) return "Baggage Detail is required.";
  return "";
}

function fillForm(record) {
  setField("flight_number", record.flight_number);
  setField("aircraft_model", record.aircraft_model);
  setField("flight_type", record.flight_type);
  setField("flight_date", record.flight_date);
  setField("departure_station", record.departure_station);
  setField("departure_terminal", record.departure_terminal);
  setField("departure_time", record.departure_time);
  setField("arrival_station", record.arrival_station);
  setField("arrival_terminal", record.arrival_terminal);
  setField("arrival_time", record.arrival_time);
  setField("remarks", record.remarks);

  const baggage = String(record.baggage_no_weight || "").trim();
  if (baggage && baggage !== "No") {
    baggageStatus.value = "Yes";
    baggageDetail.disabled = false;
    baggageDetail.required = true;
    baggageDetail.value = baggage;
  } else {
    baggageStatus.value = "No";
    baggageDetail.value = "";
  }
  updateBaggageState();
}

function getRecordId() {
  const id = Number(new URLSearchParams(window.location.search).get("id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid record id");
  return id;
}

async function loadRecord() {
  if (mobileFormMode !== "edit") return;
  try {
    currentRecordId = getRecordId();
    if (mobileViewLink) mobileViewLink.href = `./flight.html?id=${encodeURIComponent(currentRecordId)}`;
    setFormStatus("Loading flight record...");
    const url = new URL("../api/flight", window.location.href);
    url.searchParams.set("id", String(currentRecordId));
    const response = await fetch(url.toString(), { headers: { accept: "application/json" } });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) throw new Error(result?.error || `HTTP ${response.status}`);
    fillForm(result.record || {});
    setFormStatus("Flight record loaded.", "success");
  } catch (error) {
    setFormStatus("Failed: " + error.message, "error");
    mobileSubmitBtn.disabled = true;
    if (mobileViewLink) mobileViewLink.href = "./flights.html";
  }
}

async function submitForm(event) {
  event.preventDefault();
  const payload = getPayload();
  const validationError = validatePayload(payload);
  if (validationError) {
    setFormStatus(validationError, "error");
    return;
  }

  mobileSubmitBtn.disabled = true;
  setFormStatus(mobileFormMode === "edit" ? "Updating flight record..." : "Saving flight record...");
  try {
    const url = mobileFormMode === "edit"
      ? new URL("../api/flight", window.location.href)
      : new URL("../api/flights", window.location.href);
    if (mobileFormMode === "edit") url.searchParams.set("id", String(currentRecordId));

    const response = await fetch(url.toString(), {
      method: mobileFormMode === "edit" ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) throw new Error(result?.error || `HTTP ${response.status}`);

    const id = mobileFormMode === "edit" ? currentRecordId : (result.id || result.record_id);
    setFormStatus(mobileFormMode === "edit" ? "Flight record updated." : "Flight record saved.", "success");
    window.location.href = id ? `./flight.html?id=${encodeURIComponent(id)}` : "./flights.html";
  } catch (error) {
    setFormStatus("Failed: " + error.message, "error");
    mobileSubmitBtn.disabled = false;
  }
}

document.querySelectorAll("[data-uppercase]").forEach((input) => input.addEventListener("input", () => upper(input)));
baggageStatus.addEventListener("change", updateBaggageState);
mobileFlightForm.addEventListener("submit", submitForm);
mobileParseBcbpBtn.addEventListener("click", parseAndApplyBcbp);
mobileApplyLegBtn.addEventListener("click", () => {
  const index = Number(mobileBcbpLegSelect.value || 0);
  applyBcbpLeg(lastParsedBcbp?.legs?.find((leg) => leg.index === index) || lastParsedBcbp?.legs?.[0]);
});
mobileBarcodeImage.addEventListener("change", () => detectFromImage(mobileBarcodeImage.files?.[0] || null));
mobileCameraScanBtn.addEventListener("click", startCameraScan);
mobileStopScanBtn.addEventListener("click", stopCameraScan);
window.addEventListener("pagehide", stopCameraScan);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopCameraScan();
});

updateBaggageState();
loadRecord();

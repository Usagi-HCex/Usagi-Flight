const API_SINGLE_URL = "./api/flight";
const form = document.getElementById("flightForm");
const submitBtn = document.getElementById("submitBtn");
const statusMessage = document.getElementById("statusMessage");
const viewLink = document.getElementById("viewLink");
const baggageStatus = document.getElementById("baggage_status");
const baggageDetail = document.getElementById("baggage_no_weight");
const arrivalNextDay = document.getElementById("arrival_next_day");
const additionalFaresStatus = document.getElementById("additional_fares_status");
const additionalFaresDetail = document.getElementById("additional_fares_detail");

let currentRecordId = null;

function getRecordId() {
  const id = Number(new URLSearchParams(window.location.search).get("id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid record id");
  return id;
}

function setStatus(message, type = "") {
  statusMessage.textContent = message || "";
  statusMessage.className = "status" + (type ? " " + type : "");
}

function setField(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value == null ? "" : String(value);
}

function isYes(value) {
  return String(value || "").trim().toLowerCase() === "yes";
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

function updateAdditionalFaresState() {
  const enabled = additionalFaresStatus.value === "Yes";
  additionalFaresDetail.disabled = !enabled;
  additionalFaresDetail.required = enabled;
  if (!enabled) additionalFaresDetail.value = "";
}

function arrivalTimeText(payload) {
  const time = payload.arrival_time || "-";
  return payload.arrival_next_day === "Yes" && time !== "-" ? `${time} +1 Day` : time;
}

document.querySelectorAll("[data-uppercase]").forEach((input) => input.addEventListener("input", () => upper(input)));
baggageStatus.addEventListener("change", updateBaggageState);
additionalFaresStatus.addEventListener("change", updateAdditionalFaresState);
updateBaggageState();
updateAdditionalFaresState();

function getPayload() {
  return {
    flight_number: document.getElementById("flight_number").value.trim().toUpperCase(),
    aircraft_model: document.getElementById("aircraft_model").value.trim().toUpperCase(),
    flight_type: document.getElementById("flight_type").value.trim(),
    flight_date: document.getElementById("flight_date").value.trim(),
    departure_station: document.getElementById("departure_station").value.trim().toUpperCase(),
    departure_terminal: document.getElementById("departure_terminal").value.trim(),
    departure_time: document.getElementById("departure_time").value.trim(),
    arrival_station: document.getElementById("arrival_station").value.trim().toUpperCase(),
    arrival_terminal: document.getElementById("arrival_terminal").value.trim(),
    arrival_time: document.getElementById("arrival_time").value.trim(),
    arrival_next_day: arrivalNextDay.checked ? "Yes" : "No",
    baggage_no_weight: baggageStatus.value === "Yes" ? baggageDetail.value.trim().toUpperCase() : "No",
    additional_fares: additionalFaresStatus.value,
    additional_fares_detail: additionalFaresStatus.value === "Yes" ? additionalFaresDetail.value.trim() : "",
    remarks: document.getElementById("remarks").value.trim()
  };
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
  if (arrivalNextDay) arrivalNextDay.checked = isYes(record.arrival_next_day);
  setField("remarks", record.remarks);

  const baggage = String(record.baggage_no_weight || "").trim();
  if (baggage && baggage.toLowerCase() !== "no") {
    baggageStatus.value = "Yes";
    baggageDetail.value = baggage;
  } else {
    baggageStatus.value = "No";
    baggageDetail.value = "";
  }

  const hasAdditionalFares = isYes(record.additional_fares) || Boolean(String(record.additional_fares_detail || "").trim());
  additionalFaresStatus.value = hasAdditionalFares ? "Yes" : "No";
  additionalFaresDetail.value = hasAdditionalFares ? String(record.additional_fares_detail || "").trim() : "";
  updateBaggageState();
  updateAdditionalFaresState();
}

function buildConfirmationText(payload) {
  return [
    "Please confirm the updated flight record before saving.",
    "",
    "[Flight Identity]",
    `Flight Number: ${payload.flight_number || "-"}`,
    `Aircraft Model: ${payload.aircraft_model || "-"}`,
    `Flight Type: ${payload.flight_type || "-"}`,
    `Date: ${payload.flight_date || "-"}`,
    "",
    "[Route & Time]",
    `Departure Station: ${payload.departure_station || "-"}`,
    `Departure Terminal: ${payload.departure_terminal || "-"}`,
    `Departure Time: ${payload.departure_time || "-"}`,
    `Arrival Station: ${payload.arrival_station || "-"}`,
    `Arrival Terminal: ${payload.arrival_terminal || "-"}`,
    `Arrival Time: ${arrivalTimeText(payload)}`,
    `Arrival +1 Day: ${payload.arrival_next_day || "No"}`,
    "",
    "[Baggage & Additional Fares]",
    `Baggage: ${payload.baggage_no_weight || "-"}`,
    `Additional Fares: ${payload.additional_fares || "No"}`,
    `Additional Fares Detail: ${payload.additional_fares_detail || "-"}`,
    "",
    "[Remarks]",
    payload.remarks || "-"
  ].join("\n");
}

async function loadRecord() {
  try {
    currentRecordId = getRecordId();
    viewLink.href = `./flight_view.html?id=${encodeURIComponent(currentRecordId)}`;
    setStatus("Loading flight record...");
    const url = new URL(API_SINGLE_URL, window.location.href);
    url.searchParams.set("id", String(currentRecordId));
    const response = await fetch(url.toString(), { headers: { accept: "application/json" } });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) throw new Error(result?.error || `Request failed with status ${response.status}`);
    fillForm(result.record || {});
    setStatus("Flight record loaded.");
  } catch (error) {
    setStatus(`Failed to load flight record: ${error.message}`, "error");
    submitBtn.disabled = true;
    viewLink.href = "./show_flights.html";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");
  const payload = getPayload();
  if (!payload.flight_number) return setStatus("Flight Number is required.", "error");
  if (!payload.flight_date) return setStatus("Date is required.", "error");
  if (!payload.departure_station) return setStatus("Departure Station is required.", "error");
  if (!payload.arrival_station) return setStatus("Arrival Station is required.", "error");
  if (baggageStatus.value === "Yes" && !payload.baggage_no_weight) return setStatus("Baggage Detail is required when Baggage is Yes.", "error");
  if (additionalFaresStatus.value === "Yes" && !payload.additional_fares_detail) return setStatus("Additional Fares Detail is required when Additional Fares is Yes.", "error");
  if (!window.confirm(buildConfirmationText(payload))) return;

  submitBtn.disabled = true;
  setStatus("Updating flight record...");
  try {
    const url = new URL(API_SINGLE_URL, window.location.href);
    url.searchParams.set("id", String(currentRecordId));
    const response = await fetch(url.toString(), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) throw new Error(result?.error || `Request failed with status ${response.status}`);
    setStatus("Flight record updated successfully.", "success");
    window.location.href = `./flight_view.html?id=${encodeURIComponent(currentRecordId)}`;
  } catch (error) {
    setStatus(`Failed to update flight record: ${error.message}`, "error");
    window.alert("Failed to update flight record: " + error.message);
  } finally {
    submitBtn.disabled = false;
  }
});

loadRecord();

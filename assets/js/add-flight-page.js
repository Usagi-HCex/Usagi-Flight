const form = document.getElementById("flightForm");
const submitBtn = document.getElementById("submitBtn");
const statusMessage = document.getElementById("statusMessage");
const baggageStatus = document.getElementById("baggage_status");
const baggageDetail = document.getElementById("baggage_no_weight");
const arrivalNextDay = document.getElementById("arrival_next_day");
const additionalFaresStatus = document.getElementById("additional_fares_status");
const additionalFaresDetail = document.getElementById("additional_fares_detail");

function setStatus(message, type = "") { statusMessage.textContent = message || ""; statusMessage.className = "status" + (type ? " " + type : ""); }
function upper(input) { const s=input.selectionStart,e=input.selectionEnd; input.value=input.value.toUpperCase(); try{input.setSelectionRange(s,e);}catch(_){} }
function updateBaggageState() { const enabled = baggageStatus.value === "Yes"; baggageDetail.disabled = !enabled; baggageDetail.required = enabled; if (!enabled) baggageDetail.value = ""; }
function updateAdditionalFaresState() { const enabled = additionalFaresStatus.value === "Yes"; additionalFaresDetail.disabled = !enabled; additionalFaresDetail.required = enabled; if (!enabled) additionalFaresDetail.value = ""; }
function yesNo(checked) { return checked ? "Yes" : "No"; }
function arrivalTimeText(p) { const time = p.arrival_time || "-"; return p.arrival_next_day === "Yes" && time !== "-" ? `${time} +1 Day` : time; }
document.querySelectorAll("[data-uppercase]").forEach((input) => input.addEventListener("input", () => upper(input)));
baggageStatus.addEventListener("change", updateBaggageState); updateBaggageState();
additionalFaresStatus.addEventListener("change", updateAdditionalFaresState); updateAdditionalFaresState();

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
    arrival_next_day: yesNo(arrivalNextDay.checked),
    baggage_no_weight: baggageStatus.value === "Yes" ? baggageDetail.value.trim().toUpperCase() : "No",
    additional_fares: additionalFaresStatus.value,
    additional_fares_detail: additionalFaresStatus.value === "Yes" ? additionalFaresDetail.value.trim() : "",
    remarks: document.getElementById("remarks").value.trim()
  };
}

function buildConfirmationText(p) {
  return ["Please confirm the flight record before saving.","","[Flight Identity]",`Flight Number: ${p.flight_number || "-"}`,`Aircraft Model: ${p.aircraft_model || "-"}`,`Flight Type: ${p.flight_type || "-"}`,`Date: ${p.flight_date || "-"}`,"","[Route & Time]",`Departure Station: ${p.departure_station || "-"}`,`Departure Terminal: ${p.departure_terminal || "-"}`,`Departure Time: ${p.departure_time || "-"}`,`Arrival Station: ${p.arrival_station || "-"}`,`Arrival Terminal: ${p.arrival_terminal || "-"}`,`Arrival Time: ${arrivalTimeText(p)}`,`Arrival +1 Day: ${p.arrival_next_day || "No"}`,"","[Baggage & Additional Fares]",`Baggage: ${p.baggage_no_weight || "-"}`,`Additional Fares: ${p.additional_fares || "No"}`,`Additional Fares Detail: ${p.additional_fares_detail || "-"}`,"","[Remarks]",p.remarks || "-"].join("\n");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault(); setStatus(""); const payload = getPayload();
  if (!payload.flight_number) return setStatus("Flight Number is required.", "error");
  if (!payload.flight_date) return setStatus("Date is required.", "error");
  if (!payload.departure_station) return setStatus("Departure Station is required.", "error");
  if (!payload.arrival_station) return setStatus("Arrival Station is required.", "error");
  if (baggageStatus.value === "Yes" && !payload.baggage_no_weight) return setStatus("Baggage Detail is required when Baggage is Yes.", "error");
  if (additionalFaresStatus.value === "Yes" && !payload.additional_fares_detail) return setStatus("Additional Fares Detail is required when Additional Fares is Yes.", "error");
  if (!window.confirm(buildConfirmationText(payload))) return;
  submitBtn.disabled = true; setStatus("Saving flight record...");
  try {
    const response = await fetch("./api/flights", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(payload) });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) throw new Error(result?.error || `Request failed with status ${response.status}`);
    setStatus("Flight record saved successfully.", "success");
    const id = result.id || result.record_id;
    window.location.href = id ? `./flight_view.html?id=${encodeURIComponent(id)}` : "./show_flights.html";
  } catch (error) { setStatus(`Failed to save flight record: ${error.message}`, "error"); window.alert(`Failed to save flight record: ${error.message}`); }
  finally { submitBtn.disabled = false; }
});

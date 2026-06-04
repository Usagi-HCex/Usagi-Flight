(function () {
  const DESKTOP_MODE_KEY = "flight-log-desktop-mode";
  const LEGACY_DESKTOP_MODE_KEY = "azurex-flight-desktop-mode";

  const params = new URLSearchParams(window.location.search);
  if (params.get("desktop") === "1") {
    window.sessionStorage.setItem(DESKTOP_MODE_KEY, "1");
    window.sessionStorage.removeItem(LEGACY_DESKTOP_MODE_KEY);
    return;
  }
  if (
    window.sessionStorage.getItem(DESKTOP_MODE_KEY) === "1" ||
    window.sessionStorage.getItem(LEGACY_DESKTOP_MODE_KEY) === "1"
  ) return;

  const isStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  const isTouchPhone = window.matchMedia?.("(pointer: coarse) and (max-width: 920px)")?.matches;
  const isNarrow = window.matchMedia?.("(max-width: 760px)")?.matches;
  if (!isStandalone && !isTouchPhone && !isNarrow) return;

  const fileName = window.location.pathname.split("/").pop() || "index.html";
  const targets = {
    "": "mobile/index.html",
    "index.html": "mobile/index.html",
    "add_flight.html": "mobile/add.html",
    "show_flights.html": "mobile/flights.html",
    "flight_map.html": "mobile/map.html",
    "flight_view.html": "mobile/flight.html",
    "flight_edit.html": "mobile/edit.html"
  };
  const target = targets[fileName];
  if (!target) return;

  const basePath = window.location.pathname.replace(/[^/]*$/, "");
  const next = new URL(basePath + target, window.location.href);
  next.search = window.location.search;
  window.location.replace(next.toString());
})();

function mobileSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateMobileTime() {
  const now = new Date();
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
  mobileSetText("mobileCurrentTime", time);
}

async function updateMobileCacheStatus() {
  try {
    const url = new URL("../api/flights", window.location.href);
    url.searchParams.set("limit", "1");
    url.searchParams.set("page", "1");
    const response = await fetch(url.toString(), { headers: { accept: "application/json" } });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) throw new Error(result?.error || `HTTP ${response.status}`);
    const cache = result.cache || {};
    mobileSetText("mobileCacheStatus", cache.status || "unknown");
    mobileSetText("mobileCacheRevision", cache.source_revision == null ? "-" : `rev.${cache.source_revision}`);
  } catch (error) {
    mobileSetText("mobileCacheStatus", "unavailable");
    mobileSetText("mobileCacheRevision", "-");
    console.warn("Failed to load mobile cache status", error);
  }
}

updateMobileTime();
updateMobileCacheStatus();
setInterval(updateMobileTime, 1000);

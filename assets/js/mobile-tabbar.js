(() => {
  const tabbar = document.querySelector(".mobile-tabbar");
  const lockTabbar = document.body.classList.contains("mobile-map-body");

  if (lockTabbar) {
    tabbar?.classList.remove("is-hidden");
    return;
  }

  let lastScrollY = window.scrollY || 0;
  let lastTouchY = null;

  function showTabbar() {
    if (!tabbar) return;
    tabbar.classList.remove("is-hidden");
  }

  function hideTabbar() {
    if (!tabbar) return;
    tabbar.classList.add("is-hidden");
  }

  function applyDirection(delta) {
    if (delta > 8) hideTabbar();
    if (delta < -3) showTabbar();
  }

  window.addEventListener("scroll", () => {
    const nextY = window.scrollY || 0;
    applyDirection(nextY - lastScrollY);
    if (nextY <= 2) showTabbar();
    lastScrollY = nextY;
  }, { passive: true });

  window.addEventListener("touchstart", (event) => {
    lastTouchY = event.touches?.[0]?.clientY ?? null;
  }, { passive: true });

  window.addEventListener("touchmove", (event) => {
    const y = event.touches?.[0]?.clientY;
    if (!Number.isFinite(y) || !Number.isFinite(lastTouchY)) {
      lastTouchY = y ?? null;
      return;
    }
    applyDirection(lastTouchY - y);
    lastTouchY = y;
  }, { passive: true });

  window.addEventListener("touchend", () => {
    lastTouchY = null;
  }, { passive: true });
})();

(() => {
  if (!document.body.classList.contains("mobile-app")) return;

  const refreshThreshold = 72;
  const maxPullDistance = 116;
  const interactiveSelector = [
    "a",
    "button",
    "input",
    "textarea",
    "select",
    "video",
    "canvas",
    "[role='button']",
    "[data-no-pull-refresh]",
    ".mobile-map-panel",
    ".mobile-camera-panel",
    ".flight-map-canvas"
  ].join(",");

  const indicator = document.createElement("div");
  indicator.className = "mobile-pull-refresh";
  indicator.innerHTML = '<span class="mobile-pull-refresh-ring"></span><strong>Pull to refresh</strong>';
  document.body.appendChild(indicator);

  let startY = null;
  let pullDistance = 0;
  let pulling = false;
  let ready = false;
  let refreshing = false;

  function canStartPull(event) {
    if (refreshing) return false;
    if (window.scrollY > 0) return false;
    if (event.touches?.length !== 1) return false;
    const target = event.target;
    if (target?.closest?.(interactiveSelector)) return false;
    return true;
  }

  function setIndicator(distance, state = "") {
    indicator.style.setProperty("--pull-distance", `${distance}px`);
    indicator.classList.toggle("is-visible", distance > 0 || state === "refreshing");
    indicator.classList.toggle("is-ready", state === "ready");
    indicator.classList.toggle("is-refreshing", state === "refreshing");
    indicator.querySelector("strong").textContent = state === "refreshing"
      ? "Refreshing"
      : state === "ready"
        ? "Release to refresh"
        : "Pull to refresh";
  }

  function resetPull() {
    startY = null;
    pullDistance = 0;
    pulling = false;
    ready = false;
    setIndicator(0);
  }

  window.addEventListener("touchstart", (event) => {
    startY = canStartPull(event) ? event.touches[0].clientY : null;
    pullDistance = 0;
    pulling = false;
    ready = false;
  }, { passive: true });

  window.addEventListener("touchmove", (event) => {
    if (!Number.isFinite(startY)) return;
    const y = event.touches?.[0]?.clientY;
    if (!Number.isFinite(y)) return;

    const delta = y - startY;
    if (delta <= 0) {
      resetPull();
      return;
    }

    if (window.scrollY > 0) return;
    if (delta < 10 && !pulling) return;

    pulling = true;
    event.preventDefault();
    pullDistance = Math.min(maxPullDistance, delta * 0.48);
    ready = pullDistance >= refreshThreshold;
    setIndicator(pullDistance, ready ? "ready" : "");
  }, { passive: false });

  window.addEventListener("touchend", () => {
    if (!pulling) {
      resetPull();
      return;
    }

    if (ready) {
      refreshing = true;
      setIndicator(refreshThreshold, "refreshing");
      setTimeout(() => window.location.reload(), 140);
      return;
    }

    resetPull();
  }, { passive: true });

  window.addEventListener("touchcancel", resetPull, { passive: true });
})();

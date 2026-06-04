(function () {
  if (!("serviceWorker" in navigator)) return;
  if (!/^https?:$/.test(window.location.protocol)) return;

  const scriptUrl = document.currentScript?.src || new URL("/assets/js/pwa.js", window.location.href).href;

  window.addEventListener("load", () => {
    const swUrl = new URL("../../sw.js", scriptUrl);
    const scopeUrl = new URL("../../", scriptUrl);

    navigator.serviceWorker.register(swUrl.href, { scope: scopeUrl.href }).catch((error) => {
      console.warn("PWA registration failed", error);
    });
  });
})();

(function () {
  function installMobileGestureGuards() {
    if (!document.body?.classList.contains("mobile-app")) return;

    let lastTouchEnd = 0;
    document.addEventListener("touchend", (event) => {
      const now = Date.now();
      if (now - lastTouchEnd < 320) event.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installMobileGestureGuards, { once: true });
  } else {
    installMobileGestureGuards();
  }
})();

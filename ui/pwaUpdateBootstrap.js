(() => {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  if (window.location.protocol !== "https:") return;

  window.addEventListener("load", async () => {
    try {
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      const registration = await navigator.serviceWorker.register("./service-worker.js", {
        updateViaCache: "none",
      });
      await registration.update();
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    } catch {
      // The application remains usable even if update delivery is unavailable.
    }
  }, { once: true });
})();

const BOOT_RECOVERY_TIMEOUT_MS = 8000;
const BOOT_RECOVERY_SESSION_KEY = "runload.bootRecovery.attempt.v1";
const APP_CACHE_PREFIX = "running-record-app-";

function bootScreen() {
  return document.querySelector("#app > .app-boot");
}

function appBootCompleted() {
  return !bootScreen();
}

function setBootMessage(message) {
  const status = bootScreen()?.querySelector("small");
  if (status) status.textContent = message;
}

async function clearDeliveryState() {
  if ("caches" in globalThis) {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(APP_CACHE_PREFIX))
      .map((key) => caches.delete(key)));
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations
      .filter((registration) => {
        const scriptUrl = registration.active?.scriptURL
          || registration.waiting?.scriptURL
          || registration.installing?.scriptURL
          || "";
        return scriptUrl.endsWith("/service-worker.js");
      })
      .map((registration) => registration.unregister()));
  }
}

async function recoverStalledBoot() {
  if (appBootCompleted()) {
    try { sessionStorage.removeItem(BOOT_RECOVERY_SESSION_KEY); } catch {}
    return;
  }

  // While offline, removing the service worker or cached app files can make
  // recovery impossible. Preserve the last usable offline installation.
  if (navigator.onLine === false) {
    setBootMessage("オフラインで起動できません。接続後に一度アプリを開いてください。");
    return;
  }

  let alreadyAttempted = false;
  try {
    alreadyAttempted = sessionStorage.getItem(BOOT_RECOVERY_SESSION_KEY) === "1";
  } catch {}

  if (alreadyAttempted) {
    setBootMessage("起動できませんでした。Safariで再読み込みしてください");
    return;
  }

  try { sessionStorage.setItem(BOOT_RECOVERY_SESSION_KEY, "1"); } catch {}
  setBootMessage("更新状態を修復しています");

  try {
    await clearDeliveryState();
    globalThis.location.reload();
  } catch {
    setBootMessage("更新状態を修復できませんでした。Safariで再読み込みしてください");
  }
}

globalThis.setTimeout(recoverStalledBoot, BOOT_RECOVERY_TIMEOUT_MS);

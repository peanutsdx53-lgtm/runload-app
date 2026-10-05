import { APP_VERSION_LABEL } from "./appVersionStatus.js";

let enhancementQueued = false;

function addMobileHomeVersion() {
  const title = document.querySelector(".mobile-home-os__header > div");
  if (!title || title.querySelector("[data-app-version]")) return;
  const label = document.createElement("small");
  label.dataset.appVersion = APP_VERSION_LABEL.slice(1);
  label.textContent = `APP ${APP_VERSION_LABEL}`;
  label.setAttribute("aria-label", `アプリバージョン ${APP_VERSION_LABEL}`);
  title.append(label);
}

function queueEnhancement() {
  if (enhancementQueued) return;
  enhancementQueued = true;
  queueMicrotask(() => {
    enhancementQueued = false;
    addMobileHomeVersion();
  });
}

const appRoot = document.getElementById("app");
if (appRoot && typeof MutationObserver === "function") {
  new MutationObserver(queueEnhancement).observe(appRoot, { childList: true, subtree: true });
}
queueEnhancement();

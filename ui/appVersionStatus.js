export const APP_VERSION = "2026.10.06.6";
export const APP_VERSION_LABEL = `v${APP_VERSION}`;

// Keep this release identifier aligned with service-worker.js before publishing.
const APP_CACHE_PREFIXES = Object.freeze([
  "running-record-app-",
]);

let enhancementQueued = false;
let resetting = false;

function createSettingsUpdatePanel() {
  const section = document.createElement("section");
  section.className = "group";
  section.dataset.appUpdatePanel = "";
  section.innerHTML = `
    <p class="group-title">アプリ</p>
    <div class="boundary">
      <strong data-app-version="${APP_VERSION}">バージョン ${APP_VERSION_LABEL}</strong>
      <span>表示中のアプリ更新を確認できます。</span>
    </div>
    <div class="action-row">
      <button type="button" class="primary" data-action="reset-update-state">更新状態を初期化</button>
    </div>
    <p class="note">アプリのキャッシュを削除して最新版を再読み込みします。記録、予定、保存コース、プロフィール、設定は削除しません。</p>
    <p class="visually-hidden" data-update-reset-status role="status" aria-live="polite"></p>`;
  return section;
}

function addSettingsUpdatePanel() {
  const body = document.querySelector(".screen--settings .secondary-derived-body");
  if (!body || body.querySelector("[data-app-update-panel]")) return;
  const head = body.querySelector(":scope > .head");
  const panel = createSettingsUpdatePanel();
  if (head) head.after(panel);
  else body.prepend(panel);
}

async function deleteAppCaches() {
  if (!("caches" in globalThis)) return;
  const keys = await caches.keys();
  await Promise.all(keys
    .filter((key) => APP_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
    .map((key) => caches.delete(key)));
}

async function requestServiceWorkerUpdate() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(async (registration) => {
    try {
      await registration.update();
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    } catch {
      // Cache reset remains useful even when a worker update cannot be requested.
    }
  }));
}

async function resetUpdateState(button) {
  if (resetting) return;
  if (!window.confirm("記録などの保存データは残したまま、アプリのキャッシュを初期化して最新版を再読み込みしますか？")) return;
  resetting = true;
  const status = document.querySelector("[data-update-reset-status]");
  if (button) {
    button.disabled = true;
    button.textContent = "初期化しています…";
  }
  if (status) status.textContent = "更新状態を初期化しています。";
  try {
    await deleteAppCaches();
    await requestServiceWorkerUpdate();
    if (status) status.textContent = "初期化しました。最新版を再読み込みします。";
    window.setTimeout(() => window.location.reload(), 80);
  } catch {
    resetting = false;
    if (button) {
      button.disabled = false;
      button.textContent = "更新状態を初期化";
    }
    if (status) status.textContent = "更新状態を初期化できませんでした。通常の再読み込みをお試しください。";
  }
}

function bindResetButton() {
  const button = document.querySelector('[data-action="reset-update-state"]');
  if (!button || button.dataset.updateResetBound === "true") return;
  button.dataset.updateResetBound = "true";
  button.addEventListener("click", () => resetUpdateState(button));
}

function enhanceVersionStatus() {
  enhancementQueued = false;
  addSettingsUpdatePanel();
  bindResetButton();
}

function queueEnhancement() {
  if (enhancementQueued) return;
  enhancementQueued = true;
  queueMicrotask(enhanceVersionStatus);
}

const appRoot = document.getElementById("app");
if (appRoot) {
  new MutationObserver(queueEnhancement).observe(appRoot, { childList: true, subtree: true });
}
queueEnhancement();
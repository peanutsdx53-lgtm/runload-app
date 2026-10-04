const MOBILE_QUERY = "(max-width: 54.99rem)";

function mobileMatches() {
  return typeof globalThis.matchMedia === "function"
    ? globalThis.matchMedia(MOBILE_QUERY).matches
    : Number(globalThis.innerWidth || 0) <= 879;
}

function redirectMoreLinksToHome() {
  if (!mobileMatches()) return;
  document.querySelectorAll('a[href="#/more"], a[href^="#/more?"]').forEach((link) => {
    link.setAttribute("href", "#/home");
    if (link.classList.contains("mobile-topbar__back")) link.textContent = "‹ ホーム";
    if (link.classList.contains("secondary-derived-back")) link.textContent = "← ホームへ戻る";
  });
}

function ensureSettingsAboutLink() {
  if (!mobileMatches()) return;
  const settings = document.querySelector(".screen--settings");
  const links = settings?.querySelector(".settings-guide-links");
  if (!links || links.querySelector("[data-settings-about-link]")) return;

  const anchor = document.createElement("a");
  anchor.className = "settings-guide-link";
  anchor.dataset.settingsAboutLink = "";
  anchor.href = "#/about?returnTo=%23%2Fsettings";
  anchor.innerHTML = '<span><small>ABOUT / CREDITS</small><strong>このアプリについて</strong></span><span aria-hidden="true">›</span>';
  links.prepend(anchor);
}

function setAboutReturnToSettings() {
  if (!mobileMatches() || !document.querySelector(".screen--about")) return;
  document.querySelectorAll(".mobile-topbar__back, .screen--about .secondary-derived-back").forEach((link) => {
    link.setAttribute("href", "#/settings");
    link.textContent = link.classList.contains("mobile-topbar__back") ? "‹ 設定" : "← 設定へ戻る";
  });
}

function removeMoreNavigationItem() {
  if (!mobileMatches()) return;
  document.querySelectorAll('.primary-navigation [data-navigation-screen="more"]').forEach((item) => item.remove());
}

function applyMobileNavigationPolicy() {
  if (!mobileMatches()) return;
  redirectMoreLinksToHome();
  ensureSettingsAboutLink();
  setAboutReturnToSettings();
  removeMoreNavigationItem();
}

function redirectMoreRouteToHome() {
  if (!mobileMatches()) return false;
  if (!String(globalThis.location?.hash || "").startsWith("#/more")) return false;
  globalThis.history?.replaceState?.(globalThis.history.state, "", "#/home");
  return true;
}

redirectMoreRouteToHome();

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    if (!mobileMatches()) return;
    const link = event.target?.closest?.('a[href="#/more"], a[href^="#/more?"]');
    if (!link) return;
    event.preventDefault();
    globalThis.location.hash = "#/home";
  }, true);

  globalThis.addEventListener?.("hashchange", () => {
    redirectMoreRouteToHome();
    queueMicrotask(applyMobileNavigationPolicy);
  });

  const appRoot = document.getElementById("app");
  if (appRoot && typeof MutationObserver === "function") {
    new MutationObserver(() => applyMobileNavigationPolicy()).observe(appRoot, { childList: true, subtree: true });
  }
  applyMobileNavigationPolicy();
}

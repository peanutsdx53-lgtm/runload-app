const MOBILE_HOME_QUERY = "(max-width: 54.99rem)";
const IOS_NATIVE_SCROLL_CLASS = "is-runload-ios-home-native-scroll";

function mobileLayoutMatches() {
  return typeof globalThis.matchMedia === "function"
    ? globalThis.matchMedia(MOBILE_HOME_QUERY).matches
    : Number(globalThis.innerWidth || 0) <= 879;
}

function isIOSLike() {
  const ua = String(globalThis.navigator?.userAgent || "");
  const platform = String(globalThis.navigator?.platform || "");
  const touchPoints = Number(globalThis.navigator?.maxTouchPoints || 0);
  return /iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && touchPoints > 1);
}

function decorateDragHandles(scope = document) {
  if (!isIOSLike()) return;
  scope.querySelectorAll?.(
    ".mobile-home-page [data-home-item-id], .mobile-home-page [data-home-widget-id]"
  ).forEach((item) => {
    if (item.querySelector("[data-home-drag-handle]")) return;
    const handle = document.createElement("span");
    handle.className = "mobile-home-ios-drag-handle";
    handle.dataset.homeDragHandle = "";
    handle.setAttribute("aria-hidden", "true");
    handle.textContent = "移動";
    item.append(handle);
  });
}

function lockedEditViewportFromEvent(event) {
  if (!isIOSLike() || !mobileLayoutMatches()) return null;
  const root = event.target.closest?.(".mobile-home-os.is-home-editing") || null;
  if (!root) return null;
  if (event.target.closest?.("button, input, textarea, select, [contenteditable=\"true\"], [data-home-drag-handle]")) return null;
  return event.target.closest?.(".mobile-home-page-viewport") || null;
}

function handlePointerDown(event) {
  if (!lockedEditViewportFromEvent(event)) return;

  // Editing uses tap-only page navigation. Block both Safari panning and the app's
  // page-swipe handlers on the page surface. Explicit controls, including the
  // dedicated move handle and page dots, remain interactive.
  event.preventDefault();
  event.stopImmediatePropagation();
}

if (isIOSLike()) {
  document.documentElement.classList.add(IOS_NATIVE_SCROLL_CLASS);
  document.addEventListener("pointerdown", handlePointerDown, true);

  const appRoot = document.getElementById("app");
  if (appRoot && typeof MutationObserver === "function") {
    new MutationObserver(() => decorateDragHandles(appRoot)).observe(appRoot, {
      childList: true,
      subtree: true,
    });
    decorateDragHandles(appRoot);
  }
}

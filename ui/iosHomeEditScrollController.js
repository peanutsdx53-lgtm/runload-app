const MOBILE_HOME_QUERY = "(max-width: 54.99rem)";
const IOS_NATIVE_SCROLL_CLASS = "is-runload-ios-home-native-scroll";
const IOS_VERTICAL_LOCK_CLASS = "is-runload-ios-home-edit-vertical-locked";

let lockedScrollY = null;

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
    ".mobile-home-page [data-home-item-id], .mobile-home-page [data-home-widget-id], .mobile-home-dock [data-home-item-id]"
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

function currentDocumentScrollY() {
  return Math.max(0, Number(globalThis.scrollY || document.documentElement?.scrollTop || 0));
}

function editingHomePresent(scope = document) {
  return Boolean(scope.querySelector?.(".mobile-home-os.is-home-editing")
    || document.querySelector(".mobile-home-os.is-home-editing"));
}

function lockVerticalDocument() {
  if (lockedScrollY !== null) return;
  lockedScrollY = currentDocumentScrollY();
  const root = document.documentElement;
  root.style.setProperty("--runload-ios-home-edit-lock-top", `${-lockedScrollY}px`);
  root.classList.add(IOS_VERTICAL_LOCK_CLASS);
}

function unlockVerticalDocument() {
  if (lockedScrollY === null) return;
  const restoreY = lockedScrollY;
  lockedScrollY = null;
  const root = document.documentElement;
  root.classList.remove(IOS_VERTICAL_LOCK_CLASS);
  root.style.removeProperty("--runload-ios-home-edit-lock-top");
  globalThis.requestAnimationFrame?.(() => {
    globalThis.scrollTo?.({ left: 0, top: restoreY, behavior: "auto" });
  });
}

function syncVerticalDocumentLock(scope = document) {
  if (!isIOSLike() || !mobileLayoutMatches()) {
    unlockVerticalDocument();
    return;
  }
  if (editingHomePresent(scope)) lockVerticalDocument();
  else unlockVerticalDocument();
}

function nativePagingViewportFromEvent(event) {
  if (!isIOSLike() || !mobileLayoutMatches()) return null;
  const root = event.target.closest?.(".mobile-home-os.is-home-editing") || null;
  if (!root) return null;
  if (event.target.closest?.("button, input, textarea, select, [contenteditable=\"true\"], [data-home-drag-handle]")) return null;
  return event.target.closest?.(".mobile-home-page-viewport") || null;
}

function handlePointerDown(event) {
  if (!nativePagingViewportFromEvent(event)) return;

  // Safari owns horizontal paging and scroll-snap. The document itself is fixed
  // while editing, so vertical page movement and its scroll indicator cannot occur.
  event.stopImmediatePropagation();
}

if (isIOSLike()) {
  document.documentElement.classList.add(IOS_NATIVE_SCROLL_CLASS);
  document.addEventListener("pointerdown", handlePointerDown, true);

  const appRoot = document.getElementById("app");
  if (appRoot && typeof MutationObserver === "function") {
    const enhance = () => {
      decorateDragHandles(appRoot);
      syncVerticalDocumentLock(appRoot);
    };
    new MutationObserver(enhance).observe(appRoot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-home-item-id", "data-home-widget-id"],
    });
    enhance();
  } else {
    syncVerticalDocumentLock();
  }
}

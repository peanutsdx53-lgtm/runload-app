const DEFAULT_SCREEN = "home";
const MOBILE_LAYOUT_QUERY = "(max-width: 54.99rem)";

function parseHashLocation(validScreens, defaultScreen = DEFAULT_SCREEN) {
  const rawHash = window.location.hash.replace(/^#\/?/, "");
  const [rawScreen = "", rawQuery = ""] = rawHash.split("?");
  const requestedScreen = rawScreen.trim();
  const parameters = new URLSearchParams(rawQuery);
  if (validScreens.has(requestedScreen)) {
    return Object.freeze({ screen: requestedScreen, parameters });
  }
  return Object.freeze({ screen: defaultScreen, parameters: new URLSearchParams() });
}

function buildHash(screenName, parameters = {}) {
  const search = parameters instanceof URLSearchParams
    ? parameters
    : new URLSearchParams(Object.entries(parameters).filter(([, value]) => value !== undefined && value !== null && value !== ""));
  const query = search.toString();
  return `#/${screenName}${query ? `?${query}` : ""}`;
}

function defaultSingleEntryNavigation() {
  return Boolean(globalThis.matchMedia?.(MOBILE_LAYOUT_QUERY)?.matches);
}

export function createAppRouter({
  availableScreens,
  defaultScreen = DEFAULT_SCREEN,
  onScreenChange,
  singleEntryNavigation = defaultSingleEntryNavigation,
}) {
  const validScreens = new Set(availableScreens);
  const resolvedDefaultScreen = validScreens.has(defaultScreen) ? defaultScreen : DEFAULT_SCREEN;

  function useSingleEntryNavigation() {
    return typeof singleEntryNavigation === "function"
      ? Boolean(singleEntryNavigation())
      : Boolean(singleEntryNavigation);
  }

  function readLocation() {
    return parseHashLocation(validScreens, resolvedDefaultScreen);
  }

  function canonicalizeLocation(location) {
    const canonicalHash = buildHash(location.screen, location.parameters);
    if (window.location.hash !== canonicalHash) window.history.replaceState(window.history.state, "", canonicalHash);
    return location;
  }

  function renderFromCurrentLocation() {
    onScreenChange(canonicalizeLocation(readLocation()));
  }

  function replaceAndRender(nextHash) {
    window.history.replaceState(window.history.state, "", nextHash);
    renderFromCurrentLocation();
  }

  function navigateToScreen(screenName, parameters = {}) {
    const target = validScreens.has(screenName) ? screenName : resolvedDefaultScreen;
    const nextHash = buildHash(target, parameters);
    if (window.location.hash === nextHash) {
      renderFromCurrentLocation();
      return;
    }
    if (useSingleEntryNavigation()) {
      replaceAndRender(nextHash);
      return;
    }
    window.location.hash = nextHash;
  }

  function handleLocationChange() {
    renderFromCurrentLocation();
  }

  function handleInternalLinkClick(event) {
    if (!useSingleEntryNavigation() || event.defaultPrevented) return;
    if (event.button != null && event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target?.closest?.('a[href^="#/"]');
    if (!link || link.hasAttribute("download")) return;
    const target = String(link.getAttribute("target") || "").toLowerCase();
    if (target && target !== "_self") return;
    const href = String(link.getAttribute("href") || "");
    if (!href.startsWith("#/")) return;
    event.preventDefault();
    replaceAndRender(href);
  }

  function start() {
    window.addEventListener("hashchange", handleLocationChange);
    document.addEventListener("click", handleInternalLinkClick);
    if (!window.location.hash) {
      const initialHash = buildHash(resolvedDefaultScreen);
      if (useSingleEntryNavigation()) {
        replaceAndRender(initialHash);
        return;
      }
      window.location.hash = initialHash;
      return;
    }
    if (useSingleEntryNavigation()) {
      const current = readLocation();
      window.history.replaceState(window.history.state, "", buildHash(current.screen, current.parameters));
    }
    handleLocationChange();
  }

  return Object.freeze({ start, navigateToScreen, readLocation });
}

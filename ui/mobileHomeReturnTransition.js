const LAST_HOME_LAUNCH_KEY = "running-record-mobile-home-last-launch-v1";
const SCREEN_RENDERED_EVENT = "running-record:screen-rendered";
const RETURN_CLASS = "is-mobile-home-return-transition";
const TARGET_CLASS = "is-home-return-arrival-target";
const FALLBACK_CLASS = "mobile-home-return-surface";
const HOME_QUERY = "#/home";
const HOME_RETURN_TIMEOUT_MS = 900;

function motionReduced() {
  return Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function mobileLayout() {
  return globalThis.matchMedia?.("(max-width: 54.99rem)")?.matches !== false;
}

function readLastLaunchId() {
  try {
    return String(globalThis.sessionStorage?.getItem(LAST_HOME_LAUNCH_KEY) || "");
  } catch {
    return "";
  }
}

export function rememberMobileHomeLaunch(itemId = "") {
  const value = String(itemId || "").trim();
  if (!value) return;
  try { globalThis.sessionStorage?.setItem(LAST_HOME_LAUNCH_KEY, value); } catch {}
}

export function notifyMobileScreenRendered(screenName = "") {
  globalThis.dispatchEvent?.(new CustomEvent(SCREEN_RENDERED_EVENT, {
    detail: Object.freeze({ screenName: String(screenName || "") }),
  }));
}

function nextFrame() {
  return new Promise((resolve) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve)));
}

function waitForHomeRender() {
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      globalThis.removeEventListener?.(SCREEN_RENDERED_EVENT, handleRendered);
      resolve();
    };
    const handleRendered = (event) => {
      if (event?.detail?.screenName === "home") finish();
    };
    globalThis.addEventListener?.(SCREEN_RENDERED_EVENT, handleRendered);
    globalThis.setTimeout(finish, HOME_RETURN_TIMEOUT_MS);
  });
}

function findTargetIcon(itemId) {
  const items = [...document.querySelectorAll("[data-home-item-id]")];
  const item = items.find((node) => node.dataset.homeItemId === itemId) || null;
  if (!item) return null;
  return item.querySelector(".mobile-home-app__icon, .mobile-home-dock__icon") || item;
}

function applyTargetMetrics(itemId) {
  const html = document.documentElement;
  const target = findTargetIcon(itemId);
  const viewportWidth = Math.max(1, globalThis.innerWidth || html.clientWidth || 1);
  const viewportHeight = Math.max(1, globalThis.innerHeight || html.clientHeight || 1);
  const rect = target?.getBoundingClientRect?.();
  const valid = rect && rect.width > 0 && rect.height > 0;
  const width = valid ? rect.width : Math.min(64, viewportWidth * .16);
  const height = valid ? rect.height : width;
  const left = valid ? rect.left : (viewportWidth - width) / 2;
  const top = valid ? rect.top : Math.max(20, viewportHeight - height - 90);
  const radius = valid ? getComputedStyle(target).borderRadius || "18px" : "18px";

  html.style.setProperty("--home-return-x", `${left}px`);
  html.style.setProperty("--home-return-y", `${top}px`);
  html.style.setProperty("--home-return-scale-x", String(Math.max(.02, width / viewportWidth)));
  html.style.setProperty("--home-return-scale-y", String(Math.max(.02, height / viewportHeight)));
  html.style.setProperty("--home-return-target-width", `${width}px`);
  html.style.setProperty("--home-return-target-height", `${height}px`);
  html.style.setProperty("--home-return-target-radius", radius);
  target?.closest?.("[data-home-item-id]")?.classList.add(TARGET_CLASS);
  return target;
}

function clearReturnState() {
  const html = document.documentElement;
  html.classList.remove(RETURN_CLASS);
  html.style.removeProperty("--home-return-x");
  html.style.removeProperty("--home-return-y");
  html.style.removeProperty("--home-return-scale-x");
  html.style.removeProperty("--home-return-scale-y");
  html.style.removeProperty("--home-return-target-width");
  html.style.removeProperty("--home-return-target-height");
  html.style.removeProperty("--home-return-target-radius");
  document.querySelectorAll(`.${TARGET_CLASS}`).forEach((node) => node.classList.remove(TARGET_CLASS));
}

async function renderHomeAndMeasure(itemId) {
  const rendered = waitForHomeRender();
  globalThis.location.hash = HOME_QUERY.slice(1);
  await rendered;
  await nextFrame();
  applyTargetMetrics(itemId);
}

function createFallbackSurface() {
  const surface = document.createElement("div");
  surface.className = FALLBACK_CLASS;
  surface.setAttribute("aria-hidden", "true");
  document.body.append(surface);
  return surface;
}

async function runFallbackReturn(itemId) {
  const surface = createFallbackSurface();
  document.documentElement.classList.add(RETURN_CLASS);
  await new Promise((resolve) => globalThis.setTimeout(resolve, 80));
  await renderHomeAndMeasure(itemId);
  surface.classList.add("is-closing");
  const cleanup = () => {
    surface.remove();
    clearReturnState();
  };
  surface.addEventListener("animationend", cleanup, { once: true });
  globalThis.setTimeout(cleanup, 520);
}

async function runViewTransitionReturn(itemId) {
  document.documentElement.classList.add(RETURN_CLASS);
  const transition = document.startViewTransition(async () => {
    await renderHomeAndMeasure(itemId);
  });
  try {
    await transition.finished;
  } finally {
    clearReturnState();
  }
}

function shouldInterceptHomeLink(event, link) {
  if (!mobileLayout() || motionReduced()) return false;
  if (!link || String(link.getAttribute("href") || "") !== HOME_QUERY) return false;
  if (event.defaultPrevented) return false;
  if (event.type === "click" && event.button != null && event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  return true;
}

export function bindMobileHomeReturnTransitions(root) {
  if (!root?.querySelectorAll) return undefined;
  const links = [...root.querySelectorAll('a[href="#/home"]')];
  const handlers = links.map((link) => {
    const handler = (event) => {
      if (!shouldInterceptHomeLink(event, link)) return;
      event.preventDefault();
      const itemId = readLastLaunchId();
      if (typeof document.startViewTransition === "function") {
        runViewTransitionReturn(itemId).catch(() => {
          clearReturnState();
          globalThis.location.hash = HOME_QUERY.slice(1);
        });
      } else {
        runFallbackReturn(itemId).catch(() => {
          clearReturnState();
          globalThis.location.hash = HOME_QUERY.slice(1);
        });
      }
    };
    link.addEventListener("click", handler);
    return [link, handler];
  });
  return () => handlers.forEach(([link, handler]) => link.removeEventListener("click", handler));
}

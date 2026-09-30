const LAST_HOME_LAUNCH_KEY = "running-record-mobile-home-last-launch-v1";
const SCREEN_RENDERED_EVENT = "running-record:screen-rendered";
const HOME_QUERY = "#/home";
const RETURN_DURATION_MS = 330;
const RETURN_EASING = "cubic-bezier(.2, .82, .22, 1)";

let returningHome = false;

function motionReduced() {
  return Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function mobileLayout() {
  return globalThis.matchMedia?.("(max-width: 54.99rem)")?.matches !== false;
}

function findTargetIcon(itemId) {
  const items = [...document.querySelectorAll("[data-home-item-id]")];
  const item = items.find((node) => node.dataset.homeItemId === itemId) || null;
  if (!item) return null;
  return item.querySelector(".mobile-home-app__icon, .mobile-home-dock__icon") || item;
}

function captureLaunchState(itemId) {
  const id = String(itemId || "").trim();
  if (!id) return null;
  const target = findTargetIcon(id);
  const rect = target?.getBoundingClientRect?.();
  const viewportWidth = Math.max(1, globalThis.innerWidth || document.documentElement.clientWidth || 1);
  const viewportHeight = Math.max(1, globalThis.innerHeight || document.documentElement.clientHeight || 1);
  const valid = rect && rect.width > 0 && rect.height > 0;
  const radius = valid ? getComputedStyle(target).borderRadius || "18px" : "18px";
  return Object.freeze({
    id,
    leftRatio: valid ? rect.left / viewportWidth : .42,
    topRatio: valid ? rect.top / viewportHeight : .78,
    widthRatio: valid ? rect.width / viewportWidth : .16,
    heightRatio: valid ? rect.height / viewportHeight : .08,
    radius,
  });
}

function readLastLaunchState() {
  try {
    const raw = String(globalThis.sessionStorage?.getItem(LAST_HOME_LAUNCH_KEY) || "");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.id) return parsed;
    } catch {}
    return Object.freeze({ id: raw });
  } catch {
    return null;
  }
}

export function rememberMobileHomeLaunch(itemId = "") {
  const state = captureLaunchState(itemId);
  if (!state) return;
  try { globalThis.sessionStorage?.setItem(LAST_HOME_LAUNCH_KEY, JSON.stringify(state)); } catch {}
}

export function notifyMobileScreenRendered(screenName = "") {
  globalThis.dispatchEvent?.(new CustomEvent(SCREEN_RENDERED_EVENT, {
    detail: Object.freeze({ screenName: String(screenName || "") }),
  }));
}

function targetMetrics(state) {
  const viewportWidth = Math.max(1, globalThis.innerWidth || document.documentElement.clientWidth || 1);
  const viewportHeight = Math.max(1, globalThis.innerHeight || document.documentElement.clientHeight || 1);
  const width = Math.max(44, viewportWidth * Number(state?.widthRatio || .16));
  const height = Math.max(44, viewportHeight * Number(state?.heightRatio || .08));
  const left = Math.max(0, Math.min(viewportWidth - width, viewportWidth * Number(state?.leftRatio ?? .42)));
  const top = Math.max(0, Math.min(viewportHeight - height, viewportHeight * Number(state?.topRatio ?? .78)));
  return Object.freeze({
    left,
    top,
    width,
    height,
    scaleX: Math.max(.02, width / viewportWidth),
    scaleY: Math.max(.02, height / viewportHeight),
    radius: String(state?.radius || "18px"),
  });
}

function styleLayer(element, styles) {
  Object.entries(styles).forEach(([property, value]) => {
    element.style[property] = value;
  });
}

function createReturnVisual(root) {
  if (!(root instanceof HTMLElement)) return null;
  const viewportWidth = Math.max(1, globalThis.innerWidth || document.documentElement.clientWidth || 1);
  const viewportHeight = Math.max(1, globalThis.innerHeight || document.documentElement.clientHeight || 1);
  const scrollTop = Number(document.scrollingElement?.scrollTop || globalThis.scrollY || 0);
  const bodyStyle = getComputedStyle(document.body);

  const backdrop = document.createElement("div");
  backdrop.className = "mobile-home-return-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  styleLayer(backdrop, {
    position: "fixed",
    inset: "0",
    zIndex: "99998",
    pointerEvents: "none",
    background: bodyStyle.backgroundColor || "var(--color-paper)",
    opacity: "1",
  });

  const snapshot = document.createElement("div");
  snapshot.className = "mobile-home-return-snapshot";
  snapshot.setAttribute("aria-hidden", "true");
  styleLayer(snapshot, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${viewportWidth}px`,
    height: `${viewportHeight}px`,
    zIndex: "99999",
    overflow: "hidden",
    pointerEvents: "none",
    transformOrigin: "top left",
    background: bodyStyle.backgroundColor || "var(--color-paper)",
    willChange: "transform, border-radius, opacity, filter",
  });

  const clone = root.cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  clone.removeAttribute("id");
  styleLayer(clone, {
    position: "absolute",
    left: "0",
    top: `${-scrollTop}px`,
    width: "100%",
    minHeight: `${Math.max(viewportHeight, document.documentElement.scrollHeight)}px`,
    pointerEvents: "none",
    margin: "0",
  });
  snapshot.append(clone);
  document.body.append(backdrop, snapshot);
  return Object.freeze({ backdrop, snapshot });
}

function animateOnce(element, keyframes, options) {
  if (!element?.animate) return null;
  const animation = element.animate(keyframes, { ...options, fill: "none" });
  animation.finished.then(() => animation.cancel(), () => animation.cancel());
  return animation;
}

function animateHomeArrival(state, backdrop) {
  const header = document.querySelector(".mobile-home-os__header");
  const viewport = document.querySelector(".mobile-home-page-viewport");
  [header, viewport].forEach((element) => {
    animateOnce(element, [
      { transform: "translateY(4px) scale(.985)", opacity: .72 },
      { transform: "translateY(0) scale(1)", opacity: 1 },
    ], {
      duration: RETURN_DURATION_MS,
      easing: RETURN_EASING,
    });
  });

  const dock = document.querySelector(".mobile-home-dock");
  animateOnce(dock, [
    { transform: "translateY(9px)", opacity: .35 },
    { transform: "translateY(0)", opacity: 1 },
  ], {
    duration: 250,
    delay: 35,
    easing: RETURN_EASING,
  });

  const indicator = document.querySelector(".mobile-home-page-indicator");
  animateOnce(indicator, [
    { opacity: .35 },
    { opacity: 1 },
  ], {
    duration: 250,
    delay: 35,
    easing: RETURN_EASING,
  });

  const target = findTargetIcon(String(state?.id || ""));
  animateOnce(target, [
    { transform: "scale(.88)" },
    { transform: "scale(1.045)", offset: .68 },
    { transform: "scale(1)" },
  ], {
    duration: 280,
    delay: 110,
    easing: RETURN_EASING,
  });

  if (backdrop?.animate) {
    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 180,
      easing: "ease-out",
      fill: "forwards",
    });
  }
}

function listenForHomeArrival(state, backdrop) {
  const handler = (event) => {
    if (event?.detail?.screenName !== "home") return;
    globalThis.removeEventListener?.(SCREEN_RENDERED_EVENT, handler);
    globalThis.requestAnimationFrame?.(() => animateHomeArrival(state, backdrop));
  };
  globalThis.addEventListener?.(SCREEN_RENDERED_EVENT, handler);
  globalThis.setTimeout(() => globalThis.removeEventListener?.(SCREEN_RENDERED_EVENT, handler), RETURN_DURATION_MS + 250);
}

function runSnapshotReturn(root, state) {
  const visual = createReturnVisual(root);
  if (!visual?.snapshot?.animate) {
    returningHome = false;
    globalThis.location.replace(HOME_QUERY);
    return;
  }

  const metrics = targetMetrics(state);
  listenForHomeArrival(state, visual.backdrop);

  const animation = visual.snapshot.animate([
    {
      transform: "translate3d(0, 0, 0) scale(1, 1)",
      borderRadius: "0px",
      opacity: 1,
      filter: "blur(0)",
    },
    {
      transform: `translate3d(${metrics.left}px, ${metrics.top}px, 0) scale(${metrics.scaleX}, ${metrics.scaleY})`,
      borderRadius: metrics.radius,
      opacity: 0,
      filter: "blur(.45px)",
    },
  ], {
    duration: RETURN_DURATION_MS,
    easing: RETURN_EASING,
    fill: "forwards",
  });
  animation.pause();
  animation.currentTime = 0;

  const startReturn = () => {
    animation.play();
    globalThis.location.replace(HOME_QUERY);
  };
  if (typeof globalThis.requestAnimationFrame === "function") globalThis.requestAnimationFrame(startReturn);
  else globalThis.setTimeout(startReturn, 0);

  const cleanup = () => {
    visual.snapshot.remove();
    visual.backdrop.remove();
    returningHome = false;
  };
  animation.finished.then(cleanup, cleanup);
  globalThis.setTimeout(cleanup, RETURN_DURATION_MS + 180);
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
      if (returningHome) return;
      returningHome = true;
      runSnapshotReturn(root, readLastLaunchState());
    };
    link.addEventListener("click", handler);
    return [link, handler];
  });
  return () => handlers.forEach(([link, handler]) => link.removeEventListener("click", handler));
}

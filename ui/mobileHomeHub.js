const SWIPE_MIN_PX = 42;
const SWIPE_VELOCITY_PX_PER_MS = 0.28;
const CLICK_SUPPRESSION_MS = 520;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function bindMobileHomeHub(homeRoot) {
  const hub = homeRoot?.closest?.("[data-home-hub]") || document.querySelector("[data-home-hub]");
  const viewport = hub?.querySelector?.("[data-home-hub-viewport]") || null;
  const pages = hub ? [...hub.querySelectorAll("[data-home-hub-page-index]")] : [];
  if (!hub || !viewport || pages.length < 2) return null;

  let activePage = 0;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startedAt = 0;
  let horizontal = false;
  let suppressClickUntil = 0;
  let animationFrame = null;

  function pageWidth() {
    return Math.max(1, viewport.clientWidth || globalThis.innerWidth || 1);
  }

  function updateState(index) {
    activePage = clamp(Number(index) || 0, 0, pages.length - 1);
    hub.dataset.homeHubPage = String(activePage);
    hub.classList.toggle("is-home-overview-active", activePage === 1);
    pages.forEach((page, pageIndex) => {
      const current = pageIndex === activePage;
      page.setAttribute("aria-hidden", current ? "false" : "true");
      if ("inert" in page) page.inert = !current;
    });
  }

  function cancelAnimation() {
    if (animationFrame != null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  function moveTo(index, { smooth = true } = {}) {
    const target = clamp(Number(index) || 0, 0, pages.length - 1);
    if (homeRoot?.classList?.contains("is-home-editing") && target !== 0) return;
    const left = target * pageWidth();
    updateState(target);
    cancelAnimation();
    if (!smooth || globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      viewport.scrollLeft = left;
      return;
    }
    const from = viewport.scrollLeft;
    const distance = left - from;
    if (Math.abs(distance) < 1) {
      viewport.scrollLeft = left;
      return;
    }
    const start = globalThis.performance?.now?.() ?? Date.now();
    const duration = 190;
    const step = (now) => {
      const progress = Math.min(1, Math.max(0, now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      viewport.scrollLeft = from + distance * eased;
      if (progress < 1) animationFrame = requestAnimationFrame(step);
      else {
        viewport.scrollLeft = left;
        animationFrame = null;
      }
    };
    animationFrame = requestAnimationFrame(step);
  }

  function resetPointer() {
    if (pointerId != null) {
      try { viewport.releasePointerCapture(pointerId); } catch {}
    }
    pointerId = null;
    horizontal = false;
    hub.classList.remove("is-home-hub-swiping");
  }

  function pointerDown(event) {
    if (homeRoot?.classList?.contains("is-home-editing")) return;
    if (activePage === 0) return;
    if (event.target.closest?.("[data-home-page-viewport]")) return;
    if (pointerId != null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest?.("input, textarea, select, [contenteditable='true']")) return;
    cancelAnimation();
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = viewport.scrollLeft;
    startedAt = globalThis.performance?.now?.() ?? Date.now();
  }

  function pointerMove(event) {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (!horizontal) {
      if (absX < 8 && absY < 8) return;
      if (absY >= absX * 0.95) {
        resetPointer();
        return;
      }
      horizontal = true;
      suppressClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
      try { viewport.setPointerCapture(event.pointerId); } catch {}
      hub.classList.add("is-home-hub-swiping");
    }
    event.preventDefault();
    const maxLeft = (pages.length - 1) * pageWidth();
    viewport.scrollLeft = clamp(startLeft - dx, 0, maxLeft);
  }

  function finishPointer(event, cancelled = false) {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const elapsed = Math.max(1, (globalThis.performance?.now?.() ?? Date.now()) - startedAt);
    const velocity = Math.abs(dx) / elapsed;
    let target = activePage;
    if (!cancelled && horizontal && (Math.abs(dx) >= SWIPE_MIN_PX || velocity >= SWIPE_VELOCITY_PX_PER_MS)) {
      target = dx > 0 ? 0 : activePage;
    } else if (horizontal) {
      target = Math.round(viewport.scrollLeft / pageWidth());
    }
    if (horizontal) {
      event.preventDefault();
      suppressClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
    }
    resetPointer();
    moveTo(target, { smooth: true });
  }

  function click(event) {
    const target = event.target.closest?.("[data-home-hub-target]");
    if (target) {
      event.preventDefault();
      event.stopPropagation();
      moveTo(Number(target.dataset.homeHubTarget), { smooth: true });
      return;
    }
    if (Date.now() < suppressClickUntil && event.target.closest?.("a, button, [role='link']")) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function resize() {
    viewport.scrollLeft = activePage * pageWidth();
  }

  const editingObserver = new MutationObserver(() => {
    if (!homeRoot?.classList?.contains("is-home-editing")) return;
    moveTo(0, { smooth: false });
  });
  if (homeRoot) editingObserver.observe(homeRoot, { attributes: true, attributeFilter: ["class"] });

  const pointerUp = (event) => finishPointer(event, false);
  const pointerCancel = (event) => finishPointer(event, true);
  viewport.addEventListener("pointerdown", pointerDown);
  viewport.addEventListener("pointermove", pointerMove, { passive: false });
  viewport.addEventListener("pointerup", pointerUp);
  viewport.addEventListener("pointercancel", pointerCancel);
  hub.addEventListener("click", click, true);
  globalThis.addEventListener?.("resize", resize);
  updateState(0);
  viewport.scrollLeft = 0;

  return () => {
    cancelAnimation();
    resetPointer();
    editingObserver.disconnect();
    viewport.removeEventListener("pointerdown", pointerDown);
    viewport.removeEventListener("pointermove", pointerMove);
    viewport.removeEventListener("pointerup", pointerUp);
    viewport.removeEventListener("pointercancel", pointerCancel);
    hub.removeEventListener("click", click, true);
    globalThis.removeEventListener?.("resize", resize);
  };
}

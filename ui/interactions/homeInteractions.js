const STORAGE_KEY = "running-record-mobile-home-layout-v1";
const LONG_PRESS_MS = 380;
const MOVE_CANCEL_PX = 10;

const DEFAULT_LAYOUT = Object.freeze({
  apps: Object.freeze(["simulation", "plan", "reading", "share", "settings"]),
  dock: Object.freeze(["record", "measure", "history", "course"]),
});

const ITEM_ID_BY_HREF = Object.freeze([
  ["#/simulation", "simulation"],
  ["#/plan", "plan"],
  ["#/reading", "reading"],
  ["#/consultation", "share"],
  ["#/settings", "settings"],
  ["#/record-input", "record"],
  ["#/run-measurement", "measure"],
  ["#/history", "history"],
  ["#/course-library", "course"],
]);

const ALL_ITEM_IDS = Object.freeze([...DEFAULT_LAYOUT.apps, ...DEFAULT_LAYOUT.dock]);
const ALL_ITEM_ID_SET = new Set(ALL_ITEM_IDS);

function itemIdFromHref(href = "") {
  return ITEM_ID_BY_HREF.find(([prefix]) => String(href).startsWith(prefix))?.[1] || "";
}

function readLayout() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || "null");
    const apps = Array.isArray(parsed?.apps) ? parsed.apps.map(String) : [];
    const dock = Array.isArray(parsed?.dock) ? parsed.dock.map(String) : [];
    const combined = [...apps, ...dock];
    if (dock.length !== DEFAULT_LAYOUT.dock.length) return DEFAULT_LAYOUT;
    if (combined.length !== ALL_ITEM_IDS.length) return DEFAULT_LAYOUT;
    if (new Set(combined).size !== ALL_ITEM_IDS.length) return DEFAULT_LAYOUT;
    if (!combined.every((id) => ALL_ITEM_ID_SET.has(id))) return DEFAULT_LAYOUT;
    return Object.freeze({ apps: Object.freeze(apps), dock: Object.freeze(dock) });
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function writeLayout(appsContainer, dockContainer) {
  const layout = {
    version: 1,
    apps: [...appsContainer.querySelectorAll("[data-home-item-id]")].map((item) => item.dataset.homeItemId),
    dock: [...dockContainer.querySelectorAll("[data-home-item-id]")].map((item) => item.dataset.homeItemId),
  };
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Layout persistence is optional; navigation remains usable without storage.
  }
}

function setItemZone(item, zone) {
  const dock = zone === "dock";
  item.dataset.homeZone = zone;
  item.classList.toggle("mobile-home-app", !dock);
  item.classList.toggle("mobile-home-dock__item", dock);
  const icon = item.querySelector(".mobile-home-app__icon, .mobile-home-dock__icon");
  const label = item.querySelector(".mobile-home-app__label, .mobile-home-dock__label");
  icon?.classList.toggle("mobile-home-app__icon", !dock);
  icon?.classList.toggle("mobile-home-dock__icon", dock);
  label?.classList.toggle("mobile-home-app__label", !dock);
  label?.classList.toggle("mobile-home-dock__label", dock);
}

function prepareItems(root) {
  root.querySelectorAll(".mobile-home-apps .mobile-home-app, .mobile-home-dock .mobile-home-dock__item").forEach((item) => {
    const id = itemIdFromHref(item.getAttribute("href"));
    if (!id) return;
    item.dataset.homeItemId = id;
    item.dataset.homeZone = item.closest(".mobile-home-dock") ? "dock" : "apps";
    item.setAttribute("draggable", "false");
  });
}

function applyLayout(root, appsContainer, dockContainer) {
  const items = new Map([...root.querySelectorAll("[data-home-item-id]")].map((item) => [item.dataset.homeItemId, item]));
  const layout = readLayout();
  layout.apps.forEach((id) => {
    const item = items.get(id);
    if (!item) return;
    setItemZone(item, "apps");
    appsContainer.append(item);
  });
  layout.dock.forEach((id) => {
    const item = items.get(id);
    if (!item) return;
    setItemZone(item, "dock");
    dockContainer.append(item);
  });
}

function ensureEditControls(root) {
  const status = root.querySelector(".mobile-home-os__status");
  if (status && !status.matches("button")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = status.className;
    button.dataset.homeEditToggle = "";
    button.setAttribute("aria-pressed", "false");
    button.textContent = "編集";
    status.replaceWith(button);
  }
  if (!root.querySelector(".mobile-home-edit-hint")) {
    const hint = document.createElement("p");
    hint.className = "mobile-home-edit-hint";
    hint.textContent = "アイコンをドラッグして移動できます。Dockとの入れ替えもできます。";
    root.querySelector(".mobile-home-os__header")?.after(hint);
  }
}

function swapItems(source, target) {
  const placeholder = document.createElement("span");
  placeholder.hidden = true;
  source.replaceWith(placeholder);
  target.replaceWith(source);
  placeholder.replaceWith(target);
}

function createDragGhost(item) {
  const ghost = item.cloneNode(true);
  ghost.removeAttribute("href");
  ghost.removeAttribute("data-home-item-id");
  ghost.classList.add("mobile-home-drag-ghost");
  ghost.setAttribute("aria-hidden", "true");
  document.body.append(ghost);
  return ghost;
}

function moveGhost(ghost, clientX, clientY) {
  ghost.style.left = `${clientX}px`;
  ghost.style.top = `${clientY}px`;
}

export function bindHome() {
  const root = document.querySelector(".mobile-home-os");
  if (!root) return null;
  const appsContainer = root.querySelector(".mobile-home-apps");
  const dockContainer = root.querySelector(".mobile-home-dock");
  if (!appsContainer || !dockContainer) return null;

  prepareItems(root);
  ensureEditControls(root);
  applyLayout(root, appsContainer, dockContainer);

  let editing = false;
  let pressTimer = null;
  let pressItem = null;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let ghost = null;
  let dropItem = null;
  let suppressClickUntil = 0;

  const editButton = root.querySelector("[data-home-edit-toggle]");

  function clearDropTarget() {
    dropItem?.classList.remove("is-home-drop-target");
    dropItem = null;
  }

  function clearPressState() {
    pressItem?.classList.remove("is-home-pressing");
  }

  function setEditing(next) {
    editing = Boolean(next);
    root.classList.toggle("is-home-editing", editing);
    if (editButton) {
      editButton.textContent = editing ? "完了" : "編集";
      editButton.setAttribute("aria-pressed", String(editing));
    }
    if (!editing) clearDropTarget();
  }

  function finishDrag(event, cancelled = false) {
    if (!dragging || !pressItem) return;
    const source = pressItem;
    const sourceZone = source.dataset.homeZone;
    const pointTarget = cancelled ? null : document.elementFromPoint(event?.clientX ?? startX, event?.clientY ?? startY);
    const target = pointTarget?.closest?.("[data-home-item-id]") || null;
    const targetZoneElement = pointTarget?.closest?.(".mobile-home-apps, .mobile-home-dock") || null;
    const targetZone = targetZoneElement === dockContainer ? "dock" : targetZoneElement === appsContainer ? "apps" : "";

    if (!cancelled && target && target !== source) {
      if (sourceZone === target.dataset.homeZone) {
        target.before(source);
      } else {
        swapItems(source, target);
        setItemZone(source, target.dataset.homeZone);
        setItemZone(target, sourceZone);
      }
      writeLayout(appsContainer, dockContainer);
    } else if (!cancelled && targetZone && targetZone === sourceZone) {
      targetZoneElement.append(source);
      writeLayout(appsContainer, dockContainer);
    }

    source.classList.remove("is-home-dragging", "is-home-pressing");
    clearDropTarget();
    ghost?.remove();
    ghost = null;
    dragging = false;
    suppressClickUntil = Date.now() + 350;
    try { source.releasePointerCapture(pointerId); } catch {}
  }

  function beginDrag(item, event) {
    if (!item || dragging) return;
    item.classList.remove("is-home-pressing");
    setEditing(true);
    dragging = true;
    pressItem = item;
    pointerId = event.pointerId;
    item.classList.add("is-home-dragging");
    ghost = createDragGhost(item);
    moveGhost(ghost, event.clientX, event.clientY);
    suppressClickUntil = Date.now() + 800;
    try { item.setPointerCapture(event.pointerId); } catch {}
  }

  function cancelPressTimer() {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
  }

  function cancelPendingPress() {
    cancelPressTimer();
    clearPressState();
  }

  function handlePointerDown(event) {
    const item = event.target.closest("[data-home-item-id]");
    if (!item || (event.pointerType === "mouse" && event.button !== 0)) return;
    cancelPendingPress();
    pressItem = item;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    item.classList.add("is-home-pressing");
    if (editing) {
      event.preventDefault();
      beginDrag(item, event);
      return;
    }
    pressTimer = setTimeout(() => beginDrag(item, event), LONG_PRESS_MS);
  }

  function handlePointerMove(event) {
    if (event.pointerId !== pointerId) return;
    if (!dragging) {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > MOVE_CANCEL_PX) cancelPendingPress();
      return;
    }
    event.preventDefault();
    moveGhost(ghost, event.clientX, event.clientY);
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-home-item-id]") || null;
    if (hit === pressItem || hit === dropItem) return;
    clearDropTarget();
    if (hit) {
      dropItem = hit;
      dropItem.classList.add("is-home-drop-target");
    }
  }

  function handlePointerUp(event) {
    if (event.pointerId !== pointerId) return;
    cancelPressTimer();
    if (dragging) {
      event.preventDefault();
      finishDrag(event);
    } else {
      clearPressState();
    }
    pointerId = null;
    pressItem = null;
  }

  function handlePointerCancel(event) {
    if (event.pointerId !== pointerId) return;
    cancelPressTimer();
    if (dragging) finishDrag(event, true);
    clearPressState();
    pointerId = null;
    pressItem = null;
  }

  function handleClick(event) {
    if (event.target.closest("[data-home-edit-toggle]")) {
      event.preventDefault();
      setEditing(!editing);
      return;
    }
    if (event.target.closest("[data-home-item-id]") && (editing || Date.now() < suppressClickUntil)) {
      event.preventDefault();
    }
  }

  function handleContextMenu(event) {
    if (event.target.closest("[data-home-item-id]")) event.preventDefault();
  }

  function handleDragStart(event) {
    if (event.target.closest("[data-home-item-id]")) event.preventDefault();
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && editing) setEditing(false);
  }

  root.addEventListener("pointerdown", handlePointerDown);
  root.addEventListener("pointermove", handlePointerMove, { passive: false });
  root.addEventListener("pointerup", handlePointerUp);
  root.addEventListener("pointercancel", handlePointerCancel);
  root.addEventListener("click", handleClick, true);
  root.addEventListener("contextmenu", handleContextMenu);
  root.addEventListener("dragstart", handleDragStart);
  document.addEventListener("keydown", handleKeyDown);

  return () => {
    cancelPendingPress();
    ghost?.remove();
    root.removeEventListener("pointerdown", handlePointerDown);
    root.removeEventListener("pointermove", handlePointerMove);
    root.removeEventListener("pointerup", handlePointerUp);
    root.removeEventListener("pointercancel", handlePointerCancel);
    root.removeEventListener("click", handleClick, true);
    root.removeEventListener("contextmenu", handleContextMenu);
    root.removeEventListener("dragstart", handleDragStart);
    document.removeEventListener("keydown", handleKeyDown);
  };
}

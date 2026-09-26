const STORAGE_KEY = "running-record-mobile-home-layout-v1";
const WIDGET_STORAGE_KEY = "running-record-mobile-home-widgets-v1";
const LONG_PRESS_MS = 380;
const MOVE_CANCEL_PX = 10;

const DEFAULT_LAYOUT = Object.freeze({
  apps: Object.freeze(["simulation", "plan", "reading", "share", "settings"]),
  dock: Object.freeze(["record", "measure", "history", "course"]),
});

const WIDGET_CATALOG = Object.freeze([
  Object.freeze({ id: "today", label: "今日", description: "今日の記録" }),
  Object.freeze({ id: "plan", label: "次の予定", description: "保存した予定" }),
  Object.freeze({ id: "changes", label: "最近の変化", description: "履歴と推移" }),
  Object.freeze({ id: "checkpoint", label: "次に確認", description: "前回からの確認事項" }),
]);
const DEFAULT_WIDGET_ORDER = Object.freeze(WIDGET_CATALOG.map((item) => item.id));
const DEFAULT_WIDGET_VISIBLE = Object.freeze(["today", "plan", "changes"]);
const WIDGET_ID_SET = new Set(DEFAULT_WIDGET_ORDER);
const WIDGET_SIZE_ORDER = Object.freeze(["small", "medium", "large"]);
const WIDGET_SIZE_SET = new Set(WIDGET_SIZE_ORDER);
const DEFAULT_WIDGET_SIZES = Object.freeze({
  today: "medium",
  plan: "small",
  changes: "small",
  checkpoint: "small",
});
const WIDGET_SIZE_LABELS = Object.freeze({ small: "小", medium: "中", large: "大" });

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

function widgetIdFromAnchor(anchor, index) {
  const href = String(anchor?.getAttribute("href") || "");
  if (href.startsWith("#/plan")) return "plan";
  if (href.startsWith("#/history")) return "changes";
  if (index === 0 || anchor?.classList.contains("mobile-home-widget--wide")) return "today";
  return "";
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

function readWidgetLayout() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(WIDGET_STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") {
      return { order: [...DEFAULT_WIDGET_ORDER], visible: [...DEFAULT_WIDGET_VISIBLE], sizes: { ...DEFAULT_WIDGET_SIZES } };
    }
    const storedOrder = Array.isArray(parsed.order) ? parsed.order.map(String).filter((id) => WIDGET_ID_SET.has(id)) : [];
    const order = [...new Set(storedOrder)];
    DEFAULT_WIDGET_ORDER.forEach((id) => {
      if (!order.includes(id)) order.push(id);
    });
    const storedVisible = Array.isArray(parsed.visible) ? parsed.visible.map(String).filter((id) => WIDGET_ID_SET.has(id)) : [...DEFAULT_WIDGET_VISIBLE];
    const sizes = { ...DEFAULT_WIDGET_SIZES };
    if (parsed.sizes && typeof parsed.sizes === "object") {
      DEFAULT_WIDGET_ORDER.forEach((id) => {
        const size = String(parsed.sizes[id] || "");
        if (WIDGET_SIZE_SET.has(size)) sizes[id] = size;
      });
    }
    return { order, visible: [...new Set(storedVisible)], sizes };
  } catch {
    return { order: [...DEFAULT_WIDGET_ORDER], visible: [...DEFAULT_WIDGET_VISIBLE], sizes: { ...DEFAULT_WIDGET_SIZES } };
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

function writeWidgetLayout(widgetsContainer) {
  const widgets = [...widgetsContainer.querySelectorAll("[data-home-widget-id]")];
  const layout = {
    version: 1,
    order: widgets.map((item) => item.dataset.homeWidgetId),
    visible: widgets.filter((item) => !item.hidden).map((item) => item.dataset.homeWidgetId),
    sizes: Object.fromEntries(widgets.map((item) => [item.dataset.homeWidgetId, item.dataset.homeWidgetSize || DEFAULT_WIDGET_SIZES[item.dataset.homeWidgetId] || "small"])),
  };
  try {
    globalThis.localStorage?.setItem(WIDGET_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Widget persistence is optional; the default home remains usable.
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

function createCheckpointWidget(services) {
  const experience = services?.workflows?.records?.loadLatestExperience?.() || null;
  const record = experience?.record || null;
  const checkpoint = String(record?.reflectionContext?.nextCheckPoint || "").trim();
  const anchor = document.createElement("a");
  anchor.className = "mobile-home-widget";
  anchor.href = record?.id ? `#/result?recordId=${encodeURIComponent(record.id)}` : "#/record-input";
  const small = document.createElement("small");
  small.textContent = "次に確認";
  const strong = document.createElement("strong");
  strong.textContent = checkpoint || "まだありません";
  const span = document.createElement("span");
  span.textContent = checkpoint ? "前回の記録から" : "記録で残せます";
  anchor.append(small, strong, span);
  return anchor;
}

function normalizeWidgetSize(size, id) {
  const candidate = String(size || "");
  if (WIDGET_SIZE_SET.has(candidate)) return candidate;
  return DEFAULT_WIDGET_SIZES[id] || "small";
}

function applyWidgetSize(shell, size) {
  if (!shell) return;
  const id = shell.dataset.homeWidgetId || "";
  const normalized = normalizeWidgetSize(size, id);
  shell.dataset.homeWidgetSize = normalized;
  WIDGET_SIZE_ORDER.forEach((name) => shell.classList.toggle(`mobile-home-widget-shell--size-${name}`, name === normalized));
  const button = shell.querySelector("[data-home-widget-size]");
  if (button) {
    const label = WIDGET_SIZE_LABELS[normalized] || normalized;
    button.textContent = label;
    button.setAttribute("aria-label", `${WIDGET_CATALOG.find((item) => item.id === id)?.label || "ウィジェット"}のサイズを変更（現在: ${label}）`);
  }
}

function makeWidgetShell(anchor, id) {
  const shell = document.createElement("div");
  shell.className = "mobile-home-widget-shell";
  if (anchor.classList.contains("mobile-home-widget--wide")) shell.classList.add("mobile-home-widget-shell--wide");
  shell.dataset.homeWidgetId = id;
  anchor.setAttribute("draggable", "false");
  anchor.before(shell);
  shell.append(anchor);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "mobile-home-widget-remove";
  remove.dataset.homeWidgetRemove = id;
  remove.setAttribute("aria-label", `${WIDGET_CATALOG.find((item) => item.id === id)?.label || "ウィジェット"}をホームから外す`);
  remove.textContent = "−";
  shell.append(remove);

  const sizeButton = document.createElement("button");
  sizeButton.type = "button";
  sizeButton.className = "mobile-home-widget-size";
  sizeButton.dataset.homeWidgetSize = id;
  shell.append(sizeButton);
  applyWidgetSize(shell, DEFAULT_WIDGET_SIZES[id]);
  return shell;
}

function prepareWidgets(widgetsContainer, services) {
  const existingAnchors = [...widgetsContainer.children].filter((node) => node.matches?.(".mobile-home-widget"));
  existingAnchors.forEach((anchor, index) => {
    const id = widgetIdFromAnchor(anchor, index);
    if (id) makeWidgetShell(anchor, id);
  });
  if (!widgetsContainer.querySelector('[data-home-widget-id="checkpoint"]')) {
    makeWidgetShell(createCheckpointWidget(services), "checkpoint");
  }
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

function applyWidgetLayout(widgetsContainer) {
  const layout = readWidgetLayout();
  const widgets = new Map([...widgetsContainer.querySelectorAll("[data-home-widget-id]")].map((item) => [item.dataset.homeWidgetId, item]));
  layout.order.forEach((id) => {
    const widget = widgets.get(id);
    if (widget) widgetsContainer.append(widget);
  });
  widgets.forEach((widget, id) => {
    widget.hidden = !layout.visible.includes(id);
    applyWidgetSize(widget, layout.sizes?.[id]);
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

  const editButton = root.querySelector("[data-home-edit-toggle]");
  if (!editButton) return;
  let actions = root.querySelector(".mobile-home-os__edit-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "mobile-home-os__edit-actions";
    editButton.before(actions);
    actions.append(editButton);
  }
  if (!actions.querySelector("[data-home-widget-add]")) {
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "mobile-home-widget-add";
    addButton.dataset.homeWidgetAdd = "";
    addButton.setAttribute("aria-label", "ウィジェットを追加");
    addButton.textContent = "+";
    actions.prepend(addButton);
  }
}

function ensureWidgetPicker(root) {
  let overlay = root.querySelector("[data-home-widget-picker]");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.className = "mobile-home-widget-picker";
  overlay.dataset.homeWidgetPicker = "";
  overlay.hidden = true;
  overlay.innerHTML = `
    <button type="button" class="mobile-home-widget-picker__backdrop" data-home-widget-picker-close aria-label="ウィジェット追加を閉じる"></button>
    <section class="mobile-home-widget-picker__sheet" role="dialog" aria-modal="true" aria-labelledby="home-widget-picker-title">
      <header class="mobile-home-widget-picker__header">
        <h2 id="home-widget-picker-title">ウィジェットを追加</h2>
        <button type="button" data-home-widget-picker-close>閉じる</button>
      </header>
      <div class="mobile-home-widget-picker__list" data-home-widget-picker-list></div>
    </section>`;
  root.append(overlay);
  return overlay;
}

function refreshWidgetPicker(root, widgetsContainer) {
  const overlay = ensureWidgetPicker(root);
  const list = overlay.querySelector("[data-home-widget-picker-list]");
  if (!list) return;
  const visible = new Set([...widgetsContainer.querySelectorAll("[data-home-widget-id]:not([hidden])")].map((item) => item.dataset.homeWidgetId));
  const available = WIDGET_CATALOG.filter((item) => !visible.has(item.id));
  if (!available.length) {
    list.innerHTML = '<p class="mobile-home-widget-picker__empty">追加できるウィジェットはありません。</p>';
    return;
  }
  list.innerHTML = available.map((item) => `<button type="button" class="mobile-home-widget-picker__option" data-home-widget-add-id="${item.id}"><strong>${item.label}</strong><span>${item.description}</span><b aria-hidden="true">＋</b></button>`).join("");
}

function swapItems(source, target) {
  const placeholder = document.createElement("span");
  placeholder.hidden = true;
  source.replaceWith(placeholder);
  target.replaceWith(source);
  placeholder.replaceWith(target);
}

function createDragGhost(item, kind) {
  const ghost = item.cloneNode(true);
  ghost.querySelectorAll("button").forEach((button) => button.remove());
  ghost.querySelectorAll("a").forEach((anchor) => anchor.removeAttribute("href"));
  ghost.removeAttribute("href");
  ghost.removeAttribute("data-home-item-id");
  ghost.removeAttribute("data-home-widget-id");
  ghost.classList.add(kind === "widget" ? "mobile-home-widget-drag-ghost" : "mobile-home-drag-ghost");
  ghost.setAttribute("aria-hidden", "true");
  document.body.append(ghost);
  return ghost;
}

function moveGhost(ghost, clientX, clientY) {
  ghost.style.left = `${clientX}px`;
  ghost.style.top = `${clientY}px`;
}

export function bindHome(context = {}) {
  const root = document.querySelector(".mobile-home-os");
  if (!root) return null;
  const widgetsContainer = root.querySelector(".mobile-home-widgets");
  const appsContainer = root.querySelector(".mobile-home-apps");
  const dockContainer = root.querySelector(".mobile-home-dock");
  if (!widgetsContainer || !appsContainer || !dockContainer) return null;

  prepareWidgets(widgetsContainer, context.services);
  prepareItems(root);
  ensureEditControls(root);
  applyWidgetLayout(widgetsContainer);
  applyLayout(root, appsContainer, dockContainer);
  ensureWidgetPicker(root);

  let editing = false;
  let pressTimer = null;
  let pressTarget = null;
  let pressKind = "";
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let ghost = null;
  let dropItem = null;
  let suppressClickUntil = 0;

  const editButton = root.querySelector("[data-home-edit-toggle]");
  const widgetPicker = root.querySelector("[data-home-widget-picker]");

  function clearDropTarget() {
    dropItem?.classList.remove("is-home-drop-target", "is-home-widget-drop-target");
    dropItem = null;
  }

  function clearPressState() {
    pressTarget?.classList.remove("is-home-pressing");
  }

  function closeWidgetPicker() {
    if (widgetPicker) widgetPicker.hidden = true;
  }

  function openWidgetPicker() {
    refreshWidgetPicker(root, widgetsContainer);
    if (widgetPicker) widgetPicker.hidden = false;
  }

  function setEditing(next) {
    editing = Boolean(next);
    root.classList.toggle("is-home-editing", editing);
    if (editButton) {
      editButton.textContent = editing ? "完了" : "編集";
      editButton.setAttribute("aria-pressed", String(editing));
    }
    if (!editing) {
      clearDropTarget();
      closeWidgetPicker();
    }
  }

  function finishAppDrag(event, cancelled) {
    const source = pressTarget;
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
  }

  function finishWidgetDrag(event, cancelled) {
    const source = pressTarget;
    const pointTarget = cancelled ? null : document.elementFromPoint(event?.clientX ?? startX, event?.clientY ?? startY);
    const target = pointTarget?.closest?.("[data-home-widget-id]") || null;
    if (!cancelled && target && target !== source && !target.hidden) {
      target.before(source);
      writeWidgetLayout(widgetsContainer);
    } else if (!cancelled && pointTarget?.closest?.(".mobile-home-widgets")) {
      widgetsContainer.append(source);
      writeWidgetLayout(widgetsContainer);
    }
  }

  function finishDrag(event, cancelled = false) {
    if (!dragging || !pressTarget) return;
    if (pressKind === "widget") finishWidgetDrag(event, cancelled);
    else finishAppDrag(event, cancelled);

    pressTarget.classList.remove("is-home-dragging", "is-home-widget-dragging", "is-home-pressing");
    clearDropTarget();
    ghost?.remove();
    ghost = null;
    dragging = false;
    suppressClickUntil = Date.now() + 350;
    try { pressTarget.releasePointerCapture(pointerId); } catch {}
  }

  function beginDrag(target, event, kind) {
    if (!target || dragging) return;
    target.classList.remove("is-home-pressing");
    setEditing(true);
    dragging = true;
    pressTarget = target;
    pressKind = kind;
    pointerId = event.pointerId;
    target.classList.add(kind === "widget" ? "is-home-widget-dragging" : "is-home-dragging");
    ghost = createDragGhost(target, kind);
    moveGhost(ghost, event.clientX, event.clientY);
    suppressClickUntil = Date.now() + 800;
    try { target.setPointerCapture(event.pointerId); } catch {}
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
    if (event.target.closest("button")) return;
    const widget = event.target.closest("[data-home-widget-id]");
    const item = event.target.closest("[data-home-item-id]");
    const target = widget || item;
    const kind = widget ? "widget" : item ? "app" : "";
    if (!target || (event.pointerType === "mouse" && event.button !== 0)) return;
    cancelPendingPress();
    pressTarget = target;
    pressKind = kind;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    target.classList.add("is-home-pressing");
    if (editing) {
      event.preventDefault();
      beginDrag(target, event, kind);
      return;
    }
    pressTimer = setTimeout(() => beginDrag(target, event, kind), LONG_PRESS_MS);
  }

  function handlePointerMove(event) {
    if (event.pointerId !== pointerId) return;
    if (!dragging) {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > MOVE_CANCEL_PX) cancelPendingPress();
      return;
    }
    event.preventDefault();
    moveGhost(ghost, event.clientX, event.clientY);
    const selector = pressKind === "widget" ? "[data-home-widget-id]" : "[data-home-item-id]";
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(selector) || null;
    if (hit === pressTarget || hit === dropItem || hit?.hidden) return;
    clearDropTarget();
    if (hit) {
      dropItem = hit;
      dropItem.classList.add(pressKind === "widget" ? "is-home-widget-drop-target" : "is-home-drop-target");
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
    pressTarget = null;
    pressKind = "";
  }

  function handlePointerCancel(event) {
    if (event.pointerId !== pointerId) return;
    cancelPressTimer();
    if (dragging) finishDrag(event, true);
    clearPressState();
    pointerId = null;
    pressTarget = null;
    pressKind = "";
  }

  function cycleWidgetSize(id) {
    const widget = widgetsContainer.querySelector(`[data-home-widget-id="${id}"]`);
    if (!widget) return;
    const current = normalizeWidgetSize(widget.dataset.homeWidgetSize, id);
    const index = WIDGET_SIZE_ORDER.indexOf(current);
    const next = WIDGET_SIZE_ORDER[(index + 1) % WIDGET_SIZE_ORDER.length];
    applyWidgetSize(widget, next);
    writeWidgetLayout(widgetsContainer);
  }

  function removeWidget(id) {
    const widget = widgetsContainer.querySelector(`[data-home-widget-id="${id}"]`);
    if (!widget) return;
    widget.hidden = true;
    writeWidgetLayout(widgetsContainer);
    refreshWidgetPicker(root, widgetsContainer);
  }

  function addWidget(id) {
    let widget = widgetsContainer.querySelector(`[data-home-widget-id="${id}"]`);
    if (!widget && id === "checkpoint") {
      widget = makeWidgetShell(createCheckpointWidget(context.services), "checkpoint");
      widgetsContainer.append(widget);
    }
    if (!widget) return;
    widget.hidden = false;
    widget.removeAttribute("hidden");
    widget.style.removeProperty("display");
    widgetsContainer.append(widget);
    writeWidgetLayout(widgetsContainer);
    closeWidgetPicker();
  }

  function handleWidgetPickerPointerUp(event) {
    const option = event.target.closest("[data-home-widget-add-id]");
    if (!option) return;
    event.preventDefault();
    event.stopPropagation();
    addWidget(option.dataset.homeWidgetAddId);
  }

  function handleSelectStart(event) {
    if (event.target.closest('input, textarea, [contenteditable="true"]')) return;
    event.preventDefault();
  }

  function handleClick(event) {
    if (event.target.closest("[data-home-edit-toggle]")) {
      event.preventDefault();
      setEditing(!editing);
      return;
    }
    if (event.target.closest("[data-home-widget-add]")) {
      event.preventDefault();
      if (editing) openWidgetPicker();
      return;
    }
    const size = event.target.closest("[data-home-widget-size]");
    if (size) {
      event.preventDefault();
      if (editing) cycleWidgetSize(size.dataset.homeWidgetSize);
      return;
    }
    const remove = event.target.closest("[data-home-widget-remove]");
    if (remove) {
      event.preventDefault();
      if (editing) removeWidget(remove.dataset.homeWidgetRemove);
      return;
    }
    const add = event.target.closest("[data-home-widget-add-id]");
    if (add) {
      event.preventDefault();
      addWidget(add.dataset.homeWidgetAddId);
      return;
    }
    if (event.target.closest("[data-home-widget-picker-close]")) {
      event.preventDefault();
      closeWidgetPicker();
      return;
    }
    if ((event.target.closest("[data-home-item-id]") || event.target.closest("[data-home-widget-id]")) && (editing || Date.now() < suppressClickUntil)) {
      event.preventDefault();
    }
  }

  function handleContextMenu(event) {
    event.preventDefault();
  }

  function handleDragStart(event) {
    if (event.target.closest("[data-home-item-id], [data-home-widget-id]")) event.preventDefault();
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      if (widgetPicker && !widgetPicker.hidden) closeWidgetPicker();
      else if (editing) setEditing(false);
    }
  }

  widgetPicker?.addEventListener("pointerup", handleWidgetPickerPointerUp);
  root.addEventListener("pointerdown", handlePointerDown);
  root.addEventListener("pointermove", handlePointerMove, { passive: false });
  root.addEventListener("pointerup", handlePointerUp);
  root.addEventListener("pointercancel", handlePointerCancel);
  root.addEventListener("click", handleClick, true);
  root.addEventListener("contextmenu", handleContextMenu);
  root.addEventListener("selectstart", handleSelectStart);
  root.addEventListener("dragstart", handleDragStart);
  document.addEventListener("keydown", handleKeyDown);

  return () => {
    cancelPendingPress();
    ghost?.remove();
    widgetPicker?.removeEventListener("pointerup", handleWidgetPickerPointerUp);
    root.removeEventListener("pointerdown", handlePointerDown);
    root.removeEventListener("pointermove", handlePointerMove);
    root.removeEventListener("pointerup", handlePointerUp);
    root.removeEventListener("pointercancel", handlePointerCancel);
    root.removeEventListener("click", handleClick, true);
    root.removeEventListener("contextmenu", handleContextMenu);
    root.removeEventListener("selectstart", handleSelectStart);
    root.removeEventListener("dragstart", handleDragStart);
    document.removeEventListener("keydown", handleKeyDown);
  };
}

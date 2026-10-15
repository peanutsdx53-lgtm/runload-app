import { HOME_APP_CATALOG, WIDGET_CATALOG } from "./mobileHomeLayoutState.js";

export function ensureEditControls(root) {
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
    addButton.setAttribute("aria-label", "ホームに追加");
    addButton.textContent = "+";
    actions.prepend(addButton);
  }
}

export function ensureWidgetPicker(root) {
  let overlay = root.querySelector("[data-home-widget-picker]");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.className = "mobile-home-widget-picker";
  overlay.dataset.homeWidgetPicker = "";
  overlay.hidden = true;
  overlay.innerHTML = `
    <button type="button" class="mobile-home-widget-picker__backdrop" data-home-widget-picker-close aria-label="ホームへの追加を閉じる"></button>
    <section class="mobile-home-widget-picker__sheet" role="dialog" aria-modal="true" aria-labelledby="home-widget-picker-title">
      <header class="mobile-home-widget-picker__header">
        <h2 id="home-widget-picker-title">ホームに追加</h2>
        <button type="button" data-home-widget-picker-close>閉じる</button>
      </header>
      <div class="mobile-home-widget-picker__list" data-home-widget-picker-list></div>
    </section>`;
  root.append(overlay);
  return overlay;
}

function appPickerIconMarkup(root, id) {
  const icon = root.querySelector(`[data-home-app-catalog] [data-home-item-id="${id}"] .mobile-home-app__icon`);
  if (!icon) return "";
  const toneClass = [...icon.classList].find((name) => name.startsWith("mobile-home-tone--")) || "mobile-home-tone--gray";
  return `<div class="mobile-home-widget-picker__app-icon ${toneClass}" aria-hidden="true">${icon.innerHTML}</div>`;
}

export function refreshWidgetPicker(root) {
  const overlay = ensureWidgetPicker(root);
  const list = overlay.querySelector("[data-home-widget-picker-list]");
  if (!list) return;
  const visibleWidgets = new Set([...root.querySelectorAll("[data-home-widget-id]:not([hidden])")].map((item) => item.dataset.homeWidgetId));
  const availableWidgets = WIDGET_CATALOG.filter((item) => !visibleWidgets.has(item.id));
  const installedApps = new Set([...root.querySelectorAll(".mobile-home-page [data-home-item-id], .mobile-home-dock [data-home-item-id]")].map((item) => item.dataset.homeItemId));
  const availableApps = HOME_APP_CATALOG.filter((item) => !installedApps.has(item.id));
  const groups = [];
  if (availableApps.length) {
    groups.push(`<p class="mobile-home-widget-picker__group-title">アプリアイコン</p>${availableApps.map((item) => `<div class="mobile-home-widget-picker__option mobile-home-widget-picker__option--app">${appPickerIconMarkup(root, item.id)}<div class="mobile-home-widget-picker__copy"><strong>${item.label}</strong><span>${item.description}</span></div><button type="button" class="mobile-home-widget-picker__add" data-home-app-add-id="${item.id}" aria-label="${item.label}をホームに追加">＋</button></div>`).join("")}`);
  }
  if (availableWidgets.length) {
    groups.push(`<p class="mobile-home-widget-picker__group-title">ウィジェット</p>${availableWidgets.map((item) => `<div class="mobile-home-widget-picker__option mobile-home-widget-picker__option--widget"><strong>${item.label}</strong><span>${item.description}</span><button type="button" class="mobile-home-widget-picker__add" data-home-widget-add-id="${item.id}" aria-label="${item.label}をホームに追加">＋</button></div>`).join("")}`);
  }
  list.innerHTML = groups.join("") || '<p class="mobile-home-widget-picker__empty">追加できる項目はありません。</p>';
}

export function swapItems(source, target) {
  const placeholder = document.createElement("span");
  placeholder.hidden = true;
  source.replaceWith(placeholder);
  target.replaceWith(source);
  placeholder.replaceWith(target);
}
export function createDragGhost(item, kind) {
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

export function moveGhost(ghost, clientX, clientY) {
  ghost.style.left = `${clientX}px`;
  ghost.style.top = `${clientY}px`;
}


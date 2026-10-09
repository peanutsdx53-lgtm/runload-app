import { escapeHtml } from "./commonComponents.js";
import { renderGuideDialog } from "./guideContent.js";
import { FEATURE_DESTINATION_GROUPS, PRIMARY_DESTINATIONS, resolveScreenContextNavigation } from "./screenArchitecture.js";

const SCREEN_TUTORIAL_BY_SCREEN = Object.freeze({
  home: "home",
  "run-measurement": "run-measurement",
  "record-input": "record-input",
  "course-library": "course-library",
  "course-editor": "course-editor",
  "gpx-analysis": "gpx-analysis",
  result: "result",
  "body-part-detail": "body-part-detail",
  "run-route": "run-route",
  history: "history",
  "interpretation-room": "interpretation-room",
  simulation: "simulation",
  plan: "plan",
  consultation: "consultation",
  "support-guidance": "support-guidance",
  reading: "reading",
  privacy: "privacy",
  settings: "settings",
  more: "more",
});

const PRIMARY_HEADER_TITLES = Object.freeze({
  home: "ホーム",
  "record-input": "記録",
  result: "結果",
  history: "履歴",
  more: "その他",
});

export function resolveHeaderTitle(currentScreen, currentLocation = null) {
  const context = resolveScreenContextNavigation(currentScreen, currentLocation);
  return context?.title || PRIMARY_HEADER_TITLES[currentScreen] || "走行記録";
}

export function renderContextHelpButton(currentScreen, className = "") {
  const tutorialId = SCREEN_TUTORIAL_BY_SCREEN[currentScreen] || "";
  const classes = ["context-help-button", "app-utility-button", className].filter(Boolean).join(" ");
  const content = '<span class="app-utility-button__question" aria-hidden="true">?</span>';
  if (tutorialId) {
    return `<button type="button" class="${classes}" data-screen-tutorial-start="${escapeHtml(tutorialId)}" aria-label="使い方を見る">${content}</button>`;
  }
  return `<button type="button" class="${classes}" data-open-guide="first-use" aria-label="アプリ説明を開く">${content}</button>`;
}

function menuIcon() {
  return '<svg class="app-utility-button__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 7h14M5 12h14M5 17h14"/></svg>';
}

const PRIMARY_SECTION_BY_SCREEN = Object.freeze({
  "course-library": "record-input",
  "course-editor": "record-input",
  "gpx-analysis": "record-input",
  "body-part-detail": "result",
  "run-route": "result",
  "body-timeline": "result",
  "interpretation-room": "result",
  simulation: "result",
  plan: "home",
  reading: "more",
  consultation: "more",
  "support-guidance": "more",
  privacy: "more",
  terms: "more",
  about: "more",
  settings: "more",
});

function navigationHref(item) {
  return `#/${item.screen}`;
}

function primaryNavigationIcon(screen) {
  const glyphs = Object.freeze({ home: "⌂", "record-input": "＋", result: "◉", history: "▤", more: "•••" });
  const paths = {
    home: '<path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4Z"/>',
    "record-input": '<path d="M5 19h4l10-10-4-4L5 15v4Zm9-13 4 4"/>',
    result: '<path d="M5 19V9m7 10V5m7 14v-7"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6M12 8v4l3 2"/>',
    more: '<circle cx="6" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18" cy="12" r="1.7"/>',
  };
  return `<span class="primary-navigation__glyph" aria-hidden="true">${escapeHtml(glyphs[screen] || glyphs.more)}</span><svg class="primary-navigation__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[screen] || paths.more}</svg>`;
}

export function renderPrimaryNavigation({ currentScreen, currentLocation, hasResult = false }) {
  const activeScreen = resolveCurrentPrimaryScreen(currentScreen, currentLocation);
  const items = PRIMARY_DESTINATIONS.map((item) => {
    const current = item.screen === activeScreen;
    const className = `primary-navigation__link${current ? " is-current" : ""}`;
    const content = `${primaryNavigationIcon(item.screen)}<span class="primary-navigation__label">${escapeHtml(item.label)}</span>`;
    if (item.requiresRecord && !hasResult) {
      return `<span class="${className} is-disabled" aria-disabled="true" data-navigation-screen="${escapeHtml(item.screen)}"${current ? ' aria-current="page"' : ""}>${content}</span>`;
    }
    if (current) return `<span class="${className}" data-navigation-screen="${escapeHtml(item.screen)}" aria-current="page">${content}</span>`;
    return `<a class="${className}" href="#/${escapeHtml(item.screen)}" data-navigation-screen="${escapeHtml(item.screen)}">${content}</a>`;
  }).join("");
  return `<nav class="primary-navigation" aria-label="主な機能">${items}</nav>`;
}

export function resolveCurrentPrimaryScreen(currentScreen, currentLocation = null) {
  const parameter = (name) => String(currentLocation?.parameters?.get?.(name) || "");
  if (["course-library", "course-editor", "gpx-analysis"].includes(currentScreen)) {
    const returnTo = parameter("returnTo");
    if (returnTo.startsWith("#/plan")) return "home";
    if (returnTo.startsWith("#/simulation")) return "result";
    return "record-input";
  }
  if (currentScreen === "body-timeline" && parameter("from") === "history") return "history";
  if (currentScreen === "simulation") {
    const from = parameter("from");
    if (from === "history") return "history";
    if (from === "plan") return parameter("returnTo").includes("from=interpretation-room") ? "result" : "home";
    return "result";
  }
  if (["plan", "consultation", "reading"].includes(currentScreen) && parameter("from") === "interpretation-room") return "result";
  if (currentScreen === "consultation" && parameter("recordId")) return "result";
  if (currentScreen === "reading" && parameter("origin") === "result-condition") return "result";
  if (currentScreen === "support-guidance") {
    const returnTo = parameter("returnTo");
    if (returnTo.startsWith("#/record-input")) return "record-input";
    if (returnTo.startsWith("#/consultation") && returnTo.includes("recordId=")) return "result";
  }
  return PRIMARY_SECTION_BY_SCREEN[currentScreen] || currentScreen;
}

function renderFeatureMenuLink(item, currentScreen, hasResult) {
  const current = item.screen === currentScreen;
  const status = item.requiresRecord && !hasResult ? "記録後" : "";
  const description = current ? "開いています" : status || item.description || "";
  const labelHtml = `<span class="feature-menu__item-title">${escapeHtml(item.label)}</span><span class="feature-menu__item-description">${escapeHtml(description)}</span>`;
  const itemClass = item.primaryNavigationDuplicate ? " feature-menu__link--primary-duplicate" : "";
  if (current) {
    return `<span class="feature-menu__link${itemClass} is-current feature-menu__link--current" data-navigation-screen="${escapeHtml(item.screen)}" aria-current="page">${labelHtml}</span>`;
  }
  if (item.requiresRecord && !hasResult) {
    return `<span class="feature-menu__link${itemClass} is-disabled" aria-disabled="true" data-navigation-screen="${escapeHtml(item.screen)}" aria-label="${escapeHtml(`${item.label}: 記録後に開けます`)}">${labelHtml}</span>`;
  }
  return `<a class="feature-menu__link${itemClass}" href="${escapeHtml(navigationHref(item))}" data-navigation-screen="${escapeHtml(item.screen)}" aria-label="${escapeHtml(`${item.label}: ${item.description || ""}`)}">${labelHtml}</a>`;
}

function renderFeatureMenuGroup(label, items, currentScreen, hasResult, extraClass = "") {
  const primaryClass = items.every((item) => item.primaryNavigationDuplicate) ? " feature-menu__group--primary-duplicate-only" : "";
  const groupClass = `${primaryClass}${extraClass ? ` ${extraClass}` : ""}`;
  return `<section class="feature-menu__group${groupClass}" aria-label="${escapeHtml(label)}"><p class="feature-menu__group-label">${escapeHtml(label)}</p><div class="feature-menu__links">${items.map((item) => renderFeatureMenuLink(item, currentScreen, hasResult)).join("")}</div></section>`;
}

export function renderFeatureMenu({ currentScreen, hasResult, idSuffix = "global" }) {
  const buttonId = `feature-menu-button-${idSuffix}`;
  const panelId = `feature-menu-panel-${idSuffix}`;
  const titleId = `feature-menu-title-${idSuffix}`;
  const groupedDestinations = FEATURE_DESTINATION_GROUPS.map((group) => renderFeatureMenuGroup(group.label, group.items, currentScreen, hasResult)).join("");
  const guideEntry = `<section class="feature-menu__group feature-menu__group--guide" aria-label="説明"><p class="feature-menu__group-label">使い方</p><div class="feature-menu__links"><button type="button" class="feature-menu__link feature-menu__link--button" data-open-guide="first-use"><span class="feature-menu__item-title">アプリ説明</span><span class="feature-menu__item-description">使い方・結果・履歴・限界を確認</span></button></div></section>`;
  return `<div class="feature-menu" data-feature-menu><button type="button" id="${escapeHtml(buttonId)}" class="app-menu-button app-utility-button" aria-label="メニューを開く" aria-haspopup="true" aria-expanded="false" aria-controls="${escapeHtml(panelId)}">${menuIcon()}<span class="visually-hidden">メニュー</span></button><div id="${escapeHtml(panelId)}" class="feature-menu__panel" role="dialog" aria-modal="false" aria-labelledby="${escapeHtml(titleId)}" hidden><header class="feature-menu__header"><p>メニュー</p><strong id="${escapeHtml(titleId)}">移動先を選ぶ</strong></header><nav class="feature-menu__nav" aria-label="その他の機能">${groupedDestinations}${guideEntry}</nav></div></div>`;
}


export function renderImmersiveHeader({ currentScreen, currentLocation, hasResult = false }) {
  const context = resolveScreenContextNavigation(currentScreen, currentLocation) || { backHref: "#/home", backLabel: "ホーム", title: "今回を見比べる" };
  const title = resolveHeaderTitle(currentScreen, currentLocation);
  return `<header class="interpretation-room-header"><a class="interpretation-room-header__back" href="${escapeHtml(context.backHref)}">‹ ${escapeHtml(context.backLabel)}</a><strong class="interpretation-room-header__title">${escapeHtml(title)}</strong><div class="interpretation-room-header__actions" aria-label="操作">${renderContextHelpButton(currentScreen, "context-help-button--immersive")}${renderFeatureMenu({ currentScreen, hasResult, idSuffix: "immersive" })}</div></header>`;
}

export function renderShellLayers({ currentScreen, guide = {}, onboardingMarkup = "" }) {
  return `${renderGuideDialog({
    open: Boolean(guide.open),
    section: guide.section,
    currentScreen,
    firstVisit: Boolean(guide.firstVisit),
  })}${onboardingMarkup}`;
}

export function focusScreenHeading() {
  const heading = document.querySelector("#main-content h1");
  if (!heading) return;
  heading.setAttribute("tabindex", "-1");
  heading.focus();
}

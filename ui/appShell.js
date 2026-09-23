import { escapeHtml } from "./commonComponents.js";
import { renderGuideDialog } from "./guideContent.js";
import { FEATURE_DESTINATION_GROUPS, PRIMARY_DESTINATIONS, resolveScreenContextNavigation } from "./screenArchitecture.js";

const TOPBAR_CONTEXT_LABELS = Object.freeze({
  home: "HOME",
  "record-input": "RECORD",
  "course-library": "RECORD",
  "course-editor": "RECORD",
  "gpx-analysis": "RECORD",
  result: "RESULT",
  "body-part-detail": "RESULT / REGION",
  "run-route": "RESULT / ROUTE",
  history: "HISTORY",
  "interpretation-room": "RESULT REVIEW",
  simulation: "SIMULATION",
  plan: "HOME",
  consultation: "MORE",
  "support-guidance": "MORE",
  reading: "MORE",
  privacy: "MORE",
  settings: "MORE",
  more: "MORE",
});

function topbarContextLabel(screen = "", currentLocation = null) {
  const contextDerivedScreens = new Set(["plan", "consultation", "support-guidance", "reading", "privacy", "settings"]);
  const resolvedScreen = contextDerivedScreens.has(screen)
    ? resolveCurrentPrimaryScreen(screen, currentLocation)
    : screen;
  return TOPBAR_CONTEXT_LABELS[resolvedScreen] || "RUNLOAD";
}

export const PRIMARY_NAVIGATION = PRIMARY_DESTINATIONS;

const GUIDE_SECTION_BY_SCREEN = Object.freeze({
  start: "first-use",
  home: "first-use",
  "run-measurement": "record",
  "record-input": "record",
  "course-library": "record",
  "course-editor": "record",
  "gpx-analysis": "record",
  result: "result",
  "body-part-detail": "parts",
  "run-route": "result",
  history: "records",
  "interpretation-room": "result",
  simulation: "result",
  plan: "first-use",
  consultation: "safety",
  "support-guidance": "safety",
  reading: "safety",
  privacy: "safety",
  settings: "safety",
  more: "first-use",
});

const SCREEN_TUTORIAL_BY_SCREEN = Object.freeze({
  "record-input": "record-input",
  "course-library": "course-library",
  "course-editor": "course-editor",
  result: "result",
  plan: "plan",
});

function renderContextHelpButton(currentScreen, className = "") {
  const section = GUIDE_SECTION_BY_SCREEN[currentScreen] || "first-use";
  const tutorialId = SCREEN_TUTORIAL_BY_SCREEN[currentScreen] || "";
  const classes = ["context-help-button", className].filter(Boolean).join(" ");
  if (tutorialId) {
    return `<button type="button" class="${classes}" data-screen-tutorial-start="${escapeHtml(tutorialId)}" aria-label="この画面の操作ガイドを開く">?</button>`;
  }
  return `<button type="button" class="${classes}" data-open-guide="${escapeHtml(section)}" aria-label="この画面の説明を開く">?</button>`;
}

const PRIMARY_SECTION_BY_SCREEN = Object.freeze({
  "course-library": "record-input",
  "course-editor": "record-input",
  "gpx-analysis": "record-input",
  "body-part-detail": "result",
  "run-route": "result",
  "interpretation-room": "result",
  simulation: "result",
  plan: "home",
  reading: "more",
  consultation: "more",
  "support-guidance": "more",
  privacy: "more",
  settings: "more",
});

function navigationHref(item) {
  return `#/${item.screen}`;
}

export function resolveCurrentPrimaryScreen(currentScreen, currentLocation = null) {
  const parameter = (name) => String(currentLocation?.parameters?.get?.(name) || "");
  if (["course-library", "course-editor", "gpx-analysis"].includes(currentScreen)) {
    const returnTo = parameter("returnTo");
    if (returnTo.startsWith("#/plan")) return "home";
    if (returnTo.startsWith("#/simulation")) return "result";
    return "record-input";
  }
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

function navigationClassName(item, className) {
  return className;
}

function navigationIcon(screen) {
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

function renderDisabledNavigationItem(item, className, current = false) {
  const resolvedClassName = navigationClassName(item, className);
  return `<span class="${resolvedClassName} is-disabled${current ? " is-current" : ""}" aria-disabled="true" data-navigation-screen="${escapeHtml(item.screen)}"${current ? ' aria-current="page"' : ""}>${navigationIcon(item.screen)}<span class="primary-navigation__label">${escapeHtml(item.label)}</span></span>`;
}

function renderNavigationItem(item, currentScreen, className, currentLocation, hasResult, usePrimarySection = false) {
  const activeScreen = usePrimarySection ? resolveCurrentPrimaryScreen(currentScreen, currentLocation) : currentScreen;
  const current = item.screen === activeScreen;
  if (item.requiresRecord && !hasResult) return renderDisabledNavigationItem(item, className, current);
  const resolvedClassName = navigationClassName(item, className);
  const content = `${navigationIcon(item.screen)}<span class="primary-navigation__label">${escapeHtml(item.label)}</span>`;
  if (current) {
    return `<span class="${resolvedClassName} is-current" data-navigation-screen="${escapeHtml(item.screen)}" aria-current="page">${content}</span>`;
  }
  return `<a class="${resolvedClassName}" href="${escapeHtml(navigationHref(item))}" data-navigation-screen="${escapeHtml(item.screen)}">${content}</a>`;
}

function renderFeatureMenuLink(item, currentScreen, currentLocation, hasResult, usePrimarySection = false) {
  const activeScreen = usePrimarySection ? resolveCurrentPrimaryScreen(currentScreen, currentLocation) : currentScreen;
  const current = item.screen === activeScreen;
  const status = item.requiresRecord && !hasResult ? "記録後" : "";
  const description = current ? "現在の画面" : status || item.description || "";
  const labelHtml = `<span class="feature-menu__item-title">${escapeHtml(item.label)}</span><span class="feature-menu__item-description">${escapeHtml(description)}</span>`;
  const itemClass = item.desktopPrimary ? " feature-menu__link--desktop-primary" : "";
  if (current) {
    return `<span class="feature-menu__link${itemClass} is-current feature-menu__link--current" data-navigation-screen="${escapeHtml(item.screen)}" aria-current="page">${labelHtml}</span>`;
  }
  if (item.requiresRecord && !hasResult) {
    return `<span class="feature-menu__link${itemClass} is-disabled" aria-disabled="true" data-navigation-screen="${escapeHtml(item.screen)}" aria-label="${escapeHtml(`${item.label}: 記録後に開けます`)}">${labelHtml}</span>`;
  }
  return `<a class="feature-menu__link${itemClass}" href="${escapeHtml(navigationHref(item))}" data-navigation-screen="${escapeHtml(item.screen)}" aria-label="${escapeHtml(`${item.label}: ${item.description || ""}`)}">${labelHtml}</a>`;
}

function renderFeatureMenuGroup(label, items, currentScreen, currentLocation, hasResult, usePrimarySection, extraClass = "") {
  const primaryClass = items.every((item) => item.desktopPrimary) ? " feature-menu__group--desktop-primary-only" : "";
  const groupClass = `${primaryClass}${extraClass ? ` ${extraClass}` : ""}`;
  return `<section class="feature-menu__group${groupClass}" aria-label="${escapeHtml(label)}"><p class="feature-menu__group-label">${escapeHtml(label)}</p><div class="feature-menu__links">${items.map((item) => renderFeatureMenuLink(item, currentScreen, currentLocation, hasResult, usePrimarySection)).join("")}</div></section>`;
}

function renderFeatureMenu({ currentScreen, currentLocation, hasResult, idSuffix = "global" }) {
  const buttonId = `feature-menu-button-${idSuffix}`;
  const panelId = `feature-menu-panel-${idSuffix}`;
  const titleId = `feature-menu-title-${idSuffix}`;
  const groupedDestinations = FEATURE_DESTINATION_GROUPS.map((group) => renderFeatureMenuGroup(group.label, group.items, currentScreen, currentLocation, hasResult, false)).join("");
  const guideEntry = `<section class="feature-menu__group feature-menu__group--guide" aria-label="説明"><p class="feature-menu__group-label">HELP</p><div class="feature-menu__links"><button type="button" class="feature-menu__link feature-menu__link--button" data-open-guide="first-use"><span class="feature-menu__item-title">アプリ説明</span><span class="feature-menu__item-description">使い方・結果・履歴・限界を確認</span></button></div></section>`;
  return `<div class="feature-menu" data-feature-menu><button type="button" id="${escapeHtml(buttonId)}" class="app-menu-button" aria-label="画面メニューを開く" aria-haspopup="true" aria-expanded="false" aria-controls="${escapeHtml(panelId)}"><span class="app-menu-button__label">メニュー</span></button><div id="${escapeHtml(panelId)}" class="feature-menu__panel" role="dialog" aria-modal="false" aria-labelledby="${escapeHtml(titleId)}" hidden><header class="feature-menu__header"><p>画面メニュー</p><strong id="${escapeHtml(titleId)}">補助画面を開く</strong></header><nav class="feature-menu__nav" aria-label="補助画面">${groupedDestinations}${guideEntry}</nav></div></div>`;
}

export function renderDesktopHeader({ currentScreen, currentLocation, hasResult = false }) {
  return `<header class="app-header app-header--desktop app-header--viewport-fixed">
    <div class="app-screen-context" aria-label="現在の画面">
      <small>SCREEN</small>
      <strong>${escapeHtml(topbarContextLabel(currentScreen, currentLocation))}</strong>
    </div>
    <div class="app-header__actions">
      ${renderContextHelpButton(currentScreen)}
      ${renderFeatureMenu({ currentScreen, currentLocation, hasResult, idSuffix: "desktop" })}
    </div>
  </header>`;
}

function renderMobileHeader(currentScreen, currentLocation, hasResult) {
  const menu = renderFeatureMenu({ currentScreen, currentLocation, hasResult, idSuffix: "mobile" });
  const help = renderContextHelpButton(currentScreen);
  const context = resolveScreenContextNavigation(currentScreen, currentLocation);
  if (context) {
    return `<header class="mobile-topbar mobile-topbar--context"><a class="mobile-topbar__back" href="${escapeHtml(context.backHref)}">‹ ${escapeHtml(context.backLabel)}</a><strong>${escapeHtml(context.title)}</strong><div class="mobile-topbar__actions">${help}${menu}</div></header>`;
  }
  return `<header class="mobile-topbar"><a class="mobile-topbar__brand" href="#/home"><strong>RunLoad</strong><small>${escapeHtml(topbarContextLabel(currentScreen, currentLocation))}</small></a><div class="mobile-topbar__actions">${help}${menu}</div></header>`;
}

function renderImmersiveHeader(currentScreen, currentLocation) {
  const context = resolveScreenContextNavigation(currentScreen, currentLocation) || { title: "結果を整理する", backHref: "#/home", backLabel: "Home" };
  return `<header class="interpretation-room-header"><a class="interpretation-room-header__back" href="${escapeHtml(context.backHref)}">‹ ${escapeHtml(context.backLabel)}</a><strong class="interpretation-room-header__title">${escapeHtml(context.title)}</strong>${renderContextHelpButton(currentScreen, "context-help-button--immersive")}</header>`;
}

export function renderAppShell({ currentScreen, currentLocation, screenContent, hasResult = false, guide = {} }) {
  const standalone = ["start", "run-measurement"].includes(currentScreen);
  if (standalone) {
    return `
      <div class="app-shell app-shell--standalone">
        ${currentScreen === "start" ? `<div class="standalone-help-control">${renderContextHelpButton(currentScreen)}</div>` : ""}
        <main id="main-content" class="app-main" tabindex="-1">
          ${screenContent}
        </main>
        ${renderGuideDialog({
          open: Boolean(guide.open),
          section: guide.section,
          currentScreen,
          firstVisit: Boolean(guide.firstVisit),
        })}
      </div>`;
  }
  const immersive = currentScreen === "interpretation-room";
  if (immersive) {
    return `
      <div class="app-shell app-shell--immersive">
        ${renderImmersiveHeader(currentScreen, currentLocation)}
        <main id="main-content" class="app-main" tabindex="-1">
          ${screenContent}
        </main>
        ${renderGuideDialog({
          open: Boolean(guide.open),
          section: guide.section,
          currentScreen,
          firstVisit: Boolean(guide.firstVisit),
        })}
      </div>`;
  }
  return `
    <div class="app-shell">
      ${renderMobileHeader(currentScreen, currentLocation, hasResult)}

      <main id="main-content" class="app-main" tabindex="-1">
        ${screenContent}
      </main>

      <nav class="primary-navigation" aria-label="主要画面">
        ${PRIMARY_NAVIGATION.map((item) => renderNavigationItem(item, currentScreen, "primary-navigation__link", currentLocation, hasResult, true)).join("")}
      </nav>
      ${renderGuideDialog({
        open: Boolean(guide.open),
        section: guide.section,
        currentScreen,
        firstVisit: Boolean(guide.firstVisit),
      })}
    </div>`;
}

export function focusScreenHeading() {
  const heading = document.querySelector("#main-content h1");
  if (!heading) return;
  heading.setAttribute("tabindex", "-1");
  heading.focus();
}

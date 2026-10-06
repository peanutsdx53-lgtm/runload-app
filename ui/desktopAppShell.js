import { escapeHtml } from "./commonComponents.js";
import { PRIMARY_DESTINATIONS, resolveScreenContextNavigation } from "./screenArchitecture.js";
import {
  renderContextHelpButton,
  renderFeatureMenu,
  renderImmersiveHeader,
  renderPrimaryNavigation,
  renderShellLayers,
  resolveCurrentPrimaryScreen,
  resolveHeaderTitle,
} from "./appShell.js";

const PRIMARY_HEADER_TITLES = Object.freeze(Object.fromEntries(PRIMARY_DESTINATIONS.map((item) => [item.screen, item.label])));

export function resolvePlatformGuideReturnFocusSelector() {
  return "#platform-header-root .context-help-button";
}

export function renderPlatformHeader({ currentScreen, currentLocation, hasResult = false }) {
  const primary = resolveCurrentPrimaryScreen(currentScreen, currentLocation);
  const primaryTitle = PRIMARY_HEADER_TITLES[primary] || resolveHeaderTitle(currentScreen, currentLocation);
  const context = resolveScreenContextNavigation(currentScreen, currentLocation);
  const title = context?.title || primaryTitle;
  const readingArticleOpen = currentScreen === "reading" && Boolean(currentLocation?.parameters?.get?.("articleId"));
  const desktopContext = context?.backHref === "#/more" ? { ...context, backHref: "#/home", backLabel: "ホーム" } : context;
  const fallback = currentScreen !== "home" ? { backHref: "#/home", backLabel: "ホーム" } : null;
  const back = desktopContext || fallback;
  const backControl = back
    ? `<a class="app-header__back pc-global-back" href="${escapeHtml(back.backHref)}" aria-label="${escapeHtml(back.backLabel)}へ戻る"><span aria-hidden="true">←</span><span>${escapeHtml(back.backLabel)}</span></a>`
    : `<span class="app-header__back-placeholder" aria-hidden="true"></span>`;
  const titleControl = readingArticleOpen
    ? `<span class="app-header__brand app-header__screen-title" aria-hidden="true"></span>`
    : `<strong class="app-header__brand app-header__screen-title">${escapeHtml(title)}</strong>`;
  return `<header class="app-header app-header--desktop app-header--viewport-fixed"><div class="app-header__leading">${backControl}</div>${titleControl}<div class="app-header__actions" aria-label="操作">${renderContextHelpButton(currentScreen)}${renderFeatureMenu({ currentScreen, currentLocation, hasResult, idSuffix: "desktop" })}</div></header>`;
}

export function renderPlatformShell({ currentScreen, currentLocation, screenContent, hasResult = false, guide = {}, onboardingMarkup = "" }) {
  const layers = renderShellLayers({ currentScreen, guide, onboardingMarkup });
  if (currentScreen === "run-measurement") {
    return `<div class="app-shell app-shell--standalone"><main id="main-content" class="app-main" tabindex="-1">${screenContent}</main>${layers}</div>`;
  }
  if (currentScreen === "interpretation-room") {
    return `<div class="app-shell app-shell--immersive">${renderImmersiveHeader({ currentScreen, currentLocation, hasResult })}<main id="main-content" class="app-main" tabindex="-1">${screenContent}</main>${layers}</div>`;
  }
  return `<div class="app-shell"><main id="main-content" class="app-main" tabindex="-1">${screenContent}</main>${renderPrimaryNavigation({ currentScreen, currentLocation, hasResult })}${layers}</div>`;
}

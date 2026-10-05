import { escapeHtml } from "./commonComponents.js";
import { resolveScreenContextNavigation } from "./screenArchitecture.js";
import {
  renderContextHelpButton,
  renderFeatureMenu,
  renderImmersiveHeader,
  renderPrimaryNavigation,
  renderShellLayers,
  resolveHeaderTitle,
} from "./appShell.js";


function renderHeader({ currentScreen, currentLocation, hasResult = false }) {
  const menu = renderFeatureMenu({ currentScreen, currentLocation, hasResult, idSuffix: "mobile" });
  const help = renderContextHelpButton(currentScreen);
  const context = resolveScreenContextNavigation(currentScreen, currentLocation)
    || (["record-input", "result", "history"].includes(currentScreen)
      ? { backHref: "#/home", backLabel: "ホーム" }
      : null);
  const title = resolveHeaderTitle(currentScreen, currentLocation);
  const titleHtml = `<div class="mobile-topbar__brand mobile-topbar__screen-title"><strong>${escapeHtml(title)}</strong></div>`;
  if (context) {
    return `<header class="mobile-topbar mobile-topbar--context"><a class="mobile-topbar__back" href="${escapeHtml(context.backHref)}">‹ ${escapeHtml(context.backLabel)}</a>${titleHtml}<div class="mobile-topbar__actions" aria-label="画面操作">${help}${menu}</div></header>`;
  }
  return `<header class="mobile-topbar">${titleHtml}<div class="mobile-topbar__actions" aria-label="画面操作">${help}${menu}</div></header>`;
}

export function resolvePlatformGuideReturnFocusSelector() {
  return ".mobile-topbar .context-help-button";
}

export function renderPlatformHeader() {
  return "";
}

export function renderPlatformShell({ currentScreen, currentLocation, screenContent, hasResult = false, guide = {}, onboardingMarkup = "" }) {
  const standalone = currentScreen === "run-measurement";
  const layers = renderShellLayers({ currentScreen, guide, onboardingMarkup });
  if (standalone) {
    return `<div class="app-shell app-shell--standalone"><main id="main-content" class="app-main" tabindex="-1">${screenContent}</main>${layers}</div>`;
  }
  if (currentScreen === "interpretation-room") {
    return `<div class="app-shell app-shell--immersive">${renderImmersiveHeader({ currentScreen, currentLocation, hasResult })}<main id="main-content" class="app-main" tabindex="-1">${screenContent}</main>${layers}</div>`;
  }
  return `<div class="app-shell">${renderHeader({ currentScreen, currentLocation, hasResult })}<main id="main-content" class="app-main" tabindex="-1">${screenContent}</main>${renderPrimaryNavigation({ currentScreen, currentLocation, hasResult })}${layers}</div>`;
}

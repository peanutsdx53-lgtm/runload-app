const MOBILE_STYLE_GROUPS = Object.freeze([
  Object.freeze({ before: "./styles/components.css", urls: Object.freeze([
    "./styles/mobile-layout-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/screens.css", urls: Object.freeze([
    "./styles/mobile-components-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/responsive.css", urls: Object.freeze([
    "./styles/mobile-screens-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/record-screen-base.css", urls: Object.freeze([
    "./styles/mobile-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/interpretation-room.css", urls: Object.freeze([
    "./styles/mobile-screen-layouts.css",
  ]) }),
  Object.freeze({ before: "./styles/self-understanding.css", urls: Object.freeze([
    "./styles/mobile-interpretation-room-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/run-measurement.css", urls: Object.freeze([
    "./styles/mobile-self-understanding.css",
    "./styles/mobile-self-understanding-responsive.css",
    "./styles/mobile-home.css",
    "./styles/mobile-home-editing.css",
    "./styles/mobile-home-ios-editing.css",
    "./styles/mobile-home-three-row.css",
    "./styles/mobile-record.css",
  ]) }),
  Object.freeze({ before: "./styles/rof-j-visual.css", urls: Object.freeze([
    "./styles/mobile-run-measurement-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/rof-j-compact.css", urls: Object.freeze([
    "./styles/mobile-rof-j-visual-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/interpretation-room-compact.css", urls: Object.freeze([
    "./styles/mobile-rof-j-compact-responsive.css",
    "./styles/mobile-run-measurement.css",
    "./styles/mobile-run-measurement-ergonomics.css",
    "./styles/mobile-walk-jog.css",
    "./styles/mobile-walk-jog-records.css",
    "./styles/mobile-walk-jog-history.css",
    "./styles/mobile-app-screens.css",
    "./styles/mobile-quick-tools.css",
    "./styles/mobile-pace-calculator.css",
    "./styles/mobile-navigation-unification.css",
    "./styles/mobile-usability.css",
    "./styles/mobile-course.css",
    "./styles/mobile-onboarding.css",
    "./styles/mobile-achievements.css",
    "./styles/mobile-accessibility.css",
    "./styles/mobile-home-gesture.css",
    "./styles/mobile-achievements-responsive.css",
    "./styles/mobile-run-lab.css",
    "./styles/mobile-body-timeline.css",
    "./styles/mobile-run-route.css",
    "./styles/mobile-insights.css",
    "./styles/mobile-about.css",
    "./styles/mobile-home-experience.css",
  ]) }),
  Object.freeze({ before: "./styles/interpretation-loop.css", urls: Object.freeze([
    "./styles/mobile-interpretation-room-compact-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/interpretation-technical-details.css", urls: Object.freeze([
    "./styles/mobile-interpretation-loop-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/consultation-share.css", urls: Object.freeze([
    "./styles/mobile-interpretation-technical-details-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/consultation-share-print.css", urls: Object.freeze([
    "./styles/mobile-consultation-share-responsive.css",
    "./styles/mobile-home-responsive.css",
    "./styles/mobile-result-region-sheet.css",
    "./styles/mobile-body-part-detail.css",
    "./styles/mobile-history.css",
    "./styles/mobile-home-viewport-balance.css",
  ]) }),
  Object.freeze({ before: "./styles/settings-navigation.css", urls: Object.freeze([
    "./styles/consultation-share-mobile.css",
  ]) }),
]);

const DESKTOP_STYLE_GROUPS = Object.freeze([
  Object.freeze({ before: "./styles/components.css", urls: Object.freeze([
    "./styles/desktop-layout-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/screens.css", urls: Object.freeze([
    "./styles/desktop-components-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/responsive.css", urls: Object.freeze([
    "./styles/desktop-screens-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/record-screen-base.css", urls: Object.freeze([
    "./styles/desktop-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/interpretation-room.css", urls: Object.freeze([
    "./styles/desktop-foundation.css",
  ]) }),
  Object.freeze({ before: "./styles/run-measurement.css", urls: Object.freeze([
    "./styles/desktop-self-understanding.css",
    "./styles/desktop-self-understanding-responsive.css",
    "./styles/desktop-screen-layouts.css",
  ]) }),
  Object.freeze({ before: "./styles/rof-j-visual.css", urls: Object.freeze([
    "./styles/desktop-run-measurement-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/rof-j-compact.css", urls: Object.freeze([
    "./styles/desktop-rof-j-visual-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/interpretation-room-compact.css", urls: Object.freeze([
    "./styles/desktop-rof-j-compact-responsive.css",
    "./styles/desktop-ui-tokens.css",
    "./styles/desktop-first-use.css",
    "./styles/desktop-history.css",
    "./styles/desktop-simulation.css",
    "./styles/desktop-body-timeline.css",
    "./styles/desktop-interpretation-layout.css",
    "./styles/desktop-information.css",
    "./styles/desktop-consultation.css",
    "./styles/desktop-theme.css",
    "./styles/desktop-empty-states.css",
    "./styles/desktop-home-layout.css",
    "./styles/desktop-interpretation-regions.css",
    "./styles/desktop-actions.css",
    "./styles/desktop-about.css",
    "./styles/desktop-settings.css",
  ]) }),
  Object.freeze({ before: "./styles/interpretation-loop.css", urls: Object.freeze([
    "./styles/desktop-interpretation-room-compact-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/interpretation-technical-details.css", urls: Object.freeze([
    "./styles/desktop-interpretation-loop-responsive.css",
  ]) }),
  Object.freeze({ before: "./styles/consultation-share-print.css", urls: Object.freeze([
    "./styles/desktop-consultation-share-responsive.css",
  ]) }),
  Object.freeze({ before: null, urls: Object.freeze([
    "./styles/desktop-settings-navigation-responsive.css",
    "./styles/desktop-history-state.css",
    "./styles/desktop-unification.css",
    "./styles/desktop-course.css",
    "./styles/desktop-course-editor.css",
    "./styles/desktop-interpretation-details.css",
  ]) }),
]);

function flattenStyleGroups(groups) {
  return Object.freeze(groups.flatMap((group) => group.urls));
}

export const MOBILE_STYLE_URLS = flattenStyleGroups(MOBILE_STYLE_GROUPS);
export const DESKTOP_STYLE_URLS = flattenStyleGroups(DESKTOP_STYLE_GROUPS);

function findStylesheetByHref(href) {
  const target = new URL(href, document.baseURI).href;
  return [...document.querySelectorAll('link[rel="stylesheet"][href]')]
    .find((link) => link.href === target) || null;
}

function loadStylesheet(href, beforeHref) {
  const existing = findStylesheetByHref(href);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.platformStyle = "true";
    link.addEventListener("load", () => resolve(link), { once: true });
    link.addEventListener("error", () => reject(new Error(`Failed to load platform stylesheet: ${href}`)), { once: true });

    const anchor = beforeHref ? findStylesheetByHref(beforeHref) : null;
    if (anchor) document.head.insertBefore(link, anchor);
    else document.head.appendChild(link);
  });
}

async function loadStyleGroups(groups) {
  for (const group of groups) {
    await Promise.all(group.urls.map((href) => loadStylesheet(href, group.before)));
  }
}

export async function loadPlatformStyles(platform) {
  if (platform === "mobile") {
    await loadStyleGroups(MOBILE_STYLE_GROUPS);
    return;
  }
  if (platform === "desktop") {
    await loadStyleGroups(DESKTOP_STYLE_GROUPS);
    return;
  }
  throw new TypeError(`Unsupported platform: ${String(platform)}`);
}

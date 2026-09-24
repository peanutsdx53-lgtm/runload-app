import { registerPwaServiceWorker, createApplicationServices, createHistoryWorkflow } from "./core/runloadCore.js";

import { createRofJServices } from "./core/rofJCore.js";
import { createAppRouter } from "./ui/appRouter.js";
import { matchesMobileLayout, resolveViewportDefaultEntryScreen } from "./ui/deviceLayout.js";
import { focusScreenHeading, renderAppShell, renderDesktopHeader } from "./ui/appShell.js";
import { applyAppSettings } from "./ui/appSettings.js";
import { APP_GUIDE_VERSION, DEFAULT_GUIDE_SECTION, normalizeGuideSection, shouldOpenGuide, withGuideVersionSeen } from "./ui/guideContent.js";
import { bindAppShellInteractions } from "./ui/shellInteractions.js";
import { bindScreenInteractions } from "./ui/screenInteractions.js";
import { prepareUiMotion } from "./ui/uiMotion.js";
import { bindScreenTutorial } from "./ui/screenTutorial.js";
import { handleRecordInputRouteChange, resolveRecordInputReturnState } from "./ui/recordInputWorkspace.js";
import { renderStartScreen } from "./screens/startScreen.js";
import { renderHomeScreen } from "./screens/homeScreen.js";
import { renderRunMeasurementScreen } from "./screens/runMeasurementScreen.js";
import { renderRunRouteScreen } from "./screens/runRouteScreen.js";
import { renderRecordInputScreen } from "./screens/recordInputScreen.js";
import { renderCourseLibraryScreen } from "./screens/courseLibraryScreen.js";
import { renderCourseEditorScreen } from "./screens/courseEditorScreen.js";
import { renderResultScreen } from "./screens/resultScreen.js";
import { renderBodyPartDetailScreen } from "./screens/bodyPartDetailScreen.js";
import { renderHistoryScreen } from "./screens/historyScreen.js";
import { renderPlanScreen } from "./screens/planScreen.js";
import { renderConsultationScreen } from "./screens/consultationScreen.js";
import { renderReadingScreen } from "./screens/readingScreen.js";
import { renderSettingsScreen } from "./screens/settingsScreen.js";
import { renderInterpretationRoomScreen } from "./screens/interpretationRoomScreen.js";
import { renderSupportGuidanceScreen } from "./screens/supportGuidanceScreen.js";
import { renderPrivacyScreen } from "./screens/privacyScreen.js";
import { renderMoreScreen } from "./screens/moreScreen.js";
import { renderSimulationScreen } from "./screens/simulationScreen.js";
import { renderGpxAnalysisScreen } from "./screens/gpxAnalysisScreen.js";

const screenRenderers = {
  start: renderStartScreen,
  home: renderHomeScreen,
  "run-measurement": renderRunMeasurementScreen,
  "run-route": renderRunRouteScreen,
  "record-input": renderRecordInputScreen,
  "course-library": renderCourseLibraryScreen,
  "course-editor": renderCourseEditorScreen,
  result: renderResultScreen,
  "body-part-detail": renderBodyPartDetailScreen,
  history: renderHistoryScreen,
  "interpretation-room": renderInterpretationRoomScreen,
  "support-guidance": renderSupportGuidanceScreen,
  privacy: renderPrivacyScreen,
  plan: renderPlanScreen,
  consultation: renderConsultationScreen,
  reading: renderReadingScreen,
  more: renderMoreScreen,
  simulation: renderSimulationScreen,
  "gpx-analysis": renderGpxAnalysisScreen,
  settings: renderSettingsScreen,
};

const appRoot = document.getElementById("app");
const desktopHeaderRoot = document.getElementById("desktop-header-root");
const baseApplicationServices = createApplicationServices();
const fatigue = createRofJServices({
  gateway: baseApplicationServices.storage.gateway,
  recordsRepository: baseApplicationServices.storage.records,
});
const linkedHistoryWorkflow = createHistoryWorkflow({
  gateway: baseApplicationServices.storage.gateway,
  recordsRepository: baseApplicationServices.storage.records,
  modelResultV27Repository: baseApplicationServices.storage.modelResultsV27,
  modelResultRegionalV2Repository: baseApplicationServices.storage.modelResultsRegionalV2,
  subjectiveFeedbackRepository: baseApplicationServices.storage.subjectiveFeedback,
  planRepository: baseApplicationServices.storage.plans,
  secondPillarRofJRepository: fatigue.repository,
  secondPillarLifecycleRepository: fatigue.lifecycle,
});
const applicationServices = Object.freeze({
  ...baseApplicationServices,
  fatigue,
  workflows: Object.freeze({ ...baseApplicationServices.workflows, history: linkedHistoryWorkflow }),
});
const initialSettings = applicationServices.storage.settings.load();
applyAppSettings(initialSettings);
const initialScreen = resolveViewportDefaultEntryScreen();
let currentLocation = Object.freeze({ screen: initialScreen, parameters: new URLSearchParams() });
let guideOpen = shouldOpenGuide(initialSettings);
let guideSection = DEFAULT_GUIDE_SECTION;
let guideFirstVisit = guideOpen;
let router;

function saveGuideVersionSeen() {
  const currentSettings = applicationServices.storage.settings.load();
  applicationServices.storage.settings.save(withGuideVersionSeen(currentSettings));
}

function renderCurrentLocation({ focusHeading = true, focusSelector = "" } = {}) {
  applyAppSettings(applicationServices.storage.settings.load());
  const screenName = currentLocation.screen;
  document.body.classList.toggle("course-derived-open", ["course-library", "course-editor", "gpx-analysis"].includes(screenName));
  document.body.classList.toggle("run-standalone-open", ["start", "run-measurement"].includes(screenName));
  document.body.classList.toggle("secondary-derived-open", ["plan", "consultation", "support-guidance", "reading", "privacy", "settings"].includes(screenName));
  const recordInputReturnState = screenName === "record-input"
    ? resolveRecordInputReturnState(currentLocation)
    : null;
  const renderSelectedScreen = screenRenderers[screenName] ?? screenRenderers.home;
  const latestExperience = applicationServices.workflows.records.loadLatestExperience();
  if (desktopHeaderRoot) {
    desktopHeaderRoot.innerHTML = ["interpretation-room", "start", "run-measurement"].includes(screenName)
      ? ""
      : renderDesktopHeader({
          currentScreen: screenName,
          currentLocation,
          hasResult: Boolean(latestExperience),
        });
  }

  appRoot.innerHTML = renderAppShell({
    currentScreen: screenName,
    currentLocation,
    hasResult: Boolean(latestExperience),
    guide: {
      open: guideOpen,
      section: guideSection,
      firstVisit: guideFirstVisit,
      version: APP_GUIDE_VERSION,
    },
    screenContent: renderSelectedScreen({
      services: applicationServices,
      context: currentLocation,
    }),
  });
  document.body.classList.toggle("has-open-dialog", guideOpen);
  document.title = `${document.querySelector("#main-content h1")?.textContent ?? "走行記録"} — 走行記録`;
  prepareUiMotion(appRoot, { screenName });

  const shellInteractionCallbacks = {
    onOpenGuide: (section) => {
      guideOpen = true;
      guideFirstVisit = false;
      guideSection = normalizeGuideSection(section);
      renderCurrentLocation({ focusHeading: false });
    },
    onCloseGuide: () => {
      saveGuideVersionSeen();
      guideOpen = false;
      guideFirstVisit = false;
      const focusSelector = currentLocation.screen === "start"
        ? ".run-launch__top .context-help-button"
        : currentLocation.screen === "interpretation-room"
          ? ".interpretation-room-header .context-help-button"
          : matchesMobileLayout()
            ? ".mobile-topbar .context-help-button"
            : "#desktop-header-root .context-help-button";
      renderCurrentLocation({ focusHeading: false, focusSelector });
    },
    onSelectGuideSection: (section) => {
      guideSection = normalizeGuideSection(section);
      renderCurrentLocation({ focusHeading: false, focusSelector: `#guide-tab-${guideSection}` });
    },
  };
  bindAppShellInteractions({ root: appRoot, ...shellInteractionCallbacks });
  if (desktopHeaderRoot?.firstElementChild) {
    bindAppShellInteractions({ root: desktopHeaderRoot, ...shellInteractionCallbacks });
  }
  bindScreenInteractions({
    screenName,
    services: applicationServices,
    router,
    context: currentLocation,
    returnState: recordInputReturnState,
    rerender: () => renderCurrentLocation({ focusHeading: false }),
  });
  bindScreenTutorial({ root: appRoot, screenName });
  if (desktopHeaderRoot?.firstElementChild) {
    bindScreenTutorial({ root: desktopHeaderRoot, screenName });
  }

  window.requestAnimationFrame(() => {
    const requestedFocusSelector = focusSelector || recordInputReturnState?.focusSelector || "";
    if (requestedFocusSelector) {
      const focusTarget = document.querySelector(requestedFocusSelector);
      if (focusTarget) {
        focusTarget.focus();
        return;
      }
    }
    if (guideOpen) {
      document.querySelector("[data-guide-panel]")?.focus();
      return;
    }
    if (focusHeading) focusScreenHeading();
  });
}

function renderScreen(location) {
  handleRecordInputRouteChange(currentLocation.screen, location.screen);
  currentLocation = location;
  renderCurrentLocation();
}

const RESUME_SCROLL_SURFACE_SELECTOR = [
  ".course-derived-screen .course-derived-body",
  ".screen-layout--record .subscreen",
  ".screen-layout--record .sheet",
  ".screen-layout--result .detail-screen",
  ".screen-layout--result .region-sheet",
  ".screen-layout--history .region-sheet",
  ".screen-layout--reading .sheet",
  ".feature-menu__panel",
  ".guide-dialog__body",
  ".screen-tutorial__panel",
].join(",");

function reconcileTransientBodyState() {
  const blockingDialogOpen = Boolean(document.querySelector(".guide-dialog, .screen-tutorial"));
  document.body.classList.toggle("has-open-dialog", blockingDialogOpen);

  const recordOverlayOpen = Boolean(document.querySelector("[data-record-rof-overlay]:not([hidden])"));
  document.body.classList.toggle("record-overlay-open", recordOverlayOpen);

  const recordSubflowOpen = Boolean(document.querySelector("[data-record-subflow]:not([hidden])"));
  document.body.classList.toggle("record-subflow-open", recordSubflowOpen);
}

function isVisibleScrollSurface(element) {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return element.getClientRects().length > 0;
}

function refreshScrollSurface(element) {
  if (!isVisibleScrollSurface(element)) return;
  const style = window.getComputedStyle(element);
  if (![style.overflow, style.overflowY].some((value) => value === "auto" || value === "scroll")) return;

  const scrollTop = element.scrollTop;
  const scrollLeft = element.scrollLeft;
  const previousOverflowY = element.style.overflowY;
  element.style.overflowY = "hidden";
  void element.offsetHeight;
  window.requestAnimationFrame(() => {
    element.style.overflowY = previousOverflowY;
    element.scrollTop = scrollTop;
    element.scrollLeft = scrollLeft;
  });
}

function refreshDocumentScrollSurface() {
  if (document.body.classList.contains("has-open-dialog")) return;
  const root = document.scrollingElement;
  if (!(root instanceof HTMLElement)) return;

  const scrollTop = root.scrollTop;
  const scrollLeft = root.scrollLeft;
  const previousOverflowY = root.style.overflowY;
  root.style.overflowY = "hidden";
  void root.offsetHeight;
  window.requestAnimationFrame(() => {
    root.style.overflowY = previousOverflowY;
    root.scrollTop = scrollTop;
    root.scrollLeft = scrollLeft;
  });
}

let resumeRecoveryFrame = 0;
function reconcileAfterAppResume() {
  if (resumeRecoveryFrame) window.cancelAnimationFrame(resumeRecoveryFrame);
  resumeRecoveryFrame = window.requestAnimationFrame(() => {
    resumeRecoveryFrame = 0;
    reconcileTransientBodyState();
    document.querySelectorAll(RESUME_SCROLL_SURFACE_SELECTOR).forEach(refreshScrollSurface);
    refreshDocumentScrollSurface();
  });
}

window.addEventListener("pageshow", reconcileAfterAppResume);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") reconcileAfterAppResume();
});

router = createAppRouter({
  availableScreens: Object.keys(screenRenderers),
  defaultScreen: initialScreen,
  onScreenChange: renderScreen,
});

router.start();
registerPwaServiceWorker();

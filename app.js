import { registerPwaServiceWorker } from "./core/runloadCore.js";
import { createApplicationServices, createHistoryWorkflow } from "./core/runloadCore.js";
import { createSecondPillarRofJServices } from "./core/secondPillarRofJ.js";
import { createAppRouter } from "./ui/appRouter.js";
import { focusScreenHeading, renderAppShell } from "./ui/appShell.js";
import { applyJournalSettings } from "./ui/appSettings.js";
import { APP_GUIDE_VERSION, DEFAULT_GUIDE_SECTION, normalizeGuideSection, shouldOpenGuide, withGuideVersionSeen } from "./ui/guideContent.js";
import { bindAppShellInteractions } from "./ui/shellInteractions.js";
import { bindScreenInteractions } from "./ui/screenInteractions.js";
import { prepareUiMotion } from "./ui/uiMotion.js";
import { bindScreenTutorial } from "./ui/screenTutorial.js";
import { handleRecordInputRouteChange, resolveRecordInputReturnState } from "./ui/recordInputWorkspace.js";
import { renderHomeScreen } from "./screens/homeScreen.js";
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
import { renderActivationScreen } from "./screens/activationScreen.js";
import { renderInterpretationRoomScreen } from "./screens/interpretationRoomScreen.js";
import { renderSupportGuidanceScreen } from "./screens/supportGuidanceScreen.js";
import { renderPrivacyScreen } from "./screens/privacyScreen.js";
import { renderMoreScreen } from "./screens/moreScreen.js";
import { renderSimulationScreen } from "./screens/simulationScreen.js";
import { renderGpxAnalysisScreen } from "./screens/gpxAnalysisScreen.js";

const screenRenderers = {
  home: renderHomeScreen,
  "record-input": renderRecordInputScreen,
  "course-library": renderCourseLibraryScreen,
  "course-editor": renderCourseEditorScreen,
  result: renderResultScreen,
  "body-part-detail": renderBodyPartDetailScreen,
  history: renderHistoryScreen,
  activation: renderActivationScreen,
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

const routeAliases = Object.freeze({});

const appRoot = document.getElementById("app");
const baseApplicationServices = createApplicationServices();
const secondPillar = createSecondPillarRofJServices({
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
  secondPillarRofJRepository: secondPillar.repository,
  secondPillarLifecycleRepository: secondPillar.lifecycle,
});
const applicationServices = Object.freeze({
  ...baseApplicationServices,
  secondPillar,
  workflows: Object.freeze({ ...baseApplicationServices.workflows, history: linkedHistoryWorkflow }),
});
const initialSettings = applicationServices.storage.settings.load();
applyJournalSettings(initialSettings);
let currentLocation = Object.freeze({ screen: "home", parameters: new URLSearchParams() });
let guideOpen = shouldOpenGuide(initialSettings);
let guideSection = DEFAULT_GUIDE_SECTION;
let guideFirstVisit = guideOpen;
let router;

function saveGuideVersionSeen() {
  const currentSettings = applicationServices.storage.settings.load();
  applicationServices.storage.settings.save(withGuideVersionSeen(currentSettings));
}

function renderCurrentLocation({ focusHeading = true, focusSelector = "" } = {}) {
  applyJournalSettings(applicationServices.storage.settings.load());
  const screenName = currentLocation.screen;
  const recordInputReturnState = screenName === "record-input"
    ? resolveRecordInputReturnState(currentLocation)
    : null;
  const renderSelectedScreen = screenRenderers[screenName] ?? screenRenderers.home;
  const latestExperience = applicationServices.workflows.records.loadLatestExperience();
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
  document.title = `${document.querySelector("#main-content h1")?.textContent ?? "RunLoad Journal"} — RunLoad Journal`;
  prepareUiMotion(appRoot, { screenName });

  bindAppShellInteractions({
    root: appRoot,
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
      renderCurrentLocation({ focusHeading: false, focusSelector: "#feature-menu-button" });
    },
    onSelectGuideSection: (section) => {
      guideSection = normalizeGuideSection(section);
      renderCurrentLocation({ focusHeading: false, focusSelector: `#guide-tab-${guideSection}` });
    },
  });
  bindScreenInteractions({
    screenName,
    services: applicationServices,
    router,
    context: currentLocation,
    returnState: recordInputReturnState,
    rerender: () => renderCurrentLocation({ focusHeading: false }),
  });
  bindScreenTutorial({ root: appRoot, screenName });

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
  ".prototype-parity--course .editor",
  ".prototype-parity--record .subscreen",
  ".prototype-parity--record .sheet",
  ".prototype-parity--result .detail-screen",
  ".prototype-parity--result .region-sheet",
  ".prototype-parity--history .region-sheet",
  ".prototype-parity--reading .sheet",
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
  routeAliases,
  onScreenChange: renderScreen,
});

router.start();
registerPwaServiceWorker();

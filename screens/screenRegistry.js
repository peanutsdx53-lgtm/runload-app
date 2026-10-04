import { renderHomeScreen } from "./homeScreen.js";
import { renderRunMeasurementScreen } from "./mobile/runMeasurementScreen.js";
import { renderRunRouteScreen } from "./runRouteScreen.js";
import { renderBodyTimelineScreen } from "./bodyTimelineScreen.js";
import { renderRecordInputScreen } from "./recordInputScreen.js";
import { renderCourseLibraryScreen as renderDesktopCourseLibraryScreen } from "./desktop/courseLibraryScreen.js";
import { renderCourseLibraryScreen as renderMobileCourseLibraryScreen } from "./mobile/courseLibraryScreen.js";
import { renderCourseEditorScreen as renderDesktopCourseEditorScreen } from "./desktop/courseEditorScreen.js";
import { renderCourseEditorScreen as renderMobileCourseEditorScreen } from "./mobile/courseEditorScreen.js";
import { renderResultScreen } from "./resultScreen.js";
import { renderBodyPartDetailScreen } from "./bodyPartDetailScreen.js";
import { renderHistoryScreen } from "./historyScreen.js";
import { renderPlanScreen } from "./planScreen.js";
import { renderConsultationScreen } from "./consultationScreen.js";
import { renderReadingScreen } from "./readingScreen.js";
import { renderSettingsScreen } from "./settingsScreen.js";
import { renderInterpretationRoomScreen } from "./interpretationRoomScreen.js";
import { renderSupportGuidanceScreen } from "./shared/supportGuidanceScreen.js";
import { renderPrivacyScreen } from "./shared/privacyScreen.js";
import { renderTermsScreen } from "./shared/termsScreen.js";
import { renderAboutScreen } from "./shared/aboutScreen.js";
import { renderMoreScreen as renderDesktopMoreScreen } from "./desktop/moreScreen.js";
import { renderSimulationScreen } from "./simulationScreen.js";
import { renderGpxAnalysisScreen as renderDesktopGpxAnalysisScreen } from "./desktop/gpxAnalysisScreen.js";
import { renderGpxAnalysisScreen as renderMobileGpxAnalysisScreen } from "./mobile/gpxAnalysisScreen.js";
import {
  renderLocationNoteScreen,
  renderQuickNoteScreen,
  renderGearNoteScreen,
  renderDepartureCheckScreen,
  renderFuelNoteScreen,
} from "./mobile/quickToolsScreen.js";
import { renderPhotoMemoScreen } from "./mobile/photoMemoScreen.js";
import { renderPaceCalculatorScreen } from "./mobile/paceCalculatorScreen.js";
import { renderAchievementsScreen } from "./mobile/achievementsScreen.js";

export const SHARED_SCREEN_RENDERERS = Object.freeze({
  home: renderHomeScreen,
  "run-route": renderRunRouteScreen,
  "body-timeline": renderBodyTimelineScreen,
  "record-input": renderRecordInputScreen,
  result: renderResultScreen,
  "body-part-detail": renderBodyPartDetailScreen,
  history: renderHistoryScreen,
  "interpretation-room": renderInterpretationRoomScreen,
  "support-guidance": renderSupportGuidanceScreen,
  privacy: renderPrivacyScreen,
  terms: renderTermsScreen,
  about: renderAboutScreen,
  plan: renderPlanScreen,
  consultation: renderConsultationScreen,
  reading: renderReadingScreen,
  simulation: renderSimulationScreen,
  settings: renderSettingsScreen,
});

export const DESKTOP_SCREEN_RENDERERS = Object.freeze({
  "course-library": renderDesktopCourseLibraryScreen,
  "course-editor": renderDesktopCourseEditorScreen,
  more: renderDesktopMoreScreen,
  "gpx-analysis": renderDesktopGpxAnalysisScreen,
});

export const MOBILE_SCREEN_RENDERERS = Object.freeze({
  "course-library": renderMobileCourseLibraryScreen,
  "course-editor": renderMobileCourseEditorScreen,
  "gpx-analysis": renderMobileGpxAnalysisScreen,
  "run-measurement": renderRunMeasurementScreen,
  "location-note": renderLocationNoteScreen,
  "quick-note": renderQuickNoteScreen,
  "gear-note": renderGearNoteScreen,
  "departure-check": renderDepartureCheckScreen,
  "fuel-note": renderFuelNoteScreen,
  "photo-note": renderPhotoMemoScreen,
  "pace-tool": renderPaceCalculatorScreen,
  achievements: renderAchievementsScreen,
});

export function createScreenRenderers({ mobile = false } = {}) {
  return Object.freeze({
    ...SHARED_SCREEN_RENDERERS,
    ...(mobile ? MOBILE_SCREEN_RENDERERS : DESKTOP_SCREEN_RENDERERS),
  });
}

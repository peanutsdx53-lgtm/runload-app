import { renderHomeScreen } from "./homeScreen.js";
import { renderRunMeasurementScreen } from "./runMeasurementScreen.js";
import { renderRunRouteScreen } from "./runRouteScreen.js";
import { renderBodyTimelineScreen } from "./bodyTimelineScreen.js";
import { renderRecordInputScreen } from "./recordInputScreen.js";
import { renderCourseLibraryScreen } from "./courseLibraryScreen.js";
import { renderCourseEditorScreen } from "./courseEditorScreen.js";
import { renderResultScreen } from "./resultScreen.js";
import { renderBodyPartDetailScreen } from "./bodyPartDetailScreen.js";
import { renderHistoryScreen } from "./historyScreen.js";
import { renderPlanScreen } from "./planScreen.js";
import { renderConsultationScreen } from "./consultationScreen.js";
import { renderReadingScreen } from "./readingScreen.js";
import { renderSettingsScreen } from "./settingsScreen.js";
import { renderInterpretationRoomScreen } from "./interpretationRoomScreen.js";
import { renderSupportGuidanceScreen } from "./supportGuidanceScreen.js";
import { renderPrivacyScreen } from "./privacyScreen.js";
import { renderTermsScreen } from "./termsScreen.js";
import { renderAboutScreen } from "./aboutScreen.js";
import { renderMoreScreen } from "./moreScreen.js";
import { renderSimulationScreen } from "./simulationScreen.js";
import { renderGpxAnalysisScreen } from "./gpxAnalysisScreen.js";
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
  "course-library": renderCourseLibraryScreen,
  "course-editor": renderCourseEditorScreen,
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
  more: renderMoreScreen,
  simulation: renderSimulationScreen,
  "gpx-analysis": renderGpxAnalysisScreen,
  settings: renderSettingsScreen,
});

export const MOBILE_SCREEN_RENDERERS = Object.freeze({
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
    ...(mobile ? MOBILE_SCREEN_RENDERERS : {}),
  });
}

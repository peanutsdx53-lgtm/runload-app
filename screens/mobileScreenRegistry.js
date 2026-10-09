import { renderReadingScreen } from "./mobile/readingScreen.js";
import { renderInterpretationRoomScreen } from "./mobile/interpretationRoomScreen.js";
import { renderBodyPartDetailScreen } from "./mobile/bodyPartDetailScreen.js";
import { renderRecordInputScreen } from "./mobile/recordInputScreen.js";
import { renderHistoryScreen } from "./mobile/historyScreen.js";
import { renderResultScreen } from "./mobile/resultScreen.js";
import { renderSimulationScreen } from "./mobile/simulationScreen.js";
import { renderPlanScreen } from "./mobile/planScreen.js";
import { renderSettingsScreen } from "./mobile/settingsScreen.js";
import { renderHomeScreen } from "./mobile/homeScreen.js";
import { SHARED_SCREEN_RENDERERS } from "./sharedScreenRegistry.js";
import { renderCourseLibraryScreen } from "./mobile/courseLibraryScreen.js";
import { renderCourseEditorScreen } from "./mobile/courseEditorScreen.js";
import { renderGpxAnalysisScreen } from "./mobile/gpxAnalysisScreen.js";
import { renderRunMeasurementScreen } from "./mobile/runMeasurementScreen.js";
import {
  renderDepartureCheckScreen,
} from "./mobile/quickToolsScreen.js";
import { renderPaceCalculatorScreen } from "./mobile/paceCalculatorScreen.js";
import { renderAchievementsScreen } from "./mobile/achievementsScreen.js";

export const MOBILE_SCREEN_RENDERERS = Object.freeze({
  home: renderHomeScreen,
  "record-input": renderRecordInputScreen,
  "body-part-detail": renderBodyPartDetailScreen,
  "interpretation-room": renderInterpretationRoomScreen,
  reading: renderReadingScreen,
  result: renderResultScreen,
  history: renderHistoryScreen,
  settings: renderSettingsScreen,
  plan: renderPlanScreen,
  simulation: renderSimulationScreen,
  "course-library": renderCourseLibraryScreen,
  "course-editor": renderCourseEditorScreen,
  "gpx-analysis": renderGpxAnalysisScreen,
  "run-measurement": renderRunMeasurementScreen,
  "departure-check": renderDepartureCheckScreen,
  "pace-tool": renderPaceCalculatorScreen,
  achievements: renderAchievementsScreen,
});

export function createScreenRenderers() {
  return Object.freeze({ ...SHARED_SCREEN_RENDERERS, ...MOBILE_SCREEN_RENDERERS });
}

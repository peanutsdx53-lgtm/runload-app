import { renderReadingScreen } from "./desktop/readingScreen.js";
import { renderInterpretationRoomScreen } from "./desktop/interpretationRoomScreen.js";
import { renderBodyPartDetailScreen } from "./desktop/bodyPartDetailScreen.js";
import { renderRecordInputScreen } from "./desktop/recordInputScreen.js";
import { renderHistoryScreen } from "./desktop/historyScreen.js";
import { renderResultScreen } from "./desktop/resultScreen.js";
import { renderSimulationScreen } from "./desktop/simulationScreen.js";
import { renderPlanScreen } from "./desktop/planScreen.js";
import { renderSettingsScreen } from "./desktop/settingsScreen.js";
import { renderHomeScreen } from "./desktop/homeScreen.js";
import { SHARED_SCREEN_RENDERERS } from "./sharedScreenRegistry.js";
import { renderCourseLibraryScreen } from "./desktop/courseLibraryScreen.js";
import { renderCourseEditorScreen } from "./desktop/courseEditorScreen.js";
import { renderMoreScreen } from "./desktop/moreScreen.js";
import { renderGpxAnalysisScreen } from "./desktop/gpxAnalysisScreen.js";
import { renderRunMeasurementScreen } from "./desktop/runMeasurementScreen.js";

export const DESKTOP_SCREEN_RENDERERS = Object.freeze({
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
  more: renderMoreScreen,
  "gpx-analysis": renderGpxAnalysisScreen,
  "run-measurement": renderRunMeasurementScreen,
});

export function createScreenRenderers() {
  return Object.freeze({ ...SHARED_SCREEN_RENDERERS, ...DESKTOP_SCREEN_RENDERERS });
}

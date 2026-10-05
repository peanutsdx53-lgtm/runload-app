import { renderHistoryScreen } from "./mobile/historyScreen.js";
import { renderResultScreen } from "./mobile/resultScreen.js";
import { renderHomeScreen } from "./mobile/homeScreen.js";
import { SHARED_SCREEN_RENDERERS } from "./sharedScreenRegistry.js";
import { renderCourseLibraryScreen } from "./mobile/courseLibraryScreen.js";
import { renderCourseEditorScreen } from "./shared/courseEditorScreen.js";
import { renderGpxAnalysisScreen } from "./mobile/gpxAnalysisScreen.js";
import { renderRunMeasurementScreen } from "./mobile/runMeasurementScreen.js";
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

export const MOBILE_SCREEN_RENDERERS = Object.freeze({
  home: renderHomeScreen,
  result: renderResultScreen,
  history: renderHistoryScreen,
  "course-library": renderCourseLibraryScreen,
  "course-editor": renderCourseEditorScreen,
  "gpx-analysis": renderGpxAnalysisScreen,
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

export function createScreenRenderers() {
  return Object.freeze({ ...SHARED_SCREEN_RENDERERS, ...MOBILE_SCREEN_RENDERERS });
}

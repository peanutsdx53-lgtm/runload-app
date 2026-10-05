import { renderHistoryScreen } from "./historyScreen.js";
import { renderResultScreen } from "./resultScreen.js";
import { renderHomeScreen } from "./desktop/homeScreen.js";
import { SHARED_SCREEN_RENDERERS } from "./sharedScreenRegistry.js";
import { renderCourseLibraryScreen } from "./desktop/courseLibraryScreen.js";
import { renderCourseEditorScreen } from "./shared/courseEditorScreen.js";
import { renderMoreScreen } from "./desktop/moreScreen.js";
import { renderGpxAnalysisScreen } from "./desktop/gpxAnalysisScreen.js";

export const DESKTOP_SCREEN_RENDERERS = Object.freeze({
  home: renderHomeScreen,
  result: renderResultScreen,
  history: renderHistoryScreen,
  "course-library": renderCourseLibraryScreen,
  "course-editor": renderCourseEditorScreen,
  more: renderMoreScreen,
  "gpx-analysis": renderGpxAnalysisScreen,
});

export function createScreenRenderers() {
  return Object.freeze({ ...SHARED_SCREEN_RENDERERS, ...DESKTOP_SCREEN_RENDERERS });
}

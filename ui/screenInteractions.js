import { bindReading } from "./interactions/readingInteractions.js";
import { bindConsultation } from "./interactions/consultationInteractions.js";
import { bindCourseEditor, bindCourseLibrary } from "./interactions/courseInteractions.js";
import { bindHistory } from "./interactions/historyInteractions.js";
import { bindPlan } from "./interactions/planInteractions.js";
import { bindRecordInput } from "./interactions/recordInputInteractions.js";
import { bindResult } from "./interactions/resultInteractions.js";
import { bindSettings } from "./interactions/settingsInteractions.js";
import { bindSimulation } from "./interactions/simulationInteractions.js";
import { bindGpxAnalysis } from "./interactions/gpxAnalysisInteractions.js";
import { bindRunMeasurement } from "./interactions/runMeasurementInteractions.js";
import { bindRunRoute } from "./interactions/runRouteInteractions.js";

const SCREEN_INTERACTION_BINDERS = Object.freeze({
  "record-input": bindRecordInput,
  "course-library": bindCourseLibrary,
  "course-editor": bindCourseEditor,
  result: bindResult,
  history: bindHistory,
  plan: bindPlan,
  consultation: bindConsultation,
  reading: bindReading,
  settings: bindSettings,
  simulation: bindSimulation,
  "gpx-analysis": bindGpxAnalysis,
  "run-measurement": bindRunMeasurement,
  "run-route": bindRunRoute,
});

let activeCleanup = null;

export function bindScreenInteractions(context) {
  if (typeof activeCleanup === "function") activeCleanup();
  activeCleanup = SCREEN_INTERACTION_BINDERS[context.screenName]?.(context) || null;
}

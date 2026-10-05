import { bindReading } from "./interactions/readingInteractions.js";
import { bindConsultation } from "./interactions/consultationInteractions.js";
import { bindCourseEditor, bindCourseLibrary } from "./interactions/courseInteractions.js";
import { bindHistory } from "./interactions/historyInteractions.js";
import { bindPlan } from "./interactions/planInteractions.js";
import { bindSettings } from "./interactions/settingsInteractions.js";
import { bindSimulation } from "./interactions/simulationInteractions.js";
import { bindGpxAnalysis } from "./interactions/gpxAnalysisInteractions.js";
import { bindRunRoute } from "./interactions/runRouteInteractions.js";
import { bindBodyTimeline } from "./interactions/bodyTimelineInteractions.js";
import { bindInterpretationRoom } from "./interactions/interpretationRoomInteractions.js";

export const SHARED_SCREEN_INTERACTION_BINDERS = Object.freeze({
  "course-library": bindCourseLibrary,
  "course-editor": bindCourseEditor,
  history: bindHistory,
  "interpretation-room": bindInterpretationRoom,
  plan: bindPlan,
  consultation: bindConsultation,
  reading: bindReading,
  settings: bindSettings,
  simulation: bindSimulation,
  "gpx-analysis": bindGpxAnalysis,
  "run-route": bindRunRoute,
  "body-timeline": bindBodyTimeline,
});

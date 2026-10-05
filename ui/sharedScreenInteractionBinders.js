import { bindReading } from "./interactions/readingInteractions.js";
import { bindConsultation } from "./interactions/consultationInteractions.js";
import { bindCourseEditor, bindCourseLibrary } from "./interactions/courseInteractions.js";
import { bindHistory } from "./interactions/historyInteractions.js";
import { bindPlan } from "./interactions/planInteractions.js";
import { bindRecordInput } from "./interactions/recordInputInteractions.js";
import { bindResult } from "./interactions/resultInteractions.js";
import { bindBodyPartDetail } from "./interactions/bodyPartDetailInteractions.js";
import { bindSettings } from "./interactions/settingsInteractions.js";
import { bindSimulation } from "./interactions/simulationInteractions.js";
import { bindGpxAnalysis } from "./interactions/gpxAnalysisInteractions.js";
import { bindRunRoute } from "./interactions/runRouteInteractions.js";
import { bindBodyTimeline } from "./interactions/bodyTimelineInteractions.js";
import { bindInterpretationRoom } from "./interactions/interpretationRoomInteractions.js";

export const SHARED_SCREEN_INTERACTION_BINDERS = Object.freeze({
  "record-input": bindRecordInput,
  "course-library": bindCourseLibrary,
  "course-editor": bindCourseEditor,
  result: bindResult,
  "body-part-detail": bindBodyPartDetail,
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

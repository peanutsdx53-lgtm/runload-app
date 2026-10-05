import { bindMobileCourseEditor } from "./interactions/mobileCourseInteractions.js";
import { bindMobileRecordInput } from "./interactions/mobileRecordInputInteractions.js";
import { bindMobileResult } from "./interactions/mobileResultInteractions.js";
import { bindBodyPartDetail } from "./interactions/mobileBodyPartDetailInteractions.js";
import { bindMobileSimulation } from "./interactions/mobileSimulationInteractions.js";
import { bindMobilePlan } from "./interactions/mobilePlanInteractions.js";
import { bindHome } from "./interactions/mobileHomeInteractions.js";
import { bindRunMeasurement } from "./interactions/mobileRunMeasurementInteractions.js";
import { bindMobileQuickTool } from "./interactions/mobileQuickToolsInteractions.js";
import { bindMobilePhotoMemo } from "./interactions/mobilePhotoMemoInteractions.js";
import { bindMobilePaceCalculator } from "./interactions/mobilePaceCalculatorInteractions.js";

export const MOBILE_SCREEN_INTERACTION_BINDERS = Object.freeze({
  "course-editor": bindMobileCourseEditor,
  "record-input": bindMobileRecordInput,
  result: bindMobileResult,
  "body-part-detail": bindBodyPartDetail,
  plan: bindMobilePlan,
  simulation: bindMobileSimulation,
  home: bindHome,
  "run-measurement": bindRunMeasurement,
  "location-note": bindMobileQuickTool,
  "quick-note": bindMobileQuickTool,
  "gear-note": bindMobileQuickTool,
  "departure-check": bindMobileQuickTool,
  "fuel-note": bindMobileQuickTool,
  "photo-note": bindMobilePhotoMemo,
  "pace-tool": bindMobilePaceCalculator,
});

import { bindHome } from "./interactions/homeInteractions.js";
import { bindRunMeasurement } from "./interactions/runMeasurementInteractions.js";
import { bindMobileQuickTool } from "./interactions/mobileQuickToolsInteractions.js";
import { bindMobilePhotoMemo } from "./interactions/mobilePhotoMemoInteractions.js";
import { bindMobilePaceCalculator } from "./interactions/mobilePaceCalculatorInteractions.js";

export const MOBILE_SCREEN_INTERACTION_BINDERS = Object.freeze({
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

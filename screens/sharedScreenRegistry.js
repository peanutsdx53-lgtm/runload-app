import { renderRunRouteScreen } from "./runRouteScreen.js";
import { renderBodyTimelineScreen } from "./bodyTimelineScreen.js";
import { renderRecordInputScreen } from "./recordInputScreen.js";
import { renderBodyPartDetailScreen } from "./bodyPartDetailScreen.js";
import { renderPlanScreen } from "./planScreen.js";
import { renderConsultationScreen } from "./consultationScreen.js";
import { renderReadingScreen } from "./readingScreen.js";
import { renderSettingsScreen } from "./settingsScreen.js";
import { renderInterpretationRoomScreen } from "./interpretationRoomScreen.js";
import { renderSupportGuidanceScreen } from "./shared/supportGuidanceScreen.js";
import { renderPrivacyScreen } from "./shared/privacyScreen.js";
import { renderTermsScreen } from "./shared/termsScreen.js";
import { renderAboutScreen } from "./shared/aboutScreen.js";
import { renderSimulationScreen } from "./simulationScreen.js";

export const SHARED_SCREEN_RENDERERS = Object.freeze({
  "run-route": renderRunRouteScreen,
  "body-timeline": renderBodyTimelineScreen,
  "record-input": renderRecordInputScreen,
  "body-part-detail": renderBodyPartDetailScreen,
  "interpretation-room": renderInterpretationRoomScreen,
  "support-guidance": renderSupportGuidanceScreen,
  privacy: renderPrivacyScreen,
  terms: renderTermsScreen,
  about: renderAboutScreen,
  plan: renderPlanScreen,
  consultation: renderConsultationScreen,
  reading: renderReadingScreen,
  simulation: renderSimulationScreen,
  settings: renderSettingsScreen,
});

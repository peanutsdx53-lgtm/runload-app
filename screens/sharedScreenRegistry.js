import { renderRunRouteScreen } from "./runRouteScreen.js";
import { renderBodyTimelineScreen } from "./bodyTimelineScreen.js";
import { renderConsultationScreen } from "./consultationScreen.js";
import { renderSupportGuidanceScreen } from "./shared/supportGuidanceScreen.js";
import { renderPrivacyScreen } from "./shared/privacyScreen.js";
import { renderTermsScreen } from "./shared/termsScreen.js";
import { renderAboutScreen } from "./shared/aboutScreen.js";

export const SHARED_SCREEN_RENDERERS = Object.freeze({
  "run-route": renderRunRouteScreen,
  "body-timeline": renderBodyTimelineScreen,
  "support-guidance": renderSupportGuidanceScreen,
  privacy: renderPrivacyScreen,
  terms: renderTermsScreen,
  about: renderAboutScreen,
  consultation: renderConsultationScreen,
});

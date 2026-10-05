import { renderResultScreenForPlatform } from "../resultScreen.js";
import { consumeUnannouncedAchievements } from "../../ui/mobileAchievements.js";
import { renderRunCapsule, renderSameCourseComparison } from "../../ui/mobileInsights.js";

export function renderResultScreen(args) {
  return renderResultScreenForPlatform(args, {
    mobileLayout: true,
    consumeUnannouncedAchievements,
    renderRunCapsule,
    renderSameCourseComparison,
  });
}

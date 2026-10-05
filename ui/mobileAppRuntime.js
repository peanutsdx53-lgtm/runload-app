import {
  bindMobileOnboarding,
  renderMobileOnboarding,
  shouldOpenMobileOnboarding,
  withMobileOnboardingComplete,
} from "./mobileOnboarding.js";
import { hasAcceptedCurrentTerms } from "./legalAcceptance.js";
import { bindMobileHomeReturnTransitions, notifyMobileScreenRendered } from "./mobileHomeReturnTransition.js";
import { initializeAchievementState } from "./mobileAchievements.js";
import { clearAllPhotoMemos } from "./mobilePhotoMemoStore.js";

export const isMobilePlatform = true;

export function initializePlatformRuntime(services) {
  initializeAchievementState(services);
}

export function shouldOpenOnboarding(settings = {}) {
  return shouldOpenMobileOnboarding(settings, { mobile: true });
}

export function renderOnboarding({ open = false, replay = false, settings = {} } = {}) {
  return renderMobileOnboarding({
    open,
    replay,
    alreadyAccepted: hasAcceptedCurrentTerms(settings),
  });
}

export function bindOnboarding(context = {}) {
  return bindMobileOnboarding(context);
}

export function completeOnboarding(settings = {}) {
  return withMobileOnboardingComplete(settings);
}

export function notifyScreenRendered(screenName = "") {
  notifyMobileScreenRendered(screenName);
}

export function bindPlatformShell(root) { return bindMobileHomeReturnTransitions(root); }
export async function clearPlatformUserData() {
  await clearAllPhotoMemos();
  try { globalThis.localStorage?.removeItem("running-record-mobile-home-last-launch-v1"); } catch {}
}

import { SHARED_SCREEN_INTERACTION_BINDERS } from "./sharedScreenInteractionBinders.js";

export async function createScreenInteractionBinder({ mobile = false } = {}) {
  const platformBinders = mobile
    ? (await import("./mobileScreenInteractionBinders.js")).MOBILE_SCREEN_INTERACTION_BINDERS
    : (await import("./desktopScreenInteractionBinders.js")).DESKTOP_SCREEN_INTERACTION_BINDERS;
  const binders = Object.freeze({ ...SHARED_SCREEN_INTERACTION_BINDERS, ...platformBinders });
  let activeCleanup = null;

  return function bindScreenInteractions(context) {
    if (typeof activeCleanup === "function") activeCleanup();
    activeCleanup = binders[context.screenName]?.(context) || null;
  };
}

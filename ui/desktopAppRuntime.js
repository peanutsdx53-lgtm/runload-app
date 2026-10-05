export const isMobilePlatform = false;
export function initializePlatformRuntime() {}
export function shouldOpenOnboarding() { return false; }
export function renderOnboarding() { return ""; }
export function bindOnboarding() { return null; }
export function completeOnboarding(settings = {}) { return settings; }
export function notifyScreenRendered() {}

export function bindPlatformShell() { return null; }
export async function clearPlatformUserData() {}

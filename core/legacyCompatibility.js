// Temporary bridge while current-only imports are being consolidated.
// No pre-release stored data, schema, tutorial key, or cache prefix is accepted.

export const LEGACY_LOCAL_DELIVERY_CACHE_PREFIXES = Object.freeze([]);
export const LEGACY_TUTORIAL_STORAGE_KEY = "running-record.screenTutorial.seen.v1";

export function hasLegacyRofJSourceMetadata() {
  return false;
}

export function removeLegacyRofJSourceMetadata(entry) {
  return entry;
}

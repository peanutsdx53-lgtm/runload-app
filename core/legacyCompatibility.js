// Legacy identifiers are kept only to read or clean up data created by older releases.
// Do not use these values for new records or user-facing labels.

export const LEGACY_LOCAL_DELIVERY_CACHE_PREFIXES = Object.freeze([
  "runload-journal-",
  "running-journal-",
  "runload-new-model-",
]);

export const LEGACY_TUTORIAL_STORAGE_KEY = "runload.screenTutorial.seen.v1";

export const LEGACY_ROF_J_SEMANTIC_VERSIONS = Object.freeze([
  "ROF_J_SUZUKI_ARAI_2026_RUNLOAD_V1",
]);

export const LEGACY_ROF_J_STORAGE_SCHEMA_VERSIONS = Object.freeze([
  "RUNLOAD_SECOND_PILLAR_ROFJ_STORAGE_V1",
]);

export const LEGACY_ROF_J_LIFECYCLE_SCHEMA_VERSIONS = Object.freeze([
  "RUNLOAD_SECOND_PILLAR_ROFJ_LIFECYCLE_V1",
]);


const LEGACY_ROF_J_SOURCE_FIELD = "japaneseSourceSha256";

export function hasLegacyRofJSourceMetadata(entry) {
  const value = entry?.[LEGACY_ROF_J_SOURCE_FIELD];
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

export function removeLegacyRofJSourceMetadata(entry) {
  if (entry && typeof entry === "object") delete entry[LEGACY_ROF_J_SOURCE_FIELD];
  return entry;
}

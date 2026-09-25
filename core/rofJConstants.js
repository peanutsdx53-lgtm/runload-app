import {
  LEGACY_ROF_J_LIFECYCLE_SCHEMA_VERSIONS,
  LEGACY_ROF_J_SEMANTIC_VERSIONS,
  LEGACY_ROF_J_STORAGE_SCHEMA_VERSIONS,
} from "./legacyCompatibility.js";

export const ROF_J_INSTRUMENT_ID = "ROF_J";
export const ROF_J_SEMANTIC_VERSION = "ROF_J_JAPANESE_2026_V1";
export const ROF_J_SOURCE_VERSION = "ROF_J_JAPANESE_SOURCE_V1";
export const ROF_J_VISUAL_SOURCE_ID = "ROF_ORIGINAL_2017";
export const ROF_J_STORAGE_SCHEMA_VERSION = "ROFJ_STORAGE_V1";
export const ROF_J_LIFECYCLE_SCHEMA_VERSION = "ROFJ_LIFECYCLE_V1";

export function isSupportedRofJSemanticVersion(value) {
  return value === ROF_J_SEMANTIC_VERSION || LEGACY_ROF_J_SEMANTIC_VERSIONS.includes(value);
}

export function isSupportedRofJStorageSchema(value) {
  return value === ROF_J_STORAGE_SCHEMA_VERSION || LEGACY_ROF_J_STORAGE_SCHEMA_VERSIONS.includes(value);
}

export function isSupportedRofJLifecycleSchema(value) {
  return value === ROF_J_LIFECYCLE_SCHEMA_VERSION || LEGACY_ROF_J_LIFECYCLE_SCHEMA_VERSIONS.includes(value);
}

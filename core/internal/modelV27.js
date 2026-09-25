import "./infrastructure.js";
import { internalModules } from "./modules.js";

// ===== core/model/v27/v27Constants.js =====
{
const moduleExports = Object.create(null);
const V27_MODEL_VERSION = "runload-load-model-v2.7";

const V27_ACTIVITY_TYPES = Object.freeze({
  continuousRun: "CONTINUOUS_RUN",
  runWalk: "RUN_WALK",
  unknown: "UNKNOWN",
});

const V27_MISSINGNESS_STATES = Object.freeze({
  knownApplied: "KNOWN_APPLIED",
  knownUnsupported: "KNOWN_NOT_NUMERICALLY_SUPPORTED",
  unknown: "UNKNOWN",
  invalid: "INVALID",
  outOfDomain: "OUT_OF_DOMAIN",
  notApplicable: "NOT_APPLICABLE",
});

const V27_REGIONS = Object.freeze([
  Object.freeze({ id: "R01", label: "腰・骨盤", primaryMode: "VOLUME_ONLY_CONTEXT" }),
  Object.freeze({ id: "R02", label: "股関節・臀部", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R03", label: "大腿前部", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R04", label: "大腿後部", primaryMode: "VOLUME_ONLY_CONTEXT" }),
  Object.freeze({ id: "R05", label: "膝", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R06", label: "すね", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R07", label: "ふくらはぎ・アキレス腱周辺", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R08", label: "足関節・足部", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
]);

const V27_EMPHASIS_REGION_IDS = Object.freeze([
  "R02",
  "R03",
  "R05",
  "R06",
  "R07",
  "R08",
]);

const V27_SURFACE_FACTORS = Object.freeze({
  REF_HARD_EVEN_STABLE: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "KNOWN_APPLIED",
  }),
  DRY_STABLE_GRASS_TURF: Object.freeze({
    central: 1.05,
    low: 1,
    high: 1.1,
    state: "KNOWN_APPLIED",
  }),
  DEEP_DRY_SOFT_SAND: Object.freeze({
    central: 1.4,
    low: 1.2,
    high: 1.6,
    state: "KNOWN_APPLIED",
  }),
  EXPLICIT_UNEVEN: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "KNOWN_NOT_NUMERICALLY_SUPPORTED",
  }),
  KNOWN_OTHER: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "KNOWN_NOT_NUMERICALLY_SUPPORTED",
  }),
  UNKNOWN: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "UNKNOWN",
  }),
});

const V27_GRADE_CURVES = Object.freeze({
  R02: Object.freeze({
    xs: Object.freeze([-5.71, -2.86, 0, 2.86, 5.71]),
    ys: Object.freeze([0.735294, 0.892157, 1, 1.362745, 1.598039]),
    endpointConfidence: "LOW",
    endpoint: "positive_hip_joint_power",
  }),
  R03: Object.freeze({
    xs: Object.freeze([-5.71, -2.86, 0, 2.86, 5.71]),
    ys: Object.freeze([1.311475, 1.081967, 1, 0.857923, 0.830601]),
    endpointConfidence: "LOW",
    endpoint: "negative_knee_joint_power_magnitude",
  }),
  R05: Object.freeze({
    xs: Object.freeze([-6, -3, 0, 3, 6]),
    ys: Object.freeze([1.347826, 1.147826, 1, 0.886957, 0.786957]),
    endpointConfidence: "MODERATE",
    endpoint: "pfj_cumulative_weighted_impulse_per_km",
  }),
  R06: Object.freeze({
    xs: Object.freeze([-6, -3, 0, 3, 6]),
    ys: Object.freeze([1.066667, 0.975, 1, 1.058333, 1.133333]),
    endpointConfidence: "MODERATE",
    endpoint: "tibial_cumulative_weighted_impulse_per_km",
  }),
  R07: Object.freeze({
    xs: Object.freeze([-6, -3, 0, 3, 6]),
    ys: Object.freeze([0.652677, 0.808973, 1, 1.228654, 1.46165]),
    endpointConfidence: "MODERATE",
    endpoint: "achilles_cumulative_weighted_impulse_per_km",
  }),
  R08: Object.freeze({
    xs: Object.freeze([-5.71, -2.86, 0, 2.86, 5.71]),
    ys: Object.freeze([0.764331, 0.802548, 1, 1.015924, 1.012739]),
    endpointConfidence: "LOW",
    endpoint: "absolute_ankle_joint_power_sum",
  }),
});

const V27_SPEED_CURVES = Object.freeze({
  R05: Object.freeze({
    xs: Object.freeze([2.78, 3, 3.33, 4, 5]),
    ys: Object.freeze([1, 0.991304, 1.008696, 1.052174, 1.034783]),
  }),
  R06: Object.freeze({
    xs: Object.freeze([2.78, 3, 3.33, 4, 5]),
    ys: Object.freeze([1, 1, 1, 1.008333, 1.008333]),
  }),
  R07: Object.freeze({
    xs: Object.freeze([2.78, 3, 3.33, 4, 5]),
    ys: Object.freeze([1, 1.015919, 1.021708, 1.047757, 1.044863]),
  }),
});

const V27_CADENCE_CURVES = Object.freeze({
  R05: Object.freeze({
    xs: Object.freeze([-10, 0, 10]),
    ys: Object.freeze([1.034783, 1, 0.956522]),
  }),
  R06: Object.freeze({
    xs: Object.freeze([-10, 0, 10]),
    ys: Object.freeze([1.041667, 1, 0.975]),
  }),
  R07: Object.freeze({
    xs: Object.freeze([-10, 0, 10]),
    ys: Object.freeze([1.093484, 1, 0.977337]),
  }),
});

const V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS = 0.1;
const V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG = 0.005;
const V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT = 20;
const V27_COMMON_REGIONAL_GRADE_DOMAIN_MAX_PERCENT = (
  Math.tan(5.71 * Math.PI / 180) * 100
);
const V27_COMMON_REGIONAL_GRADE_INPUT_MAX_PERCENT = (
  Math.tan(
    (5.71 + V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG) * Math.PI / 180,
  ) * 100
);

const V27_REGIONAL_VIEW_IDS = Object.freeze({
  withinRun: "WITHIN_RUN_REGIONAL_EMPHASIS",
  ownFlat: "OWN_FLAT_REFERENCE_RATIO",
  personal: "PERSONAL_USUAL_RATIO",
});
moduleExports["V27_MODEL_VERSION"] = V27_MODEL_VERSION;
moduleExports["V27_ACTIVITY_TYPES"] = V27_ACTIVITY_TYPES;
moduleExports["V27_MISSINGNESS_STATES"] = V27_MISSINGNESS_STATES;
moduleExports["V27_REGIONS"] = V27_REGIONS;
moduleExports["V27_EMPHASIS_REGION_IDS"] = V27_EMPHASIS_REGION_IDS;
moduleExports["V27_SURFACE_FACTORS"] = V27_SURFACE_FACTORS;
moduleExports["V27_GRADE_CURVES"] = V27_GRADE_CURVES;
moduleExports["V27_SPEED_CURVES"] = V27_SPEED_CURVES;
moduleExports["V27_CADENCE_CURVES"] = V27_CADENCE_CURVES;
moduleExports["V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS"] = V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS;
moduleExports["V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG"] = V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG;
moduleExports["V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT"] = V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT;
moduleExports["V27_COMMON_REGIONAL_GRADE_DOMAIN_MAX_PERCENT"] = V27_COMMON_REGIONAL_GRADE_DOMAIN_MAX_PERCENT;
moduleExports["V27_COMMON_REGIONAL_GRADE_INPUT_MAX_PERCENT"] = V27_COMMON_REGIONAL_GRADE_INPUT_MAX_PERCENT;
moduleExports["V27_REGIONAL_VIEW_IDS"] = V27_REGIONAL_VIEW_IDS;
internalModules.legacyLoadModelConstants = moduleExports;
}

// ===== core/storage/modelResultV27Repository.js =====
{
const moduleExports = Object.create(null);
const { V27_MODEL_VERSION } = internalModules.legacyLoadModelConstants;
const { createCollectionRepository } = internalModules.collectionRepository;
const { STORAGE_KEYS } = internalModules.storageKeys;

function normalizeResultRecord(item = {}) {
  if (
    !item
    || typeof item !== "object"
    || item.model_version !== V27_MODEL_VERSION
    || !String(item.id || "")
    || !String(item.record_id || "")
  ) {
    return null;
  }
  return Object.freeze({
    ...item,
    id: String(item.id),
    record_id: String(item.record_id),
    source_record_revision: String(item.source_record_revision || ""),
    generated_at: String(item.generated_at || ""),
    model_version: V27_MODEL_VERSION,
  });
}

function sortResultRecords(items) {
  return [...items].sort((left, right) => (
    left.record_id.localeCompare(right.record_id)
    || left.source_record_revision.localeCompare(right.source_record_revision)
    || left.id.localeCompare(right.id)
  ));
}

function createModelResultV27Repository(gateway) {
  const repository = createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.modelResultsV27,
    normalizeItem: normalizeResultRecord,
    getItemId: (item) => item.id,
    sortItems: sortResultRecords,
  });

  function loadForRecord(recordId) {
    return repository.loadAll().filter((item) => item.record_id === recordId);
  }

  function findLatestForRecord(recordId) {
    return loadForRecord(recordId).sort((left, right) => (
      right.source_record_revision.localeCompare(left.source_record_revision)
      || right.generated_at.localeCompare(left.generated_at)
      || right.id.localeCompare(left.id)
    ))[0] || null;
  }

  function latestByRecord() {
    const result = new Map();
    repository.loadAll().forEach((item) => {
      const current = result.get(item.record_id);
      if (
        !current
        || item.source_record_revision > current.source_record_revision
        || (
          item.source_record_revision === current.source_record_revision
          && item.id > current.id
        )
      ) {
        result.set(item.record_id, item);
      }
    });
    return result;
  }

  return Object.freeze({
    loadAll: repository.loadAll,
    loadAllResult: repository.loadAllResult,
    findById: repository.findById,
    loadForRecord,
    findLatestForRecord,
    latestByRecord,
    saveAll: repository.saveAll,
    upsert: repository.upsert,
    removeById: repository.removeById,
  });
}
moduleExports["createModelResultV27Repository"] = createModelResultV27Repository;
internalModules.legacyLoadResultRepository = moduleExports;
}

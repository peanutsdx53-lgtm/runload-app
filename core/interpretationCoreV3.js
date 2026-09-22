// RunLoad Interpretation Core V3.
// Deterministic, read-only projection for beginner-facing result understanding.
// This module consumes persisted results and never recalculates Primary Reference-100 or ROF-J values.

import {
  buildRunLoadInterpretation,
  previousDeltaDirection,
  referenceDirection,
} from "./interpretationCore.js";
import { officialRofJDescriptor } from "./secondPillarRofJ.js";

export const INTERPRETATION_V3_CORE_VERSION = "runload-interpretation-core-v3.0";
export const INTERPRETATION_V3_OUTPUT_SCHEMA_VERSION = "RUNLOAD_INTERPRETATION_OUTPUT_V3";
export const INTERPRETATION_V3_ROUTE_RESOLVER_VERSION = "primary-reference100-v3-explanation-route-v1";

const CURRENT_PRIMARY_MODEL_VERSION = "runload-primary-regional-reference100-v3.0";
const SPEED_ONLY_PRIMARY_REGIONS = new Set(["R01", "R02", "R03", "R04", "R07", "R08", "R11", "R12"]);
const CONDITIONAL_PRIMARY_REGIONS = new Set(["R05", "R06", "R09", "R10"]);
const CADENCE_CAPABLE_PRIMARY_REGIONS = new Set(["R05", "R09"]);
const GRADE_CAPABLE_PRIMARY_REGIONS = new Set(["R05", "R06", "R09", "R10"]);
const ROF_ANCHORS = Object.freeze([2, 4, 6, 8, 10]);

function finite(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function frozenArray(items = []) {
  return Object.freeze(items.map((item) => Object.freeze(item)));
}

function regionRow(resultRecord = {}, regionId = "") {
  return (Array.isArray(resultRecord?.result?.regions) ? resultRecord.result.regions : [])
    .find((row) => String(row?.regionId || "") === String(regionId || "")) || null;
}

function referenceComparison(value) {
  if (!finite(value)) {
    return Object.freeze({ available: false, reference: 100, value: null, difference: null, direction: "UNAVAILABLE" });
  }
  const numeric = Number(value);
  return Object.freeze({
    available: true,
    reference: 100,
    value: numeric,
    difference: numeric - 100,
    direction: referenceDirection(numeric),
  });
}

function previousComparison(comparison = {}) {
  const available = Boolean(comparison?.comparablePreviousRecordId) && finite(comparison?.previousValue);
  if (!available) {
    return Object.freeze({
      available: false,
      recordId: "",
      date: "",
      previousValue: null,
      currentValue: null,
      difference: null,
      direction: "NONE",
    });
  }
  const delta = finite(comparison?.delta) ? Number(comparison.delta) : null;
  return Object.freeze({
    available: true,
    recordId: String(comparison.comparablePreviousRecordId || ""),
    date: String(comparison.comparablePreviousDate || ""),
    previousValue: Number(comparison.previousValue),
    currentValue: finite(comparison?.currentValue) ? Number(comparison.currentValue) : null,
    difference: delta,
    direction: previousDeltaDirection(delta),
  });
}

function historyProjection(comparison = {}) {
  return Object.freeze({
    comparableCount: Number(comparison?.historyComparableCount || 0),
    lastFive: frozenArray((comparison?.historyLastFive || []).map((item) => ({
      recordId: String(item.recordId || ""),
      date: String(item.date || ""),
      value: finite(item.value) ? Number(item.value) : null,
      referenceDirection: String(item.referenceDirection || "UNAVAILABLE"),
    }))),
    referenceDirectionCounts: Object.freeze({
      above: Number(comparison?.historyReferenceDirectionCounts?.above || 0),
      near: Number(comparison?.historyReferenceDirectionCounts?.near || 0),
      below: Number(comparison?.historyReferenceDirectionCounts?.below || 0),
      unavailable: Number(comparison?.historyReferenceDirectionCounts?.unavailable || 0),
    }),
  });
}

export function buildRofValueMeaning(value) {
  if (!finite(value)) {
    return Object.freeze({ available: false, value: null, descriptorType: "NONE", descriptor: "", lowerAnchor: null, upperAnchor: null });
  }
  const numeric = Number(value);
  const exact = officialRofJDescriptor(numeric);
  if (exact) {
    return Object.freeze({
      available: true,
      value: numeric,
      descriptorType: "EXACT",
      descriptor: exact,
      lowerAnchor: null,
      upperAnchor: null,
    });
  }
  const lower = [...ROF_ANCHORS].reverse().find((anchor) => anchor < numeric);
  const upper = ROF_ANCHORS.find((anchor) => anchor > numeric);
  const anchor = (anchorValue) => anchorValue == null ? null : Object.freeze({ value: anchorValue, descriptor: officialRofJDescriptor(anchorValue) || "" });
  return Object.freeze({
    available: true,
    value: numeric,
    descriptorType: lower != null && upper != null ? "BETWEEN_ANCHORS" : "POSITION_ONLY",
    descriptor: "",
    lowerAnchor: anchor(lower),
    upperAnchor: anchor(upper),
  });
}

function subjectiveState(rof = {}) {
  const pre = finite(rof?.pre);
  const post = finite(rof?.post);
  if (pre && post) return "PAIR";
  if (pre) return "PRE_ONLY";
  if (post) return "POST_ONLY";
  return rof?.available ? "RECORDED_NOT_ELIGIBLE" : "NONE";
}

function buildSubjectiveContext(rof = {}) {
  const pair = finite(rof?.pre) && finite(rof?.post) && finite(rof?.delta);
  return Object.freeze({
    state: subjectiveState(rof),
    pre: buildRofValueMeaning(rof?.pre),
    post: buildRofValueMeaning(rof?.post),
    difference: Object.freeze({
      eligible: pair,
      value: pair ? Number(rof.delta) : null,
      direction: pair ? String(rof.direction || "") : "",
    }),
    recentReferences: Object.freeze({
      pre: rof?.recentReferences?.pre || null,
      post: rof?.recentReferences?.post || null,
      delta: rof?.recentReferences?.delta || null,
    }),
    boundaryTokens: Object.freeze(["ROF_IS_SUBJECTIVE", "ROF_SEPARATE_FROM_REFERENCE100", "NO_RECOVERY_SAFETY_INJURY_INFERENCE"]),
  });
}

function surfaceRecorded(engineInput = {}) {
  return Array.isArray(engineInput?.surfaceComponents)
    && engineInput.surfaceComponents.some((item) => Number(item?.sharePercent ?? item?.share_percent ?? 0) > 0);
}

function gradeRecorded(engineInput = {}) {
  if (Array.isArray(engineInput?.segments) && engineInput.segments.length) {
    return engineInput.segments.some((segment) => finite(segment?.gradePercent) && Math.abs(Number(segment.gradePercent)) > 1e-12);
  }
  return Number(engineInput?.uphillSharePercent || 0) > 0 || Number(engineInput?.downhillSharePercent || 0) > 0;
}

function exposureFacts(resultRecord = {}) {
  const engineInput = resultRecord?.engine_input_snapshot || {};
  const exposure = resultRecord?.result?.exposure || {};
  const runWalk = String(engineInput.runningFormat || "").toUpperCase() === "RUN_WALK";
  const segmented = Array.isArray(engineInput.segments) && engineInput.segments.length > 0;
  if (segmented) {
    return Object.freeze({
      type: "SEGMENTED",
      distanceKm: finite(exposure.distanceKm) ? Number(exposure.distanceKm) : null,
      durationMinutes: finite(exposure.durationMinutes) ? Number(exposure.durationMinutes) : null,
      speedMps: finite(exposure.speedMps) ? Number(exposure.speedMps) : null,
      segmentCount: engineInput.segments.length,
    });
  }
  return Object.freeze({
    type: runWalk ? "RUNNING_PHASE" : "WHOLE_RUN",
    distanceKm: finite(runWalk ? engineInput.runningDistanceKm : engineInput.distanceKm)
      ? Number(runWalk ? engineInput.runningDistanceKm : engineInput.distanceKm)
      : null,
    durationMinutes: finite(runWalk ? engineInput.runningDurationMinutes : engineInput.durationMinutes)
      ? Number(runWalk ? engineInput.runningDurationMinutes : engineInput.durationMinutes)
      : null,
    speedMps: finite(exposure.speedMps) ? Number(exposure.speedMps) : null,
    segmentCount: 0,
  });
}

function inputItem(id, value, role, source = "engine_input_snapshot") {
  return Object.freeze({ id, value, role, source });
}

export function resolveCalculationPath(targetExperience = null, region = null) {
  const resultRecord = targetExperience?.regionalV2ResultRecord || {};
  const row = region ? regionRow(resultRecord, region.regionId) : null;
  const engineInput = resultRecord?.engine_input_snapshot || null;
  const modelVersion = String(resultRecord?.model_version || "");
  const primaryRegionId = String(region?.primaryRegionId || row?.primaryRegionId || "");
  const exposure = exposureFacts(resultRecord);

  const unavailable = (reasonToken) => Object.freeze({
    resolutionStatus: "UNAVAILABLE",
    resolutionBasis: "NONE",
    resolverVersion: INTERPRETATION_V3_ROUTE_RESOLVER_VERSION,
    activeRoute: "UNKNOWN",
    exposure,
    activeInputs: Object.freeze([]),
    conditionalInputs: Object.freeze([]),
    contextOnlyInputs: Object.freeze([]),
    explanationTokens: Object.freeze([reasonToken]),
  });

  if (!region || !row || modelVersion !== CURRENT_PRIMARY_MODEL_VERSION) return unavailable("CURRENT_MODEL_RESULT_REQUIRED");
  if (String(targetExperience?.regionalSemanticState || "").startsWith("LEGACY")) return unavailable("LEGACY_RESULT_NOT_REINTERPRETED");
  if (String(row.calculationState || "") !== "CALCULATED" || !finite(row.value)) return unavailable("CALCULATED_REGION_REQUIRED");
  if (!engineInput) return unavailable("ENGINE_INPUT_SNAPSHOT_REQUIRED");

  const activeInputs = [];
  if (exposure.type === "RUNNING_PHASE") {
    activeInputs.push(inputItem("RUNNING_DISTANCE", exposure.distanceKm, "DERIVE_SPEED"));
    activeInputs.push(inputItem("RUNNING_DURATION", exposure.durationMinutes, "DERIVE_SPEED"));
  } else if (exposure.type === "WHOLE_RUN") {
    activeInputs.push(inputItem("DISTANCE", exposure.distanceKm, "DERIVE_SPEED"));
    activeInputs.push(inputItem("DURATION", exposure.durationMinutes, "DERIVE_SPEED"));
  }
  if (finite(exposure.speedMps)) activeInputs.push(inputItem("SPEED", exposure.speedMps, "PRIMARY_NUMERIC_ROUTE", "persisted_result.exposure"));

  const conditionalInputs = [];
  const contextOnlyInputs = [];
  const hasCadence = finite(engineInput.averageCadenceSpm);
  const hasGrade = gradeRecorded(engineInput);
  const hasSurface = surfaceRecorded(engineInput);
  const hasFootStrike = Boolean(engineInput.footStrikeObservation);

  if (hasSurface) contextOnlyInputs.push(inputItem("SURFACE", engineInput.surfaceComponents, "CONTEXT_ONLY"));
  if (hasFootStrike) contextOnlyInputs.push(inputItem("FOOT_STRIKE", engineInput.footStrikeObservation, "CONTEXT_ONLY"));

  if (exposure.type === "SEGMENTED") {
    if (hasCadence) conditionalInputs.push(inputItem("CADENCE", Number(engineInput.averageCadenceSpm), "CONDITIONAL_NUMERIC_ROUTE"));
    if (hasGrade) conditionalInputs.push(inputItem("GRADE", "SEGMENT_GRADES", "CONDITIONAL_NUMERIC_ROUTE"));
    return Object.freeze({
      resolutionStatus: "PARTIAL",
      resolutionBasis: "PERSISTED_INPUTS_WITHOUT_SEGMENT_ROUTE_TRACE",
      resolverVersion: INTERPRETATION_V3_ROUTE_RESOLVER_VERSION,
      activeRoute: "SECTION_COMPOSED",
      exposure,
      activeInputs: frozenArray(activeInputs),
      conditionalInputs: frozenArray(conditionalInputs),
      contextOnlyInputs: frozenArray(contextOnlyInputs),
      explanationTokens: Object.freeze(["SEGMENTED_CALCULATION", "DISTANCE_WEIGHTED_REGION_SUMMARY", "DO_NOT_CLAIM_EXACT_PER_SEGMENT_ROUTE"]),
    });
  }

  if (SPEED_ONLY_PRIMARY_REGIONS.has(primaryRegionId)) {
    if (hasCadence) contextOnlyInputs.push(inputItem("CADENCE", Number(engineInput.averageCadenceSpm), "NOT_ACTIVE_FOR_THIS_REGION"));
    if (hasGrade) contextOnlyInputs.push(inputItem("GRADE", "RECORDED", "NOT_ACTIVE_FOR_THIS_REGION"));
    return Object.freeze({
      resolutionStatus: "EXACT",
      resolutionBasis: "VERSION_LOCKED_REGION_ROUTE",
      resolverVersion: INTERPRETATION_V3_ROUTE_RESOLVER_VERSION,
      activeRoute: "SPEED",
      exposure,
      activeInputs: frozenArray(activeInputs),
      conditionalInputs: Object.freeze([]),
      contextOnlyInputs: frozenArray(contextOnlyInputs),
      explanationTokens: Object.freeze([exposure.type === "RUNNING_PHASE" ? "RUNNING_PHASE_DERIVES_SPEED" : "DISTANCE_DURATION_DERIVE_SPEED", "SPEED_USED_FOR_REGION"]),
    });
  }

  if (!CONDITIONAL_PRIMARY_REGIONS.has(primaryRegionId)) return unavailable("UNKNOWN_REGION_ROUTE");

  if (CADENCE_CAPABLE_PRIMARY_REGIONS.has(primaryRegionId) && hasCadence) {
    conditionalInputs.push(inputItem("CADENCE", Number(engineInput.averageCadenceSpm), "CONDITIONAL_NUMERIC_ROUTE"));
  } else if (hasCadence) {
    contextOnlyInputs.push(inputItem("CADENCE", Number(engineInput.averageCadenceSpm), "NOT_ACTIVE_FOR_THIS_REGION"));
  }
  if (GRADE_CAPABLE_PRIMARY_REGIONS.has(primaryRegionId) && hasGrade) {
    conditionalInputs.push(inputItem("GRADE", "RECORDED", "CONDITIONAL_NUMERIC_ROUTE"));
  } else if (hasGrade) {
    contextOnlyInputs.push(inputItem("GRADE", "RECORDED", "NOT_ACTIVE_FOR_THIS_REGION"));
  }

  if (conditionalInputs.length) {
    return Object.freeze({
      resolutionStatus: "PARTIAL",
      resolutionBasis: "PERSISTED_RESULT_DOES_NOT_RETAIN_FINAL_CONDITIONAL_ROUTE_TRACE",
      resolverVersion: INTERPRETATION_V3_ROUTE_RESOLVER_VERSION,
      activeRoute: "SPEED_WITH_CONDITIONAL_INPUTS",
      exposure,
      activeInputs: frozenArray(activeInputs),
      conditionalInputs: frozenArray(conditionalInputs),
      contextOnlyInputs: frozenArray(contextOnlyInputs),
      explanationTokens: Object.freeze(["SPEED_IS_BASE_ROUTE", "CONDITIONAL_INPUT_RECORDED", "DO_NOT_CLAIM_CONDITIONAL_INPUT_WAS_APPLIED"]),
    });
  }

  return Object.freeze({
    resolutionStatus: "EXACT",
    resolutionBasis: "VERSION_LOCKED_BASE_ROUTE_NO_CONDITIONAL_INPUT",
    resolverVersion: INTERPRETATION_V3_ROUTE_RESOLVER_VERSION,
    activeRoute: "SPEED",
    exposure,
    activeInputs: frozenArray(activeInputs),
    conditionalInputs: Object.freeze([]),
    contextOnlyInputs: frozenArray(contextOnlyInputs),
    explanationTokens: Object.freeze([exposure.type === "RUNNING_PHASE" ? "RUNNING_PHASE_DERIVES_SPEED" : "DISTANCE_DURATION_DERIVE_SPEED", "SPEED_USED_FOR_REGION"]),
  });
}

function overviewRegion(region, comparison = {}) {
  const reference = referenceComparison(region?.value);
  const previous = previousComparison({ ...comparison, currentValue: region?.value });
  return Object.freeze({
    regionId: String(region?.regionId || ""),
    primaryRegionId: String(region?.primaryRegionId || ""),
    label: String(region?.label || ""),
    value: finite(region?.value) ? Number(region.value) : null,
    availability: finite(region?.value) ? "AVAILABLE" : String(region?.calculationState || "UNAVAILABLE"),
    reference,
    previous,
  });
}

function regionalState(v2 = {}) {
  if (String(v2?.context?.activityType || "").toLowerCase() === "rest") return "REST";
  if (String(v2?.context?.regionalSemanticState || "").startsWith("LEGACY")) return "LEGACY";
  const regions = v2?.current?.regions || [];
  const available = regions.filter((region) => finite(region.value)).length;
  if (!available) return "UNAVAILABLE";
  if (available < regions.length) return "PARTIAL";
  return "AVAILABLE";
}

function selectRegion(v2 = {}, selectedRegionId = "") {
  if (!selectedRegionId) return null;
  const region = (v2?.current?.regions || []).find((item) => item.regionId === selectedRegionId) || null;
  if (!region) return null;
  const comparison = v2?.comparison?.regionalById?.[selectedRegionId] || {};
  return { region, comparison };
}

function nextProjection(v2 = {}, selectedRegionId = "") {
  const actions = Array.isArray(v2?.actions) ? v2.actions : [];
  const enabled = actions.filter((action) => action?.enabled !== false);
  if (v2?.safety?.route && v2.safety.route !== "normal") {
    const action = enabled[0] || null;
    return Object.freeze({ selectionRequired: false, primaryAction: action, otherActions: frozenArray(enabled.slice(1)) });
  }
  if (!selectedRegionId) {
    return Object.freeze({ selectionRequired: true, primaryAction: null, otherActions: Object.freeze([]) });
  }
  const comparison = v2?.comparison?.regionalById?.[selectedRegionId] || {};
  const hasConditionDifference = Array.isArray(v2?.comparison?.conditionDifferences) && v2.comparison.conditionDifferences.length > 0;
  const preferredId = hasConditionDifference ? "simulation" : comparison.historyComparableCount > 0 ? "history" : "plan";
  const primary = enabled.find((action) => action.actionId === preferredId) || enabled[0] || null;
  return Object.freeze({
    selectionRequired: false,
    primaryAction: primary,
    otherActions: frozenArray(enabled.filter((action) => action !== primary)),
  });
}

export function buildRunLoadInterpretationV3({
  targetExperience = null,
  allExperiences = [],
  rofSummary = null,
  rofRecentReferences = {},
  origin = "",
  selectedRegionId = "",
  supportDecision = null,
} = {}) {
  const v2 = buildRunLoadInterpretation({
    targetExperience,
    allExperiences,
    rofSummary,
    rofRecentReferences,
    origin,
    selectedRegionId,
    supportDecision,
  });

  const selected = selectRegion(v2, selectedRegionId);
  const selectedRegion = selected ? Object.freeze({
    regionId: selected.region.regionId,
    primaryRegionId: selected.region.primaryRegionId,
    label: selected.region.label,
    value: selected.region.value,
    referenceComparison: referenceComparison(selected.region.value),
    previousComparison: previousComparison({ ...selected.comparison, currentValue: selected.region.value }),
    personalHistory: historyProjection(selected.comparison),
    calculationPath: resolveCalculationPath(targetExperience, selected.region),
  }) : null;

  const regions = (v2?.current?.regions || []).map((region) => overviewRegion(region, v2?.comparison?.regionalById?.[region.regionId] || {}));
  const subjectiveContext = buildSubjectiveContext(v2?.current?.rof || {});

  return Object.freeze({
    schemaVersion: INTERPRETATION_V3_OUTPUT_SCHEMA_VERSION,
    coreVersion: INTERPRETATION_V3_CORE_VERSION,
    target: Object.freeze({
      recordId: String(v2?.targetRecordId || ""),
      resultRecordId: String(v2?.generatedFrom?.resultRecordId || ""),
      date: String(v2?.context?.recordDate || ""),
      activityType: String(v2?.context?.activityType || ""),
      origin: String(origin || ""),
      selectedRegionId: String(selectedRegionId || ""),
    }),
    state: Object.freeze({
      targetAvailable: Boolean(v2?.targetRecordId),
      regional: regionalState(v2),
      history: v2?.availability?.regionalHistory ? "AVAILABLE" : "NONE",
      subjective: subjectiveContext.state,
      support: String(v2?.safety?.route || "normal").toUpperCase(),
      legacy: String(v2?.context?.regionalSemanticState || "").startsWith("LEGACY"),
    }),
    overview: Object.freeze({
      regions: frozenArray(regions),
      selectionMode: selectedRegionId ? "EXPLICIT" : "USER_SELECT",
      guidanceTokens: Object.freeze(["REGIONS_USE_OWN_REFERENCE", "NO_CROSS_REGION_RANKING", "NUMBERS_REQUIRE_CONTEXT"]),
    }),
    selectedRegion,
    subjectiveContext,
    understanding: Object.freeze({
      facts: v2?.interpretation?.meaning?.factsUsed || Object.freeze([]),
      boundaryCodes: v2?.interpretation?.limitationCodes || Object.freeze([]),
    }),
    next: nextProjection(v2, selectedRegionId),
    advanced: Object.freeze({ evidence: v2?.evidence || null }),
    safety: v2?.safety || Object.freeze({ route: "normal", reasons: Object.freeze([]), blocks: Object.freeze([]), nextActions: Object.freeze([]) }),
    provenance: Object.freeze({
      sourceSchemaVersion: v2?.schemaVersion || "",
      sourceCoreVersion: v2?.coreVersion || "",
      modelVersion: v2?.generatedFrom?.modelVersion || "",
      outputSemanticVersion: v2?.generatedFrom?.outputSemanticVersion || "",
      readOnly: true,
      primaryRecalculated: false,
      rofRecalculated: false,
    }),
  });
}

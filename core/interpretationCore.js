// RunLoad Interpretation Core.
// Deterministic, read-only projection for beginner-facing result understanding.
// This module consumes persisted results and never recalculates Primary Reference-100 or ROF-J values.

import {
  buildBaseInterpretation,
  previousDeltaDirection,
  referenceDirection,
} from "./interpretationBase.js";
import { officialRofJDescriptor } from "./secondPillarRofJ.js";

export const INTERPRETATION_CORE_VERSION = "runload-interpretation-core-v4.0";
export const INTERPRETATION_OUTPUT_SCHEMA_VERSION = "RUNLOAD_INTERPRETATION_OUTPUT_V4";
export const INTERPRETATION_ROUTE_RESOLVER_VERSION = "primary-reference100-v3-explanation-route-v1";

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
    resolverVersion: INTERPRETATION_ROUTE_RESOLVER_VERSION,
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
      resolverVersion: INTERPRETATION_ROUTE_RESOLVER_VERSION,
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
      resolverVersion: INTERPRETATION_ROUTE_RESOLVER_VERSION,
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
      resolverVersion: INTERPRETATION_ROUTE_RESOLVER_VERSION,
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
    resolverVersion: INTERPRETATION_ROUTE_RESOLVER_VERSION,
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

function regionalState(base = {}) {
  if (String(base?.context?.activityType || "").toLowerCase() === "rest") return "REST";
  if (String(base?.context?.regionalSemanticState || "").startsWith("LEGACY")) return "LEGACY";
  const regions = base?.current?.regions || [];
  const available = regions.filter((region) => finite(region.value)).length;
  if (!available) return "UNAVAILABLE";
  if (available < regions.length) return "PARTIAL";
  return "AVAILABLE";
}

function selectRegion(base = {}, selectedRegionId = "") {
  if (!selectedRegionId) return null;
  const region = (base?.current?.regions || []).find((item) => item.regionId === selectedRegionId) || null;
  if (!region) return null;
  const comparison = base?.comparison?.regionalById?.[selectedRegionId] || {};
  return { region, comparison };
}

function directionCountKey(direction = "") {
  if (direction === "ABOVE_REFERENCE") return "above";
  if (direction === "REFERENCE_VICINITY") return "near";
  if (direction === "BELOW_REFERENCE") return "below";
  return "unavailable";
}

function buildAttentionOverview(base = {}) {
  const regions = Array.isArray(base?.current?.regions) ? base.current.regions : [];
  const comparisons = base?.comparison?.regionalById || {};
  const groups = {
    REPEATED_DIRECTION: [],
    PREVIOUS_CHANGE: [],
    REFERENCE_POSITION: [],
    REFERENCE_NEAR: [],
  };
  let available = 0;
  let previousComparable = 0;
  let previousChanged = 0;
  let repeated = 0;
  let above = 0;
  let near = 0;
  let below = 0;

  regions.forEach((region) => {
    if (!finite(region?.value)) return;
    available += 1;
    const comparison = comparisons[region.regionId] || {};
    if (comparison.comparablePreviousRecordId) previousComparable += 1;
    const changed = ["UP", "DOWN"].includes(String(comparison.previousDirection || ""));
    if (changed) previousChanged += 1;
    const direction = String(region.referenceDirection || referenceDirection(region.value));
    if (direction === "ABOVE_REFERENCE") above += 1;
    else if (direction === "BELOW_REFERENCE") below += 1;
    else if (direction === "REFERENCE_VICINITY") near += 1;

    const countKey = directionCountKey(direction);
    const pastMatchingCount = Number(comparison?.historyReferenceDirectionCounts?.[countKey] || 0);
    const repeatedDirection = ["ABOVE_REFERENCE", "BELOW_REFERENCE"].includes(direction)
      && Number(comparison.historyComparableCount || 0) >= 2
      && pastMatchingCount >= 2;
    if (repeatedDirection) repeated += 1;

    const reasonCode = repeatedDirection
      ? "REPEATED_DIRECTION"
      : changed
        ? "PREVIOUS_CHANGE"
        : ["ABOVE_REFERENCE", "BELOW_REFERENCE"].includes(direction)
          ? "REFERENCE_POSITION"
          : "REFERENCE_NEAR";

    groups[reasonCode].push(Object.freeze({
      regionId: String(region.regionId || ""),
      primaryRegionId: String(region.primaryRegionId || ""),
      label: String(region.label || ""),
      value: Number(region.value),
      referenceDirection: direction,
      previousAvailable: Boolean(comparison.comparablePreviousRecordId) && finite(comparison.previousValue),
      previousRecordId: String(comparison.comparablePreviousRecordId || ""),
      previousDate: String(comparison.comparablePreviousDate || ""),
      previousValue: finite(comparison.previousValue) ? Number(comparison.previousValue) : null,
      previousDifference: finite(comparison.delta) ? Number(comparison.delta) : null,
      previousDirection: String(comparison.previousDirection || "NONE"),
      historyComparableCount: Number(comparison.historyComparableCount || 0),
      pastMatchingDirectionCount: pastMatchingCount,
      reasonCode,
    }));
  });

  const order = ["REPEATED_DIRECTION", "PREVIOUS_CHANGE", "REFERENCE_POSITION", "REFERENCE_NEAR"];
  return Object.freeze({
    counts: Object.freeze({
      total: regions.length,
      available,
      unavailable: Math.max(0, regions.length - available),
      previousComparable,
      previousChanged,
      repeated,
      above,
      near,
      below,
      conditionDifferences: Array.isArray(base?.comparison?.conditionDifferences) ? base.comparison.conditionDifferences.length : 0,
    }),
    groups: Object.freeze(order.map((code) => Object.freeze({ code, regions: Object.freeze(groups[code]) })).filter((group) => group.regions.length)),
    noCrossRegionRanking: true,
  });
}

function conditionRelationship(path = {}, differenceId = "") {
  const active = new Set((path?.activeInputs || []).map((item) => String(item.id || "")));
  const conditional = new Set((path?.conditionalInputs || []).map((item) => String(item.id || "")));
  const contextOnly = new Set((path?.contextOnlyInputs || []).map((item) => String(item.id || "")));
  const map = {
    distance: ["DISTANCE", "RUNNING_DISTANCE"],
    duration: ["DURATION", "RUNNING_DURATION"],
    pace: ["SPEED"],
    cadence: ["CADENCE"],
    grade: ["GRADE"],
    surface: ["SURFACE"],
  };
  const ids = map[differenceId] || [];
  if (differenceId === "running-format") return "DEFINES_EXPOSURE";
  if (differenceId === "course") return "RECORDED_CONTEXT";
  if (ids.some((id) => active.has(id))) return "USED_IN_CURRENT_ROUTE";
  if (ids.some((id) => conditional.has(id))) return "RECORDED_CONDITIONAL";
  if (ids.some((id) => contextOnly.has(id))) return "RECORDED_CONTEXT";
  return "NOT_IDENTIFIED_IN_REGION_ROUTE";
}

function conditionProjection(base = {}, selectedRegion = null) {
  const differences = Array.isArray(base?.comparison?.conditionDifferences) ? base.comparison.conditionDifferences : [];
  const path = selectedRegion?.calculationPath || null;
  return Object.freeze({
    previousRecordId: String(base?.comparison?.conditionPreviousRecordId || ""),
    previousDate: String(base?.comparison?.conditionPreviousDate || ""),
    differences: frozenArray(differences.map((item) => ({
      id: String(item?.id || ""),
      labelToken: String(item?.labelToken || ""),
      previous: item?.previous ?? null,
      current: item?.current ?? null,
      delta: finite(item?.delta) ? Number(item.delta) : null,
      relationship: path ? conditionRelationship(path, String(item?.id || "")) : "NO_REGION_SELECTED",
    }))),
    boundaryCodes: Object.freeze(differences.length ? ["DESCRIPTIVE_ONLY", "NO_CAUSAL_INFERENCE"] : []),
  });
}

function nextCheckProjection(base = {}, selectedRegionId = "", attention = null) {
  const comparison = selectedRegionId ? base?.comparison?.regionalById?.[selectedRegionId] || {} : {};
  const conditions = Array.isArray(base?.comparison?.conditionDifferences) ? base.comparison.conditionDifferences : [];
  const changedCount = Number(attention?.counts?.previousChanged || 0);
  const direction = selectedRegionId
    ? String((base?.current?.regions || []).find((region) => region.regionId === selectedRegionId)?.referenceDirection || "")
    : "";
  const key = directionCountKey(direction);
  const sameDirectionCount = Number(comparison?.historyReferenceDirectionCounts?.[key] || 0);

  if (selectedRegionId && comparison.historyComparableCount === 0) {
    return Object.freeze({ code: "ADD_COMPARABLE_RECORD", regionId: selectedRegionId, conditionIds: Object.freeze(conditions.map((item) => String(item.id || ""))) });
  }
  if (selectedRegionId && sameDirectionCount >= 2 && ["ABOVE_REFERENCE", "BELOW_REFERENCE"].includes(direction)) {
    return Object.freeze({ code: "RECHECK_REPEATED_DIRECTION", regionId: selectedRegionId, conditionIds: Object.freeze(conditions.map((item) => String(item.id || ""))) });
  }
  if (conditions.length) {
    return Object.freeze({ code: "KEEP_CONDITIONS_VISIBLE", regionId: selectedRegionId, conditionIds: Object.freeze(conditions.map((item) => String(item.id || ""))) });
  }
  if (changedCount > 0) {
    return Object.freeze({ code: "RECORD_NEXT_COMPARABLE_RUN", regionId: selectedRegionId, conditionIds: Object.freeze([]) });
  }
  return Object.freeze({ code: "CONTINUE_COMPARABLE_RECORDS", regionId: selectedRegionId, conditionIds: Object.freeze([]) });
}

function nextProjection(base = {}, selectedRegionId = "") {
  const actions = Array.isArray(base?.actions) ? base.actions : [];
  const enabled = actions.filter((action) => action?.enabled !== false);
  if (base?.safety?.route && base.safety.route !== "normal") {
    const action = enabled[0] || null;
    return Object.freeze({ selectionRequired: false, primaryAction: action, otherActions: frozenArray(enabled.slice(1)) });
  }
  const hasConditionDifference = Array.isArray(base?.comparison?.conditionDifferences) && base.comparison.conditionDifferences.length > 0;
  const preferredId = hasConditionDifference ? "simulation" : "plan";
  const primary = enabled.find((action) => action.actionId === preferredId) || enabled[0] || null;
  return Object.freeze({
    selectionRequired: false,
    primaryAction: primary,
    otherActions: frozenArray(enabled.filter((action) => action !== primary)),
  });
}

export function buildRunLoadInterpretation({
  targetExperience = null,
  allExperiences = [],
  rofSummary = null,
  rofRecentReferences = {},
  origin = "",
  selectedRegionId = "",
  supportDecision = null,
} = {}) {
  const base = buildBaseInterpretation({
    targetExperience,
    allExperiences,
    rofSummary,
    rofRecentReferences,
    origin,
    selectedRegionId,
    supportDecision,
  });

  const selected = selectRegion(base, selectedRegionId);
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

  const regions = (base?.current?.regions || []).map((region) => overviewRegion(region, base?.comparison?.regionalById?.[region.regionId] || {}));
  const subjectiveContext = buildSubjectiveContext(base?.current?.rof || {});
  const attention = buildAttentionOverview(base);
  const conditions = conditionProjection(base, selectedRegion);
  const nextCheck = nextCheckProjection(base, selectedRegionId, attention);

  return Object.freeze({
    schemaVersion: INTERPRETATION_OUTPUT_SCHEMA_VERSION,
    coreVersion: INTERPRETATION_CORE_VERSION,
    target: Object.freeze({
      recordId: String(base?.targetRecordId || ""),
      resultRecordId: String(base?.generatedFrom?.resultRecordId || ""),
      date: String(base?.context?.recordDate || ""),
      activityType: String(base?.context?.activityType || ""),
      origin: String(origin || ""),
      selectedRegionId: String(selectedRegionId || ""),
    }),
    state: Object.freeze({
      targetAvailable: Boolean(base?.targetRecordId),
      regional: regionalState(base),
      history: base?.availability?.regionalHistory ? "AVAILABLE" : "NONE",
      subjective: subjectiveContext.state,
      support: String(base?.safety?.route || "normal").toUpperCase(),
      legacy: String(base?.context?.regionalSemanticState || "").startsWith("LEGACY"),
    }),
    overview: Object.freeze({
      regions: frozenArray(regions),
      selectionMode: selectedRegionId ? "EXPLICIT" : "REASON_GROUPS",
      guidanceTokens: Object.freeze(["REGIONS_USE_OWN_REFERENCE", "NO_CROSS_REGION_RANKING", "NUMBERS_REQUIRE_CONTEXT"]),
      attention,
    }),
    runFacts: base?.current?.facts || Object.freeze({}),
    selectedRegion,
    subjectiveContext,
    conditions,
    understanding: Object.freeze({
      meaningCode: String(base?.interpretation?.meaning?.primaryCode || ""),
      secondaryCodes: base?.interpretation?.meaning?.secondaryCodes || Object.freeze([]),
      facts: base?.interpretation?.meaning?.factsUsed || Object.freeze([]),
      boundaryCodes: base?.interpretation?.limitationCodes || Object.freeze([]),
    }),
    nextCheck,
    next: nextProjection(base, selectedRegionId),
    advanced: Object.freeze({ evidence: base?.evidence || null }),
    safety: base?.safety || Object.freeze({ route: "normal", reasons: Object.freeze([]), blocks: Object.freeze([]), nextActions: Object.freeze([]) }),
    provenance: Object.freeze({
      sourceSchemaVersion: base?.schemaVersion || "",
      sourceCoreVersion: base?.coreVersion || "",
      modelVersion: base?.generatedFrom?.modelVersion || "",
      outputSemanticVersion: base?.generatedFrom?.outputSemanticVersion || "",
      readOnly: true,
      primaryRecalculated: false,
      rofRecalculated: false,
    }),
  });
}

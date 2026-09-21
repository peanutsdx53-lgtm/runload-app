// RunLoad Interpretation Core V1
// Deterministic, read-only interpretation of persisted RunLoad outputs.
// This module does not calculate or modify Primary Regional Reference-100 or ROF-J values.

export const INTERPRETATION_CORE_VERSION = "runload-interpretation-core-v1.1";
export const INTERPRETATION_OUTPUT_SCHEMA_VERSION = "RUNLOAD_INTERPRETATION_OUTPUT_V2";
export const INTERPRETATION_EVIDENCE_CONTRACT = "PERSISTED_RESULT_PROVENANCE_V1";

const NORMAL_PLAN_BLOCK = "normal_plan_suggestions";
const VALID_SUPPORT_ROUTES = new Set(["normal", "review", "consult", "urgent"]);
const REGION_ORDER = Object.freeze([
  "BA-DISP-014", "BA-DISP-015", "BA-DISP-016", "BA-DISP-018",
  "BA-DISP-019", "BA-DISP-021", "BA-DISP-023", "BA-DISP-024",
  "BA-DISP-025", "BA-DISP-027", "BA-DISP-028", "BA-DISP-029",
]);
const REGION_ORDER_INDEX = new Map(REGION_ORDER.map((id, index) => [id, index]));

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function finite(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function uniqueStrings(values = []) {
  return Object.freeze([...new Set(values.filter(Boolean).map((value) => String(value)))]);
}

export function stableRecordKey(record = {}) {
  return `${String(record.date || "")}|${String(record.createdAt || "")}|${String(record.id || "")}`;
}

export function referenceDirection(value) {
  if (!finite(value)) return "UNAVAILABLE";
  const n = Number(value);
  if (n >= 101) return "ABOVE_REFERENCE";
  if (n <= 99) return "BELOW_REFERENCE";
  return "REFERENCE_VICINITY";
}

export function previousDeltaDirection(delta) {
  if (!finite(delta)) return "NONE";
  const n = Number(delta);
  if (n >= 1) return "UP";
  if (n <= -1) return "DOWN";
  return "LESS_THAN_ONE_POINT";
}

function signatureFor(resultRecord = {}, regionId = "") {
  return resultRecord?.comparison_signatures?.[regionId] || null;
}

export function signaturesComparable(left, right) {
  return Boolean(
    left
    && right
    && left.regionId === right.regionId
    && left.modelVersion === right.modelVersion
    && left.outputSemanticVersion === right.outputSemanticVersion
    && left.constructId === right.constructId
    && left.referenceId === right.referenceId,
  );
}

function regionOrder(regionId = "") {
  return REGION_ORDER_INDEX.has(regionId) ? REGION_ORDER_INDEX.get(regionId) : 999;
}

function sortRegionalRows(rows = []) {
  return [...rows].sort((a, b) => regionOrder(a.regionId) - regionOrder(b.regionId) || String(a.regionId).localeCompare(String(b.regionId)));
}

function regionRows(experience = null) {
  const rows = experience?.regionalV2ResultRecord?.result?.regions;
  return Array.isArray(rows) ? sortRegionalRows(rows) : [];
}

function paceSecondsPerKm(record = {}) {
  const distanceKm = Number(record.distanceKm);
  const durationMinutes = Number(record.durationMinutes);
  return distanceKm > 0 && durationMinutes > 0 ? Math.round(durationMinutes * 60 / distanceKm) : null;
}

function gradeSummary(record = {}) {
  const course = record.course && typeof record.course === "object" ? record.course : {};
  const knowledge = String(course.gradeKnowledge || record.gradeKnowledge || "UNKNOWN");
  const uphillSharePercent = finite(course.uphillSharePercent ?? record.uphillSharePercent)
    ? Number(course.uphillSharePercent ?? record.uphillSharePercent)
    : null;
  const downhillSharePercent = finite(course.downhillSharePercent ?? record.downhillSharePercent)
    ? Number(course.downhillSharePercent ?? record.downhillSharePercent)
    : null;
  const uphillGradePercent = finite(course.uphillGradePercent ?? record.uphillGradePercent)
    ? Number(course.uphillGradePercent ?? record.uphillGradePercent)
    : null;
  const downhillGradePercent = finite(course.downhillGradePercent ?? record.downhillGradePercent)
    ? Number(course.downhillGradePercent ?? record.downhillGradePercent)
    : null;
  return Object.freeze({ knowledge, uphillSharePercent, downhillSharePercent, uphillGradePercent, downhillGradePercent });
}

function surfaceSummary(record = {}) {
  const course = record.course && typeof record.course === "object" ? record.course : {};
  const raw = Array.isArray(course.surfaceComponents)
    ? course.surfaceComponents
    : Array.isArray(record.surfaceComponents)
      ? record.surfaceComponents
      : [];
  return Object.freeze(raw.map((item) => Object.freeze({
    category: String(item?.category || item?.userCategory || item?.label || ""),
    sharePercent: finite(item?.sharePercent ?? item?.share_percent) ? Number(item.sharePercent ?? item.share_percent) : null,
  })));
}

function currentFacts(record = {}) {
  return Object.freeze({
    distanceKm: finite(record.distanceKm) ? Number(record.distanceKm) : null,
    durationMinutes: finite(record.durationMinutes) ? Number(record.durationMinutes) : null,
    paceSecondsPerKm: paceSecondsPerKm(record),
    runningFormat: String(record.runningFormat || ""),
    courseName: String(record.course?.name || record.courseName || ""),
    gradeSummary: gradeSummary(record),
    surfaceSummary: surfaceSummary(record),
    averageCadenceSpm: finite(record.averageCadenceSpm) ? Number(record.averageCadenceSpm) : null,
    nextCheckPoint: String(record.reflectionContext?.nextCheckPoint || ""),
  });
}

function compactAxisEstimate(item = {}) {
  return Object.freeze({
    axis: String(item.axis || ""),
    value: finite(item.value) ? Number(item.value) : null,
    valueEnvelope: Array.isArray(item.valueEnvelope) ? Object.freeze([...item.valueEnvelope]) : null,
    state: String(item.state || ""),
    evidenceState: String(item.evidenceState || ""),
    unsupportedDistanceKm: finite(item.unsupportedDistanceKm) ? Number(item.unsupportedDistanceKm) : 0,
  });
}

function projectCurrentRegions(experience = null) {
  return Object.freeze(regionRows(experience).map((row) => Object.freeze({
    regionId: String(row.regionId || ""),
    primaryRegionId: String(row.primaryRegionId || ""),
    label: String(row.regionName || row.regionId || ""),
    formalOrder: regionOrder(row.regionId),
    value: finite(row.value) ? Number(row.value) : null,
    referenceDirection: referenceDirection(row.value),
    calculationState: String(row.calculationState || ""),
    evidenceState: String(row.evidenceState || row.provenance || ""),
    evidenceStates: uniqueStrings(row.evidenceStates || []),
    construct: String(row.construct || ""),
    constructId: String(row.constructId || ""),
    referenceId: String(row.referenceId || ""),
    sourceIds: uniqueStrings(row.sourceIds || []),
    coverageProportion: finite(row.coverageProportion) ? Number(row.coverageProportion) : null,
    unsupportedDistanceKm: finite(row.unsupportedDistanceKm) ? Number(row.unsupportedDistanceKm) : 0,
    projectCompositeFlag: Boolean(row.projectCompositeFlag),
    axisEstimates: Object.freeze((Array.isArray(row.axisEstimates) ? row.axisEstimates : []).map(compactAxisEstimate)),
  })));
}

function eligiblePastExperiences(targetExperience, allExperiences = []) {
  const targetKey = stableRecordKey(targetExperience?.record || {});
  return (Array.isArray(allExperiences) ? allExperiences : [])
    .filter((experience) => experience?.record?.id && experience.record.id !== targetExperience?.record?.id)
    .filter((experience) => stableRecordKey(experience.record) < targetKey)
    .sort((a, b) => stableRecordKey(a.record).localeCompare(stableRecordKey(b.record)));
}

function comparableRegionalHistory(targetExperience, allExperiences, regionId) {
  const targetResult = targetExperience?.regionalV2ResultRecord || null;
  const targetSignature = signatureFor(targetResult, regionId);
  if (!targetSignature) return [];
  return eligiblePastExperiences(targetExperience, allExperiences)
    .map((experience) => ({
      experience,
      row: regionRows(experience).find((candidate) => candidate.regionId === regionId) || null,
      signature: signatureFor(experience?.regionalV2ResultRecord, regionId),
    }))
    .filter((item) => item.row && finite(item.row.value) && signaturesComparable(targetSignature, item.signature));
}

function historyDirectionCounts(items = []) {
  const counts = { above: 0, near: 0, below: 0, unavailable: 0 };
  items.forEach((item) => {
    const direction = referenceDirection(item.row?.value);
    if (direction === "ABOVE_REFERENCE") counts.above += 1;
    else if (direction === "REFERENCE_VICINITY") counts.near += 1;
    else if (direction === "BELOW_REFERENCE") counts.below += 1;
    else counts.unavailable += 1;
  });
  return Object.freeze(counts);
}

function buildRegionalComparisons(targetExperience, allExperiences, currentRegions) {
  const regionalById = {};
  currentRegions.forEach((region) => {
    const history = comparableRegionalHistory(targetExperience, allExperiences, region.regionId);
    const previous = history.length ? history.at(-1) : null;
    const delta = previous && finite(region.value) ? Number(region.value) - Number(previous.row.value) : null;
    const recent = history.slice(-5);
    regionalById[region.regionId] = Object.freeze({
      comparablePreviousRecordId: previous?.experience?.record?.id || "",
      comparablePreviousDate: previous?.experience?.record?.date || "",
      previousValue: previous && finite(previous.row?.value) ? Number(previous.row.value) : null,
      delta: finite(delta) ? Number(delta) : null,
      previousDirection: previousDeltaDirection(delta),
      historyComparableCount: history.length,
      historyLastFive: Object.freeze(recent.map((item) => Object.freeze({
        recordId: String(item.experience.record.id || ""),
        date: String(item.experience.record.date || ""),
        createdAt: String(item.experience.record.createdAt || ""),
        value: Number(item.row.value),
        referenceDirection: referenceDirection(item.row.value),
      }))),
      historyReferenceDirectionCounts: historyDirectionCounts(history),
    });
  });
  return Object.freeze(regionalById);
}

function immediatelyPreviousRun(targetExperience, allExperiences = []) {
  const past = eligiblePastExperiences(targetExperience, allExperiences)
    .filter((experience) => String(experience?.record?.activityType || "").toLowerCase() === "run");
  return past.length ? past.at(-1) : null;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function numericDifference(id, labelToken, current, previous, tolerance = 1e-9) {
  if (!finite(current) || !finite(previous)) return null;
  const a = Number(current); const b = Number(previous);
  if (Math.abs(a - b) <= tolerance) return null;
  return Object.freeze({ id, labelToken, current: a, previous: b, delta: a - b });
}

export function buildConditionDifferenceSummary(targetExperience, allExperiences = []) {
  const previousExperience = immediatelyPreviousRun(targetExperience, allExperiences);
  if (!previousExperience) return Object.freeze({ previousRecordId: "", previousDate: "", differences: Object.freeze([]) });
  const current = currentFacts(targetExperience.record || {});
  const previous = currentFacts(previousExperience.record || {});
  const differences = [];
  const maybePush = (value) => { if (value) differences.push(value); };
  maybePush(numericDifference("distance", "DISTANCE", current.distanceKm, previous.distanceKm));
  maybePush(numericDifference("duration", "DURATION", current.durationMinutes, previous.durationMinutes));
  maybePush(numericDifference("pace", "PACE", current.paceSecondsPerKm, previous.paceSecondsPerKm, 0));
  if (current.runningFormat && previous.runningFormat && current.runningFormat !== previous.runningFormat) {
    differences.push(Object.freeze({ id: "running-format", labelToken: "RUNNING_FORMAT", current: current.runningFormat, previous: previous.runningFormat }));
  }
  if ((current.courseName || previous.courseName) && current.courseName !== previous.courseName) {
    differences.push(Object.freeze({ id: "course", labelToken: "COURSE", current: current.courseName, previous: previous.courseName }));
  }
  if (!sameJson(current.gradeSummary, previous.gradeSummary)) {
    differences.push(Object.freeze({ id: "grade", labelToken: "GRADE", current: current.gradeSummary, previous: previous.gradeSummary }));
  }
  if (!sameJson(current.surfaceSummary, previous.surfaceSummary)) {
    differences.push(Object.freeze({ id: "surface", labelToken: "SURFACE", current: current.surfaceSummary, previous: previous.surfaceSummary }));
  }
  maybePush(numericDifference("cadence", "CADENCE", current.averageCadenceSpm, previous.averageCadenceSpm));
  return Object.freeze({
    previousRecordId: String(previousExperience.record.id || ""),
    previousDate: String(previousExperience.record.date || ""),
    differences: Object.freeze(differences),
  });
}

export function buildRofJInterpretation(rofSummary = null, rofRecentReferences = {}) {
  const summary = rofSummary && typeof rofSummary === "object" ? rofSummary : {};
  const validPair = finite(summary.pre) && finite(summary.post) && finite(summary.delta);
  return Object.freeze({
    available: Boolean(summary.available),
    pre: finite(summary.pre) ? Number(summary.pre) : null,
    post: finite(summary.post) ? Number(summary.post) : null,
    delta: validPair ? Number(summary.delta) : null,
    direction: validPair ? String(summary.direction || "") : "",
    directionLabel: validPair ? String(summary.directionLabel || "") : "",
    preEligibility: clone(summary.preEligibility || null),
    postEligibility: clone(summary.postEligibility || null),
    recentReferences: Object.freeze({
      pre: clone(rofRecentReferences?.pre || null),
      post: clone(rofRecentReferences?.post || null),
      delta: clone(rofRecentReferences?.delta || null),
    }),
  });
}

export function buildEvidenceInterpretation(targetExperience = null, currentRegions = []) {
  const resultRecord = targetExperience?.regionalV2ResultRecord || {};
  const registry = resultRecord.source_registry && typeof resultRecord.source_registry === "object" ? resultRecord.source_registry : {};
  const regions = {};
  currentRegions.forEach((region) => {
    regions[region.regionId] = Object.freeze({
      sourceIds: region.sourceIds,
      sources: Object.freeze(region.sourceIds.map((sourceId) => Object.freeze({
        sourceId,
        label: String(registry[sourceId]?.label || sourceId),
        role: String(registry[sourceId]?.role || ""),
      }))),
      evidenceState: region.evidenceState,
      evidenceStates: region.evidenceStates,
      construct: region.construct,
      constructId: region.constructId,
      referenceId: region.referenceId,
      axisEstimates: region.axisEstimates,
      projectCompositeFlag: region.projectCompositeFlag,
    });
  });
  return Object.freeze({
    contract: INTERPRETATION_EVIDENCE_CONTRACT,
    regions: Object.freeze(regions),
    completeness: Object.freeze({
      completePerContributionTrace: false,
      wordingCode: "DO_NOT_CLAIM_FULL_BIBLIOGRAPHY",
    }),
  });
}

export function resolveInterpretationSafetyMode(supportDecision = {}) {
  const route = VALID_SUPPORT_ROUTES.has(String(supportDecision?.route || "")) ? String(supportDecision.route) : "normal";
  return Object.freeze({
    route,
    reasons: uniqueStrings(supportDecision?.reasons || []),
    blocks: uniqueStrings(supportDecision?.blocks || []),
    nextActions: uniqueStrings(supportDecision?.nextActions || []),
  });
}

function action(actionId, labelToken, destination, parameters = {}, enabled = true, blockedReason = "") {
  return Object.freeze({ actionId, labelToken, destination, parameters: Object.freeze({ ...parameters }), enabled, blockedReason });
}

export function resolveInterpretationActions({ targetExperience = null, availability = {}, safety = {}, origin = "", selectedRegionId = "" } = {}) {
  const recordId = String(targetExperience?.record?.id || "");
  const common = { recordId, origin: "interpretation-room" };
  const normalPlanBlocked = safety.blocks.includes(NORMAL_PLAN_BLOCK);
  const actions = [];
  if (safety.route === "urgent") {
    actions.push(action("official-help", "OFFICIAL_HELP", "support-guidance", { returnTo: `#/interpretation-room?recordId=${encodeURIComponent(recordId)}&origin=${encodeURIComponent(origin || "result")}` }));
    actions.push(action("share", "CONSULTATION", "consultation", common));
    actions.push(action("review-input", "REVIEW_INPUT", "record-input", { recordId, returnTo: `#/interpretation-room?recordId=${encodeURIComponent(recordId)}` }));
  } else if (safety.route === "consult") {
    actions.push(action("share", "CONSULTATION", "consultation", common));
    actions.push(action("review-input", "REVIEW_INPUT", "record-input", { recordId, returnTo: `#/interpretation-room?recordId=${encodeURIComponent(recordId)}` }));
  } else if (safety.route === "review") {
    actions.push(action("review-input", "REVIEW_INPUT", "record-input", { recordId, returnTo: `#/interpretation-room?recordId=${encodeURIComponent(recordId)}` }));
  }
  if (availability.regionalHistory) actions.push(action("history", "HISTORY", "history", { recordId, regionId: selectedRegionId || "", view: "trends", metric: "region" }));
  if (targetExperience?.record?.activityType === "run") {
    actions.push(action("simulation", "SIMULATION", "simulation", common, !normalPlanBlocked, normalPlanBlocked ? "EXISTING_SUPPORT_BLOCK" : ""));
    actions.push(action("plan", "PLAN", "plan", { sourceRecordId: recordId, from: "interpretation-room" }, !normalPlanBlocked, normalPlanBlocked ? "EXISTING_SUPPORT_BLOCK" : ""));
  }
  actions.push(action("reading", "READING", "reading", { recordId, origin: "interpretation-room", regionId: selectedRegionId || "" }));
  actions.push(action("share", "CONSULTATION", "consultation", common));
  const deduped = [];
  const seen = new Set();
  actions.forEach((item) => { if (!seen.has(item.actionId)) { seen.add(item.actionId); deduped.push(item); } });
  return Object.freeze(deduped);
}

function regionalAvailability(currentRegions, regionalById) {
  const numeric = currentRegions.filter((region) => finite(region.value));
  return Object.freeze({
    regional: numeric.length > 0,
    previousRegional: Object.values(regionalById).some((item) => Boolean(item.comparablePreviousRecordId)),
    regionalHistory: Object.values(regionalById).some((item) => item.historyComparableCount > 0),
  });
}

function selectCompactRegions(currentRegions, regionalById, selectedRegionId = "") {
  if (selectedRegionId && currentRegions.some((region) => region.regionId === selectedRegionId && finite(region.value))) {
    return Object.freeze([selectedRegionId]);
  }
  const selected = currentRegions
    .filter((region) => region.referenceDirection === "ABOVE_REFERENCE")
    .filter((region) => regionalById[region.regionId]?.previousDirection === "UP")
    .sort((a, b) => a.formalOrder - b.formalOrder)
    .slice(0, 2)
    .map((region) => region.regionId);
  return Object.freeze(selected);
}

function buildSummaryCodes({ targetExperience, availability, currentRegions, regionalById, rof, conditionSummary, safety }) {
  const codes = [];
  const activityType = String(targetExperience?.record?.activityType || "").toLowerCase();
  if (!targetExperience?.record) return Object.freeze(["NO_TARGET_RECORD"]);
  if (activityType === "rest") codes.push("REST_RECORD");
  if (availability.regional) codes.push("REGIONAL_AVAILABLE");
  else codes.push("REGIONAL_UNAVAILABLE");
  const availableCount = currentRegions.filter((region) => finite(region.value)).length;
  if (availableCount && availableCount < currentRegions.length) codes.push("REGIONAL_PARTIAL_AVAILABILITY");
  if (availability.previousRegional) codes.push("PREVIOUS_REGIONAL_AVAILABLE");
  if (availability.regionalHistory) codes.push("REGIONAL_HISTORY_AVAILABLE");
  if (rof.pre !== null && rof.post !== null && rof.delta !== null) codes.push("ROF_PAIR_AVAILABLE");
  if (rof.recentReferences.pre || rof.recentReferences.post || rof.recentReferences.delta) codes.push("ROF_RECENT_REFERENCE_AVAILABLE");
  if (conditionSummary.differences.length) codes.push("CONDITION_DIFFERENCES_AVAILABLE");
  const regionalDifferenceExists = Object.values(regionalById).some((item) => finite(item.delta) && Math.abs(item.delta) >= 1);
  if (regionalDifferenceExists && conditionSummary.differences.length) codes.push("NON_CAUSAL_BOUNDARY_REQUIRED");
  if (targetExperience?.regionalV2Recovery?.status === "RECOVERED") codes.push("REGIONAL_TRANSIENT_RECOVERY");
  if (String(targetExperience?.regionalSemanticState || "").startsWith("LEGACY")) codes.push("LEGACY_REGIONAL_BOUNDARY");
  if (safety.route !== "normal") codes.push(`SUPPORT_${safety.route.toUpperCase()}`);
  return Object.freeze(codes);
}

function buildSummaryTokens(currentRegions, regionalById, conditionSummary, rof) {
  const numeric = currentRegions.filter((region) => finite(region.value));
  const counts = numeric.reduce((out, region) => {
    if (region.referenceDirection === "ABOVE_REFERENCE") out.above += 1;
    else if (region.referenceDirection === "REFERENCE_VICINITY") out.near += 1;
    else if (region.referenceDirection === "BELOW_REFERENCE") out.below += 1;
    return out;
  }, { above: 0, near: 0, below: 0 });
  const previousDifferenceCount = Object.values(regionalById).filter((item) => ["UP", "DOWN"].includes(item.previousDirection)).length;
  return Object.freeze([
    Object.freeze({ token: "REGIONAL_COUNTS", values: Object.freeze({ available: numeric.length, unavailable: currentRegions.length - numeric.length, ...counts }) }),
    Object.freeze({ token: "PREVIOUS_REGIONAL_DIFFERENCE_COUNT", values: Object.freeze({ count: previousDifferenceCount }) }),
    Object.freeze({ token: "CONDITION_DIFFERENCE_COUNT", values: Object.freeze({ count: conditionSummary.differences.length }) }),
    Object.freeze({ token: "ROF_PAIR", values: Object.freeze({ pre: rof.pre, post: rof.post, delta: rof.delta, direction: rof.direction }) }),
  ]);
}


function meaningDirectionKey(direction = "") {
  if (direction === "ABOVE_REFERENCE") return "above";
  if (direction === "REFERENCE_VICINITY") return "near";
  if (direction === "BELOW_REFERENCE") return "below";
  return "";
}

function orderedRegionCandidates(currentRegions = [], predicate = () => true) {
  return currentRegions
    .filter((region) => finite(region.value))
    .filter(predicate)
    .sort((a, b) => a.formalOrder - b.formalOrder || String(a.regionId).localeCompare(String(b.regionId)));
}

function firstRegionId(currentRegions = [], predicate = () => true) {
  return orderedRegionCandidates(currentRegions, predicate)[0]?.regionId || "";
}

function regionalDifferenceIds(currentRegions = [], regionalById = {}) {
  return Object.freeze(orderedRegionCandidates(
    currentRegions,
    (region) => ["UP", "DOWN"].includes(regionalById[region.regionId]?.previousDirection),
  ).map((region) => region.regionId));
}

function repeatedObservationCandidate(currentRegions = [], regionalById = {}) {
  for (const region of orderedRegionCandidates(
    currentRegions,
    (candidate) => ["ABOVE_REFERENCE", "BELOW_REFERENCE"].includes(candidate.referenceDirection),
  )) {
    const comparison = regionalById[region.regionId];
    const key = meaningDirectionKey(region.referenceDirection);
    const pastMatchingCount = Number(comparison?.historyReferenceDirectionCounts?.[key] || 0);
    if (comparison?.historyComparableCount >= 2 && pastMatchingCount >= 2) {
      return Object.freeze({
        regionId: region.regionId,
        currentDirection: region.referenceDirection,
        pastMatchingCount,
        pastComparableCount: Number(comparison.historyComparableCount || 0),
      });
    }
  }
  return null;
}

function focusRegionIdForMeaning(currentRegions = [], regionalById = {}, selectedRegionId = "") {
  if (selectedRegionId && currentRegions.some((region) => region.regionId === selectedRegionId && finite(region.value))) {
    return selectedRegionId;
  }
  const repeated = repeatedObservationCandidate(currentRegions, regionalById);
  if (repeated?.regionId) return repeated.regionId;
  const changed = firstRegionId(currentRegions, (region) => ["UP", "DOWN"].includes(regionalById[region.regionId]?.previousDirection));
  if (changed) return changed;
  const referenceDifference = firstRegionId(currentRegions, (region) => ["ABOVE_REFERENCE", "BELOW_REFERENCE"].includes(region.referenceDirection));
  if (referenceDifference) return referenceDifference;
  return firstRegionId(currentRegions);
}

function buildMeaningFacts({ currentRegions, regionalById, conditionSummary, rof, focusRegionId, repeated }) {
  const facts = [];
  const region = currentRegions.find((item) => item.regionId === focusRegionId) || null;
  const comparison = focusRegionId ? regionalById[focusRegionId] : null;

  if (region) {
    facts.push(Object.freeze({
      type: "REGION_CURRENT_REFERENCE",
      regionId: region.regionId,
      label: region.label,
      value: region.value,
      referenceDirection: region.referenceDirection,
    }));
  }

  if (region && comparison?.comparablePreviousRecordId && finite(comparison.delta)) {
    facts.push(Object.freeze({
      type: "REGION_PREVIOUS_DIFFERENCE",
      regionId: region.regionId,
      label: region.label,
      currentValue: region.value,
      previousValue: comparison.previousValue,
      delta: comparison.delta,
      direction: comparison.previousDirection,
      previousRecordId: comparison.comparablePreviousRecordId,
      previousDate: comparison.comparablePreviousDate,
    }));
  }

  if (repeated && repeated.regionId === focusRegionId) {
    facts.push(Object.freeze({
      type: "REGION_REPEATED_DIRECTION",
      regionId: repeated.regionId,
      currentDirection: repeated.currentDirection,
      pastMatchingCount: repeated.pastMatchingCount,
      pastComparableCount: repeated.pastComparableCount,
    }));
  }

  if (finite(rof?.pre) && finite(rof?.post) && finite(rof?.delta)) {
    facts.push(Object.freeze({
      type: "ROF_PRE_POST",
      pre: Number(rof.pre),
      post: Number(rof.post),
      delta: Number(rof.delta),
      direction: String(rof.direction || ""),
    }));
  }

  if (conditionSummary?.differences?.length) {
    facts.push(Object.freeze({
      type: "CONDITION_DIFFERENCES",
      count: conditionSummary.differences.length,
      labels: Object.freeze(conditionSummary.differences.map((item) => String(item.labelToken || item.id || "")).filter(Boolean)),
      previousRecordId: String(conditionSummary.previousRecordId || ""),
      previousDate: String(conditionSummary.previousDate || ""),
    }));
  }

  return Object.freeze(facts.slice(0, 5));
}

function meaningBoundaryCodes(primaryCode, rof, conditionSummary) {
  const codes = ["NO_DIAGNOSIS", "NO_INJURY_RISK", "NO_SAFETY_OR_RUN_PERMISSION", "NO_CROSS_REGION_RANKING"];
  const regionalAndCondition = primaryCode === "CONDITION_AND_RESULT_CHANGED" || Boolean(conditionSummary?.differences?.length);
  if (regionalAndCondition) codes.push("NO_CAUSAL_INFERENCE");
  if (finite(rof?.pre) && finite(rof?.post)) codes.push("ROF_SEPARATE_SUBJECTIVE_LAYER");
  return Object.freeze(codes);
}

export function buildMeaningFrame({ targetExperience = null, currentRegions = [], regionalById = {}, conditionSummary = null, rof = null, safety = null, availability = null, selectedRegionId = "" } = {}) {
  if (!targetExperience?.record) {
    return Object.freeze({
      primaryCode: "NO_TARGET_RECORD",
      secondaryCodes: Object.freeze([]),
      focusRegionIds: Object.freeze([]),
      availableModes: Object.freeze([]),
      factsUsed: Object.freeze([]),
      boundaryCodes: Object.freeze([]),
    });
  }

  const resolvedSafety = safety || { route: "normal" };
  const resolvedAvailability = availability || {};
  const semanticState = String(targetExperience?.regionalSemanticState || "");
  const differenceIds = regionalDifferenceIds(currentRegions, regionalById);
  const hasRegionalDifference = differenceIds.length > 0;
  const hasRofDifference = finite(rof?.delta) && Math.abs(Number(rof.delta)) >= 1;
  const hasConditionDifference = Boolean(conditionSummary?.differences?.length);
  const repeated = repeatedObservationCandidate(currentRegions, regionalById);
  const focusRegionId = focusRegionIdForMeaning(currentRegions, regionalById, selectedRegionId);

  let primaryCode = "COMPARISON_BASELINE";
  if (resolvedSafety.route && resolvedSafety.route !== "normal") {
    primaryCode = "SUPPORT_PRIORITY";
  } else if (!resolvedAvailability.regional || semanticState.startsWith("LEGACY")) {
    primaryCode = "LIMITED_RESULT";
  } else if (repeated) {
    primaryCode = "REPEATED_OBSERVATION";
  } else if (hasRegionalDifference && hasConditionDifference) {
    primaryCode = "CONDITION_AND_RESULT_CHANGED";
  } else if (hasRegionalDifference && hasRofDifference) {
    primaryCode = "MULTI_LAYER_CHANGE";
  } else if (hasRegionalDifference) {
    primaryCode = "CURRENT_SHIFT_WITH_HISTORY";
  } else if (currentRegions.some((region) => ["ABOVE_REFERENCE", "BELOW_REFERENCE"].includes(region.referenceDirection))) {
    primaryCode = "CURRENT_REFERENCE_PATTERN";
  }

  const secondaryCodes = [];
  if (primaryCode !== "REPEATED_OBSERVATION" && repeated) secondaryCodes.push("REPEATED_OBSERVATION");
  if (primaryCode !== "CONDITION_AND_RESULT_CHANGED" && hasRegionalDifference && hasConditionDifference) secondaryCodes.push("CONDITION_AND_RESULT_CHANGED");
  if (primaryCode !== "MULTI_LAYER_CHANGE" && hasRegionalDifference && hasRofDifference) secondaryCodes.push("MULTI_LAYER_CHANGE");
  if (primaryCode !== "CURRENT_SHIFT_WITH_HISTORY" && hasRegionalDifference) secondaryCodes.push("CURRENT_SHIFT_WITH_HISTORY");
  if (hasRofDifference) secondaryCodes.push("ROF_PRE_POST_CHANGE");
  if (hasConditionDifference) secondaryCodes.push("CONDITION_DIFFERENCES_PRESENT");

  const availableModes = ["simple"];
  if (focusRegionId) availableModes.push("visual");
  if (hasRegionalDifference || hasRofDifference || hasConditionDifference) availableModes.push("difference");
  if (resolvedAvailability.persistedEvidence) availableModes.push("evidence");

  return Object.freeze({
    primaryCode,
    secondaryCodes: uniqueStrings(secondaryCodes),
    focusRegionIds: Object.freeze(focusRegionId ? [focusRegionId] : []),
    availableModes: uniqueStrings(availableModes),
    factsUsed: buildMeaningFacts({
      currentRegions,
      regionalById,
      conditionSummary,
      rof,
      focusRegionId,
      repeated,
    }),
    boundaryCodes: meaningBoundaryCodes(primaryCode, rof, conditionSummary),
  });
}

function limitationCodes(targetExperience, evidence) {
  const codes = [
    "NO_DIAGNOSIS",
    "NO_INJURY_RISK",
    "NO_SAFETY_OR_RUN_PERMISSION",
    "NO_CROSS_REGION_RANKING",
    "NO_CAUSAL_INFERENCE",
    "ROF_SEPARATE_SUBJECTIVE_LAYER",
  ];
  if (!evidence.completeness.completePerContributionTrace) codes.push("NO_COMPLETE_BIBLIOGRAPHY_CLAIM");
  if (String(targetExperience?.regionalSemanticState || "").startsWith("LEGACY")) codes.push("LEGACY_NOT_REINTERPRETED_AS_CURRENT");
  return Object.freeze(codes);
}

export function buildInterpretationContext({ targetExperience = null, allExperiences = [], rofSummary = null, rofRecentReferences = {}, origin = "", selectedRegionId = "", supportDecision = null } = {}) {
  const currentRegions = projectCurrentRegions(targetExperience);
  const regionalById = buildRegionalComparisons(targetExperience, allExperiences, currentRegions);
  const conditionSummary = buildConditionDifferenceSummary(targetExperience, allExperiences);
  const rof = buildRofJInterpretation(rofSummary, rofRecentReferences);
  const safety = resolveInterpretationSafetyMode(supportDecision || targetExperience?.supportDecision || {});
  const regionalFlags = regionalAvailability(currentRegions, regionalById);
  const availability = Object.freeze({
    ...regionalFlags,
    rofPair: rof.pre !== null && rof.post !== null && rof.delta !== null,
    rofRecentPre: Boolean(rof.recentReferences.pre),
    rofRecentPost: Boolean(rof.recentReferences.post),
    rofRecentDelta: Boolean(rof.recentReferences.delta),
    conditionComparison: conditionSummary.differences.length > 0,
    persistedEvidence: currentRegions.some((region) => region.sourceIds.length > 0 || region.construct || region.evidenceState),
  });
  const selectedRegionIds = selectCompactRegions(currentRegions, regionalById, selectedRegionId);
  const evidence = buildEvidenceInterpretation(targetExperience, currentRegions);
  const meaning = buildMeaningFrame({
    targetExperience,
    currentRegions,
    regionalById,
    conditionSummary,
    rof,
    safety,
    availability,
    selectedRegionId,
  });
  const actions = resolveInterpretationActions({ targetExperience, availability, safety, origin, selectedRegionId });
  return Object.freeze({ currentRegions, regionalById, conditionSummary, rof, safety, availability, selectedRegionIds, evidence, meaning, actions });
}

export function buildCurrentRunInterpretation(context = {}) {
  const currentRegions = context.currentRegions || [];
  return Object.freeze({
    regions: currentRegions,
    selectedRegionIds: context.selectedRegionIds || Object.freeze([]),
  });
}

export function buildRegionalHistoryInterpretation(context = {}) {
  return Object.freeze({ regionalById: context.regionalById || Object.freeze({}) });
}

export function buildRunLoadInterpretation({ targetExperience = null, allExperiences = [], rofSummary = null, rofRecentReferences = {}, origin = "", selectedRegionId = "", supportDecision = null } = {}) {
  if (!targetExperience?.record) {
    const safety = resolveInterpretationSafetyMode(supportDecision || {});
    return Object.freeze({
      schemaVersion: INTERPRETATION_OUTPUT_SCHEMA_VERSION,
      coreVersion: INTERPRETATION_CORE_VERSION,
      targetRecordId: "",
      generatedFrom: Object.freeze({ resultRecordId: "", modelVersion: "", outputSemanticVersion: "", engineBuildVersion: "", authorityVersion: "" }),
      context: Object.freeze({ origin: String(origin || ""), recordDate: "", createdAt: "", activityType: "", selectedRegionId: String(selectedRegionId || ""), regionalSemanticState: "NONE", regionalRecoveryStatus: "" }),
      availability: Object.freeze({ regional: false, previousRegional: false, regionalHistory: false, rofPair: false, rofRecentPre: false, rofRecentPost: false, rofRecentDelta: false, conditionComparison: false, persistedEvidence: false }),
      current: Object.freeze({ facts: Object.freeze({}), regions: Object.freeze([]), rof: buildRofJInterpretation(null, {}) }),
      comparison: Object.freeze({ stableTargetKey: "", regionalById: Object.freeze({}), conditionDifferences: Object.freeze([]), conditionPreviousRecordId: "", conditionPreviousDate: "", rofRecentReferences: Object.freeze({ pre: null, post: null, delta: null }) }),
      interpretation: Object.freeze({ summaryCodes: Object.freeze(["NO_TARGET_RECORD"]), summaryTokens: Object.freeze([]), selectedRegionIds: Object.freeze([]), limitationCodes: Object.freeze([]), meaning: buildMeaningFrame() }),
      evidence: Object.freeze({ contract: INTERPRETATION_EVIDENCE_CONTRACT, regions: Object.freeze({}), completeness: Object.freeze({ completePerContributionTrace: false, wordingCode: "DO_NOT_CLAIM_FULL_BIBLIOGRAPHY" }) }),
      safety,
      actions: Object.freeze([action("record", "RECORD", "record-input")]),
    });
  }

  const ctx = buildInterpretationContext({ targetExperience, allExperiences, rofSummary, rofRecentReferences, origin, selectedRegionId, supportDecision });
  const resultRecord = targetExperience.regionalV2ResultRecord || {};
  const summaryCodes = buildSummaryCodes({
    targetExperience,
    availability: ctx.availability,
    currentRegions: ctx.currentRegions,
    regionalById: ctx.regionalById,
    rof: ctx.rof,
    conditionSummary: ctx.conditionSummary,
    safety: ctx.safety,
  });
  const summaryTokens = buildSummaryTokens(ctx.currentRegions, ctx.regionalById, ctx.conditionSummary, ctx.rof);

  return Object.freeze({
    schemaVersion: INTERPRETATION_OUTPUT_SCHEMA_VERSION,
    coreVersion: INTERPRETATION_CORE_VERSION,
    targetRecordId: String(targetExperience.record.id || ""),
    generatedFrom: Object.freeze({
      resultRecordId: String(resultRecord.id || ""),
      modelVersion: String(resultRecord.model_version || ""),
      outputSemanticVersion: String(resultRecord.output_semantic_version || resultRecord.result?.outputSemanticVersion || ""),
      engineBuildVersion: String(resultRecord.engine_build_version || ""),
      authorityVersion: String(resultRecord.authority_version || ""),
    }),
    context: Object.freeze({
      origin: String(origin || ""),
      recordDate: String(targetExperience.record.date || ""),
      createdAt: String(targetExperience.record.createdAt || ""),
      activityType: String(targetExperience.record.activityType || ""),
      selectedRegionId: String(selectedRegionId || ""),
      regionalSemanticState: String(targetExperience.regionalSemanticState || "NONE"),
      regionalRecoveryStatus: String(targetExperience.regionalV2Recovery?.status || ""),
    }),
    availability: ctx.availability,
    current: Object.freeze({
      facts: currentFacts(targetExperience.record),
      regions: ctx.currentRegions,
      rof: ctx.rof,
    }),
    comparison: Object.freeze({
      stableTargetKey: stableRecordKey(targetExperience.record),
      regionalById: ctx.regionalById,
      conditionDifferences: ctx.conditionSummary.differences,
      conditionPreviousRecordId: ctx.conditionSummary.previousRecordId,
      conditionPreviousDate: ctx.conditionSummary.previousDate,
      rofRecentReferences: ctx.rof.recentReferences,
    }),
    interpretation: Object.freeze({
      summaryCodes,
      summaryTokens,
      selectedRegionIds: ctx.selectedRegionIds,
      limitationCodes: limitationCodes(targetExperience, ctx.evidence),
      meaning: ctx.meaning,
    }),
    evidence: ctx.evidence,
    safety: ctx.safety,
    actions: ctx.actions,
  });
}

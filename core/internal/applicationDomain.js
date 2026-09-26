import "./primaryModelResults.js";
import { internalModules } from "./modules.js";

// ===== core/model/v27/bodyAreaTaxonomy.js =====
{
const moduleExports = Object.create(null);
const BODY_AREA_GROUPS = Object.freeze([
  Object.freeze({ id: "TRUNK", label: "頭・体幹" }),
  Object.freeze({ id: "UPPER_LIMB", label: "上肢" }),
  Object.freeze({ id: "HIP_THIGH", label: "股関節・大腿" }),
  Object.freeze({ id: "KNEE_LOWER_LEG", label: "膝・下腿・足関節" }),
  Object.freeze({ id: "FOOT", label: "足部" }),
]);

const BODY_AREA_LATERALITY = Object.freeze({
  unknown: "UNKNOWN",
  left: "LEFT",
  right: "RIGHT",
  bilateral: "BILATERAL",
});

const BODY_AREA_LATERALITY_LABELS = Object.freeze({
  UNKNOWN: "左右不明",
  LEFT: "左",
  RIGHT: "右",
  BILATERAL: "両側",
});

const BODY_AREA_TAXONOMY = Object.freeze([
  Object.freeze({ id: "BA-010", key: "ba_010", label: "頭", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-020", key: "ba_020", label: "首", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-030", key: "ba_030", label: "胸", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-040", key: "ba_040", label: "上背部", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-050", key: "ba_050", label: "腹部", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-060", key: "ba_060", label: "腰・下背部", groupId: "TRUNK", modelRegionId: "R01" }),
  Object.freeze({ id: "BA-100", key: "ba_100", label: "肩", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-110", key: "ba_110", label: "上腕", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-120", key: "ba_120", label: "肘", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-130", key: "ba_130", label: "前腕", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-140", key: "ba_140", label: "手首", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-150", key: "ba_150", label: "手", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BFR-200-ING", key: "bfr_200_ing", label: "ももの付け根の前側", groupId: "HIP_THIGH", modelRegionId: "R02" }),
  Object.freeze({ id: "BFR-200-COX", key: "bfr_200_cox", label: "股関節の外側周辺", groupId: "HIP_THIGH", modelRegionId: "R02" }),
  Object.freeze({ id: "BFR-210-GLU", key: "bfr_210_glu", label: "お尻", groupId: "HIP_THIGH", modelRegionId: "R02" }),
  Object.freeze({ id: "BFR-220-ANT", key: "bfr_220_ant", label: "太ももの前側", groupId: "HIP_THIGH", modelRegionId: "R03" }),
  Object.freeze({ id: "BFR-220-POST", key: "bfr_220_post", label: "太ももの後ろ側", groupId: "HIP_THIGH", modelRegionId: "R04" }),
  Object.freeze({ id: "BFR-230-ANT", key: "bfr_230_ant", label: "膝の前側", groupId: "KNEE_LOWER_LEG", modelRegionId: "R05" }),
  Object.freeze({ id: "BFR-230-POST", key: "bfr_230_post", label: "膝の後ろ・膝窩周辺", groupId: "KNEE_LOWER_LEG", modelRegionId: "R05" }),
  Object.freeze({ id: "BFR-240-ANT", key: "bfr_240_ant", label: "すね側", groupId: "KNEE_LOWER_LEG", modelRegionId: "R06" }),
  Object.freeze({ id: "BFR-240-POST", key: "bfr_240_post", label: "ふくらはぎ側", groupId: "KNEE_LOWER_LEG", modelRegionId: "R07" }),
  Object.freeze({ id: "BFR-250-ANT", key: "bfr_250_ant", label: "足首の前側", groupId: "KNEE_LOWER_LEG", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-250-POST", key: "bfr_250_post", label: "足首の後ろ", groupId: "KNEE_LOWER_LEG", modelRegionId: "R07" }),
  Object.freeze({ id: "BFR-260-DOR", key: "bfr_260_dor", label: "足の甲", groupId: "FOOT", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-260-REAR", key: "bfr_260_rear", label: "踵・足底の後方", groupId: "FOOT", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-260-MID", key: "bfr_260_mid", label: "足裏の中央・土踏まず周辺", groupId: "FOOT", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-260-FORE", key: "bfr_260_fore", label: "足裏の前方", groupId: "FOOT", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-260-TOE", key: "bfr_260_toe", label: "足の指", groupId: "FOOT", modelRegionId: "R08" }),
]);

const BODY_AREA_BY_ID = Object.freeze(Object.fromEntries(
  BODY_AREA_TAXONOMY.map((area) => [area.id, area]),
));

const BODY_AREA_BY_KEY = Object.freeze(Object.fromEntries(
  BODY_AREA_TAXONOMY.map((area) => [area.key, area]),
));

function normalizeBodyAreaObservations(source = []) {
  if (!Array.isArray(source)) return Object.freeze([]);
  const byId = new Map();
  source.forEach((item) => {
    const area = BODY_AREA_BY_ID[String(item?.areaId || "")];
    const intensity = Number(item?.intensity);
    if (!area || !Number.isInteger(intensity) || intensity < 1 || intensity > 5) return;
    const requestedLaterality = String(item?.laterality || item?.side || "UNKNOWN").toUpperCase();
    const laterality = Object.values(BODY_AREA_LATERALITY).includes(requestedLaterality)
      ? requestedLaterality
      : BODY_AREA_LATERALITY.unknown;
    byId.set(area.id, Object.freeze({
      areaId: area.id,
      label: area.label,
      groupId: area.groupId,
      modelRegionId: area.modelRegionId,
      intensity,
      laterality,
      sensationType: String(item?.sensationType || "NOT_SELECTED"),
      noticedTiming: String(item?.noticedTiming || "UNKNOWN"),
      note: String(item?.note || ""),
    }));
  });
  return Object.freeze(BODY_AREA_TAXONOMY
    .filter((area) => byId.has(area.id))
    .map((area) => byId.get(area.id)));
}

function bodyAreaLateralityLabel(value = "UNKNOWN") {
  return BODY_AREA_LATERALITY_LABELS[String(value || "UNKNOWN").toUpperCase()]
    || BODY_AREA_LATERALITY_LABELS.UNKNOWN;
}
moduleExports["BODY_AREA_GROUPS"] = BODY_AREA_GROUPS;
moduleExports["BODY_AREA_LATERALITY"] = BODY_AREA_LATERALITY;
moduleExports["BODY_AREA_LATERALITY_LABELS"] = BODY_AREA_LATERALITY_LABELS;
moduleExports["BODY_AREA_TAXONOMY"] = BODY_AREA_TAXONOMY;
moduleExports["BODY_AREA_BY_ID"] = BODY_AREA_BY_ID;
moduleExports["BODY_AREA_BY_KEY"] = BODY_AREA_BY_KEY;
moduleExports["normalizeBodyAreaObservations"] = normalizeBodyAreaObservations;
moduleExports["bodyAreaLateralityLabel"] = bodyAreaLateralityLabel;
internalModules.bodyAreaTaxonomy = moduleExports;
}

// ===== core/safety/supportDecision.js =====
{
const moduleExports = Object.create(null);
const SUPPORT_ROUTES = Object.freeze(["normal", "review", "consult", "urgent"]);
const SUPPORT_RULE_VERSION = "support-rules-v2";
const SUPPORT_DATA_VERSION = "support-data-v2";

const SAFETY_FLAG_KEYS = Object.freeze([
  "severePain",
  "significantSwelling",
  "cannotBearWeight",
  "movementDifficulty",
  "numbnessOrWeakness",
  "coldPaleBlueLimb",
  "deformityOrMajorTrauma",
  "painAtRestOrNight",
  "chestPainOrPressure",
  "breathingDifficulty",
  "faintingOrConfusion",
  "heavyBleeding",
]);

const URGENT_SAFETY_FLAGS = Object.freeze([
  "chestPainOrPressure",
  "breathingDifficulty",
  "faintingOrConfusion",
  "heavyBleeding",
  "deformityOrMajorTrauma",
]);

const CONSULT_SAFETY_FLAGS = Object.freeze([
  "severePain",
  "significantSwelling",
  "cannotBearWeight",
  "movementDifficulty",
  "numbnessOrWeakness",
  "coldPaleBlueLimb",
  "painAtRestOrNight",
]);

const SUPPORT_BLOCKS = Object.freeze({
  normalPlanSuggestions: "normal_plan_suggestions",
});

const SUPPORT_NEXT_ACTIONS = Object.freeze({
  continue: "continue_normal_flow",
  reviewInput: "review_subjective_input",
  openConsultationMemo: "open_consultation_memo",
  editSubjective: "edit_subjective",
  checkOfficialHelp: "check_official_help",
});

const FLAG_REASON_CODES = Object.freeze({
  severePain: "safety_severe_pain_reported",
  significantSwelling: "safety_significant_swelling_reported",
  cannotBearWeight: "safety_cannot_bear_weight_reported",
  movementDifficulty: "safety_movement_difficulty_reported",
  numbnessOrWeakness: "safety_numbness_or_weakness_reported",
  coldPaleBlueLimb: "safety_cold_pale_blue_limb_reported",
  deformityOrMajorTrauma: "safety_deformity_or_major_trauma_reported",
  painAtRestOrNight: "safety_pain_at_rest_or_night_reported",
  chestPainOrPressure: "safety_chest_pain_or_pressure_reported",
  breathingDifficulty: "safety_breathing_difficulty_reported",
  faintingOrConfusion: "safety_fainting_or_confusion_reported",
  heavyBleeding: "safety_heavy_bleeding_reported",
});


function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function evaluateSupportDecision(input = {}) {
  const feedback = input.feedback && typeof input.feedback === "object" ? input.feedback : input;
  const planOutcome = input.planOutcome && typeof input.planOutcome === "object" ? input.planOutcome : {};
  const sourceFlags = feedback.safetyFlags && typeof feedback.safetyFlags === "object"
    ? feedback.safetyFlags
    : {};
  const safetyFlags = Object.fromEntries(
    SAFETY_FLAG_KEYS.map((key) => [key, Boolean(sourceFlags[key])]),
  );
  const activeSafetyFlags = SAFETY_FLAG_KEYS.filter((key) => safetyFlags[key]);
  const safetyCheckStatus = activeSafetyFlags.length
    ? "reported"
    : ["not_asked", "none_reported", "reported"].includes(String(feedback.safetyCheck?.status || ""))
      ? String(feedback.safetyCheck.status)
      : "not_asked";

  const urgentReasons = URGENT_SAFETY_FLAGS
    .filter((key) => safetyFlags[key])
    .map((key) => FLAG_REASON_CODES[key]);
  const consultReasons = CONSULT_SAFETY_FLAGS
    .filter((key) => safetyFlags[key])
    .map((key) => FLAG_REASON_CODES[key]);
  if (String(planOutcome.reason || "") === "strong_pain") {
    consultReasons.push("plan_change_strong_pain");
  }

  const reviewReasons = [];
  const subjectiveStatus = String(feedback.subjectiveCheck?.status || feedback.checkStatus || "");
  if (Boolean(feedback.unexpectedSymptom ?? feedback.symptomContext?.hasUnexpectedSymptom)) {
    reviewReasons.push("unexpected_symptom_reported");
  }

  let route = "normal";
  let routeReasons = ["no_subjective_concern"];
  if (urgentReasons.length) {
    route = "urgent";
    routeReasons = urgentReasons;
  } else if (consultReasons.length) {
    route = "consult";
    routeReasons = consultReasons;
  } else if (reviewReasons.length) {
    route = "review";
    routeReasons = reviewReasons;
  }

  let safetyContextReason = "safety_check_not_asked";
  if (safetyCheckStatus === "none_reported") safetyContextReason = "safety_check_none_reported";
  if (safetyCheckStatus === "reported" && activeSafetyFlags.length) safetyContextReason = "safety_check_reported";
  if (safetyCheckStatus === "reported" && !activeSafetyFlags.length) safetyContextReason = "safety_check_reported_without_active_flag";

  const contextReasons = [safetyContextReason];
  const blocks = ["consult", "urgent"].includes(route)
    ? [SUPPORT_BLOCKS.normalPlanSuggestions]
    : [];
  const nextActions = route === "urgent"
    ? [SUPPORT_NEXT_ACTIONS.checkOfficialHelp, SUPPORT_NEXT_ACTIONS.openConsultationMemo, SUPPORT_NEXT_ACTIONS.editSubjective]
    : route === "consult"
      ? [SUPPORT_NEXT_ACTIONS.openConsultationMemo, SUPPORT_NEXT_ACTIONS.editSubjective]
      : route === "review"
        ? [SUPPORT_NEXT_ACTIONS.reviewInput, SUPPORT_NEXT_ACTIONS.continue]
        : [SUPPORT_NEXT_ACTIONS.continue];

  return Object.freeze({
    route,
    reasons: Object.freeze(unique([...routeReasons, ...contextReasons])),
    routeReasons: Object.freeze(unique(routeReasons)),
    contextReasons: Object.freeze(unique(contextReasons)),
    blocks: Object.freeze(blocks),
    nextActions: Object.freeze(nextActions),
    safetyCheckStatus,
    activeSafetyFlags: Object.freeze(activeSafetyFlags),
    ruleVersion: SUPPORT_RULE_VERSION,
    modelInputUsed: false,
    qaSupportAffectsDecision: false,
  });
}

function shouldBlockNormalPlanSuggestions(decision = {}) {
  return Array.isArray(decision.blocks)
    && decision.blocks.includes(SUPPORT_BLOCKS.normalPlanSuggestions);
}

function shouldPrioritizeOfficialHelp(decision = {}) {
  return String(decision.route || "") === "urgent"
    && Array.isArray(decision.nextActions)
    && decision.nextActions.includes(SUPPORT_NEXT_ACTIONS.checkOfficialHelp);
}
moduleExports["SUPPORT_ROUTES"] = SUPPORT_ROUTES;
moduleExports["SUPPORT_RULE_VERSION"] = SUPPORT_RULE_VERSION;
moduleExports["SUPPORT_DATA_VERSION"] = SUPPORT_DATA_VERSION;
moduleExports["SAFETY_FLAG_KEYS"] = SAFETY_FLAG_KEYS;
moduleExports["URGENT_SAFETY_FLAGS"] = URGENT_SAFETY_FLAGS;
moduleExports["CONSULT_SAFETY_FLAGS"] = CONSULT_SAFETY_FLAGS;
moduleExports["SUPPORT_BLOCKS"] = SUPPORT_BLOCKS;
moduleExports["SUPPORT_NEXT_ACTIONS"] = SUPPORT_NEXT_ACTIONS;
moduleExports["evaluateSupportDecision"] = evaluateSupportDecision;
moduleExports["shouldBlockNormalPlanSuggestions"] = shouldBlockNormalPlanSuggestions;
moduleExports["shouldPrioritizeOfficialHelp"] = shouldPrioritizeOfficialHelp;
internalModules.supportDecision = moduleExports;
}

// ===== core/safety/subjectiveFeedback.js =====
{
const moduleExports = Object.create(null);
const { normalizeBodyAreaObservations } = internalModules.bodyAreaTaxonomy;
const { normalizePlainText, normalizeSingleLineText } = internalModules.inputSafety;
const { evaluateSupportDecision, SAFETY_FLAG_KEYS } = internalModules.supportDecision;

const SUBJECTIVE_CHECK_STATUSES = Object.freeze([
  "not_asked",
  "deferred",
  "none_reported",
  "discomfort_reported",
  "strong_reported",
]);

function normalizeSafetyFlags(source = {}) {
  return Object.freeze(Object.fromEntries(
    SAFETY_FLAG_KEYS.map((key) => [key, Boolean(source[key])]),
  ));
}

function inferSubjectiveCheckStatus(feedback = {}, explicitStatus = "") {
  const hasSafetyFlag = SAFETY_FLAG_KEYS.some((key) => Boolean(feedback.safetyFlags?.[key]));
  if (hasSafetyFlag || Boolean(feedback.unexpectedSymptom ?? feedback.symptomContext?.hasUnexpectedSymptom)) {
    return "strong_reported";
  }
  if (normalizeBodyAreaObservations(feedback.bodyAreaObservations).length) {
    return "discomfort_reported";
  }
  const normalizedExplicitStatus = String(explicitStatus || "");
  if (SUBJECTIVE_CHECK_STATUSES.includes(normalizedExplicitStatus)) return normalizedExplicitStatus;
  if (feedback.safetyCheck?.status === "none_reported") return "none_reported";
  return "not_asked";
}

function normalizeSubjectiveFeedback(input = {}, context = {}) {
  const safetyFlags = normalizeSafetyFlags(input.safetyFlags || {});
  const hasActiveSafetyFlag = SAFETY_FLAG_KEYS.some((key) => safetyFlags[key]);
  const unexpectedSymptom = Boolean(
    input.unexpectedSymptom ?? input.symptomContext?.hasUnexpectedSymptom,
  );
  const bodyAreaObservations = normalizeBodyAreaObservations(input.bodyAreaObservations);
  const checkStatus = inferSubjectiveCheckStatus({
    bodyAreaObservations,
    unexpectedSymptom,
    safetyFlags,
    safetyCheck: input.safetyCheck,
  }, input.checkStatus || input.subjectiveCheck?.status);
  const safetyCheckStatus = hasActiveSafetyFlag
    ? "reported"
    : ["not_asked", "none_reported", "reported"].includes(String(input.safetyCheck?.status || ""))
      ? String(input.safetyCheck.status)
      : "not_asked";

  const normalized = {
    recordId: normalizeSingleLineText(input.recordId, 100),
    date: String(input.date || "").slice(0, 10),
    checkStatus,
    checkedAt: normalizeSingleLineText(input.checkedAt || input.subjectiveCheck?.checkedAt, 40),
    bodyAreaObservations,
    consultationNote: normalizePlainText(input.consultationNote, 500),
    unexpectedSymptom,
    symptomContext: Object.freeze({
      timing: normalizeSingleLineText(input.symptomContext?.timing, 40),
      startedWhen: normalizeSingleLineText(input.symptomContext?.startedWhen, 40),
      triggers: Object.freeze(
        Array.from(new Set(Array.isArray(input.symptomContext?.triggers)
          ? input.symptomContext.triggers.map((value) => normalizeSingleLineText(value, 40)).filter(Boolean)
          : [])).slice(0, 6),
      ),
      note: normalizePlainText(input.symptomContext?.note, 320),
    }),
    safetyFlags,
    safetyCheck: Object.freeze({
      status: safetyCheckStatus,
      checkedAt: normalizeSingleLineText(input.safetyCheck?.checkedAt, 40),
    }),
  };
  const supportDecision = evaluateSupportDecision({
    feedback: normalized,
    planOutcome: context.planOutcome || {},
  });

  return Object.freeze({
    ...normalized,
    supportDecisionSnapshot: supportDecision,
  });
}
moduleExports["SUBJECTIVE_CHECK_STATUSES"] = SUBJECTIVE_CHECK_STATUSES;
moduleExports["normalizeSafetyFlags"] = normalizeSafetyFlags;
moduleExports["inferSubjectiveCheckStatus"] = inferSubjectiveCheckStatus;
moduleExports["normalizeSubjectiveFeedback"] = normalizeSubjectiveFeedback;
internalModules.subjectiveFeedback = moduleExports;
}

// ===== core/storage/subjectiveFeedbackRepository.js =====
{
const moduleExports = Object.create(null);
const { normalizeSubjectiveFeedback } = internalModules.subjectiveFeedback;
const { createCollectionRepository } = internalModules.collectionRepository;
const { STORAGE_KEYS } = internalModules.storageKeys;

function createSubjectiveFeedbackRepository(gateway) {
  const repository = createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.subjectiveFeedback,
    normalizeItem: (item) => normalizeSubjectiveFeedback(item, {
      planOutcome: item.planOutcome || {},
    }),
    getItemId: (item) => item.recordId || `feedback-${item.date}`,
    sortItems: (items) => [...items].sort((left, right) => (
      left.date.localeCompare(right.date) || left.recordId.localeCompare(right.recordId)
    )),
  });

  function findByRecordId(recordId) {
    return repository.loadAll().find((feedback) => feedback.recordId === recordId) || null;
  }

  function save(feedback, context = {}) {
    const normalized = normalizeSubjectiveFeedback(feedback, context);
    if (!normalized.recordId && !normalized.date) {
      return { ok: false, code: "SUBJECTIVE_FEEDBACK_TARGET_REQUIRED", item: null };
    }
    return repository.upsert(normalized);
  }

  return Object.freeze({
    loadAll: repository.loadAll,
    loadAllResult: repository.loadAllResult,
    findByRecordId,
    save,
    removeById: repository.removeById,
  });
}
moduleExports["createSubjectiveFeedbackRepository"] = createSubjectiveFeedbackRepository;
internalModules.subjectiveFeedbackRepository = moduleExports;
}

// ===== core/storage/planRepository.js =====
{
const moduleExports = Object.create(null);
const { INPUT_LIMITS, normalizePlainText, normalizeSingleLineText } = internalModules.inputSafety;
const { createCollectionRepository } = internalModules.collectionRepository;
const { STORAGE_KEYS } = internalModules.storageKeys;

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeCourse(course = {}) {
  const source = course && typeof course === "object" ? course : {};
  const gradeKnowledge = String(source.gradeKnowledge || "UNKNOWN").toUpperCase();
  const modelSurfaceClass = String(source.modelSurfaceClass || "UNKNOWN").toUpperCase();
  return Object.freeze({
    ...clone(source),
    name: normalizeSingleLineText(source.name, 80),
    gradeKnowledge: ["UNKNOWN", "KNOWN_FLAT", "KNOWN_PROFILE"].includes(gradeKnowledge)
      ? gradeKnowledge
      : "UNKNOWN",
    upPercent: finiteNumber(source.upPercent),
    downPercent: finiteNumber(source.downPercent),
    upGradePercent: finiteNumber(source.upGradePercent),
    downGradePercent: finiteNumber(source.downGradePercent),
    modelSurfaceClass: [
      "REF_HARD_EVEN_STABLE",
      "DRY_STABLE_GRASS_TURF",
      "DEEP_DRY_SOFT_SAND",
      "EXPLICIT_UNEVEN",
      "KNOWN_OTHER",
      "UNKNOWN",
    ].includes(modelSurfaceClass) ? modelSurfaceClass : "UNKNOWN",
  });
}

function normalizeSession(session = {}, planType = "run") {
  const source = session && typeof session === "object" ? session : {};
  const cloned = clone(source);
  delete cloned.steps;
  delete cloned.stepsProvenance;
  delete cloned.perceivedExertion;
  delete cloned.rpeProvenance;
  const runningFormat = String(source.runningFormat || "UNKNOWN").toUpperCase();
  const rawSteps = source.steps;
  const hasSteps = planType !== "rest"
    && rawSteps !== ""
    && rawSteps != null
    && Number.isFinite(Number(rawSteps))
    && Number(rawSteps) > 0;
  const rawRpe = source.perceivedExertion;
  const hasRpe = rawRpe !== "" && rawRpe != null && Number.isFinite(Number(rawRpe));
  return Object.freeze({
    ...cloned,
    activityType: planType,
    distanceKm: planType === "rest" ? 0 : finiteNumber(source.distanceKm),
    durationMinutes: planType === "rest" ? 0 : finiteNumber(source.durationMinutes),
    runningFormat: planType === "rest"
      ? "NOT_APPLICABLE"
      : ["CONTINUOUS_RUN", "RUN_WALK", "UNKNOWN"].includes(runningFormat)
        ? runningFormat
        : "UNKNOWN",
    ...(hasSteps ? {
      steps: Math.round(Math.min(INPUT_LIMITS.steps, Number(rawSteps))),
      stepsProvenance: ["DEVICE_MEASURED", "DEVICE_SYNCED", "ESTIMATED", "UNKNOWN"].includes(
        String(source.stepsProvenance || "UNKNOWN").toUpperCase(),
      )
        ? String(source.stepsProvenance || "UNKNOWN").toUpperCase()
        : "UNKNOWN",
    } : {}),
    perceivedExertion: planType === "rest" || !hasRpe
      ? null
      : Math.min(10, Math.max(0, Number(rawRpe))),
    rpeProvenance: planType === "rest" || !hasRpe
      ? "NOT_REPORTED"
      : String(source.rpeProvenance || "USER_REPORTED"),
    course: normalizeCourse(source.course),
  });
}

function normalizePlan(plan = {}) {
  const scheduledDate = String(plan.scheduledDate || plan.date || "").slice(0, 10);
  const id = normalizeSingleLineText(plan.id, 100)
    || `plan-${scheduledDate || "unscheduled"}-001`;
  const planType = String(plan.planType || "run") === "rest" ? "rest" : "run";
  return Object.freeze({
    ...clone(plan),
    id,
    scheduledDate,
    planType,
    title: normalizeSingleLineText(plan.title, 80),
    memo: normalizePlainText(plan.memo, 500),
    plannedSession: normalizeSession(plan.plannedSession, planType),
    sourceRecordId: normalizeSingleLineText(plan.sourceRecordId, 100),
    sourceCandidateId: normalizeSingleLineText(plan.sourceCandidateId, 80) || "custom",
    previewSnapshot: plan.previewSnapshot && typeof plan.previewSnapshot === "object"
      ? clone(plan.previewSnapshot)
      : null,
    previewGeneratedAt: normalizeSingleLineText(plan.previewGeneratedAt, 50),
    outcomeStatus: normalizeSingleLineText(plan.outcomeStatus, 40),
    actualRecordId: normalizeSingleLineText(plan.actualRecordId, 100),
    changeReason: normalizeSingleLineText(plan.changeReason, 60),
    changeReasonNote: normalizePlainText(plan.changeReasonNote, 240),
    createdAt: normalizeSingleLineText(plan.createdAt, 50) || new Date().toISOString(),
    updatedAt: normalizeSingleLineText(plan.updatedAt, 50) || new Date().toISOString(),
  });
}

function createPlanRepository(gateway) {
  return createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.plans,
    normalizeItem: normalizePlan,
    sortItems: (items) => [...items].sort((left, right) => (
      left.scheduledDate.localeCompare(right.scheduledDate)
      || left.id.localeCompare(right.id)
    )),
  });
}
moduleExports["createPlanRepository"] = createPlanRepository;
internalModules.planRepository = moduleExports;
}




// ===== core/model/bodyProfileAdjustment.js =====
{
const moduleExports = Object.create(null);
const { clampNumber, toFiniteNumber } = internalModules.numberUtilities;

// Current profile data is context-only. It does not create a body-size coefficient.
const PERSONAL_PROFILE_SCHEMA_VERSION = 2;
const PERSONAL_PROFILE_NUMERIC_USE = "CONTEXT_ONLY_NO_A4_OR_V27_COEFFICIENT";

const PROFILE_AGE_BAND_OPTIONS = Object.freeze([
  Object.freeze({ key: "18-29", label: "18〜29歳", minAge: 18, maxAge: 29 }),
  Object.freeze({ key: "30-49", label: "30〜49歳", minAge: 30, maxAge: 49 }),
  Object.freeze({ key: "50-64", label: "50〜64歳", minAge: 50, maxAge: 64 }),
  Object.freeze({ key: "65-74", label: "65〜74歳", minAge: 65, maxAge: 74 }),
  Object.freeze({ key: "75+", label: "75歳以上", minAge: 75, maxAge: 130 }),
]);

function normalizeSex(value = "") {
  const text = String(value || "").trim().toLowerCase();
  if (["male", "m", "man", "男性", "男"].includes(text)) return "male";
  if (["female", "f", "woman", "女性", "女"].includes(text)) return "female";
  return "";
}

function normalizeAgeBand(value = "") {
  const text = String(value || "").trim();
  if (PROFILE_AGE_BAND_OPTIONS.some((item) => item.key === text)) return text;
  if (!text) return "";
  const age = Number(text);
  if (!Number.isFinite(age)) return "";
  return PROFILE_AGE_BAND_OPTIONS.find(
    (item) => age >= item.minAge && age <= item.maxAge,
  )?.key || "";
}

function getAgeBandMetadata(ageBand = "") {
  const normalizedAgeBand = normalizeAgeBand(ageBand);
  return PROFILE_AGE_BAND_OPTIONS.find((item) => item.key === normalizedAgeBand) || null;
}

function normalizedOptionalNumber(value, min, max) {
  const number = toFiniteNumber(value, Number.NaN);
  return Number.isFinite(number)
    ? Number(clampNumber(number, min, max).toFixed(1))
    : "";
}

function normalizeBodyProfile(rawProfile = {}) {
  const source = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
  const heightValue = source.heightCm;
  const weightValue = source.weightKg;
  const goals = Array.isArray(source.runningGoalTags)
    ? source.runningGoalTags
    : String(source.runningGoalTags || "").split(",");
  return Object.freeze({
    schemaVersion: PERSONAL_PROFILE_SCHEMA_VERSION,
    numericUse: PERSONAL_PROFILE_NUMERIC_USE,
    sex: normalizeSex(source.sex || ""),
    ageBand: normalizeAgeBand(source.ageBand || ""),
    heightCm: normalizedOptionalNumber(heightValue, 100, 230),
    weightKg: normalizedOptionalNumber(weightValue, 25, 180),
    runningStartDateOrBand: String(source.runningStartDateOrBand || "").trim().slice(0, 80),
    experienceSelfAssessment: String(source.experienceSelfAssessment || "").trim().slice(0, 80),
    runningGoalTags: Object.freeze([...new Set(goals
      .map((item) => String(item || "").trim().slice(0, 80))
      .filter(Boolean))]),
    updatedAt: String(source.updatedAt || "").slice(0, 50),
  });
}

function calculateBodyWeightAdjustment(rawProfile = {}) {
  const profile = normalizeBodyProfile(rawProfile);
  return Object.freeze({
    ready: false,
    profile,
    reference: null,
    referenceWeightKg: "",
    bodyWeightRatio: 1,
    bodyWeightFactor: 1,
    rawBodyWeightFactor: 1,
    formulaVersion: "disabled-current-profile-boundary-v1",
    sourceName: "",
    sourceYear: "",
    message: "プロフィールは見返し・相談・比較条件の文脈に使い、現行の数値計算には使いません。",
  });
}

function createBodyProfileSnapshot(rawProfile = {}, recordedAt = new Date().toISOString()) {
  const profile = normalizeBodyProfile(rawProfile);
  return Object.freeze({
    schemaVersion: PERSONAL_PROFILE_SCHEMA_VERSION,
    numericUse: PERSONAL_PROFILE_NUMERIC_USE,
    sex: profile.sex || "",
    ageBand: profile.ageBand || "",
    heightCm: profile.heightCm || "",
    weightKg: profile.weightKg || "",
    runningStartDateOrBand: profile.runningStartDateOrBand || "",
    experienceSelfAssessment: profile.experienceSelfAssessment || "",
    runningGoalTags: Object.freeze([...(profile.runningGoalTags || [])]),
    recordedAt,
  });
}

function getBodyWeightFactorFromRecord() { return 1; }
moduleExports["PERSONAL_PROFILE_SCHEMA_VERSION"] = PERSONAL_PROFILE_SCHEMA_VERSION;
moduleExports["PERSONAL_PROFILE_NUMERIC_USE"] = PERSONAL_PROFILE_NUMERIC_USE;
moduleExports["PROFILE_AGE_BAND_OPTIONS"] = PROFILE_AGE_BAND_OPTIONS;
moduleExports["normalizeSex"] = normalizeSex;
moduleExports["normalizeAgeBand"] = normalizeAgeBand;
moduleExports["getAgeBandMetadata"] = getAgeBandMetadata;
moduleExports["normalizeBodyProfile"] = normalizeBodyProfile;
moduleExports["calculateBodyWeightAdjustment"] = calculateBodyWeightAdjustment;
moduleExports["createBodyProfileSnapshot"] = createBodyProfileSnapshot;
moduleExports["getBodyWeightFactorFromRecord"] = getBodyWeightFactorFromRecord;
internalModules.bodyProfileAdjustment = moduleExports;
}

// ===== core/storage/simpleValueRepositories.js =====
{
const moduleExports = Object.create(null);
const { normalizeBodyProfile } = internalModules.bodyProfileAdjustment;
const { normalizePlainText } = internalModules.inputSafety;
const { STORAGE_KEYS } = internalModules.storageKeys;

function createProfileRepository(gateway) {
  function loadResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.profile, {});
    return result.ok
      ? { ...result, value: normalizeBodyProfile(result.value) }
      : { ...result, code: "STORAGE_PROFILE_READ_FAILED", value: normalizeBodyProfile({}) };
  }
  return Object.freeze({
    load: () => loadResult().value,
    loadResult,
    save: (profile) => gateway.writeJson(STORAGE_KEYS.profile, normalizeBodyProfile(profile)),
    clear: () => gateway.remove(STORAGE_KEYS.profile),
  });
}

function createSettingsRepository(gateway) {
  function loadResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.settings, {});
    const validValue = result.value && typeof result.value === "object" && !Array.isArray(result.value)
      ? result.value
      : {};
    if (!result.ok) return { ...result, code: "STORAGE_SETTINGS_READ_FAILED", value: {} };
    if (validValue !== result.value) return { ok: false, key: STORAGE_KEYS.settings, code: "STORAGE_SETTINGS_INVALID", value: {} };
    return { ...result, value: validValue };
  }
  return Object.freeze({
    load: () => loadResult().value,
    loadResult,
    save: (settings) => gateway.writeJson(STORAGE_KEYS.settings, settings && typeof settings === "object" ? settings : {}),
    clear: () => gateway.remove(STORAGE_KEYS.settings),
  });
}

function createDraftRepository(gateway) {
  function loadResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.draft, null);
    return result.ok
      ? result
      : { ...result, code: "STORAGE_DRAFT_READ_FAILED", value: null };
  }
  return Object.freeze({
    load: () => loadResult().value,
    loadResult,
    save: (draft) => gateway.writeJson(STORAGE_KEYS.draft, draft == null ? null : {
      ...draft,
      memo: normalizePlainText(draft.memo, 500),
      updatedAt: new Date().toISOString(),
    }),
    clear: () => gateway.remove(STORAGE_KEYS.draft),
  });
}
moduleExports["createProfileRepository"] = createProfileRepository;
moduleExports["createSettingsRepository"] = createSettingsRepository;
moduleExports["createDraftRepository"] = createDraftRepository;
internalModules.simpleValueRepositories = moduleExports;
}

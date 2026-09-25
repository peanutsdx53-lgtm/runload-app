import "./models.js";
import { coreModules } from "./moduleRegistry.js";
import {
  ROF_J_SEMANTIC_VERSION,
  ROF_J_SOURCE_VERSION,
  ROF_J_STORAGE_SCHEMA_VERSION,
  ROF_J_LIFECYCLE_SCHEMA_VERSION,
  isSupportedRofJSemanticVersion,
  isSupportedRofJStorageSchema,
  isSupportedRofJLifecycleSchema,
} from "../rofJConstants.js";

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
coreModules[28] = moduleExports;
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
coreModules[29] = moduleExports;
}

// ===== core/safety/subjectiveFeedback.js =====
{
const moduleExports = Object.create(null);
const { normalizeBodyAreaObservations } = coreModules[28];
const { normalizePlainText, normalizeSingleLineText } = coreModules[6];
const { evaluateSupportDecision, SAFETY_FLAG_KEYS } = coreModules[29];

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
coreModules[30] = moduleExports;
}

// ===== core/storage/subjectiveFeedbackRepository.js =====
{
const moduleExports = Object.create(null);
const { normalizeSubjectiveFeedback } = coreModules[30];
const { createCollectionRepository } = coreModules[10];
const { STORAGE_KEYS } = coreModules[1];

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
coreModules[31] = moduleExports;
}

// ===== core/storage/planRepository.js =====
{
const moduleExports = Object.create(null);
const { INPUT_LIMITS, normalizePlainText, normalizeSingleLineText } = coreModules[6];
const { createCollectionRepository } = coreModules[10];
const { STORAGE_KEYS } = coreModules[1];

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
coreModules[32] = moduleExports;
}




// ===== core/model/bodyProfileAdjustment.js =====
{
const moduleExports = Object.create(null);
const { clampNumber, toFiniteNumber } = coreModules[5];

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
coreModules[36] = moduleExports;
}

// ===== core/storage/simpleValueRepositories.js =====
{
const moduleExports = Object.create(null);
const { normalizeBodyProfile } = coreModules[36];
const { normalizePlainText } = coreModules[6];
const { STORAGE_KEYS } = coreModules[1];

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
coreModules[37] = moduleExports;
}

// ===== core/model/v27/v27Math.js =====
{
const moduleExports = Object.create(null);
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function requirePositiveFinite(value, name) {
  if (!isFiniteNumber(value) || value <= 0) {
    throw new RangeError(`${name} must be positive and finite`);
  }
}

function approximatelyEqual(left, right, tolerance = 1e-9) {
  return Math.abs(left - right) <= tolerance;
}

function validateV27Shares(shares, tolerance = 0.01) {
  const values = [...shares];
  if (
    values.length === 0
    || values.some((value) => !isFiniteNumber(value) || value < 0 || value > 100)
  ) {
    throw new RangeError("shares must be finite values in [0, 100]");
  }
  const sum = values.reduce((total, value) => total + value, 0);
  if (Math.abs(sum - 100) > tolerance) {
    throw new RangeError("shares must sum to 100; no normalization is allowed");
  }
  return sum;
}

function linearInterpolate(value, xs, ys) {
  const epsilon = 1e-9;
  if (value < xs[0] - epsilon || value > xs.at(-1) + epsilon) {
    throw new RangeError("out of interpolation domain");
  }
  if (Math.abs(value - xs[0]) <= epsilon) return ys[0];
  if (Math.abs(value - xs.at(-1)) <= epsilon) return ys.at(-1);
  for (let index = 0; index < xs.length - 1; index += 1) {
    const left = xs[index];
    const right = xs[index + 1];
    if (left <= value && value <= right) {
      const fraction = (value - left) / (right - left);
      return ys[index] + fraction * (ys[index + 1] - ys[index]);
    }
  }
  throw new Error("unreachable interpolation interval");
}

function median(values) {
  const numeric = [...values].filter(isFiniteNumber).sort((left, right) => left - right);
  if (!numeric.length) throw new RangeError("median requires at least one finite value");
  const middle = Math.floor(numeric.length / 2);
  return numeric.length % 2
    ? numeric[middle]
    : (numeric[middle - 1] + numeric[middle]) / 2;
}

function weightedMean(items) {
  return items.reduce((total, [weight, value]) => total + weight * value, 0);
}

function weightedRearrangementProduct(left, right, sameOrder) {
  const leftWork = [...left]
    .sort((a, b) => a[1] - b[1])
    .map(([weight, value]) => [weight, value]);
  const rightWork = [...right]
    .sort((a, b) => sameOrder ? a[1] - b[1] : b[1] - a[1])
    .map(([weight, value]) => [weight, value]);
  let leftIndex = 0;
  let rightIndex = 0;
  let result = 0;
  const epsilon = 1e-12;

  while (leftIndex < leftWork.length && rightIndex < rightWork.length) {
    const amount = Math.min(leftWork[leftIndex][0], rightWork[rightIndex][0]);
    result += amount * leftWork[leftIndex][1] * rightWork[rightIndex][1];
    leftWork[leftIndex][0] -= amount;
    rightWork[rightIndex][0] -= amount;
    if (leftWork[leftIndex][0] <= epsilon) leftIndex += 1;
    if (rightWork[rightIndex][0] <= epsilon) rightIndex += 1;
  }
  return result;
}
moduleExports["isFiniteNumber"] = isFiniteNumber;
moduleExports["requirePositiveFinite"] = requirePositiveFinite;
moduleExports["approximatelyEqual"] = approximatelyEqual;
moduleExports["validateV27Shares"] = validateV27Shares;
moduleExports["linearInterpolate"] = linearInterpolate;
moduleExports["median"] = median;
moduleExports["weightedMean"] = weightedMean;
moduleExports["weightedRearrangementProduct"] = weightedRearrangementProduct;
coreModules[38] = moduleExports;
}

// ===== core/model/v27/v27Model.js =====
{
const moduleExports = Object.create(null);
const { V27_CADENCE_CURVES, V27_EMPHASIS_REGION_IDS, V27_GRADE_CURVES, V27_MODEL_VERSION, V27_REGIONS, V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG, V27_SPEED_CURVES, V27_SURFACE_FACTORS, V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT } = coreModules[12];
const { approximatelyEqual, isFiniteNumber, linearInterpolate, requirePositiveFinite, validateV27Shares, weightedMean, weightedRearrangementProduct } = coreModules[38];

function minettiCost(gradeDecimal) {
  const grade = gradeDecimal;
  return (
    155.4 * grade ** 5
    - 30.4 * grade ** 4
    - 43.3 * grade ** 3
    + 46.3 * grade ** 2
    + 19.5 * grade
    + 3.6
  );
}

function calculateV27TotalGradeFactor(gradePercent) {
  if (gradePercent == null) return Object.freeze({ factor: 1, state: "UNKNOWN" });
  if (!isFiniteNumber(gradePercent)) return Object.freeze({ factor: 1, state: "INVALID" });
  if (
    gradePercent < -V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT
    || gradePercent > V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT
  ) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  return Object.freeze({
    factor: minettiCost(gradePercent / 100) / minettiCost(0),
    state: "KNOWN_APPLIED",
  });
}

function validateBaseSession(session) {
  requirePositiveFinite(session.distance_km, "distance_km");
  requirePositiveFinite(session.active_minutes, "active_minutes");
  if (
    session.rpe != null
    && (!isFiniteNumber(session.rpe) || session.rpe < 0 || session.rpe > 10)
  ) {
    throw new RangeError("RPE must be blank or in [0, 10]");
  }
}

function validateSections(session) {
  const sections = Array.isArray(session.sections) ? session.sections : [];
  if (!sections.length) return null;
  if (sections.some((section) => (
    !isFiniteNumber(section.distance_km) || section.distance_km <= 0
  ))) {
    throw new RangeError("section distances must be positive and finite");
  }
  const distanceSum = sections.reduce((total, section) => total + section.distance_km, 0);
  if (Math.abs(distanceSum - session.distance_km) > 0.01) {
    throw new RangeError("section distance sum mismatch; no rescaling is allowed");
  }
  return sections;
}

function validateMarginalProfiles(session) {
  const gradeProfile = Array.isArray(session.grade_profile) ? session.grade_profile : [];
  const surfaceProfile = Array.isArray(session.surface_profile) ? session.surface_profile : [];
  validateV27Shares(gradeProfile.map((item) => item.share_pct));
  validateV27Shares(surfaceProfile.map((item) => item.share_pct));
  return { gradeProfile, surfaceProfile };
}

function surfaceFactor(surfaceClass) {
  const entry = V27_SURFACE_FACTORS[surfaceClass];
  if (!entry) throw new RangeError(`unknown surface class: ${surfaceClass}`);
  return entry;
}

function calculateV27TotalFromSections(session) {
  validateBaseSession(session);
  const sections = validateSections(session);
  if (!sections) throw new RangeError("paired sections are required");
  let central = 0;
  let low = 0;
  let high = 0;
  let gradeAppliedDistance = 0;
  let surfaceAppliedDistance = 0;
  const sectionResults = [];

  sections.forEach((section) => {
    const gradeResult = calculateV27TotalGradeFactor(section.grade_pct);
    const surfaceResult = surfaceFactor(section.surface_class);
    if (gradeResult.state === "KNOWN_APPLIED") gradeAppliedDistance += section.distance_km;
    if (surfaceResult.state === "KNOWN_APPLIED") surfaceAppliedDistance += section.distance_km;
    const centralFactor = gradeResult.factor * surfaceResult.central;
    let factorLow;
    let factorHigh;
    if (
      gradeResult.state === "KNOWN_APPLIED"
      && surfaceResult.state === "KNOWN_APPLIED"
      && surfaceResult.central !== 1
    ) {
      const candidates = [
        gradeResult.factor * surfaceResult.low,
        gradeResult.factor * surfaceResult.high,
        Math.max(0, gradeResult.factor + surfaceResult.low - 1),
        Math.max(0, gradeResult.factor + surfaceResult.high - 1),
      ];
      factorLow = Math.min(...candidates);
      factorHigh = Math.max(...candidates);
    } else if (surfaceResult.state === "KNOWN_APPLIED") {
      factorLow = gradeResult.factor * surfaceResult.low;
      factorHigh = gradeResult.factor * surfaceResult.high;
    } else {
      factorLow = gradeResult.factor;
      factorHigh = gradeResult.factor;
    }
    central += 100 * section.distance_km * centralFactor;
    low += 100 * section.distance_km * factorLow;
    high += 100 * section.distance_km * factorHigh;
    sectionResults.push(Object.freeze({
      distance_km: section.distance_km,
      grade_state: gradeResult.state,
      surface_state: surfaceResult.state,
      surface_class: section.surface_class,
      central_factor: centralFactor,
      factor_range: Object.freeze([factorLow, factorHigh]),
    }));
  });

  const widthRatio = central > 0 ? (high - low) / central : 0;
  return Object.freeze({
    model_version: V27_MODEL_VERSION,
    central_points: central,
    range_points: Object.freeze([low, high]),
    show_range_primary: widthRatio > 0.2,
    structural_width_ratio: widthRatio,
    grade_coverage: gradeAppliedDistance / session.distance_km,
    surface_coverage: surfaceAppliedDistance / session.distance_km,
    pairing_state: "PAIRED_ORDERED_SECTIONS",
    sections: Object.freeze(sectionResults),
    is_measured_physical_load: false,
    supports_medical_decision: false,
  });
}

function calculateV27TotalFromMarginalProfiles(session) {
  validateBaseSession(session);
  const { gradeProfile, surfaceProfile } = validateMarginalProfiles(session);
  const gradeItems = [];
  const surfaceCentralItems = [];
  const surfaceLowItems = [];
  const surfaceHighItems = [];
  const gradeStates = [];
  const surfaceStates = [];
  let gradeCoverage = 0;
  let surfaceCoverage = 0;

  gradeProfile.forEach((item) => {
    const result = calculateV27TotalGradeFactor(item.grade_pct);
    const fraction = item.share_pct / 100;
    gradeItems.push([fraction, result.factor]);
    gradeStates.push(result.state);
    if (result.state === "KNOWN_APPLIED") gradeCoverage += fraction;
  });
  surfaceProfile.forEach((item) => {
    const result = surfaceFactor(item.surface_class);
    const fraction = item.share_pct / 100;
    surfaceCentralItems.push([fraction, result.central]);
    surfaceLowItems.push([fraction, result.low]);
    surfaceHighItems.push([fraction, result.high]);
    surfaceStates.push(result.state);
    if (result.state === "KNOWN_APPLIED") surfaceCoverage += fraction;
  });

  const meanGrade = weightedMean(gradeItems);
  const meanSurface = weightedMean(surfaceCentralItems);
  const meanSurfaceLow = weightedMean(surfaceLowItems);
  const meanSurfaceHigh = weightedMean(surfaceHighItems);
  const centralFactor = meanGrade * meanSurface;
  const multiplicativeLow = weightedRearrangementProduct(
    gradeItems,
    surfaceLowItems,
    false,
  );
  const multiplicativeHigh = weightedRearrangementProduct(
    gradeItems,
    surfaceHighItems,
    true,
  );
  const additiveLow = Math.max(0, meanGrade + meanSurfaceLow - 1);
  const additiveHigh = Math.max(0, meanGrade + meanSurfaceHigh - 1);
  const factorLow = Math.min(multiplicativeLow, additiveLow, centralFactor);
  const factorHigh = Math.max(multiplicativeHigh, additiveHigh, centralFactor);
  const central = 100 * session.distance_km * centralFactor;
  const low = 100 * session.distance_km * factorLow;
  const high = 100 * session.distance_km * factorHigh;
  const widthRatio = central > 0 ? (high - low) / central : 0;

  return Object.freeze({
    model_version: V27_MODEL_VERSION,
    central_points: central,
    range_points: Object.freeze([low, high]),
    show_range_primary: widthRatio > 0.2,
    structural_width_ratio: widthRatio,
    grade_coverage: gradeCoverage,
    surface_coverage: surfaceCoverage,
    pairing_state: "MARGINAL_OVERLAP_UNKNOWN",
    central_pairing_assumption: "INDEPENDENCE_OF_MARGINAL_PROFILES",
    grade_states: Object.freeze(gradeStates),
    surface_states: Object.freeze(surfaceStates),
    is_measured_physical_load: false,
    supports_medical_decision: false,
  });
}

function calculateV27Total(session) {
  return Array.isArray(session.sections) && session.sections.length
    ? calculateV27TotalFromSections(session)
    : calculateV27TotalFromMarginalProfiles(session);
}

function gradeDegrees(gradePercent) {
  return Math.atan(gradePercent / 100) * 180 / Math.PI;
}

function calculateV27RegionalGradeFactor(regionId, gradePercent) {
  const curve = V27_GRADE_CURVES[regionId];
  if (!curve) return Object.freeze({ factor: 1, state: "NOT_APPLICABLE" });
  if (gradePercent == null) return Object.freeze({ factor: 1, state: "UNKNOWN" });
  if (!isFiniteNumber(gradePercent)) return Object.freeze({ factor: 1, state: "INVALID" });
  let valueDegrees = gradeDegrees(gradePercent);
  if (
    valueDegrees < curve.xs[0] - V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG
    || valueDegrees > curve.xs.at(-1) + V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG
  ) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  if (valueDegrees < curve.xs[0]) valueDegrees = curve.xs[0];
  if (valueDegrees > curve.xs.at(-1)) valueDegrees = curve.xs.at(-1);
  return Object.freeze({
    factor: linearInterpolate(valueDegrees, curve.xs, curve.ys),
    state: "KNOWN_APPLIED",
  });
}

function calculateV27RegionalSpeedFactor(regionId, speedMps, activityType) {
  const curve = V27_SPEED_CURVES[regionId];
  if (!curve || activityType !== "CONTINUOUS_RUN") {
    return Object.freeze({ factor: 1, state: "NOT_APPLICABLE" });
  }
  if (speedMps < curve.xs[0] || speedMps > curve.xs.at(-1)) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  return Object.freeze({
    factor: linearInterpolate(speedMps, curve.xs, curve.ys),
    state: "KNOWN_APPLIED",
  });
}

function calculateV27RegionalCadenceFactor({
  regionId,
  speedMps,
  cadenceDeltaSpm,
  reliable,
  referenceN,
}) {
  const curve = V27_CADENCE_CURVES[regionId];
  if (!curve) return Object.freeze({ factor: 1, state: "NOT_APPLICABLE" });
  if (cadenceDeltaSpm == null) return Object.freeze({ factor: 1, state: "UNKNOWN" });
  if (!reliable || referenceN < 3) {
    return Object.freeze({ factor: 1, state: "NOT_APPLICABLE" });
  }
  if (speedMps < 3 || speedMps > 3.67) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  if (cadenceDeltaSpm < curve.xs[0] || cadenceDeltaSpm > curve.xs.at(-1)) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  return Object.freeze({
    factor: linearInterpolate(cadenceDeltaSpm, curve.xs, curve.ys),
    state: "KNOWN_APPLIED",
  });
}

function regionalGradeSections(session) {
  const sections = validateSections(session);
  if (sections) return sections;
  const { gradeProfile } = validateMarginalProfiles(session);
  return gradeProfile.map((item) => ({
    distance_km: session.distance_km * item.share_pct / 100,
    grade_pct: item.grade_pct,
  }));
}

function regionalSurfaceClasses(session) {
  const sections = Array.isArray(session.sections) ? session.sections : [];
  if (sections.length) return new Set(sections.map((section) => section.surface_class));
  const { surfaceProfile } = validateMarginalProfiles(session);
  return new Set(surfaceProfile.map((item) => item.surface_class));
}

function surfaceContexts(regionId, surfaceClasses) {
  const contexts = [];
  if (surfaceClasses.has("DEEP_DRY_SOFT_SAND")) {
    if (regionId === "R06") {
      contexts.push("SAND_TIBIALIS_ANTERIOR_TESTED_INCREASE_GROUP_DEPENDENT");
    } else if (regionId === "R07") {
      contexts.push("SAND_GASTROCNEMIUS_RESPONSE_LOWER_OR_MIXED");
    } else {
      contexts.push("SAND_REGIONAL_SCALAR_NOT_ESTABLISHED");
    }
  }
  if (surfaceClasses.has("EXPLICIT_UNEVEN")) {
    if (regionId === "R03") {
      contexts.push("UNEVEN_SELECTED_ANTERIOR_THIGH_EMG_INCREASED_IN_TEST");
    } else if (regionId === "R04") {
      contexts.push("UNEVEN_MEDIAL_HAMSTRING_EMG_INCREASED_IN_TEST");
    } else if (regionId === "R08") {
      contexts.push("UNEVEN_ANKLE_WORK_DECREASED_WHILE_VARIABILITY_INCREASED");
    } else {
      contexts.push("UNEVEN_REGIONAL_VARIABILITY_CONTEXT_ONLY");
    }
  }
  if (surfaceClasses.has("KNOWN_OTHER")) {
    contexts.push("KNOWN_SURFACE_WITHOUT_REGIONAL_SCALAR");
  }
  if (surfaceClasses.has("UNKNOWN")) {
    contexts.push("UNKNOWN_SURFACE_NO_REGIONAL_INFERENCE");
  }
  return Object.freeze(contexts);
}

function calculateV27Regional(session) {
  validateBaseSession(session);
  const sections = regionalGradeSections(session);
  const surfaceClasses = regionalSurfaceClasses(session);
  const speedMps = session.distance_km * 1000 / (session.active_minutes * 60);
  const outputs = {};

  V27_REGIONS.forEach((region) => {
    let gradeOnlyExposure = 0;
    let appliedGradeDistance = 0;
    const gradeStates = [];
    sections.forEach((section) => {
      const result = calculateV27RegionalGradeFactor(region.id, section.grade_pct);
      gradeOnlyExposure += section.distance_km * result.factor;
      gradeStates.push(result.state);
      if (result.state === "KNOWN_APPLIED") appliedGradeDistance += section.distance_km;
    });
    const speedResult = calculateV27RegionalSpeedFactor(
      region.id,
      speedMps,
      session.activity_type,
    );
    const cadenceResult = calculateV27RegionalCadenceFactor({
      regionId: region.id,
      speedMps,
      cadenceDeltaSpm: session.cadence_delta_spm,
      reliable: session.cadence_provenance_reliable === true,
      referenceN: session.cadence_reference_n || 0,
    });
    const gradeMeanFactor = gradeOnlyExposure / session.distance_km;
    const multiplicativeFactor = gradeMeanFactor * speedResult.factor * cadenceResult.factor;
    const additiveFactor = Math.max(
      0,
      1
      + (gradeMeanFactor - 1)
      + (speedResult.factor - 1)
      + (cadenceResult.factor - 1),
    );
    const knownGrades = new Set(
      sections
        .filter((section) => isFiniteNumber(section.grade_pct))
        .map((section) => section.grade_pct.toFixed(9)),
    );
    const averageSpeedApproximation = (
      Boolean(V27_SPEED_CURVES[region.id]) && knownGrades.size > 1
    );
    const candidates = [multiplicativeFactor, additiveFactor];
    if (
      session.cadence_robustness_state === "TOLERANCE_DEPENDENT"
      && cadenceResult.state === "KNOWN_APPLIED"
    ) {
      candidates.push(gradeMeanFactor * speedResult.factor);
    }
    if (averageSpeedApproximation) candidates.push(gradeMeanFactor);
    const rawExposure = session.distance_km * multiplicativeFactor;
    const exposureLow = session.distance_km * Math.min(...candidates);
    const exposureHigh = session.distance_km * Math.max(...candidates);
    const widthRatio = rawExposure > 0 ? (exposureHigh - exposureLow) / rawExposure : 0;
    const curve = V27_GRADE_CURVES[region.id];
    const gradeCoverage = curve ? appliedGradeDistance / session.distance_km : null;
    const endpointConfidence = curve?.endpointConfidence || "LOW";
    const endpoint = curve?.endpoint || "volume_only";
    const gradeSignature = gradeCoverage == null ? "NA" : gradeCoverage.toFixed(3);
    const ratio = 100 * rawExposure / session.distance_km;
    outputs[region.id] = Object.freeze({
      region_id: region.id,
      label: region.label,
      raw_exposure: rawExposure,
      raw_exposure_range: Object.freeze([exposureLow, exposureHigh]),
      show_range_primary: widthRatio > 0.1,
      interaction_width_ratio: widthRatio,
      condition_index_same_distance: ratio,
      run_fact_regional_ratio: ratio,
      condition_index_range: Object.freeze([
        100 * exposureLow / session.distance_km,
        100 * exposureHigh / session.distance_km,
      ]),
      primary_display_value: curve ? ratio : null,
      primary_display_mode: curve
        ? "CONDITION_RESPONSIVE_NUMERIC"
        : "VOLUME_ONLY_CONTEXT",
      grade_coverage: gradeCoverage,
      grade_states: Object.freeze(gradeStates),
      speed_factor: speedResult.factor,
      speed_state: speedResult.state,
      cadence_factor: cadenceResult.factor,
      cadence_state: cadenceResult.state,
      cadence_robustness_state: session.cadence_robustness_state || "NOT_EVALUATED",
      session_average_speed_approximation: averageSpeedApproximation,
      coverage_signature: `G:${gradeSignature}|S:${speedResult.state}|C:${cadenceResult.state}`,
      endpoint,
      endpoint_confidence: endpointConfidence,
      surface_contexts: surfaceContexts(region.id, surfaceClasses),
      supports_medical_decision: false,
    });
  });
  return Object.freeze(outputs);
}

function calculateV27WithinRunRegionalEmphasis(regionalResults) {
  if (V27_EMPHASIS_REGION_IDS.some((regionId) => !regionalResults[regionId])) {
    throw new RangeError("all fixed six emphasis regions are required");
  }
  const rows = V27_EMPHASIS_REGION_IDS.map((regionId) => regionalResults[regionId]);
  const centralValues = rows.map((row) => row.run_fact_regional_ratio);
  const ranges = rows.map((row) => row.condition_index_range);
  const gradeCoverages = rows.map((row) => row.grade_coverage);
  if (centralValues.some((value) => !isFiniteNumber(value) || value <= 0)) {
    throw new RangeError("all six run-fact regional ratios must be positive");
  }
  if (ranges.some(([low, high]) => (
    !isFiniteNumber(low)
    || !isFiniteNumber(high)
    || low <= 0
    || high <= 0
    || low > high
  ))) {
    throw new RangeError("all six regional ranges must be positive and ordered");
  }
  if (gradeCoverages.some((value) => !isFiniteNumber(value))) {
    throw new RangeError("all six grade coverage values are required");
  }
  const roundedCoverages = new Set(gradeCoverages.map((value) => value.toFixed(9)));
  if (roundedCoverages.size !== 1) {
    return Object.freeze({
      model_version: V27_MODEL_VERSION,
      state: "UNAVAILABLE_COVERAGE_MISMATCH",
      coverage_values: Object.freeze(gradeCoverages),
      region_ids: V27_EMPHASIS_REGION_IDS,
      rows: Object.freeze([]),
      supports_relative_emphasis_comparison: false,
      supports_absolute_regional_load_comparison: false,
      is_compositional_share: false,
    });
  }

  const commonGradeCoverage = gradeCoverages[0];
  const centralSum = centralValues.reduce((total, value) => total + value, 0);
  const resultRows = V27_EMPHASIS_REGION_IDS.map((regionId, index) => {
    const central = 600 * centralValues[index] / centralSum;
    const [ownLow, ownHigh] = ranges[index];
    const otherHighSum = ranges.reduce(
      (total, range, otherIndex) => total + (otherIndex === index ? 0 : range[1]),
      0,
    );
    const otherLowSum = ranges.reduce(
      (total, range, otherIndex) => total + (otherIndex === index ? 0 : range[0]),
      0,
    );
    const low = 600 * ownLow / (ownLow + otherHighSum);
    const high = 600 * ownHigh / (ownHigh + otherLowSum);
    const widthRatio = central > 0 ? (high - low) / central : 0;
    const direction = central > 100
      ? "ABOVE_SIX_REGION_MEAN"
      : central < 100
        ? "BELOW_SIX_REGION_MEAN"
        : "AT_SIX_REGION_MEAN";
    return Object.freeze({
      region_id: regionId,
      relative_emphasis_index: central,
      relative_emphasis_range: Object.freeze([low, high]),
      show_range_primary: widthRatio > 0.1,
      direction,
      endpoint: rows[index].endpoint,
      endpoint_confidence: rows[index].endpoint_confidence,
    });
  });
  return Object.freeze({
    model_version: V27_MODEL_VERSION,
    state: "AVAILABLE",
    coverage_state: approximatelyEqual(commonGradeCoverage, 1) ? "FULL" : "PARTIAL",
    common_grade_coverage: commonGradeCoverage,
    region_ids: V27_EMPHASIS_REGION_IDS,
    rows: Object.freeze(resultRows),
    mean_index: resultRows.reduce(
      (total, row) => total + row.relative_emphasis_index,
      0,
    ) / resultRows.length,
    supports_relative_emphasis_comparison: true,
    supports_absolute_regional_load_comparison: false,
    is_compositional_share: false,
    fixed_region_count: 6,
  });
}

function calculateV27InternalResponse(session) {
  validateBaseSession(session);
  if (session.rpe == null) {
    return Object.freeze({ state: "UNKNOWN", srpe_au: null });
  }
  return Object.freeze({
    state: "KNOWN",
    srpe_au: session.active_minutes * session.rpe,
    separate_from_objective_model: true,
  });
}

function calculateV27Session(session) {
  const regional = calculateV27Regional(session);
  return Object.freeze({
    model_version: V27_MODEL_VERSION,
    total: calculateV27Total(session),
    regional,
    within_run_regional_emphasis: calculateV27WithinRunRegionalEmphasis(regional),
    internal: calculateV27InternalResponse(session),
  });
}

function assertV27ResultSemantics(result) {
  const errors = [];
  const emphasis = result?.within_run_regional_emphasis;
  if (result?.model_version !== V27_MODEL_VERSION) errors.push("MODEL_VERSION_MISMATCH");
  if (!emphasis) errors.push("MISSING_WITHIN_RUN_EMPHASIS");
  if (emphasis?.state === "AVAILABLE") {
    if (emphasis.fixed_region_count !== 6) errors.push("FIXED_REGION_COUNT_NOT_SIX");
    if (
      JSON.stringify(emphasis.region_ids) !== JSON.stringify(V27_EMPHASIS_REGION_IDS)
    ) {
      errors.push("FIXED_REGION_IDS_MISMATCH");
    }
    const values = emphasis.rows.map((row) => row.relative_emphasis_index);
    if (values.some((value) => !isFiniteNumber(value) || value <= 0)) {
      errors.push("INVALID_EMPHASIS_VALUE");
    }
    const mean = values.reduce((total, value) => total + value, 0) / values.length;
    if (!approximatelyEqual(mean, 100, 1e-9)) errors.push("EMPHASIS_MEAN_NOT_100");
    emphasis.rows.forEach((row) => {
      const [low, high] = row.relative_emphasis_range;
      if (
        low - row.relative_emphasis_index > 1e-9
        || row.relative_emphasis_index - high > 1e-9
      ) {
        errors.push(`EMPHASIS_RANGE_INVALID_${row.region_id}`);
      }
    });
  }
  if (emphasis?.is_compositional_share !== false) errors.push("COMPOSITIONAL_FLAG_INVALID");
  if (emphasis?.supports_absolute_regional_load_comparison !== false) {
    errors.push("ABSOLUTE_COMPARISON_FLAG_INVALID");
  }
  if (result?.total?.supports_medical_decision !== false) {
    errors.push("MEDICAL_SUPPORT_FLAG_INVALID");
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}
moduleExports["minettiCost"] = minettiCost;
moduleExports["calculateV27TotalGradeFactor"] = calculateV27TotalGradeFactor;
moduleExports["calculateV27TotalFromSections"] = calculateV27TotalFromSections;
moduleExports["calculateV27TotalFromMarginalProfiles"] = calculateV27TotalFromMarginalProfiles;
moduleExports["calculateV27Total"] = calculateV27Total;
moduleExports["calculateV27RegionalGradeFactor"] = calculateV27RegionalGradeFactor;
moduleExports["calculateV27RegionalSpeedFactor"] = calculateV27RegionalSpeedFactor;
moduleExports["calculateV27RegionalCadenceFactor"] = calculateV27RegionalCadenceFactor;
moduleExports["calculateV27Regional"] = calculateV27Regional;
moduleExports["calculateV27WithinRunRegionalEmphasis"] = calculateV27WithinRunRegionalEmphasis;
moduleExports["calculateV27InternalResponse"] = calculateV27InternalResponse;
moduleExports["calculateV27Session"] = calculateV27Session;
moduleExports["assertV27ResultSemantics"] = assertV27ResultSemantics;
coreModules[39] = moduleExports;
}

// ===== core/storage/courseRepository.js =====
{
const moduleExports = Object.create(null);
const { SURFACE_FIELDS, hasTreadmillOutdoorSurfaceMixFromCourse } = coreModules[3];
const { normalizeSingleLineText } = coreModules[6];
const { createCollectionRepository } = coreModules[10];
const { STORAGE_KEYS } = coreModules[1];

const COURSE_NUMERIC_FIELDS = Object.freeze([
  "upPercent", "downPercent", "upGradePercent", "downGradePercent",
  ...SURFACE_FIELDS.map(({ recordKey }) => recordKey),
]);

const GRADE_INPUT_MODES = new Set(["UNKNOWN", "FLAT", "SUMMARY", "SECTIONS"]);
const SURFACE_INPUT_MODES = new Set(["UNKNOWN", "SINGLE", "MIXED"]);
const GRADE_DIRECTIONS = new Set(["UPHILL", "DOWNHILL", "FLAT", "UNKNOWN"]);
const ROUTE_PATTERNS = new Set(["LOOP", "OUT_AND_BACK", "ONE_WAY", "MIXED", "UNKNOWN"]);
const SURFACE_CLASSES = new Set([
  "REF_HARD_EVEN_STABLE",
  "DRY_STABLE_GRASS_TURF",
  "DEEP_DRY_SOFT_SAND",
  "EXPLICIT_UNEVEN",
  "KNOWN_OTHER",
  "UNKNOWN",
]);

function boundedNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return number;
}

function normalizedGradeInputMode(course = {}) {
  const explicit = String(course?.gradeInputMode || "").toUpperCase();
  if (GRADE_INPUT_MODES.has(explicit)) return explicit;
  if (Array.isArray(course?.sections) && course.sections.length) return "SECTIONS";
  if (String(course?.gradeKnowledge || "").toUpperCase() === "KNOWN_FLAT") return "FLAT";
  if (String(course?.gradeKnowledge || "").toUpperCase() === "KNOWN_PROFILE") return "SUMMARY";
  return "UNKNOWN";
}

function normalizedSurfaceInputMode(course = {}) {
  const explicit = String(course?.surfaceInputMode || "").toUpperCase();
  if (SURFACE_INPUT_MODES.has(explicit)) return explicit;
  const positive = SURFACE_FIELDS.filter(({ recordKey }) => Number(course?.[recordKey] || 0) > 0);
  if (!positive.length) return "UNKNOWN";
  if (positive.length === 1 && Math.abs(Number(course?.[positive[0].recordKey] || 0) - 100) <= 0.01) return "SINGLE";
  return "MIXED";
}

function normalizeSections(sections = []) {
  if (!Array.isArray(sections)) return Object.freeze([]);
  return Object.freeze(sections.flatMap((item = {}, index) => {
    const sharePercent = boundedNumber(item.sharePercent);
    const rawDirection = String(item.gradeDirection || "").toUpperCase();
    const rawGrade = boundedNumber(item.gradePercent);
    const gradeDirection = GRADE_DIRECTIONS.has(rawDirection)
      ? rawDirection
      : rawGrade > 0
        ? "UPHILL"
        : rawGrade < 0
          ? "DOWNHILL"
          : "FLAT";
    const gradePercent = gradeDirection === "FLAT" ? 0 : Math.abs(rawGrade);
    if (!(sharePercent > 0)) return [];
    return [Object.freeze({
      sectionId: normalizeSingleLineText(item.sectionId, 80) || `section-${index + 1}`,
      sharePercent,
      distanceKm: Number(item.distanceKm) > 0 ? Number(item.distanceKm) : null,
      durationMinutes: Number(item.durationMinutes) > 0 ? Number(item.durationMinutes) : null,
      steps: item.steps != null && Number.isInteger(Number(item.steps)) && Number(item.steps) >= 0 ? Number(item.steps) : null,
      speedMps: Number(item.speedMps) > 0 ? Number(item.speedMps) : null,
      cadenceSpm: Number(item.cadenceSpm) > 0 ? Number(item.cadenceSpm) : null,
      gradeDirection,
      gradePercent,
    })];
  }));
}

function normalizeSurfaceProfile(profile = []) {
  if (!Array.isArray(profile)) return Object.freeze([]);
  return Object.freeze(profile.flatMap((item = {}) => {
    const sharePercent = boundedNumber(item.sharePercent);
    const surfaceClass = String(item.surfaceClass || "UNKNOWN").toUpperCase();
    if (!(sharePercent > 0)) return [];
    return [Object.freeze({
      sharePercent,
      surfaceClass: SURFACE_CLASSES.has(surfaceClass) ? surfaceClass : "UNKNOWN",
    })];
  }));
}

function normalizeCourseFields(course = {}) {
  const gradeInputMode = normalizedGradeInputMode(course);
  const surfaceInputMode = normalizedSurfaceInputMode(course);
  const gradeKnowledge = gradeInputMode === "FLAT"
    ? "KNOWN_FLAT"
    : ["SUMMARY", "SECTIONS"].includes(gradeInputMode)
      ? "KNOWN_PROFILE"
      : "UNKNOWN";
  const modelSurfaceClass = String(course?.modelSurfaceClass || "UNKNOWN").toUpperCase();
  const normalized = {
    name: normalizeSingleLineText(course?.name, 80),
    routePattern: ROUTE_PATTERNS.has(String(course?.routePattern || "UNKNOWN").toUpperCase())
      ? String(course.routePattern || "UNKNOWN").toUpperCase()
      : "UNKNOWN",
    gradeInputMode,
    surfaceInputMode,
    gradeKnowledge,
    upPercent: boundedNumber(course?.upPercent),
    downPercent: boundedNumber(course?.downPercent),
    upGradePercent: boundedNumber(course?.upGradePercent),
    downGradePercent: boundedNumber(course?.downGradePercent),
    modelSurfaceClass: SURFACE_CLASSES.has(modelSurfaceClass) ? modelSurfaceClass : "UNKNOWN",
    modelSurfaceProfile: normalizeSurfaceProfile(course?.modelSurfaceProfile),
    sections: normalizeSections(course?.sections),
  };
  SURFACE_FIELDS.forEach(({ recordKey }) => {
    normalized[recordKey] = boundedNumber(course?.[recordKey] ?? 0);
  });
  return Object.freeze(normalized);
}

function validateSections(sections = []) {
  if (!sections.length) return { ok: false, code: "COURSE_SECTION_REQUIRED", message: "区間入力では、少なくとも1区間の割合を入力してください。" };
  const invalid = sections.some((section) => (
    !Number.isFinite(Number(section.sharePercent))
    || Number(section.sharePercent) <= 0
    || Number(section.sharePercent) > 100
    || !GRADE_DIRECTIONS.has(String(section.gradeDirection || "").toUpperCase())
    || !Number.isFinite(Number(section.gradePercent))
    || Number(section.gradePercent) < 0
    || Number(section.gradePercent) > 100
  ));
  if (invalid) return { ok: false, code: "COURSE_SECTION_INVALID", message: "区間の割合と勾配を0〜100の範囲で確認してください。" };
  const total = sections.reduce((sum, section) => sum + Number(section.sharePercent || 0), 0);
  if (Math.abs(total - 100) > 0.01) return { ok: false, code: "COURSE_SECTION_SHARE_INVALID", message: `区間割合の合計を100%にしてください。現在は${total}%です。` };
  const missingGrade = sections.some((section) => (
    ["UPHILL", "DOWNHILL"].includes(section.gradeDirection)
    && !(Number(section.gradePercent) > 0)
  ));
  if (missingGrade) return { ok: false, code: "COURSE_SECTION_GRADE_REQUIRED", message: "上り・下り区間には、正の勾配の大きさを入力してください。" };
  return { ok: true };
}

function validateCoursePresetInput(course = {}) {
  const normalized = normalizeCourseFields(course);
  if (!normalized.name) {
    return { ok: false, code: "COURSE_NAME_REQUIRED", message: "コース名を入力してください。", course: normalized };
  }
  const numericValues = COURSE_NUMERIC_FIELDS.map((field) => [field, Number(normalized[field] ?? 0)]);
  const invalidNumeric = numericValues.filter(([, value]) => !Number.isFinite(value) || value < 0 || value > 100);
  if (invalidNumeric.length) {
    return {
      ok: false,
      code: "COURSE_NUMERIC_VALUE_INVALID",
      message: "坂道と路面の値は0〜100の範囲で入力してください。",
      details: { fields: invalidNumeric.map(([field]) => field) },
      course: normalized,
    };
  }
  if (normalized.gradeInputMode === "SUMMARY") {
    const up = normalized.upPercent;
    const down = normalized.downPercent;
    if (up + down > 100.01) return { ok: false, code: "COURSE_GRADE_SHARE_INVALID", message: "上り区間と下り区間の合計は100%以下にしてください。", course: normalized };
    if (up > 0 && normalized.upGradePercent <= 0) return { ok: false, code: "COURSE_UP_GRADE_REQUIRED", message: "上り区間がある場合は、正の代表勾配を入力してください。", course: normalized };
    if (down > 0 && normalized.downGradePercent <= 0) return { ok: false, code: "COURSE_DOWN_GRADE_REQUIRED", message: "下り区間がある場合は、代表勾配の大きさを入力してください。", course: normalized };
  }
  if (normalized.gradeInputMode === "SECTIONS") {
    const sectionValidation = validateSections(normalized.sections);
    if (!sectionValidation.ok) return { ...sectionValidation, course: normalized };
  }
  const surfaceTotal = SURFACE_FIELDS.reduce((sum, { recordKey }) => sum + normalized[recordKey], 0);
  if (normalized.surfaceInputMode === "UNKNOWN" && surfaceTotal > 0.01) {
    return { ok: false, code: "COURSE_SURFACE_MODE_CONFLICT", message: "路面を入力した場合は、1種類または複数種類を選んでください。", course: normalized };
  }
  if (normalized.surfaceInputMode !== "UNKNOWN" && Math.abs(surfaceTotal - 100) > 0.01) {
    return { ok: false, code: "COURSE_SURFACE_TOTAL_INVALID", message: `路面割合の合計を100%にしてください。現在は${surfaceTotal}%です。`, course: normalized };
  }
  if (hasTreadmillOutdoorSurfaceMixFromCourse(normalized)) {
    return { ok: false, code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルは屋外路面と割合で混ぜず、トレッドミルのみのコースとして保存してください。", course: normalized };
  }
  if (!SURFACE_CLASSES.has(normalized.modelSurfaceClass)) {
    return { ok: false, code: "COURSE_SURFACE_CLASS_INVALID", message: "路面の入力内容を確認してください。", course: normalized };
  }
  return { ok: true, course: normalized };
}

function normalizePreset(item = {}) {
  const course = normalizeCourseFields(item.course || item);
  const id = normalizeSingleLineText(item.id, 120);
  if (!id || !course.name) return null;
  return Object.freeze({
    id,
    name: course.name,
    course,
    createdAt: String(item.createdAt || item.updatedAt || new Date().toISOString()),
    updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString()),
  });
}

function createId(courseName, existingIds, nowIso) {
  const slug = normalizeSingleLineText(courseName, 40)
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "") || "course";
  const stamp = nowIso.replace(/[^0-9]/g, "").slice(0, 17);
  let candidate = `course-${slug}-${stamp}`;
  let suffix = 2;
  while (existingIds.has(candidate)) candidate = `course-${slug}-${stamp}-${suffix++}`;
  return candidate;
}

function createCourseRepository(gateway) {
  const repository = createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.courses,
    normalizeItem: normalizePreset,
    sortItems: (items) => [...items].sort((left, right) => left.name.localeCompare(right.name, "ja") || left.id.localeCompare(right.id)),
  });

  function duplicateByName(name, excludingId = "") {
    const normalizedName = normalizeSingleLineText(name, 80).toLocaleLowerCase("ja");
    return repository.loadAll().find((item) => item.id !== excludingId && item.name.toLocaleLowerCase("ja") === normalizedName) || null;
  }

  function create(courseInput) {
    const validation = validateCoursePresetInput(courseInput);
    if (!validation.ok) return { ...validation, item: null };
    const duplicate = duplicateByName(validation.course.name);
    if (duplicate) return { ok: false, code: "COURSE_NAME_DUPLICATE", message: "同じ名前のコースがあります。保存済みコースを選んで更新するか、別の名前にしてください。", item: null, duplicate };
    const items = repository.loadAll();
    const nowIso = new Date().toISOString();
    const preset = normalizePreset({ id: createId(validation.course.name, new Set(items.map((item) => item.id)), nowIso), course: validation.course, createdAt: nowIso, updatedAt: nowIso });
    return repository.upsert(preset);
  }

  function update(id, courseInput) {
    const current = repository.findById(String(id || ""));
    if (!current) return { ok: false, code: "COURSE_NOT_FOUND", message: "更新するコースを選んでください。", item: null };
    const validation = validateCoursePresetInput(courseInput);
    if (!validation.ok) return { ...validation, item: null };
    const duplicate = duplicateByName(validation.course.name, current.id);
    if (duplicate) return { ok: false, code: "COURSE_NAME_DUPLICATE", message: "同じ名前の別コースがあります。別の名前にしてください。", item: null, duplicate };
    const preset = normalizePreset({ ...current, name: validation.course.name, course: validation.course, updatedAt: new Date().toISOString() });
    return repository.upsert(preset);
  }

  return Object.freeze({
    loadAll: repository.loadAll,
    loadAllResult: repository.loadAllResult,
    findById: repository.findById,
    create,
    update,
    removeById: repository.removeById,
    clear: () => gateway.remove(STORAGE_KEYS.courses),
  });
}
moduleExports["COURSE_NUMERIC_FIELDS"] = COURSE_NUMERIC_FIELDS;
moduleExports["normalizeCourseFields"] = normalizeCourseFields;
moduleExports["validateCoursePresetInput"] = validateCoursePresetInput;
moduleExports["createCourseRepository"] = createCourseRepository;
coreModules[40] = moduleExports;
}

// ===== core/storage/restoreInspection.js =====
{
const moduleExports = Object.create(null);
const { PERSONAL_PROFILE_SCHEMA_VERSION } = coreModules[36];
const { PRIMARY_REGIONAL_V2_MODEL_VERSION, validatePrimaryRegionalV2ResultRecord } = coreModules[26];
const { V27_MODEL_VERSION } = coreModules[12];
const { assertV27ResultSemantics } = coreModules[39];
const { INPUT_LIMITS } = coreModules[6];
const { validateRunningRecordInput, normalizeRunningRecord, validateRunningRecord } = coreModules[9];
const { validateCoursePresetInput } = coreModules[40];
const { STORAGE_KEYS, USER_DATA_STORAGE_KEYS } = coreModules[1];

const RESTORE_INSPECTION_VERSION = "restore-inspection-v1";
const RESTORE_STATUS = Object.freeze({
  supported: "SUPPORTED",
  review: "REVIEW_REQUIRED",
  blocked: "RESTORE_BLOCKED",
});

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function issue(severity, code, area, message, itemId = "", details = {}) {
  return Object.freeze({ severity, code, area, message, itemId: String(itemId || ""), details: Object.freeze({ ...details }) });
}


function withinCollectionLimit(value, maximum, area, label, issues) {
  if (!Array.isArray(value)) return false;
  if (value.length <= maximum) return true;
  issues.push(issue(
    "BLOCKING",
    "COLLECTION_LIMIT_EXCEEDED",
    area,
    `${label}の件数が多すぎます。`,
    "",
    { count: value.length, maximum },
  ));
  return false;
}

function addDuplicateIssues(items, getId, area, label, issues) {
  const seen = new Set();
  const duplicates = new Set();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const id = String(getId(item) || "");
    if (!id) return;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  });
  duplicates.forEach((id) => issues.push(issue(
    "BLOCKING",
    "DUPLICATE_ID",
    area,
    `${label}に同じ識別子が複数あります。`,
    id,
  )));
}

function deepFiniteNumbers(value, path = "", issues = [], area = "data", itemId = "") {
  if (typeof value === "number" && !Number.isFinite(value)) {
    issues.push(issue("BLOCKING", "NONFINITE_NUMBER", area, "有限でない数値が含まれています。", itemId, { path }));
    return issues;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => deepFiniteNumbers(item, `${path}[${index}]`, issues, area, itemId));
  } else if (isObject(value)) {
    Object.entries(value).forEach(([key, item]) => deepFiniteNumbers(item, path ? `${path}.${key}` : key, issues, area, itemId));
  }
  return issues;
}

function inspectRecords(records, issues) {
  addDuplicateIssues(records, (item) => item?.id, "records", "走行・休養記録", issues);
  (records || []).forEach((record, index) => {
    const itemId = String(record?.id || `#${index + 1}`);
    if (!isObject(record) || !record.id) {
      issues.push(issue("BLOCKING", "RECORD_OBJECT_OR_ID_REQUIRED", "records", "記録の形式または識別子を確認できません。", itemId));
      return;
    }
    const inputValidation = validateRunningRecordInput(record);
    const normalized = normalizeRunningRecord(record, {
      existingIds: [],
      nowIso: record.updatedAt || record.createdAt || "2000-01-01T00:00:00.000Z",
    });
    const validation = validateRunningRecord(normalized);
    if (!inputValidation.ok || !validation.ok) {
      issues.push(issue("BLOCKING", "RECORD_SCHEMA_INVALID", "records", "走行・休養記録の必須項目または値の範囲が現在の形式に適合しません。", itemId, {
        inputErrors: inputValidation.errors?.map((item) => item.code) || [],
        recordErrors: validation.errors?.map((item) => item.code) || [],
      }));
    }
    deepFiniteNumbers(record, "", issues, "records", itemId);
  });
}

function inspectV27Results(results, recordIds, issues) {
  addDuplicateIssues(results, (item) => item?.id, "v27Results", "走行全体の保存済み結果", issues);
  (results || []).forEach((item, index) => {
    const itemId = String(item?.id || `#${index + 1}`);
    if (!isObject(item) || !item.id || !item.record_id) {
      issues.push(issue("BLOCKING", "V27_RESULT_ID_REQUIRED", "v27Results", "走行全体の保存済み結果の識別情報が不足しています。", itemId));
      return;
    }
    if (item.model_version !== V27_MODEL_VERSION) {
      issues.push(issue("BLOCKING", "V27_VERSION_UNSUPPORTED", "v27Results", "対応していない走行全体の結果形式です。", itemId));
    }
    if (!recordIds.has(String(item.record_id))) {
      issues.push(issue("BLOCKING", "V27_RECORD_REFERENCE_MISSING", "v27Results", "結果が参照する走行・休養記録がバックアップ内にありません。", itemId));
    }
    if (item.input_snapshot?.record?.id && String(item.input_snapshot.record.id) !== String(item.record_id)) {
      issues.push(issue("BLOCKING", "V27_SNAPSHOT_REFERENCE_MISMATCH", "v27Results", "結果と元の記録の対応を確認できません。", itemId));
    }
    if (item.state === "RUN") {
      const semantic = assertV27ResultSemantics(item.result);
      if (!semantic.ok) {
        issues.push(issue("BLOCKING", "V27_SEMANTICS_INVALID", "v27Results", "走行全体の保存済み結果が現在の意味規則に適合しません。", itemId, { errors: semantic.errors }));
      }
    } else if (item.state !== "REST" || item.result !== null) {
      issues.push(issue("BLOCKING", "V27_STATE_INVALID", "v27Results", "走行全体の結果状態を確認できません。", itemId));
    }
    deepFiniteNumbers(item, "", issues, "v27Results", itemId);
  });
}

function inspectRegionalResults(results, recordIds, issues) {
  addDuplicateIssues(results, (item) => item?.id, "regionalResults", "部位別の保存済み結果", issues);
  (results || []).forEach((item, index) => {
    const itemId = String(item?.id || `#${index + 1}`);
    if (!isObject(item) || !item.id || !item.record_id) {
      issues.push(issue("BLOCKING", "REGIONAL_RESULT_ID_REQUIRED", "regionalResults", "部位別の保存済み結果の識別情報が不足しています。", itemId));
      return;
    }
    if (item.model_version !== PRIMARY_REGIONAL_V2_MODEL_VERSION) {
      issues.push(issue("BLOCKING", "REGIONAL_VERSION_UNSUPPORTED", "regionalResults", "このアプリで作成された部位別結果ではありません。", itemId));
    }
    if (!recordIds.has(String(item.record_id))) {
      issues.push(issue("BLOCKING", "REGIONAL_RECORD_REFERENCE_MISSING", "regionalResults", "部位別結果が参照する記録がバックアップ内にありません。", itemId));
    }
    if (item.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION) {
      const outputValidation = validatePrimaryRegionalV2ResultRecord(item);
      if (!outputValidation.valid) issues.push(issue("BLOCKING", "PRIMARY_REGIONAL_V2_OUTPUT_INVALID", "regionalResults", "部位別比較値の12部位・入力追跡情報を確認できません。", itemId, { issueCodes: outputValidation.issues.slice(0, 20) }));
    }
    deepFiniteNumbers(item, "", issues, "regionalResults", itemId);
  });
}

function inspectFeedback(items, recordIds, issues) {
  addDuplicateIssues(items, (item) => item?.recordId || `date:${item?.date || ""}`, "subjectiveFeedback", "本人入力", issues);
  (items || []).forEach((item, index) => {
    const itemId = String(item?.recordId || item?.date || `#${index + 1}`);
    if (!isObject(item) || (!item.recordId && !item.date)) {
      issues.push(issue("BLOCKING", "FEEDBACK_TARGET_REQUIRED", "subjectiveFeedback", "本人入力の対象記録または日付が不足しています。", itemId));
      return;
    }
    if (item.recordId && !recordIds.has(String(item.recordId))) {
      issues.push(issue("BLOCKING", "FEEDBACK_RECORD_REFERENCE_MISSING", "subjectiveFeedback", "本人入力が参照する記録がバックアップ内にありません。", itemId));
    }
    deepFiniteNumbers(item, "", issues, "subjectiveFeedback", itemId);
  });
}

function inspectPlans(plans, recordIds, issues) {
  addDuplicateIssues(plans, (item) => item?.id, "plans", "予定", issues);
  (plans || []).forEach((plan, index) => {
    const itemId = String(plan?.id || `#${index + 1}`);
    if (!isObject(plan) || !plan.id || !String(plan.scheduledDate || plan.date || "").slice(0, 10)) {
      issues.push(issue("BLOCKING", "PLAN_SCHEMA_INVALID", "plans", "予定の識別子または日付が不足しています。", itemId));
      return;
    }
    const sourceRecordId = String(plan.sourceRecordId || "");
    const actualRecordId = String(plan.actualRecordId || "");
    if (sourceRecordId && !recordIds.has(sourceRecordId)) {
      issues.push(issue("WARNING", "PLAN_SOURCE_RECORD_MISSING", "plans", "予定の元になった記録がバックアップ内にありません。予定自体は復元できます。", itemId));
    }
    if (actualRecordId && !recordIds.has(actualRecordId)) {
      issues.push(issue("WARNING", "PLAN_ACTUAL_RECORD_MISSING", "plans", "予定に結び付いた実績記録がバックアップ内にありません。予定自体は復元できます。", itemId));
    }
    deepFiniteNumbers(plan, "", issues, "plans", itemId);
  });
}

function inspectCourses(courses, issues) {
  addDuplicateIssues(courses, (item) => item?.id, "courses", "保存したコース", issues);
  (courses || []).forEach((item, index) => {
    const itemId = String(item?.id || `#${index + 1}`);
    if (!isObject(item) || !item.id) {
      issues.push(issue("BLOCKING", "COURSE_ID_REQUIRED", "courses", "保存したコースの識別子が不足しています。", itemId));
      return;
    }
    const validation = validateCoursePresetInput(item.course || item);
    if (!validation.ok) {
      issues.push(issue("BLOCKING", "COURSE_SCHEMA_INVALID", "courses", "保存したコースの値が現在の形式に適合しません。", itemId, { code: validation.code }));
    }
    deepFiniteNumbers(item, "", issues, "courses", itemId);
  });
}

function collection(snapshot, key, fallback) {
  if (!Object.prototype.hasOwnProperty.call(snapshot.data, key) || snapshot.data[key] == null) return fallback;
  return snapshot.data[key];
}

function inspectBackupSnapshot(snapshot, backupFormatVersion) {
  const issues = [];
  if (!isObject(snapshot)) {
    return Object.freeze({ ok: false, status: RESTORE_STATUS.blocked, canRestore: false, issues: Object.freeze([
      issue("BLOCKING", "BACKUP_OBJECT_REQUIRED", "backup", "バックアップの内容を確認できません。"),
    ]) });
  }
  if (snapshot.formatVersion !== backupFormatVersion) {
    issues.push(issue("BLOCKING", "BACKUP_VERSION_UNSUPPORTED", "backup", "対応していないバックアップ形式です。"));
  }
  if (!isObject(snapshot.data)) {
    issues.push(issue("BLOCKING", "BACKUP_DATA_REQUIRED", "backup", "バックアップにデータ領域がありません。"));
    return Object.freeze({ ok: false, status: RESTORE_STATUS.blocked, canRestore: false, issues: Object.freeze(issues) });
  }
  const unexpectedKeys = Object.keys(snapshot.data).filter((key) => !USER_DATA_STORAGE_KEYS.includes(key));
  if (unexpectedKeys.length) {
    issues.push(issue("BLOCKING", "BACKUP_UNKNOWN_STORAGE_KEY", "backup", "バックアップに現在のアプリで扱えない保存領域があります。"));
  }

  const records = collection(snapshot, STORAGE_KEYS.records, []);
  const v27Results = collection(snapshot, STORAGE_KEYS.modelResultsV27, []);
  const regionalResults = collection(snapshot, STORAGE_KEYS.modelResultsRegionalV2, []);
  const feedback = collection(snapshot, STORAGE_KEYS.subjectiveFeedback, []);
  const plans = collection(snapshot, STORAGE_KEYS.plans, []);
  const profile = collection(snapshot, STORAGE_KEYS.profile, null);
  const settings = collection(snapshot, STORAGE_KEYS.settings, null);
  const draft = collection(snapshot, STORAGE_KEYS.draft, null);
  const courses = collection(snapshot, STORAGE_KEYS.courses, []);
  const runMeasurements = collection(snapshot, STORAGE_KEYS.runMeasurements, []);
  const rofJData = collection(snapshot, STORAGE_KEYS.rofJ, null);
  const rofJLifecycleData = collection(snapshot, STORAGE_KEYS.rofJLifecycle, null);

  if (rofJData != null) {
    const validEnvelope = isObject(rofJData)
      && isSupportedRofJStorageSchema(rofJData.schemaVersion)
      && isObject(rofJData.entries);
    if (!validEnvelope) {
      issues.push(issue("BLOCKING", "ROF_J_STORAGE_INVALID", "rofJData", "ROF-J保存領域の形式が正しくありません。"));
    } else {
      const allowedRevisionTypes = new Set(["INITIAL_MEASUREMENT", "CORRECTION", "LATER_REFLECTION"]);
      const validRofValue = (value) => Number.isInteger(value) && value >= 0 && value <= 10;
      const validTime = (value) => typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
      Object.entries(rofJData.entries).forEach(([runId, entry]) => {
        const itemId = String(runId || "");
        if (!isObject(entry) || entry.runId !== runId) {
          issues.push(issue("BLOCKING", "ROF_J_RUN_ENTRY_INVALID", "rofJData", "ROF-J記録の走行識別子が一致しません。", itemId));
          return;
        }
        const currentSourceVersion = entry.sourceVersion === ROF_J_SOURCE_VERSION;
        const legacySourceFingerprint = typeof entry.japaneseSourceSha256 === "string"
          && /^[0-9a-f]{64}$/i.test(entry.japaneseSourceSha256);
        if (entry.instrumentId !== "ROF_J"
          || !isSupportedRofJSemanticVersion(entry.instrumentSemanticVersion)
          || (!currentSourceVersion && !legacySourceFingerprint)
          || entry.visualSourceId !== "ROF_ORIGINAL_2017") {
          issues.push(issue("BLOCKING", "ROF_J_SEMANTIC_PROVENANCE_INVALID", "rofJData", "ROF-J記録の尺度・出典情報が現在の仕様と一致しません。", itemId));
        }
        if (!isObject(entry.measurements)) {
          issues.push(issue("BLOCKING", "ROF_J_MEASUREMENTS_INVALID", "rofJData", "ROF-J測定記録の形式が正しくありません。", itemId));
          return;
        }
        ["PRE_RUN", "POST_RUN"].forEach((phase) => {
          const measurement = entry.measurements[phase];
          if (measurement == null) return;
          if (!isObject(measurement) || measurement.phase !== phase || !Array.isArray(measurement.revisions) || measurement.revisions.length === 0) {
            issues.push(issue("BLOCKING", "ROF_J_MEASUREMENT_INVALID", "rofJData", "ROF-J測定記録の形式が正しくありません。", `${itemId}:${phase}`));
            return;
          }
          const initialCount = measurement.revisions.filter((revision) => revision?.revisionType === "INITIAL_MEASUREMENT").length;
          if (initialCount !== 1) {
            issues.push(issue("BLOCKING", "ROF_J_INITIAL_REVISION_INVALID", "rofJData", "ROF-J初回測定の履歴を確認できません。", `${itemId}:${phase}`));
          }
          measurement.revisions.forEach((revision) => {
            if (!isObject(revision) || !validRofValue(revision.value) || !validTime(revision.recordedAt) || !allowedRevisionTypes.has(revision.revisionType)) {
              issues.push(issue("BLOCKING", "ROF_J_REVISION_INVALID", "rofJData", "ROF-J修正履歴の値・日時・種別を確認できません。", `${itemId}:${phase}`));
            }
          });
          if (!measurement.revisions.some((revision) => revision?.revisionId === measurement.effectiveRevisionId)) {
            issues.push(issue("BLOCKING", "ROF_J_EFFECTIVE_REVISION_INVALID", "rofJData", "ROF-Jの有効測定を特定できません。", `${itemId}:${phase}`));
          }
        });
      });
    }
  }
  if (rofJLifecycleData != null) {
    const validLifecycle = isObject(rofJLifecycleData)
      && isSupportedRofJLifecycleSchema(rofJLifecycleData.schemaVersion)
      && isObject(rofJLifecycleData.pendingByRunId);
    if (!validLifecycle) issues.push(issue("BLOCKING", "ROF_J_LIFECYCLE_STORAGE_INVALID", "rofJLifecycleData", "ROF-J入力途中領域の形式が正しくありません。"));
  }

  const expectedArrays = [
    [records, "records", "走行・休養記録"],
    [v27Results, "v27Results", "走行全体の保存済み結果"],
    [regionalResults, "regionalResults", "部位別の保存済み結果"],
    [feedback, "subjectiveFeedback", "本人入力"],
    [plans, "plans", "予定"],
    [courses, "courses", "保存したコース"],
    [runMeasurements, "runMeasurements", "GPS走行軌跡"],
  ];
  expectedArrays.forEach(([value, area, label]) => {
    if (!Array.isArray(value)) issues.push(issue("BLOCKING", "COLLECTION_SHAPE_INVALID", area, `${label}が一覧形式ではありません。`));
  });
  [[profile, "profile", "プロフィール"], [settings, "settings", "設定"], [draft, "draft", "入力途中"]].forEach(([value, area, label]) => {
    if (value != null && !isObject(value)) issues.push(issue("BLOCKING", "OBJECT_SHAPE_INVALID", area, `${label}の形式が正しくありません。`));
  });

  const recordsWithinLimit = withinCollectionLimit(records, INPUT_LIMITS.portableRecords, "records", "走行・休養記録", issues);
  const v27WithinLimit = withinCollectionLimit(v27Results, INPUT_LIMITS.portableModelResults, "v27Results", "走行全体の保存済み結果", issues);
  const regionalWithinLimit = withinCollectionLimit(regionalResults, INPUT_LIMITS.portableModelResults, "regionalResults", "部位別の保存済み結果", issues);
  const feedbackWithinLimit = withinCollectionLimit(feedback, INPUT_LIMITS.portableFeedbackEntries, "subjectiveFeedback", "本人入力", issues);
  const plansWithinLimit = withinCollectionLimit(plans, INPUT_LIMITS.portablePlans, "plans", "予定", issues);
  const coursesWithinLimit = withinCollectionLimit(courses, INPUT_LIMITS.portableCourses, "courses", "保存したコース", issues);
  const measurementsWithinLimit = withinCollectionLimit(runMeasurements, INPUT_LIMITS.portableRecords, "runMeasurements", "GPS走行軌跡", issues);

  if (recordsWithinLimit) inspectRecords(records, issues);
  const recordIds = new Set(recordsWithinLimit ? records.map((item) => String(item?.id || "")).filter(Boolean) : []);
  if (v27WithinLimit) inspectV27Results(v27Results, recordIds, issues);
  if (regionalWithinLimit) inspectRegionalResults(regionalResults, recordIds, issues);
  if (feedbackWithinLimit) inspectFeedback(feedback, recordIds, issues);
  if (plansWithinLimit) inspectPlans(plans, recordIds, issues);
  if (coursesWithinLimit) inspectCourses(courses, issues);
  if (measurementsWithinLimit) {
    runMeasurements.forEach((measurement, index) => {
      const itemId = String(measurement?.recordId || measurement?.id || index);
      const measurementRecordId = String(measurement?.recordId || "");
      if (!isObject(measurement) || !measurementRecordId) {
        issues.push(issue("BLOCKING", "RUN_MEASUREMENT_INVALID", "runMeasurements", "GPS走行軌跡の記録IDを確認できません。", itemId));
        return;
      }
      if (!recordIds.has(measurementRecordId)) {
        issues.push(issue("BLOCKING", "RUN_MEASUREMENT_RECORD_MISSING", "runMeasurements", "GPS走行軌跡に対応する走行記録がありません。", itemId));
      }
      const track = measurement.track;
      if (!Array.isArray(track) || track.length < 2 || track.length > 2000) {
        issues.push(issue("BLOCKING", "RUN_MEASUREMENT_TRACK_INVALID", "runMeasurements", "GPS走行軌跡の地点数を確認できません。", itemId));
        return;
      }
      const invalidPoint = track.some((point) => (
        !isObject(point)
        || !Number.isFinite(Number(point.lat))
        || Number(point.lat) < -90
        || Number(point.lat) > 90
        || !Number.isFinite(Number(point.lon))
        || Number(point.lon) < -180
        || Number(point.lon) > 180
        || !Number.isFinite(Number(point.timestamp))
      ));
      if (invalidPoint) {
        issues.push(issue("BLOCKING", "RUN_MEASUREMENT_POINT_INVALID", "runMeasurements", "GPS走行軌跡に読み取れない地点があります。", itemId));
      }
    });
  }

  if (profile != null) {
    const version = Number(profile.schemaVersion || 0);
    if (!Number.isFinite(version) || version !== PERSONAL_PROFILE_SCHEMA_VERSION) {
      issues.push(issue("BLOCKING", "PROFILE_VERSION_UNSUPPORTED", "profile", "このアプリで作成されたプロフィール形式ではありません。"));
    }
  }
  deepFiniteNumbers(profile, "", issues, "profile", "profile");
  deepFiniteNumbers(settings, "", issues, "settings", "settings");
  deepFiniteNumbers(draft, "", issues, "draft", "draft");

  const blockingCount = issues.filter((item) => item.severity === "BLOCKING").length;
  const warningCount = issues.filter((item) => item.severity === "WARNING").length;
  const status = blockingCount
    ? RESTORE_STATUS.blocked
    : warningCount
      ? RESTORE_STATUS.review
      : RESTORE_STATUS.supported;
  const counts = Object.freeze({
    records: Array.isArray(records) ? records.length : 0,
    subjectiveFeedback: Array.isArray(feedback) ? feedback.length : 0,
    v27Results: Array.isArray(v27Results) ? v27Results.length : 0,
    regionalResults: Array.isArray(regionalResults) ? regionalResults.length : 0,
    plans: Array.isArray(plans) ? plans.length : 0,
    courses: Array.isArray(courses) ? courses.length : 0,
    runMeasurements: Array.isArray(runMeasurements) ? runMeasurements.length : 0,
    profile: profile == null ? 0 : 1,
    settings: settings == null ? 0 : 1,
    draft: draft == null ? 0 : 1,
  });
  return Object.freeze({
    ok: blockingCount === 0,
    inspectionVersion: RESTORE_INSPECTION_VERSION,
    formatVersion: String(snapshot.formatVersion || ""),
    createdAt: String(snapshot.createdAt || ""),
    status,
    canRestore: status !== RESTORE_STATUS.blocked,
    requiresAcknowledgement: status === RESTORE_STATUS.review,
    counts,
    summary: Object.freeze({ blockingCount, warningCount }),
    issues: Object.freeze(issues),
    snapshot,
  });
}
moduleExports["RESTORE_INSPECTION_VERSION"] = RESTORE_INSPECTION_VERSION;
moduleExports["RESTORE_STATUS"] = RESTORE_STATUS;
moduleExports["inspectBackupSnapshot"] = inspectBackupSnapshot;
coreModules[41] = moduleExports;
}

// ===== core/storage/backupService.js =====
{
const moduleExports = Object.create(null);
const { INPUT_LIMITS, parseJsonText } = coreModules[6];
const { inspectBackupSnapshot, RESTORE_STATUS } = coreModules[41];
const { STORAGE_KEYS, USER_DATA_STORAGE_KEYS } = coreModules[1];

const BACKUP_FORMAT_VERSION = "runner-load-app-new-backup-v1";

function blockedInspection(code, message, details = {}) {
  return Object.freeze({
    ok: false,
    status: RESTORE_STATUS.blocked,
    canRestore: false,
    requiresAcknowledgement: false,
    counts: Object.freeze({}),
    summary: Object.freeze({ blockingCount: 1, warningCount: 0 }),
    issues: Object.freeze([Object.freeze({
      severity: "BLOCKING",
      code,
      area: "backup",
      message,
      itemId: "",
      details: Object.freeze({ ...details }),
    })]),
  });
}

function createRestoreChanges(snapshot) {
  return USER_DATA_STORAGE_KEYS.map((key) => {
    if (!Object.prototype.hasOwnProperty.call(snapshot.data, key) || snapshot.data[key] == null) {
      return { key, remove: true };
    }
    return { key, value: snapshot.data[key] };
  });
}

function createBackupService(gateway) {
  function tryCreateBackupSnapshot() {
    const data = {};
    for (const key of USER_DATA_STORAGE_KEYS) {
      const result = gateway.readJsonResult(key, null);
      if (!result.ok) {
        return {
          ok: false,
          code: result.operation === "parse" ? "BACKUP_SOURCE_DATA_CORRUPT" : "BACKUP_SOURCE_READ_FAILED",
          message: result.operation === "parse"
            ? "端末内データの一部を読み取れないため、バックアップを作成できません。"
            : "端末内データへアクセスできないため、バックアップを作成できません。",
          key,
          cause: result,
        };
      }
      data[key] = result.value;
    }
    return {
      ok: true,
      snapshot: Object.freeze({
        formatVersion: BACKUP_FORMAT_VERSION,
        createdAt: new Date().toISOString(),
        data,
      }),
    };
  }

  function createBackupSnapshot() {
    const result = tryCreateBackupSnapshot();
    if (!result.ok) {
      const error = Object.assign(new Error(result.message), result);
      throw error;
    }
    return result.snapshot;
  }

  function tryExportBackupText() {
    const result = tryCreateBackupSnapshot();
    if (!result.ok) return result;
    try {
      return { ok: true, snapshot: result.snapshot, text: JSON.stringify(result.snapshot, null, 2) };
    } catch (error) {
      return {
        ok: false,
        code: "BACKUP_SERIALIZE_FAILED",
        message: "バックアップファイルを作成できませんでした。",
        cause: error,
      };
    }
  }

  function exportBackupText() {
    const result = tryExportBackupText();
    if (!result.ok) {
      const error = Object.assign(new Error(result.message), result);
      throw error;
    }
    return result.text;
  }

  function inspectBackupText(text) {
    const parsed = parseJsonText(text);
    if (!parsed.ok) {
      return blockedInspection(
        parsed.code || "BACKUP_JSON_INVALID",
        parsed.message || "JSONファイルを読み取れませんでした。",
        parsed.details || {},
      );
    }
    return inspectBackupSnapshot(parsed.value, BACKUP_FORMAT_VERSION);
  }

  async function inspectBackupFile(file) {
    if (!file || typeof file.text !== "function") {
      return blockedInspection("BACKUP_FILE_REQUIRED", "バックアップファイルを選択してください。");
    }
    const size = Number(file.size);
    if (Number.isFinite(size) && size > INPUT_LIMITS.backupBytes) {
      return blockedInspection("JSON_TOO_LARGE", "バックアップが大きすぎます。", {
        bytes: size,
        maximumBytes: INPUT_LIMITS.backupBytes,
      });
    }
    try {
      return inspectBackupText(await file.text());
    } catch (error) {
      return blockedInspection("BACKUP_FILE_READ_FAILED", "バックアップファイルを読み取れませんでした。", {
        message: String(error?.message || error || "file_read_failed"),
      });
    }
  }

  function validateBackupSnapshot(snapshot) {
    return inspectBackupSnapshot(snapshot, BACKUP_FORMAT_VERSION);
  }

  function restoreInspectedBackup(inspection, options = {}) {
    if (!inspection || inspection.inspectionVersion !== "restore-inspection-v1" || !inspection.snapshot) {
      return { ok: false, code: "RESTORE_INSPECTION_REQUIRED", message: "復元前の検査をやり直してください。" };
    }
    const freshInspection = inspectBackupSnapshot(inspection.snapshot, BACKUP_FORMAT_VERSION);
    if (!freshInspection.canRestore) {
      return { ok: false, code: "BACKUP_RESTORE_BLOCKED", message: "復元できない問題があります。", inspection: freshInspection };
    }
    if (freshInspection.requiresAcknowledgement && options.acceptReview !== true) {
      return { ok: false, code: "BACKUP_REVIEW_ACK_REQUIRED", message: "要確認の内容を確認してください。", inspection: freshInspection };
    }

    const previousResult = tryCreateBackupSnapshot();
    if (!previousResult.ok) {
      return {
        ok: false,
        code: "PRE_RESTORE_BACKUP_FAILED",
        message: "現在の端末内データを安全に退避できないため、復元を中止しました。",
        cause: previousResult,
      };
    }
    const changes = createRestoreChanges(freshInspection.snapshot);
    changes.push({ key: STORAGE_KEYS.historyUndo, remove: true });
    changes.push({
      key: STORAGE_KEYS.backups,
      value: [{
        id: `backup-before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`,
        label: "復元前の自動バックアップ",
        createdAt: new Date().toISOString(),
        snapshot: previousResult.snapshot,
      }],
    });
    const result = gateway.transact(changes);
    return {
      ...result,
      restoredFormatVersion: freshInspection.formatVersion,
      restoreStatus: freshInspection.status,
      counts: freshInspection.counts,
    };
  }

  function restoreBackupText(text) {
    const inspection = inspectBackupText(text);
    if (!inspection.canRestore) {
      return { ok: false, code: "BACKUP_RESTORE_BLOCKED", message: inspection.issues?.[0]?.message || "復元できませんでした。", inspection };
    }
    return restoreInspectedBackup(inspection, { acceptReview: false });
  }

  return Object.freeze({
    createBackupSnapshot,
    tryCreateBackupSnapshot,
    exportBackupText,
    tryExportBackupText,
    inspectBackupText,
    inspectBackupFile,
    validateBackupSnapshot,
    restoreInspectedBackup,
    restoreBackupText,
  });
}
moduleExports["BACKUP_FORMAT_VERSION"] = BACKUP_FORMAT_VERSION;
moduleExports["createBackupService"] = createBackupService;
coreModules[42] = moduleExports;
}

// ===== core/safety/publicHelpGuidance.js =====
{
const moduleExports = Object.create(null);
const { SUPPORT_NEXT_ACTIONS, URGENT_SAFETY_FLAGS } = coreModules[29];

const PUBLIC_HELP_GUIDANCE_VERSION = "public-help-guidance-v1";
const PUBLIC_HELP_GUIDANCE_REVIEW_DATE = "2026-08-01";

const PUBLIC_FLAG_LABELS = Object.freeze({
  chestPainOrPressure: "胸の痛み・圧迫感",
  breathingDifficulty: "強い息苦しさ",
  faintingOrConfusion: "失神・意識の混乱",
  heavyBleeding: "大量の出血",
  deformityOrMajorTrauma: "変形または大きな外傷",
});

const OFFICIAL_HELP_REFERENCES = Object.freeze([
  Object.freeze({
    id: "MHLW-URGENCY-119",
    label: "厚生労働省『こんな時は迷わず119へ』",
    url: "https://kakarikata.mhlw.go.jp/kakaritsuke/urgency.html",
    purpose: "119番を検討する症状例の確認",
  }),
  Object.freeze({
    id: "FDMA-119-CALL",
    label: "総務省消防庁『119番緊急通報』",
    url: "https://www.fdma.go.jp/mission/enrichment/kyukyumusen_kinkyutuhou/119.html",
    purpose: "119番通報の方法の確認",
  }),
  Object.freeze({
    id: "FDMA-7119",
    label: "総務省消防庁『救急安心センター事業 #7119』",
    url: "https://www.fdma.go.jp/mission/enrichment/appropriate/appropriate007.html",
    purpose: "救急車を呼ぶか迷う場合の相談窓口と対応地域の確認",
  }),
  Object.freeze({
    id: "FDMA-QSUKE",
    label: "総務省消防庁『全国版救急受診アプリ Q助』",
    url: "https://www.fdma.go.jp/mission/enrichment/appropriate/appropriate003.html",
    purpose: "公式の救急受診ガイドの確認",
  }),
]);

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function buildPublicHelpGuidance(decision = {}) {
  const activeFlags = unique(Array.isArray(decision.activeSafetyFlags)
    ? decision.activeSafetyFlags.map(String)
    : []);
  const officialOverlapFlags = activeFlags.filter((flag) => URGENT_SAFETY_FLAGS.includes(flag));
  const nextActions = Array.isArray(decision.nextActions) ? decision.nextActions : [];
  const shouldPrioritize = String(decision.route || "") === "urgent"
    || nextActions.includes(SUPPORT_NEXT_ACTIONS.checkOfficialHelp);
  return Object.freeze({
    version: PUBLIC_HELP_GUIDANCE_VERSION,
    reviewedAt: PUBLIC_HELP_GUIDANCE_REVIEW_DATE,
    shouldPrioritize,
    selectedItems: Object.freeze(officialOverlapFlags.map((flag) => Object.freeze({
      id: flag,
      label: PUBLIC_FLAG_LABELS[flag] || flag,
    }))),
    references: OFFICIAL_HELP_REFERENCES,
    runtimeRequiresNetwork: false,
    externalLinksOptional: true,
    diagnosisPerformed: false,
    urgencyDeterminedByApp: false,
  });
}
moduleExports["PUBLIC_HELP_GUIDANCE_VERSION"] = PUBLIC_HELP_GUIDANCE_VERSION;
moduleExports["PUBLIC_HELP_GUIDANCE_REVIEW_DATE"] = PUBLIC_HELP_GUIDANCE_REVIEW_DATE;
moduleExports["OFFICIAL_HELP_REFERENCES"] = OFFICIAL_HELP_REFERENCES;
moduleExports["buildPublicHelpGuidance"] = buildPublicHelpGuidance;
coreModules[43] = moduleExports;
}

// ===== core/model/v27/v27Personal.js =====
{
const moduleExports = Object.create(null);
const { V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS, V27_MODEL_VERSION } = coreModules[12];
const { isFiniteNumber, median, requirePositiveFinite } = coreModules[38];

function deriveV27PersonalCadenceDelta({
  targetSessionId,
  currentSpeedMps,
  currentCadenceSpm,
  currentCadenceProvenanceReliable,
  priorRecords = [],
  speedToleranceMps = V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS,
}) {
  requirePositiveFinite(speedToleranceMps, "speedToleranceMps");
  if (
    !isFiniteNumber(currentCadenceSpm)
    || currentCadenceSpm <= 0
    || !currentCadenceProvenanceReliable
  ) {
    return Object.freeze({
      state: "NOT_APPLICABLE",
      eligible_n: 0,
      expected_cadence_spm: null,
      delta_spm: null,
    });
  }
  const eligible = priorRecords.filter((item) => (
    item.session_id !== targetSessionId
    && item.model_version === V27_MODEL_VERSION
    && item.activity_type === "CONTINUOUS_RUN"
    && item.cadence_provenance_reliable === true
    && isFiniteNumber(item.speed_mps)
    && isFiniteNumber(item.cadence_spm)
    && item.cadence_spm > 0
    && Math.abs(item.speed_mps - currentSpeedMps) <= speedToleranceMps
  ));
  if (eligible.length < 3) {
    return Object.freeze({
      state: "BUILDING_REFERENCE",
      eligible_n: eligible.length,
      expected_cadence_spm: null,
      delta_spm: null,
    });
  }
  const expected = median(eligible.map((item) => item.cadence_spm));
  return Object.freeze({
    state: "AVAILABLE",
    eligible_n: eligible.length,
    expected_cadence_spm: expected,
    delta_spm: currentCadenceSpm - expected,
    speed_tolerance_mps: speedToleranceMps,
  });
}

function deriveV27PersonalCadenceSensitivity(input) {
  const tolerances = [0.05, 0.1, 0.15];
  const byTolerance = Object.fromEntries(tolerances.map((tolerance) => [
    String(tolerance),
    deriveV27PersonalCadenceDelta({ ...input, speedToleranceMps: tolerance }),
  ]));
  const central = byTolerance["0.1"];
  const allAvailable = Object.values(byTolerance).every((item) => item.state === "AVAILABLE");
  const robustnessState = allAvailable
    ? "ROBUST_ACROSS_DECLARED_TOLERANCES"
    : central.state === "AVAILABLE"
      ? "TOLERANCE_DEPENDENT"
      : "UNAVAILABLE_AT_CENTRAL_TOLERANCE";
  return Object.freeze({
    central,
    by_tolerance_mps: Object.freeze(byTolerance),
    robustness_state: robustnessState,
  });
}

function calculateV27PersonalRelative({
  targetSessionId,
  currentRegionResult,
  priorResults = [],
}) {
  const eligible = priorResults.filter((item) => (
    item.session_id !== targetSessionId
    && item.model_version === V27_MODEL_VERSION
    && item.coverage_signature === currentRegionResult.coverage_signature
    && isFiniteNumber(item.raw_exposure)
    && item.raw_exposure > 0
  ));
  if (eligible.length < 3) {
    return Object.freeze({
      state: "BUILDING_REFERENCE",
      eligible_n: eligible.length,
      value: null,
    });
  }
  const referenceMedian = median(eligible.map((item) => item.raw_exposure));
  const sortedDates = eligible
    .map((item) => item.date)
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")))
    .sort();
  return Object.freeze({
    state: eligible.length < 6 ? "PROVISIONAL" : "AVAILABLE",
    eligible_n: eligible.length,
    reference_median: referenceMedian,
    value: 100 * currentRegionResult.raw_exposure / referenceMedian,
    reference_revision_ids: Object.freeze(eligible.map((item) => item.result_id || item.session_id)),
    first_date: sortedDates[0] || null,
    last_date: sortedDates.at(-1) || null,
    target_excluded: eligible.every((item) => item.session_id !== targetSessionId),
  });
}
moduleExports["deriveV27PersonalCadenceDelta"] = deriveV27PersonalCadenceDelta;
moduleExports["deriveV27PersonalCadenceSensitivity"] = deriveV27PersonalCadenceSensitivity;
moduleExports["calculateV27PersonalRelative"] = calculateV27PersonalRelative;
coreModules[44] = moduleExports;
}

// ===== core/model/v27/v27InputAdapter.js =====
{
const moduleExports = Object.create(null);
const { V27_ACTIVITY_TYPES, V27_MODEL_VERSION, V27_SURFACE_FACTORS } = coreModules[12];
const { deriveV27PersonalCadenceSensitivity } = coreModules[44];
const { reportedRpeValue } = coreModules[8];

const GRADE_KNOWLEDGE = new Set(["UNKNOWN", "KNOWN_FLAT", "KNOWN_PROFILE"]);
const ACTIVITY_FORMATS = new Set(Object.values(V27_ACTIVITY_TYPES));
const RELIABLE_CADENCE_SOURCES = new Set(["DEVICE_MEASURED", "DEVICE_SYNCED"]);

function optionalFiniteNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function explicitActivityFormat(record) {
  const value = String(record.runningFormat || "UNKNOWN").toUpperCase();
  return ACTIVITY_FORMATS.has(value) ? value : "UNKNOWN";
}

function createGradeProfile(course, errors, warnings) {
  let knowledge = String(course.gradeKnowledge || "UNKNOWN").toUpperCase();
  if (!GRADE_KNOWLEDGE.has(knowledge)) {
    errors.push({ field: "gradeKnowledge", code: "INVALID_GRADE_KNOWLEDGE" });
    knowledge = "UNKNOWN";
  }
  if (knowledge === "UNKNOWN") {
    const hasUnappliedGradeValues = [
      course.upPercent,
      course.downPercent,
      course.upGradePercent,
      course.downGradePercent,
    ].some((value) => Number(value || 0) !== 0);
    if (hasUnappliedGradeValues) {
      warnings.push({
        field: "course",
        code: "GRADE_VALUES_NOT_APPLIED_WITHOUT_KNOWLEDGE_STATE",
      });
    }
    return [{ share_pct: 100, grade_pct: null }];
  }
  if (knowledge === "KNOWN_FLAT") {
    return [{ share_pct: 100, grade_pct: 0 }];
  }

  const upShare = optionalFiniteNumber(course.upPercent);
  const downShare = optionalFiniteNumber(course.downPercent);
  const upGrade = optionalFiniteNumber(course.upGradePercent);
  const downGrade = optionalFiniteNumber(course.downGradePercent);
  const values = [
    ["upPercent", upShare],
    ["downPercent", downShare],
    ["upGradePercent", upGrade],
    ["downGradePercent", downGrade],
  ];
  values.forEach(([field, value]) => {
    if (!Number.isFinite(value) || value < 0) {
      errors.push({ field, code: "INVALID_GRADE_PROFILE_VALUE" });
    }
  });
  if (errors.length) return [{ share_pct: 100, grade_pct: null }];
  if (upShare > 100 || downShare > 100 || upShare + downShare > 100) {
    errors.push({ field: "course", code: "GRADE_SHARE_SUM_EXCEEDS_100" });
    return [{ share_pct: 100, grade_pct: null }];
  }
  if (upShare > 0 && upGrade <= 0) {
    errors.push({ field: "upGradePercent", code: "UPHILL_REQUIRES_POSITIVE_GRADE" });
  }
  if (downShare > 0 && downGrade <= 0) {
    errors.push({ field: "downGradePercent", code: "DOWNHILL_REQUIRES_POSITIVE_MAGNITUDE" });
  }
  if (errors.length) return [{ share_pct: 100, grade_pct: null }];
  const flatShare = 100 - upShare - downShare;
  return [
    ...(flatShare > 0 ? [{ share_pct: flatShare, grade_pct: 0 }] : []),
    ...(upShare > 0 ? [{ share_pct: upShare, grade_pct: upGrade }] : []),
    ...(downShare > 0 ? [{ share_pct: downShare, grade_pct: -downGrade }] : []),
  ];
}

function createSurfaceProfile(course, errors) {
  if (Array.isArray(course.modelSurfaceProfile) && course.modelSurfaceProfile.length) {
    const profile = course.modelSurfaceProfile.map((item, index) => {
      const share = optionalFiniteNumber(item.sharePercent);
      const surfaceClass = String(item.surfaceClass || "UNKNOWN");
      if (!Number.isFinite(share) || share < 0 || share > 100) {
        errors.push({ field: `modelSurfaceProfile.${index}`, code: "INVALID_SURFACE_SHARE" });
      }
      if (!V27_SURFACE_FACTORS[surfaceClass]) {
        errors.push({ field: `modelSurfaceProfile.${index}`, code: "INVALID_SURFACE_CLASS" });
      }
      return { share_pct: share, surface_class: surfaceClass };
    });
    if (
      profile.every((item) => Number.isFinite(item.share_pct))
      && Math.abs(profile.reduce((sum, item) => sum + item.share_pct, 0) - 100) > 0.01
    ) {
      errors.push({ field: "modelSurfaceProfile", code: "SURFACE_SHARE_SUM_NOT_100" });
    }
    return profile;
  }
  const surfaceClass = String(course.modelSurfaceClass || "UNKNOWN");
  if (!V27_SURFACE_FACTORS[surfaceClass]) {
    errors.push({ field: "modelSurfaceClass", code: "INVALID_SURFACE_CLASS" });
    return [{ share_pct: 100, surface_class: "UNKNOWN" }];
  }
  return [{ share_pct: 100, surface_class: surfaceClass }];
}

function createOrderedSections(course, errors) {
  if (!Array.isArray(course.sections) || !course.sections.length) return null;
  const sections = course.sections.map((item, index) => {
    const distance = optionalFiniteNumber(item.distanceKm);
    const grade = optionalFiniteNumber(item.gradePercent);
    const surfaceClass = String(item.surfaceClass || "UNKNOWN");
    if (!Number.isFinite(distance) || distance <= 0) {
      errors.push({ field: `sections.${index}.distanceKm`, code: "INVALID_SECTION_DISTANCE" });
    }
    if (grade !== null && !Number.isFinite(grade)) {
      errors.push({ field: `sections.${index}.gradePercent`, code: "INVALID_SECTION_GRADE" });
    }
    if (!V27_SURFACE_FACTORS[surfaceClass]) {
      errors.push({ field: `sections.${index}.surfaceClass`, code: "INVALID_SURFACE_CLASS" });
    }
    return {
      distance_km: distance,
      grade_pct: grade,
      surface_class: surfaceClass,
    };
  });
  return sections;
}

function readCadence(record, durationMinutes) {
  const source = String(record.cadenceProvenance || record.stepsProvenance || "UNKNOWN").toUpperCase();
  const directCadence = optionalFiniteNumber(record.cadenceSpm);
  const steps = optionalFiniteNumber(record.steps);
  const cadence = Number.isFinite(directCadence) && directCadence > 0
    ? directCadence
    : Number.isFinite(steps) && steps > 0 && durationMinutes > 0
      ? steps / durationMinutes
      : null;
  return Object.freeze({
    cadence_spm: cadence,
    source,
    reliable: cadence != null && RELIABLE_CADENCE_SOURCES.has(source),
    derivation: Number.isFinite(directCadence) && directCadence > 0
      ? "MEASURED_CADENCE"
      : cadence != null
        ? "RELIABLE_STEPS_DIVIDED_BY_ACTIVE_MINUTES"
        : "UNAVAILABLE",
  });
}

function adaptRecordToV27Session(record, { priorCadenceFacts = [] } = {}) {
  const errors = [];
  const warnings = [];
  if (String(record.activityType || "").toLowerCase() === "rest") {
    return Object.freeze({
      ok: true,
      state: "REST",
      errors: Object.freeze([]),
      warnings: Object.freeze([]),
      session: null,
      provenance: Object.freeze({ model_version: V27_MODEL_VERSION }),
    });
  }
  const distance = optionalFiniteNumber(record.distanceKm);
  const duration = optionalFiniteNumber(record.durationMinutes);
  if (!Number.isFinite(distance) || distance <= 0) {
    errors.push({ field: "distanceKm", code: "DISTANCE_REQUIRED_POSITIVE" });
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    errors.push({ field: "durationMinutes", code: "ACTIVE_DURATION_REQUIRED_POSITIVE" });
  }
  const course = record.course && typeof record.course === "object" ? record.course : {};
  const sections = createOrderedSections(course, errors);
  if (
    sections
    && sections.every((section) => Number.isFinite(section.distance_km))
    && Number.isFinite(distance)
    && Math.abs(sections.reduce((sum, section) => sum + section.distance_km, 0) - distance) > 0.01
  ) {
    errors.push({ field: "sections", code: "SECTION_DISTANCE_SUM_MISMATCH" });
  }
  const gradeProfile = sections ? null : createGradeProfile(course, errors, warnings);
  const surfaceProfile = sections ? null : createSurfaceProfile(course, errors);
  const activityType = explicitActivityFormat(record);
  const rpe = reportedRpeValue(record);
  if (rpe != null && (!Number.isFinite(rpe) || rpe < 0 || rpe > 10)) {
    errors.push({ field: "perceivedExertion", code: "INVALID_RPE" });
  }
  if (errors.length) {
    return Object.freeze({
      ok: false,
      state: "INVALID",
      errors: Object.freeze(errors),
      warnings: Object.freeze(warnings),
      session: null,
      provenance: null,
    });
  }

  const speedMps = distance * 1000 / (duration * 60);
  const cadence = readCadence(record, duration);
  const cadenceSensitivity = deriveV27PersonalCadenceSensitivity({
    targetSessionId: record.id,
    currentSpeedMps: speedMps,
    currentCadenceSpm: cadence.cadence_spm,
    currentCadenceProvenanceReliable: cadence.reliable,
    priorRecords: priorCadenceFacts,
  });
  const session = Object.freeze({
    session_id: String(record.id || ""),
    distance_km: distance,
    active_minutes: duration,
    ...(sections ? { sections: Object.freeze(sections) } : {
      grade_profile: Object.freeze(gradeProfile),
      surface_profile: Object.freeze(surfaceProfile),
    }),
    activity_type: activityType,
    rpe,
    cadence_delta_spm: cadenceSensitivity.central.delta_spm,
    cadence_provenance_reliable: cadence.reliable,
    cadence_reference_n: cadenceSensitivity.central.eligible_n,
    cadence_robustness_state: cadenceSensitivity.robustness_state,
  });
  return Object.freeze({
    ok: true,
    state: "RUN",
    errors: Object.freeze([]),
    warnings: Object.freeze(warnings),
    session,
    provenance: Object.freeze({
      model_version: V27_MODEL_VERSION,
      distance_source: "USER_RECORDED",
      active_duration_source: "USER_RECORDED",
      speed_source: "DERIVED_DISTANCE_ACTIVE_DURATION",
      speed_mps: speedMps,
      activity_type_source: activityType === "UNKNOWN" ? "UNKNOWN" : "USER_SELECTED",
      cadence_source: cadence.source,
      cadence_derivation: cadence.derivation,
      cadence_spm: cadence.cadence_spm,
      cadence_sensitivity: cadenceSensitivity,
      grade_representation: sections ? "PAIRED_ORDERED_SECTIONS" : "MARGINAL_PROFILE",
      surface_representation: sections ? "PAIRED_ORDERED_SECTIONS" : "MARGINAL_PROFILE",
      unknown_not_replaced: true,
      no_silent_normalization: true,
    }),
  });
}
moduleExports["adaptRecordToV27Session"] = adaptRecordToV27Session;
coreModules[45] = moduleExports;
}

// ===== core/model/v27/v27ResultService.js =====
{
const moduleExports = Object.create(null);
const { V27_EMPHASIS_REGION_IDS, V27_MODEL_VERSION, V27_REGIONAL_VIEW_IDS } = coreModules[12];
const { adaptRecordToV27Session } = coreModules[45];
const { assertV27ResultSemantics, calculateV27Session } = coreModules[39];
const { calculateV27PersonalRelative } = coreModules[44];

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function recordOrder(record) {
  return `${String(record.date || "")}\u0000${String(record.id || "")}`;
}

function resultId(record) {
  return [
    "v27-result",
    String(record.id || "").replace(/[^a-zA-Z0-9._-]/g, "_"),
    String(record.updatedAt || record.createdAt || "").replace(/[^0-9A-Za-z]/g, ""),
  ].join("-");
}

function latestPriorSnapshots(targetRecord, allRecords, existingResultRecords) {
  const recordById = new Map(allRecords.map((record) => [record.id, record]));
  const targetOrder = recordOrder(targetRecord);
  const latest = new Map();
  existingResultRecords.forEach((resultRecord) => {
    const sourceRecord = recordById.get(resultRecord.record_id)
      || resultRecord.input_snapshot?.record;
    if (!sourceRecord || recordOrder(sourceRecord) >= targetOrder) return;
    const current = latest.get(resultRecord.record_id);
    if (
      !current
      || resultRecord.source_record_revision > current.source_record_revision
      || (
        resultRecord.source_record_revision === current.source_record_revision
        && resultRecord.id > current.id
      )
    ) {
      latest.set(resultRecord.record_id, resultRecord);
    }
  });
  return [...latest.values()];
}

function cadenceFacts(priorSnapshots) {
  return priorSnapshots
    .filter((snapshot) => snapshot.state === "RUN" && snapshot.derived_facts)
    .map((snapshot) => ({
      session_id: snapshot.record_id,
      model_version: snapshot.model_version,
      activity_type: snapshot.derived_facts.activity_type,
      cadence_provenance_reliable: snapshot.derived_facts.cadence_provenance_reliable,
      speed_mps: snapshot.derived_facts.speed_mps,
      cadence_spm: snapshot.derived_facts.cadence_spm,
    }));
}

function priorRegionalFacts(priorSnapshots, regionId) {
  return priorSnapshots.flatMap((snapshot) => {
    const row = snapshot.result?.regional?.[regionId];
    if (!row) return [];
    return [{
      session_id: snapshot.record_id,
      result_id: snapshot.id,
      model_version: snapshot.model_version,
      coverage_signature: row.coverage_signature,
      raw_exposure: row.raw_exposure,
      date: snapshot.input_snapshot?.record?.date || "",
    }];
  });
}

function personalReferenceSnapshots(record, result, priorSnapshots, generatedAt) {
  return Object.freeze(Object.fromEntries(V27_EMPHASIS_REGION_IDS.map((regionId) => {
    const personal = calculateV27PersonalRelative({
      targetSessionId: record.id,
      currentRegionResult: result.regional[regionId],
      priorResults: priorRegionalFacts(priorSnapshots, regionId),
    });
    return [regionId, Object.freeze({
      ...personal,
      personal_reference_snapshot_id: `${resultId(record)}-personal-${regionId}`,
      region_id: regionId,
      coverage_signature: result.regional[regionId].coverage_signature,
      generated_at_cutoff: generatedAt,
      target_session_id: record.id,
      target_excluded: true,
    })];
  })));
}

function createV27ResultRecord({
  record,
  allRecords = [],
  existingResultRecords = [],
}) {
  const generatedAt = String(record.updatedAt || record.createdAt || new Date().toISOString());
  const priorSnapshots = latestPriorSnapshots(record, allRecords, existingResultRecords);
  const adaptation = adaptRecordToV27Session(record, {
    priorCadenceFacts: cadenceFacts(priorSnapshots),
  });
  if (!adaptation.ok) {
    return Object.freeze({
      ok: false,
      code: "V27_INPUT_ADAPTATION_FAILED",
      validation: adaptation,
      resultRecord: null,
    });
  }
  if (adaptation.state === "REST") {
    return Object.freeze({
      ok: true,
      resultRecord: Object.freeze({
        id: resultId(record),
        record_id: record.id,
        source_record_revision: generatedAt,
        generated_at: generatedAt,
        model_version: V27_MODEL_VERSION,
        state: "REST",
        input_snapshot: Object.freeze({ record: cloneValue(record) }),
        result: null,
        personal_reference_snapshots: Object.freeze({}),
        view_contract: Object.freeze({
          default: V27_REGIONAL_VIEW_IDS.withinRun,
          switchable: Object.freeze(Object.values(V27_REGIONAL_VIEW_IDS)),
        }),
      }),
    });
  }

  let result;
  try {
    result = calculateV27Session(adaptation.session);
  } catch (error) {
    return Object.freeze({
      ok: false,
      code: "V27_CALCULATION_FAILED",
      message: String(error?.message || error),
      validation: adaptation,
      resultRecord: null,
    });
  }
  const semanticValidation = assertV27ResultSemantics(result);
  if (!semanticValidation.ok) {
    return Object.freeze({
      ok: false,
      code: "V27_SEMANTIC_VALIDATION_FAILED",
      validation: semanticValidation,
      resultRecord: null,
    });
  }
  const personalSnapshots = personalReferenceSnapshots(
    record,
    result,
    priorSnapshots,
    generatedAt,
  );
  return Object.freeze({
    ok: true,
    resultRecord: Object.freeze({
      id: resultId(record),
      record_id: record.id,
      source_record_revision: generatedAt,
      generated_at: generatedAt,
      model_version: V27_MODEL_VERSION,
      state: "RUN",
      input_snapshot: Object.freeze({
        record: cloneValue(record),
        session: cloneValue(adaptation.session),
        provenance: cloneValue(adaptation.provenance),
        warnings: cloneValue(adaptation.warnings),
      }),
      derived_facts: Object.freeze({
        speed_mps: adaptation.provenance.speed_mps,
        cadence_spm: adaptation.provenance.cadence_spm,
        cadence_provenance_reliable: adaptation.session.cadence_provenance_reliable,
        activity_type: adaptation.session.activity_type,
      }),
      result,
      personal_reference_snapshots: personalSnapshots,
      view_contract: Object.freeze({
        default: V27_REGIONAL_VIEW_IDS.withinRun,
        switchable: Object.freeze(Object.values(V27_REGIONAL_VIEW_IDS)),
      }),
      claims: Object.freeze({
        is_measured_physical_load: false,
        supports_absolute_regional_load_comparison: false,
        is_compositional_share: false,
        supports_medical_decision: false,
      }),
    }),
  });
}

function upsertV27ResultRecord(items, resultRecord) {
  const nextItems = [...items];
  const index = nextItems.findIndex((item) => item.id === resultRecord.id);
  if (index >= 0) nextItems[index] = resultRecord;
  else nextItems.push(resultRecord);
  return nextItems.sort((left, right) => (
    left.record_id.localeCompare(right.record_id)
    || left.source_record_revision.localeCompare(right.source_record_revision)
    || left.id.localeCompare(right.id)
  ));
}
moduleExports["createV27ResultRecord"] = createV27ResultRecord;
moduleExports["upsertV27ResultRecord"] = upsertV27ResultRecord;
coreModules[46] = moduleExports;
}

// ===== core/workflows/recordWorkflow.js =====
{
const moduleExports = Object.create(null);
const { createBodyProfileSnapshot, normalizeBodyProfile } = coreModules[36];
const { createV27ResultRecord, upsertV27ResultRecord } = coreModules[46];
const { isPrimaryRegionalV2Record, stampCurrentRegionalModel } = coreModules[4];
const { normalizeRunningRecord, validateRunningRecord, validateRunningRecordInput } = coreModules[9];
const { normalizeSubjectiveFeedback } = coreModules[30];
const { evaluateSupportDecision } = coreModules[29];
const { STORAGE_KEYS } = coreModules[1];
const { createPrimaryRegionalV2ResultRecord, upsertPrimaryRegionalV2ResultRecord, validatePrimaryRegionalV2ResultRecord, PRIMARY_REGIONAL_V2_MODEL_VERSION, LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION } = coreModules[26];

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function sortRecords(records = []) {
  return [...records].sort((left, right) => (
    left.date.localeCompare(right.date) || left.id.localeCompare(right.id)
  ));
}

function sortFeedback(items = []) {
  return [...items].sort((left, right) => (
    left.date.localeCompare(right.date) || left.recordId.localeCompare(right.recordId)
  ));
}

function upsertById(items, item, getId) {
  const id = getId(item);
  const nextItems = [...items];
  const index = nextItems.findIndex((entry) => getId(entry) === id);
  if (index >= 0) nextItems[index] = item;
  else nextItems.push(item);
  return nextItems;
}

function regionalResultCreatorForRecord() { return createPrimaryRegionalV2ResultRecord; }

function regionalModelVersionForRecord(record = {}) {
  const stamped = String(record?.regionalModelSnapshot?.modelVersion || "");
  return stamped === LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION ? LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION : PRIMARY_REGIONAL_V2_MODEL_VERSION;
}

function storedRegionalResultForRecord(repository, record = {}) {
  const expectedVersion = regionalModelVersionForRecord(record);
  const rows = repository?.loadForRecord?.(record.id) || [];
  return [...rows]
    .filter((item) => item?.model_version === expectedVersion)
    .sort((left, right) => (
      String(right.source_record_revision || "").localeCompare(String(left.source_record_revision || ""))
      || String(right.generated_at || "").localeCompare(String(left.generated_at || ""))
      || String(right.id || "").localeCompare(String(left.id || ""))
    ))[0] || null;
}

function createModelExperience(
  records,
  subjectiveFeedback,
  targetRecordId,
  modelResultV27Repository,
  modelResultRegionalV2Repository,
) {
  const sortedRecords = sortRecords(records);
  const index = sortedRecords.findIndex((record) => record.id === targetRecordId);
  if (index < 0) return null;
  const record = sortedRecords[index];
  const v27ByRecord = modelResultV27Repository?.latestByRecord?.() || new Map();
  const v27ResultRecord = v27ByRecord.get(targetRecordId) || null;
  const storedRegionalV2ResultRecord = storedRegionalResultForRecord(modelResultRegionalV2Repository, record);
  const feedback = subjectiveFeedback.find((item) => item.recordId === targetRecordId) || null;
  let regionalV2ResultRecord = storedRegionalV2ResultRecord;
  let regionalV2Recovery = null;
  if (storedRegionalV2ResultRecord && storedRegionalV2ResultRecord.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION) {
    const primaryValidation = validatePrimaryRegionalV2ResultRecord(storedRegionalV2ResultRecord);
    const bodyMapRegions = storedRegionalV2ResultRecord.body_map_payload?.regions;
    const bodyMapValid = storedRegionalV2ResultRecord.state === "REST" || (Array.isArray(bodyMapRegions) && bodyMapRegions.length === 12);
    if (!primaryValidation.valid || !bodyMapValid) {
      const sessionSequence = sortedRecords
        .filter((item) => item.date === record.date)
        .findIndex((item) => item.id === record.id) + 1;
      const recovered = createPrimaryRegionalV2ResultRecord({
        record,
        feedback: feedback || {},
        sessionSequence: Math.max(1, sessionSequence),
        allRecords: sortedRecords,
      });
      if (recovered.ok) {
        regionalV2ResultRecord = Object.freeze({
          ...recovered.resultRecord,
          recovery_status: "TRANSIENT_RECONSTRUCTED",
          recovery_source_result_id: storedRegionalV2ResultRecord.id,
        });
        regionalV2Recovery = Object.freeze({
          status: "RECOVERED",
          sourceResultId: storedRegionalV2ResultRecord.id,
          issueCodes: Object.freeze([
            ...primaryValidation.issues,
            ...(bodyMapValid ? [] : ["BODY_MAP_INVALID"]),
          ]),
        });
      } else {
        regionalV2Recovery = Object.freeze({
          status: "FAILED",
          sourceResultId: storedRegionalV2ResultRecord.id,
          issueCodes: Object.freeze([
            ...primaryValidation.issues,
            ...(bodyMapValid ? [] : ["BODY_MAP_INVALID"]),
            recovered.code || "RECONSTRUCTION_FAILED",
          ]),
        });
      }
    }
  }
  const supportDecision = feedback?.supportDecisionSnapshot
    || evaluateSupportDecision({ feedback: feedback || {}, planOutcome: record.planOutcome || {} });
  return Object.freeze({
    record: cloneValue(record),
    feedback: cloneValue(feedback),
    v27ResultRecord: cloneValue(v27ResultRecord),
    v27Result: cloneValue(v27ResultRecord?.result || null),
    regionalV2ResultRecord: cloneValue(regionalV2ResultRecord),
    regionalV2Result: cloneValue(regionalV2ResultRecord?.result || null),
    bodyMapV2: cloneValue(regionalV2ResultRecord?.body_map_payload || null),
    regionalV2Recovery: cloneValue(regionalV2Recovery),
    regionalSemanticState: regionalV2ResultRecord?.model_version === LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION ? "LEGACY_V2_RESTORED_NOT_REINTERPRETED" : regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION ? "REFERENCE100_V3" : "NONE",
    personalReferenceSnapshots: cloneValue(v27ResultRecord?.personal_reference_snapshots || {}),
    supportDecision: cloneValue(supportDecision),
  });
}

function createRecordWorkflow({
  gateway,
  recordsRepository,
  subjectiveFeedbackRepository,
  profileRepository,
  modelResultV27Repository,
  modelResultRegionalV2Repository,
}) {
  function loadCollectionForMutation(repository, sourceName) {
    const result = repository?.loadAllResult?.();
    if (result?.ok) return result;
    if (result && !result.ok) {
      return {
        ...result,
        code: "STORAGE_SOURCE_READ_FAILED",
        details: { ...(result.details || {}), sourceName, sourceCode: result.code || "" },
      };
    }
    return {
      ok: false,
      code: "STORAGE_SOURCE_READ_FAILED",
      operation: "read",
      message: `Unable to read ${sourceName}.`,
      details: { sourceName, sourceCode: "LOAD_RESULT_UNAVAILABLE" },
      items: [],
    };
  }

  function saveRecordAndFeedback(recordInput = {}, feedbackInput = {}, profileInput = undefined) {
    const inputValidation = validateRunningRecordInput(recordInput);
    if (!inputValidation.ok) {
      return {
        ok: false,
        code: "RUNNING_RECORD_INPUT_VALIDATION_FAILED",
        validation: inputValidation,
      };
    }

    const recordsRead = loadCollectionForMutation(recordsRepository, "records");
    if (!recordsRead.ok) return recordsRead;
    const feedbackRead = loadCollectionForMutation(subjectiveFeedbackRepository, "subjectiveFeedback");
    if (!feedbackRead.ok) return feedbackRead;
    const v27Read = loadCollectionForMutation(modelResultV27Repository, "modelResultsV27");
    if (!v27Read.ok) return v27Read;
    const regionalRead = loadCollectionForMutation(modelResultRegionalV2Repository, "modelResultsRegionalV2");
    if (!regionalRead.ok) return regionalRead;


    const currentRecords = recordsRead.items;
    const currentFeedback = feedbackRead.items;
    const existingRecord = recordInput.id
      ? currentRecords.find((record) => record.id === recordInput.id)
      : null;
    const nowIso = new Date().toISOString();
    const explicitProfile = profileInput && typeof profileInput === "object";
    const profileRead = explicitProfile
      ? { ok: true, value: normalizeBodyProfile(profileInput) }
      : profileRepository?.loadResult?.();
    if (!profileRead?.ok) {
      return {
        ...(profileRead || {}),
        ok: false,
        code: "STORAGE_SOURCE_READ_FAILED",
        operation: profileRead?.operation || "read",
        message: profileRead?.message || "Unable to read profile.",
        details: { ...(profileRead?.details || {}), sourceName: "profile", sourceCode: profileRead?.code || "LOAD_RESULT_UNAVAILABLE" },
      };
    }
    const normalizedProfile = normalizeBodyProfile(profileRead.value || {});
    const bodyProfileSnapshot = normalizedProfile
      ? createBodyProfileSnapshot(normalizedProfile, nowIso)
      : existingRecord?.bodyProfileSnapshot || null;
    const versionedRecordInput = stampCurrentRegionalModel({
      ...recordInput,
      regionalModelSnapshot: existingRecord?.regionalModelSnapshot || recordInput.regionalModelSnapshot,
      bodyProfileSnapshot,
      createdAt: existingRecord?.createdAt || recordInput.createdAt,
    });
    const normalizedRecordBase = normalizeRunningRecord(versionedRecordInput, {
      existingIds: currentRecords
        .filter((record) => record.id !== recordInput.id)
        .map((record) => record.id),
      nowIso,
      assumeExplicitRpe: true,
    });
    const normalizedRecord = stampCurrentRegionalModel(normalizedRecordBase);
    const recordValidation = validateRunningRecord(normalizedRecord);
    if (!recordValidation.ok) {
      return {
        ok: false,
        code: "RUNNING_RECORD_VALIDATION_FAILED",
        validation: recordValidation,
      };
    }

    const normalizedFeedback = normalizeSubjectiveFeedback({
      ...feedbackInput,
      recordId: normalizedRecord.id,
      date: normalizedRecord.date,
      checkedAt: feedbackInput.checkedAt || nowIso,
    }, {
      planOutcome: normalizedRecord.planOutcome || {},
    });

    const nextRecords = sortRecords(upsertById(
      currentRecords,
      normalizedRecord,
      (record) => record.id,
    ));
    const nextFeedback = sortFeedback(upsertById(
      currentFeedback,
      normalizedFeedback,
      (item) => item.recordId,
    ));
    const currentV27Results = v27Read.items;
    const currentRegionalV2Results = regionalRead.items;
    // Secondary V2.7 is legacy-only for new/current records. Existing stored V2.7 results remain untouched for restore/history compatibility.
    const calculation = Object.freeze({ ok: true, resultRecord: null, state: "LEGACY_V27_NEW_GENERATION_RETIRED" });
    const nextV27Results = currentV27Results;
    const regionalCalculation = regionalResultCreatorForRecord(normalizedRecord)({
      record: normalizedRecord,
      feedback: normalizedFeedback,
      sessionSequence: nextRecords.filter((item) => item.date === normalizedRecord.date).findIndex((item) => item.id === normalizedRecord.id) + 1,
      allRecords: nextRecords,
    });
    if (!regionalCalculation.ok) {
      return { ok: false, code: regionalCalculation.code || "REGIONAL_V1_RESULT_CREATION_FAILED", validation: regionalCalculation.validation || null, message: regionalCalculation.error?.messageKey || "" };
    }
    const nextRegionalV2Results = upsertPrimaryRegionalV2ResultRecord(currentRegionalV2Results, regionalCalculation.resultRecord);

    const changes = [
      { key: STORAGE_KEYS.records, value: nextRecords },
      { key: STORAGE_KEYS.subjectiveFeedback, value: nextFeedback },
      { key: STORAGE_KEYS.modelResultsV27, value: nextV27Results },
      { key: STORAGE_KEYS.modelResultsRegionalV2, value: nextRegionalV2Results },
    ];
    if (explicitProfile) {
      changes.push({ key: STORAGE_KEYS.profile, value: normalizedProfile });
    }
    const saveResult = gateway.transact(changes);
    if (!saveResult.ok) {
      return {
        ...saveResult,
        code: "RECORD_EXPERIENCE_SAVE_FAILED",
      };
    }

    return {
      ok: true,
      record: cloneValue(normalizedRecord),
      feedback: cloneValue(normalizedFeedback),
      resultRecord: null,
      primaryRegionalV2ResultRecord: cloneValue(regionalCalculation.resultRecord),
      experience: createModelExperience(
        nextRecords,
        nextFeedback,
        normalizedRecord.id,
        modelResultV27Repository,
        modelResultRegionalV2Repository,
      ),
    };
  }

  function loadExperience(recordId) {
    if (!recordId) return null;
    return createModelExperience(
      recordsRepository.loadAll(),
      subjectiveFeedbackRepository.loadAll(),
      recordId,
      modelResultV27Repository,
      modelResultRegionalV2Repository,
    );
  }

  function loadLatestExperience() {
    const records = recordsRepository.loadAll();
    const latestRecord = [...records].sort((left, right) => (
      right.date.localeCompare(left.date) || right.id.localeCompare(left.id)
    ))[0];
    return latestRecord ? loadExperience(latestRecord.id) : null;
  }

  function loadAllExperiences() {
    const records = recordsRepository.loadAll();
    const feedback = subjectiveFeedbackRepository.loadAll();
    return records.map((record) => createModelExperience(
      records,
      feedback,
      record.id,
      modelResultV27Repository,
      modelResultRegionalV2Repository,
    ));
  }

  return Object.freeze({
    saveRecordAndFeedback,
    loadExperience,
    loadLatestExperience,
    loadAllExperiences,
  });
}
moduleExports["createRecordWorkflow"] = createRecordWorkflow;
coreModules[47] = moduleExports;
}

// ===== core/history/historyWorkflow.js =====
{
const moduleExports = Object.create(null);
const { STORAGE_KEYS } = coreModules[1];

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function localDateFromOffset(daysAgo = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function filterByPeriod(records, period) {
  if (period === "all") return records;
  const days = Number(period);
  if (!Number.isFinite(days) || days <= 0) return records;
  const minimumDate = localDateFromOffset(days - 1);
  return records.filter((record) => record.date >= minimumDate);
}

function hasCompletedSubjectiveCheck(feedback) {
  const status = String(feedback?.checkStatus || "not_asked");
  return !["not_asked", "deferred"].includes(status);
}

function includesText(value, query) {
  return String(value || "").toLocaleLowerCase("ja-JP").includes(query);
}

function removeRecordReferencesFromPlan(plan, recordId) {
  if (plan.sourceRecordId !== recordId && plan.actualRecordId !== recordId) return plan;
  return {
    ...plan,
    sourceRecordId: plan.sourceRecordId === recordId ? "" : plan.sourceRecordId,
    actualRecordId: plan.actualRecordId === recordId ? "" : plan.actualRecordId,
  };
}

function restorePlanReferences(currentPlan, previousPlan, recordId) {
  if (!currentPlan) return null;
  return {
    ...currentPlan,
    sourceRecordId: previousPlan.sourceRecordId === recordId && !currentPlan.sourceRecordId
      ? recordId
      : currentPlan.sourceRecordId,
    actualRecordId: previousPlan.actualRecordId === recordId && !currentPlan.actualRecordId
      ? recordId
      : currentPlan.actualRecordId,
  };
}

function createHistoryWorkflow({
  gateway,
  recordsRepository,
  modelResultV27Repository,
  modelResultRegionalV2Repository,
  subjectiveFeedbackRepository,
  planRepository,
  rofJRepository = null,
  rofJLifecycleRepository = null,
}) {
  function readCollectionForMutation(repository, sourceName) {
    const result = repository?.loadAllResult?.();
    if (result?.ok) return result;
    return {
      ...(result || {}),
      ok: false,
      code: "HISTORY_SOURCE_READ_FAILED",
      operation: result?.operation || "read",
      message: result?.message || `Unable to read ${sourceName}.`,
      details: { ...(result?.details || {}), sourceName, sourceCode: result?.code || "LOAD_RESULT_UNAVAILABLE" },
      items: [],
    };
  }

  function readOptionalEnvelopeForMutation(repository, sourceName, emptyEnvelope) {
    if (!repository) return { ok: true, exists: false, envelope: emptyEnvelope() };
    const result = repository?.loadEnvelopeResult?.();
    if (result?.ok) return result;
    return {
      ...(result || {}),
      ok: false,
      code: "HISTORY_SOURCE_READ_FAILED",
      operation: result?.operation || "read",
      message: result?.message || `Unable to read ${sourceName}.`,
      details: { ...(result?.details || {}), sourceName, sourceCode: result?.code || "LOAD_RESULT_UNAVAILABLE" },
      envelope: emptyEnvelope(),
    };
  }

  function search(filters = {}) {
    const query = String(filters.query || "").trim().toLocaleLowerCase("ja-JP");
    const activityType = String(filters.activityType || "all");
    const subjective = String(filters.subjective || "all");
    const allFeedback = subjectiveFeedbackRepository.loadAll();
    const feedbackByRecordId = new Map(allFeedback.map((item) => [item.recordId, item]));
    const records = filterByPeriod(recordsRepository.loadAll(), filters.period || "28")
      .filter((record) => activityType === "all" || record.activityType === activityType)
      .filter((record) => {
        const feedback = feedbackByRecordId.get(record.id) || null;
        const subjectiveCheckCompleted = hasCompletedSubjectiveCheck(feedback);
        if (subjective === "entered" && !subjectiveCheckCompleted) return false;
        if (subjective === "none" && subjectiveCheckCompleted) return false;
        if (!query) return true;
        const searchable = [
          record.date,
          record.memo,
          record.course?.name,
          feedback?.consultationNote,
          ...(feedback?.bodyAreaObservations || []).map((item) => item?.label || item?.areaId || ""),
        ];
        return searchable.some((value) => includesText(value, query));
      })
      .sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id));

    return records.map((record) => ({
      record: cloneValue(record),
      feedback: cloneValue(feedbackByRecordId.get(record.id) || null),
    }));
  }

  function deleteRecord(recordId) {
    const recordsRead = readCollectionForMutation(recordsRepository, "records");
    if (!recordsRead.ok) return recordsRead;
    const records = recordsRead.items;
    const record = records.find((item) => item.id === recordId);
    if (!record) return { ok: false, code: "HISTORY_RECORD_NOT_FOUND" };
    const feedbackRead = readCollectionForMutation(subjectiveFeedbackRepository, "subjectiveFeedback");
    if (!feedbackRead.ok) return feedbackRead;
    const feedbackItems = feedbackRead.items;
    const removedFeedback = feedbackItems.find((item) => item.recordId === recordId) || null;
    const v27Read = readCollectionForMutation(modelResultV27Repository, "modelResultsV27");
    if (!v27Read.ok) return v27Read;
    const modelResultItems = v27Read.items;
    const removedModelResults = modelResultItems.filter((item) => item.record_id === recordId);
    const regionalRead = readCollectionForMutation(modelResultRegionalV2Repository, "modelResultsRegionalV2");
    if (!regionalRead.ok) return regionalRead;
    const regionalV2Items = regionalRead.items;
    const removedRegionalV2Results = regionalV2Items.filter((item) => item.record_id === recordId);
    const rofJRead = readOptionalEnvelopeForMutation(
      rofJRepository,
      "rofJ",
      () => ({ schemaVersion: ROF_J_STORAGE_SCHEMA_VERSION, entries: {} }),
    );
    if (!rofJRead.ok) return rofJRead;
    const removedRofJ = cloneValue(rofJRead.envelope.entries?.[recordId] || null);
    const nextRofJEntries = { ...(rofJRead.envelope.entries || {}) };
    delete nextRofJEntries[recordId];
    const lifecycleRead = readOptionalEnvelopeForMutation(
      rofJLifecycleRepository,
      "rofJLifecycle",
      () => ({ schemaVersion: ROF_J_LIFECYCLE_SCHEMA_VERSION, pendingByRunId: {} }),
    );
    if (!lifecycleRead.ok) return lifecycleRead;
    const removedRofJLifecycle = cloneValue(lifecycleRead.envelope.pendingByRunId?.[recordId] || null);
    const nextLifecycleEntries = { ...(lifecycleRead.envelope.pendingByRunId || {}) };
    delete nextLifecycleEntries[recordId];
    const plansRead = readCollectionForMutation(planRepository, "plans");
    if (!plansRead.ok) return plansRead;
    const plans = plansRead.items;
    const affectedPlans = plans.filter((plan) => plan.sourceRecordId === recordId || plan.actualRecordId === recordId);
    const nextPlans = plans.map((plan) => removeRecordReferencesFromPlan(plan, recordId));
    const runMeasurementsRead = gateway.readJsonResult(STORAGE_KEYS.runMeasurements, []);
    if (!runMeasurementsRead.ok || !Array.isArray(runMeasurementsRead.value)) {
      return { ...(runMeasurementsRead || {}), ok: false, code: "HISTORY_SOURCE_READ_FAILED", sourceName: "runMeasurements" };
    }
    const runMeasurements = runMeasurementsRead.value;
    const removedRunMeasurement = cloneValue(runMeasurements.find((item) => item?.recordId === recordId) || null);
    const undoEntry = {
      version: 7,
      deletedAt: new Date().toISOString(),
      record,
      feedback: removedFeedback,
      modelResultsV27: removedModelResults,
      modelResultsRegionalV2: removedRegionalV2Results,
      rofJ: removedRofJ,
      rofJLifecycle: removedRofJLifecycle,
      runMeasurement: removedRunMeasurement,
      affectedPlans,
    };
    const operations = [
      { key: STORAGE_KEYS.records, value: records.filter((item) => item.id !== recordId) },
      { key: STORAGE_KEYS.subjectiveFeedback, value: feedbackItems.filter((item) => item.recordId !== recordId) },
      { key: STORAGE_KEYS.modelResultsV27, value: modelResultItems.filter((item) => item.record_id !== recordId) },
      { key: STORAGE_KEYS.modelResultsRegionalV2, value: regionalV2Items.filter((item) => item.record_id !== recordId) },
      { key: STORAGE_KEYS.plans, value: nextPlans },
      { key: STORAGE_KEYS.runMeasurements, value: runMeasurements.filter((item) => item?.recordId !== recordId) },
      { key: STORAGE_KEYS.historyUndo, value: undoEntry },
    ];
    if (rofJRepository) operations.push({
      key: STORAGE_KEYS.rofJ,
      value: { schemaVersion: rofJRead.envelope.schemaVersion, entries: nextRofJEntries },
    });
    if (rofJLifecycleRepository) operations.push({
      key: STORAGE_KEYS.rofJLifecycle,
      value: { schemaVersion: lifecycleRead.envelope.schemaVersion, pendingByRunId: nextLifecycleEntries },
    });
    const result = gateway.transact(operations);
    return { ...result, deleted: result.ok, undoEntry: result.ok ? cloneValue(undoEntry) : null };
  }

  function loadUndoEntry() {
    return gateway.readJson(STORAGE_KEYS.historyUndo, null);
  }

  function loadUndoEntryResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.historyUndo, null);
    if (!result.ok) return { ...result, code: "HISTORY_SOURCE_READ_FAILED", entry: null };
    if (result.value != null && (typeof result.value !== "object" || Array.isArray(result.value))) {
      return { ok: false, code: "HISTORY_UNDO_INVALID", operation: "validate", key: STORAGE_KEYS.historyUndo, entry: null };
    }
    return { ok: true, key: STORAGE_KEYS.historyUndo, exists: result.exists, entry: result.value };
  }

  function undoDelete() {
    const undoRead = loadUndoEntryResult();
    if (!undoRead.ok) return undoRead;
    const entry = undoRead.entry;
    if (!entry?.record?.id) return { ok: false, code: "HISTORY_UNDO_NOT_AVAILABLE" };
    const recordId = entry.record.id;
    const recordsRead = readCollectionForMutation(recordsRepository, "records");
    if (!recordsRead.ok) return recordsRead;
    const records = recordsRead.items.filter((item) => item.id !== recordId);
    records.push(entry.record);
    const feedbackRead = readCollectionForMutation(subjectiveFeedbackRepository, "subjectiveFeedback");
    if (!feedbackRead.ok) return feedbackRead;
    const feedbackItems = feedbackRead.items.filter((item) => item.recordId !== recordId);
    if (entry.feedback) feedbackItems.push(entry.feedback);
    const removedResultIds = new Set(
      (entry.modelResultsV27 || []).map((item) => item.id),
    );
    const v27Read = readCollectionForMutation(modelResultV27Repository, "modelResultsV27");
    if (!v27Read.ok) return v27Read;
    const modelResultItems = v27Read.items
      .filter((item) => !removedResultIds.has(item.id));
    modelResultItems.push(...(entry.modelResultsV27 || []));
    const removedRegionalV2Ids = new Set((entry.modelResultsRegionalV2 || []).map((item) => item.id));
    const regionalRead = readCollectionForMutation(modelResultRegionalV2Repository, "modelResultsRegionalV2");
    if (!regionalRead.ok) return regionalRead;
    const regionalV2Items = regionalRead.items.filter((item) => !removedRegionalV2Ids.has(item.id));
    regionalV2Items.push(...(entry.modelResultsRegionalV2 || []));

    const rofJRead = readOptionalEnvelopeForMutation(
      rofJRepository,
      "rofJ",
      () => ({ schemaVersion: ROF_J_STORAGE_SCHEMA_VERSION, entries: {} }),
    );
    if (!rofJRead.ok) return rofJRead;
    const nextRofJEntries = { ...(rofJRead.envelope.entries || {}) };
    const hasRofJUndo = Object.prototype.hasOwnProperty.call(entry, "rofJ")
      || Object.prototype.hasOwnProperty.call(entry, "secondPillarRofJ");
    const undoRofJ = Object.prototype.hasOwnProperty.call(entry, "rofJ") ? entry.rofJ : entry.secondPillarRofJ;
    if (hasRofJUndo) {
      delete nextRofJEntries[recordId];
      if (undoRofJ) nextRofJEntries[recordId] = cloneValue(undoRofJ);
    }
    const lifecycleRead = readOptionalEnvelopeForMutation(
      rofJLifecycleRepository,
      "rofJLifecycle",
      () => ({ schemaVersion: ROF_J_LIFECYCLE_SCHEMA_VERSION, pendingByRunId: {} }),
    );
    if (!lifecycleRead.ok) return lifecycleRead;
    const nextLifecycleEntries = { ...(lifecycleRead.envelope.pendingByRunId || {}) };
    const hasRofJLifecycleUndo = Object.prototype.hasOwnProperty.call(entry, "rofJLifecycle")
      || Object.prototype.hasOwnProperty.call(entry, "secondPillarLifecycle");
    const undoRofJLifecycle = Object.prototype.hasOwnProperty.call(entry, "rofJLifecycle") ? entry.rofJLifecycle : entry.secondPillarLifecycle;
    if (hasRofJLifecycleUndo) {
      delete nextLifecycleEntries[recordId];
      if (undoRofJLifecycle) nextLifecycleEntries[recordId] = cloneValue(undoRofJLifecycle);
    }

    const plansRead = readCollectionForMutation(planRepository, "plans");
    if (!plansRead.ok) return plansRead;
    const currentPlans = plansRead.items;
    const previousPlansById = new Map((entry.affectedPlans || []).map((plan) => [plan.id, plan]));
    const nextPlans = currentPlans.map((plan) => (
      previousPlansById.has(plan.id)
        ? restorePlanReferences(plan, previousPlansById.get(plan.id), recordId)
        : plan
    )).filter(Boolean);

    const runMeasurementsRead = gateway.readJsonResult(STORAGE_KEYS.runMeasurements, []);
    if (!runMeasurementsRead.ok || !Array.isArray(runMeasurementsRead.value)) {
      return { ...(runMeasurementsRead || {}), ok: false, code: "HISTORY_SOURCE_READ_FAILED", sourceName: "runMeasurements" };
    }
    const nextRunMeasurements = runMeasurementsRead.value.filter((item) => item?.recordId !== recordId);
    if (entry.runMeasurement) nextRunMeasurements.push(cloneValue(entry.runMeasurement));

    const operations = [
      { key: STORAGE_KEYS.records, value: records },
      { key: STORAGE_KEYS.subjectiveFeedback, value: feedbackItems },
      { key: STORAGE_KEYS.modelResultsV27, value: modelResultItems },
      { key: STORAGE_KEYS.modelResultsRegionalV2, value: regionalV2Items },
      { key: STORAGE_KEYS.plans, value: nextPlans },
      { key: STORAGE_KEYS.runMeasurements, value: nextRunMeasurements },
      { key: STORAGE_KEYS.historyUndo, remove: true },
    ];
    if (rofJRepository && hasRofJUndo) operations.push({
      key: STORAGE_KEYS.rofJ,
      value: { schemaVersion: ROF_J_STORAGE_SCHEMA_VERSION, entries: nextRofJEntries },
    });
    if (rofJLifecycleRepository && hasRofJLifecycleUndo) operations.push({
      key: STORAGE_KEYS.rofJLifecycle,
      value: { schemaVersion: ROF_J_LIFECYCLE_SCHEMA_VERSION, pendingByRunId: nextLifecycleEntries },
    });
    const result = gateway.transact(operations);
    return { ...result, restored: result.ok, record: result.ok ? cloneValue(entry.record) : null };
  }

  return Object.freeze({ search, deleteRecord, loadUndoEntry, loadUndoEntryResult, undoDelete });
}
moduleExports["createHistoryWorkflow"] = createHistoryWorkflow;
coreModules[48] = moduleExports;
}

// ===== core/planning/planPreviewV27.js =====
{
const moduleExports = Object.create(null);
const { SURFACE_FIELDS } = coreModules[3];
const { V27_ACTIVITY_TYPES, V27_EMPHASIS_REGION_IDS, V27_MODEL_VERSION, V27_REGIONAL_VIEW_IDS } = coreModules[12];
const { adaptRecordToV27Session } = coreModules[45];
const { assertV27ResultSemantics, calculateV27Session } = coreModules[39];
const { validateRunningRecordInput } = coreModules[9];

const GRADE_KNOWLEDGE = new Set(["UNKNOWN", "KNOWN_FLAT", "KNOWN_PROFILE"]);
const SURFACE_CLASSES = new Set([
  "REF_HARD_EVEN_STABLE",
  "DRY_STABLE_GRASS_TURF",
  "DEEP_DRY_SOFT_SAND",
  "EXPLICIT_UNEVEN",
  "KNOWN_OTHER",
  "UNKNOWN",
]);
const RUNNING_FORMATS = new Set(Object.values(V27_ACTIVITY_TYPES));
const PLAN_FACT_PREVIEW_VERSION = "plan-facts-v1";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function provided(value) {
  return value !== undefined && value !== null && value !== "";
}

function validateRawV27PlanSession(session = {}) {
  const errors = [];
  const activityType = String(session?.activityType || "run");
  if (!["run", "rest"].includes(activityType)) {
    errors.push({
      field: "activityType",
      code: "INVALID_PLAN_ACTIVITY_TYPE",
      message: "予定の種類を選び直してください。",
    });
  }
  if (activityType !== "rest") {
    const runningFormat = String(session?.runningFormat || "UNKNOWN").toUpperCase();
    if (!RUNNING_FORMATS.has(runningFormat)) {
      errors.push({
        field: "runningFormat",
        code: "INVALID_PLAN_RUNNING_FORMAT",
        message: "予定の走行形式を選び直してください。",
      });
    }
    const course = session?.course && typeof session.course === "object"
      ? session.course
      : {};
    const gradeKnowledge = String(course.gradeKnowledge || "UNKNOWN").toUpperCase();
    if (!GRADE_KNOWLEDGE.has(gradeKnowledge)) {
      errors.push({
        field: "course.gradeKnowledge",
        code: "INVALID_PLAN_GRADE_KNOWLEDGE",
        message: "予定の坂道の入力方法を選び直してください。",
      });
    }
    const modelSurfaceClass = String(course.modelSurfaceClass || "UNKNOWN").toUpperCase();
    if (!SURFACE_CLASSES.has(modelSurfaceClass)) {
      errors.push({
        field: "course.modelSurfaceClass",
        code: "INVALID_PLAN_SURFACE_CLASS",
        message: "予定の路面材質を選び直してください。",
      });
    }
    const surfaceValues = SURFACE_FIELDS.map(({ recordKey }) => Number(course[recordKey] || 0));
    if (surfaceValues.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
      errors.push({ field: "course", code: "INVALID_PLAN_SURFACE_SHARE", message: "予定の路面割合を0〜100で入力してください。" });
    } else {
      const total = surfaceValues.reduce((sum, value) => sum + value, 0);
      if (total > 0 && Math.abs(total - 100) > 0.01) errors.push({ field: "course", code: "PLAN_SURFACE_SUM_NOT_100", message: "予定の路面割合の合計を100%にしてください。" });
    }
    [
      "upPercent",
      "downPercent",
      "upGradePercent",
      "downGradePercent",
    ].forEach((field) => {
      if (!provided(course[field])) return;
      const value = Number(course[field]);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        errors.push({
          field: `course.${field}`,
          code: "INVALID_PLAN_GRADE_VALUE",
          message: "予定の坂道割合・代表勾配は0〜100の数値で入力してください。",
        });
      }
    });
  }
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
  });
}

function normalizeCourse(course = {}) {
  const source = course && typeof course === "object" ? course : {};
  const gradeKnowledge = String(source.gradeKnowledge || "UNKNOWN").toUpperCase();
  const modelSurfaceClass = String(source.modelSurfaceClass || "UNKNOWN").toUpperCase();
  const normalized = {
    ...JSON.parse(JSON.stringify(source)),
    name: String(source.name || "").trim(),
    gradeKnowledge: GRADE_KNOWLEDGE.has(gradeKnowledge) ? gradeKnowledge : "UNKNOWN",
    upPercent: finiteNumber(source.upPercent),
    downPercent: finiteNumber(source.downPercent),
    upGradePercent: finiteNumber(source.upGradePercent),
    downGradePercent: finiteNumber(source.downGradePercent),
    surfaceInputMode: ["UNKNOWN", "SINGLE", "MIXED"].includes(String(source.surfaceInputMode || "").toUpperCase()) ? String(source.surfaceInputMode).toUpperCase() : "UNKNOWN",
    modelSurfaceClass: SURFACE_CLASSES.has(modelSurfaceClass) ? modelSurfaceClass : "UNKNOWN",
    modelSurfaceProfile: Array.isArray(source.modelSurfaceProfile) ? source.modelSurfaceProfile.map((item) => ({ sharePercent: finiteNumber(item?.sharePercent), surfaceClass: String(item?.surfaceClass || "UNKNOWN") })) : [],
  };
  SURFACE_FIELDS.forEach(({ recordKey }) => { normalized[recordKey] = finiteNumber(source[recordKey]); });
  return Object.freeze(normalized);
}

function normalizeV27PlanSession(session = {}) {
  const activityType = String(session?.activityType || "run") === "rest" ? "rest" : "run";
  const runningFormat = String(session?.runningFormat || "UNKNOWN").toUpperCase();
  return Object.freeze({
    activityType,
    distanceKm: activityType === "rest" ? 0 : finiteNumber(session?.distanceKm),
    durationMinutes: activityType === "rest" ? 0 : finiteNumber(session?.durationMinutes),
    runningFormat: activityType === "rest"
      ? "NOT_APPLICABLE"
      : RUNNING_FORMATS.has(runningFormat)
        ? runningFormat
        : "UNKNOWN",
    course: activityType === "rest" ? normalizeCourse({}) : normalizeCourse(session?.course),
  });
}

function normalizePlanFactSession(session = {}) {
  return normalizeV27PlanSession(session);
}

function clonePlanFactPreview(preview) {
  return preview == null ? preview : JSON.parse(JSON.stringify(preview));
}

function invalidPlanFactPreview(session, validation, message = "") {
  return Object.freeze({
    ok: false,
    state: "INVALID",
    modelVersion: PLAN_FACT_PREVIEW_VERSION,
    session,
    facts: null,
    validation,
    message: message || validation?.errors?.map((item) => item.message || item.code).join(" ") || "予定入力を確認してください。",
  });
}

function createPlanFactPreview({
  session: rawSession = {},
  scheduledDate = "",
  previewId = "plan-fact-preview",
} = {}) {
  const session = normalizePlanFactSession(rawSession);
  const rawValidation = validateRawV27PlanSession(rawSession);
  if (!rawValidation.ok) return invalidPlanFactPreview(session, rawValidation);
  if (session.activityType === "rest") {
    return Object.freeze({
      ok: true,
      state: "REST",
      modelVersion: PLAN_FACT_PREVIEW_VERSION,
      session,
      facts: Object.freeze({ activityType: "rest" }),
      validation: Object.freeze({ ok: true, errors: Object.freeze([]) }),
      message: "休養予定として保存します。",
    });
  }
  const record = previewRecord(session, scheduledDate, previewId);
  const validation = validateRunningRecordInput(record);
  if (!validation.ok) return invalidPlanFactPreview(session, validation);
  return Object.freeze({
    ok: true,
    state: "RUN",
    modelVersion: PLAN_FACT_PREVIEW_VERSION,
    session,
    facts: Object.freeze({
      activityType: "run",
      distanceKm: session.distanceKm,
      durationMinutes: session.durationMinutes,
      runningFormat: session.runningFormat,
      course: session.course,
    }),
    validation,
    message: "入力した予定条件を事実として確認します。旧形式の走行全体スコアは計算しません。",
  });
}

function previewRecord(session, scheduledDate, previewId) {
  return Object.freeze({
    id: previewId,
    date: scheduledDate,
    activityType: session.activityType,
    distanceKm: session.distanceKm,
    durationMinutes: session.durationMinutes,
    runningFormat: session.runningFormat,
    stepsProvenance: "UNKNOWN",
    rpeProvenance: "NOT_REPORTED",
    course: session.course,
  });
}

function invalidPreview(session, validation, message = "") {
  return Object.freeze({
    ok: false,
    state: "INVALID",
    modelVersion: V27_MODEL_VERSION,
    session,
    result: null,
    validation,
    message: message || validation?.errors?.map((item) => item.message || item.code).join(" ") || "予定入力を確認してください。",
    viewContract: Object.freeze({
      available: Object.freeze([
        V27_REGIONAL_VIEW_IDS.withinRun,
        V27_REGIONAL_VIEW_IDS.ownFlat,
      ]),
      personalExcluded: true,
    }),
  });
}

function createV27PlanPreview({
  session: rawSession = {},
  scheduledDate = "",
  previewId = "plan-preview",
} = {}) {
  const session = normalizeV27PlanSession(rawSession);
  const rawValidation = validateRawV27PlanSession(rawSession);
  if (!rawValidation.ok) return invalidPreview(session, rawValidation);
  if (session.activityType === "rest") {
    return Object.freeze({
      ok: true,
      state: "REST",
      modelVersion: V27_MODEL_VERSION,
      session,
      result: null,
      validation: Object.freeze({ ok: true, errors: Object.freeze([]) }),
      message: "休養予定には走行による推定値を作成しません。",
      viewContract: Object.freeze({
        available: Object.freeze([]),
        personalExcluded: true,
      }),
    });
  }
  const record = previewRecord(session, scheduledDate, previewId);
  const validation = validateRunningRecordInput(record);
  if (!validation.ok) return invalidPreview(session, validation);
  const adaptation = adaptRecordToV27Session(record);
  if (!adaptation.ok) return invalidPreview(session, adaptation);
  let result;
  try {
    result = calculateV27Session(adaptation.session);
  } catch (error) {
    return invalidPreview(
      session,
      Object.freeze({
        ok: false,
        errors: Object.freeze([{ code: "PLAN_PREVIEW_CALCULATION_FAILED" }]),
      }),
      String(error?.message || error),
    );
  }
  const semantic = assertV27ResultSemantics(result);
  if (!semantic.ok) return invalidPreview(session, semantic);
  return Object.freeze({
    ok: true,
    state: "RUN",
    modelVersion: V27_MODEL_VERSION,
    session,
    inputSnapshot: Object.freeze({
      session: adaptation.session,
      provenance: adaptation.provenance,
      warnings: adaptation.warnings,
    }),
    result,
    validation,
    message: "予定入力による推定です。実績、処方、最適条件、走行可否を示しません。",
    viewContract: Object.freeze({
      available: Object.freeze([
        V27_REGIONAL_VIEW_IDS.withinRun,
        V27_REGIONAL_VIEW_IDS.ownFlat,
      ]),
      personalExcluded: true,
    }),
    fixedRegionIds: V27_EMPHASIS_REGION_IDS,
  });
}

function cloneV27PlanPreview(preview) {
  return preview == null ? preview : JSON.parse(JSON.stringify(preview));
}
moduleExports["validateRawV27PlanSession"] = validateRawV27PlanSession;
moduleExports["normalizeV27PlanSession"] = normalizeV27PlanSession;
moduleExports["createV27PlanPreview"] = createV27PlanPreview;
moduleExports["cloneV27PlanPreview"] = cloneV27PlanPreview;
moduleExports["normalizePlanFactSession"] = normalizePlanFactSession;
moduleExports["createPlanFactPreview"] = createPlanFactPreview;
moduleExports["clonePlanFactPreview"] = clonePlanFactPreview;
moduleExports["PLAN_FACT_PREVIEW_VERSION"] = PLAN_FACT_PREVIEW_VERSION;
coreModules[49] = moduleExports;
}

// ===== core/planning/planWorkflow.js =====
{
const moduleExports = Object.create(null);
const { clonePlanFactPreview, createPlanFactPreview, normalizePlanFactSession } = coreModules[49];
const { normalizePlainText, normalizeSingleLineText } = coreModules[6];
const { isValidLocalDate } = coreModules[9];

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createReadablePlanId(date, existingIds) {
  const prefix = `plan-${date || "unscheduled"}-`;
  const used = new Set(existingIds
    .filter((id) => String(id).startsWith(prefix))
    .map((id) => Number(String(id).slice(prefix.length)))
    .filter(Number.isFinite));
  let sequence = 1;
  while (used.has(sequence)) sequence += 1;
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

function defaultCourse() {
  return Object.freeze({
    name: "",
    gradeKnowledge: "UNKNOWN",
    upPercent: 0,
    downPercent: 0,
    upGradePercent: 0,
    downGradePercent: 0,
    modelSurfaceClass: "UNKNOWN",
  });
}

function defaultRunSession() {
  return normalizePlanFactSession({
    activityType: "run",
    distanceKm: 0,
    durationMinutes: 20,
    runningFormat: "UNKNOWN",
    course: defaultCourse(),
  });
}

function sourceSession(experience) {
  const record = experience?.record;
  if (!record || record.activityType === "rest") return defaultRunSession();
  return normalizePlanFactSession({
    activityType: "run",
    distanceKm: record.distanceKm,
    durationMinutes: record.durationMinutes,
    runningFormat: record.runningFormat,
    course: record.course,
  });
}

function lighterSession(base) {
  return normalizePlanFactSession({
    ...cloneValue(base),
    distanceKm: Math.round(Number(base.distanceKm || 0) * 80) / 100,
    durationMinutes: Math.round(Number(base.durationMinutes || 0) * 8) / 10,
  });
}

function restSession() {
  return normalizePlanFactSession({ activityType: "rest" });
}

function preview(session, scheduledDate, candidateId) {
  return createPlanFactPreview({
    session,
    scheduledDate,
    previewId: `plan-preview-${candidateId}-${scheduledDate}`,
  });
}

function createPlanWorkflow({ services, planRepository }) {
  function createCandidates({ sourceRecordId = "", scheduledDate = "" } = {}) {
    const latestExperience = services.workflows.records.loadLatestExperience();
    const sourceExperience = sourceRecordId
      ? services.workflows.records.loadExperience(sourceRecordId)
      : latestExperience;
    const blockingExperience = [latestExperience, sourceExperience].find((experience) => (
      experience && services.safety.shouldBlockNormalPlanSuggestions(experience.supportDecision)
    )) || null;
    if (blockingExperience) {
      return { blocked: true, sourceExperience, blockingExperience, candidates: [] };
    }
    const base = sourceSession(sourceExperience);
    const definitions = [
      {
        candidateId: "same-conditions",
        title: "同じ条件を出発点にする",
        description: "前回の距離・時間・把握済みコースを転記します。",
        session: base,
      },
      {
        candidateId: "lighter-session",
        title: "距離と時間を小さくする",
        description: "前回の約8割を編集の出発点にします。",
        session: lighterSession(base),
      },
      {
        candidateId: "rest-day",
        title: "休養を予定する",
        description: "走らない予定も同じ位置づけの候補として扱います。",
        session: restSession(),
      },
    ];
    return {
      blocked: false,
      sourceExperience,
      candidates: definitions.map((candidate) => Object.freeze({
        ...candidate,
        preview: preview(candidate.session, scheduledDate, candidate.candidateId),
      })),
    };
  }

  function savePlan(input = {}) {
    const currentPlans = planRepository.loadAll();
    const existing = input.id ? currentPlans.find((plan) => plan.id === input.id) : null;
    const scheduledDate = String(input.scheduledDate || "").slice(0, 10);
    if (!isValidLocalDate(scheduledDate)) {
      return {
        ok: false,
        code: "PLAN_DATE_REQUIRED",
        message: "予定日を正しく入力してください。",
      };
    }
    if (!["run", "rest"].includes(String(input.planType || "run"))) {
      return {
        ok: false,
        code: "INVALID_PLAN_TYPE",
        message: "予定の種類を選び直してください。",
      };
    }
    const planType = input.planType === "rest" ? "rest" : "run";
    const plannedSession = normalizePlanFactSession({
      ...(input.plannedSession || {}),
      activityType: planType,
    });
    const previewResult = preview(plannedSession, scheduledDate, input.id || "new");
    if (planType === "run" && !previewResult.ok) {
      return {
        ok: false,
        code: "INVALID_PLAN_SESSION",
        message: previewResult.message,
        errors: previewResult.validation?.errors || [],
      };
    }
    const id = normalizeSingleLineText(input.id, 100)
      || createReadablePlanId(scheduledDate, currentPlans.map((plan) => plan.id));
    const now = new Date().toISOString();
    return planRepository.upsert({
      ...input,
      id,
      scheduledDate,
      planType,
      title: normalizeSingleLineText(input.title, 80)
        || (planType === "rest" ? "休養予定" : "次回の走行予定"),
      memo: normalizePlainText(input.memo, 500),
      plannedSession,
      sourceCandidateId: normalizeSingleLineText(input.sourceCandidateId, 80) || "custom",
      previewSnapshot: clonePlanFactPreview(previewResult),
      previewGeneratedAt: now,
      createdAt: existing?.createdAt || input.createdAt || now,
      updatedAt: now,
    });
  }

  function updateOutcome(planId, outcome = {}) {
    const plan = planRepository.findById(planId);
    if (!plan) {
      return {
        ok: false,
        code: "PLAN_NOT_FOUND",
        message: "対象の予定が見つかりません。",
      };
    }
    const allowedStatuses = new Set(["planned", "completed", "changed", "not_completed"]);
    const requestedStatus = normalizeSingleLineText(outcome.status, 40)
      || plan.outcomeStatus
      || "planned";
    const outcomeStatus = allowedStatuses.has(requestedStatus) ? requestedStatus : "planned";
    return planRepository.upsert({
      ...plan,
      outcomeStatus,
      actualRecordId: outcome.actualRecordId === undefined
        ? plan.actualRecordId
        : normalizeSingleLineText(outcome.actualRecordId, 100),
      changeReason: outcome.reason === undefined
        ? plan.changeReason
        : normalizeSingleLineText(outcome.reason, 60),
      changeReasonNote: outcome.reasonNote === undefined
        ? plan.changeReasonNote
        : normalizePlainText(outcome.reasonNote, 240),
      updatedAt: new Date().toISOString(),
    });
  }

  function markActualRecord(planId, recordId, outcome = {}) {
    return updateOutcome(planId, {
      status: outcome.status || "completed",
      actualRecordId: recordId,
      reason: outcome.reason,
      reasonNote: outcome.reasonNote,
    });
  }

  return Object.freeze({
    createCandidates,
    savePlan,
    updateOutcome,
    markActualRecord,
  });
}
moduleExports["createPlanWorkflow"] = createPlanWorkflow;
coreModules[50] = moduleExports;
}

import "./dataManagement.js";
import { internalModules } from "./modules.js";

// ===== core/consultation/consultationReport.js =====
{
const moduleExports = Object.create(null);
const { PRIMARY_REGIONAL_V2_REGION_DEFS } = internalModules.primaryRegionalRegionDefinitions;
const { PRIMARY_REGIONAL_V2_MODEL_VERSION, buildPrimaryRegionalV2ComparisonSignature, comparePrimaryRegionalV2Signatures } = internalModules.primaryRegionalResultService;
const { bodyAreaLateralityLabel } = internalModules.bodyAreaTaxonomy;
const { summarizePersonalContext } = internalModules.personalContext;
const { reportedRpeValue } = internalModules.rpeProvenance;


const REGIONS = Object.freeze(PRIMARY_REGIONAL_V2_REGION_DEFS.map((region) => Object.freeze({ id: region.displayId, name: region.name })));
const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const DEFAULT_REGION_ID = "BA-DISP-019";

function hasFiniteValue(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function finiteOrNull(value) {
  return hasFiniteValue(value) ? Number(value) : null;
}

function normalizeRegionId(value = "") {
  const requested = String(value || "");
  return REGION_BY_ID.has(requested) ? requested : DEFAULT_REGION_ID;
}

function activitySummary(record = {}) {
  if (record.activityType === "rest") return "休養";
  const parts = [];
  if (Number(record.distanceKm) > 0) parts.push(`${record.distanceKm}km`);
  if (Number(record.durationMinutes) > 0) parts.push(`${record.durationMinutes}分`);
  if (Number(record.steps) > 0) parts.push(`${record.steps}歩`);
  return parts.join("・") || "走行";
}


function normalizeExactObservations(feedback = {}) {
  const observations = Array.isArray(feedback.bodyAreaObservations) ? feedback.bodyAreaObservations : [];
  return observations
    .filter((item) => item && typeof item === "object")
    .map((item) => Object.freeze({
      areaId: String(item.areaId || ""),
      label: String(item.label || "詳細部位"),
      laterality: String(item.laterality || item.side || "UNKNOWN"),
      lateralityLabel: bodyAreaLateralityLabel(item.laterality || item.side),
      intensity: finiteOrNull(item.intensity),
      sensation: String(item.sensation || item.note || ""),
      modelRegionId: String(item.modelRegionId || ""),
    }));
}

function rawFacts(record = {}) {
  return Object.freeze({
    activityType: record.activityType === "rest" ? "rest" : "run",
    distanceKm: record.activityType === "rest" ? null : finiteOrNull(record.distanceKm),
    durationMinutes: record.activityType === "rest" ? null : finiteOrNull(record.durationMinutes),
    steps: record.activityType === "rest" ? null : finiteOrNull(record.steps),
    stepsProvenance: String(record.stepsProvenance || ""),
    rpe: record.activityType === "rest" ? null : reportedRpeValue(record),
    runningFormat: String(record.runningFormat || ""),
    course: record.course && typeof record.course === "object" ? JSON.parse(JSON.stringify(record.course)) : {},
  });
}

function resultRow(experience, regionId) {
  return experience?.regionalV2ResultRecord?.result?.regions?.find((row) => row.regionId === regionId)
    || experience?.regionalV2Result?.regions?.find((row) => row.regionId === regionId)
    || null;
}

function modelDistanceKm(resultRecord = {}, record = {}) {
  const input = resultRecord?.engine_input_snapshot || {};
  const runWalk = String(input.runningFormat || record.runningFormat || "").toUpperCase() === "RUN_WALK";
  const distance = Number(runWalk ? (input.runningDistanceKm ?? record.runWalkRunningDistanceKm) : (input.distanceKm ?? record.distanceKm));
  return Number.isFinite(distance) && distance > 0 ? distance : null;
}

function regionalReference(experience, regionId) {
  const region = REGION_BY_ID.get(regionId);
  const resultRecord = experience?.regionalV2ResultRecord || null;
  const distanceKm = modelDistanceKm(resultRecord || {}, experience?.record || {});
  const referenceValue = 100;
  const base = {
    regionId,
    regionLabel: region?.name || regionId,
    state: "UNAVAILABLE",
    value: null,
    delta: null,
    reference: "基準100",
    referenceDefinitionId: null,
    endpoint: Object.freeze({ label: "部位の目安" }),
    exposure: Object.freeze({
      status: distanceKm == null ? "UNAVAILABLE" : "RECORDED_SEPARATELY",
      basis: "distance_separate_fact",
      label: "走行距離は部位の数値へ掛けず、別の走行事実として扱います",
      shortLabel: "走行距離は別表示",
      unit: "km",
      qEquivalent: distanceKm,
      qReference: distanceKm,
      ratioExact: 1,
      fallbackStatus: "NONE",
    }),
    routeFamilySignature: null,
    primaryRegionalV2: true,
  };
  if (experience?.record?.activityType === "rest") return Object.freeze({ ...base, state: "REST" });
  if (!resultRecord || resultRecord.model_version !== PRIMARY_REGIONAL_V2_MODEL_VERSION) return Object.freeze(base);
  const row = resultRow(experience, regionId);
  if (!row || !hasFiniteValue(row.value)) {
    return Object.freeze({ ...base, state: resultRecord?.result?.state || "UNAVAILABLE" });
  }
  const signature = buildPrimaryRegionalV2ComparisonSignature(resultRecord, row);
  const value = Number(row.value);
  return Object.freeze({
    ...base,
    state: "SUPPORTED_NUMERIC",
    value,
    delta: value - 100,
    referenceDefinitionId: row.referenceId || null,
    routeFamilySignature: signature,
  });
}

function totalReference(experience) {
  const resultRecord = experience?.v27ResultRecord;
  if (!resultRecord || resultRecord.state !== "RUN") return null;
  const total = resultRecord.result?.total;
  return Object.freeze({
    central: finiteOrNull(total?.central_points),
    range: Array.isArray(total?.range_points) ? [...total.range_points] : null,
    showRange: total?.show_range_primary === true,
    gradeCoverage: finiteOrNull(total?.grade_coverage),
    surfaceCoverage: finiteOrNull(total?.surface_coverage),
    pairingState: String(total?.pairing_state || ""),
  });
}

function modelReference(experience, regionId) {
  const isRest = experience?.record?.activityType === "rest";
  const total = totalReference(experience);
  const regional = regionalReference(experience, regionId);
  const rpeWasReported = reportedRpeValue(experience?.record || {}) != null;
  const internal = experience?.v27ResultRecord?.result?.internal;
  return Object.freeze({
    modelVersion: String(experience?.regionalV2ResultRecord?.model_version || experience?.v27ResultRecord?.model_version || ""),
    primaryRegionalV2: experience?.regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION,
    state: isRest ? "REST" : total || regional.state === "SUPPORTED_NUMERIC" ? "RUN" : "NO_NUMERIC_RESULT",
    total,
    regional,
    internalResponse: isRest ? null : Object.freeze({
      state: rpeWasReported ? String(internal?.state || "UNKNOWN") : "UNKNOWN",
      srpeAu: rpeWasReported ? finiteOrNull(internal?.srpe_au) : null,
      separateFromRunFactModel: internal?.separate_from_objective_model === true,
    }),
  });
}

function recordChronology(left, right) {
  return String(left?.record?.date || "").localeCompare(String(right?.record?.date || ""))
    || String(left?.record?.createdAt || "").localeCompare(String(right?.record?.createdAt || ""))
    || String(left?.record?.id || "").localeCompare(String(right?.record?.id || ""));
}

function recentFacts(allExperiences, target, regionId) {
  const currentRow = resultRow(target, regionId);
  const currentSignature = currentRow && target?.regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION
    ? buildPrimaryRegionalV2ComparisonSignature(target.regionalV2ResultRecord, currentRow)
    : null;
  return [...allExperiences]
    .filter((item) => item?.record?.id && item.record.id !== target?.record?.id)
    .filter((item) => recordChronology(item, target) < 0)
    .sort((left, right) => recordChronology(right, left))
    .slice(0, 6)
    .map((item) => {
      const row = resultRow(item, regionId);
      const signature = row && item?.regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION
        ? buildPrimaryRegionalV2ComparisonSignature(item.regionalV2ResultRecord, row)
        : null;
      const compared = currentSignature && signature
        ? comparePrimaryRegionalV2Signatures(currentSignature, signature)
        : { directDeltaAllowed: false, reason: "COMPARISON_SIGNATURE_MISSING" };
      const regional = regionalReference(item, regionId);
      return Object.freeze({
        recordId: item.record.id,
        date: item.record.date,
        activity: activitySummary(item.record),
        activityType: item.record.activityType === "rest" ? "rest" : "run",
        total: totalReference(item)?.central ?? null,
        regionalState: regional.state,
        regionalValue: compared.directDeltaAllowed ? regional.value : null,
        regionalDirectComparable: compared.directDeltaAllowed,
        regionalExclusionReasons: compared.directDeltaAllowed ? [] : [compared.reason || "SEMANTIC_OR_MODEL_MISMATCH"],
        rpe: reportedRpeValue(item.record),
        exactObservations: normalizeExactObservations(item.feedback || {}),
      });
    });
}

function buildConsultationReport(experience, allExperiences = [], options = {}) {
  if (!experience) return null;
  const regionId = normalizeRegionId(options.regionId);
  const feedback = experience.feedback || {};
  const personal = summarizePersonalContext(experience.record.personalContext || {});
  const exactObservations = normalizeExactObservations(feedback);
  const recent = recentFacts(allExperiences, experience, regionId);
  return Object.freeze({
    reportVersion: "consultation-report-v1.0",
    date: experience.record.date,
    activity: activitySummary(experience.record),
    courseName: experience.record.course?.name || "",
    memo: experience.record.memo || "",
    rawFacts: rawFacts(experience.record),
    personalContextItems: personal.hasInput ? personal.items : [],
    subjectiveStatus: feedback.checkStatus || "not_asked",
    exactBodyObservations: Object.freeze(exactObservations),
    consultationNote: feedback.consultationNote || "",
    conditionFlags: Object.entries(feedback.safetyFlags || {}).filter(([, active]) => active).map(([flag]) => flag),
    supportRoute: experience.supportDecision?.route || "normal",
    modelReference: modelReference(experience, regionId),
    recent: Object.freeze(recent),
    comparisonCounts: Object.freeze({
      direct: recent.filter((item) => item.regionalDirectComparable && hasFiniteValue(item.regionalValue)).length,
      excluded: recent.filter((item) => !item.regionalDirectComparable).length,
      nonnumeric: recent.filter((item) => item.regionalDirectComparable && !hasFiniteValue(item.regionalValue)).length,
    }),
    claimBoundary: Object.freeze({
      subjectiveAndModelAreSeparate: true,
      conditionAndExposureAreSeparate: true,
      unsupportedIsNeverReferenceOne: true,
      isDiagnosis: false,
      predictsInjury: false,
      provesCause: false,
      guaranteesSafety: false,
      determinesRunOrNoRun: false,
      isMeasuredPhysicalRegionalLoad: false,
      isAnatomicalShare: false,
    }),
  });
}

function exposureText(exposure = {}) {
  if (!hasFiniteValue(exposure.qEquivalent)) return "走行距離：数値なし";
  return `走行距離：${Number(exposure.qEquivalent)} km（部位の数値とは別の走行事実）`;
}

function regionalText(regional) {
  if (!regional || !hasFiniteValue(regional.value)) {
    const label = regional?.regionLabel || "選択した部位";
    return `部位の目安：${label}／数値なし`;
  }
  const rounded = Math.round(Number(regional.value) * 10) / 10;
  return `部位の目安：${regional.regionLabel} ${rounded}／${regional.reference}`;
}

function bodyObservationLines(report) {
  const exact = report.exactBodyObservations.map((item) => {
    const details = [];
    if (item.lateralityLabel) details.push(item.lateralityLabel);
    if (item.intensity != null) details.push(`程度 ${item.intensity}/5`);
    if (item.sensation) details.push(item.sensation);
    return `- ${item.label}${details.length ? `：${details.join("・")}` : ""}`;
  });
  const saved = (report.subjectiveParts || []).map((item) => {
    const details = [];
    if (item.fatigue > 0) details.push(`疲れ・だるさ ${item.fatigue}/5`);
    if (item.discomfort > 0) details.push(`気になる感じ ${item.discomfort}/5`);
    return `- ${item.label}：${details.join("・") || "確認済み"}`;
  });
  return [...exact, ...saved];
}

function createShortConsultationMemo(report) {
  if (!report) return "";
  const lines = [`${report.date}の${report.activity}について相談したいです。`];
  if (report.personalContextItems.length) lines.push(`今日のシューズ・走り方：${report.personalContextItems.slice(0, 3).join("、")}。`);
  const observations = [...report.exactBodyObservations.map((item) => item.label), ...(report.subjectiveParts || []).map((item) => item.label)];
  if (observations.length) lines.push(`記録した部位：${[...new Set(observations)].join("、")}。`);
  if (report.consultationNote) lines.push(`聞きたいこと：${report.consultationNote}`);
  if (report.modelReference.state === "RUN") {
    const total = report.modelReference.total?.central;
    if (hasFiniteValue(total)) lines.push(`走り全体の目安：${Math.round(total * 10) / 10}ポイント`);
    lines.push(regionalText(report.modelReference.regional));
    lines.push(exposureText(report.modelReference.regional?.exposure));
  }
  lines.push("身体の記録とアプリの目安は別に扱います。走行距離は部位の数値へ掛けず、別の走行事実として扱います。");
  return lines.join("\n");
}

function createStandardConsultationText(report) {
  if (!report) return "";
  const lines = ["相談用レポート", `対象日：${report.date}`, `記録：${report.activity}`];
  if (report.courseName) lines.push(`コース：${report.courseName}`);
  if (report.personalContextItems.length) {
    lines.push("今日のシューズ・走り方：");
    report.personalContextItems.forEach((item) => lines.push(`- ${item}`));
  }
  const observationLines = bodyObservationLines(report);
  lines.push("身体の記録：");
  lines.push(...(observationLines.length ? observationLines : ["- 部位入力なし"]));
  if (report.consultationNote) lines.push(`相談したいこと：${report.consultationNote}`);
  if (report.modelReference.state === "RUN") {
    const total = report.modelReference.total?.central;
    lines.push(hasFiniteValue(total) ? `走り全体の目安：${Math.round(total * 10) / 10}ポイント` : "走り全体の目安：数値なし");
    lines.push(regionalText(report.modelReference.regional));
    lines.push(exposureText(report.modelReference.regional?.exposure));
    lines.push("部位の目安は、その部位自身の固定基準100と比較します。走行距離は数値へ掛けません。安全値・正常値・初心者平均ではなく、別の部位との大小比較にも使いません。");
    if (report.rawFacts.rpe != null) lines.push(`走り全体のきつさ（RPE）：${report.rawFacts.rpe}/10（数値表示とは分けて記載）`);
  } else if (report.modelReference.state === "REST") {
    lines.push("数値表示：休養記録のため走行の目安なし");
  } else {
    lines.push("数値表示：この保存記録では目安を表示できません");
  }
  lines.push("数値表示は走行記録を比べるための参考で、筋肉・腱・関節に加わった実際の力、診断、障害予測、原因、走行可否を示しません。");
  return lines.join("\n");
}

function createDetailedConsultationText(report) {
  const standard = createStandardConsultationText(report);
  if (!report || !report.recent.length) return standard;
  const regionLabel = report.modelReference.regional?.regionLabel || "選択した部位";
  const recent = report.recent.map((item) => {
    const total = item.total == null ? "走行全体 数値なし" : `走行全体 ${Math.round(item.total * 10) / 10}`;
    const regional = item.regionalDirectComparable && hasFiniteValue(item.regionalValue)
      ? `${regionLabel}の部位の目安 ${Math.round(item.regionalValue * 10) / 10}`
      : `${regionLabel}の部位の目安 比較なし`;
    const rpe = item.rpe == null ? "" : `／RPE ${item.rpe}`;
    return `- ${item.date}：${item.activity}／${total}／${regional}${rpe}`;
  });
  return `${standard}\n\n最近の保存記録：\n${recent.join("\n")}\n\n部位の目安の差は、同じ部位・同じ計算方法・同じ基準で比べられる記録だけで扱います。`;
}
moduleExports["buildConsultationReport"] = buildConsultationReport;
moduleExports["createShortConsultationMemo"] = createShortConsultationMemo;
moduleExports["createStandardConsultationText"] = createStandardConsultationText;
moduleExports["createDetailedConsultationText"] = createDetailedConsultationText;
internalModules.consultationReport = moduleExports;
}

// ===== ui/bodyRegionTerminology.js =====
{
const moduleExports = Object.create(null);
const BODY_REGION_TERMINOLOGY_VERSION = "body-region-terminology-v1";

const ENTRIES = Object.freeze([
  Object.freeze({ id: "BA-DISP-014", formalJa: "股関節部", familiarJa: "股関節まわり", plainMeaningJa: "股関節部の動きに関する目安", english: "Hip joint region" }),
  Object.freeze({ id: "BA-DISP-015", formalJa: "殿部", familiarJa: "お尻", plainMeaningJa: "殿部の筋肉の使われ方に関する目安", english: "Gluteal region" }),
  Object.freeze({ id: "BA-DISP-016", formalJa: "大腿前面", familiarJa: "太ももの前", plainMeaningJa: "大腿前面の筋肉の使われ方に関する目安", english: "Anterior thigh region" }),
  Object.freeze({ id: "BA-DISP-018", formalJa: "大腿後面", familiarJa: "太ももの後ろ", plainMeaningJa: "大腿後面の筋肉の使われ方に関する目安", english: "Posterior thigh region" }),
  Object.freeze({ id: "BA-DISP-019", formalJa: "膝蓋大腿関節部", familiarJa: "膝の前", plainMeaningJa: "膝蓋大腿関節部の走行条件による変化の目安", english: "Patellofemoral region" }),
  Object.freeze({ id: "BA-DISP-021", formalJa: "脛骨部", familiarJa: "すね", plainMeaningJa: "脛骨部の走行条件による変化の目安", english: "Tibial region" }),
  Object.freeze({ id: "BA-DISP-023", formalJa: "下腿後面", familiarJa: "ふくらはぎ", plainMeaningJa: "下腿後面の筋肉の使われ方に関する目安", english: "Posterior lower-leg region" }),
  Object.freeze({ id: "BA-DISP-024", formalJa: "足関節部", familiarJa: "足首まわり", plainMeaningJa: "足関節部の動きに関する目安", english: "Ankle joint region" }),
  Object.freeze({ id: "BA-DISP-025", formalJa: "アキレス腱部", familiarJa: "足首の後ろ・アキレス腱周辺", plainMeaningJa: "アキレス腱部の走行条件による変化の目安", english: "Achilles tendon region" }),
  Object.freeze({ id: "BA-DISP-027", formalJa: "後足部", familiarJa: "かかと・足裏の後ろ", plainMeaningJa: "後足部の足底圧に関する目安", english: "Rearfoot region" }),
  Object.freeze({ id: "BA-DISP-028", formalJa: "足底中部・内側縦足弓", familiarJa: "土踏まず・足裏の中央", plainMeaningJa: "足底中部・内側縦足弓の足底圧に関する目安", english: "Mid-plantar and medial longitudinal arch region" }),
  Object.freeze({ id: "BA-DISP-029", formalJa: "前足部", familiarJa: "足裏の前・母趾球周辺", plainMeaningJa: "前足部の足底圧に関する目安", english: "Forefoot region" }),
]);

const BODY_REGION_TERMINOLOGY = ENTRIES;
const BY_ID = new Map(ENTRIES.map((item) => [item.id, item]));

function bodyRegionTerminology(regionId) {
  return BY_ID.get(String(regionId || "")) || null;
}

function bodyRegionFormalName(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.formalJa || String(fallback || regionId || "");
}

function bodyRegionFamiliarName(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.familiarJa || String(fallback || "");
}

function bodyRegionPlainMeaning(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.plainMeaningJa || String(fallback || "この部位に関する目安");
}

function bodyRegionDisplayName(regionId, fallback = "", { includeFamiliar = false } = {}) {
  const item = bodyRegionTerminology(regionId);
  if (!item) return String(fallback || regionId || "");
  return includeFamiliar && item.familiarJa && item.familiarJa !== item.formalJa
    ? `${item.formalJa}（${item.familiarJa}）`
    : item.formalJa;
}
moduleExports["BODY_REGION_TERMINOLOGY_VERSION"] = BODY_REGION_TERMINOLOGY_VERSION;
moduleExports["BODY_REGION_TERMINOLOGY"] = BODY_REGION_TERMINOLOGY;
moduleExports["bodyRegionTerminology"] = bodyRegionTerminology;
moduleExports["bodyRegionFormalName"] = bodyRegionFormalName;
moduleExports["bodyRegionFamiliarName"] = bodyRegionFamiliarName;
moduleExports["bodyRegionPlainMeaning"] = bodyRegionPlainMeaning;
moduleExports["bodyRegionDisplayName"] = bodyRegionDisplayName;
internalModules.bodyRegionTerminology = moduleExports;
}

// ===== core/consultation/deterministicConsultation.js =====
{
const moduleExports = Object.create(null);
const { PRIMARY_REGIONAL_V2_REGION_DEFS } = internalModules.primaryRegionalRegionDefinitions;
const { bodyRegionFormalName } = internalModules.bodyRegionTerminology;
const { summarizePersonalContext } = internalModules.personalContext;
const { PRIMARY_REGIONAL_V2_MODEL_VERSION, buildPrimaryRegionalV2ComparisonSignature, comparePrimaryRegionalV2Signatures } = internalModules.primaryRegionalResultService;

const REGIONS = Object.freeze(PRIMARY_REGIONAL_V2_REGION_DEFS.map((region) => Object.freeze({ id: region.displayId, name: region.name })));

const DETERMINISTIC_CONSULTATION_VERSION = "deterministic-consultation-v1";

const CONSULTATION_PURPOSES = Object.freeze([
  Object.freeze({
    id: "body_observation",
    label: "身体の記録を伝える",
    description: "身体の記録を整理します。",
  }),
  Object.freeze({
    id: "run_conditions",
    label: "今回の走りを振り返る",
    description: "走行事実と、身体の使われ方を考えるときに一緒に見たい条件を整理します。",
  }),
  Object.freeze({
    id: "previous_comparison",
    label: "前の記録と比べる",
    description: "同じ部位・同じ基準など、同じ意味で比べられる過去記録がある場合だけ差を表示します。",
  }),
  Object.freeze({
    id: "next_check",
    label: "次回に確認したいことを相談する",
    description: "運動可否や練習内容を決めず、次回に記録・比較したい条件を質問文へ整理します。",
  }),
]);

const PURPOSE_IDS = new Set(CONSULTATION_PURPOSES.map((item) => item.id));
const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const ALLOWED_DATA_SELECTION = new Set(["current-result", "body-record", "course", "personal-note"]);

const DEFAULT_DATA_BY_PURPOSE = Object.freeze({
  body_observation: Object.freeze(["body-record", "course", "personal-note"]),
  run_conditions: Object.freeze(["current-result", "course", "personal-note"]),
  previous_comparison: Object.freeze(["current-result", "course", "personal-note"]),
  next_check: Object.freeze(["current-result", "body-record", "course", "personal-note"]),
});

const SAFETY_FLAG_LABELS = Object.freeze({
  severePain: "強い痛み",
  significantSwelling: "はっきりした腫れ",
  cannotBearWeight: "体重をかけにくい",
  movementDifficulty: "動かしにくい",
  numbnessOrWeakness: "しびれ・力の入りにくさ",
  coldPaleBlueLimb: "手足が冷たい・白い・青い",
  deformityOrMajorTrauma: "変形または大きな外傷",
  painAtRestOrNight: "安静時または夜間の痛み",
  chestPainOrPressure: "胸の痛み・圧迫感",
  breathingDifficulty: "呼吸のしにくさ",
  faintingOrConfusion: "失神・意識の混乱",
  heavyBleeding: "多量の出血",
});

const LATERALITY_LABELS = Object.freeze({
  LEFT: "左",
  RIGHT: "右",
  BILATERAL: "両側",
  MIDLINE: "中央",
  UNKNOWN: "左右不明",
});

const DEFAULT_QUESTION_BY_PURPOSE = Object.freeze({
  body_observation: "今回の身体の記録について、気をつけて見ておく点はありますか？",
  run_conditions: "今回の走りを振り返るとき、次の比較でも揃えて記録する条件を確認したいです。",
  previous_comparison: "前回との違いがあります。何を一緒に確認するとよいですか？",
  next_check: "次回までに記録しておくとよいことはありますか？",
});

function finite(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function normalizePurpose(value = "", supportRoute = "normal") {
  const requested = String(value || "");
  if (PURPOSE_IDS.has(requested)) return requested;
  return ["consult", "urgent"].includes(String(supportRoute || ""))
    ? "body_observation"
    : "run_conditions";
}

function firstObservedRegionId(feedback = {}) {
  const exact = Array.isArray(feedback.bodyAreaObservations) ? feedback.bodyAreaObservations : [];
  return exact.map((item) => String(item?.modelRegionId || "")).find((id) => REGION_BY_ID.has(id)) || "";
}

function normalizeRegionId(value = "", experience = {}) {
  const requested = String(value || "");
  if (REGION_BY_ID.has(requested)) return requested;
  const observed = firstObservedRegionId(experience.feedback || {});
  return observed || REGIONS[0]?.id || "BA-DISP-014";
}

function normalizeDataSelection(value, purpose) {
  const requested = Array.isArray(value)
    ? unique(value).filter((item) => ALLOWED_DATA_SELECTION.has(item))
    : [];
  return Object.freeze(requested.length ? requested : [...(DEFAULT_DATA_BY_PURPOSE[purpose] || [])]);
}

function runningFormatLabel(value = "") {
  return {
    CONTINUOUS_RUN: "途中で歩かず走った",
    RUN_WALK: "走りと歩きを混ぜた",
  }[String(value || "")] || "";
}

function resultStateLabel(value = "") {
  return {
    CALCULATED: "表示あり",
    PARTIAL: "一部の条件で表示",
    NOT_CALCULABLE: "表示なし",
    OUT_OF_SUPPORTED_RANGE: "確認できる範囲外",
    NOT_APPLICABLE: "対象外",
  }[String(value || "")] || "表示状態を確認できません";
}

function comparisonReason(value = "") {
  return {
    COMPARABLE: "前の記録があります",
    NO_COMPARABLE_CONDITION_RECORD: "同じ条件で比べられる過去記録はありません",
    NO_PREVIOUS_CONDITION_RECORD: "前の記録はありません",
    CURRENT_CONDITION_UNAVAILABLE: "今回の目安は表示できません",
  }[String(value || "")] || "比較できる記録を確認できません";
}

function displayNumber(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  const rounded = Number(number.toFixed(digits));
  return String(rounded);
}

function courseSummary(record = {}) {
  if (record.activityType === "rest") return "休養記録";
  const parts = [];
  if (finite(record.distanceKm)) parts.push(`${displayNumber(record.distanceKm, 2)}km`);
  if (finite(record.durationMinutes)) parts.push(`${displayNumber(record.durationMinutes, 1)}分`);
  if (finite(record.steps) && Number(record.steps) > 0) parts.push(`${Math.round(Number(record.steps))}歩`);
  const runningFormat = runningFormatLabel(record.runningFormat);
  if (runningFormat) parts.push(runningFormat);
  if (record.course?.name) parts.push(String(record.course.name));
  else if (record.course?.modelSurfaceClass) parts.push("路面条件の入力あり");
  if (record.course?.gradeKnowledge === "KNOWN_FLAT") parts.push("平坦と把握");
  if (record.course?.gradeKnowledge === "KNOWN_PROFILE") {
    if (Number(record.course.upPercent || 0) > 0) parts.push(`上り区間 ${displayNumber(record.course.upPercent, 1)}%`);
    if (Number(record.course.downPercent || 0) > 0) parts.push(`下り区間 ${displayNumber(record.course.downPercent, 1)}%`);
  }
  if (record.course?.gradeKnowledge === "UNKNOWN") parts.push("勾配不明");
  return parts.join("・") || "走行条件の入力あり";
}

function bodyObservationItems(feedback = {}) {
  const exact = (Array.isArray(feedback.bodyAreaObservations) ? feedback.bodyAreaObservations : [])
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const details = [];
      if (item.laterality) details.push(LATERALITY_LABELS[String(item.laterality)] || String(item.laterality));
      if (finite(item.intensity)) details.push(`程度 ${Number(item.intensity)}/5`);
      if (item.sensation) details.push(String(item.sensation));
      return `${item.label || "詳細部位"}${details.length ? `：${details.join("・")}` : ""}`;
    });
  const summaryNames = new Set([
    ...Object.keys(feedback.fatigueByBodyPart || {}),
    ...Object.keys(feedback.discomfortByBodyPart || {}),
    ...Object.keys(feedback.reviewedBodyParts || {}),
  ]);
  const summary = [...summaryNames].filter((name) => (
    Number(feedback.fatigueByBodyPart?.[name] || 0) > 0
    || Number(feedback.discomfortByBodyPart?.[name] || 0) > 0
    || feedback.reviewedBodyParts?.[name] === true
  )).map((name) => {
    const details = [];
    const fatigue = Number(feedback.fatigueByBodyPart?.[name] || 0);
    const discomfort = Number(feedback.discomfortByBodyPart?.[name] || 0);
    if (fatigue > 0) details.push(`疲れ・だるさ ${fatigue}/5`);
    if (discomfort > 0) details.push(`気になる感じ ${discomfort}/5`);
    return `${name}${details.length ? `：${details.join("・")}` : "：確認済み"}`;
  });
  return Object.freeze(unique([...exact, ...summary]));
}

function activeSafetyFlags(feedback = {}) {
  return Object.entries(feedback.safetyFlags || {})
    .filter(([, active]) => active === true)
    .map(([key]) => SAFETY_FLAG_LABELS[key] || key);
}

function primaryExposureDistanceKm(experience = {}) {
  const input = experience?.regionalV2ResultRecord?.engine_input_snapshot || {};
  const runWalk = String(input.runningFormat || experience?.record?.runningFormat || "").toUpperCase() === "RUN_WALK";
  const value = Number(runWalk ? input.runningDistanceKm : input.distanceKm);
  if (value > 0) return value;
  const record = experience?.record || {};
  const fallback = Number(runWalk ? record.runWalkRunningDistanceKm : record.distanceKm);
  return fallback > 0 ? fallback : null;
}

function primaryPreviousComparable(experience, allExperiences, regionId, currentRow) {
  if (!finite(currentRow?.value)) return Object.freeze({ status: "CURRENT_CONDITION_UNAVAILABLE" });
  const currentSignature = buildPrimaryRegionalV2ComparisonSignature(experience?.regionalV2ResultRecord, currentRow);
  if (!currentSignature) return Object.freeze({ status: "CURRENT_CONDITION_UNAVAILABLE" });
  const currentDate = String(experience?.record?.date || "");
  const currentCreatedAt = String(experience?.record?.createdAt || "");
  const earlier = (allExperiences || []).filter((item) => item?.record?.id && item.record.id !== experience?.record?.id).filter((item) => {
    const date = String(item.record.date || "");
    if (date < currentDate) return true;
    return date === currentDate && String(item.record.createdAt || "") < currentCreatedAt;
  }).sort((a,b)=>String(a.record.date||"").localeCompare(String(b.record.date||"")) || String(a.record.createdAt||"").localeCompare(String(b.record.createdAt||"")));
  let sawRegion = false;
  for (const prior of earlier.reverse()) {
    const priorRecord = prior?.regionalV2ResultRecord;
    const priorRow = prior?.regionalV2Result?.regions?.find((row) => row.regionId === regionId) || null;
    if (!priorRow || !finite(priorRow.value)) continue;
    sawRegion = true;
    if (priorRecord?.model_version !== PRIMARY_REGIONAL_V2_MODEL_VERSION) continue;
    const priorSignature = buildPrimaryRegionalV2ComparisonSignature(priorRecord, priorRow);
    const compatibility = comparePrimaryRegionalV2Signatures(currentSignature, priorSignature);
    if (!compatibility.directDeltaAllowed) continue;
    return Object.freeze({
      status: "COMPARABLE",
      previous: Object.freeze({
        recordId: prior.record.id,
        date: prior.record.date,
        displayConditionIndex: Number(priorRow.value),
        referenceValue: 100,
      }),
      pointDelta: Number(currentRow.value) - Number(priorRow.value),
      compatibility,
    });
  }
  return Object.freeze({ status: sawRegion ? "NO_COMPARABLE_CONDITION_RECORD" : "NO_PREVIOUS_CONDITION_RECORD" });
}

function regionalContext(experience, allExperiences, regionId) {
  const resultRecord = experience?.regionalV2ResultRecord || null;
  const row = resultRecord?.result?.regions?.find((item) => item.regionId === regionId) || null;
  const region = REGION_BY_ID.get(regionId);
  if (experience?.record?.activityType === "rest") {
    return Object.freeze({
      state: "REST", regionId, regionLabel: bodyRegionFormalName(regionId, region?.name || "選択した部位"),
      row: null, displayIndex: null, displayDeltaPoints: null, referenceValue: null, referenceDistanceKm: null,
      endpoint: null, exposure: null, contributors: Object.freeze([]), previousComparable: null, isPrimaryRegionalV2: true,
    });
  }
  if (resultRecord?.model_version !== PRIMARY_REGIONAL_V2_MODEL_VERSION || !row) {
    return Object.freeze({
      state: "UNAVAILABLE", regionId, regionLabel: bodyRegionFormalName(regionId, region?.name || "選択した部位"),
      row: null, displayIndex: null, displayDeltaPoints: null, referenceValue: null, referenceDistanceKm: null,
      endpoint: null, exposure: null, contributors: Object.freeze([]), previousComparable: null, isPrimaryRegionalV2: true,
    });
  }
  const distanceKm = primaryExposureDistanceKm(experience);
  const displayIndex = finite(row.value) ? Number(row.value) : null;
  const referenceValue = 100;
  const displayDeltaPoints = displayIndex !== null ? displayIndex - 100 : null;
  return Object.freeze({
    state: row.calculationState || (displayIndex === null ? "UNAVAILABLE" : "CALCULATED"),
    regionId,
    regionLabel: row.regionName || region?.name || "選択した部位",
    row, displayIndex, displayDeltaPoints, referenceValue, referenceDistanceKm: distanceKm,
    endpoint: Object.freeze({ label: "部位の目安" }),
    exposure: resultRecord?.result?.exposure || null,
    contributors: Object.freeze([]),
    axisEstimates: Object.freeze(Array.isArray(row.axisEstimates) ? row.axisEstimates : []),
    evidenceState: row.evidenceState || row.provenance || "EVIDENCE_INSUFFICIENT",
    combinedConditionState: resultRecord?.result?.combinedConditionState || null,
    previousComparable: primaryPreviousComparable(experience, allExperiences, regionId, row),
    isPrimaryRegionalV2: true,
  });
}

function sourceUseSummary({ purpose, dataSelection, bodyItems, regional, profileItems, question, audience }) {
  const selected = new Set(dataSelection);
  return Object.freeze([
    Object.freeze({ id: "question", label: "相談したい内容", used: Boolean(question), reason: question ? "入力した確認内容" : "確認内容は未入力" }),
    Object.freeze({ id: "audience", label: "相談相手", used: Boolean(audience), reason: audience ? "入力した相談相手" : "相談相手は未入力" }),
    Object.freeze({ id: "body", label: "身体の記録", used: selected.has("body-record") && bodyItems.length > 0, reason: selected.has("body-record") ? (bodyItems.length ? "自分で記録した内容" : "身体記録は未入力") : "共有対象から外しています" }),
    Object.freeze({ id: "course", label: "走行事実・コース", used: selected.has("course"), reason: selected.has("course") ? "今回の保存記録" : "共有対象から外しています" }),
    Object.freeze({ id: "a4", label: "選択した部位の目安", used: selected.has("current-result") && regional.displayIndex !== null, reason: selected.has("current-result") ? (regional.displayIndex !== null ? "今回の部位の目安" : "この記録では数値を表示できません") : "共有対象から外しています" }),
    Object.freeze({ id: "history", label: "前の記録", used: purpose === "previous_comparison" && selected.has("current-result") && regional.previousComparable?.status === "COMPARABLE", reason: purpose === "previous_comparison" ? (selected.has("current-result") ? comparisonReason(regional.previousComparable?.status) : "共有対象から外しています") : "今回の目的には含めません" }),
    Object.freeze({ id: "profile", label: "シューズ・走り方の記録", used: selected.has("personal-note") && profileItems.length > 0, reason: selected.has("personal-note") ? (profileItems.length ? "自分で記録した内容" : "入力はありません") : "共有対象から外しています" }),
  ]);
}

function appendSection(lines, heading, items) {
  const values = (items || []).filter(Boolean);
  if (!values.length) return;
  lines.push(heading);
  values.forEach((item) => lines.push(`- ${item}`));
}

function regionalCurrentLine(regional) {
  if (regional.displayIndex === null) return `${regional.regionLabel}：${regional.isPrimaryRegionalV2 ? "部位の目安" : "部位の目安"}の数値なし`;
  if (regional.isPrimaryRegionalV2) {
    const ref = finite(regional.referenceValue) ? Number(regional.referenceValue) : null;
    const delta = finite(regional.displayDeltaPoints) ? Number(regional.displayDeltaPoints) : null;
    return `${regional.regionLabel}：部位の目安 ${displayNumber(regional.displayIndex, 1)}（基準100${delta === null ? "" : `、差 ${delta >= 0 ? "+" : ""}${displayNumber(delta, 1)}`}）`;
  }
  const delta = regional.displayDeltaPoints == null
    ? ""
    : regional.displayDeltaPoints === 0
      ? "（基準100と同じ）"
      : `（基準100から${regional.displayDeltaPoints > 0 ? "+" : ""}${regional.displayDeltaPoints}ポイント）`;
  return `${regional.regionLabel}：${displayNumber(regional.displayIndex, 1)}${delta}`;
}

function comparisonLines(regional) {
  const comparison = regional.previousComparable;
  if (!comparison) return ["比較情報を作成できませんでした。"]; 
  if (comparison.status === "COMPARABLE") {
    if (regional.isPrimaryRegionalV2) {
      const delta = Number(comparison.pointDelta || 0);
      return [
        `今回：${regionalCurrentLine(regional)}`,
        `前の記録：${comparison.previous.date}／部位の目安 ${displayNumber(comparison.previous.displayConditionIndex, 1)}`,
        `同じ計算方法で比べた差：${delta >= 0 ? "+" : ""}${displayNumber(delta, 1)}ポイント（計算に使った距離は各記録の値に含まれます）`,
      ];
    }
    const sign = comparison.percentChangeRounded > 0 ? "+" : "";
    return [
      `今回：${regionalCurrentLine(regional)}`,
      `前の記録：${comparison.previous.date}／部位の目安 ${displayNumber(comparison.previous.displayConditionIndex, 1)}`,
      `同じ意味で比べた変化：${sign}${comparison.percentChangeRounded}%`,
    ];
  }
  if (comparison.status === "NO_COMPARABLE_CONDITION_RECORD") {
    return ["過去記録はありますが、同じ部位・同じ目安・同じ基準で比べられる記録がないため差を表示しません。"];
  }
  if (comparison.status === "NO_PREVIOUS_CONDITION_RECORD") return ["前の部位の目安記録がないため、自分の過去記録との比較はまだ表示しません。"];
  return ["今回の部位の目安を数値化できないため、自分の過去記録との比較は表示しません。"];
}

function buildMemo({ purpose, record, feedback, audience, question, dataSelection, bodyItems, profileItems, regional }) {
  const selected = new Set(dataSelection);
  const lines = ["相談したいこと：", question];
  if (audience) lines.push(`相談相手：${audience}`);
  lines.push(`記録日：${record.date || "日付未設定"}`);

  if (selected.has("course")) appendSection(lines, "今回の走り：", [courseSummary(record)]);
  if (selected.has("personal-note")) appendSection(lines, "シューズ・走り方のメモ：", profileItems);
  if (selected.has("body-record")) {
    appendSection(lines, "身体の記録：", bodyItems.length ? bodyItems : ["身体の記録なし"]);
    const flags = activeSafetyFlags(feedback);
    if (flags.length) appendSection(lines, "体調の記録：", flags);
  }

  if (selected.has("current-result") && regional.displayIndex !== null) {
    if (regional.isPrimaryRegionalV2) {
      const conditionBoundary = regional.combinedConditionState === "AXES_PRESERVED_NOT_COMBINED"
        ? "複数の条件を同時に計算できない場合は、別々に計算した値を無理に掛け合わせていません。"
        : "計算できる条件だけを使い、扱えない条件は0として加えません。";
      appendSection(lines, "アプリに表示された目安：", [
        regionalCurrentLine(regional),
        "この値の見方：100はこの部位自身のReference-100基準です。走行距離そのものは数値へ掛けず、別の走行事実として扱います。",
        conditionBoundary,
        "100は安全値・正常値・初心者平均ではなく、数値は身体を直接測った値でもありません。",
      ]);
    } else {
      appendSection(lines, "アプリに表示された目安：", [
        regionalCurrentLine(regional),
        "この値の見方：今回の条件から計算できる目安を、この部位自身の基準100と比べます。",
        "走行量はこの部位の目安へ足さず、別の情報として扱います。",
        "100は安全値・正常値・初心者平均ではなく、数値は身体を直接測った値でもありません。",
      ]);
    }
  }

  if (purpose === "run_conditions" && selected.has("current-result")) {
    appendSection(lines, "今回の記録と一緒に確認したい条件：", [
      "坂道、ペース、歩数、路面などを一緒に振り返れます。",
      "目安だけで原因は決めず、走った内容と自分の感じ方を分けて振り返ります。",
    ]);
  }
  if (purpose === "previous_comparison" && selected.has("current-result")) appendSection(lines, "前回との比較：", comparisonLines(regional));
  if (purpose === "previous_comparison" && !selected.has("current-result")) appendSection(lines, "前回との比較：", ["共有する内容に数値結果を含めていないため、目安を記載しません。"]);
  if (purpose === "next_check") {
    const reflection = record.reflectionContext || {};
    appendSection(lines, "次回に残しておきたいメモ：", [
      reflection.nextCheckPoint ? `次回確認したいこと：${reflection.nextCheckPoint}` : "次回確認したいことは未入力",
      reflection.reflectionKeyPoint ? `今回の主な気づき：${reflection.reflectionKeyPoint}` : "",
    ]);
  }

  const boundaryLines = [
    "身体の記録、走った内容、アプリの目安は別の情報です。",
    "このメモは診断や安全の判定をするものではありません。",
  ];
  const boundaryText = boundaryLines.join("\n");
  const bodyText = lines.join("\n");
  const separator = "\n";
  const bodyLimit = Math.max(0, 1200 - boundaryText.length - separator.length);
  const boundedBody = bodyText.length > bodyLimit
    ? `${bodyText.slice(0, Math.max(0, bodyLimit - 12)).trimEnd()}\n（本文を省略）`
    : bodyText;
  return `${boundedBody}${separator}${boundaryText}`.slice(0, 1200);
}

function buildDeterministicConsultation({
  experience,
  allExperiences = [],
  purpose = "",
  regionId = "",
} = {}) {
  if (!experience?.record) return null;
  const supportRoute = experience.supportDecision?.route || "normal";
  const normalizedPurpose = normalizePurpose(purpose, supportRoute);
  const normalizedRegionId = normalizeRegionId(regionId, experience);
  const consultationContext = experience.record.consultationContext || {};
  const dataSelection = normalizeDataSelection(consultationContext.consultationDataSelection, normalizedPurpose);
  const audience = String(consultationContext.consultationTarget || "").trim();
  const question = String(
    consultationContext.consultationQuestion
    || experience.feedback?.consultationNote
    || DEFAULT_QUESTION_BY_PURPOSE[normalizedPurpose]
    || "",
  ).trim();
  const profile = summarizePersonalContext(experience.record.personalContext || {});
  const profileItems = profile.hasInput ? profile.items : [];
  const bodyItems = bodyObservationItems(experience.feedback || {});
  const regional = regionalContext(experience, allExperiences, normalizedRegionId);
  const sources = sourceUseSummary({
    purpose: normalizedPurpose,
    dataSelection,
    bodyItems,
    regional,
    profileItems,
    question,
    audience,
  });
  const memo = buildMemo({
    purpose: normalizedPurpose,
    record: experience.record,
    feedback: experience.feedback || {},
    audience,
    question,
    dataSelection,
    bodyItems,
    profileItems,
    regional,
  });
  return Object.freeze({
    version: DETERMINISTIC_CONSULTATION_VERSION,
    purpose: normalizedPurpose,
    purposeDefinition: CONSULTATION_PURPOSES.find((item) => item.id === normalizedPurpose),
    regionId: normalizedRegionId,
    regionOptions: Object.freeze(REGIONS.map((region) => Object.freeze({ id: region.id, label: bodyRegionFormalName(region.id, region.name) }))),
    supportRoute,
    audience,
    question,
    dataSelection,
    bodyItems,
    profileItems: Object.freeze(profileItems),
    regional,
    sources,
    memo,
    boundaries: Object.freeze({
      deterministicRulesOnly: true,
      modelChangesA4: false,
      usesBodyPartRanking: false,
      diagnosis: false,
      injuryPrediction: false,
      causation: false,
      runPermission: false,
      trainingPrescription: false,
      safetyGuarantee: false,
    }),
  });
}
moduleExports["DETERMINISTIC_CONSULTATION_VERSION"] = DETERMINISTIC_CONSULTATION_VERSION;
moduleExports["CONSULTATION_PURPOSES"] = CONSULTATION_PURPOSES;
moduleExports["buildDeterministicConsultation"] = buildDeterministicConsultation;
internalModules.deterministicConsultation = moduleExports;
}

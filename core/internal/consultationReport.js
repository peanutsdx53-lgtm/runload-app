import "./readingService.js";
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

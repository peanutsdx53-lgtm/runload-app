import "./bodyRegionTerminology.js";
import { internalModules } from "./modules.js";

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

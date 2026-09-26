import { normalizePlanFactSession } from "../core/appCore.js";
import { formatNumber } from "./recordPresentation.js";

const CONDITION_DEFINITIONS = Object.freeze([
  Object.freeze({ key: "distance", label: "距離" }),
  Object.freeze({ key: "duration", label: "実走予定時間" }),
  Object.freeze({ key: "runningFormat", label: "走り方" }),
  Object.freeze({ key: "courseName", label: "コース名" }),
  Object.freeze({ key: "grade", label: "坂道" }),
  Object.freeze({ key: "surface", label: "路面" }),
]);

function runningFormatLabel(value) {
  return {
    CONTINUOUS_RUN: "途中で歩かず走る予定",
    RUN_WALK: "走りと歩きを混ぜる予定",
    UNKNOWN: "未設定",
  }[value] || "未設定";
}

function gradeLabel(course = {}) {
  if (course.gradeKnowledge === "KNOWN_FLAT") return "平坦と把握";
  if (course.gradeKnowledge !== "KNOWN_PROFILE") return "不明";
  const values = [];
  if (Number(course.upPercent || 0) > 0) {
    values.push(`上り${formatNumber(course.upPercent, 1)}%区間・坂の傾き${formatNumber(course.upGradePercent, 1)}%`);
  }
  if (Number(course.downPercent || 0) > 0) {
    values.push(`下り${formatNumber(course.downPercent, 1)}%区間・坂の傾き${formatNumber(course.downGradePercent, 1)}%`);
  }
  const flat = 100 - Number(course.upPercent || 0) - Number(course.downPercent || 0);
  if (flat > 0) values.unshift(`平坦${formatNumber(flat, 1)}%区間`);
  return values.join("・") || "把握済みプロファイル";
}

function surfaceLabel(value) {
  return {
    REF_HARD_EVEN_STABLE: "硬く平らで安定した基準路面",
    DRY_STABLE_GRASS_TURF: "乾いた安定した天然芝・人工芝",
    DEEP_DRY_SOFT_SAND: "深く乾いた柔らかい砂",
    EXPLICIT_UNEVEN: "明確な凹凸・不整地（説明のみ）",
    KNOWN_OTHER: "把握済み・記録のみ",
    UNKNOWN: "不明",
  }[value] || "不明";
}

function conditionValues(session = {}) {
  const normalized = normalizePlanFactSession(session);
  if (normalized.activityType === "rest") {
    return Object.freeze({
      distance: "—",
      duration: "—",
      runningFormat: "—",
      courseName: "休養",
      grade: "—",
      surface: "—",
    });
  }
  return Object.freeze({
    distance: normalized.distanceKm > 0 ? `${formatNumber(normalized.distanceKm, 2)} km` : "未入力",
    duration: normalized.durationMinutes > 0 ? `${formatNumber(normalized.durationMinutes, 1)} 分` : "未入力",
    runningFormat: runningFormatLabel(normalized.runningFormat),
    courseName: normalized.course.name || "未設定",
    grade: gradeLabel(normalized.course),
    surface: surfaceLabel(normalized.course.modelSurfaceClass),
  });
}

function rawConditionValues(session = {}) {
  const normalized = normalizePlanFactSession(session);
  if (normalized.activityType === "rest") {
    return Object.freeze(Object.fromEntries(CONDITION_DEFINITIONS.map(({ key }) => [key, "rest"])));
  }
  return Object.freeze({
    distance: normalized.distanceKm,
    duration: normalized.durationMinutes,
    runningFormat: normalized.runningFormat,
    courseName: normalized.course.name,
    grade: [
      normalized.course.gradeKnowledge,
      normalized.course.upPercent,
      normalized.course.upGradePercent,
      normalized.course.downPercent,
      normalized.course.downGradePercent,
    ].join(":"),
    surface: normalized.course.modelSurfaceClass,
  });
}

function equalValue(left, right) {
  if (typeof left === "number" || typeof right === "number") {
    return Math.abs(Number(left || 0) - Number(right || 0)) < 1e-9;
  }
  return String(left ?? "") === String(right ?? "");
}

export function normalizePlanSession(session = {}) {
  return normalizePlanFactSession(session);
}

) {
  return normalizePlanFactSession(session);
}

) {
  const normalized = normalizePlanFactSession(session);
  if (normalized.activityType === "rest") return "休養予定は、休養という予定事実だけを保存します。";
  return "予定で入力した距離・時間・走り方・コース条件を事実として確認します。分からない内容は、分からないまま残します。";
}


, changedCount = 0, hasReference = false) {
  if (preview?.state === "REST") return "休養予定として保存します";
  if (!preview?.ok) return "入力条件を確認";
  if (!hasReference) return "入力した予定条件を確認";
  if (Number(changedCount || 0) === 0) return "基準記録と同じ入力条件";
  return `基準記録から変更 ${Number(changedCount || 0)}項目`;
}

export function buildPlanConditionSnapshot(session = {}, { referenceSession = null } = {}) {
  const normalized = normalizePlanFactSession(session);
  const displayValues = conditionValues(normalized);
  const rawValues = rawConditionValues(normalized);
  const referenceDisplay = referenceSession ? conditionValues(referenceSession) : null;
  const referenceRaw = referenceSession ? rawConditionValues(referenceSession) : null;
  const rows = CONDITION_DEFINITIONS.map(({ key, label }) => Object.freeze({
    key,
    label,
    value: displayValues[key],
    referenceValue: referenceDisplay?.[key] ?? "基準なし",
    comparison: referenceRaw ? equalValue(rawValues[key], referenceRaw[key]) ? "same" : "changed" : "unavailable",
  }));
  return Object.freeze({
    activityType: normalized.activityType,
    rows: Object.freeze(rows),
    changedCount: rows.filter((row) => row.comparison === "changed").length,
  });
}

) {
  return JSON.stringify({ hasReference: Boolean(reference.hasReference), session: reference.session || null });
}


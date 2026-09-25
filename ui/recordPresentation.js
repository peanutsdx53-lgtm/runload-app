import { SURFACE_FIELDS } from "../core/appCore.js";


export const SUBJECTIVE_STATUS_LABELS = Object.freeze({
  not_asked: "まだ確認していない",
  deferred: "未確認",
  none_reported: "身体記録なし",
  discomfort_reported: "気になる部位を記録",
  strong_reported: "相談したい内容を記録",
});


export const SAFETY_FLAG_LABELS = Object.freeze({
  severePain: "強い痛み",
  significantSwelling: "目立つ腫れ",
  cannotBearWeight: "体重をかけられない",
  movementDifficulty: "動かしにくい・歩きにくい",
  numbnessOrWeakness: "しびれ・力が入りにくい",
  coldPaleBlueLimb: "手足が冷たい・白い・青い",
  deformityOrMajorTrauma: "変形または大きな外傷",
  painAtRestOrNight: "安静時または夜間の痛み",
  chestPainOrPressure: "胸の痛み・圧迫感",
  breathingDifficulty: "強い息苦しさ",
  faintingOrConfusion: "失神・意識の混乱",
  heavyBleeding: "大量の出血",
});

export function formatLocalDate(dateText = "") {
  const match = String(dateText).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateText || "日付なし";
  return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
}

export function formatLocalTime(timestamp = "") {
  if (!timestamp) return "";
  const date = new Date(String(timestamp));
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatNumber(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toLocaleString("ja-JP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function formatActivitySummary(record = {}) {
  if (record.activityType === "rest") return "休養を記録";
  const items = [];
  if (Number(record.distanceKm) > 0) items.push(`${formatNumber(record.distanceKm, 2)}km`);
  if (Number(record.durationMinutes) > 0) items.push(`${formatNumber(record.durationMinutes, 0)}分`);
  if (Number(record.steps) > 0) items.push(`${formatNumber(record.steps, 0)}歩`);
  return items.length ? items.join("・") : "走行を記録";
}

) {
  return SURFACE_FIELDS
    .map(({ recordKey, label }) => ({ label, value: Number(record.course?.[recordKey] || 0) }))
    .filter((item) => item.value > 0)
    .map((item) => `${item.label} ${formatNumber(item.value, 0)}%`);
}


) {
  return Array.isArray(feedback?.bodyAreaObservations)
    ? feedback.bodyAreaObservations.filter((item) => item && item.areaId)
    : [];
}

export { SURFACE_FIELDS };

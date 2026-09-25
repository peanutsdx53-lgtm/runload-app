import { SURFACE_FIELDS } from "../core/appCore.js";

export function primarySurfaceSummary(course = {}) {
  const nonZero = SURFACE_FIELDS
    .map(({ recordKey, label }) => ({ label, value: Number(course?.[recordKey] || 0) }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value);
  if (!nonZero.length) return "路面割合は未記録";
  return nonZero.slice(0, 3).map((item) => `${item.label}${item.value}%`).join("・");
}

export function slopeSummary(course = {}) {
  const knowledge = String(course.gradeKnowledge || "UNKNOWN");
  if (knowledge === "UNKNOWN") return "坂の傾き不明";
  if (knowledge === "KNOWN_FLAT") return "平坦と記録";
  const uphill = Number(course.upPercent || 0) > 0
    ? `上り ${Number(course.upPercent || 0)}%・坂の傾き${Number(course.upGradePercent || 0)}%`
    : "上りなし";
  const downhill = Number(course.downPercent || 0) > 0
    ? `下り ${Number(course.downPercent || 0)}%・坂の傾き${Number(course.downGradePercent || 0)}%`
    : "下りなし";
  return `${uphill} ／ ${downhill}`;
}

export function surfaceInputSummary(course = {}) {
  const mode = String(course.surfaceInputMode || "").toUpperCase();
  if (mode === "MIXED") return "複数路面の割合";
  if (mode === "SINGLE") return "主な路面1種類";
  return SURFACE_FIELDS.some(({ recordKey }) => Number(course?.[recordKey] || 0) > 0) ? "路面材質を記録" : "路面は未入力";
}

export function courseSummaryText(course = {}) {
  const name = String(course.name || "コース名なし");
  return `${name}。${primarySurfaceSummary(course)}。${slopeSummary(course)}。${surfaceInputSummary(course)}。`;
}

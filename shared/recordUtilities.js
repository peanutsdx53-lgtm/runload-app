import { isPresentFiniteNumber } from "./valueUtilities.js";

/** Canonical persisted record identity used by interpretation and history. */
export function stableRecordKey(record = {}) {
  return `${String(record.date || "")}|${String(record.createdAt || "")}|${String(record.id || "")}`;
}

// Canonical comparison of record fields; callers must not infer chronology
// from a concatenated key because locale collation of separators can differ.
export function compareRecordChronology(left = {}, right = {}) {
  return String(left?.date || "").localeCompare(String(right?.date || ""))
    || String(left?.createdAt || "").localeCompare(String(right?.createdAt || ""))
    || String(left?.id || "").localeCompare(String(right?.id || ""));
}

export function compareExperienceRecordChronology(left, right) {
  return compareRecordChronology(left?.record, right?.record);
}

// Stable keys are persisted as date|createdAt|id. Compare each field by the
// same chronology rule used by consultation and interpretation, not by the
// locale-dependent collation of the serialized aggregate string.
export function compareStableRecordKeys(leftKey, rightKey) {
  const unpack = (value) => {
    const parts = String(value || "").split("|");
    return { record: { date: parts[0] || "", createdAt: parts[1] || "", id: parts.slice(2).join("|") } };
  };
  return compareExperienceRecordChronology(unpack(leftKey), unpack(rightKey));
}

// A single course identity contract for mobile home and same-course insights.
export function recordCourseKey(record = {}) {
  const course = record.course || {};
  const id = String(course.id || course.courseId || "").trim();
  if (id) return `id:${id}`;
  const name = String(course.name || "").trim();
  if (!name || name === "未設定" || name === "コース名なし") return "";
  return `name:${name.toLocaleLowerCase("ja-JP")}`;
}

// A single Reference-100 presentation/signature contract shared by result and
// region detail screens. Both screens retain their existing public exports.
export function fmt(value, digits = 1) { return isPresentFiniteNumber(value) ? Number(value).toFixed(digits).replace(/\.0$/, "") : "—"; }
export function signed(value, digits = 1) { if (!isPresentFiniteNumber(value)) return "—"; const n = Number(value); return `${n > 0 ? "+" : ""}${fmt(n, digits)}`; }
export function signatureFor(record = {}, regionId = "") { return record?.comparison_signatures?.[regionId] || null; }
export function signaturesComparable(a, b) { return Boolean(a && b && a.modelVersion === b.modelVersion && a.outputSemanticVersion === b.outputSemanticVersion && a.regionId === b.regionId && a.constructId === b.constructId && a.referenceId === b.referenceId); }

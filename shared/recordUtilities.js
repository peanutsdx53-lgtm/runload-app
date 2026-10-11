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

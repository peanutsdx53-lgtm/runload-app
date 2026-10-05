export function compareExperienceRecordChronology(left, right) {
  return String(left?.record?.date || "").localeCompare(String(right?.record?.date || ""))
    || String(left?.record?.createdAt || "").localeCompare(String(right?.record?.createdAt || ""))
    || String(left?.record?.id || "").localeCompare(String(right?.record?.id || ""));
}

export function recordedNextCheckText(source, { includeFeedback = false } = {}) {
  const record = source?.record || source || {};
  const reflection = record?.reflectionContext || {};
  const feedback = source?.record ? (source?.feedback || {}) : {};
  return String(
    reflection.nextCheckPoint
      || reflection.nextCheck
      || (includeFeedback ? feedback.nextCheckPoint : "")
      || "",
  ).trim();
}

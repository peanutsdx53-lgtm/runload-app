export function compareExperienceRecordChronology(left, right) {
  return String(left?.record?.date || "").localeCompare(String(right?.record?.date || ""))
    || String(left?.record?.createdAt || "").localeCompare(String(right?.record?.createdAt || ""))
    || String(left?.record?.id || "").localeCompare(String(right?.record?.id || ""));
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

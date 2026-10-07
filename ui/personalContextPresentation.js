import {
  FOCUS_TAG_OPTIONS,
  normalizePersonalContext,
  summarizePersonalContext,
} from "../core/appCore.js";

function checkedValue(value) {
  return value === true || value === "1" || value === "on" || value === "true";
}

const ACTIVE_FOCUS_TAG_VALUES = Object.freeze([
  "relax",
  "small_step",
  "rhythm",
  "posture",
  "quiet_landing",
]);

export const ACTIVE_FOCUS_TAG_OPTIONS = Object.freeze(
  FOCUS_TAG_OPTIONS.filter((option) => ACTIVE_FOCUS_TAG_VALUES.includes(option.value)),
);

export const PERSONAL_CONTEXT_FIELD_NAMES = Object.freeze([
  "personalShoeId",
  "personalShoeLabel",
  ...ACTIVE_FOCUS_TAG_VALUES.map((value) => `personalFocus_${value}`),
]);

export function personalContextFieldsFromRecord(record = {}) {
  const context = normalizePersonalContext(record.personalContext || {});
  const fields = {
    personalShoeId: context?.shoeId || "",
    personalShoeLabel: context?.shoeLabel || "",
  };
  ACTIVE_FOCUS_TAG_VALUES.forEach((value) => {
    fields[`personalFocus_${value}`] = context?.focusTags?.includes(value) ? "1" : "__unchecked__";
  });
  return Object.freeze(fields);
}

export function personalContextFromFields(fields = {}) {
  return normalizePersonalContext({
    shoeId: fields.personalShoeId,
    shoeLabel: fields.personalShoeLabel,
    focusTags: ACTIVE_FOCUS_TAG_VALUES
      .filter((value) => checkedValue(fields[`personalFocus_${value}`]))
      .map(String),
  });
}

export function personalSummaryFromFields(fields = {}) {
  return summarizePersonalContext(personalContextFromFields(fields) || {});
}

export function personalContextSummary(record = {}) {
  return summarizePersonalContext(record.personalContext || {});
}

import {
  EQUIPMENT_TAG_OPTIONS,
  FOOT_PLACEMENT_OPTIONS,
  FOCUS_TAG_OPTIONS,
  RHYTHM_STRIDE_OPTIONS,
  SHOE_SOFTNESS_OPTIONS,
  SHOE_TYPE_OPTIONS,
  labelForOption,
  normalizePersonalContext,
  summarizePersonalContext,
} from "../core/appCore.js";

function stringValue(value, fallback = "") {
  return value === undefined || value === null ? String(fallback) : String(value);
}

function checkedValue(value) {
  return value === true || value === "1" || value === "on" || value === "true";
}

export const ACTIVE_FOCUS_TAG_VALUES = Object.freeze([
  "relax",
  "small_step",
  "rhythm",
  "posture",
  "quiet_landing",
]);

export const ACTIVE_FOCUS_TAG_OPTIONS = Object.freeze(
  FOCUS_TAG_OPTIONS.filter((option) => ACTIVE_FOCUS_TAG_VALUES.includes(option.value)),
);

const RETIRED_FOCUS_TAG_VALUES = Object.freeze(
  FOCUS_TAG_OPTIONS.map((option) => option.value).filter((value) => !ACTIVE_FOCUS_TAG_VALUES.includes(value)),
);

export const PERSONAL_CONTEXT_FIELD_NAMES = Object.freeze([
  "personalShoeId",
  "personalShoeLabel",
  "personalShoeType",
  "personalShoeSoftness",
  "personalFreeNote",
  ...ACTIVE_FOCUS_TAG_VALUES.map((value) => `personalFocus_${value}`),
]);

export function personalContextFieldsFromRecord(record = {}) {
  const context = normalizePersonalContext(record.personalContext || {});
  const fields = {
    personalShoeId: context?.shoeId || "",
    personalShoeLabel: context?.shoeLabel || "",
    personalShoeType: context?.shoeType || "",
    personalShoeSoftness: context?.shoeSoftness || "",
    personalFreeNote: context?.freeNote || "",
  };
  ACTIVE_FOCUS_TAG_VALUES.forEach((value) => {
    fields[`personalFocus_${value}`] = context?.focusTags?.includes(value) ? "1" : "__unchecked__";
  });
  return Object.freeze(fields);
}

export function mergePersonalContextFields(workspaceFields = {}, fallbackRecord = {}) {
  return Object.freeze({
    ...personalContextFieldsFromRecord(fallbackRecord),
    ...Object.fromEntries(Object.entries(workspaceFields || {})
      .filter(([key]) => PERSONAL_CONTEXT_FIELD_NAMES.includes(key))
      .map(([key, value]) => [key, stringValue(value)])),
  });
}

export function personalContextFromFields(fields = {}) {
  return normalizePersonalContext({
    shoeId: fields.personalShoeId,
    shoeLabel: fields.personalShoeLabel,
    shoeType: fields.personalShoeType,
    shoeSoftness: fields.personalShoeSoftness,
    focusTags: ACTIVE_FOCUS_TAG_VALUES
      .filter((value) => checkedValue(fields[`personalFocus_${value}`]))
      .map(String),
    freeNote: fields.personalFreeNote,
  });
}

export function personalSummaryFromFields(fields = {}) {
  return summarizePersonalContext(personalContextFromFields(fields) || {});
}

export function personalContextSummary(record = {}) {
  return summarizePersonalContext(record.personalContext || {});
}

export function personalContextDisplayItems(context = {}) {
  const normalized = normalizePersonalContext(context);
  if (!normalized) return [];
  const items = [];
  if (normalized.shoeLabel) items.push(["シューズ", normalized.shoeLabel]);
  if (normalized.shoeType) items.push(["靴の種類", labelForOption(normalized.shoeType, SHOE_TYPE_OPTIONS)]);
  if (normalized.shoeSoftness) items.push(["やわらかさ", labelForOption(normalized.shoeSoftness, SHOE_SOFTNESS_OPTIONS)]);
  if (normalized.footPlacement) items.push(["足のつき方", labelForOption(normalized.footPlacement, FOOT_PLACEMENT_OPTIONS)]);
  if (normalized.rhythmStride) items.push(["歩幅・テンポ", labelForOption(normalized.rhythmStride, RHYTHM_STRIDE_OPTIONS)]);
  if (normalized.focusTags.length) {
    items.push(["今日やったこと", normalized.focusTags.map((tag) => FOCUS_TAG_OPTIONS.find((option) => option.value === tag)?.label || tag).join("、")]);
  }
  if (normalized.equipmentTags.length) items.push(["装備", normalized.equipmentTags.map((tag) => EQUIPMENT_TAG_OPTIONS.find((option) => option.value === tag)?.label || tag).join("、")]);
  if (normalized.equipmentNote) items.push(["装備メモ", normalized.equipmentNote]);
  if (normalized.freeNote) items.push(["走り方メモ", normalized.freeNote]);
  return items;
}


export {
  EQUIPMENT_TAG_OPTIONS,
  FOOT_PLACEMENT_OPTIONS,
  FOCUS_TAG_OPTIONS,
  RHYTHM_STRIDE_OPTIONS,
  SHOE_SOFTNESS_OPTIONS,
  SHOE_TYPE_OPTIONS,
};

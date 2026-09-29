import "./modelSupport.js";
import { internalModules } from "./modules.js";

// ===== core/safety/inputSafety.js =====
{
const moduleExports = Object.create(null);
const INPUT_LIMITS = Object.freeze({
  csvBytes: 4 * 1024 * 1024,
  csvRows: 20000,
  csvColumns: 256,
  csvLineCharacters: 256 * 1024,
  backupBytes: 16 * 1024 * 1024,
  jsonDepth: 64,
  jsonNodes: 300000,
  jsonStringCharacters: 2 * 1024 * 1024,
  steps: 10000000,
  distanceKm: 10000,
  durationMinutes: 100000,
  portableRecords: 20000,
  portableFeedbackEntries: 20000,
  portablePlans: 20000,
  portableModelResults: 40000,
  portableCourses: 5000,
});

const DANGEROUS_JSON_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const BIDI_AND_INVISIBLE_CONTROLS = /[\u061C\u200B\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;
const SPREADSHEET_FORMULA_PREFIX = /^[\t\r\n ]*[=+\-@]/;
const PROTECTED_FORMULA_PREFIX = /^'([\t\r\n ]*[=+\-@])/;

function byteLength(value = "") {
  const text = String(value ?? "");
  if (typeof TextEncoder === "function") return new TextEncoder().encode(text).length;
  return unescape(encodeURIComponent(text)).length;
}

function normalizeUserText(value = "") {
  const text = String(value ?? "");
  const normalized = typeof text.normalize === "function" ? text.normalize("NFC") : text;
  return normalized.replace(BIDI_AND_INVISIBLE_CONTROLS, "");
}

function normalizePlainText(value = "", maximumLength = 240) {
  return normalizeUserText(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maximumLength);
}

function normalizeSingleLineText(value = "", maximumLength = 80) {
  return normalizePlainText(value, maximumLength * 2)
    .replace(/\s+/g, " ")
    .slice(0, maximumLength);
}

function protectSpreadsheetFormula(value) {
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value == null ? "" : String(value);
  }
  const text = String(value);
  return SPREADSHEET_FORMULA_PREFIX.test(text) && !PROTECTED_FORMULA_PREFIX.test(text)
    ? `'${text}`
    : text;
}

function decodeProtectedSpreadsheetText(value) {
  return String(value ?? "").replace(PROTECTED_FORMULA_PREFIX, "$1");
}

function escapeCsvValue(value, options = {}) {
  const text = options.protectFormula === false
    ? String(value ?? "")
    : protectSpreadsheetFormula(value);
  return /[",\n\r;,\t]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function assertCsvText(value, options = {}) {
  const text = String(value ?? "");
  const maximumBytes = Number(options.maximumBytes || INPUT_LIMITS.csvBytes);
  const bytes = byteLength(text);
  if (bytes > maximumBytes) {
    throw Object.assign(new Error("CSVが大きすぎます。"), {
      name: "InputSafetyError",
      code: "CSV_TOO_LARGE",
      details: { bytes, maximumBytes },
    });
  }
  const lines = text.split(/\r?\n/);
  const maximumRows = Number(options.maximumRows || INPUT_LIMITS.csvRows);
  if (lines.length > maximumRows + 1) {
    throw Object.assign(new Error("CSVの行数が多すぎます。"), {
      name: "InputSafetyError",
      code: "CSV_TOO_MANY_ROWS",
      details: { rows: lines.length, maximumRows },
    });
  }
  const maximumLineCharacters = Number(options.maximumLineCharacters || INPUT_LIMITS.csvLineCharacters);
  const overlongLineIndex = lines.findIndex((line) => line.length > maximumLineCharacters);
  if (overlongLineIndex >= 0) {
    throw Object.assign(new Error(`CSVの${overlongLineIndex + 1}行目が長すぎます。`), {
      name: "InputSafetyError",
      code: "CSV_LINE_TOO_LONG",
      details: { line: overlongLineIndex + 1, length: lines[overlongLineIndex].length, maximumLineCharacters },
    });
  }
  return Object.freeze({ ok: true, bytes, rows: lines.length });
}

function inspectJsonValue(root, options = {}) {
  const limits = {
    maximumDepth: Number(options.maximumDepth || INPUT_LIMITS.jsonDepth),
    maximumNodes: Number(options.maximumNodes || INPUT_LIMITS.jsonNodes),
    maximumStringCharacters: Number(options.maximumStringCharacters || INPUT_LIMITS.jsonStringCharacters),
  };
  const stack = [{ value: root, depth: 0, path: "$" }];
  const seen = typeof WeakSet === "function" ? new WeakSet() : null;
  let nodes = 0;
  while (stack.length) {
    const current = stack.pop();
    nodes += 1;
    if (nodes > limits.maximumNodes) return { ok: false, code: "JSON_TOO_MANY_NODES", message: "バックアップ内の項目数が多すぎます。", path: current.path, nodes, limits };
    if (current.depth > limits.maximumDepth) return { ok: false, code: "JSON_TOO_DEEP", message: "バックアップの入れ子が深すぎます。", path: current.path, depth: current.depth, limits };
    if (typeof current.value === "string" && current.value.length > limits.maximumStringCharacters) return { ok: false, code: "JSON_STRING_TOO_LONG", message: "バックアップ内に長すぎる文字列があります。", path: current.path, length: current.value.length, limits };
    if (!current.value || typeof current.value !== "object") continue;
    if (seen) {
      if (seen.has(current.value)) return { ok: false, code: "JSON_CYCLE", message: "バックアップ内に循環参照があります。", path: current.path, limits };
      seen.add(current.value);
    }
    for (const key of Object.keys(current.value)) {
      if (DANGEROUS_JSON_KEYS.has(key)) return { ok: false, code: "JSON_DANGEROUS_KEY", message: `安全上使用できない項目名があります: ${key}`, path: `${current.path}.${key}`, key, limits };
      stack.push({ value: current.value[key], depth: current.depth + 1, path: `${current.path}.${key}` });
    }
  }
  return { ok: true, nodes, limits };
}

function parseJsonText(value, options = {}) {
  const text = String(value ?? "").replace(/^\uFEFF/, "");
  const maximumBytes = Number(options.maximumBytes || INPUT_LIMITS.backupBytes);
  const bytes = byteLength(text);
  if (bytes > maximumBytes) return { ok: false, code: "JSON_TOO_LARGE", message: "バックアップが大きすぎます。", details: { bytes, maximumBytes } };
  let parsed;
  try { parsed = JSON.parse(text); } catch { return { ok: false, code: "JSON_PARSE_FAILED", message: "JSON形式を読み取れませんでした。", details: {} }; }
  const inspection = inspectJsonValue(parsed, options);
  if (!inspection.ok) return { ok: false, code: inspection.code, message: inspection.message, details: inspection };
  return { ok: true, value: parsed, details: { bytes, nodes: inspection.nodes } };
}
moduleExports["INPUT_LIMITS"] = INPUT_LIMITS;
moduleExports["byteLength"] = byteLength;
moduleExports["normalizeUserText"] = normalizeUserText;
moduleExports["normalizePlainText"] = normalizePlainText;
moduleExports["normalizeSingleLineText"] = normalizeSingleLineText;
moduleExports["protectSpreadsheetFormula"] = protectSpreadsheetFormula;
moduleExports["decodeProtectedSpreadsheetText"] = decodeProtectedSpreadsheetText;
moduleExports["escapeCsvValue"] = escapeCsvValue;
moduleExports["assertCsvText"] = assertCsvText;
moduleExports["inspectJsonValue"] = inspectJsonValue;
moduleExports["parseJsonText"] = parseJsonText;
internalModules.inputSafety = moduleExports;
}

// ===== core/personal/personalContext.js =====
{
const moduleExports = Object.create(null);
const { normalizePlainText, normalizeSingleLineText } = internalModules.inputSafety;
const PERSONAL_CONTEXT_SCHEMA_VERSION = 1;
const SHOE_TYPE_OPTIONS = Object.freeze([
  Object.freeze({ value: "", label: "未設定" }),
  Object.freeze({ value: "usual_training", label: "いつもの練習用" }),
  Object.freeze({ value: "soft", label: "やわらかめ" }),
  Object.freeze({ value: "light", label: "軽め" }),
  Object.freeze({ value: "race", label: "レース用" }),
  Object.freeze({ value: "trail", label: "山道・不整地向け" }),
  Object.freeze({ value: "other", label: "その他" }),
]);
const SHOE_SOFTNESS_OPTIONS = Object.freeze([
  Object.freeze({ value: "", label: "未設定" }),
  Object.freeze({ value: "soft", label: "やわらかめ" }),
  Object.freeze({ value: "normal", label: "ふつう" }),
  Object.freeze({ value: "firm", label: "かため" }),
  Object.freeze({ value: "unknown", label: "わからない" }),
]);
const FOOT_PLACEMENT_OPTIONS = Object.freeze([
  Object.freeze({ value: "", label: "未設定" }),
  Object.freeze({ value: "unknown", label: "よくわからない" }),
  Object.freeze({ value: "heel", label: "かかとからついた感じ" }),
  Object.freeze({ value: "full_sole", label: "足裏全体でついた感じ" }),
  Object.freeze({ value: "forefoot", label: "つま先寄りでついた感じ" }),
  Object.freeze({ value: "varies", label: "日によって違う" }),
]);
const RHYTHM_STRIDE_OPTIONS = Object.freeze([
  Object.freeze({ value: "", label: "未設定" }),
  Object.freeze({ value: "usual", label: "いつも通り" }),
  Object.freeze({ value: "small_step", label: "歩幅を小さくした" }),
  Object.freeze({ value: "rhythm_focus", label: "テンポよく足を動かした" }),
  Object.freeze({ value: "long_step", label: "歩幅を大きくした" }),
  Object.freeze({ value: "unknown", label: "よくわからない" }),
]);
const EQUIPMENT_TAG_OPTIONS = Object.freeze([
  Object.freeze({ value: "phone", label: "スマートフォン" }),
  Object.freeze({ value: "watch", label: "ランニングウォッチ" }),
  Object.freeze({ value: "bottle", label: "ボトル・給水" }),
  Object.freeze({ value: "bag", label: "バッグ・ポーチ" }),
  Object.freeze({ value: "support", label: "サポーター等" }),
  Object.freeze({ value: "other", label: "その他" }),
]);
const FOCUS_TAG_OPTIONS = Object.freeze([
  Object.freeze({ value: "relax", label: "力を抜いた" }),
  Object.freeze({ value: "small_step", label: "歩幅を小さくした" }),
  Object.freeze({ value: "rhythm", label: "テンポよく足を動かした" }),
  Object.freeze({ value: "posture", label: "背すじを起こした" }),
  Object.freeze({ value: "quiet_landing", label: "足音を小さくした" }),
  Object.freeze({ value: "uphill_easy", label: "上りで無理しなかった" }),
  Object.freeze({ value: "downhill_slow", label: "下りをゆっくり走った" }),
]);
function allowedValue(value, options) {
  const text = normalizeSingleLineText(value, 80);
  return options.some((option) => option.value === text) ? text : "";
}
function normalizeTagList(value, options) {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  const allowed = new Set(options.map((option) => option.value));
  return Object.freeze(Array.from(new Set(source.map((item) => normalizeSingleLineText(item, 40)).filter((item) => allowed.has(item)))));
}
function normalizeFocusTags(value) { return normalizeTagList(value, FOCUS_TAG_OPTIONS); }
function hasPersonalContextInput(context = {}) {
  if (!context || typeof context !== "object") return false;
  return Boolean(context.shoeId || context.shoeLabel || context.shoeType || context.shoeSoftness || context.footPlacement || context.rhythmStride || (Array.isArray(context.focusTags) && context.focusTags.length) || (Array.isArray(context.equipmentTags) && context.equipmentTags.length) || context.equipmentNote || context.freeNote);
}
function normalizePersonalContext(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const normalized = Object.freeze({
    schemaVersion: PERSONAL_CONTEXT_SCHEMA_VERSION,
    shoeId: normalizeSingleLineText(source.shoeId, 100),
    shoeLabel: normalizeSingleLineText(source.shoeLabel, 80),
    shoeType: allowedValue(source.shoeType, SHOE_TYPE_OPTIONS),
    shoeSoftness: allowedValue(source.shoeSoftness, SHOE_SOFTNESS_OPTIONS),
    footPlacement: allowedValue(source.footPlacement, FOOT_PLACEMENT_OPTIONS),
    rhythmStride: allowedValue(source.rhythmStride, RHYTHM_STRIDE_OPTIONS),
    focusTags: normalizeFocusTags(source.focusTags),
    equipmentTags: normalizeTagList(source.equipmentTags, EQUIPMENT_TAG_OPTIONS),
    equipmentNote: normalizePlainText(source.equipmentNote, 240),
    freeNote: normalizePlainText(source.freeNote, 240),
  });
  return hasPersonalContextInput(normalized) ? normalized : null;
}
function labelForOption(value, options) { return options.find((option) => option.value === value)?.label || ""; }
function summarizePersonalContext(context = {}) {
  const normalized = normalizePersonalContext(context);
  if (!normalized) return Object.freeze({ hasInput: false, label: "未入力", description: "今日のシューズ・走り方は未入力です。", items: [] });
  const items = [];
  if (normalized.shoeLabel) items.push(`シューズ：${normalized.shoeLabel}`); else if (normalized.shoeType) items.push(`シューズ：${labelForOption(normalized.shoeType, SHOE_TYPE_OPTIONS)}`);
  if (normalized.shoeSoftness) items.push(`やわらかさ：${labelForOption(normalized.shoeSoftness, SHOE_SOFTNESS_OPTIONS)}`);
  if (normalized.footPlacement) items.push(`足のつき方：${labelForOption(normalized.footPlacement, FOOT_PLACEMENT_OPTIONS)}`);
  if (normalized.rhythmStride) items.push(`歩幅・テンポ：${labelForOption(normalized.rhythmStride, RHYTHM_STRIDE_OPTIONS)}`);
  if (normalized.focusTags.length) items.push(`今日やったこと：${normalized.focusTags.map((tag) => FOCUS_TAG_OPTIONS.find((option) => option.value === tag)?.label || tag).join("、")}`);
  if (normalized.equipmentTags.length) items.push(`装備：${normalized.equipmentTags.map((tag) => EQUIPMENT_TAG_OPTIONS.find((option) => option.value === tag)?.label || tag).join("、")}`);
  if (normalized.equipmentNote) items.push("装備メモあり");
  if (normalized.freeNote) items.push("走り方メモあり");
  return Object.freeze({ hasInput: true, label: "入力あり", description: items.slice(0, 3).join("・") + (items.length > 3 ? ` ほか${items.length - 3}件` : ""), items });
}
moduleExports["PERSONAL_CONTEXT_SCHEMA_VERSION"] = PERSONAL_CONTEXT_SCHEMA_VERSION;
moduleExports["SHOE_TYPE_OPTIONS"] = SHOE_TYPE_OPTIONS;
moduleExports["SHOE_SOFTNESS_OPTIONS"] = SHOE_SOFTNESS_OPTIONS;
moduleExports["FOOT_PLACEMENT_OPTIONS"] = FOOT_PLACEMENT_OPTIONS;
moduleExports["RHYTHM_STRIDE_OPTIONS"] = RHYTHM_STRIDE_OPTIONS;
moduleExports["EQUIPMENT_TAG_OPTIONS"] = EQUIPMENT_TAG_OPTIONS;
moduleExports["FOCUS_TAG_OPTIONS"] = FOCUS_TAG_OPTIONS;
moduleExports["hasPersonalContextInput"] = hasPersonalContextInput;
moduleExports["normalizePersonalContext"] = normalizePersonalContext;
moduleExports["labelForOption"] = labelForOption;
moduleExports["summarizePersonalContext"] = summarizePersonalContext;
internalModules.personalContext = moduleExports;
}

// ===== core/safety/inputValidation.js =====
{
const moduleExports = Object.create(null);
const { SURFACE_FIELDS, hasTreadmillOutdoorSurfaceMixFromCourse, hasTreadmillOutdoorSurfaceMixFromComponents } = internalModules.modelConstants;
const { normalizeRegionalModelSnapshot } = internalModules.primaryRegionalSnapshot;
const { roundNumber, toFiniteNumber } = internalModules.numberUtilities;
const { normalizePlainText, normalizeSingleLineText, INPUT_LIMITS } = internalModules.inputSafety;
const { normalizePersonalContext } = internalModules.personalContext;

function isValidLocalDate(value = "") {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
function createReadableRecordId(date, existingIds = []) {
  const safeDate = isValidLocalDate(date) ? date : "unknown-date";
  const prefix = `record-${safeDate}-`;
  const usedNumbers = new Set(existingIds.filter((id) => String(id).startsWith(prefix)).map((id) => Number(String(id).slice(prefix.length))).filter(Number.isFinite));
  let sequence = 1;
  while (usedNumbers.has(sequence)) sequence += 1;
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}
function present(value) { return value !== undefined && value !== null && value !== ""; }
function normalizeBodyProfileSnapshot(profileSource = {}) {
  if (!profileSource || typeof profileSource !== "object" || !Object.keys(profileSource).length) return null;
  return Object.freeze({
    schemaVersion: Math.max(0, Math.trunc(toFiniteNumber(profileSource.schemaVersion, 0))),
    numericUse: normalizeSingleLineText(profileSource.numericUse, 100),
    sex: normalizeSingleLineText(profileSource.sex, 40),
    ageBand: normalizeSingleLineText(profileSource.ageBand, 40),
    heightCm: present(profileSource.heightCm) ? profileSource.heightCm : "",
    weightKg: present(profileSource.weightKg) ? profileSource.weightKg : "",
    runningStartDateOrBand: normalizeSingleLineText(profileSource.runningStartDateOrBand, 80),
    experienceSelfAssessment: normalizeSingleLineText(profileSource.experienceSelfAssessment, 80),
    runningGoalTags: Object.freeze(Array.isArray(profileSource.runningGoalTags) ? profileSource.runningGoalTags.map((item) => normalizeSingleLineText(item, 80)).filter(Boolean) : []),
    recordedAt: normalizeSingleLineText(profileSource.recordedAt, 50),
  });
}
function normalizeCourse(rawCourse = {}) {
  const course = rawCourse && typeof rawCourse === "object" ? rawCourse : {};
  const rawGradeMode = String(course.gradeInputMode || "").toUpperCase();
  const gradeInputMode = ["UNKNOWN", "FLAT", "SUMMARY", "SECTIONS"].includes(rawGradeMode)
    ? rawGradeMode
    : Array.isArray(course.sections) && course.sections.length ? "SECTIONS"
      : String(course.gradeKnowledge || "UNKNOWN").toUpperCase() === "KNOWN_FLAT" ? "FLAT"
        : String(course.gradeKnowledge || "UNKNOWN").toUpperCase() === "KNOWN_PROFILE" ? "SUMMARY" : "UNKNOWN";
  const gradeKnowledge = gradeInputMode === "FLAT" ? "KNOWN_FLAT" : ["SUMMARY", "SECTIONS"].includes(gradeInputMode) ? "KNOWN_PROFILE" : "UNKNOWN";
  const modelSurfaceClass = String(course.modelSurfaceClass || "UNKNOWN").toUpperCase();
  const routePattern = String(course.routePattern || "UNKNOWN").toUpperCase();
  const surfaceWetSlipState = String(course.surfaceWetSlipState || "UNKNOWN").toUpperCase();
  const normalized = {
    id: normalizeSingleLineText(course.id, 120),
    name: normalizeSingleLineText(course.name, 80),
    routePattern: ["LOOP", "OUT_AND_BACK", "ONE_WAY", "MIXED", "UNKNOWN"].includes(routePattern) ? routePattern : "UNKNOWN",
    surfaceWetSlipState: ["DRY", "DAMP", "WET", "SLIPPERY_REPORTED", "UNKNOWN"].includes(surfaceWetSlipState) ? surfaceWetSlipState : "UNKNOWN",
    gradeInputMode,
    surfaceInputMode: ["UNKNOWN", "SINGLE", "MIXED"].includes(String(course.surfaceInputMode || "").toUpperCase()) ? String(course.surfaceInputMode).toUpperCase() : "UNKNOWN",
    gradeKnowledge,
    upPercent: toFiniteNumber(course.upPercent, 0),
    downPercent: toFiniteNumber(course.downPercent, 0),
    upGradePercent: toFiniteNumber(course.upGradePercent, 0),
    downGradePercent: toFiniteNumber(course.downGradePercent, 0),
    modelSurfaceClass: ["REF_HARD_EVEN_STABLE", "DRY_STABLE_GRASS_TURF", "DEEP_DRY_SOFT_SAND", "EXPLICIT_UNEVEN", "KNOWN_OTHER", "UNKNOWN"].includes(modelSurfaceClass) ? modelSurfaceClass : "UNKNOWN",
  };
  SURFACE_FIELDS.forEach(({ recordKey }) => { normalized[recordKey] = toFiniteNumber(course[recordKey], 0); });
  const positiveSurfaceCount = SURFACE_FIELDS.filter(({ recordKey }) => normalized[recordKey] > 0).length;
  if (normalized.surfaceInputMode === "UNKNOWN" && positiveSurfaceCount) normalized.surfaceInputMode = positiveSurfaceCount === 1 ? "SINGLE" : "MIXED";
  if (Array.isArray(course.modelSurfaceProfile) && course.modelSurfaceProfile.length) {
    normalized.modelSurfaceProfile = Object.freeze(course.modelSurfaceProfile.map((item = {}) => Object.freeze({
      sharePercent: toFiniteNumber(item.sharePercent, 0),
      surfaceClass: normalizeSingleLineText(item.surfaceClass, 80) || "UNKNOWN",
    })));
  }
  if (Array.isArray(course.sections) && course.sections.length) {
    normalized.sections = Object.freeze(course.sections.flatMap((item = {}, index) => {
      const distanceKm = present(item.distanceKm) ? toFiniteNumber(item.distanceKm, Number.NaN) : null;
      const sharePercent = present(item.sharePercent) ? toFiniteNumber(item.sharePercent, Number.NaN) : null;
      const signedGrade = present(item.gradePercent) ? toFiniteNumber(item.gradePercent, Number.NaN) : null;
      const durationMinutes = toFiniteNumber(item.durationMinutes, Number.NaN);
      const steps = toFiniteNumber(item.steps, Number.NaN);
      const speedMps = toFiniteNumber(item.speedMps, Number.NaN);
      const cadenceSpm = toFiniteNumber(item.cadenceSpm, Number.NaN);
      const rawDirection = String(item.gradeDirection || "").toUpperCase();
      const gradeDirection = ["UPHILL", "DOWNHILL", "FLAT", "UNKNOWN"].includes(rawDirection) ? rawDirection : Number(signedGrade) > 0 ? "UPHILL" : Number(signedGrade) < 0 ? "DOWNHILL" : Number(signedGrade) === 0 ? "FLAT" : "UNKNOWN";
      const gradePercent = signedGrade == null || !Number.isFinite(signedGrade) ? null : gradeDirection === "DOWNHILL" ? -Math.abs(signedGrade) : gradeDirection === "UPHILL" ? Math.abs(signedGrade) : gradeDirection === "FLAT" ? 0 : signedGrade;
      if (!(Number(distanceKm) > 0) && !(Number(sharePercent) > 0)) return [];
      return [Object.freeze({
        sectionId: normalizeSingleLineText(item.sectionId, 80) || `section-${index + 1}`,
        sharePercent: Number.isFinite(sharePercent) ? sharePercent : null,
        distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
        durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : null,
        steps: Number.isInteger(steps) && steps >= 0 ? steps : null,
        speedMps: Number.isFinite(speedMps) && speedMps > 0 ? speedMps : null,
        cadenceSpm: Number.isFinite(cadenceSpm) && cadenceSpm > 0 ? cadenceSpm : null,
        gradeDirection,
        gradePercent,
        surfaceClass: normalizeSingleLineText(item.surfaceClass, 80) || normalized.modelSurfaceClass,
      })];
    }));
  }
  return Object.freeze(normalized);
}
function rawNumericValue(input, key) {
  const value = input[key];
  return value === "" || value === null || value === undefined ? undefined : value;
}
function validateProvidedNumber(errors, input, field, minimum, maximum, message) {
  const value = rawNumericValue(input, field);
  if (value === undefined) return;
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) errors.push({ field, code: `INVALID_${field.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`, message });
}
function validateRequiredPositiveNumber(errors, input, field, maximum, message) {
  const value = rawNumericValue(input, field);
  const number = Number(value);
  if (value === undefined || !Number.isFinite(number) || number <= 0 || number > maximum) errors.push({ field, code: `INVALID_${field.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`, message });
}
function validateCourseInput(errors, input) {
  const course = input.course && typeof input.course === "object" ? input.course : {};
  const gradeKnowledge = String(course.gradeKnowledge || "UNKNOWN").toUpperCase();
  if (!["UNKNOWN", "KNOWN_FLAT", "KNOWN_PROFILE"].includes(gradeKnowledge)) errors.push({ field: "course", code: "INVALID_GRADE_KNOWLEDGE", message: "坂道の入力方法を選び直してください。" });
  for (const field of ["upPercent", "downPercent", "upGradePercent", "downGradePercent"]) {
    if (course[field] === "" || course[field] == null) continue;
    const number = Number(course[field]);
    if (!Number.isFinite(number) || number < 0 || number > 100) errors.push({ field: "course", code: `INVALID_${field.toUpperCase()}`, message: "坂道の割合・勾配を確認してください。" });
  }
  const sections = Array.isArray(course.sections) ? course.sections : [];
  if (sections.length) {
    const invalid = sections.some((section) => {
      const distance = Number(section?.distanceKm);
      const share = Number(section?.sharePercent);
      const grade = section?.gradePercent == null ? null : Number(section.gradePercent);
      return (!(distance > 0) && !(share > 0)) || (distance && !Number.isFinite(distance)) || (share && (!Number.isFinite(share) || share < 0 || share > 100)) || (grade != null && (!Number.isFinite(grade) || Math.abs(grade) > 100));
    });
    if (invalid) errors.push({ field: "course", code: "INVALID_COURSE_SECTION", message: "区間の距離・割合・勾配を確認してください。" });
    const shares = sections.map((section) => Number(section?.sharePercent)).filter(Number.isFinite);
    if (shares.length === sections.length && Math.abs(shares.reduce((sum, value) => sum + value, 0) - 100) > 0.01) errors.push({ field: "course", code: "SECTION_SHARE_SUM_NOT_100", message: "区間割合の合計を100%にしてください。" });
  } else if (gradeKnowledge === "KNOWN_PROFILE") {
    const up = Number(course.upPercent), down = Number(course.downPercent), upGrade = Number(course.upGradePercent), downGrade = Number(course.downGradePercent);
    if ([up, down, upGrade, downGrade].some((value) => !Number.isFinite(value))) errors.push({ field: "course", code: "GRADE_PROFILE_INCOMPLETE", message: "割合入力では、上り・下りの割合と代表勾配を確認してください。" });
    else {
      if (up + down > 100.01) errors.push({ field: "course", code: "GRADE_SHARE_SUM_EXCEEDS_100", message: "上り区間と下り区間の合計は100%以下にしてください。" });
      if (up > 0 && upGrade <= 0) errors.push({ field: "course", code: "UPHILL_GRADE_REQUIRED", message: "上り区間がある場合は、正の代表勾配を入力してください。" });
      if (down > 0 && downGrade <= 0) errors.push({ field: "course", code: "DOWNHILL_GRADE_REQUIRED", message: "下り区間がある場合は、勾配の大きさを正の値で入力してください。" });
    }
  }
  const surfaceClass = String(course.modelSurfaceClass || "UNKNOWN").toUpperCase();
  if (!new Set(["REF_HARD_EVEN_STABLE", "DRY_STABLE_GRASS_TURF", "DEEP_DRY_SOFT_SAND", "EXPLICIT_UNEVEN", "KNOWN_OTHER", "UNKNOWN"]).has(surfaceClass)) errors.push({ field: "course", code: "INVALID_MODEL_SURFACE_CLASS", message: "路面の入力内容を確認してください。" });
  if (Array.isArray(course.modelSurfaceProfile) && course.modelSurfaceProfile.length) {
    const shares = course.modelSurfaceProfile.map((item) => Number(item?.sharePercent));
    if (shares.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) errors.push({ field: "course", code: "INVALID_MODEL_SURFACE_SHARE", message: "路面割合を確認してください。" });
    else if (Math.abs(shares.reduce((sum, value) => sum + value, 0) - 100) > 0.01) errors.push({ field: "course", code: "MODEL_SURFACE_SUM_NOT_100", message: "路面割合の合計を100%にしてください。" });
  }
}
function validateRunningRecordInput(input = {}) {
  const errors = [];
  const activityType = String(input.activityType || "").toLowerCase();
  if (!isValidLocalDate(input.date)) errors.push({ field: "date", code: "INVALID_RECORD_DATE", message: "日付を正しく入力してください。" });
  if (!["run", "rest"].includes(activityType)) errors.push({ field: "activityType", code: "INVALID_ACTIVITY_TYPE", message: "走行または休養を選択してください。" });
  if (activityType === "run") {
    validateRequiredPositiveNumber(errors, input, "distanceKm", INPUT_LIMITS.distanceKm, "走行記録では、0より大きい距離が必要です。");
    validateRequiredPositiveNumber(errors, input, "durationMinutes", INPUT_LIMITS.durationMinutes, "走行記録では、0より大きい実走時間が必要です。");
    validateProvidedNumber(errors, input, "steps", 0, INPUT_LIMITS.steps, "歩数が入力可能な範囲を超えています。");
    const runningFormat = String(input.runningFormat || "UNKNOWN").toUpperCase();
    if (!["CONTINUOUS_RUN", "RUN_WALK", "UNKNOWN"].includes(runningFormat)) errors.push({ field: "runningFormat", code: "INVALID_RUNNING_FORMAT", message: "走行形式を選び直してください。" });
    if (runningFormat === "RUN_WALK") {
      const runD = Number(rawNumericValue(input, "runWalkRunningDistanceKm"));
      const runT = Number(rawNumericValue(input, "runWalkRunningDurationMinutes"));
      const totalD = Number(rawNumericValue(input, "distanceKm"));
      const totalT = Number(rawNumericValue(input, "durationMinutes"));
      if (!(runD > 0 && runD < totalD)) errors.push({ field: "runWalkRunningDistanceKm", code: "INVALID_RUN_WALK_RUNNING_DISTANCE", message: "RUN_WALKでは、走った距離を全体距離より小さい正の値で入力してください。" });
      if (!(runT > 0 && runT < totalT)) errors.push({ field: "runWalkRunningDurationMinutes", code: "INVALID_RUN_WALK_RUNNING_DURATION", message: "RUN_WALKでは、走った時間を全体の実走時間より短い正の値で入力してください。" });
      const rwSections = Array.isArray(input.runWalkRunningSections) ? input.runWalkRunningSections : [];
      if (rwSections.length) {
        const shares = rwSections.map((section) => Number(section?.sharePercent));
        if (shares.some((value) => !Number.isFinite(value) || value <= 0 || value > 100) || Math.abs(shares.reduce((a,b)=>a+b,0) - 100) > 0.01) errors.push({ field: "runWalkRunningSections", code: "INVALID_RUN_WALK_RUNNING_SECTION_SHARES", message: "走った区間の割合は正の値で、合計100%にしてください。" });
        if (rwSections.some((section) => {
          const direction = String(section?.gradeDirection || "").toUpperCase();
          const grade = Number(section?.gradePercent);
          return !["FLAT","UPHILL","DOWNHILL"].includes(direction) || !Number.isFinite(grade) || grade < 0 || grade > 15 || (direction === "FLAT" ? Math.abs(grade) > 1e-9 : !(grade > 0)) || !Array.isArray(section?.surfaceComponents) || !section.surfaceComponents.length;
        })) errors.push({ field: "runWalkRunningSections", code: "RUN_WALK_RUNNING_SECTION_GRADE_OUT_OF_MODEL_USE_DOMAIN", message: "走った区間の勾配は、方向と0〜15%の確認範囲で入力してください。" });
        const rwSurfaceComponents = rwSections.flatMap((section) => Array.isArray(section?.surfaceComponents) ? section.surfaceComponents : []);
        if (hasTreadmillOutdoorSurfaceMixFromComponents(rwSurfaceComponents)) errors.push({ field: "runWalkRunningSections", code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルと屋外路面は、同じ走行の路面割合として混ぜて入力できません。" });
      }
    }
    const stepsProvenance = String(input.stepsProvenance || "UNKNOWN").toUpperCase();
    if (!["DEVICE_MEASURED", "DEVICE_SYNCED", "ESTIMATED", "UNKNOWN"].includes(stepsProvenance)) errors.push({ field: "stepsProvenance", code: "INVALID_STEPS_PROVENANCE", message: "歩数の取得方法を選び直してください。" });
    const rawCourse = input.course && typeof input.course === "object" ? input.course : {};
    const providedSurfaces = SURFACE_FIELDS.map(({ recordKey }) => rawCourse[recordKey]).filter((value) => value !== undefined);
    if (providedSurfaces.length && providedSurfaces.some((value) => Number(value) !== 0)) {
      const invalidSurface = providedSurfaces.some((value) => { const number = Number(value); return !Number.isFinite(number) || number < 0 || number > 100; });
      const surfaceSum = providedSurfaces.reduce((total, value) => total + Number(value || 0), 0);
      if (invalidSurface) errors.push({ field: "course", code: "INVALID_SURFACE_PERCENT", message: "路面割合は0〜100で入力してください。" });
      else if (Math.abs(surfaceSum - 100) > 1e-9) errors.push({ field: "course", code: "SURFACE_SUM_NOT_100", message: "路面の合計を100%にしてください。", details: { surfaceSum } });
      if (hasTreadmillOutdoorSurfaceMixFromCourse(rawCourse)) errors.push({ field: "course", code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルと屋外路面は、同じ走行の路面割合として混ぜて入力できません。" });
    }
    validateCourseInput(errors, input);
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}
function normalizeContextObject(source = {}, specification = {}) {
  const raw = source && typeof source === "object" ? source : {};
  return Object.freeze(Object.fromEntries(Object.entries(specification).map(([key, config]) => {
    const value = raw[key];
    if (config === "number") { const number = Number(value); return [key, Number.isFinite(number) ? number : null]; }
    if (config === "tags") { const items = Array.isArray(value) ? value : String(value || "").split(","); return [key, Object.freeze([...new Set(items.map((item) => normalizeSingleLineText(item, 80)).filter(Boolean))])]; }
    if (config === "line") return [key, normalizeSingleLineText(value, 160)];
    return [key, normalizePlainText(value, Number(config) || 500)];
  })));
}
function normalizeRunningRecord(input = {}, options = {}) {
  const activityType = String(input.activityType || "").toLowerCase() === "rest" ? "rest" : "run";
  const nowIso = options.nowIso || new Date().toISOString();
  const date = String(input.date || "").slice(0, 10);
  const isRest = activityType === "rest";
  const distanceKm = isRest ? 0 : roundNumber(toFiniteNumber(input.distanceKm, 0), 2);
  const durationMinutes = isRest ? 0 : toFiniteNumber(input.durationMinutes, 0);
  const steps = isRest ? 0 : Math.round(toFiniteNumber(input.steps, 0));
  const existingIds = Array.isArray(options.existingIds) ? options.existingIds : [];
  const id = normalizeSingleLineText(input.id, 100) || createReadableRecordId(date, existingIds);
  const planOutcomeSource = input.planOutcome && typeof input.planOutcome === "object" ? input.planOutcome : {};
  const runningFormat = String(input.runningFormat || "UNKNOWN").toUpperCase();
  return Object.freeze({
    id, date, activityType, distanceKm, durationMinutes, steps,
    runningFormat: isRest ? "NOT_APPLICABLE" : ["CONTINUOUS_RUN", "RUN_WALK", "UNKNOWN"].includes(runningFormat) ? runningFormat : "UNKNOWN",
    runWalkRunningDistanceKm: isRest || runningFormat !== "RUN_WALK" ? null : (Number.isFinite(Number(input.runWalkRunningDistanceKm)) && Number(input.runWalkRunningDistanceKm) > 0 ? roundNumber(Number(input.runWalkRunningDistanceKm), 3) : null),
    runWalkRunningDurationMinutes: isRest || runningFormat !== "RUN_WALK" ? null : (Number.isFinite(Number(input.runWalkRunningDurationMinutes)) && Number(input.runWalkRunningDurationMinutes) > 0 ? Number(input.runWalkRunningDurationMinutes) : null),
    runWalkRunningSections: isRest || runningFormat !== "RUN_WALK" ? Object.freeze([]) : Object.freeze((Array.isArray(input.runWalkRunningSections) ? input.runWalkRunningSections : []).map((section, index) => Object.freeze({
      sectionId: normalizeSingleLineText(section?.sectionId, 80) || `running-phase-${index + 1}`,
      sharePercent: Number(section?.sharePercent), gradeKnown: section?.gradeKnown === true, gradePercent: Number(section?.gradePercent),
      gradeDirection: ["FLAT","UPHILL","DOWNHILL"].includes(String(section?.gradeDirection || "").toUpperCase()) ? String(section.gradeDirection).toUpperCase() : "UNKNOWN",
      surfaceComponents: Object.freeze((Array.isArray(section?.surfaceComponents) ? section.surfaceComponents : []).map((item) => Object.freeze({ componentId: normalizeSingleLineText(item?.componentId, 80), sharePercent: Number(item?.sharePercent), userCategory: normalizeSingleLineText(item?.userCategory, 80).toUpperCase() }))),
    }))),
    stepsProvenance: isRest ? "NOT_APPLICABLE" : ["DEVICE_MEASURED", "DEVICE_SYNCED", "ESTIMATED", "UNKNOWN"].includes(String(input.stepsProvenance || "UNKNOWN").toUpperCase()) ? String(input.stepsProvenance || "UNKNOWN").toUpperCase() : "UNKNOWN",
    course: normalizeCourse(input.course),
    memo: normalizePlainText(input.memo, 500),
    bodyProfileSnapshot: normalizeBodyProfileSnapshot(input.bodyProfileSnapshot || {}),
    planOutcome: Object.freeze({
      status: normalizeSingleLineText(planOutcomeSource.status, 40),
      reason: normalizeSingleLineText(planOutcomeSource.reason, 40),
      reasonNote: normalizePlainText(planOutcomeSource.reasonNote, 240),
      plannedDistanceKm: Math.max(0, toFiniteNumber(planOutcomeSource.plannedDistanceKm, 0)),
      plannedDurationMinutes: Math.max(0, toFiniteNumber(planOutcomeSource.plannedDurationMinutes, 0)),
      plannedCourseSnapshot: planOutcomeSource.plannedCourseSnapshot && typeof planOutcomeSource.plannedCourseSnapshot === "object" ? Object.freeze({ ...planOutcomeSource.plannedCourseSnapshot }) : null,
      planNote: normalizePlainText(planOutcomeSource.planNote, 500),
    }),
    personalContext: normalizePersonalContext(input.personalContext || {}),
    environmentContext: normalizeContextObject(input.environmentContext, { temperatureC: "number", environmentNote: 500 }),
    reflectionContext: normalizeContextObject(input.reflectionContext, { postRunReflection: 500, perceivedDifference: 500, nextCheckPoint: 500 }),
    regionalModelSnapshot: normalizeRegionalModelSnapshot(input.regionalModelSnapshot),
    createdAt: normalizeSingleLineText(input.createdAt, 50) || nowIso,
    updatedAt: nowIso,
  });
}
function validateRunningRecord(record = {}) {
  const errors = [];
  if (!isValidLocalDate(record.date)) errors.push({ field: "date", code: "INVALID_RECORD_DATE", message: "日付を正しく入力してください。" });
  if (!["run", "rest"].includes(record.activityType)) errors.push({ field: "activityType", code: "INVALID_ACTIVITY_TYPE", message: "走行または休養を選択してください。" });
  if (record.activityType === "run") {
    if (!Number.isFinite(record.distanceKm) || record.distanceKm <= 0 || record.distanceKm > INPUT_LIMITS.distanceKm) errors.push({ field: "distanceKm", code: "INVALID_DISTANCE", message: "走行記録では、0より大きい距離が必要です。" });
    if (!Number.isFinite(record.durationMinutes) || record.durationMinutes <= 0 || record.durationMinutes > INPUT_LIMITS.durationMinutes) errors.push({ field: "durationMinutes", code: "INVALID_DURATION", message: "走行記録では、0より大きい実走時間が必要です。" });
    if (record.steps < 0 || record.steps > INPUT_LIMITS.steps) errors.push({ field: "steps", code: "INVALID_STEPS", message: "歩数が入力可能な範囲を超えています。" });
    const surfaceSum = SURFACE_FIELDS.reduce((total, { recordKey }) => total + toFiniteNumber(record.course?.[recordKey], 0), 0);
    if (surfaceSum > 0 && Math.abs(surfaceSum - 100) > 1e-9) errors.push({ field: "course", code: "SURFACE_SUM_NOT_100", message: "路面の合計を100%にしてください。", details: { surfaceSum } });
    if (hasTreadmillOutdoorSurfaceMixFromCourse(record.course || {})) errors.push({ field: "course", code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルと屋外路面は、同じ走行の路面割合として混ぜて入力できません。" });
    if (record.runningFormat === "RUN_WALK") {
      const rwSurfaceComponents = (record.runWalkRunningSections || []).flatMap((section) => Array.isArray(section?.surfaceComponents) ? section.surfaceComponents : []);
      if (hasTreadmillOutdoorSurfaceMixFromComponents(rwSurfaceComponents)) errors.push({ field: "runWalkRunningSections", code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルと屋外路面は、同じ走行の路面割合として混ぜて入力できません。" });
    }
    if (!["CONTINUOUS_RUN", "RUN_WALK", "UNKNOWN"].includes(record.runningFormat)) errors.push({ field: "runningFormat", code: "INVALID_RUNNING_FORMAT", message: "走行形式を選び直してください。" });
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}
moduleExports["isValidLocalDate"] = isValidLocalDate;
moduleExports["createReadableRecordId"] = createReadableRecordId;
moduleExports["validateRunningRecordInput"] = validateRunningRecordInput;
moduleExports["normalizeRunningRecord"] = normalizeRunningRecord;
moduleExports["validateRunningRecord"] = validateRunningRecord;
internalModules.inputValidation = moduleExports;
}

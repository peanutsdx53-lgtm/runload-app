import "./v27ApplicationModel.js";
import { internalModules } from "./modules.js";
import {
  ROF_J_SOURCE_VERSION,
  isSupportedRofJSemanticVersion,
  isSupportedRofJStorageSchema,
  isSupportedRofJLifecycleSchema,
} from "../rofJConstants.js";
import { hasLegacyRofJSourceMetadata } from "../legacyCompatibility.js";

// ===== core/storage/courseRepository.js =====
{
const moduleExports = Object.create(null);
const { SURFACE_FIELDS, hasTreadmillOutdoorSurfaceMixFromCourse } = internalModules.modelConstants;
const { normalizeSingleLineText } = internalModules.inputSafety;
const { createCollectionRepository } = internalModules.collectionRepository;
const { STORAGE_KEYS } = internalModules.storageKeys;

const COURSE_NUMERIC_FIELDS = Object.freeze([
  "upPercent", "downPercent", "upGradePercent", "downGradePercent",
  ...SURFACE_FIELDS.map(({ recordKey }) => recordKey),
]);

const GRADE_INPUT_MODES = new Set(["UNKNOWN", "FLAT", "SUMMARY", "SECTIONS"]);
const SURFACE_INPUT_MODES = new Set(["UNKNOWN", "SINGLE", "MIXED"]);
const GRADE_DIRECTIONS = new Set(["UPHILL", "DOWNHILL", "FLAT", "UNKNOWN"]);
const ROUTE_PATTERNS = new Set(["LOOP", "OUT_AND_BACK", "ONE_WAY", "MIXED", "UNKNOWN"]);
const SURFACE_CLASSES = new Set([
  "REF_HARD_EVEN_STABLE",
  "DRY_STABLE_GRASS_TURF",
  "DEEP_DRY_SOFT_SAND",
  "EXPLICIT_UNEVEN",
  "KNOWN_OTHER",
  "UNKNOWN",
]);

function boundedNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return number;
}

function normalizedGradeInputMode(course = {}) {
  const explicit = String(course?.gradeInputMode || "").toUpperCase();
  if (GRADE_INPUT_MODES.has(explicit)) return explicit;
  if (Array.isArray(course?.sections) && course.sections.length) return "SECTIONS";
  if (String(course?.gradeKnowledge || "").toUpperCase() === "KNOWN_FLAT") return "FLAT";
  if (String(course?.gradeKnowledge || "").toUpperCase() === "KNOWN_PROFILE") return "SUMMARY";
  return "UNKNOWN";
}

function normalizedSurfaceInputMode(course = {}) {
  const explicit = String(course?.surfaceInputMode || "").toUpperCase();
  if (SURFACE_INPUT_MODES.has(explicit)) return explicit;
  const positive = SURFACE_FIELDS.filter(({ recordKey }) => Number(course?.[recordKey] || 0) > 0);
  if (!positive.length) return "UNKNOWN";
  if (positive.length === 1 && Math.abs(Number(course?.[positive[0].recordKey] || 0) - 100) <= 0.01) return "SINGLE";
  return "MIXED";
}

function normalizeSections(sections = []) {
  if (!Array.isArray(sections)) return Object.freeze([]);
  return Object.freeze(sections.flatMap((item = {}, index) => {
    const sharePercent = boundedNumber(item.sharePercent);
    const rawDirection = String(item.gradeDirection || "").toUpperCase();
    const rawGrade = boundedNumber(item.gradePercent);
    const gradeDirection = GRADE_DIRECTIONS.has(rawDirection)
      ? rawDirection
      : rawGrade > 0
        ? "UPHILL"
        : rawGrade < 0
          ? "DOWNHILL"
          : "FLAT";
    const gradePercent = gradeDirection === "FLAT" ? 0 : Math.abs(rawGrade);
    if (!(sharePercent > 0)) return [];
    return [Object.freeze({
      sectionId: normalizeSingleLineText(item.sectionId, 80) || `section-${index + 1}`,
      sharePercent,
      distanceKm: Number(item.distanceKm) > 0 ? Number(item.distanceKm) : null,
      durationMinutes: Number(item.durationMinutes) > 0 ? Number(item.durationMinutes) : null,
      steps: item.steps != null && Number.isInteger(Number(item.steps)) && Number(item.steps) >= 0 ? Number(item.steps) : null,
      speedMps: Number(item.speedMps) > 0 ? Number(item.speedMps) : null,
      cadenceSpm: Number(item.cadenceSpm) > 0 ? Number(item.cadenceSpm) : null,
      gradeDirection,
      gradePercent,
    })];
  }));
}

function normalizeSurfaceProfile(profile = []) {
  if (!Array.isArray(profile)) return Object.freeze([]);
  return Object.freeze(profile.flatMap((item = {}) => {
    const sharePercent = boundedNumber(item.sharePercent);
    const surfaceClass = String(item.surfaceClass || "UNKNOWN").toUpperCase();
    if (!(sharePercent > 0)) return [];
    return [Object.freeze({
      sharePercent,
      surfaceClass: SURFACE_CLASSES.has(surfaceClass) ? surfaceClass : "UNKNOWN",
    })];
  }));
}

function normalizeCourseFields(course = {}) {
  const gradeInputMode = normalizedGradeInputMode(course);
  const surfaceInputMode = normalizedSurfaceInputMode(course);
  const gradeKnowledge = gradeInputMode === "FLAT"
    ? "KNOWN_FLAT"
    : ["SUMMARY", "SECTIONS"].includes(gradeInputMode)
      ? "KNOWN_PROFILE"
      : "UNKNOWN";
  const modelSurfaceClass = String(course?.modelSurfaceClass || "UNKNOWN").toUpperCase();
  const normalized = {
    name: normalizeSingleLineText(course?.name, 80),
    routePattern: ROUTE_PATTERNS.has(String(course?.routePattern || "UNKNOWN").toUpperCase())
      ? String(course.routePattern || "UNKNOWN").toUpperCase()
      : "UNKNOWN",
    gradeInputMode,
    surfaceInputMode,
    gradeKnowledge,
    upPercent: boundedNumber(course?.upPercent),
    downPercent: boundedNumber(course?.downPercent),
    upGradePercent: boundedNumber(course?.upGradePercent),
    downGradePercent: boundedNumber(course?.downGradePercent),
    modelSurfaceClass: SURFACE_CLASSES.has(modelSurfaceClass) ? modelSurfaceClass : "UNKNOWN",
    modelSurfaceProfile: normalizeSurfaceProfile(course?.modelSurfaceProfile),
    sections: normalizeSections(course?.sections),
  };
  SURFACE_FIELDS.forEach(({ recordKey }) => {
    normalized[recordKey] = boundedNumber(course?.[recordKey] ?? 0);
  });
  return Object.freeze(normalized);
}

function validateSections(sections = []) {
  if (!sections.length) return { ok: false, code: "COURSE_SECTION_REQUIRED", message: "区間入力では、少なくとも1区間の割合を入力してください。" };
  const invalid = sections.some((section) => (
    !Number.isFinite(Number(section.sharePercent))
    || Number(section.sharePercent) <= 0
    || Number(section.sharePercent) > 100
    || !GRADE_DIRECTIONS.has(String(section.gradeDirection || "").toUpperCase())
    || !Number.isFinite(Number(section.gradePercent))
    || Number(section.gradePercent) < 0
    || Number(section.gradePercent) > 100
  ));
  if (invalid) return { ok: false, code: "COURSE_SECTION_INVALID", message: "区間の割合と勾配を0〜100の範囲で確認してください。" };
  const total = sections.reduce((sum, section) => sum + Number(section.sharePercent || 0), 0);
  if (Math.abs(total - 100) > 0.01) return { ok: false, code: "COURSE_SECTION_SHARE_INVALID", message: `区間割合の合計を100%にしてください。現在は${total}%です。` };
  const missingGrade = sections.some((section) => (
    ["UPHILL", "DOWNHILL"].includes(section.gradeDirection)
    && !(Number(section.gradePercent) > 0)
  ));
  if (missingGrade) return { ok: false, code: "COURSE_SECTION_GRADE_REQUIRED", message: "上り・下り区間には、正の勾配の大きさを入力してください。" };
  return { ok: true };
}

function validateCoursePresetInput(course = {}) {
  const normalized = normalizeCourseFields(course);
  if (!normalized.name) {
    return { ok: false, code: "COURSE_NAME_REQUIRED", message: "コース名を入力してください。", course: normalized };
  }
  const numericValues = COURSE_NUMERIC_FIELDS.map((field) => [field, Number(normalized[field] ?? 0)]);
  const invalidNumeric = numericValues.filter(([, value]) => !Number.isFinite(value) || value < 0 || value > 100);
  if (invalidNumeric.length) {
    return {
      ok: false,
      code: "COURSE_NUMERIC_VALUE_INVALID",
      message: "坂道と路面の値は0〜100の範囲で入力してください。",
      details: { fields: invalidNumeric.map(([field]) => field) },
      course: normalized,
    };
  }
  if (normalized.gradeInputMode === "SUMMARY") {
    const up = normalized.upPercent;
    const down = normalized.downPercent;
    if (up + down > 100.01) return { ok: false, code: "COURSE_GRADE_SHARE_INVALID", message: "上り区間と下り区間の合計は100%以下にしてください。", course: normalized };
    if (up > 0 && normalized.upGradePercent <= 0) return { ok: false, code: "COURSE_UP_GRADE_REQUIRED", message: "上り区間がある場合は、正の代表勾配を入力してください。", course: normalized };
    if (down > 0 && normalized.downGradePercent <= 0) return { ok: false, code: "COURSE_DOWN_GRADE_REQUIRED", message: "下り区間がある場合は、代表勾配の大きさを入力してください。", course: normalized };
  }
  if (normalized.gradeInputMode === "SECTIONS") {
    const sectionValidation = validateSections(normalized.sections);
    if (!sectionValidation.ok) return { ...sectionValidation, course: normalized };
  }
  const surfaceTotal = SURFACE_FIELDS.reduce((sum, { recordKey }) => sum + normalized[recordKey], 0);
  if (normalized.surfaceInputMode === "UNKNOWN" && surfaceTotal > 0.01) {
    return { ok: false, code: "COURSE_SURFACE_MODE_CONFLICT", message: "路面を入力した場合は、1種類または複数種類を選んでください。", course: normalized };
  }
  if (normalized.surfaceInputMode !== "UNKNOWN" && Math.abs(surfaceTotal - 100) > 0.01) {
    return { ok: false, code: "COURSE_SURFACE_TOTAL_INVALID", message: `路面割合の合計を100%にしてください。現在は${surfaceTotal}%です。`, course: normalized };
  }
  if (hasTreadmillOutdoorSurfaceMixFromCourse(normalized)) {
    return { ok: false, code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルは屋外路面と割合で混ぜず、トレッドミルのみのコースとして保存してください。", course: normalized };
  }
  if (!SURFACE_CLASSES.has(normalized.modelSurfaceClass)) {
    return { ok: false, code: "COURSE_SURFACE_CLASS_INVALID", message: "路面の入力内容を確認してください。", course: normalized };
  }
  return { ok: true, course: normalized };
}

function normalizePreset(item = {}) {
  const course = normalizeCourseFields(item.course || item);
  const id = normalizeSingleLineText(item.id, 120);
  if (!id || !course.name) return null;
  return Object.freeze({
    id,
    name: course.name,
    course,
    createdAt: String(item.createdAt || item.updatedAt || new Date().toISOString()),
    updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString()),
  });
}

function createId(courseName, existingIds, nowIso) {
  const slug = normalizeSingleLineText(courseName, 40)
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "") || "course";
  const stamp = nowIso.replace(/[^0-9]/g, "").slice(0, 17);
  let candidate = `course-${slug}-${stamp}`;
  let suffix = 2;
  while (existingIds.has(candidate)) candidate = `course-${slug}-${stamp}-${suffix++}`;
  return candidate;
}

function createCourseRepository(gateway) {
  const repository = createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.courses,
    normalizeItem: normalizePreset,
    sortItems: (items) => [...items].sort((left, right) => left.name.localeCompare(right.name, "ja") || left.id.localeCompare(right.id)),
  });

  function duplicateByName(name, excludingId = "") {
    const normalizedName = normalizeSingleLineText(name, 80).toLocaleLowerCase("ja");
    return repository.loadAll().find((item) => item.id !== excludingId && item.name.toLocaleLowerCase("ja") === normalizedName) || null;
  }

  function create(courseInput) {
    const validation = validateCoursePresetInput(courseInput);
    if (!validation.ok) return { ...validation, item: null };
    const duplicate = duplicateByName(validation.course.name);
    if (duplicate) return { ok: false, code: "COURSE_NAME_DUPLICATE", message: "同じ名前のコースがあります。保存済みコースを選んで更新するか、別の名前にしてください。", item: null, duplicate };
    const items = repository.loadAll();
    const nowIso = new Date().toISOString();
    const preset = normalizePreset({ id: createId(validation.course.name, new Set(items.map((item) => item.id)), nowIso), course: validation.course, createdAt: nowIso, updatedAt: nowIso });
    return repository.upsert(preset);
  }

  function update(id, courseInput) {
    const current = repository.findById(String(id || ""));
    if (!current) return { ok: false, code: "COURSE_NOT_FOUND", message: "更新するコースを選んでください。", item: null };
    const validation = validateCoursePresetInput(courseInput);
    if (!validation.ok) return { ...validation, item: null };
    const duplicate = duplicateByName(validation.course.name, current.id);
    if (duplicate) return { ok: false, code: "COURSE_NAME_DUPLICATE", message: "同じ名前の別コースがあります。別の名前にしてください。", item: null, duplicate };
    const preset = normalizePreset({ ...current, name: validation.course.name, course: validation.course, updatedAt: new Date().toISOString() });
    return repository.upsert(preset);
  }

  return Object.freeze({
    loadAll: repository.loadAll,
    loadAllResult: repository.loadAllResult,
    findById: repository.findById,
    create,
    update,
    removeById: repository.removeById,
    clear: () => gateway.remove(STORAGE_KEYS.courses),
  });
}
moduleExports["COURSE_NUMERIC_FIELDS"] = COURSE_NUMERIC_FIELDS;
moduleExports["normalizeCourseFields"] = normalizeCourseFields;
moduleExports["validateCoursePresetInput"] = validateCoursePresetInput;
moduleExports["createCourseRepository"] = createCourseRepository;
internalModules.courseRepository = moduleExports;
}

// ===== core/storage/restoreInspection.js =====
{
const moduleExports = Object.create(null);
const { PERSONAL_PROFILE_SCHEMA_VERSION } = internalModules.bodyProfileAdjustment;
const { PRIMARY_REGIONAL_V2_MODEL_VERSION, validatePrimaryRegionalV2ResultRecord } = internalModules.primaryRegionalResultService;
const { V27_MODEL_VERSION } = internalModules.legacyLoadModelConstants;
const { assertV27ResultSemantics } = internalModules.legacyLoadModel;
const { INPUT_LIMITS } = internalModules.inputSafety;
const { validateRunningRecordInput, normalizeRunningRecord, validateRunningRecord } = internalModules.inputValidation;
const { validateCoursePresetInput } = internalModules.courseRepository;
const { STORAGE_KEYS, USER_DATA_STORAGE_KEYS } = internalModules.storageKeys;

const RESTORE_INSPECTION_VERSION = "restore-inspection-v1";
const RESTORE_STATUS = Object.freeze({
  supported: "SUPPORTED",
  review: "REVIEW_REQUIRED",
  blocked: "RESTORE_BLOCKED",
});

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function issue(severity, code, area, message, itemId = "", details = {}) {
  return Object.freeze({ severity, code, area, message, itemId: String(itemId || ""), details: Object.freeze({ ...details }) });
}


function withinCollectionLimit(value, maximum, area, label, issues) {
  if (!Array.isArray(value)) return false;
  if (value.length <= maximum) return true;
  issues.push(issue(
    "BLOCKING",
    "COLLECTION_LIMIT_EXCEEDED",
    area,
    `${label}の件数が多すぎます。`,
    "",
    { count: value.length, maximum },
  ));
  return false;
}

function addDuplicateIssues(items, getId, area, label, issues) {
  const seen = new Set();
  const duplicates = new Set();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const id = String(getId(item) || "");
    if (!id) return;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  });
  duplicates.forEach((id) => issues.push(issue(
    "BLOCKING",
    "DUPLICATE_ID",
    area,
    `${label}に同じ識別子が複数あります。`,
    id,
  )));
}

function deepFiniteNumbers(value, path = "", issues = [], area = "data", itemId = "") {
  if (typeof value === "number" && !Number.isFinite(value)) {
    issues.push(issue("BLOCKING", "NONFINITE_NUMBER", area, "有限でない数値が含まれています。", itemId, { path }));
    return issues;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => deepFiniteNumbers(item, `${path}[${index}]`, issues, area, itemId));
  } else if (isObject(value)) {
    Object.entries(value).forEach(([key, item]) => deepFiniteNumbers(item, path ? `${path}.${key}` : key, issues, area, itemId));
  }
  return issues;
}

function inspectRecords(records, issues) {
  addDuplicateIssues(records, (item) => item?.id, "records", "走行・休養記録", issues);
  (records || []).forEach((record, index) => {
    const itemId = String(record?.id || `#${index + 1}`);
    if (!isObject(record) || !record.id) {
      issues.push(issue("BLOCKING", "RECORD_OBJECT_OR_ID_REQUIRED", "records", "記録の形式または識別子を確認できません。", itemId));
      return;
    }
    const inputValidation = validateRunningRecordInput(record);
    const normalized = normalizeRunningRecord(record, {
      existingIds: [],
      nowIso: record.updatedAt || record.createdAt || "2000-01-01T00:00:00.000Z",
    });
    const validation = validateRunningRecord(normalized);
    if (!inputValidation.ok || !validation.ok) {
      issues.push(issue("BLOCKING", "RECORD_SCHEMA_INVALID", "records", "走行・休養記録の必須項目または値の範囲が現在の形式に適合しません。", itemId, {
        inputErrors: inputValidation.errors?.map((item) => item.code) || [],
        recordErrors: validation.errors?.map((item) => item.code) || [],
      }));
    }
    deepFiniteNumbers(record, "", issues, "records", itemId);
  });
}

function inspectV27Results(results, recordIds, issues) {
  addDuplicateIssues(results, (item) => item?.id, "v27Results", "走行全体の保存済み結果", issues);
  (results || []).forEach((item, index) => {
    const itemId = String(item?.id || `#${index + 1}`);
    if (!isObject(item) || !item.id || !item.record_id) {
      issues.push(issue("BLOCKING", "V27_RESULT_ID_REQUIRED", "v27Results", "走行全体の保存済み結果の識別情報が不足しています。", itemId));
      return;
    }
    if (item.model_version !== V27_MODEL_VERSION) {
      issues.push(issue("BLOCKING", "V27_VERSION_UNSUPPORTED", "v27Results", "対応していない走行全体の結果形式です。", itemId));
    }
    if (!recordIds.has(String(item.record_id))) {
      issues.push(issue("BLOCKING", "V27_RECORD_REFERENCE_MISSING", "v27Results", "結果が参照する走行・休養記録がバックアップ内にありません。", itemId));
    }
    if (item.input_snapshot?.record?.id && String(item.input_snapshot.record.id) !== String(item.record_id)) {
      issues.push(issue("BLOCKING", "V27_SNAPSHOT_REFERENCE_MISMATCH", "v27Results", "結果と元の記録の対応を確認できません。", itemId));
    }
    if (item.state === "RUN") {
      const semantic = assertV27ResultSemantics(item.result);
      if (!semantic.ok) {
        issues.push(issue("BLOCKING", "V27_SEMANTICS_INVALID", "v27Results", "走行全体の保存済み結果が現在の意味規則に適合しません。", itemId, { errors: semantic.errors }));
      }
    } else if (item.state !== "REST" || item.result !== null) {
      issues.push(issue("BLOCKING", "V27_STATE_INVALID", "v27Results", "走行全体の結果状態を確認できません。", itemId));
    }
    deepFiniteNumbers(item, "", issues, "v27Results", itemId);
  });
}

function inspectRegionalResults(results, recordIds, issues) {
  addDuplicateIssues(results, (item) => item?.id, "regionalResults", "部位別の保存済み結果", issues);
  (results || []).forEach((item, index) => {
    const itemId = String(item?.id || `#${index + 1}`);
    if (!isObject(item) || !item.id || !item.record_id) {
      issues.push(issue("BLOCKING", "REGIONAL_RESULT_ID_REQUIRED", "regionalResults", "部位別の保存済み結果の識別情報が不足しています。", itemId));
      return;
    }
    if (item.model_version !== PRIMARY_REGIONAL_V2_MODEL_VERSION) {
      issues.push(issue("BLOCKING", "REGIONAL_VERSION_UNSUPPORTED", "regionalResults", "このアプリで作成された部位別結果ではありません。", itemId));
    }
    if (!recordIds.has(String(item.record_id))) {
      issues.push(issue("BLOCKING", "REGIONAL_RECORD_REFERENCE_MISSING", "regionalResults", "部位別結果が参照する記録がバックアップ内にありません。", itemId));
    }
    if (item.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION) {
      const outputValidation = validatePrimaryRegionalV2ResultRecord(item);
      if (!outputValidation.valid) issues.push(issue("BLOCKING", "PRIMARY_REGIONAL_V2_OUTPUT_INVALID", "regionalResults", "部位別比較値の12部位・入力追跡情報を確認できません。", itemId, { issueCodes: outputValidation.issues.slice(0, 20) }));
    }
    deepFiniteNumbers(item, "", issues, "regionalResults", itemId);
  });
}

function inspectFeedback(items, recordIds, issues) {
  addDuplicateIssues(items, (item) => item?.recordId || `date:${item?.date || ""}`, "subjectiveFeedback", "本人入力", issues);
  (items || []).forEach((item, index) => {
    const itemId = String(item?.recordId || item?.date || `#${index + 1}`);
    if (!isObject(item) || (!item.recordId && !item.date)) {
      issues.push(issue("BLOCKING", "FEEDBACK_TARGET_REQUIRED", "subjectiveFeedback", "本人入力の対象記録または日付が不足しています。", itemId));
      return;
    }
    if (item.recordId && !recordIds.has(String(item.recordId))) {
      issues.push(issue("BLOCKING", "FEEDBACK_RECORD_REFERENCE_MISSING", "subjectiveFeedback", "本人入力が参照する記録がバックアップ内にありません。", itemId));
    }
    deepFiniteNumbers(item, "", issues, "subjectiveFeedback", itemId);
  });
}

function inspectPlans(plans, recordIds, issues) {
  addDuplicateIssues(plans, (item) => item?.id, "plans", "予定", issues);
  (plans || []).forEach((plan, index) => {
    const itemId = String(plan?.id || `#${index + 1}`);
    if (!isObject(plan) || !plan.id || !String(plan.scheduledDate || plan.date || "").slice(0, 10)) {
      issues.push(issue("BLOCKING", "PLAN_SCHEMA_INVALID", "plans", "予定の識別子または日付が不足しています。", itemId));
      return;
    }
    const sourceRecordId = String(plan.sourceRecordId || "");
    const actualRecordId = String(plan.actualRecordId || "");
    if (sourceRecordId && !recordIds.has(sourceRecordId)) {
      issues.push(issue("WARNING", "PLAN_SOURCE_RECORD_MISSING", "plans", "予定の元になった記録がバックアップ内にありません。予定自体は復元できます。", itemId));
    }
    if (actualRecordId && !recordIds.has(actualRecordId)) {
      issues.push(issue("WARNING", "PLAN_ACTUAL_RECORD_MISSING", "plans", "予定に結び付いた実績記録がバックアップ内にありません。予定自体は復元できます。", itemId));
    }
    deepFiniteNumbers(plan, "", issues, "plans", itemId);
  });
}

function inspectCourses(courses, issues) {
  addDuplicateIssues(courses, (item) => item?.id, "courses", "保存したコース", issues);
  (courses || []).forEach((item, index) => {
    const itemId = String(item?.id || `#${index + 1}`);
    if (!isObject(item) || !item.id) {
      issues.push(issue("BLOCKING", "COURSE_ID_REQUIRED", "courses", "保存したコースの識別子が不足しています。", itemId));
      return;
    }
    const validation = validateCoursePresetInput(item.course || item);
    if (!validation.ok) {
      issues.push(issue("BLOCKING", "COURSE_SCHEMA_INVALID", "courses", "保存したコースの値が現在の形式に適合しません。", itemId, { code: validation.code }));
    }
    deepFiniteNumbers(item, "", issues, "courses", itemId);
  });
}

function collection(snapshot, key, fallback) {
  if (!Object.prototype.hasOwnProperty.call(snapshot.data, key) || snapshot.data[key] == null) return fallback;
  return snapshot.data[key];
}

function inspectBackupSnapshot(snapshot, backupFormatVersion) {
  const issues = [];
  if (!isObject(snapshot)) {
    return Object.freeze({ ok: false, status: RESTORE_STATUS.blocked, canRestore: false, issues: Object.freeze([
      issue("BLOCKING", "BACKUP_OBJECT_REQUIRED", "backup", "バックアップの内容を確認できません。"),
    ]) });
  }
  if (snapshot.formatVersion !== backupFormatVersion) {
    issues.push(issue("BLOCKING", "BACKUP_VERSION_UNSUPPORTED", "backup", "対応していないバックアップ形式です。"));
  }
  if (!isObject(snapshot.data)) {
    issues.push(issue("BLOCKING", "BACKUP_DATA_REQUIRED", "backup", "バックアップにデータ領域がありません。"));
    return Object.freeze({ ok: false, status: RESTORE_STATUS.blocked, canRestore: false, issues: Object.freeze(issues) });
  }
  const unexpectedKeys = Object.keys(snapshot.data).filter((key) => !USER_DATA_STORAGE_KEYS.includes(key));
  if (unexpectedKeys.length) {
    issues.push(issue("BLOCKING", "BACKUP_UNKNOWN_STORAGE_KEY", "backup", "バックアップに現在のアプリで扱えない保存領域があります。"));
  }

  const records = collection(snapshot, STORAGE_KEYS.records, []);
  const v27Results = collection(snapshot, STORAGE_KEYS.modelResultsV27, []);
  const regionalResults = collection(snapshot, STORAGE_KEYS.modelResultsRegionalV2, []);
  const feedback = collection(snapshot, STORAGE_KEYS.subjectiveFeedback, []);
  const plans = collection(snapshot, STORAGE_KEYS.plans, []);
  const profile = collection(snapshot, STORAGE_KEYS.profile, null);
  const settings = collection(snapshot, STORAGE_KEYS.settings, null);
  const draft = collection(snapshot, STORAGE_KEYS.draft, null);
  const courses = collection(snapshot, STORAGE_KEYS.courses, []);
  const runMeasurements = collection(snapshot, STORAGE_KEYS.runMeasurements, []);
  const rofJData = collection(snapshot, STORAGE_KEYS.rofJ, null);
  const rofJLifecycleData = collection(snapshot, STORAGE_KEYS.rofJLifecycle, null);

  if (rofJData != null) {
    const validEnvelope = isObject(rofJData)
      && isSupportedRofJStorageSchema(rofJData.schemaVersion)
      && isObject(rofJData.entries);
    if (!validEnvelope) {
      issues.push(issue("BLOCKING", "ROF_J_STORAGE_INVALID", "rofJData", "ROF-J保存領域の形式が正しくありません。"));
    } else {
      const allowedRevisionTypes = new Set(["INITIAL_MEASUREMENT", "CORRECTION", "LATER_REFLECTION"]);
      const validRofValue = (value) => Number.isInteger(value) && value >= 0 && value <= 10;
      const validTime = (value) => typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
      Object.entries(rofJData.entries).forEach(([runId, entry]) => {
        const itemId = String(runId || "");
        if (!isObject(entry) || entry.runId !== runId) {
          issues.push(issue("BLOCKING", "ROF_J_RUN_ENTRY_INVALID", "rofJData", "ROF-J記録の走行識別子が一致しません。", itemId));
          return;
        }
        const currentSourceVersion = entry.sourceVersion === ROF_J_SOURCE_VERSION;
        const legacySourceFingerprint = hasLegacyRofJSourceMetadata(entry);
        if (entry.instrumentId !== "ROF_J"
          || !isSupportedRofJSemanticVersion(entry.instrumentSemanticVersion)
          || (!currentSourceVersion && !legacySourceFingerprint)
          || entry.visualSourceId !== "ROF_ORIGINAL_2017") {
          issues.push(issue("BLOCKING", "ROF_J_SEMANTIC_PROVENANCE_INVALID", "rofJData", "ROF-J記録の尺度・出典情報が現在の仕様と一致しません。", itemId));
        }
        if (!isObject(entry.measurements)) {
          issues.push(issue("BLOCKING", "ROF_J_MEASUREMENTS_INVALID", "rofJData", "ROF-J測定記録の形式が正しくありません。", itemId));
          return;
        }
        ["PRE_RUN", "POST_RUN"].forEach((phase) => {
          const measurement = entry.measurements[phase];
          if (measurement == null) return;
          if (!isObject(measurement) || measurement.phase !== phase || !Array.isArray(measurement.revisions) || measurement.revisions.length === 0) {
            issues.push(issue("BLOCKING", "ROF_J_MEASUREMENT_INVALID", "rofJData", "ROF-J測定記録の形式が正しくありません。", `${itemId}:${phase}`));
            return;
          }
          const initialCount = measurement.revisions.filter((revision) => revision?.revisionType === "INITIAL_MEASUREMENT").length;
          if (initialCount !== 1) {
            issues.push(issue("BLOCKING", "ROF_J_INITIAL_REVISION_INVALID", "rofJData", "ROF-J初回測定の履歴を確認できません。", `${itemId}:${phase}`));
          }
          measurement.revisions.forEach((revision) => {
            if (!isObject(revision) || !validRofValue(revision.value) || !validTime(revision.recordedAt) || !allowedRevisionTypes.has(revision.revisionType)) {
              issues.push(issue("BLOCKING", "ROF_J_REVISION_INVALID", "rofJData", "ROF-J修正履歴の値・日時・種別を確認できません。", `${itemId}:${phase}`));
            }
          });
          if (!measurement.revisions.some((revision) => revision?.revisionId === measurement.effectiveRevisionId)) {
            issues.push(issue("BLOCKING", "ROF_J_EFFECTIVE_REVISION_INVALID", "rofJData", "ROF-Jの有効測定を特定できません。", `${itemId}:${phase}`));
          }
        });
      });
    }
  }
  if (rofJLifecycleData != null) {
    const validLifecycle = isObject(rofJLifecycleData)
      && isSupportedRofJLifecycleSchema(rofJLifecycleData.schemaVersion)
      && isObject(rofJLifecycleData.pendingByRunId);
    if (!validLifecycle) issues.push(issue("BLOCKING", "ROF_J_LIFECYCLE_STORAGE_INVALID", "rofJLifecycleData", "ROF-J入力途中領域の形式が正しくありません。"));
  }

  const expectedArrays = [
    [records, "records", "走行・休養記録"],
    [v27Results, "v27Results", "走行全体の保存済み結果"],
    [regionalResults, "regionalResults", "部位別の保存済み結果"],
    [feedback, "subjectiveFeedback", "本人入力"],
    [plans, "plans", "予定"],
    [courses, "courses", "保存したコース"],
    [runMeasurements, "runMeasurements", "GPS走行軌跡"],
  ];
  expectedArrays.forEach(([value, area, label]) => {
    if (!Array.isArray(value)) issues.push(issue("BLOCKING", "COLLECTION_SHAPE_INVALID", area, `${label}が一覧形式ではありません。`));
  });
  [[profile, "profile", "プロフィール"], [settings, "settings", "設定"], [draft, "draft", "入力途中"]].forEach(([value, area, label]) => {
    if (value != null && !isObject(value)) issues.push(issue("BLOCKING", "OBJECT_SHAPE_INVALID", area, `${label}の形式が正しくありません。`));
  });

  const recordsWithinLimit = withinCollectionLimit(records, INPUT_LIMITS.portableRecords, "records", "走行・休養記録", issues);
  const v27WithinLimit = withinCollectionLimit(v27Results, INPUT_LIMITS.portableModelResults, "v27Results", "走行全体の保存済み結果", issues);
  const regionalWithinLimit = withinCollectionLimit(regionalResults, INPUT_LIMITS.portableModelResults, "regionalResults", "部位別の保存済み結果", issues);
  const feedbackWithinLimit = withinCollectionLimit(feedback, INPUT_LIMITS.portableFeedbackEntries, "subjectiveFeedback", "本人入力", issues);
  const plansWithinLimit = withinCollectionLimit(plans, INPUT_LIMITS.portablePlans, "plans", "予定", issues);
  const coursesWithinLimit = withinCollectionLimit(courses, INPUT_LIMITS.portableCourses, "courses", "保存したコース", issues);
  const measurementsWithinLimit = withinCollectionLimit(runMeasurements, INPUT_LIMITS.portableRecords, "runMeasurements", "GPS走行軌跡", issues);

  if (recordsWithinLimit) inspectRecords(records, issues);
  const recordIds = new Set(recordsWithinLimit ? records.map((item) => String(item?.id || "")).filter(Boolean) : []);
  if (v27WithinLimit) inspectV27Results(v27Results, recordIds, issues);
  if (regionalWithinLimit) inspectRegionalResults(regionalResults, recordIds, issues);
  if (feedbackWithinLimit) inspectFeedback(feedback, recordIds, issues);
  if (plansWithinLimit) inspectPlans(plans, recordIds, issues);
  if (coursesWithinLimit) inspectCourses(courses, issues);
  if (measurementsWithinLimit) {
    runMeasurements.forEach((measurement, index) => {
      const itemId = String(measurement?.recordId || measurement?.id || index);
      const measurementRecordId = String(measurement?.recordId || "");
      if (!isObject(measurement) || !measurementRecordId) {
        issues.push(issue("BLOCKING", "RUN_MEASUREMENT_INVALID", "runMeasurements", "GPS走行軌跡の記録IDを確認できません。", itemId));
        return;
      }
      if (!recordIds.has(measurementRecordId)) {
        issues.push(issue("BLOCKING", "RUN_MEASUREMENT_RECORD_MISSING", "runMeasurements", "GPS走行軌跡に対応する走行記録がありません。", itemId));
      }
      const track = measurement.track;
      if (!Array.isArray(track) || track.length < 2 || track.length > 2000) {
        issues.push(issue("BLOCKING", "RUN_MEASUREMENT_TRACK_INVALID", "runMeasurements", "GPS走行軌跡の地点数を確認できません。", itemId));
        return;
      }
      const invalidPoint = track.some((point) => (
        !isObject(point)
        || !Number.isFinite(Number(point.lat))
        || Number(point.lat) < -90
        || Number(point.lat) > 90
        || !Number.isFinite(Number(point.lon))
        || Number(point.lon) < -180
        || Number(point.lon) > 180
        || !Number.isFinite(Number(point.timestamp))
      ));
      if (invalidPoint) {
        issues.push(issue("BLOCKING", "RUN_MEASUREMENT_POINT_INVALID", "runMeasurements", "GPS走行軌跡に読み取れない地点があります。", itemId));
      }
    });
  }

  if (profile != null) {
    const version = Number(profile.schemaVersion || 0);
    if (!Number.isFinite(version) || version !== PERSONAL_PROFILE_SCHEMA_VERSION) {
      issues.push(issue("BLOCKING", "PROFILE_VERSION_UNSUPPORTED", "profile", "このアプリで作成されたプロフィール形式ではありません。"));
    }
  }
  deepFiniteNumbers(profile, "", issues, "profile", "profile");
  deepFiniteNumbers(settings, "", issues, "settings", "settings");
  deepFiniteNumbers(draft, "", issues, "draft", "draft");

  const blockingCount = issues.filter((item) => item.severity === "BLOCKING").length;
  const warningCount = issues.filter((item) => item.severity === "WARNING").length;
  const status = blockingCount
    ? RESTORE_STATUS.blocked
    : warningCount
      ? RESTORE_STATUS.review
      : RESTORE_STATUS.supported;
  const counts = Object.freeze({
    records: Array.isArray(records) ? records.length : 0,
    subjectiveFeedback: Array.isArray(feedback) ? feedback.length : 0,
    v27Results: Array.isArray(v27Results) ? v27Results.length : 0,
    regionalResults: Array.isArray(regionalResults) ? regionalResults.length : 0,
    plans: Array.isArray(plans) ? plans.length : 0,
    courses: Array.isArray(courses) ? courses.length : 0,
    runMeasurements: Array.isArray(runMeasurements) ? runMeasurements.length : 0,
    profile: profile == null ? 0 : 1,
    settings: settings == null ? 0 : 1,
    draft: draft == null ? 0 : 1,
  });
  return Object.freeze({
    ok: blockingCount === 0,
    inspectionVersion: RESTORE_INSPECTION_VERSION,
    formatVersion: String(snapshot.formatVersion || ""),
    createdAt: String(snapshot.createdAt || ""),
    status,
    canRestore: status !== RESTORE_STATUS.blocked,
    requiresAcknowledgement: status === RESTORE_STATUS.review,
    counts,
    summary: Object.freeze({ blockingCount, warningCount }),
    issues: Object.freeze(issues),
    snapshot,
  });
}
moduleExports["RESTORE_INSPECTION_VERSION"] = RESTORE_INSPECTION_VERSION;
moduleExports["RESTORE_STATUS"] = RESTORE_STATUS;
moduleExports["inspectBackupSnapshot"] = inspectBackupSnapshot;
internalModules.restoreInspection = moduleExports;
}

// ===== core/storage/backupService.js =====
{
const moduleExports = Object.create(null);
const { INPUT_LIMITS, parseJsonText } = internalModules.inputSafety;
const { inspectBackupSnapshot, RESTORE_STATUS } = internalModules.restoreInspection;
const { STORAGE_KEYS, USER_DATA_STORAGE_KEYS } = internalModules.storageKeys;

const BACKUP_FORMAT_VERSION = "runner-load-app-new-backup-v1";

function blockedInspection(code, message, details = {}) {
  return Object.freeze({
    ok: false,
    status: RESTORE_STATUS.blocked,
    canRestore: false,
    requiresAcknowledgement: false,
    counts: Object.freeze({}),
    summary: Object.freeze({ blockingCount: 1, warningCount: 0 }),
    issues: Object.freeze([Object.freeze({
      severity: "BLOCKING",
      code,
      area: "backup",
      message,
      itemId: "",
      details: Object.freeze({ ...details }),
    })]),
  });
}

function createRestoreChanges(snapshot) {
  return USER_DATA_STORAGE_KEYS.map((key) => {
    if (!Object.prototype.hasOwnProperty.call(snapshot.data, key) || snapshot.data[key] == null) {
      return { key, remove: true };
    }
    return { key, value: snapshot.data[key] };
  });
}

function createBackupService(gateway) {
  function tryCreateBackupSnapshot() {
    const data = {};
    for (const key of USER_DATA_STORAGE_KEYS) {
      const result = gateway.readJsonResult(key, null);
      if (!result.ok) {
        return {
          ok: false,
          code: result.operation === "parse" ? "BACKUP_SOURCE_DATA_CORRUPT" : "BACKUP_SOURCE_READ_FAILED",
          message: result.operation === "parse"
            ? "端末内データの一部を読み取れないため、バックアップを作成できません。"
            : "端末内データへアクセスできないため、バックアップを作成できません。",
          key,
          cause: result,
        };
      }
      data[key] = result.value;
    }
    return {
      ok: true,
      snapshot: Object.freeze({
        formatVersion: BACKUP_FORMAT_VERSION,
        createdAt: new Date().toISOString(),
        data,
      }),
    };
  }

  function createBackupSnapshot() {
    const result = tryCreateBackupSnapshot();
    if (!result.ok) {
      const error = Object.assign(new Error(result.message), result);
      throw error;
    }
    return result.snapshot;
  }

  function tryExportBackupText() {
    const result = tryCreateBackupSnapshot();
    if (!result.ok) return result;
    try {
      return { ok: true, snapshot: result.snapshot, text: JSON.stringify(result.snapshot, null, 2) };
    } catch (error) {
      return {
        ok: false,
        code: "BACKUP_SERIALIZE_FAILED",
        message: "バックアップファイルを作成できませんでした。",
        cause: error,
      };
    }
  }

  function exportBackupText() {
    const result = tryExportBackupText();
    if (!result.ok) {
      const error = Object.assign(new Error(result.message), result);
      throw error;
    }
    return result.text;
  }

  function inspectBackupText(text) {
    const parsed = parseJsonText(text);
    if (!parsed.ok) {
      return blockedInspection(
        parsed.code || "BACKUP_JSON_INVALID",
        parsed.message || "JSONファイルを読み取れませんでした。",
        parsed.details || {},
      );
    }
    return inspectBackupSnapshot(parsed.value, BACKUP_FORMAT_VERSION);
  }

  async function inspectBackupFile(file) {
    if (!file || typeof file.text !== "function") {
      return blockedInspection("BACKUP_FILE_REQUIRED", "バックアップファイルを選択してください。");
    }
    const size = Number(file.size);
    if (Number.isFinite(size) && size > INPUT_LIMITS.backupBytes) {
      return blockedInspection("JSON_TOO_LARGE", "バックアップが大きすぎます。", {
        bytes: size,
        maximumBytes: INPUT_LIMITS.backupBytes,
      });
    }
    try {
      return inspectBackupText(await file.text());
    } catch (error) {
      return blockedInspection("BACKUP_FILE_READ_FAILED", "バックアップファイルを読み取れませんでした。", {
        message: String(error?.message || error || "file_read_failed"),
      });
    }
  }

  function validateBackupSnapshot(snapshot) {
    return inspectBackupSnapshot(snapshot, BACKUP_FORMAT_VERSION);
  }

  function restoreInspectedBackup(inspection, options = {}) {
    if (!inspection || inspection.inspectionVersion !== "restore-inspection-v1" || !inspection.snapshot) {
      return { ok: false, code: "RESTORE_INSPECTION_REQUIRED", message: "復元前の検査をやり直してください。" };
    }
    const freshInspection = inspectBackupSnapshot(inspection.snapshot, BACKUP_FORMAT_VERSION);
    if (!freshInspection.canRestore) {
      return { ok: false, code: "BACKUP_RESTORE_BLOCKED", message: "復元できない問題があります。", inspection: freshInspection };
    }
    if (freshInspection.requiresAcknowledgement && options.acceptReview !== true) {
      return { ok: false, code: "BACKUP_REVIEW_ACK_REQUIRED", message: "要確認の内容を確認してください。", inspection: freshInspection };
    }

    const previousResult = tryCreateBackupSnapshot();
    if (!previousResult.ok) {
      return {
        ok: false,
        code: "PRE_RESTORE_BACKUP_FAILED",
        message: "現在の端末内データを安全に退避できないため、復元を中止しました。",
        cause: previousResult,
      };
    }
    const changes = createRestoreChanges(freshInspection.snapshot);
    changes.push({ key: STORAGE_KEYS.historyUndo, remove: true });
    changes.push({
      key: STORAGE_KEYS.backups,
      value: [{
        id: `backup-before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`,
        label: "復元前の自動バックアップ",
        createdAt: new Date().toISOString(),
        snapshot: previousResult.snapshot,
      }],
    });
    const result = gateway.transact(changes);
    return {
      ...result,
      restoredFormatVersion: freshInspection.formatVersion,
      restoreStatus: freshInspection.status,
      counts: freshInspection.counts,
    };
  }

  function restoreBackupText(text) {
    const inspection = inspectBackupText(text);
    if (!inspection.canRestore) {
      return { ok: false, code: "BACKUP_RESTORE_BLOCKED", message: inspection.issues?.[0]?.message || "復元できませんでした。", inspection };
    }
    return restoreInspectedBackup(inspection, { acceptReview: false });
  }

  return Object.freeze({
    createBackupSnapshot,
    tryCreateBackupSnapshot,
    exportBackupText,
    tryExportBackupText,
    inspectBackupText,
    inspectBackupFile,
    validateBackupSnapshot,
    restoreInspectedBackup,
    restoreBackupText,
  });
}
moduleExports["BACKUP_FORMAT_VERSION"] = BACKUP_FORMAT_VERSION;
moduleExports["createBackupService"] = createBackupService;
internalModules.backupService = moduleExports;
}

// ===== core/safety/publicHelpGuidance.js =====
{
const moduleExports = Object.create(null);
const { SUPPORT_NEXT_ACTIONS, URGENT_SAFETY_FLAGS } = internalModules.supportDecision;

const PUBLIC_HELP_GUIDANCE_VERSION = "public-help-guidance-v1";
const PUBLIC_HELP_GUIDANCE_REVIEW_DATE = "2026-08-01";

const PUBLIC_FLAG_LABELS = Object.freeze({
  chestPainOrPressure: "胸の痛み・圧迫感",
  breathingDifficulty: "強い息苦しさ",
  faintingOrConfusion: "失神・意識の混乱",
  heavyBleeding: "大量の出血",
  deformityOrMajorTrauma: "変形または大きな外傷",
});

const OFFICIAL_HELP_REFERENCES = Object.freeze([
  Object.freeze({
    id: "MHLW-URGENCY-119",
    label: "厚生労働省『こんな時は迷わず119へ』",
    url: "https://kakarikata.mhlw.go.jp/kakaritsuke/urgency.html",
    purpose: "119番を検討する症状例の確認",
  }),
  Object.freeze({
    id: "FDMA-119-CALL",
    label: "総務省消防庁『119番緊急通報』",
    url: "https://www.fdma.go.jp/mission/enrichment/kyukyumusen_kinkyutuhou/119.html",
    purpose: "119番通報の方法の確認",
  }),
  Object.freeze({
    id: "FDMA-7119",
    label: "総務省消防庁『救急安心センター事業 #7119』",
    url: "https://www.fdma.go.jp/mission/enrichment/appropriate/appropriate007.html",
    purpose: "救急車を呼ぶか迷う場合の相談窓口と対応地域の確認",
  }),
  Object.freeze({
    id: "FDMA-QSUKE",
    label: "総務省消防庁『全国版救急受診アプリ Q助』",
    url: "https://www.fdma.go.jp/mission/enrichment/appropriate/appropriate003.html",
    purpose: "公式の救急受診ガイドの確認",
  }),
]);

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function buildPublicHelpGuidance(decision = {}) {
  const activeFlags = unique(Array.isArray(decision.activeSafetyFlags)
    ? decision.activeSafetyFlags.map(String)
    : []);
  const officialOverlapFlags = activeFlags.filter((flag) => URGENT_SAFETY_FLAGS.includes(flag));
  const nextActions = Array.isArray(decision.nextActions) ? decision.nextActions : [];
  const shouldPrioritize = String(decision.route || "") === "urgent"
    || nextActions.includes(SUPPORT_NEXT_ACTIONS.checkOfficialHelp);
  return Object.freeze({
    version: PUBLIC_HELP_GUIDANCE_VERSION,
    reviewedAt: PUBLIC_HELP_GUIDANCE_REVIEW_DATE,
    shouldPrioritize,
    selectedItems: Object.freeze(officialOverlapFlags.map((flag) => Object.freeze({
      id: flag,
      label: PUBLIC_FLAG_LABELS[flag] || flag,
    }))),
    references: OFFICIAL_HELP_REFERENCES,
    runtimeRequiresNetwork: false,
    externalLinksOptional: true,
    diagnosisPerformed: false,
    urgencyDeterminedByApp: false,
  });
}
moduleExports["PUBLIC_HELP_GUIDANCE_VERSION"] = PUBLIC_HELP_GUIDANCE_VERSION;
moduleExports["PUBLIC_HELP_GUIDANCE_REVIEW_DATE"] = PUBLIC_HELP_GUIDANCE_REVIEW_DATE;
moduleExports["OFFICIAL_HELP_REFERENCES"] = OFFICIAL_HELP_REFERENCES;
moduleExports["buildPublicHelpGuidance"] = buildPublicHelpGuidance;
internalModules.publicHelpGuidance = moduleExports;
}

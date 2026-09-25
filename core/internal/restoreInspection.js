import "./courseRepository.js";
import { internalModules } from "./modules.js";
import {
  ROF_J_SOURCE_VERSION,
  isSupportedRofJSemanticVersion,
  isSupportedRofJStorageSchema,
  isSupportedRofJLifecycleSchema,
} from "../rofJConstants.js";
import { hasLegacyRofJSourceMetadata } from "../legacyCompatibility.js";

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

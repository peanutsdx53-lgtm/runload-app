import "./v27ApplicationServices.js";
import { internalModules } from "./modules.js";

// ===== core/workflows/recordWorkflow.js =====
{
const moduleExports = Object.create(null);
const { createBodyProfileSnapshot, normalizeBodyProfile } = internalModules.bodyProfileAdjustment;
const { createV27ResultRecord, upsertV27ResultRecord } = internalModules.legacyLoadResultService;
const { isPrimaryRegionalV2Record, stampCurrentRegionalModel } = internalModules.primaryRegionalSnapshot;
const { normalizeRunningRecord, validateRunningRecord, validateRunningRecordInput } = internalModules.inputValidation;
const { normalizeSubjectiveFeedback } = internalModules.subjectiveFeedback;
const { evaluateSupportDecision } = internalModules.supportDecision;
const { STORAGE_KEYS } = internalModules.storageKeys;
const { createPrimaryRegionalV2ResultRecord, upsertPrimaryRegionalV2ResultRecord, validatePrimaryRegionalV2ResultRecord, PRIMARY_REGIONAL_V2_MODEL_VERSION, LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION } = internalModules.primaryRegionalResultService;

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function sortRecords(records = []) {
  return [...records].sort((left, right) => (
    left.date.localeCompare(right.date) || left.id.localeCompare(right.id)
  ));
}

function sortFeedback(items = []) {
  return [...items].sort((left, right) => (
    left.date.localeCompare(right.date) || left.recordId.localeCompare(right.recordId)
  ));
}

function upsertById(items, item, getId) {
  const id = getId(item);
  const nextItems = [...items];
  const index = nextItems.findIndex((entry) => getId(entry) === id);
  if (index >= 0) nextItems[index] = item;
  else nextItems.push(item);
  return nextItems;
}

function regionalResultCreatorForRecord() { return createPrimaryRegionalV2ResultRecord; }

function regionalModelVersionForRecord(record = {}) {
  const stamped = String(record?.regionalModelSnapshot?.modelVersion || "");
  return stamped === LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION ? LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION : PRIMARY_REGIONAL_V2_MODEL_VERSION;
}

function storedRegionalResultForRecord(repository, record = {}) {
  const expectedVersion = regionalModelVersionForRecord(record);
  const rows = repository?.loadForRecord?.(record.id) || [];
  return [...rows]
    .filter((item) => item?.model_version === expectedVersion)
    .sort((left, right) => (
      String(right.source_record_revision || "").localeCompare(String(left.source_record_revision || ""))
      || String(right.generated_at || "").localeCompare(String(left.generated_at || ""))
      || String(right.id || "").localeCompare(String(left.id || ""))
    ))[0] || null;
}

function createModelExperience(
  records,
  subjectiveFeedback,
  targetRecordId,
  modelResultV27Repository,
  modelResultRegionalV2Repository,
) {
  const sortedRecords = sortRecords(records);
  const index = sortedRecords.findIndex((record) => record.id === targetRecordId);
  if (index < 0) return null;
  const record = sortedRecords[index];
  const v27ByRecord = modelResultV27Repository?.latestByRecord?.() || new Map();
  const v27ResultRecord = v27ByRecord.get(targetRecordId) || null;
  const storedRegionalV2ResultRecord = storedRegionalResultForRecord(modelResultRegionalV2Repository, record);
  const feedback = subjectiveFeedback.find((item) => item.recordId === targetRecordId) || null;
  let regionalV2ResultRecord = storedRegionalV2ResultRecord;
  let regionalV2Recovery = null;
  if (storedRegionalV2ResultRecord && storedRegionalV2ResultRecord.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION) {
    const primaryValidation = validatePrimaryRegionalV2ResultRecord(storedRegionalV2ResultRecord);
    const bodyMapRegions = storedRegionalV2ResultRecord.body_map_payload?.regions;
    const bodyMapValid = storedRegionalV2ResultRecord.state === "REST" || (Array.isArray(bodyMapRegions) && bodyMapRegions.length === 12);
    if (!primaryValidation.valid || !bodyMapValid) {
      const sessionSequence = sortedRecords
        .filter((item) => item.date === record.date)
        .findIndex((item) => item.id === record.id) + 1;
      const recovered = createPrimaryRegionalV2ResultRecord({
        record,
        feedback: feedback || {},
        sessionSequence: Math.max(1, sessionSequence),
        allRecords: sortedRecords,
      });
      if (recovered.ok) {
        regionalV2ResultRecord = Object.freeze({
          ...recovered.resultRecord,
          recovery_status: "TRANSIENT_RECONSTRUCTED",
          recovery_source_result_id: storedRegionalV2ResultRecord.id,
        });
        regionalV2Recovery = Object.freeze({
          status: "RECOVERED",
          sourceResultId: storedRegionalV2ResultRecord.id,
          issueCodes: Object.freeze([
            ...primaryValidation.issues,
            ...(bodyMapValid ? [] : ["BODY_MAP_INVALID"]),
          ]),
        });
      } else {
        regionalV2Recovery = Object.freeze({
          status: "FAILED",
          sourceResultId: storedRegionalV2ResultRecord.id,
          issueCodes: Object.freeze([
            ...primaryValidation.issues,
            ...(bodyMapValid ? [] : ["BODY_MAP_INVALID"]),
            recovered.code || "RECONSTRUCTION_FAILED",
          ]),
        });
      }
    }
  }
  const supportDecision = feedback?.supportDecisionSnapshot
    || evaluateSupportDecision({ feedback: feedback || {}, planOutcome: record.planOutcome || {} });
  return Object.freeze({
    record: cloneValue(record),
    feedback: cloneValue(feedback),
    v27ResultRecord: cloneValue(v27ResultRecord),
    v27Result: cloneValue(v27ResultRecord?.result || null),
    regionalV2ResultRecord: cloneValue(regionalV2ResultRecord),
    regionalV2Result: cloneValue(regionalV2ResultRecord?.result || null),
    bodyMapV2: cloneValue(regionalV2ResultRecord?.body_map_payload || null),
    regionalV2Recovery: cloneValue(regionalV2Recovery),
    regionalSemanticState: regionalV2ResultRecord?.model_version === LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION ? "LEGACY_V2_RESTORED_NOT_REINTERPRETED" : regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION ? "REFERENCE100_V3" : "NONE",
    personalReferenceSnapshots: cloneValue(v27ResultRecord?.personal_reference_snapshots || {}),
    supportDecision: cloneValue(supportDecision),
  });
}

function createRecordWorkflow({
  gateway,
  recordsRepository,
  subjectiveFeedbackRepository,
  profileRepository,
  modelResultV27Repository,
  modelResultRegionalV2Repository,
}) {
  function loadCollectionForMutation(repository, sourceName) {
    const result = repository?.loadAllResult?.();
    if (result?.ok) return result;
    if (result && !result.ok) {
      return {
        ...result,
        code: "STORAGE_SOURCE_READ_FAILED",
        details: { ...(result.details || {}), sourceName, sourceCode: result.code || "" },
      };
    }
    return {
      ok: false,
      code: "STORAGE_SOURCE_READ_FAILED",
      operation: "read",
      message: `Unable to read ${sourceName}.`,
      details: { sourceName, sourceCode: "LOAD_RESULT_UNAVAILABLE" },
      items: [],
    };
  }

  function saveRecordAndFeedback(recordInput = {}, feedbackInput = {}, profileInput = undefined) {
    const inputValidation = validateRunningRecordInput(recordInput);
    if (!inputValidation.ok) {
      return {
        ok: false,
        code: "RUNNING_RECORD_INPUT_VALIDATION_FAILED",
        validation: inputValidation,
      };
    }

    const recordsRead = loadCollectionForMutation(recordsRepository, "records");
    if (!recordsRead.ok) return recordsRead;
    const feedbackRead = loadCollectionForMutation(subjectiveFeedbackRepository, "subjectiveFeedback");
    if (!feedbackRead.ok) return feedbackRead;
    const v27Read = loadCollectionForMutation(modelResultV27Repository, "modelResultsV27");
    if (!v27Read.ok) return v27Read;
    const regionalRead = loadCollectionForMutation(modelResultRegionalV2Repository, "modelResultsRegionalV2");
    if (!regionalRead.ok) return regionalRead;


    const currentRecords = recordsRead.items;
    const currentFeedback = feedbackRead.items;
    const existingRecord = recordInput.id
      ? currentRecords.find((record) => record.id === recordInput.id)
      : null;
    const nowIso = new Date().toISOString();
    const explicitProfile = profileInput && typeof profileInput === "object";
    const profileRead = explicitProfile
      ? { ok: true, value: normalizeBodyProfile(profileInput) }
      : profileRepository?.loadResult?.();
    if (!profileRead?.ok) {
      return {
        ...(profileRead || {}),
        ok: false,
        code: "STORAGE_SOURCE_READ_FAILED",
        operation: profileRead?.operation || "read",
        message: profileRead?.message || "Unable to read profile.",
        details: { ...(profileRead?.details || {}), sourceName: "profile", sourceCode: profileRead?.code || "LOAD_RESULT_UNAVAILABLE" },
      };
    }
    const normalizedProfile = normalizeBodyProfile(profileRead.value || {});
    const bodyProfileSnapshot = normalizedProfile
      ? createBodyProfileSnapshot(normalizedProfile, nowIso)
      : existingRecord?.bodyProfileSnapshot || null;
    const versionedRecordInput = stampCurrentRegionalModel({
      ...recordInput,
      regionalModelSnapshot: existingRecord?.regionalModelSnapshot || recordInput.regionalModelSnapshot,
      bodyProfileSnapshot,
      createdAt: existingRecord?.createdAt || recordInput.createdAt,
    });
    const normalizedRecordBase = normalizeRunningRecord(versionedRecordInput, {
      existingIds: currentRecords
        .filter((record) => record.id !== recordInput.id)
        .map((record) => record.id),
      nowIso,
      assumeExplicitRpe: true,
    });
    const normalizedRecord = stampCurrentRegionalModel(normalizedRecordBase);
    const recordValidation = validateRunningRecord(normalizedRecord);
    if (!recordValidation.ok) {
      return {
        ok: false,
        code: "RUNNING_RECORD_VALIDATION_FAILED",
        validation: recordValidation,
      };
    }

    const normalizedFeedback = normalizeSubjectiveFeedback({
      ...feedbackInput,
      recordId: normalizedRecord.id,
      date: normalizedRecord.date,
      checkedAt: feedbackInput.checkedAt || nowIso,
    }, {
      planOutcome: normalizedRecord.planOutcome || {},
    });

    const nextRecords = sortRecords(upsertById(
      currentRecords,
      normalizedRecord,
      (record) => record.id,
    ));
    const nextFeedback = sortFeedback(upsertById(
      currentFeedback,
      normalizedFeedback,
      (item) => item.recordId,
    ));
    const currentV27Results = v27Read.items;
    const currentRegionalV2Results = regionalRead.items;
    // Secondary V2.7 is legacy-only for new/current records. Existing stored V2.7 results remain untouched for restore/history compatibility.
    const calculation = Object.freeze({ ok: true, resultRecord: null, state: "LEGACY_V27_NEW_GENERATION_RETIRED" });
    const nextV27Results = currentV27Results;
    const regionalCalculation = regionalResultCreatorForRecord(normalizedRecord)({
      record: normalizedRecord,
      feedback: normalizedFeedback,
      sessionSequence: nextRecords.filter((item) => item.date === normalizedRecord.date).findIndex((item) => item.id === normalizedRecord.id) + 1,
      allRecords: nextRecords,
    });
    if (!regionalCalculation.ok) {
      return { ok: false, code: regionalCalculation.code || "REGIONAL_V1_RESULT_CREATION_FAILED", validation: regionalCalculation.validation || null, message: regionalCalculation.error?.messageKey || "" };
    }
    const nextRegionalV2Results = upsertPrimaryRegionalV2ResultRecord(currentRegionalV2Results, regionalCalculation.resultRecord);

    const changes = [
      { key: STORAGE_KEYS.records, value: nextRecords },
      { key: STORAGE_KEYS.subjectiveFeedback, value: nextFeedback },
      { key: STORAGE_KEYS.modelResultsV27, value: nextV27Results },
      { key: STORAGE_KEYS.modelResultsRegionalV2, value: nextRegionalV2Results },
    ];
    if (explicitProfile) {
      changes.push({ key: STORAGE_KEYS.profile, value: normalizedProfile });
    }
    const saveResult = gateway.transact(changes);
    if (!saveResult.ok) {
      return {
        ...saveResult,
        code: "RECORD_EXPERIENCE_SAVE_FAILED",
      };
    }

    return {
      ok: true,
      record: cloneValue(normalizedRecord),
      feedback: cloneValue(normalizedFeedback),
      resultRecord: null,
      primaryRegionalV2ResultRecord: cloneValue(regionalCalculation.resultRecord),
      experience: createModelExperience(
        nextRecords,
        nextFeedback,
        normalizedRecord.id,
        modelResultV27Repository,
        modelResultRegionalV2Repository,
      ),
    };
  }

  function loadExperience(recordId) {
    if (!recordId) return null;
    return createModelExperience(
      recordsRepository.loadAll(),
      subjectiveFeedbackRepository.loadAll(),
      recordId,
      modelResultV27Repository,
      modelResultRegionalV2Repository,
    );
  }

  function loadLatestExperience() {
    const records = recordsRepository.loadAll();
    const latestRecord = [...records].sort((left, right) => (
      right.date.localeCompare(left.date) || right.id.localeCompare(left.id)
    ))[0];
    return latestRecord ? loadExperience(latestRecord.id) : null;
  }

  function loadAllExperiences() {
    const records = recordsRepository.loadAll();
    const feedback = subjectiveFeedbackRepository.loadAll();
    return records.map((record) => createModelExperience(
      records,
      feedback,
      record.id,
      modelResultV27Repository,
      modelResultRegionalV2Repository,
    ));
  }

  return Object.freeze({
    saveRecordAndFeedback,
    loadExperience,
    loadLatestExperience,
    loadAllExperiences,
  });
}
moduleExports["createRecordWorkflow"] = createRecordWorkflow;
internalModules.recordWorkflow = moduleExports;
}

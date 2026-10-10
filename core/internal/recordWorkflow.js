import { cloneJsonValue as cloneValue } from "../../shared/valueUtilities.js";
import "./applicationDomain.js";
import { internalModules } from "./modules.js";

// ===== core/workflows/recordWorkflow.js =====
{
const moduleExports = Object.create(null);
const { createBodyProfileSnapshot, normalizeBodyProfile } = internalModules.bodyProfileAdjustment;
const { stampCurrentRegionalModel } = internalModules.primaryRegionalSnapshot;
const { normalizeRunningRecord, validateRunningRecord, validateRunningRecordInput } = internalModules.inputValidation;
const { normalizeSubjectiveFeedback } = internalModules.subjectiveFeedback;
const { evaluateSupportDecision } = internalModules.supportDecision;
const { STORAGE_KEYS } = internalModules.storageKeys;
const { createPrimaryRegionalV2ResultRecord, upsertPrimaryRegionalV2ResultRecord, validatePrimaryRegionalV2ResultRecord, PRIMARY_REGIONAL_V2_MODEL_VERSION, PREVIOUS_REGIONAL_V3_MODEL_VERSION } = internalModules.primaryRegionalResultService;


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

function storedRegionalResultForRecord(repository, record = {}) {
  const rows = repository?.loadForRecord?.(record.id) || [];
  const currentRevision = String(record.updatedAt || record.createdAt || "");
  // A prior semantic version is a read-only historical result. Never replace it
  // with a newly calculated value under the old name or select it in preference
  // to the current model for the same revision.
  const supported = rows.filter((item) => item?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION
    || item?.model_version === PREVIOUS_REGIONAL_V3_MODEL_VERSION);
  const matching = supported.filter((item) => String(item.source_record_revision || "") === currentRevision);
  const available = matching.length ? matching : supported.filter((item) => item.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION);
  return available.sort((left, right) => (
    Number(right.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION) - Number(left.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION)
    || String(right.source_record_revision || "").localeCompare(String(left.source_record_revision || ""))
    || String(right.generated_at || "").localeCompare(String(left.generated_at || ""))
    || String(right.id || "").localeCompare(String(left.id || ""))
  ))[0] || null;
}

function createModelExperience(
  records,
  subjectiveFeedback,
  targetRecordId,
  modelResultRegionalV2Repository,
) {
  const sortedRecords = sortRecords(records);
  const index = sortedRecords.findIndex((record) => record.id === targetRecordId);
  if (index < 0) return null;
  const record = sortedRecords[index];
  const storedRegionalV2ResultRecord = storedRegionalResultForRecord(modelResultRegionalV2Repository, record);
  const feedback = subjectiveFeedback.find((item) => item.recordId === targetRecordId) || null;
  let regionalV2ResultRecord = storedRegionalV2ResultRecord;
  let regionalV2Recovery = null;

  if (storedRegionalV2ResultRecord) {
    const isPriorResult = storedRegionalV2ResultRecord.model_version === PREVIOUS_REGIONAL_V3_MODEL_VERSION;
    const primaryValidation = validatePrimaryRegionalV2ResultRecord(storedRegionalV2ResultRecord, {allowLegacy:isPriorResult});
    const bodyMapRegions = storedRegionalV2ResultRecord.body_map_payload?.regions;
    const bodyMapValid = storedRegionalV2ResultRecord.state === "REST" || (Array.isArray(bodyMapRegions) && bodyMapRegions.length === 12);
    const sourceRevisionMatches = String(storedRegionalV2ResultRecord.source_record_revision || "") === String(record.updatedAt || record.createdAt || "");
    if (isPriorResult && (!primaryValidation.valid || !bodyMapValid || !sourceRevisionMatches)) {
      // Never silently replace a damaged historic calculation with the new
      // model's numbers. Keep the stored record in the repository as evidence.
      regionalV2ResultRecord = null;
      regionalV2Recovery = Object.freeze({status:"HISTORIC_ARCHIVE_UNAVAILABLE",sourceResultId:storedRegionalV2ResultRecord.id,
        issueCodes:Object.freeze([...primaryValidation.issues,
          ...(bodyMapValid?[]:["BODY_MAP_INVALID"]),
          ...(sourceRevisionMatches?[]:["SOURCE_RECORD_REVISION_MISMATCH"])])});
    } else if (!primaryValidation.valid || !bodyMapValid || !sourceRevisionMatches) {
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
            ...(sourceRevisionMatches ? [] : ["SOURCE_RECORD_REVISION_MISMATCH"]),
          ]),
        });
      } else {
        regionalV2Recovery = Object.freeze({
          status: "FAILED",
          sourceResultId: storedRegionalV2ResultRecord.id,
          issueCodes: Object.freeze([
            ...primaryValidation.issues,
            ...(bodyMapValid ? [] : ["BODY_MAP_INVALID"]),
            ...(sourceRevisionMatches ? [] : ["SOURCE_RECORD_REVISION_MISMATCH"]),
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
    regionalV2ResultRecord: cloneValue(regionalV2ResultRecord),
    regionalV2Result: cloneValue(regionalV2ResultRecord?.result || null),
    bodyMapV2: cloneValue(regionalV2ResultRecord?.body_map_payload || null),
    regionalV2Recovery: cloneValue(regionalV2Recovery),
    regionalSemanticState: regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION ? "REFERENCE100_V3"
      : regionalV2ResultRecord?.model_version === PREVIOUS_REGIONAL_V3_MODEL_VERSION ? "REFERENCE100_V3_HISTORIC_READ_ONLY" : "NONE",
    supportDecision: cloneValue(supportDecision),
  });
}

function createRecordWorkflow({
  gateway,
  recordsRepository,
  subjectiveFeedbackRepository,
  profileRepository,
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
    const currentRegionalV2Results = regionalRead.items;
    const regionalCalculation = createPrimaryRegionalV2ResultRecord({
      record: normalizedRecord,
      feedback: normalizedFeedback,
      sessionSequence: nextRecords.filter((item) => item.date === normalizedRecord.date).findIndex((item) => item.id === normalizedRecord.id) + 1,
      allRecords: nextRecords,
    });
    if (!regionalCalculation.ok) {
      return { ok: false, code: regionalCalculation.code || "REGIONAL_RESULT_CREATION_FAILED", validation: regionalCalculation.validation || null, message: regionalCalculation.error?.messageKey || "" };
    }
    const nextRegionalV2Results = upsertPrimaryRegionalV2ResultRecord(currentRegionalV2Results, regionalCalculation.resultRecord);

    const changes = [
      { key: STORAGE_KEYS.records, value: nextRecords },
      { key: STORAGE_KEYS.subjectiveFeedback, value: nextFeedback },
      { key: STORAGE_KEYS.modelResultsRegionalV2, value: nextRegionalV2Results },
    ];
    if (explicitProfile) changes.push({ key: STORAGE_KEYS.profile, value: normalizedProfile });
    const saveResult = gateway.transact(changes);
    if (!saveResult.ok) return { ...saveResult, code: "RECORD_EXPERIENCE_SAVE_FAILED" };

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

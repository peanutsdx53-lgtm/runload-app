import "./v27ApplicationServices.js";
import { internalModules } from "./modules.js";
import {
  ROF_J_STORAGE_SCHEMA_VERSION,
  ROF_J_LIFECYCLE_SCHEMA_VERSION,
} from "../rofJConstants.js";

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

// ===== core/history/historyWorkflow.js =====
{
const moduleExports = Object.create(null);
const { STORAGE_KEYS } = internalModules.storageKeys;

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function localDateFromOffset(daysAgo = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function filterByPeriod(records, period) {
  if (period === "all") return records;
  const days = Number(period);
  if (!Number.isFinite(days) || days <= 0) return records;
  const minimumDate = localDateFromOffset(days - 1);
  return records.filter((record) => record.date >= minimumDate);
}

function hasCompletedSubjectiveCheck(feedback) {
  const status = String(feedback?.checkStatus || "not_asked");
  return !["not_asked", "deferred"].includes(status);
}

function includesText(value, query) {
  return String(value || "").toLocaleLowerCase("ja-JP").includes(query);
}

function removeRecordReferencesFromPlan(plan, recordId) {
  if (plan.sourceRecordId !== recordId && plan.actualRecordId !== recordId) return plan;
  return {
    ...plan,
    sourceRecordId: plan.sourceRecordId === recordId ? "" : plan.sourceRecordId,
    actualRecordId: plan.actualRecordId === recordId ? "" : plan.actualRecordId,
  };
}

function restorePlanReferences(currentPlan, previousPlan, recordId) {
  if (!currentPlan) return null;
  return {
    ...currentPlan,
    sourceRecordId: previousPlan.sourceRecordId === recordId && !currentPlan.sourceRecordId
      ? recordId
      : currentPlan.sourceRecordId,
    actualRecordId: previousPlan.actualRecordId === recordId && !currentPlan.actualRecordId
      ? recordId
      : currentPlan.actualRecordId,
  };
}

function createHistoryWorkflow({
  gateway,
  recordsRepository,
  modelResultV27Repository,
  modelResultRegionalV2Repository,
  subjectiveFeedbackRepository,
  planRepository,
  rofJRepository = null,
  rofJLifecycleRepository = null,
}) {
  function readCollectionForMutation(repository, sourceName) {
    const result = repository?.loadAllResult?.();
    if (result?.ok) return result;
    return {
      ...(result || {}),
      ok: false,
      code: "HISTORY_SOURCE_READ_FAILED",
      operation: result?.operation || "read",
      message: result?.message || `Unable to read ${sourceName}.`,
      details: { ...(result?.details || {}), sourceName, sourceCode: result?.code || "LOAD_RESULT_UNAVAILABLE" },
      items: [],
    };
  }

  function readOptionalEnvelopeForMutation(repository, sourceName, emptyEnvelope) {
    if (!repository) return { ok: true, exists: false, envelope: emptyEnvelope() };
    const result = repository?.loadEnvelopeResult?.();
    if (result?.ok) return result;
    return {
      ...(result || {}),
      ok: false,
      code: "HISTORY_SOURCE_READ_FAILED",
      operation: result?.operation || "read",
      message: result?.message || `Unable to read ${sourceName}.`,
      details: { ...(result?.details || {}), sourceName, sourceCode: result?.code || "LOAD_RESULT_UNAVAILABLE" },
      envelope: emptyEnvelope(),
    };
  }

  function search(filters = {}) {
    const query = String(filters.query || "").trim().toLocaleLowerCase("ja-JP");
    const activityType = String(filters.activityType || "all");
    const subjective = String(filters.subjective || "all");
    const allFeedback = subjectiveFeedbackRepository.loadAll();
    const feedbackByRecordId = new Map(allFeedback.map((item) => [item.recordId, item]));
    const records = filterByPeriod(recordsRepository.loadAll(), filters.period || "28")
      .filter((record) => activityType === "all" || record.activityType === activityType)
      .filter((record) => {
        const feedback = feedbackByRecordId.get(record.id) || null;
        const subjectiveCheckCompleted = hasCompletedSubjectiveCheck(feedback);
        if (subjective === "entered" && !subjectiveCheckCompleted) return false;
        if (subjective === "none" && subjectiveCheckCompleted) return false;
        if (!query) return true;
        const searchable = [
          record.date,
          record.memo,
          record.course?.name,
          feedback?.consultationNote,
          ...(feedback?.bodyAreaObservations || []).map((item) => item?.label || item?.areaId || ""),
        ];
        return searchable.some((value) => includesText(value, query));
      })
      .sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id));

    return records.map((record) => ({
      record: cloneValue(record),
      feedback: cloneValue(feedbackByRecordId.get(record.id) || null),
    }));
  }

  function deleteRecord(recordId) {
    const recordsRead = readCollectionForMutation(recordsRepository, "records");
    if (!recordsRead.ok) return recordsRead;
    const records = recordsRead.items;
    const record = records.find((item) => item.id === recordId);
    if (!record) return { ok: false, code: "HISTORY_RECORD_NOT_FOUND" };
    const feedbackRead = readCollectionForMutation(subjectiveFeedbackRepository, "subjectiveFeedback");
    if (!feedbackRead.ok) return feedbackRead;
    const feedbackItems = feedbackRead.items;
    const removedFeedback = feedbackItems.find((item) => item.recordId === recordId) || null;
    const v27Read = readCollectionForMutation(modelResultV27Repository, "modelResultsV27");
    if (!v27Read.ok) return v27Read;
    const modelResultItems = v27Read.items;
    const removedModelResults = modelResultItems.filter((item) => item.record_id === recordId);
    const regionalRead = readCollectionForMutation(modelResultRegionalV2Repository, "modelResultsRegionalV2");
    if (!regionalRead.ok) return regionalRead;
    const regionalV2Items = regionalRead.items;
    const removedRegionalV2Results = regionalV2Items.filter((item) => item.record_id === recordId);
    const rofJRead = readOptionalEnvelopeForMutation(
      rofJRepository,
      "rofJ",
      () => ({ schemaVersion: ROF_J_STORAGE_SCHEMA_VERSION, entries: {} }),
    );
    if (!rofJRead.ok) return rofJRead;
    const removedRofJ = cloneValue(rofJRead.envelope.entries?.[recordId] || null);
    const nextRofJEntries = { ...(rofJRead.envelope.entries || {}) };
    delete nextRofJEntries[recordId];
    const lifecycleRead = readOptionalEnvelopeForMutation(
      rofJLifecycleRepository,
      "rofJLifecycle",
      () => ({ schemaVersion: ROF_J_LIFECYCLE_SCHEMA_VERSION, pendingByRunId: {} }),
    );
    if (!lifecycleRead.ok) return lifecycleRead;
    const removedRofJLifecycle = cloneValue(lifecycleRead.envelope.pendingByRunId?.[recordId] || null);
    const nextLifecycleEntries = { ...(lifecycleRead.envelope.pendingByRunId || {}) };
    delete nextLifecycleEntries[recordId];
    const plansRead = readCollectionForMutation(planRepository, "plans");
    if (!plansRead.ok) return plansRead;
    const plans = plansRead.items;
    const affectedPlans = plans.filter((plan) => plan.sourceRecordId === recordId || plan.actualRecordId === recordId);
    const nextPlans = plans.map((plan) => removeRecordReferencesFromPlan(plan, recordId));
    const runMeasurementsRead = gateway.readJsonResult(STORAGE_KEYS.runMeasurements, []);
    if (!runMeasurementsRead.ok || !Array.isArray(runMeasurementsRead.value)) {
      return { ...(runMeasurementsRead || {}), ok: false, code: "HISTORY_SOURCE_READ_FAILED", sourceName: "runMeasurements" };
    }
    const runMeasurements = runMeasurementsRead.value;
    const removedRunMeasurement = cloneValue(runMeasurements.find((item) => item?.recordId === recordId) || null);
    const undoEntry = {
      version: 7,
      deletedAt: new Date().toISOString(),
      record,
      feedback: removedFeedback,
      modelResultsV27: removedModelResults,
      modelResultsRegionalV2: removedRegionalV2Results,
      rofJ: removedRofJ,
      rofJLifecycle: removedRofJLifecycle,
      runMeasurement: removedRunMeasurement,
      affectedPlans,
    };
    const operations = [
      { key: STORAGE_KEYS.records, value: records.filter((item) => item.id !== recordId) },
      { key: STORAGE_KEYS.subjectiveFeedback, value: feedbackItems.filter((item) => item.recordId !== recordId) },
      { key: STORAGE_KEYS.modelResultsV27, value: modelResultItems.filter((item) => item.record_id !== recordId) },
      { key: STORAGE_KEYS.modelResultsRegionalV2, value: regionalV2Items.filter((item) => item.record_id !== recordId) },
      { key: STORAGE_KEYS.plans, value: nextPlans },
      { key: STORAGE_KEYS.runMeasurements, value: runMeasurements.filter((item) => item?.recordId !== recordId) },
      { key: STORAGE_KEYS.historyUndo, value: undoEntry },
    ];
    if (rofJRepository) operations.push({
      key: STORAGE_KEYS.rofJ,
      value: { schemaVersion: rofJRead.envelope.schemaVersion, entries: nextRofJEntries },
    });
    if (rofJLifecycleRepository) operations.push({
      key: STORAGE_KEYS.rofJLifecycle,
      value: { schemaVersion: lifecycleRead.envelope.schemaVersion, pendingByRunId: nextLifecycleEntries },
    });
    const result = gateway.transact(operations);
    return { ...result, deleted: result.ok, undoEntry: result.ok ? cloneValue(undoEntry) : null };
  }

  function loadUndoEntry() {
    return gateway.readJson(STORAGE_KEYS.historyUndo, null);
  }

  function loadUndoEntryResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.historyUndo, null);
    if (!result.ok) return { ...result, code: "HISTORY_SOURCE_READ_FAILED", entry: null };
    if (result.value != null && (typeof result.value !== "object" || Array.isArray(result.value))) {
      return { ok: false, code: "HISTORY_UNDO_INVALID", operation: "validate", key: STORAGE_KEYS.historyUndo, entry: null };
    }
    return { ok: true, key: STORAGE_KEYS.historyUndo, exists: result.exists, entry: result.value };
  }

  function undoDelete() {
    const undoRead = loadUndoEntryResult();
    if (!undoRead.ok) return undoRead;
    const entry = undoRead.entry;
    if (!entry?.record?.id) return { ok: false, code: "HISTORY_UNDO_NOT_AVAILABLE" };
    const recordId = entry.record.id;
    const recordsRead = readCollectionForMutation(recordsRepository, "records");
    if (!recordsRead.ok) return recordsRead;
    const records = recordsRead.items.filter((item) => item.id !== recordId);
    records.push(entry.record);
    const feedbackRead = readCollectionForMutation(subjectiveFeedbackRepository, "subjectiveFeedback");
    if (!feedbackRead.ok) return feedbackRead;
    const feedbackItems = feedbackRead.items.filter((item) => item.recordId !== recordId);
    if (entry.feedback) feedbackItems.push(entry.feedback);
    const removedResultIds = new Set(
      (entry.modelResultsV27 || []).map((item) => item.id),
    );
    const v27Read = readCollectionForMutation(modelResultV27Repository, "modelResultsV27");
    if (!v27Read.ok) return v27Read;
    const modelResultItems = v27Read.items
      .filter((item) => !removedResultIds.has(item.id));
    modelResultItems.push(...(entry.modelResultsV27 || []));
    const removedRegionalV2Ids = new Set((entry.modelResultsRegionalV2 || []).map((item) => item.id));
    const regionalRead = readCollectionForMutation(modelResultRegionalV2Repository, "modelResultsRegionalV2");
    if (!regionalRead.ok) return regionalRead;
    const regionalV2Items = regionalRead.items.filter((item) => !removedRegionalV2Ids.has(item.id));
    regionalV2Items.push(...(entry.modelResultsRegionalV2 || []));

    const rofJRead = readOptionalEnvelopeForMutation(
      rofJRepository,
      "rofJ",
      () => ({ schemaVersion: ROF_J_STORAGE_SCHEMA_VERSION, entries: {} }),
    );
    if (!rofJRead.ok) return rofJRead;
    const nextRofJEntries = { ...(rofJRead.envelope.entries || {}) };
    const hasRofJUndo = Object.prototype.hasOwnProperty.call(entry, "rofJ")
      || Object.prototype.hasOwnProperty.call(entry, "secondPillarRofJ");
    const undoRofJ = Object.prototype.hasOwnProperty.call(entry, "rofJ") ? entry.rofJ : entry.secondPillarRofJ;
    if (hasRofJUndo) {
      delete nextRofJEntries[recordId];
      if (undoRofJ) nextRofJEntries[recordId] = cloneValue(undoRofJ);
    }
    const lifecycleRead = readOptionalEnvelopeForMutation(
      rofJLifecycleRepository,
      "rofJLifecycle",
      () => ({ schemaVersion: ROF_J_LIFECYCLE_SCHEMA_VERSION, pendingByRunId: {} }),
    );
    if (!lifecycleRead.ok) return lifecycleRead;
    const nextLifecycleEntries = { ...(lifecycleRead.envelope.pendingByRunId || {}) };
    const hasRofJLifecycleUndo = Object.prototype.hasOwnProperty.call(entry, "rofJLifecycle")
      || Object.prototype.hasOwnProperty.call(entry, "secondPillarLifecycle");
    const undoRofJLifecycle = Object.prototype.hasOwnProperty.call(entry, "rofJLifecycle") ? entry.rofJLifecycle : entry.secondPillarLifecycle;
    if (hasRofJLifecycleUndo) {
      delete nextLifecycleEntries[recordId];
      if (undoRofJLifecycle) nextLifecycleEntries[recordId] = cloneValue(undoRofJLifecycle);
    }

    const plansRead = readCollectionForMutation(planRepository, "plans");
    if (!plansRead.ok) return plansRead;
    const currentPlans = plansRead.items;
    const previousPlansById = new Map((entry.affectedPlans || []).map((plan) => [plan.id, plan]));
    const nextPlans = currentPlans.map((plan) => (
      previousPlansById.has(plan.id)
        ? restorePlanReferences(plan, previousPlansById.get(plan.id), recordId)
        : plan
    )).filter(Boolean);

    const runMeasurementsRead = gateway.readJsonResult(STORAGE_KEYS.runMeasurements, []);
    if (!runMeasurementsRead.ok || !Array.isArray(runMeasurementsRead.value)) {
      return { ...(runMeasurementsRead || {}), ok: false, code: "HISTORY_SOURCE_READ_FAILED", sourceName: "runMeasurements" };
    }
    const nextRunMeasurements = runMeasurementsRead.value.filter((item) => item?.recordId !== recordId);
    if (entry.runMeasurement) nextRunMeasurements.push(cloneValue(entry.runMeasurement));

    const operations = [
      { key: STORAGE_KEYS.records, value: records },
      { key: STORAGE_KEYS.subjectiveFeedback, value: feedbackItems },
      { key: STORAGE_KEYS.modelResultsV27, value: modelResultItems },
      { key: STORAGE_KEYS.modelResultsRegionalV2, value: regionalV2Items },
      { key: STORAGE_KEYS.plans, value: nextPlans },
      { key: STORAGE_KEYS.runMeasurements, value: nextRunMeasurements },
      { key: STORAGE_KEYS.historyUndo, remove: true },
    ];
    if (rofJRepository && hasRofJUndo) operations.push({
      key: STORAGE_KEYS.rofJ,
      value: { schemaVersion: ROF_J_STORAGE_SCHEMA_VERSION, entries: nextRofJEntries },
    });
    if (rofJLifecycleRepository && hasRofJLifecycleUndo) operations.push({
      key: STORAGE_KEYS.rofJLifecycle,
      value: { schemaVersion: ROF_J_LIFECYCLE_SCHEMA_VERSION, pendingByRunId: nextLifecycleEntries },
    });
    const result = gateway.transact(operations);
    return { ...result, restored: result.ok, record: result.ok ? cloneValue(entry.record) : null };
  }

  return Object.freeze({ search, deleteRecord, loadUndoEntry, loadUndoEntryResult, undoDelete });
}
moduleExports["createHistoryWorkflow"] = createHistoryWorkflow;
internalModules.historyWorkflow = moduleExports;
}

// ===== core/planning/planPreviewV27.js =====
{
const moduleExports = Object.create(null);
const { SURFACE_FIELDS } = internalModules.modelConstants;
const { V27_ACTIVITY_TYPES, V27_EMPHASIS_REGION_IDS, V27_MODEL_VERSION, V27_REGIONAL_VIEW_IDS } = internalModules.legacyLoadModelConstants;
const { adaptRecordToV27Session } = internalModules.legacyLoadInputAdapter;
const { assertV27ResultSemantics, calculateV27Session } = internalModules.legacyLoadModel;
const { validateRunningRecordInput } = internalModules.inputValidation;

const GRADE_KNOWLEDGE = new Set(["UNKNOWN", "KNOWN_FLAT", "KNOWN_PROFILE"]);
const SURFACE_CLASSES = new Set([
  "REF_HARD_EVEN_STABLE",
  "DRY_STABLE_GRASS_TURF",
  "DEEP_DRY_SOFT_SAND",
  "EXPLICIT_UNEVEN",
  "KNOWN_OTHER",
  "UNKNOWN",
]);
const RUNNING_FORMATS = new Set(Object.values(V27_ACTIVITY_TYPES));
const PLAN_FACT_PREVIEW_VERSION = "plan-facts-v1";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function provided(value) {
  return value !== undefined && value !== null && value !== "";
}

function validateRawV27PlanSession(session = {}) {
  const errors = [];
  const activityType = String(session?.activityType || "run");
  if (!["run", "rest"].includes(activityType)) {
    errors.push({
      field: "activityType",
      code: "INVALID_PLAN_ACTIVITY_TYPE",
      message: "予定の種類を選び直してください。",
    });
  }
  if (activityType !== "rest") {
    const runningFormat = String(session?.runningFormat || "UNKNOWN").toUpperCase();
    if (!RUNNING_FORMATS.has(runningFormat)) {
      errors.push({
        field: "runningFormat",
        code: "INVALID_PLAN_RUNNING_FORMAT",
        message: "予定の走行形式を選び直してください。",
      });
    }
    const course = session?.course && typeof session.course === "object"
      ? session.course
      : {};
    const gradeKnowledge = String(course.gradeKnowledge || "UNKNOWN").toUpperCase();
    if (!GRADE_KNOWLEDGE.has(gradeKnowledge)) {
      errors.push({
        field: "course.gradeKnowledge",
        code: "INVALID_PLAN_GRADE_KNOWLEDGE",
        message: "予定の坂道の入力方法を選び直してください。",
      });
    }
    const modelSurfaceClass = String(course.modelSurfaceClass || "UNKNOWN").toUpperCase();
    if (!SURFACE_CLASSES.has(modelSurfaceClass)) {
      errors.push({
        field: "course.modelSurfaceClass",
        code: "INVALID_PLAN_SURFACE_CLASS",
        message: "予定の路面材質を選び直してください。",
      });
    }
    const surfaceValues = SURFACE_FIELDS.map(({ recordKey }) => Number(course[recordKey] || 0));
    if (surfaceValues.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
      errors.push({ field: "course", code: "INVALID_PLAN_SURFACE_SHARE", message: "予定の路面割合を0〜100で入力してください。" });
    } else {
      const total = surfaceValues.reduce((sum, value) => sum + value, 0);
      if (total > 0 && Math.abs(total - 100) > 0.01) errors.push({ field: "course", code: "PLAN_SURFACE_SUM_NOT_100", message: "予定の路面割合の合計を100%にしてください。" });
    }
    [
      "upPercent",
      "downPercent",
      "upGradePercent",
      "downGradePercent",
    ].forEach((field) => {
      if (!provided(course[field])) return;
      const value = Number(course[field]);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        errors.push({
          field: `course.${field}`,
          code: "INVALID_PLAN_GRADE_VALUE",
          message: "予定の坂道割合・代表勾配は0〜100の数値で入力してください。",
        });
      }
    });
  }
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
  });
}

function normalizeCourse(course = {}) {
  const source = course && typeof course === "object" ? course : {};
  const gradeKnowledge = String(source.gradeKnowledge || "UNKNOWN").toUpperCase();
  const modelSurfaceClass = String(source.modelSurfaceClass || "UNKNOWN").toUpperCase();
  const normalized = {
    ...JSON.parse(JSON.stringify(source)),
    name: String(source.name || "").trim(),
    gradeKnowledge: GRADE_KNOWLEDGE.has(gradeKnowledge) ? gradeKnowledge : "UNKNOWN",
    upPercent: finiteNumber(source.upPercent),
    downPercent: finiteNumber(source.downPercent),
    upGradePercent: finiteNumber(source.upGradePercent),
    downGradePercent: finiteNumber(source.downGradePercent),
    surfaceInputMode: ["UNKNOWN", "SINGLE", "MIXED"].includes(String(source.surfaceInputMode || "").toUpperCase()) ? String(source.surfaceInputMode).toUpperCase() : "UNKNOWN",
    modelSurfaceClass: SURFACE_CLASSES.has(modelSurfaceClass) ? modelSurfaceClass : "UNKNOWN",
    modelSurfaceProfile: Array.isArray(source.modelSurfaceProfile) ? source.modelSurfaceProfile.map((item) => ({ sharePercent: finiteNumber(item?.sharePercent), surfaceClass: String(item?.surfaceClass || "UNKNOWN") })) : [],
  };
  SURFACE_FIELDS.forEach(({ recordKey }) => { normalized[recordKey] = finiteNumber(source[recordKey]); });
  return Object.freeze(normalized);
}

function normalizeV27PlanSession(session = {}) {
  const activityType = String(session?.activityType || "run") === "rest" ? "rest" : "run";
  const runningFormat = String(session?.runningFormat || "UNKNOWN").toUpperCase();
  return Object.freeze({
    activityType,
    distanceKm: activityType === "rest" ? 0 : finiteNumber(session?.distanceKm),
    durationMinutes: activityType === "rest" ? 0 : finiteNumber(session?.durationMinutes),
    runningFormat: activityType === "rest"
      ? "NOT_APPLICABLE"
      : RUNNING_FORMATS.has(runningFormat)
        ? runningFormat
        : "UNKNOWN",
    course: activityType === "rest" ? normalizeCourse({}) : normalizeCourse(session?.course),
  });
}

function normalizePlanFactSession(session = {}) {
  return normalizeV27PlanSession(session);
}

function clonePlanFactPreview(preview) {
  return preview == null ? preview : JSON.parse(JSON.stringify(preview));
}

function invalidPlanFactPreview(session, validation, message = "") {
  return Object.freeze({
    ok: false,
    state: "INVALID",
    modelVersion: PLAN_FACT_PREVIEW_VERSION,
    session,
    facts: null,
    validation,
    message: message || validation?.errors?.map((item) => item.message || item.code).join(" ") || "予定入力を確認してください。",
  });
}

function createPlanFactPreview({
  session: rawSession = {},
  scheduledDate = "",
  previewId = "plan-fact-preview",
} = {}) {
  const session = normalizePlanFactSession(rawSession);
  const rawValidation = validateRawV27PlanSession(rawSession);
  if (!rawValidation.ok) return invalidPlanFactPreview(session, rawValidation);
  if (session.activityType === "rest") {
    return Object.freeze({
      ok: true,
      state: "REST",
      modelVersion: PLAN_FACT_PREVIEW_VERSION,
      session,
      facts: Object.freeze({ activityType: "rest" }),
      validation: Object.freeze({ ok: true, errors: Object.freeze([]) }),
      message: "休養予定として保存します。",
    });
  }
  const record = previewRecord(session, scheduledDate, previewId);
  const validation = validateRunningRecordInput(record);
  if (!validation.ok) return invalidPlanFactPreview(session, validation);
  return Object.freeze({
    ok: true,
    state: "RUN",
    modelVersion: PLAN_FACT_PREVIEW_VERSION,
    session,
    facts: Object.freeze({
      activityType: "run",
      distanceKm: session.distanceKm,
      durationMinutes: session.durationMinutes,
      runningFormat: session.runningFormat,
      course: session.course,
    }),
    validation,
    message: "入力した予定条件を事実として確認します。旧形式の走行全体スコアは計算しません。",
  });
}

function previewRecord(session, scheduledDate, previewId) {
  return Object.freeze({
    id: previewId,
    date: scheduledDate,
    activityType: session.activityType,
    distanceKm: session.distanceKm,
    durationMinutes: session.durationMinutes,
    runningFormat: session.runningFormat,
    stepsProvenance: "UNKNOWN",
    rpeProvenance: "NOT_REPORTED",
    course: session.course,
  });
}

function invalidPreview(session, validation, message = "") {
  return Object.freeze({
    ok: false,
    state: "INVALID",
    modelVersion: V27_MODEL_VERSION,
    session,
    result: null,
    validation,
    message: message || validation?.errors?.map((item) => item.message || item.code).join(" ") || "予定入力を確認してください。",
    viewContract: Object.freeze({
      available: Object.freeze([
        V27_REGIONAL_VIEW_IDS.withinRun,
        V27_REGIONAL_VIEW_IDS.ownFlat,
      ]),
      personalExcluded: true,
    }),
  });
}

function createV27PlanPreview({
  session: rawSession = {},
  scheduledDate = "",
  previewId = "plan-preview",
} = {}) {
  const session = normalizeV27PlanSession(rawSession);
  const rawValidation = validateRawV27PlanSession(rawSession);
  if (!rawValidation.ok) return invalidPreview(session, rawValidation);
  if (session.activityType === "rest") {
    return Object.freeze({
      ok: true,
      state: "REST",
      modelVersion: V27_MODEL_VERSION,
      session,
      result: null,
      validation: Object.freeze({ ok: true, errors: Object.freeze([]) }),
      message: "休養予定には走行による推定値を作成しません。",
      viewContract: Object.freeze({
        available: Object.freeze([]),
        personalExcluded: true,
      }),
    });
  }
  const record = previewRecord(session, scheduledDate, previewId);
  const validation = validateRunningRecordInput(record);
  if (!validation.ok) return invalidPreview(session, validation);
  const adaptation = adaptRecordToV27Session(record);
  if (!adaptation.ok) return invalidPreview(session, adaptation);
  let result;
  try {
    result = calculateV27Session(adaptation.session);
  } catch (error) {
    return invalidPreview(
      session,
      Object.freeze({
        ok: false,
        errors: Object.freeze([{ code: "PLAN_PREVIEW_CALCULATION_FAILED" }]),
      }),
      String(error?.message || error),
    );
  }
  const semantic = assertV27ResultSemantics(result);
  if (!semantic.ok) return invalidPreview(session, semantic);
  return Object.freeze({
    ok: true,
    state: "RUN",
    modelVersion: V27_MODEL_VERSION,
    session,
    inputSnapshot: Object.freeze({
      session: adaptation.session,
      provenance: adaptation.provenance,
      warnings: adaptation.warnings,
    }),
    result,
    validation,
    message: "予定入力による推定です。実績、処方、最適条件、走行可否を示しません。",
    viewContract: Object.freeze({
      available: Object.freeze([
        V27_REGIONAL_VIEW_IDS.withinRun,
        V27_REGIONAL_VIEW_IDS.ownFlat,
      ]),
      personalExcluded: true,
    }),
    fixedRegionIds: V27_EMPHASIS_REGION_IDS,
  });
}

function cloneV27PlanPreview(preview) {
  return preview == null ? preview : JSON.parse(JSON.stringify(preview));
}
moduleExports["validateRawV27PlanSession"] = validateRawV27PlanSession;
moduleExports["normalizeV27PlanSession"] = normalizeV27PlanSession;
moduleExports["createV27PlanPreview"] = createV27PlanPreview;
moduleExports["cloneV27PlanPreview"] = cloneV27PlanPreview;
moduleExports["normalizePlanFactSession"] = normalizePlanFactSession;
moduleExports["createPlanFactPreview"] = createPlanFactPreview;
moduleExports["clonePlanFactPreview"] = clonePlanFactPreview;
moduleExports["PLAN_FACT_PREVIEW_VERSION"] = PLAN_FACT_PREVIEW_VERSION;
internalModules.planPreview = moduleExports;
}

// ===== core/planning/planWorkflow.js =====
{
const moduleExports = Object.create(null);
const { clonePlanFactPreview, createPlanFactPreview, normalizePlanFactSession } = internalModules.planPreview;
const { normalizePlainText, normalizeSingleLineText } = internalModules.inputSafety;
const { isValidLocalDate } = internalModules.inputValidation;

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createReadablePlanId(date, existingIds) {
  const prefix = `plan-${date || "unscheduled"}-`;
  const used = new Set(existingIds
    .filter((id) => String(id).startsWith(prefix))
    .map((id) => Number(String(id).slice(prefix.length)))
    .filter(Number.isFinite));
  let sequence = 1;
  while (used.has(sequence)) sequence += 1;
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

function defaultCourse() {
  return Object.freeze({
    name: "",
    gradeKnowledge: "UNKNOWN",
    upPercent: 0,
    downPercent: 0,
    upGradePercent: 0,
    downGradePercent: 0,
    modelSurfaceClass: "UNKNOWN",
  });
}

function defaultRunSession() {
  return normalizePlanFactSession({
    activityType: "run",
    distanceKm: 0,
    durationMinutes: 20,
    runningFormat: "UNKNOWN",
    course: defaultCourse(),
  });
}

function sourceSession(experience) {
  const record = experience?.record;
  if (!record || record.activityType === "rest") return defaultRunSession();
  return normalizePlanFactSession({
    activityType: "run",
    distanceKm: record.distanceKm,
    durationMinutes: record.durationMinutes,
    runningFormat: record.runningFormat,
    course: record.course,
  });
}

function lighterSession(base) {
  return normalizePlanFactSession({
    ...cloneValue(base),
    distanceKm: Math.round(Number(base.distanceKm || 0) * 80) / 100,
    durationMinutes: Math.round(Number(base.durationMinutes || 0) * 8) / 10,
  });
}

function restSession() {
  return normalizePlanFactSession({ activityType: "rest" });
}

function preview(session, scheduledDate, candidateId) {
  return createPlanFactPreview({
    session,
    scheduledDate,
    previewId: `plan-preview-${candidateId}-${scheduledDate}`,
  });
}

function createPlanWorkflow({ services, planRepository }) {
  function createCandidates({ sourceRecordId = "", scheduledDate = "" } = {}) {
    const latestExperience = services.workflows.records.loadLatestExperience();
    const sourceExperience = sourceRecordId
      ? services.workflows.records.loadExperience(sourceRecordId)
      : latestExperience;
    const blockingExperience = [latestExperience, sourceExperience].find((experience) => (
      experience && services.safety.shouldBlockNormalPlanSuggestions(experience.supportDecision)
    )) || null;
    if (blockingExperience) {
      return { blocked: true, sourceExperience, blockingExperience, candidates: [] };
    }
    const base = sourceSession(sourceExperience);
    const definitions = [
      {
        candidateId: "same-conditions",
        title: "同じ条件を出発点にする",
        description: "前回の距離・時間・把握済みコースを転記します。",
        session: base,
      },
      {
        candidateId: "lighter-session",
        title: "距離と時間を小さくする",
        description: "前回の約8割を編集の出発点にします。",
        session: lighterSession(base),
      },
      {
        candidateId: "rest-day",
        title: "休養を予定する",
        description: "走らない予定も同じ位置づけの候補として扱います。",
        session: restSession(),
      },
    ];
    return {
      blocked: false,
      sourceExperience,
      candidates: definitions.map((candidate) => Object.freeze({
        ...candidate,
        preview: preview(candidate.session, scheduledDate, candidate.candidateId),
      })),
    };
  }

  function savePlan(input = {}) {
    const currentPlans = planRepository.loadAll();
    const existing = input.id ? currentPlans.find((plan) => plan.id === input.id) : null;
    const scheduledDate = String(input.scheduledDate || "").slice(0, 10);
    if (!isValidLocalDate(scheduledDate)) {
      return {
        ok: false,
        code: "PLAN_DATE_REQUIRED",
        message: "予定日を正しく入力してください。",
      };
    }
    if (!["run", "rest"].includes(String(input.planType || "run"))) {
      return {
        ok: false,
        code: "INVALID_PLAN_TYPE",
        message: "予定の種類を選び直してください。",
      };
    }
    const planType = input.planType === "rest" ? "rest" : "run";
    const plannedSession = normalizePlanFactSession({
      ...(input.plannedSession || {}),
      activityType: planType,
    });
    const previewResult = preview(plannedSession, scheduledDate, input.id || "new");
    if (planType === "run" && !previewResult.ok) {
      return {
        ok: false,
        code: "INVALID_PLAN_SESSION",
        message: previewResult.message,
        errors: previewResult.validation?.errors || [],
      };
    }
    const id = normalizeSingleLineText(input.id, 100)
      || createReadablePlanId(scheduledDate, currentPlans.map((plan) => plan.id));
    const now = new Date().toISOString();
    return planRepository.upsert({
      ...input,
      id,
      scheduledDate,
      planType,
      title: normalizeSingleLineText(input.title, 80)
        || (planType === "rest" ? "休養予定" : "次回の走行予定"),
      memo: normalizePlainText(input.memo, 500),
      plannedSession,
      sourceCandidateId: normalizeSingleLineText(input.sourceCandidateId, 80) || "custom",
      previewSnapshot: clonePlanFactPreview(previewResult),
      previewGeneratedAt: now,
      createdAt: existing?.createdAt || input.createdAt || now,
      updatedAt: now,
    });
  }

  function updateOutcome(planId, outcome = {}) {
    const plan = planRepository.findById(planId);
    if (!plan) {
      return {
        ok: false,
        code: "PLAN_NOT_FOUND",
        message: "対象の予定が見つかりません。",
      };
    }
    const allowedStatuses = new Set(["planned", "completed", "changed", "not_completed"]);
    const requestedStatus = normalizeSingleLineText(outcome.status, 40)
      || plan.outcomeStatus
      || "planned";
    const outcomeStatus = allowedStatuses.has(requestedStatus) ? requestedStatus : "planned";
    return planRepository.upsert({
      ...plan,
      outcomeStatus,
      actualRecordId: outcome.actualRecordId === undefined
        ? plan.actualRecordId
        : normalizeSingleLineText(outcome.actualRecordId, 100),
      changeReason: outcome.reason === undefined
        ? plan.changeReason
        : normalizeSingleLineText(outcome.reason, 60),
      changeReasonNote: outcome.reasonNote === undefined
        ? plan.changeReasonNote
        : normalizePlainText(outcome.reasonNote, 240),
      updatedAt: new Date().toISOString(),
    });
  }

  function markActualRecord(planId, recordId, outcome = {}) {
    return updateOutcome(planId, {
      status: outcome.status || "completed",
      actualRecordId: recordId,
      reason: outcome.reason,
      reasonNote: outcome.reasonNote,
    });
  }

  return Object.freeze({
    createCandidates,
    savePlan,
    updateOutcome,
    markActualRecord,
  });
}
moduleExports["createPlanWorkflow"] = createPlanWorkflow;
internalModules.planWorkflow = moduleExports;
}

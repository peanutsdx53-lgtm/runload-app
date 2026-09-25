import "./recordWorkflow.js";
import { internalModules } from "./modules.js";
import {
  ROF_J_STORAGE_SCHEMA_VERSION,
  ROF_J_LIFECYCLE_SCHEMA_VERSION,
} from "../rofJConstants.js";

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

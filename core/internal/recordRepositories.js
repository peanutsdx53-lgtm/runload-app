import "./inputSupport.js";
import { internalModules } from "./modules.js";

// ===== core/storage/collectionRepository.js =====
{
const moduleExports = Object.create(null);
function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createCollectionRepository({
  gateway,
  storageKey,
  normalizeItem = (item) => item,
  getItemId = (item) => item.id,
  sortItems = (items) => items,
}) {
  function normalizeItems(rawItems) {
    return sortItems(rawItems.map((item) => normalizeItem(item)).filter(Boolean)).map(cloneValue);
  }

  function loadAllResult() {
    const readResult = gateway.readJsonResult(storageKey, []);
    if (!readResult.ok) {
      return {
        ...readResult,
        code: "STORAGE_COLLECTION_READ_FAILED",
        items: [],
      };
    }
    if (!Array.isArray(readResult.value)) {
      return {
        ok: false,
        operation: "validate",
        key: storageKey,
        code: "STORAGE_COLLECTION_INVALID",
        message: "Stored collection is not an array.",
        details: { actualType: readResult.value === null ? "null" : typeof readResult.value },
        items: [],
      };
    }
    try {
      return {
        ok: true,
        key: storageKey,
        exists: readResult.exists,
        items: normalizeItems(readResult.value),
      };
    } catch (error) {
      return {
        ok: false,
        operation: "normalize",
        key: storageKey,
        code: "STORAGE_COLLECTION_NORMALIZATION_FAILED",
        message: String(error?.message || error || "collection_normalization_failed"),
        items: [],
      };
    }
  }

  function loadAll() {
    const result = loadAllResult();
    return result.ok ? result.items : [];
  }

  function findById(id) {
    return loadAll().find((item) => getItemId(item) === id) || null;
  }

  function saveAll(items) {
    const normalizedItems = sortItems(
      (Array.isArray(items) ? items : []).map((item) => normalizeItem(item)).filter(Boolean),
    );
    const result = gateway.writeJson(storageKey, normalizedItems);
    return { ...result, items: result.ok ? normalizedItems.map(cloneValue) : loadAll() };
  }

  function upsert(item) {
    const normalizedItem = normalizeItem(item);
    if (!normalizedItem) {
      return { ok: false, code: "STORAGE_COLLECTION_ITEM_INVALID", item: null, items: [] };
    }
    const id = getItemId(normalizedItem);
    const currentResult = loadAllResult();
    if (!currentResult.ok) return { ...currentResult, item: null };
    const currentItems = currentResult.items;
    const existingIndex = currentItems.findIndex((entry) => getItemId(entry) === id);
    const nextItems = [...currentItems];
    if (existingIndex >= 0) nextItems[existingIndex] = normalizedItem;
    else nextItems.push(normalizedItem);
    const result = saveAll(nextItems);
    return { ...result, item: result.ok ? cloneValue(normalizedItem) : null };
  }

  function removeById(id) {
    const currentResult = loadAllResult();
    if (!currentResult.ok) return { ...currentResult, removed: false };
    const currentItems = currentResult.items;
    const nextItems = currentItems.filter((item) => getItemId(item) !== id);
    if (nextItems.length === currentItems.length) return { ok: true, removed: false, items: currentItems };
    const result = saveAll(nextItems);
    return { ...result, removed: result.ok };
  }

  return Object.freeze({ loadAll, loadAllResult, findById, saveAll, upsert, removeById });
}
moduleExports["createCollectionRepository"] = createCollectionRepository;
internalModules.collectionRepository = moduleExports;
}

// ===== core/storage/recordRepository.js =====
{
const moduleExports = Object.create(null);
const { normalizeRunningRecord, validateRunningRecord, validateRunningRecordInput } = internalModules.inputValidation;
const { createCollectionRepository } = internalModules.collectionRepository;
const { STORAGE_KEYS } = internalModules.storageKeys;
const { stampCurrentRegionalModel } = internalModules.primaryRegionalSnapshot;

function createRecordRepository(gateway) {
  const repository = createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.records,
    normalizeItem: (item) => normalizeRunningRecord(item, {
      existingIds: [],
      nowIso: item.updatedAt || item.createdAt || new Date().toISOString(),
    }),
    sortItems: (items) => [...items].sort((left, right) => (
      left.date.localeCompare(right.date) || left.id.localeCompare(right.id)
    )),
  });

  function save(record) {
    const inputValidation = validateRunningRecordInput(record);
    if (!inputValidation.ok) {
      return {
        ok: false,
        code: "RUNNING_RECORD_INPUT_VALIDATION_FAILED",
        validation: inputValidation,
        item: null,
      };
    }
    const existingResult = repository.loadAllResult();
    if (!existingResult.ok) return { ...existingResult, item: null };
    const existingRecords = existingResult.items;
    const normalizedRecord = normalizeRunningRecord(stampCurrentRegionalModel(record), {
      existingIds: existingRecords.map((item) => item.id),
      nowIso: new Date().toISOString(),
      assumeExplicitRpe: true,
    });
    const validation = validateRunningRecord(normalizedRecord);
    if (!validation.ok) {
      return {
        ok: false,
        code: "RUNNING_RECORD_VALIDATION_FAILED",
        validation,
        item: null,
      };
    }
    return repository.upsert(normalizedRecord);
  }

  function loadByDate(date) {
    return repository.loadAll().filter((record) => record.date === date);
  }

  return Object.freeze({
    loadAll: repository.loadAll,
    loadAllResult: repository.loadAllResult,
    findById: repository.findById,
    loadByDate,
    save,
    removeById: repository.removeById,
  });
}
moduleExports["createRecordRepository"] = createRecordRepository;
internalModules.recordRepository = moduleExports;
}

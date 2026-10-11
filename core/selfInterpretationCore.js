import { stableRecordKey } from "../shared/recordUtilities.js";
import { normalizeIsoText as iso, sanitizeText as text, normalizeOneLine } from "../shared/textUtilities.js";
import { cloneJsonValue as clone, sortByUpdatedAt } from "../shared/valueUtilities.js";
// RunLoad user-confirmed interpretation snapshots.
// This layer stores the user's chosen meaning/focus. It does not recalculate
// Reference-100, ROF-J, or any scientific result.

export const SELF_INTERPRETATION_SCHEMA_VERSION = "SELF_INTERPRETATION_V1";

const DECISIONS = new Set(["CONTINUE", "THIS_TIME_ONLY", "STOP"]);



export function normalizeSelfInterpretation(item = {}) {
  if (!item || typeof item !== "object") return null;
  const recordId = normalizeOneLine(item.recordId, 120);
  const decision = normalizeOneLine(item.decision, 40).toUpperCase();
  const createdAt = iso(item.createdAt);
  const findingCode = normalizeOneLine(item.findingCode, 80).toUpperCase();
  const findingLabel = normalizeOneLine(item.findingLabel, 220);
  if (!recordId || !createdAt || !findingCode || !findingLabel || !DECISIONS.has(decision)) return null;
  return Object.freeze({
    id: normalizeOneLine(item.id || `self-interpretation-${recordId}`, 180),
    schemaVersion: SELF_INTERPRETATION_SCHEMA_VERSION,
    recordId,
    stableRecordKey: normalizeOneLine(item.stableRecordKey, 280),
    findingCode,
    findingLabel,
    decision,
    nextLabel: normalizeOneLine(item.nextLabel, 180),
    threadId: normalizeOneLine(item.threadId, 180),
    threadType: normalizeOneLine(item.threadType, 80),
    subject: Object.freeze({
      regionId: normalizeOneLine(item.subject?.regionId, 80),
      bodyAreaId: normalizeOneLine(item.subject?.bodyAreaId, 80),
      courseId: normalizeOneLine(item.subject?.courseId, 120),
    }),
    userNote: text(item.userNote, 300).trim(),
    createdAt,
    updatedAt: iso(item.updatedAt, createdAt),
  });
}


export function createSelfInterpretationRepository(gateway, storageKey) {
  function loadAllResult() {
    const read = gateway.readJsonResult(storageKey, []);
    if (!read.ok) return { ...read, code: "SELF_INTERPRETATION_READ_FAILED", items: [] };
    if (!Array.isArray(read.value)) return { ok: false, code: "SELF_INTERPRETATION_STORAGE_INVALID", items: [] };
    return { ok: true, exists: read.exists, items: sortByUpdatedAt(read.value.map(normalizeSelfInterpretation).filter(Boolean)) };
  }

  function loadAll() {
    const result = loadAllResult();
    return result.ok ? result.items.map(clone) : [];
  }

  function saveAll(items) {
    const normalized = sortByUpdatedAt((Array.isArray(items) ? items : []).map(normalizeSelfInterpretation).filter(Boolean));
    const result = gateway.writeJson(storageKey, normalized);
    return { ...result, items: result.ok ? normalized.map(clone) : loadAll() };
  }

  function findByRecordId(recordId) {
    const stableId = String(recordId || "");
    return loadAll().find((item) => item.recordId === stableId) || null;
  }

  function saveForRecord({
    record = {},
    findingCode = "",
    findingLabel = "",
    decision = "THIS_TIME_ONLY",
    nextLabel = "",
    threadId = "",
    threadType = "",
    subject = {},
    userNote = "",
    now = new Date().toISOString(),
  } = {}) {
    const recordId = normalizeOneLine(record?.id, 120);
    if (!recordId) return { ok: false, code: "SELF_INTERPRETATION_RECORD_REQUIRED", item: null };
    const current = loadAllResult();
    if (!current.ok) return { ...current, item: null };
    const existing = current.items.find((item) => item.recordId === recordId) || null;
    const stamp = iso(now, new Date().toISOString());
    const normalized = normalizeSelfInterpretation({
      id: existing?.id || `self-interpretation-${recordId}`,
      recordId,
      stableRecordKey: stableRecordKey(record),
      findingCode,
      findingLabel,
      decision,
      nextLabel,
      threadId,
      threadType,
      subject,
      userNote,
      createdAt: existing?.createdAt || stamp,
      updatedAt: stamp,
    });
    if (!normalized) return { ok: false, code: "SELF_INTERPRETATION_INVALID", item: null };
    const saved = saveAll([...current.items.filter((item) => item.recordId !== recordId), normalized]);
    return { ...saved, item: saved.ok ? clone(normalized) : null };
  }

  function removeByRecordId(recordId) {
    const stableId = String(recordId || "");
    const current = loadAllResult();
    if (!current.ok) return current;
    return saveAll(current.items.filter((item) => item.recordId !== stableId));
  }

  return Object.freeze({ loadAllResult, loadAll, saveAll, findByRecordId, saveForRecord, removeByRecordId });
}

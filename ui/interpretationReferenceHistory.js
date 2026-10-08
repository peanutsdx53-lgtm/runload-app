import { STORAGE_KEYS } from "../core/appCore.js";

const HISTORY_VERSION = 1;
const MAX_HISTORY_ENTRIES = 24;

function normalizeEntry(entry = {}) {
  const recordId = String(entry?.recordId || "").trim().slice(0, 160);
  const articleId = String(entry?.articleId || "").trim().slice(0, 160);
  if (!recordId || !articleId) return null;
  return Object.freeze({ recordId, articleId });
}

function normalizeHistory(value = {}) {
  const rawEntries = Array.isArray(value?.entries) ? value.entries : [];
  const seenRecords = new Set();
  const entries = [];
  for (const item of rawEntries) {
    const entry = normalizeEntry(item);
    if (!entry || seenRecords.has(entry.recordId)) continue;
    seenRecords.add(entry.recordId);
    entries.push(entry);
    if (entries.length >= MAX_HISTORY_ENTRIES) break;
  }
  return Object.freeze(entries);
}

export function loadInterpretationReferenceHistory(gateway) {
  const stored = gateway?.readJson?.(STORAGE_KEYS.readingReferenceHistory, { version: HISTORY_VERSION, entries: [] });
  return normalizeHistory(stored);
}

export function rememberInterpretationReferenceSelection(gateway, { recordId = "", articleId = "" } = {}) {
  return rememberInterpretationReferenceSelectionResult(gateway, { recordId, articleId }).entries;
}

// Keep the existing list-returning API for existing callers, while providing an
// explicit storage outcome for screens that must not claim a failed write succeeded.
export function rememberInterpretationReferenceSelectionResult(gateway, { recordId = "", articleId = "" } = {}) {
  const entry = normalizeEntry({ recordId, articleId });
  const current = loadInterpretationReferenceHistory(gateway);
  if (!entry || !gateway?.writeJson) {
    return Object.freeze({ ok: false, code: "READING_HISTORY_INVALID_OR_UNAVAILABLE", entries: current });
  }
  const entries = [entry, ...current.filter((item) => item.recordId !== entry.recordId)].slice(0, MAX_HISTORY_ENTRIES);
  let saved;
  try {
    saved = gateway.writeJson(STORAGE_KEYS.readingReferenceHistory, { version: HISTORY_VERSION, entries });
  } catch {
    return Object.freeze({ ok: false, code: "READING_HISTORY_WRITE_FAILED", entries: current });
  }
  if (saved?.ok !== true) {
    return Object.freeze({ ok: false, code: saved?.code || "READING_HISTORY_WRITE_FAILED", entries: current });
  }
  return Object.freeze({ ok: true, code: "READING_HISTORY_SAVED", entries: Object.freeze(entries.map((item) => Object.freeze({ ...item }))) });
}

export const INTERPRETATION_REFERENCE_HISTORY_LIMIT = MAX_HISTORY_ENTRIES;

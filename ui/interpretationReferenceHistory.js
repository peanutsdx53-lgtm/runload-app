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
  const entry = normalizeEntry({ recordId, articleId });
  if (!entry || !gateway?.writeJson) return loadInterpretationReferenceHistory(gateway);
  const current = loadInterpretationReferenceHistory(gateway);
  const entries = [entry, ...current.filter((item) => item.recordId !== entry.recordId)].slice(0, MAX_HISTORY_ENTRIES);
  gateway.writeJson(STORAGE_KEYS.readingReferenceHistory, { version: HISTORY_VERSION, entries });
  return Object.freeze(entries.map((item) => Object.freeze({ ...item })));
}

export const INTERPRETATION_REFERENCE_HISTORY_LIMIT = MAX_HISTORY_ENTRIES;

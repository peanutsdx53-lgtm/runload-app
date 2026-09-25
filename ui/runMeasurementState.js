import { simplifyTrackForStorage } from "./runMeasurementCore.js";

export const RUN_MEASUREMENT_STORAGE_KEY = "runner-load-app-new-v1-run-measurements-v1";
const PENDING_KEY = "runner-load-app-flow-session-v1-run-measurement-v1";
const memorySession = new Map();
const memoryLocal = new Map();

function storage(type) {
  try {
    const candidate = type === "session" ? globalThis.sessionStorage : globalThis.localStorage;
    if (candidate) return candidate;
  } catch {}
  const memory = type === "session" ? memorySession : memoryLocal;
  return {
    getItem: (key) => memory.has(key) ? memory.get(key) : null,
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
  };
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function readJson(target, key, fallback) {
  try {
    const raw = target.getItem(key);
    if (raw == null) return clone(fallback);
    return JSON.parse(raw);
  } catch {
    return clone(fallback);
  }
}

function writeJson(target, key, value) {
  try {
    target.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    return { ok: false, code: "RUN_MEASUREMENT_STORAGE_WRITE_FAILED", message: String(error?.message || error || "storage_error") };
  }
}

function normalizePending(payload = {}) {
  const track = payload.saveRoute === false ? [] : simplifyTrackForStorage(payload.track || []);
  return Object.freeze({
    version: 1,
    createdAt: new Date().toISOString(),
    startedAt: String(payload.startedAt || ""),
    endedAt: String(payload.endedAt || ""),
    distanceKm: Number(payload.distanceKm || 0),
    durationMinutes: Number(payload.durationMinutes || 0),
    planId: String(payload.planId || ""),
    saveRoute: payload.saveRoute !== false,
    track,
    acceptedPointCount: Number(payload.acceptedPointCount || track.length || 0),
    rejectedPointCount: Number(payload.rejectedPointCount || 0),
  });
}

export function savePendingRunMeasurement(payload = {}) {
  const normalized = normalizePending(payload);
  const result = writeJson(storage("session"), PENDING_KEY, normalized);
  return { ...result, item: result.ok ? clone(normalized) : null };
}

export function peekPendingRunMeasurement() {
  const value = readJson(storage("session"), PENDING_KEY, null);
  return value?.version === 1 ? value : null;
}

export function clearPendingRunMeasurement() {
  try {
    storage("session").removeItem(PENDING_KEY);
    return { ok: true };
  } catch (error) {
    return { ok: false, code: "RUN_MEASUREMENT_PENDING_CLEAR_FAILED", message: String(error?.message || error || "storage_error") };
  }
}

export function listSavedRunMeasurements() {
  const value = readJson(storage("local"), RUN_MEASUREMENT_STORAGE_KEY, []);
  return Array.isArray(value) ? value.map(clone) : [];
}

export function findSavedRunMeasurement(recordId = "") {
  return listSavedRunMeasurements().find((item) => item.recordId === String(recordId || "")) || null;
}

export function commitPendingRunMeasurement(recordId = "") {
  const id = String(recordId || "").trim();
  const pending = peekPendingRunMeasurement();
  if (!pending) return { ok: true, saved: false, reason: "NO_PENDING_MEASUREMENT" };
  if (!id) return { ok: false, saved: false, code: "RUN_MEASUREMENT_RECORD_ID_REQUIRED" };

  if (pending.saveRoute === false || !Array.isArray(pending.track) || pending.track.length < 2) {
    const cleared = clearPendingRunMeasurement();
    return { ...cleared, saved: false, reason: "ROUTE_NOT_SAVED" };
  }

  const current = listSavedRunMeasurements();
  const item = Object.freeze({
    version: 1,
    id: `measurement-${id}`,
    recordId: id,
    capturedAt: String(pending.createdAt || new Date().toISOString()),
    startedAt: String(pending.startedAt || ""),
    endedAt: String(pending.endedAt || ""),
    distanceKm: Number(pending.distanceKm || 0),
    durationMinutes: Number(pending.durationMinutes || 0),
    planId: String(pending.planId || ""),
    acceptedPointCount: Number(pending.acceptedPointCount || pending.track.length),
    rejectedPointCount: Number(pending.rejectedPointCount || 0),
    track: simplifyTrackForStorage(pending.track),
  });
  const next = [...current.filter((entry) => entry.recordId !== id), item];
  const write = writeJson(storage("local"), RUN_MEASUREMENT_STORAGE_KEY, next);
  if (!write.ok) return { ...write, saved: false };
  clearPendingRunMeasurement();
  return { ok: true, saved: true, item: clone(item) };
}



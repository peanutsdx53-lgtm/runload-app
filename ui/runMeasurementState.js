import { cloneJsonValue as clone } from "../shared/valueUtilities.js";
import { simplifyTrackForStorage } from "./runMeasurementCore.js";

const RUN_MEASUREMENT_STORAGE_KEY = "runner-load-app-new-v1-run-measurements-v1";
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

function normalizeMode(value) {
  const mode = String(value || "free");
  return ["free", "time", "distance"].includes(mode) ? mode : "free";
}

function positiveNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function nonNegativeNumberOrNull(value) {
  if (value === null || value === "" || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeEnergyEstimate(value) {
  if (!value || typeof value !== "object") return null;
  const estimatedKcal = Number(value.estimatedKcal);
  const met = Number(value.met);
  const bodyMassKg = Number(value.bodyMassKg);
  const averageSpeedKmh = Number(value.averageSpeedKmh);
  const durationMinutes = Number(value.durationMinutes);
  if (![estimatedKcal, met, bodyMassKg, averageSpeedKmh, durationMinutes].every(Number.isFinite)) return null;
  if (estimatedKcal < 0 || met <= 0 || bodyMassKg <= 0 || averageSpeedKmh <= 0 || durationMinutes <= 0) return null;
  return Object.freeze({
    modelId: String(value.modelId || ""),
    estimatedKcal,
    met,
    compendiumCode: String(value.compendiumCode || ""),
    mapping: String(value.mapping || ""),
    bodyMassKg,
    averageSpeedKmh,
    durationMinutes,
  });
}

function normalizeStepEstimate(value) {
  if (!value || typeof value !== "object") return null;
  const steps = Number(value.steps);
  const cadenceSpm = Number(value.cadenceSpm);
  const activeDurationMinutes = Number(value.activeDurationMinutes);
  if (!Number.isInteger(steps) || steps < 0 || !Number.isFinite(cadenceSpm) || cadenceSpm < 0 || !Number.isFinite(activeDurationMinutes) || activeDurationMinutes <= 0) return null;
  return Object.freeze({
    modelId: String(value.modelId || ""),
    method: String(value.method || "DEVICE_MOTION_ESTIMATE"),
    steps,
    cadenceSpm,
    activeDurationMinutes,
  });
}

function normalizeCourseAnalysis(value) {
  if (!value || typeof value !== "object") return null;
  const routePattern = ["LOOP", "OUT_AND_BACK", "ONE_WAY", "MIXED", "UNKNOWN"].includes(String(value.routePattern || "").toUpperCase())
    ? String(value.routePattern || "UNKNOWN").toUpperCase()
    : "UNKNOWN";
  const gradeKnowledge = String(value.gradeKnowledge || "UNKNOWN").toUpperCase() === "KNOWN_PROFILE" ? "KNOWN_PROFILE" : "UNKNOWN";
  const normalized = {
    modelId: String(value.modelId || ""),
    source: String(value.source || "LIVE_GPS_ANALYSIS"),
    name: String(value.name || "GPS測定コース").slice(0, 80),
    routePattern,
    retraceRatio: nonNegativeNumberOrNull(value.retraceRatio),
    distanceKm: positiveNumberOrNull(value.distanceKm),
    durationMinutes: positiveNumberOrNull(value.durationMinutes),
    elevationGainM: nonNegativeNumberOrNull(value.elevationGainM),
    elevationLossM: nonNegativeNumberOrNull(value.elevationLossM),
    elevationCoverage: nonNegativeNumberOrNull(value.elevationCoverage),
    gradeKnowledge,
    gradeInputMode: gradeKnowledge === "KNOWN_PROFILE" ? "SUMMARY" : "UNKNOWN",
    upPercent: nonNegativeNumberOrNull(value.upPercent) ?? 0,
    downPercent: nonNegativeNumberOrNull(value.downPercent) ?? 0,
    flatPercent: nonNegativeNumberOrNull(value.flatPercent),
    upGradePercent: nonNegativeNumberOrNull(value.upGradePercent) ?? 0,
    downGradePercent: nonNegativeNumberOrNull(value.downGradePercent) ?? 0,
    surfaceInputMode: "UNKNOWN",
    modelSurfaceClass: "UNKNOWN",
    modelSurfaceProfile: [],
    pavedPercent: 0,
    trackPercent: 0,
    treadmillPercent: 0,
    soilPercent: 0,
    trailPercent: 0,
    naturalGrassPercent: 0,
    artificialTurfPercent: 0,
    sandPercent: 0,
    rawPointCount: Math.max(0, Math.round(Number(value.rawPointCount || 0))),
  };
  return Object.freeze(normalized);
}

function normalizePending(payload = {}) {
  const track = payload.saveRoute === false ? [] : simplifyTrackForStorage(payload.track || []);
  return Object.freeze({
    version: 1,
    createdAt: new Date().toISOString(),
    runId: String(payload.runId || ""),
    measurementMode: normalizeMode(payload.measurementMode),
    targetDurationMinutes: positiveNumberOrNull(payload.targetDurationMinutes),
    targetDistanceKm: positiveNumberOrNull(payload.targetDistanceKm),
    startedAt: String(payload.startedAt || ""),
    endedAt: String(payload.endedAt || ""),
    distanceKm: Number(payload.distanceKm || 0),
    durationMinutes: Number(payload.durationMinutes || 0),
    energyEstimate: normalizeEnergyEstimate(payload.energyEstimate),
    stepEstimate: normalizeStepEstimate(payload.stepEstimate),
    courseAnalysis: normalizeCourseAnalysis(payload.courseAnalysis),
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

function listSavedRunMeasurements() {
  const value = readJson(storage("local"), RUN_MEASUREMENT_STORAGE_KEY, []);
  return Array.isArray(value) ? value.map(clone) : [];
}

// The display reader above may return an empty list when a browser denies
// storage access or the stored route JSON is damaged. Never reuse that
// display fallback for writes: it would erase existing GPS measurements or
// claim an ephemeral in-memory write was safely persisted.
function readSavedRunMeasurementsForCommit() {
  try {
    const target = globalThis.localStorage;
    if (typeof target?.getItem !== "function" || typeof target?.setItem !== "function") {
      return { ok: false, code: "RUN_MEASUREMENT_STORAGE_READ_FAILED" };
    }
    const raw = target.getItem(RUN_MEASUREMENT_STORAGE_KEY);
    const parsed = raw == null ? [] : JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((item) => item && typeof item === "object" && !Array.isArray(item) && typeof item.recordId === "string" && Array.isArray(item.track))) {
      return { ok: false, code: "RUN_MEASUREMENT_STORAGE_READ_FAILED" };
    }
    return { ok: true, target, items: parsed };
  } catch {
    return { ok: false, code: "RUN_MEASUREMENT_STORAGE_READ_FAILED" };
  }
}

export function findSavedRunMeasurement(recordId = "") {
  return listSavedRunMeasurements().find((item) => item.recordId === String(recordId || "")) || null;
}

export function commitPendingRunMeasurement(recordId = "", options = {}) {
  const id = String(recordId || "").trim();
  const runningFormat = String(options?.runningFormat || "UNKNOWN").toUpperCase();
  const keepContinuousRunEnergy = runningFormat === "CONTINUOUS_RUN";
  const pending = peekPendingRunMeasurement();
  if (!pending) return { ok: true, saved: false, reason: "NO_PENDING_MEASUREMENT" };
  if (!id) return { ok: false, saved: false, code: "RUN_MEASUREMENT_RECORD_ID_REQUIRED" };

  if (pending.saveRoute === false || !Array.isArray(pending.track) || pending.track.length < 2) {
    const cleared = clearPendingRunMeasurement();
    return { ...cleared, saved: false, reason: "ROUTE_NOT_SAVED" };
  }

  const prior = readSavedRunMeasurementsForCommit();
  if (!prior.ok) return { ok: false, saved: false, code: prior.code };
  const current = prior.items;
  const item = Object.freeze({
    version: 1,
    id: `measurement-${id}`,
    recordId: id,
    runId: String(pending.runId || ""),
    measurementMode: normalizeMode(pending.measurementMode),
    targetDurationMinutes: positiveNumberOrNull(pending.targetDurationMinutes),
    targetDistanceKm: positiveNumberOrNull(pending.targetDistanceKm),
    capturedAt: String(pending.createdAt || new Date().toISOString()),
    startedAt: String(pending.startedAt || ""),
    endedAt: String(pending.endedAt || ""),
    distanceKm: Number(pending.distanceKm || 0),
    durationMinutes: Number(pending.durationMinutes || 0),
    energyEstimate: keepContinuousRunEnergy ? normalizeEnergyEstimate(pending.energyEstimate) : null,
    stepEstimate: normalizeStepEstimate(pending.stepEstimate),
    courseAnalysis: normalizeCourseAnalysis(pending.courseAnalysis),
    planId: String(pending.planId || ""),
    acceptedPointCount: Number(pending.acceptedPointCount || pending.track.length),
    rejectedPointCount: Number(pending.rejectedPointCount || 0),
    track: simplifyTrackForStorage(pending.track),
  });
  const next = [...current.filter((entry) => entry.recordId !== id), item];
  const write = writeJson(prior.target, RUN_MEASUREMENT_STORAGE_KEY, next);
  if (!write.ok) return { ...write, saved: false };
  clearPendingRunMeasurement();
  return { ok: true, saved: true, item: clone(item) };
}

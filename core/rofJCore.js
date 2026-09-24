import { STORAGE_KEYS } from "./appCore.js";

export const ROF_J_INSTRUMENT_ID = "ROF_J";
export const ROF_J_SEMANTIC_VERSION = "ROF_J_SUZUKI_ARAI_2026_RUNLOAD_V1";
export const ROF_J_JAPANESE_SOURCE_SHA256 = "f25d0d4cf09f603cb66984606cfdb8e716781ba106f0da44dfa276515838acf8";
export const ROF_J_VISUAL_SOURCE_ID = "ROF_ORIGINAL_2017";
export const ROF_J_STORAGE_SCHEMA_VERSION = "RUNLOAD_SECOND_PILLAR_ROFJ_STORAGE_V1";
export const ROF_J_LIFECYCLE_SCHEMA_VERSION = "RUNLOAD_SECOND_PILLAR_ROFJ_LIFECYCLE_V1";
export const ROF_J_PHASES = Object.freeze({ PRE: "PRE_RUN", POST: "POST_RUN" });
export const ROF_J_REVISION_TYPES = Object.freeze({
  initial: "INITIAL_MEASUREMENT",
  correction: "CORRECTION",
  laterReflection: "LATER_REFLECTION",
});
export const ROF_J_CAPTURE_ROUTES = Object.freeze({
  directPreRun: "DIRECT_PRE_RUN",
  directFinishFlow: "DIRECT_FINISH_FLOW",
  retrospective: "RETROSPECTIVE_NONCANONICAL",
});
export const ROF_J_DESCRIPTOR_MAP = Object.freeze({
  2: "まったく疲れていない",
  4: "少し疲れている",
  6: "中程度に疲れている",
  8: "とても疲れている",
  10: "完全な疲労困憊（何も残っていない状態）",
});

const DIRECTION_LABELS = Object.freeze({ UP: "上昇", SAME: "変化なし", DOWN: "低下" });

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function isIsoDateTime(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  const millis = Date.parse(value);
  return Number.isFinite(millis);
}
function secondsBetween(later, earlier) {
  if (!isIsoDateTime(later) || !isIsoDateTime(earlier)) return null;
  return (Date.parse(later) - Date.parse(earlier)) / 1000;
}
function defaultId(prefix = "rofj") {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createRofJRunId({ idFactory = defaultId } = {}) {
  return idFactory("rofj-run");
}
function effectiveRevision(measurement) {
  if (!measurement || !Array.isArray(measurement.revisions)) return null;
  return measurement.revisions.find((item) => item.revisionId === measurement.effectiveRevisionId) || null;
}
function initialRevision(measurement) {
  if (!measurement || !Array.isArray(measurement.revisions)) return null;
  return measurement.revisions.find((item) => item.revisionType === ROF_J_REVISION_TYPES.initial) || null;
}

export function isValidRofJValue(value) {
  return Number.isInteger(value) && value >= 0 && value <= 10;
}

export function officialRofJDescriptor(value) {
  if (!isValidRofJValue(value)) return null;
  return Object.prototype.hasOwnProperty.call(ROF_J_DESCRIPTOR_MAP, value)
    ? ROF_J_DESCRIPTOR_MAP[value]
    : null;
}

export function calculateRofJDelta(preValue, postValue) {
  if (!isValidRofJValue(preValue) || !isValidRofJValue(postValue)) {
    return Object.freeze({ eligible: false, delta: null, direction: null, directionLabel: "" });
  }
  const delta = postValue - preValue;
  const direction = delta > 0 ? "UP" : delta < 0 ? "DOWN" : "SAME";
  return Object.freeze({ eligible: true, delta, direction, directionLabel: DIRECTION_LABELS[direction] });
}

export function calculateRecentFiveReference(priorValues, currentValue) {
  if (!isValidRofJValue(currentValue) && !(Number.isInteger(currentValue) && currentValue >= -10 && currentValue <= 10)) return null;
  const eligible = (Array.isArray(priorValues) ? priorValues : []).filter((value) => Number.isFinite(value));
  if (eligible.length < 5) return null;
  const selected = eligible.slice(-5);
  const sorted = [...selected].sort((a, b) => a - b);
  const median = sorted[2];
  return Object.freeze({
    label: "直近5有効記録",
    n: 5,
    values: Object.freeze([...selected]),
    median,
    min: sorted[0],
    max: sorted[4],
    currentMinusMedian: currentValue - median,
  });
}

function measurementEligibility(measurement) {
  const revision = effectiveRevision(measurement);
  const initial = initialRevision(measurement);
  const reasons = [];
  if (!revision || !isValidRofJValue(revision.value)) reasons.push("EFFECTIVE_VALUE_INVALID");
  if (!initial || !isIsoDateTime(initial.recordedAt)) reasons.push("INITIAL_CAPTURE_TIME_INVALID");
  if (measurement?.phase === ROF_J_PHASES.PRE) {
    if (measurement.captureRoute !== ROF_J_CAPTURE_ROUTES.directPreRun) reasons.push("PRE_NOT_DIRECT");
    if (!isIsoDateTime(measurement.runStartAt)) reasons.push("RUN_START_UNKNOWN");
    const lead = secondsBetween(measurement.runStartAt, initial?.recordedAt);
    if (lead != null && lead < 0) reasons.push("PRE_AFTER_RUN_START");
  } else if (measurement?.phase === ROF_J_PHASES.POST) {
    if (measurement.captureRoute !== ROF_J_CAPTURE_ROUTES.directFinishFlow) reasons.push("POST_NOT_FINISH_FLOW");
    if (!isIsoDateTime(measurement.runEndAt)) reasons.push("RUN_END_UNKNOWN");
    const lag = secondsBetween(initial?.recordedAt, measurement.runEndAt);
    if (lag != null && lag < 0) reasons.push("POST_BEFORE_RUN_END");
  } else {
    reasons.push("PHASE_INVALID");
  }
  return Object.freeze({ eligible: reasons.length === 0, reasons: Object.freeze(reasons) });
}

function decorateMeasurement(measurement) {
  if (!measurement) return null;
  const initial = initialRevision(measurement);
  const eligibility = measurementEligibility(measurement);
  return Object.freeze({
    ...clone(measurement),
    capturedAt: initial?.recordedAt || null,
    preLeadSeconds: measurement.phase === ROF_J_PHASES.PRE
      ? secondsBetween(measurement.runStartAt, initial?.recordedAt)
      : null,
    postLagSeconds: measurement.phase === ROF_J_PHASES.POST
      ? secondsBetween(initial?.recordedAt, measurement.runEndAt)
      : null,
    eligibility,
  });
}

export function createRofJRunEntry(runId) {
  const normalizedRunId = String(runId || "").trim();
  if (!normalizedRunId) throw new TypeError("runId is required");
  return Object.freeze({
    runId: normalizedRunId,
    instrumentId: ROF_J_INSTRUMENT_ID,
    instrumentSemanticVersion: ROF_J_SEMANTIC_VERSION,
    japaneseSourceSha256: ROF_J_JAPANESE_SOURCE_SHA256,
    visualSourceId: ROF_J_VISUAL_SOURCE_ID,
    measurements: Object.freeze({ PRE_RUN: null, POST_RUN: null }),
    createdAt: null,
    updatedAt: null,
  });
}

export function captureRofJMeasurement(entry, {
  phase,
  value,
  recordedAt,
  captureRoute,
  runStartAt = null,
  runEndAt = null,
  revisionId = null,
  idFactory = defaultId,
} = {}) {
  if (!isValidRofJValue(value)) throw new RangeError("ROF-J value must be an integer from 0 to 10");
  if (![ROF_J_PHASES.PRE, ROF_J_PHASES.POST].includes(phase)) throw new RangeError("ROF-J phase is invalid");
  if (!isIsoDateTime(recordedAt)) throw new RangeError("recordedAt must be an ISO date-time");
  const current = entry || createRofJRunEntry("");
  if (current.measurements?.[phase]) throw new Error(`Initial ${phase} measurement already exists`);
  const revision = Object.freeze({
    revisionId: revisionId || idFactory("rofj-rev"),
    revisionType: ROF_J_REVISION_TYPES.initial,
    value,
    recordedAt,
    previousValue: null,
    note: "",
  });
  const measurement = decorateMeasurement({
    phase,
    captureRoute: String(captureRoute || ""),
    runStartAt: runStartAt || null,
    runEndAt: runEndAt || null,
    effectiveRevisionId: revision.revisionId,
    revisions: [revision],
  });
  const next = {
    ...clone(current),
    measurements: { ...clone(current.measurements || {}), [phase]: measurement },
    createdAt: current.createdAt || recordedAt,
    updatedAt: recordedAt,
  };
  return Object.freeze(next);
}

export function appendRofJRevision(entry, {
  phase,
  value,
  recordedAt,
  revisionType,
  note = "",
  revisionId = null,
  idFactory = defaultId,
} = {}) {
  if (![ROF_J_PHASES.PRE, ROF_J_PHASES.POST].includes(phase)) throw new RangeError("ROF-J phase is invalid");
  if (![ROF_J_REVISION_TYPES.correction, ROF_J_REVISION_TYPES.laterReflection].includes(revisionType)) {
    throw new RangeError("revisionType must be CORRECTION or LATER_REFLECTION");
  }
  if (!isValidRofJValue(value)) throw new RangeError("ROF-J value must be an integer from 0 to 10");
  if (!isIsoDateTime(recordedAt)) throw new RangeError("recordedAt must be an ISO date-time");
  const measurement = entry?.measurements?.[phase];
  if (!measurement) throw new Error(`No initial ${phase} measurement exists`);
  const previous = effectiveRevision(measurement);
  const revision = Object.freeze({
    revisionId: revisionId || idFactory("rofj-rev"),
    revisionType,
    value,
    recordedAt,
    previousValue: previous?.value ?? null,
    note: String(note || "").slice(0, 240),
  });
  const revisions = [...measurement.revisions, revision];
  const nextMeasurement = decorateMeasurement({
    ...clone(measurement),
    revisions,
    effectiveRevisionId: revisionType === ROF_J_REVISION_TYPES.correction
      ? revision.revisionId
      : measurement.effectiveRevisionId,
  });
  return Object.freeze({
    ...clone(entry),
    measurements: { ...clone(entry.measurements), [phase]: nextMeasurement },
    updatedAt: recordedAt,
  });
}

export function updateRofJRunTiming(entry, { runStartAt = undefined, runEndAt = undefined, updatedAt = new Date().toISOString() } = {}) {
  const nextMeasurements = {};
  for (const phase of [ROF_J_PHASES.PRE, ROF_J_PHASES.POST]) {
    const measurement = entry?.measurements?.[phase];
    if (!measurement) {
      nextMeasurements[phase] = null;
      continue;
    }
    nextMeasurements[phase] = decorateMeasurement({
      ...clone(measurement),
      runStartAt: runStartAt === undefined ? measurement.runStartAt : runStartAt,
      runEndAt: runEndAt === undefined ? measurement.runEndAt : runEndAt,
    });
  }
  return Object.freeze({ ...clone(entry), measurements: Object.freeze(nextMeasurements), updatedAt });
}

export function summarizeRofJRun(entry) {
  if (!entry) return Object.freeze({ available: false, pre: null, post: null, delta: null, direction: null, directionLabel: "" });
  const preM = entry.measurements?.PRE_RUN || null;
  const postM = entry.measurements?.POST_RUN || null;
  const preRev = effectiveRevision(preM);
  const postRev = effectiveRevision(postM);
  const preEligible = Boolean(preM?.eligibility?.eligible);
  const postEligible = Boolean(postM?.eligibility?.eligible);
  const pre = preEligible ? preRev?.value ?? null : null;
  const post = postEligible ? postRev?.value ?? null : null;
  const delta = calculateRofJDelta(pre, post);
  return Object.freeze({
    available: Boolean(preM || postM),
    pre,
    post,
    preObservedValue: preRev?.value ?? null,
    postObservedValue: postRev?.value ?? null,
    preEligibility: clone(preM?.eligibility || { eligible: false, reasons: ["MISSING"] }),
    postEligibility: clone(postM?.eligibility || { eligible: false, reasons: ["MISSING"] }),
    delta: delta.delta,
    direction: delta.direction,
    directionLabel: delta.directionLabel,
  });
}

export function validateRofJRunEntry(entry) {
  const issues = [];
  if (!isObject(entry)) return Object.freeze({ ok: false, issues: Object.freeze(["ENTRY_OBJECT_REQUIRED"]) });
  if (!String(entry.runId || "").trim()) issues.push("RUN_ID_REQUIRED");
  if (entry.instrumentId !== ROF_J_INSTRUMENT_ID) issues.push("INSTRUMENT_ID_MISMATCH");
  if (entry.instrumentSemanticVersion !== ROF_J_SEMANTIC_VERSION) issues.push("SEMANTIC_VERSION_MISMATCH");
  if (entry.japaneseSourceSha256 !== ROF_J_JAPANESE_SOURCE_SHA256) issues.push("SOURCE_SHA_MISMATCH");
  if (entry.visualSourceId !== ROF_J_VISUAL_SOURCE_ID) issues.push("VISUAL_SOURCE_MISMATCH");
  for (const phase of [ROF_J_PHASES.PRE, ROF_J_PHASES.POST]) {
    const m = entry.measurements?.[phase];
    if (m == null) continue;
    if (!isObject(m) || m.phase !== phase || !Array.isArray(m.revisions) || !m.revisions.length) {
      issues.push(`${phase}_MEASUREMENT_INVALID`);
      continue;
    }
    const initial = m.revisions.filter((r) => r?.revisionType === ROF_J_REVISION_TYPES.initial);
    if (initial.length !== 1) issues.push(`${phase}_INITIAL_REVISION_COUNT_INVALID`);
    for (const revision of m.revisions) {
      if (!isValidRofJValue(revision?.value)) issues.push(`${phase}_REVISION_VALUE_INVALID`);
      if (!isIsoDateTime(revision?.recordedAt)) issues.push(`${phase}_REVISION_TIME_INVALID`);
      if (!Object.values(ROF_J_REVISION_TYPES).includes(revision?.revisionType)) issues.push(`${phase}_REVISION_TYPE_INVALID`);
    }
    if (!m.revisions.some((r) => r.revisionId === m.effectiveRevisionId)) issues.push(`${phase}_EFFECTIVE_REVISION_INVALID`);
  }
  return Object.freeze({ ok: issues.length === 0, issues: Object.freeze(issues) });
}

export function validateRofJStorageEnvelope(value) {
  if (value == null) return Object.freeze({ ok: true, issues: Object.freeze([]) });
  const issues = [];
  if (!isObject(value) || value.schemaVersion !== ROF_J_STORAGE_SCHEMA_VERSION || !isObject(value.entries)) {
    return Object.freeze({ ok: false, issues: Object.freeze(["STORAGE_ENVELOPE_INVALID"]) });
  }
  Object.entries(value.entries).forEach(([runId, entry]) => {
    const validation = validateRofJRunEntry(entry);
    if (runId !== entry?.runId) issues.push(`RUN_KEY_MISMATCH:${runId}`);
    validation.issues.forEach((issue) => issues.push(`${runId}:${issue}`));
  });
  return Object.freeze({ ok: issues.length === 0, issues: Object.freeze(issues) });
}

export function validateRofJLifecycleEnvelope(value) {
  if (value == null) return Object.freeze({ ok: true, issues: Object.freeze([]) });
  const issues = [];
  if (!isObject(value) || value.schemaVersion !== ROF_J_LIFECYCLE_SCHEMA_VERSION || !isObject(value.pendingByRunId)) {
    return Object.freeze({ ok: false, issues: Object.freeze(["LIFECYCLE_ENVELOPE_INVALID"]) });
  }
  Object.entries(value.pendingByRunId).forEach(([runId, state]) => {
    if (!isObject(state) || state.runId !== runId) issues.push(`LIFECYCLE_RUN_KEY_MISMATCH:${runId}`);
  });
  return Object.freeze({ ok: issues.length === 0, issues: Object.freeze(issues) });
}

export function createRofJRepository(gateway) {
  const empty = () => ({ schemaVersion: ROF_J_STORAGE_SCHEMA_VERSION, entries: {} });
  function loadEnvelopeResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.secondPillarRofJ, null);
    if (!result.ok) return { ...result, envelope: empty() };
    if (result.value == null) return { ok: true, exists: false, envelope: empty() };
    const validation = validateRofJStorageEnvelope(result.value);
    if (!validation.ok) return { ok: false, code: "ROF_J_STORAGE_INVALID", validation, envelope: empty() };
    return { ok: true, exists: true, envelope: clone(result.value) };
  }
  function loadByRunId(runId) {
    const result = loadEnvelopeResult();
    if (!result.ok) return null;
    return clone(result.envelope.entries[String(runId)] || null);
  }
  function loadAll() {
    const result = loadEnvelopeResult();
    return result.ok ? Object.values(result.envelope.entries).map(clone) : [];
  }
  function saveEntry(entry) {
    const validation = validateRofJRunEntry(entry);
    if (!validation.ok) return { ok: false, code: "ROF_J_ENTRY_INVALID", validation };
    const current = loadEnvelopeResult();
    if (!current.ok) return current;
    const envelope = {
      schemaVersion: ROF_J_STORAGE_SCHEMA_VERSION,
      entries: { ...current.envelope.entries, [entry.runId]: clone(entry) },
    };
    const result = gateway.writeJson(STORAGE_KEYS.secondPillarRofJ, envelope);
    return { ...result, entry: result.ok ? clone(entry) : null };
  }
  function removeByRunId(runId) {
    const current = loadEnvelopeResult();
    if (!current.ok) return current;
    const entries = { ...current.envelope.entries };
    const existed = Object.prototype.hasOwnProperty.call(entries, String(runId));
    delete entries[String(runId)];
    const envelope = { schemaVersion: ROF_J_STORAGE_SCHEMA_VERSION, entries };
    const result = gateway.writeJson(STORAGE_KEYS.secondPillarRofJ, envelope);
    return { ...result, removed: result.ok && existed };
  }
  return Object.freeze({ loadEnvelopeResult, loadByRunId, loadAll, saveEntry, removeByRunId });
}

export function createRofJLifecycleRepository(gateway) {
  const empty = () => ({ schemaVersion: ROF_J_LIFECYCLE_SCHEMA_VERSION, pendingByRunId: {} });
  function loadEnvelopeResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.secondPillarRofJLifecycle, null);
    if (!result.ok) return { ...result, envelope: empty() };
    if (result.value == null) return { ok: true, exists: false, envelope: empty() };
    const validation = validateRofJLifecycleEnvelope(result.value);
    if (!validation.ok) return { ok: false, code: "ROF_J_LIFECYCLE_STORAGE_INVALID", validation, envelope: empty() };
    return { ok: true, exists: true, envelope: clone(result.value) };
  }
  function saveState(state) {
    if (!state?.runId) return { ok: false, code: "RUN_ID_REQUIRED" };
    const current = loadEnvelopeResult();
    if (!current.ok) return current;
    const envelope = {
      schemaVersion: ROF_J_LIFECYCLE_SCHEMA_VERSION,
      pendingByRunId: { ...current.envelope.pendingByRunId, [state.runId]: clone(state) },
    };
    return gateway.writeJson(STORAGE_KEYS.secondPillarRofJLifecycle, envelope);
  }
  function loadState(runId) {
    const current = loadEnvelopeResult();
    return current.ok ? clone(current.envelope.pendingByRunId[String(runId)] || null) : null;
  }
  function loadAll() {
    const current = loadEnvelopeResult();
    return current.ok ? Object.values(current.envelope.pendingByRunId).map(clone) : [];
  }
  function removeState(runId) {
    const current = loadEnvelopeResult();
    if (!current.ok) return current;
    const pendingByRunId = { ...current.envelope.pendingByRunId };
    const existed = Object.prototype.hasOwnProperty.call(pendingByRunId, String(runId));
    delete pendingByRunId[String(runId)];
    const result = gateway.writeJson(STORAGE_KEYS.secondPillarRofJLifecycle, {
      schemaVersion: ROF_J_LIFECYCLE_SCHEMA_VERSION,
      pendingByRunId,
    });
    return { ...result, removed: result.ok && existed };
  }
  return Object.freeze({ loadEnvelopeResult, saveState, loadState, loadAll, removeState });
}

export function createRofJServices({ gateway, recordsRepository } = {}) {
  if (!gateway) throw new TypeError("gateway is required");
  const repository = createRofJRepository(gateway);
  const lifecycle = createRofJLifecycleRepository(gateway);

  function pendingRuns() {
    return lifecycle.loadAll()
      .filter((state) => state?.status !== "SAVED")
      .sort((left, right) => String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || "")));
  }

  function beginLifecycle({ runId = "", createdAt = new Date().toISOString(), idFactory = defaultId } = {}) {
    if (!isIsoDateTime(createdAt)) return { ok: false, code: "LIFECYCLE_CREATED_AT_INVALID" };
    const stableRunId = String(runId || createRofJRunId({ idFactory })).trim();
    if (!stableRunId) return { ok: false, code: "RUN_ID_REQUIRED" };
    if (recordsRepository?.findById?.(stableRunId)) return { ok: false, code: "RUN_ID_ALREADY_SAVED" };
    const existing = lifecycle.loadState(stableRunId);
    if (existing) return { ok: true, state: existing, created: false };
    const state = {
      runId: stableRunId,
      status: "PENDING",
      createdAt,
      updatedAt: createdAt,
      runStartAt: null,
      runEndAt: null,
      preCapturedAt: null,
      postCapturedAt: null,
    };
    const result = lifecycle.saveState(state);
    return { ...result, state: result.ok ? clone(state) : null, created: Boolean(result.ok) };
  }

  function capturePreDirect(runId, value, recordedAt = new Date().toISOString(), { idFactory = defaultId } = {}) {
    const state = lifecycle.loadState(runId);
    if (!state) return { ok: false, code: "LIFECYCLE_NOT_FOUND" };
    if (state.runStartAt) return { ok: false, code: "PRE_AFTER_RUN_START_FORBIDDEN" };
    if (!isValidRofJValue(value)) return { ok: false, code: "ROF_J_VALUE_INVALID" };
    if (!isIsoDateTime(recordedAt)) return { ok: false, code: "PRE_CAPTURE_TIME_INVALID" };
    let entry = repository.loadByRunId(runId) || createRofJRunEntry(runId);
    if (entry.measurements?.[ROF_J_PHASES.PRE]) return { ok: false, code: "PRE_ALREADY_CAPTURED" };
    try {
      entry = captureRofJMeasurement(entry, {
        phase: ROF_J_PHASES.PRE,
        value,
        recordedAt,
        captureRoute: ROF_J_CAPTURE_ROUTES.directPreRun,
        runStartAt: null,
        idFactory,
      });
    } catch (error) {
      return { ok: false, code: "PRE_CAPTURE_FAILED", message: error?.message || String(error) };
    }
    const saveEntryResult = repository.saveEntry(entry);
    if (!saveEntryResult.ok) return saveEntryResult;
    const nextState = { ...state, preCapturedAt: recordedAt, updatedAt: recordedAt };
    const stateResult = lifecycle.saveState(nextState);
    return { ...stateResult, entry: stateResult.ok ? clone(entry) : null, state: stateResult.ok ? clone(nextState) : null };
  }

  function markRunStart(runId, runStartAt = new Date().toISOString()) {
    const state = lifecycle.loadState(runId);
    if (!state) return { ok: false, code: "LIFECYCLE_NOT_FOUND" };
    if (!isIsoDateTime(runStartAt)) return { ok: false, code: "RUN_START_TIME_INVALID" };
    if (state.runEndAt) return { ok: false, code: "RUN_ALREADY_ENDED" };
    if (state.runStartAt) return { ok: true, state: state, unchanged: true };
    let entry = repository.loadByRunId(runId);
    if (entry) {
      entry = updateRofJRunTiming(entry, { runStartAt, updatedAt: runStartAt });
      const saved = repository.saveEntry(entry);
      if (!saved.ok) return saved;
    }
    const nextState = { ...state, runStartAt, updatedAt: runStartAt };
    const result = lifecycle.saveState(nextState);
    return { ...result, entry: result.ok ? clone(entry) : null, state: result.ok ? clone(nextState) : null };
  }

  function markRunEnd(runId, runEndAt = new Date().toISOString()) {
    const state = lifecycle.loadState(runId);
    if (!state) return { ok: false, code: "LIFECYCLE_NOT_FOUND" };
    if (!isIsoDateTime(runEndAt)) return { ok: false, code: "RUN_END_TIME_INVALID" };
    if (state.runStartAt && Date.parse(runEndAt) < Date.parse(state.runStartAt)) return { ok: false, code: "RUN_END_BEFORE_START" };
    if (state.runEndAt) return { ok: true, state, unchanged: true };
    let entry = repository.loadByRunId(runId);
    if (entry) {
      entry = updateRofJRunTiming(entry, { runEndAt, updatedAt: runEndAt });
      const saved = repository.saveEntry(entry);
      if (!saved.ok) return saved;
    }
    const nextState = { ...state, runEndAt, updatedAt: runEndAt };
    const result = lifecycle.saveState(nextState);
    return { ...result, entry: result.ok ? clone(entry) : null, state: result.ok ? clone(nextState) : null };
  }

  function capturePostDirect(runId, value, recordedAt = new Date().toISOString(), { idFactory = defaultId } = {}) {
    const state = lifecycle.loadState(runId);
    if (!state) return { ok: false, code: "LIFECYCLE_NOT_FOUND" };
    if (!state.runEndAt) return { ok: false, code: "RUN_END_REQUIRED_FOR_POST" };
    if (!isValidRofJValue(value)) return { ok: false, code: "ROF_J_VALUE_INVALID" };
    if (!isIsoDateTime(recordedAt)) return { ok: false, code: "POST_CAPTURE_TIME_INVALID" };
    if (Date.parse(recordedAt) < Date.parse(state.runEndAt)) return { ok: false, code: "POST_BEFORE_RUN_END" };
    let entry = repository.loadByRunId(runId) || createRofJRunEntry(runId);
    if (entry.measurements?.[ROF_J_PHASES.POST]) return { ok: false, code: "POST_ALREADY_CAPTURED" };
    try {
      entry = captureRofJMeasurement(entry, {
        phase: ROF_J_PHASES.POST,
        value,
        recordedAt,
        captureRoute: ROF_J_CAPTURE_ROUTES.directFinishFlow,
        runStartAt: state.runStartAt || null,
        runEndAt: state.runEndAt,
        idFactory,
      });
    } catch (error) {
      return { ok: false, code: "POST_CAPTURE_FAILED", message: error?.message || String(error) };
    }
    const saveEntryResult = repository.saveEntry(entry);
    if (!saveEntryResult.ok) return saveEntryResult;
    const nextState = { ...state, postCapturedAt: recordedAt, updatedAt: recordedAt };
    const stateResult = lifecycle.saveState(nextState);
    return { ...stateResult, entry: stateResult.ok ? clone(entry) : null, state: stateResult.ok ? clone(nextState) : null };
  }

  function finalizeSavedRun(runId) {
    const state = lifecycle.loadState(runId);
    if (!state) return { ok: true, removed: false, code: "NO_PENDING_LIFECYCLE" };
    const savedRecord = recordsRepository?.findById?.(runId);
    if (!savedRecord) return { ok: false, code: "RUN_RECORD_NOT_SAVED" };
    return lifecycle.removeState(runId);
  }

  function recentReference(runId, metric) {
    const records = recordsRepository?.loadAll?.() || [];
    const currentRecord = records.find((record) => record.id === runId && record.activityType === "run");
    if (!currentRecord) return null;
    const currentEntry = repository.loadByRunId(runId);
    const currentSummary = summarizeRofJRun(currentEntry);
    const currentValue = metric === "PRE" ? currentSummary.pre : metric === "POST" ? currentSummary.post : currentSummary.delta;
    if (!Number.isFinite(currentValue)) return null;
    const currentSort = `${currentRecord.date}|${currentRecord.createdAt || ""}|${currentRecord.id}`;
    const eligible = records
      .filter((record) => record.activityType === "run" && record.id !== runId)
      .filter((record) => `${record.date}|${record.createdAt || ""}|${record.id}` < currentSort)
      .sort((a, b) => `${a.date}|${a.createdAt || ""}|${a.id}`.localeCompare(`${b.date}|${b.createdAt || ""}|${b.id}`))
      .map((record) => ({ record, entry: repository.loadByRunId(record.id) }))
      .filter(({ entry }) => entry?.instrumentSemanticVersion === ROF_J_SEMANTIC_VERSION)
      .map(({ entry }) => summarizeRofJRun(entry))
      .map((summary) => metric === "PRE" ? summary.pre : metric === "POST" ? summary.post : summary.delta)
      .filter((value) => Number.isFinite(value));
    return calculateRecentFiveReference(eligible, currentValue);
  }

  return Object.freeze({
    repository,
    lifecycle,
    constants: Object.freeze({
      instrumentId: ROF_J_INSTRUMENT_ID,
      instrumentSemanticVersion: ROF_J_SEMANTIC_VERSION,
      japaneseSourceSha256: ROF_J_JAPANESE_SOURCE_SHA256,
      visualSourceId: ROF_J_VISUAL_SOURCE_ID,
    }),
    createRunId: (options = {}) => createRofJRunId(options),
    listPendingRuns: pendingRuns,
    getPendingRun: (runId) => lifecycle.loadState(runId),
    beginLifecycle,
    capturePreDirect,
    markRunStart,
    markRunEnd,
    capturePostDirect,
    finalizeSavedRun,
    summarizeRun: (runId) => summarizeRofJRun(repository.loadByRunId(runId)),
    recentReference,
  });
}

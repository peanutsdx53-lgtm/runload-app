import { createMobileMeasurementScanner } from "./mobileMeasurementDomUtilities.js";
import { cloneJsonValue as clone } from "../shared/valueUtilities.js";
import { matchesMobileLayout } from "./deviceLayout.js";
import {
  MOBILE_ACTIVITY_IDS,
  createMobileSegmentAnalysis,
  readLatestMobileWalkJogAnalysis,
} from "./mobileWalkJogMeasurementWiring.js";
import { suppressRegionalCoverageForGpsQuality } from "./mobileWalkJogGpsQuality.js";

const RECORDS_KEY = "runner-load-app-mobile-walk-jog-records-v1.3";
const PENDING_MEASUREMENT_KEY = "runner-load-app-flow-session-v1-run-measurement-v1";
const MAX_RECORDS = 100;
const BOUND_ROOTS = new WeakSet();
const MIXED_SEGMENT_GAITS = Object.freeze([
  MOBILE_ACTIVITY_IDS.WALK,
  MOBILE_ACTIVITY_IDS.JOGGING,
  MOBILE_ACTIVITY_IDS.RUNNING_CURRENT,
]);


function safeStorage(kind = "local") {
  try {
    return kind === "session" ? globalThis.sessionStorage : globalThis.localStorage;
  } catch {
    return null;
  }
}

function readJson(storage, key, fallback) {
  try {
    const raw = storage?.getItem?.(key);
    return raw == null ? clone(fallback) : JSON.parse(raw);
  } catch {
    return clone(fallback);
  }
}

function writeJson(storage, key, value) {
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function newRecordId() {
  try {
    if (globalThis.crypto?.randomUUID) return `mobile-activity-${globalThis.crypto.randomUUID()}`;
  } catch {}
  return `mobile-activity-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readPendingMeasurementSnapshot(storage = safeStorage("session")) {
  const value = readJson(storage, PENDING_MEASUREMENT_KEY, null);
  return value?.version === 1 ? value : null;
}

function refineSingleActivityAnalysis(analysis, pending) {
  if (!analysis || !pending) return analysis;
  if (![MOBILE_ACTIVITY_IDS.WALK, MOBILE_ACTIVITY_IDS.JOGGING].includes(analysis.activityId)) return analysis;
  const distanceKm = Number(pending.distanceKm);
  const durationSeconds = Number(pending.durationMinutes) * 60;
  if (!(distanceKm > 0) || !(durationSeconds > 0)) return null;
  const computed = createMobileSegmentAnalysis({
    gaitId: analysis.activityId,
    startDistanceKm: 0,
    endDistanceKm: distanceKm,
    startElapsedSeconds: 0,
    endElapsedSeconds: durationSeconds,
  });
  const segments = analysis.qualityGate?.regionalAnalysisAllowed === false
    ? suppressRegionalCoverageForGpsQuality([computed], analysis.qualityGate)
    : [computed];
  return {
    ...analysis,
    segments,
    metricSource: "PENDING_MEASUREMENT_SNAPSHOT",
  };
}

function validMixedSegments(segments) {
  if (!Array.isArray(segments) || !segments.length) return false;
  return segments.every((segment) => MIXED_SEGMENT_GAITS.includes(String(segment?.gaitId || "")));
}

export function normalizeMobileExtensionRecord({ analysis, pending, fatigue = null, id = newRecordId(), createdAt = new Date().toISOString() } = {}) {
  if (!analysis || !pending) return null;
  if (![MOBILE_ACTIVITY_IDS.WALK, MOBILE_ACTIVITY_IDS.JOGGING, MOBILE_ACTIVITY_IDS.MIXED].includes(analysis.activityId)) return null;

  const distanceKm = Number(pending.distanceKm);
  const durationMinutes = Number(pending.durationMinutes);
  if (!Number.isFinite(distanceKm) || !(distanceKm > 0)) return null;
  if (!Number.isFinite(durationMinutes) || !(durationMinutes > 0)) return null;

  const refined = refineSingleActivityAnalysis(analysis, pending);
  if (!refined || !Array.isArray(refined.segments) || !refined.segments.length) return null;
  if (refined.activityId === MOBILE_ACTIVITY_IDS.MIXED && !validMixedSegments(refined.segments)) return null;

  return Object.freeze({
    version: 1,
    modelVersion: String(refined.modelVersion || "2026-09-30.v1.3"),
    id: String(id),
    createdAt: String(createdAt),
    activityId: refined.activityId,
    distanceKm,
    durationMinutes,
    startedAt: String(pending.startedAt || ""),
    endedAt: String(pending.endedAt || ""),
    stepEstimate: clone(pending.stepEstimate || null),
    courseAnalysis: clone(pending.courseAnalysis || null),
    energyEstimate: null,
    track: pending.saveRoute === false ? [] : clone(Array.isArray(pending.track) ? pending.track : []),
    acceptedPointCount: Number(pending.acceptedPointCount || 0),
    rejectedPointCount: Number(pending.rejectedPointCount || 0),
    fatigue: clone(fatigue || { pre: null, post: null, scale: "ROF-J" }),
    analysis: clone(refined),
    authority: Object.freeze({
      scope: "SMARTPHONE_EXTENSION_ONLY",
      pcThesisCurrent: "UNCHANGED",
      runningCurrentInvoked: false,
      regionalAggregation: "NO_CROSS_GAIT_OR_CROSS_CONSTRUCT_AGGREGATION",
      provisionalEnabled: false,
    }),
  });
}

export function listMobileExtensionRecords(storage = safeStorage("local")) {
  const value = readJson(storage, RECORDS_KEY, []);
  return Array.isArray(value) ? value.map(clone) : [];
}

export function findMobileExtensionRecord(recordId, storage = safeStorage("local")) {
  const id = String(recordId || "");
  return listMobileExtensionRecords(storage).find((record) => record.id === id) || null;
}

// A read-only history view may show no records when storage is corrupted or
// permission-denied, but a *write* must not mistake that view fallback for an
// empty archive. Otherwise the next valid save silently destroys the old raw
// user data. Keep the original value untouched until the user can recover it.
function readMobileRecordsForWrite(storage) {
  if (!storage || typeof storage.getItem !== "function") {
    return { ok: false, code: "MOBILE_ACTIVITY_RECORD_WRITE_FAILED" };
  }
  try {
    const raw = storage.getItem(RECORDS_KEY);
    if (raw === null) return { ok: true, records: [] };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { ok: false, code: "MOBILE_ACTIVITY_RECORD_READ_FAILED" };
    return { ok: true, records: parsed };
  } catch {
    return { ok: false, code: "MOBILE_ACTIVITY_RECORD_READ_FAILED" };
  }
}

export function saveMobileExtensionRecord({ analysis, pending, fatigue = null, storage = safeStorage("local") } = {}) {
  const record = normalizeMobileExtensionRecord({ analysis, pending, fatigue });
  if (!record) return { ok: false, code: "MOBILE_ACTIVITY_RECORD_INVALID" };
  const prior = readMobileRecordsForWrite(storage);
  if (!prior.ok) return prior;
  const current = prior.records;
  const next = [record, ...current.filter((item) => item?.id !== record.id)].slice(0, MAX_RECORDS);
  if (!writeJson(storage, RECORDS_KEY, next)) return { ok: false, code: "MOBILE_ACTIVITY_RECORD_WRITE_FAILED" };
  return { ok: true, record: clone(record) };
}

function activityLabel(activityId) {
  if (activityId === "WALK") return "ウォーキング";
  if (activityId === "JOGGING") return "ジョギング";
  if (activityId === "MIXED") return "走り＋歩き";
  return "ランニング";
}

function savePanelMarkup(activityId) {
  return `<section class="mobile-extension-save" data-mobile-extension-save>
    <div><small>活動記録</small><strong>${activityLabel(activityId)}を保存</strong></div>
    <p>活動記録として保存します。</p>
    <button type="button" data-mobile-extension-save-button>この記録を保存</button>
    <a href="#/home" data-mobile-extension-home-link hidden>ホームへ戻る</a>
    <span data-mobile-extension-save-status role="status" aria-live="polite"></span>
  </section>`;
}

function canonicalPostActions(root, hidden) {
  const completion = root.querySelector(".run-measurement-post__completion");
  if (completion) completion.hidden = Boolean(hidden);
  root.querySelectorAll('[data-action="record-post-fatigue"], [data-action="skip-post-fatigue"]').forEach((button) => {
    button.hidden = Boolean(hidden);
  });
}

function readFatigueValue(root, phase) {
  const section = root.querySelector(`[data-measurement-fatigue-phase="${phase}"]`);
  const slider = section?.querySelector("[data-record-rof-slider]");
  if (!slider || slider.classList.contains("is-untouched")) return null;
  const value = Number(slider.value);
  return Number.isInteger(value) && value >= 0 && value <= 10 ? value : null;
}

function readExtensionFatigue(root) {
  return Object.freeze({
    pre: readFatigueValue(root, "before"),
    post: readFatigueValue(root, "after"),
    scale: "ROF-J",
  });
}

function applyPlanGuard(root) {
  if (!String(root.dataset.planId || "")) return;
  root.querySelectorAll('[name="mobileActivityIdentity"]').forEach((control) => {
    if (control.value !== MOBILE_ACTIVITY_IDS.RUNNING_CURRENT) control.disabled = true;
  });
  const selector = root.querySelector("[data-mobile-gait-selector]");
  if (selector && !selector.querySelector("[data-mobile-plan-guard]")) {
    const note = document.createElement("p");
    note.dataset.mobilePlanGuard = "";
    note.className = "mobile-gait-plan-guard";
    note.textContent = "保存済みランニング予定から開始した測定は、既存ランニングとして記録します。";
    selector.append(note);
  }
}

function applyActivityState(root) {
  const activityId = String(root.dataset.mobileActivityId || MOBILE_ACTIVITY_IDS.RUNNING_CURRENT);
  const extension = activityId !== MOBILE_ACTIVITY_IDS.RUNNING_CURRENT;
  if (root.dataset.measurementPhase === "post") {
    canonicalPostActions(root, extension);
    if (extension) {
      const status = root.querySelector("[data-measurement-post-status]");
      if (status) status.textContent = "運動後の疲労感は任意です。確認後に保存できます。";
      ensureSavePanel(root, activityId);
    }
  }
}

function ensureSavePanel(root, activityId) {
  const body = root.querySelector(".run-measurement-post__body");
  if (!body || body.querySelector("[data-mobile-extension-save]")) return;
  body.insertAdjacentHTML("beforeend", savePanelMarkup(activityId));
  const button = body.querySelector("[data-mobile-extension-save-button]");
  const status = body.querySelector("[data-mobile-extension-save-status]");
  const home = body.querySelector("[data-mobile-extension-home-link]");
  button?.addEventListener("click", () => {
    const analysis = readLatestMobileWalkJogAnalysis();
    const pending = readPendingMeasurementSnapshot();
    const saved = saveMobileExtensionRecord({ analysis, pending, fatigue: readExtensionFatigue(root) });
    if (!saved.ok) {
      if (status) status.textContent = "保存できませんでした。端末の保存容量を確認してください。";
      return;
    }
    if (button) {
      button.disabled = true;
      button.textContent = "保存しました";
    }
    if (status) status.textContent = "活動別記録を端末内に保存しました。";
    if (home) home.hidden = false;
  });
}

function bindRoot(root) {
  if (BOUND_ROOTS.has(root) || !matchesMobileLayout()) return;
  BOUND_ROOTS.add(root);

  const observer = new MutationObserver(() => {
    applyPlanGuard(root);
    applyActivityState(root);
  });
  observer.observe(root, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ["data-mobile-activity-id", "data-measurement-phase"],
  });
  applyPlanGuard(root);
  applyActivityState(root);
}

const scan = createMobileMeasurementScanner(bindRoot);

export function installMobileWalkJogRecordStore() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

if (typeof document !== "undefined") installMobileWalkJogRecordStore();
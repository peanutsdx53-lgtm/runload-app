import { matchesMobileLayout } from "./deviceLayout.js";
import {
  MOBILE_ACTIVITY_IDS,
  createMobileSegmentAnalysis,
  readLatestMobileWalkJogAnalysis,
} from "./mobileWalkJogMeasurementWiring.js";

const RECORDS_KEY = "runner-load-app-mobile-walk-jog-records-v1.3";
const PENDING_MEASUREMENT_KEY = "runner-load-app-flow-session-v1-run-measurement-v1";
const MAX_RECORDS = 100;
const BOUND_ROOTS = new WeakSet();

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

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
  try {
    storage?.setItem?.(key, JSON.stringify(value));
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
  if (!(distanceKm > 0) || !(durationSeconds > 0)) return analysis;
  return {
    ...analysis,
    segments: [createMobileSegmentAnalysis({
      gaitId: analysis.activityId,
      startDistanceKm: 0,
      endDistanceKm: distanceKm,
      startElapsedSeconds: 0,
      endElapsedSeconds: durationSeconds,
    })],
    metricSource: "PENDING_MEASUREMENT_SNAPSHOT",
  };
}

export function normalizeMobileExtensionRecord({ analysis, pending, id = newRecordId(), createdAt = new Date().toISOString() } = {}) {
  if (!analysis || !pending) return null;
  if (![MOBILE_ACTIVITY_IDS.WALK, MOBILE_ACTIVITY_IDS.JOGGING, MOBILE_ACTIVITY_IDS.MIXED].includes(analysis.activityId)) return null;
  const refined = refineSingleActivityAnalysis(analysis, pending);
  return Object.freeze({
    version: 1,
    modelVersion: String(refined.modelVersion || "2026-09-30.v1.3"),
    id: String(id),
    createdAt: String(createdAt),
    activityId: refined.activityId,
    distanceKm: Number(pending.distanceKm || 0),
    durationMinutes: Number(pending.durationMinutes || 0),
    startedAt: String(pending.startedAt || ""),
    endedAt: String(pending.endedAt || ""),
    stepEstimate: clone(pending.stepEstimate || null),
    courseAnalysis: clone(pending.courseAnalysis || null),
    energyEstimate: null,
    track: pending.saveRoute === false ? [] : clone(Array.isArray(pending.track) ? pending.track : []),
    acceptedPointCount: Number(pending.acceptedPointCount || 0),
    rejectedPointCount: Number(pending.rejectedPointCount || 0),
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

export function saveMobileExtensionRecord({ analysis, pending, storage = safeStorage("local") } = {}) {
  const record = normalizeMobileExtensionRecord({ analysis, pending });
  if (!record) return { ok: false, code: "MOBILE_ACTIVITY_RECORD_INVALID" };
  const current = listMobileExtensionRecords(storage);
  const next = [record, ...current.filter((item) => item.id !== record.id)].slice(0, MAX_RECORDS);
  if (!writeJson(storage, RECORDS_KEY, next)) return { ok: false, code: "MOBILE_ACTIVITY_RECORD_WRITE_FAILED" };
  return { ok: true, record: clone(record) };
}

function activityLabel(activityId) {
  if (activityId === "WALK") return "ウォーキング";
  if (activityId === "JOGGING") return "ジョギング";
  if (activityId === "MIXED") return "歩き＋走り";
  return "ランニング";
}

function savePanelMarkup(activityId) {
  return `<section class="mobile-extension-save" data-mobile-extension-save>
    <div><small>SMARTPHONE EXTENSION</small><strong>${activityLabel(activityId)}の記録</strong></div>
    <p>この活動は既存ランニングCurrentとは分離して保存します。12部位の異なる指標は合算しません。</p>
    <button type="button" data-mobile-extension-save-button>活動別記録を端末に保存</button>
    <a href="#/home" data-mobile-extension-home-link hidden>ホームへ戻る</a>
    <span data-mobile-extension-save-status role="status" aria-live="polite"></span>
  </section>`;
}

function canonicalPostActions(root, hidden) {
  root.querySelectorAll('[data-action="record-post-fatigue"], [data-action="skip-post-fatigue"]').forEach((button) => {
    button.hidden = Boolean(hidden);
  });
}

function fatigueVisibility(root, hidden) {
  root.querySelectorAll('[data-measurement-fatigue-phase="before"], [data-measurement-fatigue-phase="after"]').forEach((section) => {
    section.hidden = Boolean(hidden);
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
  fatigueVisibility(root, extension);
  if (root.dataset.measurementPhase === "post") {
    canonicalPostActions(root, extension);
    if (extension) ensureSavePanel(root, activityId);
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
    const saved = saveMobileExtensionRecord({ analysis, pending });
    if (!saved.ok) {
      if (status) status.textContent = "保存できませんでした。端末の保存容量を確認してください。";
      return;
    }
    if (button) {
      button.disabled = true;
      button.textContent = "保存しました";
    }
    if (status) status.textContent = `活動別記録 ${saved.record.id} を端末内に保存しました。`;
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

function scan() {
  if (!matchesMobileLayout()) return;
  document.querySelectorAll("[data-run-measurement]").forEach(bindRoot);
}

export function installMobileWalkJogRecordStore() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

if (typeof document !== "undefined") installMobileWalkJogRecordStore();

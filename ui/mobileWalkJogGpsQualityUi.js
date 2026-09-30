import { matchesMobileLayout } from "./deviceLayout.js";
import {
  createMobileGpsQualityTracker,
  suppressRegionalCoverageForGpsQuality,
} from "./mobileWalkJogGpsQuality.js";

const ANALYSIS_KEY = "runner-load-app-mobile-walk-jog-analysis-v1.3";
const BOUND_ROOTS = new WeakSet();
const EXTENSION_ACTIVITIES = new Set(["WALK", "JOGGING", "MIXED"]);

function safeSessionStorage() {
  try { return globalThis.sessionStorage || null; }
  catch { return null; }
}

function readAnalysis(storage = safeSessionStorage()) {
  try {
    const raw = storage?.getItem?.(ANALYSIS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeAnalysis(value, storage = safeSessionStorage()) {
  try {
    if (!storage?.setItem) return false;
    storage.setItem(ANALYSIS_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function applyGpsQualityGateToAnalysis(analysis, qualityGate) {
  if (!analysis || !EXTENSION_ACTIVITIES.has(String(analysis.activityId || ""))) return analysis;
  return Object.freeze({
    ...analysis,
    qualityGate: Object.freeze({
      ...qualityGate,
      basis: "OPERATIONAL_SAFETY_GUARD_NOT_RESEARCH_THRESHOLD",
    }),
    segments: suppressRegionalCoverageForGpsQuality(analysis.segments, qualityGate),
  });
}

function qualityMessage(qualityGate) {
  if (qualityGate?.regionalAnalysisAllowed) {
    return "GPS品質を確認済みです。12部位表示は測定品質ゲートを通過しています。";
  }
  if (qualityGate?.reason === "NO_USABLE_GPS_FIX") {
    return "安定したGPS測位を確認できなかったため、12部位計算は表示しません。距離・時間・区間情報のみ保持します。";
  }
  return "GPSが安定して利用できない状態が30秒を超えたため、12部位計算は表示しません。距離・時間・区間情報のみ保持します。";
}

function applyPanelState(root, qualityGate) {
  const panel = root.querySelector("[data-mobile-gait-analysis-result]");
  if (!panel) return;
  let note = panel.querySelector("[data-mobile-gps-quality-note]");
  if (!note) {
    note = document.createElement("p");
    note.dataset.mobileGpsQualityNote = "";
    panel.querySelector(".mobile-gait-analysis-result__head")?.insertAdjacentElement("afterend", note);
    if (!note.parentElement) panel.prepend(note);
  }
  note.textContent = qualityMessage(qualityGate);
  note.dataset.status = qualityGate?.regionalAnalysisAllowed ? "allowed" : "suppressed";

  if (qualityGate?.regionalAnalysisAllowed) return;
  panel.querySelectorAll(".mobile-gait-segment-result").forEach((card) => {
    const gait = card.querySelector("div strong")?.textContent || "";
    if (gait.includes("ランニング") && !gait.includes("ジョギング")) return;
    card.querySelector("details")?.remove();
    const summary = card.querySelector("p");
    if (summary) {
      const parts = String(summary.textContent || "").split("・");
      summary.textContent = `${parts.slice(0, 2).join("・")}・GPS品質不足のため12部位表示なし`;
    }
  });
}

function bindRoot(root) {
  if (BOUND_ROOTS.has(root) || !matchesMobileLayout()) return;
  BOUND_ROOTS.add(root);
  const tracker = createMobileGpsQualityTracker();
  const gpsStatus = root.querySelector("[data-gps-status]");
  const pauseButton = root.querySelector('[data-action="pause-measurement"]');
  let lastPhase = root.dataset.measurementPhase || "prep";

  function observeGpsQuality() {
    if (root.dataset.measurementPhase !== "active") return;
    tracker.observeQuality(String(root.dataset.gpsQuality || "waiting"));
  }

  function observePauseState() {
    if (root.dataset.measurementPhase !== "active") return;
    tracker.setPaused(String(pauseButton?.textContent || "").trim() === "再開");
  }

  const gpsObserver = new MutationObserver(observeGpsQuality);
  if (gpsStatus) gpsObserver.observe(gpsStatus, { childList: true, subtree: true, characterData: true });
  gpsObserver.observe(root, { attributes: true, attributeFilter: ["data-gps-quality"] });

  const pauseObserver = new MutationObserver(observePauseState);
  if (pauseButton) pauseObserver.observe(pauseButton, { childList: true, subtree: true, characterData: true });

  const phaseObserver = new MutationObserver(() => {
    const phase = root.dataset.measurementPhase || "prep";
    if (phase === lastPhase) return;
    if (phase === "active") {
      tracker.start(String(root.dataset.gpsQuality || "waiting"));
      observePauseState();
    }
    if (phase === "post") {
      const activityId = String(root.dataset.mobileActivityId || "RUNNING_CURRENT");
      if (EXTENSION_ACTIVITIES.has(activityId)) {
        const qualityGate = tracker.finish();
        const analysis = readAnalysis();
        const gated = applyGpsQualityGateToAnalysis(analysis, qualityGate);
        writeAnalysis(gated);
        queueMicrotask(() => applyPanelState(root, qualityGate));
      } else {
        tracker.finish();
      }
    }
    lastPhase = phase;
  });
  phaseObserver.observe(root, { attributes: true, attributeFilter: ["data-measurement-phase"] });
}

function scan() {
  if (!matchesMobileLayout()) return;
  document.querySelectorAll("[data-run-measurement]").forEach(bindRoot);
}

export function installMobileWalkJogGpsQualityUi() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

if (typeof document !== "undefined") installMobileWalkJogGpsQualityUi();

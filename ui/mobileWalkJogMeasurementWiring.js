import { matchesMobileLayout } from "./deviceLayout.js";
import {
  STRICT_ALL12_BANDS,
  summarizeMobileWalkJogCoverage,
} from "../core/internal/mobileWalkJogSpeedModel.js";

export const MOBILE_ACTIVITY_IDS = Object.freeze({
  WALK: "WALK",
  JOGGING: "JOGGING",
  RUNNING_CURRENT: "RUNNING_CURRENT",
  MIXED: "MIXED",
});

const STORAGE_KEY = "runner-load-app-mobile-walk-jog-analysis-v1.3";
const BOUND_ROOTS = new WeakSet();
const SEGMENT_GAITS = Object.freeze(["WALK", "JOGGING", "RUNNING_CURRENT"]);

const ACTIVITY_LABELS = Object.freeze({
  WALK: "ウォーキング",
  JOGGING: "ジョギング",
  RUNNING_CURRENT: "ランニング",
  MIXED: "走り＋歩き",
});

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function parseElapsedText(value = "") {
  const parts = String(value || "").trim().split(":").map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part) || part < 0)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export function speedMpsFromDistanceTime(distanceKm, durationSeconds) {
  const km = finiteNumber(distanceKm);
  const seconds = finiteNumber(durationSeconds);
  return km > 0 && seconds > 0 ? (km * 1000) / seconds : null;
}

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function runPointer(speedMps) {
  const band = STRICT_ALL12_BANDS.RUNNING_CURRENT_POINTER;
  return Object.freeze({
    gaitId: "RUNNING_CURRENT",
    inputSpeedMps: speedMps,
    strictAll12: Boolean(Number.isFinite(speedMps) && speedMps >= band.minMps && speedMps <= band.maxMps),
    availableRegionCount: null,
    all12Available: null,
    provisionalRegionCount: 0,
    regions: null,
    outputStatus: "USE_EXISTING_RUNNING_CURRENT_ENGINE",
  });
}

export function createMobileSegmentAnalysis({
  gaitId,
  startDistanceKm = 0,
  endDistanceKm = 0,
  startElapsedSeconds = 0,
  endElapsedSeconds = 0,
} = {}) {
  const gait = SEGMENT_GAITS.includes(String(gaitId || "")) ? String(gaitId) : "RUNNING_CURRENT";
  const distanceKm = Math.max(0, finiteNumber(endDistanceKm) - finiteNumber(startDistanceKm));
  const durationSeconds = Math.max(0, finiteNumber(endElapsedSeconds) - finiteNumber(startElapsedSeconds));
  const speedMps = speedMpsFromDistanceTime(distanceKm, durationSeconds);
  const coverage = gait === "RUNNING_CURRENT"
    ? runPointer(speedMps)
    : speedMps == null
      ? null
      : summarizeMobileWalkJogCoverage({ gaitId: gait, speedMps, allowProvisional: false });

  return Object.freeze({
    gaitId: gait,
    distanceKm: round(distanceKm, 4),
    durationSeconds: round(durationSeconds, 1),
    speedMps: round(speedMps, 4),
    speedKmh: round(speedMps == null ? null : speedMps * 3.6, 3),
    coverage,
  });
}

function readMetrics(root) {
  const distanceKm = finiteNumber(root.querySelector("[data-measurement-distance]")?.textContent);
  const elapsedSeconds = parseElapsedText(root.querySelector("[data-measurement-elapsed]")?.textContent);
  return { distanceKm, elapsedSeconds };
}

function safeSessionStorage() {
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}

function persistAnalysis(payload) {
  try {
    safeSessionStorage()?.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

export function readLatestMobileWalkJogAnalysis() {
  try {
    const raw = safeSessionStorage()?.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function activityChoiceMarkup() {
  const choices = [
    ["WALK", "ウォーキング", "歩行"],
    ["JOGGING", "ジョギング", "低速の走行"],
    ["RUNNING_CURRENT", "ランニング", "走行"],
    ["MIXED", "走り＋歩き", "区間で切替"],
  ];
  return `<fieldset class="mobile-gait-selector" data-mobile-gait-selector>
    <legend>活動</legend>
    <div class="mobile-gait-selector__grid">
      ${choices.map(([id, label, note]) => `<label><input type="radio" name="mobileActivityIdentity" value="${id}" ${id === "RUNNING_CURRENT" ? "checked" : ""}><span><strong>${label}</strong><small>${note}</small></span></label>`).join("")}
    </div>
  </fieldset>`;
}

function mixedControlMarkup() {
  return `<section class="mobile-gait-segment-control" data-mobile-gait-segment-control hidden>
    <small>現在の区間</small>
    <div role="group" aria-label="現在の運動様式">
      <button type="button" data-mobile-segment-gait="WALK">歩行</button>
      <button type="button" data-mobile-segment-gait="JOGGING">ジョギング</button>
      <button type="button" data-mobile-segment-gait="RUNNING_CURRENT">ランニング</button>
    </div>
    <p>切替時点で区間を分けます。異なる部位指標は合算しません。</p>
  </section>`;
}

function formatSpeed(speedMps) {
  if (!Number.isFinite(speedMps)) return "—";
  return `${(speedMps * 3.6).toFixed(2)} km/h`;
}

function regionDetails(coverage) {
  if (!coverage?.regions) return "";
  return `<details><summary>12部位の計算結果</summary><div class="mobile-gait-region-list">${coverage.regions.map((region) => {
    const index = Number.isFinite(region?.index) ? region.index.toFixed(1) : "—";
    return `<span><b>${region.regionId}</b><strong>${index}</strong><small>${region.outputStatus === "NO_OUTPUT" ? "根拠範囲外" : region.evidenceTier}</small></span>`;
  }).join("")}</div></details>`;
}

function segmentCard(segment, index) {
  const coverage = segment.coverage;
  const status = segment.gaitId === "RUNNING_CURRENT"
    ? "既存ランニングエンジンへ引継ぎ"
    : coverage?.strictAll12
      ? "全12部位の共通根拠帯内"
      : coverage
        ? `${coverage.availableRegionCount}/12部位を根拠範囲内で計算`
        : "距離・時間不足";
  return `<article class="mobile-gait-segment-result">
    <div><small>区間 ${index + 1}</small><strong>${ACTIVITY_LABELS[segment.gaitId] || segment.gaitId}</strong></div>
    <p>${segment.distanceKm.toFixed(2)} km・${formatSpeed(segment.speedMps)}・${status}</p>
    ${regionDetails(coverage)}
  </article>`;
}

function renderPostResult(root, payload) {
  const postBody = root.querySelector(".run-measurement-post__body");
  if (!postBody) return;
  let panel = postBody.querySelector("[data-mobile-gait-analysis-result]");
  if (!panel) {
    panel = document.createElement("section");
    panel.className = "mobile-gait-analysis-result";
    panel.dataset.mobileGaitAnalysisResult = "";
    const summary = postBody.querySelector(".run-measurement-post__summary");
    summary?.insertAdjacentElement("afterend", panel);
  }
  const segments = payload.segments || [];
  const note = payload.activityId === "MIXED"
    ? "区間ごとの運動様式を保持しています。異なる構成概念の部位値は合算・平均しません。"
    : payload.activityId === "RUNNING_CURRENT"
      ? "既存のランニング計算経路をそのまま使用します。"
      : "12部位は独立した指標として計算し、共通倍率は使用しません。";
  panel.innerHTML = `<div class="mobile-gait-analysis-result__head"><small>活動別計算</small><strong>${ACTIVITY_LABELS[payload.activityId] || payload.activityId}</strong></div>
    <p>${note}</p>
    <div class="mobile-gait-analysis-result__segments">${segments.map(segmentCard).join("")}</div>`;
}

function setEnergyVisibility(root, activityId) {
  const showRunningEnergy = activityId === "RUNNING_CURRENT";
  const activeEnergy = root.querySelector("[data-measurement-energy-value]")?.closest("div");
  const postEnergy = root.querySelector(".run-measurement-post__energy");
  if (activeEnergy) activeEnergy.hidden = !showRunningEnergy;
  if (postEnergy) postEnergy.hidden = !showRunningEnergy;

  let note = root.querySelector("[data-mobile-gait-energy-note]");
  if (!note) {
    note = document.createElement("p");
    note.className = "mobile-gait-energy-note";
    note.dataset.mobileGaitEnergyNote = "";
    root.querySelector(".run-measurement-prep__options")?.append(note);
  }
  note.hidden = showRunningEnergy;
  note.textContent = "ウォーキング／ジョギング／混合では、消費エネルギーは別監査が完了するまで計算結果へ使用しません。";
}

function setMixedButtons(root, gaitId) {
  root.querySelectorAll("[data-mobile-segment-gait]").forEach((button) => {
    const active = button.dataset.mobileSegmentGait === gaitId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function bindMeasurementRoot(root) {
  if (BOUND_ROOTS.has(root) || !matchesMobileLayout()) return;
  BOUND_ROOTS.add(root);

  const intro = root.querySelector(".run-measurement-prep__intro");
  if (!intro) return;
  intro.insertAdjacentHTML("afterend", activityChoiceMarkup());
  root.querySelector(".run-measurement-active__hero")?.insertAdjacentHTML("afterend", mixedControlMarkup());

  let activityId = "RUNNING_CURRENT";
  let currentMixedGait = "WALK";
  let segmentStart = { distanceKm: 0, elapsedSeconds: 0 };
  let segments = [];
  let lastPhase = root.dataset.measurementPhase || "prep";

  function selectActivity(next) {
    activityId = Object.values(MOBILE_ACTIVITY_IDS).includes(next) ? next : "RUNNING_CURRENT";
    root.dataset.mobileActivityId = activityId;
    setEnergyVisibility(root, activityId);
    const mixed = root.querySelector("[data-mobile-gait-segment-control]");
    if (mixed) mixed.hidden = activityId !== "MIXED" || root.dataset.measurementPhase !== "active";
  }

  function closeMixedSegment(metrics = readMetrics(root)) {
    if (activityId !== "MIXED") return;
    const analysis = createMobileSegmentAnalysis({
      gaitId: currentMixedGait,
      startDistanceKm: segmentStart.distanceKm,
      endDistanceKm: metrics.distanceKm,
      startElapsedSeconds: segmentStart.elapsedSeconds,
      endElapsedSeconds: metrics.elapsedSeconds,
    });
    if (analysis.distanceKm > 0 || analysis.durationSeconds > 0) segments = [...segments, analysis];
    segmentStart = { ...metrics };
  }

  function startActivePhase() {
    segments = [];
    segmentStart = readMetrics(root);
    if (activityId === "MIXED") {
      currentMixedGait = "WALK";
      setMixedButtons(root, currentMixedGait);
      const mixed = root.querySelector("[data-mobile-gait-segment-control]");
      if (mixed) mixed.hidden = false;
    }
  }

  function finishAnalysis() {
    const metrics = readMetrics(root);
    if (activityId === "MIXED") {
      closeMixedSegment(metrics);
    } else {
      segments = [createMobileSegmentAnalysis({
        gaitId: activityId,
        startDistanceKm: 0,
        endDistanceKm: metrics.distanceKm,
        startElapsedSeconds: 0,
        endElapsedSeconds: metrics.elapsedSeconds,
      })];
    }
    const payload = Object.freeze({
      version: 1,
      modelVersion: "2026-09-30.v1.3",
      createdAt: new Date().toISOString(),
      activityId,
      aggregationPolicy: "NO_CROSS_GAIT_OR_CROSS_CONSTRUCT_REGIONAL_AGGREGATION",
      provisionalEnabled: false,
      segments,
    });
    persistAnalysis(payload);
    renderPostResult(root, payload);
  }

  root.querySelectorAll('[name="mobileActivityIdentity"]').forEach((control) => {
    control.addEventListener("change", () => {
      if (control.checked) selectActivity(control.value);
    });
  });

  root.querySelectorAll("[data-mobile-segment-gait]").forEach((button) => {
    button.addEventListener("click", () => {
      if (activityId !== "MIXED") return;
      const next = String(button.dataset.mobileSegmentGait || "");
      if (!SEGMENT_GAITS.includes(next) || next === currentMixedGait) return;
      closeMixedSegment(readMetrics(root));
      currentMixedGait = next;
      setMixedButtons(root, currentMixedGait);
    });
  });

  const phaseObserver = new MutationObserver(() => {
    const phase = root.dataset.measurementPhase || "prep";
    if (phase === lastPhase) return;
    if (phase === "active") startActivePhase();
    if (phase === "post") finishAnalysis();
    if (phase !== "active") {
      const mixed = root.querySelector("[data-mobile-gait-segment-control]");
      if (mixed) mixed.hidden = true;
    }
    lastPhase = phase;
  });
  phaseObserver.observe(root, { attributes: true, attributeFilter: ["data-measurement-phase"] });

  selectActivity("RUNNING_CURRENT");
}

function scan() {
  if (!matchesMobileLayout()) return;
  document.querySelectorAll("[data-run-measurement]").forEach(bindMeasurementRoot);
}

export function installMobileWalkJogMeasurementWiring() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

if (typeof document !== "undefined") installMobileWalkJogMeasurementWiring();

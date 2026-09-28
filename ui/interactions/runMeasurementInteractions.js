import { ROF_J_DESCRIPTOR_MAP } from "../../core/rofJCore.js";
import {
  averagePaceSecondsPerKm,
  evaluateTrackPoint,
  formatElapsed,
  formatPace,
  normalizeGeolocationPosition,
  rollingPaceSecondsPerKm,
  updatePaceWarningState,
} from "../runMeasurementCore.js";
import { normalizeAppSettings } from "../appSettings.js";
import { estimateRunningEnergy } from "../runMeasurementEnergy.js";
import { analyzeMeasuredCourse, createMotionStepEstimator, routePatternLabel } from "../runMeasurementAutoRecord.js";
import { createRunMeasurementMap } from "../runMeasurementMap.js";
import { createRunMeasurementNotifier } from "../runMeasurementNotifications.js";
import { clearPendingRunMeasurement, savePendingRunMeasurement } from "../runMeasurementState.js";

function geolocationErrorMessage(error) {
  if (error?.code === 1) return "位置情報が許可されていません。ブラウザーの設定でこのアプリへの位置情報を許可してください。";
  if (error?.code === 2) return "現在地を取得できません。屋外でGPSを受信しやすい場所に移動して再度お試しください。";
  if (error?.code === 3) return "現在地の取得に時間がかかっています。GPS受信状態を確認してください。";
  return "現在地を取得できませんでした。";
}

function rofAnchorText(value) {
  const anchors = [2, 4, 6, 8, 10];
  if (value === 0 || value < 2) return `0・まったく疲労感がない ／ 2・${ROF_J_DESCRIPTOR_MAP[2]}`;
  if (ROF_J_DESCRIPTOR_MAP[value]) return `${value}・${ROF_J_DESCRIPTOR_MAP[value]}`;
  for (let index = 0; index < anchors.length - 1; index += 1) {
    const lower = anchors[index];
    const upper = anchors[index + 1];
    if (value > lower && value < upper) return `${lower}・${ROF_J_DESCRIPTOR_MAP[lower]} ／ ${upper}・${ROF_J_DESCRIPTOR_MAP[upper]}`;
  }
  return `8・${ROF_J_DESCRIPTOR_MAP[8]} ／ 10・${ROF_J_DESCRIPTOR_MAP[10]}`;
}

function createFatigueControl(wrapper, onChange = () => {}) {
  if (!wrapper) return null;
  const slider = wrapper.querySelector("[data-record-rof-slider]");
  const valueOutput = wrapper.querySelector("[data-record-rof-value]");
  const descriptor = wrapper.querySelector("[data-record-rof-descriptor]");
  const anchor = wrapper.querySelector("[data-record-rof-anchor]");
  const sliderWrap = wrapper.querySelector("[data-rof-slider-wrap]");
  let touched = false;

  function refresh() {
    if (!slider || !valueOutput || !descriptor || !anchor) return;
    slider.classList.toggle("is-untouched", !touched);
    sliderWrap?.classList.toggle("is-untouched", !touched);
    if (!touched) {
      valueOutput.textContent = "—";
      descriptor.textContent = "数値を選択";
      anchor.textContent = `2・${ROF_J_DESCRIPTOR_MAP[2]} ／ 4・${ROF_J_DESCRIPTOR_MAP[4]}`;
      onChange({ touched: false, value: null });
      return;
    }
    const value = Number(slider.value);
    valueOutput.textContent = String(value);
    descriptor.textContent = value === 0 ? "まったく疲労感がない" : (ROF_J_DESCRIPTOR_MAP[value] || "");
    anchor.textContent = rofAnchorText(value);
    onChange({ touched: true, value });
  }

  function select() {
    touched = true;
    refresh();
  }

  slider?.addEventListener("input", select);
  slider?.addEventListener("change", select);
  refresh();

  return Object.freeze({
    hasSelection: () => touched,
    value: () => touched ? Number(slider?.value) : null,
    reset: () => {
      touched = false;
      if (slider) slider.value = "5";
      refresh();
    },
    setDisabled: (disabled) => { if (slider) slider.disabled = Boolean(disabled); },
  });
}

function modeLabel(mode) {
  if (mode === "time") return "時間を決めて走る";
  if (mode === "distance") return "距離を決めて走る";
  return "自由に走る";
}

function energyStatusText(result) {
  if (result?.ok) return "体重と平均速度から推定しています。";
  if (result?.reason === "BODY_MASS_UNAVAILABLE") return "設定で体重を入力すると表示できます。";
  if (result?.reason === "GPS_DISTANCE_INSUFFICIENT") return "GPSで10m以上取得後に表示します。";
  if (result?.reason === "SPEED_OUT_OF_SUPPORTED_RANGE") return "平均速度がランニング換算範囲外のため表示しません。";
  return "測定開始後に表示します。";
}

function stepStatusText(status, hasEstimate = false) {
  if (hasEstimate) return "端末モーションから推定しています。";
  if (status === "DENIED") return "モーション利用が許可されていないため算出しません。";
  if (status === "UNAVAILABLE") return "この端末ではモーション歩数を利用できません。";
  return "端末モーションから推定中です。";
}

function courseSummaryText(course) {
  if (!course) return "GPS軌跡からコース条件を作れませんでした。";
  const route = routePatternLabel(course.routePattern);
  const grade = course.gradeKnowledge === "KNOWN_PROFILE"
    ? `上り ${course.upPercent}%・平坦 ${course.flatPercent}%・下り ${course.downPercent}%`
    : "坂道は高度情報不足のため未設定";
  return `${route}・${grade}`;
}

export function bindRunMeasurement({ router, services }) {
  const root = document.querySelector("[data-run-measurement]");
  if (!root) return undefined;

  const prepView = root.querySelector("[data-measurement-prep]");
  const activeView = root.querySelector("[data-measurement-active]");
  const postView = root.querySelector("[data-measurement-post]");
  const prepStatus = root.querySelector("[data-measurement-prep-status]");
  const activeStatus = root.querySelector("[data-measurement-status]");
  const postStatus = root.querySelector("[data-measurement-post-status]");
  const mapContainer = root.querySelector("#run-measurement-map");
  let map = null;

  const elapsedNode = root.querySelector("[data-measurement-elapsed]");
  const distanceNode = root.querySelector("[data-measurement-distance]");
  const currentPaceNode = root.querySelector("[data-measurement-current-pace]");
  const averagePaceNode = root.querySelector("[data-measurement-average-pace]");
  const energyValueNode = root.querySelector("[data-measurement-energy-value]");
  const energyStatusNode = root.querySelector("[data-measurement-energy-status]");
  const stepValueNode = root.querySelector("[data-measurement-step-value]");
  const stepStatusNode = root.querySelector("[data-measurement-step-status]");
  const primaryLabel = root.querySelector("[data-measurement-primary-label]");
  const primaryValue = root.querySelector("[data-measurement-primary]");
  const goalCaption = root.querySelector("[data-measurement-goal-caption]");
  const activeModeLabel = root.querySelector("[data-measurement-mode-label]");
  const gpsStatus = root.querySelector("[data-gps-status]");
  const warningNode = root.querySelector("[data-pace-warning]");
  const goalReached = root.querySelector("[data-measurement-goal-reached]");
  const goalReachedTitle = root.querySelector("[data-measurement-goal-reached-title]");
  const pauseButton = root.querySelector('[data-action="pause-measurement"]');
  const saveRouteControl = root.querySelector("[data-save-route]");
  const postTime = root.querySelector("[data-measurement-post-time]");
  const postDistance = root.querySelector("[data-measurement-post-distance]");
  const postEnergy = root.querySelector("[data-measurement-post-energy]");
  const postEnergyStatus = root.querySelector("[data-measurement-post-energy-status]");
  const postSteps = root.querySelector("[data-measurement-post-steps]");
  const postStepStatus = root.querySelector("[data-measurement-post-step-status]");
  const postCourse = root.querySelector("[data-measurement-post-course]");
  const postElevation = root.querySelector("[data-measurement-post-elevation]");
  const postRecordButton = root.querySelector('[data-action="record-post-fatigue"]');

  const targetMinutesInput = root.querySelector("[data-measurement-target-minutes]");
  const targetDistanceInput = root.querySelector("[data-measurement-target-distance]");
  const modeControls = [...root.querySelectorAll('[name="measurementMode"]')];
  const planId = String(root.dataset.planId || "");
  const plannedPace = Number(root.dataset.targetPace || 0) || null;
  const notificationSettings = normalizeAppSettings(services.storage.settings.load());
  const notifier = createRunMeasurementNotifier(window, notificationSettings);
  const stepEstimator = createMotionStepEstimator(window);

  const beforeFatigue = createFatigueControl(root.querySelector('[data-measurement-fatigue-phase="before"]'));
  const afterFatigue = createFatigueControl(root.querySelector('[data-measurement-fatigue-phase="after"]'), ({ touched }) => {
    if (postRecordButton) postRecordButton.disabled = !touched;
  });

  let watchId = null;
  let timerId = null;
  let wakeLock = null;
  let measurementStarted = false;
  let paused = false;
  let pausedAtMs = null;
  let pausedTotalMs = 0;
  let startedAtMs = null;
  let startedAtIso = "";
  let endedAtIso = "";
  let finalElapsedMs = 0;
  let distanceM = 0;
  let acceptedPointCount = 0;
  let rejectedPointCount = 0;
  let lastAcceptedPoint = null;
  let track = [];
  let paceExceededAt = null;
  let lastWarningAt = 0;
  let measurementMode = "free";
  let targetDurationMinutes = null;
  let targetDistanceKm = null;
  let goalNotified = false;
  let fatigueRunId = "";
  let pendingPayload = null;
  let handoffToRecord = false;
  let energyBodyMassKg = null;
  let latestEnergyEstimate = null;

  function setMessage(node, message, error = false) {
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("is-error", error);
  }

  function activeElapsedMs() {
    if (!startedAtMs) return finalElapsedMs || 0;
    const endpoint = paused && pausedAtMs ? pausedAtMs : Date.now();
    return Math.max(0, endpoint - startedAtMs - pausedTotalMs);
  }

  function calculateEnergy(elapsed = activeElapsedMs()) {
    return estimateRunningEnergy({
      bodyMassKg: energyBodyMassKg,
      distanceKm: distanceM / 1000,
      durationMs: elapsed,
    });
  }

  function updateEnergy(elapsed = activeElapsedMs()) {
    const result = calculateEnergy(elapsed);
    latestEnergyEstimate = result.ok ? result : null;
    if (energyValueNode) energyValueNode.textContent = result.ok ? String(Math.round(result.estimatedKcal)) : "—";
    if (energyStatusNode) energyStatusNode.textContent = energyStatusText(result);
    return result;
  }

  function updateSteps(elapsed = activeElapsedMs()) {
    const count = stepEstimator.liveSteps();
    const estimate = stepEstimator.snapshot(elapsed);
    if (stepValueNode) stepValueNode.textContent = Number.isInteger(count) && count >= 4 ? String(count) : "—";
    if (stepStatusNode) stepStatusNode.textContent = stepStatusText(stepEstimator.status(), Boolean(estimate));
    return estimate;
  }

  function renderPostEnergy(result) {
    if (postEnergy) postEnergy.textContent = result?.ok ? String(Math.round(result.estimatedKcal)) : "—";
    if (postEnergyStatus) postEnergyStatus.textContent = energyStatusText(result);
  }

  function renderPostAutoRecord(payload) {
    const stepEstimate = payload?.stepEstimate || null;
    const course = payload?.courseAnalysis || null;
    if (postSteps) postSteps.textContent = stepEstimate ? `${stepEstimate.steps.toLocaleString("ja-JP")} 歩` : "—";
    if (postStepStatus) postStepStatus.textContent = stepStatusText(stepEstimator.status(), Boolean(stepEstimate));
    if (postCourse) postCourse.textContent = courseSummaryText(course);
    if (postElevation) {
      postElevation.textContent = course?.elevationGainM != null
        ? `獲得標高 ${Math.round(course.elevationGainM)} m・下降 ${Math.round(course.elevationLossM || 0)} m`
        : "高度情報が十分な場合だけ坂道を自動入力します。";
    }
  }

  function selectedMode() {
    return modeControls.find((control) => control.checked)?.value || "free";
  }

  function syncModeSettings() {
    const mode = selectedMode();
    root.querySelectorAll("[data-measurement-goal]").forEach((section) => {
      section.hidden = section.dataset.measurementGoal !== mode;
    });
  }

  function validateGoal() {
    measurementMode = selectedMode();
    targetDurationMinutes = null;
    targetDistanceKm = null;
    if (measurementMode === "time") {
      const value = Number(targetMinutesInput?.value);
      if (!Number.isFinite(value) || value < 1 || value > 600) {
        setMessage(prepStatus, "走る時間を1〜600分で入力してください。", true);
        return false;
      }
      targetDurationMinutes = value;
    }
    if (measurementMode === "distance") {
      const value = Number(targetDistanceInput?.value);
      if (!Number.isFinite(value) || value < 0.1 || value > 1000) {
        setMessage(prepStatus, "走る距離を0.1〜1000 kmで入力してください。", true);
        return false;
      }
      targetDistanceKm = value;
    }
    return true;
  }

  function showPhase(phase) {
    if (prepView) prepView.hidden = phase !== "prep";
    if (activeView) activeView.hidden = phase !== "active";
    if (postView) postView.hidden = phase !== "post";
    root.dataset.measurementPhase = phase;
    window.scrollTo?.({ top: 0, behavior: "auto" });
  }

  function stopWatch() {
    if (watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  async function releaseWakeLock() {
    try { await wakeLock?.release?.(); } catch {}
    wakeLock = null;
  }

  async function requestWakeLock() {
    if (!measurementStarted || paused || document.visibilityState !== "visible" || !navigator.wakeLock?.request) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch {
      wakeLock = null;
    }
  }

  function discardFatigueLink() {
    if (!fatigueRunId || !services?.fatigue) return;
    services.fatigue.lifecycle?.removeState?.(fatigueRunId);
    services.fatigue.repository?.removeByRunId?.(fatigueRunId);
    fatigueRunId = "";
  }

  function capturePreFatigue() {
    if (!beforeFatigue?.hasSelection() || !services?.fatigue) return { ok: true, linked: false };
    const runId = services.fatigue.createRunId?.() || "";
    if (!runId) return { ok: false, code: "ROF_J_RUN_ID_FAILED" };
    const createdAt = new Date().toISOString();
    const lifecycle = services.fatigue.beginLifecycle?.({ runId, createdAt });
    if (!lifecycle?.ok) return lifecycle || { ok: false, code: "ROF_J_LIFECYCLE_FAILED" };
    const captured = services.fatigue.capturePreDirect?.(runId, beforeFatigue.value(), new Date().toISOString());
    if (!captured?.ok) {
      services.fatigue.lifecycle?.removeState?.(runId);
      services.fatigue.repository?.removeByRunId?.(runId);
      return captured || { ok: false, code: "ROF_J_PRE_CAPTURE_FAILED" };
    }
    fatigueRunId = runId;
    return { ok: true, linked: true, runId };
  }

  function emitPaceWarning() {
    if (!warningNode) return;
    warningNode.hidden = false;
    notifier.notify("pace");
    window.setTimeout(() => { if (warningNode) warningNode.hidden = true; }, 5000);
  }

  function reachGoal() {
    if (goalNotified || measurementMode === "free") return;
    goalNotified = true;
    if (goalReachedTitle) goalReachedTitle.textContent = measurementMode === "time" ? "設定した時間になりました" : "設定した距離に到達しました";
    if (goalReached) goalReached.hidden = false;
    notifier.notify("goal");
  }

  function updatePrimary(elapsed) {
    if (!primaryLabel || !primaryValue || !goalCaption) return;
    if (measurementMode === "time") {
      const total = Number(targetDurationMinutes || 0) * 60000;
      const remaining = Math.max(0, total - elapsed);
      primaryLabel.textContent = "残り時間";
      primaryValue.textContent = formatElapsed(remaining);
      goalCaption.textContent = `設定 ${targetDurationMinutes}分`;
      if (elapsed >= total) reachGoal();
      return;
    }
    if (measurementMode === "distance") {
      const remaining = Math.max(0, Number(targetDistanceKm || 0) - distanceM / 1000);
      primaryLabel.textContent = "残り距離";
      primaryValue.textContent = `${remaining.toFixed(2)} km`;
      goalCaption.textContent = `設定 ${Number(targetDistanceKm || 0).toFixed(1)} km`;
      if (distanceM / 1000 >= Number(targetDistanceKm || 0)) reachGoal();
      return;
    }
    primaryLabel.textContent = "経過時間";
    primaryValue.textContent = formatElapsed(elapsed);
    goalCaption.textContent = "自由に走っています";
  }

  function updateMetrics() {
    const elapsed = activeElapsedMs();
    if (elapsedNode) elapsedNode.textContent = formatElapsed(elapsed);
    if (distanceNode) distanceNode.textContent = (distanceM / 1000).toFixed(2);
    if (averagePaceNode) averagePaceNode.textContent = formatPace(averagePaceSecondsPerKm(distanceM, elapsed));
    updateEnergy(elapsed);
    updateSteps(elapsed);
    updatePrimary(elapsed);
  }

  function handlePosition(position) {
    if (!measurementStarted || paused) return;
    const point = normalizeGeolocationPosition(position);
    const evaluation = evaluateTrackPoint(lastAcceptedPoint, point);
    if (!evaluation.accepted) {
      rejectedPointCount += 1;
      if (evaluation.reason === "LOW_ACCURACY" && gpsStatus) {
        gpsStatus.textContent = `GPS ±${Math.round(Number(point?.accuracyM || 0))}m`;
      }
      return;
    }

    distanceM += evaluation.distanceDeltaM;
    const accepted = Object.freeze({ ...point, cumulativeDistanceM: distanceM });
    lastAcceptedPoint = accepted;
    track = [...track, accepted];
    acceptedPointCount += 1;

    map ||= createRunMeasurementMap(mapContainer, { initialZoom: 16 });
    map?.setCenter(accepted);
    map?.setTrack(track);
    if (gpsStatus) {
      const accuracy = Number.isFinite(Number(accepted.accuracyM)) ? `±${Math.round(accepted.accuracyM)}m` : "精度不明";
      gpsStatus.textContent = `GPS ${accuracy}`;
    }

    const currentPace = rollingPaceSecondsPerKm(track);
    if (currentPaceNode) currentPaceNode.textContent = formatPace(currentPace);
    updateMetrics();

    const warning = updatePaceWarningState({
      currentPaceSecondsPerKm: currentPace,
      plannedPaceSecondsPerKm: plannedPace,
      exceededAt: paceExceededAt,
      now: Date.now(),
    });
    paceExceededAt = warning.exceededAt;
    if (warning.shouldWarn && Date.now() - lastWarningAt >= 15000) {
      lastWarningAt = Date.now();
      emitPaceWarning();
    }
  }

  function handlePositionError(error) {
    rejectedPointCount += 1;
    setMessage(activeStatus, geolocationErrorMessage(error), true);
    if (gpsStatus) gpsStatus.textContent = "GPSエラー";
  }

  function beginWatch() {
    if (!navigator.geolocation || watchId != null || paused || !measurementStarted) return;
    watchId = navigator.geolocation.watchPosition(handlePosition, handlePositionError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000,
    });
  }

  async function start() {
    if (measurementStarted) return;
    if (!window.isSecureContext || !navigator.geolocation) {
      setMessage(prepStatus, "このブラウザーではGPS測定を開始できません。HTTPS上の対応ブラウザーで開いてください。", true);
      return;
    }
    if (!validateGoal()) return;

    await notifier.prepare();
    clearPendingRunMeasurement();
    discardFatigueLink();
    await stepEstimator.start();
    const fatigueLink = capturePreFatigue();
    if (!fatigueLink.ok) {
      stepEstimator.stop();
      setMessage(prepStatus, "走る前の疲労感を保存できませんでした。疲労感を未選択に戻すか、もう一度お試しください。", true);
      return;
    }

    const profile = services.storage.profile.load();
    energyBodyMassKg = Number(profile?.weightKg);
    latestEnergyEstimate = null;
    startedAtMs = Date.now();
    startedAtIso = new Date(startedAtMs).toISOString();
    if (fatigueRunId) {
      const marked = services.fatigue.markRunStart?.(fatigueRunId, startedAtIso);
      if (!marked?.ok) {
        stepEstimator.stop();
        discardFatigueLink();
        setMessage(prepStatus, "疲労感を測定開始と関連付けられませんでした。もう一度お試しください。", true);
        return;
      }
    }

    measurementStarted = true;
    paused = false;
    pausedAtMs = null;
    pausedTotalMs = 0;
    finalElapsedMs = 0;
    endedAtIso = "";
    distanceM = 0;
    acceptedPointCount = 0;
    rejectedPointCount = 0;
    lastAcceptedPoint = null;
    track = [];
    paceExceededAt = null;
    lastWarningAt = 0;
    goalNotified = false;
    pendingPayload = null;
    beforeFatigue?.setDisabled(true);
    if (activeModeLabel) activeModeLabel.textContent = modeLabel(measurementMode);
    if (goalReached) goalReached.hidden = true;
    showPhase("active");
    setMessage(activeStatus, "GPSを取得しています。この画面を前面に表示したまま走ってください。");
    updateMetrics();
    timerId = window.setInterval(updateMetrics, 500);
    beginWatch();
    await requestWakeLock();
  }

  async function togglePause() {
    if (!measurementStarted) return;
    if (!paused) {
      paused = true;
      pausedAtMs = Date.now();
      stopWatch();
      stepEstimator.pause();
      lastAcceptedPoint = null;
      await releaseWakeLock();
      if (pauseButton) pauseButton.textContent = "再開";
      setMessage(activeStatus, "一時停止中です。時間・距離・推定歩数の加算を止めています。");
      updateMetrics();
      return;
    }

    pausedTotalMs += Math.max(0, Date.now() - Number(pausedAtMs || Date.now()));
    pausedAtMs = null;
    paused = false;
    stepEstimator.resume();
    lastAcceptedPoint = null;
    if (pauseButton) pauseButton.textContent = "一時停止";
    setMessage(activeStatus, "測定を再開しました。GPSを取得しています。");
    beginWatch();
    await requestWakeLock();
    updateMetrics();
  }

  function measurementPayload(elapsed) {
    const energyEstimate = calculateEnergy(elapsed);
    const stepEstimate = stepEstimator.snapshot(elapsed);
    const courseAnalysis = analyzeMeasuredCourse({ track, durationMs: elapsed });
    return {
      runId: fatigueRunId,
      measurementMode,
      targetDurationMinutes,
      targetDistanceKm,
      startedAt: startedAtIso,
      endedAt: endedAtIso,
      distanceKm: Number((distanceM / 1000).toFixed(2)),
      durationMinutes: Number((elapsed / 60000).toFixed(2)),
      energyEstimate: energyEstimate.ok ? energyEstimate : null,
      stepEstimate,
      courseAnalysis,
      planId,
      saveRoute: saveRouteControl?.checked !== false,
      track,
      acceptedPointCount,
      rejectedPointCount,
    };
  }

  async function finish() {
    if (!measurementStarted) return;
    if (!(distanceM >= 10) || !(activeElapsedMs() > 0)) {
      setMessage(activeStatus, "まだ十分な移動距離を取得できていません。GPSを確認してから終了してください。", true);
      return;
    }

    const wasPaused = paused;
    const elapsed = activeElapsedMs();
    endedAtIso = new Date().toISOString();
    finalElapsedMs = elapsed;
    measurementStarted = false;
    stopWatch();
    stepEstimator.pause();
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    await releaseWakeLock();

    let payload = measurementPayload(elapsed);
    let result = savePendingRunMeasurement(payload);
    if (!result.ok) {
      measurementStarted = true;
      paused = wasPaused;
      if (!paused) {
        beginWatch();
        stepEstimator.resume();
      }
      timerId = window.setInterval(updateMetrics, 500);
      await requestWakeLock();
      setMessage(activeStatus, "測定結果を端末内に保持できませんでした。ブラウザーの保存容量を確認してください。", true);
      return;
    }

    if (fatigueRunId) {
      const ended = services.fatigue.markRunEnd?.(fatigueRunId, endedAtIso);
      if (!ended?.ok) {
        discardFatigueLink();
        payload = { ...payload, runId: "" };
        result = savePendingRunMeasurement(payload);
        if (!result.ok) {
          clearPendingRunMeasurement();
          stepEstimator.stop();
          setMessage(activeStatus, "測定結果を次の画面へ引き継げませんでした。", true);
          return;
        }
      }
    }

    pendingPayload = payload;
    if (postTime) postTime.textContent = formatElapsed(elapsed);
    if (postDistance) postDistance.textContent = `${(distanceM / 1000).toFixed(2)} km`;
    renderPostEnergy(payload.energyEstimate || calculateEnergy(elapsed));
    renderPostAutoRecord(payload);
    stepEstimator.stop();
    afterFatigue?.reset();
    showPhase("post");
    setMessage(postStatus, fatigueRunId ? "走る前の値と同じ走行として記録できます。" : "疲労感は任意です。そのまま記録入力へ進めます。");
  }

  function ensurePostLifecycle() {
    if (fatigueRunId && services.fatigue?.getPendingRun?.(fatigueRunId)) return { ok: true, runId: fatigueRunId, created: false };
    if (!services?.fatigue) return { ok: false, code: "ROF_J_SERVICE_UNAVAILABLE" };
    const createdAt = new Date().toISOString();
    const begun = services.fatigue.beginLifecycle?.({ createdAt });
    if (!begun?.ok) return begun || { ok: false, code: "ROF_J_LIFECYCLE_FAILED" };
    const runId = begun.state?.runId || "";
    if (!runId) return { ok: false, code: "ROF_J_RUN_ID_FAILED" };
    const ended = services.fatigue.markRunEnd?.(runId, createdAt);
    if (!ended?.ok) {
      services.fatigue.lifecycle?.removeState?.(runId);
      services.fatigue.repository?.removeByRunId?.(runId);
      return ended || { ok: false, code: "ROF_J_RUN_END_FAILED" };
    }
    fatigueRunId = runId;
    return { ok: true, runId, created: true };
  }

  function navigateToRecord() {
    handoffToRecord = true;
    const parameters = { measurement: "1" };
    if (planId) parameters.planId = planId;
    if (fatigueRunId) parameters.runId = fatigueRunId;
    router.navigateToScreen("record-input", parameters);
  }

  function recordPostFatigue() {
    if (!afterFatigue?.hasSelection()) return;
    const lifecycle = ensurePostLifecycle();
    if (!lifecycle.ok) {
      setMessage(postStatus, "走った後の疲労感を保存できませんでした。記録入力へ進むことはできます。", true);
      return;
    }
    const captured = services.fatigue.capturePostDirect?.(fatigueRunId, afterFatigue.value(), new Date().toISOString());
    if (!captured?.ok) {
      if (lifecycle.created) discardFatigueLink();
      setMessage(postStatus, "走った後の疲労感を保存できませんでした。記録入力へ進むことはできます。", true);
      return;
    }

    if (pendingPayload) {
      pendingPayload = { ...pendingPayload, runId: fatigueRunId };
      const saved = savePendingRunMeasurement(pendingPayload);
      if (!saved.ok) {
        if (lifecycle.created) discardFatigueLink();
        setMessage(postStatus, "疲労感を測定結果と関連付けられませんでした。もう一度お試しください。", true);
        return;
      }
    }
    navigateToRecord();
  }

  async function cancel() {
    if (!measurementStarted) {
      stepEstimator.stop();
      clearPendingRunMeasurement();
      discardFatigueLink();
      router.navigateToScreen("home");
      return;
    }
    if (!window.confirm("測定中の内容を破棄して終了しますか？")) return;
    measurementStarted = false;
    stopWatch();
    stepEstimator.stop();
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    await releaseWakeLock();
    clearPendingRunMeasurement();
    discardFatigueLink();
    router.navigateToScreen("home");
  }

  modeControls.forEach((control) => control.addEventListener("change", syncModeSettings));
  root.querySelectorAll("[data-target-minutes-preset]").forEach((button) => button.addEventListener("click", () => {
    if (targetMinutesInput) targetMinutesInput.value = button.dataset.targetMinutesPreset || "30";
  }));
  root.querySelectorAll("[data-target-distance-preset]").forEach((button) => button.addEventListener("click", () => {
    if (targetDistanceInput) targetDistanceInput.value = button.dataset.targetDistancePreset || "5";
  }));
  syncModeSettings();

  root.querySelector('[data-action="start-measurement"]')?.addEventListener("click", start);
  pauseButton?.addEventListener("click", togglePause);
  root.querySelector('[data-action="finish-measurement"]')?.addEventListener("click", finish);
  root.querySelector('[data-action="finish-from-goal"]')?.addEventListener("click", finish);
  root.querySelector('[data-action="continue-after-goal"]')?.addEventListener("click", () => { if (goalReached) goalReached.hidden = true; });
  root.querySelector('[data-action="cancel-measurement"]')?.addEventListener("click", cancel);
  postRecordButton?.addEventListener("click", recordPostFatigue);
  root.querySelector('[data-action="skip-post-fatigue"]')?.addEventListener("click", navigateToRecord);
  root.querySelector('[data-action="map-zoom-in"]')?.addEventListener("click", () => map?.setZoom((map?.getZoom() || 16) + 1));
  root.querySelector('[data-action="map-zoom-out"]')?.addEventListener("click", () => map?.setZoom((map?.getZoom() || 16) - 1));

  const visibilityHandler = () => {
    if (document.visibilityState === "visible") requestWakeLock();
  };
  document.addEventListener("visibilitychange", visibilityHandler);

  return () => {
    const wasActive = measurementStarted;
    measurementStarted = false;
    stopWatch();
    stepEstimator.stop();
    notifier.close();
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    releaseWakeLock();
    map?.destroy();
    document.removeEventListener("visibilitychange", visibilityHandler);
    if (!handoffToRecord && (wasActive || root.dataset.measurementPhase === "post")) {
      clearPendingRunMeasurement();
      discardFatigueLink();
    }
  };
}
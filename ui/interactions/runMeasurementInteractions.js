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
import { createRunMeasurementMap } from "../runMeasurementMap.js";
import { clearPendingRunMeasurement, savePendingRunMeasurement } from "../runMeasurementState.js";

function geolocationErrorMessage(error) {
  if (error?.code === 1) return "位置情報が許可されていません。ブラウザーの設定でこのアプリへの位置情報を許可してください。";
  if (error?.code === 2) return "現在地を取得できません。屋外でGPSを受信しやすい場所に移動して再度お試しください。";
  if (error?.code === 3) return "現在地の取得に時間がかかっています。GPS受信状態を確認してください。";
  return "現在地を取得できませんでした。";
}

function createTone(frequency = 740) {
  let context = null;
  return () => {
    try {
      context ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.26);
    } catch {}
  };
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
  const postRecordButton = root.querySelector('[data-action="record-post-fatigue"]');

  const targetMinutesInput = root.querySelector("[data-measurement-target-minutes]");
  const targetDistanceInput = root.querySelector("[data-measurement-target-distance]");
  const modeControls = [...root.querySelectorAll('[name="measurementMode"]')];
  const planId = String(root.dataset.planId || "");
  const plannedPace = Number(root.dataset.targetPace || 0) || null;
  const playWarningTone = createTone(740);
  const playGoalTone = createTone(920);

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
    playWarningTone();
    try { navigator.vibrate?.([180, 80, 180]); } catch {}
    window.setTimeout(() => { if (warningNode) warningNode.hidden = true; }, 5000);
  }

  function reachGoal() {
    if (goalNotified || measurementMode === "free") return;
    goalNotified = true;
    if (goalReachedTitle) goalReachedTitle.textContent = measurementMode === "time" ? "設定した時間になりました" : "設定した距離に到達しました";
    if (goalReached) goalReached.hidden = false;
    playGoalTone();
    try { navigator.vibrate?.([280, 120, 280]); } catch {}
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

    clearPendingRunMeasurement();
    discardFatigueLink();
    const fatigueLink = capturePreFatigue();
    if (!fatigueLink.ok) {
      setMessage(prepStatus, "走る前の疲労感を保存できませんでした。疲労感を未選択に戻すか、もう一度お試しください。", true);
      return;
    }

    startedAtMs = Date.now();
    startedAtIso = new Date(startedAtMs).toISOString();
    if (fatigueRunId) {
      const marked = services.fatigue.markRunStart?.(fatigueRunId, startedAtIso);
      if (!marked?.ok) {
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
      lastAcceptedPoint = null;
      await releaseWakeLock();
      if (pauseButton) pauseButton.textContent = "再開";
      setMessage(activeStatus, "一時停止中です。時間と距離の加算を止めています。");
      updateMetrics();
      return;
    }

    pausedTotalMs += Math.max(0, Date.now() - Number(pausedAtMs || Date.now()));
    pausedAtMs = null;
    paused = false;
    lastAcceptedPoint = null;
    if (pauseButton) pauseButton.textContent = "一時停止";
    setMessage(activeStatus, "測定を再開しました。GPSを取得しています。");
    beginWatch();
    await requestWakeLock();
    updateMetrics();
  }

  function measurementPayload(elapsed) {
    return {
      runId: fatigueRunId,
      measurementMode,
      targetDurationMinutes,
      targetDistanceKm,
      startedAt: startedAtIso,
      endedAt: endedAtIso,
      distanceKm: Number((distanceM / 1000).toFixed(2)),
      durationMinutes: Number((elapsed / 60000).toFixed(2)),
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
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    await releaseWakeLock();

    let payload = measurementPayload(elapsed);
    let result = savePendingRunMeasurement(payload);
    if (!result.ok) {
      measurementStarted = true;
      paused = wasPaused;
      if (!paused) beginWatch();
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
          setMessage(activeStatus, "測定結果を次の画面へ引き継げませんでした。", true);
          return;
        }
      }
    }

    pendingPayload = payload;
    if (postTime) postTime.textContent = formatElapsed(elapsed);
    if (postDistance) postDistance.textContent = `${(distanceM / 1000).toFixed(2)} km`;
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
      clearPendingRunMeasurement();
      discardFatigueLink();
      router.navigateToScreen("home");
      return;
    }
    if (!window.confirm("測定中の内容を破棄して終了しますか？")) return;
    measurementStarted = false;
    stopWatch();
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

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

function createWarningTone() {
  let context = null;
  return () => {
    try {
      context ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 740;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.24);
    } catch {}
  };
}

export function bindRunMeasurement({ router, services }) {
  const root = document.querySelector("[data-run-measurement]");
  if (!root) return undefined;

  const mapContainer = root.querySelector("#run-measurement-map");
  let map = null;
  const elapsedNode = root.querySelector("[data-measurement-elapsed]");
  const distanceNode = root.querySelector("[data-measurement-distance]");
  const currentPaceNode = root.querySelector("[data-measurement-current-pace]");
  const averagePaceNode = root.querySelector("[data-measurement-average-pace]");
  const gpsStatus = root.querySelector("[data-gps-status]");
  const statusNode = root.querySelector("[data-measurement-status]");
  const warningNode = root.querySelector("[data-pace-warning]");
  const startButton = root.querySelector('[data-action="start-measurement"]');
  const finishButton = root.querySelector('[data-action="finish-measurement"]');
  const cancelButton = root.querySelector('[data-action="cancel-measurement"]');
  const saveRouteControl = root.querySelector("[data-save-route]");
  const fatigueSlider = root.querySelector("[data-measurement-fatigue-slider]");
  const fatigueValue = root.querySelector("[data-measurement-fatigue-value]");
  const fatigueStatus = root.querySelector("[data-measurement-fatigue-status]");
  const planId = String(root.dataset.planId || "");
  const plannedPace = Number(root.dataset.targetPace || 0) || null;
  const playWarningTone = createWarningTone();

  let watchId = null;
  let timerId = null;
  let wakeLock = null;
  let running = false;
  let startedAtMs = null;
  let startedAtIso = "";
  let distanceM = 0;
  let acceptedPointCount = 0;
  let rejectedPointCount = 0;
  let lastAcceptedPoint = null;
  let track = [];
  let paceExceededAt = null;
  let lastWarningAt = 0;
  let fatigueTouched = false;
  let fatigueRunId = "";

  function activeElapsedMs() {
    return running && startedAtMs ? Math.max(0, Date.now() - startedAtMs) : 0;
  }

  function setStatus(message, error = false) {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.classList.toggle("is-error", error);
  }

  function refreshFatigue() {
    if (!fatigueSlider || !fatigueValue || !fatigueStatus) return;
    if (!fatigueTouched) {
      fatigueValue.textContent = "—";
      fatigueStatus.textContent = "触れなければ記録せず、そのまま測定できます。";
      return;
    }
    fatigueValue.textContent = String(fatigueSlider.value);
    fatigueStatus.textContent = `走る前 ${fatigueSlider.value} を測定開始と関連付けます。`;
  }

  function selectFatigue() {
    fatigueTouched = true;
    refreshFatigue();
  }

  function discardFatigueLink() {
    if (!fatigueRunId || !services?.fatigue) return;
    services.fatigue.lifecycle?.removeState?.(fatigueRunId);
    services.fatigue.repository?.removeByRunId?.(fatigueRunId);
    fatigueRunId = "";
  }

  function capturePreFatigue() {
    if (!fatigueTouched || !services?.fatigue) return { ok: true, linked: false };
    const runId = services.fatigue.createRunId?.() || "";
    if (!runId) return { ok: false, code: "ROF_J_RUN_ID_FAILED" };
    const createdAt = new Date().toISOString();
    const lifecycle = services.fatigue.beginLifecycle?.({ runId, createdAt });
    if (!lifecycle?.ok) return lifecycle || { ok: false, code: "ROF_J_LIFECYCLE_FAILED" };
    const captured = services.fatigue.capturePreDirect?.(runId, Number(fatigueSlider?.value), new Date().toISOString());
    if (!captured?.ok) {
      services.fatigue.lifecycle?.removeState?.(runId);
      services.fatigue.repository?.removeByRunId?.(runId);
      return captured || { ok: false, code: "ROF_J_PRE_CAPTURE_FAILED" };
    }
    fatigueRunId = runId;
    return { ok: true, linked: true, runId };
  }

  function updateMetrics() {
    const elapsed = activeElapsedMs();
    if (elapsedNode) elapsedNode.textContent = formatElapsed(elapsed);
    if (distanceNode) distanceNode.textContent = (distanceM / 1000).toFixed(2);
    if (averagePaceNode) averagePaceNode.textContent = formatPace(averagePaceSecondsPerKm(distanceM, elapsed));
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
    if (!running || document.visibilityState !== "visible" || !navigator.wakeLock?.request) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch {
      wakeLock = null;
    }
  }

  function emitPaceWarning() {
    if (!warningNode) return;
    warningNode.hidden = false;
    playWarningTone();
    try { navigator.vibrate?.([180, 80, 180]); } catch {}
    window.setTimeout(() => { if (warningNode) warningNode.hidden = true; }, 5000);
  }

  function handlePosition(position) {
    if (!running) return;
    const point = normalizeGeolocationPosition(position);
    const evaluation = evaluateTrackPoint(lastAcceptedPoint, point);
    if (!evaluation.accepted) {
      rejectedPointCount += 1;
      if (evaluation.reason === "LOW_ACCURACY" && gpsStatus) {
        gpsStatus.textContent = `GPS精度 ±${Math.round(Number(point?.accuracyM || 0))}m・精度待ち`;
      }
      return;
    }

    distanceM += evaluation.distanceDeltaM;
    const accepted = Object.freeze({
      ...point,
      cumulativeDistanceM: distanceM,
    });
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
    setStatus(geolocationErrorMessage(error), true);
    if (gpsStatus) gpsStatus.textContent = "GPS取得エラー";
  }

  function beginWatch() {
    watchId = navigator.geolocation.watchPosition(handlePosition, handlePositionError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000,
    });
  }

  async function start() {
    if (running) return;
    if (!window.isSecureContext || !navigator.geolocation) {
      setStatus("このブラウザーではGPS測定を開始できません。HTTPS上の対応ブラウザーで開いてください。", true);
      return;
    }
    clearPendingRunMeasurement();
    discardFatigueLink();
    const fatigueLink = capturePreFatigue();
    if (!fatigueLink.ok) {
      setStatus("走る前の疲労感を保存できませんでした。もう一度お試しください。", true);
      return;
    }

    startedAtMs = Date.now();
    startedAtIso = new Date(startedAtMs).toISOString();
    if (fatigueRunId) {
      const marked = services.fatigue.markRunStart?.(fatigueRunId, startedAtIso);
      if (!marked?.ok) {
        discardFatigueLink();
        setStatus("疲労感を測定開始と関連付けられませんでした。もう一度お試しください。", true);
        return;
      }
    }

    running = true;
    distanceM = 0;
    acceptedPointCount = 0;
    rejectedPointCount = 0;
    lastAcceptedPoint = null;
    track = [];
    paceExceededAt = null;
    lastWarningAt = 0;
    if (fatigueSlider) fatigueSlider.disabled = true;
    startButton.hidden = true;
    finishButton.hidden = false;
    cancelButton.hidden = false;
    setStatus("GPSを取得しています。このアプリを前面に表示したまま走ってください。");
    timerId = window.setInterval(updateMetrics, 500);
    beginWatch();
    await requestWakeLock();
  }

  async function finish() {
    if (!running) return;
    if (!(distanceM >= 10) || !(activeElapsedMs() > 0)) {
      setStatus("まだ十分な移動距離を取得できていません。GPSを確認してから終了してください。", true);
      return;
    }
    const endedAtIso = new Date().toISOString();
    const elapsed = activeElapsedMs();
    running = false;
    stopWatch();
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    await releaseWakeLock();

    const payload = {
      runId: fatigueRunId,
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
    const result = savePendingRunMeasurement(payload);
    if (!result.ok) {
      running = true;
      startedAtMs = Date.now() - elapsed;
      timerId = window.setInterval(updateMetrics, 500);
      beginWatch();
      await requestWakeLock();
      setStatus("測定結果を端末内に保持できませんでした。ブラウザーの保存容量を確認してください。", true);
      return;
    }

    if (fatigueRunId) {
      const ended = services.fatigue.markRunEnd?.(fatigueRunId, endedAtIso);
      if (!ended?.ok) {
        discardFatigueLink();
        savePendingRunMeasurement({ ...payload, runId: "" });
      }
    }

    const parameters = { measurement: "1" };
    if (planId) parameters.planId = planId;
    if (fatigueRunId) parameters.runId = fatigueRunId;
    router.navigateToScreen("record-input", parameters);
  }

  async function cancel() {
    if (!running) {
      discardFatigueLink();
      router.navigateToScreen("home");
      return;
    }
    if (!window.confirm("測定中の内容を破棄して終了しますか？")) return;
    running = false;
    stopWatch();
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    await releaseWakeLock();
    clearPendingRunMeasurement();
    discardFatigueLink();
    router.navigateToScreen("home");
  }

  fatigueSlider?.addEventListener("pointerdown", selectFatigue);
  fatigueSlider?.addEventListener("input", selectFatigue);
  fatigueSlider?.addEventListener("change", selectFatigue);
  refreshFatigue();

  startButton?.addEventListener("click", start);
  finishButton?.addEventListener("click", finish);
  cancelButton?.addEventListener("click", cancel);
  root.querySelector('[data-action="map-zoom-in"]')?.addEventListener("click", () => map?.setZoom((map?.getZoom() || 16) + 1));
  root.querySelector('[data-action="map-zoom-out"]')?.addEventListener("click", () => map?.setZoom((map?.getZoom() || 16) - 1));

  const visibilityHandler = () => {
    if (document.visibilityState === "visible") requestWakeLock();
  };
  document.addEventListener("visibilitychange", visibilityHandler);

  return () => {
    const wasRunning = running;
    running = false;
    stopWatch();
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    releaseWakeLock();
    map?.destroy();
    document.removeEventListener("visibilitychange", visibilityHandler);
    if (wasRunning) discardFatigueLink();
  };
}

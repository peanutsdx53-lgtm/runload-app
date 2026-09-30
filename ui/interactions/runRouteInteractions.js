import { haversineDistanceMeters } from "../runMeasurementCore.js";
import { createRunMeasurementMap } from "../runMeasurementMap.js";
import { findSavedRunMeasurement } from "../runMeasurementState.js";

function elapsedLabel(milliseconds) {
  const seconds = Math.max(0, Math.round(Number(milliseconds || 0) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

function replayTimeline(track = []) {
  let distanceM = 0;
  return track.map((point, index) => {
    if (index > 0) {
      const delta = haversineDistanceMeters(track[index - 1], point);
      if (Number.isFinite(delta) && delta >= 0) distanceM += delta;
    }
    return { point, distanceM };
  });
}

export function bindRunRoute({ context }) {
  const root = document.querySelector("[data-run-route]");
  if (!root) return undefined;
  const recordId = String(context?.parameters?.get?.("recordId") || root.dataset.recordId || "");
  const measurement = findSavedRunMeasurement(recordId);
  const mapContainer = root.querySelector("#run-route-map");
  if (!measurement?.track?.length || !mapContainer) return undefined;

  const track = measurement.track.filter((point) => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lon)) && Number.isFinite(Number(point?.timestamp)));
  const map = createRunMeasurementMap(mapContainer, { initialZoom: 16 });
  map?.fitTrack(track);

  root.querySelector('[data-action="route-zoom-in"]')?.addEventListener("click", () => map?.setZoom((map?.getZoom() || 16) + 1));
  root.querySelector('[data-action="route-zoom-out"]')?.addEventListener("click", () => map?.setZoom((map?.getZoom() || 16) - 1));

  const replay = root.querySelector("[data-run-route-replay]");
  const playButton = replay?.querySelector('[data-action="toggle-route-replay"]');
  const slider = replay?.querySelector("[data-route-replay-progress]");
  const timeOutput = replay?.querySelector("[data-route-replay-time]");
  const distanceOutput = replay?.querySelector("[data-route-replay-distance]");
  const timeline = replayTimeline(track);
  const firstTime = Number(track[0]?.timestamp || 0);
  const lastTime = Number(track.at(-1)?.timestamp || firstTime);
  const span = Math.max(1, lastTime - firstTime);
  const replayDurationMs = Math.max(6500, Math.min(12000, track.length * 16));
  const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  const requestedReplay = context?.parameters?.get?.("replay") === "1";
  let progress = requestedReplay ? 0 : 1;
  let playing = false;
  let frame = 0;
  let startedAt = 0;

  function indexForProgress(value) {
    const target = firstTime + span * value;
    let low = 0;
    let high = track.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (Number(track[mid].timestamp) <= target) low = mid;
      else high = mid - 1;
    }
    return low;
  }

  function renderReplay(value) {
    progress = Math.max(0, Math.min(1, Number(value)));
    const index = indexForProgress(progress);
    const row = timeline[index] || timeline[0];
    const point = row?.point || track[0];
    const partial = track.slice(0, Math.max(1, index + 1));
    map?.setTrack(partial);
    map?.setMarker(point);
    if (slider) slider.value = String(Math.round(progress * 1000));
    if (timeOutput) timeOutput.textContent = elapsedLabel(Math.max(0, Number(point?.timestamp || firstTime) - firstTime));
    if (distanceOutput) distanceOutput.textContent = `${(Number(row?.distanceM || 0) / 1000).toFixed(2)} km`;
  }

  function setPlaying(next) {
    playing = Boolean(next);
    playButton?.setAttribute("aria-pressed", String(playing));
    if (playButton) playButton.textContent = playing ? "停止" : (progress >= 1 ? "もう一度" : "再生");
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    setPlaying(false);
  }

  function tick(now) {
    if (!playing) return;
    if (!startedAt) startedAt = now - progress * replayDurationMs;
    const next = Math.min(1, (now - startedAt) / replayDurationMs);
    renderReplay(next);
    if (next >= 1) {
      startedAt = 0;
      setPlaying(false);
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  playButton?.addEventListener("click", () => {
    if (playing) {
      stop();
      return;
    }
    if (progress >= 1) renderReplay(0);
    startedAt = performance.now() - progress * replayDurationMs;
    setPlaying(true);
    frame = requestAnimationFrame(tick);
  });
  slider?.addEventListener("input", () => {
    stop();
    renderReplay(Number(slider.value || 0) / 1000);
  });

  renderReplay(progress);
  if (requestedReplay && !reducedMotion) {
    requestAnimationFrame(() => {
      startedAt = performance.now();
      setPlaying(true);
      frame = requestAnimationFrame(tick);
    });
  }

  return () => {
    stop();
    map?.destroy();
  };
}

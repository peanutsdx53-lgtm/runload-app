const DEFAULT_MAX_UNUSABLE_GPS_MS = 30000;

function finiteTime(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isUsableQuality(value) {
  return value === "good" || value === "fair";
}

export function createMobileGpsQualityTracker({
  maxUnusableGpsMs = DEFAULT_MAX_UNUSABLE_GPS_MS,
  now = () => Date.now(),
} = {}) {
  const thresholdMs = Math.max(1000, finiteTime(maxUnusableGpsMs, DEFAULT_MAX_UNUSABLE_GPS_MS));
  let active = false;
  let paused = false;
  let currentQuality = "waiting";
  let unusableStartedAt = null;
  let maxObservedUnusableMs = 0;
  let hadUsableFix = false;

  function closeUnusable(at = now()) {
    if (unusableStartedAt == null) return;
    maxObservedUnusableMs = Math.max(maxObservedUnusableMs, Math.max(0, finiteTime(at) - unusableStartedAt));
    unusableStartedAt = null;
  }

  function openUnusable(at = now()) {
    if (!active || paused || isUsableQuality(currentQuality) || unusableStartedAt != null) return;
    unusableStartedAt = finiteTime(at);
  }

  function start(quality = "waiting", at = now()) {
    active = true;
    paused = false;
    currentQuality = String(quality || "waiting");
    unusableStartedAt = null;
    maxObservedUnusableMs = 0;
    hadUsableFix = isUsableQuality(currentQuality);
    if (!hadUsableFix) openUnusable(at);
  }

  function observeQuality(quality, at = now()) {
    if (!active) return;
    const next = String(quality || "waiting");
    const wasUsable = isUsableQuality(currentQuality);
    const nextUsable = isUsableQuality(next);
    currentQuality = next;
    if (nextUsable) {
      hadUsableFix = true;
      closeUnusable(at);
      return;
    }
    if (wasUsable) openUnusable(at);
  }

  function setPaused(nextPaused, at = now()) {
    if (!active) return;
    const next = Boolean(nextPaused);
    if (next === paused) return;
    if (next) closeUnusable(at);
    paused = next;
    if (!paused) openUnusable(at);
  }

  function snapshot(at = now()) {
    let maxMs = maxObservedUnusableMs;
    if (unusableStartedAt != null && active && !paused) {
      maxMs = Math.max(maxMs, Math.max(0, finiteTime(at) - unusableStartedAt));
    }
    const allowed = hadUsableFix && maxMs <= thresholdMs;
    return Object.freeze({
      policy: "SMARTPHONE_EXTENSION_OPERATIONAL_GPS_QUALITY_GATE_V1",
      thresholdMs,
      hadUsableFix,
      maxUnusableGpsMs: Math.round(maxMs),
      regionalAnalysisAllowed: allowed,
      reason: !hadUsableFix
        ? "NO_USABLE_GPS_FIX"
        : maxMs > thresholdMs
          ? "GPS_UNUSABLE_TOO_LONG"
          : "OK",
    });
  }

  function finish(at = now()) {
    const result = snapshot(at);
    closeUnusable(at);
    active = false;
    paused = false;
    return result;
  }

  return Object.freeze({ start, observeQuality, setPaused, snapshot, finish });
}

export function suppressRegionalCoverageForGpsQuality(segments = [], qualityGate = null) {
  if (qualityGate?.regionalAnalysisAllowed !== false) return Object.freeze(Array.isArray(segments) ? [...segments] : []);
  return Object.freeze((Array.isArray(segments) ? segments : []).map((segment) => {
    if (!segment || segment.gaitId === "RUNNING_CURRENT") return segment;
    return Object.freeze({
      ...segment,
      coverage: null,
      regionalOutputStatus: "SUPPRESSED_GPS_QUALITY",
    });
  }));
}

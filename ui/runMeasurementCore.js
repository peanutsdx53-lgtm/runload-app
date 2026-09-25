const DEFAULT_OPTIONS = Object.freeze({
  maximumAccuracyM: 50,
  maximumSegmentSpeedMps: 15,
  minimumSegmentDistanceM: 2,
  stationarySampleIntervalMs: 5000,
  rollingWindowMs: 20000,
  warningHoldMs: 10000,
  maximumStoredPoints: 2000,
});

function finite(value) {
  return Number.isFinite(Number(value));
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function toRadians(degrees) {
  return Number(degrees) * Math.PI / 180;
}

export function haversineDistanceMeters(a = {}, b = {}) {
  if (![a.lat, a.lon, b.lat, b.lon].every(finite)) return Number.NaN;
  const radiusM = 6371000;
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(Number(b.lat) - Number(a.lat));
  const deltaLon = toRadians(Number(b.lon) - Number(a.lon));
  const value = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * radiusM * Math.asin(Math.min(1, Math.sqrt(value)));
}

export function normalizeGeolocationPosition(position) {
  const coords = position?.coords || {};
  const lat = Number(coords.latitude);
  const lon = Number(coords.longitude);
  const accuracyM = Number(coords.accuracy);
  const altitudeM = coords.altitude == null ? null : Number(coords.altitude);
  const reportedSpeedMps = coords.speed == null ? null : Number(coords.speed);
  const timestamp = Number(position?.timestamp || Date.now());

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(timestamp)) return null;
  return Object.freeze({
    lat,
    lon,
    accuracyM: Number.isFinite(accuracyM) && accuracyM >= 0 ? accuracyM : null,
    altitudeM: Number.isFinite(altitudeM) ? altitudeM : null,
    reportedSpeedMps: Number.isFinite(reportedSpeedMps) && reportedSpeedMps >= 0 ? reportedSpeedMps : null,
    timestamp,
  });
}

export function evaluateTrackPoint(previousPoint, currentPoint, options = {}) {
  const limits = { ...DEFAULT_OPTIONS, ...options };
  if (!currentPoint || !finite(currentPoint.lat) || !finite(currentPoint.lon) || !finite(currentPoint.timestamp)) {
    return Object.freeze({ accepted: false, reason: "INVALID_POSITION", distanceDeltaM: 0, derivedSpeedMps: null });
  }
  if (finite(currentPoint.accuracyM) && Number(currentPoint.accuracyM) > limits.maximumAccuracyM) {
    return Object.freeze({ accepted: false, reason: "LOW_ACCURACY", distanceDeltaM: 0, derivedSpeedMps: null });
  }
  if (!previousPoint) {
    return Object.freeze({ accepted: true, reason: "FIRST_POINT", distanceDeltaM: 0, derivedSpeedMps: null });
  }

  const elapsedMs = Number(currentPoint.timestamp) - Number(previousPoint.timestamp);
  if (!(elapsedMs > 0)) {
    return Object.freeze({ accepted: false, reason: "NON_FORWARD_TIME", distanceDeltaM: 0, derivedSpeedMps: null });
  }

  const distanceM = haversineDistanceMeters(previousPoint, currentPoint);
  if (!Number.isFinite(distanceM)) {
    return Object.freeze({ accepted: false, reason: "INVALID_DISTANCE", distanceDeltaM: 0, derivedSpeedMps: null });
  }
  const derivedSpeedMps = distanceM / (elapsedMs / 1000);
  if (derivedSpeedMps > limits.maximumSegmentSpeedMps) {
    return Object.freeze({ accepted: false, reason: "IMPLAUSIBLE_SPEED", distanceDeltaM: 0, derivedSpeedMps });
  }

  const movedEnough = distanceM >= limits.minimumSegmentDistanceM;
  const timedSample = elapsedMs >= limits.stationarySampleIntervalMs;
  if (!movedEnough && !timedSample) {
    return Object.freeze({ accepted: false, reason: "TOO_CLOSE", distanceDeltaM: 0, derivedSpeedMps });
  }

  return Object.freeze({
    accepted: true,
    reason: movedEnough ? "MOVED" : "STATIONARY_SAMPLE",
    distanceDeltaM: movedEnough ? distanceM : 0,
    derivedSpeedMps,
  });
}

export function rollingPaceSecondsPerKm(points = [], windowMs = DEFAULT_OPTIONS.rollingWindowMs) {
  const rows = Array.isArray(points) ? points.filter((point) => finite(point?.timestamp) && finite(point?.cumulativeDistanceM)) : [];
  if (rows.length < 2) return null;
  const last = rows.at(-1);
  const cutoff = Number(last.timestamp) - Number(windowMs);
  let first = rows[0];
  for (let index = rows.length - 2; index >= 0; index -= 1) {
    first = rows[index];
    if (Number(first.timestamp) <= cutoff) break;
  }
  const elapsedSeconds = (Number(last.timestamp) - Number(first.timestamp)) / 1000;
  const distanceKm = (Number(last.cumulativeDistanceM) - Number(first.cumulativeDistanceM)) / 1000;
  if (!(elapsedSeconds > 0) || !(distanceKm >= 0.03)) return null;
  return elapsedSeconds / distanceKm;
}

export function averagePaceSecondsPerKm(distanceM, activeElapsedMs) {
  const distanceKm = Number(distanceM) / 1000;
  const elapsedSeconds = Number(activeElapsedMs) / 1000;
  if (!(distanceKm > 0) || !(elapsedSeconds > 0)) return null;
  return elapsedSeconds / distanceKm;
}

export function plannedPaceSecondsPerKm(plan = {}) {
  const session = plan?.plannedSession || {};
  const distanceKm = Number(session.distanceKm);
  const durationMinutes = Number(session.durationMinutes);
  if (!(distanceKm > 0) || !(durationMinutes > 0)) return null;
  return durationMinutes * 60 / distanceKm;
}

export function updatePaceWarningState({
  currentPaceSecondsPerKm,
  plannedPaceSecondsPerKm: plannedPace,
  exceededAt = null,
  now = Date.now(),
  holdMs = DEFAULT_OPTIONS.warningHoldMs,
} = {}) {
  const current = Number(currentPaceSecondsPerKm);
  const planned = Number(plannedPace);
  const timestamp = Number(now);
  if (!(current > 0) || !(planned > 0) || !(timestamp > 0)) {
    return Object.freeze({ exceeded: false, shouldWarn: false, exceededAt: null });
  }
  const exceeded = current < planned;
  if (!exceeded) return Object.freeze({ exceeded: false, shouldWarn: false, exceededAt: null });
  const startedAt = Number(exceededAt) > 0 ? Number(exceededAt) : timestamp;
  return Object.freeze({
    exceeded: true,
    shouldWarn: timestamp - startedAt >= Number(holdMs),
    exceededAt: startedAt,
  });
}

export function formatPace(paceSecondsPerKm) {
  const value = Number(paceSecondsPerKm);
  if (!(value > 0) || !Number.isFinite(value)) return "—";
  const rounded = Math.max(1, Math.round(value));
  const minutes = Math.floor(rounded / 60);
  const seconds = String(rounded % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function formatElapsed(activeElapsedMs) {
  const seconds = Math.max(0, Math.floor(Number(activeElapsedMs || 0) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}

export function simplifyTrackForStorage(points = [], maximumPoints = DEFAULT_OPTIONS.maximumStoredPoints) {
  const rows = Array.isArray(points) ? points.filter((point) => finite(point?.lat) && finite(point?.lon) && finite(point?.timestamp)) : [];
  if (!rows.length) return Object.freeze([]);
  const limit = Math.max(2, Math.floor(Number(maximumPoints) || DEFAULT_OPTIONS.maximumStoredPoints));
  const selected = rows.length <= limit
    ? rows
    : Array.from({ length: limit }, (_, index) => rows[Math.round(index * (rows.length - 1) / (limit - 1))]);
  return Object.freeze(selected.map((point) => Object.freeze({
    lat: round(point.lat, 6),
    lon: round(point.lon, 6),
    timestamp: Math.round(Number(point.timestamp)),
    accuracyM: finite(point.accuracyM) ? round(point.accuracyM, 1) : null,
  })));
}

export const RUN_MEASUREMENT_OPTIONS = DEFAULT_OPTIONS;

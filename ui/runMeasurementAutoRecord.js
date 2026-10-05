import { isPresentFiniteNumber as finite } from "../shared/valueUtilities.js";
import { haversineDistanceMeters } from "./runMeasurementCore.js";

export const STEP_ESTIMATE_MODEL_ID = "device-motion-peak-v1";
export const COURSE_ANALYSIS_MODEL_ID = "gps-course-analysis-v1";

const GRAVITY = 9.80665;
const STEP_THRESHOLD = 1.15;
const STEP_REFRACTORY_MS = 280;
const MAX_ALTITUDE_ACCURACY_M = 30;
const MAX_ABS_GRADE_PERCENT = 30;
const MIN_GRADE_DISTANCE_M = 5;
const GRADE_THRESHOLD_PERCENT = 1;

function round(value, digits = 1) {
  const scale = 10 ** digits;
  return Math.round(Number(value) * scale) / scale;
}

function magnitude(vector) {
  if (!vector || ![vector.x, vector.y, vector.z].every(finite)) return null;
  return Math.sqrt(Number(vector.x) ** 2 + Number(vector.y) ** 2 + Number(vector.z) ** 2);
}

export function createMotionStepEstimator(target = globalThis) {
  let listening = false;
  let active = false;
  let steps = 0;
  let lastStepAt = -Infinity;
  let wasAbove = false;
  let gravityBaseline = GRAVITY;
  let status = "UNAVAILABLE";

  function signalFromEvent(event) {
    const linear = magnitude(event?.acceleration);
    if (linear != null) return linear;
    const withGravity = magnitude(event?.accelerationIncludingGravity);
    if (withGravity == null) return null;
    gravityBaseline = gravityBaseline * 0.98 + withGravity * 0.02;
    return Math.abs(withGravity - gravityBaseline);
  }

  function handleMotion(event) {
    if (!active) return;
    const signal = signalFromEvent(event);
    if (!(signal >= 0)) return;
    const timestamp = Number(event?.timeStamp || target.performance?.now?.() || Date.now());
    const above = signal >= STEP_THRESHOLD;
    if (above && !wasAbove && timestamp - lastStepAt >= STEP_REFRACTORY_MS) {
      steps += 1;
      lastStepAt = timestamp;
    }
    wasAbove = above;
  }

  async function start() {
    const MotionEvent = target.DeviceMotionEvent;
    if (!MotionEvent || typeof target.addEventListener !== "function") {
      status = "UNAVAILABLE";
      return Object.freeze({ ok: false, status });
    }
    if (typeof MotionEvent.requestPermission === "function") {
      try {
        const permission = await MotionEvent.requestPermission();
        if (permission !== "granted") {
          status = "DENIED";
          return Object.freeze({ ok: false, status });
        }
      } catch {
        status = "DENIED";
        return Object.freeze({ ok: false, status });
      }
    }
    if (!listening) {
      target.addEventListener("devicemotion", handleMotion, { passive: true });
      listening = true;
    }
    steps = 0;
    lastStepAt = -Infinity;
    wasAbove = false;
    gravityBaseline = GRAVITY;
    active = true;
    status = "ACTIVE";
    return Object.freeze({ ok: true, status });
  }

  function pause() {
    active = false;
    if (listening) status = "PAUSED";
  }

  function resume() {
    if (!listening) return;
    active = true;
    status = "ACTIVE";
  }

  function snapshot(activeDurationMs = 0) {
    const durationMinutes = Number(activeDurationMs) / 60000;
    if (!listening || steps < 4 || !(durationMinutes > 0)) return null;
    return Object.freeze({
      modelId: STEP_ESTIMATE_MODEL_ID,
      method: "DEVICE_MOTION_ESTIMATE",
      steps,
      cadenceSpm: round(steps / durationMinutes, 1),
      activeDurationMinutes: round(durationMinutes, 2),
    });
  }

  function liveSteps() {
    return listening ? steps : null;
  }

  function stop() {
    active = false;
    if (listening) target.removeEventListener?.("devicemotion", handleMotion);
    listening = false;
    status = "STOPPED";
  }

  return Object.freeze({ start, pause, resume, snapshot, liveSteps, stop, status: () => status });
}

function median(values = []) {
  const rows = values.filter(finite).map(Number).sort((a, b) => a - b);
  if (!rows.length) return null;
  const middle = Math.floor(rows.length / 2);
  return rows.length % 2 ? rows[middle] : (rows[middle - 1] + rows[middle]) / 2;
}

function smoothedAltitudes(points = []) {
  return points.map((_, index) => median(points.slice(Math.max(0, index - 2), Math.min(points.length, index + 3)).map((point) => point?.altitudeM)));
}

function weightedMedian(rows = []) {
  const valid = rows.filter((row) => finite(row.value) && finite(row.weight) && Number(row.weight) > 0).sort((a, b) => Number(a.value) - Number(b.value));
  const total = valid.reduce((sum, row) => sum + Number(row.weight), 0);
  let acc = 0;
  for (const row of valid) {
    acc += Number(row.weight);
    if (acc >= total / 2) return Number(row.value);
  }
  return valid.at(-1)?.value ?? null;
}

function measuredSegmentDistanceMeters(a = {}, b = {}) {
  const previousCumulative = Number(a?.cumulativeDistanceM);
  const currentCumulative = Number(b?.cumulativeDistanceM);
  if (finite(a?.cumulativeDistanceM) && finite(b?.cumulativeDistanceM) && currentCumulative >= previousCumulative) {
    return currentCumulative - previousCumulative;
  }
  return haversineDistanceMeters(a, b);
}

function sampled(points = [], max = 80) {
  if (points.length <= max) return points;
  return Array.from({ length: max }, (_, index) => points[Math.round(index * (points.length - 1) / (max - 1))]);
}

function retraceRatio(points = []) {
  if (points.length < 8) return 0;
  const middle = Math.floor(points.length / 2);
  const first = sampled(points.slice(0, middle), 50);
  const second = sampled(points.slice(middle), 50);
  if (!first.length || !second.length) return 0;
  let matched = 0;
  second.forEach((point) => {
    const nearest = first.reduce((best, candidate) => Math.min(best, haversineDistanceMeters(point, candidate)), Infinity);
    if (nearest <= 35) matched += 1;
  });
  return matched / second.length;
}

function inferRoutePattern(points, totalM) {
  if (points.length < 4 || totalM < 300) return Object.freeze({ routePattern: "UNKNOWN", retraceRatio: 0 });
  const startEndM = haversineDistanceMeters(points[0], points.at(-1));
  const retrace = retraceRatio(points);
  const returnsNearStart = startEndM <= Math.max(60, totalM * 0.06);
  if (returnsNearStart && retrace >= 0.55) return Object.freeze({ routePattern: "OUT_AND_BACK", retraceRatio: round(retrace, 2) });
  if (returnsNearStart) return Object.freeze({ routePattern: "LOOP", retraceRatio: round(retrace, 2) });
  if (retrace >= 0.45) return Object.freeze({ routePattern: "MIXED", retraceRatio: round(retrace, 2) });
  if (startEndM >= Math.max(150, totalM * 0.15)) return Object.freeze({ routePattern: "ONE_WAY", retraceRatio: round(retrace, 2) });
  return Object.freeze({ routePattern: "MIXED", retraceRatio: round(retrace, 2) });
}

export function routePatternLabel(value) {
  const key = String(value || "UNKNOWN").toUpperCase();
  return ({ LOOP: "周回", OUT_AND_BACK: "往復", ONE_WAY: "片道", MIXED: "複合" })[key] || "判定保留";
}

export function analyzeMeasuredCourse({ track = [], durationMs = 0, name = "GPS測定コース" } = {}) {
  const points = Array.isArray(track) ? track.filter((point) => finite(point?.lat) && finite(point?.lon)) : [];
  if (points.length < 2) return null;

  const altitudes = smoothedAltitudes(points);
  let totalM = 0;
  let gradeEvaluatedM = 0;
  let upM = 0;
  let downM = 0;
  let flatM = 0;
  let gainM = 0;
  let lossM = 0;
  const uphillGrades = [];
  const downhillGrades = [];

  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    const distanceM = measuredSegmentDistanceMeters(a, b);
    if (!(distanceM > 0)) continue;
    totalM += distanceM;

    const altitudeA = altitudes[index - 1];
    const altitudeB = altitudes[index];
    const accuracyA = finite(a.altitudeAccuracyM) ? Number(a.altitudeAccuracyM) : null;
    const accuracyB = finite(b.altitudeAccuracyM) ? Number(b.altitudeAccuracyM) : null;
    const altitudeAccurate = (accuracyA == null || accuracyA <= MAX_ALTITUDE_ACCURACY_M)
      && (accuracyB == null || accuracyB <= MAX_ALTITUDE_ACCURACY_M);
    if (!finite(altitudeA) || !finite(altitudeB) || !altitudeAccurate) continue;
    if (distanceM < MIN_GRADE_DISTANCE_M) continue;

    const riseM = Number(altitudeB) - Number(altitudeA);
    const grade = riseM / distanceM * 100;
    if (!Number.isFinite(grade) || Math.abs(grade) > MAX_ABS_GRADE_PERCENT) continue;
    gradeEvaluatedM += distanceM;
    if (riseM > 0) gainM += riseM;
    else lossM += Math.abs(riseM);

    if (grade > GRADE_THRESHOLD_PERCENT) {
      upM += distanceM;
      uphillGrades.push({ value: Math.abs(grade), weight: distanceM });
    } else if (grade < -GRADE_THRESHOLD_PERCENT) {
      downM += distanceM;
      downhillGrades.push({ value: Math.abs(grade), weight: distanceM });
    } else {
      flatM += distanceM;
    }
  }

  if (!(totalM > 0)) return null;
  const elevationCoverage = gradeEvaluatedM / totalM;
  const gradeKnown = gradeEvaluatedM > 0 && elevationCoverage >= 0.8;
  const route = inferRoutePattern(points, totalM);
  const durationMinutes = Number(durationMs) > 0 ? Number(durationMs) / 60000 : null;
  const date = new Date();
  const generatedName = `${String(name || "GPS測定コース").slice(0, 60)} ${date.getMonth() + 1}/${date.getDate()}`;

  return Object.freeze({
    modelId: COURSE_ANALYSIS_MODEL_ID,
    source: "LIVE_GPS_ANALYSIS",
    name: generatedName.slice(0, 80),
    routePattern: route.routePattern,
    retraceRatio: route.retraceRatio,
    distanceKm: round(totalM / 1000, 2),
    durationMinutes: durationMinutes == null ? null : round(durationMinutes, 2),
    elevationGainM: gradeKnown ? round(gainM, 0) : null,
    elevationLossM: gradeKnown ? round(lossM, 0) : null,
    elevationCoverage: round(elevationCoverage, 3),
    gradeKnowledge: gradeKnown ? "KNOWN_PROFILE" : "UNKNOWN",
    gradeInputMode: gradeKnown ? "SUMMARY" : "UNKNOWN",
    upPercent: gradeKnown ? round(upM / gradeEvaluatedM * 100, 1) : 0,
    downPercent: gradeKnown ? round(downM / gradeEvaluatedM * 100, 1) : 0,
    flatPercent: gradeKnown ? round(flatM / gradeEvaluatedM * 100, 1) : null,
    upGradePercent: gradeKnown ? round(weightedMedian(uphillGrades) || 0, 1) : 0,
    downGradePercent: gradeKnown ? round(weightedMedian(downhillGrades) || 0, 1) : 0,
    surfaceInputMode: "UNKNOWN",
    modelSurfaceClass: "UNKNOWN",
    modelSurfaceProfile: Object.freeze([]),
    pavedPercent: 0,
    trackPercent: 0,
    treadmillPercent: 0,
    soilPercent: 0,
    trailPercent: 0,
    naturalGrassPercent: 0,
    artificialTurfPercent: 0,
    sandPercent: 0,
    rawPointCount: points.length,
  });
}

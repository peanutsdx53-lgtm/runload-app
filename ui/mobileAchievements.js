import { parseLocalDateAtNoon } from "../shared/textUtilities.js";
import { isPresentFiniteNumber as finite } from "../shared/valueUtilities.js";
import { findSavedRunMeasurement } from "./runMeasurementState.js";

const STORAGE_KEY = "running-record-mobile-achievements-v1";
const STATE_VERSION = 1;

const DEFINITIONS = Object.freeze([
  Object.freeze({ id: "first-record", tier: "bronze", title: "最初の記録", short: "記録を1件保存", kind: "records", target: 1 }),
  Object.freeze({ id: "run-3", tier: "bronze", title: "3回の走行", short: "走行記録を3回保存", kind: "runs", target: 3 }),
  Object.freeze({ id: "week-3", tier: "silver", title: "今週3回", short: "同じ週に3回走行", kind: "weeklyRuns", target: 3 }),
  Object.freeze({ id: "distance-5", tier: "bronze", title: "累計5 km", short: "走行距離の累計5 km", kind: "distance", target: 5 }),
  Object.freeze({ id: "distance-25", tier: "silver", title: "累計25 km", short: "走行距離の累計25 km", kind: "distance", target: 25 }),
  Object.freeze({ id: "distance-100", tier: "gold", title: "累計100 km", short: "走行距離の累計100 km", kind: "distance", target: 100 }),
  Object.freeze({ id: "rest-1", tier: "bronze", title: "休養も記録", short: "休養記録を1件保存", kind: "rests", target: 1 }),
  Object.freeze({ id: "plan-1", tier: "bronze", title: "次の予定", short: "予定を1件保存", kind: "plans", target: 1 }),
  Object.freeze({ id: "course-3", tier: "silver", title: "3つのコース", short: "コースを3件保存", kind: "courses", target: 3 }),
  Object.freeze({ id: "energy-500", tier: "silver", title: "推定500 kcal", short: "対応するGPS走行の推定消費500 kcal", kind: "energy", target: 500 }),
  Object.freeze({ id: "weeks-3", tier: "gold", title: "3週の記録", short: "3つの週で走行を記録", kind: "activeWeeks", target: 3 }),
]);

function todayWeekKey(value) {
  const date = value instanceof Date ? value : parseLocalDateAtNoon(value);
  if (!date || !Number.isFinite(date.getTime())) return "";
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
  const year = copy.getFullYear();
  const month = String(copy.getMonth() + 1).padStart(2, "0");
  const d = String(copy.getDate()).padStart(2, "0");
  return `${year}-${month}-${d}`;
}

function nowIso() {
  return new Date().toISOString();
}

// A read fallback is suitable for displaying achievements, but never grants
// authority to rewrite an unreadable, future or malformed saved record.
function readStateForWrite() {
  try {
    const storage = globalThis.localStorage;
    if (typeof storage?.getItem !== "function" || typeof storage?.setItem !== "function") return null;
    const raw = storage.getItem(STORAGE_KEY);
    if (raw == null) {
      return { storage, raw, state: { version: STATE_VERSION, unlocked: {}, announced: {} } };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    if (parsed.version != null && parsed.version !== STATE_VERSION) return null;
    for (const key of ["unlocked", "announced"]) {
      if (parsed[key] !== undefined &&
        (!parsed[key] || typeof parsed[key] !== "object" || Array.isArray(parsed[key]))) return null;
    }
    // Preserve older optional fields and unknown extension data verbatim.
    return { storage, raw, state: { ...parsed, version: STATE_VERSION,
      unlocked: { ...(parsed.unlocked || {}) }, announced: { ...(parsed.announced || {}) } } };
  } catch {
    return null;
  }
}

function writeStateSafely(snapshot) {
  if (!snapshot) return false;
  try {
    // An external tab or another same-origin app may have changed storage.
    if (snapshot.storage.getItem(STORAGE_KEY) !== snapshot.raw) return false;
    snapshot.storage.setItem(STORAGE_KEY, JSON.stringify(snapshot.state));
    return true;
  } catch {
    return false;
  }
}

export function collectAchievementMetrics(services) {
  const records = services?.storage?.records?.loadAll?.() || [];
  const plans = services?.storage?.plans?.loadAll?.() || [];
  const courses = services?.storage?.courses?.loadAll?.() || [];
  const runs = records.filter((record) => record?.activityType === "run");
  const rests = records.filter((record) => record?.activityType === "rest");
  const currentWeek = todayWeekKey(new Date());
  const weeklyRuns = runs.filter((record) => todayWeekKey(record.date) === currentWeek).length;
  const distance = runs.reduce((sum, record) => sum + (finite(record.distanceKm) && Number(record.distanceKm) >= 0 ? Number(record.distanceKm) : 0), 0);
  const activeWeeks = new Set(runs.map((record) => todayWeekKey(record.date)).filter(Boolean)).size;
  let energy = 0;
  let energyRecords = 0;
  runs.forEach((record) => {
    const estimate = findSavedRunMeasurement(record.id)?.energyEstimate?.estimatedKcal;
    if (typeof estimate !== "number" || !Number.isFinite(estimate) || estimate < 0) return;
    energy += estimate;
    energyRecords += 1;
  });
  return Object.freeze({
    records: records.length,
    runs: runs.length,
    rests: rests.length,
    weeklyRuns,
    distance,
    plans: plans.length,
    courses: courses.length,
    energy,
    energyRecords,
    activeWeeks,
  });
}

function valueFor(definition, metrics) {
  return Math.max(0, Number(metrics?.[definition.kind] || 0));
}

export function evaluateAchievements(services) {
  const metrics = collectAchievementMetrics(services);
  return DEFINITIONS.map((definition) => {
    const value = valueFor(definition, metrics);
    return Object.freeze({
      ...definition,
      value,
      unlocked: value >= definition.target,
      progress: Math.min(1, definition.target > 0 ? value / definition.target : 1),
    });
  });
}

export function syncAchievements(services, { initializeAnnouncements = false } = {}) {
  const snapshot = readStateForWrite();
  const state = snapshot?.state || { version: STATE_VERSION, unlocked: {}, announced: {} };
  const evaluated = evaluateAchievements(services);
  const stamp = nowIso();
  evaluated.forEach((achievement) => {
    if (!achievement.unlocked || state.unlocked[achievement.id]) return;
    state.unlocked[achievement.id] = stamp;
  });
  if (snapshot?.raw == null && snapshot && initializeAnnouncements) {
    Object.keys(state.unlocked).forEach((id) => { state.announced[id] = state.unlocked[id]; });
  }
  const saved = writeStateSafely(snapshot);
  return evaluated.map((achievement) => Object.freeze({
    ...achievement,
    unlockedAt: saved ? state.unlocked[achievement.id] || "" : "",
    announcedAt: saved ? state.announced[achievement.id] || "" : "",
  }));
}

export function initializeAchievementState(services) {
  return syncAchievements(services, { initializeAnnouncements: true });
}

export function achievementSummary(services) {
  const achievements = syncAchievements(services);
  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  return Object.freeze({
    unlockedCount: unlocked.length,
    totalCount: achievements.length,
    latest: unlocked.sort((a, b) => String(b.unlockedAt).localeCompare(String(a.unlockedAt)))[0] || null,
  });
}

export function consumeUnannouncedAchievements(services) {
  const achievements = syncAchievements(services);
  const snapshot = readStateForWrite();
  if (!snapshot) return [];
  const state = snapshot.state;
  const unseen = achievements.filter((achievement) => achievement.unlocked && !state.announced[achievement.id]);
  if (!unseen.length) return [];
  const stamp = nowIso();
  unseen.forEach((achievement) => { state.announced[achievement.id] = stamp; });
  // Never report the notification as consumed if its durable acknowledgement failed.
  return writeStateSafely(snapshot) ? unseen : [];
}

export function achievementDefinitions() {
  return DEFINITIONS;
}

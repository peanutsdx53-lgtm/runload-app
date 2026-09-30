import assert from "node:assert/strict";
import { collectAchievementMetrics, evaluateAchievements, syncAchievements } from "../ui/mobileAchievements.js";

const memory = new Map();
globalThis.localStorage = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { memory.set(key, String(value)); },
  removeItem(key) { memory.delete(key); },
};

const records = [
  { id: "r1", activityType: "run", date: "2026-09-28", distanceKm: 2, reflectionContext: { nextCheckPoint: "フォーム" } },
  { id: "r2", activityType: "run", date: "2026-09-29", distanceKm: 2 },
  { id: "r3", activityType: "run", date: "2026-09-30", distanceKm: 2 },
  { id: "rest1", activityType: "rest", date: "2026-09-30" },
];
const services = {
  storage: {
    records: { loadAll: () => records },
    plans: { loadAll: () => [{ id: "p1" }] },
    courses: { loadAll: () => [{ id: "c1" }] },
  },
};

const metrics = collectAchievementMetrics(services);
assert.equal(metrics.records, 4);
assert.equal(metrics.runs, 3);
assert.equal(metrics.rests, 1);
assert.equal(metrics.weeklyRuns, 3);
assert.equal(metrics.distance, 6);
assert.equal(metrics.plans, 1);

const evaluated = evaluateAchievements(services);
assert.equal(evaluated.find((item) => item.id === "first-record")?.unlocked, true);
assert.equal(evaluated.find((item) => item.id === "week-3")?.unlocked, true);
assert.equal(evaluated.find((item) => item.id === "distance-5")?.unlocked, true);
assert.equal(evaluated.find((item) => item.id === "distance-25")?.unlocked, false);
assert.equal(evaluated.find((item) => item.id === "rest-1")?.unlocked, true);
assert.equal(evaluated.find((item) => item.id === "plan-1")?.unlocked, true);

const synced = syncAchievements(services, { initializeAnnouncements: true });
assert.ok(synced.some((item) => item.unlockedAt));
const state = JSON.parse(memory.get("running-record-mobile-achievements-v1"));
assert.ok(state.unlocked["first-record"]);
assert.ok(state.announced["first-record"]);

console.log("PASS mobile achievements v26");

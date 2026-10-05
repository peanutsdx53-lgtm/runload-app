import assert from "node:assert/strict";
import fs from "node:fs";
import {
  collectMobileFatigueHistory,
  findPreviousSameCourse,
  renderMobileFatigueTrend,
  renderRunCapsule,
  renderSameCourseComparison,
} from "../ui/mobileInsights.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

const memory = new Map();
globalThis.localStorage = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { memory.set(key, String(value)); },
  removeItem(key) { memory.delete(key); },
};

const current = {
  id: "run-current",
  activityType: "run",
  date: "2026-09-30",
  createdAt: "2026-09-30T11:00:00.000Z",
  distanceKm: 5,
  durationMinutes: 30,
  runningFormat: "CONTINUOUS_RUN",
  course: { id: "course-a", name: "河川敷" },
};
const previous = {
  id: "run-prev",
  activityType: "run",
  date: "2026-09-20",
  createdAt: "2026-09-20T11:00:00.000Z",
  distanceKm: 5,
  durationMinutes: 32,
  runningFormat: "CONTINUOUS_RUN",
  course: { id: "course-a", name: "河川敷" },
};
const other = {
  id: "run-other",
  activityType: "run",
  date: "2026-09-25",
  createdAt: "2026-09-25T11:00:00.000Z",
  distanceKm: 4,
  durationMinutes: 28,
  runningFormat: "CONTINUOUS_RUN",
  course: { id: "course-b", name: "公園" },
};

memory.set("runner-load-app-mobile-walk-jog-records-v1.3", JSON.stringify([
  {
    id: "walk-1",
    activityId: "WALK",
    createdAt: "2026-09-29T02:00:00.000Z",
    endedAt: "2026-09-29T02:30:00.000Z",
    fatigue: { pre: 1, post: 2, scale: "ROF-J" },
  },
]));

const records = [previous, other, current];
const fatigueById = {
  "run-prev": { available: true, pre: 2, post: 3 },
  "run-other": { available: true, pre: 4, post: 5 },
  "run-current": { available: true, pre: 2, post: 4 },
};
const services = {
  storage: {
    records: { loadAll: () => records },
    plans: { loadAll: () => [{ id: "plan-1" }] },
    courses: { loadAll: () => [{ id: "course-a" }, { id: "course-b" }] },
  },
  fatigue: { summarizeRun: (id) => fatigueById[id] || null },
};

const trend = collectMobileFatigueHistory(services, { limit: 8 });
assert.equal(trend.length, 4);
assert.equal(trend.at(-1).id, "run-current");
assert.equal(trend.some((item) => item.activity === "ウォーキング"), true);
assert.match(renderMobileFatigueTrend(services), /FATIGUE TREND/);
assert.match(renderMobileFatigueTrend(services), /2 → 4/);

const comparison = findPreviousSameCourse(current, records.map((record) => ({ record })));
assert.equal(comparison?.previous?.id, "run-prev");
assert.equal(comparison?.durationDeltaMinutes, -2);
assert.match(renderSameCourseComparison(current, records.map((record) => ({ record }))), /同じコース/);
assert.match(renderSameCourseComparison(current, records.map((record) => ({ record }))), /−0:24/);

const capsule = renderRunCapsule(services, current, {
  measurement: { energyEstimate: { estimatedKcal: 312 }, track: [{ lat: 0, lon: 0 }, { lat: 1, lon: 1 }] },
  fatigue: { pre: 2, post: 4 },
});
assert.match(capsule, /RUN CAPSULE/);
assert.match(capsule, /5\.00/);
assert.match(capsule, /312 kcal/);
assert.match(capsule, /2 → 4/);

const css = read("../styles/mobile-insights.css");
assert.match(css, /\.run-capsule/);
assert.match(css, /\.mobile-course-compare/);
assert.match(css, /\.mobile-fatigue-trend/);
assert.doesNotMatch(css, /\.about-body/);

const versionSource = read("../ui/appVersionStatus.js");
const currentVersion = versionSource.match(/APP_VERSION = "([^"]+)"/)?.[1] || "";
assert.match(currentVersion, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
const escapedVersion = currentVersion.replaceAll(".", "\\.");

const resultSource = read("../screens/mobile/resultScreen.js");
assert.match(resultSource, /renderRunCapsule/);
assert.match(resultSource, /renderSameCourseComparison/);
const historySource = read("../screens/mobile/historyScreen.js");
assert.match(historySource, /renderMobileFatigueTrend/);
const index = read("../index.html");
const platformStyles = read("../ui/platformStyles.js");
assert.match(platformStyles, /styles\/mobile-insights\.css/);
const sw = read("../service-worker.js");
assert.match(sw, new RegExp(`running-record-app-runtime-${escapedVersion}`));
assert.match(sw, /mobile-insights\.css/);
assert.match(sw, /ui\/mobileInsights\.js/);

console.log("mobileInsights.test.mjs: PASS");

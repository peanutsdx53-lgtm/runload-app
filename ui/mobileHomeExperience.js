import { achievementSummary } from "./mobileAchievements.js";
import { collectMobileFatigueHistory } from "./mobileInsights.js";
import { listMobileExtensionRecords } from "./mobileWalkJogRecordStore.js";

function finite(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function localDateText(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value = "") {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  return Number.isFinite(date.getTime()) ? date : null;
}

function dateFromTimestamp(value = "") {
  const date = new Date(String(value || ""));
  return Number.isFinite(date.getTime()) ? date : null;
}

function mondayOfWeek(date = new Date()) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

function inRange(date, start, end) {
  return Boolean(date && date >= start && date < end);
}

function currentWeekRange(now = new Date()) {
  const start = mondayOfWeek(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return Object.freeze({ start, end, key: localDateText(start) });
}

function recordHasReflection(record = {}) {
  const reflection = record.reflectionContext || {};
  return [reflection.nextCheckPoint, reflection.whatWentWell, reflection.noticed, reflection.recoveryMemo]
    .some((value) => String(value || "").trim().length > 0);
}

function recordCourseKey(record = {}) {
  const course = record.course || {};
  const id = String(course.id || course.courseId || "").trim();
  if (id) return `id:${id}`;
  const name = String(course.name || "").trim();
  if (!name || name === "未設定" || name === "コース名なし") return "";
  return `name:${name.toLocaleLowerCase("ja-JP")}`;
}

function extensionDate(record = {}) {
  return dateFromTimestamp(record.endedAt || record.startedAt || record.createdAt);
}

function weekMetrics(services, now = new Date()) {
  const { start, end, key } = currentWeekRange(now);
  const records = services?.storage?.records?.loadAll?.() || [];
  const weeklyRecords = records.filter((record) => inRange(parseLocalDate(record.date), start, end));
  const weeklyRuns = weeklyRecords.filter((record) => record.activityType === "run");
  const weeklyRests = weeklyRecords.filter((record) => record.activityType === "rest");
  const weeklyReflections = weeklyRecords.filter(recordHasReflection);
  const extensionRecords = listMobileExtensionRecords().filter((record) => inRange(extensionDate(record), start, end));

  const courseCounts = new Map();
  weeklyRuns.forEach((record) => {
    const keyName = recordCourseKey(record);
    if (!keyName) return;
    courseCounts.set(keyName, (courseCounts.get(keyName) || 0) + 1);
  });
  const repeatedCourse = Math.max(0, ...courseCounts.values());

  const activities = new Set();
  if (weeklyRuns.length) activities.add("RUN");
  extensionRecords.forEach((record) => {
    const activityId = String(record.activityId || "").toUpperCase();
    if (["WALK", "JOGGING", "MIXED"].includes(activityId)) activities.add(activityId);
  });

  const plans = services?.storage?.plans?.loadAll?.() || [];
  const weeklyPlans = plans.filter((plan) => inRange(parseLocalDate(plan.scheduledDate), start, end));

  return Object.freeze({
    key,
    recordCount: weeklyRecords.length + extensionRecords.length,
    reflectionCount: weeklyReflections.length,
    restCount: weeklyRests.length,
    repeatedCourse,
    activityCount: activities.size,
    planCount: weeklyPlans.length,
  });
}

const CHALLENGE_DEFINITIONS = Object.freeze([
  Object.freeze({ id: "records-3", title: "3件の記録", short: "今週の記録を3件残す", target: 3, metric: "recordCount", href: "#/history", tone: "blue" }),
  Object.freeze({ id: "reflection-2", title: "振り返り2回", short: "振り返りを2件残す", target: 2, metric: "reflectionCount", href: "#/record-input", tone: "violet" }),
  Object.freeze({ id: "rest-1", title: "休養も記録", short: "休養記録を1件残す", target: 1, metric: "restCount", href: "#/record-input", tone: "green" }),
  Object.freeze({ id: "repeat-course-2", title: "同じコース2回", short: "同じコースを2回記録", target: 2, metric: "repeatedCourse", href: "#/course-library?returnTo=%23%2Fhome", tone: "cyan" }),
  Object.freeze({ id: "activities-2", title: "2種類の活動", short: "異なる活動を2種類記録", target: 2, metric: "activityCount", href: "#/run-measurement", tone: "orange" }),
  Object.freeze({ id: "plan-1", title: "予定を1件", short: "今週の予定を1件作る", target: 1, metric: "planCount", href: "#/plan", tone: "indigo" }),
]);

function stableWeekIndex(weekKey = "") {
  let hash = 0;
  for (const char of String(weekKey)) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
  return CHALLENGE_DEFINITIONS.length ? hash % CHALLENGE_DEFINITIONS.length : 0;
}

function challengeFrom(definition, value, weekKey, completedCount) {
  const normalized = Math.max(0, Number(value || 0));
  const progress = Math.min(1, definition.target > 0 ? normalized / definition.target : 1);
  return Object.freeze({
    ...definition,
    weekKey,
    value: normalized,
    progress,
    complete: progress >= 1,
    completedCount,
    totalCount: CHALLENGE_DEFINITIONS.length,
  });
}

export function buildPersonalChallenge(services, { now = new Date() } = {}) {
  const metrics = weekMetrics(services, now);
  const evaluated = CHALLENGE_DEFINITIONS.map((definition) => challengeFrom(
    definition,
    metrics[definition.metric],
    metrics.key,
    0,
  ));
  const completedCount = evaluated.filter((item) => item.complete).length;
  const start = stableWeekIndex(metrics.key);
  const ordered = evaluated.slice(start).concat(evaluated.slice(0, start));
  const selected = ordered.find((item) => !item.complete) || ordered[0] || null;
  if (!selected) return null;
  return Object.freeze({ ...selected, completedCount });
}

function nextPlan(services, now = new Date()) {
  const today = localDateText(now);
  return (services?.storage?.plans?.loadAll?.() || [])
    .filter((plan) => String(plan.scheduledDate || "") >= today)
    .sort((left, right) => String(left.scheduledDate || "").localeCompare(String(right.scheduledDate || "")))[0] || null;
}

function daysUntil(dateText, now = new Date()) {
  const date = parseLocalDate(dateText);
  if (!date) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  return Math.round((date - today) / 86400000);
}

function shortDate(dateText = "") {
  const match = String(dateText).match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!match) return dateText || "—";
  return `${Number(match[1])}月${Number(match[2])}日`;
}

function planDescriptor(plan, now) {
  if (!plan) return null;
  const planned = plan.plannedSession || {};
  const rest = plan.planType === "rest" || planned.activityType === "rest";
  const distance = Number(planned.distanceKm);
  const detail = rest ? "休養" : distance > 0 ? `${distance.toFixed(1).replace(/\.0$/, "")} km` : "走行予定";
  const days = daysUntil(plan.scheduledDate, now);
  return Object.freeze({
    kind: "plan",
    score: days !== null && days <= 2 ? 96 : 68,
    label: "次の予定",
    title: shortDate(plan.scheduledDate),
    note: detail,
    href: `#/plan?planId=${encodeURIComponent(plan.id)}`,
    tone: "plan",
  });
}

function challengeDescriptor(challenge) {
  if (!challenge) return null;
  return Object.freeze({
    kind: "challenge",
    score: challenge.progress > 0 ? 88 : 74,
    label: "今週のチャレンジ",
    title: challenge.title,
    note: challenge.complete ? "達成" : `${Math.min(challenge.value, challenge.target)} / ${challenge.target}`,
    href: challenge.href,
    tone: challenge.tone,
    progress: challenge.progress,
  });
}

function fatigueDescriptor(services) {
  const history = collectMobileFatigueHistory(services, { limit: 3 });
  if (history.length < 2) return null;
  const latest = history.at(-1);
  const pair = `${finite(latest.pre) ? latest.pre : "—"} → ${finite(latest.post) ? latest.post : "—"}`;
  return Object.freeze({
    kind: "fatigue",
    score: 79,
    label: "疲労感",
    title: pair,
    note: `${shortDate(latest.date)}・${latest.activity}`,
    href: "#/history",
    tone: "fatigue",
  });
}

function achievementDescriptor(services) {
  const summary = achievementSummary(services);
  return Object.freeze({
    kind: "achievement",
    score: summary.latest ? 62 : 48,
    label: "実績",
    title: `${summary.unlockedCount} / ${summary.totalCount}`,
    note: summary.latest ? summary.latest.title : "記録に応じて反映",
    href: "#/achievements",
    tone: "achievement",
  });
}

function latestDescriptor(latestExperience) {
  const record = latestExperience?.record || null;
  if (!record) return null;
  return Object.freeze({
    kind: "latest",
    score: 56,
    label: "最新の記録",
    title: shortDate(record.date),
    note: record.activityType === "rest"
      ? "休養"
      : Number(record.distanceKm) > 0
        ? `${Number(record.distanceKm).toFixed(1).replace(/\.0$/, "")} km`
        : "走行",
    href: `#/result?recordId=${encodeURIComponent(record.id)}`,
    tone: "latest",
  });
}

export function buildDynamicHomeCards(services, latestExperience, { now = new Date() } = {}) {
  const challenge = buildPersonalChallenge(services, { now });
  const candidates = [
    planDescriptor(nextPlan(services, now), now),
    challengeDescriptor(challenge),
    fatigueDescriptor(services),
    achievementDescriptor(services),
    latestDescriptor(latestExperience),
  ].filter(Boolean);
  candidates.sort((left, right) => right.score - left.score || left.kind.localeCompare(right.kind));
  const selected = [];
  for (const candidate of candidates) {
    if (selected.some((item) => item.kind === candidate.kind)) continue;
    selected.push(candidate);
    if (selected.length === 2) break;
  }
  return Object.freeze(selected);
}

export function resolveAmbientProfile({ latestExperience = null, draft = null, challenge = null, now = new Date() } = {}) {
  const hour = now.getHours();
  const period = hour >= 5 && hour < 9
    ? "morning"
    : hour >= 9 && hour < 17
      ? "day"
      : hour >= 17 && hour < 21
        ? "evening"
        : "night";
  const record = latestExperience?.record || null;
  const today = localDateText(now);
  const signal = draft
    ? "draft"
    : record && String(record.date || "") === today
      ? record.activityType === "rest" ? "rest" : "saved"
      : record
        ? "ready"
        : "first";
  return Object.freeze({
    period,
    signal,
    challengeProgress: Math.round(Math.max(0, Math.min(1, Number(challenge?.progress || 0))) * 100),
  });
}

export function personalChallengeDefinitions() {
  return CHALLENGE_DEFINITIONS;
}

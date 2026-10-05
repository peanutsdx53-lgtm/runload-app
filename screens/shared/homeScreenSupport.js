import { buildSelfUnderstandingView } from "../../core/selfUnderstandingCore.js";

export function localTodayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shortDate(dateText = "") {
  const match = String(dateText).match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!match) return dateText || "—";
  return `${Number(match[1])}月${Number(match[2])}日`;
}

export function paceLabel(record = {}) {
  const distance = Number(record.distanceKm || 0);
  const minutes = Number(record.durationMinutes || 0);
  if (!(distance > 0) || !(minutes > 0)) return "—";
  const seconds = Math.round((minutes * 60) / distance);
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function activityPill(record = {}) {
  return record.activityType === "rest" ? "REST" : "RUN";
}

export function homeConfirmationTheme(services) {
  const experiences = services?.workflows?.records?.loadAllExperiences?.() || [];
  const rof = new Map(experiences.filter((experience) => experience?.record?.activityType === "run").map((experience) => [experience.record.id, services?.fatigue?.summarizeRun?.(experience.record.id) || null]));
  const view = buildSelfUnderstandingView({ allExperiences: experiences, threads: services?.storage?.selfUnderstandingThreads?.loadAll?.() || [], rofSummariesByRecordId: rof });
  return view.watching.find((thread) => thread.hasNewEligibleData) || null;
}


export function homeState(experience, draft) {
  if (draft) return "draft";
  const record = experience?.record || null;
  if (!record) return "first";
  if (String(record.date || "") === localTodayIso()) {
    return record.activityType === "rest" ? "saved-rest" : "saved-run";
  }
  return "history";
}

export function nextPlan(services) {
  const today = localTodayIso();
  return services.storage.plans.loadAll().filter((plan) => String(plan.scheduledDate || "") >= today).sort((a, b) => String(a.scheduledDate).localeCompare(String(b.scheduledDate)))[0] || null;
}


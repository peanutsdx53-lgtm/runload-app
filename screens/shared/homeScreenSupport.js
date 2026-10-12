import { buildSelfUnderstandingView } from "../../core/selfUnderstandingCore.js";
import { localTodayIso, formatShortLocalDate as shortDate } from "../../shared/textUtilities.js";
export { shortDate };



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
  const savedExperiences = services?.workflows?.records?.loadAllExperiences?.();
  const experiences = Array.isArray(savedExperiences) ? savedExperiences : [];
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
  const plans = services.storage.plans.loadAll();
  return (Array.isArray(plans) ? plans : []).filter((plan) => plan && typeof plan === "object" && String(plan.scheduledDate || "") >= today).sort((a, b) => String(a.scheduledDate).localeCompare(String(b.scheduledDate)))[0] || null;
}


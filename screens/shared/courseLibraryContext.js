import { primarySurfaceSummary, slopeSummary } from "../../ui/coursePresentation.js";
import { peekCourseSelection } from "../../ui/flowSessionState.js";

function safeReturnTo(context) {
  const value = String(context?.parameters?.get("returnTo") || "#/record-input");
  return ["#/record-input", "#/plan", "#/simulation"].some((prefix) => value.startsWith(prefix))
    ? value
    : "#/record-input";
}

function selectedPreset(returnTo = "") {
  if (returnTo.startsWith("#/plan")) return peekCourseSelection("plan")?.preset || null;
  if (returnTo.startsWith("#/simulation")) return peekCourseSelection("simulation")?.preset || null;
  return null;
}

export function courseLibraryCallerLabel(returnTo = "") {
  if (returnTo.startsWith("#/plan")) return "予定";
  if (returnTo.startsWith("#/simulation")) return "条件比較";
  return "今日の記録";
}

export function courseLibraryMeta(preset = {}) {
  return `${slopeSummary(preset.course || {})}・${primarySurfaceSummary(preset.course || {})}`;
}

export function buildCourseLibraryContext({ services, context }) {
  const courses = services.storage.courses.loadAll();
  const returnTo = safeReturnTo(context);
  const selected = selectedPreset(returnTo);
  return {
    courses,
    ordered: [...courses].reverse(),
    returnTo,
    selected,
    selectedId: selected?.id || "",
  };
}

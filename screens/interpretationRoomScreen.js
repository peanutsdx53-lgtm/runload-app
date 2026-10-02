import { buildInterpretation } from "../core/interpretationCore.js";
import { buildSelfUnderstandingView } from "../core/selfUnderstandingCore.js";
import { renderInterpretationRoom } from "../ui/interpretationRoomPresentation.js";
import { matchesMobileLayout } from "../ui/deviceLayout.js";

const ALLOWED_ORIGINS = new Set(["result", "history", "body-part-detail", "simulation", "home"]);

function safeOrigin(parameters) {
  const value = String(parameters?.get?.("origin") || "");
  return ALLOWED_ORIGINS.has(value) ? value : "result";
}

function rofContext(services, recordId) {
  if (!recordId || !services?.fatigue?.summarizeRun) {
    return { summary: null, recentReferences: Object.freeze({ pre: null, post: null, delta: null }) };
  }
  const recentReference = services.fatigue.recentReference;
  return {
    summary: services.fatigue.summarizeRun(recordId),
    recentReferences: Object.freeze({
      pre: typeof recentReference === "function" ? recentReference(recordId, "PRE") : null,
      post: typeof recentReference === "function" ? recentReference(recordId, "POST") : null,
      delta: typeof recentReference === "function" ? recentReference(recordId, "DELTA") : null,
    }),
  };
}

export function renderInterpretationRoomScreen({ services, context }) {
  const parameters = context?.parameters || new URLSearchParams();
  const requestedRecordId = String(parameters.get("recordId") || "");
  const origin = safeOrigin(parameters);
  const regionId = String(parameters.get("regionId") || "").slice(0, 80);

  const targetExperience = requestedRecordId
    ? services.workflows.records.loadExperience(requestedRecordId)
    : services.workflows.records.loadLatestExperience();
  const recordId = targetExperience?.record?.id || requestedRecordId;
  const rof = rofContext(services, recordId);
  const allExperiences = services.workflows.records.loadAllExperiences();
  const output = buildInterpretation({
    targetExperience,
    allExperiences,
    rofSummary: rof.summary,
    rofRecentReferences: rof.recentReferences,
    origin,
    selectedRegionId: regionId,
    supportDecision: targetExperience?.supportDecision || null,
  });
  const rofSummariesByRecordId = new Map(
    allExperiences
      .filter((experience) => experience?.record?.activityType === "run")
      .map((experience) => [experience.record.id, services?.fatigue?.summarizeRun?.(experience.record.id) || null]),
  );
  const selfUnderstanding = buildSelfUnderstandingView({
    targetExperience,
    allExperiences,
    threads: services?.storage?.selfUnderstandingThreads?.loadAll?.() || [],
    rofSummariesByRecordId,
    supportDecision: targetExperience?.supportDecision || null,
  });

  return `<section class="screen screen--interpretation-room" data-interpretation-room data-origin="${origin}">${renderInterpretationRoom({ output, selfUnderstanding, mobileLayout: matchesMobileLayout() })}</section>`;
}

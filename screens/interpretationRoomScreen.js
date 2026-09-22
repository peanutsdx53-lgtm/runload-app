import { buildRunLoadInterpretation } from "../core/interpretationCore.js";
import { renderInterpretationRoom } from "../ui/interpretationRoomPresentation.js";

const ALLOWED_ORIGINS = new Set(["result", "history", "body-part-detail", "simulation", "home"]);

function safeOrigin(parameters) {
  const value = String(parameters?.get?.("origin") || "");
  return ALLOWED_ORIGINS.has(value) ? value : "result";
}

function rofContext(services, recordId) {
  if (!recordId || !services?.secondPillar?.summarizeRun) {
    return { summary: null, recentReferences: Object.freeze({ pre: null, post: null, delta: null }) };
  }
  const recentReference = services.secondPillar.recentReference;
  return {
    summary: services.secondPillar.summarizeRun(recordId),
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
  const output = buildRunLoadInterpretation({
    targetExperience,
    allExperiences: services.workflows.records.loadAllExperiences(),
    rofSummary: rof.summary,
    rofRecentReferences: rof.recentReferences,
    origin,
    selectedRegionId: regionId,
    supportDecision: targetExperience?.supportDecision || null,
  });

  return `<section class="screen screen--interpretation-room" data-interpretation-room data-origin="${origin}">${renderInterpretationRoom({ output })}</section>`;
}

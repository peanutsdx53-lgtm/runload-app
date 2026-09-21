import { buildRunLoadInterpretation } from "../core/interpretationCore.js";
import { renderInterpretationRoom } from "../ui/interpretationRoomPresentation.js";

const ALLOWED_VIEWS = new Set(["summary", "detail", "evidence", "next", "explain", "dialogue"]);
const ALLOWED_MODES = new Set(["simple", "visual", "difference"]);
const ALLOWED_TOPICS = new Set(["understand", "manage", "next-use"]);
const ALLOWED_INTENTS = new Set(["", "current", "history", "condition", "support"]);
const ALLOWED_ORIGINS = new Set(["result", "history", "body-part-detail", "simulation", "home"]);

function safeParameter(parameters, name, allowed, fallback = "") {
  const value = String(parameters?.get?.(name) || "");
  return allowed.has(value) ? value : fallback;
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
  const origin = safeParameter(parameters, "origin", ALLOWED_ORIGINS, "result");
  const view = safeParameter(parameters, "view", ALLOWED_VIEWS, "summary");
  const intent = safeParameter(parameters, "intent", ALLOWED_INTENTS, "");
  const mode = safeParameter(parameters, "mode", ALLOWED_MODES, "simple");
  const topic = safeParameter(parameters, "topic", ALLOWED_TOPICS, "understand");
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

  return `<section class="screen screen--interpretation-room" data-interpretation-room data-view="${view}" data-topic="${topic}" data-origin="${origin}">${renderInterpretationRoom({ output, view, mode, topic, intent, origin })}</section>`;
}

import { buildInterpretation } from "../core/interpretationCore.js";
import { buildSelfUnderstandingView } from "../core/selfUnderstandingCore.js";
import { renderInterpretationRoom } from "../ui/interpretationRoomPresentation.js";
import { escapeHtml } from "../ui/commonComponents.js";
import {
  canPresentAutomaticInterpretationReference,
  resolveAutoInterpretationReferenceKnowledge,
} from "../ui/interpretationReferenceKnowledge.js";
import {
  loadInterpretationReferenceHistory,
} from "../ui/interpretationReferenceHistory.js";

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

export function renderInterpretationRoomScreenWithPresentation({ services, context }, { compactLayout = false, selectDefaultRegion = false } = {}) {
  const parameters = context?.parameters || new URLSearchParams();
  const requestedRecordId = String(parameters.get("recordId") || "");
  const origin = safeOrigin(parameters);
  const regionId = String(parameters.get("regionId") || "").slice(0, 80);
  const interpretationFocus = String(parameters.get("focus") || "").slice(0, 80);

  const targetExperience = requestedRecordId
    ? services.workflows.records.loadExperience(requestedRecordId)
    : services.workflows.records.loadLatestExperience();
  const recordId = targetExperience?.record?.id || requestedRecordId;
  const rof = rofContext(services, recordId);
  const allExperiences = services.workflows.records.loadAllExperiences();
  let output = buildInterpretation({
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

  if (selectDefaultRegion && !regionId && output?.state?.regional === "AVAILABLE") {
    const candidateRegionId = String(selfUnderstanding?.primaryCandidate?.subject?.regionId || "");
    const activeRegionId = ["REGION_WATCH", "REGION_OBSERVATION_PAIR"].includes(String(selfUnderstanding?.activeThread?.type || ""))
      ? String(selfUnderstanding.activeThread?.subject?.regionId || "")
      : "";
    const groups = Array.isArray(output?.overview?.attention?.groups) ? output.overview.attention.groups : [];
    const changedRegionId = String(groups.find((group) => group?.code === "PREVIOUS_CHANGE")?.regions?.[0]?.regionId || "");
    const repeatedRegionId = String(groups.find((group) => group?.code === "REPEATED_DIRECTION")?.regions?.[0]?.regionId || "");
    const firstRegionId = String(groups.find((group) => Array.isArray(group?.regions) && group.regions.length)?.regions?.[0]?.regionId || "");
    const selectedRegionId = candidateRegionId || activeRegionId || changedRegionId || repeatedRegionId || firstRegionId;
    if (selectedRegionId) {
      output = buildInterpretation({
        targetExperience,
        allExperiences,
        rofSummary: rof.summary,
        rofRecentReferences: rof.recentReferences,
        origin,
        selectedRegionId,
        supportDecision: targetExperience?.supportDecision || null,
      });
    }
  }

  const savedInterpretation = services?.storage?.selfInterpretations?.findByRecordId?.(recordId) || null;
  const storedReferenceHistory = loadInterpretationReferenceHistory(services?.storage?.gateway);
  const autoReference = canPresentAutomaticInterpretationReference(output)
    ? resolveAutoInterpretationReferenceKnowledge(output, selfUnderstanding, { recommendationHistory: storedReferenceHistory })
    : null;
  // At the initial "focus" stage the Reading card is hidden by CSS. Merely
  // rendering this screen must not count as presenting the article. Persist the
  // selected ID only when the user moves to the visible "compare" stage.
  return `<section class="screen screen--interpretation-room" data-interpretation-room data-origin="${origin}" data-interpretation-auto-reading-id="${escapeHtml(autoReference?.id || "")}">${renderInterpretationRoom({ output, selfUnderstanding, savedInterpretation, interpretationFocus, compactLayout, recommendationHistory: storedReferenceHistory })}</section>`;
}

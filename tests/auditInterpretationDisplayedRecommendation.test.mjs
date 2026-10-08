import assert from "node:assert/strict";
import { renderInterpretationRoomScreenWithPresentation } from "../screens/interpretationRoomScreen.js";
import { buildInterpretation } from "../core/interpretationCore.js";
import { loadInterpretationReferenceHistory } from "../ui/interpretationReferenceHistory.js";
import {
  buildInterpretationReferenceCandidates,
  canPresentAutomaticInterpretationReference,
  selectInterpretationReferenceKnowledge,
} from "../ui/interpretationReferenceKnowledge.js";

function fixture(route = "normal", activityType = "run") {
  const saved = new Map();
  let writes = 0;
  const gateway = {
    readJson: (key, fallback) => saved.get(key) ?? fallback,
    writeJson: (key, value) => { writes += 1; saved.set(key, value); return { ok: true }; },
  };
  const record = {
    id: `audit-${route}-${activityType}`,
    date: "2026-10-08", createdAt: "2026-10-08T07:00:00+09:00", activityType,
    distanceKm: 5, durationMinutes: 32,
    reflectionContext: { postRunReflection: "次回も走行条件を確認する" },
    environmentContext: { temperatureC: 20 },
  };
  const experience = {
    record, supportDecision: { route, reasons: [], blocks: [], nextActions: [] },
    regionalSemanticState: activityType === "rest" ? "REST" : "NONE",
  };
  const services = {
    workflows: { records: {
      loadExperience: () => experience,
      loadLatestExperience: () => experience,
      loadAllExperiences: () => [experience],
    } },
    storage: { gateway, selfUnderstandingThreads: { loadAll: () => [] },
      selfInterpretations: { findByRecordId: () => null } },
    fatigue: { summarizeRun: () => null, recentReference: () => null },
  };
  const output = buildInterpretation({ targetExperience: experience,
    allExperiences: [experience], supportDecision: experience.supportDecision });
  const html = renderInterpretationRoomScreenWithPresentation({ services,
    context: { parameters: new URLSearchParams(`recordId=${record.id}`) } });
  return { output, html, history: loadInterpretationReferenceHistory(gateway), writes };
}

const scenarios = [
  ["normal", "run", true, "interpretation-context-context-first"],
  ["review", "run", false, "support"],
  ["consult", "run", false, "support"],
  ["urgent", "run", false, "support"],
  ["normal", "rest", false, "rest"],
];
for (const [route, activityType, shouldRecord, screen] of scenarios) {
  const { output, html, history, writes } = fixture(route, activityType);
  assert.match(html, new RegExp(`data-interpretation-room-state="${screen}"`));
  assert.equal(canPresentAutomaticInterpretationReference(output), shouldRecord);
  assert.equal(buildInterpretationReferenceCandidates(output).length > 0, shouldRecord);
  assert.equal(Boolean(selectInterpretationReferenceKnowledge(output)), shouldRecord);
  assert.equal(history.length, 0, 'opening the hidden focus stage does not present Reading');
  assert.equal(writes, 0, 'screen rendering must not mutate presentation history');
  if (shouldRecord) {
    assert.match(html, /data-interpretation-auto-reading-id="goals-and-recording-differ"/);
    assert.match(html, /articleId=goals-and-recording-differ/);
  }
  else assert.doesNotMatch(html, /articleId=goals-and-recording-differ/);
}

// Defense against inconsistent output paths: never show a recommendation when
// either representation carries a support-priority state.
const synthetic = {
  target: { recordId: "synthetic", activityType: "run" },
  state: { targetAvailable: true, regional: "UNAVAILABLE", support: "REVIEW" },
  safety: { route: "normal" },
  runFacts: { postRunReflection: "振り返りがある" },
};
assert.equal(canPresentAutomaticInterpretationReference(synthetic), false);
assert.deepEqual(buildInterpretationReferenceCandidates(synthetic), []);
const missing = { ...synthetic, state: { ...synthetic.state, targetAvailable: false, support: "NORMAL" } };
assert.equal(canPresentAutomaticInterpretationReference(missing), false);
assert.deepEqual(buildInterpretationReferenceCandidates(missing), []);

console.log("auditInterpretationDisplayedRecommendation.test.mjs: PASS (7 scenarios)");

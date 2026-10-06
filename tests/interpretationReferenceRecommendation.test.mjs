import assert from "node:assert/strict";
import fs from "node:fs";
import { createApplicationServices, createMemoryStorage, STORAGE_KEYS } from "../core/appCore.js";
import {
  buildInterpretationReferenceCandidates,
  resolveAutoInterpretationReferenceKnowledge,
  selectInterpretationReferenceKnowledge,
} from "../ui/interpretationReferenceKnowledge.js";
import {
  loadInterpretationReferenceHistory,
  rememberInterpretationReferenceSelection,
} from "../ui/interpretationReferenceHistory.js";

function output(recordId, {
  fatigue = true,
  reflection = true,
  temperature = 20,
  conditions = [
    { id: "distanceKm", previous: 5, current: 6 },
    { id: "paceSecondsPerKm", previous: 360, current: 330 },
    { id: "grade", previous: 0, current: 3 },
    { id: "surface", previous: "ROAD", current: "TRAIL" },
  ],
  regional = "AVAILABLE",
  support = "NORMAL",
  reflectionText = "後半の感じ方を次も見たい",
} = {}) {
  return {
    target: { recordId, date: "2026-10-06", origin: "result" },
    state: { targetAvailable: true, regional, history: "AVAILABLE", subjective: fatigue ? "PAIR" : "UNAVAILABLE", support },
    safety: { route: String(support).toLowerCase() },
    runFacts: {
      postRunReflection: reflection ? reflectionText : "",
      environment: { temperatureC: temperature, environmentNote: temperature == null ? "" : "記録あり" },
    },
    subjectiveContext: fatigue
      ? { state: "PAIR", pre: { available: true, value: 3 }, post: { available: true, value: 6 }, difference: { eligible: true, value: 3 } }
      : { state: "UNAVAILABLE", pre: { available: false }, post: { available: false }, difference: { eligible: false } },
    conditions: { differences: conditions },
  };
}

function remember(history, recordId, articleId) {
  return [{ recordId, articleId }, ...history.filter((entry) => entry.recordId !== recordId)].slice(0, 24);
}

{
  let history = [];
  const selected = [];
  for (let index = 1; index <= 6; index += 1) {
    const current = output(`r${index}`);
    const reference = selectInterpretationReferenceKnowledge(current, { recommendationHistory: history });
    assert.ok(reference?.id, `r${index}`);
    selected.push(reference.id);
    history = remember(history, current.target.recordId, reference.id);
  }
  assert.equal(selected[0], "rof-j-how-to-read");
  assert.ok(new Set(selected).size >= 4, selected.join(","));
  assert.ok(selected.includes("context-not-single-cause"));
  assert.ok(selected.includes("grade-and-coverage") || selected.includes("surface-missingness"));

  const revisit = selectInterpretationReferenceKnowledge(output("r2"), { recommendationHistory: history });
  assert.equal(revisit?.id, selected[1], "same record must keep the same automatic article");
}

{
  let history = [];
  const selected = [];
  for (let index = 1; index <= 4; index += 1) {
    const current = output(`body-${index}`);
    const reference = selectInterpretationReferenceKnowledge(current, { bodyPair: true, recommendationHistory: history });
    assert.ok(reference?.id);
    selected.push(reference.id);
    history = remember(history, current.target.recordId, reference.id);
  }
  assert.equal(selected[0], "regional-six-eight-28");
  assert.ok(new Set(selected).size >= 3, selected.join(","));
  assert.ok(selected.every((id) => ["regional-six-eight-28", "context-not-single-cause", "model-limits", "regional-three-views"].includes(id)));
}

{
  const onlyPace = output("pace-only", {
    fatigue: false,
    reflection: false,
    temperature: null,
    regional: "UNAVAILABLE",
    conditions: [{ id: "paceSecondsPerKm", previous: 360, current: 330 }],
  });
  const history = [
    { recordId: "p3", articleId: "talk-test-as-subjective-cue" },
    { recordId: "p2", articleId: "talk-test-as-subjective-cue" },
    { recordId: "p1", articleId: "talk-test-as-subjective-cue" },
  ];
  assert.equal(selectInterpretationReferenceKnowledge(onlyPace, { recommendationHistory: history })?.id, "talk-test-as-subjective-cue");
}

{
  const environmentOnly = output("environment-only", {
    fatigue: false,
    reflection: false,
    temperature: 12,
    regional: "UNAVAILABLE",
    conditions: [],
  });
  const reference = selectInterpretationReferenceKnowledge(environmentOnly);
  assert.equal(reference?.id, "context-not-single-cause");
  assert.notEqual(reference?.id, "heat-not-temperature-only");
}

{
  const freeTextOnly = output("memo-only", {
    fatigue: false,
    reflection: true,
    temperature: null,
    regional: "UNAVAILABLE",
    conditions: [],
    reflectionText: "暑い、膝が痛い、坂が気になった",
  });
  const candidates = buildInterpretationReferenceCandidates(freeTextOnly);
  assert.deepEqual(candidates.map((candidate) => candidate.id), ["goals-and-recording-differ"]);
  assert.equal(selectInterpretationReferenceKnowledge(freeTextOnly)?.id, "goals-and-recording-differ");
}

{
  const urgent = output("urgent", { support: "URGENT" });
  assert.equal(selectInterpretationReferenceKnowledge(urgent), null);
  const consult = output("consult", { support: "CONSULT" });
  assert.equal(selectInterpretationReferenceKnowledge(consult), null);
}

{
  const memory = createMemoryStorage();
  const services = createApplicationServices({ storage: memory });
  assert.ok(STORAGE_KEYS.readingReferenceHistory);
  assert.deepEqual(loadInterpretationReferenceHistory(services.storage.gateway), []);
  rememberInterpretationReferenceSelection(services.storage.gateway, { recordId: "r1", articleId: "rof-j-how-to-read" });
  rememberInterpretationReferenceSelection(services.storage.gateway, { recordId: "r2", articleId: "context-not-single-cause" });
  const history = rememberInterpretationReferenceSelection(services.storage.gateway, { recordId: "r1", articleId: "grade-and-coverage" });
  assert.deepEqual(history, [
    { recordId: "r1", articleId: "grade-and-coverage" },
    { recordId: "r2", articleId: "context-not-single-cause" },
  ]);
}

{
  const current = output("thread-r1");
  const selfUnderstanding = { activeThread: { type: "CONTEXT_QUESTION", subject: { articleId: "rof-j-how-to-read" } }, primaryCandidate: null };
  assert.equal(resolveAutoInterpretationReferenceKnowledge(current, selfUnderstanding), null);
}

{
  const screen = fs.readFileSync("screens/interpretationRoomScreen.js", "utf8");
  const presentation = fs.readFileSync("ui/interpretationRoomPresentation.js", "utf8");
  assert.ok(screen.includes("loadInterpretationReferenceHistory"));
  assert.ok(screen.includes("rememberInterpretationReferenceSelection"));
  assert.ok(screen.includes("resolveAutoInterpretationReferenceKnowledge"));
  assert.ok(presentation.includes("recommendationHistory"));
}

console.log("interpretationReferenceRecommendation.test.mjs: PASS");

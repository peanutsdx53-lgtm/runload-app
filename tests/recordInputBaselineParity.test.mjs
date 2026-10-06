import assert from "node:assert/strict";
import fs from "node:fs";
import { internalModules } from "../core/internal/modules.js";
import "../core/internal/inputSupport.js";
import { renderRecordInputScreen as renderDesktopRecordInput } from "../screens/desktop/recordInputScreen.js";
import { renderRecordInputScreen as renderMobileRecordInput } from "../screens/mobile/recordInputScreen.js";
import { BODY_OBSERVATION_INTENSITY_OPTIONS, bodyObservationIntensityDisplay } from "../ui/subjectivePresentation.js";

const previousRecord = {
  id: "record-existing-reflection",
  date: "2026-10-04",
  activityType: "run",
  distanceKm: 5,
  durationMinutes: 30,
  steps: 6200,
  runningFormat: "CONTINUOUS_RUN",
  stepsProvenance: "DEVICE_MEASURED",
  course: { gradeKnowledge: "UNKNOWN", modelSurfaceClass: "UNKNOWN" },
  reflectionContext: {
    postRunReflection: "後半で呼吸が乱れた",
    perceivedDifference: "いつもより脚が重かった",
    nextCheckPoint: "次回は序盤のペースを確認",
  },
};

function servicesFor(record) {
  const experience = { record, feedback: { checkStatus: "deferred", fatigueByBodyPart: {}, discomfortByBodyPart: {}, safetyFlags: {} } };
  return {
    workflows: { records: { loadExperience: (id) => id === record.id ? experience : null } },
    storage: {
      plans: { findById: () => null },
      draft: { load: () => null },
      courses: { loadAll: () => [] },
      settings: { load: () => ({}) },
      selfUnderstandingThreads: { loadAll: () => [] },
    },
    fatigue: {
      listPendingRuns: () => [],
      summarizeRun: () => null,
      repository: { loadByRunId: () => null },
    },
  };
}

const context = { parameters: new URLSearchParams({ recordId: previousRecord.id }) };
const desktopPlacementHtml = renderDesktopRecordInput({ services: servicesFor(previousRecord), context });
const desktopStage1Index = desktopPlacementHtml.indexOf('data-record-stage="1"');
const desktopStage4Index = desktopPlacementHtml.indexOf('data-record-stage="4"');
const desktopFatigueIndex = desktopPlacementHtml.indexOf('data-fatigue-lifecycle');
assert.ok(desktopStage1Index >= 0 && desktopStage4Index > desktopStage1Index && desktopFatigueIndex > desktopStage4Index, "desktop fatigue input must live in stage 4 rather than stage 1");

for (const [platform, render] of [["desktop", renderDesktopRecordInput], ["mobile", renderMobileRecordInput]]) {
  const html = render({ services: servicesFor(previousRecord), context });
  assert.match(html, /name="perceivedDifference" value="いつもより脚が重かった"/, `${platform}: previous perceivedDifference must be retained in the edit form`);
  assert.match(html, /name="nextCheckPoint" value="次回は序盤のペースを確認"/, `${platform}: previous nextCheckPoint must be retained in the edit form`);
  assert.match(html, /以前の振り返り記録を確認/, `${platform}: existing previous reflection must remain inspectable`);
  assert.match(html, /以前の内容はそのまま保存します。自動で新しい意味に読み替えません。/, `${platform}: previous values must not be reinterpreted`);
}

const normalized = internalModules.inputValidation.normalizeRunningRecord(previousRecord, { nowIso: "2026-10-05T00:00:00.000Z", existingIds: [] });
assert.equal(normalized.reflectionContext.postRunReflection, previousRecord.reflectionContext.postRunReflection);
assert.equal(normalized.reflectionContext.perceivedDifference, previousRecord.reflectionContext.perceivedDifference);
assert.equal(normalized.reflectionContext.nextCheckPoint, previousRecord.reflectionContext.nextCheckPoint);


const recordInteractionSource = fs.readFileSync(new URL("../ui/interactions/recordInputInteractions.js", import.meta.url), "utf8");
const mobileRecordCss = fs.readFileSync(new URL("../styles/mobile-screen-layouts.css", import.meta.url), "utf8");
const interpretationSource = fs.readFileSync(new URL("../ui/interpretationRoomPresentation.js", import.meta.url), "utf8");

assert.match(recordInteractionSource, /function bindEmbeddedRecordSubflows\(form, services, platformEnhancement = \{\}\)/, "embedded subflow binder must receive platform enhancement");
assert.match(recordInteractionSource, /bindEmbeddedRecordSubflows\(form, services, platformEnhancement\)/, "record binder must pass platform enhancement to embedded subflows");
assert.doesNotMatch(recordInteractionSource, /\[1,2,3,4,5\]\.map\(\(value\)/, "body intensity options must not be bare numbers");
assert.deepEqual(BODY_OBSERVATION_INTENSITY_OPTIONS.map((item) => item.label), ["ごく軽い", "軽い", "中程度", "強い", "とても強い"]);
assert.equal(bodyObservationIntensityDisplay(2), "軽い（2 / 5）");
assert.match(recordInteractionSource, /程度（自分が感じた強さ）/);
assert.match(recordInteractionSource, /1 ごく軽い → 5 とても強い/);
assert.match(interpretationSource, /bodyObservationIntensityDisplay\(meta\.intensity\)/, "interpretation view must explain the same body intensity scale");
assert.match(mobileRecordCss, /\.screen-layout--record \.sub-flow-save\{[\s\S]*?background:var\(--surface\);[\s\S]*?color:var\(--accent2\)/, "mobile subflow return action must be visually secondary to final save");

console.log("recordInputBaselineParity.test.mjs: PASS");

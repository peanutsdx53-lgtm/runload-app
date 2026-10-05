import assert from "node:assert/strict";
import { internalModules } from "../core/internal/modules.js";
import "../core/internal/inputSupport.js";
import { renderRecordInputScreen as renderDesktopRecordInput } from "../screens/desktop/recordInputScreen.js";
import { renderRecordInputScreen as renderMobileRecordInput } from "../screens/mobile/recordInputScreen.js";

const previousRecord = {
  id: "record-legacy-reflection",
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

console.log("recordInputBaselineParity.test.mjs: PASS");

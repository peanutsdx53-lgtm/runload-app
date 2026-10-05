import assert from "node:assert/strict";
import fs from "node:fs";
import { renderResultScreen as renderDesktopResult } from "../screens/desktop/resultScreen.js";
import { renderResultScreen as renderMobileResult } from "../screens/mobile/resultScreen.js";
import { PRIMARY_REGIONAL_V2_MODEL_VERSION } from "../core/appCore.js";

const REGION_IDS = Object.freeze([
  "BA-DISP-014", "BA-DISP-015", "BA-DISP-016", "BA-DISP-018",
  "BA-DISP-019", "BA-DISP-021", "BA-DISP-023", "BA-DISP-024",
  "BA-DISP-025", "BA-DISP-027", "BA-DISP-028", "BA-DISP-029",
]);
const REGION_NAMES = Object.freeze([
  "股関節部", "殿部", "大腿前面", "大腿後面", "膝蓋大腿関節部", "脛骨部",
  "下腿後面", "足関節部", "アキレス腱部", "後足部", "足底中部・内側縦足弓", "前足部",
]);

function resultRecord(recordId, values) {
  const regions = REGION_IDS.map((regionId, index) => ({
    regionId,
    primaryRegionId: `R${String(index + 1).padStart(2, "0")}`,
    regionName: REGION_NAMES[index],
    value: values[index],
  }));
  const comparison_signatures = Object.fromEntries(REGION_IDS.map((regionId, index) => [regionId, {
    regionId,
    modelVersion: PRIMARY_REGIONAL_V2_MODEL_VERSION,
    outputSemanticVersion: "runload-primary-regional-reference100-output-v3.0",
    constructId: `C-${index + 1}`,
    referenceId: `REF-${index + 1}`,
  }]));
  return {
    id: `result-${recordId}`,
    record_id: recordId,
    model_version: PRIMARY_REGIONAL_V2_MODEL_VERSION,
    output_semantic_version: "runload-primary-regional-reference100-output-v3.0",
    result: { regions },
    comparison_signatures,
  };
}

const prior = {
  record: {
    id: "result-parity-prior", date: "2026-10-01", createdAt: "2026-10-01T08:00:00.000Z",
    activityType: "run", distanceKm: 4, durationMinutes: 26, runningFormat: "CONTINUOUS_RUN",
    course: { name: "河川コース" },
  },
  feedback: { bodyAreaObservations: [] },
  regionalV2ResultRecord: resultRecord("result-parity-prior", REGION_IDS.map((_, index) => 95 + index)),
};
const current = {
  record: {
    id: "result-parity-current", date: "2026-10-05", createdAt: "2026-10-05T08:30:00.000Z",
    activityType: "run", distanceKm: 5, durationMinutes: 30, runningFormat: "CONTINUOUS_RUN",
    course: { name: "河川コース" },
  },
  feedback: { bodyAreaObservations: [] },
  regionalV2ResultRecord: resultRecord("result-parity-current", REGION_IDS.map((_, index) => 100 + index)),
};
const rest = {
  record: {
    id: "result-parity-rest", date: "2026-10-05", createdAt: "2026-10-05T09:00:00.000Z",
    activityType: "rest", reflectionContext: { postRunReflection: "休養メモ" },
  },
  feedback: { bodyAreaObservations: [] },
  regionalV2ResultRecord: null,
};

function servicesFor(experience, allExperiences) {
  return {
    workflows: { records: {
      loadExperience: () => experience,
      loadLatestExperience: () => experience,
      loadAllExperiences: () => allExperiences,
    } },
    fatigue: { summarizeRun: () => ({ available: true, pre: 3, post: 6 }) },
    storage: { selfInterpretations: { findByRecordId: () => null } },
    achievements: {},
  };
}

function render(renderer, experience, allExperiences) {
  return renderer({
    services: servicesFor(experience, allExperiences),
    context: { parameters: new URLSearchParams(`recordId=${experience.record.id}`) },
  });
}

const desktopRun = render(renderDesktopResult, current, [prior, current]);
assert.match(desktopRun, /class="pc-result-console"/);
assert.match(desktopRun, /data-pc-region-select=/);
assert.match(desktopRun, /data-pc-detail-region=/);
assert.match(desktopRun, /data-result-next-interpretation/);
assert.match(desktopRun, /data-rof-result-guidance/);
assert.doesNotMatch(desktopRun, /result-mobile-layout/);

const mobileRun = render(renderMobileResult, current, [prior, current]);
assert.match(mobileRun, /class="result-mobile-layout"/);
assert.match(mobileRun, /data-result-region-sheet/);
assert.match(mobileRun, /data-result-mobile-view="focus"/);
assert.match(mobileRun, /data-action="open-result-region-sheet"/);
assert.match(mobileRun, /mobile-run-lab/);
assert.doesNotMatch(mobileRun, /class="pc-result-console"/);

const desktopRest = render(renderDesktopResult, rest, [rest]);
assert.match(desktopRest, /pc-result-console--rest/);
assert.match(desktopRest, /休養日の記録/);

const mobileRest = render(renderMobileResult, rest, [rest]);
assert.match(mobileRest, /class="result-mobile-layout"/);
assert.match(mobileRest, /休養として保存済み/);
assert.doesNotMatch(mobileRest, /mobile-run-lab/);

console.log("resultBaselineParity: ok");

const resultBaseCss = fs.readFileSync(new URL("../styles/result-screen-base.css", import.meta.url), "utf8");
assert.match(resultBaseCss, /\.screen-layout--result \.body-silhouette/);
assert.match(fs.readFileSync(new URL("../index.html", import.meta.url), "utf8"), /result-screen-base\.css/);

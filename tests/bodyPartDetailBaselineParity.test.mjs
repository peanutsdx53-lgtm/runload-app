import assert from "node:assert/strict";
import { renderBodyPartDetailScreen as renderDesktopBodyPartDetail } from "../screens/desktop/bodyPartDetailScreen.js";
import { renderBodyPartDetailScreen as renderMobileBodyPartDetail } from "../screens/mobile/bodyPartDetailScreen.js";
import { PRIMARY_REGIONAL_V2_MODEL_VERSION } from "../core/appCore.js";

const REGION_ID = "BA-DISP-023";
const SIGNATURE = Object.freeze({
  regionId: REGION_ID,
  modelVersion: PRIMARY_REGIONAL_V2_MODEL_VERSION,
  outputSemanticVersion: "runload-primary-regional-reference100-output-v3.0",
  constructId: "C-CALF",
  referenceId: "REF-CALF",
});

function experience(id, date, value, distanceKm = 5, durationMinutes = 30) {
  const row = { regionId: REGION_ID, primaryRegionId: "R07", regionName: "下腿後面", value };
  return {
    record: { id, date, createdAt: `${date}T08:00:00.000Z`, activityType: "run", distanceKm, durationMinutes },
    regionalV2Result: { regions: [row] },
    regionalV2ResultRecord: {
      id: `result-${id}`,
      record_id: id,
      model_version: PRIMARY_REGIONAL_V2_MODEL_VERSION,
      output_semantic_version: SIGNATURE.outputSemanticVersion,
      result: { regions: [row] },
      comparison_signatures: { [REGION_ID]: SIGNATURE },
    },
  };
}

const prior = experience("detail-prior", "2026-10-01", 101, 4, 25);
const current = experience("detail-current", "2026-10-05", 108, 5, 30);
const all = [prior, current];
const services = {
  workflows: { records: {
    loadExperience: (id) => all.find((item) => item.record.id === id) || null,
    loadAllExperiences: () => all,
  } },
};
const context = { parameters: new URLSearchParams(`recordId=${current.record.id}&regionId=${REGION_ID}`) };

const desktop = renderDesktopBodyPartDetail({ services, context });
assert.match(desktop, /BODY REGION DETAIL/);
assert.match(desktop, /下腿後面/);
assert.match(desktop, /trend-svg--pc/);
assert.match(desktop, /前回からの変化 \+7/);
assert.match(desktop, /origin=body-part-detail&amp;regionId=|origin=body-part-detail&regionId=/);
assert.doesNotMatch(desktop, /mobile-detail-reference|mobile-detail-metrics|mobile-trend-detail|trend-svg--mobile/);

const mobile = renderMobileBodyPartDetail({ services, context });
assert.match(mobile, /BODY REGION DETAIL/);
assert.match(mobile, /mobile-detail-reference/);
assert.match(mobile, /mobile-detail-metrics/);
assert.match(mobile, /trend-svg--mobile/);
assert.match(mobile, /mobile-trend-detail/);
assert.match(mobile, /data-trend-point-index="1"/);
assert.match(mobile, /data-trend-distance="5\.00"/);
assert.doesNotMatch(mobile, /trend-svg--pc/);
assert.ok(mobile.indexOf('class="trend-dates"') < mobile.indexOf('class="mobile-trend-detail"'), "mobile baseline order keeps dates before selected-record detail");

const missingContext = { parameters: new URLSearchParams(`recordId=missing&regionId=${REGION_ID}`) };
for (const renderer of [renderDesktopBodyPartDetail, renderMobileBodyPartDetail]) {
  const html = renderer({ services, context: missingContext });
  assert.match(html, /この部位の数値を表示できません/);
  assert.match(html, /不足する条件を0や100で補いません/);
}

console.log("bodyPartDetailBaselineParity: ok");

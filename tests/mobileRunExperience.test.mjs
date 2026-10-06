import assert from "node:assert/strict";
import fs from "node:fs";
import { PRIMARY_REGIONAL_V2_MODEL_VERSION } from "../core/appCore.js";
import { buildRunFingerprint } from "../ui/mobileRunFingerprint.js";
import { renderBodyTimelineScreen } from "../screens/bodyTimelineScreen.js";

const baseRecord = { id: "run-29", date: "2026-09-30", createdAt: "2026-09-30T11:00:00.000Z", activityType: "run", distanceKm: 5, durationMinutes: 30, runningFormat: "CONTINUOUS_RUN" };
const measurement = { track: [{ lat: 37.5, lon: 139.9, timestamp: 0 }, { lat: 37.51, lon: 139.91, timestamp: 1000 }], acceptedPointCount: 2, rejectedPointCount: 0 };
const a = buildRunFingerprint(baseRecord, { measurement, fatigue: { pre: 2, post: 4 } });
const b = buildRunFingerprint(baseRecord, { measurement, fatigue: { pre: 2, post: 4 } });
const c = buildRunFingerprint({ ...baseRecord, distanceKm: 8 }, { measurement, fatigue: { pre: 2, post: 4 } });
assert.equal(a.identifier, b.identifier);
assert.equal(a.outerPoints, b.outerPoints);
assert.notEqual(a.identifier, c.identifier);
assert.match(a.identifier, /^RF-[0-9A-F]{6}$/);

function resultRecord(recordId, offset) {
  return {
    id: `result-${recordId}`,
    record_id: recordId,
    model_version: PRIMARY_REGIONAL_V2_MODEL_VERSION,
    result: { regions: [
      { regionId: "BA-DISP-014", value: 100 + offset },
      { regionId: "BA-DISP-015", value: 96 + offset },
      { regionId: "BA-DISP-029", value: 104 + offset },
    ] },
  };
}
const experiences = [0, 1, 2].map((offset) => ({
  record: { ...baseRecord, id: `r${offset}`, date: `2026-09-${28 + offset}`, distanceKm: 4 + offset },
  regionalV2ResultRecord: resultRecord(`r${offset}`, offset),
}));
const html = renderBodyTimelineScreen({
  services: { workflows: { records: { loadAllExperiences: () => experiences } } },
  context: { parameters: new URLSearchParams("recordId=r2") },
});
assert.match(html, /身体の推移/);
assert.match(html, /data-current="true"/);
assert.equal((html.match(/data-body-timeline-card/g) || []).length, 3);
assert.match(html, /data-direction="above"/);
assert.match(html, /data-direction="below"/);

const resultSource = fs.readFileSync(new URL("../screens/mobile/resultScreen.js", import.meta.url), "utf8");
assert.match(resultSource, /記録の形/);
assert.match(resultSource, /#\/body-timeline\?recordId=/);
assert.match(resultSource, /#\/run-route\?recordId=.*replay=1/);
assert.match(resultSource, /if \(record\.activityType !== "run"\) return ""/);
assert.doesNotMatch(resultSource, /mobileLayout/);

const routeSource = fs.readFileSync(new URL("../screens/runRouteScreen.js", import.meta.url), "utf8");
const routeInteractionSource = fs.readFileSync(new URL("../ui\/interactions\/runRouteInteractions.js", import.meta.url), "utf8");
assert.match(routeSource, /data-run-route-replay/);
assert.match(routeInteractionSource, /setMarker\(point\)/);
assert.match(routeInteractionSource, /timestamp/);

const mapSource = fs.readFileSync(new URL("../ui/runMeasurementMap.js", import.meta.url), "utf8");
assert.match(mapSource, /function setMarker\(point\)/);
assert.match(mapSource, /setCenter, setMarker, setTrack/);

const screenRegistrySource = fs.readFileSync(new URL("../screens/sharedScreenRegistry.js", import.meta.url), "utf8");
assert.match(screenRegistrySource, /"body-timeline": renderBodyTimelineScreen/);
const versionSource = fs.readFileSync(new URL("../ui/appVersionStatus.js", import.meta.url), "utf8");
const currentVersion = versionSource.match(/APP_VERSION = "([^"]+)"/)?.[1] || "";
assert.match(currentVersion, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
const sw = fs.readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");
assert.ok(sw.includes(`running-record-app-runtime-${currentVersion}`));
assert.match(sw, /screens\/bodyTimelineScreen\.js/);
assert.match(sw, /ui\/mobileRunFingerprint\.js/);
assert.match(sw, /styles\/mobile-run-lab\.css/);

console.log("mobileRunExperience: ok");

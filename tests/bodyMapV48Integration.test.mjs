import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { BODY_REGION_VIEWS } from "../ui/bodyRegionVisuals.js";
import { VIEWS, bodyMap, locatorSvg, direction } from "../screens/resultScreen.js";

const expected = {
  front: ["BA-DISP-014", "BA-DISP-016", "BA-DISP-019", "BA-DISP-021", "BA-DISP-024"],
  back: ["BA-DISP-015", "BA-DISP-018", "BA-DISP-023", "BA-DISP-025"],
  sole: ["BA-DISP-029", "BA-DISP-028", "BA-DISP-027"],
};
test("v48 anatomy shapes are the single canonical 3-view 12-ID source", () => {
  assert.equal(VIEWS, BODY_REGION_VIEWS);
  assert.deepEqual(VIEWS.map(({ key }) => key), Object.keys(expected));
  for (const view of VIEWS) {
    assert.deepEqual(view.paths.map(([id]) => id), expected[view.key]);
    assert.match(view.silhouette, /<path d="M/);
    assert.doesNotMatch(view.silhouette, /<image|data:image|http:|https:/i);
    for (const [id, path] of view.paths) {
      assert.match(path, /^M[0-9]/, id);
      assert.ok(path.length > 35, id);
    }
  }
});
test("result chart preserves 3 unchanged viewBox, IDs, links, CSS state names, and missing hatch", () => {
  const infos = VIEWS.flatMap(v => v.paths).map(([id], i) => ({ row: { regionId: id, regionName: id, value: i === 11 ? null : 75 + i * 5 } }));
  const html = bodyMap({ record_id: "sample" }, infos, "test", "BA-DISP-014", { enhancedTouch: true });
  assert.equal((html.match(/viewBox="70 10 160 430"/g)||[]).length, 3);
  assert.equal((html.match(/class="region-link"/g)||[]).length, 12);
  assert.equal((html.match(/class="region-hit-area"/g)||[]).length, 12);
  assert.equal((html.match(/class="region-path(?: is-selected)?"/g)||[]).length, 12);
  assert.equal((html.match(/class="region-feedback" data-region-id="BA-DISP-/g)||[]).length, 12);
  assert.match(html, /data-direction="above"/);
  assert.match(html, /data-direction="below"/);
  assert.match(html, /data-direction="reference"/);
  assert.match(html, /data-direction="unavailable"/);
  assert.match(html, /fill:url\(#hatch-sole-test\)/);
  assert.match(html, /#\/body-part-detail\?recordId=sample&regionId=BA-DISP-014/);
  assert.match(html, /clipPath id="body-clip-front-test"/);
  for (const id of infos.map(x => x.row.regionId)) assert.match(locatorSvg(id), /class="mini-region"/);
  assert.equal(direction(100),"reference");
  assert.equal(direction(109),"above");
  assert.equal(direction(89),"below");
  assert.equal(direction(null),"unavailable");
});
test("result, timeline and detail source share geometry; PC ankle references the same canonical shared path", () => {
  const result = fs.readFileSync(new URL("../screens/resultScreen.js", import.meta.url), "utf8");
  const timeline = fs.readFileSync(new URL("../screens/bodyTimelineScreen.js", import.meta.url), "utf8");
  const detail = fs.readFileSync(new URL("../screens/bodyPartDetailScreen.js", import.meta.url), "utf8");
  const pc = fs.readFileSync(new URL("../screens/desktop/resultScreen.js", import.meta.url), "utf8");
  assert.match(result, /BODY_REGION_VIEWS/);
  assert.match(timeline, /BODY_REGION_VIEWS/);
  assert.match(detail, /BODY_REGION_VIEWS/);
  assert.doesNotMatch(pc, /FRONT_LOWER_DESKTOP|region-path--pc-shape/);
  for (const code of [result, timeline, detail]) assert.match(code, /viewBox="70 10 160 430"/);
});

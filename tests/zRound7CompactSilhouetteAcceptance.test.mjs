import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { VIEWS, bodyMap, locatorSvg } from '../screens/resultScreen.js';
import {
  ANATOMY_FRONT, ANATOMY_BACK, ANATOMY_SOLE,
  ANATOMY_REGIONS, ANATOMY_MARKINGS,
} from '../ui/anatomicalBodySvg.js';

const ids = VIEWS.flatMap(view => view.paths.map(([id]) => id));
const sample = (value) => ids.map(regionId => ({row:{regionId,value}}));

test('Round7 three views remain simultaneous, with exactly 12 known accessible regions', () => {
  assert.deepEqual(VIEWS.map(view => view.key), ['front','back','sole']);
  assert.deepEqual(VIEWS.map(view => view.paths.length),[5,4,3]);
  assert.equal(new Set(ids).size,12);
  const html=bodyMap({record_id:'review'},sample(100),'round7');
  assert.equal((html.match(/<figure class="body-view"/g)||[]).length,3);
  assert.equal((html.match(/class="region-link"/g)||[]).length,12);
  assert.equal((html.match(/data-direction="reference"/g)||[]).length,12);
  for(const id of ids)assert.match(html,new RegExp('regionId='+id));
});

test('Round7 sole is a single integrated five-toe footprint, not four detached oval toes', () => {
  assert.equal((ANATOMY_SOLE.match(/<path /g)||[]).length,1);
  assert.doesNotMatch(ANATOMY_SOLE,/(?:<ellipse|<circle)/);
  assert.match(ANATOMY_SOLE,/M119 125/);
  assert.match(ANATOMY_SOLE,/Q139 73 146 72/);
  assert.match(ANATOMY_SOLE,/Q181 304 171 314/);
  assert.equal(ANATOMY_REGIONS.sole.length,3);
  for(const [id] of ANATOMY_REGIONS.sole) assert.match(locatorSvg(id),/class="mini-region"/);
});

test('Round7 distinct front and back human silhouettes favour contours over fake anatomical engraving', () => {
  assert.notEqual(ANATOMY_FRONT,ANATOMY_BACK);
  assert.match(ANATOMY_FRONT,/M140 67/);
  assert.match(ANATOMY_BACK,/M140 67/);
  assert.ok((ANATOMY_MARKINGS.front.match(/<path/g)||[]).length<=4);
  assert.ok((ANATOMY_MARKINGS.back.match(/<path/g)||[]).length<=4);
});

test('Round7 mobile map shows all three figures in the same row while keeping existing colours', () => {
  const css=fs.readFileSync(new URL('../styles/mobile-run-lab.css',import.meta.url),'utf8');
  assert.match(css,/Compact, simultaneous THREE-view/);
  assert.match(css,/\.screen--result\.screen-layout--result \.body-map \{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.body-view\[data-view="sole"\] \{[\s\S]*?grid-column:auto/);
  const semantic=fs.readFileSync(new URL('../styles/result-screen-base.css',import.meta.url),'utf8');
  assert.match(semantic,/\.region-path\[data-direction="above"\]\{fill:var\(--model\)/);
  assert.match(semantic,/\.region-path\[data-direction="below"\]\{fill:var\(--color-info\)/);
  assert.match(semantic,/\.region-path\[data-direction="unavailable"\]\{fill:url\(#hatch-front\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bodyMap, direction, VIEWS } from '../screens/resultScreen.js';
const values = Object.freeze({ reference: 100, above: 120, below: 80, unavailable: null });
const ids = VIEWS.flatMap(view => view.paths.map(([id]) => id));
const read = (path) => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('all twelve regions receive each of the four canonical value states', () => {
  assert.equal(ids.length, 12);
  assert.equal(new Set(ids).size, 12);
  for (const [state, value] of Object.entries(values)) {
    assert.equal(direction(value), state);
    const result = { record_id: 'test' };
    const infos = ids.map(regionId => ({ row: { regionId, value } }));
    const html = bodyMap(result, infos, 'four-state');
    assert.equal((html.match(/class="region-path(?: is-selected)?"/g) || []).length, 12);
    assert.equal((html.match(/class="region-link"/g) || []).length, 12);
    assert.equal((html.match(new RegExp(`data-direction="${state}"`, 'g')) || []).length, 12);
    for (const id of ids) {
      assert.match(html, new RegExp(`data-region-id="${id}"`), `${id}/${state}`);
    }
    for (const view of VIEWS) {
      assert.match(html, new RegExp(`id="body-clip-${view.key}-four-state"`), view.key);
      assert.ok(html.includes(`clip-path="url(#body-clip-${view.key}-four-state)"`));
      if (state === 'unavailable') {
        assert.ok(html.includes(`id="hatch-${view.key}-four-state"`));
        assert.ok(html.includes(`fill:url(#hatch-${view.key}-four-state)`));
      }
    }
  }
});

test('individual region state transitions preserve all other 11 IDs', () => {
  for (const target of ids) {
    for (const [state, value] of Object.entries(values)) {
      const infos = ids.map(regionId => ({ row: { regionId, value: regionId === target ? value : 100 } }));
      const html = bodyMap({record_id:'test'}, infos, 'individual');
      // Only the selected region gets a non-reference state, except when testing reference.
      const targetPath = html.match(new RegExp(`<path class="region-path" data-direction="([^"]+)" data-region-id="${target}"[^>]*>`));
      assert.ok(targetPath, target);
      assert.equal(targetPath[1], state, target);
      assert.equal((html.match(/class="region-link"/g) || []).length, 12);
      for (const id of ids.filter(id => id !== target)) {
        assert.match(html, new RegExp(`data-direction="reference" data-region-id="${id}"`));
      }
    }
  }
});

test('value classification preserves reference vicinity and does not mistake missing values for zero', () => {
  assert.equal(direction(100), 'reference');
  assert.equal(direction(100.5), 'reference');
  assert.equal(direction(99.5), 'reference');
  assert.equal(direction(101), 'above');
  assert.equal(direction(99), 'below');
  assert.equal(direction(0), 'below');
  for (const missing of [null, undefined, '', ' ', {}, [], false, Number.NaN]) {
    assert.equal(direction(missing), 'unavailable');
  }
});

test('all map instances have unique SVG clip and hatch IDs to prevent paint collisions', () => {
  const infos = ids.map(regionId => ({ row: { regionId, value: null } }));
  const html = bodyMap({}, infos, 'panel-A') + bodyMap({}, infos, 'panel-B');
  for (const view of VIEWS) {
    for (const suffix of ['panel-A','panel-B']) {
      assert.equal(html.split(`id="body-clip-${view.key}-${suffix}"`).length - 1, 1);
      assert.equal(html.split(`id="hatch-${view.key}-${suffix}"`).length - 1, 1);
      assert.equal(html.split(`clip-path="url(#body-clip-${view.key}-${suffix})"`).length - 1, 1);
    }
  }
});

test('missing uses a neutral hatch rather than the default silhouette; desktop ankle uses canonical single path', () => {
  const result=read('screens/resultScreen.js');
  const timeline=read('screens/bodyTimelineScreen.js');
  const css=read('styles/result-screen-base.css');
  const desktop=read('screens/desktop/resultScreen.js');
  const desktopCss=read('styles/desktop-foundation.css');
  assert.match(result, /<rect width="10" height="10" fill="var\(--color-neutral-soft/);
  assert.match(timeline, /<rect width="12" height="12" fill="var\(--color-neutral-soft/);
  assert.match(css, /data-direction="unavailable"\]\{fill:var\(--color-neutral-soft\)/);
  assert.doesNotMatch(css, /url\(#hatch-(?:front|back|sole)\)/);
  assert.doesNotMatch(desktop, /FRONT_LOWER_DESKTOP|renderDesktopAdditionalRegionPath/);
  assert.doesNotMatch(desktopCss, /region-path--pc-shape|region-path--front-lower-shape/);
  assert.doesNotMatch(desktopCss, /clip-path:\s*url\(#body-clip-/);
});

test('saved body timeline uses all 12 state colors and distinct missing patterns', async () => {
  const {renderBodyTimelineScreen} = await import('../screens/bodyTimelineScreen.js');
  const {RUNNING_EVIDENCE_MODEL_VERSION} = await import('../core/appCore.js');
  for (const [state,value] of Object.entries(values)) {
    const result={model_version:RUNNING_EVIDENCE_MODEL_VERSION,result:{regions:ids.map(regionId=>({regionId,value}))}};
    const services={workflows:{records:{loadAllExperiences:()=>[{record:{id:'r',activityType:'run',date:'2026-10-21',distanceKm:5,durationMinutes:30},regionalV2ResultRecord:result}]}}};
    const html=renderBodyTimelineScreen({services,context:{parameters:new URLSearchParams('recordId=r')}});
    assert.equal((html.match(/class="body-timeline-map__region"/g)||[]).length,12);
    assert.equal((html.match(new RegExp(`data-direction="${state}"`, 'g'))||[]).length,12);
    for (const view of VIEWS) {
      assert.ok(html.includes(`id="timeline-hatch-${view.key}-0-r"`));
      if (state === 'unavailable') assert.ok(html.includes(`fill:url(#timeline-hatch-${view.key}-0-r)`));
    }
  }
});

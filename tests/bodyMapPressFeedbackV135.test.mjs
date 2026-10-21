import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bodyMap, VIEWS } from '../screens/resultScreen.js';
const read = name => fs.readFileSync(new URL('../'+name, import.meta.url), 'utf8');
const allIds = VIEWS.flatMap(view => view.paths.map(([id]) => id));

test('all 12 active SVG regions have a separate feedback outline behind the colored fill', () => {
  const values = [100, 125, 75, null];
  for (const value of values) {
    const html = bodyMap({record_id:'regression'},allIds.map(regionId=>({row:{regionId,value}})),`v135-${String(value)}`,'',{enhancedTouch:true});
    assert.equal((html.match(/class="region-feedback-outline"/g)||[]).length, 12);
    assert.equal((html.match(/class="region-path"/g)||[]).length, 12);
    assert.equal((html.match(/class="region-hit-area"/g)||[]).length, 12);
    assert.equal((html.match(/class="region-link"/g)||[]).length, 12);
    assert.equal((html.match(/clip-path="url\(#body-clip-/g)||[]).length, 6);
    for (const regionId of allIds) {
      assert.match(html, new RegExp(`class="region-feedback-outline"[^>]*pointer|class="region-feedback-outline" d=`));
      const color = html.indexOf(`data-region-id="${regionId}"`);
      assert.ok(color >= 0,regionId);
      const regionStart = html.lastIndexOf('<a class="region-link"',color);
      const linkContent = html.slice(regionStart,color);
      const feedback = linkContent.lastIndexOf('class="region-feedback-outline"');
      assert.ok(feedback>=0, `${regionId}: outline must be in its own link`);
      assert.ok(linkContent.indexOf('class="region-path"') > feedback, `${regionId}: outline under colored path`);
      assert.ok(linkContent.includes('aria-hidden="true" focusable="false"'),regionId);
    }
  }
});

test('transient ring leaves fill/stroke of all normal body regions alone', () => {
  const css=read('styles/result-screen-base.css');
  assert.match(css,/\.region-path\{[\s\S]*?stroke:none !important/);
  assert.match(css,/\.region-feedback-outline\s*\{[\s\S]*?fill:\s*none/);
  assert.match(css,/\.region-feedback-outline\s*\{[\s\S]*?vector-effect:\s*non-scaling-stroke/);
  assert.match(css,/\.region-feedback-outline\s*\{[\s\S]*?pointer-events:\s*none/);
  assert.match(css,/\.region-link:is\(:active,:focus-visible,\.is-pressing\) \.region-feedback-outline/);
  assert.match(css,/@media \(hover: hover\) and \(pointer: fine\)/);
  const mobile=read('styles/mobile-screen-layouts.css');
  assert.doesNotMatch(mobile,/\.region-link:active \.region-path\{[^}]*stroke\s*:/);
  for (const view of VIEWS)assert.equal(view.paths.length,{front:5,back:4,sole:3}[view.key]);
});

test('iOS pointerdown adds temporary feedback class and release/cancel/blur cleans it without navigation delay', () => {
  const binder=read('ui/interactions/mobileResultInteractions.js');
  assert.match(binder,/root\.addEventListener\("pointerdown", onRegionPointerDown\)/);
  assert.match(binder,/link\.classList\.add\("is-pressing"\)/);
  assert.match(binder,/window\.addEventListener\("pointerup", clearPressedRegion\)/);
  assert.match(binder,/window\.addEventListener\("pointercancel", clearPressedRegion\)/);
  assert.match(binder,/window\.addEventListener\("blur", clearPressedRegion\)/);
  assert.match(binder,/root\.removeEventListener\("pointerdown", onRegionPointerDown\)/);
  assert.doesNotMatch(binder,/preventDefault\(|stopPropagation\(|setTimeout\(/);
});

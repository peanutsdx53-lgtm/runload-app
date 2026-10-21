import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bodyMap, VIEWS} from '../screens/resultScreen.js';
const read = name => fs.readFileSync(new URL('../'+name, import.meta.url), 'utf8');
const allIds = VIEWS.flatMap(view => view.paths.map(([id]) => id));

test('12 regions keep separate fill and unobstructed top-layer feedback per status', () => {
  for (const value of [100, 125, 75, null]) {
    const suffix=`v136-${String(value)}`;
    const html = bodyMap({record_id:'regression'},allIds.map(regionId=>({row:{regionId,value}})),suffix,'',{enhancedTouch:true});
    assert.equal((html.match(/class="region-feedback"/g)||[]).length,12);
    assert.equal((html.match(/class="region-path"/g)||[]).length,12);
    assert.equal((html.match(/class="region-hit-area"/g)||[]).length,12);
    assert.equal((html.match(/class="region-link"/g)||[]).length,12);
    for (const view of VIEWS) {
      assert.match(html, new RegExp(`<filter id="feedback-ring-${view.key}-${suffix}" filterUnits="userSpaceOnUse"`));
      assert.match(html, new RegExp(`<g class="region-layer" clip-path="url\\(#body-clip-${view.key}-${suffix}\\)"`));
      assert.match(html, new RegExp(`<g class="region-feedback-layer" aria-hidden="true" pointer-events="none">`));
    }
    for (const id of allIds) {
      const index=html.indexOf(`data-region-id="${id}"`);
      const overlayIndex=html.indexOf(`class="region-feedback" data-region-id="${id}"`);
      assert.ok(index>=0 && overlayIndex>index,`${id}: overlay must be above all fill paths`);
      const fill=html.slice(0,overlayIndex);
      assert.match(fill,new RegExp(`data-direction="${value===null?'unavailable':value===100?'reference':value>100?'above':'below'}" data-region-id="${id}"`));
    }
  }
});

test('actual filtered perimeter originates from silhouette-clipped region and contains no filled interior',()=>{
  const code=read('screens/resultScreen.js');
  const css=read('styles/result-screen-base.css');
  assert.match(code, /<feMorphology in="SourceAlpha" operator="dilate" radius="5\.0"/);
  assert.match(code, /<feComposite in="outer-dilation" in2="SourceAlpha" operator="out"/);
  assert.match(code, /<feComposite in="inner-dilation" in2="SourceAlpha" operator="out"/);
  assert.match(code, /<feMergeNode in="light-ring"/);
  assert.match(code, /<g clip-path="url\(#body-clip-\$\{view\.key\}-\$\{idSuffix\}\)"/);
  assert.match(css, /\.region-feedback-layer,\s*\.screen-layout--result \.region-feedback \{pointer-events:none\}/);
  assert.match(css, /\.region-feedback \{\s*opacity:0/);
  assert.match(css, /\.region-link:nth-child\(5\):is\(:active,:focus-visible,\.is-pressing\)/);
  assert.doesNotMatch(css, /\.region-feedback-outline/);
  assert.match(css,/\.region-path\{[\s\S]*?stroke:none !important/);
});

test('pointerdown and pointerup control the underlying region; no artificial delay in navigation',()=>{
  const binder=read('ui/interactions/mobileResultInteractions.js');
  assert.match(binder,/root\.addEventListener\("pointerdown", onRegionPointerDown\)/);
  assert.match(binder,/link\.classList\.add\("is-pressing"\)/);
  assert.match(binder,/window\.addEventListener\("pointerup", clearPressedRegion\)/);
  assert.match(binder,/window\.addEventListener\("pointercancel", clearPressedRegion\)/);
  assert.match(binder,/window\.addEventListener\("blur", clearPressedRegion\)/);
  assert.doesNotMatch(binder,/preventDefault\(|stopPropagation\(|setTimeout\(/);
});

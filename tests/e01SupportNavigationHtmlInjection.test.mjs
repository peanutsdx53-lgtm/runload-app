import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSupportGuidanceScreen } from '../screens/shared/supportGuidanceScreen.js';

const contexts = [
  '#/consultation" onmouseover="alert(1)" data-synthetic-attack="yes',
  '#/record-input"><img src="https://tile.openstreetmap.org/0/0/0.png" onerror="alert(2)">',
  '#/more" autofocus onfocus="alert(3)',
  '#/consultation?recordId=R01&other=<svg/onload=alert(4)>',
];

for (const value of contexts) {
  test(`E-01: hostile returnTo cannot escape support navigation href (${contexts.indexOf(value)+1})`, () => {
    const markup = renderSupportGuidanceScreen({ context: { parameters: new URLSearchParams({ returnTo: value }) }});
    assert.equal((markup.match(/class="secondary-derived-back"/g)||[]).length, 1);
    assert.equal((markup.match(/data-context-back-duplicate/g)||[]).length, 1);
    assert.doesNotMatch(markup, /<img\s+src="https:\/\/tile\.openstreetmap\.org/i);
    assert.doesNotMatch(markup, /<svg\/onload=/i);
    assert.doesNotMatch(markup, /\sonmouseover="alert\(|\sonfocus="alert\(|\sdata-synthetic-attack="yes"/i);
    const links = [...markup.matchAll(/<a\s+[^>]*href="([^"]*)"/g)];
    const backLinks = links.filter(m => /secondary-derived-back|data-context-back-duplicate/.test(m[0]));
    assert.equal(backLinks.length, 2, 'two back links remain well-formed');
    for (const link of backLinks) {
      assert.ok(link[1].startsWith('#/'), 'only internal hash navigation');
      assert.doesNotMatch(link[1], /["<>]/, 'no unencoded markup delimiters in HTML attribute');
    }
  });
}

test('E-01: ordinary returnTo and recordId keep exactly the original internal navigation', () => {
  const routes = ['#/consultation?recordId=2026-10-10', '#/record-input?recordId=ref-10', '#/more'];
  for (const returnTo of routes) {
    const markup = renderSupportGuidanceScreen({ context: { parameters: new URLSearchParams({returnTo}) }});
    assert.equal((markup.match(new RegExp('href="'+returnTo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'"','g'))||[]).length,2);
  }
  const withoutReturn = renderSupportGuidanceScreen({context:{parameters:new URLSearchParams({recordId:'R001'})}});
  assert.equal((withoutReturn.match(/href="#\/record-input\?recordId=R001&(?:amp;)subflow=subjective"/g)||[]).length,2);
});

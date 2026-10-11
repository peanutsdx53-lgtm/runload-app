import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDepartureCheckScreen } from '../screens/mobile/quickToolsScreen.js';
import { renderSupportGuidanceScreen } from '../screens/shared/supportGuidanceScreen.js';
import { renderTermsScreen } from '../screens/shared/termsScreen.js';
import { renderPrivacyScreen } from '../screens/shared/privacyScreen.js';

// Independent, real production renderers. The persisted JSON and location
// parameters below are hostile sources flowing through app.js screenContent.
const payloads = [
  '<img src=x onerror="globalThis.__runloadE01=1">',
  '<svg onload="globalThis.__runloadE01=1"></svg>',
  '\"><iframe srcdoc="<script>globalThis.__runloadE01=1</script>"></iframe>',
  '</textarea><a href="javascript:globalThis.__runloadE01=1">bad</a>',
  '" autofocus onfocus="globalThis.__runloadE01=1',
];
const key = 'running-record-mobile-quick-tools-v1';
const ctx = (returnTo) => ({ parameters: new URLSearchParams({ returnTo, recordId: 'r-1' }) });

function renderStored(payload) {
  const previousStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, value: { getItem(k) {
      assert.equal(k, key);
      return JSON.stringify({version:1, departureChecks:[{
        id: `id-${payload}`, createdAt:'2026-10-12T01:00:00Z',
        checks:['水分',payload], note:payload,
      }]});
    }},
  });
  try { return renderDepartureCheckScreen(); }
  finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', {configurable:true,value:previousStorage});
  }
}

test('E-01 mobile departure-check stored JSON ID/checks/note remain inert text', () => {
  for (const payload of payloads) {
    const html = renderStored(payload);
    assert.match(html, /data-mobile-tool-delete=/);
    assert.ok(html.includes('&lt;') || html.includes('&quot;'));
    assert.ok(!html.includes(payload), 'untrusted source must not be copied into HTML raw');
    assert.doesNotMatch(html, /<img\s+src=x|<svg\s+onload|<iframe\s+srcdoc|href="javascript:/i);
    assert.match(html, /出発チェック/);
  }
});

test('E-01 support return URL gets attr-escaping; policy routes never inherit hostile returnTo', () => {
  for (const payload of payloads) {
    const returnTo = '#/record-input?source=' + payload;
    const support = renderSupportGuidanceScreen({ context:ctx(returnTo) });
    assert.doesNotMatch(support, /<img\s+src=x|<svg\s+onload|<iframe\s+srcdoc|href="javascript:/i);
    assert.ok(support.includes('&#039;') || support.includes('&lt;') || support.includes('&quot;'));
    assert.ok(!support.includes(`href="${returnTo}"`));
    for(const renderer of [renderTermsScreen, renderPrivacyScreen]) {
      const html = renderer({context:ctx('#/settings?' + payload)});
      assert.doesNotMatch(html, /<img\s+src=x|<svg\s+onload|<iframe\s+srcdoc|href="javascript:/i);
      assert.ok(!html.includes(payload), 'policy route must choose only a fixed back link');
    }
  }
});

// Fail-closed rendering on malformed localStorage; no mutation of user's record.
test('E-01 broken/denied storage does not surface foreign markup', () => {
  const previousStorage = globalThis.localStorage;
  const broken = [
    {getItem:()=>'{bad-json'},
    {getItem:()=>{throw Error('storage denied')}},
    {getItem:()=>JSON.stringify({version:1,departureChecks:[null,{},'junk']})},
  ];
  try {
    for(const storage of broken) {
      Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});
      const html=renderDepartureCheckScreen();
      assert.match(html,/保存した出発チェック/);
      assert.doesNotMatch(html,/<script\b|onerror=|onload=/i);
    }
  } finally {
    if(previousStorage===undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis,'localStorage',{configurable:true,value:previousStorage});
  }
});

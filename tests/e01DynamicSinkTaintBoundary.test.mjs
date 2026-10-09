import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { escapeHtml } from '../ui/commonComponents.js';

// Exercise real renderer functions without a browser DOM. This is source-level
// taint reproduction, not a claim of completed browser-based XSS testing.
function extractPrivateRenderers(file, names, extras = {}) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
  const isolated = source
    .replace(/^import\s+(?:\{[\s\S]*?\}|[^;]+?)\s+from\s+["'][^"']+["'];\s*$/gm, '')
    .replace(/^export (function|const|class)\b/gm, '$1');
  const sandbox = { escapeHtml, matchesMobileLayout: () => false,
    document: {getElementById: () => null},
    window: {matchMedia: () => ({addEventListener() {}})},
    queueMicrotask: () => {},
    listMobileExtensionRecords: () => [], findMobileExtensionRecord: () => null,
    ...extras };
  vm.runInNewContext(`${isolated}\nglobalThis.__renderers={${names.join(',')}};`, sandbox, {filename:file});
  return sandbox.__renderers;
}
const injection = '<img src=x onerror=alert(1)>';
const assertEscaped = (html) => {
  assert.doesNotMatch(html, /<img\s+src\s*=\s*x/i);
  assert.match(html, /&lt;img/);
};

test('E-01 saved mobile activity fields are encoded before insertion into history innerHTML', () => {
  const { recordDetail, recordCard, segmentMarkup, regionRows } = extractPrivateRenderers('../ui/mobileWalkJogHistoryUi.js',
    ['recordDetail', 'recordCard', 'segmentMarkup', 'regionRows']);
  const row = {regionId:injection,evidenceTier:injection,index:101,outputStatus:'OK'};
  const segment = {gaitId:injection,coverage:{regions:[row],availableRegionCount:1},distanceKm:1.7,durationSeconds:800,speedKmh:3};
  const record = {id:`a" onmouseover="alert(1)&${injection}`, activityId:injection, createdAt:'invalid', distanceKm:1.7, durationMinutes:18, analysis:{segments:[segment]}};
  for(const html of [regionRows(segment.coverage),segmentMarkup(segment,0), recordDetail(record),recordCard(record)]) {
    assertEscaped(html);
  }
  assert.match(recordCard(record),/mobileActivityRecordId=a%22%20onmouseover%3D%22/);
});

test('E-01 desktop body timeline HTML reinsertion encodes previously rendered textContent', () => {
  const { selectorMarkup } = extractPrivateRenderers('../ui/desktopBodyTimelineWorkspace.js', ['selectorMarkup']);
  const card = {
    querySelector(sel) { if (sel==='header strong'||sel==='header > span') return {textContent:injection}; return null; },
    hasAttribute() {return false;},
  };
  const html=selectorMarkup([card],0);
  assertEscaped(html);
  assert.match(html, /aria-selected="true"/);
});

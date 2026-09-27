import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const results = [];

function test(id, fn) {
  try {
    fn();
    results.push({ id, status: 'PASS' });
  } catch (error) {
    results.push({ id, status: 'FAIL', message: error?.stack || String(error) });
  }
}

test('HOME-RETURN-DOES-NOT-TRANSFORM-HOME-ROOT', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.equal(source.includes('document.querySelector(".mobile-home-os")'), false);
  assert.ok(source.includes('.mobile-home-os__header'));
  assert.ok(source.includes('.mobile-home-page-viewport'));
  assert.ok(source.includes('.mobile-home-dock'));
  assert.ok(source.includes('.mobile-home-page-indicator'));
});

test('HOME-RETURN-ANIMATIONS-DO-NOT-PERSIST-TRANSFORMS', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.ok(source.includes('function animateOnce'));
  assert.ok(source.includes('fill: "none"'));
  assert.ok(source.includes('animation.cancel()'));
});

test('HOME-RETURN-PAINTS-SNAPSHOT-BEFORE-NAVIGATION', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.ok(source.includes('animation.pause()'));
  assert.ok(source.includes('animation.currentTime = 0'));
  assert.ok(source.includes('requestAnimationFrame(startReturn)'));
  assert.ok(source.indexOf('animation.play();') < source.indexOf('globalThis.location.hash = HOME_QUERY.slice(1);', source.indexOf('const startReturn')));
});

test('HOME-PAGE-INDICATOR-REMAINS-VISIBLE-FOR-ONE-PAGE', () => {
  const source = read('ui/interactions/homeInteractions.js');
  assert.ok(source.includes('pageIndicator.hidden = false;'));
  assert.equal(source.includes('pageIndicator.hidden = pages.length <= 1 && !editing;'), false);
});

test('DOCK-AND-PAGE-INDICATOR-ARE-VIEWPORT-FIXED', () => {
  const homeCss = read('styles/mobile-home.css');
  const editingCss = read('styles/mobile-home-editing.css');
  assert.ok(homeCss.includes('.mobile-home-dock {'));
  assert.ok(homeCss.includes('position: fixed;'));
  assert.ok(editingCss.includes('.mobile-home-page-indicator {'));
  assert.ok(editingCss.includes('bottom: calc(116px + env(safe-area-inset-bottom));'));
});

const failed = results.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  suite: 'Mobile Home Fixed UI',
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'FAIL' : 'PASS',
  results,
}, null, 2));
if (failed.length) process.exitCode = 1;

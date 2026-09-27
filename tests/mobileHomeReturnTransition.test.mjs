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

test('HOME-RETURN-REMEMBERS-LAUNCHER', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.ok(source.includes('running-record-mobile-home-last-launch-v1'));
  assert.ok(source.includes('rememberMobileHomeLaunch'));
  assert.ok(source.includes('sessionStorage'));
});

test('HOME-RETURN-USES-VIEW-TRANSITION-WITH-FALLBACK', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.ok(source.includes('document.startViewTransition'));
  assert.ok(source.includes('runViewTransitionReturn'));
  assert.ok(source.includes('runFallbackReturn'));
  assert.ok(source.includes('mobile-home-return-surface'));
});

test('HOME-RETURN-WAITS-FOR-HOME-RENDER', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.ok(source.includes('running-record:screen-rendered'));
  assert.ok(source.includes('notifyMobileScreenRendered'));
  assert.ok(source.includes('waitForHomeRender'));
});

test('HOME-RETURN-SHRINKS-TO-LAUNCH-ICON', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.ok(source.includes('[data-home-item-id]'));
  assert.ok(source.includes('--home-return-scale-x'));
  assert.ok(source.includes('--home-return-scale-y'));
  assert.ok(source.includes('is-home-return-arrival-target'));
});

test('HOME-RETURN-IS-BOUND-TO-SHELL-HOME-LINKS', () => {
  const shell = read('ui/shellInteractions.js');
  assert.ok(shell.includes('bindMobileHomeReturnTransitions'));
  assert.ok(shell.includes('homeReturnCleanup'));
});

test('HOME-LAUNCH-RECORDS-ORIGIN-ITEM', () => {
  const home = read('ui/interactions/homeInteractions.js');
  assert.ok(home.includes('rememberMobileHomeLaunch'));
  assert.ok(home.includes('item.dataset.homeItemId'));
});

test('APP-NOTIFIES-SCREEN-RENDER-COMPLETION', () => {
  const app = read('app.js');
  assert.ok(app.includes('notifyMobileScreenRendered'));
  assert.ok(app.includes('notifyMobileScreenRendered(screenName)'));
});

test('HOME-RETURN-CSS-HAS-REVERSE-MOTION', () => {
  const css = read('styles/mobile-home.css');
  assert.ok(css.includes('::view-transition-old(root)'));
  assert.ok(css.includes('mobile-home-ios-return-old'));
  assert.ok(css.includes('mobile-home-ios-return-new'));
  assert.ok(css.includes('.mobile-home-return-surface.is-closing'));
});

test('HOME-RETURN-RESPECTS-REDUCED-MOTION', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  const css = read('styles/mobile-home-editing.css');
  assert.ok(source.includes('prefers-reduced-motion: reduce'));
  assert.ok(css.includes('is-mobile-home-return-transition'));
});

const failed = results.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  suite: 'Mobile Home Return Transition',
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'FAIL' : 'PASS',
  results,
}, null, 2));
if (failed.length) process.exitCode = 1;

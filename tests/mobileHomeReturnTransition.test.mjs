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

test('HOME-RETURN-REMEMBERS-LAUNCHER-AND-GEOMETRY', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.ok(source.includes('running-record-mobile-home-last-launch-v1'));
  assert.ok(source.includes('rememberMobileHomeLaunch'));
  assert.ok(source.includes('leftRatio'));
  assert.ok(source.includes('topRatio'));
  assert.ok(source.includes('widthRatio'));
  assert.ok(source.includes('heightRatio'));
  assert.ok(source.includes('JSON.stringify(state)'));
});

test('HOME-RETURN-DOES-NOT-WAIT-FOR-VIEW-TRANSITION', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.equal(source.includes('document.startViewTransition'), false);
  assert.equal(source.includes('HOME_RETURN_TIMEOUT_MS'), false);
  assert.equal(source.includes('waitForHomeRender'), false);
  assert.ok(source.includes('runSnapshotReturn'));
});

test('HOME-RETURN-CAPTURES-CURRENT-SCREEN-BEFORE-NAVIGATION', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.ok(source.includes('root.cloneNode(true)'));
  assert.ok(source.includes('mobile-home-return-snapshot'));
  assert.ok(source.includes('mobile-home-return-backdrop'));
});

test('HOME-RETURN-NAVIGATES-WITHOUT-BLOCKING-ON-HOME-RENDER', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.ok(source.includes('listenForHomeArrival(state, visual.backdrop);'));
  assert.ok(source.includes('globalThis.location.hash = HOME_QUERY.slice(1);'));
  assert.equal(source.includes('await rendered'), false);
});

test('HOME-RETURN-SHRINKS-SNAPSHOT-TO-STORED-ICON-POSITION', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.ok(source.includes('visual.snapshot.animate'));
  assert.ok(source.includes('translate3d(${metrics.left}px, ${metrics.top}px, 0)'));
  assert.ok(source.includes('scale(${metrics.scaleX}, ${metrics.scaleY})'));
  assert.ok(source.includes('RETURN_DURATION_MS = 330'));
});

test('HOME-RETURN-ANIMATES-CONTENT-WITHOUT-TRANSFORMING-HOME-ROOT', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.ok(source.includes('animateHomeArrival'));
  assert.ok(source.includes('.mobile-home-page-viewport'));
  assert.ok(source.includes('.mobile-home-dock'));
  assert.ok(source.includes('.mobile-home-page-indicator'));
  assert.ok(source.includes('scale(.985)'));
  assert.ok(source.includes('scale(1.045)'));
  assert.equal(source.includes('document.querySelector(".mobile-home-os")'), false);
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

test('HOME-RETURN-RESPECTS-REDUCED-MOTION', () => {
  const source = read('ui/mobileHomeReturnTransition.js');
  assert.ok(source.includes('prefers-reduced-motion: reduce'));
  assert.ok(source.includes('motionReduced()'));
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

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const results = [];
function test(id, fn) { try { fn(); results.push({ id, status: 'PASS' }); } catch (error) { results.push({ id, status: 'FAIL', message: error?.stack || String(error) }); } }
test('HOME-PAGER-USES-NATIVE-SCROLL-SNAP-IN-NORMAL-MODE', () => { const css = read('styles/mobile-home-editing.css'); assert.ok(css.includes('touch-action: pan-x pan-y;')); assert.ok(css.includes('overscroll-behavior-x: none;')); assert.ok(css.includes('scroll-snap-type: x mandatory;')); assert.ok(css.includes('-webkit-overflow-scrolling: touch;')); });
test('HOME-PAGER-USES-POINTER-CAPTURED-IN-APP-SWIPE', () => { const source = read('ui/interactions/mobileHomeInteractions.js'); for (const name of ['handlePagePointerDown', 'handlePagePointerMove', 'handlePagePointerUp', 'handlePagePointerCancel']) assert.ok(source.includes(name)); assert.ok(source.includes('viewport.setPointerCapture(event.pointerId)')); assert.ok(source.includes('pageSwipeStartLeft - dx')); });
test('HOME-PAGER-NATIVE-SCROLLS-NORMALLY-AND-EDIT-MODE-SNAPS-QUICKLY', () => { const source = read('ui/interactions/mobileHomeInteractions.js'); assert.ok(source.includes('function animatePageViewport(left)')); assert.ok(source.includes('const duration = 180;')); assert.ok(source.includes('1 - Math.pow(1 - progress, 3)')); assert.ok(source.includes('if (!editing) return;')); assert.ok(source.includes('setActivePage(target, { smooth: true, persist: true })')); });
test('HOME-EDIT-MODE-CANNOT-LAUNCH-APP', () => { const source = read('ui/interactions/mobileHomeInteractions.js'); const start = source.indexOf('function openHomeLauncher(launcher)'); assert.ok(start >= 0); assert.ok(source.slice(start, start + 240).includes('if (editing) return;')); assert.ok(source.includes('if (editing || Date.now() < suppressClickUntil) return;')); });
test('HOME-PAGER-DOES-NOT-CHANGE-ACTIVE-PAGE-MID-SWIPE-OR-ANIMATION', () => { const source = read('ui/interactions/mobileHomeInteractions.js'); assert.ok(source.includes('pageSwipePointerId != null || pageAnimationFrame')); });
const failed = results.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ suite: 'Mobile Home Page Gesture', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exitCode = 1;

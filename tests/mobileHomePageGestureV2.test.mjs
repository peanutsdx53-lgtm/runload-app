import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const source = read('ui/interactions/homeInteractions.js');
const css = read('styles/mobile-home-editing.css');
const ret = read('ui/mobileHomeReturnTransition.js');
const results = [];
function test(id, fn) { try { fn(); results.push({ id, status: 'PASS' }); } catch (error) { results.push({ id, status: 'FAIL', message: error?.stack || String(error) }); } }

test('SWIPE-CAN-START-ON-APP-OR-WIDGET-SURFACE', () => {
  const block = source.slice(source.indexOf('function isPageSwipeBlockedTarget'), source.indexOf('function resetPageSwipe'));
  assert.equal(block.includes('[data-home-item-id]'), false);
  assert.equal(block.includes('[data-home-widget-id]'), false);
});

test('EDIT-MODE-USES-SHORT-HOLD-BEFORE-DRAG', () => {
  assert.ok(source.includes('const EDIT_DRAG_ARM_MS = 180;'));
  assert.ok(source.includes('pressTimer = setTimeout(() => armDrag(target, kind), EDIT_DRAG_ARM_MS);'));
  const block = source.slice(source.indexOf('function handlePointerDown'), source.indexOf('function handlePointerMove'));
  assert.equal(block.includes('target.setPointerCapture(event.pointerId)'), false);
});

test('PAGE-SWIPE-WINS-BEFORE-DRAG-AND-BLOCKS-NAVIGATION', () => {
  assert.ok(source.includes('function claimPageSwipe()'));
  assert.ok(source.includes('navigationSurface && (editing || Date.now() < suppressClickUntil)'));
  assert.ok(source.includes('suppressClickUntil = Date.now() + 700;'));
});

test('EDIT-CONTROLS-ARE-HANDLED-BEFORE-NAVIGATION-GUARD', () => {
  assert.ok(source.indexOf('[data-home-widget-remove]') < source.indexOf('const navigationSurface'));
  assert.ok(source.indexOf('[data-home-widget-resize]') < source.indexOf('const navigationSurface'));
});

test('PAGE-SWIPE-IS-RESPONSIVE-AND-FINGER-TRACKED', () => {
  assert.ok(source.includes('Math.min(56, width * 0.12)'));
  assert.ok(source.includes('velocity >= 0.28'));
  assert.ok(source.includes('pageSwipeStartLeft - dx'));
  assert.ok(source.includes('function updatePageMotionVisuals()'));
  assert.ok(source.includes('const duration = 280;'));
});

test('NORMAL-ITEM-TOUCH-ALLOWS-VERTICAL-PAN', () => {
  const block = css.slice(css.indexOf('.mobile-home-os [data-home-item-id]'), css.indexOf('.mobile-home-os.is-home-drag-active'));
  assert.ok(block.includes('touch-action: pan-y;'));
  assert.ok(css.includes('.mobile-home-os.is-home-editing [data-home-item-id]'));
  assert.ok(css.includes('touch-action: none;'));
});

test('PAGE-MOTION-HAS-SUBTLE-SEAMLESS-VISUAL', () => {
  assert.ok(css.includes('will-change: transform, opacity;'));
  assert.ok(source.includes('page.style.transform = `scale('));
  assert.ok(source.includes('page.style.opacity = String('));
});

test('RETURN-INDICATOR-NEVER-CHANGES-POSITION', () => {
  const start = ret.indexOf('const indicator =');
  const block = ret.slice(start, ret.indexOf('const target =', start));
  assert.equal(block.includes('transform:'), false);
  assert.ok(block.includes('{ opacity: .35 }'));
});

const failed = results.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ suite: 'Mobile Home Page Gesture V2', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exitCode = 1;

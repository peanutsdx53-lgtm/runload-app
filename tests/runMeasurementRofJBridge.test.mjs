import fs from 'node:fs';
import assert from 'node:assert/strict';

const screen = fs.readFileSync('screens/runMeasurementScreen.js', 'utf8');
const interactions = fs.readFileSync('ui/interactions/runMeasurementInteractions.js', 'utf8');
const state = fs.readFileSync('ui/runMeasurementState.js', 'utf8');
const css = fs.readFileSync('styles/rof-j-compact.css', 'utf8');

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', message: String(error?.stack || error) }); }
}

test('SMARTPHONE-MEASUREMENT-HAS-OPTIONAL-PRE-RUN-FATIGUE', () => {
  assert.ok(screen.includes('data-measurement-pre-fatigue'));
  assert.ok(screen.includes('走る前の疲労感'));
  assert.ok(screen.includes('data-measurement-fatigue-slider'));
  assert.ok(screen.includes('触れなければ記録せず'));
  assert.ok(css.includes('.run-measurement__fatigue'));
  assert.ok(css.includes('@media (max-width: 54.99rem)'));
});

test('PRE-RUN-FATIGUE-IS-LINKED-ONLY-WHEN-TOUCHED', () => {
  assert.ok(interactions.includes('let fatigueTouched = false'));
  assert.ok(interactions.includes('if (!fatigueTouched || !services?.fatigue)'));
  assert.ok(interactions.includes('capturePreDirect'));
  assert.ok(interactions.includes('markRunStart'));
  assert.ok(interactions.includes('markRunEnd'));
});

test('MEASUREMENT-HANDOFF-CARRIES-RUN-ID', () => {
  assert.ok(state.includes('runId: String(payload.runId || "")'));
  assert.ok(interactions.includes('runId: fatigueRunId'));
  assert.ok(interactions.includes('parameters.runId = fatigueRunId'));
});

test('CANCEL-CLEANS-UP-UNSAVED-ROF-LIFECYCLE', () => {
  assert.ok(interactions.includes('lifecycle?.removeState?.(fatigueRunId)'));
  assert.ok(interactions.includes('repository?.removeByRunId?.(fatigueRunId)'));
  assert.ok(interactions.includes('discardFatigueLink();'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Run Measurement ROF-J Bridge', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);

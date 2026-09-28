import fs from 'node:fs';
import assert from 'node:assert/strict';

const screen = fs.readFileSync('screens/runMeasurementScreen.js', 'utf8');
const interactions = fs.readFileSync('ui/interactions/runMeasurementInteractions.js', 'utf8');
const state = fs.readFileSync('ui/runMeasurementState.js', 'utf8');
const enhancer = fs.readFileSync('ui/rofJVisualEnhancement.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const measurementCss = fs.readFileSync('styles/mobile-run-measurement-v2.css', 'utf8');

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', message: String(error?.stack || error) }); }
}

test('MEASUREMENT-IS-SMARTPHONE-SPECIFIC', () => {
  assert.ok(screen.includes('matchesMobileLayout()'));
  assert.ok(screen.includes('desktopUnavailable()'));
  assert.ok(screen.includes('ランニング測定はスマホ版の機能です'));
  assert.ok(screen.includes('if (!matchesMobileLayout()) return desktopUnavailable();'));
});

test('PREP-ACTIVE-POST-PHASES-ARE-SEPARATE', () => {
  assert.ok(screen.includes('data-measurement-prep'));
  assert.ok(screen.includes('data-measurement-active hidden'));
  assert.ok(screen.includes('data-measurement-post hidden'));
  assert.ok(interactions.includes('showPhase("active")'));
  assert.ok(interactions.includes('showPhase("post")'));
});

test('FREE-TIME-DISTANCE-MODES-ARE-AVAILABLE', () => {
  assert.ok(screen.includes('value="free" checked'));
  assert.ok(screen.includes('value="time"'));
  assert.ok(screen.includes('value="distance"'));
  assert.ok(screen.includes('data-measurement-target-minutes'));
  assert.ok(screen.includes('data-measurement-target-distance'));
  assert.ok(interactions.includes('measurementMode === "time"'));
  assert.ok(interactions.includes('measurementMode === "distance"'));
});

test('TIME-MODE-HAS-COUNTDOWN-AND-DISTANCE-MODE-HAS-REMAINING-DISTANCE', () => {
  assert.ok(interactions.includes('const remaining = Math.max(0, total - elapsed)'));
  assert.ok(interactions.includes('primaryLabel.textContent = "残り時間"'));
  assert.ok(interactions.includes('formatElapsed(remaining)'));
  assert.ok(interactions.includes('primaryLabel.textContent = "残り距離"'));
  assert.ok(interactions.includes('remaining.toFixed(2)'));
  assert.ok(interactions.includes('reachGoal()'));
  assert.ok(screen.includes('そのまま続ける'));
});

test('PAUSE-EXCLUDES-PAUSED-TIME-AND-PREVENTS-GPS-JUMP', () => {
  assert.ok(interactions.includes('pausedTotalMs'));
  assert.ok(interactions.includes('pausedAtMs'));
  assert.ok(interactions.includes('endpoint - startedAtMs - pausedTotalMs'));
  assert.ok(interactions.includes('stopWatch();'));
  assert.ok(interactions.includes('lastAcceptedPoint = null;'));
  assert.ok(screen.includes('一時停止'));
});

test('MEASUREMENT-USES-SAME-ROF-PANEL-CONTRACT-AS-RECORD-INPUT', () => {
  assert.ok(screen.includes('function fatigueScaleMarkup(phase)'));
  assert.ok(screen.includes('class="rof-scale-panel"'));
  assert.ok(screen.includes('data-record-rof-slider'));
  assert.ok(screen.includes('data-record-rof-value'));
  assert.ok(screen.includes('data-record-rof-anchor'));
  assert.ok(screen.includes('data-rof-context'));
  assert.ok(screen.includes('fatigueScaleMarkup("before")'));
  assert.ok(screen.includes('fatigueScaleMarkup("after")'));
  assert.ok(enhancer.includes('panel.closest("[data-rof-context], .rof-sheet")'));
  assert.ok(enhancer.includes('pointerdown'));
});

test('ROF-LIFECYCLE-REMAINS-OPTIONAL-AND-SEPARATE', () => {
  assert.ok(interactions.includes('if (!beforeFatigue?.hasSelection() || !services?.fatigue)'));
  assert.ok(interactions.includes('capturePreDirect'));
  assert.ok(interactions.includes('markRunStart'));
  assert.ok(interactions.includes('markRunEnd'));
  assert.ok(interactions.includes('capturePostDirect'));
  assert.ok(interactions.includes('skip-post-fatigue'));
  assert.ok(!interactions.includes('Reference-100'));
  assert.ok(!interactions.includes('readiness'));
});

test('MEASUREMENT-MODE-METADATA-IS-PRESERVED-SEPARATELY', () => {
  assert.ok(state.includes('measurementMode: normalizeMode(payload.measurementMode)'));
  assert.ok(state.includes('targetDurationMinutes: positiveNumberOrNull(payload.targetDurationMinutes)'));
  assert.ok(state.includes('targetDistanceKm: positiveNumberOrNull(payload.targetDistanceKm)'));
  assert.ok(interactions.includes('measurementMode,'));
  assert.ok(interactions.includes('targetDurationMinutes,'));
  assert.ok(interactions.includes('targetDistanceKm,'));
});

test('CANCEL-CLEANS-UP-UNSAVED-MEASUREMENT-AND-ROF', () => {
  assert.ok(interactions.includes('clearPendingRunMeasurement();'));
  assert.ok(interactions.includes('lifecycle?.removeState?.(fatigueRunId)'));
  assert.ok(interactions.includes('repository?.removeByRunId?.(fatigueRunId)'));
  assert.ok(interactions.includes('discardFatigueLink();'));
});

test('MOBILE-MEASUREMENT-V2-STYLES-ARE-LOADED-AND-PRECACHED', () => {
  assert.ok(index.includes('./styles/mobile-run-measurement-v2.css'));
  assert.ok(worker.includes('"./styles/mobile-run-measurement-v2.css"'));
  assert.ok(measurementCss.includes('.run-measurement-prep'));
  assert.ok(measurementCss.includes('.run-measurement-active'));
  assert.ok(measurementCss.includes('.run-measurement-post'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Run Measurement V2', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);

import fs from 'node:fs';
import assert from 'node:assert/strict';

const screen = fs.readFileSync('screens/mobile/runMeasurementScreen.js', 'utf8');
const registry = fs.readFileSync('screens/screenRegistry.js', 'utf8');
const interactions = fs.readFileSync('ui/interactions/runMeasurementInteractions.js', 'utf8');
const state = fs.readFileSync('ui/runMeasurementState.js', 'utf8');
const energy = fs.readFileSync('ui/runMeasurementEnergy.js', 'utf8');
const enhancer = fs.readFileSync('ui/rofJPresentation.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const measurementCss = fs.readFileSync('styles/mobile-run-measurement.css', 'utf8');
const ergonomicsCss = fs.readFileSync('styles/mobile-run-measurement-ergonomics.css', 'utf8');

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', message: String(error?.stack || error) }); }
}

test('MEASUREMENT-IS-SMARTPHONE-SPECIFIC', () => {
  const sharedRegistry = registry.slice(registry.indexOf('export const SHARED_SCREEN_RENDERERS'), registry.indexOf('export const DESKTOP_SCREEN_RENDERERS'));
  const desktopRegistry = registry.slice(registry.indexOf('export const DESKTOP_SCREEN_RENDERERS'), registry.indexOf('export const MOBILE_SCREEN_RENDERERS'));
  const mobileRegistry = registry.slice(registry.indexOf('export const MOBILE_SCREEN_RENDERERS'), registry.indexOf('export function createScreenRenderers'));
  assert.ok(!sharedRegistry.includes('run-measurement'));
  assert.ok(!desktopRegistry.includes('run-measurement'));
  assert.ok(mobileRegistry.includes('"run-measurement": renderRunMeasurementScreen'));
  assert.ok(!screen.includes('matchesMobileLayout'));
  assert.ok(!screen.includes('desktopUnavailable'));
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

test('TIME-AND-DISTANCE-TARGETS-START-BLANK', () => {
  assert.ok(screen.includes('value="" placeholder="例：30" data-measurement-target-minutes'));
  assert.ok(screen.includes('value="" placeholder="例：5.0" data-measurement-target-distance'));
  assert.ok(screen.includes('data-target-minutes-preset="${value}"'));
  assert.ok(screen.includes('[20,30,45,60]'));
  assert.ok(screen.includes('data-target-distance-preset="${value}"'));
  assert.ok(screen.includes('[1,3,5,10]'));
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

test('FINISH-DISTANCE-GUARD-IS-EXPLICIT-IN-UI', () => {
  assert.ok(interactions.includes('distanceM >= 10'));
  assert.ok(interactions.includes('まだ十分な移動距離を取得できていません'));
  assert.ok(screen.includes('終了にはGPSで10m以上の移動取得が必要です。'));
  assert.ok(ergonomicsCss.includes('.run-measurement-active__controls .run-measurement__status.is-error'));
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

test('MEASUREMENT-ROF-LAYOUT-HAS-DEDICATED-MOBILE-CORRECTIONS', () => {
  assert.ok(index.includes('./styles/mobile-run-measurement-ergonomics.css'));
  assert.ok(worker.includes('"./styles/mobile-run-measurement-ergonomics.css"'));
  assert.ok(ergonomicsCss.includes('.run-measurement-fatigue .rof-current'));
  assert.ok(ergonomicsCss.includes('grid-template-columns: auto 42px minmax(0, 1fr);'));
  assert.ok(ergonomicsCss.includes('.run-measurement-fatigue .rof-ticks'));
  assert.ok(ergonomicsCss.includes('grid-template-columns: repeat(11, minmax(0, 1fr));'));
  assert.ok(ergonomicsCss.includes('.run-measurement-prep__start'));
  assert.ok(ergonomicsCss.includes('position: static;'));
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

test('ESTIMATED-ENERGY-IS-SMARTPHONE-MEASUREMENT-ONLY', () => {
  assert.ok(screen.includes('data-measurement-energy-value'));
  assert.ok(screen.includes('data-measurement-post-energy'));
  assert.ok(screen.includes('推定消費エネルギー'));
  assert.ok(interactions.includes('estimateRunningEnergy'));
  assert.ok(interactions.includes('services.storage.profile.load()'));
  assert.ok(interactions.includes('energyBodyMassKg = Number(profile?.weightKg)'));
  assert.ok(interactions.includes('energyEstimate: energyEstimate.ok ? energyEstimate : null'));
  assert.ok(ergonomicsCss.includes('.run-measurement-energy'));
});

test('LIVE-ENERGY-IS-LABELED-AS-PROVISIONAL-CONTINUOUS-RUN-ESTIMATE', () => {
  assert.ok(interactions.includes('連続して走った場合として仮推定しています。走り＋歩きの記録には保存しません。'));
  assert.ok(state.includes('keepContinuousRunEnergy'));
  assert.ok(state.includes('runningFormat === "CONTINUOUS_RUN"'));
});

test('ENERGY-MODEL-USES-CONTROLLED-COMPENDIUM-BOUNDARY', () => {
  assert.ok(energy.includes('adult-compendium-2024-running-speed-v1'));
  assert.ok(energy.includes('MET × 3.5 × body mass (kg) ÷ 200'));
  assert.ok(energy.includes('BODY_MASS_UNAVAILABLE'));
  assert.ok(energy.includes('GPS_DISTANCE_INSUFFICIENT'));
  assert.ok(energy.includes('SPEED_OUT_OF_SUPPORTED_RANGE'));
  assert.ok(!energy.includes('heightCm'));
  assert.ok(worker.includes('"./ui/runMeasurementEnergy.js"'));
});

test('ENERGY-METADATA-IS-PRESERVED-SEPARATELY', () => {
  assert.ok(state.includes('function normalizeEnergyEstimate(value)'));
  assert.ok(state.includes('energyEstimate: normalizeEnergyEstimate(payload.energyEstimate)'));
  assert.ok(state.includes('energyEstimate: keepContinuousRunEnergy ? normalizeEnergyEstimate(pending.energyEstimate) : null'));
  assert.ok(!energy.includes('ROF_J'));
  assert.ok(!energy.includes('Reference-100'));
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

test('MOBILE-MEASUREMENT-STYLES-ARE-CANONICAL-LOADED-AND-PRECACHED', () => {
  assert.ok(index.includes('./styles/mobile-run-measurement.css'));
  assert.ok(worker.includes('"./styles/mobile-run-measurement.css"'));
  assert.ok(screen.includes('run-measurement--mobile'));
  assert.ok(!screen.includes('run-measurement--v2'));
  assert.ok(measurementCss.includes('.run-measurement-prep'));
  assert.ok(measurementCss.includes('.run-measurement-active'));
  assert.ok(measurementCss.includes('.run-measurement-post'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Run Measurement', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);

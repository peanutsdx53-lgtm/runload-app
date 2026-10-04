import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculatePaceSummary, formatSecondsPerKm, formatPaceDuration } from '../ui/interactions/mobilePaceCalculatorInteractions.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const results = [];

async function test(id, fn) {
  try {
    await fn();
    results.push({ id, status: 'PASS' });
  } catch (error) {
    results.push({ id, status: 'FAIL', message: error?.stack || String(error) });
  }
}

await test('PACE-TOOL-IS-OPTIONAL-EMOJI-HOME-APP', () => {
  const home = read('screens/homeScreen.js');
  const interactions = read('ui/interactions/homeInteractions.js');
  assert.ok(home.includes('href: "#/pace-tool"'));
  assert.ok(home.includes('label: "ペース換算"'));
  assert.ok(home.includes('emoji: "🧮"'));
  assert.ok(interactions.includes('id: "pace-tool"'));
  assert.ok(interactions.includes('["#/pace-tool", "pace-tool"]'));
});

await test('PACE-TOOL-HAS-ROUTE-BINDER-AND-HOME-NAVIGATION', () => {
  const registry = read('screens/screenRegistry.js');
  const binders = read('ui/screenInteractions.js');
  const architecture = read('ui/screenArchitecture.js');
  assert.ok(registry.includes('renderPaceCalculatorScreen'));
  assert.ok(registry.includes('"pace-tool": renderPaceCalculatorScreen'));
  assert.ok(binders.includes('bindMobilePaceCalculator'));
  assert.ok(binders.includes('"pace-tool": bindMobilePaceCalculator'));
  assert.ok(architecture.includes('screen === "pace-tool"'));
  assert.ok(architecture.includes('function mobileUtilityReturn()'));
  assert.ok(architecture.includes('return { backHref: "#/home", backLabel: "ホーム" };'));
  assert.ok(architecture.includes('if (screen === "pace-tool") return { title: "ペース換算", ...mobileUtilityReturn() };'));
});

await test('PACE-TOOL-5KM-35MIN-CALCULATION-IS-EXACT', () => {
  const summary = calculatePaceSummary(5, 35 * 60);
  assert.ok(summary);
  assert.equal(summary.secondsPerKm, 420);
  assert.equal(formatSecondsPerKm(summary.secondsPerKm), '7:00');
  assert.equal(summary.speedKmh.toFixed(1), '8.6');
  assert.deepEqual([...summary.splitPoints], [1, 2, 3, 4, 5]);
  assert.equal(formatPaceDuration(summary.totalSeconds), '35:00');
});

await test('PACE-TOOL-CALCULATES-LOCALLY-WITHOUT-STORAGE-OR-NETWORK', () => {
  const interactions = read('ui/interactions/mobilePaceCalculatorInteractions.js');
  assert.ok(interactions.includes('const secondsPerKm = duration / distance'));
  assert.ok(interactions.includes('speedKmh: distance / (duration / 3600)'));
  assert.ok(interactions.includes('paceSplitPoints(distance)'));
  assert.ok(!interactions.includes('localStorage'));
  assert.ok(!interactions.includes('indexedDB'));
  assert.ok(!interactions.includes('fetch('));
  assert.ok(!interactions.includes('XMLHttpRequest'));
});

await test('PACE-TOOL-SCREEN-HAS-PRESETS-AND-RESEARCH-BOUNDARY', () => {
  const screen = read('screens/mobilePaceCalculatorScreen.js');
  for (const value of ['3', '5', '10', '21.0975']) assert.ok(screen.includes(`data-pace-distance="${value}"`));
  assert.ok(screen.includes('記録や研究計算には自動反映しません。'));
});

await test('PACE-TOOL-MOBILE-STYLES-AND-PWA-ASSETS-ARE-REGISTERED', () => {
  const index = read('index.html');
  const sw = read('service-worker.js');
  const css = read('styles/mobile-pace-calculator.css');
  assert.ok(index.includes('./styles/mobile-pace-calculator.css'));
  for (const asset of [
    './screens/mobilePaceCalculatorScreen.js',
    './styles/mobile-pace-calculator.css',
    './ui/interactions/mobilePaceCalculatorInteractions.js',
  ]) assert.ok(sw.includes(asset));
  assert.ok(css.includes('@media (max-width: 54.99rem)'));
});

const failed = results.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  suite: 'Mobile Pace Calculator',
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'FAIL' : 'PASS',
  results,
}, null, 2));
if (failed.length) process.exitCode = 1;

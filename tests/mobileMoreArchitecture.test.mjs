import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

await test('MOBILE-MORE-IS-NOT-A-FEATURE-LAUNCHER', () => {
  const more = read('screens/moreScreen.js');
  assert.ok(more.includes('スマホ版の機能は、ホームのアイコンまたは関連する画面から利用します。'));
  assert.ok(more.includes('ホームに機能を追加'));
  assert.ok(more.includes('ホームで「編集」→「＋」から選択'));
  for (const route of ['achievements', 'location-note', 'quick-note', 'gear-note', 'departure-check', 'fuel-note', 'photo-note', 'pace-tool']) {
    assert.ok(!more.includes(`screen: "${route}"`), `mobile More should not directly launch ${route}`);
  }
});

await test('SMARTPHONE-FEATURES-REMAIN-AVAILABLE-FROM-HOME-OR-CONTEXT', () => {
  const home = read('screens/homeScreen.js');
  const consultation = read('screens/consultationScreen.js');
  for (const route of ['location-note', 'quick-note', 'gear-note', 'departure-check', 'fuel-note', 'photo-note', 'pace-tool']) {
    assert.ok(home.includes(`href: "#/${route}"`), `missing optional Home app ${route}`);
  }
  for (const route of ['reading?origin=home', 'consultation?from=home', 'settings?from=home']) {
    assert.ok(home.includes(`href: "#/${route}"`), `missing standard Home app ${route}`);
  }
  assert.ok(home.includes('href="#/achievements"'));
  assert.ok(consultation.includes('href="#/support-guidance?recordId='));
  assert.ok(consultation.includes('returnTo=${encodeURIComponent(selfHref)}'));
});

await test('ACHIEVEMENTS-RETURN-TO-HOME', () => {
  const architecture = read('ui/screenArchitecture.js');
  assert.ok(architecture.includes('if (screen === "achievements") return { title: "実績", backHref: "#/home", backLabel: "ホーム" };'));
  assert.ok(!architecture.includes('if (screen === "achievements") return { title: "実績", backHref: "#/more", backLabel: "その他" };'));
});

await test('MOBILE-MORE-KEEPS-ONLY-APP-INFORMATION', () => {
  const more = read('screens/moreScreen.js');
  for (const route of ['about', 'terms', 'privacy']) assert.ok(more.includes(`screen: "${route}"`));
  assert.ok(!more.includes('const MOBILE_GROUPS'));
  assert.ok(!more.includes('MORE_ORIGIN_SCREENS'));
});

await test('VERSION-AND-PWA-CACHE-MATCH-V36', () => {
  const version = read('ui/appVersionStatus.js');
  const sw = read('service-worker.js');
  const about = read('screens/aboutScreen.js');
  assert.ok(version.includes('APP_VERSION = "2026.10.01.36"'));
  assert.ok(sw.includes('running-record-app-runtime-2026.10.01.36'));
  assert.ok(about.includes('v2026.10.01.36'));
});

const failed = results.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  suite: 'Mobile More Architecture v36',
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'FAIL' : 'PASS',
  results,
}, null, 2));
if (failed.length) process.exitCode = 1;

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

await test('MOBILE-QUICK-TOOLS-ARE-OPTIONAL-HOME-APPS', () => {
  const home = read('screens/homeScreen.js');
  const interactions = read('ui/interactions/homeInteractions.js');
  assert.ok(home.includes('data-home-app-catalog'));
  assert.ok(home.includes('href: "#/location-note"'));
  assert.ok(home.includes('href: "#/quick-note"'));
  assert.ok(home.includes('href: "#/gear-note"'));
  assert.ok(home.includes('href: "#/departure-check"'));
  assert.ok(home.includes('href: "#/fuel-note"'));
  assert.ok(home.includes('emoji: "📍"'));
  assert.ok(home.includes('emoji: "📝"'));
  assert.ok(home.includes('emoji: "🎒"'));
  assert.ok(home.includes('emoji: "✅"'));
  assert.ok(home.includes('emoji: "💧"'));
  for (const emoji of ['⚖️', '📅', '📖', '📤', '⚙️', '📒', '⏱️', '🕘', '🗺️']) assert.ok(home.includes(`emoji: "${emoji}"`));
  assert.ok(!home.includes('function mobileHomeIcon'));
  assert.ok(!home.includes('<svg viewBox="0 0 24 24"'));
  assert.ok(interactions.includes('OPTIONAL_APP_CATALOG'));
  assert.ok(interactions.includes('data-home-app-add-id'));
  assert.ok(interactions.includes('removeOptionalApp'));
});

await test('MOBILE-QUICK-TOOLS-PICKER-SHOWS-REAL-APP-ICONS', () => {
  const interactions = read('ui/interactions/homeInteractions.js');
  const css = read('styles/mobile-home-editing.css');
  assert.ok(interactions.includes('function appPickerIconMarkup'));
  assert.ok(interactions.includes('.mobile-home-app__icon'));
  assert.ok(interactions.includes('mobile-home-widget-picker__option--app'));
  assert.ok(interactions.includes('mobile-home-widget-picker__option--widget'));
  assert.ok(css.includes('.mobile-home-widget-picker__app-icon .mobile-home-emoji'));
  assert.ok(css.includes('.mobile-home-widget-picker__option--app'));
  assert.ok(css.includes('.mobile-home-widget-picker__option.mobile-home-widget-picker__option--app > b'));
  assert.ok(read('styles/mobile-home.css').includes('.mobile-home-emoji'));
});

await test('MOBILE-QUICK-TOOLS-PRESERVE-REQUIRED-HOME-LAYOUT', () => {
  const interactions = read('ui/interactions/homeInteractions.js');
  assert.ok(interactions.includes('const REQUIRED_ITEM_IDS'));
  assert.ok(interactions.includes('REQUIRED_ITEM_IDS.every'));
  assert.ok(interactions.includes('OPTIONAL_ITEM_IDS'));
});

await test('MOBILE-QUICK-TOOLS-HAVE-ROUTES-AND-HOME-BACK-NAVIGATION', () => {
  const app = read('app.js');
  const architecture = read('ui/screenArchitecture.js');
  const binders = read('ui/screenInteractions.js');
  for (const route of ['location-note', 'quick-note', 'gear-note', 'departure-check', 'fuel-note']) {
    assert.ok(app.includes(`"${route}":`));
    assert.ok(binders.includes(`"${route}": bindMobileQuickTool`));
    assert.ok(architecture.includes(`screen === "${route}"`));
  }
  assert.ok(architecture.includes('backHref: "#/home", backLabel: "ホーム"'));
});

await test('MOBILE-QUICK-TOOLS-STORE-IS-LOCAL-ONLY', () => {
  const store = read('ui/mobileQuickToolsStore.js');
  assert.ok(store.includes('running-record-mobile-quick-tools-v1'));
  assert.ok(store.includes('localStorage'));
  assert.ok(!store.includes('fetch('));
  assert.ok(!store.includes('XMLHttpRequest'));
});

await test('MOBILE-QUICK-TOOLS-SCREENS-COVER-THREE-TOOLS', () => {
  const screens = read('screens/mobileQuickToolsScreen.js');
  assert.ok(screens.includes('export function renderLocationNoteScreen'));
  assert.ok(screens.includes('export function renderQuickNoteScreen'));
  assert.ok(screens.includes('export function renderGearNoteScreen'));
  assert.ok(screens.includes('export function renderDepartureCheckScreen'));
  assert.ok(screens.includes('export function renderFuelNoteScreen'));
  assert.ok(screens.includes('この端末のブラウザ内に保存します。自動送信はしません。'));
});

await test('MOBILE-QUICK-TOOLS-PWA-ASSETS-ARE-PRECACHED', () => {
  const sw = read('service-worker.js');
  for (const asset of [
    './screens/mobileQuickToolsScreen.js',
    './styles/mobile-quick-tools.css',
    './ui/interactions/mobileQuickToolsInteractions.js',
    './ui/mobileQuickToolsStore.js',
  ]) assert.ok(sw.includes(asset));
});

await test('MOBILE-QUICK-TOOLS-STYLE-IS-MOBILE-FIRST', () => {
  const index = read('index.html');
  const css = read('styles/mobile-quick-tools.css');
  assert.ok(index.includes('./styles/mobile-quick-tools.css'));
  assert.ok(css.includes('@media (max-width: 54.99rem)'));
  assert.ok(css.includes('.mobile-home-app-catalog'));
  assert.ok(css.includes('.mobile-home-app-remove'));
});

const failed = results.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  suite: 'Mobile Quick Tools',
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'FAIL' : 'PASS',
  results,
}, null, 2));
if (failed.length) process.exitCode = 1;

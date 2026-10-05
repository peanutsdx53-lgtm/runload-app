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
  const home = read('screens/mobile/homeScreen.js');
  const interactions = read('ui/interactions/homeInteractions.js');
  const homeLayout = read('ui/interactions/homeLayoutState.js');
  const homeEdit = read('ui/interactions/homeEditPresentation.js');
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
  assert.ok(homeLayout.includes('HOME_APP_CATALOG'));
  assert.ok(homeEdit.includes('data-home-app-add-id'));
  assert.ok(interactions.includes('removeHomeApp'));
});

await test('MOBILE-QUICK-TOOLS-PICKER-SHOWS-REAL-APP-ICONS', () => {
  const homeEdit = read('ui/interactions/homeEditPresentation.js');
  const css = read('styles/mobile-home-editing.css');
  assert.ok(homeEdit.includes('function appPickerIconMarkup'));
  assert.ok(homeEdit.includes('.mobile-home-app__icon'));
  assert.ok(homeEdit.includes('mobile-home-widget-picker__option--app'));
  assert.ok(homeEdit.includes('mobile-home-widget-picker__option--widget'));
  assert.ok(css.includes('.mobile-home-widget-picker__app-icon .mobile-home-emoji'));
  assert.ok(css.includes('.mobile-home-widget-picker__option--app'));
  assert.ok(css.includes('.mobile-home-widget-picker__option--app > .mobile-home-widget-picker__add'));
  assert.ok(homeEdit.includes('<div class="mobile-home-widget-picker__option mobile-home-widget-picker__option--app">'));
  assert.ok(homeEdit.includes('class="mobile-home-widget-picker__add" data-home-app-add-id='));
  assert.ok(read('styles/mobile-home.css').includes('.mobile-home-emoji'));
});

await test('MOBILE-HOME-ALL-APP-LAUNCHERS-ARE-REMOVABLE-AND-RESTORABLE', () => {
  const home = read('screens/mobile/homeScreen.js');
  const interactions = read('ui/interactions/homeInteractions.js');
  const homeLayout = read('ui/interactions/homeLayoutState.js');
  const css = read('styles/mobile-quick-tools.css');
  assert.ok(homeLayout.includes('export const HOME_APP_CATALOG'));
  for (const id of ['simulation', 'plan', 'reading', 'share', 'settings', 'record', 'measure', 'history', 'course', 'pace-tool']) {
    assert.ok(homeLayout.includes(`id: "${id}"`), `missing app catalog entry ${id}`);
  }
  assert.ok(interactions.includes('function removeHomeApp(id)'));
  assert.ok(interactions.includes('function addHomeApp(id)'));
  assert.ok(homeLayout.includes('dock.length > DEFAULT_LAYOUT.dock.length'));
  assert.ok(!homeLayout.includes('REQUIRED_ITEM_IDS.every'));
  assert.ok(home.includes('data-home-app-remove'));
  assert.ok(css.includes('.mobile-home-os.is-home-editing .mobile-home-app-remove'));
});

await test('MOBILE-HOME-NESTED-LAUNCH-LINK-SUPPRESSES-IOS-LINK-CALLOUT', () => {
  const home = read('screens/mobile/homeScreen.js');
  const interactions = read('ui/interactions/homeInteractions.js');
  const css = read('styles/mobile-quick-tools.css');
  assert.ok(home.includes('class="mobile-home-app__launch"'));
  assert.ok(css.includes('.mobile-home-app__launch'));
  assert.ok(css.includes('-webkit-touch-callout: none !important'));
  assert.ok(home.includes('data-home-launch data-home-href='));
  assert.ok(home.includes('role=\"link\" tabindex=\"0\"'));
  assert.ok(!home.includes('<a class=\"mobile-home-app__launch\"'));
  assert.ok(interactions.includes('function openHomeLauncher(launcher)'));
  assert.ok(interactions.includes('globalThis.location.replace(href)'));
  assert.equal(interactions.includes('globalThis.location.hash = href.slice(1)'), false);
});

await test('MOBILE-QUICK-TOOLS-HAVE-ROUTES-AND-HOME-BACK-NAVIGATION', () => {
  const registry = read('screens/mobileScreenRegistry.js');
  const architecture = read('ui/screenArchitecture.js');
  const binders = read('ui/mobileScreenInteractionBinders.js');
  for (const route of ['location-note', 'quick-note', 'gear-note', 'departure-check', 'fuel-note']) {
    assert.ok(registry.includes(`"${route}":`));
    assert.ok(binders.includes(`"${route}": bindMobileQuickTool`));
    assert.ok(architecture.includes(`screen === "${route}"`));
  }
  assert.ok(architecture.includes('backHref: "#/home", backLabel: "ホーム"'));
});

await test('MOBILE-QUICK-TOOLS-STORE-IS-LOCAL-ONLY', () => {
  const store = read('ui/mobileQuickToolsStore.js');
  const storage = read('ui/mobileStorageUtilities.js');
  assert.ok(store.includes('running-record-mobile-quick-tools-v1'));
  assert.ok(store.includes('writeMobileLocalJson'));
  assert.ok(storage.includes('localStorage'));
  assert.ok(!store.includes('fetch('));
  assert.ok(!store.includes('XMLHttpRequest'));
});

await test('MOBILE-QUICK-TOOLS-SCREENS-COVER-THREE-TOOLS', () => {
  const screens = read('screens/mobile/quickToolsScreen.js');
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
    './screens/mobile/quickToolsScreen.js',
    './styles/mobile-quick-tools.css',
    './ui/interactions/mobileQuickToolsInteractions.js',
    './ui/mobileQuickToolsStore.js',
  ]) assert.ok(sw.includes(asset));
});

await test('MOBILE-QUICK-TOOLS-STYLE-IS-MOBILE-FIRST', () => {
  const index = read('index.html');
const platformStyles = read('ui/platformStyles.js');
  const css = read('styles/mobile-quick-tools.css');
  assert.ok(platformStyles.includes('./styles/mobile-quick-tools.css'));
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

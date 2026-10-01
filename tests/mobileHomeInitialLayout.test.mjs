import fs from 'node:fs';
import assert from 'node:assert/strict';

const home = fs.readFileSync('ui/interactions/homeInteractions.js', 'utf8');
const gridModel = fs.readFileSync('ui/interactions/homeGridModel.js', 'utf8');
const guard = fs.readFileSync('ui/mobileHomeInitialLayoutV32.js', 'utf8');
const capacity = fs.readFileSync('ui/mobileHomePageCapacity.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const versionModule = fs.readFileSync('ui/appVersionStatus.js', 'utf8');

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', message: String(error?.stack || error) }); }
}

test('HOME-GRID-REMAINS-HARD-CAPPED-AT-THREE-ROWS', () => {
  assert.match(gridModel, /HOME_MAX_ROWS = 3/);
  assert.match(guard, /grid\.style\.setProperty\("--home-grid-rows", "3"\)/);
  assert.doesNotMatch(guard, /--home-grid-rows", "4"/);
});

test('FIRST-RUN-CANONICAL-LAYOUT-FITS-EXACTLY-IN-THREE-ROWS', () => {
  assert.match(guard, /DEFAULT_HOME_APPS = Object\.freeze\(\["simulation", "plan", "reading", "settings"\]\)/);
  assert.match(guard, /CURRENT_VISIBLE_WIDGETS = Object\.freeze\(\["today", "plan", "changes"\]\)/);
  assert.match(guard, /applyPlacement\(today, 1, 1, 4, 1\)/);
  assert.match(guard, /applyPlacement\(primary, 2, 1, 2, 1\)/);
  assert.match(guard, /applyPlacement\(secondary, 2, 3, 2, 1\)/);
  assert.match(guard, /applyPlacement\(item, 3, appPlacements\[id\], 1, 1\)/);
  assert.equal(4 + 2 + 2 + 4, 3 * 4);
});

test('SETTINGS-HAS-A-DEFINED-FIRST-RUN-CELL-AND-SHARE-MOVES-TO-CATALOG', () => {
  assert.match(guard, /settings: 4/);
  assert.match(guard, /moveAppToCatalog\(root, "share"\)/);
  assert.match(guard, /catalog\.append\(item\)/);
  assert.ok(home.includes('id: "share", label: "共有"'), 'Share must remain available in the app catalog');
});

test('DYNAMIC-CARDS-ARE-NORMALIZED-INTO-TWO-STABLE-WIDGET-SLOTS', () => {
  assert.match(guard, /PRIMARY_WIDGET_SLOTS = Object\.freeze\(\["plan", "changes"\]\)/);
  assert.match(guard, /\.mobile-home-widget\[data-dynamic-widget\]/);
  assert.match(guard, /shell\.dataset\.homeWidgetId = id/);
  assert.match(guard, /shell\.dataset\.homeWidgetSize = "small"/);
  assert.match(guard, /repairRawDynamicCards\(root\)/);
});

test('LEGACY-GENERATED-DEFAULT-IS-MIGRATED-WITHOUT-RESETTING-CUSTOM-LAYOUTS', () => {
  assert.match(guard, /storedStateLooksLikeGeneratedDefault/);
  assert.match(guard, /sameSet\(apps, LEGACY_HOME_APPS\) \|\| sameSet\(apps, DEFAULT_HOME_APPS\)/);
  assert.match(guard, /widgetStateLooksDefault/);
  assert.match(guard, /if \(storedStateLooksLikeGeneratedDefault\(\)\)/);
});

test('CAPACITY-GUARD-STILL-PROTECTS-CUSTOM-HOME-PAGES', () => {
  assert.ok(capacity.includes('const MAX_ROWS = 3;'));
  assert.ok(capacity.includes('function placeOverflowItem(root, element, token, startPage, sizes, visible)'));
  assert.ok(capacity.includes('while (pages.length < MAX_PAGES)'));
  assert.ok(capacity.includes('syncPassivePageIndicator(root);'));
});

test('RECONCILER-RUNS-BEFORE-CAPACITY-REPAIR', () => {
  const guardIndex = index.indexOf('./ui/mobileHomeInitialLayoutV32.js');
  const capacityIndex = index.indexOf('./ui/mobileHomePageCapacity.js');
  assert.ok(guardIndex >= 0 && capacityIndex > guardIndex);
});

test('VERSION-AND-PWA-CACHE-MATCH', () => {
  const version = versionModule.match(/APP_VERSION = "([^"]+)"/)?.[1] || '';
  assert.match(version, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
  assert.ok(worker.includes(`running-record-app-runtime-${version}`));
  assert.ok(worker.includes('"./ui/mobileHomeInitialLayoutV32.js"'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Home Initial Layout v32', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);

import fs from 'node:fs';
import assert from 'node:assert/strict';

const home = fs.readFileSync('ui/interactions/homeInteractions.js', 'utf8');
const capacity = fs.readFileSync('ui/mobileHomePageCapacity.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const versionModule = fs.readFileSync('ui/appVersionStatus.js', 'utf8');

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', message: String(error?.stack || error) }); }
}

test('DEFAULT-HOME-HAS-MORE-VISIBLE-CELLS-THAN-ONE-THREE-ROW-PAGE', () => {
  assert.ok(home.includes('pages: Object.freeze([Object.freeze(["simulation", "plan", "reading", "share", "settings"])])'));
  assert.ok(home.includes('today: "medium"'));
  assert.ok(home.includes('plan: "small"'));
  assert.ok(home.includes('changes: "small"'));
  // 4 + 2 + 2 widget cells + 5 app cells = 13 > 12 cells per page.
  assert.equal(4 + 2 + 2 + 5 > 3 * 4, true);
});

test('CAPACITY-GUARD-USES-ACTUAL-FIRST-RUN-WIDGET-SIZES', () => {
  assert.ok(capacity.includes('const DEFAULT_WIDGET_SIZES = Object.freeze({'));
  assert.ok(capacity.includes('today: "medium"'));
  assert.ok(capacity.includes('...DEFAULT_WIDGET_SIZES'));
  assert.ok(capacity.includes('...(stored.sizes && typeof stored.sizes === "object" ? stored.sizes : {})'));
});

test('OVERFLOW-CREATES-A-SECOND-PAGE-WITHOUT-ENTERING-EDIT-MODE', () => {
  assert.ok(capacity.includes('function createRepairPage(root)'));
  assert.ok(capacity.includes('track.append(page);'));
  assert.ok(capacity.includes('while (pages.length < MAX_PAGES)'));
  assert.ok(capacity.includes('const page = createRepairPage(root);'));
  assert.ok(capacity.includes('syncPassivePageIndicator(root);'));
  assert.ok(!capacity.includes('root.querySelector("[data-home-page-add]")?.click();'));
});

test('REPAIRED-PLACEMENT-IS-PERSISTED', () => {
  assert.ok(capacity.includes('persistDom(root);'));
  assert.ok(capacity.includes('POSITION_STORAGE_KEY'));
  assert.ok(capacity.includes('LAYOUT_STORAGE_KEY'));
});

test('VERSION-AND-PWA-CACHE-MATCH', () => {
  const version = versionModule.match(/APP_VERSION = "([^"]+)"/)?.[1] || '';
  assert.equal(version, '2026.09.29.9');
  assert.ok(worker.includes(`running-record-app-runtime-${version}`));
  assert.ok(worker.includes('"./ui/mobileHomePageCapacity.js"'));
});


test('POSITION-FALLBACK-PRESERVES-EXPLICIT-SLOTS-BEFORE-FILLING-MISSING-ONES', () => {
  const start = home.indexOf('function buildPositionLayoutFromDom');
  const end = home.indexOf('function readPositionLayout', start);
  const block = home.slice(start, end);
  assert.ok(block.includes('const explicitRow = Number(element.dataset.homeRow);'));
  assert.ok(block.includes('const explicitCol = Number(element.dataset.homeCol);'));
  assert.ok(block.includes('placementIsFree(placements, token, explicit'));
  assert.ok(block.includes('pending.forEach((token) =>'));
  assert.equal(block.includes('packTokens('), false);
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Mobile Home Initial Layout Capacity', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);

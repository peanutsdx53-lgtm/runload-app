import test from 'node:test';
import assert from 'node:assert/strict';
import { listMobileExtensionRecords, findMobileExtensionRecord, saveMobileExtensionRecord } from '../ui/mobileWalkJogRecordStore.js';
import { installMobileWalkJogHistoryUi } from '../ui/mobileWalkJogHistoryUi.js';

const KEY = 'runner-load-app-mobile-walk-jog-records-v1.3';
const good = { id: 'good-1', createdAt: '2026-10-10T00:00:00Z', activityId: 'WALK', distanceKm: 1.2, durationMinutes: 13, analysis: { segments: [] } };
function memoryStorage(raw) {
  const data = new Map([[KEY, raw]]);
  return { data, getItem(key) { return data.get(key) ?? null; }, setItem(key, value) { data.set(key, value); } };
}
function historyHarness(raw, hash) {
  const originals = { document: globalThis.document, window: globalThis.window, location: globalThis.location,
    localStorage: globalThis.localStorage, MutationObserver: globalThis.MutationObserver,
    queueMicrotask: globalThis.queueMicrotask };
  const storage = memoryStorage(raw);
  const pageHead = { classList: { contains: name => name === 'page-head' }, hidden: false, dataset: {} };
  const screen = { children: [pageHead], panel: null,
    querySelector(selector) {
      if (selector === ':scope > [data-mobile-activity-history]') return this.panel;
      if (selector === ':scope > .page-head') return pageHead;
      return null;
    },
    prepend(panel) { this.panel = panel; panel.parentElement = this; this.children.unshift(panel); },
  };
  pageHead.insertAdjacentElement = (_position, panel) => { screen.panel = panel; panel.parentElement = screen; screen.children.push(panel); };
  globalThis.document = { body: {}, querySelector: selector => selector === '.screen-layout--history' ? screen : null,
    createElement: tag => ({ tagName: tag, dataset: {}, className: '', classList: { contains: () => false }, parentElement: null, innerHTML: '', hidden: false }) };
  globalThis.window = { innerWidth: 390 };
  globalThis.location = { hash };
  globalThis.localStorage = storage;
  globalThis.MutationObserver = class { observe() {} disconnect() {} };
  // The real queued render executes synchronously so exceptions remain catchable.
  globalThis.queueMicrotask = fn => fn();
  return { storage, screen, restore() { for (const [key, value] of Object.entries(originals)) {
    if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
  } } };
}

test('G-01: finding a valid record after a null row is resilient and read-only', () => {
  const storage = memoryStorage(JSON.stringify([null, good]));
  const before = storage.getItem(KEY);
  assert.equal(findMobileExtensionRecord('good-1', storage)?.id, 'good-1');
  assert.equal(storage.getItem(KEY), before);
});

test('G-01: finding missing ID with null row is resilient', () => {
  const storage = memoryStorage(JSON.stringify([null, good]));
  assert.equal(findMobileExtensionRecord('missing', storage), null);
});

test('G-01: full mobile history survives mixed valid and null persisted rows', () => {
  const raw = JSON.stringify([null, good, null]);
  const h = historyHarness(raw, '#/history?mobileActivity=1');
  try {
    const uninstall = installMobileWalkJogHistoryUi();
    assert.match(h.screen.panel.innerHTML, /good-1/);
    assert.match(h.screen.panel.innerHTML, /活動別履歴/);
    assert.equal(h.storage.getItem(KEY), raw, 'rendering must never rewrite damaged storage');
    uninstall();
  } finally { h.restore(); }
});

test('G-01: full mobile history with only null entries displays empty state, preserves bytes', () => {
  const raw = '[null,null]';
  const h = historyHarness(raw, '#/history?mobileActivity=1');
  try {
    const uninstall = installMobileWalkJogHistoryUi();
    assert.match(h.screen.panel.innerHTML, /活動別記録はまだありません/);
    assert.equal(h.storage.getItem(KEY), raw);
    uninstall();
  } finally { h.restore(); }
});

test('G-01: detail route finds valid row after null without losing raw archive', () => {
  const raw = JSON.stringify([null, good]);
  const h = historyHarness(raw, '#/history?mobileActivity=1&mobileActivityRecordId=good-1');
  try {
    const uninstall = installMobileWalkJogHistoryUi();
    assert.match(h.screen.panel.innerHTML, /mobile-activity-history-detail/);
    assert.equal(h.storage.getItem(KEY), raw);
    uninstall();
  } finally { h.restore(); }
});

test('G-01: non-array invalid storage remains read-only and renders empty state', () => {
  const raw = '{"unexpected":true}';
  const h = historyHarness(raw, '#/history?mobileActivity=1');
  try {
    const uninstall = installMobileWalkJogHistoryUi();
    assert.match(h.screen.panel.innerHTML, /活動別記録はまだありません/);
    assert.equal(h.storage.getItem(KEY), raw);
    uninstall();
  } finally { h.restore(); }
});

test('G-01: list reader must not mutate malformed-but-parseable storage', () => {
  const raw = JSON.stringify([null, good, 123, 'legacy']);
  const storage = memoryStorage(raw);
  const list = listMobileExtensionRecords(storage);
  assert.equal(list.length, 4);
  assert.equal(storage.getItem(KEY), raw);
});


test('G-01: saving a new valid mixed record retains earlier null and valid entries', () => {
  const raw = JSON.stringify([null, good]);
  const storage = memoryStorage(raw);
  const saved = saveMobileExtensionRecord({
    analysis: { activityId: 'MIXED', segments: [{ gaitId: 'WALK', distanceKm: 0.3 }] },
    pending: { distanceKm: 0.3, durationMinutes: 5, saveRoute: false },
    storage,
  });
  assert.equal(saved.ok, true);
  const rows = JSON.parse(storage.getItem(KEY));
  assert.equal(rows.length, 3);
  assert.equal(rows[1], null, 'invalid legacy entry must not be silently deleted');
  assert.deepEqual(rows[2], good, 'existing valid record must be preserved');
});

test('G-01: malformed createdAt object must not crash full history or mutate raw storage', () => {
  const raw = JSON.stringify([{ id: 'bad-date', createdAt: { toString: null }, activityId: 'WALK' }, good]);
  const h = historyHarness(raw, '#/history?mobileActivity=1');
  try {
    const uninstall = installMobileWalkJogHistoryUi();
    assert.match(h.screen.panel.innerHTML, /good-1/);
    assert.equal((h.screen.panel.innerHTML.match(/class="mobile-activity-record-card"/g) || []).length, 1);
    assert.equal(h.storage.getItem(KEY), raw);
    uninstall();
  } finally { h.restore(); }
});

test('G-01: malformed activityId object must not crash compact history', () => {
  const raw = JSON.stringify([{ id: 'bad-label', createdAt: '2026-10-10T00:00:00Z', activityId: { toString: null } }, good]);
  const h = historyHarness(raw, '#/history');
  try {
    const uninstall = installMobileWalkJogHistoryUi();
    assert.match(h.screen.panel.innerHTML, /ウォーキング/);
    assert.equal(h.storage.getItem(KEY), raw);
    uninstall();
  } finally { h.restore(); }
});

test('G-01: empty object row must not produce phantom detail links', () => {
  const raw = JSON.stringify([{}, good]);
  const h = historyHarness(raw, '#/history?mobileActivity=1');
  try {
    const uninstall = installMobileWalkJogHistoryUi();
    assert.equal((h.screen.panel.innerHTML.match(/class="mobile-activity-record-card"/g) || []).length, 1);
    assert.equal(h.storage.getItem(KEY), raw);
    uninstall();
  } finally { h.restore(); }
});

test('G-01: malformed nested region label must not crash detail view or mutate raw storage', () => {
  const poisoned = { ...good, id: 'bad-region', analysis: { segments: [{ gaitId: 'WALK', coverage: { regions: [{ regionId: { toString: null }, index: 1 }] } }] } };
  const raw = JSON.stringify([poisoned, good]);
  const h = historyHarness(raw, '#/history?mobileActivity=1&mobileActivityRecordId=bad-region');
  try {
    const uninstall = installMobileWalkJogHistoryUi();
    assert.match(h.screen.panel.innerHTML, /活動別履歴/);
    assert.equal(h.storage.getItem(KEY), raw);
    uninstall();
  } finally { h.restore(); }
});

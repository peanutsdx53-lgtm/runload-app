import test from 'node:test';
import assert from 'node:assert/strict';
import { installMobileWalkJogHistoryUi } from '../ui/mobileWalkJogHistoryUi.js';

const KEY = 'runner-load-app-mobile-walk-jog-records-v1.3';
const record = (distanceKm) => ({
  id: 'fixed-id', createdAt: '2026-10-10T00:00:00Z', activityId: 'WALK',
  distanceKm, durationMinutes: 13, analysis: { segments: [] },
});
function harness(rows, hash = '#/history?mobileActivity=1') {
  const saved = new Map([[KEY, JSON.stringify(rows)]]);
  let writes = 0;
  const keys = ['document', 'window', 'location', 'localStorage', 'MutationObserver', 'queueMicrotask', 'addEventListener', 'removeEventListener'];
  const old = Object.fromEntries(keys.map(k => [k, globalThis[k]]));
  const listeners = new Map();
  const head = { classList: { contains: x => x === 'page-head' }, dataset: {}, hidden: false };
  const screen = {
    children: [head], panel: null,
    querySelector(selector) {
      return selector === ':scope > [data-mobile-activity-history]' ? this.panel :
        selector === ':scope > .page-head' ? head : null;
    },
    prepend(panel) { this.panel = panel; panel.parentElement = this; this.children.unshift(panel); },
  };
  head.insertAdjacentElement = (_position, panel) => {
    screen.panel = panel; panel.parentElement = screen; screen.children.push(panel);
  };
  globalThis.document = {
    body: {}, querySelector: selector => selector === '.screen-layout--history' ? screen : null,
    createElement: () => ({ dataset: {}, classList: { contains: () => false }, parentElement: null, innerHTML: '', hidden: false }),
  };
  globalThis.window = { innerWidth: 390 };
  globalThis.location = { hash };
  globalThis.localStorage = {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => { writes += 1; saved.set(key, value); },
  };
  globalThis.MutationObserver = class { observe() {} disconnect() {} };
  globalThis.queueMicrotask = fn => fn();
  globalThis.addEventListener = (name, callback) => {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(callback);
  };
  globalThis.removeEventListener = (name, callback) => listeners.get(name)?.delete(callback);
  return {
    screen, saved, listeners, get writes() { return writes; },
    change(rows, key = KEY) {
      if (key === KEY) saved.set(KEY, JSON.stringify(rows));
      else saved.set(key, 'other');
      for (const callback of listeners.get('storage') || []) callback({ key, storageArea: globalThis.localStorage });
    },
    clear() {
      saved.delete(KEY);
      for (const callback of listeners.get('storage') || []) callback({ key: null, storageArea: globalThis.localStorage });
    },
    restore() {
      for (const [key, value] of Object.entries(old)) {
        if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
      }
    },
  };
}

test('G-01 cross-tab storage update refreshes visible full history without DOM mutation', () => {
  const h = harness([record(1.1)]);
  try {
    const dispose = installMobileWalkJogHistoryUi();
    assert.match(h.screen.panel.innerHTML, /1\.10/);
    h.change([record(8.4)]);
    assert.match(h.screen.panel.innerHTML, /8\.40/, 'storage event must refresh unchanged ID/timestamp');
    assert.equal(h.writes, 0, 'read-only history must not rewrite the archive');
    dispose();
  } finally { h.restore(); }
});

test('G-01 cross-tab storage clear refreshes visible history without DOM mutation', () => {
  const h = harness([record(1.1)]);
  try {
    const dispose = installMobileWalkJogHistoryUi();
    h.clear();
    assert.match(h.screen.panel.innerHTML, /活動別記録はまだありません/);
    assert.equal(h.writes, 0, 'storage clear must not be reversed by the view');
    dispose();
  } finally { h.restore(); }
});

test('G-01 unrelated storage keys do not trigger activity history repaint', () => {
  const h = harness([record(1.1)]);
  try {
    const dispose = installMobileWalkJogHistoryUi();
    const original = h.screen.panel.innerHTML;
    h.saved.set(KEY, JSON.stringify([record(8.4)]));
    h.change([], 'unrelated-preferences');
    assert.equal(h.screen.panel.innerHTML, original);
    dispose();
  } finally { h.restore(); }
});

test('G-01 disposal removes storage listener', () => {
  const h = harness([record(1.1)]);
  try {
    const dispose = installMobileWalkJogHistoryUi();
    assert.equal(h.listeners.get('storage')?.size, 1);
    dispose();
    assert.equal(h.listeners.get('storage')?.size, 0);
  } finally { h.restore(); }
});

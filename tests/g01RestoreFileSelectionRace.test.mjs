import test from 'node:test';
import assert from 'node:assert/strict';
import { bindDataManagement } from '../ui/interactions/settingsInteractions.js';

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function setup() {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const handlers = new Map();
  const fileInput = {
    value: 'selected', files: [],
    addEventListener(type, cb) { handlers.set(type, cb); },
    async select(file) {
      this.value = file?.name || '';
      this.files = file ? [file] : [];
      return handlers.get('change')({ target: this });
    },
  };
  const button = { disabled: false, callback: null,
    addEventListener(type, callback) { if (type === 'click') this.callback = callback; },
    click() { assert.ok(this.callback, 'restore action bound'); this.callback(); },
  };
  const cancel = { addEventListener() {} };
  const host = {
    innerHTML: '',
    querySelector(selector) {
      if (selector === '[data-action="confirm-restore-backup"]') return button;
      if (selector === '[data-action="cancel-restore-preview"]') return cancel;
      if (selector === '[tabindex]') return { focus() {} };
      return null;
    },
  };
  const pending = new Map(), restored = [];
  globalThis.document = {
    querySelector(selector) {
      if (selector === '[data-restore-preview-host]') return host;
      if (selector === '[data-action="restore-backup"]') return fileInput;
      return null;
    },
  };
  globalThis.window = { confirm: () => true };
  const services = { storage: { backup: {
    inspectBackupFile(file) { return pending.get(file.name).promise; },
    restoreInspectedBackup(inspection) { restored.push(inspection.file); return { ok: false, message: 'simulated dry-run' }; },
  } } };
  bindDataManagement({ services, router: { navigateToScreen() {} }, rerender() {}, platformRuntime: null });
  function makeFile(name) { pending.set(name, deferred()); return { name }; }
  function complete(name) { pending.get(name).resolve({ file: name, status: 'SUPPORTED', canRestore: true, counts: {}, issues: [] }); }
  return { fileInput, makeFile, complete, button, host, restored, cleanup() {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  } };
}

test('G-01: a newly selected file must invalidate previously approved restore while inspection is pending', async () => {
  const t = setup();
  try {
    const a = t.makeFile('A.json'), b = t.makeFile('B.json');
    const first = t.fileInput.select(a); t.complete(a.name); await first;
    assert.match(t.host.innerHTML, /A\.json/);
    const second = t.fileInput.select(b);
    t.button.click();
    assert.deepEqual(t.restored, [], 'old A must be invalid immediately after B is chosen');
    t.complete(b.name); await second;
    t.button.click();
    assert.deepEqual(t.restored, ['B.json']);
  } finally { t.cleanup(); }
});

test('G-01: late completion of old file inspection must not replace newest preview', async () => {
  const t = setup();
  try {
    const a = t.makeFile('A.json'), b = t.makeFile('B.json');
    const slow = t.fileInput.select(a);
    const fast = t.fileInput.select(b); t.complete(b.name); await fast;
    t.complete(a.name); await slow;
    assert.match(t.host.innerHTML, /B\.json/);
    assert.doesNotMatch(t.host.innerHTML, /A\.json/);
    t.button.click();
    assert.deepEqual(t.restored, ['B.json']);
  } finally { t.cleanup(); }
});

test('G-01: clearing file selection while an inspection is pending must never re-enable restore', async () => {
  const t = setup();
  try {
    const a = t.makeFile('A.json'), b = t.makeFile('B.json');
    const initial = t.fileInput.select(a); t.complete(a.name); await initial;
    const pending = t.fileInput.select(b);
    await t.fileInput.select(null);
    t.complete(b.name); await pending;
    assert.doesNotMatch(t.host.innerHTML, /選択したファイル：[AB]\.json/);
    t.button.click();
    assert.deepEqual(t.restored, []);
  } finally { t.cleanup(); }
});

test('G-01: restore approval binds to the actual selected File object, not its displayed name', async () => {
  const t = setup();
  try {
    const a = t.makeFile('same.json');
    const pending = t.fileInput.select(a); t.complete(a.name); await pending;
    t.fileInput.files = [{ name: 'same.json' }]; // browser selection changed before event dispatch
    t.button.click();
    assert.deepEqual(t.restored, []);
  } finally { t.cleanup(); }
});

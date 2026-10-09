import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { acquireSingleEditorSession, EDITOR_LOCK_NAME } from '../ui/singleEditorSession.js';

class FakeOriginLocks {
  constructor() { this.held = new Set(); this.requests = []; }
  async request(name, options, callback) {
    this.requests.push({name, options});
    if (this.held.has(name)) return callback(null);
    this.held.add(name);
    try { return await callback({name, mode: 'exclusive'}); }
    finally { this.held.delete(name); }
  }
}

test('one document has exclusive editor authority; second is denied without write permissions', async () => {
  const locks = new FakeOriginLocks();
  const [a,b] = await Promise.all([acquireSingleEditorSession(locks), acquireSingleEditorSession(locks)]);
  assert.equal(a.ok, true);
  assert.deepEqual(b, { ok: false, reason: 'in-use' });
  assert.equal(locks.requests.length, 2);
  assert.ok(locks.requests.every(({name, options}) => name === EDITOR_LOCK_NAME && options.mode === 'exclusive' && options.ifAvailable === true));
  a.release();
  await Promise.resolve();
  await Promise.resolve();
  const c = await acquireSingleEditorSession(locks);
  assert.equal(c.ok, true);
  c.release();
});

test('an untrusted/insecure lockless environment fails closed rather than making racy localStorage locks', async () => {
  assert.deepEqual(await acquireSingleEditorSession(null), {ok:false, reason:'unsupported'});
  assert.deepEqual(await acquireSingleEditorSession({request() {throw new Error('denied');}}), {ok:false, reason:'unavailable'});
  assert.deepEqual(await acquireSingleEditorSession({request() {return Promise.reject(new Error('denied'));}}), {ok:false, reason:'unavailable'});
});

test('lock does not expire based on inactivity; repeat release does not make a second unlock', async () => {
  const locks = new FakeOriginLocks();
  const first = await acquireSingleEditorSession(locks);
  assert.equal((await acquireSingleEditorSession(locks)).reason, 'in-use');
  first.release(); first.release();
  await Promise.resolve(); await Promise.resolve();
  const second = await acquireSingleEditorSession(locks);
  assert.equal(second.ok, true);
  second.release();
});

test('app cannot import runtime before it knows editor lock result', () => {
  const boot = fs.readFileSync(new URL('../ui/platformBootstrap.js', import.meta.url), 'utf8');
  const worker = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
  assert.ok(boot.indexOf('await acquireSingleEditorSession()') < boot.indexOf('await loadPlatformStyles(platform)'));
  assert.ok(boot.indexOf('if (!editorSession.ok)') < boot.indexOf('await import("../app.js")'));
  assert.match(boot, /pagehide.*editorSession\.release/);
  assert.match(boot, /event\.persisted.*location\.reload/);
  assert.match(worker, /\.\/ui\/singleEditorSession\.js/);
  const guard = fs.readFileSync(new URL('../ui/singleEditorSession.js', import.meta.url), 'utf8');
  assert.match(guard, /section.className = "app-session-guard"/);
  // Boot recovery must not clear offline caches while a second tab is denied.
  assert.doesNotMatch(guard, /section.className = "app-boot"/);
});

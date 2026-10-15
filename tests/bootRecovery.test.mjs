import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const recovery = fs.readFileSync('ui/bootRecovery.js', 'utf8');
const bootstrap = fs.readFileSync('ui/platformBootstrap.js', 'utf8');

const results = [];
async function test(id, fn) {
  try { await fn(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', message: String(error?.stack || error) }); }
}

await test('BOOT-RECOVERY-LOADS-BEFORE-APP-MODULES', () => {
  const recoveryIndex = index.indexOf('./ui/bootRecovery.js');
  const bootstrapIndex = index.indexOf('./ui/platformBootstrap.js');
  assert.ok(recoveryIndex >= 0 && bootstrapIndex > recoveryIndex);
  assert.ok(bootstrap.includes('await import("../app.js")'));
  assert.ok(worker.includes('"./ui/bootRecovery.js"'));
});

await test('BOOT-RECOVERY-PRESERVES-USER-DATA', () => {
  assert.ok(recovery.includes('caches.delete(key)'));
  assert.ok(recovery.includes('registration.unregister()'));
  assert.ok(recovery.includes('sessionStorage'));
  assert.ok(!recovery.includes('localStorage.clear'));
  assert.ok(!recovery.includes('localStorage.removeItem'));
});

await test('BOOT-RECOVERY-IS-BOUNDED', () => {
  assert.ok(recovery.includes('BOOT_RECOVERY_TIMEOUT_MS = 8000'));
  assert.ok(recovery.includes('runload.bootRecovery.attempt.v1'));
  assert.ok(recovery.includes('alreadyAttempted'));
});

await test('SERVICE-WORKER-WAITS-FOR-EXPLICIT-ACTIVATION', () => {
  const installBlock = worker.match(/self\.addEventListener\("install"[\s\S]*?\n\}\);/)?.[0] || '';
  assert.ok(installBlock.includes('cache.addAll(COMMON_PRECACHE_URLS)'));
  assert.ok(!installBlock.includes('self.skipWaiting()'));
  assert.ok(worker.includes('event.data?.type === "SKIP_WAITING"') && worker.includes('self.skipWaiting();'));
});


function scenario({ online = true, previousAttempt = false } = {}) {
  let booting = true;
  const messages = { textContent: "起動しています" };
  const timers = [];
  const events = [];
  const marker = "runload.bootRecovery.attempt.v1";
  const state = new Map(previousAttempt ? [[marker, "1"]] : []);
  const context = {
    document: {
      querySelector: (selector) => selector === "#app > .app-boot" && booting
        ? { querySelector: () => messages } : null,
    },
    navigator: {
      onLine: online,
      serviceWorker: { getRegistrations: async () => [{
        active: { scriptURL: "https://runload.example/service-worker.js" },
        unregister: async () => { events.push("unregister"); },
      }] },
    },
    caches: {
      keys: async () => ["running-record-app-old", "different-app-cache"],
      delete: async (key) => { events.push("delete:" + key); return true; },
    },
    sessionStorage: {
      getItem: (key) => state.get(key) ?? null,
      setItem: (key,value) => { state.set(key,String(value)); },
      removeItem: (key) => { state.delete(key); },
    },
    location: { reload: () => events.push("reload") },
    setTimeout: (fn,delay) => { timers.push({fn,delay}); },
  };
  context.globalThis = context;
  vm.runInNewContext(recovery, context, { filename:"ui/bootRecovery.js" });
  return { timers, events, messages, state, setBooting: (value) => { booting = value; } };
}
await test('BOOT-RECOVERY-SLOW-NOT-FAIL', async () => {
  const s = scenario();
  assert.equal(s.timers.shift().delay,8000);
  // Re-run the timer in a separate instance; the initial 8s timer reports
  // slow loading only, without mutating caches or asking for Safari.
  const t = scenario();
  t.timers.shift().fn();
  assert.match(t.messages.textContent,/起動に時間がかかっています/);
  assert.doesNotMatch(t.messages.textContent,/Safari|起動できませんでした/);
  assert.equal(t.timers[0]?.delay,8000);
  assert.deepEqual(t.events,[]);
  t.setBooting(false); // Application completes during the grace period.
  await t.timers.shift().fn();
  assert.deepEqual(t.events,[]);
});
await test('BOOT-RECOVERY-STALLED-ONLY-REPAIRS-OWN-CACHE', async () => {
  const s = scenario();
  s.timers.shift().fn();
  assert.deepEqual(s.events,[]);
  await s.timers.shift().fn();
  assert.deepEqual(s.events,["delete:running-record-app-old","unregister","reload"]);
  assert.equal(s.state.get("runload.bootRecovery.attempt.v1"),"1");
});
await test('BOOT-RECOVERY-RETRY-DOES-NOT-REPEAT-REPAIR', async () => {
  const s = scenario({previousAttempt:true});
  s.timers.shift().fn();
  await s.timers.shift().fn();
  assert.deepEqual(s.events,[]);
  assert.doesNotMatch(s.messages.textContent,/Safari|起動できませんでした/);
});
await test('BOOT-RECOVERY-OFFLINE-PRESERVES-ASSETS', () => {
  const s = scenario({online:false});
  s.timers.shift().fn();
  assert.equal(s.timers.length,0);
  assert.deepEqual(s.events,[]);
  assert.match(s.messages.textContent,/オフライン/);
});
await test('BOOT-RECOVERY-FAST-BOOT-CLEARS-ATTEMPT', () => {
  const s = scenario({previousAttempt:true});
  s.setBooting(false);
  s.timers.shift().fn();
  assert.equal(s.state.has("runload.bootRecovery.attempt.v1"),false);
  assert.deepEqual(s.events,[]);
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Boot Recovery / PWA Atomic Update', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);

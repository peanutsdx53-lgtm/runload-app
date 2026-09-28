import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const recovery = fs.readFileSync('ui/bootRecovery.js', 'utf8');

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', message: String(error?.stack || error) }); }
}

test('BOOT-RECOVERY-LOADS-BEFORE-APP-MODULES', () => {
  const recoveryIndex = index.indexOf('./ui/bootRecovery.js');
  const appIndex = index.indexOf('./app.js');
  assert.ok(recoveryIndex >= 0 && appIndex > recoveryIndex);
  assert.ok(worker.includes('"./ui/bootRecovery.js"'));
});

test('BOOT-RECOVERY-PRESERVES-USER-DATA', () => {
  assert.ok(recovery.includes('caches.delete(key)'));
  assert.ok(recovery.includes('registration.unregister()'));
  assert.ok(recovery.includes('sessionStorage'));
  assert.ok(!recovery.includes('localStorage.clear'));
  assert.ok(!recovery.includes('localStorage.removeItem'));
});

test('BOOT-RECOVERY-IS-BOUNDED', () => {
  assert.ok(recovery.includes('BOOT_RECOVERY_TIMEOUT_MS = 8000'));
  assert.ok(recovery.includes('runload.bootRecovery.attempt.v1'));
  assert.ok(recovery.includes('alreadyAttempted'));
});

test('SERVICE-WORKER-WAITS-FOR-EXPLICIT-ACTIVATION', () => {
  const installBlock = worker.match(/self\.addEventListener\("install"[\s\S]*?\n\}\);/)?.[0] || '';
  assert.ok(installBlock.includes('cache.addAll(PRECACHE_URLS)'));
  assert.ok(!installBlock.includes('self.skipWaiting()'));
  assert.ok(worker.includes('if (event.data?.type === "SKIP_WAITING") self.skipWaiting();'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Boot Recovery / PWA Atomic Update', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);

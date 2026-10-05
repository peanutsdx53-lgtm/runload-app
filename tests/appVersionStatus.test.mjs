import fs from 'node:fs';
import assert from 'node:assert/strict';

const versionModule = fs.readFileSync('ui/appVersionStatus.js', 'utf8');
const mobileVersionModule = fs.readFileSync('ui/mobileVersionStatus.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

const results = [];
function test(id, fn) {
  try {
    fn();
    results.push({ id, status: 'PASS' });
  } catch (error) {
    results.push({ id, status: 'FAIL', message: String(error?.stack || error) });
  }
}

const versionMatch = versionModule.match(/APP_VERSION = "([^"]+)"/);
const version = versionMatch?.[1] || '';

test('APP-VERSION-IS-EXPLICIT-AND-VISIBLE', () => {
  assert.match(version, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
  assert.ok(versionModule.includes('data-app-version'));
  assert.ok(mobileVersionModule.includes('addMobileHomeVersion'));
  assert.ok(!versionModule.includes('addMobileHomeVersion'));
  assert.ok(versionModule.includes('addSettingsUpdatePanel'));
});

test('UPDATE-RESET-PRESERVES-USER-DATA', () => {
  assert.ok(versionModule.includes('APP_CACHE_PREFIXES'));
  assert.ok(versionModule.includes('caches.delete(key)'));
  assert.ok(versionModule.includes('navigator.serviceWorker.getRegistrations()'));
  assert.ok(versionModule.includes('registration.update()'));
  assert.ok(versionModule.includes('window.location.reload()'));
  assert.ok(versionModule.includes('記録、予定、保存コース、プロフィール、設定は削除しません'));
  assert.ok(!versionModule.includes('localStorage.clear'));
});

test('VERSION-MODULE-IS-LOADED', () => {
  assert.ok(index.includes('<script type="module" src="./ui/appVersionStatus.js"></script>'));
});

test('SERVICE-WORKER-CACHE-IS-TIED-TO-VERSION', () => {
  assert.ok(worker.includes(`running-record-app-runtime-${version}`));
  assert.ok(worker.includes('"./ui/appVersionStatus.js"'));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'App Version Status', version, total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);

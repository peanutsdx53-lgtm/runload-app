import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  createRunMeasurementNotifier,
  measurementNotificationCapabilities,
} from '../ui/runMeasurementNotifications.js';

const settingsModule = fs.readFileSync('ui/appSettings.js', 'utf8');
const settingsScreen = fs.readFileSync('screens/settingsScreen.js', 'utf8');
const settingsInteractions = fs.readFileSync('ui/interactions/settingsInteractions.js', 'utf8');
const measurementInteractions = fs.readFileSync('ui/interactions/runMeasurementInteractions.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const versionModule = fs.readFileSync('ui/appVersionStatus.js', 'utf8');

const results = [];
async function test(id, fn) {
  try { await fn(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', message: String(error?.stack || error) }); }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
  }
  createOscillator() {
    return { frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
  }
  async resume() { this.state = 'running'; }
  async close() {}
}

await test('DEFAULT-NOTIFICATIONS-ARE-ON', async () => {
  assert.ok(settingsModule.includes('measurementSoundEnabled: true'));
  assert.ok(settingsModule.includes('measurementVibrationEnabled: true'));
});

await test('SETTINGS-SCREEN-EXPOSES-SMARTPHONE-NOTIFICATION-TOGGLES', async () => {
  assert.ok(settingsScreen.includes('data-mobile-measurement-notifications'));
  assert.ok(settingsScreen.includes('name="measurementSoundEnabled"'));
  assert.ok(settingsScreen.includes('name="measurementVibrationEnabled"'));
  assert.ok(settingsScreen.includes('通知音を試す'));
  assert.ok(settingsScreen.includes('振動を試す'));
  assert.ok(settingsScreen.includes('iPhoneなど振動APIに対応していない環境'));
  assert.ok(settingsScreen.includes('if (!matchesMobileLayout()) return ""'));
});

await test('SETTINGS-ARE-SAVED-IMMEDIATELY', async () => {
  assert.ok(settingsInteractions.includes('data-immediate-measurement-setting'));
  assert.ok(settingsInteractions.includes('saveSettings(services, { [input.name]: input.checked })'));
  assert.ok(settingsInteractions.includes('test-measurement-sound'));
  assert.ok(settingsInteractions.includes('test-measurement-vibration'));
});

await test('DISABLED-NOTIFICATIONS-DO-NOT-FIRE', async () => {
  let vibrateCalls = 0;
  const target = {
    AudioContext: FakeAudioContext,
    navigator: { vibrate: () => { vibrateCalls += 1; return true; } },
  };
  const notifier = createRunMeasurementNotifier(target, {
    measurementSoundEnabled: false,
    measurementVibrationEnabled: false,
  });
  const result = notifier.notify('goal');
  assert.equal(result.sound, false);
  assert.equal(result.vibration, false);
  assert.equal(vibrateCalls, 0);
});

await test('ANDROID-LIKE-VIBRATION-PATTERN-IS-USED-WHEN-AVAILABLE', async () => {
  let pattern = null;
  const target = {
    navigator: { vibrate: (value) => { pattern = value; return true; } },
  };
  const capabilities = measurementNotificationCapabilities(target);
  assert.equal(capabilities.vibration, true);
  const notifier = createRunMeasurementNotifier(target, {
    measurementSoundEnabled: false,
    measurementVibrationEnabled: true,
  });
  const result = notifier.notify('goal');
  assert.equal(result.vibration, true);
  assert.deepEqual(pattern, [280, 120, 280]);
});

await test('IPHONE-LIKE-NO-VIBRATION-API-FAILS-SAFELY', async () => {
  const target = { AudioContext: FakeAudioContext, navigator: {} };
  const capabilities = measurementNotificationCapabilities(target);
  assert.equal(capabilities.vibration, false);
  const notifier = createRunMeasurementNotifier(target, {
    measurementSoundEnabled: true,
    measurementVibrationEnabled: true,
  });
  const result = notifier.notify('goal');
  assert.equal(result.sound, true);
  assert.equal(result.vibration, false);
});

await test('MEASUREMENT-PREWARMS-AUDIO-FROM-START-ACTION', async () => {
  assert.ok(measurementInteractions.includes('await notifier.prepare();'));
  assert.ok(measurementInteractions.includes('notifier.notify("pace")'));
  assert.ok(measurementInteractions.includes('notifier.notify("goal")'));
  assert.ok(!measurementInteractions.includes('navigator.vibrate?.'));
});

await test('NOTIFICATION-MODULE-IS-PRECACHED-AND-VERSIONED', async () => {
  const version = versionModule.match(/APP_VERSION = "([^"]+)"/)?.[1] || '';
  assert.equal(version, '2026.09.29.8');
  assert.ok(worker.includes('"./ui/runMeasurementNotifications.js"'));
  assert.ok(worker.includes(`running-record-app-runtime-${version}`));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'Smartphone Measurement Notifications', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);

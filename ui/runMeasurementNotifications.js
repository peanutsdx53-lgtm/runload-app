export const MEASUREMENT_NOTIFICATION_KIND = Object.freeze({
  pace: "pace",
  goal: "goal",
  previewSound: "preview-sound",
  previewVibration: "preview-vibration",
});

const SOUND_PATTERNS = Object.freeze({
  pace: Object.freeze([
    Object.freeze({ frequency: 740, delayMs: 0, durationMs: 220 }),
  ]),
  goal: Object.freeze([
    Object.freeze({ frequency: 880, delayMs: 0, durationMs: 170 }),
    Object.freeze({ frequency: 1040, delayMs: 230, durationMs: 220 }),
  ]),
  "preview-sound": Object.freeze([
    Object.freeze({ frequency: 880, delayMs: 0, durationMs: 150 }),
    Object.freeze({ frequency: 1040, delayMs: 205, durationMs: 180 }),
  ]),
});

const VIBRATION_PATTERNS = Object.freeze({
  pace: Object.freeze([180, 80, 180]),
  goal: Object.freeze([280, 120, 280]),
  "preview-vibration": Object.freeze([160, 80, 160]),
});

function soundEnabled(settings = {}) {
  return settings.measurementSoundEnabled !== false && settings.measurementSoundEnabled !== "off";
}

function vibrationEnabled(settings = {}) {
  return settings.measurementVibrationEnabled !== false && settings.measurementVibrationEnabled !== "off";
}

export function measurementNotificationCapabilities(target = globalThis) {
  return Object.freeze({
    sound: Boolean(target?.AudioContext || target?.webkitAudioContext),
    vibration: typeof target?.navigator?.vibrate === "function",
  });
}

export function createRunMeasurementNotifier(target = globalThis, settings = {}) {
  let context = null;
  const capabilities = measurementNotificationCapabilities(target);
  const allowSound = soundEnabled(settings);
  const allowVibration = vibrationEnabled(settings);

  function ensureContext() {
    if (!allowSound || !capabilities.sound) return null;
    try {
      const AudioContextClass = target.AudioContext || target.webkitAudioContext;
      context ||= new AudioContextClass();
      return context;
    } catch {
      return null;
    }
  }

  async function prepare() {
    const audio = ensureContext();
    if (!audio) return Object.freeze({ soundReady: false, vibrationReady: allowVibration && capabilities.vibration });
    try {
      if (audio.state === "suspended") await audio.resume?.();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(audio.currentTime);
      oscillator.stop(audio.currentTime + 0.01);
      return Object.freeze({ soundReady: audio.state !== "suspended", vibrationReady: allowVibration && capabilities.vibration });
    } catch {
      return Object.freeze({ soundReady: false, vibrationReady: allowVibration && capabilities.vibration });
    }
  }

  function playSound(kind) {
    if (!allowSound) return false;
    const audio = ensureContext();
    const pattern = SOUND_PATTERNS[kind];
    if (!audio || !pattern) return false;
    try {
      pattern.forEach(({ frequency, delayMs, durationMs }) => {
        const startAt = audio.currentTime + delayMs / 1000;
        const stopAt = startAt + durationMs / 1000;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(startAt + 0.03, stopAt - 0.02));
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(startAt);
        oscillator.stop(stopAt);
      });
      return true;
    } catch {
      return false;
    }
  }

  function vibrate(kind) {
    if (!allowVibration || !capabilities.vibration) return false;
    const pattern = VIBRATION_PATTERNS[kind];
    if (!pattern) return false;
    try {
      return target.navigator.vibrate([...pattern]) !== false;
    } catch {
      return false;
    }
  }

  function notify(kind) {
    return Object.freeze({
      sound: playSound(kind),
      vibration: vibrate(kind),
    });
  }

  async function close() {
    try { await context?.close?.(); } catch {}
    context = null;
  }

  return Object.freeze({
    prepare,
    notify,
    previewSound: () => playSound(MEASUREMENT_NOTIFICATION_KIND.previewSound),
    previewVibration: () => vibrate(MEASUREMENT_NOTIFICATION_KIND.previewVibration),
    close,
    capabilities: () => capabilities,
    settings: () => Object.freeze({ sound: allowSound, vibration: allowVibration }),
  });
}

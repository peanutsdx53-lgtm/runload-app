import { renderSettingsScreenWithPresentation } from "../settingsScreen.js";

function checkedBoolean(value) {
  return value ? " checked" : "";
}

function renderMeasurementNotifications(settings = {}) {
  const soundSupported = Boolean(globalThis.AudioContext || globalThis.webkitAudioContext);
  const vibrationSupported = typeof globalThis.navigator?.vibrate === "function";
  return `<section class="group" data-measurement-notifications><p class="group-title">MEASUREMENT</p>
    <div class="boundary"><strong>測定中の通知</strong><span>時間・距離の目標到達やペース注意を、対応している方法で知らせます。</span></div>
    <div class="measurement-notification-options">
      <label class="choice-card measurement-notification-option"><input type="checkbox" name="measurementSoundEnabled" value="on" data-immediate-measurement-setting${checkedBoolean(settings.measurementSoundEnabled)}><span><strong>通知音</strong><small>${soundSupported ? "目標到達・ペース注意で音を鳴らします。" : "この端末・ブラウザーでは通知音を利用できません。"}</small></span></label>
      <label class="choice-card measurement-notification-option"><input type="checkbox" name="measurementVibrationEnabled" value="on" data-immediate-measurement-setting${checkedBoolean(settings.measurementVibrationEnabled)}><span><strong>振動</strong><small>${vibrationSupported ? "対応端末では目標到達・ペース注意を振動でも知らせます。" : "この端末・ブラウザーでは振動を利用できません。設定は保存されます。"}</small></span></label>
    </div>
    <div class="action-row measurement-notification-tests">
      <button type="button" data-action="test-measurement-sound"${soundSupported ? "" : " disabled"}>通知音を試す</button>
      <button type="button" data-action="test-measurement-vibration"${vibrationSupported ? "" : " disabled"}>振動を試す</button>
    </div>
    <p class="note">iPhoneなど振動APIに対応していない環境では、振動をオンにしても音と画面表示だけを使用します。</p>
    <p class="visually-hidden" data-measurement-notification-status role="status" aria-live="polite"></p>
  </section>`;
}

function renderFirstUseGuide() {
  return `<button type="button" class="settings-guide-link" data-action="reopen-onboarding"><span><small>FIRST USE</small><strong>チュートリアルをもう一度見る</strong></span><span aria-hidden="true">›</span></button>`;
}

export function renderSettingsScreen(args) {
  return renderSettingsScreenWithPresentation(args, {
    renderMeasurementNotifications,
    renderFirstUseGuide,
  });
}

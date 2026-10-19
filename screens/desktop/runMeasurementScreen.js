export function renderRunMeasurementScreen() {
  return `<div class="screen screen--run-measurement-unavailable run-launch">
    <div class="run-launch__panel">
      <p class="eyebrow">測定</p>
      <h1>この端末では測定を利用できません</h1>
      <p class="run-launch__lead">走行内容は記録画面から手入力できます。</p>
      <a class="run-launch__choice run-launch__choice--app" href="#/record-input"><small>手入力</small><strong>記録を入力する</strong><span>距離と時間を入力して結果を確認できます</span></a><a class="w2-desktop-measurement-back" href="#/home">← ホームへ戻る</a>
    </div>
  </div>`;
}

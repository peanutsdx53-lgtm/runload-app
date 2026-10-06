export function renderRunMeasurementScreen() {
  return `<div class="screen screen--run-measurement-unavailable run-launch">
    <main class="run-launch__panel">
      <p class="eyebrow">測定</p>
      <h1>この端末では測定を利用できません</h1>
      <p class="run-launch__lead">走行内容は記録画面から手入力できます。</p>
      <a class="run-launch__choice run-launch__choice--app" href="#/home"><small>ホーム</small><strong>ホームへ戻る</strong><span>記録や履歴を確認できます</span></a>
    </main>
  </div>`;
}

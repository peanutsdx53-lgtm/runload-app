const APP_VERSION_LABEL = "v2026.10.09.44";

export function renderAboutScreen() {
  return `<div class="screen screen--about screen-layout secondary-derived-screen">
    <header class="secondary-derived-head"><a class="secondary-derived-back" href="#/more">← その他へ戻る</a><strong>このアプリについて</strong><span aria-hidden="true"></span></header>
    <div class="secondary-derived-body about-body">
      <section class="about-hero">
        <div><small>このアプリについて</small><h1>走行記録</h1><p>初心者ランナーの記録と振り返りを支えるWebアプリ</p></div>
        <strong>${APP_VERSION_LABEL}</strong>
      </section>
      <section class="about-panel"><small>できること</small><h2>記録と振り返り</h2><p>走行や休養を記録し、結果や履歴を見返せます。</p></section>
      <section class="about-panel"><small>地図情報</small><h2>クレジット</h2><dl class="about-credits"><div><dt>地図</dt><dd><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a></dd></div></dl></section>
      <section class="about-panel about-panel--links"><small>関連情報</small><h2>情報</h2><a href="#/terms">利用規約 <b>›</b></a><a href="#/privacy">プライバシー <b>›</b></a></section>
    </div>
  </div>`;
}

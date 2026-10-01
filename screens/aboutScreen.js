const APP_VERSION_LABEL = "v2026.10.01.48";

export function renderAboutScreen() {
  return `<div class="screen screen--about screen-layout secondary-derived-screen">
    <header class="secondary-derived-head"><a class="secondary-derived-back" href="#/more">← その他へ戻る</a><strong>このアプリについて</strong><span aria-hidden="true"></span></header>
    <div class="secondary-derived-body about-body">
      <section class="about-hero">
        <div><small>RUNLOAD</small><h1>走行記録</h1><p>初心者ランナーの記録と振り返りを支えるWebアプリ</p></div>
        <strong>${APP_VERSION_LABEL}</strong>
      </section>
      <section class="about-panel"><small>APP</small><h2>スマホ版</h2><p>研究成果物を基礎に、スマホでは操作性・可視化・GPS体験を拡張しています。</p><div class="about-tags"><span>HTML</span><span>CSS</span><span>JavaScript</span><span>PWA</span><span>SVG</span><span>Geolocation</span></div></section>
      <section class="about-panel"><small>CREDITS</small><h2>クレジット</h2><dl class="about-credits"><div><dt>研究・開発</dt><dd>RunLoad project</dd></div><div><dt>地図</dt><dd><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a></dd></div><div><dt>UI表現</dt><dd>Inline SVG / CSS / Unicode Emoji</dd></div></dl></section>
      <section class="about-panel about-panel--links"><small>LINKS</small><h2>情報</h2><a href="#/terms">利用規約 <b>›</b></a><a href="#/privacy">プライバシー <b>›</b></a><a href="https://github.com/peanutsdx53-lgtm/runload-app" target="_blank" rel="noopener noreferrer">GitHub <b>↗</b></a></section>
    </div>
  </div>`;
}

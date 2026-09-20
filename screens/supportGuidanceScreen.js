function supportReturnTarget(context) {
  const recordId = String(context?.parameters?.get?.("recordId") || "");
  const returnTo = String(context?.parameters?.get?.("returnTo") || "");
  if (returnTo === "#/record-input?subflow=subjective") return returnTo;
  if (recordId) return `#/record-input?recordId=${encodeURIComponent(recordId)}&subflow=subjective`;
  return "#/more";
}

export function renderSupportGuidanceScreen({ context } = {}) {
  const backHref = supportReturnTarget(context);
  const backLabel = backHref.startsWith("#/record-input") ? "身体の記録へ戻る" : "その他へ戻る";
  return `<div class="screen screen--support-guidance prototype-parity prototype-parity--support">
    <section class="head"><p class="eyebrow">PUBLIC SUPPORT</p><h1>公的サポート</h1><p>症状や体調について、RunLoadとは別の公的な窓口を確認します。</p></section>
    <p class="notice">この画面はRunLoadの部位ごとの目安や疲労感の値から緊急性を判定するものではありません。</p><p class="visually-hidden">RunLoadの数値表示ではなく、本人の症状や体調をもとに公的窓口を選びます。RunLoadは緊急性、診断、受診要否を判定しません。</p>
    <div class="cards">
      <article class="card urgent"><small>緊急時</small><strong>生命に関わる緊急性がある場合</strong><p>RunLoadの画面操作を続けず、地域の緊急通報を利用してください。日本では119です。</p><a href="tel:119"><span>119へ電話</span><span>›</span></a></article>
      <article class="card warn"><small>判断に迷うとき</small><strong>救急車や受診の判断を相談する</strong><p>#7119は、実施地域で救急車を呼ぶべきか、すぐ受診すべきか迷う場合の電話相談窓口です。利用可否は地域によって異なります。</p><a href="https://www.fdma.go.jp/mission/enrichment/appropriate/appropriate007.html" target="_blank" rel="noreferrer"><span>#7119の案内を確認</span><span>›</span></a></article>
      <article class="card"><small>医療機関を探す</small><strong>医療情報ネット（ナビイ）</strong><p>厚生労働省の全国医療機関検索です。診療科目、場所、受付日時などから検索できます。</p><a href="https://www.iryou.teikyouseido.mhlw.go.jp/znk-web/juminkanja/S2300/initialize" target="_blank" rel="noreferrer"><span>医療機関を探す</span><span>›</span></a></article>
    </div>
    <a class="back" data-context-back-duplicate href="${backHref}">‹ ${backLabel}</a>
  </div>`;
}

export function renderTermsScreen({ context } = {}) {
  const returnTo = String(context?.parameters?.get?.("returnTo") || "");
  const fromSettings = returnTo.startsWith("#/settings");
  const backHref = fromSettings ? "#/settings" : "#/more";
  const backLabel = fromSettings ? "設定" : "その他";
  return `<div class="screen screen--terms screen-layout secondary-derived-screen">
    <header class="secondary-derived-head"><a class="secondary-derived-back" href="${backHref}">← ${backLabel}へ戻る</a><strong>利用規約</strong><span aria-hidden="true"></span></header>
    <div class="secondary-derived-body terms-body">
      <section class="head"><p class="eyebrow">利用規約</p><h1>利用規約</h1><p>このアプリを利用する際の基本事項です。</p></section>
      <div class="terms-meta"><span>第1版</span><span>2026年9月30日</span></div>

      <section class="terms-section"><h2>1. 本アプリについて</h2><p>RunLoadは、走行・休養・コース・身体の記録を整理し、自分の記録を振り返るためのアプリです。</p></section>
      <section class="terms-section"><h2>2. 医療・安全に関する位置づけ</h2><p>本アプリは、診断、原因の特定、危険度・傷害確率の判定、走行可否、受診要否、治療・運動処方を行いません。緊急時や体調に不安がある場合は、本アプリの表示だけで判断せず、公的な相談先や医療機関を利用してください。</p></section>
      <section class="terms-section"><h2>3. 記録と計算結果</h2><p>入力内容やGPS等から得た情報に基づき、記録・比較用の表示を作成します。表示値は実際の筋力、関節力、組織負荷等を直接測定した値ではありません。入力内容や利用環境により、記録や表示に差が生じる場合があります。</p></section>
      <section class="terms-section"><h2>4. データの扱い</h2><p>アプリ内の記録は端末内保存を基本とします。GPSは測定時に端末の許可を得て取得します。地図表示ではOpenStreetMapの地図画像を取得します。バックアップ、外部サイト、電話、共有等は利用者が操作した場合に実行されます。</p><p><a href="#/privacy?returnTo=%23%2Fterms">詳しいデータの扱いを確認</a></p></section>
      <section class="terms-section"><h2>5. 利用者の責任</h2><p>入力内容、端末の管理、バックアップ、外部への共有は利用者自身で管理してください。安全を損なう状況で端末を操作しないでください。</p></section>
      <section class="terms-section"><h2>6. 禁止事項</h2><p>法令に違反する利用、第三者の権利を侵害する利用、本アプリや関連システムの動作を不正に妨げる行為を禁止します。</p></section>
      <section class="terms-section"><h2>7. 提供内容の変更</h2><p>品質向上、仕様変更、研究・開発上の更新等により、本アプリの機能・表示・利用条件を変更する場合があります。重要な利用条件を変更した場合は、必要に応じて再確認を求めます。</p></section>
      <section class="terms-section"><h2>8. 免責と法令上の権利</h2><p>本アプリは、特定の健康結果、競技結果、傷害防止等を保証するものではありません。ただし、適用される法令により制限または免除できない責任や利用者の権利を排除するものではありません。</p></section>
      <section class="terms-section"><h2>9. 規約への同意</h2><p>初回利用時に本規約へ同意したうえで利用を開始します。現在の規約は、設定画面からいつでも確認できます。</p></section>
    </div>
  </div>`;
}

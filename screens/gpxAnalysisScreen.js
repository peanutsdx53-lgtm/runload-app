import { escapeHtml, renderPageHeading } from "../ui/commonComponents.js";
export function renderGpxAnalysisScreen({ context }) {
  const returnTo=String(context?.parameters?.get?.("returnTo")||"#/record-input");
  const safe=["#/record-input","#/plan","#/simulation"].some((p)=>returnTo.startsWith(p))?returnTo:"#/record-input";
  return `<section class="screen screen--gpx-analysis frozen-gpx-screen">
    <nav class="context-navigation"><a class="body-part-detail__back-link" href="#/course-library?returnTo=${encodeURIComponent(safe)}">コース設定へ戻る</a></nav>
    ${renderPageHeading({eyebrow:"GPX",title:"GPXを端末内で確認",description:"選んだGPXファイルをこのブラウザ内だけで解析し、コース候補へ戻します。"})}
    <p class="inline-helper"><strong>外部へ自動送信しません。</strong> GPX候補は、次の画面で確認して保存するまで正式なコースにはなりません。</p>
    <section class="gpx-local-card"><label class="field"><span>GPXファイル</span><input id="gpx-file" type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml"></label><div id="gpx-status" class="gpx-status" role="status" aria-live="polite">ファイルを選択してください。</div><div id="gpx-summary" class="gpx-summary" hidden></div><div class="screen-actions"><button class="button button--primary" id="gpx-apply" type="button" disabled>候補をコース設定へ戻す</button><a class="button button--secondary" href="#/course-library?returnTo=${encodeURIComponent(safe)}">キャンセル</a></div></section>
    <input type="hidden" id="gpx-return-to" value="${escapeHtml(safe)}">
  </section>`;
}

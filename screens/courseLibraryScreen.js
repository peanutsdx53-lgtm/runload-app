import { escapeHtml, renderEmptyState, renderPageHeading } from "../ui/commonComponents.js";
import { renderCourseSummary } from "../ui/coursePresentation.js";

function safeReturnTo(context) {
  const value = String(context?.parameters?.get("returnTo") || "#/record-input");
  return ["#/record-input", "#/plan", "#/simulation"].some((prefix) => value.startsWith(prefix)) ? value : "#/record-input";
}
function callerLabel(returnTo="") {
  if (returnTo.startsWith("#/plan")) return "予定";
  if (returnTo.startsWith("#/simulation")) return "条件比較";
  return "今日の記録";
}
export function renderCourseLibraryScreen({ services, context }) {
  const courses = services.storage.courses.loadAll();
  const returnTo = safeReturnTo(context);
  const notice = context?.parameters?.get("notice") || "";
  const label = callerLabel(returnTo);
  const gpxHref = `#/gpx-analysis?returnTo=${encodeURIComponent(returnTo)}`;
  return `<section class="screen screen--course-library course-flow-frozen">
    <nav class="context-navigation" aria-label="コース設定内の移動"><a class="body-part-detail__back-link" href="${escapeHtml(returnTo)}">${escapeHtml(label)}へ戻る</a></nav>
    ${renderPageHeading({ eyebrow: "コース設定", title: "使うコースを選ぶ", description: "保存コースを選ぶか、新しく作ります。坂・路面が分からない場合は不明のまま使えます。" })}
    ${notice ? `<p class="editing-banner" role="status">${escapeHtml(notice)}</p>` : ""}
    <section class="course-flow-actions" aria-label="コースを追加">
      <a class="button button--primary" href="#/course-editor?returnTo=${encodeURIComponent(returnTo)}">手動でコースを作る</a>
      <a class="button button--secondary" href="${escapeHtml(gpxHref)}">GPXから候補を作る</a>
    </section>
    <p class="inline-helper"><strong>GPXは端末内で解析します。</strong> 候補を確認して保存するまで、保存コースには追加されません。</p>
    ${courses.length ? `<section aria-labelledby="saved-course-list-title"><div class="section-heading"><p>最近・保存済み</p><h2 id="saved-course-list-title">保存したコース</h2></div><div class="course-card-grid">${courses.map((preset) => `<article class="course-manager-card" aria-labelledby="course-${escapeHtml(preset.id)}-title">
      ${renderCourseSummary(preset.course, { headingLevel: 3, headingId: `course-${preset.id}-title` })}
      <div class="course-manager-card__actions">
        <button class="button button--primary" type="button" data-action="use-course" data-course-id="${escapeHtml(preset.id)}" data-return-to="${escapeHtml(returnTo)}">このコースを使う</button>
        <a class="button button--secondary" href="#/course-editor?id=${encodeURIComponent(preset.id)}&returnTo=${encodeURIComponent(returnTo)}">編集</a>
        <button class="button button--danger" type="button" data-action="delete-course" data-course-id="${escapeHtml(preset.id)}">削除</button>
      </div>
    </article>`).join("")}</div><p class="course-library-status" data-course-manager-status role="status" aria-live="polite"></p></section>` : renderEmptyState({ title: "保存したコースはまだありません", description: "手動入力またはGPX候補から作成できます。", actionLabel: "コースを作る", actionScreen: `course-editor?returnTo=${encodeURIComponent(returnTo)}` })}
  </section>`;
}

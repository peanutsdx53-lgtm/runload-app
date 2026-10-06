import { escapeHtml } from "../../ui/commonComponents.js";
import { primarySurfaceSummary, slopeSummary } from "../../ui/coursePresentation.js";
import {
  buildCourseLibraryContext,
  courseLibraryCallerLabel,
  courseLibraryMeta,
} from "../shared/courseLibraryContext.js";

function mobileCard(preset, returnTo, selectedId = "") {
  return `<article class="card course-mobile-library-card"><div class="course-mobile-library-card__head"><div><strong>${escapeHtml(preset.name||preset.course?.name||"名称なし")}</strong><small>${preset.id===selectedId?"使用中":"保存済み"}</small></div><button class="use" type="button" data-action="use-course" data-course-id="${escapeHtml(preset.id||"")}" data-return-to="${escapeHtml(returnTo)}">使う</button></div><div class="course-mobile-library-card__facts"><span><small>坂道</small><b>${escapeHtml(slopeSummary(preset.course||{}))}</b></span><span><small>路面</small><b>${escapeHtml(primarySurfaceSummary(preset.course||{}))}</b></span></div><div class="secondary-actions"><a class="edit" href="#/course-editor?id=${encodeURIComponent(preset.id||"")}&returnTo=${encodeURIComponent(returnTo)}">編集</a><button class="delete" type="button" data-action="delete-course" data-course-id="${escapeHtml(preset.id||"")}">削除</button></div></article>`;
}

export function renderCourseLibraryScreen({ services, context }) {
  const { ordered, courses, returnTo, selected, selectedId } = buildCourseLibraryContext({ services, context });
  return `<div class="screen screen--course-library screen-layout screen-layout--course course-derived-screen course-mobile-library"><div class="course-derived-frame course-derived-frame--library"><header class="course-derived-head"><a class="course-derived-back" href="${escapeHtml(returnTo)}">← ${escapeHtml(courseLibraryCallerLabel(returnTo))}</a><strong>コース設定</strong><span aria-hidden="true"></span></header><main class="course-derived-body"><section class="course-mobile-current"><div><small>今回のコース</small><strong>${escapeHtml(selected?.name||selected?.course?.name||"未選択")}</strong><span>${escapeHtml(selected?courseLibraryMeta(selected):"選択しなくても保存できます")}</span></div>${selected?"<b>使用中</b>":"<b>任意</b>"}</section><section class="course-mobile-saved"><div class="course-mobile-section-head"><div><h1>保存したコース</h1><small>${courses.length}件</small></div><a class="new course-library-list-new" href="#/course-editor?returnTo=${encodeURIComponent(returnTo)}">＋ 新規</a></div><div class="list">${ordered.length?ordered.map((preset)=>mobileCard(preset,returnTo,selectedId)).join(""):'<article class="course-mobile-empty"><strong>保存したコースはありません</strong><span>必要なときだけ追加できます。</span></article>'}</div><p class="course-library-status" data-course-manager-status role="status" aria-live="polite"></p></section><a class="course-mobile-gpx-link" href="#/gpx-analysis?returnTo=${encodeURIComponent(returnTo)}"><span><small>ルートファイル（GPX）を持っている場合</small><strong>ファイルから坂道を入力</strong></span><i>›</i></a></main></div></div>`;
}

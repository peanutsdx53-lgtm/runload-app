import { escapeHtml, renderPageHeading } from "../ui/commonComponents.js";
import { peekCourseSelection } from "../ui/flowSessionState.js";
import { primarySurfaceSummary, slopeSummary } from "../ui/coursePresentation.js";

function today() { return new Date().toISOString().slice(0,10); }
function courseFromPlan(plan) { return plan?.plannedSession?.course || { name:"", gradeKnowledge:"UNKNOWN", modelSurfaceClass:"UNKNOWN" }; }
function latestRunRecord(services) {
  return services.storage.records.loadAll().filter((r)=>r.activityType === "run").sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0] || null;
}
function courseSummary(course={}) {
  if (!course.name) return "未選択";
  return `${course.name}・${slopeSummary(course)}・${primarySurfaceSummary(course)}`;
}
function planCard(plan) {
  const session=plan.plannedSession||{}; const rest=plan.planType === "rest";
  return `<article class="frozen-plan-card"><div><small>${escapeHtml(plan.scheduledDate||"")}</small><strong>${escapeHtml(plan.title || (rest?"休養予定":"走行予定"))}</strong><span>${rest?"休養":`${escapeHtml(session.distanceKm||"—")} km・${escapeHtml(session.durationMinutes||"—")}分`}</span>${!rest&&session.course?.name?`<em>${escapeHtml(session.course.name)}</em>`:""}</div><div class="frozen-plan-card__actions"><a class="button button--secondary" href="#/plan?planId=${encodeURIComponent(plan.id)}">編集</a><a class="button button--primary" href="#/record-input?planId=${encodeURIComponent(plan.id)}">この予定で記録</a><button class="button button--danger" type="button" data-action="delete-plan" data-plan-id="${escapeHtml(plan.id)}">削除</button></div></article>`;
}
export function renderPlanScreen({ services, context }) {
  const planId=String(context?.parameters?.get("planId")||"");
  const editing=planId?services.storage.plans.findById(planId):null;
  const selected=peekCourseSelection("plan")?.preset || null;
  const course=selected?.course || courseFromPlan(editing);
  const session=editing?.plannedSession||{};
  const planType=editing?.planType||"run";
  const recent=latestRunRecord(services);
  const plans=services.storage.plans.loadAll();
  const scheduledDate=editing?.scheduledDate||today();
  return `<section class="screen screen--plan frozen-plan-screen">
    ${renderPageHeading({ eyebrow:"PLAN", title:"次の予定", description:"走る予定も休む予定も、本人が決めた内容を保存します。" })}
    <div class="frozen-plan-toolbar"><a class="button button--secondary" href="#/simulation?from=plan">条件を比べる</a></div>
    ${recent?`<section class="frozen-plan-reference"><div><small>前回の記録</small><strong>${escapeHtml(recent.distanceKm||"—")} km・${escapeHtml(recent.durationMinutes||"—")}分</strong></div><button type="button" class="button button--text" data-action="use-previous-facts" data-distance="${escapeHtml(recent.distanceKm||"")}" data-duration="${escapeHtml(recent.durationMinutes||"")}">入力の出発点にする</button></section>`:""}
    <form id="plan-form" class="record-form frozen-plan-form" novalidate>
      <input type="hidden" name="planId" value="${escapeHtml(editing?.id||"")}"><input type="hidden" name="courseJson" value="${escapeHtml(JSON.stringify(course))}"><input type="hidden" name="routePattern" value="${escapeHtml(course.routePattern||"UNKNOWN")}">
      <div class="form-messages" data-form-messages tabindex="-1" hidden></div>
      <section class="form-section"><div class="section-heading"><p>予定</p><h2>日付と種類</h2></div><div class="field-grid field-grid--two"><label class="field"><span>予定日</span><input type="date" name="scheduledDate" required value="${escapeHtml(scheduledDate)}"></label><fieldset class="field fieldset-field"><legend>予定の種類</legend><div class="segmented-control"><label><input type="radio" name="planType" value="run"${planType==="run"?" checked":""}><span>走る</span></label><label><input type="radio" name="planType" value="rest"${planType==="rest"?" checked":""}><span>休む</span></label></div></fieldset></div></section>
      <section class="form-section"><div class="section-heading"><p>CONDITIONS</p><h2>予定条件</h2><p>数値スコアではなく入力した予定事実を確認します。</p></div></section>
      <section class="form-section" data-plan-run-fields${planType==="rest"?" hidden":""}><div class="section-heading"><p>走る内容</p><h2>距離と予定時間</h2></div><div class="field-grid field-grid--two"><label class="field"><span>距離（km）</span><input name="distanceKm" type="number" min="0.01" step="0.01" value="${escapeHtml(session.distanceKm||"")}"></label><label class="field"><span>予定の実走時間（分）</span><input name="durationMinutes" type="number" min="0.01" step="0.1" value="${escapeHtml(session.durationMinutes||"")}"></label></div><label class="field"><span>走行形式（任意）</span><select name="runningFormat"><option value="UNKNOWN"${session.runningFormat==="UNKNOWN"||!session.runningFormat?" selected":""}>未設定</option><option value="CONTINUOUS_RUN"${session.runningFormat==="CONTINUOUS_RUN"?" selected":""}>途中で歩かず走る</option><option value="RUN_WALK"${session.runningFormat==="RUN_WALK"?" selected":""}>走りと歩きを混ぜる</option></select></label>
      <div class="frozen-plan-course"><div><small>コース・任意</small><strong>${escapeHtml(course.name||"未選択")}</strong><span>${escapeHtml(courseSummary(course))}</span></div><a class="button button--secondary" href="#/course-library?returnTo=${encodeURIComponent(`#/plan${planId?`?planId=${encodeURIComponent(planId)}`:""}`)}">選ぶ・作る</a></div></section>
      <section class="form-section"><label class="field"><span>メモ（任意）</span><textarea name="memo" rows="3" maxlength="500">${escapeHtml(editing?.memo||"")}</textarea></label><div class="form-submit-area"><button class="button button--primary" type="submit">${editing?"変更を保存":"予定を保存"}</button></div></section>
    </form>
    <section class="frozen-saved-plans"><div class="section-heading"><p>SAVED</p><h2>保存した予定</h2></div>${plans.length?plans.map(planCard).join(""):'<p class="muted-text">保存した予定はまだありません。</p>'}</section>
  </section>`;
}

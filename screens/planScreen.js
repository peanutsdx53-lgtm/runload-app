import { escapeHtml } from "../ui/commonComponents.js";
import { peekCourseSelection } from "../ui/flowSessionState.js";
import { primarySurfaceSummary, slopeSummary } from "../ui/coursePresentation.js";
import { formatLocalDate } from "../ui/recordPresentation.js";

function localTodayIso() { const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,"0"); const day=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function courseFromPlan(plan) { return plan?.plannedSession?.course || { name:"", gradeKnowledge:"UNKNOWN", modelSurfaceClass:"UNKNOWN" }; }
function latestRunRecord(services) { return services.storage.records.loadAll().filter((r)=>r.activityType === "run").sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0] || null; }
function courseSummary(course={}) { if (!course.name) return "未選択のままでも保存できます"; return `${slopeSummary(course)}・${primarySurfaceSummary(course)}`; }
function planTitle(plan={}) { const session=plan.plannedSession||{}; if(plan.planType==="rest"||session.activityType==="rest")return "休養予定"; const parts=[]; if(Number(session.distanceKm)>0)parts.push(`${Number(session.distanceKm).toFixed(1)} km`); if(Number(session.durationMinutes)>0)parts.push(`${Math.round(Number(session.durationMinutes))}分`); parts.push(session.course?.name||"コース未選択"); return parts.join("・"); }
function savedPlanCard(plan={}) { const rest=plan.planType==="rest"||plan.plannedSession?.activityType==="rest"; return `<article class="saved-card" data-plan-id="${escapeHtml(plan.id||"")}"><small>${escapeHtml(formatLocalDate(plan.scheduledDate||""))}・${rest?"休養予定":"走行予定"}</small><strong>${escapeHtml(planTitle(plan))}</strong><span>保存済み</span><div class="saved-actions">${rest?"":`<a class="plan-measure-link" href="#/run-measurement?planId=${encodeURIComponent(plan.id||"")}">この予定で測定</a><a href="#/record-input?planId=${encodeURIComponent(plan.id||"")}">手入力で記録</a>`}<a href="#/plan?planId=${encodeURIComponent(plan.id||"")}">編集</a><button type="button" data-action="delete-plan" data-plan-id="${escapeHtml(plan.id||"")}">削除</button></div></article>`; }
function dateDisplay(iso="") { return String(iso||"").replaceAll("-","/") || "未設定"; }

function planContextHref(context, planId="") {
  const query=new URLSearchParams();
  if(planId)query.set("planId",planId);
  ["sourceRecordId","recordId","regionId","from","roomOrigin"].forEach((key)=>{
    const value=String(context?.parameters?.get(key)||"");
    if(value)query.set(key,value);
  });
  return `#/plan${query.size?`?${query.toString()}`:""}`;
}

function planBackContext(context) {
  const from=String(context?.parameters?.get("from")||"");
  if(from!=="interpretation-room")return { href:"#/home", label:"Homeへ戻る" };
  const recordId=String(context?.parameters?.get("recordId")||context?.parameters?.get("sourceRecordId")||"");
  const regionId=String(context?.parameters?.get("regionId")||"");
  const roomOrigin=String(context?.parameters?.get("roomOrigin")||"result");
  const query=new URLSearchParams();
  if(recordId)query.set("recordId",recordId);
  query.set("origin",roomOrigin);
  if(regionId)query.set("regionId",regionId);
  return { href:`#/interpretation-room?${query.toString()}`, label:"結果の整理へ戻る" };
}

export function renderPlanScreen({ services, context }) {
  const planId=String(context?.parameters?.get("planId")||"");
  const editing=planId?services.storage.plans.findById(planId):null;
  const selected=peekCourseSelection("plan")?.preset || null;
  const course=selected?.course || courseFromPlan(editing);
  const session=editing?.plannedSession||{};
  const planType=editing?.planType||"run";
  const sourceRecordId=String(context?.parameters?.get("sourceRecordId")||context?.parameters?.get("recordId")||"");
  const requestedSource=sourceRecordId?services.storage.records.findById?.(sourceRecordId):null;
  const recent=requestedSource?.activityType==="run"?requestedSource:latestRunRecord(services);
  const backContext=planBackContext(context);
  const selfHref=planContextHref(context, planId);
  const sourceLabel=sourceRecordId?"今回の記録":"前回の記録";
  const carryLabel=sourceRecordId?"今回の記録から引き継いだ内容":"前回から引き継いだ内容";
  const simulationQuery=new URLSearchParams();
  simulationQuery.set("from","plan");
  simulationQuery.set("returnTo",selfHref);
  if(sourceRecordId)simulationQuery.set("recordId",sourceRecordId);
  const simulationHref=`#/simulation?${simulationQuery.toString()}`;
  const plans=services.storage.plans.loadAll().sort((a,b)=>String(a.scheduledDate||"").localeCompare(String(b.scheduledDate||"")));
  const scheduledDate=editing?.scheduledDate||localTodayIso();
  const nextCheck=recent?.reflectionContext?.nextCheckPoint || recent?.reflectionContext?.nextCheck || "";
  const distance=session.distanceKm ?? ""; const duration=session.durationMinutes ?? "";
  return `<div class="screen screen--plan screen-layout screen-layout--plan secondary-derived-screen">
    <header class="secondary-derived-head"><a class="secondary-derived-back" href="${escapeHtml(backContext.href)}">← ${escapeHtml(backContext.label)}</a><strong>次の予定</strong><span aria-hidden="true"></span></header>
    <div class="secondary-derived-body">
    <section class="page-head"><div><p class="eyebrow">NEXT PLAN</p><h1>次の予定</h1><p>次の走りや休養を、必要な項目だけで準備します。</p></div><span class="date-pill">${escapeHtml(formatLocalDate(scheduledDate))}</span></section><p class="visually-hidden">予定条件は利用者が入力した事実であり、数値スコアではなく入力した予定事実として扱います。おすすめ・安全判断・自動処方ではありません。</p>
    ${nextCheck?`<section class="carry"><i></i><div><small>${escapeHtml(carryLabel)}</small><strong>次のランで確認したいこと</strong><span>${escapeHtml(nextCheck)}</span></div></section>`:""}
    <form id="plan-form" class="layout" novalidate>
      <input type="hidden" name="planId" value="${escapeHtml(editing?.id||"")}"><input type="hidden" name="courseJson" value="${escapeHtml(JSON.stringify(course))}"><input type="hidden" name="routePattern" value="${escapeHtml(course.routePattern||"UNKNOWN")}">
      <input class="visually-hidden" type="radio" name="planType" value="run"${planType==="run"?" checked":""}><input class="visually-hidden" type="radio" name="planType" value="rest"${planType==="rest"?" checked":""}>
      <section class="panel"><div class="panel-head"><small>PLAN</small><h2>予定内容</h2><p>予定日・距離・時間を入力します。コースは任意です。</p></div><div class="panel-body">
        <div class="seg" role="group" aria-label="予定の種類"><button type="button" class="${planType==="run"?"active":""}" data-plan-type-button="run">走行</button><button type="button" class="${planType==="rest"?"active":""}" data-plan-type-button="rest">休養</button></div>
        <div class="plan-date-field"><div class="plan-date-label"><span>予定日</span><b>必須</b></div><label class="plan-date-control"><span data-plan-date-display aria-hidden="true">${escapeHtml(dateDisplay(scheduledDate))}</span><input name="scheduledDate" type="date" required value="${escapeHtml(scheduledDate)}" aria-label="予定日"></label></div>
        <div data-plan-run-fields${planType==="rest"?" hidden":""}>
          <div class="two"><label class="metric-field"><span>距離</span><div><input name="distanceKm" type="number" min="0.01" step="0.1" value="${escapeHtml(distance)}"><em>km</em></div></label><label class="metric-field"><span>実走予定時間</span><div><input name="durationMinutes" type="number" min="0.1" step="1" value="${escapeHtml(duration)}"><em>分</em></div></label></div>
          <div class="course-choice"><div><small>コース・任意</small><strong data-plan-course-name>${escapeHtml(course.name||"未選択")}</strong><span>${escapeHtml(courseSummary(course))}</span></div><a href="#/course-library?returnTo=${encodeURIComponent(selfHref)}">選ぶ・作る</a></div>
          ${recent?`<details class="details"><summary><div><strong>${escapeHtml(sourceLabel)}の距離・時間を使う</strong><span>${escapeHtml(recent.distanceKm||"—")} km・${escapeHtml(recent.durationMinutes||"—")}分を入力</span></div><i>⌄</i></summary><div class="details-body"><div class="quick quick--single"><button type="button" data-action="use-previous-facts" data-distance="${escapeHtml(recent.distanceKm||"")}" data-duration="${escapeHtml(recent.durationMinutes||"")}"><small>${escapeHtml(sourceLabel)}</small><strong>${escapeHtml(recent.distanceKm||"—")} km・${escapeHtml(recent.durationMinutes||"—")}分を入力</strong></button></div><p class="note">入力後に変更できます。自動提案ではありません。</p></div></details>`:""}
          <details class="details"><summary><div><strong>走る／歩くの予定</strong><span>途中で歩く場合だけ選択</span></div><i>⌄</i></summary><div class="details-body"><label class="field"><span>予定の走り方 <b>任意</b></span><select name="runningFormat"><option value="UNKNOWN"${!session.runningFormat||session.runningFormat==="UNKNOWN"?" selected":""}>未設定</option><option value="CONTINUOUS_RUN"${session.runningFormat==="CONTINUOUS_RUN"?" selected":""}>途中で歩かず走る予定</option><option value="RUN_WALK"${session.runningFormat==="RUN_WALK"?" selected":""}>走りと歩きを混ぜる予定</option></select></label></div></details>
          <a class="assist-link" href="${escapeHtml(simulationHref)}"><div><small>任意</small><strong>${escapeHtml(sourceRecordId?"この記録を基準に条件を比べる":"前回と条件を比べる")}</strong><span>条件を変えたときの12部位表示を確認</span></div><i>›</i></a>
        </div>
        <div data-plan-rest-fields${planType==="rest"?"":" hidden"}><div class="summary-card plan-rest-summary"><small>休養予定</small><strong>走行条件は入力しません</strong><span>予定日だけを確認して保存します。</span></div></div>
        <label class="field plan-memo-field"><span>メモ <b>任意</b></span><textarea name="memo" rows="3" maxlength="500">${escapeHtml(editing?.memo||"")}</textarea></label>
      </div></section>
      <aside class="panel confirm-panel"><div class="panel-head"><small>CHECK</small><h2>保存前の確認</h2><p>入力した予定だけを確認します。</p></div><div class="confirm"><div class="summary-card"><small data-plan-summary-kind>${planType==="rest"?"休養予定":"走行予定"}</small><strong data-plan-summary-date>${escapeHtml(formatLocalDate(scheduledDate))}</strong><span data-plan-summary-line>${planType==="rest"?"走行条件なし":`${distance||"—"} km・${duration||"—"}分・${course.name||"コース未選択"}`}</span></div><div class="summary-row" data-plan-summary-metrics${planType==="rest"?" hidden":""}><div><small>距離</small><strong data-plan-summary-distance>${escapeHtml(distance||"—")} km</strong></div><div><small>時間</small><strong data-plan-summary-duration>${escapeHtml(duration||"—")}分</strong></div><div><small>コース</small><strong data-plan-summary-course>${escapeHtml(course.name||"未選択")}</strong></div></div><div class="form-messages" data-form-messages tabindex="-1" hidden></div><button class="save" type="submit">${editing?"変更を保存する":"予定を保存する"}</button></div></aside>
    </form>
    <details class="saved"><summary><div><strong>保存した予定</strong><span>予定内容と実施状況を見る</span></div><span>${plans.length}件</span></summary><div class="saved-list">${plans.length?plans.map(savedPlanCard).join(""):'<div class="saved-card saved-card--empty"><strong>保存した予定はまだありません</strong><span>予定を保存すると、ここから実施状況の確認や編集ができます。</span></div>'}</div></details>
    </div>
  </div>`;
}

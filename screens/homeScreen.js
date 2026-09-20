import { escapeHtml } from "../ui/commonComponents.js";
import { formatNumber } from "../ui/recordPresentation.js";

function localTodayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shortDate(dateText = "") {
  const match = String(dateText).match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!match) return dateText || "—";
  return `${Number(match[1])}月${Number(match[2])}日`;
}

function paceLabel(record = {}) {
  const distance = Number(record.distanceKm || 0);
  const minutes = Number(record.durationMinutes || 0);
  if (!(distance > 0) || !(minutes > 0)) return "—";
  const seconds = Math.round((minutes * 60) / distance);
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function activityPill(record = {}) {
  return record.activityType === "rest" ? "REST" : "RUN";
}

function carryText(experience) {
  const text = String(experience?.record?.reflectionContext?.nextCheckPoint || "").trim();
  return text || "今日の記録で、次に確認したいことを残せます";
}

function renderFocus(experience, draft) {
  const record = experience?.record || null;
  const hasCarry = Boolean(String(record?.reflectionContext?.nextCheckPoint || "").trim());
  const sourceDate = record?.date ? shortDate(record.date) : "まだ記録なし";
  const sourceText = hasCarry ? `${sourceDate}の記録で自分が残した内容` : "今日の記録から次回へ引き継げます";
  return `<section class="focus"><div class="focus-top"><span class="marker" aria-hidden="true"><i></i></span><div class="focus-copy"><small>${hasCarry ? "前回から引き継いだ内容" : "今日の入口"}</small><h2>次のランで確認したいこと</h2><p class="focus-text">${escapeHtml(carryText(experience))}</p><p class="source"><b>${escapeHtml(sourceDate)}${record ? "の記録" : ""}</b><span>${escapeHtml(sourceText)}</span></p></div><span class="carry">次回へ引継ぎ</span></div><div class="focus-actions"><a class="primary" href="#/record-input">${draft ? "入力を再開する" : "今日の記録を始める"}</a></div></section>`;
}

function renderLatestRecord(experience) {
  if (!experience?.record) {
    return `<article class="card"><div class="card-head"><div><small>最新の保存記録</small><strong>まだありません</strong></div><span class="pill">—</span></div><div class="plan"><small>最初の記録</small><strong>今日の走行または休養</strong><span>記録すると、ここから結果を開けます</span></div></article>`;
  }
  const record = experience.record;
  if (record.activityType === "rest") {
    return `<article class="card"><div class="card-head"><div><small>最新の保存記録</small><strong>${escapeHtml(shortDate(record.date))}</strong></div><span class="pill">REST</span></div><div class="plan"><small>保存した内容</small><strong>休養</strong><span>走行による12部位結果は作成しません</span></div><a class="card-link" href="#/result?recordId=${encodeURIComponent(record.id)}"><span>記録を開く</span><span>›</span></a></article>`;
  }
  return `<article class="card"><div class="card-head"><div><small>最新の保存記録</small><strong>${escapeHtml(shortDate(record.date))}</strong></div><span class="pill">${activityPill(record)}</span></div><div class="metrics"><div><strong>${escapeHtml(formatNumber(record.distanceKm, 2))} km</strong><small>距離</small></div><div><strong>${escapeHtml(formatNumber(record.durationMinutes, 0))}分</strong><small>実際に走った時間</small></div><div><strong>${escapeHtml(paceLabel(record))}</strong><small>/km</small></div></div><a class="card-link" href="#/result?recordId=${encodeURIComponent(record.id)}"><span>結果を開く</span><span>›</span></a></article>`;
}

function nextPlan(services) {
  const today = localTodayIso();
  return services.storage.plans.loadAll().filter((plan) => String(plan.scheduledDate || "") >= today).sort((a,b) => String(a.scheduledDate).localeCompare(String(b.scheduledDate)))[0] || null;
}

function renderPlanCard(services) {
  const plan = nextPlan(services);
  if (!plan) {
    return `<article class="card"><div class="card-head"><div><small>次の予定</small><strong>未設定</strong></div><span class="pill">—</span></div><div class="plan"><small>予定している内容</small><strong>まだありません</strong><span>必要なときに作成できます</span></div><a class="card-link" href="#/plan"><span>予定を作る</span><span>›</span></a></article>`;
  }
  const planned = plan.plannedSession || {};
  const rest = plan.planType === "rest" || planned.activityType === "rest";
  const main = rest ? "休養" : (Number(planned.distanceKm) > 0 ? `${formatNumber(planned.distanceKm, 2)} km` : "走行予定");
  const details = rest ? "内容はあとで変更できます" : [planned.course?.name, Number(planned.durationMinutes) > 0 ? `${formatNumber(planned.durationMinutes,0)}分` : ""].filter(Boolean).join("・") || "内容はあとで変更できます";
  return `<article class="card"><div class="card-head"><div><small>次の予定</small><strong>${escapeHtml(shortDate(plan.scheduledDate))}</strong></div><span class="pill">保存済み</span></div><div class="plan"><small>予定している内容</small><strong>${escapeHtml(main)}</strong><span>${escapeHtml(details)}</span></div><a class="card-link" href="#/plan?planId=${encodeURIComponent(plan.id)}"><span>予定を開く</span><span>›</span></a></article>`;
}

export function renderHomeScreen({ services }) {
  const latestExperience = services.workflows.records.loadLatestExperience();
  const draft = services.storage.draft.load();
  const today = shortDate(localTodayIso());
  return `<div class="screen screen--home prototype-parity prototype-parity--home">
    <section class="page-head"><div><p class="eyebrow">TODAY</p><h1>今日の入口</h1><p>前回自分で残した1点を持ち越し、今日の記録へつなげます。</p></div><span class="date-badge">${escapeHtml(today)}</span></section>
    ${renderFocus(latestExperience, draft)}
    <section class="section"><div class="section-head"><div><small>CURRENT STATE</small><h2>最近の記録と次の予定</h2></div><a href="#/history">履歴を見る</a></div><div class="grid">${renderLatestRecord(latestExperience)}${renderPlanCard(services)}</div></section>
    ${latestExperience ? `<section class="section"><div class="section-head"><div><small>WHEN NEEDED</small><h2>必要なときに開く</h2></div></div><div class="support support--single"><a href="#/activation?recordId=${encodeURIComponent(latestExperience.record.id)}"><span aria-hidden="true">◇</span><div><strong>結果の活用</strong><small>振り返る・共有する・次を考える</small></div></a></div></section>` : ""}
  </div>`;
}

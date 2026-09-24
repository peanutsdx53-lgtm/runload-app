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

function homeState(experience, draft) {
  if (draft) return "draft";
  const record = experience?.record || null;
  if (!record) return "first";
  if (String(record.date || "") === localTodayIso()) {
    return record.activityType === "rest" ? "saved-rest" : "saved-run";
  }
  return "history";
}

function renderPcFocus(experience, draft) {
  const record = experience?.record || null;
  const state = homeState(experience, draft);
  const hasCarry = Boolean(String(record?.reflectionContext?.nextCheckPoint || "").trim());
  const sourceDate = record?.date ? shortDate(record.date) : "まだ記録なし";

  let eyebrow = hasCarry ? "前回から引き継いだ内容" : "今日の入口";
  let title = "次のランで確認したいこと";
  let body = carryText(experience);
  let sourceText = hasCarry ? `${sourceDate}の記録で自分が残した内容` : "今日の記録から次回へ引き継げます";
  let badge = "次回へ引継ぎ";
  let actions = `<a class="primary" href="#/record-input">今日の記録を始める</a>`;

  if (state === "first") {
    eyebrow = "記録なし";
    title = "走行または休養を記録する";
    body = "保存後に結果と履歴を確認できます";
    sourceText = "";
    badge = "はじめる";
  } else if (state === "draft") {
    eyebrow = "入力途中";
    title = "入力途中の記録があります";
    body = hasCarry ? carryText(experience) : "保存前の入力を続きから再開できます";
    sourceText = "保存済み記録とは分けて扱います";
    badge = "下書き";
    actions = `<a class="primary" href="#/record-input">入力を再開する</a>`;
  } else if (state === "saved-run") {
    eyebrow = "今日の記録";
    title = "今日の走行を保存しました";
    body = "今回の結果を確認し、必要な部位を詳しく見られます";
    sourceText = "今日保存した走行記録";
    badge = "保存済み";
    actions = `<a class="primary" href="#/result?recordId=${encodeURIComponent(record.id)}">今回の結果を見る</a>`;
  } else if (state === "saved-rest") {
    eyebrow = "今日の記録";
    title = "今日の休養を保存しました";
    body = "保存した休養記録を確認できます";
    sourceText = "今日保存した休養記録";
    badge = "保存済み";
    actions = `<a class="primary" href="#/result?recordId=${encodeURIComponent(record.id)}">休養記録を見る</a>`;
  }

  const sourceHtml = sourceText ? `<p class="source"><b>${escapeHtml(sourceDate)}${record ? "の記録" : ""}</b><span>${escapeHtml(sourceText)}</span></p>` : "";
  return `<section class="focus home-focus--pc focus--${escapeHtml(state)}"><div class="focus-top"><span class="marker" aria-hidden="true"><i></i></span><div class="focus-copy"><small>${escapeHtml(eyebrow)}</small><h2>${escapeHtml(title)}</h2><p class="focus-text">${escapeHtml(body)}</p>${sourceHtml}</div><span class="carry">${escapeHtml(badge)}</span></div><div class="focus-actions">${actions}</div></section>`;
}

function renderMobileFocus(experience, draft) {
  const record = experience?.record || null;
  const hasCarry = Boolean(String(record?.reflectionContext?.nextCheckPoint || "").trim());
  const sourceDate = record?.date ? shortDate(record.date) : "まだ記録なし";
  let sourceText = hasCarry ? `${sourceDate}の記録で自分が残した内容` : "次回に確認したいことを記録できます";
  return `<section class="focus home-focus--mobile"><div class="focus-top"><span class="marker" aria-hidden="true"><i></i></span><div class="focus-copy"><small>${hasCarry ? "前回から引き継いだ内容" : "今日の確認"}</small><h2>次のランで確認したいこと</h2><p class="focus-text">${escapeHtml(carryText(experience))}</p><p class="source"><b>${escapeHtml(sourceDate)}${record ? "の記録" : ""}</b><span>${escapeHtml(sourceText)}</span></p></div><span class="carry">次回へ引継ぎ</span></div><div class="focus-actions"><a class="primary" href="#/record-input">${draft ? "入力を再開する" : "今日の記録を始める"}</a><a class="secondary home-measure-link" href="#/run-measurement">GPSで測定</a></div></section>`;
}

function renderLatestRecord(experience) {
  if (!experience?.record) {
    return `<article class="card"><div class="card-head"><div><small>保存記録</small><strong>記録なし</strong></div><span class="pill">—</span></div><a class="card-link" href="#/record-input"><span>記録を始める</span><span>›</span></a></article>`;
  }
  const record = experience.record;
  if (record.activityType === "rest") {
    return `<article class="card"><div class="card-head"><div><small>保存記録</small><strong>${escapeHtml(shortDate(record.date))}</strong></div><span class="pill">REST</span></div><div class="plan"><strong>休養</strong></div><a class="card-link" href="#/result?recordId=${encodeURIComponent(record.id)}"><span>記録を開く</span><span>›</span></a></article>`;
  }
  return `<article class="card"><div class="card-head"><div><small>保存記録</small><strong>${escapeHtml(shortDate(record.date))}</strong></div><span class="pill">${activityPill(record)}</span></div><div class="metrics"><div><strong>${escapeHtml(formatNumber(record.distanceKm, 2))} km</strong><small>距離</small></div><div><strong>${escapeHtml(formatNumber(record.durationMinutes, 0))}分</strong><small>実際に走った時間</small></div><div><strong>${escapeHtml(paceLabel(record))}</strong><small>/km</small></div></div><div class="card-actions"><a class="card-link" href="#/result?recordId=${encodeURIComponent(record.id)}"><span>結果を見る</span><span>›</span></a><a class="card-link card-link--understanding" href="#/interpretation-room?recordId=${encodeURIComponent(record.id)}&origin=home"><span>結果を整理する</span><span>›</span></a></div></article>`;
}

function nextPlan(services) {
  const today = localTodayIso();
  return services.storage.plans.loadAll().filter((plan) => String(plan.scheduledDate || "") >= today).sort((a,b) => String(a.scheduledDate).localeCompare(String(b.scheduledDate)))[0] || null;
}

function renderPlanCard(services) {
  const plan = nextPlan(services);
  if (!plan) {
    return `<article class="card"><div class="card-head"><div><small>次の予定</small><strong>未設定</strong></div><span class="pill">—</span></div><a class="card-link" href="#/plan"><span>予定を作る</span><span>›</span></a></article>`;
  }
  const planned = plan.plannedSession || {};
  const rest = plan.planType === "rest" || planned.activityType === "rest";
  const main = rest ? "休養" : (Number(planned.distanceKm) > 0 ? `${formatNumber(planned.distanceKm, 2)} km` : "走行予定");
  const details = rest ? "内容はあとで変更できます" : [planned.course?.name, Number(planned.durationMinutes) > 0 ? `${formatNumber(planned.durationMinutes,0)}分` : ""].filter(Boolean).join("・") || "内容はあとで変更できます";
  return `<article class="card"><div class="card-head"><div><small>次の予定</small><strong>${escapeHtml(shortDate(plan.scheduledDate))}</strong></div><span class="pill">保存済み</span></div><div class="plan"><strong>${escapeHtml(main)}</strong><span>${escapeHtml(details)}</span></div><a class="card-link" href="#/plan?planId=${encodeURIComponent(plan.id)}"><span>予定を開く</span><span>›</span></a></article>`;
}

export function renderHomeScreen({ services }) {
  const latestExperience = services.workflows.records.loadLatestExperience();
  const draft = services.storage.draft.load();
  const state = homeState(latestExperience, draft);
  return `<div class="screen screen--home screen-layout screen-layout--home home-state--${escapeHtml(state)}" data-home-state="${escapeHtml(state)}">
    ${renderMobileFocus(latestExperience, draft)}
    ${renderPcFocus(latestExperience, draft)}
    <section class="section"><div class="section-head"><div><h2>記録と予定</h2></div></div><div class="grid">${renderLatestRecord(latestExperience)}${renderPlanCard(services)}</div></section>
  </div>`;
}

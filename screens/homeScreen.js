import { escapeHtml } from "../ui/commonComponents.js";
import { formatNumber } from "../ui/recordPresentation.js";
import { findSavedRunMeasurement } from "../ui/runMeasurementState.js";
import { achievementSummary } from "../ui/mobileAchievements.js";
import { buildDynamicHomeCards, buildPersonalChallenge, resolveAmbientProfile } from "../ui/mobileHomeExperience.js";
import { buildSelfUnderstandingView } from "../core/selfUnderstandingCore.js";

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

function homeConfirmationTheme(services) {
  const experiences = services?.workflows?.records?.loadAllExperiences?.() || [];
  const rof = new Map(experiences.filter((experience) => experience?.record?.activityType === "run").map((experience) => [experience.record.id, services?.fatigue?.summarizeRun?.(experience.record.id) || null]));
  const view = buildSelfUnderstandingView({ allExperiences: experiences, threads: services?.storage?.selfUnderstandingThreads?.loadAll?.() || [], rofSummariesByRecordId: rof });
  return view.watching.find((thread) => thread.hasNewEligibleData) || null;
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
  const sourceText = hasCarry ? `${sourceDate}の記録で自分が残した内容` : "結果を整理すると、続けて見たい点だけを確認テーマにできます";
  return `<section class="focus home-focus--mobile"><div class="focus-top"><span class="marker" aria-hidden="true"><i></i></span><div class="focus-copy"><small>${hasCarry ? "以前の確認" : "今日の確認"}</small><h2>次のランで確認したいこと</h2><p class="focus-text">${escapeHtml(carryText(experience))}</p><p class="source"><b>${escapeHtml(sourceDate)}${record ? "の記録" : ""}</b><span>${escapeHtml(sourceText)}</span></p></div><span class="carry">次回へ</span></div><div class="focus-actions"><a class="primary" href="#/record-input">${draft ? "入力を再開する" : "今日の記録を始める"}</a><a class="secondary home-measure-link" href="#/run-measurement">GPSで測定</a></div></section>`;
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

function renderPcConfirmationCard(theme) {
  if (!theme?.hasNewEligibleData) return "";
  return `<article class="card self-understanding-home-card"><div class="card-head"><div><small>確認中のテーマ</small><strong>新しい記録があります</strong></div><span class="pill">${escapeHtml(String(theme.newCount || 1))}件</span></div><div class="plan"><strong>${escapeHtml(theme.title || "確認テーマ")}</strong><span>あなたが続けて見ると決めた内容です</span></div><a class="card-link" href="#/history?view=checks"><span>確認中のことを見る</span><span>›</span></a></article>`;
}

function renderMobileConfirmationBanner(theme) {
  if (!theme?.hasNewEligibleData) return "";
  return `<a class="mobile-home-confirmation-banner" data-mobile-confirmation-banner href="#/history?view=checks"><span aria-hidden="true">⚑</span><span><small>確認中のテーマに新しい記録</small><strong>${escapeHtml(theme.title || "確認テーマ")}</strong><em>新しく比較できる記録 ${escapeHtml(String(theme.newCount || 1))}件</em></span><i aria-hidden="true">›</i></a>`;
}

function nextPlan(services) {
  const today = localTodayIso();
  return services.storage.plans.loadAll().filter((plan) => String(plan.scheduledDate || "") >= today).sort((a, b) => String(a.scheduledDate).localeCompare(String(b.scheduledDate)))[0] || null;
}

function renderPlanCard(services) {
  const plan = nextPlan(services);
  if (!plan) {
    return `<article class="card"><div class="card-head"><div><small>次の予定</small><strong>未設定</strong></div><span class="pill">—</span></div><a class="card-link" href="#/plan"><span>予定を作る</span><span>›</span></a></article>`;
  }
  const planned = plan.plannedSession || {};
  const rest = plan.planType === "rest" || planned.activityType === "rest";
  const main = rest ? "休養" : (Number(planned.distanceKm) > 0 ? `${formatNumber(planned.distanceKm, 2)} km` : "走行予定");
  const details = rest ? "内容はあとで変更できます" : [planned.course?.name, Number(planned.durationMinutes) > 0 ? `${formatNumber(planned.durationMinutes, 0)}分` : ""].filter(Boolean).join("・") || "内容はあとで変更できます";
  return `<article class="card"><div class="card-head"><div><small>次の予定</small><strong>${escapeHtml(shortDate(plan.scheduledDate))}</strong></div><span class="pill">保存済み</span></div><div class="plan"><strong>${escapeHtml(main)}</strong><span>${escapeHtml(details)}</span></div><a class="card-link" href="#/plan?planId=${encodeURIComponent(plan.id)}"><span>予定を開く</span><span>›</span></a></article>`;
}

function parseLocalDate(dateText = "") {
  const match = String(dateText).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

function mondayOfWeek(date = new Date()) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

function weeklySummary(services) {
  const start = mondayOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const records = services.storage.records.loadAll().filter((record) => {
    if (record.activityType !== "run") return false;
    const date = parseLocalDate(record.date);
    return date && date >= start && date < end;
  });
  const totalDistanceKm = records.reduce((sum, record) => sum + Math.max(0, Number(record.distanceKm || 0)), 0);
  const totalDurationMinutes = records.reduce((sum, record) => sum + Math.max(0, Number(record.durationMinutes || 0)), 0);
  let estimatedKcal = 0;
  let kcalCount = 0;
  records.forEach((record) => {
    const kcal = Number(findSavedRunMeasurement(record.id)?.energyEstimate?.estimatedKcal);
    if (!Number.isFinite(kcal) || kcal < 0) return;
    estimatedKcal += kcal;
    kcalCount += 1;
  });
  return { count: records.length, totalDistanceKm, totalDurationMinutes, estimatedKcal, kcalCount };
}

function recentDistanceChange(services) {
  const runs = services.storage.records.loadAll()
    .filter((record) => record.activityType === "run")
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.id || "").localeCompare(String(a.id || "")));
  if (runs.length < 2) return null;
  const latest = runs[0];
  const previous = runs[1];
  const delta = Number(latest.distanceKm || 0) - Number(previous.distanceKm || 0);
  return { latest, previous, delta };
}

function renderOverviewWeek(services) {
  const summary = weeklySummary(services);
  const energy = summary.kcalCount > 0 ? `${Math.round(summary.estimatedKcal)} kcal` : "—";
  return `<a class="mobile-home-overview-card mobile-home-overview-card--week" href="#/history"><span class="mobile-home-overview-card__label">今週の記録</span><strong>${escapeHtml(formatNumber(summary.totalDistanceKm, 1))}<small> km</small></strong><div class="mobile-home-overview-card__metrics"><span>${summary.count}回</span><span>${escapeHtml(formatNumber(summary.totalDurationMinutes, 0))}分</span><span>推定消費 ${escapeHtml(energy)}</span></div></a>`;
}

function renderOverviewPlan(services) {
  const plan = nextPlan(services);
  if (!plan) return `<a class="mobile-home-overview-card mobile-home-overview-card--small" href="#/plan"><span class="mobile-home-overview-card__label">次の予定</span><strong>未設定</strong><span class="mobile-home-overview-card__note">予定を作る</span></a>`;
  const planned = plan.plannedSession || {};
  const rest = plan.planType === "rest" || planned.activityType === "rest";
  const detail = rest ? "休養" : Number(planned.distanceKm) > 0 ? `${formatNumber(planned.distanceKm, 1)} km` : "走行予定";
  return `<a class="mobile-home-overview-card mobile-home-overview-card--small" href="#/plan?planId=${encodeURIComponent(plan.id)}"><span class="mobile-home-overview-card__label">次の予定</span><strong>${escapeHtml(shortDate(plan.scheduledDate))}</strong><span class="mobile-home-overview-card__note">${escapeHtml(detail)}</span></a>`;
}

function renderOverviewLatest(experience) {
  const record = experience?.record || null;
  if (!record) return `<a class="mobile-home-overview-card mobile-home-overview-card--small" href="#/record-input"><span class="mobile-home-overview-card__label">最新の記録</span><strong>記録なし</strong><span class="mobile-home-overview-card__note">記録する</span></a>`;
  const detail = record.activityType === "rest" ? "休養" : Number(record.distanceKm) > 0 ? `${formatNumber(record.distanceKm, 1)} km` : "走行";
  return `<a class="mobile-home-overview-card mobile-home-overview-card--small" href="#/result?recordId=${encodeURIComponent(record.id)}"><span class="mobile-home-overview-card__label">最新の記録</span><strong>${escapeHtml(shortDate(record.date))}</strong><span class="mobile-home-overview-card__note">${escapeHtml(detail)}</span></a>`;
}

function renderOverviewChange(services) {
  const change = recentDistanceChange(services);
  if (!change) return `<a class="mobile-home-overview-card mobile-home-overview-card--wide" href="#/history"><span class="mobile-home-overview-card__label">前回との距離差</span><strong>—</strong><span class="mobile-home-overview-card__note">2回目の走行記録から表示</span></a>`;
  const sign = change.delta > 0 ? "+" : "";
  return `<a class="mobile-home-overview-card mobile-home-overview-card--wide" href="#/history"><span class="mobile-home-overview-card__label">前回との距離差</span><strong>${escapeHtml(`${sign}${formatNumber(change.delta, 1)} km`)}</strong><span class="mobile-home-overview-card__note">${escapeHtml(shortDate(change.previous.date))} → ${escapeHtml(shortDate(change.latest.date))}</span></a>`;
}

function renderOverviewAchievements(services) {
  const summary = achievementSummary(services);
  const note = summary.latest ? `最新：${summary.latest.title}` : "記録に応じて自動で反映";
  return `<a class="mobile-home-overview-card mobile-home-overview-card--wide mobile-home-overview-card--achievement" href="#/achievements"><span class="mobile-home-overview-card__label">実績</span><strong>${summary.unlockedCount}<small> / ${summary.totalCount}</small></strong><span class="mobile-home-overview-card__note">${escapeHtml(note)}</span></a>`;
}

function renderOverviewChallenge(services) {
  const challenge = buildPersonalChallenge(services);
  if (!challenge) return "";
  const progress = Math.round(challenge.progress * 100);
  const note = challenge.complete ? "達成" : `${Math.min(challenge.value, challenge.target)} / ${challenge.target}`;
  return `<a class="mobile-home-overview-card mobile-home-overview-card--wide mobile-home-overview-card--challenge mobile-home-tone-${escapeHtml(challenge.tone)}" href="${escapeHtml(challenge.href)}"><span class="mobile-home-overview-card__label">今週のチャレンジ</span><div class="mobile-home-challenge-row"><strong>${escapeHtml(challenge.title)}</strong><span>${escapeHtml(note)}</span></div><span class="mobile-home-challenge-progress" aria-label="進行 ${progress}%"><i style="--challenge-progress:${progress}%"></i></span><span class="mobile-home-overview-card__note">${escapeHtml(challenge.short)}</span></a>`;
}

function renderMobileOverviewPage({ services, latestExperience }) {
  return `<section class="mobile-home-overview" aria-label="記録概要"><header class="mobile-home-overview__header"><button type="button" class="mobile-home-overview__back" data-home-hub-target="0" aria-label="アプリ一覧へ戻る">‹ アプリ</button><div><small>RUNLOAD</small><h1>記録概要</h1></div><span aria-hidden="true"></span></header><div class="mobile-home-overview-grid">${renderOverviewWeek(services)}<div class="mobile-home-overview-pair">${renderOverviewPlan(services)}${renderOverviewLatest(latestExperience)}</div>${renderOverviewChallenge(services)}${renderOverviewChange(services)}${renderOverviewAchievements(services)}</div></section>`;
}

function renderMobileLauncherItem({ href, label, emoji, tone = "blue", dock = false }) {
  const className = dock ? "mobile-home-dock__item" : "mobile-home-app";
  const iconClass = dock ? "mobile-home-dock__icon" : "mobile-home-app__icon";
  const labelClass = dock ? "mobile-home-dock__label" : "mobile-home-app__label";
  const iconMarkup = `<span class="mobile-home-emoji" aria-hidden="true">${escapeHtml(emoji)}</span>`;
  const content = `<span class="${iconClass} mobile-home-tone--${escapeHtml(tone)}">${iconMarkup}</span><span class="${labelClass}">${escapeHtml(label)}</span>`;
  return `<div class="${className} mobile-home-launcher" data-home-launcher><div class="mobile-home-app__launch" data-home-launch data-home-href="${escapeHtml(href)}" role="link" tabindex="0" aria-label="${escapeHtml(label)}">${content}</div><button type="button" class="mobile-home-app-remove" data-home-app-remove aria-label="${escapeHtml(label)}をホームから外す">−</button></div>`;
}

function renderMobileTodayWidget(experience, draft) {
  const state = homeState(experience, draft);
  const record = experience?.record || null;
  if (state === "draft") {
    return `<a class="mobile-home-widget mobile-home-widget--wide mobile-home-widget--today mobile-home-widget--state-draft" href="#/record-input"><small>今日・入力途中</small><strong>入力途中の記録があります</strong><span>続きから保存まで進める</span></a>`;
  }
  if (state === "saved-rest" && record) {
    return `<a class="mobile-home-widget mobile-home-widget--wide mobile-home-widget--today mobile-home-widget--state-saved-rest" href="#/result?recordId=${encodeURIComponent(record.id)}"><small>今日・保存済み</small><strong>休養を記録しました</strong><span>保存した内容を確認する</span></a>`;
  }
  if (state === "saved-run" && record) {
    const summary = [Number(record.distanceKm) > 0 ? `${formatNumber(record.distanceKm, 2)} km` : "", Number(record.durationMinutes) > 0 ? `${formatNumber(record.durationMinutes, 0)}分` : ""].filter(Boolean).join(" ・ ");
    return `<a class="mobile-home-widget mobile-home-widget--wide mobile-home-widget--today mobile-home-widget--state-saved-run" href="#/result?recordId=${encodeURIComponent(record.id)}"><small>今日・保存済み</small><strong>${escapeHtml(summary || "走行を保存しました")}</strong><span>今回の結果を振り返る</span></a>`;
  }
  if (state === "history" && record) {
    const previousSummary = record.activityType === "rest"
      ? `${shortDate(record.date)}・休養`
      : [shortDate(record.date), Number(record.distanceKm) > 0 ? `${formatNumber(record.distanceKm, 2)} km` : ""].filter(Boolean).join(" ・ ");
    return `<a class="mobile-home-widget mobile-home-widget--wide mobile-home-widget--today mobile-home-widget--state-history" href="#/record-input"><small>今日</small><strong>今日の記録を始める</strong><span>前回 ${escapeHtml(previousSummary)} ／ GPS測定も利用できます</span></a>`;
  }
  return `<a class="mobile-home-widget mobile-home-widget--wide mobile-home-widget--today mobile-home-widget--state-first" href="#/record-input"><small>はじめての記録</small><strong>はじめの記録を残す</strong><span>手入力またはGPS測定から始められます</span></a>`;
}

function renderMobilePlanWidget(services) {
  const plan = nextPlan(services);
  if (!plan) {
    return `<a class="mobile-home-widget" href="#/plan"><small>次の予定</small><strong>未設定</strong><span>予定を作る</span></a>`;
  }
  const planned = plan.plannedSession || {};
  const rest = plan.planType === "rest" || planned.activityType === "rest";
  const summary = rest ? "休養" : (Number(planned.distanceKm) > 0 ? `${formatNumber(planned.distanceKm, 2)} km` : "走行予定");
  return `<a class="mobile-home-widget" href="#/plan?planId=${encodeURIComponent(plan.id)}"><small>次の予定</small><strong>${escapeHtml(shortDate(plan.scheduledDate))}</strong><span>${escapeHtml(summary)}</span></a>`;
}

function renderDynamicHomeWidget(card) {
  const progress = Number.isFinite(Number(card?.progress))
    ? `<span class="mobile-home-dynamic-progress" aria-hidden="true"><i style="--dynamic-progress:${Math.round(Number(card.progress) * 100)}%"></i></span>`
    : "";
  return `<a class="mobile-home-widget mobile-home-widget--dynamic mobile-home-widget--tone-${escapeHtml(card?.tone || "default")}" href="${escapeHtml(card?.href || "#/home")}" data-dynamic-widget="${escapeHtml(card?.kind || "default")}"><small>${escapeHtml(card?.label || "記録")}</small><strong>${escapeHtml(card?.title || "—")}</strong><span>${escapeHtml(card?.note || "")}</span>${progress}</a>`;
}

function renderDynamicHomeWidgets(services, latestExperience) {
  const cards = buildDynamicHomeCards(services, latestExperience);
  if (!cards.length) return `${renderMobilePlanWidget(services)}<a class="mobile-home-widget" href="#/history"><small>最近の変化</small><strong>履歴</strong><span>記録の推移を見る</span></a>`;
  return cards.map(renderDynamicHomeWidget).join("");
}

function renderMobileHomeOs({ services, latestExperience, draft, confirmationTheme = null }) {
  const apps = [
    { href: "#/simulation?from=home", label: "条件比較", emoji: "⚖️", tone: "violet" },
    { href: "#/plan", label: "予定", emoji: "📅", tone: "orange" },
    { href: "#/reading?origin=home", label: "読みもの", emoji: "📖", tone: "green" },
    { href: "#/consultation?from=home", label: "共有", emoji: "📤", tone: "cyan" },
    { href: "#/settings?from=home", label: "設定", emoji: "⚙️", tone: "gray" },
  ];
  const optionalApps = [
    { href: "#/location-note", label: "地点メモ", emoji: "📍", tone: "cyan", optional: true },
    { href: "#/quick-note", label: "1分メモ", emoji: "📝", tone: "violet", optional: true },
    { href: "#/gear-note", label: "装備メモ", emoji: "🎒", tone: "orange", optional: true },
    { href: "#/departure-check", label: "出発チェック", emoji: "✅", tone: "green", optional: true },
    { href: "#/fuel-note", label: "補給メモ", emoji: "💧", tone: "cyan", optional: true },
    { href: "#/photo-note", label: "写真メモ", emoji: "📷", tone: "gray", optional: true },
    { href: "#/pace-tool", label: "ペース換算", emoji: "🧮", tone: "violet", optional: true },
  ];
  const dock = [
    { href: "#/record-input", label: "記録", emoji: "📒", tone: "blue" },
    { href: "#/run-measurement", label: "測定", emoji: "⏱️", tone: "red" },
    { href: "#/history", label: "履歴", emoji: "🕘", tone: "indigo" },
    { href: "#/course-library?returnTo=%23%2Fhome", label: "コース", emoji: "🗺️", tone: "green" },
  ];
  return `<section class="mobile-home-os" aria-label="スマホホーム">
    <header class="mobile-home-os__header">
      <div><small>RUNNING RECORD</small><h1>走行記録</h1></div>
      <div class="mobile-home-os__header-actions"><button type="button" class="mobile-home-overview-open" data-home-hub-target="1" aria-label="記録概要を開く">概要 ›</button><span class="mobile-home-os__status" aria-label="ホーム">Home</span></div>
    </header>
    ${renderMobileConfirmationBanner(confirmationTheme)}
    <div class="mobile-home-widgets" aria-label="ウィジェット">
      ${renderMobileTodayWidget(latestExperience, draft)}
      ${renderDynamicHomeWidgets(services, latestExperience)}
    </div>
    <section class="mobile-home-apps" aria-label="機能">
      ${apps.map((item) => renderMobileLauncherItem(item)).join("")}
    </section>
    <div class="mobile-home-app-catalog" data-home-app-catalog hidden aria-hidden="true">
      ${optionalApps.map((item) => renderMobileLauncherItem(item)).join("")}
    </div>
    <nav class="mobile-home-dock" aria-label="よく使う機能">
      ${dock.map((item) => renderMobileLauncherItem({ ...item, dock: true })).join("")}
    </nav>
  </section>`;
}

export function renderHomeScreen({ services }) {
  const latestExperience = services.workflows.records.loadLatestExperience();
  const draft = services.storage.draft.load();
  const state = homeState(latestExperience, draft);
  const challenge = buildPersonalChallenge(services);
  const ambient = resolveAmbientProfile({ latestExperience, draft, challenge });
  const confirmationTheme = homeConfirmationTheme(services);
  return `<div class="screen screen--home screen-layout screen-layout--home home-state--${escapeHtml(state)} mobile-home-ambient mobile-home-ambient--${escapeHtml(ambient.period)} mobile-home-ambient--${escapeHtml(ambient.signal)}" data-home-state="${escapeHtml(state)}" data-ambient-period="${escapeHtml(ambient.period)}" data-ambient-signal="${escapeHtml(ambient.signal)}" style="--ambient-challenge:${ambient.challengeProgress}%">
    <div class="mobile-home-hub" data-home-hub data-home-hub-page="0"><div class="mobile-home-hub-viewport" data-home-hub-viewport><div class="mobile-home-hub-track"><div class="mobile-home-hub-page mobile-home-hub-page--apps" data-home-hub-page-index="0">${renderMobileHomeOs({ services, latestExperience, draft, confirmationTheme })}</div><div class="mobile-home-hub-page mobile-home-hub-page--overview" data-home-hub-page-index="1">${renderMobileOverviewPage({ services, latestExperience })}</div></div></div></div>
    <div class="home-desktop-legacy">
      ${renderMobileFocus(latestExperience, draft)}
      ${renderPcFocus(latestExperience, draft)}
      <section class="section"><div class="section-head"><div><h2>記録と予定</h2></div></div><div class="grid">${renderLatestRecord(latestExperience)}${renderPcConfirmationCard(confirmationTheme)}${renderPlanCard(services)}</div></section>
    </div>
  </div>`;
}

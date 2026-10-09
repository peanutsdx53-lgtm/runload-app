import { mondayOfWeekAtNoon as mondayOfWeek } from "../../ui/mobileDateUtilities.js";
import { escapeHtml } from "../../ui/commonComponents.js";
import { formatNumber } from "../../ui/recordPresentation.js";
import { findSavedRunMeasurement } from "../../ui/runMeasurementState.js";
import { achievementSummary } from "../../ui/mobileAchievements.js";
import { buildDynamicHomeCards, buildPersonalChallenge, resolveAmbientProfile } from "../../ui/mobileHomeExperience.js";
import { homeConfirmationTheme, homeState, nextPlan, shortDate } from "../shared/homeScreenSupport.js";

function renderMobileConfirmationBanner(theme) {
  if (!theme?.hasNewEligibleData) return "";
  return `<a class="mobile-home-confirmation-banner" data-mobile-confirmation-banner href="#/history?view=checks" aria-label="次回見ることに新しい記録 ${escapeHtml(String(theme.newCount || 1))}件。確認の続きを見る"><span aria-hidden="true">⚑</span><span><small>次回見ること</small><strong>新しい記録 ${escapeHtml(String(theme.newCount || 1))}件</strong></span><i aria-hidden="true">›</i></a>`;
}

function parseLocalDate(dateText = "") {
  const match = String(dateText).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
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
  return `<section class="mobile-home-overview" aria-label="記録概要"><header class="mobile-home-overview__header"><button type="button" class="mobile-home-overview__back" data-home-hub-target="0" aria-label="アプリ一覧へ戻る">‹ アプリ</button><div><small>記録のまとめ</small><h1>記録概要</h1></div><span aria-hidden="true"></span></header><div class="mobile-home-overview-grid">${renderOverviewWeek(services)}<div class="mobile-home-overview-pair">${renderOverviewPlan(services)}${renderOverviewLatest(latestExperience)}</div>${renderOverviewChallenge(services)}${renderOverviewChange(services)}${renderOverviewAchievements(services)}</div></section>`;
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
    { href: "#/departure-check", label: "出発チェック", emoji: "✅", tone: "green", optional: true },
    { href: "#/pace-tool", label: "ペース換算", emoji: "🧮", tone: "violet", optional: true },
  ];
  const dock = [
    { href: "#/record-input", label: "記録", emoji: "📒", tone: "blue" },
    { href: "#/run-measurement", label: "測定", emoji: "⏱️", tone: "red" },
    { href: "#/history", label: "履歴", emoji: "🕘", tone: "indigo" },
    { href: "#/course-library?returnTo=%23%2Fhome", label: "コース", emoji: "🗺️", tone: "green" },
  ];
  return `<section class="mobile-home-os" aria-label="ホーム">
    <header class="mobile-home-os__header">
      <div><small>今日の記録</small><h1>走行記録</h1></div>
      <div class="mobile-home-os__header-actions"><button type="button" class="mobile-home-overview-open" data-home-hub-target="1" aria-label="記録概要を開く">概要</button><span class="mobile-home-os__status" aria-label="ホーム">ホーム</span></div>
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
  </div>`;
}

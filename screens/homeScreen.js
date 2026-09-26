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

function mobileHomeIcon(name) {
  const paths = {
    record: '<path d="M7 17.5h3.5L18 10l-3-3-7.5 7.5V18Zm6.5-9 3 3"/>',
    measure: '<path d="M12 3v3m0 12v3M3 12h3m12 0h3"/><circle cx="12" cy="12" r="4.5"/>',
    history: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9M4.5 5v4h4M12 8v4l3 2"/>',
    course: '<path d="M6 18c3-5 3-7 6-7s3 4 6-5"/><circle cx="6" cy="18" r="1.5"/><circle cx="18" cy="6" r="1.5"/>',
    simulation: '<path d="M5 7h14M7 12h10M9 17h6"/><circle cx="9" cy="7" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="11" cy="17" r="1.6"/>',
    plan: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4m8-4v4M4 10h16m-11 4h2m2 0h2"/>',
    reading: '<path d="M5 5.5h6c1.2 0 2 .8 2 2v11c0-1.2-.8-2-2-2H5Zm14 0h-4c-1.2 0-2 .8-2 2v11c0-1.2.8-2 2-2h4Z"/>',
    share: '<circle cx="7" cy="12" r="2"/><circle cx="17" cy="6" r="2"/><circle cx="17" cy="18" r="2"/><path d="m9 11 6-4m-6 6 6 4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2m0 13v2M3.5 12h2m13 0h2M6 6l1.4 1.4m9.2 9.2L18 18M18 6l-1.4 1.4m-9.2 9.2L6 18"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || paths.settings}</svg>`;
}

function renderMobileLauncherItem({ href, label, icon, tone = "blue", dock = false }) {
  const className = dock ? "mobile-home-dock__item" : "mobile-home-app";
  const iconClass = dock ? "mobile-home-dock__icon" : "mobile-home-app__icon";
  return `<a class="${className}" href="${escapeHtml(href)}"><span class="${iconClass} mobile-home-tone--${escapeHtml(tone)}">${mobileHomeIcon(icon)}</span><span class="${dock ? "mobile-home-dock__label" : "mobile-home-app__label"}">${escapeHtml(label)}</span></a>`;
}

function renderMobileTodayWidget(experience, draft) {
  const record = experience?.record || null;
  if (draft) {
    return `<a class="mobile-home-widget mobile-home-widget--wide" href="#/record-input"><small>今日</small><strong>入力途中の記録があります</strong><span>続きから入力する</span></a>`;
  }
  if (record && String(record.date || "") === localTodayIso()) {
    if (record.activityType === "rest") {
      return `<a class="mobile-home-widget mobile-home-widget--wide" href="#/result?recordId=${encodeURIComponent(record.id)}"><small>今日</small><strong>休養を記録しました</strong><span>記録を見る</span></a>`;
    }
    const summary = [Number(record.distanceKm) > 0 ? `${formatNumber(record.distanceKm, 2)} km` : "", Number(record.durationMinutes) > 0 ? `${formatNumber(record.durationMinutes, 0)}分` : ""].filter(Boolean).join(" ・ ");
    return `<a class="mobile-home-widget mobile-home-widget--wide" href="#/result?recordId=${encodeURIComponent(record.id)}"><small>今日の走行</small><strong>${escapeHtml(summary || "保存済み")}</strong><span>今回の結果を見る</span></a>`;
  }
  return `<a class="mobile-home-widget mobile-home-widget--wide" href="#/record-input"><small>今日</small><strong>まだ記録はありません</strong><span>記録を始める</span></a>`;
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

function renderMobileHomeOs({ services, latestExperience, draft }) {
  const apps = [
    { href: "#/simulation?from=home", label: "条件比較", icon: "simulation", tone: "violet" },
    { href: "#/plan", label: "予定", icon: "plan", tone: "orange" },
    { href: "#/reading?origin=home", label: "読みもの", icon: "reading", tone: "green" },
    { href: "#/consultation?from=home", label: "共有", icon: "share", tone: "cyan" },
    { href: "#/settings?from=home", label: "設定", icon: "settings", tone: "gray" },
  ];
  const dock = [
    { href: "#/record-input", label: "記録", icon: "record", tone: "blue" },
    { href: "#/run-measurement", label: "測定", icon: "measure", tone: "red" },
    { href: "#/history", label: "履歴", icon: "history", tone: "indigo" },
    { href: "#/course-library?returnTo=%23%2Fhome", label: "コース", icon: "course", tone: "green" },
  ];
  return `<section class="mobile-home-os" aria-label="スマホホーム">
    <header class="mobile-home-os__header">
      <div><small>RUNNING RECORD</small><h1>走行記録</h1><small class="mobile-home-os__version">TEST v2026.09.26-01</small></div>
      <span class="mobile-home-os__status" aria-label="ホーム">Home</span>
    </header>
    <div class="mobile-home-widgets" aria-label="ウィジェット">
      ${renderMobileTodayWidget(latestExperience, draft)}
      ${renderMobilePlanWidget(services)}
      <a class="mobile-home-widget" href="#/history"><small>最近の変化</small><strong>履歴</strong><span>記録の推移を見る</span></a>
    </div>
    <section class="mobile-home-apps" aria-label="機能">
      ${apps.map((item) => renderMobileLauncherItem(item)).join("")}
    </section>
    <nav class="mobile-home-dock" aria-label="よく使う機能">
      ${dock.map((item) => renderMobileLauncherItem({ ...item, dock: true })).join("")}
    </nav>
  </section>`;
}

export function renderHomeScreen({ services }) {
  const latestExperience = services.workflows.records.loadLatestExperience();
  const draft = services.storage.draft.load();
  const state = homeState(latestExperience, draft);
  return `<div class="screen screen--home screen-layout screen-layout--home home-state--${escapeHtml(state)}" data-home-state="${escapeHtml(state)}">
    ${renderMobileHomeOs({ services, latestExperience, draft })}
    <div class="home-desktop-legacy">
      ${renderMobileFocus(latestExperience, draft)}
      ${renderPcFocus(latestExperience, draft)}
      <section class="section"><div class="section-head"><div><h2>記録と予定</h2></div></div><div class="grid">${renderLatestRecord(latestExperience)}${renderPlanCard(services)}</div></section>
    </div>
  </div>`;
}

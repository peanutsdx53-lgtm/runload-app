import { parseLocalDateAtNoon as parseLocalDate } from "../../shared/textUtilities.js";
import { mondayOfWeekAtNoon as mondayOfWeek } from "../../ui/mobileDateUtilities.js";
import { escapeHtml } from "../../ui/commonComponents.js";
import { isPresentFiniteNumber as finite } from "../../shared/valueUtilities.js";
import { formatNumber } from "../../ui/recordPresentation.js";
import { findSavedRunMeasurement } from "../../ui/runMeasurementState.js";
import { achievementSummary } from "../../ui/mobileAchievements.js";
import { buildDynamicHomeCards, buildPersonalChallenge, resolveAmbientProfile } from "../../ui/mobileHomeExperience.js";
import { homeConfirmationTheme, homeState, shortDate } from "../shared/homeScreenSupport.js";

function renderMobileConfirmationBanner(theme) {
  if (!theme?.hasNewEligibleData) return "";
  return `<a class="mobile-home-confirmation-banner" data-mobile-confirmation-banner href="#/history?view=checks" aria-label="次回見ることに新しい記録 ${escapeHtml(String(theme.newCount || 1))}件。確認の続きを見る"><span aria-hidden="true">⚑</span><span><small>次回見ること</small><strong>新しい記録 ${escapeHtml(String(theme.newCount || 1))}件</strong></span><i aria-hidden="true">›</i></a>`;
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
  const totalDistanceKm = records.reduce((sum, record) => sum + (finite(record.distanceKm) && Number(record.distanceKm) >= 0 ? Number(record.distanceKm) : 0), 0);
  const totalDurationMinutes = records.reduce((sum, record) => sum + (finite(record.durationMinutes) && Number(record.durationMinutes) >= 0 ? Number(record.durationMinutes) : 0), 0);
  let estimatedKcal = 0;
  let kcalCount = 0;
  records.forEach((record) => {
    const kcal = findSavedRunMeasurement(record.id)?.energyEstimate?.estimatedKcal;
    // An absent/invalid estimate is not a measured zero. Keep genuine numeric 0.
    if (typeof kcal !== "number" || !Number.isFinite(kcal) || kcal < 0) return;
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
  const delta = finite(latest.distanceKm) && finite(previous.distanceKm) ? Number(latest.distanceKm) - Number(previous.distanceKm) : null;
  return { latest, previous, delta };
}

function renderOverviewWeek(services) {
  const summary = weeklySummary(services);
  const energy = summary.kcalCount > 0 ? `${Math.round(summary.estimatedKcal)} kcal` : "—";
  return `<a class="mobile-home-overview-card mobile-home-overview-card--week" href="#/history"><span class="mobile-home-overview-card__label">今週の記録</span><strong>${escapeHtml(formatNumber(summary.totalDistanceKm, 1))}<small> km</small></strong><div class="mobile-home-overview-card__metrics"><span>${summary.count}回</span><span>${escapeHtml(formatNumber(summary.totalDurationMinutes, 0))}分</span><span>推定消費 ${escapeHtml(energy)}</span></div></a>`;
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
  const display = finite(change.delta) ? `${sign}${formatNumber(change.delta, 1)} km` : "—";
  return `<a class="mobile-home-overview-card mobile-home-overview-card--wide" href="#/history"><span class="mobile-home-overview-card__label">前回との距離差</span><strong>${escapeHtml(display)}</strong><span class="mobile-home-overview-card__note">${escapeHtml(shortDate(change.previous.date))} → ${escapeHtml(shortDate(change.latest.date))}</span></a>`;
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
  return `<section class="mobile-home-overview" aria-label="記録概要"><header class="mobile-home-overview__header"><button type="button" class="mobile-home-overview__back" data-home-hub-target="0" aria-label="アプリ一覧へ戻る">‹ アプリ</button><div><small>記録のまとめ</small><h1>記録概要</h1></div><span aria-hidden="true"></span></header><div class="mobile-home-overview-grid">${renderOverviewWeek(services)}<div class="mobile-home-overview-pair">${renderOverviewLatest(latestExperience)}</div>${renderOverviewChallenge(services)}${renderOverviewChange(services)}${renderOverviewAchievements(services)}</div></section>`;
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

function renderDynamicHomeWidget(card) {
  const progress = Number.isFinite(Number(card?.progress))
    ? `<span class="mobile-home-dynamic-progress" aria-hidden="true"><i style="--dynamic-progress:${Math.round(Number(card.progress) * 100)}%"></i></span>`
    : "";
  return `<a class="mobile-home-widget mobile-home-widget--dynamic mobile-home-widget--tone-${escapeHtml(card?.tone || "default")}" href="${escapeHtml(card?.href || "#/home")}" data-dynamic-widget="${escapeHtml(card?.kind || "default")}"><small>${escapeHtml(card?.label || "記録")}</small><strong>${escapeHtml(card?.title || "—")}</strong><span>${escapeHtml(card?.note || "")}</span>${progress}</a>`;
}

function renderDynamicHomeWidgets(services, latestExperience) {
  const cards = buildDynamicHomeCards(services, latestExperience);
  if (!cards.length) return `<a class="mobile-home-widget" href="#/record-input"><small>今日の記録</small><strong>記録を始める</strong><span>手入力でも記録できます</span></a><a class="mobile-home-widget" href="#/history"><small>最近の変化</small><strong>履歴</strong><span>記録の推移を見る</span></a>`;
  return cards.map(renderDynamicHomeWidget).join("");
}

function renderMobileHomeOs({ services, latestExperience, draft, confirmationTheme = null }) {
  const apps = [
    { href: "#/simulation?from=home", label: "条件比較", emoji: "⚖️", tone: "violet" },
    { href: "#/reading?origin=home", label: "読みもの", emoji: "📖", tone: "green" },
    { href: "#/consultation?from=home", label: "共有", emoji: "📤", tone: "cyan" },
    { href: "#/settings?from=home", label: "設定", emoji: "⚙️", tone: "gray" },
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
    </div>
    <nav class="mobile-home-dock" aria-label="よく使う機能">
      ${dock.map((item) => renderMobileLauncherItem({ ...item, dock: true })).join("")}
    </nav>
  </section>`;
}


// New home cards are the editable surface; the former phone-launcher remains
// unavailable in product UI. Its unreferenced renderer is not a live home view.
const NEW_HOME_CARDS = [
  ["calendar", "今週の記録カレンダー"],
  ["latest", "直近の記録（保存後）"],
  ["week", "今週の活動サマリー（保存後）"],
  ["month", "今月の活動サマリー（保存後）"],
  ["balance", "今週の走行・休養（保存後）"],
  ["trend", "直近2回の距離差"],
  ["tip", "記録の読み方ヒント"],
  ["guide", "ホームの使い方"],
];

function renderNewHomeEditor() {
  const controls = NEW_HOME_CARDS.map(([id, label]) => `<li class="w1-home-editor-row" data-home-editor-row="${id}">
    <label><input type="checkbox" data-home-editor-visible="${id}" checked><span>${label}</span></label>
    <div class="w1-home-editor-order"><button type="button" data-home-editor-move="up" data-card="${id}" aria-label="${label}を上へ移動"><span class="w1-home-editor-arrow" aria-hidden="true">↑</span><span>上へ</span></button><button type="button" data-home-editor-move="down" data-card="${id}" aria-label="${label}を下へ移動"><span class="w1-home-editor-arrow" aria-hidden="true">↓</span><span>下へ</span></button></div>
  </li>`).join("");
  return `<section class="w1-home-editor" data-new-home-editor hidden aria-label="ホームの表示を編集">
    <div class="w1-home-editor-heading"><div><small>ホームのカスタマイズ</small><h2>表示と順番を編集</h2></div><button type="button" data-home-editor-cancel aria-label="編集を取り消す">閉じる</button></div>
    <p class="w1-home-editor-description">表示する情報を選び、「上へ」「下へ」で並び替えられます。保存記録が必要な情報は、記録ができてから表示されます。</p>
    <fieldset class="w1-home-editor-density"><legend>カードの表示密度</legend><label><input type="radio" name="w1-home-density" value="normal" checked>標準</label><label><input type="radio" name="w1-home-density" value="compact">コンパクト</label></fieldset>
    <ul class="w1-home-editor-list" data-home-editor-list>${controls}</ul>
    <p class="w1-home-editor-status" data-home-editor-status role="status" aria-live="polite"></p>
    <div class="w1-home-editor-actions"><button type="button" data-home-editor-reset>おすすめの初期配置に戻す</button><button type="button" data-home-editor-cancel>キャンセル</button><button type="button" class="w1-home-editor-save" data-home-editor-save>保存して戻る</button></div>
  </section>`;
}

function homeCalendarData(services) {
  const start = mondayOfWeek();
  const dates = Array.from({length:7}, (_, i) => {
    const date = new Date(start); date.setDate(date.getDate()+i);
    return { date, key:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`, run:false, rest:false };
  });
  const byKey = new Map(dates.map(day=>[day.key,day]));
  for (const record of services.storage.records.loadAll()) {
    if (!["run","rest"].includes(record.activityType)) continue;
    const date = parseLocalDate(record.date);
    if (!date) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    const cell = byKey.get(key);
    if (cell) cell[record.activityType] = true;
  }
  return dates;
}

function renderHomeOptionalCards(saved, services) {
  const records = services.storage.records.loadAll();
  const week = weeklySummary(services);
  const weekdays = ["月","火","水","木","金","土","日"];
  const calendar = homeCalendarData(services);
  const marked = calendar.filter(item=>item.run||item.rest).length;
  const calendarHtml = `<div class="home-dashboard-label">今週の記録カレンダー</div>
    <div class="home-dashboard-calendar" aria-label="今週の保存記録">
      ${calendar.map((day,i) => `<div class="home-dashboard-day" aria-label="${escapeHtml(day.key)} ${day.run&&day.rest?'走行と休養':day.run?'走行記録':day.rest?'休養記録':'保存記録なし'}"><small>${weekdays[i]}</small><strong>${day.date.getDate()}</strong><span data-activity="${day.run&&day.rest?'both':day.run?'run':day.rest?'rest':'none'}">${day.run&&day.rest?'走休':day.run?'走':day.rest?'休':'・'}</span></div>`).join("")}
    </div><p class="home-dashboard-note">${marked ? `今週、${marked}日分の活動が記録されています。` : "今週の保存記録はまだありません。"} <span>走＝走行、休＝休養</span></p>`;
  const weekHtml = `<div class="home-dashboard-label">今週の活動</div><div class="home-dashboard-value">${week.count}<small>回の走行</small></div><p class="home-dashboard-note">${escapeHtml(formatNumber(week.totalDistanceKm,1))} km ・ ${escapeHtml(formatNumber(week.totalDurationMinutes,0))} 分（記録に基づく合計）</p>`;
  const latestSummary = saved?.activityType === "rest" ? "休養" : [
    Number(saved?.distanceKm) > 0 ? `${formatNumber(saved.distanceKm, 1)} km` : "",
    Number(saved?.durationMinutes) > 0 ? `${formatNumber(saved.durationMinutes, 0)} 分` : "",
  ].filter(Boolean).join(" ・ ") || "走行";
  const latest = saved ? `<div class="home-dashboard-label">直近の保存記録</div><div class="home-dashboard-value home-dashboard-value--date">${escapeHtml(shortDate(saved.date))}</div><p class="home-dashboard-note">${escapeHtml(latestSummary)}。詳しい内容は履歴から確認できます。</p>` : "";
  const now = new Date();
  const monthly = records.filter(record => {
    if (!["run","rest"].includes(record.activityType)) return false;
    const date = parseLocalDate(record.date);
    return date && date.getFullYear()===now.getFullYear() && date.getMonth()===now.getMonth();
  });
  const monthRuns = monthly.filter(record=>record.activityType==="run");
  const monthRests = monthly.filter(record=>record.activityType==="rest");
  const monthDistance = monthRuns.reduce((total,record)=>total+(finite(record.distanceKm)&&Number(record.distanceKm)>=0?Number(record.distanceKm):0),0);
  const monthHtml = `<div class="home-dashboard-label">${now.getMonth()+1}月の記録</div><div class="home-dashboard-value">${monthRuns.length+monthRests.length}<small>件</small></div><p class="home-dashboard-note">走行 ${monthRuns.length}件 ・ 休養 ${monthRests.length}件 ・ 走行距離 ${escapeHtml(formatNumber(monthDistance,1))} km</p>`;
  const weekStart = mondayOfWeek(); const weekEnd = new Date(weekStart);weekEnd.setDate(weekEnd.getDate()+7);
  const weekActivity = records.filter(record=> {
    if (!["run","rest"].includes(record.activityType)) return false;
    const date = parseLocalDate(record.date);
    return date && date>=weekStart && date<weekEnd;
  });
  const runCount = weekActivity.filter(record=>record.activityType==="run").length;
  const restCount = weekActivity.filter(record=>record.activityType==="rest").length;
  const balanceHtml = `<div class="home-dashboard-label">記録した走行・休養</div><div class="home-dashboard-split"><div><strong>${runCount}</strong><span>走行</span></div><div><strong>${restCount}</strong><span>休養</span></div></div><p class="home-dashboard-note">今週保存された記録の件数です。未記録の日を休養日とは数えません。</p>`;
  const change = recentDistanceChange(services);
  const changeText = change && finite(change.delta) ? `${change.delta>0?"+":""}${escapeHtml(formatNumber(change.delta,1))} km` : "—";
  const trendHtml = `<div class="home-dashboard-label">直近2回の走行距離差</div><div class="home-dashboard-value">${changeText}</div><p class="home-dashboard-note">${change && finite(change.delta) ? `${escapeHtml(shortDate(change.previous.date))} → ${escapeHtml(shortDate(change.latest.date))}。距離の差だけで調子や負荷は判断できません。` : "比較できる走行記録が2件になると表示します。"}</p>`;
  const tipHtml = `<div class="home-dashboard-label">記録を読むヒント</div><strong class="home-dashboard-tip-heading">条件が違えば、数字の意味も変わります</strong><p class="home-dashboard-note">距離・時間・コースが違う日の数値は、単純な優劣として比べないことが大切です。</p>`;
  const guideHtml = `<div class="home-dashboard-label">このホームについて</div><strong class="home-dashboard-tip-heading">ここは「概要」、操作や詳細は専用画面へ</strong><p class="home-dashboard-note">記録は「記録」、保存したデータの確認は「履歴」、表示の調整は「編集」から行えます。</p>`;
  const cards = [
    ["calendar", calendarHtml, true, "calendar"],
    ["latest", latest, Boolean(saved), "latest"],
    ["week", weekHtml, week.count>0, "metric"],
    ["month", monthHtml, monthly.length>0, "metric"],
    ["balance", balanceHtml, weekActivity.length>0, "balance"],
    ["trend", trendHtml, true, "trend"],
    ["tip", tipHtml, true, "tip"],
    ["guide", guideHtml, true, "guide"],
  ];
  return `<div class="w1-mobile-cards home-dashboard-cards" data-home-card-list>${cards.map(([id,html,available,kind]) => `<article class="w1-mobile-card home-dashboard-card" data-home-card-id="${id}" data-dashboard-kind="${kind}" data-home-card-available="${available}"><div class="w6-home-summary">${html}</div></article>`).join("")}</div>`;
}

function renderW1MobileHome({ services, latestExperience, draft, confirmationTheme, state }) {
  const saved = latestExperience?.record || null;
  const draftActive = state === "draft";
  const heroTitle = draftActive ? "続きから記録する" : "今日の走りを、記録に。";
  const heroDescription = draftActive
    ? "入力途中の内容があります。保存するまで続きから入力できます。"
    : "GPSで測る、あとから入力する。自分に合う方法を選べます。";
  const mainTitle = draftActive ? "入力を再開する" : "GPSで測定する";
  const mainHref = draftActive ? "#/record-input" : "#/run-measurement";
  const secondTitle = draftActive ? "GPSで測定する" : "手入力で記録";
  const secondHref = draftActive ? "#/run-measurement" : "#/record-input";
  return `<section class="w1-mobile-home w6-home-clarity" aria-label="現在の状態と記録の入口" data-w1-variant="A">
    <header class="w1-mobile-heading"><div><p>今日の記録</p><h1>ホーム</h1></div><div class="w1-mobile-header-actions"><a class="w1-mobile-achievements-link" href="#/achievements" aria-label="実績画面を開く"><span aria-hidden="true">🏅</span> 実績</a></div></header>
    <div data-new-home-main class="w1-new-home-main">
      ${renderMobileConfirmationBanner(confirmationTheme)}
      <section class="w1-mobile-hero" aria-label="記録を始める"><span class="w1-mobile-eyebrow">記録の入口</span><h2>${heroTitle}</h2><p>${heroDescription}</p><div class="w1-mobile-actions"><a class="w1-mobile-primary" href="${mainHref}">${mainTitle}<span aria-hidden="true">→</span></a><a class="w1-mobile-manual" href="${secondHref}">${secondTitle} <span aria-hidden="true">›</span></a></div></section>
      ${!saved && !draftActive ? `<p class="w6-home-empty-note" data-home-empty-state>まだ保存した記録はありません。記録すると、ここに最近の記録や今週のまとめが表示されます。</p>` : ""}
      <section class="w1-mobile-support" aria-label="マイダッシュボード"><div class="w1-mobile-section-title"><div><small class="home-dashboard-eyebrow">自分だけの情報を選ぶ</small><h2>マイダッシュボード</h2></div><button type="button" data-w1-edit-home class="w1-mobile-settings home-dashboard-edit" aria-expanded="false" aria-controls="w1-home-editor">表示を編集</button></div>${renderHomeOptionalCards(saved,services)}</section>
    </div>
    ${renderNewHomeEditor().replace('class="w1-home-editor"','class="w1-home-editor" id="w1-home-editor"')}
  </section>`;
}

// Retained only for independent historical tests; never inserted into the new home DOM.
const retiredHomeRenderers = [renderMobileOverviewPage, renderMobileHomeOs];

export function renderHomeScreen({ services }) {
  const latestExperience = services.workflows.records.loadLatestExperience();
  const draft = services.storage.draft.load();
  const state = homeState(latestExperience, draft);
  const challenge = buildPersonalChallenge(services);
  const ambient = resolveAmbientProfile({ latestExperience, draft, challenge });
  const confirmationTheme = homeConfirmationTheme(services);
  return `<div class="screen screen--home screen-layout screen-layout--home home-state--${escapeHtml(state)} mobile-home-ambient mobile-home-ambient--${escapeHtml(ambient.period)} mobile-home-ambient--${escapeHtml(ambient.signal)}" data-home-state="${escapeHtml(state)}" data-ambient-period="${escapeHtml(ambient.period)}" data-ambient-signal="${escapeHtml(ambient.signal)}" style="--ambient-challenge:${ambient.challengeProgress}%">
    ${renderW1MobileHome({ services, latestExperience, draft, confirmationTheme, state })}
  </div>`;
}

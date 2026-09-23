import { escapeHtml, renderStatusLabel } from "../ui/commonComponents.js";
import { V27_EMPHASIS_REGION_IDS, V27_REGIONS, BODY_AREA_BY_ID } from "../core/runloadCore.js";

import { formatActivitySummary } from "../ui/recordPresentation.js";

const REGION_BY_ID = new Map(V27_REGIONS.map((region) => [region.id, region]));
const DEFERRED_READING_ARTICLE_IDS = new Set(["rpe-separated", "model-total-v27"]);
const visibleArticles = (articles = []) => articles.filter((article) => !DEFERRED_READING_ARTICLE_IDS.has(article?.id));

function articleHref(articleId, origin = "") {
  const query = new URLSearchParams({ articleId, ...(origin ? { origin } : {}) }).toString();
  return `#/reading?${query}`;
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function dateToTime(dateText = "") {
  const match = String(dateText || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return NaN;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
}

function daysBetweenDates(leftDate, rightDate) {
  const left = dateToTime(leftDate);
  const right = dateToTime(rightDate);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return Math.round((left - right) / 86400000);
}

function bodyAreaObservations(feedback = {}) {
  return Array.isArray(feedback.bodyAreaObservations)
    ? feedback.bodyAreaObservations.filter((item) => BODY_AREA_BY_ID[item?.areaId])
    : [];
}

function buildRecordHistory(experience, allExperiences = []) {
  if (!experience) return Object.freeze({ ordered: [], index: -1, previous: null, previousRun: null, previousRuns: [] });
  const ordered = [...allExperiences]
    .filter(Boolean)
    .sort((left, right) => left.record.date.localeCompare(right.record.date) || left.record.id.localeCompare(right.record.id));
  const index = ordered.findIndex((item) => item.record.id === experience.record.id);
  const before = index >= 0 ? ordered.slice(0, index) : [];
  const previous = before.at(-1) || null;
  const previousRuns = before.filter((item) => item.record.activityType === "run");
  return Object.freeze({
    ordered,
    index,
    previous,
    previousRun: previousRuns.at(-1) || null,
    previousRuns,
  });
}

function repeatedBodyAreas(experience, allExperiences = []) {
  const current = bodyAreaObservations(experience?.feedback || {});
  if (!current.length) return [];
  const history = buildRecordHistory(experience, allExperiences);
  const recent = history.previousRuns.slice(-4);
  return current.filter((observation) => recent.some((item) => (
    daysBetweenDates(experience.record.date, item.record.date) <= 28
    && bodyAreaObservations(item.feedback || {})
      .some((prior) => prior.areaId === observation.areaId)
  )));
}

function targetRegionId(context, experience) {
  const requested = context?.parameters?.get?.("regionId") || "";
  if (REGION_BY_ID.has(requested)) return requested;
  const observation = bodyAreaObservations(experience?.feedback || {})
    .find((item) => BODY_AREA_BY_ID[item.areaId]?.modelRegionId);
  return BODY_AREA_BY_ID[observation?.areaId]?.modelRegionId || "";
}

function buildColumnRecommendation(services, experience, allExperiences = [], context = {}) {
  const all = visibleArticles(services.column.list());
  const find = (id) => { const article = services.column.findById(id); return article && !DEFERRED_READING_ARTICLE_IDS.has(article.id) ? article : all[0] || null; };
  const recommendation = (id, reason) => Object.freeze({ article: find(id), reason });
  if (!experience) {
    return recommendation("regional-three-views", "まだ記録がないため、12部位の目安の読み方を説明する基礎記事を表示しています。");
  }

  const { record, feedback = {}, supportDecision = {} } = experience;
  const route = supportDecision?.route || "normal";
  const course = record.course || {};
  const environment = record.environmentContext || {};
  const recovery = record.recoveryContext || {};
  const up = numberValue(course.upPercent, 0);
  const down = numberValue(course.downPercent, 0);
  const observations = bodyAreaObservations(feedback);
  const repeatedAreas = repeatedBodyAreas(experience, allExperiences);
  const selectedRegionId = targetRegionId(context, experience);
  const runCount = allExperiences.filter(
    (item) => item?.record?.activityType === "run",
  ).length;
  const hasTemperature = environment.temperatureC !== null
    && environment.temperatureC !== undefined
    && String(environment.temperatureC).trim() !== "";
  const hasNutritionHydrationContext = Boolean(
    String(recovery.nutritionHydrationSummary || "").trim(),
  );
  const hasSleepContext = Boolean(String(recovery.sleepSummary || "").trim());
  const hasRecordedContext = hasTemperature || [
    environment.weather,
    environment.windSummary,
    environment.environmentNote,
    recovery.nutritionHydrationSummary,
    recovery.lifestyleNote,
  ].some((value) => String(value || "").trim());

  if (route === "consult" || route === "urgent") {
    return recommendation("consultation-prep-v27", "入力した内容を共有前に整理する記事です。");
  }
  if (record.activityType === "rest") {
    return recommendation("history-compatible", "休養日や未記録日を数値の0と考えない、履歴の読み方に関連する記事です。");
  }
  if (repeatedAreas.length) {
    const labels = repeatedAreas.slice(0, 2).map((item) => item.label).join("、");
    return recommendation("consultation-prep-v27", `${labels}の身体の記録が複数記録にあるため、事実を整理する記事です。`);
  }
  if (selectedRegionId && V27_EMPHASIS_REGION_IDS.includes(selectedRegionId)) {
    return recommendation("slope-endpoints", `${REGION_BY_ID.get(selectedRegionId)?.label || selectedRegionId}の値が表す内容と読み方に関連する記事です。`);
  }
  if (observations.length) {
    return recommendation("regional-six-eight-28", `${observations.slice(0, 2).map((item) => item.label).join("、")}の身体の記録と12部位の目安を分けて読む記事です。`);
  }
  if (hasNutritionHydrationContext) {
    return recommendation("hydration-not-more-is-better", "食事・水分のメモに関連する一般知識です。量や必要性を判断するものではありません。");
  }
  if (hasSleepContext) {
    return recommendation("sleep-not-hours-only", "睡眠のメモに関連する一般知識です。睡眠時間や回復状態を判定するものではありません。");
  }
  if (hasTemperature) {
    return recommendation("heat-not-temperature-only", "気温の記録に関連する一般的な情報です。安全・危険や運動可否を判断するものではありません。");
  }
  if (hasRecordedContext) {
    return recommendation("context-not-single-cause", "天候や生活背景などのメモを、一つの原因へ決めずに見返す記事です。");
  }
  if (course.gradeKnowledge === "KNOWN_PROFILE" && (up > 0 || down > 0)) {
    return recommendation("grade-and-coverage", "上り・下りで身体の使われ方が変わる理由を説明する記事です。");
  }
  if (
    ["UNKNOWN", "EXPLICIT_UNEVEN", "KNOWN_OTHER"].includes(
      String(course.modelSurfaceClass || "UNKNOWN"),
    )
  ) {
    return recommendation("surface-missingness", "路面や足のつき方で、足元の使われ方が変わる理由に関連する記事です。");
  }
  if (
    feedback?.checkStatus
    && !["none_reported", "not_asked", "deferred"].includes(feedback.checkStatus)
  ) {
    return recommendation("regional-six-eight-28", "身体の記録と数値表示の役割を分けて読む記事です。");
  }
  if (runCount >= 3) {
    return recommendation("personal-reference", "同じ計算方法・同じ基準で比べられる記録があるため、過去記録との比べ方を説明する記事です。");
  }
  return recommendation("regional-three-views", "結果画面の3つの比較方法を確認する記事です。");
}

function resolveColumnTargetExperience(services, context) {
  const allExperiences = services.workflows.records.loadAllExperiences()
    .filter(Boolean)
    .sort((left, right) => left.record.date.localeCompare(right.record.date) || left.record.id.localeCompare(right.record.id));
  const requestedRecordId = context.parameters.get("recordId") || context.parameters.get("anchorRecordId") || "";
  const requestedDate = context.parameters.get("date") || context.parameters.get("anchorDate") || "";
  const byRecordId = requestedRecordId ? services.workflows.records.loadExperience(requestedRecordId) : null;
  const byDate = requestedDate
    ? [...allExperiences].reverse().find((item) => item.record.date === requestedDate)
    : null;
  const latest = services.workflows.records.loadLatestExperience();
  const experience = byRecordId || byDate || latest;
  const targetKind = byRecordId ? "selected-record" : byDate ? "selected-date" : latest ? "latest" : "none";
  return Object.freeze({ experience, allExperiences, targetKind });
}

const READING_ITEMS = Object.freeze([
  Object.freeze({ id: "regional-three-views", filter: "result" }),
  Object.freeze({ id: "history-compatible", filter: "record" }),
  Object.freeze({ id: "plan-facts-current", filter: "record" }),
  Object.freeze({ id: "training-progression-no-universal-rule", filter: "running" }),
  Object.freeze({ id: "context-not-single-cause", filter: "running" }),
  Object.freeze({ id: "cooldown-stretching-limits", filter: "after" }),
  Object.freeze({ id: "hydration-not-more-is-better", filter: "after" }),
  Object.freeze({ id: "heat-not-temperature-only", filter: "before" }),
  Object.freeze({ id: "consultation-prep-v27", filter: "share" }),
]);

function renderReadingArticle(article, filter) {
  return `<article class="article-card" data-reading-card data-cat="${escapeHtml(filter)}"><small>${escapeHtml(article.category || "一般情報")}</small><strong>${escapeHtml(article.title || "読みもの")}</strong><p>${escapeHtml(article.lead || article.summary || "")}</p><button type="button" data-reading-open="${escapeHtml(article.id)}">読む</button></article>`;
}

function renderReadingDetail(article) {
  return `<article data-reading-detail="${escapeHtml(article.id)}" hidden><div class="sheet-head"><div><small>${escapeHtml(article.category || "一般情報")}</small><strong id="articleTitle-${escapeHtml(article.id)}">${escapeHtml(article.title || "読みもの")}</strong></div><button class="close" type="button" data-reading-close aria-label="閉じる">×</button></div><p class="lead">${escapeHtml(article.lead || article.summary || "")}</p><div class="body-copy">${(article.body || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>${(article.practicePoints || []).length ? `<div class="points"><strong>見返すポイント</strong><ul>${article.practicePoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul></div>` : ""}<p class="caution">${escapeHtml(article.caution || "一般情報であり、個別の診断・処方・走行可否判断には使用しません。")}</p><p class="source-note">Current Appで管理している公開資料・研究文献を背景にした一般情報です。個別の診断・処方ではありません。</p></article>`;
}

function renderReadingContent({ services, context }) {
  const available = new Map(visibleArticles(services.column.list()).map((article) => [article.id, article]));
  const items = READING_ITEMS.map((item) => ({ ...item, article: available.get(item.id) })).filter((item) => item.article);
  const allExperiences = services.workflows.records.loadAllExperiences();
  const target = resolveColumnTargetExperience(services, context);
  const recommendation = buildColumnRecommendation(services, target.experience, allExperiences, context);
  const featured = recommendation.article && available.has(recommendation.article.id) ? recommendation.article : available.get("regional-three-views") || items[0]?.article || null;
  const initialArticleId = context.parameters.get("articleId") || "";
  const origin = context.parameters.get("origin") || "";
  const recordId = context.parameters.get("recordId") || "";
  const regionId = context.parameters.get("regionId") || "";
  const from = context.parameters.get("from") || "";
  const roomOrigin = context.parameters.get("roomOrigin") || "result";
  let backHref = origin === "result-condition" && recordId && regionId
    ? `#/body-part-detail?recordId=${encodeURIComponent(recordId)}&regionId=${encodeURIComponent(regionId)}`
    : "#/more";
  let backLabel = origin === "result-condition" && recordId && regionId ? "部位結果へ戻る" : "その他へ戻る";
  if (from === "interpretation-room") {
    const roomQuery = new URLSearchParams();
    if (recordId) roomQuery.set("recordId", recordId);
    roomQuery.set("origin", roomOrigin);
    if (regionId) roomQuery.set("regionId", regionId);
    backHref = `#/interpretation-room?${roomQuery.toString()}`;
    backLabel = "結果の整理へ戻る";
  }
  const detailArticles = new Map(items.map((item) => [item.article.id, item.article]));
  if (featured) detailArticles.set(featured.id, featured);
  return `<div class="screen screen--reading screen-layout screen-layout--reading secondary-derived-screen" data-reading-screen${initialArticleId ? ` data-reading-initial-article="${escapeHtml(initialArticleId)}"` : ""}>
    <header class="secondary-derived-head"><a class="secondary-derived-back" href="${escapeHtml(backHref)}">← ${escapeHtml(backLabel)}</a><strong>読みもの</strong><span aria-hidden="true"></span></header>
    <div class="secondary-derived-body">
    <section class="head"><p class="eyebrow">READING</p><h1>読みもの</h1><p>結果の意味や、走った日の背景を確認するための一般情報です。</p></section>
    ${featured ? `<section class="recommend"><small>今回の結果から</small><strong>${escapeHtml(featured.title)}</strong><p>${escapeHtml(recommendation.reason || featured.lead || "")}</p><button type="button" data-reading-open="${escapeHtml(featured.id)}">この記事を読む</button></section>` : ""}
    <div class="filter-strip"><div class="filter-strip-head"><span>分類</span><small>横にスライド <b aria-hidden="true">→</b></small></div><div class="filters" role="group" aria-label="読みものの分類。横方向にスクロールできます"><button class="active" type="button" data-reading-filter="all">すべて</button><button type="button" data-reading-filter="result">結果</button><button type="button" data-reading-filter="record">記録・履歴</button><button type="button" data-reading-filter="running">走りとのつき合い方</button><button type="button" data-reading-filter="after">走った後</button><button type="button" data-reading-filter="before">走る前</button><button type="button" data-reading-filter="share">相談・共有</button></div></div>
    <div class="grid">${items.map((item) => renderReadingArticle(item.article, item.filter)).join("")}</div>
    <div class="drawer" data-reading-drawer hidden><section class="sheet" role="dialog" aria-modal="true" aria-label="読みもの本文">${[...detailArticles.values()].map(renderReadingDetail).join("")}</section></div>
    </div>
  </div>`;
}

export function renderReadingScreen({ services, context }) {
  return renderReadingContent({ services, context });
}

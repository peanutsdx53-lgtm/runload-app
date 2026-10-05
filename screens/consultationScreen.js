import { escapeHtml } from "../ui/commonComponents.js";
import { formatActivitySummary, formatLocalDate, formatNumber } from "../ui/recordPresentation.js";
import { bodyRegionFormalName, PROFILE_AGE_BAND_OPTIONS } from "../core/appCore.js";
import { buildReportPresentation } from "../ui/consultationPresentation.js";
import { selfUnderstandingThreadTitle } from "../core/selfUnderstandingCore.js";
import { BODY_REGION_VIEWS } from "../ui/bodyRegionVisuals.js";

const PURPOSE_OPTIONS = Object.freeze([
  Object.freeze({ value: "training", label: "練習内容" }),
  Object.freeze({ value: "condition", label: "疲労・身体の状態" }),
  Object.freeze({ value: "change", label: "最近の変化" }),
  Object.freeze({ value: "form", label: "フォーム・走り方" }),
  Object.freeze({ value: "other", label: "その他" }),
]);

const CHANGE_OPTIONS = Object.freeze([
  Object.freeze({ value: "distance", label: "距離を変えた" }),
  Object.freeze({ value: "pace", label: "ペースを変えた" }),
  Object.freeze({ value: "course", label: "コースを変えた" }),
  Object.freeze({ value: "shoes", label: "シューズを変えた" }),
  Object.freeze({ value: "schedule", label: "走る頻度・予定を変えた" }),
  Object.freeze({ value: "none", label: "特になし", exclusive: true }),
]);

const ACTION_OPTIONS = Object.freeze([
  Object.freeze({ value: "rest", label: "休養した" }),
  Object.freeze({ value: "distance-down", label: "距離を減らした" }),
  Object.freeze({ value: "pace-down", label: "ペースを抑えた" }),
  Object.freeze({ value: "schedule", label: "予定を変更した" }),
  Object.freeze({ value: "none", label: "特になし", exclusive: true }),
]);

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function latestPlan(plans = []) {
  const validPlans = Array.isArray(plans)
    ? plans.filter((plan) => plan && plan.id)
    : [];
  if (!validPlans.length) return null;

  const sortedPlans = [...validPlans].sort((a, b) => (
    String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || ""))
  ));
  const today = localDateKey();
  return sortedPlans.find((plan) => String(plan.scheduledDate || "") >= today)
    || sortedPlans[sortedPlans.length - 1]
    || null;
}

function planSummary(plan) {
  if (!plan) return "";
  const session = plan.plannedSession || {};
  if (plan.planType === "rest" || session.activityType === "rest") return "休養予定";
  const parts = [];
  if (Number(session.distanceKm) > 0) parts.push(`${formatNumber(session.distanceKm, 2)}km`);
  if (Number(session.durationMinutes) > 0) parts.push(`${formatNumber(session.durationMinutes, 0)}分`);
  if (session.course?.name) parts.push(session.course.name);
  return parts.join("・") || "走行予定";
}

function paceSeconds(record = {}) {
  const distance = Number(record.distanceKm || 0);
  const minutes = Number(record.durationMinutes || 0);
  if (!(distance > 0) || !(minutes > 0)) return null;
  return Math.round((minutes * 60) / distance);
}

function paceLabel(record = {}) {
  const seconds = paceSeconds(record);
  if (!Number.isFinite(seconds)) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}/km`;
}

function consultationFacts(experience) {
  const record = experience?.record || {};
  if (!record.id) return "記録なし";
  if (record.activityType === "rest") return "休養";
  const parts = [];
  if (Number(record.distanceKm) > 0) parts.push(`${formatNumber(record.distanceKm, 2)} km`);
  if (Number(record.durationMinutes) > 0) parts.push(`${formatNumber(record.durationMinutes, 0)}分`);
  if (paceSeconds(record) != null) parts.push(paceLabel(record));
  if (record.course?.name) parts.push(record.course.name);
  return parts.join("・") || formatActivitySummary(record);
}

function consultationFatigue(services, experience) {
  const record = experience?.record || {};
  if (!record.id || record.activityType !== "run" || !services?.fatigue) {
    return Object.freeze({ pre: null, post: null, label: "未記録" });
  }
  const summary = services.fatigue.summarizeRun(record.id);
  const pre = Number.isFinite(Number(summary?.pre)) ? Number(summary.pre) : null;
  const post = Number.isFinite(Number(summary?.post)) ? Number(summary.post) : null;
  if (pre == null && post == null) return Object.freeze({ pre, post, label: "未記録" });
  return Object.freeze({
    pre,
    post,
    label: `${pre == null ? "未記録" : pre} → ${post == null ? "未記録" : post}`,
  });
}

function consultationRegionalSummary(decision) {
  const regional = decision?.regional || {};
  const regionName = bodyRegionFormalName(regional.regionId, regional.regionLabel || "選択した部位");
  const numericValue = Number(regional.displayIndex);
  const available = Number.isFinite(numericValue);
  const value = available ? formatNumber(numericValue, 1) : "数値なし";
  const relation = !available
    ? "表示できません"
    : Math.abs(numericValue - 100) < 1
      ? "その部位自身の基準付近"
      : numericValue > 100
        ? "その部位自身の基準より上"
        : "その部位自身の基準より下";
  const comparison = regional.previousComparable;
  let previous = "比較できる過去記録なし";
  if (available && comparison?.status === "COMPARABLE") {
    const previousValue = Number(comparison.previous?.displayConditionIndex);
    if (Number.isFinite(previousValue)) {
      const delta = Number.isFinite(Number(comparison.pointDelta))
        ? Number(comparison.pointDelta)
        : numericValue - previousValue;
      const signed = `${delta >= 0 ? "+" : ""}${formatNumber(delta, 1)}`;
      const previousDate = comparison.previous?.date ? formatLocalDate(comparison.previous.date) : "前回";
      previous = `${previousDate} ${formatNumber(previousValue, 1)} → 今回 ${value}（${signed}）`;
    }
  }
  return Object.freeze({
    regionId: regional.regionId || "",
    regionName,
    value,
    relation,
    current: available ? `今回 ${value}｜基準 100` : "今回の数値なし",
    previous,
    available,
    copyValue: available
      ? `${regionName}｜${relation}｜今回 ${value}・基準 100｜${previous}`
      : `${regionName}｜表示できません`,
  });
}

function consultationBodyRows(report = {}) {
  const rows = [];
  report.exactBodyObservations?.forEach((item) => {
    const values = [];
    if (item.lateralityLabel) values.push(item.lateralityLabel);
    if (item.intensity != null) values.push(`程度 ${item.intensity}/5`);
    if (item.sensation) values.push(item.sensation);
    rows.push(Object.freeze({ label: item.label || "詳細部位", detail: values.join("・") || "記録あり" }));
  });
  report.subjectiveParts?.forEach((item) => {
    const values = [];
    if (Number(item.fatigue) > 0) values.push(`疲れ・だるさ ${item.fatigue}/5`);
    if (Number(item.discomfort) > 0) values.push(`気になる感じ ${item.discomfort}/5`);
    rows.push(Object.freeze({ label: item.label || "身体の記録", detail: values.join("・") || "確認済み" }));
  });
  return rows;
}

function consultationBodyRecordSummary(rows = []) {
  if (!rows.length) return "未記録";
  const visible = rows.slice(0, 3).map((item) => `${item.label}：${item.detail}`);
  const remaining = rows.length - visible.length;
  return `${visible.join("／")}${remaining > 0 ? `／ほか${remaining}件` : ""}`;
}

function consultationProfileSummary(profile = {}) {
  const parts = [];
  if (Number(profile.heightCm) > 0) parts.push(`身長 ${formatNumber(profile.heightCm, 1)} cm`);
  if (Number(profile.weightKg) > 0) parts.push(`体重 ${formatNumber(profile.weightKg, 1)} kg`);
  const age = PROFILE_AGE_BAND_OPTIONS.find((item) => item.key === profile.ageBand)?.label || "";
  if (age) parts.push(`年齢帯 ${age}`);
  if (profile.sex === "male") parts.push("性別 男性");
  if (profile.sex === "female") parts.push("性別 女性");
  if (profile.runningStartDateOrBand) parts.push(`開始時期 ${profile.runningStartDateOrBand}`);
  if (profile.experienceSelfAssessment) parts.push(`走ることへの慣れ ${profile.experienceSelfAssessment}`);
  const goals = Array.isArray(profile.runningGoalTags) ? profile.runningGoalTags.filter(Boolean) : [];
  if (goals.length) parts.push(`目的 ${goals.join("・")}`);
  return Object.freeze({
    available: parts.length > 0,
    value: parts.length ? parts.join("／") : "未設定",
  });
}

function recordChronology(left, right) {
  return String(left?.record?.date || "").localeCompare(String(right?.record?.date || ""))
    || String(left?.record?.createdAt || "").localeCompare(String(right?.record?.createdAt || ""))
    || String(left?.record?.id || "").localeCompare(String(right?.record?.id || ""));
}

function previousRunExperience(allExperiences = [], target = null) {
  if (!target?.record?.id) return null;
  return [...allExperiences]
    .filter((item) => item?.record?.activityType === "run" && item.record.id !== target.record.id)
    .filter((item) => recordChronology(item, target) < 0)
    .sort((left, right) => recordChronology(right, left))[0] || null;
}

function signedNumber(value, digits = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  return `${numeric >= 0 ? "+" : ""}${formatNumber(numeric, digits)}`;
}

function consultationAutomaticChanges(allExperiences, experience) {
  const current = experience?.record || {};
  if (current.activityType !== "run") return ["今回の対象は休養記録です。"];
  const previous = previousRunExperience(allExperiences, experience);
  if (!previous?.record) return ["比較できる前回の走行記録はありません。"];
  const before = previous.record;
  const changes = [];

  const currentDistance = Number(current.distanceKm);
  const previousDistance = Number(before.distanceKm);
  if (currentDistance > 0 && previousDistance > 0 && Math.abs(currentDistance - previousDistance) >= 0.01) {
    changes.push(`距離 ${formatNumber(previousDistance, 2)} → ${formatNumber(currentDistance, 2)} km（${signedNumber(currentDistance - previousDistance, 2)} km）`);
  }

  const currentDuration = Number(current.durationMinutes);
  const previousDuration = Number(before.durationMinutes);
  if (currentDuration > 0 && previousDuration > 0 && Math.abs(currentDuration - previousDuration) >= 0.5) {
    changes.push(`時間 ${formatNumber(previousDuration, 0)} → ${formatNumber(currentDuration, 0)}分`);
  }

  const currentPace = paceSeconds(current);
  const previousPace = paceSeconds(before);
  if (currentPace != null && previousPace != null && Math.abs(currentPace - previousPace) >= 3) {
    changes.push(`ペース ${paceLabel(before)} → ${paceLabel(current)}`);
  }

  const currentCourse = String(current.course?.name || "").trim();
  const previousCourse = String(before.course?.name || "").trim();
  if (currentCourse && previousCourse && currentCourse !== previousCourse) {
    changes.push(`コース ${previousCourse} → ${currentCourse}`);
  }

  if (!changes.length) {
    changes.push("前回の走行記録と、距離・時間・ペース・コースに記録上の差はありません。");
  }
  return changes;
}

function compactBodySummary(report = {}) {
  const rows = consultationBodyRows(report);
  if (!rows.length) return "—";
  const first = `${rows[0].label}${rows[0].detail ? ` ${rows[0].detail}` : ""}`;
  return rows.length > 1 ? `${first} ほか${rows.length - 1}件` : first;
}

function consultationRecentRows({ services, allExperiences, experience, regionId }) {
  const selected = [...allExperiences]
    .filter((item) => item?.record?.id)
    .filter((item) => recordChronology(item, experience) <= 0)
    .sort((left, right) => recordChronology(right, left))
    .slice(0, 6)
    .reverse();

  return selected.map((item) => {
    const record = item.record || {};
    const fatigue = consultationFatigue(services, item);
    const report = services.consultation.buildConsultationReport(item, allExperiences, { regionId });
    const run = record.activityType === "rest"
      ? "休養"
      : [
          Number(record.distanceKm) > 0 ? `${formatNumber(record.distanceKm, 2)}km` : "",
          Number(record.durationMinutes) > 0 ? `${formatNumber(record.durationMinutes, 0)}分` : "",
          paceSeconds(record) != null ? paceLabel(record) : "",
        ].filter(Boolean).join(" / ") || "走行";
    return Object.freeze({
      id: record.id,
      date: record.date || "",
      run,
      fatigue: fatigue.label,
      body: compactBodySummary(report || {}),
      current: record.id === experience?.record?.id,
    });
  });
}

function regionLocatorSvg(regionId) {
  for (const view of BODY_REGION_VIEWS) {
    const match = view.paths.find(([id]) => id === regionId);
    if (!match) continue;
    const silhouette = view.silhouette
      .replaceAll("<circle ", '<circle fill="#e6ecef" stroke="#a9bbc5" stroke-width="2.5" ')
      .replaceAll("<path ", '<path fill="#e6ecef" stroke="#a9bbc5" stroke-width="2.5" ');
    return `<svg viewBox="70 10 160 430" role="img" aria-label="${escapeHtml(view.title)}の${escapeHtml(bodyRegionFormalName(regionId, "選択した部位"))}"><g class="share-body-silhouette">${silhouette}</g><path class="share-body-region" fill="#6f96ad" stroke="#234f6b" stroke-width="3" d="${match[1]}"></path></svg>`;
  }
  return "";
}

function shortDateLabel(value = "") {
  const parts = String(value).split("-");
  if (parts.length !== 3) return value;
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

function consultationTrendSvg(report = {}, regional) {
  const points = [];
  (report.recent || []).forEach((item) => {
    if (!item.regionalDirectComparable || !Number.isFinite(Number(item.regionalValue))) return;
    points.push({ date: item.date, value: Number(item.regionalValue) });
  });
  if (regional?.available) points.push({ date: report.date || "", value: Number(regional.value) });
  const unique = [];
  const seen = new Set();
  points.sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach((point) => {
    const key = `${point.date}:${point.value}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(point);
  });
  const rows = unique.slice(-6);
  if (rows.length < 2) {
    return `<div class="share-trend-empty">比較できる記録が2件以上あると推移を表示します。</div>`;
  }

  const width = 560;
  const height = 170;
  const left = 42;
  const right = 18;
  const top = 20;
  const bottom = 36;
  const values = rows.map((item) => item.value);
  const minValue = Math.min(100, ...values);
  const maxValue = Math.max(100, ...values);
  const spread = Math.max(8, maxValue - minValue);
  const min = Math.floor((minValue - spread * 0.18) / 2) * 2;
  const max = Math.ceil((maxValue + spread * 0.18) / 2) * 2;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (index) => rows.length === 1 ? left + plotWidth / 2 : left + (plotWidth * index) / (rows.length - 1);
  const y = (value) => top + ((max - value) / Math.max(1, max - min)) * plotHeight;
  const baselineY = y(100);
  const line = rows.map((item, index) => `${x(index)},${y(item.value)}`).join(" ");
  const dots = rows.map((item, index) => `<g><circle cx="${x(index)}" cy="${y(item.value)}" r="5" fill="#ffffff" stroke="#234f6b" stroke-width="2.5"></circle><text x="${x(index)}" y="${Math.max(12, y(item.value) - 10)}" text-anchor="middle">${escapeHtml(formatNumber(item.value, 1))}</text><text class="share-trend-date" x="${x(index)}" y="${height - 8}" text-anchor="middle">${escapeHtml(shortDateLabel(item.date))}</text></g>`).join("");
  return `<svg class="share-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(regional.regionName)}の比較可能な記録の推移"><line class="share-trend-baseline" x1="${left}" x2="${width - right}" y1="${baselineY}" y2="${baselineY}" stroke="#a8bac4" stroke-width="1.5" stroke-dasharray="5 4"></line><text class="share-trend-baseline-label" x="${left}" y="${Math.max(12, baselineY - 6)}">基準100</text><polyline points="${line}" fill="none" stroke="#2f6385" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>${dots}</svg>`;
}

function consultationRegionVisual(summary, report) {
  return `<div class="share-sheet-region-visual-grid"><div class="share-sheet-body-map">${regionLocatorSvg(summary.regionId)}</div><div class="share-sheet-trend"><small>比較可能な記録の推移</small>${consultationTrendSvg(report, summary)}</div></div>`;
}

function consultationShareItems({ facts, fatigue, bodyRecord, regional, next, plan, profile, recentCount }) {
  const hasPlan = Boolean(plan && plan !== "未設定");
  return [
    { key: "run", label: "今回の走行", value: facts, note: "距離・時間・ペース・コース", checked: true, available: true },
    { key: "fatigue", label: "疲労感", value: fatigue.label, note: "走る前と走った後", checked: fatigue.label !== "未記録", available: fatigue.label !== "未記録" },
    { key: "body", label: "身体の記録", value: bodyRecord, note: "本人が入力した部位・左右・程度・感覚", checked: bodyRecord !== "未記録", available: bodyRecord !== "未記録" },
    { key: "next", label: "次に確認したいこと", value: next, note: "本人が次回も見ると決めたテーマ", checked: next !== "未記録", available: next !== "未記録" },
    { key: "plan", label: "次の予定", value: plan || "未設定", note: "保存済みの次回方針", checked: hasPlan, available: hasPlan },
    { key: "recent", label: "最近の経過", value: `直近${recentCount}件`, note: "今回までの保存記録を時系列で確認", checked: recentCount > 1, available: recentCount > 0 },
    { key: "regional", label: "RunLoad参考情報", value: regional.copyValue, note: "選択部位・基準100・前回比較・推移", checked: regional.available, available: regional.available, regional },
    { key: "profile", label: "共有用プロフィール", value: profile.value, note: "任意。共有すると選んだ場合だけ表示", checked: false, available: profile.available },
  ];
}

function consultationRegionChoices({ services, experience, allExperiences, decision }) {
  const options = decision?.regionOptions || [];
  const optionMarkup = [];
  const templateMarkup = [];
  options.forEach((option) => {
    const optionDecision = services.consultation.buildDeterministicConsultation({
      experience,
      allExperiences,
      purpose: decision?.purpose || "",
      regionId: option.id,
    });
    const summary = consultationRegionalSummary(optionDecision);
    const report = services.consultation.buildConsultationReport(experience, allExperiences, { regionId: option.id });
    optionMarkup.push(`<option value="${escapeHtml(option.id)}" data-regional-value="${escapeHtml(summary.copyValue)}" data-regional-name="${escapeHtml(summary.regionName)}" data-regional-relation="${escapeHtml(summary.relation)}" data-regional-current="${escapeHtml(summary.current)}" data-regional-previous="${escapeHtml(summary.previous)}" data-regional-available="${summary.available ? "true" : "false"}"${option.id === decision?.regionId ? " selected" : ""}>${escapeHtml(option.label)}</option>`);
    templateMarkup.push(`<template data-consult-region-visual-template="${escapeHtml(option.id)}">${consultationRegionVisual(summary, report || {})}</template>`);
  });
  return Object.freeze({ options: optionMarkup.join(""), templates: templateMarkup.join("") });
}

function consultationRegionalMarkup(regional) {
  return `<span class="share-region-detail"><span class="share-region-name" data-consult-regional-name>${escapeHtml(regional.regionName)}</span><b data-consult-regional-relation>${escapeHtml(regional.relation)}</b><span data-consult-regional-current>${escapeHtml(regional.current)}</span><span data-consult-regional-previous>${escapeHtml(regional.previous)}</span></span>`;
}

function consultationShareSelector(items) {
  return items.map((item) => {
    const value = item.available ? item.value : "今回は表示できません";
    const detail = item.key === "regional" && item.regional
      ? consultationRegionalMarkup(item.regional)
      : `<em>${escapeHtml(value)}</em>`;
    return `<label class="share-source${item.available ? "" : " is-unavailable"}"><input type="checkbox" data-consult-source data-share-key="${escapeHtml(item.key)}" data-share-label="${escapeHtml(item.label)}" data-share-value="${escapeHtml(item.value)}"${item.checked ? " checked" : ""}${item.available ? "" : " disabled"}><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.note)}</small>${detail}</span></label>`;
  }).join("");
}

function choiceMarkup(options, dataAttribute) {
  return options.map((item) => `<label class="share-choice"><input type="checkbox" ${dataAttribute} value="${escapeHtml(item.value)}" data-label="${escapeHtml(item.label)}"${item.exclusive ? " data-exclusive-none=\"true\"" : ""}><span>${escapeHtml(item.label)}</span></label>`).join("");
}

function runMetricsMarkup(record = {}) {
  if (record.activityType === "rest") {
    return `<div class="share-sheet-run-rest"><strong>休養記録</strong><span>走行距離・ペースはありません。</span></div>`;
  }
  const metrics = [
    ["距離", Number(record.distanceKm) > 0 ? `${formatNumber(record.distanceKm, 2)} km` : "—"],
    ["時間", Number(record.durationMinutes) > 0 ? `${formatNumber(record.durationMinutes, 0)}分` : "—"],
    ["ペース", paceSeconds(record) != null ? paceLabel(record) : "—"],
    ["コース", record.course?.name || "未設定"],
  ];
  return `<div class="share-sheet-metrics">${metrics.map(([label, value]) => `<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>`;
}

function bodySummaryMarkup(rows = [], pageCount = 2) {
  if (!rows.length) return `<p class="share-sheet-empty">身体の記録はありません。</p>`;
  const visible = rows.slice(0, 3);
  const remaining = rows.length - visible.length;
  return `<ul class="share-sheet-body-list">${visible.map((item) => `<li><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.detail)}</span></li>`).join("")}</ul>${remaining > 0 ? `<p class="share-sheet-more">ほか${remaining}件は${pageCount}ページ目の詳細記録に掲載</p>` : ""}`;
}

function recentTableMarkup(rows = []) {
  if (!rows.length) return `<p class="share-sheet-empty">最近の記録はありません。</p>`;
  return `<div class="share-sheet-table-wrap"><table class="share-sheet-history-table"><thead><tr><th>日付</th><th>記録</th><th>疲労感</th><th>身体の記録</th></tr></thead><tbody>${rows.map((item) => `<tr${item.current ? " class=\"is-current\"" : ""}><td>${escapeHtml(shortDateLabel(item.date))}${item.current ? "<small>今回</small>" : ""}</td><td>${escapeHtml(item.run)}</td><td>${escapeHtml(item.fatigue)}</td><td>${escapeHtml(item.body)}</td></tr>`).join("")}</tbody></table></div>`;
}

function compactDate(value = "") {
  return String(value || "").replaceAll("-", "/");
}

function pageHeader(pageNumber, createdDate, recordDate) {
  return `<header class="share-sheet-head"><div><small>RUNLOAD</small><h1>共有記録シート</h1></div><dl><div><dt>対象日</dt><dd>${escapeHtml(compactDate(recordDate))}</dd></div><div><dt>作成日</dt><dd>${escapeHtml(compactDate(createdDate))}</dd></div><div><dt>ページ</dt><dd><span data-consult-page-number>${pageNumber}</span> / <span data-consult-page-count>2</span></dd></div></dl></header>`;
}

function shareDocumentMarkup({
  record,
  createdDate,
  initialQuestion,
  purposeInitial = "未選択",
  fatigue,
  bodyRows,
  automaticChanges,
  next,
  planValue,
  recentRows,
  regional,
  regionalVisual,
  profile,
}) {
  const detailsOnSecondPage = bodyRows.length > 3 && bodyRows.length <= 8;
  const hasBodyDetailsPage = bodyRows.length > 8;
  const initialPageCount = hasBodyDetailsPage ? 3 : 2;
  const automaticChangeMarkup = `<ul class="share-sheet-fact-list">${automaticChanges.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  const detailedRows = bodyRows.length > 4 ? bodyRows : [];

  return `<article class="share-print-document" data-consult-share-document data-body-details-page="${hasBodyDetailsPage ? "true" : "false"}">
    <section class="share-sheet-page share-sheet-page--primary" data-consult-document-page="primary">
      ${pageHeader(1, createdDate, record.date)}
      <section class="share-sheet-focus share-sheet-block">
        <div class="share-sheet-section-title"><span>01</span><div><small>相談の入口</small><h2>見てほしいこと</h2></div></div>
        <p class="share-sheet-purpose-tags" data-consult-document-purpose-labels>${escapeHtml(purposeInitial)}</p>
        <strong class="share-sheet-question" data-consult-document-question>${escapeHtml(initialQuestion || "未入力")}</strong>
      </section>

      <section class="share-sheet-section share-sheet-block" data-consult-document-key="run">
        <div class="share-sheet-section-title"><span>02</span><div><small>走行事実</small><h2>今回の記録</h2></div></div>
        ${runMetricsMarkup(record)}
      </section>

      <section class="share-sheet-section share-sheet-block" data-consult-document-key="fatigue"${fatigue.label === "未記録" ? " hidden" : ""}>
        <div class="share-sheet-section-title"><span>03</span><div><small>本人の主観</small><h2>疲労感</h2></div></div>
        <div class="share-sheet-fatigue"><span>走る前</span><strong>${escapeHtml(fatigue.pre == null ? "未記録" : String(fatigue.pre))}</strong><i>→</i><span>走った後</span><strong>${escapeHtml(fatigue.post == null ? "未記録" : String(fatigue.post))}</strong></div>
      </section>

      <section class="share-sheet-section share-sheet-block" data-consult-document-key="body"${bodyRows.length ? "" : " hidden"}>
        <div class="share-sheet-section-title"><span>04</span><div><small>本人の主観</small><h2>身体の記録</h2></div></div>
        ${bodySummaryMarkup(bodyRows, initialPageCount)}
      </section>

      <section class="share-sheet-two-column share-sheet-block">
        <div class="share-sheet-subsection">
          <small>05</small><h2>最近変えたこと</h2>
          <div class="share-sheet-auto-change"><b>記録上の変化</b>${automaticChangeMarkup}</div>
          <p class="share-sheet-user-note" data-consult-document-changes>追加情報：未入力</p>
        </div>
        <div class="share-sheet-subsection">
          <small>06</small><h2>すでに行った対応</h2>
          <p class="share-sheet-user-note" data-consult-document-actions>未入力</p>
        </div>
      </section>

      <section class="share-sheet-two-column share-sheet-block share-sheet-next-plan" data-consult-pair="next-plan">
        <div class="share-sheet-subsection share-sheet-next" data-consult-document-key="next"${next === "未記録" ? " hidden" : ""}>
          <small>07</small><h2>次に確認したいこと</h2><strong>${escapeHtml(next)}</strong>
        </div>
        <div class="share-sheet-subsection share-sheet-plan" data-consult-document-key="plan"${planValue === "未設定" ? " hidden" : ""}>
          <small>08</small><h2>次の予定</h2><strong>${escapeHtml(planValue)}</strong>
        </div>
      </section>

      <footer class="share-sheet-footer"><span>本人の記録を第三者に共有し、助言を得るための整理資料です。</span><span>RunLoad</span></footer>
    </section>

    <section class="share-sheet-page share-sheet-page--secondary" data-consult-document-page="secondary" data-has-body-details="${detailsOnSecondPage ? "true" : "false"}">
      ${pageHeader(2, createdDate, record.date)}
      <section class="share-sheet-section share-sheet-block" data-consult-document-key="recent">
        <div class="share-sheet-section-title"><span>09</span><div><small>時系列</small><h2>最近の経過</h2></div></div>
        ${recentTableMarkup(recentRows)}
      </section>

      <section class="share-sheet-section share-sheet-block share-sheet-region" data-consult-document-key="regional"${regional.available ? "" : " hidden"}>
        <div class="share-sheet-section-title"><span>10</span><div><small>アプリの参考情報</small><h2>RunLoad参考情報</h2></div></div>
        <div class="share-sheet-region-summary"><div><small>対象部位</small><strong data-consult-regional-name>${escapeHtml(regional.regionName)}</strong></div><div><small>今回</small><strong data-consult-regional-current>${escapeHtml(regional.current)}</strong></div><div><small>前回比較</small><strong data-consult-regional-previous>${escapeHtml(regional.previous)}</strong></div></div>
        <p class="share-sheet-region-relation" data-consult-regional-relation>${escapeHtml(regional.relation)}</p>
        <div class="share-sheet-region-visual" data-consult-region-visual>${regionalVisual}</div>
        <p class="share-sheet-boundary">この数値は選択した部位自身の基準100との比較です。安全値・正常値・初心者平均ではなく、診断、障害予測、原因、走行可否を示しません。</p>
      </section>

      ${detailsOnSecondPage ? `<section class="share-sheet-section share-sheet-block" data-consult-document-key="body" data-consult-secondary-body-details>
        <div class="share-sheet-section-title"><span>11</span><div><small>詳細</small><h2>身体の記録一覧</h2></div></div>
        <table class="share-sheet-detail-table"><thead><tr><th>部位</th><th>本人の記録</th></tr></thead><tbody>${bodyRows.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.detail)}</td></tr>`).join("")}</tbody></table>
      </section>` : ""}

      <section class="share-sheet-section share-sheet-block" data-consult-document-key="profile" hidden>
        <div class="share-sheet-section-title"><span>12</span><div><small>本人が共有を選択した場合のみ</small><h2>共有プロフィール</h2></div></div>
        <p>${escapeHtml(profile.value)}</p>
      </section>

      <footer class="share-sheet-footer"><span>主観記録・走行事実・RunLoad参考情報を分けて表示しています。</span><span>RunLoad</span></footer>
    </section>

    ${hasBodyDetailsPage ? `<section class="share-sheet-page share-sheet-page--details" data-consult-document-page="details" data-consult-conditional-page="body-details">
      ${pageHeader(3, createdDate, record.date)}
      <section class="share-sheet-section share-sheet-block">
        <div class="share-sheet-section-title"><span>13</span><div><small>詳細</small><h2>身体の記録一覧</h2></div></div>
        <table class="share-sheet-detail-table"><thead><tr><th>部位</th><th>本人の記録</th></tr></thead><tbody>${detailedRows.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.detail)}</td></tr>`).join("")}</tbody></table>
      </section>
      <footer class="share-sheet-footer"><span>入力された身体の記録をそのまま整理して表示しています。</span><span>RunLoad</span></footer>
    </section>` : ""}
  </article>`;
}

function renderConsultationContent({ services, experience, plan, regionId = "", confirmationThread = null, backHref = "#/more", backLabel = "その他へ戻る", selfHref = "#/consultation" }) {
  if (!experience?.record) {
    return `<div class="screen screen--consultation screen-layout screen-layout--consultation secondary-derived-screen"><header class="secondary-derived-head"><a class="secondary-derived-back" href="${escapeHtml(backHref)}">← ${escapeHtml(backLabel)}</a><strong>共有用にまとめる</strong><span aria-hidden="true"></span></header><div class="secondary-derived-body"><section class="head"><p class="eyebrow">SHARE PREP</p><h1>共有用にまとめる</h1><p>保存した記録があると、指導者などに見せる内容を整理できます。</p></section><section class="panel consultation-empty-state"><div class="consultation-empty-state__copy"><small>RECORD</small><strong>共有できる記録はまだありません</strong><p>走行または休養を保存すると、共有する内容をここで整理できます。</p></div><div class="actions"><a class="button button--primary" href="#/record-input">記録を始める</a></div></section></div></div>`;
  }

  const record = experience.record;
  const allExperiences = services.workflows.records.loadAllExperiences();
  const decision = services.consultation.buildDeterministicConsultation({
    experience,
    allExperiences,
    regionId,
  });
  const selectedRegionId = decision?.regionId || regionId;
  const presentation = buildReportPresentation({ services, experience, regionId: selectedRegionId });
  const facts = consultationFacts(experience);
  const fatigue = consultationFatigue(services, experience);
  const bodyRows = consultationBodyRows(presentation?.report || {});
  const bodyRecord = consultationBodyRecordSummary(bodyRows);
  const profile = consultationProfileSummary(services.storage.profile.load());
  const regional = consultationRegionalSummary(decision);
  const planValue = plan
    ? `${plan.scheduledDate ? formatLocalDate(plan.scheduledDate) : "日付未設定"}・${planSummary(plan)}`
    : "未設定";
  const confirmationTheme = confirmationThread ? selfUnderstandingThreadTitle(confirmationThread, allExperiences) : "";
  const next = confirmationTheme || "未記録";
  const recentRows = consultationRecentRows({ services, allExperiences, experience, regionId: selectedRegionId });
  const automaticChanges = consultationAutomaticChanges(allExperiences, experience);
  const items = consultationShareItems({ facts, fatigue, bodyRecord, regional, next, plan: planValue, profile, recentCount: recentRows.length });
  const regionChoices = consultationRegionChoices({ services, experience, allExperiences, decision });
  const initialQuestion = confirmationTheme;
  const selector = consultationShareSelector(items);
  const regionalVisual = consultationRegionVisual(regional, presentation?.report || {});
  const documentMarkup = shareDocumentMarkup({
    record,
    createdDate: localDateKey(),
    initialQuestion,
    fatigue,
    bodyRows,
    automaticChanges,
    next,
    planValue,
    recentRows,
    regional,
    regionalVisual,
    profile,
  });

  return `<div class="screen screen--consultation screen-layout screen-layout--consultation secondary-derived-screen" data-consultation-screen data-share-prep>
    <header class="secondary-derived-head"><a class="secondary-derived-back" href="${escapeHtml(backHref)}">← ${escapeHtml(backLabel)}</a><strong>共有用にまとめる</strong><span aria-hidden="true"></span></header>
    <div class="secondary-derived-body">
      <section class="head"><p class="eyebrow">SHARE PREP</p><h1>共有用にまとめる</h1><p>指導者や助言者が状況を短時間で把握できるよう、今回の記録・本人の状態・最近の経過を整理します。</p></section>

      <section class="source"><div><small>対象の記録</small><strong>${escapeHtml(formatLocalDate(record.date))}</strong><span>${escapeHtml(facts)}</span></div><a href="#/result?recordId=${encodeURIComponent(record.id)}">結果を確認</a></section>

      ${confirmationTheme ? `<section class="consultation-confirmation-theme"><small>共有する内容</small><strong>次回見ること：${escapeHtml(confirmationTheme)}</strong><span>本人が次回も見ると決めた内容です。個人的な追加メモは含めません。</span></section>` : ""}

      <section class="section share-step share-purpose-step"><div class="section-head"><small>STEP 1</small><h2>何を見てほしいか</h2><p>助言してほしい内容を最初に明確にします。</p></div>
        <div class="share-choice-grid" role="group" aria-label="見てほしい内容の分類">${choiceMarkup(PURPOSE_OPTIONS, "data-consult-purpose-option")}</div>
        <label class="field share-question-field"><span>特に聞きたいこと <b>必須</b></span><textarea maxlength="300" placeholder="例：最近疲労感が強くなっています。次回の練習内容をどう調整すべきか見てほしいです。" data-consult-question required>${escapeHtml(initialQuestion)}</textarea><small>診断を求める欄ではなく、指導・助言してほしい内容を書きます。</small></label>
        <p class="share-required-status" data-consult-required-status role="status" aria-live="polite"></p>
      </section>

      <section class="section share-step share-context-step"><div class="section-head"><small>STEP 2</small><h2>今回の状況を補足</h2><p>記録上の変化に加えて、自分で変えたこと・すでに行った対応を補足します。</p></div>
        <div class="share-context-grid">
          <section class="share-context-card"><small>記録から確認できる変化</small><strong>前回の走行記録との事実比較</strong><ul>${automaticChanges.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><p>変化と身体の状態の因果関係を示すものではありません。</p></section>
          <section class="share-context-card"><small>最近変えたこと</small><div class="share-choice-grid share-choice-grid--compact">${choiceMarkup(CHANGE_OPTIONS, "data-consult-change-option")}</div><label class="field"><span>補足（任意）</span><textarea maxlength="240" placeholder="例：シューズを新しいものに変更" data-consult-change-note></textarea></label></section>
          <section class="share-context-card"><small>すでに行った対応</small><div class="share-choice-grid share-choice-grid--compact">${choiceMarkup(ACTION_OPTIONS, "data-consult-action-option")}</div><label class="field"><span>補足（任意）</span><textarea maxlength="240" placeholder="例：翌日は休養し、その次は距離を短くした" data-consult-action-note></textarea></label></section>
        </div>
      </section>

      <section class="section share-step share-source-step"><div class="section-head"><small>STEP 3</small><h2>共有する情報を選ぶ</h2><p>本人の主観、走行事実、RunLoad参考情報を分けたまま必要な項目だけ選びます。</p></div>
        <label class="field share-region-field"><span>RunLoad参考情報で表示する部位</span><select data-consult-region-selector>${regionChoices.options}</select><small>部位を変更すると、基準100・前回比較・推移・人体図も同じ部位に切り替わります。</small></label>
        <div class="share-source-list">${selector}</div>
      </section>

      <section class="section share-step share-document-step"><div class="section-head"><small>STEP 4</small><h2>完成資料を確認</h2><p>画面表示と印刷・PDFで同じ情報構成を使います。印刷時はA4として改ページされます。</p></div>
        <div class="share-document-stage" data-consult-document-stage>
          <div class="share-document-toolbar"><strong>A4共有記録シート</strong><button type="button" data-action="close-consult-viewer" aria-label="全画面表示を閉じる">×</button></div>
          ${documentMarkup}
        </div>
        <div class="share-output-actions">
          <button class="output primary" type="button" data-action="open-consult-viewer"><span><strong>画面で見せる</strong><small>完成資料を大きく表示</small></span><i>›</i></button>
          <button class="output" type="button" data-action="print-consultation-report"><span><strong>印刷・PDF</strong><small>A4共有記録シートとして出力</small></span><i>›</i></button>
          <button class="output secondary" type="button" data-action="copy-consultation-report"><span><strong>短文をコピー</strong><small>主要項目だけを文章で共有</small></span><i>›</i></button>
        </div>
      </section>

      <textarea id="consultation-report-text" class="visually-hidden" readonly></textarea>
      <div class="consultation-region-templates" hidden>${regionChoices.templates}</div>

      <p class="boundary">共有する内容は本人が選びます。RunLoad参考情報は、診断・安全性・けがの危険性・原因・走行可否を判定するものではありません。</p>
      <a class="support-link" href="#/support-guidance?recordId=${encodeURIComponent(record.id)}&returnTo=${encodeURIComponent(selfHref)}"><span><small>症状や体調について公的な案内を確認したい場合</small><strong>公的サポートを確認</strong></span><i>›</i></a>
    </div>
  </div>`;
}

export function renderConsultationScreen({ services, context }) {
  const requestedRecordId = context.parameters.get("recordId") || "";
  const experience = requestedRecordId
    ? services.workflows.records.loadExperience(requestedRecordId)
    : services.workflows.records.loadLatestExperience();
  const plans = services.storage.plans.loadAll();
  const plan = latestPlan(plans);
  const regionId = context.parameters.get("regionId") || "";
  const threadId = context.parameters.get("threadId") || "";
  const confirmationThread = threadId ? services.storage.selfUnderstandingThreads?.findById?.(threadId) : null;
  const from = context.parameters.get("from") || "";
  const roomOrigin = context.parameters.get("roomOrigin") || "result";
  const selfQuery = new URLSearchParams();
  if (requestedRecordId) selfQuery.set("recordId", requestedRecordId);
  if (regionId) selfQuery.set("regionId", regionId);
  if (confirmationThread?.id) selfQuery.set("threadId", confirmationThread.id);
  if (from) selfQuery.set("from", from);
  if (from === "interpretation-room") selfQuery.set("roomOrigin", roomOrigin);
  const selfHref = `#/consultation${selfQuery.size ? `?${selfQuery.toString()}` : ""}`;
  let backHref = requestedRecordId ? `#/result?recordId=${encodeURIComponent(requestedRecordId)}` : "#/more";
  let backLabel = requestedRecordId ? "結果へ戻る" : "その他へ戻る";
  if (from === "interpretation-room") {
    const roomQuery = new URLSearchParams();
    if (requestedRecordId) roomQuery.set("recordId", requestedRecordId);
    roomQuery.set("origin", roomOrigin);
    if (regionId) roomQuery.set("regionId", regionId);
    backHref = `#/interpretation-room?${roomQuery.toString()}`;
    backLabel = "結果の整理へ戻る";
  }
  return renderConsultationContent({ services, experience, plan, regionId, confirmationThread, backHref, backLabel, selfHref });
}

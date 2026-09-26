import { PRIMARY_REGIONAL_V2_REGION_DEFS, createPlanFactPreview, bodyRegionFormalName } from "../core/runloadCore.js";

import { escapeHtml, renderStatusLabel } from "./commonComponents.js";
import { buildPlanConditionSnapshot, normalizePlanSession } from "./planPresentation.js";

import { SAFETY_FLAG_LABELS, SUBJECTIVE_STATUS_LABELS, formatLocalDate, formatNumber } from "./recordPresentation.js";

const REGIONS = Object.freeze(PRIMARY_REGIONAL_V2_REGION_DEFS.map((region) => Object.freeze({ id: region.displayId, name: region.name })));

const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const DEFAULT_REGION_ID = "BA-DISP-019";

function hasFiniteValue(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function normalizeRegionId(value = "") {
  const requested = String(value || "");
  return REGION_BY_ID.has(requested) ? requested : DEFAULT_REGION_ID;
}

function surfaceLabel(value) {
  return {
    REF_HARD_EVEN_STABLE: "硬く平らで安定した基準路面",
    DRY_STABLE_GRASS_TURF: "乾いた安定した天然芝・人工芝",
    DEEP_DRY_SOFT_SAND: "深く乾いた柔らかい砂",
    EXPLICIT_UNEVEN: "明確な凹凸・不整地（説明のみ）",
    KNOWN_OTHER: "把握済み・記録のみ",
    UNKNOWN: "不明",
  }[value] || "不明";
}

function gradeLabel(course = {}) {
  if (course.gradeKnowledge === "KNOWN_FLAT") return "平坦と把握";
  if (course.gradeKnowledge !== "KNOWN_PROFILE") return "不明";
  const values = [];
  if (Number(course.upPercent || 0) > 0) {
    values.push(`上り${formatNumber(course.upPercent, 1)}%区間・坂の傾き${formatNumber(course.upGradePercent, 1)}%`);
  }
  if (Number(course.downPercent || 0) > 0) {
    values.push(`下り${formatNumber(course.downPercent, 1)}%区間・坂の傾き${formatNumber(course.downGradePercent, 1)}%`);
  }
  const flat = 100 - Number(course.upPercent || 0) - Number(course.downPercent || 0);
  if (flat > 0) values.unshift(`平坦${formatNumber(flat, 1)}%区間`);
  return values.join("・") || "把握済みプロファイル";
}

function runningFormatLabel(value) {
  return {
    CONTINUOUS_RUN: "連続走",
    RUN_WALK: "走りと歩きを併用",
    UNKNOWN: "未設定",
  }[value] || "未設定";
}

function stepsSourceLabel(value) {
  return {
    DEVICE_MEASURED: "端末・時計で計測",
    DEVICE_SYNCED: "端末から取り込み",
    ESTIMATED: "手入力・おおよそ",
    UNKNOWN: "取得方法は未設定",
  }[value] || "取得方法は未設定";
}

function planPreview(plan = {}) {
  return createPlanFactPreview({
    session: plan.plannedSession || {},
    scheduledDate: plan.scheduledDate || "",
    previewId: `consultation-plan-${plan.id || "preview"}`,
  });
}

export function createPlanShareMemo(_services, plan) {
  if (!plan) return "";
  const preview = planPreview(plan);
  const session = normalizePlanSession(plan.plannedSession || {});
  const snapshot = buildPlanConditionSnapshot(session);
  const values = Object.fromEntries(snapshot.rows.map((row) => [row.key, row.value]));
  const lines = [
    `${formatLocalDate(plan.scheduledDate)}の予定について相談したいです。`,
    `予定：${plan.title || (session.activityType === "rest" ? "休養予定" : "走行予定")}`,
  ];
  if (session.activityType === "rest") {
    lines.push("内容：休養予定");
  } else {
    lines.push(
      `距離：${values.distance}`,
      `実走予定時間：${values.duration}`,
      `走り方：${values.runningFormat}`,
      `コース名：${values.courseName}`,
      `坂道：${values.grade}`,
      `路面：${values.surface}`,
    );
    lines.push(`予定条件：${preview.ok ? "入力済み" : preview.message || "入力条件を確認"}`);
  }
  if (plan.memo) lines.push(`予定メモ：${plan.memo}`);
  lines.push("予定は入力した事実を整理したものです。処方、最適条件、身体状態、走行可否の判定ではありません。");
  return lines.join("\n");
}

function conditionRows(record = {}) {
  if (record.activityType === "rest") return [["記録の種類", "休養"], ["走行条件", "なし"]];
  const course = record.course || {};
  return [
    ["距離", hasFiniteValue(record.distanceKm) ? `${formatNumber(record.distanceKm, 2)} km` : "未入力"],
    ["実際に走った時間", hasFiniteValue(record.durationMinutes) ? `${formatNumber(record.durationMinutes, 1)} 分` : "未入力"],
    ["走り方", runningFormatLabel(record.runningFormat)],
    ["歩数", Number(record.steps) > 0 ? `${formatNumber(record.steps, 0)} 歩（${stepsSourceLabel(record.stepsProvenance)}）` : "未入力"],
    ["コース名", course.name || "未設定"],
    ["坂道", gradeLabel(course)],
    ["路面", surfaceLabel(course.modelSurfaceClass)],
  ];
}

function subjectiveRows(report = {}) {
  const rows = [];
  report.exactBodyObservations?.forEach((item) => {
    const values = [];
    if (item.lateralityLabel) values.push(item.lateralityLabel);
    if (item.intensity != null) values.push(`程度 ${item.intensity}/5`);
    if (item.sensation) values.push(item.sensation);
    rows.push([item.label, values.join("・") || "身体の記録あり"]);
  });
  report.subjectiveParts?.forEach((item) => {
    const values = [];
    if (item.fatigue > 0) values.push(`疲れ・だるさ ${item.fatigue}/5`);
    if (item.discomfort > 0) values.push(`気になる感じ ${item.discomfort}/5`);
    rows.push([item.label, values.join("・") || "確認済み"]);
  });
  return rows.length ? rows : [["入力状況", SUBJECTIVE_STATUS_LABELS[report.subjectiveStatus] || "部位入力なし"]];
}

function personalRows(report = {}) {
  return report.personalContextItems?.map((item, index) => [`今日の走り${index + 1}`, item]) || [];
}

function rowsMarkup(rows, className = "report-fact-list") {
  return `<dl class="${escapeHtml(className)}">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
}

function reportSection({ id, kicker, title, body, className = "" }) {
  return `<section class="report-section${className ? ` ${escapeHtml(className)}` : ""}" aria-labelledby="${escapeHtml(id)}"><div class="report-section__heading"><p>${escapeHtml(kicker)}</p><h2 id="${escapeHtml(id)}">${escapeHtml(title)}</h2></div>${body}</section>`;
}

export function buildReportPresentation({ services, experience, regionId = "" }) {
  const settings = services.storage.settings.load() || {};
  const selectedRegionId = normalizeRegionId(regionId || settings.selectedA7ReportRegionId);
  const allExperiences = services.workflows.records.loadAllExperiences();
  const report = services.consultation.buildConsultationReport(experience, allExperiences, { regionId: selectedRegionId });
  return Object.freeze({
    experience,
    report,
    selectedRegionId,
    copy: Object.freeze({
      standard: createPublicConsultationText({ report, experience, detailed: false }),
      detailed: createPublicConsultationText({ report, experience, detailed: true }),
    }),
  });
}

function reportHeader({ presentation, format }) {
  const { report } = presentation;
  const priority = report.supportRoute === "consult" || report.supportRoute === "urgent";
  const statusLabel = report.supportRoute === "urgent" ? "公的な窓口も確認" : priority ? "身体の記録を先に確認" : "今回の記録";
  return `<header class="report-sheet__header"><div><p>${format === "detailed" ? "詳しい相談メモ" : "相談メモ"}</p><h2 class="report-sheet__title">${priority ? "相談メモ" : "共有メモ"}</h2><p>${escapeHtml(formatLocalDate(report.date))}・${escapeHtml(report.activity)}</p></div>${renderStatusLabel(statusLabel, priority ? "attention" : "info")}</header>`;
}

function subjectiveSection(presentation) {
  const { report } = presentation;
  const personal = personalRows(report);
  const note = report.consultationNote ? `<div class="report-free-note"><strong>相談したいこと</strong><p>${escapeHtml(report.consultationNote)}</p></div>` : "";
  const flags = report.conditionFlags?.length
    ? `<div class="report-free-note"><strong>体調の記録</strong><ul>${report.conditionFlags.map((flag) => `<li>${escapeHtml(SAFETY_FLAG_LABELS[flag] || flag)}</li>`).join("")}</ul></div>`
    : "";
  return reportSection({
    id: "report-subjective-title",
    kicker: "01 / 身体の記録",
    title: "身体の記録",
    className: "report-section--subjective",
    body: `${personal.length ? `<div class="report-free-note"><strong>シューズ・走り方のメモ</strong>${rowsMarkup(personal, "report-fact-list report-fact-list--personal")}</div>` : ""}${rowsMarkup(subjectiveRows(report))}${flags}${note}`,
  });
}

function recordSection(presentation) {
  return reportSection({
    id: "report-record-title",
    kicker: "02 / 今回の走り",
    title: "今回の走り",
    body: rowsMarkup(conditionRows(presentation.experience?.record || {})),
  });
}

function conditionValueMarkup(regional = {}) {
  if (!hasFiniteValue(regional.value)) {
    return "<strong>数値なし</strong><small>今回の条件では目安を表示できません</small>";
  }
  const delta = Number(regional.delta || 0);
  const deltaText = Math.abs(delta) < 0.05 ? "±0" : `${delta > 0 ? "+" : ""}${formatNumber(delta, 1)}`;
  return `<strong>${escapeHtml(formatNumber(regional.value, 1))}</strong><small>基準からの差 ${escapeHtml(deltaText)}ポイント</small>`;
}

function exposureValueMarkup(exposure = {}) {
  if (!hasFiniteValue(exposure.qEquivalent)) return "<strong>数値なし</strong><small>今回の条件では走行距離を確認できません</small>";
  return `<strong>${escapeHtml(formatNumber(exposure.qEquivalent, 2))} km</strong><small>部位の数値とは別の走行事実</small>`;
}

function modelSection(presentation) {
  const model = presentation.report.modelReference;
  if (model.state === "REST") {
    return reportSection({ id: "report-model-title", kicker: "03 / アプリの目安", title: "走行の目安なし", body: "<p>休養記録には12部位の目安を表示しません。</p>" });
  }
  if (model.state !== "RUN") {
    return reportSection({ id: "report-model-title", kicker: "03 / アプリの目安", title: "目安なし", body: "<p>この記録では12部位の目安を表示できません。</p>" });
  }
  const regional = model.regional;
  const regionName = bodyRegionFormalName(regional.regionId, regional.regionLabel);
  return reportSection({
    id: "report-model-title",
    kicker: "03 / アプリの目安",
    title: "選択した部位の目安",
    body: `<div class="report-model-total"><span>${escapeHtml(regionName)}の部位の目安</span>${conditionValueMarkup(regional)}<em>${escapeHtml(regional.reference)}</em><p>この部位自身の基準と比較します。別部位とのランキングには使いません。</p></div>
      <div class="report-model-total"><span>走行距離</span>${exposureValueMarkup(regional.exposure)}<em>今回の走行事実</em><p>走行距離は部位の目安へ掛けず、別の走行事実として扱います。</p></div>
      <p class="report-print-note">基準として使う100は、安全値・正常値・初心者平均・推奨値ではありません。数値は実測した力やけがの確率を表しません。</p>`,
  });
}

function notesSection(presentation) {
  const memo = presentation.experience?.record?.memo || "";
  if (!memo && !presentation.report.consultationNote) return "";
  const rows = [];
  if (memo) rows.push(["記録メモ", memo]);
  if (presentation.report.consultationNote) rows.push(["相談したいこと", presentation.report.consultationNote]);
  return reportSection({ id: "report-notes-title", kicker: "04 / メモ", title: "自分で残した文章", body: rowsMarkup(rows, "report-notes-list") });
}

function printableStatus(row = {}) {
  if (row.activityType === "rest") return "休養";
  return "走行";
}

function detailedHistorySection(presentation) {
  const rows = presentation.report.recent || [];
  if (!rows.length) return `<section class="report-period-section report-period-section--printable"><div class="report-section__heading"><p>05 / 最近の記録</p><h2>比べられる記録なし</h2></div><p>比べられる過去記録はまだありません。</p></section>`;
  const regionName = bodyRegionFormalName(presentation.report.modelReference.regional.regionId, presentation.report.modelReference.regional.regionLabel);
  const counts = presentation.report.comparisonCounts;
  const regionalLabel = "部位の目安";
  return `<section class="report-period-section report-period-section--printable" aria-labelledby="report-period-title"><div class="report-section__heading"><p>05 / 最近の記録</p><h2 id="report-period-title">同じ部位で比べられる記録を確認</h2></div>
    <p><strong>${escapeHtml(regionName)}／${escapeHtml(regionalLabel)}</strong><br>${escapeHtml(presentation.report.modelReference.regional.reference)}</p>
    <div class="report-period-summary"><div><strong>${escapeHtml(String(counts.direct))}件</strong><span>比べられる</span></div><div><strong>${escapeHtml(String(counts.excluded))}件</strong><span>比べない</span></div><div><strong>${escapeHtml(String(counts.nonnumeric))}件</strong><span>数値なし</span></div></div>
    <table class="report-period-table"><thead><tr><th>日付</th><th>状態</th><th>${escapeHtml(regionName)}の${escapeHtml(regionalLabel)}</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.date.slice(5).replace("-", "/"))}</td><td>${escapeHtml(printableStatus(row))}</td><td>${row.regionalDirectComparable && hasFiniteValue(row.regionalValue) ? escapeHtml(formatNumber(row.regionalValue, 1)) : "比べない"}</td></tr>`).join("")}</tbody></table>
    <p class="report-print-note">同じ部位・同じ計算方法・同じ基準で比べられる記録だけをつなぎます。空欄・休養・数値なしを0や100として扱いません。</p>
  </section>`;
}

function createPublicConsultationText({ report, experience, detailed = false }) {
  if (!report) return "";
  const lines = ["相談用レポート", `対象日：${report.date}`, `記録：${report.activity}`];
  if (report.courseName) lines.push(`コース：${report.courseName}`);
  const record = experience?.record || {};
  conditionRows(record).forEach(([label, value]) => lines.push(`${label}：${value}`));
  if (report.personalContextItems?.length) {
    lines.push("シューズ・走り方のメモ：");
    report.personalContextItems.forEach((item) => lines.push(`- ${item}`));
  }
  lines.push("身体の記録：");
  subjectiveRows(report).forEach(([label, value]) => lines.push(`- ${label}：${value}`));
  if (report.consultationNote) lines.push(`相談したいこと：${report.consultationNote}`);
  const regional = report.modelReference?.regional || {};
  if (report.modelReference?.state === "RUN") {
    const regionName = bodyRegionFormalName(regional.regionId, regional.regionLabel || "選択した部位");
    lines.push(hasFiniteValue(regional.value)
      ? `${regionName}の部位の目安：${formatNumber(regional.value, 1)}（基準からの差 ${Number(regional.delta || 0) >= 0 ? "+" : ""}${formatNumber(Number(regional.delta || 0), 1)}ポイント）`
      : `${regionName}の部位の目安：数値なし`);
    const exposure = regional.exposure || {};
    if (hasFiniteValue(exposure.qEquivalent)) lines.push(`走行距離：${formatNumber(exposure.qEquivalent, 2)} km（部位の目安とは別の走行事実）`);
    lines.push("部位の目安は、同じ部位自身の基準との比較です。別部位の順位、安全値、正常値、推奨値ではありません。");
  } else if (report.modelReference?.state === "REST") {
    lines.push("部位の目安：休養記録のため表示なし");
  } else {
    lines.push("部位の目安：この保存記録では表示できません");
  }
  if (detailed && Array.isArray(report.recent) && report.recent.length) {
    const regionName = bodyRegionFormalName(regional.regionId, regional.regionLabel || "選択した部位");
    lines.push("", "最近の保存記録：");
    report.recent.forEach((row) => {
      const value = row.regionalDirectComparable && hasFiniteValue(row.regionalValue)
        ? `${formatNumber(row.regionalValue, 1)}`
        : "比較なし";
      lines.push(`- ${row.date}：${row.activity}／${regionName} ${value}`);
    });
    lines.push("同じ部位・同じ計算方法・同じ基準で比べられる記録だけを比較します。");
  }
  lines.push("身体の記録、疲労感、部位の目安は別に扱います。診断、けがの予測、安全性、回復度、走行可否の判定には使いません。");
  return lines.join("\n");
}

export function renderReportSheet({ presentation, format = "standard" }) {
  return `<article class="report-sheet report-sheet--${escapeHtml(format)}" data-report-sheet data-report-format="${escapeHtml(format)}">
    ${reportHeader({ presentation, format })}
    ${subjectiveSection(presentation)}
    ${recordSection(presentation)}
    ${modelSection(presentation)}
    ${notesSection(presentation)}
    ${format === "detailed" ? detailedHistorySection(presentation) : ""}
    <footer class="report-sheet__boundary"><strong>このメモの範囲</strong><p>身体の記録はアプリの目安とは別に扱い、走行距離は部位の数値へ掛けず別の走行事実として扱います。アプリの目安は記録を振り返るための参考です。診断や安全の判定には使えません。共有する範囲と相手は自分で選びます。</p></footer>
  </article>`;
}

export function createReportCopyText({ presentation, format = "standard" }) {
  return format === "detailed" ? presentation.copy.detailed : presentation.copy.standard;
}

export function selectedReportRegionalValue(presentation) {
  return presentation?.report?.modelReference?.regional?.value ?? null;
}

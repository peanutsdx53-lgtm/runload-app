import { RUNNING_EVIDENCE_MODEL_VERSION } from '../core/appCore.js';
import { compareRecordChronology, fmt, signed, signatureFor, signaturesComparable } from "../shared/recordUtilities.js";
export { fmt, signed, signatureFor, signaturesComparable };
import { isPresentFiniteNumber as finite } from "../shared/valueUtilities.js";
import { escapeHtml } from "../ui/commonComponents.js";
import { formatLocalDate, formatLocalTime } from "../ui/recordPresentation.js";
import { courseSummaryText } from "../ui/coursePresentation.js";
import { bodyRegionFormalName, PRIMARY_REGIONAL_V2_MODEL_VERSION, PRIMARY_REGIONAL_V2_REGION_DEFS } from "../core/appCore.js";
import { rofJSelectionDescriptor } from "../core/rofJAuthorConfirmedScale.js";
import { findSavedRunMeasurement } from "../ui/runMeasurementState.js";

// The same view geometry drives result, history/timeline and detail screens.
export { BODY_REGION_VIEWS as VIEWS } from "../ui/bodyRegionVisuals.js";
import { BODY_REGION_VIEWS as VIEWS } from "../ui/bodyRegionVisuals.js";

export function direction(value) { if (!finite(value)) return "unavailable"; const delta = Number(value) - 100; return Math.abs(delta) < 1 ? "reference" : delta > 0 ? "above" : "below"; }
export function position(value) { if (!finite(value) || Number(value) <= 0) return 50; return Math.max(4, Math.min(96, 50 + Math.log2(Number(value) / 100) * 20)); }
export function modelCurrent(resultRecord = null) { return (resultRecord?.model_version === RUNNING_EVIDENCE_MODEL_VERSION || resultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION); }
export function formatPace(record = {}) { const distance = Number(record.distanceKm); const duration = Number(record.durationMinutes); if (!(distance > 0) || !(duration > 0)) return "—"; const seconds = Math.round(duration * 60 / distance); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
export function runFormatLabel(record = {}) { return String(record.runningFormat || "").toUpperCase() === "RUN_WALK" ? "走り＋歩き" : "連続して走った"; }
export function recordChronology(left = {}, right = {}) {
  return compareRecordChronology(left, right);
}
export function recordMomentLabel(record = {}) {
  const time = formatLocalTime(record.createdAt);
  return `${formatLocalDate(record.date)}${time ? ` ${time}` : ""}`;
}
export function changeMagnitudeGlyph(delta) {
  if (!finite(delta)) return "—";
  const value = Number(delta);
  if (Math.abs(value) < 1) return "→";
  const marks = Math.min(3, Math.max(1, Math.ceil(Math.abs(value) / 10)));
  return (value > 0 ? "▲" : "▼").repeat(marks);
}

export { finite };

export function regionRows(resultRecord = null) {
  const rows = resultRecord?.result?.regions || [];
  const byId = new Map(rows.map((row) => [row.regionId, row]));
  return PRIMARY_REGIONAL_V2_REGION_DEFS.map((def) => byId.get(def.displayId) || { regionId: def.displayId, regionName: def.name, value: null });
}

function latestComparablePrevious(resultRecord, experiences, regionId) {
  const signature = signatureFor(resultRecord, regionId);
  if (!signature) return null;
  const currentExperience = experiences.find((item) => item.regionalV2ResultRecord?.id === resultRecord?.id);
  const currentRecord = currentExperience?.record || null;
  return experiences
    .filter((item) => modelCurrent(item.regionalV2ResultRecord) && item.regionalV2ResultRecord?.id !== resultRecord?.id)
    .filter((item) => !currentRecord || recordChronology(item.record || {}, currentRecord) < 0)
    .map((item) => ({ experience: item, row: item.regionalV2Result?.regions?.find((candidate) => candidate.regionId === regionId), signature: signatureFor(item.regionalV2ResultRecord, regionId) }))
    .filter((item) => item.row && signaturesComparable(signature, item.signature) && finite(item.row.value))
    .sort((a, b) => recordChronology(b.experience.record || {}, a.experience.record || {}))[0] || null;
}

export function rowInfo(resultRecord, experiences, row, index) {
  const previous = latestComparablePrevious(resultRecord, experiences, row.regionId);
  const prev = previous?.row?.value;
  const delta = finite(row.value) && finite(prev) ? Number(row.value) - Number(prev) : null;
  const conditionUp = finite(row.value) && Number(row.value) - 100 >= 1;
  const previousUp = finite(delta) && delta >= 1;
  return Object.freeze({ row, index, previous, prev, delta, focus: conditionUp || previousUp, focusPriority: conditionUp && previousUp ? 1 : conditionUp ? 2 : 3 });
}

export function locatorSvg(regionId) {
  for (const view of VIEWS) {
    const match = view.paths.find(([id]) => id === regionId);
    if (!match) continue;
    return `<svg viewBox="70 10 160 430" aria-hidden="true"><defs><clipPath id="result-locator-clip-${regionId}">${view.silhouette}</clipPath></defs><g class="mini-silhouette">${view.silhouette}</g><path class="mini-region" clip-path="url(#result-locator-clip-${regionId})" d="${match[1]}"></path></svg>`;
  }
  return "";
}

export function bodyMap(resultRecord, infos, idSuffix = "main", selectedId = "", { enhancedTouch = false, renderPathClass = null, renderAdditionalRegionPath = null } = {}) {
  const byId = new Map(infos.map((info) => [info.row.regionId, info]));
  return VIEWS.map((view) => `<figure class="body-view" data-view="${view.key}"><figcaption>${view.title}</figcaption><svg viewBox="70 10 160 430"${enhancedTouch ? ' aria-hidden="true" focusable="false"' : ` aria-label="${view.title}の部位図"`}><defs><pattern id="hatch-${view.key}-${idSuffix}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="currentColor" opacity=".08"></rect><line x1="0" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="3" opacity=".24"></line></pattern><clipPath id="body-clip-${view.key}">${view.silhouette}</clipPath></defs><g class="body-silhouette">${view.silhouette}</g><g class="region-layer" clip-path="url(#body-clip-${view.key})">${view.paths.map(([id, d]) => {
    const info = byId.get(id); const value = info?.row?.value; const name = bodyRegionFormalName(id, info?.row?.regionName || id); const state = direction(value);
    const label = `${name}：${finite(value) ? `今回の目安 ${fmt(value, 1)}` : "今回の目安は数値なし"}`;
    const unavailableStyle = state === "unavailable" ? ` style="fill:url(#hatch-${view.key}-${idSuffix})"` : "";
    const selectedClass = id === selectedId ? " is-selected" : "";
    const extraPathClass = typeof renderPathClass === "function" ? String(renderPathClass({ id, viewKey: view.key }) || "") : "";
    const mainPath = `${enhancedTouch ? `<path class="region-hit-area" d="${d}" aria-hidden="true"></path>` : ""}<path class="region-path${extraPathClass}${selectedClass}" data-direction="${state}" data-region-id="${escapeHtml(id)}"${unavailableStyle} d="${d}"><title>${escapeHtml(label)}</title></path>`;
    const additionalPath = typeof renderAdditionalRegionPath === "function" ? renderAdditionalRegionPath({ id, viewKey: view.key, state, selectedClass, unavailableStyle }) : "";
    return `<a class="region-link"${enhancedTouch ? ' tabindex="-1"' : ""} href="#/body-part-detail?recordId=${encodeURIComponent(resultRecord?.record_id || "")}&regionId=${encodeURIComponent(id)}" aria-label="${escapeHtml(`${label}。詳細を開く`)}">${mainPath}${additionalPath}</a>`;
  }).join("")}</g></svg></figure>`).join("");
}

export function renderRunSummary(record = {}) {
  if (record.activityType === "rest") return `<div class="run-summary" aria-label="今回の記録"><div><strong>休養</strong><span></span><small>記録</small></div></div>`;
  return `<div class="run-summary" aria-label="今回の走行概要"><div><strong>${escapeHtml(fmt(record.distanceKm, 2))}</strong><span>km</span><small>距離</small></div><i></i><div><strong>${escapeHtml(fmt(record.durationMinutes, 1))}</strong><span>分</span><small>走行時間</small></div><i></i><div><strong>${escapeHtml(formatPace(record))}</strong><span>/km</span><small>平均ペース</small></div></div>`;
}

export function renderFacts(record = {}) {
  const course = record.course || {};
  return `<details class="facts-details"><summary><span>算出に使った走行事実</span><i>⌄</i></summary><div class="facts-grid"><div><span>平均ペース</span><strong>${escapeHtml(formatPace(record))} / km</strong></div><div><span>走り方</span><strong>${escapeHtml(runFormatLabel(record))}</strong></div><div><span>コース</span><strong>${escapeHtml(course.name || "未設定")}</strong></div><div><span>条件</span><strong>${escapeHtml(courseSummaryText(course))}</strong></div></div></details>`;
}

export function renderFatigue(services, record = {}) {
  const summary = record.activityType === "run" && services?.fatigue ? services.fatigue.summarizeRun(record.id) : null;
  const pre = summary?.available && finite(summary.pre) ? Number(summary.pre) : null;
  const post = summary?.available && finite(summary.post) ? Number(summary.post) : null;
  const delta = finite(pre) && finite(post) ? post - pre : null;
  const prePos = finite(pre) ? Number(pre) * 10 : 0;
  const postPos = finite(post) ? Number(post) * 10 : 0;
  const rofLabel = (value) => {
    if (!finite(value)) return "未記録";
    const descriptor = rofJSelectionDescriptor(Number(value));
    return `${fmt(value, 0)} / 10${descriptor ? ` — ${descriptor}` : ""}`;
  };
  const preLabel = finite(pre) ? fmt(pre, 0) : "—";
  const postLabel = finite(post) ? fmt(post, 0) : "—";
  const descriptor = finite(post) ? rofJSelectionDescriptor(post) : "";
  const deltaLabel = finite(delta) ? signed(delta, 0) : "—";
  return `<section class="fatigue-section"><div class="fatigue-inner"><div class="section-heading"><span class="section-index">02</span><div><small>疲労感</small><h2>疲労感の変化から見る</h2></div></div><div class="fatigue-card"><div class="fatigue-values"><div><small>走る前</small><strong>${preLabel}</strong></div><div class="delta"><span></span><strong>${deltaLabel}</strong><small>変化</small></div><div class="post"><small>走った後</small><strong>${postLabel}</strong></div></div><div class="fatigue-track">${finite(pre) && finite(post) ? `<i class="fatigue-range" style="--pre:${prePos}%;--post:${postPos}%"></i><b class="pre" style="left:${prePos}%"><em>前</em></b><b class="post-point" style="left:${postPos}%"><em>後</em></b>` : ""}</div><div class="fatigue-axis"><span>0</span><span>5</span><span>10</span></div>${descriptor ? `<p class="candidate-note" data-rof-result-guidance>走った後：${escapeHtml(descriptor)}</p>` : ""}</div><dl class="visually-hidden"><div><dt>走る前</dt><dd>${escapeHtml(rofLabel(pre))}</dd></div><div><dt>走った後</dt><dd>${escapeHtml(rofLabel(post))}</dd></div><div><dt>走った後 − 走る前</dt><dd>${escapeHtml(deltaLabel)}</dd></div></dl><p class="visually-hidden">0〜10の疲労感尺度は、その時点で自分が感じている疲労感の記録です。部位の目安とは別に扱い、回復度・安全性・走行可否の判定には使いません。</p></div></section>`;
}


export function fatigueSnapshot(services, record = {}) {
  const summary = record.activityType === "run" && services?.fatigue ? services.fatigue.summarizeRun(record.id) : null;
  const pre = summary?.available && finite(summary.pre) ? Number(summary.pre) : null;
  const post = summary?.available && finite(summary.post) ? Number(summary.post) : null;
  return Object.freeze({ pre, post, delta: finite(pre) && finite(post) ? post - pre : null });
}

export function prepareResultScreenState({ services, context }) {
  const requestedRecordId = context.parameters.get("recordId") || "";
  const experience = requestedRecordId ? services.workflows.records.loadExperience(requestedRecordId) : services.workflows.records.loadLatestExperience();
  if (!experience?.record) return Object.freeze({ empty: true, services, context });
  const { record, regionalV2ResultRecord } = experience;
  const allExperiences = services.workflows.records.loadAllExperiences();
  const savedMeasurement = findSavedRunMeasurement(record.id);
  const fatigue = fatigueSnapshot(services, record);
  const savedInterpretation = services?.storage?.selfInterpretations?.findByRecordId?.(record.id) || null;
  return Object.freeze({
    empty: false,
    services,
    context,
    experience,
    record,
    regionalV2ResultRecord,
    allExperiences,
    savedMeasurement,
    fatigue,
    savedInterpretation,
  });
}

export function renderEmptyResultScreen() {
  return `<div class="screen screen--result screen-layout screen-layout--result"><section class="intro"><div class="intro-heading"><div><p class="eyebrow">結果</p><h1>今回の走り</h1></div></div><p>保存した記録がまだありません。走行・休養の記録を保存すると、ここから結果を確認できます。</p><p class="w3-context-band" role="note"><strong>表示について</strong><span>12部位の目安は記録と条件に基づく参考表示で、身体の状態を直接測定した値ではありません。</span></p><a class="w3-empty-primary" href="#/record-input"><span>最初の記録を入力する</span><span aria-hidden="true">›</span></a><a class="w3-empty-secondary" href="#/history">保存記録を確認する</a></section></div>`;
}

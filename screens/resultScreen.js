import { isPresentFiniteNumber as finite } from "../shared/valueUtilities.js";
import { escapeHtml } from "../ui/commonComponents.js";
import { formatLocalDate, formatLocalTime } from "../ui/recordPresentation.js";
import { courseSummaryText } from "../ui/coursePresentation.js";
import { bodyRegionFormalName, PRIMARY_REGIONAL_V2_MODEL_VERSION, PRIMARY_REGIONAL_V2_REGION_DEFS } from "../core/appCore.js";
import { officialRofJDescriptor } from "../core/rofJCore.js";
import { findSavedRunMeasurement } from "../ui/runMeasurementState.js";

const FRONT = '<circle cx="150" cy="36" r="20"></circle><path d="M110 78 C120 66 135 60 150 60 C165 60 180 66 190 78 L204 126 C208 138 204 150 196 160 L182 176 L188 212 C192 228 190 246 184 262 L172 308 C168 324 166 340 166 356 L166 400 C166 410 158 418 148 418 C138 418 130 410 130 400 L130 356 C130 340 128 324 124 308 L112 262 C106 246 104 228 108 212 L114 176 L100 160 C92 150 88 138 92 126 Z"></path>';
const BACK = '<circle cx="150" cy="36" r="20"></circle><path d="M112 76 C122 66 136 60 150 60 C164 60 178 66 188 76 L202 124 C206 136 202 150 194 160 L182 174 L188 212 C192 228 190 244 184 262 L172 310 C168 326 166 342 166 358 L166 402 C166 412 158 420 148 420 C138 420 130 412 130 402 L130 358 C130 342 128 326 124 310 L112 262 C106 244 104 228 108 212 L114 174 L102 160 C94 150 90 136 94 124 Z"></path>';
const FOOT = '<path d="M114 78 C126 66 140 60 154 60 C172 60 186 72 194 92 C198 102 200 116 200 132 L200 238 C200 274 186 306 160 320 C150 326 140 326 130 320 C108 306 96 274 96 238 L96 132 C96 112 102 90 114 78 Z"></path>';
export const VIEWS = Object.freeze([
  Object.freeze({ key: "front", title: "前面", silhouette: FRONT, paths: Object.freeze([
    ["BA-DISP-014", "M120 148 C130 138 140 134 150 134 C160 134 170 138 180 148 L178 184 C168 190 160 194 150 194 C140 194 132 190 122 184 Z"],
    ["BA-DISP-016", "M122 194 C132 202 141 206 150 206 C159 206 168 202 178 194 L174 270 C164 278 158 282 150 282 C142 282 136 278 126 270 Z"],
    ["BA-DISP-019", "M126 270 C136 278 142 281 150 281 C158 281 164 278 174 270 L170 300 C162 306 157 309 150 309 C143 309 138 306 130 300 Z"],
    ["BA-DISP-021", "M130 306 C138 314 144 318 150 318 C156 318 162 314 170 306 L166 382 C160 390 156 394 150 394 C144 394 140 390 134 382 Z"],
    ["BA-DISP-024", "M135 386 L165 386 L166 416 L134 416 Z"],
  ]) }),
  Object.freeze({ key: "back", title: "後面", silhouette: BACK, paths: Object.freeze([
    ["BA-DISP-015", "M120 146 C130 158 139 166 150 166 C161 166 170 158 180 146 L180 198 C170 208 160 213 150 213 C140 213 130 208 120 198 Z"],
    ["BA-DISP-018", "M122 200 C132 208 141 213 150 213 C159 213 168 208 178 200 L174 278 C164 286 158 290 150 290 C142 290 136 286 126 278 Z"],
    ["BA-DISP-023", "M128 288 C136 298 143 302 150 302 C157 302 164 298 172 288 L166 368 C160 378 156 383 150 383 C144 383 140 378 134 368 Z"],
    ["BA-DISP-025", "M142 370 C146 378 148 382 150 382 C152 382 154 378 158 370 L158 416 H142 Z"],
  ]) }),
  Object.freeze({ key: "sole", title: "足裏", silhouette: FOOT, paths: Object.freeze([
    ["BA-DISP-029", "M112 92 C124 84 138 80 154 80 C174 80 188 94 190 120 L190 164 C174 170 158 172 140 168 C126 165 114 158 106 148 L106 120 C107 108 109 99 112 92 Z"],
    ["BA-DISP-028", "M106 154 C120 166 136 172 154 172 C170 172 182 168 190 164 L190 252 C176 260 162 264 148 262 C130 260 116 252 104 240 L104 176 Z"],
    ["BA-DISP-027", "M104 240 C118 254 132 262 148 264 C164 266 178 260 190 252 C186 282 174 304 158 314 C148 320 138 318 128 312 C112 300 104 274 104 240 Z"],
  ]) }),
]);

export function fmt(value, digits = 1) { return finite(value) ? Number(value).toFixed(digits).replace(/\.0$/, "") : "—"; }
export function signed(value, digits = 1) { if (!finite(value)) return "—"; const n = Number(value); return `${n > 0 ? "+" : ""}${fmt(n, digits)}`; }
export function direction(value) { if (!finite(value)) return "unavailable"; const delta = Number(value) - 100; return Math.abs(delta) < 1 ? "reference" : delta > 0 ? "above" : "below"; }
export function position(value) { if (!finite(value) || Number(value) <= 0) return 50; return Math.max(4, Math.min(96, 50 + Math.log2(Number(value) / 100) * 20)); }
export function modelCurrent(resultRecord = null) { return resultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION; }
export function signatureFor(record = {}, regionId = "") { return record?.comparison_signatures?.[regionId] || null; }
export function signaturesComparable(a, b) { return Boolean(a && b && a.modelVersion === b.modelVersion && a.outputSemanticVersion === b.outputSemanticVersion && a.regionId === b.regionId && a.constructId === b.constructId && a.referenceId === b.referenceId); }
export function formatPace(record = {}) { const distance = Number(record.distanceKm); const duration = Number(record.durationMinutes); if (!(distance > 0) || !(duration > 0)) return "—"; const seconds = Math.round(duration * 60 / distance); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
export function runFormatLabel(record = {}) { return String(record.runningFormat || "").toUpperCase() === "RUN_WALK" ? "走り＋歩き" : "連続して走った"; }
export function recordChronology(left = {}, right = {}) {
  return String(left.date || "").localeCompare(String(right.date || ""))
    || String(left.createdAt || "").localeCompare(String(right.createdAt || ""))
    || String(left.id || "").localeCompare(String(right.id || ""));
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
    return `<svg viewBox="70 10 160 430" aria-hidden="true"><g class="mini-silhouette">${view.silhouette}</g><path class="mini-region" d="${match[1]}"></path></svg>`;
  }
  return "";
}

export function bodyMap(resultRecord, infos, idSuffix = "main", selectedId = "", { enhancedTouch = false, renderPathClass = null, renderAdditionalRegionPath = null } = {}) {
  const byId = new Map(infos.map((info) => [info.row.regionId, info]));
  return VIEWS.map((view) => `<figure class="body-view" data-view="${view.key}"><figcaption>${view.title}</figcaption><svg viewBox="70 10 160 430" aria-label="${view.title}の部位図"><defs><pattern id="hatch-${view.key}-${idSuffix}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="currentColor" opacity=".08"></rect><line x1="0" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="3" opacity=".24"></line></pattern><clipPath id="body-clip-${view.key}">${view.silhouette}</clipPath></defs><g class="body-silhouette">${view.silhouette}</g><g class="region-layer">${view.paths.map(([id, d]) => {
    const info = byId.get(id); const value = info?.row?.value; const name = bodyRegionFormalName(id, info?.row?.regionName || id); const state = direction(value);
    const label = `${name}：${finite(value) ? `今回の目安 ${fmt(value, 1)}` : "今回の目安は数値なし"}`;
    const unavailableStyle = state === "unavailable" ? ` style="fill:url(#hatch-${view.key}-${idSuffix})"` : "";
    const selectedClass = id === selectedId ? " is-selected" : "";
    const extraPathClass = typeof renderPathClass === "function" ? String(renderPathClass({ id, viewKey: view.key }) || "") : "";
    const mainPath = `${enhancedTouch ? `<path class="region-hit-area" d="${d}" aria-hidden="true"></path>` : ""}<path class="region-path${extraPathClass}${selectedClass}" data-direction="${state}" data-region-id="${escapeHtml(id)}"${unavailableStyle} d="${d}"><title>${escapeHtml(label)}</title></path>`;
    const additionalPath = typeof renderAdditionalRegionPath === "function" ? renderAdditionalRegionPath({ id, viewKey: view.key, state, selectedClass, unavailableStyle }) : "";
    return `<a class="region-link" href="#/body-part-detail?recordId=${encodeURIComponent(resultRecord?.record_id || "")}&regionId=${encodeURIComponent(id)}" aria-label="${escapeHtml(`${label}。詳細を開く`)}">${mainPath}${additionalPath}</a>`;
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
    const descriptor = officialRofJDescriptor(Number(value));
    return `${fmt(value, 0)} / 10${descriptor ? ` — ${descriptor}` : ""}`;
  };
  const preLabel = finite(pre) ? fmt(pre, 0) : "—";
  const postLabel = finite(post) ? fmt(post, 0) : "—";
  const descriptor = finite(post) ? officialRofJDescriptor(post) : "";
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
  return `<div class="screen screen--result screen-layout screen-layout--result"><section class="intro"><div class="intro-heading"><div><p class="eyebrow">結果</p><h1>今回の走り</h1></div></div><p>保存した記録がまだありません。</p><a href="#/record-input"><span><small>最初の記録</small><strong>記録を始める</strong></span><i>›</i></a></section></div>`;
}

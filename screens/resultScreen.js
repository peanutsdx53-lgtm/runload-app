import { escapeHtml } from "../ui/commonComponents.js";
import { formatLocalDate } from "../ui/recordPresentation.js";
import { courseSummaryText } from "../ui/coursePresentation.js";
import { bodyRegionFormalName, PRIMARY_REGIONAL_V2_MODEL_VERSION, PRIMARY_REGIONAL_V2_REGION_DEFS } from "../core/runloadCore.js";
import { officialRofJDescriptor } from "../core/secondPillarRofJ.js";
import { findSavedRunMeasurement } from "../ui/runMeasurementState.js";

const FRONT = '<circle cx="150" cy="36" r="20"></circle><path d="M110 78 C120 66 135 60 150 60 C165 60 180 66 190 78 L204 126 C208 138 204 150 196 160 L182 176 L188 212 C192 228 190 246 184 262 L172 308 C168 324 166 340 166 356 L166 400 C166 410 158 418 148 418 C138 418 130 410 130 400 L130 356 C130 340 128 324 124 308 L112 262 C106 246 104 228 108 212 L114 176 L100 160 C92 150 88 138 92 126 Z"></path>';
const BACK = '<circle cx="150" cy="36" r="20"></circle><path d="M112 76 C122 66 136 60 150 60 C164 60 178 66 188 76 L202 124 C206 136 202 150 194 160 L182 174 L188 212 C192 228 190 244 184 262 L172 310 C168 326 166 342 166 358 L166 402 C166 412 158 420 148 420 C138 420 130 412 130 402 L130 358 C130 342 128 326 124 310 L112 262 C106 244 104 228 108 212 L114 174 L102 160 C94 150 90 136 94 124 Z"></path>';
const FOOT = '<path d="M114 78 C126 66 140 60 154 60 C172 60 186 72 194 92 C198 102 200 116 200 132 L200 238 C200 274 186 306 160 320 C150 326 140 326 130 320 C108 306 96 274 96 238 L96 132 C96 112 102 90 114 78 Z"></path>';
const FRONT_LOWER_PC = "M135 382 C140 390 145 394 150 394 C155 394 160 390 165 382 L166 402 C166 410 159 416 150 416 C141 416 134 410 134 402 Z";
const VIEWS = Object.freeze([
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

function finite(value) { return value !== null && value !== "" && Number.isFinite(Number(value)); }
function fmt(value, digits = 1) { return finite(value) ? Number(value).toFixed(digits).replace(/\.0$/, "") : "—"; }
function signed(value, digits = 1) { if (!finite(value)) return "—"; const n = Number(value); return `${n > 0 ? "+" : ""}${fmt(n, digits)}`; }
function direction(value) { if (!finite(value)) return "unavailable"; const delta = Number(value) - 100; return Math.abs(delta) < 1 ? "reference" : delta > 0 ? "above" : "below"; }
function position(value) { if (!finite(value) || Number(value) <= 0) return 50; return Math.max(4, Math.min(96, 50 + Math.log2(Number(value) / 100) * 20)); }
function modelCurrent(resultRecord = null) { return resultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION; }
function signatureFor(record = {}, regionId = "") { return record?.comparison_signatures?.[regionId] || null; }
function signaturesComparable(a, b) { return Boolean(a && b && a.modelVersion === b.modelVersion && a.outputSemanticVersion === b.outputSemanticVersion && a.regionId === b.regionId && a.constructId === b.constructId && a.referenceId === b.referenceId); }
function formatPace(record = {}) { const distance = Number(record.distanceKm); const duration = Number(record.durationMinutes); if (!(distance > 0) || !(duration > 0)) return "—"; const seconds = Math.round(duration * 60 / distance); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function runFormatLabel(record = {}) { return String(record.runningFormat || "").toUpperCase() === "RUN_WALK" ? "走り＋歩き" : "連続して走った"; }
function regionRows(resultRecord = null) { const rows = resultRecord?.result?.regions || []; const byId = new Map(rows.map((row) => [row.regionId, row])); return PRIMARY_REGIONAL_V2_REGION_DEFS.map((def) => byId.get(def.displayId) || { regionId: def.displayId, regionName: def.name, value: null }); }

function latestComparablePrevious(resultRecord, experiences, regionId) {
  const signature = signatureFor(resultRecord, regionId);
  if (!signature) return null;
  const currentExperience = experiences.find((item) => item.regionalV2ResultRecord?.id === resultRecord?.id);
  const currentDate = String(currentExperience?.record?.date || "");
  return experiences
    .filter((item) => modelCurrent(item.regionalV2ResultRecord) && item.regionalV2ResultRecord?.id !== resultRecord?.id)
    .filter((item) => !currentDate || String(item.record?.date || "") < currentDate)
    .map((item) => ({ experience: item, row: item.regionalV2Result?.regions?.find((candidate) => candidate.regionId === regionId), signature: signatureFor(item.regionalV2ResultRecord, regionId) }))
    .filter((item) => item.row && signaturesComparable(signature, item.signature) && finite(item.row.value))
    .sort((a, b) => String(b.experience.record?.date || "").localeCompare(String(a.experience.record?.date || "")))[0] || null;
}

function rowInfo(resultRecord, experiences, row, index) {
  const previous = latestComparablePrevious(resultRecord, experiences, row.regionId);
  const prev = previous?.row?.value;
  const delta = finite(row.value) && finite(prev) ? Number(row.value) - Number(prev) : null;
  const conditionUp = finite(row.value) && Number(row.value) - 100 >= 1;
  const previousUp = finite(delta) && delta >= 1;
  return Object.freeze({ row, index, previous, prev, delta, focus: conditionUp || previousUp, focusPriority: conditionUp && previousUp ? 1 : conditionUp ? 2 : 3 });
}

function locatorSvg(regionId) {
  for (const view of VIEWS) {
    const match = view.paths.find(([id]) => id === regionId);
    if (!match) continue;
    return `<svg viewBox="70 10 160 430" aria-hidden="true"><g class="mini-silhouette">${view.silhouette}</g><path class="mini-region" d="${match[1]}"></path></svg>`;
  }
  return "";
}

function bodyMap(resultRecord, infos, idSuffix = "main", selectedId = "") {
  const byId = new Map(infos.map((info) => [info.row.regionId, info]));
  return VIEWS.map((view) => `<figure class="body-view" data-view="${view.key}"><figcaption>${view.title}</figcaption><svg viewBox="70 10 160 430" aria-label="${view.title}の部位図"><defs><pattern id="hatch-${view.key}-${idSuffix}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="currentColor" opacity=".08"></rect><line x1="0" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="3" opacity=".24"></line></pattern><clipPath id="body-clip-${view.key}">${view.silhouette}</clipPath></defs><g class="body-silhouette">${view.silhouette}</g><g class="region-layer">${view.paths.map(([id, d]) => {
    const info = byId.get(id); const value = info?.row?.value; const name = bodyRegionFormalName(id, info?.row?.regionName || id); const state = direction(value);
    const label = `${name}：${finite(value) ? `今回の目安 ${fmt(value, 1)}` : "今回の目安は数値なし"}`;
    const unavailableStyle = state === "unavailable" ? ` style="fill:url(#hatch-${view.key}-${idSuffix})"` : "";
    const selectedClass = id === selectedId ? " is-selected" : "";
    const mobilePath = `<path class="region-path${id === "BA-DISP-024" && view.key === "front" ? " region-path--mobile-shape" : ""}${selectedClass}" data-direction="${state}" data-region-id="${escapeHtml(id)}"${unavailableStyle} d="${d}"><title>${escapeHtml(label)}</title></path>`;
    const pcPath = id === "BA-DISP-024" && view.key === "front"
      ? `<path class="region-path region-path--pc-shape${selectedClass}" data-direction="${state}" data-region-id="${escapeHtml(id)}"${unavailableStyle} d="${FRONT_LOWER_PC}" aria-hidden="true"></path>`
      : "";
    return `<a class="region-link" href="#/body-part-detail?recordId=${encodeURIComponent(resultRecord?.record_id || "")}&regionId=${encodeURIComponent(id)}" aria-label="${escapeHtml(`${label}。詳細を開く`)}">${mobilePath}${pcPath}</a>`;
  }).join("")}</g></svg></figure>`).join("");
}

function regionRow(resultRecord, info) {
  const row = info.row; const name = bodyRegionFormalName(row.regionId, row.regionName || row.regionId);
  const current = finite(row.value) ? fmt(row.value, 1) : "—";
  const referenceDelta = finite(row.value) ? Number(row.value) - 100 : null;
  const originalPrevious = info.previous ? `${escapeHtml(formatLocalDate(info.previous.experience.record.date))}・前回 ${fmt(info.prev, 1)}` : "前回比較なし";
  const originalDelta = finite(info.delta) ? `前回からの変化 ${signed(info.delta, 1)}` : "比較なし";
  const pcPrevious = info.previous
    ? `前回（${escapeHtml(formatLocalDate(info.previous.experience.record.date))}） ${fmt(info.prev, 1)} → 今回 ${current}`
    : `前回比較なし・今回 ${current}`;
  const mobileScale = finite(row.value) ? `<span class="region-scale region-scale--mobile"><i style="--pos:${position(row.value)}%"></i></span>` : "";
  const pcScale = finite(row.value)
    ? `<span class="region-scale-pc" aria-label="基準100に対する今回値${current}${finite(info.prev) ? `、前回値${fmt(info.prev, 1)}` : ""}"><span class="region-baseline-label">基準100</span><i class="region-current-marker" style="--pos:${position(row.value)}%"></i>${finite(info.prev) ? `<b class="region-previous-marker" style="--prev:${position(info.prev)}%"></b>` : ""}</span>`
    : "";
  return `<div class="region-row" role="group" aria-label="${escapeHtml(name)}"><span class="locator">${locatorSvg(row.regionId)}</span><span class="region-copy"><strong>${escapeHtml(name)}</strong><small class="region-copy-mobile">${originalPrevious}</small><small class="region-copy-pc">${pcPrevious}</small></span><span class="region-metric"><strong>${current}</strong><small class="region-metric-mobile">${originalDelta}</small><small class="region-metric-pc">${finite(referenceDelta) ? `基準100との差 ${signed(referenceDelta, 1)}` : "数値なし"}</small></span>${mobileScale}${pcScale}</div>`;
}

function regionList(resultRecord, infos, mode) {
  const sortedFocus = infos.filter((item) => item.focus).sort((a, b) => a.focusPriority - b.focusPriority || a.index - b.index);
  const rows = mode === "focus" ? sortedFocus : infos;
  const summary = mode === "focus" ? `<div class="focus-summary"><strong>基準または前回より上 ${sortedFocus.length}件</strong><br>絞り込み表示であり、危険度や重要度を示すものではありません。</div>` : "";
  if (!rows.length) return `${summary}<div class="focus-summary">この条件に当てはまる部位はありません。全12部位で確認できます。</div>`;
  return `${summary}${rows.map((item) => regionRow(resultRecord, item)).join("")}`;
}

function renderRunSummary(record = {}) {
  if (record.activityType === "rest") return `<div class="run-summary" aria-label="今回の記録"><div><strong>休養</strong><span></span><small>記録</small></div></div>`;
  return `<div class="run-summary" aria-label="今回の走行概要"><div><strong>${escapeHtml(fmt(record.distanceKm, 2))}</strong><span>km</span><small>距離</small></div><i></i><div><strong>${escapeHtml(fmt(record.durationMinutes, 1))}</strong><span>分</span><small>走行時間</small></div><i></i><div><strong>${escapeHtml(formatPace(record))}</strong><span>/km</span><small>平均ペース</small></div></div>`;
}

function renderFacts(record = {}) {
  const course = record.course || {};
  return `<details class="facts-details"><summary><span>算出に使った走行事実</span><i>⌄</i></summary><div class="facts-grid"><div><span>平均ペース</span><strong>${escapeHtml(formatPace(record))} / km</strong></div><div><span>走り方</span><strong>${escapeHtml(runFormatLabel(record))}</strong></div><div><span>コース</span><strong>${escapeHtml(course.name || "未設定")}</strong></div><div><span>条件</span><strong>${escapeHtml(courseSummaryText(course))}</strong></div></div></details>`;
}

function renderFatigue(services, record = {}) {
  const summary = record.activityType === "run" && services?.secondPillar ? services.secondPillar.summarizeRun(record.id) : null;
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
  return `<section class="fatigue-section"><div class="fatigue-inner"><div class="section-heading"><span class="section-index">02</span><div><small>FATIGUE CHANGE</small><h2>疲労感の変化から見る</h2></div></div><div class="fatigue-card"><div class="fatigue-values"><div><small>走る前</small><strong>${preLabel}</strong></div><div class="delta"><span></span><strong>${deltaLabel}</strong><small>変化</small></div><div class="post"><small>走った後</small><strong>${postLabel}</strong></div></div><div class="fatigue-track">${finite(pre) && finite(post) ? `<i class="fatigue-range" style="--pre:${prePos}%;--post:${postPos}%"></i><b class="pre" style="left:${prePos}%"><em>前</em></b><b class="post-point" style="left:${postPos}%"><em>後</em></b>` : ""}</div><div class="fatigue-axis"><span>0</span><span>5</span><span>10</span></div>${descriptor ? `<p class="candidate-note">走った後：${escapeHtml(descriptor)}</p>` : ""}</div><dl class="visually-hidden"><div><dt>走る前</dt><dd>${escapeHtml(rofLabel(pre))}</dd></div><div><dt>走った後</dt><dd>${escapeHtml(rofLabel(post))}</dd></div><div><dt>POST − PRE</dt><dd>${escapeHtml(deltaLabel)}</dd></div></dl><p class="visually-hidden">0〜10の疲労感尺度（ROF-J）は、その時点で自分が感じている疲労感の記録です。部位の目安とは別に扱い、回復度・安全性・走行可否の判定には使いません。</p></div></section>`;
}

function fatigueSnapshot(services, record = {}) {
  const summary = record.activityType === "run" && services?.secondPillar ? services.secondPillar.summarizeRun(record.id) : null;
  const pre = summary?.available && finite(summary.pre) ? Number(summary.pre) : null;
  const post = summary?.available && finite(summary.post) ? Number(summary.post) : null;
  return Object.freeze({ pre, post, delta: finite(pre) && finite(post) ? post - pre : null });
}

function pcRegionAxis(info) {
  if (!finite(info?.row?.value)) return `<span class="pc-region-axis is-unavailable"><i></i></span>`;
  const currentPos = position(info.row.value);
  const previousPos = finite(info.prev) ? position(info.prev) : null;
  const changeBand = finite(previousPos)
    ? `<span class="pc-region-axis__change" style="--pos:${currentPos}%;--prev:${previousPos}%"></span>`
    : "";
  return `<span class="pc-region-axis" aria-hidden="true"><i class="pc-region-axis__baseline"></i>${changeBand}<b class="pc-region-axis__current" style="--pos:${currentPos}%"></b>${finite(previousPos) ? `<em class="pc-region-axis__previous" style="--prev:${previousPos}%"></em>` : ""}</span>`;
}

function pcRegionTile(info, selectedId, recordId) {
  const row = info.row;
  const name = bodyRegionFormalName(row.regionId, row.regionName || row.regionId);
  const current = finite(row.value) ? fmt(row.value, 1) : "—";
  const delta = finite(info.delta) ? signed(info.delta, 1) : "比較なし";
  const state = direction(row.value);
  const selected = row.regionId === selectedId ? " is-selected" : "";
  const stateLabel = state === "above" ? "基準より上" : state === "below" ? "基準より下" : state === "reference" ? "基準付近" : "表示なし";
  const previousLabel = finite(info.prev) ? fmt(info.prev, 1) : "—";
  const deltaClass = finite(info.delta) ? (Number(info.delta) > 0 ? " is-up" : Number(info.delta) < 0 ? " is-down" : "") : "";
  return `<a class="pc-region-tile${selected}" data-direction="${state}" href="#/body-part-detail?recordId=${encodeURIComponent(recordId || "")}&regionId=${encodeURIComponent(row.regionId)}" data-region-id="${escapeHtml(row.regionId)}"><span class="pc-region-tile__top"><span class="pc-region-tile__copy"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(stateLabel)}</small></span><b>${escapeHtml(current)}</b></span>${pcRegionAxis(info)}<span class="pc-region-tile__meta"><span>前回 <strong>${escapeHtml(previousLabel)}</strong></span><em class="${deltaClass.trim()}">${escapeHtml(delta)}</em></span></a>`;
}

function pcRegionGroups(infos, selectedId, recordId) {
  const viewByRegion = new Map(VIEWS.flatMap((view) => view.paths.map(([id]) => [id, view.title])));
  return `<div class="pc-region-matrix" role="list" aria-label="12部位の数値">${infos.map((info) => {
    const row = info.row;
    const name = bodyRegionFormalName(row.regionId, row.regionName || row.regionId);
    const current = finite(row.value) ? fmt(row.value, 1) : "—";
    const previous = finite(info.prev) ? fmt(info.prev, 1) : "—";
    const delta = finite(info.delta) ? signed(info.delta, 1) : "比較なし";
    const state = direction(row.value);
    const selected = row.regionId === selectedId ? " is-selected" : "";
    const stateLabel = state === "above" ? "基準より上" : state === "below" ? "基準より下" : state === "reference" ? "基準付近" : "表示なし";
    const deltaClass = finite(info.delta) ? (Number(info.delta) > 0 ? " is-up" : Number(info.delta) < 0 ? " is-down" : "") : "";
    const viewLabel = viewByRegion.get(row.regionId) || "部位";
    return `<button type="button" class="pc-region-tile pc-region-tile--matrix${selected}" data-direction="${state}" data-region-id="${escapeHtml(row.regionId)}" data-pc-region-select="${escapeHtml(row.regionId)}" aria-pressed="${row.regionId === selectedId ? "true" : "false"}" role="listitem"><span class="pc-region-tile__heading"><small>${escapeHtml(viewLabel)}</small><strong>${escapeHtml(name)}</strong></span><span class="pc-region-tile__value"><b>${escapeHtml(current)}</b><em>${escapeHtml(stateLabel)}</em></span>${pcRegionAxis(info)}<span class="pc-region-tile__meta"><span>前回 <strong>${escapeHtml(previous)}</strong></span><em class="${deltaClass.trim()}">${escapeHtml(delta)}</em></span></button>`;
  }).join("")}</div>`;
}

function shortDateLabel(value = "") {
  const parts = String(value).split("-");
  if (parts.length !== 3) return String(value);
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

function comparableRegionHistory(resultRecord, experiences, regionId) {
  const signature = signatureFor(resultRecord, regionId);
  if (!signature) return [];
  return experiences.map((experience) => {
    const record = experience?.regionalV2ResultRecord;
    const rows = record?.result?.regions || experience?.regionalV2Result?.regions || [];
    const row = rows.find((candidate) => candidate.regionId === regionId);
    return { experience, row, signature: signatureFor(record, regionId) };
  }).filter((item) => item.row && signaturesComparable(signature, item.signature) && finite(item.row.value))
    .sort((a, b) => String(a.experience?.record?.date || "").localeCompare(String(b.experience?.record?.date || "")))
    .slice(-4);
}

function pcHistoryGraphic(points = []) {
  if (!points.length) return `<div class="pc-focus-empty">比較できる過去記録はありません。</div>`;
  const values = points.map((point) => Number(point.row.value));
  const scaleValues = values.concat([100]);
  let minValue = Math.min(...scaleValues);
  let maxValue = Math.max(...scaleValues);
  if (maxValue - minValue < 20) { minValue -= 10; maxValue += 10; }
  const width = 440, height = 84, left = 12, right = 10, top = 10, bottom = 20;
  const plotW = width - left - right, plotH = height - top - bottom;
  const xFor = (index) => points.length === 1 ? left + plotW / 2 : left + (plotW * index / (points.length - 1));
  const yFor = (value) => top + (maxValue - Number(value)) / (maxValue - minValue) * plotH;
  const coords = points.map((point, index) => [xFor(index), yFor(point.row.value)]);
  const path = coords.map(([x,y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const baselineY = yFor(100).toFixed(1);
  return `<svg class="pc-focus-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="選択部位の直近記録の推移"><line class="pc-focus-chart__baseline" x1="${left}" x2="${width-right}" y1="${baselineY}" y2="${baselineY}"></line><path class="pc-focus-chart__line" d="${path}"></path>${coords.map(([x,y], index) => `<circle class="pc-focus-chart__point${index === coords.length - 1 ? " is-current" : ""}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${index === coords.length - 1 ? 4.5 : 3.4}"></circle>`).join("")}${points.map((point,index) => `<text x="${xFor(index).toFixed(1)}" y="${height-4}" text-anchor="middle">${escapeHtml(shortDateLabel(point.experience?.record?.date || ""))}</text>`).join("")}</svg>`;
}

function renderPcDetailPanel(resultRecord, allExperiences, info, selectedId) {
  if (!info) return "";
  const row = info.row;
  const name = bodyRegionFormalName(row.regionId, row.regionName || row.regionId);
  const history = comparableRegionHistory(resultRecord, allExperiences, row.regionId);
  const state = direction(row.value);
  const stateLabel = state === "above" ? "基準より上" : state === "below" ? "基準より下" : state === "reference" ? "基準付近" : "表示なし";
  const current = finite(row.value) ? fmt(row.value, 1) : "—";
  const baselineDelta = finite(row.value) ? signed(Number(row.value) - 100, 1) : "—";
  const previous = finite(info.prev) ? fmt(info.prev, 1) : "—";
  const previousDelta = finite(info.delta) ? signed(info.delta, 1) : "—";
  const currentPos = finite(row.value) ? position(row.value) : 50;
  const previousPos = finite(info.prev) ? position(info.prev) : null;
  return `<div class="pc-detail-panel${row.regionId === selectedId ? " is-active" : ""}" data-pc-detail-region="${escapeHtml(row.regionId)}" data-direction="${state}"${row.regionId === selectedId ? "" : " hidden"}><header><div><small>選択中</small><h3>${escapeHtml(name)}</h3></div><span>${escapeHtml(stateLabel)}</span></header><div class="pc-focus-content"><div class="pc-focus-highlight"><span>基準から見る</span><div><strong>${escapeHtml(current)}</strong><em>今回</em></div><p>基準100との差 <b>${escapeHtml(baselineDelta)}</b></p><div class="pc-focus-baseline" style="--pos:${currentPos}%;${finite(previousPos) ? `--prev:${previousPos}%;` : ""}"><i></i><b></b>${finite(previousPos) ? `<em></em>` : ""}<small>100</small></div></div><div class="pc-focus-change"><span>前回から見る</span><div class="pc-focus-compare"><div><small>前回</small><strong>${escapeHtml(previous)}</strong></div><i>→</i><div class="is-current"><small>今回</small><strong>${escapeHtml(current)}</strong></div></div><p><b>${escapeHtml(previousDelta)}</b><span> の変化</span></p></div><div class="pc-focus-trend"><span>過去から見る</span>${pcHistoryGraphic(history)}</div></div></div>`;
}

function comparisonPosition(value) {
  if (!finite(value)) return 50;
  return Math.max(7, Math.min(93, 50 + (Number(value) - 100) * 0.72));
}

function renderPcComparison(infos, selectedId) {
  return `<div class="pc-compare-panel" data-pc-compare-panel hidden><div class="pc-compare-toolbar"><div><small>12 REGIONS</small><strong>部位を比べる</strong><span>同じ基準100を中心に、今回の12部位を見比べます。</span></div><div class="pc-compare-display" role="group" aria-label="部位比較の表示"><button type="button" class="is-active" data-pc-compare-display="ratio" aria-pressed="true">比率</button><button type="button" data-pc-compare-display="difference" aria-pressed="false">差分</button></div></div><div class="pc-compare-grid">${infos.map((info) => {
    const row = info.row;
    const name = bodyRegionFormalName(row.regionId, row.regionName || row.regionId);
    const current = finite(row.value) ? fmt(row.value, 1) : "—";
    const difference = finite(row.value) ? signed(Number(row.value) - 100, 1) : "—";
    const state = direction(row.value);
    const pos = comparisonPosition(row.value);
    return `<button type="button" class="pc-compare-row${row.regionId === selectedId ? " is-selected" : ""}" data-region-id="${escapeHtml(row.regionId)}" data-pc-region-select="${escapeHtml(row.regionId)}" data-direction="${state}"><span class="pc-compare-row__name">${escapeHtml(name)}</span><span class="pc-compare-row__axis" style="--pos:${pos}%"><i></i><b></b></span><strong><span data-pc-compare-value="ratio">${escapeHtml(current)}</span><span data-pc-compare-value="difference" hidden>${escapeHtml(difference)}</span></strong></button>`;
  }).join("")}</div><p class="pc-compare-note">値の高低は、良し悪し・安全性・けがの危険性を示すものではありません。</p></div>`;
}

function renderPcInsights(resultRecord, allExperiences, infos, selectedInfo) {
  if (!selectedInfo) return `<section class="pc-result-focus"><div class="pc-focus-empty">部位の数値を表示できません。</div></section>`;
  const selectedId = selectedInfo.row.regionId;
  return `<section class="pc-result-focus pc-result-insights" aria-label="部位の詳細と比較"><div class="pc-insight-tabs" role="tablist" aria-label="部位の表示"><button type="button" class="is-active" data-pc-insight-mode="detail" aria-selected="true">詳細</button><button type="button" data-pc-insight-mode="compare" aria-selected="false">比較</button></div><div class="pc-detail-stack" data-pc-detail-stack>${infos.map((info) => renderPcDetailPanel(resultRecord, allExperiences, info, selectedId)).join("")}</div>${renderPcComparison(infos, selectedId)}</section>`;
}

function renderPcFatigue(snapshot) {
  const prePos = finite(snapshot.pre) ? Math.max(0, Math.min(100, snapshot.pre * 10)) : 0;
  const postPos = finite(snapshot.post) ? Math.max(0, Math.min(100, snapshot.post * 10)) : 0;
  const descriptor = finite(snapshot.post) ? officialRofJDescriptor(snapshot.post) : "";
  return `<section class="pc-result-fatigue" aria-label="運動前後の疲労度"><header><div><small>FATIGUE</small><h3>運動前後の疲労度</h3></div></header><div class="pc-fatigue-journey"><div class="pc-fatigue-node is-pre"><small>運動前</small><strong>${finite(snapshot.pre) ? escapeHtml(fmt(snapshot.pre,0)) : "—"}</strong></div><div class="pc-fatigue-bridge"><span></span><div><small>変化</small><strong>${finite(snapshot.delta) ? escapeHtml(signed(snapshot.delta,0)) : "—"}</strong></div><i>→</i></div><div class="pc-fatigue-node is-post"><small>運動後</small><strong>${finite(snapshot.post) ? escapeHtml(fmt(snapshot.post,0)) : "—"}</strong></div></div><div class="pc-fatigue-scale"><span class="pc-fatigue-scale__range" style="--pre:${prePos}%;--post:${postPos}%"></span>${finite(snapshot.pre) ? `<i class="pc-fatigue-scale__point is-pre" style="left:${prePos}%"><b>前</b></i>` : ""}${finite(snapshot.post) ? `<i class="pc-fatigue-scale__point is-post" style="left:${postPos}%"><b>後</b></i>` : ""}</div><div class="pc-fatigue-scale__axis"><span>0</span><span>5</span><span>10</span></div>${descriptor ? `<p>${escapeHtml(descriptor)}</p>` : ""}</section>`;
}

function renderPcResultConsole({ services, record, resultRecord, allExperiences }) {
  if (!modelCurrent(resultRecord) || record.activityType !== "run") return "";
  const infos = regionRows(resultRecord).map((row, index) => rowInfo(resultRecord, allExperiences, row, index));
  const aboveCount = infos.filter((info) => finite(info.row.value) && Number(info.row.value) > 100).length;
  const prevUpCount = infos.filter((info) => finite(info.delta) && Number(info.delta) > 0).length;
  const comparableCount = infos.filter((info) => finite(info.delta)).length;
  const selectedInfo = infos.filter((info) => info.focus).sort((a, b) => a.focusPriority - b.focusPriority || a.index - b.index)[0] || infos.find((info) => finite(info.row.value)) || infos[0];
  const fatigue = fatigueSnapshot(services, record);
  return `<section class="pc-result-console" aria-label="今回の結果"><header class="pc-result-summary pc-result-summary--rail"><div class="pc-result-date"><small>記録日</small><strong>${escapeHtml(formatLocalDate(record.date))}</strong></div><div class="pc-result-signals" aria-label="今回の結果サイン"><div><strong>${aboveCount}</strong><span> / 12</span><small>基準より上</small></div><i></i><div><strong>${prevUpCount}</strong><span>${comparableCount ? ` / ${comparableCount}` : ""}</span><small>前回より上</small></div><i></i><div><strong>${finite(fatigue.delta) ? escapeHtml(signed(fatigue.delta,0)) : "—"}</strong><span></span><small>疲労変化</small></div></div></header><section class="pc-result-main"><div class="pc-result-body"><header><div><small>BODY MAP</small><h2>身体の部位から見る</h2></div></header><ul class="pc-result-legend" aria-label="身体図の色"><li><i class="above"></i>基準より上</li><li><i class="reference"></i>基準付近</li><li><i class="below"></i>基準より下</li><li><i class="unavailable"></i>表示なし</li></ul><div class="body-map pc-result-body-map" aria-label="前面・後面・足裏の12部位図">${bodyMap(resultRecord, infos, "pc", selectedInfo?.row?.regionId || "")}</div></div><div class="pc-result-numbers"><header><div><small>12 REGIONS</small><h2>12部位の数値</h2></div><div class="pc-number-guides"><div class="pc-axis-key"><span>低い</span><i><b></b></i><span>高い</span><em>中央＝基準100</em></div><div class="pc-marker-key"><span><i class="current"></i>今回</span><span><i class="previous"></i>前回</span></div></div></header><div class="pc-result-region-groups">${pcRegionGroups(infos, selectedInfo?.row?.regionId || "", resultRecord?.record_id || record.id)}</div></div></section><section class="pc-result-lower">${renderPcInsights(resultRecord, allExperiences, infos, selectedInfo)}${renderPcFatigue(fatigue)}</section><p class="visually-hidden">12部位の目安は各部位自身の基準条件を100として比較した値です。100は安全値、正常値、初心者平均を意味しません。</p></section>`;
}

function renderRegional(resultRecord, allExperiences, record) {
  if (!modelCurrent(resultRecord) || record.activityType !== "run") {
    return `<section class="regional-section" data-primary-regional-card><div class="section-heading"><span class="section-index">01</span><div><small>BODY REGION</small><h2>身体の部位から見る</h2></div></div><div class="regional-shell"><div class="regional-topline"><p>12部位の目安</p><span>表示なし</span></div><p class="map-note">この記録には12部位の数値を表示できません。数値なしを0として扱いません。</p></div></section>`;
  }
  const infos = regionRows(resultRecord).map((row, index) => rowInfo(resultRecord, allExperiences, row, index));
  const focusCount = infos.filter((item) => item.focus).length;
  return `<section class="regional-section" data-primary-regional-card><div class="section-heading"><span class="section-index">01</span><div><small>BODY REGION</small><h2>身体の部位から見る</h2></div></div><div class="regional-shell"><div class="regional-topline"><p>12部位の目安</p><span>部位ごとの表示</span></div><ul class="direction-legend" aria-label="身体図の色"><li><i class="legend-dot above"></i><span>その部位の基準より上</span></li><li><i class="legend-dot reference"></i><span>その部位の基準付近</span></li><li><i class="legend-dot below"></i><span>その部位の基準より下</span></li><li><i class="legend-dot unavailable"></i><span>表示なし</span></li></ul><div class="regional-layout"><div class="map-column"><div class="body-map" aria-label="前面・後面・足裏の12部位図">${bodyMap(resultRecord, infos)}</div><button class="mobile-region-trigger" type="button" data-action="open-result-region-sheet"><span><small>12部位比較</small><strong>数値・前回からの変化を見る</strong></span><i>›</i></button></div><aside class="desktop-region-panel" aria-label="部位一覧"><div class="desktop-panel-heading"><div><small>12 REGIONS</small><strong>12部位比較</strong></div><span>数値・前回からの変化</span></div><div class="view-toggle" role="group" aria-label="表示する部位"><button class="active" type="button" data-result-view="focus">基準または前回より上 <b>(${focusCount})</b></button><button type="button" data-result-view="all">全12部位</button></div><div class="value-marker-legend" aria-label="横軸の記号"><span><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4"></circle></svg>今回値</span><span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3 13 8 8 13 3 8Z"></path></svg>前回値</span></div><div class="region-list" data-result-region-list="focus">${regionList(resultRecord, infos, "focus")}</div><div class="region-list" data-result-region-list="all" hidden>${regionList(resultRecord, infos, "all")}</div></aside></div>${renderFacts(record)}<p class="visually-hidden">12部位の目安は、各部位自身の基準条件を100として比べます。研究上、この比較方法をReference-100と呼びます。走行距離は別の記録事実であり、距離そのものを数値へ掛けません。100は安全値・正常値・初心者平均ではありません。</p></div><div class="sheet-overlay" data-result-region-sheet hidden><section class="region-sheet" role="dialog" aria-modal="true" aria-labelledby="region-sheet-title"><div class="grip"></div><div class="sheet-head"><div><p class="eyebrow">BODY REGION</p><h2 id="region-sheet-title">12部位比較</h2></div><button type="button" data-action="close-result-region-sheet" aria-label="閉じる">×</button></div><div class="sheet-tabs" role="tablist"><button class="active" type="button" data-result-mobile-view="focus" aria-selected="true">基準または前回より上 <b>(${focusCount})</b></button><button type="button" data-result-mobile-view="all" aria-selected="false">全12部位</button></div><div class="region-list mobile-list" data-result-region-mobile-list="focus">${regionList(resultRecord, infos, "focus")}</div><div class="region-list mobile-list" data-result-region-mobile-list="all" hidden>${regionList(resultRecord, infos, "all")}</div></section></div></section>`;
}

export function renderResultScreen({ services, context }) {
  const requestedRecordId = context.parameters.get("recordId") || "";
  const experience = requestedRecordId ? services.workflows.records.loadExperience(requestedRecordId) : services.workflows.records.loadLatestExperience();
  if (!experience?.record) return `<div class="screen screen--result screen-layout screen-layout--result"><section class="intro"><div class="intro-heading"><div><p class="eyebrow">RESULT</p><h1>今回の走り</h1></div></div><p>保存した記録がまだありません。</p><a href="#/record-input"><span><small>最初の記録</small><strong>記録を始める</strong></span><i>›</i></a></section></div>`;
  const { record, regionalV2ResultRecord } = experience;
  const allExperiences = services.workflows.records.loadAllExperiences();
  const savedMeasurement = findSavedRunMeasurement(record.id);
  const routeLink = savedMeasurement
    ? `<section class="run-route-link-wrap"><a class="run-route-link" href="#/run-route?recordId=${encodeURIComponent(record.id)}"><span><small>GPS MEASUREMENT</small><strong>走行軌跡を見る</strong><em>${Number(savedMeasurement.distanceKm || 0).toFixed(2)} km・保存地点 ${Number(savedMeasurement.track?.length || 0)}点</em></span><i>›</i></a></section>`
    : "";
  return `<div class="screen screen--result screen-layout screen-layout--result">${renderPcResultConsole({ services, record, resultRecord: regionalV2ResultRecord, allExperiences })}<div class="result-mobile-layout"><section class="intro"><div class="intro-heading"><div><p class="eyebrow">RESULT</p><h1>今回の走り</h1></div><span>${escapeHtml(formatLocalDate(record.date))}</span></div>${renderRunSummary(record)}</section>${routeLink}${renderRegional(regionalV2ResultRecord, allExperiences, record)}${renderFatigue(services, record)}<nav class="result-next-actions" aria-label="結果の次の操作"><a class="understanding-link" href="#/interpretation-room?recordId=${encodeURIComponent(record.id)}&origin=result"><span><small>結果を整理</small><strong>基準・過去と一緒に見る</strong></span><i aria-hidden="true">›</i></a><a class="history-link" href="#/history?view=trends&metric=region&period=28&anchorDate=${encodeURIComponent(record.date)}&recordId=${encodeURIComponent(record.id)}"><span><small>この日の記録</small><strong>履歴で見る</strong></span><i aria-hidden="true">›</i></a></nav></div></div>`;
}

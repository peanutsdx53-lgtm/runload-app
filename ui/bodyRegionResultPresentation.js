import { escapeHtml, renderPageHeading, renderStatusLabel } from "./commonComponents.js";
import { bodyRegionFormalName, bodyRegionPlainMeaning } from "../core/runloadCore.js";
import { formatLocalDate } from "./recordPresentation.js";
import { renderResultWorkspaceNavigation } from "./screenArchitecture.js";
import { bodyAreaLateralityLabel } from "../core/runloadCore.js";
import { PRIMARY_REGIONAL_V2_REGION_DEFS } from "../core/runloadCore.js";
import { PRIMARY_REGIONAL_V2_MODEL_VERSION } from "../core/runloadCore.js";

const FRONT = '<circle cx="150" cy="36" r="20"></circle><path d="M110 78 C120 66 135 60 150 60 C165 60 180 66 190 78 L204 126 C208 138 204 150 196 160 L182 176 L188 212 C192 228 190 246 184 262 L172 308 C168 324 166 340 166 356 L166 400 C166 410 158 418 148 418 C138 418 130 410 130 400 L130 356 C130 340 128 324 124 308 L112 262 C106 246 104 228 108 212 L114 176 L100 160 C92 150 88 138 92 126 Z"></path>';
const BACK = '<circle cx="150" cy="36" r="20"></circle><path d="M112 76 C122 66 136 60 150 60 C164 60 178 66 188 76 L202 124 C206 136 202 150 194 160 L182 174 L188 212 C192 228 190 244 184 262 L172 310 C168 326 166 342 166 358 L166 402 C166 412 158 420 148 420 C138 420 130 412 130 402 L130 358 C130 342 128 326 124 310 L112 262 C106 244 104 228 108 212 L114 174 L102 160 C94 150 90 136 94 124 Z"></path>';
const FOOT = '<path d="M114 78 C126 66 140 60 154 60 C172 60 186 72 194 92 C198 102 200 116 200 132 L200 238 C200 274 186 306 160 320 C150 326 140 326 130 320 C108 306 96 274 96 238 L96 132 C96 112 102 90 114 78 Z"></path>';
const VIEWS = [
  { key: "front", title: "前面", silhouette: FRONT, paths: [
    ["BA-DISP-014", "M120 148 C130 138 140 134 150 134 C160 134 170 138 180 148 L178 184 C168 190 160 194 150 194 C140 194 132 190 122 184 Z"],
    ["BA-DISP-016", "M122 194 C132 202 141 206 150 206 C159 206 168 202 178 194 L174 270 C164 278 158 282 150 282 C142 282 136 278 126 270 Z"],
    ["BA-DISP-019", "M126 270 C136 278 142 281 150 281 C158 281 164 278 174 270 L170 300 C162 306 157 309 150 309 C143 309 138 306 130 300 Z"],
    ["BA-DISP-021", "M130 306 C138 314 144 318 150 318 C156 318 162 314 170 306 L166 382 C160 390 156 394 150 394 C144 394 140 390 134 382 Z"],
    ["BA-DISP-024", "M135 386 L165 386 L166 416 L134 416 Z"],
  ] },
  { key: "back", title: "後面", silhouette: BACK, paths: [
    ["BA-DISP-015", "M120 146 C130 158 139 166 150 166 C161 166 170 158 180 146 L180 198 C170 208 160 213 150 213 C140 213 130 208 120 198 Z"],
    ["BA-DISP-018", "M122 200 C132 208 141 213 150 213 C159 213 168 208 178 200 L174 278 C164 286 158 290 150 290 C142 290 136 286 126 278 Z"],
    ["BA-DISP-023", "M128 288 C136 298 143 302 150 302 C157 302 164 298 172 288 L166 368 C160 378 156 383 150 383 C144 383 140 378 134 368 Z"],
    ["BA-DISP-025", "M142 370 C146 378 148 382 150 382 C152 382 154 378 158 370 L158 416 H142 Z"],
  ] },
  { key: "sole", title: "足裏", silhouette: FOOT, paths: [
    ["BA-DISP-029", "M112 92 C124 84 138 80 154 80 C174 80 188 94 190 120 L190 164 C174 170 158 172 140 168 C126 165 114 158 106 148 L106 120 C107 108 109 99 112 92 Z"],
    ["BA-DISP-028", "M106 154 C120 166 136 172 154 172 C170 172 182 168 190 164 L190 252 C176 260 162 264 148 262 C130 260 116 252 104 240 L104 176 Z"],
    ["BA-DISP-027", "M104 240 C118 254 132 262 148 264 C164 266 178 260 190 252 C186 282 174 304 158 314 C148 320 138 318 128 312 C112 300 104 274 104 240 Z"],
  ] },
];

function finite(value) { return value !== null && value !== "" && Number.isFinite(Number(value)); }
function fmt(value, digits = 1) { return finite(value) ? Number(value).toFixed(digits).replace(/\.0$/, "") : "—"; }
const DISPLAY_SALIENCE_RELATIVE = 0.01;
function displaySalienceThreshold(referenceValue) {
  return finite(referenceValue) ? Math.max(0.05, Math.abs(Number(referenceValue)) * DISPLAY_SALIENCE_RELATIVE) : 0.05;
}
function modelDistanceKm(resultRecord = {}) {
  const input = resultRecord?.engine_input_snapshot || {};
  const runWalk = String(input.runningFormat || "").toUpperCase() === "RUN_WALK";
  const distance = Number(runWalk ? input.runningDistanceKm : input.distanceKm);
  return Number.isFinite(distance) && distance > 0 ? distance : null;
}
function sameDistanceReferenceValue(resultRecord = {}) {
  return currentRegionalModel(resultRecord) ? 100 : null;
}
function deltaFromComparison(value, referenceValue) {
  return finite(value) && finite(referenceValue) ? Number(value) - Number(referenceValue) : null;
}
function directionStateValue(value, referenceValue = 100, tolerance = 0.05) {
  if (!finite(value) || !finite(referenceValue)) return "unavailable";
  const delta = deltaFromComparison(value, referenceValue);
  if (Math.abs(delta) < tolerance) return "reference";
  return delta > 0 ? "above" : "below";
}
function directionSymbol(value, referenceValue = 100, tolerance = 0.05) { return ({ above: "↑", below: "↓", reference: "=", unavailable: "—" })[directionStateValue(value, referenceValue, tolerance)]; }
function direction(value, referenceValue = 100, label = "同じ部位の基準", tolerance = 0.05) {
  if (!finite(value) || !finite(referenceValue)) return "数値なし";
  const delta = deltaFromComparison(value, referenceValue);
  if (Math.abs(delta) < tolerance) return Math.abs(delta) < 0.05 ? `${label}と同じ` : `${label}付近（${delta > 0 ? "+" : ""}${fmt(delta, 1)}ポイント）`;
  return `${label}から${delta > 0 ? "+" : ""}${fmt(delta, 1)}ポイント`;
}
function sameDistanceDirection(resultRecord, value) {
  const referenceValue = sameDistanceReferenceValue(resultRecord);
  if (!finite(referenceValue)) return direction(value);
  return direction(value, referenceValue, `同じ部位の基準${fmt(referenceValue, 1)}`, displaySalienceThreshold(referenceValue));
}
function compactSameDistanceDirection(resultRecord, value) {
  const referenceValue = sameDistanceReferenceValue(resultRecord);
  if (!finite(value) || !finite(referenceValue)) return "数値なし";
  const delta = deltaFromComparison(value, referenceValue);
  const tolerance = displaySalienceThreshold(referenceValue);
  if (Math.abs(delta) < tolerance) return `基準${fmt(referenceValue, 1)}付近（${delta > 0 ? "+" : ""}${fmt(delta, 1)}ポイント）`;
  return `基準${fmt(referenceValue, 1)}から${delta > 0 ? "+" : ""}${fmt(delta, 1)}ポイント`;
}
function provenanceLabel(row = {}) {
  const value = String(row.evidenceState || row.provenance || "");
  if (value === "DIRECT_KNOT" || value === "SOURCE_DEFINED_MODEL" || value === "SOURCE_BOUNDED_INTERPOLATION") return "確認できる範囲";
  if (value === "BOUNDED_TRANSFER") return "限られた条件で参考として計算";
  if (value === "SOURCE_FIGURE_DIGITIZED_MODEL") return "確認できる範囲";
  if (value.startsWith("PROVISIONAL_")) return "参考として計算";
  if (value === "EVIDENCE_INSUFFICIENT") return "今回の条件では表示なし";
  if (value.includes("BOUNDED_PROVISIONAL")) return "限られた条件で参考として計算";
  if (value.includes("EVIDENCE_SUPPORTED_SURFACE")) return "複数条件を一緒に扱える範囲";
  if (value.includes("DIRECT_POINT")) return "確認できる条件に対応";
  return "確認できる範囲";
}
function currentRegionalModel(resultRecord={}) { return String(resultRecord?.model_version || "") === PRIMARY_REGIONAL_V2_MODEL_VERSION; }
function signatureFor(resultRecord={}, regionId="") { return resultRecord?.comparison_signatures?.[regionId] || null; }
function compareReference100Signatures(a,b){ const same=Boolean(a&&b&&a.modelVersion===b.modelVersion&&a.outputSemanticVersion===b.outputSemanticVersion&&a.regionId===b.regionId&&a.constructId===b.constructId&&a.referenceId===b.referenceId); return {directDeltaAllowed:same}; }
function optionalLabels(row = {}) {
  const text = JSON.stringify(row.optionalApplied || []).toLowerCase();
  const labels = [];
  if (text.includes("grade")) labels.push("坂の傾き");
  if (text.includes("cadence")) labels.push("1分あたりの歩数");
  if (text.includes("surface") || text.includes("grass")) labels.push("路面");
  return labels;
}
function comparableHistory({ resultRecord, experiences = [], regionId }) {
  const signature = signatureFor(resultRecord, regionId);
  if (!signature) return [];
  const currentExperience = experiences.find((item) => item.regionalV2ResultRecord?.id === resultRecord.id);
  const currentDate = String(currentExperience?.record?.date || "");
  return experiences
    .filter((item) => currentRegionalModel(item.regionalV2ResultRecord) && item.regionalV2ResultRecord?.id !== resultRecord.id && (!currentDate || String(item.record?.date || "") < currentDate))
    .map((item) => ({ experience: item, row: item.regionalV2Result?.regions?.find((candidate) => candidate.regionId === regionId), signature: signatureFor(item.regionalV2ResultRecord, regionId) }))
    .filter((item) => item.row && compareReference100Signatures(signature, item.signature).directDeltaAllowed)
    .sort((a, b) => String(b.experience.record?.date || "").localeCompare(String(a.experience.record?.date || "")));
}
function latestPrevious(args) { return comparableHistory(args)[0] || null; }
function previousInfo(resultRecord, experiences, row) {
  const previous = latestPrevious({ resultRecord, experiences, regionId: row.regionId });
  if (!previous || !finite(row.value) || !finite(previous.row?.value)) return { previous: null, delta: null };
  return { previous, delta: Number(row.value) - Number(previous.row.value) };
}
function previousMarkup(resultRecord, experiences, row, show = true) {
  if (!show) return "";
  const info = previousInfo(resultRecord, experiences, row);
  if (!info.previous) return '<span class="regional-result-row__previous"><strong>前回比較なし</strong></span>';
  return `<span class="regional-result-row__previous" data-previous-comparison="comparable"><strong>前回との差 ${info.delta >= 0 ? "+" : ""}${escapeHtml(fmt(info.delta, 1))}ポイント</strong><small>${escapeHtml(formatLocalDate(info.previous.experience.record.date))}・同じ部位、同じ計算方法、同じ基準で比較</small></span>`;
}
function staticRows() { return PRIMARY_REGIONAL_V2_REGION_DEFS.map((def) => ({ regionId: def.displayId, primaryRegionId: def.id, regionName: def.name, value: null })); }
function renderMap(resultRecord, rows = [], { unavailable = false } = {}) {
  const byRegion = new Map(rows.map((row) => [row.regionId, row]));
  const referenceValue = sameDistanceReferenceValue(resultRecord);
  const referenceLabel = finite(referenceValue) ? `基準${fmt(referenceValue, 1)}` : "同じ部位の基準";
  return `<div class="v27-body-map regional-v2-map primary-regional-map" role="group" aria-label="12部位の身体図。色は各部位自身の${escapeHtml(referenceLabel)}に対する方向だけを表します。">${VIEWS.map((view) => `<figure class="v27-body-map__view"><figcaption>${view.title}</figcaption><svg viewBox="70 10 160 430" aria-label="${escapeHtml(view.title)}の部位図"><defs><pattern id="new-model-unavailable-${view.key}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="currentColor" opacity="0.08"></rect><line x1="0" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="3" opacity="0.24"></line></pattern></defs><g class="body-map__silhouette">${view.silhouette}</g>${view.paths.map(([id, d]) => {
    const row = byRegion.get(id);
    const formal = bodyRegionFormalName(id, row?.regionName || id);
    const valueText = finite(row?.value) ? `今回の目安 ${fmt(row.value, 1)}、${sameDistanceDirection(resultRecord, row.value)}` : "今回の目安は数値なし";
    const label = `${formal}：${valueText}`;
    const state = unavailable ? "unavailable" : directionStateValue(row?.value, referenceValue, displaySalienceThreshold(referenceValue));
    const style = state === "unavailable" ? ` style="fill:url(#new-model-unavailable-${view.key})"` : "";
    return `<a class="regional-v2-map__link" href="#/body-part-detail?recordId=${encodeURIComponent(resultRecord.record_id)}&regionId=${encodeURIComponent(id)}" aria-label="${escapeHtml(`${label}。詳細を開く`)}"><path class="v27-body-map__region" data-direction="${state}" data-region-id="${id}"${style} d="${d}"><title>${escapeHtml(label)}</title></path></a>`;
  }).join("")}</svg></figure>`).join("")}</div>`;
}
function visualPosition(value, referenceValue) {
  if (!finite(value) || !finite(referenceValue) || Number(value) <= 0 || Number(referenceValue) <= 0) return 50;
  return Math.max(4, Math.min(96, 50 + Math.log2(Number(value) / Number(referenceValue)) * 20));
}
function focusSignal(resultRecord, row, experiences) {
  const referenceValue = sameDistanceReferenceValue(resultRecord);
  const conditionDelta = deltaFromComparison(row.value, referenceValue);
  const previous = previousInfo(resultRecord, experiences, row);
  const conditionThreshold = displaySalienceThreshold(referenceValue);
  const previousThreshold = previous.previous ? displaySalienceThreshold(previous.row?.value) : null;
  const conditionUp = finite(conditionDelta) && Number(conditionDelta) >= conditionThreshold;
  const previousUp = Boolean(previous.previous) && finite(previous.delta) && finite(previousThreshold) && Number(previous.delta) >= previousThreshold;
  if (!conditionUp && !previousUp) return null;
  const priority = conditionUp && previousUp ? 1 : conditionUp ? 2 : 3;
  const reasons = [];
  if (conditionUp) reasons.push("その部位の基準より上");
  if (previousUp) reasons.push("前回より上向き");
  return Object.freeze({ priority, conditionUp, previousUp, conditionDelta, previousDelta: previous.delta, reasons });
}
function focusCandidates(resultRecord, rows, experiences) {
  return rows.map((row, index) => ({ row, index, signal: focusSignal(resultRecord, row, experiences) }))
    .filter((item) => item.signal)
    .sort((a, b) => a.signal.priority - b.signal.priority || a.index - b.index);
}
function renderList(resultRecord, rows, experiences, showPreviousComparison, focusSignals = new Map()) {
  const referenceValue = sameDistanceReferenceValue(resultRecord);
  const referenceText = finite(referenceValue) ? fmt(referenceValue, 1) : "100";
  return `<ul class="regional-result-grid regional-v2-list">${rows.map((row) => {
    const formal = bodyRegionFormalName(row.regionId, row.regionName);
    const optional = optionalLabels(row);
    const state = directionStateValue(row.value, referenceValue, displaySalienceThreshold(referenceValue));
    const delta = deltaFromComparison(row.value, referenceValue);
    const signal = focusSignals.get(row.regionId) || null;
    const value = finite(row.value)
      ? `<strong><span aria-hidden="true">${directionSymbol(row.value, referenceValue, displaySalienceThreshold(referenceValue))}</span> ${escapeHtml(fmt(row.value, 1))}</strong>`
      : '<span class="regional-result-row__building">数値なし</span>';
    const meter = finite(row.value) && finite(referenceValue)
      ? `<span class="regional-result-row__scale" aria-label="同じ部位の基準を中央とする表示位置"><i aria-hidden="true"><em>基準</em></i><b style="--regional-position:${visualPosition(row.value, referenceValue)}%"></b></span>`
      : "";
    const focusChip = signal ? `<small data-focus-reason="${escapeHtml(signal.reasons.join("+"))}">基準・前回：${escapeHtml(signal.reasons.join("・"))}</small>` : "";
    return `<li class="regional-result-card" data-direction="${state}"><a href="#/body-part-detail?recordId=${encodeURIComponent(resultRecord.record_id)}&regionId=${encodeURIComponent(row.regionId)}" aria-label="${escapeHtml(`${formal}の詳細を開く`)}"><span class="regional-result-row__name"><strong>${escapeHtml(formal)}</strong></span><span class="regional-result-row__value">${value}</span>${meter}<span class="regional-result-row__direction">${escapeHtml(compactSameDistanceDirection(resultRecord, row.value))}</span>${previousMarkup(resultRecord, experiences, row, showPreviousComparison)}<span class="regional-result-row__chips">${focusChip}<small>${escapeHtml(provenanceLabel(row))}</small>${optional.length ? `<small>${escapeHtml(`${optional.join("・")}の条件を反映`)}</small>` : ""}</span></a></li>`;
  }).join("")}</ul>`;
}
function renderFocusContent(resultRecord, candidates, experiences, showPreviousComparison) {
  if (!candidates.length) return '<p class="regional-focus-empty">この条件に当てはまる部位はありません。全12部位を表示しています。</p>';
  const signalMap = new Map(candidates.map((item) => [item.row.regionId, item.signal]));
  const first = candidates.slice(0, 4).map((item) => item.row);
  const rest = candidates.slice(4).map((item) => item.row);
  const firstMarkup = renderList(resultRecord, first, experiences, showPreviousComparison, signalMap);
  const restMarkup = rest.length ? `<details class="regional-focus-more"><summary>残り${rest.length}部位を見る</summary>${renderList(resultRecord, rest, experiences, showPreviousComparison, signalMap)}</details>` : "";
  return `<div class="regional-focus-summary"><p><strong>基準または前回より上 ${candidates.length}件</strong></p><p class="muted-text">この絞り込みは見返し用です。危険度や重要度を示すものではありません。</p></div>${firstMarkup}${restMarkup}`;
}
function focusReasonText(candidates) {
  if (!candidates.length) return "同じ距離の基準または前回より1%以上上の部位はありません。";
  const both = candidates.filter((item) => item.signal.conditionUp && item.signal.previousUp).length;
  const conditionOnly = candidates.filter((item) => item.signal.conditionUp && !item.signal.previousUp).length;
  const previousOnly = candidates.filter((item) => !item.signal.conditionUp && item.signal.previousUp).length;
  return `同じ距離の基準または比べられる前回記録より1%以上上の部位を表示します（両方 ${both}件・基準のみ ${conditionOnly}件・前回のみ ${previousOnly}件）。1%は表示を絞るための基準で、安全・危険を示すものではありません。`;
}
function renderOodCard(resultRecord) {
  const rows = staticRows();
  return `<section class="result-card result-card--distribution result-card--regional-v27" data-primary-regional-card data-information-role="model"><div class="result-card__heading"><div><p>部位別目安</p><h2 id="distribution-title">今回の速度は扱える範囲外です</h2></div>${renderStatusLabel("数値なし", "neutral")}</div><p>現在の12部位の計算は平均速度2.25〜3.33 m/sの範囲で使用します。今回の対象速度は${escapeHtml(fmt(resultRecord?.result?.speed_mps, 2))} m/sです。記録自体は保存されています。</p><p class="source-boundary">範囲外の値を外挿して100や別の数値で補いません。</p><div class="primary-regional-ood-map">${renderMap(resultRecord, rows, { unavailable: true })}</div><p class="muted-text">身体図から部位の位置は確認できますが、この記録には部位別数値を表示しません。</p></section>`;
}
export function renderBodyRegionResultCard({ resultRecord, experiences = [], initialView = "all", showPreviousComparison = true } = {}) {
  if (resultRecord?.state === "REST") return `<section class="result-card result-card--distribution" data-primary-regional-card data-information-role="model"><div class="result-card__heading"><div><p>部位別目安</p><h2>12部位の比較</h2></div>${renderStatusLabel("休養記録", "neutral")}</div><p>休養日には走行の部位別目安を作成しません。</p></section>`;
  if (resultRecord?.result?.state === "BASELINE_OOD") return renderOodCard(resultRecord);
  const rows = resultRecord?.result?.regions || [];
  const candidates = focusCandidates(resultRecord, rows, experiences);
  const hasFocus = candidates.length > 0;
  const resolvedView = initialView === "all" || !hasFocus ? "all" : "focus";
  const hasFallback = Array.isArray(resultRecord?.result?.fallback) && resultRecord.result.fallback.length > 0;
  const referenceValue = sameDistanceReferenceValue(resultRecord);
  const distance = modelDistanceKm(resultRecord);
  const referenceText = finite(referenceValue) ? fmt(referenceValue, 1) : "—";
  const focusContent = renderFocusContent(resultRecord, candidates, experiences, showPreviousComparison);
  return `<section class="result-card result-card--distribution result-card--regional-v27" data-primary-regional-card data-regional-v2-card data-regional-v2-view="${resolvedView}" data-information-role="model" aria-labelledby="distribution-title">
    <div class="result-card__heading"><div><p>今回の走行条件に対応する部位ごとの目安</p><h2 id="distribution-title">12部位の目安</h2></div>${renderStatusLabel("部位ごとの表示", "model")}</div>
    <p class="inline-helper"><strong>100は各部位自身の基準条件です。</strong> 距離そのものは数値へ掛けません。矢印・バー・身体図の色は、その部位の基準に対する方向を示します。部位間の順位や危険度を示すものではありません。</p>
    ${resultRecord?.result?.combinedConditionState === "AXES_PRESERVED_NOT_COMBINED" ? '<p class="source-boundary"><strong>複数の条件は一つの値へ無理に掛け合わせていません。</strong> 坂の傾き・路面・1分あたりの歩数などは、一緒に扱えない場合は別々の目安として表示します。部位詳細で確認できます。</p>' : ""}
    <div class="regional-v2-view-toggle" role="group" aria-label="表示する部位"><button type="button" data-regional-v2-view-button="focus" aria-pressed="${resolvedView === "focus"}"${hasFocus ? "" : " disabled"}>基準・前回より上${hasFocus ? ` (${candidates.length})` : ""}</button><button type="button" data-regional-v2-view-button="all" aria-pressed="${resolvedView === "all"}">全12部位</button></div>
    <ul class="regional-direction-legend" aria-label="身体図の色と記号"><li data-direction="above"><span aria-hidden="true">↑</span>その部位の基準より上</li><li data-direction="reference"><span aria-hidden="true">=</span>その部位の基準付近</li><li data-direction="below"><span aria-hidden="true">↓</span>その部位の基準より下</li><li data-direction="unavailable"><span aria-hidden="true">—</span>表示なし</li></ul>
    <div class="regional-v2-overview">
      <div class="regional-v2-overview__map">${renderMap(resultRecord, rows)}<p class="muted-text">色は同じ部位の基準に対する方向です。部位を選ぶと詳細を開けます。</p></div>
      <div class="regional-v2-overview__feedback">
        <div class="regional-result-list" data-regional-v2-panel="focus"${resolvedView === "focus" ? "" : " hidden"}>${focusContent}</div>
        <div class="regional-result-list" data-regional-v2-panel="all"${resolvedView === "all" ? "" : " hidden"}>${renderList(resultRecord, rows, experiences, showPreviousComparison)}</div>
      </div>
    </div>
    <details class="regional-claim-boundary"><summary>この値と過去比較の読み方</summary><div><h3>目安と基準</h3><p>各部位では、その部位自身の基準を100として比べます。走行距離そのものを数値へ掛けません。矢印・バー・身体図の色は、その部位の基準に対する方向を示します。</p><h3>「基準または前回より上」の見方</h3><p>${escapeHtml(focusReasonText(candidates))}</p><h3>過去記録との比較</h3><p>過去比較は、同じ部位・同じ計算方法・同じ基準で比べられる保存記録がある場合だけ表示します。比較できる過去記録がない場合は「前回比較なし」と表示します。</p>${hasFallback ? '<h3>任意条件を数値化できない場合</h3><p>情報がない条件や扱えない条件は0として加えず、確認できる条件だけで表示します。</p>' : ""}<h3>この表示が意味しないこと</h3><p>100は安全値・正常値・初心者平均・推奨値ではありません。部位ごとに値の意味が異なるため、別部位どうしの数値を順位付けしたり、異なる部位の数値差や上向き幅を共通の物理量として扱ったりしません。値の増減はけがの危険性、危険度、改善・悪化、走行可否を意味しません。</p><p>身体の記録は、この目安とは別の情報として保存・表示します。</p></div></details>
  </section>`;
}
function sourceLabels(resultRecord, row) { const registry = resultRecord?.source_registry || {}; return (row?.sourceIds || []).map((id) => registry[id]?.label || id); }
const BODY_AREA_TO_PRIMARY_REGION = Object.freeze({
  "BFR-200-ING": "BA-DISP-014", "BFR-200-COX": "BA-DISP-014",
  "BFR-210-GLU": "BA-DISP-015", "BFR-220-ANT": "BA-DISP-016",
  "BFR-220-POST": "BA-DISP-018", "BFR-230-ANT": "BA-DISP-019",
  "BFR-240-ANT": "BA-DISP-021", "BFR-240-POST": "BA-DISP-023",
  "BFR-250-ANT": "BA-DISP-024", "BFR-260-DOR": "BA-DISP-024",
  "BFR-250-POST": "BA-DISP-025", "BFR-260-REAR": "BA-DISP-027",
  "BFR-260-MID": "BA-DISP-028", "BFR-260-FORE": "BA-DISP-029",
  "BFR-260-TOE": "BA-DISP-029",
});
function mappedObservations(experience, regionId) { const observations = Array.isArray(experience?.feedback?.bodyAreaObservations) ? experience.feedback.bodyAreaObservations : []; return observations.filter((item) => BODY_AREA_TO_PRIMARY_REGION[String(item?.areaId || "")] === regionId); }
function observationTimingLabel(value) {
  return ({ PRE_RUN: "走る前から", DURING_RUN: "走行中", IMMEDIATE_POST: "走行直後", LATER: "しばらく後", UNKNOWN: "時期未設定" })[String(value || "UNKNOWN")] || "時期未設定";
}
function renderObservations(experience, regionId) {
  const observations = mappedObservations(experience, regionId);
  if (!observations.length) return '<p class="muted-text">この部位に対応する身体の記録はありません。</p>';
  return `<div class="subjective-entry-list">${observations.map((item) => `<article><h3>${escapeHtml(item.label || bodyRegionFormalName(regionId))}</h3><p>${escapeHtml(bodyAreaLateralityLabel(item.laterality))}・程度 ${escapeHtml(fmt(item.intensity, 0))}/5${item.noticedTiming ? `・${escapeHtml(observationTimingLabel(item.noticedTiming))}` : ""}</p>${item.note ? `<small>${escapeHtml(item.note)}</small>` : ""}</article>`).join("")}</div>`;
}

function axisLabel(axis="") { return ({grade:"坂の傾き",surface:"路面",cadence:"1分あたりの歩数"})[String(axis||"").toLowerCase()] || String(axis||"条件"); }
function renderAxisEstimates(row={}) {
  const axes=Array.isArray(row.axisEstimates)?row.axisEstimates:[];
  if(!axes.length) return "";
  return `<section class="result-card" data-information-role="model"><div class="result-card__heading"><div><p>条件を別々に確認</p><h2>条件を別々に表示</h2></div>${renderStatusLabel("別々に計算", "info")}</div><p class="source-boundary">同時に確認できない条件は、無理に一つの値へ掛け合わせません。</p><div class="regional-trend-table"><table><thead><tr><th>条件</th><th>目安</th><th>表示の扱い</th></tr></thead><tbody>${axes.map((a)=>`<tr><th>${escapeHtml(axisLabel(a.axis))}</th><td>${a.value==null?"数値なし":escapeHtml(fmt(a.value,1))}</td><td>${escapeHtml(provenanceLabel({evidenceState:a.evidenceState}))}</td></tr>`).join("")}</tbody></table></div></section>`;
}
export function renderBodyRegionResultDetail({ experience, regionId, experiences = [] } = {}) {
  const row = experience?.regionalV2Result?.regions?.find((item) => item.regionId === regionId);
  if (!row) return null;
  const resultRecord = experience.regionalV2ResultRecord;
  const history = comparableHistory({ resultRecord, experiences, regionId });
  const previous = history[0] || null;
  const delta = previous ? Number(row.value) - Number(previous.row.value) : null;
  const sources = sourceLabels(resultRecord, row);
  const formal = bodyRegionFormalName(row.regionId, row.regionName);
  const optional = optionalLabels(row);
  const rows = experience?.regionalV2Result?.regions || [];
  const sameDistanceReference = sameDistanceReferenceValue(resultRecord);
  return `<section class="screen screen--body-part-detail" data-primary-regional-detail>
    ${renderPageHeading({ eyebrow: "結果の詳細", title: formal, description: `${formatLocalDate(experience.record.date)}の保存結果です。` })}
    ${renderResultWorkspaceNavigation({ recordId: experience.record.id, date: experience.record.date, regionId, active: "region" })}
    <section class="result-card" data-information-role="model"><div class="result-card__heading"><div><p>今回の目安</p><h2>${escapeHtml(fmt(row.value, 1))}</h2></div>${renderStatusLabel(sameDistanceDirection(resultRecord, row.value), "model")}</div><p><strong>基準の意味：</strong>この部位自身の基準条件を100として比べています。安全・正常・平均・推奨を意味しません。</p><p><strong>この部位で表すこと：</strong>${escapeHtml(bodyRegionPlainMeaning(row.regionId, row.regionName))}</p><p><strong>今回の表示範囲：</strong>${escapeHtml(provenanceLabel(row))}${optional.length ? `。${escapeHtml(optional.join("・"))}の条件を、確認できる範囲で反映しています。` : "。"}</p><p><strong>参考資料：</strong>${escapeHtml(sources.join("、") || "参考資料を確認できません")}</p><p class="source-boundary">この値は同じ部位の記録を振り返るための目安です。別部位との順位付け、診断、けがの予測、危険判定には使いません。</p></section>
    ${renderAxisEstimates(row)}
    <section class="result-card" data-information-role="fact"><div class="result-card__heading"><div><p>過去記録との比較</p><h2>同じ部位・同じ計算方法の記録</h2></div>${renderStatusLabel(`比較できる記録 ${history.length}件`, "info")}</div>${previous ? `<p><strong>前回との差：</strong>${delta >= 0 ? "+" : ""}${escapeHtml(fmt(delta, 1))}ポイント（${escapeHtml(formatLocalDate(previous.experience.record.date))}）</p><p class="muted-text">同じ部位・同じ計算方法・同じ基準で直接比較できる最新の過去記録です。</p>` : '<p>同じ計算方法で比べられる過去記録はまだありません。</p>'}</section>
    <section class="result-card" data-information-role="condition"><div class="result-card__heading"><div><p>理解を助ける読みもの</p><h2>今回の記録を振り返るヒント</h2></div></div><p>読みものは、走行条件や身体の使われ方を振り返るための補助情報です。今回の目安そのものを説明するものではありません。</p><a class="button button--secondary" href="#/reading?recordId=${encodeURIComponent(experience.record.id)}&regionId=${encodeURIComponent(regionId)}">関連する読みものを開く</a></section>
    <section class="result-card" data-information-role="personal"><div class="result-card__heading"><div><p>身体の記録</p><h2>身体の記録</h2></div>${renderStatusLabel("身体の記録", "info")}</div>${renderObservations(experience, regionId)}<p class="source-boundary">身体の記録と部位別目安は別の情報です。両者を組み合わせて原因、危険度、走行の可否を判定しません。</p></section>
    <section class="result-card" data-information-role="limits"><div class="result-card__heading"><div><p>この表示の限界</p><h2>この表示だけでは分からないこと</h2></div></div><ul class="body-part-evidence-list"><li>筋肉・腱・骨・関節に加わった実際の力や損傷</li><li>障害名、発生確率、原因</li><li>走行の可否や安全の保証</li><li>異なる部位どうしの物理的な大小順位</li></ul></section>
    <details class="body-part-other-regions"><summary>今回の結果で別の部位を選ぶ</summary><nav class="body-part-navigation body-part-navigation--collapsed" aria-label="他の部位">${rows.filter((item) => item.regionId !== regionId).map((item) => `<a class="body-part-navigation__link" href="#/body-part-detail?recordId=${encodeURIComponent(experience.record.id)}&regionId=${encodeURIComponent(item.regionId)}"><strong>${escapeHtml(bodyRegionFormalName(item.regionId, item.regionName))}</strong><span>詳細</span></a>`).join("")}</nav></details>
    <div class="screen-actions"><a class="button button--secondary" href="#/result?recordId=${encodeURIComponent(experience.record.id)}">今回の結果へ戻る</a></div>
  </section>`;
}

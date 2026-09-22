import { escapeHtml } from "../ui/commonComponents.js";
import { formatLocalDate } from "../ui/recordPresentation.js";
import {
  bodyRegionFormalName,
  PRIMARY_REGIONAL_V2_MODEL_VERSION,
} from "../core/runloadCore.js";

function finite(value) { return value !== null && value !== "" && Number.isFinite(Number(value)); }
function fmt(value, digits = 1) { return finite(value) ? Number(value).toFixed(digits).replace(/\.0$/, "") : "—"; }
function signed(value, digits = 1) { if (!finite(value)) return "—"; const n = Number(value); return `${n > 0 ? "+" : ""}${fmt(n, digits)}`; }
function signatureFor(record = {}, regionId = "") { return record?.comparison_signatures?.[regionId] || null; }
function sameSignature(a, b) { return Boolean(a && b && a.modelVersion === b.modelVersion && a.outputSemanticVersion === b.outputSemanticVersion && a.regionId === b.regionId && a.constructId === b.constructId && a.referenceId === b.referenceId); }
function shortDate(iso = "") { const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${Number(m[2])}/${Number(m[3])}` : iso; }

const REGION_VIEW = Object.freeze({
  "BA-DISP-014": ["前面", "M120 142 C130 132 140 128 150 128 C160 128 170 132 180 142 L178 178 C168 184 160 188 150 188 C140 188 132 184 122 178 Z"],
  "BA-DISP-016": ["前面", "M122 190 C132 198 141 202 150 202 C159 202 168 198 178 190 L174 266 C164 274 158 278 150 278 C142 278 136 274 126 266 Z"],
  "BA-DISP-019": ["前面", "M126 270 C136 278 142 281 150 281 C158 281 164 278 174 270 L170 300 C162 306 157 309 150 309 C143 309 138 306 130 300 Z"],
  "BA-DISP-021": ["前面", "M130 306 C138 314 144 318 150 318 C156 318 162 314 170 306 L166 382 C160 390 156 394 150 394 C144 394 140 390 134 382 Z"],
  "BA-DISP-024": ["前面", "M135 386 L165 386 L166 416 L134 416 Z"],
  "BA-DISP-015": ["後面", "M120 138 C130 150 139 158 150 158 C161 158 170 150 180 138 L180 190 C170 200 160 205 150 205 C140 205 130 200 120 190 Z"],
  "BA-DISP-018": ["後面", "M122 196 C132 204 141 209 150 209 C159 209 168 204 178 196 L174 274 C164 282 158 286 150 286 C142 286 136 282 126 274 Z"],
  "BA-DISP-023": ["後面", "M128 288 C136 298 143 302 150 302 C157 302 164 298 172 288 L166 368 C160 378 156 383 150 383 C144 383 140 378 134 368 Z"],
  "BA-DISP-025": ["後面", "M142 370 C146 378 148 382 150 382 C152 382 154 378 158 370 L158 416 H142 Z"],
  "BA-DISP-029": ["足裏", "M112 92 C124 84 138 80 154 80 C174 80 188 94 190 120 L190 164 C174 170 158 172 140 168 C126 165 114 158 106 148 L106 120 C107 108 109 99 112 92 Z"],
  "BA-DISP-028": ["足裏", "M106 154 C120 166 136 172 154 172 C170 172 182 168 190 164 L190 252 C176 260 162 264 148 262 C130 260 116 252 104 240 L104 176 Z"],
  "BA-DISP-027": ["足裏", "M104 240 C118 254 132 262 148 264 C164 266 178 260 190 252 C186 282 174 304 158 314 C148 320 138 318 128 312 C112 300 104 274 104 240 Z"],
});
const FRONT = '<circle cx="150" cy="36" r="20"></circle><path d="M110 78 C120 66 135 60 150 60 C165 60 180 66 190 78 L204 126 C208 138 204 150 196 160 L182 176 L188 212 C192 228 190 246 184 262 L172 308 C168 324 166 340 166 356 L166 400 C166 410 158 418 148 418 C138 418 130 410 130 400 L130 356 C130 340 128 324 124 308 L112 262 C106 246 104 228 108 212 L114 176 L100 160 C92 150 88 138 92 126 Z"></path>';
const BACK = '<circle cx="150" cy="36" r="20"></circle><path d="M112 76 C122 66 136 60 150 60 C164 60 178 66 188 76 L202 124 C206 136 202 150 194 160 L182 174 L188 212 C192 228 190 244 184 262 L172 310 C168 326 166 342 166 358 L166 402 C166 412 158 420 148 420 C138 420 130 412 130 402 L130 358 C130 342 128 326 124 310 L112 262 C106 244 104 228 108 212 L114 174 L102 160 C94 150 90 136 94 124 Z"></path>';
const FOOT = '<path d="M114 78 C126 66 140 60 154 60 C172 60 186 72 194 92 C198 102 200 116 200 132 L200 238 C200 274 186 306 160 320 C150 326 140 326 130 320 C108 306 96 274 96 238 L96 132 C96 112 102 90 114 78 Z"></path>';
function locatorSvg(regionId) { const [view, d] = REGION_VIEW[regionId] || []; const silhouette = view === "後面" ? BACK : view === "足裏" ? FOOT : FRONT; if (!d) return ""; return `<svg viewBox="70 10 160 430" aria-hidden="true"><g class="mini-silhouette">${silhouette}</g><path class="mini-region" d="${d}"></path></svg>`; }

function comparableHistory(experience, regionId, allExperiences) {
  const signature = signatureFor(experience.regionalV2ResultRecord, regionId);
  if (!signature) return [];
  return allExperiences
    .filter((item) => item?.regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION)
    .filter((item) => String(item.record?.date || "") <= String(experience.record?.date || ""))
    .map((item) => ({ experience: item, row: item.regionalV2Result?.regions?.find((candidate) => candidate.regionId === regionId), signature: signatureFor(item.regionalV2ResultRecord, regionId) }))
    .filter((item) => item.row && finite(item.row.value) && sameSignature(signature, item.signature))
    .sort((a, b) => String(a.experience.record?.date || "").localeCompare(String(b.experience.record?.date || "")))
    .slice(-5);
}

function trendSvg(rows, { desktop = false } = {}) {
  if (!rows.length) return '<text x="160" y="72" text-anchor="middle">比較できる保存記録はありません</text>';
  const values = rows.map((item) => Number(item.row.value));
  const min = Math.min(94, ...values) - 1; const max = Math.max(106, ...values) + 1;
  const xs = rows.length === 1
    ? [desktop ? 168 : 160]
    : rows.map((_, i) => (desktop ? 44 : 28) + i * ((desktop ? 244 : 264) / (rows.length - 1)));
  const y = (v) => 120 - (Number(v) - min) / Math.max(1, max - min) * 92;
  const points = rows.map((item, i) => `${xs[i]},${y(item.row.value)}`).join(" ");
  const baseline = y(100);
  return `<line class="grid" x1="20" y1="28" x2="300" y2="28"></line><line class="grid" x1="20" y1="74" x2="300" y2="74"></line><line class="grid" x1="20" y1="120" x2="300" y2="120"></line><line class="baseline" x1="20" y1="${baseline}" x2="300" y2="${baseline}"></line><text x="22" y="${baseline - 5}">100</text>${rows.length > 1 ? `<polyline class="trend-line" points="${points}"></polyline>` : ""}${rows.map((item, i) => `<circle class="trend-point${i === rows.length - 1 ? " current" : ""}" cx="${xs[i]}" cy="${y(item.row.value)}" r="5"></circle><text x="${xs[i]}" y="${Math.max(12, y(item.row.value) - 10)}" text-anchor="middle">${fmt(item.row.value, 1)}</text>`).join("")}`;
}

export function renderBodyPartDetailScreen({ services, context }) {
  const recordId = String(context.parameters.get("recordId") || "");
  const regionId = String(context.parameters.get("regionId") || "");
  const experience = services.workflows.records.loadExperience(recordId);
  const row = experience?.regionalV2Result?.regions?.find((item) => item.regionId === regionId) || null;
  const name = bodyRegionFormalName(regionId, row?.regionName || "部位");
  if (!experience || experience?.regionalV2ResultRecord?.model_version !== PRIMARY_REGIONAL_V2_MODEL_VERSION || !row) {
    return `<div class="screen screen--body-part-detail prototype-parity prototype-parity--result"><div class="detail-topbar" data-context-back-duplicate><a href="#/result${recordId ? `?recordId=${encodeURIComponent(recordId)}` : ""}">‹ <span>今回の結果</span></a><strong>部位詳細</strong><span></span></div><main class="detail-main"><section class="detail-title"><p class="eyebrow">BODY REGION DETAIL</p><h1>${escapeHtml(name)}</h1><p>この部位の数値を表示できません。</p></section><p class="compact-boundary">不足する条件を0や100で補いません。</p></main></div>`;
  }
  const history = comparableHistory(experience, regionId, services.workflows.records.loadAllExperiences());
  const previous = history.length > 1 ? history.at(-2) : null;
  const delta = previous && finite(previous.row.value) && finite(row.value) ? Number(row.value) - Number(previous.row.value) : null;
  return `<div class="screen screen--body-part-detail prototype-parity prototype-parity--result"><div class="detail-topbar" data-context-back-duplicate><a href="#/result?recordId=${encodeURIComponent(recordId)}">‹ <span>今回の結果</span></a><strong>部位詳細</strong><span></span></div><main class="detail-main"><section class="detail-title"><p class="eyebrow">BODY REGION DETAIL</p><h1>${escapeHtml(name)}</h1><p>${escapeHtml(formatLocalDate(experience.record.date))}の保存結果</p></section><section class="detail-hero"><div class="detail-locator">${locatorSvg(regionId)}</div><div class="detail-value"><small>今回の目安</small><strong>${fmt(row.value, 1)}</strong><div class="detail-comparison"><span><small>前回</small><b>${previous ? fmt(previous.row.value, 1) : "—"}</b></span><i></i><span><small>前回からの変化</small><b>${finite(delta) ? signed(delta, 1) : "—"}</b></span></div></div></section><section class="trend-card"><div class="trend-head"><div><small>同じ部位</small><h2>保存記録の推移</h2></div><span>${finite(delta) ? `前回からの変化 ${signed(delta, 1)}` : "前回比較なし"}</span></div><svg class="trend-svg trend-svg--mobile" viewBox="0 0 320 145" role="img" aria-label="保存記録の推移">${trendSvg(history)}</svg><svg class="trend-svg trend-svg--pc" viewBox="0 0 320 145" role="img" aria-label="保存記録の推移">${trendSvg(history, { desktop: true })}</svg><div class="trend-dates">${history.map((item) => `<span>${escapeHtml(shortDate(item.experience.record.date))}</span>`).join("")}</div><p>同じ部位・同じ計算方法・同じ基準で比べられる保存記録を表示します。</p></section><p class="compact-boundary">この部位自身の基準を100とした比較です。別の部位との順位ではありません。</p><div class="screen-actions"><a class="button button--text" href="#/interpretation-room?recordId=${encodeURIComponent(recordId)}&origin=body-part-detail&regionId=${encodeURIComponent(regionId)}">この部位の結果を整理する</a></div></main></div>`;
}

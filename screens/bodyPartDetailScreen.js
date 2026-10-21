import { RUNNING_EVIDENCE_MODEL_VERSION } from '../core/appCore.js';
import { isPresentFiniteNumber as finite } from "../shared/valueUtilities.js";
import { compareExperienceRecordChronology as recordChronology, fmt, signed, signatureFor, signaturesComparable as sameSignature } from "../shared/recordUtilities.js";
export { fmt, signed };
import { escapeHtml } from "../ui/commonComponents.js";
import { BODY_REGION_VIEWS } from "../ui/bodyRegionVisuals.js";
import { formatLocalDate } from "../ui/recordPresentation.js";
import {
  bodyRegionFormalName,
  PRIMARY_REGIONAL_V2_MODEL_VERSION,
} from "../core/appCore.js";

export function shortDate(iso = "") { const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${Number(m[2])}/${Number(m[3])}` : iso; }

function locatorSvg(regionId) {
  for (const view of BODY_REGION_VIEWS) {
    const region = view.paths.find(([id]) => id === regionId);
    if (!region) continue;
    return `<svg viewBox="70 10 160 430" aria-hidden="true"><g class="mini-silhouette">${view.silhouette}</g><path class="mini-region" d="${region[1]}"></path></svg>`;
  }
  return "";
}

function comparableHistory(experience, regionId, allExperiences) {
  const signature = signatureFor(experience.regionalV2ResultRecord, regionId);
  if (!signature) return [];
  return (Array.isArray(allExperiences) ? allExperiences : [])
    .filter((item) => [PRIMARY_REGIONAL_V2_MODEL_VERSION,RUNNING_EVIDENCE_MODEL_VERSION].includes(item?.regionalV2ResultRecord?.model_version))
    .filter((item) => recordChronology(item, experience) <= 0)
    .map((item) => ({ experience: item, row: (Array.isArray(item.regionalV2Result?.regions) ? item.regionalV2Result.regions : []).find((candidate) => candidate && typeof candidate === "object" && candidate.regionId === regionId), signature: signatureFor(item.regionalV2ResultRecord, regionId) }))
    .filter((item) => item.row && finite(item.row.value) && sameSignature(signature, item.signature))
    .sort((a, b) => recordChronology(a.experience, b.experience))
    .slice(-5);
}

export function trendSvg(rows, { annotated = false } = {}) {
  if (!rows.length) return '<text x="160" y="72" text-anchor="middle">比較できる保存記録はありません</text>';
  const values = rows.map((item) => Number(item.row.value));
  const min = Math.min(94, ...values) - 1; const max = Math.max(106, ...values) + 1;
  const xs = rows.length === 1
    ? [annotated ? 168 : 160]
    : rows.map((_, i) => (annotated ? 44 : 28) + i * ((annotated ? 244 : 264) / (rows.length - 1)));
  const y = (v) => 120 - (Number(v) - min) / Math.max(1, max - min) * 92;
  const points = rows.map((item, i) => `${xs[i]},${y(item.row.value)}`).join(" ");
  const baseline = y(100);
  const base = `<line class="grid" x1="20" y1="28" x2="300" y2="28"></line><line class="grid" x1="20" y1="74" x2="300" y2="74"></line><line class="grid" x1="20" y1="120" x2="300" y2="120"></line><line class="baseline" x1="20" y1="${baseline}" x2="300" y2="${baseline}"></line>${rows.length > 1 ? `<polyline class="trend-line" points="${points}"></polyline>` : ""}`;
  if (annotated) return `${base}${rows.map((item, i) => `<circle class="trend-point${i === rows.length - 1 ? " current" : ""}" cx="${xs[i]}" cy="${y(item.row.value)}" r="5"></circle><text x="${xs[i]}" y="${Math.max(12, y(item.row.value) - 10)}" text-anchor="middle">${fmt(item.row.value, 1)}</text>`).join("")}`;
  return `${base}${rows.map((item, i) => {
    const record = item.experience?.record || {};
    const distance = finite(record.distanceKm) ? fmt(record.distanceKm, 2) : "";
    const duration = finite(record.durationMinutes) ? fmt(record.durationMinutes, 1) : "";
    const aria = `${shortDate(record.date)}、部位 ${fmt(item.row.value, 1)}${distance ? `、${distance} km` : ""}${duration ? `、${duration}分` : ""}`;
    return `<g class="trend-point-target${i === rows.length - 1 ? " current" : ""}" data-trend-point-index="${i}" data-trend-date="${escapeHtml(shortDate(record.date))}" data-trend-value="${escapeHtml(fmt(item.row.value, 1))}" data-trend-distance="${escapeHtml(distance)}" data-trend-duration="${escapeHtml(duration)}" tabindex="0" role="button" aria-label="${escapeHtml(aria)}"><circle class="trend-hit" cx="${xs[i]}" cy="${y(item.row.value)}" r="15"></circle><circle class="trend-point${i === rows.length - 1 ? " current" : ""}" cx="${xs[i]}" cy="${y(item.row.value)}" r="5"></circle><text x="${xs[i]}" y="${Math.max(12, y(item.row.value) - 10)}" text-anchor="middle">${fmt(item.row.value, 1)}</text></g>`;
  }).join("")}`;
}

function runningEvidenceDisclosure(row, resultRecord) {
  if (resultRecord?.model_version !== RUNNING_EVIDENCE_MODEL_VERSION) return "";
  const metric = escapeHtml(String(row?.construct || "原典の観測量"));
  const unit = escapeHtml(String(row?.unit || "原典の単位"));
  const sources = escapeHtml((row?.sourceIds || []).join("、"));
  const route = String(row?.routeTrace?.[0]?.route || "原著適用範囲外");
  const routes = {
    A1_PUBLISHED_TABLE: "A1：原著の公表表値",
    A2_PUBLISHED_EQUATION: "A2：原著の波形成分の計算式",
    B_INTRA_SOURCE_INTERPOLATION: "B：同一原著の隣接値の直線補間",
  };
  const ref = Number(row?.referenceSpeedMps);
  const reference = Number.isFinite(ref) && ref > 0 ? `${ref} m/s` : "参照条件不明";
  // The raw value is the SAME underlying scientific construct before Ref-100 normalization.
  // It is not a per-user measurement; B is an intra-source interpolation, A2 a paper equation.
  const rawKind = {
    A1_PUBLISHED_TABLE: "原著に掲載された表値",
    A2_PUBLISHED_EQUATION: "原著式による計算値",
    B_INTRA_SOURCE_INTERPOLATION: "アプリ内で算出した原著内の直線補間値",
  }[route] || "原典適用範囲外";
  const rawDisclosure = finite(row?.rawValue)
    ? `<p data-scientific-raw-unit="running-v4"><strong>正規化前の参照値：</strong>${escapeHtml(Number(row.rawValue).toPrecision(7))} ${unit}（${escapeHtml(rawKind)}）。<strong>表示上の参照100：</strong>${escapeHtml(fmt(row.value,1))}。原典の単位の値は本人の測定値ではありません。</p>`
    : `<p data-scientific-raw-unit="running-v4">適格な原典の値がないため、正規化前の値も参照100も表示しません。</p>`;
  return `<details class="compact-boundary detail-evidence" data-scientific-evidence="running-v4"><summary>計算根拠と適用条件</summary><div class="detail-evidence__content"><p>原典の観測量：${metric}（${unit}）。参照速度：${escapeHtml(reference)}。計算経路：${escapeHtml(routes[route] || "適用範囲外・数値なし")}。</p>${rawDisclosure}<p>原典：${sources}。これは公開研究における参照値であり、本人の組織負荷を測った値ではありません。記録の平均速度と原著の定速実験の条件を同一視しません。基準100は正常・安全・危険の境界ではありません。</p></div></details>`;
}

export function renderBodyPartDetailScreenWithPresentation({ services, context }, presentation = {}) {
  const {
    renderMetrics = () => "",
    renderReference = () => "",
    renderTrend = ({ history }) => `<svg class="trend-svg" viewBox="0 0 320 145" role="img" aria-label="保存記録の推移">${trendSvg(history, { annotated: true })}</svg>`,
    renderTrendDetail = () => "",
  } = presentation;
  const recordId = String(context.parameters.get("recordId") || "");
  const regionId = String(context.parameters.get("regionId") || "");
  const experience = services.workflows.records.loadExperience(recordId);
  const regionRows = experience?.regionalV2Result?.regions;
  const row = (Array.isArray(regionRows) ? regionRows : []).find((item) => item && typeof item === "object" && item.regionId === regionId) || null;
  const name = regionId === "BA-DISP-028" && experience?.regionalV2ResultRecord?.model_version === RUNNING_EVIDENCE_MODEL_VERSION ? "中足部（最大力）" : bodyRegionFormalName(regionId, row?.regionName || "部位");
  if (!experience || ![PRIMARY_REGIONAL_V2_MODEL_VERSION,RUNNING_EVIDENCE_MODEL_VERSION].includes(experience?.regionalV2ResultRecord?.model_version) || !row) {
    return `<div class="screen screen--body-part-detail screen-layout screen-layout--result"><div class="detail-topbar" data-context-back-duplicate><a href="#/result${recordId ? `?recordId=${encodeURIComponent(recordId)}` : ""}">‹ <span>今回の結果</span></a><strong>部位詳細</strong><span></span></div><div class="detail-main"><section class="detail-title"><p class="eyebrow">部位詳細</p><h1>${escapeHtml(name)}</h1><p>この部位の数値を表示できません。</p></section><p class="compact-boundary">不足する条件を0や100で補いません。</p></div></div>`;
  }
  const history = comparableHistory(experience, regionId, services.workflows.records.loadAllExperiences());
  const previous = history.length > 1 ? history.at(-2) : null;
  const delta = previous && finite(previous.row.value) && finite(row.value) ? Number(row.value) - Number(previous.row.value) : null;
  const baselineDelta = finite(row.value) ? Number(row.value) - 100 : null;
  const currentHistoryIndex = Math.max(0, history.length - 1);
  const currentHistory = history[currentHistoryIndex] || null;
  const currentHistoryRecord = currentHistory?.experience?.record || experience.record;
  const state = Object.freeze({ recordId, regionId, experience, row, history, previous, delta, baselineDelta, currentHistoryIndex, currentHistory, currentHistoryRecord });
  return `<div class="screen screen--body-part-detail screen-layout screen-layout--result"><div class="detail-topbar" data-context-back-duplicate><a href="#/result?recordId=${encodeURIComponent(recordId)}">‹ <span>今回の結果</span></a><strong>部位詳細</strong><span></span></div><div class="detail-main"><section class="detail-title"><p class="eyebrow">部位詳細</p><h1>${escapeHtml(name)}</h1><p>${escapeHtml(formatLocalDate(experience.record.date))}の保存結果</p></section><section class="detail-hero"><div class="detail-locator">${locatorSvg(regionId)}</div><div class="detail-value"><small>今回の目安</small><strong>${fmt(row.value, 1)}</strong>${renderReference(state)}<div class="detail-comparison"><span><small>前回</small><b>${previous ? fmt(previous.row.value, 1) : "—"}</b></span><i></i><span><small>前回からの変化</small><b>${finite(delta) ? signed(delta, 1) : "—"}</b></span></div></div></section>${renderMetrics(state)}${runningEvidenceDisclosure(row,experience?.regionalV2ResultRecord)}<section class="trend-card"><div class="trend-head"><div><small>同じ部位</small><h2>保存記録の推移</h2></div><span>${finite(delta) ? `前回からの変化 ${signed(delta, 1)}` : "前回比較なし"}</span></div>${history.length > 1 ? renderTrend(state) : `<div class="trend-first-entry"><strong>最初の記録です</strong><span>次の記録が加わると、ここで変化を確認できます。</span></div>`}<div class="trend-dates">${history.map((item) => `<span>${escapeHtml(shortDate(item.experience.record.date))}</span>`).join("")}</div>${renderTrendDetail(state)}<p>${history.length > 1 ? "グラフの点を選ぶと、その日の記録を確認できます。" : "今回が最初の比較点です。次回以降の変化をここで確認できます。"}</p></section>${regionId === "BA-DISP-028" && experience?.regionalV2ResultRecord?.model_version === RUNNING_EVIDENCE_MODEL_VERSION ? `<p class="compact-boundary" data-scientific-boundary="r11-v4">Liらの中足部区域の最大力を部位自身の基準で正規化した値です。内側縦足弓を直接測定した値ではありません。原典内の参照比であり、痛みや損傷の診断ではありません。</p>` : ""}${regionId === "BA-DISP-028" && experience?.regionalV2ResultRecord?.model_version !== RUNNING_EVIDENCE_MODEL_VERSION ? `<p class="compact-boundary" data-scientific-boundary="r11">この値は原典の内側・外側中足部ピーク圧を部位内で基準化した研究内合成指標です。内側縦足弓を直接測定した値ではありません。</p>` : ""}<details class="detail-method-note"><summary>基準100について</summary><p>100はこの部位の原典内の基準値です。部位ごとに対象と測定量が異なるため、別部位の値と大きさを比べることはできません。</p></details><div class="screen-actions"><a class="button button--text" href="#/interpretation-room?recordId=${encodeURIComponent(recordId)}&origin=body-part-detail&regionId=${encodeURIComponent(regionId)}">この部位から見比べる</a></div></div></div>`;
}

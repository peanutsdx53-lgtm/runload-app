import { compareExperienceRecordChronology as recordChronology } from "../shared/recordUtilities.js";
import { isPresentFiniteNumber as finite } from "../shared/valueUtilities.js";

import { PRIMARY_REGIONAL_V2_REGION_DEFS, bodyRegionFormalName, PRIMARY_REGIONAL_V2_MODEL_VERSION, buildPrimaryRegionalV2ComparisonSignature, comparePrimaryRegionalV2Signatures } from "../core/appCore.js";
import { buildSelfUnderstandingView } from "../core/selfUnderstandingCore.js";

import { escapeHtml } from "../ui/commonComponents.js";
import { addDaysIso, localTodayIso, parseIsoDate } from "../ui/historyPresentation.js";
import { formatActivitySummary, formatLocalDate, formatLocalTime, formatNumber } from "../ui/recordPresentation.js";

import { BODY_REGION_VIEWS } from "../ui/bodyRegionVisuals.js";
const REGIONS = Object.freeze(PRIMARY_REGIONAL_V2_REGION_DEFS.map((region) => Object.freeze({ id: region.displayId, name: region.name })));

const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const DEFAULT_REGION_ID = "BA-DISP-019";

function reference100DistanceKm(resultRecord = {}, experience = null) {
  if (resultRecord?.model_version !== PRIMARY_REGIONAL_V2_MODEL_VERSION) return null;
  const input = resultRecord?.engine_input_snapshot || {};
  const runWalk = String(input.runningFormat || experience?.record?.runningFormat || "").toUpperCase() === "RUN_WALK";
  const value = Number(runWalk ? input.runningDistanceKm : input.distanceKm);
  if (value > 0) return value;
  const record = experience?.record || {};
  const recordDistance = Number(runWalk ? record.runWalkRunningDistanceKm : record.distanceKm);
  return recordDistance > 0 ? recordDistance : null;
}

export function buildHref(values = {}) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return `#/history${query.size ? `?${query.toString()}` : ""}`;
}

function normalizedPeriod(value) {
  return [7, 28, 90, 180].includes(Number(value)) ? Number(value) : 28;
}

export function normalizedView(value) {
  return String(value || "") === "checks" ? "checks" : "records";
}


function normalizedMetric(value) {
  return String(value || "") === "subjective" ? "subjective" : "region";
}

function normalizedRegionId(value) {
  return REGION_BY_ID.has(String(value || "")) ? String(value) : DEFAULT_REGION_ID;
}

function normalizedRegionalDisplay(value) {
  return String(value || "").toLowerCase() === "difference" ? "difference" : "ratio";
}


function resultRow(resultRecord, regionId) {
  return resultRecord?.result?.regions?.find((row) => row.regionId === regionId) || null;
}

function subjectiveKey(areaId = "", laterality = "") {
  return `${String(areaId || "")}::${String(laterality || "")}`;
}

function parseSubjectiveKey(value = "") {
  const [areaId = "", laterality = ""] = String(value || "").split("::");
  return Object.freeze({ areaId, laterality });
}

export function buildWorkspace(services, context, { normalizeView = normalizedView } = {}) {
  const allExperiences = services.workflows.records.loadAllExperiences()
    .filter(Boolean)
    .sort(recordChronology);
  if (!allExperiences.length) return null;

  const period = normalizedPeriod(context.parameters.get("period"));
  const view = normalizeView(context.parameters.get("view"));
  const metric = normalizedMetric(context.parameters.get("metric"));
  const regionId = normalizedRegionId(context.parameters.get("regionId"));
  const regionalDisplay = normalizedRegionalDisplay(context.parameters.get("display"));
  const requestedRecordId = context.parameters.get("recordId") || "";
  const requestedDate = context.parameters.get("anchorDate") || "";
  const latestDate = allExperiences.at(-1)?.record?.date || localTodayIso();
  const endDate = parseIsoDate(requestedDate) ? requestedDate : latestDate;
  const startDate = addDaysIso(endDate, -(period - 1));
  const regionalByRecord = services.storage.modelResultsRegionalV2.latestByRecord();

  const periodExperiences = allExperiences.filter((experience) => (
    experience.record.date >= startDate && experience.record.date <= endDate
  ));
  const rows = periodExperiences.map((experience) => {
    const resultRecord = regionalByRecord.get(experience.record.id) || experience.regionalV2ResultRecord || null;
    const row = resultRow(resultRecord, regionId);
    return Object.freeze({
      experience,
      resultRecord,
      row,
    });
  });

  const semanticRows = rows.map((item) => {
    const isPrimary = item.resultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION;
    const conditionIndexExact = isPrimary && finite(item.row?.value) ? Number(item.row.value) : null;
    const signature = isPrimary && item.row
      ? buildPrimaryRegionalV2ComparisonSignature(item.resultRecord, item.row)
      : null;
    const distanceKm = isPrimary ? reference100DistanceKm(item.resultRecord, item.experience) : null;
    const referenceValue = isPrimary ? 100 : null;
    const referenceDelta = finite(conditionIndexExact) && finite(referenceValue) ? Number(conditionIndexExact) - Number(referenceValue) : null;
    return Object.freeze({ ...item, semantic: null, conditionIndexExact, signature, isPrimaryRegionalV2: isPrimary, isReference100: isPrimary, referenceDistanceKm: distanceKm, referenceValue, referenceDelta });
  });
  const requestedAnchor = requestedRecordId
    ? semanticRows.find((item) => item.experience.record.id === requestedRecordId && item.row) || null
    : null;
  const anchor = requestedAnchor
    || [...semanticRows].reverse().find((item) => item.signature && finite(item.conditionIndexExact))
    || [...semanticRows].reverse().find((item) => item.row)
    || [...semanticRows].reverse()[0]
    || null;
  const anchorSignature = anchor?.signature || null;
  const trendRows = semanticRows.map((item) => {
    const compatibility = anchorSignature && item.signature && anchor?.isPrimaryRegionalV2 && item.isPrimaryRegionalV2
      ? comparePrimaryRegionalV2Signatures(anchorSignature, item.signature)
      : Object.freeze({ status: "INCOMPATIBLE", differences: Object.freeze(["COMPARISON_SIGNATURE_MISSING"]), directDeltaAllowed: false });
    return Object.freeze({ ...item, compatibility });
  });

  const observationRows = rows.flatMap((item) => (
    (item.experience.feedback?.bodyAreaObservations || [])
      .filter((observation) => Number(observation?.intensity) > 0 && observation?.areaId)
      .map((observation) => Object.freeze({ ...item, observation }))
  ));
  const optionMap = new Map();
  observationRows.forEach((item) => {
    const key = subjectiveKey(item.observation.areaId, item.observation.laterality);
    if (!optionMap.has(key)) optionMap.set(key, Object.freeze({
      key,
      areaId: item.observation.areaId,
      laterality: item.observation.laterality || "",
      label: item.observation.label || "詳細部位",
    }));
  });
  const subjectiveOptions = [...optionMap.values()];
  const queryKey = context.parameters.get("subjectiveKey") || subjectiveKey(
    context.parameters.get("areaId") || "",
    context.parameters.get("laterality") || "",
  );
  const requestedSubjective = parseSubjectiveKey(queryKey);
  const selectedSubjective = subjectiveOptions.find((item) => (
    item.areaId === requestedSubjective.areaId
      && (!requestedSubjective.laterality || item.laterality === requestedSubjective.laterality)
  )) || subjectiveOptions.at(-1) || null;
  const subjectiveRows = selectedSubjective
    ? observationRows
      .filter((item) => item.observation.areaId === selectedSubjective.areaId)
      .filter((item) => !selectedSubjective.laterality || item.observation.laterality === selectedSubjective.laterality)
      .sort((left, right) => recordChronology(left.experience, right.experience))
    : [];

  const plans = services.storage.plans.loadAll().filter((plan) => (
    plan.scheduledDate >= startDate && plan.scheduledDate <= endDate
  ));
  return Object.freeze({
    period,
    view,
    metric,
    regionId,
    region: REGION_BY_ID.get(regionId),
    regionalDisplay,
    requestedRecordId,
    startDate,
    endDate,
    rows,
    trendRows,
    anchor,
    anchorSignature,
    subjectiveOptions,
    selectedSubjective,
    subjectiveRows,
    plans,
    counts: Object.freeze({
      run: rows.filter((item) => item.experience.record.activityType === "run").length,
      rest: rows.filter((item) => item.experience.record.activityType === "rest").length,
      regional: rows.filter((item) => item.row).length,
      comparable: trendRows.filter((item) => item.compatibility.directDeltaAllowed && finite(item.conditionIndexExact)).length,
      subjective: observationRows.length,
    }),
  });
}

function activityMatches(experience, activityType) {
  return activityType === "all" || experience.record.activityType === activityType;
}

function searchText(item) {
  const record = item.experience.record || {};
  return [
    record.date,
    record.course?.name,
    record.memo,
    formatActivitySummary(record),
    item.note?.oneThingNote,
    item.note?.pageTitle,
  ].filter(Boolean).join(" ").toLocaleLowerCase("ja-JP");
}

function referenceRatioPercent(item) {
  const value = Number(item?.conditionIndexExact);
  const reference = Number(item?.referenceValue);
  if (!Number.isFinite(value) || !Number.isFinite(reference) || reference <= 0) return null;
  return (value / reference) * 100;
}

function shortDateLabel(value = "") {
  const parts = String(value || "").split("-");
  if (parts.length !== 3) return String(value || "");
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

function weekdayLabel(value = "") {
  const date = new Date(`${String(value || "")}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return ["日", "月", "火", "水", "木", "金", "土"][date.getUTCDay()] || "";
}

function weekendClass(value = "") {
  const weekday = weekdayLabel(value);
  if (weekday === "土") return " date-weekend--sat";
  if (weekday === "日") return " date-weekend--sun";
  return "";
}

function trendSelectionHref(workspace, item) {
  return buildHref({
    view: "trends",
    metric: "region",
    period: workspace.period,
    anchorDate: workspace.endDate,
    regionId: workspace.regionId,
    display: workspace.regionalDisplay,
    recordId: item.experience.record.id,
  });
}

function previousComparableItem(items, selected) {
  if (!selected) return null;
  const sorted = [...items].sort((left, right) => recordChronology(left.experience, right.experience));
  const index = sorted.findIndex((item) => item.experience.record.id === selected.experience.record.id);
  return index > 0 ? sorted[index - 1] : null;
}

function regionLocatorSvg(regionId) {
  for (const view of BODY_REGION_VIEWS) {
    const match=view.paths.find(([id])=>id===regionId);
    if (!match) continue;
    return `<svg viewBox="70 10 160 430" aria-hidden="true"><g class="mini-silhouette">${view.silhouette}</g><path class="mini-region" d="${match[1]}"></path></svg>`;
  }
  return "";
}
function regionViewLabel(regionId) {
  return BODY_REGION_VIEWS.find((view)=>view.paths.some(([id])=>id===regionId))?.title || "部位";
}
function historyChartSvg(items, workspace) {
  if (!items.length) return '<text x="360" y="160" text-anchor="middle" class="chart-axis-label">比較できる記録がありません</text>';
  const rows=items.map((item,index)=>({item,index,ratio:referenceRatioPercent(item),difference:referenceRatioPercent(item)-100}));
  const width=720,height=320,left=54,right=20,top=42,bottom=62,plotW=646,plotH=216;
  const pointLeft=left,pointRight=width-right,pointW=pointRight-pointLeft;
  const x=(i)=>rows.length===1?pointLeft+pointW/2:pointLeft+i*(pointW/(rows.length-1));
  const selectedId=workspace.anchor?.experience?.record?.id || rows.at(-1)?.item.experience.record.id || "";
  if (workspace.regionalDisplay==="difference") {
    const vals=rows.map((r)=>r.difference).filter(Number.isFinite);const maxAbs=Math.max(5,...vals.map((v)=>Math.abs(v)))+2;const limit=Math.ceil(maxAbs/2)*2;const min=-limit,max=limit;const y=(v)=>top+(max-v)/(max-min)*plotH;const y0=y(0);const ticks=[-limit,-limit/2,0,limit/2,limit];
    const grid=ticks.map((v)=>`<line x1="${left}" x2="${width-right}" y1="${y(v)}" y2="${y(v)}" class="${v===0?"chart-zero":"chart-grid"}"></line><text x="${left-10}" y="${y(v)+4}" class="chart-axis-label${v===0?" reference":""}" text-anchor="end">${v===0?"0":signedNumber(v)}</text>`).join("");
    const bars=rows.map((r,i)=>{const selected=r.item.experience.record.id===selectedId;const yy=y(r.difference),rectY=Math.min(y0,yy),rectH=Math.max(3,Math.abs(y0-yy));return `<rect x="${x(i)-10}" y="${rectY}" width="20" height="${rectH}" rx="6" class="chart-bar${selected?" selected":""}"></rect>${selected?`<circle cx="${x(i)}" cy="${yy}" r="13" class="chart-halo"></circle>`:""}<circle cx="${x(i)}" cy="${yy}" r="${selected?7:5}" class="chart-point${selected?" selected":""}"></circle><text x="${x(i)}" y="${r.difference>=0?Math.max(18,yy-14):Math.min(height-bottom+24,yy+24)}" class="chart-value">${signedNumber(r.difference)}</text><a href="${escapeHtml(trendSelectionHref(workspace,r.item))}"><rect x="${x(i)-22}" y="${top-8}" width="44" height="${plotH+44}" class="chart-hit"></rect></a><text x="${x(i)}" y="${height-31}" class="chart-date${weekendClass(r.item.experience.record.date)}">${escapeHtml(shortDateLabel(r.item.experience.record.date))}</text><text x="${x(i)}" y="${height-16}" class="chart-date${weekendClass(r.item.experience.record.date)}">(${escapeHtml(weekdayLabel(r.item.experience.record.date))})</text>`;}).join("");
    return `${grid}${bars}`;
  }
  const ratios=rows.map((r)=>r.ratio).filter(Number.isFinite);const maxDev=Math.max(10,...ratios.map((v)=>Math.abs(v-100)));const half=Math.ceil((maxDev+3)/5)*5;const min=Math.max(0,100-half),max=100+half;const y=(v)=>top+(max-v)/(max-min)*plotH;const ticks=[];for(let v=Math.ceil(min/10)*10;v<=max;v+=10)ticks.push(v);if(!ticks.includes(100))ticks.push(100);ticks.sort((a,b)=>a-b);
  const grid=ticks.map((v)=>`<line x1="${left}" x2="${width-right}" y1="${y(v)}" y2="${y(v)}" class="${v===100?"chart-reference":"chart-grid"}"></line><text x="${left-10}" y="${y(v)+4}" class="chart-axis-label${v===100?" reference":""}" text-anchor="end">${v}%</text>`).join("");
  const path=rows.map((r,i)=>`${i?"L":"M"} ${x(i)} ${y(r.ratio)}`).join(" ");
  const points=rows.map((r,i)=>{const selected=r.item.experience.record.id===selectedId;return `${selected?`<circle cx="${x(i)}" cy="${y(r.ratio)}" r="14" class="chart-halo"></circle>`:""}<circle cx="${x(i)}" cy="${y(r.ratio)}" r="${selected?8:6}" class="chart-point${selected?" selected":""}"></circle><text x="${x(i)}" y="${Math.max(18,y(r.ratio)-14)}" class="chart-value">${formatNumber(r.ratio,0)}%</text><a href="${escapeHtml(trendSelectionHref(workspace,r.item))}"><rect x="${x(i)-22}" y="${top-8}" width="44" height="${plotH+44}" class="chart-hit"></rect></a><text x="${x(i)}" y="${height-31}" class="chart-date${weekendClass(r.item.experience.record.date)}">${escapeHtml(shortDateLabel(r.item.experience.record.date))}</text><text x="${x(i)}" y="${height-16}" class="chart-date${weekendClass(r.item.experience.record.date)}">(${escapeHtml(weekdayLabel(r.item.experience.record.date))})</text>`;}).join("");
  return `${grid}<path d="${path}" class="chart-line"></path>${points}`;
}
function historySelectedCard(selected, previous, workspace) {
  if(!selected)return `<aside class="selected-card selected-focus-card"><div class="selected-focus-body"><p>比較できる記録がありません。</p></div></aside>`;
  const value=Number(selected.conditionIndexExact);const ratio=referenceRatioPercent(selected);const difference=Number(ratio)-100;const record=selected.experience.record;
  return `<aside class="selected-card selected-focus-card" aria-live="polite"><div class="selected-focus-hero"><div class="selected-focus-heading"><span aria-hidden="true" class="selected-point"></span><div><small>選択中の記録</small><h2 class="${weekendClass(record.date)}">${escapeHtml(formatLocalDate(record.date))}</h2></div></div><span class="selected-weekday ${weekendClass(record.date)}">${escapeHtml(weekdayLabel(record.date))}</span><div class="selected-focus-value"><span>部位の目安</span><strong>${escapeHtml(formatNumber(value,1))}</strong></div></div><div class="selected-focus-body"><dl class="selected-facts selected-facts-compact"><div><dt>基準からの差</dt><dd>${difference>=0?"+":""}${escapeHtml(formatNumber(difference,0))}%</dd></div><div><dt>距離</dt><dd>${escapeHtml(formatNumber(selected.referenceDistanceKm,2))} km</dd></div><div><dt>コース</dt><dd>${escapeHtml(record.course?.name||"未設定")}</dd></div></dl><div class="selected-action-zone"><a class="result-link selected-result-link" href="#/result?recordId=${encodeURIComponent(record.id)}"><span><small>この記録の詳細</small><strong>結果を開く</strong></span><i>›</i></a><a class="button button--text" href="#/interpretation-room?recordId=${encodeURIComponent(record.id)}&origin=history&regionId=${encodeURIComponent(workspace.regionId)}">この記録を見比べる</a></div></div></aside>`;
}
function historyComparisonTable(items, workspace) {
  if(!items.length)return "";
  let prev=null;
  return `<details class="records-disclosure" open><summary><span><strong>比較記録</strong><small>${items.length}件の数値を確認</small></span><i>⌄</i></summary><div class="table-scroll"><table><thead><tr><th>日付</th><th>距離</th><th>目安</th><th>基準からの差</th><th>コース</th></tr></thead><tbody>${items.map((item)=>{const ratio=referenceRatioPercent(item);const diff=ratio-100;const record=item.experience.record;const row=`<tr><td><a class="${weekendClass(record.date)}" href="${escapeHtml(trendSelectionHref(workspace,item))}">${escapeHtml(shortDateLabel(record.date))} (${escapeHtml(weekdayLabel(record.date))})</a></td><td>${escapeHtml(formatNumber(item.referenceDistanceKm,2))} km</td><td>${escapeHtml(formatNumber(item.conditionIndexExact,1))}</td><td>${diff>=0?"+":""}${escapeHtml(formatNumber(diff,0))}%</td><td>${escapeHtml(record.course?.name||"未設定")}</td></tr>`;prev=item;return row;}).join("")}</tbody></table></div></details>`;
}
function historyRegionPicker(workspace) {
  return `<div class="sheet-overlay" data-history-region-overlay hidden><section class="region-sheet" role="dialog" aria-modal="true" aria-labelledby="history-region-title"><div class="grip"></div><div class="sheet-head"><div><p class="eyebrow">身体の部位</p><h2 id="history-region-title">表示する部位</h2></div><button type="button" class="app-utility-button" data-action="close-history-region-picker" aria-label="閉じる"><span class="app-utility-button__close-symbol" aria-hidden="true">×</span></button></div><div class="region-options">${REGIONS.map((region)=>`<button type="button" class="region-option${region.id===workspace.regionId?" active":""}" data-history-region-id="${escapeHtml(region.id)}" aria-pressed="${region.id===workspace.regionId}"><span class="locator">${regionLocatorSvg(region.id)}</span><span><strong>${escapeHtml(bodyRegionFormalName(region.id,region.name))}</strong><small>${escapeHtml(regionViewLabel(region.id))}</small></span></button>`).join("")}</div></section></div>`;
}
export function historyCompareView(workspace) {
  const allDirect=workspace.trendRows.filter((item)=>item.compatibility.directDeltaAllowed&&finite(item.conditionIndexExact)).sort((a,b)=>recordChronology(a.experience,b.experience));const items=allDirect.slice(-8);const selected=items.find((item)=>item.experience.record.id===workspace.anchor?.experience?.record?.id)||items.at(-1)||null;const previous=previousComparableItem(items,selected);const regionName=bodyRegionFormalName(workspace.region.id,workspace.region.name);const other=workspace.trendRows.filter((item)=>item.row&&!item.compatibility.directDeltaAllowed).length;
  if(!items.length){
    const recordsHref=buildHref({view:"records",period:workspace.period,anchorDate:workspace.endDate,regionId:workspace.regionId});
    return `<section class="history-view history-view--compare"><section class="comparison-head"><div class="comparison-title comparison-title--plain"><div><small>部位の履歴</small><h2>同じ部位を比べる</h2></div></div><button class="region-picker-trigger" type="button" data-action="open-history-region-picker"><span aria-hidden="true" class="region-picker-locator">${regionLocatorSvg(workspace.regionId)}</span><span class="region-picker-copy"><small>表示する部位</small><strong>${escapeHtml(regionName)}</strong><em>${escapeHtml(regionViewLabel(workspace.regionId))}</em></span><i>変更</i></button></section><div class="history-toolbar"><div class="period-control"><span>期間</span><div role="group">${[7,28,90,180].map((period)=>`<button type="button" class="${workspace.period===period?"active":""}" data-history-href="${escapeHtml(buildHref({view:"trends",metric:"region",period,anchorDate:workspace.endDate,regionId:workspace.regionId,display:workspace.regionalDisplay}))}">${period}日</button>`).join("")}</div></div><div class="compare-count"><small>比較できる記録</small><strong>0件</strong></div></div><div class="empty-records history-comparison-empty"><small>身体の部位</small><strong>この条件で比較できる記録はありません</strong><p>${other?"保存記録はありますが、この部位を同じ基準で比べられる記録がありません。":"期間を広げるか、別の部位を選んで確認してください。"}</p><a href="${escapeHtml(recordsHref)}">保存記録を見る</a></div>${other?`<aside class="comparison-side"><details class="excluded-details" open><summary>比較対象外の記録 ${other}件</summary><p>保存記録は残したまま、この比較には含めていません。</p></details></aside>`:""}<p class="screen-footnote">※ 数値の上昇・低下を、状態の良し悪し・安全性・けがの危険性として判定しません。</p>${historyRegionPicker(workspace)}</section>`;
  }
  return `<section class="history-view history-view--compare"><section class="comparison-head"><div class="comparison-title comparison-title--plain"><div><small>部位の履歴</small><h2>同じ部位を比べる</h2></div></div><button class="region-picker-trigger" type="button" data-action="open-history-region-picker"><span aria-hidden="true" class="region-picker-locator">${regionLocatorSvg(workspace.regionId)}</span><span class="region-picker-copy"><small>表示する部位</small><strong>${escapeHtml(regionName)}</strong><em>${escapeHtml(regionViewLabel(workspace.regionId))}</em></span><i>変更</i></button></section><div class="history-toolbar"><div class="period-control"><span>期間</span><div role="group">${[7,28,90,180].map((period)=>`<button type="button" class="${workspace.period===period?"active":""}" data-history-href="${escapeHtml(buildHref({view:"trends",metric:"region",period,anchorDate:workspace.endDate,regionId:workspace.regionId,display:workspace.regionalDisplay}))}">${period}日</button>`).join("")}</div></div><div class="compare-count"><small>比較できる記録</small><strong>${items.length}件</strong></div></div><div class="comparison-layout"><section class="chart-card"><div class="chart-card-head"><div><h2>保存記録の推移</h2></div><div class="display-toggle" role="group" aria-label="グラフ表示"><button type="button" class="${workspace.regionalDisplay==="ratio"?"active":""}" data-history-href="${escapeHtml(buildHref({view:"trends",metric:"region",period:workspace.period,anchorDate:workspace.endDate,regionId:workspace.regionId,display:"ratio",recordId:selected?.experience.record.id||""}))}">基準との比率</button><button type="button" class="${workspace.regionalDisplay==="difference"?"active":""}" data-history-href="${escapeHtml(buildHref({view:"trends",metric:"region",period:workspace.period,anchorDate:workspace.endDate,regionId:workspace.regionId,display:"difference",recordId:selected?.experience.record.id||""}))}">基準からの差</button></div></div><div class="chart-wrap"><svg class="chart-svg" role="img" viewBox="0 0 720 320" aria-label="${escapeHtml(regionName)}の保存記録の推移">${historyChartSvg(items,workspace)}</svg></div><div class="chart-legend"><span><i class="legend-current"></i>選択中</span><span><i class="legend-line"></i>比較できる記録</span><span class="weekend-key">土日</span></div></section>${historySelectedCard(selected,previous,workspace)}${historyComparisonTable(items,workspace)}<aside class="comparison-side"><details class="condition-details"><summary>比較条件</summary><div><p>同じ部位を同じ基準で比べられる記録だけをグラフに含めます。</p><p>距離は別の走行事実です。別部位どうしを順位付けしません。</p></div></details>${other?`<details class="excluded-details"><summary>比較対象外の記録 ${other}件</summary><p>保存記録は残したまま、この比較線には含めていません。</p></details>`:""}</aside></div><p class="screen-footnote">※ 数値の上昇・低下を、状態の良し悪し・安全性・けがの危険性として判定しません。</p>${historyRegionPicker(workspace)}</section>`;
}
export function historyRecordView(workspace,context,{ title = "保存記録" } = {}) {
  const activity=String(context.parameters.get("activityType")||"all"),query=String(context.parameters.get("query")||"").trim().toLocaleLowerCase("ja-JP");const rows=workspace.rows.filter((item)=>activityMatches(item.experience,activity)).filter((item)=>!query||searchText(item).includes(query)).sort((a,b)=>recordChronology(b.experience,a.experience));
  return `<section class="history-view history-view--records"><section class="records-head"><div class="comparison-title comparison-title--plain"><div><small>保存記録</small><h2>${escapeHtml(title)}</h2></div></div><span class="record-total">${rows.length}件</span></section><form class="record-filters" id="history-record-filter-form"><input type="hidden" name="view" value="records"><input type="hidden" name="period" value="${workspace.period}"><input type="hidden" name="anchorDate" value="${escapeHtml(workspace.endDate)}"><input type="hidden" name="regionId" value="${escapeHtml(workspace.regionId)}"><label><span>記録内を検索</span><input name="query" type="search" value="${escapeHtml(context.parameters.get("query")||"")}" placeholder="日付、コース、メモ"></label><div class="type-toggle" role="group" aria-label="記録の種類">${[["all","すべて"],["run","走行"],["rest","休養"]].map(([value,label])=>`<button type="button" class="${activity===value?"active":""}" data-history-record-type="${value}" aria-pressed="${activity===value}">${label}</button>`).join("")}</div></form><div class="record-list">${rows.length?rows.map((item)=>{const r=item.experience.record;const recordTime=formatLocalTime(r.createdAt);return`<article class="record-item"><div class="record-item-head"><time class="${weekendClass(r.date)}" datetime="${escapeHtml(r.createdAt||r.date)}"><span>${escapeHtml(formatLocalDate(r.date))}（${escapeHtml(weekdayLabel(r.date))}）</span>${recordTime?`<small class="record-time">記録時刻 ${escapeHtml(recordTime)}</small>`:""}</time><span class="record-kind${r.activityType==="rest"?" rest":""}">${r.activityType==="rest"?"休養":"走行"}</span></div><h3>${escapeHtml(formatActivitySummary(r))}</h3><p>${escapeHtml(r.course?.name||"コース名なし")}${r.memo?`・${escapeHtml(r.memo)}`:""}</p><div class="record-actions"><a href="#/result?recordId=${encodeURIComponent(r.id)}">結果を見る</a><button type="button" data-action="delete-history-record" data-record-id="${escapeHtml(r.id)}" data-record-label="${escapeHtml(`${formatLocalDate(r.date)}${recordTime?` ${recordTime}`:""}の記録`)}">削除</button></div></article>`;}).join(""):'<div class="empty-records empty-records--filtered"><strong>条件に合う記録はありません</strong><p>検索語または記録の種類を変更してください。</p></div>'}</div></section>`;
}

function rofSummariesForHistory(services, experiences = []) {
  return new Map(experiences.filter((experience) => experience?.record?.activityType === "run")
    .map((experience) => [experience.record.id, services?.fatigue?.summarizeRun?.(experience.record.id) || null]));
}


export function selfUnderstandingHistoryView(services, context) {
  const experiences = services.workflows.records.loadAllExperiences().filter(Boolean).sort(recordChronology);
  const rofMap = rofSummariesForHistory(services, experiences);
  const view = buildSelfUnderstandingView({
    allExperiences: experiences,
    threads: services?.storage?.selfUnderstandingThreads?.loadAll?.() || [],
    rofSummariesByRecordId: rofMap,
  });
  const requestedState = String(context?.parameters?.get("checkState") || "watching");
  const collection = requestedState === "paused" ? view.paused : requestedState === "closed" ? view.closed : view.watching;
  const chart = (thread) => {
    if (["REGION_WATCH", "REGION_OBSERVATION_PAIR"].includes(thread.type)) {
      const points = [];
      const sourceEpisode = thread.sourceEpisode;
      if (finite(sourceEpisode?.row?.value)) points.push({ date: sourceEpisode.date, value: Number(sourceEpisode.row.value), recordId: sourceEpisode.recordId });
      (thread.eligibleEpisodes || []).forEach((episode) => { if (finite(episode?.row?.value)) points.push({ date: episode.date, value: Number(episode.row.value), recordId: episode.recordId }); });
      if (!points.length) return "";
      const min = Math.min(90, ...points.map((point) => point.value)) - 4;
      const max = Math.max(110, ...points.map((point) => point.value)) + 4;
      const x = (index) => points.length <= 1 ? 160 : 28 + (264 * index) / (points.length - 1);
      const y = (value) => 18 + ((max - value) / Math.max(1, max - min)) * 94;
      const baselineY = y(100);
      const lines = points.slice(1).map((point, index) => `<line x1="${x(index)}" y1="${y(points[index].value)}" x2="${x(index + 1)}" y2="${y(point.value)}"></line>`).join("");
      const dots = points.map((point, index) => `<a href="#/interpretation-room?recordId=${encodeURIComponent(point.recordId)}&origin=history&regionId=${encodeURIComponent(thread.subject.regionId)}"><circle cx="${x(index)}" cy="${y(point.value)}" r="5"><title>${escapeHtml(`${formatLocalDate(point.date)} ${formatNumber(point.value, 1)}`)}</title></circle></a>`).join("");
      const values = points.map((point) => `<li><a href="#/interpretation-room?recordId=${encodeURIComponent(point.recordId)}&origin=history&regionId=${encodeURIComponent(thread.subject.regionId)}"><time>${escapeHtml(formatLocalDate(point.date))}</time><strong>${escapeHtml(formatNumber(point.value, 1))}</strong></a></li>`).join("");
      return `<div class="self-understanding-history-chart"><div class="self-understanding-history-chart__head"><strong>部位表示</strong><span>各記録は同じ意味の基準で比較できるものだけ</span></div><svg viewBox="0 0 320 132" role="img" aria-label="確認中の部位表示の履歴"><line class="is-baseline" x1="24" y1="${baselineY}" x2="304" y2="${baselineY}"></line><text x="25" y="${Math.max(12, baselineY - 4)}">基準100</text><g class="is-series">${lines}</g><g class="is-points">${dots}</g></svg><ul class="self-understanding-history-values" aria-label="部位表示の記録一覧">${values}</ul><p>高いほど良い・悪いという意味ではありません。</p></div>`;
    }
    if (thread.type === "SAME_COURSE_ROF_POST") {
      const points = [];
      const sourceEpisode = thread.sourceEpisode;
      if (finite(sourceEpisode?.postRofJ)) points.push({ date: sourceEpisode.date, value: Number(sourceEpisode.postRofJ), recordId: sourceEpisode.recordId });
      (thread.eligibleEpisodes || []).forEach((episode) => { if (finite(episode.postRofJ)) points.push({ date: episode.date, value: Number(episode.postRofJ), recordId: episode.recordId }); });
      if (!points.length) return "";
      const x = (index) => points.length <= 1 ? 160 : 28 + (264 * index) / (points.length - 1);
      const y = (value) => 18 + ((10 - value) / 10) * 94;
      const lines = points.slice(1).map((point, index) => `<line x1="${x(index)}" y1="${y(points[index].value)}" x2="${x(index + 1)}" y2="${y(point.value)}"></line>`).join("");
      const dots = points.map((point, index) => `<a href="#/interpretation-room?recordId=${encodeURIComponent(point.recordId)}&origin=history"><circle cx="${x(index)}" cy="${y(point.value)}" r="5"><title>${escapeHtml(`${formatLocalDate(point.date)} ${point.value}/10`)}</title></circle></a>`).join("");
      const values = points.map((point) => `<li><a href="#/interpretation-room?recordId=${encodeURIComponent(point.recordId)}&origin=history"><time>${escapeHtml(formatLocalDate(point.date))}</time><strong>${escapeHtml(String(point.value))}/10</strong></a></li>`).join("");
      return `<div class="self-understanding-history-chart"><div class="self-understanding-history-chart__head"><strong>走行後の疲労感</strong><span>疲労感 0–10</span></div><svg viewBox="0 0 320 132" role="img" aria-label="確認中の走行後疲労感の履歴"><g class="is-grid"><line x1="24" y1="18" x2="304" y2="18"></line><line x1="24" y1="65" x2="304" y2="65"></line><line x1="24" y1="112" x2="304" y2="112"></line><text x="5" y="22">10</text><text x="12" y="69">5</text><text x="12" y="116">0</text></g><g class="is-series">${lines}</g><g class="is-points">${dots}</g></svg><ul class="self-understanding-history-values" aria-label="走行後疲労感の記録一覧">${values}</ul><p>走行条件が同じとは限りません。回復・準備状態・安全性は判定しません。</p></div>`;
    }
    return "";
  };
  const item = (thread) => {
    const shareRecordId = thread.eligibleEpisodes?.at?.(-1)?.recordId || thread.sourceEpisode?.recordId || "";
    const share = shareRecordId ? `<a class="self-understanding-history-share" href="#/consultation?recordId=${encodeURIComponent(shareRecordId)}&threadId=${encodeURIComponent(thread.id)}">この確認を共有用に整理</a>` : "";
    return `<article class="self-understanding-history-item" data-state="${escapeHtml(thread.userState)}"><header><div><small>${thread.userState === "PAUSED" ? "一時停止中" : thread.userState === "CLOSED" ? "終了" : thread.hasNewEligibleData ? "新しい記録あり" : "確認中"}</small><h3>${escapeHtml(thread.title)}</h3></div><span>${escapeHtml(String(thread.eligibleCount || 0))}件</span></header><p>自分で次回も見ると決めた内容です。</p>${chart(thread)}<div class="self-understanding-history-item__actions">${thread.userState === "WATCHING" ? `<button type="button" data-action="history-self-understanding-state" data-thread-id="${escapeHtml(thread.id)}" data-thread-decision="PAUSE">一時停止</button><button type="button" data-action="history-self-understanding-state" data-thread-id="${escapeHtml(thread.id)}" data-thread-decision="CLOSE">終了</button>` : thread.userState === "PAUSED" ? `<button type="button" class="primary" data-action="history-self-understanding-state" data-thread-id="${escapeHtml(thread.id)}" data-thread-decision="KEEP_WATCHING">確認を再開</button><button type="button" data-action="history-self-understanding-state" data-thread-id="${escapeHtml(thread.id)}" data-thread-decision="CLOSE">終了</button>` : ""}</div>${share}</article>`;
  };
  const filterHref = (state) => buildHref({ view: "checks", checkState: state });
  return `<section class="history-view history-view--checks"><section class="records-head"><div class="comparison-title comparison-title--plain"><div><small>確認してきたこと</small><h2>自分について確認してきたこと</h2></div></div><span class="record-total">${collection.length}件</span></section><nav class="self-understanding-history-filter" aria-label="確認していることの状態"><a class="${requestedState === "watching" ? "active" : ""}" href="${escapeHtml(filterHref("watching"))}">確認中 <span>${view.watching.length}</span></a><a class="${requestedState === "paused" ? "active" : ""}" href="${escapeHtml(filterHref("paused"))}">休止中 <span>${view.paused.length}</span></a><a class="${requestedState === "closed" ? "active" : ""}" href="${escapeHtml(filterHref("closed"))}">終了したもの <span>${view.closed.length}</span></a></nav><div class="self-understanding-history-list">${collection.length ? collection.map(item).join("") : `<div class="empty-records"><strong>${requestedState === "watching" ? "確認中の問いはありません" : requestedState === "paused" ? "休止中の問いはありません" : "終了した問いはありません"}</strong></div>`}</div></section>`;
}


export function renderHistoryScreenWithPresentation({ services, context }, presentation = {}) {
  const {
    normalizeView = normalizedView,
    renderModeSwitch = () => "",
    renderEmpty = () => '<section class="history-view"><div class="empty-records empty-records--initial"><small>保存記録</small><strong>保存した記録はまだありません</strong><p>走行または休養を保存すると、ここから記録を探して確認できます。</p><a href="#/record-input">記録を始める</a></div></section>',
    renderContent = ({ workspace, context: routeContext }) => workspace.view === "checks" ? selfUnderstandingHistoryView(services, routeContext) : historyRecordView(workspace, routeContext),
  } = presentation;
  const workspace = buildWorkspace(services, context, { normalizeView });
  if (!workspace) {
    const wantsChecks = String(context?.parameters?.get("view") || "") === "checks";
    const checks = wantsChecks ? selfUnderstandingHistoryView(services, context) : "";
    return `<div class="screen screen--history screen-layout screen-layout--history"><section class="page-head"><div><p class="eyebrow">履歴</p><h1>履歴</h1><p>過去の記録と、次回も見ると決めた内容を見返します。</p></div></section>${checks || renderEmpty()}</div>`;
  }
  const content = renderContent({ workspace, context, services });
  return `<div class="screen screen--history screen-layout screen-layout--history"><section class="page-head"><div><p class="eyebrow">履歴</p><h1>履歴</h1><p>過去の記録と、次回も見ると決めた内容を見返します。</p></div></section>${renderModeSwitch(workspace)}${content}${services.workflows.history.loadUndoEntry()?'<div class="history-undo" role="status"><p>直前に削除した記録を元に戻せます。</p><button type="button" data-action="undo-history-delete">削除を元に戻す</button></div>':""}</div>`;
}

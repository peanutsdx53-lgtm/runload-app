
import { PRIMARY_REGIONAL_V2_REGION_DEFS, bodyRegionFormalName, bodyAreaLateralityLabel, PRIMARY_REGIONAL_V2_MODEL_VERSION, buildPrimaryRegionalV2ComparisonSignature, comparePrimaryRegionalV2Signatures } from "../core/runloadCore.js";

import { escapeHtml } from "../ui/commonComponents.js";
import { addDaysIso, localTodayIso, parseIsoDate } from "../ui/historyPresentation.js";
import { formatActivitySummary, formatLocalDate, formatNumber } from "../ui/recordPresentation.js";

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

function buildHref(values = {}) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return `#/history${query.size ? `?${query.toString()}` : ""}`;
}

function normalizedPeriod(value) {
  return [7, 28, 90, 180].includes(Number(value)) ? Number(value) : 28;
}

function normalizedView(value) {
  return value === "trends" ? "trends" : "records";
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

function finite(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function resultRow(resultRecord, regionId) {
  return resultRecord?.result?.regions?.find((row) => row.regionId === regionId) || null;
}

function recordChronology(left, right) {
  return String(left?.record?.date || "").localeCompare(String(right?.record?.date || ""))
    || String(left?.record?.createdAt || "").localeCompare(String(right?.record?.createdAt || ""))
    || String(left?.record?.id || "").localeCompare(String(right?.record?.id || ""));
}

function subjectiveKey(areaId = "", laterality = "") {
  return `${String(areaId || "")}::${String(laterality || "")}`;
}

function parseSubjectiveKey(value = "") {
  const [areaId = "", laterality = ""] = String(value || "").split("::");
  return Object.freeze({ areaId, laterality });
}

function buildWorkspace(services, context) {
  const allExperiences = services.workflows.records.loadAllExperiences()
    .filter(Boolean)
    .sort(recordChronology);
  if (!allExperiences.length) return null;

  const period = normalizedPeriod(context.parameters.get("period"));
  const view = normalizedView(context.parameters.get("view"));
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

function chartGeometry(items) {
  const reference100 = Boolean(items[0]?.isReference100);
  const values = items.flatMap((item) => [Number(item.conditionIndexExact), ...(reference100 && finite(item.referenceValue) ? [Number(item.referenceValue)] : [])]).filter(Number.isFinite);
  if (!reference100) values.push(100);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = Math.max(2, (rawMax - rawMin) * 0.16);
  const minValue = rawMin - padding;
  const maxValue = rawMax + padding;
  const span = Math.max(1, maxValue - minValue);
  const projectY = (value) => 44 - ((Number(value) - minValue) / span) * 32;
  return Object.freeze({
    points: Object.freeze(items.map((item, index) => Object.freeze({
      ...item,
      x: items.length === 1 ? 54 : 12 + (index * 82) / (items.length - 1),
      y: projectY(item.conditionIndexExact),
      referenceY: reference100 && finite(item.referenceValue) ? projectY(item.referenceValue) : null,
    }))),
    referenceY: reference100 ? null : projectY(100),
    minValue,
    maxValue,
    reference100,
  });
}

function chartLabelIndices(length) {
  if (length <= 8) return new Set(Array.from({ length }, (_, index) => index));
  const step = Math.ceil((length - 1) / 6);
  const indices = new Set([0, length - 1]);
  for (let index = step; index < length - 1; index += step) indices.add(index);
  return indices;
}

function referenceRatioPercent(item) {
  const value = Number(item?.conditionIndexExact);
  const reference = Number(item?.referenceValue);
  if (!Number.isFinite(value) || !Number.isFinite(reference) || reference <= 0) return null;
  return (value / reference) * 100;
}

function referenceRatioGeometry(items) {
  const ratios = items.map(referenceRatioPercent).filter(Number.isFinite);
  const maxDeviation = ratios.length ? Math.max(...ratios.map((value) => Math.abs(value - 100))) : 0;
  const halfRange = Math.max(10, Math.ceil((maxDeviation + 3) / 5) * 5);
  const minValue = Math.max(0, 100 - halfRange);
  const maxValue = 100 + halfRange;
  const span = Math.max(1, maxValue - minValue);
  const plotTop = 8;
  const plotBottom = 43;
  const projectY = (value) => plotBottom - ((Number(value) - minValue) / span) * (plotBottom - plotTop);
  const ticks = [];
  for (let value = Math.ceil(minValue / 5) * 5; value <= maxValue; value += 5) {
    ticks.push(Object.freeze({ value, y: projectY(value) }));
  }
  return Object.freeze({
    points: Object.freeze(items.map((item, index) => Object.freeze({
      ...item,
      ratioPercent: referenceRatioPercent(item),
      x: items.length === 1 ? 54 : 11 + (index * 84) / (items.length - 1),
      y: projectY(referenceRatioPercent(item)),
    }))),
    referenceY: projectY(100),
    minValue,
    maxValue,
    ticks: Object.freeze(ticks),
  });
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

function trendDirectionLabel(delta) {
  if (!Number.isFinite(Number(delta)) || Math.abs(Number(delta)) < 0.5) return Object.freeze({ arrow: "—", label: "基準と同程度", className: "is-near" });
  return Number(delta) > 0
    ? Object.freeze({ arrow: "↑", label: "基準より上", className: "is-above" })
    : Object.freeze({ arrow: "↓", label: "基準より下", className: "is-below" });
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

function renderReferenceRatioTrendChart(items, regionName, workspace) {
  if (!items.length) return '<p class="muted-text">比較できる記録が不足しています。</p>';
  const geometry = referenceRatioGeometry(items);
  const polyline = geometry.points.map((point) => `${point.x},${point.y}`).join(" ");
  const labelIndices = chartLabelIndices(geometry.points.length);
  const selectedId = workspace.anchor?.experience?.record?.id || items.at(-1)?.experience?.record?.id || "";
  const gridLines = geometry.ticks.map((tick) => `<line x1="7" y1="${tick.y}" x2="97" y2="${tick.y}" class="regional-history-chart__grid${tick.value === 100 ? " is-reference" : ""}"></line><text x="5.6" y="${tick.y + 0.75}" text-anchor="end" class="regional-history-chart__tick-label${tick.value === 100 ? " is-reference" : ""}">${escapeHtml(formatNumber(tick.value, 0))}%</text>`).join("");
  const valueLabels = geometry.points.map((point, index) => labelIndices.has(index)
    ? `<text x="${point.x}" y="${Math.max(6.4, point.y - 2.6)}" text-anchor="middle" class="regional-history-chart__value-label">${escapeHtml(formatNumber(point.ratioPercent, 0))}%</text>`
    : "").join("");
  const dateLabels = geometry.points.map((point, index) => {
    if (!labelIndices.has(index)) return "";
    const isCurrent = point.experience.record.id === selectedId;
    const weekday = weekdayLabel(point.experience.record.date);
    return `<text x="${point.x}" y="48.7" text-anchor="middle" class="regional-history-chart__date-label${weekendClass(point.experience.record.date)}${isCurrent ? " is-current" : ""}"><tspan x="${point.x}" dy="0">${escapeHtml(shortDateLabel(point.experience.record.date))}</tspan><tspan x="${point.x}" dy="2.7">(${escapeHtml(weekday)})</tspan></text>`;
  }).join("");
  const hiddenReferences = geometry.points.map((point) => `<span>${escapeHtml(formatNumber(point.referenceValue, 0))}</span>`).join("");
  const pointLinks = geometry.points.map((point) => {
    const selected = point.experience.record.id === selectedId;
    const delta = Number(point.ratioPercent) - 100;
    const halo = selected ? `<circle cx="${point.x}" cy="${point.y}" r="1.9" class="regional-history-chart__point-halo"></circle>` : "";
    return `<a href="${escapeHtml(trendSelectionHref(workspace, point))}" aria-label="${escapeHtml(`${formatLocalDate(point.experience.record.date)}、基準との比率${formatNumber(point.ratioPercent, 0)}%、基準との差${delta >= 0 ? "+" : ""}${formatNumber(delta, 0)}%`)}">${halo}<circle cx="${point.x}" cy="${point.y}" r="${selected ? 1.2 : 0.82}" class="regional-history-chart__point${selected ? " is-current" : ""}"><title>${escapeHtml(`${formatLocalDate(point.experience.record.date)} ${formatNumber(point.ratioPercent, 0)}%`)}</title></circle></a>`;
  }).join("");
  return `<figure class="regional-history-chart regional-history-chart--ratio" data-regional-history="true"><div class="regional-history-chart__meaning"><strong>その部位の基準との比率の推移</strong><span>基準線：その部位の基準（100）</span></div><svg viewBox="0 0 100 56" role="img" aria-label="${escapeHtml(regionName)}の部位の目安の推移">${gridLines}<g class="regional-history-chart__zone"><rect x="8.1" y="9.2" width="13.8" height="4.2" rx="1.3"></rect><text x="15" y="12" text-anchor="middle">基準より上</text></g><g class="regional-history-chart__zone"><rect x="8.1" y="38.4" width="13.8" height="4.2" rx="1.3"></rect><text x="15" y="41.2" text-anchor="middle">基準より下</text></g>${geometry.points.length > 1 ? `<polyline points="${polyline}" class="regional-history-chart__line"></polyline>` : ""}${valueLabels}${pointLinks}${dateLabels}</svg><figcaption class="regional-history-chart__axis regional-history-chart__axis--ratio"><span>古い記録</span><strong>横軸：記録日</strong><span>新しい記録</span></figcaption><div class="visually-hidden">基準からの差${hiddenReferences}</div></figure>`;
}

function renderReferenceDifferenceTrendChart(items, regionName, workspace) {
  if (!items.length) return '<p class="muted-text">比較できる記録が不足しています。</p>';
  const rows = items.map((item) => ({ ...item, difference: referenceRatioPercent(item) - 100 }));
  const maxAbs = Math.max(5, ...rows.map((item) => Math.abs(item.difference)));
  const limit = Math.ceil(maxAbs / 5) * 5;
  const projectY = (value) => 26 - (Number(value) / limit) * 17;
  const selectedId = workspace.anchor?.experience?.record?.id || rows.at(-1)?.experience?.record?.id || "";
  const labelIndices = chartLabelIndices(rows.length);
  const points = rows.map((item, index) => ({ ...item, x: rows.length === 1 ? 54 : 11 + (index * 84) / (rows.length - 1), y: projectY(item.difference) }));
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const dateLabels = points.map((point, index) => {
    if (!labelIndices.has(index)) return "";
    return `<text x="${point.x}" y="48.7" text-anchor="middle" class="regional-history-chart__date-label${weekendClass(point.experience.record.date)}${point.experience.record.id === selectedId ? " is-current" : ""}"><tspan x="${point.x}" dy="0">${escapeHtml(shortDateLabel(point.experience.record.date))}</tspan><tspan x="${point.x}" dy="2.7">(${escapeHtml(weekdayLabel(point.experience.record.date))})</tspan></text>`;
  }).join("");
  const valueLabels = points.map((point, index) => labelIndices.has(index) ? `<text x="${point.x}" y="${Math.max(6.5, point.y - 2.4)}" text-anchor="middle" class="regional-history-chart__value-label">${point.difference >= 0 ? "+" : ""}${escapeHtml(formatNumber(point.difference, 0))}</text>` : "").join("");
  const pointLinks = points.map((point) => `<a href="${escapeHtml(trendSelectionHref(workspace, point))}" aria-label="${escapeHtml(`${formatLocalDate(point.experience.record.date)}、基準からの差${point.difference >= 0 ? "+" : ""}${formatNumber(point.difference, 0)}ポイント`)}"><circle cx="${point.x}" cy="${point.y}" r="${point.experience.record.id === selectedId ? 1.2 : .82}" class="regional-history-chart__point${point.experience.record.id === selectedId ? " is-current" : ""}"></circle></a>`).join("");
  return `<figure class="regional-history-chart regional-history-chart--difference" data-regional-history="true"><div class="regional-history-chart__meaning"><strong>その部位の基準からの差</strong><span>0はその部位の基準と同じ位置です。</span></div><svg viewBox="0 0 100 56" role="img" aria-label="${escapeHtml(regionName)}の基準からの差"><line x1="7" y1="26" x2="97" y2="26" class="regional-history-chart__grid is-reference"></line><text x="5.6" y="26.75" text-anchor="end" class="regional-history-chart__tick-label is-reference">0</text>${points.length > 1 ? `<polyline points="${polyline}" class="regional-history-chart__line"></polyline>` : ""}${valueLabels}${pointLinks}${dateLabels}</svg><figcaption class="regional-history-chart__axis regional-history-chart__axis--ratio"><span>古い記録</span><strong>横軸：記録日　／　縦軸：基準からの差（ポイント）</strong><span>新しい記録</span></figcaption></figure>`;
}

function routeFamilyLabel(signature = null) {
  const tier = String(signature?.auditSupportTier || "");
  if (tier === "PROVISIONAL_AUTHORIZED") return "参考として計算";
  if (tier === "FORMAL_DIRECT_IN_DOMAIN") return "確認できる範囲";
  return "同じ意味の目安";
}

function formatPacePerKm(record = {}) {
  const distance = Number(record.distanceKm);
  const duration = Number(record.durationMinutes);
  if (!(distance > 0) || !(duration > 0)) return "—";
  const seconds = Math.round((duration * 60) / distance);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")} /km`;
}

function signedGradeFromRecord(record = {}) {
  const course = record.course || {};
  if (String(course.gradeKnowledge || "").toUpperCase() === "KNOWN_FLAT") return 0;
  const sections = Array.isArray(course.sections) ? course.sections : [];
  if (sections.length) {
    let weighted = 0;
    let weightSum = 0;
    sections.forEach((section) => {
      const share = finite(section.sharePercent) ? Number(section.sharePercent) : (finite(section.distanceKm) ? Number(section.distanceKm) : null);
      const raw = finite(section.gradePercent) ? Number(section.gradePercent) : null;
      if (!(share > 0) || raw === null) return;
      const direction = String(section.gradeDirection || "").toUpperCase();
      const signed = direction === "DOWNHILL" ? -Math.abs(raw) : direction === "UPHILL" ? Math.abs(raw) : raw;
      weighted += signed * share;
      weightSum += share;
    });
    if (weightSum > 0) return weighted / weightSum;
  }
  if (finite(course.upPercent) || finite(course.downPercent)) {
    const upShare = finite(course.upPercent) ? Number(course.upPercent) : 0;
    const downShare = finite(course.downPercent) ? Number(course.downPercent) : 0;
    const upGrade = finite(course.upGradePercent) ? Math.abs(Number(course.upGradePercent)) : 0;
    const downGrade = finite(course.downGradePercent) ? Math.abs(Number(course.downGradePercent)) : 0;
    const denominator = upShare + downShare;
    if (denominator > 0) return ((upShare * upGrade) - (downShare * downGrade)) / denominator;
  }
  const raw = finite(course.gradePercent) ? Number(course.gradePercent) : null;
  if (raw !== null) {
    const direction = String(course.gradeDirection || "").toUpperCase();
    return direction === "DOWNHILL" ? -Math.abs(raw) : direction === "UPHILL" ? Math.abs(raw) : raw;
  }
  return null;
}

function formatAverageGrade(record = {}) {
  const grade = signedGradeFromRecord(record);
  if (!Number.isFinite(grade)) return "—";
  if (Math.abs(grade) < 0.05) return "0.0%";
  return `${grade > 0 ? "+" : ""}${formatNumber(grade, 1)}%`;
}

function primarySurfaceLabel(record = {}) {
  const course = record.course || {};
  const candidates = [
    ["pavedPercent", "舗装路"],
    ["trackPercent", "トラック"],
    ["treadmillPercent", "トレッドミル"],
    ["soilPercent", "土"],
    ["trailPercent", "トレイル"],
    ["naturalGrassPercent", "天然芝"],
    ["artificialTurfPercent", "人工芝"],
    ["sandPercent", "砂"],
  ].map(([key, label]) => ({ label, value: finite(course[key]) ? Number(course[key]) : 0 }));
  const best = candidates.sort((a, b) => b.value - a.value)[0];
  return best?.value > 0 ? best.label : (course.name || "—");
}

function formatDuration(record = {}) {
  const minutes = Number(record.durationMinutes);
  if (!(minutes > 0)) return "—";
  const totalSeconds = Math.round(minutes * 60);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function previousComparableItem(items, selected) {
  if (!selected) return null;
  const sorted = [...items].sort((left, right) => recordChronology(left.experience, right.experience));
  const index = sorted.findIndex((item) => item.experience.record.id === selected.experience.record.id);
  return index > 0 ? sorted[index - 1] : null;
}

function conditionDifferenceRows(selected, previous) {
  if (!selected || !previous) return [];
  const currentRecord = selected.experience.record;
  const previousRecord = previous.experience.record;
  return [
    ["平均ペース", formatPacePerKm(previousRecord), formatPacePerKm(currentRecord)],
    ["平均の坂の傾き", formatAverageGrade(previousRecord), formatAverageGrade(currentRecord)],
    ["主な路面", primarySurfaceLabel(previousRecord), primarySurfaceLabel(currentRecord)],
  ];
}

function renderFocusedPeriodTabs(workspace) {
  return `<div class="history-focused-period"><strong>期間</strong><nav aria-label="表示期間">${[7, 28, 90, 180].map((period) => `<a class="${workspace.period === period ? "is-current" : ""}" href="${escapeHtml(buildHref({ view: "trends", metric: "region", period, anchorDate: workspace.endDate, regionId: workspace.regionId, display: workspace.regionalDisplay }))}"${workspace.period === period ? ' aria-current="page"' : ""}>${period}日</a>`).join("")}</nav></div>`;
}

function renderFocusedRegionPicker(workspace) {
  return `<details class="history-focused-region-picker"><summary>部位を変更</summary><form id="regional-history-form"><input type="hidden" name="view" value="trends"><input type="hidden" name="metric" value="region"><input type="hidden" name="period" value="${workspace.period}"><input type="hidden" name="anchorDate" value="${escapeHtml(workspace.endDate)}"><label class="field"><span>表示する部位</span><select name="regionId">${REGIONS.map((region) => `<option value="${escapeHtml(region.id)}"${workspace.regionId === region.id ? " selected" : ""}>${escapeHtml(bodyRegionFormalName(region.id, region.name))}</option>`).join("")}</select></label><button class="button button--primary" type="submit">表示する</button></form></details>`;
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
function historyNavButton(label, small, href, active=false) {
  return `<button type="button" class="${active?"active":""}" data-history-href="${escapeHtml(href)}" aria-pressed="${active}"><span>${escapeHtml(label)}</span><small>${escapeHtml(small)}</small></button>`;
}
function historyChartSvg(items, workspace, desktop = false) {
  if (!items.length) return '<text x="360" y="160" text-anchor="middle" class="chart-axis-label">比較できる記録がありません</text>';
  const rows=items.map((item,index)=>({item,index,ratio:referenceRatioPercent(item),difference:referenceRatioPercent(item)-100}));
  const width=720,height=320,left=54,right=20,top=42,bottom=62,plotW=646,plotH=216;
  const pointLeft=desktop?86:left,pointRight=desktop?width-right-16:width-right,pointW=pointRight-pointLeft;
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
  return `<aside class="selected-card selected-focus-card" aria-live="polite"><div class="selected-focus-hero"><div class="selected-focus-heading"><span aria-hidden="true" class="selected-point"></span><div><small>選択中の記録</small><h2 class="${weekendClass(record.date)}">${escapeHtml(formatLocalDate(record.date))}</h2></div></div><span class="selected-weekday ${weekendClass(record.date)}">${escapeHtml(weekdayLabel(record.date))}</span><div class="selected-focus-value"><span>部位の目安</span><strong>${escapeHtml(formatNumber(value,1))}</strong></div></div><div class="selected-focus-body"><dl class="selected-facts selected-facts-compact"><div><dt>基準からの差</dt><dd>${difference>=0?"+":""}${escapeHtml(formatNumber(difference,0))}%</dd></div><div><dt>距離</dt><dd>${escapeHtml(formatNumber(selected.referenceDistanceKm,2))} km</dd></div><div><dt>コース</dt><dd>${escapeHtml(record.course?.name||"未設定")}</dd></div></dl><div class="selected-action-zone"><a class="result-link selected-result-link" href="#/result?recordId=${encodeURIComponent(record.id)}"><span><small>この記録の詳細</small><strong>結果を開く</strong></span><i>›</i></a><a class="button button--text" href="#/interpretation-room?recordId=${encodeURIComponent(record.id)}&origin=history&regionId=${encodeURIComponent(workspace.regionId)}">この記録の結果を整理する</a></div></div></aside>`;
}
function historyComparisonTable(items, workspace) {
  if(!items.length)return "";
  let prev=null;
  return `<details class="records-disclosure" open><summary><span><strong>比較記録</strong><small>${items.length}件の数値を確認</small></span><i>⌄</i></summary><div class="table-scroll"><table><thead><tr><th>日付</th><th>距離</th><th>目安</th><th>基準からの差</th><th>コース</th></tr></thead><tbody>${items.map((item)=>{const ratio=referenceRatioPercent(item);const diff=ratio-100;const record=item.experience.record;const row=`<tr><td><a class="${weekendClass(record.date)}" href="${escapeHtml(trendSelectionHref(workspace,item))}">${escapeHtml(shortDateLabel(record.date))} (${escapeHtml(weekdayLabel(record.date))})</a></td><td>${escapeHtml(formatNumber(item.referenceDistanceKm,2))} km</td><td>${escapeHtml(formatNumber(item.conditionIndexExact,1))}</td><td>${diff>=0?"+":""}${escapeHtml(formatNumber(diff,0))}%</td><td>${escapeHtml(record.course?.name||"未設定")}</td></tr>`;prev=item;return row;}).join("")}</tbody></table></div></details>`;
}
function historyRegionPicker(workspace) {
  return `<div class="sheet-overlay" data-history-region-overlay hidden><section class="region-sheet" role="dialog" aria-modal="true" aria-labelledby="history-region-title"><div class="grip"></div><div class="sheet-head"><div><p class="eyebrow">BODY REGION</p><h2 id="history-region-title">表示する部位</h2></div><button type="button" data-action="close-history-region-picker" aria-label="閉じる">×</button></div><div class="region-options">${REGIONS.map((region)=>`<button type="button" class="region-option${region.id===workspace.regionId?" active":""}" data-history-region-id="${escapeHtml(region.id)}" aria-pressed="${region.id===workspace.regionId}"><span class="locator">${regionLocatorSvg(region.id)}</span><span><strong>${escapeHtml(bodyRegionFormalName(region.id,region.name))}</strong><small>${escapeHtml(regionViewLabel(region.id))}</small></span></button>`).join("")}</div></section></div>`;
}
function historyCompareView(workspace) {
  const allDirect=workspace.trendRows.filter((item)=>item.compatibility.directDeltaAllowed&&finite(item.conditionIndexExact)).sort((a,b)=>recordChronology(a.experience,b.experience));const items=allDirect.slice(-8);const selected=items.find((item)=>item.experience.record.id===workspace.anchor?.experience?.record?.id)||items.at(-1)||null;const previous=previousComparableItem(items,selected);const regionName=bodyRegionFormalName(workspace.region.id,workspace.region.name);const other=workspace.trendRows.filter((item)=>item.row&&!item.compatibility.directDeltaAllowed).length;
  if(!items.length){
    const recordsHref=buildHref({view:"records",period:workspace.period,anchorDate:workspace.endDate,regionId:workspace.regionId});
    return `<section class="history-view history-view--compare"><section class="comparison-head"><div class="comparison-title comparison-title--plain"><div><small>BODY REGION / HISTORY</small><h2>同じ部位を比べる</h2></div></div><button class="region-picker-trigger" type="button" data-action="open-history-region-picker"><span aria-hidden="true" class="region-picker-locator">${regionLocatorSvg(workspace.regionId)}</span><span class="region-picker-copy"><small>表示する部位</small><strong>${escapeHtml(regionName)}</strong><em>${escapeHtml(regionViewLabel(workspace.regionId))}</em></span><i>変更</i></button></section><div class="history-toolbar"><div class="period-control"><span>期間</span><div role="group">${[7,28,90,180].map((period)=>`<button type="button" class="${workspace.period===period?"active":""}" data-history-href="${escapeHtml(buildHref({view:"trends",metric:"region",period,anchorDate:workspace.endDate,regionId:workspace.regionId,display:workspace.regionalDisplay}))}">${period}日</button>`).join("")}</div></div><div class="compare-count"><small>比較できる記録</small><strong>0件</strong></div></div><div class="empty-records history-comparison-empty"><small>BODY REGION</small><strong>この条件で比較できる記録はありません</strong><p>${other?"保存記録はありますが、同じ部位・同じ計算方法・同じ保存時の仕組みとして比較できません。":"期間を広げるか、別の部位を選んで確認してください。"}</p><a href="${escapeHtml(recordsHref)}">保存記録を見る</a></div>${other?`<aside class="comparison-side"><details class="excluded-details" open><summary>比較対象外の記録 ${other}件</summary><p>保存記録は残したまま、この比較には含めていません。</p></details></aside>`:""}<p class="screen-footnote">※ 数値の上昇・低下を、状態の良し悪し・安全性・けがの危険性として判定しません。</p>${historyRegionPicker(workspace)}</section>`;
  }
  return `<section class="history-view history-view--compare"><section class="comparison-head"><div class="comparison-title comparison-title--plain"><div><small>BODY REGION / HISTORY</small><h2>同じ部位を比べる</h2></div></div><button class="region-picker-trigger" type="button" data-action="open-history-region-picker"><span aria-hidden="true" class="region-picker-locator">${regionLocatorSvg(workspace.regionId)}</span><span class="region-picker-copy"><small>表示する部位</small><strong>${escapeHtml(regionName)}</strong><em>${escapeHtml(regionViewLabel(workspace.regionId))}</em></span><i>変更</i></button></section><div class="history-toolbar"><div class="period-control"><span>期間</span><div role="group">${[7,28,90,180].map((period)=>`<button type="button" class="${workspace.period===period?"active":""}" data-history-href="${escapeHtml(buildHref({view:"trends",metric:"region",period,anchorDate:workspace.endDate,regionId:workspace.regionId,display:workspace.regionalDisplay}))}">${period}日</button>`).join("")}</div></div><div class="compare-count"><small>比較できる記録</small><strong>${items.length}件</strong></div></div><div class="comparison-layout"><section class="chart-card"><div class="chart-card-head"><div><h2>保存記録の推移</h2></div><div class="display-toggle" role="group" aria-label="グラフ表示"><button type="button" class="${workspace.regionalDisplay==="ratio"?"active":""}" data-history-href="${escapeHtml(buildHref({view:"trends",metric:"region",period:workspace.period,anchorDate:workspace.endDate,regionId:workspace.regionId,display:"ratio",recordId:selected?.experience.record.id||""}))}">基準との比率</button><button type="button" class="${workspace.regionalDisplay==="difference"?"active":""}" data-history-href="${escapeHtml(buildHref({view:"trends",metric:"region",period:workspace.period,anchorDate:workspace.endDate,regionId:workspace.regionId,display:"difference",recordId:selected?.experience.record.id||""}))}">基準からの差</button></div></div><div class="chart-wrap"><svg class="chart-svg chart-svg--mobile" role="img" viewBox="0 0 720 320" aria-label="${escapeHtml(regionName)}の保存記録の推移">${historyChartSvg(items,workspace)}</svg><svg class="chart-svg chart-svg--pc" role="img" viewBox="0 0 720 320" aria-label="${escapeHtml(regionName)}の保存記録の推移">${historyChartSvg(items,workspace,true)}</svg></div><div class="chart-legend"><span><i class="legend-current"></i>選択中</span><span><i class="legend-line"></i>比較できる記録</span><span class="weekend-key">土日</span></div></section>${historySelectedCard(selected,previous,workspace)}${historyComparisonTable(items,workspace)}<aside class="comparison-side"><details class="condition-details"><summary>比較条件</summary><div><p>同じ部位・同じ計算方法・同じ保存時の仕組みで比べられる記録だけをグラフに含めます。</p><p>距離は別の走行事実です。別部位どうしを順位付けしません。</p></div></details>${other?`<details class="excluded-details"><summary>比較対象外の記録 ${other}件</summary><p>保存記録は残したまま、この比較線には含めていません。</p></details>`:""}</aside></div><p class="screen-footnote">※ 数値の上昇・低下を、状態の良し悪し・安全性・けがの危険性として判定しません。</p>${historyRegionPicker(workspace)}</section>`;
}
function historyRecordView(workspace,context) {
  const activity=String(context.parameters.get("activityType")||"all"),query=String(context.parameters.get("query")||"").trim().toLocaleLowerCase("ja-JP");const rows=workspace.rows.filter((item)=>activityMatches(item.experience,activity)).filter((item)=>!query||searchText(item).includes(query)).sort((a,b)=>recordChronology(b.experience,a.experience));
  return `<section class="history-view history-view--records"><section class="records-head"><div class="comparison-title comparison-title--plain"><div><small>SAVED RECORDS</small><h2>保存記録を探す</h2></div></div><span class="record-total">${rows.length}件</span></section><form class="record-filters" id="history-record-filter-form"><input type="hidden" name="view" value="records"><input type="hidden" name="period" value="${workspace.period}"><input type="hidden" name="anchorDate" value="${escapeHtml(workspace.endDate)}"><input type="hidden" name="regionId" value="${escapeHtml(workspace.regionId)}"><label><span>記録内を検索</span><input name="query" type="search" value="${escapeHtml(context.parameters.get("query")||"")}" placeholder="日付、コース、メモ"></label><div class="type-toggle" role="group" aria-label="記録の種類">${[["all","すべて"],["run","走行"],["rest","休養"]].map(([value,label])=>`<button type="button" class="${activity===value?"active":""}" data-history-record-type="${value}" aria-pressed="${activity===value}">${label}</button>`).join("")}</div></form><div class="record-list">${rows.length?rows.map((item)=>{const r=item.experience.record;return`<article class="record-item"><div class="record-item-head"><time class="${weekendClass(r.date)}" datetime="${escapeHtml(r.date)}">${escapeHtml(formatLocalDate(r.date))}（${escapeHtml(weekdayLabel(r.date))}）</time><span class="record-kind${r.activityType==="rest"?" rest":""}">${r.activityType==="rest"?"休養":"走行"}</span></div><h3>${escapeHtml(formatActivitySummary(r))}</h3><p>${escapeHtml(r.course?.name||"コース名なし")}${r.memo?`・${escapeHtml(r.memo)}`:""}</p><div class="record-actions"><a href="#/result?recordId=${encodeURIComponent(r.id)}">結果を見る</a><button type="button" data-action="delete-history-record" data-record-id="${escapeHtml(r.id)}" data-record-label="${escapeHtml(`${formatLocalDate(r.date)}の記録`)}">削除</button></div></article>`;}).join(""):'<div class="empty-records empty-records--filtered"><strong>条件に合う記録はありません</strong><p>検索語または記録の種類を変更してください。</p></div>'}</div></section>`;
}
export function renderHistoryScreen({services,context}) {
  const workspace=buildWorkspace(services,context);
  if(!workspace)return `<div class="screen screen--history screen-layout screen-layout--history"><section class="page-head"><div><p class="eyebrow">HISTORY</p><h1>履歴</h1><p>過去の記録を探し、同じ意味で比べられる記録を比較します。</p></div></section><section class="history-view"><div class="empty-records empty-records--initial"><small>SAVED RECORDS</small><strong>保存した記録はまだありません</strong><p>走行または休養を保存すると、ここから記録を探して比較できます。</p><a href="#/record-input">記録を始める</a></div></section></div>`;
  const compare=workspace.view==="trends";
  return `<div class="screen screen--history screen-layout screen-layout--history"><section class="page-head"><div><p class="eyebrow">HISTORY</p><h1>履歴</h1><p>過去の記録を探し、同じ意味で比べられる記録を比較します。</p></div></section><p class="visually-hidden">各部位では、その部位自身の基準を100として比べます。比率はその基準に対する値です。研究上、この比較方法をReference-100と呼びます。走行距離は別の記録事実です。走行距離そのものを部位の数値へ掛けません。100は安全値・正常値・初心者平均ではありません。</p><nav class="history-mode" aria-label="履歴の表示">${historyNavButton("記録を探す","日付・走行内容から確認",buildHref({view:"records",period:workspace.period,anchorDate:workspace.endDate}),!compare)}${historyNavButton("部位を比較","同じ部位の変化を見る",buildHref({view:"trends",metric:"region",period:workspace.period,anchorDate:workspace.endDate,regionId:workspace.regionId,display:workspace.regionalDisplay}),compare)}</nav>${compare?historyCompareView(workspace):historyRecordView(workspace,context)}${services.workflows.history.loadUndoEntry()?'<div class="history-undo" role="status"><p>直前に削除した記録を元に戻せます。</p><button type="button" data-action="undo-history-delete">削除を元に戻す</button></div>':""}</div>`;
}

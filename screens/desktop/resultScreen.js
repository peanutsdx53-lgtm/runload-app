import { escapeHtml } from "../../ui/commonComponents.js";
import { formatLocalDate, formatLocalTime } from "../../ui/recordPresentation.js";
import { SELF_UNDERSTANDING_BODY_AREA_TO_DISPLAY_REGION } from "../../core/selfUnderstandingCore.js";
import { bodyRegionFormalName } from "../../core/appCore.js";
import { officialRofJDescriptor } from "../../core/rofJCore.js";
import {
  bodyMap,
  finite,
  changeMagnitudeGlyph,
  direction,
  fatigueSnapshot,
  fmt,
  formatPace,
  modelCurrent,
  recordChronology,
  position,
  prepareResultScreenState,
  recordMomentLabel,
  signatureFor,
  signaturesComparable,
  regionRows,
  renderEmptyResultScreen,
  rowInfo,
  signed,
  VIEWS,
} from "../resultScreen.js";

const FRONT_LOWER_DESKTOP = "M135 382 C140 390 145 394 150 394 C155 394 160 390 165 382 L166 402 C166 410 159 416 150 416 C141 416 134 410 134 402 Z";

function renderDesktopRegionPathClass({ id, viewKey }) {
  return id === "BA-DISP-024" && viewKey === "front" ? " region-path--front-lower-shape" : "";
}

function renderDesktopAdditionalRegionPath({ id, viewKey, state, selectedClass, unavailableStyle }) {
  if (id !== "BA-DISP-024" || viewKey !== "front") return "";
  return `<path class="region-path region-path--pc-shape${selectedClass}" data-direction="${state}" data-region-id="${id}"${unavailableStyle} d="${FRONT_LOWER_DESKTOP}" aria-hidden="true"></path>`;
}


function pcRegionGroups(infos, selectedId) {
  const viewByRegion = new Map(VIEWS.flatMap((view) => view.paths.map(([id]) => [id, view.title])));
  return `<div class="pc-region-matrix pc-region-matrix--summary" role="list" aria-label="12部位の数値">${infos.map((info) => {
    const row = info.row;
    const name = bodyRegionFormalName(row.regionId, row.regionName || row.regionId);
    const current = finite(row.value) ? fmt(row.value, 1) : "—";
    const delta = finite(info.delta) ? signed(info.delta, 1) : "—";
    const state = direction(row.value);
    const selected = row.regionId === selectedId ? " is-selected" : "";
    const stateLabel = state === "above" ? "基準より上" : state === "below" ? "基準より下" : state === "reference" ? "基準付近" : "表示なし";
    const changeState = !finite(info.delta) ? "unavailable" : Number(info.delta) > 0 ? "up" : Number(info.delta) < 0 ? "down" : "same";
    const changeLabel = changeState === "up" ? "前回より上" : changeState === "down" ? "前回より下" : changeState === "same" ? "前回と同じ" : "前回比較なし";
    const viewLabel = viewByRegion.get(row.regionId) || "部位";
    const overviewPos = state === "above" ? 76 : state === "below" ? 24 : 50;
    const overviewMeter = finite(row.value)
      ? `<span class="pc-mini-meter" style="--pos:${overviewPos}%" aria-hidden="true"><i></i><b></b><small>100</small></span>`
      : `<span class="pc-mini-meter is-unavailable" aria-hidden="true"><i></i><small>100</small></span>`;
    const previousValue = finite(info.prev) ? fmt(info.prev, 1) : "—";
    const previousState = finite(info.prev) ? direction(info.prev) : "unavailable";
    const magnitudeGlyph = changeMagnitudeGlyph(info.delta);
    const changeFlow = finite(info.delta)
      ? `<span class="pc-change-flow" data-change-direction="${changeState}"><span class="pc-change-flow__point" data-direction="${previousState}"><i aria-hidden="true"></i><span><small>前回</small><strong>${escapeHtml(previousValue)}</strong></span></span><span class="pc-change-flow__arrow" aria-hidden="true">→</span><span class="pc-change-flow__point is-current" data-direction="${state}"><i aria-hidden="true"></i><span><small>今回</small><strong>${escapeHtml(current)}</strong></span></span></span><span class="pc-change-delta" data-change-direction="${changeState}" aria-label="前回からの変化 ${escapeHtml(delta)}"><b>${magnitudeGlyph}</b><strong>${escapeHtml(delta)}</strong><small>前回から</small></span>`
      : `<span class="pc-change-flow is-unavailable"><span class="pc-change-flow__point" data-direction="unavailable"><i aria-hidden="true"></i><span><small>前回</small><strong>—</strong></span></span><span class="pc-change-flow__arrow" aria-hidden="true">→</span><span class="pc-change-flow__point is-current" data-direction="${state}"><i aria-hidden="true"></i><span><small>今回</small><strong>${escapeHtml(current)}</strong></span></span></span><span class="pc-change-delta is-unavailable"><strong>比較なし</strong></span>`;
    return `<button type="button" class="pc-region-tile pc-region-tile--summary${selected}" data-direction="${state}" data-change-direction="${changeState}" data-region-id="${escapeHtml(row.regionId)}" data-pc-region-select="${escapeHtml(row.regionId)}" aria-pressed="${row.regionId === selectedId ? "true" : "false"}" role="listitem"><span class="pc-region-summary__head"><small>${escapeHtml(viewLabel)}</small><strong>${escapeHtml(name)}</strong></span><span class="pc-region-summary__body pc-region-summary__body--overview" data-pc-summary-view="overview"><span class="pc-region-summary__value"><b>${escapeHtml(current)}</b><em>${escapeHtml(stateLabel)}</em></span>${overviewMeter}</span><span class="pc-region-summary__body pc-region-summary__body--change" data-pc-summary-view="change" hidden>${changeFlow}</span></button>`;
  }).join("")}</div>`;
}

function shortDateLabel(value = "") {
  const parts = String(value).split("-");
  if (parts.length !== 3) return String(value);
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

function historyAxisLabel(point, points = []) {
  const record = point?.experience?.record || {};
  const sameDayCount = points.filter((item) => String(item?.experience?.record?.date || "") === String(record.date || "")).length;
  const time = sameDayCount > 1 ? formatLocalTime(record.createdAt) : "";
  return `${shortDateLabel(record.date)}${time ? ` ${time}` : ""}`;
}

function comparableRegionHistory(resultRecord, experiences, regionId) {
  const signature = signatureFor(resultRecord, regionId);
  if (!signature) return [];
  const currentExperience = experiences.find((item) => item.regionalV2ResultRecord?.id === resultRecord?.id);
  const currentRecord = currentExperience?.record || null;
  return experiences
    .filter((experience) => !currentRecord || recordChronology(experience?.record || {}, currentRecord) <= 0)
    .map((experience) => {
      const record = experience?.regionalV2ResultRecord;
      const rows = record?.result?.regions || experience?.regionalV2Result?.regions || [];
      const row = rows.find((candidate) => candidate.regionId === regionId);
      return { experience, row, signature: signatureFor(record, regionId) };
    }).filter((item) => item.row && signaturesComparable(signature, item.signature) && finite(item.row.value))
    .sort((a, b) => recordChronology(a.experience?.record || {}, b.experience?.record || {}))
    .slice(-4);
}

function pcHistoryGraphic(points = []) {
  if (!points.length) return `<div class="pc-focus-empty">比較できる過去記録はありません。</div>`;
  const values = points.map((point) => Number(point.row.value));
  const scaleValues = values.concat([100]);
  let minValue = Math.min(...scaleValues);
  let maxValue = Math.max(...scaleValues);
  if (maxValue - minValue < 20) { minValue -= 10; maxValue += 10; }
  const width = 560, height = 148, left = 34, right = 18, top = 28, bottom = 34;
  const plotW = width - left - right, plotH = height - top - bottom;
  const xFor = (index) => points.length === 1 ? left + plotW / 2 : left + (plotW * index / (points.length - 1));
  const yFor = (value) => top + (maxValue - Number(value)) / (maxValue - minValue) * plotH;
  const coords = points.map((point, index) => [xFor(index), yFor(point.row.value)]);
  const path = coords.map(([x,y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const baselineY = yFor(100);
  const baselineLabelY = Math.max(14, baselineY - 7);
  return `<svg class="pc-focus-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="選択部位の直近記録の推移"><line class="pc-focus-chart__baseline" x1="${left}" x2="${width-right}" y1="${baselineY.toFixed(1)}" y2="${baselineY.toFixed(1)}"></line><text class="pc-focus-chart__baseline-label" x="${left + 2}" y="${baselineLabelY.toFixed(1)}">基準100</text><path class="pc-focus-chart__line" d="${path}"></path>${coords.map(([x,y], index) => {
    const valueY = Math.max(15, y - 10);
    return `<circle class="pc-focus-chart__point${index === coords.length - 1 ? " is-current" : ""}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${index === coords.length - 1 ? 5.4 : 4}"></circle><text class="pc-focus-chart__value${index === coords.length - 1 ? " is-current" : ""}" x="${x.toFixed(1)}" y="${valueY.toFixed(1)}" text-anchor="middle">${escapeHtml(fmt(points[index].row.value, 1))}</text>`;
  }).join("")}${points.map((point,index) => `<text class="pc-focus-chart__date" x="${xFor(index).toFixed(1)}" y="${height-8}" text-anchor="middle">${escapeHtml(historyAxisLabel(point, points))}</text>`).join("")}</svg>`;
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
  const previousGlyph = changeMagnitudeGlyph(info.delta);
  const currentPos = finite(row.value) ? position(row.value) : 50;
  return `<div class="pc-detail-panel${row.regionId === selectedId ? " is-active" : ""}" data-pc-detail-region="${escapeHtml(row.regionId)}" data-direction="${state}"${row.regionId === selectedId ? "" : " hidden"}><header><div><small>選択中</small><h3>${escapeHtml(name)}</h3></div><span>${escapeHtml(stateLabel)}</span></header><div class="pc-detail-story"><div class="pc-detail-now"><span>今回と基準</span><div class="pc-detail-now__value"><strong>${escapeHtml(current)}</strong></div><div class="pc-focus-baseline pc-focus-baseline--large" style="--pos:${currentPos}%;"><i></i><b></b><small>基準100</small></div><p>この部位自身の基準との差 <b>${escapeHtml(baselineDelta)}</b></p></div><div class="pc-detail-previous"><span>前回から</span><div class="pc-detail-previous__flow"><div><small>前回</small><strong>${escapeHtml(previous)}</strong></div><div class="pc-detail-previous__arrow"><i></i><b><span aria-hidden="true">${escapeHtml(previousGlyph)}</span>${escapeHtml(previousDelta)}</b></div><div class="is-current"><small>今回</small><strong>${escapeHtml(current)}</strong></div></div><p>${info.previous ? `${escapeHtml(recordMomentLabel(info.previous.experience.record))} の同じ部位と比較` : "比較できる前回記録はありません。"}</p></div><div class="pc-detail-history"><div class="pc-detail-history__heading"><span>この部位の推移</span><small>同日は記録時刻順・破線＝基準100</small></div>${pcHistoryGraphic(history)}</div></div></div>`;
}

function renderPcInsights(resultRecord, allExperiences, infos, selectedInfo) {
  if (!selectedInfo) return `<section class="pc-result-focus"><div class="pc-focus-empty">部位の数値を表示できません。</div></section>`;
  const selectedId = selectedInfo.row.regionId;
  return `<section class="pc-result-focus pc-result-insights pc-result-insights--history" aria-label="選択部位の詳細と過去推移"><div class="pc-detail-stack" data-pc-detail-stack>${infos.map((info) => renderPcDetailPanel(resultRecord, allExperiences, info, selectedId)).join("")}</div></section>`;
}

function renderPcFatigue(snapshot) {
  const prePos = finite(snapshot.pre) ? Math.max(0, Math.min(100, snapshot.pre * 10)) : 0;
  const postPos = finite(snapshot.post) ? Math.max(0, Math.min(100, snapshot.post * 10)) : 0;
  const descriptor = finite(snapshot.post) ? officialRofJDescriptor(snapshot.post) : "";
  return `<section class="pc-result-fatigue" aria-label="運動前後の疲労度"><header><div><small>疲労感</small><h3>運動前後の疲労度</h3></div></header><div class="pc-fatigue-journey"><div class="pc-fatigue-node is-pre"><small>運動前</small><strong>${finite(snapshot.pre) ? escapeHtml(fmt(snapshot.pre,0)) : "—"}</strong></div><div class="pc-fatigue-bridge"><span></span><div><small>変化</small><strong>${finite(snapshot.delta) ? escapeHtml(signed(snapshot.delta,0)) : "—"}</strong></div><i>→</i></div><div class="pc-fatigue-node is-post"><small>運動後</small><strong>${finite(snapshot.post) ? escapeHtml(fmt(snapshot.post,0)) : "—"}</strong></div></div><div class="pc-fatigue-scale"><span class="pc-fatigue-scale__range" style="--pre:${prePos}%;--post:${postPos}%"></span>${finite(snapshot.pre) ? `<i class="pc-fatigue-scale__point is-pre" style="left:${prePos}%"><b>前</b></i>` : ""}${finite(snapshot.post) ? `<i class="pc-fatigue-scale__point is-post" style="left:${postPos}%"><b>後</b></i>` : ""}</div><div class="pc-fatigue-scale__axis"><span>0</span><span>5</span><span>10</span></div>${descriptor ? `<p data-rof-result-guidance>${escapeHtml(descriptor)}</p>` : ""}</section>`;
}

function renderPcRestResultConsole({ record, feedback = null }) {
  const recordTime = formatLocalTime(record.createdAt);
  const memo = String(record?.reflectionContext?.postRunReflection || "").trim();
  const observations = Array.isArray(feedback?.bodyAreaObservations)
    ? feedback.bodyAreaObservations.filter((item) => Number(item?.intensity || 0) >= 1)
    : [];
  const observationLabel = observations.length ? `${observations.length}件` : "なし";
  return `<section class="pc-result-console pc-result-console--rest" aria-label="休養記録の結果">
    <header class="pc-result-summary pc-result-summary--rail pc-rest-result-summary">
      <div class="pc-result-session">
        <div class="pc-result-date"><small>記録</small><strong>${escapeHtml(formatLocalDate(record.date))}</strong>${recordTime ? `<span>記録時刻 ${escapeHtml(recordTime)}</span>` : ""}</div>
        <div class="pc-result-run-facts"><span class="pc-rest-result-tag"><b>休養</b></span></div>
      </div>
    </header>
    <section class="pc-rest-result-card">
      <div class="pc-rest-result-card__main"><small>休養記録</small><h2>休養日の記録</h2><p>${memo ? escapeHtml(memo) : "メモなし"}</p></div>
      <dl class="pc-rest-result-facts">
        <div><dt>身体の記録</dt><dd>${escapeHtml(observationLabel)}</dd></div>
      </dl>
    </section>
    <nav class="pc-result-next" aria-label="休養記録から次へ">
      <a class="pc-result-next__primary" href="#/interpretation-room?recordId=${encodeURIComponent(record.id)}&origin=result"><span><small>次へ</small><strong>今回を見比べる</strong></span><i>›</i></a>
      <a href="#/history?view=records&recordId=${encodeURIComponent(record.id)}"><span><small>履歴</small><strong>履歴を見る</strong></span><i>›</i></a>
    </nav>
  </section>`;
}

function renderPcResultConsole({ services, record, resultRecord, allExperiences, feedback = null, savedInterpretation = null }) {
  if (record.activityType === "rest") return renderPcRestResultConsole({ record, feedback });
  if (!modelCurrent(resultRecord) || record.activityType !== "run") return "";
  const infos = regionRows(resultRecord).map((row, index) => rowInfo(resultRecord, allExperiences, row, index));
  const availableCount = infos.filter((info) => finite(info.row.value)).length;
  const comparableCount = infos.filter((info) => finite(info.delta)).length;
  const observations = Array.isArray(feedback?.bodyAreaObservations) ? [...feedback.bodyAreaObservations] : [];
  const observedRegionId = observations
    .filter((item) => Number(item?.intensity) >= 1)
    .sort((a, b) => Number(b?.intensity || 0) - Number(a?.intensity || 0))
    .map((item) => SELF_UNDERSTANDING_BODY_AREA_TO_DISPLAY_REGION[String(item?.areaId || "")] || "")
    .find(Boolean) || "";
  const selectedInfo = infos.find((info) => info.row.regionId === observedRegionId)
    || infos.filter((info) => info.focus).sort((a, b) => a.focusPriority - b.focusPriority || a.index - b.index)[0]
    || infos.find((info) => finite(info.row.value)) || infos[0];
  const fatigue = fatigueSnapshot(services, record);
  const recordTime = formatLocalTime(record.createdAt);
  const courseName = String(record.course?.name || "コース未設定");
  const fatigueValue = finite(fatigue.delta) ? escapeHtml(signed(fatigue.delta,0)) : "未記録";
  const interpretationCta = "今回を見比べる";
  return `<section class="pc-result-console" aria-label="今回の結果"><header class="pc-result-summary pc-result-summary--rail"><div class="pc-result-session"><div class="pc-result-date"><small>記録</small><strong>${escapeHtml(formatLocalDate(record.date))}</strong>${recordTime ? `<span>記録時刻 ${escapeHtml(recordTime)}</span>` : ""}</div><div class="pc-result-run-facts" aria-label="今回の走行概要"><span><b>${escapeHtml(fmt(record.distanceKm,2))}</b> km</span><span><b>${escapeHtml(fmt(record.durationMinutes,1))}</b> 分</span><span><b>${escapeHtml(formatPace(record))}</b> /km</span><em title="${escapeHtml(courseName)}">${escapeHtml(courseName)}</em></div></div><div class="pc-result-signals" aria-label="今回の結果サイン"><div><strong>${availableCount}</strong><span> / 12</span><small>数値あり</small></div><i></i><div><strong>${comparableCount}</strong><span> / 12</span><small>前回比較可</small></div><i></i><div><strong class="${finite(fatigue.delta) ? "" : "is-text"}">${fatigueValue}</strong><span></span><small>疲労変化</small></div></div></header><section class="pc-result-main"><div class="pc-result-body"><header><div><small>身体の部位</small><h2>身体の部位から見る</h2></div></header><ul class="pc-result-legend" aria-label="身体図の色"><li><i class="above"></i>基準より上</li><li><i class="reference"></i>基準付近</li><li><i class="below"></i>基準より下</li><li><i class="unavailable"></i>表示なし</li></ul><div class="body-map pc-result-body-map" aria-label="前面・後面・足裏の12部位図">${bodyMap(resultRecord, infos, "pc", selectedInfo?.row?.regionId || "", { renderPathClass: renderDesktopRegionPathClass, renderAdditionalRegionPath: renderDesktopAdditionalRegionPath })}</div></div><div class="pc-result-numbers"><header><div><small>12部位</small><h2>12部位を見渡す</h2></div><div class="pc-summary-controls"><span>表示</span><div role="group" aria-label="12部位の表示"><button type="button" class="is-active" data-pc-summary-mode="overview" aria-pressed="true">全体</button><button type="button" data-pc-summary-mode="change" aria-pressed="false">変化</button></div></div></header><div class="pc-result-region-groups">${pcRegionGroups(infos, selectedInfo?.row?.regionId || "")}</div><p class="pc-summary-hint"><span data-pc-summary-hint="overview">枠線・値・点の色は人体図と同じ状態色です。各部位自身の基準100との関係を示し、部位同士の順位ではありません。</span><span data-pc-summary-hint="change" hidden>点の色は各時点の人体図と同じ状態色です。▲／▼は前回からの方向、数は変化幅を示します。</span></p></div></section><section class="pc-result-lower">${renderPcInsights(resultRecord, allExperiences, infos, selectedInfo)}${renderPcFatigue(fatigue)}</section><nav class="pc-result-next" aria-label="今回の結果から次へ"><a class="pc-result-next__primary" data-result-next-interpretation href="#/interpretation-room?recordId=${encodeURIComponent(record.id)}&origin=result&regionId=${encodeURIComponent(selectedInfo?.row?.regionId || "")}"><span><small>次へ</small><strong>${escapeHtml(interpretationCta)}</strong></span><i>›</i></a><a href="#/history?view=trends&metric=region&period=28&anchorDate=${encodeURIComponent(record.date)}&recordId=${encodeURIComponent(record.id)}"><span><small>履歴</small><strong>履歴を見る</strong></span><i>›</i></a></nav><p class="visually-hidden">12部位の目安は各部位自身の基準条件を100として比較した値です。100は安全値、正常値、初心者平均を意味しません。</p></section>`;
}



export function renderResultScreen(args) {
  const state = prepareResultScreenState(args);
  if (state.empty) return renderEmptyResultScreen();
  const { services, record, regionalV2ResultRecord, allExperiences, experience, savedInterpretation } = state;
  return `<div class="screen screen--result screen-layout screen-layout--result">${renderPcResultConsole({ services, record, resultRecord: regionalV2ResultRecord, allExperiences, feedback: experience.feedback, savedInterpretation })}</div>`;
}

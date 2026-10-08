import { escapeHtml } from "../../ui/commonComponents.js";
import { bodyRegionFormalName } from "../../core/appCore.js";
import { formatLocalDate } from "../../ui/recordPresentation.js";
import { buildRunFingerprint, renderRunFingerprintSvg } from "../../ui/mobileRunFingerprint.js";
import { consumeUnannouncedAchievements } from "../../ui/mobileAchievements.js";
import { renderRunCapsule, renderSameCourseComparison } from "../../ui/mobileInsights.js";
import {
  bodyMap,
  finite,
  fatigueSnapshot,
  fmt,
  modelCurrent,
  prepareResultScreenState,
  regionRows,
  renderEmptyResultScreen,
  renderFacts,
  renderFatigue,
  renderRunSummary,
  rowInfo,
  locatorSvg,
  position,
  signed,
} from "../resultScreen.js";


function renderMobileRegionPathClass({ id, viewKey }) {
  return id === "BA-DISP-024" && viewKey === "front" ? " region-path--mobile-shape" : "";
}

function regionRow(info) {
  const row = info.row;
  const name = bodyRegionFormalName(row.regionId, row.regionName || row.regionId);
  const current = finite(row.value) ? fmt(row.value, 1) : "—";
  const referenceDelta = finite(row.value) ? Number(row.value) - 100 : null;
  const previous = info.previous ? `前回 ${fmt(info.prev, 1)}` : "前回比較なし";
  const delta = finite(info.delta) ? `変化 ${signed(info.delta, 1)}` : "変化 —";
  const reference = finite(referenceDelta) ? `基準100との差 ${signed(referenceDelta, 1)}` : "数値なし";
  const scale = finite(row.value) ? `<span class="region-scale"><i style="--pos:${position(row.value)}%"></i></span>` : "";
  return `<div class="region-row" role="group" aria-label="${escapeHtml(name)}"><span class="locator">${locatorSvg(row.regionId)}</span><span class="region-copy"><strong>${escapeHtml(name)}</strong><small>${previous} ・ ${delta}</small></span><span class="region-metric"><strong>${current}</strong><small>${reference}</small></span>${scale}</div>`;
}

function regionList(infos, mode) {
  const sortedFocus = infos.filter((item) => item.focus).sort((a, b) => a.focusPriority - b.focusPriority || a.index - b.index);
  const rows = mode === "focus" ? sortedFocus : infos;
  const summary = mode === "focus" ? `<div class="focus-summary"><strong>絞り込み表示 ${sortedFocus.length} / 12部位</strong><span>基準100より上、または前回より上の部位です。危険度や重要度を示すものではありません。</span></div>` : "";
  if (!rows.length) return `${summary}<div class="focus-summary">この条件に当てはまる部位はありません。全12部位で確認できます。</div>`;
  return `${summary}${rows.map((item) => regionRow(item)).join("")}`;
}

function renderHighlights({ services, record, resultRecord, allExperiences }) {
  if (record.activityType === "rest") {
    return `<section class="mobile-result-highlights" aria-labelledby="mobile-result-highlights-title"><div class="mobile-result-highlights__head"><small>まず確認</small><h2 id="mobile-result-highlights-title">今回の記録</h2></div><div class="mobile-result-highlights__grid"><article><span>1</span><div><strong>休養として保存済み</strong><small>走行による12部位の数値は表示しません。</small></div></article><article><span>2</span><div><strong>本人の記録はそのまま残ります</strong><small>身体記録やメモがある場合は保存内容から確認できます。</small></div></article></div></section>`;
  }
  if (!modelCurrent(resultRecord)) return "";
  const infos = regionRows(resultRecord).map((row, index) => rowInfo(resultRecord, allExperiences, row, index));
  const availableCount = infos.filter((info) => Number.isFinite(Number(info.row.value))).length;
  const comparableCount = infos.filter((info) => Number.isFinite(Number(info.delta))).length;
  const fatigue = fatigueSnapshot(services, record);
  const items = [
    { title: "12部位の目安", detail: `${availableCount} / 12部位に数値があります。各部位自身の基準100と比べます。` },
    comparableCount > 0
      ? { title: "前回と比べられる", detail: `${comparableCount} / 12部位で、同じ意味の前回記録と比較できます。` }
      : { title: "今回が比較点", detail: "比較できる前回がない部位は、今回を次回以降の比較点として使えます。" },
  ];
  if (Number.isFinite(Number(fatigue.pre)) || Number.isFinite(Number(fatigue.post))) items.push({ title: "疲労感の記録", detail: `走る前 ${Number.isFinite(Number(fatigue.pre)) ? fmt(fatigue.pre, 0) : "—"} → 走った後 ${Number.isFinite(Number(fatigue.post)) ? fmt(fatigue.post, 0) : "—"}` });
  else items.push({ title: "次に1つ確認", detail: "結果を整理して、次回も見るテーマを1つ選べます。" });
  return `<section class="mobile-result-highlights" aria-labelledby="mobile-result-highlights-title"><div class="mobile-result-highlights__head"><small>今回の確認</small><h2 id="mobile-result-highlights-title">見るポイント</h2></div><div class="mobile-result-highlights__grid">${items.slice(0, 3).map((item, index) => `<article><span>${index + 1}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div></article>`).join("")}</div><p>数値は危険度や部位の順位を示すものではありません。</p></section>`;
}

function renderRegional(resultRecord, allExperiences, record) {
  if (!modelCurrent(resultRecord) || record.activityType !== "run") {
    return `<section class="regional-section" data-primary-regional-card><div class="section-heading"><span class="section-index">01</span><div><small>身体の部位</small><h2>身体の部位から見る</h2></div></div><div class="regional-shell"><div class="regional-topline"><p>12部位の目安</p><span>表示なし</span></div><p class="map-note">この記録には12部位の数値を表示できません。数値なしを0として扱いません。</p></div></section>`;
  }
  const infos = regionRows(resultRecord).map((row, index) => rowInfo(resultRecord, allExperiences, row, index));
  const focusCount = infos.filter((item) => item.focus).length;
  return `<section class="regional-section" data-primary-regional-card><div class="section-heading"><span class="section-index">01</span><div><small>身体の部位</small><h2>身体の部位から見る</h2></div></div><div class="regional-shell"><div class="regional-topline"><p>12部位の目安</p><span>部位ごとの表示</span></div><p class="mobile-body-map-hint"><strong>色のある部位をタップ</strong><span>100は「その部位自身の基準」です。部位同士の点数や順位ではありません。</span></p><ul class="direction-legend" aria-label="身体図の色"><li><i class="legend-dot above"></i><span>基準100より上</span></li><li><i class="legend-dot reference"></i><span>基準100付近</span></li><li><i class="legend-dot below"></i><span>基準100より下</span></li><li><i class="legend-dot unavailable"></i><span>表示なし</span></li></ul><div class="regional-layout"><div class="map-column"><div class="body-map" aria-label="前面・後面・足裏の12部位図">${bodyMap(resultRecord, infos, "mobile", "", { enhancedTouch: true, renderPathClass: renderMobileRegionPathClass })}</div><button class="mobile-region-trigger" type="button" data-action="open-result-region-sheet"><span><small>12部位比較</small><strong>数値・前回からの変化を見る</strong></span><i>›</i></button></div></div>${renderFacts(record)}<p class="visually-hidden">12部位の目安は、各部位自身の基準条件を100として比べます。各部位自身の基準条件を100として比べる表示です。走行距離は別の記録事実であり、距離そのものを数値へ掛けません。100は安全値・正常値・初心者平均ではありません。</p></div><div class="sheet-overlay" data-result-region-sheet hidden><section class="region-sheet" role="dialog" aria-modal="true" aria-labelledby="region-sheet-title"><div class="grip"></div><div class="sheet-head"><div><p class="eyebrow">部位ごとの表示</p><h2 id="region-sheet-title">12部位比較</h2></div><button type="button" class="app-utility-button" data-action="close-result-region-sheet" aria-label="閉じる"><span class="app-utility-button__close-symbol" aria-hidden="true">×</span></button></div><div class="sheet-tabs" role="tablist"><button class="active" type="button" data-result-mobile-view="focus" aria-selected="true">絞り込み <b>${focusCount}</b></button><button type="button" data-result-mobile-view="all" aria-selected="false">全12部位</button></div><div class="region-list mobile-list" data-result-region-mobile-list="focus">${regionList(infos, "focus")}</div><div class="region-list mobile-list" data-result-region-mobile-list="all" hidden>${regionList(infos, "all")}</div></section></div></section>`;
}

function renderRunLab({ services, record, measurement }) {
  if (record.activityType !== "run") return "";
  const fatigue = fatigueSnapshot(services, record);
  const fingerprint = buildRunFingerprint(record, { measurement, fatigue });
  const replayLink = measurement?.track?.length >= 2
    ? `<a class="mobile-run-lab-link" href="#/run-route?recordId=${encodeURIComponent(record.id)}&replay=1"><span><small>再生</small><strong>走行を再生</strong></span><b aria-hidden="true">▶</b></a>`
    : `<span class="mobile-run-lab-link is-disabled" aria-disabled="true"><span><small>再生</small><strong>GPS記録なし</strong></span><b aria-hidden="true">—</b></span>`;
  return `<details class="mobile-run-lab"><summary class="mobile-run-lab__head"><div><small>別の見方</small><strong id="mobile-run-lab-title">記録を別の形で見る</strong></div><span><em>記録を詳しく見る</em><i aria-hidden="true">⌄</i></span></summary><div class="mobile-run-lab__grid" aria-labelledby="mobile-run-lab-title"><article class="run-fingerprint-card"><div class="run-fingerprint-card__visual">${renderRunFingerprintSvg(fingerprint)}</div><div class="run-fingerprint-card__copy"><small>記録の形</small><strong>記録の形</strong><p>距離・時間・活動・疲労感などから、この保存記録だけの図形を作ります。</p></div></article><a class="mobile-run-lab-link" href="#/body-timeline?recordId=${encodeURIComponent(record.id)}"><span><small>身体の推移</small><strong>身体の推移</strong></span><b aria-hidden="true">↔</b></a>${replayLink}</div></details>`;
}

function renderAchievementReward(services) {
  const unlocked = consumeUnannouncedAchievements(services);
  if (!unlocked.length) return "";
  const first = unlocked[0];
  const extra = unlocked.length > 1 ? `ほか${unlocked.length - 1}件` : "";
  return `<a class="achievement-reward" href="#/achievements" aria-live="polite"><span class="achievement-reward__icon" aria-hidden="true">🏆</span><span class="achievement-reward__copy"><small>新しい実績</small><strong>${escapeHtml(first.title)}</strong><span>${escapeHtml(extra || "実績を確認")}</span></span></a>`;
}

export function renderResultScreen(args) {
  const state = prepareResultScreenState(args);
  if (state.empty) return renderEmptyResultScreen();
  const { services, record, regionalV2ResultRecord, allExperiences, savedMeasurement, fatigue } = state;
  const routeLink = savedMeasurement
    ? `<section class="run-route-link-wrap"><a class="run-route-link" href="#/run-route?recordId=${encodeURIComponent(record.id)}"><span><small>位置情報の記録</small><strong>走行軌跡を見る</strong><em>${Number(savedMeasurement.distanceKm || 0).toFixed(2)} km・保存地点 ${Number(savedMeasurement.track?.length || 0)}点</em></span><i>›</i></a></section>`
    : "";
  const capsule = renderRunCapsule(services, record, { measurement: savedMeasurement, fatigue });
  const sameCourse = renderSameCourseComparison(record, allExperiences);
  const interpretationLinkCopy = `<span><small>自分の記録と情報を整理</small><strong>今回を見比べる</strong></span>`;
  return `<div class="screen screen--result screen-layout screen-layout--result"><div class="result-mobile-layout">${renderAchievementReward(services)}${capsule ? "" : `<section class="intro"><div class="intro-heading"><div><p class="eyebrow">結果</p><h1>今回の走り</h1></div><span>${escapeHtml(formatLocalDate(record.date))}</span></div>${renderRunSummary(record)}</section>`}${capsule}${sameCourse}${renderHighlights({ services, record, resultRecord: regionalV2ResultRecord, allExperiences })}${renderRegional(regionalV2ResultRecord, allExperiences, record)}${renderFatigue(services, record)}${renderRunLab({ services, record, measurement: savedMeasurement })}${routeLink}<nav class="result-next-actions" aria-label="結果の次の操作"><a class="understanding-link" href="#/interpretation-room?recordId=${encodeURIComponent(record.id)}&origin=result">${interpretationLinkCopy}<i aria-hidden="true">›</i></a><a class="history-link" href="#/history?view=trends&metric=region&period=28&anchorDate=${encodeURIComponent(record.date)}&recordId=${encodeURIComponent(record.id)}"><span><small>この日の記録</small><strong>履歴で見る</strong></span><i aria-hidden="true">›</i></a></nav></div></div>`;
}

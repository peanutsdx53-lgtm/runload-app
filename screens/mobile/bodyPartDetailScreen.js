import { escapeHtml } from "../../ui/commonComponents.js";
import { fmt, renderBodyPartDetailScreenWithPresentation, shortDate, signed, trendSvg } from "../bodyPartDetailScreen.js";

const PRESENTATION = Object.freeze({
  renderReference: () => '<span class="mobile-detail-reference">この部位自身の基準 = 100</span>',
  renderMetrics: ({ baselineDelta, previous, delta }) => `<div class="mobile-detail-metrics" aria-label="この部位の比較"><article><small>基準100との差</small><strong>${Number.isFinite(Number(baselineDelta)) ? signed(baselineDelta, 1) : "—"}</strong></article><article><small>前回</small><strong>${previous ? fmt(previous.row.value, 1) : "—"}</strong></article><article><small>前回との差</small><strong>${Number.isFinite(Number(delta)) ? signed(delta, 1) : "—"}</strong></article></div>`,
  renderTrend: ({ history }) => `<svg class="trend-svg trend-svg--mobile" viewBox="0 0 320 145" role="img" aria-label="保存記録の推移">${trendSvg(history)}</svg>`,
  renderTrendDetail: ({ history, currentHistoryIndex, currentHistory, currentHistoryRecord, row }) => history.length ? `<div class="mobile-trend-detail" data-trend-detail data-selected-index="${currentHistoryIndex}"><small>選択した保存記録</small><div><strong data-trend-detail-date>${escapeHtml(shortDate(currentHistoryRecord.date))}</strong><span><b data-trend-detail-value>${fmt(currentHistory?.row?.value ?? row.value, 1)}</b><em>この部位</em></span></div><p data-trend-detail-facts>${Number.isFinite(Number(currentHistoryRecord.distanceKm)) ? `${fmt(currentHistoryRecord.distanceKm, 2)} km` : "距離なし"}${Number.isFinite(Number(currentHistoryRecord.durationMinutes)) ? ` ・ ${fmt(currentHistoryRecord.durationMinutes, 1)}分` : ""}</p></div>` : "",
});

export function renderBodyPartDetailScreen(args) {
  return renderBodyPartDetailScreenWithPresentation(args, PRESENTATION);
}

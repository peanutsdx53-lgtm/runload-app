import { escapeHtml } from "../../ui/commonComponents.js";
import { renderMobileFatigueTrend } from "../../ui/mobileInsights.js";
import {
  buildHref,
  historyCompareView,
  historyRecordView,
  renderHistoryScreenWithPresentation,
  selfUnderstandingHistoryView,
} from "../historyScreen.js";

function normalizeView(value) {
  const normalized = String(value || "");
  if (normalized === "trends") return "trends";
  if (normalized === "checks") return "checks";
  return "records";
}

function renderModeSwitch(workspace) {
  const recordHref = buildHref({ view: "records", period: workspace.period, anchorDate: workspace.endDate, regionId: workspace.regionId });
  const trendsHref = buildHref({ view: "trends", metric: "region", period: workspace.period, anchorDate: workspace.endDate, regionId: workspace.regionId, display: workspace.regionalDisplay });
  const checksHref = buildHref({ view: "checks", checkState: "watching" });
  return `<nav class="mobile-history-mode" aria-label="履歴の表示"><a class="${workspace.view === "records" ? "active" : ""}" href="${escapeHtml(recordHref)}" aria-current="${workspace.view === "records" ? "page" : "false"}">記録</a><a class="${workspace.view === "trends" ? "active" : ""}" href="${escapeHtml(trendsHref)}" aria-current="${workspace.view === "trends" ? "page" : "false"}">推移</a><a class="${workspace.view === "checks" ? "active" : ""}" href="${escapeHtml(checksHref)}" aria-current="${workspace.view === "checks" ? "page" : "false"}">確認中</a></nav>`;
}

function renderEmpty() {
  return `<section class="history-view"><div class="empty-records empty-records--initial mobile-history-empty"><small>HISTORY</small><strong>最初の記録を残すと、ここで変化を見返せます</strong><p>保存した記録はそのまま残し、比べられる記録だけを同じ部位でつなぎます。</p><div class="mobile-history-empty__preview" aria-label="記録が増えると確認できること"><span><b>1</b>保存記録を探す</span><span><b>2</b>同じ部位を比べる</span><span><b>3</b>前回との差を見る</span></div><a href="#/record-input">記録を始める</a></div></section>`;
}

const MOBILE_HISTORY_PRESENTATION = Object.freeze({
  normalizeView,
  renderModeSwitch,
  renderEmpty,
  renderContent: ({ workspace, context, services }) => {
    if (workspace.view === "checks") return selfUnderstandingHistoryView(services, context);
    if (workspace.view === "trends") return `${renderMobileFatigueTrend(services)}${historyCompareView(workspace)}`;
    return historyRecordView(workspace, context, { title: "保存記録を探す" });
  },
});

export function renderHistoryScreen(args) {
  return renderHistoryScreenWithPresentation(args, MOBILE_HISTORY_PRESENTATION);
}

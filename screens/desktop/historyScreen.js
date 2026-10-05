import { escapeHtml } from "../../ui/commonComponents.js";
import {
  buildHref,
  historyRecordView,
  normalizedView,
  renderHistoryScreenWithPresentation,
  selfUnderstandingHistoryView,
} from "../historyScreen.js";

function renderModeSwitch(workspace) {
  const recordHref = buildHref({ view: "records", period: workspace.period, anchorDate: workspace.endDate, regionId: workspace.regionId });
  const checksHref = buildHref({ view: "checks", checkState: "watching" });
  return `<nav class="desktop-history-mode" aria-label="履歴の表示"><a class="${workspace.view === "records" ? "active" : ""}" href="${escapeHtml(recordHref)}">保存記録</a><a class="${workspace.view === "checks" ? "active" : ""}" href="${escapeHtml(checksHref)}">確認中</a></nav>`;
}

const DESKTOP_HISTORY_PRESENTATION = Object.freeze({
  normalizeView: normalizedView,
  renderModeSwitch,
  renderContent: ({ workspace, context, services }) => workspace.view === "checks" ? selfUnderstandingHistoryView(services, context) : historyRecordView(workspace, context),
});

export function renderHistoryScreen(args) {
  return renderHistoryScreenWithPresentation(args, DESKTOP_HISTORY_PRESENTATION);
}

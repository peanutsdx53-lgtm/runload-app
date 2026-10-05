import { renderHistoryScreenForPlatform } from "../historyScreen.js";
import { renderMobileFatigueTrend } from "../../ui/mobileInsights.js";

export function renderHistoryScreen(args) {
  return renderHistoryScreenForPlatform(args, { mobileLayout: true, renderMobileFatigueTrend });
}

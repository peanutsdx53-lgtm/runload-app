import { V27_REGIONAL_VIEW_IDS } from "../core/runloadCore.js";

const VIEW_LABELS = Object.freeze({
  [V27_REGIONAL_VIEW_IDS.withinRun]: "今回の部位間比較",
  [V27_REGIONAL_VIEW_IDS.ownFlat]: "平坦基準との比較",
  [V27_REGIONAL_VIEW_IDS.personal]: "自分の過去記録との比較",
});

export function regionalComparisonViewLabel(viewId) {
  return VIEW_LABELS[viewId] || VIEW_LABELS[V27_REGIONAL_VIEW_IDS.withinRun];
}

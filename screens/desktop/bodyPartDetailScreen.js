import { renderBodyPartDetailScreenWithPresentation, trendSvg } from "../bodyPartDetailScreen.js";

const PRESENTATION = Object.freeze({
  renderTrend: ({ history }) => `<svg class="trend-svg trend-svg--pc" viewBox="0 0 320 145" role="img" aria-label="保存記録の推移">${trendSvg(history, { annotated: true })}</svg>`,
});

export function renderBodyPartDetailScreen(args) {
  return renderBodyPartDetailScreenWithPresentation(args, PRESENTATION);
}

import { renderPlanScreenWithPresentation } from "../planScreen.js";

function renderSavedStatus({ justSaved, planType, scheduledDate, editing, planTitle, formatLocalDate, escapeHtml }) {
  if (!justSaved) return "";
  return `<section class="plan-mobile-saved-success" aria-live="polite"><div class="plan-mobile-saved-success__mark" aria-hidden="true">✓</div><div><small>保存完了</small><strong>${planType === "rest" ? "休養予定を保存しました" : "走行予定を保存しました"}</strong><span>${escapeHtml(formatLocalDate(scheduledDate))}${planType === "rest" ? "・休養予定" : `・${escapeHtml(planTitle(editing))}`}</span></div>${planType === "rest" ? `<a href="#/home">ホームへ戻る</a>` : `<a href="#/run-measurement?planId=${encodeURIComponent(editing?.id || "")}">この予定で測定を始める</a>`}</section>`;
}

function renderReviewControl() {
  return `<button class="plan-mobile-review-button" type="button" data-action="plan-review" aria-controls="plan-confirm" aria-expanded="false"><span>確認</span><strong>保存前の確認へ</strong><i aria-hidden="true">›</i></button>`;
}

function renderConfirmEditControl() {
  return `<button class="plan-mobile-edit-button" type="button" data-action="plan-edit">← 予定内容を修正</button>`;
}

export function renderPlanScreen(args) {
  return renderPlanScreenWithPresentation(args, { renderSavedStatus, renderReviewControl, renderConfirmEditControl });
}

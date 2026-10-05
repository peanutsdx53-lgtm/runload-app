import {
  renderRecordInputScreenWithPresentation,
  renderRofJInlineAndOverlay,
} from "../recordInputScreen.js";

function renderProgress({ isRest = false } = {}) {
  return `<nav class="mobile-record-progress" aria-label="入力の進み具合" data-record-progress>
    <button type="button" class="mobile-record-progress__item is-active" data-record-stage-jump="1" aria-current="step"><span>1</span><strong>基本</strong><em data-record-stage-status="1">入力中</em></button>
    <button type="button" class="mobile-record-progress__item" data-record-stage-jump="2" data-record-stage-run-only${isRest ? " hidden" : ""}><span>2</span><strong>条件</strong><em data-record-stage-status="2">任意</em></button>
    <button type="button" class="mobile-record-progress__item" data-record-stage-jump="3" data-record-stage-run-only${isRest ? " hidden" : ""}><span>3</span><strong>比較</strong><em data-record-stage-status="3">任意</em></button>
    <button type="button" class="mobile-record-progress__item" data-record-stage-jump="4"><span>4</span><strong>次回</strong><em data-record-stage-status="4">任意</em></button>
  </nav>`;
}

const MOBILE_PRESENTATION = Object.freeze({
  durationStep: "0.01",
  runWalkDurationStep: "0.01",
  coreTitle: () => "今日の走行",
  runningFormatLabel: "走行形式",
  runningFormatOptions: Object.freeze({ unknown: "未設定", continuous: "走り続けた", runWalk: "走り＋歩き" }),
  renderProgress,
  renderPrimaryFatigue: () => "",
  renderMeasurementPrefill: ({ measurement }) => measurement ? '<div class="mobile-record-prefill" data-record-measurement-prefill><strong>GPS測定から入力済み</strong><span>保存前に変更できます</span></div>' : "",
  renderReflectionLead: ({ services, linkedRunId, editing, isRest }) => `<section class="mobile-record-wellbeing" data-mobile-record-wellbeing data-run-fields${isRest ? " hidden" : ""}><div class="mobile-record-wellbeing__head"><div><small>任意</small><strong>体調・感覚</strong></div><span>走る前後の疲労感</span></div>${renderRofJInlineAndOverlay({ services, linkedRunId, editing })}</section>`,
  renderBottomClearance: () => '<div class="mobile-record-bottom-clearance" aria-hidden="true"></div>',
  renderAfterForm: ({ editing }) => `<div class="mobile-save-bar" data-record-mobile-save-bar>${editing ? "" : '<button class="draft-button" type="button" data-action="save-record-draft">下書き</button>'}<button class="primary-save" type="submit" form="record-input-form">${editing ? "更新して結果を見る" : "保存して結果を見る"}</button></div>`,
});

export function renderRecordInputScreen(args) {
  return renderRecordInputScreenWithPresentation(args, MOBILE_PRESENTATION);
}

import {
  hasComparisonInfo,
  hasDetailedCourse,
  hasReflectionInfo,
  optionalInputStatus,
  renderRecordInputScreenWithPresentation,
  renderRofJInlineAndOverlay,
} from "../recordInputScreen.js";

const DESKTOP_PRESENTATION = Object.freeze({
  coreTitle: ({ isRest }) => isRest ? "今日の休養" : "今日の走行",
  renderPrimaryFatigue: () => "",
  renderReflectionLead: ({ services, linkedRunId, editing, isRest }) => `<section class="desktop-record-wellbeing" data-run-fields${isRest ? " hidden" : ""}>${renderRofJInlineAndOverlay({ services, linkedRunId, editing })}</section>`,
  renderFormControls: ({ editing, isRest, course, record, feedback }) => `<aside class="desktop-save-area" aria-label="入力状況">
    <div class="desktop-save-area__intro"><strong>入力状況</strong></div>
    <div class="save-readiness" data-save-readiness>
      <div class="save-readiness__summary"><span>必須</span><strong data-save-readiness-progress>${isRest ? "保存可" : "0 / 2"}</strong></div>
      <div class="save-readiness__bar" aria-hidden="true"><i data-save-readiness-bar style="width:${isRest ? "100" : "0"}%"></i></div>
      <div class="save-checklist" data-save-run-checklist${isRest ? " hidden" : ""}><div data-save-check="distance"><span>距離</span><b data-save-check-state="distance">未入力</b></div><div data-save-check="duration"><span>実際に走った時間</span><b data-save-check-state="duration">未入力</b></div></div>
      <div class="optional-readiness" aria-label="任意項目の入力状況"><p>任意</p><div data-save-optional="course" data-run-optional${isRest ? " hidden" : ""}><span>コースと走行条件</span><b>${optionalInputStatus(hasDetailedCourse(course))}</b></div><div data-save-optional="compare" data-run-optional${isRest ? " hidden" : ""}><span>比較しやすくする情報</span><b>${optionalInputStatus(hasComparisonInfo(record))}</b></div><div data-save-optional="reflection"><span data-record-reflection-label>${isRest ? "身体・休養時の記録" : "身体・走ったときの記録"}</span><b>${optionalInputStatus(hasReflectionInfo(record, feedback))}</b></div></div>
    </div>
    <span class="draft-status" data-draft-status role="status" aria-live="polite"></span>
    <button class="primary-save" type="submit">${editing ? "記録を更新して結果を見る" : "記録を保存して結果を見る"}</button>
  </aside>`,
});

export function renderRecordInputScreen(args) {
  return renderRecordInputScreenWithPresentation(args, DESKTOP_PRESENTATION);
}

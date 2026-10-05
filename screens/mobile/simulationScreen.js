import { renderSimulationScreenWithPresentation } from "../simulationScreen.js";

function renderConditionPicker() {
  return `<nav class="mobile-simulation-picker" data-simulation-picker aria-label="変更する条件">
    <div class="mobile-simulation-picker__head"><strong>何を変えて比べる？</strong><span>1つずつ変えると、違いを確認しやすくなります。</span></div>
    <div class="mobile-simulation-picker__grid">
      <button type="button" data-simulation-picker-tab="distance" aria-pressed="true"><span>距離</span><small data-simulation-tab-state="distance">表示中</small></button>
      <button type="button" data-simulation-picker-tab="time" aria-pressed="false"><span>時間</span><small data-simulation-tab-state="time">未変更</small></button>
      <button type="button" data-simulation-picker-tab="course" aria-pressed="false"><span>コース</span><small data-simulation-tab-state="course">未変更</small></button>
      <button type="button" data-simulation-picker-tab="format" aria-pressed="false"><span>走り方</span><small data-simulation-tab-state="format">未変更</small></button>
    </div>
  </nav>`;
}

export function renderSimulationScreen(args) {
  return renderSimulationScreenWithPresentation(args, { renderConditionPicker });
}

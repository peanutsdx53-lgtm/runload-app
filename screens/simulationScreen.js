import { escapeHtml, renderPageHeading } from "../ui/commonComponents.js";
import { peekCourseSelection } from "../ui/flowSessionState.js";
import { primarySurfaceSummary, slopeSummary } from "../ui/coursePresentation.js";

function selectedCourse(){return peekCourseSelection("simulation")?.preset || null;}
export function renderSimulationScreen({ context }) {
  const selected=selectedCourse(); const course=selected?.course || {name:"",gradeKnowledge:"UNKNOWN",modelSurfaceClass:"UNKNOWN"};
  const from=String(context?.parameters?.get("from")||""); const back=from==="plan"?"#/plan":from==="activation"?"#/activation":"#/activation";
  return `<section class="screen screen--simulation frozen-simulation-screen">
    <nav class="context-navigation"><a class="body-part-detail__back-link" href="${escapeHtml(back)}">戻る</a></nav>
    ${renderPageHeading({ eyebrow:"SIMULATION", title:"条件を比べる", description:"保存前の条件を変えて、同じFormal Reference-100計算で表示を比べます。" })}
    <p class="inline-helper"><strong>ここで入力した内容は自動保存しません。</strong> 距離は別の走行事実として表示し、部位値へ自動乗算しません。</p>
    <form id="simulation-form" class="record-form frozen-simulation-form" novalidate>
      <input type="hidden" name="courseJson" value="${escapeHtml(JSON.stringify(course))}">
      <section class="form-section"><div class="field-grid field-grid--two"><label class="field"><span>距離（km）</span><input name="distanceKm" type="number" min="0.01" step="0.01" value="5"></label><label class="field"><span>実走時間（分）</span><input name="durationMinutes" type="number" min="0.01" step="0.1" value="32"></label></div><label class="field"><span>走行形式</span><select name="runningFormat"><option value="CONTINUOUS_RUN">途中で歩かず走る</option><option value="RUN_WALK">走りと歩きを混ぜる</option></select></label><div class="field-grid field-grid--two" data-simulation-run-walk hidden><label class="field"><span>走った区間の距離（km）</span><input name="runningDistanceKm" type="number" min="0.01" step="0.01" value="4"></label><label class="field"><span>走った区間の時間（分）</span><input name="runningDurationMinutes" type="number" min="0.01" step="0.1" value="26"></label></div></section>
      <section class="form-section"><div class="section-heading"><p>COURSE</p><h2>コース条件</h2></div><div class="simulation-course-summary"><div><strong data-simulation-course-name>${escapeHtml(course.name||"未選択")}</strong><span>${escapeHtml(course.name?`${slopeSummary(course)}・${primarySurfaceSummary(course)}`:"坂・路面は未設定")}</span></div><a class="button button--secondary" href="#/course-library?returnTo=${encodeURIComponent(`#/simulation${from?`?from=${encodeURIComponent(from)}`:""}`)}">選ぶ・作る</a></div></section>
      <section class="simulation-controls"><button class="button button--secondary" type="button" data-action="simulation-toggle-compare" aria-pressed="false">前回差を見る</button><button class="button button--text" type="reset">入力を戻す</button></section>
    </form>
    <section id="simulation-result" class="simulation-result" aria-live="polite"></section>
  </section>`;
}

import { SURFACE_FIELDS } from "../core/runloadCore.js";
import { escapeHtml, renderPageHeading, renderScreenGuide, renderStatusLabel } from "../ui/commonComponents.js";
import { subjectiveFieldsFromFeedback, subjectiveSummaryFromFields } from "../ui/subjectivePresentation.js";
import { personalContextSummary } from "../ui/personalContextPresentation.js";
import { renderCourseSummary } from "../ui/coursePresentation.js";
import { formatLocalDate } from "../ui/recordPresentation.js";
import { INPUT_PURPOSE_GUIDANCE } from "../ui/hierarchicalExplanation.js";
import { ROF_J_DESCRIPTOR_MAP } from "../core/secondPillarRofJ.js";
import { renderEmbeddedPersonalSubflow, renderEmbeddedSubjectiveSubflow } from "../ui/recordEmbeddedSubflows.js";


function renderRofJInlineAndOverlay({ services, linkedRunId = "", editing = false }) {
  if (!services?.secondPillar) return "";
  const summary = linkedRunId ? services.secondPillar.summarizeRun?.(linkedRunId) : null;
  const entry = linkedRunId ? services.secondPillar.repository?.loadByRunId?.(linkedRunId) : null;
  const preValue = summary?.preObservedValue;
  const postValue = summary?.postObservedValue;
  const hasPre = Number.isInteger(preValue);
  const hasPost = Number.isInteger(postValue);
  const status = hasPre && hasPost
    ? `走る前 ${preValue} → 走った後 ${postValue}`
    : hasPre ? `走る前 ${preValue} を記録済み` : hasPost ? `走った後 ${postValue} を記録済み` : "未記録";
  const actionText = editing ? "保存済み" : hasPost ? "記録済み" : hasPre ? "走った後を記録" : "記録する";
  const actionDisabled = editing || hasPost ? " disabled" : "";
  const phase = hasPre ? "after" : "before";
  const sourceFingerprint = entry?.sourceFingerprint || "";
  return `<div class="fatigue-inline" data-second-pillar-lifecycle data-run-id="${escapeHtml(linkedRunId)}"><div><small>任意</small><strong>${hasPre ? "走る前後の疲労感" : "走る前の疲労感"}</strong><span data-record-rof-status>${escapeHtml(status)}</span></div><button type="button" data-action="open-record-rof" data-phase="${phase}"${actionDisabled}>${escapeHtml(actionText)}</button><p class="form-messages" data-second-pillar-message hidden></p></div>
  <div class="overlay" data-record-rof-overlay hidden aria-modal="true" role="dialog" aria-labelledby="record-rof-title"><section class="sheet rof-sheet"><div class="grip"></div><header class="sheet-head"><div><p class="eyebrow">疲労感の記録</p><h2 id="record-rof-title" data-record-rof-title>${phase === "after" ? "走った後の疲労感" : "走る前の疲労感"}</h2></div><button type="button" data-action="close-record-rof" aria-label="閉じる">×</button></header><p class="rof-question" data-record-rof-question>今の疲労感を0〜10で選んでください。</p><div class="rof-scale-panel"><div class="rof-current"><span>選択値</span><strong data-record-rof-value>—</strong><em data-record-rof-descriptor>数値を選択</em></div><div class="rof-slider-wrap"><input type="range" min="0" max="10" step="1" value="5" data-record-rof-slider aria-label="疲労感 0から10"><div class="rof-ticks" aria-hidden="true">${Array.from({ length: 11 }, (_, value) => `<span>${value}</span>`).join("")}</div></div><div class="rof-anchor-guide"><small>尺度の正式な言葉</small><div data-record-rof-anchor>2・${escapeHtml(ROF_J_DESCRIPTOR_MAP[2])} ／ 4・${escapeHtml(ROF_J_DESCRIPTOR_MAP[4])}</div></div></div><button type="button" class="primary-sheet-action" data-action="record-rof-value" disabled>この値を記録</button><button type="button" class="text-action" data-action="record-rof-post-only"${phase === "after" ? " hidden" : ""}>すでに走り終えている場合：走った後だけ記録</button><details class="rof-about"><summary>尺度について</summary><div><p>0〜10で、その時点で自分が感じている疲労感を記録します。部位ごとの目安とは別の情報として扱います。</p>${sourceFingerprint ? `<small>使用尺度：ROF-J</small>` : ""}</div></details></section></div>`;
}

const RUN_WALK_SURFACE_OPTIONS = Object.freeze([
  ["PAVED", "paved", "舗装路"],
  ["TRACK", "track", "陸上トラック"],
  ["TREADMILL", "treadmill", "トレッドミル"],
  ["SOIL", "soil", "締まった土道"],
  ["TRAIL", "trail", "不整地トレイル"],
  ["NATURAL_GRASS", "natural_grass", "天然芝"],
  ["ARTIFICIAL_TURF", "artificial_turf", "人工芝"],
  ["SAND", "sand", "砂地"],
]);

function runWalkSectionSurface(section = {}) {
  const first = Array.isArray(section.surfaceComponents) ? section.surfaceComponents.find((item) => Number(item?.sharePercent) > 0) : null;
  return String(first?.userCategory || "UNKNOWN").toUpperCase();
}

function renderRunWalkDetails(record = {}) {
  const active = String(record.runningFormat || "UNKNOWN").toUpperCase() === "RUN_WALK";
  const rows = Array.from({ length: 5 }, (_, index) => {
    const section = Array.isArray(record.runWalkRunningSections) ? record.runWalkRunningSections[index] || {} : {};
    const direction = String(section.gradeDirection || "FLAT").toUpperCase();
    const grade = direction === "FLAT" ? 0 : Math.abs(Number(section.gradePercent || 0));
    const surface = runWalkSectionSurface(section);
    return `<div class="field-grid field-grid--four run-walk-section-row">
      <label class="field field--compact"><span>走行区間${index + 1}・割合（%）</span><input name="runWalkSectionShare_${index}" type="number" min="0" max="100" step="0.1" value="${escapeHtml(section.sharePercent ?? "")}" placeholder="例：40"></label>
      <label class="field field--compact"><span>坂の向き</span><select name="runWalkSectionDirection_${index}"><option value="FLAT"${selected(direction, "FLAT")}>平坦</option><option value="UPHILL"${selected(direction, "UPHILL")}>上り</option><option value="DOWNHILL"${selected(direction, "DOWNHILL")}>下り</option></select></label>
      <label class="field field--compact"><span>坂の傾き（%）</span><input name="runWalkSectionGrade_${index}" type="number" min="0" max="100" step="0.1" value="${escapeHtml(grade)}"></label>
      <label class="field field--compact"><span>路面</span><select name="runWalkSectionSurface_${index}"><option value="UNKNOWN"${selected(surface, "UNKNOWN")}>未設定</option>${RUN_WALK_SURFACE_OPTIONS.map(([category, , label]) => `<option value="${category}"${selected(surface, category)}>${label}</option>`).join("")}</select></label>
    </div>`;
  }).join("");
  return `<div class="run-walk-details" data-run-walk-fields${active ? "" : " hidden"}>
    <div class="inline-helper inline-helper--important"><strong>走りと歩きを混ぜた場合、部位ごとの目安は「走った区間」を対象にします。</strong><p>歩いた区間を走行として扱いません。走った距離と時間を入力してください。</p></div>
    <div class="field-grid field-grid--two">
      <label class="field"><span>走った距離（km） <strong aria-label="この走り方では必須">この走り方では必須</strong></span><input name="runWalkRunningDistanceKm" type="number" min="0.01" max="10000" step="0.01" value="${escapeHtml(record.runWalkRunningDistanceKm ?? "")}" placeholder="例：4.0" data-run-walk-required></label>
      <label class="field"><span>走った時間（分） <strong aria-label="この走り方では必須">この走り方では必須</strong></span><input name="runWalkRunningDurationMinutes" type="number" min="0.01" max="100000" step="0.1" value="${escapeHtml(record.runWalkRunningDurationMinutes ?? "")}" placeholder="例：25" data-run-walk-required></label>
    </div>
    <details class="record-run-walk-composition"><summary>走った区間の坂・路面内訳（複数の坂・路面がある場合）</summary><p class="field-help">走った区間に複数の坂や路面がある場合は、その割合を合計100%で入力します。歩いた区間は含めません。区間ごとの速度は自動で補いません。</p>${rows}</details>
    <p class="field-help">殿部・大腿前面・大腿後面・下腿後面は、平均速度2.25〜4.50 m/sで目安を表示します。範囲外では、この4部位は「目安なし」です。ほかの部位は、確認できる条件だけを反映します。</p>
  </div>`;
}

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function prototypeDateLabel(value = "") {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : String(value || "—");
}

function selected(value, expected) {
  return String(value ?? "") === String(expected) ? " selected" : "";
}

function checked(value) {
  return value ? " checked" : "";
}

function hasDetailedCourse(course = {}) {
  if (course.name) return true;
  if (String(course.gradeKnowledge || "UNKNOWN") !== "UNKNOWN") return true;
  if (String(course.modelSurfaceClass || "UNKNOWN") !== "UNKNOWN") return true;
  if (["upPercent", "downPercent", "upGradePercent", "downGradePercent"].some((key) => Number(course[key] || 0) > 0)) return true;
  return SURFACE_FIELDS.some(({ recordKey }) => Number(course[recordKey] || 0) > 0);
}


function renderPlanCourseLibrarySaveOption(course = {}, { fromPlan = false, isRest = false } = {}) {
  if (!fromPlan || isRest || !String(course.name || "").trim()) return "";
  return `<div class="record-course-library-save" data-plan-course-library-save><label class="choice-card record-course-library-save__choice"><input type="checkbox" name="savePlanCourseToLibrary" value="1"><span><strong>このコースを保存したコースにも残す</strong><small>記録を保存すると、次回から入力画面で選べます。同じ名前がある場合は確認します。</small></span></label></div>`;
}

function renderCourseEntry(course = {}, isRest = false, { fromPlan = false } = {}) {
  const selectedCourse = hasDetailedCourse(course);
  return `<div class="record-course-entry" data-run-fields${isRest ? " hidden" : ""}>
    <div class="selected-course"${selectedCourse ? "" : " hidden"} data-prototype-selected-course><div><small>今回のコース</small><strong data-prototype-course-name>${escapeHtml(course.name || "名称なし")}</strong><span data-prototype-course-meta>${escapeHtml(course.modelSurfaceClass && course.modelSurfaceClass !== "UNKNOWN" ? course.modelSurfaceClass : "条件を保存")}</span></div><button type="button" data-action="clear-record-course">解除</button></div>
    <button class="route-button" type="button" data-action="open-course-library"><span><small>保存コース</small><strong>コースを選ぶ・作る</strong></span><i>›</i></button>
    ${renderPlanCourseLibrarySaveOption(course, { fromPlan, isRest })}
    <p class="snapshot-note">今回だけ変更しても、保存元コースや過去記録は自動で書き換えません。</p>
  </div>`;
}

function recentCourseTimestamp(course = {}) {
  const value = Date.parse(course.updatedAt || course.createdAt || "");
  return Number.isFinite(value) ? value : 0;
}

function renderRecentCourseShortcuts(courses = []) {
  if (!courses.length) return '<p class="micro-note">保存済みコースはまだありません。</p>';
  const marks = ["○", "↔", "◎"];
  return `<div class="recent-label"><span>最近使ったコース</span><small>横に選択</small></div><div class="course-strip" aria-label="最近使った保存コース">${courses.map((course, index) => `<button type="button" class="course-chip" data-action="apply-saved-course" data-course-id="${escapeHtml(course.id || "")}"><span class="course-map">${marks[index] || "○"}</span><strong>${escapeHtml(course.name || "名称なし")}</strong><small>今回の入力へ反映</small></button>`).join("")}</div>`;
}

function renderCourseHiddenFields(course = {}) {
  const values = {
    courseId: course.id || course.courseId || "",
    courseName: course.name || "",
    routePattern: course.routePattern || "UNKNOWN",
    gradeInputMode: course.gradeInputMode || (Array.isArray(course.sections) && course.sections.length ? "SECTIONS" : course.gradeKnowledge === "KNOWN_FLAT" ? "FLAT" : course.gradeKnowledge === "KNOWN_PROFILE" ? "SUMMARY" : "UNKNOWN"),
    surfaceInputMode: course.surfaceInputMode || "UNKNOWN",
    upPercent: course.upPercent || 0,
    downPercent: course.downPercent || 0,
    upGradePercent: course.upGradePercent || 0,
    downGradePercent: course.downGradePercent || 0,
    gradeKnowledge: course.gradeKnowledge || "UNKNOWN",
    modelSurfaceClass: course.modelSurfaceClass || "UNKNOWN",
  };
  const baseFields = Object.entries(values).map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`).join("");
  const sectionFields = Array.from({ length: 5 }, (_, index) => {
    const section = Array.isArray(course.sections) ? course.sections[index] || {} : {};
    const signedGrade = Number(section.gradePercent || 0);
    const direction = section.gradeDirection || (signedGrade > 0 ? "UPHILL" : signedGrade < 0 ? "DOWNHILL" : "FLAT");
    return `<input type="hidden" name="sectionShare_${index}" value="${escapeHtml(section.sharePercent ?? "")}"><input type="hidden" name="sectionDirection_${index}" value="${escapeHtml(direction)}"><input type="hidden" name="sectionGrade_${index}" value="${escapeHtml(Math.abs(signedGrade) || "")}">`;
  }).join("");
  const surfaceFields = SURFACE_FIELDS.map(({ recordKey }) => `<input type="hidden" name="${escapeHtml(recordKey)}" value="${escapeHtml(course[recordKey] ?? 0)}">`).join("");
  return `<div class="course-hidden-fields" hidden aria-hidden="true">${baseFields}${sectionFields}${surfaceFields}</div>`;
}


function renderRecordInputGuide({ selectedPlan = null, editing = false } = {}) {
  const saveText = editing
    ? "同じ記録を更新し、結果画面を開きます。"
    : selectedPlan
      ? "予定の内容を今回の記録へ残し、結果画面を開きます。コース保存は選んだ場合だけ行います。"
      : "今回の記録を保存し、結果画面を開きます。";
  return renderScreenGuide({
    id: "record-input-guide",
    summary: "必須項目から順に入力できます。必要な説明だけ確認してください。",
    sections: [
      { title: "まずここでやること", body: "走行または休養を選び、日付と基本情報を入力します。" },
      { title: "入力の4つの目的", items: INPUT_PURPOSE_GUIDANCE.map((item) => item.title) },
      { title: "コースの扱い", body: "今回の条件として選びます。保存したコースは次回も使えます。" },
      { title: "保存後", body: saveText },
    ],
    tutorialId: "record-input",
  });

}

function renderEnvironmentContext(record = {}) {
  const context = record.environmentContext || {};
  return `<details class="inner-details"><summary><span>環境を残す<small>気温・環境メモ</small></span><i>⌄</i></summary><div class="inner-body environment-fields"><input type="hidden" name="weather" value="${escapeHtml(context.weather || "")}"><input type="hidden" name="windSummary" value="${escapeHtml(context.windSummary || "")}"><label class="field"><span>気温（℃）</span><input name="temperatureC" type="number" inputmode="decimal" min="-50" max="60" step="0.1" value="${escapeHtml(context.temperatureC ?? "")}" placeholder="例：24"></label><label class="field"><span>環境メモ</span><textarea name="environmentNote" maxlength="500" rows="1" placeholder="例：暑い、向かい風、湿度が高い">${escapeHtml(context.environmentNote || "")}</textarea></label></div></details>`;
}

function renderRecoveryAndReflection(record = {}) {
  const recovery = record.recoveryContext || {};
  const reflection = record.reflectionContext || {};
  const consultation = record.consultationContext || {};
  const selectedData = new Set(Array.isArray(consultation.consultationDataSelection) ? consultation.consultationDataSelection : []);
  return `<div class="record-context-details">
    <div class="legacy-recovery-context" hidden aria-hidden="true"><input type="hidden" name="sleepSummary" value="${escapeHtml(recovery.sleepSummary || "")}"><input type="hidden" name="nutritionHydrationSummary" value="${escapeHtml(recovery.nutritionHydrationSummary || "")}"><input type="hidden" name="lifestyleNote" value="${escapeHtml(recovery.lifestyleNote || "")}"></div>
    <details class="record-optional-details"><summary><span><strong>今回の振り返りと次回</strong><small>重複を避け、振り返り・普段との違い・次回確認したいことだけを任意で残します。</small></span></summary><div class="field-grid field-grid--two record-optional-details__body">
      <label class="field"><span>今回の振り返り</span><textarea name="postRunReflection" maxlength="500" rows="3">${escapeHtml(reflection.postRunReflection || "")}</textarea></label>
      <label class="field"><span>普段との違い</span><textarea name="perceivedDifference" maxlength="500" rows="3">${escapeHtml(reflection.perceivedDifference || "")}</textarea></label>
      <input type="hidden" name="reflectionKeyPoint" value="${escapeHtml(reflection.reflectionKeyPoint || "")}">
      <label class="field"><span>次回確認したいこと</span><textarea name="nextCheckPoint" maxlength="500" rows="3">${escapeHtml(reflection.nextCheckPoint || "")}</textarea></label>
    </div></details>
    <div class="legacy-consultation-context" hidden aria-hidden="true"><input type="hidden" name="consultationTarget" value="${escapeHtml(consultation.consultationTarget || "")}"><input type="hidden" name="consultationQuestion" value="${escapeHtml(consultation.consultationQuestion || "")}">${[...selectedData].map((value) => `<input type="checkbox" name="consultationDataSelection" value="${escapeHtml(value)}" checked>`).join("")}</div>
  </div>`;
}

export function renderRecordInputScreen({ services, context }) {
  const requestedRecordId = context?.parameters?.get("recordId") || "";
  const requestedPlanId = context?.parameters?.get("planId") || "";
  const startNew = context?.parameters?.get("new") === "1";
  const selectedPlan = requestedPlanId ? services.storage.plans.findById(requestedPlanId) : null;
  const existingExperience = requestedRecordId
    ? services.workflows.records.loadExperience(requestedRecordId)
    : null;
  const savedDraft = !existingExperience && !selectedPlan && !startNew ? services.storage.draft.load() : null;
  const editing = Boolean(existingExperience);
  const plannedSession = selectedPlan?.plannedSession || {};
  const planUsesModelAssumptions = Boolean(plannedSession?.planModelAssumptions?.steps || plannedSession?.planModelAssumptions?.perceivedExertion);
  const draftRecord = savedDraft?.record || {};
  const record = existingExperience?.record || (selectedPlan ? {
    id: "",
    date: selectedPlan.scheduledDate || localToday(),
    activityType: selectedPlan.planType || "run",
    distanceKm: plannedSession.distanceKm ?? "",
    durationMinutes: plannedSession.durationMinutes ?? "",
    steps: planUsesModelAssumptions ? "" : plannedSession.steps ?? "",
    perceivedExertion: null,
    rpeProvenance: plannedSession.rpeProvenance || "NOT_REPORTED",
    runningFormat: plannedSession.runningFormat || "UNKNOWN",
    stepsProvenance: plannedSession.stepsProvenance || "UNKNOWN",
    course: plannedSession.course || { gradeKnowledge: "UNKNOWN", modelSurfaceClass: "UNKNOWN" },
    memo: selectedPlan.memo || "",
  } : {
    id: draftRecord.id || "",
    date: draftRecord.date || context?.parameters?.get("date") || localToday(),
    activityType: draftRecord.activityType || "run",
    distanceKm: draftRecord.distanceKm ?? "",
    durationMinutes: draftRecord.durationMinutes ?? "",
    steps: draftRecord.steps ?? "",
    perceivedExertion: null,
    rpeProvenance: draftRecord.rpeProvenance || "NOT_REPORTED",
    runningFormat: draftRecord.runningFormat || "UNKNOWN",
    stepsProvenance: draftRecord.stepsProvenance || "UNKNOWN",
    course: draftRecord.course || { gradeKnowledge: "UNKNOWN", modelSurfaceClass: "UNKNOWN" },
    memo: draftRecord.memo || "",
  });
  const pendingRuns = !editing ? (services.secondPillar?.listPendingRuns?.() || []) : [];
  const requestedRunId = !editing ? String(context?.parameters?.get("runId") || "") : "";
  const draftRunId = !editing ? String(record.id || "") : "";
  const linkedRunId = requestedRunId && pendingRuns.some((item) => item.runId === requestedRunId)
    ? requestedRunId
    : draftRunId && pendingRuns.some((item) => item.runId === draftRunId)
      ? draftRunId
      : "";
  const effectiveRecordId = editing ? String(record.id || "") : linkedRunId;

  const feedback = existingExperience?.feedback || savedDraft?.feedback || {
    checkStatus: "deferred",
    fatigueByBodyPart: {},
    discomfortByBodyPart: {},
    safetyFlags: {},
  };
  const isRest = record.activityType === "rest";
  const course = record.course || {};
  const recentCourses = [...services.storage.courses.loadAll()]
    .sort((left, right) => recentCourseTimestamp(right) - recentCourseTimestamp(left))
    .slice(0, 3);
  const settings = services.storage.settings.load();

  return `<div class="screen screen--record-input prototype-parity prototype-parity--record">
    <section class="page-head"><div><p class="eyebrow">RECORD</p><h1>${editing ? "保存した記録を確認・更新" : "今日の記録"}</h1></div></section>
    ${editing ? `<p class="parity-record-banner">保存済みの${escapeHtml(formatLocalDate(record.date))}の記録を更新します。</p>` : selectedPlan ? `<p class="parity-record-banner">保存した予定から今回の記録へ転記しています。</p>` : savedDraft ? `<p class="parity-record-banner">入力途中の下書きから再開しています。</p>` : ""}
    <form id="record-input-form" class="record-form prototype-record-form" data-editing="${editing ? "true" : "false"}" novalidate>
      <input type="hidden" name="recordId" value="${escapeHtml(effectiveRecordId)}"><input type="hidden" name="planId" value="${escapeHtml(selectedPlan?.id || "")}"><div class="form-messages" data-form-messages tabindex="-1" hidden></div>
      <section class="core-card" data-information-role="fact"><div class="core-heading"><span class="core-stage-icon">1</span><div class="core-title-copy"><p class="stage-label">必須</p><h2>今日の走行</h2></div><span data-prototype-required-progress>距離・時間</span></div>
        ${renderRofJInlineAndOverlay({ services, linkedRunId, editing })}
        <fieldset class="activity-toggle"><legend>記録の種類</legend><label><input type="radio" name="activityType" value="run"${checked(!isRest)}><span>走行</span></label><label><input type="radio" name="activityType" value="rest"${checked(isRest)}><span>休養</span></label></fieldset>
        <div class="date-field"><span class="date-label">日付</span><label class="date-control"><span data-prototype-date-display>${escapeHtml(prototypeDateLabel(record.date))}</span><input name="date" type="date" value="${escapeHtml(record.date)}" required></label></div>
        <div data-run-fields${isRest ? " hidden" : ""}><div class="measure-grid"><label class="measure-field"><span>距離</span><div><input name="distanceKm" type="number" inputmode="decimal" min="0.01" max="10000" step="0.01" value="${escapeHtml(record.distanceKm || "")}" placeholder="5.0" required><b>km</b></div></label><label class="measure-field"><span>実際に走った時間</span><div><input name="durationMinutes" type="number" inputmode="decimal" min="0.01" max="100000" step="0.1" value="${escapeHtml(record.durationMinutes || "")}" placeholder="35"><b>分</b></div></label></div><p class="micro-note">信号待ちなどを除いた、実際に走行・歩行していた時間。</p></div>
        <div class="rest-note" data-rest-fields${isRest ? "" : " hidden"}><strong>休養日として保存</strong><span>走行による数値結果は表示しません。身体記録やメモは必要な場合だけ追加できます。</span></div>
      </section>

      <section class="optional-stack">
        <details class="stage-card" data-run-fields${isRest ? " hidden" : ""}><summary><span class="stage-icon">2</span><span class="summary-copy"><small>任意</small><strong>コースと走行条件</strong><em>${hasDetailedCourse(course) ? "選択済み" : "未選択"}</em></span><i>⌄</i></summary><div class="stage-body"><p class="stage-intro">保存済みコースを使うと、坂・路面を毎回設定し直さずに済みます。</p>${renderRecentCourseShortcuts(recentCourses)}<p class="record-return-status" data-record-return-status role="status" aria-live="polite" hidden></p>${renderCourseEntry(course, isRest, { fromPlan: Boolean(selectedPlan) })}</div></details>
        ${renderCourseHiddenFields(course)}

        <details class="stage-card" data-run-fields${isRest ? " hidden" : ""}><summary><span class="stage-icon">3</span><span class="summary-copy"><small>任意</small><strong>比較しやすくする情報</strong><em>必要な項目だけ</em></span><i>⌄</i></summary><div class="stage-body"><p class="stage-intro">分かる項目だけ入力します。空欄のままでも保存できます。</p><div class="two-fields"><label class="field"><span>歩数</span><input name="steps" type="number" inputmode="numeric" min="0" max="10000000" step="1" value="${escapeHtml(record.steps || "")}" placeholder="例：6000"></label><label class="field"><span>歩数の取得方法</span><select name="stepsProvenance"><option value="UNKNOWN"${selected(record.stepsProvenance, "UNKNOWN")}>不明・未設定</option><option value="DEVICE_MEASURED"${selected(record.stepsProvenance, "DEVICE_MEASURED")}>端末・時計で計測</option><option value="ESTIMATED"${selected(record.stepsProvenance, "ESTIMATED")}>手入力・おおよそ</option></select></label></div><label class="field"><span>走り方</span><select name="runningFormat"><option value="UNKNOWN"${selected(record.runningFormat, "UNKNOWN")}>覚えていない・未設定</option><option value="CONTINUOUS_RUN"${selected(record.runningFormat, "CONTINUOUS_RUN")}>途中で歩かず走った</option><option value="RUN_WALK"${selected(record.runningFormat, "RUN_WALK")}>走りと歩きを混ぜた</option></select></label><div class="nested-panel" data-run-walk-container${String(record.runningFormat || "UNKNOWN").toUpperCase() === "RUN_WALK" ? "" : " hidden"}>${renderRunWalkDetails(record)}</div>${renderEnvironmentContext(record)}</div></details>

        <details class="stage-card"><summary><span class="stage-icon">4</span><span class="summary-copy"><small>任意</small><strong>気づきと次回</strong><em>必要な内容だけ</em></span><i>⌄</i></summary><div class="stage-body"><div class="linked-records"><button type="button" class="linked-card" data-action="open-record-subflow" data-subflow="subjective"><span class="linked-icon">＋</span><span><small>身体の記録</small><strong>今回の身体記録</strong><em data-subjective-summary-status>${escapeHtml(subjectiveSummaryFromFields(subjectiveFieldsFromFeedback(feedback)).label)}</em></span><i>›</i></button><button type="button" class="linked-card" data-action="open-record-subflow" data-subflow="personal"><span class="linked-icon">＋</span><span><small>使用したもの</small><strong>今回のシューズ</strong><em data-personal-summary-status>${escapeHtml(personalContextSummary(record).hasInput ? personalContextSummary(record).description : "未選択")}</em></span><i>›</i></button></div><div class="reflection-fields"><label class="field"><span>今回の気づき</span><textarea name="postRunReflection" maxlength="500" rows="2">${escapeHtml(record.reflectionContext?.postRunReflection || "")}</textarea></label><label class="field"><span>いつもとの違い</span><textarea name="perceivedDifference" maxlength="500" rows="2">${escapeHtml(record.reflectionContext?.perceivedDifference || "")}</textarea></label><label class="field"><span>次回確認したいこと</span><textarea name="nextCheckPoint" maxlength="500" rows="2">${escapeHtml(record.reflectionContext?.nextCheckPoint || "")}</textarea></label></div><input type="hidden" name="reflectionKeyPoint" value="${escapeHtml(record.reflectionContext?.reflectionKeyPoint || "")}"><input type="hidden" name="memo" value=""><div hidden aria-hidden="true"><input type="hidden" name="sleepSummary" value=""><input type="hidden" name="nutritionHydrationSummary" value=""><input type="hidden" name="lifestyleNote" value=""><input type="hidden" name="consultationTarget" value=""><input type="hidden" name="consultationQuestion" value=""></div></div></details>
      </section>

      ${renderEmbeddedSubjectiveSubflow(feedback)}${renderEmbeddedPersonalSubflow(record, settings)}
      <div class="desktop-save-area"><div><strong>${editing ? "入力内容を確認して更新" : "必須項目を確認して保存"}</strong><span data-prototype-save-hint>${isRest ? "休養日として保存できます。" : "距離と実際に走った時間を入力してください。"}</span><span class="draft-status" data-draft-status role="status" aria-live="polite"></span></div><button class="primary-save" type="submit">${editing ? "記録を更新して結果を見る" : "記録を保存して結果を見る"}</button></div>
    </form>
    <div class="mobile-save-bar" data-record-mobile-save-bar>${editing ? "" : '<button class="draft-button" type="button" data-action="save-record-draft">下書き</button>'}<button class="primary-save" type="submit" form="record-input-form">${editing ? "更新して結果を見る" : "保存して結果を見る"}</button></div>
  </div>`;
}

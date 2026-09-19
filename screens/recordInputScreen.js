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
    : hasPre
      ? `走る前 ${preValue} を記録済み`
      : hasPost
        ? `走った後 ${postValue} を記録済み`
        : "未記録";
  const actionText = editing ? "保存済み" : hasPost ? "記録済み" : hasPre ? "走った後を記録" : "記録する";
  const actionDisabled = editing || hasPost ? " disabled" : "";
  const phase = hasPre ? "after" : "before";
  const sourceFingerprint = entry?.sourceFingerprint || "";
  return `<div class="record-fatigue-inline" data-second-pillar-lifecycle data-run-id="${escapeHtml(linkedRunId)}">
    <div><small>任意</small><strong>${hasPre ? "走る前後の疲労感" : "走る前の疲労感"}</strong><span data-record-rof-status>${escapeHtml(status)}</span></div>
    <button type="button" class="button button--secondary" data-action="open-record-rof" data-phase="${phase}"${actionDisabled}>${escapeHtml(actionText)}</button>
    <p class="form-messages" data-second-pillar-message hidden></p>
  </div>
  <section class="record-rof-overlay" data-record-rof-overlay hidden aria-modal="true" role="dialog" aria-labelledby="record-rof-title">
    <div class="record-rof-sheet">
      <div class="record-sheet-grip" aria-hidden="true"></div>
      <header><div><p>疲労感の記録</p><h2 id="record-rof-title" data-record-rof-title>${phase === "after" ? "走った後の疲労感" : "走る前の疲労感"}</h2></div><button type="button" class="record-sheet-close" data-action="close-record-rof" aria-label="閉じる">×</button></header>
      <p data-record-rof-question>今の疲労感を0〜10で選んでください。</p>
      <div class="record-rof-scale">
        <div class="record-rof-current"><span>選択値</span><strong data-record-rof-value>—</strong><em data-record-rof-descriptor>数値を選択</em></div>
        <input type="range" min="0" max="10" step="1" value="5" data-record-rof-slider aria-label="疲労感 0から10">
        <div class="record-rof-ticks" aria-hidden="true">${Array.from({ length: 11 }, (_, value) => `<span>${value}</span>`).join("")}</div>
        <div class="record-rof-anchor"><small>尺度の正式な言葉</small><span data-record-rof-anchor>2・${escapeHtml(ROF_J_DESCRIPTOR_MAP[2])} ／ 4・${escapeHtml(ROF_J_DESCRIPTOR_MAP[4])}</span></div>
      </div>
      <button type="button" class="button button--primary" data-action="record-rof-value" disabled>この値を記録</button>
      <button type="button" class="button button--text" data-action="record-rof-post-only"${phase === "after" ? " hidden" : ""}>すでに走り終えている場合：走った後だけ記録</button>
      <details><summary>尺度について</summary><p>0〜10の1つの値で、その時点で感じる主観的な疲労感を記録します。12部位のReference-100とは数値統合しません。</p>${sourceFingerprint ? `<small>ROF-J source registered</small>` : ""}</details>
    </div>
  </section>`;
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
      <label class="field field--compact"><span>勾配方向</span><select name="runWalkSectionDirection_${index}"><option value="FLAT"${selected(direction, "FLAT")}>平坦</option><option value="UPHILL"${selected(direction, "UPHILL")}>上り</option><option value="DOWNHILL"${selected(direction, "DOWNHILL")}>下り</option></select></label>
      <label class="field field--compact"><span>勾配（%）</span><input name="runWalkSectionGrade_${index}" type="number" min="0" max="100" step="0.1" value="${escapeHtml(grade)}"></label>
      <label class="field field--compact"><span>路面</span><select name="runWalkSectionSurface_${index}"><option value="UNKNOWN"${selected(surface, "UNKNOWN")}>未設定</option>${RUN_WALK_SURFACE_OPTIONS.map(([category, , label]) => `<option value="${category}"${selected(surface, category)}>${label}</option>`).join("")}</select></label>
    </div>`;
  }).join("");
  return `<div class="run-walk-details" data-run-walk-fields${active ? "" : " hidden"}>
    <div class="inline-helper inline-helper--important"><strong>RUN_WALKの部位別数値は「走った区間」を対象にします。</strong><p>歩いた区間を走行として扱いません。走った距離と時間を入力してください。</p></div>
    <div class="field-grid field-grid--two">
      <label class="field"><span>走った距離（km） <strong aria-label="RUN_WALK時は必須">RUN_WALK時は必須</strong></span><input name="runWalkRunningDistanceKm" type="number" min="0.01" max="10000" step="0.01" value="${escapeHtml(record.runWalkRunningDistanceKm ?? "")}" placeholder="例：4.0" data-run-walk-required></label>
      <label class="field"><span>走った時間（分） <strong aria-label="RUN_WALK時は必須">RUN_WALK時は必須</strong></span><input name="runWalkRunningDurationMinutes" type="number" min="0.01" max="100000" step="0.1" value="${escapeHtml(record.runWalkRunningDurationMinutes ?? "")}" placeholder="例：25" data-run-walk-required></label>
    </div>
    <details class="record-run-walk-composition"><summary>走った区間の坂・路面内訳（mixed条件では必須）</summary><p class="field-help">走った区間に複数の坂や路面がある場合は、その割合を合計100%で入力します。歩いた区間は含めません。区間ごとの速度は自動で補いません。</p>${rows}</details>
    <p class="field-help">殿部・大腿前面・大腿後面・下腿後面は、平均速度2.25〜3.33 m/sで目安を表示します。範囲外では、この4部位は「目安なし」です。ほかの部位は、確認できる条件だけを反映します。</p>
  </div>`;
}

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const courseStatus = hasDetailedCourse(course) ? "選択済み" : "任意";
  return `<section class="record-course-entry" id="record-course-entry" data-run-fields${isRest ? " hidden" : ""} aria-labelledby="record-course-entry-title">
    <div class="record-course-entry__heading"><div><p>保存コース</p><h3 id="record-course-entry-title">今回のコース</h3></div><span class="disclosure-status">${escapeHtml(courseStatus)}</span></div>
    ${renderCourseSummary(course, { headingLevel: 4, compact: true })}
    <input type="hidden" name="surfaceWetSlipState" value="${escapeHtml(course.surfaceWetSlipState || "UNKNOWN")}" data-schema-current-field="surfaceWetSlipState">
    ${renderPlanCourseLibrarySaveOption(course, { fromPlan, isRest })}
    <div class="record-course-entry__actions"><button class="button button--secondary record-action-button record-action-button--course" type="button" data-action="open-course-library">コースを選ぶ・作る</button></div>
  </section>`;
}

function recentCourseTimestamp(course = {}) {
  const value = Date.parse(course.updatedAt || course.createdAt || "");
  return Number.isFinite(value) ? value : 0;
}

function renderRecentCourseShortcuts(courses = []) {
  if (!courses.length) return '<p class="record-course-shortcuts__empty">保存済みコースはまだありません。</p>';
  return `<div class="record-course-shortcuts" aria-label="最近使った保存コース">
    <p class="record-course-shortcuts__label">すぐ使う</p>
    <div class="record-course-shortcuts__grid">${courses.map((course) => `<button type="button" class="record-course-shortcut" data-action="apply-saved-course" data-course-id="${escapeHtml(course.id || "")}"><strong>${escapeHtml(course.name || "名称なし")}</strong><small>今回の入力へ反映</small></button>`).join("")}</div>
  </div>`;
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
  return `<details class="record-optional-details"><summary><span><strong>環境を任意で残す</strong><small>気温と環境メモを、あとで比較できる文脈として保存します。12部位の数値係数にはしません。</small></span></summary><div class="field-grid field-grid--two record-optional-details__body">
    <input type="hidden" name="weather" value="${escapeHtml(context.weather || "")}">
    <input type="hidden" name="windSummary" value="${escapeHtml(context.windSummary || "")}">
    <label class="field"><span>気温（℃）</span><input name="temperatureC" type="number" inputmode="decimal" min="-50" max="60" step="0.1" value="${escapeHtml(context.temperatureC ?? "")}" placeholder="例：24"></label>
    <label class="field"><span>環境メモ</span><textarea name="environmentNote" maxlength="500" rows="3" placeholder="天候、風、暑さ、湿り、混雑などをまとめて任意で残せます。">${escapeHtml(context.environmentNote || "")}</textarea></label>
  </div></details>`;
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

  return `<section class="screen screen--record-input">
    ${renderPageHeading({
      eyebrow: "今日の記録",
      title: editing ? "保存した記録を確認・更新" : selectedPlan ? "予定を実績として記録" : "今日の記録",
      description: editing ? "保存した記録を更新します。" : "走った距離や時間などの基本情報を先に入力します。コースや振り返りは必要なときだけ追加します。",
    })}
    ${renderRecordInputGuide({ selectedPlan, editing })}
    ${editing ? `<p class="editing-banner">${renderStatusLabel("保存済み記録を編集中", "info")} ${escapeHtml(formatLocalDate(record.date))}の記録を更新します。</p>` : selectedPlan ? `<p class="editing-banner">${renderStatusLabel("予定から転記", "info")} ${escapeHtml(selectedPlan.title || "保存した予定")}から距離・時間・コース条件を転記しました。歩数などは実績に合わせて入力します。</p>` : savedDraft ? `<p class="editing-banner">${renderStatusLabel("入力途中から再開", "info")} 端末内に保存した下書きを開きました。確認してから記録を保存してください。</p>` : ""}
    <form id="record-input-form" class="record-form record-form--staged" data-editing="${editing ? "true" : "false"}" novalidate>
      <input type="hidden" name="recordId" value="${escapeHtml(effectiveRecordId)}">
      <input type="hidden" name="planId" value="${escapeHtml(selectedPlan?.id || "")}">
      <div class="form-messages" data-form-messages tabindex="-1" hidden></div>

      <section class="form-section form-section--stage form-section--required" data-information-role="fact" aria-labelledby="record-basic-title">
        <div class="section-heading"><p>1. 基本情報</p><h2 id="record-basic-title">今日の走行</h2></div>
        <p class="form-stage-intro">あとから走行量を正しく見返すための基本情報を入力します。</p>
        ${renderRofJInlineAndOverlay({ services, linkedRunId, editing })}
        <fieldset class="field fieldset-field activity-type-choice"><legend>記録の種類 <strong aria-label="必須">必須</strong></legend><div class="segmented-control"><label><input type="radio" name="activityType" value="run"${checked(!isRest)}><span>走行</span></label><label><input type="radio" name="activityType" value="rest"${checked(isRest)}><span>休養</span></label></div></fieldset>
        <label class="field record-date-field"><span>日付 <strong aria-label="必須">必須</strong></span><input name="date" type="date" value="${escapeHtml(record.date)}" required></label>
        <div data-run-fields${isRest ? " hidden" : ""}>
          <div class="record-measure-grid record-measure-grid--required">
            <label class="field record-measure-field"><span>距離（km） <strong aria-label="必須">必須</strong></span><input name="distanceKm" type="number" inputmode="decimal" min="0.01" max="10000" step="0.01" value="${escapeHtml(record.distanceKm || "")}" placeholder="例：5.0" required></label>
            <label class="field record-measure-field"><span>実走時間（分） <strong aria-label="必須">必須</strong></span><input name="durationMinutes" type="number" inputmode="decimal" min="0.01" max="100000" step="0.1" value="${escapeHtml(record.durationMinutes || "")}" placeholder="例：35" required></label>
          </div>
          <p class="field-help">信号待ちなどを除いた、実際に走行・歩行していた時間を入力します。</p>
        </div>
        <div class="rest-entry-note" data-rest-fields${isRest ? "" : " hidden"}><strong>休養日として保存します。</strong><p>走行による数値結果を表示しない記録です。メモや身体記録は必要な場合だけ追加できます。</p></div>
      </section>

      <section class="form-section form-section--stage form-section--course" data-information-role="fact" data-run-fields${isRest ? " hidden" : ""} aria-labelledby="record-course-title">
        <div class="section-heading section-heading--with-status"><div><p>2. コースと条件</p><h2 id="record-course-title">コースと走行条件</h2></div><span>任意</span></div>
        <p class="form-stage-intro">保存したコースを使い回すと、坂・路面を毎回設定し直さずに済みます。</p>
        ${renderRecentCourseShortcuts(recentCourses)}
        <p class="record-return-status" data-record-return-status role="status" aria-live="polite" hidden></p>
        ${renderCourseEntry(course, isRest, { fromPlan: Boolean(selectedPlan) })}
        <p class="record-snapshot-note">選択した条件は今回の記録へ、保存時点の内容として残ります。今回だけ変更しても、保存元コースと過去記録は自動で書き換えません。</p>
      </section>
      ${renderCourseHiddenFields(course)}

      <section class="form-section form-section--stage form-section--accuracy" data-information-role="condition" data-run-fields${isRest ? " hidden" : ""} aria-labelledby="record-accuracy-title">
        <div class="section-heading"><p>3. 比較しやすくする情報</p><h2 id="record-accuracy-title">似た記録を比べやすくする情報</h2></div>
        <p class="form-stage-intro">分かる項目だけ入力してください。空欄のままでも保存できます。</p>
        <div class="field-grid field-grid--two">
          <label class="field"><span>歩数（任意）</span><input name="steps" type="number" inputmode="numeric" min="0" max="10000000" step="1" value="${escapeHtml(record.steps || "")}" placeholder="例：6000"><small>歩数は、走るリズムを振り返り、同じような過去記録を見分ける手掛かりになります。</small></label>
          <label class="field"><span>歩数の取得方法（任意）</span><select name="stepsProvenance"><option value="UNKNOWN"${selected(record.stepsProvenance, "UNKNOWN")}>不明・未設定</option><option value="DEVICE_MEASURED"${selected(record.stepsProvenance, "DEVICE_MEASURED")}>端末・時計で計測</option><option value="ESTIMATED"${selected(record.stepsProvenance, "ESTIMATED")}>手入力・おおよそ</option></select><small>歩数を入力した場合に、計測した値か、おおよその手入力かを選びます。</small></label>
          <label class="field"><span>走行形式（任意） <small class="input-role-tag">走り方を振り返る</small></span><select name="runningFormat"><option value="UNKNOWN"${selected(record.runningFormat, "UNKNOWN")}>覚えていない・未設定</option><option value="CONTINUOUS_RUN"${selected(record.runningFormat, "CONTINUOUS_RUN")}>途中で歩かず走った</option><option value="RUN_WALK"${selected(record.runningFormat, "RUN_WALK")}>走りと歩きを混ぜた</option></select><small>途中で歩いたかを残します。分からなければ未設定のまま保存できます。</small></label>
        </div>
        ${renderRunWalkDetails(record)}
        ${renderEnvironmentContext(record)}
        <p class="record-result-information-note" data-information-role="condition">距離と実走時間を入力すれば保存できます。保存後は、その日の走行条件と結果を一緒に確認できます。</p>
      </section>

      <section class="form-section form-section--stage form-section--reflection" data-information-role="personal" aria-labelledby="record-reflection-title">
        <div class="section-heading"><p>4. 気づきと次回</p><h2 id="record-reflection-title">気づきと次回</h2></div>
        <p class="form-stage-intro">数値結果とは別に、自分が感じたことと次に確認したいことを残します。</p>
        <div class="record-linked-inputs">
          <button type="button" class="record-linked-card" data-action="open-record-subflow" data-subflow="subjective"><span aria-hidden="true">＋</span><span><small>身体の記録</small><strong>今回の身体記録</strong><em data-subjective-summary-status>${escapeHtml(subjectiveSummaryFromFields(subjectiveFieldsFromFeedback(feedback)).label)}</em></span><i aria-hidden="true">›</i></button>
          <button type="button" class="record-linked-card" data-action="open-record-subflow" data-subflow="personal"><span aria-hidden="true">＋</span><span><small>使用したもの</small><strong>今回のシューズ</strong><em data-personal-summary-status>${escapeHtml(personalContextSummary(record).hasInput ? personalContextSummary(record).description : "未選択")}</em></span><i aria-hidden="true">›</i></button>
        </div>
        <div class="record-reflection-fields">
          <label class="field"><span>今回の気づき</span><textarea name="postRunReflection" maxlength="500" rows="2" placeholder="走って気づいたこと">${escapeHtml(record.reflectionContext?.postRunReflection || "")}</textarea></label>
          <label class="field"><span>いつもとの違い</span><textarea name="perceivedDifference" maxlength="500" rows="2" placeholder="普段と違った点があれば">${escapeHtml(record.reflectionContext?.perceivedDifference || "")}</textarea></label>
          <label class="field"><span>次回確認したいこと</span><textarea name="nextCheckPoint" maxlength="500" rows="2" placeholder="次に自分で確かめたいこと">${escapeHtml(record.reflectionContext?.nextCheckPoint || "")}</textarea></label>
        </div>
        <input type="hidden" name="reflectionKeyPoint" value="${escapeHtml(record.reflectionContext?.reflectionKeyPoint || "")}">
        <input type="hidden" name="memo" value="">
        <div hidden aria-hidden="true"><input type="hidden" name="sleepSummary" value=""><input type="hidden" name="nutritionHydrationSummary" value=""><input type="hidden" name="lifestyleNote" value=""><input type="hidden" name="consultationTarget" value=""><input type="hidden" name="consultationQuestion" value=""></div>
      </section>

      ${renderEmbeddedSubjectiveSubflow(feedback)}
      ${renderEmbeddedPersonalSubflow(record, settings)}

      <div class="form-submit-area"><div><strong>${editing ? "入力内容を確認して更新" : "必須項目を確認して保存"}</strong><p>保存後、12部位のReference-100と、疲労感を記録した場合はその値・変化を別々に確認できます。</p><p class="draft-status" data-draft-status role="status" aria-live="polite"></p></div><div class="form-submit-actions"><button class="button button--primary" type="submit">${editing ? "記録を更新して結果を見る" : "記録を保存して結果を見る"}</button>${editing ? "" : `<button class="button button--secondary" type="button" data-action="save-record-draft">入力途中を保存</button>`}</div></div>
    </form>
    <div class="record-mobile-save-bar" data-record-mobile-save-bar>${editing ? "" : '<button class="button button--secondary" type="button" data-action="save-record-draft">下書き</button>'}<button class="button button--primary" type="submit" form="record-input-form">${editing ? "更新して結果を見る" : "保存して結果を見る"}</button></div>

    <section class="record-management-links" aria-labelledby="record-management-title"><div><p>保存後の管理</p><h2 id="record-management-title">保存済みデータと管理</h2><p>入力後に、必要な場合だけ開きます。</p></div><div><a class="button button--secondary" href="#/history">保存済み記録を見る</a><a class="text-link" href="#/settings?section=data">バックアップ・復元・削除を確認</a></div></section>
  </section>`;
}

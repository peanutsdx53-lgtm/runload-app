import { SURFACE_FIELDS, hasTreadmillOutdoorSurfaceMixFromCourse, hasTreadmillOutdoorSurfaceMixFromComponents, BODY_AREA_LATERALITY, BODY_AREA_LATERALITY_LABELS, BODY_AREA_TAXONOMY, SAFETY_FLAG_KEYS } from "../../core/runloadCore.js";

import { ROF_J_DESCRIPTOR_MAP } from "../../core/secondPillarRofJ.js";
import { booleanValue, numberValue, optionalNumberValue, setHidden, showFormMessages } from "./formUtilities.js";
import { primarySurfaceSummary, slopeSummary } from "../coursePresentation.js";
import { beginRecordInputJourney, clearRecordInputWorkspace, refreshActiveRecordInputWorkspace, restoreRecordInputWorkspace, saveRecordInputWorkspace } from "../recordInputWorkspace.js";
import { subjectiveSummaryFromFields } from "../subjectivePresentation.js";
import { RECORD_REGIONAL_SUBJECTIVE_AREAS } from "../recordEmbeddedSubflows.js";
import { PERSONAL_CONTEXT_FIELD_NAMES, personalContextFromFields, personalSummaryFromFields } from "../personalContextPresentation.js";
import { confirmGradeDomain } from "./gradeDomainConfirmation.js";
import { commitPendingRunMeasurement } from "../runMeasurementState.js";

function updateInputFormVisibility(form) {
  const activityType = form.querySelector('[name="activityType"]:checked')?.value || "run";
  const runningFormat = String(form.elements.namedItem("runningFormat")?.value || "UNKNOWN").toUpperCase();
  const runWalk = activityType === "run" && runningFormat === "RUN_WALK";
  form.querySelectorAll("[data-run-fields]").forEach((element) => setHidden(element, activityType === "rest"));
  form.querySelectorAll("[data-rest-fields]").forEach((element) => setHidden(element, activityType !== "rest"));
  form.querySelectorAll("[data-run-walk-fields], [data-run-walk-container]").forEach((element) => setHidden(element, !runWalk));
  form.querySelectorAll("[data-run-walk-required]").forEach((element) => { element.required = runWalk; });
}

function updateRecordSubmitAvailability(form) {
  const activityType = form.querySelector('[name="activityType"]:checked')?.value || "run";
  const date = String(form.elements.namedItem("date")?.value || "").trim();
  const distance = Number(form.elements.namedItem("distanceKm")?.value);
  const duration = Number(form.elements.namedItem("durationMinutes")?.value);
  const distanceReady = distance > 0;
  const durationReady = duration > 0;
  const requiredCount = (distanceReady ? 1 : 0) + (durationReady ? 1 : 0);
  const ready = Boolean(date) && (activityType === "rest" || (distanceReady && durationReady));
  document.querySelectorAll('#record-input-form [type="submit"], [form="record-input-form"][type="submit"]').forEach((button) => { button.disabled = !ready; });

  const progress = form.querySelector("[data-record-required-progress]");
  if (progress) {
    progress.textContent = activityType === "rest"
      ? "休養として保存"
      : `距離・時間 ${requiredCount} / 2`;
  }

  const hint = form.querySelector("[data-record-save-hint]");
  if (hint) {
    hint.textContent = activityType === "rest"
      ? "休養日として保存できます。"
      : ready
        ? "必須項目が揃いました。"
        : "距離と実際に走った時間を入力してください。";
  }

  const dateDisplay = form.querySelector("[data-record-date-display]");
  const readableDate = date ? date.replaceAll("-", "/") : "—";
  if (dateDisplay) dateDisplay.textContent = readableDate;

  const readinessProgress = form.querySelector("[data-save-readiness-progress]");
  if (readinessProgress) readinessProgress.textContent = activityType === "rest" ? "保存可" : `${requiredCount} / 2`;

  const readinessBar = form.querySelector("[data-save-readiness-bar]");
  if (readinessBar) readinessBar.style.width = activityType === "rest" ? "100%" : `${requiredCount * 50}%`;

  const activitySummary = form.querySelector("[data-save-context-activity]");
  if (activitySummary) activitySummary.textContent = activityType === "rest" ? "休養" : "走行";

  const dateSummary = form.querySelector("[data-save-context-date]");
  if (dateSummary) dateSummary.textContent = readableDate;

  const runChecklist = form.querySelector("[data-save-run-checklist]");
  if (runChecklist) runChecklist.hidden = activityType === "rest";

  const setChecklistState = (key, complete) => {
    const row = form.querySelector(`[data-save-check="${key}"]`);
    const state = form.querySelector(`[data-save-check-state="${key}"]`);
    if (row) row.classList.toggle("is-complete", complete);
    if (state) state.textContent = complete ? "入力済み" : "未入力";
  };
  setChecklistState("distance", distanceReady);
  setChecklistState("duration", durationReady);
}

const SURFACE_CLASS_BY_RECORD_KEY = Object.freeze({
  pavedPercent: "REF_HARD_EVEN_STABLE",
  trackPercent: "REF_HARD_EVEN_STABLE",
  treadmillPercent: "REF_HARD_EVEN_STABLE",
  soilPercent: "KNOWN_OTHER",
  trailPercent: "EXPLICIT_UNEVEN",
  naturalGrassPercent: "DRY_STABLE_GRASS_TURF",
  artificialTurfPercent: "DRY_STABLE_GRASS_TURF",
  sandPercent: "DEEP_DRY_SOFT_SAND",
});

function readCourseSections(formData, distanceKm) {
  const rows = Array.from({ length: 5 }, (_, index) => {
    const sharePercent = optionalNumberValue(formData, `sectionShare_${index}`);
    if (!(sharePercent > 0)) return null;
    const gradeDirection = String(formData.get(`sectionDirection_${index}`) || "UNKNOWN");
    const magnitude = Math.abs(Number(optionalNumberValue(formData, `sectionGrade_${index}`) || 0));
    const signedGrade = gradeDirection === "DOWNHILL" ? -magnitude : gradeDirection === "UPHILL" ? magnitude : gradeDirection === "FLAT" ? 0 : null;
    return {
      sectionId: `section-${index + 1}`,
      sharePercent,
      distanceKm: Number(distanceKm) > 0 ? Number(distanceKm) * sharePercent / 100 : null,
      gradeDirection,
      gradePercent: signedGrade,
    };
  }).filter(Boolean);
  return rows;
}

function deriveModelSurfaceRepresentation(shares = {}) {
  const active = SURFACE_FIELDS.filter(({ recordKey }) => Number(shares[recordKey] || 0) > 0);
  const dominant = [...active].sort((left, right) => Number(shares[right.recordKey] || 0) - Number(shares[left.recordKey] || 0))[0];
  return {
    modelSurfaceClass: dominant ? SURFACE_CLASS_BY_RECORD_KEY[dominant.recordKey] : "UNKNOWN",
    modelSurfaceProfile: active.map(({ recordKey }) => ({
      sharePercent: Number(shares[recordKey] || 0),
      surfaceClass: SURFACE_CLASS_BY_RECORD_KEY[recordKey],
    })),
  };
}

export function readCourse(formData, distanceKm = 0) {
  const gradeInputMode = String(formData.get("gradeInputMode") || "UNKNOWN");
  const sections = gradeInputMode === "SECTIONS" ? readCourseSections(formData, distanceKm) : [];
  const shares = Object.fromEntries(SURFACE_FIELDS.map(({ recordKey }) => [recordKey, numberValue(formData, recordKey)]));
  const modelSurface = deriveModelSurfaceRepresentation(shares);
  const upRows = sections.filter((item) => item.gradeDirection === "UPHILL");
  const downRows = sections.filter((item) => item.gradeDirection === "DOWNHILL");
  const sumShare = (rows) => rows.reduce((sum, item) => sum + Number(item.sharePercent || 0), 0);
  const weightedGrade = (rows) => {
    const total = sumShare(rows);
    return total > 0 ? rows.reduce((sum, item) => sum + Math.abs(Number(item.gradePercent || 0)) * Number(item.sharePercent || 0), 0) / total : 0;
  };
  return {
    id: String(formData.get("courseId") || ""),
    name: String(formData.get("courseName") || ""),
    routePattern: String(formData.get("routePattern") || "UNKNOWN"),
    surfaceWetSlipState: String(formData.get("surfaceWetSlipState") || "UNKNOWN"),
    gradeInputMode,
    surfaceInputMode: String(formData.get("surfaceInputMode") || "UNKNOWN"),
    gradeKnowledge: gradeInputMode === "FLAT" ? "KNOWN_FLAT" : ["SUMMARY", "SECTIONS"].includes(gradeInputMode) ? "KNOWN_PROFILE" : String(formData.get("gradeKnowledge") || "UNKNOWN"),
    upPercent: gradeInputMode === "SECTIONS" ? sumShare(upRows) : numberValue(formData, "upPercent"),
    downPercent: gradeInputMode === "SECTIONS" ? sumShare(downRows) : numberValue(formData, "downPercent"),
    upGradePercent: gradeInputMode === "SECTIONS" ? weightedGrade(upRows) : numberValue(formData, "upGradePercent"),
    downGradePercent: gradeInputMode === "SECTIONS" ? weightedGrade(downRows) : numberValue(formData, "downGradePercent"),
    sections,
    ...modelSurface,
    ...shares,
  };
}

export const COURSE_FORM_FIELDS = Object.freeze([
  ["id", "courseId"],
  ["name", "courseName"],
  ["routePattern", "routePattern"],
  ["gradeInputMode", "gradeInputMode"],
  ["surfaceInputMode", "surfaceInputMode"],
  ["gradeKnowledge", "gradeKnowledge"],
  ["upPercent", "upPercent"],
  ["downPercent", "downPercent"],
  ["upGradePercent", "upGradePercent"],
  ["downGradePercent", "downGradePercent"],
  ["modelSurfaceClass", "modelSurfaceClass"],
  ...SURFACE_FIELDS.map(({ recordKey }) => [recordKey, recordKey]),
  ...Array.from({ length: 5 }, (_, index) => [
    [`sections.${index}.sharePercent`, `sectionShare_${index}`],
    [`sections.${index}.gradeDirection`, `sectionDirection_${index}`],
    [`sections.${index}.gradePercent`, `sectionGrade_${index}`],
  ]).flat(),
]);

function getCoursePath(course, path) {
  if (!String(path).includes(".")) return course?.[path];
  return String(path).split(".").reduce((value, key) => value?.[key], course);
}

export function courseFormValues(course = {}) {
  return Object.fromEntries(COURSE_FORM_FIELDS.map(([courseKey, formName]) => {
    let value = getCoursePath(course, courseKey);
    if (courseKey.endsWith(".gradePercent") && value != null) value = Math.abs(Number(value));
    if (value === undefined || value === null) {
      if (["id", "name"].includes(courseKey)) value = "";
      else if (["routePattern", "gradeInputMode", "surfaceInputMode", "gradeKnowledge", "modelSurfaceClass"].includes(courseKey)) value = "UNKNOWN";
      else if (courseKey.endsWith(".gradeDirection")) value = "FLAT";
      else if (courseKey.includes("sections.")) value = "";
      else value = 0;
    }
    return [formName, value];
  }));
}

export function applyCoursePresetToForm(form, course = {}) {
  const values = courseFormValues(course);
  COURSE_FORM_FIELDS.forEach(([, formName]) => {
    const control = form?.elements?.namedItem?.(formName) || form?.querySelector?.(`[name="${formName}"]`);
    if (control) control.value = String(values[formName] ?? "");
  });
  return values;
}

function updateCourseSummary(form) {
  const distance = Number(form.elements.namedItem("distanceKm")?.value || 0);
  const course = readCourse(new FormData(form), distance);
  const summary = form.querySelector(".record-course-entry .course-summary");
  if (summary) {
    const heading = summary.querySelector("h4");
    const paragraphs = summary.querySelectorAll("p");
    if (heading) heading.textContent = course.name || "コース名なし";
    if (paragraphs[0]) paragraphs[0].innerHTML = `<strong>主な路面：</strong>${primarySurfaceSummary(course)}`;
    if (paragraphs[1]) paragraphs[1].innerHTML = `<strong>坂道：</strong>${slopeSummary(course)}`;
    if (paragraphs[2]) paragraphs[2].innerHTML = `<strong>入力方法：</strong>${course.surfaceInputMode === "MIXED" ? "複数路面の割合" : course.surfaceInputMode === "SINGLE" ? "主な路面1種類" : "路面は未入力"}`;
  }
  const selectedCourseNode = form.querySelector("[data-record-selected-course]");
  const courseNameNode = form.querySelector("[data-record-course-name]");
  const courseMetaNode = form.querySelector("[data-record-course-meta]");
  const hasCourse = Boolean(course.name) || String(course.gradeKnowledge || "UNKNOWN") !== "UNKNOWN" || String(course.modelSurfaceClass || "UNKNOWN") !== "UNKNOWN";
  if (selectedCourseNode) selectedCourseNode.hidden = !hasCourse;
  if (courseNameNode) courseNameNode.textContent = course.name || "名称なし";
  if (courseMetaNode) courseMetaNode.textContent = [primarySurfaceSummary(course), slopeSummary(course)].filter(Boolean).join("・") || "条件を保存";
}

function fieldsFromForm(form) {
  const formData = new FormData(form);
  const fields = {};
  for (const [name, value] of formData.entries()) {
    if (!(name in fields)) fields[name] = String(value);
  }
  BODY_AREA_TAXONOMY.forEach((area) => {
    fields[`bodyArea_${area.key}`] = String(formData.get(`bodyArea_${area.key}`) || "0");
    fields[`bodyAreaLaterality_${area.key}`] = String(formData.get(`bodyAreaLaterality_${area.key}`) || BODY_AREA_LATERALITY.unknown);
  });
  return fields;
}

function updateSubjectiveSummary(form) {
  const summary = subjectiveSummaryFromFields(fieldsFromForm(form));
  const status = form.querySelector("[data-subjective-summary-status]");
  if (status) status.textContent = summary.label;
}

function readPersonalContextFieldsFromForm(form) {
  const formData = new FormData(form);
  const fields = {};
  PERSONAL_CONTEXT_FIELD_NAMES.forEach((name) => {
    fields[name] = name.startsWith("personalFocus_")
      ? (formData.get(name) ? "1" : "__unchecked__")
      : String(formData.get(name) || "");
  });
  return fields;
}

function updatePersonalSummary(form) {
  const summary = personalSummaryFromFields(readPersonalContextFieldsFromForm(form));
  const status = form.querySelector("[data-personal-summary-status]");
  const detail = form.querySelector("[data-record-personal-subflow-summary]");
  if (status) status.textContent = summary.hasInput ? summary.description : "未選択";
  if (detail) detail.textContent = summary.description;
}

function readPersonalContext(formData) {
  const fields = {};
  PERSONAL_CONTEXT_FIELD_NAMES.forEach((name) => {
    if (name.startsWith("personalFocus_") || name.startsWith("personalEquipment_")) fields[name] = formData.get(name) ? "1" : "__unchecked__";
    else fields[name] = String(formData.get(name) || "");
  });
  return personalContextFromFields(fields);
}

function recordInputReturnTo(context) {
  const parameters = new URLSearchParams(context?.parameters || undefined);
  parameters.delete("resume");
  const query = parameters.toString();
  return `#/record-input${query ? `?${query}` : ""}`;
}

function secondPillarMessage(form, message, { error = false } = {}) {
  const target = form.querySelector("[data-second-pillar-message]");
  if (!target) return;
  target.hidden = false;
  target.textContent = message;
  target.classList.toggle("form-messages--error", error);
}

function lifecycleNavigationParameters(context, runId) {
  const parameters = new URLSearchParams(context?.parameters || undefined);
  parameters.set("resume", "1");
  parameters.set("runId", runId);
  return parameters;
}

function rofAnchorText(value) {
  const anchors = [2, 4, 6, 8, 10];
  if (value === 0) return "0・まったく疲労感がない ／ 2・" + ROF_J_DESCRIPTOR_MAP[2];
  if (ROF_J_DESCRIPTOR_MAP[value]) return `${value}・${ROF_J_DESCRIPTOR_MAP[value]}`;
  if (value < 2) return `0・まったく疲労感がない ／ 2・${ROF_J_DESCRIPTOR_MAP[2]}`;
  for (let index = 0; index < anchors.length - 1; index += 1) {
    const lower = anchors[index];
    const upper = anchors[index + 1];
    if (value > lower && value < upper) return `${lower}・${ROF_J_DESCRIPTOR_MAP[lower]} ／ ${upper}・${ROF_J_DESCRIPTOR_MAP[upper]}`;
  }
  return `8・${ROF_J_DESCRIPTOR_MAP[8]} ／ 10・${ROF_J_DESCRIPTOR_MAP[10]}`;
}

function bindSecondPillarLifecycle(form, { services, router, context }) {
  if (!services.secondPillar) return;
  const overlay = form.querySelector("[data-record-rof-overlay]");
  const slider = form.querySelector("[data-record-rof-slider]");
  const valueOutput = form.querySelector("[data-record-rof-value]");
  const descriptor = form.querySelector("[data-record-rof-descriptor]");
  const anchor = form.querySelector("[data-record-rof-anchor]");
  const title = form.querySelector("[data-record-rof-title]");
  const recordAction = form.querySelector('[data-action="record-rof-value"]');
  const postOnlyAction = form.querySelector('[data-action="record-rof-post-only"]');
  const recordIdControl = form.elements.namedItem("recordId");
  let phase = form.querySelector('[data-action="open-record-rof"]')?.dataset.phase || "before";
  let touched = false;

  const refreshPreview = () => {
    if (!slider || !valueOutput || !descriptor || !anchor || !recordAction) return;
    if (!touched) {
      valueOutput.textContent = "—";
      descriptor.textContent = "数値を選択";
      anchor.textContent = `2・${ROF_J_DESCRIPTOR_MAP[2]} ／ 4・${ROF_J_DESCRIPTOR_MAP[4]}`;
      recordAction.disabled = true;
      return;
    }
    const value = Number(slider.value);
    valueOutput.textContent = String(value);
    descriptor.textContent = value === 0 ? "まったく疲労感がない" : (ROF_J_DESCRIPTOR_MAP[value] || "");
    anchor.textContent = rofAnchorText(value);
    recordAction.disabled = false;
  };
  const open = (nextPhase) => {
    phase = nextPhase;
    touched = false;
    if (slider) slider.value = "5";
    if (title) title.textContent = phase === "after" ? "走った後の疲労感" : "走る前の疲労感";
    if (postOnlyAction) postOnlyAction.hidden = phase === "after";
    if (overlay) overlay.hidden = false;
    document.body.classList.add("record-overlay-open");
    refreshPreview();
  };
  const close = () => {
    if (overlay) overlay.hidden = true;
    document.body.classList.remove("record-overlay-open");
  };
  const bindRunAndNavigate = (runId) => {
    if (recordIdControl) recordIdControl.value = runId;
    saveDraftFromForm(form, services, false);
    saveRecordInputWorkspace(form);
    router.navigateToScreen("record-input", lifecycleNavigationParameters(context, runId));
  };

  form.querySelector('[data-action="open-record-rof"]')?.addEventListener("click", (event) => open(event.currentTarget.dataset.phase || "before"));
  form.querySelector('[data-action="close-record-rof"]')?.addEventListener("click", close);
  overlay?.addEventListener("click", (event) => { if (event.target === overlay) close(); });
  slider?.addEventListener("input", () => { touched = true; refreshPreview(); });
  slider?.addEventListener("change", () => { touched = true; refreshPreview(); });
  postOnlyAction?.addEventListener("click", () => open("after"));

  recordAction?.addEventListener("click", () => {
    if (!touched) return;
    const value = Number(slider?.value);
    if (!Number.isInteger(value) || value < 0 || value > 10) {
      secondPillarMessage(form, "疲労感を0〜10の整数から選択してください。", { error: true });
      return;
    }
    if (phase === "before") {
      const begun = services.secondPillar.beginLifecycle({ createdAt: new Date().toISOString() });
      if (!begun.ok) return secondPillarMessage(form, "疲労感の記録を開始できませんでした。通常の走行記録はそのまま保存できます。", { error: true });
      const runId = begun.state.runId;
      const pre = services.secondPillar.capturePreDirect(runId, value, new Date().toISOString());
      if (!pre.ok) return secondPillarMessage(form, "走る前の疲労感を保存できませんでした。", { error: true });
      const started = services.secondPillar.markRunStart(runId, new Date().toISOString());
      if (!started.ok) return secondPillarMessage(form, "疲労感は保存しましたが、走行開始時刻を保存できませんでした。", { error: true });
      close();
      bindRunAndNavigate(runId);
      return;
    }

    let runId = String(recordIdControl?.value || "");
    if (!runId || !services.secondPillar.getPendingRun(runId)) {
      const begun = services.secondPillar.beginLifecycle({ createdAt: new Date().toISOString() });
      if (!begun.ok) return secondPillarMessage(form, "走った後の疲労感の記録を開始できませんでした。", { error: true });
      runId = begun.state.runId;
    }
    const state = services.secondPillar.getPendingRun(runId);
    if (!state?.runEndAt) {
      const ended = services.secondPillar.markRunEnd(runId, new Date().toISOString());
      if (!ended.ok) return secondPillarMessage(form, "走行終了時刻を保存できませんでした。", { error: true });
    }
    const post = services.secondPillar.capturePostDirect(runId, value, new Date().toISOString());
    if (!post.ok) return secondPillarMessage(form, "走った後の疲労感を保存できませんでした。走行記録自体は通常どおり保存できます。", { error: true });
    close();
    bindRunAndNavigate(runId);
  });
}

function recordBodyStatus(form) {
  return form.querySelector('[name="subjectiveStatus"]:checked')?.value || "deferred";
}

function recordBodyScore(form, areaId) {
  return form.querySelector(`[data-record-body-score="${areaId}"]`);
}

function recordBodySide(form, areaId) {
  return form.querySelector(`[data-record-body-side="${areaId}"]`);
}

function selectedRecordBodyAreas(form) {
  return RECORD_REGIONAL_SUBJECTIVE_AREAS.filter((item) => {
    const value = Number(recordBodyScore(form, item.areaId)?.value || 0);
    return Number.isInteger(value) && value >= 1 && value <= 5;
  });
}

function renderRecordSelectedBodyList(form) {
  const selected = selectedRecordBodyAreas(form);
  const list = form.querySelector("[data-record-selected-body-list]");
  const summary = form.querySelector("[data-record-selected-body-summary]");
  if (summary) summary.textContent = selected.length ? `${selected.length}部位を入力中` : "部位は未選択です。";
  if (!list) return;
  list.innerHTML = selected.map((item) => {
    const score = Number(recordBodyScore(form, item.areaId)?.value || 1);
    const side = String(recordBodySide(form, item.areaId)?.value || BODY_AREA_LATERALITY.unknown);
    return `<div class="record-selected-body-row selected-body-row" data-record-selected-row="${item.areaId}"><div class="selected-body-row-head"><strong>${item.label}</strong><button type="button" data-action="remove-record-body" aria-label="${item.label}を削除">×</button></div><div class="selected-body-controls"><label><span>程度</span><select data-record-selected-level>${[1,2,3,4,5].map((value) => `<option value="${value}"${score === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><label><span>左右</span><select data-record-selected-side>${Object.values(BODY_AREA_LATERALITY).map((value) => `<option value="${value}"${side === value ? " selected" : ""}>${BODY_AREA_LATERALITY_LABELS[value]}</option>`).join("")}</select></label></div></div>`;
  }).join("");
  list.querySelectorAll("[data-record-selected-row]").forEach((row) => {
    const areaId = String(row.dataset.recordSelectedRow || "");
    row.querySelector("[data-record-selected-level]")?.addEventListener("change", (event) => {
      const control = recordBodyScore(form, areaId);
      if (control) control.value = String(event.currentTarget.value);
      refreshRecordBodyUi(form);
      saveDraftFromForm(form, form.__runloadServices, false);
    });
    row.querySelector("[data-record-selected-side]")?.addEventListener("change", (event) => {
      const control = recordBodySide(form, areaId);
      if (control) control.value = String(event.currentTarget.value);
      saveDraftFromForm(form, form.__runloadServices, false);
    });
    row.querySelector('[data-action="remove-record-body"]')?.addEventListener("click", () => {
      const score = recordBodyScore(form, areaId);
      const side = recordBodySide(form, areaId);
      if (score) score.value = "0";
      if (side) side.value = BODY_AREA_LATERALITY.unknown;
      refreshRecordBodyUi(form);
      updateSubjectiveSummary(form);
      saveDraftFromForm(form, form.__runloadServices, false);
    });
  });
}

function refreshRecordBodyUi(form) {
  const status = recordBodyStatus(form);
  const bodyEntry = form.querySelector("[data-record-body-entry]");
  const consultExtra = form.querySelector("[data-record-consultation-extra]");
  if (bodyEntry) bodyEntry.hidden = !["discomfort_reported", "strong_reported"].includes(status);
  if (consultExtra) consultExtra.hidden = status !== "strong_reported";
  form.querySelectorAll("[data-record-body-region]").forEach((path) => {
    const areaId = String(path.dataset.recordBodyRegion || "");
    const level = Number(recordBodyScore(form, areaId)?.value || 0);
    path.dataset.level = String(level);
    path.classList.toggle("is-selected", level > 0);
    path.setAttribute("aria-pressed", String(level > 0));
  });
  renderRecordSelectedBodyList(form);
}

function clearRecordBodyAreas(form) {
  RECORD_REGIONAL_SUBJECTIVE_AREAS.forEach((item) => {
    const score = recordBodyScore(form, item.areaId);
    const side = recordBodySide(form, item.areaId);
    if (score) score.value = "0";
    if (side) side.value = BODY_AREA_LATERALITY.unknown;
  });
}

function clearRecordConsultationFacts(form) {
  SAFETY_FLAG_KEYS.forEach((flag) => {
    const control = form.querySelector(`[name="safety_${flag}"]`);
    if (control?.type === "checkbox") control.checked = false;
  });
  const note = form.elements.namedItem("consultationNote");
  if (note) note.value = "";
}

function normalizeEmbeddedBodyStatus(form) {
  const status = recordBodyStatus(form);
  if (!["discomfort_reported", "strong_reported"].includes(status)) clearRecordBodyAreas(form);
  if (status !== "strong_reported") clearRecordConsultationFacts(form);
  refreshRecordBodyUi(form);
}

function openRecordSubflow(form, name) {
  form.querySelectorAll("[data-record-subflow]").forEach((section) => { section.hidden = section.dataset.recordSubflow !== name; });
  document.body.classList.add("record-subflow-open");
  form.querySelector(`[data-record-subflow="${name}"] .record-subscreen__back`)?.focus();
}

function closeRecordSubflow(form) {
  form.querySelectorAll("[data-record-subflow]").forEach((section) => { section.hidden = true; });
  document.body.classList.remove("record-subflow-open");
}

function applySavedShoeToEmbedded(form, services) {
  const id = String(form.elements.namedItem("personalShoeId")?.value || "");
  if (!id) return;
  const settings = services.storage.settings.load();
  const preset = (Array.isArray(settings.savedShoes) ? settings.savedShoes : []).find((item) => item.id === id);
  if (!preset) return;
  for (const [name, value] of [["personalShoeLabel", preset.label], ["personalShoeType", preset.type], ["personalShoeSoftness", preset.softness]]) {
    const control = form.elements.namedItem(name);
    if (control) control.value = String(value || "");
  }
}

function saveEmbeddedShoePreset(form, services) {
  if (!form.elements.namedItem("saveCurrentShoePreset")?.checked) return { ok: true, saved: false };
  const label = String(form.elements.namedItem("personalShoeLabel")?.value || "").trim();
  if (!label) return { ok: true, saved: false };
  const current = services.storage.settings.load();
  const saved = Array.isArray(current.savedShoes) ? [...current.savedShoes] : [];
  const currentId = String(form.elements.namedItem("personalShoeId")?.value || "");
  const id = currentId || `shoe-${Date.now()}`;
  const preset = { id, label, type: String(form.elements.namedItem("personalShoeType")?.value || ""), softness: String(form.elements.namedItem("personalShoeSoftness")?.value || "") };
  const index = saved.findIndex((item) => item.id === id);
  if (index >= 0) saved[index] = preset; else saved.push(preset);
  const result = services.storage.settings.save({ ...current, savedShoes: saved });
  if (result?.ok === false) return { ...result, saved: false };
  if (form.elements.namedItem("personalShoeId")) form.elements.namedItem("personalShoeId").value = id;
  return { ok: true, saved: true };
}

function bindEmbeddedRecordSubflows(form, services) {
  form.__runloadServices = services;
  form.querySelectorAll('[data-action="open-record-subflow"]').forEach((button) => {
    button.addEventListener("click", () => openRecordSubflow(form, String(button.dataset.subflow || "")));
  });
  form.querySelectorAll('[data-action="close-record-subflow"]').forEach((button) => button.addEventListener("click", () => closeRecordSubflow(form)));

  form.querySelectorAll("[data-record-body-region]").forEach((path) => {
    const activate = () => {
      const areaId = String(path.dataset.recordBodyRegion || "");
      const score = recordBodyScore(form, areaId);
      if (score && Number(score.value || 0) === 0) score.value = "2";
      refreshRecordBodyUi(form);
      updateSubjectiveSummary(form);
    };
    path.addEventListener("click", activate);
    path.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); } });
  });
  form.querySelectorAll('[name="subjectiveStatus"]').forEach((control) => control.addEventListener("change", () => {
    normalizeEmbeddedBodyStatus(form);
    updateSubjectiveSummary(form);
  }));
  form.querySelector('[data-action="apply-body-subflow"]')?.addEventListener("click", () => {
    const status = recordBodyStatus(form);
    const selected = selectedRecordBodyAreas(form);
    if (["discomfort_reported", "strong_reported"].includes(status) && !selected.length) {
      showFormMessages(form, ["身体図から部位を1つ以上選んでください。"]);
      return;
    }
    normalizeEmbeddedBodyStatus(form);
    updateSubjectiveSummary(form);
    saveDraftFromForm(form, services, false);
    closeRecordSubflow(form);
  });

  form.querySelector("[data-record-saved-shoe]")?.addEventListener("change", () => {
    applySavedShoeToEmbedded(form, services);
    updatePersonalSummary(form);
  });
  form.querySelector('[data-action="apply-personal-subflow"]')?.addEventListener("click", () => {
    const result = saveEmbeddedShoePreset(form, services);
    if (result?.ok === false) {
      showFormMessages(form, ["保存シューズを端末内へ保存できませんでした。保存せずに戻る場合は、保存のチェックを外してください。"]);
      return;
    }
    const saveCheckbox = form.elements.namedItem("saveCurrentShoePreset");
    if (saveCheckbox) saveCheckbox.checked = false;
    updatePersonalSummary(form);
    saveDraftFromForm(form, services, false);
    closeRecordSubflow(form);
  });

  normalizeEmbeddedBodyStatus(form);
  updateSubjectiveSummary(form);
  updatePersonalSummary(form);
}

export function readSubjectiveFeedback(formData) {
  const primaryStatus = String(formData.get("subjectiveStatus") || "deferred");
  const consultationFactsActive = primaryStatus === "strong_reported";
  const safetyFlags = Object.fromEntries(SAFETY_FLAG_KEYS.map((flag) => [
    flag,
    consultationFactsActive ? booleanValue(formData, `safety_${flag}`) : false,
  ]));
  const hasSafetyFlag = Object.values(safetyFlags).some(Boolean);
  const checkStatus = primaryStatus === "body_reported"
    ? String(formData.get("subjectiveDetailType") || "")
    : primaryStatus;
  const bodyObservationTiming = String(formData.get("bodyObservationTiming") || "UNKNOWN");
  const bodyObservationSensation = String(formData.get("bodyObservationSensation") || "NOT_SELECTED");
  const bodyObservationNote = String(formData.get("bodyObservationNote") || "").trim().slice(0, 240);
  const bodyAreaObservations = BODY_AREA_TAXONOMY.flatMap((area) => {
    const intensity = numberValue(formData, `bodyArea_${area.key}`);
    if (!Number.isInteger(intensity) || intensity < 1 || intensity > 5) return [];
    return [{
      areaId: area.id,
      label: area.label,
      groupId: area.groupId,
      modelRegionId: area.modelRegionId,
      intensity,
      laterality: String(formData.get(`bodyAreaLaterality_${area.key}`) || "UNKNOWN"),
      noticedTiming: bodyObservationTiming,
      sensationType: bodyObservationSensation,
      note: bodyObservationNote,
    }];
  });
  return {
    checkStatus,
    bodyAreaObservations,
    consultationNote: consultationFactsActive ? String(formData.get("consultationNote") || "") : "",
    unexpectedSymptom: consultationFactsActive ? booleanValue(formData, "unexpectedSymptom") : false,
    symptomContext: {
      timing: String(formData.get("symptomTiming") || ""),
      startedWhen: String(formData.get("symptomStartedWhen") || ""),
      note: String(formData.get("symptomNote") || ""),
    },
    safetyFlags,
    safetyCheck: {
      status: hasSafetyFlag
        ? "reported"
        : ["deferred", "not_asked"].includes(checkStatus)
          ? "not_asked"
          : "none_reported",
    },
  };
}

const RUN_WALK_SURFACE_COMPONENTS = Object.freeze({
  PAVED: "paved", TRACK: "track", TREADMILL: "treadmill", SOIL: "soil", TRAIL: "trail",
  NATURAL_GRASS: "natural_grass", ARTIFICIAL_TURF: "artificial_turf", SAND: "sand",
});

function readRunWalkRunningSections(formData) {
  return Array.from({ length: 5 }, (_, index) => {
    const sharePercent = optionalNumberValue(formData, `runWalkSectionShare_${index}`);
    if (!(sharePercent > 0)) return null;
    const gradeDirection = String(formData.get(`runWalkSectionDirection_${index}`) || "FLAT").toUpperCase();
    const gradePercent = gradeDirection === "FLAT" ? 0 : Math.abs(Number(optionalNumberValue(formData, `runWalkSectionGrade_${index}`) || 0));
    const userCategory = String(formData.get(`runWalkSectionSurface_${index}`) || "UNKNOWN").toUpperCase();
    const componentId = RUN_WALK_SURFACE_COMPONENTS[userCategory] || null;
    return {
      sectionId: `running-phase-${index + 1}`, sharePercent, gradeKnown: true, gradePercent, gradeDirection,
      surfaceComponents: componentId ? [{ componentId, sharePercent: 100, userCategory }] : [],
    };
  }).filter(Boolean);
}

function recordHasMixedA9Conditions(record = {}) {
  const sections = Array.isArray(record.course?.sections) ? record.course.sections.filter((item) => Number(item?.sharePercent) > 0) : [];
  const surfaces = SURFACE_FIELDS.filter(({ recordKey }) => Number(record.course?.[recordKey] || 0) > 0);
  const summaryMixedGrade = String(record.course?.gradeKnowledge || "UNKNOWN") === "KNOWN_PROFILE"
    && (Number(record.course?.upPercent || 0) > 0 || Number(record.course?.downPercent || 0) > 0)
    && !(Number(record.course?.upPercent || 0) >= 99.999 || Number(record.course?.downPercent || 0) >= 99.999);
  return sections.length > 1 || surfaces.length > 1 || summaryMixedGrade;
}

function derivedRegionalSpeedMps(record = {}) {
  const runWalk = String(record.runningFormat || "UNKNOWN").toUpperCase() === "RUN_WALK";
  const d = Number(runWalk ? record.runWalkRunningDistanceKm : record.distanceKm);
  const t = Number(runWalk ? record.runWalkRunningDurationMinutes : record.durationMinutes);
  return d > 0 && t > 0 ? d * 1000 / (t * 60) : null;
}

function confirmFcrInputDomain(record = {}, confirmAction = window.confirm) {
  const speed = derivedRegionalSpeedMps(record);
  if (Number.isFinite(speed) && (speed < 2.25 - 1e-12 || speed > 3.33 + 1e-12)) {
    const ok = confirmAction(`この速度は、12部位すべての数値表示を保証するエビデンス範囲（2.25–3.333 m/s）の外です。部位ごとに、確認できる範囲だけ数値を表示します。\n\n入力した記録は保存できます。保存しますか？`);
    if (!ok) return false;
  }
  return true;
}

export function readRecordInput(formData, services) {
  const planId = String(formData.get("planId") || "");
  const plan = planId ? services.storage.plans.findById(planId) : null;
  const activityType = String(formData.get("activityType") || "run");
  const distanceKm = numberValue(formData, "distanceKm");
  return {
    id: String(formData.get("recordId") || ""),
    date: String(formData.get("date") || ""),
    activityType,
    distanceKm,
    durationMinutes: numberValue(formData, "durationMinutes"),
    steps: numberValue(formData, "steps"),
    perceivedExertion: null,
    rpeProvenance: "NOT_REPORTED",
    runningFormat: String(formData.get("runningFormat") || "UNKNOWN"),
    runWalkRunningDistanceKm: optionalNumberValue(formData, "runWalkRunningDistanceKm"),
    runWalkRunningDurationMinutes: optionalNumberValue(formData, "runWalkRunningDurationMinutes"),
    runWalkRunningSections: readRunWalkRunningSections(formData),
    stepsProvenance: String(formData.get("stepsProvenance") || "UNKNOWN"),
    course: readCourse(formData, distanceKm),
    memo: String(formData.get("memo") || ""),
    environmentContext: {
      weather: String(formData.get("weather") || ""),
      temperatureC: optionalNumberValue(formData, "temperatureC"),
      windSummary: String(formData.get("windSummary") || ""),
      environmentNote: String(formData.get("environmentNote") || ""),
    },
    recoveryContext: {
      sleepSummary: String(formData.get("sleepSummary") || ""),
      nutritionHydrationSummary: String(formData.get("nutritionHydrationSummary") || ""),
      lifestyleNote: String(formData.get("lifestyleNote") || ""),
    },
    reflectionContext: {
      postRunReflection: String(formData.get("postRunReflection") || ""),
      perceivedDifference: String(formData.get("perceivedDifference") || ""),
      reflectionKeyPoint: String(formData.get("reflectionKeyPoint") || ""),
      nextCheckPoint: String(formData.get("nextCheckPoint") || ""),
    },
    consultationContext: {
      consultationTarget: String(formData.get("consultationTarget") || ""),
      consultationQuestion: String(formData.get("consultationQuestion") || ""),
      consultationDataSelection: formData.getAll("consultationDataSelection").map(String),
    },
    planOutcome: plan ? {
      status: plan.outcomeStatus || "completed",
      plannedDistanceKm: Number(plan.plannedSession?.distanceKm || 0),
      plannedDurationMinutes: Number(plan.plannedSession?.durationMinutes || 0),
      plannedCourseSnapshot: plan.plannedSession?.course || null,
      planNote: plan.memo || "",
      reason: plan.changeReason || "",
      reasonNote: plan.changeReasonNote || "",
    } : {},
    personalContext: readPersonalContext(formData),
  };
}

function validateUiRecord(record) {
  const messages = [];
  if (!record.date) messages.push("日付を入力してください。");
  if (record.activityType === "run") {
    if (!(record.distanceKm > 0)) messages.push("走行記録では、0より大きい距離を入力してください。");
    if (!(record.durationMinutes > 0)) messages.push("走行記録では、0より大きい実際に走った時間を入力してください。");
    const surfaceSum = SURFACE_FIELDS.reduce((sum, { recordKey }) => sum + Number(record.course[recordKey] || 0), 0);
    if (surfaceSum > 0 && Math.abs(surfaceSum - 100) > 1e-9) messages.push(`路面割合を入力する場合は、合計を100%にしてください。現在は${surfaceSum}%です。`);
    if (hasTreadmillOutdoorSurfaceMixFromCourse(record.course || {})) messages.push("トレッドミルと屋外路面は、同じ走行の路面割合として混ぜて入力できません。トレッドミルは単独の路面として記録してください。");
    if (Array.isArray(record.course.sections) && record.course.sections.length) {
      const sectionTotal = record.course.sections.reduce((sum, section) => sum + Number(section.sharePercent || 0), 0);
      if (Math.abs(sectionTotal - 100) > 0.01) messages.push(`区間割合の合計を100%にしてください。現在は${sectionTotal}%です。`);
    } else if (record.course.gradeKnowledge === "KNOWN_PROFILE" && Number(record.course.upPercent || 0) + Number(record.course.downPercent || 0) > 100.01) {
      messages.push("上り区間と下り区間の合計は100%以下にしてください。");
    }
    if (String(record.runningFormat || "UNKNOWN").toUpperCase() === "RUN_WALK") {
      if (!(Number(record.runWalkRunningDistanceKm) > 0) || !(Number(record.runWalkRunningDistanceKm) < Number(record.distanceKm))) messages.push("走りと歩きを混ぜた場合は、走った距離を0より大きく、全体距離より小さい値で入力してください。");
      if (!(Number(record.runWalkRunningDurationMinutes) > 0) || !(Number(record.runWalkRunningDurationMinutes) < Number(record.durationMinutes))) messages.push("走りと歩きを混ぜた場合は、走った時間を0より大きく、全体の走行・歩行時間より短い値で入力してください。");
      if (recordHasMixedA9Conditions(record)) {
        const runningSections = Array.isArray(record.runWalkRunningSections) ? record.runWalkRunningSections : [];
        const total = runningSections.reduce((sum, section) => sum + Number(section.sharePercent || 0), 0);
        if (!runningSections.length || Math.abs(total - 100) > 0.01) messages.push("複数の坂・路面がある場合は、走った区間の内訳を合計100%で入力してください。");
        if (runningSections.some((section) => !Array.isArray(section.surfaceComponents) || !section.surfaceComponents.length)) messages.push("走った区間の内訳では、各区間の路面を選んでください。");
        const runningSurfaceComponents = runningSections.flatMap((section) => Array.isArray(section.surfaceComponents) ? section.surfaceComponents : []);
        if (hasTreadmillOutdoorSurfaceMixFromComponents(runningSurfaceComponents)) messages.push("RUN_WALKの走った区間でも、トレッドミルと屋外路面を同じ走行内で混ぜることはできません。");
      }
    }
  }
  return messages;
}

function validateSubjectiveFeedback(feedback, formData) {
  const messages = [];
  const hasBodyAreaObservation = Array.isArray(feedback.bodyAreaObservations)
    && feedback.bodyAreaObservations.length > 0;
  const hasSafetyInformation = Object.values(feedback.safetyFlags || {}).some(Boolean) || Boolean(feedback.unexpectedSymptom);
  const primaryStatus = String(formData.get("subjectiveStatus") || "");
  const requiresBodyDetail = primaryStatus === "body_reported" || ["discomfort_reported", "strong_reported"].includes(feedback.checkStatus);
  if (requiresBodyDetail && !feedback.checkStatus) messages.push("身体の記録を残す場合は、内容を選んでください。");
  if (requiresBodyDetail && feedback.checkStatus === "discomfort_reported" && !hasBodyAreaObservation) messages.push("気になる部位を残す場合は、少なくとも1部位の程度を1以上にしてください。");
  if (requiresBodyDetail && feedback.checkStatus === "strong_reported" && !(hasSafetyInformation || hasBodyAreaObservation)) messages.push("相談したい内容を残す場合は、当てはまる内容または部位の程度を入力してください。");
  return messages;
}

function savePlanCourseToLibraryIfRequested(formData, services, recordInput) {
  if (String(formData.get("savePlanCourseToLibrary") || "") !== "1") return { ok: true, status: "not-requested" };
  if (recordInput.activityType === "rest") return { ok: true, status: "not-requested" };
  const course = recordInput.course || {};
  if (!String(course.name || "").trim()) return { ok: false, message: "保存コースに残す場合は、コース名が必要です。" };
  const createResult = services.storage.courses.create(course);
  if (createResult.ok) return { ok: true, status: "created", item: createResult.item };
  if (createResult.code !== "COURSE_NAME_DUPLICATE") {
    return { ok: false, message: createResult.message || "保存コースに追加できませんでした。" };
  }
  const duplicate = createResult.duplicate;
  const updateApproved = window.confirm(`「${duplicate?.name || course.name}」という保存コースがあります。今回のコース条件で既存コースを更新しますか？

キャンセルすると、記録だけを保存し、保存コースは変更しません。`);
  if (!updateApproved) return { ok: true, status: "skipped-duplicate", duplicate };
  const updateResult = services.storage.courses.update(duplicate?.id || "", course);
  return updateResult.ok
    ? { ok: true, status: "updated", item: updateResult.item }
    : { ok: false, message: updateResult.message || "同名の保存コースを更新できませんでした。" };
}

function saveDraftFromForm(form, services, announce = false) {
  if (form.dataset.editing === "true") return;
  const formData = new FormData(form);
  const result = services.storage.draft.save({
    record: readRecordInput(formData, services),
    feedback: readSubjectiveFeedback(formData),
  });
  if (announce) {
    const status = form.querySelector("[data-draft-status]");
    if (status) status.textContent = result?.ok === false ? "入力途中を保存できませんでした。" : "入力途中をこの端末へ保存しました。";
  }
}

export function bindRecordInput({ services, router, context, returnState = null }) {
  const form = document.getElementById("record-input-form");
  if (!form) return;
  if (returnState?.restore || context?.parameters?.get("resume") === "1") restoreRecordInputWorkspace(form);
  else clearRecordInputWorkspace();
  updateInputFormVisibility(form);
  updateRecordSubmitAvailability(form);
  updateCourseSummary(form);
  updateSubjectiveSummary(form);
  updatePersonalSummary(form);
  bindSecondPillarLifecycle(form, { services, router, context });
  const returnStatus = form.querySelector("[data-record-return-status]");
  if (returnStatus && returnState?.notice) {
    returnStatus.hidden = false;
    returnStatus.textContent = returnState.notice;
  }
  form.querySelectorAll('[data-action="apply-saved-course"]').forEach((button) => {
    button.addEventListener("click", () => {
      const courseId = String(button.dataset.courseId || "");
      const preset = courseId ? services.storage.courses.findById(courseId) : null;
      if (!preset) {
        if (returnStatus) {
          returnStatus.hidden = false;
          returnStatus.textContent = "保存済みコースを読み込めませんでした。";
        }
        return;
      }
      applyCoursePresetToForm(form, { ...preset.course, id: preset.id, name: preset.name });
      updateCourseSummary(form);
      saveDraftFromForm(form, services, false);
      refreshActiveRecordInputWorkspace(form);
      if (returnStatus) {
        returnStatus.hidden = false;
        returnStatus.textContent = `「${preset.name || "保存済みコース"}」を今回の入力へ反映しました。保存元コースは変更していません。`;
      }
    });
  });
  form.querySelector('[data-action="clear-record-course"]')?.addEventListener("click", () => {
    applyCoursePresetToForm(form, {});
    updateCourseSummary(form);
    saveDraftFromForm(form, services, false);
    refreshActiveRecordInputWorkspace(form);
    if (returnStatus) {
      returnStatus.hidden = false;
      returnStatus.textContent = "今回のコース選択を解除しました。保存元コースは変更していません。";
    }
  });
  form.querySelector('[data-action="open-course-library"]')?.addEventListener("click", () => {
    const returnTo = recordInputReturnTo(context);
    saveRecordInputWorkspace(form);
    beginRecordInputJourney({ returnTo, source: "course" });
    router.navigateToScreen("course-library", { returnTo });
  });
  bindEmbeddedRecordSubflows(form, services);
  const requestedSubflow = String(context?.parameters?.get("subflow") || "");
  if (["subjective", "personal"].includes(requestedSubflow)) openRecordSubflow(form, requestedSubflow);
  form.addEventListener("change", () => {
    updateInputFormVisibility(form);
    updateRecordSubmitAvailability(form);
    updateCourseSummary(form);
    updateSubjectiveSummary(form);
    updatePersonalSummary(form);
      saveDraftFromForm(form, services, false);
    refreshActiveRecordInputWorkspace(form);
  });
  form.addEventListener("input", () => { updateRecordSubmitAvailability(form); updateCourseSummary(form); updateSubjectiveSummary(form); updatePersonalSummary(form); saveDraftFromForm(form, services, false); refreshActiveRecordInputWorkspace(form); });
  document.querySelectorAll('[data-action="save-record-draft"]').forEach((button) => button.addEventListener("click", () => saveDraftFromForm(form, services, true)));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const submitButtons = [...document.querySelectorAll('#record-input-form [type="submit"], [form="record-input-form"][type="submit"]')];
    submitButtons.forEach((button) => { button.disabled = true; });
    const restoreSubmitButtons = () => submitButtons.forEach((button) => { button.disabled = false; });
    const formData = new FormData(form);
    const recordInput = readRecordInput(formData, services);
    const subjectiveFeedback = readSubjectiveFeedback(formData);
    const uiMessages = [...validateUiRecord(recordInput), ...validateSubjectiveFeedback(subjectiveFeedback, formData)];
    if (uiMessages.length) {
      showFormMessages(form, uiMessages);
      restoreSubmitButtons();
      return;
    }
    const linkedPendingRun = recordInput.id ? services.secondPillar?.getPendingRun?.(recordInput.id) : null;
    if (linkedPendingRun && recordInput.activityType !== "run") {
      showFormMessages(form, ["走る前後の疲労感を記録した走行は、休養記録として保存できません。記録の種類を「走行」に戻してください。"]);
      restoreSubmitButtons();
      return;
    }
    if (!confirmGradeDomain(recordInput.course, "記録")) {
      restoreSubmitButtons();
      return;
    }
    if (!confirmFcrInputDomain(recordInput)) {
      restoreSubmitButtons();
      return;
    }
    const result = services.workflows.records.saveRecordAndFeedback(recordInput, subjectiveFeedback);
    if (!result.ok) {
      showFormMessages(form, result.validation?.errors?.map((item) => item.message) || ["端末内へ保存できませんでした。未入力の必須項目、端末の空き容量、ブラウザーの保存許可を見直してください。"]);
      restoreSubmitButtons();
      return;
    }
    const postSaveWarnings = [];
    if (recordInput.id && services.secondPillar?.getPendingRun?.(result.record.id)) {
      const lifecycleResult = services.secondPillar.finalizeSavedRun(result.record.id);
      if (!lifecycleResult.ok) postSaveWarnings.push("記録は保存しましたが、疲労感の入力状態を終了できませんでした。保存した記録は保持されています。");
    }
    const courseLibraryResult = savePlanCourseToLibraryIfRequested(formData, services, recordInput);
    if (!courseLibraryResult.ok) {
      postSaveWarnings.push(courseLibraryResult.message || "今回のコースを保存コースには追加できませんでした。");
    }
    const planId = String(formData.get("planId") || "");
    if (planId) {
      const planResult = services.workflows.plans.markActualRecord(planId, result.record.id);
      if (!planResult.ok) postSaveWarnings.push("記録は保存しましたが、予定との関連付けを保存できませんでした。");
    }
    if (context?.parameters?.get("measurement") === "1") {
      const measurementResult = commitPendingRunMeasurement(result.record.id);
      if (!measurementResult.ok) postSaveWarnings.push("記録は保存しましたが、GPS走行軌跡を端末内へ保存できませんでした。");
    }
    const draftResult = services.storage.draft.clear();
    if (!draftResult.ok) postSaveWarnings.push("記録は保存しましたが、入力途中データを削除できませんでした。");
    clearRecordInputWorkspace();
    if (postSaveWarnings.length) {
      window.alert(`記録は保存しました。\n\n${postSaveWarnings.join("\n")}`);
    }
    router.navigateToScreen("result", { recordId: result.record.id });
  });
}

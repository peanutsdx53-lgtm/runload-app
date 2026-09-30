import { SURFACE_FIELDS, validateCoursePresetInput } from "../../core/appCore.js";

import { courseFormValues } from "./recordInputInteractions.js";
import { setHidden, showFormMessages } from "./formUtilities.js";
import { confirmGradeDomain } from "./gradeDomainConfirmation.js";
import { markRecordInputJourneyReturn, updateRecordInputWorkspaceFields } from "../recordInputWorkspace.js";
import { clearGpxCandidate, saveCourseSelection } from "../flowSessionState.js";

function number(formData, name) { const raw = String(formData.get(name) ?? "").trim(); return raw === "" ? 0 : Number(raw); }
const SURFACE_CLASS_BY_RECORD_KEY = Object.freeze({ pavedPercent: "REF_HARD_EVEN_STABLE", trackPercent: "REF_HARD_EVEN_STABLE", treadmillPercent: "REF_HARD_EVEN_STABLE", soilPercent: "KNOWN_OTHER", trailPercent: "EXPLICIT_UNEVEN", naturalGrassPercent: "DRY_STABLE_GRASS_TURF", artificialTurfPercent: "DRY_STABLE_GRASS_TURF", sandPercent: "DEEP_DRY_SOFT_SAND" });
function readSections(data) {
  return Array.from({ length: 5 }, (_, index) => {
    const sharePercent = number(data, `sectionShare_${index}`);
    if (!(sharePercent > 0)) return null;
    const gradeDirection = String(data.get(`sectionDirection_${index}`) || "UNKNOWN");
    const magnitude = number(data, `sectionGrade_${index}`);
    const gradePercent = gradeDirection === "DOWNHILL" ? -Math.abs(magnitude) : gradeDirection === "UPHILL" ? Math.abs(magnitude) : gradeDirection === "FLAT" ? 0 : null;
    return { sectionId: `saved-section-${index + 1}`, sharePercent, gradeDirection, gradePercent };
  }).filter(Boolean);
}
function weightedGrade(sections, direction) {
  const rows = sections.filter((item) => item.gradeDirection === direction);
  const total = rows.reduce((sum, item) => sum + item.sharePercent, 0);
  return total > 0 ? rows.reduce((sum, item) => sum + Math.abs(Number(item.gradePercent || 0)) * item.sharePercent, 0) / total : 0;
}
function readCourseEditor(data) {
  const gradeInputMode = String(data.get("gradeInputMode") || "UNKNOWN");
  const sections = gradeInputMode === "SECTIONS" ? readSections(data) : [];
  const upShare = gradeInputMode === "SECTIONS" ? sections.filter((item) => item.gradeDirection === "UPHILL").reduce((sum, item) => sum + item.sharePercent, 0) : number(data, "upPercent");
  const downShare = gradeInputMode === "SECTIONS" ? sections.filter((item) => item.gradeDirection === "DOWNHILL").reduce((sum, item) => sum + item.sharePercent, 0) : number(data, "downPercent");
  const surfaceInputMode = String(data.get("surfaceInputMode") || "UNKNOWN");
  const primary = String(data.get("primarySurfaceKey") || "pavedPercent");
  const shares = Object.fromEntries(SURFACE_FIELDS.map(({ recordKey }) => [recordKey, surfaceInputMode === "SINGLE" ? (recordKey === primary ? 100 : 0) : surfaceInputMode === "MIXED" ? number(data, recordKey) : 0]));
  const active = SURFACE_FIELDS.filter(({ recordKey }) => shares[recordKey] > 0);
  const dominant = [...active].sort((a, b) => shares[b.recordKey] - shares[a.recordKey])[0];
  const modelSurfaceClass = dominant ? SURFACE_CLASS_BY_RECORD_KEY[dominant.recordKey] : "UNKNOWN";
  const modelSurfaceProfile = active.map(({ recordKey }) => ({ sharePercent: shares[recordKey], surfaceClass: SURFACE_CLASS_BY_RECORD_KEY[recordKey] }));
  return {
    name: String(data.get("courseName") || ""), routePattern: String(data.get("routePattern") || "UNKNOWN"), gradeInputMode,
    gradeKnowledge: gradeInputMode === "UNKNOWN" ? "UNKNOWN" : gradeInputMode === "FLAT" ? "KNOWN_FLAT" : "KNOWN_PROFILE",
    upPercent: gradeInputMode === "FLAT" ? 0 : upShare, downPercent: gradeInputMode === "FLAT" ? 0 : downShare,
    upGradePercent: gradeInputMode === "SECTIONS" ? weightedGrade(sections, "UPHILL") : number(data, "upGradePercent"),
    downGradePercent: gradeInputMode === "SECTIONS" ? weightedGrade(sections, "DOWNHILL") : number(data, "downGradePercent"),
    sections, surfaceInputMode, modelSurfaceClass, modelSurfaceProfile, ...shares,
  };
}
function initialVisibleSectionCount(form) {
  let lastUsed = -1;
  for (let index = 0; index < 5; index += 1) {
    const share = Number(form.elements.namedItem(`sectionShare_${index}`)?.value || 0);
    const grade = String(form.elements.namedItem(`sectionGrade_${index}`)?.value || "").trim();
    if (share > 0 || grade !== "") lastUsed = index;
  }
  return Math.min(5, Math.max(1, lastUsed + 1));
}

function updateSectionRows(form) {
  const rows = [...form.querySelectorAll("[data-course-section-row]")];
  if (!rows.length) return;
  let visibleCount = Number(form.dataset.visibleCourseSections || 0);
  if (!(visibleCount >= 1 && visibleCount <= 5)) {
    visibleCount = initialVisibleSectionCount(form);
    form.dataset.visibleCourseSections = String(visibleCount);
  }
  rows.forEach((row, index) => setHidden(row, index >= visibleCount));
  const addButton = form.querySelector('[data-action="add-course-section"]');
  if (addButton) setHidden(addButton, visibleCount >= rows.length);
}

function gradeFamily(grade) {
  if (grade === "FLAT") return "FLAT";
  if (grade === "SUMMARY" || grade === "SECTIONS") return "PROFILE";
  return "UNKNOWN";
}

function updateVisibility(form) {
  const grade = form.elements.namedItem("gradeInputMode")?.value || "UNKNOWN";
  const family = gradeFamily(grade);
  form.querySelectorAll("[data-course-grade-summary]").forEach((element) => setHidden(element, grade !== "SUMMARY"));
  form.querySelectorAll("[data-course-grade-sections]").forEach((element) => setHidden(element, grade !== "SECTIONS"));
  form.querySelectorAll("[data-course-grade-method-panel]").forEach((element) => setHidden(element, family !== "PROFILE"));
  form.querySelectorAll("[data-course-grade-family]").forEach((button) => button.classList.toggle("active", button.dataset.courseGradeFamily === family));
  form.querySelectorAll("[data-course-grade-mode]").forEach((button) => button.classList.toggle("active", button.dataset.courseGradeMode === grade));
  const surface = form.elements.namedItem("surfaceInputMode")?.value || "UNKNOWN";
  form.querySelectorAll("[data-course-surface-single]").forEach((element) => setHidden(element, surface !== "SINGLE"));
  form.querySelectorAll("[data-course-surface-mixed]").forEach((element) => setHidden(element, surface !== "MIXED"));
  form.querySelectorAll("[data-course-surface-mode]").forEach((button) => button.classList.toggle("active", button.dataset.courseSurfaceMode === surface));
  if (grade === "SECTIONS") updateSectionRows(form);
}

function setText(form, selector, value) {
  const node = form.querySelector(selector);
  if (node) node.textContent = value;
}

function mobileGradeSummary(data) {
  const mode = String(data.get("gradeInputMode") || "UNKNOWN");
  if (mode === "FLAT") return "ほぼ平坦";
  if (mode === "UNKNOWN") return "不明";
  if (mode === "SUMMARY") return `上り ${number(data, "upPercent")}%・下り ${number(data, "downPercent")}%`;
  const sections = readSections(data);
  const up = sections.filter((item) => item.gradeDirection === "UPHILL").reduce((sum, item) => sum + item.sharePercent, 0);
  const down = sections.filter((item) => item.gradeDirection === "DOWNHILL").reduce((sum, item) => sum + item.sharePercent, 0);
  return sections.length ? `上り ${up}%・下り ${down}%` : "区間未入力";
}

function mobileSurfaceSummary(form, data) {
  const mode = String(data.get("surfaceInputMode") || "UNKNOWN");
  if (mode === "UNKNOWN") return "未設定";
  if (mode === "SINGLE") {
    const select = form.elements.namedItem("primarySurfaceKey");
    return select?.selectedOptions?.[0]?.textContent?.trim() || "1種類";
  }
  const active = SURFACE_FIELDS
    .map(({ recordKey, label }) => ({ label, value: number(data, recordKey) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  if (!active.length) return "未入力";
  return active.length === 1 ? active[0].label : `${active[0].label}ほか${active.length - 1}種類`;
}

function updateMobileSummary(form, data = new FormData(form)) {
  if (!form.querySelector("[data-course-summary-name]")) return;
  const name = String(data.get("courseName") || "").trim() || "名称未入力";
  setText(form, "[data-course-summary-name]", name);
  setText(form, "[data-course-summary-grade]", mobileGradeSummary(data));
  setText(form, "[data-course-summary-surface]", mobileSurfaceSummary(form, data));
}

function updateTotals(form) {
  const data = new FormData(form); const up = number(data, "upPercent"), down = number(data, "downPercent");
  const flat = form.querySelector("[data-flat-share]"); if (flat) flat.value = Number.isFinite(up + down) ? String(100 - up - down) : "—";
  const section = form.querySelector("[data-section-share-total]"); if (section) section.value = String(Array.from({ length: 5 }, (_, i) => number(data, `sectionShare_${i}`)).reduce((a, b) => a + b, 0));
  const surface = form.querySelector("[data-surface-share-total]"); if (surface) surface.value = String(SURFACE_FIELDS.reduce((sum, { recordKey }) => sum + number(data, recordKey), 0));
  updateMobileSummary(form, data);
}
export function bindCourseLibrary({ services, rerender }) {
  document.querySelectorAll('[data-action="use-course"]').forEach((button) => button.addEventListener("click", () => {
    const preset = services.storage.courses.findById(button.dataset.courseId || ""); if (!preset) return;
    const returnTo = String(button.dataset.returnTo || "#/record-input");
    if (returnTo.startsWith("#/record-input")) {
      updateRecordInputWorkspaceFields(courseFormValues({ ...preset.course, id: preset.id, name: preset.name }));
      markRecordInputJourneyReturn({ source: "course", outcome: "applied", notice: `「${preset.name}」を今回の入力へ反映しました。` });
    } else {
      const target = returnTo.startsWith("#/simulation") ? "simulation" : "plan";
      saveCourseSelection({ target, preset });
    }
    window.location.hash = returnTo;
  }));
  document.querySelectorAll('[data-action="delete-course"]').forEach((button) => button.addEventListener("click", () => {
    const preset = services.storage.courses.findById(button.dataset.courseId || ""); const status = document.querySelector("[data-course-manager-status]"); if (!preset) return;
    if (!window.confirm(`「${preset.name}」を保存コース一覧から削除しますか？\n過去の記録や予定に保存済みの条件は変わりません。`)) return;
    const result = services.storage.courses.removeById(preset.id); if (!result.ok) { if (status) status.textContent = "コースを削除できませんでした。"; return; } rerender();
  }));
}
export function bindCourseEditor({ services }) {
  const form = document.getElementById("course-editor-form"); if (!form) return;
  form.querySelectorAll("[data-course-grade-family]").forEach((button) => button.addEventListener("click", () => {
    const select = form.elements.namedItem("gradeInputMode"); if (!select) return;
    const family = button.dataset.courseGradeFamily || "UNKNOWN";
    if (family === "PROFILE") select.value = gradeFamily(select.value) === "PROFILE" ? select.value : "SUMMARY";
    else select.value = family;
    updateVisibility(form); updateTotals(form);
  }));
  form.querySelectorAll("[data-course-grade-mode]").forEach((button) => button.addEventListener("click", () => { const select=form.elements.namedItem("gradeInputMode"); if(select) select.value=button.dataset.courseGradeMode; updateVisibility(form); updateTotals(form); }));
  form.querySelectorAll("[data-course-surface-mode]").forEach((button) => button.addEventListener("click", () => { const select=form.elements.namedItem("surfaceInputMode"); if(select) select.value=button.dataset.courseSurfaceMode; updateVisibility(form); updateTotals(form); }));
  form.querySelector('[data-action="add-course-section"]')?.addEventListener("click", () => {
    const current = Number(form.dataset.visibleCourseSections || initialVisibleSectionCount(form));
    form.dataset.visibleCourseSections = String(Math.min(5, current + 1));
    updateSectionRows(form);
  });
  form.addEventListener("input", () => updateTotals(form)); form.addEventListener("change", () => { updateVisibility(form); updateTotals(form); });
  updateVisibility(form); updateTotals(form);
  form.addEventListener("submit", (event) => {
    event.preventDefault(); const data = new FormData(form); const id = String(data.get("courseId") || ""); const course = readCourseEditor(data);
    const validation = validateCoursePresetInput(course); if (!validation.ok) { showFormMessages(form, validation.message || "コースを保存できませんでした。"); return; }
    if (!confirmGradeDomain(validation.course, "コース")) return;
    const result = id ? services.storage.courses.update(id, validation.course) : services.storage.courses.create(validation.course);
    if (!result.ok) { showFormMessages(form, result.message || "コースを保存できませんでした。"); return; }
    if (String(data.get("fromGpx") || "") === "1") clearGpxCandidate();
    const returnTo = String(data.get("returnTo") || "#/record-input"); window.location.hash = `#/course-library?returnTo=${encodeURIComponent(returnTo)}&notice=${encodeURIComponent(`「${result.item.name}」を保存しました。`)}`;
  });
}

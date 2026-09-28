import { peekPendingRunMeasurement } from "./runMeasurementState.js";

const MOBILE_QUERY = "(max-width: 54.99rem)";

function mobileLayoutMatches() {
  return typeof globalThis.matchMedia === "function" ? globalThis.matchMedia(MOBILE_QUERY).matches : false;
}

function setValue(form, name, value) {
  const control = form?.elements?.namedItem?.(name) || form?.querySelector?.(`[name="${name}"]`);
  if (!control || value === undefined || value === null) return;
  control.value = String(value);
}

function courseMeta(course = {}) {
  const route = ({ LOOP: "周回", OUT_AND_BACK: "往復", ONE_WAY: "片道", MIXED: "複合" })[String(course.routePattern || "UNKNOWN")] || "形状未判定";
  const grade = course.gradeKnowledge === "KNOWN_PROFILE"
    ? `上り${course.upPercent}%・平坦${course.flatPercent}%・下り${course.downPercent}%`
    : "坂道未判定";
  return `${route}・${grade}・路面未確認`;
}

function installCourseSaveOption(form, course) {
  const entry = form.querySelector(".record-course-entry");
  if (!entry || entry.querySelector("[data-measurement-course-save-option]")) return;
  const wrapper = document.createElement("div");
  wrapper.className = "record-course-library-save";
  wrapper.dataset.measurementCourseSaveOption = "";
  wrapper.innerHTML = `<label class="choice-card record-course-library-save__choice"><input type="checkbox" name="savePlanCourseToLibrary" value="1"><span><strong>この測定コースを保存したコースにも残す</strong><small>GPSから整理した坂道・形状を保存します。路面は未確認のままです。</small></span></label>`;
  entry.append(wrapper);
}

function applyMeasurementAutofill() {
  if (!mobileLayoutMatches()) return;
  const form = document.getElementById("record-input-form");
  if (!form || form.dataset.measurementAutoFilled === "true") return;
  const url = new URL(globalThis.location?.href || "http://localhost/");
  const hashQuery = String(url.hash || "").split("?")[1] || "";
  const parameters = new URLSearchParams(hashQuery);
  if (parameters.get("measurement") !== "1") return;
  const measurement = peekPendingRunMeasurement();
  if (!measurement) return;

  const steps = measurement.stepEstimate?.steps;
  if (Number.isInteger(Number(steps)) && Number(steps) >= 0) {
    setValue(form, "steps", Math.round(Number(steps)));
    setValue(form, "stepsProvenance", "ESTIMATED");
    form.querySelectorAll('[data-optional-status="compare"], [data-save-optional="compare"] b').forEach((node) => { node.textContent = "入力あり"; });
  }

  const course = measurement.courseAnalysis;
  if (course) {
    setValue(form, "courseName", course.name || "GPS測定コース");
    setValue(form, "routePattern", course.routePattern || "UNKNOWN");
    setValue(form, "gradeInputMode", course.gradeInputMode || "UNKNOWN");
    setValue(form, "gradeKnowledge", course.gradeKnowledge || "UNKNOWN");
    setValue(form, "upPercent", course.upPercent || 0);
    setValue(form, "downPercent", course.downPercent || 0);
    setValue(form, "upGradePercent", course.upGradePercent || 0);
    setValue(form, "downGradePercent", course.downGradePercent || 0);
    setValue(form, "surfaceInputMode", "UNKNOWN");
    setValue(form, "modelSurfaceClass", "UNKNOWN");
    ["pavedPercent", "trackPercent", "treadmillPercent", "soilPercent", "trailPercent", "naturalGrassPercent", "artificialTurfPercent", "sandPercent"].forEach((name) => setValue(form, name, 0));

    const selected = form.querySelector("[data-record-selected-course]");
    if (selected) selected.hidden = false;
    const nameNode = form.querySelector("[data-record-course-name]");
    if (nameNode) nameNode.textContent = course.name || "GPS測定コース";
    const metaNode = form.querySelector("[data-record-course-meta]");
    if (metaNode) metaNode.textContent = courseMeta(course);
    form.querySelectorAll('[data-optional-status="course"], [data-save-optional="course"] b').forEach((node) => { node.textContent = "入力あり"; });
    installCourseSaveOption(form, course);
  }

  const banner = document.querySelector(".screen--record-input .parity-record-banner");
  if (banner && (measurement.stepEstimate || measurement.courseAnalysis)) {
    banner.textContent = "GPS測定結果から距離・時間と取得できた走行事実を転記しています。路面など未確認の項目だけ必要に応じて補ってください。";
  }

  form.dataset.measurementAutoFilled = "true";
  form.dispatchEvent(new Event("change", { bubbles: true }));
}

let queued = false;
function queueApply() {
  if (queued) return;
  queued = true;
  globalThis.setTimeout(() => {
    queued = false;
    applyMeasurementAutofill();
  }, 0);
}

const appRoot = document.getElementById("app");
if (appRoot && typeof MutationObserver === "function") {
  new MutationObserver(queueApply).observe(appRoot, { childList: true, subtree: true });
}
queueApply();

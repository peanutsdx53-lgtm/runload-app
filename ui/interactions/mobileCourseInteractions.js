import { SURFACE_FIELDS } from "../../core/appCore.js";
import { bindCourseEditor } from "./courseInteractions.js";

function number(data, name) {
  const raw = String(data.get(name) ?? "").trim();
  return raw === "" ? 0 : Number(raw);
}

function gradeSummary(data) {
  const mode = String(data.get("gradeInputMode") || "UNKNOWN");
  if (mode === "FLAT") return "ほぼ平坦";
  if (mode === "UNKNOWN") return "不明";
  if (mode === "SUMMARY") return `上り ${number(data, "upPercent")}%・下り ${number(data, "downPercent")}%`;
  const sections = Array.from({ length: 5 }, (_, index) => {
    const sharePercent = number(data, `sectionShare_${index}`);
    if (!(sharePercent > 0)) return null;
    return { sharePercent, gradeDirection: String(data.get(`sectionDirection_${index}`) || "UNKNOWN") };
  }).filter(Boolean);
  const up = sections.filter((item) => item.gradeDirection === "UPHILL").reduce((sum, item) => sum + item.sharePercent, 0);
  const down = sections.filter((item) => item.gradeDirection === "DOWNHILL").reduce((sum, item) => sum + item.sharePercent, 0);
  return sections.length ? `上り ${up}%・下り ${down}%` : "区間未入力";
}

function surfaceSummary(form, data) {
  const mode = String(data.get("surfaceInputMode") || "UNKNOWN");
  if (mode === "UNKNOWN") return "未設定";
  if (mode === "SINGLE") return form.elements.namedItem("primarySurfaceKey")?.selectedOptions?.[0]?.textContent?.trim() || "1種類";
  const active = SURFACE_FIELDS.map(({ recordKey, label }) => ({ label, value: number(data, recordKey) })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  if (!active.length) return "未入力";
  return active.length === 1 ? active[0].label : `${active[0].label}ほか${active.length - 1}種類`;
}

const mobileEnhancement = Object.freeze({
  updateSummary({ form, data }) {
    const setText = (selector, value) => { const node = form.querySelector(selector); if (node) node.textContent = value; };
    if (!form.querySelector("[data-course-summary-name]")) return;
    setText("[data-course-summary-name]", String(data.get("courseName") || "").trim() || "名称未入力");
    setText("[data-course-summary-grade]", gradeSummary(data));
    setText("[data-course-summary-surface]", surfaceSummary(form, data));
  },
});

export function bindMobileCourseEditor(args) {
  return bindCourseEditor(args, mobileEnhancement);
}

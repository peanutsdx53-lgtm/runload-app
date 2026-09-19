import { copyText } from "./browserUtilities.js";
import { clearConsultationDraft, resetConsultationDraft, updateConsultationDraft } from "../consultationDraftState.js";

function reportText() {
  const region = document.getElementById("consultation-report-text");
  return region ? (("value" in region ? region.value : region.textContent) || "") : "";
}

function updateCharacterCount(textarea) {
  const counter = document.querySelector("[data-consult-character-count]");
  if (counter) counter.textContent = `${textarea.value.length} / ${textarea.maxLength || 1200}文字`;
}

export function bindConsultation() {
  const prototypeRoot = document.querySelector("[data-prototype-consultation]");
  if (prototypeRoot) {
    const panels = [...prototypeRoot.querySelectorAll("[data-consult-panel]")];
    const routes = [...prototypeRoot.querySelectorAll("[data-consult-open]")];
    const shortMemo = prototypeRoot.querySelector("[data-consult-short-memo]");
    const copySource = prototypeRoot.querySelector("#consultation-report-text");
    const target = prototypeRoot.querySelector("#consultation-target");
    const question = prototypeRoot.querySelector("#consultation-question");
    const reportTarget = prototypeRoot.querySelector("#reportTarget");
    const reportQuestion = prototypeRoot.querySelector("#reportQuestion");
    const showPanel = (name) => {
      panels.forEach((panel) => { panel.hidden = panel.dataset.consultPanel !== name; });
      routes.forEach((route) => route.classList.toggle("primary", route.dataset.consultOpen === name));
    };
    const rebuildMemo = () => {
      const lines = [...prototypeRoot.querySelectorAll("[data-consult-source]:checked")].map((input) => input.dataset.line || "").filter(Boolean);
      const extras = [];
      if (target?.value.trim()) extras.push(`相談相手：${target.value.trim()}`);
      if (question?.value.trim()) extras.push(`相談したいこと：${question.value.trim()}`);
      const text = [...extras, ...lines].join("\n");
      if (shortMemo) shortMemo.textContent = text;
      if (copySource) copySource.value = text;
      if (reportTarget) reportTarget.textContent = `相談相手：${target?.value.trim() || "未入力"}`;
      if (reportQuestion) reportQuestion.textContent = question?.value.trim() || "未入力";
    };
    routes.forEach((route) => route.addEventListener("click", () => showPanel(route.dataset.consultOpen || "short")));
    prototypeRoot.querySelectorAll("[data-consult-source]").forEach((input) => input.addEventListener("change", rebuildMemo));
    target?.addEventListener("input", rebuildMemo);
    question?.addEventListener("input", rebuildMemo);
    rebuildMemo();
  }
  const regionSelector = document.querySelector("[data-consult-region-selector]");
  regionSelector?.addEventListener("change", () => {
    const hash = window.location.hash || "#/consultation";
    const [path, query = ""] = hash.split("?");
    const parameters = new URLSearchParams(query);
    parameters.set("page", "quick");
    parameters.set("mode", "result");
    parameters.set("a4RegionId", regionSelector.value);
    window.location.hash = `${path}?${parameters.toString()}`;
  });

  const textarea = document.querySelector("[data-consultation-draft]");
  textarea?.addEventListener("input", () => {
    updateConsultationDraft(textarea.dataset.draftKey || "", textarea.value);
    updateCharacterCount(textarea);
  });

  document.querySelector('[data-action="reset-consultation-draft"]')?.addEventListener("click", (event) => {
    if (!textarea) return;
    const key = event.currentTarget.dataset.draftKey || textarea.dataset.draftKey || "";
    const text = resetConsultationDraft(key);
    textarea.value = text;
    updateCharacterCount(textarea);
    textarea.focus();
  });

  document.querySelector('[data-action="clear-consultation-draft"]')?.addEventListener("click", (event) => {
    if (!textarea) return;
    const key = event.currentTarget.dataset.draftKey || textarea.dataset.draftKey || "";
    textarea.value = clearConsultationDraft(key);
    updateCharacterCount(textarea);
    textarea.focus();
  });

  document.querySelector('[data-action="copy-consultation-report"]')?.addEventListener("click", async (event) => {
    const text = reportText();
    if (!text.trim()) {
      event.currentTarget.textContent = "内容を入力してください";
      return;
    }
    try {
      await copyText(text);
      event.currentTarget.textContent = "コピーしました";
    } catch {
      event.currentTarget.textContent = "コピーできませんでした";
    }
  });
  document.querySelector('[data-action="print-consultation-report"]')?.addEventListener("click", () => window.print());
}

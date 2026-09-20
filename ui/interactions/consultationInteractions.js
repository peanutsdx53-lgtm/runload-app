import { copyText } from "./browserUtilities.js";

function reportText() {
  const region = document.getElementById("consultation-report-text");
  return region ? (("value" in region ? region.value : region.textContent) || "") : "";
}

export function bindConsultation() {
  const root = document.querySelector("[data-prototype-share-prep]");
  if (!root) return;

  const sourceInputs = [...root.querySelectorAll("[data-consult-source]")];
  const target = root.querySelector("[data-consult-target]");
  const question = root.querySelector("[data-consult-question]");
  const copySource = root.querySelector("#consultation-report-text");
  const viewer = root.querySelector("[data-consult-viewer]");

  const writeText = (selector, value) => {
    root.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
  };

  const activeKeys = () => new Set(
    sourceInputs
      .filter((input) => input.checked && !input.disabled)
      .map((input) => input.dataset.shareKey || ""),
  );

  const syncVisibility = (keys) => {
    ["preview", "viewer", "document"].forEach((targetName) => {
      root.querySelectorAll(`[data-consult-${targetName}-key]`).forEach((element) => {
        const key = element.getAttribute(`data-consult-${targetName}-key`) || "";
        element.hidden = !keys.has(key);
      });
    });

    const region = root.querySelector("[data-consult-document-region]");
    if (region) {
      const hasRegion = [...region.querySelectorAll("[data-consult-document-key]")].some((row) => !row.hidden);
      region.hidden = !hasRegion;
    }
  };

  const rebuild = () => {
    const keys = activeKeys();
    const recipient = target?.value.trim() || "未入力";
    const purpose = question?.value.trim() || "未入力";

    writeText("[data-consult-preview-target]", recipient);
    writeText("[data-consult-preview-question]", `確認したいこと：${purpose}`);
    writeText("[data-consult-viewer-target]", recipient);
    writeText("[data-consult-viewer-question]", `確認したいこと：${purpose}`);
    writeText("[data-consult-document-target]", `共有先：${recipient}`);
    writeText("[data-consult-document-question]", purpose);
    syncVisibility(keys);

    const lines = [];
    if (target?.value.trim()) lines.push(`見せる相手：${target.value.trim()}`);
    if (question?.value.trim()) lines.push(`確認したいこと：${question.value.trim()}`);
    sourceInputs
      .filter((input) => input.checked && !input.disabled)
      .forEach((input) => {
        lines.push(`${input.dataset.shareLabel || "項目"}：${input.dataset.shareValue || ""}`);
      });
    if (copySource) copySource.value = lines.join("\n");
  };

  const closeViewer = () => {
    if (viewer) viewer.hidden = true;
    document.documentElement.classList.remove("consult-viewer-open");
  };

  sourceInputs.forEach((input) => input.addEventListener("change", rebuild));
  target?.addEventListener("input", rebuild);
  question?.addEventListener("input", rebuild);

  root.querySelector('[data-action="open-consult-viewer"]')?.addEventListener("click", () => {
    rebuild();
    if (!viewer) return;
    viewer.hidden = false;
    document.documentElement.classList.add("consult-viewer-open");
    viewer.querySelector('[data-action="close-consult-viewer"]')?.focus();
  });
  root.querySelector('[data-action="close-consult-viewer"]')?.addEventListener("click", closeViewer);
  viewer?.addEventListener("click", (event) => {
    if (event.target === viewer) closeViewer();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && viewer && !viewer.hidden) closeViewer();
  });

  root.querySelector('[data-action="copy-consultation-report"]')?.addEventListener("click", async (event) => {
    rebuild();
    const text = reportText();
    if (!text.trim()) {
      event.currentTarget.querySelector("strong")?.replaceChildren("共有する内容を選んでください");
      return;
    }
    try {
      await copyText(text);
      event.currentTarget.querySelector("strong")?.replaceChildren("コピーしました");
    } catch {
      event.currentTarget.querySelector("strong")?.replaceChildren("コピーできませんでした");
    }
  });

  root.querySelector('[data-action="print-consultation-report"]')?.addEventListener("click", () => {
    rebuild();
    window.print();
  });

  window.addEventListener("pagehide", closeViewer);
  rebuild();
}

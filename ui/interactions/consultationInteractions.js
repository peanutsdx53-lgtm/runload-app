import { copyText } from "./browserUtilities.js";

function reportText() {
  const region = document.getElementById("consultation-report-text");
  return region ? (("value" in region ? region.value : region.textContent) || "") : "";
}

export function bindConsultation() {
  const root = document.querySelector("[data-share-prep]");
  if (!root) return;

  const sourceInputs = [...root.querySelectorAll("[data-consult-source]")];
  const question = root.querySelector("[data-consult-question]");
  const copySource = root.querySelector("#consultation-report-text");
  const viewer = root.querySelector("[data-consult-viewer]");
  const regionSelector = root.querySelector("[data-consult-region-selector]");

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

  };

  const updateRegionalItem = (option) => {
    const input = sourceInputs.find((item) => item.dataset.shareKey === "regional");
    if (!input || !option) return;
    const available = option.dataset.regionalAvailable === "true";
    const wasDisabled = input.disabled;
    const wasChecked = input.checked;
    input.dataset.shareValue = option.dataset.regionalValue || "表示できません";
    input.disabled = !available;
    input.checked = available ? (wasDisabled ? true : wasChecked) : false;

    const label = input.closest(".share-source");
    label?.classList.toggle("is-unavailable", !available);

    const values = {
      "[data-consult-regional-name]": option.dataset.regionalName || "選択した部位",
      "[data-consult-regional-relation]": option.dataset.regionalRelation || "表示できません",
      "[data-consult-regional-current]": option.dataset.regionalCurrent || "今回の数値なし",
      "[data-consult-regional-previous]": option.dataset.regionalPrevious || "比較できる過去記録なし",
    };
    Object.entries(values).forEach(([selector, value]) => writeText(selector, value));
  };

  const rebuild = () => {
    const keys = activeKeys();
    const purpose = question?.value.trim() || "未入力";

    writeText("[data-consult-preview-question]", purpose);
    writeText("[data-consult-viewer-question]", purpose);
    writeText("[data-consult-document-question]", purpose);
    syncVisibility(keys);

    const lines = [];
    if (question?.value.trim()) lines.push(`確認内容：${question.value.trim()}`);
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
  question?.addEventListener("input", rebuild);
  regionSelector?.addEventListener("change", () => {
    const option = regionSelector.selectedOptions?.[0];
    if (!option) return;
    updateRegionalItem(option);
    rebuild();
  });

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

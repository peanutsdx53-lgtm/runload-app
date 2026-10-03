import { copyText } from "./browserUtilities.js";

function reportText() {
  const region = document.getElementById("consultation-report-text");
  return region ? (("value" in region ? region.value : region.textContent) || "") : "";
}

function checkedLabels(inputs = []) {
  return inputs
    .filter((input) => input.checked && !input.disabled)
    .map((input) => input.dataset.label || input.value || "")
    .filter(Boolean);
}

function combinedUserText(inputs, note, empty = "未入力") {
  const labels = checkedLabels(inputs);
  const free = note?.value.trim() || "";
  if (free) labels.push(free);
  return labels.length ? labels.join("／") : empty;
}

function bindExclusiveChoiceGroup(inputs, rebuild) {
  inputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) {
        rebuild();
        return;
      }
      if (input.dataset.exclusiveNone === "true") {
        inputs.forEach((other) => {
          if (other !== input) other.checked = false;
        });
      } else {
        inputs.forEach((other) => {
          if (other.dataset.exclusiveNone === "true") other.checked = false;
        });
      }
      rebuild();
    });
  });
}

export function bindConsultation() {
  const root = document.querySelector("[data-share-prep]");
  if (!root) return;

  const sourceInputs = [...root.querySelectorAll("[data-consult-source]")];
  const purposeInputs = [...root.querySelectorAll("[data-consult-purpose-option]")];
  const changeInputs = [...root.querySelectorAll("[data-consult-change-option]")];
  const actionInputs = [...root.querySelectorAll("[data-consult-action-option]")];
  const question = root.querySelector("[data-consult-question]");
  const changeNote = root.querySelector("[data-consult-change-note]");
  const actionNote = root.querySelector("[data-consult-action-note]");
  const copySource = root.querySelector("#consultation-report-text");
  const regionSelector = root.querySelector("[data-consult-region-selector]");
  const documentStage = root.querySelector("[data-consult-document-stage]");
  const document = root.querySelector("[data-consult-share-document]");
  const requiredStatus = root.querySelector("[data-consult-required-status]");

  const writeText = (selector, value) => {
    root.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
  };

  const activeKeys = () => new Set(
    sourceInputs
      .filter((input) => input.checked && !input.disabled)
      .map((input) => input.dataset.shareKey || ""),
  );

  const updatePageNumbers = () => {
    const pages = [...root.querySelectorAll("[data-consult-document-page]")].filter((page) => !page.hidden);
    pages.forEach((page, index) => {
      page.querySelectorAll("[data-consult-page-number]").forEach((node) => { node.textContent = String(index + 1); });
      page.querySelectorAll("[data-consult-page-count]").forEach((node) => { node.textContent = String(pages.length); });
    });
  };

  const syncVisibility = (keys) => {
    root.querySelectorAll("[data-consult-document-key]").forEach((element) => {
      const key = element.getAttribute("data-consult-document-key") || "";
      element.hidden = !keys.has(key);
    });

    const secondaryPage = root.querySelector('[data-consult-document-page="secondary"]');
    if (secondaryPage) {
      const needsBodyDetails = keys.has("body") && secondaryPage.dataset.hasBodyDetails === "true";
      secondaryPage.hidden = !needsBodyDetails && !["recent", "regional", "profile"].some((key) => keys.has(key));
    }

    root.querySelectorAll("[data-consult-pair]").forEach((pair) => {
      pair.hidden = [...pair.querySelectorAll("[data-consult-document-key]")].every((item) => item.hidden);
    });

    const detailsPage = root.querySelector('[data-consult-conditional-page="body-details"]');
    if (detailsPage) detailsPage.hidden = !keys.has("body");

    updatePageNumbers();
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

    const template = root.querySelector(`template[data-consult-region-visual-template="${CSS.escape(option.value)}"]`);
    root.querySelectorAll("[data-consult-region-visual]").forEach((element) => {
      if (template) element.innerHTML = template.innerHTML;
      else element.replaceChildren();
    });
  };

  const rebuild = () => {
    const keys = activeKeys();
    const purposeLabels = checkedLabels(purposeInputs);
    const purpose = question?.value.trim() || "未入力";
    const changes = combinedUserText(changeInputs, changeNote, "追加情報なし");
    const actions = combinedUserText(actionInputs, actionNote, "未入力");

    writeText("[data-consult-document-question]", purpose);
    writeText("[data-consult-document-purpose-labels]", purposeLabels.length ? purposeLabels.join("・") : "分類未選択");
    writeText("[data-consult-document-changes]", `追加情報：${changes}`);
    writeText("[data-consult-document-actions]", actions);
    syncVisibility(keys);

    const lines = [];
    if (purposeLabels.length) lines.push(`見てほしい内容：${purposeLabels.join("・")}`);
    if (question?.value.trim()) lines.push(`特に聞きたいこと：${question.value.trim()}`);
    lines.push(`最近変えたこと：${changes}`);
    lines.push(`すでに行った対応：${actions}`);
    sourceInputs
      .filter((input) => input.checked && !input.disabled)
      .forEach((input) => {
        lines.push(`${input.dataset.shareLabel || "項目"}：${input.dataset.shareValue || ""}`);
      });
    if (copySource) copySource.value = lines.join("\n");
  };

  const ensureQuestion = () => {
    if (question?.value.trim()) {
      question.removeAttribute("aria-invalid");
      if (requiredStatus) requiredStatus.textContent = "";
      return true;
    }
    question?.setAttribute("aria-invalid", "true");
    if (requiredStatus) requiredStatus.textContent = "「特に聞きたいこと」を入力してから共有してください。";
    question?.focus();
    question?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  };

  const closeViewer = () => {
    document.documentElement.classList.remove("consult-viewer-open");
    documentStage?.classList.remove("is-expanded");
  };

  sourceInputs.forEach((input) => input.addEventListener("change", rebuild));
  purposeInputs.forEach((input) => input.addEventListener("change", rebuild));
  bindExclusiveChoiceGroup(changeInputs, rebuild);
  bindExclusiveChoiceGroup(actionInputs, rebuild);
  [question, changeNote, actionNote].forEach((input) => input?.addEventListener("input", () => {
    if (input === question && question.value.trim()) {
      question.removeAttribute("aria-invalid");
      if (requiredStatus) requiredStatus.textContent = "";
    }
    rebuild();
  }));

  regionSelector?.addEventListener("change", () => {
    const option = regionSelector.selectedOptions?.[0];
    if (!option) return;
    updateRegionalItem(option);
    rebuild();
  });

  root.querySelector('[data-action="open-consult-viewer"]')?.addEventListener("click", () => {
    rebuild();
    if (!ensureQuestion()) return;
    document.documentElement.classList.add("consult-viewer-open");
    documentStage?.classList.add("is-expanded");
    documentStage?.querySelector('[data-action="close-consult-viewer"]')?.focus();
  });
  root.querySelector('[data-action="close-consult-viewer"]')?.addEventListener("click", closeViewer);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.documentElement.classList.contains("consult-viewer-open")) closeViewer();
  });

  root.querySelector('[data-action="copy-consultation-report"]')?.addEventListener("click", async (event) => {
    rebuild();
    if (!ensureQuestion()) return;
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
    if (!ensureQuestion()) return;
    window.print();
  });

  window.addEventListener("beforeprint", rebuild);
  window.addEventListener("pagehide", closeViewer);

  const initialOption = regionSelector?.selectedOptions?.[0];
  if (initialOption) updateRegionalItem(initialOption);
  rebuild();
}

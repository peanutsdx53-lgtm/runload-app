import { addMobileQuickToolEntry, removeMobileQuickToolEntry } from "../mobileQuickToolsStore.js";

const DELETE_LABEL_BY_TOOL = Object.freeze({ departure: "出発チェック" });

function setFormStatus(root, message, state = "") {
  const status = root.querySelector("[data-mobile-tool-form-status]");
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function saveDeparture(form, root) {
  const data = new FormData(form);
  const checks = data.getAll("checks").map((value) => String(value || "").trim()).filter(Boolean);
  const note = String(data.get("note") || "").trim();
  if (!checks.length && !note) {
    setFormStatus(root, "確認項目を選ぶか、メモを入力してください。", "error");
    return false;
  }
  if (!addMobileQuickToolEntry("departure", { checks, note })) {
    setFormStatus(root, "保存できませんでした。端末の保存領域を確認してください。", "error");
    return false;
  }
  return true;
}

function confirmDelete(tool) {
  const label = DELETE_LABEL_BY_TOOL[tool] || "保存内容";
  return typeof globalThis.confirm === "function"
    ? globalThis.confirm(`${label}を削除しますか？`)
    : false;
}

export function bindMobileQuickTool(context = {}) {
  const root = document.querySelector("[data-mobile-tool]");
  if (!root) return null;
  const form = root.querySelector("[data-mobile-tool-form]");

  const handleSubmit = (event) => {
    if (!form || event.target !== form) return;
    event.preventDefault();
    const tool = String(form.dataset.mobileToolForm || "");
    const saved = tool === "departure" ? saveDeparture(form, root) : false;
    if (!saved) return;
    context.rerender?.();
  };

  const handleClick = (event) => {
    const remove = event.target.closest("[data-mobile-tool-delete]");
    if (!remove) return;
    event.preventDefault();
    const tool = remove.dataset.mobileToolDeleteKind || "";
    const id = remove.dataset.mobileToolDelete || "";
    if (tool !== "departure" || !confirmDelete(tool)) return;
    if (removeMobileQuickToolEntry(tool, id)) context.rerender?.();
  };

  root.addEventListener("submit", handleSubmit);
  root.addEventListener("click", handleClick);

  return () => {
    root.removeEventListener("submit", handleSubmit);
    root.removeEventListener("click", handleClick);
  };
}
import { matchesMobileLayout } from "./deviceLayout.js";

let scanQueued = false;

function enhanceSavePanel(panel) {
  if (!panel || panel.querySelector("[data-mobile-extension-history-link]")) return;
  const button = panel.querySelector("[data-mobile-extension-save-button]");
  if (!button?.disabled || String(button.textContent || "").trim() !== "保存しました") return;
  const link = document.createElement("a");
  link.href = "#/history?mobileActivity=1";
  link.dataset.mobileExtensionHistoryLink = "";
  link.textContent = "活動別履歴を見る";
  button.insertAdjacentElement("afterend", link);
}

function scan() {
  scanQueued = false;
  if (!matchesMobileLayout()) return;
  document.querySelectorAll("[data-mobile-extension-save]").forEach(enhanceSavePanel);
}

function queueScan() {
  if (scanQueued) return;
  scanQueued = true;
  queueMicrotask(scan);
}

export function installMobileWalkJogSaveHistoryLink() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
  const observer = new MutationObserver(queueScan);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
  queueScan();
  return () => observer.disconnect();
}

if (typeof document !== "undefined") installMobileWalkJogSaveHistoryLink();

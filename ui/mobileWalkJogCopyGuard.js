import { matchesMobileLayout } from "./deviceLayout.js";

const BOUND_ROOTS = new WeakSet();

function selectedMeasurementMode(root) {
  return root.querySelector('[name="measurementMode"]:checked')?.value || "free";
}

function applyMeasurementModeLabel(root) {
  const label = root.querySelector("[data-measurement-mode-label]");
  if (!label) return;
  const mode = selectedMeasurementMode(root);
  label.textContent = mode === "time"
    ? "時間を決めて測る"
    : mode === "distance"
      ? "距離を決めて測る"
      : "自由に測る";
}

export function applyMobileActivityCopy(root) {
  if (!root) return;
  applyMeasurementModeLabel(root);
}

function bindRoot(root) {
  if (BOUND_ROOTS.has(root) || !matchesMobileLayout()) return;
  BOUND_ROOTS.add(root);
  const scheduleApply = () => queueMicrotask(() => applyMobileActivityCopy(root));
  root.addEventListener("change", (event) => {
    if (event.target?.matches?.('[name="measurementMode"]')) scheduleApply();
  });
  const observer = new MutationObserver(scheduleApply);
  observer.observe(root, { attributes: true, attributeFilter: ["data-measurement-phase"] });
  scheduleApply();
}

function scan() {
  if (!matchesMobileLayout()) return;
  document.querySelectorAll("[data-run-measurement]").forEach(bindRoot);
}

export function installMobileWalkJogCopyGuard() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

if (typeof document !== "undefined") installMobileWalkJogCopyGuard();

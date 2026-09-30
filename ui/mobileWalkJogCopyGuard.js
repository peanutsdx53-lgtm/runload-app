import { matchesMobileLayout } from "./deviceLayout.js";
import { MOBILE_ACTIVITY_IDS } from "./mobileWalkJogMeasurementWiring.js";

const BOUND_ROOTS = new WeakSet();

function setText(root, selector, runningText, extensionText, extension) {
  const element = root.querySelector(selector);
  if (!element) return;
  const next = extension ? extensionText : runningText;
  if (element.textContent !== next) element.textContent = next;
}

function selectedMeasurementMode(root) {
  return root.querySelector('[name="measurementMode"]:checked')?.value || "free";
}

function applyMeasurementModeLabel(root, extension) {
  const label = root.querySelector("[data-measurement-mode-label]");
  if (!label) return;
  const mode = selectedMeasurementMode(root);
  const runningText = mode === "time"
    ? "時間を決めて走る"
    : mode === "distance"
      ? "距離を決めて走る"
      : "自由に走る";
  const extensionText = mode === "time"
    ? "時間を決めて測る"
    : mode === "distance"
      ? "距離を決めて測る"
      : "自由に測る";
  const text = extension ? extensionText : runningText;
  if (label.textContent !== text) label.textContent = text;
}

export function applyMobileActivityCopy(root) {
  if (!root) return;
  const activityId = String(root.dataset.mobileActivityId || MOBILE_ACTIVITY_IDS.RUNNING_CURRENT);
  const extension = activityId !== MOBILE_ACTIVITY_IDS.RUNNING_CURRENT;
  root.classList.toggle("mobile-extension-activity", extension);

  setText(root, ".run-measurement-prep__intro .eyebrow", "RUN", "ACTIVITY", extension);
  setText(root, ".run-measurement-prep__intro h1", "今日はどう走りますか", "今日はどう動きますか", extension);
  setText(root, ".run-measurement-prep__intro > p:last-child", "目的を選んでから測定を開始します。", "活動を選んでから測定を開始します。", extension);

  setText(root, '.run-measurement-mode label:nth-of-type(1) b', "自由に走る", "自由に測る", extension);
  setText(root, '.run-measurement-mode label:nth-of-type(1) small', "終了するまで距離と時間を測定", "終了するまで距離と時間を測定", extension);
  setText(root, '.run-measurement-mode label:nth-of-type(2) b', "時間を決めて走る", "時間を決めて測る", extension);
  setText(root, '.run-measurement-mode label:nth-of-type(2) small', "残り時間をタイマー表示", "残り時間をタイマー表示", extension);
  setText(root, '.run-measurement-mode label:nth-of-type(3) b', "距離を決めて走る", "距離を決めて測る", extension);
  setText(root, '.run-measurement-mode label:nth-of-type(3) small', "残り距離を表示", "残り距離を表示", extension);

  setText(root, '[data-measurement-goal="time"] > label > span', "走る時間", "活動時間", extension);
  setText(root, '[data-measurement-goal="distance"] > label > span', "走る距離", "活動距離", extension);
  setText(root, ".run-measurement__route-save strong", "走行軌跡を端末内に保存", "移動軌跡を端末内に保存", extension);
  setText(root, ".run-measurement-active__map-toolbar strong", "走行地図", "移動地図", extension);
  setText(root, ".run-measurement-active__secondary summary span", "歩数・消費エネルギー", "歩数・補助記録", extension);
  setText(root, ".run-measurement-post__summary h1", "走行を測定しました", "活動を測定しました", extension);
  setText(root, ".run-measurement-post__auto-details summary b", "歩数・消費エネルギー・コース", "歩数・コース", extension);

  applyMeasurementModeLabel(root, extension);
}

function bindRoot(root) {
  if (BOUND_ROOTS.has(root) || !matchesMobileLayout()) return;
  BOUND_ROOTS.add(root);

  const scheduleApply = () => queueMicrotask(() => applyMobileActivityCopy(root));
  root.addEventListener("change", (event) => {
    if (event.target?.matches?.('[name="mobileActivityIdentity"], [name="measurementMode"]')) scheduleApply();
  });

  const observer = new MutationObserver(scheduleApply);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["data-mobile-activity-id", "data-measurement-phase"],
  });
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

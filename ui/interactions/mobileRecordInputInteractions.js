import { bindRecordInput } from "./recordInputInteractions.js";

function updateStageStatus({ form }) {
  const progress = form.querySelector("[data-record-progress]");
  if (!progress) return;
  const activityType = form.querySelector('[name="activityType"]:checked')?.value || "run";
  const dateReady = Boolean(String(form.elements.namedItem("date")?.value || "").trim());
  const distanceReady = Number(form.elements.namedItem("distanceKm")?.value) > 0;
  const durationReady = Number(form.elements.namedItem("durationMinutes")?.value) > 0;
  const stage1Complete = dateReady && (activityType === "rest" || (distanceReady && durationReady));
  const optionalMap = {
    2: form.querySelector('[data-optional-status="course"]')?.textContent === "入力あり",
    3: form.querySelector('[data-optional-status="compare"]')?.textContent === "入力あり",
    4: form.querySelector('[data-optional-status="reflection"]')?.textContent === "入力あり",
  };
  progress.querySelectorAll("[data-record-stage-jump]").forEach((button) => {
    const stage = Number(button.dataset.recordStageJump || 0);
    const status = button.querySelector(`[data-record-stage-status="${stage}"]`);
    const complete = stage === 1 ? stage1Complete : Boolean(optionalMap[stage]);
    button.classList.toggle("is-complete", complete);
    if (status) status.textContent = stage === 1 ? (complete ? "完了" : "入力中") : (complete ? "入力あり" : "任意");
  });
}

function setActiveStage(form, stage, { scroll = false } = {}) {
  const progress = form.querySelector("[data-record-progress]");
  if (!progress) return;
  const targetStage = Number(stage || 1);
  progress.querySelectorAll("[data-record-stage-jump]").forEach((button) => {
    const active = Number(button.dataset.recordStageJump || 0) === targetStage;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
  });
  const target = form.querySelector(`[data-record-stage="${targetStage}"]`);
  if (target instanceof HTMLDetailsElement) {
    form.querySelectorAll("details.stage-card[data-record-stage]").forEach((details) => { details.open = details === target; });
  }
  if (scroll && target) {
    const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }
}

const mobileEnhancement = Object.freeze({
  updateStageStatus,
  bind({ form, context }) {
    const progress = form.querySelector("[data-record-progress]");
    if (!progress) return;
    progress.querySelectorAll("[data-record-stage-jump]").forEach((button) => {
      button.addEventListener("click", () => setActiveStage(form, Number(button.dataset.recordStageJump || 1), { scroll: true }));
    });
    form.querySelectorAll("details.stage-card[data-record-stage]").forEach((details) => {
      details.addEventListener("toggle", () => { if (details.open) setActiveStage(form, Number(details.dataset.recordStage || 1)); });
    });
    updateStageStatus({ form });
    if (context?.parameters?.get?.("focus") === "next-check") {
      setActiveStage(form, 4);
      globalThis.requestAnimationFrame?.(() => {
        const target = form.elements.namedItem("postRunReflection");
        target?.scrollIntoView?.({ block: "center" });
        target?.focus?.({ preventScroll: true });
      });
    }
  },
  postSaveDestination({ context, recordId }) {
    return String(context?.parameters?.get?.("returnTo") || "") === "interpretation-room"
      ? { screen: "interpretation-room", parameters: { recordId, origin: "result" } }
      : { screen: "result", parameters: { recordId } };
  },
});

export function bindMobileRecordInput(args) {
  return bindRecordInput(args, mobileEnhancement);
}

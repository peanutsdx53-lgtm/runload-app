import { bindPlan } from "./planInteractions.js";

function setReview(form, open) {
  const confirm = form.querySelector("[data-plan-confirm]");
  const review = form.querySelector('[data-action="plan-review"]');
  if (confirm) confirm.classList.toggle("is-mobile-review", Boolean(open));
  if (review) review.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) confirm?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  else form.querySelector(".panel")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
}

export function bindMobilePlan(args) {
  const cleanup = bindPlan(args);
  const form = document.getElementById("plan-form");
  if (form) {
    form.querySelector('[data-action="plan-review"]')?.addEventListener("click", () => setReview(form, true));
    form.querySelector('[data-action="plan-edit"]')?.addEventListener("click", () => setReview(form, false));
  }
  return cleanup;
}

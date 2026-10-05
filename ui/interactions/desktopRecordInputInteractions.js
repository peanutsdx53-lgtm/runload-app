import { bindRecordInput } from "./recordInputInteractions.js";

const desktopEnhancement = Object.freeze({
  updateVisibility({ form, activityType }) {
    const coreTitle = form.querySelector("[data-record-core-title]");
    if (coreTitle) coreTitle.textContent = activityType === "rest" ? "今日の休養" : "今日の走行";
    form.querySelectorAll("[data-record-reflection-label]").forEach((element) => {
      element.textContent = activityType === "rest" ? "身体・休養時の記録" : "身体・走ったときの記録";
    });
  },
});

export function bindDesktopRecordInput(args) {
  return bindRecordInput(args, desktopEnhancement);
}

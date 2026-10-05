import { ROF_J_PRESENTATION_VERSION, rofJGuidanceForSelection } from "../core/rofJAuthorConfirmedScale.js";
import { displayedRofValue, setTextIfChanged } from "./rofJPresentation.js";

let enhancementQueued = false;

function updateDesktopResultFatigue(section) {
  if (!(section instanceof HTMLElement)) return;
  section.dataset.rofPresentationVersion = ROF_J_PRESENTATION_VERSION;
  section.setAttribute("aria-label", "運動前後の疲労感");
  const heading = section.querySelector("header h3");
  if (heading) setTextIfChanged(heading, "運動前後の疲労感");
  const postValue = displayedRofValue(section.querySelector(".pc-fatigue-node.is-post strong"));
  if (postValue == null) return;
  let note = section.querySelector("[data-rof-result-guidance]");
  if (!note) {
    note = document.createElement("p");
    note.dataset.rofResultGuidance = "";
    section.append(note);
  }
  setTextIfChanged(note, `運動後の疲労感の目安：${rofJGuidanceForSelection(postValue)}`);
}

function queueEnhancement() {
  if (enhancementQueued) return;
  enhancementQueued = true;
  queueMicrotask(() => {
    enhancementQueued = false;
    document.querySelectorAll(".pc-result-fatigue").forEach(updateDesktopResultFatigue);
  });
}

const appRoot = document.getElementById("app");
if (appRoot && typeof MutationObserver === "function") {
  new MutationObserver(queueEnhancement).observe(appRoot, { childList: true, subtree: true });
}
queueEnhancement();

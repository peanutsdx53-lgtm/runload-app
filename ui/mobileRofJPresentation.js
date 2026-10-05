import { ROF_J_PRESENTATION_VERSION, rofJGuidanceForSelection } from "../core/rofJAuthorConfirmedScale.js";
import { displayedRofValue, setTextIfChanged } from "./rofJPresentation.js";

let enhancementQueued = false;

function updateMobileResultFatigue(section) {
  if (!(section instanceof HTMLElement)) return;
  section.dataset.rofPresentationVersion = ROF_J_PRESENTATION_VERSION;
  const postValue = displayedRofValue(section.querySelector(".fatigue-values .post strong"));
  const card = section.querySelector(".fatigue-card");
  if (postValue != null && card) {
    let note = card.querySelector("[data-rof-result-guidance]");
    if (!note) {
      note = document.createElement("p");
      note.className = "candidate-note";
      note.dataset.rofResultGuidance = "";
      card.append(note);
    }
    setTextIfChanged(note, `走った後の疲労感の目安：${rofJGuidanceForSelection(postValue)}`);
  }
  section.querySelectorAll("dl.visually-hidden > div").forEach((row) => {
    const term = row.querySelector("dt")?.textContent?.trim();
    if (!["走る前", "走った後"].includes(term)) return;
    const description = row.querySelector("dd");
    const value = displayedRofValue(description);
    if (description && value != null) setTextIfChanged(description, `${value} / 10。${rofJGuidanceForSelection(value)}`);
  });
}

function queueEnhancement() {
  if (enhancementQueued) return;
  enhancementQueued = true;
  queueMicrotask(() => {
    enhancementQueued = false;
    document.querySelectorAll(".fatigue-section").forEach(updateMobileResultFatigue);
  });
}

const appRoot = document.getElementById("app");
if (appRoot && typeof MutationObserver === "function") {
  new MutationObserver(queueEnhancement).observe(appRoot, { childList: true, subtree: true });
}
queueEnhancement();

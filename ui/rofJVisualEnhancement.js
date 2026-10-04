import {
  ROF_J_AUTHOR_CONFIRMED_ANCHORS,
  ROF_J_PRESENTATION_VERSION,
  isValidRofJSelection,
  rofJGuidanceForSelection,
  rofJSelectionDescriptor,
} from "../core/rofJAuthorConfirmedScale.js";

const ORIGINAL_ROF_ARTICLE_URL = "https://link.springer.com/article/10.1007/s40279-017-0711-5";
const ORIGINAL_ROF_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const ROF_J_ARTICLE_URL = "https://link.springer.com/article/10.1186/s40798-026-01108-8";
const ROF_J_LICENSE_URL = "https://creativecommons.org/licenses/by-nc-nd/4.0/";

const ORIGINAL_ROF_VISUALS = Object.freeze({
  lowest: "./assets/rof/rof-visual-lowest.png",
  low: "./assets/rof/rof-visual-low.png",
  moderate: "./assets/rof/rof-visual-moderate.png",
  high: "./assets/rof/rof-visual-high.png",
  highest: "./assets/rof/rof-visual-highest.png",
});

let enhancementQueued = false;

function setTextIfChanged(node, value) {
  if (!node || node.textContent === value) return;
  node.textContent = value;
}

function createAnchorPoint(anchor) {
  const point = document.createElement("div");
  point.className = "rof-author-anchor";
  point.dataset.rofAnchorPosition = String(anchor.position);
  point.setAttribute("aria-label", `${anchor.positionLabel}、${anchor.descriptor}`);

  const visual = document.createElement("span");
  visual.className = "rof-author-anchor__visual";
  const image = document.createElement("img");
  image.src = ORIGINAL_ROF_VISUALS[anchor.visualKey];
  image.alt = "";
  image.setAttribute("aria-hidden", "true");
  image.loading = "eager";
  image.decoding = "async";
  visual.append(image);

  const position = document.createElement("b");
  position.className = "rof-author-anchor__position";
  position.textContent = anchor.positionLabel;

  point.append(visual, position);
  return point;
}

function createVisualGuide() {
  const section = document.createElement("section");
  section.className = "rof-visual-guide rof-visual-guide--compact rof-visual-guide--author-confirmed";
  section.dataset.rofVisualGuide = "";
  section.setAttribute(
    "aria-label",
    "疲労感の目安。0はまったく疲れていない、2と3の間は少し疲れている、5は中程度に疲れている、7と8の間はとても疲れている、10は完全な疲労困憊。",
  );

  const heading = document.createElement("div");
  heading.className = "rof-visual-guide__head";
  heading.innerHTML = "<small>疲労感の目安</small><span>左の0から右の10へ、横軸と同じ向きで確認できます。</span>";

  const anchors = document.createElement("div");
  anchors.className = "rof-author-anchor-list";
  [...ROF_J_AUTHOR_CONFIRMED_ANCHORS]
    .sort((left, right) => Number(left.position) - Number(right.position))
    .forEach((anchor) => anchors.append(createAnchorPoint(anchor)));

  section.append(heading, anchors);
  return section;
}

function createReferenceGuide() {
  const section = document.createElement("section");
  section.className = "rof-about-reference";
  section.dataset.rofReferenceGuide = "";

  const title = document.createElement("strong");
  title.textContent = "正式な尺度配置";
  const note = document.createElement("small");
  note.textContent = "公開補足資料の数値位置について、責任著者への確認に基づき原版ROFと同じ配置を採用しています。2.5・7.5を新しい選択値として追加するものではありません。";

  const list = document.createElement("div");
  list.className = "rof-about-reference__list";
  ROF_J_AUTHOR_CONFIRMED_ANCHORS.forEach((anchor) => {
    const row = document.createElement("p");
    const position = document.createElement("b");
    position.textContent = anchor.positionLabel;
    const descriptor = document.createElement("span");
    descriptor.textContent = anchor.descriptor;
    row.append(position, descriptor);
    list.append(row);
  });

  section.append(title, note, list);
  return section;
}

function createRightsNote() {
  const wrapper = document.createElement("div");
  wrapper.className = "rof-rights-note";
  wrapper.dataset.rofRightsNote = "";
  wrapper.innerHTML = `
    <p><strong>出典・ライセンス</strong></p>
    <p>ROF-J：Suzuki &amp; Arai (2026)。日本語表現は改変せず、尺度上の配置は責任著者への確認に基づき原版ROFと同じ位置で表示しています。<a href="${ROF_J_ARTICLE_URL}" target="_blank" rel="noopener noreferrer">ROF-J原典</a>・<a href="${ROF_J_LICENSE_URL}" target="_blank" rel="noopener noreferrer">CC BY-NC-ND 4.0</a></p>
    <p>図：Micklewright et al. (2017)。原版ROFの図部分を切り出し、各図を原版と同じ尺度位置に対応させて表示しています。図自体は変更していません。<a href="${ORIGINAL_ROF_ARTICLE_URL}" target="_blank" rel="noopener noreferrer">ROF原典</a>・<a href="${ORIGINAL_ROF_LICENSE_URL}" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p>`;
  return wrapper;
}

function makeInitialSliderValueSelectable(panel) {
  const slider = panel.querySelector("[data-record-rof-slider]");
  if (!slider || slider.dataset.rofPointerSelectBound === "true") return;
  slider.dataset.rofPointerSelectBound = "true";
  slider.addEventListener("pointerdown", () => {
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function selectionIsUntouched(panel, slider) {
  if (!slider) return true;
  if (slider.classList.contains("is-untouched")) return true;
  const output = panel.querySelector("[data-record-rof-value]");
  return output?.textContent?.trim() === "—";
}

function syncAuthorConfirmedPresentation(panel) {
  const slider = panel.querySelector("[data-record-rof-slider]");
  const descriptor = panel.querySelector("[data-record-rof-descriptor]");
  const anchor = panel.querySelector("[data-record-rof-anchor]");
  if (!slider || !descriptor) return;

  if (selectionIsUntouched(panel, slider)) {
    setTextIfChanged(descriptor, "数値を選択");
    if (anchor) setTextIfChanged(anchor, rofJGuidanceForSelection(null));
    return;
  }

  const value = Number(slider.value);
  setTextIfChanged(descriptor, rofJSelectionDescriptor(value));
  if (anchor) setTextIfChanged(anchor, rofJGuidanceForSelection(value));
}

function bindPresentationSync(panel) {
  const slider = panel.querySelector("[data-record-rof-slider]");
  if (!slider || slider.dataset.rofAuthorConfirmedBound === "true") return;
  slider.dataset.rofAuthorConfirmedBound = "true";
  const schedule = () => queueMicrotask(() => syncAuthorConfirmedPresentation(panel));
  slider.addEventListener("input", schedule);
  slider.addEventListener("change", schedule);
  schedule();
}

function enhanceRofScale(panel) {
  if (!(panel instanceof HTMLElement)) return;
  panel.dataset.rofPresentationVersion = ROF_J_PRESENTATION_VERSION;

  if (panel.dataset.rofVisualEnhanced !== "true") {
    panel.dataset.rofVisualEnhanced = "true";
    const sliderWrap = panel.querySelector("[data-rof-slider-wrap]");
    if (sliderWrap && !panel.querySelector("[data-rof-visual-guide]")) {
      sliderWrap.before(createVisualGuide());
    }

    const context = panel.closest("[data-rof-context], .rof-sheet");
    const aboutBody = context?.querySelector(".rof-about > div");
    if (aboutBody && !aboutBody.querySelector("[data-rof-reference-guide]")) {
      aboutBody.append(createReferenceGuide());
    }
    if (aboutBody && !aboutBody.querySelector("[data-rof-rights-note]")) {
      aboutBody.append(createRightsNote());
    }

    makeInitialSliderValueSelectable(panel);
  }

  bindPresentationSync(panel);
  syncAuthorConfirmedPresentation(panel);
}

function displayedRofValue(node) {
  const match = String(node?.textContent || "").match(/(?:^|\s)(\d{1,2})(?:\s|$|\/)/);
  if (!match) return null;
  const value = Number(match[1]);
  return isValidRofJSelection(value) ? value : null;
}

function updateMobileResultFatigue(section) {
  if (!(section instanceof HTMLElement)) return;
  section.dataset.rofPresentationVersion = ROF_J_PRESENTATION_VERSION;

  const postValue = displayedRofValue(section.querySelector(".fatigue-values .post strong"));
  const card = section.querySelector(".fatigue-card");
  if (postValue != null && card) {
    let note = card.querySelector("[data-rof-result-guidance]") || card.querySelector(".candidate-note");
    if (!note) {
      note = document.createElement("p");
      note.className = "candidate-note";
      card.append(note);
    }
    note.dataset.rofResultGuidance = "";
    setTextIfChanged(note, `走った後の疲労感の目安：${rofJGuidanceForSelection(postValue)}`);
  }

  section.querySelectorAll("dl.visually-hidden > div").forEach((row) => {
    const term = row.querySelector("dt")?.textContent?.trim();
    if (!["走る前", "走った後"].includes(term)) return;
    const description = row.querySelector("dd");
    const value = displayedRofValue(description);
    if (!description || value == null) return;
    setTextIfChanged(description, `${value} / 10。${rofJGuidanceForSelection(value)}`);
  });
}

function updatePcResultFatigue(section) {
  if (!(section instanceof HTMLElement)) return;
  section.dataset.rofPresentationVersion = ROF_J_PRESENTATION_VERSION;
  section.setAttribute("aria-label", "運動前後の疲労感");
  const heading = section.querySelector("header h3");
  if (heading) setTextIfChanged(heading, "運動前後の疲労感");

  const postValue = displayedRofValue(section.querySelector(".pc-fatigue-node.is-post strong"));
  if (postValue == null) return;
  let note = section.querySelector("[data-rof-result-guidance]");
  if (!note) {
    const legacyNote = [...section.children].find((element) => element.tagName === "P");
    note = legacyNote || document.createElement("p");
    if (!legacyNote) section.append(note);
  }
  note.dataset.rofResultGuidance = "";
  setTextIfChanged(note, `運動後の疲労感の目安：${rofJGuidanceForSelection(postValue)}`);
}

function enhanceResultFatigue() {
  document.querySelectorAll(".fatigue-section").forEach(updateMobileResultFatigue);
  document.querySelectorAll(".pc-result-fatigue").forEach(updatePcResultFatigue);
}

function enforceDormantRecordOverlay() {
  if (document.body.classList.contains("record-overlay-open")) return;
  document.querySelectorAll("[data-record-rof-overlay]").forEach((overlay) => {
    if (!overlay.hidden) overlay.hidden = true;
  });
}

function enhanceAll() {
  enhancementQueued = false;
  document.querySelectorAll(".rof-scale-panel").forEach(enhanceRofScale);
  enhanceResultFatigue();
  enforceDormantRecordOverlay();
}

function queueEnhancement() {
  if (enhancementQueued) return;
  enhancementQueued = true;
  queueMicrotask(enhanceAll);
}

const appRoot = document.getElementById("app");
if (appRoot && typeof MutationObserver === "function") {
  new MutationObserver(queueEnhancement).observe(appRoot, { childList: true, subtree: true });
}
queueEnhancement();

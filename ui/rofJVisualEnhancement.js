import { ROF_J_DESCRIPTOR_MAP } from "../core/rofJCore.js";

const ORIGINAL_ROF_ARTICLE_URL = "https://link.springer.com/article/10.1007/s40279-017-0711-5";
const ORIGINAL_ROF_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const ROF_J_ARTICLE_URL = "https://link.springer.com/article/10.1186/s40798-026-01108-8";
const ROF_J_LICENSE_URL = "https://creativecommons.org/licenses/by-nc-nd/4.0/";

const ORIGINAL_ROF_VISUALS = Object.freeze([
  Object.freeze({ src: "./assets/rof/rof-visual-lowest.png", position: 1 }),
  Object.freeze({ src: "./assets/rof/rof-visual-low.png", position: 2 }),
  Object.freeze({ src: "./assets/rof/rof-visual-moderate.png", position: 3 }),
  Object.freeze({ src: "./assets/rof/rof-visual-high.png", position: 4 }),
  Object.freeze({ src: "./assets/rof/rof-visual-highest.png", position: 5 }),
]);
const OFFICIAL_DESCRIPTOR_VALUES = Object.freeze([2, 4, 6, 8, 10]);

let enhancementQueued = false;

function createVisualGuide() {
  const section = document.createElement("section");
  section.className = "rof-visual-guide rof-visual-guide--compact";
  section.dataset.rofVisualGuide = "";
  section.setAttribute("aria-label", "疲労感の視覚的な目安");

  const heading = document.createElement("div");
  heading.className = "rof-visual-guide__head";
  heading.innerHTML = "<small>疲労感の目安</small>";

  const strip = document.createElement("div");
  strip.className = "rof-visual-strip";
  strip.setAttribute("role", "img");
  strip.setAttribute("aria-label", "ROF原版の5つの図。左から右へ疲労感が低い側から高い側を示す視覚的な目安。個々の図に新しい数値対応は設定していない。");
  ORIGINAL_ROF_VISUALS.forEach(({ src, position }) => {
    const figure = document.createElement("span");
    figure.className = "rof-visual-strip__item";
    figure.dataset.rofVisualPosition = String(position);
    const image = document.createElement("img");
    image.src = src;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.loading = "eager";
    image.decoding = "async";
    figure.append(image);
    strip.append(figure);
  });

  const axis = document.createElement("div");
  axis.className = "rof-visual-axis";
  axis.setAttribute("aria-hidden", "true");
  axis.innerHTML = "<span>低い</span><i></i><span>高い</span>";

  section.append(heading, strip, axis);
  return section;
}

function createReferenceGuide() {
  const section = document.createElement("section");
  section.className = "rof-about-reference";
  section.dataset.rofReferenceGuide = "";
  section.innerHTML = "<strong>ROF-Jの正式な言葉</strong><small>補足資料の日本語表現を改変せず表示しています。</small>";

  const list = document.createElement("div");
  list.className = "rof-about-reference__list";
  OFFICIAL_DESCRIPTOR_VALUES.forEach((value) => {
    const row = document.createElement("p");
    row.innerHTML = `<b>${value}</b><span>${ROF_J_DESCRIPTOR_MAP[value]}</span>`;
    list.append(row);
  });
  section.append(list);
  return section;
}

function createRightsNote() {
  const wrapper = document.createElement("div");
  wrapper.className = "rof-rights-note";
  wrapper.dataset.rofRightsNote = "";
  wrapper.innerHTML = `
    <p><strong>出典・ライセンス</strong></p>
    <p>日本語の尺度文言：Suzuki &amp; Arai (2026)。文言は改変していません。<a href="${ROF_J_ARTICLE_URL}" target="_blank" rel="noopener noreferrer">ROF-J原典</a>・<a href="${ROF_J_LICENSE_URL}" target="_blank" rel="noopener noreferrer">CC BY-NC-ND 4.0</a></p>
    <p>図：Micklewright et al. (2017)。原版から図部分を切り出し、低い側から高い側への横並びに変更しています。個々の図に新しい数値対応は設定していません。<a href="${ORIGINAL_ROF_ARTICLE_URL}" target="_blank" rel="noopener noreferrer">ROF原典</a>・<a href="${ORIGINAL_ROF_LICENSE_URL}" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p>`;
  return wrapper;
}

function makeInitialFiveSelectable(panel) {
  const slider = panel.querySelector("[data-record-rof-slider]");
  if (!slider || slider.dataset.rofPointerSelectBound === "true") return;
  slider.dataset.rofPointerSelectBound = "true";
  slider.addEventListener("pointerdown", () => {
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function enhanceRofScale(panel) {
  if (!(panel instanceof HTMLElement) || panel.dataset.rofVisualEnhanced === "true") return;
  panel.dataset.rofVisualEnhanced = "true";

  const sliderWrap = panel.querySelector("[data-rof-slider-wrap]");
  if (sliderWrap && !panel.querySelector("[data-rof-visual-guide]")) {
    sliderWrap.before(createVisualGuide());
  }

  const anchorGuide = panel.querySelector(".rof-anchor-guide");
  const anchorLabel = anchorGuide?.querySelector("small");
  if (anchorLabel) anchorLabel.textContent = "選択の目安";

  const sheet = panel.closest(".rof-sheet");
  const aboutBody = sheet?.querySelector(".rof-about > div");
  if (aboutBody && !aboutBody.querySelector("[data-rof-reference-guide]")) {
    aboutBody.append(createReferenceGuide());
  }
  if (aboutBody && !aboutBody.querySelector("[data-rof-rights-note]")) {
    aboutBody.append(createRightsNote());
  }

  makeInitialFiveSelectable(panel);
}

function enhanceAll() {
  enhancementQueued = false;
  document.querySelectorAll(".rof-scale-panel").forEach(enhanceRofScale);
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

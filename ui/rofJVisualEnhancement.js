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
  section.className = "rof-visual-guide";
  section.dataset.rofVisualGuide = "";
  section.setAttribute("aria-labelledby", "rof-visual-guide-title");

  const heading = document.createElement("div");
  heading.className = "rof-visual-guide__head";
  heading.innerHTML = `
    <strong id="rof-visual-guide-title">ROF原版の図</strong>
    <small>数値との対応を作り替えず、疲労感の低い側から高い側への視覚的な目安として表示します。</small>`;

  const strip = document.createElement("div");
  strip.className = "rof-visual-strip";
  strip.setAttribute("role", "img");
  strip.setAttribute("aria-label", "ROF原版の5つの図。左から右へ、疲労感が低い側から高い側を示す視覚的な目安。数値との対応はこの表示では定義しない。");
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
  axis.innerHTML = "<span>疲労感が低い側</span><i></i><span>高い側</span>";

  section.append(heading, strip, axis);
  return section;
}

function createDescriptorGuide() {
  const section = document.createElement("section");
  section.className = "rof-descriptor-guide";
  section.dataset.rofDescriptorGuide = "";

  const heading = document.createElement("div");
  heading.className = "rof-descriptor-guide__head";
  heading.innerHTML = "<strong>ROF-Jの正式な言葉</strong><small>補足資料の日本語表現をそのまま表示しています。</small>";

  const list = document.createElement("div");
  list.className = "rof-descriptor-list";
  list.setAttribute("aria-label", "ROF-Jの正式な説明文");
  OFFICIAL_DESCRIPTOR_VALUES.forEach((value) => {
    const item = document.createElement("div");
    item.className = "rof-descriptor-list__item";
    item.dataset.rofDescriptorValue = String(value);
    const number = document.createElement("b");
    number.textContent = String(value);
    const text = document.createElement("span");
    text.textContent = ROF_J_DESCRIPTOR_MAP[value];
    item.append(number, text);
    list.append(item);
  });

  section.append(heading, list);
  return section;
}

function createRightsNote() {
  const wrapper = document.createElement("div");
  wrapper.className = "rof-rights-note";
  wrapper.dataset.rofRightsNote = "";
  wrapper.innerHTML = `
    <p><strong>出典・ライセンス</strong></p>
    <p>日本語の尺度文言：Suzuki &amp; Arai (2026)。文言は改変していません。<a href="${ROF_J_ARTICLE_URL}" target="_blank" rel="noopener noreferrer">ROF-J原典</a>・<a href="${ROF_J_LICENSE_URL}" target="_blank" rel="noopener noreferrer">CC BY-NC-ND 4.0</a></p>
    <p>図：Micklewright et al. (2017)。原版から図部分を切り出し、低い側から高い側への横並びに変更しています。<a href="${ORIGINAL_ROF_ARTICLE_URL}" target="_blank" rel="noopener noreferrer">ROF原典</a>・<a href="${ORIGINAL_ROF_LICENSE_URL}" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p>`;
  return wrapper;
}

function enhanceRofScale(panel) {
  if (!(panel instanceof HTMLElement) || panel.dataset.rofVisualEnhanced === "true") return;
  panel.dataset.rofVisualEnhanced = "true";

  const sliderWrap = panel.querySelector("[data-rof-slider-wrap]");
  if (sliderWrap && !panel.querySelector("[data-rof-visual-guide]")) {
    sliderWrap.before(createVisualGuide());
  }

  const anchorGuide = panel.querySelector(".rof-anchor-guide");
  if (anchorGuide && !panel.querySelector("[data-rof-descriptor-guide]")) {
    anchorGuide.after(createDescriptorGuide());
  }

  const sheet = panel.closest(".rof-sheet");
  const aboutBody = sheet?.querySelector(".rof-about > div");
  if (aboutBody && !aboutBody.querySelector("[data-rof-rights-note]")) {
    aboutBody.append(createRightsNote());
  }
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

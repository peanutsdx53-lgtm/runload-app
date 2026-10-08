import { escapeHtml } from "./commonComponents.js";
import { matchesMobileLayout } from "./deviceLayout.js";

let queued = false;

function cardSummary(card, index) {
  const date = card.querySelector("header strong")?.textContent?.trim() || `${index + 1}件目`;
  const facts = card.querySelector("header > span")?.textContent?.replace(/\s+/g, " ")?.trim() || "";
  const current = card.hasAttribute("data-current");
  return { date, facts, current };
}

function selectorMarkup(cards, selectedIndex) {
  return `<section class="body-timeline-desktop-selector" data-desktop-body-timeline-selector>
    <div class="body-timeline-desktop-selector__head"><div><small>RECORDS</small><strong>表示する記録</strong></div><p>保存時点の12部位表示を、同じ大きさで見比べます。</p></div>
    <div class="body-timeline-desktop-selector__items" role="tablist" aria-label="表示する記録">
      ${cards.map((card, index) => {
        const summary = cardSummary(card, index);
        const active = index === selectedIndex;
        return `<button type="button" role="tab" data-desktop-body-timeline-select="${index}" aria-selected="${active ? "true" : "false"}"${active ? ' class="is-active"' : ""}><small>${summary.current ? "今回" : `記録 ${index + 1}`}</small><strong>${escapeHtml(summary.date)}</strong><span>${escapeHtml(summary.facts)}</span></button>`;
      }).join("")}
    </div>
  </section>`;
}

function selectCard(screen, index, { focus = false } = {}) {
  const cards = [...screen.querySelectorAll("[data-body-timeline-card]")];
  if (!cards.length) return;
  const safeIndex = Math.max(0, Math.min(cards.length - 1, Number(index) || 0));
  cards.forEach((card, cardIndex) => {
    const selected = cardIndex === safeIndex;
    card.dataset.pcSelected = selected ? "true" : "false";
    card.hidden = !selected;
  });
  screen.querySelectorAll("[data-desktop-body-timeline-select]").forEach((button) => {
    const selected = Number(button.dataset.desktopBodyTimelineSelect) === safeIndex;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  });
}

function bindSelector(screen) {
  const buttons = [...screen.querySelectorAll("[data-desktop-body-timeline-select]")];
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => selectCard(screen, index));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === "ArrowLeft") next = Math.max(0, index - 1);
      if (event.key === "ArrowRight") next = Math.min(buttons.length - 1, index + 1);
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = buttons.length - 1;
      selectCard(screen, next, { focus: true });
    });
  });
}

function restoreMobileTimeline() {
  const screen = document.querySelector(".screen--body-timeline[data-body-timeline]");
  if (!screen) return;
  screen.querySelector("[data-desktop-body-timeline-selector]")?.remove();
  screen.querySelectorAll("[data-body-timeline-card]").forEach((card) => {
    card.hidden = false;
    delete card.dataset.pcSelected;
  });
  const heroText = screen.querySelector(".body-timeline-hero > p");
  if (heroText) heroText.textContent = "左右にスワイプして保存記録を見比べます。";
  delete screen.dataset.pcTimelineEnhanced;
}

function enhanceTimeline() {
  queued = false;
  if (matchesMobileLayout()) {
    restoreMobileTimeline();
    return;
  }
  const screen = document.querySelector(".screen--body-timeline[data-body-timeline]");
  if (!screen || screen.dataset.pcTimelineEnhanced === "true") return;
  const rail = screen.querySelector("[data-body-timeline-rail]");
  const cards = [...screen.querySelectorAll("[data-body-timeline-card]")];
  if (!rail || !cards.length) return;

  const requested = Number(screen.dataset.targetIndex);
  const selectedIndex = Number.isFinite(requested) ? Math.max(0, Math.min(cards.length - 1, requested)) : Math.max(0, cards.findIndex((card) => card.hasAttribute("data-current")));
  screen.dataset.pcTimelineEnhanced = "true";
  const heroText = screen.querySelector(".body-timeline-hero > p");
  if (heroText) heroText.textContent = "保存記録を選択すると、12部位の表示を大きな人体図で確認できます。";
  rail.insertAdjacentHTML("beforebegin", selectorMarkup(cards, selectedIndex));
  bindSelector(screen);
  selectCard(screen, selectedIndex);
}

function queueEnhancement() {
  if (queued) return;
  queued = true;
  queueMicrotask(enhanceTimeline);
}

const appRoot = document.getElementById("app");
if (appRoot) new MutationObserver(queueEnhancement).observe(appRoot, { childList: true, subtree: true });
window.matchMedia?.("(max-width: 54.99rem)")?.addEventListener?.("change", queueEnhancement);
queueEnhancement();

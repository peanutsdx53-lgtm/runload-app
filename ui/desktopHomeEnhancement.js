import { matchesMobileLayout } from "./deviceLayout.js";

const HOME_SELECTOR = ".screen--home .home-desktop-legacy";
let queued = false;

function shortcut(href, title, note) {
  return `<a href="${href}"><strong>${title}</strong><span>${note}</span><i aria-hidden="true">›</i></a>`;
}

function createHeading() {
  const section = document.createElement("section");
  section.className = "pc-home-heading";
  section.innerHTML = `<div><p class="eyebrow">RUNLOAD</p><h1 class="visually-hidden">ホーム</h1><p>記録、結果、予定を一画面で確認し、次に見る内容を整理します。</p></div><a class="pc-home-heading__action" href="#/record-input">記録を開く <span aria-hidden="true">→</span></a>`;
  return section;
}

function createOverview() {
  const section = document.createElement("section");
  section.className = "pc-home-overview";
  section.setAttribute("aria-label", "主要機能");
  section.innerHTML = `<div class="section-head"><div><small>WORKSPACE</small><h2>主要機能</h2></div><p>大画面では、よく使う機能へ直接移動できます。</p></div><nav class="pc-home-shortcuts" aria-label="主要機能">${shortcut("#/history", "履歴", "保存した記録を比較")}${shortcut("#/simulation?from=home", "条件比較", "条件を変えて確認")}${shortcut("#/course-library?returnTo=%23%2Fhome", "コース設定", "保存コースを確認")}${shortcut("#/consultation?from=home", "共有用にまとめる", "見せる内容を整理")}</nav>`;
  return section;
}

function enhanceHome() {
  queued = false;
  if (matchesMobileLayout()) return;
  const host = document.querySelector(HOME_SELECTOR);
  if (!host || host.dataset.pcHomeEnhanced === "true") return;
  const pcFocus = host.querySelector(".home-focus--pc");
  const mobileFocus = host.querySelector(".home-focus--mobile");
  const recordPlan = [...host.children].find((element) => element.classList?.contains("section"));
  if (!pcFocus || !recordPlan) return;

  host.dataset.pcHomeEnhanced = "true";
  mobileFocus?.remove();
  host.prepend(createHeading());

  const dashboard = document.createElement("div");
  dashboard.className = "pc-home-dashboard";
  host.insertBefore(dashboard, recordPlan);
  dashboard.append(pcFocus, recordPlan);

  recordPlan.classList.add("pc-home-rail");
  recordPlan.querySelector(".grid")?.classList.add("pc-home-rail__cards");
  const sectionHead = recordPlan.querySelector(".section-head > div");
  if (sectionHead && !sectionHead.querySelector("small")) sectionHead.insertAdjacentHTML("afterbegin", "<small>RECENT</small>");

  host.append(createOverview());
}

function queueEnhance() {
  if (queued) return;
  queued = true;
  queueMicrotask(enhanceHome);
}

const appRoot = document.getElementById("app");
if (appRoot) new MutationObserver(queueEnhance).observe(appRoot, { childList: true, subtree: true });
window.matchMedia?.("(max-width: 54.99rem)")?.addEventListener?.("change", queueEnhance);
queueEnhance();

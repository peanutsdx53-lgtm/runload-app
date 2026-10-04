import { matchesMobileLayout } from "./deviceLayout.js";

let queued = false;
const PERIODS = Object.freeze([7, 28, 90, 180]);

function currentHistoryParameters() {
  const raw = window.location.hash || "#/history";
  const queryIndex = raw.indexOf("?");
  return new URLSearchParams(queryIndex >= 0 ? raw.slice(queryIndex + 1) : "");
}

function historyHref(period, parameters) {
  const next = new URLSearchParams(parameters);
  next.set("view", "records");
  next.set("period", String(period));
  next.delete("recordId");
  return `#/history?${next.toString()}`;
}

function countKinds(screen) {
  const items = [...screen.querySelectorAll(".record-item")];
  let run = 0;
  let rest = 0;
  items.forEach((item) => {
    const label = item.querySelector(".record-kind")?.textContent?.trim();
    if (label === "休養") rest += 1;
    else if (label === "走行") run += 1;
  });
  return Object.freeze({ total: items.length, run, rest });
}

function workspaceMarkup(screen) {
  const parameters = currentHistoryParameters();
  const requestedPeriod = Number(parameters.get("period"));
  const period = PERIODS.includes(requestedPeriod) ? requestedPeriod : 28;
  const counts = countKinds(screen);
  return `<section class="history-desktop-workspace" data-desktop-history-workspace aria-label="履歴の概要と操作">
    <div class="history-desktop-workspace__summary">
      <div><small>表示期間</small><strong>${period}日</strong><span>保存記録を期間内で表示</span></div>
      <div><small>表示中</small><strong>${counts.total}件</strong><span>走行 ${counts.run}件 / 休養 ${counts.rest}件</span></div>
    </div>
    <div class="history-desktop-workspace__period">
      <span>期間</span>
      <div role="group" aria-label="表示期間">${PERIODS.map((value) => `<a class="${period === value ? "active" : ""}" href="${historyHref(value, parameters)}" aria-current="${period === value ? "page" : "false"}">${value}日</a>`).join("")}</div>
    </div>
    <nav class="history-desktop-workspace__links" aria-label="履歴から開く機能">
      <a href="#/body-timeline"><span>身体の推移</span><small>部位ごとの変化を確認</small><i aria-hidden="true">›</i></a>
      <a href="#/simulation?from=history"><span>条件比較</span><small>条件を変えて確認</small><i aria-hidden="true">›</i></a>
      <a class="primary" href="#/record-input"><span>新しい記録</span><small>走行・休養を入力</small><i aria-hidden="true">＋</i></a>
    </nav>
  </section>`;
}

function enhanceHistory() {
  queued = false;
  if (matchesMobileLayout()) return;
  const screen = document.querySelector(".screen--history.screen-layout--history");
  if (!screen || screen.querySelector("[data-desktop-history-workspace]")) return;
  const pageHead = screen.querySelector(":scope > .page-head");
  const records = screen.querySelector(".history-view--records");
  if (!pageHead || !records) return;
  pageHead.insertAdjacentHTML("afterend", workspaceMarkup(screen));
}

function queueEnhancement() {
  if (queued) return;
  queued = true;
  queueMicrotask(enhanceHistory);
}

const appRoot = document.getElementById("app");
if (appRoot) new MutationObserver(queueEnhancement).observe(appRoot, { childList: true, subtree: true });
window.matchMedia?.("(max-width: 54.99rem)")?.addEventListener?.("change", queueEnhancement);
queueEnhancement();

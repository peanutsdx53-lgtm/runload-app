import { escapeHtml } from "../ui/commonComponents.js";

const GROUPS = Object.freeze([
  Object.freeze({
    label: "APP",
    items: Object.freeze([
      Object.freeze({ screen: "settings", icon: "⚙", eyebrow: "APP SETTINGS", title: "設定", description: "表示・データ管理", primary: true }),
      Object.freeze({ screen: "consultation", icon: "⌁", eyebrow: "CONSULTATION", title: "相談", description: "見せる内容を整理" }),
      Object.freeze({ screen: "support-guidance", icon: "＋", eyebrow: "SUPPORT", title: "公的サポート", description: "症状や体調の相談先を確認" }),
    ]),
  }),
  Object.freeze({
    label: "INFORMATION",
    items: Object.freeze([
      Object.freeze({ screen: "privacy", icon: "◫", eyebrow: "PRIVACY", title: "プライバシー", description: "データの扱いを確認" }),
      Object.freeze({ screen: "reading", icon: "≡", eyebrow: "READ", title: "読みもの", description: "結果の意味や背景を確認" }),
    ]),
  }),
]);

function renderRow(item) {
  return `<a class="row${item.primary ? " primary" : ""}" href="#/${escapeHtml(item.screen)}"><span class="icon" aria-hidden="true">${escapeHtml(item.icon)}</span><span class="copy"><small>${escapeHtml(item.eyebrow)}</small><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></span><span class="arrow" aria-hidden="true">›</span></a>`;
}

export function renderMoreScreen() {
  return `<div class="screen screen--more prototype-parity prototype-parity--more">
    <section class="head"><p class="eyebrow">MORE</p><h1>その他</h1><p>必要な機能だけ、ここから開きます。</p></section>
    ${GROUPS.map((group) => `<section class="group"><p class="group-title">${escapeHtml(group.label)}</p><div class="list">${group.items.map(renderRow).join("")}</div></section>`).join("")}
  </div>`;
}

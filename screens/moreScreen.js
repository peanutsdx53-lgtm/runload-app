import { escapeHtml } from "../ui/commonComponents.js";
import { matchesMobileLayout } from "../ui/deviceLayout.js";

const BASE_GROUPS = Object.freeze([
  Object.freeze({
    label: "基本",
    items: Object.freeze([
      Object.freeze({ screen: "settings", icon: "⚙", title: "設定", description: "表示・データ管理", primary: true }),
      Object.freeze({ screen: "consultation", icon: "⌁", title: "共有用にまとめる", description: "見せる内容を整理" }),
      Object.freeze({ screen: "support-guidance", icon: "＋", title: "公的サポート", description: "相談先を確認" }),
    ]),
  }),
  Object.freeze({
    label: "情報",
    items: Object.freeze([
      Object.freeze({ screen: "privacy", icon: "◫", title: "プライバシー", description: "データの扱い" }),
      Object.freeze({ screen: "terms", icon: "§", title: "利用規約", description: "利用条件" }),
      Object.freeze({ screen: "reading", icon: "≡", title: "読みもの", description: "結果の背景を確認" }),
    ]),
  }),
]);

const MOBILE_INFO_ITEMS = Object.freeze([
  Object.freeze({ screen: "about", icon: "ⓘ", title: "このアプリについて", description: "クレジット・バージョン" }),
  Object.freeze({ screen: "terms", icon: "§", title: "利用規約", description: "利用条件" }),
  Object.freeze({ screen: "privacy", icon: "◫", title: "プライバシー", description: "データの扱い" }),
]);

function renderRow(item) {
  return `<a class="row${item.primary ? " primary" : ""}" href="#/${escapeHtml(item.screen)}"><span class="icon" aria-hidden="true">${escapeHtml(item.icon)}</span><span class="copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></span><span class="arrow" aria-hidden="true">›</span></a>`;
}

function renderMobileMoreScreen() {
  return `<div class="screen screen--more screen-layout screen-layout--more">
    <section class="head"><h1>その他</h1><p>スマホ版の機能は、ホームのアイコンまたは関連する画面から利用します。</p></section>
    <section class="group"><p class="group-title">HOME</p><div class="list">
      <a class="row primary" href="#/home"><span class="icon" aria-hidden="true">＋</span><span class="copy"><strong>ホームに機能を追加</strong><span>ホームで「編集」→「＋」から選択</span></span><span class="arrow" aria-hidden="true">›</span></a>
    </div></section>
    <section class="group"><p class="group-title">APP INFO</p><div class="list">${MOBILE_INFO_ITEMS.map(renderRow).join("")}</div></section>
  </div>`;
}

export function renderMoreScreen() {
  if (matchesMobileLayout()) return renderMobileMoreScreen();
  return `<div class="screen screen--more screen-layout screen-layout--more">
    <section class="head"><h1>その他</h1></section>
    ${BASE_GROUPS.map((group) => `<section class="group"><p class="group-title">${escapeHtml(group.label)}</p><div class="list">${group.items.map(renderRow).join("")}</div></section>`).join("")}
  </div>`;
}

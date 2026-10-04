import { escapeHtml } from "../../ui/commonComponents.js";

const INFO_ITEMS = Object.freeze([
  Object.freeze({ screen: "about", icon: "ⓘ", title: "このアプリについて", description: "クレジット・バージョン" }),
  Object.freeze({ screen: "terms", icon: "§", title: "利用規約", description: "利用条件" }),
  Object.freeze({ screen: "privacy", icon: "◫", title: "プライバシー", description: "データの扱い" }),
]);

function renderRow(item) {
  return `<a class="row" href="#/${escapeHtml(item.screen)}"><span class="icon" aria-hidden="true">${escapeHtml(item.icon)}</span><span class="copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></span><span class="arrow" aria-hidden="true">›</span></a>`;
}

export function renderMoreScreen() {
  return `<div class="screen screen--more screen-layout screen-layout--more">
    <section class="head"><h1>その他</h1><p>スマホ版の機能は、ホームのアイコンまたは関連する画面から利用します。</p></section>
    <section class="group"><p class="group-title">HOME</p><div class="list">
      <a class="row primary" href="#/home"><span class="icon" aria-hidden="true">＋</span><span class="copy"><strong>ホームに機能を追加</strong><span>ホームで「編集」→「＋」から選択</span></span><span class="arrow" aria-hidden="true">›</span></a>
    </div></section>
    <section class="group"><p class="group-title">APP INFO</p><div class="list">${INFO_ITEMS.map(renderRow).join("")}</div></section>
  </div>`;
}

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

const MOBILE_GROUPS = Object.freeze([
  Object.freeze({
    label: "スマホ機能",
    items: Object.freeze([
      Object.freeze({ screen: "achievements", icon: "🏆", title: "実績", description: "記録・予定・休養の達成状況" }),
      Object.freeze({ screen: "location-note", icon: "📍", title: "地点メモ", description: "場所を記録" }),
      Object.freeze({ screen: "quick-note", icon: "📝", title: "1分メモ", description: "短い振り返り" }),
      Object.freeze({ screen: "gear-note", icon: "🎒", title: "装備メモ", description: "装備を記録" }),
      Object.freeze({ screen: "departure-check", icon: "✓", title: "出発チェック", description: "走る前の確認" }),
      Object.freeze({ screen: "fuel-note", icon: "💧", title: "補給メモ", description: "水分・補給を記録" }),
      Object.freeze({ screen: "photo-note", icon: "📷", title: "写真メモ", description: "写真を端末内で管理" }),
      Object.freeze({ screen: "pace-tool", icon: "⌚", title: "ペース換算", description: "距離と時間を換算" }),
    ]),
  }),
]);

function renderRow(item) {
  return `<a class="row${item.primary ? " primary" : ""}" href="#/${escapeHtml(item.screen)}"><span class="icon" aria-hidden="true">${escapeHtml(item.icon)}</span><span class="copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></span><span class="arrow" aria-hidden="true">›</span></a>`;
}

export function renderMoreScreen() {
  const mobileInfo = Object.freeze({
    ...BASE_GROUPS[1],
    items: Object.freeze([
      Object.freeze({ screen: "about", icon: "ⓘ", title: "このアプリについて", description: "クレジット・バージョン" }),
      ...BASE_GROUPS[1].items,
    ]),
  });
  const groups = matchesMobileLayout()
    ? [BASE_GROUPS[0], MOBILE_GROUPS[0], mobileInfo]
    : BASE_GROUPS;
  return `<div class="screen screen--more screen-layout screen-layout--more">
    <section class="head"><h1>その他</h1></section>
    ${groups.map((group) => `<section class="group"><p class="group-title">${escapeHtml(group.label)}</p><div class="list">${group.items.map(renderRow).join("")}</div></section>`).join("")}
  </div>`;
}

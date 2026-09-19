import { renderFeatureLinks, renderPageHeading } from "../ui/commonComponents.js";

export function renderMoreScreen() {
  const items = [
    { number: "01", screen: "settings", title: "設定", description: "表示・プロフィール・データ管理" },
    { number: "02", screen: "consultation", title: "相談", description: "見せる内容を整理" },
    { number: "03", screen: "support-guidance", title: "公的な相談先", description: "公式案内を確認" },
    { number: "04", screen: "privacy", title: "プライバシー", description: "保存と外部との境界" },
    { number: "05", screen: "reading", title: "読みもの", description: "一般情報を確認" },
  ];
  return `<section class="screen screen--more">
    ${renderPageHeading({ eyebrow: "その他", title: "必要な機能を開く", description: "設定・相談・公的案内・プライバシー・読みものをまとめています。" })}
    ${renderFeatureLinks(items)}
  </section>`;
}

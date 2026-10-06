import { createApplicationServices } from "../core/appCore.js";
import { matchesMobileLayout } from "./deviceLayout.js";
import { hasAcceptedCurrentTerms, withCurrentTermsAccepted } from "./legalAcceptance.js";

const services = createApplicationServices();
const GATE_ID = "runload-desktop-terms-gate";

const TERMS_SECTIONS = Object.freeze([
  ["1. 本アプリについて", "このアプリは、走行・休養・コース・身体の記録を整理し、自分の記録を振り返るためのアプリです。"],
  ["2. 医療・安全に関する位置づけ", "本アプリは、診断、原因の特定、危険度・傷害確率の判定、走行可否、受診要否、治療・運動処方を行いません。緊急時や体調に不安がある場合は、本アプリの表示だけで判断せず、公的な相談先や医療機関を利用してください。"],
  ["3. 記録と計算結果", "入力内容やGPS等から得た情報に基づき、記録・比較用の表示を作成します。表示値は実際の筋力、関節力、組織負荷等を直接測定した値ではありません。入力内容や利用環境により、記録や表示に差が生じる場合があります。"],
  ["4. データの扱い", "アプリ内の記録は端末内保存を基本とします。GPSは測定時に端末の許可を得て取得します。地図表示ではOpenStreetMapの地図画像を取得します。バックアップ、外部サイト、電話、共有等は利用者が操作した場合に実行されます。"],
  ["5. 利用者の責任", "入力内容、端末の管理、バックアップ、外部への共有は利用者自身で管理してください。安全を損なう状況で端末を操作しないでください。"],
  ["6. 禁止事項", "法令に違反する利用、第三者の権利を侵害する利用、本アプリや関連システムの動作を不正に妨げる行為を禁止します。"],
  ["7. 提供内容の変更", "品質向上、仕様変更、研究・開発上の更新等により、本アプリの機能・表示・利用条件を変更する場合があります。重要な利用条件を変更した場合は、必要に応じて再確認を求めます。"],
  ["8. 免責と法令上の権利", "本アプリは、特定の健康結果、競技結果、傷害防止等を保証するものではありません。ただし、適用される法令により制限または免除できない責任や利用者の権利を排除するものではありません。"],
  ["9. 規約への同意", "初回利用時に本規約へ同意したうえで利用を開始します。現在の規約は、設定画面からいつでも確認できます。"],
]);

function renderTermsBody() {
  return TERMS_SECTIONS.map(([title, body]) => `<section><h3>${title}</h3><p>${body}</p></section>`).join("");
}

function gateMarkup() {
  return `<div id="${GATE_ID}" class="desktop-first-use" data-desktop-first-use>
    <div class="desktop-first-use__backdrop" aria-hidden="true"></div>
    <section class="desktop-first-use__panel" role="dialog" aria-modal="true" aria-labelledby="desktop-first-use-title" tabindex="-1">
      <header class="desktop-first-use__header">
        <span class="desktop-first-use__brand" aria-hidden="true">R</span>
        <div><p>走行記録</p><h2 id="desktop-first-use-title">利用を開始する前に</h2></div>
      </header>
      <p class="desktop-first-use__lead">利用規約とデータの扱いを確認し、同意してから利用してください。</p>
      <div class="desktop-first-use__summary" aria-label="重要事項">
        <article><small>PURPOSE</small><strong>記録と振り返り</strong><span>走行・休養・身体の記録を自己理解と自己判断の材料として整理します。</span></article>
        <article><small>BOUNDARY</small><strong>医療判断ではありません</strong><span>診断、走行可否、受診要否、治療・運動処方は行いません。</span></article>
        <article><small>DATA</small><strong>端末内保存が基本</strong><span>記録は端末内で扱い、外部機能は利用者が選んだ場合に利用します。</span></article>
      </div>
      <details class="desktop-first-use__terms" data-desktop-terms-details>
        <summary>利用規約全文を確認</summary>
        <div class="desktop-first-use__terms-body">
          <div class="desktop-first-use__terms-meta"><span>第1版</span><span>2026年9月30日</span></div>
          ${renderTermsBody()}
        </div>
      </details>
      <p class="desktop-first-use__privacy-note">詳しい保存・通信の境界は、利用開始後も「データの扱い」画面から確認できます。</p>
      <label class="desktop-first-use__consent">
        <input type="checkbox" data-desktop-terms-consent>
        <span>利用規約に同意し、データの扱いを確認しました</span>
      </label>
      <footer class="desktop-first-use__actions">
        <button type="button" class="button button--primary" data-desktop-terms-accept disabled>同意して利用を開始</button>
      </footer>
    </section>
  </div>`;
}

function focusables(panel) {
  return [...panel.querySelectorAll('button:not([disabled]), input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden);
}

function removeGate() {
  document.getElementById(GATE_ID)?.remove();
}

function acceptTerms() {
  const current = services.storage.settings.load();
  services.storage.settings.save(withCurrentTermsAccepted(current));
  removeGate();
  document.querySelector("[data-guide-panel]")?.focus();
}

function bindGate(gate) {
  const panel = gate.querySelector(".desktop-first-use__panel");
  const consent = gate.querySelector("[data-desktop-terms-consent]");
  const accept = gate.querySelector("[data-desktop-terms-accept]");
  consent?.addEventListener("change", () => {
    if (accept) accept.disabled = !consent.checked;
  });
  accept?.addEventListener("click", () => {
    if (!consent?.checked) return;
    acceptTerms();
  });
  panel?.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const items = focusables(panel);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  window.requestAnimationFrame(() => panel?.focus());
}

function syncGate() {
  if (matchesMobileLayout()) {
    removeGate();
    return;
  }
  if (hasAcceptedCurrentTerms(services.storage.settings.load())) {
    removeGate();
    return;
  }
  if (document.getElementById(GATE_ID)) return;
  document.body.insertAdjacentHTML("beforeend", gateMarkup());
  const gate = document.getElementById(GATE_ID);
  if (gate) bindGate(gate);
}

const appRoot = document.getElementById("app");
if (appRoot) new MutationObserver(syncGate).observe(appRoot, { childList: true, subtree: true });
window.matchMedia?.("(max-width: 54.99rem)")?.addEventListener?.("change", syncGate);
queueMicrotask(syncGate);

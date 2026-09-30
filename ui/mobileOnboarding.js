import { escapeHtml } from "./commonComponents.js";
import { APP_GUIDE_VERSION } from "./guideContent.js";

export const MOBILE_ONBOARDING_VERSION = "mobile-onboarding-20260930-v3";
export const TERMS_VERSION = "terms-20260930-v1";

export function hasAcceptedCurrentTerms(settings = {}) {
  return settings?.termsAcceptedVersion === TERMS_VERSION;
}

export function shouldOpenMobileOnboarding(settings = {}, { mobile = true } = {}) {
  if (!mobile) return false;
  return settings?.mobileOnboardingVersionSeen !== MOBILE_ONBOARDING_VERSION || !hasAcceptedCurrentTerms(settings);
}

export function withMobileOnboardingComplete(settings = {}, { acceptedAt = new Date().toISOString() } = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  return Object.freeze({
    ...source,
    mobileOnboardingVersionSeen: MOBILE_ONBOARDING_VERSION,
    termsAcceptedVersion: TERMS_VERSION,
    termsAcceptedAt: source.termsAcceptedVersion === TERMS_VERSION && source.termsAcceptedAt
      ? source.termsAcceptedAt
      : acceptedAt,
    guideVersionSeen: APP_GUIDE_VERSION,
  });
}

const STEPS = Object.freeze([
  Object.freeze({
    key: "overview",
    eyebrow: "WELCOME",
    title: "記録から、次の判断へ",
    body: "RunLoadは、走行・休養を記録し、結果と履歴を振り返るためのアプリです。",
    visual: `<div class="mobile-onboarding__flow" aria-hidden="true"><span>記録</span><i>›</i><span>結果</span><i>›</i><span>振り返り</span></div>`,
  }),
  Object.freeze({
    key: "home",
    eyebrow: "HOME",
    title: "アプリ一覧＋記録概要",
    body: "アプリ一覧を中心に使います。横へ動かすと、今週の記録や次の予定を確認できます。",
    visual: `<div class="mobile-onboarding__home-demo" aria-hidden="true"><span><b>▦</b><small>アプリ一覧</small></span><i>›</i><span><b>12.3</b><small>記録概要</small></span></div>`,
  }),
  Object.freeze({
    key: "privacy",
    eyebrow: "YOUR DATA",
    title: "記録は端末内が基本",
    body: "GPSは測定時だけ取得します。地図表示ではOpenStreetMapの地図画像を取得します。",
    visual: `<div class="mobile-onboarding__privacy-grid" aria-hidden="true"><span><b>▣</b><small>端末内保存</small></span><span><b>◎</b><small>GPSは測定時</small></span><span><b>↗</b><small>共有は自分で選択</small></span></div>`,
  }),
  Object.freeze({
    key: "agreement",
    eyebrow: "START",
    title: "確認して利用開始",
    body: "RunLoadは医療診断や走行可否の判定を行うものではありません。",
    visual: "",
  }),
]);

function renderStep(step, index, currentIndex, { alreadyAccepted = false } = {}) {
  const isFinal = index === STEPS.length - 1;
  const hidden = index === currentIndex ? "" : " hidden";
  const agreement = isFinal
    ? `<div class="mobile-onboarding__agreement">
        <div class="mobile-onboarding__legal-links">
          <a href="./#/terms?returnTo=%23%2Fhome" target="_blank" rel="noopener">利用規約</a>
          <a href="./#/privacy?returnTo=%23%2Fhome" target="_blank" rel="noopener">プライバシー</a>
        </div>
        ${alreadyAccepted
          ? '<p class="mobile-onboarding__accepted">現在の利用規約は確認済みです。</p>'
          : '<label class="mobile-onboarding__consent"><input type="checkbox" data-onboarding-consent><span>利用規約に同意し、データの扱いを確認しました</span></label>'}
      </div>`
    : "";
  return `<section class="mobile-onboarding__step" data-onboarding-step="${escapeHtml(step.key)}" data-step-index="${index}"${hidden}>
    <p class="mobile-onboarding__eyebrow">${escapeHtml(step.eyebrow)}</p>
    <h2 id="mobile-onboarding-title-${index}">${escapeHtml(step.title)}</h2>
    <p class="mobile-onboarding__body">${escapeHtml(step.body)}</p>
    ${step.visual}
    ${agreement}
  </section>`;
}

export function renderMobileOnboarding({ open = false, replay = false, alreadyAccepted = false } = {}) {
  if (!open) return "";
  const currentIndex = 0;
  return `<div class="mobile-onboarding" data-mobile-onboarding data-replay="${replay ? "true" : "false"}" data-already-accepted="${alreadyAccepted ? "true" : "false"}">
    <div class="mobile-onboarding__backdrop" aria-hidden="true"></div>
    <section class="mobile-onboarding__panel" role="dialog" aria-modal="true" aria-labelledby="mobile-onboarding-title-0" tabindex="-1">
      <header class="mobile-onboarding__top">
        <span class="mobile-onboarding__brand" aria-label="RunLoad">R</span>
        <div class="mobile-onboarding__progress" aria-label="チュートリアルの進み具合">${STEPS.map((_, index) => `<i data-onboarding-dot="${index}" class="${index === currentIndex ? "is-current" : ""}"></i>`).join("")}</div>
        ${replay ? '<button type="button" class="mobile-onboarding__close" data-onboarding-close aria-label="チュートリアルを閉じる">×</button>' : '<span class="mobile-onboarding__top-spacer" aria-hidden="true"></span>'}
      </header>
      <div class="mobile-onboarding__content">
        ${STEPS.map((step, index) => renderStep(step, index, currentIndex, { alreadyAccepted })).join("")}
      </div>
      <footer class="mobile-onboarding__actions">
        <button type="button" class="button button--secondary" data-onboarding-prev disabled>戻る</button>
        <button type="button" class="button button--primary" data-onboarding-next>次へ</button>
        <button type="button" class="button button--primary" data-onboarding-complete${alreadyAccepted ? "" : " disabled"} hidden>${replay && alreadyAccepted ? "終了" : "同意して始める"}</button>
      </footer>
    </section>
  </div>`;
}

function focusable(panel) {
  return [...panel.querySelectorAll('button:not([disabled]):not([hidden]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden);
}

export function bindMobileOnboarding({ root = document, onComplete, onClose } = {}) {
  const dialog = root.querySelector("[data-mobile-onboarding]");
  if (!dialog) return;
  const panel = dialog.querySelector(".mobile-onboarding__panel");
  const steps = [...dialog.querySelectorAll("[data-onboarding-step]")];
  const dots = [...dialog.querySelectorAll("[data-onboarding-dot]")];
  const prev = dialog.querySelector("[data-onboarding-prev]");
  const next = dialog.querySelector("[data-onboarding-next]");
  const complete = dialog.querySelector("[data-onboarding-complete]");
  const consent = dialog.querySelector("[data-onboarding-consent]");
  const replay = dialog.dataset.replay === "true";
  const alreadyAccepted = dialog.dataset.alreadyAccepted === "true";
  let index = 0;

  const update = () => {
    steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== index; });
    dots.forEach((dot, dotIndex) => dot.classList.toggle("is-current", dotIndex === index));
    prev.disabled = index === 0;
    const final = index === steps.length - 1;
    next.hidden = final;
    complete.hidden = !final;
    panel?.setAttribute("aria-labelledby", `mobile-onboarding-title-${index}`);
    if (final) complete.disabled = alreadyAccepted ? false : !consent?.checked;
    panel?.focus();
  };

  prev?.addEventListener("click", () => { if (index > 0) { index -= 1; update(); } });
  next?.addEventListener("click", () => { if (index < steps.length - 1) { index += 1; update(); } });
  consent?.addEventListener("change", () => { complete.disabled = !consent.checked; });
  complete?.addEventListener("click", () => {
    if (!alreadyAccepted && !consent?.checked) return;
    onComplete?.();
  });
  dialog.querySelector("[data-onboarding-close]")?.addEventListener("click", () => onClose?.());

  panel?.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && replay) {
      event.preventDefault();
      onClose?.();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusable(panel);
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

  update();
}

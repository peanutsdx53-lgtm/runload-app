import {
  bindMobileOnboarding,
  renderMobileOnboarding,
  shouldOpenMobileOnboarding,
  withMobileOnboardingComplete,
} from "./mobileOnboarding.js";
import { hasAcceptedCurrentTerms } from "./legalAcceptance.js";
import { bindMobileHomeReturnTransitions, notifyMobileScreenRendered } from "./mobileHomeReturnTransition.js";
import { initializeAchievementState } from "./mobileAchievements.js";
import { clearAllPhotoMemos } from "./mobilePhotoMemoStore.js";

export const isMobilePlatform = true;

export function initializePlatformRuntime(services) {
  initializeAchievementState(services);
}

export function shouldOpenOnboarding(settings = {}) {
  return shouldOpenMobileOnboarding(settings, { mobile: true });
}

export function renderOnboarding({ open = false, replay = false, settings = {} } = {}) {
  return renderMobileOnboarding({
    open,
    replay,
    alreadyAccepted: hasAcceptedCurrentTerms(settings),
  });
}

export function bindOnboarding(context = {}) {
  return bindMobileOnboarding(context);
}

export function completeOnboarding(settings = {}) {
  return withMobileOnboardingComplete(settings);
}

export function notifyScreenRendered(screenName = "") {
  notifyMobileScreenRendered(screenName);
}

// UI-only preferences. This key does not participate in record/GPS/back-up schemas.
const HOME_CARD_PREFS_KEY = "runload-ui-home-summary-v1";
const CARD_IDS = ["calendar", "latest", "week", "month", "balance", "trend", "tip", "guide"];
// Default is editorially curated. Personal settings can expose every shortcut.
const DEFAULT_HIDDEN = ["month", "balance", "trend", "guide"];

function readHomeCardPrefs() {
  let raw = null;
  try { raw = globalThis.localStorage?.getItem(HOME_CARD_PREFS_KEY) ?? null; } catch { /* private context */ }
  let parsed = null;
  try { parsed = raw ? JSON.parse(raw) : null; } catch { /* invalid UI preferences */ }
  const ids = Array.isArray(parsed?.order) ? parsed.order.filter((id) => CARD_IDS.includes(id)) : [];
  const order = [...new Set([...ids, ...CARD_IDS])];
  const hidden = Array.isArray(parsed?.hidden) ? [...new Set([...parsed.hidden.filter((id) => CARD_IDS.includes(id)),...DEFAULT_HIDDEN.filter((id) => !ids.includes(id))])] : [...DEFAULT_HIDDEN];
  return { raw, order, hidden, density: parsed?.density === "compact" ? "compact" : "normal" };
}

function updateHomeCardView(root, prefs) {
  const host = root?.querySelector?.('[data-home-card-list]');
  if (!host) return;
  const nodes = new Map(Array.from(host.querySelectorAll('[data-home-card-id]'), el => [el.dataset.homeCardId, el]));
  for (const id of prefs.order) {
    const node = nodes.get(id);
    if (!node) continue;
    node.hidden = prefs.hidden.includes(id) || node.dataset.homeCardAvailable === "false";
    host.appendChild(node);
  }
  host.dataset.density = prefs.density;
  const section = root.querySelector('.w1-mobile-support');
  if (section) section.dataset.density = prefs.density;
  const visibleCount = Array.from(nodes.values()).filter((node) => !node.hidden).length;
  const supportSection = root.querySelector('.w1-mobile-support');
  if (supportSection) supportSection.hidden = visibleCount === 0;
}

function bindNewHomeEditor(root) {
  const openButton = root?.querySelector?.('[data-w1-edit-home]');
  const editor = root?.querySelector?.('[data-new-home-editor]');
  const main = root?.querySelector?.('[data-new-home-main]');
  const rows = editor?.querySelector?.('[data-home-editor-list]');
  if (!openButton || !editor || !main || !rows) return () => {};
  let saved = readHomeCardPrefs();
  updateHomeCardView(root, saved);
  let snapshotRaw = saved.raw;
  const status = editor.querySelector('[data-home-editor-status]');
  const setStatus = (message) => { if (status) status.textContent = message; };
  const fill = (prefs) => {
    for (const id of prefs.order) {
      const row = rows.querySelector(`[data-home-editor-row="${id}"]`);
      if (row) rows.appendChild(row);
    }
    for (const box of rows.querySelectorAll('[data-home-editor-visible]')) box.checked = !prefs.hidden.includes(box.dataset.homeEditorVisible);
    const density = editor.querySelector(`input[name="w1-home-density"][value="${prefs.density}"]`);
    if (density) density.checked = true;
  };
  const open = () => {
    saved = readHomeCardPrefs(); snapshotRaw = saved.raw;
    fill(saved); setStatus('');
    editor.hidden = false; main.hidden = true;
    openButton.setAttribute('aria-expanded','true');
    editor.scrollIntoView({block:'start'});
    editor.querySelector('[data-home-editor-visible]')?.focus({preventScroll:true});
  };
  const close = () => {
    editor.hidden = true; main.hidden = false;
    openButton.setAttribute('aria-expanded','false');
    openButton.focus({preventScroll:true});
  };
  const draft = () => {
    const order = Array.from(rows.querySelectorAll('[data-home-editor-row]'), el=>el.dataset.homeEditorRow);
    const hidden = Array.from(rows.querySelectorAll('[data-home-editor-visible]:not(:checked)'), el=>el.dataset.homeEditorVisible);
    const density = editor.querySelector('input[name="w1-home-density"]:checked')?.value === 'compact' ? 'compact' : 'normal';
    return {order, hidden, density};
  };
  const onOpen = () => open();
  const onEditorClick = (event) => {
    const button = event.target.closest('button');
    if (!button || !editor.contains(button)) return;
    if (button.hasAttribute('data-home-editor-cancel')) { updateHomeCardView(root, readHomeCardPrefs()); close(); return; }
    if (button.hasAttribute('data-home-editor-reset')) { fill({order:CARD_IDS,hidden:[...DEFAULT_HIDDEN],density:'normal'}); setStatus('初期配置を選択しました。保存すると反映されます。'); return; }
    if (button.hasAttribute('data-home-editor-save')) {
      const current = readHomeCardPrefs();
      if (current.raw !== snapshotRaw) { setStatus('別の画面で表示設定が変更されました。キャンセルして最新の設定を確認してください。'); return; }
      const value = draft();
      try {
        if (!globalThis.localStorage) throw new Error("UI storage unavailable");
        globalThis.localStorage.setItem(HOME_CARD_PREFS_KEY, JSON.stringify(value));
      }
      catch { setStatus('保存できませんでした。端末の保存設定をご確認ください。'); return; }
      saved = readHomeCardPrefs();
      updateHomeCardView(root, saved); close(); return;
    }
    const direction = button.dataset.homeEditorMove;
    if (direction) {
      const row = button.closest('[data-home-editor-row]');
      if (!row) return;
      if (direction === 'up' && row.previousElementSibling) rows.insertBefore(row,row.previousElementSibling);
      if (direction === 'down' && row.nextElementSibling) rows.insertBefore(row.nextElementSibling,row);
      button.focus({preventScroll:true});
    }
  };
  const onStorage = (event) => {
    if (event.key !== HOME_CARD_PREFS_KEY || !editor.hidden) return;
    saved = readHomeCardPrefs();updateHomeCardView(root,saved);
  };
  openButton.addEventListener('click',onOpen);
  editor.addEventListener('click',onEditorClick);
  globalThis.addEventListener?.('storage',onStorage);
  return () => {
    openButton.removeEventListener('click',onOpen);
    editor.removeEventListener('click',onEditorClick);
    globalThis.removeEventListener?.('storage',onStorage);
  };
}

export function bindPlatformShell(root) {
  const releaseTransitions = bindMobileHomeReturnTransitions(root);
  const releaseHomeEditor = bindNewHomeEditor(root);
  // Keep keyboard-focused auxiliary links above fixed bottom tabs.
  let lastFocusWasPointer = false;
  const onPointerInput = () => { lastFocusWasPointer = true; };
  const onKeyboardInput = (event) => { if (event.key === "Tab" || event.key.startsWith("Arrow")) lastFocusWasPointer = false; };
  const onAuxiliaryFocus = (event) => {
    const target = event.target;
    if (!target?.matches?.('.w1-mobile-cards a') || lastFocusWasPointer) return;
    const navigation = root?.querySelector?.('.primary-navigation');
    if (!navigation || globalThis.getComputedStyle?.(navigation).position !== 'fixed') return;
    const overlap = target.getBoundingClientRect().bottom - navigation.getBoundingClientRect().top;
    if (overlap > -8) globalThis.scrollBy?.({ top: overlap + 20, behavior: 'instant' });
  };
  root?.addEventListener?.('pointerdown', onPointerInput, true);
  root?.addEventListener?.('keydown', onKeyboardInput, true);
  root?.addEventListener?.('focusin', onAuxiliaryFocus);
  return () => {
    releaseHomeEditor();
    root?.removeEventListener?.('pointerdown', onPointerInput, true);
    root?.removeEventListener?.('keydown', onKeyboardInput, true);
    root?.removeEventListener?.('focusin', onAuxiliaryFocus);
    releaseTransitions?.();
  };
}
export async function clearPlatformUserData() {
  if (!await clearAllPhotoMemos()) return false;
  try { globalThis.localStorage?.removeItem("running-record-mobile-home-last-launch-v1"); } catch { return false; }
  return true;
}

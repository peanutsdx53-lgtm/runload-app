export const DEFAULT_JOURNAL_SETTINGS = Object.freeze({
  appearanceMode: "system",
  colorTheme: "standard",
  textSize: "standard",
  resultDisplayMode: "standard",
  selectedRegionalView: "WITHIN_RUN_REGIONAL_EMPHASIS",
  regionalResultInitialView: "all",
  regionalResultLastView: "all",
  showRegionalPreviousComparison: true,
});

export const APPEARANCE_MODE_OPTIONS = Object.freeze([
  Object.freeze({ value: "system", label: "端末に合わせる", description: "スマホやブラウザのライト/ダーク設定に合わせます。" }),
  Object.freeze({ value: "light", label: "ライト", description: "明るい背景で表示します。" }),
  Object.freeze({ value: "dark", label: "ダーク", description: "暗い背景で表示します。" }),
]);

export const COLOR_THEME_OPTIONS = Object.freeze([
  Object.freeze({ value: "standard", label: "シンプル", description: "Prototypeを基準にした青灰色の標準配色です。" }),
  Object.freeze({ value: "natural", label: "ナチュラル", description: "従来の暖色系背景と深い緑を残した配色です。" }),
  Object.freeze({ value: "green", label: "やさしい緑", description: "緑系の配色で、目にやさしく落ち着いた画面にします。" }),
  Object.freeze({ value: "blue", label: "すっきり青", description: "寒色の青系配色で、情報を整理して見やすい画面にします。" }),
  Object.freeze({ value: "orange", label: "あたたかい橙", description: "暖色の橙系配色で、あたたかく前向きな画面にします。" }),
]);

export const TEXT_SIZE_OPTIONS = Object.freeze([
  Object.freeze({ value: "standard", label: "標準", description: "RunLoadの標準文字サイズで表示します。" }),
  Object.freeze({ value: "large", label: "大きめ", description: "RunLoadが数値、部位名、説明文を少し大きく表示します。" }),
]);


export const RESULT_DISPLAY_MODE_OPTIONS = Object.freeze([
  Object.freeze({ value: "standard", label: "標準（記録から見る）", description: "結果画面は、今日の入力内容を先に表示し、その後で12部位の目安を表示します。" }),
  Object.freeze({ value: "result-first", label: "結果を先に見る", description: "結果画面は、12部位の身体図を先に表示し、その後で今日の入力内容を表示します。" }),
  Object.freeze({ value: "body-focus", label: "部位を詳しく見る", description: "結果画面は、12部位の身体図と身体の記録を先に表示し、部位詳細へ進むボタンを見つけやすくします。" }),
  Object.freeze({ value: "consultation-focus", label: "相談しやすく見る", description: "結果画面は、身体の記録と今日の記録条件を先に表示し、相談メモの作成へつなげます。" }),
  Object.freeze({ value: "compact", label: "短く見る", description: "結果画面は、12部位の身体図を先に表示し、今日の入力内容や詳しい説明を後半にまとめます。" }),
]);


export const REGIONAL_RESULT_INITIAL_VIEW_OPTIONS = Object.freeze([
  Object.freeze({ value: "focus", label: "基準または前回より数値が上の部位を絞り込む", description: "同じ距離の基準または比べられる前回記録より数値が1%以上上の部位だけを表示します。安全・危険を示すものではありません。" }),
  Object.freeze({ value: "all", label: "全12部位を表示", description: "身体図とともに、12部位の目安を正式名称の固定順ですべて表示します。数値順には並べ替えません。" }),
  Object.freeze({ value: "remember", label: "前回の切替を引き継ぐ", description: "結果画面で最後に選んだ表示方法を次回も使います。" }),
]);

export const REGIONAL_PREVIOUS_COMPARISON_OPTIONS = Object.freeze([
  Object.freeze({ value: "show", label: "表示する", description: "同じ部位・同じ計算方法・同じ基準で比べられる前回記録がある場合だけ、部位カードに前回との差を表示します。" }),
  Object.freeze({ value: "hide", label: "表示しない", description: "各部位の目安を表示し、今回と同じ距離にそろえたその部位自身の基準との関係を示します。保存結果や履歴は変更しません。" }),
]);

function optionValues(options) {
  return new Set(options.map((option) => option.value));
}

const APPEARANCE_VALUES = optionValues(APPEARANCE_MODE_OPTIONS);
const COLOR_VALUES = optionValues(COLOR_THEME_OPTIONS);
const TEXT_SIZE_VALUES = optionValues(TEXT_SIZE_OPTIONS);
const RESULT_DISPLAY_VALUES = optionValues(RESULT_DISPLAY_MODE_OPTIONS);
const REGIONAL_RESULT_INITIAL_VIEW_VALUES = optionValues(REGIONAL_RESULT_INITIAL_VIEW_OPTIONS);
const REGIONAL_RESULT_VIEW_VALUES = new Set(["focus", "all"]);
const REGIONAL_VIEW_VALUES = new Set([
  "WITHIN_RUN_REGIONAL_EMPHASIS",
  "OWN_FLAT_REFERENCE_RATIO",
  "PERSONAL_USUAL_RATIO",
]);

function pick(value, allowedValues, fallback) {
  const normalized = String(value || "").trim();
  return allowedValues.has(normalized) ? normalized : fallback;
}

export function normalizeJournalSettings(settings = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  return Object.freeze({
    ...source,
    appearanceMode: pick(source.appearanceMode, APPEARANCE_VALUES, DEFAULT_JOURNAL_SETTINGS.appearanceMode),
    colorTheme: pick(source.colorTheme, COLOR_VALUES, DEFAULT_JOURNAL_SETTINGS.colorTheme),
    textSize: pick(source.textSize, TEXT_SIZE_VALUES, DEFAULT_JOURNAL_SETTINGS.textSize),
    resultDisplayMode: pick(source.resultDisplayMode, RESULT_DISPLAY_VALUES, DEFAULT_JOURNAL_SETTINGS.resultDisplayMode),
    selectedRegionalView: pick(source.selectedRegionalView, REGIONAL_VIEW_VALUES, DEFAULT_JOURNAL_SETTINGS.selectedRegionalView),
    regionalResultInitialView: pick(source.regionalResultInitialView, REGIONAL_RESULT_INITIAL_VIEW_VALUES, DEFAULT_JOURNAL_SETTINGS.regionalResultInitialView),
    regionalResultLastView: pick(source.regionalResultLastView, REGIONAL_RESULT_VIEW_VALUES, DEFAULT_JOURNAL_SETTINGS.regionalResultLastView),
    showRegionalPreviousComparison: source.showRegionalPreviousComparison !== false && source.showRegionalPreviousComparison !== "hide",
  });
}

export function mergeJournalSettings(currentSettings = {}, settingsUpdate = {}) {
  const current = currentSettings && typeof currentSettings === "object" ? currentSettings : {};
  return normalizeJournalSettings({ ...current, ...settingsUpdate });
}

function replaceClassByPrefix(element, prefix, nextClass) {
  [...element.classList].forEach((className) => {
    if (className.startsWith(prefix)) element.classList.remove(className);
  });
  element.classList.add(nextClass);
}

function resolvedAppearanceIsDark(appearanceMode) {
  if (appearanceMode === "dark") return true;
  if (appearanceMode === "light") return false;
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function themeColorForSettings(settings) {
  const isDark = resolvedAppearanceIsDark(settings.appearanceMode);
  const lightColors = Object.freeze({ standard: "#e3ebf1", natural: "#eee9df", green: "#e7f4df", blue: "#edf3f7", orange: "#f7f0e5" });
  const darkColors = Object.freeze({ standard: "#0a1118", natural: "#111513", green: "#0b1810", blue: "#0e151c", orange: "#18120e" });
  const palette = isDark ? darkColors : lightColors;
  return palette[settings.colorTheme] || palette.standard;
}

export function applyJournalSettings(settings = {}) {
  if (typeof document === "undefined") return;
  const normalized = normalizeJournalSettings(settings);
  const root = document.documentElement;
  replaceClassByPrefix(root, "rl-appearance-", `rl-appearance-${normalized.appearanceMode}`);
  replaceClassByPrefix(root, "rl-color-", `rl-color-${normalized.colorTheme}`);
  replaceClassByPrefix(root, "rl-text-", `rl-text-${normalized.textSize}`);
  root.dataset.resultDisplayMode = normalized.resultDisplayMode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColorForSettings(normalized));
}

from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one anchor, found {count}: {old!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "screens/homeScreen.js",
    '    { href: "#/photo-note", label: "写真メモ", emoji: "📷", tone: "gray", optional: true },',
    '    { href: "#/photo-note", label: "写真メモ", emoji: "📷", tone: "gray", optional: true },\n    { href: "#/pace-tool", label: "ペース換算", emoji: "🧮", tone: "violet", optional: true },',
)

replace_once(
    "ui/interactions/homeInteractions.js",
    '  Object.freeze({ id: "photo-note", label: "写真メモ", description: "自分の写真と短いメモを端末内に保存" }),',
    '  Object.freeze({ id: "photo-note", label: "写真メモ", description: "自分の写真と短いメモを端末内に保存" }),\n  Object.freeze({ id: "pace-tool", label: "ペース換算", description: "距離と時間からペースを換算" }),',
)
replace_once(
    "ui/interactions/homeInteractions.js",
    '  ["#/photo-note", "photo-note"],',
    '  ["#/photo-note", "photo-note"],\n  ["#/pace-tool", "pace-tool"],',
)

replace_once(
    "app.js",
    'import { renderPhotoMemoScreen } from "./screens/mobilePhotoMemoScreen.js";',
    'import { renderPhotoMemoScreen } from "./screens/mobilePhotoMemoScreen.js";\nimport { renderPaceCalculatorScreen } from "./screens/mobilePaceCalculatorScreen.js";',
)
replace_once(
    "app.js",
    '  "photo-note": renderPhotoMemoScreen,',
    '  "photo-note": renderPhotoMemoScreen,\n  "pace-tool": renderPaceCalculatorScreen,',
)
replace_once(
    "app.js",
    '"departure-check", "fuel-note", "photo-note"].includes(screenName)',
    '"departure-check", "fuel-note", "photo-note", "pace-tool"].includes(screenName)',
)

replace_once(
    "ui/screenInteractions.js",
    'import { bindMobilePhotoMemo } from "./interactions/mobilePhotoMemoInteractions.js";',
    'import { bindMobilePhotoMemo } from "./interactions/mobilePhotoMemoInteractions.js";\nimport { bindMobilePaceCalculator } from "./interactions/mobilePaceCalculatorInteractions.js";',
)
replace_once(
    "ui/screenInteractions.js",
    '  "photo-note": bindMobilePhotoMemo,',
    '  "photo-note": bindMobilePhotoMemo,\n  "pace-tool": bindMobilePaceCalculator,',
)

replace_once(
    "ui/screenArchitecture.js",
    '  if (screen === "photo-note") return { title: "写真メモ", backHref: "#/home", backLabel: "ホーム" };',
    '  if (screen === "photo-note") return { title: "写真メモ", backHref: "#/home", backLabel: "ホーム" };\n  if (screen === "pace-tool") return { title: "ペース換算", backHref: "#/home", backLabel: "ホーム" };',
)

replace_once(
    "index.html",
    '  <link rel="stylesheet" href="./styles/mobile-quick-tools.css">',
    '  <link rel="stylesheet" href="./styles/mobile-quick-tools.css">\n  <link rel="stylesheet" href="./styles/mobile-pace-calculator.css">',
)

replace_once(
    "service-worker.js",
    '  "./screens/mobilePhotoMemoScreen.js",',
    '  "./screens/mobilePhotoMemoScreen.js",\n  "./screens/mobilePaceCalculatorScreen.js",',
)
replace_once(
    "service-worker.js",
    '  "./styles/mobile-quick-tools.css",',
    '  "./styles/mobile-quick-tools.css",\n  "./styles/mobile-pace-calculator.css",',
)
replace_once(
    "service-worker.js",
    '  "./ui/interactions/mobilePhotoMemoInteractions.js",',
    '  "./ui/interactions/mobilePhotoMemoInteractions.js",\n  "./ui/interactions/mobilePaceCalculatorInteractions.js",',
)

replace_once(
    "tests/mobileVisualAssetPolicy.test.mjs",
    "['⚖️', '📅', '📖', '📤', '⚙️', '📒', '⏱️', '🕘', '🗺️', '📍', '📝', '🎒', '✅', '💧', '📷']",
    "['⚖️', '📅', '📖', '📤', '⚙️', '📒', '⏱️', '🕘', '🗺️', '📍', '📝', '🎒', '✅', '💧', '📷', '🧮']",
)

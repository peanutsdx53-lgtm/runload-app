from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: anchor count {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "ui/interactions/homeInteractions.js",
    "const LONG_PRESS_MS = 380;\nconst TAP_SLOP_PX = 8;",
    "const LONG_PRESS_MS = 380;\nconst LAUNCH_ANIMATION_MS = 190;\nconst TAP_SLOP_PX = 8;",
)
replace_once(
    "ui/interactions/homeInteractions.js",
    "  let suppressClickUntil = 0;\n  let edgeTimer = null;",
    "  let suppressClickUntil = 0;\n  let launchTimer = null;\n  let edgeTimer = null;",
)
replace_once(
    "ui/interactions/homeInteractions.js",
    '''  function openHomeLauncher(launcher) {
    const href = String(launcher?.dataset?.homeHref || "");
    if (!href.startsWith("#/")) return;
    globalThis.location.hash = href.slice(1);
  }
''',
    '''  function openHomeLauncher(launcher) {
    const href = String(launcher?.dataset?.homeHref || "");
    if (!href.startsWith("#/")) return;
    if (root.classList.contains("is-home-launching")) return;

    const navigate = () => {
      launchTimer = null;
      globalThis.location.hash = href.slice(1);
    };
    const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduceMotion) {
      navigate();
      return;
    }

    const item = launcher.closest("[data-home-item-id]") || launcher;
    root.classList.add("is-home-launching");
    item.classList.add("is-home-launch-target");
    launcher.setAttribute("aria-busy", "true");
    launchTimer = setTimeout(navigate, LAUNCH_ANIMATION_MS);
  }
''',
)
replace_once(
    "ui/interactions/homeInteractions.js",
    '    if (scrollFrame) cancelAnimationFrame(scrollFrame);\n    viewport.removeEventListener("scroll", handlePageScroll);',
    '    if (scrollFrame) cancelAnimationFrame(scrollFrame);\n    if (launchTimer) clearTimeout(launchTimer);\n    viewport.removeEventListener("scroll", handlePageScroll);',
)

css_anchor = '''  .mobile-home-app:focus-visible,
  .mobile-home-widget:focus-visible,
  .mobile-home-dock__item:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--color-focus) 65%, transparent);
    outline-offset: 3px;
    border-radius: 18px;
  }
'''
css_new = css_anchor + '''
  .mobile-home-os.is-home-launching {
    pointer-events: none;
  }

  .mobile-home-os.is-home-launching [data-home-item-id]:not(.is-home-launch-target),
  .mobile-home-os.is-home-launching [data-home-widget-id] {
    animation: mobile-home-launch-dim 190ms ease-out both;
  }

  .mobile-home-launcher.is-home-launch-target {
    position: relative;
    z-index: 70;
    animation: mobile-home-launch-lift 190ms cubic-bezier(.2, .78, .24, 1) both;
  }

  .mobile-home-launcher.is-home-launch-target :is(.mobile-home-app__icon, .mobile-home-dock__icon) {
    animation: mobile-home-launch-icon 190ms cubic-bezier(.2, .78, .24, 1) both;
  }

  .mobile-home-launcher.is-home-launch-target :is(.mobile-home-app__label, .mobile-home-dock__label) {
    animation: mobile-home-launch-label 190ms ease-out both;
  }

  @keyframes mobile-home-launch-lift {
    0% { transform: translateY(0) scale(1); }
    30% { transform: translateY(1px) scale(.96); }
    100% { transform: translateY(-3px) scale(1.08); }
  }

  @keyframes mobile-home-launch-icon {
    0% { filter: brightness(1); }
    30% { filter: brightness(.96); }
    100% {
      filter: brightness(1.04);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, .88),
        0 16px 28px color-mix(in srgb, currentColor 20%, transparent);
    }
  }

  @keyframes mobile-home-launch-label {
    from { opacity: 1; }
    to { opacity: .86; }
  }

  @keyframes mobile-home-launch-dim {
    from { opacity: 1; }
    to { opacity: .72; }
  }
'''
replace_once("styles/mobile-home.css", css_anchor, css_new)

reduce_anchor = '''  .mobile-home-app__icon,
  .mobile-home-dock__icon {
    transition: none !important;
  }
'''
reduce_new = reduce_anchor + '''

  .mobile-home-launcher.is-home-launch-target,
  .mobile-home-launcher.is-home-launch-target :is(.mobile-home-app__icon, .mobile-home-dock__icon, .mobile-home-app__label, .mobile-home-dock__label),
  .mobile-home-os.is-home-launching [data-home-item-id],
  .mobile-home-os.is-home-launching [data-home-widget-id] {
    animation: none !important;
  }
'''
replace_once("styles/mobile-home-editing.css", reduce_anchor, reduce_new)

Path("tests/mobileHomeLaunchAnimation.test.mjs").write_text(
    '''import fs from "node:fs";\nimport assert from "node:assert/strict";\n\nconst interactions = fs.readFileSync("ui/interactions/homeInteractions.js", "utf8");\nconst css = fs.readFileSync("styles/mobile-home.css", "utf8");\nconst editingCss = fs.readFileSync("styles/mobile-home-editing.css", "utf8");\n\nassert.ok(interactions.includes("const LAUNCH_ANIMATION_MS = 190;"));\nassert.ok(interactions.includes('root.classList.add("is-home-launching")'));\nassert.ok(interactions.includes('item.classList.add("is-home-launch-target")'));\nassert.ok(interactions.includes('launcher.setAttribute("aria-busy", "true")'));\nassert.ok(interactions.includes('globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches'));\nassert.ok(interactions.includes("launchTimer = setTimeout(navigate, LAUNCH_ANIMATION_MS)"));\nassert.ok(interactions.includes("if (launchTimer) clearTimeout(launchTimer)"));\nassert.ok(css.includes("@keyframes mobile-home-launch-lift"));\nassert.ok(css.includes("@keyframes mobile-home-launch-icon"));\nassert.ok(css.includes("@keyframes mobile-home-launch-dim"));\nassert.ok(css.includes(".mobile-home-os.is-home-launching"));\nassert.ok(editingCss.includes(".mobile-home-launcher.is-home-launch-target"));\nconsole.log(JSON.stringify({ suite: "Mobile Home Launch Animation", total: 12, passed: 12, failed: 0, status: "PASS" }, null, 2));\n''',
    encoding="utf-8",
)

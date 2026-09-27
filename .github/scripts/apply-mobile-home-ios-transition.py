from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected 1 anchor, found {count}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

replace_once(
    'ui/interactions/homeInteractions.js',
    'const LAUNCH_ANIMATION_MS = 190;',
    'const LAUNCH_ANIMATION_MS = 360;\nconst LAUNCH_NAVIGATION_MS = 170;'
)

replace_once(
    'ui/interactions/homeInteractions.js',
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
    '''  function createLaunchSurface(launcher) {
    const icon = launcher.querySelector(".mobile-home-app__icon, .mobile-home-dock__icon");
    if (!(icon instanceof HTMLElement)) return null;
    const rect = icon.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) return null;

    const iconStyle = getComputedStyle(icon);
    const surface = document.createElement("div");
    surface.className = "mobile-home-launch-surface";
    surface.setAttribute("aria-hidden", "true");
    surface.style.setProperty("--launch-left", `${rect.left}px`);
    surface.style.setProperty("--launch-top", `${rect.top}px`);
    surface.style.setProperty("--launch-width", `${rect.width}px`);
    surface.style.setProperty("--launch-height", `${rect.height}px`);
    surface.style.setProperty("--launch-radius", iconStyle.borderRadius || "17px");
    surface.style.setProperty("--launch-start-color", iconStyle.backgroundColor || "var(--color-surface)");

    const glyph = document.createElement("span");
    glyph.className = "mobile-home-launch-surface__glyph";
    glyph.innerHTML = icon.innerHTML;
    surface.append(glyph);
    document.body.append(surface);

    const removeSurface = () => surface.remove();
    surface.addEventListener("animationend", removeSurface, { once: true });
    globalThis.setTimeout(removeSurface, LAUNCH_ANIMATION_MS + 180);
    return surface;
  }

  function openHomeLauncher(launcher) {
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
    const surface = createLaunchSurface(launcher);
    if (!surface) {
      navigate();
      return;
    }
    root.classList.add("is-home-launching");
    item.classList.add("is-home-launch-target");
    launcher.setAttribute("aria-busy", "true");
    launchTimer = setTimeout(navigate, LAUNCH_NAVIGATION_MS);
  }
'''
)

css = Path('styles/mobile-home.css')
text = css.read_text(encoding='utf-8')
old_start = text.index('  .mobile-home-os.is-home-launching {')
old_end = text.index('\n}\n\n@media (max-width: 24rem)', old_start)
replacement = '''  .mobile-home-os.is-home-launching {
    pointer-events: none;
    animation: mobile-home-ios-recede 230ms cubic-bezier(.2, .75, .25, 1) both;
    transform-origin: 50% 42%;
  }

  .mobile-home-launcher.is-home-launch-target {
    position: relative;
    z-index: 70;
  }

  .mobile-home-launch-surface {
    position: fixed;
    z-index: 10000;
    left: var(--launch-left);
    top: var(--launch-top);
    width: var(--launch-width);
    height: var(--launch-height);
    border-radius: var(--launch-radius);
    background: var(--launch-start-color);
    box-shadow: 0 12px 34px rgba(13, 29, 43, .22);
    overflow: hidden;
    pointer-events: none;
    transform: translateZ(0);
    will-change: left, top, width, height, border-radius, background-color, opacity;
    animation: mobile-home-ios-surface-open 360ms cubic-bezier(.18, .84, .22, 1) both;
  }

  .mobile-home-launch-surface__glyph {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: inherit;
    animation: mobile-home-ios-glyph-away 150ms ease-out both;
  }

  .mobile-home-launch-surface__glyph .mobile-home-emoji {
    font-size: 30px;
  }

  @keyframes mobile-home-ios-recede {
    from { transform: scale(1); opacity: 1; filter: blur(0); }
    to { transform: scale(.965); opacity: .64; filter: blur(1.2px); }
  }

  @keyframes mobile-home-ios-surface-open {
    0% {
      left: var(--launch-left);
      top: var(--launch-top);
      width: var(--launch-width);
      height: var(--launch-height);
      border-radius: var(--launch-radius);
      background-color: var(--launch-start-color);
      opacity: 1;
    }
    9% {
      left: calc(var(--launch-left) + 2px);
      top: calc(var(--launch-top) + 2px);
      width: calc(var(--launch-width) - 4px);
      height: calc(var(--launch-height) - 4px);
      border-radius: var(--launch-radius);
      opacity: 1;
    }
    72% {
      left: 0;
      top: 0;
      width: 100vw;
      height: 100dvh;
      border-radius: 26px;
      background-color: var(--color-paper);
      opacity: 1;
    }
    88% {
      left: 0;
      top: 0;
      width: 100vw;
      height: 100dvh;
      border-radius: 12px;
      background-color: var(--color-paper);
      opacity: 1;
    }
    100% {
      left: 0;
      top: 0;
      width: 100vw;
      height: 100dvh;
      border-radius: 0;
      background-color: var(--color-paper);
      opacity: 0;
    }
  }

  @keyframes mobile-home-ios-glyph-away {
    0%, 18% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1.18); opacity: 0; }
  }
'''
text = text[:old_start] + replacement + text[old_end:]
css.write_text(text, encoding='utf-8')

replace_once(
    'styles/mobile-home-editing.css',
    '''  .mobile-home-launcher.is-home-launch-target,
  .mobile-home-launcher.is-home-launch-target :is(.mobile-home-app__icon, .mobile-home-dock__icon, .mobile-home-app__label, .mobile-home-dock__label),
  .mobile-home-os.is-home-launching [data-home-item-id],
  .mobile-home-os.is-home-launching [data-home-widget-id] {
    animation: none !important;
  }
''',
    '''  .mobile-home-launcher.is-home-launch-target,
  .mobile-home-os.is-home-launching,
  .mobile-home-launch-surface,
  .mobile-home-launch-surface__glyph {
    animation: none !important;
  }
'''
)

Path('tests/mobileHomeLaunchAnimation.test.mjs').write_text('''import fs from "node:fs";\nimport assert from "node:assert/strict";\n\nconst interactions = fs.readFileSync("ui/interactions/homeInteractions.js", "utf8");\nconst css = fs.readFileSync("styles/mobile-home.css", "utf8");\nconst editingCss = fs.readFileSync("styles/mobile-home-editing.css", "utf8");\n\nassert.ok(interactions.includes("const LAUNCH_ANIMATION_MS = 360;"));\nassert.ok(interactions.includes("const LAUNCH_NAVIGATION_MS = 170;"));\nassert.ok(interactions.includes("function createLaunchSurface(launcher)"));\nassert.ok(interactions.includes('surface.className = "mobile-home-launch-surface"'));\nassert.ok(interactions.includes('surface.style.setProperty("--launch-left"'));\nassert.ok(interactions.includes('glyph.innerHTML = icon.innerHTML'));\nassert.ok(interactions.includes('document.body.append(surface)'));\nassert.ok(interactions.includes('surface.addEventListener("animationend", removeSurface'));\nassert.ok(interactions.includes("launchTimer = setTimeout(navigate, LAUNCH_NAVIGATION_MS)"));\nassert.ok(interactions.includes('globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches'));\nassert.ok(css.includes("@keyframes mobile-home-ios-surface-open"));\nassert.ok(css.includes("@keyframes mobile-home-ios-recede"));\nassert.ok(css.includes("@keyframes mobile-home-ios-glyph-away"));\nassert.ok(css.includes("width: 100vw;"));\nassert.ok(css.includes("height: 100dvh;"));\nassert.ok(editingCss.includes(".mobile-home-launch-surface"));\nconsole.log(JSON.stringify({ suite: "Mobile Home iOS-style Launch Transition", total: 16, passed: 16, failed: 0, status: "PASS" }, null, 2));\n''', encoding='utf-8')

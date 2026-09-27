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
    '} from "./homeGridModel.js";\n',
    '} from "./homeGridModel.js";\nimport { rememberMobileHomeLaunch } from "../mobileHomeReturnTransition.js";\n'
)
replace_once(
    'ui/interactions/homeInteractions.js',
    '    const item = launcher.closest("[data-home-item-id]") || launcher;\n    const surface = createLaunchSurface(launcher);',
    '    const item = launcher.closest("[data-home-item-id]") || launcher;\n    rememberMobileHomeLaunch(item.dataset.homeItemId || "");\n    const surface = createLaunchSurface(launcher);'
)

replace_once(
    'ui/shellInteractions.js',
    'function getFocusableElements(container) {',
    'import { bindMobileHomeReturnTransitions } from "./mobileHomeReturnTransition.js";\n\nfunction getFocusableElements(container) {'
)
replace_once(
    'ui/shellInteractions.js',
    'export function bindAppShellInteractions({ root, onOpenGuide, onCloseGuide, onSelectGuideSection }) {\n',
    'export function bindAppShellInteractions({ root, onOpenGuide, onCloseGuide, onSelectGuideSection }) {\n  const homeReturnCleanup = bindMobileHomeReturnTransitions(root);\n'
)
replace_once(
    'ui/shellInteractions.js',
    '  bindFeatureMenu(root);\n}',
    '  bindFeatureMenu(root);\n  return () => homeReturnCleanup?.();\n}'
)

replace_once(
    'app.js',
    'import { prepareUiMotion } from "./ui/uiMotion.js";\n',
    'import { prepareUiMotion } from "./ui/uiMotion.js";\nimport { notifyMobileScreenRendered } from "./ui/mobileHomeReturnTransition.js";\n'
)
replace_once(
    'app.js',
    '  if (desktopHeaderRoot?.firstElementChild) {\n    bindScreenTutorial({ root: desktopHeaderRoot, screenName });\n  }\n\n  window.requestAnimationFrame(() => {',
    '  if (desktopHeaderRoot?.firstElementChild) {\n    bindScreenTutorial({ root: desktopHeaderRoot, screenName });\n  }\n  notifyMobileScreenRendered(screenName);\n\n  window.requestAnimationFrame(() => {'
)

replace_once(
    'service-worker.js',
    '  "./ui/interactions/homeGridModel.js",\n',
    '  "./ui/interactions/homeGridModel.js",\n  "./ui/mobileHomeReturnTransition.js",\n'
)

css = Path('styles/mobile-home.css')
text = css.read_text(encoding='utf-8')
append = r'''

@media (max-width: 54.99rem) {
  html.is-mobile-home-return-transition::view-transition-group(root) {
    animation-duration: 420ms;
    animation-timing-function: cubic-bezier(.18, .82, .2, 1);
  }

  html.is-mobile-home-return-transition::view-transition-old(root) {
    z-index: 2;
    transform-origin: top left;
    overflow: clip;
    animation: mobile-home-ios-return-old 420ms cubic-bezier(.18, .82, .2, 1) both;
  }

  html.is-mobile-home-return-transition::view-transition-new(root) {
    z-index: 1;
    transform-origin: 50% 42%;
    animation: mobile-home-ios-return-new 420ms cubic-bezier(.18, .82, .2, 1) both;
  }

  .mobile-home-return-surface {
    position: fixed;
    z-index: 10000;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100dvh;
    border-radius: 0;
    background: var(--color-paper);
    pointer-events: none;
    opacity: 0;
    animation: mobile-home-return-fallback-cover 80ms ease-out both;
    will-change: left, top, width, height, border-radius, opacity;
  }

  .mobile-home-return-surface.is-closing {
    animation: mobile-home-return-fallback-close 400ms cubic-bezier(.18, .82, .2, 1) both;
  }

  @keyframes mobile-home-ios-return-old {
    0% {
      transform: translate3d(0, 0, 0) scale(1, 1);
      border-radius: 0;
      opacity: 1;
      filter: blur(0);
    }
    68% {
      opacity: 1;
      filter: blur(0);
    }
    100% {
      transform: translate3d(var(--home-return-x), var(--home-return-y), 0)
        scale(var(--home-return-scale-x), var(--home-return-scale-y));
      border-radius: 220px;
      opacity: 0;
      filter: blur(.6px);
    }
  }

  @keyframes mobile-home-ios-return-new {
    0% {
      transform: scale(.962);
      opacity: .58;
      filter: blur(1.1px);
    }
    48% {
      opacity: .82;
      filter: blur(.45px);
    }
    100% {
      transform: scale(1);
      opacity: 1;
      filter: blur(0);
    }
  }

  @keyframes mobile-home-return-fallback-cover {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes mobile-home-return-fallback-close {
    0% {
      left: 0;
      top: 0;
      width: 100vw;
      height: 100dvh;
      border-radius: 0;
      opacity: 1;
    }
    72% { opacity: 1; }
    100% {
      left: var(--home-return-x);
      top: var(--home-return-y);
      width: var(--home-return-target-width);
      height: var(--home-return-target-height);
      border-radius: var(--home-return-target-radius);
      opacity: 0;
    }
  }
}
'''
if 'mobile-home-ios-return-old' in text:
    raise SystemExit('styles/mobile-home.css: return transition already present')
css.write_text(text.rstrip() + append + '\n', encoding='utf-8')

edit_css = Path('styles/mobile-home-editing.css')
text = edit_css.read_text(encoding='utf-8')
append = r'''

@media (prefers-reduced-motion: reduce) {
  html.is-mobile-home-return-transition::view-transition-old(root),
  html.is-mobile-home-return-transition::view-transition-new(root),
  .mobile-home-return-surface,
  .mobile-home-return-surface.is-closing {
    animation: none !important;
  }
}
'''
if 'html.is-mobile-home-return-transition::view-transition-old(root)' in text:
    raise SystemExit('styles/mobile-home-editing.css: return reduced-motion rule already present')
edit_css.write_text(text.rstrip() + append + '\n', encoding='utf-8')

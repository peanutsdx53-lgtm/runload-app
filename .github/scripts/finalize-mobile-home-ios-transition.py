from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected 1 anchor, found {count}: {old!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

replace_once(
    'ui/interactions/homeInteractions.js',
    'const LAUNCH_NAVIGATION_MS = 170;',
    'const LAUNCH_NAVIGATION_MS = 260;'
)
replace_once(
    'ui/interactions/homeInteractions.js',
    '''    const removeSurface = () => surface.remove();
    surface.addEventListener("animationend", removeSurface, { once: true });
    globalThis.setTimeout(removeSurface, LAUNCH_ANIMATION_MS + 180);
''',
    '''    const removeSurface = () => surface.remove();
    const handleSurfaceAnimationEnd = (event) => {
      if (event.target !== surface) return;
      surface.removeEventListener("animationend", handleSurfaceAnimationEnd);
      removeSurface();
    };
    surface.addEventListener("animationend", handleSurfaceAnimationEnd);
    globalThis.setTimeout(removeSurface, LAUNCH_ANIMATION_MS + 180);
'''
)
replace_once(
    'tests/mobileHomeLaunchAnimation.test.mjs',
    'assert.ok(interactions.includes("const LAUNCH_NAVIGATION_MS = 170;"));',
    'assert.ok(interactions.includes("const LAUNCH_NAVIGATION_MS = 260;"));'
)
replace_once(
    'tests/mobileHomeLaunchAnimation.test.mjs',
    'assert.ok(interactions.includes(\'surface.addEventListener("animationend", removeSurface\'));',
    'assert.ok(interactions.includes(\'if (event.target !== surface) return;\'));\nassert.ok(interactions.includes(\'surface.addEventListener("animationend", handleSurfaceAnimationEnd)\'));'
)

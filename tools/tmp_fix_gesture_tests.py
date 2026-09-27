from pathlib import Path

for path in ['tests/mobileHomeFixedUi.test.mjs', 'tests/mobileHomePageGestureV2.test.mjs']:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    old = "  const block = source.slice(source.indexOf('const indicator ='), source.indexOf('const target ='));"
    if path.endswith('mobileHomePageGestureV2.test.mjs'):
        old = "  const block = ret.slice(ret.indexOf('const indicator ='), ret.indexOf('const target ='));"
        new = "  const start = ret.indexOf('const indicator =');\n  const block = ret.slice(start, ret.indexOf('const target =', start));"
    else:
        new = "  const start = source.indexOf('const indicator =');\n  const block = source.slice(start, source.indexOf('const target =', start));"
    if text.count(old) != 1:
        raise SystemExit(f'{path}: expected one indicator test anchor, found {text.count(old)}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

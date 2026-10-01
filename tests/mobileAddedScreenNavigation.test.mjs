import fs from 'node:fs';
import assert from 'node:assert/strict';
import { resolveScreenContextNavigation } from '../ui/screenArchitecture.js';

const more = fs.readFileSync('screens/moreScreen.js', 'utf8');
const navigationCss = fs.readFileSync('styles/mobile-navigation-unification.css', 'utf8');

function location(query = '') {
  return { parameters: new URLSearchParams(query) };
}

const achievements = resolveScreenContextNavigation('achievements', location('from=more'));
assert.deepEqual(achievements, {
  title: '実績',
  backHref: '#/more',
  backLabel: 'その他',
});

const mobileTools = [
  ['location-note', '地点メモ'],
  ['quick-note', '1分メモ'],
  ['gear-note', '装備メモ'],
  ['departure-check', '出発チェック'],
  ['fuel-note', '補給メモ'],
  ['photo-note', '写真メモ'],
  ['pace-tool', 'ペース換算'],
];

for (const [screen, title] of mobileTools) {
  assert.deepEqual(resolveScreenContextNavigation(screen, location('from=more')), {
    title,
    backHref: '#/more',
    backLabel: 'その他',
  });
  assert.deepEqual(resolveScreenContextNavigation(screen, location()), {
    title,
    backHref: '#/home',
    backLabel: 'ホーム',
  });
}

assert.match(more, /MORE_ORIGIN_SCREENS/);
assert.match(more, /\?from=more/);
assert.match(navigationCss, /\.screen--achievements > \.secondary-derived-head/);
assert.match(navigationCss, /\.screen--about > \.secondary-derived-head/);
assert.match(navigationCss, /display:\s*none !important/);

console.log(JSON.stringify({
  suite: 'Mobile Added Screen Navigation',
  status: 'PASS',
  checkedScreens: 1 + mobileTools.length,
}, null, 2));

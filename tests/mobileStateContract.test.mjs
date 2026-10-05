import assert from 'node:assert/strict';
import fs from 'node:fs';

const usability = fs.readFileSync('styles/mobile-usability.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const platformStyles = fs.readFileSync('ui/platformStyles.js', 'utf8');
const mobileCourseScreen = fs.readFileSync('screens/mobile/courseLibraryScreen.js', 'utf8');
const desktopCourseScreen = fs.readFileSync('screens/desktop/courseLibraryScreen.js', 'utf8');

const finalMarker = '/* Final smartphone state contract. This block intentionally comes last. */';
const markerIndex = usability.indexOf(finalMarker);
assert.ok(markerIndex >= 0, 'final smartphone state contract must exist');
const finalBlock = usability.slice(markerIndex);

assert.match(finalBlock, /\.screen-layout--record \.activity-toggle input:checked \+ span/);
assert.match(finalBlock, /\.screen-layout--history \.type-toggle button\.active/);
assert.match(finalBlock, /\.screen-layout--plan \.seg button\.active/);
assert.match(finalBlock, /\.screen-layout--course \.mode button\.active/);
assert.match(finalBlock, /\.screen-layout--reading \.filters button\.active/);
assert.match(finalBlock, /\.screen-layout--settings \.segment button\.active/);
assert.match(finalBlock, /background: var\(--color-segment-selected-surface\)/);
assert.match(finalBlock, /color: var\(--color-segment-selected-text\)/);
assert.match(finalBlock, /\.screen-layout--history \.record-item \.record-actions > a:first-child/);
assert.match(finalBlock, /background: var\(--color-accent\)/);
assert.match(finalBlock, /color: var\(--color-on-accent\)/);
assert.match(finalBlock, /button:disabled/);
assert.match(finalBlock, /opacity: 1/);
assert.match(finalBlock, /\.screen-layout--course \.course-library-pc-only/);
assert.match(finalBlock, /display: none !important/);

assert.ok(platformStyles.indexOf('./styles/mobile-usability.css') > platformStyles.indexOf('./styles/mobile-navigation-unification.css'), 'mobile usability/state layer must remain last among smartphone CSS layers');
assert.doesNotMatch(mobileCourseScreen, /course-library-pc-only/);
assert.match(mobileCourseScreen, /course-library-list-new/);
assert.match(desktopCourseScreen, /course-library-pc-only course-library-pc-new/);

console.log('mobileStateContract=PASS');

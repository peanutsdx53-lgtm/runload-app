import fs from 'node:fs';
import assert from 'node:assert/strict';

const threeRowCss = fs.readFileSync('styles/mobile-home-three-row.css', 'utf8');
const homeCss = fs.readFileSync('styles/mobile-home.css', 'utf8');

assert.match(threeRowCss, /html:has\(\.screen--home \.mobile-home-hub\)/);
assert.match(threeRowCss, /body:has\(\.screen--home \.mobile-home-hub\)/);
assert.match(threeRowCss, /position: fixed;/);
assert.match(threeRowCss, /max-height: 100dvh;/);
assert.match(threeRowCss, /overscroll-behavior-y: none;/);
assert.match(threeRowCss, /\.mobile-home-hub-page--apps[\s\S]*overflow: hidden;/);
assert.match(threeRowCss, /\.mobile-home-hub-page--overview[\s\S]*overflow-y: auto;/);
assert.match(threeRowCss, /\.mobile-home-os \{[\s\S]*height: 100%;[\s\S]*overflow: hidden;/);
assert.match(threeRowCss, /\.mobile-home-os:not\(\.is-home-editing\) \.mobile-home-page \{[\s\S]*min-height: 0;/);
assert.match(homeCss, /\.mobile-home-dock \{[\s\S]*position: fixed;/);
assert.match(homeCss, /bottom: calc\(10px \+ env\(safe-area-inset-bottom\)\);/);

console.log('mobileHomeViewportLock=PASS');

import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../styles/desktop-layout-v48.css', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const version = fs.readFileSync(new URL('../ui/appVersionStatus.js', import.meta.url), 'utf8');
const about = fs.readFileSync(new URL('../screens/aboutScreen.js', import.meta.url), 'utf8');

assert.match(css, /screen--home\.screen-layout--home[\s\S]*display:\s*block\s*!important/,
  'Current enhanced Home must not inherit the legacy two-column screen grid.');
assert.match(css, /screen--home\.screen-layout--home[\s\S]*grid-template-columns:\s*none\s*!important/,
  'Current enhanced Home must clear the legacy screen-level columns.');
assert.match(css, /home-desktop-legacy[\s\S]*grid-column:\s*1\s*\/\s*-1\s*!important/,
  'Enhanced Home wrapper must span the full PC workspace.');
assert.match(css, /editor-actions \.primary[\s\S]*width:\s*17rem\s*!important/,
  'Course save action must use a label-appropriate width instead of a large bar.');
assert.ok(index.includes('./styles/desktop-layout-v48.css'), 'index.html must load desktop-layout-v48.css.');
assert.ok(worker.includes('./styles/desktop-layout-v48.css'), 'service worker must precache desktop-layout-v48.css.');
assert.ok(worker.includes('2026.10.01.48'), 'service worker cache must move to v48.');
assert.ok(version.includes('2026.10.01.48'), 'app version must move to v48.');
assert.ok(about.includes('v2026.10.01.48'), 'About screen must show v48.');

console.log('desktop layout v48 regression contract: PASS');

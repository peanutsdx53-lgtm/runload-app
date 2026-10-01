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
assert.ok(index.includes('./styles/desktop-layout-v48.css'), 'index.html must retain desktop-layout-v48.css.');
assert.ok(worker.includes('./styles/desktop-layout-v48.css'), 'service worker must retain desktop-layout-v48.css.');
assert.match(worker, /running-record-app-runtime-\d{4}\.\d{2}\.\d{2}\.\d+/, 'service worker must retain a versioned runtime cache.');
assert.match(version, /APP_VERSION\s*=\s*"\d{4}\.\d{2}\.\d{2}\.\d+"/, 'app version status must retain a version identifier.');
assert.match(about, /APP_VERSION_LABEL\s*=\s*"v\d{4}\.\d{2}\.\d{2}\.\d+"/, 'About screen must retain a version label.');

console.log('desktop layout v48 regression contract: PASS');

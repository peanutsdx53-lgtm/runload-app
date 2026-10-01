import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../styles/desktop-layout-v49.css', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const version = fs.readFileSync(new URL('../ui/appVersionStatus.js', import.meta.url), 'utf8');
const about = fs.readFileSync(new URL('../screens/aboutScreen.js', import.meta.url), 'utf8');

assert.match(css, /\.screen--about \.about-tags[\s\S]*display:\s*flex\s*!important[\s\S]*gap:\s*\.45rem\s*!important/,
  'About technology tags must be separated with a wrapping flex gap.');
assert.match(css, /\.screen--about \.about-tags span[\s\S]*width:\s*fit-content\s*!important[\s\S]*white-space:\s*nowrap/,
  'About technology tags must stay compact and readable.');
assert.match(css, /\.screen--about \.about-panel--links[\s\S]*display:\s*flex\s*!important[\s\S]*gap:\s*\.65rem\s*!important/,
  'About links must be separated actions instead of a continuous text run.');
assert.match(css, /\.screen--about \.about-panel--links > a[\s\S]*width:\s*fit-content\s*!important/,
  'About link actions must use label-sized widths.');
assert.match(css, /data-action="reset-update-state"[\s\S]*width:\s*fit-content\s*!important/,
  'Standalone settings action must remain label-sized on PC.');

assert.ok(index.includes('./styles/desktop-layout-v49.css'), 'index.html must load desktop-layout-v49.css.');
assert.ok(worker.includes('./styles/desktop-layout-v49.css'), 'service worker must precache desktop-layout-v49.css.');
assert.ok(worker.includes('2026.10.01.49'), 'service worker cache must move to v49.');
assert.ok(version.includes('2026.10.01.49'), 'app version must move to v49.');
assert.ok(about.includes('v2026.10.01.49'), 'About screen must show v49.');

console.log('desktop layout v49 regression contract: PASS');

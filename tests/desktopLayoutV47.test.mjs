import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../styles/desktop-layout-v47.css', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const version = fs.readFileSync(new URL('../ui/appVersionStatus.js', import.meta.url), 'utf8');
const about = fs.readFileSync(new URL('../screens/aboutScreen.js', import.meta.url), 'utf8');
const courseInteractions = fs.readFileSync(new URL('../ui/interactions/courseInteractions.js', import.meta.url), 'utf8');

assert.match(css, /\.screen--home\.screen-layout--home[\s\S]*max-width:\s*none\s*!important/,
  'PC Home must not retain the narrow max-width that left the right side unused.');
assert.match(css, /\.interpretation-room-pattern-group\s+\.interpretation-room-region-chips[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*!important/,
  'Interpretation region lists must remain single-column inside each group on PC.');
assert.match(css, /\.region-chip__copy strong[\s\S]*white-space:\s*normal\s*!important/,
  'Body-region names must wrap instead of being crushed or ellipsized.');
assert.match(css, /\[data-course-section-row\]\[hidden\][\s\S]*display:\s*none\s*!important/,
  'Hidden course sections must stay hidden despite legacy display:grid rules.');
assert.match(courseInteractions, /Math\.max\(1,\s*lastUsed \+ 1\)/,
  'Course section interaction must still start with one visible section.');
assert.match(courseInteractions, /add-course-section[\s\S]*Math\.min\(5,\s*current \+ 1\)/,
  'Course section interaction must still add one section at a time up to five.');
assert.match(css, /\.screen--course-editor \.mode button\.active[\s\S]*color-selection-surface/,
  'Selected course choices must use the same visible selection-surface principle as run/rest.');
assert.match(css, /data-course-grade-summary[\s\S]*7\.5rem/,
  'Grade percentage inputs must use compact content-sized controls.');
assert.match(css, /data-course-surface-mixed[\s\S]*7\.25rem/,
  'Surface percentage inputs must use compact content-sized controls.');
assert.match(css, /\.editor-actions \.primary[\s\S]*width:\s*fit-content/,
  'Course save button width must follow its label instead of filling the panel.');

assert.ok(index.includes('./styles/desktop-layout-v47.css'), 'index.html must load desktop-layout-v47.css.');
assert.ok(worker.includes('./styles/desktop-layout-v47.css'), 'service worker must keep precaching desktop-layout-v47.css.');

function patchLevel(text) {
  const match = text.match(/2026\.10\.01\.(\d+)/);
  return match ? Number(match[1]) : 0;
}
assert.ok(patchLevel(worker) >= 47, 'service worker cache must be v47 or later.');
assert.ok(patchLevel(version) >= 47, 'app version must be v47 or later.');
assert.ok(patchLevel(about) >= 47, 'About screen must show v47 or later.');

console.log('desktop layout v47 regression contract: PASS');

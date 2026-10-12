import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { showFormMessages, showDataMessage } from '../ui/interactions/formUtilities.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (name) => readFileSync(path.join(project, name), 'utf8');
const candidates = [
  ['mobile about anchor', 'ui/mobileNavigationPolicy.js', 'anchor.innerHTML = ', 'ABOUT / CREDITS'],
  ['map attribution', 'ui/runMeasurementMap.js', 'attribution.innerHTML = ', 'OpenStreetMap contributors'],
  ['GPS course-save checkbox', 'ui/mobileMeasurementRecordAutofill.js', 'wrapper.innerHTML = ', 'savePlanCourseToLibrary'],
  ['desktop heading', 'ui/desktopHomeWorkspace.js', 'section.innerHTML = `<div><p class="eyebrow"', '走行記録'],
  ['desktop recent label', 'ui/desktopHomeWorkspace.js', 'sectionHead.insertAdjacentHTML("afterbegin", ', '最近の記録'],
  ['ROF-J axis description', 'ui/rofJPresentation.js', 'heading.innerHTML = ', '疲労感の目安'],
  ['restore empty prompt', 'ui/interactions/settingsInteractions.js', "previewHost.innerHTML = '<p class=\"muted-text\"", 'ファイルを選ぶと'],
  ['mobile widget picker shell', 'ui/interactions/mobileHomeEditPresentation.js', 'overlay.innerHTML = ', 'home-widget-picker-title'],
];

// A fixed literal has no path from storage, URL fragments, files, GPS, profile,
// or user text to the HTML parser. Validate exactly the committed sink RHS,
// never a copied string in the test fixture.
function getLiteralAtSink(file, prefix) {
  const src = source(file);
  assert.equal(src.split(prefix).length - 1, 1, `unique verified sink ${file} ${prefix}`);
  const offset = prefix.includes('insertAdjacentHTML(')
    ? prefix.indexOf(', ') + 2
    : prefix.indexOf(' = ') + 3;
  assert.ok(offset >= 2);
  const tail = src.slice(src.indexOf(prefix) + offset);
  const quote = tail[0];
  assert.ok(['"', "'", '`'].includes(quote), `sink RHS must be literal: ${file}`);
  let content = '';
  for (let i = 1; i < tail.length; i += 1) {
    if (tail[i] === '\\') { content += tail[i] + tail[++i]; continue; }
    if (tail[i] === quote) return { content, quote };
    content += tail[i];
  }
  throw Error(`unterminated literal ${file}`);
}
for (const [name, file, prefix, fragment] of candidates) {
  test(`E01 fixed sink provenance: ${name}`, () => {
    const { content } = getLiteralAtSink(file, prefix);
    assert.ok(content.includes(fragment), `known static HTML fragment: ${name}`);
    assert.doesNotMatch(content, /\$\{|\b(?:onerror|onload|onclick)\s*=|<script\b/i);
  });
}

test('E01 desktop shortcuts: the HTML helper is only invoked with four fixed literal triples', () => {
  const code = source('ui/desktopHomeWorkspace.js');
  const calls = [...code.matchAll(/\bshortcut\(([^)]*)\)/g)].map((x) => x[1]);
  assert.equal(calls.length, 5); // definition + four calls, closed local lexical surface
  assert.equal(calls[0], 'href, title, note');
  for (const triplet of calls.slice(1)) {
    assert.match(triplet, /^"[^"<>]*", "[^"<>]*", "[^"<>]*"$/);
  }
  const body = code.split('function createOverview() {')[1]?.split('\nfunction enhanceHome() {')[0];
  assert.ok(body);
  assert.equal([...body.matchAll(/\$\{shortcut\(/g)].length, 4);
});

test('E01 course input-mode sink uses only a 3-way fixed text catalogue', () => {
  const code = source('ui/interactions/recordInputInteractions.js');
  const target = code.split('paragraphs[2].innerHTML = ')[1]?.split(';\n')[0];
  assert.ok(target && target.includes('course.surfaceInputMode === "MIXED"'));
  assert.ok(target.includes('course.surfaceInputMode === "SINGLE"'));
  assert.equal([...target.matchAll(/\$\{/g)].length, 1);
  assert.doesNotMatch(target, /\b(?:name|note|title|description)\b/);
});

const probes = [
  '<img src=x onerror=alert(1)>',
  '" autofocus onfocus=alert(2) x="',
  '</p><svg onload=alert(3)>',
  '<script>alert(4)</script>',
  '<iframe srcdoc="<script>alert(5)</script>"></iframe>',
];
function capturedRegion() {
  return { innerHTML: '', hidden: true, dataset: {}, className: '',
    setAttribute() {}, focus() {} };
}

test('E01 displayed form errors escape malicious dynamic strings at the real sink', () => {
  const region = capturedRegion();
  const form = { querySelector: (sel) => sel === '[data-form-messages]' ? region : null };
  showFormMessages(form, probes);
  for (const payload of ['<img', '<svg', '<script', '<iframe']) {
    assert.ok(!region.innerHTML.includes(payload), `no raw attack substring: ${payload}`);
  }
  assert.equal((region.innerHTML.match(/<li>/g) || []).length, probes.length);
  assert.match(region.innerHTML, /&lt;img/);
  assert.match(region.innerHTML, /&lt;svg/);
});

test('E01 data management notices escape dynamic strings without trusting CSP', () => {
  const region = capturedRegion();
  const oldDocument = globalThis.document;
  globalThis.document = { querySelector: (sel) => sel === '[data-data-management-messages]' ? region : null };
  try { showDataMessage(probes, 'error'); }
  finally { globalThis.document = oldDocument; }
  for (const payload of ['<img', '<svg', '<script', '<iframe']) {
    assert.ok(!region.innerHTML.includes(payload), `no raw attack substring: ${payload}`);
  }
  assert.match(region.innerHTML, /&lt;iframe/);
});

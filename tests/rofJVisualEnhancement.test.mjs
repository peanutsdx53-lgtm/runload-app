import fs from 'node:fs';
import assert from 'node:assert/strict';

const moduleText = fs.readFileSync('ui/rofJVisualEnhancement.js', 'utf8');
const visualCss = fs.readFileSync('styles/rof-j-visual.css', 'utf8');
const compactCss = fs.readFileSync('styles/rof-j-compact.css', 'utf8');
const core = fs.readFileSync('core/rofJCore.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const versionModule = fs.readFileSync('ui/appVersionStatus.js', 'utf8');
const notice = fs.readFileSync('assets/rof/README.md', 'utf8');

const assetPaths = [
  'assets/rof/rof-visual-lowest.png',
  'assets/rof/rof-visual-low.png',
  'assets/rof/rof-visual-moderate.png',
  'assets/rof/rof-visual-high.png',
  'assets/rof/rof-visual-highest.png',
];

const results = [];
function test(id, fn) {
  try { fn(); results.push({ id, status: 'PASS' }); }
  catch (error) { results.push({ id, status: 'FAIL', message: String(error?.stack || error) }); }
}

test('ROFJ-DESCRIPTORS-REMAIN-CONTROLLED', () => {
  assert.ok(core.includes('2: "まったく疲れていない"'));
  assert.ok(core.includes('4: "少し疲れている"'));
  assert.ok(core.includes('6: "中程度に疲れている"'));
  assert.ok(core.includes('8: "とても疲れている"'));
  assert.ok(core.includes('10: "完全な疲労困憊（何も残っていない状態）"'));
  assert.ok(moduleText.includes('OFFICIAL_DESCRIPTOR_VALUES = Object.freeze([2, 4, 6, 8, 10])'));
  assert.ok(moduleText.includes('ROF_J_DESCRIPTOR_MAP[value]'));
});

test('DAILY-USE-VIEW-IS-COMPACT', () => {
  assert.ok(moduleText.includes('疲労感の目安'));
  assert.ok(moduleText.includes('選択の目安'));
  assert.ok(!moduleText.includes('数値との対応を作り替えず、疲労感の低い側から高い側への視覚的な目安として表示します。'));
  assert.ok(!moduleText.includes('anchorGuide.after(createDescriptorGuide())'));
  assert.ok(compactCss.includes('.rof-descriptor-guide'));
  assert.ok(compactCss.includes('display: none !important;'));
  assert.ok(compactCss.includes('.rof-visual-guide--compact'));
});

test('FULL-DESCRIPTORS-AND-RIGHTS-ARE-HIDDEN-IN-ABOUT-DETAILS', () => {
  assert.ok(moduleText.includes('createReferenceGuide'));
  assert.ok(moduleText.includes('aboutBody.append(createReferenceGuide())'));
  assert.ok(moduleText.includes('aboutBody.append(createRightsNote())'));
  assert.ok(moduleText.includes('ROF-Jの正式な言葉'));
  assert.ok(moduleText.includes('出典・ライセンス'));
});

test('INITIAL-FIVE-CAN-BE-SELECTED-WITHOUT-MOVING-SLIDER', () => {
  assert.ok(moduleText.includes('pointerdown'));
  assert.ok(moduleText.includes('dispatchEvent(new Event("input", { bubbles: true }))'));
});

test('ORIGINAL-ROF-VISUALS-ARE-NOT-ASSIGNED-NEW-NUMERIC-ANCHORS', () => {
  assert.ok(moduleText.includes('position: 1'));
  assert.ok(moduleText.includes('position: 5'));
  assert.ok(moduleText.includes('個々の図に新しい数値対応は設定していない'));
  assert.ok(!moduleText.includes('visualValue'));
});

test('ROF-VISUAL-ASSETS-ARE-LOCAL-AND-PRECACHED', () => {
  for (const assetPath of assetPaths) {
    assert.ok(fs.existsSync(assetPath), `${assetPath} missing`);
    assert.ok(worker.includes(`"./${assetPath}"`), `${assetPath} not precached`);
  }
});

test('ROF-VISUAL-UI-LOADS-ON-DESKTOP-AND-MOBILE', () => {
  assert.ok(index.includes('./styles/rof-j-visual.css'));
  assert.ok(index.includes('./styles/rof-j-compact.css'));
  assert.ok(index.includes('./ui/rofJVisualEnhancement.js'));
  assert.ok(worker.includes('"./styles/rof-j-visual.css"'));
  assert.ok(worker.includes('"./styles/rof-j-compact.css"'));
  assert.ok(worker.includes('"./ui/rofJVisualEnhancement.js"'));
  assert.ok(visualCss.includes('.rof-visual-strip'));
  assert.ok(compactCss.includes('@media (max-width: 54.99rem)'));
});

test('ATTRIBUTION-AND-LICENSE-ARE-EXPLICIT-BUT-NOT-PRIMARY-INPUT-CONTENT', () => {
  assert.ok(moduleText.includes('10.1007/s40279-017-0711-5'));
  assert.ok(moduleText.includes('creativecommons.org/licenses/by/4.0/'));
  assert.ok(moduleText.includes('10.1186/s40798-026-01108-8'));
  assert.ok(moduleText.includes('creativecommons.org/licenses/by-nc-nd/4.0/'));
  assert.ok(moduleText.includes('文言は改変していません'));
  assert.ok(moduleText.includes('原版から図部分を切り出し'));
  assert.ok(notice.includes('no new numerical value is assigned'));
});

test('VERSION-AND-PWA-CACHE-MATCH-ROF-COMPACT-RELEASE', () => {
  const version = versionModule.match(/APP_VERSION = "([^"]+)"/)?.[1] || '';
  assert.equal(version, '2026.09.28.12');
  assert.ok(worker.includes(`running-record-app-runtime-${version}`));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'ROF-J Compact Visual Guidance', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);

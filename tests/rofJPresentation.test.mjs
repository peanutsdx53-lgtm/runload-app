import fs from 'node:fs';
import assert from 'node:assert/strict';

const moduleText = fs.readFileSync('ui/rofJPresentation.js', 'utf8');
const scaleDefinition = fs.readFileSync('core/rofJAuthorConfirmedScale.js', 'utf8');
const visualCss = fs.readFileSync('styles/rof-j-visual.css', 'utf8');
const compactCss = fs.readFileSync('styles/rof-j-compact.css', 'utf8');
const mobileCompactCss = fs.readFileSync('styles/mobile-rof-j-compact-responsive.css', 'utf8');
const mobileVisualCss = fs.readFileSync('styles/mobile-rof-j-visual-responsive.css', 'utf8');
const desktopVisualCss = fs.readFileSync('styles/desktop-rof-j-visual-responsive.css', 'utf8');
const mobileResultModule = fs.readFileSync('ui/mobileRofJPresentation.js', 'utf8');
const desktopResultModule = fs.readFileSync('ui/desktopRofJPresentation.js', 'utf8');
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

test('ROFJ-AUTHOR-CONFIRMED-ANCHORS-ARE-CANONICAL-PRESENTATION', () => {
  assert.ok(scaleDefinition.includes('ROF_J_AUTHOR_CONFIRMED_2026_10_01'));
  assert.ok(scaleDefinition.includes('position: 10'));
  assert.ok(scaleDefinition.includes('position: 7.5'));
  assert.ok(scaleDefinition.includes('positionLabel: "7と8の間"'));
  assert.ok(scaleDefinition.includes('descriptor: "とても疲れている"'));
  assert.ok(scaleDefinition.includes('position: 5'));
  assert.ok(scaleDefinition.includes('descriptor: "中程度に疲れている"'));
  assert.ok(scaleDefinition.includes('position: 2.5'));
  assert.ok(scaleDefinition.includes('positionLabel: "2と3の間"'));
  assert.ok(scaleDefinition.includes('descriptor: "少し疲れている"'));
  assert.ok(scaleDefinition.includes('position: 0'));
  assert.ok(scaleDefinition.includes('descriptor: "まったく疲れていない"'));
  assert.ok(scaleDefinition.includes('descriptor: "完全な疲労困憊（何も残っていない状態）"'));
  assert.ok(moduleText.includes('../core/rofJAuthorConfirmedScale.js'));
  assert.ok(!moduleText.includes('ROF_J_DESCRIPTOR_MAP'));
});

test('SELECTABLE-SCORES-REMAIN-INTEGER-ZERO-THROUGH-TEN', () => {
  assert.ok(scaleDefinition.includes('Number.isInteger(value) && value >= 0 && value <= 10'));
  assert.ok(!scaleDefinition.includes('step: 0.5'));
  assert.ok(core.includes('return isValidRofJSelection(value);'));
});

test('DAILY-USE-VIEW-SHOWS-FULL-FIGURES-AND-DESCRIPTORS-ALIGNED-TO-AXIS', () => {
  assert.ok(moduleText.includes('疲労感の目安'));
  assert.ok(moduleText.includes('横軸と同じ向き'));
  assert.ok(moduleText.includes('rof-author-anchor-list'));
  assert.ok(moduleText.includes('.sort((left, right) => Number(left.position) - Number(right.position))'));
  assert.ok(moduleText.includes('descriptor.className = "rof-author-anchor__descriptor"'));
  assert.ok(moduleText.includes('descriptor.textContent = anchor.descriptor'));
  assert.ok(!moduleText.includes('position.className = "rof-author-anchor__position"'));
  assert.ok(visualCss.includes('grid-template-columns: repeat(5, minmax(0, 1fr))'));
  assert.ok(visualCss.includes('.rof-author-anchor__descriptor'));
  assert.ok(!moduleText.includes('rof-author-anchor__position'));
  assert.ok(!visualCss.includes('.rof-author-anchor__position'));
  assert.ok(desktopVisualCss.includes('grid-template-rows: 5.4rem auto'));
  assert.ok(desktopVisualCss.includes('max-height: 5.4rem'));
  assert.ok(mobileVisualCss.includes('grid-template-rows: 4.45rem auto'));
  assert.ok(mobileVisualCss.includes('max-height: 4.45rem'));
  assert.ok(compactCss.includes('.rof-visual-guide--compact'));
});

test('ROF-VISUAL-CROPS-KEEP-FULL-FIGURE-MARGINS', () => {
  const expected = new Map([
    ['assets/rof/rof-visual-lowest.png', [182, 210]],
    ['assets/rof/rof-visual-low.png', [130, 220]],
    ['assets/rof/rof-visual-moderate.png', [130, 220]],
    ['assets/rof/rof-visual-high.png', [160, 235]],
    ['assets/rof/rof-visual-highest.png', [215, 120]],
  ]);
  for (const [assetPath, [width, height]] of expected) {
    const bytes = fs.readFileSync(assetPath);
    assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
    assert.equal(bytes.readUInt32BE(16), width, `${assetPath} width`);
    assert.equal(bytes.readUInt32BE(20), height, `${assetPath} height`);
  }
  assert.ok(notice.includes('surrounding white margin so the complete figure remains visible'));
});

test('CURRENT-SELECTION-GUIDANCE-OVERRIDES-LEGACY-PLACEHOLDER-TEXT', () => {
  assert.ok(moduleText.includes('syncAuthorConfirmedPresentation'));
  assert.ok(moduleText.includes('rofJSelectionDescriptor(value)'));
  assert.ok(moduleText.includes('rofJGuidanceForSelection(value)'));
  assert.ok(moduleText.includes('queueMicrotask(() => syncAuthorConfirmedPresentation(panel))'));
  assert.ok(moduleText.includes('rofPresentationVersion'));
});

test('FULL-ANCHOR-DETAILS-AND-RIGHTS-ARE-IN-ABOUT-DETAILS', () => {
  assert.ok(moduleText.includes('createReferenceGuide'));
  assert.ok(moduleText.includes('aboutBody.append(createReferenceGuide())'));
  assert.ok(moduleText.includes('aboutBody.append(createRightsNote())'));
  assert.ok(moduleText.includes('正式な尺度配置'));
  assert.ok(moduleText.includes('責任著者への確認に基づき原版の疲労感尺度と同じ配置'));
  assert.ok(moduleText.includes('出典・ライセンス'));
});

test('RECORD-AND-MEASUREMENT-SHARE-AUTHOR-CONFIRMED-PRESENTATION', () => {
  assert.ok(moduleText.includes('panel.closest("[data-rof-context], .rof-sheet")'));
  assert.ok(moduleText.includes('document.querySelectorAll(".rof-scale-panel")'));
});

test('INITIAL-SLIDER-VALUE-CAN-BE-SELECTED-WITHOUT-MOVING', () => {
  assert.ok(moduleText.includes('pointerdown'));
  assert.ok(moduleText.includes('dispatchEvent(new Event("input", { bubbles: true }))'));
});

test('ORIGINAL-ROF-VISUALS-MAP-TO-ORIGINAL-ANCHORS', () => {
  assert.ok(moduleText.includes('lowest: "./assets/rof/rof-visual-lowest.png"'));
  assert.ok(moduleText.includes('highest: "./assets/rof/rof-visual-highest.png"'));
  assert.ok(moduleText.includes('ORIGINAL_ROF_VISUALS[anchor.visualKey]'));
  assert.ok(notice.includes('each crop is displayed at the corresponding original ROF anchor position'));
  assert.ok(notice.includes('between 7 and 8'));
  assert.ok(notice.includes('between 2 and 3'));
});

test('ROF-VISUAL-ASSETS-AND-PRESENTATION-MODULE-ARE-PRECACHED', () => {
  for (const assetPath of assetPaths) {
    assert.ok(fs.existsSync(assetPath), `${assetPath} missing`);
    assert.ok(worker.includes(`"./${assetPath}"`), `${assetPath} not precached`);
  }
  assert.ok(worker.includes('"./core/rofJAuthorConfirmedScale.js"'));
});

test('ROF-VISUAL-UI-LOADS-ON-DESKTOP-AND-MOBILE', () => {
  assert.ok(index.includes('./styles/rof-j-visual.css'));
  assert.ok(index.includes('./styles/rof-j-compact.css'));
  assert.ok(index.includes('./ui/rofJPresentation.js'));
  assert.ok(worker.includes('"./styles/rof-j-visual.css"'));
  assert.ok(worker.includes('"./styles/rof-j-compact.css"'));
  assert.ok(worker.includes('"./ui/rofJPresentation.js"'));
  assert.ok(mobileCompactCss.includes('@media (max-width: 54.99rem)'));
  assert.ok(worker.includes('"./styles/mobile-rof-j-compact-responsive.css"'));
  assert.ok(worker.includes('"./styles/desktop-rof-j-compact-responsive.css"'));
});

test('ATTRIBUTION-AND-LICENSE-ARE-EXPLICIT-BUT-NOT-PRIMARY-INPUT-CONTENT', () => {
  assert.ok(moduleText.includes('10.1007/s40279-017-0711-5'));
  assert.ok(moduleText.includes('creativecommons.org/licenses/by/4.0/'));
  assert.ok(moduleText.includes('10.1186/s40798-026-01108-8'));
  assert.ok(moduleText.includes('creativecommons.org/licenses/by-nc-nd/4.0/'));
  assert.ok(moduleText.includes('日本語表現は改変せず'));
  assert.ok(moduleText.includes('図自体は変更していません'));
  assert.ok(moduleText.includes('疲労感尺度の日本語資料：Suzuki'));
  assert.ok(!moduleText.includes('heading.innerHTML = "<small>ROF-J'));
});

test('RESULT-SCREENS-USE-AUTHOR-CONFIRMED-GUIDANCE', () => {
  assert.ok(mobileResultModule.includes('updateMobileResultFatigue'));
  assert.ok(desktopResultModule.includes('updateDesktopResultFatigue'));
  assert.ok(mobileResultModule.includes('走った後の疲労感の目安'));
  assert.ok(desktopResultModule.includes('運動後の疲労感の目安'));
  assert.ok(mobileResultModule.includes('dl.visually-hidden > div'));
  assert.ok(mobileResultModule.includes('document.querySelectorAll(".fatigue-section").forEach(updateMobileResultFatigue)'));
  assert.ok(desktopResultModule.includes('document.querySelectorAll(".pc-result-fatigue").forEach(updateDesktopResultFatigue)'));
  assert.ok(!moduleText.includes('updateMobileResultFatigue'));
  assert.ok(!moduleText.includes('updateDesktopResultFatigue'));
});

test('VERSION-AND-PWA-CACHE-MATCH', () => {
  const version = versionModule.match(/APP_VERSION = "([^"]+)"/)?.[1] || '';
  assert.match(version, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
  assert.ok(worker.includes(`running-record-app-runtime-${version}`));
});

const failed = results.filter((item) => item.status !== 'PASS');
console.log(JSON.stringify({ suite: 'ROF-J Author-Confirmed Presentation', total: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'FAIL' : 'PASS', results }, null, 2));
if (failed.length) process.exit(1);

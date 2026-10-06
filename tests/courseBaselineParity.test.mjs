import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const desktopLibrary = read("screens/desktop/courseLibraryScreen.js");
const mobileLibrary = read("screens/mobile/courseLibraryScreen.js");
const desktopEditor = read("screens/desktop/courseEditorScreen.js");
const mobileEditor = read("screens/mobile/courseEditorScreen.js");
const desktopGpx = read("screens/desktop/gpxAnalysisScreen.js");
const mobileGpx = read("screens/mobile/gpxAnalysisScreen.js");
const sharedContext = read("screens/shared/courseLibraryContext.js");
const commonInteractions = read("ui/interactions/courseInteractions.js");
const mobileInteractions = read("ui/interactions/mobileCourseInteractions.js");
const desktopCss = read("styles/desktop-course.css");
const desktopScreenLayoutsCss = read("styles/desktop-screen-layouts.css");
const desktopUnificationCss = read("styles/desktop-unification.css");
const desktopEditorCss = read("styles/desktop-course-editor.css");
const mobileCss = read("styles/mobile-course.css");
const sharedCourseCss = read("styles/course-screen-base.css");
const mobileScreenLayoutsCss = read("styles/mobile-screen-layouts.css");
const indexHtml = read("index.html");
const worker = read("service-worker.js");
const platformStyles = read("ui/platformStyles.js");

test("course library keeps separate baseline desktop and mobile presentations", () => {
  assert.match(desktopLibrary, /今回のコース/);
  assert.match(desktopLibrary, /\＋ 新しいコース/);
  assert.match(desktopLibrary, /GPXを読み込む/);
  assert.doesNotMatch(desktopLibrary, /course-mobile-library/);
  assert.match(mobileLibrary, /course-mobile-library/);
  assert.match(mobileLibrary, /保存したコース/);
  assert.match(mobileLibrary, /\＋ 新規/);
  assert.match(mobileLibrary, /ファイルから坂道を入力/);
  assert.match(sharedContext, /\["#\/record-input", "#\/plan", "#\/simulation"\]/);
});

test("course editor preserves desktop controls and mobile compact summary without duplicating common save logic", () => {
  assert.match(desktopEditor, /data-course-grade-mode="SUMMARY"/);
  assert.match(desktopEditor, /data-course-surface-mode="MIXED"/);
  assert.doesNotMatch(desktopEditor, /data-course-summary-name/);
  assert.match(mobileEditor, /data-course-grade-family="PROFILE"/);
  assert.match(mobileEditor, /data-course-summary-name/);
  assert.match(mobileInteractions, /return bindCourseEditor\(args, mobileEnhancement\)/);
  assert.match(commonInteractions, /export function bindCourseEditor\(\{ services \}, platformEnhancement = \{\}\)/);
  assert.match(commonInteractions, /platformEnhancement\.updateSummary\?\.\(\{ form, data \}\)/);
});

test("course visual contracts keep baseline platform dimensions", () => {
  assert.match(desktopCss, /screen--course-library[\s\S]*grid-template-columns:\s*repeat\(2/);
  assert.match(desktopCss, /screen--gpx-analysis[\s\S]*summary-grid[\s\S]*repeat\(4/);
  assert.match(desktopEditorCss, /\.screen--course-editor \.grade-mode\s*\{[\s\S]*repeat\(4/);
  assert.match(desktopEditorCss, /\.screen--course-editor \.mode\.three\s*\{[\s\S]*repeat\(3/);
  assert.match(mobileCss, /--course-mobile-radius:\s*18px/);
  assert.match(mobileCss, /--course-mobile-field:\s*52px/);
  assert.match(mobileCss, /course-mobile-library-card/);
  assert.match(mobileCss, /gpx-mobile-card/);
});

test("shared course and GPX foundation is loaded once for both platforms", () => {
  assert.match(indexHtml, /styles\/course-screen-base\.css/);
  assert.match(worker, /\.\/styles\/course-screen-base\.css/);
  assert.match(sharedCourseCss, /Screen: course/);
  assert.match(sharedCourseCss, /\.screen-layout--course \.card\{[\s\S]*?border:[^;]+;[\s\S]*?background:/);
  assert.match(sharedCourseCss, /Screen: gpx/);
  assert.match(sharedCourseCss, /\.screen-layout--gpx \.candidate/);
  assert.doesNotMatch(mobileScreenLayoutsCss, /Screen: course/);
  assert.doesNotMatch(mobileScreenLayoutsCss, /Screen: gpx/);
});

test("desktop course reference presentation survives desktop consolidation", () => {
  const unificationIndex = platformStyles.indexOf("./styles/desktop-unification.css");
  const courseIndex = platformStyles.indexOf("./styles/desktop-course.css");
  const editorIndex = platformStyles.indexOf("./styles/desktop-course-editor.css");
  assert.ok(unificationIndex >= 0 && courseIndex > unificationIndex && editorIndex > courseIndex);
  assert.doesNotMatch(desktopUnificationCss, /course-derived|screen--course|screen--gpx/);
  assert.match(desktopScreenLayoutsCss, /\.course-derived-screen\s*\{[\s\S]*?position:\s*fixed\s*!important;[\s\S]*?top:\s*4\.75rem\s*!important/);
  assert.match(desktopScreenLayoutsCss, /\.course-derived-frame\s*\{[\s\S]*?width:\s*min\(100%, 74rem\)\s*!important;[\s\S]*?border:\s*2px solid var\(--color-line\)\s*!important/);
  assert.match(desktopScreenLayoutsCss, /\.course-derived-head\s*\{[\s\S]*?display:\s*grid\s*!important;[\s\S]*?grid-template-columns:\s*minmax\(13rem, 1fr\) auto minmax\(10rem, 1fr\)\s*!important/);
  assert.match(desktopCss, /Desktop course presentation\. Reference layout contract/);
  assert.match(desktopCss, /screen--course-editor\.course-derived-screen,[\s\S]*padding:\s*1\.15rem 1\.35rem 1\.35rem\s*!important/);
  assert.match(desktopCss, /screen--course-library[\s\S]*grid-template-columns:\s*repeat\(2/);
});

test("GPX keeps baseline platform-specific copy and shared element contract", () => {
  for (const source of [desktopGpx, mobileGpx]) {
    assert.match(source, /id="gpx-file"/);
    assert.match(source, /id="gpx-profile-svg"/);
    assert.match(source, /id="gpx-apply"/);
    assert.match(source, /id="gpx-return-to"/);
  }
  assert.match(desktopGpx, /ルートファイルから坂道を入力/);
  assert.match(desktopGpx, /外部送信なし/);
  assert.match(mobileGpx, /GPXから坂道を入力/);
  assert.match(mobileGpx, /端末内で処理・外部送信なし・元ファイルは保存しません/);
});

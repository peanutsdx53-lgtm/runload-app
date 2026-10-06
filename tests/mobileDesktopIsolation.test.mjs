import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile and desktop presentation remain file-level isolated", () => {
  const sharedRecord = read("screens/recordInputScreen.js");
  const mobileRecord = read("screens/mobile/recordInputScreen.js");
  const desktopRecord = read("screens/desktop/recordInputScreen.js");
  const sharedResult = read("screens/resultScreen.js");
  const mobileResult = read("screens/mobile/resultScreen.js");
  const desktopResult = read("screens/desktop/resultScreen.js");
  const sharedHistory = read("screens/historyScreen.js");
  const mobileHistory = read("screens/mobile/historyScreen.js");
  const desktopHistory = read("screens/desktop/historyScreen.js");
  const sharedShell = read("ui/appShell.js");
  const mobileShell = read("ui/mobileAppShell.js");
  const desktopShell = read("ui/desktopAppShell.js");

  for (const source of [sharedRecord, sharedResult, sharedHistory, sharedShell]) {
    assert.doesNotMatch(source, /matchesMobileLayout|mobileLayout|mobile-|desktop-|pc-/i);
  }
  assert.match(mobileRecord, /mobile-record-progress|mobile-save-bar/);
  assert.doesNotMatch(desktopRecord, /mobile-record-progress|mobile-save-bar/);
  assert.match(mobileResult, /mobile-body-map-hint|mobile-region-trigger/);
  assert.doesNotMatch(desktopResult, /mobile-body-map-hint|mobile-region-trigger/);
  assert.match(desktopResult, /pc-result-console/);
  assert.doesNotMatch(mobileResult, /pc-result-console/);
  assert.match(mobileHistory, /mobile-history-mode/);
  assert.match(desktopHistory, /desktop-history-mode/);
  assert.doesNotMatch(mobileHistory, /desktop-history-mode/);
  assert.doesNotMatch(desktopHistory, /mobile-history-mode/);
  assert.match(mobileShell, /renderPrimaryNavigation|mobile-topbar/);
  assert.match(desktopShell, /renderPrimaryNavigation/);
  assert.doesNotMatch(desktopShell, /mobile-topbar/);
  assert.match(sharedShell, /<nav class="primary-navigation" aria-label="主な機能">/);
  assert.match(desktopShell, /app-header--desktop|pc-global-back/);
});

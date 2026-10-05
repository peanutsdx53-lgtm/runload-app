import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile-only behavior stays explicitly gated from desktop contracts', () => {
  const record = read('screens/recordInputScreen.js');
  const reading = read('screens/readingScreen.js');
  const history = read('screens/historyScreen.js');
  const result = read('screens/resultScreen.js');
  const mobileResult = read('screens/mobile/resultScreen.js');
  const home = read('ui/interactions/homeInteractions.js');
  const measurement = read('ui/interactions/runMeasurementInteractions.js');
  const mobileCss = read('styles/mobile-usability.css');
  const measurementCss = read('styles/mobile-run-measurement-ergonomics.css');

  assert.match(record, /const mobileLayout = matchesMobileLayout\(\);/);
  assert.match(record, /step="\$\{mobileLayout \? "0\.01" : "0\.1"\}"/);

  assert.match(reading, /if \(matchesMobileLayout\(\)\) \{/);
  assert.match(reading, /deferredArticleIds: new Set\(\)/);
  assert.match(reading, /return renderReadingContent\(\{ services, context \}\);/);

  assert.match(history, /function normalizedView\(value\)/);
  assert.match(history, /normalized === "checks"|=== "checks" \? "checks" : "records"/);
  assert.match(history, /function normalizedMobileView\(value\)/);
  assert.match(history, /const view = mobileLayout\s*\? normalizedMobileView/);
  assert.match(history, /const content = mobileLayout\s*\? mobileHistoryContent/);
  assert.match(history, /: historyRecordView\(workspace,context\);/);

  assert.doesNotMatch(result, /mobileAchievements|mobileInsights|matchesMobileLayout/);
  assert.match(result, /mobileLayout \? renderMobileResultHighlights/);
  assert.match(mobileResult, /mobileLayout: true/);
  assert.match(mobileResult, /mobileAchievements/);
  assert.match(mobileResult, /mobileInsights/);

  assert.match(home, /loadMobileQuickTools/);
  assert.match(home, /\["today", "plan"\]/);
  assert.match(home, /1分メモの内容/);
  assert.match(home, /checkpoint \|\| "未設定"/);

  assert.match(measurement, /root\.dataset\.measurementMode = mode/);
  assert.match(measurement, /root\.dataset\.measurementMode = measurementMode/);

  assert.match(mobileCss, /@media \(max-width: 54\.99rem\)/);
  assert.match(mobileCss, /\.mobile-history-mode/);
  assert.match(mobileCss, /\.mobile-result-highlights/);
  assert.match(measurementCss, /@media \(max-width: 54\.99rem\)/);
  assert.match(measurementCss, /data-measurement-mode="free"/);
});

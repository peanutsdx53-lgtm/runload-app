import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = file => fs.readFileSync(new URL('../'+file,import.meta.url), 'utf8');
test('B-01: identified orphan exports are absent without removing supported runtime owners', () => {
  assert.doesNotMatch(read('shared/valueUtilities.js'), /\b(?:export\s+function\s+)?isFiniteNumericValue\b/);
  assert.doesNotMatch(read('ui/mobileHomeExperience.js'), /\bpersonalChallengeDefinitions\b/);
  assert.doesNotMatch(read('core/selfInterpretationCore.js'), /\bSELF_INTERPRETATION_STORE_VERSION\b/);
  assert.doesNotMatch(read('ui/interpretationReferenceHistory.js'), /\bINTERPRETATION_REFERENCE_HISTORY_LIMIT\b/);
  const loader=read('ui/platformStyles.js');
  assert.doesNotMatch(loader, /\b(?:MOBILE_STYLE_URLS|DESKTOP_STYLE_URLS|flattenStyleGroups)\b/);
  assert.match(loader, /loadStyleGroups\(MOBILE_STYLE_GROUPS\)/);
  assert.match(loader, /loadStyleGroups\(DESKTOP_STYLE_GROUPS\)/);
});

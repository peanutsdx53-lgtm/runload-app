import test from 'node:test';
import assert from 'node:assert/strict';
import { safeCourseReturnTo } from '../screens/shared/courseLibraryContext.js';
import { renderGpxAnalysisScreen as desktop } from '../screens/desktop/gpxAnalysisScreen.js';
import { renderGpxAnalysisScreen as mobile } from '../screens/mobile/gpxAnalysisScreen.js';

const asContext = (value) => ({ parameters: new URLSearchParams({ returnTo: value }) });

test('B-05 one course return-route implementation serves desktop, mobile and course library', () => {
  for (const value of [
    '#/record-input', '#/plan', '#/simulation',
    '#/plan?edit=x&start=2026-10-11', '#/record-input?activity=run',
    'https://evil.example/#/plan', 'javascript:alert(1)', '#/history',
    '#/privacy', '" onmouseover="alert(1)', '',
  ]) {
    const context = asContext(value);
    const safe = safeCourseReturnTo(context);
    const expected = ['#/record-input', '#/plan', '#/simulation'].some((v) => value.startsWith(v)) ? value : '#/record-input';
    assert.equal(safe, expected, value);
    for (const render of [desktop, mobile]) {
      const markup = render({ context });
      assert.ok(markup.includes(`returnTo=${encodeURIComponent(safe)}`), 'route mismatch');
      assert.equal(markup.includes('href="javascript:'), false);
      assert.equal(markup.includes(' onmouseover="'), false);
    }
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveScreenContextNavigation } from '../ui/screenArchitecture.js';

function screenContext(query = '') {
  return { parameters: new URLSearchParams(query) };
}

test('W6 comparison without a saved source returns Home rather than unavailable Result', () => {
  assert.deepEqual(resolveScreenContextNavigation('simulation', screenContext()), {
    title: '条件比較', backHref: '#/home', backLabel: 'ホーム',
  });
});

test('W6 comparison preserves an explicit record-input return', () => {
  assert.deepEqual(resolveScreenContextNavigation('simulation', screenContext('from=record-input')), {
    title: '条件比較', backHref: '#/record-input', backLabel: '記録',
  });
});

test('W6 comparison retains recorded Result return where a recordId is available', () => {
  assert.deepEqual(resolveScreenContextNavigation('simulation', screenContext('recordId=test-123')), {
    title: '条件比較', backHref: '#/result?recordId=test-123', backLabel: '結果',
  });
});

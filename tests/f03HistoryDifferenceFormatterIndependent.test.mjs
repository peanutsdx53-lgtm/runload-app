import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Reproduce the real private historyChartSvg function, not a copied formatter.
const source = fs.readFileSync(new URL('../screens/historyScreen.js', import.meta.url), 'utf8');
const start = source.indexOf('function historyChartSvg(');
const end = source.indexOf('\nfunction historySelectedCard(', start);
assert.ok(start !== -1 && end > start);
const signed = source.match(/^function signedNumber\(value, digits = 1\) \{[\s\S]*?^\}/m)?.[0] || '';

function draw(index) {
  const ctx = {
    referenceRatioPercent: () => index,
    finite: (value) => typeof value === 'number' && Number.isFinite(value),
    formatNumber: (value, digits = 1) => Number.isFinite(Number(value)) ? Number(value).toLocaleString('ja-JP', { maximumFractionDigits: digits }) : '—',
    escapeHtml: (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    trendSelectionHref: () => '#/history',
    shortDateLabel: () => '10/12',
    weekdayLabel: () => '月',
    weekendClass: () => '',
  };
  vm.runInNewContext(`${signed}\n${source.slice(start, end)}\nglobalThis.__draw = historyChartSvg;`, ctx, { filename: 'screens/historyScreen.js' });
  return String(ctx.__draw([{ experience: { record: { id: 'r1', date: '2026-10-12' } } }], { regionalDisplay: 'difference', anchor: null }));
}

for (const [name, index, expected] of [
  ['above reference', 101.5, '+1.5'],
  ['below reference', 98, '-2'],
  ['exact reference', 100, '0'],
]) test('F03 history difference chart ' + name + ' has a callable finite signed formatter', () => {
  const html = draw(index);
  assert.ok(html.includes(`class="chart-value">${expected}</text>`), `Expected ${expected}`);
  assert.ok(!html.includes('NaN') && !html.includes('Infinity'));
});

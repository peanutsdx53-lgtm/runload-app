import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const history = readFileSync(new URL('ui/mobileWalkJogHistoryUi.js', root), 'utf8');
const record = readFileSync(new URL('ui/mobileWalkJogRecordStore.js', root), 'utf8');
const start = history.indexOf('function formatDurationMinutes(');
const end = history.indexOf('\nfunction formatSegmentDuration(', start);
assert.ok(start >= 0 && end > start);
const fmt = runInNewContext(`${history.slice(start, end)}\nformatDurationMinutes;`);

for (const [value, expected] of [
  [0, '0分'], [0.5, '1分'], [59.4,'59分'], [59.6,'1時間'],
  [60, '1時間'], [60.4, '1時間'], [60.5, '1時間1分'],
  [119.4, '1時間59分'], [119.6, '2時間'],
  [120, '2時間'], [120.4, '2時間'], [121.2,'2時間1分'],
  [null, '—'], ['', '—'], ['  ', '—'], [NaN, '—'],
  [Infinity, '—'], [-1, '—'],
]) {
  test(`rounded duration ${String(value)} -> ${expected}`, () => assert.equal(fmt(value), expected));
}

test('save notification is readable and contains no internal record ID', () => {
  assert.match(record, /活動別記録を端末内に保存しました。/);
  assert.doesNotMatch(record, /saved\.record\.id}\s*を端末内に保存しました/);
  assert.match(record, /const next = \[record, \.+current\.filter/);
});

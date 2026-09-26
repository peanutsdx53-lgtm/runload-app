import assert from 'node:assert/strict';
import {
  footprintForToken,
  findNearestFreePlacement,
  packTokens,
  placementIsFree,
  usedRowCount,
} from '../ui/interactions/homeGridModel.js';

const sizes = { today: 'small', plan: 'small', changes: 'medium', checkpoint: 'large' };

assert.deepEqual(footprintForToken('app:history', sizes), { columns: 1, rows: 1 });
assert.deepEqual(footprintForToken('widget:today', sizes), { columns: 2, rows: 1 });
assert.deepEqual(footprintForToken('widget:changes', sizes), { columns: 4, rows: 1 });
assert.deepEqual(footprintForToken('widget:checkpoint', sizes), { columns: 4, rows: 2 });

const placements = [
  { token: 'widget:today', row: 1, col: 1 },
  { token: 'app:history', row: 1, col: 3 },
];
const occupied = new Set(['widget:today', 'app:history', 'app:plan']);
assert.equal(placementIsFree(placements, 'app:plan', { row: 1, col: 4 }, { widgetSizes: sizes, occupiedTokens: occupied }), true);
assert.equal(placementIsFree(placements, 'app:plan', { row: 1, col: 2 }, { widgetSizes: sizes, occupiedTokens: occupied }), false);
assert.deepEqual(findNearestFreePlacement(placements, 'app:plan', { row: 1, col: 2 }, { widgetSizes: sizes, occupiedTokens: occupied }), { row: 2, col: 2 });

const packed = packTokens(['widget:today', 'app:plan', 'app:history', 'widget:changes'], {
  widgetSizes: sizes,
  occupiedTokens: new Set(['widget:today', 'app:plan', 'app:history', 'widget:changes']),
});
assert.equal(packed.length, 4);
assert.equal(new Set(packed.map((entry) => `${entry.row}:${entry.col}`)).size, 4);
assert.ok(usedRowCount(packed, { widgetSizes: sizes, occupiedTokens: new Set(packed.map((entry) => entry.token)) }) >= 4);

console.log('mobileHomeGridModel=PASS');

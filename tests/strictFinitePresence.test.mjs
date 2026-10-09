import assert from 'node:assert/strict';
import { isPresentFiniteNumber } from '../shared/valueUtilities.js';
import { referenceDirection, previousDeltaDirection } from '../core/interpretationBase.js';

const absent = [null, undefined, '', ' ', '\n\t', false, true, [], [0], {}, {valueOf: () => 0}, NaN, Infinity, -Infinity, 'Infinity', 'NaN', 'abc'];
const valid = [0, -0, 99, 100, 101, -2.5, '0', ' 0 ', ' 99.5 ', '-3.2', '1e2'];
let checks = 0;
for (const x of absent) {
  assert.equal(isPresentFiniteNumber(x), false, `malformed input must be absent: ${String(x)}`); checks++;
  assert.equal(referenceDirection(x), 'UNAVAILABLE', `malformed region value must not be below reference: ${String(x)}`); checks++;
  assert.equal(previousDeltaDirection(x), 'NONE', `malformed delta must not be interpreted: ${String(x)}`); checks++;
}
for (const x of valid) {
  assert.equal(isPresentFiniteNumber(x), true, `legitimate numeric must be kept: ${String(x)}`); checks++;
  const n = Number(x);
  assert.equal(referenceDirection(x), n >= 101 ? 'ABOVE_REFERENCE' : n <= 99 ? 'BELOW_REFERENCE' : 'REFERENCE_VICINITY'); checks++;
}
console.log(JSON.stringify({suite:'Strict numeric presence and interpretation boundary',checks,pass:checks,fail:0}));

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseLocalDateAtNoon } from '../shared/textUtilities.js';

// Execute real private source functions, never a duplicated simplified predicate.
const src = fs.readFileSync(new URL('../screens/readingScreen.js', import.meta.url), 'utf8');
function block(start, end) {
  const a=src.indexOf(start), b=src.indexOf(end,a);
  assert.ok(a>=0 && b>a, 'cannot locate '+start);
  return src.slice(a,b);
}
const code=[block('function dateToTime(', '\nfunction bodyAreaObservations('),block('function repeatedBodyAreas(', '\nfunction targetRegionId(')].join('\n');
function subject(now, before) {
  const observation={areaId:'calf',label:'ふくらはぎ'};
  const ctx={parseLocalDateAtNoon,bodyAreaObservations:feedback=>feedback?.bodyAreaObservations||[],
    buildRecordHistory:()=>({previousRuns:[{record:{date:before,activityType:'run'},feedback:{bodyAreaObservations:[observation]}}]})};
  vm.runInNewContext(code+'\nglobalThis.actual = repeatedBodyAreas;',ctx,{filename:'screens/readingScreen.js'});
  return ctx.actual({record:{date:now,activityType:'run'},feedback:{bodyAreaObservations:[observation]}},[]).length;
}
test('F03 invalid previous date never counts as repeated body observation',()=>assert.equal(subject('2026-10-12','invalid'),0));
test('F03 impossible previous date cannot roll into false repetition',()=>assert.equal(subject('2026-03-01','2026-02-30'),0));
test('F03 future dated observation is not prior history',()=>assert.equal(subject('2026-10-12','2026-10-13'),0));
test('F03 28 day previous observation is still included',()=>assert.equal(subject('2026-10-29','2026-10-01'),1));
test('F03 29 day previous observation remains excluded',()=>assert.equal(subject('2026-10-30','2026-10-01'),0));
test('F03 same day observation is retained',()=>assert.equal(subject('2026-10-12','2026-10-12'),1));

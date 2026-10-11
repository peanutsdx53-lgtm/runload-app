import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isPresentFiniteNumber } from '../shared/valueUtilities.js';
const source=fs.readFileSync(new URL('../screens/consultationScreen.js', import.meta.url),'utf8');
const start=source.indexOf('function consultationTrendSvg(');
const end=source.indexOf('function consultationRegionVisual(',start);
assert.ok(start>=0&&end>start);
const context={isPresentFiniteNumber, escapeHtml:(s)=>String(s), formatNumber:(x)=>String(x),shortDateLabel:(s)=>String(s)};
vm.runInNewContext(source.slice(start,end)+'\nglobalThis.__render=consultationTrendSvg;',context);
const render=context.__render;
const recent=(value,date)=>({regionalDirectComparable:true,regionalValue:value,date});
test('F03: missing restored values cannot count as valid trend points',()=>{
 for(const missing of [null,undefined,'',false]) {
  const html=render({date:'2026-10-11',recent:[recent(missing,'2026-10-08')]},{available:true,value:103,regionName:'下腿後面'});
  assert.match(html,/比較できる記録が2件以上/);
  assert.doesNotMatch(html,/<polyline/);
 }
});
test('F03: missing current regional value cannot become numeric zero',()=>{
 const html=render({date:'2026-10-11',recent:[recent(97,'2026-10-08')]},{available:true,value:null,regionName:'下腿後面'});
 assert.match(html,/比較できる記録が2件以上/);
});
test('F03: genuine numeric zero remains a valid non-missing value',()=>{
 const html=render({date:'2026-10-11',recent:[recent(0,'2026-10-08')]},{available:true,value:103,regionName:'下腿後面'});
 assert.match(html,/<polyline/);
 assert.match(html,/>0<\/text>/);
});

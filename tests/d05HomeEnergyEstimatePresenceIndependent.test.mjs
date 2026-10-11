import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Executes production weeklySummary rather than a reimplementation.
const source = fs.readFileSync(new URL('../screens/mobile/homeScreen.js', import.meta.url), 'utf8');
const original = source
  .replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*$/gm, '')
  .replace(/^export\s+/gm, '');
const monday = new Date(2026, 9, 5, 12);
const records = [{id:'has-null',date:'2026-10-07',activityType:'run',distanceKm:5,durationMinutes:30},
 {id:'missing',date:'2026-10-08',activityType:'run',distanceKm:5,durationMinutes:30}];
function probe(saved) {
 const context={mondayOfWeek:()=>new Date(monday),findSavedRunMeasurement:(id)=>saved[id]||null,
  escapeHtml:(v)=>String(v),formatNumber:(v)=>String(v)};
 vm.runInNewContext(`${original}\nglobalThis.__audit={weeklySummary,renderOverviewWeek};`,context,
  {filename:'screens/mobile/homeScreen.js'});
 const services={storage:{records:{loadAll:()=>records}}};
 return {summary:context.__audit.weeklySummary(services),html:context.__audit.renderOverviewWeek(services)};
}
test('D05/F03: absent estimated energy never generates fake zero on mobile Home',()=>{
 for(const missing of [null,undefined,'',false]) {
  const {summary,html}=probe({'has-null':{energyEstimate:{estimatedKcal:missing}}});
  assert.equal(summary.kcalCount,0);
  assert.match(html,/推定消費 —/);
  assert.doesNotMatch(html,/推定消費 0 kcal/);
 }
});
test('D05/F03: genuine numeric zero remains available',()=>{
 const {summary,html}=probe({'has-null':{energyEstimate:{estimatedKcal:0}}});
 assert.equal(summary.kcalCount,1);
 assert.match(html,/推定消費 0 kcal/);
});
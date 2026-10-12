import test from 'node:test';
import assert from 'node:assert/strict';
import { collectAchievementMetrics, evaluateAchievements } from '../ui/mobileAchievements.js';
import { parseLocalDateAtNoon } from '../shared/textUtilities.js';
import { readFileSync } from 'node:fs';
const iso=(date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
function invalidRollover(date=new Date()){
 const previous = new Date(date.getFullYear(), date.getMonth(), 0, 12);
 return [previous.getFullYear(),String(previous.getMonth()+1).padStart(2,'0'),String(previous.getDate()+date.getDate()).padStart(2,'0')].join('-');
}
function services(records){return {storage:{records:{loadAll:()=>records},plans:{loadAll:()=>[]},courses:{loadAll:()=>[]}}};}
test('F03 missing dates never count as this week or active calendar weeks',()=>{
 const records=['',null,undefined,'unreadable'].map((date,i)=>({id:'bad-'+i,activityType:'run',date,distanceKm:0}));
 const metrics=collectAchievementMetrics(services(records));
 assert.equal(metrics.weeklyRuns,0);assert.equal(metrics.activeWeeks,0);
 assert.equal(evaluateAchievements(services(records)).find(x=>x.id==='week-3').unlocked,false);
});
test('F03 impossible date that would roll into current week is not counted',()=>{
 const bad=invalidRollover();
 const metrics=collectAchievementMetrics(services([{id:'r',activityType:'run',date:bad,distanceKm:2}]));
 assert.equal(metrics.weeklyRuns,0,'invalid '+bad);
 assert.equal(metrics.activeWeeks,0);
});
test('F03 nonfinite and negative stored distances cannot unlock cumulative achievements',()=>{
 const records=['Infinity',Infinity,-1000,'not-a-number',''].map((distanceKm,i)=>({id:'r-'+i,date:iso(new Date()),activityType:'run',distanceKm}));
 const metrics=collectAchievementMetrics(services(records));
 assert.equal(metrics.distance,0);
 assert.equal(evaluateAchievements(services(records)).find(x=>x.id==='distance-100').unlocked,false);
});
test('F03 real zero and positive finite distances retain legitimate total and date',()=>{
 const records=[0,'0',2.5,'2.5',null].map((distanceKm,i)=>({id:'r-'+i,date:iso(new Date()),activityType:'run',distanceKm}));
 const metrics=collectAchievementMetrics(services(records));
 assert.equal(metrics.distance,5);
 assert.equal(metrics.weeklyRuns,5);
 assert.equal(metrics.activeWeeks,1);
});
test('F03 shared local calendar parser refuses rollover/missing but accepts leap day',()=>{
 for(const value of [null,undefined,'',false,'2026-02-30','2026-00-12','2026-13-01','2026-10-00','2026-10-32','2026-02-29','NaN'])
   assert.equal(parseLocalDateAtNoon(value),null,String(value));
 assert.equal(parseLocalDateAtNoon('2024-02-29')?.getDate(),29);
 assert.equal(parseLocalDateAtNoon('2026-10-12')?.getDate(),12);
});
test('F03 both mobile overview and weekly challenge use one strict date parser',()=>{
 const overview=readFileSync(new URL('../screens/mobile/homeScreen.js',import.meta.url),'utf8');
 const challenge=readFileSync(new URL('../ui/mobileHomeExperience.js',import.meta.url),'utf8');
 assert.match(overview,/parseLocalDateAtNoon as parseLocalDate/);
 assert.match(challenge,/parseLocalDateAtNoon as parseLocalDate/);
});

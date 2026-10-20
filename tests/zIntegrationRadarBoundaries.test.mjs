import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RUNNING_PROFILE_AXES, buildRunningProfile, gpsPaceVariation, profileSvgPath, renderMobileRunningRadar } from '../ui/mobileRunningRadar.js';

const run=(id,date,createdAt,distanceKm=5,durationMinutes=30)=>({id,date,createdAt,activityType:'run',runningFormat:'CONTINUOUS_RUN',distanceKm,durationMinutes});
const current=run('run-4','2026-10-19','2026-10-19T12:00:00Z');
function points(){const track=[];let lon=139.9;for(let i=0;i<88;i++){lon+=(Math.floor(i/5)%3===0?.00030:Math.floor(i/5)%3===1?.00055:.00042);track.push({lat:37.5,lon,timestamp:i*10000,accuracyM:8,altitudeM:300+i*.05,altitudeAccuracyM:4});}return track;}
const measurement=()=>({track:points(),stepEstimate:{modelId:'device-motion-peak-v1',cadenceSpm:168,steps:2500},courseAnalysis:{gradeKnowledge:'KNOWN_PROFILE',elevationCoverage:.91,elevationGainM:50,distanceKm:5}});
const full=buildRunningProfile(current,{measurement:measurement(),fatigue:{pre:2,post:5}});

test('Round4 axes: six independent categories with explicitly fixed display ranges',()=>{
 assert.deepEqual(RUNNING_PROFILE_AXES.map(a=>a.id),['distance','speed','variation','hills','cadence','fatigue']);
 assert.deepEqual(RUNNING_PROFILE_AXES.map(a=>a.max),[20,20,50,80,220,10]);
 assert.equal(RUNNING_PROFILE_AXES.at(-1).min,-10);
});
test('Round4 six-axis GPS test fixture: raw values, no false normalized tissue load',()=>{
 assert.equal(full.available,6);
 assert.equal(full.raw.distance,5);
 assert.equal(full.raw.speed,10);
 assert.ok(full.raw.variation>0);
 assert.equal(full.raw.hills,10);
 assert.equal(full.raw.cadence,168);
 assert.equal(full.raw.fatigue,3);
 assert.notDeepEqual(full.values,[.5,.5,.5,.5,.5,.5]);
 assert.equal(full.values[5],.65);
});
test('Round4 manual input refuses to invent GPS, gradient, steps or fatigue',()=>{
 const p=buildRunningProfile(current);
 assert.equal(p.available,2);
 assert.deepEqual(p.values.slice(2),[null,null,null,null]);
 assert.equal(profileSvgPath(p.values).closed,false);
 assert.equal(profileSvgPath(p.values).path.includes(' Z'),false);
});
test('Round4 GPS failures: no timestamps, 250m accuracy, implausible speed and insufficient sampling',()=>{
 assert.equal(gpsPaceVariation(null),null);
 assert.equal(gpsPaceVariation({track:points().map(p=>({...p,accuracyM:250}))}),null);
 assert.equal(gpsPaceVariation({track:points().map(p=>({...p,timestamp:0}))}),null);
 assert.equal(gpsPaceVariation({track:points().slice(0,6)}),null);
});
test('Round4 hill quality and cadence limits: no fabricated zero for unknown grade',()=>{
 const m=measurement();m.courseAnalysis.elevationCoverage=.6;
 const p=buildRunningProfile(current,{measurement:m,fatigue:{pre:2,post:null}});
 assert.equal(p.raw.hills,null);assert.equal(p.raw.fatigue,null);
 assert.equal(p.raw.cadence,168);assert.equal(p.raw.variation!==null,true);
 m.stepEstimate.cadenceSpm=NaN;assert.equal(buildRunningProfile(current,{measurement:m}).raw.cadence,null);
});
test('Round4 previous and historic records: render three distinct colours, selector, no future leakage',()=>{
 const r1=run('r1','2026-10-01','2026-10-01T13:00:00Z');
 const r2=run('r2','2026-10-15','2026-10-15T13:00:00Z');
 const r5=run('r5','2026-10-20','2026-10-20T13:00:00Z');
 const services={fatigue:{summarizeRun:()=>({available:false})}};
 const html=renderMobileRunningRadar({record:current,measurement:measurement(),fatigue:{pre:2,post:5},services,allExperiences:[{record:r1},{record:r5},{record:r2},{record:current}]});
 assert.match(html,/running-radar__series--current/);
 assert.match(html,/running-radar__series--previous/);
 assert.match(html,/running-radar__series--history/);
 assert.match(html,/data-running-radar-select/);
 assert.match(html,/<option data-available="2" value="r1" selected="selected">/);
 assert.doesNotMatch(html,/data-running-radar-layer="r5"/);
 assert.equal((html.match(/class="running-radar__svg"/g)||[]).length,1);
});
test('Round4 two records render two colours but no non-existent third history',()=>{
 const r1=run('r1','2026-10-01','2026-10-01T12:00:00Z');
 const html=renderMobileRunningRadar({record:current,measurement:measurement(),allExperiences:[{record:r1}]});
 assert.doesNotMatch(html,/data-running-radar-select/);
 assert.doesNotMatch(html,/running-radar__series--history/);
});
test('Round4 manual-only run shows truthful unavailable message instead of a fake six-sided polygon',()=>{
 const html=renderMobileRunningRadar({record:current,allExperiences:[]});
 assert.match(html,/今回の表示は 2\/6軸/);
 assert.doesNotMatch(html,/class="running-radar__svg"/);
});
test('Round4 walk and rest remain out of continuous RUN radar',()=>{
 assert.equal(renderMobileRunningRadar({record:{...current,runningFormat:'RUN_WALK'}}),'');
 assert.equal(renderMobileRunningRadar({record:{...current,activityType:'rest'}}),'');
});
test('Round4 boundaries: mobile code owns radar; desktop does not; loader and SW own runtime dependencies',()=>{
 const mobile=fs.readFileSync(new URL('../screens/mobile/resultScreen.js',import.meta.url),'utf8');
 const pc=fs.readFileSync(new URL('../screens/desktop/resultScreen.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../styles/mobile-run-lab.css',import.meta.url),'utf8');
 const sw=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
 assert.match(mobile,/renderMobileRunningRadar/);
 assert.doesNotMatch(pc,/mobileRunningRadar|running-radar/);
 assert.match(css,/max-width:54\.99rem/);
 assert.match(sw,/ui\/mobileRunningRadar\.js/);
 assert.doesNotMatch(sw,/ui\/anatomicalBodySvg\.js/);
 assert.doesNotMatch(sw,/mobileRunFingerprint/);
});

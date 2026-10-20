import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage } from '../core/appCore.js';
import { renderResultScreen as renderMobile } from '../screens/mobile/resultScreen.js';
import { renderBodyPartDetailScreen as renderDetail } from '../screens/mobile/bodyPartDetailScreen.js';
import { renderRunCapsule } from '../ui/mobileInsights.js';

const feedback={checkStatus:'deferred',bodyAreaObservations:[],safetyFlags:{}};
function recordAt(km, duration=30) {
 const services=createApplicationServices({storage:createMemoryStorage()});
 const record={id:`round3-${km}`,createdAt:'2026-10-19T10:00:00.000Z',date:'2026-10-19',activityType:'run',distanceKm:km,durationMinutes:duration,runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',course:{gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'}};
 assert.equal(services.workflows.records.saveRecordAndFeedback(record,feedback).ok,true);
 const context={parameters:new URLSearchParams(`recordId=${record.id}`)};
 return {services,record,context};
}

test('Round3: all 12 cards put the reference delta in their own non-overlapping markup position',()=>{
 const v=recordAt(5.5);const html=renderMobile(v);
 const entries=[...html.matchAll(/<a class="region-row"[^>]*>([\s\S]*?)<\/a>/g)].map(x=>x[1]);
 assert.equal(entries.length,19,'focus seven + all twelve are both pre-rendered for accessible sheet toggle');
 for(const entry of entries){
  assert.match(entry,/<span class="region-reference-delta">(?:基準差 [+-]?\d+(?:\.\d+)?|数値なし)<\/span>/);
  assert.match(entry,/<span class="region-metric"><strong>[^<]+<\/strong><\/span>/);
  const score=entry.match(/class="region-metric"><strong>(\d+(?:\.\d+)?)<\/strong>/)?.[1];
  const diff=entry.match(/class="region-reference-delta">基準差 ([+-]?\d+(?:\.\d+)?)/)?.[1];
  if(score && diff) assert.ok(Math.abs(Number(score)-100-Number(diff))<0.11,{score,diff});
 }
 assert.doesNotMatch(html,/class="region-metric"><strong>[^<]*<\/strong><small>/);
});

test('Round3: unavailable values remain unavailable rather than invented zero or one hundred',()=>{
 const v=recordAt(5,30); // 10.0km/h: no published Van Hooren 2.78m/s lower anchor
 const html=renderMobile(v);
 const all=html.match(/data-result-region-mobile-list="all" hidden>([\s\S]*?)<\/div><\/section>/)?.[1]??'';
 assert.equal((all.match(/class="region-reference-delta">数値なし/g)||[]).length,3);
});

test('Integrated result: old decorative polygon is absent, real radar is the only shape comparison',()=>{
 const v=recordAt(5.5);const html=renderMobile(v);
 assert.doesNotMatch(html,/run-fingerprint__svg|run-fingerprint-card/);
 assert.match(html,/EXPERIMENTAL · RUN PROFILE/);
 assert.match(html,/走りの個性を比べる/);
 assert.match(html,/走行ルートと推移/);
});

test('Round3: selected historical record has an explicit metric label and reference caveat remains discoverable',()=>{
 const v=recordAt(5.5);const regionId='BA-DISP-014';
 const html=renderDetail({services:v.services,context:{parameters:new URLSearchParams(`recordId=${v.record.id}&regionId=${regionId}`)}});
 assert.match(html,/今回の保存記録/);
 assert.match(html,/基準100に対する値/);
 assert.doesNotMatch(html,/<em>この部位<\/em>/);
 assert.match(html,/今回が最初の比較点です/);
 assert.match(html,/<summary>基準100について<\/summary>/);
 assert.match(html,/別部位の値と大きさを比べることはできません/);
 assert.match(html,/data-scientific-raw-unit/);
});

test('Round3: rest-day screen remains free from ornamental running fingerprint',()=>{
 const v=recordAt(5.5);const rest={...v.record,activityType:'rest'};
 assert.equal(renderRunCapsule(v.services,rest),'');
});

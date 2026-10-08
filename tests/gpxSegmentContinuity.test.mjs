import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseGpxText, analyzeGpx } from '../ui/gpxLocalAnalysis.js';
const p=(lat,lon,ele=10,segmentIndex=0)=>({lat,lon,ele,segmentIndex});
const mkNode=(lat,lon,ele,parent)=>({parentElement:parent,getAttribute(k){return k==='lat'?lat:k==='lon'?lon:null},querySelector(k){return k==='ele'&&ele!==null?{textContent:String(ele)}:null}});
function withNodes(nodes,fn){const old=globalThis.DOMParser;globalThis.DOMParser=class {parseFromString(){return {querySelector(){return null},querySelectorAll(){return nodes}}}};try{return fn()}finally{if(old===undefined)delete globalThis.DOMParser;else globalThis.DOMParser=old}}
const parents=[{},{}];
test('Two GPX trkseg spans 100km apart are not connected by an invented travel leg',()=>{
 const summary=analyzeGpx({points:[p(35,139,10,0),p(35,139.001,10,0),p(36,140,10,1),p(36,140.001,10,1)]});
 assert.ok(summary.distanceKm>0.1 && summary.distanceKm<1,`Fictitious intersegment leg ${summary.distanceKm} km`);
});
test('Parser labels distinct GPX track segments and analyzer excludes gap',()=>{
 const parsed=withNodes([mkNode('35','139',10,parents[0]),mkNode('35','139.001',10,parents[0]),mkNode('36','140',10,parents[1]),mkNode('36','140.001',10,parents[1])],()=>parseGpxText('<gpx/>'));
 assert.notEqual(parsed.points[1].segmentIndex,parsed.points[2].segmentIndex);
 assert.ok(analyzeGpx(parsed).distanceKm<1);
});
test('An invalid middle point separates otherwise distant valid positions',()=>{
 const parsed=withNodes([mkNode('35','139',10,parents[0]),mkNode('35','139.001',10,parents[0]),mkNode('99','139.002',10,parents[0]),mkNode('36','140',10,parents[0]),mkNode('36','140.001',10,parents[0])],()=>parseGpxText('<gpx/>'));
 assert.equal(parsed.points.length,4);
 assert.notEqual(parsed.points[1].segmentIndex,parsed.points[2].segmentIndex);
 assert.ok(analyzeGpx(parsed).distanceKm<1);
});
test('Single GPX continuous series still measures adjacent 1km route normally',()=>{
 const summary=analyzeGpx({points:[p(35,139),p(35,139.01)]});
 assert.ok(summary.distanceKm>0.8 && summary.distanceKm<1.2);
});

test('A pair of segments each with valid elevation preserves 100% flat grade separately',()=>{
 const r=analyzeGpx({points:[p(35,139,1,0),p(35,139.001,1,0),p(36,140,25,1),p(36,140.001,25,1)]});
 assert.equal(r.gradeKnowledge,'KNOWN_PROFILE');
 assert.equal(r.flatPercent,100);
 assert.equal(r.elevationGainM,0);
});
test('First point of a route and last point of prior track must not create a slope',()=>{
 const r=analyzeGpx({points:[p(35,139,0,0),p(35,139.001,0,0),p(36,140,999,1),p(36,140.001,999,1)]});
 assert.equal(r.gradeKnowledge,'KNOWN_PROFILE');
 assert.equal(r.upPercent,0);
 assert.equal(r.downPercent,0);
 assert.equal(r.elevationGainM,0);
});
test('A disconnected GPX without any continuous pair is rejected rather than fabricating a distance',()=>{
 assert.throws(()=>analyzeGpx({points:[p(35,139,0,0),p(36,140,999,1)]}),/GPX_DISTANCE_REQUIRED/);
});
test('Legacy parsed points without group metadata retain a single sequence for compatibility',()=>{
 const p0={lat:35,lon:139,ele:0},p1={lat:35,lon:139.01,ele:0};
 assert.ok(analyzeGpx({points:[p0,p1]}).distanceKm>0.8);
});

const uiSource = readFileSync(new URL('../ui/interactions/gpxAnalysisInteractions.js', import.meta.url),'utf8');
const uiSandbox = { GPX_MAX_TEXT_CHARS: 10_000_000 };
vm.runInNewContext(uiSource.replace(/^import\s+[^\n]+\n/gm, '').replaceAll('export function bindGpxAnalysis','function bindGpxAnalysis') + '\nglobalThis.__svg=profileSvg;', uiSandbox);
const profileSvg = uiSandbox.__svg;
test('Altitude profile must not visually join two disjoint track segments',()=>{
  const svg = profileSvg([p(35,139,0,0),p(35,139.001,0,0),p(36,140,999,1),p(36,140.001,999,1)]);
  assert.equal((svg.match(/<polyline /g)||[]).length,2);
});
test('Altitude profile must not connect two known points across unknown elevation',()=>{
  const svg = profileSvg([p(35,139,0),p(35,139.001,0),p(35,139.002,null),p(35,139.003,10),p(35,139.004,10)]);
  assert.equal((svg.match(/<polyline /g)||[]).length,2);
});

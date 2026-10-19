import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {RUNNING_REGION_SERIES,RESEARCH_EXPECTATION_SHA256,APPROVED_E_EXTENSIONS} from '../core/runningEvidence/runningEvidenceRegistry.js';
import {evaluateRunningRegion,evaluateRunningAtSpeed,evaluateExtension,compatibleForReferenceComparison,strictCommonSpeedRange} from '../core/runningEvidence/runningEvidenceEngine.js';
const base=dirname(fileURLToPath(import.meta.url));
function csv(text){
  // Native, dependency-free RFC4180 subset (quoted cells, commas and embedded newlines).
  const records=[];let rec=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"') {if(quoted&&text[i+1]==='"'){cell+='"';i++;} else quoted=!quoted;}
    else if(c===','&&!quoted){rec.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;rec.push(cell);cell='';if(rec.some(x=>x.length)) records.push(rec);rec=[];}
    else cell+=c;
  }
  rec.push(cell);if(rec.some(x=>x.length))records.push(rec);
  const headings=records.shift();
  return records.map(row=>Object.fromEntries(headings.map((h,i)=>[h,row[i]??''])));
}
function fixedCSV(file,sha){
  const bytes=readFileSync(join(base,'fixtures','research',file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),sha,`${file} fixture must match preregistered research Current`);
  return csv(bytes.toString('utf8').replace(/^\uFEFF/,''));
}
const fixed18=fixedCSV('current18.csv',RESEARCH_EXPECTATION_SHA256.current18);
const fixed19=fixedCSV('current19.csv',RESEARCH_EXPECTATION_SHA256.current19);
const fixed13=fixedCSV('current13.csv',RESEARCH_EXPECTATION_SHA256.current13);
const mps=(v,u)=>Number(v)/(u==='km/h'?3.6:1);
const expectedDirection=(a,b)=>b>a?'増加':b<a?'減少':'同値';
function countAt(kmh){return Object.values(evaluateRunningAtSpeed(kmh/3.6,{protocolMatched:true}).regions).filter(r=>r.reference100!==null).length;}

test('V1: fixed independent research fixtures have expected immutable 65/53 quantities and 12 sources',()=>{
  assert.equal(fixed18.length,65);assert.equal(fixed19.length,53);assert.equal(RUNNING_REGION_SERIES.length,12);
  assert.equal(fixed13.filter(x=>x['筋コード']&&x['D0']).length>4,true);
  assert.equal(APPROVED_E_EXTENSIONS.length,0);
  for(const r of RUNNING_REGION_SERIES)assert.match(r.sourceSha256,/^[a-f0-9]{64}$/);
});
test('V2/V3: all 65 publication table/independent formula examples are reproduced',()=>{
  let count=0;
  for(const r of fixed18){
    const result=evaluateRunningRegion(r['部位番号'],mps(r['速度原典値'],r['速度単位']),{protocolMatched:true});
    assert.equal(result.state,'CALCULATED',`${r['部位番号']}/${r['速度原典値']}`);
    assert.equal(result.unit,r['単位']);
    assert.equal(result.sourceSha256,r['出典SHA256']);
    assert.ok(Math.abs(result.rawValue-Number(r['値']))<=1e-6,`${r['部位番号']}/${r['速度原典値']} raw ${result.rawValue} vs ${r['値']}`);
    assert.ok(Math.abs(result.reference100-Number(r['研究独自の参照100比']))<=0.001,`${r['部位番号']}/${r['速度原典値']} normalized ${result.reference100} vs ${r['研究独自の参照100比']}`);
    assert.equal(result.route,Number(r['部位番号'].slice(1))===2||[3,4,7].includes(Number(r['部位番号'].slice(1)))?'A2_PUBLISHED_EQUATION':'A1_PUBLISHED_TABLE');
    count++;
  }
  assert.equal(count,65);
});
test('V5: all 53 preregistered directions are reproduced independently',()=>{
  let count=0;
  for(const r of fixed19){
    const a=evaluateRunningRegion(r['部位番号'],mps(r['速度A'],r['速度単位']),{protocolMatched:true});
    const b=evaluateRunningRegion(r['部位番号'],mps(r['速度B'],r['速度単位']),{protocolMatched:true});
    assert.notEqual(a.rawValue,null);assert.notEqual(b.rawValue,null);
    const measured=expectedDirection(a.rawValue,b.rawValue);
    assert.equal(measured,r['期待方向'],`${r['比較ID']}: ${measured} vs ${r['期待方向']}`);
    assert.ok(Math.abs(a.reference100-Number(r['期待参照比A']))<=0.001,r['比較ID']);
    assert.ok(Math.abs(b.reference100-Number(r['期待参照比B']))<=0.001,r['比較ID']);
    count++;
  }
  assert.equal(count,53);
});
test('V4: linear B only joins adjacent anchors; original anchors are A1 and folds preserved',()=>{
  const a=evaluateRunningRegion('R10',6/3.6,{protocolMatched:true});
  const m=evaluateRunningRegion('R10',6.5/3.6,{protocolMatched:true});
  const b=evaluateRunningRegion('R10',7/3.6,{protocolMatched:true});
  assert.equal(a.route,'A1_PUBLISHED_TABLE');assert.equal(b.route,'A1_PUBLISHED_TABLE');
  assert.equal(m.route,'B_INTRA_SOURCE_INTERPOLATION');assert.equal(m.anchorIds.length,2);
  assert.ok(Math.abs(m.rawValue-(314.41+296.76)/2)<1e-7);
  assert.equal(evaluateRunningRegion('R10',7.5/3.6,{protocolMatched:true}).route,'B_INTRA_SOURCE_INTERPOLATION');
  assert.ok(evaluateRunningRegion('R10',7.5/3.6,{protocolMatched:true}).rawValue> b.rawValue);
});
test('V6/V11: explicit cardinalities, exact 10.008 boundary, no 10.0 snapping',()=>{
  assert.deepEqual([[9,9],[10,9],[10.008,12],[10.5,12],[11,12],[11.5,12],[12,12],[12.001,9],[12.6,9]].map(([s])=>[s,countAt(s)]),[[9,9],[10,9],[10.008,12],[10.5,12],[11,12],[11.5,12],[12,12],[12.001,9],[12.6,9]]);
  const common=strictCommonSpeedRange();
  assert.ok(Math.abs(common.minKmh-10.008)<1e-9);assert.ok(Math.abs(common.maxKmh-12)<1e-9);
  assert.ok(Math.abs(common.widthKmh-1.992)<1e-9);
  for(const k of ['R05','R06','R09'])assert.equal(evaluateRunningRegion(k,10/3.6).reasonCode,'OUTSIDE_SOURCE_RANGE');
  for(const k of ['R10','R11','R12'])assert.equal(evaluateRunningRegion(k,12.001/3.6).reasonCode,'OUTSIDE_SOURCE_RANGE');
});
test('V6: invalid/nonfinite and mixed activity refuse to produce a numerical result',()=>{
  for(const speed of [undefined,null,NaN,Infinity,-Infinity,0,-1,'11']){
    const res=evaluateRunningRegion('R05',speed);assert.equal(res.reference100,null);assert.equal(res.reasonCode,'INVALID_SPEED');
  }
  assert.equal(evaluateRunningRegion('R01',3,{walkingMixed:true}).reasonCode,'MIXED_GAIT');
  assert.equal(evaluateRunningRegion('R01',3,{activity:'WALK_EXPERIMENTAL'}).reasonCode,'ACTIVITY_MISMATCH');
  assert.equal(evaluateRunningRegion('R01',3,{requireMatchedProtocol:true,protocolMatched:false}).reasonCode,'CONDITION_NOT_VERIFIED');
  const unknown=evaluateRunningRegion('R00',3);assert.equal(unknown.reasonCode,'UNKNOWN_REGION');
  const average=evaluateRunningRegion('R01',3,{speedContext:'RECORD_AVERAGE_UNVERIFIED'});
  assert.equal(average.state,'CONTEXT_LIMITED');assert.equal(average.reasonCode,'LITERATURE_REFERENCE_NOT_PERSONAL_MEASUREMENT');
});
test('V7: unapproved E route cannot be activated by caller-supplied approval metadata',()=>{
  const fake={id:'P2_HO_TO_LI',registrySignature:'forged',status:'APPROVED',metricId:'LI_HEEL_MAX_FORCE',unit:'N',reference:{raw:300}};
  assert.deepEqual(evaluateExtension(fake),{state:'NOT_CALCULABLE',reasonCode:'UNAPPROVED_EVIDENCE',value:null});
  assert.equal(evaluateRunningRegion('R10',3,{extensionId:fake.id}).reference100,null);
});
test('V8: equality signature refuses legacy and wrong-series comparisons',()=>{
  const a=evaluateRunningRegion('R01',3,{protocolMatched:true});
  const b=evaluateRunningRegion('R01',3.5,{protocolMatched:true});
  assert.equal(compatibleForReferenceComparison(a,b),true);
  assert.equal(compatibleForReferenceComparison(a,{...b,semanticVersion:'v3.1'}),false);
  assert.equal(compatibleForReferenceComparison(a,{...b,seriesId:'JIN_2018_TO_FUKUCHI_2017'}),false);
  assert.equal(compatibleForReferenceComparison(a,evaluateRunningRegion('R08',3.5,{protocolMatched:true})),false);
  assert.equal(compatibleForReferenceComparison(a,evaluateRunningRegion('R01',1)),false);
});

// Additional boundary representatives, not a claim that the full Current/20 42-case product workflow passes.
test('V6 record adapter: valid running facts become reference-only; originals never mutate', async()=>{
  const {evaluateRunningRecordReference}=await import('../core/runningEvidence/runningEvidenceEngine.js');
  const original=Object.freeze({distanceKm:5.5,durationMinutes:30,surface:'GRASS',gradePercent:3});
  const r=evaluateRunningRecordReference(original);
  assert.equal(r.state,'REFERENCE_ONLY');assert.ok(Math.abs(r.speedMps-11/3.6)<1e-9);
  assert.equal(Object.values(r.regions).filter(x=>x.reference100!==null).length,12);
  assert.equal(r.regions.R01.state,'CONTEXT_LIMITED');
  assert.equal(r.regions.R01.hypothetical,false);
  assert.equal(r.unquantifiedConditions.surface,'GRASS');
  assert.deepEqual(original,{distanceKm:5.5,durationMinutes:30,surface:'GRASS',gradePercent:3});
  for(const [rec,reason] of [
    [{distanceKm:0,durationMinutes:30},'INVALID_DISTANCE_OR_DURATION'],
    [{distanceKm:-1,durationMinutes:30},'INVALID_DISTANCE_OR_DURATION'],
    [{distanceKm:5,durationMinutes:0},'INVALID_DISTANCE_OR_DURATION'],
    [{distanceKm:5,durationMinutes:NaN},'INVALID_DISTANCE_OR_DURATION'],
    [{distanceKm:5,durationMinutes:30,walkingMixed:true},'MIXED_GAIT'],
    [{distanceKm:5,durationMinutes:30,activity:'WALK_EXPERIMENTAL'},'ACTIVITY_MISMATCH']
  ])assert.equal(evaluateRunningRecordReference(rec).reasonCode,reason);
});

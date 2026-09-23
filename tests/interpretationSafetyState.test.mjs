import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSubjectiveFeedback } from '../ui/interactions/recordInputInteractions.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const results=[];
async function testCase(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

function form(status, extras={}){
  const fd=new FormData();
  fd.set('subjectiveStatus',status);
  for(const [key,value] of Object.entries(extras)) fd.set(key,String(value));
  return fd;
}

await testCase('DEFERRED-IGNORES-STALE-URGENT-FLAG',()=>{
  const feedback=readSubjectiveFeedback(form('deferred',{
    safety_chestPainOrPressure:'1',
    consultationNote:'old note',
    unexpectedSymptom:'1',
  }));
  assert.equal(feedback.safetyFlags.chestPainOrPressure,false);
  assert.equal(feedback.unexpectedSymptom,false);
  assert.equal(feedback.consultationNote,'');
  assert.equal(feedback.safetyCheck.status,'not_asked');
});

await testCase('NONE-REPORTED-IGNORES-STALE-URGENT-FLAG',()=>{
  const feedback=readSubjectiveFeedback(form('none_reported',{
    safety_breathingDifficulty:'1',
  }));
  assert.equal(feedback.safetyFlags.breathingDifficulty,false);
  assert.equal(feedback.safetyCheck.status,'none_reported');
});

await testCase('DISCOMFORT-IGNORES-HIDDEN-CONSULTATION-FLAG',()=>{
  const feedback=readSubjectiveFeedback(form('discomfort_reported',{
    safety_faintingOrConfusion:'1',
  }));
  assert.equal(feedback.safetyFlags.faintingOrConfusion,false);
  assert.equal(feedback.safetyCheck.status,'none_reported');
});

await testCase('STRONG-REPORTED-RETAINS-EXPLICIT-FLAG',()=>{
  const feedback=readSubjectiveFeedback(form('strong_reported',{
    safety_chestPainOrPressure:'1',
    consultationNote:'current note',
  }));
  assert.equal(feedback.safetyFlags.chestPainOrPressure,true);
  assert.equal(feedback.consultationNote,'current note');
  assert.equal(feedback.safetyCheck.status,'reported');
});

await testCase('INITIALIZATION-NORMALIZES-HIDDEN-CONSULTATION-FACTS',()=>{
  const source=read('ui/interactions/recordInputInteractions.js');
  const bind=source.match(/function bindEmbeddedRecordSubflows[\s\S]*?export function readSubjectiveFeedback/)?.[0]||'';
  assert.match(bind,/normalizeEmbeddedBodyStatus\(form\);/);
});

await testCase('RUNLOAD-INTERPRETATION-NAME-STAYS-INSIDE-ITS-WORKSPACE',()=>{
  const room=read('ui/interpretationRoomPresentation.js');
  assert.match(room,/今回のRunLoad解釈/);
  const outside=[
    'ui/screenArchitecture.js',
    'ui/appShell.js',
    'screens/bodyPartDetailScreen.js',
    'screens/historyScreen.js',
    'screens/simulationScreen.js',
  ].map(read).join('\n');
  assert.doesNotMatch(outside,/RunLoad解釈|RUNLOAD INTERPRETATION|解釈エンジン/);
  assert.match(outside,/結果を整理する/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Safety State',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

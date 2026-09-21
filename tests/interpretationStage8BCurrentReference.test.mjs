import assert from 'node:assert/strict';
import { renderInterpretationRoom } from '../ui/interpretationRoomPresentation.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

function output(){
  return {
    targetRecordId:'r1',
    context:{recordDate:'2026-09-21',origin:'result',selectedRegionId:'BA-DISP-014'},
    current:{
      facts:{},
      regions:[{regionId:'BA-DISP-014',label:'股関節部',value:104,referenceDirection:'ABOVE_REFERENCE'}],
      rof:{pre:4,post:6,delta:2,direction:'UP'},
    },
    comparison:{
      regionalById:{'BA-DISP-014':{comparablePreviousRecordId:'p1',previousValue:101,delta:3,previousDirection:'UP'}},
      conditionDifferences:[],
    },
    interpretation:{meaning:{
      primaryCode:'CURRENT_REFERENCE_PATTERN',
      secondaryCodes:[],
      focusRegionIds:['BA-DISP-014'],
      availableModes:['visual'],
      factsUsed:[{type:'REGION_CURRENT_REFERENCE',regionId:'BA-DISP-014',value:104,referenceDirection:'ABOVE_REFERENCE'}],
      boundaryCodes:[],
    }},
    safety:{route:'normal'},
    actions:[],
  };
}

await test('STAGE8B-CURRENT-REFERENCE-USES-REFERENCE-CURRENT-PATTERN',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/data-visual-pattern="reference-current"/);
  assert.match(html,/基準100 → 今回/);
  assert.match(html,/data-arrow-origin="reference"/);
});

await test('STAGE8B-CURRENT-REFERENCE-HIDES-PREVIOUS-EVEN-IF-COMPARISON-OBJECT-HAS-ONE',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.doesNotMatch(html,/>前回</);
  assert.doesNotMatch(html,/data-arrow-origin="previous"/);
});

await test('STAGE8B-CURRENT-REFERENCE-EXPLAINS-FUTURE-COMPARISON-POINT',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/股関節部は今回104で、基準100より上に表示されています/);
  assert.match(html,/次回以降に同じ部位を比べるための比較点として使えます/);
});

await test('STAGE8B-CURRENT-REFERENCE-DOES-NOT-MIX-OTHER-LAYERS',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.doesNotMatch(html,/主観的な疲労感 0–10/);
  assert.doesNotMatch(html,/前回と異なる走行条件/);
  assert.doesNotMatch(html,/interpretation-repeat-dots/);
});

await test('STAGE8B-CURRENT-REFERENCE-KEEPS-NON-EVALUATIVE-BOUNDARY',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/危険・安全・改善・悪化を判断しません/);
  assert.doesNotMatch(html,/良い|悪い|危険度|安全です|改善しました/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Stage 8B Current Reference Mapping',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

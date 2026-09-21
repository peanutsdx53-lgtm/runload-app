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
      conditionDifferences:[
        {id:'pace',labelToken:'PACE'},
        {id:'grade',labelToken:'GRADE'},
        {id:'surface',labelToken:'SURFACE'},
      ],
    },
    interpretation:{meaning:{
      primaryCode:'CONDITION_AND_RESULT_CHANGED',
      secondaryCodes:['MULTI_LAYER_CHANGE'],
      focusRegionIds:['BA-DISP-014'],
      availableModes:['visual'],
      factsUsed:[],
      boundaryCodes:['NO_CAUSAL_INFERENCE'],
    }},
    safety:{route:'normal'},
    actions:[],
  };
}

await test('STAGE8B-CONDITION-RESULT-USES-SEPARATED-PATTERN',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/data-visual-pattern="condition-result-separated"/);
  assert.match(html,/人体図で股関節部を強調/);
  assert.match(html,/前回 → 今回/);
  assert.match(html,/data-condition-context="separate"/);
});

await test('STAGE8B-CONDITION-CARD-IS-FACTUAL-AND-COMPACT',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/前回と異なる走行条件/);
  assert.match(html,/ペース、坂の条件、ほか1件/);
  assert.match(html,/部位別結果とは別の情報として確認します/);
  assert.doesNotMatch(html,/路面条件/);
});

await test('STAGE8B-CONDITION-RESULT-HAS-NO-CAUSAL-CONNECTOR',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/この比較だけで走行条件を部位別結果の原因とは判断できません/);
  assert.doesNotMatch(html,/condition.*arrow|arrow.*condition/is);
  assert.doesNotMatch(html,/原因です|影響しました|ためです/);
});

await test('STAGE8B-CONDITION-RESULT-DOES-NOT-MIX-ROF-LANE',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.doesNotMatch(html,/主観的な疲労感 0–10/);
  assert.doesNotMatch(html,/走行前後の疲労感/);
});

await test('STAGE8B-CONDITION-RESULT-KEEPS-ONE-REGIONAL-FOCUS',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.equal((html.match(/interpretation-body-region is-focus/g)||[]).length,1);
  assert.match(html,/別の部位との大小比較にも使いません/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Stage 8B Condition Result Mapping',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

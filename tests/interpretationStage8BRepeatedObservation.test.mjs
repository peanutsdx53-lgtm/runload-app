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
      primaryCode:'REPEATED_OBSERVATION',
      secondaryCodes:['CURRENT_SHIFT_WITH_HISTORY'],
      focusRegionIds:['BA-DISP-014'],
      availableModes:['visual'],
      factsUsed:[
        {type:'REGION_REPEATED_DIRECTION',regionId:'BA-DISP-014',currentDirection:'ABOVE_REFERENCE',pastMatchingCount:3,pastComparableCount:4},
      ],
      boundaryCodes:[],
    }},
    safety:{route:'normal'},
    actions:[],
  };
}

await test('STAGE8B-REPEATED-USES-COUNT-PATTERN',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/data-visual-pattern="repeated-count"/);
  assert.match(html,/比較可能な過去4件/);
  assert.match(html,/過去4件のうち3件でも/);
});

await test('STAGE8B-REPEATED-USES-EQUAL-SIZE-RECORD-DOTS',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.equal((html.match(/interpretation-repeat-dot is-match/g)||[]).length,3);
  assert.equal((html.match(/interpretation-repeat-dot is-other/g)||[]).length,1);
  assert.equal((html.match(/interpretation-repeat-dot is-current/g)||[]).length,1);
});

await test('STAGE8B-REPEATED-LOCATES-ONE-REGION-WITHOUT-REGIONAL-ARROW',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.equal((html.match(/interpretation-body-region is-focus/g)||[]).length,1);
  assert.doesNotMatch(html,/interpretation-comparison-arrow/);
});

await test('STAGE8B-REPEATED-DOES-NOT-TURN-COUNT-INTO-TRAIT',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/体質、傾向、けがの起こりやすさを示しません/);
  assert.match(html,/ここから体質や将来の結果までは判断しません/);
  assert.doesNotMatch(html,/傾向があります|体質です|なりやすい|起こりやすいです/);
});

await test('STAGE8B-REPEATED-DOES-NOT-MIX-OTHER-LAYERS',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.doesNotMatch(html,/主観的な疲労感 0–10/);
  assert.doesNotMatch(html,/前回と異なる走行条件/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Stage 8B Repeated Observation Mapping',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

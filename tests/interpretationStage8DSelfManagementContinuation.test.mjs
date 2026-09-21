import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderInterpretationRoom } from '../ui/interpretationRoomPresentation.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}
const source=async(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

function output(code,{history=true,simulation=true,conditions=true,rof=true}={}){
  const facts=[];
  if(['CURRENT_SHIFT_WITH_HISTORY','CONDITION_AND_RESULT_CHANGED','MULTI_LAYER_CHANGE'].includes(code)) {
    facts.push({type:'REGION_PREVIOUS_DIFFERENCE',regionId:'BA-DISP-014',previousValue:101,currentValue:104,delta:3,direction:'UP'});
  }
  if(code==='REPEATED_OBSERVATION') facts.push({type:'REGION_REPEATED_DIRECTION',regionId:'BA-DISP-014',currentDirection:'ABOVE_REFERENCE',pastComparableCount:4,pastMatchingCount:3});
  if(rof) facts.push({type:'ROF_PRE_POST',pre:4,post:6,delta:2,direction:'UP'});
  const actions=[];
  if(history) actions.push({actionId:'history',labelToken:'HISTORY',destination:'history',parameters:{recordId:'r1',regionId:'BA-DISP-014',view:'trends',metric:'region'},enabled:true});
  if(simulation) actions.push({actionId:'simulation',labelToken:'SIMULATION',destination:'simulation',parameters:{recordId:'r1',origin:'interpretation-room'},enabled:true});
  return {
    targetRecordId:'r1',
    context:{recordDate:'2026-09-21',origin:'result',selectedRegionId:'BA-DISP-014'},
    current:{facts:{},regions:[{regionId:'BA-DISP-014',label:'股関節部',value:104,referenceDirection:'ABOVE_REFERENCE'}],rof:rof?{pre:4,post:6,delta:2,direction:'UP'}:{pre:null,post:null,delta:null}},
    comparison:{
      regionalById:{'BA-DISP-014':code==='CURRENT_REFERENCE_PATTERN'?{comparablePreviousRecordId:null,previousValue:null,delta:null}:{comparablePreviousRecordId:'p1',previousValue:101,delta:3,previousDirection:'UP',historyComparableCount:4}},
      conditionDifferences:conditions?[{labelToken:'PACE'}]:[],
    },
    interpretation:{meaning:{primaryCode:code,secondaryCodes:[],focusRegionIds:['BA-DISP-014'],availableModes:['visual'],factsUsed:facts,boundaryCodes:[]}},
    safety:{route:'normal'},
    actions,
  };
}

const cases=[
  ['CURRENT_SHIFT_WITH_HISTORY','current-shift'],
  ['CONDITION_AND_RESULT_CHANGED','condition-result'],
  ['MULTI_LAYER_CHANGE','multi-layer'],
  ['REPEATED_OBSERVATION','repeated-observation'],
  ['CURRENT_REFERENCE_PATTERN','current-reference'],
];

for(const [code,key] of cases){
  await test(`STAGE8D-CONTINUATION-${code}`,()=>{
    const html=renderInterpretationRoom({output:output(code),view:'explain',mode:'visual',origin:'result'});
    assert.match(html,new RegExp(`data-continuation="${key}"`));
    assert.match(html,/今回理解したこと/);
    assert.match(html,/まだ分からないこと/);
    assert.match(html,/次に確認すること/);
    assert.doesNotMatch(html,/走るべき|休むべき|距離を減らす|距離を増やす|安全です|危険です/);
  });
}

await test('STAGE8D-CURRENT-SHIFT-USES-HISTORY-WHEN-AVAILABLE',()=>{
  const html=renderInterpretationRoom({output:output('CURRENT_SHIFT_WITH_HISTORY'),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/過去の比較可能な記録を確認/);
  assert.match(html,/#\/history/);
});

await test('STAGE8D-CONDITION-RESULT-USES-SIMULATION-WHEN-AVAILABLE',()=>{
  const html=renderInterpretationRoom({output:output('CONDITION_AND_RESULT_CHANGED'),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/条件を分けて確認/);
  assert.match(html,/#\/simulation/);
});

await test('STAGE8D-DIRECT-ACTION-UNAVAILABLE-FALLS-BACK-TO-MANAGEMENT',()=>{
  const html=renderInterpretationRoom({output:output('CURRENT_REFERENCE_PATTERN',{history:false}),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/次にどう活かすか考える/);
  assert.match(html,/topic=manage/);
});

await test('STAGE8D-MULTI-LAYER-NEXT-OBSERVATION-KEEPS-SCALES-SEPARATE',()=>{
  const html=renderInterpretationRoom({output:output('MULTI_LAYER_CHANGE'),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/別々の尺度としてもう一度確認できます/);
});

await test('STAGE8D-REPEATED-OBSERVATION-NEXT-CHECK-USES-COUNTS',()=>{
  const html=renderInterpretationRoom({output:output('REPEATED_OBSERVATION'),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/件数として更新できます/);
});

await test('STAGE8D-CURRENT-REFERENCE-NEXT-CHECK-WAITS-FOR-COMPARABLE-RECORD',()=>{
  const html=renderInterpretationRoom({output:output('CURRENT_REFERENCE_PATTERN',{history:false}),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/今回の基準100との位置からどう変わったか/);
});

await test('STAGE8D-REVEAL-AND-REDUCED-MOTION-REMAIN-STATIC-EQUIVALENT',async()=>{
  const css=await source('styles/interpretation-room.css');
  const block=css.slice(css.indexOf('/* Stage 8D:'));
  assert.match(block,/160ms ease-out 540ms 1 both/);
  assert.match(block,/animation-delay: 660ms/);
  assert.match(block,/html\.ui-motion-reduced[\s\S]*animation: none[\s\S]*opacity: 1[\s\S]*transform: none/);
  assert.match(block,/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Stage 8D Self Management Continuation',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

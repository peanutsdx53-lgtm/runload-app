import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderInterpretationRoom } from '../ui/interpretationRoomPresentation.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}
const source=async(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

function output(withHistory=true, primaryCode='CURRENT_SHIFT_WITH_HISTORY'){
  return {
    targetRecordId:'r1',
    context:{recordDate:'2026-09-21',origin:'result',selectedRegionId:'BA-DISP-014'},
    current:{
      facts:{},
      regions:[{regionId:'BA-DISP-014',label:'股関節部',value:104,referenceDirection:'ABOVE_REFERENCE'}],
      rof:{pre:null,post:null,delta:null},
    },
    comparison:{
      regionalById:{'BA-DISP-014':{comparablePreviousRecordId:'p1',previousValue:101,delta:3,previousDirection:'UP'}},
      conditionDifferences:[],
    },
    interpretation:{meaning:{
      primaryCode,
      secondaryCodes:[],
      focusRegionIds:['BA-DISP-014'],
      availableModes:['visual'],
      factsUsed:[{type:'REGION_PREVIOUS_DIFFERENCE',regionId:'BA-DISP-014',previousValue:101,currentValue:104,delta:3,direction:'UP'}],
      boundaryCodes:[],
    }},
    safety:{route:'normal'},
    actions:withHistory?[{actionId:'history',labelToken:'HISTORY',destination:'history',parameters:{recordId:'r1',view:'trends',metric:'region'},enabled:true}]:[],
  };
}

function choiceCount(html){return (html.match(/class="interpretation-dialogue-choice"/g)||[]).length;}

await test('STAGE8D-CURRENT-SHIFT-SHOWS-THREE-PART-CONTINUATION',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/data-continuation="current-shift"/);
  assert.match(html,/今回理解したこと/);
  assert.match(html,/まだ分からないこと/);
  assert.match(html,/次に確認すること/);
  assert.match(html,/次の比較可能な記録で、股関節部の今回との差と基準100との位置をもう一度確認できます/);
});

await test('STAGE8D-CURRENT-SHIFT-BRIDGES-DIRECTLY-TO-EXISTING-HISTORY',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  const follow=html.match(/<section class="interpretation-dialogue-followup"[^>]*>[\s\S]*?<\/section>/)?.[0] || '';
  assert.ok(follow);
  assert.equal(choiceCount(follow),2);
  assert.match(follow,/なぜこの読み方なのか確認/);
  assert.match(follow,/過去の比較可能な記録を確認/);
  assert.match(follow,/#\/history/);
  assert.doesNotMatch(follow,/topic=manage/);
});

await test('STAGE8D-HISTORY-UNAVAILABLE-FALLS-BACK-TO-MANAGEMENT-NARROWING',()=>{
  const html=renderInterpretationRoom({output:output(false),view:'explain',mode:'visual',origin:'result'});
  const follow=html.match(/<section class="interpretation-dialogue-followup"[^>]*>[\s\S]*?<\/section>/)?.[0] || '';
  assert.equal(choiceCount(follow),2);
  assert.match(follow,/topic=manage/);
  assert.doesNotMatch(follow,/#\/history/);
});

await test('STAGE8D-FIRST-BATCH-DOES-NOT-APPLY-CONTINUATION-TO-OTHER-MEANINGS',()=>{
  const out=output(true,'CURRENT_REFERENCE_PATTERN');
  out.comparison.regionalById['BA-DISP-014']={comparablePreviousRecordId:null,previousValue:null,delta:null};
  const html=renderInterpretationRoom({output:out,view:'explain',mode:'visual',origin:'result'});
  assert.doesNotMatch(html,/data-continuation="current-shift"/);
});

await test('STAGE8D-CONTINUATION-IS-OBSERVATIONAL-NOT-PRESCRIPTIVE',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.doesNotMatch(html,/走るべき|休むべき|距離を減らす|距離を増やす|安全です|危険です/);
});

await test('STAGE8D-REVEAL-ORDER-AND-REDUCED-MOTION',async()=>{
  const css=await source('styles/interpretation-room.css');
  const block=css.slice(css.indexOf('/* Stage 8D: current-shift self-management continuation. */'));
  assert.match(block,/160ms ease-out 540ms 1 both/);
  assert.match(block,/animation-delay: 660ms/);
  assert.match(block,/html\.ui-motion-reduced[\s\S]*animation: none[\s\S]*opacity: 1[\s\S]*transform: none/);
  assert.match(block,/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Stage 8D Current Shift Continuation',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

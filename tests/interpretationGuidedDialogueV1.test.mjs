import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderInterpretationRoom } from '../ui/interpretationRoomPresentation.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

function output(overrides={}){
  const base={
    targetRecordId:'r1',
    context:{recordDate:'2026-09-20',origin:'result',selectedRegionId:'',activityType:'run'},
    availability:{regional:true,previousRegional:true,regionalHistory:true,rofPair:true,conditionComparison:true,persistedEvidence:true},
    current:{facts:{nextCheckPoint:'次回は同程度の条件で確認'},regions:[{regionId:'R1',label:'下腿後面',value:104,referenceDirection:'ABOVE_REFERENCE'}],rof:{pre:4,post:6,delta:2,direction:'UP'}},
    comparison:{regionalById:{R1:{comparablePreviousRecordId:'p1',previousValue:101,delta:3,previousDirection:'UP'}},conditionDifferences:[{labelToken:'PACE'}]},
    interpretation:{meaning:{primaryCode:'CONDITION_AND_RESULT_CHANGED',secondaryCodes:['MULTI_LAYER_CHANGE'],focusRegionIds:['R1'],availableModes:['simple','visual','difference','evidence'],factsUsed:[{type:'REGION_PREVIOUS_DIFFERENCE',regionId:'R1',label:'下腿後面',previousValue:101,currentValue:104,delta:3,direction:'UP'},{type:'ROF_PRE_POST',pre:4,post:6,delta:2,direction:'UP'},{type:'CONDITION_DIFFERENCES',labels:['PACE']}],boundaryCodes:['NO_CAUSAL_INFERENCE']},summaryCodes:[],summaryTokens:[],selectedRegionIds:['R1'],limitationCodes:[]},
    evidence:{regions:{R1:{sources:[{label:'Example',role:'baseline'}],evidenceState:'DIRECT',construct:'construct'}},completeness:{completePerContributionTrace:false}},
    safety:{route:'normal',reasons:[],blocks:[],nextActions:[]},
    actions:[
      {actionId:'history',labelToken:'HISTORY',destination:'history',parameters:{recordId:'r1',view:'trends',metric:'region'},enabled:true},
      {actionId:'simulation',labelToken:'SIMULATION',destination:'simulation',parameters:{recordId:'r1',origin:'interpretation-room'},enabled:true},
      {actionId:'plan',labelToken:'PLAN',destination:'plan',parameters:{sourceRecordId:'r1',from:'interpretation-room'},enabled:true},
      {actionId:'share',labelToken:'CONSULTATION',destination:'consultation',parameters:{recordId:'r1',origin:'interpretation-room'},enabled:true},
      {actionId:'reading',labelToken:'READING',destination:'reading',parameters:{recordId:'r1',origin:'interpretation-room'},enabled:true},
    ],
  };
  return Object.assign(base,overrides);
}
function countChoices(html){return (html.match(/class="interpretation-dialogue-choice"/g)||[]).length;}

await test('ENTRY-SHOWS-ONE-MEANING-AND-TWO-INTENTS',()=>{
  const html=renderInterpretationRoom({output:output(),view:'summary',origin:'result'});
  assert.match(html,/今回の確認/);
  assert.equal(countChoices(html),2);
  assert.match(html,/この結果を理解したい/);
  assert.match(html,/次にどう活かすか考えたい/);
});

await test('ENTRY-DOES-NOT-EXPOSE-DETAIL-OR-DOWNSTREAM-FUNCTIONS',()=>{
  const html=renderInterpretationRoom({output:output(),view:'summary',origin:'result'});
  assert.doesNotMatch(html,/簡単に見る|図で見る|違いだけ見る|根拠を見る/);
  assert.doesNotMatch(html,/過去にも同じことがあるか確認|条件を変えて比べる|次の予定に反映|共有する内容|関連する背景/);
  assert.doesNotMatch(html,/<table/);
});

await test('UNDERSTAND-STEP-SHOWS-AT-MOST-THREE-REPRESENTATIONS',()=>{
  const html=renderInterpretationRoom({output:output(),view:'dialogue',topic:'understand',origin:'result'});
  assert.equal(countChoices(html),3);
  assert.match(html,/何が違うか確認/);
  assert.match(html,/図で確認/);
  assert.match(html,/もっと簡単に/);
  assert.doesNotMatch(html,/#\/history|#\/simulation|#\/plan|#\/consultation|#\/reading/);
});

await test('UNDERSTAND-STEP-OMITS-UNAVAILABLE-MODES',()=>{
  const out=output();
  out.interpretation.meaning.availableModes=['simple','evidence'];
  const html=renderInterpretationRoom({output:out,view:'dialogue',topic:'understand',origin:'result'});
  assert.equal(countChoices(html),1);
  assert.match(html,/もっと簡単に/);
  assert.doesNotMatch(html,/図で確認|何が違うか確認/);
});

await test('EXPLANATION-OFFERS-EVIDENCE-AND-MANAGEMENT-AFTER-EXPLANATION',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'simple',origin:'result'});
  assert.match(html,/なぜこの読み方なのか確認/);
  assert.match(html,/次にどう活かすか考える/);
  assert.match(html,/view=evidence/);
  assert.match(html,/topic=manage/);
});

await test('MANAGE-STEP-BRIDGES-WITHOUT-RECREATING-FUNCTIONS',()=>{
  const html=renderInterpretationRoom({output:output(),view:'dialogue',topic:'manage',origin:'result'});
  assert.equal(countChoices(html),3);
  assert.match(html,/過去にも同じことがあるか確認/);
  assert.match(html,/条件を変えて比べる/);
  assert.match(html,/次回に活かす/);
  assert.match(html,/#\/history/);
  assert.match(html,/#\/simulation/);
  assert.doesNotMatch(html,/#\/plan|#\/consultation|#\/reading/);
  assert.doesNotMatch(html,/保存した予定|共有資料|関連する研究背景/);
});

await test('BRIDGE-STEPS-DO-NOT-REPEAT-UNRELATED-INTERPRETATION-BOUNDARY',()=>{
  const manage=renderInterpretationRoom({output:output(),view:'dialogue',topic:'manage',origin:'result'});
  const nextUse=renderInterpretationRoom({output:output(),view:'dialogue',topic:'next-use',origin:'result'});
  assert.doesNotMatch(manage,/原因として結び付けません/);
  assert.doesNotMatch(nextUse,/原因として結び付けません/);
});

await test('MANAGE-STEP-ADAPTS-WHEN-HISTORY-AND-SIMULATION-ARE-UNAVAILABLE',()=>{
  const out=output();
  out.actions=out.actions.filter((a)=>!['history','simulation'].includes(a.actionId));
  const html=renderInterpretationRoom({output:out,view:'dialogue',topic:'manage',origin:'result'});
  assert.equal(countChoices(html),1);
  assert.match(html,/次回に活かす/);
});

await test('NEXT-USE-STEP-SEPARATES-PLAN-SHARE-AND-READING',()=>{
  const html=renderInterpretationRoom({output:output(),view:'dialogue',topic:'next-use',origin:'result'});
  assert.equal(countChoices(html),3);
  assert.match(html,/次の予定に反映/);
  assert.match(html,/誰かに共有する内容を整理/);
  assert.match(html,/関連する背景を確認/);
  assert.match(html,/#\/plan/);
  assert.match(html,/#\/consultation/);
  assert.match(html,/#\/reading/);
  assert.doesNotMatch(html,/#\/history|#\/simulation/);
});

await test('NEXT-CHECK-IS-DEFERRED-UNTIL-NEXT-USE',()=>{
  const entry=renderInterpretationRoom({output:output(),view:'summary',origin:'result'});
  const manage=renderInterpretationRoom({output:output(),view:'dialogue',topic:'manage',origin:'result'});
  const nextUse=renderInterpretationRoom({output:output(),view:'dialogue',topic:'next-use',origin:'result'});
  assert.doesNotMatch(entry,/次回は同程度の条件で確認/);
  assert.doesNotMatch(manage,/次回は同程度の条件で確認/);
  assert.match(nextUse,/前回から引き継いだ内容/);
  assert.match(nextUse,/次回は同程度の条件で確認/);
});

await test('LEGACY-NEXT-ROUTE-NOW-USES-NARROW-MANAGE-DIALOGUE',()=>{
  const html=renderInterpretationRoom({output:output(),view:'next',origin:'result'});
  assert.ok(countChoices(html)<=3);
  assert.match(html,/次にどう活かすか/);
  assert.doesNotMatch(html,/関連する読みものを確認.*共有する内容を整理/s);
});

await test('SUPPORT-PRECEDENCE-SUPPRESSES-ORDINARY-INTENT-DIALOGUE',()=>{
  const out=output();
  out.safety={route:'urgent',reasons:['x'],blocks:['normal_plan_suggestions'],nextActions:['y']};
  out.actions=[
    {actionId:'official-help',labelToken:'OFFICIAL_HELP',destination:'support-guidance',parameters:{},enabled:true},
    {actionId:'share',labelToken:'CONSULTATION',destination:'consultation',parameters:{recordId:'r1'},enabled:true},
    {actionId:'review-input',labelToken:'REVIEW_INPUT',destination:'record-input',parameters:{recordId:'r1'},enabled:true},
  ];
  const html=renderInterpretationRoom({output:out,view:'summary',origin:'result'});
  assert.match(html,/公的サポートを確認/);
  assert.doesNotMatch(html,/この結果を理解したい|次にどう活かすか考えたい/);
});

await test('GUIDED-DIALOGUE-IS-DETERMINISTIC-NOT-FREE-TEXT-CHAT',()=>{
  const presentation=read('ui/interpretationRoomPresentation.js');
  const screen=read('screens/interpretationRoomScreen.js');
  assert.doesNotMatch(presentation,/<textarea|contenteditable|chat-input|typing-indicator|assistant-avatar/i);
  assert.match(screen,/ALLOWED_TOPICS/);
  assert.match(screen,/safeParameter\(parameters, "topic", ALLOWED_TOPICS, "understand"\)/);
});

await test('DIALOGUE-CSS-KEEPS-SEQUENTIAL-CHOICES-SEPARATE-FROM-LEGACY-MENUS',()=>{
  const css=read('styles/interpretation-room.css');
  assert.match(css,/\.interpretation-dialogue-thread/);
  assert.match(css,/\.interpretation-dialogue-choice-list/);
  assert.match(css,/\.interpretation-dialogue-choice/);
});

const failed=results.filter((x)=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Guided Dialogue V1',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

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

function baseOutput(primaryCode='CONDITION_AND_RESULT_CHANGED'){
  return {
    targetRecordId:'r1',
    context:{recordDate:'2026-09-20',origin:'result',selectedRegionId:'',activityType:'run'},
    availability:{regional:true,previousRegional:true,regionalHistory:true,rofPair:true,conditionComparison:true,persistedEvidence:true},
    current:{
      facts:{distanceKm:5,durationMinutes:30,nextCheckPoint:''},
      regions:[
        {regionId:'BA-DISP-014',label:'股関節部',value:104,referenceDirection:'ABOVE_REFERENCE'},
        {regionId:'BA-DISP-015',label:'殿部',value:160,referenceDirection:'ABOVE_REFERENCE'},
      ],
      rof:{pre:4,post:6,delta:2,direction:'UP',directionLabel:'上昇',recentReferences:{}},
    },
    comparison:{
      regionalById:{
        'BA-DISP-014':{comparablePreviousRecordId:'p1',comparablePreviousDate:'2026-09-19',previousValue:101,delta:3,previousDirection:'UP',historyComparableCount:4,historyReferenceDirectionCounts:{above:3,near:1,below:0}},
        'BA-DISP-015':{comparablePreviousRecordId:'p1',comparablePreviousDate:'2026-09-19',previousValue:100,delta:60,previousDirection:'UP',historyComparableCount:4,historyReferenceDirectionCounts:{above:0,near:4,below:0}},
      },
      conditionDifferences:[{id:'grade',labelToken:'GRADE'}],
    },
    interpretation:{
      meaning:{
        primaryCode,
        secondaryCodes:['MULTI_LAYER_CHANGE','CURRENT_SHIFT_WITH_HISTORY'],
        focusRegionIds:['BA-DISP-014'],
        availableModes:['simple','visual','difference','evidence'],
        factsUsed:[
          {type:'REGION_CURRENT_REFERENCE',regionId:'BA-DISP-014',label:'股関節部',value:104,referenceDirection:'ABOVE_REFERENCE'},
          {type:'REGION_PREVIOUS_DIFFERENCE',regionId:'BA-DISP-014',label:'股関節部',currentValue:104,previousValue:101,delta:3,direction:'UP',previousRecordId:'p1',previousDate:'2026-09-19'},
          {type:'ROF_PRE_POST',pre:4,post:6,delta:2,direction:'UP'},
          {type:'CONDITION_DIFFERENCES',count:1,labels:['GRADE'],previousRecordId:'p1',previousDate:'2026-09-19'},
        ],
        boundaryCodes:['NO_DIAGNOSIS','NO_CAUSAL_INFERENCE','ROF_SEPARATE_SUBJECTIVE_LAYER'],
      },
      summaryCodes:['NON_CAUSAL_BOUNDARY_REQUIRED'],
      summaryTokens:[],selectedRegionIds:['BA-DISP-014'],limitationCodes:['NO_CAUSAL_INFERENCE'],
    },
    evidence:{regions:{'BA-DISP-014':{sources:[{label:'Example Source',role:'baseline'}],evidenceState:'DIRECT',construct:'construct',projectCompositeFlag:false}},completeness:{completePerContributionTrace:false}},
    safety:{route:'normal',reasons:[],blocks:[],nextActions:[]},
    actions:[
      {actionId:'history',labelToken:'HISTORY',destination:'history',parameters:{recordId:'r1'},enabled:true},
      {actionId:'simulation',labelToken:'SIMULATION',destination:'simulation',parameters:{recordId:'r1'},enabled:true},
      {actionId:'plan',labelToken:'PLAN',destination:'plan',parameters:{sourceRecordId:'r1'},enabled:true},
      {actionId:'reading',labelToken:'READING',destination:'reading',parameters:{recordId:'r1'},enabled:true},
      {actionId:'share',labelToken:'CONSULTATION',destination:'consultation',parameters:{recordId:'r1'},enabled:true},
    ],
  };
}

await test('SUMMARY-ANSWERS-WHAT-TO-UNDERSTAND-FIRST',()=>{
  const html=renderInterpretationRoom({output:baseOutput(),view:'summary',origin:'result'});
  assert.match(html,/今回の読み方/);
  assert.match(html,/股関節部の表示と坂の条件の両方が変わっています/);
  assert.match(html,/どの条件が結果の違いに関係したかは分けられません/);
  assert.doesNotMatch(html,/今回の12部位では/);
  assert.doesNotMatch(html,/基準より上が\d+部位/);
});

await test('REPEATED-OBSERVATION-USES-COUNTS-NOT-TRAIT-LANGUAGE',()=>{
  const out=baseOutput('REPEATED_OBSERVATION');
  out.interpretation.meaning.factsUsed.splice(2,0,{type:'REGION_REPEATED_DIRECTION',regionId:'BA-DISP-014',currentDirection:'ABOVE_REFERENCE',pastMatchingCount:3,pastComparableCount:4});
  const html=renderInterpretationRoom({output:out,view:'summary'});
  assert.match(html,/過去4件のうち3件/);
  assert.match(html,/今回だけの表示ではなく/);
  assert.doesNotMatch(html,/あなたは[^。]*(?:傾向|体質)|負担がかかりやすい/);
});

await test('MULTI-LAYER-MEANING-KEEPS-SUBJECTIVE-AND-REGIONAL-SEPARATE',()=>{
  const out=baseOutput('MULTI_LAYER_CHANGE');
  out.comparison.conditionDifferences=[];
  const html=renderInterpretationRoom({output:out,view:'summary'});
  assert.match(html,/2つを別の情報として確認する記録/);
  assert.match(html,/原因として扱いません/);
});

await test('SIMPLE-MODE-CHANGES-REPRESENTATION-TO-THREE-BLOCKS',()=>{
  const html=renderInterpretationRoom({output:baseOutput(),view:'explain',mode:'simple'});
  for(const text of ['今回わかること','前回と違うこと','ここからは判断できないこと']) assert.match(html,new RegExp(text));
  assert.doesNotMatch(html,/<table/);
});

await test('VISUAL-MODE-SHOWS-ONLY-ONE-REGIONAL-COMPARISON-LINE',()=>{
  const html=renderInterpretationRoom({output:baseOutput(),view:'explain',mode:'visual'});
  assert.match(html,/図で見る/);
  assert.match(html,/股関節部/);
  assert.match(html,/>前回</);
  assert.match(html,/>基準</);
  assert.match(html,/>今回</);
  assert.doesNotMatch(html,/殿部/);
  assert.match(html,/別の部位との大小比較には使いません/);
});

await test('VISUAL-MODE-KEEPS-ROF-ON-SEPARATE-SCALE',()=>{
  const html=renderInterpretationRoom({output:baseOutput(),view:'explain',mode:'visual'});
  assert.match(html,/主観的な疲労感 0–10/);
  assert.match(html,/部位別の基準100とは別の尺度です/);
});

await test('DIFFERENCE-MODE-SEPARATES-THREE-INFORMATION-LAYERS',()=>{
  const html=renderInterpretationRoom({output:baseOutput(),view:'explain',mode:'difference'});
  assert.match(html,/部位別結果/);
  assert.match(html,/主観情報/);
  assert.match(html,/走行事実/);
  assert.match(html,/原因として結び付けません/);
});

await test('SUMMARY-OFFERS-FOUR-REPRESENTATION-CHANGES',()=>{
  const html=renderInterpretationRoom({output:baseOutput(),view:'summary'});
  const count=(html.match(/class="interpretation-view-choice"/g)||[]).length;
  assert.equal(count,4);
  for(const text of ['簡単に見る','図で見る','違いだけ見る','根拠を見る']) assert.match(html,new RegExp(text));
});

await test('SUPPORT-PRIORITY-HIDES-ORDINARY-EXPLANATION-MODES',()=>{
  const out=baseOutput('SUPPORT_PRIORITY');
  out.safety={route:'urgent',reasons:['x'],blocks:['normal_plan_suggestions'],nextActions:['y']};
  out.actions=[
    {actionId:'official-help',labelToken:'OFFICIAL_HELP',destination:'support-guidance',parameters:{},enabled:true},
    {actionId:'share',labelToken:'CONSULTATION',destination:'consultation',parameters:{recordId:'r1'},enabled:true},
    {actionId:'review-input',labelToken:'REVIEW_INPUT',destination:'record-input',parameters:{recordId:'r1'},enabled:true},
  ];
  const html=renderInterpretationRoom({output:out,view:'summary'});
  assert.match(html,/公的サポートを確認/);
  assert.doesNotMatch(html,/別の見方で確認/);
});

await test('SCREEN-ALLOWS-EXPLAIN-VIEW-AND-MODE-ONLY',()=>{
  const screen=read('screens/interpretationRoomScreen.js');
  assert.match(screen,/"explain"/);
  assert.match(screen,/"simple", "visual", "difference"/);
  assert.match(screen,/safeParameter\(parameters, "mode", ALLOWED_MODES, "simple"\)/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Experience V2',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

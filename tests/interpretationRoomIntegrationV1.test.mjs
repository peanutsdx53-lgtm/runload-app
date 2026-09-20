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
    current:{
      facts:{distanceKm:5,durationMinutes:30,nextCheckPoint:'坂の少ない条件で確認'},
      regions:[
        {regionId:'BA-DISP-014',label:'股関節部',value:104,referenceDirection:'ABOVE_REFERENCE'},
        {regionId:'BA-DISP-015',label:'殿部',value:100,referenceDirection:'REFERENCE_VICINITY'},
      ],
      rof:{pre:4,post:6,delta:2,direction:'UP',directionLabel:'上昇',recentReferences:{}},
    },
    comparison:{
      regionalById:{
        'BA-DISP-014':{comparablePreviousRecordId:'p1',previousValue:101,delta:3,previousDirection:'UP',historyComparableCount:3,historyReferenceDirectionCounts:{above:2,near:1,below:0}},
        'BA-DISP-015':{comparablePreviousRecordId:'p1',previousValue:100,delta:0,previousDirection:'LESS_THAN_ONE_POINT',historyComparableCount:3,historyReferenceDirectionCounts:{above:0,near:3,below:0}},
      },
      conditionDifferences:[{id:'grade',labelToken:'GRADE'}],
    },
    interpretation:{
      summaryCodes:['REGIONAL_AVAILABLE','PREVIOUS_REGIONAL_AVAILABLE','REGIONAL_HISTORY_AVAILABLE','ROF_PAIR_AVAILABLE','CONDITION_DIFFERENCES_AVAILABLE','NON_CAUSAL_BOUNDARY_REQUIRED'],
      summaryTokens:[
        {token:'REGIONAL_COUNTS',values:{available:2,unavailable:0,above:1,near:1,below:0}},
        {token:'PREVIOUS_REGIONAL_DIFFERENCE_COUNT',values:{count:1}},
        {token:'CONDITION_DIFFERENCE_COUNT',values:{count:1}},
        {token:'ROF_PAIR',values:{pre:4,post:6,delta:2,direction:'UP'}},
      ],
      selectedRegionIds:['BA-DISP-014'],
      limitationCodes:['NO_DIAGNOSIS','NO_CAUSAL_INFERENCE','NO_COMPLETE_BIBLIOGRAPHY_CLAIM'],
    },
    evidence:{
      completeness:{completePerContributionTrace:false,wordingCode:'DO_NOT_CLAIM_FULL_BIBLIOGRAPHY'},
      regions:{
        'BA-DISP-014':{sources:[{sourceId:'S1',label:'Example Source',role:'baseline'}],evidenceState:'DIRECT',construct:'technical construct',projectCompositeFlag:false},
        'BA-DISP-015':{sources:[],evidenceState:'DIRECT',construct:'another construct',projectCompositeFlag:false},
      },
    },
    safety:{route:'normal',reasons:[],blocks:[],nextActions:[]},
    actions:[
      {actionId:'history',labelToken:'HISTORY',destination:'history',parameters:{recordId:'r1',view:'trends',metric:'region'},enabled:true},
      {actionId:'simulation',labelToken:'SIMULATION',destination:'simulation',parameters:{recordId:'r1',origin:'interpretation-room'},enabled:true},
      {actionId:'plan',labelToken:'PLAN',destination:'plan',parameters:{sourceRecordId:'r1',from:'interpretation-room'},enabled:true},
      {actionId:'reading',labelToken:'READING',destination:'reading',parameters:{recordId:'r1',origin:'interpretation-room'},enabled:true},
      {actionId:'share',labelToken:'CONSULTATION',destination:'consultation',parameters:{recordId:'r1',origin:'interpretation-room'},enabled:true},
    ],
  };
  return Object.assign(base,overrides);
}

await test('SUMMARY-IS-INTERPRETATION-FIRST',()=>{
  const html=renderInterpretationRoom({output:output(),view:'summary',origin:'result'});
  assert.match(html,/RunLoad解釈/);
  assert.match(html,/今回の12部位では/);
  assert.ok(html.indexOf('今回の12部位では')<html.indexOf('確認する内容を選択してください。'));
});

await test('SUMMARY-HAS-AT-MOST-FOUR-FIRST-LEVEL-CHOICES',()=>{
  const html=renderInterpretationRoom({output:output(),view:'summary',origin:'result'});
  const count=(html.match(/class="interpretation-choice"/g)||[]).length;
  assert.equal(count,4);
});

await test('SUMMARY-USES-FORMAL-CHOICE-COPY',()=>{
  const html=renderInterpretationRoom({output:output(),view:'summary',origin:'result'});
  for(const text of ['今回の結果を詳しく確認','過去記録との違いを確認','条件を変えた場合を確認','相談・読みものへ進む']) assert.match(html,new RegExp(text));
  assert.doesNotMatch(html,/どうしますか|気になりますね|おすすめです/);
});

await test('SUMMARY-KEEPS-NONCAUSAL-BOUNDARY',()=>{
  const html=renderInterpretationRoom({output:output(),view:'summary',origin:'result'});
  assert.match(html,/因果関係はこの結果から判断しません/);
});

await test('DETAIL-SEPARATES-REGIONAL-AND-ROF',()=>{
  const html=renderInterpretationRoom({output:output(),view:'detail',intent:'current',origin:'result'});
  assert.match(html,/>12部位</);
  assert.match(html,/>疲労感</);
  assert.match(html,/主観情報/);
});

await test('HISTORY-DETAIL-STATES-COMPARISON-BOUNDARY',()=>{
  const html=renderInterpretationRoom({output:output(),view:'detail',intent:'history',origin:'history'});
  assert.match(html,/同じ部位・同じ計算方法・同じ基準/);
});

await test('EVIDENCE-USES-APPROVED-HEADING',()=>{
  const html=renderInterpretationRoom({output:output(),view:'evidence',intent:'current',origin:'result'});
  assert.match(html,/この数値の基礎となる資料/);
  assert.doesNotMatch(html,/今回の計算に使用した全文献/);
});

await test('EVIDENCE-DISCLOSES-INCOMPLETE-TRACE',()=>{
  const html=renderInterpretationRoom({output:output(),view:'evidence',intent:'current',origin:'result'});
  assert.match(html,/全文献を完全列挙する表示ではありません/);
});

await test('NEXT-CONDITION-BRIDGES-TO-SIMULATION',()=>{
  const html=renderInterpretationRoom({output:output(),view:'next',intent:'condition',origin:'result'});
  assert.match(html,/#\/simulation\?/);
  assert.match(html,/from=interpretation-room/);
});

await test('NEXT-SUPPORT-BRIDGES-TO-SHARE-AND-READING',()=>{
  const html=renderInterpretationRoom({output:output(),view:'next',intent:'support',origin:'result'});
  assert.match(html,/#\/consultation\?/);
  assert.match(html,/#\/reading\?/);
});

await test('NEXT-SHOWS-EXISTING-NEXT-CHECK',()=>{
  const html=renderInterpretationRoom({output:output(),view:'next',intent:'current',origin:'result'});
  assert.match(html,/記録した「次回確認したいこと」/);
  assert.match(html,/坂の少ない条件で確認/);
});

await test('URGENT-ROUTE-REPLACES-NORMAL-FIRST-LEVEL-CHOICES',()=>{
  const urgent=output({
    safety:{route:'urgent',reasons:['x'],blocks:['normal_plan_suggestions'],nextActions:['y']},
    actions:[
      {actionId:'official-help',labelToken:'OFFICIAL_HELP',destination:'support-guidance',parameters:{returnTo:'#/interpretation-room?recordId=r1'},enabled:true},
      {actionId:'share',labelToken:'CONSULTATION',destination:'consultation',parameters:{recordId:'r1'},enabled:true},
      {actionId:'review-input',labelToken:'REVIEW_INPUT',destination:'record-input',parameters:{recordId:'r1'},enabled:true},
    ],
  });
  const html=renderInterpretationRoom({output:urgent,view:'summary',origin:'result'});
  assert.match(html,/公的サポートを確認/);
  assert.doesNotMatch(html,/条件を変えた場合を確認/);
});

await test('NO-TARGET-HAS-EMPTY-STATE',()=>{
  const html=renderInterpretationRoom({output:{targetRecordId:''},view:'summary'});
  assert.match(html,/対象の保存記録がありません/);
});

await test('APP-ROUTE-IS-REGISTERED',()=>{
  const app=read('app.js');
  assert.match(app,/renderInterpretationRoomScreen/);
  assert.match(app,/"interpretation-room": renderInterpretationRoomScreen/);
});

await test('IMMERSIVE-SHELL-HIDES-PRIMARY-NAV-BY-BRANCH',()=>{
  const shell=read('ui/appShell.js');
  assert.match(shell,/currentScreen === "interpretation-room"/);
  assert.match(shell,/app-shell app-shell--immersive/);
  const match=shell.match(/if \(immersive\) \{([\s\S]*?)\n  \}\n  return `/);
  assert.ok(match);
  const immersiveBlock=match[1];
  assert.doesNotMatch(immersiveBlock,/primary-navigation/);
  assert.doesNotMatch(immersiveBlock,/renderFeatureMenu/);
});

await test('CONTEXT-NAVIGATION-IS-ALLOWLISTED',()=>{
  const architecture=read('ui/screenArchitecture.js');
  assert.match(architecture,/screen === "interpretation-room"/);
  for(const origin of ['history','body-part-detail','simulation','home']) assert.match(architecture,new RegExp(`origin === "${origin}"`));
});

await test('STYLESHEET-IS-DECLARED',()=>{
  const index=read('index.html');
  assert.match(index,/styles\/interpretation-room\.css/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Room Integration V1',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

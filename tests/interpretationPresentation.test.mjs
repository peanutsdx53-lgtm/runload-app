import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderInterpretationRoom } from '../ui/interpretationRoomPresentation.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

function actions(){
  return [
    {actionId:'simulation',destination:'simulation',parameters:{recordId:'r1'},enabled:true},
    {actionId:'plan',destination:'plan',parameters:{sourceRecordId:'r1'},enabled:true},
    {actionId:'reading',destination:'reading',parameters:{recordId:'r1'},enabled:true},
    {actionId:'share',destination:'consultation',parameters:{recordId:'r1'},enabled:true},
  ];
}

function exactPath(){
  return {
    resolutionStatus:'EXACT',
    activeRoute:'SPEED',
    exposure:{type:'WHOLE_RUN',distanceKm:6,durationMinutes:34,speedMps:2.941176,segmentCount:0},
    activeInputs:[
      {id:'DISTANCE',value:6,role:'DERIVE_SPEED'},
      {id:'DURATION',value:34,role:'DERIVE_SPEED'},
      {id:'SPEED',value:2.941176,role:'PRIMARY_NUMERIC_ROUTE'},
    ],
    conditionalInputs:[],
    contextOnlyInputs:[{id:'SURFACE',value:[{category:'ASPHALT',sharePercent:100}],role:'CONTEXT_ONLY'}],
    explanationTokens:[],
  };
}

function regionItem(reasonCode='PREVIOUS_CHANGE'){
  return {
    regionId:'BA-DISP-014',primaryRegionId:'R01',label:'股関節部',value:112.9,
    referenceDirection:'ABOVE_REFERENCE',previousAvailable:true,previousRecordId:'p1',previousDate:'2026-09-19',
    previousValue:93.9,previousDifference:19,previousDirection:'UP',historyComparableCount:3,pastMatchingDirectionCount:2,reasonCode,
  };
}

function baseOutput({selected=false}={}){
  const allActions=actions();
  const selectedRegion=selected?{
    regionId:'BA-DISP-014',primaryRegionId:'R01',label:'股関節部',value:112.9,
    referenceComparison:{available:true,reference:100,value:112.9,difference:12.9,direction:'ABOVE_REFERENCE'},
    previousComparison:{available:true,recordId:'p1',date:'2026-09-19',previousValue:93.9,currentValue:112.9,difference:19,direction:'UP'},
    personalHistory:{comparableCount:3,lastFive:[
      {recordId:'p0',date:'2026-09-10',value:98.2,referenceDirection:'BELOW_REFERENCE'},
      {recordId:'p1',date:'2026-09-19',value:93.9,referenceDirection:'BELOW_REFERENCE'},
    ],referenceDirectionCounts:{above:1,near:0,below:2,unavailable:0}},
    calculationPath:exactPath(),
  }:null;
  return {
    schemaVersion:'INTERPRETATION_OUTPUT_V4',
    target:{recordId:'r1',resultRecordId:'res1',date:'2026-09-23',activityType:'run',origin:'result',selectedRegionId:selected?'BA-DISP-014':''},
    state:{targetAvailable:true,regional:'AVAILABLE',history:'AVAILABLE',subjective:'PAIR',support:'NORMAL',legacy:false},
    overview:{
      regions:[],selectionMode:selected?'EXPLICIT':'REASON_GROUPS',guidanceTokens:[],
      attention:{
        counts:{total:12,available:12,unavailable:0,previousComparable:12,previousChanged:4,repeated:1,above:4,near:3,below:5,conditionDifferences:2},
        groups:[
          {code:'REPEATED_DIRECTION',regions:[regionItem('REPEATED_DIRECTION')]},
          {code:'PREVIOUS_CHANGE',regions:[{...regionItem('PREVIOUS_CHANGE'),regionId:'BA-DISP-015',label:'殿部',value:94.4,referenceDirection:'BELOW_REFERENCE',pastMatchingDirectionCount:0}]},
        ],
        noCrossRegionRanking:true,
      },
    },
    runFacts:{distanceKm:6,durationMinutes:34,paceSecondsPerKm:340},
    selectedRegion,
    subjectiveContext:{
      state:'PAIR',
      pre:{available:true,value:4,descriptorType:'EXACT',descriptor:'少し疲れている',lowerAnchor:null,upperAnchor:null},
      post:{available:true,value:8,descriptorType:'EXACT',descriptor:'とても疲れている',lowerAnchor:null,upperAnchor:null},
      difference:{eligible:true,value:4,direction:'UP'},
      recentReferences:{},boundaryTokens:[],
    },
    conditions:{
      previousRecordId:'p1',previousDate:'2026-09-19',
      differences:[
        {id:'distance',labelToken:'DISTANCE',previous:5,current:6,delta:1,relationship:selected?'USED_IN_CURRENT_ROUTE':'NO_REGION_SELECTED'},
        {id:'course',labelToken:'COURSE',previous:'A',current:'B',delta:null,relationship:selected?'RECORDED_CONTEXT':'NO_REGION_SELECTED'},
      ],
      boundaryCodes:['DESCRIPTIVE_ONLY','NO_CAUSAL_INFERENCE'],
    },
    understanding:{meaningCode:'CONDITION_AND_RESULT_CHANGED',secondaryCodes:[],facts:[],boundaryCodes:['NO_DIAGNOSIS','NO_INJURY_RISK','NO_CAUSAL_INFERENCE']},
    nextCheck:{code:selected?'KEEP_CONDITIONS_VISIBLE':'RECORD_NEXT_COMPARABLE_RUN',regionId:selected?'BA-DISP-014':'',conditionIds:['distance','course']},
    next:{selectionRequired:false,primaryAction:allActions[0],otherActions:allActions.slice(1)},
    advanced:{evidence:{regions:{'BA-DISP-014':{construct:'股関節の機械的仕事に基づく部位内Reference-100',sources:[{label:'Fukuchi et al. 2017',role:'速度応答'}]}}}},
    safety:{route:'normal',reasons:[],blocks:[],nextActions:[]},
  };
}

await test('OVERVIEW-LEADS-WITH-SYNTHESIS-NOT-INPUT-RECAP',()=>{
  const html=renderInterpretationRoom({output:baseOutput()});
  assert.match(html,/interpretation-room--dashboard/);
  assert.match(html,/今回の解釈/);
  assert.match(html,/前回から4部位に差があります/);
  assert.match(html,/走行条件が2項目変わり/);
  assert.match(html,/疲労感も4→8（\+4）/);
  assert.match(html,/「部位」「条件」「本人の感覚」を分けて残す/);
  assert.doesNotMatch(html,/今回のRunLoad解釈/);
  assert.doesNotMatch(html,/今回の結果を読む順序/);
  assert.doesNotMatch(html,/interpretation-room-map/);
});

await test('OVERVIEW-USES-COMPACT-SIGNALS-AND-ACTIONABLE-NEXT-COMPARISON',()=>{
  const html=renderInterpretationRoom({output:baseOutput()});
  assert.match(html,/継続して確認/);
  assert.match(html,/前回との差/);
  assert.match(html,/今回の背景/);
  assert.match(html,/条件 2・疲労 \+4/);
  assert.match(html,/次の比較を読みやすくするには/);
  assert.match(html,/比較したい条件を意識し/);
});

await test('REGION-PATTERNS-ARE-COMPACT-AND-NOT-RANKED',()=>{
  const html=renderInterpretationRoom({output:baseOutput()});
  assert.match(html,/継続して確認された部位/);
  assert.match(html,/同じ方向が続いている/);
  assert.match(html,/前回から変化している/);
  assert.ok((html.match(/region-chip__copy/g)||[]).length>=2);
  assert.match(html,/順位ではなく確認理由でまとめます/);
  assert.doesNotMatch(html,/変化が大きい部位.*上位/);
});

await test('OVERVIEW-CONTEXT-COMBINES-CONDITIONS-AND-SUBJECTIVE-WITHOUT-MAKING-THEM-THE-MAIN-RESULT',()=>{
  const html=renderInterpretationRoom({output:baseOutput()});
  assert.match(html,/比較の背景/);
  assert.match(html,/前回から変わった条件/);
  assert.match(html,/距離/);
  assert.match(html,/\+1 km/);
  assert.match(html,/本人の感覚/);
  assert.match(html,/4<em>\/10/);
  assert.match(html,/8<em>\/10/);
  assert.match(html,/同じ日の本人記録です/);
  assert.doesNotMatch(html,/RunLoadでの使い方/);
});

await test('OVERVIEW-NEXT-ACTIONS-ARE-COMPACT-RAIL',()=>{
  const html=renderInterpretationRoom({output:baseOutput()});
  assert.match(html,/interpretation-room-next-rail/);
  assert.match(html,/次に確かめる/);
  assert.match(html,/条件を変えて比較する/);
  assert.match(html,/次の記録条件を整理する/);
  assert.match(html,/関連する読みものを確認する/);
  assert.match(html,/共有用に整理する/);
  assert.doesNotMatch(html,/interpretation-room-action-grid/);
});

await test('ADVANCED-COPY-HIDES-INTERNAL-REFERENCE-LABEL',()=>{
  const out=baseOutput({selected:true});
  out.advanced.evidence.regions['BA-DISP-014'].construct='股関節の機械的仕事に基づく部位内Reference-100';
  const html=renderInterpretationRoom({output:out});
  assert.match(html,/股関節の機械的仕事に基づく部位内基準100/);
  assert.doesNotMatch(html,/Reference-100/);
});

await test('REGION-LINK-CARRIES-RECORD-AND-REGION',()=>{
  const html=renderInterpretationRoom({output:baseOutput()});
  assert.match(html,/#\/interpretation-room\?recordId=r1&amp;origin=result&amp;regionId=BA-DISP-014/);
});

await test('SELECTED-REGION-IS-A-DEDICATED-DETAIL-WORKSPACE',()=>{
  const html=renderInterpretationRoom({output:baseOutput({selected:true})});
  assert.match(html,/interpretation-room--selected-detail/);
  assert.match(html,/interpretation-room-selected-workspace/);
  assert.match(html,/interpretation-room-selected-main/);
  assert.match(html,/interpretation-room-selected-side/);
  assert.match(html,/interpretation-room-selected-advanced-stack/);
  assert.match(html,/<h1>股関節部<\/h1>/);
  assert.match(html,/12部位の整理へ戻る/);
  assert.match(html,/112\.9/);
  assert.match(html,/93\.9/);
  assert.match(html,/\+19/);
  assert.match(html,/interpretation-room-history-chart/);
  assert.match(html,/基準100/);
  assert.match(html,/interpretation-room-next-rail/);
  assert.doesNotMatch(html,/今回の解釈/);
  assert.doesNotMatch(html,/今回のRunLoad解釈/);
});

await test('SELECTED-REGION-KEEPS-CONDITION-RELATION-AND-SUBJECTIVE-CONTEXT',()=>{
  const html=renderInterpretationRoom({output:baseOutput({selected:true})});
  assert.match(html,/条件の違いを整理/);
  assert.match(html,/この部位の計算に使用/);
  assert.match(html,/関連情報として記録/);
  assert.match(html,/本人の記録との関係/);
  assert.match(html,/12部位の数値とは別に、同じ日の主観記録として確認します/);
});

await test('CALCULATION-AND-EVIDENCE-ARE-PROGRESSIVELY-DISCLOSED',()=>{
  const html=renderInterpretationRoom({output:baseOutput({selected:true})});
  assert.match(html,/<details class="interpretation-room-calculation">/);
  assert.match(html,/この部位の数値に使われた情報を確認/);
  assert.match(html,/数値計算に使用/);
  assert.match(html,/<details class="interpretation-room-advanced">/);
  assert.match(html,/計算の考え方と根拠を詳しく見る/);
});

await test('DERIVED-ACTIONS-PRESERVE-INTERPRETATION-CONTEXT',()=>{
  const html=renderInterpretationRoom({output:baseOutput({selected:true})});
  for(const destination of ['simulation','plan','consultation','reading']) {
    assert.match(html,new RegExp(`#\\/${destination}\\?`));
  }
  assert.ok((html.match(/from=interpretation-room/g)||[]).length>=4);
  assert.ok((html.match(/roomOrigin=result/g)||[]).length>=4);
  assert.doesNotMatch(html,/view=trends|metric=region/);
});

await test('NO-SUBJECTIVE-PAIR-DOES-NOT-INVENT-DIFFERENCE',()=>{
  const out=baseOutput();
  out.subjectiveContext={state:'NONE',pre:{available:false},post:{available:false},difference:{eligible:false},recentReferences:{},boundaryTokens:[]};
  const html=renderInterpretationRoom({output:out});
  assert.doesNotMatch(html,/本人の感覚/);
  assert.doesNotMatch(html,/疲労 \+/);
});

await test('SUPPORT-STATE-TAKES-PRECEDENCE',()=>{
  const out=baseOutput();
  out.state.support='URGENT';
  out.next={selectionRequired:false,primaryAction:{actionId:'official-help',destination:'support-guidance',parameters:{},enabled:true},otherActions:[]};
  const html=renderInterpretationRoom({output:out});
  assert.match(html,/先に確認することがあります/);
  assert.doesNotMatch(html,/interpretation-room--dashboard/);
});

await test('REST-STATE-DOES-NOT-FABRICATE-REGIONAL-RESULTS',()=>{
  const out=baseOutput();
  out.target.activityType='rest';
  out.state.regional='REST';
  const html=renderInterpretationRoom({output:out});
  assert.match(html,/今回は休養の記録です/);
  assert.doesNotMatch(html,/interpretation-room--dashboard/);
});

await test('EMPTY-STATE-HAS-DIRECT-RECORD-ACTION',()=>{
  const html=renderInterpretationRoom({output:{state:{targetAvailable:false}}});
  assert.match(html,/対象の保存記録がありません/);
  assert.match(html,/#\/record-input/);
});

await test('CSS-HAS-COMPACT-RESPONSIVE-INTERPRETATION',()=>{
  const shared=fs.readFileSync(path.join(root,'styles/interpretation-room.css'),'utf8');
  const desktop=fs.readFileSync(path.join(root,'styles/desktop.css'),'utf8');
  const mobile=fs.readFileSync(path.join(root,'styles/mobile.css'),'utf8');

  assert.match(shared,/\.interpretation-room-dashboard/);
  assert.match(shared,/\.interpretation-room-region-chips/);
  assert.match(shared,/\.interpretation-room-next-rail/);
  assert.match(shared,/\.interpretation-room-selected-workspace/);
  assert.match(shared,/grid-template-areas:[\s\S]*"detail"[\s\S]*"next"[\s\S]*"conditions"[\s\S]*"subjective"[\s\S]*"advanced"/);
  assert.match(shared,/\.interpretation-room-selected-main>\.interpretation-room-region-detail--selected[\s\S]*grid-area:detail/);

  assert.match(desktop,/\.interpretation-room-selected-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\) 22rem/);
  assert.match(desktop,/\.interpretation-room-selected-main,[\s\S]*\.interpretation-room-selected-side[\s\S]*display:grid/);
  assert.match(desktop,/\.interpretation-room-selected-main \.interpretation-room-condition-cards[\s\S]*repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(desktop,/#app>\.app-shell\.app-shell--immersive[\s\S]*width:100%\s*!important[\s\S]*border:0\s*!important/);
  assert.match(desktop,/grid-template-areas:[\s\S]*"insight next"[\s\S]*"patterns next"[\s\S]*"context next"/);
  assert.match(desktop,/\.interpretation-room-region-chips[\s\S]*repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(desktop,/position:sticky/);

  assert.match(mobile,/\.interpretation-room-next-rail>\.interpretation-room-action[\s\S]*min-height:56px/);
  assert.match(mobile,/\.interpretation-room-region-chips>a[\s\S]*min-height:58px/);
  assert.doesNotMatch(shared,/#[0-9a-fA-F]{3,8}\b/);
});

await test('PRESENTATION-DOES-NOT-USE-GOOD-BAD-OR-DIAGNOSTIC-REGION-LABELS',()=>{
  const presentation=fs.readFileSync(path.join(root,'ui/interpretationRoomPresentation.js'),'utf8');
  assert.doesNotMatch(presentation,/安全な部位|危険な部位|良い部位|悪い部位/);
  assert.doesNotMatch(presentation,/原因だったと判断します|けがです|診断/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Presentation',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

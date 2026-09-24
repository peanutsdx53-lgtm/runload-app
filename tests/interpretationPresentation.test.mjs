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
    schemaVersion:'RUNLOAD_INTERPRETATION_OUTPUT_V4',
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

await test('OVERVIEW-STARTS-WITH-RUNLOAD-INTERPRETATION-NOT-BODY-MAP',()=>{
  const html=renderInterpretationRoom({output:baseOutput()});
  assert.match(html,/今回の結果をRunLoadで整理/);
  assert.match(html,/今回のRunLoad解釈/);
  assert.doesNotMatch(html,/12部位から選ぶ/);
  assert.doesNotMatch(html,/interpretation-room-map/);
});

await test('SUMMARY-INTEGRATES-REGION-HISTORY-FATIGUE-AND-CONDITIONS',()=>{
  const html=renderInterpretationRoom({output:baseOutput()});
  assert.match(html,/interpretation-room-summary--v3/);
  assert.match(html,/前回から変化/);
  assert.match(html,/4<em>部位<\/em>/);
  assert.match(html,/同じ方向の継続/);
  assert.match(html,/本人記録の前後差/);
  assert.match(html,/\+4/);
  assert.match(html,/前回からの条件差/);
  assert.match(html,/2<em>項目<\/em>/);
  assert.match(html,/まず条件差と部位差を分けて確認します/);
});

await test('REGIONS-ARE-GROUPED-BY-REASON-NOT-RANKED',()=>{
  const html=renderInterpretationRoom({output:baseOutput()});
  assert.match(html,/注目する理由で見る/);
  assert.match(html,/同じ方向が続いている/);
  assert.match(html,/前回から変化している/);
  assert.match(html,/部位間の順位ではなく、確認する理由を示します/);
  assert.doesNotMatch(html,/変化が大きい部位.*上位/);
});

await test('OVERVIEW-HAS-INTERPRETATION-ENTRY-AND-PICTOGRAMS',()=>{
  const html=renderInterpretationRoom({output:baseOutput()});
  assert.match(html,/今回の結果を読む順序/);
  assert.match(html,/今回わかること/);
  assert.match(html,/注目する理由を確認/);
  assert.match(html,/本人の記録と分けて見る/);
  assert.ok((html.match(/class="interpretation-room-icon/g)||[]).length>=8);
});

await test('OVERVIEW-ENTRY-FALLS-BACK-TO-EXISTING-SECTIONS',()=>{
  const out=baseOutput();
  out.overview.attention.groups=[];
  out.overview.attention.counts.conditionDifferences=0;
  out.conditions.differences=[];
  out.subjectiveContext={state:'NONE',pre:{available:false},post:{available:false},difference:{eligible:false},recentReferences:{},boundaryTokens:[]};
  const html=renderInterpretationRoom({output:out});
  assert.doesNotMatch(html,/href="#interpretation-attention-title"/);
  assert.doesNotMatch(html,/href="#interpretation-conditions-title"/);
  assert.match(html,/href="#interpretation-next-title"/);
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

await test('SELECTED-REGION-SHOWS-CURRENT-PREVIOUS-AND-HISTORY-CHART',()=>{
  const html=renderInterpretationRoom({output:baseOutput({selected:true})});
  assert.match(html,/股関節部をRunLoadで整理/);
  assert.match(html,/112\.9/);
  assert.match(html,/93\.9/);
  assert.match(html,/\+19/);
  assert.match(html,/interpretation-room-history-chart/);
  assert.match(html,/基準100/);
});

await test('CONDITION-CARDS-SEPARATE-DESCRIPTION-FROM-CAUSAL-CLAIM',()=>{
  const html=renderInterpretationRoom({output:baseOutput({selected:true})});
  assert.match(html,/条件の違いを整理/);
  assert.match(html,/interpretation-room-condition-cards/);
  assert.match(html,/距離/);
  assert.match(html,/5 km/);
  assert.match(html,/6 km/);
  assert.match(html,/この部位の計算に使用/);
  assert.match(html,/複数回の比較で関係を確かめます/);
});

await test('OVERVIEW-CONDITION-CARDS-ASK-FOR-REGION-BEFORE-ROUTE-RELATION',()=>{
  const html=renderInterpretationRoom({output:baseOutput()});
  assert.match(html,/部位を選択すると、その条件が選択部位の計算でどのように扱われたかも確認できます/);
});

await test('SUBJECTIVE-FATIGUE-REMAINS-SEPARATE-LAYER',()=>{
  const html=renderInterpretationRoom({output:baseOutput()});
  assert.match(html,/本人の記録との関係/);
  assert.match(html,/RunLoadでの見方/);
  assert.match(html,/4<em>\/10/);
  assert.match(html,/8<em>\/10/);
  assert.match(html,/12部位の数値とは別に、同じ日の主観記録として確認します/);
});

await test('UNDERSTANDING-IS-COMPACT-AND-BOUNDARY-AWARE',()=>{
  const html=renderInterpretationRoom({output:baseOutput()});
  assert.match(html,/今回の読み方を整理/);
  assert.match(html,/今回確認できること/);
  assert.match(html,/次回以降で確かめること/);
  assert.match(html,/複数回の比較で関係を確かめます/);
});

await test('NEXT-CHECK-IS-A-SELF-UNDERSTANDING-SUGGESTION',()=>{
  const html=renderInterpretationRoom({output:baseOutput({selected:true})});
  assert.match(html,/次に確かめる/);
  assert.match(html,/次回も距離・時間・コース条件を残すと/);
  assert.match(html,/条件を変えて比較する/);
  assert.match(html,/interpretation-room-action-grid/);
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
  assert.doesNotMatch(html,/class="interpretation-room-fatigue"/);
});

await test('SUPPORT-STATE-TAKES-PRECEDENCE',()=>{
  const out=baseOutput();
  out.state.support='URGENT';
  out.next={selectionRequired:false,primaryAction:{actionId:'official-help',destination:'support-guidance',parameters:{},enabled:true},otherActions:[]};
  const html=renderInterpretationRoom({output:out});
  assert.match(html,/先に確認することがあります/);
  assert.doesNotMatch(html,/今回のRunLoad解釈/);
});

await test('REST-STATE-DOES-NOT-FABRICATE-REGIONAL-RESULTS',()=>{
  const out=baseOutput();
  out.target.activityType='rest';
  out.state.regional='REST';
  const html=renderInterpretationRoom({output:out});
  assert.match(html,/今回は休養の記録です/);
  assert.doesNotMatch(html,/今回のRunLoad解釈/);
});

await test('EMPTY-STATE-HAS-DIRECT-RECORD-ACTION',()=>{
  const html=renderInterpretationRoom({output:{state:{targetAvailable:false}}});
  assert.match(html,/対象の保存記録がありません/);
  assert.match(html,/#\/record-input/);
});

await test('CSS-HAS-READABLE-PC-SIZES-AND-RESPONSIVE-LAYOUT',()=>{
  const css=fs.readFileSync(path.join(root,'styles/interpretation-room.css'),'utf8');
  assert.match(css,/Interpretation Room V3 experience/);
  assert.match(css,/width:min\(100%,84rem\)/);
  assert.match(css,/font-size:clamp\(2\.45rem,4\.4vw,3\.65rem\)/);
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/\.interpretation-room-entry-grid/);
  assert.match(css,/\.interpretation-room-condition-cards/);
  assert.match(css,/\.interpretation-room-action-grid/);
  assert.match(css,/@media \(max-width:60rem\)/);
  assert.match(css,/@media \(max-width:34rem\)/);
  assert.doesNotMatch(css,/#[0-9a-fA-F]{3,8}\b/);
});

await test('PRESENTATION-DOES-NOT-USE-GOOD-BAD-OR-DIAGNOSTIC-REGION-LABELS',()=>{
  const presentation=fs.readFileSync(path.join(root,'ui/interpretationRoomPresentation.js'),'utf8');
  assert.doesNotMatch(presentation,/安全な部位|危険な部位|良い部位|悪い部位/);
  assert.doesNotMatch(presentation,/原因だったと判断します|けがです|診断/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Presentation',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

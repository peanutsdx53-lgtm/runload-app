import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderInterpretationRoom } from '../ui/interpretationRoomPresentation.js';
const renderMobile = (args) => renderInterpretationRoom({ ...args, compactLayout: true });

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

function actions(){return [
  {actionId:'simulation',destination:'simulation',parameters:{recordId:'r1'},enabled:true},
  {actionId:'plan',destination:'plan',parameters:{sourceRecordId:'r1'},enabled:true},
  {actionId:'reading',destination:'reading',parameters:{recordId:'r1'},enabled:true},
  {actionId:'share',destination:'consultation',parameters:{recordId:'r1'},enabled:true},
];}
function exactPath(){return {resolutionStatus:'EXACT',activeRoute:'SPEED',exposure:{type:'WHOLE_RUN',distanceKm:6,durationMinutes:34,speedMps:2.941176,segmentCount:0},activeInputs:[{id:'DISTANCE',value:6,role:'DERIVE_SPEED'},{id:'DURATION',value:34,role:'DERIVE_SPEED'},{id:'SPEED',value:2.941176,role:'PRIMARY_NUMERIC_ROUTE'}],conditionalInputs:[],contextOnlyInputs:[{id:'SURFACE',value:[{category:'ASPHALT',sharePercent:100}],role:'CONTEXT_ONLY'}],explanationTokens:[]};}
function regionItem(reasonCode='PREVIOUS_CHANGE'){return {regionId:'BA-DISP-014',primaryRegionId:'R01',label:'股関節部',value:112.9,referenceDirection:'ABOVE_REFERENCE',previousAvailable:true,previousRecordId:'p1',previousDate:'2026-09-19',previousValue:93.9,previousDifference:19,previousDirection:'UP',historyComparableCount:3,pastMatchingDirectionCount:2,reasonCode};}
function baseOutput({selected=false}={}){
  const allActions=actions();
  const selectedRegion=selected?{regionId:'BA-DISP-014',primaryRegionId:'R01',label:'股関節部',value:112.9,referenceComparison:{available:true,reference:100,value:112.9,difference:12.9,direction:'ABOVE_REFERENCE'},previousComparison:{available:true,recordId:'p1',date:'2026-09-19',previousValue:93.9,currentValue:112.9,difference:19,direction:'UP'},personalHistory:{comparableCount:3,lastFive:[{recordId:'p0',date:'2026-09-10',value:98.2,referenceDirection:'BELOW_REFERENCE'},{recordId:'p1',date:'2026-09-19',value:93.9,referenceDirection:'BELOW_REFERENCE'}],referenceDirectionCounts:{above:1,near:0,below:2,unavailable:0}},calculationPath:exactPath()}:null;
  return {schemaVersion:'INTERPRETATION_OUTPUT_V4',target:{recordId:'r1',resultRecordId:'res1',date:'2026-09-23',activityType:'run',origin:'result',selectedRegionId:selected?'BA-DISP-014':''},state:{targetAvailable:true,regional:'AVAILABLE',history:'AVAILABLE',subjective:'PAIR',support:'NORMAL',legacy:false},overview:{regions:[],selectionMode:selected?'EXPLICIT':'REASON_GROUPS',guidanceTokens:[],attention:{counts:{total:12,available:12,unavailable:0,previousComparable:12,previousChanged:4,repeated:1,above:4,near:3,below:5,conditionDifferences:2},groups:[{code:'REPEATED_DIRECTION',regions:[regionItem('REPEATED_DIRECTION')]},{code:'PREVIOUS_CHANGE',regions:[{...regionItem('PREVIOUS_CHANGE'),regionId:'BA-DISP-015',label:'殿部',value:94.4,referenceDirection:'BELOW_REFERENCE',pastMatchingDirectionCount:0}]}],noCrossRegionRanking:true}},runFacts:{distanceKm:6,durationMinutes:34,paceSecondsPerKm:340},selectedRegion,subjectiveContext:{state:'PAIR',pre:{available:true,value:4,descriptorType:'EXACT',descriptor:'少し疲れている'},post:{available:true,value:8,descriptorType:'EXACT',descriptor:'とても疲れている'},difference:{eligible:true,value:4,direction:'UP'},recentReferences:{},boundaryTokens:[]},conditions:{previousRecordId:'p1',previousDate:'2026-09-19',differences:[{id:'distance',labelToken:'DISTANCE',previous:5,current:6,delta:1,relationship:selected?'USED_IN_CURRENT_ROUTE':'NO_REGION_SELECTED'},{id:'course',labelToken:'COURSE',previous:'A',current:'B',delta:null,relationship:selected?'RECORDED_CONTEXT':'NO_REGION_SELECTED'}],boundaryCodes:['DESCRIPTIVE_ONLY','NO_CAUSAL_INFERENCE']},understanding:{meaningCode:'CONDITION_AND_RESULT_CHANGED',secondaryCodes:[],facts:[],boundaryCodes:['NO_DIAGNOSIS','NO_INJURY_RISK','NO_CAUSAL_INFERENCE']},nextCheck:{code:selected?'KEEP_CONDITIONS_VISIBLE':'RECORD_NEXT_COMPARABLE_RUN',regionId:selected?'BA-DISP-014':'',conditionIds:['distance','course']},next:{selectionRequired:false,primaryAction:allActions[0],otherActions:allActions.slice(1)},advanced:{evidence:{regions:{'BA-DISP-014':{construct:'股関節の機械的仕事に基づく部位内Reference-100',sources:[{label:'Fukuchi et al. 2017',role:'速度応答'}]}}}},safety:{route:'normal',reasons:[],blocks:[],nextActions:[]}};
}
function selfUnderstanding(){return {primaryCandidate:{kind:'BODY_OBSERVATION_PAIR',threadType:'REGION_OBSERVATION_PAIR',subject:{regionId:'BA-DISP-014',bodyAreaId:'BFR-200-COX'},observation:{label:'股関節部の外側',sensationType:'TIGHTNESS',intensity:2,noticedTiming:'DURING'},row:{regionId:'BA-DISP-014',regionName:'股関節部',value:112.9,referenceDirection:'ABOVE_REFERENCE'}},activeThread:null,threads:[],counts:{watching:0,paused:0,newThreadCount:0},targetContext:{}};}

await test('FIRST-FRAME-IS-ONE-FOCUS-NOT-AN-ANALYSIS-DUMP',()=>{
  const html=renderMobile({output:baseOutput(),selfUnderstanding:selfUnderstanding()});
  assert.match(html,/interpretation-flow-room--compact/);
  assert.match(html,/data-interpretation-flow-stage="focus"/);
  assert.match(html,/今回、まず見るところ/);
  assert.match(html,/最初は自分で記録した内容だけを見ます/);
  assert.match(html,/対応する情報を見る/);
});

await test('INTERACTION-REVEALS-RELATED-RUNLOAD-INFORMATION',()=>{
  const html=renderMobile({output:baseOutput(),selfUnderstanding:selfUnderstanding()});
  assert.match(html,/data-interpretation-flow-reveal="compare"/);
  assert.match(html,/RunLoadの部位表示/);
  assert.match(html,/同じ部位/);
  assert.match(html,/表示理由/);
});

await test('USER-IS-NOT-ASKED-TO-JUDGE-AGREEMENT-OR-CAUSE',()=>{
  const html=renderMobile({output:baseOutput(),selfUnderstanding:selfUnderstanding()});
  assert.match(html,/2つは別の情報です/);
  assert.match(html,/原因だという意味ではありません/);
  assert.match(html,/高いほど良い・悪いという意味でもありません/);
  assert.doesNotMatch(html,/感覚と近い|感覚と違う|一致度|原因だった/);
});

await test('DECISION-IS-A-CHECKING-QUESTION-WITH-LOW-BURDEN-OPTIONS',()=>{
  const html=renderMobile({output:baseOutput(),selfUnderstanding:selfUnderstanding()});
  assert.match(html,/次に自分で確かめること/);
  assert.match(html,/次の走行では、股関節部の外側を自分がどう感じたか確認する/);
  assert.match(html,/この問いを次も確かめる/);
  assert.match(html,/今回はここまで/);
  assert.match(html,/まだ決めない/);
  assert.match(html,/今回のメモを残す（任意）/);
});

await test('TECHNICAL-DETAIL-AND-OTHER-ACTIONS-STAY-SECONDARY',()=>{
  const html=renderMobile({output:baseOutput(),selfUnderstanding:selfUnderstanding()});
  assert.match(html,/interpretation-loop-more--compact/);
  assert.match(html,/<summary>計算・条件・根拠を詳しく見る<\/summary>/);
  for(const label of ['条件を変えて比較する','次の記録条件を整理する','共有用に整理する','関連する読みものを確認する']) assert.match(html,new RegExp(label));
});

await test('ADVANCED-COPY-HIDES-INTERNAL-REFERENCE-LABEL',()=>{
  const out=baseOutput({selected:true});
  const html=renderMobile({output:out,selfUnderstanding:selfUnderstanding()});
  assert.match(html,/股関節の機械的仕事に基づく部位内基準100/);
  assert.doesNotMatch(html,/Reference-100/);
});

await test('ADVANCED-COPY-TRANSLATES-RESEARCH-INTERNALS-BEFORE-DISPLAY',()=>{
  const out=baseOutput({selected:true});
  out.advanced.evidence.regions['BA-DISP-014']={construct:'膝蓋大腿関節stress力積に基づく部位内Reference-100',sources:[{label:'Gazendam & Hof 2007',role:'保存原典Figure 3とTable 3から再現した筋活動経路'},{label:'Gazendam & Hof 2007',role:'Table 3係数と2.5 m/s正規化で再現した下腿後面筋活動経路'},{label:'Hagen et al. 2023',role:'膝蓋大腿関節の速度・相対cadence応答'},{label:'Van Hooren et al. 2024',role:'脛骨・アキレス腱の速度/条件応答'}]};
  const html=renderMobile({output:out,selfUnderstanding:selfUnderstanding()});
  assert.match(html,/膝蓋大腿関節の応力の積み重なりを表す指標に基づく部位内基準100/);
  assert.match(html,/保存原典の図3と表3から再現した筋活動の関係/);
  assert.match(html,/相対ピッチ応答/);
  assert.doesNotMatch(html,/stress力積|Figure 3|cadence|Reference-100/i);
});

await test('DERIVED-ACTIONS-PRESERVE-ROOM-CONTEXT',()=>{
  const html=renderMobile({output:baseOutput({selected:true}),selfUnderstanding:selfUnderstanding()});
  for(const destination of ['simulation','plan','consultation','reading']) assert.match(html,new RegExp(`#\\/${destination}\\?`));
  assert.ok((html.match(/from=interpretation-room/g)||[]).length>=4);
  assert.ok((html.match(/roomOrigin=result/g)||[]).length>=4);
});

await test('NO-BODY-PAIR-CAN-USE-A-BOUNDED-CONTEXT-QUESTION',()=>{
  const html=renderMobile({output:baseOutput(),selfUnderstanding:{...selfUnderstanding(),primaryCandidate:null}});
  assert.match(html,/身体の部位記録がなくても/);
  assert.match(html,/参考情報・あなたへの判定ではありません/);
  assert.match(html,/次の走行でも、走行後の疲労感とその日の走行条件を一緒に確認する/);
  assert.match(html,/data-thread-type=\"CONTEXT_QUESTION\"/);
});

await test('SUPPORT-STATE-TAKES-PRECEDENCE',()=>{
  const out=baseOutput(); out.state.support='URGENT'; out.next={selectionRequired:false,primaryAction:{actionId:'official-help',destination:'support-guidance',parameters:{},enabled:true},otherActions:[]};
  const html=renderMobile({output:out,selfUnderstanding:selfUnderstanding()});
  assert.match(html,/先に確認することがあります/);
  assert.doesNotMatch(html,/interpretation-flow-room/);
});

await test('REST-STATE-DOES-NOT-FABRICATE-REGIONAL-RESULTS',()=>{
  const out=baseOutput(); out.target.activityType='rest'; out.state.regional='REST';
  const html=renderMobile({output:out,selfUnderstanding:selfUnderstanding()});
  assert.match(html,/今回は休養の記録です/);
  assert.doesNotMatch(html,/interpretation-flow-pair/);
});

await test('CSS-HAS-RESPONSIVE-STAGED-INTERACTION-AND-REDUCED-MOTION',()=>{
  const css=fs.readFileSync(path.join(root,'styles/interpretation-technical-details.css'),'utf8');
  const mobileCss=fs.readFileSync(path.join(root,'styles/mobile-interpretation-technical-details-responsive.css'),'utf8');
  assert.match(css,/grid-template-columns:\s*minmax\(0, 1fr\) minmax\(19rem, 34%\)/);
  assert.match(css,/\.interpretation-flow-room\[data-interpretation-flow-stage="focus"\] \[data-interpretation-flow-reveal="compare"\] \{ display: none; \}/);
  assert.match(mobileCss,/@media \(max-width: 820px\)/);
  assert.match(mobileCss,/@media \(max-width: 390px\)/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css,/#[0-9a-fA-F]{3,8}\b/);
});

await test('PRESENTATION-DOES-NOT-USE-GOOD-BAD-DIAGNOSTIC-OR-RISK-LABELS',()=>{
  const presentation=fs.readFileSync(path.join(root,'ui/interpretationRoomPresentation.js'),'utf8');
  assert.doesNotMatch(presentation,/安全な部位|危険な部位|良い部位|悪い部位/);
  assert.doesNotMatch(presentation,/原因だったと判断します|けがです|傷害リスクが高い/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Presentation',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

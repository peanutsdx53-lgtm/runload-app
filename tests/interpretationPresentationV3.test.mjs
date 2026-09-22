import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderInterpretationRoomV3 } from '../ui/interpretationRoomPresentationV3.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

const REGION_IDS=['BA-DISP-014','BA-DISP-015','BA-DISP-016','BA-DISP-018','BA-DISP-019','BA-DISP-021','BA-DISP-023','BA-DISP-024','BA-DISP-025','BA-DISP-027','BA-DISP-028','BA-DISP-029'];
const REGION_LABELS=['股関節部','殿部','大腿前面','大腿後面','膝蓋大腿関節部','脛骨部','下腿後面','足関節部','アキレス腱部','後足部','足底中部・内側縦足弓','前足部'];

function overviewRegions(){
  return REGION_IDS.map((id,index)=>({
    regionId:id,
    primaryRegionId:`R${String(index+1).padStart(2,'0')}`,
    label:REGION_LABELS[index],
    value:112+index,
    availability:'AVAILABLE',
    reference:{
      available:true,
      reference:100,
      value:112+index,
      difference:12+index,
      direction:index%3===0?'ABOVE_REFERENCE':index%3===1?'REFERENCE_VICINITY':'BELOW_REFERENCE',
    },
    previous:{available:false,recordId:'',date:'',previousValue:null,currentValue:null,difference:null,direction:'NONE'},
  }));
}

function actions(){
  return [
    {actionId:'history',destination:'history',parameters:{recordId:'r1'},enabled:true},
    {actionId:'simulation',destination:'simulation',parameters:{recordId:'r1'},enabled:true},
    {actionId:'plan',destination:'plan',parameters:{sourceRecordId:'r1'},enabled:true},
    {actionId:'reading',destination:'reading',parameters:{recordId:'r1'},enabled:true},
    {actionId:'share',destination:'consultation',parameters:{recordId:'r1'},enabled:true},
  ];
}

function exactPath(overrides={}){
  return {
    resolutionStatus:'EXACT',
    resolutionBasis:'VERSION_LOCKED_REGION_ROUTE',
    activeRoute:'SPEED',
    exposure:{type:'WHOLE_RUN',distanceKm:5,durationMinutes:30,speedMps:2.7777778,segmentCount:0},
    activeInputs:[
      {id:'DISTANCE',value:5,role:'DERIVE_SPEED',source:'engine_input_snapshot'},
      {id:'DURATION',value:30,role:'DERIVE_SPEED',source:'engine_input_snapshot'},
      {id:'SPEED',value:2.7777778,role:'PRIMARY_NUMERIC_ROUTE',source:'persisted_result.exposure'},
    ],
    conditionalInputs:[],
    contextOnlyInputs:[],
    explanationTokens:['DISTANCE_DURATION_DERIVE_SPEED','SPEED_USED_FOR_REGION'],
    ...overrides,
  };
}

function baseOutput({selected=true}={}){
  const overview=overviewRegions();
  const selectedRegion=selected?{
    regionId:'BA-DISP-014',
    primaryRegionId:'R01',
    label:'股関節部',
    value:112,
    referenceComparison:{available:true,reference:100,value:112,difference:12,direction:'ABOVE_REFERENCE'},
    previousComparison:{available:true,recordId:'p1',date:'2026-09-19',previousValue:106,currentValue:112,difference:6,direction:'UP'},
    personalHistory:{comparableCount:3,lastFive:[{recordId:'p1',date:'2026-09-19',value:106,referenceDirection:'ABOVE_REFERENCE'}],referenceDirectionCounts:{above:3,near:0,below:0,unavailable:0}},
    calculationPath:exactPath(),
  }:null;
  const allActions=actions();
  return {
    schemaVersion:'RUNLOAD_INTERPRETATION_OUTPUT_V3_CANDIDATE',
    target:{recordId:'r1',resultRecordId:'res1',date:'2026-09-20',activityType:'run',origin:'result',selectedRegionId:selected?'BA-DISP-014':''},
    state:{targetAvailable:true,regional:'AVAILABLE',history:'AVAILABLE',subjective:'PAIR',support:'NORMAL',legacy:false},
    overview:{regions:overview,selectionMode:selected?'EXPLICIT':'USER_SELECT',guidanceTokens:['REGIONS_USE_OWN_REFERENCE','NO_CROSS_REGION_RANKING']},
    selectedRegion,
    subjectiveContext:{
      state:'PAIR',
      pre:{available:true,value:4,descriptorType:'EXACT',descriptor:'少し疲れている',lowerAnchor:null,upperAnchor:null},
      post:{available:true,value:6,descriptorType:'EXACT',descriptor:'中程度に疲れている',lowerAnchor:null,upperAnchor:null},
      difference:{eligible:true,value:2,direction:'UP'},
      recentReferences:{pre:null,post:null,delta:null},
      boundaryTokens:['ROF_IS_SUBJECTIVE','ROF_SEPARATE_FROM_REFERENCE100'],
    },
    understanding:{facts:[],boundaryCodes:['NO_DIAGNOSIS','NO_INJURY_RISK','NO_CAUSAL_INFERENCE']},
    next:{selectionRequired:!selected,primaryAction:selected?allActions[1]:null,otherActions:selected?allActions.filter((_,i)=>i!==1):[]},
    advanced:{evidence:{regions:{'BA-DISP-014':{construct:'股関節の機械的仕事に基づく部位内Reference-100',sources:[{label:'Fukuchi et al. 2017',role:'速度応答'}]}}}},
    safety:{route:'normal',reasons:[],blocks:[],nextActions:[]},
  };
}

await test('OVERVIEW-STARTS-WITH-WHOLE-BODY-NOT-QUESTION-MENU',()=>{
  const html=renderInterpretationRoomV3({output:baseOutput({selected:false})});
  assert.match(html,/今回の身体を部位ごとに見る/);
  assert.match(html,/部位ごとの位置を確認/);
  assert.match(html,/まず1部位を選びます/);
  assert.doesNotMatch(html,/今、確認したいことはどちらですか/);
  assert.doesNotMatch(html,/この結果を理解したい/);
});

await test('OVERVIEW-DOES-NOT-DUMP-TWELVE-NUMERIC-VALUES',()=>{
  const html=renderInterpretationRoomV3({output:baseOutput({selected:false})});
  assert.match(html,/股関節部：基準100より上側/);
  assert.match(html,/殿部：基準100付近/);
  assert.doesNotMatch(html,/>112</);
  assert.doesNotMatch(html,/今回 112/);
});

await test('OVERVIEW-EXPLAINS-NO-CROSS-REGION-RANKING',()=>{
  const html=renderInterpretationRoomV3({output:baseOutput({selected:false})});
  assert.match(html,/部位どうしの数値を順位付けする図ではありません/);
});

await test('OVERVIEW-ADDS-NONCOLOR-DIRECTION-GROUPING',()=>{
  const html=renderInterpretationRoomV3({output:baseOutput({selected:false})});
  assert.match(html,/今回の分かれ方/);
  assert.doesNotMatch(html,/class="interpretation-v3-legend"/);
  assert.match(html,/interpretation-v3-overview-group-name/);
  assert.match(html,/基準より上側/);
  assert.match(html,/基準付近/);
  assert.match(html,/基準より下側/);
  assert.match(html,/股関節部/);
});

await test('SELECTED-VIEW-DOES-NOT-REPEAT-WHOLE-BODY-MAP',()=>{
  const html=renderInterpretationRoomV3({output:baseOutput()});
  assert.match(html,/股関節部の結果を整理/);
  assert.match(html,/身体全体から選び直す/);
  assert.doesNotMatch(html,/class="interpretation-v3-map"/);
  assert.doesNotMatch(html,/部位名から選ぶ/);
  assert.match(html,/<span>1<\/span><div><small>選んだ部位を見る<\/small>/);
});

await test('SELECTED-REGION-SHOWS-NUMBER-WITH-REFERENCE-AND-PREVIOUS',()=>{
  const html=renderInterpretationRoomV3({output:baseOutput()});
  assert.match(html,/基準100より上側/);
  assert.match(html,/>112</);
  assert.match(html,/基準100との差 \+12/);
  assert.match(html,/106/);
  assert.match(html,/差 \+6/);
});

await test('NO-HISTORY-EXPLAINS-WHAT-THE-CURRENT-VALUE-BECOMES',()=>{
  const out=baseOutput();
  out.selectedRegion.previousComparison={available:false,recordId:'',date:'',previousValue:null,currentValue:null,difference:null,direction:'NONE'};
  const html=renderInterpretationRoomV3({output:out});
  assert.match(html,/同じ方法で比べられる過去記録はまだありません/);
  assert.match(html,/今回の値を次回の比較点として使えます/);
});

await test('EXACT-CALCULATION-PATH-IS-SIMPLE-AND-NONCAUSAL',()=>{
  const html=renderInterpretationRoomV3({output:baseOutput()});
  assert.match(html,/この数値に使われた情報/);
  assert.match(html,/距離/);
  assert.match(html,/5 km/);
  assert.match(html,/時間/);
  assert.match(html,/30 分/);
  assert.match(html,/6:00 \/km/);
  assert.match(html,/RunLoad内部の計算経路/);
  assert.match(html,/身体で実際に起きた原因を示すものではありません/);
});

await test('RUN-WALK-COPY-USES-RUNNING-PHASE-NOT-WHOLE-RUN',()=>{
  const out=baseOutput();
  out.selectedRegion.calculationPath=exactPath({
    exposure:{type:'RUNNING_PHASE',distanceKm:3.8,durationMinutes:24,speedMps:2.6388889,segmentCount:0},
    activeInputs:[
      {id:'RUNNING_DISTANCE',value:3.8,role:'DERIVE_SPEED'},
      {id:'RUNNING_DURATION',value:24,role:'DERIVE_SPEED'},
      {id:'SPEED',value:2.6388889,role:'PRIMARY_NUMERIC_ROUTE'},
    ],
  });
  const html=renderInterpretationRoomV3({output:out});
  assert.match(html,/走った区間の距離/);
  assert.match(html,/走った区間の時間/);
  assert.match(html,/走った区間から計算/);
});

await test('SEGMENTED-PATH-DOES-NOT-PRETEND-EXACT-PER-SEGMENT-ROUTE',()=>{
  const out=baseOutput();
  out.selectedRegion.calculationPath=exactPath({
    resolutionStatus:'PARTIAL',
    activeRoute:'SECTION_COMPOSED',
    exposure:{type:'SEGMENTED',distanceKm:5,durationMinutes:30,speedMps:2.8,segmentCount:3},
  });
  const html=renderInterpretationRoomV3({output:out});
  assert.match(html,/3区間/);
  assert.match(html,/区間ごとに計算/);
  assert.match(html,/距離に応じてまとめる/);
  assert.match(html,/各区間の最終採用経路まで断定しません/);
});

await test('CONDITIONAL-INPUT-IS-NOT-CALLED-APPLIED',()=>{
  const out=baseOutput();
  out.selectedRegion.calculationPath=exactPath({
    resolutionStatus:'PARTIAL',
    activeRoute:'SPEED_WITH_CONDITIONAL_INPUTS',
    conditionalInputs:[{id:'CADENCE',value:172,role:'CONDITIONAL_NUMERIC_ROUTE'}],
  });
  const html=renderInterpretationRoomV3({output:out});
  assert.match(html,/関係する条件として記録されています/);
  assert.match(html,/ピッチ/);
  assert.match(html,/172 spm/);
  assert.match(html,/最終値へ採用された経路をここで断定しません/);
  assert.doesNotMatch(html,/ピッチを使って計算しています/);
});

await test('CONTEXT-ONLY-INPUTS-ARE-CLEARLY-SEPARATED',()=>{
  const out=baseOutput();
  out.selectedRegion.calculationPath=exactPath({
    contextOnlyInputs:[
      {id:'SURFACE',value:[{category:'ASPHALT'}],role:'CONTEXT_ONLY'},
      {id:'GRADE',value:'RECORDED',role:'NOT_ACTIVE_FOR_THIS_REGION'},
    ],
  });
  const html=renderInterpretationRoomV3({output:out});
  assert.match(html,/記録はあるが、この部位の現在の数値計算には使わない情報/);
  assert.match(html,/路面/);
  assert.match(html,/坂/);
});

await test('ROF-EXACT-DESCRIPTORS-ARE-SHOWN-WITH-NUMBERS',()=>{
  const html=renderInterpretationRoomV3({output:baseOutput()});
  assert.match(html,/走る前/);
  assert.match(html,/4<em>\/10/);
  assert.match(html,/少し疲れている/);
  assert.match(html,/6<em>\/10/);
  assert.match(html,/中程度に疲れている/);
});

await test('ROF-UNLABELED-VALUE-USES-OFFICIAL-ANCHORS',()=>{
  const out=baseOutput();
  out.subjectiveContext.post={available:true,value:3,descriptorType:'BETWEEN_ANCHORS',descriptor:'',lowerAnchor:{value:2,descriptor:'まったく疲れていない'},upperAnchor:{value:4,descriptor:'少し疲れている'}};
  out.subjectiveContext.difference={eligible:true,value:-1,direction:'DOWN'};
  const html=renderInterpretationRoomV3({output:out});
  assert.match(html,/2「まったく疲れていない」と4「少し疲れている」の間/);
  assert.doesNotMatch(html,/やや疲れている/);
});

await test('NO-SUBJECTIVE-RECORD-OMITS-SUBJECTIVE-SECTION',()=>{
  const out=baseOutput();
  out.state.subjective='NONE';
  out.subjectiveContext={state:'NONE',pre:{available:false},post:{available:false},difference:{eligible:false},recentReferences:{},boundaryTokens:[]};
  const html=renderInterpretationRoomV3({output:out});
  assert.doesNotMatch(html,/走る前後の疲れ/);
});

await test('UNDERSTANDING-PAIRS-KNOWN-AND-UNKNOWN',()=>{
  const html=renderInterpretationRoomV3({output:baseOutput()});
  assert.match(html,/今回確認できること/);
  assert.match(html,/ここからは決められないこと/);
  assert.match(html,/身体的な原因やけがの可能性は判断できません/);
});

await test('NEXT-ACTION-USES-USER-GOAL-NOT-FEATURE-NAME',()=>{
  const html=renderInterpretationRoomV3({output:baseOutput()});
  assert.match(html,/条件を変えた表示を確かめる/);
  assert.doesNotMatch(html,/>Simulation</);
  assert.match(html,/from=interpretation-room/);
});

await test('DERIVED-ACTIONS-PRESERVE-INTERPRETATION-CONTEXT',()=>{
  const html=renderInterpretationRoomV3({output:baseOutput()});
  assert.match(html,/次の走りや休養を準備する/);
  assert.doesNotMatch(html,/次回確認したいことを残す/);
  for(const destination of ['simulation','plan','consultation','reading']) {
    assert.match(html,new RegExp(`#\\/${destination}\\?`));
  }
  assert.ok((html.match(/from=interpretation-room/g)||[]).length>=4);
  assert.ok((html.match(/roomExperience=v3/g)||[]).length>=4);
  assert.ok((html.match(/roomOrigin=result/g)||[]).length>=4);
});

await test('ADVANCED-EVIDENCE-IS-COLLAPSED-BEHIND-PLAIN-LANGUAGE',()=>{
  const html=renderInterpretationRoomV3({output:baseOutput()});
  assert.match(html,/<details class="interpretation-v3-advanced">/);
  assert.match(html,/計算方法と研究上の背景を詳しく見る/);
  assert.match(html,/全文献の完全な一覧ではありません/);
  assert.match(html,/Reference-100/);
});

await test('BEGINNER-V3-FLOW-OMITS-INTERNAL-JARGON',()=>{
  const html=renderInterpretationRoomV3({output:baseOutput()});
  const beginnerHtml=html.replace(/<details class="interpretation-v3-advanced">[\s\S]*?<\/details>/,'');
  assert.doesNotMatch(beginnerHtml,/ROF-J/);
  assert.doesNotMatch(beginnerHtml,/Reference-100/);
  assert.doesNotMatch(beginnerHtml,/primaryCode/);
  assert.doesNotMatch(beginnerHtml,/P1_SOURCE|P2_CROSS/);
});

await test('REST-STATE-DOES-NOT-FABRICATE-REGIONAL-RESULTS',()=>{
  const out=baseOutput({selected:false});
  out.target.activityType='rest';
  out.state.regional='REST';
  out.overview.regions=[];
  const html=renderInterpretationRoomV3({output:out});
  assert.match(html,/今回は休養の記録です/);
  assert.match(html,/12部位の数値を作りません/);
  assert.doesNotMatch(html,/部位ごとの位置を確認/);
});

await test('LEGACY-STATE-DOES-NOT-REINTERPRET-AS-CURRENT',()=>{
  const out=baseOutput({selected:false});
  out.state.legacy=true;
  out.state.regional='LEGACY';
  const html=renderInterpretationRoomV3({output:out});
  assert.match(html,/現在の計算方法とは分けて扱います/);
  assert.match(html,/現在の基準100の結果として読み替えません/);
  assert.doesNotMatch(html,/部位ごとの位置を確認/);
});

await test('SUPPORT-STATE-TAKES-PRECEDENCE-OVER-NORMAL-INTERPRETATION',()=>{
  const out=baseOutput();
  out.state.support='URGENT';
  out.next={
    selectionRequired:false,
    primaryAction:{actionId:'official-help',destination:'support-guidance',parameters:{},enabled:true},
    otherActions:[{actionId:'share',destination:'consultation',parameters:{recordId:'r1'},enabled:true}],
  };
  const html=renderInterpretationRoomV3({output:out});
  assert.match(html,/先に確認することがあります/);
  assert.match(html,/公的サポートを確認する/);
  assert.doesNotMatch(html,/この数値に使われた情報/);
});

await test('EMPTY-STATE-HAS-DIRECT-RECORD-ACTION',()=>{
  const html=renderInterpretationRoomV3({output:{state:{targetAvailable:false}}});
  assert.match(html,/対象の保存記録がありません/);
  assert.match(html,/#\/record-input/);
});

await test('V3-CSS-USES-THEME-TOKENS-AND-NO-HARDCODED-HEX-COLORS',()=>{
  const css=fs.readFileSync(path.join(root,'styles/interpretation-room-v3.css'),'utf8');
  assert.match(css,/var\(--color-surface\)/);
  assert.match(css,/var\(--color-map-high\)/);
  assert.match(css,/@media \(max-width: 420px\)/);
  assert.doesNotMatch(css,/#[0-9a-fA-F]{3,8}\b/);
});

await test('V3-CSS-DOES-NOT-USE-RED-GREEN-GOOD-BAD-SEMANTICS',()=>{
  const css=fs.readFileSync(path.join(root,'styles/interpretation-room-v3.css'),'utf8');
  assert.doesNotMatch(css,/\bred\b|\bgreen\b/i);
  const presentation=fs.readFileSync(path.join(root,'ui/interpretationRoomPresentationV3.js'),'utf8');
  assert.doesNotMatch(presentation,/安全な部位|危険な部位|良い部位|悪い部位/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Presentation V3 Candidate',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

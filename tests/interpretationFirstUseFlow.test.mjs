import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderInterpretationRoom } from '../ui/interpretationRoomPresentation.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

const region={
  regionId:'BA-DISP-014',primaryRegionId:'R01',label:'股関節部',value:101.9,referenceDirection:'ABOVE_REFERENCE',
  previousComparison:{available:true,difference:3.2},pastMatchingDirectionCount:0,reasonCode:'PREVIOUS_CHANGE',
};
function output(){return {
  target:{recordId:'r2',date:'2026-10-03',origin:'result',selectedRegionId:''},
  state:{targetAvailable:true,regional:'AVAILABLE',history:'AVAILABLE',subjective:'PAIR',support:'NORMAL'},
  runFacts:{postRunReflection:'後半は少し余裕があった',nextCheckPoint:''},
  overview:{attention:{counts:{previousChanged:1,conditionDifferences:1},groups:[{code:'PREVIOUS_CHANGE',regions:[region]}]}},
  selectedRegion:null,
  subjectiveContext:{state:'PAIR',pre:{available:true,value:3},post:{available:true,value:6},difference:{eligible:true,value:3}},
  conditions:{differences:[{id:'distanceKm',previous:5,current:6,delta:1,relationship:'USED_IN_CURRENT_ROUTE'}]},
  next:{primaryAction:{actionId:'plan',destination:'plan',enabled:true},otherActions:[]},
  advanced:{evidence:{regions:{}}},
};}
const candidate={
  primaryCandidate:{kind:'BODY_OBSERVATION_PAIR',threadType:'REGION_OBSERVATION_PAIR',subject:{regionId:'BA-DISP-014',bodyAreaId:'BFR-200-COX'},observation:{label:'股関節部の外側',sensationType:'DISCOMFORT',intensity:1,noticedTiming:'AFTER'},row:{regionId:'BA-DISP-014',regionName:'股関節部',value:101.9}},
  activeThread:null,threads:[],counts:{watching:0,paused:0,newThreadCount:0},targetContext:{},
};

await test('FIRST-USE-STARTS-WITH-ONE-USER-EXPERIENCE-AND-ONE-NEXT-ACTION',()=>{
  for(const mobileLayout of [true,false]){
    const html=renderInterpretationRoom({output:output(),selfUnderstanding:candidate,mobileLayout});
    assert.match(html,/今回、まず見るところ/);
    assert.match(html,/あなたの身体の記録/);
    assert.match(html,/股関節部の外側/);
    assert.match(html,/対応する情報を見る/);
    assert.match(html,/data-v53-stage="focus"/);
  }
});

await test('COMPARISON-IS-STAGED-AND-KEEPS-CONSTRUCTS-SEPARATE',()=>{
  const html=renderInterpretationRoom({output:output(),selfUnderstanding:candidate,mobileLayout:true});
  assert.match(html,/data-v53-reveal="compare"/);
  assert.match(html,/RunLoadの部位表示/);
  assert.match(html,/同じ部位/);
  assert.match(html,/2つは別の情報です/);
  assert.match(html,/原因だという意味ではありません/);
});

await test('USER-PERSISTS-A-CHECKING-QUESTION-NOT-A-SYSTEM-CONCLUSION',()=>{
  const html=renderInterpretationRoom({output:output(),selfUnderstanding:candidate,mobileLayout:true});
  assert.match(html,/次に自分で確かめること/);
  assert.match(html,/次の走行では、股関節部の外側を自分がどう感じたか確認する/);
  assert.match(html,/data-action="create-self-understanding-thread"/);
  assert.match(html,/この問いを次も確かめる/);
  assert.match(html,/まだ決めない/);
  assert.doesNotMatch(html,/data-action="finalize-self-interpretation"/);
});

await test('CONTINUED-USE-PRIORITIZES-THE-PREVIOUSLY-CHOSEN-QUESTION',()=>{
  const active={
    id:'t1',type:'REGION_OBSERVATION_PAIR',title:'次の走行でも、股関節部の外側について自分の記録と部位表示を見比べる',subject:{regionId:'BA-DISP-014',bodyAreaId:'BFR-200-COX'},
    sourceEpisode:{recordId:'r1',date:'2026-09-26',row:{regionName:'股関節部',value:101.9},observation:{sensationType:'DISCOMFORT',intensity:1}},
    newEpisodes:[{recordId:'r2',date:'2026-10-03',row:{regionName:'股関節部',value:99.8},observation:{sensationType:'TIGHTNESS',intensity:2}}],
    eligibleEpisodes:[],eligibleCount:2,newCount:1,userState:'WATCHING',hasNewEligibleData:true,
  };
  const su={...candidate,primaryCandidate:null,activeThread:active,threads:[active],counts:{watching:1,paused:0,newThreadCount:1}};
  const html=renderInterpretationRoom({output:output(),selfUnderstanding:su,mobileLayout:true});
  assert.match(html,/前回から見ていたこと/);
  assert.match(html,/今回、新しい材料があります/);
  assert.match(html,/これまでと見比べる/);
  assert.match(html,/この問いを続けますか/);
  assert.match(html,/KEEP_WATCHING/);
  assert.match(html,/ここで終える/);
  assert.match(html,/いったん休止する/);
});

await test('ZERO-CANDIDATE-IS-A-NORMAL-EXPLICIT-STATE',()=>{
  const emptyOutput=output();
  emptyOutput.runFacts={postRunReflection:'',nextCheckPoint:''};
  emptyOutput.subjectiveContext={state:'UNAVAILABLE',pre:{available:false},post:{available:false},difference:{eligible:false}};
  emptyOutput.conditions={differences:[]};
  const html=renderInterpretationRoom({output:emptyOutput,selfUnderstanding:{...candidate,primaryCandidate:null},mobileLayout:true});
  assert.match(html,/今回は、続けて確かめる問いはまだありません/);
  assert.match(html,/無理に意味や問いを作りません/);
  assert.doesNotMatch(html,/create-self-understanding-thread/);
});

await test('NEXT-RUN-AND-HISTORY-ARE-CONNECTED-TO-CHECKING-THREADS',()=>{
  const record=fs.readFileSync('screens/recordInputScreen.js','utf8');
  const history=fs.readFileSync('screens/historyScreen.js','utf8');
  const result=fs.readFileSync('screens/resultScreen.js','utf8');
  assert.match(record,/record-interpretation-carry/);
  assert.match(record,/前回から/);
  assert.match(history,/自分について確認してきたこと/);
  assert.match(history,/確認中/);
  assert.doesNotMatch(history,/recentInterpretations\(services/);
  assert.match(result,/今回を見比べる/);
});

await test('TECHNICAL-DETAIL-REMAINS-SECONDARY-ON-BOTH-LAYOUTS',()=>{
  const mobile=renderInterpretationRoom({output:output(),selfUnderstanding:candidate,mobileLayout:true});
  const pc=renderInterpretationRoom({output:output(),selfUnderstanding:candidate,mobileLayout:false});
  for(const html of [mobile,pc]) assert.match(html,/<summary>計算・条件・根拠を詳しく見る<\/summary>/);
  assert.match(mobile,/補足の材料を見る/);
  assert.match(pc,/補足の材料を見る/);
});

await test('NEW-FLOW-NO-LONGER-WRITES-SELF-INTERPRETATION-SNAPSHOTS',()=>{
  const source=fs.readFileSync('ui/interpretationRoomPresentation.js','utf8');
  const v53=source.slice(source.indexOf('function v53QuestionForCandidate'),source.indexOf('function publicConstructText'));
  assert.doesNotMatch(v53,/finalize-self-interpretation|selfInterpretations|今回の解釈を残す/);
  assert.match(v53,/create-self-understanding-thread/);
});

const failed=results.filter(r=>r.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation First Use Flow',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;
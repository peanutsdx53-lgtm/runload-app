import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderInterpretationRoom } from '../ui/interpretationRoomPresentation.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

function output(){return {
  state:{targetAvailable:true,support:'NORMAL',regional:'REFERENCE100_V3'},
  target:{recordId:'r1',date:'2026-10-03',origin:'result',selectedRegionId:'BA-DISP-014'},
  runFacts:{postRunReflection:'後半は少し余裕があった'},
  overview:{attention:{counts:{previousChanged:4,conditionDifferences:2},groups:[{code:'PREVIOUS_CHANGE',regions:[{regionId:'BA-DISP-014',label:'股関節部',value:101.9,referenceDirection:'ABOVE_REFERENCE',previousComparison:{available:true,difference:3.2}}]}]}},
  conditions:{differences:[{id:'distanceKm',previous:5,current:6,delta:1},{id:'durationMinutes',previous:40,current:45,delta:5}]},
  subjectiveContext:{pre:{available:true,value:3},post:{available:true,value:8},difference:{eligible:true,value:5}},
  selectedRegion:null,
  next:{primaryAction:{actionId:'plan',destination:'plan',enabled:true},otherActions:[{actionId:'share',destination:'consultation',enabled:true},{actionId:'simulation',destination:'simulation',enabled:true}]},
};}
const selfUnderstanding={
  primaryCandidate:{kind:'BODY_OBSERVATION_PAIR',threadType:'REGION_OBSERVATION_PAIR',subject:{regionId:'BA-DISP-014',bodyAreaId:'BFR-200-COX'},observation:{label:'股関節部の外側',sensationType:'DISCOMFORT',intensity:1,noticedTiming:'AFTER'},row:{regionId:'BA-DISP-014',regionName:'股関節部',value:101.9}},
  activeThread:null,threads:[],counts:{watching:0,paused:0,newThreadCount:0},targetContext:{},
};

await test('PC-USES-WIDE-CANVAS-AND-DECISION-RAIL',()=>{
  const html=renderInterpretationRoom({output:output(),selfUnderstanding,compactLayout:false});
  assert.match(html,/interpretation-flow-room--wide/);
  assert.match(html,/interpretation-flow-layout/);
  assert.match(html,/interpretation-flow-canvas/);
  assert.match(html,/interpretation-flow-rail/);
  assert.match(html,/data-interpretation-flow-stage="focus"/);
  assert.doesNotMatch(html,/interpretation-flow-room--compact/);
});

await test('PC-TEACHES-USE-THROUGH-STAGED-INTERACTION',()=>{
  const html=renderInterpretationRoom({output:output(),selfUnderstanding,compactLayout:false});
  assert.match(html,/1<\/i>記録/);
  assert.match(html,/2<\/i>見比べる/);
  assert.match(html,/3<\/i>次へ/);
  assert.match(html,/対応する情報を見る/);
  assert.match(html,/data-interpretation-flow-reveal="compare"/);
  assert.match(html,/次にどうするか決める/);
});

await test('PC-LINKS-USER-EXPERIENCE-AND-RUNLOAD-INFORMATION-WITHOUT-EQUATING-THEM',()=>{
  const html=renderInterpretationRoom({output:output(),selfUnderstanding,compactLayout:false});
  assert.match(html,/あなたの身体の記録/);
  assert.match(html,/股関節部の外側/);
  assert.match(html,/部位ごとの参考表示/);
  assert.match(html,/101\.9/);
  assert.match(html,/2つは別の情報です/);
  assert.match(html,/原因だという意味ではありません/);
  assert.match(html,/高いほど良い・悪いという意味でもありません/);
});

await test('PC-USER-SELECTS-A-NEXT-QUESTION-NOT-AN-ANSWER',()=>{
  const html=renderInterpretationRoom({output:output(),selfUnderstanding,compactLayout:false});
  assert.match(html,/次に自分で確かめること/);
  assert.match(html,/次の走行では、股関節部の外側を自分がどう感じたか確認する/);
  assert.match(html,/この問いを次も確かめる/);
  assert.match(html,/今回はここまで/);
  assert.match(html,/まだ決めない/);
  assert.doesNotMatch(html,/data-action="finalize-self-interpretation"/);
});

await test('PC-KEEPS-CANDIDATE-REASON-AND-TECHNICAL-DETAIL-TRACEABLE-BUT-SECONDARY',()=>{
  const html=renderInterpretationRoom({output:output(),selfUnderstanding,compactLayout:false});
  assert.match(html,/表示理由/);
  assert.match(html,/身体の記録と同じ部位に、今回の部位表示があるため/);
  assert.match(html,/<summary>計算・条件・根拠を詳しく見る<\/summary>/);
  assert.match(html,/条件を変えて比較する/);
  assert.match(html,/次の記録条件を整理する/);
  assert.match(html,/共有用に整理する/);
});

await test('PC-CSS-USES-LARGE-SCREEN-ASYMMETRIC-WORKSPACE',()=>{
  const css=read('styles/interpretation-technical-details.css');
  const mobileCss=read('styles/mobile-interpretation-technical-details-responsive.css');
  assert.match(css,/\.interpretation-flow-layout\s*\{/);
  assert.match(css,/grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(19rem,\s*34%\)/);
  assert.match(css,/\.interpretation-flow-rail\s*\{[^}]*position:\s*sticky/s);
  assert.match(mobileCss,/@media \(max-width: 820px\)/);
  assert.match(mobileCss,/\.interpretation-flow-layout\s*\{\s*display:\s*block;/s);
});

await test('PC-SHARES-ONE-SEMANTIC-STATE-MACHINE-WITH-MOBILE-BUT-NOT-LAYOUT',()=>{
  const pc=renderInterpretationRoom({output:output(),selfUnderstanding,compactLayout:false});
  const mobile=renderInterpretationRoom({output:output(),selfUnderstanding,compactLayout:true});
  for(const html of [pc,mobile]) {
    assert.match(html,/data-interpretation-flow-stage="focus"/);
    assert.match(html,/対応する情報を見る/);
    assert.match(html,/次に自分で確かめること/);
  }
  assert.match(pc,/interpretation-flow-room--wide/);
  assert.match(mobile,/interpretation-flow-room--compact/);
});

const failed=results.filter(r=>r.status==='FAIL');
console.log(JSON.stringify({suite:'Desktop Interpretation Workspace',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

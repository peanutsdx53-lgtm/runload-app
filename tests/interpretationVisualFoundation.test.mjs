import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderInterpretationRoom } from '../ui/interpretationRoomPresentation.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}
const source=async(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

function output(){
  return {
    targetRecordId:'r1',
    context:{recordDate:'2026-09-21',origin:'result',selectedRegionId:'BA-DISP-014'},
    current:{
      facts:{},
      regions:[
        {regionId:'BA-DISP-014',label:'股関節部',value:104,referenceDirection:'ABOVE_REFERENCE'},
        {regionId:'BA-DISP-016',label:'大腿前面',value:99,referenceDirection:'REFERENCE_VICINITY'},
      ],
      rof:{pre:null,post:null,delta:null},
    },
    comparison:{regionalById:{
      'BA-DISP-014':{comparablePreviousRecordId:'p1',previousValue:101,delta:3,previousDirection:'UP'},
    },conditionDifferences:[]},
    interpretation:{meaning:{
      primaryCode:'CURRENT_SHIFT_WITH_HISTORY',
      focusRegionIds:['BA-DISP-014'],
      availableModes:['visual'],
      factsUsed:[{type:'REGION_PREVIOUS_DIFFERENCE',regionId:'BA-DISP-014',currentValue:104,previousValue:101,delta:3,direction:'UP'}],
      boundaryCodes:[],
    }},
    safety:{route:'normal'},
    actions:[],
  };
}

await test('VISUAL-FOUNDATION-LOCATES-ONE-FOCUS-REGION',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual'});
  assert.match(html,/interpretation-body-locator/);
  assert.match(html,/data-focus-region="BA-DISP-014"/);
  assert.equal((html.match(/interpretation-body-region is-focus/g)||[]).length,1);
  assert.match(html,/人体図で股関節部を強調/);
});

await test('VISUAL-FOUNDATION-DRAWS-PREVIOUS-TO-CURRENT-DIRECTION',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual'});
  assert.match(html,/比較方向/);
  assert.match(html,/前回 → 今回/);
  assert.match(html,/data-arrow-origin="previous"/);
  assert.match(html,/interpretation-comparison-arrow/);
  assert.match(html,/>基準</);
  assert.match(html,/>100</);
});

await test('VISUAL-FOUNDATION-FALLS-BACK-TO-REFERENCE-WHEN-NO-COMPATIBLE-PREVIOUS',()=>{
  const out=output();
  out.comparison.regionalById['BA-DISP-014']={comparablePreviousRecordId:null,previousValue:null,delta:null};
  const html=renderInterpretationRoom({output:out,view:'explain',mode:'visual'});
  assert.match(html,/基準100 → 今回/);
  assert.match(html,/data-arrow-origin="reference"/);
  assert.doesNotMatch(html,/>前回</);
});

await test('VISUAL-FOUNDATION-EXPLAINS-NON-RISK-SEMANTICS',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual'});
  assert.match(html,/矢印は比較の向きだけを示します/);
  assert.match(html,/危険・安全・改善・悪化を判断しません/);
  assert.match(html,/別の部位との大小比較にも使いません/);
});

await test('VISUAL-FOUNDATION-MOTION-IS-ONE-SHOT-AND-REDUCED-MOTION-IS-STATIC',async()=>{
  const css=await source('styles/interpretation-room.css');
  const stage=css.slice(css.indexOf('/* Understanding-focused regional visual foundation. */'));
  assert.match(stage,/320ms ease-out 80ms 1 forwards/);
  assert.match(stage,/280ms ease-out 1 both/);
  assert.doesNotMatch(stage,/infinite/);
  assert.match(stage,/html\.ui-motion-reduced[\s\S]*animation: none/);
  assert.match(stage,/@media \(prefers-reduced-motion: reduce\)[\s\S]*stroke-dashoffset: 0/);
  assert.doesNotMatch(stage,/var\(--color-danger|var\(--color-success/);
});

await test('VISUAL-FOUNDATION-PWA-PRECACHES-REUSED-BODY-VISUAL-MODULE',async()=>{
  const sw=await source('service-worker.js');
  assert.match(sw,/"\.\/ui\/prototypeBodyRegionVisuals\.js"/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Visual Foundation',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

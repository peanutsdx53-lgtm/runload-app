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
      regions:[{regionId:'BA-DISP-014',label:'股関節部',value:104,referenceDirection:'ABOVE_REFERENCE'}],
      rof:{pre:4,post:6,delta:2,direction:'UP'},
    },
    comparison:{
      regionalById:{'BA-DISP-014':{comparablePreviousRecordId:'p1',previousValue:101,delta:3,previousDirection:'UP'}},
      conditionDifferences:[],
    },
    interpretation:{meaning:{
      primaryCode:'CURRENT_SHIFT_WITH_HISTORY',
      secondaryCodes:[],
      focusRegionIds:['BA-DISP-014'],
      availableModes:['simple','visual','difference','evidence'],
      factsUsed:[{type:'REGION_PREVIOUS_DIFFERENCE',regionId:'BA-DISP-014',previousValue:101,currentValue:104,delta:3,direction:'UP'}],
      boundaryCodes:[],
    }},
    safety:{route:'normal'},
    actions:[],
  };
}

function choiceCount(html){return (html.match(/class="interpretation-dialogue-choice"/g)||[]).length;}

await test('GUIDED-VISUAL-ENTRY-HAS-NO-VISUAL-BEFORE-INTENT-NARROWING',()=>{
  const html=renderInterpretationRoom({output:output(),view:'summary',origin:'result'});
  assert.equal(choiceCount(html),2);
  assert.doesNotMatch(html,/data-guided-stage="understand-visual"/);
  assert.doesNotMatch(html,/interpretation-body-locator/);
});

await test('GUIDED-VISUAL-UNDERSTAND-STEP-OFFERS-VISUAL-WITHOUT-RENDERING-IT',()=>{
  const html=renderInterpretationRoom({output:output(),view:'dialogue',topic:'understand',origin:'result'});
  assert.ok(choiceCount(html)<=3);
  assert.match(html,/図で確認/);
  assert.match(html,/mode=visual/);
  assert.doesNotMatch(html,/data-guided-stage="understand-visual"/);
  assert.doesNotMatch(html,/interpretation-body-locator/);
});

await test('GUIDED-VISUAL-VISUAL-APPEARS-AFTER-REPRESENTATION-SELECTION',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/data-guided-stage="understand-visual"/);
  assert.match(html,/data-reveal-step="visual"/);
  assert.match(html,/data-reveal-step="explanation"/);
  assert.match(html,/interpretation-body-locator/);
  assert.equal((html.match(/class="interpretation-visual-stack"/g)||[]).length,1);
});

await test('GUIDED-VISUAL-FOLLOWUP-STAYS-TWO-CHOICES-AND-DOWNSTREAM',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  const follow=html.match(/<section class="interpretation-dialogue-followup"[^>]*>[\s\S]*?<\/section>/)?.[0] || '';
  assert.ok(follow);
  assert.equal(choiceCount(follow),2);
  assert.match(follow,/view=evidence/);
  assert.match(follow,/topic=manage/);
  assert.doesNotMatch(follow,/#\/history|#\/simulation|#\/plan|#\/consultation|#\/reading/);
});

await test('GUIDED-VISUAL-REVEAL-IS-SHORT-ONE-SHOT',async()=>{
  const css=await source('styles/interpretation-room.css');
  const block=css.slice(css.indexOf('/* Short guided reveal sequence. */'));
  assert.match(block,/160ms ease-out 420ms 1 both/);
  assert.match(block,/160ms ease-out 540ms 1 both/);
  assert.doesNotMatch(block,/infinite/);
});

await test('GUIDED-VISUAL-REDUCED-MOTION-SHOWS-COMPLETE-STATIC-STATE',async()=>{
  const css=await source('styles/interpretation-room.css');
  const block=css.slice(css.indexOf('/* Short guided reveal sequence. */'));
  assert.match(block,/html\.ui-motion-reduced[\s\S]*animation: none[\s\S]*opacity: 1[\s\S]*transform: none/);
  assert.match(block,/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none[\s\S]*opacity: 1[\s\S]*transform: none/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Guided Visual Integration',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

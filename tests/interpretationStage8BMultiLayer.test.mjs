import assert from 'node:assert/strict';
import { renderInterpretationRoom } from '../ui/interpretationRoomPresentation.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

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
      primaryCode:'MULTI_LAYER_CHANGE',
      secondaryCodes:['CURRENT_SHIFT_WITH_HISTORY'],
      focusRegionIds:['BA-DISP-014'],
      availableModes:['visual'],
      factsUsed:[
        {type:'REGION_PREVIOUS_DIFFERENCE',regionId:'BA-DISP-014',previousValue:101,currentValue:104,delta:3,direction:'UP'},
        {type:'ROF_PRE_POST',pre:4,post:6,delta:2,direction:'UP'},
      ],
      boundaryCodes:['ROF_SEPARATE_SUBJECTIVE_LAYER'],
    }},
    safety:{route:'normal'},
    actions:[],
  };
}

await test('STAGE8B-MULTI-LAYER-USES-SEPARATE-LAYERS-PATTERN',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/data-visual-pattern="separate-layers"/);
  assert.match(html,/data-layer-pair="separate-scales"/);
  assert.match(html,/data-information-layer="regional"/);
  assert.match(html,/data-information-layer="rof"/);
});

await test('STAGE8B-MULTI-LAYER-KEEPS-DISTINCT-SCALES',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/情報1 · 部位別結果/);
  assert.match(html,/情報2 · 主観情報/);
  assert.match(html,/別の尺度/);
  assert.match(html,/主観的な疲労感 0–10/);
  assert.match(html,/部位別の基準100とは別の尺度です/);
});

await test('STAGE8B-MULTI-LAYER-HAS-NO-INTER-LAYER-CAUSAL-ARROW',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  const separator=html.match(/<div class="interpretation-layer-separator"[\s\S]*?<\/div>/)?.[0] || '';
  assert.ok(separator);
  assert.doesNotMatch(separator,/arrow|svg|line|path/i);
  assert.match(html,/どちらか一方をもう一方の原因として扱いません/);
});

await test('STAGE8B-MULTI-LAYER-STILL-FOCUSES-ONE-REGION',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.equal((html.match(/interpretation-body-region is-focus/g)||[]).length,1);
  assert.match(html,/前回 → 今回/);
});

await test('STAGE8B-MULTI-LAYER-HAS-ONE-UNDERSTANDING-NOTE',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.equal((html.match(/この図で分かること/g)||[]).length,1);
  assert.match(html,/部位別表示と走行前後の疲労感の両方に違いがあります/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Stage 8B Multi Layer Mapping',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

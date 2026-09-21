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
      regions:[
        {regionId:'BA-DISP-014',label:'股関節部',value:104,referenceDirection:'ABOVE_REFERENCE'},
        {regionId:'BA-DISP-016',label:'大腿前面',value:99,referenceDirection:'REFERENCE_VICINITY'},
      ],
      rof:{pre:4,post:6,delta:2,direction:'UP'},
    },
    comparison:{
      regionalById:{
        'BA-DISP-014':{comparablePreviousRecordId:'p1',previousValue:101,delta:3,previousDirection:'UP'},
      },
      conditionDifferences:[],
    },
    interpretation:{
      meaning:{
        primaryCode:'CURRENT_SHIFT_WITH_HISTORY',
        secondaryCodes:[],
        focusRegionIds:['BA-DISP-014'],
        availableModes:['visual'],
        factsUsed:[
          {type:'REGION_PREVIOUS_DIFFERENCE',regionId:'BA-DISP-014',previousValue:101,currentValue:104,delta:3,direction:'UP'},
          {type:'ROF_PRE_POST',pre:4,post:6,delta:2,direction:'UP'},
        ],
        boundaryCodes:[],
      },
    },
    safety:{route:'normal'},
    actions:[],
  };
}

await test('VISUAL-MAPPING-CURRENT-SHIFT-MAPS-TO-LOCATE-COMPARE',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/data-visual-pattern="locate-compare"/);
  assert.match(html,/人体図で股関節部を強調/);
  assert.match(html,/前回 → 今回/);
  assert.match(html,/この図で分かること/);
});

await test('VISUAL-MAPPING-CURRENT-SHIFT-EXPLAINS-ONE-REGIONAL-UNDERSTANDING',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/比較可能な前回101から今回104へ、同じ部位内で表示位置が変わっています/);
  assert.match(html,/まず股関節部の位置を確認し、比較可能な前回から今回への違いだけを見ます/);
});

await test('VISUAL-MAPPING-CURRENT-SHIFT-DOES-NOT-MIX-ROF-LANE',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.doesNotMatch(html,/主観的な疲労感 0–10/);
  assert.doesNotMatch(html,/走行前後の疲労感/);
});

await test('VISUAL-MAPPING-CURRENT-SHIFT-KEEPS-SCIENTIFIC-BOUNDARY',()=>{
  const html=renderInterpretationRoom({output:output(),view:'explain',mode:'visual',origin:'result'});
  assert.match(html,/危険・安全・改善・悪化を判断しません/);
  assert.match(html,/別の部位との大小比較にも使いません/);
  assert.doesNotMatch(html,/走るべき|休むべき|原因です|危険です|安全です|危険度が(?:高い|低い)/);
});

const failed=results.filter(x=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Current Shift Visual Mapping',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

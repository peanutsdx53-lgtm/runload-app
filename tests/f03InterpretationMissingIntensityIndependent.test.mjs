import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isPresentFiniteNumber } from '../shared/valueUtilities.js';
const source=fs.readFileSync(new URL('../ui/interpretationRoomPresentation.js',import.meta.url),'utf8');
function extract(startName,endName,exports,mocks){
 const from=source.indexOf('function '+startName+'('),to=source.indexOf('function '+endName+'(',from);
 assert.ok(from>=0 && to>from);
 const scope={finite:isPresentFiniteNumber, ...mocks};
 vm.runInNewContext(source.slice(from,to)+'\nglobalThis.__test='+exports+';',scope);
 return scope.__test;
}
const meta=extract('interpretationFlowCandidateMeta','renderInterpretationFlowStageGuide','interpretationFlowCandidateMeta',{
 candidateRegionLabel:()=> '下腿後面',sensationLabel:()=> '張り',timingLabel:()=> '走行後',
 candidateRegionValue:()=> '101',referenceText:()=> '基準付近',proposalRegionDirection:()=> 'REFERENCE_VICINITY',interpretationFlowQuestionForCandidate:()=> '次に確認',
});
const episode=extract('renderInterpretationFlowActiveEpisodeCard','renderInterpretationFlowActiveRail','renderInterpretationFlowActiveEpisodeCard',{
 interpretationContextRunContextLine:()=> '',escapeHtml:x=>String(x),formatLocalDate:x=>x,
 sensationLabel:()=> '張り',bodyObservationIntensityDisplay:x=>`程度${x}`,number:x=>String(x),
});
test('F03 interpretation meta: missing intensity is unrecorded',()=>{
 for(const value of [null,undefined,'',false])assert.equal(meta({observation:{intensity:value}}).intensity,null);
});
test('F03 interpretation episode: missing intensity not rendered as an actual score',()=>{
 for(const value of [null,undefined,'',false]){
  const html=episode({date:'2026-10-11',row:{value:101},observation:{intensity:value}});
  assert.doesNotMatch(html,/程度0/);
 }
});
test('F03 interpretation: legitimate numeric zero preserved',()=>{
 assert.equal(meta({observation:{intensity:0}}).intensity,0);
 assert.match(episode({date:'2026-10-11',row:{value:101},observation:{intensity:0}}),/程度0/);
});

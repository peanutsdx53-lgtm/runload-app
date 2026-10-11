import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isPresentFiniteNumber } from '../shared/valueUtilities.js';
function sourceFunction(path, begin, next) {
 const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');
 const start=source.indexOf('function '+begin+'('), end=source.indexOf('function '+next+'(',start+1);
 assert.ok(start>-1&&end>start,'Expected production functions '+begin+'/'+next);
 const scope={isPresentFiniteNumber};
 vm.runInNewContext(source.slice(start,end)+'\nglobalThis.__func = '+begin,scope);
 return scope.__func;
}
const rofPost=sourceFunction('../core/selfUnderstandingCore.js','rofPost','runContextFromRecord');
const consultationFatigue=sourceFunction('../screens/consultationScreen.js','consultationFatigue','consultationRegionalSummary');
const exp={record:{id:'run-a',activityType:'run'}};
test('F03/A06 missing ROF is not fatigue zero',()=>{
 for(const post of [null,undefined,'',false])assert.equal(rofPost(new Map([['run-a',{post}]]),'run-a'),null);
 assert.equal(rofPost(new Map(),'run-a'),null);
 assert.equal(rofPost(new Map([['run-a',{post:0}]]),'run-a'),0);
 assert.equal(rofPost(new Map([['run-a',{post:7.5}]]),'run-a'),7.5);
});
test('F03/A06 consultation missing pre/post is not zero',()=>{
 for(const entry of [{pre:null,post:null},{pre:'',post:undefined},{pre:false,post:null}]){
  const result=consultationFatigue({fatigue:{summarizeRun:()=>entry}},exp);
  assert.equal(result.pre,null);assert.equal(result.post,null);assert.equal(result.label,'未記録');
 }
 const valid=consultationFatigue({fatigue:{summarizeRun:()=>({pre:0,post:7.5})}},exp);
 assert.equal(valid.pre,0);assert.equal(valid.post,7.5);
});

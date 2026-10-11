import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isPresentFiniteNumber } from '../shared/valueUtilities.js';
const source=fs.readFileSync(new URL('../screens/mobile/resultScreen.js',import.meta.url),'utf8');
const start=source.indexOf('function renderHighlights('),end=source.indexOf('function renderRegional(',start+1);
assert.ok(start>=0&&end>start);
function htmlOf(value,delta,pre,post) {
 const context={modelCurrent:()=>true,finite:isPresentFiniteNumber,regionRows:()=>[{value}],
 rowInfo:(_record,_all,row)=>({row,delta}),fatigueSnapshot:()=>({pre,post}),
 formatNumber:(n)=>String(n),fmt:(n)=>String(n),escapeHtml:(n)=>String(n)};
 vm.runInNewContext(source.slice(start,end)+'\nglobalThis.__func=renderHighlights;',context);
 return context.__func({services:{},record:{id:'run-a',activityType:'run'},resultRecord:{},allExperiences:[]});
}
test('F03 null region and fatigue values stay unavailable in mobile highlights',()=>{
 const html=htmlOf(null,null,null,null);
 assert.match(html,/0 \/ 12部位に数値/);
 assert.match(html,/今回が比較点/);
 assert.doesNotMatch(html,/疲労感の記録/);
});
test('F03 legitimate numeric zero stays available',()=>{
 const html=htmlOf(0,0,0,0);
 assert.match(html,/1 \/ 12部位に数値/);
 assert.match(html,/1 \/ 12部位で/);
 assert.match(html,/走る前 0 → 走った後 0/);
});

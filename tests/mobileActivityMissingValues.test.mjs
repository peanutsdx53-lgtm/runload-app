import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../ui/mobileWalkJogHistoryUi.js',import.meta.url),'utf8');
function lift(name,scope={}) {
 const start=source.indexOf('function '+name+'(');
 assert.ok(start>=0,name);
 let brace=source.indexOf('{',start),depth=0,end=0;
 for(let i=brace;i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'&&!--depth){end=i+1;break;}}
 const fn=source.slice(start,end);
 return runInNewContext(fn+'\n'+name+';',scope);
}
const fmt=lift('formatNumber');
const dur=lift('formatDurationMinutes');
const seg=lift('formatSegmentDuration');
const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const rows=lift('regionRows',{REGION_LABELS:{R01:'股関節'},escapeHtml:esc,formatNumber:fmt,evidenceLabel:()=> '根拠範囲内'});
for(const value of [null,undefined,'', '  ',NaN,Infinity,-Infinity]){
 test(`missing or nonfinite numeric value is not shown as physical zero: ${String(value)}`,()=>{
  assert.equal(fmt(value), '—');
  assert.equal(dur(value),'—');
  assert.equal(seg(value),'—');
  const markup=rows({regions:[{regionId:'R01',index:value}]});
  assert.ok(markup.includes('<b>—</b>'),markup);
 });
}
for(const value of [0,'0',0.0]){
 test(`genuine zero preserved: ${JSON.stringify(value)}`,()=>{
  assert.equal(fmt(value),'0.00');
  assert.equal(dur(value),'0分');
  assert.equal(seg(value),'0:00');
  assert.ok(rows({regions:[{regionId:'R01',index:value}]}).includes('<b>0.0</b>'));
 });
}
for(const input of [1.125,25.25,-2.5]){
 test(`real numeric values retained: ${input}`,()=>{
  assert.ok(fmt(input).startsWith(input.toFixed(2)));
  assert.ok(rows({regions:[{regionId:'R01',index:input}]}).includes(input.toFixed(1)));
 });
}

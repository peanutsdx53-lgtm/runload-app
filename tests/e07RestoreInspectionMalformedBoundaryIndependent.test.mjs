import test from 'node:test';
import assert from 'node:assert/strict';
import { renderRestoreInspection } from '../ui/restorePreviewPresentation.js';

test('E07: null and corrupt issue entries do not crash the restoration preview', () => {
  const html = renderRestoreInspection({status:'REVIEW_REQUIRED',counts:{records:2},issues:[null,false,[],{}, {severity:'WARNING',message:'読み込み上の注意'}],canRestore:false});
  assert.match(html,/読み込み上の注意/);
  assert.match(html,/>2件</);
});

test('E07: corrupt count values never pretend to be valid numbers', () => {
  const html=renderRestoreInspection({status:'SUPPORTED',counts:{records:'bad',plans:-2,courses:Infinity,profile:'',settings:true,draft:'0'},issues:[],canRestore:false});
  assert.doesNotMatch(html,/NaN件|Infinity件|-2件/);
  for (const label of ['走行・休養記録','予定','保存したコース','プロフィール','設定']) assert.match(html,new RegExp(`${label}</dt><dd>—件`));
  assert.match(html,/入力途中<\/dt><dd>0件/);
});

test('E01: malicious restore filename and issue fields are escaped in both element and attribute contexts', () => {
  const payload='<img src=x onerror="globalThis.__e01Injected=1"><svg onload="alert(1)">';
  const html=renderRestoreInspection({status:'REVIEW_REQUIRED',counts:{records:1},issues:[{severity:'WARNING',message:payload,itemId:payload}],canRestore:true},payload);
  assert.ok(!html.includes('<img src=x onerror='));
  assert.ok(!html.includes('<svg onload='));
  assert.ok(html.includes('&lt;img'));
});

test('E07: legitimate positive and true zero counts are preserved', () => {
  const html=renderRestoreInspection({status:'SUPPORTED',counts:{records:0,plans:3,courses:'2'},issues:[],canRestore:true});
  assert.match(html,/走行・休養記録<\/dt><dd>0件/);
  assert.match(html,/予定<\/dt><dd>3件/);
  assert.match(html,/保存したコース<\/dt><dd>2件/);
});

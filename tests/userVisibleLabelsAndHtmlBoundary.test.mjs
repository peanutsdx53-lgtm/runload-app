import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
const payload = '<img src=x onerror=alert(1)><svg/onload=alert(2)>&"\'';
const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function testFunction(source, func, globals = {}) {
  // Evaluate only the function's definition in a separate test VM. Avoid DOM side effects.
  const begin = source.indexOf(`function ${func}(`);
  assert.ok(begin >= 0, `${func} exists`);
  const opening = source.indexOf('{', begin);
  let level = 0, end = -1;
  for (let i = opening; i < source.length; i++) {
    if (source[i] === '{') level++;
    if (source[i] === '}') { level--; if (level === 0) {end = i+1; break;} }
  }
  assert.ok(end > opening);
  return runInNewContext(source.slice(begin, end) + `\n${func};`, { escapeHtml, ...globals });
}

const timelineSource=read('ui/desktopBodyTimelineWorkspace.js');
const mobileSource=read('ui/mobileWalkJogHistoryUi.js');
const selectorMarkup = testFunction(timelineSource, 'selectorMarkup', {
  cardSummary: () => ({date: payload, facts: payload, current:false})
});
const labelCases=['R01','R02','R11','R12','R99',payload];
for (const date of labelCases) {
  test(`desktop timeline sanitizes DOM-derived strings: ${date.slice(0,20)}`, () => {
    const render = testFunction(timelineSource, 'selectorMarkup', {cardSummary: () => ({date,facts:payload,current:false})});
    const html=render([{}],0);
    assert.ok(html.includes(escapeHtml(payload)));
    assert.ok(html.includes(escapeHtml(date)));
    assert.ok(!html.includes('<img src=x'));
    assert.ok(!html.includes('<svg/onload'));
  });
}
for (const regionId of labelCases) {
  test(`mobile region labels do not render internal IDs: ${regionId.slice(0,20)}`,() => {
    const regionRows=testFunction(mobileSource,'regionRows', {REGION_LABELS: {R01:'股関節',R02:'殿部',R11:'中足部',R12:'前足部'},formatNumber: value=>Number.isFinite(Number(value)) ? Number(value).toFixed(1) : "—",evidenceLabel: () => '原典', });
    const html=regionRows({regions:[{regionId,index:100,evidenceTier:'SOURCE_AUTHORED_MODEL'}]});
    if(regionId in {R01:1,R02:1,R11:1,R12:1}) assert.ok(html.includes('strong'));
    assert.ok(!html.includes('<small>R01</small>'));
    assert.ok(!html.includes(`<small>${regionId}</small>`));
    assert.ok(!html.includes('<img src=x'));
  });
}
test('visible activity title is Japanese and internal label not leaked',()=>{
  assert.ok(!mobileSource.includes('SMARTPHONE ACTIVITY'));
  assert.ok(!mobileSource.includes('既存ランニングCurrentとは'));
  assert.ok(mobileSource.includes('活動別記録'));
});
test('date and fact insertions in timeline both escapeHtml',()=>{
  assert.ok(timelineSource.includes('${escapeHtml(summary.date)}</strong><span>${escapeHtml(summary.facts)}</span>'));
});

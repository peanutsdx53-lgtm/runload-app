import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../ui/mobileNavigationPolicy.js',import.meta.url),'utf8');
const a=source.indexOf('function setAboutReturnToSettings() {');
const b=source.indexOf('function removeMoreNavigationItem()',a);
assert.ok(a>=0&&b>a,'production about navigation policy present');
const fnCode=source.slice(a,b);
function runtime(initial,screen=true){
  const writes=[];
  const link=(isTop)=>{
    let href=initial;let text='← その他へ戻る';
    return {
      classList:{contains:name=>isTop&&name==='mobile-topbar__back'},
      getAttribute(name){return name==='href'?href:null},
      setAttribute(name,value){assert.equal(name,'href');writes.push(['href',value]);href=value},
      get textContent(){return text},
      set textContent(value){writes.push(['text',value]);text=value},
    };
  };
  const links=[link(true),link(false)];
  const document={querySelector:selector=>selector==='.screen--about'&&screen?{}:null,querySelectorAll:()=>links};
  const ctx={document,mobileMatches:()=>true};
  vm.runInNewContext(`${fnCode}\nthis.invoke=setAboutReturnToSettings;`,ctx,{timeout:1000});
  return {invoke:ctx.invoke,writes,links};
}

test('E01 mobile about link rewrite changes both links once and is idempotent',()=>{
  const x=runtime('#/more');x.invoke();assert.equal(x.writes.length,4);
  assert.equal(x.links[0].getAttribute('href'),'#/settings');
  assert.equal(x.links[1].getAttribute('href'),'#/settings');
  const first=x.writes.length;x.invoke();assert.equal(x.writes.length,first,'a second observer callback must not mutate its observed DOM');
});
test('E01 mobile about repeated observer callbacks cannot self-trigger through unchanged text',()=>{
  const x=runtime('#/settings');x.invoke();
  assert.deepEqual(x.writes.map(row=>row[0]),['text','text']);
  let previous=x.writes.length;
  for(let i=0;i<20;i++){x.invoke();assert.equal(x.writes.length,previous,'identical render must produce zero mutations')}
});
test('E01 non-about route must leave navigation unchanged',()=>{
  const x=runtime('#/more',false);x.invoke();assert.equal(x.writes.length,0);
});

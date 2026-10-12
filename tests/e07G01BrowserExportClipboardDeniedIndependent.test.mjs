import test from 'node:test';
import assert from 'node:assert/strict';
import { copyText, downloadJsonText } from '../ui/interactions/browserUtilities.js';
import { bindDataManagement } from '../ui/interactions/settingsInteractions.js';

async function scoped(values, fn) {
  const old=Object.fromEntries(Object.keys(values).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  for(const [key,value] of Object.entries(values)) Object.defineProperty(globalThis,key,{configurable:true,value,writable:true});
  try { return await fn(); }
  finally { for(const [key,d] of Object.entries(old)) if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key]; }
}
function copyHarness(kind) {
  const state={removed:0,copied:0},textarea={value:'',style:{},setAttribute(){},select(){},setSelectionRange(){},remove(){state.removed++;}};
  const navigator={};
  if(kind==='clipboard')Object.defineProperty(navigator,'clipboard',{get(){throw new DOMException('denied','SecurityError')}});
  if(kind==='writeText')Object.defineProperty(navigator,'clipboard',{value:Object.defineProperty({},'writeText',{get(){throw new DOMException('denied','SecurityError')}})});
  const document={createElement(){return textarea},body:{appendChild(){}},execCommand(){state.copied++;if(kind==='execCommand')throw new DOMException('denied','SecurityError');return true}};
  return {state,navigator,document};
}
for(const kind of ['clipboard','writeText'])test('E07 denied '+kind+' property uses fallback without crash',async()=>{
  const h=copyHarness(kind);
  await scoped({document:h.document,navigator:h.navigator},async()=>assert.doesNotReject(copyText('private consultation text')));
  assert.equal(h.state.copied,1);assert.equal(h.state.removed,1);
});
test('E07 fallback clipboard failure always removes sensitive textarea',async()=>{
  const h=copyHarness('execCommand');
  await scoped({document:h.document,navigator:h.navigator},async()=>assert.rejects(copyText('private consultation text')));
  assert.equal(h.state.removed,1);
});
function downloadHarness(failure) {
 const state={clicked:0,removed:0,revoked:0},link={href:'',download:'',click(){state.clicked++;if(failure==='click')throw new DOMException('denied','SecurityError')},remove(){state.removed++}};
 const URL={createObjectURL(){if(failure==='createURL')throw new DOMException('denied','SecurityError');return 'blob:mock'},revokeObjectURL(){state.revoked++}};
 const document={createElement(){return link},body:{appendChild(){} }};
 return {state,URL,document};
}
test('G01 disabled Blob URL cannot initiate a false file export',async()=>{
  const h=downloadHarness('createURL');
  await scoped({document:h.document,URL:h.URL},async()=>assert.throws(()=>downloadJsonText('backup.json','{}'),/denied/));
  assert.equal(h.state.clicked,0);
});
test('G01 click denial releases temporary link and object URL',async()=>{
  const h=downloadHarness('click');
  await scoped({document:h.document,URL:h.URL},async()=>assert.throws(()=>downloadJsonText('backup.json','{}'),/denied/));
  assert.equal(h.state.removed,1);assert.equal(h.state.revoked,1);
});
test('G01 blocked browser download displays an error instead of success',async()=>{
  const h=downloadHarness('createURL'),actions={},message={innerHTML:'',hidden:false,setAttribute(){},focus(){}};
  const document={...h.document,querySelector(selector){
    if(selector==='[data-action="export-backup"]')return {addEventListener(type,fn){actions[type]=fn}};
    if(selector==='[data-data-management-messages]')return message;
    return null;
  },getElementById(){return null}};
  const services={storage:{backup:{tryExportBackupText(){return {ok:true,text:'{"user":1}'}}}}};
  await scoped({document,URL:h.URL},async()=>{
    bindDataManagement({services,router:{},rerender(){},platformRuntime:null});
    assert.doesNotThrow(()=>actions.click());
  });
  assert.match(message.innerHTML,/作成できませんでした/);
  assert.doesNotMatch(message.innerHTML,/作成しました/);
});

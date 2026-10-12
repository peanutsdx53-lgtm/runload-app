import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationServices, createMemoryStorage } from '../core/appCore.js';
import { bindDataManagement } from '../ui/interactions/settingsInteractions.js';

const deny = () => { throw Object.assign(new Error('File access revoked'), { name: 'SecurityError' }); };
const backup = () => createApplicationServices({ storage: createMemoryStorage() }).storage.backup;
const baseFile = () => ({ size: 100, text: async () => '{"formatVersion":"broken","data":{}}' });

for (const key of ['text', 'size']) {
  test('E07 backup ' + key + ' getter revoked is controlled BLOCKED', async () => {
    const f = baseFile(); Object.defineProperty(f, key, { get: deny });
    let result;
    await assert.doesNotReject(async () => { result = await backup().inspectBackupFile(f); });
    assert.equal(result.canRestore, false);
    assert.equal(result.status, 'RESTORE_BLOCKED');
  });
}
test('E07 backup file lacks size must not consume unbounded bytes', async () => {
  let reads = 0;
  const file = { text: async () => { reads++; return '{"data":{}}'; } };
  const inspection = await backup().inspectBackupFile(file);
  assert.equal(inspection.canRestore, false);
  assert.equal(reads, 0);
});
test('E07 backup size denied after initial read remains blocked without consuming file', async () => {
  const f = baseFile(); let reads = 0;
  Object.defineProperty(f, 'size', { get: deny });
  f.text = async () => { reads++; return '{}'; };
  await assert.doesNotReject(async () => { assert.equal((await backup().inspectBackupFile(f)).canRestore, false); });
  assert.equal(reads, 0);
});
function ui() {
  const originals = new Map(['window','document'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  const cb = new Map();
  const input = { value:'file', files:[], addEventListener(name,fn){ cb.set(name,fn); } };
  const btn = { disabled:false, fn:null, addEventListener(_,fn){this.fn=fn},click(){this.fn();} };
  const host = { innerHTML:'', textContent:'', querySelector(sel){
    if(sel==='[data-action="confirm-restore-backup"]')return btn;
    if(sel==='[data-action="cancel-restore-preview"]')return { addEventListener(_name,fn){cb.set('cancel',fn)} };
    if(sel==='[tabindex]')return { focus(){} };
    return null;
  }};
  const messages = { innerHTML:'', textContent:'', hidden:false, setAttribute(){},focus(){} };
  globalThis.document = { querySelector(sel){
    if(sel==='[data-restore-preview-host]')return host;
    if(sel==='[data-action="restore-backup"]')return input;
    if(sel==='[data-data-management-messages]')return messages;
    return null;
  } };
  globalThis.window = { confirm:()=>true };
  const restored = []; const services={storage:{backup:{
    async inspectBackupFile(){return {status:'SUPPORTED',canRestore:true,counts:{},issues:[]};},
    restoreInspectedBackup(){restored.push('called');return {ok:false,message:'not restoring'};}
  }}};
  bindDataManagement({ services, router:{}, rerender(){}, platformRuntime:null });
  return { input, btn, host, messages, restored,cb, cleanup(){for(const [k,d] of originals)if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];} };
}
test('G01 denied FileList getter on initial backup selection cannot leak exception', async()=>{
  const h=ui();try{Object.defineProperty(h.input,'files',{get:deny,configurable:true});await assert.doesNotReject(async()=>await h.cb.get('change')({target:h.input}));assert.deepEqual(h.restored,[]);}finally{h.cleanup()}
});
test('G01 denied FileList getter after inspection invalidates approval', async()=>{
  const h=ui();try{const f={name:'backup.json'};h.input.files=[f];await h.cb.get('change')({target:h.input});Object.defineProperty(h.input,'files',{get:deny,configurable:true});assert.doesNotThrow(()=>h.btn.click());assert.deepEqual(h.restored,[]);}finally{h.cleanup()}
});
test('G01 denied File input reset cannot leave restored approval active', async()=>{
  const h=ui();try{const f={name:'backup.json'};h.input.files=[f];await h.cb.get('change')({target:h.input});Object.defineProperty(h.input,'value',{set:deny,configurable:true});assert.doesNotThrow(()=>h.cb.get('cancel')());assert.doesNotThrow(()=>h.btn.click());assert.deepEqual(h.restored,[]);}finally{h.cleanup()}
});
test('E07 invalid backup filename getter does not interrupt safe preview', async()=>{
  const h=ui();try{const f={};Object.defineProperty(f,'name',{get:deny});h.input.files=[f];await assert.doesNotReject(async()=>await h.cb.get('change')({target:h.input}));assert.deepEqual(h.restored,[]);}finally{h.cleanup()}
});

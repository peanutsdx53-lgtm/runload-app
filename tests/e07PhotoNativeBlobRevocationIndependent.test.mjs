import test from 'node:test';
import assert from 'node:assert/strict';
import { savePhotoMemo, clearAllPhotoMemos } from '../ui/mobilePhotoMemoStore.js';
const deny = () => { throw Object.assign(new Error('permission revoked'),{name:'SecurityError'}); };
function jpeg(){return new Blob([new Uint8Array([255,216,255,217])],{type:'image/jpeg'});}
for(const key of ['size','type'])test('E07 denied photo Blob.'+key+' getter cannot crash asynchronous save',async()=>{
 const blob=jpeg();Object.defineProperty(blob,key,{get:deny});
 let result;await assert.doesNotReject(async()=>{result=await savePhotoMemo({blob,width:1,height:1})});
 assert.equal(result.ok,false);
});
test('E07 denied global indexedDB getter yields controlled photo cleanup failure',async()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');
 try{
 Object.defineProperty(globalThis,'indexedDB',{configurable:true,get:deny});
 await assert.doesNotReject(async()=>assert.equal(await clearAllPhotoMemos(),false));
 }finally{if(old)Object.defineProperty(globalThis,'indexedDB',old);else delete globalThis.indexedDB;}
});
test('G01 invalid photo MIME and empty Blob retain original safe refusal',async()=>{
 const png=new Blob([new Uint8Array([1,2,3])],{type:'image/png'});
 const empty=new Blob([],{type:'image/jpeg'});
 assert.deepEqual(await savePhotoMemo({blob:png,width:1,height:1}),{ok:false,reason:'image'});
 assert.deepEqual(await savePhotoMemo({blob:empty,width:1,height:1}),{ok:false,reason:'image'});
});

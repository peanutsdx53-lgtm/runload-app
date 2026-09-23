import assert from 'node:assert/strict';
import {
  MOBILE_LAYOUT_QUERY,
  matchesMobileLayout,
  resolveDefaultEntryScreen,
  resolveViewportDefaultEntryScreen,
} from '../ui/deviceLayout.js';

const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

await test('DEVICE-ENTRY-USES-EXISTING-MOBILE-BREAKPOINT',()=>{
  assert.equal(MOBILE_LAYOUT_QUERY,'(max-width: 54.99rem)');
});

await test('DEVICE-ENTRY-MOBILE-OPENS-RUN-LAUNCH',()=>{
  assert.equal(resolveDefaultEntryScreen({matchesMobile:true}),'start');
});

await test('DEVICE-ENTRY-DESKTOP-OPENS-HOME',()=>{
  assert.equal(resolveDefaultEntryScreen({matchesMobile:false}),'home');
});

await test('DEVICE-ENTRY-MATCHMEDIA-TAKES-PRIORITY',()=>{
  assert.equal(matchesMobileLayout({matchMediaFn:()=>({matches:true}),innerWidth:1600}),true);
  assert.equal(resolveViewportDefaultEntryScreen({matchMediaFn:()=>({matches:false}),innerWidth:320}),'home');
});

await test('DEVICE-ENTRY-FALLBACK-WIDTH-MATCHES-LAYOUT-BOUNDARY',()=>{
  assert.equal(matchesMobileLayout({matchMediaFn:null,innerWidth:879}),true);
  assert.equal(matchesMobileLayout({matchMediaFn:null,innerWidth:880}),false);
});

const failed=results.filter((item)=>item.status==='FAIL');
console.log(JSON.stringify({suite:'Device Entry',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

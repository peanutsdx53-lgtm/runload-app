import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=(rel)=>fs.existsSync(path.join(root,rel));
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

await test('RETIRED-ACTIVATION-SCREEN-REMOVED',()=>{
  assert.equal(exists('screens/activationScreen.js'),false);
});

await test('LEGACY-ACTIVATION-URL-REDIRECT-RETAINED',()=>{
  const app=read('app.js');
  assert.match(app,/activation:\s*\(parameters\)\s*=>/);
  assert.match(app,/screen:\s*"interpretation-room"/);
});

await test('GLOBAL-FEATURE-MENU-DOES-NOT-DUPLICATE-UNDERSTANDING-ENTRY',()=>{
  const architecture=read('ui/screenArchitecture.js');
  const start=architecture.indexOf('export const FEATURE_DESTINATION_GROUPS');
  const end=architecture.indexOf('const WORKSPACE_BY_SCREEN',start);
  const block=architecture.slice(start,end);
  assert.ok(start>=0 && end>start);
  assert.doesNotMatch(block,/interpretation-room|結果を理解する/);
});

await test('CONTEXTUAL-UNDERSTANDING-ENTRIES-REMAIN',()=>{
  assert.match(read('screens/homeScreen.js'),/結果を理解する/);
  assert.match(read('screens/resultScreen.js'),/今回の結果を理解する/);
  assert.match(read('screens/historyScreen.js'),/この記録の結果を理解する/);
  assert.match(read('screens/bodyPartDetailScreen.js'),/この部位の結果を理解する/);
});

await test('PWA-AND-RUNTIME-DROP-RETIRED-SCREEN',()=>{
  assert.doesNotMatch(read('service-worker.js'),/screens\/activationScreen\.js/);
  assert.doesNotMatch(read('RUNTIME_SHA256SUMS.txt'),/screens\/activationScreen\.js/);
});

await test('RETIRED-ACTIVATION-STYLES-REMOVED',()=>{
  const screens=read('styles/screens.css');
  const mobile=read('styles/prototype-mobile-parity.css');
  assert.doesNotMatch(screens,/\.activation-(?:intro|grid|source|card)|\.result-activation-hub/);
  assert.doesNotMatch(mobile,/prototype-parity--activation|\.activation-link(?:-wrap)?/);
});

await test('FINAL-CLEANUP-PWA-REVISION-IS-PRESENT',()=>{
  assert.match(read('service-worker.js'),/interpretation-final-cleanup-v1/);
});

await test('PUBLIC-UI-OMITS-INTERNAL-INTERPRETATION-NAME',()=>{
  const files=[
    'ui/interpretationRoomPresentation.js',
    'ui/screenArchitecture.js',
    'ui/appShell.js',
    'screens/homeScreen.js',
    'screens/resultScreen.js',
    'screens/historyScreen.js',
    'screens/bodyPartDetailScreen.js',
    'screens/simulationScreen.js',
  ];
  const combined=files.map(read).join('\n');
  assert.doesNotMatch(combined,/RunLoad解釈|RUNLOAD INTERPRETATION/);
});

const failed=results.filter((x)=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Final Cleanup',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

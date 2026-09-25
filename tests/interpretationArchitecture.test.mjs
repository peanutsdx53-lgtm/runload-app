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

await test('LEGACY-ACTIVATION-ALIAS-REMOVED',()=>{
  const app=read('app.js');
  assert.doesNotMatch(app,/activation:\s*\(parameters\)\s*=>/);
  assert.doesNotMatch(app,/#\/activation/);
});

await test('GLOBAL-FEATURE-MENU-DOES-NOT-DUPLICATE-UNDERSTANDING-ENTRY',()=>{
  const architecture=read('ui/screenArchitecture.js');
  const start=architecture.indexOf('export const FEATURE_DESTINATION_GROUPS');
  const end=architecture.indexOf('function route(',start);
  const block=architecture.slice(start,end);
  assert.ok(start>=0 && end>start);
  assert.doesNotMatch(block,/screen:\s*"interpretation-room"|label:\s*"結果を理解する"/);
});

await test('CONTEXTUAL-UNDERSTANDING-ENTRIES-REMAIN',()=>{
  assert.match(read('screens/homeScreen.js'),/結果を整理する/);
  assert.match(read('screens/resultScreen.js'),/結果を整理/);
  assert.match(read('screens/historyScreen.js'),/この記録の結果を整理する/);
  assert.match(read('screens/bodyPartDetailScreen.js'),/この部位の結果を整理する/);
});

await test('PWA-DROPS-RETIRED-SCREEN',()=>{
  assert.doesNotMatch(read('service-worker.js'),/screens\/activationScreen\.js/);
});

await test('RETIRED-ACTIVATION-STYLES-REMOVED',()=>{
  const screens=read('styles/screens.css');
  const mobile=read('styles/mobile.css');
  assert.doesNotMatch(screens,/\.activation-(?:intro|grid|source|card)|\.result-activation-hub/);
  assert.doesNotMatch(mobile,/screen-layout--activation|\.activation-link(?:-wrap)?/);
});

await test('UNUSED-SCREEN-ARCHITECTURE-EXPORTS-REMOVED',()=>{
  const architecture=read('ui/screenArchitecture.js');
  assert.doesNotMatch(architecture,/renderResultWorkspaceNavigation|resolveScreenWorkspace|renderManagementBoundary/);
  assert.match(architecture,/renderRecordsWorkspaceNavigation/);
});

await test('PWA-CACHE-NAME-IS-STABLE',()=>{
  assert.match(read('service-worker.js'),/const CACHE_NAME = "running-record-app-runtime-v1";/);
  assert.doesNotMatch(read('service-worker.js'),/desktop-final-visual-audit|20260922-37/);
});

await test('INTERPRETATION-LABEL-IS-USED-ONLY-INSIDE-THE-INTERPRETATION-WORKSPACE',()=>{
  const room=read('ui/interpretationRoomPresentation.js');
  assert.match(room,/今回の結果の解釈/);
  assert.match(room,/RESULT INTERPRETATION/);
  const outside=[
    'ui/screenArchitecture.js',
    'ui/appShell.js',
    'screens/homeScreen.js',
    'screens/resultScreen.js',
    'screens/historyScreen.js',
    'screens/bodyPartDetailScreen.js',
    'screens/simulationScreen.js',
  ].map(read).join('\n');
  assert.doesNotMatch(outside,/今回の結果の解釈|RESULT INTERPRETATION|解釈エンジン/);
});

const failed=results.filter((x)=>x.status==='FAIL');
console.log(JSON.stringify({suite:'Interpretation Architecture',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const INCLUDED=['core','ui','screens','shared'];
function traverse(dir){return readdirSync(path.join(ROOT,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?traverse(path.posix.join(dir,e.name)):(e.name.endsWith('.js')?[path.posix.join(dir,e.name)]:[]));}
const modules=['app.js','service-worker.js',...INCLUDED.flatMap(traverse)];
const legacyMarkers=/legacy|deprecated|obsolete|migration|migrat\w*|shim|v3\.0|old[_-]?(?:model|format|version|schema)/ig;
const REQUIRED=new Map([
 ['core/internal/modelSupport.js',2],
 ['core/internal/primaryModelResults.js',4],
 ['core/internal/recordWorkflow.js',1],
 ['core/internal/restoreInspection.js',1],
]);
test('B-03: exhaustive executable JavaScript legacy marker scan has only documented protected paths',()=>{
 assert.equal(new Set(modules).size,modules.length);
 assert.ok(modules.length>=210,'Unexpected runtime module contraction');
 const actual=new Map();
 for(const file of modules){
   const source=readFileSync(path.join(ROOT,file),'utf8');
   const matches=source.match(legacyMarkers)||[];
   if(matches.length)actual.set(file,matches.length);
 }
 assert.deepEqual([...actual].sort(),[...REQUIRED].sort(),
   'A new or altered historic/obsolete compatibility path must receive explicit authority review');
 assert.equal(existsSync(path.join(ROOT,'docs/MOBILE_RELEASE_HISTORY.md')),false,
   'Superseded release diary must remain in Git/history archive, not active application source');
});
test('B-03: original v3.0 compatibility is read-only; current engine is explicitly v3.1',()=>{
 const engine=readFileSync(path.join(ROOT,'core/internal/primaryModelEngine.js'),'utf8');
 const results=readFileSync(path.join(ROOT,'core/internal/primaryModelResults.js'),'utf8');
 const restore=readFileSync(path.join(ROOT,'core/internal/restoreInspection.js'),'utf8');
 const workflow=readFileSync(path.join(ROOT,'core/internal/recordWorkflow.js'),'utf8');
 const prior=readFileSync(path.join(ROOT,'core/internal/modelSupport.js'),'utf8');
 assert.match(engine,/MODEL_VERSION\s*=\s*['"]runload-primary-regional-reference100-v3\.1['"]/);
 assert.doesNotMatch(engine,/reference100-v3\.0/);
 assert.match(results,/function validatePrimaryRegionalV2ResultRecord\(item=\{\},\s*\{allowLegacy=false\}=\{\}\)/);
 assert.match(results,/allowLegacy\s*&&\s*item\.model_version===PREVIOUS_REGIONAL_V3_MODEL_VERSION/);
 assert.match(restore,/allowLegacy:\s*true/);
 assert.match(workflow,/allowLegacy:\s*isPriorResult/);
 assert.match(prior,/modelVersion:\s*['"]runload-primary-regional-reference100-v3\.0['"]/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Source is read directly from this checked-out Git tree; historic archives, citations,
// third-party assets, documentation, and tests are excluded from runtime-stub detection.
const ROOT=path.resolve(import.meta.dirname,'..');
const RUNTIME_ROOTS=['core','shared','screens','ui','app.js','index.html','service-worker.js'];
function listFiles(p){if(!fs.existsSync(p))return[];const stat=fs.statSync(p);if(stat.isDirectory())return fs.readdirSync(p).flatMap(n=>listFiles(path.join(p,n)));return /\.(?:js|mjs|html)$/.test(p)?[p]:[];}
const paths=RUNTIME_ROOTS.flatMap(r=>listFiles(path.join(ROOT,r)));
const markers=[
 {id:'TODO_FIXME',pattern:/\b(?:TODO|FIXME|TBD|XXX)\b/gi},
 {id:'UNIMPLEMENTED',pattern:/\b(?:UNIMPLEMENTED|NOT_IMPLEMENTED|NOT_IMPLEMENTED_YET)\b/gi},
 {id:'STUB_COMMENT',pattern:/\b(?:temporary stub|implementation pending|implement later|not yet implemented)\b/gi},
 {id:'JAPANESE_UNIMPLEMENTED',pattern:/(?:仮実装|仮置き|ダミー実装|今後実装予定|実装予定)/g},
];
// These are UI form placeholders, not code stubs; reject only runtime implementation markers.
test('B-02: all live JS/HTML source files have no unresolved temporary implementation markers',()=>{
 assert.ok(paths.length>=200,`incomplete source traversal (${paths.length})`);
 const findings=[];
 for(const p of paths){const s=fs.readFileSync(p,'utf8');for(const m of markers){for(const match of s.matchAll(m.pattern)){
  const line=s.slice(0,match.index).split('\n').length;
  findings.push({file:path.relative(ROOT,p),line,code:m.id,match:match[0]});
 }}}
 assert.deepEqual(findings,[],'Review every actual temporary-stub marker before PASS');
});

test('B-02: explicit no-reference state is a valid nonnumerical state, not an invented numerical placeholder',()=>{
 const src=fs.readFileSync(path.join(ROOT,'ui/interpretationRoomPresentation.js'),'utf8');
 assert.match(src,/REFERENCE_NOT_READY/);
 assert.match(src,/数値には未使用/);
});

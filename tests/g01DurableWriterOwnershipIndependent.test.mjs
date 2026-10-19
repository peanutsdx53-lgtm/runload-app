import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DIRS=['core','ui','screens','shared'];
const descend=dir=>fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?descend(`${dir}/${e.name}`):e.name.endsWith('.js')?[`${dir}/${e.name}`]:[]);
const modules=['app.js','service-worker.js',...DIRS.flatMap(descend)];
const COUNT=new Map([
 ['core/internal/platformInfrastructure.js',4],
 ['ui/mobileAchievements.js',1],
 ['ui/mobileStorageUtilities.js',1],
 ['ui/mobileWalkJogRecordStore.js',1],
 ['ui/flowSessionState.js',2],
 ['ui/mobileHomeReturnTransition.js',1],
 ['ui/mobileWalkJogMeasurementWiring.js',1],
 ['ui/interactions/mobileHomeLayoutState.js',3],
 ['ui/mobileHomeGridUtilities.js',2],
 // Reviewed UI-only home card preferences writer; excludes record/GPS/backup schemas.
 ['ui/mobileAppRuntime.js',1],
 ['ui/recordInputWorkspace.js',3],
 ['ui/runMeasurementState.js',1],
 ['ui/mobileWalkJogGpsQualityUi.js',1],
 ['ui/screenTutorial.js',1],
 ['ui/bootRecovery.js',1],
]);
test('G01 durable writer census: unexpected JS setItem writers require explicit safety review',()=>{
 const seen=new Map();for(const p of modules){const content=fs.readFileSync(path.join(ROOT,p),'utf8');const match=[...content.matchAll(/\.setItem\s*\(/g)];if(match.length)seen.set(p,match.length)}
 assert.deepEqual([...seen].sort(),[...COUNT].sort());
});
test('G01 protected editor lock, transaction preflight and non-destructive fallback',()=>{
 const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
 const lock=read('ui/platformBootstrap.js');
 assert.ok(lock.indexOf('await acquireSingleEditorSession()')<lock.indexOf('await loadPlatformStyles(platform)'));
 assert.ok(lock.indexOf('if (!editorSession.ok)')<lock.indexOf('await import("../app.js")'));
 const trans=read('core/internal/platformInfrastructure.js');
 assert.match(trans,/STORAGE_TRANSACTION_CONCURRENT_CHANGE/);
 assert.match(trans,/restoreSnapshot\(/);
 assert.match(trans,/targetStorage\.getItem\(change\.key\)/);
 const achievements=read('ui/mobileAchievements.js');
 assert.match(achievements,/readStateForWrite/);
 assert.match(achievements,/writeStateSafely/);
 assert.match(achievements,/return writeStateSafely\(snapshot\) \? unseen : \[\]/);
 const tutorial=read('ui/screenTutorial.js');
 assert.match(tutorial,/storage\.getItem\(SCREEN_TUTORIAL_STORAGE_KEY\) !== oldRaw/);
});

test('G01 new home UI preference writes only the isolated key and validates concurrency',()=>{
 const source=fs.readFileSync(path.join(ROOT,'ui/mobileAppRuntime.js'),'utf8');
 assert.match(source,/HOME_CARD_PREFS_KEY = "runload-ui-home-summary-v1"/);
 assert.match(source,/current\.raw !== snapshotRaw/);
 assert.match(source,/localStorage\.setItem\(HOME_CARD_PREFS_KEY,/);
 assert.match(source,/保存できませんでした/);
});

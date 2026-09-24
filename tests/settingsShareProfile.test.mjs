import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const results=[];
async function test(id,fn){try{await fn();results.push({id,status:'PASS'});}catch(error){results.push({id,status:'FAIL',message:error?.stack||String(error)});}}

await test('SETTINGS-OFFERS-ONLY-SIMPLE-AND-NATURAL-THEMES',()=>{
  const source=read('ui/appSettings.js');
  const block=source.match(/export const COLOR_THEME_OPTIONS = Object\.freeze\(\[[\s\S]*?\]\);/)?.[0]||'';
  assert.match(block,/value: "standard", label: "シンプル"/);
  assert.match(block,/value: "natural", label: "ナチュラル"/);
  assert.doesNotMatch(block,/value: "(?:green|blue|orange)"/);
  assert.doesNotMatch(source,/green: "#e7f4df"|blue: "#edf3f7"|orange: "#f7f0e5"/);
});

await test('RETIRED-THEME-PALETTES-ARE-REMOVED',()=>{
  const css=read('styles/tokens.css');
  assert.doesNotMatch(css,/rl-color-(?:green|blue|orange)/);
  assert.match(css,/html\.rl-color-natural/);
});

await test('SETTINGS-FRAMES-PROFILE-AS-OPTIONAL-SHARE-INFORMATION',()=>{
  const source=read('screens/settingsScreen.js');
  assert.match(source,/共有用プロフィール/);
  assert.match(source,/共有用の任意情報です。/);
  assert.match(source,/共有プロフィールの基本情報/);
  assert.match(source,/性別（任意）/);
  assert.match(source,/>男性<\/option>/);
  assert.match(source,/>女性<\/option>/);
  assert.doesNotMatch(source,/安全判断の係数|数値の補正には使いません/);
});

await test('CONSULTATION-READS-PROFILE-BUT-DOES-NOT-AUTO-SHARE-IT',()=>{
  const source=read('screens/consultationScreen.js');
  assert.match(source,/function consultationProfileSummary\(profile = \{\}\)/);
  assert.match(source,/PROFILE_AGE_BAND_OPTIONS/);
  assert.match(source,/services\.storage\.profile\.load\(\)/);
  assert.match(source,/key: "profile", label: "共有用プロフィール"/);
  assert.match(source,/checked: false, available: profile\.available/);
  assert.match(source,/身長 /);
  assert.match(source,/体重 /);
  assert.match(source,/年齢帯 /);
  assert.match(source,/性別 男性/);
  assert.match(source,/性別 女性/);
});

const failed=results.filter((item)=>item.status==='FAIL');
console.log(JSON.stringify({suite:'Settings Share Profile',total:results.length,passed:results.length-failed.length,failed:failed.length,status:failed.length?'FAIL':'PASS',results},null,2));
if(failed.length)process.exitCode=1;

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { officialRofJDescriptor } from '../core/rofJCore.js';
import {buildRofValueMeaning} from '../core/interpretationCore.js';
import {rofJGuidanceForSelection,rofJSelectionDescriptor,ROF_J_AUTHOR_CONFIRMED_ANCHORS} from '../core/rofJAuthorConfirmedScale.js';

const paths=[
 'ui/interactions/recordInputInteractions.js', 'ui/interactions/mobileRunMeasurementInteractions.js',
 'screens/resultScreen.js', 'screens/desktop/resultScreen.js',
 'ui/mobileRofJPresentation.js', 'ui/desktopRofJPresentation.js',
];
const cases=[0,2,3,4,5,6,7,8,10];
for (const value of cases) {
 const canonical=rofJSelectionDescriptor(value), meaning=buildRofValueMeaning(value);
 assert.equal(meaning.descriptor,canonical,`interpretation ${value}`);
 assert.equal(rofJGuidanceForSelection(value).length>0,true,`guidance ${value}`);
 assert.equal(officialRofJDescriptor(value),[0,5,10].includes(value)?canonical:null,`official ${value}`);
}
assert.deepEqual([...ROF_J_AUTHOR_CONFIRMED_ANCHORS].map(x=>x.position).sort((a,b)=>a-b),[0,2.5,5,7.5,10]);
for(const path of paths){
 const src=fs.readFileSync(path,'utf8');
 assert.ok(!src.includes('ROF_J_DESCRIPTOR_MAP'),`${path}: legacy map`);
 assert.ok(!src.includes('officialRofJDescriptor'),`${path}: rendering old exact-only function`);
 assert.match(src,/rofJGuidanceForSelection|rofJSelectionDescriptor/,`${path}: not linked to canonical`);
}
console.log('ROFJ_UNIFIED_SEMANTICS=9/9 PASS; CROSS_LAYER_MODULES=6/6 PASS');

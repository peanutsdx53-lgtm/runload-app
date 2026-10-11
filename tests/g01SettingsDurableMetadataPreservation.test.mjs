import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeAppSettings, normalizeAppSettings} from '../ui/appSettings.js';

const durable = Object.freeze({
  termsAcceptedVersion:'terms-20260930-v1',termsAcceptedAt:'2026-10-10T12:00:00.000Z',
  mobileOnboardingVersionSeen:'mobile-onboarding-20260930-v3',
  guideVersionSeen:'guide-v2',
  savedShoes:[{id:'shoe-a',label:'いつもの靴'}, {id:'shoe-b',label:'ほかの靴'}],
});
test('G01: toggling appearance may not erase saved shoes, legal consent or onboarding/guide flags',()=>{
  const old = {...durable, colorTheme:'standard', textSize:'standard', obsoleteSetting:'REMOVE_ME'};
  const next=mergeAppSettings(old,{colorTheme:'natural',textSize:'large',obsoleteFromForm:'REJECT'});
  for(const [key,value] of Object.entries(durable))assert.deepEqual(next[key],value,key);
  assert.equal(next.colorTheme,'natural');assert.equal(next.textSize,'large');
  assert.equal(Object.hasOwn(next,'obsoleteSetting'),false);
  assert.equal(Object.hasOwn(next,'obsoleteFromForm'),false);
  assert.equal(Object.hasOwn(normalizeAppSettings(old),'savedShoes'),false,
    'display-only normalization must remain restricted to display settings');
});
test('G01: malformed but existing auxiliary values are not overwritten by unrelated display changes',()=>{
  for(const savedShoes of [null,'bad-shoes',{unexpected:true}]) {
    const current={...durable,savedShoes};
    const next=mergeAppSettings(current,{measurementSoundEnabled:false});
    assert.deepEqual(next.savedShoes,savedShoes);
    assert.equal(next.measurementSoundEnabled,false);
  }
});

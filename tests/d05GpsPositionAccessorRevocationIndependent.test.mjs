import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGeolocationPosition } from '../ui/runMeasurementCore.js';

const coordinates = () => ({latitude:35,longitude:139,accuracy:8,altitude:12,altitudeAccuracy:20,speed:1.2});
const position = (coords = coordinates()) => ({coords,timestamp:1700000000000});
const throwProperty = (obj,key) => Object.defineProperty(obj,key,{configurable:true,get(){throw Object.assign(new Error('revoked'),{name:'SecurityError'});}});
for(const [label,build] of [
  ['coords getter',()=>throwProperty({timestamp:1700000000000},'coords')],
  ['latitude getter',()=>position(throwProperty(coordinates(),'latitude'))],
  ['longitude getter',()=>position(throwProperty(coordinates(),'longitude'))],
  ['accuracy getter',()=>position(throwProperty(coordinates(),'accuracy'))],
  ['altitude getter',()=>position(throwProperty(coordinates(),'altitude'))],
  ['altitudeAccuracy getter',()=>position(throwProperty(coordinates(),'altitudeAccuracy'))],
  ['speed getter',()=>position(throwProperty(coordinates(),'speed'))],
  ['timestamp getter',()=>throwProperty({coords:coordinates()},'timestamp')],
])test('D05/E07 Position accessor '+label+' cannot escape GPS callback',()=>{
  assert.doesNotThrow(()=>assert.equal(normalizeGeolocationPosition(build()),null));
});
test('D05 valid GPS Position preserves actual zero latitude, longitude, accuracy',()=>{
  const x=normalizeGeolocationPosition({coords:{latitude:0,longitude:0,accuracy:0,altitude:null,altitudeAccuracy:null,speed:null},timestamp:1700000000000});
  assert.equal(x.lat,0);assert.equal(x.lon,0);assert.equal(x.accuracyM,0);
  assert.equal(x.altitudeM,null);
});
test('D05 malformed callback cannot poison subsequent valid GPS sample',()=>{
  const bad=position(throwProperty(coordinates(),'latitude'));
  assert.doesNotThrow(()=>assert.equal(normalizeGeolocationPosition(bad),null));
  assert.equal(normalizeGeolocationPosition(position()).lat,35);
});
test('D05 a changing coordinate getter is snapshotted once before validation',()=>{
  let calls=0;const coords=coordinates();
  Object.defineProperty(coords,'latitude',{get(){calls++;return calls===1?35:120;}});
  const result=normalizeGeolocationPosition(position(coords));
  assert.equal(calls,1);assert.equal(result.lat,35);
});
test('D05 a changing accuracy getter is snapshotted once, retaining reported precision',()=>{
  let calls=0;const coords=coordinates();
  Object.defineProperty(coords,'accuracy',{get(){calls++;return calls===1?45:0;}});
  const result=normalizeGeolocationPosition(position(coords));
  assert.equal(calls,1);assert.equal(result.accuracyM,45);
});

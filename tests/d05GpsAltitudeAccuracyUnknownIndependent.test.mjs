import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMeasuredCourse } from '../ui/mobileRunMeasurementAutoRecord.js';

function track(altitudeAccuracyM) {
  return Array.from({length:10},(_,i)=>({
    lat:35+i*0.001,lon:139,altitudeM:i*2,
    altitudeAccuracyM,cumulativeDistanceM:i*111,timestamp:1700000000000+i*1000,
  }));
}
test('D05 absent vertical GPS accuracy cannot assert known road slope',()=>{
  for(const accuracy of [undefined,null,'',false]) {
    const result=analyzeMeasuredCourse({track:track(accuracy),durationMs:600000});
    assert.ok(result);
    assert.equal(result.gradeKnowledge,'UNKNOWN',String(accuracy));
    assert.equal(result.elevationCoverage,0);
    assert.equal(result.elevationGainM,null);
    assert.equal(result.flatPercent,null);
  }
});
test('D05 valid 20m vertical accuracy retains GPS slope computation',()=>{
  const result=analyzeMeasuredCourse({track:track(20),durationMs:600000});
  assert.equal(result.gradeKnowledge,'KNOWN_PROFILE');
  assert.equal(result.elevationCoverage,1);
  assert.ok(result.upPercent>0);
});
test('D05 explicit zero vertical accuracy is a genuine reading',()=>{
  const result=analyzeMeasuredCourse({track:track(0),durationMs:600000});
  assert.equal(result.gradeKnowledge,'KNOWN_PROFILE');
});
test('D05 reported poor 50m vertical accuracy remains unknown',()=>{
  const result=analyzeMeasuredCourse({track:track(50),durationMs:600000});
  assert.equal(result.gradeKnowledge,'UNKNOWN');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseGpxText, analyzeGpx } from '../ui/gpxLocalAnalysis.js';

function mockPoint(lat, lon, ele) {
  return {
    getAttribute(name) { return name === 'lat' ? lat : name === 'lon' ? lon : null; },
    querySelector(selector) { return selector === 'ele' && ele !== undefined ? { textContent: ele } : null; },
  };
}
function parseMock(points) {
  const original = globalThis.DOMParser;
  globalThis.DOMParser = class {
    parseFromString() {
      return {
        querySelector(selector) { return null; },
        querySelectorAll(selector) { return selector === 'trkpt, rtept' ? points : []; },
      };
    }
  };
  try { return parseGpxText('<gpx></gpx>'); }
  finally { if (original === undefined) delete globalThis.DOMParser; else globalThis.DOMParser = original; }
}
function pointsWith(invalidPoint) {
  return [mockPoint('35','139','10'), invalidPoint, mockPoint('35.002','139.002','20')];
}
const gpxUI = readFileSync(new URL('../ui/interactions/gpxAnalysisInteractions.js', import.meta.url), 'utf8');
const withoutImport = gpxUI.replace(/^import\s+[^\n]+\n/gm, '').replaceAll('export function bindGpxAnalysis', 'function bindGpxAnalysis');
const sandbox = {};
vm.runInNewContext(withoutImport + '\n globalThis.profileSvgForTest = profileSvg;', sandbox, { filename: 'gpxAnalysisInteractions.js' });
const profileSvg = sandbox.profileSvgForTest;

test('GPX missing latitude does not create 0 latitude', () => assert.equal(parseMock(pointsWith(mockPoint(null,'139.001','15'))).points.length,2));
test('GPX missing longitude does not create 0 longitude', () => assert.equal(parseMock(pointsWith(mockPoint('35.001',null,'15'))).points.length,2));
test('GPX empty latitude is not numeric zero', () => assert.equal(parseMock(pointsWith(mockPoint('','139.001','15'))).points.length,2));
test('GPX whitespace longitude is not numeric zero', () => assert.equal(parseMock(pointsWith(mockPoint('35.001','  ','15'))).points.length,2));
test('GPX latitude outside -90..90 is ignored', () => assert.equal(parseMock(pointsWith(mockPoint('91','139.001','15'))).points.length,2));
test('GPX longitude outside -180..180 is ignored', () => assert.equal(parseMock(pointsWith(mockPoint('35.001','181','15'))).points.length,2));
test('GPX genuine (0,0) is retained', () => {
  const parsed = parseMock([mockPoint('0','0','0'),mockPoint('0','0.001','0')]);
  assert.equal(parsed.points[0].lat,0);assert.equal(parsed.points[0].lon,0);
});
test('GPX missing elevation remains unknown and not sea-level', () => {
  const parsed = parseMock([mockPoint('35','139'),mockPoint('35','139.001')]);
  assert.equal(parsed.points[0].ele,null);
  const result = analyzeGpx(parsed);
  assert.equal(result.elevationCoverage,0);
  assert.equal(result.gradeKnowledge,'UNKNOWN');
  assert.equal(result.flatPercent,null);
});
test('GPX blank elevation is missing, not zero', () => {
  const parsed = parseMock([mockPoint('35','139','   '),mockPoint('35','139.001','   ')]);
  assert.equal(parsed.points[0].ele,null);
  assert.equal(analyzeGpx(parsed).gradeKnowledge,'UNKNOWN');
});
test('GPX explicit elevation zero is valid and flat', () => {
  const parsed = parseMock([mockPoint('35','139','0'),mockPoint('35','139.001','0')]);
  const result=analyzeGpx(parsed);
  assert.equal(result.gradeKnowledge,'KNOWN_PROFILE');assert.equal(result.flatPercent,100);
});
test('GPX partial known uphill coverage does not turn unknown distance into flat/downhill', () => {
  const points=Array.from({length:6},(_,i)=>mockPoint('35',String(139+i*0.001),i===5?undefined:String(i*10)));
  const result=analyzeGpx(parseMock(points));
  assert.equal(result.elevationCoverage,0.8);
  assert.equal(result.gradeKnowledge,'KNOWN_PROFILE');
  assert.equal(result.upPercent,100);
  assert.equal(result.downPercent,0);
  assert.equal(result.flatPercent,0);
});
test('GPX partial known flat coverage reports flat only for evaluated distance', () => {
  const points=Array.from({length:6},(_,i)=>mockPoint('35',String(139+i*0.001),i===5?undefined:'10'));
  const result=analyzeGpx(parseMock(points));
  assert.equal(result.elevationCoverage,0.8);
  assert.equal(result.flatPercent,100);
});
test('GPX all missing elevation does not create a zero-altitude profile SVG', () => {
  const markup=profileSvg([{ele:null},{ele:null}]);
  assert.match(markup,/標高データが不足/);assert.doesNotMatch(markup,/<polyline/);
});
test('GPX one known elevation does not fabricate profile', () => {
  const markup=profileSvg([{ele:null},{ele:0},{ele:null}]);
  assert.match(markup,/標高データが不足/);
});
test('GPX explicit zero altitude does render a profile', () => {
  const markup=profileSvg([{ele:0},{ele:0}]);
  assert.match(markup,/<polyline/);assert.match(markup,/>0 m</);
});
test('GPX fewer than two valid points is rejected', () => assert.throws(()=>parseMock([mockPoint('35','139','10'),mockPoint(null,'139.001','11')]),/GPX_POINTS_REQUIRED/));
test('GPX valid altitude/route has unchanged percentages', () => {
  const points=[mockPoint('35','139','10'),mockPoint('35','139.001','20'),mockPoint('35','139.002','20')];
  const result=analyzeGpx(parseMock(points));
  assert.equal(result.gradeKnowledge,'KNOWN_PROFILE');
  assert.equal(result.upPercent,50);assert.equal(result.flatPercent,50);assert.equal(result.downPercent,0);
});

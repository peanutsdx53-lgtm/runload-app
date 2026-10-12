import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { escapeHtml } from '../ui/commonComponents.js';
import { renderRestoreInspection } from '../ui/restorePreviewPresentation.js';
import { calculatePaceSummary, formatPaceDuration } from '../ui/interactions/mobilePaceCalculatorInteractions.js';
import { HOME_APP_CATALOG, WIDGET_CATALOG } from '../ui/interactions/mobileHomeLayoutState.js';

const ROOT = new URL('../', import.meta.url);
const src = file => fs.readFileSync(new URL(file,ROOT),'utf8');
const attack = '\"><img src=x onerror=alert(93)><svg onload=alert(94)>';
const noExecutable = html => {
  assert.doesNotMatch(html, /<\s*(?:img|svg|iframe|script)\b|(?:href|src)\s*=\s*['"]javascript\s*:/i);
};
function privateFunctions(path,names,extra={}) {
  const source=src(path).replace(/^import\s+(?:\{[\s\S]*?\}|[^;]+?)\s+from\s+["'][^"']+["'];\s*$/gm,'')
    .replace(/^export\s+(function|const|class)\b/gm,'$1');
  const context={escapeHtml,queueMicrotask:()=>{},matchesMobileLayout:()=>false,
    document:{getElementById:()=>null},window:{matchMedia:()=>({addEventListener(){}})},
    findMobileExtensionRecord:()=>null,listMobileExtensionRecords:()=>[],...extra};
  vm.runInNewContext(`${source}\nglobalThis.__functions={${names.join(',')}};`,context,{filename:path,timeout:3500});
  return context.__functions;
}

// The two global shell insertions are delegated HTML trust boundaries. These
// contracts are necessary, not sufficient for a global E01 security PASS.
test('E01 01 app.js desktop header: only registered screen context and escaped header helpers',()=>{
  const shell=src('ui/desktopAppShell.js'),app=src('app.js');
  assert.match(app,/platformHeaderRoot\.innerHTML\s*=\s*\["interpretation-room", "run-measurement"\]/);
  assert.match(shell, /href="\$\{escapeHtml\(back\.backHref\)\}"/);
  assert.match(shell, /\$\{escapeHtml\(title\)\}/);
  assert.match(shell, /\$\{escapeHtml\(back\.backLabel\)\}/);
});
test('E01 02 app.js shell: renderer-controlled screenContent is explicitly marked transitive, never falsely escaped',()=>{
  const app=src('app.js'),desktop=src('ui/desktopAppShell.js'),mobile=src('ui/mobileAppShell.js');
  assert.match(app,/appRoot\.innerHTML\s*=\s*platformShell\.renderPlatformShell/);
  assert.match(app,/screenContent:\s*renderSelectedScreen\(/);
  assert.match(desktop, /\$\{screenContent\}/);
  assert.match(mobile,/\$\{screenContent\}/);
  assert.match(app,/screenRenderers\[screenName\] \?\? screenRenderers\.home/);
  assert.match(app,/availableScreens: Object\.keys\(screenRenderers\)/);
  // Deliberately NOT a proof that all child renderers accept hostile inputs safely.
});
test('E01 03 settings update version is release constant, not user-supplied markup',()=>{
  const code=src('ui/appVersionStatus.js');
  assert.match(code,/export const APP_VERSION = "2026\.10\.12\.102"/);
  assert.match(code,/export const APP_VERSION_LABEL = `v\$\{APP_VERSION\}`/);
  const html=code.slice(code.indexOf('section.innerHTML = `'),code.indexOf('return section;'));
  assert.match(html,/\$\{APP_VERSION\}/);
  assert.doesNotMatch(html,/fileName|localStorage|location|userMessage|recordId/);
});
test('E01 04 timeline: saved DOM text is HTML-encoded before reinsertion',()=>{
  const {selectorMarkup}=privateFunctions('ui/desktopBodyTimelineWorkspace.js',['selectorMarkup']);
  const card={querySelector:()=>({textContent:attack}),hasAttribute:()=>false};
  const html=selectorMarkup([card],0);noExecutable(html);assert.match(html,/&lt;img/);
});
test('E01 05 consultation region visual: reuses already parsed template nodes without reparsing HTML',()=>{
  const code=src('ui/interactions/consultationInteractions.js');
  assert.match(code,/element\.replaceChildren\(template\.content\.cloneNode\(true\)\)/);
  assert.doesNotMatch(code,/element\.innerHTML\s*=\s*template\.innerHTML/);
  const screen=src('screens/consultationScreen.js');
  assert.match(screen,/consultationRegionVisual\(summary, report \|\| \{\}\)/);
  assert.match(screen,/escapeHtml\(option\.id\)/);
});
test('E01 06 home picker: closed ID/label/description catalogs; no stored raw layout markup',()=>{
  const code=src('ui/interactions/mobileHomeEditPresentation.js');
  assert.match(code,/HOME_APP_CATALOG\.filter/);
  assert.match(code,/WIDGET_CATALOG\.filter/);
  for(const x of [...HOME_APP_CATALOG,...WIDGET_CATALOG]) {
    assert.match(x.id,/^[a-z-]+$/);noExecutable(x.label);noExecutable(x.description);
  }
  assert.ok(Object.isFrozen(HOME_APP_CATALOG)&&Object.isFrozen(WIDGET_CATALOG));
});
test('E01 07 launch icon animation: clones existing DOM nodes without another HTML parser',()=>{
  const code=src('ui/interactions/mobileHomeInteractions.js');
  assert.match(code,/glyph\.replaceChildren\(\.\.\.\[\.\.\.icon\.childNodes\]\.map\(\(node\) => node\.cloneNode\(true\)\)\)/);
  assert.doesNotMatch(code,/glyph\.innerHTML\s*=\s*icon\.innerHTML/);
  const home=src('screens/mobile/homeScreen.js');
  assert.match(home, /escapeHtml\(emoji\)/);
  assert.match(home, /escapeHtml\(href\)/);
  assert.match(home, /escapeHtml\(label\)/);
});
test('E01 08 mobile pace split: numbers must be validated and formatted before HTML',()=>{
  const summary=calculatePaceSummary(5,1800);
  assert.ok(summary&&summary.splitPoints.length>=1);
  assert.equal(calculatePaceSummary(attack,1800),null);
  assert.equal(calculatePaceSummary(5,attack),null);
  assert.match(formatPaceDuration(1800),/^30:00$/);
  const code=src('ui/interactions/mobilePaceCalculatorInteractions.js');
  assert.match(code,/summary\.splitPoints\.map\(/);
  assert.match(code,/Number\(point\.toFixed\(1\)\)/);
  assert.match(code,/formatPaceDuration\(cumulative\)/);
});
test('E01 09 regional record selected rows: area, side, score and labels are catalog only',()=>{
  const code=src('ui/interactions/recordInputInteractions.js');
  assert.match(code,/RECORD_REGIONAL_SUBJECTIVE_AREAS\.filter/);
  assert.match(code,/Number\.isInteger\(value\) && value >= 1 && value <= 5/);
  assert.match(code,/BODY_OBSERVATION_INTENSITY_OPTIONS\.map/);
  assert.match(code,/Object\.values\(BODY_AREA_LATERALITY\)\.map/);
  assert.match(code,/data-record-selected-row="\$\{item\.areaId\}"/);
});
test('E01 10 settings restore-preview: attacker filename and issues are escaped in actual renderer',()=>{
  const html=renderRestoreInspection({status:'BLOCKED',canRestore:false,counts:{records:1},issues:[{severity:'BLOCKING',message:attack,itemId:attack}]},attack);
  noExecutable(html);
  assert.match(html,/&lt;img/);
  const code=src('ui/interactions/settingsInteractions.js');
  assert.match(code,/previewHost\.innerHTML\s*=\s*renderRestoreInspection\(inspection, file\.name\)/);
});
test('E01 11 simulation assumption chip revert id must be encoded before attribute interpolation',()=>{
  const c=src('ui/interactions/simulationInteractions.js');
  assert.match(c,/data-simulation-revert="\$\{escapeHtml\(item\.id\)\}"/);
  assert.match(c,/const changedItems=changedConditionItems\(data\)/);
});
test('E01 12 simulation assumption chip label must be encoded in text and ARIA attribute',()=>{
  const c=src('ui/interactions/simulationInteractions.js');
  assert.match(c,/aria-label="\$\{escapeHtml\(item\.label\)\}を元に戻す"/);
  assert.match(c,/<span>\$\{escapeHtml\(item\.label\)\}<\/span>/);
});
test('E01 13 simulation result: course and state escaped; expansion content is trusted local module only',()=>{
  const c=src('ui/interactions/simulationInteractions.js');
  assert.match(c,/escapeHtml\(course\?\.name\|\|"未選択"\)/);
  assert.match(c,/escapeHtml\(result\?\.state\|\|"—"\)/);
  assert.match(c,/target\.innerHTML=renderSimulationComparisonResult\(/);
  const local=src('ui/interactions/mobileSimulationInteractions.js');
  assert.match(local,/renderGroupExpansionControl/);
});
test('E01 14 mobile activity archive: real record renderer encodes stored untrusted values',()=>{
  const {recordCard,recordDetail,regionRows}=privateFunctions('ui/mobileWalkJogHistoryUi.js',['recordCard','recordDetail','regionRows']);
  const record={id:`bad" onclick="${attack}`,activityId:attack,createdAt:'bad',distanceKm:5,durationMinutes:30,
    analysis:{segments:[{gaitId:attack,coverage:{regions:[{regionId:attack,evidenceTier:attack,index:101}],availableRegionCount:1},distanceKm:2,speedKmh:3,durationSeconds:80}]}};
  for(const html of [recordCard(record),recordDetail(record),regionRows(record.analysis.segments[0].coverage)]){noExecutable(html);assert.match(html,/&lt;img/);}
  assert.match(recordCard(record),/mobileActivityRecordId=bad%22/);
});
test('E01 15 activity analysis: real segment + region renderer HTML-encodes hostile saved labels',()=>{
  const {segmentCard,regionDetails}=privateFunctions('ui/mobileWalkJogMeasurementWiring.js',['segmentCard','regionDetails'],{
    ACTIVITY_LABELS:{},formatSpeed:()=> '3 km/h'});
  const segment={gaitId:attack,distanceKm:1.2,speedMps:1.5,coverage:{strictAll12:false,availableRegionCount:attack,
    regions:[{regionId:attack,evidenceTier:attack,index:100,outputStatus:'OK'}]}};
  for(const html of [segmentCard(segment,0),regionDetails(segment.coverage)]){noExecutable(html);assert.match(html,/&lt;img/);}
  assert.match(src('ui/mobileWalkJogMeasurementWiring.js'),/panel\.innerHTML\s*=\s*`/);
});

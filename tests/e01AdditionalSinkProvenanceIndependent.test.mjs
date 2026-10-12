import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// These are bounded provenance tests, not a global XSS audit. Always evaluate
// current production function bodies and constants, never a copied renderer.
function source(path) { return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'); }
function isolate(path, names, overrides = {}) {
  const code = source(path)
    .replace(/^import\s+(?:\{[\s\S]*?\}|[^;]+?)\s+from\s+["'][^"']+["'];\s*$/gm, '')
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '')
    .replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let|class)\b)/g, '');
  const env = {
    URLSearchParams,
    console,
    document: { getElementById: () => null, querySelector: () => null },
    window: { location: { hash: '#/history' }, matchMedia: () => ({addEventListener() {}}) },
    queueMicrotask: () => {},
    matchesMobileLayout: () => true,
    createApplicationServices: () => ({storage:{}}),
    createMobileMeasurementScanner: () => () => {},
    MOBILE_ACTIVITY_IDS: { WALK: 'WALK', JOGGING: 'JOGGING', RUNNING_CURRENT: 'RUNNING_CURRENT', MIXED: 'MIXED' },
    internalModules: {},
    GPX_MAX_TEXT_CHARS: 10_000_000,
    ...overrides,
  };
  vm.runInNewContext(`${code}\nglobalThis.__tested = {${names.join(',')}};`, env, {filename:path, timeout:1500});
  return env.__tested;
}
function noExecutableHtml(html) {
  assert.doesNotMatch(html, /<\s*(?:script|img|iframe|foreignObject)\b|\son\w+\s*=|javascript\s*:/i);
}
const attack = '<img src=x onerror=alert(9)>" onmouseover="alert(9)';

test('E01 tutorial shell uses literal markup, without stored/URL interpolation', () => {
  const s = source('ui/screenTutorial.js');
  assert.match(s, /const tutorial = SCREEN_TUTORIALS\[tutorialId\];/);
  assert.match(s, /dialog\.innerHTML = `\s*<div class="screen-tutorial__backdrop"/);
  const shell = s.match(/dialog\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1];
  assert.ok(shell && !shell.includes('${'));
  noExecutableHtml(shell);
});

test('E01 tutorial step HTML only receives immutable bundled tutorial entries', () => {
  const {SCREEN_TUTORIALS,renderTutorialStep} = isolate('ui/screenTutorial.js',['SCREEN_TUTORIALS','renderTutorialStep']);
  assert.ok(Object.isFrozen(SCREEN_TUTORIALS));
  let count=0;
  for(const t of Object.values(SCREEN_TUTORIALS)) {
    assert.ok(Object.isFrozen(t) && Object.isFrozen(t.steps));
    for(let i=0;i<t.steps.length;i++){
      const step=t.steps[i];
      assert.ok(Object.isFrozen(step));
      for(const key of ['title','lead']) assert.doesNotMatch(t[key], /[<>]/);
      for(const key of ['title','body']) assert.doesNotMatch(step[key], /[<>]/);
      const html=renderTutorialStep(t,i);
      noExecutableHtml(html);
      assert.match(html, /screen-tutorial__step/);
      count++;
    }
  }
  assert.ok(count>=12, `missing tutorial steps: ${count}`);
  // Directly providing attacker-controlled tutorial values WOULD be unsafe.
  assert.match(renderTutorialStep({title:attack,lead:'',steps:[{title:'',body:''}]},0), /<img src=x/);
  // Keep the provenance restriction; never export/open this renderer for arbitrary data.
});

test('E01 desktop terms gate constructs markup exclusively from hardcoded terms', () => {
  const {TERMS_SECTIONS,gateMarkup} = isolate('ui/desktopFirstUse.js',['TERMS_SECTIONS','gateMarkup']);
  assert.ok(Object.isFrozen(TERMS_SECTIONS));
  for(const [title,body] of TERMS_SECTIONS){ assert.doesNotMatch(title+body,/[<>]/); }
  const html=gateMarkup();
  noExecutableHtml(html);
  assert.match(html, /data-desktop-terms-consent/);
  const s=source('ui/desktopFirstUse.js');
  assert.match(s, /document\.body\.insertAdjacentHTML\("beforeend", gateMarkup\(\)\)/);
});

test('E01 desktop history URL/DOM-text provenance cannot break an HTML attribute', () => {
  const {workspaceMarkup} = isolate('ui/desktopHistoryWorkspace.js',['workspaceMarkup'],{
    window:{location:{hash:`#/history?memo=${encodeURIComponent(attack)}&url=${encodeURIComponent('"/><img src=x onerror=alert(1)>')}`},matchMedia:()=>({addEventListener(){}})},
  });
  const screen={querySelectorAll:()=>Array.from({length:3},()=>({querySelector:()=>({textContent:attack})}))};
  const html=workspaceMarkup(screen);
  noExecutableHtml(html);
  assert.match(html,/memo=%3Cimg/i);
  assert.doesNotMatch(html,/href="[^"]*"\s+onmouseover=/);
  assert.match(source('ui/desktopHistoryWorkspace.js'),/new URLSearchParams\(parameters\)/);
});

test('E01 mobile measurement activity choices are a closed literal catalogue', () => {
  const {activityChoiceMarkup,mixedControlMarkup} = isolate('ui/mobileWalkJogMeasurementWiring.js',['activityChoiceMarkup','mixedControlMarkup'],{getSessionStorage:()=>null});
  const choice=activityChoiceMarkup(),mixed=mixedControlMarkup();
  noExecutableHtml(choice+mixed);
  assert.deepEqual([...choice.matchAll(/name="mobileActivityIdentity" value="([^"]+)"/g)].map(x=>x[1]),['WALK','JOGGING','RUNNING_CURRENT','MIXED']);
  assert.match(mixed,/data-mobile-segment-gait="RUNNING_CURRENT"/);
  assert.match(source('ui/mobileWalkJogMeasurementWiring.js'), /insertAdjacentHTML\("afterend", activityChoiceMarkup\(\)\)/);
  assert.match(source('ui/mobileWalkJogMeasurementWiring.js'), /insertAdjacentHTML\("afterend", mixedControlMarkup\(\)\)/);
});

test('E01 activity save panel maps even malicious activity IDs to a fixed label', () => {
  const {savePanelMarkup} = isolate('ui/mobileWalkJogRecordStore.js',['savePanelMarkup']);
  for(const id of [attack,'',null,{},'WALK','JOGGING','MIXED','RUNNING_CURRENT']){
    const html=savePanelMarkup(id);
    noExecutableHtml(html);
    assert.doesNotMatch(html,/alert\(9\)/);
    assert.match(html,/data-mobile-extension-save-button/);
  }
  assert.match(source('ui/mobileWalkJogRecordStore.js'),/insertAdjacentHTML\("beforeend", savePanelMarkup\(activityId\)\)/);
});

test('E01 GPX SVG profile renders only computed numeric geometry from elevations', () => {
  const {profileSvg} = isolate('ui/interactions/gpxAnalysisInteractions.js',['profileSvg']);
  const poisoned=[
    {ele:'<img src=x onerror=alert(9)>',segmentIndex:attack},
    {ele:'-10',segmentIndex:attack},
    {ele:'45',segmentIndex:attack},
    {ele:'NaN',segmentIndex:1},
    {ele:80,segmentIndex:1},
  ];
  const html=profileSvg(poisoned);
  noExecutableHtml(html);
  assert.match(html,/<polyline points="[0-9., -]+"/);
  assert.doesNotMatch(html,/alert|onload/i);
  assert.match(source('ui/interactions/gpxAnalysisInteractions.js'),/svg\.innerHTML = profileSvg\(parsed\.points\)/);
});

test('E01 pace rows are constrained by numeric-only calculation and formatting', () => {
  const s=source('ui/interactions/mobilePaceCalculatorInteractions.js');
  assert.match(s,/splits\.innerHTML = summary\.splitPoints\.map\(\(point\) =>/);
  const {calculatePaceSummary,formatPaceDuration} = isolate('ui/interactions/mobilePaceCalculatorInteractions.js',['calculatePaceSummary','formatPaceDuration']);
  for(const [distance,seconds] of [[5,1500],[10,2500],['9.8','2510']]){
    const output=calculatePaceSummary(distance,seconds);
    assert.ok(output&&output.splitPoints.length);
    for(const point of output.splitPoints){
      const markup=`<div class="mobile-pace-split-row"><span>${Number(point.toFixed(1))} km</span><strong>${formatPaceDuration(output.totalSeconds*(point/output.distanceKm))}</strong></div>`;
      noExecutableHtml(markup);
      assert.match(markup,/\d/);
    }
  }
  for(const bad of [attack,'NaN','Infinity',-1,0]) assert.equal(calculatePaceSummary(bad,100),null);
});

test('E01 PWA update notice uses source-constant HTML, not service worker data', () => {
  const src=source('core/internal/platformInfrastructure.js');
  const markup=src.match(/notice\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1];
  assert.ok(markup && !markup.includes('${'));
  noExecutableHtml(markup);
  assert.match(markup,/data-pwa-update-button/);
  assert.match(src,/showUpdateNotice\(registration\)/);
});

test('E01 ROF-J source credits link URLs are hardcoded HTTPS only', () => {
  const s=source('ui/rofJPresentation.js');
  const constants=Object.fromEntries([...s.matchAll(/^const (ORIGINAL_ROF_(?:ARTICLE|LICENSE)_URL|ROF_J_(?:ARTICLE|LICENSE)_URL) = "([^"]+)";/gm)].map(m=>[m[1],m[2]]));
  assert.equal(Object.keys(constants).length,4);
  Object.values(constants).forEach(url=>{assert.match(url,/^https:\/\/[^"'<>\s]+$/);assert.doesNotMatch(url,/javascript:/i)});
  const note=s.match(/wrapper\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1];
  assert.ok(note);
  const holes=[...note.matchAll(/\$\{([^}]+)\}/g)].map(x=>x[1]);
  assert.deepEqual(holes,['ROF_J_ARTICLE_URL','ROF_J_LICENSE_URL','ORIGINAL_ROF_ARTICLE_URL','ORIGINAL_ROF_LICENSE_URL']);
  assert.match(s,/wrapper\.innerHTML = `/);
});

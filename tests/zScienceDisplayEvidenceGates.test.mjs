import { test } from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import { createApplicationServices, createMemoryStorage } from '../core/appCore.js';
import { renderBodyPartDetailScreenWithPresentation } from '../screens/bodyPartDetailScreen.js';
import { renderReadingContent } from '../screens/readingScreen.js';
import { renderResultScreen as renderMobileResult } from '../screens/mobile/resultScreen.js';
import { renderResultScreen as renderDesktopResult } from '../screens/desktop/resultScreen.js';

const feedback = { checkStatus:'deferred', bodyAreaObservations:[], safetyFlags:{} };
function fixture(distanceKm=5.5,durationMinutes=30) {
  const services=createApplicationServices({storage:createMemoryStorage()});
  const record={id:'screen-v4',createdAt:'2026-10-19T09:00:00.000Z',date:'2026-10-19',activityType:'run',distanceKm,durationMinutes,runningFormat:'CONTINUOUS_RUN',stepsProvenance:'UNKNOWN',course:{gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'}};
  assert.equal(services.workflows.records.saveRecordAndFeedback(record,feedback).ok,true);
  return {services, record};
}
const ctx=(s)=>({ parameters:new URLSearchParams(s) });
const detail=(services,regionId)=>renderBodyPartDetailScreenWithPresentation({services,context:ctx(`recordId=screen-v4&regionId=${regionId}`)});

test('A30: Running v4 disclosure contains correct original unit, raw value, provenance AND Ref-100',()=>{
  const {services}=fixture();
  const exp=services.workflows.records.loadExperience('screen-v4');
  for(const [id,routePhrase] of [['BA-DISP-014','アプリ内で算出した原著内の直線補間値'],['BA-DISP-015','原著式による計算値'],['BA-DISP-027','原著に掲載された表値']]){
    const row=exp.regionalV2Result.regions.find(r=>r.regionId===id);
    assert.ok(Number.isFinite(row.rawValue));
    const html=detail(services,id);
    assert.match(html,/data-scientific-raw-unit="running-v4"/);
    assert.ok(html.includes(row.rawValue.toPrecision(7)));
    assert.ok(html.includes(row.unit));
    assert.ok(html.includes(routePhrase));
    assert.match(html,/表示上の参照100/);
    assert.match(html,/本人の測定値ではありません/);
  }
});

test('A30: Outside an original range no missing raw value is misrepresented as observation',()=>{
  const {services}=fixture(5,30); // 10km/h: Van Hooren R05/R06/R09 unsupported
  const html=detail(services,'BA-DISP-019');
  assert.match(html,/正規化前の値も参照100も表示しません/);
  assert.doesNotMatch(html,/正規化前の参照値：0/);
});

test('A14: articles with no documented source cannot enter lists or direct-article display',()=>{
  const {services}=fixture();
  const forged={id:'no-evidence-example',title:'根拠なしの例',summary:'根拠を持たない読み物',body:['無根拠の文'],sources:[]};
  const wrapper={...services,column:{...services.column,list:()=>[...services.column.list(),forged],findById:id=>id===forged.id?forged:services.column.findById(id)}};
  for(const params of ['','articleId=no-evidence-example']) {
    const html=renderReadingContent({services:wrapper,context:ctx(params),deferredArticleIds:new Set()});
    assert.doesNotMatch(html,/根拠なしの例|根拠を持たない読み物|無根拠の文/);
    assert.match(html,/読みもの/);
  }
});

test('A38 partial: reading article return preserves record and region context',()=>{
  const {services}=fixture();
  const query='articleId=regional-three-views&origin=result-condition&recordId=screen-v4&regionId=BA-DISP-019';
  const article=renderReadingContent({services,context:ctx(query),deferredArticleIds:new Set()});
  assert.match(article,/data-reading-article-screen/);
  assert.match(article,/読みもの一覧へ戻る/);
  assert.match(article,/#\/reading\?origin=result-condition&amp;recordId=screen-v4&amp;regionId=BA-DISP-019/);
  const list=renderReadingContent({services,context:ctx('origin=result-condition&recordId=screen-v4&regionId=BA-DISP-019'),deferredArticleIds:new Set()});
  assert.match(list,/#\/body-part-detail\?recordId=screen-v4&amp;regionId=BA-DISP-019/);
  // Exact viewport restoration requires a real browser E2E, not claimed here.
});

test('A16/A23: running display states explicitly avoid interpreting above 100 as injury or significance',()=>{
  const {services}=fixture();
  const context=ctx('recordId=screen-v4');
  const mobile=renderMobileResult({services,context});
  const pc=renderDesktopResult({services,context});
  for(const [name,html] of [['mobile',mobile],['desktop',pc]]) {
    assert.match(html,/危険度ではなく|危険度ではありません|危険度や部位の順位を示すものではありません|危険度を示すものではありません/,name);
    assert.match(html,/基準100|自身の基準100|自身の基準/,name);
    assert.doesNotMatch(html,/統計学的に有意に(?:増加|減少)/,name);
  }
});


test('A24 partial: v125 service worker precache URLs cover all present local source assets',()=>{
  const project=join(dirname(fileURLToPath(import.meta.url)),'..');
  const sw=readFileSync(join(project,'service-worker.js'),'utf8');
  const paths=[...new Set([...sw.matchAll(/"(\.\/[^"]+)"/g)].map(match=>match[1])
    .filter(path=>/\.[A-Za-z0-9]+$/.test(path)))];
  assert.ok(paths.length>=300);
  const missing=paths.filter(path=>!existsSync(join(project,path)));
  assert.deepEqual(missing,[]);
  assert.ok(paths.includes('./core/runningEvidence/runningEvidenceEngine.js'));
  assert.ok(paths.includes('./screens/readingScreen.js'));
  assert.ok(paths.includes('./styles/components.css'));
  // This demonstrates cache-input completeness, not actual device offline boot.
});

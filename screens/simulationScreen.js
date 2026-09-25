import { escapeHtml } from "../ui/commonComponents.js";
import { peekCourseSelection } from "../ui/flowSessionState.js";
import { primarySurfaceSummary, slopeSummary } from "../ui/coursePresentation.js";


const SIMULATION_SCREEN_ICONS = Object.freeze({
  compare:'<path d="M7 7h11"/><path d="m15 4 3 3-3 3"/><path d="M17 17H6"/><path d="m9 14-3 3 3 3"/>',
  conditions:'<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h2"/><path d="M10 17h10"/><circle cx="8" cy="17" r="2"/>',
  flag:'<path d="M5 21V4"/><path d="M5 5h11l-2 4 2 4H5"/>',
  record:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  share:'<circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="m8 11 8-4M8 13l8 4"/>',
});
function simulationScreenIcon(name){
  const paths=SIMULATION_SCREEN_ICONS[name]||SIMULATION_SCREEN_ICONS.compare;
  return `<svg class="condition-compare-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
function dateLabel(value=""){
  const parts=String(value||"").split("-");
  if(parts.length!==3)return String(value||"");
  return `${Number(parts[0])}年${Number(parts[1])}月${Number(parts[2])}日`;
}

function selectedCourse(){
  return peekCourseSelection("simulation")?.preset || null;
}

function latestRun(services){
  if(!services?.storage?.records)return null;
  return services.storage.records.loadAll()
    .filter((record)=>record.activityType==="run")
    .sort((a,b)=>`${String(b.date||"")}|${String(b.createdAt||"")}|${String(b.id||"")}`.localeCompare(`${String(a.date||"")}|${String(a.createdAt||"")}|${String(a.id||"")}`))[0]||null;
}

function sourceRun(services,recordId=""){
  const requested=recordId?services?.storage?.records?.findById?.(recordId):null;
  return requested?.activityType==="run"?requested:latestRun(services);
}

function pace(distance,duration){
  const d=Number(distance),t=Number(duration);
  if(!(d>0&&t>0))return"—";
  const seconds=Math.round(t*60/d);
  return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")} /km`;
}

function sourceCourse(record, override){
  if(override?.course)return override.course;
  if(record?.course && typeof record.course==="object")return record.course;
  return {name:"",gradeKnowledge:"UNKNOWN",modelSurfaceClass:"UNKNOWN"};
}

function runningFormatValue(record){
  return String(record?.runningFormat||"").toUpperCase()==="RUN_WALK"?"RUN_WALK":"CONTINUOUS_RUN";
}

export function renderSimulationScreen({ services, context }) {
  const from=String(context?.parameters?.get("from")||"");
  const recordId=String(context?.parameters?.get("recordId")||"");
  const roomOrigin=String(context?.parameters?.get("roomOrigin")||"result");
  const returnTo=String(context?.parameters?.get("returnTo")||"");
  const safeRoomOrigin=["result","history","body-part-detail","home"].includes(roomOrigin)?roomOrigin:"result";
  const roomBack=`#/interpretation-room?recordId=${encodeURIComponent(recordId)}&origin=${encodeURIComponent(safeRoomOrigin)}`;
  const planBack=returnTo.startsWith("#/plan")?returnTo:"#/plan";
  const back=from==="plan"?planBack:from==="interpretation-room"?roomBack:"#/home";
  const backLabel=from==="plan"?"予定へ戻る":from==="interpretation-room"?"結果の整理へ戻る":"Homeへ戻る";

  const recent=sourceRun(services,recordId);
  const sourceExperience=recent?.id&&services?.workflows?.records?.loadExperience
    ? services.workflows.records.loadExperience(recent.id)
    : null;
  const sourceEngineInput=sourceExperience?.regionalV2ResultRecord?.engine_input_snapshot || {};
  const sourceCondition=Object.freeze({
    distanceKm:Number(recent?.distanceKm)||0,
    durationMinutes:Number(recent?.durationMinutes)||0,
    runningFormat:runningFormatValue(recent),
    runningDistanceKm:Number(recent?.runningDistanceKm)||0,
    runningDurationMinutes:Number(recent?.runningDurationMinutes)||0,
    course:recent?.course&&typeof recent.course==="object"?recent.course:{},
  });
  const override=selectedCourse();
  const course=sourceCourse(recent,override);
  const distance=Number(recent?.distanceKm)>0?Number(recent.distanceKm):5;
  const duration=Number(recent?.durationMinutes)>0?Number(recent.durationMinutes):32;
  const runningFormat=runningFormatValue(recent);
  const runningDistance=Number(recent?.runningDistanceKm)>0?Number(recent.runningDistanceKm):Math.max(.1,distance*.8);
  const runningDuration=Number(recent?.runningDurationMinutes)>0?Number(recent.runningDurationMinutes):Math.max(1,Math.round(duration*.8));
  const nextCheck=recent?.reflectionContext?.nextCheckPoint||recent?.reflectionContext?.nextCheck||"";
  const sourceLabel=recordId?"選択した記録":"直近の記録";
  const comparisonTitle=recordId?"保存記録を基準に条件を比べる":"直近記録を基準に条件を比べる";
  const recordDate=dateLabel(recent?.date||"");
  const shareQuery=new URLSearchParams();
  if(recordId)shareQuery.set("recordId",recordId);
  if(from==="interpretation-room"){
    shareQuery.set("from","interpretation-room");
    shareQuery.set("roomOrigin",safeRoomOrigin);
  }
  const shareHref=`#/consultation${shareQuery.size?`?${shareQuery.toString()}`:""}`;

  const selfQuery=new URLSearchParams();
  if(from)selfQuery.set("from",from);
  if(recordId)selfQuery.set("recordId",recordId);
  if(from==="plan"&&planBack)selfQuery.set("returnTo",planBack);
  if(from==="interpretation-room")selfQuery.set("roomOrigin",safeRoomOrigin);
  const selfHref=`#/simulation${selfQuery.size?`?${selfQuery.toString()}`:""}`;

  return `<div class="screen screen--simulation screen-layout screen-layout--simulation condition-compare">
    <a class="back-link" data-context-back-duplicate href="${escapeHtml(back)}">‹ ${escapeHtml(backLabel)}</a>
    <section class="intro condition-compare-hero">
      <div class="condition-compare-hero__copy">${recordDate?`<time>${escapeHtml(recordDate)}</time>`:""}<p class="eyebrow">CONDITION COMPARE</p><h1>${escapeHtml(comparisonTitle)}</h1><p>保存された記録を基準に、変更した条件だけで12部位を再計算し、元の記録との差を整理します。</p></div>
      <div class="condition-compare-hero__mark"><span>${simulationScreenIcon("compare")}</span><div><strong>条件比較</strong><small>条件差と部位差を分けて確認</small></div></div>
    </section>
    ${nextCheck?`<section class="carry-card condition-compare-carry" aria-label="今回から引き継いだ内容"><span>${simulationScreenIcon("flag")}</span><div><small>今回の記録から</small><strong>次に確認したいこと</strong><p>${escapeHtml(nextCheck)}</p></div></section>`:""}
    <section class="condition-compare-overview" aria-labelledby="simulationOverviewTitle">
      <div class="condition-compare-section-head"><div><small>比較の要約</small><h2 id="simulationOverviewTitle">今回の比較で見えること</h2></div><p>条件を変更した結果を、元の記録との差として整理します。</p></div>
      <div class="condition-compare-overview-idle" hidden><span>${simulationScreenIcon("conditions")}</span><div><strong>条件を1項目変更すると比較が始まります</strong><p>右側で距離・時間・コースなどを変更すると、元の保存記録との差だけを表示します。</p></div></div>
      <div class="condition-compare-overview-grid">
        <article><span>${simulationScreenIcon("conditions")}</span><div><small>変更した条件</small><strong><span data-simulation-condition-count>0</span><em>項目</em></strong><p>元の記録から変更した条件の数です。</p></div></article>
        <article><span>${simulationScreenIcon("compare")}</span><div><small>変化を確認</small><strong><span data-simulation-region-count>0</span><em>部位</em></strong><p>元の記録から1ポイント以上の差がある部位です。</p></div></article>
        <article><span>${simulationScreenIcon("compare")}</span><div><small>変化の見立て</small><strong class="is-text" data-simulation-change-label>計算中</strong><p>差の方向を部位ごとに整理します。</p></div></article>
        <article><span>${simulationScreenIcon("flag")}</span><div><small>比較方法</small><strong class="is-text">条件を一つずつ確認</strong><p>何を変えたときに表示がどう変わるかを確認します。</p></div></article>
      </div>
    </section>
    <form id="simulation-form" class="workspace condition-compare-workspace" novalidate>
      <input type="hidden" name="sourceRecordId" value="${escapeHtml(recent?.id||recordId||"")}">
      <input type="hidden" name="sourceEngineInputJson" value="${escapeHtml(JSON.stringify(sourceEngineInput))}">
      <input type="hidden" name="sourceConditionJson" value="${escapeHtml(JSON.stringify(sourceCondition))}">
      <input type="hidden" name="courseJson" value="${escapeHtml(JSON.stringify(course))}">
      <section class="condition-panel condition-compare-condition" aria-labelledby="conditionTitle">
        <div class="panel-head"><div><small>CHANGE CONDITIONS</small><h2 id="conditionTitle">条件を変更</h2></div><span>元の記録を初期値に使用</span></div>
        <div class="condition-body">
          <p class="condition-compare-condition__lead">変更した項目だけを使って再計算します。入力すると比較結果が自動で更新されます。</p>
          <div class="measure-grid">
            <label class="measure-field"><span>距離</span><div><input name="distanceKm" type="number" inputmode="decimal" min="0.01" max="100" step="0.01" value="${distance.toFixed(1)}" aria-label="距離"><b>km</b></div><small class="condition-compare-adjust"><button type="button" data-simulation-adjust="distanceKm:-0.5">−0.5</button><button type="button" data-simulation-adjust="distanceKm:0.5">＋0.5</button></small></label>
            <label class="measure-field"><span>実際に走った時間</span><div><input name="durationMinutes" type="number" inputmode="decimal" min="0.01" max="600" step="0.1" value="${Math.round(duration)}" aria-label="実際に走った時間"><b>分</b></div><small class="condition-compare-adjust"><button type="button" data-simulation-adjust="durationMinutes:-5">−5分</button><button type="button" data-simulation-adjust="durationMinutes:5">＋5分</button></small></label>
          </div>
          <div class="derived-pace"><span>入力から計算した平均ペース</span><strong data-simulation-derived-pace>${escapeHtml(pace(distance,duration))}</strong></div>
          <a class="selected-course selected course-link" href="#/course-library?returnTo=${encodeURIComponent(selfHref)}"><div><small>コース条件</small><strong data-simulation-course-name>${escapeHtml(course.name||"未選択")}</strong><span>${escapeHtml(course.name?`${slopeSummary(course)}・${primarySurfaceSummary(course)}`:"坂・路面は未設定")}</span></div><b>変更 ›</b></a>
          <details class="details compact-details"${runningFormat==="RUN_WALK"?" open":""}><summary><span><strong>走り方</strong><small>元の記録から変更する場合に確認</small></span><i>⌄</i></summary><div class="details-body"><label class="field"><span>走り方</span><select name="runningFormat"><option value="CONTINUOUS_RUN"${runningFormat==="CONTINUOUS_RUN"?" selected":""}>途中で歩かず走る</option><option value="RUN_WALK"${runningFormat==="RUN_WALK"?" selected":""}>走りと歩きを混ぜる</option></select></label><div class="runwalk-grid" data-simulation-run-walk${runningFormat==="RUN_WALK"?"":" hidden"}><label><span>走った区間の距離</span><div><input name="runningDistanceKm" type="number" min="0.1" max="100" step="0.1" value="${runningDistance.toFixed(1)}"><em>km</em></div></label><label><span>走った区間の時間</span><div><input name="runningDurationMinutes" type="number" min="1" max="600" step="1" value="${Math.round(runningDuration)}"><em>分</em></div></label><p>走りと歩きを混ぜた場合は、走った区間の距離と時間を12部位の計算に使用します。</p></div></div></details>
          <div class="input-warning" data-simulation-input-warning hidden role="status"></div>
          <button class="secondary-action condition-compare-reset" type="reset">元の条件に戻す</button>
        </div>
      </section>
      <section class="preview-panel condition-compare-preview" aria-labelledby="previewTitle">
        <div class="preview-head"><div><small>READ THE DIFFERENCE</small><h2 id="previewTitle">元の記録と変更後を読み比べる</h2></div><span class="calc-state">計算中</span></div>
        <div class="condition-compare" aria-label="元の記録と変更後の条件比較">
          <article class="condition-snapshot previous"><small>${escapeHtml(sourceLabel)}（基準）</small><strong>${recent?`${escapeHtml(recent.distanceKm||"—")} km・${escapeHtml(recent.durationMinutes||"—")}分`:"記録なし"}</strong><span>${recent?`${escapeHtml(pace(recent.distanceKm,recent.durationMinutes))}・${escapeHtml(recent.course?.name||"コース未選択")}`:"比較対象なし"}</span></article>
          <i aria-hidden="true">→</i>
          <article class="condition-snapshot assumed"><small>変更後の条件</small><strong data-simulation-current-summary>${distance.toFixed(1)} km・${Math.round(duration)}分</strong><span data-simulation-current-pace>${escapeHtml(pace(distance,duration))}・${escapeHtml(course.name||"コース未選択")}</span></article>
        </div>
        <div class="assumption-chips" data-simulation-assumption-chips aria-label="変更した条件"></div>
        <div class="semantic-note condition-compare-compare-note"><strong>比較の見方</strong><span>元の保存記録と変更後の再計算結果を、同じ12部位・同じ計算方法で比較します。</span></div>
        <div id="simulation-result" class="simulation-result simulation-result--comparison" aria-live="polite"></div>
        <div class="rof-boundary condition-compare-subjective-note"><span>本人の記録</span><p>走る前後の疲労感は条件変更から推定せず、本人が実際に記録した値だけを扱います。</p></div>
      </section>
    </form>
    <section class="condition-compare-next" aria-labelledby="simulationNextTitle">
      <div class="condition-compare-section-head"><div><small>比較を次へつなぐ</small><h2 id="simulationNextTitle">この比較から確かめること</h2></div><p>比較結果を確認した後の操作を選べます。</p></div>
      <div class="condition-compare-next-grid">
        <a href="${escapeHtml(roomBack)}"><span>${simulationScreenIcon("compare")}</span><div><strong>元の結果整理へ戻る</strong><small>今回の解釈と条件比較を並べて確認します。</small></div><i>›</i></a>
        <button type="reset" form="simulation-form"><span>${simulationScreenIcon("conditions")}</span><div><strong>元の条件で再確認</strong><small>変更をすべて戻して、元の表示を確認します。</small></div><i>›</i></button>
        <a href="#/record-input"><span>${simulationScreenIcon("record")}</span><div><strong>この条件を見ながら記録を始める</strong><small>比較した条件を参考に、新しい記録へ進みます。</small></div><i>›</i></a>
        ${recordId?`<a href="${escapeHtml(shareHref)}"><span>${simulationScreenIcon("share")}</span><div><strong>共有用に整理する</strong><small>元の記録と今回の整理内容を共有画面で確認します。</small></div><i>›</i></a>`:""}
      </div>
    </section>
  </div>`;
}

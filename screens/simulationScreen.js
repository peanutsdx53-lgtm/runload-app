import { escapeHtml } from "../ui/commonComponents.js";
import { peekCourseSelection } from "../ui/flowSessionState.js";
import { primarySurfaceSummary, slopeSummary } from "../ui/coursePresentation.js";

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

  const selfQuery=new URLSearchParams();
  if(from)selfQuery.set("from",from);
  if(recordId)selfQuery.set("recordId",recordId);
  if(from==="plan"&&planBack)selfQuery.set("returnTo",planBack);
  if(from==="interpretation-room")selfQuery.set("roomOrigin",safeRoomOrigin);
  const selfHref=`#/simulation${selfQuery.size?`?${selfQuery.toString()}`:""}`;

  return `<div class="screen screen--simulation screen-layout screen-layout--simulation">
    <a class="back-link" data-context-back-duplicate href="${escapeHtml(back)}">‹ ${escapeHtml(backLabel)}</a>
    <section class="intro">
      <p class="eyebrow">CONDITION COMPARE</p>
      <div class="intro-row"><div><h1>${escapeHtml(comparisonTitle)}</h1><p>保存された今回条件を複製した状態から、変更した条件だけで12部位表示を再計算します。</p></div><span class="model-badge">12部位</span></div>
    </section>
    ${nextCheck?`<section class="carry-card" aria-label="今回から引き継いだ内容"><i aria-hidden="true"></i><div><small>今回の記録から</small><strong>次に確認したいこと</strong><p>${escapeHtml(nextCheck)}</p></div></section>`:""}
    <form id="simulation-form" class="workspace" novalidate>
      <input type="hidden" name="sourceRecordId" value="${escapeHtml(recent?.id||recordId||"")}">
      <input type="hidden" name="sourceEngineInputJson" value="${escapeHtml(JSON.stringify(sourceEngineInput))}">
      <input type="hidden" name="sourceConditionJson" value="${escapeHtml(JSON.stringify(sourceCondition))}">
      <input type="hidden" name="courseJson" value="${escapeHtml(JSON.stringify(course))}">
      <section class="condition-panel" aria-labelledby="conditionTitle">
        <div class="panel-head"><div><small>CHANGE CONDITIONS</small><h2 id="conditionTitle">条件を変更</h2></div><span>元の記録を初期値に使用</span></div>
        <div class="condition-body">
          <div class="measure-grid">
            <label class="measure-field"><span>距離</span><div><input name="distanceKm" type="number" inputmode="decimal" min="0.01" max="100" step="0.01" value="${distance.toFixed(1)}" aria-label="距離"><b>km</b></div></label>
            <label class="measure-field"><span>実際に走った時間</span><div><input name="durationMinutes" type="number" inputmode="decimal" min="0.01" max="600" step="0.1" value="${Math.round(duration)}" aria-label="実際に走った時間"><b>分</b></div></label>
          </div>
          <div class="derived-pace"><span>入力から計算</span><strong data-simulation-derived-pace>${escapeHtml(pace(distance,duration))}</strong></div>
          <a class="selected-course selected course-link" href="#/course-library?returnTo=${encodeURIComponent(selfHref)}"><div><small>コース条件</small><strong data-simulation-course-name>${escapeHtml(course.name||"未選択")}</strong><span>${escapeHtml(course.name?`${slopeSummary(course)}・${primarySurfaceSummary(course)}`:"坂・路面は未設定")}</span></div><b>変更 ›</b></a>
          <details class="details compact-details"${runningFormat==="RUN_WALK"?" open":""}>
            <summary><span><strong>走り方</strong><small>元の記録から変更する場合だけ確認</small></span><i>⌄</i></summary>
            <div class="details-body">
              <label class="field"><span>走り方</span><select name="runningFormat"><option value="CONTINUOUS_RUN"${runningFormat==="CONTINUOUS_RUN"?" selected":""}>途中で歩かず走る</option><option value="RUN_WALK"${runningFormat==="RUN_WALK"?" selected":""}>走りと歩きを混ぜる</option></select></label>
              <div class="runwalk-grid" data-simulation-run-walk${runningFormat==="RUN_WALK"?"":" hidden"}>
                <label><span>走った区間の距離</span><div><input name="runningDistanceKm" type="number" min="0.1" max="100" step="0.1" value="${runningDistance.toFixed(1)}"><em>km</em></div></label>
                <label><span>走った区間の時間</span><div><input name="runningDurationMinutes" type="number" min="1" max="600" step="1" value="${Math.round(runningDuration)}"><em>分</em></div></label>
                <p>走りと歩きを混ぜた場合は、走った区間の距離と時間を12部位の計算に使用します。</p>
              </div>
            </div>
          </details>
          <div class="input-warning" data-simulation-input-warning hidden role="status"></div>
        </div>
      </section>
      <section class="preview-panel" aria-labelledby="previewTitle">
        <div class="preview-head"><div><small>RECALCULATION</small><h2 id="previewTitle">元の記録と再計算結果を比べる</h2></div><span class="calc-state">計算中</span></div>
        <div class="condition-compare" aria-label="元の記録と仮定条件の比較">
          <article class="condition-snapshot previous"><small>${escapeHtml(sourceLabel)}</small><strong>${recent?`${escapeHtml(recent.distanceKm||"—")} km・${escapeHtml(recent.durationMinutes||"—")}分`:"記録なし"}</strong><span>${recent?`${escapeHtml(pace(recent.distanceKm,recent.durationMinutes))}・${escapeHtml(recent.course?.name||"コース未選択")}`:"比較対象なし"}</span></article>
          <i aria-hidden="true">→</i>
          <article class="condition-snapshot assumed"><small>変更後の仮定条件</small><strong data-simulation-current-summary>${distance.toFixed(1)} km・${Math.round(duration)}分</strong><span data-simulation-current-pace>${escapeHtml(pace(distance,duration))}・${escapeHtml(course.name||"コース未選択")}</span></article>
        </div>
        <div class="assumption-chips" data-simulation-assumption-chips aria-label="変更した条件"></div>
        <div class="semantic-note"><strong>同じ最新版の計算方法で、変更後の条件を再計算します。</strong><span>これは身体の状態を予測する画面ではありません。条件を変えたときRunLoadの表示がどう変わるかだけを確認します。</span></div>
        <div id="simulation-result" class="simulation-result" aria-live="polite"></div>
        <div class="rof-boundary"><span>疲労感</span><p><strong>疲労感は条件比較では変化を予測しません。</strong> 走る前・走った後に本人が記録した値だけを結果画面に表示します。</p></div>
        <div class="preview-actions"><a class="primary-action" href="#/record-input">この条件を見ながら記録を始める</a><button class="secondary-action" type="reset">元の条件に戻す</button></div>
      </section>
    </form>
  </div>`;
}

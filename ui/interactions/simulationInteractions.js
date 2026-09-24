import { PRIMARY_REGIONAL_V2_REGION_DEFS, SURFACE_FIELDS } from "../../core/runloadCore.js";
import { consumeCourseSelection } from "../flowSessionState.js";
import { primarySurfaceSummary, slopeSummary } from "../coursePresentation.js";

function finite(v){return v!==null&&v!==""&&Number.isFinite(Number(v));}
function jsonFrom(data,name,fallback={}){try{return JSON.parse(String(data.get(name)||""))||fallback;}catch{return fallback;}}
function courseFrom(data){return jsonFrom(data,"courseJson",{});}
function sourceEngineInputFrom(data){return jsonFrom(data,"sourceEngineInputJson",{});}
function sourceConditionFrom(data){return jsonFrom(data,"sourceConditionJson",{});}
const SURFACE_CATEGORY={pavedPercent:"PAVED",trackPercent:"TRACK",treadmillPercent:"TREADMILL",soilPercent:"SOIL",trailPercent:"TRAIL",naturalGrassPercent:"NATURAL_GRASS",artificialTurfPercent:"ARTIFICIAL_TURF",sandPercent:"SAND"};
function surfaceComponents(course){return SURFACE_FIELDS.map(({recordKey})=>({userCategory:SURFACE_CATEGORY[recordKey]||recordKey,sharePercent:Number(course?.[recordKey]||0)})).filter((x)=>x.sharePercent>0);}
function engineInput(data){
  const distance=Number(data.get("distanceKm")),duration=Number(data.get("durationMinutes")),format=String(data.get("runningFormat")||"CONTINUOUS_RUN");
  if(!(distance>0&&duration>0))return {error:"距離と実際に走った時間を確認してください。"};
  const course=courseFrom(data);
  const source=sourceEngineInputFrom(data);
  const input={
    ...source,
    runningFormat:format==="RUN_WALK"?"RUN_WALK":"RUN",
    distanceKm:distance,
    durationMinutes:duration,
    runSetting:String(source?.runSetting||"OUTDOOR_ROUTE"),
    runningDistanceKm:null,
    runningDurationMinutes:null,
    segments:null,
    uphillSharePercent:0,
    downhillSharePercent:0,
    uphillGradePercent:null,
    downhillGradePercent:null,
    surfaceComponents:surfaceComponents(course),
  };
  if(format==="RUN_WALK") {
    const rd=Number(data.get("runningDistanceKm")),rt=Number(data.get("runningDurationMinutes"));
    if(!(rd>0&&rt>0&&rd<distance&&rt<duration))return{error:"RUN_WALKでは、走った区間の距離と時間を全体より小さい値で入力してください。"};
    input.runningDistanceKm=rd;input.runningDurationMinutes=rt;
  }
  if(String(course.gradeKnowledge||"")==="KNOWN_PROFILE") {
    input.uphillSharePercent=Number(course.upPercent||0);
    input.downhillSharePercent=Number(course.downPercent||0);
    if(input.uphillSharePercent>0&&finite(course.upGradePercent))input.uphillGradePercent=Number(course.upGradePercent);
    if(input.downhillSharePercent>0&&finite(course.downGradePercent))input.downhillGradePercent=Number(course.downGradePercent);
  }
  if(Array.isArray(course.sections)&&course.sections.length){
    input.segments=course.sections.filter((s)=>Number(s.sharePercent)>0).map((s)=>({distanceKm:distance*Number(s.sharePercent)/100,gradePercent:finite(s.gradePercent)?Number(s.gradePercent):null}));
  }
  return {input,course};
}
function sourceValues(services,recordId=""){const x=recordId?services.workflows.records.loadExperience(recordId):services.workflows.records.loadLatestExperience();const rows=x?.regionalV2ResultRecord?.result?.regions||x?.regionalV2Result?.regions||[];return new Map(rows.map((r)=>[r.regionId,r.value]));}
function sameNumber(a,b,tolerance=.001){return finite(a)&&finite(b)&&Math.abs(Number(a)-Number(b))<=tolerance;}
function changedConditionItems(data){
  const source=sourceConditionFrom(data);
  const currentCourse=courseFrom(data);
  const items=[];
  const distance=Number(data.get("distanceKm")),duration=Number(data.get("durationMinutes"));
  const format=String(data.get("runningFormat")||"CONTINUOUS_RUN");
  const sourceFormat=String(source.runningFormat||"CONTINUOUS_RUN");
  if(!sameNumber(distance,source.distanceKm))items.push({id:"distanceKm",label:`距離 ${Number(source.distanceKm||0).toFixed(1)} → ${distance.toFixed(1)} km`});
  if(!sameNumber(duration,source.durationMinutes))items.push({id:"durationMinutes",label:`時間 ${Math.round(Number(source.durationMinutes||0))} → ${Math.round(duration)}分`});
  if(format!==sourceFormat)items.push({id:"runningFormat",label:"走り方を変更"});
  if(format==="RUN_WALK"&&sourceFormat==="RUN_WALK"){
    const runningDistance=Number(data.get("runningDistanceKm"));
    const runningDuration=Number(data.get("runningDurationMinutes"));
    if(!sameNumber(runningDistance,source.runningDistanceKm))items.push({id:"runningDistanceKm",label:`走行区間距離 ${Number(source.runningDistanceKm||0).toFixed(1)} → ${runningDistance.toFixed(1)} km`});
    if(!sameNumber(runningDuration,source.runningDurationMinutes))items.push({id:"runningDurationMinutes",label:`走行区間時間 ${Math.round(Number(source.runningDurationMinutes||0))} → ${Math.round(runningDuration)}分`});
  }
  if(JSON.stringify(currentCourse)!==JSON.stringify(source.course||{}))items.push({id:"courseJson",label:"コース条件を変更"});
  return items;
}
function changedConditionLabels(data){return changedConditionItems(data).map((item)=>item.label);}

function referenceState(value){if(!finite(value))return"unavailable";const d=Number(value)-100;return Math.abs(d)<1?"reference":d>0?"above":"below";}
function compareState(value,previous){if(!finite(value)||!finite(previous))return"unavailable";const d=Number(value)-Number(previous);return Math.abs(d)<1?"reference":d>0?"above":"below";}
function signed(v){if(!finite(v))return"—";const n=Number(v);return`${n>0?"+":""}${n.toFixed(1)}`;}
function pace(distance,duration){const d=Number(distance),t=Number(duration);if(!(d>0&&t>0))return"—";const s=Math.round(t*60/d);return`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")} /km`;}
function resultRows(result){return PRIMARY_REGIONAL_V2_REGION_DEFS.map((def)=>({def,row:result?.regions?.[def.id]||null,value:result?.regions?.[def.id]?.value}));}
const SIMULATION_RESULT_ICONS={
  compare:'<path d="M7 7h11"/><path d="m15 4 3 3-3 3"/><path d="M17 17H6"/><path d="m9 14-3 3 3 3"/>',
  above:'<path d="M5 17l5-5 4 3 5-7"/><path d="M15 8h4v4"/>',
  below:'<path d="M5 7l5 5 4-3 5 7"/><path d="M15 16h4v-4"/>',
  stable:'<path d="M5 12h14"/><path d="m8 9-3 3 3 3M16 9l3 3-3 3"/>',
  reference:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/>',
  conditions:'<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h2"/><path d="M10 17h10"/><circle cx="8" cy="17" r="2"/>',
};
function simulationResultIcon(name){
  const paths=SIMULATION_RESULT_ICONS[name]||SIMULATION_RESULT_ICONS.reference;
  return `<svg class="simulation-result-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
function comparisonItems(result,previous,compare){
  return resultRows(result).map(({def,value})=>{
    const prev=previous.get(def.displayId);
    const delta=finite(value)&&finite(prev)?Number(value)-Number(prev):null;
    const state=compare?compareState(value,prev):referenceState(value);
    return {def,value,prev,delta,state};
  });
}
function comparisonStats(result,previous){
  const items=comparisonItems(result,previous,true);
  const comparable=items.filter((item)=>finite(item.value)&&finite(item.prev));
  const changed=comparable.filter((item)=>Math.abs(Number(item.delta))>=1);
  return {
    total:items.length,
    comparable:comparable.length,
    changed:changed.length,
    above:changed.filter((item)=>Number(item.delta)>0).length,
    below:changed.filter((item)=>Number(item.delta)<0).length,
    stable:comparable.filter((item)=>Math.abs(Number(item.delta))<1).length,
  };
}
function comparisonLabel(stats,conditionCount){
  if(!conditionCount&&!stats.changed)return"元の記録と同じ";
  if(!stats.changed)return"部位差は1未満";
  if(stats.above&&stats.below)return"上側・下側に分かれる";
  if(stats.above)return"上側の変化を確認";
  if(stats.below)return"下側の変化を確認";
  return"変化を確認";
}
function groupCopy(state,compare){
  if(compare){
    if(state==="above")return{title:"元の記録より上側",note:"元の記録から1ポイント以上上側",icon:"above"};
    if(state==="below")return{title:"元の記録より下側",note:"元の記録から1ポイント以上下側",icon:"below"};
    if(state==="reference")return{title:"元の記録とほぼ同じ",note:"元の記録との差が1ポイント未満",icon:"stable"};
    return{title:"比較できない部位",note:"元の記録との比較値がありません",icon:"reference"};
  }
  if(state==="above")return{title:"基準100より上側",note:"この部位自身の基準100より上側",icon:"above"};
  if(state==="below")return{title:"基準100より下側",note:"この部位自身の基準100より下側",icon:"below"};
  if(state==="reference")return{title:"基準100付近",note:"この部位自身の基準100付近",icon:"stable"};
  return{title:"表示できない部位",note:"今回の条件では数値を表示できません",icon:"reference"};
}
function renderChangeGroups(items,compare){
  const order=["above","below","reference","unavailable"];
  return order.map((state)=>{
    const group=items.filter((item)=>item.state===state);
    if(!group.length)return"";
    const copy=groupCopy(state,compare);
    const rows=`<div class="simulation-change-list">${group.map((item)=>`<div class="simulation-change-row"><span class="simulation-change-row__icon">${simulationResultIcon("reference")}</span><span class="simulation-change-row__copy"><strong>${item.def.name}</strong><small>${compare?(finite(item.prev)?`元 ${Number(item.prev).toFixed(1)} → 今回 ${finite(item.value)?Number(item.value).toFixed(1):"—"}`:"元の記録との比較なし"):`今回 ${finite(item.value)?Number(item.value).toFixed(1):"—"} / 基準100`}</small></span><b>${compare?(finite(item.delta)?signed(item.delta):"—"):(finite(item.value)?signed(Number(item.value)-100):"—")}</b></div>`).join("")}</div>`;
    const heading=`<span>${simulationResultIcon(copy.icon)}</span><div><strong>${copy.title}</strong><small>${copy.note}</small></div><b>${group.length}部位</b>`;
    if(state==="reference")return `<details class="simulation-change-group simulation-change-group--collapsed" data-state="${state}"><summary>${heading}</summary>${rows}</details>`;
    return `<article class="simulation-change-group" data-state="${state}"><header>${heading}</header>${rows}</article>`;
  }).join("");
}
function render(result,previous,compare,data,course){
  const items=comparisonItems(result,previous,compare);
  const stats=comparisonStats(result,previous);
  const labels=changedConditionLabels(data);
  if(!labels.length&&stats.changed===0){
    return `<div class="simulation-v3-result simulation-v3-result--idle">
      <section class="simulation-idle-state"><span>${simulationResultIcon("conditions")}</span><div><small>比較を始める</small><h3>まだ条件を変更していません</h3><p>右側で距離・時間・コースなどを変更すると、元の保存記録との差がここに表示されます。</p><strong>まず1項目だけ変えると、違いを読みやすくなります。</strong></div></section>
    </div>`;
  }
  const message=`変更した条件は「${labels.join("、")}」です。元の記録との差を部位ごとに確認し、条件差と部位差を分けて読みます。`;
  return `<div class="simulation-v3-result">
    <section class="simulation-change-overview"><div class="simulation-change-overview__head"><div><small>RUNLOAD COMPARISON</small><h3>変化の見立て</h3><p>${message}</p></div><button type="button" data-action="simulation-toggle-compare" aria-pressed="${compare}">${compare?"基準100との位置を見る":"元の記録との差に戻る"}</button></div>
      <div class="simulation-change-metrics"><article><span>${simulationResultIcon("compare")}</span><div><small>比較できる部位</small><strong>${stats.comparable}<em>/ 12</em></strong></div></article><article><span>${simulationResultIcon("above")}</span><div><small>1ポイント以上の差</small><strong>${stats.changed}<em>部位</em></strong></div></article><article><span>${simulationResultIcon("stable")}</span><div><small>ほぼ同じ</small><strong>${stats.stable}<em>部位</em></strong></div></article></div>
    </section>
    <section class="simulation-change-groups" aria-label="${compare?"元の記録からの変化":"基準100との位置"}">${renderChangeGroups(items,compare)}</section>
    <section class="simulation-condition-readout"><span>${simulationResultIcon("conditions")}</span><div><strong>変更した条件</strong><p>${labels.join(" / ")}</p><small>コース：${course?.name||"未選択"}。条件差と部位差を同一画面で確認できます。</small></div></section>
    <p class="compact-boundary">部位ごとの数値は独立した基準で計算しています。ここでは部位間の順位ではなく、元の記録との差の方向を確認します。計算状態：${result?.state||"—"}</p>
  </div>`;
}
export function bindSimulation({services}){
  const form=document.getElementById("simulation-form"),target=document.getElementById("simulation-result");if(!form||!target)return;let compare=true;const sourceRecordId=String(form.querySelector('[name="sourceRecordId"]')?.value||"");const previous=sourceValues(services,sourceRecordId);
  function update(){const data=new FormData(form);const runWalk=String(data.get("runningFormat"))==="RUN_WALK";form.querySelector('[data-simulation-run-walk]').hidden=!runWalk;const changedItems=changedConditionItems(data);const labels=changedItems.map((item)=>item.label);const chips=form.querySelector('[data-simulation-assumption-chips]');if(chips){chips.innerHTML=changedItems.length?changedItems.map((item)=>`<button type="button" data-simulation-revert="${item.id}" aria-label="${item.label}を元に戻す"><span>${item.label}</span><b aria-hidden="true">×</b></button>`).join(""):'<span>変更なし</span>';}const built=engineInput(data);const warning=form.querySelector('[data-simulation-input-warning]');if(built.error){target.innerHTML="";if(warning){warning.hidden=false;warning.textContent=built.error;}return;}if(warning)warning.hidden=true;const result=services.model.primaryRegionalV2.calculatePrimaryRegionalV2(built.input);const d=Number(data.get("distanceKm")),t=Number(data.get("durationMinutes"));const p=pace(d,t);const stats=comparisonStats(result,previous);const unchanged=!labels.length&&stats.changed===0;const shell=form.closest(".simulation-v3");if(shell)shell.classList.toggle("is-unchanged",unchanged);const idleOverview=document.querySelector(".simulation-v3-overview-idle");if(idleOverview)idleOverview.hidden=!unchanged;const set=(sel,text)=>{const el=form.querySelector(sel)||document.querySelector(sel);if(el)el.textContent=text;};set('[data-simulation-derived-pace]',p);set('[data-simulation-current-summary]',`${d.toFixed(1)} km・${Math.round(t)}分`);set('[data-simulation-current-pace]',`${p}・${built.course.name||"コース未選択"}`);set('[data-simulation-condition-count]',String(labels.length));set('[data-simulation-region-count]',String(stats.changed));set('[data-simulation-change-label]',comparisonLabel(stats,labels.length));const calc=form.querySelector('.calc-state');if(calc)calc.textContent=result?.state==="OK"?"計算済み":"確認が必要";target.innerHTML=render(result,previous,compare,data,built.course);bindToggle();}
  function bindToggle(){target.querySelector('[data-action="simulation-toggle-compare"]')?.addEventListener("click",()=>{compare=!compare;update();});}
  form.querySelector("[data-simulation-assumption-chips]")?.addEventListener("click",(event)=>{
    const button=event.target.closest?.("[data-simulation-revert]");
    if(!button)return;
    const data=new FormData(form);
    const source=sourceConditionFrom(data);
    const id=String(button.dataset.simulationRevert||"");
    const setValue=(name,value)=>{const control=form.elements.namedItem(name);if(control)control.value=String(value??"");};
    if(id==="distanceKm")setValue("distanceKm",source.distanceKm);
    if(id==="durationMinutes")setValue("durationMinutes",source.durationMinutes);
    if(id==="runningFormat")setValue("runningFormat",source.runningFormat||"CONTINUOUS_RUN");
    if(id==="runningDistanceKm")setValue("runningDistanceKm",source.runningDistanceKm||"");
    if(id==="runningDurationMinutes")setValue("runningDurationMinutes",source.runningDurationMinutes||"");
    if(id==="courseJson"){
      const course=source.course&&typeof source.course==="object"?source.course:{};
      setValue("courseJson",JSON.stringify(course));
      const courseName=form.querySelector("[data-simulation-course-name]");
      if(courseName)courseName.textContent=course.name||"未選択";
      const courseLink=form.querySelector(".selected-course span");
      if(courseLink)courseLink.textContent=course.name?`${slopeSummary(course)}・${primarySurfaceSummary(course)}`:"坂・路面は未設定";
    }
    update();
  });
  form.querySelectorAll("[data-simulation-adjust]").forEach((button)=>button.addEventListener("click",()=>{
    const [name,deltaText]=String(button.dataset.simulationAdjust||"").split(":");
    const control=form.elements.namedItem(name);
    const delta=Number(deltaText);
    if(!control||!Number.isFinite(delta))return;
    const min=Number(control.min),max=Number(control.max);
    let next=Number(control.value||0)+delta;
    if(Number.isFinite(min))next=Math.max(min,next);
    if(Number.isFinite(max))next=Math.min(max,next);
    control.value=name==="distanceKm"?next.toFixed(1):String(Math.round(next));
    control.dispatchEvent(new Event("input",{bubbles:true}));
  }));
  form.addEventListener("input",update);
  form.addEventListener("change",update);
  form.addEventListener("reset",(event)=>{
    event.preventDefault();
    compare=true;
    const current=new FormData(form);
    const source=sourceConditionFrom(current);
    const engine=sourceEngineInputFrom(current);
    const setValue=(name,value)=>{const control=form.elements.namedItem(name);if(control)control.value=String(value??"");};
    setValue("distanceKm",source.distanceKm);
    setValue("durationMinutes",source.durationMinutes);
    setValue("runningFormat",source.runningFormat||"CONTINUOUS_RUN");
    setValue("runningDistanceKm",source.runningDistanceKm||engine.runningDistanceKm||"");
    setValue("runningDurationMinutes",source.runningDurationMinutes||engine.runningDurationMinutes||"");
    const course=source.course&&typeof source.course==="object"?source.course:{};
    setValue("courseJson",JSON.stringify(course));
    const courseName=form.querySelector("[data-simulation-course-name]");
    if(courseName)courseName.textContent=course.name||"未選択";
    const courseLink=form.querySelector(".selected-course span");
    if(courseLink)courseLink.textContent=course.name?`${slopeSummary(course)}・${primarySurfaceSummary(course)}`:"坂・路面は未設定";
    update();
  });
  consumeCourseSelection("simulation");
  update();
}

import { PRIMARY_REGIONAL_V2_REGION_DEFS, SURFACE_FIELDS } from "../../core/runloadCore.js";
import { consumeCourseSelection } from "../flowSessionState.js";
import { BODY_REGION_VIEWS } from "../bodyRegionVisuals.js";

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
function changedConditionLabels(data){
  const source=sourceConditionFrom(data);
  const currentCourse=courseFrom(data);
  const labels=[];
  const distance=Number(data.get("distanceKm")),duration=Number(data.get("durationMinutes"));
  const format=String(data.get("runningFormat")||"CONTINUOUS_RUN");
  if(!sameNumber(distance,source.distanceKm))labels.push(`距離 ${Number(source.distanceKm||0).toFixed(1)} → ${distance.toFixed(1)} km`);
  if(!sameNumber(duration,source.durationMinutes))labels.push(`時間 ${Math.round(Number(source.durationMinutes||0))} → ${Math.round(duration)}分`);
  if(format!==String(source.runningFormat||"CONTINUOUS_RUN"))labels.push("走り方を変更");
  if(JSON.stringify(currentCourse)!==JSON.stringify(source.course||{}))labels.push("コース条件を変更");
  return labels;
}

function referenceState(value){if(!finite(value))return"unavailable";const d=Number(value)-100;return Math.abs(d)<1?"reference":d>0?"above":"below";}
function compareState(value,previous){if(!finite(value)||!finite(previous))return"unavailable";const d=Number(value)-Number(previous);return Math.abs(d)<1?"reference":d>0?"above":"below";}
function signed(v){if(!finite(v))return"—";const n=Number(v);return`${n>0?"+":""}${n.toFixed(1)}`;}
function pace(distance,duration){const d=Number(distance),t=Number(duration);if(!(d>0&&t>0))return"—";const s=Math.round(t*60/d);return`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")} /km`;}
function resultRows(result){return PRIMARY_REGIONAL_V2_REGION_DEFS.map((def)=>({def,row:result?.regions?.[def.id]||null,value:result?.regions?.[def.id]?.value}));}
function bodyMap(rows,previous,compare){const byId=new Map(rows.map((item)=>[item.def.displayId,item]));return BODY_REGION_VIEWS.map((view)=>`<figure class="body-view"><figcaption>${view.title}</figcaption><svg viewBox="70 10 160 430" aria-label="${view.title}の部位図"><defs><pattern id="sim-hatch-${view.key}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="currentColor" opacity=".08"></rect><line x1="0" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="3" opacity=".24"></line></pattern></defs><g class="body-silhouette">${view.silhouette}</g>${view.paths.map(([id,d])=>{const item=byId.get(id),value=item?.value,prev=previous.get(id);const state=compare?compareState(value,prev):referenceState(value);return`<path class="region-path" data-direction="${state}" data-region-id="${id}"${state==="unavailable"?` style="fill:url(#sim-hatch-${view.key})"`:""} d="${d}"><title>${item?.def?.name||id}：${finite(value)?Number(value).toFixed(1):"数値なし"}</title></path>`;}).join("")}</svg></figure>`).join("");}
function render(result,previous,compare,distance,course){
  const rows=resultRows(result); const list=rows.map(({def,value})=>{const prev=previous.get(def.displayId);const delta=finite(value)&&finite(prev)?Number(value)-Number(prev):null;const state=compare?compareState(value,prev):referenceState(value);return`<div class="region-row" data-direction="${state}"><span class="region-copy"><strong>${def.name}</strong><small>${compare?(finite(prev)?`元の記録 ${Number(prev).toFixed(1)}`:"元の記録との比較なし"):"その部位自身の基準"}</small></span><span class="region-metric"><strong>${finite(value)?Number(value).toFixed(1):"—"}</strong><small>${compare?(finite(delta)?`元の記録からの変化 ${signed(delta)}`:"比較なし"):`基準から ${finite(value)?signed(Number(value)-100):"—"}`}</small></span></div>`;}).join("");
  const legend=compare?'<li><i class="above"></i>元の記録より上</li><li><i class="reference"></i>ほぼ同じ</li><li><i class="below"></i>元の記録より下</li><li><i class="unavailable"></i>比較なし</li>':'<li><i class="above"></i>その部位の基準より上</li><li><i class="reference"></i>その部位の基準付近</li><li><i class="below"></i>その部位の基準より下</li><li><i class="unavailable"></i>表示なし</li>';
  return `<div class="result-layout"><div><ul class="direction-legend" aria-label="身体図の色">${legend}</ul><div class="body-map">${bodyMap(rows,previous,compare)}</div><p class="map-note">${compare?"同じ部位について元の保存記録との差を色で示します。上・下は良し悪しを示しません。":"各部位自身の基準に対する方向を示します。別部位どうしを比べません。"}</p></div><aside class="region-panel"><div class="region-panel-head"><div><small>12 REGIONS</small><strong>${compare?"12部位の元の記録からの変化":"12部位の目安"}</strong></div><button type="button" data-action="simulation-toggle-compare" aria-pressed="${compare}">${compare?"部位の目安を見る":"元の記録からの変化を見る"}</button></div><div class="region-list">${list}</div></aside></div><p class="compact-boundary">距離 ${Number(distance).toFixed(1)} km は別の走行事実です。部位の数値へ自動的に掛けません。計算状態：${result?.state||"—"}</p>`;
}
export function bindSimulation({services}){
  const form=document.getElementById("simulation-form"),target=document.getElementById("simulation-result");if(!form||!target)return;let compare=true;const sourceRecordId=String(form.querySelector('[name="sourceRecordId"]')?.value||"");const previous=sourceValues(services,sourceRecordId);
  function update(){const data=new FormData(form);const runWalk=String(data.get("runningFormat"))==="RUN_WALK";form.querySelector('[data-simulation-run-walk]').hidden=!runWalk;const chips=form.querySelector('[data-simulation-assumption-chips]');if(chips){const labels=changedConditionLabels(data);chips.innerHTML=labels.length?labels.map((label)=>`<span>${label}</span>`).join(""):'<span>変更なし</span>';}const built=engineInput(data);const warning=form.querySelector('[data-simulation-input-warning]');if(built.error){target.innerHTML="";if(warning){warning.hidden=false;warning.textContent=built.error;}return;}if(warning)warning.hidden=true;const result=services.model.primaryRegionalV2.calculatePrimaryRegionalV2(built.input);const d=Number(data.get("distanceKm")),t=Number(data.get("durationMinutes"));const p=pace(d,t);const set=(sel,text)=>{const el=form.querySelector(sel);if(el)el.textContent=text;};set('[data-simulation-derived-pace]',p);set('[data-simulation-current-summary]',`${d.toFixed(1)} km・${Math.round(t)}分`);set('[data-simulation-current-pace]',`${p}・${built.course.name||"コース未選択"}`);const calc=form.querySelector('.calc-state');if(calc)calc.textContent=result?.state==="OK"?"計算済み":"確認が必要";target.innerHTML=render(result,previous,compare,d,built.course);bindToggle();}
  function bindToggle(){target.querySelector('[data-action="simulation-toggle-compare"]')?.addEventListener("click",()=>{compare=!compare;update();});}
  form.addEventListener("input",update);form.addEventListener("change",update);form.addEventListener("reset",()=>setTimeout(update,0));consumeCourseSelection("simulation");update();
}

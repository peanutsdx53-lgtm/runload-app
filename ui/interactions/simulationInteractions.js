import { PRIMARY_REGIONAL_V2_REGION_DEFS, SURFACE_FIELDS } from "../../core/runloadCore.js";
import { consumeCourseSelection } from "../flowSessionState.js";

function finite(v){return v!==null&&v!==""&&Number.isFinite(Number(v));}
function courseFrom(data){try{return JSON.parse(String(data.get("courseJson")||"{}"));}catch{return {};}}
const SURFACE_CATEGORY={pavedPercent:"PAVED",trackPercent:"TRACK",treadmillPercent:"TREADMILL",soilPercent:"SOIL",trailPercent:"TRAIL",naturalGrassPercent:"NATURAL_GRASS",artificialTurfPercent:"ARTIFICIAL_TURF",sandPercent:"SAND"};
function surfaceComponents(course){return SURFACE_FIELDS.map(({recordKey})=>({userCategory:SURFACE_CATEGORY[recordKey]||recordKey,sharePercent:Number(course?.[recordKey]||0)})).filter((x)=>x.sharePercent>0);}
function engineInput(data){
  const distance=Number(data.get("distanceKm")),duration=Number(data.get("durationMinutes")),format=String(data.get("runningFormat")||"CONTINUOUS_RUN");
  if(!(distance>0&&duration>0))return {error:"距離と実走時間を確認してください。"};
  const course=courseFrom(data);const input={runningFormat:format==="RUN_WALK"?"RUN_WALK":"RUN",distanceKm:distance,durationMinutes:duration,runSetting:"OUTDOOR_ROUTE",surfaceComponents:surfaceComponents(course)};
  if(format==="RUN_WALK") {const rd=Number(data.get("runningDistanceKm")),rt=Number(data.get("runningDurationMinutes"));if(!(rd>0&&rt>0&&rd<distance&&rt<duration))return{error:"RUN_WALKでは、走った区間の距離と時間を全体より小さい値で入力してください。"};input.runningDistanceKm=rd;input.runningDurationMinutes=rt;}
  if(String(course.gradeKnowledge||"")==="KNOWN_PROFILE") {input.uphillSharePercent=Number(course.upPercent||0);input.downhillSharePercent=Number(course.downPercent||0);if(input.uphillSharePercent>0&&finite(course.upGradePercent))input.uphillGradePercent=Number(course.upGradePercent);if(input.downhillSharePercent>0&&finite(course.downGradePercent))input.downhillGradePercent=Number(course.downGradePercent);}
  if(Array.isArray(course.sections)&&course.sections.length){input.segments=course.sections.filter((s)=>Number(s.sharePercent)>0).map((s)=>({distanceKm:distance*Number(s.sharePercent)/100,gradePercent:finite(s.gradePercent)?Number(s.gradePercent):null}));}
  return {input,course};
}
function latestValues(services){const x=services.workflows.records.loadLatestExperience();return new Map((x?.regionalV2Result?.regions||[]).map((r)=>[r.regionId,r.value]));}
function state(value){if(!finite(value))return"unavailable";const d=Number(value)-100;return Math.abs(d)<1?"reference":d>0?"above":"below";}
function signed(v){if(!finite(v))return"—";const n=Number(v);return`${n>0?"+":""}${n.toFixed(1)}`;}
function render(result,previous,compare,distance){
  const rows=PRIMARY_REGIONAL_V2_REGION_DEFS.map((def)=>{const row=result?.regions?.[def.id];const value=row?.value;const prev=previous.get(def.id);const delta=finite(value)&&finite(prev)?Number(value)-Number(prev):null;return`<div class="simulation-region-row" data-direction="${compare?(finite(delta)?delta>1?"above":delta<-1?"below":"reference":"unavailable"):state(value)}"><div><strong>${def.name}</strong><small>${def.id}</small></div><div><b>${finite(value)?Number(value).toFixed(1):"—"}</b><span>${compare?(finite(delta)?`前回差 ${signed(delta)}`:"前回比較なし"):"同じ部位の基準100"}</span></div></div>`;}).join("");
  return `<div class="simulation-facts"><span>距離 <strong>${Number(distance).toFixed(1)} km</strong></span><span>計算状態 <strong>${result?.state||"—"}</strong></span></div><p class="inline-helper">部位ごとに、その部位自身の基準100と比較します。別部位どうしの順位には使いません。</p><div class="simulation-region-list">${rows}</div>`;
}
export function bindSimulation({services}){
  const form=document.getElementById("simulation-form"),target=document.getElementById("simulation-result");if(!form||!target)return;let compare=false;
  function update(){const data=new FormData(form);const runWalk=String(data.get("runningFormat"))==="RUN_WALK";form.querySelector('[data-simulation-run-walk]').hidden=!runWalk;const built=engineInput(data);if(built.error){target.innerHTML=`<p class="form-messages">${built.error}</p>`;return;}const result=services.model.primaryRegionalV2.calculatePrimaryRegionalV2(built.input);target.innerHTML=render(result,latestValues(services),compare,Number(data.get("distanceKm")));}
  form.addEventListener("input",update);form.addEventListener("change",update);form.addEventListener("reset",()=>setTimeout(update,0));
  form.querySelector('[data-action="simulation-toggle-compare"]')?.addEventListener("click",(e)=>{compare=!compare;e.currentTarget.setAttribute("aria-pressed",String(compare));e.currentTarget.textContent=compare?"Reference-100を見る":"前回差を見る";update();});
  consumeCourseSelection("simulation");update();
}

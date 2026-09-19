import { normalizePlanFactSession } from "../../core/runloadCore.js";
import { consumeCourseSelection } from "../flowSessionState.js";
import { setHidden, showFormMessages } from "./formUtilities.js";

function number(data,name){const raw=String(data.get(name)||"").trim();return raw===""?null:Number(raw);}
function courseFromForm(data){try{return JSON.parse(String(data.get("courseJson")||"{}"));}catch{return {gradeKnowledge:"UNKNOWN",modelSurfaceClass:"UNKNOWN"};}}
function updateVisibility(form){
  const rest=form.querySelector('[name="planType"]:checked')?.value==="rest";
  form.querySelectorAll('[data-plan-run-fields]').forEach((el)=>setHidden(el,rest));
  form.querySelectorAll('[data-plan-rest-fields]').forEach((el)=>setHidden(el,!rest));
  form.querySelectorAll('[data-plan-type-button]').forEach((button)=>button.classList.toggle('active', button.dataset.planTypeButton===(rest?'rest':'run')));
  const data=new FormData(form); const date=String(data.get('scheduledDate')||''); const distance=String(data.get('distanceKm')||''); const duration=String(data.get('durationMinutes')||'');
  const course=courseFromForm(data); const dateLabel=date?date.replace(/^(\d{4})-(\d{2})-(\d{2})$/,(_,y,m,d)=>`${Number(m)}月${Number(d)}日`):'未設定';
  const set=(sel,text)=>{const el=form.querySelector(sel);if(el)el.textContent=text;};
  set('[data-plan-date-display]', date?date.replaceAll('-','/'):'未設定');
  set('[data-plan-summary-kind]', rest?'休養予定':'走行予定'); set('[data-plan-summary-date]',dateLabel);
  set('[data-plan-summary-line]',rest?'走行条件なし':`${distance||'—'} km・${duration||'—'}分・${course.name||'コース未選択'}`);
  set('[data-plan-summary-distance]',`${distance||'—'} km`); set('[data-plan-summary-duration]',`${duration||'—'}分`); set('[data-plan-summary-course]',course.name||'未選択');
  const metrics=form.querySelector('[data-plan-summary-metrics]');if(metrics)metrics.hidden=rest;
}
export function bindPlan({ services, router, rerender }) {
  const form=document.getElementById("plan-form");
  if(form){
    updateVisibility(form);
    form.querySelectorAll('[data-plan-type-button]').forEach((button)=>button.addEventListener('click',()=>{const radio=form.querySelector(`[name="planType"][value="${button.dataset.planTypeButton}"]`);if(radio)radio.checked=true;updateVisibility(form);}));
    form.addEventListener("input",()=>updateVisibility(form));
    form.addEventListener("change",()=>updateVisibility(form));
    document.querySelectorAll('[data-action="use-previous-facts"]').forEach((button)=>button.addEventListener("click",()=>{
      const d=form.elements.namedItem("distanceKm"),t=form.elements.namedItem("durationMinutes");if(d)d.value=button.dataset.distance||"";if(t)t.value=button.dataset.duration||"";
    }));
    form.addEventListener("submit",(event)=>{
      event.preventDefault();const data=new FormData(form);const planType=String(data.get("planType")||"run");const course=courseFromForm(data);
      const plannedSession=normalizePlanFactSession({activityType:planType,distanceKm:number(data,"distanceKm"),durationMinutes:number(data,"durationMinutes"),runningFormat:String(data.get("runningFormat")||"UNKNOWN"),course});
      const result=services.workflows.plans.savePlan({id:String(data.get("planId")||""),scheduledDate:String(data.get("scheduledDate")||""),planType,title:planType==="rest"?"休養予定":"走行予定",memo:String(data.get("memo")||""),sourceCandidateId:"user-entered",plannedSession});
      if(!result.ok){showFormMessages(form,[result.message||"予定を保存できませんでした。"]);return;}
      consumeCourseSelection("plan");router.navigateToScreen("plan",{planId:result.item.id,saved:"1"});
    });
  }
  document.querySelectorAll('[data-action="delete-plan"]').forEach((button)=>button.addEventListener("click",()=>{
    if(!window.confirm("この予定を削除しますか？"))return;const result=services.storage.plans.removeById(button.dataset.planId||"");if(result.ok)rerender();else window.alert("予定を削除できませんでした。");
  }));
}

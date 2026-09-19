import { normalizePlanFactSession } from "../../core/runloadCore.js";
import { consumeCourseSelection } from "../flowSessionState.js";
import { setHidden, showFormMessages } from "./formUtilities.js";

function number(data,name){const raw=String(data.get(name)||"").trim();return raw===""?null:Number(raw);}
function courseFromForm(data){try{return JSON.parse(String(data.get("courseJson")||"{}"));}catch{return {gradeKnowledge:"UNKNOWN",modelSurfaceClass:"UNKNOWN"};}}
function updateVisibility(form){const rest=form.querySelector('[name="planType"]:checked')?.value==="rest";form.querySelectorAll('[data-plan-run-fields]').forEach((el)=>setHidden(el,rest));}
export function bindPlan({ services, router, rerender }) {
  const form=document.getElementById("plan-form");
  if(form){
    updateVisibility(form);
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

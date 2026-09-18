const regions={
quad:{name:"大腿前面",value:108,prev:104,pos:70,pulses:[[17,102],[18,102],[18,102]]},
ham:{name:"大腿後面",value:104,prev:102,pos:60,pulses:[[31,102],[29,102],[27,102]]},
glute:{name:"殿部",value:101,prev:99,pos:52.5,pulses:[[29,88],[27,88],[26,88]]},
hip:{name:"股関節周辺",value:100,prev:98,pos:50,pulses:[[24,84],[25,84],[26,84]]},
calf:{name:"ふくらはぎ",value:103,prev:101,pos:57.5,pulses:[[33,132],[30,132],[27,132]]},
shin:{name:"下腿前面",value:102,prev:100,pos:55,pulses:[[16,132],[18,132],[20,132]]},
ankle:{name:"足関節周辺",value:101,prev:100,pos:52.5,pulses:[[31,148],[30,148],[29,148]]},
foot:{name:"足部",value:98,prev:100,pos:45,pulses:[[32,157],[30,157],[28,157]]},
trunk:{name:"体幹",value:99,prev:99,pos:47.5,pulses:[[21,58],[23,58],[25,58]]},
shoulder:{name:"肩周辺",value:97,prev:96,pos:42.5,pulses:[[8,47],[11,47],[13,47]]},
arm:{name:"上腕",value:96,prev:null,pos:40,pulses:[[4,69],[7,69],[10,69]]},
whole:{name:"全身",value:100,prev:100,pos:50,pulses:[[22,75],[24,75],[26,75]]}
};
const order=["quad","ham","glute","hip","calf","shin","ankle","foot","trunk","shoulder","arm","whole"];
const highlightKeys=["quad","ham","calf","glute"];
let currentKey="quad";

function deltaLabel(value,prev){
  if(prev===null||prev===undefined)return "前回比較なし";
  const d=value-prev;
  return "前回から "+(d>0?"+":"")+d;
}
function updateReferenceRange(pos){
  const fill=document.querySelector(".reference-fill");
  if(pos>=50){fill.style.left="50%";fill.style.width=(pos-50)+"%";}
  else{fill.style.left=pos+"%";fill.style.width=(50-pos)+"%";}
}
function setRegion(key){
  const r=regions[key]; if(!r)return;
  currentKey=key;
  const metric=document.querySelector(".metric-head");
  metric.classList.remove("switching"); void metric.offsetWidth; metric.classList.add("switching");
  document.querySelector("#regionName").textContent=r.name;
  document.querySelector("#refValue").textContent=r.value;
  document.querySelector("#marker").style.left=r.pos+"%";
  updateReferenceRange(r.pos);

  const prev=document.querySelector("#prevValue");
  const note=document.querySelector("#prevNote");
  if(r.prev===null||r.prev===undefined){prev.textContent="—";note.textContent="前回比較なし";}
  else{prev.textContent=r.prev;note.textContent=deltaLabel(r.value,r.prev);}

  ["pulse1","pulse2","pulse3"].forEach((id,idx)=>{
    const el=document.querySelector("#"+id), p=r.pulses[idx];
    el.style.left=p[0]+"px"; el.style.top=p[1]+"px";
    el.style.opacity=idx===0?"1":idx===1?".36":".22";
  });
  document.querySelectorAll("[data-region-key]").forEach(btn=>{
    btn.classList.toggle("selected",btn.dataset.regionKey===key);
  });
}

document.querySelector("#factsToggle").addEventListener("click",function(){
  const open=this.getAttribute("aria-expanded")==="true";
  this.setAttribute("aria-expanded",String(!open));
  document.querySelector("#factsPanel").hidden=open;
});

function openModal(id){document.querySelector("#"+id).hidden=false;document.body.style.overflow="hidden";}
function closeModal(id){document.querySelector("#"+id).hidden=true;document.body.style.overflow="";}
function openRegionSelector(){openModal("regionModal");syncRegionSelection();}

document.querySelector("#regionSelector").addEventListener("click",openRegionSelector);
document.querySelector("#bodyStage").addEventListener("click",openRegionSelector);
document.querySelector("#themeBtn").addEventListener("click",()=>openModal("themeModal"));
document.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click",()=>closeModal(btn.dataset.close)));
document.querySelectorAll(".overlay").forEach(overlay=>overlay.addEventListener("click",e=>{if(e.target===overlay)closeModal(overlay.id);}));

const major=document.querySelector("#majorRegions");
highlightKeys.forEach(key=>{
  const r=regions[key], d=r.prev===null?null:r.value-r.prev;
  const btn=document.createElement("button");
  btn.type="button"; btn.className="select-row"; btn.dataset.regionKey=key;
  btn.innerHTML="<span class='select-main'><strong>"+r.name+"</strong><small>前回 "+(r.prev??"—")+" / 今回 "+r.value+"</small></span><span class='select-current'><strong>"+(d===null?"—":(d>0?"+":"")+d)+"</strong><small>前回差</small></span>";
  btn.addEventListener("click",()=>chooseRegion(key));
  major.appendChild(btn);
});

const grid=document.querySelector("#regionGrid");
order.forEach(key=>{
  const r=regions[key], pos=Math.max(0,Math.min(100,r.pos));
  const btn=document.createElement("button");
  btn.type="button"; btn.dataset.regionKey=key;
  btn.innerHTML="<strong>"+r.name+"</strong><i class='mini-scale'><i class='mini-dot' style='--mini:"+pos+"%'></i></i><span>"+r.value+"</span>";
  btn.addEventListener("click",()=>chooseRegion(key));
  grid.appendChild(btn);
});
function chooseRegion(key){setRegion(key);closeModal("regionModal");}
function syncRegionSelection(){document.querySelectorAll("[data-region-key]").forEach(btn=>btn.classList.toggle("selected",btn.dataset.regionKey===currentKey));}

function showRegionMode(mode){
  const majorMode=mode==="major";
  document.querySelector("#majorPanel").hidden=!majorMode;
  document.querySelector("#allPanel").hidden=majorMode;
  document.querySelector("#majorTab").classList.toggle("active",majorMode);
  document.querySelector("#allTab").classList.toggle("active",!majorMode);
  document.querySelector("#majorTab").setAttribute("aria-selected",String(majorMode));
  document.querySelector("#allTab").setAttribute("aria-selected",String(!majorMode));
}
document.querySelector("#majorTab").addEventListener("click",()=>showRegionMode("major"));
document.querySelector("#allTab").addEventListener("click",()=>showRegionMode("all"));

let appliedTheme="default", previewTheme="default";
function previewTheme(theme){
  previewTheme=theme; document.documentElement.dataset.theme=theme;
  document.querySelectorAll(".theme-option").forEach(btn=>btn.classList.toggle("selected",btn.dataset.theme===theme));
}
document.querySelectorAll(".theme-option").forEach(btn=>btn.addEventListener("click",()=>previewTheme(btn.dataset.theme)));
document.querySelector("#themeBtn").addEventListener("click",()=>previewTheme(appliedTheme));
document.querySelector("#applyTheme").addEventListener("click",()=>{appliedTheme=previewTheme;closeModal("themeModal");});
document.querySelector("#cancelTheme").addEventListener("click",()=>{previewTheme(appliedTheme);closeModal("themeModal");});
document.querySelector('#themeModal [data-close="themeModal"]').addEventListener("click",()=>previewTheme(appliedTheme));

setRegion("quad");

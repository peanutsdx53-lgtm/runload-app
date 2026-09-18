var regions={
quad:{name:"大腿前面",value:108,prev:104,pos:70,pulses:[[16,91],[17,91],[17,91]]},
calf:{name:"ふくらはぎ",value:103,prev:101,pos:57.5,pulses:[[31,119],[29,119],[26,119]]},
glute:{name:"殿部",value:101,prev:99,pos:52.5,pulses:[[28,79],[26,79],[25,79]]},
foot:{name:"足部",value:98,prev:100,pos:45,pulses:[[31,139],[29,139],[27,139]]},
ham:{name:"大腿後面",value:104,prev:102,pos:60,pulses:[[30,91],[28,91],[26,91]]},
shin:{name:"下腿前面",value:102,prev:100,pos:55,pulses:[[16,119],[18,119],[20,119]]},
hip:{name:"股関節周辺",value:100,prev:98,pos:50,pulses:[[23,77],[24,77],[25,77]]},
trunk:{name:"体幹",value:99,prev:99,pos:47.5,pulses:[[19,52],[22,52],[24,52]]},
shoulder:{name:"肩周辺",value:97,prev:96,pos:42.5,pulses:[[8,42],[10,42],[12,42]]},
arm:{name:"上腕",value:96,prev:null,pos:40,pulses:[[4,61],[7,61],[10,61]]},
ankle:{name:"足関節周辺",value:101,prev:100,pos:52.5,pulses:[[30,132],[29,132],[28,132]]},
whole:{name:"全身",value:100,prev:100,pos:50,pulses:[[20,67],[22,67],[24,67]]}
};
function diffLabel(value,prev){if(prev===null||prev===undefined)return "前回比較なし";var d=value-prev;if(d===0)return "今回との差 ±0";return "今回との差 "+(d>0?"+":"")+d}
function setRegion(k){
  var r=regions[k];if(!r)return;
  document.querySelector("#regionName").textContent=r.name;
  document.querySelector("#refValue").textContent=r.value;
  document.querySelector("#markerVal").textContent=r.value;
  document.querySelector("#marker").style.left=r.pos+"%";
  var prev=document.querySelector("#prevValue"),note=document.querySelector("#prevNote");
  if(r.prev===null||r.prev===undefined){prev.textContent="—";note.textContent="前回比較なし"}else{prev.textContent=r.prev;note.textContent=diffLabel(r.value,r.prev)}
  ["pulse1","pulse2","pulse3"].forEach(function(id,idx){var el=document.querySelector("#"+id),p=r.pulses[idx];el.style.left=p[0]+"px";el.style.top=p[1]+"px";el.style.opacity=idx===0?"1":idx===1?".38":".22"});
  document.querySelectorAll("[data-region-key]").forEach(function(b){b.classList.toggle("selected",b.dataset.regionKey===k)});
}
document.querySelector("#factsToggle").addEventListener("click",function(){var p=document.querySelector("#factsPanel"),open=this.getAttribute("aria-expanded")==="true";this.setAttribute("aria-expanded",String(!open));p.hidden=open});
function openModal(id){document.querySelector("#"+id).hidden=false;document.body.style.overflow="hidden"}function closeModal(id){document.querySelector("#"+id).hidden=true;document.body.style.overflow=""}
function openRegionSelector(){openModal("regionModal")}
document.querySelector("#regionSelector").onclick=openRegionSelector;
document.querySelector("#bodyStage").onclick=openRegionSelector;
document.querySelector("#bodyStage").addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();openRegionSelector()}});
document.querySelector("#themeBtn").onclick=function(){openModal("themeModal")};document.querySelectorAll("[data-close]").forEach(function(b){b.onclick=function(){closeModal(b.dataset.close)}});document.querySelectorAll(".overlay").forEach(function(o){o.addEventListener("click",function(e){if(e.target===o)closeModal(o.id)})});
var order=["quad","ham","glute","hip","calf","shin","ankle","foot","trunk","shoulder","arm","whole"],grid=document.querySelector("#regionGrid"),major=document.querySelector("#majorRegions");
function delta(r){return r.prev===null||r.prev===undefined?null:r.value-r.prev}
function choose(k){setRegion(k);closeModal("regionModal")}
var majorKeys=order.filter(function(k){return delta(regions[k])!==null}).sort(function(a,b){return Math.abs(delta(regions[b]))-Math.abs(delta(regions[a]))}).slice(0,4);
majorKeys.forEach(function(k){var r=regions[k],d=delta(r),b=document.createElement("button");b.type="button";b.className="select-row";b.dataset.regionKey=k;b.innerHTML="<span class='select-main'><strong>"+r.name+"</strong><small>前回 "+r.prev+" → 今回 "+r.value+"</small></span><span class='select-current'><strong>"+(d>0?"+":"")+d+"</strong><small>前回差</small></span>";b.onclick=function(){choose(k)};major.appendChild(b)});
order.forEach(function(k){var r=regions[k],b=document.createElement("button"),pos=Math.max(0,Math.min(100,r.pos));b.type="button";b.dataset.regionKey=k;b.innerHTML="<strong>"+r.name+"</strong><i class='mini-scale'><i class='mini-dot' style='--mini:"+pos+"%'></i></i><span>"+r.value+"</span>";b.onclick=function(){choose(k)};grid.appendChild(b)});
function showRegionMode(mode){var majorMode=mode==="major";document.querySelector("#majorPanel").hidden=!majorMode;document.querySelector("#allPanel").hidden=majorMode;document.querySelector("#majorTab").classList.toggle("active",majorMode);document.querySelector("#allTab").classList.toggle("active",!majorMode);document.querySelector("#majorTab").setAttribute("aria-selected",String(majorMode));document.querySelector("#allTab").setAttribute("aria-selected",String(!majorMode))}
document.querySelector("#majorTab").onclick=function(){showRegionMode("major")};document.querySelector("#allTab").onclick=function(){showRegionMode("all")};
setRegion("quad");
var applied="default",preview="default";function setTheme(t){preview=t;document.documentElement.dataset.theme=t;document.querySelectorAll(".theme-option").forEach(function(b){b.classList.toggle("on",b.dataset.theme===t)})}
document.querySelectorAll(".theme-option").forEach(function(b){b.onclick=function(){setTheme(b.dataset.theme)}});document.querySelector("#applyTheme").onclick=function(){applied=preview;closeModal("themeModal")};document.querySelector("#cancelTheme").onclick=function(){setTheme(applied);closeModal("themeModal")};
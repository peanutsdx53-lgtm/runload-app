const FRONT='<circle cx="150" cy="36" r="20"></circle><path d="M110 78 C120 66 135 60 150 60 C165 60 180 66 190 78 L204 126 C208 138 204 150 196 160 L182 176 L188 212 C192 228 190 246 184 262 L172 308 C168 324 166 340 166 356 L166 400 C166 410 158 418 148 418 C138 418 130 410 130 400 L130 356 C130 340 128 324 124 308 L112 262 C106 246 104 228 108 212 L114 176 L100 160 C92 150 88 138 92 126 Z"></path>';
const BACK='<circle cx="150" cy="36" r="20"></circle><path d="M112 76 C122 66 136 60 150 60 C164 60 178 66 188 76 L202 124 C206 136 202 150 194 160 L182 174 L188 212 C192 228 190 244 184 262 L172 310 C168 326 166 342 166 358 L166 402 C166 412 158 420 148 420 C138 420 130 412 130 402 L130 358 C130 342 128 326 124 310 L112 262 C106 244 104 228 108 212 L114 174 L102 160 C94 150 90 136 94 124 Z"></path>';
const FOOT='<path d="M114 78 C126 66 140 60 154 60 C172 60 186 72 194 92 C198 102 200 116 200 132 L200 238 C200 274 186 306 160 320 C150 326 140 326 130 320 C108 306 96 274 96 238 L96 132 C96 112 102 90 114 78 Z"></path>';
const VIEWS=[
 {key:'front',title:'前面',silhouette:FRONT,paths:[
  ['BA-DISP-014','M120 142 C130 132 140 128 150 128 C160 128 170 132 180 142 L178 178 C168 184 160 188 150 188 C140 188 132 184 122 178 Z'],
  ['BA-DISP-016','M122 190 C132 198 141 202 150 202 C159 202 168 198 178 190 L174 266 C164 274 158 278 150 278 C142 278 136 274 126 266 Z'],
  ['BA-DISP-019','M126 270 C136 278 142 281 150 281 C158 281 164 278 174 270 L170 300 C162 306 157 309 150 309 C143 309 138 306 130 300 Z'],
  ['BA-DISP-021','M130 306 C138 314 144 318 150 318 C156 318 162 314 170 306 L166 382 C160 390 156 394 150 394 C144 394 140 390 134 382 Z'],
  ['BA-DISP-024','M135 386 L165 386 L166 416 L134 416 Z']
 ]},
 {key:'back',title:'後面',silhouette:BACK,paths:[
  ['BA-DISP-015','M120 138 C130 150 139 158 150 158 C161 158 170 150 180 138 L180 190 C170 200 160 205 150 205 C140 205 130 200 120 190 Z'],
  ['BA-DISP-018','M122 196 C132 204 141 209 150 209 C159 209 168 204 178 196 L174 274 C164 282 158 286 150 286 C142 286 136 282 126 274 Z'],
  ['BA-DISP-023','M128 288 C136 298 143 302 150 302 C157 302 164 298 172 288 L166 368 C160 378 156 383 150 383 C144 383 140 378 134 368 Z'],
  ['BA-DISP-025','M142 370 C146 378 148 382 150 382 C152 382 154 378 158 370 L158 416 H142 Z']
 ]},
 {key:'sole',title:'足裏',silhouette:FOOT,paths:[
  ['BA-DISP-029','M112 92 C124 84 138 80 154 80 C174 80 188 94 190 120 L190 164 C174 170 158 172 140 168 C126 165 114 158 106 148 L106 120 C107 108 109 99 112 92 Z'],
  ['BA-DISP-028','M106 154 C120 166 136 172 154 172 C170 172 182 168 190 164 L190 252 C176 260 162 264 148 262 C130 260 116 252 104 240 L104 176 Z'],
  ['BA-DISP-027','M104 240 C118 254 132 262 148 264 C164 266 178 260 190 252 C186 282 174 304 158 314 C148 320 138 318 128 312 C112 300 104 274 104 240 Z']
 ]}
];
const regions=[
 {id:'BA-DISP-014',name:'股関節部',value:100,prev:98,history:[97,99,98,98,100]},
 {id:'BA-DISP-015',name:'殿部',value:101,prev:99,history:[98,99,100,99,101]},
 {id:'BA-DISP-016',name:'大腿前面',value:108,prev:104,history:[101,102,103,104,108]},
 {id:'BA-DISP-018',name:'大腿後面',value:104,prev:102,history:[100,101,101,102,104]},
 {id:'BA-DISP-019',name:'膝蓋大腿関節部',value:102,prev:102,history:[99,100,101,102,102]},
 {id:'BA-DISP-021',name:'脛骨部',value:102,prev:101,history:[98,100,100,101,102]},
 {id:'BA-DISP-023',name:'下腿後面',value:103,prev:101,history:[99,100,102,101,103]},
 {id:'BA-DISP-024',name:'足関節部',value:101,prev:101,history:[100,100,101,101,101]},
 {id:'BA-DISP-025',name:'アキレス腱部',value:99,prev:100,history:[101,100,100,100,99]},
 {id:'BA-DISP-027',name:'後足部',value:98,prev:99,history:[101,100,100,99,98]},
 {id:'BA-DISP-028',name:'足底中部・内側縦足弓',value:null,prev:null,history:[]},
 {id:'BA-DISP-029',name:'前足部',value:97,prev:98,history:[100,99,99,98,97]}
];
const byId=new Map(regions.map(r=>[r.id,r]));
const pathInfo=new Map();
VIEWS.forEach(v=>v.paths.forEach(([id,d])=>pathInfo.set(id,{view:v,d})));
function finite(v){return v!==null&&v!==''&&Number.isFinite(Number(v));}
function stateFor(v){if(!finite(v))return'unavailable';const d=Number(v)-100;if(Math.abs(d)<1)return'reference';return d>0?'above':'below';}
function signed(v){return `${v>0?'+':''}${v}`;}
function previousDelta(r){return finite(r.value)&&finite(r.prev)?Number(r.value)-Number(r.prev):null;}
function displaySalienceThreshold(referenceValue){return finite(referenceValue)?Math.max(.05,Math.abs(Number(referenceValue))*.01):.05;}
function focusSignal(r){const conditionUp=finite(r.value)&&Number(r.value)-100>=displaySalienceThreshold(100);const pd=previousDelta(r);const previousUp=finite(pd)&&finite(r.prev)&&pd>=displaySalienceThreshold(r.prev);if(!conditionUp&&!previousUp)return null;return{priority:conditionUp&&previousUp?1:conditionUp?2:3,conditionUp,previousUp};}
const focusRegions=regions.map((r,index)=>({r,index,s:focusSignal(r)})).filter(x=>x.s).sort((a,b)=>a.s.priority-b.s.priority||a.index-b.index).map(x=>x.r);
function position(v){if(!finite(v)||v<=0)return 50;return Math.max(4,Math.min(96,50+Math.log2(Number(v)/100)*20));}
function directionText(v){if(!finite(v))return'数値なし';const d=Number(v)-100;if(Math.abs(d)<1)return'基準100付近';return `基準100から ${signed(Number(d.toFixed(1)))}`;}
function hatch(view){return `<defs><pattern id="hatch-${view}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="currentColor" opacity=".08"></rect><line x1="0" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="3" opacity=".24"></line></pattern></defs>`;}
function renderBodyMap(){
 return VIEWS.map(v=>`<figure class="body-view" data-view="${v.key}"><figcaption>${v.title}</figcaption><svg viewBox="70 10 160 430" aria-label="${v.title}の部位図">${hatch(v.key)}<g class="body-silhouette">${v.silhouette}</g>${v.paths.map(([id,d])=>{const r=byId.get(id),state=stateFor(r?.value),label=`${r.name}：${finite(r.value)?`今回の目安 ${r.value}、${directionText(r.value)}`:'今回の目安は数値なし'}`;return `<a class="region-link" href="#detail=${encodeURIComponent(id)}" aria-label="${label}。詳細を開く"><path class="region-path" data-direction="${state}" data-region-id="${id}" d="${d}"><title>${label}</title></path></a>`;}).join('')}</svg></figure>`).join('');
}
function locatorSvg(r,large=false){const p=pathInfo.get(r.id);if(!p)return'';return `<svg viewBox="70 10 160 430" aria-hidden="true"><g class="mini-silhouette">${p.view.silhouette}</g><path class="mini-region" d="${p.d}"></path></svg>`;}
function rowMarkup(r){const pd=previousDelta(r);return `<button class="region-row" type="button" data-open-detail="${r.id}"><span class="locator">${locatorSvg(r)}</span><span class="region-copy"><strong>${r.name}</strong><small>${pathInfo.get(r.id).view.title}・${finite(r.prev)?`前回 ${r.prev}`:'前回比較なし'}</small></span><span class="region-metric"><strong>${finite(r.value)?r.value:'—'}</strong><small>${finite(pd)?`前回差 ${signed(pd)}`:'比較なし'}</small></span>${finite(r.value)?`<span class="region-scale"><i style="--pos:${position(r.value)}%"></i></span>`:''}</button>`;}
function renderList(target,mode){const list=mode==='focus'?focusRegions:regions;let html='';if(mode==='focus')html+=`<div class="focus-summary"><strong>基準または前回より上 ${focusRegions.length}件</strong><br>絞り込み表示であり、危険度や重要度を示すものではありません。</div>`;if(mode==='focus'&&list.length>4){html+=list.slice(0,4).map(rowMarkup).join('')+`<details class="focus-more"><summary>残り${list.length-4}部位を見る</summary><div class="region-list">${list.slice(4).map(rowMarkup).join('')}</div></details>`;}else html+=list.map(rowMarkup).join('');target.innerHTML=html;bindDetailButtons(target);}
let lockedScrollY=0;
function shouldLockPage(){const overlay=document.querySelector('#regionSheetOverlay'),detail=document.querySelector('#detailScreen');return (overlay&&!overlay.hidden)||(detail&&!detail.hidden);}
function lockPageScroll(){
  if(document.body.dataset.scrollLocked==="true")return;
  lockedScrollY=window.scrollY||window.pageYOffset||0;
  document.body.dataset.scrollLocked="true";
  document.body.style.position="fixed";
  document.body.style.top=(-lockedScrollY)+"px";
  document.body.style.left="0";
  document.body.style.right="0";
  document.body.style.width="100%";
}
function unlockPageScroll(){
  if(document.body.dataset.scrollLocked!=="true")return;
  document.body.dataset.scrollLocked="false";
  document.body.style.position="";
  document.body.style.top="";
  document.body.style.left="";
  document.body.style.right="";
  document.body.style.width="";
  window.scrollTo(0,lockedScrollY);
}
function syncPageLock(){if(shouldLockPage())lockPageScroll();else unlockPageScroll();}
let detailNavigationPending=false;
function navigateDetail(id){
  if(detailNavigationPending)return;
  const next=`#detail=${encodeURIComponent(id)}`;
  if(location.hash===next){showDetail(id);return;}
  detailNavigationPending=true;
  location.hash=next;
  window.setTimeout(()=>{detailNavigationPending=false;},350);
}
function bindDetailButtons(root){root.querySelectorAll('[data-open-detail]').forEach(btn=>btn.addEventListener('click',()=>navigateDetail(btn.dataset.openDetail)));}
function showDetail(id){const r=byId.get(id);if(!r)return;const sheet=document.querySelector('#regionSheetOverlay');if(sheet&&!sheet.hidden)sheet.hidden=true;document.querySelector('#detailName').textContent=r.name;document.querySelector('#detailValue').textContent=finite(r.value)?r.value:'—';const pd=previousDelta(r);document.querySelector('#detailPrevious').textContent=finite(r.prev)?r.prev:'—';document.querySelector('#detailDifference').textContent=finite(pd)?signed(pd):'—';document.querySelector('#detailPrev').textContent=finite(pd)?`前回差 ${signed(pd)}`:'前回比較なし';document.querySelector('#detailLocator').innerHTML=locatorSvg(r,true);renderTrend(r);document.querySelector('#detailScreen').hidden=false;syncPageLock();}
function hideDetail(){document.querySelector('#detailScreen').hidden=true;syncPageLock();}
function syncRoute(){const m=location.hash.match(/^#detail=(.+)$/);if(m)showDetail(decodeURIComponent(m[1]));else hideDetail();}
function returnFromDetail(){if(location.hash.startsWith('#detail='))history.back();else hideDetail();}
function renderTrend(r){const svg=document.querySelector('#trendSvg');if(!r.history.length){svg.innerHTML='<text x="160" y="72" text-anchor="middle">比較できる保存記録はありません</text>';return;}const vals=r.history;const min=Math.min(94,...vals)-1,max=Math.max(110,...vals)+1;const xs=[28,94,160,226,292];const y=v=>120-(v-min)/(max-min)*92;const points=vals.map((v,i)=>`${xs[i]},${y(v)}`).join(' ');svg.innerHTML=`<line class="grid" x1="20" y1="28" x2="300" y2="28"></line><line class="grid" x1="20" y1="74" x2="300" y2="74"></line><line class="grid" x1="20" y1="120" x2="300" y2="120"></line><line class="baseline" x1="20" y1="${y(100)}" x2="300" y2="${y(100)}"></line><text x="22" y="${y(100)-5}">100</text><polyline class="trend-line" points="${points}"></polyline>${vals.map((v,i)=>`<circle class="trend-point${i===vals.length-1?' current':''}" cx="${xs[i]}" cy="${y(v)}" r="5"></circle><text x="${xs[i]}" y="${y(v)-10}" text-anchor="middle">${v}</text>`).join('')}`;}
function activateDesktop(mode){document.querySelectorAll('[data-desktop-view]').forEach(b=>b.classList.toggle('active',b.dataset.desktopView===mode));renderList(document.querySelector('#desktopRegionList'),mode);}
function activateMobile(mode){document.querySelectorAll('[data-mobile-view]').forEach(b=>{const on=b.dataset.mobileView===mode;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});renderList(document.querySelector('#mobileRegionList'),mode);}
document.querySelector('#bodyMap').innerHTML=renderBodyMap();document.querySelector('#focusCountDesktop').textContent=`(${focusRegions.length})`;document.querySelector('#focusCountMobile').textContent=`(${focusRegions.length})`;activateDesktop('focus');activateMobile('focus');
document.querySelectorAll('[data-desktop-view]').forEach(b=>b.addEventListener('click',()=>activateDesktop(b.dataset.desktopView)));document.querySelectorAll('[data-mobile-view]').forEach(b=>b.addEventListener('click',()=>activateMobile(b.dataset.mobileView)));
const overlay=document.querySelector('#regionSheetOverlay');
function openRegionSheet(){overlay.hidden=false;syncPageLock();}
function closeRegionSheet(){overlay.hidden=true;syncPageLock();}
document.querySelector('#openRegionSheet').addEventListener('click',openRegionSheet);
document.querySelector('#closeRegionSheet').addEventListener('click',closeRegionSheet);
overlay.addEventListener('click',e=>{if(e.target===overlay)closeRegionSheet();});
document.querySelector('#detailBack').addEventListener('click',returnFromDetail);
document.querySelector('#detailReturn').addEventListener('click',returnFromDetail);
window.addEventListener('hashchange',()=>{detailNavigationPending=false;syncRoute();});
syncRoute();

function installScrollTapGuard(root,selector){
  let gesture=null,suppress=null;
  root.addEventListener('pointerdown',e=>{
    const target=e.target.closest(selector);if(!target)return;
    gesture={target,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
  },{passive:true});
  root.addEventListener('pointermove',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>9)gesture.moved=true;
  },{passive:true});
  root.addEventListener('pointerup',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    if(gesture.moved)suppress=gesture.target;
    gesture=null;
  },{passive:true});
  root.addEventListener('pointercancel',()=>{gesture=null;},{passive:true});
  root.addEventListener('click',e=>{
    const target=e.target.closest(selector);
    if(target&&suppress===target){e.preventDefault();e.stopPropagation();suppress=null;}
  },true);
}
installScrollTapGuard(document.querySelector('#bodyMap'),'.region-link');
installScrollTapGuard(document.querySelector('#mobileRegionList'),'.region-row');
document.addEventListener('dragstart',e=>{if(e.target.closest('.body-map,.locator,.detail-locator'))e.preventDefault();});
window.addEventListener('orientationchange',()=>window.setTimeout(syncPageLock,80));
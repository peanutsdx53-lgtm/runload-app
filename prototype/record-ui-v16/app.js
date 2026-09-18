const form=document.querySelector('#recordForm');
const COURSE_SELECTION_KEY='runloadPrototypeCourseSelectionV1';
let sharedCourseCleared=false;
function readCourseFromSettings(){
  try{
    const p=JSON.parse(sessionStorage.getItem(COURSE_SELECTION_KEY)||'null');
    return p&&p.version===1&&p.target==='record'&&p.course&&typeof p.course.name==='string'?p.course:null;
  }catch(_){return null}
}
function applyCourseFromSettings(){
  if(sharedCourseCleared)return;
  const c=readCourseFromSettings();if(!c)return;
  document.querySelectorAll('.course-chip').forEach(function(x){x.classList.toggle('selected',x.dataset.course===c.name);});
  document.querySelector('#selectedCourse').hidden=false;
  document.querySelector('#selectedCourseName').textContent=c.name;
  document.querySelector('#selectedCourseMeta').textContent=(c.gradeLabel||'分からない')+'・'+(c.surfaceLabel||'分からない');
  document.querySelector('#courseSummary').textContent=c.name;
}
const distance=document.querySelector('#distance');
const duration=document.querySelector('#duration');
const runRequired=document.querySelector('#runRequired');
const restNote=document.querySelector('#restNote');
const mobileSave=document.querySelector('#mobileSave');
const desktopSave=document.querySelector('#desktopSave');
const requiredProgress=document.querySelector('#requiredProgress');
const desktopSaveHint=document.querySelector('#desktopSaveHint');
const toast=document.querySelector('#toast');
const recordDate=document.querySelector('#recordDate');
const dateDisplay=document.querySelector('#dateDisplay');
let bodyInput=false;
let personalInput=false;
let lockedY=0;
let currentSubRoute='';

function showToast(message){
  toast.textContent=message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(function(){toast.classList.remove('show');},1800);
}
function isRest(){return form.elements.activityType.value==='rest';}
function numericFilled(input){return Number(input.value)>0;}
function updateRequired(){
  const rest=isRest();
  runRequired.hidden=rest;
  restNote.hidden=!rest;
  const count=rest?2:[numericFilled(distance),numericFilled(duration)].filter(Boolean).length;
  requiredProgress.textContent=rest?'休養日・保存可能':'距離・時間 '+count+' / 2';
  [distance,duration].forEach(function(el){el.closest('.measure-field').classList.toggle('valid',numericFilled(el));});
  const ready=rest||(numericFilled(distance)&&numericFilled(duration));
  mobileSave.disabled=!ready;
  desktopSave.disabled=!ready;
  desktopSaveHint.textContent=ready?'保存できます。任意項目は必要な場合だけ追加します。':'距離と実走時間を入力してください。';
}
form.querySelectorAll('input[name="activityType"]').forEach(function(r){r.addEventListener('change',updateRequired);});
distance.addEventListener('input',updateRequired);
duration.addEventListener('input',updateRequired);

document.querySelectorAll('.course-chip').forEach(function(btn){
  btn.addEventListener('click',function(){
    document.querySelectorAll('.course-chip').forEach(function(x){x.classList.toggle('selected',x===btn);});
    document.querySelector('#selectedCourse').hidden=false;
    document.querySelector('#selectedCourseName').textContent=btn.dataset.course;
    document.querySelector('#selectedCourseMeta').textContent=btn.dataset.meta;
    document.querySelector('#courseSummary').textContent=btn.dataset.course;
  });
});
document.querySelector('#clearCourse').addEventListener('click',function(){
  sharedCourseCleared=true;
  document.querySelectorAll('.course-chip').forEach(function(x){x.classList.remove('selected');});
  document.querySelector('#selectedCourse').hidden=true;
  document.querySelector('#courseSummary').textContent='未選択';
});

const steps=document.querySelector('#steps');
const stepsSource=document.querySelector('#stepsSource');
const runFormat=document.querySelector('#runFormat');
const temperature=document.querySelector('#temperature');
const environmentNote=document.querySelector('#environmentNote');
function updateComparison(){
  const items=[steps.value,stepsSource.value,runFormat.value,temperature.value,environmentNote.value].filter(function(v){return String(v).trim();}).length;
  document.querySelector('#comparisonSummary').textContent=items?items+'項目入力':'未入力';
  document.querySelector('#runWalkExtra').hidden=runFormat.value!=='走りと歩きを混ぜた';
}
[steps,stepsSource,runFormat,temperature,environmentNote].forEach(function(el){el.addEventListener('input',updateComparison);});
runFormat.addEventListener('change',updateComparison);

function updateReflection(){
  const filled=[
    bodyInput,
    personalInput,
    document.querySelector('#reflectionText').value.trim(),
    document.querySelector('#differenceText').value.trim(),
    document.querySelector('#nextText').value.trim()
  ].filter(Boolean).length;
  document.querySelector('#reflectionSummary').textContent=filled?filled+'項目入力':'未入力';
}
['reflectionText','differenceText','nextText'].forEach(function(id){
  document.querySelector('#'+id).addEventListener('input',updateReflection);
});

function lockPage(){
  if(document.body.dataset.locked==='true')return;
  lockedY=window.scrollY||window.pageYOffset||0;
  document.body.dataset.locked='true';
  document.body.style.position='fixed';
  document.body.style.top=(-lockedY)+'px';
  document.body.style.left='0';
  document.body.style.right='0';
  document.body.style.width='100%';
}
function unlockPage(){
  if(document.body.dataset.locked!=='true')return;
  document.body.dataset.locked='false';
  document.body.style.position='';
  document.body.style.top='';
  document.body.style.left='';
  document.body.style.right='';
  document.body.style.width='';
  window.scrollTo(0,lockedY);
}
function openOverlay(id){document.querySelector('#'+id).hidden=false;lockPage();}
function closeOverlay(id){
  document.querySelector('#'+id).hidden=true;
  const anyOpen=[].slice.call(document.querySelectorAll('.overlay')).some(function(x){return !x.hidden;});
  if(!anyOpen&&document.querySelector('#subscreen').hidden)unlockPage();
}
document.querySelector('#helpButton').addEventListener('click',function(){openOverlay('helpOverlay');});
document.querySelectorAll('[data-close]').forEach(function(b){b.addEventListener('click',function(){closeOverlay(b.dataset.close);});});
document.querySelectorAll('.overlay').forEach(function(o){o.addEventListener('click',function(e){if(e.target===o)closeOverlay(o.id);});});

const rofSlider=document.querySelector('#rofSlider');
const rofValueDisplay=document.querySelector('#rofValueDisplay');
const rofDescriptor=document.querySelector('#rofDescriptor');
const rofAnchorText=document.querySelector('#rofAnchorText');
const rofQuestionTitle=document.querySelector('#rofQuestionTitle');
const rofQuestionText=document.querySelector('#rofQuestionText');
const recordRofValue=document.querySelector('#recordRofValue');
const postOnlyRoute=document.querySelector('#postOnlyRoute');
const openRofButton=document.querySelector('#openRof');

let rofPhase='before';
let rofBefore=null;
let rofAfter=null;
let rofTouched=false;

const rofDescriptors={
  2:'まったく疲れていない',
  4:'少し疲れている',
  6:'中程度に疲れている',
  8:'とても疲れている',
  10:'完全な疲労困憊（何も残っていない状態）'
};

function surroundingAnchors(value){
  const anchors=[2,4,6,8,10];
  if(rofDescriptors[value])return value+'・'+rofDescriptors[value];
  if(value===0)return '0　／　2・'+rofDescriptors[2];
  if(value===1)return '0　／　2・'+rofDescriptors[2];
  for(let i=0;i<anchors.length-1;i++){
    const a=anchors[i],b=anchors[i+1];
    if(value>a&&value<b)return a+'・'+rofDescriptors[a]+'　／　'+b+'・'+rofDescriptors[b];
  }
  if(value===9)return '8・'+rofDescriptors[8]+'　／　10・'+rofDescriptors[10];
  return '8・'+rofDescriptors[8]+'　／　10・'+rofDescriptors[10];
}
function updateRofPreview(){
  if(!rofTouched){
    rofValueDisplay.textContent='—';
    rofDescriptor.textContent='数値を選択';
    rofAnchorText.textContent='2・'+rofDescriptors[2]+'　／　4・'+rofDescriptors[4];
    recordRofValue.disabled=true;
    return;
  }
  const value=Number(rofSlider.value);
  rofValueDisplay.textContent=String(value);
  rofDescriptor.textContent=rofDescriptors[value]||'';
  rofAnchorText.textContent=surroundingAnchors(value);
  recordRofValue.disabled=false;
}
function prepareRofSheet(phase){
  rofPhase=phase;
  rofTouched=false;
  rofSlider.value='5';
  rofQuestionTitle.textContent=phase==='before'?'走る前の疲労感':'走った後の疲労感';
  rofQuestionText.textContent='今の疲労感を0〜10で選んでください。';
  postOnlyRoute.hidden=phase!=='before';
  updateRofPreview();
}
rofSlider.addEventListener('input',function(){rofTouched=true;updateRofPreview();});
rofSlider.addEventListener('change',function(){rofTouched=true;updateRofPreview();});

openRofButton.addEventListener('click',function(){
  prepareRofSheet(rofBefore===null?'before':'after');
  openOverlay('rofOverlay');
});

postOnlyRoute.addEventListener('click',function(){
  prepareRofSheet('after');
});

recordRofValue.addEventListener('click',function(){
  if(!rofTouched)return;
  const value=Number(rofSlider.value);
  if(rofPhase==='before'){
    rofBefore=value;
    document.querySelector('#rofStatus').textContent='走る前 '+value+' を記録済み';
    openRofButton.textContent='走った後を記録';
    closeOverlay('rofOverlay');
    showToast('走る前の疲労感を記録しました');
  }else{
    rofAfter=value;
    document.querySelector('#rofStatus').textContent=rofBefore===null?'走った後 '+value+' を記録済み':'走る前 '+rofBefore+' → 走った後 '+value;
    openRofButton.textContent='記録済み';
    closeOverlay('rofOverlay');
    showToast('走った後の疲労感を記録しました');
  }
});


const SUBJECTIVE_FRONT='<circle cx="150" cy="36" r="20"></circle><path d="M110 78 C120 66 135 60 150 60 C165 60 180 66 190 78 L204 126 C208 138 204 150 196 160 L182 176 L188 212 C192 228 190 246 184 262 L172 308 C168 324 166 340 166 356 L166 400 C166 410 158 418 148 418 C138 418 130 410 130 400 L130 356 C130 340 128 324 124 308 L112 262 C106 246 104 228 108 212 L114 176 L100 160 C92 150 88 138 92 126 Z"></path>';
const SUBJECTIVE_BACK='<circle cx="150" cy="36" r="20"></circle><path d="M112 76 C122 66 136 60 150 60 C164 60 178 66 188 76 L202 124 C206 136 202 150 194 160 L182 174 L188 212 C192 228 190 244 184 262 L172 310 C168 326 166 342 166 358 L166 402 C166 412 158 420 148 420 C138 420 130 412 130 402 L130 358 C130 342 128 326 124 310 L112 262 C106 244 104 228 108 212 L114 174 L102 160 C94 150 90 136 94 124 Z"></path>';
const SUBJECTIVE_FOOT='<path d="M114 78 C126 66 140 60 154 60 C172 60 186 72 194 92 C198 102 200 116 200 132 L200 238 C200 274 186 306 160 320 C150 326 140 326 130 320 C108 306 96 274 96 238 L96 132 C96 112 102 90 114 78 Z"></path>';
const SUBJECTIVE_VIEWS=[
 {key:'front',title:'前面',silhouette:SUBJECTIVE_FRONT,paths:[
  ['BA-DISP-014','股関節部','M120 142 C130 132 140 128 150 128 C160 128 170 132 180 142 L178 178 C168 184 160 188 150 188 C140 188 132 184 122 178 Z'],
  ['BA-DISP-016','大腿前面','M122 190 C132 198 141 202 150 202 C159 202 168 198 178 190 L174 266 C164 274 158 278 150 278 C142 278 136 274 126 266 Z'],
  ['BA-DISP-019','膝蓋大腿関節部','M126 270 C136 278 142 281 150 281 C158 281 164 278 174 270 L170 300 C162 306 157 309 150 309 C143 309 138 306 130 300 Z'],
  ['BA-DISP-021','脛骨部','M130 306 C138 314 144 318 150 318 C156 318 162 314 170 306 L166 382 C160 390 156 394 150 394 C144 394 140 390 134 382 Z'],
  ['BA-DISP-024','足関節部','M135 386 L165 386 L166 416 L134 416 Z']
 ]},
 {key:'back',title:'後面',silhouette:SUBJECTIVE_BACK,paths:[
  ['BA-DISP-015','殿部','M120 138 C130 150 139 158 150 158 C161 158 170 150 180 138 L180 190 C170 200 160 205 150 205 C140 205 130 200 120 190 Z'],
  ['BA-DISP-018','大腿後面','M122 196 C132 204 141 209 150 209 C159 209 168 204 178 196 L174 274 C164 282 158 286 150 286 C142 286 136 282 126 274 Z'],
  ['BA-DISP-023','下腿後面','M128 288 C136 298 143 302 150 302 C157 302 164 298 172 288 L166 368 C160 378 156 383 150 383 C144 383 140 378 134 368 Z'],
  ['BA-DISP-025','アキレス腱部','M142 370 C146 378 148 382 150 382 C152 382 154 378 158 370 L158 416 H142 Z']
 ]},
 {key:'sole',title:'足裏',silhouette:SUBJECTIVE_FOOT,paths:[
  ['BA-DISP-029','前足部','M112 92 C124 84 138 80 154 80 C174 80 188 94 190 120 L190 164 C174 170 158 172 140 168 C126 165 114 158 106 148 L106 120 C107 108 109 99 112 92 Z'],
  ['BA-DISP-028','足底中部・内側縦足弓','M106 154 C120 166 136 172 154 172 C170 172 182 168 190 164 L190 252 C176 260 162 264 148 262 C130 260 116 252 104 240 L104 176 Z'],
  ['BA-DISP-027','後足部','M104 240 C118 254 132 262 148 264 C164 266 178 260 190 252 C186 282 174 304 158 314 C148 320 138 318 128 312 C112 300 104 274 104 240 Z']
 ]}
];
const subjectiveNames=new Map();
SUBJECTIVE_VIEWS.forEach(function(v){v.paths.forEach(function(x){subjectiveNames.set(x[0],x[1]);});});
const bodySelections=new Map();

function renderSubjectiveMap(){
  const target=document.querySelector('#subjectiveBodyMap');
  target.innerHTML=SUBJECTIVE_VIEWS.map(function(v){
    return '<figure><figcaption>'+v.title+'</figcaption><svg viewBox="70 10 160 430" aria-label="'+v.title+'の身体図"><g class="subjective-silhouette">'+v.silhouette+'</g>'+v.paths.map(function(p){
      const item=bodySelections.get(p[0]);
      const level=item?item.level:0;
      return '<path class="subjective-region-path" tabindex="0" role="button" aria-label="'+p[1]+'を選択" data-body-region="'+p[0]+'" data-level="'+level+'" d="'+p[2]+'"><title>'+p[1]+'</title></path>';
    }).join('')+'</svg></figure>';
  }).join('');
}
function renderSelectedBodyList(){
  const list=document.querySelector('#selectedBodyList');
  const summary=document.querySelector('#selectedBodySummary');
  const entries=Array.from(bodySelections.entries());
  summary.textContent=entries.length?entries.length+'部位を入力中':'部位は未選択です。';
  list.innerHTML=entries.map(function(entry){
    const id=entry[0],item=entry[1],name=subjectiveNames.get(id)||id;
    return '<div class="selected-body-row" data-selected-body="'+id+'"><strong>'+name+'</strong><select data-body-level aria-label="'+name+'の程度"><option value="1"'+(item.level===1?' selected':'')+'>1</option><option value="2"'+(item.level===2?' selected':'')+'>2</option><option value="3"'+(item.level===3?' selected':'')+'>3</option><option value="4"'+(item.level===4?' selected':'')+'>4</option><option value="5"'+(item.level===5?' selected':'')+'>5</option></select><select data-body-side aria-label="'+name+'の左右"><option value="">左右未設定</option><option value="左"'+(item.side==='左'?' selected':'')+'>左</option><option value="右"'+(item.side==='右'?' selected':'')+'>右</option><option value="両側"'+(item.side==='両側'?' selected':'')+'>両側</option></select><button type="button" data-remove-body aria-label="'+name+'を削除">×</button></div>';
  }).join('');
  list.querySelectorAll('[data-body-level]').forEach(function(el){el.addEventListener('change',function(){const row=el.closest('[data-selected-body]');const item=bodySelections.get(row.dataset.selectedBody);item.level=Number(el.value);renderSubjectiveMap();bindSubjectiveMap();});});
  list.querySelectorAll('[data-body-side]').forEach(function(el){el.addEventListener('change',function(){const row=el.closest('[data-selected-body]');const item=bodySelections.get(row.dataset.selectedBody);item.side=el.value;});});
  list.querySelectorAll('[data-remove-body]').forEach(function(btn){btn.addEventListener('click',function(){const row=btn.closest('[data-selected-body]');bodySelections.delete(row.dataset.selectedBody);renderSubjectiveMap();bindSubjectiveMap();renderSelectedBodyList();});});
}
function chooseBodyRegion(id){
  if(!bodySelections.has(id))bodySelections.set(id,{level:2,side:''});
  renderSubjectiveMap();bindSubjectiveMap();renderSelectedBodyList();
}
function bindSubjectiveMap(){
  document.querySelectorAll('[data-body-region]').forEach(function(path){
    path.addEventListener('click',function(){chooseBodyRegion(path.dataset.bodyRegion);});
    path.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseBodyRegion(path.dataset.bodyRegion);}});
  });
}
function currentBodyStatus(){const checked=document.querySelector('input[name="bodySubStatus"]:checked');return checked?checked.value:'deferred';}
function syncBodyStatus(){
  const status=currentBodyStatus();
  document.querySelector('#bodyAreaEntry').hidden=!(status==='areas'||status==='consult');
  document.querySelector('#bodyConsultExtra').hidden=status!=='consult';
}
document.querySelectorAll('input[name="bodySubStatus"]').forEach(function(r){r.addEventListener('change',syncBodyStatus);});
renderSubjectiveMap();bindSubjectiveMap();renderSelectedBodyList();syncBodyStatus();

function openSub(route){
  currentSubRoute=route;
  const personal=route==='personal';
  document.querySelector('#subTitle').textContent=personal?'今回のシューズ':'身体の記録';
  document.querySelector('#bodySubFlow').hidden=personal;
  document.querySelector('#personalSubFlow').hidden=!personal;
  document.querySelector('#subscreen').hidden=false;
  lockPage();
}
document.querySelectorAll('[data-route]').forEach(function(b){
  b.addEventListener('click',function(){
    const route=b.dataset.route;
    if(route==='course-library'){sharedCourseCleared=false;location.href='../course-flow-ui-v16/?from=record';return;}
    openSub(route);
  });
});
function closeSub(){
  document.querySelector('#subscreen').hidden=true;
  unlockPage();
}
document.querySelector('#subBack').addEventListener('click',closeSub);

document.querySelector('#saveBodySub').addEventListener('click',function(){
  const status=currentBodyStatus();
  if((status==='areas'||status==='consult')&&bodySelections.size===0){
    showToast('身体図から部位を1つ以上選んでください');
    return;
  }
  bodyInput=true;
  let label='今回は確認しない';
  if(status==='none')label='確認済み・部位なし';
  if(status==='areas')label=bodySelections.size+'部位入力';
  if(status==='consult')label=bodySelections.size+'部位・相談情報';
  document.querySelector('#bodyStatus').textContent=label;
  updateReflection();
  closeSub();
  showToast('身体の記録を反映しました');
});

const savedShoe=document.querySelector('#savedShoe');
const shoeLabel=document.querySelector('#shoeLabel');
savedShoe.addEventListener('change',function(){if(savedShoe.value)shoeLabel.value=savedShoe.value;});
document.querySelector('#savePersonalSub').addEventListener('click',function(){
  const shoe=(shoeLabel.value.trim()||savedShoe.value.trim());
  const focusCount=document.querySelectorAll('#focusTags input:checked').length;
  personalInput=Boolean(shoe||focusCount);
  document.querySelector('#personalStatus').textContent=shoe?shoe:(focusCount?focusCount+'項目選択':'未選択');
  updateReflection();
  if(document.querySelector('#saveShoePreset').checked&&shoe)showToast('シューズを次回用に保存する想定です');
  else showToast(personalInput?'シューズ情報を反映しました':'入力なしで戻ります');
  closeSub();
});


document.querySelector('#draftButton').addEventListener('click',function(){showToast('入力途中を保存した想定です');});
form.addEventListener('submit',function(e){
  e.preventDefault();
  if(mobileSave.disabled&&desktopSave.disabled)return;
  location.href='../result-ui-v21/';
});

function installScrollTapGuard(root,selector){
  let gesture=null;
  let suppress=null;
  root.addEventListener('pointerdown',function(e){
    const t=e.target.closest(selector);
    if(!t)return;
    gesture={t:t,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
  },{passive:true});
  root.addEventListener('pointermove',function(e){
    if(!gesture||gesture.id!==e.pointerId)return;
    if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>9)gesture.moved=true;
  },{passive:true});
  root.addEventListener('pointerup',function(e){
    if(!gesture||gesture.id!==e.pointerId)return;
    if(gesture.moved)suppress=gesture.t;
    gesture=null;
  },{passive:true});
  root.addEventListener('click',function(e){
    const t=e.target.closest(selector);
    if(t&&t===suppress){e.preventDefault();e.stopPropagation();suppress=null;}
  },true);
}
installScrollTapGuard(document.querySelector('.course-strip'),'.course-chip');
applyCourseFromSettings();
window.addEventListener('pageshow',applyCourseFromSettings);
updateRequired();
updateComparison();
updateReflection();
function formatDateDisplay(value){
  if(!value)return '';
  const parts=value.split('-');
  if(parts.length!==3)return value;
  return parts[0]+'/'+parts[1]+'/'+parts[2];
}
function syncDateDisplay(){dateDisplay.textContent=formatDateDisplay(recordDate.value);}
recordDate.addEventListener('change',syncDateDisplay);
recordDate.addEventListener('input',syncDateDisplay);
syncDateDisplay();

const moreNavButton=document.querySelector('#moreNavButton');
if(moreNavButton)moreNavButton.addEventListener('click',()=>showToast('その他の機能は次の画面設計で接続します'));

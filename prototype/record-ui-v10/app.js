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

function openSub(route){
  currentSubRoute=route;
  const personal=route==='personal';
  document.querySelector('#subTitle').textContent=personal?'使用シューズ':'身体の記録';
  document.querySelector('#subHeading').textContent=personal?'今回のシューズ':'今回の身体記録';
  document.querySelector('#subscreen').hidden=false;
  lockPage();
}
document.querySelectorAll('[data-route]').forEach(function(b){
  b.addEventListener('click',function(){
    const route=b.dataset.route;
    if(route==='course-library'){sharedCourseCleared=false;location.href='../course-flow-ui-v08/?from=record';return;}
    openSub(route);
  });
});
function closeSub(mark){
  if(mark){
    if(currentSubRoute==='personal'){
      personalInput=true;
      document.querySelector('#personalStatus').textContent='選択済み';
    }else{
      bodyInput=true;
      document.querySelector('#bodyStatus').textContent='入力済み';
    }
    updateReflection();
  }
  document.querySelector('#subscreen').hidden=true;
  unlockPage();
}
document.querySelector('#subBack').addEventListener('click',function(){closeSub(false);});
document.querySelector('#markSubInput').addEventListener('click',function(){closeSub(true);});

document.querySelector('#draftButton').addEventListener('click',function(){showToast('入力途中を保存した想定です');});
form.addEventListener('submit',function(e){
  e.preventDefault();
  if(mobileSave.disabled&&desktopSave.disabled)return;
  showToast('保存後にResultへ進む想定です');
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

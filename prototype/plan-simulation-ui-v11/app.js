const simulationFrom=new URLSearchParams(location.search).get('from');
const simulationBack=document.querySelector('#backLink');
if(simulationBack&&simulationFrom==='plan'){simulationBack.href='../plan-ui-v06/';simulationBack.textContent='‹ 予定へ戻る';}
import { calculateRun, MODEL_VERSION } from './engine.js';

const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
const finite=(v)=>Number.isFinite(Number(v));
const regionDefs=[
 ['R01','BA-DISP-014','股関節部','front','M120 142 C130 132 140 128 150 128 C160 128 170 132 180 142 L178 178 C168 184 160 188 150 188 C140 188 132 184 122 178 Z'],
 ['R02','BA-DISP-015','殿部','back','M120 138 C130 150 139 158 150 158 C161 158 170 150 180 138 L180 190 C170 200 160 205 150 205 C140 205 130 200 120 190 Z'],
 ['R03','BA-DISP-016','大腿前面','front','M122 190 C132 198 141 202 150 202 C159 202 168 198 178 190 L174 266 C164 274 158 278 150 278 C142 278 136 274 126 266 Z'],
 ['R04','BA-DISP-018','大腿後面','back','M122 196 C132 204 141 209 150 209 C159 209 168 204 178 196 L174 274 C164 282 158 286 150 286 C142 286 136 282 126 274 Z'],
 ['R05','BA-DISP-019','膝蓋大腿関節部','front','M126 270 C136 278 142 281 150 281 C158 281 164 278 174 270 L170 300 C162 306 157 309 150 309 C143 309 138 306 130 300 Z'],
 ['R06','BA-DISP-021','脛骨部','front','M130 306 C138 314 144 318 150 318 C156 318 162 314 170 306 L166 382 C160 390 156 394 150 394 C144 394 140 390 134 382 Z'],
 ['R07','BA-DISP-023','下腿後面','back','M128 288 C136 298 143 302 150 302 C157 302 164 298 172 288 L166 368 C160 378 156 383 150 383 C144 383 140 378 134 368 Z'],
 ['R08','BA-DISP-024','足関節部','front','M135 386 L165 386 L166 416 L134 416 Z'],
 ['R09','BA-DISP-025','アキレス腱部','back','M142 370 C146 378 148 382 150 382 C152 382 154 378 158 370 L158 416 H142 Z'],
 ['R10','BA-DISP-027','後足部','sole','M104 240 C118 254 132 262 148 264 C164 266 178 260 190 252 C186 282 174 304 158 314 C148 320 138 318 128 312 C112 300 104 274 104 240 Z'],
 ['R11','BA-DISP-028','足底中部・内側縦足弓','sole','M106 154 C120 166 136 172 154 172 C170 172 182 168 190 164 L190 252 C176 260 162 264 148 262 C130 260 116 252 104 240 L104 176 Z'],
 ['R12','BA-DISP-029','前足部','sole','M112 92 C124 84 138 80 154 80 C174 80 188 94 190 120 L190 164 C174 170 158 172 140 168 C126 165 114 158 106 148 L106 120 C107 108 109 99 112 92 Z']
];
const silhouettes={
 front:'<circle cx="150" cy="36" r="20"></circle><path d="M110 78 C120 66 135 60 150 60 C165 60 180 66 190 78 L204 126 C208 138 204 150 196 160 L182 176 L188 212 C192 228 190 246 184 262 L172 308 C168 324 166 340 166 356 L166 400 C166 410 158 418 148 418 C138 418 130 410 130 400 L130 356 C130 340 128 324 124 308 L112 262 C106 246 104 228 108 212 L114 176 L100 160 C92 150 88 138 92 126 Z"></path>',
 back:'<circle cx="150" cy="36" r="20"></circle><path d="M112 76 C122 66 136 60 150 60 C164 60 178 66 188 76 L202 124 C206 136 202 150 194 160 L182 174 L188 212 C192 228 190 244 184 262 L172 310 C168 326 166 342 166 358 L166 402 C166 412 158 420 148 420 C138 420 130 412 130 402 L130 358 C130 342 128 326 124 310 L112 262 C106 244 104 228 108 212 L114 174 L102 160 C94 150 90 136 94 124 Z"></path>',
 sole:'<path d="M114 78 C126 66 140 60 154 60 C172 60 186 72 194 92 C198 102 200 116 200 132 L200 238 C200 274 186 306 160 320 C150 326 140 326 130 320 C108 306 96 274 96 238 L96 132 C96 112 102 90 114 78 Z"></path>'
};
const viewNames={front:'前面',back:'後面',sole:'足裏'};
let compare=true;
const defaultState={distance:5,duration:32,runningFormat:'RUN',runDistance:4,runDuration:26};
const COURSE_SELECTION_KEY='runloadPrototypeCourseSelectionV1';
const defaultCourse={id:'park',name:'公園周回',preset:'flat',grade:'FLAT',surface:[['paved',100]],surfaceLabel:'舗装路',gradeLabel:'ほぼ平坦',upShare:0,downShare:0,upGrade:null,downGrade:null};
let selectedCourse={...defaultCourse};
function numberOrNull(v){return v===null||v===''||v===undefined?null:(Number.isFinite(Number(v))?Number(v):null)}
function readSelectedCourse(){
  try{
    const payload=JSON.parse(sessionStorage.getItem(COURSE_SELECTION_KEY)||'null');
    if(!payload||payload.version!==1||payload.target!=='simulation'||!payload.course||typeof payload.course.name!=='string')return null;
    const c=payload.course;
    const up=numberOrNull(c.up),down=numberOrNull(c.down);
    return {
      id:String(c.id||'custom'),name:c.name.trim()||defaultCourse.name,preset:String(c.preset||'custom'),grade:String(c.grade||'UNKNOWN'),
      surface:Array.isArray(c.surface)?c.surface.filter(x=>Array.isArray(x)&&x.length>=2&&numberOrNull(x[1])!==null).map(x=>[String(x[0]),Number(x[1])]):[],
      surfaceLabel:String(c.surfaceLabel||'分からない'),gradeLabel:String(c.gradeLabel||'分からない'),
      upShare:up===null?0:Math.max(0,up),downShare:down===null?0:Math.max(0,down),
      upGrade:numberOrNull(c.upGrade),downGrade:numberOrNull(c.downGrade)
    };
  }catch(_){return null}
}
function refreshSelectedCourse(){
  selectedCourse=readSelectedCourse()||{...defaultCourse};
  $('#selectedCourseName').textContent=selectedCourse.name;
  $('#selectedCourseMeta').textContent=selectedCourse.gradeLabel+'・'+selectedCourse.surfaceLabel;
}
function courseHasUnappliedGrade(){
  if(selectedCourse.grade==='UNKNOWN')return false;
  const u=Math.max(0,Number(selectedCourse.upShare)||0),d=Math.max(0,Number(selectedCourse.downShare)||0);
  if(!(u>0||d>0))return false;
  return (u>0&&numberOrNull(selectedCourse.upGrade)===null)||(d>0&&numberOrNull(selectedCourse.downGrade)===null);
}
const previousRecord={runningFormat:'RUN',distanceKm:6.2,durationMinutes:39};
const previousResult=calculateRun(previousRecord);

function stateFor(v){if(!finite(v))return'unavailable';const d=Number(v)-100;if(Math.abs(d)<1)return'reference';return d>0?'above':'below'}
function signed(v){if(!finite(v))return'—';const n=Number(v);return `${n>0?'+':''}${n.toFixed(1)}`}
function derivedPaceSeconds(){const d=Number($('#distance').value),t=Number($('#duration').value);return d>0&&t>0?t*60/d:null}
function paceText(){const sec=derivedPaceSeconds();if(!finite(sec))return'—';const whole=Math.round(sec);return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')} /km`}
function surfaceComponents(){
  if(!Array.isArray(selectedCourse.surface)||!selectedCourse.surface.length)return[];
  return selectedCourse.surface
    .map(x=>Array.isArray(x)?{userCategory:String(x[0]),sharePercent:Number(x[1])}:null)
    .filter(x=>x&&Number.isFinite(x.sharePercent)&&x.sharePercent>0);
}
function buildInput(){
 const distance=Number($('#distance').value),duration=Number($('#duration').value),format=$('#runningFormat').value;
 if(!(distance>0&&duration>0))return{error:'距離と実走時間を確認してください。'};
 const record={runningFormat:format,distanceKm:distance,durationMinutes:duration,surfaceComponents:surfaceComponents(),runSetting:'OUTDOOR_ROUTE'};
 if(format==='RUN_WALK'){const rd=Number($('#runDistance').value),rt=Number($('#runDuration').value);if(!(rd>0&&rt>0))return{error:'RUN_WALKでは、走った区間の距離と時間が必要です。'};record.runningDistanceKm=rd;record.runningDurationMinutes=rt;}
 const u=Math.max(0,Number(selectedCourse.upShare)||0),d=Math.max(0,Number(selectedCourse.downShare)||0);
 const ug=numberOrNull(selectedCourse.upGrade),dg=numberOrNull(selectedCourse.downGrade);
 const gradeKnown=selectedCourse.grade!=='UNKNOWN'&&(!u||ug!==null)&&(!d||dg!==null);
 if((u>0||d>0)&&gradeKnown){
   record.uphillSharePercent=u;record.downhillSharePercent=d;
   if(u>0)record.uphillGradePercent=ug;
   if(d>0)record.downhillGradePercent=dg;
 }
 return{record,preset:selectedCourse.preset};
}
function deltaState(cur,prev){if(!finite(cur)||!finite(prev))return'unavailable';const d=Number(cur)-Number(prev);if(Math.abs(d)<1)return'reference';return d>0?'above':'below'}
function renderBody(result){
 const html=['front','back','sole'].map(view=>{
   const paths=regionDefs.filter(r=>r[3]===view).map(r=>{const x=result?.regions?.[r[0]];const v=x?.value;const prev=previousResult?.regions?.[r[0]]?.value;const state=compare?deltaState(v,prev):stateFor(v);const label=compare?`${r[2]}：前回差 ${finite(v)&&finite(prev)?signed(Number(v)-Number(prev)):'比較なし'}`:`${r[2]}：${finite(v)?Number(v).toFixed(1):'表示なし'}`;return `<path class="region-path" data-direction="${state}" d="${r[4]}"><title>${label}</title></path>`}).join('');
   return `<figure class="body-view"><figcaption>${viewNames[view]}</figcaption><svg viewBox="70 10 160 430" aria-label="${viewNames[view]}"><g class="body-silhouette">${silhouettes[view]}</g>${paths}</svg></figure>`;
 }).join('');
 $('#bodyMap').innerHTML=html;
}
function renderList(result){
 $('#regionList').innerHTML=regionDefs.map(r=>{const cur=result?.regions?.[r[0]]?.value;const prev=previousResult?.regions?.[r[0]]?.value;const delta=finite(cur)&&finite(prev)?Number(cur)-Number(prev):null;return `<div class="region-row"><div><strong>${r[2]}</strong><small>${viewNames[r[3]]}</small></div><div class="region-value"><b>${finite(cur)?Number(cur).toFixed(1):'—'}</b><span class="${finite(delta)?delta>0?'up':delta<0?'down':'':''}">${compare?(finite(delta)?`前回差 ${signed(delta)}`:'前回比較なし'):'Reference-100'}</span></div></div>`}).join('');
}
function assumptionLabel(preset){return{unknown:'コース条件未設定',flat:'ほぼ平坦',rolling:'上り30%・下り30%',custom:'入力した勾配条件'}[preset]||'条件未設定'}
function render(){
 const built=buildInput();const warning=$('#inputWarning');const calc=$('#calcState');$('#runWalkFields').hidden=$('#runningFormat').value!=='RUN_WALK';
 const pace=paceText();$('#derivedPace').textContent=pace;
 $('#currentRunSummary').textContent=`${Number($('#distance').value||0).toFixed(1)} km・${Number($('#duration').value||0)}分`;
 $('#currentPaceSummary').textContent=`${pace}・${selectedCourse.name}`;
 if(built.error){warning.textContent=built.error;warning.hidden=false;calc.textContent='入力確認';calc.classList.add('error');renderBody(null);renderList(null);return}
 warning.hidden=true;calc.classList.remove('error');
 const result=calculateRun(built.record);
 if(result.state!=='OK'){calc.textContent='表示できない条件';calc.classList.add('error');warning.textContent=`現在のモデルではこの条件を表示できません（${result.state}）。`;warning.hidden=false;renderBody(result);renderList(result);return}
 calc.textContent='計算済み';
 const distance=`${Number($('#distance').value).toFixed(1)} km`;
 const chips=[distance,pace];
 if($('#runningFormat').value==='RUN_WALK')chips.push('RUN_WALK');
 chips.push(selectedCourse.gradeLabel,selectedCourse.surfaceLabel);
 if(courseHasUnappliedGrade())chips.push('坂道は計算未反映（勾配不明）');
 $('#assumptionChips').innerHTML=chips.map(x=>`<span>${x}</span>`).join('');
 $('#directionLegend').innerHTML=compare?'<li><i class="above"></i>前回より上</li><li><i class="reference"></i>ほぼ同じ</li><li><i class="below"></i>前回より下</li><li><i class="unavailable"></i>比較なし</li>':'<li><i class="above"></i>100より上</li><li><i class="reference"></i>100付近</li><li><i class="below"></i>100より下</li><li><i class="unavailable"></i>表示なし</li>';
 $('#regionModeTitle').textContent=compare?'12部位の前回差':'12部位のReference-100';
 $('#mapNote').textContent=compare?'同じ部位について前回の保存記録との差を色で示します。上・下は良し悪しを示しません。':'色は各部位自身のReference-100に対する方向を示します。部位どうしの大小比較には使いません。';
 renderBody(result);renderList(result);
}
function reset(){$('#distance').value=defaultState.distance;$('#duration').value=defaultState.duration;$('#runningFormat').value=defaultState.runningFormat;$('#runDistance').value=defaultState.runDistance;$('#runDuration').value=defaultState.runDuration;render();}
$$('input,select').forEach(el=>el.addEventListener('input',render));
$('#runningFormat').addEventListener('change',render);
$('#toggleCompare').addEventListener('click',()=>{compare=!compare;$('#toggleCompare').setAttribute('aria-pressed',String(compare));$('#toggleCompare').textContent=compare?'Reference-100を見る':'前回差を見る';render()});
$('#reset').addEventListener('click',reset);
console.info('RunLoad simulation engine',MODEL_VERSION);
refreshSelectedCourse();
render();
window.addEventListener('pageshow',()=>{refreshSelectedCourse();render();});

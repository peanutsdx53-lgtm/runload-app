/* Mobile-only experimental running-profile radar.
 * Read-only visualisation: no scientific engine, record, or storage mutation.
 * Display scales are fixed UI ranges, not normative fitness scores. */
import { isPresentFiniteNumber as finite } from "../shared/valueUtilities.js";
import { compareRecordChronology } from "../shared/recordUtilities.js";
import { escapeHtml } from "./commonComponents.js";
import { formatLocalDate, formatLocalTime } from "./recordPresentation.js";
import { haversineDistanceMeters } from "./runMeasurementCore.js";
import { findSavedRunMeasurement } from "./runMeasurementState.js";

export const RUNNING_PROFILE_AXES = Object.freeze([
  Object.freeze({ id:"distance", label:"距離", max:20, unit:"km", digits:2, source:"保存した距離" }),
  Object.freeze({ id:"speed", label:"平均速度", max:20, unit:"km/h", digits:1, source:"距離 ÷ 時間" }),
  Object.freeze({ id:"variation", label:"ペース変動", max:50, unit:"%", digits:1, source:"保存GPSの区間速度・変動係数" }),
  Object.freeze({ id:"hills", label:"上り密度", max:80, unit:"m/km", digits:1, source:"精度確認済み標高の累積上昇 ÷ 距離" }),
  Object.freeze({ id:"cadence", label:"推定歩調", max:220, unit:"歩/分", digits:0, source:"端末による歩数推定" }),
  Object.freeze({ id:"fatigue", label:"疲労変化", min:-10, max:10, unit:"/10", digits:0, source:"走る前後のROF-J差" }),
]);
const readNumber = (value) => finite(value) ? Number(value) : null;
const within = (value, low, high) => value !== null && value >= low && value <= high ? value : null;
const clamp01 = value => Math.max(0,Math.min(1,value));

/* Each accepted long-window segment is a GPS-derived *estimate*, never a
 * sensor's instantaneous speed. Rejected/uncertain segments are not zero. */
export function gpsPaceVariation(measurement) {
  const track=Array.isArray(measurement?.track)?measurement.track:[];
  if (track.length<8) return null;
  const speeds=[]; let accumulatedDistance=0, accumulatedTime=0, coveredTime=0;
  let last=null;
  for (const point of track) {
    const t=readNumber(point?.timestamp),lat=readNumber(point?.lat),lon=readNumber(point?.lon);
    const accuracy=readNumber(point?.accuracyM);
    if(t===null||lat===null||lon===null||Math.abs(lat)>90||Math.abs(lon)>180||accuracy===null||accuracy>50||accuracy<0){last=null;accumulatedDistance=0;accumulatedTime=0;continue;}
    if(!last){last=point;continue;}
    const dt=(t-Number(last.timestamp))/1000;
    const distance=haversineDistanceMeters(last,point);
    if(!(dt>0&&dt<=180&&Number.isFinite(distance)&&distance>=0&&distance/dt<=12)){
      last=point;accumulatedDistance=0;accumulatedTime=0;continue;
    }
    last=point; accumulatedDistance+=distance;accumulatedTime+=dt;
    if(accumulatedTime<45) continue;
    const speed=accumulatedDistance/accumulatedTime;
    if(accumulatedTime<=180&&speed>=.6&&speed<=8.5){speeds.push(speed);coveredTime+=accumulatedTime;}
    accumulatedDistance=0;accumulatedTime=0;
  }
  const totalDuration=(Number(track.at(-1)?.timestamp)-Number(track[0]?.timestamp))/1000;
  if(speeds.length<4||!(totalDuration>0)||coveredTime/totalDuration<.6) return null;
  const mean=speeds.reduce((sum,v)=>sum+v,0)/speeds.length;
  const variance=speeds.reduce((sum,v)=>sum+(v-mean)**2,0)/speeds.length;
  return Math.sqrt(variance)/mean*100;
}

export function buildRunningProfile(record, { measurement=null, fatigue=null }={}) {
  const distance=within(readNumber(record?.distanceKm),0.01,10000);
  const minutes=within(readNumber(record?.durationMinutes),0.01,100000);
  const speed=distance!==null&&minutes!==null?distance/(minutes/60):null;
  const analysis=measurement?.courseAnalysis;
  const gradeOk=analysis?.gradeKnowledge==="KNOWN_PROFILE"&&
    readNumber(analysis?.elevationCoverage)!==null&&Number(analysis.elevationCoverage)>=.8;
  const gain=gradeOk?within(readNumber(analysis?.elevationGainM),0,100000):null;
  const analyzedDistance=gradeOk?within(readNumber(analysis?.distanceKm),0.01,10000):null;
  const cadence=within(readNumber(measurement?.stepEstimate?.cadenceSpm),40,260);
  const pre=within(readNumber(fatigue?.pre),0,10);
  const post=within(readNumber(fatigue?.post),0,10);
  const raw=Object.freeze({
    distance,
    speed:within(speed,0.1,100),
    variation:gpsPaceVariation(measurement),
    hills:gain!==null&&analyzedDistance!==null?gain/analyzedDistance:null,
    cadence,
    fatigue:pre!==null&&post!==null?post-pre:null,
  });
  const values=RUNNING_PROFILE_AXES.map(axis=>{
    const value=readNumber(raw[axis.id]);
    if(value===null||!Number.isFinite(value))return null;
    return clamp01((value-(axis.min??0))/(axis.max-(axis.min??0)));
  });
  return Object.freeze({recordId:String(record?.id||""),raw,values:Object.freeze(values),available:values.filter(x=>x!==null).length});
}

export function profileSvgPath(values) {
  const r=101,cx=150,cy=143,n=RUNNING_PROFILE_AXES.length;
  const points=values.map((fraction,index)=>fraction===null?null:{x:cx+Math.sin(2*Math.PI*index/n)*r*fraction,y:cy-Math.cos(2*Math.PI*index/n)*r*fraction});
  if(points.every(x=>x!==null))return {path:`M ${points.map(p=>`${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ")} Z`,closed:true};
  // Never bridge a missing axis; draw only adjacent observed segments.
  let path=""; let connected=false;
  points.forEach((point,i)=>{if(!point){connected=false;return;}const xy=`${point.x.toFixed(2)} ${point.y.toFixed(2)}`;path+=`${connected?" L ":" M "}${xy}`;connected=true;});
  if(points[0]&&points[n-1])path+=` M ${points[n-1].x.toFixed(2)} ${points[n-1].y.toFixed(2)} L ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  return {path,closed:false};
}

function seriesGroup(profile,color,kind,{hidden=false}={}){
  const path=profileSvgPath(profile.values);
  const nodes=profile.values.map((fraction,index)=>{
    if(fraction===null)return "";
    const angle=2*Math.PI*index/6;
    const x=150+Math.sin(angle)*101*fraction,y=143-Math.cos(angle)*101*fraction;
    const axis=RUNNING_PROFILE_AXES[index],raw=profile.raw[axis.id];
    return `<circle class="running-radar__point" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.7"><title>${escapeHtml(`${axis.label}：${raw.toFixed(axis.digits)} ${axis.unit}`)}</title></circle>`;
  }).join("");
  return `<g class="running-radar__series ${SERIES_CLASS[kind]}" data-running-radar-layer="${escapeHtml(profile.recordId)}"${hidden?' hidden="hidden"':""} style="--series-color:${color}"><path class="running-radar__area" d="${path.path}"${path.closed?"":" fill=\"none\""}></path><path class="running-radar__outline" d="${path.path}"></path>${nodes}</g>`;
}

function rof(services,record){
  const summary=services?.fatigue?.summarizeRun?.(record.id);
  return summary?.available?{pre:summary.pre,post:summary.post}:null;
}
function eventTime(record){const date = formatLocalDate(record?.date || ""); const time = formatLocalTime(record?.createdAt || ""); return `${date}${time ? ` ${time}` : ""}`;}
const LEGEND_CLASS=Object.freeze({current:"running-radar__legend-item--current",previous:"running-radar__legend-item--previous",history:"running-radar__legend-item--history"});
const SERIES_CLASS=Object.freeze({current:"running-radar__series--current",previous:"running-radar__series--previous",history:"running-radar__series--history"});
function legend(profile,kind,label){return `<span class="running-radar__legend-item ${LEGEND_CLASS[kind]}"><i></i><span>${escapeHtml(label)} <small${kind==="history"?" data-running-radar-history-count":""}>${profile.available}/6</small></span></span>`;}
const COMPARISON_CLASS = Object.freeze({
  current:"running-radar__compare-value--current",
  previous:"running-radar__compare-value--previous",
  history:"running-radar__compare-value--history",
});
function comparativeAxisValues(axisIndex, profiles) {
  const axis = RUNNING_PROFILE_AXES[axisIndex];
  const labels = [
    ["今回", profiles.current, "current"],
    ["前回", profiles.previous?.profile || null, "previous"],
  ];
  return `<div class="running-radar__comparison-values">${labels.map(([label, profile, role]) => {
    const raw = profile?.raw?.[axis.id];
    return `<div class="running-radar__compare-value ${COMPARISON_CLASS[role]}"><small>${label}</small><strong>${raw === null || raw === undefined ? "—" : `${escapeHtml(raw.toFixed(axis.digits))}<em>${escapeHtml(axis.unit)}</em>`}</strong></div>`;
  }).join("")}<div class="running-radar__compare-value running-radar__compare-value--history"><small>過去</small><strong data-running-radar-history-value-slot>${profiles.selected?.profile?.raw?.[axis.id] == null ? "—" : `${escapeHtml(profiles.selected.profile.raw[axis.id].toFixed(axis.digits))} ${escapeHtml(axis.unit)}`}</strong></div></div>`;
}
function axisInspector(profiles, availableHistory) {
  const buttons = RUNNING_PROFILE_AXES.map((axis, index) => `<button type="button" class="running-radar__axis-button${index === 1 ? " is-active" : ""}" data-running-radar-axis="${index}" aria-pressed="${index === 1}"><span class="running-radar__axis-index">0${index + 1}</span>${escapeHtml(axis.label)}</button>`).join("");
  const panels = RUNNING_PROFILE_AXES.map((axis, index) => `<section class="running-radar__axis-panel" data-running-radar-axis-panel="${index}"${index === 1 ? "" : " hidden"}><div class="running-radar__axis-panel-heading"><div><small>選択した軸 / ${index + 1} OF 6</small><h3>${escapeHtml(axis.label)}</h3></div><span>${escapeHtml(axis.unit)}</span></div>${comparativeAxisValues(index, profiles)}<div class="running-radar__history-inspector" aria-hidden="true">${availableHistory.map(({profile}) => {
    const raw = profile.raw[axis.id];
    return `<span data-running-radar-history-value="${escapeHtml(profile.recordId)}"${profile.recordId === profiles.selected?.profile.recordId ? "" : " hidden"}>${raw === null ? "—" : `${escapeHtml(raw.toFixed(axis.digits))} ${escapeHtml(axis.unit)}`}</span>`;
  }).join("")}</div><p>${escapeHtml(axis.source)}</p></section>`).join("");
  return `<div class="running-radar__inspector"><p class="running-radar__inspector-lead"><span>AXIS EXPLORER</span> 軸を選んで3つの記録を比べる</p><div class="running-radar__axis-buttons" role="group" aria-label="比較する指標を選ぶ">${buttons}</div>${panels}</div>`;
}
function metricDetails(profile){return RUNNING_PROFILE_AXES.map((axis,i)=>{
  const value=profile.raw[axis.id];
  return `<div class="running-radar__metric"><dt>${escapeHtml(axis.label)}</dt><dd>${value===null?"未取得":`${escapeHtml(value.toFixed(axis.digits))} <small>${escapeHtml(axis.unit)}</small>`}</dd></div>`;
}).join("");}

export function renderMobileRunningRadar({record,allExperiences=[],services,measurement=null,fatigue=null,findMeasurement=findSavedRunMeasurement}={}) {
  if(record?.activityType!=="run"||String(record.runningFormat||"").toUpperCase()==="RUN_WALK")return "";
  const current=buildRunningProfile(record,{measurement,fatigue});
  const older=allExperiences
    .map(exp=>exp?.record).filter(r=>r?.activityType==="run"&&String(r.runningFormat||"").toUpperCase()!=="RUN_WALK"&&r.id!==record.id)
    .filter(r=>compareRecordChronology(r,record)<0)
    .sort((a,b)=>compareRecordChronology(b,a));
  const profiles=older.slice(0,12).map(item=>({record:item,profile:buildRunningProfile(item,{measurement:findMeasurement(item.id),fatigue:rof(services,item)})}));
  const previous=profiles[0];
  const selected=profiles.length>1?profiles[1]:null;
  const canShape=current.available>=3;
  const guides=[.25,.5,.75,1].map(f=>{
    const path=Array.from({length:6},(_,i)=>`${(150+101*f*Math.sin(i*Math.PI/3)).toFixed(1)},${(143-101*f*Math.cos(i*Math.PI/3)).toFixed(1)}`).join(" ");
    return `<polygon points="${path}"/>`;
  }).join("");
  const axisLines=Array.from({length:6},(_,i)=>`<line x1="150" y1="143" x2="${(150+101*Math.sin(i*Math.PI/3)).toFixed(1)}" y2="${(143-101*Math.cos(i*Math.PI/3)).toFixed(1)}"/>`).join("");
  const focusRays=Array.from({length:6},(_,i)=>`<line data-running-radar-focus-ray="${i}"${i === 1 ? "" : ' hidden="hidden"'} x1="150" y1="143" x2="${(150+101*Math.sin(i*Math.PI/3)).toFixed(1)}" y2="${(143-101*Math.cos(i*Math.PI/3)).toFixed(1)}"/>`).join("");
  const axisNames=RUNNING_PROFILE_AXES.map((axis,i)=>{
    const angle=i*Math.PI/3,x=150+126*Math.sin(angle),y=143-126*Math.cos(angle);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central">${escapeHtml(axis.label)}</text>`;
  }).join("");
  const choices=profiles.slice(1).map(({record:r,profile},index)=>`<option data-available="${profile.available}" value="${escapeHtml(profile.recordId)}"${index===0?' selected="selected"':""}>${escapeHtml(eventTime(r))}</option>`).join("");
  const historyLayers=profiles.slice(1).map(({profile})=>seriesGroup(profile,"#dc9e46","history",{hidden:profile.recordId!==selected?.profile.recordId})).join("");
  return `<section class="running-radar" aria-labelledby="running-radar-title" data-running-radar>
    <header class="running-radar__head"><div><small>EXPERIMENTAL · RUN PROFILE</small><h2 id="running-radar-title">走りの個性を比べる</h2><p>同じ尺度で、違う走りを重ねる</p></div><span class="running-radar__trial">試験表示</span></header>
    <div class="running-radar__legend">${legend(current,"current","今回")}${previous?legend(previous.profile,"previous","前回"):""}${selected?legend(selected.profile,"history","過去"):""}</div>
    ${canShape?`<svg class="running-radar__svg" viewBox="0 0 300 290" role="img" aria-label="6軸のランニング記録を比較するレーダー図。未取得の軸は線で接続しません。"><g class="running-radar__grid">${guides}${axisLines}</g><g class="running-radar__focus">${focusRays}</g>${historyLayers}${previous?seriesGroup(previous.profile,"#5877cd","previous"):""}${seriesGroup(current,"#0c929c","current")}<g class="running-radar__labels">${axisNames}</g></svg>`:
    `<div class="running-radar__empty"><strong>今回の表示は ${current.available}/6軸</strong><span>図形に必要な3軸がそろっていません。距離・時間の記録は下で確認できます。GPS・疲労感の記録があると表示内容が増えます。</span></div>`}
    ${profiles.length>1&&canShape?`<label class="running-radar__history-label">3色目の比較記録<select data-running-radar-select>${choices}</select></label>`:""}
    ${canShape?axisInspector({current,previous,selected},profiles.slice(1)):""}
    <details class="running-radar__details"><summary>今回の6軸の実数値・取得状況を見る <span aria-hidden="true">⌄</span></summary><dl class="running-radar__metrics">${metricDetails(current)}</dl></details>
    <p class="running-radar__caption">青緑＝今回、青＝前回、琥珀＝選択した過去記録。未取得の軸は欠けたまま表示します。外側ほど良いという意味ではありません。</p>
    <details class="running-radar__method"><summary>指標の定義・尺度について <span aria-hidden="true">⌄</span></summary><p>距離・平均速度は走行記録、ペース変動・起伏・推定歩調は保存GPS等、疲労変化はROF-Jの入力から算出します。GPS由来の値には誤差があります。</p><p>尺度は視覚比較用に固定：距離20km、速度20km/h、変動50%、上り密度80m/km、歩調220歩/分、疲労差−10〜+10。六角形の面積は総合点ではなく、外側ほど健康的・安全という意味もありません。12部位の科学的な計算値とは独立しています。</p></details>
  </section>`;
}

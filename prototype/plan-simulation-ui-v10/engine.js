// Exact prototype extraction from Formal Current App Source V1.5R2.
// Source module: core/model/primaryRegionalV2/primaryRegionalV2Engine.js
// Prototype purpose only; calculation code is unchanged.

const __exp = Object.create(null);
// RunLoad Primary Regional V2 calculation engine.
// Current public baseline for records created from this release onward.

const MODEL_VERSION = 'runload-primary-regional-reference100-v3.0';
const OUTPUT_SEMANTIC_VERSION = 'runload-primary-regional-reference100-output-v3.0';
const BUILD_ID = 'primary-reference100-v3-20260917-authority-v1.2plus';

const REGION_DEFS = Object.freeze([
  {id:'R01',name:'股関節部',referenceSpeedMps:2.50,domain:[2.50,4.50],construct:'股関節の機械的仕事に基づく部位内Reference-100',baselineSource:'FUKUCHI_2017',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R02',name:'殿部',referenceSpeedMps:2.50,domain:[2.25,4.50],construct:'殿部筋活動に基づく部位内Reference-100',baselineSource:'GAZENDAM_HOF_2007_FIGURE3_DIGITIZED',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R03',name:'大腿前面',referenceSpeedMps:2.50,domain:[2.25,4.50],construct:'大腿前面筋活動に基づく部位内Reference-100',baselineSource:'GAZENDAM_HOF_2007_FIGURE3_DIGITIZED',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R04',name:'大腿後面',referenceSpeedMps:2.50,domain:[2.25,4.50],construct:'大腿後面筋活動に基づく部位内Reference-100',baselineSource:'GAZENDAM_HOF_2007_FIGURE3_DIGITIZED',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R05',name:'膝蓋大腿関節部',referenceSpeedMps:2.78,domain:[8/3.6,16/3.6],construct:'膝蓋大腿関節stress力積に基づく部位内Reference-100',baselineSource:'HAGEN_2023',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R06',name:'脛骨部',referenceSpeedMps:2.78,domain:[2.78,5.00],construct:'脛骨stress力積に基づく部位内Reference-100',baselineSource:'VAN_HOOREN_2024',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R07',name:'下腿後面',referenceSpeedMps:2.50,domain:[2.25,4.50],construct:'下腿後面筋活動に基づく部位内Reference-100',baselineSource:'GAZENDAM_HOF_2007_TABLE3_NORMALIZED',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R08',name:'足関節部',referenceSpeedMps:2.50,domain:[2.50,4.50],construct:'足関節の機械的仕事に基づく部位内Reference-100',baselineSource:'FUKUCHI_2017',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R09',name:'アキレス腱部',referenceSpeedMps:2.78,domain:[2.78,5.00],construct:'アキレス腱strain力積に基づく部位内Reference-100',baselineSource:'VAN_HOOREN_2024',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R10',name:'後足部',referenceSpeedMps:2.50,domain:[1.50,2.50],construct:'後足部ピーク足底圧に基づく部位内Reference-100',baselineSource:'HO_2010',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R11',name:'足底中部・内側縦足弓',referenceSpeedMps:2.50,domain:[1.50,2.50],construct:'中足部ピーク足底圧に基づく部位内Reference-100',baselineSource:'HO_2010',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE_PROJECT_COMPOSITE'},
  {id:'R12',name:'前足部',referenceSpeedMps:2.50,domain:[1.50,2.50],construct:'前足部ピーク足底圧に基づく部位内Reference-100',baselineSource:'HO_2010',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE_PROJECT_COMPOSITE'},
]);
const DEF = new Map(REGION_DEFS.map(x=>[x.id,x]));

// Gazendam & Hof (2007) Table 3 coefficients are combined with relative FF areas
// reproducibly digitized from the saved Figure 3 image. Absolute FF areas are not
// required after 2.5 m/s normalization; R07 uses FF1 only, so its FF1 area cancels exactly.
const GAZENDAM_FF_RELATIVE_AREA=Object.freeze({1:1,2:1,3:0.4931059271592576,4:1,5:0.48108493932905066,6:1,7:0.8195583596214511,8:0.9756871035940803});
const EMG_COEFFS={
  SO:{1:[0.15,0.63,-0.24]}, GM:{1:[0.54,0.28,0]}, GL:{1:[0.06,1.11,-0.37]},
  VM:{2:[0.59,0,0]}, VL:{2:[0.46,0.17,0]}, RF:{2:[-0.17,0.64,0.018],3:[0.16,-0.37,0.50]},
  BF:{4:[0.68,-0.61,0.50],5:[-0.22,2.13,-1.14]}, ST:{4:[0.23,0.55,0],5:[-0.20,0.61,0]}, SM:{4:[0.32,0,0],5:[0.23,0,0]},
  GX:{6:[0,0.093,0],7:[0.046,0.13,0]}, GD:{6:[0.28,0,0],8:[0,0.29,0]}
};
const EMG_GROUPS={R02:['GX','GD'],R03:['VM','VL','RF'],R04:['BF','ST','SM'],R07:['SO','GM','GL']};

const FUKUCHI={
  R01:{pos:{2.5:0.80/1.86,3.5:1.49/2.46,4.5:2.43/2.96},neg:{2.5:0.27/1.86,3.5:0.42/2.46,4.5:0.66/2.96}},
  R08:{pos:{2.5:0.64/1.86,3.5:0.78/2.46,4.5:0.95/2.96},neg:{2.5:0.58/1.86,3.5:0.77/2.46,4.5:0.96/2.96}}
};
const VAN_SPEED={R06:{2.78:12424,3.00:11624,3.33:10551,4.00:9362,5.00:7802},R09:{2.78:439,3.00:413,3.33:374,4.00:325,5.00:266}};
const HO={He:{1.5:143.6,2.0:170.7,2.5:191.3},MM:{1.5:154.1,2.0:172.9,2.5:178.2},LM:{1.5:130.3,2.0:149.5,2.5:162.3},MF:{1.5:339.8,2.0:360.7,2.5:377.8},CF:{1.5:223.8,2.0:244.5,2.5:266.5},LF:{1.5:172.7,2.0:189.0,2.5:203.9}};
const HO_REGIONS={R10:['He'],R11:['MM','LM'],R12:['MF','CF','LF']};
const JIN_FUKUCHI_LOW_BRIDGE=Object.freeze({R01:{2.25:0.8715948738593665,2.50:1.0},R08:{2.25:1.1167426394595865,2.50:1.0}});
const LI_HO_HIGH_BRIDGE=Object.freeze({
  speed:[2.5,2.7777777777777777,3.0555555555555554,3.333333333333333],
  R10:[1.0,1.0324343257443083,1.124413309982487,1.1342206654991243],
  R11:[1.0,1.0197710818523362,1.0620326406783998,1.0686126014636348],
  R12:[1.0,1.0409252827811777,1.070758714214654,1.1053451452889045],
});
function interpKnots(xs,ys,x){if(x<xs[0]-1e-12||x>xs.at(-1)+1e-12)return null;for(let i=0;i<xs.length;i++)if(near(x,xs[i],1e-10))return ys[i];for(let i=0;i<xs.length-1;i++)if(x>xs[i]&&x<xs[i+1])return linear(x,xs[i],ys[i],xs[i+1],ys[i+1]);return null;}

const VH_GRADE={R05:{'-6':962,'-3':850,'0':787,'3':733,'6':703},R06:{'-6':13275,'-3':12401,'0':12424,'3':12553,'6':13171},R09:{'-6':324,'-3':367,'0':439,'3':516,'6':611}};
const R09_CAD={'-10':398,'0':374,'10':370};
const HO_HEEL_GRADE={'0':170.7,'5':161.4,'10':142.6,'15':124.1};
const HORIGUCHI={
  R10:{RFS:{'-6':371.0,'0':280.8,'6':212.5},FFS:{'-6':99.9,'0':72.1,'6':41.4}},
  R12:{RFS:{'-6':329.1,'0':375.7,'6':370.1},FFS:{'-6':504.7,'0':524.9,'6':528.2}}
};
const GRASS_R10=299.5/347.7;
const R12_GRASS_ENVELOPE=[0.895910642027,0.914520670558];
const HAGEN_REL_DEC={8:-.08,10:-.07,12:-.06,14:-.06,16:-.05};
const HAGEN_REL_INC={8:.10,10:.11,12:.11,14:.11,16:.10};
const VERIFIED_PROVENANCE=new Set(['VIDEO_VERIFIED','DEVICE_VERIFIED','INSTRUMENT_VERIFIED','LAB_VERIFIED']);

function finite(x){return typeof x==='number'&&Number.isFinite(x)}
function near(a,b,t=1e-9){return Math.abs(a-b)<=t}
function sortedKeys(o){return Object.keys(o).map(Number).sort((a,b)=>a-b)}
function linear(x,x0,y0,x1,y1){return y0+(y1-y0)*(x-x0)/(x1-x0)}
function interp(o,x){
  const xs=sortedKeys(o); if(x<xs[0]-1e-12||x>xs.at(-1)+1e-12) return null;
  if(near(x,xs[0]))return Number(o[xs[0]]); if(near(x,xs.at(-1)))return Number(o[xs.at(-1)]);
  for(let i=0;i<xs.length-1;i++){if(x>=xs[i]-1e-12&&x<=xs[i+1]+1e-12)return linear(x,xs[i],Number(o[xs[i]]),xs[i+1],Number(o[xs[i+1]]));}
  return null;
}
function isKnot(o,x){return sortedKeys(o).some(k=>near(k,x))}
function vhat(v){return v/Math.sqrt(9.81*0.99)}
function gain(v,c){const [d0,d1,d2]=c,q=vhat(v);return d0+d1*q+d2*q*q}
function muscleA(v,m){return Object.entries(EMG_COEFFS[m]).reduce((s,[k,c])=>s+GAZENDAM_FF_RELATIVE_AREA[Number(k)]*gain(v,c),0)}
function muscleRatio(v,m){return (muscleA(v,m)/v)/(muscleA(2.5,m)/2.5)}
function emgRaw(r,v){return EMG_GROUPS[r].reduce((s,m)=>s+muscleRatio(v,m),0)/EMG_GROUPS[r].length}
function hagH(s){return 796.25-31.17*s}
function hagD(s){return 908.84-36.86*s}
function hagI(s){return 635.35-22.36*s}
function interpCentroid(o,s){const xs=sortedKeys(o);if(s<xs[0]-1e-12||s>xs.at(-1)+1e-12)return null;return interp(o,s)}
function gradePctToDeg(p){return Math.atan(Number(p)/100)*180/Math.PI}

function rawBaselineInside(r,v){
  if(r==='R01'||r==='R08'){
    const fam=FUKUCHI[r]; const vals=['pos','neg'].map(k=>interp(fam[k],v)/fam[k][2.5]); return vals.reduce((a,b)=>a+b,0)/vals.length;
  }
  if(EMG_GROUPS[r]) return emgRaw(r,v);
  if(r==='R05') return hagH(v*3.6)/hagH(2.78*3.6);
  if(r==='R06'||r==='R09') return interp(VAN_SPEED[r],v)/VAN_SPEED[r][2.78];
  if(HO_REGIONS[r]) return HO_REGIONS[r].reduce((s,m)=>s+interp(HO[m],v)/HO[m][2.5],0)/HO_REGIONS[r].length;
  throw new Error('UNKNOWN_REGION');
}
function nearestInterior(r,b){
  if(r==='R01'||r==='R08') return b===2.5?3.5:3.5;
  if(r==='R05') return b<3?10/3.6:14/3.6;
  if(r==='R06'||r==='R09') return b===2.78?3.0:4.0;
  if(HO_REGIONS[r]) return 2.0;
  return null;
}
function boundaryLogSlope(r,b){
  if(r==='R05') return (-31.17*3.6)/hagH(b*3.6);
  const n=nearestInterior(r,b); const qb=rawBaselineInside(r,b), qn=rawBaselineInside(r,n);
  return (Math.log(qn)-Math.log(qb))/(n-b);
}
function baselineResponse(regionId,speedMps){
  const d=DEF.get(regionId),v=Number(speedMps); if(!d||!(v>0)) throw new Error('VALID_REGION_AND_POSITIVE_SPEED_REQUIRED');
  if((regionId==='R01'||regionId==='R08')&&v>=2.25-1e-12&&v<2.50-1e-12){
    const pts=JIN_FUKUCHI_LOW_BRIDGE[regionId];
    return {ratio:interp(pts,v),evidenceState:'P2_CROSS_SOURCE_BRIDGE',sourceFamily:'JIN_2018_TO_FUKUCHI_2017',routeId:`S-${regionId}-LOW`,flags:['BOUNDED_SPEED_BRIDGE']};
  }
  if((regionId==='R06'||regionId==='R09')&&v>=2.25-1e-12&&v<2.78-1e-12){
    const ratio=regionId==='R06'?(17636-2011*v)/(17636-2011*2.78):(639-76.2*v)/(639-76.2*2.78);
    return {ratio,evidenceState:'P1_SOURCE_MODEL_EXTENSION',sourceFamily:'VAN_HOOREN_2024_PUBLISHED_SPEED_MODEL',routeId:`S-${regionId}-LOW`,flags:['BOUNDED_LOW_SIDE_SPEED_EXTENSION']};
  }
  if(HO_REGIONS[regionId]&&v>2.50+1e-12&&v<=3.333333333333333+1e-12){
    const ratio=interpKnots(LI_HO_HIGH_BRIDGE.speed,LI_HO_HIGH_BRIDGE[regionId],v);
    return {ratio,evidenceState:'P2_CROSS_SOURCE_BRIDGE',sourceFamily:'LI_2020_TO_HO_2010',routeId:`S-${regionId}-HIGH`,flags:['BOUNDED_SPEED_BRIDGE',regionId==='R11'||regionId==='R12'?'PROJECT_DEFINED_COMPONENT_COMPOSITE':null].filter(Boolean)};
  }
  const [lo,hi]=d.domain;
  if(v<lo-1e-12||v>hi+1e-12)return {ratio:null,evidenceState:'EVIDENCE_INSUFFICIENT',sourceFamily:d.baselineSource,routeId:null,flags:['OUTSIDE_DIRECT_AND_APPROVED_SPEED_BRIDGE']};
  return {ratio:rawBaselineInside(regionId,v),evidenceState:'DIRECT',sourceFamily:d.baselineSource,routeId:`DIRECT-${regionId}-SPEED`,flags:[(regionId==='R11'||regionId==='R12')?'PROJECT_DEFINED_COMPONENT_COMPOSITE':null].filter(Boolean)};
}

function normalizeStrike(obs){
  if(!obs||typeof obs!=='object')return null; const value=String(obs.value||'').toUpperCase(), provenance=String(obs.provenance||'').toUpperCase();
  if(!['RFS','FFS','MFS'].includes(value))return null; return {value,provenance,verified:VERIFIED_PROVENANCE.has(provenance)};
}
function weakest(states){
  const rank={DIRECT:0,P1_SOURCE_MODEL_EXTENSION:1,P2_CROSS_SOURCE_BRIDGE:2,EVIDENCE_INSUFFICIENT:9};
  return states.reduce((w,s)=>(rank[s]??8)>(rank[w]??8)?s:w,states[0]||'DIRECT');
}
function addComponent(trace,c){trace.components.push(c); if(c.evidenceState)trace.states.push(c.evidenceState)}

function r05CadenceJoint(speed,cadence,personalRef){
  if(!(finite(cadence)&&cadence>0&&finite(personalRef)&&personalRef>0))return {active:false,state:'REFERENCE_BUILDING'};
  const s=speed*3.6;if(s<8-1e-12||s>16+1e-12)return {active:false,state:'EVIDENCE_INSUFFICIENT'};
  const lo=interpCentroid(HAGEN_REL_DEC,s),hi=interpCentroid(HAGEN_REL_INC,s),rel=cadence/personalRef-1;
  if(rel<lo-1e-12||rel>hi+1e-12)return {active:false,state:'EVIDENCE_INSUFFICIENT',relativeCadence:rel,sourceHull:[lo,hi]};
  const D=hagD(s),H=hagH(s),I=hagI(s); let raw;
  if(rel<=0)raw=linear(rel,lo,D,0,H); else raw=linear(rel,0,H,hi,I);
  return {active:true,ratio:raw/hagH(2.78*3.6),state:(near(rel,0)?'SOURCE_DEFINED_MODEL':'SOURCE_BOUNDED_INTERPOLATION'),relativeCadence:rel,sourceHull:[lo,hi],sourceFamily:'HAGEN_2023_SPEED_RELATIVE_CADENCE'};
}
function vhGradeRatio(r,gradeDeg){const raw=interp(VH_GRADE[r],gradeDeg);if(raw==null)return null;return raw/VH_GRADE[r]['0']}
function r09CadenceAbsolute(delta){const raw=interp(R09_CAD,delta);return raw==null?null:raw/VAN_SPEED.R09[2.78]}
function r09CadenceRelative(delta){const raw=interp(R09_CAD,delta);return raw==null?null:raw/R09_CAD['0']}
function horiguchiRatio(r,strike,gradeDeg){const pts=HORIGUCHI[r]?.[strike];if(!pts)return null;const raw=interp(pts,gradeDeg);return raw==null?null:raw/pts['0']}
function isOverground(runSetting){const x=String(runSetting||'').toUpperCase();return x.includes('OUTDOOR')||x.includes('OVERGROUND')}
function grassShare(surfaceComponents){if(!Array.isArray(surfaceComponents))return 0;return surfaceComponents.filter(x=>String(x.category||x.userCategory||'').toUpperCase().includes('NATURAL_GRASS')).reduce((s,x)=>s+Number(x.sharePercent??x.share_percent??0),0)/100}

function evaluateRegionSegment(regionId,{distanceKm,speedMps,gradePercent=null,cadenceSpm=null,personalHabitualCadenceSpm=null,surfaceComponents=null,runSetting=null,footStrikeObservation=null,allowR12GrassEnvelope=false}={}){
  const d=Number(distanceKm),v=Number(speedMps); if(!(d>=0&&v>0))return {regionId,state:'INVALID_SEGMENT_FACT'};
  const b=baselineResponse(regionId,v); const trace={baseline:b,components:[],states:[b.evidenceState],interactionState:'NO_UNRESOLVED_INTERACTION',unquantified:[]};
  if(b.ratio==null)return {regionId,state:'EVIDENCE_INSUFFICIENT',ratio:null,value:null,valueEnvelope:null,distanceKm:d,speedMps:v,evidenceState:'EVIDENCE_INSUFFICIENT',trace};
  let q=b.ratio; let cadenceApplied=false; let gradeApplied=false;

  // Cadence: Direct/source-native only. The adapter supplies cadence only when provenance is eligible.
  if(regionId==='R05'&&cadenceSpm!=null){
    const c=r05CadenceJoint(v,Number(cadenceSpm),Number(personalHabitualCadenceSpm));
    if(c.active){q=c.ratio;cadenceApplied=true;addComponent(trace,{axis:'CADENCE',sourceFamily:c.sourceFamily,evidenceState:'DIRECT',relativeCadence:c.relativeCadence,sourceHull:c.sourceHull,jointWithSpeed:true});}
    else trace.unquantified.push({axis:'CADENCE',state:c.state,reason:c.state==='REFERENCE_BUILDING'?'PERSONAL_REFERENCE_UNAVAILABLE':'OUTSIDE_HAGEN_SOURCE_HULL'});
  } else if(regionId==='R09'&&cadenceSpm!=null){
    const pref=Number(personalHabitualCadenceSpm),cur=Number(cadenceSpm);
    if(finite(pref)&&pref>0&&finite(cur)&&cur>0){
      const delta=cur-pref;
      if(Math.abs(delta)<=10+1e-12&&near(v,3.33,1e-6)){
        const qa=r09CadenceAbsolute(delta); if(qa!=null){q=qa;cadenceApplied=true;addComponent(trace,{axis:'CADENCE',sourceFamily:'VAN_HOOREN_2024_R09_CADENCE',evidenceState:'DIRECT',deltaSpm:delta,jointWithSpeed:true});}
      } else trace.unquantified.push({axis:'CADENCE',state:'EVIDENCE_INSUFFICIENT',reason:'CADENCE_DIRECT_ONLY_AT_3_33_MPS'});
    } else trace.unquantified.push({axis:'CADENCE',state:'REFERENCE_BUILDING',reason:'PERSONAL_REFERENCE_UNAVAILABLE'});
  } else if(regionId==='R06'&&cadenceSpm!=null) trace.unquantified.push({axis:'CADENCE',state:'EVIDENCE_INSUFFICIENT',reason:'R06_CADENCE_NUMERIC_ROUTE_INACTIVE'});

  // Grade: fixed/source-native Direct families only; no transfer and no multiplication with another axis.
  if(gradePercent!=null&&finite(Number(gradePercent))){
    const gp=Number(gradePercent),gd=gradePctToDeg(gp);
    if(regionId==='R05'&&near(v,2.78,1e-6)&&Math.abs(gd)<=6+1e-12){
      if(!cadenceApplied){const raw=interp(VH_GRADE.R05,gd);if(raw!=null){q=raw/VH_GRADE.R05['0'];gradeApplied=true;addComponent(trace,{axis:'GRADE',sourceFamily:'VAN_HOOREN_2024_R05_GRADE',evidenceState:'DIRECT',gradeDeg:gd,fixedSpeedMps:2.78});}}
      else trace.unquantified.push({axis:'GRADE',state:'EVIDENCE_INSUFFICIENT',reason:'GRADE_CADENCE_COMBINATION_NOT_AUTHORIZED'});
    } else if((regionId==='R06'||regionId==='R09')&&near(v,2.78,1e-6)&&Math.abs(gd)<=6+1e-12){
      if(!cadenceApplied){const raw=interp(VH_GRADE[regionId],gd);if(raw!=null){q=raw/VAN_SPEED[regionId][2.78];gradeApplied=true;addComponent(trace,{axis:'GRADE',sourceFamily:'VAN_HOOREN_2024_GRADE',evidenceState:'DIRECT',gradeDeg:gd,fixedSpeedMps:2.78});}}
      else trace.unquantified.push({axis:'GRADE',state:'EVIDENCE_INSUFFICIENT',reason:'GRADE_CADENCE_COMBINATION_NOT_AUTHORIZED'});
    } else if(regionId==='R10'&&near(v,2.0,1e-6)&&gp>=0&&gp<=15+1e-12){
      const raw=interp(HO_HEEL_GRADE,gp);if(raw!=null){q=raw/HO.He[2.5];gradeApplied=true;addComponent(trace,{axis:'GRADE',sourceFamily:'HO_2010_R10_UPHILL',evidenceState:'DIRECT',gradePercent:gp,fixedSpeedMps:2.0});}
    } else if(Math.abs(gp)>1e-12){
      trace.unquantified.push({axis:'GRADE',state:'EVIDENCE_INSUFFICIENT',reason:'OUTSIDE_AUTHORIZED_DIRECT_CONDITION_GEOMETRY'});
    }
  }

  // Surface and foot-strike are visible context only in the current Primary semantic.
  if(Array.isArray(surfaceComponents)&&surfaceComponents.some((x)=>Number(x?.sharePercent??x?.share_percent??0)>0)) trace.unquantified.push({axis:'SURFACE',state:'CONTEXT_ONLY',reason:'NO_ACTIVE_PRIMARY_NUMERIC_SURFACE_ROUTE'});
  if(footStrikeObservation) trace.unquantified.push({axis:'FOOT_STRIKE',state:'CONTEXT_ONLY',reason:'HORIGUCHI_PUBLIC_NUMERIC_ROUTE_INACTIVE'});
  if(cadenceApplied&&gradeApplied) trace.interactionState='AXES_PRESERVED_NOT_COMBINED';

  const finalState=weakest(trace.states.concat(trace.components.map(c=>c.evidenceState).filter(Boolean)));
  const value=100*q;
  return {regionId,state:'OK',distanceKm:d,speedMps:v,ratio:q,value,valueEnvelope:null,evidenceState:finalState,trace};
}

function wholeRunSpeed(distanceKm,durationMinutes){const d=Number(distanceKm),t=Number(durationMinutes);return d>0&&t>0?d*1000/(t*60):null}
function deriveRunningExposure(record){
  const fmt=String(record.runningFormat||'RUN').toUpperCase();
  if(fmt==='RUN_WALK'){
    const d=Number(record.runningDistanceKm),t=Number(record.runningDurationMinutes); if(!(d>0&&t>0))return {state:'RUNNING_PHASE_EXPOSURE_REQUIRED'};return {state:'OK',distanceKm:d,durationMinutes:t,speedMps:wholeRunSpeed(d,t),format:fmt};
  }
  const d=Number(record.distanceKm),t=Number(record.durationMinutes);if(!(d>0&&t>0))return {state:'INVALID_REQUIRED_RUNNING_FACT'};return {state:'OK',distanceKm:d,durationMinutes:t,speedMps:wholeRunSpeed(d,t),format:fmt};
}
function resolveSegments(record,exposure){
  const segs=Array.isArray(record.segments)?record.segments:[]; if(!segs.length)return {state:'NONE',segments:[]};
  const out=[];let total=0;
  for(const [i,s] of segs.entries()){
    let d=Number(s.distanceKm);if(!(d>=0)&&s.sharePercent!=null)d=exposure.distanceKm*Number(s.sharePercent)/100;
    if(!(d>=0))return {state:'INVALID_SEGMENT_DISTANCE',index:i}; total+=d;
    let speed=Number(s.speedMps);let speedProv='OBSERVED_OR_SEGMENT_DERIVED';
    if(!(speed>0)&&Number(s.durationMinutes)>0&&d>0)speed=d*1000/(Number(s.durationMinutes)*60);
    if(!(speed>0)){speed=exposure.speedMps;speedProv='MODEL_DERIVED_SEGMENT_SPEED_FALLBACK';}
    out.push({...s,distanceKm:d,speedMps:speed,speedProvenance:speedProv});
  }
  if(total>exposure.distanceKm+1e-8)return {state:'SEGMENT_EXPOSURE_EXCEEDS_RUNNING_DISTANCE',segmentDistanceKm:total,runningDistanceKm:exposure.distanceKm};
  if(total<exposure.distanceKm-1e-8)out.push({distanceKm:exposure.distanceKm-total,speedMps:exposure.speedMps,speedProvenance:'MODEL_DERIVED_SEGMENT_SPEED_FALLBACK',remainderState:'UNKNOWN_REMAINDER'});
  return {state:'OK',segments:out,segmentDistanceKm:total,remainderDistanceKm:Math.max(0,exposure.distanceKm-total)};
}
function summarizeRegions(segResults){
  const out={};
  for(const r of REGION_DEFS){
    const rs=segResults.map(x=>x.regionResults[r.id]);
    const totalDistance=rs.reduce((sum,x)=>sum+Number(x?.distanceKm||0),0);
    const known=rs.filter(x=>x?.value!=null&&Number(x.distanceKm)>=0);
    const supportedDistance=known.reduce((sum,x)=>sum+Number(x.distanceKm||0),0);
    const unsupportedDistance=Math.max(0,totalDistance-supportedDistance);
    const weightedNumerator=known.reduce((sum,x)=>sum+Number(x.distanceKm||0)*Number(x.value),0);
    const supportedOnlyValue=supportedDistance>0?weightedNumerator/supportedDistance:null;
    const fullValue=unsupportedDistance<=1e-9&&totalDistance>0?weightedNumerator/totalDistance:null;
    out[r.id]={value:fullValue,knownValue:supportedOnlyValue,valueEnvelope:null,supportedDistanceKm:supportedDistance,unsupportedDistanceKm:unsupportedDistance,coverageProportion:totalDistance>0?supportedDistance/totalDistance:0,state:unsupportedDistance>1e-9?'PARTIAL_EVIDENCE':fullValue==null?'EVIDENCE_INSUFFICIENT':'OK',segmentEvidence:rs.map(x=>x?.evidenceState||'EVIDENCE_INSUFFICIENT')};
  }return out;
}

function gradeAxisSegments(record,exposure){
  const u=Number(record.uphillSharePercent??0),d=Number(record.downhillSharePercent??0),f=Math.max(0,100-u-d),gu=Number(record.uphillGradePercent??0),gd=Number(record.downhillGradePercent??0);
  if(u<0||d<0||u+d>100+1e-8||gu<0||gd<0)return null;
  const a=[];if(u>0)a.push({distanceKm:exposure.distanceKm*u/100,speedMps:exposure.speedMps,gradePercent:gu,axis:'GRADE_UP'});if(d>0)a.push({distanceKm:exposure.distanceKm*d/100,speedMps:exposure.speedMps,gradePercent:-gd,axis:'GRADE_DOWN'});if(f>0)a.push({distanceKm:exposure.distanceKm*f/100,speedMps:exposure.speedMps,gradePercent:0,axis:'GRADE_FLAT'});return a;
}
function surfaceAxisSegments(record,exposure){
  if(!Array.isArray(record.surfaceComponents)||!record.surfaceComponents.length)return null;let total=0;const a=[];for(const x of record.surfaceComponents){const sh=Number(x.sharePercent??x.share_percent??0);if(sh<0)return null;total+=sh;if(sh>0)a.push({distanceKm:exposure.distanceKm*sh/100,speedMps:exposure.speedMps,surfaceComponents:[{category:x.category||x.userCategory,sharePercent:100}],runSetting:record.runSetting,axis:'SURFACE'});}if(total>100+1e-8)return null;if(total<100-1e-8)a.push({distanceKm:exposure.distanceKm*(100-total)/100,speedMps:exposure.speedMps,axis:'SURFACE_UNKNOWN_REMAINDER'});return a;
}
function evalSegments(segments,record,{useWholeCadence=false}={}){return segments.map((s,i)=>({index:i,remainderState:s.remainderState||null,speedProvenance:s.speedProvenance||null,regionResults:Object.fromEntries(REGION_DEFS.map(r=>[r.id,evaluateRegionSegment(r.id,{...s,cadenceSpm:s.cadenceSpm??(useWholeCadence?record.averageCadenceSpm:null),personalHabitualCadenceSpm:s.personalHabitualCadenceSpm??(useWholeCadence?record.personalHabitualCadenceSpm:null),runSetting:s.runSetting??record.runSetting,footStrikeObservation:s.footStrikeObservation??record.footStrikeObservation,allowR12GrassEnvelope:record.allowR12GrassEnvelope===true})]))}))}

function calculateRun(record={}){
  const exposure=deriveRunningExposure(record);if(exposure.state!=='OK')return {state:exposure.state,modelVersion:MODEL_VERSION,outputSemanticVersion:OUTPUT_SEMANTIC_VERSION};
  const seg=resolveSegments(record,exposure);
  if(seg.state==='OK'){
    const evaluated=evalSegments(seg.segments,record,{useWholeCadence:true});return {state:'OK',courseState:seg.remainderDistanceKm>0?'HYBRID_PARTIAL_SEGMENTED':'SEGMENTED_COLOCATED',exposure,segments:evaluated,regions:summarizeRegions(evaluated),modelVersion:MODEL_VERSION,outputSemanticVersion:OUTPUT_SEMANTIC_VERSION};
  }
  if(seg.state!=='NONE')return {state:seg.state,...seg,modelVersion:MODEL_VERSION,outputSemanticVersion:OUTPUT_SEMANTIC_VERSION};

  const baseSeg=[{distanceKm:exposure.distanceKm,speedMps:exposure.speedMps,runSetting:record.runSetting}];
  const baseRegions=summarizeRegions(evalSegments(baseSeg,record,{useWholeCadence:false}));
  const cadenceRegions=summarizeRegions(evalSegments(baseSeg,record,{useWholeCadence:true}));
  const gsegs=gradeAxisSegments(record,exposure);
  const hasGrade=!!gsegs&&(Number(record.uphillSharePercent??0)>0||Number(record.downhillSharePercent??0)>0);
  const hasCadence=record.averageCadenceSpm!=null;
  const gradeRegions=hasGrade?summarizeRegions(evalSegments(gsegs,record,{useWholeCadence:false})):null;
  const main=JSON.parse(JSON.stringify(baseRegions));
  if(hasCadence){for(const rid of ['R05','R09'])if(cadenceRegions[rid]?.value!=null)main[rid]=cadenceRegions[rid];}
  if(hasGrade&&gradeRegions){
    for(const rid of ['R05','R06','R09','R10']){
      if(rid==='R05'&&hasCadence&&cadenceRegions.R05?.value!=null)continue;
      if(gradeRegions[rid]?.value!=null)main[rid]=gradeRegions[rid];
    }
  }
  const axes={};if(hasCadence)axes.cadence=cadenceRegions;if(hasGrade)axes.grade=gradeRegions;
  return {state:'OK',courseState:'WHOLE_RUN_ONLY',combinedConditionState:(hasCadence&&hasGrade)?'AXES_PRESERVED_NOT_COMBINED':null,exposure,regions:main,axisEstimates:axes,surfaceContextRecorded:Array.isArray(record.surfaceComponents)&&record.surfaceComponents.length>0,modelVersion:MODEL_VERSION,outputSemanticVersion:OUTPUT_SEMANTIC_VERSION};
}

function regionDefinition(id){return DEF.get(id)||null}

export { MODEL_VERSION, OUTPUT_SEMANTIC_VERSION, BUILD_ID, REGION_DEFS, R12_GRASS_ENVELOPE, baselineResponse, evaluateRegionSegment, calculateRun, regionDefinition };
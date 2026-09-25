import "./infrastructure.js";
import { internalModules } from "./modules.js";

// ===== core/model/v27/v27Constants.js =====
{
const moduleExports = Object.create(null);
const V27_MODEL_VERSION = "runload-load-model-v2.7";

const V27_ACTIVITY_TYPES = Object.freeze({
  continuousRun: "CONTINUOUS_RUN",
  runWalk: "RUN_WALK",
  unknown: "UNKNOWN",
});

const V27_MISSINGNESS_STATES = Object.freeze({
  knownApplied: "KNOWN_APPLIED",
  knownUnsupported: "KNOWN_NOT_NUMERICALLY_SUPPORTED",
  unknown: "UNKNOWN",
  invalid: "INVALID",
  outOfDomain: "OUT_OF_DOMAIN",
  notApplicable: "NOT_APPLICABLE",
});

const V27_REGIONS = Object.freeze([
  Object.freeze({ id: "R01", label: "腰・骨盤", primaryMode: "VOLUME_ONLY_CONTEXT" }),
  Object.freeze({ id: "R02", label: "股関節・臀部", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R03", label: "大腿前部", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R04", label: "大腿後部", primaryMode: "VOLUME_ONLY_CONTEXT" }),
  Object.freeze({ id: "R05", label: "膝", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R06", label: "すね", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R07", label: "ふくらはぎ・アキレス腱周辺", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R08", label: "足関節・足部", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
]);

const V27_EMPHASIS_REGION_IDS = Object.freeze([
  "R02",
  "R03",
  "R05",
  "R06",
  "R07",
  "R08",
]);

const V27_SURFACE_FACTORS = Object.freeze({
  REF_HARD_EVEN_STABLE: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "KNOWN_APPLIED",
  }),
  DRY_STABLE_GRASS_TURF: Object.freeze({
    central: 1.05,
    low: 1,
    high: 1.1,
    state: "KNOWN_APPLIED",
  }),
  DEEP_DRY_SOFT_SAND: Object.freeze({
    central: 1.4,
    low: 1.2,
    high: 1.6,
    state: "KNOWN_APPLIED",
  }),
  EXPLICIT_UNEVEN: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "KNOWN_NOT_NUMERICALLY_SUPPORTED",
  }),
  KNOWN_OTHER: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "KNOWN_NOT_NUMERICALLY_SUPPORTED",
  }),
  UNKNOWN: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "UNKNOWN",
  }),
});

const V27_GRADE_CURVES = Object.freeze({
  R02: Object.freeze({
    xs: Object.freeze([-5.71, -2.86, 0, 2.86, 5.71]),
    ys: Object.freeze([0.735294, 0.892157, 1, 1.362745, 1.598039]),
    endpointConfidence: "LOW",
    endpoint: "positive_hip_joint_power",
  }),
  R03: Object.freeze({
    xs: Object.freeze([-5.71, -2.86, 0, 2.86, 5.71]),
    ys: Object.freeze([1.311475, 1.081967, 1, 0.857923, 0.830601]),
    endpointConfidence: "LOW",
    endpoint: "negative_knee_joint_power_magnitude",
  }),
  R05: Object.freeze({
    xs: Object.freeze([-6, -3, 0, 3, 6]),
    ys: Object.freeze([1.347826, 1.147826, 1, 0.886957, 0.786957]),
    endpointConfidence: "MODERATE",
    endpoint: "pfj_cumulative_weighted_impulse_per_km",
  }),
  R06: Object.freeze({
    xs: Object.freeze([-6, -3, 0, 3, 6]),
    ys: Object.freeze([1.066667, 0.975, 1, 1.058333, 1.133333]),
    endpointConfidence: "MODERATE",
    endpoint: "tibial_cumulative_weighted_impulse_per_km",
  }),
  R07: Object.freeze({
    xs: Object.freeze([-6, -3, 0, 3, 6]),
    ys: Object.freeze([0.652677, 0.808973, 1, 1.228654, 1.46165]),
    endpointConfidence: "MODERATE",
    endpoint: "achilles_cumulative_weighted_impulse_per_km",
  }),
  R08: Object.freeze({
    xs: Object.freeze([-5.71, -2.86, 0, 2.86, 5.71]),
    ys: Object.freeze([0.764331, 0.802548, 1, 1.015924, 1.012739]),
    endpointConfidence: "LOW",
    endpoint: "absolute_ankle_joint_power_sum",
  }),
});

const V27_SPEED_CURVES = Object.freeze({
  R05: Object.freeze({
    xs: Object.freeze([2.78, 3, 3.33, 4, 5]),
    ys: Object.freeze([1, 0.991304, 1.008696, 1.052174, 1.034783]),
  }),
  R06: Object.freeze({
    xs: Object.freeze([2.78, 3, 3.33, 4, 5]),
    ys: Object.freeze([1, 1, 1, 1.008333, 1.008333]),
  }),
  R07: Object.freeze({
    xs: Object.freeze([2.78, 3, 3.33, 4, 5]),
    ys: Object.freeze([1, 1.015919, 1.021708, 1.047757, 1.044863]),
  }),
});

const V27_CADENCE_CURVES = Object.freeze({
  R05: Object.freeze({
    xs: Object.freeze([-10, 0, 10]),
    ys: Object.freeze([1.034783, 1, 0.956522]),
  }),
  R06: Object.freeze({
    xs: Object.freeze([-10, 0, 10]),
    ys: Object.freeze([1.041667, 1, 0.975]),
  }),
  R07: Object.freeze({
    xs: Object.freeze([-10, 0, 10]),
    ys: Object.freeze([1.093484, 1, 0.977337]),
  }),
});

const V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS = 0.1;
const V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG = 0.005;
const V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT = 20;
const V27_COMMON_REGIONAL_GRADE_DOMAIN_MAX_PERCENT = (
  Math.tan(5.71 * Math.PI / 180) * 100
);
const V27_COMMON_REGIONAL_GRADE_INPUT_MAX_PERCENT = (
  Math.tan(
    (5.71 + V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG) * Math.PI / 180,
  ) * 100
);

const V27_REGIONAL_VIEW_IDS = Object.freeze({
  withinRun: "WITHIN_RUN_REGIONAL_EMPHASIS",
  ownFlat: "OWN_FLAT_REFERENCE_RATIO",
  personal: "PERSONAL_USUAL_RATIO",
});
moduleExports["V27_MODEL_VERSION"] = V27_MODEL_VERSION;
moduleExports["V27_ACTIVITY_TYPES"] = V27_ACTIVITY_TYPES;
moduleExports["V27_MISSINGNESS_STATES"] = V27_MISSINGNESS_STATES;
moduleExports["V27_REGIONS"] = V27_REGIONS;
moduleExports["V27_EMPHASIS_REGION_IDS"] = V27_EMPHASIS_REGION_IDS;
moduleExports["V27_SURFACE_FACTORS"] = V27_SURFACE_FACTORS;
moduleExports["V27_GRADE_CURVES"] = V27_GRADE_CURVES;
moduleExports["V27_SPEED_CURVES"] = V27_SPEED_CURVES;
moduleExports["V27_CADENCE_CURVES"] = V27_CADENCE_CURVES;
moduleExports["V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS"] = V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS;
moduleExports["V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG"] = V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG;
moduleExports["V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT"] = V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT;
moduleExports["V27_COMMON_REGIONAL_GRADE_DOMAIN_MAX_PERCENT"] = V27_COMMON_REGIONAL_GRADE_DOMAIN_MAX_PERCENT;
moduleExports["V27_COMMON_REGIONAL_GRADE_INPUT_MAX_PERCENT"] = V27_COMMON_REGIONAL_GRADE_INPUT_MAX_PERCENT;
moduleExports["V27_REGIONAL_VIEW_IDS"] = V27_REGIONAL_VIEW_IDS;
internalModules.legacyLoadModelConstants = moduleExports;
}

// ===== core/storage/modelResultV27Repository.js =====
{
const moduleExports = Object.create(null);
const { V27_MODEL_VERSION } = internalModules.legacyLoadModelConstants;
const { createCollectionRepository } = internalModules.collectionRepository;
const { STORAGE_KEYS } = internalModules.storageKeys;

function normalizeResultRecord(item = {}) {
  if (
    !item
    || typeof item !== "object"
    || item.model_version !== V27_MODEL_VERSION
    || !String(item.id || "")
    || !String(item.record_id || "")
  ) {
    return null;
  }
  return Object.freeze({
    ...item,
    id: String(item.id),
    record_id: String(item.record_id),
    source_record_revision: String(item.source_record_revision || ""),
    generated_at: String(item.generated_at || ""),
    model_version: V27_MODEL_VERSION,
  });
}

function sortResultRecords(items) {
  return [...items].sort((left, right) => (
    left.record_id.localeCompare(right.record_id)
    || left.source_record_revision.localeCompare(right.source_record_revision)
    || left.id.localeCompare(right.id)
  ));
}

function createModelResultV27Repository(gateway) {
  const repository = createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.modelResultsV27,
    normalizeItem: normalizeResultRecord,
    getItemId: (item) => item.id,
    sortItems: sortResultRecords,
  });

  function loadForRecord(recordId) {
    return repository.loadAll().filter((item) => item.record_id === recordId);
  }

  function findLatestForRecord(recordId) {
    return loadForRecord(recordId).sort((left, right) => (
      right.source_record_revision.localeCompare(left.source_record_revision)
      || right.generated_at.localeCompare(left.generated_at)
      || right.id.localeCompare(left.id)
    ))[0] || null;
  }

  function latestByRecord() {
    const result = new Map();
    repository.loadAll().forEach((item) => {
      const current = result.get(item.record_id);
      if (
        !current
        || item.source_record_revision > current.source_record_revision
        || (
          item.source_record_revision === current.source_record_revision
          && item.id > current.id
        )
      ) {
        result.set(item.record_id, item);
      }
    });
    return result;
  }

  return Object.freeze({
    loadAll: repository.loadAll,
    loadAllResult: repository.loadAllResult,
    findById: repository.findById,
    loadForRecord,
    findLatestForRecord,
    latestByRecord,
    saveAll: repository.saveAll,
    upsert: repository.upsert,
    removeById: repository.removeById,
  });
}
moduleExports["createModelResultV27Repository"] = createModelResultV27Repository;
internalModules.legacyLoadResultRepository = moduleExports;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2Engine.js =====
{
const moduleExports = Object.create(null);
// Primary regional calculation engine.
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
moduleExports["MODEL_VERSION"] = MODEL_VERSION;
moduleExports["OUTPUT_SEMANTIC_VERSION"] = OUTPUT_SEMANTIC_VERSION;
moduleExports["BUILD_ID"] = BUILD_ID;
moduleExports["REGION_DEFS"] = REGION_DEFS;
moduleExports["R12_GRASS_ENVELOPE"] = R12_GRASS_ENVELOPE;
moduleExports["baselineResponse"] = baselineResponse;
moduleExports["evaluateRegionSegment"] = evaluateRegionSegment;
moduleExports["calculateRun"] = calculateRun;
moduleExports["regionDefinition"] = regionDefinition;
internalModules.primaryRegionalEngine = moduleExports;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2InputTrace.js =====
{
const moduleExports = Object.create(null);
// Current 93-input trace definition for the primary regional model.
// Values are preserved as supplied; no truthy/falsy coercion.
const RETAINED_INPUTS = Object.freeze([
  {inputId:'RL-IN-001',technicalName:'dayStatus',roles:'EXPLANATION_TRACE;HISTORY_FILTER_REFERENCE_BUILDING',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-002',technicalName:'sessionDate',roles:'EXPLANATION_TRACE;HISTORY_FILTER_REFERENCE_BUILDING',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-003',technicalName:'activityType',roles:'EXPLANATION_TRACE;HISTORY_FILTER_REFERENCE_BUILDING',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-004',technicalName:'sessionId',roles:'EXPLANATION_TRACE;HISTORY_FILTER_REFERENCE_BUILDING',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-005',technicalName:'sessionSequence',roles:'EXPLANATION_TRACE;HISTORY_FILTER_REFERENCE_BUILDING',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-006',technicalName:'recordNote',roles:'EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-007',technicalName:'recordRevision',roles:'EXPLANATION_TRACE;HISTORY_FILTER_REFERENCE_BUILDING',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-010',technicalName:'distanceStatus',roles:'UNCERTAINTY_PROVENANCE;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-011',technicalName:'distanceKm',roles:'COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-012',technicalName:'durationStatus',roles:'UNCERTAINTY_PROVENANCE;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-013',technicalName:'durationMinutes',roles:'COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-014',technicalName:'stepsStatus',roles:'UNCERTAINTY_PROVENANCE;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-015',technicalName:'steps',roles:'HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-016',technicalName:'stepsProvenance',roles:'UNCERTAINTY_PROVENANCE;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-017',technicalName:'runningFormat',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-018',technicalName:'runSetting',roles:'SOURCE_APPLICABILITY;UNCERTAINTY_PROVENANCE;COURSE_CONTEXT',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-DV-019',technicalName:'averageSpeedMps',roles:'COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-DV-020',technicalName:'averagePaceMinPerKm',roles:'COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-DV-021',technicalName:'averageCadenceSpm',roles:'COMPARISON_QUALIFIER;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-030',technicalName:'courseId',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-031',technicalName:'courseName',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-032',technicalName:'gradeKnowledge',roles:'UNCERTAINTY_PROVENANCE;COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-033',technicalName:'uphillSharePercent',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-034',technicalName:'downhillSharePercent',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-DV-035',technicalName:'flatSharePercent',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-036',technicalName:'uphillGradePercent',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-037',technicalName:'downhillGradePercent',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-038',technicalName:'routePattern',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-039',technicalName:'courseSections[]',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-040',technicalName:'surfaceKnowledge',roles:'UNCERTAINTY_PROVENANCE;COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-041',technicalName:'surfaceComponents[]',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-042',technicalName:'surfaceMaterialLabel',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-043',technicalName:'surfaceSharePercent',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-044',technicalName:'surfaceHardnessLevel',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-045',technicalName:'surfaceUnevennessLevel',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-046',technicalName:'surfaceGripLevel',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-047',technicalName:'surfaceSinkLevel',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-048',technicalName:'surfaceReboundLevel',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-049',technicalName:'surfaceStabilityLevel',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-050',technicalName:'surfaceWetSlipState',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-060',technicalName:'weatherState',roles:'SOURCE_APPLICABILITY;COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-061',technicalName:'temperatureC',roles:'SOURCE_APPLICABILITY;COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-062',technicalName:'windLevel',roles:'SOURCE_APPLICABILITY;COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-063',technicalName:'environmentNote',roles:'SOURCE_APPLICABILITY;COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-070',technicalName:'shoeId',roles:'ENTITY_REFERENCE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-071',technicalName:'shoeLabel',roles:'ENTITY_REFERENCE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-072',technicalName:'shoeType',roles:'SOURCE_APPLICABILITY;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-073',technicalName:'shoeSoftness',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-074',technicalName:'equipmentTags[]',roles:'COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-075',technicalName:'equipmentNote',roles:'COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-080',technicalName:'footPlacementSelfReport',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-081',technicalName:'rhythmStrideSelfReport',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-082',technicalName:'runningFocusTags[]',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-083',technicalName:'runningStyleNote',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-090',technicalName:'rpeStatus',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-091',technicalName:'rpeValue',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-092',technicalName:'rpeProvenance',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-093',technicalName:'postRunReflection',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-094',technicalName:'perceivedDifference',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-100',technicalName:'bodyReviewStatus',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-101',technicalName:'bodyAreaObservations[]',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-102',technicalName:'bodyAreaId',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-103',technicalName:'laterality',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-104',technicalName:'noticedIntensity',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-105',technicalName:'sensationType',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-106',technicalName:'noticedTiming',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-107',technicalName:'bodyAreaNote',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-110',technicalName:'runningStartDateOrBand',roles:'SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-111',technicalName:'experienceSelfAssessment',roles:'SUBJECTIVE_INTERNAL_RESPONSE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-112',technicalName:'runningGoalTags[]',roles:'SUBJECTIVE_INTERNAL_RESPONSE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-113',technicalName:'heightCm',roles:'UNCERTAINTY_PROVENANCE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-114',technicalName:'weightKg',roles:'UNCERTAINTY_PROVENANCE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-115',technicalName:'ageBand',roles:'UNCERTAINTY_PROVENANCE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-116',technicalName:'sexOrReferenceCategory',roles:'UNCERTAINTY_PROVENANCE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-117',technicalName:'sleepSummary',roles:'SUBJECTIVE_INTERNAL_RESPONSE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-118',technicalName:'nutritionHydrationSummary',roles:'SUBJECTIVE_INTERNAL_RESPONSE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-119',technicalName:'lifestyleNote',roles:'SUBJECTIVE_INTERNAL_RESPONSE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-120',technicalName:'reflectionKeyPoint',roles:'CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-121',technicalName:'nextCheckPoint',roles:'CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-122',technicalName:'consultationTarget',roles:'CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-123',technicalName:'consultationQuestion',roles:'CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-124',technicalName:'consultationDataSelection',roles:'CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-130',technicalName:'scheduledDate',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-131',technicalName:'planType',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-132',technicalName:'plannedDistanceStatus',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-133',technicalName:'plannedDistanceKm',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-134',technicalName:'plannedDurationStatus',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-135',technicalName:'plannedDurationMinutes',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-136',technicalName:'plannedCourseSnapshot',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-137',technicalName:'planNote',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-138',technicalName:'planOutcomeStatus',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-139',technicalName:'planChangeReason',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-140',technicalName:'actualSessionId',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
])

function buildRetainedInputTrace(record={}){
  const entries=RETAINED_INPUTS.map(d=>({ ...d, present:Object.prototype.hasOwnProperty.call(record,d.technicalName), value:Object.prototype.hasOwnProperty.call(record,d.technicalName)?record[d.technicalName]:null }));
  const runSettingProvenance=record.runSettingProvenance||'SURFACE_DERIVED';
  return {count:entries.length,entries,runSettingProvenance,traceVersion:'primary-regional-v2-input-trace-v1'};
}
function currentAppContextTraceNames(){return RETAINED_INPUTS.filter(x=>x.traceAction==='CURRENT_APP_CONTEXT_TRACE').map(x=>x.technicalName)}

function assertDaySemantics(record={}){
  const x=record.dayStatus;
  return {unrecordedIsRest:false,dayStatus:x,validDistinctState:x!=='UNRECORDED_AS_REST'};
}
moduleExports["RETAINED_INPUTS"] = RETAINED_INPUTS;
moduleExports["buildRetainedInputTrace"] = buildRetainedInputTrace;
moduleExports["currentAppContextTraceNames"] = currentAppContextTraceNames;
moduleExports["assertDaySemantics"] = assertDaySemantics;
internalModules.primaryRegionalInputTrace = moduleExports;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2InputAdapter.js =====
{
const moduleExports = Object.create(null);
const { SURFACE_FIELDS } = internalModules.modelConstants;
const { reportedRpeValue } = internalModules.rpeProvenance;

const SURFACE_KEY_BY_RECORD_KEY = Object.freeze(Object.fromEntries(
  SURFACE_FIELDS.map(({ recordKey, modelKey }) => [recordKey, modelKey]),
));

const SHOE_TYPE = Object.freeze({
  usual_training: "TRAINING", soft: "TRAINING_SOFT", light: "LIGHTWEIGHT",
  race: "RACING", trail: "TRAIL", other: "OTHER",
});
const SHOE_SOFTNESS = Object.freeze({ soft: "SOFT", normal: "NORMAL", firm: "FIRM", unknown: "UNKNOWN" });
const FOOT_PLACEMENT = Object.freeze({ heel: "RFS", full_sole: "MFS", forefoot: "FFS", varies: "VARIABLE", unknown: "UNKNOWN" });
const RHYTHM_STRIDE = Object.freeze({ usual: "USUAL", small_step: "SMALLER_STRIDE_SELF_REPORT", rhythm_focus: "CADENCE_FOCUS_SELF_REPORT", long_step: "LARGER_STRIDE_SELF_REPORT", unknown: "UNKNOWN" });

const BODY_AREA_TO_PRIMARY_REGIONAL_V2 = Object.freeze({
  "BFR-200-ING": "BA-DISP-014", "BFR-200-COX": "BA-DISP-014",
  "BFR-210-GLU": "BA-DISP-015", "BFR-220-ANT": "BA-DISP-016",
  "BFR-220-POST": "BA-DISP-018", "BFR-230-ANT": "BA-DISP-019",
  "BFR-240-ANT": "BA-DISP-021", "BFR-240-POST": "BA-DISP-023",
  "BFR-250-ANT": "BA-DISP-024", "BFR-260-DOR": "BA-DISP-024",
  "BFR-250-POST": "BA-DISP-025", "BFR-260-REAR": "BA-DISP-027",
  "BFR-260-MID": "BA-DISP-028", "BFR-260-FORE": "BA-DISP-029",
  "BFR-260-TOE": "BA-DISP-029",
});

function surfaceSelections(course = {}) {
  return SURFACE_FIELDS.flatMap(({ recordKey }) => {
    const sharePercent = Number(course?.[recordKey] || 0);
    if (!(sharePercent > 0)) return [];
    const wetSlipState = ["DRY", "DAMP", "WET", "SLIPPERY_REPORTED", "UNKNOWN"].includes(String(course?.surfaceWetSlipState || "UNKNOWN").toUpperCase())
      ? String(course.surfaceWetSlipState || "UNKNOWN").toUpperCase()
      : "UNKNOWN";
    return [{ presetKey: SURFACE_KEY_BY_RECORD_KEY[recordKey], sharePercent, wetSlipState }];
  });
}

function gradeKnowledge(value = "UNKNOWN") {
  if (value === "KNOWN_PROFILE") return "KNOWN_SUMMARY";
  if (value === "KNOWN_FLAT") return "KNOWN_FLAT";
  return "UNKNOWN";
}


function regionalSections(course = {}) {
  if (!Array.isArray(course?.sections) || !course.sections.length) return [];
  return course.sections.flatMap((section = {}, index) => {
    const distanceKm = Number(section.distanceKm);
    const sharePercent = Number(section.sharePercent);
    const grade = section.gradePercent == null ? null : Number(section.gradePercent);
    if (!(distanceKm > 0) && !(sharePercent > 0)) return [];
    const gradeDirection = section.gradeDirection
      || (grade > 0 ? "UPHILL" : grade < 0 ? "DOWNHILL" : grade === 0 ? "FLAT" : "UNKNOWN");
    return [{
      sectionId: section.sectionId || `section-${index + 1}`,
      shareBasis: "DISTANCE",
      shareValue: distanceKm > 0 ? distanceKm : sharePercent,
      distanceKm: distanceKm > 0 ? distanceKm : null,
      durationMinutes: Number(section.durationMinutes) > 0 ? Number(section.durationMinutes) : null,
      steps: section.steps != null && Number.isInteger(Number(section.steps)) && Number(section.steps) >= 0 ? Number(section.steps) : null,
      speedMps: Number(section.speedMps) > 0 ? Number(section.speedMps) : null,
      cadenceSpm: Number(section.cadenceSpm) > 0 ? Number(section.cadenceSpm) : null,
      sharePercent: sharePercent > 0 ? sharePercent : null,
      gradeDirection,
      gradePercent: grade == null || !Number.isFinite(grade) ? null : Math.abs(grade),
    }];
  });
}

function reviewStatus(feedback = {}, observations = []) {
  if (["not_asked", "deferred"].includes(String(feedback?.checkStatus || ""))) return "NOT_REVIEWED";
  return observations.length ? "AREA_RECORDED" : "REVIEWED_NO_AREA";
}

function mappedObservations(feedback = {}) {
  return (Array.isArray(feedback?.bodyAreaObservations) ? feedback.bodyAreaObservations : []).flatMap((item) => {
    const bodyAreaId = BODY_AREA_TO_PRIMARY_REGIONAL_V2[String(item?.areaId || "")];
    if (!bodyAreaId) return [];
    return [{
      bodyAreaId,
      laterality: String(item?.laterality || "UNKNOWN"),
      noticedIntensity: Number(item?.intensity || 0),
      sensationType: String(item?.sensationType || "NOT_SELECTED"),
      noticedTiming: String(item?.noticedTiming || "UNKNOWN"),
      note: String(item?.note || ""),
      sourceBodyAreaId: String(item?.areaId || ""),
    }];
  });
}

const PLAN_CHANGE_REASON = Object.freeze({
  physical_condition: "PHYSICAL_CONDITION",
  time: "TIME",
  weather: "WEATHER",
  course: "COURSE",
  other: "OTHER",
  prefer_not_to_answer: "PREFER_NOT_TO_ANSWER",
});
function planSnapshot(record = {}) {
  const outcome = record?.planOutcome || {};
  const hasPlan = Boolean(outcome.status || outcome.plannedDistanceKm || outcome.plannedDurationMinutes);
  if (!hasPlan) return {};
  const rawReason = String(outcome.reason || "").trim();
  const changeReason = PLAN_CHANGE_REASON[rawReason.toLowerCase()]
    || (Object.values(PLAN_CHANGE_REASON).includes(rawReason.toUpperCase()) ? rawReason.toUpperCase() : null);
  return {
    scheduledDate: record.date,
    planType: record.activityType === "rest" ? "REST" : "RUN",
    distanceKm: Number(outcome.plannedDistanceKm || 0) || null,
    durationMinutes: Number(outcome.plannedDurationMinutes || 0) || null,
    outcomeStatus: String(outcome.status || "COMPLETED").toUpperCase(),
    changeReason,
    course: outcome.plannedCourseSnapshot || null,
    note: outcome.planNote || null,
    changeReasonNote: outcome.reasonNote || null,
    actualSessionId: record.id,
  };
}

function adaptStoredRecordToPrimaryRegionalV2Input(record = {}, feedback = {}) {
  const observations = mappedObservations(feedback);
  const personal = record.personalContext || {};
  return {
    sessionId: record.id,
    date: record.date,
    activityType: record.activityType,
    distanceKm: record.activityType === "run" ? Number(record.distanceKm) : null,
    durationMinutes: record.activityType === "run" ? Number(record.durationMinutes) : null,
    steps: record.activityType === "run" && Number(record.steps) > 0 ? Number(record.steps) : null,
    stepsProvenance: record.stepsProvenance === "ESTIMATED" ? "ESTIMATED" : (record.stepsProvenance || "UNKNOWN"),
    runningFormat: record.activityType === "run" ? (record.runningFormat || "UNKNOWN") : null,
    rpe: reportedRpeValue(record),
    memo: record.memo || "",
    course: {
      courseId: record.course?.id || null,
      courseName: record.course?.name || "",
      gradeKnowledge: gradeKnowledge(record.course?.gradeKnowledge),
      uphillSharePercent: Number(record.course?.upPercent || 0),
      downhillSharePercent: Number(record.course?.downPercent || 0),
      uphillGradePercent: Number(record.course?.upGradePercent || 0) || null,
      downhillGradePercent: Number(record.course?.downGradePercent || 0) || null,
      surfaceSelections: surfaceSelections(record.course),
      sections: regionalSections(record.course),
    },
    shoeAndStyle: {
      shoeId: personal.shoeId || null,
      shoeLabel: personal.shoeLabel || null,
      shoeType: SHOE_TYPE[personal.shoeType] || "UNKNOWN",
      shoeSoftness: SHOE_SOFTNESS[personal.shoeSoftness] || "UNKNOWN",
      footPlacement: FOOT_PLACEMENT[personal.footPlacement] || "UNKNOWN",
      rhythmStride: RHYTHM_STRIDE[personal.rhythmStride] || "UNKNOWN",
      focusTags: personal.focusTags || [],
      note: personal.freeNote || "",
    },
    bodyReview: {
      status: reviewStatus(feedback, observations),
      observations,
    },
    plan: planSnapshot(record),
  };
}

function primaryRegionalV2ProfileContext(record = {}) {
  const profile = record.bodyProfileSnapshot || {};
  return {
    heightCm: profile.heightCm || null,
    weightKg: profile.weightKg || null,
    ageBand: profile.ageBand || null,
    sexOrReferenceCategory: profile.sex || null,
  };
}
moduleExports["BODY_AREA_TO_PRIMARY_REGIONAL_V2"] = BODY_AREA_TO_PRIMARY_REGIONAL_V2;
moduleExports["adaptStoredRecordToPrimaryRegionalV2Input"] = adaptStoredRecordToPrimaryRegionalV2Input;
moduleExports["primaryRegionalV2ProfileContext"] = primaryRegionalV2ProfileContext;
internalModules.primaryRegionalInputAdapter = moduleExports;
}

// ===== core/model/currentPrimaryInput/formalInputCatalog.js =====
{
const moduleExports = Object.create(null);
// Generated from locked Authority artifacts. Do not edit by hand.
const AUTHORITY_VERSION = "RunLoad Primary Regional V2 Current Authority 2026-09-15";
const PARAMETER_SET_VERSION = "RUNLOAD-PRIMARY-REGIONAL-V2-CURRENT";
const ADAPTER_VERSION = "RunLoad Input Preset Mapping V1.0";
const REGIONS = Object.freeze([
  {
    "id": "BA-DISP-014",
    "name": "股関節まわり",
    "constructId": "HIP_JOINT_MECHANICAL_DEMAND_TENDENCY",
    "formulaClass": "CONDITION_ROUTED_WORK",
    "referenceDefinitionId": "RCM-RDEF-014"
  },
  {
    "id": "BA-DISP-015",
    "name": "お尻",
    "constructId": "GLUTEAL_FUNCTIONAL_DEMAND_TENDENCY",
    "formulaClass": "PRIMARY_DOMINANT_COMPOSITE",
    "referenceDefinitionId": "RCM-RDEF-015"
  },
  {
    "id": "BA-DISP-016",
    "name": "太ももの前",
    "constructId": "ANTERIOR_THIGH_MUSCLE_DEMAND_TENDENCY",
    "formulaClass": "ROUTE_SELECTED_PROXY",
    "referenceDefinitionId": "RCM-RDEF-016"
  },
  {
    "id": "BA-DISP-018",
    "name": "太ももの後ろ",
    "constructId": "POSTERIOR_THIGH_MUSCLE_DEMAND_TENDENCY",
    "formulaClass": "ROUTE_SELECTED_PROXY",
    "referenceDefinitionId": "RCM-RDEF-018"
  },
  {
    "id": "BA-DISP-019",
    "name": "膝の前",
    "constructId": "PATELLOFEMORAL_CUMULATIVE_STRESS_IMPULSE_TENDENCY",
    "formulaClass": "DIRECT_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-019"
  },
  {
    "id": "BA-DISP-021",
    "name": "すね",
    "constructId": "TIBIAL_CUMULATIVE_TOTAL_STRESS_IMPULSE_TENDENCY",
    "formulaClass": "DIRECT_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-021"
  },
  {
    "id": "BA-DISP-023",
    "name": "ふくらはぎ",
    "constructId": "POSTERIOR_LOWER_LEG_MUSCLE_DEMAND_TENDENCY",
    "formulaClass": "PRIMARY_DOMINANT_COMPOSITE",
    "referenceDefinitionId": "RCM-RDEF-023"
  },
  {
    "id": "BA-DISP-024",
    "name": "足首まわり",
    "constructId": "ANKLE_TOTAL_MECHANICAL_WORK_TENDENCY",
    "formulaClass": "CONDITION_ROUTED_WORK",
    "referenceDefinitionId": "RCM-RDEF-024"
  },
  {
    "id": "BA-DISP-025",
    "name": "足首の後ろ・アキレス腱周辺",
    "constructId": "ACHILLES_CUMULATIVE_STRAIN_IMPULSE_TENDENCY",
    "formulaClass": "DIRECT_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-025"
  },
  {
    "id": "BA-DISP-027",
    "name": "かかと・足裏の後ろ",
    "constructId": "REARFOOT_CUMULATIVE_PRESSURE_TIME_EXPOSURE_TENDENCY",
    "formulaClass": "MASK_WEIGHTED_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-027"
  },
  {
    "id": "BA-DISP-028",
    "name": "土踏まず・足裏の中央",
    "constructId": "MEDIAL_LONGITUDINAL_ARCH_MECHANICAL_CONTROL_TENDENCY",
    "formulaClass": "PRIMARY_DOMINANT_COMPOSITE",
    "referenceDefinitionId": "RCM-RDEF-028"
  },
  {
    "id": "BA-DISP-029",
    "name": "足裏の前・母趾球周辺",
    "constructId": "FOREFOOT_CUMULATIVE_PRESSURE_TIME_EXPOSURE_TENDENCY",
    "formulaClass": "MASK_WEIGHTED_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-029"
  }
]);
const FORMAL_INPUT_CATALOG = Object.freeze([
  {
    "id": "RL-IN-001",
    "technicalName": "dayStatus",
    "label": "日状態",
    "groupId": "G01",
    "disposition": "ROUTING_APPLICABILITY",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "UNKNOWN/invalid route => PARTIAL or UNAVAILABLE according to dependent route; never assume reference silently.",
    "doubleCountingGuard": "Routing value is not added to index."
  },
  {
    "id": "RL-IN-002",
    "technicalName": "sessionDate",
    "label": "実施日",
    "groupId": "G01",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-003",
    "technicalName": "activityType",
    "label": "記録種別",
    "groupId": "G01",
    "disposition": "ROUTING_APPLICABILITY",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "UNKNOWN/invalid route => PARTIAL or UNAVAILABLE according to dependent route; never assume reference silently.",
    "doubleCountingGuard": "Routing value is not added to index."
  },
  {
    "id": "RL-IN-004",
    "technicalName": "sessionId",
    "label": "走行記録ID",
    "groupId": "G01",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-005",
    "technicalName": "sessionSequence",
    "label": "同日内順序",
    "groupId": "G01",
    "disposition": "ROUTING_APPLICABILITY",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "UNKNOWN/invalid route => PARTIAL or UNAVAILABLE according to dependent route; never assume reference silently.",
    "doubleCountingGuard": "Routing value is not added to index."
  },
  {
    "id": "RL-IN-006",
    "technicalName": "recordNote",
    "label": "記録メモ",
    "groupId": "G01",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-007",
    "technicalName": "recordRevision",
    "label": "記録改訂番号",
    "groupId": "G01",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-010",
    "technicalName": "distanceStatus",
    "label": "距離の入力状態",
    "groupId": "G02",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-011",
    "technicalName": "distanceKm",
    "label": "距離",
    "groupId": "G02",
    "disposition": "CUMULATIVE_EXPOSURE",
    "numericPermission": "EXPOSURE_ONLY",
    "missingnessBehavior": "Use only an approved fallback hierarchy; if no compatible exposure can be derived, region is UNAVAILABLE.",
    "doubleCountingGuard": "Select exactly one compatible exposure basis per region/section; distance, duration and steps cannot all contribute independently."
  },
  {
    "id": "RL-IN-012",
    "technicalName": "durationStatus",
    "label": "実走時間の入力状態",
    "groupId": "G02",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-013",
    "technicalName": "durationMinutes",
    "label": "実走時間",
    "groupId": "G02",
    "disposition": "CUMULATIVE_EXPOSURE",
    "numericPermission": "EXPOSURE_ONLY",
    "missingnessBehavior": "Use only an approved fallback hierarchy; if no compatible exposure can be derived, region is UNAVAILABLE.",
    "doubleCountingGuard": "Select exactly one compatible exposure basis per region/section; distance, duration and steps cannot all contribute independently."
  },
  {
    "id": "RL-IN-014",
    "technicalName": "stepsStatus",
    "label": "歩数の入力状態",
    "groupId": "G02",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-015",
    "technicalName": "steps",
    "label": "歩数",
    "groupId": "G02",
    "disposition": "CUMULATIVE_EXPOSURE",
    "numericPermission": "EXPOSURE_ONLY",
    "missingnessBehavior": "Use only an approved fallback hierarchy; if no compatible exposure can be derived, region is UNAVAILABLE.",
    "doubleCountingGuard": "Select exactly one compatible exposure basis per region/section; distance, duration and steps cannot all contribute independently."
  },
  {
    "id": "RL-IN-016",
    "technicalName": "stepsProvenance",
    "label": "歩数の出所",
    "groupId": "G02",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-017",
    "technicalName": "runningFormat",
    "label": "走行形式",
    "groupId": "G02",
    "disposition": "INTERACTION_ONLY",
    "numericPermission": "INTERACTION_ONLY",
    "missingnessBehavior": "If any required factor is missing, interaction is inactive and coverage records the missing prerequisite.",
    "doubleCountingGuard": "No main effect; interaction ID must be unique and stacking register must prove non-overlap."
  },
  {
    "id": "RL-IN-018",
    "technicalName": "runSetting",
    "label": "走行環境",
    "groupId": "G02",
    "disposition": "ROUTING_APPLICABILITY",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing or mixed setting disables environment-specific source protocols; no treadmill or track condition is inferred.",
    "doubleCountingGuard": "The setting selects source eligibility only and is never added as an independent numeric effect."
  },
  {
    "id": "RL-DV-019",
    "technicalName": "averageSpeedMps",
    "label": "平均速度",
    "groupId": "G02",
    "disposition": "CONDITIONAL_NUMERIC_EFFECT",
    "numericPermission": "DIRECT_OR_CONDITIONAL",
    "missingnessBehavior": "Missing => omit only that evidence-gated effect and mark PARTIAL when material; never impute reference without disclosure.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-DV-020",
    "technicalName": "averagePaceMinPerKm",
    "label": "平均ペース",
    "groupId": "G02",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-DV-021",
    "technicalName": "averageCadenceSpm",
    "label": "平均ケイデンス",
    "groupId": "G02",
    "disposition": "CONDITIONAL_NUMERIC_EFFECT",
    "numericPermission": "DIRECT_OR_CONDITIONAL",
    "missingnessBehavior": "Missing => omit only that evidence-gated effect and mark PARTIAL when material; never impute reference without disclosure.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-030",
    "technicalName": "courseId",
    "label": "保存コースID",
    "groupId": "G03",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-031",
    "technicalName": "courseName",
    "label": "コース名",
    "groupId": "G03",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-032",
    "technicalName": "gradeKnowledge",
    "label": "勾配情報の把握状態",
    "groupId": "G03",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-033",
    "technicalName": "uphillSharePercent",
    "label": "上り区間割合",
    "groupId": "G03",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-IN-034",
    "technicalName": "downhillSharePercent",
    "label": "下り区間割合",
    "groupId": "G03",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-DV-035",
    "technicalName": "flatSharePercent",
    "label": "平坦区間割合",
    "groupId": "G03",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-IN-036",
    "technicalName": "uphillGradePercent",
    "label": "代表上り勾配",
    "groupId": "G03",
    "disposition": "CONDITIONAL_NUMERIC_EFFECT",
    "numericPermission": "DIRECT_OR_CONDITIONAL",
    "missingnessBehavior": "Missing => omit only that evidence-gated effect and mark PARTIAL when material; never impute reference without disclosure.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-037",
    "technicalName": "downhillGradePercent",
    "label": "代表下り勾配の大きさ",
    "groupId": "G03",
    "disposition": "CONDITIONAL_NUMERIC_EFFECT",
    "numericPermission": "DIRECT_OR_CONDITIONAL",
    "missingnessBehavior": "Missing => omit only that evidence-gated effect and mark PARTIAL when material; never impute reference without disclosure.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-038",
    "technicalName": "routePattern",
    "label": "コース形式",
    "groupId": "G03",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; it remains available for course-history explanation and comparison.",
    "doubleCountingGuard": "No coefficient or route selection in Regional A4."
  },
  {
    "id": "RL-IN-039",
    "technicalName": "courseSections[]",
    "label": "区間情報",
    "groupId": "G03",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-IN-040",
    "technicalName": "surfaceKnowledge",
    "label": "路面把握状態",
    "groupId": "G04",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-041",
    "technicalName": "surfaceComponents[]",
    "label": "路面構成",
    "groupId": "G04",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-IN-042",
    "technicalName": "surfaceMaterialLabel",
    "label": "路面の見た目・材質ラベル",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-043",
    "technicalName": "surfaceSharePercent",
    "label": "路面割合",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-044",
    "technicalName": "surfaceHardnessLevel",
    "label": "硬さ",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-045",
    "technicalName": "surfaceUnevennessLevel",
    "label": "凹凸・不整地性",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-046",
    "technicalName": "surfaceGripLevel",
    "label": "グリップ・滑りにくさ",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-047",
    "technicalName": "surfaceSinkLevel",
    "label": "沈み込み・柔らかさ",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-048",
    "technicalName": "surfaceReboundLevel",
    "label": "反発性",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-049",
    "technicalName": "surfaceStabilityLevel",
    "label": "安定性",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-050",
    "technicalName": "surfaceWetSlipState",
    "label": "濡れ・滑り状態",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; known wet/slip context remains available for safety-oriented explanation and comparison.",
    "doubleCountingGuard": "No coefficient or interaction is applied in Regional A4."
  },
  {
    "id": "RL-IN-060",
    "technicalName": "weatherState",
    "label": "天候",
    "groupId": "G05",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-061",
    "technicalName": "temperatureC",
    "label": "気温",
    "groupId": "G05",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-062",
    "technicalName": "windLevel",
    "label": "風の感じ",
    "groupId": "G05",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-063",
    "technicalName": "environmentNote",
    "label": "環境メモ",
    "groupId": "G05",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-070",
    "technicalName": "shoeId",
    "label": "保存シューズID",
    "groupId": "G06",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-071",
    "technicalName": "shoeLabel",
    "label": "シューズ名",
    "groupId": "G06",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-072",
    "technicalName": "shoeType",
    "label": "シューズ種類",
    "groupId": "G06",
    "disposition": "PROTOCOL_CONTEXT_NO_NUMERIC_EFFECT",
    "numericPermission": "CONTEXT_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; when present the value is retained as explicit context/protocol provenance and is not assigned an isolated numeric coefficient.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-073",
    "technicalName": "shoeSoftness",
    "label": "やわらかさの自己認識",
    "groupId": "G06",
    "disposition": "PROTOCOL_CONTEXT_NO_NUMERIC_EFFECT",
    "numericPermission": "CONTEXT_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; when present the value is retained as explicit context/protocol provenance and is not assigned an isolated numeric coefficient.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-074",
    "technicalName": "equipmentTags[]",
    "label": "装備・携行品",
    "groupId": "G06",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-075",
    "technicalName": "equipmentNote",
    "label": "シューズ・装備メモ",
    "groupId": "G06",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-080",
    "technicalName": "footPlacementSelfReport",
    "label": "足のつき方の自己認識",
    "groupId": "G07",
    "disposition": "CONDITIONAL_PLANTAR_CONTEXT_NO_ISOLATED_NUMERIC_EFFECT",
    "numericPermission": "CONTEXT_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; when present the value is retained as explicit context/protocol provenance and is not assigned an isolated numeric coefficient.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-081",
    "technicalName": "rhythmStrideSelfReport",
    "label": "歩幅・テンポの自己認識",
    "groupId": "G07",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; the self-report remains available for reflection and comparison.",
    "doubleCountingGuard": "Self-reported rhythm/stride does not substitute for measured or derived cadence and has no canonical numeric effect."
  },
  {
    "id": "RL-IN-082",
    "technicalName": "runningFocusTags[]",
    "label": "実施時に意識したこと",
    "groupId": "G07",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-083",
    "technicalName": "runningStyleNote",
    "label": "走り方メモ",
    "groupId": "G07",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-090",
    "technicalName": "rpeStatus",
    "label": "RPE入力状態",
    "groupId": "G08",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-091",
    "technicalName": "rpeValue",
    "label": "RPE",
    "groupId": "G08",
    "disposition": "SESSION_SUBJECTIVE_PARALLEL_COMPONENT",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing affects parallel context only, not mechanical index availability.",
    "doubleCountingGuard": "Not summed into mechanical C/E/I/P components."
  },
  {
    "id": "RL-IN-092",
    "technicalName": "rpeProvenance",
    "label": "RPEの出所",
    "groupId": "G08",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-093",
    "technicalName": "postRunReflection",
    "label": "今回の感想",
    "groupId": "G08",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-094",
    "technicalName": "perceivedDifference",
    "label": "普段との違い",
    "groupId": "G08",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-100",
    "technicalName": "bodyReviewStatus",
    "label": "身体確認状態",
    "groupId": "G09",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-101",
    "technicalName": "bodyAreaObservations[]",
    "label": "部位観察",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "Observation container and fields form one matched-region record; no observation field may enter the canonical numeric index."
  },
  {
    "id": "RL-IN-102",
    "technicalName": "bodyAreaId",
    "label": "部位ID",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation convenience field never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-103",
    "technicalName": "laterality",
    "label": "左右",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation convenience field never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-104",
    "technicalName": "noticedIntensity",
    "label": "気になる程度",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation convenience field never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-105",
    "technicalName": "sensationType",
    "label": "感覚の種類",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation convenience field never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-106",
    "technicalName": "noticedTiming",
    "label": "気づいた時点",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation convenience field never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-107",
    "technicalName": "bodyAreaNote",
    "label": "部位メモ",
    "groupId": "G09",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-110",
    "technicalName": "runningStartDateOrBand",
    "label": "ランニング開始時期",
    "groupId": "G10",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-111",
    "technicalName": "experienceSelfAssessment",
    "label": "本人の経験認識",
    "groupId": "G10",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-112",
    "technicalName": "runningGoalTags[]",
    "label": "主な目的",
    "groupId": "G10",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-113",
    "technicalName": "heightCm",
    "label": "身長",
    "groupId": "G10",
    "disposition": "PERSONAL_REFERENCE_OR_MODIFIER",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing => canonical app reference with disclosure only where permitted; otherwise applicability gate.",
    "doubleCountingGuard": "Normalization already embedded in source endpoint cannot be applied again."
  },
  {
    "id": "RL-IN-114",
    "technicalName": "weightKg",
    "label": "体重",
    "groupId": "G10",
    "disposition": "PERSONAL_REFERENCE_OR_MODIFIER",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing => canonical app reference with disclosure only where permitted; otherwise applicability gate.",
    "doubleCountingGuard": "Normalization already embedded in source endpoint cannot be applied again."
  },
  {
    "id": "RL-IN-115",
    "technicalName": "ageBand",
    "label": "年齢帯",
    "groupId": "G10",
    "disposition": "PERSONAL_REFERENCE_OR_MODIFIER",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing => canonical app reference with disclosure only where permitted; otherwise applicability gate.",
    "doubleCountingGuard": "Normalization already embedded in source endpoint cannot be applied again."
  },
  {
    "id": "RL-IN-116",
    "technicalName": "sexOrReferenceCategory",
    "label": "性別関連入力",
    "groupId": "G10",
    "disposition": "PERSONAL_REFERENCE_OR_MODIFIER",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing => canonical app reference with disclosure only where permitted; otherwise applicability gate.",
    "doubleCountingGuard": "Normalization already embedded in source endpoint cannot be applied again."
  },
  {
    "id": "RL-IN-117",
    "technicalName": "sleepSummary",
    "label": "睡眠の自己記録",
    "groupId": "G10",
    "disposition": "SESSION_SUBJECTIVE_PARALLEL_COMPONENT",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing affects parallel context only, not mechanical index availability.",
    "doubleCountingGuard": "Not summed into mechanical C/E/I/P components."
  },
  {
    "id": "RL-IN-118",
    "technicalName": "nutritionHydrationSummary",
    "label": "食事・水分の自己記録",
    "groupId": "G10",
    "disposition": "SESSION_SUBJECTIVE_PARALLEL_COMPONENT",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing affects parallel context only, not mechanical index availability.",
    "doubleCountingGuard": "Not summed into mechanical C/E/I/P components."
  },
  {
    "id": "RL-IN-119",
    "technicalName": "lifestyleNote",
    "label": "生活背景メモ",
    "groupId": "G10",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-120",
    "technicalName": "reflectionKeyPoint",
    "label": "今回の主な気づき",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-121",
    "technicalName": "nextCheckPoint",
    "label": "次回確認したいこと",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-122",
    "technicalName": "consultationTarget",
    "label": "相談したい相手",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-123",
    "technicalName": "consultationQuestion",
    "label": "相談したい内容",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-124",
    "technicalName": "consultationDataSelection",
    "label": "共有する記録範囲",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-130",
    "technicalName": "scheduledDate",
    "label": "予定日",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-131",
    "technicalName": "planType",
    "label": "予定種別",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-132",
    "technicalName": "plannedDistanceStatus",
    "label": "予定距離の状態",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-133",
    "technicalName": "plannedDistanceKm",
    "label": "予定距離",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-134",
    "technicalName": "plannedDurationStatus",
    "label": "予定時間の状態",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-135",
    "technicalName": "plannedDurationMinutes",
    "label": "予定時間",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-136",
    "technicalName": "plannedCourseSnapshot",
    "label": "予定コーススナップショット",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-137",
    "technicalName": "planNote",
    "label": "予定メモ",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-138",
    "technicalName": "planOutcomeStatus",
    "label": "実施状況",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-139",
    "technicalName": "planChangeReason",
    "label": "変更・未実施理由",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-140",
    "technicalName": "actualSessionId",
    "label": "実績記録参照",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  }
]);
const PARAMETERS = Object.freeze({
  "RCM-P-GLOBAL-QREF": 5.0,
  "RCM-P-GLOBAL-QREF-TIME": 30.0,
  "RCM-P-GLOBAL-QREF-STEPS": 5100.0,
  "RCM-P-GLOBAL-QREF-GAIT-CYCLES": 2550.0,
  "RCM-P-GLOBAL-ALPHAE": 1.0,
  "RCM-P-GLOBAL-VREF": 2.78,
  "RCM-P-GLOBAL-CADREF": 170.0,
  "RCM-P-GLOBAL-BETASTATE": 0.0,
  "RCM-P-GLOBAL-BPROJECT": 0.25,
  "RCM-P-GLOBAL-BINTER": 0.15,
  "RCM-P-015-WGMAX": 0.8,
  "RCM-P-015-WGMED": 0.2,
  "RCM-P-023-WSOL": 0.75,
  "RCM-P-023-WGAS": 0.25,
  "RCM-P-028-WARCH": 0.65,
  "RCM-P-028-WINTR": 0.2,
  "RCM-P-028-WPFA": 0.15,
  "RCM-P-024-WPOS": 0.5,
  "RCM-P-024-WNEG": 0.5,
  "RCM-P-014-KSPEED": 0.04,
  "RCM-P-014-KUP": 0.02,
  "RCM-P-014-KDOWN": 0.015,
  "RCM-P-015-KSPEED": 0.06,
  "RCM-P-016-KUP": 0.01,
  "RCM-P-018-KGRADE": 0.005,
  "RCM-P-023-KSOLSPD": 0.1,
  "RCM-P-023-KGASSPD": 0.06,
  "RCM-P-028-KSPEED": 0.08,
  "RCM-P-015-KGRADEMAIN": 0.0,
  "RCM-P-024-KGRADE": 0.0,
  "RCM-P-SURFACE-ORDINAL": 0.0,
  "RCM-P-BODYMASS-UNIVERSAL": 0.0,
  "RCM-P-PLAN-ACTUAL": 0.0,
  "RCM-P-028-KGAIT": 0.08
});
const PARAMETER_BOUNDS = Object.freeze({
  "RCM-P-GLOBAL-QREF": {
    "lower": 5.0,
    "initial": 5.0,
    "upper": 5.0,
    "role": "FIXED_REFERENCE_NOT_SENSITIVITY_PARAMETER"
  },
  "RCM-P-GLOBAL-QREF-TIME": {
    "lower": 30.0,
    "initial": 30.0,
    "upper": 30.0,
    "role": "FIXED_ENDPOINT_FAMILY_REFERENCE"
  },
  "RCM-P-GLOBAL-QREF-STEPS": {
    "lower": 5100.0,
    "initial": 5100.0,
    "upper": 5100.0,
    "role": "FIXED_ENDPOINT_FAMILY_REFERENCE"
  },
  "RCM-P-GLOBAL-QREF-GAIT-CYCLES": {
    "lower": 2550.0,
    "initial": 2550.0,
    "upper": 2550.0,
    "role": "FIXED_ENDPOINT_FAMILY_REFERENCE"
  },
  "RCM-P-GLOBAL-ALPHAE": {
    "lower": 1.0,
    "initial": 1.0,
    "upper": 1.0,
    "role": "FIXED_LINEAR_REFERENCE_RATIO"
  },
  "RCM-P-GLOBAL-VREF": {
    "lower": 2.78,
    "initial": 2.78,
    "upper": 2.78,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-GLOBAL-CADREF": {
    "lower": 170.0,
    "initial": 170.0,
    "upper": 170.0,
    "role": "FIXED_REFERENCE_NOT_SENSITIVITY_PARAMETER"
  },
  "RCM-P-GLOBAL-BETASTATE": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_SEPARATE_OBSERVATION_OVERLAY"
  },
  "RCM-P-GLOBAL-BPROJECT": {
    "lower": 0.2,
    "initial": 0.25,
    "upper": 0.35,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-GLOBAL-BINTER": {
    "lower": 0.1,
    "initial": 0.15,
    "upper": 0.2,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-015-WGMAX": {
    "lower": 0.7,
    "initial": 0.8,
    "upper": 0.9,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-015-WGMED": {
    "lower": 0.1,
    "initial": 0.2,
    "upper": 0.3,
    "role": "DEPENDENT_COMPLEMENT"
  },
  "RCM-P-023-WSOL": {
    "lower": 0.65,
    "initial": 0.75,
    "upper": 0.85,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-023-WGAS": {
    "lower": 0.15,
    "initial": 0.25,
    "upper": 0.35,
    "role": "DEPENDENT_COMPLEMENT"
  },
  "RCM-P-028-WARCH": {
    "lower": 0.55,
    "initial": 0.65,
    "upper": 0.75,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-028-WINTR": {
    "lower": 0.15,
    "initial": 0.2,
    "upper": 0.3,
    "role": "DEPENDENT_REMAINDER"
  },
  "RCM-P-028-WPFA": {
    "lower": 0.1,
    "initial": 0.15,
    "upper": 0.2,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-024-WPOS": {
    "lower": 0.4,
    "initial": 0.5,
    "upper": 0.6,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-024-WNEG": {
    "lower": 0.4,
    "initial": 0.5,
    "upper": 0.6,
    "role": "DEPENDENT_COMPLEMENT"
  },
  "RCM-P-014-KSPEED": {
    "lower": 0.02,
    "initial": 0.04,
    "upper": 0.08,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-014-KUP": {
    "lower": 0.01,
    "initial": 0.02,
    "upper": 0.03,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-014-KDOWN": {
    "lower": 0.008,
    "initial": 0.015,
    "upper": 0.025,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-015-KSPEED": {
    "lower": 0.03,
    "initial": 0.06,
    "upper": 0.1,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-016-KUP": {
    "lower": 0.005,
    "initial": 0.01,
    "upper": 0.02,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-018-KGRADE": {
    "lower": 0.002,
    "initial": 0.005,
    "upper": 0.01,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-023-KSOLSPD": {
    "lower": 0.06,
    "initial": 0.1,
    "upper": 0.14,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-023-KGASSPD": {
    "lower": 0.03,
    "initial": 0.06,
    "upper": 0.1,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-028-KSPEED": {
    "lower": 0.04,
    "initial": 0.08,
    "upper": 0.12,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-015-KGRADEMAIN": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-024-KGRADE": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-SURFACE-ORDINAL": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-BODYMASS-UNIVERSAL": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-PLAN-ACTUAL": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-028-KGAIT": {
    "lower": 0.03,
    "initial": 0.08,
    "upper": 0.12,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  }
});
const SOURCE_CURVES = Object.freeze({
  "BA-DISP-019": {
    "speed": [
      [
        2.78,
        1.0
      ],
      [
        3.0,
        0.942821
      ],
      [
        3.33,
        0.885642
      ],
      [
        4.0,
        0.797967
      ],
      [
        5.0,
        0.701398
      ]
    ],
    "grade": [
      [
        -6.0,
        1.222363
      ],
      [
        -3.0,
        1.080051
      ],
      [
        0.0,
        1.0
      ],
      [
        3.0,
        0.931385
      ],
      [
        6.0,
        0.893266
      ]
    ],
    "cadence": [
      [
        -10.0,
        0.995696
      ],
      [
        0.0,
        1.0
      ],
      [
        10.0,
        0.974175
      ]
    ]
  },
  "BA-DISP-021": {
    "speed": [
      [
        2.78,
        1.0
      ],
      [
        3.0,
        0.935608
      ],
      [
        3.33,
        0.849243
      ],
      [
        4.0,
        0.753542
      ],
      [
        5.0,
        0.627978
      ]
    ],
    "grade": [
      [
        -6.0,
        1.068496
      ],
      [
        -3.0,
        0.998149
      ],
      [
        0.0,
        1.0
      ],
      [
        3.0,
        1.010383
      ],
      [
        6.0,
        1.060126
      ]
    ],
    "cadence": [
      [
        -10.0,
        1.003412
      ],
      [
        0.0,
        1.0
      ],
      [
        10.0,
        0.99166
      ]
    ]
  },
  "BA-DISP-025": {
    "speed": [
      [
        2.78,
        1.0
      ],
      [
        3.0,
        0.940774
      ],
      [
        3.33,
        0.851936
      ],
      [
        4.0,
        0.740319
      ],
      [
        5.0,
        0.605923
      ]
    ],
    "grade": [
      [
        -6.0,
        0.738041
      ],
      [
        -3.0,
        0.835991
      ],
      [
        0.0,
        1.0
      ],
      [
        3.0,
        1.175399
      ],
      [
        6.0,
        1.3918
      ]
    ],
    "cadence": [
      [
        -10.0,
        1.064171
      ],
      [
        0.0,
        1.0
      ],
      [
        10.0,
        0.989305
      ]
    ]
  }
});
const SURFACE_CURVES = Object.freeze({
  "BA-DISP-027": {
    "Asphalt": 1.0,
    "Concrete": 1.009648,
    "Grass": 0.950314,
    "Rubber": 0.990835
  },
  "BA-DISP-029": {
    "Asphalt": 1.0,
    "Concrete": 0.965302,
    "Grass": 0.942822,
    "Rubber": 0.963348
  }
});
// RCM-SRC-003 / Abdul Yamin et al. 2021, Table 3. Peak MLA angle under
// heeled-shoe conditions, normalized to Concrete. This is an exact categorical
// endpoint route, not a generic surface-hardness coefficient.
const ARCH_SURFACE_CURVES = Object.freeze({
  "Concrete": 1.0,
  "Rubber": 0.971639866599
});
const PFA_CURVE = Object.freeze({
  "RFS": 1.0,
  "MFS": 1.214516,
  "FFS": 1.445161
});
// BAT-SRC-009: GM is gastrocnemius medialis; MG is gluteus major.
// These exact protocol curves must not be generalized beyond 4.17 m/s and 0/2/7% treadmill grades.
const GASTRO_GRADE_CURVE = Object.freeze([[0, 1.0], [2, 1.0009], [7, 0.9584]]);
const GLUTE_GRADE_CURVE = Object.freeze([[0, 1.0], [2, 1.4142], [7, 1.8327]]);

// BAT-SRC-019 descriptive group-mean grade×speed data. Ratios are normalized
// to the source level condition and are retained for provenance/reproduction
// for source reproduction only. The published speeds are group means from participant-specific
// speed prescriptions, not common protocol targets or individual eligibility
// tolerances. The app cannot reconstruct the source participant-specific 10-km
// performance prescription, so this profile is not numeric-runtime eligible.
const GRADE_SPEED_PROFILE = Object.freeze({
  gradePercent: [-15, -10, -5, 0, 5, 10, 15],
  speedMps: [3.75, 3.583333333333, 3.416666666667, 3.055555555556, 2.277777777778, 1.805555555556, 1.5],
  "BA-DISP-015": {
    gmax: [1.059829059829, 1.135042735043, 0.958974358974, 1, 1.117948717949, 1.217094017094, 1.107692307692],
    gmed: [1.042990654206, 1.153271028037, 1.108411214953, 1, 1.020560747664, 1.03738317757, 1.166355140187]
  },
  "BA-DISP-016": [1.128623188406, 1.164855072464, 1.123188405797, 1, 1.179347826087, 1.101449275362, 1.184782608696],
  "BA-DISP-018": [1.047451669596, 1.137082601054, 1.082601054482, 1, 1.186291739895, 1.138840070299, 1.186291739895],
  "BA-DISP-023": [1.261728395062, 1.093827160494, 1.00987654321, 1, 1.259259259259, 1.333333333333, 1.234567901235]
});

// BAT-SRC-027 source-reported uneven/even endpoint ratios at the study's
// single artificial uneven-treadmill condition (2.3 m/s; height variation up
// to about 2.5 cm). These values are retained for source provenance only. The app's
// ordinal unevennessLevel 1-5 scale is NOT a source scale, and these endpoints
// are not numeric-runtime eligible without an exact representation of the
// source apparatus/protocol.
const UNEVENNESS_UPPER_BOUND_CURVES = Object.freeze({
  "BA-DISP-016": 1.07,
  "BA-DISP-018": 1.19,
  "BA-DISP-024": 0.80
});
const SURFACE_PRESETS = Object.freeze({
  "paved": {
    "key": "paved",
    "label": "舗装路",
    "materialLabel": "PAVED",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 5,
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 2,
    "stabilityLevel": 5,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "ASPHALT_REFERENCE_ZERO_ONLY",
    "numericRouteDefault": "REFERENCE_ZERO_ONLY",
    "confidence": "MODERATE"
  },
  "track": {
    "key": "track",
    "label": "陸上トラック",
    "materialLabel": "TRACK_RUBBER",
    "runSetting": "TRACK",
    "hardnessLevel": 3,
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 5,
    "stabilityLevel": 5,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "RUBBER",
    "numericRouteDefault": "SOURCE_GATED_CURRENT",
    "confidence": "MODERATE"
  },
  "treadmill": {
    "key": "treadmill",
    "label": "トレッドミル",
    "materialLabel": "TREADMILL_BELT",
    "runSetting": "TREADMILL",
    "hardnessLevel": 3,
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 4,
    "stabilityLevel": 5,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "ROUTING_ONLY",
    "confidence": "MODERATE"
  },
  "soil": {
    "key": "soil",
    "label": "締まった土道",
    "materialLabel": "COMPACTED_SOIL",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 3,
    "unevennessLevel": 2,
    "gripLevel": 3,
    "sinkLevel": 2,
    "reboundLevel": 2,
    "stabilityLevel": 3,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "TRACE_AND_COVERAGE_ONLY",
    "confidence": "LOW_TO_MODERATE"
  },
  "trail": {
    "key": "trail",
    "label": "不整地トレイル",
    "materialLabel": "TRAIL_UNEVEN",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": "UNKNOWN",
    "unevennessLevel": 5,
    "gripLevel": "UNKNOWN",
    "sinkLevel": "UNKNOWN",
    "reboundLevel": 1,
    "stabilityLevel": 2,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "NO_GENERIC_NUMERIC_ROUTE",
    "confidence": "LOW"
  },
  "natural_grass": {
    "key": "natural_grass",
    "label": "芝生",
    "materialLabel": "NATURAL_GRASS",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 2,
    "unevennessLevel": 2,
    "gripLevel": 3,
    "sinkLevel": 3,
    "reboundLevel": 2,
    "stabilityLevel": 3,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "GRASS",
    "numericRouteDefault": "SOURCE_GATED_CURRENT",
    "confidence": "MODERATE"
  },
  "artificial_turf": {
    "key": "artificial_turf",
    "label": "人工芝",
    "materialLabel": "ARTIFICIAL_TURF",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": "UNKNOWN",
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 4,
    "stabilityLevel": 4,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "TRACE_AND_COVERAGE_ONLY",
    "confidence": "LOW_TO_MODERATE"
  },
  "sand": {
    "key": "sand",
    "label": "砂地",
    "materialLabel": "SAND",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 1,
    "unevennessLevel": 3,
    "gripLevel": 2,
    "sinkLevel": 5,
    "reboundLevel": 1,
    "stabilityLevel": 1,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "NO_GENERIC_NUMERIC_ROUTE",
    "confidence": "MODERATE_FOR_DIRECTIONAL_PROPERTIES"
  }
});
const ORACLE_EXPECTED = Object.freeze({
  "P9-REF-5KM": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-EXPOSURE-10KM": {
    "BA-DISP-014": 141.421356,
    "BA-DISP-015": 141.421356,
    "BA-DISP-016": 141.421356,
    "BA-DISP-018": 141.421356,
    "BA-DISP-019": 141.421356,
    "BA-DISP-021": 141.421356,
    "BA-DISP-023": 141.421356,
    "BA-DISP-024": 141.421356,
    "BA-DISP-025": 141.421356,
    "BA-DISP-027": 141.421356,
    "BA-DISP-028": 141.421356,
    "BA-DISP-029": 141.421356
  },
  "P9-EXPOSURE-2P5KM": {
    "BA-DISP-014": 70.710678,
    "BA-DISP-015": 70.710678,
    "BA-DISP-016": 70.710678,
    "BA-DISP-018": 70.710678,
    "BA-DISP-019": 70.710678,
    "BA-DISP-021": 70.710678,
    "BA-DISP-023": 70.710678,
    "BA-DISP-024": 70.710678,
    "BA-DISP-025": 70.710678,
    "BA-DISP-027": 70.710678,
    "BA-DISP-028": 70.710678,
    "BA-DISP-029": 70.710678
  },
  "P9-UPHILL-6": {
    "BA-DISP-014": 111.802,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 106.064,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 89.327,
    "BA-DISP-021": 106.013,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 139.18,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-DOWNHILL-6": {
    "BA-DISP-014": 109.014,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 122.236,
    "BA-DISP-021": 106.85,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 73.804,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-SPEED-5MS": {
    "BA-DISP-014": 108.898,
    "BA-DISP-015": 112.962,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 70.14,
    "BA-DISP-021": 62.798,
    "BA-DISP-023": 117.783,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 60.592,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 110.437,
    "BA-DISP-029": 100.0
  },
  "P9-CADENCE-PLUS10": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 97.418,
    "BA-DISP-021": 99.166,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 98.93,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-UNEVEN-EXACT": {
    "BA-DISP-014": 98.102,
    "BA-DISP-015": 97.173,
    "BA-DISP-016": 107.0,
    "BA-DISP-018": 119.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 95.817,
    "BA-DISP-024": 80.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 97.554,
    "BA-DISP-029": 100.0
  },
  "P9-GRASS-EXACT": {
    "BA-DISP-014": 102.232,
    "BA-DISP-015": 103.356,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 105.031,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 95.031,
    "BA-DISP-028": 102.889,
    "BA-DISP-029": 94.282
  },
  "P9-CALF-UP2": {
    "BA-DISP-014": 109.549,
    "BA-DISP-015": 108.376,
    "BA-DISP-016": 102.016,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 119.881,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 107.022,
    "BA-DISP-029": 100.0
  },
  "P9-CALF-UP7": {
    "BA-DISP-014": 117.765,
    "BA-DISP-015": 108.376,
    "BA-DISP-016": 107.061,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 127.907,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 107.022,
    "BA-DISP-029": 100.0
  },
  "P9-ARCH-FFS": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 105.679,
    "BA-DISP-029": 100.0
  },
  "P9-ARCH-WALK": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 92.311635,
    "BA-DISP-029": 100.0
  },
  "P9-MIX-UPDOWN-50": {
    "BA-DISP-014": 110.399199,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 102.987378,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 104.4939,
    "BA-DISP-021": 106.430677,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 101.351077,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-MIX-GRASS-50": {
    "BA-DISP-014": 101.109841,
    "BA-DISP-015": 101.664153,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 102.484633,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 97.483845,
    "BA-DISP-028": 101.434215,
    "BA-DISP-029": 97.098919
  },
  "P9-NOLEAK-PLAN": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-NOLEAK-BODYMASS": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-NOLEAK-SURFACE-ORDINAL": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-SEGMENT-EQUIVALENCE": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-MISSING-EXPOSURE": {
    "BA-DISP-014": null,
    "BA-DISP-015": null,
    "BA-DISP-016": null,
    "BA-DISP-018": null,
    "BA-DISP-019": null,
    "BA-DISP-021": null,
    "BA-DISP-023": null,
    "BA-DISP-024": null,
    "BA-DISP-025": null,
    "BA-DISP-027": null,
    "BA-DISP-028": null,
    "BA-DISP-029": null
  },
  "P9-UNKNOWN-SURFACE": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": null,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": null
  },
  "P9-OOR-SPEED-6MS": {
    "BA-DISP-014": null,
    "BA-DISP-015": null,
    "BA-DISP-016": null,
    "BA-DISP-018": null,
    "BA-DISP-019": null,
    "BA-DISP-021": null,
    "BA-DISP-023": null,
    "BA-DISP-024": null,
    "BA-DISP-025": null,
    "BA-DISP-027": null,
    "BA-DISP-028": null,
    "BA-DISP-029": null
  }
});
const ORACLE_STATUS = Object.freeze({
  "P9-REF-5KM": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-EXPOSURE-10KM": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-EXPOSURE-2P5KM": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-UPHILL-6": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-DOWNHILL-6": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-SPEED-5MS": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-CADENCE-PLUS10": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-UNEVEN-EXACT": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-GRASS-EXACT": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-CALF-UP2": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-CALF-UP7": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-ARCH-FFS": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-ARCH-WALK": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-MIX-UPDOWN-50": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-MIX-GRASS-50": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-NOLEAK-PLAN": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-NOLEAK-BODYMASS": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-NOLEAK-SURFACE-ORDINAL": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-SEGMENT-EQUIVALENCE": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-MISSING-EXPOSURE": {
    "BA-DISP-014": "NOT_CALCULABLE",
    "BA-DISP-015": "NOT_CALCULABLE",
    "BA-DISP-016": "NOT_CALCULABLE",
    "BA-DISP-018": "NOT_CALCULABLE",
    "BA-DISP-019": "NOT_CALCULABLE",
    "BA-DISP-021": "NOT_CALCULABLE",
    "BA-DISP-023": "NOT_CALCULABLE",
    "BA-DISP-024": "NOT_CALCULABLE",
    "BA-DISP-025": "NOT_CALCULABLE",
    "BA-DISP-027": "NOT_CALCULABLE",
    "BA-DISP-028": "NOT_CALCULABLE",
    "BA-DISP-029": "NOT_CALCULABLE"
  },
  "P9-UNKNOWN-SURFACE": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "PARTIALLY_CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "PARTIALLY_CALCULATED"
  },
  "P9-OOR-SPEED-6MS": {
    "BA-DISP-014": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-015": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-016": "PARTIALLY_CALCULATED",
    "BA-DISP-018": "PARTIALLY_CALCULATED",
    "BA-DISP-019": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-021": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-023": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-024": "PARTIALLY_CALCULATED",
    "BA-DISP-025": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-027": "PARTIALLY_CALCULATED",
    "BA-DISP-028": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-029": "PARTIALLY_CALCULATED"
  }
});
moduleExports["AUTHORITY_VERSION"] = AUTHORITY_VERSION;
moduleExports["PARAMETER_SET_VERSION"] = PARAMETER_SET_VERSION;
moduleExports["ADAPTER_VERSION"] = ADAPTER_VERSION;
moduleExports["REGIONS"] = REGIONS;
moduleExports["FORMAL_INPUT_CATALOG"] = FORMAL_INPUT_CATALOG;
moduleExports["PARAMETERS"] = PARAMETERS;
moduleExports["PARAMETER_BOUNDS"] = PARAMETER_BOUNDS;
moduleExports["SOURCE_CURVES"] = SOURCE_CURVES;
moduleExports["SURFACE_CURVES"] = SURFACE_CURVES;
moduleExports["ARCH_SURFACE_CURVES"] = ARCH_SURFACE_CURVES;
moduleExports["PFA_CURVE"] = PFA_CURVE;
moduleExports["GASTRO_GRADE_CURVE"] = GASTRO_GRADE_CURVE;
moduleExports["GLUTE_GRADE_CURVE"] = GLUTE_GRADE_CURVE;
moduleExports["GRADE_SPEED_PROFILE"] = GRADE_SPEED_PROFILE;
moduleExports["UNEVENNESS_UPPER_BOUND_CURVES"] = UNEVENNESS_UPPER_BOUND_CURVES;
moduleExports["SURFACE_PRESETS"] = SURFACE_PRESETS;
moduleExports["ORACLE_EXPECTED"] = ORACLE_EXPECTED;
moduleExports["ORACLE_STATUS"] = ORACLE_STATUS;
internalModules.formalInputCatalog = moduleExports;
}

// ===== core/model/currentPrimaryInput/utilities.js =====
{
const moduleExports = Object.create(null);
const EPS = 1e-12;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function nearlyEqual(a, b, tolerance = 1e-9) {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
}

function logInterpolate(points, x) {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  if (!Number.isFinite(x) || x < sorted[0][0] - EPS || x > sorted.at(-1)[0] + EPS) {
    const error = new RangeError("OUT_OF_SOURCE_DOMAIN");
    error.code = "OUT_OF_SOURCE_DOMAIN";
    throw error;
  }
  for (const [px, py] of sorted) {
    if (Math.abs(px - x) <= EPS) return py;
  }
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const [x0, y0] = sorted[i];
    const [x1, y1] = sorted[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return Math.exp(Math.log(y0) + (Math.log(y1) - Math.log(y0)) * t);
    }
  }
  throw new Error("Interpolation invariant failed");
}

function boundedFactor(raw, bound) {
  if (!(bound > 0)) return 1;
  return Math.exp(bound * Math.tanh(raw / bound));
}

function geometricMeanRatio(weightedRatios) {
  const totalWeight = weightedRatios.reduce((sum, item) => sum + item.weight, 0);
  if (!(totalWeight > 0)) throw new Error("No positive integration weight");
  return Math.exp(weightedRatios.reduce((sum, item) => {
    if (!(item.ratio > 0)) throw new Error("Condition ratio must be positive");
    return sum + (item.weight / totalWeight) * Math.log(item.ratio);
  }, 0));
}

function gradePercentToDegrees(percent) {
  return Math.atan(percent / 100) * 180 / Math.PI;
}

function gradeDegreesToPercent(degrees) {
  return Math.tan(degrees * Math.PI / 180) * 100;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function worstCalculationState(states) {
  const order = ["CALCULATED", "PARTIAL", "OUT_OF_SUPPORTED_RANGE", "NOT_CALCULABLE", "NOT_APPLICABLE"];
  return states.reduce((worst, state) => order.indexOf(state) > order.indexOf(worst) ? state : worst, "CALCULATED");
}

function mergeState(a, b) {
  return worstCalculationState([a, b]);
}

function success(value, warnings = []) { return { ok: true, value, warnings }; }
function failure(code, messageKey, path = "", details = {}) {
  return { ok: false, error: { code, messageKey, path, details } };
}
moduleExports["EPS"] = EPS;
moduleExports["clamp"] = clamp;
moduleExports["nearlyEqual"] = nearlyEqual;
moduleExports["logInterpolate"] = logInterpolate;
moduleExports["boundedFactor"] = boundedFactor;
moduleExports["geometricMeanRatio"] = geometricMeanRatio;
moduleExports["gradePercentToDegrees"] = gradePercentToDegrees;
moduleExports["gradeDegreesToPercent"] = gradeDegreesToPercent;
moduleExports["stableStringify"] = stableStringify;
moduleExports["worstCalculationState"] = worstCalculationState;
moduleExports["mergeState"] = mergeState;
moduleExports["success"] = success;
moduleExports["failure"] = failure;
internalModules.formalInputUtilities = moduleExports;
}

// ===== core/model/currentPrimaryInput/canonicalHash.js =====
{
const moduleExports = Object.create(null);
const { stableStringify } = internalModules.formalInputUtilities;

function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }

function digestText(text) {
  const bytes = new TextEncoder().encode(text);
  const bitLength = bytes.length * 8;
  const withOne = bytes.length + 1;
  const paddedLength = Math.ceil((withOne + 8) / 64) * 64;
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  view.setUint32(paddedLength - 8, high, false);
  view.setUint32(paddedLength - 4, low, false);

  const k = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  let h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const w = new Uint32Array(64);
  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rightRotate(w[i-15],7) ^ rightRotate(w[i-15],18) ^ (w[i-15] >>> 3);
      const s1 = rightRotate(w[i-2],17) ^ rightRotate(w[i-2],19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rightRotate(e,6) ^ rightRotate(e,11) ^ rightRotate(e,25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + s1 + ch + k[i] + w[i]) >>> 0;
      const s0 = rightRotate(a,2) ^ rightRotate(a,13) ^ rightRotate(a,22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      hh=g; g=f; f=e; e=(d+temp1)>>>0; d=c; c=b; b=a; a=(temp1+temp2)>>>0;
    }
    h = [(h[0]+a)>>>0,(h[1]+b)>>>0,(h[2]+c)>>>0,(h[3]+d)>>>0,(h[4]+e)>>>0,(h[5]+f)>>>0,(h[6]+g)>>>0,(h[7]+hh)>>>0];
  }
  return h.map(v => v.toString(16).padStart(8,"0")).join("");
}

function canonicalFingerprint(value) { return digestText(stableStringify(value)); }
moduleExports["canonicalFingerprint"] = canonicalFingerprint;
internalModules.canonicalInputDigest = moduleExports;
}

// ===== core/model/currentPrimaryInput/surfacePresets.js =====
{
const moduleExports = Object.create(null);
const { SURFACE_PRESETS } = internalModules.formalInputCatalog;
const { failure, success } = internalModules.formalInputUtilities;

function normalizeExactCategory(preset, subtype) {
  if (preset.key === "paved" && subtype === "asphalt") return "Asphalt";
  if (preset.key === "paved" && subtype === "concrete") return "Concrete";
  if (preset.key === "track" && (subtype == null || subtype === "rubber")) return "Rubber";
  if (preset.key === "natural_grass" && (subtype == null || subtype === "grass")) return "Grass";
  return null;
}

function resolveSurfaceSelections(selections) {
  if (!Array.isArray(selections) || selections.length === 0) {
    return success({ knowledge: "UNKNOWN", components: [], dominant: null }, [{
      code: "UNKNOWN_NOT_IMPUTED", messageKey: "surface.unknown_not_asphalt", path: "course.surfaceSelections", details: {}
    }]);
  }
  const normalized = selections.map((item, index) => {
    const preset = SURFACE_PRESETS[item.presetKey];
    if (!preset) throw Object.assign(new Error(`Unknown surface preset: ${item.presetKey}`), { code: "SCHEMA_INVALID", path: `course.surfaceSelections[${index}].presetKey` });
    const share = item.sharePercent ?? (selections.length === 1 ? 100 : null);
    if (!(share >= 0 && share <= 100)) throw Object.assign(new Error("Invalid surface share"), { code: "SECTION_SHARE_INVALID", path: `course.surfaceSelections[${index}].sharePercent` });
    const overrides = item.propertyOverrides ?? {};
    const profile = {
      hardnessLevel: overrides.hardnessLevel ?? preset.hardnessLevel,
      unevennessLevel: overrides.unevennessLevel ?? preset.unevennessLevel,
      gripLevel: overrides.gripLevel ?? preset.gripLevel,
      sinkLevel: overrides.sinkLevel ?? preset.sinkLevel,
      reboundLevel: overrides.reboundLevel ?? preset.reboundLevel,
      stabilityLevel: overrides.stabilityLevel ?? preset.stabilityLevel,
      wetSlipState: item.wetSlipState ?? preset.wetSlipDefault,
    };
    const exactCategory = normalizeExactCategory(preset, item.subtype);
    const exactEvidence = exactCategory
      ? item.subtype
        ? "EXPLICIT_SUBTYPE"
        : "MATERIAL_SPECIFIC_PRESET"
      : null;
    return {
      componentId: `surface-${index + 1}`, sharePercent: share, presetKey: preset.key,
      materialLabel: preset.materialLabel, runSetting: preset.runSetting,
      propertyProfile: profile, propertyOrigin: Object.keys(overrides).length ? "USER_OVERRIDE" : "PRESET",
      exactSourceCategory: exactCategory,
      exactSourceEvidence: exactEvidence,
      numericRouteDefault: preset.numericRouteDefault,
      confidence: preset.confidence,
    };
  });
  const sum = normalized.reduce((a, b) => a + b.sharePercent, 0);
  if (Math.abs(sum - 100) > 0.01) return failure("SECTION_SHARE_INVALID", "surface.share_sum_must_be_100", "course.surfaceSelections", { sum });
  const dominant = [...normalized].sort((a,b)=>b.sharePercent-a.sharePercent)[0];
  return success({ knowledge: normalized.length === 1 ? "DOMINANT_ONLY" : "MIXTURE_KNOWN", components: normalized, dominant });
}

function isStandardShoeCandidate(shoeType, softness) {
  return shoeType === "TRAINING" && softness === "NORMAL";
}
moduleExports["resolveSurfaceSelections"] = resolveSurfaceSelections;
moduleExports["isStandardShoeCandidate"] = isStandardShoeCandidate;
internalModules.surfacePresets = moduleExports;
}

// ===== core/model/currentPrimaryInput/formalInputValidation.js =====
{
const moduleExports = Object.create(null);
const { FORMAL_INPUT_CATALOG, REGIONS } = internalModules.formalInputCatalog;
const { canonicalFingerprint } = internalModules.canonicalInputDigest;

const REGION_IDS = REGIONS.map((region) => region.id);
const REGION_ID_SET = new Set(REGION_IDS);
const STATUS_VALUES = new Set([
  "KNOWN",
  "UNKNOWN",
  "NOT_RECORDED",
  "NOT_SET",
  "NOT_APPLICABLE",
  "PARTIAL",
]);
const EMPTY_STATUSES = new Set(["UNKNOWN", "NOT_RECORDED", "NOT_SET", "NOT_APPLICABLE"]);
const SECTION_BASES = new Set(["DISTANCE", "TIME", "STEPS", "CONTACTS"]);
const GRADE_DIRECTIONS = new Set(["FLAT", "UPHILL", "DOWNHILL", "UNKNOWN"]);
const TIMINGS = new Set(["PRE_RUN", "DURING_RUN", "IMMEDIATE_POST", "LATER", "UNKNOWN"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function issue(code, path, details = {}) {
  return { code, messageKey: `validation.${code.toLowerCase()}`, path, details };
}

function requireFinite(issues, value, path, { min = -Infinity, max = Infinity, integer = false, nullable = true } = {}) {
  if (value == null && nullable) return;
  if (!finiteNumber(value)) {
    issues.push(issue("NUMBER_REQUIRED", path, { value }));
    return;
  }
  if (integer && !Number.isInteger(value)) issues.push(issue("INTEGER_REQUIRED", path, { value }));
  if (value < min || value > max) issues.push(issue("NUMBER_OUT_OF_RANGE", path, { value, min, max }));
}

function validateSection(section, index, issues, { allowDerivedSurface = false } = {}) {
  const path = `course.sections[${index}]`;
  if (!isObject(section)) {
    issues.push(issue("SECTION_OBJECT_REQUIRED", path));
    return;
  }
  if (!SECTION_BASES.has(section.shareBasis)) {
    issues.push(issue("SECTION_BASIS_INVALID", `${path}.shareBasis`, { value: section.shareBasis }));
  }
  requireFinite(issues, section.shareValue, `${path}.shareValue`, { min: Number.MIN_VALUE, nullable: false });
  requireFinite(issues, section.distanceKm, `${path}.distanceKm`, { min: Number.MIN_VALUE });
  requireFinite(issues, section.durationMinutes, `${path}.durationMinutes`, { min: Number.MIN_VALUE });
  requireFinite(issues, section.steps, `${path}.steps`, { min: 0, integer: true });
  requireFinite(issues, section.speedMps, `${path}.speedMps`, { min: Number.MIN_VALUE });
  requireFinite(issues, section.cadenceSpm, `${path}.cadenceSpm`, { min: Number.MIN_VALUE });
  requireFinite(issues, section.gradePercent, `${path}.gradePercent`, { min: 0 });
  if (!GRADE_DIRECTIONS.has(section.gradeDirection)) {
    issues.push(issue("GRADE_DIRECTION_INVALID", `${path}.gradeDirection`, { value: section.gradeDirection }));
  }
  if (section.gradeDirection === "FLAT" && section.gradePercent != null && section.gradePercent !== 0) {
    issues.push(issue("GRADE_DIRECTION_MAGNITUDE_CONFLICT", `${path}.gradePercent`, {
      gradeDirection: section.gradeDirection,
      gradePercent: section.gradePercent,
    }));
  }
  if (["UPHILL", "DOWNHILL"].includes(section.gradeDirection) && !(section.gradePercent > 0)) {
    issues.push(issue("GRADE_DIRECTION_MAGNITUDE_CONFLICT", `${path}.gradePercent`, {
      gradeDirection: section.gradeDirection,
      gradePercent: section.gradePercent,
    }));
  }
  if (section.gradeDirection === "UNKNOWN" && section.gradePercent != null) {
    issues.push(issue("GRADE_DIRECTION_MAGNITUDE_CONFLICT", `${path}.gradePercent`, {
      gradeDirection: section.gradeDirection,
      gradePercent: section.gradePercent,
    }));
  }
  if (Object.hasOwn(section, "protocolTags")) {
    issues.push(issue("UNTRUSTED_PROTOCOL_TAG_FORBIDDEN", `${path}.protocolTags`));
  }
  if (!allowDerivedSurface && Object.hasOwn(section, "surfaceComponents")) {
    issues.push(issue("UNTRUSTED_DERIVED_SURFACE_FORBIDDEN", `${path}.surfaceComponents`));
  }
}

function validatePrototypeRecordInput(input) {
  const issues = [];
  if (!isObject(input)) return [issue("OBJECT_REQUIRED", "")];
  if (!["run", "rest"].includes(input.activityType)) {
    issues.push(issue("ACTIVITY_TYPE_INVALID", "activityType", { value: input.activityType }));
  }
  if (typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    issues.push(issue("DATE_INVALID", "date", { value: input.date }));
  }
  if (input.activityType === "run") {
    requireFinite(issues, input.distanceKm, "distanceKm", { min: Number.MIN_VALUE, nullable: false });
    requireFinite(issues, input.durationMinutes, "durationMinutes", { min: Number.MIN_VALUE, nullable: false });
  } else if (input.activityType === "rest") {
    for (const field of ["distanceKm", "durationMinutes", "steps"]) {
      if (input[field] != null) issues.push(issue("REST_RUNNING_VALUE_FORBIDDEN", field, { value: input[field] }));
    }
  }
  requireFinite(issues, input.steps, "steps", { min: 0, integer: true });
  requireFinite(issues, input.rpe, "rpe", { min: 0, max: 10 });

  const course = input.course;
  if (course != null && !isObject(course)) {
    issues.push(issue("COURSE_OBJECT_REQUIRED", "course"));
  } else if (course) {
    for (const field of ["uphillSharePercent", "downhillSharePercent"]) {
      requireFinite(issues, course[field], `course.${field}`, { min: 0, max: 100 });
    }
    const up = course.uphillSharePercent ?? 0;
    const down = course.downhillSharePercent ?? 0;
    if (finiteNumber(up) && finiteNumber(down) && up + down > 100 + 1e-9) {
      issues.push(issue("GRADE_SHARE_SUM_INVALID", "course", { uphill: up, downhill: down }));
    }
    for (const field of ["uphillGradePercent", "downhillGradePercent"]) {
      requireFinite(issues, course[field], `course.${field}`, { min: Number.MIN_VALUE });
    }
    if (Array.isArray(course.surfaceSelections)) {
      let surfaceShare = 0;
      course.surfaceSelections.forEach((selection, index) => {
        const path = `course.surfaceSelections[${index}]`;
        if (!isObject(selection)) {
          issues.push(issue("SURFACE_SELECTION_OBJECT_REQUIRED", path));
          return;
        }
        requireFinite(issues, selection.sharePercent, `${path}.sharePercent`, { min: 0, max: 100, nullable: false });
        if (finiteNumber(selection.sharePercent)) surfaceShare += selection.sharePercent;
        if (selection.propertyOverrides != null && !isObject(selection.propertyOverrides)) {
          issues.push(issue("SURFACE_OVERRIDE_OBJECT_REQUIRED", `${path}.propertyOverrides`));
        } else {
          for (const field of ["hardnessLevel", "unevennessLevel", "gripLevel", "sinkLevel", "reboundLevel", "stabilityLevel"]) {
            requireFinite(issues, selection.propertyOverrides?.[field], `${path}.propertyOverrides.${field}`, {
              min: 1,
              max: 5,
              integer: true,
            });
          }
        }
      });
      if (course.surfaceSelections.length && Math.abs(surfaceShare - 100) > 0.01) {
        issues.push(issue("SURFACE_SHARE_SUM_INVALID", "course.surfaceSelections", { sum: surfaceShare }));
      }
    }
    if (Array.isArray(course.sections)) {
      const ids = new Set();
      const bases = new Set();
      course.sections.forEach((section, index) => {
        validateSection(section, index, issues);
        if (section?.sectionId) {
          if (ids.has(section.sectionId)) issues.push(issue("SECTION_ID_DUPLICATE", `course.sections[${index}].sectionId`, { value: section.sectionId }));
          ids.add(section.sectionId);
        }
        if (SECTION_BASES.has(section?.shareBasis)) bases.add(section.shareBasis);
      });
      if (bases.size > 1) issues.push(issue("MIXED_SECTION_BASES_FORBIDDEN", "course.sections", { bases: [...bases] }));
    }
  }

  const observations = input.bodyReview?.observations;
  if (observations != null && !Array.isArray(observations)) {
    issues.push(issue("OBSERVATIONS_ARRAY_REQUIRED", "bodyReview.observations"));
  } else {
    (observations ?? []).forEach((observation, index) => {
      const path = `bodyReview.observations[${index}]`;
      if (!isObject(observation)) {
        issues.push(issue("OBSERVATION_OBJECT_REQUIRED", path));
        return;
      }
      if (!REGION_ID_SET.has(observation.bodyAreaId)) {
        issues.push(issue("REGION_ID_INVALID", `${path}.bodyAreaId`, { value: observation.bodyAreaId }));
      }
      requireFinite(issues, observation.noticedIntensity, `${path}.noticedIntensity`, {
        min: 0,
        max: 5,
        integer: true,
        nullable: false,
      });
      if (!TIMINGS.has(observation.noticedTiming)) {
        issues.push(issue("OBSERVATION_TIMING_INVALID", `${path}.noticedTiming`, { value: observation.noticedTiming }));
      }
    });
  }
  return issues;
}

const NUMERIC_RANGES = new Map([
  ["RL-IN-011", { min: Number.MIN_VALUE }],
  ["RL-IN-013", { min: Number.MIN_VALUE }],
  ["RL-IN-015", { min: 0, integer: true }],
  ["RL-DV-019", { min: Number.MIN_VALUE }],
  ["RL-DV-020", { min: Number.MIN_VALUE }],
  ["RL-DV-021", { min: Number.MIN_VALUE }],
  ["RL-IN-033", { min: 0, max: 100 }],
  ["RL-IN-034", { min: 0, max: 100 }],
  ["RL-DV-035", { min: 0, max: 100 }],
  ["RL-IN-036", { min: Number.MIN_VALUE }],
  ["RL-IN-037", { min: Number.MIN_VALUE }],
  ["RL-IN-043", { min: 0, max: 100 }],
  ["RL-IN-044", { min: 1, max: 5, integer: true }],
  ["RL-IN-045", { min: 1, max: 5, integer: true }],
  ["RL-IN-046", { min: 1, max: 5, integer: true }],
  ["RL-IN-047", { min: 1, max: 5, integer: true }],
  ["RL-IN-048", { min: 1, max: 5, integer: true }],
  ["RL-IN-049", { min: 1, max: 5, integer: true }],
  ["RL-IN-091", { min: 0, max: 10 }],
  ["RL-IN-104", { min: 0, max: 5, integer: true }],
  ["RL-IN-113", { min: 50, max: 250 }],
  ["RL-IN-114", { min: 20, max: 300 }],
]);

function validateFormalBundleSemantics(bundle) {
  const issues = [];
  if (!isObject(bundle) || !isObject(bundle.formalInputs)) return [issue("FORMAL_BUNDLE_INVALID", "")];
  const catalogById = new Map(FORMAL_INPUT_CATALOG.map((item) => [item.id, item]));
  const actualIds = Object.keys(bundle.formalInputs);
  for (const item of FORMAL_INPUT_CATALOG) {
    if (!Object.hasOwn(bundle.formalInputs, item.id)) issues.push(issue("MISSING_FORMAL_INPUT_ENTRY", `formalInputs.${item.id}`));
  }
  for (const id of actualIds) {
    const entry = bundle.formalInputs[id];
    const catalog = catalogById.get(id);
    if (!catalog) {
      issues.push(issue("UNKNOWN_FORMAL_INPUT_ID", `formalInputs.${id}`));
      continue;
    }
    if (!isObject(entry)) {
      issues.push(issue("FORMAL_INPUT_ENTRY_INVALID", `formalInputs.${id}`));
      continue;
    }
    if (entry.inputId !== id) issues.push(issue("FORMAL_INPUT_ID_MISMATCH", `formalInputs.${id}.inputId`, { value: entry.inputId }));
    if (!STATUS_VALUES.has(entry.status)) issues.push(issue("FORMAL_INPUT_STATUS_INVALID", `formalInputs.${id}.status`, { value: entry.status }));
    if (EMPTY_STATUSES.has(entry.status) && entry.value !== null) {
      issues.push(issue("STATUS_VALUE_CONFLICT", `formalInputs.${id}.value`, { status: entry.status }));
    }
    if (entry.status === "KNOWN" && entry.value === null) {
      issues.push(issue("KNOWN_VALUE_MISSING", `formalInputs.${id}.value`));
    }
    if (entry.numericPermission !== catalog.numericPermission) {
      issues.push(issue("NUMERIC_PERMISSION_MISMATCH", `formalInputs.${id}.numericPermission`, {
        value: entry.numericPermission,
        expected: catalog.numericPermission,
      }));
    }
    const range = NUMERIC_RANGES.get(id);
    if (range && entry.status === "KNOWN") requireFinite(issues, entry.value, `formalInputs.${id}.value`, { ...range, nullable: false });
  }
  const sections = bundle.formalInputs["RL-IN-039"]?.value;
  if (bundle.formalInputs["RL-IN-039"]?.status === "KNOWN") {
    if (!Array.isArray(sections)) issues.push(issue("SECTIONS_ARRAY_REQUIRED", "formalInputs.RL-IN-039.value"));
    else {
      const bases = new Set();
      sections.forEach((section, index) => {
        validateSection(section, index, issues, { allowDerivedSurface: true });
        if (SECTION_BASES.has(section?.shareBasis)) bases.add(section.shareBasis);
      });
      if (bases.size > 1) issues.push(issue("MIXED_SECTION_BASES_FORBIDDEN", "formalInputs.RL-IN-039.value", { bases: [...bases] }));
    }
  }
  const observations = bundle.formalInputs["RL-IN-101"]?.value;
  if (bundle.formalInputs["RL-IN-101"]?.status === "KNOWN") {
    if (!Array.isArray(observations)) issues.push(issue("OBSERVATIONS_ARRAY_REQUIRED", "formalInputs.RL-IN-101.value"));
    else {
      observations.forEach((observation, index) => {
        requireFinite(issues, observation?.noticedIntensity, `formalInputs.RL-IN-101.value[${index}].noticedIntensity`, {
          min: 0,
          max: 5,
          integer: true,
          nullable: false,
        });
        if (!REGION_ID_SET.has(observation?.bodyAreaId)) {
          issues.push(issue("REGION_ID_INVALID", `formalInputs.RL-IN-101.value[${index}].bodyAreaId`, { value: observation?.bodyAreaId }));
        }
      });
    }
  }
  if (bundle.recordSnapshot?.inputSnapshotHash && bundle.recordSnapshot.inputSnapshotHash !== canonicalFingerprint(bundle.formalInputs)) {
    issues.push(issue("INPUT_SNAPSHOT_HASH_MISMATCH", "recordSnapshot.inputSnapshotHash"));
  }
  return issues;
}

function validateRegionalEngineInputSemantics(input) {
  const issues = validateFormalBundleSemantics(input);
  if (!isObject(input)) return issues;
  const formalSections = input.formalInputs?.["RL-IN-039"]?.value;
  if (Array.isArray(formalSections) && canonicalFingerprint(formalSections) !== canonicalFingerprint(input.courseSections ?? [])) {
    issues.push(issue("ENGINE_SECTION_SNAPSHOT_MISMATCH", "courseSections"));
  }
  const routeIds = new Set();
  for (const [index, route] of (input.routeEligibility ?? []).entries()) {
    if (routeIds.has(route.routeId)) issues.push(issue("ROUTE_ID_DUPLICATE", `routeEligibility[${index}].routeId`, { value: route.routeId }));
    routeIds.add(route.routeId);
  }
  return issues;
}

function approximatelyEqual(left, right, tolerance = 1e-9) {
  return finiteNumber(left) && finiteNumber(right) && Math.abs(left - right) <= tolerance;
}

function validateRegionalEngineOutput(output) {
  const issues = [];
  if (!isObject(output)) return { valid: false, issues: [issue("OUTPUT_OBJECT_REQUIRED", "")] };
  if (output.traceContractVersion !== "runload-reason-trace-1.2") {
    issues.push(issue("TRACE_CONTRACT_VERSION_INVALID", "traceContractVersion", { value: output.traceContractVersion, expected: "runload-reason-trace-1.2" }));
  }
  if (!Array.isArray(output.regions) || output.regions.length !== REGION_IDS.length) {
    issues.push(issue("REGION_SET_INVALID", "regions", { count: output.regions?.length }));
  } else {
    const ids = output.regions.map((region) => region.regionId);
    if (ids.some((id, index) => id !== REGION_IDS[index])) {
      issues.push(issue("REGION_ORDER_OR_ID_INVALID", "regions", { ids, expected: REGION_IDS }));
    }
    if (new Set(ids).size !== REGION_IDS.length) issues.push(issue("REGION_ID_DUPLICATE", "regions", { ids }));
    output.regions.forEach((region, index) => {
      const path = `regions[${index}]`;
      const numericState = ["CALCULATED", "PARTIAL"].includes(region.calculationState);
      if (numericState) {
        if (!finiteNumber(region.indexExact)) issues.push(issue("NUMERIC_STATE_INDEX_REQUIRED", `${path}.indexExact`));
        if (!approximatelyEqual(region.deltaFromReferenceExact, region.indexExact - 100)) {
          issues.push(issue("DELTA_ARITHMETIC_MISMATCH", `${path}.deltaFromReferenceExact`));
        }
        if (region.displayIndex !== Math.round(region.indexExact)) issues.push(issue("DISPLAY_INDEX_MISMATCH", `${path}.displayIndex`));
        if (region.displayDeltaPoints !== Math.round(region.indexExact - 100)) issues.push(issue("DISPLAY_DELTA_MISMATCH", `${path}.displayDeltaPoints`));
        if (!approximatelyEqual(region.components?.selfReportedStateLog, 0)) {
          issues.push(issue("SELF_REPORT_NUMERIC_LEAKAGE", `${path}.components.selfReportedStateLog`));
        }
        if (!approximatelyEqual(region.components?.selfReportedStateMultiplier, 1)) {
          issues.push(issue("SELF_REPORT_MULTIPLIER_NOT_NEUTRAL", `${path}.components.selfReportedStateMultiplier`));
        }
        if (!approximatelyEqual(region.indexExact, region.components?.mechanicalIndexWithoutSelfState)) {
          issues.push(issue("CANONICAL_INDEX_OBSERVATION_OVERLAY_MISMATCH", `${path}.indexExact`));
        }
      } else {
        for (const field of ["indexExact", "deltaFromReferenceExact", "displayIndex", "displayDeltaPoints"]) {
          if (region[field] !== null) issues.push(issue("NON_NUMERIC_STATE_VALUE_FORBIDDEN", `${path}.${field}`, { state: region.calculationState }));
        }
      }
      if (!isObject(region.componentCoverage) || !Array.isArray(region.componentCoverage.sections)) {
        issues.push(issue("COMPONENT_COVERAGE_REQUIRED", `${path}.componentCoverage`));
      } else {
        const expectedCoverageState = region.componentCoverage.sections.some((section) => section.state === "PARTIAL")
          ? "PARTIAL"
          : region.componentCoverage.sections.length
            ? "FULL"
            : "NONE";
        if (region.componentCoverage.state !== expectedCoverageState) {
          issues.push(issue("COMPONENT_COVERAGE_STATE_MISMATCH", `${path}.componentCoverage.state`, {
            value: region.componentCoverage.state,
            expected: expectedCoverageState,
          }));
        }
        region.componentCoverage.sections.forEach((section, sectionIndex) => {
          const weights = Object.values(section.normalizedWeights ?? {});
          if (weights.length && Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 1) > 1e-9) {
            issues.push(issue("COMPONENT_WEIGHT_RENORMALIZATION_INVALID", `${path}.componentCoverage.sections[${sectionIndex}].normalizedWeights`));
          }
          const declaredFractions = Object.values(section.declaredShareFractions ?? {});
          const representedFraction = section.representedShareFraction;
          if (declaredFractions.length) {
            const declaredSum = declaredFractions.reduce((sum, weight) => sum + weight, 0);
            if (!(declaredSum > 0 && declaredSum <= 1 + 1e-9)) {
              issues.push(issue("DECLARED_COMPONENT_SHARE_INVALID", `${path}.componentCoverage.sections[${sectionIndex}].declaredShareFractions`));
            }
            if (!finiteNumber(representedFraction) || !approximatelyEqual(declaredSum, representedFraction, 1e-9)) {
              issues.push(issue("REPRESENTED_COMPONENT_SHARE_MISMATCH", `${path}.componentCoverage.sections[${sectionIndex}].representedShareFraction`, {value:representedFraction,expected:declaredSum}));
            }
            if (section.state === "PARTIAL" && !(representedFraction < 1 - 1e-9)) {
              issues.push(issue("PARTIAL_COMPONENT_SHARE_NOT_PARTIAL", `${path}.componentCoverage.sections[${sectionIndex}].representedShareFraction`));
            }
          }
        });
      }
      if (!isObject(region.observationOverlay)) {
        issues.push(issue("OBSERVATION_OVERLAY_REQUIRED", `${path}.observationOverlay`));
      }
      if (output.traceContractVersion === "runload-reason-trace-1.2" && numericState) {
        const numericEvents=(region.reasonTrace??[]).filter(event=>event.numericEffectApplied===true);
        if (numericEvents.some(event=>!finiteNumber(event.contributionLog))) {
          issues.push(issue("TRACE_NUMERIC_CONTRIBUTION_NONFINITE", `${path}.reasonTrace`));
        }
        const contributionSum=numericEvents.reduce((sum,event)=>sum+event.contributionLog,0);
        if (!approximatelyEqual(contributionSum, region.components?.totalLog, 1e-12)) {
          issues.push(issue("TRACE_CONTRIBUTION_SUM_MISMATCH", `${path}.reasonTrace`, {value:contributionSum,expected:region.components?.totalLog}));
        }
        const conditionEvents=numericEvents.filter(event=>event.traceCode==="SECTION_CONDITION_CONTRIBUTION");
        const exposureEvents=numericEvents.filter(event=>event.traceCode==="EXPOSURE_CONTRIBUTION");
        if (conditionEvents.length !== region.componentCoverage.sections.length || exposureEvents.length !== 1) {
          issues.push(issue("TRACE_ONE_TO_ONE_CARDINALITY_INVALID", `${path}.reasonTrace`, {conditionEvents:conditionEvents.length,sections:region.componentCoverage.sections.length,exposureEvents:exposureEvents.length}));
        }
        for (const [eventIndex,event] of numericEvents.entries()) {
          if (event.regionId!==region.regionId || !Object.hasOwn(event,"sectionId") || typeof event.routeId!=="string" || !event.routeId || !Array.isArray(event.inputIds) || !event.inputIds.length || !Array.isArray(event.sourceIds) || !Array.isArray(event.parameterIds)) {
            issues.push(issue("TRACE_PROVENANCE_INCOMPLETE", `${path}.reasonTrace[${eventIndex}]`));
          }
        }
      }
    });
  }
  const summary = output.coverageSummary ?? {};
  const count = (state) => (output.regions ?? []).filter((region) => region.calculationState === state).length;
  const expectedCounts = {
    calculatedRegionCount: count("CALCULATED"),
    partialRegionCount: count("PARTIAL"),
    notCalculableRegionCount: count("NOT_CALCULABLE"),
    outOfRangeRegionCount: count("OUT_OF_SUPPORTED_RANGE"),
    notApplicableRegionCount: count("NOT_APPLICABLE"),
  };
  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (summary[key] !== expected) issues.push(issue("COVERAGE_COUNT_MISMATCH", `coverageSummary.${key}`, { value: summary[key], expected }));
  }
  for (const field of ["crossRegionRank", "overallEstimatedLoad", "injuryRisk", "dangerScore", "runRestDecision", "personalHistoryDelta"]) {
    if (output.prohibitedFieldsAbsent?.[field] !== true || Object.hasOwn(output, field)) {
      issues.push(issue("PROHIBITED_FIELD_CONTRACT_VIOLATION", field));
    }
  }
  if (output.resultHash) {
    const { resultHash, ...base } = output;
    if (resultHash !== canonicalFingerprint(base)) issues.push(issue("RESULT_HASH_MISMATCH", "resultHash"));
  } else {
    issues.push(issue("RESULT_HASH_MISSING", "resultHash"));
  }
  return { valid: issues.length === 0, issues };
}
moduleExports["validatePrototypeRecordInput"] = validatePrototypeRecordInput;
moduleExports["validateFormalBundleSemantics"] = validateFormalBundleSemantics;
moduleExports["validateRegionalEngineInputSemantics"] = validateRegionalEngineInputSemantics;
moduleExports["validateRegionalEngineOutput"] = validateRegionalEngineOutput;
internalModules.formalInputValidation = moduleExports;
}

// ===== core/model/currentPrimaryInput/formalInputAdapter.js =====
{
const moduleExports = Object.create(null);
const { ADAPTER_VERSION, AUTHORITY_VERSION, FORMAL_INPUT_CATALOG } = internalModules.formalInputCatalog;
const { canonicalFingerprint } = internalModules.canonicalInputDigest;
const { resolveSurfaceSelections } = internalModules.surfacePresets;
const { failure, success } = internalModules.formalInputUtilities;
const { validateFormalBundleSemantics, validatePrototypeRecordInput } = internalModules.formalInputValidation;

const catalogById = new Map(FORMAL_INPUT_CATALOG.map(item => [item.id, item]));
const PLAN_IDS = new Set(FORMAL_INPUT_CATALOG.filter(x => x.disposition === "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT").map(x => x.id));
const TEXT_IDS = new Set(FORMAL_INPUT_CATALOG.filter(x => x.disposition === "TRACE_EXPLANATION_COMPARISON_ONLY").map(x => x.id));

function emptyEntry(item) {
  const status = PLAN_IDS.has(item.id) ? "NOT_SET" : TEXT_IDS.has(item.id) ? "NOT_RECORDED" : "UNKNOWN";
  return { inputId:item.id, technicalName:item.technicalName, status, value:null, unit:null,
    provenance:"UNKNOWN", confidence:"UNKNOWN", sourceField:null, presetVersion:ADAPTER_VERSION,
    numericPermission:item.numericPermission, notes:null };
}

function buildEmptyMap() { return Object.fromEntries(FORMAL_INPUT_CATALOG.map(item => [item.id, emptyEntry(item)])); }
function setEntry(map, id, value, {status="KNOWN", unit=null, provenance="USER", confidence="HIGH", sourceField=null, notes=null}={}) {
  if (!catalogById.has(id)) throw new Error(`Unknown formal input ID ${id}`);
  map[id] = {...map[id], status, value, unit, provenance, confidence, sourceField, notes};
}
function setNull(map,id,status="UNKNOWN",provenance="UNKNOWN",sourceField=null) { setEntry(map,id,null,{status,provenance,confidence:"UNKNOWN",sourceField}); }

function deriveRunSetting(surface) {
  if (!surface?.components?.length) return "UNKNOWN";
  const settings = new Set(surface.components.map(c=>c.runSetting));
  if (settings.size === 1) return [...settings][0];
  return "OUTDOOR_ROUTE";
}

function approximatelyEqual(a,b,tolerance=1e-9){
  return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b));
}

function explicitSectionRepresentsWholeRun(section,sectionCount,wholeDistanceKm){
  if(sectionCount!==1)return false;
  if(Number.isFinite(section.distanceKm)&&Number.isFinite(wholeDistanceKm))return approximatelyEqual(section.distanceKm,wholeDistanceKm);
  if(Number.isFinite(section.sharePercent))return approximatelyEqual(section.sharePercent,100);
  if(section.shareBasis==="DISTANCE"&&Number.isFinite(section.shareValue)&&Number.isFinite(wholeDistanceKm))return approximatelyEqual(section.shareValue,wholeDistanceKm);
  return false;
}

function buildSummarySections(ui, surface) {
  const distance = ui.distanceKm;
  const duration = ui.durationMinutes;
  const steps = ui.steps ?? null;
  const speed = distance && duration ? distance * 1000 / (duration * 60) : null;
  const cadence = steps != null && duration ? steps / duration : null;
  const course = ui.course ?? {};
  if (Array.isArray(course.sections) && course.sections.length) {
    const sectionCount=course.sections.length;
    return course.sections.map((s,i)=>{
      const homogeneousWholeRun=explicitSectionRepresentsWholeRun(s,sectionCount,distance);
      const derivedSectionSpeed=s.distanceKm && s.durationMinutes ? s.distanceKm*1000/(s.durationMinutes*60) : null;
      const derivedSectionCadence=s.steps!=null && s.durationMinutes ? s.steps/s.durationMinutes : null;
      return {
        sectionId:s.sectionId ?? `section-${i+1}`, shareBasis:s.shareBasis ?? "DISTANCE", shareValue:s.shareValue ?? s.distanceKm ?? 1,
        distanceKm:s.distanceKm ?? null, durationMinutes:s.durationMinutes ?? null, steps:s.steps ?? null,
        speedMps:Number.isFinite(s.speedMps) ? s.speedMps : (Number.isFinite(derivedSectionSpeed) ? derivedSectionSpeed : (homogeneousWholeRun ? speed : null)),
        cadenceSpm:Number.isFinite(s.cadenceSpm) ? s.cadenceSpm : (Number.isFinite(derivedSectionCadence) ? derivedSectionCadence : (homogeneousWholeRun ? cadence : null)),
        gradeDirection:s.gradeDirection ?? "UNKNOWN", gradePercent:s.gradePercent ?? null,
        runningFormat:s.runningFormat ?? ui.runningFormat ?? "UNKNOWN",
        surfacePresetKeys:surface.components.map(c=>c.presetKey),
        surfaceComponents:surface.components,
      };
    });
  }
  const gradeKnowledge=course.gradeKnowledge ?? "UNKNOWN";
  if (gradeKnowledge === "KNOWN_SUMMARY") {
    const up=course.uphillSharePercent ?? 0, down=course.downhillSharePercent ?? 0, flat=100-up-down;
    if (flat < -0.01) throw Object.assign(new Error("Grade shares exceed 100"),{code:"SECTION_SHARE_INVALID",path:"course"});
    const defs=[];
    if (up>0) defs.push(["UPHILL",up,course.uphillGradePercent]);
    if (down>0) defs.push(["DOWNHILL",down,course.downhillGradePercent]);
    if (flat>0) defs.push(["FLAT",flat,0]);
    const homogeneousWholeRun=defs.length===1&&approximatelyEqual(defs[0][1],100);
    return defs.map(([dir,share,g],i)=>({sectionId:`section-${i+1}`,shareBasis:"DISTANCE",shareValue:distance*share/100,
      distanceKm:distance*share/100,durationMinutes:homogeneousWholeRun?duration:null,steps:homogeneousWholeRun?steps:null,
      speedMps:homogeneousWholeRun?speed:null,cadenceSpm:homogeneousWholeRun?cadence:null,
      gradeDirection:dir,gradePercent:g??null,runningFormat:ui.runningFormat??"UNKNOWN",surfacePresetKeys:surface.components.map(c=>c.presetKey),surfaceComponents:surface.components}));
  }
  return [{sectionId:"section-1",shareBasis:"DISTANCE",shareValue:distance??1,distanceKm:distance??null,durationMinutes:duration??null,steps,
    speedMps:speed,cadenceSpm:cadence,gradeDirection:gradeKnowledge==="KNOWN_FLAT"?"FLAT":"UNKNOWN",gradePercent:gradeKnowledge==="KNOWN_FLAT"?0:null,
    runningFormat:ui.runningFormat??"UNKNOWN",surfacePresetKeys:surface.components.map(c=>c.presetKey),surfaceComponents:surface.components}];
}

function adaptPrototypeRecord(uiInput, context={}) {
  try {
    const inputIssues = validatePrototypeRecordInput(uiInput);
    if (inputIssues.length) return failure("SCHEMA_INVALID","input.schema_invalid",inputIssues[0].path,{issues:inputIssues});
    if (!uiInput || typeof uiInput !== "object") return failure("SCHEMA_INVALID","input.must_be_object","");
    if (!context.sessionId && !uiInput.sessionId) return failure("SCHEMA_INVALID","session_id.required","context.sessionId");
    if (!uiInput.date) return failure("SCHEMA_INVALID","session_date.required","date");
    if (!["run","rest"].includes(uiInput.activityType)) return failure("SCHEMA_INVALID","activity_type.invalid","activityType");
    if (uiInput.activityType === "run" && (!(uiInput.distanceKm>0) || !(uiInput.durationMinutes>0))) return failure("SCHEMA_INVALID","run.distance_duration.required","distanceKm");
    const map=buildEmptyMap();
    const sessionId=context.sessionId ?? uiInput.sessionId;
    const revision=context.recordRevision ?? 1;
    setEntry(map,"RL-IN-001",uiInput.activityType==="run"?"RUNNING_DAY":"RUNNING_REST_DAY",{provenance:"DERIVED",sourceField:"activityType"});
    setEntry(map,"RL-IN-002",uiInput.date,{sourceField:"date"});
    setEntry(map,"RL-IN-003",uiInput.activityType.toUpperCase(),{sourceField:"activityType"});
    setEntry(map,"RL-IN-004",sessionId,{provenance:"SYSTEM",sourceField:"context.sessionId"});
    setEntry(map,"RL-IN-005",context.sessionSequence??1,{provenance:"SYSTEM",sourceField:"context.sessionSequence"});
    setEntry(map,"RL-IN-007",revision,{provenance:"SYSTEM",sourceField:"context.recordRevision"});
    if (uiInput.memo) setEntry(map,"RL-IN-006",uiInput.memo,{sourceField:"memo"});

    if (uiInput.activityType === "rest") {
      for (const id of ["RL-IN-010","RL-IN-011","RL-IN-012","RL-IN-013","RL-IN-014","RL-IN-015","RL-DV-019","RL-DV-020","RL-DV-021"]) setNull(map,id,"NOT_APPLICABLE","DERIVED");
    } else {
      setEntry(map,"RL-IN-010","VALUE",{provenance:"DERIVED"}); setEntry(map,"RL-IN-011",uiInput.distanceKm,{unit:"km",sourceField:"distanceKm"});
      setEntry(map,"RL-IN-012","VALUE",{provenance:"DERIVED"}); setEntry(map,"RL-IN-013",uiInput.durationMinutes,{unit:"min",sourceField:"durationMinutes"});
      const speed=uiInput.distanceKm*1000/(uiInput.durationMinutes*60), pace=uiInput.durationMinutes/uiInput.distanceKm;
      setEntry(map,"RL-DV-019",speed,{unit:"m/s",provenance:"DERIVED"}); setEntry(map,"RL-DV-020",pace,{unit:"min/km",provenance:"DERIVED"});
      if (Number.isInteger(uiInput.steps) && uiInput.steps>=0) {
        setEntry(map,"RL-IN-014","VALUE",{provenance:"DERIVED"}); setEntry(map,"RL-IN-015",uiInput.steps,{unit:"steps",sourceField:"steps"});
        const prov=uiInput.stepsProvenance==="ESTIMATED"?"MANUAL_ESTIMATE":uiInput.stepsProvenance??"UNKNOWN";
        setEntry(map,"RL-IN-016",prov,{sourceField:"stepsProvenance"});
        if (["DEVICE_MEASURED","DEVICE_SYNCED"].includes(prov)) setEntry(map,"RL-DV-021",uiInput.steps/uiInput.durationMinutes,{unit:"steps/min",provenance:"DERIVED"});
        else setNull(map,"RL-DV-021","UNKNOWN","DERIVED");
      } else {
        setEntry(map,"RL-IN-014","NOT_RECORDED",{provenance:"DERIVED"}); setNull(map,"RL-IN-015","NOT_RECORDED","USER","steps"); setNull(map,"RL-IN-016","UNKNOWN","USER","stepsProvenance"); setNull(map,"RL-DV-021","UNKNOWN","DERIVED");
      }
      setEntry(map,"RL-IN-017",uiInput.runningFormat??"UNKNOWN",{sourceField:"runningFormat"});
    }

    const surfaceResult=resolveSurfaceSelections(uiInput.course?.surfaceSelections);
    if (!surfaceResult.ok) return surfaceResult;
    const surface=surfaceResult.value;
    setEntry(map,"RL-IN-018",deriveRunSetting(surface),{provenance:"DERIVED"});
    if (uiInput.course?.courseId) setEntry(map,"RL-IN-030",uiInput.course.courseId,{sourceField:"course.courseId"});
    if (uiInput.course?.courseName) setEntry(map,"RL-IN-031",uiInput.course.courseName,{sourceField:"course.courseName"});
    const gk=uiInput.course?.gradeKnowledge??"UNKNOWN"; setEntry(map,"RL-IN-032",gk,{sourceField:"course.gradeKnowledge"});
    if (gk==="KNOWN_FLAT") {setEntry(map,"RL-IN-033",0,{unit:"%",provenance:"DERIVED"});setEntry(map,"RL-IN-034",0,{unit:"%",provenance:"DERIVED"});setEntry(map,"RL-DV-035",100,{unit:"%",provenance:"DERIVED"});}
    else if (gk==="KNOWN_SUMMARY") {const up=uiInput.course?.uphillSharePercent??0,down=uiInput.course?.downhillSharePercent??0,flat=100-up-down;if(flat<-.01)return failure("SECTION_SHARE_INVALID","grade.share_sum_invalid","course",{up,down});setEntry(map,"RL-IN-033",up,{unit:"%",sourceField:"course.uphillSharePercent"});setEntry(map,"RL-IN-034",down,{unit:"%",sourceField:"course.downhillSharePercent"});setEntry(map,"RL-DV-035",flat,{unit:"%",provenance:"DERIVED"});if(up>0&&uiInput.course.uphillGradePercent!=null)setEntry(map,"RL-IN-036",uiInput.course.uphillGradePercent,{unit:"%",sourceField:"course.uphillGradePercent"});if(down>0&&uiInput.course.downhillGradePercent!=null)setEntry(map,"RL-IN-037",uiInput.course.downhillGradePercent,{unit:"%",sourceField:"course.downhillGradePercent"});}
    setEntry(map,"RL-IN-038",uiInput.course?.routePattern??"UNKNOWN",{sourceField:"course.routePattern"});
    const sections=uiInput.activityType==="run"?buildSummarySections(uiInput,surface):[];
    setEntry(map,"RL-IN-039",sections,{provenance:"DERIVED",sourceField:"course"});
    setEntry(map,"RL-IN-040",surface.knowledge,{provenance:"DERIVED"});
    if(surface.components.length){setEntry(map,"RL-IN-041",surface.components,{provenance:"PRESET"});setEntry(map,"RL-IN-042",surface.components.length===1?surface.dominant.materialLabel:"MIXED",{provenance:"PRESET"});setEntry(map,"RL-IN-043",surface.dominant.sharePercent,{unit:"%",provenance:"PRESET"});for(const [id,key] of [["RL-IN-044","hardnessLevel"],["RL-IN-045","unevennessLevel"],["RL-IN-046","gripLevel"],["RL-IN-047","sinkLevel"],["RL-IN-048","reboundLevel"],["RL-IN-049","stabilityLevel"],["RL-IN-050","wetSlipState"]]){const value=surface.dominant.propertyProfile[key]; if(value==null||value==="UNKNOWN")setNull(map,id,"UNKNOWN","PRESET");else setEntry(map,id,value,{provenance:surface.dominant.propertyOrigin});}}

    const ss=uiInput.shoeAndStyle??{};
    if(ss.shoeId)setEntry(map,"RL-IN-070",ss.shoeId,{sourceField:"shoeAndStyle.shoeId"});if(ss.shoeLabel)setEntry(map,"RL-IN-071",ss.shoeLabel,{sourceField:"shoeAndStyle.shoeLabel"});
    if(ss.shoeType)setEntry(map,"RL-IN-072",ss.shoeType,{sourceField:"shoeAndStyle.shoeType"});if(ss.shoeSoftness)setEntry(map,"RL-IN-073",ss.shoeSoftness,{sourceField:"shoeAndStyle.shoeSoftness"});
    if(ss.footPlacement)setEntry(map,"RL-IN-080",ss.footPlacement,{sourceField:"shoeAndStyle.footPlacement",confidence:"MODERATE"});if(ss.rhythmStride)setEntry(map,"RL-IN-081",ss.rhythmStride,{sourceField:"shoeAndStyle.rhythmStride"});
    if(Array.isArray(ss.focusTags)&&ss.focusTags.length)setEntry(map,"RL-IN-082",ss.focusTags,{sourceField:"shoeAndStyle.focusTags"});if(ss.note)setEntry(map,"RL-IN-083",ss.note,{sourceField:"shoeAndStyle.note"});

    if(uiInput.rpe!=null){setEntry(map,"RL-IN-090","REPORTED",{provenance:"DERIVED"});setEntry(map,"RL-IN-091",uiInput.rpe,{sourceField:"rpe"});setEntry(map,"RL-IN-092","USER_REPORTED",{provenance:"DERIVED"});}
    else {setEntry(map,"RL-IN-090","NOT_REPORTED",{provenance:"DERIVED"});setNull(map,"RL-IN-091","NOT_RECORDED","USER","rpe");setEntry(map,"RL-IN-092","UNKNOWN",{provenance:"DERIVED"});}

    const br=uiInput.bodyReview??{status:"NOT_REVIEWED",observations:[]}; setEntry(map,"RL-IN-100",br.status,{sourceField:"bodyReview.status"});
    const obs=Array.isArray(br.observations)?br.observations:[]; setEntry(map,"RL-IN-101",obs,{sourceField:"bodyReview.observations"});
    if(obs.length===1){const o=obs[0];setEntry(map,"RL-IN-102",o.bodyAreaId,{sourceField:"bodyReview.observations[0].bodyAreaId"});setEntry(map,"RL-IN-103",o.laterality,{sourceField:"bodyReview.observations[0].laterality"});setEntry(map,"RL-IN-104",o.noticedIntensity,{sourceField:"bodyReview.observations[0].noticedIntensity"});setEntry(map,"RL-IN-105",o.sensationType??"NOT_SELECTED",{sourceField:"bodyReview.observations[0].sensationType"});setEntry(map,"RL-IN-106",o.noticedTiming,{sourceField:"bodyReview.observations[0].noticedTiming"});if(o.note)setEntry(map,"RL-IN-107",o.note,{sourceField:"bodyReview.observations[0].note"});}

    const profile=context.profile??{}; for(const [id,key,unit] of [["RL-IN-113","heightCm","cm"],["RL-IN-114","weightKg","kg"],["RL-IN-115","ageBand",null],["RL-IN-116","sexOrReferenceCategory",null]]) if(profile[key]!=null)setEntry(map,id,profile[key],{unit,provenance:"SNAPSHOT",sourceField:`context.profile.${key}`});
    const plan=uiInput.plan??{}; if(plan.scheduledDate)setEntry(map,"RL-IN-130",plan.scheduledDate,{sourceField:"plan.scheduledDate"});if(plan.planType)setEntry(map,"RL-IN-131",plan.planType,{sourceField:"plan.planType"});if(plan.distanceKm!=null){setEntry(map,"RL-IN-132","VALUE",{provenance:"DERIVED"});setEntry(map,"RL-IN-133",plan.distanceKm,{unit:"km",sourceField:"plan.distanceKm"});}if(plan.durationMinutes!=null){setEntry(map,"RL-IN-134","VALUE",{provenance:"DERIVED"});setEntry(map,"RL-IN-135",plan.durationMinutes,{unit:"min",sourceField:"plan.durationMinutes"});}if(plan.course)setEntry(map,"RL-IN-136",plan.course,{sourceField:"plan.course"});if(plan.note)setEntry(map,"RL-IN-137",plan.note,{sourceField:"plan.note"});if(plan.outcomeStatus)setEntry(map,"RL-IN-138",plan.outcomeStatus,{sourceField:"plan.outcomeStatus"});if(plan.changeReason)setEntry(map,"RL-IN-139",plan.changeReason,{sourceField:"plan.changeReason"});if(plan.actualSessionId)setEntry(map,"RL-IN-140",plan.actualSessionId,{sourceField:"plan.actualSessionId"});

    const inputSnapshotHash=canonicalFingerprint(map);
    return success({schemaVersion:"runload-formal-input-bundle-1.0",authorityVersion:AUTHORITY_VERSION,adapterVersion:ADAPTER_VERSION,
      recordSnapshot:{sessionId,recordRevision:revision,sessionDate:uiInput.date,activityType:uiInput.activityType.toUpperCase(),presetSnapshotVersion:ADAPTER_VERSION,inputSnapshotHash},formalInputs:map},surfaceResult.warnings??[]);
  } catch(error){return failure(error.code??"SCHEMA_INVALID","adapter.failed",error.path??"",{message:error.message});}
}

function validateFormalInputBundle(bundle){
  const issues=[]; if(!bundle||typeof bundle!=="object")return {valid:false,issues:[{code:"SCHEMA_INVALID",messageKey:"bundle.invalid",path:"",details:{}}]};
  const actual=Object.keys(bundle.formalInputs??{}), expected=FORMAL_INPUT_CATALOG.map(x=>x.id);
  for(const id of expected)if(!(id in (bundle.formalInputs??{})))issues.push({code:"MISSING_FORMAL_INPUT_ENTRY",messageKey:"formal_input.missing",path:`formalInputs.${id}`,details:{id}});
  for(const id of actual)if(!catalogById.has(id))issues.push({code:"UNKNOWN_FORMAL_INPUT_ID",messageKey:"formal_input.unknown",path:`formalInputs.${id}`,details:{id}});
  for(const id of actual){const e=bundle.formalInputs[id];if(["UNKNOWN","NOT_RECORDED","NOT_SET","NOT_APPLICABLE"].includes(e.status)&&e.value!==null)issues.push({code:"STATUS_VALUE_CONFLICT",messageKey:"formal_input.status_value_conflict",path:`formalInputs.${id}.value`,details:{status:e.status}});}
  issues.push(...validateFormalBundleSemantics(bundle));
  const uniqueIssues=[...new Map(issues.map(item=>[`${item.code}|${item.path}`,item])).values()];
  return {valid:uniqueIssues.length===0,issues:uniqueIssues};
}
moduleExports["adaptPrototypeRecord"] = adaptPrototypeRecord;
moduleExports["validateFormalInputBundle"] = validateFormalInputBundle;
internalModules.formalInputAdapter = moduleExports;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2TraceAdapter.js =====
{
const moduleExports = Object.create(null);
const { adaptStoredRecordToPrimaryRegionalV2Input, primaryRegionalV2ProfileContext } = internalModules.primaryRegionalInputAdapter;
const { adaptPrototypeRecord } = internalModules.formalInputAdapter;

function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}

function buildPrimaryRegionalV2FormalInputTrace({record,feedback={},sessionSequence=1}={}){
  const uiInput=adaptStoredRecordToPrimaryRegionalV2Input(record,feedback);
  const adapted=adaptPrototypeRecord(uiInput,{sessionId:record.id,sessionSequence,recordRevision:1,profile:primaryRegionalV2ProfileContext(record)});
  if(!adapted.ok)return {ok:false,code:adapted.error?.code||"PRIMARY_TRACE_ADAPTER_FAILED",error:adapted.error||null};
  const bundle=clone(adapted.value);
  bundle.contractOnlyInputs={
    runWalkRunningDistanceKm:record.runningFormat==="RUN_WALK"?Number(record.runWalkRunningDistanceKm)||null:null,
    runWalkRunningDurationMinutes:record.runningFormat==="RUN_WALK"?Number(record.runWalkRunningDurationMinutes)||null:null,
    runWalkRunningSections:record.runningFormat==="RUN_WALK"?clone(record.runWalkRunningSections||[]):[],
  };
  return {ok:true,value:bundle,uiInput};
}
moduleExports["buildPrimaryRegionalV2FormalInputTrace"] = buildPrimaryRegionalV2FormalInputTrace;
internalModules.primaryRegionalTraceAdapter = moduleExports;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2AppAdapter.js =====
{
const moduleExports = Object.create(null);
const { RETAINED_INPUTS } = internalModules.primaryRegionalInputTrace;
const { buildPrimaryRegionalV2FormalInputTrace } = internalModules.primaryRegionalTraceAdapter;

function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function finite(v){return typeof v==='number'&&Number.isFinite(v);}
function speedOf(record={}){const d=Number(record.distanceKm),t=Number(record.durationMinutes);return d>0&&t>0?d*1000/(t*60):null;}
function median(values=[]){const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function normalizeSurfaceCategory(v){const x=String(v||'').toUpperCase();if(x.includes('NATURAL_GRASS'))return 'NATURAL_GRASS';if(x==='PAVED'||x==='ASPHALT')return 'ASPHALT';if(x.includes('TRACK')||x.includes('RUBBER'))return 'RUBBER_TRACK';if(x.includes('TREADMILL'))return 'TREADMILL_BELT';if(x.includes('SOIL'))return 'SOIL';if(x.includes('TRAIL'))return 'TRAIL';if(x.includes('ARTIFICIAL'))return 'ARTIFICIAL_TURF';if(x.includes('SAND'))return 'SAND';return x||'UNKNOWN';}
function surfaceComponentsFromCourse(course={}){const defs=[['pavedPercent','ASPHALT'],['trackPercent','RUBBER_TRACK'],['treadmillPercent','TREADMILL_BELT'],['soilPercent','SOIL'],['trailPercent','TRAIL'],['naturalGrassPercent','NATURAL_GRASS'],['artificialTurfPercent','ARTIFICIAL_TURF'],['sandPercent','SAND']];return defs.flatMap(([k,c])=>{const n=Number(course?.[k]||0);return n>0?[{category:c,sharePercent:n}]:[]});}
function runSettingFromCourse(course={}){const t=Number(course?.treadmillPercent||0),other=['pavedPercent','trackPercent','soilPercent','trailPercent','naturalGrassPercent','artificialTurfPercent','sandPercent'].reduce((s,k)=>s+Number(course?.[k]||0),0);if(t>0&&other===0)return 'TREADMILL';if(other>0&&t===0)return 'OUTDOOR_ROUTE';if(t>0&&other>0)return 'MIXED_SETTING';return null;}
function sectionGradePercent(s={}){const g=Math.abs(Number(s.gradePercent||0));const d=String(s.gradeDirection||'FLAT').toUpperCase();if(d==='UPHILL')return g;if(d==='DOWNHILL')return -g;return 0;}
function mapSections(items=[]){return (Array.isArray(items)?items:[]).map(s=>({sharePercent:s.sharePercent??null,distanceKm:s.distanceKm??null,durationMinutes:s.durationMinutes??null,gradePercent:sectionGradePercent(s),surfaceComponents:(Array.isArray(s.surfaceComponents)?s.surfaceComponents:[]).map(c=>({category:normalizeSurfaceCategory(c.userCategory||c.category),sharePercent:Number(c.sharePercent||0)})),runSetting:null}));}
function strikeObservation(record={}){const raw=String(record.personalContext?.footPlacement||'').toUpperCase();let value=null;if(['HEEL','RFS','REARFOOT'].includes(raw))value='RFS';else if(['FOREFOOT','FFS'].includes(raw))value='FFS';else if(['MIDFOOT','MFS'].includes(raw))value='MFS';return value?{value,provenance:'SELF_REPORTED'}:null;}

function personalHabitualCadenceReference(record={},allRecords=[]){
  if(String(record.runningFormat||'').toUpperCase()!=='CONTINUOUS_RUN')return {value:null,state:'REFERENCE_BUILDING',eligibleCount:0};
  const currentSpeed=speedOf(record);if(!(currentSpeed>0))return {value:null,state:'REFERENCE_BUILDING',eligibleCount:0};
  const sorted=[...(allRecords||[])].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.id||'').localeCompare(String(b.id||'')));
  const idx=sorted.findIndex(x=>x.id===record.id);const prior=idx>=0?sorted.slice(0,idx):sorted.filter(x=>x.id!==record.id&&String(x.date||'')<=String(record.date||''));
  const cadences=[];
  for(const r of prior){
    if(String(r.activityType||'').toLowerCase()!=='run'||String(r.runningFormat||'').toUpperCase()!=='CONTINUOUS_RUN')continue;
    if(!['DEVICE_MEASURED','DEVICE_SYNCED'].includes(String(r.stepsProvenance||'').toUpperCase()))continue;
    const sp=speedOf(r),steps=Number(r.steps),dur=Number(r.durationMinutes);if(!(sp>0&&steps>0&&dur>0))continue;
    if(Math.abs(sp-currentSpeed)>0.10+1e-12)continue;
    cadences.push(steps/dur);
  }
  return cadences.length>=3?{value:median(cadences),state:'MODEL_DERIVED_PERSONAL_REFERENCE',eligibleCount:cadences.length,speedNeighborhoodMps:0.10}:{value:null,state:'REFERENCE_BUILDING',eligibleCount:cadences.length,speedNeighborhoodMps:0.10};
}

function rawRepairValue(name,record={},feedback={}){
  const map={
    weatherState:()=>record.environmentContext?.weather,
    temperatureC:()=>record.environmentContext?.temperatureC,
    windLevel:()=>record.environmentContext?.windSummary,
    environmentNote:()=>record.environmentContext?.environmentNote,
    'equipmentTags[]':()=>record.personalContext?.equipmentTags,
    equipmentNote:()=>record.personalContext?.equipmentNote,
    postRunReflection:()=>record.reflectionContext?.postRunReflection,
    perceivedDifference:()=>record.reflectionContext?.perceivedDifference,
    runningStartDateOrBand:()=>record.bodyProfileSnapshot?.runningStartDateOrBand,
    experienceSelfAssessment:()=>record.bodyProfileSnapshot?.experienceSelfAssessment,
    'runningGoalTags[]':()=>record.bodyProfileSnapshot?.runningGoalTags,
    sleepSummary:()=>record.recoveryContext?.sleepSummary,
    nutritionHydrationSummary:()=>record.recoveryContext?.nutritionHydrationSummary,
    lifestyleNote:()=>record.recoveryContext?.lifestyleNote,
    reflectionKeyPoint:()=>record.reflectionContext?.reflectionKeyPoint,
    nextCheckPoint:()=>record.reflectionContext?.nextCheckPoint,
    consultationTarget:()=>record.consultationContext?.consultationTarget,
    consultationQuestion:()=>record.consultationContext?.consultationQuestion,
    consultationDataSelection:()=>record.consultationContext?.consultationDataSelection,
  };return map[name]?clone(map[name]()):undefined;
}

function buildAppRetainedInputTrace({record,feedback={},sessionSequence=1}={}){
  const currentTrace=buildPrimaryRegionalV2FormalInputTrace({record,feedback,sessionSequence});
  if(!currentTrace.ok)return currentTrace;
  const formal=currentTrace.value?.formalInputs||{};
  const entries=RETAINED_INPUTS.map(d=>{
    const f=formal[d.inputId]||null; let value=f?.value??null; let status=f?.status||'MISSING'; let provenance=f?.provenance||null;
    if(d.traceAction==='CURRENT_APP_CONTEXT_TRACE'){
      const raw=rawRepairValue(d.technicalName,record,feedback);
      if(raw!==undefined&&raw!==null&&!(Array.isArray(raw)&&raw.length===0)&&raw!==''){value=raw;status='KNOWN';provenance='CURRENT_RAW_RECORD_CONTEXT';}
    }
    return {...d,present:status==='KNOWN'||status==='EXPLICIT_UNKNOWN',value,status,provenance,currentFormalInput:f};
  });
  return {ok:true,value:{count:entries.length,entries,runSettingProvenance:'SURFACE_DERIVED',traceVersion:'primary-regional-v2-app-input-trace-v1',formalInputCount:Object.keys(formal).length},uiInput:currentTrace.uiInput};
}

function adaptCurrentRecordToPrimaryRegionalV2({record,allRecords=[]}={}){
  const fmt=String(record.runningFormat||'UNKNOWN').toUpperCase();const course=record.course||{};const ref=personalHabitualCadenceReference(record,allRecords);
  const runWalk=fmt==='RUN_WALK';const sections=mapSections(runWalk?record.runWalkRunningSections:course.sections);
  const target={
    runningFormat:runWalk?'RUN_WALK':fmt==='CONTINUOUS_RUN'?'RUN':fmt,
    distanceKm:Number(record.distanceKm)||null,
    durationMinutes:Number(record.durationMinutes)||null,
    runningDistanceKm:runWalk?Number(record.runWalkRunningDistanceKm)||null:null,
    runningDurationMinutes:runWalk?Number(record.runWalkRunningDurationMinutes)||null:null,
    steps:Number(record.steps)||null,
    stepsProvenance:record.stepsProvenance||'UNKNOWN',
    averageCadenceSpm:(!runWalk&&['DEVICE_MEASURED','DEVICE_SYNCED'].includes(String(record.stepsProvenance||'').toUpperCase())&&Number(record.steps)>0&&Number(record.durationMinutes)>0)?Number(record.steps)/Number(record.durationMinutes):null,
    personalHabitualCadenceSpm:ref.value,
    personalHabitualCadenceReferenceState:ref.state,
    personalHabitualCadenceEligibleCount:ref.eligibleCount,
    segments:sections.length?sections:null,
    uphillSharePercent:sections.length?null:Number(course.upPercent||0),
    downhillSharePercent:sections.length?null:Number(course.downPercent||0),
    uphillGradePercent:sections.length?null:Number(course.upGradePercent||0),
    downhillGradePercent:sections.length?null:Number(course.downGradePercent||0),
    surfaceComponents:sections.length?null:surfaceComponentsFromCourse(course),
    runSetting:runSettingFromCourse(course),
    runSettingProvenance:'SURFACE_DERIVED',
    footStrikeObservation:strikeObservation(record),
    allowR12GrassEnvelope:false,
  };
  return target;
}
moduleExports["personalHabitualCadenceReference"] = personalHabitualCadenceReference;
moduleExports["buildAppRetainedInputTrace"] = buildAppRetainedInputTrace;
moduleExports["adaptCurrentRecordToPrimaryRegionalV2"] = adaptCurrentRecordToPrimaryRegionalV2;
internalModules.primaryRegionalAppAdapter = moduleExports;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2RegionDefs.js =====
{
const moduleExports = Object.create(null);
const PRIMARY_REGIONAL_V2_REGION_DEFS = Object.freeze([
  { id:"R01", displayId:"BA-DISP-014", name:"股関節部" },
  { id:"R02", displayId:"BA-DISP-015", name:"殿部" },
  { id:"R03", displayId:"BA-DISP-016", name:"大腿前面" },
  { id:"R04", displayId:"BA-DISP-018", name:"大腿後面" },
  { id:"R05", displayId:"BA-DISP-019", name:"膝蓋大腿関節部" },
  { id:"R06", displayId:"BA-DISP-021", name:"脛骨部" },
  { id:"R07", displayId:"BA-DISP-023", name:"下腿後面" },
  { id:"R08", displayId:"BA-DISP-024", name:"足関節部" },
  { id:"R09", displayId:"BA-DISP-025", name:"アキレス腱部" },
  { id:"R10", displayId:"BA-DISP-027", name:"後足部" },
  { id:"R11", displayId:"BA-DISP-028", name:"足底中部・内側縦足弓" },
  { id:"R12", displayId:"BA-DISP-029", name:"前足部" },
]);
moduleExports["PRIMARY_REGIONAL_V2_REGION_DEFS"] = PRIMARY_REGIONAL_V2_REGION_DEFS;
internalModules.primaryRegionalRegionDefinitions = moduleExports;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2ResultService.js =====
{
const moduleExports = Object.create(null);
const { BUILD_ID, REGION_DEFS, calculateRun } = internalModules.primaryRegionalEngine;
const { adaptCurrentRecordToPrimaryRegionalV2, buildAppRetainedInputTrace } = internalModules.primaryRegionalAppAdapter;
const { PRIMARY_REGIONAL_V2_REGION_DEFS } = internalModules.primaryRegionalRegionDefinitions;

const PRIMARY_REGIONAL_V2_MODEL_VERSION = "runload-primary-regional-reference100-v3.0";
const PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION = "runload-primary-regional-reference100-output-v3.0";
const PRIMARY_REGIONAL_V2_AUTHORITY_VERSION = "RunLoad-Calculation-Engine-V1.2Plus-20260916";
const PRIMARY_REGIONAL_V2_BUILD_ID = BUILD_ID;
const LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION = "runload-primary-regional-v2.0";

const DISPLAY_BY_R = new Map(PRIMARY_REGIONAL_V2_REGION_DEFS.map((d) => [d.id, d]));
const DEF_BY_R = new Map(REGION_DEFS.map((d) => [d.id, d]));
const BASE_SOURCE_BY_R = Object.freeze(Object.fromEntries(REGION_DEFS.map((d) => [d.id, d.baselineSource])));
const SOURCE_REGISTRY = Object.freeze({
  FUKUCHI_2017: { label: "Fukuchi et al. 2017", role: "股関節・足関節の速度応答" },
  GAZENDAM_HOF_2007_FIGURE3_DIGITIZED: { label: "Gazendam & Hof 2007", role: "保存原典Figure 3とTable 3から再現した筋活動経路" },
  GAZENDAM_HOF_2007_TABLE3_NORMALIZED: { label: "Gazendam & Hof 2007", role: "Table 3係数と2.5 m/s正規化で再現した下腿後面筋活動経路" },
  HAGEN_2023: { label: "Hagen et al. 2023", role: "膝蓋大腿関節の速度・相対cadence応答" },
  VAN_HOOREN_2024: { label: "Van Hooren et al. 2024", role: "脛骨・アキレス腱の速度/条件応答" },
  HO_2010: { label: "Ho et al. 2010", role: "足底ピーク圧の速度/上り応答" },
  JIN_2018: { label: "Jin 2018", role: "R01/R08 低速側P2 bridge" },
  LI_2020: { label: "Li 2020", role: "R10-R12 高速側P2 bridge" },
});
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function sanitize(v){return String(v||"").replace(/[^0-9A-Za-z._-]/g,"_");}
function revision(record={}){return String(record.updatedAt||record.createdAt||"");}
function unique(xs=[]){return [...new Set(xs.filter(Boolean).map(String))];}
function evidenceRank(s){return ({DIRECT:0,P1_SOURCE_MODEL_EXTENSION:1,P2_CROSS_SOURCE_BRIDGE:2,EVIDENCE_INSUFFICIENT:9})[String(s||"")]??8;}
function weakest(states=[]){const xs=unique(states);return xs.sort((a,b)=>evidenceRank(b)-evidenceRank(a))[0]||"EVIDENCE_INSUFFICIENT";}
function sourceIdsForRegion(rid, rawResult={}){
  const ids=[BASE_SOURCE_BY_R[rid]];const text=JSON.stringify(rawResult||{});
  if((rid==='R01'||rid==='R08')&&text.includes('JIN_2018'))ids.push('JIN_2018');
  if((rid==='R10'||rid==='R11'||rid==='R12')&&text.includes('LI_2020'))ids.push('LI_2020');
  if((rid==='R05'||rid==='R06'||rid==='R09')&&text.includes('VAN_HOOREN'))ids.push('VAN_HOOREN_2024');
  return unique(ids);
}
function aggregateEvidence(regionAgg={}){return weakest(regionAgg.segmentEvidence||[]);}
function axisRows(rawResult={}, rid){
  const axes=rawResult.axisEstimates||{};
  return Object.entries(axes).map(([axis, byRegion])=>{
    const r=byRegion?.[rid]||{};
    return Object.freeze({axis, value:r.value !== null && r.value !== "" && Number.isFinite(Number(r.value))?Number(r.value):null, valueEnvelope:Array.isArray(r.valueEnvelope)?clone(r.valueEnvelope):null, state:r.state||"UNAVAILABLE", evidenceState:aggregateEvidence(r), unsupportedDistanceKm:Number(r.unsupportedDistanceKm||0)});
  });
}
function buildRows(rawResult={}){
  return REGION_DEFS.map((def)=>{
    const display=DISPLAY_BY_R.get(def.id)||{};
    const agg=rawResult?.regions?.[def.id]||{};
    const value=agg.value !== null && agg.value !== "" && Number.isFinite(Number(agg.value))?Number(agg.value):null;
    const evidenceState=aggregateEvidence(agg);
    const axes=axisRows(rawResult,def.id);
    return Object.freeze({
      regionId:display.displayId||def.id,
      primaryRegionId:def.id,
      regionName:def.name,
      value,
      indexValue:value,
      valueEnvelope:Array.isArray(agg.valueEnvelope)?clone(agg.valueEnvelope):null,
      calculationState:value==null?(Number(agg.unsupportedDistanceKm||0)>0?"PARTIAL":"NOT_CALCULABLE"):"CALCULATED",
      provenance:evidenceState,
      evidenceState,
      evidenceStates:Object.freeze(unique(agg.segmentEvidence||[])),
      unsupportedDistanceKm:Number(agg.unsupportedDistanceKm||0),
      construct:def.construct,
      constructId:`PRIMARY_${def.id}_CONSTRUCT_V2`,
      referenceId:`PRIMARY_${def.id}_REFERENCE_V2`,
      referenceAmountKm:null,
      referenceSpeedMps:def.referenceSpeedMps,
      sourceIds:Object.freeze(sourceIdsForRegion(def.id,rawResult)),
      axisEstimates:Object.freeze(axes),
      optionalApplied:Object.freeze(axes.filter((x)=>x.value!=null).map((x)=>Object.freeze({axis:x.axis,evidenceState:x.evidenceState,value:x.value,valueEnvelope:x.valueEnvelope}))),
      coverageProportion:Number.isFinite(Number(agg.coverageProportion))?Number(agg.coverageProportion):null,
      supportedDistanceKm:Number(agg.supportedDistanceKm||0),
      projectCompositeFlag:def.id==="R11"||def.id==="R12",
      fallback:Object.freeze([]),
    });
  });
}
function bodyMap(rows=[]){return Object.freeze({version:"primary-reference100-v3-bodymap-1.0",regions:Object.freeze(rows.map((r)=>Object.freeze({regionId:r.regionId,primaryRegionId:r.primaryRegionId,regionName:r.regionName,value:r.value,calculationState:r.calculationState})))});}
function comparisonSignatures(record={}){return Object.freeze(Object.fromEntries((record.result?.regions||[]).map((row)=>[row.regionId,Object.freeze({regionId:row.regionId,primaryRegionId:row.primaryRegionId,modelVersion:PRIMARY_REGIONAL_V2_MODEL_VERSION,outputSemanticVersion:PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION,constructId:row.constructId,referenceId:row.referenceId,directDeltaAllowed:true})])));}
function buildPrimaryRegionalV2ComparisonSignature(resultRecord={},rowOrRegionId=null){const id=typeof rowOrRegionId==="string"?rowOrRegionId:rowOrRegionId?.regionId;return resultRecord?.comparison_signatures?.[id]||null;}
function comparePrimaryRegionalV2Signatures(a,b){const same=Boolean(a&&b&&a.modelVersion===b.modelVersion&&a.outputSemanticVersion===b.outputSemanticVersion&&a.regionId===b.regionId&&a.constructId===b.constructId&&a.referenceId===b.referenceId);return Object.freeze({directDeltaAllowed:same,status:same?"COMPARABLE":"INCOMPATIBLE",reason:same?"SAME_REGION_SEMANTIC":"SEMANTIC_OR_MODEL_MISMATCH"});}

function createPrimaryRegionalV2ResultRecord({record,feedback={},sessionSequence=1,allRecords=[]}={}){
  const trace=buildAppRetainedInputTrace({record,feedback,sessionSequence}); if(!trace.ok) return trace;
  const common={id:`primary-reference100-v3-result-${sanitize(record.id)}-${sanitize(revision(record))}`,record_id:record.id,source_record_revision:revision(record),generated_at:new Date().toISOString(),model_version:PRIMARY_REGIONAL_V2_MODEL_VERSION,authority_version:PRIMARY_REGIONAL_V2_AUTHORITY_VERSION,engine_build_version:PRIMARY_REGIONAL_V2_BUILD_ID,output_semantic_version:PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION,input_trace:clone(trace.value),formal_input_snapshot:clone(trace.value),input_snapshot:clone(trace.uiInput),source_registry:SOURCE_REGISTRY};
  if(String(record.activityType||"").toLowerCase()==="rest") return {ok:true,resultRecord:Object.freeze({...common,state:"REST",engine_input_snapshot:null,result:null,body_map_payload:Object.freeze({version:"primary-reference100-v3-bodymap-1.0",regions:Object.freeze([])}),comparison_signatures:Object.freeze({})})};
  const engineInput=adaptCurrentRecordToPrimaryRegionalV2({record,allRecords});
  const raw=calculateRun(engineInput);
  const rows=buildRows(raw);
  const result=Object.freeze({state:raw.state||"UNAVAILABLE",courseState:raw.courseState||null,combinedConditionState:raw.combinedConditionState||null,model_version:PRIMARY_REGIONAL_V2_MODEL_VERSION,outputSemanticVersion:PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION,exposure:clone(raw.exposure||null),regions:Object.freeze(rows),axisEstimates:clone(raw.axisEstimates||{}),rawEngineState:raw.state||null});
  const base={...common,state:"RUN",engine_input_snapshot:clone(engineInput),result,body_map_payload:bodyMap(rows),comparison_signatures:null};
  base.comparison_signatures=comparisonSignatures(base);
  return {ok:true,resultRecord:Object.freeze(base)};
}
function validatePrimaryRegionalV2ResultRecord(item={}){
  const issues=[];
  if(item.model_version!==PRIMARY_REGIONAL_V2_MODEL_VERSION)issues.push("MODEL_VERSION");
  if(item.output_semantic_version!==PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION)issues.push("OUTPUT_SEMANTIC_VERSION");
  if(!item.id||!item.record_id)issues.push("IDENTITY");
  if(item.input_trace?.count!==93||!Array.isArray(item.input_trace?.entries)||item.input_trace.entries.length!==93)issues.push("INPUT_TRACE_93_REQUIRED");
  const repairs=(item.input_trace?.entries||[]).filter((x)=>x.traceAction==="CURRENT_APP_CONTEXT_TRACE");
  if(repairs.length!==19)issues.push("TRACE_APP_CONTEXT_19_REQUIRED");
  if(item.state==="REST")return Object.freeze({valid:issues.length===0,issues:Object.freeze(issues)});
  const rows=item.result?.regions;
  if(!Array.isArray(rows)||rows.length!==12)issues.push("REGION_COUNT_12");
  if(!Array.isArray(item.body_map_payload?.regions)||item.body_map_payload.regions.length!==12)issues.push("BODY_MAP_COUNT_12");
  for(const row of Array.isArray(rows)?rows:[]){if(!row.regionId||!row.constructId||!row.referenceId)issues.push(`REGION_IDENTITY:${row.regionId||"UNKNOWN"}`);if(row.value!=null&&!Number.isFinite(Number(row.value)))issues.push(`NONFINITE_VALUE:${row.regionId}`);}
  return Object.freeze({valid:issues.length===0,issues:Object.freeze(issues)});
}
function upsertPrimaryRegionalV2ResultRecord(items=[],resultRecord){const next=(Array.isArray(items)?items:[]).filter((x)=>x.id!==resultRecord.id&&!(x.record_id===resultRecord.record_id&&x.source_record_revision===resultRecord.source_record_revision&&x.model_version===PRIMARY_REGIONAL_V2_MODEL_VERSION));next.push(resultRecord);return next.sort((a,b)=>String(a.record_id).localeCompare(String(b.record_id))||String(a.source_record_revision).localeCompare(String(b.source_record_revision))||String(a.id).localeCompare(String(b.id)));}
moduleExports["PRIMARY_REGIONAL_V2_MODEL_VERSION"] = PRIMARY_REGIONAL_V2_MODEL_VERSION;
moduleExports["LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION"] = LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION;
moduleExports["PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION"] = PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION;
moduleExports["PRIMARY_REGIONAL_V2_AUTHORITY_VERSION"] = PRIMARY_REGIONAL_V2_AUTHORITY_VERSION;
moduleExports["PRIMARY_REGIONAL_V2_BUILD_ID"] = PRIMARY_REGIONAL_V2_BUILD_ID;
moduleExports["buildPrimaryRegionalV2ComparisonSignature"] = buildPrimaryRegionalV2ComparisonSignature;
moduleExports["comparePrimaryRegionalV2Signatures"] = comparePrimaryRegionalV2Signatures;
moduleExports["createPrimaryRegionalV2ResultRecord"] = createPrimaryRegionalV2ResultRecord;
moduleExports["validatePrimaryRegionalV2ResultRecord"] = validatePrimaryRegionalV2ResultRecord;
moduleExports["upsertPrimaryRegionalV2ResultRecord"] = upsertPrimaryRegionalV2ResultRecord;
internalModules.primaryRegionalResultService = moduleExports;
}

// ===== core/storage/modelResultRegionalV2Repository.js =====
{
const moduleExports = Object.create(null);
const { PRIMARY_REGIONAL_V2_MODEL_VERSION, LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION } = internalModules.primaryRegionalResultService;
const { createCollectionRepository } = internalModules.collectionRepository;
const { STORAGE_KEYS } = internalModules.storageKeys;

function normalize(item = {}) {
  if (!item || typeof item !== "object" || ![PRIMARY_REGIONAL_V2_MODEL_VERSION, LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION].includes(item.model_version) || !item.id || !item.record_id) return null;
  return Object.freeze({ ...item, id: String(item.id), record_id: String(item.record_id), source_record_revision: String(item.source_record_revision || ""), generated_at: String(item.generated_at || "") });
}
function sort(items) { return [...items].sort((a,b)=>a.record_id.localeCompare(b.record_id)||a.source_record_revision.localeCompare(b.source_record_revision)||a.id.localeCompare(b.id)); }
function createModelResultRegionalV2Repository(gateway) {
  const repo=createCollectionRepository({gateway,storageKey:STORAGE_KEYS.modelResultsRegionalV2,normalizeItem:normalize,getItemId:x=>x.id,sortItems:sort});
  function loadForRecord(recordId){return repo.loadAll().filter(x=>x.record_id===recordId);}
  function findLatestForRecord(recordId){return loadForRecord(recordId).sort((a,b)=>b.source_record_revision.localeCompare(a.source_record_revision)||b.generated_at.localeCompare(a.generated_at)||b.id.localeCompare(a.id))[0]||null;}
  function latestByRecord(){const map=new Map();repo.loadAll().forEach(x=>{const cur=map.get(x.record_id);if(!cur||x.source_record_revision>cur.source_record_revision||(x.source_record_revision===cur.source_record_revision&&x.id>cur.id))map.set(x.record_id,x);});return map;}
  return Object.freeze({...repo,loadForRecord,findLatestForRecord,latestByRecord});
}
moduleExports["createModelResultRegionalV2Repository"] = createModelResultRegionalV2Repository;
internalModules.primaryRegionalResultRepository = moduleExports;
}

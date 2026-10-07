import "./surfacePresetCatalog.js";
import { internalModules } from "./modules.js";

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

// ===== core/model/currentPrimaryInput/canonicalInputSignature.js =====
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

function canonicalInputSignature(value) { return digestText(stableStringify(value)); }
moduleExports["canonicalInputSignature"] = canonicalInputSignature;
internalModules.canonicalInputSignature = moduleExports;
}

// ===== core/model/currentPrimaryInput/surfacePresets.js =====
{
const moduleExports = Object.create(null);
const { SURFACE_PRESETS } = internalModules.surfacePresetCatalog;
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

moduleExports["resolveSurfaceSelections"] = resolveSurfaceSelections;
internalModules.surfacePresets = moduleExports;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2AppAdapter.js =====
{
const moduleExports = Object.create(null);
function speedOf(record={}){const d=Number(record.distanceKm),t=Number(record.durationMinutes);return d>0&&t>0?d*1000/(t*60):null;}
function median(values=[]){const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function normalizeSurfaceCategory(v){const x=String(v||'').toUpperCase();if(x.includes('NATURAL_GRASS'))return 'NATURAL_GRASS';if(x==='PAVED'||x==='ASPHALT')return 'ASPHALT';if(x.includes('TRACK')||x.includes('RUBBER'))return 'RUBBER_TRACK';if(x.includes('TREADMILL'))return 'TREADMILL_BELT';if(x.includes('SOIL'))return 'SOIL';if(x.includes('TRAIL'))return 'TRAIL';if(x.includes('ARTIFICIAL'))return 'ARTIFICIAL_TURF';if(x.includes('SAND'))return 'SAND';return x||'UNKNOWN';}
function surfaceComponentsFromCourse(course={}){const defs=[['pavedPercent','ASPHALT'],['trackPercent','RUBBER_TRACK'],['treadmillPercent','TREADMILL_BELT'],['soilPercent','SOIL'],['trailPercent','TRAIL'],['naturalGrassPercent','NATURAL_GRASS'],['artificialTurfPercent','ARTIFICIAL_TURF'],['sandPercent','SAND']];return defs.flatMap(([k,c])=>{const n=Number(course?.[k]||0);return n>0?[{category:c,sharePercent:n}]:[]});}
function runSettingFromCourse(course={}){const t=Number(course?.treadmillPercent||0),other=['pavedPercent','trackPercent','soilPercent','trailPercent','naturalGrassPercent','artificialTurfPercent','sandPercent'].reduce((s,k)=>s+Number(course?.[k]||0),0);if(t>0&&other===0)return 'TREADMILL';if(other>0&&t===0)return 'OUTDOOR_ROUTE';if(t>0&&other>0)return 'MIXED_SETTING';return null;}
function sectionGradePercent(s={}){const g=Math.abs(Number(s.gradePercent||0));const d=String(s.gradeDirection||'FLAT').toUpperCase();if(d==='UPHILL')return g;if(d==='DOWNHILL')return -g;return 0;}
function mapSections(items=[]){return (Array.isArray(items)?items:[]).map(s=>({sharePercent:s.sharePercent??null,distanceKm:s.distanceKm??null,durationMinutes:s.durationMinutes??null,gradePercent:sectionGradePercent(s),surfaceComponents:(Array.isArray(s.surfaceComponents)?s.surfaceComponents:[]).map(c=>({category:normalizeSurfaceCategory(c.userCategory||c.category),sharePercent:Number(c.sharePercent||0)})),runSetting:null}));}
function personalHabitualCadenceReference(record={},allRecords=[]){
  if(String(record.runningFormat||'').toUpperCase()!=='CONTINUOUS_RUN')return {value:null,state:'REFERENCE_BUILDING',eligibleCount:0};
  const currentSpeed=speedOf(record);if(!(currentSpeed>0))return {value:null,state:'REFERENCE_BUILDING',eligibleCount:0};
  const sorted=[...(allRecords||[])].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.id||'').localeCompare(String(b.id||'')));
  const idx=sorted.findIndex(x=>x.id===record.id);const prior=idx>=0?sorted.slice(0,idx):sorted.filter(x=>x.id!==record.id&&String(x.date||'')<=String(record.date||''));
  const cadences=[];
  for(const r of prior){
    if(String(r.activityType||'').toLowerCase()!=='run'||String(r.runningFormat||'').toUpperCase()!=='CONTINUOUS_RUN')continue;
    if(!['DEVICE_MEASURED'].includes(String(r.stepsProvenance||'').toUpperCase()))continue;
    const sp=speedOf(r),steps=Number(r.steps),dur=Number(r.durationMinutes);if(!(sp>0&&steps>0&&dur>0))continue;
    if(Math.abs(sp-currentSpeed)>0.10+1e-12)continue;
    cadences.push(steps/dur);
  }
  return cadences.length>=3?{value:median(cadences),state:'MODEL_DERIVED_PERSONAL_REFERENCE',eligibleCount:cadences.length,speedNeighborhoodMps:0.10}:{value:null,state:'REFERENCE_BUILDING',eligibleCount:cadences.length,speedNeighborhoodMps:0.10};
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
    averageCadenceSpm:(!runWalk&&['DEVICE_MEASURED'].includes(String(record.stepsProvenance||'').toUpperCase())&&Number(record.steps)>0&&Number(record.durationMinutes)>0)?Number(record.steps)/Number(record.durationMinutes):null,
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
    allowR12GrassEnvelope:false,
  };
  return target;
}
moduleExports["personalHabitualCadenceReference"] = personalHabitualCadenceReference;
moduleExports["adaptCurrentRecordToPrimaryRegionalV2"] = adaptCurrentRecordToPrimaryRegionalV2;
internalModules.primaryRegionalAppAdapter = moduleExports;
}

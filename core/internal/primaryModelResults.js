import "./primaryInputProcessing.js";
import { internalModules } from "./modules.js";

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

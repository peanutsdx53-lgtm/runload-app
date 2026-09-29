from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"expected text not found: {path}: {old[:160]!r}")
    p.write_text(s.replace(old, new, 1))


# Engine: retain the already-produced per-segment calculation trace in each regional summary.
p = Path("core/internal/primaryModelEngine.js")
s = p.read_text()
start = s.index("function summarizeRegions(segResults){")
end = s.index("\nfunction gradeAxisSegments", start)
new = '''function summarizeRegions(segResults){
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
    const routeTrace=segResults.map((segment,index)=>{
      const x=segment.regionResults[r.id]||{};const trace=x.trace||{};
      return {
        segmentIndex:Number.isInteger(segment.index)?segment.index:index,
        distanceKm:Number(x.distanceKm||0),
        speedMps:Number.isFinite(Number(x.speedMps))?Number(x.speedMps):null,
        speedProvenance:segment.speedProvenance||null,
        remainderState:segment.remainderState||null,
        calculationState:x.state||'EVIDENCE_INSUFFICIENT',
        evidenceState:x.evidenceState||'EVIDENCE_INSUFFICIENT',
        baseline:trace.baseline?JSON.parse(JSON.stringify(trace.baseline)):null,
        appliedConditions:Array.isArray(trace.components)?JSON.parse(JSON.stringify(trace.components)):[],
        notAppliedConditions:Array.isArray(trace.unquantified)?JSON.parse(JSON.stringify(trace.unquantified)):[],
        interactionState:trace.interactionState||null,
      };
    });
    out[r.id]={value:fullValue,knownValue:supportedOnlyValue,valueEnvelope:null,supportedDistanceKm:supportedDistance,unsupportedDistanceKm:unsupportedDistance,coverageProportion:totalDistance>0?supportedDistance/totalDistance:0,state:unsupportedDistance>1e-9?'PARTIAL_EVIDENCE':fullValue==null?'EVIDENCE_INSUFFICIENT':'OK',segmentEvidence:rs.map(x=>x?.evidenceState||'EVIDENCE_INSUFFICIENT'),routeTrace};
  }return out;
}
'''
p.write_text(s[:start] + new + s[end:])
replace_once(
    "core/internal/primaryModelEngine.js",
    "const baseSeg=[{distanceKm:exposure.distanceKm,speedMps:exposure.speedMps,runSetting:record.runSetting}];",
    "const baseSeg=[{distanceKm:exposure.distanceKm,speedMps:exposure.speedMps,runSetting:record.runSetting,surfaceComponents:record.surfaceComponents}];",
)

# Persist route trace in the result contract, including axis-specific alternatives.
p = Path("core/internal/primaryModelResults.js")
s = p.read_text()
s = s.replace(
    "const PRIMARY_REGIONAL_V2_BUILD_ID = BUILD_ID;",
    'const PRIMARY_REGIONAL_V2_BUILD_ID = BUILD_ID;\nconst PRIMARY_REGIONAL_V2_ROUTE_TRACE_VERSION = "primary-regional-route-trace-v1";',
    1,
)
start = s.index("function axisRows(rawResult={}, rid){")
end = s.index("\nfunction buildRows", start)
axis = '''function axisRows(rawResult={}, rid){
  const axes=rawResult.axisEstimates||{};
  return Object.entries(axes).map(([axis, byRegion])=>{
    const r=byRegion?.[rid]||{};
    return Object.freeze({axis, value:r.value !== null && r.value !== "" && Number.isFinite(Number(r.value))?Number(r.value):null, valueEnvelope:Array.isArray(r.valueEnvelope)?clone(r.valueEnvelope):null, state:r.state||"UNAVAILABLE", evidenceState:aggregateEvidence(r), unsupportedDistanceKm:Number(r.unsupportedDistanceKm||0), routeTrace:Object.freeze(clone(r.routeTrace||[]))});
  });
}
'''
s = s[:start] + axis + s[end:]
old = '''      sourceIds:Object.freeze(sourceIdsForRegion(def.id,rawResult)),
      axisEstimates:Object.freeze(axes),'''
new2 = '''      sourceIds:Object.freeze(sourceIdsForRegion(def.id,rawResult)),
      routeTrace:Object.freeze(clone(agg.routeTrace||[])),
      axisEstimates:Object.freeze(axes),'''
if old not in s:
    raise SystemExit("result row trace anchor not found")
s = s.replace(old, new2, 1)
s = s.replace(
    'const common={id:`primary-reference100-v3-result-${sanitize(record.id)}-${sanitize(revision(record))}`,record_id:record.id,source_record_revision:revision(record),generated_at:new Date().toISOString(),model_version:PRIMARY_REGIONAL_V2_MODEL_VERSION,authority_version:PRIMARY_REGIONAL_V2_AUTHORITY_VERSION,engine_build_version:PRIMARY_REGIONAL_V2_BUILD_ID,output_semantic_version:PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION,source_registry:SOURCE_REGISTRY};',
    'const common={id:`primary-reference100-v3-result-${sanitize(record.id)}-${sanitize(revision(record))}`,record_id:record.id,source_record_revision:revision(record),generated_at:new Date().toISOString(),model_version:PRIMARY_REGIONAL_V2_MODEL_VERSION,authority_version:PRIMARY_REGIONAL_V2_AUTHORITY_VERSION,engine_build_version:PRIMARY_REGIONAL_V2_BUILD_ID,output_semantic_version:PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION,route_trace_version:PRIMARY_REGIONAL_V2_ROUTE_TRACE_VERSION,source_registry:SOURCE_REGISTRY};',
    1,
)
old = '''  if(item.output_semantic_version!==PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION)issues.push("OUTPUT_SEMANTIC_VERSION");
  if(!item.id||!item.record_id)issues.push("IDENTITY");'''
new2 = '''  if(item.output_semantic_version!==PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION)issues.push("OUTPUT_SEMANTIC_VERSION");
  if(item.route_trace_version!==PRIMARY_REGIONAL_V2_ROUTE_TRACE_VERSION)issues.push("ROUTE_TRACE_VERSION");
  if(!item.id||!item.record_id)issues.push("IDENTITY");'''
if old not in s:
    raise SystemExit("validation trace version anchor not found")
s = s.replace(old, new2, 1)
old = '''  for(const row of Array.isArray(rows)?rows:[]){if(!row.regionId||!row.constructId||!row.referenceId)issues.push(`REGION_IDENTITY:${row.regionId||"UNKNOWN"}`);if(row.value!=null&&!Number.isFinite(Number(row.value)))issues.push(`NONFINITE_VALUE:${row.regionId}`);}'''
new2 = '''  for(const row of Array.isArray(rows)?rows:[]){if(!row.regionId||!row.constructId||!row.referenceId)issues.push(`REGION_IDENTITY:${row.regionId||"UNKNOWN"}`);if(row.value!=null&&!Number.isFinite(Number(row.value)))issues.push(`NONFINITE_VALUE:${row.regionId}`);if(!Array.isArray(row.routeTrace)||!row.routeTrace.length)issues.push(`ROUTE_TRACE:${row.regionId||"UNKNOWN"}`);}'''
if old not in s:
    raise SystemExit("row validation anchor not found")
s = s.replace(old, new2, 1)
s = s.replace(
    'moduleExports["PRIMARY_REGIONAL_V2_BUILD_ID"] = PRIMARY_REGIONAL_V2_BUILD_ID;',
    'moduleExports["PRIMARY_REGIONAL_V2_BUILD_ID"] = PRIMARY_REGIONAL_V2_BUILD_ID;\nmoduleExports["PRIMARY_REGIONAL_V2_ROUTE_TRACE_VERSION"] = PRIMARY_REGIONAL_V2_ROUTE_TRACE_VERSION;',
    1,
)
s = s.replace(
    'JIN_2018: { label: "Jin 2018", role: "R01/R08 低速側P2 bridge" },',
    'JIN_2018: { label: "Jin 2018", role: "股関節部・足関節部の低速側で用いる限定的な資料間接続" },',
    1,
)
s = s.replace(
    'LI_2020: { label: "Li 2020", role: "R10-R12 高速側P2 bridge" },',
    'LI_2020: { label: "Li 2020", role: "後足部・足底中部・前足部の高速側で用いる限定的な資料間接続" },',
    1,
)
p.write_text(s)

# Interpretation: consume the persisted actual route trace instead of reconstructing version-locked routes.
p = Path("core/interpretationCore.js")
s = p.read_text()
for line in [
    'const SPEED_ONLY_PRIMARY_REGIONS = new Set(["R01", "R02", "R03", "R04", "R07", "R08", "R11", "R12"]);\n',
    'const CONDITIONAL_PRIMARY_REGIONS = new Set(["R05", "R06", "R09", "R10"]);\n',
    'const CADENCE_CAPABLE_PRIMARY_REGIONS = new Set(["R05", "R09"]);\n',
    'const GRADE_CAPABLE_PRIMARY_REGIONS = new Set(["R05", "R06", "R09", "R10"]);\n',
]:
    s = s.replace(line, "", 1)
s = s.replace(
    'const INTERPRETATION_ROUTE_RESOLVER_VERSION = "primary-reference100-v3-explanation-route-v1";',
    'const INTERPRETATION_ROUTE_RESOLVER_VERSION = "persisted-calculation-route-trace-v1";',
    1,
)
start = s.index('function inputItem(id, value, role, source = "engine_input_snapshot") {')
end = s.index("\nfunction overviewRegion", start)
resolver = '''function inputItem(id, value, role, source = "engine_input_snapshot", details = {}) {
  return Object.freeze({ id, value, role, source, ...details });
}

function pushUniqueInput(items, item) {
  const key = `${item.id}|${item.role}|${item.reasonCategory || ""}`;
  if (!items.some((existing) => `${existing.id}|${existing.role}|${existing.reasonCategory || ""}` === key)) items.push(item);
}

function traceReasonCategory(item = {}) {
  const state = String(item.state || "");
  const reason = String(item.reason || "");
  if (state === "CONTEXT_ONLY") return "CONTEXT_ONLY";
  if (state === "REFERENCE_BUILDING") return "REFERENCE_NOT_READY";
  if (reason.includes("OUTSIDE")) return "OUTSIDE_SUPPORTED_RANGE";
  if (reason.includes("NOT_AUTHORIZED") || reason.includes("INACTIVE")) return "NOT_USED_CURRENT_MODEL";
  return "NOT_USED_CURRENT_ROUTE";
}

function traceAxisValue(axis = "", engineInput = {}) {
  if (axis === "CADENCE") return finite(engineInput.averageCadenceSpm) ? Number(engineInput.averageCadenceSpm) : null;
  if (axis === "GRADE") return "RECORDED";
  if (axis === "SURFACE") return engineInput.surfaceComponents || [];
  if (axis === "FOOT_STRIKE") return engineInput.footStrikeObservation || null;
  return null;
}

function resolveCalculationPath(targetExperience = null, region = null) {
  const resultRecord = targetExperience?.regionalV2ResultRecord || {};
  const row = region ? regionRow(resultRecord, region.regionId) : null;
  const engineInput = resultRecord?.engine_input_snapshot || null;
  const modelVersion = String(resultRecord?.model_version || "");
  const exposure = exposureFacts(resultRecord);
  const routeTrace = Array.isArray(row?.routeTrace) ? row.routeTrace : [];

  const unavailable = (reasonToken) => Object.freeze({
    resolutionStatus: "UNAVAILABLE",
    resolutionBasis: "NONE",
    resolverVersion: INTERPRETATION_ROUTE_RESOLVER_VERSION,
    activeRoute: "UNKNOWN",
    exposure,
    activeInputs: Object.freeze([]),
    conditionalInputs: Object.freeze([]),
    contextOnlyInputs: Object.freeze([]),
    unsupportedInputs: Object.freeze([]),
    routeTrace: Object.freeze([]),
    explanationTokens: Object.freeze([reasonToken]),
  });

  if (!region || !row || modelVersion !== CURRENT_PRIMARY_MODEL_VERSION) return unavailable("CURRENT_MODEL_RESULT_REQUIRED");
  if (String(row.calculationState || "") !== "CALCULATED" || !finite(row.value)) return unavailable("CALCULATED_REGION_REQUIRED");
  if (!engineInput) return unavailable("ENGINE_INPUT_SNAPSHOT_REQUIRED");
  if (!routeTrace.length) return unavailable("PERSISTED_ROUTE_TRACE_REQUIRED");

  const activeInputs = [];
  if (exposure.type === "RUNNING_PHASE") {
    activeInputs.push(inputItem("RUNNING_DISTANCE", exposure.distanceKm, "DERIVE_SPEED"));
    activeInputs.push(inputItem("RUNNING_DURATION", exposure.durationMinutes, "DERIVE_SPEED"));
  } else if (exposure.type === "WHOLE_RUN") {
    activeInputs.push(inputItem("DISTANCE", exposure.distanceKm, "DERIVE_SPEED"));
    activeInputs.push(inputItem("DURATION", exposure.durationMinutes, "DERIVE_SPEED"));
  }
  if (finite(exposure.speedMps)) activeInputs.push(inputItem("SPEED", exposure.speedMps, "PRIMARY_NUMERIC_ROUTE", "persisted_result.exposure"));

  const usedAxes = new Set();
  const observedAxes = new Set();
  const contextOnlyInputs = [];
  const unsupportedInputs = [];
  for (const segment of routeTrace) {
    for (const component of Array.isArray(segment?.appliedConditions) ? segment.appliedConditions : []) {
      const axis = String(component?.axis || "").toUpperCase();
      if (!axis) continue;
      observedAxes.add(axis);
      usedAxes.add(axis);
      if (["CADENCE", "GRADE"].includes(axis)) pushUniqueInput(activeInputs, inputItem(axis, traceAxisValue(axis, engineInput), "USED_IN_CURRENT_ROUTE", "persisted_result.route_trace"));
    }
    for (const omitted of Array.isArray(segment?.notAppliedConditions) ? segment.notAppliedConditions : []) {
      const axis = String(omitted?.axis || "").toUpperCase();
      if (!axis) continue;
      observedAxes.add(axis);
      const reasonCategory = traceReasonCategory(omitted);
      const item = inputItem(axis, traceAxisValue(axis, engineInput), reasonCategory === "CONTEXT_ONLY" ? "RECORDED_CONTEXT" : "RECORDED_NOT_USED_NUMERIC", "persisted_result.route_trace", { reasonCategory, reasonCode: String(omitted?.reason || "") });
      if (reasonCategory === "CONTEXT_ONLY") pushUniqueInput(contextOnlyInputs, item);
      else pushUniqueInput(unsupportedInputs, item);
    }
  }

  if (finite(engineInput.averageCadenceSpm) && !observedAxes.has("CADENCE")) {
    pushUniqueInput(unsupportedInputs, inputItem("CADENCE", Number(engineInput.averageCadenceSpm), "RECORDED_NOT_USED_NUMERIC", "persisted_result.route_trace", { reasonCategory: "NOT_USED_CURRENT_ROUTE", reasonCode: "NOT_PRESENT_IN_FINAL_ROUTE_TRACE" }));
  }
  if (gradeRecorded(engineInput) && !observedAxes.has("GRADE")) {
    pushUniqueInput(unsupportedInputs, inputItem("GRADE", "RECORDED", "RECORDED_NOT_USED_NUMERIC", "persisted_result.route_trace", { reasonCategory: "NOT_USED_CURRENT_ROUTE", reasonCode: "NOT_PRESENT_IN_FINAL_ROUTE_TRACE" }));
  }
  if (surfaceRecorded(engineInput) && !observedAxes.has("SURFACE")) {
    pushUniqueInput(contextOnlyInputs, inputItem("SURFACE", engineInput.surfaceComponents, "RECORDED_CONTEXT", "persisted_result.route_trace", { reasonCategory: "CONTEXT_ONLY", reasonCode: "NO_ACTIVE_PRIMARY_NUMERIC_SURFACE_ROUTE" }));
  }
  if (engineInput.footStrikeObservation && !observedAxes.has("FOOT_STRIKE")) {
    pushUniqueInput(contextOnlyInputs, inputItem("FOOT_STRIKE", engineInput.footStrikeObservation, "RECORDED_CONTEXT", "persisted_result.route_trace", { reasonCategory: "CONTEXT_ONLY", reasonCode: "NO_ACTIVE_PRIMARY_NUMERIC_FOOT_STRIKE_ROUTE" }));
  }

  if (String(resultRecord?.result?.combinedConditionState || "") === "AXES_PRESERVED_NOT_COMBINED") {
    for (const axisRow of Array.isArray(row.axisEstimates) ? row.axisEstimates : []) {
      const axis = String(axisRow?.axis || "").toUpperCase();
      const alternativeUsed = (axisRow?.routeTrace || []).some((segment) => (segment?.appliedConditions || []).some((component) => String(component?.axis || "").toUpperCase() === axis));
      if (alternativeUsed && !usedAxes.has(axis)) {
        pushUniqueInput(unsupportedInputs, inputItem(axis, traceAxisValue(axis, engineInput), "RECORDED_NOT_USED_NUMERIC", "persisted_result.axis_estimate", { reasonCategory: "AXIS_PRESERVED_NOT_COMBINED", reasonCode: "AXES_PRESERVED_NOT_COMBINED" }));
      }
    }
  }

  return Object.freeze({
    resolutionStatus: "EXACT",
    resolutionBasis: "PERSISTED_CALCULATION_TRACE",
    resolverVersion: INTERPRETATION_ROUTE_RESOLVER_VERSION,
    activeRoute: "PERSISTED_ROUTE_TRACE",
    exposure,
    activeInputs: frozenArray(activeInputs),
    conditionalInputs: Object.freeze([]),
    contextOnlyInputs: frozenArray(contextOnlyInputs),
    unsupportedInputs: frozenArray(unsupportedInputs),
    routeTrace: frozenArray(routeTrace),
    explanationTokens: Object.freeze(["PERSISTED_CALCULATION_TRACE", "USED_AND_NOT_USED_CONDITIONS_SEPARATED"]),
  });
}
'''
p.write_text(s[:start] + resolver + s[end:])

replace_once(
    "core/interpretationCore.js",
    '  const contextOnly = new Set((path?.contextOnlyInputs || []).map((item) => String(item.id || "")));',
    '  const contextOnly = new Set((path?.contextOnlyInputs || []).map((item) => String(item.id || "")));\n  const unsupported = new Set((path?.unsupportedInputs || []).map((item) => String(item.id || "")));',
)
replace_once(
    "core/interpretationCore.js",
    '  if (ids.some((id) => contextOnly.has(id))) return "RECORDED_CONTEXT";\n  return "NOT_IDENTIFIED_IN_REGION_ROUTE";',
    '  if (ids.some((id) => contextOnly.has(id))) return "RECORDED_CONTEXT";\n  if (ids.some((id) => unsupported.has(id))) return "RECORDED_NOT_USED_NUMERIC";\n  return "NOT_IDENTIFIED_IN_REGION_ROUTE";',
)

# Human-readable presentation for persisted trace categories.
replace_once(
    "ui/interpretationRoomPresentation.js",
    '  if (value === "RECORDED_CONTEXT") return "関連情報として記録";\n  if (value === "NOT_IDENTIFIED_IN_REGION_ROUTE") return "この部位の計算経路では確認せず";',
    '  if (value === "RECORDED_CONTEXT") return "関連情報として記録";\n  if (value === "RECORDED_NOT_USED_NUMERIC") return "記録あり・この部位の数値計算には未使用";\n  if (value === "NOT_IDENTIFIED_IN_REGION_ROUTE") return "この部位の計算経路では確認せず";',
)
replace_once(
    "ui/interpretationRoomPresentation.js",
    "function renderCalculationDetails(region) {",
    '''function unsupportedBucket(item = {}) {
  if (item.reasonCategory === "OUTSIDE_SUPPORTED_RANGE") return "確認できる資料範囲外・数値には未使用";
  if (item.reasonCategory === "REFERENCE_NOT_READY") return "比較基準を準備中・数値には未使用";
  if (item.reasonCategory === "AXIS_PRESERVED_NOT_COMBINED") return "別条件と同時には組み合わせず・数値には未使用";
  return "現在の計算では数値に未使用";
}

function renderCalculationDetails(region) {''',
)
replace_once(
    "ui/interpretationRoomPresentation.js",
    '    ...(path.contextOnlyInputs || []).map((item) => ({ ...item, bucket: "関連情報として記録" })),\n  ];',
    '    ...(path.contextOnlyInputs || []).map((item) => ({ ...item, bucket: "関連情報として記録（数値には未使用）" })),\n    ...(path.unsupportedInputs || []).map((item) => ({ ...item, bucket: unsupportedBucket(item) })),\n  ];',
)
replace_once(
    "ui/interpretationRoomPresentation.js",
    '    <p class="interpretation-room-boundary-line">ここでは、この部位の数値を計算するときに使った記録項目を確認できます。</p>',
    '    <p class="interpretation-room-boundary-line">数値に使った条件、記録したが数値には使わなかった条件、関連情報を分けて表示します。</p>',
)

# Remove an internal research label from user-facing accessible text.
replace_once(
    "screens/resultScreen.js",
    "研究上、この比較方法をReference-100と呼びます。",
    "各部位自身の基準条件を100として比べる表示です。",
)

# Regression guard for Stage 4A architecture.
p = Path("tests/interpretationArchitecture.test.mjs")
s = p.read_text()
anchor = "\nconst failed=results.filter((x)=>x.status==='FAIL');"
test = '''

await test('PERSISTED-ROUTE-TRACE-IS-THE-INTERPRETATION-AUTHORITY',()=>{
  const engine=read('core/internal/primaryModelEngine.js');
  const resultsService=read('core/internal/primaryModelResults.js');
  const core=read('core/interpretationCore.js');
  const presentation=read('ui/interpretationRoomPresentation.js');
  const resultScreen=read('screens/resultScreen.js');
  assert.match(engine,/routeTrace/);
  assert.match(resultsService,/route_trace_version/);
  assert.match(resultsService,/routeTrace:Object\\.freeze/);
  assert.match(core,/PERSISTED_CALCULATION_TRACE/);
  assert.match(core,/unsupportedInputs/);
  assert.doesNotMatch(core,/PERSISTED_INPUTS_WITHOUT_SEGMENT_ROUTE_TRACE|PERSISTED_RESULT_DOES_NOT_RETAIN_FINAL_CONDITIONAL_ROUTE_TRACE|VERSION_LOCKED_REGION_ROUTE/);
  assert.match(presentation,/確認できる資料範囲外・数値には未使用/);
  assert.match(presentation,/関連情報として記録（数値には未使用）/);
  assert.doesNotMatch(resultScreen,/Reference-100/);
  assert.doesNotMatch(resultsService,/P2 bridge|R01\\/R08|R10-R12/);
});
'''
if anchor not in s:
    raise SystemExit("interpretation architecture anchor not found")
p.write_text(s.replace(anchor, test + anchor, 1))

# PWA version bump for changed runtime modules.
old = "2026.09.29.4"
newv = "2026.09.29.5"
version_tests = [p for p in Path("tests").glob("*.mjs") if old in p.read_text()]
expected = {
    "tests/currentOnlyRecordSchema.test.mjs",
    "tests/mobileHomeAtomicDropCoordinator.test.mjs",
    "tests/mobileHomeInitialLayout.test.mjs",
    "tests/mobileHomeIosScrollCapacity.test.mjs",
    "tests/runMeasurementNotifications.test.mjs",
}
actual = {str(p) for p in version_tests}
if actual != expected:
    raise SystemExit(f"unexpected version test files: {sorted(actual)}")
for file in [Path("ui/appVersionStatus.js"), Path("service-worker.js"), *version_tests]:
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"old version absent: {file}")
    file.write_text(text.replace(old, newv))

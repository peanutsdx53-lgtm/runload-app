import "./publicHelpGuidance.js";
import { internalModules } from "./modules.js";

// ===== core/model/v27/v27Personal.js =====
{
const moduleExports = Object.create(null);
const { V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS, V27_MODEL_VERSION } = internalModules.legacyLoadModelConstants;
const { isFiniteNumber, median, requirePositiveFinite } = internalModules.legacyLoadMath;

function deriveV27PersonalCadenceDelta({
  targetSessionId,
  currentSpeedMps,
  currentCadenceSpm,
  currentCadenceProvenanceReliable,
  priorRecords = [],
  speedToleranceMps = V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS,
}) {
  requirePositiveFinite(speedToleranceMps, "speedToleranceMps");
  if (
    !isFiniteNumber(currentCadenceSpm)
    || currentCadenceSpm <= 0
    || !currentCadenceProvenanceReliable
  ) {
    return Object.freeze({
      state: "NOT_APPLICABLE",
      eligible_n: 0,
      expected_cadence_spm: null,
      delta_spm: null,
    });
  }
  const eligible = priorRecords.filter((item) => (
    item.session_id !== targetSessionId
    && item.model_version === V27_MODEL_VERSION
    && item.activity_type === "CONTINUOUS_RUN"
    && item.cadence_provenance_reliable === true
    && isFiniteNumber(item.speed_mps)
    && isFiniteNumber(item.cadence_spm)
    && item.cadence_spm > 0
    && Math.abs(item.speed_mps - currentSpeedMps) <= speedToleranceMps
  ));
  if (eligible.length < 3) {
    return Object.freeze({
      state: "BUILDING_REFERENCE",
      eligible_n: eligible.length,
      expected_cadence_spm: null,
      delta_spm: null,
    });
  }
  const expected = median(eligible.map((item) => item.cadence_spm));
  return Object.freeze({
    state: "AVAILABLE",
    eligible_n: eligible.length,
    expected_cadence_spm: expected,
    delta_spm: currentCadenceSpm - expected,
    speed_tolerance_mps: speedToleranceMps,
  });
}

function deriveV27PersonalCadenceSensitivity(input) {
  const tolerances = [0.05, 0.1, 0.15];
  const byTolerance = Object.fromEntries(tolerances.map((tolerance) => [
    String(tolerance),
    deriveV27PersonalCadenceDelta({ ...input, speedToleranceMps: tolerance }),
  ]));
  const central = byTolerance["0.1"];
  const allAvailable = Object.values(byTolerance).every((item) => item.state === "AVAILABLE");
  const robustnessState = allAvailable
    ? "ROBUST_ACROSS_DECLARED_TOLERANCES"
    : central.state === "AVAILABLE"
      ? "TOLERANCE_DEPENDENT"
      : "UNAVAILABLE_AT_CENTRAL_TOLERANCE";
  return Object.freeze({
    central,
    by_tolerance_mps: Object.freeze(byTolerance),
    robustness_state: robustnessState,
  });
}

function calculateV27PersonalRelative({
  targetSessionId,
  currentRegionResult,
  priorResults = [],
}) {
  const eligible = priorResults.filter((item) => (
    item.session_id !== targetSessionId
    && item.model_version === V27_MODEL_VERSION
    && item.coverage_signature === currentRegionResult.coverage_signature
    && isFiniteNumber(item.raw_exposure)
    && item.raw_exposure > 0
  ));
  if (eligible.length < 3) {
    return Object.freeze({
      state: "BUILDING_REFERENCE",
      eligible_n: eligible.length,
      value: null,
    });
  }
  const referenceMedian = median(eligible.map((item) => item.raw_exposure));
  const sortedDates = eligible
    .map((item) => item.date)
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")))
    .sort();
  return Object.freeze({
    state: eligible.length < 6 ? "PROVISIONAL" : "AVAILABLE",
    eligible_n: eligible.length,
    reference_median: referenceMedian,
    value: 100 * currentRegionResult.raw_exposure / referenceMedian,
    reference_revision_ids: Object.freeze(eligible.map((item) => item.result_id || item.session_id)),
    first_date: sortedDates[0] || null,
    last_date: sortedDates.at(-1) || null,
    target_excluded: eligible.every((item) => item.session_id !== targetSessionId),
  });
}
moduleExports["deriveV27PersonalCadenceDelta"] = deriveV27PersonalCadenceDelta;
moduleExports["deriveV27PersonalCadenceSensitivity"] = deriveV27PersonalCadenceSensitivity;
moduleExports["calculateV27PersonalRelative"] = calculateV27PersonalRelative;
internalModules.legacyLoadPersonalAdjustment = moduleExports;
}

// ===== core/model/v27/v27InputAdapter.js =====
{
const moduleExports = Object.create(null);
const { V27_ACTIVITY_TYPES, V27_MODEL_VERSION, V27_SURFACE_FACTORS } = internalModules.legacyLoadModelConstants;
const { deriveV27PersonalCadenceSensitivity } = internalModules.legacyLoadPersonalAdjustment;
const { reportedRpeValue } = internalModules.rpeProvenance;

const GRADE_KNOWLEDGE = new Set(["UNKNOWN", "KNOWN_FLAT", "KNOWN_PROFILE"]);
const ACTIVITY_FORMATS = new Set(Object.values(V27_ACTIVITY_TYPES));
const RELIABLE_CADENCE_SOURCES = new Set(["DEVICE_MEASURED", "DEVICE_SYNCED"]);

function optionalFiniteNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function explicitActivityFormat(record) {
  const value = String(record.runningFormat || "UNKNOWN").toUpperCase();
  return ACTIVITY_FORMATS.has(value) ? value : "UNKNOWN";
}

function createGradeProfile(course, errors, warnings) {
  let knowledge = String(course.gradeKnowledge || "UNKNOWN").toUpperCase();
  if (!GRADE_KNOWLEDGE.has(knowledge)) {
    errors.push({ field: "gradeKnowledge", code: "INVALID_GRADE_KNOWLEDGE" });
    knowledge = "UNKNOWN";
  }
  if (knowledge === "UNKNOWN") {
    const hasUnappliedGradeValues = [
      course.upPercent,
      course.downPercent,
      course.upGradePercent,
      course.downGradePercent,
    ].some((value) => Number(value || 0) !== 0);
    if (hasUnappliedGradeValues) {
      warnings.push({
        field: "course",
        code: "GRADE_VALUES_NOT_APPLIED_WITHOUT_KNOWLEDGE_STATE",
      });
    }
    return [{ share_pct: 100, grade_pct: null }];
  }
  if (knowledge === "KNOWN_FLAT") {
    return [{ share_pct: 100, grade_pct: 0 }];
  }

  const upShare = optionalFiniteNumber(course.upPercent);
  const downShare = optionalFiniteNumber(course.downPercent);
  const upGrade = optionalFiniteNumber(course.upGradePercent);
  const downGrade = optionalFiniteNumber(course.downGradePercent);
  const values = [
    ["upPercent", upShare],
    ["downPercent", downShare],
    ["upGradePercent", upGrade],
    ["downGradePercent", downGrade],
  ];
  values.forEach(([field, value]) => {
    if (!Number.isFinite(value) || value < 0) {
      errors.push({ field, code: "INVALID_GRADE_PROFILE_VALUE" });
    }
  });
  if (errors.length) return [{ share_pct: 100, grade_pct: null }];
  if (upShare > 100 || downShare > 100 || upShare + downShare > 100) {
    errors.push({ field: "course", code: "GRADE_SHARE_SUM_EXCEEDS_100" });
    return [{ share_pct: 100, grade_pct: null }];
  }
  if (upShare > 0 && upGrade <= 0) {
    errors.push({ field: "upGradePercent", code: "UPHILL_REQUIRES_POSITIVE_GRADE" });
  }
  if (downShare > 0 && downGrade <= 0) {
    errors.push({ field: "downGradePercent", code: "DOWNHILL_REQUIRES_POSITIVE_MAGNITUDE" });
  }
  if (errors.length) return [{ share_pct: 100, grade_pct: null }];
  const flatShare = 100 - upShare - downShare;
  return [
    ...(flatShare > 0 ? [{ share_pct: flatShare, grade_pct: 0 }] : []),
    ...(upShare > 0 ? [{ share_pct: upShare, grade_pct: upGrade }] : []),
    ...(downShare > 0 ? [{ share_pct: downShare, grade_pct: -downGrade }] : []),
  ];
}

function createSurfaceProfile(course, errors) {
  if (Array.isArray(course.modelSurfaceProfile) && course.modelSurfaceProfile.length) {
    const profile = course.modelSurfaceProfile.map((item, index) => {
      const share = optionalFiniteNumber(item.sharePercent);
      const surfaceClass = String(item.surfaceClass || "UNKNOWN");
      if (!Number.isFinite(share) || share < 0 || share > 100) {
        errors.push({ field: `modelSurfaceProfile.${index}`, code: "INVALID_SURFACE_SHARE" });
      }
      if (!V27_SURFACE_FACTORS[surfaceClass]) {
        errors.push({ field: `modelSurfaceProfile.${index}`, code: "INVALID_SURFACE_CLASS" });
      }
      return { share_pct: share, surface_class: surfaceClass };
    });
    if (
      profile.every((item) => Number.isFinite(item.share_pct))
      && Math.abs(profile.reduce((sum, item) => sum + item.share_pct, 0) - 100) > 0.01
    ) {
      errors.push({ field: "modelSurfaceProfile", code: "SURFACE_SHARE_SUM_NOT_100" });
    }
    return profile;
  }
  const surfaceClass = String(course.modelSurfaceClass || "UNKNOWN");
  if (!V27_SURFACE_FACTORS[surfaceClass]) {
    errors.push({ field: "modelSurfaceClass", code: "INVALID_SURFACE_CLASS" });
    return [{ share_pct: 100, surface_class: "UNKNOWN" }];
  }
  return [{ share_pct: 100, surface_class: surfaceClass }];
}

function createOrderedSections(course, errors) {
  if (!Array.isArray(course.sections) || !course.sections.length) return null;
  const sections = course.sections.map((item, index) => {
    const distance = optionalFiniteNumber(item.distanceKm);
    const grade = optionalFiniteNumber(item.gradePercent);
    const surfaceClass = String(item.surfaceClass || "UNKNOWN");
    if (!Number.isFinite(distance) || distance <= 0) {
      errors.push({ field: `sections.${index}.distanceKm`, code: "INVALID_SECTION_DISTANCE" });
    }
    if (grade !== null && !Number.isFinite(grade)) {
      errors.push({ field: `sections.${index}.gradePercent`, code: "INVALID_SECTION_GRADE" });
    }
    if (!V27_SURFACE_FACTORS[surfaceClass]) {
      errors.push({ field: `sections.${index}.surfaceClass`, code: "INVALID_SURFACE_CLASS" });
    }
    return {
      distance_km: distance,
      grade_pct: grade,
      surface_class: surfaceClass,
    };
  });
  return sections;
}

function readCadence(record, durationMinutes) {
  const source = String(record.cadenceProvenance || record.stepsProvenance || "UNKNOWN").toUpperCase();
  const directCadence = optionalFiniteNumber(record.cadenceSpm);
  const steps = optionalFiniteNumber(record.steps);
  const cadence = Number.isFinite(directCadence) && directCadence > 0
    ? directCadence
    : Number.isFinite(steps) && steps > 0 && durationMinutes > 0
      ? steps / durationMinutes
      : null;
  return Object.freeze({
    cadence_spm: cadence,
    source,
    reliable: cadence != null && RELIABLE_CADENCE_SOURCES.has(source),
    derivation: Number.isFinite(directCadence) && directCadence > 0
      ? "MEASURED_CADENCE"
      : cadence != null
        ? "RELIABLE_STEPS_DIVIDED_BY_ACTIVE_MINUTES"
        : "UNAVAILABLE",
  });
}

function adaptRecordToV27Session(record, { priorCadenceFacts = [] } = {}) {
  const errors = [];
  const warnings = [];
  if (String(record.activityType || "").toLowerCase() === "rest") {
    return Object.freeze({
      ok: true,
      state: "REST",
      errors: Object.freeze([]),
      warnings: Object.freeze([]),
      session: null,
      provenance: Object.freeze({ model_version: V27_MODEL_VERSION }),
    });
  }
  const distance = optionalFiniteNumber(record.distanceKm);
  const duration = optionalFiniteNumber(record.durationMinutes);
  if (!Number.isFinite(distance) || distance <= 0) {
    errors.push({ field: "distanceKm", code: "DISTANCE_REQUIRED_POSITIVE" });
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    errors.push({ field: "durationMinutes", code: "ACTIVE_DURATION_REQUIRED_POSITIVE" });
  }
  const course = record.course && typeof record.course === "object" ? record.course : {};
  const sections = createOrderedSections(course, errors);
  if (
    sections
    && sections.every((section) => Number.isFinite(section.distance_km))
    && Number.isFinite(distance)
    && Math.abs(sections.reduce((sum, section) => sum + section.distance_km, 0) - distance) > 0.01
  ) {
    errors.push({ field: "sections", code: "SECTION_DISTANCE_SUM_MISMATCH" });
  }
  const gradeProfile = sections ? null : createGradeProfile(course, errors, warnings);
  const surfaceProfile = sections ? null : createSurfaceProfile(course, errors);
  const activityType = explicitActivityFormat(record);
  const rpe = reportedRpeValue(record);
  if (rpe != null && (!Number.isFinite(rpe) || rpe < 0 || rpe > 10)) {
    errors.push({ field: "perceivedExertion", code: "INVALID_RPE" });
  }
  if (errors.length) {
    return Object.freeze({
      ok: false,
      state: "INVALID",
      errors: Object.freeze(errors),
      warnings: Object.freeze(warnings),
      session: null,
      provenance: null,
    });
  }

  const speedMps = distance * 1000 / (duration * 60);
  const cadence = readCadence(record, duration);
  const cadenceSensitivity = deriveV27PersonalCadenceSensitivity({
    targetSessionId: record.id,
    currentSpeedMps: speedMps,
    currentCadenceSpm: cadence.cadence_spm,
    currentCadenceProvenanceReliable: cadence.reliable,
    priorRecords: priorCadenceFacts,
  });
  const session = Object.freeze({
    session_id: String(record.id || ""),
    distance_km: distance,
    active_minutes: duration,
    ...(sections ? { sections: Object.freeze(sections) } : {
      grade_profile: Object.freeze(gradeProfile),
      surface_profile: Object.freeze(surfaceProfile),
    }),
    activity_type: activityType,
    rpe,
    cadence_delta_spm: cadenceSensitivity.central.delta_spm,
    cadence_provenance_reliable: cadence.reliable,
    cadence_reference_n: cadenceSensitivity.central.eligible_n,
    cadence_robustness_state: cadenceSensitivity.robustness_state,
  });
  return Object.freeze({
    ok: true,
    state: "RUN",
    errors: Object.freeze([]),
    warnings: Object.freeze(warnings),
    session,
    provenance: Object.freeze({
      model_version: V27_MODEL_VERSION,
      distance_source: "USER_RECORDED",
      active_duration_source: "USER_RECORDED",
      speed_source: "DERIVED_DISTANCE_ACTIVE_DURATION",
      speed_mps: speedMps,
      activity_type_source: activityType === "UNKNOWN" ? "UNKNOWN" : "USER_SELECTED",
      cadence_source: cadence.source,
      cadence_derivation: cadence.derivation,
      cadence_spm: cadence.cadence_spm,
      cadence_sensitivity: cadenceSensitivity,
      grade_representation: sections ? "PAIRED_ORDERED_SECTIONS" : "MARGINAL_PROFILE",
      surface_representation: sections ? "PAIRED_ORDERED_SECTIONS" : "MARGINAL_PROFILE",
      unknown_not_replaced: true,
      no_silent_normalization: true,
    }),
  });
}
moduleExports["adaptRecordToV27Session"] = adaptRecordToV27Session;
internalModules.legacyLoadInputAdapter = moduleExports;
}

// ===== core/model/v27/v27ResultService.js =====
{
const moduleExports = Object.create(null);
const { V27_EMPHASIS_REGION_IDS, V27_MODEL_VERSION, V27_REGIONAL_VIEW_IDS } = internalModules.legacyLoadModelConstants;
const { adaptRecordToV27Session } = internalModules.legacyLoadInputAdapter;
const { assertV27ResultSemantics, calculateV27Session } = internalModules.legacyLoadModel;
const { calculateV27PersonalRelative } = internalModules.legacyLoadPersonalAdjustment;

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function recordOrder(record) {
  return `${String(record.date || "")}\u0000${String(record.id || "")}`;
}

function resultId(record) {
  return [
    "v27-result",
    String(record.id || "").replace(/[^a-zA-Z0-9._-]/g, "_"),
    String(record.updatedAt || record.createdAt || "").replace(/[^0-9A-Za-z]/g, ""),
  ].join("-");
}

function latestPriorSnapshots(targetRecord, allRecords, existingResultRecords) {
  const recordById = new Map(allRecords.map((record) => [record.id, record]));
  const targetOrder = recordOrder(targetRecord);
  const latest = new Map();
  existingResultRecords.forEach((resultRecord) => {
    const sourceRecord = recordById.get(resultRecord.record_id)
      || resultRecord.input_snapshot?.record;
    if (!sourceRecord || recordOrder(sourceRecord) >= targetOrder) return;
    const current = latest.get(resultRecord.record_id);
    if (
      !current
      || resultRecord.source_record_revision > current.source_record_revision
      || (
        resultRecord.source_record_revision === current.source_record_revision
        && resultRecord.id > current.id
      )
    ) {
      latest.set(resultRecord.record_id, resultRecord);
    }
  });
  return [...latest.values()];
}

function cadenceFacts(priorSnapshots) {
  return priorSnapshots
    .filter((snapshot) => snapshot.state === "RUN" && snapshot.derived_facts)
    .map((snapshot) => ({
      session_id: snapshot.record_id,
      model_version: snapshot.model_version,
      activity_type: snapshot.derived_facts.activity_type,
      cadence_provenance_reliable: snapshot.derived_facts.cadence_provenance_reliable,
      speed_mps: snapshot.derived_facts.speed_mps,
      cadence_spm: snapshot.derived_facts.cadence_spm,
    }));
}

function priorRegionalFacts(priorSnapshots, regionId) {
  return priorSnapshots.flatMap((snapshot) => {
    const row = snapshot.result?.regional?.[regionId];
    if (!row) return [];
    return [{
      session_id: snapshot.record_id,
      result_id: snapshot.id,
      model_version: snapshot.model_version,
      coverage_signature: row.coverage_signature,
      raw_exposure: row.raw_exposure,
      date: snapshot.input_snapshot?.record?.date || "",
    }];
  });
}

function personalReferenceSnapshots(record, result, priorSnapshots, generatedAt) {
  return Object.freeze(Object.fromEntries(V27_EMPHASIS_REGION_IDS.map((regionId) => {
    const personal = calculateV27PersonalRelative({
      targetSessionId: record.id,
      currentRegionResult: result.regional[regionId],
      priorResults: priorRegionalFacts(priorSnapshots, regionId),
    });
    return [regionId, Object.freeze({
      ...personal,
      personal_reference_snapshot_id: `${resultId(record)}-personal-${regionId}`,
      region_id: regionId,
      coverage_signature: result.regional[regionId].coverage_signature,
      generated_at_cutoff: generatedAt,
      target_session_id: record.id,
      target_excluded: true,
    })];
  })));
}

function createV27ResultRecord({
  record,
  allRecords = [],
  existingResultRecords = [],
}) {
  const generatedAt = String(record.updatedAt || record.createdAt || new Date().toISOString());
  const priorSnapshots = latestPriorSnapshots(record, allRecords, existingResultRecords);
  const adaptation = adaptRecordToV27Session(record, {
    priorCadenceFacts: cadenceFacts(priorSnapshots),
  });
  if (!adaptation.ok) {
    return Object.freeze({
      ok: false,
      code: "V27_INPUT_ADAPTATION_FAILED",
      validation: adaptation,
      resultRecord: null,
    });
  }
  if (adaptation.state === "REST") {
    return Object.freeze({
      ok: true,
      resultRecord: Object.freeze({
        id: resultId(record),
        record_id: record.id,
        source_record_revision: generatedAt,
        generated_at: generatedAt,
        model_version: V27_MODEL_VERSION,
        state: "REST",
        input_snapshot: Object.freeze({ record: cloneValue(record) }),
        result: null,
        personal_reference_snapshots: Object.freeze({}),
        view_contract: Object.freeze({
          default: V27_REGIONAL_VIEW_IDS.withinRun,
          switchable: Object.freeze(Object.values(V27_REGIONAL_VIEW_IDS)),
        }),
      }),
    });
  }

  let result;
  try {
    result = calculateV27Session(adaptation.session);
  } catch (error) {
    return Object.freeze({
      ok: false,
      code: "V27_CALCULATION_FAILED",
      message: String(error?.message || error),
      validation: adaptation,
      resultRecord: null,
    });
  }
  const semanticValidation = assertV27ResultSemantics(result);
  if (!semanticValidation.ok) {
    return Object.freeze({
      ok: false,
      code: "V27_SEMANTIC_VALIDATION_FAILED",
      validation: semanticValidation,
      resultRecord: null,
    });
  }
  const personalSnapshots = personalReferenceSnapshots(
    record,
    result,
    priorSnapshots,
    generatedAt,
  );
  return Object.freeze({
    ok: true,
    resultRecord: Object.freeze({
      id: resultId(record),
      record_id: record.id,
      source_record_revision: generatedAt,
      generated_at: generatedAt,
      model_version: V27_MODEL_VERSION,
      state: "RUN",
      input_snapshot: Object.freeze({
        record: cloneValue(record),
        session: cloneValue(adaptation.session),
        provenance: cloneValue(adaptation.provenance),
        warnings: cloneValue(adaptation.warnings),
      }),
      derived_facts: Object.freeze({
        speed_mps: adaptation.provenance.speed_mps,
        cadence_spm: adaptation.provenance.cadence_spm,
        cadence_provenance_reliable: adaptation.session.cadence_provenance_reliable,
        activity_type: adaptation.session.activity_type,
      }),
      result,
      personal_reference_snapshots: personalSnapshots,
      view_contract: Object.freeze({
        default: V27_REGIONAL_VIEW_IDS.withinRun,
        switchable: Object.freeze(Object.values(V27_REGIONAL_VIEW_IDS)),
      }),
      claims: Object.freeze({
        is_measured_physical_load: false,
        supports_absolute_regional_load_comparison: false,
        is_compositional_share: false,
        supports_medical_decision: false,
      }),
    }),
  });
}

function upsertV27ResultRecord(items, resultRecord) {
  const nextItems = [...items];
  const index = nextItems.findIndex((item) => item.id === resultRecord.id);
  if (index >= 0) nextItems[index] = resultRecord;
  else nextItems.push(resultRecord);
  return nextItems.sort((left, right) => (
    left.record_id.localeCompare(right.record_id)
    || left.source_record_revision.localeCompare(right.source_record_revision)
    || left.id.localeCompare(right.id)
  ));
}
moduleExports["createV27ResultRecord"] = createV27ResultRecord;
moduleExports["upsertV27ResultRecord"] = upsertV27ResultRecord;
internalModules.legacyLoadResultService = moduleExports;
}

import "./primaryInputCatalog.js";
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
const { canonicalInputSignature } = internalModules.canonicalInputSignature;

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
  if (bundle.recordSnapshot?.inputSnapshotHash && bundle.recordSnapshot.inputSnapshotHash !== canonicalInputSignature(bundle.formalInputs)) {
    issues.push(issue("INPUT_SNAPSHOT_HASH_MISMATCH", "recordSnapshot.inputSnapshotHash"));
  }
  return issues;
}

function validateRegionalEngineInputSemantics(input) {
  const issues = validateFormalBundleSemantics(input);
  if (!isObject(input)) return issues;
  const formalSections = input.formalInputs?.["RL-IN-039"]?.value;
  if (Array.isArray(formalSections) && canonicalInputSignature(formalSections) !== canonicalInputSignature(input.courseSections ?? [])) {
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
    if (resultHash !== canonicalInputSignature(base)) issues.push(issue("RESULT_HASH_MISMATCH", "resultHash"));
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
const { canonicalInputSignature } = internalModules.canonicalInputSignature;
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

    const inputSnapshotHash=canonicalInputSignature(map);
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

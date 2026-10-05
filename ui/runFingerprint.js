import { isPresentFiniteNumber as finite } from "../shared/valueUtilities.js";

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number(value)));
}

function hashString(value = "") {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.codePointAt(0) || 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed, index) {
  let value = (Number(seed) + Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 0xffffffff;
}

function paceSecondsPerKm(record = {}) {
  const distance = Number(record.distanceKm);
  const duration = Number(record.durationMinutes);
  return distance > 0 && duration > 0 ? duration * 60 / distance : null;
}

function featureVector(record = {}, measurement = null, fatigue = null) {
  const distance = Number(record.distanceKm || 0);
  const duration = Number(record.durationMinutes || 0);
  const pace = paceSecondsPerKm(record);
  const fatiguePre = finite(fatigue?.pre) ? Number(fatigue.pre) : null;
  const fatiguePost = finite(fatigue?.post) ? Number(fatigue.post) : null;
  const pointCount = Number(measurement?.track?.length || 0);
  const format = String(record.runningFormat || "").toUpperCase();
  return [
    clamp(Math.log1p(Math.max(0, distance)) / Math.log(21)),
    clamp(Math.log1p(Math.max(0, duration)) / Math.log(121)),
    pace ? clamp((780 - pace) / 540) : 0.42,
    fatiguePre == null ? 0.45 : clamp(fatiguePre / 10),
    fatiguePost == null ? 0.45 : clamp(fatiguePost / 10),
    clamp(Math.log1p(pointCount) / Math.log(1201)),
    format === "RUN_WALK" ? 0.34 : 0.72,
    measurement ? clamp(Number(measurement.acceptedPointCount || pointCount) / Math.max(1, Number(measurement.acceptedPointCount || pointCount) + Number(measurement.rejectedPointCount || 0))) : 0.5,
  ];
}

export function buildRunFingerprint(record = {}, { measurement = null, fatigue = null } = {}) {
  const seedSource = [
    record.id,
    record.date,
    record.createdAt,
    record.distanceKm,
    record.durationMinutes,
    record.runningFormat,
    fatigue?.pre,
    fatigue?.post,
    measurement?.track?.length,
  ].join("|");
  const seed = hashString(seedSource);
  const features = featureVector(record, measurement, fatigue);
  const count = 12;
  const center = 120;
  const maxRadius = 86;
  const points = Array.from({ length: count }, (_, index) => {
    const angle = (-Math.PI / 2) + index * (Math.PI * 2 / count);
    const feature = features[index % features.length];
    const jitter = seededUnit(seed, index);
    const radius = maxRadius * (0.46 + feature * 0.30 + jitter * 0.18);
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  });
  const inner = points.map((point, index) => {
    const scale = 0.48 + seededUnit(seed ^ 0x6ac690c5, index) * 0.12;
    return {
      x: center + (point.x - center) * scale,
      y: center + (point.y - center) * scale,
    };
  });
  const orbitOffset = 10 + Math.round(seededUnit(seed, 40) * 42);
  const identifier = `RF-${seed.toString(16).padStart(8, "0").slice(0, 6).toUpperCase()}`;
  return Object.freeze({
    identifier,
    seed,
    rotation: Math.round(seededUnit(seed, 41) * 22 - 11),
    orbitOffset,
    outerPoints: points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "),
    innerPoints: inner.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "),
  });
}

export function renderRunFingerprintSvg(fingerprint, { className = "run-fingerprint__svg" } = {}) {
  if (!fingerprint) return "";
  const id = String(fingerprint.identifier || "run-fingerprint").replace(/[^a-zA-Z0-9_-]/g, "");
  return `<svg class="${className}" viewBox="0 0 240 240" role="img" aria-label="この記録から生成したRun Fingerprint">
    <defs>
      <radialGradient id="${id}-glow" cx="50%" cy="42%" r="65%"><stop offset="0" stop-color="currentColor" stop-opacity=".28"></stop><stop offset="1" stop-color="currentColor" stop-opacity="0"></stop></radialGradient>
      <linearGradient id="${id}-line" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".96"></stop><stop offset="1" stop-color="currentColor" stop-opacity=".35"></stop></linearGradient>
    </defs>
    <circle cx="120" cy="120" r="101" class="run-fingerprint__halo" fill="url(#${id}-glow)"></circle>
    <g transform="rotate(${Number(fingerprint.rotation || 0)} 120 120)">
      <circle cx="120" cy="120" r="82" class="run-fingerprint__ring"></circle>
      <circle cx="120" cy="120" r="58" class="run-fingerprint__ring run-fingerprint__ring--inner" stroke-dasharray="${Number(fingerprint.orbitOffset || 20)} 13"></circle>
      <polygon points="${fingerprint.outerPoints}" class="run-fingerprint__shape" fill="url(#${id}-line)"></polygon>
      <polygon points="${fingerprint.innerPoints}" class="run-fingerprint__shape run-fingerprint__shape--inner"></polygon>
      <circle cx="120" cy="120" r="9" class="run-fingerprint__core"></circle>
    </g>
  </svg>`;
}

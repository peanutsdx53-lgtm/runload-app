const PREFIX = "runner-load-app-flow-session-v1";
const COURSE_SELECTION_KEY = `${PREFIX}-course-selection-v1`;
const GPX_CANDIDATE_KEY = `${PREFIX}-gpx-candidate-v1`;
const memory = new Map();

function store() {
  try { if (globalThis.sessionStorage) return globalThis.sessionStorage; } catch {}
  return {
    getItem: (key) => memory.has(key) ? memory.get(key) : null,
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
  };
}
function safeJson(raw) { try { return JSON.parse(raw || "null"); } catch { return null; } }
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }

export function saveCourseSelection({ target = "record-input", preset = null } = {}) {
  if (!preset?.course) return null;
  const payload = Object.freeze({ version: 1, target: String(target || "record-input"), selectedAt: new Date().toISOString(), preset: clone(preset) });
  store().setItem(COURSE_SELECTION_KEY, JSON.stringify(payload));
  return payload;
}
export function peekCourseSelection(target = "") {
  const parsed = safeJson(store().getItem(COURSE_SELECTION_KEY));
  if (!parsed || parsed.version !== 1 || !parsed.preset?.course) return null;
  if (target && parsed.target !== target) return null;
  return parsed;
}
export function consumeCourseSelection(target = "") {
  const parsed = peekCourseSelection(target);
  if (parsed) store().removeItem(COURSE_SELECTION_KEY);
  return parsed;
}

export function saveGpxCandidate(candidate = {}) {
  const payload = Object.freeze({ version: 1, createdAt: new Date().toISOString(), candidate: clone(candidate) });
  store().setItem(GPX_CANDIDATE_KEY, JSON.stringify(payload));
  return payload;
}
export function peekGpxCandidate() {
  const parsed = safeJson(store().getItem(GPX_CANDIDATE_KEY));
  return parsed?.version === 1 && parsed.candidate && typeof parsed.candidate === "object" ? parsed : null;
}
export function clearGpxCandidate() { store().removeItem(GPX_CANDIDATE_KEY); }


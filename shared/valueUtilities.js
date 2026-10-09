/**
 * Pure value helpers shared across runtime layers.
 * Keep this module free of DOM, storage, routing, and domain-model behavior.
 */
export function isPresentFiniteNumber(value) {
  // Keep legitimate zero, including a numeric string, but never coerce
  // missing whitespace, booleans, arrays, or objects into artificial zeros.
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized !== "" && Number.isFinite(Number(normalized));
  }
  return false;
}

export function isFiniteNumericValue(value) {
  return Number.isFinite(Number(value));
}

export function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function cloneJsonValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function clampNumber(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number(value)));
}
export function normalizeKnownValue(value, knownValues, fallback = "") {
  const requested = String(value || "");
  return knownValues?.has?.(requested) ? requested : fallback;
}

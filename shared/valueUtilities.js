/**
 * Pure value helpers shared across runtime layers.
 * Keep this module free of DOM, storage, routing, and domain-model behavior.
 */
export function isPresentFiniteNumber(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
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

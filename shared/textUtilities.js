export function sanitizeText(value, max = 240) {
  return String(value ?? "").replace(/\u0000/g, "").slice(0, max);
}

export function normalizeIsoText(value, fallback = "") {
  const raw = sanitizeText(value, 50).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return raw && Number.isFinite(Date.parse(raw)) ? raw : fallback;
}

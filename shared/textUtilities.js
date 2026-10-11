export function sanitizeText(value, max = 240) {
  return String(value ?? "").replace(/\u0000/g, "").slice(0, max);
}

export function normalizeIsoText(value, fallback = "") {
  const raw = sanitizeText(value, 50).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return raw && Number.isFinite(Date.parse(raw)) ? raw : fallback;
}

// One-line persisted labels. Every caller supplies its own historical max.
export function normalizeOneLine(value, max = 180) {
  return sanitizeText(value, max).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

// Date-only key uses local wall time, not UTC.
export function localTodayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

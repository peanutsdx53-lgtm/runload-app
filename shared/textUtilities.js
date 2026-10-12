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

// Display-only concise Japanese date, invalid input stays unchanged.
export function formatShortLocalDate(dateText = "") {
  const match = String(dateText).match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!match) return dateText || "—";
  return `${Number(match[1])}月${Number(match[2])}日`;
}

 
// Date-only saved facts must not silently roll impossible days/months into
// another calendar week. Use local noon to avoid midnight DST boundaries.
export function parseLocalDateAtNoon(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date : null;
}

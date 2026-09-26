export function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderStatusLabel(text, tone = "neutral") {
  return `<span class="status-label status-label--${escapeHtml(tone)}">${escapeHtml(text)}</span>`;
}

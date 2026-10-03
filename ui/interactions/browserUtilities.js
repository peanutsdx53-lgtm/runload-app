
export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // iOS/PWA environments can expose Clipboard API but reject writes.
      // Fall back to a user-gesture compatible textarea copy below.
    }
  }
  const fallbackTextarea = document.createElement("textarea");
  fallbackTextarea.value = text;
  fallbackTextarea.setAttribute("readonly", "");
  fallbackTextarea.style.position = "fixed";
  fallbackTextarea.style.opacity = "0";
  document.body.appendChild(fallbackTextarea);
  fallbackTextarea.select();
  fallbackTextarea.setSelectionRange(0, fallbackTextarea.value.length);
  const copied = document.execCommand("copy");
  fallbackTextarea.remove();
  if (!copied) throw new Error("copy failed");
}

function downloadText(filename, text, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadJsonText(filename, text) {
  downloadText(filename, text, "application/json;charset=utf-8");
}

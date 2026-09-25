
export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const fallbackTextarea = document.createElement("textarea");
  fallbackTextarea.value = text;
  document.body.appendChild(fallbackTextarea);
  fallbackTextarea.select();
  document.execCommand("copy");
  fallbackTextarea.remove();
}

export function downloadText(filename, text, mimeType = "text/plain;charset=utf-8") {
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

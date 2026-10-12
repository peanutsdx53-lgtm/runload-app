
export async function copyText(text) {
  // A browser can deny property access before writeText() itself is called.
  try {
    const clipboard = navigator.clipboard;
    if (typeof clipboard?.writeText === "function") {
      await clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall back to selecting a temporary textarea when the API is blocked.
  }
  const fallbackTextarea = document.createElement("textarea");
  fallbackTextarea.value = text;
  fallbackTextarea.setAttribute("readonly", "");
  fallbackTextarea.style.position = "fixed";
  fallbackTextarea.style.opacity = "0";
  try {
    document.body.appendChild(fallbackTextarea);
    fallbackTextarea.select();
    fallbackTextarea.setSelectionRange(0, fallbackTextarea.value.length);
    if (!document.execCommand("copy")) throw new Error("copy failed");
  } finally {
    // Do not retain potentially sensitive consultation text after denial.
    fallbackTextarea.remove();
  }
}

function downloadText(filename, text, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  let link;
  try {
    link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    link?.remove();
    URL.revokeObjectURL(url);
  }
}

export function downloadJsonText(filename, text) {
  downloadText(filename, text, "application/json;charset=utf-8");
}

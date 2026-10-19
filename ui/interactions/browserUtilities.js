
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

// W4 restore guard: a pending file inspection must not outlive a change in
// local data from another tab. Capture the full unmodified store, including
// keys unknown to this build. No write occurs until the existing restore flow.
function snapshotForRestoreGuard() {
  try {
    const store = globalThis.localStorage;
    if (!store || typeof store.key !== "function") return null;
    const pairs = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key == null) return null;
      pairs.push([String(key), store.getItem(key)]);
    }
    pairs.sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(pairs);
  } catch { return null; }
}
let restoreGuardInstalled = false;
export function bindRestoreSourceGuard() {
  if (restoreGuardInstalled || typeof document === "undefined") return;
  restoreGuardInstalled = true;
  let sourceFingerprint = null;
  document.addEventListener("change", (event) => {
    if (event.target?.matches?.('[data-action="restore-backup"]')) {
      sourceFingerprint = snapshotForRestoreGuard();
    }
  }, true);
  document.addEventListener("click", (event) => {
    if (!event.target?.closest?.('[data-action="confirm-restore-backup"]')) return;
    const now = snapshotForRestoreGuard();
    if (sourceFingerprint !== null && now !== null && sourceFingerprint === now) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const host = document.querySelector('[data-restore-preview-host]');
    if (host) host.textContent = '端末内データの変更・競合を検出したか、安全に確認できません。復元は実行せず、バックアップを選び直してください。';
    sourceFingerprint = null;
  }, true);
}

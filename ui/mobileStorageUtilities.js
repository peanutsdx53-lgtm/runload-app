export function writeMobileLocalJson(key, value) {
  try {
    const storage = globalThis.localStorage;
    if (typeof storage?.setItem !== "function") return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getSessionStorage() {
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}

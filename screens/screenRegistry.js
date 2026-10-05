export async function createScreenRenderers({ mobile = false } = {}) {
  const registry = mobile
    ? await import("./mobileScreenRegistry.js")
    : await import("./desktopScreenRegistry.js");
  return registry.createScreenRenderers();
}

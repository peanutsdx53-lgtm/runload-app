import { matchesMobileLayout } from "./deviceLayout.js";
import { acquireSingleEditorSession, renderEditorSessionBlocked } from "./singleEditorSession.js";
import { loadPlatformStyles } from "./platformStyles.js";

const editorSession = await acquireSingleEditorSession();
if (!editorSession.ok) {
  renderEditorSessionBlocked(editorSession);
} else {
  // Page transitions may retain an old page in bfcache. Never resume a page
  // after it has released the lock; a fresh boot must reacquire the lock.
  globalThis.addEventListener("pagehide", editorSession.release, { once: true });
  globalThis.addEventListener("pageshow", (event) => {
    if (event.persisted) globalThis.location.reload();
  });
  const platform = matchesMobileLayout() ? "mobile" : "desktop";
  await loadPlatformStyles(platform);
  if (platform === "mobile") await import("./mobileRuntimeEntry.js");
  else await import("./desktopRuntimeEntry.js");
  await import("../app.js");
}

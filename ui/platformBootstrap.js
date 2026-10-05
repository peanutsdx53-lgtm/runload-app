import { matchesMobileLayout } from "./deviceLayout.js";
import { loadPlatformStyles } from "./platformStyles.js";

const platform = matchesMobileLayout() ? "mobile" : "desktop";
await loadPlatformStyles(platform);

if (platform === "mobile") await import("./mobileRuntimeEntry.js");
else await import("./desktopRuntimeEntry.js");

await import("../app.js");

import { matchesMobileLayout } from "./deviceLayout.js";

if (matchesMobileLayout()) await import("./mobileRuntimeEntry.js");
else await import("./desktopRuntimeEntry.js");

await import("../app.js");

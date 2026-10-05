import { matchesMobileLayout } from "./deviceLayout.js";

export function createMobileMeasurementScanner(bindRoot) {
  return function scanMobileMeasurementRoots() {
    if (!matchesMobileLayout()) return;
    document.querySelectorAll("[data-run-measurement]").forEach(bindRoot);
  };
}

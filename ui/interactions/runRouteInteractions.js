import { createRunMeasurementMap } from "../runMeasurementMap.js";
import { findSavedRunMeasurement } from "../runMeasurementState.js";

export function bindRunRoute({ context }) {
  const root = document.querySelector("[data-run-route]");
  if (!root) return undefined;
  const recordId = String(context?.parameters?.get?.("recordId") || root.dataset.recordId || "");
  const measurement = findSavedRunMeasurement(recordId);
  const mapContainer = root.querySelector("#run-route-map");
  if (!measurement?.track?.length || !mapContainer) return undefined;

  const map = createRunMeasurementMap(mapContainer, { initialZoom: 16 });
  map?.fitTrack(measurement.track);

  root.querySelector('[data-action="route-zoom-in"]')?.addEventListener("click", () => map?.setZoom((map?.getZoom() || 16) + 1));
  root.querySelector('[data-action="route-zoom-out"]')?.addEventListener("click", () => map?.setZoom((map?.getZoom() || 16) - 1));

  return () => map?.destroy();
}

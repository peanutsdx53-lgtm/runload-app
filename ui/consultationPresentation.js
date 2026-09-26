import { PRIMARY_REGIONAL_V2_REGION_DEFS } from "../core/appCore.js";

const REGIONS = Object.freeze(
  PRIMARY_REGIONAL_V2_REGION_DEFS.map((region) => Object.freeze({ id: region.displayId, name: region.name })),
);
const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const DEFAULT_REGION_ID = "BA-DISP-019";

function normalizeRegionId(value = "") {
  const requested = String(value || "");
  return REGION_BY_ID.has(requested) ? requested : DEFAULT_REGION_ID;
}

export function buildReportPresentation({ services, experience, regionId = "" }) {
  const selectedRegionId = normalizeRegionId(regionId);
  const allExperiences = services.workflows.records.loadAllExperiences();
  const report = services.consultation.buildConsultationReport(experience, allExperiences, { regionId: selectedRegionId });
  return Object.freeze({
    experience,
    report,
    selectedRegionId,
  });
}

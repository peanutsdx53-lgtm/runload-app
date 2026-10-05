// Public boundary for the smartphone walk/jog reference model.
// Presentation modules import this file instead of reaching into core/internal.
export {
  MOBILE_WALK_JOG_MODEL_VERSION,
  MOBILE_GAIT_IDS,
  REGION_IDS,
  STRICT_ALL12_BANDS,
  TRANSITION_POLICY,
  getMobileWalkJogRoute,
  evaluateMobileWalkJogRegion,
  evaluateMobileWalkJogAllRegions,
  hasStrictAll12Coverage,
  summarizeMobileWalkJogCoverage,
} from "./internal/mobileWalkJogSpeedModel.js";

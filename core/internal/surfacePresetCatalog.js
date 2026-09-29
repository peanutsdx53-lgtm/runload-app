import { internalModules } from "./modules.js";

// Current surface preset data used by the record-to-primary-model adapter.
{
const moduleExports = Object.create(null);
const SURFACE_PRESETS = Object.freeze({
  "paved": {
    "key": "paved",
    "label": "舗装路",
    "materialLabel": "PAVED",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 5,
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 2,
    "stabilityLevel": 5,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "ASPHALT_REFERENCE_ZERO_ONLY",
    "numericRouteDefault": "REFERENCE_ZERO_ONLY",
    "confidence": "MODERATE"
  },
  "track": {
    "key": "track",
    "label": "陸上トラック",
    "materialLabel": "TRACK_RUBBER",
    "runSetting": "TRACK",
    "hardnessLevel": 3,
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 5,
    "stabilityLevel": 5,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "RUBBER",
    "numericRouteDefault": "SOURCE_GATED_CURRENT",
    "confidence": "MODERATE"
  },
  "treadmill": {
    "key": "treadmill",
    "label": "トレッドミル",
    "materialLabel": "TREADMILL_BELT",
    "runSetting": "TREADMILL",
    "hardnessLevel": 3,
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 4,
    "stabilityLevel": 5,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "ROUTING_ONLY",
    "confidence": "MODERATE"
  },
  "soil": {
    "key": "soil",
    "label": "締まった土道",
    "materialLabel": "COMPACTED_SOIL",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 3,
    "unevennessLevel": 2,
    "gripLevel": 3,
    "sinkLevel": 2,
    "reboundLevel": 2,
    "stabilityLevel": 3,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "TRACE_AND_COVERAGE_ONLY",
    "confidence": "LOW_TO_MODERATE"
  },
  "trail": {
    "key": "trail",
    "label": "不整地トレイル",
    "materialLabel": "TRAIL_UNEVEN",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": "UNKNOWN",
    "unevennessLevel": 5,
    "gripLevel": "UNKNOWN",
    "sinkLevel": "UNKNOWN",
    "reboundLevel": 1,
    "stabilityLevel": 2,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "NO_GENERIC_NUMERIC_ROUTE",
    "confidence": "LOW"
  },
  "natural_grass": {
    "key": "natural_grass",
    "label": "芝生",
    "materialLabel": "NATURAL_GRASS",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 2,
    "unevennessLevel": 2,
    "gripLevel": 3,
    "sinkLevel": 3,
    "reboundLevel": 2,
    "stabilityLevel": 3,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "GRASS",
    "numericRouteDefault": "SOURCE_GATED_CURRENT",
    "confidence": "MODERATE"
  },
  "artificial_turf": {
    "key": "artificial_turf",
    "label": "人工芝",
    "materialLabel": "ARTIFICIAL_TURF",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": "UNKNOWN",
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 4,
    "stabilityLevel": 4,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "TRACE_AND_COVERAGE_ONLY",
    "confidence": "LOW_TO_MODERATE"
  },
  "sand": {
    "key": "sand",
    "label": "砂地",
    "materialLabel": "SAND",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 1,
    "unevennessLevel": 3,
    "gripLevel": 2,
    "sinkLevel": 5,
    "reboundLevel": 1,
    "stabilityLevel": 1,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "NO_GENERIC_NUMERIC_ROUTE",
    "confidence": "MODERATE_FOR_DIRECTIONAL_PROPERTIES"
  }
});
moduleExports["SURFACE_PRESETS"] = SURFACE_PRESETS;
internalModules.surfacePresetCatalog = moduleExports;
}

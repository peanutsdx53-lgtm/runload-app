import '../../core/appCore.js';
import { internalModules } from '../../core/internal/modules.js';

const { calculateRun, REGION_DEFS } = internalModules.primaryRegionalEngine;
const duration = (distanceKm, speedMps) => distanceKm * 1000 / speedMps / 60;
const grade6Percent = Math.tan(6 * Math.PI / 180) * 100;

const cases = {
  reference: { runningFormat:'RUN', distanceKm:5, durationMinutes:duration(5,2.5) },
  lowBridge: { runningFormat:'RUN', distanceKm:5, durationMinutes:duration(5,2.3) },
  highBridge: { runningFormat:'RUN', distanceKm:5, durationMinutes:duration(5,3.0) },
  gradeDirect: { runningFormat:'RUN', distanceKm:5, durationMinutes:duration(5,2.78), uphillSharePercent:100, downhillSharePercent:0, uphillGradePercent:grade6Percent, downhillGradePercent:0 },
  heelUphill: { runningFormat:'RUN', distanceKm:5, durationMinutes:duration(5,2.0), uphillSharePercent:100, downhillSharePercent:0, uphillGradePercent:15, downhillGradePercent:0 },
  cadenceDirect: { runningFormat:'RUN', distanceKm:5, durationMinutes:duration(5,3.33), averageCadenceSpm:170, personalHabitualCadenceSpm:160 },
  combined: { runningFormat:'RUN', distanceKm:5, durationMinutes:duration(5,2.78), averageCadenceSpm:168, personalHabitualCadenceSpm:160, uphillSharePercent:100, downhillSharePercent:0, uphillGradePercent:5, downhillGradePercent:0 },
  segmented: { runningFormat:'RUN', distanceKm:5, durationMinutes:duration(5,2.5), segments:[{distanceKm:2.5,speedMps:2.5,gradePercent:0},{distanceKm:2.5,speedMps:2.5,gradePercent:5}] },
  contextOnly: { runningFormat:'RUN', distanceKm:5, durationMinutes:duration(5,2.5), surfaceComponents:[{category:'NATURAL_GRASS',sharePercent:100}], footStrikeObservation:{value:'RFS',provenance:'SELF_REPORTED'} },
  outOfRange: { runningFormat:'RUN', distanceKm:5, durationMinutes:duration(5,6.0) },
};

function regionProjection(row){
  if(!row)return null;
  return {
    value:row.value??null,
    knownValue:row.knownValue??null,
    valueEnvelope:row.valueEnvelope??null,
    supportedDistanceKm:row.supportedDistanceKm??null,
    unsupportedDistanceKm:row.unsupportedDistanceKm??null,
    coverageProportion:row.coverageProportion??null,
    state:row.state??null,
    segmentEvidence:row.segmentEvidence??null,
  };
}

function projection(out){
  const axes={};
  for(const [axis,rows] of Object.entries(out.axisEstimates||{})) axes[axis]=Object.fromEntries(REGION_DEFS.map((d)=>[d.id,regionProjection(rows?.[d.id])]));
  return {
    state:out.state??null,
    courseState:out.courseState??null,
    combinedConditionState:out.combinedConditionState??null,
    exposure:out.exposure??null,
    regions:Object.fromEntries(REGION_DEFS.map((d)=>[d.id,regionProjection(out.regions?.[d.id])])),
    axisEstimates:axes,
  };
}

console.log(JSON.stringify(Object.fromEntries(Object.entries(cases).map(([name,input])=>[name,projection(calculateRun(input))])),null,2));

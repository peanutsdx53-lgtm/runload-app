import { BODY_AREA_TAXONOMY, normalizeBodyAreaObservations, SAFETY_FLAG_KEYS } from "../core/appCore.js";

import { SUBJECTIVE_STATUS_LABELS } from "./recordPresentation.js";

export const DETAILED_SUBJECTIVE_STATUSES = Object.freeze([
  "discomfort_reported",
  "strong_reported",
]);

function stringValue(value, fallback = "") {
  return value === undefined || value === null ? String(fallback) : String(value);
}

export function subjectiveFieldsFromFeedback(feedback = {}) {
  const status = String(feedback.checkStatus || "deferred");
  const fields = {
    subjectiveStatus: status,
    consultationNote: feedback.consultationNote || "",
    unexpectedSymptom: feedback.unexpectedSymptom ? "1" : "__unchecked__",
    symptomTiming: feedback.symptomContext?.timing || "",
    symptomStartedWhen: feedback.symptomContext?.startedWhen || "",
    symptomNote: feedback.symptomContext?.note || "",
    bodyObservationTiming: feedback.bodyAreaObservations?.[0]?.noticedTiming || "UNKNOWN",
    bodyObservationSensation: feedback.bodyAreaObservations?.[0]?.sensationType || "NOT_SELECTED",
    bodyObservationNote: feedback.bodyAreaObservations?.[0]?.note || "",
  };
  SAFETY_FLAG_KEYS.forEach((flag) => {
    fields[`safety_${flag}`] = feedback.safetyFlags?.[flag] ? "1" : "__unchecked__";
  });
  const observationById = new Map(
    normalizeBodyAreaObservations(feedback.bodyAreaObservations)
      .map((item) => [item.areaId, item]),
  );
  BODY_AREA_TAXONOMY.forEach((area) => {
    const observation = observationById.get(area.id);
    fields[`bodyArea_${area.key}`] = String(observation?.intensity || 0);
    fields[`bodyAreaLaterality_${area.key}`] = String(observation?.laterality || "UNKNOWN");
  });
  return Object.freeze(fields);
}

export function resolveSubjectiveStatusFromFields(fields = {}) {
  return stringValue(fields.subjectiveStatus, "deferred");
}

export function enteredBodyAreasFromFields(fields = {}) {
  return BODY_AREA_TAXONOMY
    .map((area) => Object.freeze({
      ...area,
      intensity: Number(fields[`bodyArea_${area.key}`] || 0),
      laterality: String(fields[`bodyAreaLaterality_${area.key}`] || "UNKNOWN"),
    }))
    .filter((item) => Number.isInteger(item.intensity) && item.intensity >= 1 && item.intensity <= 5);
}

export function subjectiveSummaryFromFields(fields = {}) {
  const status = resolveSubjectiveStatusFromFields(fields);
  const bodyAreas = enteredBodyAreasFromFields(fields);
  const label = SUBJECTIVE_STATUS_LABELS[status] || (status ? "入力途中" : "入力途中");
  const bodyAreaLabels = bodyAreas.map((item) => item.label);
  let description = "入力しなくても記録を保存できます。";
  if (status === "none_reported") description = "身体の記録は残さず保存します。特になしとは断定しません。";
  else if (status === "deferred" || status === "not_asked") description = "身体の記録は未確認です。";
  else if (bodyAreaLabels.length) description = `${bodyAreaLabels.slice(0, 3).join("、")}${bodyAreaLabels.length > 3 ? `ほか${bodyAreaLabels.length - 3}部位` : ""}を入力しています。`;
  else if (DETAILED_SUBJECTIVE_STATUSES.includes(status)) description = "必要な詳細部位だけを選んでください。";
  return Object.freeze({
    status,
    label,
    description,
    bodyAreas,
    bodyAreaLabels,
  });
}



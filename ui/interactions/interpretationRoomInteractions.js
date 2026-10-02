import {
  SELF_UNDERSTANDING_TYPES,
  selfUnderstandingCourseIdentity,
  selfUnderstandingRegionSignature,
} from "../../core/selfUnderstandingCore.js";

function targetExperience(services, context) {
  const recordId = String(context?.parameters?.get?.("recordId") || "");
  return recordId
    ? services?.workflows?.records?.loadExperience?.(recordId)
    : services?.workflows?.records?.loadLatestExperience?.();
}

function regionalRow(experience, regionId) {
  return (experience?.regionalV2ResultRecord?.result?.regions || [])
    .find((row) => String(row?.regionId || "") === String(regionId || "")) || null;
}

function createThreadFromButton(button, services, context) {
  const repository = services?.storage?.selfUnderstandingThreads;
  const experience = targetExperience(services, context);
  if (!repository || !experience?.record) return { ok: false, code: "SELF_UNDERSTANDING_CONTEXT_UNAVAILABLE" };
  const type = String(button.dataset.threadType || "");
  if (type === SELF_UNDERSTANDING_TYPES.regionObservationPair || type === SELF_UNDERSTANDING_TYPES.regionWatch) {
    const regionId = String(button.dataset.regionId || context?.parameters?.get?.("regionId") || "");
    const row = regionalRow(experience, regionId);
    const signature = selfUnderstandingRegionSignature(experience, regionId);
    if (!row || !signature) return { ok: false, code: "SELF_UNDERSTANDING_REGION_UNAVAILABLE" };
    const bodyAreaId = type === SELF_UNDERSTANDING_TYPES.regionObservationPair
      ? String(button.dataset.bodyAreaId || "")
      : "";
    return repository.createOrResume({
      type,
      subject: { regionId, primaryRegionId: row.primaryRegionId || "", ...(bodyAreaId ? { bodyAreaId } : {}) },
      createdFromRecord: experience.record,
      semanticConstraints: { regionSignature: signature },
    });
  }
  if (type === SELF_UNDERSTANDING_TYPES.sameCourseRofPost) {
    const course = selfUnderstandingCourseIdentity(experience.record);
    if (!course.id) return { ok: false, code: "SELF_UNDERSTANDING_STABLE_COURSE_REQUIRED" };
    return repository.createOrResume({
      type,
      subject: { courseId: course.id, courseName: course.name },
      createdFromRecord: experience.record,
    });
  }
  if (type === SELF_UNDERSTANDING_TYPES.userDefinedLegacy) {
    const prompt = String(experience.record.reflectionContext?.nextCheckPoint || "").trim();
    if (!prompt) return { ok: false, code: "SELF_UNDERSTANDING_LEGACY_PROMPT_EMPTY" };
    return repository.createOrResume({
      type,
      subject: { prompt },
      createdFromRecord: experience.record,
      legacyOrigin: { field: "nextCheckPoint", sourceRecordId: experience.record.id },
    });
  }
  return { ok: false, code: "SELF_UNDERSTANDING_TYPE_UNSUPPORTED" };
}

function errorMessage(code = "") {
  if (code === "SELF_UNDERSTANDING_STABLE_COURSE_REQUIRED") return "この確認には保存コースの識別情報が必要です。コースを保存してから利用できます。";
  if (code === "SELF_UNDERSTANDING_REGION_UNAVAILABLE") return "この部位は現在の保存結果では確認テーマにできません。";
  return "確認テーマを保存できませんでした。";
}

export function bindInterpretationRoom({ root = document, services, context, rerender }) {
  const screen = root.querySelector?.("[data-interpretation-room]") || root;
  if (!screen) return null;

  const onClick = (event) => {
    const createButton = event.target.closest?.('[data-action="create-self-understanding-thread"]');
    if (createButton && screen.contains(createButton)) {
      event.preventDefault();
      const result = createThreadFromButton(createButton, services, context);
      if (!result?.ok) {
        window.alert(errorMessage(result?.code));
        return;
      }
      rerender?.();
      return;
    }

    const reviewButton = event.target.closest?.('[data-action="review-self-understanding-thread"]');
    if (reviewButton && screen.contains(reviewButton)) {
      event.preventDefault();
      const experience = targetExperience(services, context);
      const result = services?.storage?.selfUnderstandingThreads?.review?.(
        String(reviewButton.dataset.threadId || ""),
        {
          record: experience?.record || {},
          decision: String(reviewButton.dataset.threadDecision || "VIEWED"),
        },
      );
      if (!result?.ok) {
        window.alert("確認テーマを更新できませんでした。");
        return;
      }
      rerender?.();
    }
  };

  screen.addEventListener("click", onClick);
  return () => screen.removeEventListener("click", onClick);
}

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

function selfUnderstandingNote(screen) {
  return String(screen?.querySelector?.("[data-self-understanding-note]")?.value || "").trim();
}

function setInterpretationFlowStage(screen, stage = "focus", completion = "") {
  const room = screen?.matches?.(".interpretation-flow-room") ? screen : screen?.querySelector?.(".interpretation-flow-room");
  if (!room) return false;
  const allowed = new Set(["focus", "compare", "decision", "done"]);
  const next = allowed.has(String(stage)) ? String(stage) : "focus";
  room.dataset.interpretationFlowStage = next;
  if (next === "done" && completion) room.dataset.interpretationFlowCompletion = String(completion);
  else if (next !== "done") delete room.dataset.interpretationFlowCompletion;
  room.querySelector?.(`[data-interpretation-flow-step="${next === "done" ? "decision" : next}"]`)?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  return true;
}

function regionalRow(experience, regionId) {
  return (experience?.regionalV2ResultRecord?.result?.regions || [])
    .find((row) => String(row?.regionId || "") === String(regionId || "")) || null;
}

function createThreadFromButton(button, services, context, screen = null) {
  const repository = services?.storage?.selfUnderstandingThreads;
  const experience = targetExperience(services, context);
  if (!repository || !experience?.record) return { ok: false, code: "SELF_UNDERSTANDING_CONTEXT_UNAVAILABLE" };
  const type = String(button.dataset.threadType || "");
  const optionalUserLabel = String(button.dataset.nextLabel || button.dataset.threadLabel || "").trim();
  const finishCreate = (result) => {
    if (!result?.ok || !result?.item?.id) return result;
    const optionalNote = selfUnderstandingNote(screen);
    if (!optionalNote) return result;
    const reviewed = repository.review(result.item.id, { record: experience.record, decision: "VIEWED", optionalNote });
    return reviewed?.ok ? { ...result, item: reviewed.item } : reviewed;
  };
  if (type === SELF_UNDERSTANDING_TYPES.regionObservationPair || type === SELF_UNDERSTANDING_TYPES.regionWatch) {
    const regionId = String(button.dataset.regionId || context?.parameters?.get?.("regionId") || "");
    const row = regionalRow(experience, regionId);
    const signature = selfUnderstandingRegionSignature(experience, regionId);
    if (!row || !signature) return { ok: false, code: "SELF_UNDERSTANDING_REGION_UNAVAILABLE" };
    const bodyAreaId = type === SELF_UNDERSTANDING_TYPES.regionObservationPair
      ? String(button.dataset.bodyAreaId || "")
      : "";
    return finishCreate(repository.createOrResume({
      type,
      subject: { regionId, primaryRegionId: row.primaryRegionId || "", ...(bodyAreaId ? { bodyAreaId } : {}) },
      createdFromRecord: experience.record,
      semanticConstraints: { regionSignature: signature },
      optionalUserLabel,
    }));
  }
  if (type === SELF_UNDERSTANDING_TYPES.sameCourseRofPost) {
    const course = selfUnderstandingCourseIdentity(experience.record);
    if (!course.id) return { ok: false, code: "SELF_UNDERSTANDING_STABLE_COURSE_REQUIRED" };
    return finishCreate(repository.createOrResume({
      type,
      subject: { courseId: course.id, courseName: course.name },
      createdFromRecord: experience.record,
      optionalUserLabel,
    }));
  }
  if (type === SELF_UNDERSTANDING_TYPES.contextQuestion) {
    const prompt = String(button.dataset.contextPrompt || optionalUserLabel || "").trim();
    const focusKey = String(button.dataset.contextKey || "").trim();
    const articleId = String(button.dataset.articleId || "").trim();
    if (!prompt || !focusKey) return { ok: false, code: "SELF_UNDERSTANDING_CONTEXT_QUESTION_INVALID" };
    return finishCreate(repository.createOrResume({
      type,
      subject: { prompt, focusKey, articleId },
      createdFromRecord: experience.record,
      optionalUserLabel: optionalUserLabel || prompt,
    }));
  }
  return { ok: false, code: "SELF_UNDERSTANDING_TYPE_UNSUPPORTED" };
}


function finalizeInterpretation(button, screen, services, context) {
  const experience = targetExperience(services, context);
  const record = experience?.record || null;
  const interpretations = services?.storage?.selfInterpretations;
  if (!record || !interpretations) return { ok: false, code: "SELF_INTERPRETATION_CONTEXT_UNAVAILABLE" };

  const decision = String(button.dataset.interpretationDecision || "THIS_TIME_ONLY").toUpperCase();
  let threadId = String(button.dataset.threadId || "");
  let threadType = String(button.dataset.threadType || "");

  if (decision === "CONTINUE") {
    if (threadId) {
      const reviewed = services?.storage?.selfUnderstandingThreads?.review?.(threadId, { record, decision: "KEEP_WATCHING" });
      if (!reviewed?.ok) return reviewed;
      threadType = reviewed.item?.type || threadType;
    } else if (threadType) {
      const created = createThreadFromButton(button, services, context);
      if (!created?.ok) return created;
      threadId = String(created.item?.id || "");
      threadType = String(created.item?.type || threadType);
    }
  } else if (decision === "STOP" && threadId) {
    const closed = services?.storage?.selfUnderstandingThreads?.review?.(threadId, { record, decision: "CLOSE" });
    if (!closed?.ok) return closed;
    threadType = String(closed.item?.type || threadType);
  }

  const note = String(screen.querySelector?.("[data-self-interpretation-note]")?.value || "").trim();
  return interpretations.saveForRecord({
    record,
    findingCode: String(button.dataset.findingCode || "OVERVIEW"),
    findingLabel: String(button.dataset.findingLabel || "今回の記録を整理"),
    decision,
    nextLabel: String(button.dataset.nextLabel || ""),
    threadId,
    threadType,
    subject: {
      regionId: String(button.dataset.regionId || ""),
      bodyAreaId: String(button.dataset.bodyAreaId || ""),
      courseId: selfUnderstandingCourseIdentity(record).id || "",
    },
    userNote: note,
  });
}

function errorMessage(code = "") {
  if (code === "SELF_UNDERSTANDING_STABLE_COURSE_REQUIRED") return "この確認には保存コースの識別情報が必要です。コースを保存してから利用できます。";
  if (code === "SELF_UNDERSTANDING_REGION_UNAVAILABLE") return "この部位は現在の保存結果では次回見る項目にできません。";
  if (code === "SELF_UNDERSTANDING_CONTEXT_QUESTION_INVALID") return "今回の確認内容を保存できませんでした。";
  if (String(code).startsWith("SELF_INTERPRETATION")) return "今回の内容を保存できませんでした。";
  return "次回見る内容を保存できませんでした。";
}

export function bindInterpretationRoom({ root = document, services, context, rerender }) {
  const screen = root.querySelector?.("[data-interpretation-room]") || root;
  if (!screen) return null;

  const onClick = (event) => {
    const flowButton = event.target.closest?.('[data-action="interpretation-flow-flow-stage"]');
    if (flowButton && screen.contains(flowButton)) {
      event.preventDefault();
      setInterpretationFlowStage(screen, flowButton.dataset.nextStage || "focus");
      return;
    }

    const finishButton = event.target.closest?.('[data-action="interpretation-flow-finish-this-time"]');
    if (finishButton && screen.contains(finishButton)) {
      event.preventDefault();
      setInterpretationFlowStage(screen, "done", finishButton.dataset.interpretationFlowDoneKind || "this-time");
      return;
    }

    const undoButton = event.target.closest?.('[data-action="interpretation-flow-undo-created-thread"]');
    if (undoButton && screen.contains(undoButton)) {
      event.preventDefault();
      const room = screen?.matches?.(".interpretation-flow-room") ? screen : screen?.querySelector?.(".interpretation-flow-room");
      const threadId = String(room?.dataset?.interpretationFlowCreatedThreadId || "");
      const experience = targetExperience(services, context);
      const result = threadId ? services?.storage?.selfUnderstandingThreads?.review?.(threadId, { record: experience?.record || {}, decision: "CLOSE" }) : null;
      if (!result?.ok) {
        window.alert("確認中の問いを更新できませんでした。");
        return;
      }
      if (room) delete room.dataset.interpretationFlowCreatedThreadId;
      setInterpretationFlowStage(screen, "done", "undone");
      return;
    }

    const finalizeButton = event.target.closest?.('[data-action="finalize-self-interpretation"]');
    if (finalizeButton && screen.contains(finalizeButton)) {
      event.preventDefault();
      const result = finalizeInterpretation(finalizeButton, screen, services, context);
      if (!result?.ok) {
        window.alert(errorMessage(result?.code));
        return;
      }
      rerender?.();
      return;
    }

    const createButton = event.target.closest?.('[data-action="create-self-understanding-thread"]');
    if (createButton && screen.contains(createButton)) {
      event.preventDefault();
      const result = createThreadFromButton(createButton, services, context, screen);
      if (!result?.ok) {
        window.alert(errorMessage(result?.code));
        return;
      }
      const room = screen?.matches?.(".interpretation-flow-room") ? screen : screen?.querySelector?.(".interpretation-flow-room");
      if (room) room.dataset.interpretationFlowCreatedThreadId = String(result.item?.id || "");
      if (!setInterpretationFlowStage(screen, "done", "saved")) rerender?.();
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
          optionalNote: selfUnderstandingNote(screen),
        },
      );
      if (!result?.ok) {
        window.alert("次回見る内容を更新できませんでした。");
        return;
      }
      if (!setInterpretationFlowStage(screen, "done", "updated")) rerender?.();
    }
  };

  screen.addEventListener("click", onClick);
  return () => screen.removeEventListener("click", onClick);
}

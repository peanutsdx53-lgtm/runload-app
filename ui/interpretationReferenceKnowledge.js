import { isPresentFiniteNumber as finite } from "../shared/valueUtilities.js";
import { findReadingArticleById } from "../core/appCore.js";


export function normalizeInterpretationConditionId(value = "") {
  const raw = String(value || "").trim();
  const compact = raw.replace(/[_-]/g, "").toLowerCase();
  if (["distance", "distancekm", "runningdistance", "runningdistancekm"].includes(compact)) return "distance";
  if (["duration", "durationminutes", "runningduration", "runningdurationminutes"].includes(compact)) return "duration";
  if (["pace", "pacesecondsperkm"].includes(compact)) return "pace";
  if (["runningformat", "format"].includes(compact)) return "running-format";
  if (["course", "courseid", "coursename"].includes(compact)) return "course";
  if (["grade", "slope"].includes(compact)) return "grade";
  if (["surface", "surfaceprofile"].includes(compact)) return "surface";
  if (["cadence", "spm"].includes(compact)) return "cadence";
  return raw.toLowerCase();
}

function articleById(id = "") {
  const article = findReadingArticleById(id);
  if (!article) return null;
  const governance = article.evidenceGovernance || null;
  if (governance?.sourceIntegrity?.status && governance.sourceIntegrity.status !== "PASS") return null;
  return article;
}

export function getInterpretationReferenceKnowledgeById(id = "", matchReason = "確認中の問いに関連する一般情報です") {
  const article = articleById(id);
  if (!article) return null;
  return Object.freeze({
    id: article.id,
    title: article.title,
    lead: article.lead,
    summary: article.summary,
    caution: article.caution,
    sourceCount: Array.isArray(article.sources) ? article.sources.length : 0,
    sourceKinds: Object.freeze([...(article.sources || []).map((source) => source.sourceTypeLabel || source.sourceType || "参考資料")]),
    matchReason,
    evidenceGovernance: article.evidenceGovernance || null,
  });
}

function conditionIds(output = {}) {
  return (Array.isArray(output?.conditions?.differences) ? output.conditions.differences : [])
    .map((item) => normalizeInterpretationConditionId(item?.id || item?.labelToken || ""))
    .filter(Boolean);
}

function hasSubjective(output = {}) {
  const subjective = output?.subjectiveContext || {};
  return Boolean(subjective?.pre?.available || subjective?.post?.available);
}

function hasReflection(output = {}) {
  return Boolean(String(output?.runFacts?.postRunReflection || "").trim());
}

function environmentContext(output = {}) {
  const environment = output?.runFacts?.environment || {};
  const temperatureC = finite(environment.temperatureC) ? Number(environment.temperatureC) : null;
  const environmentNote = String(environment.environmentNote || "").trim();
  return Object.freeze({ temperatureC, environmentNote, available: temperatureC != null || Boolean(environmentNote) });
}

export function selectInterpretationReferenceKnowledge(output = {}, { bodyPair = false } = {}) {
  const ids = conditionIds(output);
  const environment = environmentContext(output);
  let articleId = "";
  let matchReason = "";

  // A body observation remains the strongest user-owned starting point. The
  // reference layer supplies background only; it never explains the user's
  // sensation as a personal cause.
  if (bodyPair) {
    articleId = "context-not-single-cause";
    matchReason = "身体の感じ方を一つの原因に決めないため";
  } else if (environment.temperatureC != null) {
    articleId = "heat-not-temperature-only";
    matchReason = "気温の記録があるため";
  } else if (hasSubjective(output)) {
    articleId = "context-not-single-cause";
    matchReason = "疲労感を一つの原因だけで説明しないため";
  } else if (hasReflection(output)) {
    articleId = "goals-and-recording-differ";
    matchReason = "自分が残した振り返りを次の確認につなげるため";
  } else if (ids.includes("grade") || ids.includes("surface")) {
    articleId = "surface-missingness";
    matchReason = "坂や路面の記録があるため";
  } else if (ids.includes("pace")) {
    articleId = "talk-test-as-subjective-cue";
    matchReason = "走る速さを一つの数字だけで捉えないため";
  } else if (ids.includes("distance") || ids.includes("duration")) {
    articleId = "training-progression-no-universal-rule";
    matchReason = "距離や時間の違いを一つの万能ルールで判断しないため";
  }

  const article = articleById(articleId);
  if (!article) return null;
  return Object.freeze({
    id: article.id,
    title: article.title,
    lead: article.lead,
    summary: article.summary,
    caution: article.caution,
    sourceCount: Array.isArray(article.sources) ? article.sources.length : 0,
    sourceKinds: Object.freeze([...(article.sources || []).map((source) => source.sourceTypeLabel || source.sourceType || "参考資料")]),
    matchReason,
    evidenceGovernance: article.evidenceGovernance || null,
  });
}

function firstConditionFact(output = {}) {
  const rows = Array.isArray(output?.conditions?.differences) ? output.conditions.differences : [];
  const first = rows[0] || null;
  if (!first) return null;
  return Object.freeze({
    id: normalizeInterpretationConditionId(first.id || first.labelToken || ""),
    previous: first.previous,
    current: first.current,
  });
}

export function buildInterpretationContextCandidate(output = {}) {
  const subjective = output?.subjectiveContext || {};
  const reflection = String(output?.runFacts?.postRunReflection || "").trim();
  const environment = environmentContext(output);
  const condition = firstConditionFact(output);
  const reference = selectInterpretationReferenceKnowledge(output, { bodyPair: false });

  const hasMeaningfulMaterial = Boolean(condition || subjective?.pre?.available || subjective?.post?.available || reflection || environment.available);
  if (!hasMeaningfulMaterial || !reference) return null;

  let focusKey = "RUN_CONTEXT";
  let focusLabel = "今回の走行条件";
  let focusValue = "今回の走り方に記録があります";
  let question = "次の走行でも、今回と走り方の条件がどう違うか確認する";

  if (subjective?.post?.available && environment.temperatureC != null) {
    focusKey = "POST_RUN_FATIGUE_ENVIRONMENT_CONTEXT";
    focusLabel = "今回、自分で残した疲労感";
    focusValue = `走行後 ${Number(subjective.post.value).toFixed(0)} / 10`;
    question = "次の走行でも、走行後の疲労感と気温などの環境を別々に残して一緒に確認する";
  } else if (subjective?.post?.available) {
    focusKey = "POST_RUN_FATIGUE_CONTEXT";
    focusLabel = "今回、自分で残した疲労感";
    focusValue = `走行後 ${Number(subjective.post.value).toFixed(0)} / 10`;
    question = "次の走行でも、走行後の疲労感とその日の走行条件を一緒に確認する";
  } else if (reflection) {
    focusKey = "RUN_REFLECTION";
    focusLabel = "今回、自分で残したこと";
    focusValue = reflection;
    question = "次の走行でも、自分が気になったことを一つ残して今回と見比べる";
  } else if (environment.temperatureC != null) {
    focusKey = "ENVIRONMENT_CONTEXT";
    focusLabel = "今回、自分で残した環境";
    focusValue = `気温 ${Number(environment.temperatureC).toFixed(1).replace(/\.0$/, "")} ℃`;
    question = "次の走行でも、気温などの環境を残して今回と見比べる";
  } else if (condition?.id === "pace") {
    focusKey = "PACE_CONTEXT";
    focusLabel = "今回、変わった走る速さ";
    focusValue = "走る速さに違いがあります";
    question = "次の走行でも、走る速さが今回とどう違うか確認する";
  } else if (["distance", "duration"].includes(condition?.id)) {
    focusKey = "VOLUME_CONTEXT";
    focusLabel = "今回、変わった走行量";
    focusValue = condition.id === "distance" ? "距離に違いがあります" : "走行時間に違いがあります";
    question = "次の走行でも、距離や時間が今回とどう違うか確認する";
  } else if (["grade", "surface"].includes(condition?.id)) {
    focusKey = "COURSE_CONTEXT";
    focusLabel = "今回、変わったコース条件";
    focusValue = condition.id === "grade" ? "坂の条件に違いがあります" : "路面の条件に違いがあります";
    question = "次の走行でも、コース条件が今回とどう違うか確認する";
  }

  return Object.freeze({
    kind: "CONTEXT_QUESTION",
    threadType: "CONTEXT_QUESTION",
    subject: Object.freeze({ focusKey, prompt: question, articleId: reference.id }),
    focusKey,
    focusLabel,
    focusValue,
    question,
    reference,
  });
}

export function referenceReadingHref(reference = null, output = {}) {
  if (!reference?.id) return "#/reading";
  const query = new URLSearchParams();
  query.set("articleId", reference.id);
  query.set("from", "interpretation-room");
  query.set("roomOrigin", output?.target?.origin || "result");
  if (output?.target?.recordId) query.set("recordId", output.target.recordId);
  return `#/reading?${query.toString()}`;
}

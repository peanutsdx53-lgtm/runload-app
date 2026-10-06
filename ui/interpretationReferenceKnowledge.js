import { isPresentFiniteNumber as finite } from "../shared/valueUtilities.js";
import { findReadingArticleById } from "../core/appCore.js";

const RECENT_HISTORY_WINDOW = 6;
const RECENCY_PENALTY_BY_POSITION = Object.freeze([28, 18, 10, 6, 3, 1]);
const REPEAT_COUNT_PENALTY = 7;
const UNSEEN_BONUS = 8;

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

function referenceFromCandidate(candidate = null, selectionScore = null) {
  const article = candidate ? articleById(candidate.id) : null;
  if (!article) return null;
  return Object.freeze({
    id: article.id,
    title: article.title,
    lead: article.lead,
    summary: article.summary,
    caution: article.caution,
    sourceCount: Array.isArray(article.sources) ? article.sources.length : 0,
    sourceKinds: Object.freeze([...(article.sources || []).map((source) => source.sourceTypeLabel || source.sourceType || "参考資料")]),
    matchReason: candidate.matchReason,
    signalKey: candidate.signalKey,
    baseScore: candidate.baseScore,
    selectionScore: finite(selectionScore) ? Number(selectionScore) : candidate.baseScore,
    evidenceGovernance: article.evidenceGovernance || null,
  });
}

export function getInterpretationReferenceKnowledgeById(id = "", matchReason = "確認中の問いに関連する一般情報です") {
  return referenceFromCandidate({ id, matchReason, signalKey: "saved-thread", baseScore: 0 }, 0);
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

function supportRoute(output = {}) {
  return String(output?.safety?.route || output?.state?.support || "normal").toLowerCase();
}

function addCandidate(map, candidate) {
  if (!candidate?.id || !articleById(candidate.id)) return;
  const existing = map.get(candidate.id);
  if (!existing || Number(candidate.baseScore) > Number(existing.baseScore)) {
    map.set(candidate.id, Object.freeze({ ...candidate }));
  }
}

export function buildInterpretationReferenceCandidates(output = {}, { bodyPair = false } = {}) {
  if (["urgent", "consult"].includes(supportRoute(output))) return Object.freeze([]);

  const ids = conditionIds(output);
  const uniqueIds = [...new Set(ids.filter((id) => ["distance", "duration", "pace", "grade", "surface", "cadence", "course", "running-format"].includes(id)))];
  const environment = environmentContext(output);
  const candidates = new Map();
  let order = 0;
  const add = (id, baseScore, matchReason, signalKey) => addCandidate(candidates, { id, baseScore, matchReason, signalKey, order: order++ });

  if (bodyPair) {
    add("regional-six-eight-28", 100, "自分の身体記録と12部位の参考表示を別の情報として確認するため", "body-pair");
    if (uniqueIds.length >= 2) add("context-not-single-cause", 88, "複数の走行条件が違うため、一つの原因に決めないため", "multi-conditions");
    else if (environment.available) add("context-not-single-cause", 68, "その日の環境も含めて、一つの原因に決めないため", "environment");
    add("model-limits", 82, "12部位の数字だけで良い・悪いを決めないため", "body-boundary");
    if (String(output?.state?.regional || "") === "AVAILABLE") add("regional-three-views", 60, "12部位の数字をその部位自身の100と比べて読むため", "regional");
    return Object.freeze([...candidates.values()]);
  }

  if (hasSubjective(output)) add("rof-j-how-to-read", 92, "疲労感の0〜10を、自分の主観的な記録として読むため", "fatigue");
  if (uniqueIds.length >= 2) add("context-not-single-cause", 88, "複数の走行条件が違うため、一つの原因に決めないため", "multi-conditions");
  if (ids.includes("grade")) add("grade-and-coverage", 84, "坂の条件に違いがあるため", "grade");
  if (ids.includes("surface")) add("surface-missingness", 84, "路面の条件に違いがあるため", "surface");
  if (ids.includes("pace")) add("talk-test-as-subjective-cue", 80, "走る速さを一つの数字だけで捉えないため", "pace");
  if (ids.includes("distance") || ids.includes("duration")) add("training-progression-no-universal-rule", 78, "距離や時間の違いを一つの万能ルールで判断しないため", "volume");
  if (hasReflection(output)) add("goals-and-recording-differ", 76, "自分が残した振り返りを次の確認につなげるため", "reflection");
  if (ids.some((id) => ["course", "running-format", "cadence"].includes(id))) add("context-not-single-cause", 74, "走り方の条件が違うため、一つの原因に決めないため", "conditions");

  // Temperature alone does not establish a heat condition. Until the app has a
  // structured WBGT/heat input, environment facts feed the general context
  // article rather than automatically selecting the heat-specific article.
  if (environment.available) add("context-not-single-cause", 68, "その日の環境も含めて、一つの原因に決めないため", "environment");
  if (String(output?.state?.regional || "") === "AVAILABLE") add("regional-three-views", 55, "12部位の数字をその部位自身の100と比べて読むため", "regional");

  return Object.freeze([...candidates.values()]);
}

function normalizeRecommendationHistory(history = []) {
  return (Array.isArray(history) ? history : [])
    .map((entry) => Object.freeze({
      recordId: String(entry?.recordId || ""),
      articleId: String(entry?.articleId || ""),
    }))
    .filter((entry) => entry.recordId && entry.articleId);
}

function candidateSelectionScore(candidate, recentHistory = []) {
  const positions = [];
  recentHistory.forEach((entry, index) => {
    if (entry.articleId === candidate.id) positions.push(index);
  });
  const firstPosition = positions[0];
  const recencyPenalty = Number.isInteger(firstPosition) ? Number(RECENCY_PENALTY_BY_POSITION[firstPosition] || 0) : 0;
  const repeatPenalty = positions.length * REPEAT_COUNT_PENALTY;
  const unseenBonus = positions.length === 0 ? UNSEEN_BONUS : 0;
  return Number(candidate.baseScore) - recencyPenalty - repeatPenalty + unseenBonus;
}

export function selectInterpretationReferenceKnowledge(output = {}, { bodyPair = false, recommendationHistory = [] } = {}) {
  const candidates = buildInterpretationReferenceCandidates(output, { bodyPair });
  if (!candidates.length) return null;

  const history = normalizeRecommendationHistory(recommendationHistory);
  const currentRecordId = String(output?.target?.recordId || "");
  const existingForRecord = currentRecordId ? history.find((entry) => entry.recordId === currentRecordId) : null;
  if (existingForRecord) {
    const pinned = candidates.find((candidate) => candidate.id === existingForRecord.articleId);
    if (pinned) return referenceFromCandidate(pinned, candidateSelectionScore(pinned, history.filter((entry) => entry.recordId !== currentRecordId).slice(0, RECENT_HISTORY_WINDOW)));
  }

  const recentHistory = history.filter((entry) => entry.recordId !== currentRecordId).slice(0, RECENT_HISTORY_WINDOW);
  const ranked = candidates.map((candidate) => Object.freeze({
    candidate,
    score: candidateSelectionScore(candidate, recentHistory),
  })).sort((a, b) => b.score - a.score || b.candidate.baseScore - a.candidate.baseScore || a.candidate.order - b.candidate.order);

  return referenceFromCandidate(ranked[0]?.candidate || null, ranked[0]?.score);
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

function uniqueConditionCount(output = {}) {
  return new Set(conditionIds(output).filter((id) => ["distance", "duration", "pace", "grade", "surface", "cadence", "course", "running-format"].includes(id))).size;
}

export function buildInterpretationContextCandidate(output = {}, { recommendationHistory = [] } = {}) {
  const subjective = output?.subjectiveContext || {};
  const reflection = String(output?.runFacts?.postRunReflection || "").trim();
  const environment = environmentContext(output);
  const condition = firstConditionFact(output);
  const reference = selectInterpretationReferenceKnowledge(output, { bodyPair: false, recommendationHistory });

  const hasMeaningfulMaterial = Boolean(condition || subjective?.pre?.available || subjective?.post?.available || reflection || environment.available);
  if (!hasMeaningfulMaterial || !reference) return null;

  let focusKey = "RUN_CONTEXT";
  let focusLabel = "今回の走行条件";
  let focusValue = "今回の走り方に記録があります";
  let question = "次の走行でも、今回と走り方の条件がどう違うか確認する";

  if (reference.signalKey === "fatigue") {
    focusKey = subjective?.post?.available ? "POST_RUN_FATIGUE_CONTEXT" : "PRE_RUN_FATIGUE_CONTEXT";
    focusLabel = "今回、自分で残した疲労感";
    if (subjective?.post?.available) {
      focusValue = `走行後 ${Number(subjective.post.value).toFixed(0)} / 10`;
      question = "次の走行でも、走行後の疲労感とその日の走行条件を一緒に確認する";
    } else {
      focusValue = `走る前 ${Number(subjective.pre.value).toFixed(0)} / 10`;
      question = "次の走行でも、走る前の疲労感とその日の走行条件を一緒に確認する";
    }
  } else if (reference.signalKey === "reflection") {
    focusKey = "RUN_REFLECTION";
    focusLabel = "今回、自分で残したこと";
    focusValue = reflection;
    question = "次の走行でも、自分が気になったことを一つ残して今回と見比べる";
  } else if (reference.signalKey === "environment") {
    focusKey = "ENVIRONMENT_CONTEXT";
    focusLabel = "今回、自分で残した環境";
    focusValue = environment.temperatureC != null
      ? `気温 ${Number(environment.temperatureC).toFixed(1).replace(/\.0$/, "")} ℃`
      : "環境についての記録があります";
    question = "次の走行でも、環境とほかの走行条件を分けて残して見比べる";
  } else if (reference.signalKey === "multi-conditions" || reference.signalKey === "conditions") {
    focusKey = "MULTI_CONDITION_CONTEXT";
    focusLabel = "今回、変わった走行条件";
    const count = Math.max(1, uniqueConditionCount(output));
    focusValue = `${count}項目の条件に違いがあります`;
    question = "次の走行でも、変わった条件を分けて残し、一つに決めず見比べる";
  } else if (reference.signalKey === "pace") {
    focusKey = "PACE_CONTEXT";
    focusLabel = "今回、変わった走る速さ";
    focusValue = "走る速さに違いがあります";
    question = "次の走行でも、走る速さが今回とどう違うか確認する";
  } else if (reference.signalKey === "volume") {
    focusKey = "VOLUME_CONTEXT";
    focusLabel = "今回、変わった走行量";
    focusValue = condition?.id === "duration" ? "走行時間に違いがあります" : "距離や時間に違いがあります";
    question = "次の走行でも、距離や時間が今回とどう違うか確認する";
  } else if (reference.signalKey === "grade") {
    focusKey = "COURSE_CONTEXT";
    focusLabel = "今回、変わったコース条件";
    focusValue = "坂の条件に違いがあります";
    question = "次の走行でも、坂の条件が今回とどう違うか確認する";
  } else if (reference.signalKey === "surface") {
    focusKey = "COURSE_CONTEXT";
    focusLabel = "今回、変わったコース条件";
    focusValue = "路面の条件に違いがあります";
    question = "次の走行でも、路面の条件が今回とどう違うか確認する";
  } else if (reference.signalKey === "regional") {
    focusKey = "REGIONAL_REFERENCE_CONTEXT";
    focusLabel = "今回の12部位の表示";
    focusValue = "部位ごとの基準100との差を確認できます";
    question = "次の走行でも、同じ部位の100との差と走行条件を分けて確認する";
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

export function resolveAutoInterpretationReferenceKnowledge(output = {}, selfUnderstanding = null, { recommendationHistory = [] } = {}) {
  const activeThread = selfUnderstanding?.activeThread || null;
  if (activeThread?.type === "CONTEXT_QUESTION") return null;
  if (activeThread) {
    return selectInterpretationReferenceKnowledge(output, {
      bodyPair: activeThread.type === "REGION_OBSERVATION_PAIR",
      recommendationHistory,
    });
  }
  if (selfUnderstanding?.primaryCandidate?.kind === "BODY_OBSERVATION_PAIR") {
    return selectInterpretationReferenceKnowledge(output, { bodyPair: true, recommendationHistory });
  }
  return buildInterpretationContextCandidate(output, { recommendationHistory })?.reference || null;
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

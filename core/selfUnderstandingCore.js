import { normalizeIsoText as iso, sanitizeText as text } from "../shared/textUtilities.js";
import { cloneJsonValue as clone } from "../shared/valueUtilities.js";
import { compareExperienceRecordChronology, compareStableRecordKeys } from "../shared/recordUtilities.js";
// RunLoad self-understanding memory layer.
// This module never recalculates or redefines the scientific numeric model.

export const SELF_UNDERSTANDING_SCHEMA_VERSION = "SELF_UNDERSTANDING_THREAD_V2";
export const SELF_UNDERSTANDING_STORE_VERSION = "SELF_UNDERSTANDING_STORE_V2";
export const SELF_UNDERSTANDING_TYPES = Object.freeze({
  regionObservationPair: "REGION_OBSERVATION_PAIR",
  regionWatch: "REGION_WATCH",
  sameCourseRofPost: "SAME_COURSE_ROF_POST",
  contextQuestion: "CONTEXT_QUESTION",
});
export const SELF_UNDERSTANDING_STATES = Object.freeze({
  watching: "WATCHING",
  paused: "PAUSED",
  closed: "CLOSED",
});

// Exact mapping already used by the Current body-area input adapter.
// Keep this duplicate mapping parity-tested so self-understanding never pairs a
// user-entered body area with a different display region that merely shares a
// broader model region. Unsupported body areas intentionally have no mapping.
export const SELF_UNDERSTANDING_BODY_AREA_TO_DISPLAY_REGION = Object.freeze({
  "BFR-200-ING": "BA-DISP-014", "BFR-200-COX": "BA-DISP-014",
  "BFR-210-GLU": "BA-DISP-015", "BFR-220-ANT": "BA-DISP-016",
  "BFR-220-POST": "BA-DISP-018", "BFR-230-ANT": "BA-DISP-019",
  "BFR-240-ANT": "BA-DISP-021", "BFR-240-POST": "BA-DISP-023",
  "BFR-250-ANT": "BA-DISP-024", "BFR-260-DOR": "BA-DISP-024",
  "BFR-250-POST": "BA-DISP-025", "BFR-260-REAR": "BA-DISP-027",
  "BFR-260-MID": "BA-DISP-028", "BFR-260-FORE": "BA-DISP-029",
  "BFR-260-TOE": "BA-DISP-029",
});

const THREAD_TYPES = new Set(Object.values(SELF_UNDERSTANDING_TYPES));
const THREAD_STATES = new Set(Object.values(SELF_UNDERSTANDING_STATES));
const REVIEW_DECISIONS = new Set(["KEEP_WATCHING", "PAUSE", "CLOSE", "VIEWED"]);


function oneLine(value, max = 160) {
  return text(value, max).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function stableRecordKeyFromRecord(record = {}) {
  return `${String(record.date || "")}|${String(record.createdAt || "")}|${String(record.id || "")}`;
}

export function selfUnderstandingStableRecordKey(record = {}) {
  return stableRecordKeyFromRecord(record);
}

function normalizeSignature(source = {}) {
  if (!source || typeof source !== "object") return null;
  const signature = {
    regionId: oneLine(source.regionId, 80),
    primaryRegionId: oneLine(source.primaryRegionId, 40),
    modelVersion: oneLine(source.modelVersion, 120),
    outputSemanticVersion: oneLine(source.outputSemanticVersion, 120),
    constructId: oneLine(source.constructId, 120),
    referenceId: oneLine(source.referenceId, 120),
  };
  return signature.regionId && signature.modelVersion && signature.outputSemanticVersion
    ? Object.freeze(signature)
    : null;
}

function signaturesCompatible(left, right) {
  if (!left || !right) return false;
  return left.regionId === right.regionId
    && left.modelVersion === right.modelVersion
    && left.outputSemanticVersion === right.outputSemanticVersion
    && left.constructId === right.constructId
    && left.referenceId === right.referenceId;
}

function normalizeSubject(type, source = {}) {
  const subject = source && typeof source === "object" ? source : {};
  if (type === SELF_UNDERSTANDING_TYPES.regionObservationPair) {
    const regionId = oneLine(subject.regionId, 80);
    const primaryRegionId = oneLine(subject.primaryRegionId, 40);
    const bodyAreaId = oneLine(subject.bodyAreaId, 80);
    if (!regionId || !bodyAreaId || SELF_UNDERSTANDING_BODY_AREA_TO_DISPLAY_REGION[bodyAreaId] !== regionId) return null;
    return Object.freeze({ regionId, primaryRegionId, bodyAreaId });
  }
  if (type === SELF_UNDERSTANDING_TYPES.regionWatch) {
    const regionId = oneLine(subject.regionId, 80);
    const primaryRegionId = oneLine(subject.primaryRegionId, 40);
    if (!regionId) return null;
    return Object.freeze({ regionId, primaryRegionId });
  }
  if (type === SELF_UNDERSTANDING_TYPES.sameCourseRofPost) {
    const courseId = oneLine(subject.courseId, 120);
    const courseName = oneLine(subject.courseName, 120);
    if (!courseId) return null;
    return Object.freeze({ courseId, courseName });
  }
  if (type === SELF_UNDERSTANDING_TYPES.contextQuestion) {
    const prompt = text(subject.prompt, 500).trim();
    const focusKey = oneLine(subject.focusKey, 120);
    const articleId = oneLine(subject.articleId, 160);
    if (!prompt || !focusKey) return null;
    return Object.freeze({ prompt, focusKey, articleId });
  }
  return null;
}

function subjectKey(type, subject = {}) {
  if (type === SELF_UNDERSTANDING_TYPES.regionObservationPair) return `pair:${subject.regionId}:${subject.bodyAreaId}`;
  if (type === SELF_UNDERSTANDING_TYPES.regionWatch) return `region:${subject.regionId}`;
  if (type === SELF_UNDERSTANDING_TYPES.sameCourseRofPost) return `course-rof-post:${subject.courseId}`;
  if (type === SELF_UNDERSTANDING_TYPES.contextQuestion) return `context:${subject.focusKey}:${subject.prompt}`;
  return "";
}

function normalizeReviewEvent(event = {}) {
  const decision = oneLine(event.decision, 40).toUpperCase();
  const recordId = oneLine(event.recordId, 120);
  const reviewedAt = iso(event.reviewedAt);
  if (!REVIEW_DECISIONS.has(decision) || !reviewedAt) return null;
  return Object.freeze({
    recordId,
    stableRecordKey: oneLine(event.stableRecordKey, 260),
    reviewedAt,
    decision,
    optionalNote: text(event.optionalNote, 500).trim(),
  });
}

export function normalizeSelfUnderstandingThread(item = {}) {
  if (!item || typeof item !== "object") return null;
  const type = oneLine(item.type, 60).toUpperCase();
  const userState = oneLine(item.userState || item.status, 40).toUpperCase();
  const subject = normalizeSubject(type, item.subject || {});
  const id = oneLine(item.id, 180);
  const createdAt = iso(item.createdAt);
  if (!id || !THREAD_TYPES.has(type) || !THREAD_STATES.has(userState) || !subject || !createdAt) return null;
  const events = (Array.isArray(item.reviewEvents) ? item.reviewEvents : [])
    .map(normalizeReviewEvent)
    .filter(Boolean)
    .slice(-200);
  return Object.freeze({
    id,
    schemaVersion: SELF_UNDERSTANDING_SCHEMA_VERSION,
    type,
    subject,
    subjectKey: subjectKey(type, subject),
    createdAt,
    createdFromRecordId: oneLine(item.createdFromRecordId, 120),
    createdFromStableRecordKey: oneLine(item.createdFromStableRecordKey, 260),
    userState,
    semanticConstraints: Object.freeze({
      regionSignature: normalizeSignature(item.semanticConstraints?.regionSignature),
    }),
    lastReviewedStableRecordKey: oneLine(item.lastReviewedStableRecordKey, 260),
    optionalUserLabel: oneLine(item.optionalUserLabel, 120),
    reviewEvents: Object.freeze(events),
    updatedAt: iso(item.updatedAt, createdAt),
  });
}

function sortThreads(items = []) {
  return [...items].sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)) || a.id.localeCompare(b.id));
}

export function createSelfUnderstandingRepository(gateway, storageKey) {
  function loadAllResult() {
    const read = gateway.readJsonResult(storageKey, []);
    if (!read.ok) return { ...read, code: "SELF_UNDERSTANDING_READ_FAILED", items: [] };
    if (!Array.isArray(read.value)) return { ok: false, code: "SELF_UNDERSTANDING_STORAGE_INVALID", items: [] };
    return { ok: true, exists: read.exists, items: sortThreads(read.value.map(normalizeSelfUnderstandingThread).filter(Boolean)) };
  }
  function loadAll() {
    const result = loadAllResult();
    return result.ok ? result.items.map(clone) : [];
  }
  function saveAll(items) {
    const normalized = sortThreads((Array.isArray(items) ? items : []).map(normalizeSelfUnderstandingThread).filter(Boolean));
    const result = gateway.writeJson(storageKey, normalized);
    return { ...result, items: result.ok ? normalized.map(clone) : loadAll() };
  }
  function findById(id) {
    return loadAll().find((item) => item.id === String(id || "")) || null;
  }
  function createOrResume({ type, subject, createdFromRecord = {}, semanticConstraints = {}, optionalUserLabel = "", now = new Date().toISOString() } = {}) {
    const normalizedType = oneLine(type, 60).toUpperCase();
    const normalizedSubject = normalizeSubject(normalizedType, subject);
    if (!THREAD_TYPES.has(normalizedType) || !normalizedSubject) return { ok: false, code: "SELF_UNDERSTANDING_SUBJECT_INVALID", item: null };
    const current = loadAllResult();
    if (!current.ok) return { ...current, item: null };
    const key = subjectKey(normalizedType, normalizedSubject);
    const existing = current.items.find((thread) => thread.type === normalizedType && thread.subjectKey === key && thread.userState !== SELF_UNDERSTANDING_STATES.closed);
    const stamp = iso(now, new Date().toISOString());
    const next = existing ? {
      ...existing,
      userState: SELF_UNDERSTANDING_STATES.watching,
      optionalUserLabel: oneLine(optionalUserLabel || existing.optionalUserLabel, 120),
      updatedAt: stamp,
    } : {
      id: `self-understanding-${normalizedType.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      schemaVersion: SELF_UNDERSTANDING_SCHEMA_VERSION,
      type: normalizedType,
      subject: normalizedSubject,
      createdAt: stamp,
      createdFromRecordId: oneLine(createdFromRecord?.id, 120),
      createdFromStableRecordKey: stableRecordKeyFromRecord(createdFromRecord),
      userState: SELF_UNDERSTANDING_STATES.watching,
      semanticConstraints: { regionSignature: normalizeSignature(semanticConstraints.regionSignature) },
      lastReviewedStableRecordKey: stableRecordKeyFromRecord(createdFromRecord),
      optionalUserLabel: oneLine(optionalUserLabel, 120),
      reviewEvents: [],
      updatedAt: stamp,
    };
    const normalized = normalizeSelfUnderstandingThread(next);
    if (!normalized) return { ok: false, code: "SELF_UNDERSTANDING_THREAD_INVALID", item: null };
    const others = current.items.filter((thread) => thread.id !== normalized.id);
    const saved = saveAll([...others, normalized]);
    return { ...saved, item: saved.ok ? clone(normalized) : null, resumed: Boolean(existing) };
  }
  function review(threadId, { record = {}, decision = "VIEWED", optionalNote = "", now = new Date().toISOString() } = {}) {
    const current = loadAllResult();
    if (!current.ok) return current;
    const item = current.items.find((thread) => thread.id === String(threadId || ""));
    if (!item) return { ok: false, code: "SELF_UNDERSTANDING_THREAD_NOT_FOUND" };
    const normalizedDecision = oneLine(decision, 40).toUpperCase();
    if (!REVIEW_DECISIONS.has(normalizedDecision)) return { ok: false, code: "SELF_UNDERSTANDING_DECISION_INVALID" };
    const stamp = iso(now, new Date().toISOString());
    const state = normalizedDecision === "PAUSE" ? SELF_UNDERSTANDING_STATES.paused
      : normalizedDecision === "CLOSE" ? SELF_UNDERSTANDING_STATES.closed
        : SELF_UNDERSTANDING_STATES.watching;
    const stableKey = stableRecordKeyFromRecord(record);
    const next = normalizeSelfUnderstandingThread({
      ...item,
      userState: state,
      lastReviewedStableRecordKey: stableKey || item.lastReviewedStableRecordKey,
      reviewEvents: [...item.reviewEvents, {
        recordId: oneLine(record?.id, 120),
        stableRecordKey: stableKey,
        reviewedAt: stamp,
        decision: normalizedDecision,
        optionalNote: text(optionalNote, 500).trim(),
      }],
      updatedAt: stamp,
    });
    const saved = saveAll(current.items.map((thread) => thread.id === item.id ? next : thread));
    return { ...saved, item: saved.ok ? clone(next) : null };
  }
  function updateNote(threadId, optionalUserLabel = "", now = new Date().toISOString()) {
    const current = loadAllResult();
    if (!current.ok) return current;
    const item = current.items.find((thread) => thread.id === String(threadId || ""));
    if (!item) return { ok: false, code: "SELF_UNDERSTANDING_THREAD_NOT_FOUND" };
    const next = normalizeSelfUnderstandingThread({ ...item, optionalUserLabel: oneLine(optionalUserLabel, 120), updatedAt: iso(now, new Date().toISOString()) });
    const saved = saveAll(current.items.map((thread) => thread.id === item.id ? next : thread));
    return { ...saved, item: saved.ok ? clone(next) : null };
  }
  return Object.freeze({ loadAllResult, loadAll, saveAll, findById, createOrResume, review, updateNote });
}

function resultRows(experience = {}) {
  return Array.isArray(experience?.regionalV2ResultRecord?.result?.regions)
    ? experience.regionalV2ResultRecord.result.regions
    : Array.isArray(experience?.regionalV2Result?.regions) ? experience.regionalV2Result.regions : [];
}

function resultRow(experience = {}, regionId = "") {
  return resultRows(experience).find((row) => String(row?.regionId || "") === String(regionId || "")) || null;
}

function signatureFor(experience = {}, regionId = "") {
  const signature = experience?.regionalV2ResultRecord?.comparison_signatures?.[regionId] || null;
  return normalizeSignature(signature);
}

function bodyObservationForSubject(experience = {}, subject = {}) {
  const observations = Array.isArray(experience?.feedback?.bodyAreaObservations) ? experience.feedback.bodyAreaObservations : [];
  const bodyAreaId = String(subject?.bodyAreaId || "");
  if (!bodyAreaId || SELF_UNDERSTANDING_BODY_AREA_TO_DISPLAY_REGION[bodyAreaId] !== String(subject?.regionId || "")) return null;
  return observations.find((item) => String(item?.areaId || "") === bodyAreaId && Number(item?.intensity) >= 1) || null;
}

function courseIdentity(record = {}) {
  const course = record.course && typeof record.course === "object" ? record.course : {};
  const id = oneLine(course.id || course.courseId, 120);
  return Object.freeze({ id, name: oneLine(course.name || record.courseName, 120) });
}

function rofPost(rofSummariesByRecordId, recordId) {
  const summary = rofSummariesByRecordId?.get?.(recordId) || rofSummariesByRecordId?.[recordId] || null;
  return Number.isFinite(Number(summary?.post)) ? Number(summary.post) : null;
}

function runContextFromRecord(record = {}) {
  const distanceKm = Number.isFinite(Number(record.distanceKm)) ? Number(record.distanceKm) : null;
  const durationMinutes = Number.isFinite(Number(record.durationMinutes)) ? Number(record.durationMinutes) : null;
  const runningFormat = oneLine(record.runningFormat, 60);
  const course = courseIdentity(record);
  const gradeKnowledge = oneLine(record?.course?.gradeKnowledge || record?.gradeKnowledge, 60);
  const reflection = text(record?.reflectionContext?.postRunReflection, 500).trim();
  const temperatureC = Number.isFinite(Number(record?.environmentContext?.temperatureC)) ? Number(record.environmentContext.temperatureC) : null;
  const environmentNote = text(record?.environmentContext?.environmentNote, 500).trim();
  return Object.freeze({ distanceKm, durationMinutes, runningFormat, course, gradeKnowledge, reflection, environment: Object.freeze({ temperatureC, environmentNote }) });
}

function contextQuestionEligible(thread, runContext, postRofJ) {
  const focusKey = String(thread?.subject?.focusKey || "");
  const hasPace = Number(runContext?.distanceKm) > 0 && Number(runContext?.durationMinutes) > 0;
  const hasVolume = Number(runContext?.distanceKm) > 0 || Number(runContext?.durationMinutes) > 0;
  const hasCourse = Boolean(runContext?.course?.id || runContext?.course?.name || runContext?.gradeKnowledge);
  const hasEnvironment = runContext?.environment?.temperatureC != null || Boolean(runContext?.environment?.environmentNote);
  if (focusKey === "POST_RUN_FATIGUE_ENVIRONMENT_CONTEXT") return postRofJ != null && hasEnvironment;
  if (focusKey === "POST_RUN_FATIGUE_CONTEXT") return postRofJ != null;
  if (["PACE_CONTEXT", "PACE_AND_FEEL"].includes(focusKey)) return hasPace;
  if (["VOLUME_CONTEXT", "VOLUME_AND_FEEL"].includes(focusKey)) return hasVolume;
  if (["COURSE_CONTEXT", "COURSE_CONTEXT_AND_FEEL"].includes(focusKey)) return hasCourse;
  if (focusKey === "ENVIRONMENT_CONTEXT") return hasEnvironment;
  if (focusKey === "RUN_REFLECTION") return Boolean(runContext?.reflection);
  return Boolean(hasVolume || hasCourse || hasEnvironment || postRofJ != null || runContext?.reflection);
}

function episodeEvidence(thread, experience, rofSummariesByRecordId) {
  const record = experience?.record || null;
  if (!record || String(record.activityType || "").toLowerCase() !== "run") return null;
  const stableKey = stableRecordKeyFromRecord(record);
  if (!stableKey) return null;

  if (thread.type === SELF_UNDERSTANDING_TYPES.regionObservationPair) {
    const row = resultRow(experience, thread.subject.regionId);
    const currentSignature = signatureFor(experience, thread.subject.regionId);
    if (!row || !Number.isFinite(Number(row.value)) || !signaturesCompatible(thread.semanticConstraints.regionSignature, currentSignature)) return null;
    const observation = bodyObservationForSubject(experience, thread.subject);
    if (!observation) return null;
    return Object.freeze({ kind: thread.type, recordId: record.id, stableRecordKey: stableKey, date: record.date, row: clone(row), observation: clone(observation), runContext: runContextFromRecord(record), postRofJ: rofPost(rofSummariesByRecordId, record.id) });
  }

  if (thread.type === SELF_UNDERSTANDING_TYPES.regionWatch) {
    const row = resultRow(experience, thread.subject.regionId);
    const currentSignature = signatureFor(experience, thread.subject.regionId);
    if (!row || !Number.isFinite(Number(row.value)) || !signaturesCompatible(thread.semanticConstraints.regionSignature, currentSignature)) return null;
    return Object.freeze({ kind: thread.type, recordId: record.id, stableRecordKey: stableKey, date: record.date, row: clone(row), runContext: runContextFromRecord(record), postRofJ: rofPost(rofSummariesByRecordId, record.id) });
  }

  if (thread.type === SELF_UNDERSTANDING_TYPES.sameCourseRofPost) {
    const identity = courseIdentity(record);
    const post = rofPost(rofSummariesByRecordId, record.id);
    if (!identity.id || identity.id !== thread.subject.courseId || post == null) return null;
    return Object.freeze({ kind: thread.type, recordId: record.id, stableRecordKey: stableKey, date: record.date, postRofJ: post, course: identity });
  }

  if (thread.type === SELF_UNDERSTANDING_TYPES.contextQuestion) {
    const runContext = runContextFromRecord(record);
    const postRofJ = rofPost(rofSummariesByRecordId, record.id);
    if (!contextQuestionEligible(thread, runContext, postRofJ)) return null;
    return Object.freeze({
      kind: thread.type,
      recordId: record.id,
      stableRecordKey: stableKey,
      date: record.date,
      runContext,
      postRofJ,
    });
  }

  return null;
}

function eligibleEpisode(thread, experience, rofSummariesByRecordId) {
  const episode = episodeEvidence(thread, experience, rofSummariesByRecordId);
  if (!episode || compareStableRecordKeys(episode.stableRecordKey, thread.createdFromStableRecordKey) <= 0) return null;
  return episode;
}

function threadTitle(thread = {}, regionLabels = new Map()) {
  if (thread.optionalUserLabel) return thread.optionalUserLabel;
  if (thread.type === SELF_UNDERSTANDING_TYPES.regionObservationPair) {
    return `${regionLabels.get(thread.subject.regionId) || thread.subject.regionId}：自分の記録と部位表示を一緒に見る`;
  }
  if (thread.type === SELF_UNDERSTANDING_TYPES.regionWatch) {
    return `${regionLabels.get(thread.subject.regionId) || thread.subject.regionId}の表示を次も見る`;
  }
  if (thread.type === SELF_UNDERSTANDING_TYPES.sameCourseRofPost) {
    return `${thread.subject.courseName || "同じコース"}で走行後の疲労感を見る`;
  }
  if (thread.type === SELF_UNDERSTANDING_TYPES.contextQuestion) return thread.subject.prompt;
  return "次回見ること";
}

function currentPairCandidate(targetExperience) {
  const rows = resultRows(targetExperience);
  if (!rows.length) return null;
  const observations = Array.isArray(targetExperience?.feedback?.bodyAreaObservations) ? targetExperience.feedback.bodyAreaObservations : [];
  const candidates = observations.map((observation, index) => {
    if (!(Number(observation?.intensity) >= 1)) return null;
    const bodyAreaId = String(observation?.areaId || "");
    const exactRegionId = SELF_UNDERSTANDING_BODY_AREA_TO_DISPLAY_REGION[bodyAreaId] || "";
    if (!exactRegionId) return null;
    const row = rows.find((candidate) => String(candidate?.regionId || "") === exactRegionId);
    if (!row || !Number.isFinite(Number(row.value))) return null;
    const signature = signatureFor(targetExperience, row.regionId);
    if (!signature) return null;
    return { observation, row, signature, bodyAreaId, index, intensity: Number(observation.intensity) };
  }).filter(Boolean).sort((left, right) => right.intensity - left.intensity || left.index - right.index);
  const selected = candidates[0];
  if (!selected) return null;
  return Object.freeze({
    kind: "BODY_OBSERVATION_PAIR",
    threadType: SELF_UNDERSTANDING_TYPES.regionObservationPair,
    subject: Object.freeze({ regionId: String(selected.row.regionId), primaryRegionId: String(selected.row.primaryRegionId || selected.observation.modelRegionId), bodyAreaId: selected.bodyAreaId }),
    semanticConstraints: Object.freeze({ regionSignature: selected.signature }),
    row: clone(selected.row),
    observation: clone(selected.observation),
    otherObservationCount: Math.max(0, candidates.length - 1),
  });
}

function regionLabelsFromExperiences(experiences = []) {
  const map = new Map();
  experiences.forEach((experience) => resultRows(experience).forEach((row) => {
    if (row?.regionId && row?.regionName) map.set(String(row.regionId), String(row.regionName));
  }));
  return map;
}

export function buildSelfUnderstandingView({
  targetExperience = null,
  allExperiences = [],
  threads = [],
  rofSummariesByRecordId = new Map(),
  supportDecision = null,
} = {}) {
  const experiences = (Array.isArray(allExperiences) ? allExperiences : []).filter(Boolean)
    .sort(compareExperienceRecordChronology);
  const normalizedThreads = (Array.isArray(threads) ? threads : []).map(normalizeSelfUnderstandingThread).filter(Boolean);
  const regionLabels = regionLabelsFromExperiences(experiences);
  const threadViews = normalizedThreads.map((thread) => {
    const sourceExperience = experiences.find((experience) => String(experience?.record?.id || "") === String(thread.createdFromRecordId || "")) || null;
    const sourceEpisode = sourceExperience ? episodeEvidence(thread, sourceExperience, rofSummariesByRecordId) : null;
    const episodes = experiences.map((experience) => eligibleEpisode(thread, experience, rofSummariesByRecordId)).filter(Boolean);
    const newEpisodes = thread.userState === SELF_UNDERSTANDING_STATES.watching
      ? episodes.filter((episode) => compareStableRecordKeys(episode.stableRecordKey, thread.lastReviewedStableRecordKey || thread.createdFromStableRecordKey) > 0)
      : [];
    return Object.freeze({
      ...thread,
      title: threadTitle(thread, regionLabels),
      sourceEpisode,
      eligibleEpisodes: Object.freeze(episodes),
      eligibleCount: episodes.length + (sourceEpisode ? 1 : 0),
      sourceAvailable: Boolean(sourceEpisode),
      newEpisodes: Object.freeze(newEpisodes),
      newCount: newEpisodes.length,
      hasNewEligibleData: newEpisodes.length > 0,
    });
  });

  const targetKey = stableRecordKeyFromRecord(targetExperience?.record || {});
  const activeWithTarget = threadViews
    .filter((thread) => thread.userState === SELF_UNDERSTANDING_STATES.watching && thread.hasNewEligibleData)
    .filter((thread) => thread.newEpisodes.some((episode) => episode.recordId === targetExperience?.record?.id))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null;

  const candidate = String(supportDecision?.route || "normal") === "normal" && !activeWithTarget
    ? currentPairCandidate(targetExperience)
    : null;

  const candidateAlreadyWatched = candidate ? threadViews.some((thread) => (
    thread.userState !== SELF_UNDERSTANDING_STATES.closed
    && thread.type === candidate.threadType
    && thread.subjectKey === subjectKey(candidate.threadType, candidate.subject)
  )) : false;

  const watching = threadViews.filter((thread) => thread.userState === SELF_UNDERSTANDING_STATES.watching);
  const paused = threadViews.filter((thread) => thread.userState === SELF_UNDERSTANDING_STATES.paused);
  const closed = threadViews.filter((thread) => thread.userState === SELF_UNDERSTANDING_STATES.closed);
  const newTotal = watching.reduce((sum, thread) => sum + thread.newCount, 0);
  const newThreadCount = watching.filter((thread) => thread.hasNewEligibleData).length;

  const targetCourse = courseIdentity(targetExperience?.record || {});
  const targetPostRofJ = rofPost(rofSummariesByRecordId, targetExperience?.record?.id);
  return Object.freeze({
    version: SELF_UNDERSTANDING_STORE_VERSION,
    targetRecordId: String(targetExperience?.record?.id || ""),
    targetStableRecordKey: targetKey,
    targetContext: Object.freeze({ course: targetCourse, postRofJ: targetPostRofJ }),
    activeThread: activeWithTarget,
    primaryCandidate: candidate && !candidateAlreadyWatched ? candidate : null,
    threads: Object.freeze(threadViews),
    watching: Object.freeze(watching),
    paused: Object.freeze(paused),
    closed: Object.freeze(closed),
    counts: Object.freeze({ watching: watching.length, paused: paused.length, closed: closed.length, newTotal, newThreadCount }),
  });
}

export function selfUnderstandingThreadTitle(thread, experiences = []) {
  return threadTitle(normalizeSelfUnderstandingThread(thread) || thread, regionLabelsFromExperiences(experiences));
}

export function selfUnderstandingRegionSignature(experience, regionId) {
  return signatureFor(experience, regionId);
}

export function selfUnderstandingCourseIdentity(record) {
  return courseIdentity(record);
}

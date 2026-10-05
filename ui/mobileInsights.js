import { isPresentFiniteNumber as finite } from "../shared/valueUtilities.js";
import { escapeHtml } from "./commonComponents.js";
import { formatLocalDate } from "./recordPresentation.js";
import { listMobileExtensionRecords } from "./mobileWalkJogRecordStore.js";
import { achievementSummary } from "./mobileAchievements.js";
import { buildRunFingerprint, renderRunFingerprintSvg } from "./runFingerprint.js";


function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function localDateFromTimestamp(value = "") {
  const date = new Date(String(value || ""));
  if (!Number.isFinite(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function activityLabel(activityId = "") {
  const value = String(activityId || "").toUpperCase();
  if (value === "WALK") return "ウォーキング";
  if (value === "JOGGING") return "ジョギング";
  if (value === "MIXED") return "走り＋歩き";
  return "ランニング";
}

function chronologyKey(item = {}) {
  const date = String(item.date || "");
  const createdAt = String(item.createdAt || "");
  return `${date}|${createdAt}|${String(item.id || "")}`;
}

function fatiguePoint({ id = "", date = "", createdAt = "", activity = "", pre = null, post = null, source = "" } = {}) {
  const before = finite(pre) ? Number(pre) : null;
  const after = finite(post) ? Number(post) : null;
  if (!finite(before) && !finite(after)) return null;
  return Object.freeze({
    id: String(id),
    date: String(date || localDateFromTimestamp(createdAt)),
    createdAt: String(createdAt || ""),
    activity: String(activity || ""),
    pre: before,
    post: after,
    delta: finite(before) && finite(after) ? after - before : null,
    source: String(source || ""),
  });
}

export function collectMobileFatigueHistory(services, { limit = 8 } = {}) {
  const points = [];
  const records = services?.storage?.records?.loadAll?.() || [];
  records.forEach((record) => {
    if (record?.activityType !== "run") return;
    const summary = services?.fatigue?.summarizeRun?.(record.id) || null;
    const point = fatiguePoint({
      id: record.id,
      date: record.date,
      createdAt: record.createdAt,
      activity: "ランニング",
      pre: summary?.available ? summary.pre : null,
      post: summary?.available ? summary.post : null,
      source: "RUN_CURRENT",
    });
    if (point) points.push(point);
  });

  listMobileExtensionRecords().forEach((record) => {
    const point = fatiguePoint({
      id: record.id,
      date: localDateFromTimestamp(record.endedAt || record.startedAt || record.createdAt),
      createdAt: record.createdAt,
      activity: activityLabel(record.activityId),
      pre: record.fatigue?.pre,
      post: record.fatigue?.post,
      source: "SMARTPHONE_EXTENSION",
    });
    if (point) points.push(point);
  });

  const sorted = points.sort((left, right) => chronologyKey(left).localeCompare(chronologyKey(right)));
  const max = Math.max(1, Number(limit) || 8);
  return Object.freeze(sorted.slice(-max));
}

function chartX(index, count) {
  if (count <= 1) return 160;
  return 28 + (264 * index) / (count - 1);
}

function chartY(value) {
  if (!finite(value)) return null;
  return 18 + ((10 - clamp(Number(value), 0, 10)) / 10) * 94;
}

function seriesLines(points, key, className) {
  const lines = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const y1 = chartY(previous[key]);
    const y2 = chartY(current[key]);
    if (!finite(y1) || !finite(y2)) continue;
    lines.push(`<line class="${className}" x1="${chartX(index - 1, points.length)}" y1="${y1}" x2="${chartX(index, points.length)}" y2="${y2}"></line>`);
  }
  return lines.join("");
}

function seriesDots(points, key, className) {
  return points.map((point, index) => {
    const y = chartY(point[key]);
    if (!finite(y)) return "";
    return `<circle class="${className}" cx="${chartX(index, points.length)}" cy="${y}" r="5"><title>${escapeHtml(`${formatLocalDate(point.date)} ${key === "pre" ? "運動前" : "運動後"} ${Number(point[key])}`)}</title></circle>`;
  }).join("");
}

export function renderMobileFatigueTrend(services) {
  const points = collectMobileFatigueHistory(services, { limit: 8 });
  if (!points.length) return "";
  const latest = points.at(-1);
  const latestDelta = finite(latest.delta) ? `${latest.delta > 0 ? "+" : ""}${latest.delta}` : "—";
  const latestPair = `${finite(latest.pre) ? latest.pre : "—"} → ${finite(latest.post) ? latest.post : "—"}`;
  return `<section class="mobile-fatigue-trend" aria-labelledby="mobile-fatigue-trend-title">
    <header><div><small>FATIGUE TREND</small><h2 id="mobile-fatigue-trend-title">疲労感の推移</h2></div><span>直近 ${points.length}件</span></header>
    <div class="mobile-fatigue-trend__chart">
      <svg viewBox="0 0 320 132" role="img" aria-label="運動前後の疲労感の推移">
        <g class="mobile-fatigue-trend__grid" aria-hidden="true"><line x1="24" y1="18" x2="304" y2="18"></line><line x1="24" y1="65" x2="304" y2="65"></line><line x1="24" y1="112" x2="304" y2="112"></line><text x="7" y="22">10</text><text x="13" y="69">5</text><text x="13" y="116">0</text></g>
        ${seriesLines(points, "pre", "mobile-fatigue-trend__line is-pre")}
        ${seriesLines(points, "post", "mobile-fatigue-trend__line is-post")}
        ${seriesDots(points, "pre", "mobile-fatigue-trend__dot is-pre")}
        ${seriesDots(points, "post", "mobile-fatigue-trend__dot is-post")}
      </svg>
      <div class="mobile-fatigue-trend__legend"><span><i class="is-pre"></i>運動前</span><span><i class="is-post"></i>運動後</span></div>
    </div>
    <footer><div><small>${escapeHtml(formatLocalDate(latest.date))}・${escapeHtml(latest.activity)}</small><strong>${escapeHtml(latestPair)}</strong></div><span><small>前後差</small><b>${escapeHtml(latestDelta)}</b></span></footer>
    <p>本人記録の0〜10を時系列で表示。良し悪しは判定しません。</p>
  </section>`;
}

function recordCourseKey(record = {}) {
  const course = record.course || {};
  const id = String(course.id || course.courseId || "").trim();
  if (id) return `id:${id}`;
  const name = String(course.name || "").trim();
  if (!name || name === "未設定" || name === "コース名なし") return "";
  return `name:${name.toLocaleLowerCase("ja-JP")}`;
}

function recordChronology(record = {}) {
  return `${String(record.date || "")}|${String(record.createdAt || "")}|${String(record.id || "")}`;
}

function paceSeconds(record = {}) {
  const distance = Number(record.distanceKm);
  const duration = Number(record.durationMinutes);
  return distance > 0 && duration > 0 ? (duration * 60) / distance : null;
}

function paceLabel(seconds) {
  if (!finite(seconds)) return "—";
  const rounded = Math.max(0, Math.round(Number(seconds)));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function signedNumber(value, digits = 1, unit = "") {
  if (!finite(value)) return "—";
  const number = Number(value);
  const rounded = Number(number.toFixed(digits));
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${rounded}${unit}`;
}

function signedPaceDelta(seconds) {
  if (!finite(seconds)) return "—";
  const value = Math.round(Number(seconds));
  const prefix = value > 0 ? "+" : value < 0 ? "−" : "±";
  const absolute = Math.abs(value);
  return `${prefix}${Math.floor(absolute / 60)}:${String(absolute % 60).padStart(2, "0")}`;
}

export function findPreviousSameCourse(record = {}, allExperiences = []) {
  const key = recordCourseKey(record);
  if (!key || record.activityType !== "run") return null;
  const currentKey = recordChronology(record);
  const candidates = allExperiences
    .map((experience) => experience?.record)
    .filter(Boolean)
    .filter((candidate) => candidate.id !== record.id && candidate.activityType === "run")
    .filter((candidate) => recordCourseKey(candidate) === key)
    .filter((candidate) => recordChronology(candidate) < currentKey)
    .sort((left, right) => recordChronology(right).localeCompare(recordChronology(left)));
  const previous = candidates[0] || null;
  if (!previous) return null;
  const currentPace = paceSeconds(record);
  const previousPace = paceSeconds(previous);
  return Object.freeze({
    previous,
    distanceDeltaKm: finite(record.distanceKm) && finite(previous.distanceKm) ? Number(record.distanceKm) - Number(previous.distanceKm) : null,
    durationDeltaMinutes: finite(record.durationMinutes) && finite(previous.durationMinutes) ? Number(record.durationMinutes) - Number(previous.durationMinutes) : null,
    paceDeltaSeconds: finite(currentPace) && finite(previousPace) ? Number(currentPace) - Number(previousPace) : null,
    currentPace,
    previousPace,
  });
}

export function renderSameCourseComparison(record = {}, allExperiences = []) {
  const comparison = findPreviousSameCourse(record, allExperiences);
  if (!comparison) return "";
  const previous = comparison.previous;
  return `<section class="mobile-course-compare" aria-labelledby="mobile-course-compare-title">
    <header><div><small>SAME COURSE</small><h2 id="mobile-course-compare-title">同じコース</h2></div><span>前回 ${escapeHtml(formatLocalDate(previous.date))}</span></header>
    <div class="mobile-course-compare__metrics">
      <article><small>距離差</small><strong>${escapeHtml(signedNumber(comparison.distanceDeltaKm, 2, " km"))}</strong><span>${escapeHtml(`${Number(previous.distanceKm || 0).toFixed(2)} → ${Number(record.distanceKm || 0).toFixed(2)} km`)}</span></article>
      <article><small>時間差</small><strong>${escapeHtml(signedNumber(comparison.durationDeltaMinutes, 1, " 分"))}</strong><span>${escapeHtml(`${Number(previous.durationMinutes || 0).toFixed(1)} → ${Number(record.durationMinutes || 0).toFixed(1)} 分`)}</span></article>
      <article><small>ペース差</small><strong>${escapeHtml(signedPaceDelta(comparison.paceDeltaSeconds))}</strong><span>${escapeHtml(`${paceLabel(comparison.previousPace)} → ${paceLabel(comparison.currentPace)} /km`)}</span></article>
    </div>
    <a href="#/result?recordId=${encodeURIComponent(previous.id)}">前回の結果を見る <b aria-hidden="true">›</b></a>
  </section>`;
}

export function renderRunCapsule(services, record = {}, { measurement = null, fatigue = null } = {}) {
  if (record.activityType !== "run") return "";
  const summary = achievementSummary(services);
  const fingerprint = buildRunFingerprint(record, { measurement, fatigue });
  const pace = paceSeconds(record);
  const fatiguePair = `${finite(fatigue?.pre) ? Number(fatigue.pre) : "—"} → ${finite(fatigue?.post) ? Number(fatigue.post) : "—"}`;
  const energy = Number(measurement?.energyEstimate?.estimatedKcal);
  return `<section class="run-capsule" aria-labelledby="run-capsule-title">
    <header><div><small>RUN CAPSULE</small><h2 id="run-capsule-title">今回の記録</h2></div><time datetime="${escapeHtml(record.date || "")}">${escapeHtml(formatLocalDate(record.date))}</time></header>
    <div class="run-capsule__body">
      <div class="run-capsule__mark" aria-hidden="true">${renderRunFingerprintSvg(fingerprint)}</div>
      <div class="run-capsule__metrics">
        <span><small>距離</small><strong>${escapeHtml(Number(record.distanceKm || 0).toFixed(2))}<em>km</em></strong></span>
        <span><small>時間</small><strong>${escapeHtml(Number(record.durationMinutes || 0).toFixed(1))}<em>分</em></strong></span>
        <span><small>ペース</small><strong>${escapeHtml(paceLabel(pace))}<em>/km</em></strong></span>
      </div>
    </div>
    <footer><span><small>疲労感</small><strong>${escapeHtml(fatiguePair)}</strong></span>${Number.isFinite(energy) && energy >= 0 ? `<span><small>推定消費</small><strong>${escapeHtml(String(Math.round(energy)))} kcal</strong></span>` : ""}<span><small>実績</small><strong>${summary.unlockedCount} / ${summary.totalCount}</strong></span></footer>
  </section>`;
}

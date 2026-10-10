import { analyzeGpx, parseGpxText, GPX_MAX_TEXT_CHARS } from "../gpxLocalAnalysis.js";
import { saveGpxCandidate } from "../flowSessionState.js";
const GPX_MAX_BYTES = GPX_MAX_TEXT_CHARS;
function pct(v){return Number.isFinite(Number(v))?`${Number(v).toFixed(1).replace(/\.0$/,"")}%`:"—";}
function profileSvg(points = []) {
  const valid = points.filter((point) => point.ele != null && String(point.ele).trim() !== "" && Number.isFinite(Number(point.ele)));
  if (valid.length < 2) return '<text x="380" y="110" text-anchor="middle">標高データが不足しています</text>';
  const heights = valid.map((point) => Number(point.ele));
  const min = Math.min(...heights), max = Math.max(...heights), span = Math.max(1, max - min);
  const groups = [];
  let current = [];
  let previousSegment = null;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const validElevation = point.ele != null && String(point.ele).trim() !== "" && Number.isFinite(Number(point.ele));
    const segment = point.segmentIndex ?? 0;
    if (!validElevation || (current.length && segment !== previousSegment)) {
      if (current.length) groups.push(current);
      current = [];
    }
    if (validElevation) { current.push({ i, elevation: Number(point.ele) }); previousSegment = segment; }
  }
  if (current.length) groups.push(current);
  const paths = groups.filter((group) => group.length >= 2).map((group) => {
    const stride = Math.max(1, Math.floor(group.length / 120));
    const sample = group.filter((_, i) => i % stride === 0);
    if (sample.at(-1) !== group.at(-1)) sample.push(group.at(-1));
    const coordinates = sample.map(({ i, elevation }) =>
      `${20 + i * 720 / Math.max(1, points.length - 1)},${190 - (elevation - min) / span * 150}`
    ).join(" ");
    return `<polyline points="${coordinates}" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"></polyline>`;
  });
  if (!paths.length) return '<text x="380" y="110" text-anchor="middle">連続する標高データが不足しています</text>';
  return `<line x1="20" y1="190" x2="740" y2="190" class="grid"></line>${paths.join("")}<text x="20" y="25">${Math.round(max)} m</text><text x="20" y="207">${Math.round(min)} m</text>`;
}
// Never approve a course based on a previous file selection. Files can resolve
// out of order, and a reset/file change may happen while File.text() is pending.
export function bindGpxAnalysis() {
  const file = document.getElementById("gpx-file");
  const status = document.getElementById("gpx-status");
  const area = document.getElementById("gpx-result-area");
  const apply = document.getElementById("gpx-apply");
  const ret = document.getElementById("gpx-return-to");
  if (!file || !apply) return;

  let candidate = null;
  let approvedFile = null;
  let selectionRevision = 0;
  const set = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  const invalidate = () => {
    selectionRevision++;
    approvedFile = null;
    candidate = null;
    apply.disabled = true;
    if (area) area.hidden = true;
    return selectionRevision;
  };

  file.addEventListener("change", async () => {
    const revision = invalidate();
    const f = file.files?.[0];
    if (!f) {
      if (status) status.textContent = "ファイルを選択してください。";
      return;
    }
    if (Number.isFinite(f.size) && f.size > GPX_MAX_BYTES) {
      if (status) status.textContent = "GPXファイルが大きすぎます。10MB以下のファイルを選んでください。";
      return;
    }
    try {
      const content = await f.text();
      if (revision !== selectionRevision || file.files?.[0] !== f) return;
      const parsed = parseGpxText(content);
      const next = analyzeGpx(parsed, { fallbackName: f.name.replace(/\.gpx$/i, "") || "GPXコース" });
      if (revision !== selectionRevision || file.files?.[0] !== f) return;
      candidate = next;
      approvedFile = f;
      if (status) status.textContent = "端末内の解析が完了しました。";
      if (area) area.hidden = false;
      set("gpx-source-name", next.name || "GPX解析結果");
      set("gpx-source-meta", `${next.rawPointCount}点を端末内で解析`);
      set("gpx-coverage-badge", `標高 ${Math.round(Number(next.elevationCoverage || 0) * 100)}%`);
      set("gpx-total-distance", `${next.distanceKm} km`);
      set("gpx-elevation-coverage", `${Math.round(Number(next.elevationCoverage || 0) * 100)}%`);
      set("gpx-gain-loss", next.elevationGainM == null || next.elevationLossM == null ? "—" : `${next.elevationGainM} / ${next.elevationLossM} m`);
      set("gpx-point-count", `${next.rawPointCount}点`);
      set("gpx-up-share", next.gradeKnowledge === "KNOWN_PROFILE" ? pct(next.upPercent) : "—");
      set("gpx-flat-share", next.gradeKnowledge === "KNOWN_PROFILE" ? pct(next.flatPercent) : "—");
      set("gpx-down-share", next.gradeKnowledge === "KNOWN_PROFILE" ? pct(next.downPercent) : "—");
      set("gpx-up-grade", next.gradeKnowledge === "KNOWN_PROFILE" ? pct(next.upGradePercent) : "—");
      set("gpx-down-grade", next.gradeKnowledge === "KNOWN_PROFILE" ? pct(next.downGradePercent) : "—");
      set("gpx-candidate-state", next.gradeKnowledge === "KNOWN_PROFILE" ? "候補" : "標高不足");
      set("gpx-candidate-note", next.gradeKnowledge === "KNOWN_PROFILE"
        ? "上り・平坦・下りの候補です。Course Settingsで確認して保存します。"
        : "標高カバーが不足しているため、坂道は不明のままCourse Settingsへ戻します。");
      const svg = document.getElementById("gpx-profile-svg");
      if (svg) svg.innerHTML = profileSvg(parsed.points);
      apply.disabled = false;
    } catch (error) {
      if (revision !== selectionRevision || file.files?.[0] !== f) return;
      candidate = null;
      approvedFile = null;
      if (status) status.textContent = error?.message === "GPX_TOO_LARGE" || error?.message === "GPX_TOO_MANY_POINTS"
        ? "GPXファイルが大きすぎます。10MB以下のファイルを選んでください。"
        : "GPXを解析できませんでした。ファイル内容を確認してください。";
      if (area) area.hidden = true;
      apply.disabled = true;
    }
  });
  document.getElementById("gpx-reset")?.addEventListener("click", () => {
    invalidate();
    file.value = "";
    if (status) status.textContent = "ファイルを選択してください。";
  });
  apply.addEventListener("click", () => {
    // A native file input may change independently of the scheduled change
    // handler. The object identity must be the one we actually inspected.
    if (!candidate || !approvedFile || file.files?.[0] !== approvedFile || apply.disabled) return;
    saveGpxCandidate(candidate);
    const returnTo = ret?.value || "#/record-input";
    window.location.hash = `#/course-editor?gpx=1&returnTo=${encodeURIComponent(returnTo)}`;
  });
}

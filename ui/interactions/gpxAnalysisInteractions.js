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
export function bindGpxAnalysis(){
  const file=document.getElementById("gpx-file"),status=document.getElementById("gpx-status"),area=document.getElementById("gpx-result-area"),apply=document.getElementById("gpx-apply"),ret=document.getElementById("gpx-return-to");if(!file||!apply)return;let candidate=null;
  const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
  file.addEventListener("change",async()=>{candidate=null;apply.disabled=true;area.hidden=true;const f=file.files?.[0];if(!f){status.textContent="ファイルを選択してください。";return;}if(Number.isFinite(f.size)&&f.size>GPX_MAX_BYTES){status.textContent="GPXファイルが大きすぎます。10MB以下のファイルを選んでください。";return;}try{const parsed=parseGpxText(await f.text());candidate=analyzeGpx(parsed,{fallbackName:f.name.replace(/\.gpx$/i,"")||"GPXコース"});status.textContent="端末内の解析が完了しました。";area.hidden=false;set("gpx-source-name",candidate.name||"GPX解析結果");set("gpx-source-meta",`${candidate.rawPointCount}点を端末内で解析`);set("gpx-coverage-badge",`標高 ${Math.round(Number(candidate.elevationCoverage||0)*100)}%`);set("gpx-total-distance",`${candidate.distanceKm} km`);set("gpx-elevation-coverage",`${Math.round(Number(candidate.elevationCoverage||0)*100)}%`);set("gpx-gain-loss",candidate.elevationGainM==null||candidate.elevationLossM==null?"—":`${candidate.elevationGainM} / ${candidate.elevationLossM} m`);set("gpx-point-count",`${candidate.rawPointCount}点`);set("gpx-up-share",candidate.gradeKnowledge==="KNOWN_PROFILE"?pct(candidate.upPercent):"—");set("gpx-flat-share",candidate.gradeKnowledge==="KNOWN_PROFILE"?pct(candidate.flatPercent):"—");set("gpx-down-share",candidate.gradeKnowledge==="KNOWN_PROFILE"?pct(candidate.downPercent):"—");set("gpx-up-grade",candidate.gradeKnowledge==="KNOWN_PROFILE"?pct(candidate.upGradePercent):"—");set("gpx-down-grade",candidate.gradeKnowledge==="KNOWN_PROFILE"?pct(candidate.downGradePercent):"—");set("gpx-candidate-state",candidate.gradeKnowledge==="KNOWN_PROFILE"?"候補":"標高不足");set("gpx-candidate-note",candidate.gradeKnowledge==="KNOWN_PROFILE"?"上り・平坦・下りの候補です。Course Settingsで確認して保存します。":"標高カバーが不足しているため、坂道は不明のままCourse Settingsへ戻します。");const svg=document.getElementById("gpx-profile-svg");if(svg)svg.innerHTML=profileSvg(parsed.points);apply.disabled=false;}catch(error){status.textContent=error?.message==="GPX_TOO_LARGE"||error?.message==="GPX_TOO_MANY_POINTS"?"GPXファイルが大きすぎます。10MB以下のファイルを選んでください。":"GPXを解析できませんでした。ファイル内容を確認してください。";area.hidden=true;}});
  document.getElementById("gpx-reset")?.addEventListener("click",()=>{file.value="";candidate=null;apply.disabled=true;area.hidden=true;status.textContent="ファイルを選択してください。";});
  apply.addEventListener("click",()=>{if(!candidate)return;saveGpxCandidate(candidate);const returnTo=ret?.value||"#/record-input";window.location.hash=`#/course-editor?gpx=1&returnTo=${encodeURIComponent(returnTo)}`;});
}

function finite(value) { return Number.isFinite(Number(value)); }
function toNumber(value) { return finite(value) ? Number(value) : null; }
function haversine(a, b) {
  const R = 6371000;
  const p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
  const dp = (b.lat - a.lat) * Math.PI / 180, dl = (b.lon - a.lon) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function text(node, selector) { return node.querySelector(selector)?.textContent?.trim() || ""; }
function parsePoint(node) {
  const lat = toNumber(node.getAttribute("lat"));
  const lon = toNumber(node.getAttribute("lon"));
  if (lat == null || lon == null) return null;
  return { lat, lon, ele: toNumber(text(node, "ele")) };
}
export function parseGpxText(xmlText = "") {
  if (typeof DOMParser === "undefined") throw new Error("DOMParser is unavailable");
  const doc = new DOMParser().parseFromString(String(xmlText || ""), "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("GPX_XML_PARSE_ERROR");
  const nodes = [...doc.querySelectorAll("trkpt, rtept")];
  const points = nodes.map(parsePoint).filter(Boolean);
  if (points.length < 2) throw new Error("GPX_POINTS_REQUIRED");
  return { name: text(doc, "trk > name") || text(doc, "rte > name") || "", points };
}
function weightedMedian(values = []) {
  const rows = values.filter((x) => finite(x.value) && finite(x.weight) && x.weight > 0).sort((a,b)=>a.value-b.value);
  const total = rows.reduce((s,x)=>s+x.weight,0); let acc = 0;
  for (const row of rows) { acc += row.weight; if (acc >= total / 2) return row.value; }
  return rows.at(-1)?.value ?? null;
}
export function analyzeGpx(parsed = {}, { fallbackName = "GPXコース" } = {}) {
  const points = Array.isArray(parsed.points) ? parsed.points : [];
  if (points.length < 2) throw new Error("GPX_POINTS_REQUIRED");
  let totalM = 0, upM = 0, downM = 0, flatM = 0, gainM = 0, lossM = 0;
  const uphillGrades = [], downhillGrades = [];
  let elevationCoverageM = 0;
  for (let i=1;i<points.length;i++) {
    const a=points[i-1], b=points[i]; const d=haversine(a,b); if (!(d>0)) continue; totalM += d;
    if (a.ele == null || b.ele == null) continue;
    elevationCoverageM += d;
    const rise = b.ele - a.ele; const grade = rise / d * 100;
    if (rise > 0) gainM += rise; else lossM += Math.abs(rise);
    if (grade > 1) { upM += d; uphillGrades.push({value: Math.abs(grade), weight:d}); }
    else if (grade < -1) { downM += d; downhillGrades.push({value: Math.abs(grade), weight:d}); }
    else flatM += d;
  }
  if (!(totalM>0)) throw new Error("GPX_DISTANCE_REQUIRED");
  const elevationCoverage = elevationCoverageM / totalM;
  const gradeKnown = elevationCoverage >= 0.8;
  const round = (v,d=1) => Number(Number(v).toFixed(d));
  return Object.freeze({
    name: String(parsed.name || fallbackName || "GPXコース").slice(0,80),
    distanceKm: round(totalM/1000,2),
    elevationGainM: round(gainM,0), elevationLossM: round(lossM,0), elevationCoverage: round(elevationCoverage,3),
    gradeKnowledge: gradeKnown ? "KNOWN_PROFILE" : "UNKNOWN",
    gradeInputMode: gradeKnown ? "SUMMARY" : "UNKNOWN",
    upPercent: gradeKnown ? round(upM/totalM*100,1) : 0,
    downPercent: gradeKnown ? round(downM/totalM*100,1) : 0,
    flatPercent: gradeKnown ? round(Math.max(0,100-(upM+downM)/totalM*100),1) : null,
    upGradePercent: gradeKnown ? round(weightedMedian(uphillGrades) || 0,1) : 0,
    downGradePercent: gradeKnown ? round(weightedMedian(downhillGrades) || 0,1) : 0,
    surfaceInputMode: "UNKNOWN", modelSurfaceClass: "UNKNOWN", modelSurfaceProfile: [],
    pavedPercent:0, trackPercent:0, treadmillPercent:0, soilPercent:0, trailPercent:0, naturalGrassPercent:0, artificialTurfPercent:0, sandPercent:0,
    source: "LOCAL_GPX_ANALYSIS", rawPointCount: points.length,
  });
}

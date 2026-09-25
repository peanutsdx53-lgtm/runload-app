import "./consultationReport.js";
import { internalModules } from "./modules.js";

// ===== ui/bodyRegionTerminology.js =====
{
const moduleExports = Object.create(null);
const BODY_REGION_TERMINOLOGY_VERSION = "body-region-terminology-v1";

const ENTRIES = Object.freeze([
  Object.freeze({ id: "BA-DISP-014", formalJa: "股関節部", familiarJa: "股関節まわり", plainMeaningJa: "股関節部の動きに関する目安", english: "Hip joint region" }),
  Object.freeze({ id: "BA-DISP-015", formalJa: "殿部", familiarJa: "お尻", plainMeaningJa: "殿部の筋肉の使われ方に関する目安", english: "Gluteal region" }),
  Object.freeze({ id: "BA-DISP-016", formalJa: "大腿前面", familiarJa: "太ももの前", plainMeaningJa: "大腿前面の筋肉の使われ方に関する目安", english: "Anterior thigh region" }),
  Object.freeze({ id: "BA-DISP-018", formalJa: "大腿後面", familiarJa: "太ももの後ろ", plainMeaningJa: "大腿後面の筋肉の使われ方に関する目安", english: "Posterior thigh region" }),
  Object.freeze({ id: "BA-DISP-019", formalJa: "膝蓋大腿関節部", familiarJa: "膝の前", plainMeaningJa: "膝蓋大腿関節部の走行条件による変化の目安", english: "Patellofemoral region" }),
  Object.freeze({ id: "BA-DISP-021", formalJa: "脛骨部", familiarJa: "すね", plainMeaningJa: "脛骨部の走行条件による変化の目安", english: "Tibial region" }),
  Object.freeze({ id: "BA-DISP-023", formalJa: "下腿後面", familiarJa: "ふくらはぎ", plainMeaningJa: "下腿後面の筋肉の使われ方に関する目安", english: "Posterior lower-leg region" }),
  Object.freeze({ id: "BA-DISP-024", formalJa: "足関節部", familiarJa: "足首まわり", plainMeaningJa: "足関節部の動きに関する目安", english: "Ankle joint region" }),
  Object.freeze({ id: "BA-DISP-025", formalJa: "アキレス腱部", familiarJa: "足首の後ろ・アキレス腱周辺", plainMeaningJa: "アキレス腱部の走行条件による変化の目安", english: "Achilles tendon region" }),
  Object.freeze({ id: "BA-DISP-027", formalJa: "後足部", familiarJa: "かかと・足裏の後ろ", plainMeaningJa: "後足部の足底圧に関する目安", english: "Rearfoot region" }),
  Object.freeze({ id: "BA-DISP-028", formalJa: "足底中部・内側縦足弓", familiarJa: "土踏まず・足裏の中央", plainMeaningJa: "足底中部・内側縦足弓の足底圧に関する目安", english: "Mid-plantar and medial longitudinal arch region" }),
  Object.freeze({ id: "BA-DISP-029", formalJa: "前足部", familiarJa: "足裏の前・母趾球周辺", plainMeaningJa: "前足部の足底圧に関する目安", english: "Forefoot region" }),
]);

const BODY_REGION_TERMINOLOGY = ENTRIES;
const BY_ID = new Map(ENTRIES.map((item) => [item.id, item]));

function bodyRegionTerminology(regionId) {
  return BY_ID.get(String(regionId || "")) || null;
}

function bodyRegionFormalName(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.formalJa || String(fallback || regionId || "");
}

function bodyRegionFamiliarName(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.familiarJa || String(fallback || "");
}

function bodyRegionPlainMeaning(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.plainMeaningJa || String(fallback || "この部位に関する目安");
}

function bodyRegionDisplayName(regionId, fallback = "", { includeFamiliar = false } = {}) {
  const item = bodyRegionTerminology(regionId);
  if (!item) return String(fallback || regionId || "");
  return includeFamiliar && item.familiarJa && item.familiarJa !== item.formalJa
    ? `${item.formalJa}（${item.familiarJa}）`
    : item.formalJa;
}
moduleExports["BODY_REGION_TERMINOLOGY_VERSION"] = BODY_REGION_TERMINOLOGY_VERSION;
moduleExports["BODY_REGION_TERMINOLOGY"] = BODY_REGION_TERMINOLOGY;
moduleExports["bodyRegionTerminology"] = bodyRegionTerminology;
moduleExports["bodyRegionFormalName"] = bodyRegionFormalName;
moduleExports["bodyRegionFamiliarName"] = bodyRegionFamiliarName;
moduleExports["bodyRegionPlainMeaning"] = bodyRegionPlainMeaning;
moduleExports["bodyRegionDisplayName"] = bodyRegionDisplayName;
internalModules.bodyRegionTerminology = moduleExports;
}

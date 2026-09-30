import { matchesMobileLayout } from "./deviceLayout.js";
import { findMobileExtensionRecord, listMobileExtensionRecords } from "./mobileWalkJogRecordStore.js";

let queued = false;

function routeRecordId() {
  const hash = String(globalThis.location?.hash || "");
  const [path, query = ""] = hash.split("?");
  if (path !== "#/history") return "";
  return String(new URLSearchParams(query).get("mobileActivityRecordId") || "");
}

function suppressed(record) {
  return record?.analysis?.qualityGate?.regionalAnalysisAllowed === false;
}

function reasonText(record) {
  const reason = record?.analysis?.qualityGate?.reason;
  if (reason === "NO_USABLE_GPS_FIX") return "安定したGPS測位を確認できなかったため、12部位計算は表示していません。";
  return "GPSが安定して利用できない状態が30秒を超えたため、12部位計算は表示していません。";
}

function guardCards(records) {
  document.querySelectorAll(".mobile-activity-record-card").forEach((card) => {
    const href = card.querySelector('a[href*="mobileActivityRecordId="]')?.getAttribute("href") || "";
    const match = href.match(/mobileActivityRecordId=([^&]+)/);
    if (!match) return;
    const id = decodeURIComponent(match[1]);
    const record = records.find((item) => item.id === id);
    if (!suppressed(record)) return;
    const note = card.querySelector("p");
    if (note) note.textContent = "GPS品質不足のため12部位表示なし";
  });
}

function guardDetail(record) {
  if (!suppressed(record)) return;
  const detail = document.querySelector(".mobile-activity-history-detail");
  if (!detail) return;
  let note = detail.querySelector("[data-mobile-gps-quality-history-note]");
  if (!note) {
    note = document.createElement("p");
    note.dataset.mobileGpsQualityHistoryNote = "";
    note.className = "mobile-activity-boundary-note";
    detail.querySelector(".mobile-activity-boundary-note")?.insertAdjacentElement("afterend", note);
  }
  note.textContent = `${reasonText(record)} 距離・時間・区間情報のみ保持しています。`;

  const segments = Array.isArray(record?.analysis?.segments) ? record.analysis.segments : [];
  detail.querySelectorAll(".mobile-activity-segment").forEach((section, index) => {
    const segment = segments[index];
    if (!segment || segment.gaitId === "RUNNING_CURRENT") return;
    section.querySelector(".mobile-activity-region-details")?.remove();
    const status = section.querySelector("header em");
    if (status) status.textContent = "GPS品質不足のため12部位表示なし";
    let segmentNote = section.querySelector("[data-mobile-gps-segment-note]");
    if (!segmentNote) {
      segmentNote = document.createElement("p");
      segmentNote.dataset.mobileGpsSegmentNote = "";
      segmentNote.className = "mobile-activity-pointer-note";
      section.append(segmentNote);
    }
    segmentNote.textContent = "この区間の部位指標は測定品質ゲートにより表示していません。";
  });
}

function scan() {
  queued = false;
  if (!matchesMobileLayout() || !String(globalThis.location?.hash || "").startsWith("#/history")) return;
  const records = listMobileExtensionRecords();
  guardCards(records);
  const id = routeRecordId();
  if (id) guardDetail(findMobileExtensionRecord(id));
}

function queueScan() {
  if (queued) return;
  queued = true;
  queueMicrotask(scan);
}

export function installMobileWalkJogGpsQualityHistoryGuard() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
  const observer = new MutationObserver(queueScan);
  observer.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener?.("hashchange", queueScan);
  queueScan();
  return () => {
    observer.disconnect();
    globalThis.removeEventListener?.("hashchange", queueScan);
  };
}

if (typeof document !== "undefined") installMobileWalkJogGpsQualityHistoryGuard();

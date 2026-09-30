import { escapeHtml } from "./commonComponents.js";
import { matchesMobileLayout } from "./deviceLayout.js";
import {
  findMobileExtensionRecord,
  listMobileExtensionRecords,
} from "./mobileWalkJogRecordStore.js";

const REGION_LABELS = Object.freeze({
  R01: "股関節",
  R02: "殿部",
  R03: "大腿前面",
  R04: "大腿後面",
  R05: "膝前面",
  R06: "下腿前面",
  R07: "下腿後面",
  R08: "足関節",
  R09: "アキレス腱",
  R10: "後足部",
  R11: "中足部",
  R12: "前足部",
});

const ACTIVITY_LABELS = Object.freeze({
  WALK: "ウォーキング",
  JOGGING: "ジョギング",
  MIXED: "歩き＋走り",
  RUNNING_CURRENT: "ランニング",
});

let scanQueued = false;

function routeState() {
  const hash = String(globalThis.location?.hash || "");
  const [path, query = ""] = hash.split("?");
  if (path !== "#/history") return null;
  const parameters = new URLSearchParams(query);
  const recordId = String(parameters.get("mobileActivityRecordId") || "");
  return Object.freeze({
    full: parameters.get("mobileActivity") === "1" || Boolean(recordId),
    recordId,
  });
}

function activityLabel(activityId) {
  return ACTIVITY_LABELS[String(activityId || "")] || String(activityId || "活動");
}

function formatNumber(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function formatDurationMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 0) return "—";
  if (minutes < 60) return `${Math.round(minutes)}分`;
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes - hours * 60);
  return remainder ? `${hours}時間${remainder}分` : `${hours}時間`;
}

function formatSegmentDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return "—";
  const total = Math.round(value);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatDateTime(value) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "日時不明";
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function evidenceLabel(region) {
  if (region?.outputStatus === "NO_OUTPUT") return "根拠範囲外";
  if (region?.evidenceTier === "SOURCE_AUTHORED_MODEL") return "原典モデル";
  if (region?.evidenceTier === "DIGITIZED_ORIGINAL_FIGURE") return "原典図の読取値";
  if (region?.evidenceTier === "WITHIN_SOURCE_INTERPOLATION") return "原典範囲内の補間";
  return region?.evidenceTier || "根拠範囲内";
}

function regionRows(coverage) {
  if (!Array.isArray(coverage?.regions)) return "";
  return coverage.regions.map((region) => {
    const value = Number.isFinite(Number(region?.index)) ? Number(region.index).toFixed(1) : "—";
    const label = REGION_LABELS[region?.regionId] || region?.regionId || "部位";
    return `<div class="mobile-activity-region-row">
      <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(region?.regionId || "")}</small></span>
      <b>${escapeHtml(value)}</b>
      <em>${escapeHtml(evidenceLabel(region))}</em>
    </div>`;
  }).join("");
}

function segmentStatus(segment) {
  if (segment?.gaitId === "RUNNING_CURRENT") return "既存ランニング計算への参照区間";
  const coverage = segment?.coverage;
  if (!coverage) return "距離・時間不足";
  if (coverage.strictAll12) return "12部位すべて根拠範囲内";
  return `${Number(coverage.availableRegionCount || 0)}/12部位が根拠範囲内`;
}

function segmentMarkup(segment, index) {
  const runningPointer = segment?.gaitId === "RUNNING_CURRENT";
  const regions = runningPointer ? "" : regionRows(segment?.coverage);
  return `<article class="mobile-activity-segment">
    <header><span><small>区間 ${index + 1}</small><strong>${escapeHtml(activityLabel(segment?.gaitId))}</strong></span><em>${escapeHtml(segmentStatus(segment))}</em></header>
    <dl>
      <div><dt>距離</dt><dd>${escapeHtml(formatNumber(segment?.distanceKm, 2))} km</dd></div>
      <div><dt>時間</dt><dd>${escapeHtml(formatSegmentDuration(segment?.durationSeconds))}</dd></div>
      <div><dt>平均速度</dt><dd>${escapeHtml(formatNumber(segment?.speedKmh, 2))} km/h</dd></div>
    </dl>
    ${runningPointer
      ? '<p class="mobile-activity-pointer-note">この区間は既存ランニングエンジンを再計算せず、区間情報だけを保持しています。</p>'
      : regions
        ? `<details class="mobile-activity-region-details"><summary>12部位の独立指標を確認</summary><div>${regions}</div></details>`
        : '<p class="mobile-activity-pointer-note">この速度では表示できる部位指標がありません。</p>'}
  </article>`;
}

function recordDetail(record) {
  const segments = Array.isArray(record?.analysis?.segments) ? record.analysis.segments : [];
  return `<section class="mobile-activity-history-full mobile-activity-history-detail">
    <header class="mobile-activity-history-head">
      <a href="#/history?mobileActivity=1">‹ 活動別履歴へ</a>
      <div><small>SMARTPHONE ACTIVITY</small><h2>${escapeHtml(activityLabel(record.activityId))}</h2></div>
    </header>
    <section class="mobile-activity-detail-summary">
      <time>${escapeHtml(formatDateTime(record.createdAt))}</time>
      <dl>
        <div><dt>距離</dt><dd>${escapeHtml(formatNumber(record.distanceKm, 2))} km</dd></div>
        <div><dt>時間</dt><dd>${escapeHtml(formatDurationMinutes(record.durationMinutes))}</dd></div>
        <div><dt>区間</dt><dd>${segments.length}件</dd></div>
      </dl>
    </section>
    <p class="mobile-activity-boundary-note">異なる運動様式・異なる構成概念の12部位値は、合算・平均しません。数値は部位ごとの独立指標です。</p>
    <div class="mobile-activity-segments">${segments.map(segmentMarkup).join("") || '<p>区間データはありません。</p>'}</div>
    <footer class="mobile-activity-history-footer"><small>スマホ拡張専用記録</small><span>既存ランニングCurrentとは分離して保存されています。</span></footer>
  </section>`;
}

function recordCard(record) {
  const segments = Array.isArray(record?.analysis?.segments) ? record.analysis.segments : [];
  const all12Count = segments.filter((segment) => segment?.coverage?.strictAll12).length;
  return `<article class="mobile-activity-record-card">
    <div class="mobile-activity-record-card__head"><span><small>${escapeHtml(formatDateTime(record.createdAt))}</small><strong>${escapeHtml(activityLabel(record.activityId))}</strong></span><em>${segments.length}区間</em></div>
    <dl><div><dt>距離</dt><dd>${escapeHtml(formatNumber(record.distanceKm, 2))} km</dd></div><div><dt>時間</dt><dd>${escapeHtml(formatDurationMinutes(record.durationMinutes))}</dd></div></dl>
    <p>${record.activityId === "MIXED" ? "区間ごとに運動様式を保持" : `12部位すべて根拠範囲内の区間 ${all12Count}/${segments.length}`}</p>
    <a href="#/history?mobileActivity=1&mobileActivityRecordId=${encodeURIComponent(record.id)}">詳細を見る</a>
  </article>`;
}

function fullList(records) {
  return `<section class="mobile-activity-history-full">
    <header class="mobile-activity-history-head">
      <a href="#/history">‹ 通常の履歴へ</a>
      <div><small>SMARTPHONE ACTIVITY</small><h2>活動別履歴</h2><p>ウォーキング・ジョギング・歩き＋走りを、ランニング記録とは分けて確認します。</p></div>
    </header>
    <p class="mobile-activity-boundary-note">異なる運動様式・異なる構成概念の12部位値は、合算・平均しません。</p>
    <div class="mobile-activity-record-list">${records.length
      ? records.map(recordCard).join("")
      : '<div class="mobile-activity-history-empty"><strong>活動別記録はまだありません</strong><p>測定後に「活動別記録を端末に保存」を選ぶと、ここへ保存されます。</p><a href="#/run-measurement">測定を開く</a></div>'}</div>
  </section>`;
}

function compactEntry(records) {
  const latest = records[0] || null;
  return `<section class="mobile-activity-history-entry">
    <div><small>SMARTPHONE ACTIVITY</small><strong>活動別記録</strong><p>ウォーキング・ジョギング・歩き＋走りは、既存ランニング履歴と分けて保存しています。</p></div>
    <span class="mobile-activity-history-count">${records.length}件</span>
    ${latest ? `<small>最新：${escapeHtml(activityLabel(latest.activityId))}・${escapeHtml(formatDateTime(latest.createdAt))}</small>` : ""}
    <a href="#/history?mobileActivity=1">活動別履歴を開く</a>
  </section>`;
}

function restoreCanonicalChildren(screen, panel) {
  [...screen.children].forEach((child) => {
    if (child === panel) return;
    if (child.dataset?.mobileActivityHistoryHidden === "true") {
      child.hidden = false;
      delete child.dataset.mobileActivityHistoryHidden;
    }
  });
}

function hideCanonicalChildren(screen, panel) {
  [...screen.children].forEach((child) => {
    if (child === panel || child.classList.contains("page-head")) return;
    if (!child.hidden) {
      child.hidden = true;
      child.dataset.mobileActivityHistoryHidden = "true";
    }
  });
}

function renderIntoHistory() {
  scanQueued = false;
  const state = routeState();
  if (!state || !matchesMobileLayout()) return;
  const screen = document.querySelector(".screen-layout--history");
  if (!screen) return;

  const records = listMobileExtensionRecords();
  let panel = screen.querySelector(":scope > [data-mobile-activity-history]");
  if (!panel) {
    panel = document.createElement("section");
    panel.dataset.mobileActivityHistory = "";
    panel.className = "mobile-activity-history-shell";
    const head = screen.querySelector(":scope > .page-head");
    head?.insertAdjacentElement("afterend", panel);
    if (!panel.parentElement) screen.prepend(panel);
  }

  const selected = state.recordId ? findMobileExtensionRecord(state.recordId) : null;
  const renderKey = JSON.stringify([
    state.full,
    state.recordId,
    records.length,
    records[0]?.id || "",
    records[0]?.createdAt || "",
  ]);
  if (panel.dataset.renderKey !== renderKey) {
    panel.dataset.renderKey = renderKey;
    panel.innerHTML = state.full
      ? selected
        ? recordDetail(selected)
        : fullList(records)
      : compactEntry(records);
  }

  if (state.full) hideCanonicalChildren(screen, panel);
  else restoreCanonicalChildren(screen, panel);
}

function queueScan() {
  if (scanQueued) return;
  scanQueued = true;
  queueMicrotask(renderIntoHistory);
}

export function installMobileWalkJogHistoryUi() {
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

if (typeof document !== "undefined") installMobileWalkJogHistoryUi();

import { escapeHtml } from "./commonComponents.js";
import { formatLocalDate } from "./recordPresentation.js";

function finite(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function number(value, digits = 1) {
  if (!finite(value)) return "—";
  const fixed = Number(value).toFixed(digits);
  return fixed.includes(".") ? fixed.replace(/0+$/, "").replace(/\.$/, "") : fixed;
}

function signed(value, digits = 1) {
  if (!finite(value)) return "—";
  const n = Number(value);
  return `${n > 0 ? "+" : ""}${number(n, digits)}`;
}

function paceFromSeconds(value) {
  if (!finite(value) || Number(value) <= 0) return "—";
  const seconds = Math.round(Number(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} /km`;
}

function paceFromSpeed(speedMps) {
  const speed = Number(speedMps);
  if (!(speed > 0)) return "";
  return paceFromSeconds(1000 / speed);
}


const INTERPRETATION_ICONS = Object.freeze({
  interpretation: '<path d="M5 7.5h8.5a3.5 3.5 0 0 1 0 7H10"/><path d="M8 4.5 4 8l4 3.5"/><path d="M16 12.5 20 16l-4 3.5"/>',
  trend: '<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>',
  repeat: '<path d="M7 7h9a4 4 0 0 1 4 4"/><path d="m7 3-4 4 4 4"/><path d="M17 17H8a4 4 0 0 1-4-4"/><path d="m17 21 4-4-4-4"/>',
  conditions: '<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h2"/><path d="M10 17h10"/><circle cx="8" cy="17" r="2"/>',
  person: '<circle cx="12" cy="7" r="3"/><path d="M6.5 20c.7-4 2.7-6 5.5-6s4.8 2 5.5 6"/>',
  flag: '<path d="M5 21V4"/><path d="M5 5h11l-2 4 2 4H5"/>',
  compare: '<path d="M7 7h11"/><path d="m15 4 3 3-3 3"/><path d="M17 17H6"/><path d="m9 14-3 3 3 3"/>',
  reference: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>',
  history: '<path d="M4 5v6h6"/><path d="M5.5 16a8 8 0 1 0 .2-8"/><path d="M12 8v5l3 2"/>',
  share: '<circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="m8 11 8-4M8 13l8 4"/>',
  book: '<path d="M4 5.5A3.5 3.5 0 0 1 7.5 4H11v15H7.5A3.5 3.5 0 0 0 4 20.5z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 4H13v15h3.5a3.5 3.5 0 0 1 3.5 1.5z"/>',
  plan: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  record: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  support: '<path d="M4 12a8 8 0 1 1 16 0v4a2 2 0 0 1-2 2h-3"/><path d="M4 12v3h3v-6H4zM20 12v3h-3v-6h3z"/>',
});
function interpretationIcon(name, className = "") {
  const paths = INTERPRETATION_ICONS[name] || INTERPRETATION_ICONS.interpretation;
  return `<svg class="interpretation-room-icon${className ? ` ${escapeHtml(className)}` : ""}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
function meaningLabel(output) {
  const code = String(output?.understanding?.meaningCode || "");
  if (code === "REPEATED_OBSERVATION") return Object.freeze({ label: "継続して確認できる変化", tone: "repeat" });
  if (code === "CONDITION_AND_RESULT_CHANGED") return Object.freeze({ label: "条件差と結果変化を分けて確認", tone: "conditions" });
  if (code === "MULTI_LAYER_CHANGE") return Object.freeze({ label: "数値と本人記録の両方に変化", tone: "person" });
  if (code === "CURRENT_SHIFT_WITH_HISTORY") return Object.freeze({ label: "前回から変化を確認", tone: "trend" });
  if (code === "CURRENT_REFERENCE_PATTERN") return Object.freeze({ label: "今回の基準位置を確認", tone: "reference" });
  return Object.freeze({ label: "今回の特徴を整理", tone: "interpretation" });
}
function reasonMetric(region = {}) {
  if (region.reasonCode === "REPEATED_DIRECTION") return `今回 ${number(region.value)}`;
  if (region.reasonCode === "PREVIOUS_CHANGE" && finite(region.previousDifference)) return `前回差 ${signed(region.previousDifference)}`;
  if (finite(region.value)) return `基準差 ${signed(Number(region.value) - 100)}`;
  return "確認";
}

function referenceText(direction = "") {
  if (direction === "ABOVE_REFERENCE") return "基準100より上側";
  if (direction === "BELOW_REFERENCE") return "基準100より下側";
  if (direction === "REFERENCE_VICINITY") return "基準100付近";
  return "今回は表示できません";
}

function directionKey(direction = "") {
  if (direction === "ABOVE_REFERENCE") return "above";
  if (direction === "BELOW_REFERENCE") return "below";
  if (direction === "REFERENCE_VICINITY") return "near";
  return "unavailable";
}

function regionHref(output, regionId = "") {
  const query = new URLSearchParams();
  if (output?.target?.recordId) query.set("recordId", output.target.recordId);
  if (output?.target?.origin) query.set("origin", output.target.origin);
  if (regionId) query.set("regionId", regionId);
  return `#/interpretation-room?${query.toString()}`;
}

function actionHref(action, output) {
  if (!action?.destination) return "#";
  const query = new URLSearchParams();
  Object.entries(action.parameters || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value) !== "") query.set(key, String(value));
  });
  if (output?.target?.recordId && !query.has("recordId") && action.destination !== "record-input") {
    query.set("recordId", output.target.recordId);
  }
  if (output?.target?.selectedRegionId && !query.has("regionId")) query.set("regionId", output.target.selectedRegionId);
  if (["simulation", "plan", "consultation", "reading"].includes(action.destination)) {
    query.set("from", "interpretation-room");
    query.set("roomOrigin", output?.target?.origin || "result");
  }
  return `#/${encodeURIComponent(action.destination)}${query.size ? `?${query.toString()}` : ""}`;
}

const ACTION_COPY = Object.freeze({
  simulation: Object.freeze({ title: "条件を変えて比較する", note: "今回の記録を基準に、変更した条件だけで12部位の表示を再計算します。", icon: "conditions" }),
  plan: Object.freeze({ title: "次の記録条件を整理する", note: "今回確認した内容を見ながら、次の走行や休養の条件を整理します。", icon: "plan" }),
  share: Object.freeze({ title: "共有用に整理する", note: "今回確認できた事実と本人の記録を、共有しやすい形にまとめます。", icon: "share" }),
  reading: Object.freeze({ title: "関連する読みものを確認する", note: "今回の結果に関連する読み方や背景を確認します。", icon: "book" }),
  "official-help": Object.freeze({ title: "公的な案内を確認する", note: "入力内容に応じた相談先や公的な案内を確認します。", icon: "support" }),
  "review-input": Object.freeze({ title: "入力内容を確認する", note: "今回記録した内容を確認します。", icon: "record" }),
  record: Object.freeze({ title: "新しい記録を始める", note: "新しい走行記録を入力します。", icon: "record" }),
});
function actionCopy(action) {
  return ACTION_COPY[action?.actionId] || Object.freeze({ title: "次の画面へ進む", note: "今回の内容を引き継いで確認します。", icon: "flag" });
}
function renderAction(action, output, { primary = false } = {}) {
  if (!action || action.enabled === false) return "";
  const copy = actionCopy(action);
  return `<a class="interpretation-room-action${primary ? " interpretation-room-action--primary" : ""}" href="${escapeHtml(actionHref(action, output))}">
    <span class="interpretation-room-action__icon">${interpretationIcon(copy.icon)}</span>
    <span class="interpretation-room-action__copy"><strong>${escapeHtml(copy.title)}</strong><small>${escapeHtml(copy.note)}</small></span>
    <i aria-hidden="true">›</i>
  </a>`;
}

function renderSupportPriority(output) {
  const primary = output?.next?.primaryAction || null;
  const others = output?.next?.otherActions || [];
  return `<div class="interpretation-room interpretation-room--support" data-interpretation-room-state="support">
    <header class="interpretation-room-hero">
      <p>今回の記録</p>
      <h1>先に確認することがあります</h1>
      <p>通常の結果整理より先に、入力内容に応じた案内を確認します。</p>
    </header>
    <section class="interpretation-room-support-panel" aria-label="先に確認する案内">
      ${renderAction(primary, output, { primary: true })}
      ${others.length ? `<details><summary>ほかにできること</summary><div class="interpretation-room-secondary-actions">${others.map((action) => renderAction(action, output)).join("")}</div></details>` : ""}
    </section>
  </div>`;
}

function renderRest(output) {
  return `<div class="interpretation-room interpretation-room--rest" data-interpretation-room-state="rest">
    <header class="interpretation-room-hero">
      <p>${escapeHtml(output?.target?.date ? formatLocalDate(output.target.date) : "今回の記録")}</p>
      <h1>今回は休養の記録です</h1>
      <p>休養記録には12部位の数値を作りません。数値なしを0として扱いません。</p>
    </header>
    <section class="interpretation-room-boundary"><strong>確認できること</strong><p>入力した記録内容は履歴や共有用の整理に使用できます。</p></section>
  </div>`;
}

function meaningLead(output) {
  const code = String(output?.understanding?.meaningCode || "");
  if (code === "REPEATED_OBSERVATION") return "過去にも同じ方向が複数回確認された部位があります。今回も同じ方法で記録できた事実として整理します。";
  if (code === "CONDITION_AND_RESULT_CHANGED") return "前回から走行条件と部位表示の両方に変化があります。まず条件差と部位差を分けて確認します。";
  if (code === "MULTI_LAYER_CHANGE") return "部位表示と本人が記録した疲労感の両方に変化があります。2つは別の情報として一緒に確認します。";
  if (code === "CURRENT_SHIFT_WITH_HISTORY") return "前回と比べられる部位に変化があります。部位ごとに前回との差を確認できます。";
  if (code === "CURRENT_REFERENCE_PATTERN") return "今回の12部位を、それぞれの部位自身の基準100との関係で確認できます。";
  return "今回の12部位・過去記録・本人の疲労感・走行条件を、混同しないよう分けて整理します。";
}

function renderSummary(output) {
  const counts = output?.overview?.attention?.counts || {};
  const subjective = output?.subjectiveContext || {};
  const conditionCount = Number(counts.conditionDifferences || 0);
  const previousComparable = Number(counts.previousComparable || 0);
  const previousChanged = Number(counts.previousChanged || 0);
  const repeated = Number(counts.repeated || 0);
  const fatigueValue = subjective?.difference?.eligible ? signed(subjective.difference.value, 0) : "—";
  const label = meaningLabel(output);
  const available = Number(counts.available || 0);
  return `<section class="interpretation-room-summary interpretation-room-summary--v3" aria-labelledby="interpretation-summary-title" data-tone="${escapeHtml(label.tone)}">
    <div class="interpretation-room-summary__top">
      <div class="interpretation-room-summary__heading"><span class="interpretation-room-summary__mark">${interpretationIcon("interpretation")}</span><div><div class="interpretation-room-kicker">RUNLOAD INTERPRETATION</div><h2 id="interpretation-summary-title">今回のRunLoad解釈</h2></div></div>
      <div class="interpretation-room-summary__label">${interpretationIcon(label.tone)}<span>${escapeHtml(label.label)}</span></div>
    </div>
    <p class="interpretation-room-summary__lead">${escapeHtml(meaningLead(output))}</p>
    <div class="interpretation-room-summary__metrics">
      <article><span class="metric-icon">${interpretationIcon("trend")}</span><div><small>前回から変化</small><strong>${escapeHtml(String(previousChanged))}<em>部位</em></strong><p>${previousComparable ? `比較できる${previousComparable}部位のうち、1ポイント以上の差を確認しました。` : "比較できる前回記録はまだありません。"}</p></div></article>
      <article><span class="metric-icon">${interpretationIcon("repeat")}</span><div><small>同じ方向の継続</small><strong>${escapeHtml(String(repeated))}<em>部位</em></strong><p>${repeated ? "過去の比較可能な記録でも、今回と同じ基準側が複数回確認されています。" : "同じ方向が複数回続く部位は、今回はありません。"}</p></div></article>
      <article><span class="metric-icon">${interpretationIcon("conditions")}</span><div><small>前回からの条件差</small><strong>${escapeHtml(String(conditionCount))}<em>項目</em></strong><p>${conditionCount ? "変わった走行条件を、部位の変化とは分けて並べて確認します。" : "比較できる走行条件に変更項目はありません。"}</p></div></article>
      <article><span class="metric-icon">${interpretationIcon(subjective?.difference?.eligible ? "person" : "reference")}</span><div><small>${subjective?.difference?.eligible ? "本人記録の前後差" : "今回の部位数値"}</small><strong>${escapeHtml(subjective?.difference?.eligible ? fatigueValue : String(available))}<em>${subjective?.difference?.eligible ? "" : "/ 12"}</em></strong><p>${subjective?.difference?.eligible ? "走る前後の疲労感を、部位数値とは別の情報として確認します。" : "表示できる部位を、それぞれの部位自身の基準100で確認します。"}</p></div></article>
    </div>
  </section>`;
}
function entryKnownText(output) {
  const counts = output?.overview?.attention?.counts || {};
  const changed = Number(counts.previousChanged || 0), repeated = Number(counts.repeated || 0);
  if (repeated) return `過去にも同じ方向が確認された部位が${repeated}部位あります。今回だけの変化と分けて確認できます。`;
  if (changed) return `前回と比べられる部位のうち、${changed}部位で変化を確認できます。`;
  return "今回の12部位を、それぞれの部位自身の基準100との関係で確認できます。";
}
function renderInterpretationEntry(output) {
  const groups = output?.overview?.attention?.groups || [];
  const hasSubjective = output?.subjectiveContext?.state && output.subjectiveContext.state !== "NONE";
  const conditionCount = Number(output?.overview?.attention?.counts?.conditionDifferences || 0);
  const resultTarget = groups.length ? "#interpretation-attention-title" : conditionCount ? "#interpretation-conditions-title" : hasSubjective ? "#interpretation-subjective-title" : "#interpretation-next-title";
  const relationTarget = hasSubjective ? "#interpretation-subjective-title" : conditionCount ? "#interpretation-conditions-title" : "#interpretation-next-title";
  return `<section class="interpretation-room-entry" aria-labelledby="interpretation-entry-title">
    <div class="interpretation-room-section-title interpretation-room-section-title--compact"><div><small>解釈の入口</small><h2 id="interpretation-entry-title">今回の結果を読む順序</h2></div><p>数値そのものより先に、何を確認する結果なのかを整理します。</p></div>
    <div class="interpretation-room-entry-grid">
      <a href="${resultTarget}"><span>${interpretationIcon("trend")}</span><div><strong>今回わかること</strong><p>${escapeHtml(entryKnownText(output))}</p></div><i aria-hidden="true">›</i></a>
      <a href="${resultTarget}"><span>${interpretationIcon(groups.length ? "interpretation" : "conditions")}</span><div><strong>${groups.length ? "注目する理由を確認" : conditionCount ? "条件差を確認" : "次の比較につなげる"}</strong><p>${groups.length ? `部位を数値順ではなく、${groups.length}種類の「確認する理由」で整理しています。` : conditionCount ? "部位表示と条件差を分けて確認します。" : "今回確認できる事実を整理して、次の比較につなげます。"}</p></div><i aria-hidden="true">›</i></a>
      <a href="${relationTarget}"><span>${interpretationIcon(hasSubjective ? "person" : "conditions")}</span><div><strong>${hasSubjective ? "本人の記録と分けて見る" : conditionCount ? "条件と結果を分けて見る" : "次に確かめる"}</strong><p>${hasSubjective ? "本人が記録した疲労感は、12部位の数値とは別の情報として並べて確認します。" : conditionCount ? "前回から変わった条件を、数値変化の原因と決めずに並べて確認します。" : "今回を比較点として、次の記録で確かめる内容を確認します。"}</p></div><i aria-hidden="true">›</i></a>
    </div>
  </section>`;
}

const REASON_COPY = Object.freeze({
  REPEATED_DIRECTION: Object.freeze({ title: "同じ方向が続いている", note: "過去の比較可能な記録でも、今回と同じ基準側が複数回確認されています。", icon: "repeat", tone: "repeat" }),
  PREVIOUS_CHANGE: Object.freeze({ title: "前回から変化している", note: "同じ方法で比べられる前回記録から、1ポイント以上の差があります。", icon: "compare", tone: "change" }),
  REFERENCE_POSITION: Object.freeze({ title: "基準100から離れている", note: "前回差ではなく、この部位自身の基準100からの位置を確認します。", icon: "reference", tone: "reference" }),
  REFERENCE_NEAR: Object.freeze({ title: "基準100付近にある", note: "この部位自身の基準100付近にあります。次回比較の基準点として確認できます。", icon: "reference", tone: "near" }),
});
function reasonRegionMeta(region = {}) {
  if (region.reasonCode === "REPEATED_DIRECTION") {
    return `過去${Number(region.pastMatchingDirectionCount || 0)}回でも同じ方向`;
  }
  if (region.reasonCode === "PREVIOUS_CHANGE" && finite(region.previousDifference)) {
    return `前回から ${signed(region.previousDifference)}`;
  }
  return referenceText(region.referenceDirection || "");
}

function renderAttentionGroups(output) {
  const groups = output?.overview?.attention?.groups || [];
  if (!groups.length) return "";
  return `<section class="interpretation-room-attention interpretation-room-attention--v3" aria-labelledby="interpretation-attention-title">
    <div class="interpretation-room-section-title"><div><small>部位ごとの確認理由</small><h2 id="interpretation-attention-title">注目する理由で見る</h2></div><p>12部位を、それぞれ「なぜ確認するか」で分類します。同じ数値でも部位ごとの基準と経過は異なります。</p></div>
    <div class="interpretation-room-reason-groups">${groups.map((group) => {
      const copy = REASON_COPY[group.code] || { title: group.code, note: "", icon: "interpretation", tone: "neutral" };
      return `<article class="interpretation-room-reason-group" data-reason="${escapeHtml(group.code)}" data-tone="${escapeHtml(copy.tone)}"><header><span class="reason-icon">${interpretationIcon(copy.icon)}</span><div><strong>${escapeHtml(copy.title)}</strong><small>${escapeHtml(copy.note)}</small></div><span class="reason-count">${group.regions.length}部位</span></header><div class="interpretation-room-reason-list">${group.regions.map((region) => `<a href="${escapeHtml(regionHref(output, region.regionId))}" data-direction="${escapeHtml(directionKey(region.referenceDirection))}"><span class="region-symbol" aria-hidden="true">${interpretationIcon("reference")}</span><span class="region-copy"><strong>${escapeHtml(region.label)}</strong><small>${escapeHtml(reasonRegionMeta(region))}</small></span><b>${escapeHtml(reasonMetric(region))}</b><i aria-hidden="true">›</i></a>`).join("")}</div></article>`;
    }).join("")}</div>
    <p class="interpretation-room-boundary-line">部位ごとの数値は独立した基準で計算しています。ここでは部位間の順位ではなく、確認する理由を示します。</p>
  </section>`;
}
function historyChart(region, currentDate = "") {
  const history = Array.isArray(region?.personalHistory?.lastFive) ? region.personalHistory.lastFive : [];
  const points = history.concat(finite(region?.value) ? [{ date: currentDate, value: Number(region.value), current: true }] : []);
  if (points.length <= 1) return '<div class="interpretation-room-history-empty">比較できる過去記録はまだありません。今回の値を次回の比較点として使えます。</div>';
  const values = points.map((item) => Number(item.value)).concat([100]);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 12) { min -= 6; max += 6; }
  const width = 640, height = 178, left = 36, right = 20, top = 24, bottom = 38;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const x = (index) => points.length === 1 ? left + plotW / 2 : left + plotW * index / (points.length - 1);
  const y = (value) => top + (max - Number(value)) / (max - min) * plotH;
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(point.value).toFixed(1)}`).join(" ");
  const baselineY = y(100).toFixed(1);
  const shortDate = (value) => {
    const parts = String(value || "").split("-");
    return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : String(value || "");
  };
  return `<svg class="interpretation-room-history-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(region.label)}の最近の推移">
    <line class="interpretation-room-history-chart__baseline" x1="${left}" x2="${width-right}" y1="${baselineY}" y2="${baselineY}"></line>
    <text class="interpretation-room-history-chart__baseline-label" x="${left}" y="${Math.max(12, Number(baselineY)-7)}">基準100</text>
    <path class="interpretation-room-history-chart__line" d="${path}"></path>
    ${points.map((point, index) => `<circle class="interpretation-room-history-chart__point${index === points.length - 1 ? " is-current" : ""}" cx="${x(index).toFixed(1)}" cy="${y(point.value).toFixed(1)}" r="${index === points.length - 1 ? 5.5 : 4}"></circle><text class="interpretation-room-history-chart__value" x="${x(index).toFixed(1)}" y="${(y(point.value)-10).toFixed(1)}" text-anchor="middle">${escapeHtml(number(point.value))}</text><text class="interpretation-room-history-chart__date" x="${x(index).toFixed(1)}" y="${height-8}" text-anchor="middle">${escapeHtml(shortDate(point.date))}</text>`).join("")}
  </svg>`;
}

function selectedRegionInterpretation(region = {}) {
  const reference = region.referenceComparison || {}, previous = region.previousComparison || {};
  if (previous.available && finite(previous.difference)) return `今回の値は${referenceText(reference.direction)}にあり、比較できる前回から${signed(previous.difference)}の差があります。基準100、前回、最近の推移の順に確認します。`;
  return `今回の値を、この部位自身の基準100との位置から確認します。次回以降の比較点として保存記録を重ねると、前回差と推移を確認できます。`;
}
function renderSelectedRegion(output) {
  const region = output?.selectedRegion;
  if (!region) return "";
  const reference = region.referenceComparison || {}, previous = region.previousComparison || {};
  const currentDate = output?.target?.date || "";
  const current = finite(region.value) ? number(region.value) : "—";
  const previousValue = previous.available ? number(previous.previousValue) : "—";
  const previousDelta = previous.available && finite(previous.difference) ? signed(previous.difference) : "—";
  return `<section class="interpretation-room-region-detail interpretation-room-region-detail--v3" aria-labelledby="interpretation-region-title">
    <div class="interpretation-room-region-detail__heading"><div><small>この部位を整理</small><h2 id="interpretation-region-title">${escapeHtml(region.label)}</h2><p>${escapeHtml(selectedRegionInterpretation(region))}</p></div><a href="${escapeHtml(regionHref(output, ""))}">部位一覧へ戻る</a></div>
    <div class="interpretation-room-region-reading-order"><div><span>1</span><strong>基準100</strong><small>${escapeHtml(referenceText(reference.direction))}</small></div><i aria-hidden="true">→</i><div><span>2</span><strong>前回</strong><small>${previous.available ? `差 ${escapeHtml(previousDelta)}` : "比較記録なし"}</small></div><i aria-hidden="true">→</i><div><span>3</span><strong>推移</strong><small>比較記録 ${escapeHtml(String(Number(region?.personalHistory?.comparableCount || 0)))}件</small></div></div>
    <div class="interpretation-room-region-stats"><article class="interpretation-room-region-stat is-current" data-direction="${escapeHtml(directionKey(reference.direction))}"><span class="metric-icon">${interpretationIcon("reference")}</span><small>今回</small><strong>${escapeHtml(current)}</strong><span>基準との差 ${escapeHtml(signed(reference.difference))}</span></article><article class="interpretation-room-region-stat"><span class="metric-icon">${interpretationIcon("compare")}</span><small>前回</small><strong>${escapeHtml(previousValue)}</strong><span>${previous.available ? `${escapeHtml(previous.date ? formatLocalDate(previous.date) : "前回")} → 今回 ${escapeHtml(previousDelta)}` : "比較できる過去記録なし"}</span></article><article class="interpretation-room-region-stat"><span class="metric-icon">${interpretationIcon("history")}</span><small>比較できる過去</small><strong>${escapeHtml(String(Number(region?.personalHistory?.comparableCount || 0)))}</strong><span>同じ部位・同じ計算基準の保存記録</span></article></div>
    <div class="interpretation-room-history-panel"><header><strong>この部位の最近の推移</strong><small>破線は、この部位自身の基準100です</small></header>${historyChart(region, currentDate)}</div>
  </section>`;
}
function conditionLabel(id = "") {
  if (id === "distance") return "距離";
  if (id === "duration") return "時間";
  if (id === "pace") return "走る速さ";
  if (id === "running-format") return "走り方";
  if (id === "course") return "コース";
  if (id === "grade") return "坂";
  if (id === "surface") return "路面";
  if (id === "cadence") return "ピッチ";
  return id || "条件";
}

function gradeValue(value) {
  if (!value || typeof value !== "object") return "未設定";
  const up = finite(value.uphillSharePercent) ? `上り${number(value.uphillSharePercent, 0)}%` : "";
  const down = finite(value.downhillSharePercent) ? `下り${number(value.downhillSharePercent, 0)}%` : "";
  if (up || down) return [up, down].filter(Boolean).join("・");
  if (String(value.knowledge || "") === "KNOWN_FLAT") return "ほぼ平坦";
  return "坂情報なし";
}

function surfaceValue(value) {
  if (!Array.isArray(value) || !value.length) return "路面情報なし";
  const total = value.reduce((sum, item) => sum + (finite(item?.sharePercent) ? Number(item.sharePercent) : 0), 0);
  return total > 0 ? `路面構成を記録（合計 ${number(total, 0)}%）` : "路面情報なし";
}

function conditionValue(itemId, value) {
  if (itemId === "distance" && finite(value)) return `${number(value, 2)} km`;
  if (itemId === "duration" && finite(value)) return `${number(value, 1)} 分`;
  if (itemId === "pace" && finite(value)) return paceFromSeconds(value);
  if (itemId === "cadence" && finite(value)) return `${number(value, 0)} spm`;
  if (itemId === "grade") return gradeValue(value);
  if (itemId === "surface") return surfaceValue(value);
  if (itemId === "running-format") return String(value || "") === "RUN_WALK" ? "走りと歩きを混ぜる" : "途中で歩かず走る";
  if (itemId === "course") return String(value || "未選択");
  return finite(value) ? number(value) : String(value || "—");
}

function conditionIconName(id = "") {
  if (id === "distance" || id === "course") return "conditions";
  if (id === "duration" || id === "pace" || id === "cadence") return "history";
  if (id === "running-format") return "trend";
  if (id === "grade" || id === "surface") return "reference";
  return "conditions";
}
function conditionDeltaText(item = {}) {
  if (["distance", "duration", "cadence"].includes(item.id) && finite(item.previous) && finite(item.current)) {
    const delta = Number(item.current) - Number(item.previous);
    if (Math.abs(delta) < 0.001) return "変更なし";
    if (item.id === "distance") return `${signed(delta, 2)} km`;
    if (item.id === "duration") return `${signed(delta, 1)} 分`;
    return `${signed(delta, 0)} spm`;
  }
  if (item.id === "pace" && finite(item.previous) && finite(item.current)) {
    const delta = Math.round(Number(item.current) - Number(item.previous));
    if (!delta) return "変更なし";
    return `${Math.abs(delta)}秒/km${delta < 0 ? "速い" : "遅い"}`;
  }
  return JSON.stringify(item.previous) === JSON.stringify(item.current) ? "変更なし" : "変更あり";
}
function relationshipText(value = "") {
  if (value === "USED_IN_CURRENT_ROUTE") return "この部位の計算に使用";
  if (value === "DEFINES_EXPOSURE") return "計算する走行区間を決める";
  if (value === "RECORDED_CONDITIONAL") return "計算条件として記録";
  if (value === "RECORDED_CONTEXT") return "関連情報として記録";
  if (value === "NOT_IDENTIFIED_IN_REGION_ROUTE") return "この部位の計算経路では確認せず";
  return "部位を選ぶと関係を確認";
}

function renderConditions(output) {
  const data = output?.conditions || {};
  const rows = Array.isArray(data.differences) ? data.differences : [];
  if (!rows.length) return "";
  const selected = Boolean(output?.selectedRegion);
  return `<section class="interpretation-room-conditions interpretation-room-conditions--v3" aria-labelledby="interpretation-conditions-title"><div class="interpretation-room-section-title"><div><small>前回から変わった走行事実</small><h2 id="interpretation-conditions-title">条件の違いを整理</h2></div><p>${rows.length}項目に差があります。条件差と部位表示は同じ記録内で並べて確認し、変化の背景を整理します。</p></div><div class="interpretation-room-condition-cards">${rows.map((item) => `<article class="interpretation-room-condition-card"><span class="condition-icon">${interpretationIcon(conditionIconName(item.id))}</span><div class="condition-title"><small>${escapeHtml(conditionLabel(item.id))}</small><strong>${escapeHtml(conditionDeltaText(item))}</strong></div><div class="condition-values"><span><small>前回</small><b>${escapeHtml(conditionValue(item.id, item.previous))}</b></span><i aria-hidden="true">→</i><span><small>今回</small><b>${escapeHtml(conditionValue(item.id, item.current))}</b></span></div><p>${escapeHtml(selected ? relationshipText(item.relationship) : "今回の結果と並べて確認")}</p></article>`).join("")}</div><p class="interpretation-room-boundary-line">${selected ? "選択した部位では、計算に使われた条件と関連情報を区別して表示します。" : "部位を選択すると、その条件が選択部位の計算でどのように扱われたかも確認できます。"}</p></section>`;
}
function rofMeaningText(item = {}) {
  if (!item?.available) return "";
  if (item.descriptorType === "EXACT") return item.descriptor || "";
  if (item.descriptorType === "BETWEEN_ANCHORS" && item.lowerAnchor && item.upperAnchor) {
    return `${item.lowerAnchor.value}「${item.lowerAnchor.descriptor}」と${item.upperAnchor.value}「${item.upperAnchor.descriptor}」の間`;
  }
  if (item.descriptorType === "POSITION_ONLY" && item.upperAnchor) return `${item.upperAnchor.value}「${item.upperAnchor.descriptor}」より尺度上で下側`;
  if (item.descriptorType === "POSITION_ONLY" && item.lowerAnchor) return `${item.lowerAnchor.value}「${item.lowerAnchor.descriptor}」より尺度上で上側`;
  return "0〜10の尺度上の位置";
}

function renderSubjective(output) {
  const context = output?.subjectiveContext || {};
  if (context.state === "NONE") return "";
  const pre = context.pre || {}, post = context.post || {}, pair = context.difference?.eligible;
  const preValue = pre.available ? number(pre.value,0) : "—", postValue = post.available ? number(post.value,0) : "—", difference = pair ? signed(context.difference.value,0) : "—";
  const note = pair ? `本人が記録した疲労感は ${preValue} → ${postValue}（差 ${difference}）です。12部位の数値とは別に、同じ日の主観記録として確認します。` : "走る前後の疲労感がそろっていないため、前後差は表示しません。記録できている側だけを確認します。";
  return `<section class="interpretation-room-subjective interpretation-room-subjective--v3" aria-labelledby="interpretation-subjective-title"><div class="interpretation-room-section-title"><div><small>本人の記録</small><h2 id="interpretation-subjective-title">本人の記録との関係</h2></div><p>部位数値とは別の情報として、同じ日の主観記録を並べて確認します。</p></div><div class="interpretation-room-subjective-layout"><div class="interpretation-room-fatigue-flow"><article><span>${interpretationIcon("person")}</span><div><small>走る前</small><strong>${escapeHtml(preValue)}<em>/10</em></strong><p>${escapeHtml(pre.available ? rofMeaningText(pre) : "記録なし")}</p></div></article><i aria-hidden="true">→</i><article><span>${interpretationIcon("person")}</span><div><small>走った後</small><strong>${escapeHtml(postValue)}<em>/10</em></strong><p>${escapeHtml(post.available ? rofMeaningText(post) : "記録なし")}</p></div></article><aside><small>前後差</small><strong>${escapeHtml(difference)}</strong></aside></div><article class="interpretation-room-subjective-note"><span>${interpretationIcon("interpretation")}</span><div><strong>RunLoadでの見方</strong><p>${escapeHtml(note)}</p><small>次回も同じ尺度で記録すると、自分の主観記録として前後差を比較しやすくなります。</small></div></article></div></section>`;
}
function inputLabel(item = {}) {
  if (item.id === "DISTANCE") return "距離";
  if (item.id === "DURATION") return "時間";
  if (item.id === "RUNNING_DISTANCE") return "走った区間の距離";
  if (item.id === "RUNNING_DURATION") return "走った区間の時間";
  if (item.id === "SPEED") return "走る速さ";
  if (item.id === "CADENCE") return "ピッチ";
  if (item.id === "GRADE") return "坂";
  if (item.id === "SURFACE") return "路面";
  if (item.id === "FOOT_STRIKE") return "足のつき方";
  return item.id || "記録情報";
}

function inputValue(item = {}, exposure = {}) {
  if (["DISTANCE", "RUNNING_DISTANCE"].includes(item.id) && finite(item.value)) return `${number(item.value, 2)} km`;
  if (["DURATION", "RUNNING_DURATION"].includes(item.id) && finite(item.value)) return `${number(item.value, 1)} 分`;
  if (item.id === "SPEED") return paceFromSpeed(item.value || exposure.speedMps) || "計算済み";
  if (item.id === "CADENCE" && finite(item.value)) return `${number(item.value, 0)} spm`;
  if (item.id === "GRADE") return "坂の記録あり";
  if (item.id === "SURFACE") return "路面の記録あり";
  if (item.id === "FOOT_STRIKE") return "入力あり";
  return finite(item.value) ? number(item.value) : "記録あり";
}

function renderCalculationDetails(region) {
  if (!region?.calculationPath) return "";
  const path = region.calculationPath;
  if (path.resolutionStatus === "UNAVAILABLE") return "";
  const exposure = path.exposure || {};
  const rows = [
    ...(path.activeInputs || []).map((item) => ({ ...item, bucket: "数値計算に使用" })),
    ...(path.conditionalInputs || []).map((item) => ({ ...item, bucket: "計算条件として記録" })),
    ...(path.contextOnlyInputs || []).map((item) => ({ ...item, bucket: "関連情報として記録" })),
  ];
  return `<details class="interpretation-room-calculation"><summary>この部位の数値に使われた情報を確認</summary><div>
    <div class="interpretation-room-calculation-table">${rows.map((item) => `<div><strong>${escapeHtml(inputLabel(item))}</strong><span>${escapeHtml(inputValue(item, exposure))}</span><small>${escapeHtml(item.bucket)}</small></div>`).join("")}</div>
    <p class="interpretation-room-boundary-line">ここでは、この部位の数値を計算するときに使った記録項目を確認できます。</p>
  </div></details>`;
}

function renderUnderstanding(output) {
  const counts = output?.overview?.attention?.counts || {}, known = [];
  if (Number(counts.available || 0)) known.push(`${Number(counts.available)}部位を、それぞれの部位自身の基準100との関係で確認できます。`);
  if (Number(counts.previousComparable || 0)) known.push(`前回と比較できる${Number(counts.previousComparable)}部位について、今回との差を確認できます。`);
  if (Number(counts.repeated || 0)) known.push(`過去にも同じ方向が複数回確認された部位が${Number(counts.repeated)}部位あります。`);
  if (output?.subjectiveContext?.difference?.eligible) known.push("本人が記録した走る前後の疲労感を、部位数値とは別に確認できます。");
  const pending = [];
  if ((output?.conditions?.differences || []).length) pending.push("条件差と部位の変化は別々に整理し、複数回の比較で関係を確かめます。");
  pending.push("各部位は、その部位自身の基準100・前回差・推移の順に確認します。");
  if (output?.subjectiveContext?.difference?.eligible) pending.push("本人の疲労感と部位数値は別々に記録し、それぞれの推移を確認します。");
  return `<section class="interpretation-room-understanding interpretation-room-understanding--v3" aria-labelledby="interpretation-understanding-title"><div class="interpretation-room-section-title interpretation-room-section-title--compact"><div><small>解釈の確認事項</small><h2 id="interpretation-understanding-title">今回の読み方を整理</h2></div></div><div class="interpretation-room-understanding-grid"><article data-kind="known"><span>${interpretationIcon("interpretation")}</span><div><strong>今回確認できること</strong><ul>${known.slice(0,4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></article><article data-kind="pending"><span>${interpretationIcon("compare")}</span><div><strong>次回以降で確かめること</strong><ul>${pending.slice(0,3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></article></div></section>`;
}
const NEXT_CHECK_COPY = Object.freeze({
  ADD_COMPARABLE_RECORD: "同じ部位を次回も記録すると、今回を比較点にして前回差と推移を確認できます。",
  RECHECK_REPEATED_DIRECTION: "同じ部位で同じ方向が続くかを、次の比較可能な記録でも確認できます。",
  KEEP_CONDITIONS_VISIBLE: "次回も距離・時間・コース条件を残すと、条件の違いと部位表示を並べて確認しやすくなります。",
  RECORD_NEXT_COMPARABLE_RUN: "次の比較可能な記録を残すと、今回見つかった変化が続くかを確認できます。",
  CONTINUE_COMPARABLE_RECORDS: "同じ方法で記録を続けると、今回を含む推移として確認できる情報が増えます。",
});

function renderNext(output) {
  const next = output?.next || {};
  const actions = [next.primaryAction, ...(next.otherActions || [])].filter((action) => action && action.enabled !== false).slice(0, 4);
  const check = output?.nextCheck || {}, checkCopy = NEXT_CHECK_COPY[check.code] || NEXT_CHECK_COPY.CONTINUE_COMPARABLE_RECORDS;
  return `<section class="interpretation-room-next interpretation-room-next--v3" aria-labelledby="interpretation-next-title"><div class="interpretation-room-section-title"><div><small>自己理解を次へつなぐ</small><h2 id="interpretation-next-title">次に確かめる</h2></div><p>今回の解釈を次の比較につなげるため、確認方法を選べます。</p></div><div class="interpretation-room-next-check"><span class="next-icon">${interpretationIcon("flag")}</span><div><small>次の確認ポイント</small><strong>${escapeHtml(checkCopy)}</strong>${check.userRecorded ? `<p><b>自分で残した次回確認</b><span>${escapeHtml(check.userRecorded)}</span></p>` : ""}</div></div><div class="interpretation-room-action-grid">${actions.map((action, index) => renderAction(action, output, { primary: index === 0 })).join("")}</div></section>`;
}
function publicConstructText(value = "") {
  return String(value || "")
    .replace(/Reference[- ]?100/gi, "基準100")
    .replace(/reference[- ]?100/gi, "基準100")
    .replace(/Reference/gi, "基準");
}

function renderAdvanced(output, region) {
  if (!region) return "";
  const evidence = output?.advanced?.evidence?.regions?.[region.regionId] || null;
  if (!evidence) return renderCalculationDetails(region);
  const sources = Array.isArray(evidence.sources) ? evidence.sources : [];
  return `${renderCalculationDetails(region)}<details class="interpretation-room-advanced"><summary>計算の考え方と根拠を詳しく見る</summary><div>${evidence.construct ? `<p><strong>この数値が表す内容</strong><br>${escapeHtml(publicConstructText(evidence.construct))}</p>` : ""}${sources.length ? `<p><strong>この計算の背景資料</strong></p><ul>${sources.map((source) => `<li>${escapeHtml(source.label || "参考資料")}${source.role ? ` — ${escapeHtml(source.role)}` : ""}</li>`).join("")}</ul>` : ""}<p class="interpretation-room-boundary-line">ここでは、選択した部位の計算に関係する情報を確認できます。</p></div></details>`;
}
export function renderInterpretationRoom({ output } = {}) {
  if (!output?.state?.targetAvailable) {
    return `<div class="interpretation-room interpretation-room--empty" data-interpretation-room-state="empty"><header class="interpretation-room-hero"><p>結果を整理する</p><h1>対象の保存記録がありません</h1><p>保存した走行記録から、今回確認できることを整理します。</p></header><a class="interpretation-room-action interpretation-room-action--primary" href="#/record-input"><span class="interpretation-room-action__icon">${interpretationIcon("record")}</span><span class="interpretation-room-action__copy"><strong>記録を始める</strong><small>新しい走行記録を入力します。</small></span><i aria-hidden="true">›</i></a></div>`;
  }
  if (output?.state?.support && output.state.support !== "NORMAL") return renderSupportPriority(output);
  if (output?.state?.regional === "REST") return renderRest(output);

  const date = output?.target?.date ? formatLocalDate(output.target.date) : "今回の記録";
  const selected = Boolean(output?.selectedRegion);
  return `<div class="interpretation-room${selected ? " interpretation-room--selected" : " interpretation-room--overview"}" data-interpretation-room-state="${selected ? "selected" : "overview"}">
    <header class="interpretation-room-hero interpretation-room-hero--v3"><div class="interpretation-room-hero__copy"><p>${escapeHtml(date)}</p><h1>${selected ? `${escapeHtml(output.selectedRegion.label)}をRunLoadで整理` : "今回の結果をRunLoadで整理"}</h1><p>${selected ? "この部位の基準100、前回差、最近の推移、走行条件を順に確認し、次の比較につなげます。" : "今回の数値、過去の記録、本人の記録、走行条件を分けて確認し、結果の意味と次の確認ポイントを整理します。"}</p></div><div class="interpretation-room-hero__mark"><span>${interpretationIcon("interpretation")}</span><div><strong>RunLoad Interpretation</strong><small>12部位を個別基準で整理</small></div></div></header>
    ${renderSummary(output)}
    ${selected ? "" : renderInterpretationEntry(output)}
    ${selected ? renderSelectedRegion(output) : renderAttentionGroups(output)}
    ${renderConditions(output)}
    ${renderSubjective(output)}
    ${renderUnderstanding(output)}
    ${renderNext(output)}
    ${renderAdvanced(output, output?.selectedRegion)}
  </div>`;
}

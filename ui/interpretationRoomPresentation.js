import { escapeHtml } from "./commonComponents.js";
import { formatLocalDate } from "./recordPresentation.js";
import {
  buildInterpretationContextCandidate,
  getInterpretationReferenceKnowledgeById,
  normalizeInterpretationConditionId,
  referenceReadingHref,
  selectInterpretationReferenceKnowledge,
} from "./interpretationReferenceKnowledge.js";

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
  interpretation: '<circle cx="12" cy="12" r="8"/><path d="m14.7 9.3-1.9 3.5-3.5 1.9 1.9-3.5z"/>',
  trend: '<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>',
  repeat: '<path d="M7 7h9a4 4 0 0 1 4 4"/><path d="m7 3-4 4 4 4"/><path d="M17 17H8a4 4 0 0 1-4-4"/><path d="m17 21 4-4-4-4"/>',
  conditions: '<path d="M4 7h9"/><path d="M17 7h3"/><circle cx="15" cy="7" r="2"/><path d="M4 17h3"/><path d="M11 17h9"/><circle cx="9" cy="17" r="2"/>',
  person: '<circle cx="12" cy="7" r="3"/><path d="M6.5 20c.7-4 2.7-6 5.5-6s4.8 2 5.5 6"/>',
  flag: '<path d="M5 21V4"/><path d="M5 5h11l-2 4 2 4H5"/>',
  compare: '<path d="M5 8h13"/><path d="m15 5 3 3-3 3"/><path d="M19 16H6"/><path d="m9 13-3 3 3 3"/>',
  reference: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  history: '<path d="M4 5v6h6"/><path d="M5.5 16a8 8 0 1 0 .2-8"/><path d="M12 8v5l3 2"/>',
  share: '<circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="m8 11 8-4M8 13l8 4"/>',
  book: '<path d="M4 5.5A3.5 3.5 0 0 1 7.5 4H11v15H7.5A3.5 3.5 0 0 0 4 20.5z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 4H13v15h3.5a3.5 3.5 0 0 1 3.5 1.5z"/>',
  plan: '<rect x="5" y="5" width="14" height="15" rx="2"/><path d="M8 3v4M16 3v4M8 11h8M8 15h5"/>',
  record: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  support: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8h.01"/>',
  up: '<path d="m6 15 6-6 6 6"/><path d="M12 9v10"/>',
  down: '<path d="m6 9 6 6 6-6"/><path d="M12 5v10"/>',
  near: '<path d="M5 12h14"/><circle cx="12" cy="12" r="3"/>',
});
function interpretationIcon(name, className = "") {
  const paths = INTERPRETATION_ICONS[name] || INTERPRETATION_ICONS.interpretation;
  return `<svg class="interpretation-room-icon${className ? ` ${escapeHtml(className)}` : ""}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
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
function directionIconName(direction = "") {
  if (direction === "ABOVE_REFERENCE") return "up";
  if (direction === "BELOW_REFERENCE") return "down";
  if (direction === "REFERENCE_VICINITY") return "near";
  return "reference";
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

const REASON_COPY = Object.freeze({
  REPEATED_DIRECTION: Object.freeze({ title: "同じ方向が続いている", note: "過去の比較可能な記録でも、今回と同じ基準側が複数回確認されています。", icon: "repeat", tone: "repeat" }),
  PREVIOUS_CHANGE: Object.freeze({ title: "前回から変化している", note: "同じ方法で比べられる前回記録から、1ポイント以上の差があります。", icon: "compare", tone: "change" }),
  REFERENCE_POSITION: Object.freeze({ title: "基準100から離れている", note: "前回差ではなく、この部位自身の基準100からの位置を確認します。", icon: "reference", tone: "reference" }),
  REFERENCE_NEAR: Object.freeze({ title: "基準100付近にある", note: "この部位自身の基準100付近にあります。次回比較の基準点として確認できます。", icon: "reference", tone: "near" }),
});
function reasonRegionMeta(region = {}) {
  if (region.reasonCode === "REPEATED_DIRECTION") {
    return `同方向 ${Number(region.pastMatchingDirectionCount || 0)}回`;
  }
  if (region.reasonCode === "PREVIOUS_CHANGE" && finite(region.previousDifference)) {
    return `前回から ${signed(region.previousDifference)}`;
  }
  return referenceText(region.referenceDirection || "");
}

function renderAttentionGroups(output) {
  const groups = output?.overview?.attention?.groups || [];
  if (!groups.length) return "";
  return `<section class="interpretation-room-attention interpretation-room-attention--overview" aria-labelledby="interpretation-attention-title">
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

function renderSelectedRegion(output) {
  const region = output?.selectedRegion;
  if (!region) return "";
  const reference = region.referenceComparison || {}, previous = region.previousComparison || {};
  const currentDate = output?.target?.date || "";
  const current = finite(region.value) ? number(region.value) : "—";
  const previousDelta = previous.available && finite(previous.difference) ? signed(previous.difference) : "—";
  const historyCount = Number(region?.personalHistory?.comparableCount || 0);
  return `<section class="interpretation-room-region-detail interpretation-room-region-detail--selected interpretation-room-region-detail--compact" aria-labelledby="interpretation-region-title">
    <div class="interpretation-room-region-primary">
      <div><small>今回</small><strong id="interpretation-region-title">${escapeHtml(current)}</strong><span>${escapeHtml(referenceText(reference.direction))}</span></div>
      <dl><div><dt>前回差</dt><dd>${escapeHtml(previousDelta)}</dd></div><div><dt>比較記録</dt><dd>${escapeHtml(String(historyCount))}件</dd></div></dl>
    </div>
    ${historyCount ? `<details class="interpretation-room-history-panel interpretation-room-history-panel--compact"><summary>最近の推移 <span>${escapeHtml(String(historyCount))}件</span></summary>${historyChart(region, currentDate)}</details>` : ""}
  </section>`;
}
function conditionLabel(id = "") {
  const key = normalizeInterpretationConditionId(id);
  if (key === "distance") return "距離";
  if (key === "duration") return "時間";
  if (key === "pace") return "走る速さ";
  if (key === "running-format") return "走り方";
  if (key === "course") return "コース";
  if (key === "grade") return "坂";
  if (key === "surface") return "路面";
  if (key === "cadence") return "ピッチ";
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
  const key = normalizeInterpretationConditionId(itemId);
  if (key === "distance" && finite(value)) return `${number(value, 2)} km`;
  if (key === "duration" && finite(value)) return `${number(value, 1)} 分`;
  if (key === "pace" && finite(value)) return paceFromSeconds(value);
  if (key === "cadence" && finite(value)) return `${number(value, 0)} spm`;
  if (key === "grade") return gradeValue(value);
  if (key === "surface") return surfaceValue(value);
  if (key === "running-format") return String(value || "") === "RUN_WALK" ? "走りと歩きを混ぜる" : "途中で歩かず走る";
  if (key === "course") return String(value || "未選択");
  return finite(value) ? number(value) : String(value || "—");
}

function conditionIconName(id = "") {
  const key = normalizeInterpretationConditionId(id);
  if (key === "distance" || key === "course") return "conditions";
  if (key === "duration" || key === "pace" || key === "cadence") return "history";
  if (key === "running-format") return "trend";
  if (key === "grade" || key === "surface") return "reference";
  return "conditions";
}
function conditionDeltaText(item = {}) {
  const key = normalizeInterpretationConditionId(item.id || item.labelToken || "");
  if (["distance", "duration", "cadence"].includes(key) && finite(item.previous) && finite(item.current)) {
    const delta = Number(item.current) - Number(item.previous);
    if (Math.abs(delta) < 0.001) return "変更なし";
    if (key === "distance") return `${signed(delta, 2)} km`;
    if (key === "duration") return `${signed(delta, 1)} 分`;
    return `${signed(delta, 0)} spm`;
  }
  if (key === "pace" && finite(item.previous) && finite(item.current)) {
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
  if (value === "RECORDED_NOT_USED_NUMERIC") return "記録あり・この部位の数値計算には未使用";
  if (value === "NOT_IDENTIFIED_IN_REGION_ROUTE") return "この部位の計算経路では確認せず";
  return "部位を選ぶと関係を確認";
}

function renderConditions(output) {
  const data = output?.conditions || {};
  const rows = Array.isArray(data.differences) ? data.differences : [];
  if (!rows.length) return "";
  const selected = Boolean(output?.selectedRegion);
  return `<section class="interpretation-room-conditions interpretation-room-conditions--comparison" aria-labelledby="interpretation-conditions-title"><div class="interpretation-room-section-title"><div><small>前回から変わった走行事実</small><h2 id="interpretation-conditions-title">条件の違いを整理</h2></div><p>${rows.length}項目に差があります。条件差と部位表示は同じ記録内で並べて確認し、変化の背景を整理します。</p></div><div class="interpretation-room-condition-cards">${rows.map((item) => `<article class="interpretation-room-condition-card"><span class="condition-icon">${interpretationIcon(conditionIconName(item.id))}</span><div class="condition-title"><small>${escapeHtml(conditionLabel(item.id))}</small><strong>${escapeHtml(conditionDeltaText(item))}</strong></div><div class="condition-values"><span><small>前回</small><b>${escapeHtml(conditionValue(item.id, item.previous))}</b></span><i aria-hidden="true">→</i><span><small>今回</small><b>${escapeHtml(conditionValue(item.id, item.current))}</b></span></div><p>${escapeHtml(selected ? relationshipText(item.relationship) : "今回の結果と並べて確認")}</p></article>`).join("")}</div><p class="interpretation-room-boundary-line">${selected ? "選択した部位では、計算に使われた条件と関連情報を区別して表示します。" : "部位を選択すると、その条件が選択部位の計算でどのように扱われたかも確認できます。"}</p></section>`;
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
  return `<section class="interpretation-room-subjective interpretation-room-subjective--context" aria-labelledby="interpretation-subjective-title"><div class="interpretation-room-section-title"><div><small>本人の記録</small><h2 id="interpretation-subjective-title">本人の記録との関係</h2></div><p>部位数値とは別の情報として、同じ日の主観記録を並べて確認します。</p></div><div class="interpretation-room-subjective-layout"><div class="interpretation-room-fatigue-flow"><article><span>${interpretationIcon("person")}</span><div><small>走る前</small><strong>${escapeHtml(preValue)}<em>/10</em></strong><p>${escapeHtml(pre.available ? rofMeaningText(pre) : "記録なし")}</p></div></article><i aria-hidden="true">→</i><article><span>${interpretationIcon("person")}</span><div><small>走った後</small><strong>${escapeHtml(postValue)}<em>/10</em></strong><p>${escapeHtml(post.available ? rofMeaningText(post) : "記録なし")}</p></div></article><aside><small>前後差</small><strong>${escapeHtml(difference)}</strong></aside></div><article class="interpretation-room-subjective-note"><span>${interpretationIcon("interpretation")}</span><div><strong>このアプリでの見方</strong><p>${escapeHtml(note)}</p><small>次回も同じ尺度で記録すると、自分の主観記録として前後差を比較しやすくなります。</small></div></article></div></section>`;
}

function overviewHeadline(output) {
  const counts = output?.overview?.attention?.counts || {};
  const repeated = Number(counts.repeated || 0);
  const changed = Number(counts.previousChanged || 0);
  if (available > 0 && repeated === available) return `${available}部位すべてで、同じ方向が複数回確認されています`;
  if (available > 0 && repeated >= Math.max(2, Math.ceil(available / 2))) return `${available}部位中${repeated}部位で、同じ方向が複数回確認されています`;
  if (changed > 0) return `${changed}部位で、前回からの変化を確認できます`;
  return "今回の記録を、次回比較の基準点として使えます";
}

function overviewExplanation(output) {
  const counts = output?.overview?.attention?.counts || {};
  const changed = Number(counts.previousChanged || 0);
  const conditionCount = Number(counts.conditionDifferences || 0);
  const subjective = output?.subjectiveContext || {};
  const pair = Boolean(subjective?.difference?.eligible);
  const pre = pair && finite(subjective?.pre?.value) ? number(subjective.pre.value, 0) : "";
  const post = pair && finite(subjective?.post?.value) ? number(subjective.post.value, 0) : "";
  const difference = pair ? signed(subjective.difference.value, 0) : "";
  const parts = [];
  if (changed) parts.push(`前回から${changed}部位に差があります。`);
  if (conditionCount && pair) {
    parts.push(`同時に走行条件が${conditionCount}項目変わり、疲労感も${pre}→${post}（${difference}）に変化しています。`);
    parts.push("「部位」「条件」「本人の感覚」を分けて残すと、次回も同じ種類の情報を比較しやすくなります。");
  } else if (conditionCount) {
    parts.push(`走行条件も${conditionCount}項目変わっています。部位の変化と条件差を分けて残すと、次回の比較で違いを読み分けやすくなります。`);
  } else if (pair) {
    parts.push(`疲労感は${pre}→${post}（${difference}）です。部位数値とは別に残すと、次回も同じ尺度で比較できます。`);
  } else {
    parts.push("今回を比較点として保存し、次回も同じ方法で記録すると、今回との違いを確認しやすくなります。");
  }
  return parts.join("");
}

function comparisonHint(output) {
  const rows = Array.isArray(output?.conditions?.differences) ? output.conditions.differences : [];
  const repeated = Number(output?.overview?.attention?.counts?.repeated || 0);
  if (rows.length) {
    const labels = rows.slice(0, 3).map((item) => conditionLabel(item.id)).filter(Boolean);
    const suffix = rows.length > 3 ? "など" : "";
    return `次回も「${labels.join("・")}${suffix}」を記録しておくと、今回との条件差を並べて確認できます。`;
  }
  if (repeated) return "次回も同じ方法で記録すると、今回と同じ基準側になるかを事実として確認できます。";
  return "次回も同じ方法で記録すると、今回を基準に前回差と推移を確認できます。";
}

function renderOverviewInsight(output, date) {
  const counts = output?.overview?.attention?.counts || {};
  const subjective = output?.subjectiveContext || {};
  const pair = Boolean(subjective?.difference?.eligible);
  const repeated = Number(counts.repeated || 0);
  const changed = Number(counts.previousChanged || 0);
  const conditionCount = Number(counts.conditionDifferences || 0);
  return `<section class="interpretation-room-insight interpretation-room-insight--compact" aria-labelledby="interpretation-insight-title">
    <header class="interpretation-room-compact-head">
      <p>${escapeHtml(date)}</p>
      <h1 id="interpretation-insight-title">今回の比較</h1>
    </header>
    <div class="interpretation-room-quick-facts" aria-label="今回の比較要点">
      <span><small>前回差</small><strong>${changed}</strong><em>部位</em></span>
      <span><small>同じ側</small><strong>${repeated}</strong><em>部位</em></span>
      <span><small>条件差</small><strong>${conditionCount}</strong><em>項目</em></span>
      ${pair ? `<span><small>疲労感</small><strong>${escapeHtml(number(subjective.pre.value,0))}→${escapeHtml(number(subjective.post.value,0))}</strong><em>/10</em></span>` : ""}
    </div>
  </section>`;
}

function renderPatternBoard(output) {
  const groups = output?.overview?.attention?.groups || [];
  if (!groups.length) return "";
  return `<section class="interpretation-room-patterns interpretation-room-patterns--compact" aria-labelledby="interpretation-attention-title">
    <div class="interpretation-room-compact-section-head"><h2 id="interpretation-attention-title">比較できる部位</h2></div>
    <div class="interpretation-room-pattern-groups interpretation-room-pattern-groups--disclosure">${groups.map((group) => {
      const copy = REASON_COPY[group.code] || { title: group.code, note: "", icon: "interpretation", tone: "neutral" };
      return `<details class="interpretation-room-pattern-group interpretation-room-pattern-group--compact" data-tone="${escapeHtml(copy.tone)}">
        <summary><span>${interpretationIcon(copy.icon)}</span><strong>${escapeHtml(copy.title)}</strong><b>${group.regions.length}部位</b><i aria-hidden="true">›</i></summary>
        <div class="interpretation-room-region-chips">${group.regions.map((region) => `<a href="${escapeHtml(regionHref(output, region.regionId))}" data-direction="${escapeHtml(directionKey(region.referenceDirection))}"><span class="region-chip__marker">${interpretationIcon(directionIconName(region.referenceDirection))}</span><span class="region-chip__copy"><strong>${escapeHtml(region.label)}</strong><small>${escapeHtml(reasonRegionMeta(region))}</small></span><b>${escapeHtml(number(region.value))}</b><i aria-hidden="true">›</i></a>`).join("")}</div>
      </details>`;
    }).join("")}</div>
  </section>`;
}

function renderContextBoard(output) {
  const rows = Array.isArray(output?.conditions?.differences) ? output.conditions.differences : [];
  const context = output?.subjectiveContext || {};
  const pre = context.pre || {}, post = context.post || {};
  const pair = Boolean(context?.difference?.eligible);
  if (!rows.length && context.state === "NONE") return "";
  return `<section class="interpretation-room-context interpretation-room-context--compact" aria-labelledby="interpretation-context-title">
    <div class="interpretation-room-compact-section-head"><h2 id="interpretation-context-title">条件・疲労</h2></div>
    <div class="interpretation-room-context-lines">
      ${rows.length ? `<details><summary><span>${interpretationIcon("conditions")}</span><strong>条件差</strong><b>${rows.length}項目</b><i aria-hidden="true">›</i></summary><div class="interpretation-room-context-rows">${rows.map((item) => `<div><span><small>${escapeHtml(conditionLabel(item.id))}</small><strong>${escapeHtml(conditionDeltaText(item))}</strong></span><span class="context-values">${escapeHtml(conditionValue(item.id, item.previous))}<i>→</i>${escapeHtml(conditionValue(item.id, item.current))}</span></div>`).join("")}</div></details>` : ""}
      ${context.state !== "NONE" ? `<details><summary><span>${interpretationIcon("person")}</span><strong>疲労感</strong><b>${escapeHtml(pre.available ? number(pre.value,0) : "—")} → ${escapeHtml(post.available ? number(post.value,0) : "—")}</b><i aria-hidden="true">›</i></summary><div class="interpretation-room-fatigue-inline"><span>走る前 <b>${escapeHtml(pre.available ? number(pre.value,0) : "—")}/10</b></span><i>→</i><span>走った後 <b>${escapeHtml(post.available ? number(post.value,0) : "—")}/10</b></span>${pair ? `<strong>${escapeHtml(signed(context.difference.value,0))}</strong>` : ""}</div></details>` : ""}
    </div>
  </section>`;
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

function unsupportedBucket(item = {}) {
  if (item.reasonCategory === "OUTSIDE_SUPPORTED_RANGE") return "確認できる資料範囲外・数値には未使用";
  if (item.reasonCategory === "REFERENCE_NOT_READY") return "比較基準を準備中・数値には未使用";
  if (item.reasonCategory === "AXIS_PRESERVED_NOT_COMBINED") return "別条件と同時には組み合わせず・数値には未使用";
  return "現在の計算では数値に未使用";
}

function renderCalculationDetails(region) {
  if (!region?.calculationPath) return "";
  const path = region.calculationPath;
  if (path.resolutionStatus === "UNAVAILABLE") return "";
  const exposure = path.exposure || {};
  const rows = [
    ...(path.activeInputs || []).map((item) => ({ ...item, bucket: "数値計算に使用" })),
    ...(path.conditionalInputs || []).map((item) => ({ ...item, bucket: "計算条件として記録" })),
    ...(path.contextOnlyInputs || []).map((item) => ({ ...item, bucket: "関連情報として記録（数値には未使用）" })),
    ...(path.unsupportedInputs || []).map((item) => ({ ...item, bucket: unsupportedBucket(item) })),
  ];
  return `<details class="interpretation-room-calculation"><summary>この部位の数値に使われた情報を確認</summary><div>
    <div class="interpretation-room-calculation-table">${rows.map((item) => `<div><strong>${escapeHtml(inputLabel(item))}</strong><span>${escapeHtml(inputValue(item, exposure))}</span><small>${escapeHtml(item.bucket)}</small></div>`).join("")}</div>
    <p class="interpretation-room-boundary-line">数値に使った条件、記録したが数値には使わなかった条件、関連情報を分けて表示します。</p>
  </div></details>`;
}

function renderUnderstanding(output) {
  const selected = output?.selectedRegion || null;
  const counts = output?.overview?.attention?.counts || {};
  const known = [];
  const pending = [];
  if (selected) {
    const previous = selected.previousComparison || {};
    const comparableCount = Number(selected?.personalHistory?.comparableCount || 0);
    known.push(`${selected.label}の今回値を、この部位自身の基準100との位置で確認できます。`);
    if (previous.available) known.push(`比較できる前回記録からの差を確認できます。`);
    if (comparableCount) known.push(`同じ部位・同じ計算基準で比較できる過去記録が${comparableCount}件あります。`);
    if (output?.subjectiveContext?.difference?.eligible) known.push("本人が記録した走る前後の疲労感を、部位数値とは別に確認できます。");
    if ((output?.conditions?.differences || []).length) pending.push("条件差と選択部位の変化は別々の情報として、今後の記録でも並べて確認できます。");
    pending.push("この部位は他の部位と順位付けせず、基準100・前回差・推移の順に確認します。");
  } else {
    if (Number(counts.available || 0)) known.push(`${Number(counts.available)}部位を、それぞれの部位自身の基準100との関係で確認できます。`);
    if (Number(counts.previousComparable || 0)) known.push(`前回と比較できる${Number(counts.previousComparable)}部位について、今回との差を確認できます。`);
    if (Number(counts.repeated || 0)) known.push(`過去にも同じ方向が複数回確認された部位が${Number(counts.repeated)}部位あります。`);
    if (output?.subjectiveContext?.difference?.eligible) known.push("本人が記録した走る前後の疲労感を、部位数値とは別に確認できます。");
    if ((output?.conditions?.differences || []).length) pending.push("条件差と部位の変化は別々の情報として、今後の記録でも並べて確認できます。");
    pending.push("各部位は、その部位自身の基準100・前回差・推移の順に確認します。");
  }
  if (output?.subjectiveContext?.difference?.eligible) pending.push("本人の疲労感と部位数値は別々に記録し、それぞれの推移を確認します。");
  return `<section class="interpretation-room-understanding interpretation-room-understanding--summary" aria-labelledby="interpretation-understanding-title"><div class="interpretation-room-section-title interpretation-room-section-title--compact"><div><small>解釈の確認事項</small><h2 id="interpretation-understanding-title">${selected ? "この部位の読み方を整理" : "今回の読み方を整理"}</h2></div></div><div class="interpretation-room-understanding-grid"><article data-kind="known"><span>${interpretationIcon("interpretation")}</span><div><strong>今回確認できること</strong><ul>${known.slice(0,4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></article><article data-kind="pending"><span>${interpretationIcon("compare")}</span><div><strong>次回以降で確かめること</strong><ul>${pending.slice(0,3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></article></div></section>`;
}
function sensationLabel(value = "") {
  const key = String(value || "").toUpperCase();
  if (key === "FATIGUE") return "疲労感";
  if (key === "TIGHTNESS") return "張り";
  if (key === "DISCOMFORT") return "違和感";
  if (key === "OTHER") return "その他";
  return "身体の記録";
}

function timingLabel(value = "") {
  const key = String(value || "").toUpperCase();
  if (key === "BEFORE") return "走る前";
  if (key === "DURING") return "走行中";
  if (key === "IMMEDIATELY_AFTER") return "走った直後";
  if (key === "AFTER") return "走ったあと";
  if (key === "LATER") return "走ったあと";
  return "記録時点未設定";
}

function candidateRegionValue(candidate = {}) {
  return finite(candidate?.row?.value) ? number(candidate.row.value) : "—";
}

function candidateRegionLabel(candidate = {}) {
  return candidate?.row?.regionName || candidate?.row?.regionId || "この部位";
}

function compactThreadTitle(thread = {}) {
  if (thread.title) return thread.title;
  const episode = thread.newEpisodes?.[0] || thread.sourceEpisode || null;
  const region = episode?.row?.regionName || "";
  if (["REGION_OBSERVATION_PAIR", "REGION_WATCH"].includes(thread.type) && region) return `${region}を続けて確認`;
  if (thread.type === "SAME_COURSE_ROF_POST") return `${thread.subject?.courseName || "同じコース"}の疲労感を続けて確認`;
  return thread.title || "次回見ること";
}

function renderBodyObservationCandidate(candidate = {}) {
  if (candidate?.kind !== "BODY_OBSERVATION_PAIR") return "";
  const observation = candidate.observation || {};
  const row = candidate.row || {};
  const regionLabel = candidateRegionLabel(candidate);
  return `<div class="self-understanding-candidate self-understanding-candidate--compact" data-su-candidate="body-region-pair">
    <strong class="self-understanding-next-title">${escapeHtml(regionLabel)}</strong>
    <div class="self-understanding-pair-line" aria-label="今回見比べられる2つの情報">
      <span><small>本人の記録</small><b>${escapeHtml(observation.label || regionLabel)}・${escapeHtml(sensationLabel(observation.sensationType))}</b></span>
      <i aria-hidden="true">↔</i>
      <span><small>部位表示</small><b>${escapeHtml(candidateRegionValue(candidate))}</b></span>
    </div>
    <button type="button" class="self-understanding-primary" data-action="create-self-understanding-thread" data-thread-type="REGION_OBSERVATION_PAIR" data-region-id="${escapeHtml(row.regionId || candidate.subject?.regionId || "")}" data-body-area-id="${escapeHtml(candidate.subject?.bodyAreaId || observation.areaId || "")}">次回も確認する</button>
    <details class="self-understanding-boundary"><summary>この比較の見方</summary><p>本人の感覚と部位表示は別の情報です。原因関係や一致度は判定しません。</p></details>
  </div>`;
}

function threadStateLabel(thread = {}) {
  if (thread.userState === "PAUSED") return "一時停止中";
  if (thread.userState === "CLOSED") return "終了";
  return thread.hasNewEligibleData ? "新しい記録" : "確認中";
}

function renderActiveThread(thread = {}, output = {}) {
  const currentEpisode = (thread.newEpisodes || []).find((episode) => episode.recordId === output?.target?.recordId) || thread.newEpisodes?.[0] || null;
  const episodeDetail = currentEpisode?.row && finite(currentEpisode.row.value)
    ? `${currentEpisode.row.regionName || "部位"} ${number(currentEpisode.row.value)}`
    : finite(currentEpisode?.postRofJ)
      ? `走行後 ${number(currentEpisode.postRofJ, 0)}/10`
      : currentEpisode ? formatLocalDate(currentEpisode.date) : "新しい記録";
  return `<div class="self-understanding-thread self-understanding-thread--active self-understanding-thread--compact" data-thread-id="${escapeHtml(thread.id || "")}">
    <div class="self-understanding-next-status"><small>${escapeHtml(threadStateLabel(thread))}</small><strong>${escapeHtml(compactThreadTitle(thread))}</strong></div>
    <div class="self-understanding-new-line"><span>今回</span><strong>${escapeHtml(episodeDetail)}</strong><em>比較 ${escapeHtml(String(thread.eligibleCount || 0))}件</em></div>
    <button type="button" class="self-understanding-primary" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(thread.id || "")}" data-thread-decision="KEEP_WATCHING">今回を追加</button>
    <details class="self-understanding-thread-manage"><summary>管理</summary><div><button type="button" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(thread.id || "")}" data-thread-decision="PAUSE">一時停止</button><button type="button" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(thread.id || "")}" data-thread-decision="CLOSE">終了</button></div></details>
  </div>`;
}

function selectedRegionWatchAction(output = {}, selfUnderstanding = {}) {
  const region = output?.selectedRegion || null;
  if (!region?.regionId) return "";
  const existing = (selfUnderstanding?.threads || []).some((thread) => thread.userState !== "CLOSED" && ["REGION_WATCH", "REGION_OBSERVATION_PAIR"].includes(thread.type) && thread.subject?.regionId === region.regionId);
  if (existing) return `<div class="self-understanding-inline-state"><strong>${escapeHtml(region.label)}は確認中です</strong></div>`;
  return `<div class="self-understanding-simple-choice"><strong>${escapeHtml(region.label)}</strong><button type="button" class="self-understanding-primary" data-action="create-self-understanding-thread" data-thread-type="REGION_WATCH" data-region-id="${escapeHtml(region.regionId)}">次回も確認する</button></div>`;
}

function sameCourseRofAction(output = {}, selfUnderstanding = {}) {
  const context = selfUnderstanding?.targetContext || {};
  const course = context.course || {};
  if (!course.id || !finite(context.postRofJ)) return "";
  const existing = (selfUnderstanding?.threads || []).some((thread) => thread.userState !== "CLOSED" && thread.type === "SAME_COURSE_ROF_POST" && thread.subject?.courseId === course.id);
  if (existing) return "";
  return `<div class="self-understanding-simple-choice"><strong>${escapeHtml(course.name || "同じコース")}の疲労感</strong><button type="button" class="self-understanding-secondary" data-action="create-self-understanding-thread" data-thread-type="SAME_COURSE_ROF_POST">次回も確認する</button></div>`;
}

function renderThreadArchiveLink(selfUnderstanding = {}) {
  const watching = Number(selfUnderstanding?.counts?.watching || 0);
  const paused = Number(selfUnderstanding?.counts?.paused || 0);
  if (!watching && !paused) return "";
  return `<a class="self-understanding-archive-link self-understanding-archive-link--compact" href="#/history?view=checks"><span>${interpretationIcon("history")}</span><strong>確認中</strong><b>${watching + paused}</b><i aria-hidden="true">›</i></a>`;
}

function renderNextRail(output, { mobileLayout = false, selfUnderstanding = null } = {}) {
  const next = output?.next || {};
  const actions = [next.primaryAction, ...(next.otherActions || [])].filter((action) => action && action.enabled !== false);
  const active = selfUnderstanding?.activeThread || null;
  const candidate = selfUnderstanding?.primaryCandidate || null;
  const selected = Boolean(output?.selectedRegion);
  const course = !active && !candidate && !selected ? sameCourseRofAction(output, selfUnderstanding) : "";
  const hasRegions = Array.isArray(output?.overview?.attention?.groups) && output.overview.attention.groups.some((group) => Array.isArray(group?.regions) && group.regions.length);
  const content = active
    ? renderActiveThread(active, output)
    : candidate
      ? renderBodyObservationCandidate(candidate)
      : selected
        ? selectedRegionWatchAction(output, selfUnderstanding)
        : course || `<div class="self-understanding-zero self-understanding-zero--compact"><strong>未設定</strong>${hasRegions ? `<a class="self-understanding-jump" href="#interpretation-attention-title">部位から選ぶ</a>` : ""}</div>`;
  return `<aside class="interpretation-room-next-rail self-understanding-rail self-understanding-rail--compact" aria-labelledby="interpretation-next-title">
    <div class="interpretation-room-next-rail__head interpretation-room-next-rail__head--compact"><span>${interpretationIcon("flag")}</span><h2 id="interpretation-next-title">次回見ること</h2></div>
    ${content}
    ${active && Number(selfUnderstanding?.counts?.newThreadCount || 0) > 1 ? `<a class="self-understanding-more-new" href="#/history?view=checks"><strong>ほかに新しい記録 ${escapeHtml(String(Number(selfUnderstanding.counts.newThreadCount) - 1))}件</strong></a>` : ""}
    ${renderThreadArchiveLink(selfUnderstanding)}
    <details class="self-understanding-other-actions"><summary>ほかの操作</summary><div>${actions.map((action) => renderAction(action, output)).join("")}</div></details>
  </aside>`;
}


function desktopRegionRows(output = {}) {
  const groups = Array.isArray(output?.overview?.attention?.groups) ? output.overview.attention.groups : [];
  const rows = [];
  const seen = new Set();
  groups.forEach((group) => {
    (Array.isArray(group?.regions) ? group.regions : []).forEach((region) => {
      if (!region?.regionId || seen.has(region.regionId)) return;
      seen.add(region.regionId);
      rows.push({ ...region, groupCode: group.code });
    });
  });
  return rows;
}

function desktopRegionGroupLabel(code = "") {
  if (code === "PREVIOUS_CHANGE") return "前回差";
  if (code === "REPEATED_DIRECTION") return "継続";
  if (code === "REFERENCE_POSITION") return "基準差";
  if (code === "REFERENCE_NEAR") return "基準付近";
  return "部位";
}

function renderDesktopRegionNavigator(output = {}) {
  const rows = desktopRegionRows(output);
  const selectedId = String(output?.selectedRegion?.regionId || "");
  if (!rows.length) return `<section class="interpretation-pc-regions"><header><h2>12部位</h2><span>表示なし</span></header></section>`;
  const groups = [];
  for (const row of rows) {
    let group = groups.find((item) => item.code === row.groupCode);
    if (!group) { group = { code: row.groupCode, rows: [] }; groups.push(group); }
    group.rows.push(row);
  }
  return `<section class="interpretation-pc-regions" aria-label="部位を選ぶ">
    <header><div><small>12 REGIONS</small><h2>部位を選ぶ</h2></div><span>${rows.length}部位</span></header>
    <div class="interpretation-pc-region-groups">${groups.map((group) => `<div class="interpretation-pc-region-group"><div class="interpretation-pc-region-group__label"><strong>${escapeHtml(desktopRegionGroupLabel(group.code))}</strong><span>${group.rows.length}</span></div>${group.rows.map((region) => `<a class="interpretation-pc-region-row${selectedId === region.regionId ? " is-selected" : ""}" href="${escapeHtml(regionHref(output, region.regionId))}" data-direction="${escapeHtml(directionKey(region.referenceDirection))}"><span class="interpretation-pc-region-state">${interpretationIcon(directionIconName(region.referenceDirection))}</span><span class="interpretation-pc-region-name"><strong>${escapeHtml(region.label)}</strong><small>${escapeHtml(reasonRegionMeta(region))}</small></span><b>${escapeHtml(number(region.value))}</b></a>`).join("")}</div>`).join("")}</div>
  </section>`;
}

function renderDesktopObservationComparison(selfUnderstanding = null, selectedRegionId = "") {
  const candidate = selfUnderstanding?.primaryCandidate || null;
  if (!candidate || candidate.kind !== "BODY_OBSERVATION_PAIR" || String(candidate.subject?.regionId || "") !== String(selectedRegionId || "")) return "";
  const observation = candidate.observation || {};
  return `<section class="interpretation-pc-observation" aria-label="本人の記録と部位表示">
    <div><small>本人の記録</small><strong>${escapeHtml(observation.label || candidateRegionLabel(candidate))}</strong><span>${escapeHtml(sensationLabel(observation.sensationType))}${finite(observation.intensity) ? ` ${escapeHtml(String(observation.intensity))}/5` : ""}${observation.noticedTiming ? `・${escapeHtml(timingLabel(observation.noticedTiming))}` : ""}</span></div>
    <i aria-hidden="true">↔</i>
    <div><small>部位表示</small><strong>${escapeHtml(candidateRegionLabel(candidate))}</strong><span>${escapeHtml(candidateRegionValue(candidate))}</span></div>
  </section>`;
}

function renderDesktopFocus(output = {}, selfUnderstanding = null) {
  const region = output?.selectedRegion || null;
  if (!region) return `<section class="interpretation-pc-focus"><div class="interpretation-pc-empty"><strong>部位を選んで確認</strong></div></section>`;
  const reference = region.referenceComparison || {};
  const previous = region.previousComparison || {};
  const current = finite(region.value) ? number(region.value) : "—";
  const delta = previous.available && finite(previous.difference) ? signed(previous.difference) : "—";
  const historyCount = Number(region?.personalHistory?.comparableCount || 0);
  const rows = Array.isArray(output?.conditions?.differences) ? output.conditions.differences : [];
  const subjective = output?.subjectiveContext || {};
  const pre = subjective?.pre || {}, post = subjective?.post || {};
  return `<section class="interpretation-pc-focus" aria-labelledby="interpretation-pc-focus-title">
    <header class="interpretation-pc-focus-head">
      <div><small>SELECTED REGION</small><h1 id="interpretation-pc-focus-title">${escapeHtml(region.label)}</h1></div>
      <div class="interpretation-pc-focus-values"><span><small>今回</small><strong>${escapeHtml(current)}</strong></span><span><small>前回差</small><strong>${escapeHtml(delta)}</strong></span><span><small>比較</small><strong>${escapeHtml(String(historyCount))}<em>件</em></strong></span></div>
    </header>
    <div class="interpretation-pc-reference-line"><span data-direction="${escapeHtml(directionKey(reference.direction))}">${interpretationIcon(directionIconName(reference.direction))}</span><strong>${escapeHtml(referenceText(reference.direction))}</strong></div>
    ${renderDesktopObservationComparison(selfUnderstanding, region.regionId)}
    <div class="interpretation-pc-trend"><div class="interpretation-pc-subhead"><strong>推移</strong><span>${historyCount ? `${historyCount}件` : "今回から"}</span></div>${historyCount ? historyChart(region, output?.target?.date || "") : `<div class="interpretation-pc-trend-empty">今回を比較点として保存</div>`}</div>
    <div class="interpretation-pc-context-strip">
      <div><small>条件差</small><strong>${rows.length}</strong><span>項目</span></div>
      <div><small>疲労感</small><strong>${escapeHtml(pre.available ? number(pre.value,0) : "—")}<i>→</i>${escapeHtml(post.available ? number(post.value,0) : "—")}</strong><span>/10</span></div>
      ${rows.slice(0, 3).map((item) => `<div class="is-context"><small>${escapeHtml(conditionLabel(item.id))}</small><strong>${escapeHtml(conditionDeltaText(item))}</strong></div>`).join("")}
    </div>
  </section>`;
}

function desktopNextChecklist(output = {}, selfUnderstanding = null) {
  const activeRaw = selfUnderstanding?.activeThread || null;
  const candidateRaw = selfUnderstanding?.primaryCandidate || null;
  const region = output?.selectedRegion || null;
  const active = activeRaw && (!["REGION_WATCH", "REGION_OBSERVATION_PAIR"].includes(activeRaw.type) || !region?.regionId || activeRaw.subject?.regionId === region.regionId) ? activeRaw : null;
  const candidate = candidateRaw && (!region?.regionId || candidateRaw.subject?.regionId === region.regionId) ? candidateRaw : null;
  if (active) {
    if (active.type === "REGION_OBSERVATION_PAIR") return [`身体記録：${active.title || region?.label || "同じ部位"}`, "部位表示：自動"];
    if (active.type === "SAME_COURSE_ROF_POST") return [`コース：${active.subject?.courseName || "同じコース"}`, "走行後の疲労感"];
    if (active.type === "REGION_WATCH") return [`部位：${region?.label || active.title || "選択部位"}`, "部位表示：自動"];
  }
  if (candidate?.kind === "BODY_OBSERVATION_PAIR") return [`身体記録：${candidate.observation?.label || candidateRegionLabel(candidate)}`, "部位表示：自動"];
  if (region) return [`部位：${region.label}`, "部位表示：自動"];
  return [];
}

function renderDesktopAlternativeChecks(output = {}, selfUnderstanding = null, active = null) {
  if (active) return "";
  const options = [];
  const context = selfUnderstanding?.targetContext || {};
  const course = context.course || {};
  const sameCourseExists = (selfUnderstanding?.threads || []).some((thread) => thread.userState !== "CLOSED" && thread.type === "SAME_COURSE_ROF_POST" && thread.subject?.courseId === course.id);
  if (course.id && finite(context.postRofJ) && !sameCourseExists) {
    options.push(`<button type="button" data-action="create-self-understanding-thread" data-thread-type="SAME_COURSE_ROF_POST"><span>同じコース</span><strong>疲労感を見る</strong></button>`);
  }
  if (!options.length) return "";
  return `<details class="interpretation-pc-next-alternatives"><summary>別の確認</summary><div>${options.join("")}</div></details>`;
}

function renderDesktopDecision(output = {}, selfUnderstanding = null) {
  const activeRaw = selfUnderstanding?.activeThread || null;
  const candidateRaw = selfUnderstanding?.primaryCandidate || null;
  const region = output?.selectedRegion || null;
  const active = activeRaw && (!["REGION_WATCH", "REGION_OBSERVATION_PAIR"].includes(activeRaw.type) || !region?.regionId || activeRaw.subject?.regionId === region.regionId) ? activeRaw : null;
  const candidate = candidateRaw && (!region?.regionId || candidateRaw.subject?.regionId === region.regionId) ? candidateRaw : null;
  const next = output?.next || {};
  const actions = [next.primaryAction, ...(next.otherActions || [])].filter((action) => action && action.enabled !== false);
  let main = "";
  if (active) {
    const currentEpisode = (active.newEpisodes || []).find((episode) => episode.recordId === output?.target?.recordId) || active.newEpisodes?.[0] || null;
    const episodeDetail = currentEpisode?.row && finite(currentEpisode.row.value)
      ? `${currentEpisode.row.regionName || "部位"} ${number(currentEpisode.row.value)}`
      : finite(currentEpisode?.postRofJ) ? `走行後 ${number(currentEpisode.postRofJ, 0)}/10` : "今回の記録";
    main = `<div class="interpretation-pc-next-main"><small>${escapeHtml(threadStateLabel(active))}</small><h2>${escapeHtml(compactThreadTitle(active))}</h2><div class="interpretation-pc-next-current"><span>今回</span><strong>${escapeHtml(episodeDetail)}</strong></div><button type="button" class="self-understanding-primary" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(active.id || "")}" data-thread-decision="KEEP_WATCHING">今回を追加</button></div>`;
  } else if (candidate?.kind === "BODY_OBSERVATION_PAIR") {
    main = `<div class="interpretation-pc-next-main"><small>今回から</small><h2>${escapeHtml(candidateRegionLabel(candidate))}</h2><button type="button" class="self-understanding-primary" data-action="create-self-understanding-thread" data-thread-type="REGION_OBSERVATION_PAIR" data-region-id="${escapeHtml(candidate.subject?.regionId || "")}" data-body-area-id="${escapeHtml(candidate.subject?.bodyAreaId || candidate.observation?.areaId || "")}">次回も同じ部位を記録</button></div>`;
  } else if (region) {
    const existing = (selfUnderstanding?.threads || []).some((thread) => thread.userState !== "CLOSED" && ["REGION_WATCH", "REGION_OBSERVATION_PAIR"].includes(thread.type) && thread.subject?.regionId === region.regionId);
    main = existing
      ? `<div class="interpretation-pc-next-main"><small>確認中</small><h2>${escapeHtml(region.label)}</h2><a class="interpretation-pc-inline-link" href="#/history?view=checks">確認中の記録を見る</a></div>`
      : `<div class="interpretation-pc-next-main"><small>次回へ</small><h2>${escapeHtml(region.label)}</h2><button type="button" class="self-understanding-primary" data-action="create-self-understanding-thread" data-thread-type="REGION_WATCH" data-region-id="${escapeHtml(region.regionId)}">この部位を次回も見る</button></div>`;
  } else {
    main = `<div class="interpretation-pc-next-main"><small>次回へ</small><h2>未設定</h2></div>`;
  }
  const checklist = desktopNextChecklist(output, selfUnderstanding);
  return `<aside class="interpretation-pc-next" aria-label="次回の確認">
    <header><span>${interpretationIcon("flag")}</span><strong>次回見ること</strong></header>
    ${main}
    ${checklist.length ? `<div class="interpretation-pc-next-checklist">${checklist.map((item) => `<span>${interpretationIcon("record")}<b>${escapeHtml(item)}</b></span>`).join("")}</div>` : ""}
    ${renderDesktopAlternativeChecks(output, selfUnderstanding, active)}
    <nav class="interpretation-pc-next-links" aria-label="次の操作">
      <a href="#/history?view=checks"><span>${interpretationIcon("history")}</span><strong>確認中</strong><b>${escapeHtml(String(Number(selfUnderstanding?.counts?.watching || 0) + Number(selfUnderstanding?.counts?.paused || 0)))}</b></a>
      ${actions.filter((action) => ["plan","share","simulation"].includes(action.actionId)).slice(0,3).map((action) => { const copy = actionCopy(action); return `<a href="${escapeHtml(actionHref(action, output))}"><span>${interpretationIcon(copy.icon)}</span><strong>${escapeHtml(copy.title.replace("次の記録条件を整理する","次の予定").replace("共有用に整理する","共有").replace("条件を変えて比較する","条件を試す"))}</strong></a>`; }).join("")}
    </nav>
    ${active ? `<details class="interpretation-pc-next-manage"><summary>管理</summary><div><button type="button" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(active.id || "")}" data-thread-decision="PAUSE">一時停止</button><button type="button" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(active.id || "")}" data-thread-decision="CLOSE">終了</button></div></details>` : ""}
  </aside>`;
}

function renderDesktopInterpretationWorkspace(output = {}, selfUnderstanding = null) {
  const date = output?.target?.date ? formatLocalDate(output.target.date) : "今回";
  const counts = output?.overview?.attention?.counts || {};
  const subjective = output?.subjectiveContext || {};
  const pair = Boolean(subjective?.difference?.eligible);
  return `<div class="interpretation-room interpretation-room--pc-studio" data-interpretation-room-state="desktop-studio">
    <header class="interpretation-pc-toolbar">
      <div><small>${escapeHtml(date)}</small><h1>今回から次回へ</h1></div>
      <div class="interpretation-pc-toolbar-facts" aria-label="今回の要点"><span><small>前回差</small><strong>${escapeHtml(String(Number(counts.previousChanged || 0)))}</strong><em>部位</em></span><span><small>条件差</small><strong>${escapeHtml(String(Number(counts.conditionDifferences || 0)))}</strong><em>項目</em></span>${pair ? `<span><small>疲労感</small><strong>${escapeHtml(number(subjective.pre.value,0))}→${escapeHtml(number(subjective.post.value,0))}</strong><em>/10</em></span>` : ""}</div>
    </header>
    <div class="interpretation-pc-studio-grid">
      ${renderDesktopRegionNavigator(output)}
      ${renderDesktopFocus(output, selfUnderstanding)}
      ${renderDesktopDecision(output, selfUnderstanding)}
    </div>
    <footer class="interpretation-pc-footer"><details><summary>条件・計算・根拠</summary><div class="interpretation-pc-footer-grid">${renderContextBoard(output)}<div class="interpretation-room-selected-advanced-stack">${renderAdvanced(output, output?.selectedRegion)}</div></div></details></footer>
  </div>`;
}


function firstInterpretationRegion(output = {}) {
  if (output?.selectedRegion?.regionId) return output.selectedRegion;
  const groups = Array.isArray(output?.overview?.attention?.groups) ? output.overview.attention.groups : [];
  const order = ["PREVIOUS_CHANGE", "REPEATED_DIRECTION", "REFERENCE_POSITION", "REFERENCE_NEAR"];
  for (const code of order) {
    const group = groups.find((item) => item?.code === code);
    if (group?.regions?.[0]) return group.regions[0];
  }
  return groups.find((group) => Array.isArray(group?.regions) && group.regions.length)?.regions?.[0] || null;
}

function proposalHref(output = {}, proposal = {}) {
  const query = new URLSearchParams();
  if (output?.target?.recordId) query.set("recordId", output.target.recordId);
  if (output?.target?.origin) query.set("origin", output.target.origin);
  if (proposal.regionId) query.set("regionId", proposal.regionId);
  else if (output?.target?.selectedRegionId) query.set("regionId", output.target.selectedRegionId);
  if (proposal.id) query.set("focus", proposal.id);
  return `#/interpretation-room?${query.toString()}`;
}

function activeEpisodeDetail(thread = {}, output = {}) {
  const episode = (thread.newEpisodes || []).find((item) => item.recordId === output?.target?.recordId) || thread.newEpisodes?.[0] || null;
  if (episode?.row && finite(episode.row.value)) return `${episode.row.regionName || "部位"} ${number(episode.row.value)}`;
  if (finite(episode?.postRofJ)) return `走行後 ${number(episode.postRofJ, 0)}/10`;
  return episode ? formatLocalDate(episode.date) : "今回の記録";
}

function proposalNextLabel(type = "", proposal = {}) {
  if (type === "REGION_OBSERVATION_PAIR") return `${proposal.observationLabel || proposal.regionLabel || "同じ部位"}を次回も記録`;
  if (type === "REGION_WATCH") return `${proposal.regionLabel || "同じ部位"}を次回も確認`;
  if (type === "SAME_COURSE_ROF_POST") return `${proposal.courseName || "同じコース"}で走行後の疲労感を記録`;
  return "次回も確認";
}

function proposalRegionDirection(region = {}) {
  if (region.referenceDirection) return region.referenceDirection;
  if (!finite(region.value)) return "UNAVAILABLE";
  const value = Number(region.value);
  return value > 101 ? "ABOVE_REFERENCE" : value < 99 ? "BELOW_REFERENCE" : "REFERENCE_VICINITY";
}

function buildInterpretationProposals(output = {}, selfUnderstanding = null) {
  const proposals = [];
  const active = selfUnderstanding?.activeThread || null;
  if (active) {
    const regionLabel = active.newEpisodes?.[0]?.row?.regionName || active.sourceEpisode?.row?.regionName || "";
    const base = { regionLabel, courseName: active.subject?.courseName || "" };
    proposals.push(Object.freeze({
      id: `active-${active.id}`,
      findingCode: "FOLLOW_UP",
      label: `前回から見ている「${compactThreadTitle(active)}」に今回の記録が加わりました`,
      evidence: Object.freeze([{ label: "今回", value: activeEpisodeDetail(active, output) }]),
      threadId: active.id,
      threadType: active.type,
      regionId: active.subject?.regionId || "",
      bodyAreaId: active.subject?.bodyAreaId || "",
      canContinue: true,
      active: true,
      nextLabel: active.title || proposalNextLabel(active.type, base),
    }));
  }

  const candidate = selfUnderstanding?.primaryCandidate || null;
  if (candidate?.kind === "BODY_OBSERVATION_PAIR") {
    const regionLabel = candidateRegionLabel(candidate);
    const observationLabel = candidate.observation?.label || regionLabel;
    proposals.push(Object.freeze({
      id: "body-region",
      findingCode: "BODY_REGION_PAIR",
      label: `${regionLabel}には、身体の記録と部位表示の両方があります`,
      evidence: Object.freeze([
        { label: "身体の記録", value: `${observationLabel}・${sensationLabel(candidate.observation?.sensationType)}` },
        { label: "部位表示", value: candidateRegionValue(candidate) },
      ]),
      threadType: "REGION_OBSERVATION_PAIR",
      regionId: candidate.subject?.regionId || "",
      bodyAreaId: candidate.subject?.bodyAreaId || candidate.observation?.areaId || "",
      canContinue: true,
      nextLabel: proposalNextLabel("REGION_OBSERVATION_PAIR", { regionLabel, observationLabel }),
    }));
  }

  const region = firstInterpretationRegion(output);
  if (region?.regionId && !proposals.some((item) => item.regionId === region.regionId && item.threadType === "REGION_OBSERVATION_PAIR")) {
    const previous = region.previousComparison || {};
    const repeatedCount = Number(region.pastMatchingDirectionCount || 0);
    const evidence = [{ label: "部位表示", value: `${number(region.value)}・${referenceText(proposalRegionDirection(region))}` }];
    if (previous.available && finite(previous.difference)) evidence.push({ label: "前回差", value: signed(previous.difference) });
    else if (repeatedCount) evidence.push({ label: "過去", value: `同じ側 ${repeatedCount}回` });
    const regionDirection = proposalRegionDirection(region);
    const regionFinding = previous.available && finite(previous.difference)
      ? `${region.label}の部位表示は前回から${signed(previous.difference)}変わりました`
      : repeatedCount
        ? `${region.label}は、過去にも今回と同じ基準側でした`
        : `${region.label}は今回${referenceText(regionDirection)}です`;
    proposals.push(Object.freeze({
      id: `region-${region.regionId}`,
      findingCode: "REGION_COMPARE",
      label: regionFinding,
      evidence: Object.freeze(evidence),
      threadType: "REGION_WATCH",
      regionId: region.regionId,
      canContinue: true,
      nextLabel: proposalNextLabel("REGION_WATCH", { regionLabel: region.label }),
    }));
  }

  const course = selfUnderstanding?.targetContext?.course || {};
  const postRofJ = selfUnderstanding?.targetContext?.postRofJ;
  const sameCourseExists = (selfUnderstanding?.threads || []).some((thread) => thread.userState !== "CLOSED" && thread.type === "SAME_COURSE_ROF_POST" && thread.subject?.courseId === course.id);
  if (course.id && finite(postRofJ) && !sameCourseExists) {
    proposals.push(Object.freeze({
      id: "course-rof",
      findingCode: "COURSE_ROF",
      label: `${course.name || "今回のコース"}で、走行後の疲労感は${number(postRofJ, 0)}/10でした`,
      evidence: Object.freeze([{ label: "走行後", value: `${number(postRofJ, 0)}/10` }]),
      threadType: "SAME_COURSE_ROF_POST",
      courseName: course.name || "同じコース",
      canContinue: true,
      nextLabel: proposalNextLabel("SAME_COURSE_ROF_POST", { courseName: course.name || "同じコース" }),
    }));
  }

  const counts = output?.overview?.attention?.counts || {};
  const conditionCount = Number(counts.conditionDifferences || 0);
  const changed = Number(counts.previousChanged || 0);
  const overviewEvidence = [];
  if (changed) overviewEvidence.push({ label: "前回差", value: `${changed}部位` });
  if (conditionCount) overviewEvidence.push({ label: "条件差", value: `${conditionCount}項目` });
  const subjective = output?.subjectiveContext || {};
  if (subjective?.post?.available) overviewEvidence.push({ label: "走行後の疲労感", value: `${number(subjective.post.value, 0)}/10` });
  proposals.push(Object.freeze({
    id: "overview",
    findingCode: "OVERVIEW",
    label: overviewEvidence.length ? "今回には、前回との差や条件差を確認できる材料があります" : "今回の記録を次回比較の基準として残せます",
    evidence: Object.freeze(overviewEvidence.slice(0, 3)),
    canContinue: false,
    nextLabel: "",
  }));

  const seen = new Set();
  return proposals.filter((proposal) => {
    const key = `${proposal.findingCode}:${proposal.regionId || ""}:${proposal.threadId || ""}:${proposal.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectedInterpretationProposal(proposals = [], focus = "") {
  const requested = String(focus || "");
  return proposals.find((proposal) => proposal.id === requested) || proposals[0] || null;
}

function renderProposalEvidence(proposal = {}) {
  const rows = Array.isArray(proposal.evidence) ? proposal.evidence : [];
  if (!rows.length) return "";
  return `<div class="interpretation-loop-evidence">${rows.map((row) => `<span><small>${escapeHtml(row.label)}</small><strong>${escapeHtml(row.value)}</strong></span>`).join("")}</div>`;
}

function renderMaterialRows(output = {}, selfUnderstanding = null) {
  const rows = [];
  const memo = String(output?.runFacts?.postRunReflection || "").trim();
  if (memo) rows.push({ icon: "record", label: "走行体験", value: memo });
  const candidate = selfUnderstanding?.primaryCandidate || null;
  if (candidate?.kind === "BODY_OBSERVATION_PAIR") {
    const observation = candidate.observation || {};
    rows.push({ icon: "person", label: "身体の記録", value: `${observation.label || candidateRegionLabel(candidate)}・${sensationLabel(observation.sensationType)}` });
  }
  const conditionCount = Number(output?.overview?.attention?.counts?.conditionDifferences || 0);
  if (conditionCount) rows.push({ icon: "conditions", label: "条件差", value: `${conditionCount}項目` });
  const subjective = output?.subjectiveContext || {};
  if (subjective?.pre?.available || subjective?.post?.available) {
    rows.push({ icon: "person", label: "疲労感", value: `${subjective?.pre?.available ? number(subjective.pre.value,0) : "—"} → ${subjective?.post?.available ? number(subjective.post.value,0) : "—"} /10` });
  }
  const region = firstInterpretationRegion(output);
  if (region?.regionId) rows.push({ icon: "reference", label: region.label, value: number(region.value) });
  return rows.slice(0, 5);
}

function renderInterpretationMaterialPanel(output = {}, selfUnderstanding = null, { compact = false } = {}) {
  const rows = renderMaterialRows(output, selfUnderstanding);
  if (!rows.length) return "";
  const body = `<div class="interpretation-loop-material-list">${rows.map((row) => `<div><span>${interpretationIcon(row.icon)}</span><small>${escapeHtml(row.label)}</small><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div>`;
  if (compact) return `<details class="interpretation-loop-material-mobile"><summary>材料を見る <b>${rows.length}</b></summary>${body}</details>`;
  return `<section class="interpretation-loop-material" aria-labelledby="interpretation-loop-material-title"><header><small>MATERIAL</small><h2 id="interpretation-loop-material-title">今回の材料</h2></header>${body}</section>`;
}

function renderProposalAlternatives(output = {}, proposals = [], selected = null, { mobile = false } = {}) {
  const alternatives = proposals.filter((proposal) => proposal.id !== selected?.id).slice(0, 4);
  if (!alternatives.length) return "";
  const links = alternatives.map((proposal) => `<a href="${escapeHtml(proposalHref(output, proposal))}"><span>${proposal.threadType ? interpretationIcon("flag") : interpretationIcon("interpretation")}</span><strong>${escapeHtml(proposal.label)}</strong></a>`).join("");
  if (mobile) return `<details class="interpretation-loop-alternatives"><summary>別の見方 <b>${alternatives.length}</b></summary><div>${links}</div></details>`;
  return `<nav class="interpretation-loop-alternatives-pc" aria-label="別の見方"><small>別の見方</small>${links}</nav>`;
}


function renderV54ReferenceKnowledge(reference = null, output = {}, { compact = false } = {}) {
  if (!reference) return "";
  const kinds = [...new Set(Array.isArray(reference.sourceKinds) ? reference.sourceKinds.filter(Boolean) : [])];
  const kindLabel = kinds.length ? kinds.slice(0, 3).join("・") : "確認済み資料";
  const sourceLabel = reference.sourceCount ? `${kindLabel} / ${reference.sourceCount}件` : kindLabel;
  return `<aside class="v54-reference${compact ? " v54-reference--compact" : ""}" data-v53-reveal="compare" aria-label="参考情報">
    <div class="v54-reference__icon">${interpretationIcon("book")}</div>
    <div class="v54-reference__copy"><small>参考情報・あなたへの判定ではありません</small><strong>${escapeHtml(reference.title)}</strong><p>${escapeHtml(reference.summary || reference.lead || "")}</p><span>${escapeHtml(reference.matchReason || "今回の記録に関連する一般情報です")}・${escapeHtml(sourceLabel)}</span></div>
    <a href="${escapeHtml(referenceReadingHref(reference, output))}">根拠と全文を見る</a>
  </aside>`;
}

function v54RunContextLine(context = {}, postRofJ = null) {
  const parts = [];
  if (finite(context?.distanceKm)) parts.push(`${number(context.distanceKm, 2)} km`);
  if (finite(context?.durationMinutes)) parts.push(`${number(context.durationMinutes, 1)} 分`);
  if (context?.course?.name) parts.push(context.course.name);
  if (finite(context?.environment?.temperatureC)) parts.push(`気温 ${number(context.environment.temperatureC, 1)} ℃`);
  if (finite(postRofJ)) parts.push(`疲労感 ${number(postRofJ, 0)}/10`);
  return parts.slice(0, 5).join("・");
}

function renderV54ContextFocus(candidate = {}, output = {}) {
  return `<section class="v54-context-focus" aria-label="今回の自分の記録">
    <article class="v53-source-card v53-source-card--user" data-v53-focus-card><header><span class="v53-source-mark">自</span><div><small>${escapeHtml(candidate.focusLabel || "今回の記録")}</small><strong>自分の記録から始めます</strong></div></header><div class="v54-context-focus__value">${escapeHtml(candidate.focusValue || "今回の記録があります")}</div></article>
    ${renderV54ReferenceKnowledge(candidate.reference, output, { compact: false })}
  </section>`;
}

function v53QuestionForCandidate(candidate = {}) {
  if (candidate?.kind !== "BODY_OBSERVATION_PAIR") return "次の走行でも同じ点を確かめる";
  const observation = candidate.observation || {};
  const observationLabel = observation.label || candidateRegionLabel(candidate);
  return `次の走行では、${observationLabel}を自分がどう感じたか確認する`;
}

function v53CandidateMeta(candidate = {}) {
  const observation = candidate?.observation || {};
  const row = candidate?.row || {};
  const observationLabel = observation.label || candidateRegionLabel(candidate);
  return Object.freeze({
    observationLabel,
    sensation: sensationLabel(observation.sensationType),
    timing: timingLabel(observation.noticedTiming),
    intensity: Number.isFinite(Number(observation.intensity)) ? Number(observation.intensity) : null,
    regionLabel: candidateRegionLabel(candidate),
    regionId: String(row.regionId || candidate?.subject?.regionId || ""),
    bodyAreaId: String(candidate?.subject?.bodyAreaId || observation.areaId || ""),
    value: candidateRegionValue(candidate),
    direction: referenceText(proposalRegionDirection(row)),
    question: v53QuestionForCandidate(candidate),
  });
}

function renderV53StageGuide() {
  return `<nav class="v53-stage-guide" aria-label="この画面の流れ"><span data-v53-step="focus"><i>1</i>記録</span><b aria-hidden="true">→</b><span data-v53-step="compare"><i>2</i>見比べる</span><b aria-hidden="true">→</b><span data-v53-step="decision"><i>3</i>次へ</span></nav>`;
}

function renderV53BodyPair(candidate = {}, { active = false } = {}) {
  const meta = v53CandidateMeta(candidate);
  return `<section class="v53-pair" aria-label="今回見比べられる2つの情報">
    <article class="v53-source-card v53-source-card--user" data-v53-focus-card>
      <header><span class="v53-source-mark">自</span><div><small>あなたの身体の記録</small><strong>${escapeHtml(meta.observationLabel)}</strong></div></header>
      <div class="v53-source-value">${escapeHtml(meta.sensation)}</div>
      <p>${escapeHtml(meta.timing)}${meta.intensity != null ? `・強さ ${escapeHtml(String(meta.intensity))} / 5` : ""}</p>
    </article>
    <div class="v53-relation" data-v53-reveal="compare"><span></span><b>同じ部位</b><span></span></div>
    <article class="v53-source-card v53-source-card--model v54-model-secondary" data-v53-reveal="compare">
      <header><span class="v53-source-mark">R</span><div><small>考える材料・RunLoadの部位表示</small><strong>${escapeHtml(meta.regionLabel)}</strong></div></header>
      <div class="v54-model-value"><span>部位内の比較</span><strong>${escapeHtml(meta.value)}</strong></div>
      <p>${escapeHtml(meta.direction)}。この値は身体の感覚そのものではありません。</p>
    </article>
    <div class="v53-boundary" data-v53-reveal="compare"><span aria-hidden="true">i</span><p><strong>2つは別の情報です。</strong> 部位表示が身体の感覚の原因だという意味ではありません。高いほど良い・悪いという意味でもありません。</p></div>
  </section>`;
}

function renderV53FirstRail(candidate = {}) {
  const meta = v53CandidateMeta(candidate);
  return `<aside class="v53-rail" aria-label="今回の操作">
    <section class="v53-rail-step" data-v53-only-stage="focus">
      <small>最初にすること</small><h2>自分の記録から見ます</h2><p>まず今回、自分で記録した内容を選びます。次にRunLoad側の同じ部位の情報を表示します。</p>
      <button type="button" class="v53-primary" data-action="v53-flow-stage" data-next-stage="compare">対応する情報を見る</button>
    </section>
    <section class="v53-rail-step" data-v53-only-stage="compare">
      <small>見比べる</small><h2>自分の体験を中心に見ます</h2><p>部位表示や参考情報は、自分がどう感じたかを考える材料です。一致や原因を決める必要はありません。</p>
      <p class="v53-candidate-reason"><strong>表示理由</strong> 身体の記録と同じ部位に、今回の部位表示があるためです。</p>
      <button type="button" class="v53-primary" data-action="v53-flow-stage" data-next-stage="decision">次にどうするか決める</button>
      <button type="button" class="v53-text-button" data-action="v53-flow-stage" data-next-stage="focus">自分の記録に戻る</button>
    </section>
    <section class="v53-rail-step" data-v53-only-stage="decision">
      <small>自分で選ぶ</small><h2>次に自分で確かめること</h2><div class="v53-question"><span aria-hidden="true">?</span><strong>${escapeHtml(meta.question)}</strong></div>
      <p>RunLoadは答えを決めません。次回は自分の感じ方を中心に、同じ部位の表示や走行条件を補助材料として確認できます。</p>
      <details class="v53-note"><summary>今回のメモを残す（任意）</summary><textarea data-self-understanding-note maxlength="500" rows="2" placeholder="自分の言葉で残したいことだけ"></textarea></details>
      <div class="v53-decision-actions">
        <button type="button" class="v53-primary" data-action="create-self-understanding-thread" data-thread-type="REGION_OBSERVATION_PAIR" data-region-id="${escapeHtml(meta.regionId)}" data-body-area-id="${escapeHtml(meta.bodyAreaId)}" data-next-label="${escapeHtml(meta.question)}">この問いを次も確かめる</button>
        <button type="button" class="v53-secondary" data-action="v53-finish-this-time" data-v53-done-kind="this-time">今回はここまで</button>
        <button type="button" class="v53-text-button" data-action="v53-finish-this-time" data-v53-done-kind="undecided">まだ決めない</button>
      </div>
      <button type="button" class="v53-text-button" data-action="v53-flow-stage" data-next-stage="compare">見比べる画面に戻る</button>
    </section>
    <section class="v53-rail-step" data-v53-only-stage="done">
      <div data-v53-completion-only="saved"><small>次回へ</small><h2>確認する問いとして残しました</h2><p class="v53-saved-question">${escapeHtml(meta.question)}</p><p>保存したのは、この問いを次も見るというあなたの選択です。数値の意味や原因を確定したものではありません。</p><button type="button" class="v53-text-button" data-action="v53-undo-created-thread">確認中から外す</button><a class="v53-secondary v53-link-button" href="#/history?view=checks">確認してきたことを見る</a></div>
      <div data-v53-completion-only="this-time"><small>今回</small><h2>今回はここまで</h2><p>新しい問いは保存していません。今回の結果は履歴からいつでも見直せます。</p><a class="v53-secondary v53-link-button" href="#/history">履歴を見る</a></div>
      <div data-v53-completion-only="undecided"><small>今回</small><h2>まだ決めていません</h2><p>確認する問いは追加していません。必要になったときに今回の結果からもう一度見比べられます。</p><a class="v53-secondary v53-link-button" href="#/history">履歴を見る</a></div>
      <div data-v53-completion-only="undone"><small>変更しました</small><h2>確認中から外しました</h2><p>今回の結果そのものは残っています。必要なら履歴から再び確認できます。</p><a class="v53-secondary v53-link-button" href="#/history">履歴を見る</a></div>
    </section>
  </aside>`;
}

function renderV54ContextRail(candidate = {}) {
  return `<aside class="v53-rail" aria-label="今回の操作">
    <section class="v53-rail-step" data-v53-only-stage="focus">
      <small>最初にすること</small><h2>自分の記録から見ます</h2><p>身体の部位記録がなくても、疲労感・走行条件・自分のメモから振り返れます。</p>
      <button type="button" class="v53-primary" data-action="v53-flow-stage" data-next-stage="compare">考える材料を見る</button>
    </section>
    <section class="v53-rail-step" data-v53-only-stage="compare">
      <small>参考情報</small><h2>一般情報は答えではありません</h2><p>今回の記録に関連する一般的な情報を一つだけ示します。あなたの原因・状態・安全性を判定するものではありません。</p>
      <button type="button" class="v53-primary" data-action="v53-flow-stage" data-next-stage="decision">次に自分で確かめることを見る</button>
      <button type="button" class="v53-text-button" data-action="v53-flow-stage" data-next-stage="focus">自分の記録に戻る</button>
    </section>
    <section class="v53-rail-step" data-v53-only-stage="decision">
      <small>自分で選ぶ</small><h2>次に自分で確かめること</h2><div class="v53-question"><span aria-hidden="true">?</span><strong>${escapeHtml(candidate.question)}</strong></div>
      <p>参考情報は問いを考える補助です。次回も確認したい場合だけ、この問いを残します。</p>
      <details class="v53-note"><summary>今回のメモを残す（任意）</summary><textarea data-self-understanding-note maxlength="500" rows="2" placeholder="自分の言葉で残したいことだけ"></textarea></details>
      <div class="v53-decision-actions">
        <button type="button" class="v53-primary" data-action="create-self-understanding-thread" data-thread-type="CONTEXT_QUESTION" data-context-key="${escapeHtml(candidate.focusKey)}" data-context-prompt="${escapeHtml(candidate.question)}" data-article-id="${escapeHtml(candidate.reference?.id || "")}" data-next-label="${escapeHtml(candidate.question)}">この問いを次も確かめる</button>
        <button type="button" class="v53-secondary" data-action="v53-finish-this-time" data-v53-done-kind="this-time">今回はここまで</button>
        <button type="button" class="v53-text-button" data-action="v53-finish-this-time" data-v53-done-kind="undecided">まだ決めない</button>
      </div>
      <button type="button" class="v53-text-button" data-action="v53-flow-stage" data-next-stage="compare">参考情報に戻る</button>
    </section>
    <section class="v53-rail-step" data-v53-only-stage="done">
      <div data-v53-completion-only="saved"><small>次回へ</small><h2>確認する問いとして残しました</h2><p class="v53-saved-question">${escapeHtml(candidate.question)}</p><p>保存したのは、次回も自分で確かめるという選択だけです。一般情報をあなた個人の結論として保存していません。</p><button type="button" class="v53-text-button" data-action="v53-undo-created-thread">確認中から外す</button><a class="v53-secondary v53-link-button" href="#/history?view=checks">確認してきたことを見る</a></div>
      <div data-v53-completion-only="this-time"><small>今回</small><h2>今回はここまで</h2><p>新しい問いは保存していません。今回の記録は履歴から見直せます。</p><a class="v53-secondary v53-link-button" href="#/history">履歴を見る</a></div>
      <div data-v53-completion-only="undecided"><small>今回</small><h2>まだ決めていません</h2><p>確認する問いは追加していません。必要になったときに今回の記録から再び確認できます。</p><a class="v53-secondary v53-link-button" href="#/history">履歴を見る</a></div>
      <div data-v53-completion-only="undone"><small>変更しました</small><h2>確認中から外しました</h2><p>今回の記録そのものは残っています。</p><a class="v53-secondary v53-link-button" href="#/history">履歴を見る</a></div>
    </section>
  </aside>`;
}

function renderV54ContextFirst(output = {}, selfUnderstanding = null, candidate = {}, { mobile = false } = {}) {
  const date = output?.target?.date ? formatLocalDate(output.target.date) : "今回";
  const materials = renderMaterialRows(output, selfUnderstanding);
  return `<div class="interpretation-room v53-room v54-room v54-room--context ${mobile ? "v53-room--mobile" : "v53-room--pc"}" data-interpretation-room-state="v54-context-first" data-v53-stage="focus">
    <header class="v53-head"><div><small>${escapeHtml(date)}</small><h1>今回の自分を見ていく</h1><p>身体の部位記録がなくても、自分が残した疲労感・条件・メモから振り返れます。</p></div>${renderV53StageGuide()}</header>
    <div class="v53-layout"><main class="v53-canvas"><div class="v53-canvas-kicker" data-v53-title-focus><small>今回、まず見るところ</small><h2>${escapeHtml(candidate.focusLabel)}</h2><p>最初は自分で残した記録だけを見ます。</p></div><div class="v53-canvas-kicker" data-v53-title-compare><small>考える材料を追加</small><h2>今回の記録に関係する一般情報</h2><p>自分の記録を理解するための背景として使います。個人への判定には使いません。</p></div>${renderV54ContextFocus(candidate, output)}${materials.length ? `<details class="v53-more-materials v54-secondary-materials" data-v53-reveal="compare"><summary>補足の材料を見る <b>${materials.length}</b></summary>${renderInterpretationMaterialPanel(output, selfUnderstanding)}</details>` : ""}</main>${renderV54ContextRail(candidate)}</div>
    ${renderInterpretationLoopDetails(output, { mobile })}
  </div>`;
}

function renderV53First(output = {}, selfUnderstanding = null, { mobile = false } = {}) {
  const candidate = selfUnderstanding?.primaryCandidate || null;
  if (!candidate || candidate.kind !== "BODY_OBSERVATION_PAIR") {
    const contextCandidate = buildInterpretationContextCandidate(output);
    return contextCandidate ? renderV54ContextFirst(output, selfUnderstanding, contextCandidate, { mobile }) : renderV53Empty(output, selfUnderstanding, { mobile });
  }
  const date = output?.target?.date ? formatLocalDate(output.target.date) : "今回";
  const meta = v53CandidateMeta(candidate);
  const materials = renderMaterialRows(output, selfUnderstanding);
  const reference = selectInterpretationReferenceKnowledge(output, { bodyPair: true });
  return `<div class="interpretation-room v53-room v54-room ${mobile ? "v53-room--mobile" : "v53-room--pc"}" data-interpretation-room-state="v54-first" data-v53-stage="focus">
    <header class="v53-head"><div><small>${escapeHtml(date)}</small><h1>今回の自分を見ていく</h1><p>自分の体験を主役にして、RunLoadの情報と参考情報を必要な順に確認します。</p></div>${renderV53StageGuide()}</header>
    <div class="v53-layout"><main class="v53-canvas"><div class="v53-canvas-kicker" data-v53-title-focus><small>今回、まず見るところ</small><h2>${escapeHtml(meta.observationLabel)}</h2><p>最初は自分で記録した内容だけを見ます。</p></div><div class="v53-canvas-kicker" data-v53-title-compare><small>考える材料を追加</small><h2>${escapeHtml(meta.observationLabel)}について別の情報も確認できます</h2><p>自分の感覚を中心に、別の情報を補助材料として並べます。</p></div>${renderV53BodyPair(candidate)}${renderV54ReferenceKnowledge(reference, output)}${materials.length ? `<details class="v53-more-materials v54-secondary-materials" data-v53-reveal="compare"><summary>補足の材料を見る <b>${materials.length}</b></summary>${renderInterpretationMaterialPanel(output, selfUnderstanding)}</details>` : ""}</main>${renderV53FirstRail(candidate)}</div>
    ${renderInterpretationLoopDetails(output, { mobile })}
  </div>`;
}

function activeEpisodeForTarget(thread = {}, output = {}) {
  return (thread.newEpisodes || []).find((episode) => String(episode.recordId || "") === String(output?.target?.recordId || "")) || thread.newEpisodes?.[0] || null;
}

function renderV53ActiveEpisodeCard(episode = {}, label = "今回") {
  if (!episode) return "";
  const contextLine = v54RunContextLine(episode.runContext || {}, episode.postRofJ);
  if (episode.row && finite(episode.row.value)) {
    const observation = episode.observation || null;
    return `<article class="v53-episode v54-episode"><time>${escapeHtml(episode.date ? formatLocalDate(episode.date) : label)}</time><div>${observation ? `<span class="v54-episode-user"><small>自分の記録</small><strong>${escapeHtml(sensationLabel(observation.sensationType))}${Number.isFinite(Number(observation.intensity)) ? ` ${escapeHtml(String(Number(observation.intensity)))} / 5` : ""}</strong></span>` : ""}<span class="v54-episode-model"><small>補助：部位表示</small><strong>${escapeHtml(number(episode.row.value))}</strong></span></div>${contextLine ? `<p class="v54-episode-context"><small>その日の条件</small>${escapeHtml(contextLine)}</p>` : ""}</article>`;
  }
  if (episode.kind === "CONTEXT_QUESTION") {
    return `<article class="v53-episode v54-episode"><time>${escapeHtml(episode.date ? formatLocalDate(episode.date) : label)}</time><div><span class="v54-episode-user"><small>走行記録</small><strong>${escapeHtml(contextLine || "今回の走行記録があります")}</strong></span></div></article>`;
  }
  if (finite(episode.postRofJ)) return `<article class="v53-episode v54-episode"><time>${escapeHtml(episode.date ? formatLocalDate(episode.date) : label)}</time><div><span class="v54-episode-user"><small>走行後の疲労感</small><strong>${escapeHtml(number(episode.postRofJ, 0))} / 10</strong></span></div>${contextLine ? `<p class="v54-episode-context"><small>その日の条件</small>${escapeHtml(contextLine)}</p>` : ""}</article>`;
  return `<article class="v53-episode v54-episode"><time>${escapeHtml(episode.date ? formatLocalDate(episode.date) : label)}</time><div><span><small>記録</small><strong>今回の記録があります</strong></span></div>${contextLine ? `<p class="v54-episode-context"><small>その日の条件</small>${escapeHtml(contextLine)}</p>` : ""}</article>`;
}

function renderV53ActiveRail(thread = {}) {
  return `<aside class="v53-rail" aria-label="確認中の問いの操作">
    <section class="v53-rail-step" data-v53-only-stage="focus"><small>前回から</small><h2>今回の新しい記録を見ます</h2><p>以前、自分で続けると決めた問いに、今回の比較材料が加わりました。</p><button type="button" class="v53-primary" data-action="v53-flow-stage" data-next-stage="compare">これまでと見比べる</button></section>
    <section class="v53-rail-step" data-v53-only-stage="compare"><small>見比べる</small><h2>結論を決める必要はありません</h2><p>並びは事実として確認します。改善・悪化・原因・安全性は判定しません。</p><button type="button" class="v53-primary" data-action="v53-flow-stage" data-next-stage="decision">この問いをどうするか決める</button><button type="button" class="v53-text-button" data-action="v53-flow-stage" data-next-stage="focus">今回の記録に戻る</button></section>
    <section class="v53-rail-step" data-v53-only-stage="decision"><small>自分で選ぶ</small><h2>この問いを続けますか？</h2><div class="v53-question"><span aria-hidden="true">?</span><strong>${escapeHtml(thread.title || compactThreadTitle(thread))}</strong></div><details class="v53-note"><summary>今回のメモを残す（任意）</summary><textarea data-self-understanding-note maxlength="500" rows="2" placeholder="自分の言葉で残したいことだけ"></textarea></details><div class="v53-decision-actions"><button type="button" class="v53-primary" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(thread.id)}" data-thread-decision="KEEP_WATCHING">このまま続ける</button><button type="button" class="v53-secondary" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(thread.id)}" data-thread-decision="CLOSE">ここで終える</button><button type="button" class="v53-text-button" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(thread.id)}" data-thread-decision="PAUSE">いったん休止する</button></div></section>
    <section class="v53-rail-step" data-v53-only-stage="done"><small>更新しました</small><h2>今回の確認を残しました</h2><p>選んだ状態だけを記録しました。RunLoadが傾向や結論を確定したわけではありません。</p><a class="v53-secondary v53-link-button" href="#/history?view=checks">確認してきたことを見る</a></section>
  </aside>`;
}

function renderV53Active(output = {}, selfUnderstanding = null, { mobile = false } = {}) {
  const thread = selfUnderstanding?.activeThread || null;
  if (!thread) return renderV53First(output, selfUnderstanding, { mobile });
  const date = output?.target?.date ? formatLocalDate(output.target.date) : "今回";
  const current = activeEpisodeForTarget(thread, output);
  const previous = [thread.sourceEpisode, ...(thread.eligibleEpisodes || [])].filter(Boolean).filter((episode) => String(episode.recordId || "") !== String(current?.recordId || ""));
  const isContextQuestion = thread.type === "CONTEXT_QUESTION";
  const reference = isContextQuestion
    ? getInterpretationReferenceKnowledgeById(thread.subject?.articleId || "")
    : selectInterpretationReferenceKnowledge(output, { bodyPair: thread.type === "REGION_OBSERVATION_PAIR" });
  const historyLabel = isContextQuestion ? "これまで確認した走行" : "比較できる記録";
  return `<div class="interpretation-room v53-room v54-room ${mobile ? "v53-room--mobile" : "v53-room--pc"}" data-interpretation-room-state="v54-active" data-v53-stage="focus">
    <header class="v53-head"><div><small>${escapeHtml(date)}</small><h1>前回から見ていたこと</h1><p>${escapeHtml(thread.title || compactThreadTitle(thread))}</p></div>${renderV53StageGuide()}</header>
    <div class="v53-layout"><main class="v53-canvas"><div class="v53-canvas-kicker"><small>今回、新しい材料があります</small><h2>今回の自分の記録から確認します</h2><p>数値だけでなく、その日の距離・時間・疲労感などの文脈も一緒に見ます。</p></div><div class="v53-active-current">${renderV53ActiveEpisodeCard(current, "今回")}</div><section class="v53-previous" data-v53-reveal="compare"><header><small>これまで</small><h3>${escapeHtml(historyLabel)} ${escapeHtml(String(Number(thread.eligibleCount || previous.length + 1)))}件</h3></header><div>${previous.slice(-4).map((episode) => renderV53ActiveEpisodeCard(episode)).join("")}</div><p>記録の並びと背景は一緒に確認しますが、傾向の確定・原因推定・良し悪しの判定は行いません。</p></section>${renderV54ReferenceKnowledge(reference, output, { compact: true })}</main>${renderV53ActiveRail(thread)}</div>
    ${renderInterpretationLoopDetails(output, { mobile })}
  </div>`;
}

function renderV53Empty(output = {}, selfUnderstanding = null, { mobile = false } = {}) {
  const date = output?.target?.date ? formatLocalDate(output.target.date) : "今回";
  const materials = renderMaterialRows(output, selfUnderstanding);
  return `<div class="interpretation-room v53-room v53-room--empty ${mobile ? "v53-room--mobile" : "v53-room--pc"}" data-interpretation-room-state="v53-empty" data-v53-stage="done"><header class="v53-head"><div><small>${escapeHtml(date)}</small><h1>今回を見比べる</h1><p>必要な材料がないときは、無理に意味や問いを作りません。</p></div></header><section class="v53-empty-card"><span aria-hidden="true">—</span><h2>今回は、続けて確かめる問いはまだありません</h2><p>今回の走行結果はそのまま確認できます。身体の記録と対応する情報、または以前から確認中の問いに新しい材料ができたときに、ここで見比べられます。</p><a class="v53-primary v53-link-button" href="#/result?recordId=${encodeURIComponent(output?.target?.recordId || "")}">結果に戻る</a>${materials.length ? `<details class="v53-more-materials"><summary>今回の材料を見る <b>${materials.length}</b></summary>${renderInterpretationMaterialPanel(output, selfUnderstanding)}</details>` : ""}</section></div>`;
}

function renderInterpretationLoopDetails(output = {}, { mobile = false } = {}) {
  const next = output?.next || {};
  const actions = [next.primaryAction, ...(next.otherActions || [])].filter((action) => action && action.enabled !== false);
  const actionLinks = actions.length
    ? `<nav class="interpretation-loop-secondary-actions" aria-label="ほかの操作">${actions.map((action) => { const copy = actionCopy(action); return `<a href="${escapeHtml(actionHref(action, output))}"><span>${interpretationIcon(copy.icon)}</span><strong>${escapeHtml(copy.title)}</strong></a>`; }).join("")}</nav>`
    : "";
  const detail = `${renderPatternBoard(output)}${renderContextBoard(output)}${output?.selectedRegion ? `<div class="interpretation-room-selected-advanced-stack">${renderAdvanced(output, output.selectedRegion)}</div>` : ""}${actionLinks}`;
  return `<details class="v53-technical-more interpretation-loop-more${mobile ? " interpretation-loop-more--mobile" : ""}"><summary>計算・条件・根拠を詳しく見る</summary><div>${detail}</div></details>`;
}

function renderMobileInterpretationLoop(output = {}, selfUnderstanding = null) {
  if (selfUnderstanding?.activeThread) return renderV53Active(output, selfUnderstanding, { mobile: true });
  return renderV53First(output, selfUnderstanding, { mobile: true });
}

function renderDesktopInterpretationLoop(output = {}, selfUnderstanding = null) {
  if (selfUnderstanding?.activeThread) return renderV53Active(output, selfUnderstanding, { mobile: false });
  return renderV53First(output, selfUnderstanding, { mobile: false });
}

function publicConstructText(value = "") {
  return String(value || "")
    .replace(/膝蓋大腿関節stress力積/gi, "膝蓋大腿関節の応力の積み重なりを表す指標")
    .replace(/脛骨stress力積/gi, "脛骨の応力の積み重なりを表す指標")
    .replace(/アキレス腱strain力積/gi, "アキレス腱のひずみの積み重なりを表す指標")
    .replace(/stress力積/gi, "応力の積み重なりを表す指標")
    .replace(/strain力積/gi, "ひずみの積み重なりを表す指標")
    .replace(/Reference[- ]?100/gi, "基準100")
    .replace(/reference[- ]?100/gi, "基準100")
    .replace(/Reference/gi, "基準");
}

function publicSourceRoleText(value = "") {
  return String(value || "")
    .replace(/保存原典Figure 3とTable 3から再現した筋活動経路/gi, "保存原典の図3と表3から再現した筋活動の関係")
    .replace(/Table 3係数と2\.5 m\/s正規化で再現した下腿後面筋活動経路/gi, "表3の係数を使い、2.5 m/sを基準にそろえて再現した下腿後面の筋活動の関係")
    .replace(/Figure\s*([0-9]+)/gi, "図$1")
    .replace(/Table\s*([0-9]+)/gi, "表$1")
    .replace(/cadence/gi, "ピッチ")
    .replace(/速度\/条件応答/g, "速度と走行条件への応答")
    .replace(/速度\/上り応答/g, "速度と上り条件への応答");
}

function renderAdvanced(output, region) {
  if (!region) return "";
  const evidence = output?.advanced?.evidence?.regions?.[region.regionId] || null;
  if (!evidence) return renderCalculationDetails(region);
  const sources = Array.isArray(evidence.sources) ? evidence.sources : [];
  return `${renderCalculationDetails(region)}<details class="interpretation-room-advanced"><summary>計算の考え方と根拠を詳しく見る</summary><div>${evidence.construct ? `<p><strong>この数値が表す内容</strong><br>${escapeHtml(publicConstructText(evidence.construct))}</p>` : ""}${sources.length ? `<p><strong>この計算の背景資料</strong></p><ul>${sources.map((source) => `<li>${escapeHtml(source.label || "参考資料")}${source.role ? ` — ${escapeHtml(publicSourceRoleText(source.role))}` : ""}</li>`).join("")}</ul>` : ""}<p class="interpretation-room-boundary-line">ここでは、選択した部位の計算に関係する情報を確認できます。</p></div></details>`;
}
export function renderInterpretationRoom({ output, selfUnderstanding = null, savedInterpretation = null, interpretationFocus = "", mobileLayout = false } = {}) {
  if (!output?.state?.targetAvailable) {
    return `<div class="interpretation-room interpretation-room--empty" data-interpretation-room-state="empty"><header class="interpretation-room-hero"><p>結果を整理する</p><h1>対象の保存記録がありません</h1></header><a class="interpretation-room-action interpretation-room-action--primary" href="#/record-input"><span class="interpretation-room-action__icon">${interpretationIcon("record")}</span><span class="interpretation-room-action__copy"><strong>記録を始める</strong></span><i aria-hidden="true">›</i></a></div>`;
  }
  if (output?.state?.support && output.state.support !== "NORMAL") return renderSupportPriority(output);
  if (output?.state?.regional === "REST") return renderRest(output);

  if (!mobileLayout) return renderDesktopInterpretationLoop(output, selfUnderstanding, savedInterpretation, interpretationFocus);
  return renderMobileInterpretationLoop(output, selfUnderstanding, savedInterpretation, interpretationFocus);
}

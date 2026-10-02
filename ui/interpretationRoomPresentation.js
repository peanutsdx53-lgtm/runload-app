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
  return `<section class="interpretation-room-region-detail interpretation-room-region-detail--selected" aria-labelledby="interpretation-region-title">
    <div class="interpretation-room-region-detail__summary"><small>この部位の位置と推移</small><h2 id="interpretation-region-title">今回をどう読むか</h2><p>${escapeHtml(selectedRegionInterpretation(region))}</p></div>
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
  const available = Number(counts.available || 0);
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
  const fatigue = pair ? signed(subjective.difference.value, 0) : "—";
  const available = Number(counts.available || 0);
  const repeated = Number(counts.repeated || 0);
  const changed = Number(counts.previousChanged || 0);
  const conditionCount = Number(counts.conditionDifferences || 0);
  return `<section class="interpretation-room-insight" aria-labelledby="interpretation-insight-title">
    <div class="interpretation-room-insight__copy">
      <p class="interpretation-room-insight__date">${escapeHtml(date)}</p>
      <div class="interpretation-room-kicker">今回の整理</div>
      <h1 id="interpretation-insight-title">${escapeHtml(overviewHeadline(output))}</h1>
      <p class="interpretation-room-insight__lead">${escapeHtml(overviewExplanation(output))}</p>
      <div class="interpretation-room-insight__hint"><span>${interpretationIcon("flag")}</span><div><small>次回も比べて見るなら</small><strong>${escapeHtml(comparisonHint(output))}</strong></div></div>
    </div>
    <div class="interpretation-room-insight__signals" aria-label="今回の要点">
      <article><span>${interpretationIcon("repeat")}</span><div><small>過去にも同じ側</small><strong>${repeated}<em>/ ${available || 12}</em></strong><p>過去にも同じ方向が確認された部位</p></div></article>
      <article><span>${interpretationIcon("compare")}</span><div><small>前回との差</small><strong>${changed}<em>部位</em></strong><p>1ポイント以上の差がある部位</p></div></article>
      <article><span>${interpretationIcon(pair ? "person" : "conditions")}</span><div><small>今回の背景</small><strong class="is-text">${pair ? `条件 ${conditionCount}・疲労 ${fatigue}` : `条件 ${conditionCount}項目`}</strong><p>${pair ? "走行条件と本人の感覚を別々に確認" : "前回から変わった走行条件"}</p></div></article>
    </div>
  </section>`;
}

function renderPatternBoard(output) {
  const groups = output?.overview?.attention?.groups || [];
  if (!groups.length) return "";
  return `<section class="interpretation-room-patterns" aria-labelledby="interpretation-attention-title">
    <div class="interpretation-room-section-title interpretation-room-section-title--dense"><div><small>部位のパターン</small><h2 id="interpretation-attention-title">比較して見える部位</h2></div><p>順位ではなく確認理由でまとめます。部位を選ぶと、その部位の基準100・前回差・推移を確認できます。</p></div>
    <div class="interpretation-room-pattern-groups">${groups.map((group) => {
      const copy = REASON_COPY[group.code] || { title: group.code, note: "", icon: "interpretation", tone: "neutral" };
      return `<article class="interpretation-room-pattern-group" data-tone="${escapeHtml(copy.tone)}">
        <header><span>${interpretationIcon(copy.icon)}</span><div><strong>${escapeHtml(copy.title)}</strong><small>${escapeHtml(copy.note)}</small></div><b>${group.regions.length}部位</b></header>
        <div class="interpretation-room-region-chips">${group.regions.map((region) => `<a href="${escapeHtml(regionHref(output, region.regionId))}" data-direction="${escapeHtml(directionKey(region.referenceDirection))}"><span class="region-chip__marker">${interpretationIcon(directionIconName(region.referenceDirection))}</span><span class="region-chip__copy"><strong>${escapeHtml(region.label)}</strong><small>${escapeHtml(reasonRegionMeta(region))}</small></span><b>${escapeHtml(number(region.value))}</b><i aria-hidden="true">›</i></a>`).join("")}</div>
      </article>`;
    }).join("")}</div>
  </section>`;
}

function renderContextBoard(output, selfUnderstanding = null) {
  const rows = Array.isArray(output?.conditions?.differences) ? output.conditions.differences : [];
  const context = output?.subjectiveContext || {};
  const pre = context.pre || {}, post = context.post || {};
  const pair = Boolean(context?.difference?.eligible);
  if (!rows.length && context.state === "NONE") return "";
  const contextLead = rows.length && context.state !== "NONE"
    ? "次回の比較で部位の変化と読み分けるため、変わった条件と本人の感覚を分けて残します。"
    : rows.length
      ? "次回の比較で部位の変化と読み分けるため、前回から変わった条件を残します。"
      : "次回の比較で部位数値と読み分けるため、本人が記録した感覚を別に残します。";
  return `<section class="interpretation-room-context" aria-labelledby="interpretation-context-title">
    <div class="interpretation-room-section-title interpretation-room-section-title--dense"><div><small>今回の背景</small><h2 id="interpretation-context-title">比較の背景</h2></div><p>${escapeHtml(contextLead)}</p></div>
    <div class="interpretation-room-context-grid">
      ${rows.length ? `<article class="interpretation-room-context-card interpretation-room-context-card--conditions"><header><span>${interpretationIcon("conditions")}</span><div><strong>前回から変わった条件</strong><small>${rows.length}項目</small></div></header><div class="interpretation-room-context-rows">${rows.map((item) => `<div><span><small>${escapeHtml(conditionLabel(item.id))}</small><strong>${escapeHtml(conditionDeltaText(item))}</strong></span><span class="context-values">${escapeHtml(conditionValue(item.id, item.previous))}<i>→</i>${escapeHtml(conditionValue(item.id, item.current))}</span></div>`).join("")}</div></article>` : ""}
      ${context.state !== "NONE" ? `<article class="interpretation-room-context-card interpretation-room-context-card--subjective"><header><span>${interpretationIcon("person")}</span><div><strong>本人の感覚</strong><small>疲労感</small></div></header><div class="interpretation-room-context-fatigue"><span><small>走る前</small><strong>${escapeHtml(pre.available ? number(pre.value,0) : "—")}<em>/10</em></strong></span><i>→</i><span><small>走った後</small><strong>${escapeHtml(post.available ? number(post.value,0) : "—")}<em>/10</em></strong></span><b>${escapeHtml(pair ? signed(context.difference.value,0) : "—")}</b></div><p>${escapeHtml(pair ? "同じ日の本人記録です。部位数値とは別の情報として、過去の記録と並べて確認できます。" : "記録できている側だけを、本人の感覚として残します。")}</p></article>` : ""}
    </div>
    ${sameCourseRofAction(output, selfUnderstanding)}
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
  if (key === "LATER") return "走ったあと";
  return "記録時点未設定";
}

function candidateRegionValue(candidate = {}) {
  return finite(candidate?.row?.value) ? number(candidate.row.value) : "—";
}

function renderBodyObservationCandidate(candidate = {}) {
  if (candidate?.kind !== "BODY_OBSERVATION_PAIR") return "";
  const observation = candidate.observation || {};
  const row = candidate.row || {};
  const regionLabel = row.regionName || row.regionId || "選択部位";
  const direction = finite(row.value) ? referenceText(Number(row.value) > 101 ? "ABOVE_REFERENCE" : Number(row.value) < 99 ? "BELOW_REFERENCE" : "REFERENCE_VICINITY") : "表示なし";
  return `<div class="self-understanding-candidate" data-su-candidate="body-region-pair">
    <div class="self-understanding-candidate__eyebrow">比較ポイント</div>
    <h3>2つの情報を見比べられます</h3>
    <div class="self-understanding-candidate__layers">
      <article data-layer="subjective"><small>あなたの記録</small><strong>${escapeHtml(observation.label || regionLabel)}・${escapeHtml(sensationLabel(observation.sensationType))}</strong><span>${escapeHtml(timingLabel(observation.noticedTiming))}${finite(observation.intensity) ? `・強さ ${escapeHtml(String(observation.intensity))}/5` : ""}</span></article>
      <i aria-hidden="true">↔</i>
      <article data-layer="model"><small>部位表示</small><strong>${escapeHtml(regionLabel)} ${escapeHtml(candidateRegionValue(candidate))}</strong><span>${escapeHtml(direction)}</span></article>
    </div>
    <p>本人が記録した感覚と、文献由来の部位表示は別の情報です。原因関係や一致度は判定しません。${Number(candidate.otherObservationCount || 0) > 0 ? ` ほかに身体の記録が${escapeHtml(String(candidate.otherObservationCount))}件あります。` : ""}</p>
    <button type="button" class="self-understanding-primary" data-action="create-self-understanding-thread" data-thread-type="REGION_OBSERVATION_PAIR" data-region-id="${escapeHtml(row.regionId || candidate.subject?.regionId || "")}" data-body-area-id="${escapeHtml(candidate.subject?.bodyAreaId || observation.areaId || "")}">この点を次も見る</button>
  </div>`;
}

function threadStateLabel(thread = {}) {
  if (thread.userState === "PAUSED") return "一時停止中";
  if (thread.userState === "CLOSED") return "終了";
  return thread.hasNewEligibleData ? "新しい記録あり" : "確認中";
}

function renderActiveThread(thread = {}, output = {}) {
  const currentEpisode = (thread.newEpisodes || []).find((episode) => episode.recordId === output?.target?.recordId) || thread.newEpisodes?.[0] || null;
  const episodeDetail = currentEpisode?.row && finite(currentEpisode.row.value)
    ? `${currentEpisode.row.regionName || "部位"} ${number(currentEpisode.row.value)}・${referenceText(Number(currentEpisode.row.value) > 101 ? "ABOVE_REFERENCE" : Number(currentEpisode.row.value) < 99 ? "BELOW_REFERENCE" : "REFERENCE_VICINITY")}`
    : finite(currentEpisode?.postRofJ)
      ? `走行後の疲労感 ${number(currentEpisode.postRofJ, 0)}/10`
      : currentEpisode ? `${formatLocalDate(currentEpisode.date)}の記録` : "新しい比較材料があります";
  return `<div class="self-understanding-thread self-understanding-thread--active" data-thread-id="${escapeHtml(thread.id || "")}">
    <div class="self-understanding-thread__head"><span>${interpretationIcon("flag")}</span><div><small>確認中のテーマ</small><h3>${escapeHtml(thread.title || "確認テーマ")}</h3></div><b>${escapeHtml(threadStateLabel(thread))}</b></div>
    <div class="self-understanding-thread__new"><small>今回追加できる材料</small><strong>${escapeHtml(episodeDetail)}</strong><span>比較できる記録 ${escapeHtml(String(thread.eligibleCount || 0))}件</span></div>
    <p>このテーマはあなたが続けて見ると決めたものです。RunLoadが「傾向を確定」したものではありません。</p>
    <div class="self-understanding-thread__actions">
      <button type="button" class="self-understanding-primary" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(thread.id || "")}" data-thread-decision="KEEP_WATCHING">今回の追加を確認して続ける</button>
      <button type="button" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(thread.id || "")}" data-thread-decision="PAUSE">一時停止</button>
      <button type="button" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(thread.id || "")}" data-thread-decision="CLOSE">終了</button>
    </div>
    <div class="self-understanding-thread__links">
      <a class="self-understanding-thread__share" href="#/plan?sourceRecordId=${encodeURIComponent(output?.target?.recordId || currentEpisode?.recordId || thread.createdFromRecordId || "")}&threadId=${encodeURIComponent(thread.id || "")}&from=interpretation-room">次の予定に覚えておく</a>
      <a class="self-understanding-thread__share" href="#/consultation?recordId=${encodeURIComponent(output?.target?.recordId || currentEpisode?.recordId || thread.createdFromRecordId || "")}&threadId=${encodeURIComponent(thread.id || "")}&from=interpretation-room&roomOrigin=${encodeURIComponent(output?.target?.origin || "result")}">共有用に整理</a>
    </div>
  </div>`;
}

function selectedRegionWatchAction(output = {}, selfUnderstanding = {}) {
  const region = output?.selectedRegion || null;
  if (!region?.regionId) return "";
  const existing = (selfUnderstanding?.threads || []).some((thread) => thread.userState !== "CLOSED" && ["REGION_WATCH", "REGION_OBSERVATION_PAIR"].includes(thread.type) && thread.subject?.regionId === region.regionId);
  if (existing) return `<p class="self-understanding-already">この部位に関する確認テーマはすでに保存されています。</p>`;
  return `<button type="button" class="self-understanding-secondary" data-action="create-self-understanding-thread" data-thread-type="REGION_WATCH" data-region-id="${escapeHtml(region.regionId)}">この部位を次も見る</button>`;
}

function legacyCarryAction(output = {}, selfUnderstanding = {}) {
  const legacy = String(output?.runFacts?.nextCheckPoint || "").trim();
  if (!legacy) return "";
  const already = (selfUnderstanding?.threads || []).some((thread) => thread.type === "USER_DEFINED_LEGACY" && thread.legacyOrigin?.sourceRecordId === output?.target?.recordId && thread.userState !== "CLOSED");
  if (already) return "";
  return `<div class="self-understanding-legacy"><small>以前に自分で残した確認</small><strong>${escapeHtml(legacy)}</strong><button type="button" data-action="create-self-understanding-thread" data-thread-type="USER_DEFINED_LEGACY">確認テーマとして引き継ぐ</button></div>`;
}

function sameCourseRofAction(output = {}, selfUnderstanding = {}) {
  const context = selfUnderstanding?.targetContext || {};
  const course = context.course || {};
  if (!course.id || !finite(context.postRofJ)) return "";
  const existing = (selfUnderstanding?.threads || []).some((thread) => thread.userState !== "CLOSED" && thread.type === "SAME_COURSE_ROF_POST" && thread.subject?.courseId === course.id);
  if (existing) return "";
  return `<button type="button" class="self-understanding-context-action" data-action="create-self-understanding-thread" data-thread-type="SAME_COURSE_ROF_POST"><span>${interpretationIcon("person")}</span><span><small>自分で選ぶ確認テーマ</small><strong>同じコースで走行後の疲労感を見る</strong></span><i aria-hidden="true">›</i></button>`;
}

function renderThreadArchiveLink(selfUnderstanding = {}) {
  const watching = Number(selfUnderstanding?.counts?.watching || 0);
  const paused = Number(selfUnderstanding?.counts?.paused || 0);
  if (!watching && !paused) return "";
  return `<a class="self-understanding-archive-link" href="#/history?view=checks"><span>${interpretationIcon("history")}</span><span><small>これまで</small><strong>確認中のことを見る</strong></span><b>${watching + paused}</b><i aria-hidden="true">›</i></a>`;
}

function renderMobileInterpretationPath() {
  return `<nav class="interpretation-room-mobile-path" aria-label="結果整理の流れ">
    <span><b>1</b><strong>記録した事実</strong></span>
    <i aria-hidden="true">›</i>
    <span><b>2</b><strong>今回を見る</strong></span>
    <i aria-hidden="true">›</i>
    <span><b>3</b><strong>確認テーマ</strong></span>
  </nav>`;
}

function renderNextRail(output, { mobileLayout = false, selfUnderstanding = null } = {}) {
  const next = output?.next || {};
  const actions = [next.primaryAction, ...(next.otherActions || [])].filter((action) => action && action.enabled !== false);
  const active = selfUnderstanding?.activeThread || null;
  const candidate = selfUnderstanding?.primaryCandidate || null;
  const selected = Boolean(output?.selectedRegion);
  const content = active
    ? renderActiveThread(active, output)
    : candidate
      ? renderBodyObservationCandidate(candidate)
      : `<div class="self-understanding-zero"><span>${interpretationIcon("flag")}</span><div><small>確認テーマ</small><strong>${selected ? "この部位を続けて見るか選べます" : "今回は新しい確認テーマはありません"}</strong><p>${selected ? "部位表示は事実として確認できます。続けて見るかどうかは自分で決めます。" : "結果と記録は履歴からいつでも見返せます。無理にテーマを作る必要はありません。"}</p></div></div>`;
  return `<aside class="interpretation-room-next-rail self-understanding-rail" aria-labelledby="interpretation-next-title">
    <div class="interpretation-room-next-rail__head"><span>${interpretationIcon("flag")}</span><div><small>次へつなぐ</small><h2 id="interpretation-next-title">確認テーマ</h2></div></div>
    ${content}
    ${active && Number(selfUnderstanding?.counts?.newThreadCount || 0) > 1 ? `<a class="self-understanding-more-new" href="#/history?view=checks"><strong>ほかに新しい記録がある確認 ${escapeHtml(String(Number(selfUnderstanding.counts.newThreadCount) - 1))}件</strong><span>確認中のことから見られます</span></a>` : ""}
    ${!active && !candidate && selected ? selectedRegionWatchAction(output, selfUnderstanding) : ""}
    ${!active ? legacyCarryAction(output, selfUnderstanding) : ""}
    ${renderThreadArchiveLink(selfUnderstanding)}
    <details class="self-understanding-other-actions"><summary>ほかにできること</summary><div>${actions.map((action) => renderAction(action, output)).join("")}</div></details>
  </aside>`;
}

function renderNext(output, selfUnderstanding = null) {
  return `<section class="interpretation-room-next interpretation-room-next--actions"><div class="interpretation-room-section-title"><div><small>次へつなぐ</small><h2>確認テーマ</h2></div><p>続けて見たいことがある場合だけ、自分で確認テーマを残します。</p></div>${renderNextRail(output, { selfUnderstanding })}</section>`;
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
export function renderInterpretationRoom({ output, selfUnderstanding = null, mobileLayout = false } = {}) {
  if (!output?.state?.targetAvailable) {
    return `<div class="interpretation-room interpretation-room--empty" data-interpretation-room-state="empty"><header class="interpretation-room-hero"><p>結果を整理する</p><h1>対象の保存記録がありません</h1><p>保存した走行記録から、今回確認できることを整理します。</p></header><a class="interpretation-room-action interpretation-room-action--primary" href="#/record-input"><span class="interpretation-room-action__icon">${interpretationIcon("record")}</span><span class="interpretation-room-action__copy"><strong>記録を始める</strong><small>新しい走行記録を入力します。</small></span><i aria-hidden="true">›</i></a></div>`;
  }
  if (output?.state?.support && output.state.support !== "NORMAL") return renderSupportPriority(output);
  if (output?.state?.regional === "REST") return renderRest(output);

  const date = output?.target?.date ? formatLocalDate(output.target.date) : "今回の記録";
  const selected = Boolean(output?.selectedRegion);
  if (!selected) {
    return `<div class="interpretation-room interpretation-room--overview interpretation-room--dashboard" data-interpretation-room-state="overview">
      ${mobileLayout ? renderMobileInterpretationPath() : ""}
      <div class="interpretation-room-dashboard">
        ${renderOverviewInsight(output, date)}
        ${renderNextRail(output, { mobileLayout, selfUnderstanding })}
        ${renderPatternBoard(output)}
        ${renderContextBoard(output, selfUnderstanding)}
      </div>
    </div>`;
  }
  return `<div class="interpretation-room interpretation-room--selected interpretation-room--selected-detail" data-interpretation-room-state="selected">
    <header class="interpretation-room-selected-head"><div><p>${escapeHtml(date)}</p><h1>${escapeHtml(output.selectedRegion.label)}</h1><span>基準100・前回差・最近の推移から、この部位だけを整理します。</span></div><a href="${escapeHtml(regionHref(output, ""))}">12部位の整理へ戻る</a></header>
    <div class="interpretation-room-selected-workspace">
      <div class="interpretation-room-selected-main">
        ${renderSelectedRegion(output)}
        ${renderConditions(output)}
        <div class="interpretation-room-selected-advanced-stack">${renderAdvanced(output, output?.selectedRegion)}</div>
      </div>
      <div class="interpretation-room-selected-side">
        ${renderNextRail(output, { mobileLayout, selfUnderstanding })}
        ${renderSubjective(output)}
      </div>
    </div>
  </div>`;
}

import { escapeHtml } from "./commonComponents.js";

const VIEW_SET = new Set(["summary", "detail", "evidence", "next", "explain"]);
const MODE_SET = new Set(["simple", "visual", "difference"]);
const INTENT_SET = new Set(["", "current", "history", "condition", "support"]);

const REGION_PLAIN_WORDING = Object.freeze({
  "BA-DISP-014": "股関節の機械的仕事に関する文献指標",
  "BA-DISP-015": "殿部の筋活動に関する文献指標",
  "BA-DISP-016": "大腿前面の筋活動に関する文献指標",
  "BA-DISP-018": "大腿後面の筋活動に関する文献指標",
  "BA-DISP-019": "膝蓋大腿関節ストレスの力積に関する文献指標",
  "BA-DISP-021": "脛骨ストレスの力積に関する文献指標",
  "BA-DISP-023": "下腿後面の筋活動に関する文献指標",
  "BA-DISP-024": "足関節の機械的仕事に関する文献指標",
  "BA-DISP-025": "アキレス腱のひずみ力積に関する文献指標",
  "BA-DISP-027": "後足部のピーク足底圧に関する文献指標",
  "BA-DISP-028": "中足部のピーク足底圧を組み合わせた文献ベースの指標",
  "BA-DISP-029": "前足部のピーク足底圧を組み合わせた文献ベースの指標",
});

const EVIDENCE_STATE_LABELS = Object.freeze({
  DIRECT: "原典の対象範囲に基づく経路",
  P1_SOURCE_MODEL_EXTENSION: "原典モデルを限定された範囲で使用した経路",
  P2_CROSS_SOURCE_BRIDGE: "複数資料を接続した限定的な経路",
  EVIDENCE_INSUFFICIENT: "この条件では数値化できる根拠が不足",
});

const CONDITION_LABELS = Object.freeze({
  DISTANCE: "走行距離",
  DURATION: "走行時間",
  PACE: "ペース",
  RUNNING_FORMAT: "走行形式",
  COURSE: "コース",
  GRADE: "坂の条件",
  SURFACE: "路面条件",
  CADENCE: "1分あたりの歩数",
});

const ACTION_LABELS = Object.freeze({
  OFFICIAL_HELP: "公的サポートを確認",
  CONSULTATION: "共有する内容を整理",
  REVIEW_INPUT: "入力内容を確認",
  HISTORY: "過去記録を確認",
  SIMULATION: "条件を変えた場合を確認",
  PLAN: "次の予定を作成",
  READING: "関連する読みものを確認",
  RECORD: "記録を始める",
});

function number(value, digits = 1) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits).replace(/\.0$/, "") : "—";
}

function signed(value, digits = 1) {
  if (!Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  return `${n > 0 ? "+" : ""}${number(n, digits)}`;
}

function formatDate(date = "") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  if (!match) return String(date || "");
  return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
}

function normalizeView(value = "summary") {
  return VIEW_SET.has(value) ? value : "summary";
}

function normalizeMode(value = "simple") {
  return MODE_SET.has(value) ? value : "simple";
}

function normalizeIntent(value = "") {
  return INTENT_SET.has(value) ? value : "";
}

function route(recordId, origin, values = {}) {
  const query = new URLSearchParams({ recordId: String(recordId || ""), origin: String(origin || "result") });
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return `#/interpretation-room?${query.toString()}`;
}

function directionText(direction = "") {
  if (direction === "ABOVE_REFERENCE") return "基準100より上";
  if (direction === "BELOW_REFERENCE") return "基準100より下";
  if (direction === "REFERENCE_VICINITY") return "基準100付近";
  return "数値なし";
}

function meaning(output) {
  return output?.interpretation?.meaning || {};
}

function meaningFact(output, type) {
  return meaning(output).factsUsed?.find?.((item) => item.type === type) || null;
}

function focusRegion(output) {
  const regionId = meaning(output).focusRegionIds?.[0] || output?.context?.selectedRegionId || "";
  return output?.current?.regions?.find?.((item) => item.regionId === regionId) || null;
}

function focusComparison(output) {
  const regionId = focusRegion(output)?.regionId || "";
  return regionId ? output?.comparison?.regionalById?.[regionId] || null : null;
}

function conditionLabels(output) {
  return (output?.comparison?.conditionDifferences || [])
    .map((item) => CONDITION_LABELS[item.labelToken] || item.labelToken || item.id)
    .filter(Boolean);
}

function primaryMeaningText(output) {
  const code = meaning(output).primaryCode || "COMPARISON_BASELINE";
  const region = focusRegion(output);
  const comparison = focusComparison(output);
  const repeated = meaningFact(output, "REGION_REPEATED_DIRECTION");
  const rof = output?.current?.rof || {};
  const conditions = conditionLabels(output);
  const regionName = region?.label || "選択した部位";

  if (code === "SUPPORT_PRIORITY") {
    return "この記録では、通常の結果解釈より先に、入力内容とサポート案内を確認します。";
  }
  if (code === "LIMITED_RESULT") {
    return "今回は、現在のルールで直接比較できる結果が十分ではありません。意味を広げず、確認できる範囲だけを扱います。";
  }
  if (code === "REPEATED_OBSERVATION" && repeated) {
    return `${regionName}は、比較可能な過去${repeated.pastComparableCount}件のうち${repeated.pastMatchingCount}件でも今回と同じ方向に表示されています。今回だけの表示ではなく、保存記録の中で繰り返し確認されている点として読めます。`;
  }
  if (code === "CONDITION_AND_RESULT_CHANGED") {
    const conditionText = conditions.length ? conditions.join("、") : "走行条件";
    return `今回は、前回と比べて${regionName}の表示と${conditionText}の両方が変わっています。この比較だけでは、どの条件が結果の違いに関係したかは分けられません。`;
  }
  if (code === "MULTI_LAYER_CHANGE") {
    return `今回は、${regionName}の部位別表示に前回との差があり、走行前後の疲労感にも差があります。どちらか一方だけでなく、2つを別の情報として確認する記録です。`;
  }
  if (code === "CURRENT_SHIFT_WITH_HISTORY") {
    return `今回は、前回と同じ状態の繰り返しではなく、${regionName}に前回との差がある記録として読めます。`;
  }
  if (code === "CURRENT_REFERENCE_PATTERN") {
    return `今回は過去との差より、${regionName}がその部位自身の基準100に対してどちら側に表示されたかを、今後の比較点として見る記録です。`;
  }
  if (comparison?.comparablePreviousRecordId) {
    return "今回は、比較可能な前回記録との大きな表示差を探すより、次の記録との違いを見るための比較点として使える記録です。";
  }
  return "今回は、次回以降に自分の記録内で違いを確認するための比較点として使える記録です。";
}

function reasonItems(output) {
  const items = [];
  const repeated = meaningFact(output, "REGION_REPEATED_DIRECTION");
  const previous = meaningFact(output, "REGION_PREVIOUS_DIFFERENCE");
  const region = focusRegion(output);
  const rof = meaningFact(output, "ROF_PRE_POST");
  const conditions = conditionLabels(output);

  if (repeated && region) {
    items.push(`${region.label}: 比較可能な過去${repeated.pastComparableCount}件のうち${repeated.pastMatchingCount}件でも${directionText(repeated.currentDirection)}。`);
  }
  if (previous && region && ["UP", "DOWN"].includes(previous.direction)) {
    items.push(`${region.label}: 比較可能な前回との差は${signed(previous.delta)}。`);
  }
  if (rof && Number.isFinite(rof.delta) && Math.abs(Number(rof.delta)) >= 1) {
    items.push(`主観的な疲労感: 走行前${number(rof.pre, 0)}から走行後${number(rof.post, 0)}へ${signed(rof.delta, 0)}。`);
  }
  if (conditions.length) {
    items.push(`前回と異なる走行条件: ${conditions.join("、")}。`);
  }
  if (!items.length && region) {
    items.push(`${region.label}: 今回は${directionText(region.referenceDirection)}に表示。`);
  }
  return items.slice(0, 3);
}

function currentBoundaryText(output) {
  const code = meaning(output).primaryCode || "";
  if (code === "CONDITION_AND_RESULT_CHANGED") {
    return "走行条件と部位別結果が同時に変わっていても、この記録だけで原因として結び付けません。";
  }
  if (code === "MULTI_LAYER_CHANGE") {
    return "疲労感と部位別結果は別の情報です。どちらか一方を、もう一方の原因として扱いません。";
  }
  if (code === "REPEATED_OBSERVATION") {
    return "繰り返し確認されても、体質・診断・けがの起こりやすさを示すものではありません。";
  }
  return "この解釈は、診断、危険度、安全性、走行可否を示しません。";
}

function renderMeaningPanel(output) {
  const reasons = reasonItems(output);
  return `<section class="interpretation-primary interpretation-primary--meaning">
    <div class="interpretation-target"><small>RUNLOAD INTERPRETATION</small><span>${escapeHtml(formatDate(output?.context?.recordDate || ""))}</span></div>
    <p class="interpretation-meaning-label">今回の読み方</p>
    <h1>${escapeHtml(primaryMeaningText(output))}</h1>
    ${reasons.length ? `<div class="interpretation-reasons"><h2>そう読める理由</h2><ul>${reasons.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
    <div class="interpretation-boundary-card"><small>この記録だけでは決められないこと</small><p>${escapeHtml(currentBoundaryText(output))}</p></div>
  </section>`;
}

function renderViewChoice(href, title, description, icon) {
  return `<a class="interpretation-view-choice" href="${escapeHtml(href)}"><span class="interpretation-view-choice__icon" aria-hidden="true">${escapeHtml(icon)}</span><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></span><i aria-hidden="true">›</i></a>`;
}

function renderExplanationChoices(output, origin) {
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || meaning(output).focusRegionIds?.[0] || "";
  const modes = new Set(meaning(output).availableModes || []);
  return `<section class="interpretation-explanation-section"><div class="interpretation-section-head"><small>IF THIS IS STILL UNCLEAR</small><h2>別の見方で確認</h2></div><div class="interpretation-view-choice-grid">
    ${renderViewChoice(route(recordId, origin, { view: "explain", mode: "simple", regionId }), "簡単に見る", "3つの短い項目に分けて確認", "要")}
    ${modes.has("visual") ? renderViewChoice(route(recordId, origin, { view: "explain", mode: "visual", regionId }), "図で見る", "基準100・前回・今回の位置で確認", "図") : ""}
    ${modes.has("difference") ? renderViewChoice(route(recordId, origin, { view: "explain", mode: "difference", regionId }), "違いだけ見る", "変わった内容だけを抽出", "差") : ""}
    ${modes.has("evidence") ? renderViewChoice(route(recordId, origin, { view: "evidence", regionId }), "根拠を見る", "この解釈に使った保存情報を確認", "根") : ""}
  </div></section>`;
}

function renderChoice(href, title, description = "", disabled = false) {
  if (disabled) return `<span class="interpretation-choice is-disabled" aria-disabled="true"><strong>${escapeHtml(title)}</strong>${description ? `<span>${escapeHtml(description)}</span>` : ""}</span>`;
  return `<a class="interpretation-choice" href="${escapeHtml(href)}"><strong>${escapeHtml(title)}</strong>${description ? `<span>${escapeHtml(description)}</span>` : ""}<i aria-hidden="true">›</i></a>`;
}

function actionHref(action, roomOrigin = "") {
  if (!action?.destination) return "#/home";
  const query = new URLSearchParams();
  Object.entries(action.parameters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  if (action.destination === "simulation" && !query.has("from")) query.set("from", "interpretation-room");
  if (action.destination === "simulation" && roomOrigin && !query.has("roomOrigin")) query.set("roomOrigin", roomOrigin);
  return `#/${action.destination}${query.size ? `?${query.toString()}` : ""}`;
}

function findAction(output, id) {
  return output?.actions?.find?.((item) => item.actionId === id) || null;
}

function renderSafetyChoices(output) {
  if (output?.safety?.route === "normal") return "";
  const preferred = output.safety.route === "urgent"
    ? ["official-help", "share", "review-input"]
    : output.safety.route === "consult"
      ? ["share", "review-input"]
      : ["review-input"];
  const links = preferred.map((id) => findAction(output, id)).filter(Boolean).map((action) => renderChoice(actionHref(action), ACTION_LABELS[action.labelToken] || action.labelToken, "", !action.enabled)).join("");
  return `<section class="interpretation-choice-section"><h2>確認する内容を選択してください。</h2><div class="interpretation-choice-list">${links}</div></section>`;
}

function renderSummary(output, origin) {
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || meaning(output).focusRegionIds?.[0] || "";
  const normal = output?.safety?.route === "normal";
  return `<div class="interpretation-room-view interpretation-room-view--summary">
    ${renderMeaningPanel(output)}
    ${normal ? renderExplanationChoices(output, origin) : renderSafetyChoices(output)}
    ${normal ? `<div class="interpretation-summary-actions"><a class="button button--secondary" href="${escapeHtml(route(recordId, origin, { view: "detail", intent: "current", regionId }))}">12部位の数値をすべて確認</a><a class="button button--primary" href="${escapeHtml(route(recordId, origin, { view: "next", regionId }))}">次に確認する内容</a></div>` : ""}
  </div>`;
}

function simpleKnownText(output) {
  const code = meaning(output).primaryCode || "";
  const region = focusRegion(output);
  if (code === "REPEATED_OBSERVATION") return `${region?.label || "選択した部位"}は、今回だけでなく比較可能な過去記録でも同じ方向が複数回あります。`;
  if (code === "CONDITION_AND_RESULT_CHANGED") return `今回は、部位別結果と走行条件の両方に前回との違いがあります。`;
  if (code === "MULTI_LAYER_CHANGE") return `今回は、部位別結果と主観的な疲労感の両方に違いがあります。`;
  if (code === "CURRENT_SHIFT_WITH_HISTORY") return `${region?.label || "選択した部位"}は、比較可能な前回記録と同じ表示ではありません。`;
  if (code === "CURRENT_REFERENCE_PATTERN") return `${region?.label || "選択した部位"}の今回の位置を、自分の次回比較の出発点にできます。`;
  if (code === "LIMITED_RESULT") return "今回は、直接比較できる情報が十分ではありません。";
  if (code === "SUPPORT_PRIORITY") return "今回は、通常の解釈より入力内容とサポート案内の確認を優先します。";
  return "今回は、次回以降の記録と比べるための基準点として使えます。";
}

function simpleDifferenceText(output) {
  const region = focusRegion(output);
  const previous = meaningFact(output, "REGION_PREVIOUS_DIFFERENCE");
  const rof = meaningFact(output, "ROF_PRE_POST");
  const conditions = conditionLabels(output);
  const parts = [];
  if (previous && ["UP", "DOWN"].includes(previous.direction)) parts.push(`${region?.label || "選択した部位"}: 前回との差 ${signed(previous.delta)}`);
  if (rof && Math.abs(Number(rof.delta || 0)) >= 1) parts.push(`疲労感: 走行前後差 ${signed(rof.delta, 0)}`);
  if (conditions.length) parts.push(`走行条件: ${conditions.join("、")}`);
  return parts.length ? parts.join(" / ") : "比較できる範囲では、前回との違いを取り出せません。";
}

function renderSimpleExplanation(output, origin) {
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || meaning(output).focusRegionIds?.[0] || "";
  return `<div class="interpretation-room-view interpretation-room-view--explain interpretation-room-view--simple">
    <header class="interpretation-view-head"><p>RunLoad解釈</p><h1>簡単に見る</h1><p>同じ解釈を、3つの短い項目に分けます。</p></header>
    <section class="interpretation-simple-grid">
      <article><small>今回わかること</small><p>${escapeHtml(simpleKnownText(output))}</p></article>
      <article><small>前回と違うこと</small><p>${escapeHtml(simpleDifferenceText(output))}</p></article>
      <article><small>ここからは判断できないこと</small><p>${escapeHtml(currentBoundaryText(output))}</p></article>
    </section>
    <div class="interpretation-inline-actions"><a class="button button--text" href="${escapeHtml(route(recordId, origin, { view: "summary", regionId }))}">今回の読み方へ戻る</a></div>
  </div>`;
}

function visualDomain(values) {
  const numeric = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!numeric.length) return { min: 95, max: 105 };
  const minValue = Math.min(...numeric);
  const maxValue = Math.max(...numeric);
  const spread = Math.max(1, maxValue - minValue);
  const pad = Math.max(4, spread * 0.35);
  return { min: minValue - pad, max: maxValue + pad };
}

function visualX(value, domain) {
  if (!Number.isFinite(Number(value))) return null;
  const span = Math.max(1e-9, domain.max - domain.min);
  const fraction = Math.max(0, Math.min(1, (Number(value) - domain.min) / span));
  return 24 + fraction * 272;
}

function svgMarker(x, y, label, value, className) {
  if (x == null) return "";
  return `<g class="${escapeHtml(className)}"><circle cx="${x.toFixed(1)}" cy="${y}" r="6"></circle><text x="${x.toFixed(1)}" y="${y - 14}" text-anchor="middle">${escapeHtml(label)}</text><text x="${x.toFixed(1)}" y="${y + 24}" text-anchor="middle">${escapeHtml(number(value))}</text></g>`;
}

function renderRegionalVisual(output) {
  const region = focusRegion(output);
  if (!region) return '<p>図にできる部位別結果がありません。</p>';
  const comparison = focusComparison(output);
  const previous = comparison?.comparablePreviousRecordId ? comparison.previousValue : null;
  const domain = visualDomain([100, region.value, previous]);
  const xRef = visualX(100, domain);
  const xCurrent = visualX(region.value, domain);
  const xPrevious = visualX(previous, domain);
  return `<article class="interpretation-visual-card"><div class="interpretation-visual-card__head"><small>選択した1部位の中で比較</small><h2>${escapeHtml(region.label)}</h2></div>
    <svg class="interpretation-comparison-svg" viewBox="0 0 320 112" role="img" aria-label="${escapeHtml(`${region.label}の前回・基準100・今回の位置`)}">
      <line class="interpretation-comparison-axis" x1="24" y1="58" x2="296" y2="58"></line>
      ${svgMarker(xPrevious, 58, "前回", previous, "marker-previous")}
      ${svgMarker(xRef, 58, "基準", 100, "marker-reference")}
      ${svgMarker(xCurrent, 58, "今回", region.value, "marker-current")}
    </svg>
    <p class="source-boundary">この図は${escapeHtml(region.label)}の中だけで比較します。別の部位との大小比較には使いません。</p></article>`;
}

function renderRofVisual(output) {
  const rof = output?.current?.rof || {};
  if (!Number.isFinite(rof.pre) || !Number.isFinite(rof.post)) return "";
  const domain = { min: 0, max: 10 };
  return `<article class="interpretation-visual-card interpretation-visual-card--rof"><div class="interpretation-visual-card__head"><small>主観的な疲労感 0–10</small><h2>走行前後の疲労感</h2></div>
    <svg class="interpretation-comparison-svg" viewBox="0 0 320 112" role="img" aria-label="走行前後の疲労感の位置">
      <line class="interpretation-comparison-axis" x1="24" y1="58" x2="296" y2="58"></line>
      ${svgMarker(visualX(rof.pre, domain), 58, "走行前", rof.pre, "marker-previous")}
      ${svgMarker(visualX(rof.post, domain), 58, "走行後", rof.post, "marker-current")}
    </svg>
    <p class="source-boundary">疲労感は本人が記録した主観情報です。部位別の基準100とは別の尺度です。</p></article>`;
}

function renderVisualExplanation(output, origin) {
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || meaning(output).focusRegionIds?.[0] || "";
  return `<div class="interpretation-room-view interpretation-room-view--explain interpretation-room-view--visual">
    <header class="interpretation-view-head"><p>RunLoad解釈</p><h1>図で見る</h1><p>同じ解釈を、数値の位置関係に変えて確認します。</p></header>
    <section class="interpretation-visual-stack">${renderRegionalVisual(output)}${renderRofVisual(output)}</section>
    <div class="interpretation-inline-actions"><a class="button button--text" href="${escapeHtml(route(recordId, origin, { view: "summary", regionId }))}">今回の読み方へ戻る</a></div>
  </div>`;
}

function renderDifferenceExplanation(output, origin) {
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || meaning(output).focusRegionIds?.[0] || "";
  const region = focusRegion(output);
  const previous = meaningFact(output, "REGION_PREVIOUS_DIFFERENCE");
  const rof = meaningFact(output, "ROF_PRE_POST");
  const conditions = conditionLabels(output);
  const cards = [];
  if (previous && ["UP", "DOWN"].includes(previous.direction)) {
    cards.push(`<article class="interpretation-difference-card"><small>部位別結果</small><h2>${escapeHtml(region?.label || "選択した部位")}</h2><p>前回 ${escapeHtml(number(previous.previousValue))} → 今回 ${escapeHtml(number(previous.currentValue))}</p><strong>差 ${escapeHtml(signed(previous.delta))}</strong></article>`);
  }
  if (rof && Math.abs(Number(rof.delta || 0)) >= 1) {
    cards.push(`<article class="interpretation-difference-card"><small>主観情報</small><h2>疲労感</h2><p>走行前 ${escapeHtml(number(rof.pre, 0))} → 走行後 ${escapeHtml(number(rof.post, 0))}</p><strong>前後差 ${escapeHtml(signed(rof.delta, 0))}</strong></article>`);
  }
  if (conditions.length) {
    cards.push(`<article class="interpretation-difference-card"><small>走行事実</small><h2>前回と異なる条件</h2><p>${escapeHtml(conditions.join("、"))}</p></article>`);
  }
  const body = cards.length ? cards.join("") : '<p class="interpretation-empty-note">比較できる範囲では、違いだけを取り出せません。</p>';
  const nonCausal = previous && conditions.length ? '<p class="source-boundary interpretation-difference-boundary">部位別結果と走行条件が同時に変わっていても、この比較だけで原因として結び付けません。</p>' : "";
  return `<div class="interpretation-room-view interpretation-room-view--explain interpretation-room-view--difference">
    <header class="interpretation-view-head"><p>RunLoad解釈</p><h1>違いだけ見る</h1><p>前回や走行前後と比べて、変わった内容だけを分けて表示します。</p></header>
    <section class="interpretation-difference-grid">${body}</section>${nonCausal}
    <div class="interpretation-inline-actions"><a class="button button--text" href="${escapeHtml(route(recordId, origin, { view: "summary", regionId }))}">今回の読み方へ戻る</a></div>
  </div>`;
}

function renderExplanation(output, mode, origin) {
  const resolvedMode = normalizeMode(mode);
  if (resolvedMode === "visual") return renderVisualExplanation(output, origin);
  if (resolvedMode === "difference") return renderDifferenceExplanation(output, origin);
  return renderSimpleExplanation(output, origin);
}

function renderRegionTable(output, historyOnly = false) {
  const rows = (output?.current?.regions || []).map((region) => {
    const cmp = output?.comparison?.regionalById?.[region.regionId];
    return `<tr><th>${escapeHtml(region.label)}</th>${historyOnly ? "" : `<td>${escapeHtml(number(region.value))}</td><td>${escapeHtml(directionText(region.referenceDirection))}</td>`}<td>${cmp?.comparablePreviousRecordId ? escapeHtml(number(cmp.previousValue)) : "—"}</td><td>${cmp?.comparablePreviousRecordId ? escapeHtml(signed(cmp.delta)) : "—"}</td></tr>`;
  }).join("");
  const head = historyOnly ? "<tr><th>部位</th><th>前回</th><th>今回との差</th></tr>" : "<tr><th>部位</th><th>今回</th><th>基準100との方向</th><th>前回</th><th>今回との差</th></tr>";
  return `<div class="interpretation-table-wrap"><table class="interpretation-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
}

function renderRofDetail(output) {
  const rof = output?.current?.rof || {};
  const text = Number.isFinite(rof.pre) && Number.isFinite(rof.post) && Number.isFinite(rof.delta)
    ? `疲労感は走行前${number(rof.pre, 0)}、走行後${number(rof.post, 0)}で、前後差は${signed(rof.delta, 0)}です。${rof.directionLabel ? ` 前後差の方向は${rof.directionLabel}です。` : ""}`
    : "走行前後の疲労感は直接比較できません。";
  return `<section class="interpretation-panel"><h2>疲労感</h2><p>${escapeHtml(text)}</p><p class="source-boundary">疲労感は本人が記録した主観情報です。回復度、安全性、走行可否を判定する数値ではありません。</p></section>`;
}

function renderDetail(output, intent, origin) {
  const historyOnly = intent === "history";
  const title = historyOnly ? "過去記録との違い" : "今回の結果の詳細";
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || meaning(output).focusRegionIds?.[0] || "";
  return `<div class="interpretation-room-view interpretation-room-view--detail">
    <header class="interpretation-view-head"><p>RunLoad解釈</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(historyOnly ? "同じ部位・同じ計算方法・同じ基準で直接比較できる保存記録だけを表示します。" : "12部位と疲労感を別の情報として確認します。")}</p></header>
    <section class="interpretation-panel"><h2>${historyOnly ? "12部位の過去比較" : "12部位"}</h2>${renderRegionTable(output, historyOnly)}<p class="source-boundary">各部位は、その部位自身の基準100と比較します。別部位どうしの数値を順位付けしません。</p></section>
    ${historyOnly ? "" : renderRofDetail(output)}
    <div class="interpretation-inline-actions">
      <a class="button button--secondary" href="${escapeHtml(route(recordId, origin, { view: "evidence", intent, regionId }))}">この解釈の根拠を確認</a>
      <a class="button button--secondary" href="${escapeHtml(route(recordId, origin, { view: "next", intent, regionId }))}">次に確認する内容</a>
      <a class="button button--text" href="${escapeHtml(route(recordId, origin, { view: "summary", regionId }))}">今回の読み方へ戻る</a>
    </div>
  </div>`;
}

function evidenceLabel(state = "") {
  return EVIDENCE_STATE_LABELS[state] || state || "表示情報なし";
}

function renderEvidenceRegion(output, region) {
  const evidence = output?.evidence?.regions?.[region.regionId] || {};
  const sources = evidence.sources || [];
  const sourceHtml = sources.length
    ? `<ul>${sources.map((source) => `<li>${escapeHtml(source.label)}${source.role ? `<span>${escapeHtml(source.role)}</span>` : ""}</li>`).join("")}</ul>`
    : "<p>この数値の基礎資料を表示できません。</p>";
  const compositeNote = evidence.projectCompositeFlag || ["BA-DISP-028", "BA-DISP-029"].includes(region.regionId)
    ? '<p class="source-boundary">複数の文献内成分をRunLoadの定義で組み合わせた指標です。文献がそのまま同一の統合値を報告したものではありません。</p>'
    : "";
  return `<details class="interpretation-evidence-item"${output?.context?.selectedRegionId === region.regionId ? " open" : ""}><summary><strong>${escapeHtml(region.label)}</strong><span>${escapeHtml(number(region.value))}</span></summary><div>
    <h3>計算で表している内容</h3><p>${escapeHtml(REGION_PLAIN_WORDING[region.regionId] || evidence.construct || region.label)}</p>${evidence.construct ? `<p class="interpretation-technical">保存された定義: ${escapeHtml(evidence.construct)}</p>` : ""}
    <h3>表示できる範囲</h3><p>${escapeHtml(evidenceLabel(evidence.evidenceState))}</p>
    <h3>この数値の基礎となる資料</h3>${sourceHtml}
    ${compositeNote}
  </div></details>`;
}

function renderEvidence(output, intent, origin) {
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || meaning(output).focusRegionIds?.[0] || "";
  const regions = regionId ? (output.current.regions || []).filter((item) => item.regionId === regionId) : (output.current.regions || []);
  return `<div class="interpretation-room-view interpretation-room-view--evidence">
    <header class="interpretation-view-head"><p>RunLoad解釈</p><h1>この解釈の根拠</h1><p>保存された部位別結果が表す内容と、結果に保持されている基礎資料を確認します。</p></header>
    <section class="interpretation-panel"><h2>この数値の基礎となる資料</h2><p>ここでは保存結果に保持されている資料情報を表示します。今回の計算に関係する全文献を完全列挙する表示ではありません。</p>${regions.map((region) => renderEvidenceRegion(output, region)).join("")}</section>
    <section class="interpretation-panel"><h2>この結果から判断しないこと</h2><ul><li>診断、けがの発生確率、原因</li><li>安全性、危険度、走行可否</li><li>異なる部位どうしの物理的な大小順位</li><li>走行条件と部位別結果の因果関係</li></ul></section>
    <div class="interpretation-inline-actions"><a class="button button--text" href="${escapeHtml(route(recordId, origin, { view: "summary", regionId }))}">今回の読み方へ戻る</a></div>
  </div>`;
}

function renderAction(output, id, description = "") {
  const action = findAction(output, id);
  if (!action) return "";
  return renderChoice(actionHref(action, output?.context?.origin || "result"), ACTION_LABELS[action.labelToken] || action.labelToken, description, !action.enabled);
}

function renderNext(output, intent, origin) {
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || meaning(output).focusRegionIds?.[0] || "";
  let title = "次に確認する内容";
  let body = "確認する内容に応じてRunLoadの既存機能へ進みます。";
  let choices = "";
  if (output?.safety?.route !== "normal") {
    title = "確認できる内容";
    body = "既存のサポート判定を優先して表示します。";
    const preferred = output.safety.route === "urgent" ? ["official-help", "share", "review-input"] : output.safety.route === "consult" ? ["share", "review-input"] : ["review-input"];
    choices = preferred.map((id) => renderAction(output, id)).join("");
  } else if (intent === "condition") {
    title = "条件を変えた場合を確認";
    body = "保存済みの走行を基に、条件を変更した場合を同じ計算モデルで比較します。完了した走行記録とは分けて扱います。";
    choices = `${renderAction(output, "simulation", "条件を変更した場合の12部位を確認")}${renderAction(output, "plan", "次の走行・休養予定を作成")}`;
  } else if (intent === "support") {
    title = "相談・読みものへ進む";
    body = "共有する内容の整理または関連する一般情報の確認へ進みます。";
    choices = `${renderAction(output, "share", "自分で選んだ内容を共有用に整理")}${renderAction(output, "reading", "関連する研究背景を一般情報として確認")}`;
  } else if (intent === "history") {
    title = "過去記録を確認";
    body = "保存された比較可能な記録を履歴で確認します。";
    choices = renderAction(output, "history", "同じ部位・同じ計算方法・同じ基準の記録を確認");
  } else {
    choices = `${renderAction(output, "history", "過去記録を確認")}${renderAction(output, "simulation", "条件を変更した場合を確認")}${renderAction(output, "reading", "関連する読みものを確認")}${renderAction(output, "share", "共有する内容を整理")}`;
  }
  const nextCheck = output?.current?.facts?.nextCheckPoint || "";
  return `<div class="interpretation-room-view interpretation-room-view--next"><header class="interpretation-view-head"><p>RunLoad解釈</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></header>${nextCheck ? `<section class="interpretation-carry"><small>記録した「次回確認したいこと」</small><p>${escapeHtml(nextCheck)}</p></section>` : ""}<section class="interpretation-choice-section"><div class="interpretation-choice-list">${choices}</div></section><div class="interpretation-inline-actions"><a class="button button--text" href="${escapeHtml(route(recordId, origin, { view: "summary", regionId }))}">今回の読み方へ戻る</a></div></div>`;
}

export function renderInterpretationRoom({ output, view = "summary", mode = "simple", intent = "", origin = "result" } = {}) {
  const resolvedView = normalizeView(view);
  const resolvedIntent = normalizeIntent(intent);
  if (!output?.targetRecordId) {
    return '<div class="interpretation-room-view interpretation-room-view--empty"><header class="interpretation-view-head"><p>RunLoad解釈</p><h1>対象の保存記録がありません。</h1></header><a class="button button--primary" href="#/record-input">記録を始める</a></div>';
  }
  if (resolvedView === "explain") return renderExplanation(output, mode, origin);
  if (resolvedView === "detail") return renderDetail(output, resolvedIntent, origin);
  if (resolvedView === "evidence") return renderEvidence(output, resolvedIntent, origin);
  if (resolvedView === "next") return renderNext(output, resolvedIntent, origin);
  return renderSummary(output, origin);
}

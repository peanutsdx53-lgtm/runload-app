import { escapeHtml } from "./commonComponents.js";
import { PROTOTYPE_BODY_VIEWS } from "./prototypeBodyRegionVisuals.js";

const VIEW_SET = new Set(["summary", "detail", "evidence", "next", "explain", "dialogue"]);
const MODE_SET = new Set(["simple", "visual", "difference"]);
const TOPIC_SET = new Set(["understand", "manage", "next-use"]);
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

function normalizeTopic(value = "understand") {
  return TOPIC_SET.has(value) ? value : "understand";
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
    return `${regionName}は、比較可能な過去${repeated.pastComparableCount}件のうち${repeated.pastMatchingCount}件でも今回と同じ方向に表示されています。`;
  }
  if (code === "CONDITION_AND_RESULT_CHANGED") {
    const conditionText = conditions.length ? conditions.join("、") : "走行条件";
    return `今回は、前回と比べて${regionName}の表示と${conditionText}の両方が変わっています。`;
  }
  if (code === "MULTI_LAYER_CHANGE") {
    return `今回は、${regionName}の部位別表示と走行前後の疲労感の両方に違いがあります。`;
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

function renderDialogueChoice(href, title, description = "") {
  return `<a class="interpretation-dialogue-choice" href="${escapeHtml(href)}"><span><strong>${escapeHtml(title)}</strong>${description ? `<small>${escapeHtml(description)}</small>` : ""}</span><i aria-hidden="true">›</i></a>`;
}

function renderDialogueFrame({ output, title, message, prompt, choices = [], origin, topic = "", contextNote = "", showBoundary = false }) {
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || meaning(output).focusRegionIds?.[0] || "";
  return `<div class="interpretation-room-view interpretation-room-view--dialogue" data-dialogue-topic="${escapeHtml(topic)}">
    <section class="interpretation-dialogue-thread">
      <div class="interpretation-dialogue-meta"><small>RUNLOAD INTERPRETATION</small><span>${escapeHtml(formatDate(output?.context?.recordDate || ""))}</span></div>
      <article class="interpretation-turn interpretation-turn--runload"><small>${escapeHtml(title)}</small><p>${escapeHtml(message)}</p></article>
      ${contextNote ? `<aside class="interpretation-dialogue-context"><small>前回から引き継いだ内容</small><p>${escapeHtml(contextNote)}</p></aside>` : ""}
      ${showBoundary ? `<p class="interpretation-dialogue-boundary">${escapeHtml(currentBoundaryText(output))}</p>` : ""}
      <section class="interpretation-dialogue-prompt"><h2>${escapeHtml(prompt)}</h2><div class="interpretation-dialogue-choice-list">${choices.join("")}</div></section>
    </section>
    ${topic ? `<div class="interpretation-inline-actions"><a class="button button--text" href="${escapeHtml(route(recordId, origin, { view: "summary", regionId }))}">最初の確認へ戻る</a></div>` : ""}
  </div>`;
}

function renderEntryDialogue(output, origin) {
  if (output?.safety?.route !== "normal") {
    return `<div class="interpretation-room-view interpretation-room-view--summary"><section class="interpretation-dialogue-thread"><div class="interpretation-dialogue-meta"><small>RUNLOAD INTERPRETATION</small><span>${escapeHtml(formatDate(output?.context?.recordDate || ""))}</span></div><article class="interpretation-turn interpretation-turn--runload"><small>今回の確認</small><p>${escapeHtml(primaryMeaningText(output))}</p></article><p class="interpretation-dialogue-boundary">${escapeHtml(currentBoundaryText(output))}</p>${renderSafetyChoices(output)}</section></div>`;
  }
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || meaning(output).focusRegionIds?.[0] || "";
  const choices = [
    renderDialogueChoice(route(recordId, origin, { view: "dialogue", topic: "understand", regionId }), "この結果を理解したい", "意味や違いを必要な範囲で確認"),
    renderDialogueChoice(route(recordId, origin, { view: "dialogue", topic: "manage", regionId }), "次にどう活かすか考えたい", "自己管理に使う次の機能を絞る"),
  ];
  return renderDialogueFrame({
    output,
    title: "今回のRunLoad解釈",
    message: primaryMeaningText(output),
    prompt: "今、確認したいことはどちらですか？",
    choices,
    origin,
    showBoundary: true,
  });
}

function renderUnderstandDialogue(output, origin) {
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || meaning(output).focusRegionIds?.[0] || "";
  const modes = new Set(meaning(output).availableModes || []);
  const choices = [];
  if (modes.has("difference")) choices.push(renderDialogueChoice(route(recordId, origin, { view: "explain", mode: "difference", regionId }), "何が違うか確認", "変わった内容だけを見る"));
  if (modes.has("visual")) choices.push(renderDialogueChoice(route(recordId, origin, { view: "explain", mode: "visual", regionId }), "図で確認", "位置関係に変えて見る"));
  choices.push(renderDialogueChoice(route(recordId, origin, { view: "explain", mode: "simple", regionId }), "もっと簡単に", "短い3項目に分けて見る"));
  return renderDialogueFrame({
    output,
    title: "結果を理解する",
    message: "同じ情報を一度に増やさず、知りたい形に変えて確認できます。",
    prompt: "どの見方なら確認しやすいですか？",
    choices: choices.slice(0, 3),
    origin,
    topic: "understand",
  });
}

function enabledAction(output, id) {
  const item = findAction(output, id);
  return item?.enabled ? item : null;
}

function renderManageDialogue(output, origin) {
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || meaning(output).focusRegionIds?.[0] || "";
  const choices = [];
  const history = enabledAction(output, "history");
  const simulation = enabledAction(output, "simulation");
  if (history) choices.push(renderDialogueChoice(actionHref(history, output?.context?.origin || origin), "過去にも同じことがあるか確認", "履歴で比較可能な記録を確認"));
  if (simulation) choices.push(renderDialogueChoice(actionHref(simulation, output?.context?.origin || origin), "条件を変えて比べる", "Simulationで条件比較へ進む"));
  choices.push(renderDialogueChoice(route(recordId, origin, { view: "dialogue", topic: "next-use", regionId }), "次回に活かす", "予定・共有・背景確認から選ぶ"));
  return renderDialogueFrame({
    output,
    title: "次にどう活かすか",
    message: "次に知りたいことに合わせて、確認方法を選べます。",
    prompt: "次に確認したいことは何ですか？",
    choices: choices.slice(0, 3),
    origin,
    topic: "manage",
  });
}

function renderNextUseDialogue(output, origin) {
  const choices = [];
  const plan = enabledAction(output, "plan");
  const share = enabledAction(output, "share");
  const reading = enabledAction(output, "reading");
  if (plan) choices.push(renderDialogueChoice(actionHref(plan, output?.context?.origin || origin), "次の予定に反映", "Planで自分の予定を入力"));
  if (share) choices.push(renderDialogueChoice(actionHref(share, output?.context?.origin || origin), "誰かに共有する内容を整理", "Consultationで共有内容を選ぶ"));
  if (reading) choices.push(renderDialogueChoice(actionHref(reading, output?.context?.origin || origin), "関連する背景を確認", "Readingで一般的な研究背景を見る"));
  return renderDialogueFrame({
    output,
    title: "次回に活かす",
    message: "次回に向けて、予定・共有・背景確認のどれを使うか選べます。",
    prompt: "どの方法で続けますか？",
    choices: choices.slice(0, 3),
    origin,
    topic: "next-use",
    contextNote: output?.current?.facts?.nextCheckPoint || "",
  });
}

function renderDialogue(output, topic, origin) {
  const resolvedTopic = normalizeTopic(topic);
  if (resolvedTopic === "manage") return renderManageDialogue(output, origin);
  if (resolvedTopic === "next-use") return renderNextUseDialogue(output, origin);
  return renderUnderstandDialogue(output, origin);
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
  return renderEntryDialogue(output, origin);
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
    ${renderExplanationFollowup(output, origin)}
    <div class="interpretation-inline-actions"><a class="button button--text" href="${escapeHtml(route(recordId, origin, { view: "summary", regionId }))}">最初の確認へ戻る</a></div>
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
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return null;
  const span = Math.max(1e-9, domain.max - domain.min);
  const fraction = Math.max(0, Math.min(1, (Number(value) - domain.min) / span));
  return 36 + fraction * 248;
}

function markerSide(x, otherX, fallback = "above") {
  if (x == null || otherX == null) return fallback;
  return Math.abs(x - otherX) < 56 ? "below" : fallback;
}

function svgMarker(x, y, label, value, className, side = "above") {
  if (x == null) return "";
  const labelY = side === "below" ? y + 27 : y - 38;
  const valueY = side === "below" ? y + 45 : y - 20;
  return `<g class="${escapeHtml(className)}" data-label-side="${escapeHtml(side)}"><circle cx="${x.toFixed(1)}" cy="${y}" r="6"></circle><text x="${x.toFixed(1)}" y="${labelY}" text-anchor="middle">${escapeHtml(label)}</text><text x="${x.toFixed(1)}" y="${valueY}" text-anchor="middle">${escapeHtml(number(value))}</text></g>`;
}

function prototypeViewForRegion(regionId = "") {
  return PROTOTYPE_BODY_VIEWS.find((view) => view.paths.some(([id]) => id === regionId)) || null;
}

function renderBodyRegionLocator(output, region) {
  const view = prototypeViewForRegion(region?.regionId || "");
  if (!view || !region) return "";
  const regionLabels = new Map((output?.current?.regions || []).map((item) => [item.regionId, item.label]));
  const paths = view.paths.map(([regionId, d]) => {
    const isFocus = regionId === region.regionId;
    const label = regionLabels.get(regionId) || regionId;
    return `<path class="interpretation-body-region ${isFocus ? "is-focus" : "is-muted"}" data-region-id="${escapeHtml(regionId)}" d="${escapeHtml(d)}"><title>${escapeHtml(isFocus ? `注目: ${label}` : label)}</title></path>`;
  }).join("");
  return `<figure class="interpretation-body-locator" data-focus-region="${escapeHtml(region.regionId)}">
    <svg class="interpretation-body-locator-svg" viewBox="70 8 160 424" role="img" aria-label="${escapeHtml(`人体図で${region.label}を強調`)}">
      <g class="interpretation-body-silhouette">${view.silhouette}</g>
      <g class="interpretation-body-regions">${paths}</g>
    </svg>
    <figcaption><small>${escapeHtml(view.title)}で位置を確認</small><strong>注目: ${escapeHtml(region.label)}</strong></figcaption>
  </figure>`;
}

function renderComparisonArrow(fromX, toX, y, originLabel) {
  if (fromX == null || toX == null) return "";
  if (Math.abs(toX - fromX) < 2) {
    return `<g class="interpretation-comparison-same-position" data-arrow-origin="${escapeHtml(originLabel)}"><circle cx="${toX.toFixed(1)}" cy="${y}" r="11"></circle></g>`;
  }
  const direction = toX > fromX ? 1 : -1;
  const startX = fromX + direction * 10;
  const endX = toX - direction * 10;
  const backX = endX - direction * 8;
  const headPath = `M ${endX.toFixed(1)} ${y} L ${backX.toFixed(1)} ${(y - 5).toFixed(1)} L ${backX.toFixed(1)} ${(y + 5).toFixed(1)} Z`;
  return `<g class="interpretation-comparison-direction" data-arrow-origin="${escapeHtml(originLabel)}">
    <line class="interpretation-comparison-arrow" x1="${startX.toFixed(1)}" y1="${y}" x2="${endX.toFixed(1)}" y2="${y}" pathLength="1"></line>
    <path class="interpretation-comparison-arrowhead" d="${headPath}"></path>
  </g>`;
}

function renderRegionalVisual(output, { usePrevious = true } = {}) {
  const region = focusRegion(output);
  if (!region) return '<p>図にできる部位別結果がありません。</p>';
  const comparison = focusComparison(output);
  const previous = usePrevious && comparison?.comparablePreviousRecordId ? comparison.previousValue : null;
  const domain = visualDomain([100, region.value, previous]);
  const xRef = visualX(100, domain);
  const xCurrent = visualX(region.value, domain);
  const xPrevious = visualX(previous, domain);
  const previousSide = markerSide(xPrevious, xRef, "above");
  const currentSide = markerSide(xCurrent, xRef, previousSide === "below" ? "above" : "below");
  const arrowOriginX = xPrevious ?? xRef;
  const arrowOriginLabel = xPrevious == null ? "reference" : "previous";
  const directionLabel = xPrevious == null ? "基準100 → 今回" : "前回 → 今回";
  const ariaSummary = xPrevious == null ? "基準100と今回の位置" : "前回・基準100・今回の位置";
  return `<article class="interpretation-visual-card interpretation-visual-card--regional"><div class="interpretation-visual-card__head"><small>選択した1部位の中で比較</small><h2>${escapeHtml(region.label)}</h2></div>
    <div class="interpretation-regional-visual">
      ${renderBodyRegionLocator(output, region)}
      <div class="interpretation-local-comparison">
        <div class="interpretation-visual-direction"><small>比較方向</small><strong>${escapeHtml(directionLabel)}</strong><span>矢印は比較の向きだけを示します。</span></div>
        <svg class="interpretation-comparison-svg interpretation-comparison-svg--directional" viewBox="0 0 320 132" role="img" aria-label="${escapeHtml(`${region.label}の${ariaSummary}。矢印は${directionLabel}の比較方向を示す`)}">
          <line class="interpretation-comparison-axis" x1="36" y1="64" x2="284" y2="64"></line>
          ${renderComparisonArrow(arrowOriginX, xCurrent, 64, arrowOriginLabel)}
          ${svgMarker(xPrevious, 64, "前回", previous, "marker-previous", previousSide)}
          ${svgMarker(xRef, 64, "基準", 100, "marker-reference", "above")}
          ${svgMarker(xCurrent, 64, "今回", region.value, "marker-current", currentSide)}
        </svg>
      </div>
    </div>
    <p class="source-boundary">人体図の強調は注目する位置を示します。比較図は${escapeHtml(region.label)}の中だけで読み、色や矢印から危険・安全・改善・悪化を判断しません。別の部位との大小比較にも使いません。</p></article>`;
}
function compactConditionText(output) {
  const labels = conditionLabels(output);
  if (!labels.length) return "";
  const visible = labels.slice(0, 2);
  const remainder = labels.length - visible.length;
  return `${visible.join("、")}${remainder > 0 ? `、ほか${remainder}件` : ""}`;
}

function renderConditionContext(output) {
  const text = compactConditionText(output);
  if (!text) return "";
  return `<aside class="interpretation-condition-context" data-condition-context="separate">
    <small>前回と異なる走行条件</small>
    <p>${escapeHtml(text)}</p>
    <span>部位別結果とは別の情報として確認します。</span>
  </aside>`;
}

function renderConditionResultUnderstanding(output) {
  if (meaning(output).primaryCode !== "CONDITION_AND_RESULT_CHANGED") return "";
  const region = focusRegion(output);
  const text = compactConditionText(output);
  if (!region || !text) return "";
  return `<div class="interpretation-visual-insight" data-reveal-step="explanation"><small>この図で分かること</small><p>${escapeHtml(`今回は、${region.label}の表示と${text}の両方が前回と異なります。ただし、この比較だけで走行条件を部位別結果の原因とは判断できません。`)}</p></div>`;
}

function renderCurrentShiftUnderstanding(output) {
  if (meaning(output).primaryCode !== "CURRENT_SHIFT_WITH_HISTORY") return "";
  const region = focusRegion(output);
  const comparison = focusComparison(output);
  if (!region || !comparison?.comparablePreviousRecordId) return "";
  return `<div class="interpretation-visual-insight" data-reveal-step="explanation"><small>この図で分かること</small><p>${escapeHtml(`${region.label}は、比較可能な前回${number(comparison.previousValue)}から今回${number(region.value)}へ、同じ部位内で表示位置が変わっています。`)}</p></div>`;
}

function renderCurrentReferenceUnderstanding(output) {
  if (meaning(output).primaryCode !== "CURRENT_REFERENCE_PATTERN") return "";
  const region = focusRegion(output);
  if (!region) return "";
  return `<div class="interpretation-visual-insight" data-reveal-step="explanation"><small>この図で分かること</small><p>${escapeHtml(`${region.label}は今回${number(region.value)}で、${directionText(region.referenceDirection)}に表示されています。この位置は、次回以降に同じ部位を比べるための比較点として使えます。`)}</p></div>`;
}

function renderRepeatedObservationVisual(output) {
  const region = focusRegion(output);
  const repeated = meaningFact(output, "REGION_REPEATED_DIRECTION");
  if (!region || !repeated) return renderRegionalVisual(output);
  const comparableCount = Math.max(0, Number(repeated.pastComparableCount) || 0);
  const matchingCount = Math.max(0, Math.min(comparableCount, Number(repeated.pastMatchingCount) || 0));
  const dots = Array.from({ length: comparableCount }, (_, index) => (
    `<span class="interpretation-repeat-dot ${index < matchingCount ? "is-match" : "is-other"}" aria-hidden="true"></span>`
  )).join("");
  return `<article class="interpretation-visual-card interpretation-visual-card--repeated">
    <div class="interpretation-visual-card__head"><small>同じ部位の比較可能な記録だけを確認</small><h2>${escapeHtml(region.label)}</h2></div>
    <div class="interpretation-repeated-layout">
      ${renderBodyRegionLocator(output, region)}
      <div class="interpretation-repeated-count" aria-label="${escapeHtml(`比較可能な過去${comparableCount}件のうち${matchingCount}件でも今回と同じ方向`)}">
        <div class="interpretation-repeat-current"><span class="interpretation-repeat-dot is-current" aria-hidden="true"></span><span><small>今回</small><strong>${escapeHtml(directionText(repeated.currentDirection))}</strong></span></div>
        <div class="interpretation-repeat-history"><small>比較可能な過去${comparableCount}件</small><div class="interpretation-repeat-dots">${dots}</div></div>
        <p>過去${escapeHtml(String(comparableCount))}件のうち${escapeHtml(String(matchingCount))}件でも、今回と同じ方向に表示されています。</p>
      </div>
    </div>
    <p class="source-boundary">記録点は確認された回数を表すだけです。体質、傾向、けがの起こりやすさを示しません。</p>
  </article>`;
}

function renderRepeatedObservationUnderstanding(output) {
  if (meaning(output).primaryCode !== "REPEATED_OBSERVATION") return "";
  const repeated = meaningFact(output, "REGION_REPEATED_DIRECTION");
  if (!repeated) return "";
  return `<div class="interpretation-visual-insight" data-reveal-step="explanation"><small>この図で分かること</small><p>${escapeHtml(`今回は、比較可能な過去${repeated.pastComparableCount}件のうち${repeated.pastMatchingCount}件でも同じ方向が確認されています。ここから体質や将来の結果までは判断しません。`)}</p></div>`;
}

function renderMultiLayerVisual(output) {
  const regional = renderRegionalVisual(output);
  const rof = renderRofVisual(output);
  if (!rof) return regional;
  return `<div class="interpretation-layer-pair" data-layer-pair="separate-scales">
    <section class="interpretation-layer-lane" data-information-layer="regional">
      <small>情報1 · 部位別結果</small>
      ${regional}
    </section>
    <div class="interpretation-layer-separator">別の尺度</div>
    <section class="interpretation-layer-lane" data-information-layer="rof">
      <small>情報2 · 主観情報</small>
      ${rof}
    </section>
  </div>`;
}

function renderMultiLayerUnderstanding(output) {
  if (meaning(output).primaryCode !== "MULTI_LAYER_CHANGE") return "";
  const region = focusRegion(output);
  if (!region) return "";
  return `<div class="interpretation-visual-insight" data-reveal-step="explanation"><small>この図で分かること</small><p>${escapeHtml(`今回は、${region.label}の部位別表示と走行前後の疲労感の両方に違いがあります。2つは別の尺度で、どちらか一方をもう一方の原因として扱いません。`)}</p></div>`;
}

function renderRofVisual(output) {
  const rof = output?.current?.rof || {};
  if (!Number.isFinite(rof.pre) || !Number.isFinite(rof.post)) return "";
  const domain = { min: 0, max: 10 };
  return `<article class="interpretation-visual-card interpretation-visual-card--rof"><div class="interpretation-visual-card__head"><small>主観的な疲労感 0–10</small><h2>走行前後の疲労感</h2></div>
    <svg class="interpretation-comparison-svg" viewBox="0 0 320 132" role="img" aria-label="走行前後の疲労感の位置">
      <line class="interpretation-comparison-axis" x1="36" y1="64" x2="284" y2="64"></line>
      ${svgMarker(visualX(rof.pre, domain), 64, "走行前", rof.pre, "marker-previous", markerSide(visualX(rof.pre, domain), visualX(rof.post, domain), "above"))}
      ${svgMarker(visualX(rof.post, domain), 64, "走行後", rof.post, "marker-current", "above")}
    </svg>
    <p class="source-boundary">疲労感は本人が記録した主観情報です。部位別の基準100とは別の尺度です。</p></article>`;
}

function renderVisualExplanation(output, origin) {
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || meaning(output).focusRegionIds?.[0] || "";
  const code = meaning(output).primaryCode || "";
  const region = focusRegion(output);
  const currentShiftPattern = code === "CURRENT_SHIFT_WITH_HISTORY";
  const conditionResultPattern = code === "CONDITION_AND_RESULT_CHANGED";
  const multiLayerPattern = code === "MULTI_LAYER_CHANGE";
  const repeatedPattern = code === "REPEATED_OBSERVATION";
  const currentReferencePattern = code === "CURRENT_REFERENCE_PATTERN";
  const lead = currentShiftPattern && region
    ? `まず${region.label}の位置を確認し、比較可能な前回から今回への違いだけを見ます。`
    : conditionResultPattern && region
      ? `まず${region.label}の前回との差を確認し、走行条件の違いは別枠で確認します。`
      : multiLayerPattern && region
        ? `${region.label}の部位別表示と主観的な疲労感を、別の尺度として順に確認します。`
        : repeatedPattern && region
          ? `${region.label}について、比較可能な過去記録で今回と同じ方向が何件あったかを確認します。`
          : currentReferencePattern && region
            ? `${region.label}について、基準100から今回の位置だけを確認します。`
            : "同じ解釈を、数値の位置関係に変えて確認します。";
  const visualPattern = currentShiftPattern
    ? "locate-compare"
    : conditionResultPattern
      ? "condition-result-separated"
      : multiLayerPattern
        ? "separate-layers"
        : repeatedPattern
          ? "repeated-count"
          : currentReferencePattern
            ? "reference-current"
            : "general";
  const visualBody = currentShiftPattern
    ? `${renderRegionalVisual(output)}${renderCurrentShiftUnderstanding(output)}`
    : conditionResultPattern
      ? `${renderRegionalVisual(output)}${renderConditionContext(output)}${renderConditionResultUnderstanding(output)}`
      : multiLayerPattern
        ? `${renderMultiLayerVisual(output)}${renderMultiLayerUnderstanding(output)}`
        : repeatedPattern
          ? `${renderRepeatedObservationVisual(output)}${renderRepeatedObservationUnderstanding(output)}`
          : currentReferencePattern
            ? `${renderRegionalVisual(output, { usePrevious: false })}${renderCurrentReferenceUnderstanding(output)}`
            : `${renderRegionalVisual(output)}${renderRofVisual(output)}`;
  return `<div class="interpretation-room-view interpretation-room-view--explain interpretation-room-view--visual" data-visual-pattern="${visualPattern}" data-guided-stage="understand-visual">
    <header class="interpretation-view-head"><p>RunLoad解釈</p><h1>図で見る</h1><p>${escapeHtml(lead)}</p></header>
    <section class="interpretation-visual-stack" data-reveal-step="visual">${visualBody}</section>
    ${renderExplanationFollowup(output, origin)}
    <div class="interpretation-inline-actions"><a class="button button--text" href="${escapeHtml(route(recordId, origin, { view: "summary", regionId }))}">最初の確認へ戻る</a></div>
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
    ${renderExplanationFollowup(output, origin)}
    <div class="interpretation-inline-actions"><a class="button button--text" href="${escapeHtml(route(recordId, origin, { view: "summary", regionId }))}">最初の確認へ戻る</a></div>
  </div>`;
}

function renderExplanationFollowup(output, origin) {
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || meaning(output).focusRegionIds?.[0] || "";
  return `<section class="interpretation-dialogue-followup" data-reveal-step="choices"><h2>次に確認するなら</h2><div class="interpretation-dialogue-choice-list">
    ${renderDialogueChoice(route(recordId, origin, { view: "evidence", regionId }), "なぜこの解釈なのか確認", "保存結果の根拠を見る")}
    ${renderDialogueChoice(route(recordId, origin, { view: "dialogue", topic: "manage", regionId }), "次にどう活かすか考える", "自己管理に使う機能を絞る")}
  </div></section>`;
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
  return renderDialogue(output, intent === "support" ? "next-use" : "manage", origin);
}

export function renderInterpretationRoom({ output, view = "summary", mode = "simple", topic = "understand", intent = "", origin = "result" } = {}) {
  const resolvedView = normalizeView(view);
  const resolvedIntent = normalizeIntent(intent);
  if (!output?.targetRecordId) {
    return '<div class="interpretation-room-view interpretation-room-view--empty"><header class="interpretation-view-head"><p>RunLoad解釈</p><h1>対象の保存記録がありません。</h1></header><a class="button button--primary" href="#/record-input">記録を始める</a></div>';
  }
  if (resolvedView === "dialogue") return renderDialogue(output, topic, origin);
  if (resolvedView === "explain") return renderExplanation(output, mode, origin);
  if (resolvedView === "detail") return renderDetail(output, resolvedIntent, origin);
  if (resolvedView === "evidence") return renderEvidence(output, resolvedIntent, origin);
  if (resolvedView === "next") return renderNext(output, resolvedIntent, origin);
  return renderSummary(output, origin);
}

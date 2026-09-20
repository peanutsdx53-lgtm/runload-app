import { escapeHtml } from "./commonComponents.js";

const VIEW_SET = new Set(["summary", "detail", "evidence", "next"]);
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
  if (direction === "ABOVE_REFERENCE") return "基準より上";
  if (direction === "BELOW_REFERENCE") return "基準より下";
  if (direction === "REFERENCE_VICINITY") return "基準付近";
  return "数値なし";
}

function summaryToken(output, token) {
  return output?.interpretation?.summaryTokens?.find?.((item) => item.token === token)?.values || {};
}

function regionalSummary(output) {
  const counts = summaryToken(output, "REGIONAL_COUNTS");
  const available = Number(counts.available || 0);
  const unavailable = Number(counts.unavailable || 0);
  const above = Number(counts.above || 0);
  const near = Number(counts.near || 0);
  const below = Number(counts.below || 0);
  if (!available) return "この記録では12部位の数値を表示できません。";
  if (unavailable > 0) {
    return `数値を確認できる${available}部位では、基準より上が${above}部位、基準付近が${near}部位、基準より下が${below}部位です。${unavailable}部位は数値を表示できません。`;
  }
  return `今回の12部位では、基準より上が${above}部位、基準付近が${near}部位、基準より下が${below}部位です。`;
}

function fatigueSummary(output) {
  const rof = output?.current?.rof || {};
  if (Number.isFinite(rof.pre) && Number.isFinite(rof.post) && Number.isFinite(rof.delta)) {
    return `疲労感は走行前${number(rof.pre, 0)}、走行後${number(rof.post, 0)}で、前後差は${signed(rof.delta, 0)}です。`;
  }
  return "走行前後の疲労感は直接比較できません。";
}

function historySummary(output) {
  const comparable = Number(summaryToken(output, "PREVIOUS_REGIONAL_DIFFERENCE_COUNT").count || 0);
  if (!output?.availability?.regionalHistory) return "直接比較できる過去記録はありません。";
  if (comparable > 0) return `比較可能な前回記録と差がある部位は${comparable}部位です。`;
  return "比較可能な過去記録があります。各部位の差は詳細で確認できます。";
}

function conditionSummary(output) {
  const differences = output?.comparison?.conditionDifferences || [];
  if (!differences.length) return "前回との走行条件の違いは表示されていません。";
  const labels = differences.map((item) => CONDITION_LABELS[item.labelToken] || item.labelToken).filter(Boolean);
  return `前回とは${labels.join("、")}が異なります。`;
}

function selectedRegionalDifference(output) {
  const ids = output?.interpretation?.selectedRegionIds || [];
  return ids.map((id) => {
    const region = output?.current?.regions?.find?.((item) => item.regionId === id);
    const comparison = output?.comparison?.regionalById?.[id];
    if (!region) return "";
    const current = `${region.label}は${number(region.value)}で、${directionText(region.referenceDirection)}です。`;
    if (!comparison?.comparablePreviousRecordId || !Number.isFinite(comparison.delta)) return current;
    return `${current} 比較可能な前回記録との差は${signed(comparison.delta)}です。`;
  }).filter(Boolean);
}

function integratedSummary(output) {
  if (!output?.targetRecordId) return "対象の保存記録がありません。";
  const parts = [regionalSummary(output)];
  if (output?.availability?.rofPair) parts.push(fatigueSummary(output));
  if (output?.availability?.regionalHistory) parts.push(historySummary(output));
  const focus = selectedRegionalDifference(output);
  if (focus.length) parts.push(...focus);
  if (output?.availability?.conditionComparison) parts.push(conditionSummary(output));
  if (output?.interpretation?.summaryCodes?.includes?.("NON_CAUSAL_BOUNDARY_REQUIRED")) {
    parts.push("走行条件と部位別結果の違いが同時に確認されても、両者の因果関係はこの結果から判断しません。");
  }
  return parts.join(" ");
}

function renderStatusGrid(output) {
  const regionalText = output?.availability?.regional ? regionalSummary(output) : "12部位の数値を表示できません。";
  const fatigueText = output?.availability?.rofPair ? fatigueSummary(output) : "走行前後の疲労感は直接比較できません。";
  const historyText = output?.availability?.regionalHistory ? historySummary(output) : "直接比較できる過去記録はありません。";
  return `<section class="interpretation-status-grid" aria-label="今回の確認状態">
    <div><small>12部位</small><strong>${escapeHtml(regionalText)}</strong></div>
    <div><small>疲労感</small><strong>${escapeHtml(fatigueText)}</strong></div>
    <div><small>過去比較</small><strong>${escapeHtml(historyText)}</strong></div>
  </section>`;
}

function renderSelectedRegions(output) {
  const ids = output?.interpretation?.selectedRegionIds || [];
  if (!ids.length) return "";
  const items = ids.map((id) => {
    const region = output.current.regions.find((item) => item.regionId === id);
    const comparison = output.comparison.regionalById?.[id];
    if (!region) return "";
    return `<article class="interpretation-region-focus"><h3>${escapeHtml(region.label)}</h3><p>${escapeHtml(`${number(region.value)}・${directionText(region.referenceDirection)}`)}</p>${comparison?.comparablePreviousRecordId ? `<p>${escapeHtml(`前回との差 ${signed(comparison.delta)}`)}</p>` : '<p>直接比較できる前回記録はありません。</p>'}</article>`;
  }).join("");
  return items ? `<div class="interpretation-region-focus-list">${items}</div>` : "";
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
  if (action.destination === "simulation" && !query.has("from")) query.set("from", "interpretation-room");\n  if (action.destination === "simulation" && roomOrigin && !query.has("roomOrigin")) query.set("roomOrigin", roomOrigin);
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

function renderDefaultChoices(output, origin) {
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || "";
  return `<section class="interpretation-choice-section"><h2>確認する内容を選択してください。</h2><div class="interpretation-choice-list">
    ${renderChoice(route(recordId, origin, { view: "detail", intent: "current", regionId }), "今回の結果を詳しく確認", "12部位と疲労感を分けて確認")}
    ${renderChoice(route(recordId, origin, { view: "detail", intent: "history", regionId }), "過去記録との違いを確認", "直接比較できる記録だけを確認", !output?.availability?.regionalHistory)}
    ${renderChoice(route(recordId, origin, { view: "next", intent: "condition", regionId }), "条件を変えた場合を確認", "条件比較へ進む", !findAction(output, "simulation")?.enabled)}
    ${renderChoice(route(recordId, origin, { view: "next", intent: "support", regionId }), "相談・読みものへ進む", "共有準備または関連情報を確認")}
  </div></section>`;
}

function renderSummary(output, origin) {
  const noHistory = !output?.availability?.regionalHistory;
  return `<div class="interpretation-room-view interpretation-room-view--summary">
    <section class="interpretation-primary">
      <div class="interpretation-target"><small>RUNLOAD INTERPRETATION</small><span>${escapeHtml(formatDate(output?.context?.recordDate || ""))}</span></div>
      <h1>RunLoad解釈</h1>
      <p class="interpretation-intro">${escapeHtml(noHistory ? "今回の結果を表示します。直接比較できる過去記録はありません。" : "今回の結果と比較可能な過去記録から、確認できる内容を表示します。")}</p>
      <p class="interpretation-summary-text">${escapeHtml(integratedSummary(output))}</p>
      <p class="source-boundary">上・下は、その部位自身の基準100に対する方向です。良否、危険度、部位間の順位を示しません。</p>
    </section>
    ${renderStatusGrid(output)}
    ${renderSelectedRegions(output)}
    ${output?.safety?.route === "normal" ? renderDefaultChoices(output, origin) : renderSafetyChoices(output)}
  </div>`;
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
  const regionId = output?.context?.selectedRegionId || "";
  return `<div class="interpretation-room-view interpretation-room-view--detail">
    <header class="interpretation-view-head"><p>RunLoad解釈</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(historyOnly ? "同じ部位・同じ計算方法・同じ基準で直接比較できる保存記録だけを表示します。" : "12部位と疲労感を別の情報として確認します。")}</p></header>
    <section class="interpretation-panel"><h2>${historyOnly ? "12部位の過去比較" : "12部位"}</h2>${renderRegionTable(output, historyOnly)}<p class="source-boundary">各部位は、その部位自身の基準100と比較します。別部位どうしの数値を順位付けしません。</p></section>
    ${historyOnly ? "" : renderRofDetail(output)}
    <div class="interpretation-inline-actions">
      <a class="button button--secondary" href="${escapeHtml(route(recordId, origin, { view: "evidence", intent, regionId }))}">この解釈の根拠を確認</a>
      <a class="button button--secondary" href="${escapeHtml(route(recordId, origin, { view: "next", intent, regionId }))}">次に確認する内容</a>
      <a class="button button--text" href="${escapeHtml(route(recordId, origin, { view: "summary", regionId }))}">RunLoad解釈へ戻る</a>
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
  const regionId = output?.context?.selectedRegionId || "";
  const regions = regionId ? (output.current.regions || []).filter((item) => item.regionId === regionId) : (output.current.regions || []);
  return `<div class="interpretation-room-view interpretation-room-view--evidence">
    <header class="interpretation-view-head"><p>RunLoad解釈</p><h1>この解釈の根拠</h1><p>保存された部位別結果が表す内容と、結果に保持されている基礎資料を確認します。</p></header>
    <section class="interpretation-panel"><h2>この数値の基礎となる資料</h2><p>ここでは保存結果に保持されている資料情報を表示します。今回の計算に関係する全文献を完全列挙する表示ではありません。</p>${regions.map((region) => renderEvidenceRegion(output, region)).join("")}</section>
    <section class="interpretation-panel"><h2>この結果から判断しないこと</h2><ul><li>診断、けがの発生確率、原因</li><li>安全性、危険度、走行可否</li><li>異なる部位どうしの物理的な大小順位</li><li>走行条件と部位別結果の因果関係</li></ul></section>
    <div class="interpretation-inline-actions"><a class="button button--text" href="${escapeHtml(route(recordId, origin, { view: "detail", intent, regionId }))}">詳細へ戻る</a><a class="button button--text" href="${escapeHtml(route(recordId, origin, { view: "summary", regionId }))}">RunLoad解釈へ戻る</a></div>
  </div>`;
}

function renderAction(output, id, description = "") {
  const action = findAction(output, id);
  if (!action) return "";
  return renderChoice(actionHref(action, output?.context?.origin || "result"), ACTION_LABELS[action.labelToken] || action.labelToken, description, !action.enabled);
}

function renderNext(output, intent, origin) {
  const recordId = output?.targetRecordId || "";
  const regionId = output?.context?.selectedRegionId || "";
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
  return `<div class="interpretation-room-view interpretation-room-view--next"><header class="interpretation-view-head"><p>RunLoad解釈</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></header>${nextCheck ? `<section class="interpretation-carry"><small>記録した「次回確認したいこと」</small><p>${escapeHtml(nextCheck)}</p></section>` : ""}<section class="interpretation-choice-section"><div class="interpretation-choice-list">${choices}</div></section><div class="interpretation-inline-actions"><a class="button button--text" href="${escapeHtml(route(recordId, origin, { view: "summary", regionId }))}">RunLoad解釈へ戻る</a></div></div>`;
}

export function renderInterpretationRoom({ output, view = "summary", intent = "", origin = "result" } = {}) {
  const resolvedView = normalizeView(view);
  const resolvedIntent = normalizeIntent(intent);
  if (!output?.targetRecordId) {
    return '<div class="interpretation-room-view interpretation-room-view--empty"><header class="interpretation-view-head"><p>RunLoad解釈</p><h1>対象の保存記録がありません。</h1></header><a class="button button--primary" href="#/record-input">記録を始める</a></div>';
  }
  if (resolvedView === "detail") return renderDetail(output, resolvedIntent, origin);
  if (resolvedView === "evidence") return renderEvidence(output, resolvedIntent, origin);
  if (resolvedView === "next") return renderNext(output, resolvedIntent, origin);
  return renderSummary(output, origin);
}

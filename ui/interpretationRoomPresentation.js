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
  simulation: Object.freeze({ title: "条件を変えて確かめる", note: "今回の記録をそのまま基準にして、変更した条件だけで12部位表示を再計算します。" }),
  plan: Object.freeze({ title: "次の記録につなげる", note: "今回確認した内容を見ながら、次の走りや休養を準備します。" }),
  share: Object.freeze({ title: "人に見せる形に整理する", note: "今回確認できた事実を共有しやすい形にまとめます。" }),
  reading: Object.freeze({ title: "計算と背景を詳しく読む", note: "結果の読み方と保存されている資料情報を確認します。" }),
  "official-help": Object.freeze({ title: "公的サポートを確認する", note: "入力内容に応じた相談先や案内を確認します。" }),
  "review-input": Object.freeze({ title: "入力した内容を確認する", note: "今回の入力内容を見直します。" }),
  record: Object.freeze({ title: "記録を始める", note: "新しい走行記録を入力します。" }),
});

function actionCopy(action) {
  return ACTION_COPY[action?.actionId] || Object.freeze({
    title: "次の画面へ進む",
    note: "今回の内容を引き継いで確認します。",
  });
}

function renderAction(action, output, { primary = false } = {}) {
  if (!action || action.enabled === false) return "";
  const copy = actionCopy(action);
  return `<a class="interpretation-room-action${primary ? " interpretation-room-action--primary" : ""}" href="${escapeHtml(actionHref(action, output))}">
    <span><strong>${escapeHtml(copy.title)}</strong><small>${escapeHtml(copy.note)}</small></span><i aria-hidden="true">›</i>
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
  if (code === "CONDITION_AND_RESULT_CHANGED") return "前回から走行条件と部位表示の両方に変化があります。並べて確認できますが、原因と結果としては結び付けません。";
  if (code === "MULTI_LAYER_CHANGE") return "部位表示と本人が記録した疲労感の両方に変化があります。2つは別の情報として一緒に確認します。";
  if (code === "CURRENT_SHIFT_WITH_HISTORY") return "前回と比べられる部位に変化があります。部位ごとに前回との差を確認できます。";
  if (code === "CURRENT_REFERENCE_PATTERN") return "今回の12部位を、それぞれの部位自身の基準100との関係で確認できます。";
  return "今回の12部位・過去記録・本人の疲労感・走行条件を、混同しないよう分けて整理します。";
}

function renderSummary(output) {
  const counts = output?.overview?.attention?.counts || {};
  const subjective = output?.subjectiveContext || {};
  const conditionCount = Number(counts.conditionDifferences || 0);
  const fatigueValue = subjective?.difference?.eligible ? signed(subjective.difference.value, 0) : "—";
  const previousCopy = Number(counts.previousComparable || 0) > 0
    ? `前回比較できる ${Number(counts.previousComparable || 0)}部位のうち、1ポイント以上の変化を${Number(counts.previousChanged || 0)}部位で確認できます。`
    : "同じ方法で比べられる前回記録はまだありません。";
  const fatigueCopy = subjective?.difference?.eligible
    ? `本人が記録した疲労感は ${number(subjective.pre?.value, 0)} → ${number(subjective.post?.value, 0)}（差 ${signed(subjective.difference.value, 0)}）です。`
    : "走る前後の疲労感は、前後差としてそろっていません。";
  const conditionCopy = !output?.conditions?.previousRecordId
    ? "走行条件を比較できる前回記録はまだありません。"
    : conditionCount
      ? `前回から変わった走行条件は${conditionCount}項目です。`
      : "前回と比較できる走行条件に変更項目はありません。";

  return `<section class="interpretation-room-summary" aria-labelledby="interpretation-summary-title">
    <div class="interpretation-room-kicker">RUNLOAD INTERPRETATION</div>
    <h2 id="interpretation-summary-title">今回のRunLoad解釈</h2>
    <p class="interpretation-room-summary__lead">${escapeHtml(meaningLead(output))}</p>
    <div class="interpretation-room-summary__metrics">
      <div><strong>${escapeHtml(String(Number(counts.available || 0)))}</strong><span>/ 12</span><small>部位数値あり</small></div>
      <div><strong>${escapeHtml(String(Number(counts.previousChanged || 0)))}</strong><span>部位</span><small>前回から変化</small></div>
      <div><strong>${escapeHtml(fatigueValue)}</strong><span></span><small>疲労感の前後差</small></div>
      <div><strong>${escapeHtml(String(conditionCount))}</strong><span>項目</span><small>前回から条件変更</small></div>
    </div>
    <div class="interpretation-room-summary__facts">
      <p>${escapeHtml(previousCopy)}</p>
      <p>${escapeHtml(fatigueCopy)}</p>
      <p>${escapeHtml(conditionCopy)}</p>
    </div>
  </section>`;
}

const REASON_COPY = Object.freeze({
  REPEATED_DIRECTION: Object.freeze({ title: "過去にも同じ方向が確認された", note: "今回だけでなく、同じ部位で同方向の記録が過去にも複数あります。" }),
  PREVIOUS_CHANGE: Object.freeze({ title: "前回から変化がある", note: "同じ方法で比較できる前回から1ポイント以上変化しています。" }),
  REFERENCE_POSITION: Object.freeze({ title: "今回は基準100から離れている", note: "前回差ではなく、その部位自身の基準100との位置から確認します。" }),
  REFERENCE_NEAR: Object.freeze({ title: "今回は基準100付近", note: "その部位自身の基準100付近にあります。" }),
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
  return `<section class="interpretation-room-attention" aria-labelledby="interpretation-attention-title">
    <div class="interpretation-room-section-title"><div><small>部位を順位付けせずに整理</small><h2 id="interpretation-attention-title">注目する理由から見る</h2></div><p>各部位は独立した基準で計算しています。ここでは「なぜ確認するか」で分けます。</p></div>
    <div class="interpretation-room-reason-groups">${groups.map((group) => {
      const copy = REASON_COPY[group.code] || { title: group.code, note: "" };
      return `<article class="interpretation-room-reason-group" data-reason="${escapeHtml(group.code)}">
        <header><div><strong>${escapeHtml(copy.title)}</strong><small>${escapeHtml(copy.note)}</small></div><span>${group.regions.length}部位</span></header>
        <div class="interpretation-room-reason-list">${group.regions.map((region) => `<a href="${escapeHtml(regionHref(output, region.regionId))}" data-direction="${escapeHtml(directionKey(region.referenceDirection))}">
          <span><strong>${escapeHtml(region.label)}</strong><small>${escapeHtml(reasonRegionMeta(region))}</small></span><b>${escapeHtml(number(region.value))}</b><i aria-hidden="true">›</i>
        </a>`).join("")}</div>
      </article>`;
    }).join("")}</div>
    <p class="interpretation-room-boundary-line">部位どうしの数値の大小を、身体負荷や重要度の順位として扱いません。</p>
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
  const reference = region.referenceComparison || {};
  const previous = region.previousComparison || {};
  const currentDate = output?.target?.date || "";
  const current = finite(region.value) ? number(region.value) : "—";
  const previousBlock = previous.available
    ? `<div class="interpretation-room-region-stat"><small>前回</small><strong>${escapeHtml(number(previous.previousValue))}</strong><span>${escapeHtml(previous.date ? formatLocalDate(previous.date) : "前回")} → 今回 ${escapeHtml(signed(previous.difference))}</span></div>`
    : '<div class="interpretation-room-region-stat"><small>前回</small><strong>—</strong><span>比較できる過去記録なし</span></div>';

  return `<section class="interpretation-room-region-detail" aria-labelledby="interpretation-region-title">
    <div class="interpretation-room-region-detail__heading">
      <div><small>この部位を整理</small><h2 id="interpretation-region-title">${escapeHtml(region.label)}</h2></div>
      <a href="${escapeHtml(regionHref(output, ""))}">部位一覧へ戻る</a>
    </div>
    <div class="interpretation-room-region-stats">
      <div class="interpretation-room-region-stat is-current" data-direction="${escapeHtml(directionKey(reference.direction))}"><small>今回</small><strong>${escapeHtml(current)}</strong><span>${escapeHtml(referenceText(reference.direction))}・基準との差 ${escapeHtml(signed(reference.difference))}</span></div>
      ${previousBlock}
      <div class="interpretation-room-region-stat"><small>比較できる過去</small><strong>${escapeHtml(String(Number(region?.personalHistory?.comparableCount || 0)))}</strong><span>同じ部位・同じ計算基準の保存記録</span></div>
    </div>
    <div class="interpretation-room-history-panel"><header><strong>この部位の最近の推移</strong><small>破線＝この部位自身の基準100</small></header>${historyChart(region, currentDate)}</div>
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
  return `<section class="interpretation-room-conditions" aria-labelledby="interpretation-conditions-title">
    <div class="interpretation-room-section-title"><div><small>前回から変わった走行事実</small><h2 id="interpretation-conditions-title">条件の違いを並べる</h2></div><p>条件と部位表示を一緒に確認できますが、条件が数値変化の原因だったとは判断しません。</p></div>
    <div class="interpretation-room-condition-table" role="table" aria-label="前回から変わった条件">
      <div class="interpretation-room-condition-row is-head" role="row"><span role="columnheader">項目</span><span role="columnheader">前回</span><span role="columnheader">今回</span><span role="columnheader">${selected ? "この部位での扱い" : "RunLoadでの確認"}</span></div>
      ${rows.map((item) => `<div class="interpretation-room-condition-row" role="row"><strong role="cell">${escapeHtml(conditionLabel(item.id))}</strong><span role="cell">${escapeHtml(conditionValue(item.id, item.previous))}</span><span role="cell">${escapeHtml(conditionValue(item.id, item.current))}</span><small role="cell">${escapeHtml(relationshipText(item.relationship))}</small></div>`).join("")}
    </div>
  </section>`;
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
  const pre = context.pre || {};
  const post = context.post || {};
  const pair = context.difference?.eligible;
  const preCard = pre.available ? `<div><small>走る前</small><strong>${escapeHtml(number(pre.value,0))}<em>/10</em></strong><span>${escapeHtml(rofMeaningText(pre))}</span></div>` : "";
  const postCard = post.available ? `<div><small>走った後</small><strong>${escapeHtml(number(post.value,0))}<em>/10</em></strong><span>${escapeHtml(rofMeaningText(post))}</span></div>` : "";
  const body = pair
    ? `${preCard}<i aria-hidden="true">→</i>${postCard}<aside><small>前後差</small><strong>${escapeHtml(signed(context.difference.value,0))}</strong></aside>`
    : `${preCard}${postCard}<aside><small>前後差</small><strong>—</strong><span>前後がそろっていないため差は出しません</span></aside>`;
  return `<section class="interpretation-room-subjective" aria-labelledby="interpretation-subjective-title">
    <div class="interpretation-room-section-title"><div><small>本人の記録</small><h2 id="interpretation-subjective-title">走る前後の疲労感</h2></div><p>12部位の数値とは別の主観情報として確認します。</p></div>
    <div class="interpretation-room-fatigue${pair ? "" : " is-partial"}">${body}</div>
    <p class="interpretation-room-boundary-line">疲労感と部位別の数値を足し合わせたり、どちらかを原因として扱いません。</p>
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
    <p class="interpretation-room-boundary-line">ここで示すのはRunLoad内部の計算経路です。身体で実際に起きた原因を示すものではありません。</p>
  </div></details>`;
}

function renderUnderstanding(output) {
  const counts = output?.overview?.attention?.counts || {};
  const known = [];
  if (Number(counts.available || 0)) known.push(`${Number(counts.available)}部位の数値を、それぞれの部位自身の基準100との関係で確認できます。`);
  if (Number(counts.previousComparable || 0)) known.push(`前回と比較できる${Number(counts.previousComparable)}部位について、今回との差を確認できます。`);
  if (Number(counts.repeated || 0)) known.push(`過去にも同じ方向が複数回確認された部位が${Number(counts.repeated)}部位あります。`);
  if (output?.subjectiveContext?.difference?.eligible) known.push("本人が記録した走る前後の疲労感を、部位数値とは別に確認できます。");
  const unknown = [
    "この数値だけで、身体的な原因・けがの可能性・安全性は判断しません。",
    "別の部位との数値の大小を、身体負荷や重要度の順位として扱いません。",
  ];
  if ((output?.conditions?.differences || []).length) unknown.push("前回から変わった走行条件と数値変化を、原因と結果として結び付けません。");
  if (output?.subjectiveContext?.difference?.eligible) unknown.push("疲労感と部位数値を足し合わせたり、どちらかを原因として扱いません。");

  return `<section class="interpretation-room-understanding" aria-labelledby="interpretation-understanding-title">
    <div class="interpretation-room-section-title"><div><small>ここまでの境界</small><h2 id="interpretation-understanding-title">分かること / 決めないこと</h2></div></div>
    <div class="interpretation-room-understanding-grid"><article><strong>今回確認できること</strong><ul>${known.slice(0,4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article><article><strong>ここからは決めないこと</strong><ul>${unknown.slice(0,4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article></div>
  </section>`;
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
  const primary = next.primaryAction || null;
  const others = next.otherActions || [];
  const check = output?.nextCheck || {};
  const checkCopy = NEXT_CHECK_COPY[check.code] || NEXT_CHECK_COPY.CONTINUE_COMPARABLE_RECORDS;
  return `<section class="interpretation-room-next" aria-labelledby="interpretation-next-title">
    <div class="interpretation-room-section-title"><div><small>自己理解を次へつなぐ</small><h2 id="interpretation-next-title">次に確かめる</h2></div></div>
    <div class="interpretation-room-next-check"><strong>次に確認すると理解が進むこと</strong><p>${escapeHtml(checkCopy)}</p>${check.userRecorded ? `<aside><small>自分で残した次回確認</small><span>${escapeHtml(check.userRecorded)}</span></aside>` : ""}</div>
    ${renderAction(primary, output, { primary: true })}
    ${others.length ? `<details class="interpretation-room-other-actions"><summary>ほかにできること</summary><div class="interpretation-room-secondary-actions">${others.map((action) => renderAction(action, output)).join("")}</div></details>` : ""}
  </section>`;
}

function renderAdvanced(output, region) {
  if (!region) return "";
  const evidence = output?.advanced?.evidence?.regions?.[region.regionId] || null;
  if (!evidence) return renderCalculationDetails(region);
  const sources = Array.isArray(evidence.sources) ? evidence.sources : [];
  return `${renderCalculationDetails(region)}<details class="interpretation-room-advanced"><summary>計算方法と研究上の背景を詳しく見る</summary><div>
    ${evidence.construct ? `<p><strong>計算で表している内容</strong><br>${escapeHtml(evidence.construct)}</p>` : ""}
    ${sources.length ? `<p><strong>保存結果に保持されている資料</strong></p><ul>${sources.map((source) => `<li>${escapeHtml(source.label || "参考資料")}${source.role ? ` — ${escapeHtml(source.role)}` : ""}</li>`).join("")}</ul>` : ""}
    <p class="interpretation-room-boundary-line">ここに表示する資料は、今回の計算に関係する全文献の完全な一覧ではありません。</p>
  </div></details>`;
}

export function renderInterpretationRoom({ output } = {}) {
  if (!output?.state?.targetAvailable) {
    return '<div class="interpretation-room interpretation-room--empty" data-interpretation-room-state="empty"><header class="interpretation-room-hero"><p>結果を整理する</p><h1>対象の保存記録がありません</h1><p>保存した走行記録から、今回確認できることを整理します。</p></header><a class="interpretation-room-action interpretation-room-action--primary" href="#/record-input"><span><strong>記録を始める</strong><small>新しい走行記録を入力します。</small></span><i aria-hidden="true">›</i></a></div>';
  }
  if (output?.state?.support && output.state.support !== "NORMAL") return renderSupportPriority(output);
  if (output?.state?.regional === "REST") return renderRest(output);

  const date = output?.target?.date ? formatLocalDate(output.target.date) : "今回の記録";
  const selected = Boolean(output?.selectedRegion);
  return `<div class="interpretation-room${selected ? " interpretation-room--selected" : " interpretation-room--overview"}" data-interpretation-room-state="${selected ? "selected" : "overview"}">
    <header class="interpretation-room-hero">
      <p>${escapeHtml(date)}</p>
      <h1>${selected ? `${escapeHtml(output.selectedRegion.label)}をRunLoadで整理` : "今回の結果をRunLoadで整理"}</h1>
      <p>今回の数値、過去、本人の疲労感、走行条件を分けて確認し、次に何を確かめるかまで整理します。</p>
    </header>
    ${renderSummary(output)}
    ${selected ? renderSelectedRegion(output) : renderAttentionGroups(output)}
    ${renderConditions(output)}
    ${renderSubjective(output)}
    ${renderUnderstanding(output)}
    ${renderNext(output)}
    ${renderAdvanced(output, output?.selectedRegion)}
  </div>`;
}

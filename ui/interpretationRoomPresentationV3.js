import { escapeHtml } from "./commonComponents.js";
import { formatLocalDate } from "./recordPresentation.js";
import { PROTOTYPE_BODY_VIEWS } from "./prototypeBodyRegionVisuals.js";

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

function paceFromSpeed(speedMps) {
  const speed = Number(speedMps);
  if (!(speed > 0)) return "";
  const totalSeconds = Math.round(1000 / speed);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")} /km`;
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

function regionHref(output, regionId) {
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
  simulation: Object.freeze({ title: "条件を変えた表示を確かめる", note: "今回の記録を基準に、条件を変えた場合の12部位表示を確認します。" }),
  history: Object.freeze({ title: "この部位のこれまでを見る", note: "同じ方法で比べられる過去記録を確認します。" }),
  plan: Object.freeze({ title: "次の走りや休養を準備する", note: "今回の記録を見ながら、次の予定を作ります。" }),
  share: Object.freeze({ title: "人に見せる形に整理する", note: "今回の記録を共有しやすい形にまとめます。" }),
  reading: Object.freeze({ title: "背景をもう少し詳しく読む", note: "結果の読み方や関連する一般情報を確認します。" }),
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
  return `<a class="interpretation-v3-action${primary ? " interpretation-v3-action--primary" : ""}" href="${escapeHtml(actionHref(action, output))}">
    <span><strong>${escapeHtml(copy.title)}</strong><small>${escapeHtml(copy.note)}</small></span><i aria-hidden="true">›</i>
  </a>`;
}

function renderSupportPriority(output) {
  const primary = output?.next?.primaryAction || null;
  const others = output?.next?.otherActions || [];
  return `<div class="interpretation-v3 interpretation-v3--support" data-interpretation-v3-state="support">
    <header class="interpretation-v3-hero">
      <p>今回の記録</p>
      <h1>先に確認することがあります</h1>
      <p>通常の結果整理より先に、入力内容に応じた案内を確認します。</p>
    </header>
    <section class="interpretation-v3-support-panel" aria-label="先に確認する案内">
      ${renderAction(primary, output, { primary: true })}
      ${others.length ? `<details><summary>ほかにできること</summary><div class="interpretation-v3-secondary-actions">${others.map((action) => renderAction(action, output)).join("")}</div></details>` : ""}
    </section>
  </div>`;
}

function renderRest(output) {
  return `<div class="interpretation-v3 interpretation-v3--rest" data-interpretation-v3-state="rest">
    <header class="interpretation-v3-hero">
      <p>${escapeHtml(output?.target?.date ? formatLocalDate(output.target.date) : "今回の記録")}</p>
      <h1>今回は休養の記録です</h1>
      <p>休養記録には12部位の数値を作りません。数値なしを0として扱いません。</p>
    </header>
    <section class="interpretation-v3-boundary">
      <strong>確認できること</strong>
      <p>入力した記録内容は履歴や共有用の整理に使用できます。</p>
    </section>
  </div>`;
}

function renderLegacy(output) {
  return `<div class="interpretation-v3 interpretation-v3--legacy" data-interpretation-v3-state="legacy">
    <header class="interpretation-v3-hero">
      <p>${escapeHtml(output?.target?.date ? formatLocalDate(output.target.date) : "保存記録")}</p>
      <h1>この記録は現在の計算方法とは分けて扱います</h1>
      <p>過去仕様の値を、現在の基準100の結果として読み替えません。</p>
    </header>
    <section class="interpretation-v3-boundary">
      <strong>今回できること</strong>
      <p>保存された記録自体は確認できますが、現在の12部位結果との直接比較や計算経路の説明は行いません。</p>
    </section>
  </div>`;
}

function renderOverviewMap(output) {
  const regions = output?.overview?.regions || [];
  const byId = new Map(regions.map((region) => [region.regionId, region]));
  const views = PROTOTYPE_BODY_VIEWS.map((view) => {
    const paths = view.paths.map(([id, d]) => {
      const region = byId.get(id);
      const relation = referenceText(region?.reference?.direction || "");
      const state = directionKey(region?.reference?.direction || "");
      const label = region ? `${region.label}：${relation}` : `${id}：表示なし`;
      return `<a href="${escapeHtml(regionHref(output, id))}" class="interpretation-v3-region-link" aria-label="${escapeHtml(`${label}。この部位を見る`)}">
        <path class="interpretation-v3-region-shape" data-reference-direction="${escapeHtml(state)}" d="${d}"><title>${escapeHtml(label)}</title></path>
      </a>`;
    }).join("");
    return `<figure class="interpretation-v3-body-view"><figcaption>${escapeHtml(view.title)}</figcaption><svg viewBox="70 10 160 430" role="img" aria-label="${escapeHtml(`${view.title}の部位図`)}"><g class="interpretation-v3-silhouette">${view.silhouette}</g><g>${paths}</g></svg></figure>`;
  }).join("");

  const choices = regions.map((region) => `<a href="${escapeHtml(regionHref(output, region.regionId))}" class="interpretation-v3-region-choice">
    <strong>${escapeHtml(region.label)}</strong><span>${escapeHtml(referenceText(region.reference?.direction || ""))}</span>
  </a>`).join("");
  const groupedDirections = [
    ["ABOVE_REFERENCE", "above", "基準より上側"],
    ["REFERENCE_VICINITY", "near", "基準付近"],
    ["BELOW_REFERENCE", "below", "基準より下側"],
  ].map(([direction, kind, label]) => ({
    kind,
    label,
    names: regions.filter((region) => region.reference?.direction === direction).map((region) => region.label),
  })).filter((group) => group.names.length);
  const groupedDirectionsHtml = groupedDirections.map((group) => `<div data-kind="${escapeHtml(group.kind)}"><strong>${escapeHtml(group.label)}</strong><span class="interpretation-v3-overview-group-names">${group.names.map((name) => `<span class="interpretation-v3-overview-group-name">${escapeHtml(name)}</span>`).join("")}</span></div>`).join("");

  return `<section class="interpretation-v3-overview" aria-labelledby="interpretation-v3-overview-title">
    <div class="interpretation-v3-section-head"><span>1</span><div><small>身体全体を見る</small><h2 id="interpretation-v3-overview-title">部位ごとの位置を確認</h2></div></div>
    <p class="interpretation-v3-lead">同じ走りでも、各部位がそれぞれの基準100に対して同じ位置になるとは限りません。まず1部位を選びます。</p>
    <div class="interpretation-v3-map" aria-label="12部位の基準100との位置">${views}</div>
    <div class="interpretation-v3-overview-groups" aria-label="今回の部位ごとの分かれ方"><small>今回の分かれ方</small>${groupedDirectionsHtml}</div>
    <details class="interpretation-v3-region-picker"><summary>部位名から選ぶ</summary><div>${choices}</div></details>
    <p class="interpretation-v3-boundary-line">部位どうしの数値を順位付けする図ではありません。</p>
  </section>`;
}

function renderReferenceComparison(region, step = 1) {
  const reference = region?.referenceComparison || {};
  const previous = region?.previousComparison || {};
  const current = finite(region?.value) ? number(region.value) : "—";
  const referenceDifference = finite(reference?.difference) ? signed(reference.difference) : "—";
  const referenceLine = reference?.available
    ? `<div class="interpretation-v3-comparison-row interpretation-v3-comparison-row--reference"><span>この部位の基準</span><strong>100</strong><i aria-hidden="true">→</i><span>今回</span><strong>${escapeHtml(current)}</strong><small>差 ${escapeHtml(referenceDifference)}</small></div>`
    : "";

  let previousLine = '<p class="interpretation-v3-no-history">同じ方法で比べられる過去記録はまだありません。今回の値を次回の比較点として使えます。</p>';
  if (previous?.available) {
    const smallDifference = previous.direction === "LESS_THAN_ONE_POINT";
    previousLine = `<div class="interpretation-v3-comparison-row interpretation-v3-comparison-row--previous"><span>${escapeHtml(previous.date ? formatLocalDate(previous.date) : "前回")}</span><strong>${escapeHtml(number(previous.previousValue))}</strong><i aria-hidden="true">→</i><span>今回</span><strong>${escapeHtml(current)}</strong><small>${smallDifference ? `差 ${escapeHtml(signed(previous.difference))}（1ポイント未満）` : `差 ${escapeHtml(signed(previous.difference))}`}</small></div>`;
  }

  return `<section class="interpretation-v3-selected" aria-labelledby="interpretation-v3-selected-title">
    <div class="interpretation-v3-section-head"><span>${escapeHtml(String(step))}</span><div><small>選んだ部位を見る</small><h2 id="interpretation-v3-selected-title">${escapeHtml(region.label)}</h2></div></div>
    <div class="interpretation-v3-current-result"><span>${escapeHtml(referenceText(reference.direction || ""))}</span><strong>${escapeHtml(current)}</strong><small>基準100との差 ${escapeHtml(referenceDifference)}</small></div>
    <div class="interpretation-v3-comparisons">${referenceLine}${previousLine}</div>
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
  if (item.id === "SPEED") {
    const pace = paceFromSpeed(item.value || exposure.speedMps);
    return pace || "計算済み";
  }
  if (item.id === "CADENCE" && finite(item.value)) return `${number(item.value, 0)} spm`;
  if (item.id === "GRADE") return "坂の記録あり";
  if (item.id === "SURFACE") return "路面の記録あり";
  if (item.id === "FOOT_STRIKE") return "入力あり";
  return finite(item.value) ? number(item.value) : "記録あり";
}

function renderCalculationPath(region, step = 2) {
  const path = region?.calculationPath || {};
  if (path.resolutionStatus === "UNAVAILABLE") {
    return `<section class="interpretation-v3-calculation" aria-labelledby="interpretation-v3-calculation-title">
      <div class="interpretation-v3-section-head"><span>${escapeHtml(String(step))}</span><div><small>表示の作られ方</small><h2 id="interpretation-v3-calculation-title">今回確認できる計算情報</h2></div></div>
      <p class="interpretation-v3-lead">この保存記録からは、現在の計算経路を正確に説明できません。推測で補いません。</p>
    </section>`;
  }

  const exposure = path.exposure || {};
  const active = path.activeInputs || [];
  const firstFacts = active.filter((item) => item.role === "DERIVE_SPEED");
  const speed = active.find((item) => item.id === "SPEED");
  const factCards = firstFacts.map((item) => `<div><small>${escapeHtml(inputLabel(item))}</small><strong>${escapeHtml(inputValue(item, exposure))}</strong></div>`).join("");
  const speedCard = speed ? `<div class="interpretation-v3-flow-step"><small>${exposure.type === "RUNNING_PHASE" ? "走った区間から計算" : "入力から計算"}</small><strong>${escapeHtml(paceFromSpeed(speed.value) || "走る速さ")}</strong><span>走る速さ</span></div>` : "";

  let flow = "";
  if (path.activeRoute === "SECTION_COMPOSED") {
    flow = `<div class="interpretation-v3-flow interpretation-v3-flow--segments"><div class="interpretation-v3-flow-step"><small>今回のコース</small><strong>${escapeHtml(String(exposure.segmentCount || ""))}区間</strong><span>区間ごとの条件を使用</span></div><i aria-hidden="true">↓</i><div class="interpretation-v3-flow-step"><strong>区間ごとに計算</strong></div><i aria-hidden="true">↓</i><div class="interpretation-v3-flow-step"><strong>距離に応じてまとめる</strong></div><i aria-hidden="true">↓</i><div class="interpretation-v3-flow-step interpretation-v3-flow-step--result"><span>${escapeHtml(region.label)}</span><strong>${escapeHtml(number(region.value))}</strong></div></div>
      <p class="interpretation-v3-precision-note">複数区間をまとめた結果です。この画面では各区間の最終採用経路まで断定しません。</p>`;
  } else {
    flow = `<div class="interpretation-v3-input-facts">${factCards}</div><div class="interpretation-v3-flow">${speedCard}<i aria-hidden="true">↓</i><div class="interpretation-v3-flow-step"><small>この部位の計算</small><strong>${escapeHtml(region.label)}</strong></div><i aria-hidden="true">↓</i><div class="interpretation-v3-flow-step interpretation-v3-flow-step--result"><span>今回</span><strong>${escapeHtml(number(region.value))}</strong></div></div>`;
  }

  const conditional = path.conditionalInputs || [];
  const conditionalHtml = conditional.length
    ? `<aside class="interpretation-v3-conditional"><strong>関係する条件として記録されています</strong><div>${conditional.map((item) => `<span><b>${escapeHtml(inputLabel(item))}</b><small>${escapeHtml(inputValue(item, exposure))}</small></span>`).join("")}</div><p>保存結果だけでは、これらが最終値へ採用された経路をここで断定しません。</p></aside>`
    : "";

  const context = path.contextOnlyInputs || [];
  const contextHtml = context.length
    ? `<details class="interpretation-v3-context-only"><summary>記録はあるが、この部位の現在の数値計算には使わない情報</summary><div>${context.map((item) => `<span><strong>${escapeHtml(inputLabel(item))}</strong><small>${escapeHtml(inputValue(item, exposure))}</small></span>`).join("")}</div></details>`
    : "";

  return `<section class="interpretation-v3-calculation" aria-labelledby="interpretation-v3-calculation-title">
    <div class="interpretation-v3-section-head"><span>${escapeHtml(String(step))}</span><div><small>表示の作られ方</small><h2 id="interpretation-v3-calculation-title">この数値に使われた情報</h2></div></div>
    ${flow}${conditionalHtml}${contextHtml}
    <p class="interpretation-v3-boundary-line">ここで示すのはRunLoad内部の計算経路です。身体で実際に起きた原因を示すものではありません。</p>
  </section>`;
}

function rofMeaningText(item = {}) {
  if (!item?.available) return "";
  if (item.descriptorType === "EXACT") return item.descriptor || "";
  if (item.descriptorType === "BETWEEN_ANCHORS" && item.lowerAnchor && item.upperAnchor) {
    return `${item.lowerAnchor.value}「${item.lowerAnchor.descriptor}」と${item.upperAnchor.value}「${item.upperAnchor.descriptor}」の間`;
  }
  if (item.descriptorType === "POSITION_ONLY" && item.upperAnchor) {
    return `${item.upperAnchor.value}「${item.upperAnchor.descriptor}」より尺度上で下側`;
  }
  if (item.descriptorType === "POSITION_ONLY" && item.lowerAnchor) {
    return `${item.lowerAnchor.value}「${item.lowerAnchor.descriptor}」より尺度上で上側`;
  }
  return "0〜10の尺度上の位置";
}

function rofPoint(label, item) {
  if (!item?.available) return "";
  const value = Number(item.value);
  return `<div class="interpretation-v3-rof-reading"><small>${escapeHtml(label)}</small><strong>${escapeHtml(number(value, 0))}<em>/10</em></strong><span>${escapeHtml(rofMeaningText(item))}</span></div>`;
}

function renderSubjective(output, step = 3) {
  const context = output?.subjectiveContext || {};
  if (context.state === "NONE") return "";
  const pre = context.pre || {};
  const post = context.post || {};
  const pair = context.difference?.eligible;
  const marker = (item, klass) => item?.available ? `<i class="${klass}" style="--position:${Math.max(0, Math.min(100, Number(item.value) * 10))}%"><span>${escapeHtml(number(item.value, 0))}</span></i>` : "";
  const comparison = pair
    ? `<p class="interpretation-v3-rof-difference">走る前 ${escapeHtml(number(pre.value, 0))} → 走った後 ${escapeHtml(number(post.value, 0))}　差 ${escapeHtml(signed(context.difference.value, 0))}</p>`
    : '<p class="interpretation-v3-rof-difference">前後がそろっていないため、前後差は表示しません。</p>';

  return `<section class="interpretation-v3-subjective" aria-labelledby="interpretation-v3-subjective-title">
    <div class="interpretation-v3-section-head"><span>${escapeHtml(String(step))}</span><div><small>自分の感じ方</small><h2 id="interpretation-v3-subjective-title">走る前後の疲れ</h2></div></div>
    <div class="interpretation-v3-rof-readings">${rofPoint("走る前", pre)}${rofPoint("走った後", post)}</div>
    <div class="interpretation-v3-rof-scale" aria-label="疲れの0から10までの尺度"><span>0</span><div>${marker(pre, "is-pre")}${marker(post, "is-post")}</div><span>10</span></div>
    ${comparison}
    <p class="interpretation-v3-boundary-line">これは本人が記録した疲れの感じ方です。部位ごとの基準100とは別の情報で、回復度・安全性・けがの危険性を判定する数値ではありません。</p>
  </section>`;
}

function renderUnderstanding(output, region, step = 4) {
  const reference = region?.referenceComparison || {};
  const previous = region?.previousComparison || {};
  const path = region?.calculationPath || {};
  const known = [];
  if (reference.available) known.push(`${region.label}は${referenceText(reference.direction)}で、今回の値は${number(region.value)}です。`);
  if (previous.available) known.push(`同じ方法で比べられる前回は${number(previous.previousValue)}、今回は${number(region.value)}です。`);
  if (path.resolutionStatus === "EXACT") known.push("今回の数値に使われた計算経路を保存情報から確認できます。");
  else if (path.resolutionStatus === "PARTIAL") known.push("今回の計算経路は、確認できる範囲だけ表示しています。");

  const unknown = [
    "この数値だけで、身体的な原因やけがの可能性は判断できません。",
    "別の部位との数値の大小を、身体負荷の順位として扱いません。",
  ];
  if (path.resolutionStatus === "PARTIAL" && (path.conditionalInputs || []).length) {
    unknown.unshift("記録された条件が最終値をどれだけ変えたかは、現在の保存結果から分離して示せません。");
  }
  if (output?.subjectiveContext?.state === "PAIR") {
    unknown.push("疲れの感じ方と部位別の数値を足し合わせたり、どちらかを原因として扱いません。");
  }

  return `<section class="interpretation-v3-understanding" aria-labelledby="interpretation-v3-understanding-title">
    <div class="interpretation-v3-section-head"><span>${escapeHtml(String(step))}</span><div><small>ここまでを整理</small><h2 id="interpretation-v3-understanding-title">分かることと、まだ分からないこと</h2></div></div>
    <div class="interpretation-v3-understanding-grid"><article><strong>今回確認できること</strong><ul>${known.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article><article><strong>ここからは決められないこと</strong><ul>${unknown.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article></div>
  </section>`;
}

function renderNext(output, step = 5) {
  const next = output?.next || {};
  const primary = next.primaryAction || null;
  if (!primary) return "";
  const others = next.otherActions || [];
  return `<section class="interpretation-v3-next" aria-labelledby="interpretation-v3-next-title">
    <div class="interpretation-v3-section-head"><span>${escapeHtml(String(step))}</span><div><small>次に確認するなら</small><h2 id="interpretation-v3-next-title">今回の内容を次へつなぐ</h2></div></div>
    ${renderAction(primary, output, { primary: true })}
    ${others.length ? `<details class="interpretation-v3-other-actions"><summary>ほかにできること</summary><div class="interpretation-v3-secondary-actions">${others.map((action) => renderAction(action, output)).join("")}</div></details>` : ""}
  </section>`;
}

function renderAdvanced(output, region) {
  const evidence = output?.advanced?.evidence?.regions?.[region.regionId] || null;
  if (!evidence) return "";
  const sources = Array.isArray(evidence.sources) ? evidence.sources : [];
  return `<details class="interpretation-v3-advanced"><summary>計算方法と研究上の背景を詳しく見る</summary><div>
    <p>ここから先は、今回の数値が表す内容や保存されている資料情報を確認するための詳細です。</p>
    ${evidence.construct ? `<p><strong>計算で表している内容</strong><br>${escapeHtml(evidence.construct)}</p>` : ""}
    ${sources.length ? `<p><strong>保存結果に保持されている資料</strong></p><ul>${sources.map((source) => `<li>${escapeHtml(source.label || "参考資料")}${source.role ? ` — ${escapeHtml(source.role)}` : ""}</li>`).join("")}</ul>` : ""}
    <p class="interpretation-v3-boundary-line">ここに表示する資料は、今回の計算に関係する全文献の完全な一覧ではありません。</p>
  </div></details>`;
}

function renderSelectedFlow(output) {
  const region = output?.selectedRegion;
  if (!region) return "";
  return `${renderReferenceComparison(region, 1)}${renderCalculationPath(region, 2)}${renderSubjective(output, 3)}${renderUnderstanding(output, region, 4)}${renderNext(output, 5)}${renderAdvanced(output, region)}`;
}

export function renderInterpretationRoomV3({ output } = {}) {
  if (!output?.state?.targetAvailable) {
    return '<div class="interpretation-v3 interpretation-v3--empty" data-interpretation-v3-state="empty"><header class="interpretation-v3-hero"><p>結果を整理する</p><h1>対象の保存記録がありません</h1><p>保存した走行記録から、結果を順番に整理します。</p></header><a class="interpretation-v3-action interpretation-v3-action--primary" href="#/record-input"><span><strong>記録を始める</strong><small>新しい走行記録を入力します。</small></span><i aria-hidden="true">›</i></a></div>';
  }
  if (output?.state?.support && output.state.support !== "NORMAL") return renderSupportPriority(output);
  if (output?.state?.regional === "REST") return renderRest(output);
  if (output?.state?.legacy) return renderLegacy(output);

  const date = output?.target?.date ? formatLocalDate(output.target.date) : "今回の記録";
  const selected = Boolean(output?.selectedRegion);
  return `<div class="interpretation-v3${selected ? " interpretation-v3--selected" : " interpretation-v3--overview"}" data-interpretation-v3-state="${selected ? "selected" : "overview"}">
    <header class="interpretation-v3-hero">
      <p>${escapeHtml(date)}</p>
      <h1>${selected ? `${output?.selectedRegion?.label || "選んだ部位"}の結果を整理` : "今回の身体を部位ごとに見る"}</h1>
      <p>${selected ? "数値を基準・過去・計算に使われた情報と一緒に確認します。" : "12部位を一つの順位にせず、それぞれの基準100との位置から見ます。"}</p>
    </header>
    ${selected ? `<a class="interpretation-v3-back-to-overview" href="${escapeHtml(regionHref(output, ""))}">← 身体全体から選び直す</a>` : ""}
    ${selected ? "" : renderOverviewMap(output)}
    ${renderSelectedFlow(output)}
  </div>`;
}

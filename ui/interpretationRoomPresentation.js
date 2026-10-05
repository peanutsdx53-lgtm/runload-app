import { isPresentFiniteNumber as finite } from "../shared/valueUtilities.js";
import { escapeHtml } from "./commonComponents.js";
import { formatLocalDate } from "./recordPresentation.js";
import { bodyObservationIntensityDisplay } from "./subjectivePresentation.js";
import {
  buildInterpretationContextCandidate,
  getInterpretationReferenceKnowledgeById,
  normalizeInterpretationConditionId,
  referenceReadingHref,
  selectInterpretationReferenceKnowledge,
} from "./interpretationReferenceKnowledge.js";

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

function proposalRegionDirection(region = {}) {
  if (region.referenceDirection) return region.referenceDirection;
  if (!finite(region.value)) return "UNAVAILABLE";
  const value = Number(region.value);
  return value > 101 ? "ABOVE_REFERENCE" : value < 99 ? "BELOW_REFERENCE" : "REFERENCE_VICINITY";
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
  if (compact) return `<details class="interpretation-loop-material-compact"><summary>材料を見る <b>${rows.length}</b></summary>${body}</details>`;
  return `<section class="interpretation-loop-material" aria-labelledby="interpretation-loop-material-title"><header><small>MATERIAL</small><h2 id="interpretation-loop-material-title">今回の材料</h2></header>${body}</section>`;
}

function renderInterpretationContextReferenceKnowledge(reference = null, output = {}, { compact = false } = {}) {
  if (!reference) return "";
  const kinds = [...new Set(Array.isArray(reference.sourceKinds) ? reference.sourceKinds.filter(Boolean) : [])];
  const kindLabel = kinds.length ? kinds.slice(0, 3).join("・") : "確認済み資料";
  const sourceLabel = reference.sourceCount ? `${kindLabel} / ${reference.sourceCount}件` : kindLabel;
  return `<aside class="interpretation-context-reference${compact ? " interpretation-context-reference--compact" : ""}" data-interpretation-flow-reveal="compare" aria-label="参考情報">
    <div class="interpretation-context-reference__icon">${interpretationIcon("book")}</div>
    <div class="interpretation-context-reference__copy"><small>参考情報・あなたへの判定ではありません</small><strong>${escapeHtml(reference.title)}</strong><p>${escapeHtml(reference.summary || reference.lead || "")}</p><span>${escapeHtml(reference.matchReason || "今回の記録に関連する一般情報です")}・${escapeHtml(sourceLabel)}</span></div>
    <a href="${escapeHtml(referenceReadingHref(reference, output))}">根拠と全文を見る</a>
  </aside>`;
}

function interpretationContextRunContextLine(context = {}, postRofJ = null) {
  const parts = [];
  if (finite(context?.distanceKm)) parts.push(`${number(context.distanceKm, 2)} km`);
  if (finite(context?.durationMinutes)) parts.push(`${number(context.durationMinutes, 1)} 分`);
  if (context?.course?.name) parts.push(context.course.name);
  if (finite(context?.environment?.temperatureC)) parts.push(`気温 ${number(context.environment.temperatureC, 1)} ℃`);
  if (finite(postRofJ)) parts.push(`疲労感 ${number(postRofJ, 0)}/10`);
  return parts.slice(0, 5).join("・");
}

function renderInterpretationContextContextFocus(candidate = {}, output = {}) {
  return `<section class="interpretation-context-context-focus" aria-label="今回の自分の記録">
    <article class="interpretation-flow-source-card interpretation-flow-source-card--user" data-interpretation-flow-focus-card><header><span class="interpretation-flow-source-mark">自</span><div><small>${escapeHtml(candidate.focusLabel || "今回の記録")}</small><strong>自分の記録から始めます</strong></div></header><div class="interpretation-context-context-focus__value">${escapeHtml(candidate.focusValue || "今回の記録があります")}</div></article>
    ${renderInterpretationContextReferenceKnowledge(candidate.reference, output, { compact: false })}
  </section>`;
}

function interpretationFlowQuestionForCandidate(candidate = {}) {
  if (candidate?.kind !== "BODY_OBSERVATION_PAIR") return "次の走行でも同じ点を確かめる";
  const observation = candidate.observation || {};
  const observationLabel = observation.label || candidateRegionLabel(candidate);
  return `次の走行では、${observationLabel}を自分がどう感じたか確認する`;
}

function interpretationFlowCandidateMeta(candidate = {}) {
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
    question: interpretationFlowQuestionForCandidate(candidate),
  });
}

function renderInterpretationFlowStageGuide() {
  return `<nav class="interpretation-flow-stage-guide" aria-label="この画面の流れ"><span data-interpretation-flow-step="focus"><i>1</i>記録</span><b aria-hidden="true">→</b><span data-interpretation-flow-step="compare"><i>2</i>見比べる</span><b aria-hidden="true">→</b><span data-interpretation-flow-step="decision"><i>3</i>次へ</span></nav>`;
}

function renderInterpretationFlowBodyPair(candidate = {}, { active = false } = {}) {
  const meta = interpretationFlowCandidateMeta(candidate);
  return `<section class="interpretation-flow-pair" aria-label="今回見比べられる2つの情報">
    <article class="interpretation-flow-source-card interpretation-flow-source-card--user" data-interpretation-flow-focus-card>
      <header><span class="interpretation-flow-source-mark">自</span><div><small>あなたの身体の記録</small><strong>${escapeHtml(meta.observationLabel)}</strong></div></header>
      <div class="interpretation-flow-source-value">${escapeHtml(meta.sensation)}</div>
      <p>${escapeHtml(meta.timing)}${meta.intensity != null ? `・程度 ${escapeHtml(bodyObservationIntensityDisplay(meta.intensity))}` : ""}</p>
    </article>
    <div class="interpretation-flow-relation" data-interpretation-flow-reveal="compare"><span></span><b>同じ部位</b><span></span></div>
    <article class="interpretation-flow-source-card interpretation-flow-source-card--model interpretation-context-model-secondary" data-interpretation-flow-reveal="compare">
      <header><span class="interpretation-flow-source-mark">R</span><div><small>考える材料・RunLoadの部位表示</small><strong>${escapeHtml(meta.regionLabel)}</strong></div></header>
      <div class="interpretation-context-model-value"><span>部位内の比較</span><strong>${escapeHtml(meta.value)}</strong></div>
      <p>${escapeHtml(meta.direction)}。この値は身体の感覚そのものではありません。</p>
    </article>
    <div class="interpretation-flow-boundary" data-interpretation-flow-reveal="compare"><span aria-hidden="true">i</span><p><strong>2つは別の情報です。</strong> 部位表示が身体の感覚の原因だという意味ではありません。高いほど良い・悪いという意味でもありません。</p></div>
  </section>`;
}

function renderInterpretationFlowFirstRail(candidate = {}) {
  const meta = interpretationFlowCandidateMeta(candidate);
  return `<aside class="interpretation-flow-rail" aria-label="今回の操作">
    <section class="interpretation-flow-rail-step" data-interpretation-flow-only-stage="focus">
      <small>最初にすること</small><h2>自分の記録から見ます</h2><p>まず今回、自分で記録した内容を選びます。次にRunLoad側の同じ部位の情報を表示します。</p>
      <button type="button" class="interpretation-flow-primary" data-action="interpretation-flow-flow-stage" data-next-stage="compare">対応する情報を見る</button>
    </section>
    <section class="interpretation-flow-rail-step" data-interpretation-flow-only-stage="compare">
      <small>見比べる</small><h2>自分の体験を中心に見ます</h2><p>部位表示や参考情報は、自分がどう感じたかを考える材料です。一致や原因を決める必要はありません。</p>
      <p class="interpretation-flow-candidate-reason"><strong>表示理由</strong> 身体の記録と同じ部位に、今回の部位表示があるためです。</p>
      <button type="button" class="interpretation-flow-primary" data-action="interpretation-flow-flow-stage" data-next-stage="decision">次にどうするか決める</button>
      <button type="button" class="interpretation-flow-text-button" data-action="interpretation-flow-flow-stage" data-next-stage="focus">自分の記録に戻る</button>
    </section>
    <section class="interpretation-flow-rail-step" data-interpretation-flow-only-stage="decision">
      <small>自分で選ぶ</small><h2>次に自分で確かめること</h2><div class="interpretation-flow-question"><span aria-hidden="true">?</span><strong>${escapeHtml(meta.question)}</strong></div>
      <p>RunLoadは答えを決めません。次回は自分の感じ方を中心に、同じ部位の表示や走行条件を補助材料として確認できます。</p>
      <details class="interpretation-flow-note"><summary>今回のメモを残す（任意）</summary><textarea data-self-understanding-note maxlength="500" rows="2" placeholder="自分の言葉で残したいことだけ"></textarea></details>
      <div class="interpretation-flow-decision-actions">
        <button type="button" class="interpretation-flow-primary" data-action="create-self-understanding-thread" data-thread-type="REGION_OBSERVATION_PAIR" data-region-id="${escapeHtml(meta.regionId)}" data-body-area-id="${escapeHtml(meta.bodyAreaId)}" data-next-label="${escapeHtml(meta.question)}">この問いを次も確かめる</button>
        <button type="button" class="interpretation-flow-secondary" data-action="interpretation-flow-finish-this-time" data-interpretation-flow-done-kind="this-time">今回はここまで</button>
        <button type="button" class="interpretation-flow-text-button" data-action="interpretation-flow-finish-this-time" data-interpretation-flow-done-kind="undecided">まだ決めない</button>
      </div>
      <button type="button" class="interpretation-flow-text-button" data-action="interpretation-flow-flow-stage" data-next-stage="compare">見比べる画面に戻る</button>
    </section>
    <section class="interpretation-flow-rail-step" data-interpretation-flow-only-stage="done">
      <div data-interpretation-flow-completion-only="saved"><small>次回へ</small><h2>確認する問いとして残しました</h2><p class="interpretation-flow-saved-question">${escapeHtml(meta.question)}</p><p>保存したのは、この問いを次も見るというあなたの選択です。数値の意味や原因を確定したものではありません。</p><button type="button" class="interpretation-flow-text-button" data-action="interpretation-flow-undo-created-thread">確認中から外す</button><a class="interpretation-flow-secondary interpretation-flow-link-button" href="#/history?view=checks">確認してきたことを見る</a></div>
      <div data-interpretation-flow-completion-only="this-time"><small>今回</small><h2>今回はここまで</h2><p>新しい問いは保存していません。今回の結果は履歴からいつでも見直せます。</p><a class="interpretation-flow-secondary interpretation-flow-link-button" href="#/history">履歴を見る</a></div>
      <div data-interpretation-flow-completion-only="undecided"><small>今回</small><h2>まだ決めていません</h2><p>確認する問いは追加していません。必要になったときに今回の結果からもう一度見比べられます。</p><a class="interpretation-flow-secondary interpretation-flow-link-button" href="#/history">履歴を見る</a></div>
      <div data-interpretation-flow-completion-only="undone"><small>変更しました</small><h2>確認中から外しました</h2><p>今回の結果そのものは残っています。必要なら履歴から再び確認できます。</p><a class="interpretation-flow-secondary interpretation-flow-link-button" href="#/history">履歴を見る</a></div>
    </section>
  </aside>`;
}

function renderInterpretationContextContextRail(candidate = {}) {
  return `<aside class="interpretation-flow-rail" aria-label="今回の操作">
    <section class="interpretation-flow-rail-step" data-interpretation-flow-only-stage="focus">
      <small>最初にすること</small><h2>自分の記録から見ます</h2><p>身体の部位記録がなくても、疲労感・走行条件・自分のメモから振り返れます。</p>
      <button type="button" class="interpretation-flow-primary" data-action="interpretation-flow-flow-stage" data-next-stage="compare">考える材料を見る</button>
    </section>
    <section class="interpretation-flow-rail-step" data-interpretation-flow-only-stage="compare">
      <small>参考情報</small><h2>一般情報は答えではありません</h2><p>今回の記録に関連する一般的な情報を一つだけ示します。あなたの原因・状態・安全性を判定するものではありません。</p>
      <button type="button" class="interpretation-flow-primary" data-action="interpretation-flow-flow-stage" data-next-stage="decision">次に自分で確かめることを見る</button>
      <button type="button" class="interpretation-flow-text-button" data-action="interpretation-flow-flow-stage" data-next-stage="focus">自分の記録に戻る</button>
    </section>
    <section class="interpretation-flow-rail-step" data-interpretation-flow-only-stage="decision">
      <small>自分で選ぶ</small><h2>次に自分で確かめること</h2><div class="interpretation-flow-question"><span aria-hidden="true">?</span><strong>${escapeHtml(candidate.question)}</strong></div>
      <p>参考情報は問いを考える補助です。次回も確認したい場合だけ、この問いを残します。</p>
      <details class="interpretation-flow-note"><summary>今回のメモを残す（任意）</summary><textarea data-self-understanding-note maxlength="500" rows="2" placeholder="自分の言葉で残したいことだけ"></textarea></details>
      <div class="interpretation-flow-decision-actions">
        <button type="button" class="interpretation-flow-primary" data-action="create-self-understanding-thread" data-thread-type="CONTEXT_QUESTION" data-context-key="${escapeHtml(candidate.focusKey)}" data-context-prompt="${escapeHtml(candidate.question)}" data-article-id="${escapeHtml(candidate.reference?.id || "")}" data-next-label="${escapeHtml(candidate.question)}">この問いを次も確かめる</button>
        <button type="button" class="interpretation-flow-secondary" data-action="interpretation-flow-finish-this-time" data-interpretation-flow-done-kind="this-time">今回はここまで</button>
        <button type="button" class="interpretation-flow-text-button" data-action="interpretation-flow-finish-this-time" data-interpretation-flow-done-kind="undecided">まだ決めない</button>
      </div>
      <button type="button" class="interpretation-flow-text-button" data-action="interpretation-flow-flow-stage" data-next-stage="compare">参考情報に戻る</button>
    </section>
    <section class="interpretation-flow-rail-step" data-interpretation-flow-only-stage="done">
      <div data-interpretation-flow-completion-only="saved"><small>次回へ</small><h2>確認する問いとして残しました</h2><p class="interpretation-flow-saved-question">${escapeHtml(candidate.question)}</p><p>保存したのは、次回も自分で確かめるという選択だけです。一般情報をあなた個人の結論として保存していません。</p><button type="button" class="interpretation-flow-text-button" data-action="interpretation-flow-undo-created-thread">確認中から外す</button><a class="interpretation-flow-secondary interpretation-flow-link-button" href="#/history?view=checks">確認してきたことを見る</a></div>
      <div data-interpretation-flow-completion-only="this-time"><small>今回</small><h2>今回はここまで</h2><p>新しい問いは保存していません。今回の記録は履歴から見直せます。</p><a class="interpretation-flow-secondary interpretation-flow-link-button" href="#/history">履歴を見る</a></div>
      <div data-interpretation-flow-completion-only="undecided"><small>今回</small><h2>まだ決めていません</h2><p>確認する問いは追加していません。必要になったときに今回の記録から再び確認できます。</p><a class="interpretation-flow-secondary interpretation-flow-link-button" href="#/history">履歴を見る</a></div>
      <div data-interpretation-flow-completion-only="undone"><small>変更しました</small><h2>確認中から外しました</h2><p>今回の記録そのものは残っています。</p><a class="interpretation-flow-secondary interpretation-flow-link-button" href="#/history">履歴を見る</a></div>
    </section>
  </aside>`;
}

function renderInterpretationContextContextFirst(output = {}, selfUnderstanding = null, candidate = {}, { compact = false } = {}) {
  const date = output?.target?.date ? formatLocalDate(output.target.date) : "今回";
  const materials = renderMaterialRows(output, selfUnderstanding);
  return `<div class="interpretation-room interpretation-flow-room interpretation-context-room interpretation-context-room--context ${compact ? "interpretation-flow-room--compact" : "interpretation-flow-room--wide"}" data-interpretation-room-state="interpretation-context-context-first" data-interpretation-flow-stage="focus">
    <header class="interpretation-flow-head"><div><small>${escapeHtml(date)}</small><h1>今回の自分を見ていく</h1><p>身体の部位記録がなくても、自分が残した疲労感・条件・メモから振り返れます。</p></div>${renderInterpretationFlowStageGuide()}</header>
    <div class="interpretation-flow-layout"><main class="interpretation-flow-canvas"><div class="interpretation-flow-canvas-kicker" data-interpretation-flow-title-focus><small>今回、まず見るところ</small><h2>${escapeHtml(candidate.focusLabel)}</h2><p>最初は自分で残した記録だけを見ます。</p></div><div class="interpretation-flow-canvas-kicker" data-interpretation-flow-title-compare><small>考える材料を追加</small><h2>今回の記録に関係する一般情報</h2><p>自分の記録を理解するための背景として使います。個人への判定には使いません。</p></div>${renderInterpretationContextContextFocus(candidate, output)}${materials.length ? `<details class="interpretation-flow-more-materials interpretation-context-secondary-materials" data-interpretation-flow-reveal="compare"><summary>補足の材料を見る <b>${materials.length}</b></summary>${renderInterpretationMaterialPanel(output, selfUnderstanding)}</details>` : ""}</main>${renderInterpretationContextContextRail(candidate)}</div>
    ${renderInterpretationLoopDetails(output, { compact })}
  </div>`;
}

function renderInterpretationFlowFirst(output = {}, selfUnderstanding = null, { compact = false } = {}) {
  const candidate = selfUnderstanding?.primaryCandidate || null;
  if (!candidate || candidate.kind !== "BODY_OBSERVATION_PAIR") {
    const contextCandidate = buildInterpretationContextCandidate(output);
    return contextCandidate ? renderInterpretationContextContextFirst(output, selfUnderstanding, contextCandidate, { compact }) : renderInterpretationFlowEmpty(output, selfUnderstanding, { compact });
  }
  const date = output?.target?.date ? formatLocalDate(output.target.date) : "今回";
  const meta = interpretationFlowCandidateMeta(candidate);
  const materials = renderMaterialRows(output, selfUnderstanding);
  const reference = selectInterpretationReferenceKnowledge(output, { bodyPair: true });
  return `<div class="interpretation-room interpretation-flow-room interpretation-context-room ${compact ? "interpretation-flow-room--compact" : "interpretation-flow-room--wide"}" data-interpretation-room-state="interpretation-context-first" data-interpretation-flow-stage="focus">
    <header class="interpretation-flow-head"><div><small>${escapeHtml(date)}</small><h1>今回の自分を見ていく</h1><p>自分の体験を主役にして、RunLoadの情報と参考情報を必要な順に確認します。</p></div>${renderInterpretationFlowStageGuide()}</header>
    <div class="interpretation-flow-layout"><main class="interpretation-flow-canvas"><div class="interpretation-flow-canvas-kicker" data-interpretation-flow-title-focus><small>今回、まず見るところ</small><h2>${escapeHtml(meta.observationLabel)}</h2><p>最初は自分で記録した内容だけを見ます。</p></div><div class="interpretation-flow-canvas-kicker" data-interpretation-flow-title-compare><small>考える材料を追加</small><h2>${escapeHtml(meta.observationLabel)}について別の情報も確認できます</h2><p>自分の感覚を中心に、別の情報を補助材料として並べます。</p></div>${renderInterpretationFlowBodyPair(candidate)}${renderInterpretationContextReferenceKnowledge(reference, output)}${materials.length ? `<details class="interpretation-flow-more-materials interpretation-context-secondary-materials" data-interpretation-flow-reveal="compare"><summary>補足の材料を見る <b>${materials.length}</b></summary>${renderInterpretationMaterialPanel(output, selfUnderstanding)}</details>` : ""}</main>${renderInterpretationFlowFirstRail(candidate)}</div>
    ${renderInterpretationLoopDetails(output, { compact })}
  </div>`;
}

function activeEpisodeForTarget(thread = {}, output = {}) {
  return (thread.newEpisodes || []).find((episode) => String(episode.recordId || "") === String(output?.target?.recordId || "")) || thread.newEpisodes?.[0] || null;
}

function renderInterpretationFlowActiveEpisodeCard(episode = {}, label = "今回") {
  if (!episode) return "";
  const contextLine = interpretationContextRunContextLine(episode.runContext || {}, episode.postRofJ);
  if (episode.row && finite(episode.row.value)) {
    const observation = episode.observation || null;
    return `<article class="interpretation-flow-episode interpretation-context-episode"><time>${escapeHtml(episode.date ? formatLocalDate(episode.date) : label)}</time><div>${observation ? `<span class="interpretation-context-episode-user"><small>自分の記録</small><strong>${escapeHtml(sensationLabel(observation.sensationType))}${Number.isFinite(Number(observation.intensity)) ? `・${escapeHtml(bodyObservationIntensityDisplay(observation.intensity))}` : ""}</strong></span>` : ""}<span class="interpretation-context-episode-model"><small>補助：部位表示</small><strong>${escapeHtml(number(episode.row.value))}</strong></span></div>${contextLine ? `<p class="interpretation-context-episode-context"><small>その日の条件</small>${escapeHtml(contextLine)}</p>` : ""}</article>`;
  }
  if (episode.kind === "CONTEXT_QUESTION") {
    return `<article class="interpretation-flow-episode interpretation-context-episode"><time>${escapeHtml(episode.date ? formatLocalDate(episode.date) : label)}</time><div><span class="interpretation-context-episode-user"><small>走行記録</small><strong>${escapeHtml(contextLine || "今回の走行記録があります")}</strong></span></div></article>`;
  }
  if (finite(episode.postRofJ)) return `<article class="interpretation-flow-episode interpretation-context-episode"><time>${escapeHtml(episode.date ? formatLocalDate(episode.date) : label)}</time><div><span class="interpretation-context-episode-user"><small>走行後の疲労感</small><strong>${escapeHtml(number(episode.postRofJ, 0))} / 10</strong></span></div>${contextLine ? `<p class="interpretation-context-episode-context"><small>その日の条件</small>${escapeHtml(contextLine)}</p>` : ""}</article>`;
  return `<article class="interpretation-flow-episode interpretation-context-episode"><time>${escapeHtml(episode.date ? formatLocalDate(episode.date) : label)}</time><div><span><small>記録</small><strong>今回の記録があります</strong></span></div>${contextLine ? `<p class="interpretation-context-episode-context"><small>その日の条件</small>${escapeHtml(contextLine)}</p>` : ""}</article>`;
}

function renderInterpretationFlowActiveRail(thread = {}) {
  return `<aside class="interpretation-flow-rail" aria-label="確認中の問いの操作">
    <section class="interpretation-flow-rail-step" data-interpretation-flow-only-stage="focus"><small>前回から</small><h2>今回の新しい記録を見ます</h2><p>以前、自分で続けると決めた問いに、今回の比較材料が加わりました。</p><button type="button" class="interpretation-flow-primary" data-action="interpretation-flow-flow-stage" data-next-stage="compare">これまでと見比べる</button></section>
    <section class="interpretation-flow-rail-step" data-interpretation-flow-only-stage="compare"><small>見比べる</small><h2>結論を決める必要はありません</h2><p>並びは事実として確認します。改善・悪化・原因・安全性は判定しません。</p><button type="button" class="interpretation-flow-primary" data-action="interpretation-flow-flow-stage" data-next-stage="decision">この問いをどうするか決める</button><button type="button" class="interpretation-flow-text-button" data-action="interpretation-flow-flow-stage" data-next-stage="focus">今回の記録に戻る</button></section>
    <section class="interpretation-flow-rail-step" data-interpretation-flow-only-stage="decision"><small>自分で選ぶ</small><h2>この問いを続けますか？</h2><div class="interpretation-flow-question"><span aria-hidden="true">?</span><strong>${escapeHtml(thread.title || compactThreadTitle(thread))}</strong></div><details class="interpretation-flow-note"><summary>今回のメモを残す（任意）</summary><textarea data-self-understanding-note maxlength="500" rows="2" placeholder="自分の言葉で残したいことだけ"></textarea></details><div class="interpretation-flow-decision-actions"><button type="button" class="interpretation-flow-primary" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(thread.id)}" data-thread-decision="KEEP_WATCHING">このまま続ける</button><button type="button" class="interpretation-flow-secondary" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(thread.id)}" data-thread-decision="CLOSE">ここで終える</button><button type="button" class="interpretation-flow-text-button" data-action="review-self-understanding-thread" data-thread-id="${escapeHtml(thread.id)}" data-thread-decision="PAUSE">いったん休止する</button></div></section>
    <section class="interpretation-flow-rail-step" data-interpretation-flow-only-stage="done"><small>更新しました</small><h2>今回の確認を残しました</h2><p>選んだ状態だけを記録しました。RunLoadが傾向や結論を確定したわけではありません。</p><a class="interpretation-flow-secondary interpretation-flow-link-button" href="#/history?view=checks">確認してきたことを見る</a></section>
  </aside>`;
}

function renderInterpretationFlowActive(output = {}, selfUnderstanding = null, { compact = false } = {}) {
  const thread = selfUnderstanding?.activeThread || null;
  if (!thread) return renderInterpretationFlowFirst(output, selfUnderstanding, { compact });
  const date = output?.target?.date ? formatLocalDate(output.target.date) : "今回";
  const current = activeEpisodeForTarget(thread, output);
  const previous = [thread.sourceEpisode, ...(thread.eligibleEpisodes || [])].filter(Boolean).filter((episode) => String(episode.recordId || "") !== String(current?.recordId || ""));
  const isContextQuestion = thread.type === "CONTEXT_QUESTION";
  const reference = isContextQuestion
    ? getInterpretationReferenceKnowledgeById(thread.subject?.articleId || "")
    : selectInterpretationReferenceKnowledge(output, { bodyPair: thread.type === "REGION_OBSERVATION_PAIR" });
  const historyLabel = isContextQuestion ? "これまで確認した走行" : "比較できる記録";
  return `<div class="interpretation-room interpretation-flow-room interpretation-context-room ${compact ? "interpretation-flow-room--compact" : "interpretation-flow-room--wide"}" data-interpretation-room-state="interpretation-context-active" data-interpretation-flow-stage="focus">
    <header class="interpretation-flow-head"><div><small>${escapeHtml(date)}</small><h1>前回から見ていたこと</h1><p>${escapeHtml(thread.title || compactThreadTitle(thread))}</p></div>${renderInterpretationFlowStageGuide()}</header>
    <div class="interpretation-flow-layout"><main class="interpretation-flow-canvas"><div class="interpretation-flow-canvas-kicker"><small>今回、新しい材料があります</small><h2>今回の自分の記録から確認します</h2><p>数値だけでなく、その日の距離・時間・疲労感などの文脈も一緒に見ます。</p></div><div class="interpretation-flow-active-current">${renderInterpretationFlowActiveEpisodeCard(current, "今回")}</div><section class="interpretation-flow-previous" data-interpretation-flow-reveal="compare"><header><small>これまで</small><h3>${escapeHtml(historyLabel)} ${escapeHtml(String(Number(thread.eligibleCount || previous.length + 1)))}件</h3></header><div>${previous.slice(-4).map((episode) => renderInterpretationFlowActiveEpisodeCard(episode)).join("")}</div><p>記録の並びと背景は一緒に確認しますが、傾向の確定・原因推定・良し悪しの判定は行いません。</p></section>${renderInterpretationContextReferenceKnowledge(reference, output, { compact: true })}</main>${renderInterpretationFlowActiveRail(thread)}</div>
    ${renderInterpretationLoopDetails(output, { compact })}
  </div>`;
}

function renderInterpretationFlowEmpty(output = {}, selfUnderstanding = null, { compact = false } = {}) {
  const date = output?.target?.date ? formatLocalDate(output.target.date) : "今回";
  const materials = renderMaterialRows(output, selfUnderstanding);
  return `<div class="interpretation-room interpretation-flow-room interpretation-flow-room--empty ${compact ? "interpretation-flow-room--compact" : "interpretation-flow-room--wide"}" data-interpretation-room-state="interpretation-flow-empty" data-interpretation-flow-stage="done"><header class="interpretation-flow-head"><div><small>${escapeHtml(date)}</small><h1>今回を見比べる</h1><p>必要な材料がないときは、無理に意味や問いを作りません。</p></div></header><section class="interpretation-flow-empty-card"><span aria-hidden="true">—</span><h2>今回は、続けて確かめる問いはまだありません</h2><p>今回の走行結果はそのまま確認できます。身体の記録と対応する情報、または以前から確認中の問いに新しい材料ができたときに、ここで見比べられます。</p><a class="interpretation-flow-primary interpretation-flow-link-button" href="#/result?recordId=${encodeURIComponent(output?.target?.recordId || "")}">結果に戻る</a>${materials.length ? `<details class="interpretation-flow-more-materials"><summary>今回の材料を見る <b>${materials.length}</b></summary>${renderInterpretationMaterialPanel(output, selfUnderstanding)}</details>` : ""}</section></div>`;
}

function renderInterpretationLoopDetails(output = {}, { compact = false } = {}) {
  const next = output?.next || {};
  const actions = [next.primaryAction, ...(next.otherActions || [])].filter((action) => action && action.enabled !== false);
  const actionLinks = actions.length
    ? `<nav class="interpretation-loop-secondary-actions" aria-label="ほかの操作">${actions.map((action) => { const copy = actionCopy(action); return `<a href="${escapeHtml(actionHref(action, output))}"><span>${interpretationIcon(copy.icon)}</span><strong>${escapeHtml(copy.title)}</strong></a>`; }).join("")}</nav>`
    : "";
  const detail = `${renderPatternBoard(output)}${renderContextBoard(output)}${output?.selectedRegion ? `<div class="interpretation-room-selected-advanced-stack">${renderAdvanced(output, output.selectedRegion)}</div>` : ""}${actionLinks}`;
  return `<details class="interpretation-flow-technical-more interpretation-loop-more${compact ? " interpretation-loop-more--compact" : ""}"><summary>計算・条件・根拠を詳しく見る</summary><div>${detail}</div></details>`;
}

function renderCompactInterpretationLoop(output = {}, selfUnderstanding = null) {
  if (selfUnderstanding?.activeThread) return renderInterpretationFlowActive(output, selfUnderstanding, { compact: true });
  return renderInterpretationFlowFirst(output, selfUnderstanding, { compact: true });
}

function renderWideInterpretationLoop(output = {}, selfUnderstanding = null) {
  if (selfUnderstanding?.activeThread) return renderInterpretationFlowActive(output, selfUnderstanding, { compact: false });
  return renderInterpretationFlowFirst(output, selfUnderstanding, { compact: false });
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
export function renderInterpretationRoom({ output, selfUnderstanding = null, savedInterpretation = null, interpretationFocus = "", compactLayout = false } = {}) {
  if (!output?.state?.targetAvailable) {
    return `<div class="interpretation-room interpretation-room--empty" data-interpretation-room-state="empty"><header class="interpretation-room-hero"><p>結果を整理する</p><h1>対象の保存記録がありません</h1></header><a class="interpretation-room-action interpretation-room-action--primary" href="#/record-input"><span class="interpretation-room-action__icon">${interpretationIcon("record")}</span><span class="interpretation-room-action__copy"><strong>記録を始める</strong></span><i aria-hidden="true">›</i></a></div>`;
  }
  if (output?.state?.support && output.state.support !== "NORMAL") return renderSupportPriority(output);
  if (output?.state?.regional === "REST") return renderRest(output);

  if (!compactLayout) return renderWideInterpretationLoop(output, selfUnderstanding, savedInterpretation, interpretationFocus);
  return renderCompactInterpretationLoop(output, selfUnderstanding, savedInterpretation, interpretationFocus);
}

import {
  BODY_AREA_LATERALITY,
  BODY_AREA_LATERALITY_LABELS,
  BODY_AREA_TAXONOMY,
  SAFETY_FLAG_KEYS,
  bodyRegionFamiliarName,
} from "../core/runloadCore.js";
import { escapeHtml } from "./commonComponents.js";
import { SAFETY_FLAG_LABELS } from "./recordPresentation.js";
import { subjectiveFieldsFromFeedback, subjectiveSummaryFromFields } from "./subjectivePresentation.js";
import {
  ACTIVE_FOCUS_TAG_OPTIONS,
  personalContextFieldsFromRecord,
  personalSummaryFromFields,
} from "./personalContextPresentation.js";

const FRONT = '<circle cx="150" cy="36" r="20"></circle><path d="M110 78 C120 66 135 60 150 60 C165 60 180 66 190 78 L204 126 C208 138 204 150 196 160 L182 176 L188 212 C192 228 190 246 184 262 L172 308 C168 324 166 340 166 356 L166 400 C166 410 158 418 148 418 C138 418 130 410 130 400 L130 356 C130 340 128 324 124 308 L112 262 C106 246 104 228 108 212 L114 176 L100 160 C92 150 88 138 92 126 Z"></path>';
const BACK = '<circle cx="150" cy="36" r="20"></circle><path d="M112 76 C122 66 136 60 150 60 C164 60 178 66 188 76 L202 124 C206 136 202 150 194 160 L182 174 L188 212 C192 228 190 244 184 262 L172 310 C168 326 166 342 166 358 L166 402 C166 412 158 420 148 420 C138 420 130 412 130 402 L130 358 C130 342 128 326 124 310 L112 262 C106 244 104 228 108 212 L114 174 L102 160 C94 150 90 136 94 124 Z"></path>';
const FOOT = '<path d="M114 78 C126 66 140 60 154 60 C172 60 186 72 194 92 C198 102 200 116 200 132 L200 238 C200 274 186 306 160 320 C150 326 140 326 130 320 C108 306 96 274 96 238 L96 132 C96 112 102 90 114 78 Z"></path>';

export const RECORD_REGIONAL_SUBJECTIVE_AREAS = Object.freeze([
  Object.freeze({ regionId: "BA-DISP-014", label: bodyRegionFamiliarName("BA-DISP-014"), areaId: "BFR-200-COX", view: "front", path: "M120 142 C130 132 140 128 150 128 C160 128 170 132 180 142 L178 178 C168 184 160 188 150 188 C140 188 132 184 122 178 Z" }),
  Object.freeze({ regionId: "BA-DISP-015", label: bodyRegionFamiliarName("BA-DISP-015"), areaId: "BFR-210-GLU", view: "back", path: "M120 138 C130 150 139 158 150 158 C161 158 170 150 180 138 L180 190 C170 200 160 205 150 205 C140 205 130 200 120 190 Z" }),
  Object.freeze({ regionId: "BA-DISP-016", label: bodyRegionFamiliarName("BA-DISP-016"), areaId: "BFR-220-ANT", view: "front", path: "M122 190 C132 198 141 202 150 202 C159 202 168 198 178 190 L174 266 C164 274 158 278 150 278 C142 278 136 274 126 266 Z" }),
  Object.freeze({ regionId: "BA-DISP-018", label: bodyRegionFamiliarName("BA-DISP-018"), areaId: "BFR-220-POST", view: "back", path: "M122 196 C132 204 141 209 150 209 C159 209 168 204 178 196 L174 274 C164 282 158 286 150 286 C142 286 136 282 126 274 Z" }),
  Object.freeze({ regionId: "BA-DISP-019", label: bodyRegionFamiliarName("BA-DISP-019"), areaId: "BFR-230-ANT", view: "front", path: "M126 270 C136 278 142 281 150 281 C158 281 164 278 174 270 L170 300 C162 306 157 309 150 309 C143 309 138 306 130 300 Z" }),
  Object.freeze({ regionId: "BA-DISP-021", label: bodyRegionFamiliarName("BA-DISP-021"), areaId: "BFR-240-ANT", view: "front", path: "M130 306 C138 314 144 318 150 318 C156 318 162 314 170 306 L166 382 C160 390 156 394 150 394 C144 394 140 390 134 382 Z" }),
  Object.freeze({ regionId: "BA-DISP-023", label: bodyRegionFamiliarName("BA-DISP-023"), areaId: "BFR-240-POST", view: "back", path: "M128 288 C136 298 143 302 150 302 C157 302 164 298 172 288 L166 368 C160 378 156 383 150 383 C144 383 140 378 134 368 Z" }),
  Object.freeze({ regionId: "BA-DISP-024", label: bodyRegionFamiliarName("BA-DISP-024"), areaId: "BFR-250-ANT", view: "front", path: "M135 386 L165 386 L166 416 L134 416 Z" }),
  Object.freeze({ regionId: "BA-DISP-025", label: bodyRegionFamiliarName("BA-DISP-025"), areaId: "BFR-250-POST", view: "back", path: "M142 370 C146 378 148 382 150 382 C152 382 154 378 158 370 L158 416 H142 Z" }),
  Object.freeze({ regionId: "BA-DISP-027", label: bodyRegionFamiliarName("BA-DISP-027"), areaId: "BFR-260-REAR", view: "sole", path: "M104 240 C118 254 132 262 148 264 C164 266 178 260 190 252 C186 282 174 304 158 314 C148 320 138 318 128 312 C112 300 104 274 104 240 Z" }),
  Object.freeze({ regionId: "BA-DISP-028", label: bodyRegionFamiliarName("BA-DISP-028"), areaId: "BFR-260-MID", view: "sole", path: "M106 154 C120 166 136 172 154 172 C170 172 182 168 190 164 L190 252 C176 260 162 264 148 262 C130 260 116 252 104 240 L104 176 Z" }),
  Object.freeze({ regionId: "BA-DISP-029", label: bodyRegionFamiliarName("BA-DISP-029"), areaId: "BFR-260-FORE", view: "sole", path: "M112 92 C124 84 138 80 154 80 C174 80 188 94 190 120 L190 164 C174 170 158 172 140 168 C126 165 114 158 106 148 L106 120 C107 108 109 99 112 92 Z" }),
]);

const AREA_BY_ID = Object.freeze(Object.fromEntries(BODY_AREA_TAXONOMY.map((area) => [area.id, area])));
const REGIONAL_AREA_IDS = new Set(RECORD_REGIONAL_SUBJECTIVE_AREAS.map((item) => item.areaId));
const CONSULTATION_FLAG_KEYS = Object.freeze([
  "severePain",
  "significantSwelling",
  "cannotBearWeight",
  "movementDifficulty",
  "numbnessOrWeakness",
  "painAtRestOrNight",
  "chestPainOrPressure",
  "breathingDifficulty",
]);

function selected(value, expected) {
  return String(value ?? "") === String(expected) ? " selected" : "";
}
function checked(value) {
  return value === true || value === "1" || value === "on" || value === "true" ? " checked" : "";
}
function statusChecked(status, expected) {
  return status === expected ? " checked" : "";
}

function renderBodyMap(fields) {
  const views = [
    { key: "front", title: "前面", silhouette: FRONT },
    { key: "back", title: "後面", silhouette: BACK },
    { key: "sole", title: "足裏", silhouette: FOOT },
  ];
  return `<div class="subjective-body-map" data-record-subjective-body-map>${views.map((view) => `<figure><figcaption>${view.title}</figcaption><svg viewBox="70 10 160 430" aria-label="${view.title}の身体図"><g class="subjective-silhouette">${view.silhouette}</g>${RECORD_REGIONAL_SUBJECTIVE_AREAS.filter((item) => item.view === view.key).map((item) => {
    const area = AREA_BY_ID[item.areaId];
    const intensity = Number(fields[`bodyArea_${area.key}`] || 0);
    return `<path tabindex="0" role="button" aria-pressed="${intensity > 0}" class="subjective-region-path" data-record-body-region="${escapeHtml(item.areaId)}" data-level="${escapeHtml(intensity)}" d="${item.path}"><title>${escapeHtml(item.label)}</title></path>`;
  }).join("")}</svg></figure>`).join("")}</div>`;
}

function renderBodyStateInputs(fields) {
  return BODY_AREA_TAXONOMY.map((area) => `<input type="hidden" name="bodyArea_${escapeHtml(area.key)}" value="${escapeHtml(fields[`bodyArea_${area.key}`] || "0")}" data-record-body-score="${escapeHtml(area.id)}"><input type="hidden" name="bodyAreaLaterality_${escapeHtml(area.key)}" value="${escapeHtml(fields[`bodyAreaLaterality_${area.key}`] || BODY_AREA_LATERALITY.unknown)}" data-record-body-side="${escapeHtml(area.id)}">`).join("");
}

function renderSafetyFlags(fields) {
  const visible = CONSULTATION_FLAG_KEYS.map((flag) => `<label><input type="checkbox" name="safety_${escapeHtml(flag)}" value="1"${checked(fields[`safety_${flag}`])}><span>${escapeHtml(SAFETY_FLAG_LABELS[flag] || flag)}</span></label>`).join("");
  const hidden = SAFETY_FLAG_KEYS.filter((flag) => !CONSULTATION_FLAG_KEYS.includes(flag)).map((flag) => `<input type="hidden" name="safety_${escapeHtml(flag)}" value="">`).join("");
  return `${hidden}<div class="safety-check-grid">${visible}</div>`;
}

export function renderEmbeddedSubjectiveSubflow(feedback = {}) {
  const fields = subjectiveFieldsFromFeedback(feedback);
  const summary = subjectiveSummaryFromFields(fields);
  const status = String(fields.subjectiveStatus || "deferred");
  const bodyVisible = ["discomfort_reported", "strong_reported"].includes(status);
  const consultVisible = status === "strong_reported";
  return `<div class="subscreen" data-record-subflow="subjective" hidden aria-labelledby="record-body-subflow-title"><header><button type="button" class="record-subscreen__back" data-action="close-record-subflow">‹ <span>今日の記録</span></button><strong id="record-body-subflow-title">身体の記録</strong><span></span></header><main><section class="sub-flow"><div class="sub-flow-head"><p class="eyebrow">BODY RECORD</p><h2>今回の身体記録</h2><p>入力しない状態と、確認した状態を分けて残します。</p></div>
    <fieldset class="sub-choice-grid"><legend>今回の記録</legend><label><input type="radio" name="subjectiveStatus" value="deferred"${statusChecked(status, "deferred")}><span><strong>今回は確認しない</strong><small>未確認のまま戻る</small></span></label><label><input type="radio" name="subjectiveStatus" value="none_reported"${statusChecked(status, "none_reported")}><span><strong>確認したが部位は記録しない</strong><small>確認済みとして残す</small></span></label><label><input type="radio" name="subjectiveStatus" value="discomfort_reported"${statusChecked(status, "discomfort_reported")}><span><strong>気になる場所を残す</strong><small>身体図から部位を選ぶ</small></span></label><label><input type="radio" name="subjectiveStatus" value="strong_reported"${statusChecked(status, "strong_reported")}><span><strong>相談したい内容を残す</strong><small>部位と伝えたい事実を整理</small></span></label></fieldset>
    <input type="hidden" name="subjectiveDetailType" value="">${renderBodyStateInputs(fields)}
    <div class="body-area-entry" data-record-body-entry${bodyVisible ? "" : " hidden"}><div class="sub-section-head"><small>12部位</small><strong>身体図から選ぶ</strong><span>部位をタップして追加します。</span></div>${renderBodyMap(fields)}<div class="selected-body-summary" data-record-selected-body-summary>${escapeHtml(summary.bodyAreas.length ? `${summary.bodyAreas.length}部位を入力中` : "部位は未選択です。")}</div><div class="selected-body-list" data-record-selected-body-list></div><div class="sub-two-fields"><label class="field"><span>気づいた時点・任意</span><select name="bodyObservationTiming"><option value="UNKNOWN"${selected(fields.bodyObservationTiming || "UNKNOWN", "UNKNOWN")}>未設定</option><option value="PRE_RUN"${selected(fields.bodyObservationTiming, "PRE_RUN")}>走る前から</option><option value="DURING_RUN"${selected(fields.bodyObservationTiming, "DURING_RUN")}>走行中</option><option value="IMMEDIATE_POST"${selected(fields.bodyObservationTiming, "IMMEDIATE_POST")}>走行直後</option><option value="LATER"${selected(fields.bodyObservationTiming, "LATER")}>しばらく後</option></select></label><label class="field"><span>感じ方・任意</span><select name="bodyObservationSensation"><option value="NOT_SELECTED"${selected(fields.bodyObservationSensation || "NOT_SELECTED", "NOT_SELECTED")}>未設定</option><option value="FATIGUE"${selected(fields.bodyObservationSensation, "FATIGUE")}>疲れ・だるさ</option><option value="TIGHTNESS"${selected(fields.bodyObservationSensation, "TIGHTNESS")}>張り・硬さ</option><option value="DISCOMFORT"${selected(fields.bodyObservationSensation, "DISCOMFORT")}>気になる感じ</option><option value="OTHER"${selected(fields.bodyObservationSensation, "OTHER")}>その他</option></select></label></div><label class="field"><span>選択部位の補足・任意</span><textarea name="bodyObservationNote" rows="3" maxlength="240" placeholder="例：走行後に少し張った">${escapeHtml(fields.bodyObservationNote || "")}</textarea></label></div>
    <details class="sub-extra" data-record-consultation-extra${consultVisible ? "" : " hidden"}><summary><span><strong>相談相手に伝えたい事実</strong><small>当てはまる内容がある場合だけ</small></span><i>⌄</i></summary><div class="sub-extra-body"><p>RunLoadの数値で緊急性を判定せず、本人が伝えたい事実だけを残します。</p>${renderSafetyFlags(fields)}<input type="hidden" name="unexpectedSymptom" value=""><input type="hidden" name="symptomTiming" value=""><input type="hidden" name="symptomStartedWhen" value=""><input type="hidden" name="symptomNote" value=""><label class="field"><span>相談メモ・任意</span><textarea name="consultationNote" rows="3" maxlength="500" placeholder="確認してほしいこと">${escapeHtml(fields.consultationNote || "")}</textarea></label><a class="sub-support-link" href="#/support-guidance?returnTo=%23%2Frecord-input%3Fsubflow%3Dsubjective">公的サポートを確認 <span>›</span></a></div></details>
    <button type="button" class="sub-flow-save" data-action="apply-body-subflow">この内容で今日の記録へ戻る</button>
  </section></main></div>`;
}

function savedShoeOptions(savedShoes = [], currentId = "") {
  return [`<option value="">使わない</option>`, ...savedShoes.map((shoe) => `<option value="${escapeHtml(shoe.id)}"${selected(currentId, shoe.id)}>${escapeHtml(shoe.label || "名称なし")}</option>`)].join("");
}

export function renderEmbeddedPersonalSubflow(record = {}, settings = {}) {
  const fields = personalContextFieldsFromRecord(record);
  const summary = personalSummaryFromFields(fields);
  const savedShoes = Array.isArray(settings.savedShoes) ? settings.savedShoes : [];
  return `<div class="subscreen" data-record-subflow="personal" hidden aria-labelledby="record-personal-subflow-title"><header><button type="button" class="record-subscreen__back" data-action="close-record-subflow">‹ <span>今日の記録</span></button><strong id="record-personal-subflow-title">今回のシューズ</strong><span></span></header><main><section class="sub-flow"><div class="sub-flow-head"><p class="eyebrow">SHOES</p><h2>今回のシューズ</h2><p>今回使ったシューズと、意識したことだけを残します。</p></div>
    <section class="sub-card"><div class="sub-section-head"><small>SHOES</small><strong>今日使ったもの</strong></div><label class="field"><span>保存シューズ・任意</span><select name="personalShoeId" data-record-saved-shoe>${savedShoeOptions(savedShoes, fields.personalShoeId || "")}</select></label><label class="field"><span>シューズ名・呼び名・任意</span><input name="personalShoeLabel" type="text" maxlength="80" value="${escapeHtml(fields.personalShoeLabel || "")}" placeholder="例：いつもの黒い靴"></label><input type="hidden" name="personalShoeType" value="${escapeHtml(fields.personalShoeType || "")}"><input type="hidden" name="personalShoeSoftness" value="${escapeHtml(fields.personalShoeSoftness || "")}"><input type="hidden" name="personalFreeNote" value="${escapeHtml(fields.personalFreeNote || "")}"><label class="sub-check"><input type="checkbox" name="saveCurrentShoePreset" value="1"><span><strong>今回のシューズを次回も使えるよう保存</strong><small>名称がある場合だけ保存</small></span></label></section>
    <section class="sub-card"><div class="sub-section-head"><small>FOCUS</small><strong>今日意識したこと</strong><span>複数選択できます。</span></div><div class="focus-tag-grid">${ACTIVE_FOCUS_TAG_OPTIONS.map((option) => `<label><input type="checkbox" name="personalFocus_${escapeHtml(option.value)}" value="1"${checked(fields[`personalFocus_${option.value}`])}><span>${escapeHtml(option.label)}</span></label>`).join("")}</div><p class="sub-note">ここで選んだ内容は数値結果の係数には使いません。自由記述は「気づきと次回」にまとめます。</p></section><p class="sub-note" data-record-personal-subflow-summary>${escapeHtml(summary.description)}</p><button type="button" class="sub-flow-save" data-action="apply-personal-subflow">この内容で今日の記録へ戻る</button>
  </section></main></div>`;
}

export const RECORD_CONSULTATION_FLAG_KEYS = CONSULTATION_FLAG_KEYS;
export const RECORD_REGIONAL_AREA_IDS = Object.freeze([...REGIONAL_AREA_IDS]);

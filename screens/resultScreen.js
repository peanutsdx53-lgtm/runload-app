import {
  escapeHtml,
  renderPageHeading,
  renderScreenGuide,
  renderStatusLabel,
} from "../ui/commonComponents.js";
import {
  SAFETY_FLAG_LABELS,
  SUBJECTIVE_STATUS_LABELS,
  formatActivitySummary,
  formatLocalDate,
  formatNumber,
} from "../ui/recordPresentation.js";
import { personalContextDisplayItems } from "../ui/personalContextPresentation.js";
import { courseSummaryText } from "../ui/coursePresentation.js";
import { normalizeJournalSettings } from "../ui/appSettings.js";
import { renderBodyRegionResultCard } from "../ui/bodyRegionResultPresentation.js";
import { PRIMARY_REGIONAL_V2_MODEL_VERSION } from "../core/runloadCore.js";
import { renderResultWorkspaceNavigation } from "../ui/screenArchitecture.js";
import { bodyAreaLateralityLabel } from "../core/runloadCore.js";
import { officialRofJDescriptor } from "../core/secondPillarRofJ.js";

function runningFormatLabel(value) {
  return {
    CONTINUOUS_RUN: "途中で歩かず走った",
    RUN_WALK: "走りと歩きを混ぜた",
    UNKNOWN: "未設定",
  }[String(value || "UNKNOWN")] || "未設定";
}

function stepsSourceLabel(value) {
  return {
    DEVICE_MEASURED: "端末・時計で計測",
    DEVICE_SYNCED: "端末連携",
    ESTIMATED: "手入力・おおよそ",
    UNKNOWN: "未設定",
  }[String(value || "UNKNOWN")] || "未設定";
}


function regionalModelSpeedMps(record = {}) {
  const runWalk = String(record.runningFormat || "UNKNOWN").toUpperCase() === "RUN_WALK";
  const distanceKm = Number(runWalk ? record.runWalkRunningDistanceKm : record.distanceKm);
  const durationMinutes = Number(runWalk ? record.runWalkRunningDurationMinutes : record.durationMinutes);
  return distanceKm > 0 && durationMinutes > 0 ? distanceKm * 1000 / (durationMinutes * 60) : null;
}

function renderModelFamilyBoundary(record = {}, regionalV2ResultRecord = null) {
  const notes = [];
  if (String(record.runningFormat || "UNKNOWN").toUpperCase() === "RUN_WALK") notes.push("走りと歩きを混ぜた記録では、12部位の目安は走った区間だけを使います。歩いた区間は含めません。");
  if (regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION) {
    notes.push("部位ごとに目安を出せる条件が異なります。分からない条件は0にせず、確認できる条件だけを反映します。");
    if (regionalV2ResultRecord?.result?.combinedConditionState === "AXES_PRESERVED_NOT_COMBINED") notes.push("複数の条件を一緒に確認できない場合は、別々の目安として表示します。");
  }
  return `<aside class="safety-notice model-family-boundary" aria-label="表示の読み方"><p><strong>12部位の目安は、各部位自身の基準条件を100としたReference-100です。</strong> 距離そのものを数値へ掛けません。100は安全・正常・平均・おすすめを示す数値ではありません。別の部位どうしは比べません。</p>${notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}</aside>`;
}

function signedNumber(value) {
  if (!Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  return `${n > 0 ? "+" : ""}${formatNumber(n, 0)}`;
}

function renderRofJPosition(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "未記録";
  const descriptor = officialRofJDescriptor(Number(value));
  return `${formatNumber(Number(value), 0)} / 10${descriptor ? ` — ${escapeHtml(descriptor)}` : ""}`;
}

function renderSecondPillarResultCard(services, record = {}) {
  if (record.activityType !== "run" || !services?.secondPillar) return "";
  const summary = services.secondPillar.summarizeRun(record.id);
  if (!summary?.available) {
    return `<section class="result-card result-card--second-pillar frozen-fatigue-card" data-information-role="second-pillar" aria-labelledby="second-pillar-title"><div class="result-card__heading"><div><p>TIME CHANGE / ROF-J</p><h2 id="second-pillar-title">疲労感の変化から見る</h2></div>${renderStatusLabel("未記録", "neutral")}</div><p>今回はROF-Jを記録していません。12部位のReference-100とは別の任意記録です。</p></section>`;
  }
  return `<section class="result-card result-card--second-pillar frozen-fatigue-card" data-information-role="second-pillar" aria-labelledby="second-pillar-title"><div class="result-card__heading"><div><p>TIME CHANGE / ROF-J</p><h2 id="second-pillar-title">疲労感の変化から見る</h2></div>${renderStatusLabel("ROF-J", "info")}</div><p class="source-boundary">ROF-Jはその時点の主観的な疲労感です。12部位のReference-100とは別の情報で、回復度、準備状態、傷害リスク、安全性を判定する数値ではありません。</p><dl class="frozen-fatigue-values"><div><dt>走る前</dt><dd>${renderRofJPosition(summary.pre)}</dd></div><div><dt>前後差</dt><dd>${Number.isFinite(summary.delta) ? escapeHtml(signedNumber(summary.delta)) : "—"}</dd><small>POST − PRE</small></div><div><dt>走った後</dt><dd>${renderRofJPosition(summary.post)}</dd></div></dl><p class="muted-text">値の高低や前後差を良し悪しへ置き換えません。</p></section>`;
}

function formatPace(record = {}) {
  const distance = Number(record.distanceKm);
  const duration = Number(record.durationMinutes);
  if (!(distance > 0) || !(duration > 0)) return "—";
  const seconds = Math.round((duration * 60) / distance);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function renderFrozenRunSummary(record = {}) {
  if (record.activityType === "rest") return `<section class="frozen-run-summary frozen-run-summary--rest"><strong>休養日</strong><span>${escapeHtml(formatLocalDate(record.date))}</span></section>`;
  return `<section class="frozen-run-summary" aria-label="今回の走行概要"><div><strong>${escapeHtml(formatNumber(record.distanceKm, 2))}</strong><span>km</span><small>距離</small></div><i></i><div><strong>${escapeHtml(formatNumber(record.durationMinutes, 1))}</strong><span>分</span><small>実走時間</small></div><i></i><div><strong>${escapeHtml(formatPace(record))}</strong><span>/km</span><small>平均ペース</small></div></section>`;
}

function renderRecordFacts(record = {}) {
  return `<dl class="fact-grid">
    <div><dt>日付</dt><dd>${escapeHtml(formatLocalDate(record.date))}</dd></div>
    <div><dt>種類</dt><dd>${record.activityType === "rest" ? "休養" : "走行"}</dd></div>
    <div><dt>記録内容</dt><dd>${escapeHtml(formatActivitySummary(record))}</dd></div>
    ${record.activityType === "run" ? `<div><dt>走行形式</dt><dd>${escapeHtml(runningFormatLabel(record.runningFormat))}</dd></div><div><dt>歩数の取得元</dt><dd>${escapeHtml(stepsSourceLabel(record.stepsProvenance))}</dd></div>` : ""}
    <div class="fact-grid__wide"><dt>コース条件</dt><dd>${escapeHtml(courseSummaryText(record.course || {}))}</dd></div>
    ${record.memo ? `<div class="fact-grid__wide"><dt>メモ</dt><dd>${escapeHtml(record.memo).replaceAll("\n", "<br>")}</dd></div>` : ""}
  </dl>`;
}

function renderRecordFactsCard(record = {}) {
  return `<section class="result-card" data-information-role="fact" aria-labelledby="record-facts-title"><div class="result-card__heading"><div><p>保存した事実</p><h2 id="record-facts-title">今回の記録</h2></div>${renderStatusLabel(record.activityType === "rest" ? "休養" : "走行", "neutral")}</div>${renderRecordFacts(record)}</section>`;
}

function renderPersonalContext(record = {}) {
  const items = personalContextDisplayItems(record.personalContext || {});
  if (!items.length) return "";
  return `<section class="result-card result-card--personal-context" data-information-role="personal" aria-labelledby="personal-context-title">
    <div class="result-card__heading"><div><p>自分で残した補足</p><h2 id="personal-context-title">走り方メモ</h2></div>${renderStatusLabel("走り方の記録", "info")}</div>
    <dl class="fact-grid">${items.map(([label, value]) => `<div${String(value).length > 36 ? ' class="fact-grid__wide"' : ""}><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value).replaceAll("\n", "<br>")}</dd></div>`).join("")}</dl>
    <p class="muted-text">自由記述は自分のメモとして保存します。選択項目は、今回の走りを振り返り、関連する一般説明を探す手掛かりになります。</p>
  </section>`;
}

function subjectiveObservationHistory(experiences = [], record = {}, observation = {}) {
  const areaId = String(observation.areaId || "");
  const laterality = String(observation.laterality || "");
  if (!areaId) return Object.freeze({ count: 0, previousDate: "" });
  const matches = experiences
    .filter((experience) => experience?.record?.id && experience.record.id !== record.id)
    .filter((experience) => String(experience.record.date || "") < String(record.date || ""))
    .flatMap((experience) => (experience.feedback?.bodyAreaObservations || []).map((item) => ({
      recordId: experience.record.id,
      date: experience.record.date,
      item,
    })))
    .filter(({ item }) => String(item.areaId || "") === areaId)
    .filter(({ item }) => !laterality || !item.laterality || String(item.laterality) === laterality)
    .filter(({ item }) => Number(item.intensity) > 0)
    .sort((left, right) => String(left.date || "").localeCompare(String(right.date || "")));
  return Object.freeze({
    count: matches.length,
    previousDate: matches.at(-1)?.date || "",
  });
}

function renderSubjectiveFeedback(feedback = {}, record = {}, experiences = []) {
  const status = feedback?.checkStatus || "not_asked";
  const exactObservations = Array.isArray(feedback?.bodyAreaObservations)
    ? feedback.bodyAreaObservations.filter((item) => Number(item?.intensity) > 0)
    : [];
  const activeFlags = Object.entries(feedback?.safetyFlags || {}).filter(([, active]) => active);
  const hasNarrative = Boolean(feedback?.unexpectedSymptom || feedback?.consultationNote || activeFlags.length);
  const hasBodyEntry = exactObservations.length > 0;
  if (!hasBodyEntry && !hasNarrative && ["deferred", "not_asked"].includes(status)) return "";

  const exactMarkup = exactObservations.length
    ? `<div class="subjective-entry-list">${exactObservations.map((item) => {
      const history = subjectiveObservationHistory(experiences, record, item);
      const historyHref = `#/history?view=trends&metric=subjective&period=90&anchorDate=${encodeURIComponent(record.date || "")}&recordId=${encodeURIComponent(record.id || "")}&areaId=${encodeURIComponent(item.areaId || "")}&laterality=${encodeURIComponent(item.laterality || "")}`;
      return `<article><h3>${escapeHtml(item.label || "詳細部位")}</h3><p>${escapeHtml(bodyAreaLateralityLabel(item.laterality))}・気になる程度 ${escapeHtml(formatNumber(item.intensity, 0))} / 5</p><small>${history.count ? `同じ部位の過去記録 ${history.count}件${history.previousDate ? `・前回 ${formatLocalDate(history.previousDate)}` : ""}` : "同じ部位の過去記録はまだありません"}</small><a class="text-link" href="${escapeHtml(historyHref)}">同じ部位の記録を見る</a></article>`;
    }).join("")}</div>`
    : "";
  const emptyMarkup = `<p class="muted-text">${status === "none_reported" ? "今回は身体の記録を残していません。「問題なし」とは置き換えません。" : record.activityType === "rest" ? "休養日の部位入力はありません。" : "部位ごとの入力はありません。"}</p>`;
  return `<section id="subjective-feedback" class="result-card result-card--subjective${hasBodyEntry || hasNarrative ? "" : " result-card--subjective-compact"}" data-information-role="personal" aria-labelledby="subjective-result-title">
    <div class="result-card__heading"><div><p>身体の記録</p><h2 id="subjective-result-title">身体の記録</h2></div>${renderStatusLabel(SUBJECTIVE_STATUS_LABELS[status] || "身体の記録", status === "strong_reported" ? "attention" : "info")}</div>
    ${exactMarkup || emptyMarkup}
    ${activeFlags.length ? `<div class="safety-flag-summary"><h3>体調確認で選んだ内容</h3><ul>${activeFlags.map(([flag]) => `<li>${escapeHtml(SAFETY_FLAG_LABELS[flag] || flag)}</li>`).join("")}</ul></div>` : ""}
    ${feedback?.unexpectedSymptom ? '<p class="notice-text">「いつもと違う、説明しにくい症状がある」と入力されています。</p>' : ""}
    ${feedback?.consultationNote ? `<div class="consultation-note"><h3>コーチや指導者へ伝えたいこと</h3><p>${escapeHtml(feedback.consultationNote).replaceAll("\n", "<br>")}</p></div>` : ""}
    <p class="source-boundary">ここは自分で入力した記録です。12部位の目安とは分けて表示し、改善・悪化を自動判定しません。</p>
  </section>`;
}

function renderUnavailableRunSummaryCard() {
  return `<section class="result-card result-card--model" data-information-role="model" aria-labelledby="recent-comparison-title">
    <div class="result-card__heading"><div><p>12部位の目安</p><h2 id="recent-comparison-title">この記録ではReference-100を表示できません</h2></div>${renderStatusLabel("保存内容は確認できます", "neutral")}</div>
    <p>この保存記録では、走った内容と身体の記録をそのまま確認できます。目安は表示されません。</p>
  </section>`;
}

function renderRestRegionalCard() {
  return `<section class="result-card result-card--distribution" data-information-role="model" aria-labelledby="distribution-title"><div class="result-card__heading"><div><p>12部位の目安</p><h2 id="distribution-title">走行による12部位の目安はありません</h2></div>${renderStatusLabel("休養記録", "neutral")}</div><div class="rest-distribution"><p>休養日には走行距離と走行条件に基づく12部位の目安を作成しません。</p></div></section>`;
}

function renderResultGuide() {
  return renderScreenGuide({
    id: "result-guide",
    summary: "走った内容、12部位のReference-100、ROF-Jを順に確認できます。",
    sections: [
      { title: "まずここでやること", body: "今回の記録、12部位の目安、過去記録との比較を順に見返します。" },
      { title: "12部位の目安", body: "身体図と部位カードで確認します。12部位を固定順で表示します。絞り込み表示は見やすくするための機能で、安全・危険を示すものではありません。" },
      { title: "表示できる範囲", body: "部位ごとに目安を出せる条件が異なります。分からない条件は0にせず、確認できる条件だけを反映します。" },
      { title: "主観的疲労・変化", body: "ROF-Jを使った記録では、走る前・走った後・前後差を表示します。12部位のReference-100とは別の情報です。" },
    ],
    tutorialId: "result",
  });
}

export function renderResultScreen({ services, context }) {
  const requestedRecordId = context.parameters.get("recordId") || "";
  const experience = requestedRecordId
    ? services.workflows.records.loadExperience(requestedRecordId)
    : services.workflows.records.loadLatestExperience();
  if (!experience) {
    return `<section class="screen screen--result">${renderPageHeading({ eyebrow: "RESULT", title: "今回の走り", description: "保存した走行の結果を確認します。" })}<section class="empty-state" aria-labelledby="empty-result-title"><p class="empty-state__label">現在の状態</p><h2 id="empty-result-title">表示できる記録がありません</h2><p>走行記録を保存すると結果を確認できます。</p><div class="screen-actions"><a class="button button--primary" href="#/record-input">記録する</a></div></section></section>`;
  }

  const allExperiences = services.workflows.records.loadAllExperiences();
  const { record, feedback, regionalV2ResultRecord } = experience;
  const settings = normalizeJournalSettings(services.storage.settings.load());
  const regionalInitialView = settings.regionalResultInitialView === "remember"
    ? settings.regionalResultLastView
    : settings.regionalResultInitialView;
  const regionalCard = regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION
    ? renderBodyRegionResultCard({ resultRecord: regionalV2ResultRecord, experiences: allExperiences, initialView: regionalInitialView, showPreviousComparison: settings.showRegionalPreviousComparison })
    : record.activityType === "rest"
      ? renderRestRegionalCard()
      : renderUnavailableRunSummaryCard();
  const secondPillarCard = renderSecondPillarResultCard(services, record);
  const recordCard = renderRecordFactsCard(record);
  const personalContextCard = renderPersonalContext(record);
  const subjectiveCard = renderSubjectiveFeedback(feedback || {}, record, allExperiences);

  return `<section class="screen screen--result frozen-result-screen">
    ${renderPageHeading({ eyebrow: "RESULT", title: "今回の走り", description: formatLocalDate(record.date) })}
    ${renderFrozenRunSummary(record)}
    ${record.activityType === "run" ? renderModelFamilyBoundary(record, regionalV2ResultRecord) : ""}
    ${regionalCard}
    ${secondPillarCard}
    <section class="frozen-result-next-links" aria-label="この結果の次の使い方">
      <a class="result-activation-hub__item" href="#/activation?recordId=${encodeURIComponent(record.id)}"><strong>この結果を次に使う</strong><small>振り返る・相談する・次を考える</small><span aria-hidden="true">→</span></a>
      <a class="result-activation-hub__item" href="#/history?view=trends&metric=region&period=28&anchorDate=${encodeURIComponent(record.date)}&recordId=${encodeURIComponent(record.id)}"><strong>履歴で見る</strong><small>同じ部位の保存記録と比べる</small><span aria-hidden="true">→</span></a>
    </section>
    <details class="result-compact-details"><summary>算出に使った走行事実・身体の記録を見る</summary><div class="result-compact-details__content">${[recordCard, personalContextCard, subjectiveCard].filter(Boolean).join("")}</div></details>
    ${renderResultGuide()}
  </section>`;
}


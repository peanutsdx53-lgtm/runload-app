import { escapeHtml, renderPageHeading, renderStatusLabel } from "../ui/commonComponents.js";
import { SAFETY_FLAG_LABELS, formatActivitySummary, formatLocalDate, formatNumber } from "../ui/recordPresentation.js";
import { registerConsultationDraft } from "../ui/consultationDraftState.js";
import { bodyRegionFormalName } from "../core/runloadCore.js";
import {
  buildReportPresentation,
  createPlanShareMemo,
  createReportCopyText,
  renderReportSheet,
} from "../ui/consultationPresentation.js";



function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function latestPlan(plans = []) {
  const validPlans = Array.isArray(plans)
    ? plans.filter((plan) => plan && plan.id)
    : [];
  if (!validPlans.length) return null;

  const sortedPlans = [...validPlans].sort((a, b) => {
    return String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || ""));
  });
  const today = localDateKey();
  return sortedPlans.find((plan) => String(plan.scheduledDate || "") >= today) || sortedPlans[sortedPlans.length - 1] || null;
}


function modeLink(mode, current, label, description, enabled, parameters = {}) {
  if (!enabled) return `<span class="consult-mode-link is-disabled" aria-disabled="true"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></span>`;
  const query = new URLSearchParams({ page: "quick", mode, ...parameters }).toString();
  return `<a class="consult-mode-link${mode === current ? " is-current" : ""}" href="#/consultation?${query}"${mode === current ? ' aria-current="page"' : ""}><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></a>`;
}

function reportFormatLink(format, current, label, description, recordId, regionId) {
  const query = new URLSearchParams({
    page: "report",
    mode: "result",
    recordId,
    format,
    regionId,
  }).toString();
  return `<a class="share-format-card${format === current ? " is-current" : ""}" href="#/consultation?${query}"${format === current ? ' aria-current="page"' : ""}><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></a>`;
}

function purposeLink(item, current, recordId, regionId, a4RegionId) {
  const query = new URLSearchParams({
    page: "quick",
    mode: "result",
    recordId,
    purpose: item.id,
    regionId,
    a4RegionId,
  }).toString();
  return `<a class="consult-purpose-link${item.id === current ? " is-current" : ""}" href="#/consultation?${query}"${item.id === current ? ' aria-current="page"' : ""}><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.description)}</small></a>`;
}

function renderPurposeNavigation({ services, decision, experience, regionId }) {
  return `<section class="consult-purpose-selector" aria-labelledby="consult-purpose-title"><div class="section-heading"><p>2. 相談の目的</p><h2 id="consult-purpose-title">何を確認したいですか</h2></div><div class="consult-purpose-grid">${services.consultation.purposes.map((item) => purposeLink(item, decision.purpose, experience.record.id, regionId, decision.regionId)).join("")}</div></section>`;
}

function renderA4RegionSelector(decision) {
  const options = decision.regionOptions.map((item) => `<option value="${escapeHtml(item.id)}"${item.id === decision.regionId ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("");
  return `<section class="consult-region-selector" aria-labelledby="consult-region-title"><div class="section-heading section-heading--compact"><p>3. 部位</p><h2 id="consult-region-title">確認する部位を1つ選ぶ</h2></div><label class="field"><span>確認する部位</span><select data-consult-region-selector>${options}</select><small>部位間の順位付けではありません。選んだ部位で部位の目安を数値化できる場合だけ、その部位自身の基準と比較します。</small></label></section>`;
}

function renderDecisionSources(decision) {
  return `<section class="consult-rule-summary" aria-labelledby="consult-rule-summary-title"><div class="section-heading section-heading--compact"><p>4. メモの内容</p><h2 id="consult-rule-summary-title">含める内容を確認する</h2></div><ul>${decision.sources.map((item) => `<li class="${item.used ? "is-used" : "is-unused"}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.used ? "含める" : "含めない")}</span><small>${escapeHtml(item.reason)}</small></li>`).join("")}</ul><p>保存した内容から下書きを作ります。必要な部分を自分の言葉へ直し、自分で共有してください。自動送信はしません。</p></section>`;
}

function planSummary(plan) {
  if (!plan) return "";
  const session = plan.plannedSession || {};
  if (plan.planType === "rest" || session.activityType === "rest") return "休養予定";
  const parts = [];
  if (Number(session.distanceKm) > 0) parts.push(`${formatNumber(session.distanceKm, 2)}km`);
  if (Number(session.durationMinutes) > 0) parts.push(`${formatNumber(session.durationMinutes, 0)}分`);
  if (session.course?.name) parts.push(session.course.name);
  return parts.join("・") || "走行予定";
}

function renderModeNavigation({ mode, experience, plan }) {
  return `<nav class="consult-mode-navigation" aria-label="短い共有メモの種類">
    ${modeLink("result", mode, "結果を伝える", experience ? "保存した記録と身体の記録を短く整理します。" : "対象記録がありません。", Boolean(experience), experience ? { recordId: experience.record.id } : {})}
    ${modeLink("plan", mode, "予定を伝える", plan ? "保存した予定とコース条件を短く整理します。" : "保存した予定がありません。", Boolean(plan), plan ? { planId: plan.id } : {})}
    ${modeLink("free", mode, "その他を書く", "結果や予定に収まらない内容を自分の言葉で書きます。", true)}
  </nav>`;
}

function renderEditableMemo({ key, originalText, title, help, placeholder = "", free = false }) {
  const draft = registerConsultationDraft(key, originalText);
  return `<section class="share-report quick-share-card" aria-labelledby="quick-share-title">
    <div class="result-card__heading"><div><p>編集して使う短文</p><h2 id="quick-share-title">${escapeHtml(title)}</h2></div>${renderStatusLabel("自動送信しません", "success")}</div>
    <p>${escapeHtml(help)}</p>
    <textarea id="consultation-report-text" class="report-textarea" rows="9" maxlength="1200" placeholder="${escapeHtml(placeholder)}" aria-labelledby="quick-share-title" aria-describedby="consultation-draft-character-count" data-consultation-draft data-draft-key="${escapeHtml(key)}">${escapeHtml(draft)}</textarea>
    <div class="consult-draft-toolbar"><span id="consultation-draft-character-count" aria-live="polite" data-consult-character-count>${draft.length} / 1200文字</span><div>${free ? "" : `<button class="button button--text" type="button" data-action="reset-consultation-draft" data-draft-key="${escapeHtml(key)}">原文へ戻す</button>`}<button class="button button--text" type="button" data-action="clear-consultation-draft" data-draft-key="${escapeHtml(key)}">内容を消去</button></div></div>
    <div class="screen-actions"><button class="button button--primary" type="button" data-action="copy-consultation-report">共有メモをコピー</button></div>
  </section>`;
}

function renderExperienceSource(experience, route) {
  const recordId = experience.record.id;
  const status = route === "urgent" ? "公的な窓口も確認" : route === "consult" ? "相談準備を優先" : "対象記録";
  const actions = route === "urgent"
    ? `<div class="next-action__actions"><a class="button button--primary" href="#/support-guidance?recordId=${encodeURIComponent(recordId)}&returnTo=${encodeURIComponent(`#/consultation?recordId=${recordId}`)}">公的な相談先を確認</a><a class="button button--secondary" href="#/result?recordId=${encodeURIComponent(recordId)}">結果へ戻る</a></div>`
    : `<a class="button button--secondary" href="#/result?recordId=${encodeURIComponent(recordId)}">結果へ戻る</a>`;
  return `<section class="next-action${route === "urgent" ? " next-action--urgent" : route === "consult" ? " next-action--consult" : ""}"><div>${renderStatusLabel(status, route === "normal" ? "info" : "attention")}<h2>${escapeHtml(formatLocalDate(experience.record.date))}の記録</h2><p>${escapeHtml(formatActivitySummary(experience.record))}</p></div>${actions}</section>`;
}

function renderConditionNotice(report) {
  if (!report.conditionFlags.length) return "";
  return `<section class="safety-notice"><h2>体調の記録</h2><ul>${report.conditionFlags.map((flag) => `<li>${escapeHtml(SAFETY_FLAG_LABELS[flag] || flag)}</li>`).join("")}</ul><p>アプリの数値結果による判定ではなく、身体の記録としてそのまま共有します。</p></section>`;
}

function renderResultQuick({ services, experience, regionId, purpose, a4RegionId }) {
  const allExperiences = services.workflows.records.loadAllExperiences();
  const decision = services.consultation.buildDeterministicConsultation({
    experience,
    allExperiences,
    purpose,
    regionId: a4RegionId,
  });
  const report = services.consultation.buildConsultationReport(
    experience,
    allExperiences,
    { regionId: decision.regionId || regionId },
  );
  const priority = report.supportRoute === "consult" || report.supportRoute === "urgent";
  const reportQuery = new URLSearchParams({
    page: "report",
    mode: "result",
    recordId: experience.record.id,
    format: "standard",
    regionId: report.modelReference.regional.regionId,
  }).toString();
  const reportAction = priority
    ? `<section class="consult-priority-report"><div><p>${report.supportRoute === "urgent" ? "公的な案内とは別に作る資料" : "身体の記録を先に確認する資料"}</p><h2>${report.supportRoute === "urgent" ? "相談メモも準備する" : "相談メモを優先"}</h2><p>身体の記録、今回の条件、部位の目安の順でまとめます。数値化できる場合は、その部位の基準との関係も明記します。公的な窓口の確認を置き換える資料ではありません。</p></div><a class="button button--primary" href="#/consultation?${reportQuery}">相談メモを開く</a></section>`
    : "";
  const comparisonNotice = decision.purpose === "previous_comparison" && decision.regional.previousComparable?.status !== "COMPARABLE"
    ? `<aside class="editorial-boundary"><p>同じ部位・同じ基準など、同じ意味で比べられる過去記録がないため、差は表示せず、その理由をメモへ記載します。</p></aside>`
    : "";
  const publicDecisionMemo = String(decision.memo || "")
    .replaceAll("（計算に使った距離は各記録の値に含まれます）", "（距離は各記録の走行事実として別に扱います）")
    .replaceAll("計算に使った距離は各記録の値に含まれます", "距離は各記録の走行事実として別に扱います");
  return `<section class="consult-source-panel" data-deterministic-consultation-version="${escapeHtml(decision.version)}">
    ${renderExperienceSource(experience, report.supportRoute)}
    ${renderConditionNotice(report)}
    ${reportAction}
    ${renderPurposeNavigation({ services, decision, experience, regionId: decision.regionId })}
    ${renderA4RegionSelector(decision)}
    ${comparisonNotice}
    ${renderDecisionSources(decision)}
    ${renderEditableMemo({ key: `result:${experience.record.id}:${decision.purpose}:${decision.regionId}`, originalText: publicDecisionMemo, title: "目的別の相談メモ", help: "保存した内容から作った下書きです。必要な範囲だけ残し、自分の言葉へ直して使います。" })}
    <aside class="editorial-boundary"><p>この機能は診断、障害予測、原因特定、走行可否、練習処方、安全保証を行いません。保存済みの部位別結果も変更しません。</p></aside>
  </section>`;
}

function renderPlanQuick(services, plan) {
  return `<section class="consult-source-panel">
    <section class="result-card"><div class="result-card__heading"><div><p>${escapeHtml(formatLocalDate(plan.scheduledDate))}の予定</p><h2>${escapeHtml(plan.title || (plan.planType === "rest" ? "休養予定" : "走行予定"))}</h2></div>${renderStatusLabel("予定", "neutral")}</div><p>${escapeHtml(planSummary(plan))}</p>${plan.memo ? `<p>${escapeHtml(plan.memo)}</p>` : ""}<a class="button button--text" href="#/plan?planId=${encodeURIComponent(plan.id)}&sourceRecordId=${encodeURIComponent(plan.sourceRecordId || "")}">予定を確認・編集</a></section>
    ${renderEditableMemo({ key: `plan:${plan.id}`, originalText: createPlanShareMemo(services, plan), title: "予定の共有メモ", help: "相手に見せるため、予定条件を短くまとめます。" })}
  </section>`;
}

function renderFreeQuick() {
  return `<section class="consult-source-panel">${renderEditableMemo({ key: "free", originalText: "", title: "その他の相談を書く", help: "相手に見せたい内容を、自分の言葉で短く書けます。", placeholder: "例：最近の走りで気になったことがあります。確認してほしい内容は…", free: true })}</section>`;
}

function renderConsultationHub({ experience, plan }) {
  const quickMode = experience ? "result" : plan ? "plan" : "free";
  const quickParameters = new URLSearchParams({ page: "quick", mode: quickMode });
  if (experience) quickParameters.set("recordId", experience.record.id);
  if (!experience && plan) quickParameters.set("planId", plan.id);
  const reportHref = experience
    ? `#/consultation?page=report&mode=result&recordId=${encodeURIComponent(experience.record.id)}&format=standard`
    : "";
  return `<section class="screen screen--consultation screen--consultation-hub">
    ${renderPageHeading({ eyebrow: "相談の準備", title: "見せる内容を選ぶ", description: "必要な範囲だけを、短いメモまたは資料に整理します。" })}
    <p class="screen-boundary-note">短いメモはその場で見せる文章、資料レポートは印刷・PDF用のまとめです。どちらも自動送信しません。</p>
    <div class="consult-entry-grid" aria-label="相談と共有の入口">
      <a class="consult-entry-card consult-entry-card--quick" data-consult-entry="quick" href="#/consultation?${quickParameters.toString()}"><span>01</span><strong>短い共有メモ</strong><p>選んで編集、コピー。</p><em>相談相手に文章を見せる</em></a>
      ${reportHref ? `<a class="consult-entry-card consult-entry-card--report" data-consult-entry="report" href="${reportHref}"><span>02</span><strong>資料レポート</strong><p>今回の記録／最近の流れ。</p><em>資料を開く</em></a>` : `<div class="consult-entry-card consult-entry-card--report is-disabled" data-consult-entry="report" aria-disabled="true"><span>02</span><strong>資料レポート</strong><p>記録後に資料化。</p><em>記録後に利用できます</em></div>`}
    </div>
    <aside class="editorial-boundary"><p>この画面は、相談相手に見せる材料を整える場所です。相手に渡す範囲は自分で選びます。</p></aside>
  </section>`;
}

function renderQuickPage({ services, experience, plan, mode, regionId, purpose, a4RegionId }) {
  const body = mode === "result" && experience
    ? renderResultQuick({ services, experience, regionId, purpose, a4RegionId })
    : mode === "plan" && plan
      ? renderPlanQuick(services, plan)
      : renderFreeQuick();
  return `<section class="screen screen--consultation screen--quick-share">
    ${renderPageHeading({ eyebrow: "短い共有メモ", title: "短い共有メモを作る", description: "見せたい内容を選び、自分の言葉へ直してコピーします。" })}
    <div class="page-heading-actions"><a class="button button--text" data-context-back-duplicate href="#/consultation">見せる内容の選択へ戻る</a></div>
    <section class="consult-selector" data-information-role="personal" aria-labelledby="consult-selector-title"><div class="section-heading"><p>1. 見せる内容</p><h2 id="consult-selector-title">何を見せますか</h2></div>${renderModeNavigation({ mode, experience, plan })}</section>
    ${body}
    
  </section>`;
}

function renderReportPage({ services, experience, format, regionId }) {
  const presentation = buildReportPresentation({
    services,
    experience,
    regionId,
  });
  const { report } = presentation;
  const priority = report.supportRoute === "consult" || report.supportRoute === "urgent";
  const copyText = createReportCopyText({ presentation, format });
  const documentTitle = format === "detailed" ? "詳細資料：最近の流れを追加" : "標準資料：今回1件・1ページ";
  return `<section class="screen screen--consultation screen--share-report">
    ${renderPageHeading({ eyebrow: priority ? "相談用の資料" : "共有用の資料", title: priority ? "相談メモ" : "資料レポート", description: priority ? "身体の記録を先に置き、必要な記録だけをまとめます。" : "今回の記録を、印刷・PDF・コピー用にまとめます。" })}
    <div class="page-heading-actions"><a class="button button--text" data-context-back-duplicate href="#/consultation">見せる内容の選択へ戻る</a></div>
    <div class="report-screen-tools">
      ${renderExperienceSource(experience, report.supportRoute)}
      ${renderConditionNotice(report)}
      <section aria-labelledby="report-format-title"><div class="section-heading"><p>1. 資料の種類</p><h2 id="report-format-title">資料の種類を選ぶ</h2></div><div class="share-format-picker">${reportFormatLink("standard", format, "標準資料", "今回の記録を短くまとめます。", experience.record.id, presentation.selectedRegionId)}${reportFormatLink("detailed", format, "詳細資料", "最近の流れも添えます。", experience.record.id, presentation.selectedRegionId)}</div></section>
      <section class="report-print-actions" aria-labelledby="report-print-title"><div><p>2. 出力</p><h2 id="report-print-title">${escapeHtml(documentTitle)}</h2><p>必要な内容をまとめた資料を開きます。</p></div><div class="screen-actions"><button class="button button--primary" type="button" data-action="print-consultation-report">印刷・PDFを開く</button><button class="button button--secondary" type="button" data-action="copy-consultation-report">本文をコピー</button></div></section>
    </div>
    <textarea id="consultation-report-text" class="report-copy-source" readonly tabindex="-1" aria-hidden="true">${escapeHtml(copyText)}</textarea>
    <div class="report-output-area">${renderReportSheet({ presentation, format })}</div>
  </section>`;
}


function prototypeConsultationFacts(experience) {
  const record = experience?.record || {};
  if (!record.id) return "記録なし";
  const parts = [];
  if (Number(record.distanceKm) > 0) parts.push(`${formatNumber(record.distanceKm, 2)} km`);
  if (Number(record.durationMinutes) > 0) parts.push(`${formatNumber(record.durationMinutes, 0)}分`);
  if (record.course?.name) parts.push(record.course.name);
  return parts.join("・") || formatActivitySummary(record);
}

function prototypeConsultationRofLine(services, experience) {
  const record = experience?.record || {};
  if (!record.id || record.activityType !== "run" || !services?.secondPillar) return "疲労感：未記録";
  const summary = services.secondPillar.summarizeRun(record.id);
  const pre = Number.isFinite(Number(summary?.pre)) ? Number(summary.pre) : null;
  const post = Number.isFinite(Number(summary?.post)) ? Number(summary.post) : null;
  if (pre == null && post == null) return "疲労感：未記録";
  return `走る前の疲労感 ${pre == null ? "未記録" : pre} → 走った後 ${post == null ? "未記録" : post}`;
}

function prototypeNextCheck(experience) {
  const reflection = experience?.record?.reflectionContext || {};
  return reflection.nextCheckPoint || reflection.nextCheck || experience?.feedback?.nextCheckPoint || "未記録";
}

function prototypeRegionalSummary(presentation) {
  const regional = presentation?.report?.modelReference?.regional || {};
  const regionName = bodyRegionFormalName(regional.regionId, regional.regionLabel || "選択した部位");
  const value = regional.value !== null && regional.value !== "" && Number.isFinite(Number(regional.value))
    ? formatNumber(regional.value, 1)
    : "数値なし";
  return `${regionName} ${value}`;
}

function prototypeBodyRecordSummary(presentation) {
  const report = presentation?.report || {};
  const rows = [];
  report.exactBodyObservations?.forEach((item) => {
    const values = [];
    if (item.lateralityLabel) values.push(item.lateralityLabel);
    if (item.intensity != null) values.push(`程度 ${item.intensity}/5`);
    if (item.sensation) values.push(item.sensation);
    rows.push(`${item.label}：${values.join("・") || "記録あり"}`);
  });
  report.subjectiveParts?.forEach((item) => {
    const values = [];
    if (Number(item.fatigue) > 0) values.push(`疲れ・だるさ ${item.fatigue}/5`);
    if (Number(item.discomfort) > 0) values.push(`気になる感じ ${item.discomfort}/5`);
    rows.push(`${item.label}：${values.join("・") || "確認済み"}`);
  });
  return rows.length ? rows.join("／") : "未記録";
}

function prototypeRecentChangeSummary(presentation, record) {
  const report = presentation?.report || {};
  const regional = report.modelReference?.regional || {};
  const current = Number(regional.value);
  if (!Number.isFinite(current)) return "比較できる過去記録なし";
  const currentDate = String(record?.date || "");
  const previous = [...(Array.isArray(report.recent) ? report.recent : [])]
    .filter((row) => row?.regionalDirectComparable && Number.isFinite(Number(row.regionalValue)) && String(row.date || "") < currentDate)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0];
  if (!previous) return "比較できる過去記録なし";
  const previousValue = Number(previous.regionalValue);
  const delta = current - previousValue;
  const signed = `${delta >= 0 ? "+" : ""}${formatNumber(delta, 1)}`;
  return `${previous.date} ${formatNumber(previousValue, 1)} → 今回 ${formatNumber(current, 1)}（${signed}）`;
}

function prototypeShareItems({ facts, fatigue, bodyRecord, regional, recent, next }) {
  return [
    { key: "run", label: "今回の走行", value: facts, note: "距離・時間・コース", checked: true, available: true },
    { key: "fatigue", label: "疲労感", value: fatigue, note: "走る前と走った後", checked: !fatigue.includes("未記録"), available: !fatigue.includes("未記録") },
    { key: "body", label: "身体の記録", value: bodyRecord, note: "本人が入力した部位・程度", checked: bodyRecord !== "未記録", available: bodyRecord !== "未記録" },
    { key: "regional", label: "関連する部位の目安", value: regional, note: "その部位自身の基準との比較", checked: !regional.includes("数値なし"), available: !regional.includes("数値なし") },
    { key: "recent", label: "最近の変化", value: recent, note: "同じ部位で比較できる場合のみ", checked: recent !== "比較できる過去記録なし", available: recent !== "比較できる過去記録なし" },
    { key: "next", label: "次に確認したいこと", value: next, note: "本人が記録した確認点", checked: true, available: true },
  ];
}

function prototypeShareSelector(items) {
  return items.map((item) => `<label class="share-source${item.available ? "" : " is-unavailable"}"><input type="checkbox" data-consult-source data-share-key="${escapeHtml(item.key)}" data-share-label="${escapeHtml(item.label)}" data-share-value="${escapeHtml(item.value)}"${item.checked ? " checked" : ""}${item.available ? "" : " disabled"}><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.note)}</small><em>${escapeHtml(item.available ? item.value : "今回は表示できません")}</em></span></label>`).join("");
}

function prototypeShareCards(items, target) {
  return items.map((item) => `<section class="share-card" data-consult-${target}-key="${escapeHtml(item.key)}"${item.checked ? "" : " hidden"}><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.value)}</strong></section>`).join("");
}

function renderPrototypeConsultation({ services, experience, regionId = "" }) {
  if (!experience?.record) {
    return `<div class="screen screen--consultation prototype-parity prototype-parity--consultation"><section class="head"><p class="eyebrow">SHARE PREP</p><h1>共有用にまとめる</h1><p>保存した記録があると、指導者などに見せる内容を整理できます。</p></section><section class="panel"><div class="panel-head"><div><small>RECORD</small><strong>対象の記録がありません</strong></div></div><div class="actions"><a class="button button--primary" href="#/record-input">記録を始める</a></div></section></div>`;
  }

  const record = experience.record;
  const presentation = buildReportPresentation({ services, experience, regionId });
  const facts = prototypeConsultationFacts(experience);
  const fatigue = prototypeConsultationRofLine(services, experience);
  const bodyRecord = prototypeBodyRecordSummary(presentation);
  const next = prototypeNextCheck(experience);
  const resultLine = prototypeRegionalSummary(presentation);
  const recent = prototypeRecentChangeSummary(presentation, record);
  const items = prototypeShareItems({ facts, fatigue, bodyRecord, regional: resultLine, recent, next });
  const previewCards = prototypeShareCards(items, "preview");
  const viewerCards = prototypeShareCards(items, "viewer");
  const selector = prototypeShareSelector(items);
  const regionRows = items
    .filter((item) => item.key === "regional" || item.key === "recent")
    .map((item) => `<tr data-consult-document-key="${escapeHtml(item.key)}"${item.checked ? "" : " hidden"}><th>${escapeHtml(item.label)}</th><td>${escapeHtml(item.value)}</td></tr>`)
    .join("");
  const documentCards = items
    .filter((item) => item.key !== "regional" && item.key !== "recent")
    .map((item) => `<section class="share-document-card" data-consult-document-key="${escapeHtml(item.key)}"${item.checked ? "" : " hidden"}><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.value)}</strong></section>`)
    .join("");

  return `<div class="screen screen--consultation prototype-parity prototype-parity--consultation" data-prototype-consultation data-prototype-share-prep>
    <section class="head"><p class="eyebrow">SHARE PREP</p><h1>共有用にまとめる</h1><p>保存した記録から、指導者などに見せる内容を整理します。RunLoadから相手へ自動送信はしません。</p></section>

    <section class="source"><div><small>対象の記録</small><strong>${escapeHtml(formatLocalDate(record.date))}</strong><span>${escapeHtml(facts)}</span></div><a href="#/result?recordId=${encodeURIComponent(record.id)}">結果を確認</a></section>

    <section class="section share-step"><div class="section-head"><small>STEP 1</small><h2>誰に、何を確認してもらいますか</h2><p>共有先と、今回いちばん確認したいことを入力します。</p></div>
      <label class="field"><span>見せる相手・任意</span><input type="text" maxlength="80" placeholder="例：A先生、コーチ、医療機関" data-consult-target></label>
      <label class="field"><span>確認したいこと・任意</span><textarea maxlength="400" placeholder="例：右膝の違和感について、次回の走り方を確認したい" data-consult-question></textarea></label>
    </section>

    <section class="section share-step"><div class="section-head"><small>STEP 2</small><h2>見せる情報を選ぶ</h2><p>RunLoadが関連情報を候補として並べます。見せたくない項目は外せます。</p></div><div class="share-source-list">${selector}</div></section>

    <section class="section share-step"><div class="section-head"><small>STEP 3</small><h2>内容を確認する</h2><p>この内容が、画面表示と印刷・PDFの共通元になります。</p></div>
      <article class="share-preview" data-consult-share-preview>
        <header><small>見せる相手</small><strong data-consult-preview-target>未入力</strong><span data-consult-preview-question>確認したいこと：未入力</span></header>
        <div class="share-preview-grid">${previewCards}</div>
      </article>
    </section>

    <section class="section share-step"><div class="section-head"><small>STEP 4</small><h2>見せ方を選ぶ</h2><p>確定した同じ内容を、画面または文書で見せます。</p></div>
      <div class="share-output-actions">
        <button class="output primary" type="button" data-action="open-consult-viewer"><span><strong>画面で見せる</strong><small>その場で見せる表示を開く</small></span><i>›</i></button>
        <button class="output" type="button" data-action="print-consultation-report"><span><strong>印刷・PDF</strong><small>A4の共有資料を開く</small></span><i>›</i></button>
        <button class="output secondary" type="button" data-action="copy-consultation-report"><span><strong>テキストをコピー</strong><small>同じ内容を文章としてコピー</small></span><i>›</i></button>
      </div>
    </section>

    <textarea id="consultation-report-text" class="visually-hidden" readonly></textarea>

    <div class="share-viewer" data-consult-viewer hidden>
      <div class="share-viewer-shell">
        <header class="share-viewer-head"><div><small>RUNLOAD SHARE</small><strong>共有内容</strong></div><button type="button" data-action="close-consult-viewer" aria-label="共有表示を閉じる">×</button></header>
        <section class="share-viewer-purpose"><small>見せる相手</small><strong data-consult-viewer-target>未入力</strong><p data-consult-viewer-question>確認したいこと：未入力</p></section>
        <div class="share-viewer-grid">${viewerCards}</div>
        <footer>部位の目安は診断や安全性を判定する数値ではありません。</footer>
      </div>
    </div>

    <article class="share-print-document" data-consult-share-document>
      <header class="share-document-head"><div><small>RUNLOAD SHARE</small><h1>共有資料</h1></div><div><span>${escapeHtml(formatLocalDate(record.date))}</span><strong data-consult-document-target>共有先：未入力</strong></div></header>
      <section class="share-document-purpose"><small>確認したいこと</small><strong data-consult-document-question>未入力</strong></section>
      <div class="share-document-grid">${documentCards}</div>
      <section class="share-document-region" data-consult-document-region><div><small>関連する部位</small><h2>部位の目安と最近の変化</h2></div><table><tbody>${regionRows}</tbody></table></section>
      <footer><strong>RunLoadの表示について</strong><p>部位の目安は記録を振り返るための参考です。診断や安全性、けがの危険性、走行可否を判定する数値ではありません。</p></footer>
    </article>

    <p class="boundary">共有する相手と内容は本人が選びます。個人的なメモなどは、必要な場合だけ含めてください。</p>
    <a class="support-link" href="#/support-guidance?recordId=${encodeURIComponent(record.id)}&returnTo=${encodeURIComponent(`#/consultation?recordId=${record.id}`)}"><span><small>症状や体調について公的な案内を確認したい場合</small><strong>公的サポートを確認</strong></span><i>›</i></a>
  </div>`;
}

export function renderConsultationScreen({ services, context }) {
  const requestedRecordId = context.parameters.get("recordId") || "";
  const requestedPlanId = context.parameters.get("planId") || "";
  const experience = requestedRecordId
    ? services.workflows.records.loadExperience(requestedRecordId)
    : services.workflows.records.loadLatestExperience();
  const plans = services.storage.plans.loadAll();
  const plan = requestedPlanId ? services.storage.plans.findById(requestedPlanId) : latestPlan(plans);
  const requestedMode = ["result", "plan", "free"].includes(context.parameters.get("mode"))
    ? context.parameters.get("mode")
    : experience ? "result" : plan ? "plan" : "free";
  const mode = requestedMode === "result" && !experience
    ? plan ? "plan" : "free"
    : requestedMode === "plan" && !plan
      ? experience ? "result" : "free"
      : requestedMode;
  const format = ["standard", "detailed"].includes(context.parameters.get("format"))
    ? context.parameters.get("format")
    : "standard";
  const requestedPage = context.parameters.get("page") || "";
  const regionId = context.parameters.get("regionId") || "";
  const purpose = context.parameters.get("purpose") || "";
  const a4RegionId = context.parameters.get("a4RegionId") || "";
  const reportPage = Boolean(experience) && mode === "result" && requestedPage === "report";
  const quickPage = requestedPage === "quick" || context.parameters.has("mode");

  if (reportPage) return renderReportPage({
    services,
    experience,
    format,
    regionId,
  });
  if (quickPage) return renderQuickPage({
    services,
    experience,
    plan,
    mode,
    regionId,
    purpose,
    a4RegionId,
  });
  return renderPrototypeConsultation({ services, experience, regionId });
}

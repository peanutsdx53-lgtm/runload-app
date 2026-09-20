import { escapeHtml } from "../ui/commonComponents.js";
import { formatActivitySummary, formatLocalDate, formatNumber } from "../ui/recordPresentation.js";
import { bodyRegionFormalName } from "../core/runloadCore.js";
import { buildReportPresentation } from "../ui/consultationPresentation.js";

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

function prototypeRegionalSummary(decision) {
  const regional = decision?.regional || {};
  const regionName = bodyRegionFormalName(regional.regionId, regional.regionLabel || "選択した部位");
  const value = Number.isFinite(Number(regional.displayIndex))
    ? formatNumber(Number(regional.displayIndex), 1)
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
  if (!rows.length) return "未記録";
  const visible = rows.slice(0, 3);
  const remaining = rows.length - visible.length;
  return `${visible.join("／")}${remaining > 0 ? `／ほか${remaining}件` : ""}`;
}

function prototypeRecentChangeSummary(decision) {
  const regional = decision?.regional || {};
  const comparison = regional.previousComparable;
  const current = Number(regional.displayIndex);
  if (!Number.isFinite(current) || comparison?.status !== "COMPARABLE") return "比較できる過去記録なし";
  const previousValue = Number(comparison.previous?.displayConditionIndex);
  if (!Number.isFinite(previousValue)) return "比較できる過去記録なし";
  const delta = Number.isFinite(Number(comparison.pointDelta))
    ? Number(comparison.pointDelta)
    : current - previousValue;
  const signed = `${delta >= 0 ? "+" : ""}${formatNumber(delta, 1)}`;
  return `${comparison.previous?.date || "前回"} ${formatNumber(previousValue, 1)} → 今回 ${formatNumber(current, 1)}（${signed}）`;
}

function prototypeShareItems({ facts, fatigue, bodyRecord, regional, recent, next, plan }) {
  const hasPlan = Boolean(plan && plan !== "未設定");
  return [
    { key: "run", label: "今回の走行", value: facts, note: "距離・時間・コース", checked: true, available: true },
    { key: "fatigue", label: "疲労感", value: fatigue, note: "走る前と走った後", checked: !fatigue.includes("未記録"), available: !fatigue.includes("未記録") },
    { key: "body", label: "身体の記録", value: bodyRecord, note: "本人が入力した部位・程度", checked: bodyRecord !== "未記録", available: bodyRecord !== "未記録" },
    { key: "regional", label: "関連する部位の目安", value: regional, note: "その部位自身の基準との比較", checked: !regional.includes("数値なし"), available: !regional.includes("数値なし") },
    { key: "recent", label: "最近の変化", value: recent, note: "同じ部位で比較できる場合のみ", checked: recent !== "比較できる過去記録なし", available: recent !== "比較できる過去記録なし" },
    { key: "next", label: "次に確認したいこと", value: next, note: "本人が記録した確認点", checked: true, available: true },
    { key: "plan", label: "次の予定", value: plan || "未設定", note: "保存済みの次回方針", checked: hasPlan, available: hasPlan },
  ];
}

function prototypeRegionOptions({ services, experience, allExperiences, decision }) {
  const options = decision?.regionOptions || [];
  return options.map((option) => {
    const optionDecision = services.consultation.buildDeterministicConsultation({
      experience,
      allExperiences,
      purpose: decision?.purpose || "",
      regionId: option.id,
    });
    const regionalValue = prototypeRegionalSummary(optionDecision);
    const recentValue = prototypeRecentChangeSummary(optionDecision);
    const regionalAvailable = !regionalValue.includes("数値なし");
    const recentAvailable = recentValue !== "比較できる過去記録なし";
    return `<option value="${escapeHtml(option.id)}" data-regional-value="${escapeHtml(regionalValue)}" data-regional-available="${regionalAvailable ? "true" : "false"}" data-recent-value="${escapeHtml(recentValue)}" data-recent-available="${recentAvailable ? "true" : "false"}"${option.id === decision?.regionId ? " selected" : ""}>${escapeHtml(option.label)}</option>`;
  }).join("");
}

function prototypeShareSelector(items) {
  return items.map((item) => `<label class="share-source${item.available ? "" : " is-unavailable"}"><input type="checkbox" data-consult-source data-share-key="${escapeHtml(item.key)}" data-share-label="${escapeHtml(item.label)}" data-share-value="${escapeHtml(item.value)}"${item.checked ? " checked" : ""}${item.available ? "" : " disabled"}><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.note)}</small><em>${escapeHtml(item.available ? item.value : "今回は表示できません")}</em></span></label>`).join("");
}

function prototypeShareCards(items, target) {
  return items.map((item) => `<section class="share-card" data-consult-${target}-key="${escapeHtml(item.key)}"${item.checked ? "" : " hidden"}><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.value)}</strong></section>`).join("");
}

function renderPrototypeConsultation({ services, experience, plan, regionId = "" }) {
  if (!experience?.record) {
    return `<div class="screen screen--consultation prototype-parity prototype-parity--consultation"><section class="head"><p class="eyebrow">SHARE PREP</p><h1>共有用にまとめる</h1><p>保存した記録があると、指導者などに見せる内容を整理できます。</p></section><section class="panel"><div class="panel-head"><div><small>RECORD</small><strong>対象の記録がありません</strong></div></div><div class="actions"><a class="button button--primary" href="#/record-input">記録を始める</a></div></section></div>`;
  }

  const record = experience.record;
  const allExperiences = services.workflows.records.loadAllExperiences();
  const decision = services.consultation.buildDeterministicConsultation({
    experience,
    allExperiences,
    regionId,
  });
  const selectedRegionId = decision?.regionId || regionId;
  const presentation = buildReportPresentation({ services, experience, regionId: selectedRegionId });
  const facts = prototypeConsultationFacts(experience);
  const fatigue = prototypeConsultationRofLine(services, experience);
  const bodyRecord = prototypeBodyRecordSummary(presentation);
  const next = prototypeNextCheck(experience);
  const resultLine = prototypeRegionalSummary(decision);
  const recent = prototypeRecentChangeSummary(decision);
  const planValue = plan
    ? `${plan.scheduledDate ? formatLocalDate(plan.scheduledDate) : "日付未設定"}・${planSummary(plan)}`
    : "未設定";
  const items = prototypeShareItems({ facts, fatigue, bodyRecord, regional: resultLine, recent, next, plan: planValue });
  const regionOptions = prototypeRegionOptions({ services, experience, allExperiences, decision });
  const initialTarget = decision?.audience || "";
  const initialQuestion = decision?.question || "";
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
      <label class="field"><span>関連する部位</span><select data-consult-region-selector>${regionOptions}</select><small>共有する部位の目安を選びます。部位間の順位付けではありません。</small></label>
      <label class="field"><span>見せる相手・任意</span><input type="text" maxlength="80" value="${escapeHtml(initialTarget)}" placeholder="例：A先生、コーチ、医療機関" data-consult-target></label>
      <label class="field"><span>確認したいこと・任意</span><textarea maxlength="400" placeholder="例：右膝の違和感について、次回の走り方を確認したい" data-consult-question>${escapeHtml(initialQuestion)}</textarea></label>
    </section>

    <section class="section share-step"><div class="section-head"><small>STEP 2</small><h2>見せる情報を選ぶ</h2><p>RunLoadが関連情報を候補として並べます。見せたくない項目は外せます。</p></div><div class="share-source-list">${selector}</div></section>

    <section class="section share-step"><div class="section-head"><small>STEP 3</small><h2>内容を確認する</h2><p>この内容が、画面表示と印刷・PDFの共通元になります。</p></div>
      <article class="share-preview" data-consult-share-preview>
        <header><small>見せる相手</small><strong data-consult-preview-target>${escapeHtml(initialTarget || "未入力")}</strong><span data-consult-preview-question>確認したいこと：${escapeHtml(initialQuestion || "未入力")}</span></header>
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
        <section class="share-viewer-purpose"><small>見せる相手</small><strong data-consult-viewer-target>${escapeHtml(initialTarget || "未入力")}</strong><p data-consult-viewer-question>確認したいこと：${escapeHtml(initialQuestion || "未入力")}</p></section>
        <div class="share-viewer-grid">${viewerCards}</div>
        <footer>走行距離は部位の数値へ掛けず、別の走行事実として扱います。部位の目安は診断や安全性を判定する数値ではありません。</footer>
      </div>
    </div>

    <article class="share-print-document" data-consult-share-document>
      <header class="share-document-head"><div><small>RUNLOAD SHARE</small><h1>共有資料</h1></div><div><span>${escapeHtml(formatLocalDate(record.date))}</span><strong data-consult-document-target>共有先：${escapeHtml(initialTarget || "未入力")}</strong></div></header>
      <section class="share-document-purpose"><small>確認したいこと</small><strong data-consult-document-question>${escapeHtml(initialQuestion || "未入力")}</strong></section>
      <div class="share-document-grid">${documentCards}</div>
      <section class="share-document-region" data-consult-document-region><div><small>関連する部位</small><h2>部位の目安と最近の変化</h2></div><table><tbody>${regionRows}</tbody></table></section>
      <footer><strong>RunLoadの表示について</strong><p>部位の目安は記録を振り返るための参考です。走行距離は部位の数値へ掛けず、別の走行事実として扱います。診断や安全性、けがの危険性、走行可否を判定する数値ではありません。</p></footer>
    </article>

    <p class="boundary">共有する相手と内容は本人が選びます。個人的なメモなどは、必要な場合だけ含めてください。</p>
    <a class="support-link" href="#/support-guidance?recordId=${encodeURIComponent(record.id)}&returnTo=${encodeURIComponent(`#/consultation?recordId=${record.id}`)}"><span><small>症状や体調について公的な案内を確認したい場合</small><strong>公的サポートを確認</strong></span><i>›</i></a>
  </div>`;
}

export function renderConsultationScreen({ services, context }) {
  const requestedRecordId = context.parameters.get("recordId") || "";
  const experience = requestedRecordId
    ? services.workflows.records.loadExperience(requestedRecordId)
    : services.workflows.records.loadLatestExperience();
  const plans = services.storage.plans.loadAll();
  const plan = latestPlan(plans);
  const regionId = context.parameters.get("regionId") || "";
  return renderPrototypeConsultation({ services, experience, plan, regionId });
}

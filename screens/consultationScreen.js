import { escapeHtml } from "../ui/commonComponents.js";
import { formatActivitySummary, formatLocalDate, formatNumber } from "../ui/recordPresentation.js";
import { bodyRegionFormalName, PROFILE_AGE_BAND_OPTIONS } from "../core/runloadCore.js";
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

function consultationFacts(experience) {
  const record = experience?.record || {};
  if (!record.id) return "記録なし";
  const parts = [];
  if (Number(record.distanceKm) > 0) parts.push(`${formatNumber(record.distanceKm, 2)} km`);
  if (Number(record.durationMinutes) > 0) parts.push(`${formatNumber(record.durationMinutes, 0)}分`);
  if (record.course?.name) parts.push(record.course.name);
  return parts.join("・") || formatActivitySummary(record);
}

function consultationFatigueLine(services, experience) {
  const record = experience?.record || {};
  if (!record.id || record.activityType !== "run" || !services?.secondPillar) return "疲労感：未記録";
  const summary = services.secondPillar.summarizeRun(record.id);
  const pre = Number.isFinite(Number(summary?.pre)) ? Number(summary.pre) : null;
  const post = Number.isFinite(Number(summary?.post)) ? Number(summary.post) : null;
  if (pre == null && post == null) return "疲労感：未記録";
  return `走る前の疲労感 ${pre == null ? "未記録" : pre} → 走った後 ${post == null ? "未記録" : post}`;
}

function consultationNextCheck(experience) {
  const reflection = experience?.record?.reflectionContext || {};
  return reflection.nextCheckPoint || reflection.nextCheck || experience?.feedback?.nextCheckPoint || "未記録";
}

function consultationRegionalSummary(decision) {
  const regional = decision?.regional || {};
  const regionName = bodyRegionFormalName(regional.regionId, regional.regionLabel || "選択した部位");
  const numericValue = Number(regional.displayIndex);
  const available = Number.isFinite(numericValue);
  const value = available ? formatNumber(numericValue, 1) : "数値なし";
  const relation = !available
    ? "表示できません"
    : Math.abs(numericValue - 100) < 1
      ? "その部位自身の基準付近"
      : numericValue > 100
        ? "その部位自身の基準より上"
        : "その部位自身の基準より下";
  const comparison = regional.previousComparable;
  let previous = "比較できる過去記録なし";
  if (available && comparison?.status === "COMPARABLE") {
    const previousValue = Number(comparison.previous?.displayConditionIndex);
    if (Number.isFinite(previousValue)) {
      const delta = Number.isFinite(Number(comparison.pointDelta))
        ? Number(comparison.pointDelta)
        : numericValue - previousValue;
      const signed = `${delta >= 0 ? "+" : ""}${formatNumber(delta, 1)}`;
      const previousDate = comparison.previous?.date ? formatLocalDate(comparison.previous.date) : "前回";
      previous = `${previousDate} ${formatNumber(previousValue, 1)} → 今回 ${value}（${signed}）`;
    }
  }
  return {
    regionName,
    value,
    relation,
    current: available ? `今回 ${value}｜基準 100` : "今回の数値なし",
    previous,
    available,
    copyValue: available
      ? `${regionName}｜${relation}｜今回 ${value}・基準 100｜${previous}`
      : `${regionName}｜表示できません`,
  };
}

function consultationBodyRecordSummary(presentation) {
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

function consultationProfileSummary(profile = {}) {
  const parts = [];
  if (Number(profile.heightCm) > 0) parts.push(`身長 ${formatNumber(profile.heightCm, 1)} cm`);
  if (Number(profile.weightKg) > 0) parts.push(`体重 ${formatNumber(profile.weightKg, 1)} kg`);
  const age = PROFILE_AGE_BAND_OPTIONS.find((item) => item.key === profile.ageBand)?.label || "";
  if (age) parts.push(`年齢帯 ${age}`);
  if (profile.sex === "male") parts.push("性別 男性");
  if (profile.sex === "female") parts.push("性別 女性");
  if (profile.runningStartDateOrBand) parts.push(`開始時期 ${profile.runningStartDateOrBand}`);
  if (profile.experienceSelfAssessment) parts.push(`走ることへの慣れ ${profile.experienceSelfAssessment}`);
  const goals = Array.isArray(profile.runningGoalTags) ? profile.runningGoalTags.filter(Boolean) : [];
  if (goals.length) parts.push(`目的 ${goals.join("・")}`);
  return {
    available: parts.length > 0,
    value: parts.length ? parts.join("／") : "未設定",
  };
}

function consultationShareItems({ facts, fatigue, bodyRecord, regional, next, plan, profile }) {
  const hasPlan = Boolean(plan && plan !== "未設定");
  return [
    { key: "profile", label: "共有用プロフィール", value: profile.value, note: "設定に保存した任意プロフィール・共有時だけ選択", checked: false, available: profile.available },
    { key: "body", label: "身体の記録", value: bodyRecord, note: "本人が入力した部位・程度", checked: bodyRecord !== "未記録", available: bodyRecord !== "未記録" },
    { key: "run", label: "今回の走行", value: facts, note: "距離・時間・コース", checked: true, available: true },
    { key: "fatigue", label: "疲労感", value: fatigue, note: "走る前と走った後", checked: !fatigue.includes("未記録"), available: !fatigue.includes("未記録") },
    { key: "regional", label: "関連する部位の目安", value: regional.copyValue, note: "意味・今回値・前回比較", checked: regional.available, available: regional.available, regional },
    { key: "next", label: "次に確認したいこと", value: next, note: "本人が記録した確認点", checked: true, available: true },
    { key: "plan", label: "次の予定", value: plan || "未設定", note: "保存済みの次回方針", checked: hasPlan, available: hasPlan },
  ];
}

function consultationRegionOptions({ services, experience, allExperiences, decision }) {
  const options = decision?.regionOptions || [];
  return options.map((option) => {
    const optionDecision = services.consultation.buildDeterministicConsultation({
      experience,
      allExperiences,
      purpose: decision?.purpose || "",
      regionId: option.id,
    });
    const summary = consultationRegionalSummary(optionDecision);
    return `<option value="${escapeHtml(option.id)}" data-regional-value="${escapeHtml(summary.copyValue)}" data-regional-name="${escapeHtml(summary.regionName)}" data-regional-relation="${escapeHtml(summary.relation)}" data-regional-current="${escapeHtml(summary.current)}" data-regional-previous="${escapeHtml(summary.previous)}" data-regional-available="${summary.available ? "true" : "false"}"${option.id === decision?.regionId ? " selected" : ""}>${escapeHtml(option.label)}</option>`;
  }).join("");
}

function consultationRegionalMarkup(regional) {
  return `<span class="share-region-detail"><span class="share-region-name" data-consult-regional-name>${escapeHtml(regional.regionName)}</span><b data-consult-regional-relation>${escapeHtml(regional.relation)}</b><span data-consult-regional-current>${escapeHtml(regional.current)}</span><span data-consult-regional-previous>${escapeHtml(regional.previous)}</span></span>`;
}

function consultationShareSelector(items) {
  return items.map((item) => {
    const value = item.available ? item.value : "今回は表示できません";
    const detail = item.key === "regional" && item.regional
      ? consultationRegionalMarkup(item.regional)
      : `<em>${escapeHtml(value)}</em>`;
    return `<label class="share-source${item.available ? "" : " is-unavailable"}"><input type="checkbox" data-consult-source data-share-key="${escapeHtml(item.key)}" data-share-label="${escapeHtml(item.label)}" data-share-value="${escapeHtml(item.value)}"${item.checked ? " checked" : ""}${item.available ? "" : " disabled"}><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.note)}</small>${detail}</span></label>`;
  }).join("");
}

function consultationShareCards(items, target) {
  return items.map((item) => {
    if (item.key === "regional" && item.regional) {
      return `<section class="share-card share-card--regional" data-consult-${target}-key="regional"${item.checked ? "" : " hidden"}><small>${escapeHtml(item.label)}</small>${consultationRegionalMarkup(item.regional)}</section>`;
    }
    return `<section class="share-card" data-consult-${target}-key="${escapeHtml(item.key)}"${item.checked ? "" : " hidden"}><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.value)}</strong></section>`;
  }).join("");
}

function consultationDocumentBlocks(items) {
  return items.map((item) => {
    if (item.key === "regional" && item.regional) {
      return `<section class="share-document-region" data-consult-document-key="regional"${item.checked ? "" : " hidden"}><div><small>関連する部位の目安</small><h2 data-consult-regional-name>${escapeHtml(item.regional.regionName)}</h2></div><div class="share-document-region-meaning"><strong data-consult-regional-relation>${escapeHtml(item.regional.relation)}</strong><span data-consult-regional-current>${escapeHtml(item.regional.current)}</span><span data-consult-regional-previous>${escapeHtml(item.regional.previous)}</span></div></section>`;
    }
    return `<section class="share-document-card" data-consult-document-key="${escapeHtml(item.key)}"${item.checked ? "" : " hidden"}><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.value)}</strong></section>`;
  }).join("");
}

function renderConsultationContent({ services, experience, plan, regionId = "", backHref = "#/more", backLabel = "その他へ戻る", selfHref = "#/consultation" }) {
  if (!experience?.record) {
    return `<div class="screen screen--consultation screen-layout screen-layout--consultation secondary-derived-screen"><header class="secondary-derived-head"><a class="secondary-derived-back" href="${escapeHtml(backHref)}">← ${escapeHtml(backLabel)}</a><strong>共有用にまとめる</strong><span aria-hidden="true"></span></header><div class="secondary-derived-body"><section class="head"><p class="eyebrow">SHARE PREP</p><h1>共有用にまとめる</h1><p>保存した記録があると、指導者などに見せる内容を整理できます。</p></section><section class="panel consultation-empty-state"><div class="consultation-empty-state__copy"><small>RECORD</small><strong>共有できる記録はまだありません</strong><p>走行または休養を保存すると、共有する内容をここで整理できます。</p></div><div class="actions"><a class="button button--primary" href="#/record-input">記録を始める</a></div></section></div></div>`;
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
  const facts = consultationFacts(experience);
  const fatigue = consultationFatigueLine(services, experience);
  const bodyRecord = consultationBodyRecordSummary(presentation);
  const profile = consultationProfileSummary(services.storage.profile.load());
  const next = consultationNextCheck(experience);
  const regional = consultationRegionalSummary(decision);
  const planValue = plan
    ? `${plan.scheduledDate ? formatLocalDate(plan.scheduledDate) : "日付未設定"}・${planSummary(plan)}`
    : "未設定";
  const items = consultationShareItems({ facts, fatigue, bodyRecord, regional, next, plan: planValue, profile });
  const regionOptions = consultationRegionOptions({ services, experience, allExperiences, decision });
  const initialQuestion = "";
  const previewCards = consultationShareCards(items, "preview");
  const viewerCards = consultationShareCards(items, "viewer");
  const selector = consultationShareSelector(items);
  const documentBlocks = consultationDocumentBlocks(items);

  return `<div class="screen screen--consultation screen-layout screen-layout--consultation secondary-derived-screen" data-consultation-screen data-share-prep>
    <header class="secondary-derived-head"><a class="secondary-derived-back" href="${escapeHtml(backHref)}">← ${escapeHtml(backLabel)}</a><strong>共有用にまとめる</strong><span aria-hidden="true"></span></header>
    <div class="secondary-derived-body">
    <section class="head"><p class="eyebrow">SHARE PREP</p><h1>共有用にまとめる</h1><p>保存した記録から、指導者などに見せる内容を整理します。RunLoadから相手へ自動送信はしません。</p></section>

    <section class="source"><div><small>対象の記録</small><strong>${escapeHtml(formatLocalDate(record.date))}</strong><span>${escapeHtml(facts)}</span></div><a href="#/result?recordId=${encodeURIComponent(record.id)}">結果を確認</a></section>

    <section class="section share-step share-purpose-step"><div class="section-head"><small>STEP 1</small><h2>共有の目的</h2></div>
      <label class="field"><span>確認内容（任意）</span><textarea maxlength="400" placeholder="確認してほしい内容を入力" data-consult-question>${escapeHtml(initialQuestion)}</textarea></label>
    </section>

    <section class="section share-step"><div class="section-head"><small>STEP 2</small><h2>見せる情報を選ぶ</h2><p>必要な情報だけを選びます。</p></div>
      <label class="field share-region-field"><span>関連する部位</span><select data-consult-region-selector>${regionOptions}</select></label>
      <div class="share-source-list">${selector}</div>
    </section>

    <section class="section share-step"><div class="section-head"><small>STEP 3</small><h2>内容を確認する</h2><p>この内容が、画面表示と印刷・PDFの共通元になります。</p></div>
      <article class="share-preview" data-consult-share-preview>
        <header><small>確認内容</small><strong data-consult-preview-question>${escapeHtml(initialQuestion || "未入力")}</strong></header>
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
        <section class="share-viewer-purpose"><small>確認内容</small><strong data-consult-viewer-question>${escapeHtml(initialQuestion || "未入力")}</strong></section>
        <div class="share-viewer-grid">${viewerCards}</div>
        <footer>走行距離は部位の数値へ掛けず、別の走行事実として扱います。部位の目安は診断や安全性を判定する数値ではありません。</footer>
      </div>
    </div>

    <article class="share-print-document" data-consult-share-document>
      <header class="share-document-head"><div><small>RUNLOAD SHARE</small><h1>共有資料</h1></div><div><span>${escapeHtml(formatLocalDate(record.date))}</span></div></header>
      <section class="share-document-purpose"><small>確認内容</small><strong data-consult-document-question>${escapeHtml(initialQuestion || "未入力")}</strong></section>
      <div class="share-document-flow">${documentBlocks}</div>
      <footer><strong>RunLoadの表示について</strong><p>部位の目安は記録を振り返るための参考です。走行距離は部位の数値へ掛けず、別の走行事実として扱います。診断や安全性、けがの危険性、走行可否を判定する数値ではありません。</p></footer>
    </article>

    <p class="boundary">共有する内容は本人が選びます。個人的なメモなどは、必要な場合だけ含めてください。</p>
    <a class="support-link" href="#/support-guidance?recordId=${encodeURIComponent(record.id)}&returnTo=${encodeURIComponent(selfHref)}"><span><small>症状や体調について公的な案内を確認したい場合</small><strong>公的サポートを確認</strong></span><i>›</i></a>
    </div>
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
  const from = context.parameters.get("from") || "";
  const roomOrigin = context.parameters.get("roomOrigin") || "result";
  const selfQuery = new URLSearchParams();
  if (requestedRecordId) selfQuery.set("recordId", requestedRecordId);
  if (regionId) selfQuery.set("regionId", regionId);
  if (from) selfQuery.set("from", from);
  if (from === "interpretation-room") {
    selfQuery.set("roomOrigin", roomOrigin);
  }
  const selfHref = `#/consultation${selfQuery.size ? `?${selfQuery.toString()}` : ""}`;
  let backHref = requestedRecordId ? `#/result?recordId=${encodeURIComponent(requestedRecordId)}` : "#/more";
  let backLabel = requestedRecordId ? "結果へ戻る" : "その他へ戻る";
  if (from === "interpretation-room") {
    const roomQuery = new URLSearchParams();
    if (requestedRecordId) roomQuery.set("recordId", requestedRecordId);
    roomQuery.set("origin", roomOrigin);
    if (regionId) roomQuery.set("regionId", regionId);
    backHref = `#/interpretation-room?${roomQuery.toString()}`;
    backLabel = "結果の整理へ戻る";
  }
  return renderConsultationContent({ services, experience, plan, regionId, backHref, backLabel, selfHref });
}

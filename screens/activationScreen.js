import { escapeHtml } from "../ui/commonComponents.js";
import { formatActivitySummary } from "../ui/recordPresentation.js";

function shortDate(dateText = "") {
  const match = String(dateText).match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!match) return dateText || "—";
  return `${Number(match[1])}月${Number(match[2])}日`;
}

function href(screen, values = {}) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return `#/${screen}${query.size ? `?${query.toString()}` : ""}`;
}

function sourceSummary(record = {}) {
  const pieces = [];
  if (record.activityType === "rest") return "休養";
  if (Number(record.distanceKm) > 0) pieces.push(`${Number(record.distanceKm).toLocaleString("ja-JP", { maximumFractionDigits: 2 })} km`);
  if (Number(record.durationMinutes) > 0) pieces.push(`${Math.round(Number(record.durationMinutes))}分`);
  if (record.course?.name) pieces.push(record.course.name);
  return pieces.join("・") || formatActivitySummary(record);
}

function card(number, title, description, hrefValue, label, primary = false) {
  return `<article class="card${primary ? " primary" : ""}"><span class="num">${escapeHtml(number)}</span><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div><a class="card-action" href="${escapeHtml(hrefValue)}">${escapeHtml(label)}</a></article>`;
}

export function renderActivationScreen({ services, context }) {
  const requestedRecordId = context.parameters.get("recordId") || "";
  const experience = requestedRecordId ? services.workflows.records.loadExperience(requestedRecordId) : services.workflows.records.loadLatestExperience();
  const record = experience?.record || null;
  const recordId = record?.id || "";
  return `<div class="screen screen--activation prototype-parity prototype-parity--activation">
    <section class="head"><p class="eyebrow">RESULT USE</p><h1>結果の活用</h1><p>結果を見たあと、必要な使い方を選びます。</p></section>
    ${record ? `<section class="source"><div><small>対象の記録</small><strong>${escapeHtml(shortDate(record.date))}</strong><span>${escapeHtml(sourceSummary(record))}</span></div><a data-context-back-duplicate href="${escapeHtml(href("result", { recordId }))}">結果へ戻る</a></section>` : `<section class="source"><div><small>対象の記録</small><strong>まだありません</strong><span>記録を保存すると結果に結び付けて使えます</span></div><a href="#/record-input">記録を始める</a></section>`}
    <section class="intro"><small>NEXT ACTION</small><h2>この結果をどう使うか</h2><p>アプリが次の行動を決めるのではなく、自分で確認したい入口を選びます。</p></section>
    <div class="actions">
      ${card("01", "条件を比べる", "前回の走りを基準に、距離・時間・コースなどを変えたときの12部位表示を確認します。", href("simulation", { recordId, from: "activation" }), "条件比較を開く", true)}
      ${card("02", "共有用にまとめる", "走行事実・身体の記録・次の予定などを整理し、指導者などに見せる内容を作ります。", href("consultation", { recordId }), "共有内容をまとめる")}
      ${card("03", "次の予定を作る", "今回の事実を出発点に、次の走行や休養の予定を自分で作ります。", href("plan", { sourceRecordId: recordId }), "予定を作る")}
      ${card("04", "読みものを確認する", "今回の記録に関連する情報を、読みものから確認します。", href("reading", { recordId, origin: record ? "activation" : "" }), "読みものを開く")}
    </div>
    <p class="boundary">距離や速度を増やすこと、安全性、けがの危険性、走行可否を判断する画面ではありません。</p>
  </div>`;
}

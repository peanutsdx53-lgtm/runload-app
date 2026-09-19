import { escapeHtml, renderPageHeading, renderStatusLabel } from "../ui/commonComponents.js";
import { formatActivitySummary, formatLocalDate } from "../ui/recordPresentation.js";

function href(screen, values = {}) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return `#/${screen}${query.size ? `?${query.toString()}` : ""}`;
}


function actionCard({ number, title, description, links }) {
  return `<article class="activation-card"><span class="activation-card__number">${escapeHtml(number)}</span><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div><div class="activation-card__links">${links.map((link, index) => `<a class="button ${index === 0 ? "button--primary" : "button--secondary"}" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join("")}</div></article>`;
}

export function renderActivationScreen({ services, context }) {
  const requestedRecordId = context.parameters.get("recordId") || "";
  const experience = requestedRecordId
    ? services.workflows.records.loadExperience(requestedRecordId)
    : services.workflows.records.loadLatestExperience();
  const record = experience?.record || null;
  const recordId = record?.id || "";
  const date = record?.date || "";
  const recordContext = record
    ? `<section class="activation-source" aria-label="活用する記録"><div>${renderStatusLabel("対象記録", "info")}<h2>${escapeHtml(formatLocalDate(date))}</h2><p>${escapeHtml(formatActivitySummary(record))}</p></div><a class="button button--secondary" href="${escapeHtml(href("result", { recordId }))}">結果へ戻る</a></section>`
    : `<aside class="screen-role-boundary"><p><strong>まだ対象記録がありません。</strong></p><p>予定と読みものは開けます。結果に結び付く比較や相談は、記録を保存してから対象記録を選びます。</p></aside>`;

  const publicHelpPriority = experience?.supportDecision?.route === "urgent"
    ? `<section class="next-action next-action--urgent" aria-labelledby="activation-public-help-title"><div>${renderStatusLabel("公的な相談先を確認", "attention")}<h2 id="activation-public-help-title">公的な案内を確認する</h2><p>RunLoadは緊急性を判定しません。公的な相談先は数値結果とは別に確認します。</p></div><a class="button button--primary" href="${escapeHtml(href("support-guidance", { recordId }))}">公的な相談先を確認する</a></section>`
    : "";

  const cards = [
    actionCard({ number: "01", title: "条件を比べる", description: "今回と別の条件を、同じ計算モデルで比較します。", links: [{ href: href("simulation", { recordId, from: "activation" }), label: "Simulationを開く" }] }),
    actionCard({ number: "02", title: "相談用にまとめる", description: "共有する事実と自分の質問を選んで整理します。", links: record ? [{ href: href("consultation", { recordId }), label: "相談用にまとめる" }] : [{ href: href("consultation", { mode: "free", page: "quick" }), label: "相談メモを開く" }] }),
    actionCard({ number: "03", title: "次の予定を作る", description: "走る・休む、日付、距離、時間などを自分で設定します。", links: [{ href: href("plan", { sourceRecordId: recordId }), label: "予定を作る" }] }),
    actionCard({ number: "04", title: "読みものを確認する", description: "一般情報を必要な範囲で確認します。", links: [{ href: href("reading", { recordId, origin: record ? "activation" : "" }), label: "読みものを開く" }] }),
  ];

  return `<section class="screen screen--activation" data-screen-architecture="runload-screen-architecture-current-v1">
    ${renderPageHeading({ eyebrow: "結果の活用", title: "この結果をどう使うか選ぶ", description: "比較・相談・予定・読みものから選びます。" })}
    ${recordContext}
    ${publicHelpPriority}
    <div class="activation-grid">${cards.join("")}</div>
  </section>`;
}

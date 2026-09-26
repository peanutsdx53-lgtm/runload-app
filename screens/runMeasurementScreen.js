import { escapeHtml } from "../ui/commonComponents.js";
import { formatPace, plannedPaceSecondsPerKm } from "../ui/runMeasurementCore.js";

function planSummary(plan) {
  const session = plan?.plannedSession || {};
  const parts = [];
  if (Number(session.distanceKm) > 0) parts.push(`${Number(session.distanceKm).toFixed(1)} km`);
  if (Number(session.durationMinutes) > 0) parts.push(`${Math.round(Number(session.durationMinutes))}分`);
  return parts.join("・") || "保存済み予定";
}

export function renderRunMeasurementScreen({ services, context }) {
  const requestedPlanId = String(context?.parameters?.get?.("planId") || "");
  const plan = requestedPlanId ? services.storage.plans.findById(requestedPlanId) : null;
  const validPlan = plan && plan.planType !== "rest" && plan.plannedSession?.activityType !== "rest" ? plan : null;
  const targetPace = validPlan ? plannedPaceSecondsPerKm(validPlan) : null;

  return `<div class="screen screen--run-measurement run-measurement" data-run-measurement data-plan-id="${escapeHtml(validPlan?.id || "")}" data-target-pace="${escapeHtml(targetPace || "")}">
    <header class="run-measurement__header">
      <a href="#/home" class="run-measurement__back">← ホーム</a>
      <strong>ランニング測定</strong>
      <button type="button" class="context-help-button app-utility-button context-help-button--measurement" data-screen-tutorial-start="run-measurement" aria-label="GPS測定の使い方を開く"><span class="app-utility-button__question" aria-hidden="true">?</span></button>
    </header>
    <section class="run-measurement__map-wrap">
      <div id="run-measurement-map" class="run-measurement__map" role="img" aria-label="現在地と走行軌跡を表示する地図">
        <div class="run-measurement__map-placeholder"><strong>現在地を取得すると地図を表示します</strong><span>測定開始時に位置情報の許可を求めます。</span></div>
      </div>
      <div class="run-measurement__map-controls" aria-label="地図の拡大縮小">
        <button type="button" data-action="map-zoom-in" aria-label="地図を拡大">＋</button>
        <button type="button" data-action="map-zoom-out" aria-label="地図を縮小">−</button>
      </div>
      <div class="run-measurement__gps" data-gps-status>GPS待機中</div>
    </section>

    <section class="run-measurement__metrics" aria-label="測定値">
      <article><small>時間</small><strong data-measurement-elapsed>0:00</strong></article>
      <article><small>距離</small><strong><span data-measurement-distance>0.00</span> km</strong></article>
      <article><small>現在ペース</small><strong><span data-measurement-current-pace>—</span> /km</strong></article>
      <article><small>平均ペース</small><strong><span data-measurement-average-pace>—</span> /km</strong></article>
    </section>

    ${validPlan ? `<section class="run-measurement__plan">
      <div><small>予定と連携</small><strong>${escapeHtml(planSummary(validPlan))}</strong><span>予定平均ペース ${escapeHtml(formatPace(targetPace))}/km</span></div>
    </section>` : `<section class="run-measurement__plan run-measurement__plan--empty"><div><small>予定</small><strong>予定なしで測定</strong><span>距離・時間・軌跡を測定します。</span></div></section>`}

    <div class="run-measurement__warning" data-pace-warning role="status" aria-live="assertive" hidden>
      <strong>予定より速いペースが続いています</strong>
      <span>現在ペースを確認してください。</span>
    </div>

    <section class="run-measurement__controls">
      <label class="run-measurement__route-save"><input type="checkbox" data-save-route checked><span><strong>走行軌跡を端末内に保存</strong><small>記録保存後、その記録と関連付けます。外部解析サービスへは送信しません。</small></span></label>
      <p class="run-measurement__status" data-measurement-status role="status" aria-live="polite">測定を開始してください。</p>
      <button class="run-measurement__start" type="button" data-action="start-measurement">測定を開始</button>
      <button class="run-measurement__finish" type="button" data-action="finish-measurement" hidden>測定を終了して記録入力へ</button>
      <button class="run-measurement__cancel" type="button" data-action="cancel-measurement" hidden>測定を中止</button>
    </section>
  </div>`;
}

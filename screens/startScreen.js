import { escapeHtml } from "../ui/commonComponents.js";
import { formatLocalDate } from "../ui/recordPresentation.js";
import { formatPace, plannedPaceSecondsPerKm } from "../ui/runMeasurementCore.js";

function localTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nextRunPlan(services) {
  const today = localTodayIso();
  return services.storage.plans.loadAll()
    .filter((plan) => String(plan.scheduledDate || "") >= today)
    .filter((plan) => plan.planType !== "rest" && plan.plannedSession?.activityType !== "rest")
    .sort((a, b) => String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || "")))[0] || null;
}

function planLine(plan) {
  const session = plan?.plannedSession || {};
  const parts = [];
  if (Number(session.distanceKm) > 0) parts.push(`${Number(session.distanceKm).toFixed(1)} km`);
  if (Number(session.durationMinutes) > 0) parts.push(`${Math.round(Number(session.durationMinutes))}分`);
  const pace = plannedPaceSecondsPerKm(plan);
  if (pace) parts.push(`${formatPace(pace)}/km`);
  return parts.join("・") || "走行予定";
}

export function renderStartScreen({ services }) {
  const plan = nextRunPlan(services);
  return `<div class="screen screen--start run-launch">
    <main class="run-launch__panel">
      <p class="eyebrow">RUNLOAD</p>
      <h1>今日は何をしますか</h1>
      <p class="run-launch__lead">記録を見る・入力する場合はアプリへ、走る場合はGPS測定へ進みます。</p>
      <p class="run-launch__device-note">PCでは通常のRunLoad画面を主に利用します。GPS測定はスマートフォン向けです。</p>
      <div class="run-launch__choices">
        <a class="run-launch__choice run-launch__choice--app" href="#/home">
          <small>APP</small><strong>RunLoadを使う</strong><span>記録・結果・履歴・予定を開く</span>
        </a>
        <a class="run-launch__choice run-launch__choice--measure" href="#/run-measurement">
          <small>MEASURE</small><strong>ランニングを測定する</strong><span>GPSで距離・時間・走行軌跡を測る</span>
        </a>
      </div>
      ${plan ? `<section class="run-launch__plan"><div><small>次の保存済み予定</small><strong>${escapeHtml(formatLocalDate(plan.scheduledDate || ""))}</strong><span>${escapeHtml(planLine(plan))}</span></div><a href="#/run-measurement?planId=${encodeURIComponent(plan.id || "")}">この予定を使って測定</a></section>` : ""}
      <p class="run-launch__privacy">GPS測定は、測定開始後に端末の位置情報許可を求めます。</p>
    </main>
  </div>`;
}

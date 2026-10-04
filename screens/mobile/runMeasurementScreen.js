import { escapeHtml } from "../../ui/commonComponents.js";
import { matchesMobileLayout } from "../../ui/deviceLayout.js";
import { formatPace, plannedPaceSecondsPerKm } from "../../ui/runMeasurementCore.js";

function planSummary(plan) {
  const session = plan?.plannedSession || {};
  const parts = [];
  if (Number(session.distanceKm) > 0) parts.push(`${Number(session.distanceKm).toFixed(1)} km`);
  if (Number(session.durationMinutes) > 0) parts.push(`${Math.round(Number(session.durationMinutes))}分`);
  return parts.join("・") || "保存済み予定";
}

function fatigueScaleMarkup(phase) {
  const label = phase === "after" ? "運動後の疲労感" : "運動前の疲労感";
  const opened = phase === "after" ? " open" : "";
  return `<details class="run-measurement-fatigue" data-measurement-fatigue-phase="${phase}" data-rof-context${opened}>
    <summary class="run-measurement-fatigue__head"><div><small>任意</small><strong>${label}</strong></div><span>0〜10</span></summary>
    <div class="run-measurement-fatigue__body">
      <p class="run-measurement-fatigue__question">今の疲労感を0〜10で選んでください。</p>
      <div class="rof-scale-panel">
        <div class="rof-current"><span>選択値</span><strong data-record-rof-value>—</strong><em data-record-rof-descriptor>数値を選択</em></div>
        <div class="rof-slider-wrap" data-rof-slider-wrap><input type="range" min="0" max="10" step="1" value="5" data-record-rof-slider aria-label="${label} 0から10"><div class="rof-ticks" aria-hidden="true">${Array.from({ length: 11 }, (_, value) => `<span>${value}</span>`).join("")}</div></div>
        <span data-record-rof-anchor hidden></span>
      </div>
      <details class="rof-about"><summary>尺度の出典・正式表現</summary><div><p>0〜10で、その時点で自分が感じている疲労感を記録します。部位ごとの目安とは別の情報として扱います。</p><small>正式名称：ROF-J</small></div></details>
    </div>
  </details>`;
}

function desktopUnavailable() {
  return `<div class="screen screen--run-measurement-unavailable run-launch">
    <main class="run-launch__panel">
      <p class="eyebrow">MEASURE</p>
      <h1>ランニング測定はスマホ版の機能です</h1>
      <p class="run-launch__lead">PC版では記録・結果・履歴・予定の確認と入力を利用できます。</p>
      <a class="run-launch__choice run-launch__choice--app" href="#/home"><small>APP</small><strong>アプリへ戻る</strong><span>PC版のホームを開く</span></a>
    </main>
  </div>`;
}

export function renderRunMeasurementScreen({ services, context }) {
  if (!matchesMobileLayout()) return desktopUnavailable();

  const requestedPlanId = String(context?.parameters?.get?.("planId") || "");
  const plan = requestedPlanId ? services.storage.plans.findById(requestedPlanId) : null;
  const validPlan = plan && plan.planType !== "rest" && plan.plannedSession?.activityType !== "rest" ? plan : null;
  const targetPace = validPlan ? plannedPaceSecondsPerKm(validPlan) : null;

  return `<div class="screen screen--run-measurement run-measurement run-measurement--mobile" data-run-measurement data-plan-id="${escapeHtml(validPlan?.id || "")}" data-target-pace="${escapeHtml(targetPace || "")}" data-gps-quality="waiting">
    <section class="run-measurement-prep" data-measurement-prep>
      <header class="run-measurement__header run-measurement-prep__header">
        <a href="#/home" class="run-measurement__back">← ホーム</a>
        <strong>測定の準備</strong>
        <button type="button" class="context-help-button app-utility-button context-help-button--measurement" data-screen-tutorial-start="run-measurement" aria-label="GPS測定の使い方を開く"><span class="app-utility-button__question" aria-hidden="true">?</span></button>
      </header>

      <main class="run-measurement-prep__body">
        <section class="run-measurement-prep__intro"><p class="eyebrow">MEASURE</p><h1>活動と測定方法</h1><p>活動と測定方法を選びます。</p></section>

        <fieldset class="run-measurement-mode" data-measurement-mode-group>
          <legend>測定方法</legend>
          <div class="run-measurement-mode__grid">
            <label><input type="radio" name="measurementMode" value="free" checked><span><b>自由</b><small>終了まで測定</small></span></label>
            <label><input type="radio" name="measurementMode" value="time"><span><b>時間</b><small>時間を設定</small></span></label>
            <label><input type="radio" name="measurementMode" value="distance"><span><b>距離</b><small>距離を設定</small></span></label>
          </div>
        </fieldset>

        <section class="run-measurement-goal-settings" data-measurement-goal="time" hidden>
          <label><span>時間</span><div><input type="number" inputmode="numeric" min="1" max="600" step="1" value="" placeholder="例：30" data-measurement-target-minutes><b>分</b></div></label>
          <div class="run-measurement-presets" aria-label="時間の候補">${[20,30,45,60].map((value) => `<button type="button" data-target-minutes-preset="${value}">${value}分</button>`).join("")}</div>
        </section>

        <section class="run-measurement-goal-settings" data-measurement-goal="distance" hidden>
          <label><span>距離</span><div><input type="number" inputmode="decimal" min="0.1" max="1000" step="0.1" value="" placeholder="例：5.0" data-measurement-target-distance><b>km</b></div></label>
          <div class="run-measurement-presets" aria-label="距離の候補">${[1,3,5,10].map((value) => `<button type="button" data-target-distance-preset="${value}">${value} km</button>`).join("")}</div>
        </section>

        ${validPlan ? `<section class="run-measurement__plan run-measurement-prep__plan"><div><small>保存済み予定</small><strong>${escapeHtml(planSummary(validPlan))}</strong><span>${targetPace ? `予定平均ペース ${escapeHtml(formatPace(targetPace))}/km` : "予定と測定結果を関連付けます"}</span></div></section>` : ""}

        ${fatigueScaleMarkup("before")}

        <details class="run-measurement-prep__options">
          <summary><strong>記録設定</strong><span>軌跡・自動整理</span></summary>
          <div class="run-measurement-prep__options-body">
            <label class="run-measurement__route-save"><input type="checkbox" data-save-route checked><span><strong>移動軌跡を端末内に保存</strong><small>保存した記録と関連付けます。</small></span></label>
            <p class="run-measurement-auto-note">歩数とコース条件は取得できた情報だけ自動整理します。路面は自動判定しません。</p>
          </div>
        </details>

        <p class="run-measurement__status run-measurement-prep__status" data-measurement-prep-status role="status" aria-live="polite">開始時に位置情報の許可を確認します。</p>
        <button class="run-measurement__start run-measurement-prep__start" type="button" data-action="start-measurement">測定を開始</button>
      </main>
    </section>

    <section class="run-measurement-active" data-measurement-active hidden>
      <header class="run-measurement-active__header">
        <button type="button" data-action="cancel-measurement">中止</button>
        <strong data-measurement-mode-label>自由に測る</strong>
        <span data-gps-status>GPS待機中</span>
      </header>

      <section class="run-measurement-active__hero" aria-live="polite">
        <small data-measurement-primary-label>経過時間</small>
        <strong data-measurement-primary>0:00</strong>
        <span data-measurement-goal-caption>測定中</span>
      </section>

      <section class="run-measurement__map-wrap run-measurement-active__map-wrap" data-measurement-map-panel>
        <div class="run-measurement-active__map-toolbar">
          <strong>地図</strong>
          <button type="button" data-action="toggle-measurement-map" aria-expanded="true">地図を隠す</button>
        </div>
        <div id="run-measurement-map" class="run-measurement__map" role="img" aria-label="現在地と移動軌跡を表示する地図">
          <div class="run-measurement__map-placeholder"><strong>現在地を取得しています</strong><span>GPSを受信すると地図を表示します。</span></div>
        </div>
        <div class="run-measurement__map-controls" aria-label="地図の拡大縮小"><button type="button" data-action="map-zoom-in" aria-label="地図を拡大">＋</button><button type="button" data-action="map-zoom-out" aria-label="地図を縮小">−</button></div>
      </section>

      <section class="run-measurement__metrics run-measurement-active__metrics" aria-label="測定値">
        <article><small>経過時間</small><strong data-measurement-elapsed>0:00</strong></article>
        <article><small>距離</small><strong><span data-measurement-distance>0.00</span> km</strong></article>
        <article><small>現在ペース</small><strong><span data-measurement-current-pace>—</span> /km</strong></article>
        <article><small>平均ペース</small><strong><span data-measurement-average-pace>—</span> /km</strong></article>
      </section>

      <details class="run-measurement-active__secondary">
        <summary><strong>自動整理</strong><span>歩数・消費エネルギー</span></summary>
        <section class="run-measurement-auto-facts" aria-label="自動整理した測定値">
          <div><small>推定歩数</small><strong><span data-measurement-step-value>—</span> <b>歩</b></strong><em data-measurement-step-status>端末モーションから推定します。</em></div>
          <div><small>推定消費エネルギー</small><strong><span data-measurement-energy-value>—</span> <b>kcal</b></strong><em data-measurement-energy-status>GPS取得後に表示します。</em></div>
        </section>
      </details>

      <div class="run-measurement__warning" data-pace-warning role="status" aria-live="assertive" hidden><strong>予定より速いペースが続いています</strong><span>現在ペースを確認してください。</span></div>

      <section class="run-measurement-goal-reached" data-measurement-goal-reached hidden role="status" aria-live="assertive">
        <strong data-measurement-goal-reached-title>設定した目標に到達しました</strong>
        <span>終了にはGPSで10m以上の移動取得が必要です。足りない場合はそのまま続けてください。</span>
        <div><button type="button" data-action="finish-from-goal">測定を終了</button><button type="button" data-action="continue-after-goal">そのまま続ける</button></div>
      </section>

      <section class="run-measurement-active__controls">
        <p class="run-measurement-finish-requirement">終了にはGPSで10m以上の移動取得が必要です。</p>
        <p class="run-measurement__status" data-measurement-status role="status" aria-live="polite">GPSを取得しています。</p>
        <div class="run-measurement-active__control-row"><button type="button" class="run-measurement-active__pause" data-action="pause-measurement">一時停止</button><button type="button" class="run-measurement__finish" data-action="finish-measurement">測定を終了</button></div>
      </section>
    </section>

    <section class="run-measurement-post" data-measurement-post hidden>
      <header class="run-measurement__header"><span></span><strong>測定終了</strong><span></span></header>
      <main class="run-measurement-post__body">
        <section class="run-measurement-post__summary"><p class="eyebrow">DONE</p><h1>測定が完了しました</h1><div class="run-measurement-post__facts run-measurement-post__facts--primary"><span><small>時間</small><strong data-measurement-post-time>—</strong></span><span><small>距離</small><strong data-measurement-post-distance>—</strong></span></div></section>

        <details class="run-measurement-post__auto-details">
          <summary><span><small>自動整理</small><strong>補助記録を確認</strong></span><b>歩数・コースなど</b></summary>
          <div class="run-measurement-post__auto-body">
            <div class="run-measurement-post__facts run-measurement-post__facts--secondary"><span><small>推定歩数</small><strong data-measurement-post-steps>—</strong><em data-measurement-post-step-status>端末モーション利用時のみ</em></span><span class="run-measurement-post__energy"><small>推定消費エネルギー</small><strong><span data-measurement-post-energy>—</span> kcal</strong><em data-measurement-post-energy-status>推定できませんでした。</em></span></div>
            <section class="run-measurement-course-analysis">
              <div><small>GPSから自動整理</small><strong>コース条件</strong></div>
              <p data-measurement-post-course>解析しています。</p>
              <span data-measurement-post-elevation>高度情報が十分な場合だけ坂道を自動入力します。</span>
              <em>路面はGPSから決めず、記録画面で未確認のまま残します。</em>
            </section>
          </div>
        </details>

        ${fatigueScaleMarkup("after")}
        <p class="run-measurement-post__fatigue-comparison" data-measurement-fatigue-comparison hidden></p>
        <section class="run-measurement-post__completion">
          <div><small>次の操作</small><strong>記録を完成する</strong></div>
          <p class="run-measurement__status" data-measurement-post-status role="status" aria-live="polite">疲労感は任意です。そのまま記録入力へ進めます。</p>
          <button type="button" class="run-measurement__start" data-action="record-post-fatigue" disabled>疲労感を保存して記録を完成する</button>
          <button type="button" class="run-measurement-post__skip" data-action="skip-post-fatigue">疲労感なしで記録を完成する</button>
        </section>
      </main>
    </section>
  </div>`;
}

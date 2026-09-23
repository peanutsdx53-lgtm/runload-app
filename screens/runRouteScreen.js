import { escapeHtml } from "../ui/commonComponents.js";
import { formatLocalDate } from "../ui/recordPresentation.js";
import { findSavedRunMeasurement } from "../ui/runMeasurementState.js";

function durationLabel(minutes) {
  const totalSeconds = Math.max(0, Math.round(Number(minutes || 0) * 60));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(mins).padStart(2, "0")}:${seconds}` : `${mins}:${seconds}`;
}

export function renderRunRouteScreen({ services, context }) {
  const recordId = String(context?.parameters?.get?.("recordId") || "");
  const record = recordId ? services.storage.records.findById(recordId) : null;
  const measurement = recordId ? findSavedRunMeasurement(recordId) : null;

  if (!record || !measurement || !Array.isArray(measurement.track) || measurement.track.length < 2) {
    return `<div class="screen screen--run-route screen-layout screen-layout--result">
      <section class="run-route-view run-route-view--empty">
        <p class="eyebrow">RUN ROUTE</p>
        <h1>走行軌跡</h1>
        <p>この記録には保存したGPS走行軌跡がありません。</p>
        <a href="#/result${recordId ? `?recordId=${encodeURIComponent(recordId)}` : ""}">結果へ戻る</a>
      </section>
    </div>`;
  }

  return `<div class="screen screen--run-route screen-layout screen-layout--result" data-run-route data-record-id="${escapeHtml(recordId)}">
    <section class="run-route-view">
      <div class="run-route-view__heading">
        <div><p class="eyebrow">RUN ROUTE</p><h1>走行軌跡</h1></div>
        <span>${escapeHtml(formatLocalDate(record.date || ""))}</span>
      </div>
      <div class="run-route-view__map-wrap">
        <div id="run-route-map" class="run-route-view__map" role="img" aria-label="保存した走行軌跡の地図"></div>
        <div class="run-measurement__map-controls" aria-label="地図の拡大縮小">
          <button type="button" data-action="route-zoom-in" aria-label="地図を拡大">＋</button>
          <button type="button" data-action="route-zoom-out" aria-label="地図を縮小">−</button>
        </div>
      </div>
      <div class="run-route-view__summary">
        <div><small>測定距離</small><strong>${Number(measurement.distanceKm || 0).toFixed(2)} km</strong></div>
        <div><small>測定時間</small><strong>${escapeHtml(durationLabel(measurement.durationMinutes))}</strong></div>
        <div><small>保存地点</small><strong>${Number(measurement.track.length)}点</strong></div>
      </div>
      <p class="run-route-view__note">軌跡はGPS測定時に端末内へ保存した位置情報です。地図表示ではOpenStreetMapの地図画像を取得します。</p>
    </section>
  </div>`;
}

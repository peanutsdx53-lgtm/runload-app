import { PRIMARY_REGIONAL_V2_MODEL_VERSION } from "../core/appCore.js";
import { BODY_REGION_VIEWS } from "../ui/bodyRegionVisuals.js";
import { escapeHtml } from "../ui/commonComponents.js";
import { formatLocalDate } from "../ui/recordPresentation.js";

function finite(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function direction(value) {
  if (!finite(value)) return "unavailable";
  const delta = Number(value) - 100;
  if (Math.abs(delta) < 1) return "reference";
  return delta > 0 ? "above" : "below";
}

function chronology(left = {}, right = {}) {
  return String(left.date || "").localeCompare(String(right.date || ""))
    || String(left.createdAt || "").localeCompare(String(right.createdAt || ""))
    || String(left.id || "").localeCompare(String(right.id || ""));
}

function formatDistance(record = {}) {
  const distance = Number(record.distanceKm);
  return Number.isFinite(distance) && distance > 0 ? `${distance.toFixed(distance >= 10 ? 1 : 2).replace(/\.0$/, "")} km` : "—";
}

function formatDuration(record = {}) {
  const duration = Number(record.durationMinutes);
  return Number.isFinite(duration) && duration > 0 ? `${Math.round(duration)}分` : "—";
}

function regionMap(resultRecord = {}) {
  const rows = resultRecord?.result?.regions || [];
  return new Map(rows.map((row) => [String(row.regionId || ""), row]));
}

function miniBodyMap(resultRecord = {}, suffix = "timeline") {
  const rows = regionMap(resultRecord);
  return BODY_REGION_VIEWS.map((view) => `<figure class="body-timeline-map__view"><figcaption>${escapeHtml(view.title)}</figcaption><svg viewBox="70 10 160 430" aria-label="${escapeHtml(view.title)}の部位図"><defs><pattern id="timeline-hatch-${view.key}-${suffix}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="12" stroke="currentColor" stroke-width="3" opacity=".26"></line></pattern></defs><g class="body-timeline-map__silhouette">${view.silhouette}</g><g>${view.paths.map(([regionId, d]) => {
    const value = rows.get(regionId)?.value;
    const state = direction(value);
    const style = state === "unavailable" ? ` style="fill:url(#timeline-hatch-${view.key}-${suffix})"` : "";
    return `<path class="body-timeline-map__region" data-direction="${state}"${style} d="${d}"><title>${escapeHtml(`${view.title} ${regionId} ${finite(value) ? Number(value).toFixed(1) : "数値なし"}`)}</title></path>`;
  }).join("")}</g></svg></figure>`).join("");
}

function selectTimeline(experiences = [], recordId = "") {
  const eligible = experiences
    .filter((item) => item?.record?.activityType === "run")
    .filter((item) => item?.regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION)
    .sort((a, b) => chronology(a.record, b.record));
  if (!eligible.length) return [];
  const requested = eligible.findIndex((item) => item.record.id === recordId);
  const targetIndex = requested >= 0 ? requested : eligible.length - 1;
  let start = Math.max(0, targetIndex - 4);
  let end = Math.min(eligible.length, start + 5);
  start = Math.max(0, end - 5);
  return eligible.slice(start, end).map((item, index) => ({ item, index: start + index, target: start + index === targetIndex }));
}

export function renderBodyTimelineScreen({ services, context }) {
  const recordId = String(context?.parameters?.get?.("recordId") || "");
  const experiences = services.workflows.records.loadAllExperiences();
  const timeline = selectTimeline(experiences, recordId);
  if (!timeline.length) {
    return `<div class="screen screen--body-timeline screen-layout screen-layout--body-timeline"><section class="body-timeline-empty"><p class="eyebrow">BODY TIMELINE</p><h1>身体の推移</h1><p>表示できる走行記録がまだありません。</p></section></div>`;
  }
  const selected = timeline.find((entry) => entry.target) || timeline.at(-1);
  return `<div class="screen screen--body-timeline screen-layout screen-layout--body-timeline" data-body-timeline data-target-index="${timeline.indexOf(selected)}">
    <section class="body-timeline-hero">
      <div><p class="eyebrow">BODY TIMELINE</p><h1>身体の推移</h1></div>
      <p>左右にスワイプして保存記録を見比べます。</p>
    </section>
    <div class="body-timeline-rail" data-body-timeline-rail>
      ${timeline.map(({ item, target }, index) => {
        const record = item.record;
        const result = item.regionalV2ResultRecord;
        const available = (result?.result?.regions || []).filter((row) => finite(row?.value)).length;
        return `<article class="body-timeline-card${target ? " is-current" : ""}" data-body-timeline-card data-card-index="${index}"${target ? ' data-current="true"' : ""}>
          <header><div><small>${target ? "今回" : "保存記録"}</small><strong>${escapeHtml(formatLocalDate(record.date || ""))}</strong></div><span>${escapeHtml(formatDistance(record))}<b>・</b>${escapeHtml(formatDuration(record))}</span></header>
          <div class="body-timeline-map">${miniBodyMap(result, `${index}-${String(record.id || "").replace(/[^a-zA-Z0-9_-]/g, "")}`)}</div>
          <footer><span><strong>${available}</strong><small>/ 12 数値あり</small></span><a href="#/result?recordId=${encodeURIComponent(record.id)}">この日の結果</a></footer>
        </article>`;
      }).join("")}
    </div>
    <div class="body-timeline-dots" data-body-timeline-dots aria-label="記録の位置">${timeline.map((entry, index) => `<button type="button" data-body-timeline-dot="${index}" aria-label="${index + 1}件目"${entry.target ? ' class="is-active" aria-current="true"' : ""}></button>`).join("")}</div>
    <p class="body-timeline-note">色は各保存時点の12部位表示です。部位同士の順位や危険度を示しません。</p>
  </div>`;
}

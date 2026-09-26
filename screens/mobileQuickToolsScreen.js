import { escapeHtml } from "../ui/commonComponents.js";
import { loadMobileQuickTools } from "../ui/mobileQuickToolsStore.js";

function formatTimestamp(value = "") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日時不明";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function renderDeleteButton(tool, id) {
  return `<button type="button" class="mobile-tool-history__delete" data-mobile-tool-delete="${escapeHtml(id)}" data-mobile-tool-delete-kind="${escapeHtml(tool)}">削除</button>`;
}

function renderEmptyHistory(label) {
  return `<p class="mobile-tool-history__empty">${escapeHtml(label)}はまだありません。</p>`;
}

function renderLocationHistory(entries) {
  if (!entries.length) return renderEmptyHistory("保存した地点メモ");
  return entries.slice(0, 5).map((entry) => {
    const coords = Number.isFinite(Number(entry.latitude)) && Number.isFinite(Number(entry.longitude))
      ? `${Number(entry.latitude).toFixed(5)}, ${Number(entry.longitude).toFixed(5)}`
      : "位置情報なし";
    const accuracy = Number(entry.accuracy) > 0 ? `精度 約${Math.round(Number(entry.accuracy))}m` : "";
    return `<article class="mobile-tool-history__item"><div><small>${escapeHtml(formatTimestamp(entry.createdAt))}</small><strong>${escapeHtml(entry.category || "地点")}</strong><p>${escapeHtml(entry.note || "メモなし")}</p><span>${escapeHtml([coords, accuracy].filter(Boolean).join(" ・ "))}</span></div>${renderDeleteButton("location", entry.id)}</article>`;
  }).join("");
}

function renderQuickHistory(entries) {
  if (!entries.length) return renderEmptyHistory("保存した1分メモ");
  return entries.slice(0, 5).map((entry) => {
    const lines = [
      entry.good ? `うまくいったこと：${entry.good}` : "",
      entry.notice ? `気づき：${entry.notice}` : "",
      entry.next ? `次に確認：${entry.next}` : "",
    ].filter(Boolean);
    return `<article class="mobile-tool-history__item"><div><small>${escapeHtml(formatTimestamp(entry.createdAt))}</small><strong>1分メモ</strong>${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>${renderDeleteButton("quick", entry.id)}</article>`;
  }).join("");
}

function renderGearHistory(entries) {
  if (!entries.length) return renderEmptyHistory("保存した装備メモ");
  return entries.slice(0, 5).map((entry) => {
    const title = entry.shoes || entry.gear || "装備メモ";
    const details = [entry.shoes && entry.gear ? entry.gear : "", entry.note].filter(Boolean).join(" ・ ");
    return `<article class="mobile-tool-history__item"><div><small>${escapeHtml(formatTimestamp(entry.createdAt))}</small><strong>${escapeHtml(title)}</strong><p>${escapeHtml(details || "メモなし")}</p></div>${renderDeleteButton("gear", entry.id)}</article>`;
  }).join("");
}

function renderShell({ tool, eyebrow, title, description, form, historyTitle, history }) {
  return `<div class="screen screen-layout screen-layout--mobile-tool mobile-tool-screen" data-mobile-tool="${escapeHtml(tool)}">
    <section class="mobile-tool-head">
      <p class="eyebrow">SMARTPHONE TOOL</p>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
    </section>
    ${form}
    <section class="mobile-tool-history" aria-labelledby="mobile-tool-history-title">
      <div class="mobile-tool-section-head"><div><small>RECENT</small><h2 id="mobile-tool-history-title">${escapeHtml(historyTitle)}</h2></div></div>
      <div class="mobile-tool-history__list">${history}</div>
    </section>
    <p class="mobile-tool-local-note">この機能の内容は、この端末のブラウザ内に保存します。自動送信はしません。</p>
  </div>`;
}

export function renderLocationNoteScreen() {
  const state = loadMobileQuickTools();
  const form = `<form class="mobile-tool-card" data-mobile-tool-form="location">
    <div class="mobile-tool-card__lead"><div><small>現在地</small><strong>その場の気づきを位置と一緒に残す</strong></div><button type="button" class="secondary" data-mobile-location-capture>現在地を取得</button></div>
    <div class="mobile-tool-location-status" data-mobile-location-status aria-live="polite">位置情報はまだ取得していません。</div>
    <input type="hidden" name="latitude">
    <input type="hidden" name="longitude">
    <input type="hidden" name="accuracy">
    <fieldset class="mobile-tool-choice"><legend>種類</legend><label><input type="radio" name="category" value="坂" checked><span>坂</span></label><label><input type="radio" name="category" value="路面"><span>路面</span></label><label><input type="radio" name="category" value="休憩"><span>休憩</span></label><label><input type="radio" name="category" value="その他"><span>その他</span></label></fieldset>
    <label class="mobile-tool-field"><span>メモ</span><textarea name="note" rows="3" maxlength="160" placeholder="例：ここから坂が続く"></textarea></label>
    <p class="mobile-tool-form-status" data-mobile-tool-form-status aria-live="polite"></p>
    <button type="submit" class="primary mobile-tool-save">地点メモを保存</button>
  </form>`;
  return renderShell({
    tool: "location",
    eyebrow: "SMARTPHONE TOOL",
    title: "地点メモ",
    description: "走っている場所で気づいたことを、その地点と一緒に残します。",
    form,
    historyTitle: "最近の地点メモ",
    history: renderLocationHistory(state.locationNotes),
  });
}

export function renderQuickNoteScreen() {
  const state = loadMobileQuickTools();
  const form = `<form class="mobile-tool-card" data-mobile-tool-form="quick">
    <div class="mobile-tool-card__lead"><div><small>短く残す</small><strong>考えをまとめすぎず、その場で記録</strong></div></div>
    <label class="mobile-tool-field"><span>うまくいったこと</span><textarea name="good" rows="2" maxlength="160" placeholder="例：前半は余裕を持てた"></textarea></label>
    <label class="mobile-tool-field"><span>気づき</span><textarea name="notice" rows="2" maxlength="160" placeholder="例：後半で姿勢が崩れやすい"></textarea></label>
    <label class="mobile-tool-field"><span>次に確認</span><textarea name="next" rows="2" maxlength="160" placeholder="例：次回は前半のペースを確認する"></textarea></label>
    <p class="mobile-tool-form-status" data-mobile-tool-form-status aria-live="polite"></p>
    <button type="submit" class="primary mobile-tool-save">1分メモを保存</button>
  </form>`;
  return renderShell({
    tool: "quick",
    eyebrow: "SMARTPHONE TOOL",
    title: "1分メモ",
    description: "うまくいったこと、気づき、次に確認することを短く残します。",
    form,
    historyTitle: "最近の1分メモ",
    history: renderQuickHistory(state.quickNotes),
  });
}

export function renderGearNoteScreen() {
  const state = loadMobileQuickTools();
  const form = `<form class="mobile-tool-card" data-mobile-tool-form="gear">
    <div class="mobile-tool-card__lead"><div><small>装備</small><strong>今日使ったものを簡単に残す</strong></div></div>
    <label class="mobile-tool-field"><span>シューズ</span><input type="text" name="shoes" maxlength="80" placeholder="例：普段使いのシューズ"></label>
    <label class="mobile-tool-field"><span>ウェア・装備</span><input type="text" name="gear" maxlength="120" placeholder="例：薄手ジャケット、ライト"></label>
    <label class="mobile-tool-field"><span>メモ</span><textarea name="note" rows="3" maxlength="160" placeholder="例：雨でシューズが濡れた"></textarea></label>
    <p class="mobile-tool-form-status" data-mobile-tool-form-status aria-live="polite"></p>
    <button type="submit" class="primary mobile-tool-save">装備メモを保存</button>
  </form>`;
  return renderShell({
    tool: "gear",
    eyebrow: "SMARTPHONE TOOL",
    title: "装備メモ",
    description: "シューズやウェアなど、その日に使った装備を後から振り返れるように残します。",
    form,
    historyTitle: "最近の装備メモ",
    history: renderGearHistory(state.gearNotes),
  });
}

import { formatJapaneseTimestamp as formatTimestamp } from "../../ui/mobileDateUtilities.js";
import { escapeHtml } from "../../ui/commonComponents.js";
import { loadMobileQuickTools } from "../../ui/mobileQuickToolsStore.js";

function renderDeleteButton(tool, id) {
  return `<button type="button" class="mobile-tool-history__delete" data-mobile-tool-delete="${escapeHtml(id)}" data-mobile-tool-delete-kind="${escapeHtml(tool)}">削除</button>`;
}

function renderEmptyHistory(label) {
  return `<p class="mobile-tool-history__empty">${escapeHtml(label)}はまだありません。</p>`;
}

function renderDepartureHistory(entries) {
  if (!entries.length) return renderEmptyHistory("保存した出発チェック");
  return entries.slice(0, 5).map((entry) => {
    const checks = Array.isArray(entry.checks) ? entry.checks.filter(Boolean) : [];
    const summary = checks.length ? checks.join(" ・ ") : "確認項目なし";
    return `<article class="mobile-tool-history__item"><div><small>${escapeHtml(formatTimestamp(entry.createdAt))}</small><strong>出発チェック</strong><p>${escapeHtml(summary)}</p>${entry.note ? `<span>${escapeHtml(entry.note)}</span>` : ""}</div>${renderDeleteButton("departure", entry.id)}</article>`;
  }).join("");
}

function renderShell({ tool, title, description, form, historyTitle, history }) {
  return `<div class="screen screen-layout screen-layout--mobile-tool mobile-tool-screen" data-mobile-tool="${escapeHtml(tool)}">
    <section class="mobile-tool-head">
      <p class="eyebrow">便利な機能</p>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
    </section>
    ${form}
    <section class="mobile-tool-history" aria-labelledby="mobile-tool-history-title">
      <div class="mobile-tool-section-head"><div><small>最近の記録</small><h2 id="mobile-tool-history-title">${escapeHtml(historyTitle)}</h2></div></div>
      <div class="mobile-tool-history__list">${history}</div>
    </section>
    <p class="mobile-tool-local-note">この機能の内容は、この端末のブラウザ内に保存します。自動送信はしません。</p>
  </div>`;
}

export function renderDepartureCheckScreen() {
  const state = loadMobileQuickTools();
  const form = `<form class="mobile-tool-card" data-mobile-tool-form="departure">
    <div class="mobile-tool-card__lead"><div><small>出発前</small><strong>必要な準備だけ短く確認</strong></div></div>
    <fieldset class="mobile-tool-choice mobile-tool-choice--checklist"><legend>確認項目</legend><label><input type="checkbox" name="checks" value="水分"><span>水分</span></label><label><input type="checkbox" name="checks" value="鍵・連絡手段"><span>鍵・連絡手段</span></label><label><input type="checkbox" name="checks" value="ライト・反射材"><span>ライト・反射材</span></label><label><input type="checkbox" name="checks" value="必要な装備"><span>必要な装備</span></label></fieldset>
    <label class="mobile-tool-field"><span>メモ</span><textarea name="note" rows="3" maxlength="160" placeholder="例：折り返し地点で給水する"></textarea></label>
    <p class="mobile-tool-form-status" data-mobile-tool-form-status aria-live="polite"></p>
    <button type="submit" class="primary mobile-tool-save">確認内容を保存</button>
  </form>`;
  return renderShell({ tool: "departure", title: "出発チェック", description: "持ち物や準備を確認して、その時点の内容を残します。", form, historyTitle: "最近の出発チェック", history: renderDepartureHistory(state.departureChecks) });
}

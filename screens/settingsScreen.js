import { APPEARANCE_MODE_OPTIONS, COLOR_THEME_OPTIONS, TEXT_SIZE_OPTIONS, normalizeJournalSettings } from "../ui/appSettings.js";
import { escapeHtml } from "../ui/commonComponents.js";
import { PROFILE_AGE_BAND_OPTIONS } from "../core/runloadCore.js";

function checked(current, value) {
  return current === value ? " checked" : "";
}

function displayOptionLabel(option) {
  return escapeHtml(option?.label || "");
}

function renderDisplayChoices(name, current, options, { theme = false } = {}) {
  return `<div class="display-choice-list">${options.map((option) => `<label class="display-choice${theme ? " display-choice--theme" : ""}"><input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(option.value)}" data-immediate-display-setting data-setting-label="${displayOptionLabel(option)}"${checked(current, option.value)}>${theme ? `<span class="display-choice__swatch" data-theme-preview="${escapeHtml(option.value)}" aria-hidden="true"></span>` : '<span class="display-choice__dot" aria-hidden="true"></span>'}<strong>${displayOptionLabel(option)}</strong></label>`).join("")}</div>`;
}

function renderDisplaySetting({ eyebrow, title, name, current, options, theme = false }) {
  const currentLabel = options.find((option) => option.value === current)?.label || options[0]?.label || "";
  return `<details class="display-setting"><summary><span class="display-setting__title"><small>${escapeHtml(eyebrow)}</small><strong>${escapeHtml(title)}</strong></span><span class="display-setting__current" data-display-setting-value="${escapeHtml(name)}">${escapeHtml(currentLabel)}</span><i aria-hidden="true">⌄</i></summary><div class="display-setting__body">${renderDisplayChoices(name, current, options, { theme })}</div></details>`;
}

function renderSavedShoes(settings = {}) {
  const savedShoes = Array.isArray(settings.savedShoes) ? settings.savedShoes : [];
  if (!savedShoes.length) return '<div class="settings-empty-state"><strong>保存シューズはまだありません</strong><span>記録画面の「今回のシューズ」で保存すると、ここで管理できます。</span></div>';
  return `<div class="shoes">${savedShoes.map((shoe) => `<div class="shoe"><span><strong>${escapeHtml(shoe.label || "名称なし")}</strong><small>${escapeHtml([shoe.type, shoe.softness].filter(Boolean).join("・") || "保存済み")}</small></span><button type="button" data-action="remove-saved-shoe" data-shoe-id="${escapeHtml(shoe.id || "")}">削除</button></div>`).join("")}</div>`;
}

function renderDataOverview(services) {
  const records = services.storage.records.loadAll();
  const plans = services.storage.plans.loadAll();
  const courseCount = services.storage.courses.loadAll().length;
  const draft = services.storage.draft.load();
  return `<div class="data-overview"><div><small>走行・休養記録</small><strong>${records.length}件</strong></div><div><small>予定</small><strong>${plans.length}件</strong></div><div><small>保存コース</small><strong>${courseCount}件</strong></div><div><small>入力途中</small><strong>${draft ? "下書きあり" : "なし"}</strong></div></div>`;
}

export function renderSettingsScreen({ services, context }) {
  const settings = normalizeJournalSettings(services.storage.settings.load());
  const profile = services.storage.profile.load();
  const saved = context?.parameters?.get("status") === "saved";
  const goalValues = new Set(Array.isArray(profile.runningGoalTags) ? profile.runningGoalTags : []);
  const goals = ["健康づくり", "習慣化", "距離を伸ばす", "大会参加", "気分転換", "その他"];
  return `<div class="screen screen--settings screen-layout screen-layout--settings secondary-derived-screen">
    <header class="secondary-derived-head"><a class="secondary-derived-back" href="#/more">← その他へ戻る</a><strong>設定</strong><span aria-hidden="true"></span></header>
    <div class="secondary-derived-body">
    <section class="head"><p class="eyebrow">SETTINGS</p><h1>設定</h1><p>表示、使い回す情報、端末内データをまとめます。</p></section>
    ${saved ? '<p class="parity-save-message" role="status">設定を保存しました。</p>' : ""}
    <form id="journal-settings-form" novalidate>
      <section class="group"><p class="group-title">DISPLAY</p>
        <div class="display-setting-list">
          ${renderDisplaySetting({ eyebrow: "TEXT SIZE", title: "文字サイズ", name: "textSize", current: settings.textSize, options: TEXT_SIZE_OPTIONS })}
          ${renderDisplaySetting({ eyebrow: "APPEARANCE", title: "明るさ", name: "appearanceMode", current: settings.appearanceMode, options: APPEARANCE_MODE_OPTIONS })}
          ${renderDisplaySetting({ eyebrow: "THEME", title: "配色", name: "colorTheme", current: settings.colorTheme, options: COLOR_THEME_OPTIONS, theme: true })}
        </div>
        <p class="visually-hidden" data-display-settings-status role="status" aria-live="polite"></p>
      </section>

      <section class="group"><p class="group-title">SHARE PROFILE</p>
        <details class="disclosure"><summary><span><small>OPTIONAL PROFILE</small><strong>共有用プロフィール</strong><span>共有用にまとめる画面で、必要な項目だけ選んで使える任意情報</span></span><i>⌄</i></summary><div class="disclosure-body">
          <div class="boundary"><strong>共有用の任意情報です。</strong> 「共有用にまとめる」で本人が選んだ項目だけ共有内容に含めます。</div>
          <div class="fields two-fields">
            <label class="field"><span>ランニング開始時期（任意）</span><input name="runningStartDateOrBand" maxlength="80" value="${escapeHtml(profile.runningStartDateOrBand || "")}" placeholder="例：2026年春、3か月前"><small>共有時に含めるか選べます</small></label>
            <label class="field"><span>走ることへの慣れ（任意）</span><select name="experienceSelfAssessment"><option value=""${!profile.experienceSelfAssessment ? " selected" : ""}>未設定</option>${["始めたばかり","まだ慣れていない","少し慣れてきた","自分なりに継続している"].map((x) => `<option value="${escapeHtml(x)}"${profile.experienceSelfAssessment === x ? " selected" : ""}>${escapeHtml(x)}</option>`).join("")}</select><small>共有時に含めるか選べます</small></label>
          </div>
          <div class="sub-section-head profile-goal-head"><small>GOAL</small><strong>記録を続ける主な目的（任意）</strong></div>
          <div class="goal-grid">${goals.map((goal) => `<label><input type="checkbox" name="runningGoalTags" value="${escapeHtml(goal)}"${goalValues.has(goal) ? " checked" : ""}><span>${escapeHtml(goal)}</span></label>`).join("")}</div>
          <details class="subdetails"><summary><span><strong>共有プロフィールの基本情報</strong><small>必要な場合だけ入力</small></span><span>⌄</span></summary><div class="subdetails-body"><div class="fields two-fields">
            <label class="field"><span>身長（cm）</span><input name="profileHeightCm" type="number" inputmode="decimal" min="100" max="230" step="0.1" value="${escapeHtml(profile.heightCm ?? "")}"></label>
            <label class="field"><span>体重（kg）</span><input name="profileWeightKg" type="number" inputmode="decimal" min="25" max="180" step="0.1" value="${escapeHtml(profile.weightKg ?? "")}"></label>
            <label class="field"><span>年齢帯</span><select name="profileAgeBand"><option value="">未設定・回答しない</option>${PROFILE_AGE_BAND_OPTIONS.map((item) => `<option value="${escapeHtml(item.key)}"${item.key === profile.ageBand ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>
            <label class="field"><span>性別（任意）</span><select name="profileSex"><option value="">未設定・回答しない</option><option value="male"${profile.sex === "male" ? " selected" : ""}>男性</option><option value="female"${profile.sex === "female" ? " selected" : ""}>女性</option></select></label>
          </div><p class="note">すべて任意です。「共有用にまとめる」で、共有内容に含めるか本人が選べます。</p></div></details>
          <details class="subdetails"><summary><span><strong>保存シューズ</strong><small>Recordで次回も選べる名称</small></span><span>⌄</span></summary><div class="subdetails-body">${renderSavedShoes(settings)}<p class="visually-hidden">保存候補から削除しても、過去記録に保存されたシューズ情報は変わりません。</p></div></details>
          <div class="action-row"><button type="submit" class="primary">プロフィールを保存</button><button type="button" data-action="reset-journal-settings">標準設定に戻す</button></div>
          <p class="visually-hidden">ルートファイル（GPX）は端末内で読み取り、外部サービスへ自動送信しません。</p>
          <input type="hidden" name="regionalResultInitialView" value="${escapeHtml(settings.regionalResultInitialView)}">
          <input type="hidden" name="showRegionalPreviousComparison" value="${settings.showRegionalPreviousComparison ? "show" : "hide"}">
          <div class="form-messages" data-form-messages tabindex="-1" hidden></div>
        </div></details>
      </section>
    </form>

    <section class="group"><p class="group-title">DATA</p>
      <details class="disclosure"${context?.parameters?.get("section") === "data" ? " open" : ""}><summary><span><small>LOCAL DATA</small><strong>バックアップ・復元・削除</strong><span>必要なときだけ開きます</span></span><i>⌄</i></summary><div class="disclosure-body">
        ${renderDataOverview(services)}
        <p class="note">この端末のRunLoadデータを対象にします。自分で操作しない限り、バックアップや削除は実行しません。</p>
        <div class="action-row"><button type="button" class="primary" data-action="export-backup">バックアップを保存</button><label for="restore-backup-file">バックアップを選択</label><input class="hidden-file" id="restore-backup-file" data-action="restore-backup" type="file" accept="application/json,.json"></div>
        <div class="restore-preview" data-restore-preview-host aria-live="polite"><p class="muted-text">ファイルを選ぶと、内容を確認してから復元できます。</p></div>
        <div class="danger-box"><strong>この端末内のRunLoadデータを削除</strong><p>記録、結果、予定、保存コース、プロフィール、設定、保存シューズ、下書きなどを削除します。端末へ書き出したバックアップファイルは削除しません。</p><label class="field"><span>確認のため「削除」と入力</span><input id="clear-data-confirmation" autocomplete="off"></label><div class="action-row"><button type="button" class="danger" data-action="clear-all-user-data">すべて削除</button></div></div>
        <div class="form-messages" data-data-management-messages role="status" aria-live="polite" tabindex="-1" hidden></div>
        <div class="action-row"><a href="#/privacy?returnTo=%23%2Fsettings">データの扱いを確認 <span class="action-chevron">›</span></a></div>
      </div></details>
    </section>

    </div>
  </div>`;
}

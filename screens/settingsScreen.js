import {
  APPEARANCE_MODE_OPTIONS,
  COLOR_THEME_OPTIONS,
  TEXT_SIZE_OPTIONS,
  normalizeJournalSettings,
} from "../ui/appSettings.js";
import { escapeHtml } from "../ui/commonComponents.js";
import { PROFILE_AGE_BAND_OPTIONS } from "../core/runloadCore.js";

function checked(current, value) {
  return current === value ? " checked" : "";
}

function renderSegmentRadios(name, current, options) {
  return `<div class="segment parity-segment" role="group">${options.map((option) => `<label><input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(option.value)}"${checked(current, option.value)}><span>${escapeHtml(option.label)}</span></label>`).join("")}</div>`;
}

function renderThemeOptions(current) {
  return `<div class="parity-theme-grid">${COLOR_THEME_OPTIONS.map((option) => `<label class="parity-theme-option"><input type="radio" name="colorTheme" value="${escapeHtml(option.value)}"${checked(current, option.value)}><span class="parity-theme-option__swatch" data-theme-preview="${escapeHtml(option.value)}" aria-hidden="true"></span><span><strong>${escapeHtml(option.label)}</strong><small>${escapeHtml(option.description)}</small></span></label>`).join("")}</div>`;
}

function renderSavedShoes(settings = {}) {
  const savedShoes = Array.isArray(settings.savedShoes) ? settings.savedShoes : [];
  if (!savedShoes.length) return '<p class="note">保存シューズはありません。</p>';
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
  return `<div class="screen screen--settings prototype-parity prototype-parity--settings">
    <section class="head"><p class="eyebrow">SETTINGS</p><h1>設定</h1><p>表示、使い回す情報、端末内データをまとめます。</p></section>
    ${saved ? '<p class="parity-save-message" role="status">設定を保存しました。</p>' : ""}
    <form id="journal-settings-form" novalidate>
      <section class="group"><p class="group-title">DISPLAY</p>
        <div class="card"><div class="row"><div><small>TEXT SIZE</small><strong>文字サイズ</strong><span>アプリ内の文字を少し大きくできます</span></div><span class="value">${settings.textSize === "large" ? "大きめ" : "標準"}</span></div>${renderSegmentRadios("textSize", settings.textSize, TEXT_SIZE_OPTIONS)}</div>
        <div class="card parity-display-card"><div class="row"><div><small>APPEARANCE</small><strong>明るさ</strong><span>端末に合わせる・ライト・ダークから選べます</span></div><span class="value">${escapeHtml(APPEARANCE_MODE_OPTIONS.find((x) => x.value === settings.appearanceMode)?.label || "端末に合わせる")}</span></div>${renderSegmentRadios("appearanceMode", settings.appearanceMode, APPEARANCE_MODE_OPTIONS)}</div>
        <div class="theme-preview"><i></i><div><small>THEME</small><strong>配色</strong><span>prototypeのシンプル配色を含め、利用者が選べます</span></div></div>
        ${renderThemeOptions(settings.colorTheme)}
        <p class="note">配色を変えても、画面レイアウトと情報の意味は変わりません。情報の意味は色だけに依存させません。</p>
      </section>

      <section class="group"><p class="group-title">PROFILE</p>
        <details class="disclosure"><summary><span><small>OPTIONAL PROFILE</small><strong>振り返りプロフィール</strong><span>一度設定し、必要な画面で使い回す任意情報</span></span><i>⌄</i></summary><div class="disclosure-body">
          <div class="boundary"><strong>数値結果には使いません。</strong> 身長・体重・年齢帯・性別・経験・目的を12部位の数値や安全判断の係数にしません。</div>
          <div class="fields two-fields">
            <label class="field"><span>ランニング開始時期・任意</span><input name="runningStartDateOrBand" maxlength="80" value="${escapeHtml(profile.runningStartDateOrBand || "")}" placeholder="例：2026年春、3か月前"><small>振り返り・相談時の文脈として保存</small></label>
            <label class="field"><span>走ることへの慣れ・任意</span><select name="experienceSelfAssessment"><option value=""${!profile.experienceSelfAssessment ? " selected" : ""}>未設定</option>${["始めたばかり","まだ慣れていない","少し慣れてきた","自分なりに継続している"].map((x) => `<option value="${escapeHtml(x)}"${profile.experienceSelfAssessment === x ? " selected" : ""}>${escapeHtml(x)}</option>`).join("")}</select><small>数値の補正には使いません</small></label>
          </div>
          <div class="sub-section-head" style="margin-top:12px"><small>GOAL</small><strong>記録を続ける主な目的・任意</strong></div>
          <div class="goal-grid">${goals.map((goal) => `<label><input type="checkbox" name="runningGoalTags" value="${escapeHtml(goal)}"${goalValues.has(goal) ? " checked" : ""}><span>${escapeHtml(goal)}</span></label>`).join("")}</div>
          <details class="subdetails"><summary><span><strong>身体に関する任意情報</strong><small>必要な場合だけ入力</small></span><span>⌄</span></summary><div class="subdetails-body"><div class="fields two-fields">
            <label class="field"><span>身長（cm）</span><input name="profileHeightCm" type="number" inputmode="decimal" min="100" max="230" step="0.1" value="${escapeHtml(profile.heightCm ?? "")}"></label>
            <label class="field"><span>体重（kg）</span><input name="profileWeightKg" type="number" inputmode="decimal" min="25" max="180" step="0.1" value="${escapeHtml(profile.weightKg ?? "")}"></label>
            <label class="field"><span>年齢帯</span><select name="profileAgeBand"><option value="">未設定・回答しない</option>${PROFILE_AGE_BAND_OPTIONS.map((item) => `<option value="${escapeHtml(item.key)}"${item.key === profile.ageBand ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>
            <label class="field"><span>性別関連入力</span><select name="profileSex"><option value="">未設定・回答しない</option><option value="male"${profile.sex === "male" ? " selected" : ""}>男性区分</option><option value="female"${profile.sex === "female" ? " selected" : ""}>女性区分</option></select></label>
          </div><p class="note">すべて任意です。個人補正、診断、性別判定には使いません。</p></div></details>
          <details class="subdetails"><summary><span><strong>保存シューズ</strong><small>Recordで次回も選べる名称</small></span><span>⌄</span></summary><div class="subdetails-body">${renderSavedShoes(settings)}<p class="visually-hidden">保存候補から削除しても、過去記録に保存されたシューズ情報は変わりません。</p></div></details>
          <div class="action-row"><button type="submit" class="primary">プロフィールと表示を保存</button><button type="button" data-action="reset-journal-settings">標準設定に戻す</button></div>
          <p class="visually-hidden">GPXファイルは端末内で解析し、外部サーバーへ自動送信しません。</p><input type="hidden" name="externalLinkDisplay" value="${escapeHtml(settings.externalLinkDisplay)}">
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
        <div class="action-row"><a href="#/privacy">データの扱いを確認 <span style="margin-left:8px">›</span></a></div>
      </div></details>
    </section>

    <section class="group"><p class="group-title">ABOUT</p><details class="disclosure"><summary><span><small>ABOUT RUNLOAD</small><strong>このアプリについて</strong><span>目的と扱わない範囲</span></span><i>⌄</i></summary><div class="disclosure-body"><div class="about-grid">
      <div><small>目的</small><strong>初心者ランナーが、自分の記録を理解し自分で判断するための材料を整理する</strong></div>
      <div><small>扱わないこと</small><strong>診断、処方、傷害リスク、安全性、走行可否の自動判断</strong></div>
      <div><small>データ</small><strong>新アプリ公開後に作成した記録だけを対象とする</strong></div>
      <div><small>現在の段階</small><strong>リリース前正規版。スマートフォンUI/UXを仕上げています</strong></div>
    </div></div></details></section>
  </div>`;
}

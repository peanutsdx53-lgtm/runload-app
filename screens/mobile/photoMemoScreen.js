import { PHOTO_MEMO_MAX_COUNT, PHOTO_MEMO_MAX_DIMENSION, PHOTO_MEMO_MAX_BYTES } from "../../ui/mobilePhotoMemoStore.js";

function megabytes(bytes) {
  return `${Math.round((Number(bytes) / 1_000_000) * 10) / 10}MB`;
}

export function renderPhotoMemoScreen() {
  return `<div class="screen screen-layout screen-layout--mobile-tool mobile-tool-screen mobile-photo-memo-screen" data-mobile-photo-memo>
    <section class="mobile-tool-head">
      <p class="eyebrow">SMARTPHONE TOOL</p>
      <h1>写真メモ</h1>
      <p>その場の様子を、自分で撮影・選択した写真と短いメモで残します。</p>
    </section>
    <form class="mobile-tool-card mobile-photo-memo-form" data-mobile-photo-memo-form>
      <div class="mobile-tool-card__lead"><div><small>写真</small><strong>カメラまたは写真ライブラリから選択</strong></div></div>
      <label class="mobile-photo-memo-picker">
        <span>写真を選ぶ</span>
        <input type="file" accept="image/*" data-mobile-photo-memo-file>
      </label>
      <div class="mobile-photo-memo-preview" data-mobile-photo-memo-preview hidden>
        <img alt="保存前の写真プレビュー" data-mobile-photo-memo-preview-image>
        <div><strong data-mobile-photo-memo-preview-name>選択した写真</strong><span data-mobile-photo-memo-preview-size></span></div>
      </div>
      <label class="mobile-tool-field"><span>メモ</span><textarea name="note" rows="3" maxlength="160" placeholder="例：折り返し地点の路面"></textarea></label>
      <p class="mobile-tool-form-status" data-mobile-photo-memo-status aria-live="polite"></p>
      <button type="submit" class="primary mobile-tool-save" data-mobile-photo-memo-save disabled>写真メモを保存</button>
      <p class="mobile-photo-memo-limit">最大${PHOTO_MEMO_MAX_COUNT}件。保存時に長辺${PHOTO_MEMO_MAX_DIMENSION}px以下・${megabytes(PHOTO_MEMO_MAX_BYTES)}以下へ調整します。</p>
    </form>
    <section class="mobile-tool-history" aria-labelledby="mobile-photo-history-title">
      <div class="mobile-tool-section-head"><div><small>最近の記録</small><h2 id="mobile-photo-history-title">最近の写真メモ</h2></div></div>
      <div class="mobile-photo-memo-history" data-mobile-photo-memo-history><p class="mobile-tool-history__empty">写真メモを読み込んでいます。</p></div>
    </section>
    <p class="mobile-tool-local-note">写真とメモは、この端末のブラウザ内にのみ保存します。自動送信はしません。ブラウザの保存データを削除すると写真も削除されます。</p>
  </div>`;
}

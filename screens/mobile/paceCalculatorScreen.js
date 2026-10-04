export function renderPaceCalculatorScreen() {
  return `<div class="screen screen-layout screen-layout--mobile-tool mobile-tool-screen mobile-pace-tool" data-mobile-pace-tool>
    <section class="mobile-tool-head">
      <p class="eyebrow">SMARTPHONE TOOL</p>
      <h1>ペース換算</h1>
      <p>距離と目標時間から、平均ペースと通過目安を確認します。</p>
    </section>

    <form class="mobile-tool-card mobile-pace-form" data-mobile-pace-form>
      <div class="mobile-tool-card__lead"><div><small>INPUT</small><strong>距離と目標時間</strong></div></div>

      <div class="mobile-pace-presets" aria-label="距離の候補">
        <button type="button" data-pace-distance="3">3km</button>
        <button type="button" data-pace-distance="5">5km</button>
        <button type="button" data-pace-distance="10">10km</button>
        <button type="button" data-pace-distance="21.0975">ハーフ</button>
      </div>

      <label class="mobile-tool-field"><span>距離</span><span class="mobile-pace-input-with-unit"><input name="distance" type="number" min="0.1" max="100" step="0.01" inputmode="decimal" value="5" required><b>km</b></span></label>

      <fieldset class="mobile-pace-time-fieldset">
        <legend>目標時間</legend>
        <div class="mobile-pace-time-grid">
          <label><span>時間</span><input name="hours" type="number" min="0" max="23" step="1" inputmode="numeric" value="0"></label>
          <label><span>分</span><input name="minutes" type="number" min="0" max="59" step="1" inputmode="numeric" value="35"></label>
          <label><span>秒</span><input name="seconds" type="number" min="0" max="59" step="1" inputmode="numeric" value="0"></label>
        </div>
      </fieldset>

      <p class="mobile-tool-form-status" data-mobile-pace-status aria-live="polite"></p>
      <button type="submit" class="primary mobile-tool-save">換算する</button>
    </form>

    <section class="mobile-pace-result" data-mobile-pace-result hidden aria-live="polite">
      <div class="mobile-tool-section-head"><div><small>RESULT</small><h2>換算結果</h2></div></div>
      <div class="mobile-pace-summary">
        <article><small>平均ペース</small><strong data-mobile-pace-average>--</strong><span>/km</span></article>
        <article><small>平均速度</small><strong data-mobile-pace-speed>--</strong><span>km/h</span></article>
      </div>
      <div class="mobile-pace-splits">
        <h3>通過目安</h3>
        <div data-mobile-pace-splits></div>
      </div>
    </section>

    <p class="mobile-tool-local-note">この換算結果は目安です。記録や研究計算には自動反映しません。</p>
  </div>`;
}

import { bindRestoreSourceGuard } from "./interactions/browserUtilities.js";
bindRestoreSourceGuard();
import "./desktopRofJPresentation.js";
import "./desktopFirstUse.js";
import "./desktopHomeWorkspace.js";
import "./desktopHistoryWorkspace.js";
import "./desktopBodyTimelineWorkspace.js";

// W1 display-only cleanup. The plan route and saved plan objects remain intact
// for the later compatibility wave; no data or storage keys are changed.
function tidyW1DesktopHome() {
  const root = document.querySelector('#app .home-desktop[data-pc-home-enhanced="true"]');
  if (!root) return;
  // One prominent record action already exists in the main hero.
  root.querySelector('.pc-home-heading__action')?.remove();
  // Avoid repeating the very same destination in the recent-record empty card.
  root.querySelectorAll('.pc-home-rail__cards a[href^="#/record-input"]').forEach((link) => link.remove());
  const intro = root.querySelector('.pc-home-heading p:not(.eyebrow)');
  if (intro && intro.textContent !== '記録と結果を確認し、必要な情報を比較できます。') {
    intro.textContent = '記録と結果を確認し、必要な情報を比較できます。';
  }
  const sectionTitle = root.querySelector('.pc-home-rail .section-head h2');
  if (sectionTitle && sectionTitle.textContent !== '最近の記録') sectionTitle.textContent = '最近の記録';
  // The earlier workspace enhancer inserts the same label as a small heading.
  // Keep one readable section title instead of a visually duplicated pair.
  if (sectionTitle) sectionTitle.parentElement?.querySelector('small')?.remove();
  root.querySelectorAll('a[href^="#/plan"],a[href^="#/departure-check"],a[href^="#/pace-tool"]').forEach((link) => link.closest(".card,.row")?.remove() || link.remove());
  root.querySelectorAll('.pc-home-rail__cards article.card').forEach((card) => {
    if (card.querySelector('.card-head small')?.textContent?.trim() === '次の予定') card.remove();
  });
  root.querySelectorAll('.pc-home-shortcuts a[href^="#/history"]').forEach((link) => link.remove());
  // Comparison now has its own PC-A primary-navigation destination.
  root.querySelectorAll('.pc-home-shortcuts a[href^="#/simulation"]').forEach((link) => link.remove());
  const overviewTitle = root.querySelector('.pc-home-overview .section-head h2');
  if (overviewTitle && overviewTitle.textContent !== '補助機能') overviewTitle.textContent = '補助機能';
  const overviewText = root.querySelector('.pc-home-overview .section-head > p');
  if (overviewText && overviewText.textContent !== 'コース設定や共有用の整理へ進めます。') overviewText.textContent = 'コース設定や共有用の整理へ進めます。';
}
const w1DesktopRoot = document.getElementById('app');
if (w1DesktopRoot) new MutationObserver(tidyW1DesktopHome).observe(w1DesktopRoot, {childList:true, subtree:true});
queueMicrotask(tidyW1DesktopHome);

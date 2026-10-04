import { escapeHtml } from "../../ui/commonComponents.js";
import { syncAchievements } from "../../ui/mobileAchievements.js";

function tierLabel(tier) {
  return ({ bronze: "Bronze", silver: "Silver", gold: "Gold" })[tier] || "Achievement";
}

function progressText(achievement) {
  const value = achievement.kind === "distance" || achievement.kind === "energy"
    ? Math.round(achievement.value * 10) / 10
    : Math.floor(achievement.value);
  const unit = achievement.kind === "distance" ? " km" : achievement.kind === "energy" ? " kcal" : "";
  return `${value}${unit} / ${achievement.target}${unit}`;
}

function stateLabel(achievement) {
  if (achievement.unlocked) return "達成";
  if (achievement.progress > 0) return "進行中";
  return "未着手";
}

function renderAchievement(achievement) {
  const state = stateLabel(achievement);
  const progress = Math.round(achievement.progress * 100);
  return `<article class="achievement-card achievement-card--${escapeHtml(achievement.tier)}${achievement.unlocked ? " is-unlocked" : achievement.progress > 0 ? " is-progress" : " is-locked"}">
    <div class="achievement-card__medal" aria-hidden="true">${achievement.unlocked ? "🏆" : achievement.progress > 0 ? "◐" : "○"}</div>
    <div class="achievement-card__copy"><small>${escapeHtml(tierLabel(achievement.tier))}</small><strong>${escapeHtml(achievement.title)}</strong><span>${escapeHtml(achievement.short)}</span></div>
    <div class="achievement-card__state"><b>${escapeHtml(state)}</b><span>${escapeHtml(achievement.unlocked ? "取得済み" : progressText(achievement))}</span><span class="achievement-progress" aria-hidden="true"><i style="--progress:${progress}%"></i></span></div>
  </article>`;
}

function renderNextAchievement(achievement) {
  if (!achievement) return "";
  const progress = Math.round(achievement.progress * 100);
  return `<section class="achievement-next" aria-label="次の実績">
    <div><small>NEXT</small><strong>${escapeHtml(achievement.title)}</strong><span>${escapeHtml(progressText(achievement))}</span></div>
    <div class="achievement-next__meter" aria-label="進捗 ${progress}%"><span><i style="--progress:${progress}%"></i></span><b>${progress}%</b></div>
  </section>`;
}

export function renderAchievementsScreen({ services }) {
  const achievements = syncAchievements(services);
  const unlocked = achievements.filter((item) => item.unlocked)
    .sort((a, b) => String(b.unlockedAt).localeCompare(String(a.unlockedAt)));
  const inProgress = achievements.filter((item) => !item.unlocked && item.progress > 0)
    .sort((a, b) => b.progress - a.progress || a.target - b.target);
  const notStarted = achievements.filter((item) => !item.unlocked && item.progress <= 0);
  const next = inProgress[0] || notStarted[0] || null;
  return `<div class="screen screen--achievements screen-layout secondary-derived-screen">
    <header class="secondary-derived-head"><a class="secondary-derived-back" href="#/more">← その他へ戻る</a><strong>実績</strong><span aria-hidden="true"></span></header>
    <div class="secondary-derived-body">
      <section class="achievement-hero"><div><small>ACHIEVEMENTS</small><h1>実績</h1></div><strong>${unlocked.length}<span> / ${achievements.length}</span></strong></section>
      ${renderNextAchievement(next)}
      <p class="achievement-policy">記録・予定・休養など、保存された事実を対象にします。</p>
      ${inProgress.length ? `<section class="achievement-section"><header><strong>進行中</strong><span>${inProgress.length}</span></header><div class="achievement-list">${inProgress.map(renderAchievement).join("")}</div></section>` : ""}
      <section class="achievement-section"><header><strong>達成済み</strong><span>${unlocked.length}</span></header><div class="achievement-list">${unlocked.length ? unlocked.map(renderAchievement).join("") : '<div class="achievement-empty"><strong>取得済み実績はありません</strong><span>記録を保存すると自動で反映します。</span></div>'}</div></section>
      ${notStarted.length ? `<details class="achievement-locked"><summary>未着手の実績 <span>${notStarted.length}</span></summary><div class="achievement-list">${notStarted.map(renderAchievement).join("")}</div></details>` : ""}
    </div>
  </div>`;
}

import { escapeHtml } from "../ui/commonComponents.js";
import { syncAchievements } from "../ui/mobileAchievements.js";

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

function renderAchievement(achievement) {
  const state = achievement.unlocked ? "取得済み" : progressText(achievement);
  return `<article class="achievement-card achievement-card--${escapeHtml(achievement.tier)}${achievement.unlocked ? " is-unlocked" : " is-locked"}">
    <div class="achievement-card__medal" aria-hidden="true">${achievement.unlocked ? "🏆" : "○"}</div>
    <div class="achievement-card__copy"><small>${escapeHtml(tierLabel(achievement.tier))}</small><strong>${escapeHtml(achievement.title)}</strong><span>${escapeHtml(achievement.short)}</span></div>
    <div class="achievement-card__state"><b>${escapeHtml(state)}</b><span class="achievement-progress" aria-hidden="true"><i style="--progress:${Math.round(achievement.progress * 100)}%"></i></span></div>
  </article>`;
}

export function renderAchievementsScreen({ services }) {
  const achievements = syncAchievements(services);
  const unlocked = achievements.filter((item) => item.unlocked);
  const locked = achievements.filter((item) => !item.unlocked);
  return `<div class="screen screen--achievements screen-layout secondary-derived-screen">
    <header class="secondary-derived-head"><a class="secondary-derived-back" href="#/more">← その他へ戻る</a><strong>実績</strong><span aria-hidden="true"></span></header>
    <div class="secondary-derived-body">
      <section class="achievement-hero"><div><small>ACHIEVEMENTS</small><h1>実績</h1></div><strong>${unlocked.length}<span> / ${achievements.length}</span></strong></section>
      <p class="achievement-policy">速さだけでなく、記録・予定・休養・振り返りも対象です。</p>
      <section class="achievement-list" aria-label="取得済み実績">${unlocked.length ? unlocked.map(renderAchievement).join("") : '<div class="achievement-empty"><strong>取得済み実績はありません</strong><span>記録を保存すると自動で反映します。</span></div>'}</section>
      ${locked.length ? `<details class="achievement-locked"><summary>未取得の実績 <span>${locked.length}</span></summary><div class="achievement-list">${locked.map(renderAchievement).join("")}</div></details>` : ""}
    </div>
  </div>`;
}

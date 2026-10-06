import assert from "node:assert/strict";
import fs from "node:fs";
import { renderHomeScreen as renderDesktopHome } from "../screens/desktop/homeScreen.js";
import { renderPlatformShell as renderDesktopShell } from "../ui/desktopAppShell.js";
import { buildPersonalChallenge } from "../ui/mobileHomeExperience.js";

function servicesFor(record) {
  const experience = record ? { record, feedback: {} } : null;
  return {
    workflows: { records: { loadLatestExperience: () => experience, loadAllExperiences: () => experience ? [experience] : [] } },
    storage: {
      draft: { load: () => null },
      plans: { loadAll: () => [] },
      records: { loadAll: () => record ? [record] : [] },
      courses: { loadAll: () => [] },
      selfUnderstandingThreads: { loadAll: () => [] },
    },
    fatigue: { summarizeRun: () => null },
  };
}

{
  const record = {
    id: "carried-next-check",
    date: "2026-10-04",
    activityType: "run",
    distanceKm: 5,
    durationMinutes: 30,
    reflectionContext: { nextCheckPoint: "左膝の違和感を確認" },
  };
  const html = renderDesktopHome({ services: servicesFor(record) });
  assert.match(html, /前回から引き継いだ内容/);
  assert.match(html, /左膝の違和感を確認/);
  assert.match(html, /10月4日の記録で自分が残した内容/);
}

{
  const record = {
    id: "current-reflection",
    date: "2026-10-04",
    activityType: "run",
    distanceKm: 5,
    durationMinutes: 30,
    reflectionContext: { postRunReflection: "後半で呼吸が乱れた" },
  };
  record.date = "2026-10-26";
  const challenge = buildPersonalChallenge(servicesFor(record), { now: new Date(2026, 9, 26, 12, 0, 0, 0) });
  assert.equal(challenge.id, "reflection-2");
  assert.equal(challenge.value, 1, "current reflection data must count toward the mobile Home reflection challenge");
}

{
  const record = {
    id: "carried-next-check-reflection",
    date: "2026-10-04",
    activityType: "run",
    distanceKm: 5,
    durationMinutes: 30,
    reflectionContext: { nextCheckPoint: "次回は序盤のペースを見る" },
  };
  record.date = "2026-10-26";
  const challenge = buildPersonalChallenge(servicesFor(record), { now: new Date(2026, 9, 26, 12, 0, 0, 0) });
  assert.equal(challenge.id, "reflection-2");
  assert.equal(challenge.value, 1, "carried next-check data must remain valid for the mobile Home reflection challenge");
}

{
  const shell = renderDesktopShell({
    currentScreen: "home",
    currentLocation: { screen: "home", parameters: new URLSearchParams() },
    screenContent: '<section class="screen screen--home screen-layout--home"></section>',
    hasResult: false,
    guide: { open: false },
    onboardingMarkup: "",
  });
  assert.match(shell, /<nav class="primary-navigation" aria-label="主な機能">/, "desktop Home must retain the approved left primary navigation");
  assert.match(shell, /data-navigation-screen="home" aria-current="page"/, "desktop Home navigation must mark Home current");
}

{
  const sharedCss = fs.readFileSync(new URL("../styles/screen-layout-base.css", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles/desktop-home-layout.css", import.meta.url), "utf8");
  for (const contract of [
    /--thread:\s*var\(--color-model\)/,
    /--surface2:\s*var\(--color-surface-muted\)/,
  ]) assert.match(sharedCss, contract, `shared screen-layout visual contract missing: ${contract}`);
  for (const contract of [
    /\.screen-layout--home \.marker::before/,
    /\.screen-layout--home \.carry/,
    /\.screen-layout--home \.card-link/,
    /\.screen-layout--home \.section-head h2[\s\S]*margin:\s*3px 0 0/,
    /\.screen-layout--home \.card[\s\S]*border:\s*1px solid var\(--line\)/,
  ]) assert.match(css, contract, `desktop Home visual contract missing: ${contract}`);
}

console.log("homeBaselineParity.test.mjs: PASS");

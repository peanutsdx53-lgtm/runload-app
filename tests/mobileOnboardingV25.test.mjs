import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

const onboarding = await import("../ui/mobileOnboarding.js");

assert.equal(onboarding.shouldOpenMobileOnboarding({}, { mobile: false }), false, "desktop must not be blocked by mobile onboarding");
assert.equal(onboarding.shouldOpenMobileOnboarding({}, { mobile: true }), true, "new mobile users require onboarding");

const completed = onboarding.withMobileOnboardingComplete({ appearanceMode: "dark" }, { acceptedAt: "2026-09-30T00:00:00.000Z" });
assert.equal(completed.appearanceMode, "dark", "completion must preserve existing settings");
assert.equal(completed.mobileOnboardingVersionSeen, onboarding.MOBILE_ONBOARDING_VERSION);
assert.equal(completed.termsAcceptedVersion, onboarding.TERMS_VERSION);
assert.equal(completed.termsAcceptedAt, "2026-09-30T00:00:00.000Z");
assert.equal(onboarding.shouldOpenMobileOnboarding(completed, { mobile: true }), false, "completed current onboarding must not reopen automatically");

const markup = onboarding.renderMobileOnboarding({ open: true, alreadyAccepted: false });
assert.equal((markup.match(/data-onboarding-step=/g) || []).length, 4, "onboarding must stay at four concise steps");
assert.match(markup, /利用規約に同意し、データの扱いを確認しました/);
assert.match(markup, /アプリ一覧＋記録概要/);
assert.doesNotMatch(markup, /5 TABS|下のナビゲーション/);
assert.match(markup, /#\/terms/);
assert.match(markup, /#\/privacy/);
assert.match(markup, /data-onboarding-complete disabled/);

const app = read("app.js");
assert.match(app, /shouldOpenMobileOnboarding/);
assert.match(app, /\["terms", "privacy"\]\.includes\(location\.screen\)/, "legal documents must be viewable before acceptance");
assert.match(app, /withMobileOnboardingComplete/);

const terms = read("screens/termsScreen.js");
assert.match(terms, /医療・安全に関する位置づけ/);
assert.match(terms, /法令により制限または免除できない責任/);

const settings = read("screens/settingsScreen.js");
assert.match(settings, /reopen-onboarding/);
assert.match(settings, /利用規約/);
assert.match(settings, /プライバシー/);

const version = read("ui/appVersionStatus.js").match(/APP_VERSION = "([^"]+)"/)?.[1] || "";
assert.match(version, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
const sw = read("service-worker.js");
assert.match(sw, new RegExp(`running-record-app-runtime-${version.replaceAll(".", "\\.")}`));
for (const asset of ["./ui/mobileOnboarding.js", "./screens/termsScreen.js", "./styles/mobile-onboarding.css"]) {
  assert.ok(sw.includes(`"${asset}"`), `service worker must precache ${asset}`);
}

console.log("mobileOnboardingV25.test.mjs: PASS");

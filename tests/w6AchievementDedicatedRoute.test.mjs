import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {resolveScreenContextNavigation} from "../ui/screenArchitecture.js";

const read=(file)=>fs.readFileSync(file,"utf8");
const home=read("screens/mobile/homeScreen.js");
const history=read("screens/mobile/historyScreen.js");
const page=read("screens/mobile/achievementsScreen.js");
const activeHome=home.slice(home.indexOf("function renderW1MobileHome("),home.indexOf("// Retained only for independent historical tests"));

test("W6 achievements get a direct dedicated header link, not a home card or history action",()=>{
  assert.match(activeHome,/w1-mobile-achievements-link/);
  assert.match(activeHome,/href="#\/achievements"/);
  assert.match(activeHome,/表示を編集/);
  assert.doesNotMatch(activeHome,/renderOverviewAchievements|mobile-home-overview-card--achievement/);
  assert.doesNotMatch(history,/achievements|実績/);
  assert.match(page,/href="#\/home">← ホームへ戻る/);
  assert.deepEqual(resolveScreenContextNavigation("achievements",{parameters:new URLSearchParams()}),{title:"実績",backHref:"#/home",backLabel:"ホーム"});
});

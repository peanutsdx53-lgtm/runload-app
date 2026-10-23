import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {renderPrimaryNavigation,resolveCurrentPrimaryScreen} from "../ui/appShell.js";
const css=fs.readFileSync(new URL("../styles/mobile-home-responsive.css",import.meta.url),"utf8");
const screens=["home","record-input","exploration-tree","history","settings"];
for(const currentScreen of ["home","result","exploration-tree","history","settings"]){
 test("single shared five-destination phone navigation from "+currentScreen,()=>{
  const html=renderPrimaryNavigation({currentScreen,currentLocation:{parameters:new URLSearchParams()},w1Mobile:true,hasResult:true});
  const names=[...html.matchAll(/data-navigation-screen="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(names,screens);
  assert.equal((html.match(/class="primary-navigation__link/g)||[]).length,5);
  assert.match(html,/aria-label="主な機能"/);
 });
}
test("phone Reading linked from exploration keeps the Explore selected state",()=>{
 assert.equal(resolveCurrentPrimaryScreen("reading",{parameters:new URLSearchParams({origin:"exploration-tree"})}),"exploration-tree");
});
test("narrow CSS keeps five destinations in one grid row rather than two",()=>{
 const policy=css.slice(css.indexOf("Exploration WIP: keep five mobile destinations"));
 assert.ok(policy.length>900);
 assert.match(policy,/@media screen and \(max-width:350px\)/);
 assert.match(policy,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
 assert.match(policy,/grid-template-rows:1fr!important/);
 assert.match(policy,/max-width:279px/);
 assert.match(policy,/overflow-x:auto!important/);
 assert.match(policy,/minmax\(56px,1fr\)/);
});

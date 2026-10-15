import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = name => fs.readFileSync(new URL("../"+name,import.meta.url),"utf8");
test("B05: canonical mobile Home swap is the only mechanism",()=>{
  const owner=read("ui/mobileHomeGridUtilities.js");
  const drop=read("ui/mobileHomeDropCoordinator.js");
  const scroll=read("ui/mobileHomeEditScroll.js");
  assert.match(owner,/export function swapMobileHomeSiblingElements\(/);
  assert.equal(owner.match(/createComment\(markerLabel\)/g)?.length,1);
  for(const caller of [drop,scroll]) {
    assert.match(caller,/swapMobileHomeSiblingElements,/);
    assert.doesNotMatch(caller,/function swapDomPositions\s*\(/);
  }
  assert.match(drop,/swapMobileHomeSiblingElements\(source, target, "mobile-home-owned-swap"\)/);
  assert.match(scroll,/swapMobileHomeSiblingElements\(source, target, "mobile-home-icon-swap"\)/);
});
test("B05: platform-specific GPX renderers keep a single stable event interface",()=>{
  const mobile=read("screens/mobile/gpxAnalysisScreen.js");
  const desktop=read("screens/desktop/gpxAnalysisScreen.js");
  const ids=s=>[...s.matchAll(/\bid="([a-z][a-z0-9-]+)"/gi)].map(m=>m[1]).sort();
  assert.deepEqual(ids(mobile),ids(desktop));
});
test("B05: full and short date formatters have different contracts",async()=>{
  const {formatLocalDate}=await import("../ui/recordPresentation.js");
  const {formatShortLocalDate}=await import("../shared/textUtilities.js");
  assert.equal(formatLocalDate("2026-10-11"),"2026年10月11日");
  assert.equal(formatShortLocalDate("2026-10-11"),"10月11日");
  assert.notEqual(formatLocalDate(""),formatShortLocalDate(""));
});
test("B05: all 113 stylesheets have loader and service worker owners",()=>{
  const css=fs.readdirSync(new URL("../styles/",import.meta.url)).filter(x=>x.endsWith(".css"));
  const loader=read("ui/platformStyles.js"),sw=read("service-worker.js"),html=read("index.html");
  assert.equal(css.length,113);
  for(const name of css){
    const ref="./styles/"+name;
    assert.ok(loader.includes('"'+ref+'"')||html.includes(ref),"unowned "+name);
    assert.ok(sw.includes('"'+ref+'"'),"uncached "+name);
  }
});

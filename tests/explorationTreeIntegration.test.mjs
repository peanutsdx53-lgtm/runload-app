import test from "node:test";
import assert from "node:assert/strict";
import {TREE_CATEGORIES,TREE_TOPICS,buildTreeView,resolveResultExplorationEntry} from "../ui/explorationTreeData.js";
import {renderExplorationTreeScreen} from "../screens/explorationTreeScreen.js";
import {resolveScreenContextNavigation} from "../ui/screenArchitecture.js";

function services(record=null,rof=null,safetyRoute="normal",articles=[]){
 const exp=record?{record,supportDecision:{route:safetyRoute}}:null;
 return {workflows:{records:{
  loadLatestExperience:()=>exp,
  loadExperience:(id)=>record?.id===id?exp:null,
 }},fatigue:{summarizeRun:()=>rof},column:{list:()=>articles}};
}
const run={id:"run-1",activityType:"run",date:"2026-10-23",distanceKm:0,durationMinutes:24,environmentContext:{temperatureC:0}};

test("seven navigable fields and twenty-eight nonduplicate topic IDs",()=>{
 assert.equal(TREE_CATEGORIES.length,7);
 assert.equal(TREE_TOPICS.length,28);
 assert.equal(new Set(TREE_TOPICS.map(t=>t.id)).size,28);
});
test("no record is an explicit free exploration state",()=>{
 const view=buildTreeView(services());
 assert.equal(view.record,null);
 assert.deepEqual(Object.keys(view.highlights),[]);
});
test("saved valid zero remains numeric, not missing",()=>{
 const view=buildTreeView(services(run,{pre:0,post:0,delta:0}));
 assert.equal(view.rof.pre,0);
 assert.equal(view.rof.post,0);
 assert.equal(view.rof.delta,0);
 assert.equal(view.record.distanceKm,0);
 assert.equal(view.record.durationMinutes,24);
 assert.equal(view.highlights["03-03"].includes("暑熱リスク"),true);
});
test("ineligible subjective results remain null",()=>{
 const view=buildTreeView(services(run,{pre:null,post:null,delta:null}));
 assert.equal(view.rof.pre,null);
 assert.equal(view.highlights["04-01"],undefined);
});
test("support-priority route suppresses normal glow",()=>{
 const view=buildTreeView(services(run,{pre:3,post:4},"support"));
 assert.equal(Object.keys(view.highlights).length,0);
});
test("missing explicit record never silently substitutes latest",()=>{
 const view=buildTreeView(services(run,{pre:3}),"unknown-record");
 assert.equal(view.record,null);
});
test("rest activity is never a running record",()=>{
 const view=buildTreeView(services({...run,activityType:"rest"},{pre:3,post:4}));
 assert.equal(view.record,null);
});
test("unverified articles are not linked",()=>{
 const invalid=[{id:"talk-test-as-subjective-cue",title:"No source",sources:[]}];
 const valid=[{id:"talk-test-as-subjective-cue",title:"Verified existence",sources:[{title:"Source",sourceId:"X"}]}];
 assert.equal(buildTreeView(services(run,null,"normal",invalid)).articles["01-01"],undefined);
 assert.equal(buildTreeView(services(run,null,"normal",valid)).articles["01-01"].id,"talk-test-as-subjective-cue");
});
test("screen is a standard shell child without duplicate header or global nav",()=>{
 const view=renderExplorationTreeScreen({services:services(),context:{parameters:new URLSearchParams()}});
 assert.match(view,/screen--exploration-tree/);
 assert.match(view,/data-et-mobile-page="map"/);
 assert.match(view,/data-et-detail="04-01"/);
 assert.doesNotMatch(view,/<header class="app-header"/);
 assert.doesNotMatch(view,/<nav class="primary-navigation"/);
});
test("existing source-backed Reading is opened inside Explore without a route change",()=>{
 const articles=[{id:"talk-test-as-subjective-cue",title:"Article",summary:"Short summary",body:["Main body"],sources:[{title:"Reference",sourceId:"one"}]}];
 const svc=services(run,{pre:0,post:4},"normal",articles);
 svc.column.findById=id=>articles.find(a=>a.id===id)||null;
 const html=renderExplorationTreeScreen({services:svc,context:{parameters:new URLSearchParams({recordId:"run-1",topic:"01-01"})}});
 assert.match(html,/今回の走り/);
 assert.match(html,/Article/);
 assert.match(html,/Short summary/);
 assert.match(html,/Main body/);
 assert.match(html,/引用元/);
 assert.match(html,/読みものを探す/);
 assert.doesNotMatch(html,/#\/reading\?/);
});
test("mobile tree visibly contains seven tappable colored branches, not a menu-only imitation",()=>{
 const html=renderExplorationTreeScreen({services:services(),context:{parameters:new URLSearchParams()}});
 assert.match(html,/class="et-mini-tree"/);
 assert.match(html,/class="et-mini-lines"/);
 assert.equal((html.match(/class="et-mini-node/g)||[]).length,7);
 assert.equal((html.match(/data-et-topic-list=/g)||[]).length,7);
 assert.match(html,/data-et-mobile-inline-detail/);
 assert.doesNotMatch(html,/data-et-mobile-page="branch-/);
});
test("article source and user data are HTML-escaped",()=>{
 const risky={...run,date:'<svg onload="alert(1)">'};
 const html=renderExplorationTreeScreen({services:services(risky),context:{parameters:new URLSearchParams()}});
 assert.doesNotMatch(html,/<svg onload=/);
 assert.match(html,/&lt;svg/);
});

test("normal verified runs enter Explore; safety and rest remain in original review workflow",()=>{
 const valid=resolveResultExplorationEntry({services:services(run,{pre:0,post:0}),record:run});
 assert.equal(valid.mode,"EXPLORATION");
 assert.match(valid.href,/^#\/exploration-tree\?recordId=run-1&origin=result$/);
 const urgent=resolveResultExplorationEntry({services:services(run,null,"urgent"),record:run});
 assert.equal(urgent.mode,"EXISTING_INTERPRETATION");
 assert.match(urgent.href,/^#\/interpretation-room\?/);
 const review=resolveResultExplorationEntry({services:services(run,null,"review"),record:run});
 assert.equal(review.mode,"EXISTING_INTERPRETATION");
 const missing=resolveResultExplorationEntry({services:services(),record:run});
 assert.equal(missing.mode,"EXISTING_INTERPRETATION");
 const rest=resolveResultExplorationEntry({services:services({...run,activityType:"rest"}),record:{...run,activityType:"rest"}});
 assert.equal(rest.mode,"EXISTING_INTERPRETATION");
});
test("transition preserves selected body region and direct access to existing interpretation",()=>{
 const valid=resolveResultExplorationEntry({services:services(run),record:run,regionId:"BA-DISP-023"});
 assert.match(valid.href,/regionId=BA-DISP-023/);
 const html=renderExplorationTreeScreen({services:services(run),context:{parameters:new URLSearchParams("recordId=run-1&origin=result&regionId=BA-DISP-023")}});
 assert.doesNotMatch(html,/これまでの見比べ画面を開く/);
 assert.doesNotMatch(html,/et-existing-flow/);
 assert.doesNotMatch(html,/#\/interpretation-room\?recordId=run-1/);
});
test("support-priority direct entry displays guidance before the knowledge map",()=>{
 const html=renderExplorationTreeScreen({services:services(run,null,"urgent"),context:{parameters:new URLSearchParams("recordId=run-1&origin=result")}});
 assert.match(html,/et-priority-notice/);
 assert.match(html,/身体の確認を優先/);
 assert.match(html,/安全に関する案内を確認/);
 assert.doesNotMatch(html,/class="et-node is-glowing"/);
});

test("Explore header preserves Result return despite being a primary destination",()=>{
 const fromResult=resolveScreenContextNavigation("exploration-tree",{parameters:new URLSearchParams("recordId=run-1&origin=result")});
 assert.equal(fromResult.backHref,"#/result?recordId=run-1");
 const direct=resolveScreenContextNavigation("exploration-tree",{parameters:new URLSearchParams()});
 assert.equal(direct.backHref,"#/home");
 const article=resolveScreenContextNavigation("reading",{parameters:new URLSearchParams("origin=exploration-tree&recordId=run-1&topic=04-01")});
 assert.match(article.backHref,/#\/exploration-tree\?/);
 assert.match(article.backHref,/topic=04-01/);
});

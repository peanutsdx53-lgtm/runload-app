import test from "node:test";
import assert from "node:assert/strict";
import {TREE_CATEGORIES,TREE_TOPICS,buildTreeView} from "../ui/explorationTreeData.js";
import {renderExplorationTreeScreen} from "../screens/explorationTreeScreen.js";

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
test("record and existing Reading URLs carry the proper return context",()=>{
 const articles=[{id:"talk-test-as-subjective-cue",title:"Article",sources:[{title:"Reference",sourceId:"one"}]}];
 const html=renderExplorationTreeScreen({services:services(run,{pre:0,post:4},"normal",articles),context:{parameters:new URLSearchParams({recordId:"run-1",topic:"01-01"})}});
 assert.match(html,/#\/result\?recordId=run-1/);
 assert.match(html,/origin=exploration-tree/);
 assert.match(html,/#\/reading\?articleId=talk-test-as-subjective-cue/);
});
test("article source and user data are HTML-escaped",()=>{
 const risky={...run,date:'<svg onload="alert(1)">'};
 const html=renderExplorationTreeScreen({services:services(risky),context:{parameters:new URLSearchParams()}});
 assert.doesNotMatch(html,/<svg onload=/);
 assert.match(html,/&lt;svg/);
});

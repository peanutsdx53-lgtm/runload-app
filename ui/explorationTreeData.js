// Exploration Tree draft view-model. No calculation or storage mutation.
export const TREE_CATEGORIES = Object.freeze([
  {id:"01",name:"走りの記録",color:"#2579dc",tint:"#e8f3ff",icon:"▥",x:210,y:146,topics:["距離・時間・ペース","自分が感じた疲れ","過去の走りとの比較","気付きと次の確認"]},
  {id:"02",name:"身体のしくみ",color:"#db8c28",tint:"#fff2df",icon:"♧",x:155,y:355,topics:["足・膝・股関節","姿勢と走る動作","体幹と腕の動き","12部位の参考値の見方"]},
  {id:"03",name:"コースと環境",color:"#16996f",tint:"#e2f9ec",icon:"△",x:475,y:102,topics:["上り坂・下り坂","路面","気温・天候","屋外・室内"]},
  {id:"04",name:"疲れと回復",color:"#b448d1",tint:"#f8e9ff",icon:"♥",x:750,y:255,topics:["疲れの感じ方","筋肉痛・違和感","休養と回復","疲れを考える視点"]},
  {id:"05",name:"暮らしと気持ち",color:"#129b9f",tint:"#e2fbf6",icon:"❧",x:205,y:540,topics:["睡眠","食事・水分","気分・ストレス","日々のコンディション"]},
  {id:"06",name:"走る前後の工夫",color:"#7658dc",tint:"#efebff",icon:"✣",x:510,y:535,topics:["ウォームアップ","走行中の対応","クールダウン・ストレッチ","無理をしない判断"]},
  {id:"07",name:"目的と楽しみ方",color:"#d44a86",tint:"#ffeaf2",icon:"⚑",x:765,y:490,topics:["走る目的","目標との付き合い方","楽しみ方","自分に合う記録の使い方"]}
]);
export const TREE_TOPICS=Object.freeze(TREE_CATEGORIES.flatMap(c=>c.topics.map((name,i)=>Object.freeze({id:c.id+"-"+String(i+1).padStart(2,"0"),name,category:c.id,categoryName:c.name}))));

// Existing Reading IDs are displayed as trial cross-navigation only. This is not a verified
// claim-level mapping, editorial approval, automatic medical advice or new publication.
export const TREE_TRIAL_READING=Object.freeze({
  "01-01":"talk-test-as-subjective-cue",
  "02-04":"regional-three-views",
  "03-01":"grade-and-coverage",
  "03-02":"surface-missingness",
  "03-03":"heat-not-temperature-only",
  "05-01":"sleep-not-hours-only",
  "05-02":"hydration-not-more-is-better",
  "06-03":"cooldown-and-recovery"
});
const finite=v=>typeof v==="number"&&Number.isFinite(v);
export function buildTreeView(services,requestedRecordId=""){
 const records=services?.workflows?.records;
 const experience=requestedRecordId?records?.loadExperience?.(requestedRecordId):records?.loadLatestExperience?.();
 const record=experience?.record?.activityType==="run"?experience.record:null;
 const id=record?.id||"";
 const rof=id?services?.fatigue?.summarizeRun?.(id):null;
 const safety=String(experience?.supportDecision?.route||"unknown").toLowerCase();
 const allowed=Boolean(record)&&safety==="normal";
 const links={};
 const highlight=(key,reason)=>{links[key]=reason;};
 if(allowed){
  if(finite(record.distanceKm)||finite(record.durationMinutes)) highlight("01-01","今回の距離や時間が記録されています");
  if(finite(rof?.pre)||finite(rof?.post)){
   highlight("01-02","有効な主観的疲労の回答があります");
   highlight("04-01","有効な主観的疲労の回答があります");
  }
  if(finite(record?.environmentContext?.temperatureC))highlight("03-03","気温が記録されています（暑熱リスクの推定ではありません）");
 }
 const articles=(services?.column?.list?.()||[]).filter(a=>a?.id&&Array.isArray(a.sources)&&a.sources.some(s=>s?.title&&(s?.url||s?.sourceId)));
 const articleById=new Map(articles.map(a=>[a.id,a]));
 const availableArticle=Object.fromEntries(Object.entries(TREE_TRIAL_READING).filter(([,articleId])=>articleById.has(articleId)).map(([topicId,articleId])=>[topicId,{id:articleId,title:articleById.get(articleId).title}]));
 return Object.freeze({record:id?Object.freeze({id,date:record.date||"",distanceKm:finite(record.distanceKm)?record.distanceKm:null,durationMinutes:finite(record.durationMinutes)?record.durationMinutes:null}):null,
  rof:Object.freeze({pre:finite(rof?.pre)?rof.pre:null,post:finite(rof?.post)?rof.post:null,delta:finite(rof?.delta)?rof.delta:null}),
  safety,allowed,highlights:Object.freeze(links),articles:Object.freeze(availableArticle)});
}


// Transition gate: only ordinary run records enter Explore from Result.
// Every non-normal or unverified state continues to the existing interpretation
// workflow, preserving its support/consult/rest handling while all comparison functions are retained.
export function resolveResultExplorationEntry({ services, record, origin="result", regionId="" }={}) {
 const id=String(record?.id||"");
 const params=new URLSearchParams({recordId:id,origin});
 if(regionId)params.set("regionId",String(regionId));
 const oldHref="#/interpretation-room?"+params.toString();
 const experience=id?services?.workflows?.records?.loadExperience?.(id):null;
 const safety=String(experience?.supportDecision?.route||"unknown").toLowerCase();
 const isEligible=Boolean(id&&record?.activityType==="run"&&experience?.record?.id===id&&safety==="normal");
 return Object.freeze({
  href:isEligible?"#/exploration-tree?"+params.toString():oldHref,
  label:isEligible?"探究ツリーへ":"今回を見比べる",
  mode:isEligible?"EXPLORATION":"EXISTING_INTERPRETATION",
 });
}

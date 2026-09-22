import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderInterpretationRoomV3 } from "../../ui/interpretationRoomPresentationV3.js";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../..");
const outDir=path.join(root,".visual-preview");
fs.mkdirSync(outDir,{recursive:true});

const REGION_IDS=["BA-DISP-014","BA-DISP-015","BA-DISP-016","BA-DISP-018","BA-DISP-019","BA-DISP-021","BA-DISP-023","BA-DISP-024","BA-DISP-025","BA-DISP-027","BA-DISP-028","BA-DISP-029"];
const REGION_LABELS=["股関節部","殿部","大腿前面","大腿後面","膝蓋大腿関節部","脛骨部","下腿後面","足関節部","アキレス腱部","後足部","足底中部・内側縦足弓","前足部"];
function overviewRegions(){
  return REGION_IDS.map((id,index)=>({
    regionId:id,
    primaryRegionId:`R${String(index+1).padStart(2,"0")}`,
    label:REGION_LABELS[index],
    value:[112,101,94,108,103,97,100,105,91,109,102,96][index],
    availability:"AVAILABLE",
    reference:{
      available:true,reference:100,
      value:[112,101,94,108,103,97,100,105,91,109,102,96][index],
      difference:[12,1,-6,8,3,-3,0,5,-9,9,2,-4][index],
      direction:["ABOVE_REFERENCE","REFERENCE_VICINITY","BELOW_REFERENCE","ABOVE_REFERENCE","ABOVE_REFERENCE","BELOW_REFERENCE","REFERENCE_VICINITY","ABOVE_REFERENCE","BELOW_REFERENCE","ABOVE_REFERENCE","ABOVE_REFERENCE","BELOW_REFERENCE"][index],
    },
    previous:{available:false},
  }));
}
function base(selected=false){
  const out={
    schemaVersion:"RUNLOAD_INTERPRETATION_OUTPUT_V3_CANDIDATE",
    target:{recordId:"visual-run",resultRecordId:"visual-result",date:"2026-09-21",activityType:"run",origin:"result",selectedRegionId:selected?"BA-DISP-014":""},
    state:{targetAvailable:true,regional:"AVAILABLE",history:"AVAILABLE",subjective:"PAIR",support:"NORMAL",legacy:false},
    overview:{regions:overviewRegions(),selectionMode:selected?"EXPLICIT":"USER_SELECT",guidanceTokens:["REGIONS_USE_OWN_REFERENCE","NO_CROSS_REGION_RANKING"]},
    selectedRegion:null,
    subjectiveContext:{
      state:"PAIR",
      pre:{available:true,value:4,descriptorType:"EXACT",descriptor:"少し疲れている",lowerAnchor:null,upperAnchor:null},
      post:{available:true,value:6,descriptorType:"EXACT",descriptor:"中程度に疲れている",lowerAnchor:null,upperAnchor:null},
      difference:{eligible:true,value:2,direction:"UP"},
      recentReferences:{pre:null,post:null,delta:null},
      boundaryTokens:["ROF_IS_SUBJECTIVE","ROF_SEPARATE_FROM_REFERENCE100"],
    },
    understanding:{facts:[],boundaryCodes:["NO_DIAGNOSIS","NO_INJURY_RISK","NO_CAUSAL_INFERENCE"]},
    next:{selectionRequired:!selected,primaryAction:null,otherActions:[]},
    advanced:{evidence:{regions:{
      "BA-DISP-014":{construct:"股関節の機械的仕事に基づく部位内の比較値",sources:[{label:"保存結果に保持された基礎資料",role:"速度応答"}]}
    }}},
    safety:{route:"normal",reasons:[],blocks:[],nextActions:[]},
  };
  if(selected){
    out.selectedRegion={
      regionId:"BA-DISP-014",primaryRegionId:"R01",label:"股関節部",value:112,
      referenceComparison:{available:true,reference:100,value:112,difference:12,direction:"ABOVE_REFERENCE"},
      previousComparison:{available:true,recordId:"prev",date:"2026-09-14",previousValue:106,currentValue:112,difference:6,direction:"UP"},
      personalHistory:{comparableCount:3,lastFive:[],referenceDirectionCounts:{above:3,near:0,below:0,unavailable:0}},
      calculationPath:{
        resolutionStatus:"EXACT",resolutionBasis:"VERSION_LOCKED_REGION_ROUTE",activeRoute:"SPEED",
        exposure:{type:"WHOLE_RUN",distanceKm:5,durationMinutes:30,speedMps:2.7777778,segmentCount:0},
        activeInputs:[
          {id:"DISTANCE",value:5,role:"DERIVE_SPEED",source:"engine_input_snapshot"},
          {id:"DURATION",value:30,role:"DERIVE_SPEED",source:"engine_input_snapshot"},
          {id:"SPEED",value:2.7777778,role:"PRIMARY_NUMERIC_ROUTE",source:"persisted_result.exposure"},
        ],
        conditionalInputs:[],
        contextOnlyInputs:[
          {id:"SURFACE",value:[{category:"ASPHALT"}],role:"CONTEXT_ONLY"},
          {id:"GRADE",value:"RECORDED",role:"NOT_ACTIVE_FOR_THIS_REGION"},
        ],
        explanationTokens:["DISTANCE_DURATION_DERIVE_SPEED","SPEED_USED_FOR_REGION"],
      },
    };
    out.next={
      selectionRequired:false,
      primaryAction:{actionId:"simulation",destination:"simulation",parameters:{recordId:"visual-run"},enabled:true},
      otherActions:[
        {actionId:"history",destination:"history",parameters:{recordId:"visual-run"},enabled:true},
        {actionId:"plan",destination:"plan",parameters:{sourceRecordId:"visual-run"},enabled:true},
        {actionId:"reading",destination:"reading",parameters:{recordId:"visual-run"},enabled:true},
        {actionId:"share",destination:"consultation",parameters:{recordId:"visual-run"},enabled:true},
      ],
    };
  }
  return out;
}
function page(output,{dark=false,title=""}={}){
  return `<!doctype html><html lang="ja" class="rl-color-blue${dark?" rl-appearance-dark":""}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="../styles/tokens.css">
<link rel="stylesheet" href="../styles/base.css">
<link rel="stylesheet" href="../styles/interpretation-room-v3.css">
<style>
html,body{min-height:100%;} body{padding:0;margin:0;background:var(--color-paper);}
.visual-shell{width:min(100% - 32px, 980px);margin:0 auto;padding:24px 0 80px;}
.visual-top{position:sticky;top:0;z-index:5;margin:0 -16px 20px;padding:10px 16px;border-bottom:1px solid var(--color-line);background:color-mix(in srgb,var(--color-paper) 94%,transparent);backdrop-filter:blur(10px);}
.visual-top strong{font-size:13px}.visual-top span{display:block;color:var(--color-muted);font-size:11px}
@media(max-width:480px){.visual-shell{width:min(100% - 20px,980px);padding-top:10px}.visual-top{margin:0 -10px 12px;padding:8px 10px}}
</style></head><body><main class="visual-shell"><div class="visual-top"><strong>Interpretation V3 visual audit</strong><span>${title}</span></div>${renderInterpretationRoomV3({output})}</main></body></html>`;
}
const variants=[
  ["overview-light.html",base(false),false,"Overview / Light"],
  ["overview-dark.html",base(false),true,"Overview / Dark"],
  ["selected-light.html",base(true),false,"Selected / Light"],
  ["selected-dark.html",base(true),true,"Selected / Dark"],
];
for(const [file,output,dark,title] of variants) fs.writeFileSync(path.join(outDir,file),page(output,{dark,title}),"utf8");
console.log(JSON.stringify({outDir,files:variants.map(v=>v[0])},null,2));

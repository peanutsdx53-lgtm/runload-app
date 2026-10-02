import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderInterpretationRoom } from '../../ui/interpretationRoomPresentation.js';
const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,'../..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const links=index.split('\n').filter(line=>line.includes('<link rel="stylesheet"')).map(line=>line.replace('href="./','href="../../')).join('\n');
const selectedRegion={regionId:'BA-DISP-014',primaryRegionId:'R01',label:'股関節部',value:101.9,referenceComparison:{available:true,reference:100,value:101.9,difference:1.9,direction:'ABOVE_REFERENCE'},previousComparison:{available:true,recordId:'r0',date:'2026-09-25',previousValue:99.4,currentValue:101.9,difference:2.5,direction:'UP'},personalHistory:{comparableCount:2,lastFive:[{recordId:'r0',date:'2026-09-25',value:99.4,referenceDirection:'REFERENCE_VICINITY'}],referenceDirectionCounts:{above:1,near:1,below:0,unavailable:0}},calculationPath:{resolutionStatus:'EXACT',activeRoute:'SPEED',exposure:{type:'WHOLE_RUN',distanceKm:6,durationMinutes:36,speedMps:2.78},activeInputs:[],conditionalInputs:[],contextOnlyInputs:[],explanationTokens:[]}};
const output={schemaVersion:'INTERPRETATION_OUTPUT_V4',target:{recordId:'r2',date:'2026-10-02',origin:'result',selectedRegionId:'BA-DISP-014'},state:{targetAvailable:true,regional:'AVAILABLE',history:'AVAILABLE',subjective:'PAIR',support:'NORMAL'},runFacts:{distanceKm:6,durationMinutes:36,paceSecondsPerKm:360,postRunReflection:'終盤もフォームを意識できた'},overview:{attention:{counts:{total:12,available:12,unavailable:0,previousComparable:8,previousChanged:2,repeated:0,above:3,near:5,below:4,conditionDifferences:1},groups:[{code:'PREVIOUS_CHANGE',regions:[{regionId:'BA-DISP-014',label:'股関節部',value:101.9,referenceDirection:'ABOVE_REFERENCE',previousDifference:2.5,previousComparison:{available:true,difference:2.5}}]}]}},selectedRegion,subjectiveContext:{state:'PAIR',pre:{available:true,value:3},post:{available:true,value:6},difference:{eligible:true,value:3}},conditions:{differences:[{id:'distanceKm',labelToken:'DISTANCE',previous:5,current:6,delta:1,relationship:'USED_IN_CURRENT_ROUTE'}]},next:{primaryAction:{actionId:'plan',destination:'plan',enabled:true},otherActions:[{actionId:'share',destination:'consultation',enabled:true},{actionId:'simulation',destination:'simulation',enabled:true}]},advanced:{evidence:{regions:{'BA-DISP-014':{construct:'股関節の機械的仕事に基づく部位内Reference-100',sources:[{label:'Fukuchi et al. 2017',role:'速度応答'}]}}}}};
const candidate={kind:'BODY_OBSERVATION_PAIR',threadType:'REGION_OBSERVATION_PAIR',subject:{regionId:'BA-DISP-014',bodyAreaId:'BFR-200-COX'},observation:{label:'股関節部の外側',sensationType:'TIGHTNESS',intensity:2,noticedTiming:'DURING'},row:{regionId:'BA-DISP-014',regionName:'股関節部',value:101.9,referenceDirection:'ABOVE_REFERENCE'}};
const active={id:'t1',type:'REGION_OBSERVATION_PAIR',title:'次の走行でも、股関節部の外側について自分の記録と部位表示を見比べる',subject:{regionId:'BA-DISP-014',bodyAreaId:'BFR-200-COX'},sourceEpisode:{recordId:'r0',date:'2026-09-25',row:{regionName:'股関節部',value:99.4},observation:{sensationType:'DISCOMFORT',intensity:1}},newEpisodes:[{recordId:'r2',date:'2026-10-02',row:{regionName:'股関節部',value:101.9},observation:{sensationType:'TIGHTNESS',intensity:2}}],eligibleEpisodes:[],eligibleCount:2,newCount:1,userState:'WATCHING',hasNewEligibleData:true};
const first={primaryCandidate:candidate,activeThread:null,threads:[],counts:{watching:0,paused:0,newThreadCount:0},targetContext:{}};
const continued={primaryCandidate:null,activeThread:active,threads:[active],counts:{watching:1,paused:0,newThreadCount:1},targetContext:{}};
function shell(body){return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${links}<style>body{margin:0;min-height:100vh;background:var(--color-paper)}#root{min-height:100vh;padding-top:1px;box-sizing:border-box}</style></head><body><main id="root">${body}</main></body></html>`;}
function withStage(html,stage,completion=''){return html.replace('data-v53-stage="focus"',`data-v53-stage="${stage}"${completion?` data-v53-completion="${completion}"`:''}`);}
const variants=[
 ['v53_snapshot_pc_compare.html',false,first,'compare',''],
 ['v53_snapshot_pc_decision.html',false,first,'decision',''],
 ['v53_snapshot_mobile_focus.html',true,first,'focus',''],
 ['v53_snapshot_mobile_decision.html',true,first,'decision',''],
 ['v53_snapshot_pc_active_compare.html',false,continued,'compare',''],
 ['v53_snapshot_pc_saved.html',false,first,'done','saved'],
];
for(const [name,mobile,su,stage,completion] of variants){let body=renderInterpretationRoom({output,selfUnderstanding:su,mobileLayout:mobile}); body=withStage(body,stage,completion); fs.writeFileSync(path.join(dir,name),shell(body));}

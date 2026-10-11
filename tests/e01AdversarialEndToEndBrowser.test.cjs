'use strict';
// New E-01 data-flow attack suite: REAL Chromium parsing with CSP-independent hostile DOM checks.
// Bounded tests: not evidence that every delegated screen renderer is safe.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const ROWKEY='runner-load-app-mobile-walk-jog-records-v1.3';
const ATTACKS=[
  '<img src="https://example.net/collect?source=runload" onerror="window.__xss=1">',
  '<svg onload="window.__xss=1"></svg>',
  '\"><iframe srcdoc="<script>window.__xss=1</script>"></iframe>',
  '<a href="javascript:window.__xss=1">click</a>',
  '\" tabindex=0 onfocus=\"window.__xss=1',
];
function server(){
 const instance=http.createServer(async(req,res)=>{
  try{
   const pathname=new URL(req.url,'http://127.0.0.1').pathname;
   if(pathname==='/__e01_adversarial'){
     res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
     res.end('<!doctype html><html lang="ja"><body><main class="screen-layout--history"><header class="page-head">履歴</header></main><div id="sandbox"></div></body></html>');return;
   }
   const file=path.resolve(ROOT,'.'+decodeURIComponent(pathname));
   if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
   const body=await fs.readFile(file);
   res.writeHead(200,{'content-type':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/plain','cache-control':'no-store'}).end(body);
  }catch{res.writeHead(404).end('Not Found');}
 });
 return new Promise(resolve=>instance.listen(0,'127.0.0.1',()=>resolve({instance,origin:`http://127.0.0.1:${instance.address().port}`})));
}
(async()=>{
 const {instance,origin}=await server();let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
   const context=await browser.newContext({viewport,serviceWorkers:'block'});
   const exfil=[];
   await context.route('**/*',route=>{
     if(route.request().url().startsWith(origin+'/'))return route.continue();
     exfil.push(route.request().url());return route.abort('blockedbyclient');
   });
   try{
    const page=await context.newPage();
    assert.equal((await page.goto(origin+'/__e01_adversarial')).status(),200);
    const errors=await page.evaluate(async({attacks,key,doHistory})=>{
      const problems=[], root=document.getElementById('sandbox');
      const check=(label,expected)=>{
        if(root.querySelector('script,iframe,img[onerror],[onload],[onclick],[onerror],[onfocus],a[href^="javascript:"],input[autofocus]')) problems.push(label+': injected markup');
        if(!root.textContent.includes(expected))problems.push(label+': text missing');
        if(window.__xss)problems.push(label+': code executed');
      };
      const planScreens=await Promise.all([import('/screens/mobile/planScreen.js'),import('/screens/desktop/planScreen.js')]);
      const consultationScreen=await import('/screens/consultationScreen.js');
      const platformHistoryScreens=await Promise.all([import('/screens/mobile/historyScreen.js'),import('/screens/desktop/historyScreen.js')]);
      const platformSettingsScreens=await Promise.all([import('/screens/mobile/settingsScreen.js'),import('/screens/desktop/settingsScreen.js')]);
      const platformCourseScreens=await Promise.all([import('/screens/mobile/courseLibraryScreen.js'),import('/screens/desktop/courseLibraryScreen.js')]);
      const sim=await import('/ui/interactions/simulationInteractions.js');
      const restore=await import('/ui/restorePreviewPresentation.js');
      const {installMobileWalkJogHistoryUi}=await import('/ui/mobileWalkJogHistoryUi.js');
      const form=document.createElement('form');
      form.innerHTML='<input name="distanceKm" value="6"><input name="durationMinutes" value="35"><input name="runningFormat" value="CONTINUOUS_RUN"><input name="sourceConditionJson" value="{}"><input name="courseJson">';
      root.append(form);
      let historyDispose=null;
      for(const attack of attacks){
        // A saved plan's attacker-controlled course name travels through both
        // platform presentation wrappers and the delegated app.js HTML sink.
        const savedPlan={id:'e01-plan',scheduledDate:'2026-10-12',planType:'run',
          plannedSession:{activityType:'run',distanceKm:5,durationMinutes:30,
            course:{name:attack,gradeKnowledge:'UNKNOWN',modelSurfaceClass:'UNKNOWN'}}};
        const services={storage:{plans:{findById:()=>savedPlan,loadAll:()=>[savedPlan]},
          records:{loadAll:()=>[],findById:()=>null},
          selfUnderstandingThreads:{loadAll:()=>[],findById:()=>null}},
          workflows:{records:{loadAllExperiences:()=>[]}}};
        for(const renderer of planScreens){
          root.innerHTML=renderer.renderPlanScreen({services,context:{parameters:new URLSearchParams('planId=e01-plan')}});
          const line=root.querySelector('[data-plan-summary-line]');
          if(!line||line.children.length||!line.textContent.includes(attack))problems.push('plan: unsafe saved course HTML');
          if(window.__xss)problems.push('plan: script executed');
        }
        // Render the three additional delegated screen families for both
        // platform implementations into an actual Chromium DOM, with hostile
        // backup/record/query, shoe, profile and course values at once.
        const storedRecord={id:'e01-record',date:'2026-10-11',createdAt:'2026-10-11T10:00:00Z',
          activityType:'run',distanceKm:5,durationMinutes:30,course:{name:attack},
          reflectionContext:{postRunReflection:attack}};
        const storedExperience={record:storedRecord,feedback:{subjectiveStatus:'deferred'},regionalV2ResultRecord:null};
        const savedCourse={id:'e01-course',name:attack,course:{name:attack}};
        const storedServices={
          workflows:{records:{loadAllExperiences:()=>[storedExperience]},history:{loadUndoEntry:()=>null}},
          storage:{modelResultsRegionalV2:{latestByRecord:()=>new Map()},
            plans:{loadAll:()=>[]},selfUnderstandingThreads:{loadAll:()=>[]},
            settings:{load:()=>({savedShoes:[{id:'e01-shoe',label:attack}]})},
            profile:{load:()=>({runningStartDateOrBand:attack,experienceSelfAssessment:attack,
              heightCm:attack,weightKg:attack,ageBand:attack,runningGoalTags:[attack]})},
            records:{loadAll:()=>[storedRecord]},courses:{loadAll:()=>[savedCourse]},
            draft:{load:()=>null}},fatigue:{summarizeRun:()=>null},
        };
        for(let k=0;k<2;k++){
          root.innerHTML=platformHistoryScreens[k].renderHistoryScreen({services:storedServices,
            context:{parameters:new URLSearchParams('view=records&period=28&anchorDate=2026-10-11')}});
          check('saved-history-platform-'+k,attack);
          root.innerHTML=platformSettingsScreens[k].renderSettingsScreen({services:storedServices,
            context:{parameters:new URLSearchParams('section=data')}});
          check('saved-settings-shoes-platform-'+k,attack);
          root.innerHTML=platformCourseScreens[k].renderCourseLibraryScreen({services:storedServices,
            context:{parameters:new URLSearchParams('')}});
          check('saved-course-platform-'+k,attack);
        }
        // Restored runner record/profile/plan/report strings in the delegated
        // consultation PDF-view template must be inert independently of CSP.
        const current={record:{id:'r1',date:'2026-10-11',activityType:'run',distanceKm:5,
          durationMinutes:31,course:{name:attack}}};
        const earlier={record:{id:'r0',date:'2026-10-09',activityType:'run',distanceKm:5,
          durationMinutes:31,course:{name:'before'}}};
        const consultReport={date:'2026-10-11',recent:[],
          exactBodyObservations:[{label:attack,intensity:3,sensation:attack,lateralityLabel:attack}],
          subjectiveParts:[{label:attack,fatigue:3,discomfort:0}]};
        const consultationServices={
          workflows:{records:{loadAllExperiences:()=>[earlier,current],
            loadExperience:()=>current,loadLatestExperience:()=>current}},
          storage:{plans:{loadAll:()=>[savedPlan]},
            profile:{load:()=>({runningStartDateOrBand:attack,
              experienceSelfAssessment:attack,runningGoalTags:[attack]})},
            selfUnderstandingThreads:{findById:()=>null}},
          consultation:{buildDeterministicConsultation:()=>({regionOptions:[],regionId:'',regional:{}}),
            buildConsultationReport:()=>consultReport},
          fatigue:{summarizeRun:()=>({pre:2,post:5})},
        };
        root.innerHTML=consultationScreen.renderConsultationScreen({services:consultationServices,
          context:{parameters:new URLSearchParams('recordId=r1')}});
        check('consultation-saved-profile-report',attack);
        root.innerHTML=restore.renderRestoreInspection({status:'blocked',issues:[{severity:'BLOCKING',message:attack,itemId:attack}],counts:{},canRestore:false},`file-${attack}.json`);
        check('restore-filename-and-message',attack);
        form.elements.courseJson.value=JSON.stringify({name:attack});
        const comparison=sim.renderSimulationComparisonResult({state:attack,regions:{}},new Map(),true,new FormData(form),{name:attack});
        root.innerHTML=comparison;
        check('comparison-user-course',attack);
        const data={id:'test-e01-safe-id',createdAt:'2026-10-10T00:00:00Z',activityId:attack,
          distanceKm:5,durationMinutes:32,analysis:{segments:[{gaitId:attack,distanceKm:5,durationSeconds:1800,speedKmh:10,
            coverage:{regions:[{regionId:attack,evidenceTier:attack,index:123,outputStatus:'OK'}]}}]}};
        if(!doHistory)continue;
        localStorage.setItem(key,JSON.stringify([data]));
        window.location.hash='#/history?mobileActivity=1';
        if(!historyDispose) historyDispose=installMobileWalkJogHistoryUi();
        window.dispatchEvent(new Event('hashchange'));
        await new Promise(resolve=>setTimeout(resolve,40));
        const display=document.querySelector('[data-mobile-activity-history]');
        if(!display)problems.push('activity: screen not rendered');
        else{
          if(display.querySelector('img,iframe,script,[onload],[onerror],[onfocus],a[href^="javascript:"]'))problems.push('activity: injected markup');
          if(!display.textContent.includes(attack))problems.push('activity: user text not retained');
          if(window.__xss)problems.push('activity: code executed');
        }
      }
      historyDispose?.();
      localStorage.removeItem(key);
      return problems;
    },{attacks:ATTACKS,key:ROWKEY,doHistory:viewport.width<800});
    assert.deepEqual(errors,[],JSON.stringify({viewport,errors}));
    assert.equal(exfil.length,0,`Unexpected external image requests ${JSON.stringify(exfil)}`);
    console.log('E01_ADVERSARIAL_REAL_DOM_PASS',JSON.stringify({viewport,attacks:ATTACKS.length,chains:viewport.width<800?3:2,externalRequests:exfil.length}));
   } finally {await context.close();}
  }
 }finally{await browser?.close();await new Promise(resolve=>instance.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});

// Screen-local, delegation-based interactions; returns cleanup on every route exit.
export function bindExplorationTree({root=document}={}){
 const screen=root.querySelector?.("[data-exploration-tree]");
 if(!screen)return null;
 const known=new Set([...screen.querySelectorAll("[data-et-detail]")].map(el=>el.dataset.etDetail));
 const select=(id)=>{
  if(!known.has(id))return;
  screen.querySelectorAll("[data-et-detail]").forEach(panel=>{
   const on=panel.dataset.etDetail===id;
   panel.hidden=!on;
   panel.querySelectorAll("[data-et-tab]").forEach(button=>{const selected=button.dataset.etTab==="overview";button.setAttribute("aria-selected",String(selected));button.tabIndex=selected?0:-1;});
   panel.querySelectorAll("[data-et-tab-panel]").forEach(el=>{el.hidden=el.dataset.etTabPanel!=="overview";});
  });
  screen.querySelectorAll("[data-et-topic]").forEach(b=>{const active=b.dataset.etTopic===id;b.classList.toggle("is-selected",active);b.setAttribute("aria-pressed",String(active));});
  screen.dataset.etSelectedTopic=id;
 };
 const showPage=(id)=>{
  screen.querySelectorAll("[data-et-mobile-page]").forEach(p=>{p.hidden=p.dataset.etMobilePage!==id;});
  screen.dataset.etCurrentMobilePage=id;
 };
 select(known.has(screen.dataset.etInitialTopic)?screen.dataset.etInitialTopic:[...known][0]);
 showPage("map");
 const onClick=(event)=>{
  const b=event.target.closest?.("button");
  if(!b||!screen.contains(b))return;
  if(b.dataset.etTopic){select(b.dataset.etTopic);return;}
  if(b.dataset.etCategory){
   showPage("branch-"+b.dataset.etCategory);
   screen.querySelector(".et-mobile")?.scrollIntoView?.({block:"start",behavior:"instant"});
   return;
  }
  if(b.dataset.etMobileTopic){
   select(b.dataset.etMobileTopic);
   showPage("detail");
   screen.querySelector(".et-mobile")?.scrollIntoView?.({block:"start",behavior:"instant"});
   const selected=screen.querySelector('.et-mobile-detail-panels [data-et-detail]:not([hidden]) h2');
   if(selected){selected.tabIndex=-1;selected.focus({preventScroll:true});}
   return;
  }
  if(b.dataset.etBack){
   if(b.dataset.etBack==="map")showPage("map");
   else{
    const id=screen.dataset.etSelectedTopic||"01-01";
    showPage("branch-"+id.slice(0,2));
   }
   screen.querySelector(".et-mobile")?.scrollIntoView?.({block:"start",behavior:"instant"});
   return;
  }
  if(b.dataset.etTab){
   const panel=b.closest("[data-et-detail]");
   if(!panel)return;
   const tab=b.dataset.etTab;
   panel.querySelectorAll("[data-et-tab]").forEach(x=>{const on=x.dataset.etTab===tab;x.setAttribute("aria-selected",String(on));x.tabIndex=on?0:-1;});
   panel.querySelectorAll("[data-et-tab-panel]").forEach(x=>{x.hidden=x.dataset.etTabPanel!==tab;});
  }
 };
 screen.addEventListener("click",onClick);
 return ()=>screen.removeEventListener("click",onClick);
}

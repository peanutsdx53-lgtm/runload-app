// Exploration events stay inside this screen and are cleaned up on route exit.
export function bindExplorationTree({root=document}={}){
 const screen=root.querySelector?.("[data-exploration-tree]");
 if(!screen)return null;
 const known=new Set([...screen.querySelectorAll("[data-et-detail]")].map(p=>p.dataset.etDetail));
 const select=id=>{
  if(!known.has(id))return false;
  screen.querySelectorAll("[data-et-detail]").forEach(panel=>{panel.hidden=panel.dataset.etDetail!==id;});
  screen.querySelectorAll("[data-et-topic]").forEach(button=>{
   const active=button.dataset.etTopic===id;
   button.classList.toggle("is-selected",active);
   button.setAttribute("aria-pressed",String(active));
  });
  screen.querySelectorAll("[data-et-mobile-topic]").forEach(button=>{
   button.setAttribute("aria-pressed",String(button.dataset.etMobileTopic===id));
  });
  screen.dataset.etSelectedTopic=id;
  return true;
 };
 const showCategory=id=>{
  screen.querySelectorAll("[data-et-topic-list]").forEach(list=>{list.hidden=list.dataset.etTopicList!==id;});
  screen.querySelectorAll("[data-et-category]").forEach(button=>{
   button.setAttribute("aria-pressed",String(button.dataset.etCategory===id));
  });
  screen.dataset.etSelectedCategory=id;
 };
 const detail=screen.querySelector("[data-et-mobile-inline-detail]");
 const showDetail=id=>{
  if(!select(id))return;
  showCategory(id.slice(0,2));
  if(detail){
   detail.hidden=false;
   const heading=detail.querySelector('[data-et-detail]:not([hidden]) h2');
   detail.scrollIntoView({block:"nearest",behavior:"instant"});
   heading?.focus({preventScroll:true});
  }
 };
 const hideDetail=()=>{
  if(detail)detail.hidden=true;
  const category=screen.dataset.etSelectedCategory||"01";
  const button=screen.querySelector('[data-et-category="'+category+'"]');
  button?.focus({preventScroll:true});
 };
 select(known.has(screen.dataset.etInitialTopic)?screen.dataset.etInitialTopic:"01-01");
 const query=new URLSearchParams(window.location.hash.split("?")[1]||"");
 const requested=query.get("topic");
 showCategory(requested&&known.has(requested)?requested.slice(0,2):"01");
 if(requested&&known.has(requested))showDetail(requested);
 const onClick=event=>{
  const button=event.target.closest?.("button");
  if(!button||!screen.contains(button))return;
  if(button.dataset.etTopic)return select(button.dataset.etTopic);
  if(button.dataset.etCategory){
   hideDetail();
   showCategory(button.dataset.etCategory);
   return;
  }
  if(button.dataset.etMobileTopic)return showDetail(button.dataset.etMobileTopic);
  if(button.hasAttribute("data-et-close-detail"))return hideDetail();
 };
 screen.addEventListener("click",onClick);
 return ()=>screen.removeEventListener("click",onClick);
}

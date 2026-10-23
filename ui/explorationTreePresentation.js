import {escapeHtml} from "./commonComponents.js";
import {TREE_CATEGORIES,TREE_TOPICS,buildTreeView} from "./explorationTreeData.js";

const h=escapeHtml;
const findCategory=id=>TREE_CATEGORIES.find(c=>c.id===id);
const findTopic=id=>TREE_TOPICS.find(t=>t.id===id);
const href=(route,params={})=>{const q=new URLSearchParams(Object.entries(params).filter(([,v])=>v!==""&&v!=null));return "#/"+route+(q.size?"?"+q.toString():"");};
const glyph=c=>'<span class="et-glyph" aria-hidden="true">'+h(c.icon)+'</span>';
const eligibleArticle=a=>Boolean(a?.id&&Array.isArray(a.sources)&&a.sources.some(s=>s?.title&&(s?.url||s?.sourceId)));
const sourceUrl=url=>/^https?:\/\//i.test(String(url||"").trim())?String(url).trim():"";

function articleContent(article){
 if(!article)return "";
 const paragraphs=(Array.isArray(article.body)?article.body:[]).filter(v=>typeof v==="string"&&v.trim());
 const references=(Array.isArray(article.sources)?article.sources:[]).filter(s=>s&&s.title);
 return '<div class="et-article-content">'+
  '<p class="et-article-label">要約</p><p class="et-article-summary">'+h(article.summary||article.lead||"")+'</p>'+
  (paragraphs.length?'<p class="et-article-label">本文</p>'+paragraphs.map(v=>'<p>'+h(v)+'</p>').join(""):"")+
  (references.length?'<p class="et-article-label">引用元</p><ul class="et-sources">'+references.map(s=>{
    const url=sourceUrl(s.url);
    return '<li>'+(url?'<a href="'+h(url)+'" target="_blank" rel="noopener noreferrer">'+h(s.title)+'</a>':h(s.title))+'</li>';
  }).join("")+'</ul>':"")+
  '</div>';
}
function articlePreview(article,title="関連する読みもの"){
 if(!eligibleArticle(article))return '<div class="et-read-empty">このテーマの読みものは準備中です。</div>';
 return '<section class="et-reading-inline"><p class="et-panel-label">'+h(title)+'</p><details class="et-inline-article">'+
  '<summary><strong>'+h(article.title)+'</strong><span>記事を読む <span aria-hidden="true">⌄</span></span></summary>'+
  articleContent(article)+'</details></section>';
}
function recordFacts(topic,vm){
 if(!vm.record)return [];
 const result=[];
 if(topic.id==="01-01"){
  if(vm.record.distanceKm!==null)result.push("距離 "+vm.record.distanceKm.toFixed(2)+" km");
  if(vm.record.durationMinutes!==null)result.push("時間 "+vm.record.durationMinutes.toFixed(1)+" 分");
 }
 if(["01-02","04-01"].includes(topic.id)){
  if(vm.rof.pre!==null)result.push("走る前 "+vm.rof.pre);
  if(vm.rof.post!==null)result.push("走った後 "+vm.rof.post);
 }
 return result;
}
function topicPanel(topic,vm,services){
 const c=findCategory(topic.category),facts=recordFacts(topic,vm);
 const mapped=vm.articles[topic.id];
 const article=mapped?services?.column?.findById?.(mapped.id):null;
 const evidence=vm.highlights[topic.id];
 return '<article class="et-topic-panel" data-et-detail="'+h(topic.id)+'" hidden style="--et-color:'+c.color+';--et-pale:'+c.tint+'">'+
  '<div class="et-panel-hero">'+glyph(c)+'<div><p>'+h(c.name)+'</p><h2 tabindex="-1">'+h(topic.name)+'</h2></div></div>'+
  (evidence?'<div class="et-related"><span aria-hidden="true">✧</span><span>'+h(evidence)+'</span></div>':'')+
  '<p class="et-topic-question">'+h(topic.name)+'について知る</p>'+
  (facts.length?'<div class="et-facts" aria-label="今回の記録">'+facts.map(f=>'<strong>'+h(f)+'</strong>').join("")+'</div>':'')+
  articlePreview(article)+
  '<div class="et-note"><strong>覚えておきたいこと</strong><p>自分の記録と一般的な研究情報は別のものです。ここから原因やけがの危険性を決めつけません。</p></div>'+
  '</article>';
}
function desktopMap(vm){
 const center=[467,323],offsets=[[-73,-62],[72,-57],[-76,65],[76,64]];
 const clouds=TREE_CATEGORIES.map(c=>'<ellipse cx="'+c.x+'" cy="'+c.y+'" rx="143" ry="129" fill="'+c.tint+'" opacity=".73"/>').join("");
 const connections=TREE_CATEGORIES.map(c=>'<path d="M'+center.join(" ")+' Q'+((center[0]+c.x)/2+20)+' '+((center[1]+c.y)/2-14)+' '+c.x+' '+c.y+'" stroke="'+c.color+'" opacity=".33" stroke-width="2.4" fill="none"/>').join("");
 const twigs=TREE_CATEGORIES.flatMap(c=>offsets.map(([x,y])=>'<path d="M'+c.x+' '+c.y+' L'+(c.x+x)+' '+(c.y+y)+'" stroke="'+c.color+'" opacity=".26" stroke-width="1.9"/>')).join("");
 const nodes=TREE_CATEGORIES.map(c=>'<div class="et-cluster-title" style="--et-color:'+c.color+';left:'+(c.x/920*100)+'%;top:'+((c.y-126)/650*100)+'%">'+h(c.name)+'</div>'+
 '<div class="et-cluster-hub" aria-hidden="true" style="--et-color:'+c.color+';--et-pale:'+c.tint+';left:'+(c.x/920*100)+'%;top:'+(c.y/650*100)+'%">'+glyph(c)+'</div>'+
 c.topics.map((name,i)=>{
  const [dx,dy]=offsets[i],id=c.id+"-"+String(i+1).padStart(2,"0");
  return '<button type="button" class="et-node'+(vm.highlights[id]?" is-glowing":"")+'" data-et-topic="'+id+'" aria-label="'+h(name)+'" style="--et-color:'+c.color+';--et-pale:'+c.tint+';left:'+((c.x+dx)/920*100)+'%;top:'+((c.y+dy)/650*100)+'%"><span class="et-node-mark" aria-hidden="true">'+(i+1)+'</span><span class="et-node-label">'+h(name)+'</span></button>';
 }).join("")).join("");
 return '<div class="et-map-viewport" tabindex="0" aria-label="探究ツリー全体。マップ内は左右に移動できます。"><div class="et-map-stage">'+
 '<svg aria-hidden="true" class="et-map-lines" viewBox="0 0 920 650" preserveAspectRatio="none">'+clouds+connections+twigs+'</svg>'+
 '<span class="et-center"><span class="et-run-symbol" aria-hidden="true">✧</span><strong>'+(vm.record?"今回の走り":"自由探索")+'</strong><small>7つの分野</small></span>'+nodes+'</div></div>';
}
const MOBILE_POINTS=[[21,18],[50,12],[79,18],[85,51],[75,82],[26,82],[15,51]];
function mobileTree(vm){
 const center=[50,51];
 const lines=TREE_CATEGORIES.map((c,i)=>{
  const [x,y]=MOBILE_POINTS[i];
  return '<path d="M'+center[0]+' '+center[1]+' L'+x+' '+y+'" stroke="'+c.color+'" stroke-width="1.25" stroke-linecap="round" opacity=".4"/>';
 }).join("");
 const nodes=TREE_CATEGORIES.map((c,i)=>{
  const [x,y]=MOBILE_POINTS[i];
  const count=c.topics.filter((_,j)=>vm.highlights[c.id+"-"+String(j+1).padStart(2,"0")]).length;
  return '<button type="button" class="et-mini-node'+(count?" has-signal":"")+'" data-et-category="'+c.id+'" style="--et-color:'+c.color+';--et-pale:'+c.tint+';left:'+x+'%;top:'+y+'%" aria-pressed="false">'+glyph(c)+'<span>'+h(c.name)+'</span></button>';
 }).join("");
 return '<div class="et-mini-tree" aria-label="7分野の探究ツリー"><svg aria-hidden="true" class="et-mini-lines" viewBox="0 0 100 100" preserveAspectRatio="none">'+lines+'</svg>'+
 '<div class="et-mini-center" aria-hidden="true"><span>✧</span><strong>今回の走り</strong></div>'+nodes+'</div>';
}
function mobileCategories(){
 return TREE_CATEGORIES.map(c=>'<div class="et-category-topic-list" data-et-topic-list="'+c.id+'" hidden>'+
  '<h3>'+h(c.name)+'</h3><div class="et-topic-choices">'+c.topics.map((name,i)=>{
    const id=c.id+"-"+String(i+1).padStart(2,"0");
    return '<button type="button" data-et-mobile-topic="'+id+'"><span>'+h(name)+'</span><span aria-hidden="true">›</span></button>';
  }).join("")+'</div></div>').join("");
}
function library(services){
 const items=(services?.column?.list?.()||[]).filter(eligibleArticle);
 return '<details class="et-library"><summary><span><strong>読みものを探す</strong><small>'+items.length+'本の記事</small></span><span aria-hidden="true">⌄</span></summary>'+
  '<div class="et-library-items">'+items.map(a=>'<details class="et-library-entry"><summary>'+h(a.title)+'</summary>'+articleContent(a)+'</details>').join("")+'</div></details>';
}
export function renderExplorationTreePresentation({services,context}){
 const topicRequested=String(context?.parameters?.get?.("topic")||"");
 const selected=findTopic(topicRequested)?.id||"04-01";
 const recordId=String(context?.parameters?.get?.("recordId")||"");
 const vm=buildTreeView(services,recordId);
 const panels=TREE_TOPICS.map(t=>topicPanel(t,vm,services)).join("");
 const oldHref=vm.record?href("interpretation-room",{recordId:vm.record.id,origin:context?.parameters?.get?.("origin")||"result"}):"";
 const safetyNotice=vm.record&&!vm.allowed?'<div class="et-priority-notice" role="note"><strong>身体の確認を優先してください</strong><p>記録された体調についての案内を先に確認できます。</p>'+(oldHref?'<a class="et-existing-flow" href="'+h(oldHref)+'">安全に関する案内を確認 ↗</a>':"")+'</div>':"";
 return '<section class="screen screen--exploration-tree et" data-exploration-tree data-et-initial-topic="'+h(selected)+'">'+
 '<header class="et-head"><div><h1>探究ツリー</h1><p>気になることから、走りを知る。</p></div><span class="et-status">'+(vm.record?"今回の走り":"自由探索")+'</span></header>'+safetyNotice+
 '<div class="et-desktop"><section class="et-map-card"><div class="et-map-toolbar"><h2>7つの分野を探す</h2><span>✧ 記録につながるテーマ</span></div>'+desktopMap(vm)+'</section>'+
 '<aside class="et-detail" aria-label="テーマの詳細">'+panels+'</aside></div>'+
 '<div class="et-mobile"><div class="et-mobile-page" data-et-mobile-page="map"><h2 class="et-mobile-lead">気になる分野をタップ</h2>'+mobileTree(vm)+
 '<section class="et-mobile-topics" aria-label="分野のテーマ">'+mobileCategories()+'</section>'+
 '<div class="et-mobile-detail" data-et-mobile-inline-detail hidden><button class="et-mobile-back" type="button" data-et-close-detail>‹ テーマを選ぶ</button><div class="et-mobile-detail-panels">'+panels+'</div></div></div></div>'+
 library(services)+
 '<p class="et-disclaimer">読みものと記録との対応は試験的なものです。記事内容や出典の最終審査は未完了です。</p></section>';
}

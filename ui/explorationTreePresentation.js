import {escapeHtml} from "./commonComponents.js";
import {TREE_CATEGORIES,TREE_TOPICS,buildTreeView} from "./explorationTreeData.js";
const h=escapeHtml;
const topicById=id=>TREE_TOPICS.find(t=>t.id===id);
const categoryById=id=>TREE_CATEGORIES.find(c=>c.id===id);
const dest=(path,params={})=>{const query=new URLSearchParams(Object.entries(params).filter(([,v])=>v!==""&&v!=null));return "#/"+path+(query.size?"?"+query.toString():"");};
const symbol=(c)=>'<span class="et-glyph" aria-hidden="true">'+h(c.icon)+'</span>';
function evidence(topic,vm){
 const facts=[];
 if(vm.record){
  if(topic.id==="01-01"){
    if(vm.record.distanceKm!==null)facts.push("距離："+vm.record.distanceKm.toFixed(2)+" km");
    if(vm.record.durationMinutes!==null)facts.push("時間："+vm.record.durationMinutes.toFixed(1)+" 分");
  }
  if(["01-02","04-01"].includes(topic.id)){
    if(vm.rof.pre!==null)facts.push("走る前のROF-J："+vm.rof.pre);
    if(vm.rof.post!==null)facts.push("走った後のROF-J："+vm.rof.post);
  }
 }
 return facts;
}
function topicPanel(t,vm){
 const c=categoryById(t.category),article=vm.articles[t.id],facts=evidence(t,vm);
 const recordLink=vm.record?dest("result",{recordId:vm.record.id}):dest("record-input");
 const articleHref=article?dest("reading",{articleId:article.id,origin:"exploration-tree",recordId:vm.record?.id||"",topic:t.id}):dest("reading",{origin:"exploration-tree",recordId:vm.record?.id||"",topic:t.id});
 const hasSignal=Object.hasOwn(vm.highlights,t.id);
 return '<article class="et-topic-panel" data-et-detail="'+h(t.id)+'" hidden style="--et-color:'+c.color+';--et-pale:'+c.tint+'">'+
  '<div class="et-panel-hero">'+symbol(c)+'<div><p>'+h(c.name)+'</p><h2>'+h(t.name)+'</h2><span>興味を持ったところから自由に探せます</span></div></div>'+
  '<div class="et-tabs" role="tablist" aria-label="テーマの情報"><button type="button" role="tab" aria-selected="true" data-et-tab="overview">概要</button><button type="button" role="tab" aria-selected="false" data-et-tab="article">読みもの</button><button type="button" role="tab" aria-selected="false" data-et-tab="records">記録</button></div>'+
  '<section class="et-tab-body" data-et-tab-panel="overview"><p class="et-section-eyebrow">このテーマの問い</p><h3>'+h(t.name)+'について考える</h3><p>自分の走行経験と、一般的な知識を区別しながら確認できます。</p>'+
  (hasSignal?'<div class="et-related">✧ '+h(vm.highlights[t.id])+'</div>':'<p class="et-muted">このテーマは自由探索として開いています。</p>')+
  '<div class="et-question">どんなことを確かめてみたいですか？</div></section>'+
  '<section class="et-tab-body" data-et-tab-panel="article" hidden><p class="et-section-eyebrow">コラム連携（試験段階）</p><h3>'+h(article?.title||"読みものを探す")+'</h3><p>既存の記事画面と往復できます。テーマとの科学的対応や掲載内容は未承認のため、正式な推薦ではありません。</p>'+
  '<a class="et-inline-link" href="'+h(articleHref)+'">'+(article?"既存の読みものを開く":"読みもの一覧を開く")+' ↗</a></section>'+
  '<section class="et-tab-body" data-et-tab-panel="records" hidden><p class="et-section-eyebrow">本人の記録</p><h3>自分の走りと見比べる</h3>'+
  (facts.length?'<div class="et-record-facts">'+facts.map(f=>'<p>'+h(f)+'</p>').join("")+'</div>':'<p>このテーマについて表示できる本人の記録はありません。</p>')+
  '<p class="et-muted">ROF-Jはそのとき本人が感じた疲れです。回復状態やけがの可能性は示しません。12部位の文献参考値と合算しません。</p></section>'+
  '<div class="et-panel-actions"><a href="'+h(recordLink)+'" class="et-primary-action">'+(vm.record?"今回の記録に戻る":"記録画面へ")+' ↗</a><a href="'+h(articleHref)+'" class="et-secondary-action">読みもの ↗</a></div></article>';
}
function nodeMap(vm){
 const center=[467,323],offsets=[[-73,-62],[72,-57],[-76,65],[76,64]];
 const cloud=TREE_CATEGORIES.map(c=>'<ellipse cx="'+c.x+'" cy="'+c.y+'" rx="143" ry="129" fill="'+c.tint+'" opacity=".73"/>').join("");
 const hubLinks=TREE_CATEGORIES.map(c=>'<path d="M'+center.join(" ")+' Q'+((center[0]+c.x)/2+20)+' '+((center[1]+c.y)/2-14)+' '+c.x+' '+c.y+'" fill="none" stroke="'+c.color+'" opacity=".35" stroke-width="2.2"/>').join("");
 const branchLinks=TREE_CATEGORIES.flatMap(c=>offsets.map(([dx,dy])=>'<path d="M'+c.x+' '+c.y+' L'+(c.x+dx)+' '+(c.y+dy)+'" fill="none" stroke="'+c.color+'" opacity=".26" stroke-width="1.8"/>')).join("");
 const clusters=TREE_CATEGORIES.map(c=>'<div class="et-cluster-title" style="--et-color:'+c.color+';left:'+(c.x/920*100)+'%;top:'+((c.y-126)/650*100)+'%">'+h(c.name)+'</div>'+
  '<div class="et-cluster-hub" aria-hidden="true" style="--et-color:'+c.color+';--et-pale:'+c.tint+';left:'+(c.x/920*100)+'%;top:'+(c.y/650*100)+'%">'+symbol(c)+'</div>'+
  c.topics.map((n,i)=>{const [dx,dy]=offsets[i],id=c.id+"-"+String(i+1).padStart(2,"0");return '<button type="button" class="et-node'+(vm.highlights[id]?" is-glowing":"")+'" data-et-topic="'+id+'" aria-label="'+h(n)+(vm.highlights[id]?"、今回の記録に関連":"")+'" style="--et-color:'+c.color+';--et-pale:'+c.tint+';left:'+((c.x+dx)/920*100)+'%;top:'+((c.y+dy)/650*100)+'%"><span class="et-node-mark" aria-hidden="true">'+(i+1)+'</span><span class="et-node-label">'+h(n)+'</span></button>';}).join("")).join("");
 return '<div class="et-map-viewport" tabindex="0" aria-label="探索マップ。横方向にスクロールできます"><div class="et-map-stage"><svg aria-hidden="true" class="et-map-lines" viewBox="0 0 920 650" preserveAspectRatio="none">'+cloud+hubLinks+branchLinks+'</svg><span class="et-center"><span class="et-run-symbol">♢</span><strong>'+(vm.record?"今回の走り":"自由探索")+'</strong><small>'+(vm.record&&vm.record.distanceKm!==null?vm.record.distanceKm.toFixed(2)+" km":"7分野")+'</small></span>'+clusters+'</div></div>';
}
function categoryCards(vm){
 return TREE_CATEGORIES.map(c=>'<button type="button" data-et-category="'+c.id+'" class="et-category-card" style="--et-color:'+c.color+';--et-pale:'+c.tint+'">'+symbol(c)+'<span><strong>'+h(c.name)+'</strong><small>'+c.topics.filter((_,i)=>vm.highlights[c.id+"-"+String(i+1).padStart(2,"0")]).length+'件の記録関連テーマ</small></span><span aria-hidden="true">›</span></button>').join("");
}
export function renderExplorationTreePresentation({services,context}){
 const topicRequested=String(context?.parameters?.get?.("topic")||"");
 const selected=topicById(topicRequested)?.id||"04-01";
 const requestedRecordId=String(context?.parameters?.get?.("recordId")||"");
 const vm=buildTreeView(services,requestedRecordId);
 const panels=TREE_TOPICS.map(t=>topicPanel(t,vm)).join("");
 const routeOrigin=String(context?.parameters?.get?.("origin")||"");
 const regionId=String(context?.parameters?.get?.("regionId")||"");
 const existingHref=vm.record?dest("interpretation-room",{recordId:vm.record.id,origin:routeOrigin||"result",regionId}):"";
 const existingFlow=existingHref?'<a class="et-existing-flow" href="'+h(existingHref)+'">これまでの見比べ画面を開く ↗</a>':"";
 const supportNotice=vm.record&&!vm.allowed?'<div class="et-priority-notice" role="note"><strong>この記録では確認の案内を優先します。</strong><p>記録の安全に関する案内や表示条件を、探究テーマだけから判断しないでください。</p>'+existingFlow+'</div>':"";
 const recordStatus=vm.record?'<span class="et-status">今回の走り：'+h(vm.record.date)+'</span>':'<span class="et-status">記録がなくても探索できます</span>';
 return '<section class="screen screen--exploration-tree et" data-exploration-tree data-et-initial-topic="'+selected+'">'+
  '<header class="et-head"><div><p class="et-kicker">DISCOVER YOUR RUN</p><h1>探究ツリー</h1><p>走りから、新しい発見へ。興味のある分野を自由に探せます。</p></div><div class="et-head-tools">'+recordStatus+'<a href="#/reading" class="et-text-link">読みもの ↗</a></div></header>'+supportNotice+
  '<div class="et-desktop"><div class="et-map-card"><div class="et-map-toolbar"><div><h2>つながる7つの世界</h2><p>28のテーマから気になる問いを選んでください</p></div><span class="et-map-caption">✧ 光るノードは記録との接点</span></div>'+nodeMap(vm)+'<div class="et-map-bottom">探究ツリーは自由探索です。選択や閲覧を強制しません。</div></div>'+
  '<aside class="et-detail" aria-label="選択したテーマの詳細">'+panels+'</aside></div>'+
  '<div class="et-mobile"><div class="et-mobile-page" data-et-mobile-page="map"><div class="et-mobile-intro"><h2>興味のある分野を探す</h2><p>気になる分野を選ぶと、そこから枝をたどれます。</p></div><div class="et-category-grid">'+categoryCards(vm)+'</div></div>'+
  TREE_CATEGORIES.map(c=>'<div class="et-mobile-page" data-et-mobile-page="branch-'+c.id+'" hidden><button class="et-mobile-back" type="button" data-et-back="map">‹ すべての分野へ</button><div class="et-mobile-branch-title" style="--et-color:'+c.color+';--et-pale:'+c.tint+'">'+symbol(c)+'<h2>'+h(c.name)+'</h2></div><div class="et-branch-list">'+c.topics.map((name,i)=>{const id=c.id+"-"+String(i+1).padStart(2,"0");return '<button type="button" class="et-branch-item" data-et-mobile-topic="'+id+'"><span>'+h(name)+'</span>'+(vm.highlights[id]?'<span class="et-branch-glow">✧ 記録に関連</span>':'')+'<span aria-hidden="true">›</span></button>';}).join("")+'</div></div>').join("")+
  '<div class="et-mobile-page et-mobile-detail" data-et-mobile-page="detail" hidden><button class="et-mobile-back" type="button" data-et-back="branch">‹ テーマ一覧へ</button><div class="et-mobile-detail-panels">'+panels+'</div></div></div>'+
  '<div class="et-migration-footer">'+(!supportNotice?existingFlow:"")+'</div><p class="et-disclaimer">科学・権利審査未完のテーマ／コラム接続は試験表示です。実記録と一般情報を混同しないようにしてください。</p></section>';
}

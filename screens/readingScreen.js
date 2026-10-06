import { toFiniteNumber as numberValue } from "../shared/valueUtilities.js";
import { escapeHtml } from "../ui/commonComponents.js";
import { BODY_AREA_BY_ID, BODY_AREA_TO_PRIMARY_REGIONAL_V2, PRIMARY_REGIONAL_V2_REGION_DEFS } from "../core/appCore.js";

const REGION_BY_ID = new Map(PRIMARY_REGIONAL_V2_REGION_DEFS.map((region) => [region.displayId, region]));
const SLOPE_DIRECT_REGION_IDS = new Set(PRIMARY_REGIONAL_V2_REGION_DEFS
  .filter((region) => ["R05", "R06", "R09", "R10"].includes(region.id))
  .map((region) => region.displayId));
const CONSULTATION_PREP_CORE_ARTICLE_ID = "consultation-prep";
const visibleArticles = (articles = []) => articles;
const publicArticleId = (articleId = "") => String(articleId || "");


function dateToTime(dateText = "") {
  const match = String(dateText || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return NaN;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
}

function daysBetweenDates(leftDate, rightDate) {
  const left = dateToTime(leftDate);
  const right = dateToTime(rightDate);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return Math.round((left - right) / 86400000);
}

function bodyAreaObservations(feedback = {}) {
  return Array.isArray(feedback.bodyAreaObservations)
    ? feedback.bodyAreaObservations.filter((item) => BODY_AREA_BY_ID[item?.areaId])
    : [];
}

function buildRecordHistory(experience, allExperiences = []) {
  if (!experience) return Object.freeze({ ordered: [], index: -1, previous: null, previousRun: null, previousRuns: [] });
  const ordered = [...allExperiences]
    .filter(Boolean)
    .sort((left, right) => left.record.date.localeCompare(right.record.date) || left.record.id.localeCompare(right.record.id));
  const index = ordered.findIndex((item) => item.record.id === experience.record.id);
  const before = index >= 0 ? ordered.slice(0, index) : [];
  const previous = before.at(-1) || null;
  const previousRuns = before.filter((item) => item.record.activityType === "run");
  return Object.freeze({
    ordered,
    index,
    previous,
    previousRun: previousRuns.at(-1) || null,
    previousRuns,
  });
}

function repeatedBodyAreas(experience, allExperiences = []) {
  const current = bodyAreaObservations(experience?.feedback || {});
  if (!current.length) return [];
  const history = buildRecordHistory(experience, allExperiences);
  const recent = history.previousRuns.slice(-4);
  return current.filter((observation) => recent.some((item) => (
    daysBetweenDates(experience.record.date, item.record.date) <= 28
    && bodyAreaObservations(item.feedback || {})
      .some((prior) => prior.areaId === observation.areaId)
  )));
}

function targetRegionId(context, experience) {
  const requested = context?.parameters?.get?.("regionId") || "";
  if (REGION_BY_ID.has(requested)) return requested;
  const observation = bodyAreaObservations(experience?.feedback || {})
    .find((item) => BODY_AREA_TO_PRIMARY_REGIONAL_V2[item?.areaId]);
  return BODY_AREA_TO_PRIMARY_REGIONAL_V2[observation?.areaId] || "";
}

function buildColumnRecommendation(services, experience, allExperiences = [], context = {}, deferredArticleIds = DEFERRED_READING_ARTICLE_IDS) {
  const all = visibleArticles(services.column.list());
  const find = (id) => { const article = services.column.findById(id); return article && !deferredArticleIds.has(article.id) ? article : all[0] || null; };
  const recommendation = (id, reason) => Object.freeze({ article: find(id), reason });
  if (!experience) {
    return recommendation("regional-three-views", "最初に、12部位の数字の見方を確認できます。");
  }

  const { record, feedback = {}, supportDecision = {} } = experience;
  const route = supportDecision?.route || "normal";
  const course = record.course || {};
  const environment = record.environmentContext || {};
  const up = numberValue(course.upPercent, 0);
  const down = numberValue(course.downPercent, 0);
  const observations = bodyAreaObservations(feedback);
  const repeatedAreas = repeatedBodyAreas(experience, allExperiences);
  const selectedRegionId = targetRegionId(context, experience);
  const runCount = allExperiences.filter(
    (item) => item?.record?.activityType === "run",
  ).length;
  const hasTemperature = environment.temperatureC !== null
    && environment.temperatureC !== undefined
    && String(environment.temperatureC).trim() !== "";
  const hasRecordedContext = hasTemperature || Boolean(String(environment.environmentNote || "").trim());

  if (route === "consult" || route === "urgent") {
    return recommendation(CONSULTATION_PREP_CORE_ARTICLE_ID, "共有する前に、伝える内容を整理するための記事です。");
  }
  if (record.activityType === "rest") {
    return recommendation("history-compatible", "休養日や空白を0として扱わない、履歴の見方を確認できます。");
  }
  if (repeatedAreas.length) {
    const labels = repeatedAreas.slice(0, 2).map((item) => item.label).join("、");
    return recommendation(CONSULTATION_PREP_CORE_ARTICLE_ID, `${labels}の記録が続いているため、共有するときの整理方法を確認できます。`);
  }
  if (selectedRegionId && SLOPE_DIRECT_REGION_IDS.has(selectedRegionId)) {
    return recommendation("slope-endpoints", `${REGION_BY_ID.get(selectedRegionId)?.name || selectedRegionId}の数字がどう動くかを、坂との関係から確認できます。`);
  }
  if (observations.length) {
    return recommendation("regional-six-eight-28", `身体の記録と12部位の目安を分けて見返す方法を確認できます。`);
  }
  if (hasTemperature) {
    return recommendation("heat-not-temperature-only", "気温の記録があるため、暑さを気温以外も含めて見るポイントを確認できます。");
  }
  if (hasRecordedContext) {
    return recommendation("context-not-single-cause", "環境メモを、ひとつの原因に決めずに見返すための記事です。");
  }
  if (course.gradeKnowledge === "KNOWN_PROFILE" && (up > 0 || down > 0)) {
    return recommendation("grade-and-coverage", "坂のある記録なので、上り・下りで身体の使われ方が変わる理由を確認できます。");
  }
  if (
    ["UNKNOWN", "EXPLICIT_UNEVEN", "KNOWN_OTHER"].includes(
      String(course.modelSurfaceClass || "UNKNOWN"),
    )
  ) {
    return recommendation("surface-missingness", "路面の状態を振り返るときに見るポイントを確認できます。");
  }
  if (
    feedback?.checkStatus
    && !["none_reported", "not_asked", "deferred"].includes(feedback.checkStatus)
  ) {
    return recommendation("regional-six-eight-28", "身体の記録と結果の数字を分けて読む方法を確認できます。");
  }
  if (runCount >= 3) {
    return recommendation("personal-reference", "過去の記録が増えてきたため、前回比較の見方を確認できます。");
  }
  return recommendation("regional-three-views", "結果画面の数字を読む基本を確認できます。");
}

function resolveColumnTargetExperience(services, context) {
  const allExperiences = services.workflows.records.loadAllExperiences()
    .filter(Boolean)
    .sort((left, right) => left.record.date.localeCompare(right.record.date) || left.record.id.localeCompare(right.record.id));
  const requestedRecordId = context.parameters.get("recordId") || context.parameters.get("anchorRecordId") || "";
  const requestedDate = context.parameters.get("date") || context.parameters.get("anchorDate") || "";
  const byRecordId = requestedRecordId ? services.workflows.records.loadExperience(requestedRecordId) : null;
  const byDate = requestedDate
    ? [...allExperiences].reverse().find((item) => item.record.date === requestedDate)
    : null;
  const latest = services.workflows.records.loadLatestExperience();
  const experience = byRecordId || byDate || latest;
  const targetKind = byRecordId ? "selected-record" : byDate ? "selected-date" : latest ? "latest" : "none";
  return Object.freeze({ experience, allExperiences, targetKind });
}

const READING_ITEMS = Object.freeze([
  Object.freeze({ id: "regional-three-views", filter: "result" }),
  Object.freeze({ id: "history-compatible", filter: "record" }),
  Object.freeze({ id: "plan-facts-current", filter: "record" }),
  Object.freeze({ id: "training-progression-no-universal-rule", filter: "running" }),
  Object.freeze({ id: "context-not-single-cause", filter: "running" }),
  Object.freeze({ id: "cooldown-stretching-limits", filter: "after" }),
  Object.freeze({ id: "hydration-not-more-is-better", filter: "after" }),
  Object.freeze({ id: "heat-not-temperature-only", filter: "before" }),
  Object.freeze({ id: CONSULTATION_PREP_CORE_ARTICLE_ID, filter: "share" }),
]);

const READING_COPY = Object.freeze({
  "regional-three-views": Object.freeze({
    category: "結果の見方",
    title: "12部位の目安は「その部位の100」と比べる",
    summary: "12部位の数字は、部位どうしの順位ではありません。それぞれの部位で、自分自身の基準100からどれくらい変わったかを見ます。",
    body: Object.freeze([
      "結果画面では、12部位それぞれに基準100があります。たとえば膝の表示が128なら、その部位では基準100より28ポイント上という読み方です。腕の128と膝の128を比べて、どちらの負担が大きいと考えるものではありません。",
      "同じ日に走っても、坂、ペース、歩数、路面などの条件によって、部位ごとの数字の動き方は変わります。まず数字だけを見るのではなく、その日にどんな条件で走ったかも一緒に思い出すと、結果を読みやすくなります。",
      "距離は『何km走ったか』という別の記録です。距離が長いほど12部位の数字がそのまま大きくなる、という仕組みではありません。結果の数字と距離は、それぞれ別の情報として確認します。",
      "履歴を見るときも同じです。最初に同じ部位の100との差を見て、そのあと前回の同じ部位、その日の距離やコース条件へ進むと、数字だけに引っぱられずに振り返れます。",
    ]),
  }),
  "history-compatible": Object.freeze({
    category: "記録・履歴",
    title: "履歴は、比べられる記録だけをつなぐ",
    summary: "休養日や数値を出せない記録は0ではありません。同じ意味で比べられる記録だけをつないで見ます。",
    body: Object.freeze([
      "履歴の空白にはいくつかの意味があります。走っていない日、記録していない日、その部位の数字を出せない日などです。どれも『0だった』という意味ではないので、0として線をつなぐと別の意味になってしまいます。",
      "部位の推移では、同じ部位を同じ意味で比べられる記録だけをつなぎます。線が途中で切れていても、それだけで良くなった・悪くなったとは読みません。単に、その区間には比べる数字がない場合があります。",
      "変化を見るときは、グラフの上下だけでなく、その日の距離、走った時間、坂や路面なども一緒に確認します。数字の変化と走行条件の変化を並べると、何が違った日なのかを整理しやすくなります。",
      "疲労感や身体の記録は、12部位の数値とは別の情報です。同じ日に並んでいても、どちらかがもう一方の原因だと決めず、それぞれの記録として見返します。",
    ]),
  }),
  "plan-facts-current": Object.freeze({
    category: "記録・履歴",
    title: "予定と実際は、分けて残す",
    summary: "走る前に考えた予定と、実際に走った内容は別の記録です。違いが出たこと自体も、次に振り返る材料になります。",
    body: Object.freeze([
      "走る前に決められるのは、距離、時間、コースなどの予定です。実際に走ると、思ったより短くしたり、時間が延びたり、コースを変えたりすることがあります。",
      "予定どおりにできたかどうかだけで評価する必要はありません。何を予定して、実際にはどうなったかを分けて残すと、自分がどんな場面で予定を変えたのかを後から確認できます。",
      "歩数や実際の走行時間、走った後の疲労感などは、走ったあとに分かる情報です。予定の段階で埋めるのではなく、実際の記録として残すことで、予定と実績が混ざりにくくなります。",
      "次の予定を考えるときは、前回の予定だけを見るのではなく、実際に走った内容も並べてみます。予定との差は失敗ではなく、自分の走り方を知るための記録になります。",
    ]),
  }),
  "training-progression-no-universal-rule": Object.freeze({
    category: "走りとのつき合い方",
    title: "練習量は「毎週○％」だけで決めない",
    summary: "毎週同じ割合で増やせば誰にでも合う、という万能なルールはありません。距離・時間・回数などを分けて見ます。",
    body: Object.freeze([
      "ランニングでは『毎週10％ずつ増やす』という考え方を見かけます。ただ、初心者ランナーを対象にした研究でも、10％ずつ増やす方法なら誰でもけがを減らせる、とは確認されていません。",
      "これは、急に練習量を増やしてよいという意味でもありません。大切なのは、一つの割合を全員共通の正解として使わないことです。",
      "同じ10％でも、週に走る回数、1回の距離、走る時間、コースが違えば内容はかなり変わります。『何％増えたか』だけでなく、何がどのくらい変わったかを分けて見る方が、自分の記録を理解しやすくなります。",
      "予定と実際の記録を何回か並べると、自分がどのくらい走ってきたかを具体的に振り返れます。次の予定を考えるときも、一つの数字だけではなく最近の記録全体を見る材料にできます。",
    ]),
  }),
  "context-not-single-cause": Object.freeze({
    category: "走りとのつき合い方",
    title: "走った日の背景は、ひとつに決めつけない",
    summary: "暑さ、睡眠、コース、生活、走った内容などは重なります。一回の記録だけで原因を決めず、分けて残して見返します。",
    body: Object.freeze([
      "同じように走ったつもりでも、その日の感じ方は毎回同じとは限りません。走った内容だけでなく、暑さ、睡眠、休養、生活、コースなど、いくつもの背景が重なることがあります。",
      "たとえば『暑い日に疲れた』という記録が一度あっても、それだけで暑さが原因だったとは決められません。その日は距離が長かったかもしれませんし、睡眠や生活の違いがあったかもしれません。",
      "そこで、分かっている事実と自分の感じ方を分けて残します。気温、走行時間、コースは事実として、疲れた・走りにくかったといった感覚は自分の記録として残す、という考え方です。",
      "何日か並べたときに似た場面があれば、次に確認したいことが見つかるかもしれません。一回の一致を答えにするのではなく、次に見るポイントを作るために記録を使います。",
    ]),
  }),
  "cooldown-stretching-limits": Object.freeze({
    category: "走った後",
    title: "クールダウンやストレッチは、目的を分けて考える",
    summary: "行えば必ず筋肉痛やけがを防げる、というものではありません。何のために行ったかと、その後どう感じたかを分けます。",
    body: Object.freeze([
      "走った後に軽く動くクールダウンは、よく行われています。ただ、研究をまとめた報告では、翌日以降の運動成績や筋肉痛への効果は小さいか、結果が一定していません。けがを防げることが確認されたわけでもありません。",
      "運動後のストレッチも、何もしないで休んだ場合と比べて、筋肉痛や筋力の戻り方がはっきり良くなるとは確認されていません。『やれば必ず回復が早くなる』と考えるのは単純すぎます。",
      "一方で、ゆっくり身体を動かして走り終える、気持ちを切り替えるなど、自分にとって別の目的があることはあります。効果が一つに決まらないからといって、行う意味が全くないという話でもありません。",
      "振り返るときは、何をしたかと、その後どう感じたかを分けて残します。『ストレッチをしたから良かった』と先に決めず、自分の記録として見返せる形にしておくと扱いやすくなります。",
    ]),
  }),
  "hydration-not-more-is-better": Object.freeze({
    category: "走った後",
    title: "水分補給は、量だけで考えない",
    summary: "必要な水分量は人や状況で変わります。多く飲んだことだけを安心材料にせず、走った時間や暑さも一緒に見ます。",
    body: Object.freeze([
      "汗のかき方は人によって違い、同じ人でも走る時間や気温などで変わります。そのため、全員が同じ量を飲めばよい、という一つの数字だけでは考えられません。",
      "長時間の運動では、必要以上に水分を取り続けることが問題になる場合もあります。運動に伴う低ナトリウム血症についてまとめた報告でも、飲み過ぎが重要な背景として扱われています。",
      "振り返るときは、飲んだ量だけでなく、どのくらい走ったか、どんな天候だったか、何を飲んだかを分けて残すと、その日の状況を思い出しやすくなります。",
      "『たくさん飲んだから大丈夫』『少なかったから必ず不足している』のように量だけで結論を出さず、その日の条件の一つとして見ます。",
    ]),
  }),
  "heat-not-temperature-only": Object.freeze({
    category: "走る前",
    title: "暑い日は、気温だけを見ない",
    summary: "暑さは気温だけでは分かりません。湿度や日差しも含むWBGTなど、その場所と時間の最新情報を確認します。",
    body: Object.freeze([
      "同じ気温でも、湿度や日差しが違えば身体が受ける暑さは変わります。気温だけを見て『今日は大丈夫そう』と決めると、見落とす情報があります。",
      "暑さを見る指標の一つがWBGT（暑さ指数）です。気温だけでなく、湿度や周囲から受ける熱なども含めて考えるため、スポーツ時の暑さを確認する公的な案内でも使われています。",
      "走る前は、過去に同じ気温で走れたかではなく、その場所と時間の最新のWBGTや公的な暑さ情報を確認します。天候は変わるので、以前の記録だけでは今の状況は分かりません。",
      "あとから振り返れるように、気温、天候、時間帯などを分けて残しておくと便利です。同じ距離でも環境が違った日を見分けやすくなります。",
    ]),
  }),
  "consultation-prep": Object.freeze({
    category: "相談・共有",
    title: "共有するときは、事実と自分の言葉を分ける",
    summary: "相談するときは、記録した事実、自分が感じたこと、相手に聞きたいことを分けると伝わりやすくなります。",
    body: Object.freeze([
      "相談するときは、最初に日付、距離、走った時間、コースなど、記録として確認できることをまとめます。相手が状況をつかむための土台になります。",
      "次に、身体で気になったことや疲労感など、自分が感じたことを自分の言葉で添えます。事実と感覚を分けておくと、『記録にあること』と『自分が感じたこと』が混ざりにくくなります。",
      "最後に、何を見てほしいのか、何を聞きたいのかを一つ書きます。情報をたくさん並べるより、相談したいことが分かる方が相手も確認しやすくなります。",
      "共有する前には、必要な内容だけになっているかを自分で確認します。自分だけのメモなど、見せたくない情報が入っていないかを見ることも大切です。",
    ]),
  }),
});

function readingArticleCopy(article = {}) {
  const override = READING_COPY[article.id] || {};
  return Object.freeze({
    category: override.category || article.category || "読みもの",
    title: override.title || article.title || "読みもの",
    summary: override.summary || article.summary || article.lead || "",
    body: override.body || article.body || [],
    sources: article.sources || [],
  });
}

function readingMinutes(copy = {}) {
  const text = [
    copy.summary || "",
    ...(copy.body || []),
  ].join("");
  return Math.max(1, Math.ceil(text.length / 240));
}

function readingSearchText(article = {}, copy = {}) {
  return [
    copy.category,
    copy.title,
    copy.summary,
    ...(copy.body || []),
    ...(article.tags || []),
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function renderReadingSources(sources = []) {
  if (!sources.length) return "";
  return `<section class="reading-sources"><div class="reading-section-head"><small>参考にした情報</small><h3>出典元</h3></div><div class="reading-source-list">${sources.map((source) => {
    const organization = source.organization || source.sourceTypeLabel || "参考資料";
    const meta = [organization, source.year].filter(Boolean).join("・");
    const body = `<span><strong>${escapeHtml(source.title || organization)}</strong><small>${escapeHtml(meta)}</small></span>${source.url ? '<b aria-hidden="true">↗</b>' : ""}`;
    return source.url
      ? `<a class="reading-source" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${body}</a>`
      : `<div class="reading-source reading-source--internal">${body}</div>`;
  }).join("")}</div></section>`;
}

function relatedReadingItems(article, items = []) {
  const current = items.find((item) => item.article?.id === article?.id);
  const category = readingArticleCopy(article).category;
  const sameTheme = items.filter((item) => item.article?.id !== article?.id && (
    current ? item.filter === current.filter : readingArticleCopy(item.article).category === category
  ));
  const fallback = items.filter((item) => item.article?.id !== article?.id && !sameTheme.includes(item));
  return [...sameTheme, ...fallback].slice(0, 2);
}

function readingArticleHref(articleId, context) {
  const query = new URLSearchParams();
  query.set("articleId", publicArticleId(articleId));
  ["origin", "recordId", "regionId", "from", "roomOrigin"].forEach((key) => {
    const value = context?.parameters?.get?.(key) || "";
    if (value) query.set(key, value);
  });
  return `#/reading?${query.toString()}`;
}

function renderReadingArticle(article, filter, isFeatured = false, context = null) {
  const copy = readingArticleCopy(article);
  const minutes = readingMinutes(copy);
  return `<article class="article-card" data-reading-card data-cat="${escapeHtml(filter)}" data-reading-search="${escapeHtml(readingSearchText(article, copy))}">
    <div class="article-card__copy"><small>${escapeHtml(copy.category)}</small><strong>${escapeHtml(copy.title)}</strong><p>${escapeHtml(copy.summary)}</p></div>
    <div class="article-card__meta"><span>約${minutes}分</span>${isFeatured ? '<span class="article-card__recommended">おすすめ</span>' : ""}</div>
    <a class="article-card__open" href="${escapeHtml(readingArticleHref(article.id, context))}"><span>読む</span><b aria-hidden="true">→</b></a>
  </article>`;
}

function articleBackTarget(context) {
  const origin = context.parameters.get("origin") || "";
  const recordId = context.parameters.get("recordId") || "";
  const regionId = context.parameters.get("regionId") || "";
  const from = context.parameters.get("from") || "";
  const roomOrigin = context.parameters.get("roomOrigin") || "result";
  if (from === "interpretation-room") {
    const roomQuery = new URLSearchParams();
    if (recordId) roomQuery.set("recordId", recordId);
    roomQuery.set("origin", roomOrigin);
    if (regionId) roomQuery.set("regionId", regionId);
    return Object.freeze({ href: `#/interpretation-room?${roomQuery.toString()}`, label: "結果の整理へ戻る" });
  }
  if (origin === "result-condition" && recordId && regionId) {
    return Object.freeze({ href: `#/body-part-detail?recordId=${encodeURIComponent(recordId)}&regionId=${encodeURIComponent(regionId)}`, label: "部位結果へ戻る" });
  }
  return Object.freeze({ href: "#/reading", label: "読みものへ戻る" });
}

function renderReadingArticleView(article, items, context) {
  const copy = readingArticleCopy(article);
  const minutes = readingMinutes(copy);
  const related = relatedReadingItems(article, items);
  const back = articleBackTarget(context);
  return `<div class="screen screen--reading-article screen-layout screen-layout--reading-article secondary-derived-screen" data-reading-article-screen>
    <header class="secondary-derived-head"><a class="secondary-derived-back" href="${escapeHtml(back.href)}">← ${escapeHtml(back.label)}</a><strong>読みもの</strong><span aria-hidden="true"></span></header>
    <main class="reading-article-page">
      <article class="reading-detail reading-detail--page">
        <div class="reading-detail__content">
          <header class="reading-article-head"><div class="reading-detail__meta"><span>${escapeHtml(copy.category)}</span><span>約${minutes}分</span></div><h1>${escapeHtml(copy.title)}</h1></header>
          <section class="reading-summary"><div class="reading-section-head"><small>まず知っておきたいこと</small><h2>要約</h2></div><p>${escapeHtml(copy.summary)}</p></section>
          <section class="reading-body"><div class="reading-section-head"><small>もう少し詳しく</small><h2>本文</h2></div><div class="body-copy">${copy.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div></section>
          ${renderReadingSources(copy.sources)}
          ${related.length ? `<section class="reading-related"><div class="reading-related__head"><strong>続けて読む</strong><small>関連する記事</small></div><div class="reading-related__grid">${related.map((item) => {
            const relatedCopy = readingArticleCopy(item.article);
            return `<a class="reading-related-card" href="${escapeHtml(readingArticleHref(item.article.id, context))}"><span><small>${escapeHtml(relatedCopy.category)}</small><strong>${escapeHtml(relatedCopy.title)}</strong></span><b aria-hidden="true">→</b></a>`;
          }).join("")}</div></section>` : ""}
          <div class="reading-detail__footer"><a class="reading-detail__back" href="${escapeHtml(back.href)}">${escapeHtml(back.label)}</a></div>
        </div>
      </article>
    </main>
  </div>`;
}

export function renderReadingContent({ services, context, deferredArticleIds }) {
  const available = new Map(visibleArticles(services.column.list()).map((article) => [article.id, article]));
  const items = READING_ITEMS.map((item) => ({ ...item, article: available.get(item.id) })).filter((item) => item.article);
  const allExperiences = services.workflows.records.loadAllExperiences();
  const target = resolveColumnTargetExperience(services, context);
  const recommendation = buildColumnRecommendation(services, target.experience, allExperiences, context, deferredArticleIds);
  const featured = recommendation.article && available.has(recommendation.article.id) ? recommendation.article : available.get("regional-three-views") || items[0]?.article || null;
  const requestedArticleId = publicArticleId(context.parameters.get("articleId") || "");
  if (requestedArticleId) {
    const article = available.get(requestedArticleId);
    if (article) return renderReadingArticleView(article, items, context);
  }
  const origin = context.parameters.get("origin") || "";
  const recordId = context.parameters.get("recordId") || "";
  const regionId = context.parameters.get("regionId") || "";
  const from = context.parameters.get("from") || "";
  const roomOrigin = context.parameters.get("roomOrigin") || "result";
  let backHref = origin === "result-condition" && recordId && regionId
    ? `#/body-part-detail?recordId=${encodeURIComponent(recordId)}&regionId=${encodeURIComponent(regionId)}`
    : "#/more";
  let backLabel = origin === "result-condition" && recordId && regionId ? "部位結果へ戻る" : "その他へ戻る";
  if (from === "interpretation-room") {
    const roomQuery = new URLSearchParams();
    if (recordId) roomQuery.set("recordId", recordId);
    roomQuery.set("origin", roomOrigin);
    if (regionId) roomQuery.set("regionId", regionId);
    backHref = `#/interpretation-room?${roomQuery.toString()}`;
    backLabel = "結果の整理へ戻る";
  }
  const filterCounts = items.reduce((counts, item) => {
    counts[item.filter] = (counts[item.filter] || 0) + 1;
    return counts;
  }, { all: items.length });
  const filterButton = (id, label) => `<button${id === "all" ? ' class="active"' : ""} type="button" aria-pressed="${id === "all" ? "true" : "false"}" data-reading-filter="${id}"><span>${label}</span><b class="filter-count">${filterCounts[id] || 0}</b></button>`;
  return `<div class="screen screen--reading screen-layout screen-layout--reading secondary-derived-screen" data-reading-screen>
    <header class="secondary-derived-head"><a class="secondary-derived-back" href="${escapeHtml(backHref)}">← ${escapeHtml(backLabel)}</a><strong>読みもの</strong><span aria-hidden="true"></span></header>
    <div class="secondary-derived-body">
    <section class="head reading-intro"><p class="eyebrow">読みもの</p><h1>ランニングを知る、記録を理解する</h1><p>走る前後の知識と、記録を見返すときに役立つ内容を短い記事でまとめています。</p></section>
    ${featured ? (() => { const copy = readingArticleCopy(featured); return `<section class="recommend"><div class="recommend__copy"><small>${target.experience ? "この記録から" : "まず読むなら"}</small><strong>${escapeHtml(copy.title)}</strong><p>${escapeHtml(recommendation.reason || copy.summary)}</p><div class="recommend__meta"><span>${escapeHtml(copy.category)}</span><span>約${readingMinutes(copy)}分</span></div></div><a href="${escapeHtml(readingArticleHref(featured.id, context))}"><span>読む</span><b aria-hidden="true">→</b></a></section>`; })() : ""}
    <section class="reading-tools" aria-label="読みものを探す">
      <div class="reading-search" role="search"><span class="reading-search__icon" aria-hidden="true">⌕</span><input type="search" inputmode="search" autocomplete="off" placeholder="キーワードで探す　例：暑さ、睡眠、履歴" aria-label="読みものをキーワードで検索" data-reading-search><button type="button" data-reading-search-clear hidden>クリア</button></div>
      <div class="filter-strip"><div class="filter-strip-head"><span>テーマで絞る</span><small>横にスライド <b aria-hidden="true">→</b></small></div><div class="filters" role="group" aria-label="読みものをテーマで絞り込み">${filterButton("all","すべて")}${filterButton("result","結果")}${filterButton("record","記録・履歴")}${filterButton("running","走り方")}${filterButton("after","走った後")}${filterButton("before","走る前")}${filterButton("share","共有")}</div></div>
    </section>
    <div class="reading-list-head"><strong>記事</strong><span data-reading-count aria-live="polite">${items.length}件</span></div>
    <div class="grid">${items.map((item) => renderReadingArticle(item.article, item.filter, featured?.id === item.article.id, context)).join("")}</div>
    <div class="reading-empty" data-reading-empty hidden><strong>該当する記事がありません</strong><p>別のキーワードやテーマで探してみてください。</p><button type="button" data-reading-reset>すべての記事を表示</button></div>
    </div>
  </div>`;
}

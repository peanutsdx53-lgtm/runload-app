import { escapeHtml } from "../ui/commonComponents.js";
import { V27_EMPHASIS_REGION_IDS, V27_REGIONS, BODY_AREA_BY_ID } from "../core/appCore.js";

const REGION_BY_ID = new Map(V27_REGIONS.map((region) => [region.id, region]));
const CONSULTATION_PREP_CORE_ARTICLE_ID = "consultation-prep-v27";
const PUBLIC_ARTICLE_ID_ALIASES = new Map([
  [CONSULTATION_PREP_CORE_ARTICLE_ID, "consultation-prep"],
]);
const DEFERRED_READING_ARTICLE_IDS = new Set(["rpe-separated", "model-total-v27"]);
const visibleArticles = (articles = []) => articles.filter((article) => !DEFERRED_READING_ARTICLE_IDS.has(article?.id));
const publicArticleId = (articleId = "") => PUBLIC_ARTICLE_ID_ALIASES.get(String(articleId || "")) || String(articleId || "");

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

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
    .find((item) => BODY_AREA_BY_ID[item.areaId]?.modelRegionId);
  return BODY_AREA_BY_ID[observation?.areaId]?.modelRegionId || "";
}

function buildColumnRecommendation(services, experience, allExperiences = [], context = {}) {
  const all = visibleArticles(services.column.list());
  const find = (id) => { const article = services.column.findById(id); return article && !DEFERRED_READING_ARTICLE_IDS.has(article.id) ? article : all[0] || null; };
  const recommendation = (id, reason) => Object.freeze({ article: find(id), reason });
  if (!experience) {
    return recommendation("regional-three-views", "最初に、12部位の数字の見方を確認できます。");
  }

  const { record, feedback = {}, supportDecision = {} } = experience;
  const route = supportDecision?.route || "normal";
  const course = record.course || {};
  const environment = record.environmentContext || {};
  const recovery = record.recoveryContext || {};
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
  const hasNutritionHydrationContext = Boolean(
    String(recovery.nutritionHydrationSummary || "").trim(),
  );
  const hasSleepContext = Boolean(String(recovery.sleepSummary || "").trim());
  const hasRecordedContext = hasTemperature || [
    environment.weather,
    environment.windSummary,
    environment.environmentNote,
    recovery.nutritionHydrationSummary,
    recovery.lifestyleNote,
  ].some((value) => String(value || "").trim());

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
  if (selectedRegionId && V27_EMPHASIS_REGION_IDS.includes(selectedRegionId)) {
    return recommendation("slope-endpoints", `${REGION_BY_ID.get(selectedRegionId)?.label || selectedRegionId}の数字がどう動くかを、坂との関係から確認できます。`);
  }
  if (observations.length) {
    return recommendation("regional-six-eight-28", `身体の記録と12部位の目安を分けて見返す方法を確認できます。`);
  }
  if (hasNutritionHydrationContext) {
    return recommendation("hydration-not-more-is-better", "水分のメモがある記録なので、量だけで見ない振り返り方を確認できます。");
  }
  if (hasSleepContext) {
    return recommendation("sleep-not-hours-only", "睡眠のメモがある記録なので、時間以外も含めた見返し方を確認できます。");
  }
  if (hasTemperature) {
    return recommendation("heat-not-temperature-only", "気温の記録があるため、暑さを気温以外も含めて見るポイントを確認できます。");
  }
  if (hasRecordedContext) {
    return recommendation("context-not-single-cause", "天候や生活のメモを、ひとつの原因に決めずに見返すための記事です。");
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
    lead: "数字は部位どうしの順位ではなく、同じ部位の基準100からどれくらい変わったかを見るためのものです。",
    body: Object.freeze([
      "結果では、12部位それぞれに基準100があります。たとえば128なら、その部位では基準より28ポイント上という意味です。",
      "同じ日の中でも、部位ごとに数字の動き方は違います。腕と膝の128を同じ大きさとして比べるのではなく、それぞれの部位で100との差を見ます。",
      "数字を見るときは、距離・ペース・坂・路面など、その日の走行条件も一緒に確認すると、前回との違いを理解しやすくなります。",
    ]),
    practicePoints: Object.freeze(["まず100との差を見る。", "次に前回の同じ部位を見る。", "最後に距離やコース条件の違いを見る。"]),
  }),
  "regional-six-eight-28": Object.freeze({
    category: "結果の見方",
    title: "12部位の目安と身体の記録は、別の情報",
    lead: "結果の数字と、自分が感じたことは分けて残すと、あとから見返しやすくなります。",
    body: Object.freeze([
      "12部位の目安は、距離や坂、ペース、路面などの走行条件から整理した数字です。痛みや疲れを感じた場所そのものを示すものではありません。",
      "身体の記録には、感じた場所、左右、程度、気づいた時点を自分の情報として残せます。",
      "数字と身体の記録が同じ方向でも違っていても、まずは別々の事実として見返します。",
    ]),
    practicePoints: Object.freeze(["結果は100との差を見る。", "身体の記録は場所・程度・時点を見る。", "一致したかどうかだけで結論を出さない。"]),
  }),
  "history-compatible": Object.freeze({
    category: "記録・履歴",
    title: "履歴は、比べられる記録だけをつなぐ",
    lead: "走っていない日や、条件がそろわない記録を0として扱わず、同じ意味で比べられる記録だけを見ます。",
    body: Object.freeze([
      "休養日、未記録の日、結果を出せない記録は、数字の0ではありません。履歴では、数字がある記録と空白を分けて扱います。",
      "部位の推移を見るときは、同じ部位を同じ意味で比べられる記録だけをつなぎます。",
      "線が途切れている場所は、悪化や改善を示すのではなく、比べる数字がない区間として読みます。",
    ]),
    practicePoints: Object.freeze(["空白を0として読まない。", "同じ部位の記録を見ているか確認する。", "線だけでなく、その日の距離や条件も見る。"]),
  }),
  "plan-facts-current": Object.freeze({
    category: "記録・履歴",
    title: "予定と実際は、分けて残す",
    lead: "走る前に考えた予定と、実際に走った内容を分けると、あとから違いを振り返れます。",
    body: Object.freeze([
      "予定では、これから走る距離・時間・コースなどを整理します。走ったあとの記録とは別に残します。",
      "実際には、時間やコースの状態、歩数などが予定と変わることがあります。違ったこと自体も振り返る材料です。",
      "予定どおりだったかだけでなく、何が変わったかを見ると、次の予定を考えやすくなります。",
    ]),
    practicePoints: Object.freeze(["予定と実績を別々に確認する。", "距離・時間・コースのどこが変わったかを見る。", "変更や未実施も、そのまま記録として残す。"]),
  }),
  "training-progression-no-universal-rule": Object.freeze({
    category: "走りとのつき合い方",
    title: "練習量は「毎週○％」だけで決めない",
    lead: "増やし方を一つの割合に固定せず、距離・時間・回数と自分の記録を合わせて見ます。",
    body: Object.freeze([
      "練習量を毎週10％ずつ増やす考え方はよく知られていますが、誰にでも同じように当てはまる決まりではありません。",
      "同じ割合でも、走る回数、距離、時間、コースが違えば、実際の練習内容は変わります。",
      "予定を立てるときは、一つの割合だけではなく、最近の自分の記録を見ながら考える方が振り返りやすくなります。",
    ]),
    practicePoints: Object.freeze(["割合だけでなく距離・時間・回数を見る。", "直前の一回だけで決めない。", "予定を変えた場合も、そのまま残す。"]),
  }),
  "context-not-single-cause": Object.freeze({
    category: "走りとのつき合い方",
    title: "走った日の背景は、ひとつに決めつけない",
    lead: "暑さ、睡眠、コース、生活などは重なります。気になったことは分けて記録すると振り返りやすくなります。",
    body: Object.freeze([
      "走った日の感じ方には、練習内容だけでなく、天候、睡眠、生活、過去の経験など複数のことが重なる場合があります。",
      "一つだけを原因と決めるより、分かっていることを別々に残しておくと、何日か並べたときに違いを見つけやすくなります。",
      "気づいたことは短い言葉で構いません。事実と自分の感じ方を分けて残すことがポイントです。",
    ]),
    practicePoints: Object.freeze(["天候・睡眠・走った内容を分けて残す。", "自分の感じ方も別に書く。", "一回だけの一致で原因を決めない。"]),
  }),
  "cooldown-stretching-limits": Object.freeze({
    category: "走った後",
    title: "クールダウンやストレッチは、目的を分けて考える",
    lead: "終わった後に何をしたかと、その後どう感じたかを分けて残します。",
    body: Object.freeze([
      "クールダウンやストレッチは、行えば必ず筋肉痛を減らせる、というものではありません。",
      "一方で、気持ちを切り替える、身体をゆっくり動かして終えるなど、自分なりの目的で行うことはできます。",
      "何をしたかと、その後どう感じたかを別々に記録すると、自分にとっての使い方を見返しやすくなります。",
    ]),
    practicePoints: Object.freeze(["行った内容を短く残す。", "その後の感じ方は別に記録する。", "やった・やらなかっただけで良し悪しを決めない。"]),
  }),
  "hydration-not-more-is-better": Object.freeze({
    category: "走った後",
    title: "水分補給は、量だけで考えない",
    lead: "走った時間や暑さによって状況は変わります。飲んだ量だけでなく、その日の条件も一緒に見ます。",
    body: Object.freeze([
      "汗のかき方や走る時間、気温は人や日によって違います。全員に同じ量が当てはまるわけではありません。",
      "長時間の運動では、必要以上に飲み続けることが問題になる場合もあります。量の多さだけを安心材料にしないことが大切です。",
      "記録するときは、走った時間、天候、飲んだものを分けて残すと、その日の状況を思い出しやすくなります。",
    ]),
    practicePoints: Object.freeze(["走った時間と天候を見る。", "飲んだものと量を記録する。", "量の多さだけで足りた・足りないを決めない。"]),
  }),
  "sleep-not-hours-only": Object.freeze({
    category: "走る前",
    title: "睡眠は、時間だけで振り返らない",
    lead: "眠った長さだけでなく、眠れた感じや普段との違いも一緒に残すと見返しやすくなります。",
    body: Object.freeze([
      "同じ睡眠時間でも、途中で目が覚めた、寝つきが違ったなど、感じ方は変わることがあります。",
      "一晩の長さだけを見るより、自分の普段の記録と比べると、その日の違いを捉えやすくなります。",
      "時間と感じ方を分けて残しておくと、あとから走った日の背景と一緒に確認できます。",
    ]),
    practicePoints: Object.freeze(["睡眠時間を残す。", "眠れた感じを別に残す。", "自分の普段との違いを見る。"]),
  }),
  "heat-not-temperature-only": Object.freeze({
    category: "走る前",
    title: "暑い日は、気温だけを見ない",
    lead: "湿度や日差しも含むWBGTを見ると、その時間・場所の暑さをより把握しやすくなります。",
    body: Object.freeze([
      "同じ気温でも、湿度や日差しによって暑さの条件は変わります。気温だけでは分からない部分があります。",
      "走る前は、その場所と時間に合った最新のWBGTや公的な暑さ情報を確認すると、環境を把握しやすくなります。",
      "記録には、気温、天候、時間帯などを分けて残しておくと、あとからその日の環境を思い出しやすくなります。",
    ]),
    practicePoints: Object.freeze(["走る場所と時間の最新WBGTを見る。", "気温・天候・時間帯を分けて残す。", "過去の一回だけでなく、その日の情報を見る。"]),
  }),
  "consultation-prep-v27": Object.freeze({
    category: "相談・共有",
    title: "共有するときは、事実と自分の言葉を分ける",
    lead: "日付・距離・時間などの記録と、自分が感じたことを分けてまとめると、相手が確認しやすくなります。",
    body: Object.freeze([
      "まず、日付、距離、走った時間、コースなど、記録した事実をまとめます。",
      "次に、身体の記録や気になったことを、自分の言葉として分けて添えます。12部位の目安を入れる場合は、部位名と基準100との差が分かる形にします。",
      "最後に、相手に確認してほしいことを一つ書くと、共有する目的が伝わりやすくなります。",
    ]),
    practicePoints: Object.freeze(["記録した事実を先にまとめる。", "自分の感じ方は別に書く。", "確認してほしいことを一つ書く。"]),
  }),
  "slope-endpoints": Object.freeze({
    category: "結果の見方",
    title: "上りと下りでは、部位ごとの変化が違う",
    lead: "坂では身体の使い方が変わりますが、すべての部位が同じ方向に動くわけではありません。",
    body: Object.freeze([
      "上りでは身体を前上方へ運ぶ動きが増え、下りでは着地しながら速度を調整する動きが増えます。",
      "そのため、同じ坂でも部位によって数字の動き方が違うことがあります。",
      "部位の数字を見るときは、その部位の基準100との差と、坂・ペース・歩数などの条件を一緒に確認します。",
    ]),
    practicePoints: Object.freeze(["上りと下りを分けて見る。", "部位ごとに100との差を見る。", "坂だけでなくペースや歩数も確認する。"]),
  }),
  "grade-and-coverage": Object.freeze({
    category: "走りとのつき合い方",
    title: "坂のある日は、上りと下りを分けて見る",
    lead: "上りと下りでは身体の使われ方が変わるため、同じ「坂道」としてまとめずに振り返ります。",
    body: Object.freeze([
      "上りでは身体を持ち上げる動きが増え、下りでは着地しながら速度を調整する動きが増えます。",
      "坂の傾きや区間の長さでも走り方は変わります。",
      "コースを振り返るときは、上り・下りの割合や、どのくらい続いたかを分けて見ると理解しやすくなります。",
    ]),
    practicePoints: Object.freeze(["上りと下りを分ける。", "坂の長さも思い出す。", "同じコースでもペースの違いを見る。"]),
  }),
  "surface-missingness": Object.freeze({
    category: "走りとのつき合い方",
    title: "路面は、名前だけでなく実際の状態を見る",
    lead: "同じ舗装路や芝でも、硬さ・凹凸・濡れ方が違えば走った感覚も変わります。",
    body: Object.freeze([
      "路面の硬さや凹凸が変わると、足のつき方や身体の動かし方も変わることがあります。",
      "同じ名前の路面でも、乾いているか、濡れているか、平らかどうかで状態は違います。",
      "よく分からないときは無理に決めず、分かる範囲だけ残す方が、あとから別の条件と取り違えにくくなります。",
    ]),
    practicePoints: Object.freeze(["硬さ・凹凸・乾湿を見る。", "足のつき方は分かる場合だけ残す。", "迷う条件は無理に決めない。"]),
  }),
  "personal-reference": Object.freeze({
    category: "記録・履歴",
    title: "前回比較は、同じ意味で比べられる記録だけ",
    lead: "同じ部位を同じ基準で比べられる過去記録があるときだけ、前回との差を表示します。",
    body: Object.freeze([
      "前回比較では、同じ部位を同じ意味で比べられる記録を探します。",
      "比べられる記録があれば、その中で直近の一回と今回を並べます。なければ無理に差を作りません。",
      "差を見るときは、数字だけでなく、距離やコースなど今回と前回の条件も一緒に確認します。",
    ]),
    practicePoints: Object.freeze(["同じ部位の比較か確認する。", "前回との差を見る。", "今回と前回の走行条件も見る。"]),
  }),
});

function readingArticleCopy(article = {}) {
  const override = READING_COPY[article.id] || {};
  return Object.freeze({
    category: override.category || article.category || "読みもの",
    title: override.title || article.title || "読みもの",
    lead: override.lead || article.lead || article.summary || "",
    body: override.body || article.body || [],
    practicePoints: override.practicePoints || article.practicePoints || [],
  });
}

function readingMinutes(copy = {}) {
  const text = [
    copy.lead || "",
    ...(copy.body || []),
    ...(copy.practicePoints || []),
  ].join("");
  return Math.max(1, Math.ceil(text.length / 240));
}

function readingSearchText(article = {}, copy = {}) {
  return [
    copy.category,
    copy.title,
    copy.lead,
    ...(copy.body || []),
    ...(copy.practicePoints || []),
    ...(article.tags || []),
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
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

function renderReadingArticle(article, filter, isFeatured = false) {
  const copy = readingArticleCopy(article);
  const minutes = readingMinutes(copy);
  return `<article class="article-card" data-reading-card data-cat="${escapeHtml(filter)}" data-reading-search="${escapeHtml(readingSearchText(article, copy))}">
    <div class="article-card__copy"><small>${escapeHtml(copy.category)}</small><strong>${escapeHtml(copy.title)}</strong><p>${escapeHtml(copy.lead)}</p></div>
    <div class="article-card__meta"><span>約${minutes}分</span>${isFeatured ? '<span class="article-card__recommended">おすすめ</span>' : ""}</div>
    <button class="article-card__open" type="button" data-reading-open="${escapeHtml(publicArticleId(article.id))}"><span>読む</span><b aria-hidden="true">→</b></button>
  </article>`;
}

function renderReadingDetail(article, items) {
  const copy = readingArticleCopy(article);
  const minutes = readingMinutes(copy);
  const related = relatedReadingItems(article, items);
  return `<article class="reading-detail" data-reading-detail="${escapeHtml(publicArticleId(article.id))}" hidden>
    <div class="sheet-head">
      <div><small>${escapeHtml(copy.category)}</small><strong id="articleTitle-${escapeHtml(publicArticleId(article.id))}">${escapeHtml(copy.title)}</strong><div class="reading-detail__meta"><span>約${minutes}分</span></div></div>
      <button class="close" type="button" data-reading-close aria-label="閉じる">×</button>
    </div>
    <p class="lead">${escapeHtml(copy.lead)}</p>
    ${copy.practicePoints.length ? `<section class="reading-keypoints"><strong>まずここだけ</strong><ul>${copy.practicePoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul></section>` : ""}
    <div class="body-copy">${copy.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>
    ${related.length ? `<section class="reading-related"><div class="reading-related__head"><strong>続けて読む</strong><small>関連する記事</small></div><div class="reading-related__grid">${related.map((item) => {
      const relatedCopy = readingArticleCopy(item.article);
      return `<button class="reading-related-card" type="button" data-reading-open="${escapeHtml(publicArticleId(item.article.id))}"><span><small>${escapeHtml(relatedCopy.category)}</small><strong>${escapeHtml(relatedCopy.title)}</strong></span><b aria-hidden="true">→</b></button>`;
    }).join("")}</div></section>` : ""}
    <div class="reading-detail__footer"><button type="button" class="reading-detail__back" data-reading-close>記事一覧へ戻る</button></div>
  </article>`;
}

function renderReadingContent({ services, context }) {
  const available = new Map(visibleArticles(services.column.list()).map((article) => [article.id, article]));
  const items = READING_ITEMS.map((item) => ({ ...item, article: available.get(item.id) })).filter((item) => item.article);
  const allExperiences = services.workflows.records.loadAllExperiences();
  const target = resolveColumnTargetExperience(services, context);
  const recommendation = buildColumnRecommendation(services, target.experience, allExperiences, context);
  const featured = recommendation.article && available.has(recommendation.article.id) ? recommendation.article : available.get("regional-three-views") || items[0]?.article || null;
  const initialArticleId = publicArticleId(context.parameters.get("articleId") || "");
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
  const detailArticles = new Map(items.map((item) => [item.article.id, item.article]));
  if (featured) detailArticles.set(featured.id, featured);
  const filterCounts = items.reduce((counts, item) => {
    counts[item.filter] = (counts[item.filter] || 0) + 1;
    return counts;
  }, { all: items.length });
  const filterButton = (id, label) => `<button${id === "all" ? ' class="active"' : ""} type="button" aria-pressed="${id === "all" ? "true" : "false"}" data-reading-filter="${id}"><span>${label}</span><b class="filter-count">${filterCounts[id] || 0}</b></button>`;
  return `<div class="screen screen--reading screen-layout screen-layout--reading secondary-derived-screen" data-reading-screen${initialArticleId ? ` data-reading-initial-article="${escapeHtml(initialArticleId)}"` : ""}>
    <header class="secondary-derived-head"><a class="secondary-derived-back" href="${escapeHtml(backHref)}">← ${escapeHtml(backLabel)}</a><strong>読みもの</strong><span aria-hidden="true"></span></header>
    <div class="secondary-derived-body">
    <section class="head reading-intro"><p class="eyebrow">READING</p><h1>記録を見返すヒント</h1><p>結果・履歴・走る前後の記録を、自分で読み解くための短いガイドです。</p></section>
    ${featured ? (() => { const copy = readingArticleCopy(featured); return `<section class="recommend"><div class="recommend__copy"><small>${target.experience ? "この記録から" : "まず読むなら"}</small><strong>${escapeHtml(copy.title)}</strong><p>${escapeHtml(recommendation.reason || copy.lead)}</p><div class="recommend__meta"><span>${escapeHtml(copy.category)}</span><span>約${readingMinutes(copy)}分</span></div></div><button type="button" data-reading-open="${escapeHtml(publicArticleId(featured.id))}"><span>読む</span><b aria-hidden="true">→</b></button></section>`; })() : ""}
    <section class="reading-tools" aria-label="読みものを探す">
      <div class="reading-search" role="search"><span class="reading-search__icon" aria-hidden="true">⌕</span><input type="search" inputmode="search" autocomplete="off" placeholder="キーワードで探す　例：暑さ、睡眠、履歴" aria-label="読みものをキーワードで検索" data-reading-search><button type="button" data-reading-search-clear hidden>クリア</button></div>
      <div class="filter-strip"><div class="filter-strip-head"><span>テーマで絞る</span><small>横にスライド <b aria-hidden="true">→</b></small></div><div class="filters" role="group" aria-label="読みものをテーマで絞り込み">${filterButton("all","すべて")}${filterButton("result","結果")}${filterButton("record","記録・履歴")}${filterButton("running","走り方")}${filterButton("after","走った後")}${filterButton("before","走る前")}${filterButton("share","共有")}</div></div>
    </section>
    <div class="reading-list-head"><strong>記事</strong><span data-reading-count aria-live="polite">${items.length}件</span></div>
    <div class="grid">${items.map((item) => renderReadingArticle(item.article, item.filter, featured?.id === item.article.id)).join("")}</div>
    <div class="reading-empty" data-reading-empty hidden><strong>該当する記事がありません</strong><p>別のキーワードやテーマで探してみてください。</p><button type="button" data-reading-reset>すべての記事を表示</button></div>
    <div class="drawer" data-reading-drawer hidden><section class="sheet" role="dialog" aria-modal="true" aria-label="読みもの本文">${[...detailArticles.values()].map((article) => renderReadingDetail(article, items)).join("")}</section></div>
    </div>
  </div>`;
}

export function renderReadingScreen({ services, context }) {
  return renderReadingContent({ services, context });
}

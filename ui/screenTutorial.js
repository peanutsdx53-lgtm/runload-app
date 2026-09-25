import { LEGACY_TUTORIAL_STORAGE_KEY } from "../core/legacyCompatibility.js";

const SCREEN_TUTORIAL_STORAGE_KEY = "running-record.screenTutorial.seen.v1";

const SCREEN_TUTORIALS = Object.freeze({
  start: Object.freeze({
    title: "スタート画面の使い方",
    lead: "目的に合わせて入口を選びます。",
    steps: Object.freeze([
      Object.freeze({ title: "アプリを使う", body: "記録の入力、結果、履歴、予定を確認するときに開きます。" }),
      Object.freeze({ title: "GPSで測定する", body: "スマートフォンで距離・時間・走行軌跡を測定するときに開きます。測定後は記録入力へ進みます。" }),
    ]),
  }),
  "run-measurement": Object.freeze({
    title: "GPS測定の使い方",
    lead: "測定開始から記録入力までを確認します。",
    steps: Object.freeze([
      Object.freeze({ title: "測定を開始する", body: "位置情報を許可して測定を開始します。測定中はこのアプリを前面表示したまま使用します。" }),
      Object.freeze({ title: "走行中の値を見る", body: "距離・時間・現在ペース・平均ペースを確認できます。予定と連携している場合はペース通知も表示します。" }),
      Object.freeze({ title: "終了して記録へ進む", body: "測定を終了すると、距離と時間を今日の記録へ引き継げます。軌跡保存を選んだ場合は記録と関連付けます。" }),
    ]),
  }),
  home: Object.freeze({
    title: "Homeの使い方",
    lead: "今日の操作と直近の記録をまとめて確認します。",
    steps: Object.freeze([
      Object.freeze({ title: "今日の操作を選ぶ", body: "記録を始める、入力を再開する、GPSで測定する操作へ進めます。" }),
      Object.freeze({ title: "前回からの確認点を見る", body: "前回の記録で残した「次に確認したいこと」がある場合は、ここに表示されます。" }),
      Object.freeze({ title: "結果や予定へ進む", body: "最新結果や次の予定など、続きの操作へ進めます。" }),
    ]),
  }),
  "record-input": Object.freeze({
    title: "今日の記録の使い方",
    lead: "入力から保存までを確認します。",
    steps: Object.freeze([
      Object.freeze({ title: "走行か休養を選ぶ", body: "走行日は距離と実際に走った時間を入力します。歩数は分かる場合に追加できます。" }),
      Object.freeze({ title: "必要な項目を追加する", body: "コース、身体の記録、シューズや走り方のメモは必要なときだけ追加します。" }),
      Object.freeze({ title: "保存して結果を見る", body: "保存すると今回の結果へ進みます。入力途中の内容は再開できます。" }),
    ]),
  }),
  "course-library": Object.freeze({
    title: "コース設定の使い方",
    lead: "保存したコースを選ぶか、新しいコースを作ります。",
    steps: Object.freeze([
      Object.freeze({ title: "保存したコースを選ぶ", body: "いつものコースを選ぶと、坂や路面の設定を今回の入力へ反映できます。" }),
      Object.freeze({ title: "新しいコースを作る", body: "コース名、坂、路面を設定して次回以降も使える形で保存できます。" }),
      Object.freeze({ title: "今回だけ変更する", body: "入力画面へ戻ったあと、今日の記録だけ内容を調整できます。" }),
    ]),
  }),
  "course-editor": Object.freeze({
    title: "コース編集の使い方",
    lead: "コース名、坂、路面を順に設定します。",
    steps: Object.freeze([
      Object.freeze({ title: "コース名を決める", body: "あとで見分けやすい名前を入力します。" }),
      Object.freeze({ title: "坂を設定する", body: "平坦、上り・下りの割合、区間の詳細など、分かる方法を選びます。" }),
      Object.freeze({ title: "路面を設定して保存する", body: "基本の路面を選び、複数ある場合は割合を追加して保存します。" }),
    ]),
  }),
  "gpx-analysis": Object.freeze({
    title: "GPX入力の使い方",
    lead: "GPXの標高情報から坂の入力候補を作ります。",
    steps: Object.freeze([
      Object.freeze({ title: "GPXファイルを選ぶ", body: "標高情報を含むGPXファイルを端末から選びます。" }),
      Object.freeze({ title: "読み取り結果を確認する", body: "標高の変化、上り・平坦・下りの割合、代表的な傾きの候補を確認します。" }),
      Object.freeze({ title: "コース設定へ渡す", body: "候補をコース設定へ反映し、内容を確認してから保存します。" }),
    ]),
  }),
  result: Object.freeze({
    title: "結果画面の使い方",
    lead: "保存した記録と12部位の目安を順に確認します。",
    steps: Object.freeze([
      Object.freeze({ title: "今回の記録を見る", body: "距離、時間、コースなど、保存した走行内容を確認します。" }),
      Object.freeze({ title: "12部位を見る", body: "身体図から部位ごとの目安を確認します。各値は、その部位自身の基準100に対する位置を示します。" }),
      Object.freeze({ title: "詳しく見たい部位を開く", body: "部位を選ぶと、その部位の保存記録の推移や結果整理へ進めます。" }),
    ]),
  }),
  "body-part-detail": Object.freeze({
    title: "部位詳細の使い方",
    lead: "選んだ部位の今回値と過去の推移を確認します。",
    steps: Object.freeze([
      Object.freeze({ title: "今回の目安を見る", body: "選んだ部位の今回値と、比較できる場合は前回からの変化を確認します。" }),
      Object.freeze({ title: "同じ部位の推移を見る", body: "同じ部位・同じ計算方法で比較できる保存記録の推移を確認します。" }),
      Object.freeze({ title: "結果を整理する", body: "「この部位の結果を整理する」から、走行事実と関連情報をまとめて見返せます。" }),
    ]),
  }),
  "run-route": Object.freeze({
    title: "走行軌跡の使い方",
    lead: "GPS測定で保存した走行軌跡を確認します。",
    steps: Object.freeze([
      Object.freeze({ title: "地図で軌跡を見る", body: "保存した走行ルートを地図上で確認します。" }),
      Object.freeze({ title: "今回の結果へ戻る", body: "確認後は結果画面へ戻り、同じ記録の内容を続けて見られます。" }),
    ]),
  }),
  history: Object.freeze({
    title: "履歴の使い方",
    lead: "記録を探す表示と、同じ部位を比べる表示を使い分けます。",
    steps: Object.freeze([
      Object.freeze({ title: "保存記録を探す", body: "日付、走行・休養、コースやメモから過去の記録を探せます。" }),
      Object.freeze({ title: "同じ部位を比べる", body: "部位と期間を選び、比較できる保存記録の推移を表示します。" }),
      Object.freeze({ title: "記録を選んで詳しく見る", body: "グラフや一覧から記録を選ぶと、その記録の結果へ進めます。" }),
    ]),
  }),
  "interpretation-room": Object.freeze({
    title: "結果整理の使い方",
    lead: "気になる部位を起点に、今回の記録を整理します。",
    steps: Object.freeze([
      Object.freeze({ title: "部位を選ぶ", body: "12部位から、今回詳しく見たい部位を選びます。" }),
      Object.freeze({ title: "事実と関連情報を見る", body: "保存した走行内容、その部位の目安、関連する説明を分けて確認します。" }),
      Object.freeze({ title: "次の操作へ進む", body: "必要に応じて条件比較、予定、共有用の整理へ進めます。" }),
    ]),
  }),
  simulation: Object.freeze({
    title: "条件比較の使い方",
    lead: "保存記録を基準に、条件を変えた表示を比較します。",
    steps: Object.freeze([
      Object.freeze({ title: "条件を変更する", body: "距離、時間、コース、走り方を変更します。" }),
      Object.freeze({ title: "12部位の変化を見る", body: "変更前と変更後を、同じ計算方法で確認します。" }),
      Object.freeze({ title: "記録入力へつなげる", body: "確認した条件を見ながら今日の記録を始められます。" }),
    ]),
  }),
  "plan-empty": Object.freeze({
    title: "予定を始める前に",
    lead: "予定作成の基準にする記録を用意します。",
    steps: Object.freeze([
      Object.freeze({ title: "まず記録を保存する", body: "走行または休養の記録を1件保存します。" }),
      Object.freeze({ title: "必要ならコースを保存する", body: "よく使うコースがある場合は、先に保存しておくと予定入力で選べます。" }),
      Object.freeze({ title: "次の予定を作る", body: "保存記録を確認したあと、次の走行または休養予定を作れます。" }),
    ]),
  }),
  plan: Object.freeze({
    title: "次の予定の使い方",
    lead: "走行または休養の予定を作って保存します。",
    steps: Object.freeze([
      Object.freeze({ title: "予定の種類を選ぶ", body: "走行予定または休養予定を選びます。" }),
      Object.freeze({ title: "予定条件を入力する", body: "走行予定では、距離、時間、走り方、コースを入力できます。" }),
      Object.freeze({ title: "保存して次回使う", body: "保存した予定は、今日の記録やGPS測定の入口として使えます。" }),
    ]),
  }),
  consultation: Object.freeze({
    title: "共有用整理の使い方",
    lead: "見せる内容を選び、用途に合う形へ整えます。",
    steps: Object.freeze([
      Object.freeze({ title: "共有の目的を選ぶ", body: "何を伝えたいかを選びます。" }),
      Object.freeze({ title: "見せる情報を選ぶ", body: "保存記録から、相手に見せる項目だけを選びます。" }),
      Object.freeze({ title: "見せ方を選ぶ", body: "画面表示、印刷・PDF、テキストコピーから選べます。" }),
    ]),
  }),
  "support-guidance": Object.freeze({
    title: "公的サポートの使い方",
    lead: "公的な相談先や連絡先を確認します。",
    steps: Object.freeze([
      Object.freeze({ title: "案内を確認する", body: "表示された公的な窓口と用途を確認します。" }),
      Object.freeze({ title: "必要な窓口を開く", body: "利用する場合は、自分で電話や外部ページを開きます。" }),
    ]),
  }),
  reading: Object.freeze({
    title: "読みものの使い方",
    lead: "知りたい内容を分類や結果から探します。",
    steps: Object.freeze([
      Object.freeze({ title: "記事を探す", body: "分類から絞り込むか、結果から表示された記事を選びます。" }),
      Object.freeze({ title: "本文と見返すポイントを読む", body: "記事本文と、記録を振り返るときの確認点を読めます。" }),
      Object.freeze({ title: "出典を確認する", body: "記事の背景にある資料や研究文献を確認できます。" }),
    ]),
  }),
  privacy: Object.freeze({
    title: "データの扱いの見方",
    lead: "端末内に保存する情報と外部機能を使う場面を確認します。",
    steps: Object.freeze([
      Object.freeze({ title: "保存される内容を見る", body: "記録、設定、GPS軌跡など、端末内に保存する内容を確認します。" }),
      Object.freeze({ title: "外部機能を使う場面を見る", body: "地図、外部ページ、電話など、端末外の機能を開く場面を確認します。" }),
      Object.freeze({ title: "データ管理へ進む", body: "バックアップや削除は設定画面から操作できます。" }),
    ]),
  }),
  settings: Object.freeze({
    title: "設定の使い方",
    lead: "表示、プロフィール、保存データを管理します。",
    steps: Object.freeze([
      Object.freeze({ title: "表示を調整する", body: "文字サイズ、明るさ、配色を変更できます。" }),
      Object.freeze({ title: "使い回す情報を保存する", body: "プロフィールやシューズなど、入力で再利用する情報を管理できます。" }),
      Object.freeze({ title: "データを管理する", body: "バックアップ、復元、端末内データの削除を行えます。" }),
    ]),
  }),
  more: Object.freeze({
    title: "その他画面の使い方",
    lead: "補助機能と設定への入口です。",
    steps: Object.freeze([
      Object.freeze({ title: "目的の機能を選ぶ", body: "設定、共有用整理、公的サポート、プライバシー、読みものを開けます。" }),
      Object.freeze({ title: "各画面の「?」を使う", body: "開いた画面では、その画面専用の使い方を確認できます。" }),
    ]),
  }),
});

function readSeenMap() {
  try {
    const current = window.localStorage.getItem(SCREEN_TUTORIAL_STORAGE_KEY);
    const legacy = current == null ? window.localStorage.getItem(LEGACY_TUTORIAL_STORAGE_KEY) : null;
    const parsed = JSON.parse(current ?? legacy ?? "{}");
    if (current == null && legacy != null && parsed && typeof parsed === "object") {
      window.localStorage.setItem(SCREEN_TUTORIAL_STORAGE_KEY, JSON.stringify(parsed));
      window.localStorage.removeItem(LEGACY_TUTORIAL_STORAGE_KEY);
    }
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveSeenMap(seenMap) {
  try {
    window.localStorage.setItem(SCREEN_TUTORIAL_STORAGE_KEY, JSON.stringify(seenMap));
  } catch (error) {
    // チュートリアルの既読保存に失敗しても、アプリ本体の利用は止めない。
  }
}

function markSeen(tutorialId) {
  const seenMap = readSeenMap();
  saveSeenMap({ ...seenMap, [tutorialId]: true });
}

function isSeen(tutorialId) {
  return Boolean(readSeenMap()[tutorialId]);
}

function tutorialButtonSelector(tutorialId) {
  const escaped = String(tutorialId).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  return `[data-screen-tutorial-start="${escaped}"]`;
}

function updateRecommendationBadges(root) {
  root.querySelectorAll("[data-screen-tutorial-recommend]").forEach((badge) => {
    const tutorialId = badge.getAttribute("data-screen-tutorial-recommend") || "";
    badge.hidden = isSeen(tutorialId);
  });
}

function renderTutorialStep(tutorial, stepIndex) {
  const step = tutorial.steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= tutorial.steps.length - 1;
  return `
    <button type="button" class="screen-tutorial__close" data-screen-tutorial-skip aria-label="操作ガイドを閉じる">閉じる</button>
    <div class="screen-tutorial__header">
      <p class="screen-tutorial__label">操作ガイド</p>
      <h2 id="screen-tutorial-title">${tutorial.title}</h2>
      <p>${tutorial.lead}</p>
    </div>
    <div class="screen-tutorial__progress" aria-label="チュートリアルの進み具合">
      <span>${stepIndex + 1}</span><span>/</span><span>${tutorial.steps.length}</span>
    </div>
    <article class="screen-tutorial__step">
      <h3>${step.title}</h3>
      <p>${step.body}</p>
    </article>
    <div class="screen-tutorial__actions">
      <button type="button" class="button button--text" data-screen-tutorial-skip>スキップ</button>
      <button type="button" class="button button--secondary" data-screen-tutorial-prev${isFirst ? " disabled" : ""}>前へ</button>
      <button type="button" class="button button--primary" data-screen-tutorial-next>${isLast ? "終了" : "次へ"}</button>
    </div>`;
}

function closeTutorial(dialog, tutorialId, returnFocus = null) {
  markSeen(tutorialId);
  document.body.classList.remove("has-open-dialog");
  dialog.remove();
  if (returnFocus?.isConnected) returnFocus.focus();
  else document.querySelector(tutorialButtonSelector(tutorialId))?.focus();
  updateRecommendationBadges(document);
}

function openScreenTutorial(tutorialId, returnFocus = null) {
  const tutorial = SCREEN_TUTORIALS[tutorialId];
  if (!tutorial) return;
  let stepIndex = 0;
  const dialog = document.createElement("div");
  dialog.className = "screen-tutorial";
  dialog.innerHTML = `
    <div class="screen-tutorial__backdrop" data-screen-tutorial-close></div>
    <section class="screen-tutorial__panel" role="dialog" aria-modal="true" aria-labelledby="screen-tutorial-title" tabindex="-1"></section>`;
  const panel = dialog.querySelector(".screen-tutorial__panel");

  function renderStep() {
    panel.innerHTML = renderTutorialStep(tutorial, stepIndex);
  }

  renderStep();
  document.body.append(dialog);
  document.body.classList.add("has-open-dialog");
  panel.focus();

  dialog.addEventListener("click", (event) => {
    if (event.target.closest("[data-screen-tutorial-close]")) {
      closeTutorial(dialog, tutorialId, returnFocus);
      return;
    }
    if (event.target.closest("[data-screen-tutorial-skip]")) {
      closeTutorial(dialog, tutorialId, returnFocus);
      return;
    }
    if (event.target.closest("[data-screen-tutorial-prev]")) {
      stepIndex = Math.max(0, stepIndex - 1);
      renderStep();
      panel.focus();
      return;
    }
    if (event.target.closest("[data-screen-tutorial-next]")) {
      if (stepIndex >= tutorial.steps.length - 1) {
        closeTutorial(dialog, tutorialId, returnFocus);
        return;
      }
      stepIndex += 1;
      renderStep();
      panel.focus();
    }
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTutorial(dialog, tutorialId, returnFocus);
  });
}

export function bindScreenTutorial({ root } = {}) {
  const scope = root || document;
  updateRecommendationBadges(scope);
  scope.querySelectorAll("[data-screen-tutorial-start]").forEach((button) => {
    if (button.dataset.screenTutorialBound === "true") return;
    const tutorialId = button.getAttribute("data-screen-tutorial-start") || "";
    if (!SCREEN_TUTORIALS[tutorialId]) {
      button.closest("[data-screen-tutorial-entry]")?.remove();
      return;
    }
    button.dataset.screenTutorialBound = "true";
    button.addEventListener("click", () => openScreenTutorial(tutorialId, button));
  });
}

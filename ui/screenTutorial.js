const SCREEN_TUTORIAL_STORAGE_KEY = "runload.screenTutorial.seen.v1";

const SCREEN_TUTORIALS = Object.freeze({
  "run-measurement": Object.freeze({
    title: "GPS測定の使い方",
    lead: "測定開始から記録入力までの要点だけ確認します。",
    steps: Object.freeze([
      Object.freeze({ title: "1/3 測定を開始する", body: "位置情報を許可してから測定を開始します。測定中はRunLoadを前面表示したままにします。" }),
      Object.freeze({ title: "2/3 距離とペースを見る", body: "距離・時間・現在ペース・平均ペースを確認できます。予定と連携している場合は、予定平均ペースより速い状態が続いたときに知らせます。" }),
      Object.freeze({ title: "3/3 終了して記録へ進む", body: "測定終了後、距離と時間を記録入力へ引き継ぎます。走行軌跡を保存する設定は、保存する記録と関連付けて端末内へ残します。" }),
    ]),
  }),
  "record-input": Object.freeze({
    title: "今日の記録の流れ",
    lead: "入力から保存までを3つに分けて確認します。",
    steps: Object.freeze([
      Object.freeze({ title: "1/3 今日の基本項目を入れる", body: "走行または休養を選びます。走行日は、分かる範囲で距離・時間・歩数を入れます。" }),
      Object.freeze({ title: "2/3 必要な内容だけ追加する", body: "コース、身体記録、シューズと走り方のメモは必要なときだけ開きます。すべてを毎回埋める必要はありません。" }),
      Object.freeze({ title: "3/3 記録として保存する", body: "保存すると結果画面へ進みます。予定から来たコースは、チェックした場合だけ保存コースにも残します。" }),
    ]),
  }),
  "course-library": Object.freeze({
    title: "保存したコースの使い方",
    lead: "いつものコースを今回の入力へ写す流れを確認します。",
    steps: Object.freeze([
      Object.freeze({ title: "1/3 コースを選ぶ", body: "保存したコースの中から、今日使うコースを選びます。" }),
      Object.freeze({ title: "2/3 今回の入力へ写す", body: "選んだコース名、坂道の入力方法、路面材質と割合が今回のコースへ入ります。" }),
      Object.freeze({ title: "3/3 今日の内容だけ直せる", body: "入力画面へ戻ったあと、今日だけ距離や時間を変えて記録できます。" }),
    ]),
  }),
  "course-editor": Object.freeze({
    title: "コース作成の流れ",
    lead: "次回以降も選べるコースを保存する流れです。",
    steps: Object.freeze([
      Object.freeze({ title: "1/3 コース名を入れる", body: "あとで選びやすい名前を入れます。同じ名前の扱いは保存時に確認します。" }),
      Object.freeze({ title: "2/3 坂道を区別する", body: "不明、ほぼ平坦、上り・下りの割合、坂道区間の詳細から選びます。不明を「坂の傾き0%」へ置き換えません。" }),
      Object.freeze({ title: "3/3 基本路面を選ぶ", body: "舗装路などの基本名を選びます。複数路面のときだけ割合を入力し、例外状態は必要時だけ追加します。" }),
    ]),
  }),
  result: Object.freeze({
    title: "結果画面の読み方",
    lead: "結果を点数として決めつけず、分けて見返す流れです。",
    steps: Object.freeze([
      Object.freeze({ title: "1/3 保存した記録を見る", body: "距離、時間、コースなど、自分で保存した走行事実を確認します。" }),
      Object.freeze({ title: "2/3 12部位の身体図を見る", body: "12部位それぞれについて、その部位自身の基準を100とした目安を確認します。走行距離は別の走行事実として扱い、部位どうしを順位付けしません。" }),
      Object.freeze({ title: "3/3 同じ部位の履歴を見る", body: "同じ部位・同じ計算方法・同じ基準で比べられる過去記録だけを見比べます。高低は良し悪しを示しません。" }),
    ]),
  }),
  "plan-empty": Object.freeze({
    title: "プランを始める前に",
    lead: "まだ予定候補が作れないときの進め方です。",
    steps: Object.freeze([
      Object.freeze({ title: "1/3 まず記録を作る", body: "プランは保存済みの走行記録を出発点にします。最初に今日の記録を作ります。" }),
      Object.freeze({ title: "2/3 コースを用意できる", body: "よく使うコースがある場合は、先に保存しておくと入力が楽になります。" }),
      Object.freeze({ title: "3/3 記録後に予定を作る", body: "記録が保存されると、次に走る予定を候補から考えられます。" }),
    ]),
  }),
  plan: Object.freeze({
    title: "予定を作る流れ",
    lead: "候補から予定にするまでを確認します。",
    steps: Object.freeze([
      Object.freeze({ title: "1/3 予定の種類を選ぶ", body: "走行予定または休養予定を選びます。予定は自分で入力する事実で、処方ではありません。" }),
      Object.freeze({ title: "2/3 予定条件を入力する", body: "距離、実際に走る予定時間、走り方、コースを分かる範囲で入力します。" }),
      Object.freeze({ title: "3/3 予定として保存する", body: "保存した予定は、あとで「この予定で入力」から今日の入力へ入れられます。" }),
    ]),
  }),
});

function readSeenMap() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SCREEN_TUTORIAL_STORAGE_KEY) || "{}");
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

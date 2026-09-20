import { escapeHtml } from "./commonComponents.js";

export const SCREEN_ARCHITECTURE_VERSION = "runload-screen-architecture-current-v2";

export const PRIMARY_DESTINATIONS = Object.freeze([
  Object.freeze({ screen: "home", label: "Home", description: "今日の入口", icon: "home" }),
  Object.freeze({ screen: "record-input", label: "記録", description: "走行・休養を残す", icon: "record" }),
  Object.freeze({ screen: "result", label: "結果", description: "今回の結果を見る", requiresRecord: true, icon: "result" }),
  Object.freeze({ screen: "history", label: "履歴", description: "保存した記録を比べる", icon: "history" }),
  Object.freeze({ screen: "more", label: "その他", description: "設定・共有・読みもの", icon: "more" }),
]);


const PRIMARY_SCREEN_IDS = new Set(PRIMARY_DESTINATIONS.map((item) => item.screen));

function locationParameter(currentLocation, name) {
  return String(currentLocation?.parameters?.get?.(name) || "");
}

function screenHref(screen, values = {}) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return `#/${screen}${query.size ? `?${query.toString()}` : ""}`;
}

function safeWorkflowReturn(value = "") {
  return ["#/record-input", "#/plan", "#/simulation"].some((prefix) => value.startsWith(prefix))
    ? value
    : "#/record-input";
}

function workflowReturnLabel(href = "") {
  if (href.startsWith("#/plan")) return "予定";
  if (href.startsWith("#/simulation")) return "条件比較";
  return "記録";
}

export function resolveScreenContextNavigation(screen = "", currentLocation = null) {
  if (PRIMARY_SCREEN_IDS.has(screen)) return null;

  const parameter = (name) => locationParameter(currentLocation, name);
  const recordId = parameter("recordId");

  if (screen === "course-library") {
    const backHref = safeWorkflowReturn(parameter("returnTo"));
    return { title: "コース設定", backHref, backLabel: workflowReturnLabel(backHref) };
  }

  if (screen === "course-editor") {
    const returnTo = safeWorkflowReturn(parameter("returnTo"));
    return {
      title: parameter("id") ? "コースを編集" : "新しいコース",
      backHref: screenHref("course-library", { returnTo }),
      backLabel: "コース設定",
    };
  }

  if (screen === "gpx-analysis") {
    const returnTo = safeWorkflowReturn(parameter("returnTo"));
    return {
      title: "GPX入力",
      backHref: screenHref("course-library", { returnTo }),
      backLabel: "コース設定",
    };
  }

  if (screen === "body-part-detail") {
    return {
      title: "部位詳細",
      backHref: screenHref("result", { recordId }),
      backLabel: "結果",
    };
  }

  if (screen === "activation") {
    return {
      title: "結果の活用",
      backHref: screenHref("result", { recordId }),
      backLabel: "結果",
    };
  }

  if (screen === "simulation") {
    const from = parameter("from");
    if (from === "plan") return { title: "条件比較", backHref: "#/plan", backLabel: "予定" };
    if (from === "history") return { title: "条件比較", backHref: "#/history", backLabel: "履歴" };
    if (from === "activation") {
      return {
        title: "条件比較",
        backHref: screenHref("activation", { recordId }),
        backLabel: "結果の活用",
      };
    }
    return {
      title: "条件比較",
      backHref: screenHref("result", { recordId }),
      backLabel: "結果",
    };
  }

  if (screen === "plan") {
    return { title: "次の予定", backHref: "#/home", backLabel: "Home" };
  }

  if (screen === "consultation") {
    const page = parameter("page");
    if (page === "quick" || parameter("mode")) {
      return { title: "共有メモ", backHref: "#/consultation", backLabel: "共有用にまとめる" };
    }
    if (page === "report") {
      return { title: "共有資料", backHref: "#/consultation", backLabel: "共有用にまとめる" };
    }
    return { title: "共有用にまとめる", backHref: "#/more", backLabel: "その他" };
  }

  if (screen === "support-guidance") {
    const returnTo = parameter("returnTo");
    if (returnTo.startsWith("#/record-input")) {
      return { title: "公的サポート", backHref: returnTo, backLabel: "身体の記録" };
    }
    if (returnTo.startsWith("#/consultation")) {
      return { title: "公的サポート", backHref: returnTo, backLabel: "共有用にまとめる" };
    }
    return { title: "公的サポート", backHref: "#/more", backLabel: "その他" };
  }

  if (screen === "reading") {
    if (parameter("articleId")) return { title: "記事", backHref: "#/reading", backLabel: "読みもの" };
    return { title: "読みもの", backHref: "#/more", backLabel: "その他" };
  }

  if (screen === "privacy") {
    const returnTo = parameter("returnTo");
    if (returnTo.startsWith("#/settings")) {
      return { title: "プライバシー", backHref: "#/settings", backLabel: "設定" };
    }
    return { title: "プライバシー", backHref: "#/more", backLabel: "その他" };
  }

  if (screen === "settings") {
    return { title: "設定", backHref: "#/more", backLabel: "その他" };
  }

  return null;
}

export const FEATURE_DESTINATION_GROUPS = Object.freeze([
  Object.freeze({
    label: "結果を使う",
    items: Object.freeze([
      Object.freeze({ screen: "activation", label: "結果の活用", description: "比較・共有準備・予定・読みものへ進む" }),
      Object.freeze({ screen: "simulation", label: "条件を比べる", description: "条件を変えて同じ計算モデルで確認" }),
      Object.freeze({ screen: "plan", label: "予定", description: "次の走行・休養予定を作る" }),
    ]),
  }),
  Object.freeze({
    label: "サポート・設定",
    items: Object.freeze([
      Object.freeze({ screen: "consultation", label: "共有用にまとめる", description: "指導者などに見せる内容を整理" }),
      Object.freeze({ screen: "support-guidance", label: "公的な相談先", description: "119・#7119など公式案内を確認" }),
      Object.freeze({ screen: "reading", label: "読みもの", description: "結果を理解する一般情報" }),
      Object.freeze({ screen: "privacy", label: "プライバシー", description: "保存と外部との境界を確認" }),
      Object.freeze({ screen: "settings", label: "設定", description: "表示・プロフィール・データ管理" }),
    ]),
  }),
]);

const WORKSPACE_BY_SCREEN = Object.freeze({
  home: "today",
  "record-input": "record",
  "course-library": "record",
  "course-editor": "record",
  "gpx-analysis": "record",
  result: "result",
  "body-part-detail": "result",
  activation: "result",
  simulation: "result",
  history: "records",
  plan: "plan",
  more: "more",
  "support-guidance": "more",
  consultation: "more",
  reading: "more",
  privacy: "more",
  settings: "more",
});

export function resolveScreenWorkspace(screen = "") {
  return WORKSPACE_BY_SCREEN[screen] || "today";
}

function route(screen, values = {}) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return `#/${screen}${query.size ? `?${query.toString()}` : ""}`;
}

function workspaceLink({ href, label, description, current = false }) {
  return `<a class="workspace-navigation__link${current ? " is-current" : ""}" href="${escapeHtml(href)}"${current ? ' aria-current="page"' : ""}><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></a>`;
}

export function renderResultWorkspaceNavigation({ recordId = "", date = "", regionId = "", active = "overview" } = {}) {
  const items = [
    { key: "overview", href: route("result", { recordId }), label: "今回の結果", description: "記録と12部位の結果" },
    ...(regionId ? [{ key: "region", href: route("body-part-detail", { recordId, regionId }), label: "選択した部位", description: "この部位の見方" }] : []),
    { key: "history", href: route("history", { view: "trends", period: 28, anchorDate: date, recordId, regionId }), label: "履歴", description: regionId ? "同じ部位の過去記録" : "保存した記録を見返す" },
    { key: "use", href: route("activation", { recordId }), label: "結果の活用", description: "比較・共有準備・予定・読みもの" },
  ];
  return `<nav class="workspace-navigation" data-screen-architecture="${SCREEN_ARCHITECTURE_VERSION}" aria-label="結果の関連画面">${items.map((item) => workspaceLink({ ...item, current: item.key === active })).join("")}</nav>`;
}

export function renderRecordsWorkspaceNavigation({ active = "history", date = "" } = {}) {
  const items = [
    { key: "history", href: route("history", { view: "records", anchorDate: date }), label: "履歴", description: "保存した走行・休養記録と結果" },
  ];
  return `<nav class="workspace-navigation workspace-navigation--records" data-screen-architecture="${SCREEN_ARCHITECTURE_VERSION}" aria-label="記録を見返す画面">${items.map((item) => workspaceLink({ ...item, current: item.key === active })).join("")}</nav>`;
}

export function renderManagementBoundary() {
  return `<aside class="screen-role-boundary" data-screen-architecture="${SCREEN_ARCHITECTURE_VERSION}" aria-label="設定画面の役割"><p><strong>設定とデータ管理は、記録を見る画面から分けています。</strong></p><p>ここで変更できるのは表示、任意プロフィール、バックアップ、復元、削除です。保存済みの数値結果や過去のプロフィール内容は自動で書き換えません。</p></aside>`;
}

import { escapeHtml } from "./commonComponents.js";

export const SCREEN_ARCHITECTURE_VERSION = "runload-screen-architecture-current-v1";

export const PRIMARY_DESTINATIONS = Object.freeze([
  Object.freeze({ screen: "home", label: "ホーム", description: "今日の入口", icon: "home" }),
  Object.freeze({ screen: "record-input", label: "記録", description: "走行・休養を残す", icon: "record" }),
  Object.freeze({ screen: "result", label: "結果", description: "今回の結果を見る", requiresRecord: true, icon: "result" }),
  Object.freeze({ screen: "history", label: "履歴", description: "保存した記録を比べる", icon: "history" }),
  Object.freeze({ screen: "more", label: "その他", description: "設定・相談・読みもの", icon: "more" }),
]);

export const FEATURE_DESTINATION_GROUPS = Object.freeze([
  Object.freeze({
    label: "結果を使う",
    items: Object.freeze([
      Object.freeze({ screen: "activation", label: "結果の活用", description: "比較・相談・予定・読みものへ進む" }),
      Object.freeze({ screen: "simulation", label: "条件を比べる", description: "条件を変えて同じ計算モデルで確認" }),
      Object.freeze({ screen: "plan", label: "予定", description: "次の走行・休養予定を作る" }),
    ]),
  }),
  Object.freeze({
    label: "その他",
    items: Object.freeze([
      Object.freeze({ screen: "consultation", label: "相談", description: "見せる内容を整理" }),
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
    { key: "use", href: route("activation", { recordId }), label: "結果の活用", description: "比較・相談・予定・読みもの" },
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

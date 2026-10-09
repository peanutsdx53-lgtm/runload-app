export const PRIMARY_DESTINATIONS = Object.freeze([
  Object.freeze({ screen: "home", label: "ホーム", description: "今日の入口", icon: "home" }),
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
  return ["#/home", "#/record-input", "#/plan", "#/simulation"].some((prefix) => value.startsWith(prefix))
    ? value
    : "#/record-input";
}

function workflowReturnLabel(href = "") {
  if (href.startsWith("#/home")) return "ホーム";
  if (href.startsWith("#/plan")) return "予定";
  if (href.startsWith("#/simulation")) return "条件比較";
  return "記録";
}

function homeUtilityReturn() {
  return { backHref: "#/home", backLabel: "ホーム" };
}

function interpretationReturnContext(parameter, recordId = "") {
  if (parameter("from") !== "interpretation-room") return null;
  const roomOrigin = parameter("roomOrigin") || "result";
  const regionId = parameter("regionId");
  return {
    title: "結果の整理",
    backHref: screenHref("interpretation-room", {
      recordId,
      origin: roomOrigin,
      regionId,
    }),
    backLabel: "結果の整理",
  };
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

  if (screen === "run-route") {
    return {
      title: "走行軌跡",
      backHref: screenHref("result", { recordId }),
      backLabel: "結果",
    };
  }

  if (screen === "body-timeline") {
    return {
      title: "身体の推移",
      backHref: screenHref("result", { recordId }),
      backLabel: "結果",
    };
  }

  if (screen === "body-part-detail") {
    return {
      title: "部位詳細",
      backHref: screenHref("result", { recordId }),
      backLabel: "結果",
    };
  }

  if (screen === "interpretation-room") {
    const origin = parameter("origin");
    const regionId = parameter("regionId");
    const interpretationTitle = "今回を見比べる";
    if (origin === "history") {
      return { title: interpretationTitle, backHref: screenHref("history", { recordId }), backLabel: "履歴" };
    }
    if (origin === "body-part-detail" && regionId) {
      return { title: interpretationTitle, backHref: screenHref("body-part-detail", { recordId, regionId }), backLabel: "部位詳細" };
    }
    if (origin === "simulation") {
      return { title: interpretationTitle, backHref: screenHref("simulation", { recordId, from: "interpretation-room" }), backLabel: "条件比較" };
    }
    if (origin === "home") {
      return { title: interpretationTitle, backHref: "#/home", backLabel: "ホーム" };
    }
    return { title: interpretationTitle, backHref: screenHref("result", { recordId }), backLabel: "結果" };
  }

  if (screen === "simulation") {
    const from = parameter("from");
    if (from === "home") return { title: "条件比較", backHref: "#/home", backLabel: "ホーム" };
    if (from === "plan") return { title: "条件比較", backHref: safeWorkflowReturn(parameter("returnTo") || "#/plan"), backLabel: "予定" };
    if (from === "history") return { title: "条件比較", backHref: "#/history", backLabel: "履歴" };
    if (from === "interpretation-room") {
      const roomOrigin = parameter("roomOrigin");
      return {
        title: "条件比較",
        backHref: screenHref("interpretation-room", { recordId, origin: roomOrigin || "result" }),
        backLabel: "結果の整理",
      };
    }
    return {
      title: "条件比較",
      backHref: screenHref("result", { recordId }),
      backLabel: "結果",
    };
  }

  if (screen === "achievements") return { title: "実績", backHref: "#/home", backLabel: "ホーム" };
  if (screen === "departure-check") return { title: "出発チェック", ...homeUtilityReturn() };
  if (screen === "pace-tool") return { title: "ペース換算", ...homeUtilityReturn() };

  if (screen === "plan") {
    const interpretationReturn = interpretationReturnContext(parameter, recordId || parameter("sourceRecordId"));
    if (interpretationReturn) return { ...interpretationReturn, title: "次の予定" };
    return { title: "次の予定", backHref: "#/home", backLabel: "ホーム" };
  }

  if (screen === "consultation") {
    const interpretationReturn = interpretationReturnContext(parameter, recordId);
    if (interpretationReturn) return { ...interpretationReturn, title: "共有用にまとめる" };
    if (parameter("from") === "home") {
      return { title: "共有用にまとめる", backHref: "#/home", backLabel: "ホーム" };
    }
    if (recordId) {
      return { title: "共有用にまとめる", backHref: screenHref("result", { recordId }), backLabel: "結果" };
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
    const origin = parameter("origin");
    const regionId = parameter("regionId");
    const articleId = parameter("articleId");
    const interpretationReturn = interpretationReturnContext(parameter, recordId);
    if (interpretationReturn) return { ...interpretationReturn, title: "読みもの" };
    if (origin === "result-condition" && recordId && regionId) {
      return {
        title: "読みもの",
        backHref: screenHref("body-part-detail", { recordId, regionId }),
        backLabel: "部位結果",
      };
    }
    if (articleId) return { title: "読みもの", backHref: "#/reading", backLabel: "読みもの" };
    if (origin === "home") return { title: "読みもの", backHref: "#/home", backLabel: "ホーム" };
    return { title: "読みもの", backHref: "#/more", backLabel: "その他" };
  }

  if (screen === "privacy") {
    const returnTo = parameter("returnTo");
    if (returnTo.startsWith("#/settings")) {
      return { title: "プライバシー", backHref: "#/settings", backLabel: "設定" };
    }
    if (returnTo.startsWith("#/terms")) {
      return { title: "プライバシー", backHref: "#/terms", backLabel: "利用規約" };
    }
    return { title: "プライバシー", backHref: "#/more", backLabel: "その他" };
  }

  if (screen === "terms") {
    const returnTo = parameter("returnTo");
    if (returnTo.startsWith("#/settings")) {
      return { title: "利用規約", backHref: "#/settings", backLabel: "設定" };
    }
    return { title: "利用規約", backHref: "#/more", backLabel: "その他" };
  }

  if (screen === "about") {
    return { title: "このアプリについて", backHref: "#/more", backLabel: "その他" };
  }

  if (screen === "settings") {
    if (parameter("from") === "home") return { title: "設定", backHref: "#/home", backLabel: "ホーム" };
    return { title: "設定", backHref: "#/more", backLabel: "その他" };
  }

  return null;
}

export const FEATURE_DESTINATION_GROUPS = Object.freeze([
  Object.freeze({
    label: "結果を使う",
    items: Object.freeze([
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
      Object.freeze({ screen: "terms", label: "利用規約", description: "利用条件を確認" }),
      Object.freeze({ screen: "settings", label: "設定", description: "表示・プロフィール・データ管理" }),
    ]),
  }),
]);


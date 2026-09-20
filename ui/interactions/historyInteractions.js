function formEntries(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function historyEntriesFromHref(href = "") {
  const raw = String(href || "");
  if (!raw.startsWith("#/history")) return null;
  const queryIndex = raw.indexOf("?");
  return queryIndex >= 0
    ? Object.fromEntries(new URLSearchParams(raw.slice(queryIndex + 1)).entries())
    : {};
}

function currentHistoryEntries() {
  const hash = String(window.location.hash || "");
  const queryIndex = hash.indexOf("?");
  return queryIndex >= 0
    ? Object.fromEntries(new URLSearchParams(hash.slice(queryIndex + 1)).entries())
    : {};
}

function navigateHistoryHref(router, href) {
  const entries = historyEntriesFromHref(href);
  if (entries == null) return false;
  router.navigateToScreen("history", entries);
  return true;
}

export function bindHistory({ services, router, rerender }) {
  document.querySelectorAll("[data-history-href]").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.preventDefault();
      navigateHistoryHref(router, control.dataset.historyHref || "");
    });
  });

  const recordFilterForm = document.getElementById("history-record-filter-form");
  recordFilterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    router.navigateToScreen("history", formEntries(event.currentTarget));
  });
  document.querySelectorAll("[data-history-record-type]").forEach((control) => {
    control.addEventListener("click", () => {
      const entries = recordFilterForm ? formEntries(recordFilterForm) : currentHistoryEntries();
      entries.activityType = String(control.dataset.historyRecordType || "all");
      router.navigateToScreen("history", entries);
    });
  });

  document.getElementById("regional-history-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    router.navigateToScreen("history", formEntries(event.currentTarget));
  });
  document.getElementById("subjective-history-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    router.navigateToScreen("history", formEntries(event.currentTarget));
  });

  const regionOverlay = document.querySelector("[data-history-region-overlay]");
  const closeRegionPicker = () => {
    if (regionOverlay) regionOverlay.hidden = true;
  };
  document.querySelector('[data-action="open-history-region-picker"]')?.addEventListener("click", () => {
    if (regionOverlay) regionOverlay.hidden = false;
  });
  document.querySelector('[data-action="close-history-region-picker"]')?.addEventListener("click", closeRegionPicker);
  regionOverlay?.addEventListener("click", (event) => {
    if (event.target === regionOverlay) closeRegionPicker();
  });
  document.querySelectorAll("[data-history-region-id]").forEach((control) => {
    control.addEventListener("click", () => {
      const regionId = String(control.dataset.historyRegionId || "");
      if (!regionId) return;
      const entries = currentHistoryEntries();
      entries.view = "trends";
      entries.metric = "region";
      entries.regionId = regionId;
      delete entries.recordId;
      closeRegionPicker();
      router.navigateToScreen("history", entries);
    });
  });

  document.querySelectorAll('[data-action="delete-history-record"]').forEach((button) => button.addEventListener("click", () => {
    const label = button.dataset.recordLabel || "この記録";
    if (!window.confirm(`${label}を削除しますか？`)) return;
    const result = services.workflows.history.deleteRecord(button.dataset.recordId || "");
    if (result.ok) rerender();
    else window.alert("記録を削除できませんでした。端末の保存状態を確認してください。");
  }));
  document.querySelector('[data-action="undo-history-delete"]')?.addEventListener("click", () => {
    const result = services.workflows.history.undoDelete();
    if (result.ok) rerender();
    else window.alert("削除した記録を元に戻せませんでした。端末の保存状態を確認してください。");
  });
}

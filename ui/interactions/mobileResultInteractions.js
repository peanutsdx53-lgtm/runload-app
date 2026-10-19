function setView(root, view) {
  root.querySelectorAll("[data-result-mobile-view]").forEach((button) => {
    const active = button.dataset.resultMobileView === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  root.querySelectorAll("[data-result-region-mobile-list]").forEach((list) => {
    list.hidden = list.dataset.resultRegionMobileList !== view;
  });
}

export function bindMobileResult() {
  const root = document.querySelector(".screen-layout--result");
  if (!root) return null;
  const sheet = root.querySelector("[data-result-region-sheet]");
  // The selected third history trace is pre-rendered read-only; no recalculation
  // or modification of saved records occurs when the user changes the option.
  root.querySelector("[data-running-radar-select]")?.addEventListener("change", (event) => {
    const radar = root.querySelector("[data-running-radar]");
    const selected = event.target.selectedOptions?.[0];
    const count = radar?.querySelector("[data-running-radar-history-count]");
    if (count && selected) count.textContent = `${selected.dataset.available || "0"}/6`;
    radar?.querySelectorAll("[data-running-radar-layer]").forEach(layer => {
      if (!layer.classList.contains("running-radar__series--history")) return;
      layer.hidden = layer.getAttribute("data-running-radar-layer") !== event.target.value;
    });
  });
  root.querySelectorAll("[data-result-mobile-view]").forEach((button) => {
    button.addEventListener("click", () => setView(root, button.dataset.resultMobileView));
  });
  root.querySelector('[data-action="open-result-region-sheet"]')?.addEventListener("click", () => {
    if (!sheet) return;
    sheet.hidden = false;
    document.body.classList.add("has-open-dialog");
    sheet.querySelector("button")?.focus();
  });
  const close = () => {
    if (!sheet) return;
    sheet.hidden = true;
    document.body.classList.remove("has-open-dialog");
    root.querySelector('[data-action="open-result-region-sheet"]')?.focus();
  };
  root.querySelector('[data-action="close-result-region-sheet"]')?.addEventListener("click", close);
  sheet?.addEventListener("click", (event) => { if (event.target === sheet) close(); });
  const onKeyDown = (event) => { if (event.key === "Escape" && sheet && !sheet.hidden) close(); };
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}

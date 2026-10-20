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
  // Experimental radar: read-only UI controls; no persistence or model changes.
  const radar = root.querySelector("[data-running-radar]");
  const picker = radar?.querySelector("[data-running-radar-select]");
  const syncValues = () => {
    if (!radar) return;
    const selectedId = picker?.value || "";
    radar.querySelectorAll("[data-running-radar-axis-panel]:not([hidden])").forEach(panel => {
      const slot = panel.querySelector("[data-running-radar-history-value-slot]");
      const selected = [...panel.querySelectorAll("[data-running-radar-history-value]")]
        .find(node => node.getAttribute("data-running-radar-history-value") === selectedId);
      if (slot) slot.textContent = selected?.textContent || "—";
    });
  };
  picker?.addEventListener("change", () => {
    const item = picker.selectedOptions?.[0];
    const count = radar.querySelector("[data-running-radar-history-count]");
    if (count) count.textContent = `${item?.dataset.available || "0"}/6`;
    radar.querySelectorAll("[data-running-radar-layer]").forEach(layer => {
      if (!layer.classList.contains("running-radar__series--history")) return;
      if (layer.getAttribute("data-running-radar-layer") === picker.value) layer.removeAttribute("hidden");
      else layer.setAttribute("hidden", "hidden");
    });
    syncValues();
  });
  radar?.querySelectorAll("[data-running-radar-axis]").forEach(button => button.addEventListener("click", () => {
    radar.querySelectorAll("[data-running-radar-axis]").forEach(item => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    const axis = button.getAttribute("data-running-radar-axis");
    radar.querySelectorAll("[data-running-radar-axis-panel]").forEach(panel => {
      panel.hidden = panel.getAttribute("data-running-radar-axis-panel") !== axis;
    });
    radar.querySelectorAll("[data-running-radar-focus-ray]").forEach(ray => {
      if (ray.getAttribute("data-running-radar-focus-ray") === axis) ray.removeAttribute("hidden");
      else ray.setAttribute("hidden", "hidden");
    });
    syncValues();
  }));
  syncValues();
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

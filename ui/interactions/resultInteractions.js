function bindResultRegionControls() {
  const root = document.querySelector(".screen-layout--result");
  if (!root) return;
  const sheet = root.querySelector("[data-result-region-sheet]");

  const setView = (view, mobile = false) => {
    const buttonAttr = mobile ? "data-result-mobile-view" : "data-result-view";
    const listAttr = mobile ? "data-result-region-mobile-list" : "data-result-region-list";
    root.querySelectorAll(`[${buttonAttr}]`).forEach((button) => {
      const active = button.getAttribute(buttonAttr) === view;
      button.classList.toggle("active", active);
      if (mobile) button.setAttribute("aria-selected", String(active));
    });
    root.querySelectorAll(`[${listAttr}]`).forEach((list) => {
      list.hidden = list.getAttribute(listAttr) !== view;
    });
  };

  root.querySelectorAll("[data-result-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.resultView, false));
  });
  root.querySelectorAll("[data-result-mobile-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.resultMobileView, true));
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
  sheet?.addEventListener("click", (event) => {
    if (event.target === sheet) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sheet && !sheet.hidden) close();
  }, { once: true });
}

function bindPcResultConsole() {
  const consoleRoot = document.querySelector(".pc-result-console");
  if (!consoleRoot) return;

  const linked = (regionId) => consoleRoot.querySelectorAll(`[data-region-id="${CSS.escape(regionId)}"]`);

  const setSelectedRegion = (regionId) => {
    if (!regionId) return;
    consoleRoot.querySelectorAll("[data-region-id]").forEach((node) => {
      const active = node.getAttribute("data-region-id") === regionId;
      node.classList.toggle("is-selected", active);
      if (node.matches("[data-pc-region-select]")) node.setAttribute("aria-pressed", String(active));
    });
    consoleRoot.querySelectorAll("[data-pc-detail-region]").forEach((panel) => {
      const active = panel.getAttribute("data-pc-detail-region") === regionId;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
  };

  consoleRoot.addEventListener("click", (event) => {
    const regionNode = event.target.closest("[data-region-id]");
    if (regionNode && consoleRoot.contains(regionNode)) {
      const regionId = regionNode.getAttribute("data-region-id");
      if (regionId) {
        event.preventDefault();
        setSelectedRegion(regionId);
      }
    }

    const modeButton = event.target.closest("[data-pc-insight-mode]");
    if (modeButton) {
      const mode = modeButton.getAttribute("data-pc-insight-mode");
      consoleRoot.querySelectorAll("[data-pc-insight-mode]").forEach((button) => {
        const active = button.getAttribute("data-pc-insight-mode") === mode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
      });
      const detail = consoleRoot.querySelector("[data-pc-detail-stack]");
      const compare = consoleRoot.querySelector("[data-pc-compare-panel]");
      if (detail) detail.hidden = mode !== "detail";
      if (compare) compare.hidden = mode !== "compare";
    }

    const displayButton = event.target.closest("[data-pc-compare-display]");
    if (displayButton) {
      const display = displayButton.getAttribute("data-pc-compare-display");
      consoleRoot.querySelectorAll("[data-pc-compare-display]").forEach((button) => {
        const active = button.getAttribute("data-pc-compare-display") === display;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      consoleRoot.querySelectorAll("[data-pc-compare-value]").forEach((value) => {
        value.hidden = value.getAttribute("data-pc-compare-value") !== display;
      });
    }
  });

  consoleRoot.addEventListener("mouseover", (event) => {
    const node = event.target.closest("[data-region-id]");
    const regionId = node?.getAttribute("data-region-id");
    if (!regionId) return;
    linked(regionId).forEach((item) => item.classList.add("is-linked-hover"));
  });

  consoleRoot.addEventListener("mouseout", (event) => {
    const node = event.target.closest("[data-region-id]");
    const regionId = node?.getAttribute("data-region-id");
    if (!regionId) return;
    const related = event.relatedTarget?.closest?.(`[data-region-id="${CSS.escape(regionId)}"]`);
    if (related && consoleRoot.contains(related)) return;
    linked(regionId).forEach((item) => item.classList.remove("is-linked-hover"));
  });
}

export function bindResult() {
  bindResultRegionControls();
  bindPcResultConsole();
}

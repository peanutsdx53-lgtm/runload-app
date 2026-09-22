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

export function bindResult() {
  bindResultRegionControls();
}

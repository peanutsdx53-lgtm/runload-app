export function bindReading({ router }) {
  const root = document.querySelector("[data-reading-screen]");
  if (root) {
    const drawer = root.querySelector("[data-reading-drawer]");
    const details = [...root.querySelectorAll("[data-reading-detail]")];
    const count = root.querySelector("[data-reading-count]");
    let returnFocus = null;
    const openArticle = (id, trigger = null) => {
      const target = details.find((item) => item.dataset.readingDetail === id);
      if (!target || !drawer) return;
      returnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
      details.forEach((item) => { item.hidden = item !== target; });
      drawer.hidden = false;
      const sheet = drawer.querySelector(".sheet");
      if (sheet) sheet.scrollTop = 0;
      document.body.classList.add("has-open-dialog");
      target.querySelector("[data-reading-close]")?.focus();
    };
    const closeArticle = () => {
      if (!drawer || drawer.hidden) return;
      drawer.hidden = true;
      details.forEach((item) => { item.hidden = true; });
      document.body.classList.remove("has-open-dialog");
      if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus();
      returnFocus = null;
    };
    root.querySelectorAll("[data-reading-open]").forEach((button) => button.addEventListener("click", () => openArticle(button.dataset.readingOpen || "", button)));
    root.querySelectorAll("[data-reading-close]").forEach((button) => button.addEventListener("click", closeArticle));
    drawer?.addEventListener("click", (event) => { if (event.target === drawer) closeArticle(); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && drawer && !drawer.hidden) closeArticle();
    });
    root.querySelectorAll("[data-reading-filter]").forEach((button) => button.addEventListener("click", () => {
      const filter = button.dataset.readingFilter || "all";
      root.querySelectorAll("[data-reading-filter]").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      let visible = 0;
      root.querySelectorAll("[data-reading-card]").forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.cat !== filter;
        if (!card.hidden) visible += 1;
      });
      if (count) count.textContent = `${visible}件`;
    }));
    const initial = root.dataset.readingInitialArticle || "";
    if (initial) queueMicrotask(() => openArticle(initial));
    return;
  }

  const searchForm = document.getElementById("column-search-form");
  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    router.navigateToScreen("reading", Object.fromEntries(new FormData(searchForm).entries()));
  });
}

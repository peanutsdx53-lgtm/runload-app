export function bindReading({ router }) {
  const root = document.querySelector("[data-reading-screen]");
  if (root) {
    const drawer = root.querySelector("[data-reading-drawer]");
    const details = [...root.querySelectorAll("[data-reading-detail]")];
    const cards = [...root.querySelectorAll("[data-reading-card]")];
    const count = root.querySelector("[data-reading-count]");
    const empty = root.querySelector("[data-reading-empty]");
    const search = root.querySelector("[data-reading-search]");
    const clearSearch = root.querySelector("[data-reading-search-clear]");
    const reset = root.querySelector("[data-reading-reset]");
    let activeFilter = "all";
    let query = "";
    let returnFocus = null;
    const normalize = (value = "") => String(value).normalize("NFKC").toLocaleLowerCase("ja-JP").trim();

    const applyFilters = () => {
      let visible = 0;
      cards.forEach((card) => {
        const filterMatches = activeFilter === "all" || card.dataset.cat === activeFilter;
        const searchMatches = !query || normalize(card.dataset.readingSearch || "").includes(query);
        card.hidden = !(filterMatches && searchMatches);
        if (!card.hidden) visible += 1;
      });
      if (count) count.textContent = `${visible}件`;
      if (empty) empty.hidden = visible !== 0;
      if (clearSearch) clearSearch.hidden = !query;
    };

    const setFilter = (filter, sourceButton = null) => {
      activeFilter = filter || "all";
      root.querySelectorAll("[data-reading-filter]").forEach((item) => {
        const selected = item.dataset.readingFilter === activeFilter;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      sourceButton?.focus({ preventScroll: true });
      applyFilters();
    };

    const openArticle = (id, trigger = null) => {
      const target = details.find((item) => item.dataset.readingDetail === id);
      if (!target || !drawer) return;
      const alreadyOpen = !drawer.hidden;
      if (!alreadyOpen) returnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
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

    root.querySelectorAll("[data-reading-filter]").forEach((button) => button.addEventListener("click", () => setFilter(button.dataset.readingFilter || "all", button)));
    search?.addEventListener("input", () => {
      query = normalize(search.value);
      applyFilters();
    });
    clearSearch?.addEventListener("click", () => {
      if (search) {
        search.value = "";
        search.focus();
      }
      query = "";
      applyFilters();
    });
    reset?.addEventListener("click", () => {
      if (search) search.value = "";
      query = "";
      setFilter("all");
      search?.focus();
    });

    applyFilters();
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

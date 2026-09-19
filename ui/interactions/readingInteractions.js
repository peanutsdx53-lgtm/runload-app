export function bindReading({ router }) {
  const root = document.querySelector("[data-prototype-reading]");
  if (root) {
    const drawer = root.querySelector("[data-reading-drawer]");
    const details = [...root.querySelectorAll("[data-reading-detail]")];
    const openArticle = (id) => {
      const target = details.find((item) => item.dataset.readingDetail === id);
      if (!target || !drawer) return;
      details.forEach((item) => { item.hidden = item !== target; });
      drawer.hidden = false;
      document.body.classList.add("has-open-dialog");
      drawer.querySelector("[data-reading-close]")?.focus();
    };
    const closeArticle = () => {
      if (!drawer) return;
      drawer.hidden = true;
      details.forEach((item) => { item.hidden = true; });
      document.body.classList.remove("has-open-dialog");
    };
    root.querySelectorAll("[data-reading-open]").forEach((button) => button.addEventListener("click", () => openArticle(button.dataset.readingOpen || "")));
    root.querySelectorAll("[data-reading-close]").forEach((button) => button.addEventListener("click", closeArticle));
    drawer?.addEventListener("click", (event) => { if (event.target === drawer) closeArticle(); });
    root.querySelectorAll("[data-reading-filter]").forEach((button) => button.addEventListener("click", () => {
      const filter = button.dataset.readingFilter || "all";
      root.querySelectorAll("[data-reading-filter]").forEach((item) => item.classList.toggle("active", item === button));
      root.querySelectorAll("[data-reading-card]").forEach((card) => { card.hidden = filter !== "all" && card.dataset.cat !== filter; });
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

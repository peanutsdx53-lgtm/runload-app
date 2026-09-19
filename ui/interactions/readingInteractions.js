export function bindReading({ router }) {
  const searchForm = document.getElementById("column-search-form");
  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    router.navigateToScreen("reading", Object.fromEntries(new FormData(searchForm).entries()));
  });
}

import { resolveResultExplorationEntry } from "../explorationTreeData.js";

export function bindDesktopResult({ services } = {}) {
  const consoleRoot = document.querySelector(".pc-result-console");
  if (!consoleRoot) return null;
  // The comparison renderer is science-protected: switch only its standard
  // Result navigation after the real support decision has been read.
  // The original route remains available for non-normal and unverified cases.
  const entryLink=consoleRoot.querySelector("[data-result-next-interpretation]");
  if (entryLink) {
    const params=new URLSearchParams((entryLink.getAttribute("href")||"").split("?")[1]||"");
    const id=String(params.get("recordId")||"");
    const exp=id?services?.workflows?.records?.loadExperience?.(id):null;
    const candidate=resolveResultExplorationEntry({
      services,
      record:exp?.record||null,
      origin:"result",
      regionId:String(params.get("regionId")||""),
    });
    if(candidate.mode==="EXPLORATION") {
      entryLink.setAttribute("href",candidate.href);
      const title=entryLink.querySelector("strong");
      if(title)title.textContent=candidate.label;
    }
  }
  const cssEscape = (value) => globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
  const linked = (regionId) => consoleRoot.querySelectorAll(`[data-region-id="${cssEscape(regionId)}"]`);
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
    const nextLink = consoleRoot.querySelector("[data-result-next-interpretation]");
    if (nextLink) {
      const url = new URL(nextLink.getAttribute("href"), window.location.href);
      const hash = new URLSearchParams(url.hash.split("?")[1] || "");
      hash.set("regionId", regionId);
      const route = url.hash.split("?")[0] || "#/interpretation-room";
      nextLink.setAttribute("href", `${route}?${hash.toString()}`);
    }
  };
  const setSummaryMode = (mode) => {
    consoleRoot.classList.toggle("is-summary-change", mode === "change");
    consoleRoot.querySelectorAll("[data-pc-summary-mode]").forEach((button) => {
      const active = button.getAttribute("data-pc-summary-mode") === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    consoleRoot.querySelectorAll("[data-pc-summary-view]").forEach((view) => { view.hidden = view.getAttribute("data-pc-summary-view") !== mode; });
    consoleRoot.querySelectorAll("[data-pc-summary-hint]").forEach((hint) => { hint.hidden = hint.getAttribute("data-pc-summary-hint") !== mode; });
  };
  consoleRoot.addEventListener("click", (event) => {
    const modeButton = event.target.closest("[data-pc-summary-mode]");
    if (modeButton) return setSummaryMode(modeButton.getAttribute("data-pc-summary-mode"));
    const regionNode = event.target.closest("[data-region-id]");
    if (regionNode && consoleRoot.contains(regionNode)) { event.preventDefault(); setSelectedRegion(regionNode.getAttribute("data-region-id")); }
  });
  consoleRoot.addEventListener("mouseover", (event) => {
    const regionId = event.target.closest("[data-region-id]")?.getAttribute("data-region-id");
    if (regionId) linked(regionId).forEach((item) => item.classList.add("is-linked-hover"));
  });
  consoleRoot.addEventListener("mouseout", (event) => {
    const regionId = event.target.closest("[data-region-id]")?.getAttribute("data-region-id");
    if (!regionId) return;
    const related = event.relatedTarget?.closest?.(`[data-region-id="${cssEscape(regionId)}"]`);
    if (related && consoleRoot.contains(related)) return;
    linked(regionId).forEach((item) => item.classList.remove("is-linked-hover"));
  });
  setSummaryMode("overview");
  return null;
}

import { bindSimulation } from "./simulationInteractions.js";

function tabForItem(id = "") {
  if (id === "distanceKm") return "distance";
  if (id === "durationMinutes") return "time";
  if (id === "courseJson") return "course";
  if (["runningFormat", "runningDistanceKm", "runningDurationMinutes"].includes(id)) return "format";
  return "";
}

const mobileEnhancement = Object.freeze({
  renderGroupExpansionControl({ state, group }) {
    return state !== "reference" && group.length > 3
      ? `<button type="button" class="simulation-mobile-group-toggle" data-simulation-mobile-group-toggle hidden data-total="${group.length}">残り${group.length - 3}部位を見る</button>`
      : "";
  },
  bind({ form, changedConditionItems, update }) {
    const state = { focus: "distance", picker: form.querySelector("[data-simulation-picker]"), sections: [...form.querySelectorAll("[data-simulation-condition-section]")] };
    state.picker?.addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-simulation-picker-tab]");
      if (!button) return;
      state.focus = String(button.dataset.simulationPickerTab || "distance");
      this.sync({ form, changedItems: changedConditionItems(new FormData(form)), state });
      form.querySelector(`[data-simulation-condition-section="${state.focus}"] input, [data-simulation-condition-section="${state.focus}"] select`)?.focus({ preventScroll: true });
      update();
    });
    return state;
  },
  initialize({ state, changedItems }) {
    const initial = tabForItem(changedItems[0]?.id || "");
    if (initial && state) state.focus = initial;
  },
  sync({ form, changedItems, state }) {
    if (!state) return;
    state.sections.forEach((section) => { section.hidden = String(section.dataset.simulationConditionSection || "") !== state.focus; });
    form.querySelectorAll("[data-simulation-picker-tab]").forEach((button) => {
      const tab = String(button.dataset.simulationPickerTab || "");
      const active = tab === state.focus;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
      const changed = changedItems.some((item) => tabForItem(item.id) === tab);
      button.classList.toggle("is-changed", changed);
      const label = form.querySelector(`[data-simulation-tab-state="${tab}"]`);
      if (label) label.textContent = changed ? "変更あり" : active ? "表示中" : "未変更";
    });
    const idleCopy = document.querySelector(".condition-compare-overview-idle p");
    if (idleCopy) idleCopy.textContent = "下の項目から1つ選んで変更すると、元の保存記録との差を表示します。";
  },
  showMultiWarning({ changedItems }) { return changedItems.length > 1; },
  bindResultGroups({ target }) {
    target.querySelectorAll(".simulation-change-group").forEach((group) => {
      const rows = [...group.querySelectorAll(".simulation-change-row")];
      const button = group.querySelector("[data-simulation-mobile-group-toggle]");
      if (!button || rows.length <= 3) return;
      group.classList.add("is-mobile-truncated");
      button.hidden = false;
      button.textContent = `残り${rows.length - 3}部位を見る`;
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", () => {
        const expanded = group.classList.toggle("is-mobile-expanded");
        button.setAttribute("aria-expanded", String(expanded));
        button.textContent = expanded ? "表示を戻す" : `残り${rows.length - 3}部位を見る`;
      });
    });
  },
  reset({ state }) { if (state) state.focus = "distance"; },
});

export function bindMobileSimulation(args) {
  return bindSimulation(args, mobileEnhancement);
}

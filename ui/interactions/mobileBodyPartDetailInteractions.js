export function bindBodyPartDetail() {
  const root = document.querySelector(".screen--body-part-detail");
  const detail = root?.querySelector("[data-trend-detail]");
  const targets = [...(root?.querySelectorAll("[data-trend-point-index]") || [])];
  if (!root || !detail || !targets.length) return null;

  const dateNode = detail.querySelector("[data-trend-detail-date]");
  const valueNode = detail.querySelector("[data-trend-detail-value]");
  const factsNode = detail.querySelector("[data-trend-detail-facts]");

  const select = (target) => {
    const index = Number(target?.dataset?.trendPointIndex);
    if (!Number.isInteger(index) || index < 0 || index >= targets.length) return;
    targets.forEach((item, itemIndex) => item.classList.toggle("is-selected", itemIndex === index));
    detail.dataset.selectedIndex = String(index);
    if (dateNode) dateNode.textContent = target.dataset.trendDate || "保存記録";
    if (valueNode) valueNode.textContent = target.dataset.trendValue || "—";
    if (factsNode) {
      const facts = [];
      if (target.dataset.trendDistance) facts.push(`${target.dataset.trendDistance} km`);
      if (target.dataset.trendDuration) facts.push(`${target.dataset.trendDuration}分`);
      factsNode.textContent = facts.join(" ・ ") || "距離・時間の記録なし";
    }
  };

  const handlers = targets.map((target) => {
    const onClick = () => select(target);
    const onKeyDown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select(target);
      }
    };
    target.addEventListener("click", onClick);
    target.addEventListener("keydown", onKeyDown);
    return [target, onClick, onKeyDown];
  });
  select(targets[targets.length - 1]);
  return () => handlers.forEach(([target, onClick, onKeyDown]) => {
    target.removeEventListener("click", onClick);
    target.removeEventListener("keydown", onKeyDown);
  });
}

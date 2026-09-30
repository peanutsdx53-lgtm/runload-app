export function bindBodyTimeline() {
  const root = document.querySelector("[data-body-timeline]");
  const rail = root?.querySelector("[data-body-timeline-rail]");
  if (!root || !rail) return undefined;
  const cards = [...rail.querySelectorAll("[data-body-timeline-card]")];
  const dots = [...root.querySelectorAll("[data-body-timeline-dot]")];
  const initialIndex = Math.max(0, Math.min(cards.length - 1, Number(root.dataset.targetIndex || 0)));
  let currentIndex = initialIndex;

  function updateDots(index) {
    currentIndex = index;
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === index);
      if (dotIndex === index) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  function scrollToIndex(index, behavior = "smooth") {
    const card = cards[index];
    if (!card) return;
    updateDots(index);
    card.scrollIntoView({ behavior, block: "nearest", inline: "center" });
  }

  dots.forEach((dot, index) => dot.addEventListener("click", () => scrollToIndex(index)));
  let frame = 0;
  const onScroll = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      const center = rail.scrollLeft + rail.clientWidth / 2;
      let nearest = currentIndex;
      let distance = Number.POSITIVE_INFINITY;
      cards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const delta = Math.abs(cardCenter - center);
        if (delta < distance) {
          distance = delta;
          nearest = index;
        }
      });
      if (nearest !== currentIndex) updateDots(nearest);
    });
  };
  rail.addEventListener("scroll", onScroll, { passive: true });
  requestAnimationFrame(() => scrollToIndex(initialIndex, "auto"));
  return () => {
    rail.removeEventListener("scroll", onScroll);
    if (frame) cancelAnimationFrame(frame);
  };
}

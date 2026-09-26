export const MOBILE_LAYOUT_QUERY = "(max-width: 54.99rem)";

const FALLBACK_MOBILE_MAX_WIDTH_PX = 879;

export function matchesMobileLayout({ matchMediaFn, innerWidth } = {}) {
  const mediaFn = matchMediaFn
    || (typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia.bind(window)
      : null);
  if (mediaFn) return Boolean(mediaFn(MOBILE_LAYOUT_QUERY).matches);

  const width = Number(
    innerWidth ?? (typeof window !== "undefined" ? window.innerWidth : Number.NaN)
  );
  return Number.isFinite(width) ? width <= FALLBACK_MOBILE_MAX_WIDTH_PX : true;
}

export function resolveDefaultEntryScreen() {
  return "home";
}

export function resolveViewportDefaultEntryScreen(options = {}) {
  return resolveDefaultEntryScreen({ matchesMobile: matchesMobileLayout(options) });
}

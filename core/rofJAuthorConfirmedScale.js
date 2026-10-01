export const ROF_J_PRESENTATION_VERSION = "ROF_J_AUTHOR_CONFIRMED_2026_10_01";

export const ROF_J_AUTHOR_CONFIRMED_ANCHORS = Object.freeze([
  Object.freeze({
    position: 10,
    positionLabel: "10",
    descriptor: "完全な疲労困憊（何も残っていない状態）",
    visualKey: "highest",
  }),
  Object.freeze({
    position: 7.5,
    positionLabel: "7と8の間",
    descriptor: "とても疲れている",
    visualKey: "high",
  }),
  Object.freeze({
    position: 5,
    positionLabel: "5",
    descriptor: "中程度に疲れている",
    visualKey: "moderate",
  }),
  Object.freeze({
    position: 2.5,
    positionLabel: "2と3の間",
    descriptor: "少し疲れている",
    visualKey: "low",
  }),
  Object.freeze({
    position: 0,
    positionLabel: "0",
    descriptor: "まったく疲れていない",
    visualKey: "lowest",
  }),
]);

const ASCENDING_ANCHORS = Object.freeze([...ROF_J_AUTHOR_CONFIRMED_ANCHORS].reverse());

export function isValidRofJSelection(value) {
  return Number.isInteger(value) && value >= 0 && value <= 10;
}

function formatAnchor(anchor) {
  return `${anchor.positionLabel}・${anchor.descriptor}`;
}

export function rofJSelectionDescriptor(value) {
  if (!isValidRofJSelection(value)) return "";
  const exact = ROF_J_AUTHOR_CONFIRMED_ANCHORS.find((anchor) => anchor.position === value);
  if (exact) return exact.descriptor;
  if (value === 2 || value === 3) return "少し疲れている付近";
  if (value === 7 || value === 8) return "とても疲れている付近";
  return "目安の間の値";
}

export function rofJGuidanceForSelection(value) {
  if (!isValidRofJSelection(value)) {
    return "目安：0 ／ 2と3の間 ／ 5 ／ 7と8の間 ／ 10";
  }

  const exact = ASCENDING_ANCHORS.find((anchor) => anchor.position === value);
  if (exact) return formatAnchor(exact);

  if (value === 2 || value === 3) {
    return formatAnchor(ASCENDING_ANCHORS.find((anchor) => anchor.position === 2.5));
  }
  if (value === 7 || value === 8) {
    return formatAnchor(ASCENDING_ANCHORS.find((anchor) => anchor.position === 7.5));
  }

  const lower = [...ASCENDING_ANCHORS].reverse().find((anchor) => anchor.position < value);
  const upper = ASCENDING_ANCHORS.find((anchor) => anchor.position > value);
  if (lower && upper) return `${formatAnchor(lower)} ／ ${formatAnchor(upper)}`;
  return lower ? formatAnchor(lower) : upper ? formatAnchor(upper) : "";
}

export const HOME_COLUMNS = 4;
export const HOME_MIN_ROWS = 4;
export const HOME_MAX_ROWS = 10;

function widgetIdFromToken(token = "") {
  return String(token).startsWith("widget:") ? String(token).slice("widget:".length) : "";
}

export function footprintForToken(token, widgetSizes = {}) {
  if (String(token).startsWith("app:")) return { columns: 1, rows: 1 };
  const widgetId = widgetIdFromToken(token);
  const size = String(widgetSizes?.[widgetId] || "small");
  if (size === "large") return { columns: 4, rows: 2 };
  if (size === "medium") return { columns: 4, rows: 1 };
  return { columns: 2, rows: 1 };
}

export function normalizePlacement(placement, footprint, { columns = HOME_COLUMNS, maxRows = HOME_MAX_ROWS } = {}) {
  const maxColumn = Math.max(1, columns - footprint.columns + 1);
  const maxRow = Math.max(1, maxRows - footprint.rows + 1);
  return {
    row: Math.max(1, Math.min(maxRow, Number(placement?.row) || 1)),
    col: Math.max(1, Math.min(maxColumn, Number(placement?.col) || 1)),
  };
}

function cellKey(row, col) {
  return `${row}:${col}`;
}

function cellsFor(placement, footprint) {
  const cells = [];
  for (let row = placement.row; row < placement.row + footprint.rows; row += 1) {
    for (let col = placement.col; col < placement.col + footprint.columns; col += 1) {
      cells.push(cellKey(row, col));
    }
  }
  return cells;
}

export function placementIsFree(placements, token, desired, {
  widgetSizes = {},
  occupiedTokens = null,
  columns = HOME_COLUMNS,
  maxRows = HOME_MAX_ROWS,
} = {}) {
  const footprint = footprintForToken(token, widgetSizes);
  const normalized = normalizePlacement(desired, footprint, { columns, maxRows });
  const desiredCells = new Set(cellsFor(normalized, footprint));
  for (const entry of placements || []) {
    if (!entry || entry.token === token) continue;
    if (occupiedTokens && !occupiedTokens.has(entry.token)) continue;
    const otherFootprint = footprintForToken(entry.token, widgetSizes);
    const other = normalizePlacement(entry, otherFootprint, { columns, maxRows });
    if (cellsFor(other, otherFootprint).some((key) => desiredCells.has(key))) return false;
  }
  return true;
}

export function findNearestFreePlacement(placements, token, desired, options = {}) {
  const { widgetSizes = {}, columns = HOME_COLUMNS, maxRows = HOME_MAX_ROWS } = options;
  const footprint = footprintForToken(token, widgetSizes);
  const start = normalizePlacement(desired, footprint, { columns, maxRows });
  const candidates = [];
  const maxColumn = Math.max(1, columns - footprint.columns + 1);
  const maxRow = Math.max(1, maxRows - footprint.rows + 1);
  for (let row = 1; row <= maxRow; row += 1) {
    for (let col = 1; col <= maxColumn; col += 1) {
      candidates.push({ row, col, score: Math.abs(row - start.row) * columns + Math.abs(col - start.col) });
    }
  }
  candidates.sort((a, b) => a.score - b.score || a.row - b.row || a.col - b.col);
  const found = candidates.find((candidate) => placementIsFree(placements, token, candidate, options));
  return found ? { row: found.row, col: found.col } : null;
}

export function packTokens(tokens, {
  widgetSizes = {},
  occupiedTokens = null,
  columns = HOME_COLUMNS,
  maxRows = HOME_MAX_ROWS,
} = {}) {
  const placements = [];
  for (const token of tokens || []) {
    const placement = findNearestFreePlacement(placements, token, { row: 1, col: 1 }, {
      widgetSizes,
      occupiedTokens,
      columns,
      maxRows,
    });
    if (!placement) continue;
    placements.push({ token, ...placement });
  }
  return placements;
}

export function usedRowCount(placements, { widgetSizes = {}, occupiedTokens = null, minRows = HOME_MIN_ROWS } = {}) {
  let maxRow = minRows;
  for (const entry of placements || []) {
    if (!entry) continue;
    if (occupiedTokens && !occupiedTokens.has(entry.token)) continue;
    const footprint = footprintForToken(entry.token, widgetSizes);
    maxRow = Math.max(maxRow, Number(entry.row || 1) + footprint.rows - 1);
  }
  return Math.max(minRows, Math.min(HOME_MAX_ROWS, maxRow));
}

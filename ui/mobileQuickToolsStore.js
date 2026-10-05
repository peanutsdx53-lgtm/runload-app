import { writeMobileLocalJson } from "./mobileStorageUtilities.js";
const STORAGE_KEY = "running-record-mobile-quick-tools-v1";
const MAX_ENTRIES_PER_TOOL = 50;

const COLLECTION_BY_TOOL = Object.freeze({
  location: "locationNotes",
  quick: "quickNotes",
  gear: "gearNotes",
  departure: "departureChecks",
  fuel: "fuelNotes",
});

function emptyState() {
  return {
    version: 1,
    locationNotes: [],
    quickNotes: [],
    gearNotes: [],
    departureChecks: [],
    fuelNotes: [],
  };
}

function normalizeEntry(entry = {}) {
  return {
    ...entry,
    id: String(entry.id || ""),
    createdAt: String(entry.createdAt || ""),
  };
}

function normalizeCollection(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && typeof entry === "object")
    .map(normalizeEntry)
    .filter((entry) => entry.id)
    .slice(0, MAX_ENTRIES_PER_TOOL);
}

export function loadMobileQuickTools() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return emptyState();
    return {
      version: 1,
      locationNotes: normalizeCollection(parsed.locationNotes),
      quickNotes: normalizeCollection(parsed.quickNotes),
      gearNotes: normalizeCollection(parsed.gearNotes),
      departureChecks: normalizeCollection(parsed.departureChecks),
      fuelNotes: normalizeCollection(parsed.fuelNotes),
    };
  } catch {
    return emptyState();
  }
}

function createId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function addMobileQuickToolEntry(tool, values = {}) {
  const collection = COLLECTION_BY_TOOL[tool];
  if (!collection) return null;
  const current = loadMobileQuickTools();
  const entry = {
    ...values,
    id: createId(tool),
    createdAt: new Date().toISOString(),
  };
  const next = {
    ...current,
    [collection]: [entry, ...current[collection]].slice(0, MAX_ENTRIES_PER_TOOL),
  };
  return writeMobileLocalJson(STORAGE_KEY, next) ? entry : null;
}

export function removeMobileQuickToolEntry(tool, id) {
  const collection = COLLECTION_BY_TOOL[tool];
  if (!collection) return false;
  const current = loadMobileQuickTools();
  const nextCollection = current[collection].filter((entry) => entry.id !== String(id || ""));
  if (nextCollection.length === current[collection].length) return false;
  return writeMobileLocalJson(STORAGE_KEY, { ...current, [collection]: nextCollection });
}

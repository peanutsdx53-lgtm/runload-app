import { cloneJsonValue as cloneValue } from "../../shared/valueUtilities.js";
import { internalModules } from "./modules.js";

// ===== core/pwaRegistration.js =====
{
const moduleExports = Object.create(null);
const NOTICE_ID = "pwa-update-notice";
const LOCAL_DEVELOPMENT_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

function ensureUpdateNotice() {
  let notice = document.getElementById(NOTICE_ID);
  if (notice) return notice;
  notice = document.createElement("div");
  notice.id = NOTICE_ID;
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  notice.hidden = true;
  notice.className = "pwa-update-notice";
  document.body.appendChild(notice);
  return notice;
}

function showUpdateNotice(registration) {
  const notice = ensureUpdateNotice();
  notice.hidden = false;
  notice.innerHTML = `
    <div class="pwa-update-notice__inner">
      <span>アプリの更新があります。保存中の記録はそのままです。</span>
      <button type="button" class="pwa-update-notice__button" data-pwa-update-button>更新</button>
    </div>
  `;
  notice.querySelector("[data-pwa-update-button]")?.addEventListener("click", () => {
    registration.waiting?.postMessage({ type: "SKIP_WAITING" });
  });
}

function isLocalLiveServerDevelopment() {
  return window.location.protocol === "http"
    && LOCAL_DEVELOPMENT_HOSTS.has(window.location.hostname);
}

async function clearLocalPwaDeliveryState() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations
      .filter((registration) => {
        const scriptUrl = registration.active?.scriptURL
          || registration.waiting?.scriptURL
          || registration.installing?.scriptURL
          || "";
        return scriptUrl.endsWith("/service-worker.js");
      })
      .map((registration) => registration.unregister()));
  }
}

function registerPwaServiceWorker({ platform = "" } = {}) {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

  if (isLocalLiveServerDevelopment()) {
    window.addEventListener("load", () => {
      clearLocalPwaDeliveryState().catch(() => {});
    }, { once: true });
    return;
  }

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" });
      await registration.update();
      const readyRegistration = await navigator.serviceWorker.ready;
      if (platform === "mobile" || platform === "desktop") {
        readyRegistration.active?.postMessage({ type: "CACHE_PLATFORM", platform });
      }
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateNotice(registration);
      }
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateNotice(registration);
          }
        });
      });
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch {
      // The app remains usable without PWA registration.
    }
  });
}
moduleExports["registerPwaServiceWorker"] = registerPwaServiceWorker;
internalModules.pwaRegistration = moduleExports;
}

// ===== core/storage/storageKeys.js =====
{
const moduleExports = Object.create(null);
const STORAGE_NAMESPACE = "runner-load-app-new-v1";
const STORAGE_KEYS = Object.freeze({
  records: `${STORAGE_NAMESPACE}-records-v1`,
  modelResultsRegionalV2: `${STORAGE_NAMESPACE}-model-results-regional-v2`,
  subjectiveFeedback: `${STORAGE_NAMESPACE}-subjective-feedback-v1`,
  plans: `${STORAGE_NAMESPACE}-plans-v1`,
  profile: `${STORAGE_NAMESPACE}-profile-v1`,
  settings: `${STORAGE_NAMESPACE}-settings-v1`,
  draft: `${STORAGE_NAMESPACE}-draft-v1`,
  courses: `${STORAGE_NAMESPACE}-courses-v1`,
  runMeasurements: `${STORAGE_NAMESPACE}-run-measurements-v1`,
  backups: `${STORAGE_NAMESPACE}-backup-v1`,
  corruptStorageBackup: `${STORAGE_NAMESPACE}-corrupt-storage-backup-v1`,
  historyUndo: `${STORAGE_NAMESPACE}-history-undo-v1`,
  rofJ: `${STORAGE_NAMESPACE}-second-pillar-rof-j-v1`,
  rofJLifecycle: `${STORAGE_NAMESPACE}-second-pillar-rof-j-lifecycle-v1`,
  mobileQuickTools: "running-record-mobile-quick-tools-v1",
  mobileAchievements: "running-record-mobile-achievements-v1",
  mobileHomePositions: "running-record-mobile-home-positions-v1",
  mobileHomeLayout: "running-record-mobile-home-layout-v1",
  mobileHomeWidgets: "running-record-mobile-home-widgets-v1",
  selfUnderstandingThreads: `${STORAGE_NAMESPACE}-self-understanding-threads-v2`,
  selfInterpretations: `${STORAGE_NAMESPACE}-self-interpretations-v1`,
  readingReferenceHistory: `${STORAGE_NAMESPACE}-reading-reference-history-v1`,
});

// Current-format backups encode empty record collections as [] (never null).
const USER_ARRAY_STORAGE_KEYS = Object.freeze([
  STORAGE_KEYS.records,
  STORAGE_KEYS.modelResultsRegionalV2,
  STORAGE_KEYS.subjectiveFeedback,
  STORAGE_KEYS.plans,
  STORAGE_KEYS.courses,
  STORAGE_KEYS.runMeasurements,
  STORAGE_KEYS.selfUnderstandingThreads,
  STORAGE_KEYS.selfInterpretations,
]);

const USER_DATA_STORAGE_KEYS = Object.freeze([
  STORAGE_KEYS.records,
  STORAGE_KEYS.modelResultsRegionalV2,
  STORAGE_KEYS.subjectiveFeedback,
  STORAGE_KEYS.plans,
  STORAGE_KEYS.profile,
  STORAGE_KEYS.settings,
  STORAGE_KEYS.draft,
  STORAGE_KEYS.courses,
  STORAGE_KEYS.runMeasurements,
  STORAGE_KEYS.rofJ,
  STORAGE_KEYS.rofJLifecycle,
  STORAGE_KEYS.mobileQuickTools,
  STORAGE_KEYS.mobileAchievements,
  STORAGE_KEYS.mobileHomePositions,
  STORAGE_KEYS.mobileHomeLayout,
  STORAGE_KEYS.mobileHomeWidgets,
  STORAGE_KEYS.selfUnderstandingThreads,
  STORAGE_KEYS.selfInterpretations,
  STORAGE_KEYS.readingReferenceHistory,
]);

const INTERNAL_RECOVERY_STORAGE_KEYS = Object.freeze([
  STORAGE_KEYS.backups,
  STORAGE_KEYS.corruptStorageBackup,
  STORAGE_KEYS.historyUndo,
]);

const CURRENT_APP_REMOVABLE_STORAGE_KEYS = Object.freeze([
  ...USER_DATA_STORAGE_KEYS,
  ...INTERNAL_RECOVERY_STORAGE_KEYS,
]);
moduleExports["STORAGE_NAMESPACE"] = STORAGE_NAMESPACE;
moduleExports["STORAGE_KEYS"] = STORAGE_KEYS;
moduleExports["USER_DATA_STORAGE_KEYS"] = USER_DATA_STORAGE_KEYS;
moduleExports["USER_ARRAY_STORAGE_KEYS"] = USER_ARRAY_STORAGE_KEYS;
moduleExports["INTERNAL_RECOVERY_STORAGE_KEYS"] = INTERNAL_RECOVERY_STORAGE_KEYS;
moduleExports["CURRENT_APP_REMOVABLE_STORAGE_KEYS"] = CURRENT_APP_REMOVABLE_STORAGE_KEYS;
internalModules.storageKeys = moduleExports;
}

// ===== core/storage/storageGateway.js =====
{
const moduleExports = Object.create(null);
const { STORAGE_KEYS } = internalModules.storageKeys;


function createFailure(operation, key, error, details = {}) {
  return {
    ok: false,
    operation,
    key,
    code: "STORAGE_OPERATION_FAILED",
    message: String(error?.message || error || "storage_error"),
    details,
  };
}

function createMemoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues).map(([key, value]) => [key, String(value)]));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
    clear() { values.clear(); },
    dump() { return Object.fromEntries(values.entries()); },
  };
}

function createStorageGateway(storage) {
  let targetStorage = storage;
  if (!targetStorage) {
    try {
      targetStorage = globalThis.localStorage;
    } catch (error) {
      targetStorage = {
        getItem() { throw error; },
        setItem() { throw error; },
        removeItem() { throw error; },
      };
    }
  }
  let lastFailure = null;

  function readRaw(key, fallback = null) {
    try {
      const value = targetStorage.getItem(key);
      lastFailure = null;
      return value == null ? fallback : value;
    } catch (error) {
      lastFailure = createFailure("read", key, error);
      return fallback;
    }
  }

  function writeRaw(key, rawValue) {
    try {
      targetStorage.setItem(key, String(rawValue));
      lastFailure = null;
      return { ok: true, key };
    } catch (error) {
      lastFailure = createFailure("write", key, error);
      return { ...lastFailure, error };
    }
  }

  function remove(key) {
    try {
      targetStorage.removeItem(key);
      lastFailure = null;
      return { ok: true, key };
    } catch (error) {
      lastFailure = createFailure("remove", key, error);
      return { ...lastFailure, error };
    }
  }

  function preserveCorruptValue(key, rawValue, parseError) {
    let entries = [];
    try {
      const existingRawValue = targetStorage.getItem(STORAGE_KEYS.corruptStorageBackup);
      const existing = existingRawValue ? JSON.parse(existingRawValue) : [];
      entries = Array.isArray(existing) ? existing : [];
    } catch {
      entries = [];
    }
    const next = [...entries, {
      key,
      rawValue: String(rawValue).slice(0, 2 * 1024 * 1024),
      detectedAt: new Date().toISOString(),
      error: String(parseError?.message || parseError),
    }].slice(-20);
    try {
      targetStorage.setItem(STORAGE_KEYS.corruptStorageBackup, JSON.stringify(next));
    } catch {
      // 破損値の退避失敗は、元の読込結果を上書きしない。
    }
  }

  function readJsonResult(key, fallback) {
    const rawValue = readRaw(key, null);
    if (lastFailure) {
      return {
        ...cloneValue(lastFailure),
        value: cloneValue(fallback),
        exists: false,
      };
    }
    if (rawValue == null) {
      return { ok: true, key, value: cloneValue(fallback), exists: false };
    }
    try {
      return { ok: true, key, value: JSON.parse(rawValue), exists: true };
    } catch (error) {
      preserveCorruptValue(key, rawValue, error);
      lastFailure = createFailure("parse", key, error, { rawLength: String(rawValue).length });
      return {
        ...cloneValue(lastFailure),
        value: cloneValue(fallback),
        exists: true,
      };
    }
  }

  function readJson(key, fallback) {
    return readJsonResult(key, fallback).value;
  }

  function captureSnapshot(keys = []) {
    try {
      const items = [...new Set(keys.map(String))].map((key) => {
        const rawValue = targetStorage.getItem(key);
        return { key, existed: rawValue != null, rawValue };
      });
      lastFailure = null;
      return { ok: true, items };
    } catch (error) {
      lastFailure = createFailure("snapshot", "", error);
      return { ...lastFailure, error, items: [] };
    }
  }

  function restoreSnapshot(items = []) {
    const failures = [];
    let restoredCount = 0;
    [...items].reverse().forEach((item) => {
      try {
        if (item.existed) targetStorage.setItem(item.key, item.rawValue);
        else targetStorage.removeItem(item.key);
        restoredCount += 1;
      } catch (error) {
        failures.push(createFailure("rollback", item.key, error));
      }
    });
    return { ok: failures.length === 0, restoredCount, failures };
  }

  function transact(changes = []) {
    // Serialize every proposed value before touching storage. JSON.stringify may
    // throw (BigInt / cycles), or produce undefined (functions / undefined).
    // Neither outcome may be reported as a successful, readable JSON save.
    let normalizedChanges;
    try {
      if (!Array.isArray(changes)) throw new TypeError("Invalid storage changes");
      normalizedChanges = changes.map((change) => {
        if (!change || typeof change !== "object") throw new TypeError("Invalid storage change");
        // An implicit key such as undefined must never become a persisted
        // string key through coercion. All current callers use named keys.
        if (typeof change.key !== "string" || !change.key.trim()) {
          throw new TypeError("Storage key must be a non-empty string");
        }
        const remove = Boolean(change.remove);
        const hasRawValue = Object.prototype.hasOwnProperty.call(change, "rawValue");
        const assertFiniteNumber = (_name, item) => {
          // JSON.stringify silently turns NaN/Infinity into null; JSON.parse
          // accepts overflowing numeric literals as Infinity. Never convert
          // a supplied measurement into an apparently valid null/number.
          if (typeof item === "number" && !Number.isFinite(item)) {
            throw new TypeError("Storage value contains a non-finite number");
          }
          return item;
        };
        const rawValue = remove ? null : hasRawValue
          ? change.rawValue
          : JSON.stringify(change.value, assertFiniteNumber);
        if (!remove) {
          if (typeof rawValue !== "string") {
            throw new TypeError("Storage value is not serializable JSON");
          }
          // Transactions back JSON data. Raw non-JSON values belong to the
          // explicit writeRaw API; otherwise a subsequent readJson fails.
          JSON.parse(rawValue, assertFiniteNumber);
        }
        return { key: change.key, remove, rawValue };
      });
    } catch (error) {
      lastFailure = createFailure("serialize", "", error);
      return { ...cloneValue(lastFailure), committedCount: 0 };
    }
    const keys = normalizedChanges.map((change) => change.key);
    if (new Set(keys).size !== keys.length) {
      lastFailure = {
        ok: false,
        operation: "transaction",
        key: "",
        code: "STORAGE_TRANSACTION_DUPLICATE_KEY",
        message: "A storage transaction contains duplicate keys.",
        details: { duplicateKeys: [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))] },
      };
      return { ...cloneValue(lastFailure), committedCount: 0 };
    }
    const snapshot = captureSnapshot(keys);
    if (!snapshot.ok) return { ...snapshot, committedCount: 0 };

    let committedCount = 0;
    for (const change of normalizedChanges) {
      try {
        if (change.remove) targetStorage.removeItem(change.key);
        else targetStorage.setItem(change.key, change.rawValue);
        committedCount += 1;
      } catch (error) {
        // An adapter might mutate the failing key before throwing. Restore it
        // only if its raw value changed: trying to rewrite an unchanged key can
        // itself fail permanently under a full/quota-limited storage backend.
        const rollbackItems = snapshot.items.slice(0, committedCount);
        const failedItem = snapshot.items[committedCount];
        try {
          const rawAfterFailure = targetStorage.getItem(change.key);
          if (rawAfterFailure !== (failedItem.existed ? failedItem.rawValue : null)) {
            rollbackItems.push(failedItem);
          }
        } catch {
          // The state is unknown. Attempt restoration and report its failures.
          rollbackItems.push(failedItem);
        }
        const rollback = restoreSnapshot(rollbackItems);
        lastFailure = {
          ...createFailure(change.remove ? "remove" : "write", change.key, error),
          rollback,
        };
        return { ...lastFailure, error, committedCount, rollback };
      }
    }
    lastFailure = null;
    return { ok: true, committedCount, keys };
  }

  function writeJson(key, value) {
    return transact([{ key, value }]);
  }

  function contains(key) {
    return readRaw(key, null) != null;
  }

  function probe() {
    const probeKey = "runner-load-app-storage-probe-v1";
    const snapshot = captureSnapshot([probeKey]);
    if (!snapshot.ok) return snapshot;
    const value = `storage-probe-${Date.now()}`;
    const writeResult = writeRaw(probeKey, value);
    if (!writeResult.ok) return writeResult;
    const matched = readRaw(probeKey, "") === value;
    const rollback = restoreSnapshot(snapshot.items);
    if (!matched || !rollback.ok) {
      lastFailure = {
        ok: false,
        operation: "probe",
        key: probeKey,
        code: "STORAGE_PROBE_FAILED",
        message: matched ? "storage_probe_restore_failed" : "storage_probe_mismatch",
        rollback,
      };
      return lastFailure;
    }
    lastFailure = null;
    return { ok: true };
  }

  return Object.freeze({
    readRaw,
    readJson,
    readJsonResult,
    writeRaw,
    writeJson,
    remove,
    contains,
    captureSnapshot,
    restoreSnapshot,
    transact,
    probe,
    getLastFailure: () => cloneValue(lastFailure),
  });
}
moduleExports["createMemoryStorage"] = createMemoryStorage;
moduleExports["createStorageGateway"] = createStorageGateway;
internalModules.storageGateway = moduleExports;
}

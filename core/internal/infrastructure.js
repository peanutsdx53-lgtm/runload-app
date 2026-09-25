import { LEGACY_LOCAL_DELIVERY_CACHE_PREFIXES } from "../legacyCompatibility.js";
import { coreModules } from "./moduleRegistry.js";

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
  return window.location.protocol === "http:"
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

  if ("caches" in window) {
    const keys = await caches.keys();
    const legacyKeys = keys.filter((key) => (
      LEGACY_LOCAL_DELIVERY_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))
    ));
    await Promise.all(legacyKeys.map((key) => caches.delete(key)));
  }
}

function registerPwaServiceWorker() {
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
coreModules[0] = moduleExports;
}

// ===== core/storage/storageKeys.js =====
{
const moduleExports = Object.create(null);
const STORAGE_NAMESPACE = "runner-load-app-new-v1";
const STORAGE_KEYS = Object.freeze({
  records: `${STORAGE_NAMESPACE}-records-v1`,
  modelResultsV27: `${STORAGE_NAMESPACE}-model-results-v2.7`,
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
});

const USER_DATA_STORAGE_KEYS = Object.freeze([
  STORAGE_KEYS.records,
  STORAGE_KEYS.modelResultsV27,
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
moduleExports["INTERNAL_RECOVERY_STORAGE_KEYS"] = INTERNAL_RECOVERY_STORAGE_KEYS;
moduleExports["CURRENT_APP_REMOVABLE_STORAGE_KEYS"] = CURRENT_APP_REMOVABLE_STORAGE_KEYS;
coreModules[1] = moduleExports;
}

// ===== core/storage/storageGateway.js =====
{
const moduleExports = Object.create(null);
const { STORAGE_KEYS } = coreModules[1];

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

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
    const normalizedChanges = changes.map((change) => ({
      key: String(change.key),
      remove: Boolean(change.remove),
      rawValue: change.remove
        ? null
        : Object.prototype.hasOwnProperty.call(change, "rawValue")
          ? String(change.rawValue)
          : JSON.stringify(change.value),
    }));
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
        const rollback = restoreSnapshot(snapshot.items.slice(0, committedCount));
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
coreModules[2] = moduleExports;
}

// ===== core/model/modelConstants.js =====
{
const moduleExports = Object.create(null);
/**
 * 利用者向け負荷モデルの固定定数。
 * 採用仕様はSourcebook / Validationで根拠・方向妥当性を管理する。
 * 画面には更新履歴ではなく、現在の計算結果と意味だけを表示する。
 */

const BODY_PARTS = Object.freeze([
  "腰骨盤部",
  "股関節臀部",
  "大腿",
  "膝",
  "前下腿",
  "後下腿",
  "アキレス腱",
  "足底部",
  "足関節・足背部",
]);

const CONTRACTILE_BODY_PARTS = Object.freeze([
  "腰骨盤部",
  "股関節臀部",
  "大腿",
  "前下腿",
  "後下腿",
]);

const BODY_PART_KEYS = Object.freeze({
  "腰骨盤部": "lumbopelvic",
  "股関節臀部": "hipGlute",
  "大腿": "thigh",
  "膝": "knee",
  "前下腿": "anteriorLowerLeg",
  "後下腿": "posteriorLowerLeg",
  "アキレス腱": "achillesTendon",
  "足底部": "plantarFoot",
  "足関節・足背部": "ankleDorsum",
});

const SURFACE_FIELDS = Object.freeze([
  Object.freeze({ recordKey: "pavedPercent", modelKey: "paved", engineKey: "surface_paved_pct", label: "舗装路" }),
  Object.freeze({ recordKey: "trackPercent", modelKey: "track", engineKey: "surface_track_pct", label: "陸上トラック" }),
  Object.freeze({ recordKey: "treadmillPercent", modelKey: "treadmill", engineKey: "surface_treadmill_pct", label: "トレッドミル" }),
  Object.freeze({ recordKey: "soilPercent", modelKey: "soil", engineKey: "surface_soil_pct", label: "締まった土道" }),
  Object.freeze({ recordKey: "trailPercent", modelKey: "trail", engineKey: "surface_trail_pct", label: "不整地トレイル" }),
  Object.freeze({ recordKey: "naturalGrassPercent", modelKey: "natural_grass", engineKey: "surface_natural_grass_pct", label: "天然芝" }),
  Object.freeze({ recordKey: "artificialTurfPercent", modelKey: "artificial_turf", engineKey: "surface_artificial_turf_pct", label: "人工芝" }),
  Object.freeze({ recordKey: "sandPercent", modelKey: "sand", engineKey: "surface_sand_pct", label: "砂地" }),
]);

const FULL_RESPONSE_MAX_ABS_GRADE_PERCENT = 15;

function surfaceEnvironmentForModelUse(component = {}) {
  const componentId = String(component.componentId || component.surface || component.materialKey || "").trim().toUpperCase();
  const userCategory = String(component.userCategory || component.category || "").trim().toUpperCase();
  const runSetting = String(component.runSetting || "").trim().toUpperCase();
  if (componentId === "TREADMILL" || userCategory === "TREADMILL" || runSetting === "TREADMILL") return "TREADMILL";
  if (componentId || userCategory || (runSetting && runSetting !== "UNKNOWN")) return "OUTDOOR";
  return "UNKNOWN";
}

function hasTreadmillOutdoorSurfaceMixFromComponents(components = []) {
  const positive = (Array.isArray(components) ? components : []).filter((item) => Number(item?.sharePercent ?? 0) > 0);
  const environments = new Set(positive.map(surfaceEnvironmentForModelUse).filter((value) => value !== "UNKNOWN"));
  return environments.has("TREADMILL") && environments.has("OUTDOOR");
}

function hasTreadmillOutdoorSurfaceMixFromCourse(course = {}) {
  const treadmill = Number(course?.treadmillPercent || 0) > 0;
  if (!treadmill) return false;
  return [
    "pavedPercent", "trackPercent", "soilPercent", "trailPercent",
    "naturalGrassPercent", "artificialTurfPercent", "sandPercent",
  ].some((key) => Number(course?.[key] || 0) > 0);
}

function gradeIsWithinFullResponseDomain(gradePercent) {
  const value = Number(gradePercent);
  return Number.isFinite(value) && Math.abs(value) <= FULL_RESPONSE_MAX_ABS_GRADE_PERCENT + 1e-12;
}

const SURFACE_TRAITS = Object.freeze([
  "hardness",
  "grip",
  "unevenness",
  "sink",
  "rebound",
]);


const SURFACE_TRAIT_LABELS = Object.freeze({
  hardness: "硬さ・剛性",
  grip: "摩擦・グリップ",
  unevenness: "不整地性",
  sink: "沈み込み",
  rebound: "反発性",
});

const SURFACE_INTERPRETATION_GUIDE = Object.freeze({
  paved: Object.freeze({ label: "舗装路", traits: ["硬い", "安定"], interpretation: "基準路面。硬さと安定性が高く、衝撃・制動の基準として扱う。" }),
  track: Object.freeze({ label: "陸上トラック", traits: ["安定", "反発性"], interpretation: "安定して反発を感じやすい路面。接地のしやすさと推進のしやすさを見返す材料として扱う。" }),
  treadmill: Object.freeze({ label: "トレッドミル", traits: ["速度一定", "ベルト環境"], interpretation: "屋外路面とは違い、速度が一定になりやすい走行環境として扱う。" }),
  soil: Object.freeze({ label: "締まった土道", traits: ["やや柔らかい", "条件依存"], interpretation: "細かいグラベル等の近接根拠はあるが、土の湿り・締まり具合で性質が変わるため、補助確認に留める。" }),
  trail: Object.freeze({ label: "不整地トレイル", traits: ["不整地性", "低安定性"], interpretation: "凹凸や接地のばらつきが出やすい路面として、接地の安定や姿勢の見返しに使う。" }),
  natural_grass: Object.freeze({ label: "天然芝", traits: ["柔らかい", "やや不安定"], interpretation: "柔らかさや状態差が出やすい路面として、接地感と脚への感じ方を見返す材料にする。" }),
  artificial_turf: Object.freeze({ label: "人工芝", traits: ["下地依存", "摩擦/反発条件依存"], interpretation: "下地・温度・摩擦で性質が変わりやすい路面として、記録時の感じ方と合わせて見返す。" }),
  sand: Object.freeze({ label: "砂地", traits: ["沈み込み大", "低安定性"], interpretation: "衝撃増加ではなく、沈み込み・推進効率低下・足部/下腿制御として扱う。" }),
});

const BASE_BODY_PART_WEIGHTS = Object.freeze({
  "腰骨盤部": 0.08,
  "股関節臀部": 0.13,
  "大腿": 0.16,
  "膝": 0.17,
  "前下腿": 0.11,
  "後下腿": 0.12,
  "アキレス腱": 0.08,
  "足底部": 0.07,
  "足関節・足背部": 0.08,
});

const BASE_BODY_PART_LOG_WEIGHTS = Object.freeze(
  Object.fromEntries(
    Object.entries(BASE_BODY_PART_WEIGHTS).map(([bodyPart, weight]) => [bodyPart, Math.log(weight)]),
  ),
);

const INTERNAL_LOAD_WEIGHTS = Object.freeze({
  "腰骨盤部": 0.18,
  "股関節臀部": 0.22,
  "大腿": 0.28,
  "前下腿": 0.14,
  "後下腿": 0.18,
});

const DEFAULT_MODEL_CONFIGURATION = Object.freeze({
  referenceSpeedMetersPerSecond: 3.0,
  uphillMultiplier: 10,
  downhillMultiplier: 10,
  surfaceMultiplier: 0.035,
  acuteTimeConstant: 7,
  chronicTimeConstant: 28,
  standardizationRecordCount: 28,
  epsilon: 1e-8,
  tolerance: 1e-6,
  achillesTransferRatio: 0.25,
  plantarTransferRatio: 0.10,
  surfaceCoefficients: Object.freeze({
    paved: 0.0,
    trail: 1.0,
    treadmill: 0.1,
    track: 0.2,
    soil: 0.6,
    natural_grass: 0.55,
    artificial_turf: 0.75,
    sand: 0.9,
  }),
  surfaceTraitWeights: Object.freeze({
    hardness: 0.35,
    unevenness: 0.25,
    sink: 0.20,
    grip: 0.15,
    rebound: 0.05,
  }),
  surfaceTraitScores: Object.freeze({
    paved: Object.freeze({ hardness: 3, grip: 1, unevenness: 0, sink: 0, rebound: 2 }),
    track: Object.freeze({ hardness: 2, grip: 2, unevenness: 0, sink: 0, rebound: 3 }),
    treadmill: Object.freeze({ hardness: 1, grip: 1, unevenness: 0, sink: 0, rebound: 3 }),
    soil: Object.freeze({ hardness: 1, grip: 1, unevenness: 2, sink: 1, rebound: 1 }),
    trail: Object.freeze({ hardness: 1, grip: 1, unevenness: 3, sink: 1, rebound: 0 }),
    natural_grass: Object.freeze({ hardness: 1, grip: 1, unevenness: 2, sink: 1, rebound: 1 }),
    artificial_turf: Object.freeze({ hardness: 2, grip: 3, unevenness: 1, sink: 0, rebound: 2 }),
    sand: Object.freeze({ hardness: 0, grip: 1, unevenness: 2, sink: 3, rebound: 0 }),
  }),
  surfaceRoleScale: 0.5,
  surfaceBodyPartSensitivity: Object.freeze({
    "腰骨盤部": Object.freeze({ hardness: 0.00, grip: 0.00, unevenness: 0.05, sink: 0.04, rebound: 0.00 }),
    "股関節臀部": Object.freeze({ hardness: 0.01, grip: 0.02, unevenness: 0.07, sink: 0.06, rebound: 0.00 }),
    "大腿": Object.freeze({ hardness: 0.05, grip: 0.03, unevenness: 0.03, sink: 0.03, rebound: 0.02 }),
    "膝": Object.freeze({ hardness: 0.08, grip: 0.05, unevenness: 0.04, sink: 0.01, rebound: 0.01 }),
    "前下腿": Object.freeze({ hardness: 0.07, grip: 0.02, unevenness: 0.04, sink: 0.01, rebound: 0.03 }),
    "後下腿": Object.freeze({ hardness: 0.02, grip: 0.03, unevenness: 0.06, sink: 0.09, rebound: 0.04 }),
    "アキレス腱": Object.freeze({ hardness: 0.02, grip: 0.04, unevenness: 0.03, sink: 0.08, rebound: 0.05 }),
    "足底部": Object.freeze({ hardness: 0.06, grip: 0.06, unevenness: 0.05, sink: 0.08, rebound: 0.03 }),
    "足関節・足背部": Object.freeze({ hardness: 0.02, grip: 0.08, unevenness: 0.10, sink: 0.03, rebound: 0.01 }),
  }),
  baseBodyPartWeights: BASE_BODY_PART_WEIGHTS,
  baseBodyPartLogWeights: BASE_BODY_PART_LOG_WEIGHTS,
  internalLoadWeights: INTERNAL_LOAD_WEIGHTS,
  speedCoefficients: Object.freeze({
    "腰骨盤部": 0.18,
    "股関節臀部": 0.26,
    "大腿": 0.15,
    "膝": -0.08,
    "前下腿": -0.04,
    "後下腿": 0.12,
    "アキレス腱": 0.10,
    "足底部": 0.06,
    "足関節・足背部": 0.05,
  }),
  uphillCoefficients: Object.freeze({
    "腰骨盤部": 0.50,
    "股関節臀部": 1.10,
    "大腿": 1.00,
    "膝": -0.20,
    "前下腿": -0.10,
    "後下腿": 1.00,
    "アキレス腱": 0.80,
    "足底部": 0.30,
    "足関節・足背部": 0.35,
  }),
  downhillCoefficients: Object.freeze({
    "腰骨盤部": -0.10,
    "股関節臀部": 0.10,
    "大腿": 1.20,
    "膝": 1.40,
    "前下腿": 0.90,
    "後下腿": 0.10,
    "アキレス腱": -0.10,
    "足底部": 0.10,
    "足関節・足背部": 0.65,
  }),
  surfaceCoefficientsByBodyPart: Object.freeze({
    "腰骨盤部": 0.02,
    "股関節臀部": 0.04,
    "大腿": 0.02,
    "膝": -0.02,
    "前下腿": 0.12,
    "後下腿": 0.10,
    "アキレス腱": 0.06,
    "足底部": 0.10,
    "足関節・足背部": 0.14,
  }),
  timeConstantsByBodyPart: Object.freeze({
    "腰骨盤部": Object.freeze({ acute: 7, chronic: 28 }),
    "股関節臀部": Object.freeze({ acute: 7, chronic: 28 }),
    "大腿": Object.freeze({ acute: 7, chronic: 28 }),
    "膝": Object.freeze({ acute: 7, chronic: 35 }),
    "前下腿": Object.freeze({ acute: 7, chronic: 28 }),
    "後下腿": Object.freeze({ acute: 7, chronic: 28 }),
    "アキレス腱": Object.freeze({ acute: 10, chronic: 56 }),
    "足底部": Object.freeze({ acute: 10, chronic: 56 }),
    "足関節・足背部": Object.freeze({ acute: 7, chronic: 35 }),
  }),
});

const MODEL_WARNING_THRESHOLD = Math.log(1.5);
const MODEL_TOTAL_LOAD_VERSION = "model-total-load-v1";
const MODEL_TOTAL_LOAD_UNIT = "model-index";
const LOAD_MODEL_VERSION = "rule-observation-sequential-body-profile-surface-current";


function cloneDefaultModelConfiguration() {
  return structuredClone(DEFAULT_MODEL_CONFIGURATION);
}
moduleExports["BODY_PARTS"] = BODY_PARTS;
moduleExports["CONTRACTILE_BODY_PARTS"] = CONTRACTILE_BODY_PARTS;
moduleExports["BODY_PART_KEYS"] = BODY_PART_KEYS;
moduleExports["SURFACE_FIELDS"] = SURFACE_FIELDS;
moduleExports["FULL_RESPONSE_MAX_ABS_GRADE_PERCENT"] = FULL_RESPONSE_MAX_ABS_GRADE_PERCENT;
moduleExports["hasTreadmillOutdoorSurfaceMixFromComponents"] = hasTreadmillOutdoorSurfaceMixFromComponents;
moduleExports["hasTreadmillOutdoorSurfaceMixFromCourse"] = hasTreadmillOutdoorSurfaceMixFromCourse;
moduleExports["gradeIsWithinFullResponseDomain"] = gradeIsWithinFullResponseDomain;
moduleExports["SURFACE_TRAITS"] = SURFACE_TRAITS;
moduleExports["SURFACE_TRAIT_LABELS"] = SURFACE_TRAIT_LABELS;
moduleExports["SURFACE_INTERPRETATION_GUIDE"] = SURFACE_INTERPRETATION_GUIDE;
moduleExports["DEFAULT_MODEL_CONFIGURATION"] = DEFAULT_MODEL_CONFIGURATION;
moduleExports["MODEL_WARNING_THRESHOLD"] = MODEL_WARNING_THRESHOLD;
moduleExports["MODEL_TOTAL_LOAD_VERSION"] = MODEL_TOTAL_LOAD_VERSION;
moduleExports["MODEL_TOTAL_LOAD_UNIT"] = MODEL_TOTAL_LOAD_UNIT;
moduleExports["LOAD_MODEL_VERSION"] = LOAD_MODEL_VERSION;
moduleExports["cloneDefaultModelConfiguration"] = cloneDefaultModelConfiguration;
coreModules[3] = moduleExports;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2Snapshot.js =====
{
const moduleExports = Object.create(null);
const REGIONAL_MODEL_SNAPSHOT_ID = "PRIMARY_REGIONAL_REFERENCE100_V3";
const LEGACY_REGIONAL_MODEL_SNAPSHOT_ID = "PRIMARY_REGIONAL_V2";
const LEGACY_PRIMARY_REGIONAL_V2_SNAPSHOT = Object.freeze({
  snapshotId: LEGACY_REGIONAL_MODEL_SNAPSHOT_ID,
  modelVersion: "runload-primary-regional-v2.0",
  outputSemanticVersion: "runload-primary-regional-output-semantics-v2.0",
  authorityVersion: "RunLoad Primary Regional V2 Current Authority 2026-09-15",
});
const PRIMARY_REGIONAL_V2_SNAPSHOT = Object.freeze({
  snapshotId: REGIONAL_MODEL_SNAPSHOT_ID,
  modelVersion: "runload-primary-regional-reference100-v3.0",
  outputSemanticVersion: "runload-primary-regional-reference100-output-v3.0",
  authorityVersion: "RunLoad Calculation Engine V1.2+ 2026-09-16",
});
const CURRENT_REGIONAL_MODEL_SNAPSHOT = PRIMARY_REGIONAL_V2_SNAPSHOT;

function normalizeRegionalModelSnapshot(value) {
  const source = value && typeof value === "object" ? value : null;
  if (source?.snapshotId === REGIONAL_MODEL_SNAPSHOT_ID) return PRIMARY_REGIONAL_V2_SNAPSHOT;
  if (source?.snapshotId === LEGACY_REGIONAL_MODEL_SNAPSHOT_ID) return LEGACY_PRIMARY_REGIONAL_V2_SNAPSHOT;
  return null;
}

function regionalModelSnapshotForRecord(record = {}) {
  return normalizeRegionalModelSnapshot(record.regionalModelSnapshot) || CURRENT_REGIONAL_MODEL_SNAPSHOT;
}

function stampCurrentRegionalModel(record = {}) {
  return Object.freeze({ ...record, regionalModelSnapshot: CURRENT_REGIONAL_MODEL_SNAPSHOT });
}

function isCurrentRegionalModelRecord(record = {}) {
  return regionalModelSnapshotForRecord(record).snapshotId === REGIONAL_MODEL_SNAPSHOT_ID;
}
const isPrimaryRegionalV2Record = isCurrentRegionalModelRecord;
function regionalModelGenerationForRecord() { return REGIONAL_MODEL_SNAPSHOT_ID; }
moduleExports["REGIONAL_MODEL_SNAPSHOT_ID"] = REGIONAL_MODEL_SNAPSHOT_ID;
moduleExports["LEGACY_REGIONAL_MODEL_SNAPSHOT_ID"] = LEGACY_REGIONAL_MODEL_SNAPSHOT_ID;
moduleExports["LEGACY_PRIMARY_REGIONAL_V2_SNAPSHOT"] = LEGACY_PRIMARY_REGIONAL_V2_SNAPSHOT;
moduleExports["PRIMARY_REGIONAL_V2_SNAPSHOT"] = PRIMARY_REGIONAL_V2_SNAPSHOT;
moduleExports["CURRENT_REGIONAL_MODEL_SNAPSHOT"] = CURRENT_REGIONAL_MODEL_SNAPSHOT;
moduleExports["normalizeRegionalModelSnapshot"] = normalizeRegionalModelSnapshot;
moduleExports["regionalModelSnapshotForRecord"] = regionalModelSnapshotForRecord;
moduleExports["stampCurrentRegionalModel"] = stampCurrentRegionalModel;
moduleExports["isCurrentRegionalModelRecord"] = isCurrentRegionalModelRecord;
moduleExports["isPrimaryRegionalV2Record"] = isPrimaryRegionalV2Record;
moduleExports["regionalModelGenerationForRecord"] = regionalModelGenerationForRecord;
coreModules[4] = moduleExports;
}

// ===== core/model/numberUtilities.js =====
{
const moduleExports = Object.create(null);
function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampNumber(value, minimum, maximum, fallback = 0) {
  return Math.min(maximum, Math.max(minimum, toFiniteNumber(value, fallback)));
}

function sumNumbers(values = []) {
  return values.reduce((total, value) => total + toFiniteNumber(value, 0), 0);
}

function alphaFromTimeConstant(timeConstant) {
  return 2 / (toFiniteNumber(timeConstant, 0) + 1);
}

function roundNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return number;
  const factor = 10 ** Math.max(0, Number(digits) || 0);
  return Math.round((number + Number.EPSILON) * factor) / factor;
}
moduleExports["toFiniteNumber"] = toFiniteNumber;
moduleExports["clampNumber"] = clampNumber;
moduleExports["sumNumbers"] = sumNumbers;
moduleExports["alphaFromTimeConstant"] = alphaFromTimeConstant;
moduleExports["roundNumber"] = roundNumber;
coreModules[5] = moduleExports;
}

// ===== core/safety/inputSafety.js =====
{
const moduleExports = Object.create(null);
const INPUT_LIMITS = Object.freeze({
  csvBytes: 4 * 1024 * 1024,
  csvRows: 20000,
  csvColumns: 256,
  csvLineCharacters: 256 * 1024,
  backupBytes: 16 * 1024 * 1024,
  jsonDepth: 64,
  jsonNodes: 300000,
  jsonStringCharacters: 2 * 1024 * 1024,
  steps: 10000000,
  distanceKm: 10000,
  durationMinutes: 100000,
  portableRecords: 20000,
  portableFeedbackEntries: 20000,
  portablePlans: 20000,
  portableModelResults: 40000,
  portableCourses: 5000,
});

const DANGEROUS_JSON_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const BIDI_AND_INVISIBLE_CONTROLS = /[\u061C\u200B\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;
const SPREADSHEET_FORMULA_PREFIX = /^[\t\r\n ]*[=+\-@]/;
const PROTECTED_FORMULA_PREFIX = /^'([\t\r\n ]*[=+\-@])/;

function byteLength(value = "") {
  const text = String(value ?? "");
  if (typeof TextEncoder === "function") return new TextEncoder().encode(text).length;
  return unescape(encodeURIComponent(text)).length;
}

function normalizeUserText(value = "") {
  const text = String(value ?? "");
  const normalized = typeof text.normalize === "function" ? text.normalize("NFC") : text;
  return normalized.replace(BIDI_AND_INVISIBLE_CONTROLS, "");
}

function normalizePlainText(value = "", maximumLength = 240) {
  return normalizeUserText(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maximumLength);
}

function normalizeSingleLineText(value = "", maximumLength = 80) {
  return normalizePlainText(value, maximumLength * 2)
    .replace(/\s+/g, " ")
    .slice(0, maximumLength);
}

function protectSpreadsheetFormula(value) {
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value == null ? "" : String(value);
  }
  const text = String(value);
  return SPREADSHEET_FORMULA_PREFIX.test(text) && !PROTECTED_FORMULA_PREFIX.test(text)
    ? `'${text}`
    : text;
}

function decodeProtectedSpreadsheetText(value) {
  return String(value ?? "").replace(PROTECTED_FORMULA_PREFIX, "$1");
}

function escapeCsvValue(value, options = {}) {
  const text = options.protectFormula === false
    ? String(value ?? "")
    : protectSpreadsheetFormula(value);
  return /[",\n\r;,\t]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function assertCsvText(value, options = {}) {
  const text = String(value ?? "");
  const maximumBytes = Number(options.maximumBytes || INPUT_LIMITS.csvBytes);
  const bytes = byteLength(text);
  if (bytes > maximumBytes) {
    throw Object.assign(new Error("CSVが大きすぎます。"), {
      name: "InputSafetyError",
      code: "CSV_TOO_LARGE",
      details: { bytes, maximumBytes },
    });
  }
  const lines = text.split(/\r?\n/);
  const maximumRows = Number(options.maximumRows || INPUT_LIMITS.csvRows);
  if (lines.length > maximumRows + 1) {
    throw Object.assign(new Error("CSVの行数が多すぎます。"), {
      name: "InputSafetyError",
      code: "CSV_TOO_MANY_ROWS",
      details: { rows: lines.length, maximumRows },
    });
  }
  const maximumLineCharacters = Number(
    options.maximumLineCharacters || INPUT_LIMITS.csvLineCharacters,
  );
  const overlongLineIndex = lines.findIndex((line) => line.length > maximumLineCharacters);
  if (overlongLineIndex >= 0) {
    throw Object.assign(new Error(`CSVの${overlongLineIndex + 1}行目が長すぎます。`), {
      name: "InputSafetyError",
      code: "CSV_LINE_TOO_LONG",
      details: {
        line: overlongLineIndex + 1,
        length: lines[overlongLineIndex].length,
        maximumLineCharacters,
      },
    });
  }
  return Object.freeze({ ok: true, bytes, rows: lines.length });
}

function inspectJsonValue(root, options = {}) {
  const limits = {
    maximumDepth: Number(options.maximumDepth || INPUT_LIMITS.jsonDepth),
    maximumNodes: Number(options.maximumNodes || INPUT_LIMITS.jsonNodes),
    maximumStringCharacters: Number(
      options.maximumStringCharacters || INPUT_LIMITS.jsonStringCharacters,
    ),
  };
  const stack = [{ value: root, depth: 0, path: "$" }];
  const seen = typeof WeakSet === "function" ? new WeakSet() : null;
  let nodes = 0;

  while (stack.length) {
    const current = stack.pop();
    nodes += 1;
    if (nodes > limits.maximumNodes) {
      return { ok: false, code: "JSON_TOO_MANY_NODES", message: "バックアップ内の項目数が多すぎます。", path: current.path, nodes, limits };
    }
    if (current.depth > limits.maximumDepth) {
      return { ok: false, code: "JSON_TOO_DEEP", message: "バックアップの入れ子が深すぎます。", path: current.path, depth: current.depth, limits };
    }
    if (typeof current.value === "string" && current.value.length > limits.maximumStringCharacters) {
      return { ok: false, code: "JSON_STRING_TOO_LONG", message: "バックアップ内に長すぎる文字列があります。", path: current.path, length: current.value.length, limits };
    }
    if (!current.value || typeof current.value !== "object") continue;
    if (seen) {
      if (seen.has(current.value)) {
        return { ok: false, code: "JSON_CYCLE", message: "バックアップ内に循環参照があります。", path: current.path, limits };
      }
      seen.add(current.value);
    }
    for (const key of Object.keys(current.value)) {
      if (DANGEROUS_JSON_KEYS.has(key)) {
        return { ok: false, code: "JSON_DANGEROUS_KEY", message: `安全上使用できない項目名があります: ${key}`, path: `${current.path}.${key}`, key, limits };
      }
      stack.push({ value: current.value[key], depth: current.depth + 1, path: `${current.path}.${key}` });
    }
  }
  return { ok: true, nodes, limits };
}

function parseJsonText(value, options = {}) {
  const text = String(value ?? "").replace(/^\uFEFF/, "");
  const maximumBytes = Number(options.maximumBytes || INPUT_LIMITS.backupBytes);
  const bytes = byteLength(text);
  if (bytes > maximumBytes) {
    return { ok: false, code: "JSON_TOO_LARGE", message: "バックアップが大きすぎます。", details: { bytes, maximumBytes } };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, code: "JSON_PARSE_FAILED", message: "JSON形式を読み取れませんでした。", details: {} };
  }
  const inspection = inspectJsonValue(parsed, options);
  if (!inspection.ok) return { ok: false, code: inspection.code, message: inspection.message, details: inspection };
  return { ok: true, value: parsed, details: { bytes, nodes: inspection.nodes } };
}
moduleExports["INPUT_LIMITS"] = INPUT_LIMITS;
moduleExports["byteLength"] = byteLength;
moduleExports["normalizeUserText"] = normalizeUserText;
moduleExports["normalizePlainText"] = normalizePlainText;
moduleExports["normalizeSingleLineText"] = normalizeSingleLineText;
moduleExports["protectSpreadsheetFormula"] = protectSpreadsheetFormula;
moduleExports["decodeProtectedSpreadsheetText"] = decodeProtectedSpreadsheetText;
moduleExports["escapeCsvValue"] = escapeCsvValue;
moduleExports["assertCsvText"] = assertCsvText;
moduleExports["inspectJsonValue"] = inspectJsonValue;
moduleExports["parseJsonText"] = parseJsonText;
coreModules[6] = moduleExports;
}

// ===== core/personal/personalContext.js =====
{
const moduleExports = Object.create(null);
const { normalizePlainText, normalizeSingleLineText } = coreModules[6];

const PERSONAL_CONTEXT_SCHEMA_VERSION = 1;

const SHOE_TYPE_OPTIONS = Object.freeze([
  Object.freeze({ value: "", label: "未設定" }),
  Object.freeze({ value: "usual_training", label: "いつもの練習用" }),
  Object.freeze({ value: "soft", label: "やわらかめ" }),
  Object.freeze({ value: "light", label: "軽め" }),
  Object.freeze({ value: "race", label: "レース用" }),
  Object.freeze({ value: "trail", label: "山道・不整地向け" }),
  Object.freeze({ value: "other", label: "その他" }),
]);

const SHOE_SOFTNESS_OPTIONS = Object.freeze([
  Object.freeze({ value: "", label: "未設定" }),
  Object.freeze({ value: "soft", label: "やわらかめ" }),
  Object.freeze({ value: "normal", label: "ふつう" }),
  Object.freeze({ value: "firm", label: "かため" }),
  Object.freeze({ value: "unknown", label: "わからない" }),
]);

const FOOT_PLACEMENT_OPTIONS = Object.freeze([
  Object.freeze({ value: "", label: "未設定" }),
  Object.freeze({ value: "unknown", label: "よくわからない" }),
  Object.freeze({ value: "heel", label: "かかとからついた感じ" }),
  Object.freeze({ value: "full_sole", label: "足裏全体でついた感じ" }),
  Object.freeze({ value: "forefoot", label: "つま先寄りでついた感じ" }),
  Object.freeze({ value: "varies", label: "日によって違う" }),
]);

const RHYTHM_STRIDE_OPTIONS = Object.freeze([
  Object.freeze({ value: "", label: "未設定" }),
  Object.freeze({ value: "usual", label: "いつも通り" }),
  Object.freeze({ value: "small_step", label: "歩幅を小さくした" }),
  Object.freeze({ value: "rhythm_focus", label: "テンポよく足を動かした" }),
  Object.freeze({ value: "long_step", label: "歩幅を大きくした" }),
  Object.freeze({ value: "unknown", label: "よくわからない" }),
]);


const EQUIPMENT_TAG_OPTIONS = Object.freeze([
  Object.freeze({ value: "phone", label: "スマートフォン" }),
  Object.freeze({ value: "watch", label: "ランニングウォッチ" }),
  Object.freeze({ value: "bottle", label: "ボトル・給水" }),
  Object.freeze({ value: "bag", label: "バッグ・ポーチ" }),
  Object.freeze({ value: "support", label: "サポーター等" }),
  Object.freeze({ value: "other", label: "その他" }),
]);

const FOCUS_TAG_OPTIONS = Object.freeze([
  Object.freeze({ value: "relax", label: "力を抜いた" }),
  Object.freeze({ value: "small_step", label: "歩幅を小さくした" }),
  Object.freeze({ value: "rhythm", label: "テンポよく足を動かした" }),
  Object.freeze({ value: "posture", label: "背すじを起こした" }),
  Object.freeze({ value: "quiet_landing", label: "足音を小さくした" }),
  Object.freeze({ value: "uphill_easy", label: "上りで無理しなかった" }),
  Object.freeze({ value: "downhill_slow", label: "下りをゆっくり走った" }),
]);

function allowedValue(value, options) {
  const text = normalizeSingleLineText(value, 80);
  return options.some((option) => option.value === text) ? text : "";
}

function normalizeTagList(value, options) {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  const allowed = new Set(options.map((option) => option.value));
  return Object.freeze(Array.from(new Set(source
    .map((item) => normalizeSingleLineText(item, 40))
    .filter((item) => allowed.has(item)))));
}

function normalizeFocusTags(value) {
  return normalizeTagList(value, FOCUS_TAG_OPTIONS);
}

function hasPersonalContextInput(context = {}) {
  if (!context || typeof context !== "object") return false;
  return Boolean(
    context.shoeId
    || context.shoeLabel
    || context.shoeType
    || context.shoeSoftness
    || context.footPlacement
    || context.rhythmStride
    || (Array.isArray(context.focusTags) && context.focusTags.length)
    || (Array.isArray(context.equipmentTags) && context.equipmentTags.length)
    || context.equipmentNote
    || context.freeNote,
  );
}

function normalizePersonalContext(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const normalized = Object.freeze({
    schemaVersion: PERSONAL_CONTEXT_SCHEMA_VERSION,
    shoeId: normalizeSingleLineText(source.shoeId, 100),
    shoeLabel: normalizeSingleLineText(source.shoeLabel, 80),
    shoeType: allowedValue(source.shoeType, SHOE_TYPE_OPTIONS),
    shoeSoftness: allowedValue(source.shoeSoftness, SHOE_SOFTNESS_OPTIONS),
    footPlacement: allowedValue(source.footPlacement, FOOT_PLACEMENT_OPTIONS),
    rhythmStride: allowedValue(source.rhythmStride, RHYTHM_STRIDE_OPTIONS),
    focusTags: normalizeFocusTags(source.focusTags),
    equipmentTags: normalizeTagList(source.equipmentTags, EQUIPMENT_TAG_OPTIONS),
    equipmentNote: normalizePlainText(source.equipmentNote, 240),
    freeNote: normalizePlainText(source.freeNote, 240),
  });
  return hasPersonalContextInput(normalized) ? normalized : null;
}

function labelForOption(value, options) {
  return options.find((option) => option.value === value)?.label || "";
}

function summarizePersonalContext(context = {}) {
  const normalized = normalizePersonalContext(context);
  if (!normalized) {
    return Object.freeze({ hasInput: false, label: "未入力", description: "今日のシューズ・走り方は未入力です。", items: [] });
  }
  const items = [];
  if (normalized.shoeLabel) items.push(`シューズ：${normalized.shoeLabel}`);
  else if (normalized.shoeType) items.push(`シューズ：${labelForOption(normalized.shoeType, SHOE_TYPE_OPTIONS)}`);
  if (normalized.shoeSoftness) items.push(`やわらかさ：${labelForOption(normalized.shoeSoftness, SHOE_SOFTNESS_OPTIONS)}`);
  if (normalized.footPlacement) items.push(`足のつき方：${labelForOption(normalized.footPlacement, FOOT_PLACEMENT_OPTIONS)}`);
  if (normalized.rhythmStride) items.push(`歩幅・テンポ：${labelForOption(normalized.rhythmStride, RHYTHM_STRIDE_OPTIONS)}`);
  if (normalized.focusTags.length) {
    const labels = normalized.focusTags.map((tag) => FOCUS_TAG_OPTIONS.find((option) => option.value === tag)?.label || tag);
    items.push(`今日やったこと：${labels.join("、")}`);
  }
  if (normalized.equipmentTags.length) {
    const labels = normalized.equipmentTags.map((tag) => EQUIPMENT_TAG_OPTIONS.find((option) => option.value === tag)?.label || tag);
    items.push(`装備：${labels.join("、")}`);
  }
  if (normalized.equipmentNote) items.push("装備メモあり");
  if (normalized.freeNote) items.push("走り方メモあり");
  return Object.freeze({
    hasInput: true,
    label: "入力あり",
    description: items.slice(0, 3).join("・") + (items.length > 3 ? ` ほか${items.length - 3}件` : ""),
    items,
  });
}
moduleExports["PERSONAL_CONTEXT_SCHEMA_VERSION"] = PERSONAL_CONTEXT_SCHEMA_VERSION;
moduleExports["SHOE_TYPE_OPTIONS"] = SHOE_TYPE_OPTIONS;
moduleExports["SHOE_SOFTNESS_OPTIONS"] = SHOE_SOFTNESS_OPTIONS;
moduleExports["FOOT_PLACEMENT_OPTIONS"] = FOOT_PLACEMENT_OPTIONS;
moduleExports["RHYTHM_STRIDE_OPTIONS"] = RHYTHM_STRIDE_OPTIONS;
moduleExports["EQUIPMENT_TAG_OPTIONS"] = EQUIPMENT_TAG_OPTIONS;
moduleExports["FOCUS_TAG_OPTIONS"] = FOCUS_TAG_OPTIONS;
moduleExports["hasPersonalContextInput"] = hasPersonalContextInput;
moduleExports["normalizePersonalContext"] = normalizePersonalContext;
moduleExports["labelForOption"] = labelForOption;
moduleExports["summarizePersonalContext"] = summarizePersonalContext;
coreModules[7] = moduleExports;
}

// ===== core/safety/rpeProvenance.js =====
{
const moduleExports = Object.create(null);
const RPE_PROVENANCE = Object.freeze({
  userReported: "USER_REPORTED",
  notReported: "NOT_REPORTED",
});

function normalizeRpeProvenance(value = "", {
  hasValue = false,
  assumeExplicit = false,
} = {}) {
  const requested = String(value || "").toUpperCase();
  if (requested === RPE_PROVENANCE.userReported) return RPE_PROVENANCE.userReported;
  if (requested === RPE_PROVENANCE.notReported) return RPE_PROVENANCE.notReported;
  if (!hasValue) return RPE_PROVENANCE.notReported;
  return assumeExplicit ? RPE_PROVENANCE.userReported : RPE_PROVENANCE.notReported;
}

function isReportedRpeProvenance(value = "") {
  return String(value || "").toUpperCase() === RPE_PROVENANCE.userReported;
}

function reportedRpeValue(record = {}) {
  if (!isReportedRpeProvenance(record.rpeProvenance)) return null;
  const value = Number(record.perceivedExertion);
  return Number.isFinite(value) && value >= 0 && value <= 10 ? value : null;
}
moduleExports["RPE_PROVENANCE"] = RPE_PROVENANCE;
moduleExports["normalizeRpeProvenance"] = normalizeRpeProvenance;
moduleExports["isReportedRpeProvenance"] = isReportedRpeProvenance;
moduleExports["reportedRpeValue"] = reportedRpeValue;
coreModules[8] = moduleExports;
}

// ===== core/safety/inputValidation.js =====
{
const moduleExports = Object.create(null);
const { SURFACE_FIELDS, hasTreadmillOutdoorSurfaceMixFromCourse, hasTreadmillOutdoorSurfaceMixFromComponents } = coreModules[3];
const { normalizeRegionalModelSnapshot } = coreModules[4];
const { roundNumber, toFiniteNumber } = coreModules[5];
const { normalizePlainText, normalizeSingleLineText, INPUT_LIMITS } = coreModules[6];
const { normalizePersonalContext } = coreModules[7];
const { normalizeRpeProvenance, RPE_PROVENANCE } = coreModules[8];

function isValidLocalDate(value = "") {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function createReadableRecordId(date, existingIds = []) {
  const safeDate = isValidLocalDate(date) ? date : "unknown-date";
  const prefix = `record-${safeDate}-`;
  const usedNumbers = new Set(
    existingIds
      .filter((id) => String(id).startsWith(prefix))
      .map((id) => Number(String(id).slice(prefix.length)))
      .filter(Number.isFinite),
  );
  let sequence = 1;
  while (usedNumbers.has(sequence)) sequence += 1;
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}


function normalizeBodyProfileSnapshot(profileSource = {}, input = {}) {
  if (!profileSource || typeof profileSource !== "object" || !Object.keys(profileSource).length) return null;
  const snapshot = {
    schemaVersion: Math.max(0, Math.trunc(toFiniteNumber(profileSource.schemaVersion, 0))),
    numericUse: normalizeSingleLineText(profileSource.numericUse, 100),
    sex: normalizeSingleLineText(profileSource.sex || input.profile_sex, 40),
    ageBand: normalizeSingleLineText(profileSource.ageBand || input.profile_age_band, 40),
    heightCm: firstDefined(profileSource.heightCm, input.profile_height_cm, ""),
    weightKg: firstDefined(profileSource.weightKg, input.profile_weight_kg, ""),
    runningStartDateOrBand: normalizeSingleLineText(profileSource.runningStartDateOrBand, 80),
    experienceSelfAssessment: normalizeSingleLineText(profileSource.experienceSelfAssessment, 80),
    runningGoalTags: Object.freeze(Array.isArray(profileSource.runningGoalTags)
      ? profileSource.runningGoalTags.map((item) => normalizeSingleLineText(item, 80)).filter(Boolean)
      : []),
    recordedAt: normalizeSingleLineText(profileSource.recordedAt || input.profile_recorded_at, 50),
  };
  return Object.freeze(snapshot);
}

function normalizeCourse(rawCourse = {}, rawRecord = {}) {
  const course = rawCourse && typeof rawCourse === "object" ? rawCourse : {};
  const rawGradeMode = String(course.gradeInputMode || "").toUpperCase();
  const gradeInputMode = ["UNKNOWN", "FLAT", "SUMMARY", "SECTIONS"].includes(rawGradeMode)
    ? rawGradeMode
    : Array.isArray(course.sections) && course.sections.length
      ? "SECTIONS"
      : String(course.gradeKnowledge || "UNKNOWN").toUpperCase() === "KNOWN_FLAT"
        ? "FLAT"
        : String(course.gradeKnowledge || "UNKNOWN").toUpperCase() === "KNOWN_PROFILE"
          ? "SUMMARY"
          : "UNKNOWN";
  const gradeKnowledge = gradeInputMode === "FLAT"
    ? "KNOWN_FLAT"
    : ["SUMMARY", "SECTIONS"].includes(gradeInputMode)
      ? "KNOWN_PROFILE"
      : "UNKNOWN";
  const modelSurfaceClass = String(course.modelSurfaceClass || "UNKNOWN").toUpperCase();
  const routePattern = String(course.routePattern || "UNKNOWN").toUpperCase();
  const surfaceWetSlipState = String(course.surfaceWetSlipState || "UNKNOWN").toUpperCase();
  const normalized = {
    id: normalizeSingleLineText(firstDefined(course.id, course.courseId), 120),
    name: normalizeSingleLineText(firstDefined(course.name, course.courseName, rawRecord.course_name, rawRecord.courseName), 80),
    routePattern: ["LOOP", "OUT_AND_BACK", "ONE_WAY", "MIXED", "UNKNOWN"].includes(routePattern) ? routePattern : "UNKNOWN",
    surfaceWetSlipState: ["DRY", "DAMP", "WET", "SLIPPERY_REPORTED", "UNKNOWN"].includes(surfaceWetSlipState) ? surfaceWetSlipState : "UNKNOWN",
    gradeInputMode,
    surfaceInputMode: ["UNKNOWN", "SINGLE", "MIXED"].includes(String(course.surfaceInputMode || "").toUpperCase())
      ? String(course.surfaceInputMode).toUpperCase()
      : "UNKNOWN",
    gradeKnowledge,
    upPercent: toFiniteNumber(firstDefined(course.upPercent, course.up_pct, rawRecord.up_pct), 0),
    downPercent: toFiniteNumber(firstDefined(course.downPercent, course.down_pct, rawRecord.down_pct), 0),
    upGradePercent: toFiniteNumber(firstDefined(course.upGradePercent, course.up_grade_pct, rawRecord.up_grade_pct), 0),
    downGradePercent: toFiniteNumber(firstDefined(course.downGradePercent, course.down_grade_pct, rawRecord.down_grade_pct), 0),
    modelSurfaceClass: [
      "REF_HARD_EVEN_STABLE",
      "DRY_STABLE_GRASS_TURF",
      "DEEP_DRY_SOFT_SAND",
      "EXPLICIT_UNEVEN",
      "KNOWN_OTHER",
      "UNKNOWN",
    ].includes(modelSurfaceClass) ? modelSurfaceClass : "UNKNOWN",
  };
  SURFACE_FIELDS.forEach(({ recordKey, engineKey }) => {
    normalized[recordKey] = toFiniteNumber(
      firstDefined(course[recordKey], rawRecord[recordKey]),
      0,
    );
  });
  const positiveSurfaceCount = SURFACE_FIELDS.filter(({ recordKey }) => normalized[recordKey] > 0).length;
  if (normalized.surfaceInputMode === "UNKNOWN" && positiveSurfaceCount) {
    normalized.surfaceInputMode = positiveSurfaceCount === 1 ? "SINGLE" : "MIXED";
  }
  if (Array.isArray(course.modelSurfaceProfile) && course.modelSurfaceProfile.length) {
    normalized.modelSurfaceProfile = Object.freeze(course.modelSurfaceProfile.map((item = {}) => Object.freeze({
      sharePercent: toFiniteNumber(firstDefined(item.sharePercent, item.share_pct), 0),
      surfaceClass: normalizeSingleLineText(firstDefined(item.surfaceClass, item.surface_class), 80) || "UNKNOWN",
    })));
  }
  if (Array.isArray(course.sections) && course.sections.length) {
    normalized.sections = Object.freeze(course.sections.flatMap((item = {}, index) => {
      const rawDistance = firstDefined(item.distanceKm, item.distance_km);
      const rawShare = firstDefined(item.sharePercent, item.share_pct);
      const distanceKm = rawDistance == null ? null : toFiniteNumber(rawDistance, Number.NaN);
      const sharePercent = rawShare == null ? null : toFiniteNumber(rawShare, Number.NaN);
      const rawGrade = firstDefined(item.gradePercent, item.grade_pct);
      const signedGrade = rawGrade == null ? null : toFiniteNumber(rawGrade, Number.NaN);
      const durationMinutes = toFiniteNumber(firstDefined(item.durationMinutes, item.duration_minutes), Number.NaN);
      const steps = toFiniteNumber(item.steps, Number.NaN);
      const speedMps = toFiniteNumber(firstDefined(item.speedMps, item.speed_mps), Number.NaN);
      const cadenceSpm = toFiniteNumber(firstDefined(item.cadenceSpm, item.cadence_spm), Number.NaN);
      const rawDirection = String(item.gradeDirection || "").toUpperCase();
      const gradeDirection = ["UPHILL", "DOWNHILL", "FLAT", "UNKNOWN"].includes(rawDirection)
        ? rawDirection
        : Number(signedGrade) > 0
          ? "UPHILL"
          : Number(signedGrade) < 0
            ? "DOWNHILL"
            : Number(signedGrade) === 0
              ? "FLAT"
              : "UNKNOWN";
      const gradePercent = signedGrade == null || !Number.isFinite(signedGrade)
        ? null
        : gradeDirection === "DOWNHILL"
          ? -Math.abs(signedGrade)
          : gradeDirection === "UPHILL"
            ? Math.abs(signedGrade)
            : gradeDirection === "FLAT"
              ? 0
              : signedGrade;
      if (!(Number(distanceKm) > 0) && !(Number(sharePercent) > 0)) return [];
      return [Object.freeze({
        sectionId: normalizeSingleLineText(item.sectionId, 80) || `section-${index + 1}`,
        sharePercent: Number.isFinite(sharePercent) ? sharePercent : null,
        distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
        durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : null,
        steps: Number.isInteger(steps) && steps >= 0 ? steps : null,
        speedMps: Number.isFinite(speedMps) && speedMps > 0 ? speedMps : null,
        cadenceSpm: Number.isFinite(cadenceSpm) && cadenceSpm > 0 ? cadenceSpm : null,
        gradeDirection,
        gradePercent,
        surfaceClass: normalizeSingleLineText(firstDefined(item.surfaceClass, item.surface_class), 80) || normalized.modelSurfaceClass,
      })];
    }));
  }
  return Object.freeze(normalized);
}

function rawNumericValue(input, modernKey) {
  const value = input[modernKey];
  return value === "" || value === null || value === undefined ? null : value;
}

function validateProvidedNumber(errors, input, field, keys, minimum, maximum, message) {
  const value = rawNumericValue(input, keys[0], ...keys.slice(1));
  if (value === undefined) return;
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    errors.push({ field, code: `INVALID_${field.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`, message });
  }
}

function validateRequiredPositiveNumber(errors, input, field, keys, maximum, message) {
  const value = rawNumericValue(input, keys[0], ...keys.slice(1));
  const number = Number(value);
  if (value === undefined || !Number.isFinite(number) || number <= 0 || number > maximum) {
    errors.push({
      field,
      code: `INVALID_${field.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`,
      message,
    });
  }
}

function validateV27CourseInput(errors, input) {
  const course = input.course && typeof input.course === "object" ? input.course : {};
  const gradeKnowledge = String(course.gradeKnowledge || "UNKNOWN").toUpperCase();
  if (!["UNKNOWN", "KNOWN_FLAT", "KNOWN_PROFILE"].includes(gradeKnowledge)) {
    errors.push({ field: "course", code: "INVALID_GRADE_KNOWLEDGE", message: "坂道の入力方法を選び直してください。" });
  }
  const slopeFields = [
    ["upPercent", 0, 100],
    ["downPercent", 0, 100],
    ["upGradePercent", 0, 100],
    ["downGradePercent", 0, 100],
  ];
  slopeFields.forEach(([field, minimum, maximum]) => {
    if (course[field] === "" || course[field] == null) return;
    const number = Number(course[field]);
    if (!Number.isFinite(number) || number < minimum || number > maximum) {
      errors.push({ field: "course", code: `INVALID_${field.toUpperCase()}`, message: "坂道の割合・勾配を確認してください。" });
    }
  });
  const sections = Array.isArray(course.sections) ? course.sections : [];
  if (sections.length) {
    const invalid = sections.some((section) => {
      const distance = Number(section?.distanceKm);
      const share = Number(section?.sharePercent);
      const grade = section?.gradePercent == null ? null : Number(section.gradePercent);
      return (!(distance > 0) && !(share > 0))
        || (distance && !Number.isFinite(distance))
        || (share && (!Number.isFinite(share) || share < 0 || share > 100))
        || (grade != null && (!Number.isFinite(grade) || Math.abs(grade) > 100));
    });
    if (invalid) errors.push({ field: "course", code: "INVALID_COURSE_SECTION", message: "区間の距離・割合・勾配を確認してください。" });
    const shares = sections.map((section) => Number(section?.sharePercent)).filter(Number.isFinite);
    if (shares.length === sections.length && Math.abs(shares.reduce((sum, value) => sum + value, 0) - 100) > 0.01) {
      errors.push({ field: "course", code: "SECTION_SHARE_SUM_NOT_100", message: "区間割合の合計を100%にしてください。" });
    }
  } else if (gradeKnowledge === "KNOWN_PROFILE") {
    const up = Number(course.upPercent);
    const down = Number(course.downPercent);
    const upGrade = Number(course.upGradePercent);
    const downGrade = Number(course.downGradePercent);
    if ([up, down, upGrade, downGrade].some((value) => !Number.isFinite(value))) {
      errors.push({ field: "course", code: "GRADE_PROFILE_INCOMPLETE", message: "割合入力では、上り・下りの割合と代表勾配を確認してください。" });
    } else {
      if (up + down > 100.01) errors.push({ field: "course", code: "GRADE_SHARE_SUM_EXCEEDS_100", message: "上り区間と下り区間の合計は100%以下にしてください。" });
      if (up > 0 && upGrade <= 0) errors.push({ field: "course", code: "UPHILL_GRADE_REQUIRED", message: "上り区間がある場合は、正の代表勾配を入力してください。" });
      if (down > 0 && downGrade <= 0) errors.push({ field: "course", code: "DOWNHILL_GRADE_REQUIRED", message: "下り区間がある場合は、勾配の大きさを正の値で入力してください。" });
    }
  }

  const surfaceClass = String(course.modelSurfaceClass || "UNKNOWN").toUpperCase();
  const surfaceClasses = new Set([
    "REF_HARD_EVEN_STABLE",
    "DRY_STABLE_GRASS_TURF",
    "DEEP_DRY_SOFT_SAND",
    "EXPLICIT_UNEVEN",
    "KNOWN_OTHER",
    "UNKNOWN",
  ]);
  if (!surfaceClasses.has(surfaceClass)) errors.push({ field: "course", code: "INVALID_MODEL_SURFACE_CLASS", message: "路面の入力内容を確認してください。" });
  if (Array.isArray(course.modelSurfaceProfile) && course.modelSurfaceProfile.length) {
    const shares = course.modelSurfaceProfile.map((item) => Number(item?.sharePercent ?? item?.share_pct));
    if (shares.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
      errors.push({ field: "course", code: "INVALID_MODEL_SURFACE_SHARE", message: "路面割合を確認してください。" });
    } else if (Math.abs(shares.reduce((sum, value) => sum + value, 0) - 100) > 0.01) {
      errors.push({ field: "course", code: "MODEL_SURFACE_SUM_NOT_100", message: "路面割合の合計を100%にしてください。" });
    }
  }
}

function validateRunningRecordInput(input = {}) {
  const errors = [];
  const activityType = String(input.activityType || "").toLowerCase();
  if (!isValidLocalDate(input.date)) {
    errors.push({ field: "date", code: "INVALID_RECORD_DATE", message: "日付を正しく入力してください。" });
  }
  if (!["run", "rest"].includes(activityType)) {
    errors.push({ field: "activityType", code: "INVALID_ACTIVITY_TYPE", message: "走行または休養を選択してください。" });
  }
  if (activityType === "run") {
    validateRequiredPositiveNumber(errors, input, "distanceKm", ["distanceKm", "dist_km", "distKm"], INPUT_LIMITS.distanceKm, "走行記録では、0より大きい距離が必要です。");
    validateRequiredPositiveNumber(errors, input, "durationMinutes", ["durationMinutes", "time_min", "timeMin"], INPUT_LIMITS.durationMinutes, "走行記録では、0より大きい実走時間が必要です。");
    validateProvidedNumber(errors, input, "steps", ["steps"], 0, INPUT_LIMITS.steps, "歩数が入力可能な範囲を超えています。");
    validateProvidedNumber(errors, input, "perceivedExertion", ["perceivedExertion", "RPE", "rpe"], 0, 10, "きつさは0〜10で入力してください。");
    const runningFormat = String(input.runningFormat || "UNKNOWN").toUpperCase();
    if (!["CONTINUOUS_RUN", "RUN_WALK", "UNKNOWN"].includes(runningFormat)) {
      errors.push({ field: "runningFormat", code: "INVALID_RUNNING_FORMAT", message: "走行形式を選び直してください。" });
    }
    if (runningFormat === "RUN_WALK") {
      const runD = Number(rawNumericValue(input, "runWalkRunningDistanceKm"));
      const runT = Number(rawNumericValue(input, "runWalkRunningDurationMinutes"));
      const totalD = Number(rawNumericValue(input, "distanceKm", "dist_km", "distKm"));
      const totalT = Number(rawNumericValue(input, "durationMinutes", "time_min", "timeMin"));
      if (!(runD > 0 && runD < totalD)) errors.push({ field: "runWalkRunningDistanceKm", code: "INVALID_RUN_WALK_RUNNING_DISTANCE", message: "RUN_WALKでは、走った距離を全体距離より小さい正の値で入力してください。" });
      if (!(runT > 0 && runT < totalT)) errors.push({ field: "runWalkRunningDurationMinutes", code: "INVALID_RUN_WALK_RUNNING_DURATION", message: "RUN_WALKでは、走った時間を全体の実走時間より短い正の値で入力してください。" });
      const rwSections = Array.isArray(input.runWalkRunningSections) ? input.runWalkRunningSections : [];
      if (rwSections.length) {
        const shares = rwSections.map((section) => Number(section?.sharePercent));
        if (shares.some((value) => !Number.isFinite(value) || value <= 0 || value > 100) || Math.abs(shares.reduce((a,b)=>a+b,0) - 100) > 0.01) errors.push({ field: "runWalkRunningSections", code: "INVALID_RUN_WALK_RUNNING_SECTION_SHARES", message: "走った区間の割合は正の値で、合計100%にしてください。" });
        if (rwSections.some((section) => {
          const direction = String(section?.gradeDirection || "").toUpperCase();
          const grade = Number(section?.gradePercent);
          const directionInvalid = !["FLAT","UPHILL","DOWNHILL"].includes(direction);
          const gradeInvalid = !Number.isFinite(grade) || grade < 0 || grade > 15;
          const directionMagnitudeInvalid = direction === "FLAT" ? Math.abs(grade) > 1e-9 : ["UPHILL","DOWNHILL"].includes(direction) ? !(grade > 0) : false;
          return directionInvalid || gradeInvalid || directionMagnitudeInvalid || !Array.isArray(section?.surfaceComponents) || !section.surfaceComponents.length;
        })) errors.push({ field: "runWalkRunningSections", code: "RUN_WALK_RUNNING_SECTION_GRADE_OUT_OF_MODEL_USE_DOMAIN", message: "走った区間の勾配は、方向と0〜15%の確認範囲で入力してください。" });
        const rwSurfaceComponents = rwSections.flatMap((section) => Array.isArray(section?.surfaceComponents) ? section.surfaceComponents : []);
        if (hasTreadmillOutdoorSurfaceMixFromComponents(rwSurfaceComponents)) errors.push({ field: "runWalkRunningSections", code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルと屋外路面は、同じ走行の路面割合として混ぜて入力できません。" });
      }
    }
    const stepsProvenance = String(input.stepsProvenance || input.cadenceProvenance || "UNKNOWN").toUpperCase();
    if (!["DEVICE_MEASURED", "DEVICE_SYNCED", "ESTIMATED", "UNKNOWN"].includes(stepsProvenance)) {
      errors.push({ field: "stepsProvenance", code: "INVALID_STEPS_PROVENANCE", message: "歩数の取得方法を選び直してください。" });
    }

    const rawCourse = input.course && typeof input.course === "object" ? input.course : {};
    const surfaceValues = SURFACE_FIELDS.map(({ recordKey, engineKey }) => (
      firstDefined(rawCourse[recordKey], input[recordKey])
    ));
    const providedSurfaces = surfaceValues.filter((value) => value !== undefined);
    if (providedSurfaces.length && providedSurfaces.some((value) => Number(value) !== 0)) {
      const invalidSurface = providedSurfaces.some((value) => {
        const number = Number(value);
        return !Number.isFinite(number) || number < 0 || number > 100;
      });
      const surfaceSum = providedSurfaces.reduce((total, value) => total + Number(value || 0), 0);
      if (invalidSurface) {
        errors.push({ field: "course", code: "INVALID_SURFACE_PERCENT", message: "路面割合は0〜100で入力してください。" });
      } else if (Math.abs(surfaceSum - 100) > 1e-9) {
        errors.push({ field: "course", code: "SURFACE_SUM_NOT_100", message: "路面の合計を100%にしてください。", details: { surfaceSum } });
      }
      if (hasTreadmillOutdoorSurfaceMixFromCourse(rawCourse)) {
        errors.push({ field: "course", code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルと屋外路面は、同じ走行の路面割合として混ぜて入力できません。" });
      }
    }
    validateV27CourseInput(errors, input);
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

function normalizeContextObject(source = {}, specification = {}) {
  const raw = source && typeof source === "object" ? source : {};
  return Object.freeze(Object.fromEntries(Object.entries(specification).map(([key, config]) => {
    const value = raw[key];
    if (config === "number") {
      const number = Number(value);
      return [key, Number.isFinite(number) ? number : null];
    }
    if (config === "tags") {
      const items = Array.isArray(value) ? value : String(value || "").split(",");
      return [key, Object.freeze([...new Set(items.map((item) => normalizeSingleLineText(item, 80)).filter(Boolean))])];
    }
    if (config === "line") return [key, normalizeSingleLineText(value, 160)];
    return [key, normalizePlainText(value, Number(config) || 500)];
  })));
}

function normalizeRunningRecord(input = {}, options = {}) {
  const activityType = String(input.activityType || "").toLowerCase() === "rest" ? "rest" : "run";
  const nowIso = options.nowIso || new Date().toISOString();
  const date = String(input.date || "").slice(0, 10);
  const isRest = activityType === "rest";
  const distanceKm = isRest ? 0 : roundNumber(toFiniteNumber(firstDefined(input.distanceKm, input.dist_km, input.distKm), 0), 2);
  const durationMinutes = isRest ? 0 : toFiniteNumber(firstDefined(input.durationMinutes, input.time_min, input.timeMin), 0);
  const steps = isRest ? 0 : Math.round(toFiniteNumber(input.steps, 0));
  const rawRpe = firstDefined(input.perceivedExertion, input.RPE, input.rpe);
  const hasRpe = !isRest && rawRpe !== undefined && Number.isFinite(Number(rawRpe));
  const perceivedExertion = hasRpe ? Number(rawRpe) : null;
  const rpeProvenance = isRest
    ? RPE_PROVENANCE.notReported
    : normalizeRpeProvenance(input.rpeProvenance, {
      hasValue: hasRpe,
      assumeExplicit: options.assumeExplicitRpe === true,
    });
  const existingIds = Array.isArray(options.existingIds) ? options.existingIds : [];
  const id = normalizeSingleLineText(input.id, 100) || createReadableRecordId(date, existingIds);
  const profileSource = input.bodyProfileSnapshot || {};
  const planOutcomeSource = input.planOutcome || {};

  return Object.freeze({
    id,
    date,
    activityType,
    distanceKm,
    durationMinutes,
    steps,
    perceivedExertion,
    rpeProvenance,
    runningFormat: isRest
      ? "NOT_APPLICABLE"
      : ["CONTINUOUS_RUN", "RUN_WALK", "UNKNOWN"].includes(String(input.runningFormat || "UNKNOWN").toUpperCase())
        ? String(input.runningFormat || "UNKNOWN").toUpperCase()
        : "UNKNOWN",
    runWalkRunningDistanceKm: isRest || String(input.runningFormat || "UNKNOWN").toUpperCase() !== "RUN_WALK"
      ? null : (Number.isFinite(Number(input.runWalkRunningDistanceKm)) && Number(input.runWalkRunningDistanceKm) > 0 ? roundNumber(Number(input.runWalkRunningDistanceKm), 3) : null),
    runWalkRunningDurationMinutes: isRest || String(input.runningFormat || "UNKNOWN").toUpperCase() !== "RUN_WALK"
      ? null : (Number.isFinite(Number(input.runWalkRunningDurationMinutes)) && Number(input.runWalkRunningDurationMinutes) > 0 ? Number(input.runWalkRunningDurationMinutes) : null),
    runWalkRunningSections: isRest || String(input.runningFormat || "UNKNOWN").toUpperCase() !== "RUN_WALK"
      ? Object.freeze([])
      : Object.freeze((Array.isArray(input.runWalkRunningSections) ? input.runWalkRunningSections : []).map((section, index) => Object.freeze({
          sectionId: normalizeSingleLineText(section?.sectionId, 80) || `running-phase-${index + 1}`,
          sharePercent: Number(section?.sharePercent),
          gradeKnown: section?.gradeKnown === true,
          gradePercent: Number(section?.gradePercent),
          gradeDirection: ["FLAT","UPHILL","DOWNHILL"].includes(String(section?.gradeDirection || "").toUpperCase()) ? String(section.gradeDirection).toUpperCase() : "UNKNOWN",
          surfaceComponents: Object.freeze((Array.isArray(section?.surfaceComponents) ? section.surfaceComponents : []).map((item) => Object.freeze({
            componentId: normalizeSingleLineText(item?.componentId, 80), sharePercent: Number(item?.sharePercent), userCategory: normalizeSingleLineText(item?.userCategory, 80).toUpperCase(),
          }))),
        }))),
    stepsProvenance: isRest
      ? "NOT_APPLICABLE"
      : ["DEVICE_MEASURED", "DEVICE_SYNCED", "ESTIMATED", "UNKNOWN"].includes(String(input.stepsProvenance || input.cadenceProvenance || "UNKNOWN").toUpperCase())
        ? String(input.stepsProvenance || input.cadenceProvenance || "UNKNOWN").toUpperCase()
        : "UNKNOWN",
    course: normalizeCourse(input.course, input),
    memo: normalizePlainText(input.memo, 500),
    bodyProfileSnapshot: normalizeBodyProfileSnapshot(profileSource, input),
    planOutcome: Object.freeze({
      status: normalizeSingleLineText(planOutcomeSource.status || input.plan_outcome_status, 40),
      reason: normalizeSingleLineText(planOutcomeSource.reason || input.plan_change_reason, 40),
      reasonNote: normalizePlainText(planOutcomeSource.reasonNote || input.plan_change_note, 240),
      plannedDistanceKm: Math.max(0, toFiniteNumber(firstDefined(planOutcomeSource.plannedDistanceKm, input.planned_dist_km), 0)),
      plannedDurationMinutes: Math.max(0, toFiniteNumber(firstDefined(planOutcomeSource.plannedDurationMinutes, input.planned_time_min), 0)),
      plannedCourseSnapshot: planOutcomeSource.plannedCourseSnapshot && typeof planOutcomeSource.plannedCourseSnapshot === "object"
        ? Object.freeze({ ...planOutcomeSource.plannedCourseSnapshot })
        : null,
      planNote: normalizePlainText(planOutcomeSource.planNote, 500),
    }),
    personalContext: normalizePersonalContext(input.personalContext || {}),
    environmentContext: normalizeContextObject(input.environmentContext, { weather: "line", temperatureC: "number", windSummary: "line", environmentNote: 500 }),
    recoveryContext: normalizeContextObject(input.recoveryContext, { sleepSummary: "line", nutritionHydrationSummary: "line", lifestyleNote: 500 }),
    reflectionContext: normalizeContextObject(input.reflectionContext, { postRunReflection: 500, perceivedDifference: 500, reflectionKeyPoint: 500, nextCheckPoint: 500 }),
    consultationContext: normalizeContextObject(input.consultationContext, { consultationTarget: "line", consultationQuestion: 500, consultationDataSelection: "tags" }),
    regionalModelSnapshot: normalizeRegionalModelSnapshot(input.regionalModelSnapshot),
    createdAt: normalizeSingleLineText(input.createdAt, 50) || nowIso,
    updatedAt: nowIso,
  });
}

function validateRunningRecord(record = {}) {
  const errors = [];
  if (!isValidLocalDate(record.date)) {
    errors.push({ field: "date", code: "INVALID_RECORD_DATE", message: "日付を正しく入力してください。" });
  }
  if (!["run", "rest"].includes(record.activityType)) {
    errors.push({ field: "activityType", code: "INVALID_ACTIVITY_TYPE", message: "走行または休養を選択してください。" });
  }
  if (record.activityType === "run") {
    if (!Number.isFinite(record.distanceKm) || record.distanceKm <= 0 || record.distanceKm > INPUT_LIMITS.distanceKm) {
      errors.push({ field: "distanceKm", code: "INVALID_DISTANCE", message: "走行記録では、0より大きい距離が必要です。" });
    }
    if (!Number.isFinite(record.durationMinutes) || record.durationMinutes <= 0 || record.durationMinutes > INPUT_LIMITS.durationMinutes) {
      errors.push({ field: "durationMinutes", code: "INVALID_DURATION", message: "走行記録では、0より大きい実走時間が必要です。" });
    }
    if (record.steps < 0 || record.steps > INPUT_LIMITS.steps) {
      errors.push({ field: "steps", code: "INVALID_STEPS", message: "歩数が入力可能な範囲を超えています。" });
    }
    if (
      record.perceivedExertion != null
      && (
        !Number.isFinite(record.perceivedExertion)
        || record.perceivedExertion < 0
        || record.perceivedExertion > 10
      )
    ) {
      errors.push({ field: "perceivedExertion", code: "INVALID_EXERTION", message: "きつさは0〜10で入力してください。" });
    }
    if (!Object.values(RPE_PROVENANCE).includes(record.rpeProvenance)) {
      errors.push({ field: "rpeProvenance", code: "INVALID_RPE_PROVENANCE", message: "きつさの入力状態を確認してください。" });
    }
    if (
      record.rpeProvenance === RPE_PROVENANCE.userReported
      && record.perceivedExertion == null
    ) {
      errors.push({ field: "perceivedExertion", code: "REPORTED_RPE_VALUE_REQUIRED", message: "きつさを入力した状態では0〜10の値が必要です。" });
    }
    if (
      record.rpeProvenance === RPE_PROVENANCE.notReported
      && record.perceivedExertion != null
    ) {
      errors.push({ field: "rpeProvenance", code: "UNREPORTED_RPE_VALUE_CONTRADICTION", message: "きつさの値と入力状態が一致していません。" });
    }
    const surfaceSum = SURFACE_FIELDS.reduce(
      (total, { recordKey }) => total + toFiniteNumber(record.course?.[recordKey], 0),
      0,
    );
    if (surfaceSum > 0 && Math.abs(surfaceSum - 100) > 1e-9) {
      errors.push({ field: "course", code: "SURFACE_SUM_NOT_100", message: "路面の合計を100%にしてください。", details: { surfaceSum } });
    }
    if (hasTreadmillOutdoorSurfaceMixFromCourse(record.course || {})) {
      errors.push({ field: "course", code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルと屋外路面は、同じ走行の路面割合として混ぜて入力できません。" });
    }
    if (record.runningFormat === "RUN_WALK") {
      const rwSurfaceComponents = (record.runWalkRunningSections || []).flatMap((section) => Array.isArray(section?.surfaceComponents) ? section.surfaceComponents : []);
      if (hasTreadmillOutdoorSurfaceMixFromComponents(rwSurfaceComponents)) {
        errors.push({ field: "runWalkRunningSections", code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルと屋外路面は、同じ走行の路面割合として混ぜて入力できません。" });
      }
    }
    if (!["CONTINUOUS_RUN", "RUN_WALK", "UNKNOWN"].includes(record.runningFormat)) {
      errors.push({ field: "runningFormat", code: "INVALID_RUNNING_FORMAT", message: "走行形式を選び直してください。" });
    }
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}
moduleExports["isValidLocalDate"] = isValidLocalDate;
moduleExports["createReadableRecordId"] = createReadableRecordId;
moduleExports["validateRunningRecordInput"] = validateRunningRecordInput;
moduleExports["normalizeRunningRecord"] = normalizeRunningRecord;
moduleExports["validateRunningRecord"] = validateRunningRecord;
coreModules[9] = moduleExports;
}

// ===== core/storage/collectionRepository.js =====
{
const moduleExports = Object.create(null);
function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createCollectionRepository({
  gateway,
  storageKey,
  normalizeItem = (item) => item,
  getItemId = (item) => item.id,
  sortItems = (items) => items,
}) {
  function normalizeItems(rawItems) {
    return sortItems(rawItems.map((item) => normalizeItem(item)).filter(Boolean)).map(cloneValue);
  }

  function loadAllResult() {
    const readResult = gateway.readJsonResult(storageKey, []);
    if (!readResult.ok) {
      return {
        ...readResult,
        code: "STORAGE_COLLECTION_READ_FAILED",
        items: [],
      };
    }
    if (!Array.isArray(readResult.value)) {
      return {
        ok: false,
        operation: "validate",
        key: storageKey,
        code: "STORAGE_COLLECTION_INVALID",
        message: "Stored collection is not an array.",
        details: { actualType: readResult.value === null ? "null" : typeof readResult.value },
        items: [],
      };
    }
    try {
      return {
        ok: true,
        key: storageKey,
        exists: readResult.exists,
        items: normalizeItems(readResult.value),
      };
    } catch (error) {
      return {
        ok: false,
        operation: "normalize",
        key: storageKey,
        code: "STORAGE_COLLECTION_NORMALIZATION_FAILED",
        message: String(error?.message || error || "collection_normalization_failed"),
        items: [],
      };
    }
  }

  function loadAll() {
    const result = loadAllResult();
    return result.ok ? result.items : [];
  }

  function findById(id) {
    return loadAll().find((item) => getItemId(item) === id) || null;
  }

  function saveAll(items) {
    const normalizedItems = sortItems(
      (Array.isArray(items) ? items : []).map((item) => normalizeItem(item)).filter(Boolean),
    );
    const result = gateway.writeJson(storageKey, normalizedItems);
    return { ...result, items: result.ok ? normalizedItems.map(cloneValue) : loadAll() };
  }

  function upsert(item) {
    const normalizedItem = normalizeItem(item);
    if (!normalizedItem) {
      return { ok: false, code: "STORAGE_COLLECTION_ITEM_INVALID", item: null, items: [] };
    }
    const id = getItemId(normalizedItem);
    const currentResult = loadAllResult();
    if (!currentResult.ok) return { ...currentResult, item: null };
    const currentItems = currentResult.items;
    const existingIndex = currentItems.findIndex((entry) => getItemId(entry) === id);
    const nextItems = [...currentItems];
    if (existingIndex >= 0) nextItems[existingIndex] = normalizedItem;
    else nextItems.push(normalizedItem);
    const result = saveAll(nextItems);
    return { ...result, item: result.ok ? cloneValue(normalizedItem) : null };
  }

  function removeById(id) {
    const currentResult = loadAllResult();
    if (!currentResult.ok) return { ...currentResult, removed: false };
    const currentItems = currentResult.items;
    const nextItems = currentItems.filter((item) => getItemId(item) !== id);
    if (nextItems.length === currentItems.length) return { ok: true, removed: false, items: currentItems };
    const result = saveAll(nextItems);
    return { ...result, removed: result.ok };
  }

  return Object.freeze({ loadAll, loadAllResult, findById, saveAll, upsert, removeById });
}
moduleExports["createCollectionRepository"] = createCollectionRepository;
coreModules[10] = moduleExports;
}

// ===== core/storage/recordRepository.js =====
{
const moduleExports = Object.create(null);
const { normalizeRunningRecord, validateRunningRecord, validateRunningRecordInput } = coreModules[9];
const { createCollectionRepository } = coreModules[10];
const { STORAGE_KEYS } = coreModules[1];
const { stampCurrentRegionalModel } = coreModules[4];

function createRecordRepository(gateway) {
  const repository = createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.records,
    normalizeItem: (item) => normalizeRunningRecord(item, {
      existingIds: [],
      nowIso: item.updatedAt || item.createdAt || new Date().toISOString(),
    }),
    sortItems: (items) => [...items].sort((left, right) => (
      left.date.localeCompare(right.date) || left.id.localeCompare(right.id)
    )),
  });

  function save(record) {
    const inputValidation = validateRunningRecordInput(record);
    if (!inputValidation.ok) {
      return {
        ok: false,
        code: "RUNNING_RECORD_INPUT_VALIDATION_FAILED",
        validation: inputValidation,
        item: null,
      };
    }
    const existingResult = repository.loadAllResult();
    if (!existingResult.ok) return { ...existingResult, item: null };
    const existingRecords = existingResult.items;
    const normalizedRecord = normalizeRunningRecord(stampCurrentRegionalModel(record), {
      existingIds: existingRecords.map((item) => item.id),
      nowIso: new Date().toISOString(),
      assumeExplicitRpe: true,
    });
    const validation = validateRunningRecord(normalizedRecord);
    if (!validation.ok) {
      return {
        ok: false,
        code: "RUNNING_RECORD_VALIDATION_FAILED",
        validation,
        item: null,
      };
    }
    return repository.upsert(normalizedRecord);
  }

  function loadByDate(date) {
    return repository.loadAll().filter((record) => record.date === date);
  }

  return Object.freeze({
    loadAll: repository.loadAll,
    loadAllResult: repository.loadAllResult,
    findById: repository.findById,
    loadByDate,
    save,
    removeById: repository.removeById,
  });
}
moduleExports["createRecordRepository"] = createRecordRepository;
coreModules[11] = moduleExports;
}

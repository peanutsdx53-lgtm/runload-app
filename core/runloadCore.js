// RunLoad current internal core bundle. Source-module boundaries are retained as section headers.

const __mods = [];

// ===== core/pwaRegistration.js =====
{
const __exp = Object.create(null);
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
    const runLoadKeys = keys.filter((key) => (
      key.startsWith("runload-journal-")
      || key.startsWith("running-journal-")
      || key.startsWith("runload-new-model-")
    ));
    await Promise.all(runLoadKeys.map((key) => caches.delete(key)));
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
      const registration = await navigator.serviceWorker.register("./service-worker.js");
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
__exp["registerPwaServiceWorker"] = registerPwaServiceWorker;
__mods[0] = __exp;
}

// ===== core/storage/storageKeys.js =====
{
const __exp = Object.create(null);
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
  backups: `${STORAGE_NAMESPACE}-backup-v1`,
  corruptStorageBackup: `${STORAGE_NAMESPACE}-corrupt-storage-backup-v1`,
  historyUndo: `${STORAGE_NAMESPACE}-history-undo-v1`,
  secondPillarRofJ: `${STORAGE_NAMESPACE}-second-pillar-rof-j-v1`,
  secondPillarRofJLifecycle: `${STORAGE_NAMESPACE}-second-pillar-rof-j-lifecycle-v1`,
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
  STORAGE_KEYS.secondPillarRofJ,
  STORAGE_KEYS.secondPillarRofJLifecycle,
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
__exp["STORAGE_NAMESPACE"] = STORAGE_NAMESPACE;
__exp["STORAGE_KEYS"] = STORAGE_KEYS;
__exp["USER_DATA_STORAGE_KEYS"] = USER_DATA_STORAGE_KEYS;
__exp["INTERNAL_RECOVERY_STORAGE_KEYS"] = INTERNAL_RECOVERY_STORAGE_KEYS;
__exp["CURRENT_APP_REMOVABLE_STORAGE_KEYS"] = CURRENT_APP_REMOVABLE_STORAGE_KEYS;
__mods[1] = __exp;
}

// ===== core/storage/storageGateway.js =====
{
const __exp = Object.create(null);
const { STORAGE_KEYS } = __mods[1];

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
__exp["createMemoryStorage"] = createMemoryStorage;
__exp["createStorageGateway"] = createStorageGateway;
__mods[2] = __exp;
}

// ===== core/model/modelConstants.js =====
{
const __exp = Object.create(null);
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
__exp["BODY_PARTS"] = BODY_PARTS;
__exp["CONTRACTILE_BODY_PARTS"] = CONTRACTILE_BODY_PARTS;
__exp["BODY_PART_KEYS"] = BODY_PART_KEYS;
__exp["SURFACE_FIELDS"] = SURFACE_FIELDS;
__exp["FULL_RESPONSE_MAX_ABS_GRADE_PERCENT"] = FULL_RESPONSE_MAX_ABS_GRADE_PERCENT;
__exp["hasTreadmillOutdoorSurfaceMixFromComponents"] = hasTreadmillOutdoorSurfaceMixFromComponents;
__exp["hasTreadmillOutdoorSurfaceMixFromCourse"] = hasTreadmillOutdoorSurfaceMixFromCourse;
__exp["gradeIsWithinFullResponseDomain"] = gradeIsWithinFullResponseDomain;
__exp["SURFACE_TRAITS"] = SURFACE_TRAITS;
__exp["SURFACE_TRAIT_LABELS"] = SURFACE_TRAIT_LABELS;
__exp["SURFACE_INTERPRETATION_GUIDE"] = SURFACE_INTERPRETATION_GUIDE;
__exp["DEFAULT_MODEL_CONFIGURATION"] = DEFAULT_MODEL_CONFIGURATION;
__exp["MODEL_WARNING_THRESHOLD"] = MODEL_WARNING_THRESHOLD;
__exp["MODEL_TOTAL_LOAD_VERSION"] = MODEL_TOTAL_LOAD_VERSION;
__exp["MODEL_TOTAL_LOAD_UNIT"] = MODEL_TOTAL_LOAD_UNIT;
__exp["LOAD_MODEL_VERSION"] = LOAD_MODEL_VERSION;
__exp["cloneDefaultModelConfiguration"] = cloneDefaultModelConfiguration;
__mods[3] = __exp;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2Snapshot.js =====
{
const __exp = Object.create(null);
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
__exp["REGIONAL_MODEL_SNAPSHOT_ID"] = REGIONAL_MODEL_SNAPSHOT_ID;
__exp["LEGACY_REGIONAL_MODEL_SNAPSHOT_ID"] = LEGACY_REGIONAL_MODEL_SNAPSHOT_ID;
__exp["LEGACY_PRIMARY_REGIONAL_V2_SNAPSHOT"] = LEGACY_PRIMARY_REGIONAL_V2_SNAPSHOT;
__exp["PRIMARY_REGIONAL_V2_SNAPSHOT"] = PRIMARY_REGIONAL_V2_SNAPSHOT;
__exp["CURRENT_REGIONAL_MODEL_SNAPSHOT"] = CURRENT_REGIONAL_MODEL_SNAPSHOT;
__exp["normalizeRegionalModelSnapshot"] = normalizeRegionalModelSnapshot;
__exp["regionalModelSnapshotForRecord"] = regionalModelSnapshotForRecord;
__exp["stampCurrentRegionalModel"] = stampCurrentRegionalModel;
__exp["isCurrentRegionalModelRecord"] = isCurrentRegionalModelRecord;
__exp["isPrimaryRegionalV2Record"] = isPrimaryRegionalV2Record;
__exp["regionalModelGenerationForRecord"] = regionalModelGenerationForRecord;
__mods[4] = __exp;
}

// ===== core/model/numberUtilities.js =====
{
const __exp = Object.create(null);
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
__exp["toFiniteNumber"] = toFiniteNumber;
__exp["clampNumber"] = clampNumber;
__exp["sumNumbers"] = sumNumbers;
__exp["alphaFromTimeConstant"] = alphaFromTimeConstant;
__exp["roundNumber"] = roundNumber;
__mods[5] = __exp;
}

// ===== core/safety/inputSafety.js =====
{
const __exp = Object.create(null);
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
__exp["INPUT_LIMITS"] = INPUT_LIMITS;
__exp["byteLength"] = byteLength;
__exp["normalizeUserText"] = normalizeUserText;
__exp["normalizePlainText"] = normalizePlainText;
__exp["normalizeSingleLineText"] = normalizeSingleLineText;
__exp["protectSpreadsheetFormula"] = protectSpreadsheetFormula;
__exp["decodeProtectedSpreadsheetText"] = decodeProtectedSpreadsheetText;
__exp["escapeCsvValue"] = escapeCsvValue;
__exp["assertCsvText"] = assertCsvText;
__exp["inspectJsonValue"] = inspectJsonValue;
__exp["parseJsonText"] = parseJsonText;
__mods[6] = __exp;
}

// ===== core/personal/personalContext.js =====
{
const __exp = Object.create(null);
const { normalizePlainText, normalizeSingleLineText } = __mods[6];

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
__exp["PERSONAL_CONTEXT_SCHEMA_VERSION"] = PERSONAL_CONTEXT_SCHEMA_VERSION;
__exp["SHOE_TYPE_OPTIONS"] = SHOE_TYPE_OPTIONS;
__exp["SHOE_SOFTNESS_OPTIONS"] = SHOE_SOFTNESS_OPTIONS;
__exp["FOOT_PLACEMENT_OPTIONS"] = FOOT_PLACEMENT_OPTIONS;
__exp["RHYTHM_STRIDE_OPTIONS"] = RHYTHM_STRIDE_OPTIONS;
__exp["EQUIPMENT_TAG_OPTIONS"] = EQUIPMENT_TAG_OPTIONS;
__exp["FOCUS_TAG_OPTIONS"] = FOCUS_TAG_OPTIONS;
__exp["hasPersonalContextInput"] = hasPersonalContextInput;
__exp["normalizePersonalContext"] = normalizePersonalContext;
__exp["labelForOption"] = labelForOption;
__exp["summarizePersonalContext"] = summarizePersonalContext;
__mods[7] = __exp;
}

// ===== core/safety/rpeProvenance.js =====
{
const __exp = Object.create(null);
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
__exp["RPE_PROVENANCE"] = RPE_PROVENANCE;
__exp["normalizeRpeProvenance"] = normalizeRpeProvenance;
__exp["isReportedRpeProvenance"] = isReportedRpeProvenance;
__exp["reportedRpeValue"] = reportedRpeValue;
__mods[8] = __exp;
}

// ===== core/safety/inputValidation.js =====
{
const __exp = Object.create(null);
const { SURFACE_FIELDS, hasTreadmillOutdoorSurfaceMixFromCourse, hasTreadmillOutdoorSurfaceMixFromComponents } = __mods[3];
const { normalizeRegionalModelSnapshot } = __mods[4];
const { roundNumber, toFiniteNumber } = __mods[5];
const { normalizePlainText, normalizeSingleLineText, INPUT_LIMITS } = __mods[6];
const { normalizePersonalContext } = __mods[7];
const { normalizeRpeProvenance, RPE_PROVENANCE } = __mods[8];

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
__exp["isValidLocalDate"] = isValidLocalDate;
__exp["createReadableRecordId"] = createReadableRecordId;
__exp["validateRunningRecordInput"] = validateRunningRecordInput;
__exp["normalizeRunningRecord"] = normalizeRunningRecord;
__exp["validateRunningRecord"] = validateRunningRecord;
__mods[9] = __exp;
}

// ===== core/storage/collectionRepository.js =====
{
const __exp = Object.create(null);
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
__exp["createCollectionRepository"] = createCollectionRepository;
__mods[10] = __exp;
}

// ===== core/storage/recordRepository.js =====
{
const __exp = Object.create(null);
const { normalizeRunningRecord, validateRunningRecord, validateRunningRecordInput } = __mods[9];
const { createCollectionRepository } = __mods[10];
const { STORAGE_KEYS } = __mods[1];
const { stampCurrentRegionalModel } = __mods[4];

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
__exp["createRecordRepository"] = createRecordRepository;
__mods[11] = __exp;
}

// ===== core/model/v27/v27Constants.js =====
{
const __exp = Object.create(null);
const V27_MODEL_VERSION = "runload-load-model-v2.7";

const V27_ACTIVITY_TYPES = Object.freeze({
  continuousRun: "CONTINUOUS_RUN",
  runWalk: "RUN_WALK",
  unknown: "UNKNOWN",
});

const V27_MISSINGNESS_STATES = Object.freeze({
  knownApplied: "KNOWN_APPLIED",
  knownUnsupported: "KNOWN_NOT_NUMERICALLY_SUPPORTED",
  unknown: "UNKNOWN",
  invalid: "INVALID",
  outOfDomain: "OUT_OF_DOMAIN",
  notApplicable: "NOT_APPLICABLE",
});

const V27_REGIONS = Object.freeze([
  Object.freeze({ id: "R01", label: "腰・骨盤", primaryMode: "VOLUME_ONLY_CONTEXT" }),
  Object.freeze({ id: "R02", label: "股関節・臀部", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R03", label: "大腿前部", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R04", label: "大腿後部", primaryMode: "VOLUME_ONLY_CONTEXT" }),
  Object.freeze({ id: "R05", label: "膝", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R06", label: "すね", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R07", label: "ふくらはぎ・アキレス腱周辺", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R08", label: "足関節・足部", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
]);

const V27_EMPHASIS_REGION_IDS = Object.freeze([
  "R02",
  "R03",
  "R05",
  "R06",
  "R07",
  "R08",
]);

const V27_SURFACE_FACTORS = Object.freeze({
  REF_HARD_EVEN_STABLE: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "KNOWN_APPLIED",
  }),
  DRY_STABLE_GRASS_TURF: Object.freeze({
    central: 1.05,
    low: 1,
    high: 1.1,
    state: "KNOWN_APPLIED",
  }),
  DEEP_DRY_SOFT_SAND: Object.freeze({
    central: 1.4,
    low: 1.2,
    high: 1.6,
    state: "KNOWN_APPLIED",
  }),
  EXPLICIT_UNEVEN: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "KNOWN_NOT_NUMERICALLY_SUPPORTED",
  }),
  KNOWN_OTHER: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "KNOWN_NOT_NUMERICALLY_SUPPORTED",
  }),
  UNKNOWN: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "UNKNOWN",
  }),
});

const V27_GRADE_CURVES = Object.freeze({
  R02: Object.freeze({
    xs: Object.freeze([-5.71, -2.86, 0, 2.86, 5.71]),
    ys: Object.freeze([0.735294, 0.892157, 1, 1.362745, 1.598039]),
    endpointConfidence: "LOW",
    endpoint: "positive_hip_joint_power",
  }),
  R03: Object.freeze({
    xs: Object.freeze([-5.71, -2.86, 0, 2.86, 5.71]),
    ys: Object.freeze([1.311475, 1.081967, 1, 0.857923, 0.830601]),
    endpointConfidence: "LOW",
    endpoint: "negative_knee_joint_power_magnitude",
  }),
  R05: Object.freeze({
    xs: Object.freeze([-6, -3, 0, 3, 6]),
    ys: Object.freeze([1.347826, 1.147826, 1, 0.886957, 0.786957]),
    endpointConfidence: "MODERATE",
    endpoint: "pfj_cumulative_weighted_impulse_per_km",
  }),
  R06: Object.freeze({
    xs: Object.freeze([-6, -3, 0, 3, 6]),
    ys: Object.freeze([1.066667, 0.975, 1, 1.058333, 1.133333]),
    endpointConfidence: "MODERATE",
    endpoint: "tibial_cumulative_weighted_impulse_per_km",
  }),
  R07: Object.freeze({
    xs: Object.freeze([-6, -3, 0, 3, 6]),
    ys: Object.freeze([0.652677, 0.808973, 1, 1.228654, 1.46165]),
    endpointConfidence: "MODERATE",
    endpoint: "achilles_cumulative_weighted_impulse_per_km",
  }),
  R08: Object.freeze({
    xs: Object.freeze([-5.71, -2.86, 0, 2.86, 5.71]),
    ys: Object.freeze([0.764331, 0.802548, 1, 1.015924, 1.012739]),
    endpointConfidence: "LOW",
    endpoint: "absolute_ankle_joint_power_sum",
  }),
});

const V27_SPEED_CURVES = Object.freeze({
  R05: Object.freeze({
    xs: Object.freeze([2.78, 3, 3.33, 4, 5]),
    ys: Object.freeze([1, 0.991304, 1.008696, 1.052174, 1.034783]),
  }),
  R06: Object.freeze({
    xs: Object.freeze([2.78, 3, 3.33, 4, 5]),
    ys: Object.freeze([1, 1, 1, 1.008333, 1.008333]),
  }),
  R07: Object.freeze({
    xs: Object.freeze([2.78, 3, 3.33, 4, 5]),
    ys: Object.freeze([1, 1.015919, 1.021708, 1.047757, 1.044863]),
  }),
});

const V27_CADENCE_CURVES = Object.freeze({
  R05: Object.freeze({
    xs: Object.freeze([-10, 0, 10]),
    ys: Object.freeze([1.034783, 1, 0.956522]),
  }),
  R06: Object.freeze({
    xs: Object.freeze([-10, 0, 10]),
    ys: Object.freeze([1.041667, 1, 0.975]),
  }),
  R07: Object.freeze({
    xs: Object.freeze([-10, 0, 10]),
    ys: Object.freeze([1.093484, 1, 0.977337]),
  }),
});

const V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS = 0.1;
const V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG = 0.005;
const V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT = 20;
const V27_COMMON_REGIONAL_GRADE_DOMAIN_MAX_PERCENT = (
  Math.tan(5.71 * Math.PI / 180) * 100
);
const V27_COMMON_REGIONAL_GRADE_INPUT_MAX_PERCENT = (
  Math.tan(
    (5.71 + V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG) * Math.PI / 180,
  ) * 100
);

const V27_REGIONAL_VIEW_IDS = Object.freeze({
  withinRun: "WITHIN_RUN_REGIONAL_EMPHASIS",
  ownFlat: "OWN_FLAT_REFERENCE_RATIO",
  personal: "PERSONAL_USUAL_RATIO",
});
__exp["V27_MODEL_VERSION"] = V27_MODEL_VERSION;
__exp["V27_ACTIVITY_TYPES"] = V27_ACTIVITY_TYPES;
__exp["V27_MISSINGNESS_STATES"] = V27_MISSINGNESS_STATES;
__exp["V27_REGIONS"] = V27_REGIONS;
__exp["V27_EMPHASIS_REGION_IDS"] = V27_EMPHASIS_REGION_IDS;
__exp["V27_SURFACE_FACTORS"] = V27_SURFACE_FACTORS;
__exp["V27_GRADE_CURVES"] = V27_GRADE_CURVES;
__exp["V27_SPEED_CURVES"] = V27_SPEED_CURVES;
__exp["V27_CADENCE_CURVES"] = V27_CADENCE_CURVES;
__exp["V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS"] = V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS;
__exp["V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG"] = V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG;
__exp["V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT"] = V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT;
__exp["V27_COMMON_REGIONAL_GRADE_DOMAIN_MAX_PERCENT"] = V27_COMMON_REGIONAL_GRADE_DOMAIN_MAX_PERCENT;
__exp["V27_COMMON_REGIONAL_GRADE_INPUT_MAX_PERCENT"] = V27_COMMON_REGIONAL_GRADE_INPUT_MAX_PERCENT;
__exp["V27_REGIONAL_VIEW_IDS"] = V27_REGIONAL_VIEW_IDS;
__mods[12] = __exp;
}

// ===== core/storage/modelResultV27Repository.js =====
{
const __exp = Object.create(null);
const { V27_MODEL_VERSION } = __mods[12];
const { createCollectionRepository } = __mods[10];
const { STORAGE_KEYS } = __mods[1];

function normalizeResultRecord(item = {}) {
  if (
    !item
    || typeof item !== "object"
    || item.model_version !== V27_MODEL_VERSION
    || !String(item.id || "")
    || !String(item.record_id || "")
  ) {
    return null;
  }
  return Object.freeze({
    ...item,
    id: String(item.id),
    record_id: String(item.record_id),
    source_record_revision: String(item.source_record_revision || ""),
    generated_at: String(item.generated_at || ""),
    model_version: V27_MODEL_VERSION,
  });
}

function sortResultRecords(items) {
  return [...items].sort((left, right) => (
    left.record_id.localeCompare(right.record_id)
    || left.source_record_revision.localeCompare(right.source_record_revision)
    || left.id.localeCompare(right.id)
  ));
}

function createModelResultV27Repository(gateway) {
  const repository = createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.modelResultsV27,
    normalizeItem: normalizeResultRecord,
    getItemId: (item) => item.id,
    sortItems: sortResultRecords,
  });

  function loadForRecord(recordId) {
    return repository.loadAll().filter((item) => item.record_id === recordId);
  }

  function findLatestForRecord(recordId) {
    return loadForRecord(recordId).sort((left, right) => (
      right.source_record_revision.localeCompare(left.source_record_revision)
      || right.generated_at.localeCompare(left.generated_at)
      || right.id.localeCompare(left.id)
    ))[0] || null;
  }

  function latestByRecord() {
    const result = new Map();
    repository.loadAll().forEach((item) => {
      const current = result.get(item.record_id);
      if (
        !current
        || item.source_record_revision > current.source_record_revision
        || (
          item.source_record_revision === current.source_record_revision
          && item.id > current.id
        )
      ) {
        result.set(item.record_id, item);
      }
    });
    return result;
  }

  return Object.freeze({
    loadAll: repository.loadAll,
    loadAllResult: repository.loadAllResult,
    findById: repository.findById,
    loadForRecord,
    findLatestForRecord,
    latestByRecord,
    saveAll: repository.saveAll,
    upsert: repository.upsert,
    removeById: repository.removeById,
  });
}
__exp["createModelResultV27Repository"] = createModelResultV27Repository;
__mods[13] = __exp;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2Engine.js =====
{
const __exp = Object.create(null);
// RunLoad Primary Regional V2 calculation engine.
// Current public baseline for records created from this release onward.

const MODEL_VERSION = 'runload-primary-regional-reference100-v3.0';
const OUTPUT_SEMANTIC_VERSION = 'runload-primary-regional-reference100-output-v3.0';
const BUILD_ID = 'primary-reference100-v3-20260917-authority-v1.2plus';

const REGION_DEFS = Object.freeze([
  {id:'R01',name:'股関節部',referenceSpeedMps:2.50,domain:[2.50,4.50],construct:'股関節の機械的仕事に基づく部位内Reference-100',baselineSource:'FUKUCHI_2017',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R02',name:'殿部',referenceSpeedMps:2.50,domain:[2.25,4.50],construct:'殿部筋活動に基づく部位内Reference-100',baselineSource:'GAZENDAM_HOF_2007_FIGURE3_DIGITIZED',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R03',name:'大腿前面',referenceSpeedMps:2.50,domain:[2.25,4.50],construct:'大腿前面筋活動に基づく部位内Reference-100',baselineSource:'GAZENDAM_HOF_2007_FIGURE3_DIGITIZED',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R04',name:'大腿後面',referenceSpeedMps:2.50,domain:[2.25,4.50],construct:'大腿後面筋活動に基づく部位内Reference-100',baselineSource:'GAZENDAM_HOF_2007_FIGURE3_DIGITIZED',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R05',name:'膝蓋大腿関節部',referenceSpeedMps:2.78,domain:[8/3.6,16/3.6],construct:'膝蓋大腿関節stress力積に基づく部位内Reference-100',baselineSource:'HAGEN_2023',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R06',name:'脛骨部',referenceSpeedMps:2.78,domain:[2.78,5.00],construct:'脛骨stress力積に基づく部位内Reference-100',baselineSource:'VAN_HOOREN_2024',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R07',name:'下腿後面',referenceSpeedMps:2.50,domain:[2.25,4.50],construct:'下腿後面筋活動に基づく部位内Reference-100',baselineSource:'GAZENDAM_HOF_2007_TABLE3_NORMALIZED',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R08',name:'足関節部',referenceSpeedMps:2.50,domain:[2.50,4.50],construct:'足関節の機械的仕事に基づく部位内Reference-100',baselineSource:'FUKUCHI_2017',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R09',name:'アキレス腱部',referenceSpeedMps:2.78,domain:[2.78,5.00],construct:'アキレス腱strain力積に基づく部位内Reference-100',baselineSource:'VAN_HOOREN_2024',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R10',name:'後足部',referenceSpeedMps:2.50,domain:[1.50,2.50],construct:'後足部ピーク足底圧に基づく部位内Reference-100',baselineSource:'HO_2010',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE'},
  {id:'R11',name:'足底中部・内側縦足弓',referenceSpeedMps:2.50,domain:[1.50,2.50],construct:'中足部ピーク足底圧に基づく部位内Reference-100',baselineSource:'HO_2010',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE_PROJECT_COMPOSITE'},
  {id:'R12',name:'前足部',referenceSpeedMps:2.50,domain:[1.50,2.50],construct:'前足部ピーク足底圧に基づく部位内Reference-100',baselineSource:'HO_2010',outputSemantic:'REFERENCE_100_CONDITION_RESPONSE_PROJECT_COMPOSITE'},
]);
const DEF = new Map(REGION_DEFS.map(x=>[x.id,x]));

// Gazendam & Hof (2007) Table 3 coefficients are combined with relative FF areas
// reproducibly digitized from the saved Figure 3 image. Absolute FF areas are not
// required after 2.5 m/s normalization; R07 uses FF1 only, so its FF1 area cancels exactly.
const GAZENDAM_FF_RELATIVE_AREA=Object.freeze({1:1,2:1,3:0.4931059271592576,4:1,5:0.48108493932905066,6:1,7:0.8195583596214511,8:0.9756871035940803});
const EMG_COEFFS={
  SO:{1:[0.15,0.63,-0.24]}, GM:{1:[0.54,0.28,0]}, GL:{1:[0.06,1.11,-0.37]},
  VM:{2:[0.59,0,0]}, VL:{2:[0.46,0.17,0]}, RF:{2:[-0.17,0.64,0.018],3:[0.16,-0.37,0.50]},
  BF:{4:[0.68,-0.61,0.50],5:[-0.22,2.13,-1.14]}, ST:{4:[0.23,0.55,0],5:[-0.20,0.61,0]}, SM:{4:[0.32,0,0],5:[0.23,0,0]},
  GX:{6:[0,0.093,0],7:[0.046,0.13,0]}, GD:{6:[0.28,0,0],8:[0,0.29,0]}
};
const EMG_GROUPS={R02:['GX','GD'],R03:['VM','VL','RF'],R04:['BF','ST','SM'],R07:['SO','GM','GL']};

const FUKUCHI={
  R01:{pos:{2.5:0.80/1.86,3.5:1.49/2.46,4.5:2.43/2.96},neg:{2.5:0.27/1.86,3.5:0.42/2.46,4.5:0.66/2.96}},
  R08:{pos:{2.5:0.64/1.86,3.5:0.78/2.46,4.5:0.95/2.96},neg:{2.5:0.58/1.86,3.5:0.77/2.46,4.5:0.96/2.96}}
};
const VAN_SPEED={R06:{2.78:12424,3.00:11624,3.33:10551,4.00:9362,5.00:7802},R09:{2.78:439,3.00:413,3.33:374,4.00:325,5.00:266}};
const HO={He:{1.5:143.6,2.0:170.7,2.5:191.3},MM:{1.5:154.1,2.0:172.9,2.5:178.2},LM:{1.5:130.3,2.0:149.5,2.5:162.3},MF:{1.5:339.8,2.0:360.7,2.5:377.8},CF:{1.5:223.8,2.0:244.5,2.5:266.5},LF:{1.5:172.7,2.0:189.0,2.5:203.9}};
const HO_REGIONS={R10:['He'],R11:['MM','LM'],R12:['MF','CF','LF']};
const JIN_FUKUCHI_LOW_BRIDGE=Object.freeze({R01:{2.25:0.8715948738593665,2.50:1.0},R08:{2.25:1.1167426394595865,2.50:1.0}});
const LI_HO_HIGH_BRIDGE=Object.freeze({
  speed:[2.5,2.7777777777777777,3.0555555555555554,3.333333333333333],
  R10:[1.0,1.0324343257443083,1.124413309982487,1.1342206654991243],
  R11:[1.0,1.0197710818523362,1.0620326406783998,1.0686126014636348],
  R12:[1.0,1.0409252827811777,1.070758714214654,1.1053451452889045],
});
function interpKnots(xs,ys,x){if(x<xs[0]-1e-12||x>xs.at(-1)+1e-12)return null;for(let i=0;i<xs.length;i++)if(near(x,xs[i],1e-10))return ys[i];for(let i=0;i<xs.length-1;i++)if(x>xs[i]&&x<xs[i+1])return linear(x,xs[i],ys[i],xs[i+1],ys[i+1]);return null;}

const VH_GRADE={R05:{'-6':962,'-3':850,'0':787,'3':733,'6':703},R06:{'-6':13275,'-3':12401,'0':12424,'3':12553,'6':13171},R09:{'-6':324,'-3':367,'0':439,'3':516,'6':611}};
const R09_CAD={'-10':398,'0':374,'10':370};
const HO_HEEL_GRADE={'0':170.7,'5':161.4,'10':142.6,'15':124.1};
const HORIGUCHI={
  R10:{RFS:{'-6':371.0,'0':280.8,'6':212.5},FFS:{'-6':99.9,'0':72.1,'6':41.4}},
  R12:{RFS:{'-6':329.1,'0':375.7,'6':370.1},FFS:{'-6':504.7,'0':524.9,'6':528.2}}
};
const GRASS_R10=299.5/347.7;
const R12_GRASS_ENVELOPE=[0.895910642027,0.914520670558];
const HAGEN_REL_DEC={8:-.08,10:-.07,12:-.06,14:-.06,16:-.05};
const HAGEN_REL_INC={8:.10,10:.11,12:.11,14:.11,16:.10};
const VERIFIED_PROVENANCE=new Set(['VIDEO_VERIFIED','DEVICE_VERIFIED','INSTRUMENT_VERIFIED','LAB_VERIFIED']);

function finite(x){return typeof x==='number'&&Number.isFinite(x)}
function near(a,b,t=1e-9){return Math.abs(a-b)<=t}
function sortedKeys(o){return Object.keys(o).map(Number).sort((a,b)=>a-b)}
function linear(x,x0,y0,x1,y1){return y0+(y1-y0)*(x-x0)/(x1-x0)}
function interp(o,x){
  const xs=sortedKeys(o); if(x<xs[0]-1e-12||x>xs.at(-1)+1e-12) return null;
  if(near(x,xs[0]))return Number(o[xs[0]]); if(near(x,xs.at(-1)))return Number(o[xs.at(-1)]);
  for(let i=0;i<xs.length-1;i++){if(x>=xs[i]-1e-12&&x<=xs[i+1]+1e-12)return linear(x,xs[i],Number(o[xs[i]]),xs[i+1],Number(o[xs[i+1]]));}
  return null;
}
function isKnot(o,x){return sortedKeys(o).some(k=>near(k,x))}
function vhat(v){return v/Math.sqrt(9.81*0.99)}
function gain(v,c){const [d0,d1,d2]=c,q=vhat(v);return d0+d1*q+d2*q*q}
function muscleA(v,m){return Object.entries(EMG_COEFFS[m]).reduce((s,[k,c])=>s+GAZENDAM_FF_RELATIVE_AREA[Number(k)]*gain(v,c),0)}
function muscleRatio(v,m){return (muscleA(v,m)/v)/(muscleA(2.5,m)/2.5)}
function emgRaw(r,v){return EMG_GROUPS[r].reduce((s,m)=>s+muscleRatio(v,m),0)/EMG_GROUPS[r].length}
function hagH(s){return 796.25-31.17*s}
function hagD(s){return 908.84-36.86*s}
function hagI(s){return 635.35-22.36*s}
function interpCentroid(o,s){const xs=sortedKeys(o);if(s<xs[0]-1e-12||s>xs.at(-1)+1e-12)return null;return interp(o,s)}
function gradePctToDeg(p){return Math.atan(Number(p)/100)*180/Math.PI}

function rawBaselineInside(r,v){
  if(r==='R01'||r==='R08'){
    const fam=FUKUCHI[r]; const vals=['pos','neg'].map(k=>interp(fam[k],v)/fam[k][2.5]); return vals.reduce((a,b)=>a+b,0)/vals.length;
  }
  if(EMG_GROUPS[r]) return emgRaw(r,v);
  if(r==='R05') return hagH(v*3.6)/hagH(2.78*3.6);
  if(r==='R06'||r==='R09') return interp(VAN_SPEED[r],v)/VAN_SPEED[r][2.78];
  if(HO_REGIONS[r]) return HO_REGIONS[r].reduce((s,m)=>s+interp(HO[m],v)/HO[m][2.5],0)/HO_REGIONS[r].length;
  throw new Error('UNKNOWN_REGION');
}
function nearestInterior(r,b){
  if(r==='R01'||r==='R08') return b===2.5?3.5:3.5;
  if(r==='R05') return b<3?10/3.6:14/3.6;
  if(r==='R06'||r==='R09') return b===2.78?3.0:4.0;
  if(HO_REGIONS[r]) return 2.0;
  return null;
}
function boundaryLogSlope(r,b){
  if(r==='R05') return (-31.17*3.6)/hagH(b*3.6);
  const n=nearestInterior(r,b); const qb=rawBaselineInside(r,b), qn=rawBaselineInside(r,n);
  return (Math.log(qn)-Math.log(qb))/(n-b);
}
function baselineResponse(regionId,speedMps){
  const d=DEF.get(regionId),v=Number(speedMps); if(!d||!(v>0)) throw new Error('VALID_REGION_AND_POSITIVE_SPEED_REQUIRED');
  if((regionId==='R01'||regionId==='R08')&&v>=2.25-1e-12&&v<2.50-1e-12){
    const pts=JIN_FUKUCHI_LOW_BRIDGE[regionId];
    return {ratio:interp(pts,v),evidenceState:'P2_CROSS_SOURCE_BRIDGE',sourceFamily:'JIN_2018_TO_FUKUCHI_2017',routeId:`S-${regionId}-LOW`,flags:['BOUNDED_SPEED_BRIDGE']};
  }
  if((regionId==='R06'||regionId==='R09')&&v>=2.25-1e-12&&v<2.78-1e-12){
    const ratio=regionId==='R06'?(17636-2011*v)/(17636-2011*2.78):(639-76.2*v)/(639-76.2*2.78);
    return {ratio,evidenceState:'P1_SOURCE_MODEL_EXTENSION',sourceFamily:'VAN_HOOREN_2024_PUBLISHED_SPEED_MODEL',routeId:`S-${regionId}-LOW`,flags:['BOUNDED_LOW_SIDE_SPEED_EXTENSION']};
  }
  if(HO_REGIONS[regionId]&&v>2.50+1e-12&&v<=3.333333333333333+1e-12){
    const ratio=interpKnots(LI_HO_HIGH_BRIDGE.speed,LI_HO_HIGH_BRIDGE[regionId],v);
    return {ratio,evidenceState:'P2_CROSS_SOURCE_BRIDGE',sourceFamily:'LI_2020_TO_HO_2010',routeId:`S-${regionId}-HIGH`,flags:['BOUNDED_SPEED_BRIDGE',regionId==='R11'||regionId==='R12'?'PROJECT_DEFINED_COMPONENT_COMPOSITE':null].filter(Boolean)};
  }
  const [lo,hi]=d.domain;
  if(v<lo-1e-12||v>hi+1e-12)return {ratio:null,evidenceState:'EVIDENCE_INSUFFICIENT',sourceFamily:d.baselineSource,routeId:null,flags:['OUTSIDE_DIRECT_AND_APPROVED_SPEED_BRIDGE']};
  return {ratio:rawBaselineInside(regionId,v),evidenceState:'DIRECT',sourceFamily:d.baselineSource,routeId:`DIRECT-${regionId}-SPEED`,flags:[(regionId==='R11'||regionId==='R12')?'PROJECT_DEFINED_COMPONENT_COMPOSITE':null].filter(Boolean)};
}

function normalizeStrike(obs){
  if(!obs||typeof obs!=='object')return null; const value=String(obs.value||'').toUpperCase(), provenance=String(obs.provenance||'').toUpperCase();
  if(!['RFS','FFS','MFS'].includes(value))return null; return {value,provenance,verified:VERIFIED_PROVENANCE.has(provenance)};
}
function weakest(states){
  const rank={DIRECT:0,P1_SOURCE_MODEL_EXTENSION:1,P2_CROSS_SOURCE_BRIDGE:2,EVIDENCE_INSUFFICIENT:9};
  return states.reduce((w,s)=>(rank[s]??8)>(rank[w]??8)?s:w,states[0]||'DIRECT');
}
function addComponent(trace,c){trace.components.push(c); if(c.evidenceState)trace.states.push(c.evidenceState)}

function r05CadenceJoint(speed,cadence,personalRef){
  if(!(finite(cadence)&&cadence>0&&finite(personalRef)&&personalRef>0))return {active:false,state:'REFERENCE_BUILDING'};
  const s=speed*3.6;if(s<8-1e-12||s>16+1e-12)return {active:false,state:'EVIDENCE_INSUFFICIENT'};
  const lo=interpCentroid(HAGEN_REL_DEC,s),hi=interpCentroid(HAGEN_REL_INC,s),rel=cadence/personalRef-1;
  if(rel<lo-1e-12||rel>hi+1e-12)return {active:false,state:'EVIDENCE_INSUFFICIENT',relativeCadence:rel,sourceHull:[lo,hi]};
  const D=hagD(s),H=hagH(s),I=hagI(s); let raw;
  if(rel<=0)raw=linear(rel,lo,D,0,H); else raw=linear(rel,0,H,hi,I);
  return {active:true,ratio:raw/hagH(2.78*3.6),state:(near(rel,0)?'SOURCE_DEFINED_MODEL':'SOURCE_BOUNDED_INTERPOLATION'),relativeCadence:rel,sourceHull:[lo,hi],sourceFamily:'HAGEN_2023_SPEED_RELATIVE_CADENCE'};
}
function vhGradeRatio(r,gradeDeg){const raw=interp(VH_GRADE[r],gradeDeg);if(raw==null)return null;return raw/VH_GRADE[r]['0']}
function r09CadenceAbsolute(delta){const raw=interp(R09_CAD,delta);return raw==null?null:raw/VAN_SPEED.R09[2.78]}
function r09CadenceRelative(delta){const raw=interp(R09_CAD,delta);return raw==null?null:raw/R09_CAD['0']}
function horiguchiRatio(r,strike,gradeDeg){const pts=HORIGUCHI[r]?.[strike];if(!pts)return null;const raw=interp(pts,gradeDeg);return raw==null?null:raw/pts['0']}
function isOverground(runSetting){const x=String(runSetting||'').toUpperCase();return x.includes('OUTDOOR')||x.includes('OVERGROUND')}
function grassShare(surfaceComponents){if(!Array.isArray(surfaceComponents))return 0;return surfaceComponents.filter(x=>String(x.category||x.userCategory||'').toUpperCase().includes('NATURAL_GRASS')).reduce((s,x)=>s+Number(x.sharePercent??x.share_percent??0),0)/100}

function evaluateRegionSegment(regionId,{distanceKm,speedMps,gradePercent=null,cadenceSpm=null,personalHabitualCadenceSpm=null,surfaceComponents=null,runSetting=null,footStrikeObservation=null,allowR12GrassEnvelope=false}={}){
  const d=Number(distanceKm),v=Number(speedMps); if(!(d>=0&&v>0))return {regionId,state:'INVALID_SEGMENT_FACT'};
  const b=baselineResponse(regionId,v); const trace={baseline:b,components:[],states:[b.evidenceState],interactionState:'NO_UNRESOLVED_INTERACTION',unquantified:[]};
  if(b.ratio==null)return {regionId,state:'EVIDENCE_INSUFFICIENT',ratio:null,value:null,valueEnvelope:null,distanceKm:d,speedMps:v,evidenceState:'EVIDENCE_INSUFFICIENT',trace};
  let q=b.ratio; let cadenceApplied=false; let gradeApplied=false;

  // Cadence: Direct/source-native only. The adapter supplies cadence only when provenance is eligible.
  if(regionId==='R05'&&cadenceSpm!=null){
    const c=r05CadenceJoint(v,Number(cadenceSpm),Number(personalHabitualCadenceSpm));
    if(c.active){q=c.ratio;cadenceApplied=true;addComponent(trace,{axis:'CADENCE',sourceFamily:c.sourceFamily,evidenceState:'DIRECT',relativeCadence:c.relativeCadence,sourceHull:c.sourceHull,jointWithSpeed:true});}
    else trace.unquantified.push({axis:'CADENCE',state:c.state,reason:c.state==='REFERENCE_BUILDING'?'PERSONAL_REFERENCE_UNAVAILABLE':'OUTSIDE_HAGEN_SOURCE_HULL'});
  } else if(regionId==='R09'&&cadenceSpm!=null){
    const pref=Number(personalHabitualCadenceSpm),cur=Number(cadenceSpm);
    if(finite(pref)&&pref>0&&finite(cur)&&cur>0){
      const delta=cur-pref;
      if(Math.abs(delta)<=10+1e-12&&near(v,3.33,1e-6)){
        const qa=r09CadenceAbsolute(delta); if(qa!=null){q=qa;cadenceApplied=true;addComponent(trace,{axis:'CADENCE',sourceFamily:'VAN_HOOREN_2024_R09_CADENCE',evidenceState:'DIRECT',deltaSpm:delta,jointWithSpeed:true});}
      } else trace.unquantified.push({axis:'CADENCE',state:'EVIDENCE_INSUFFICIENT',reason:'CADENCE_DIRECT_ONLY_AT_3_33_MPS'});
    } else trace.unquantified.push({axis:'CADENCE',state:'REFERENCE_BUILDING',reason:'PERSONAL_REFERENCE_UNAVAILABLE'});
  } else if(regionId==='R06'&&cadenceSpm!=null) trace.unquantified.push({axis:'CADENCE',state:'EVIDENCE_INSUFFICIENT',reason:'R06_CADENCE_NUMERIC_ROUTE_INACTIVE'});

  // Grade: fixed/source-native Direct families only; no transfer and no multiplication with another axis.
  if(gradePercent!=null&&finite(Number(gradePercent))){
    const gp=Number(gradePercent),gd=gradePctToDeg(gp);
    if(regionId==='R05'&&near(v,2.78,1e-6)&&Math.abs(gd)<=6+1e-12){
      if(!cadenceApplied){const raw=interp(VH_GRADE.R05,gd);if(raw!=null){q=raw/VH_GRADE.R05['0'];gradeApplied=true;addComponent(trace,{axis:'GRADE',sourceFamily:'VAN_HOOREN_2024_R05_GRADE',evidenceState:'DIRECT',gradeDeg:gd,fixedSpeedMps:2.78});}}
      else trace.unquantified.push({axis:'GRADE',state:'EVIDENCE_INSUFFICIENT',reason:'GRADE_CADENCE_COMBINATION_NOT_AUTHORIZED'});
    } else if((regionId==='R06'||regionId==='R09')&&near(v,2.78,1e-6)&&Math.abs(gd)<=6+1e-12){
      if(!cadenceApplied){const raw=interp(VH_GRADE[regionId],gd);if(raw!=null){q=raw/VAN_SPEED[regionId][2.78];gradeApplied=true;addComponent(trace,{axis:'GRADE',sourceFamily:'VAN_HOOREN_2024_GRADE',evidenceState:'DIRECT',gradeDeg:gd,fixedSpeedMps:2.78});}}
      else trace.unquantified.push({axis:'GRADE',state:'EVIDENCE_INSUFFICIENT',reason:'GRADE_CADENCE_COMBINATION_NOT_AUTHORIZED'});
    } else if(regionId==='R10'&&near(v,2.0,1e-6)&&gp>=0&&gp<=15+1e-12){
      const raw=interp(HO_HEEL_GRADE,gp);if(raw!=null){q=raw/HO.He[2.5];gradeApplied=true;addComponent(trace,{axis:'GRADE',sourceFamily:'HO_2010_R10_UPHILL',evidenceState:'DIRECT',gradePercent:gp,fixedSpeedMps:2.0});}
    } else if(Math.abs(gp)>1e-12){
      trace.unquantified.push({axis:'GRADE',state:'EVIDENCE_INSUFFICIENT',reason:'OUTSIDE_AUTHORIZED_DIRECT_CONDITION_GEOMETRY'});
    }
  }

  // Surface and foot-strike are visible context only in the current Primary semantic.
  if(Array.isArray(surfaceComponents)&&surfaceComponents.some((x)=>Number(x?.sharePercent??x?.share_percent??0)>0)) trace.unquantified.push({axis:'SURFACE',state:'CONTEXT_ONLY',reason:'NO_ACTIVE_PRIMARY_NUMERIC_SURFACE_ROUTE'});
  if(footStrikeObservation) trace.unquantified.push({axis:'FOOT_STRIKE',state:'CONTEXT_ONLY',reason:'HORIGUCHI_PUBLIC_NUMERIC_ROUTE_INACTIVE'});
  if(cadenceApplied&&gradeApplied) trace.interactionState='AXES_PRESERVED_NOT_COMBINED';

  const finalState=weakest(trace.states.concat(trace.components.map(c=>c.evidenceState).filter(Boolean)));
  const value=100*q;
  return {regionId,state:'OK',distanceKm:d,speedMps:v,ratio:q,value,valueEnvelope:null,evidenceState:finalState,trace};
}

function wholeRunSpeed(distanceKm,durationMinutes){const d=Number(distanceKm),t=Number(durationMinutes);return d>0&&t>0?d*1000/(t*60):null}
function deriveRunningExposure(record){
  const fmt=String(record.runningFormat||'RUN').toUpperCase();
  if(fmt==='RUN_WALK'){
    const d=Number(record.runningDistanceKm),t=Number(record.runningDurationMinutes); if(!(d>0&&t>0))return {state:'RUNNING_PHASE_EXPOSURE_REQUIRED'};return {state:'OK',distanceKm:d,durationMinutes:t,speedMps:wholeRunSpeed(d,t),format:fmt};
  }
  const d=Number(record.distanceKm),t=Number(record.durationMinutes);if(!(d>0&&t>0))return {state:'INVALID_REQUIRED_RUNNING_FACT'};return {state:'OK',distanceKm:d,durationMinutes:t,speedMps:wholeRunSpeed(d,t),format:fmt};
}
function resolveSegments(record,exposure){
  const segs=Array.isArray(record.segments)?record.segments:[]; if(!segs.length)return {state:'NONE',segments:[]};
  const out=[];let total=0;
  for(const [i,s] of segs.entries()){
    let d=Number(s.distanceKm);if(!(d>=0)&&s.sharePercent!=null)d=exposure.distanceKm*Number(s.sharePercent)/100;
    if(!(d>=0))return {state:'INVALID_SEGMENT_DISTANCE',index:i}; total+=d;
    let speed=Number(s.speedMps);let speedProv='OBSERVED_OR_SEGMENT_DERIVED';
    if(!(speed>0)&&Number(s.durationMinutes)>0&&d>0)speed=d*1000/(Number(s.durationMinutes)*60);
    if(!(speed>0)){speed=exposure.speedMps;speedProv='MODEL_DERIVED_SEGMENT_SPEED_FALLBACK';}
    out.push({...s,distanceKm:d,speedMps:speed,speedProvenance:speedProv});
  }
  if(total>exposure.distanceKm+1e-8)return {state:'SEGMENT_EXPOSURE_EXCEEDS_RUNNING_DISTANCE',segmentDistanceKm:total,runningDistanceKm:exposure.distanceKm};
  if(total<exposure.distanceKm-1e-8)out.push({distanceKm:exposure.distanceKm-total,speedMps:exposure.speedMps,speedProvenance:'MODEL_DERIVED_SEGMENT_SPEED_FALLBACK',remainderState:'UNKNOWN_REMAINDER'});
  return {state:'OK',segments:out,segmentDistanceKm:total,remainderDistanceKm:Math.max(0,exposure.distanceKm-total)};
}
function summarizeRegions(segResults){
  const out={};
  for(const r of REGION_DEFS){
    const rs=segResults.map(x=>x.regionResults[r.id]);
    const totalDistance=rs.reduce((sum,x)=>sum+Number(x?.distanceKm||0),0);
    const known=rs.filter(x=>x?.value!=null&&Number(x.distanceKm)>=0);
    const supportedDistance=known.reduce((sum,x)=>sum+Number(x.distanceKm||0),0);
    const unsupportedDistance=Math.max(0,totalDistance-supportedDistance);
    const weightedNumerator=known.reduce((sum,x)=>sum+Number(x.distanceKm||0)*Number(x.value),0);
    const supportedOnlyValue=supportedDistance>0?weightedNumerator/supportedDistance:null;
    const fullValue=unsupportedDistance<=1e-9&&totalDistance>0?weightedNumerator/totalDistance:null;
    out[r.id]={value:fullValue,knownValue:supportedOnlyValue,valueEnvelope:null,supportedDistanceKm:supportedDistance,unsupportedDistanceKm:unsupportedDistance,coverageProportion:totalDistance>0?supportedDistance/totalDistance:0,state:unsupportedDistance>1e-9?'PARTIAL_EVIDENCE':fullValue==null?'EVIDENCE_INSUFFICIENT':'OK',segmentEvidence:rs.map(x=>x?.evidenceState||'EVIDENCE_INSUFFICIENT')};
  }return out;
}

function gradeAxisSegments(record,exposure){
  const u=Number(record.uphillSharePercent??0),d=Number(record.downhillSharePercent??0),f=Math.max(0,100-u-d),gu=Number(record.uphillGradePercent??0),gd=Number(record.downhillGradePercent??0);
  if(u<0||d<0||u+d>100+1e-8||gu<0||gd<0)return null;
  const a=[];if(u>0)a.push({distanceKm:exposure.distanceKm*u/100,speedMps:exposure.speedMps,gradePercent:gu,axis:'GRADE_UP'});if(d>0)a.push({distanceKm:exposure.distanceKm*d/100,speedMps:exposure.speedMps,gradePercent:-gd,axis:'GRADE_DOWN'});if(f>0)a.push({distanceKm:exposure.distanceKm*f/100,speedMps:exposure.speedMps,gradePercent:0,axis:'GRADE_FLAT'});return a;
}
function surfaceAxisSegments(record,exposure){
  if(!Array.isArray(record.surfaceComponents)||!record.surfaceComponents.length)return null;let total=0;const a=[];for(const x of record.surfaceComponents){const sh=Number(x.sharePercent??x.share_percent??0);if(sh<0)return null;total+=sh;if(sh>0)a.push({distanceKm:exposure.distanceKm*sh/100,speedMps:exposure.speedMps,surfaceComponents:[{category:x.category||x.userCategory,sharePercent:100}],runSetting:record.runSetting,axis:'SURFACE'});}if(total>100+1e-8)return null;if(total<100-1e-8)a.push({distanceKm:exposure.distanceKm*(100-total)/100,speedMps:exposure.speedMps,axis:'SURFACE_UNKNOWN_REMAINDER'});return a;
}
function evalSegments(segments,record,{useWholeCadence=false}={}){return segments.map((s,i)=>({index:i,remainderState:s.remainderState||null,speedProvenance:s.speedProvenance||null,regionResults:Object.fromEntries(REGION_DEFS.map(r=>[r.id,evaluateRegionSegment(r.id,{...s,cadenceSpm:s.cadenceSpm??(useWholeCadence?record.averageCadenceSpm:null),personalHabitualCadenceSpm:s.personalHabitualCadenceSpm??(useWholeCadence?record.personalHabitualCadenceSpm:null),runSetting:s.runSetting??record.runSetting,footStrikeObservation:s.footStrikeObservation??record.footStrikeObservation,allowR12GrassEnvelope:record.allowR12GrassEnvelope===true})]))}))}

function calculateRun(record={}){
  const exposure=deriveRunningExposure(record);if(exposure.state!=='OK')return {state:exposure.state,modelVersion:MODEL_VERSION,outputSemanticVersion:OUTPUT_SEMANTIC_VERSION};
  const seg=resolveSegments(record,exposure);
  if(seg.state==='OK'){
    const evaluated=evalSegments(seg.segments,record,{useWholeCadence:true});return {state:'OK',courseState:seg.remainderDistanceKm>0?'HYBRID_PARTIAL_SEGMENTED':'SEGMENTED_COLOCATED',exposure,segments:evaluated,regions:summarizeRegions(evaluated),modelVersion:MODEL_VERSION,outputSemanticVersion:OUTPUT_SEMANTIC_VERSION};
  }
  if(seg.state!=='NONE')return {state:seg.state,...seg,modelVersion:MODEL_VERSION,outputSemanticVersion:OUTPUT_SEMANTIC_VERSION};

  const baseSeg=[{distanceKm:exposure.distanceKm,speedMps:exposure.speedMps,runSetting:record.runSetting}];
  const baseRegions=summarizeRegions(evalSegments(baseSeg,record,{useWholeCadence:false}));
  const cadenceRegions=summarizeRegions(evalSegments(baseSeg,record,{useWholeCadence:true}));
  const gsegs=gradeAxisSegments(record,exposure);
  const hasGrade=!!gsegs&&(Number(record.uphillSharePercent??0)>0||Number(record.downhillSharePercent??0)>0);
  const hasCadence=record.averageCadenceSpm!=null;
  const gradeRegions=hasGrade?summarizeRegions(evalSegments(gsegs,record,{useWholeCadence:false})):null;
  const main=JSON.parse(JSON.stringify(baseRegions));
  if(hasCadence){for(const rid of ['R05','R09'])if(cadenceRegions[rid]?.value!=null)main[rid]=cadenceRegions[rid];}
  if(hasGrade&&gradeRegions){
    for(const rid of ['R05','R06','R09','R10']){
      if(rid==='R05'&&hasCadence&&cadenceRegions.R05?.value!=null)continue;
      if(gradeRegions[rid]?.value!=null)main[rid]=gradeRegions[rid];
    }
  }
  const axes={};if(hasCadence)axes.cadence=cadenceRegions;if(hasGrade)axes.grade=gradeRegions;
  return {state:'OK',courseState:'WHOLE_RUN_ONLY',combinedConditionState:(hasCadence&&hasGrade)?'AXES_PRESERVED_NOT_COMBINED':null,exposure,regions:main,axisEstimates:axes,surfaceContextRecorded:Array.isArray(record.surfaceComponents)&&record.surfaceComponents.length>0,modelVersion:MODEL_VERSION,outputSemanticVersion:OUTPUT_SEMANTIC_VERSION};
}

function regionDefinition(id){return DEF.get(id)||null}
__exp["MODEL_VERSION"] = MODEL_VERSION;
__exp["OUTPUT_SEMANTIC_VERSION"] = OUTPUT_SEMANTIC_VERSION;
__exp["BUILD_ID"] = BUILD_ID;
__exp["REGION_DEFS"] = REGION_DEFS;
__exp["R12_GRASS_ENVELOPE"] = R12_GRASS_ENVELOPE;
__exp["baselineResponse"] = baselineResponse;
__exp["evaluateRegionSegment"] = evaluateRegionSegment;
__exp["calculateRun"] = calculateRun;
__exp["regionDefinition"] = regionDefinition;
__mods[14] = __exp;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2InputTrace.js =====
{
const __exp = Object.create(null);
// Current 93-input trace definition for Primary Regional V2.
// Values are preserved as supplied; no truthy/falsy coercion.
const RETAINED_INPUTS = Object.freeze([
  {inputId:'RL-IN-001',technicalName:'dayStatus',roles:'EXPLANATION_TRACE;HISTORY_FILTER_REFERENCE_BUILDING',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-002',technicalName:'sessionDate',roles:'EXPLANATION_TRACE;HISTORY_FILTER_REFERENCE_BUILDING',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-003',technicalName:'activityType',roles:'EXPLANATION_TRACE;HISTORY_FILTER_REFERENCE_BUILDING',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-004',technicalName:'sessionId',roles:'EXPLANATION_TRACE;HISTORY_FILTER_REFERENCE_BUILDING',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-005',technicalName:'sessionSequence',roles:'EXPLANATION_TRACE;HISTORY_FILTER_REFERENCE_BUILDING',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-006',technicalName:'recordNote',roles:'EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-007',technicalName:'recordRevision',roles:'EXPLANATION_TRACE;HISTORY_FILTER_REFERENCE_BUILDING',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-010',technicalName:'distanceStatus',roles:'UNCERTAINTY_PROVENANCE;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-011',technicalName:'distanceKm',roles:'COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-012',technicalName:'durationStatus',roles:'UNCERTAINTY_PROVENANCE;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-013',technicalName:'durationMinutes',roles:'COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-014',technicalName:'stepsStatus',roles:'UNCERTAINTY_PROVENANCE;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-015',technicalName:'steps',roles:'HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-016',technicalName:'stepsProvenance',roles:'UNCERTAINTY_PROVENANCE;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-017',technicalName:'runningFormat',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-018',technicalName:'runSetting',roles:'SOURCE_APPLICABILITY;UNCERTAINTY_PROVENANCE;COURSE_CONTEXT',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-DV-019',technicalName:'averageSpeedMps',roles:'COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-DV-020',technicalName:'averagePaceMinPerKm',roles:'COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-DV-021',technicalName:'averageCadenceSpm',roles:'COMPARISON_QUALIFIER;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-030',technicalName:'courseId',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-031',technicalName:'courseName',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-032',technicalName:'gradeKnowledge',roles:'UNCERTAINTY_PROVENANCE;COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-033',technicalName:'uphillSharePercent',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-034',technicalName:'downhillSharePercent',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-DV-035',technicalName:'flatSharePercent',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-036',technicalName:'uphillGradePercent',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-037',technicalName:'downhillGradePercent',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-038',technicalName:'routePattern',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-039',technicalName:'courseSections[]',roles:'COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-040',technicalName:'surfaceKnowledge',roles:'UNCERTAINTY_PROVENANCE;COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-041',technicalName:'surfaceComponents[]',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-042',technicalName:'surfaceMaterialLabel',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-043',technicalName:'surfaceSharePercent',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-044',technicalName:'surfaceHardnessLevel',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-045',technicalName:'surfaceUnevennessLevel',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-046',technicalName:'surfaceGripLevel',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-047',technicalName:'surfaceSinkLevel',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-048',technicalName:'surfaceReboundLevel',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-049',technicalName:'surfaceStabilityLevel',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-050',technicalName:'surfaceWetSlipState',roles:'COURSE_CONTEXT;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-060',technicalName:'weatherState',roles:'SOURCE_APPLICABILITY;COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-061',technicalName:'temperatureC',roles:'SOURCE_APPLICABILITY;COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-062',technicalName:'windLevel',roles:'SOURCE_APPLICABILITY;COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-063',technicalName:'environmentNote',roles:'SOURCE_APPLICABILITY;COURSE_CONTEXT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-070',technicalName:'shoeId',roles:'ENTITY_REFERENCE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-071',technicalName:'shoeLabel',roles:'ENTITY_REFERENCE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-072',technicalName:'shoeType',roles:'SOURCE_APPLICABILITY;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-073',technicalName:'shoeSoftness',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-074',technicalName:'equipmentTags[]',roles:'COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-075',technicalName:'equipmentNote',roles:'COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-080',technicalName:'footPlacementSelfReport',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-081',technicalName:'rhythmStrideSelfReport',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-082',technicalName:'runningFocusTags[]',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-083',technicalName:'runningStyleNote',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-090',technicalName:'rpeStatus',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-091',technicalName:'rpeValue',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-092',technicalName:'rpeProvenance',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-093',technicalName:'postRunReflection',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-094',technicalName:'perceivedDifference',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-100',technicalName:'bodyReviewStatus',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-101',technicalName:'bodyAreaObservations[]',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-102',technicalName:'bodyAreaId',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-103',technicalName:'laterality',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-104',technicalName:'noticedIntensity',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-105',technicalName:'sensationType',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-106',technicalName:'noticedTiming',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-107',technicalName:'bodyAreaNote',roles:'SUBJECTIVE_INTERNAL_RESPONSE;COMPARISON_QUALIFIER;CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-110',technicalName:'runningStartDateOrBand',roles:'SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-111',technicalName:'experienceSelfAssessment',roles:'SUBJECTIVE_INTERNAL_RESPONSE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-112',technicalName:'runningGoalTags[]',roles:'SUBJECTIVE_INTERNAL_RESPONSE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-113',technicalName:'heightCm',roles:'UNCERTAINTY_PROVENANCE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-114',technicalName:'weightKg',roles:'UNCERTAINTY_PROVENANCE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-115',technicalName:'ageBand',roles:'UNCERTAINTY_PROVENANCE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-116',technicalName:'sexOrReferenceCategory',roles:'UNCERTAINTY_PROVENANCE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-117',technicalName:'sleepSummary',roles:'SUBJECTIVE_INTERNAL_RESPONSE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-118',technicalName:'nutritionHydrationSummary',roles:'SUBJECTIVE_INTERNAL_RESPONSE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-119',technicalName:'lifestyleNote',roles:'SUBJECTIVE_INTERNAL_RESPONSE;SOURCE_APPLICABILITY;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-120',technicalName:'reflectionKeyPoint',roles:'CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-121',technicalName:'nextCheckPoint',roles:'CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-122',technicalName:'consultationTarget',roles:'CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-123',technicalName:'consultationQuestion',roles:'CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-124',technicalName:'consultationDataSelection',roles:'CONSULTATION_PROMPT;EXPLANATION_TRACE',traceAction:'CURRENT_APP_CONTEXT_TRACE'},
  {inputId:'RL-IN-130',technicalName:'scheduledDate',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-131',technicalName:'planType',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-132',technicalName:'plannedDistanceStatus',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-133',technicalName:'plannedDistanceKm',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-134',technicalName:'plannedDurationStatus',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-135',technicalName:'plannedDurationMinutes',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-136',technicalName:'plannedCourseSnapshot',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-137',technicalName:'planNote',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-138',technicalName:'planOutcomeStatus',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-139',technicalName:'planChangeReason',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
  {inputId:'RL-IN-140',technicalName:'actualSessionId',roles:'PLANNING_SUPPORT;HISTORY_FILTER_REFERENCE_BUILDING;EXPLANATION_TRACE',traceAction:'CURRENT_BASE_TRACE'},
])

function buildRetainedInputTrace(record={}){
  const entries=RETAINED_INPUTS.map(d=>({ ...d, present:Object.prototype.hasOwnProperty.call(record,d.technicalName), value:Object.prototype.hasOwnProperty.call(record,d.technicalName)?record[d.technicalName]:null }));
  const runSettingProvenance=record.runSettingProvenance||'SURFACE_DERIVED';
  return {count:entries.length,entries,runSettingProvenance,traceVersion:'primary-regional-v2-input-trace-v1'};
}
function currentAppContextTraceNames(){return RETAINED_INPUTS.filter(x=>x.traceAction==='CURRENT_APP_CONTEXT_TRACE').map(x=>x.technicalName)}

function assertDaySemantics(record={}){
  const x=record.dayStatus;
  return {unrecordedIsRest:false,dayStatus:x,validDistinctState:x!=='UNRECORDED_AS_REST'};
}
__exp["RETAINED_INPUTS"] = RETAINED_INPUTS;
__exp["buildRetainedInputTrace"] = buildRetainedInputTrace;
__exp["currentAppContextTraceNames"] = currentAppContextTraceNames;
__exp["assertDaySemantics"] = assertDaySemantics;
__mods[15] = __exp;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2InputAdapter.js =====
{
const __exp = Object.create(null);
const { SURFACE_FIELDS } = __mods[3];
const { reportedRpeValue } = __mods[8];

const SURFACE_KEY_BY_RECORD_KEY = Object.freeze(Object.fromEntries(
  SURFACE_FIELDS.map(({ recordKey, modelKey }) => [recordKey, modelKey]),
));

const SHOE_TYPE = Object.freeze({
  usual_training: "TRAINING", soft: "TRAINING_SOFT", light: "LIGHTWEIGHT",
  race: "RACING", trail: "TRAIL", other: "OTHER",
});
const SHOE_SOFTNESS = Object.freeze({ soft: "SOFT", normal: "NORMAL", firm: "FIRM", unknown: "UNKNOWN" });
const FOOT_PLACEMENT = Object.freeze({ heel: "RFS", full_sole: "MFS", forefoot: "FFS", varies: "VARIABLE", unknown: "UNKNOWN" });
const RHYTHM_STRIDE = Object.freeze({ usual: "USUAL", small_step: "SMALLER_STRIDE_SELF_REPORT", rhythm_focus: "CADENCE_FOCUS_SELF_REPORT", long_step: "LARGER_STRIDE_SELF_REPORT", unknown: "UNKNOWN" });

const BODY_AREA_TO_PRIMARY_REGIONAL_V2 = Object.freeze({
  "BFR-200-ING": "BA-DISP-014", "BFR-200-COX": "BA-DISP-014",
  "BFR-210-GLU": "BA-DISP-015", "BFR-220-ANT": "BA-DISP-016",
  "BFR-220-POST": "BA-DISP-018", "BFR-230-ANT": "BA-DISP-019",
  "BFR-240-ANT": "BA-DISP-021", "BFR-240-POST": "BA-DISP-023",
  "BFR-250-ANT": "BA-DISP-024", "BFR-260-DOR": "BA-DISP-024",
  "BFR-250-POST": "BA-DISP-025", "BFR-260-REAR": "BA-DISP-027",
  "BFR-260-MID": "BA-DISP-028", "BFR-260-FORE": "BA-DISP-029",
  "BFR-260-TOE": "BA-DISP-029",
});

function surfaceSelections(course = {}) {
  return SURFACE_FIELDS.flatMap(({ recordKey }) => {
    const sharePercent = Number(course?.[recordKey] || 0);
    if (!(sharePercent > 0)) return [];
    const wetSlipState = ["DRY", "DAMP", "WET", "SLIPPERY_REPORTED", "UNKNOWN"].includes(String(course?.surfaceWetSlipState || "UNKNOWN").toUpperCase())
      ? String(course.surfaceWetSlipState || "UNKNOWN").toUpperCase()
      : "UNKNOWN";
    return [{ presetKey: SURFACE_KEY_BY_RECORD_KEY[recordKey], sharePercent, wetSlipState }];
  });
}

function gradeKnowledge(value = "UNKNOWN") {
  if (value === "KNOWN_PROFILE") return "KNOWN_SUMMARY";
  if (value === "KNOWN_FLAT") return "KNOWN_FLAT";
  return "UNKNOWN";
}


function regionalSections(course = {}) {
  if (!Array.isArray(course?.sections) || !course.sections.length) return [];
  return course.sections.flatMap((section = {}, index) => {
    const distanceKm = Number(section.distanceKm);
    const sharePercent = Number(section.sharePercent);
    const grade = section.gradePercent == null ? null : Number(section.gradePercent);
    if (!(distanceKm > 0) && !(sharePercent > 0)) return [];
    const gradeDirection = section.gradeDirection
      || (grade > 0 ? "UPHILL" : grade < 0 ? "DOWNHILL" : grade === 0 ? "FLAT" : "UNKNOWN");
    return [{
      sectionId: section.sectionId || `section-${index + 1}`,
      shareBasis: "DISTANCE",
      shareValue: distanceKm > 0 ? distanceKm : sharePercent,
      distanceKm: distanceKm > 0 ? distanceKm : null,
      durationMinutes: Number(section.durationMinutes) > 0 ? Number(section.durationMinutes) : null,
      steps: section.steps != null && Number.isInteger(Number(section.steps)) && Number(section.steps) >= 0 ? Number(section.steps) : null,
      speedMps: Number(section.speedMps) > 0 ? Number(section.speedMps) : null,
      cadenceSpm: Number(section.cadenceSpm) > 0 ? Number(section.cadenceSpm) : null,
      sharePercent: sharePercent > 0 ? sharePercent : null,
      gradeDirection,
      gradePercent: grade == null || !Number.isFinite(grade) ? null : Math.abs(grade),
    }];
  });
}

function reviewStatus(feedback = {}, observations = []) {
  if (["not_asked", "deferred"].includes(String(feedback?.checkStatus || ""))) return "NOT_REVIEWED";
  return observations.length ? "AREA_RECORDED" : "REVIEWED_NO_AREA";
}

function mappedObservations(feedback = {}) {
  return (Array.isArray(feedback?.bodyAreaObservations) ? feedback.bodyAreaObservations : []).flatMap((item) => {
    const bodyAreaId = BODY_AREA_TO_PRIMARY_REGIONAL_V2[String(item?.areaId || "")];
    if (!bodyAreaId) return [];
    return [{
      bodyAreaId,
      laterality: String(item?.laterality || "UNKNOWN"),
      noticedIntensity: Number(item?.intensity || 0),
      sensationType: String(item?.sensationType || "NOT_SELECTED"),
      noticedTiming: String(item?.noticedTiming || "UNKNOWN"),
      note: String(item?.note || ""),
      sourceBodyAreaId: String(item?.areaId || ""),
    }];
  });
}

const PLAN_CHANGE_REASON = Object.freeze({
  physical_condition: "PHYSICAL_CONDITION",
  time: "TIME",
  weather: "WEATHER",
  course: "COURSE",
  other: "OTHER",
  prefer_not_to_answer: "PREFER_NOT_TO_ANSWER",
});
function planSnapshot(record = {}) {
  const outcome = record?.planOutcome || {};
  const hasPlan = Boolean(outcome.status || outcome.plannedDistanceKm || outcome.plannedDurationMinutes);
  if (!hasPlan) return {};
  const rawReason = String(outcome.reason || "").trim();
  const changeReason = PLAN_CHANGE_REASON[rawReason.toLowerCase()]
    || (Object.values(PLAN_CHANGE_REASON).includes(rawReason.toUpperCase()) ? rawReason.toUpperCase() : null);
  return {
    scheduledDate: record.date,
    planType: record.activityType === "rest" ? "REST" : "RUN",
    distanceKm: Number(outcome.plannedDistanceKm || 0) || null,
    durationMinutes: Number(outcome.plannedDurationMinutes || 0) || null,
    outcomeStatus: String(outcome.status || "COMPLETED").toUpperCase(),
    changeReason,
    course: outcome.plannedCourseSnapshot || null,
    note: outcome.planNote || null,
    changeReasonNote: outcome.reasonNote || null,
    actualSessionId: record.id,
  };
}

function adaptStoredRecordToPrimaryRegionalV2Input(record = {}, feedback = {}) {
  const observations = mappedObservations(feedback);
  const personal = record.personalContext || {};
  return {
    sessionId: record.id,
    date: record.date,
    activityType: record.activityType,
    distanceKm: record.activityType === "run" ? Number(record.distanceKm) : null,
    durationMinutes: record.activityType === "run" ? Number(record.durationMinutes) : null,
    steps: record.activityType === "run" && Number(record.steps) > 0 ? Number(record.steps) : null,
    stepsProvenance: record.stepsProvenance === "ESTIMATED" ? "ESTIMATED" : (record.stepsProvenance || "UNKNOWN"),
    runningFormat: record.activityType === "run" ? (record.runningFormat || "UNKNOWN") : null,
    rpe: reportedRpeValue(record),
    memo: record.memo || "",
    course: {
      courseId: record.course?.id || null,
      courseName: record.course?.name || "",
      gradeKnowledge: gradeKnowledge(record.course?.gradeKnowledge),
      uphillSharePercent: Number(record.course?.upPercent || 0),
      downhillSharePercent: Number(record.course?.downPercent || 0),
      uphillGradePercent: Number(record.course?.upGradePercent || 0) || null,
      downhillGradePercent: Number(record.course?.downGradePercent || 0) || null,
      surfaceSelections: surfaceSelections(record.course),
      sections: regionalSections(record.course),
    },
    shoeAndStyle: {
      shoeId: personal.shoeId || null,
      shoeLabel: personal.shoeLabel || null,
      shoeType: SHOE_TYPE[personal.shoeType] || "UNKNOWN",
      shoeSoftness: SHOE_SOFTNESS[personal.shoeSoftness] || "UNKNOWN",
      footPlacement: FOOT_PLACEMENT[personal.footPlacement] || "UNKNOWN",
      rhythmStride: RHYTHM_STRIDE[personal.rhythmStride] || "UNKNOWN",
      focusTags: personal.focusTags || [],
      note: personal.freeNote || "",
    },
    bodyReview: {
      status: reviewStatus(feedback, observations),
      observations,
    },
    plan: planSnapshot(record),
  };
}

function primaryRegionalV2ProfileContext(record = {}) {
  const profile = record.bodyProfileSnapshot || {};
  return {
    heightCm: profile.heightCm || null,
    weightKg: profile.weightKg || null,
    ageBand: profile.ageBand || null,
    sexOrReferenceCategory: profile.sex || null,
  };
}
__exp["BODY_AREA_TO_PRIMARY_REGIONAL_V2"] = BODY_AREA_TO_PRIMARY_REGIONAL_V2;
__exp["adaptStoredRecordToPrimaryRegionalV2Input"] = adaptStoredRecordToPrimaryRegionalV2Input;
__exp["primaryRegionalV2ProfileContext"] = primaryRegionalV2ProfileContext;
__mods[16] = __exp;
}

// ===== core/model/currentPrimaryInput/formalInputCatalog.js =====
{
const __exp = Object.create(null);
// Generated from locked Authority artifacts. Do not edit by hand.
const AUTHORITY_VERSION = "RunLoad Primary Regional V2 Current Authority 2026-09-15";
const PARAMETER_SET_VERSION = "RUNLOAD-PRIMARY-REGIONAL-V2-CURRENT";
const ADAPTER_VERSION = "RunLoad Input Preset Mapping V1.0";
const REGIONS = Object.freeze([
  {
    "id": "BA-DISP-014",
    "name": "股関節まわり",
    "constructId": "HIP_JOINT_MECHANICAL_DEMAND_TENDENCY",
    "formulaClass": "CONDITION_ROUTED_WORK",
    "referenceDefinitionId": "RCM-RDEF-014"
  },
  {
    "id": "BA-DISP-015",
    "name": "お尻",
    "constructId": "GLUTEAL_FUNCTIONAL_DEMAND_TENDENCY",
    "formulaClass": "PRIMARY_DOMINANT_COMPOSITE",
    "referenceDefinitionId": "RCM-RDEF-015"
  },
  {
    "id": "BA-DISP-016",
    "name": "太ももの前",
    "constructId": "ANTERIOR_THIGH_MUSCLE_DEMAND_TENDENCY",
    "formulaClass": "ROUTE_SELECTED_PROXY",
    "referenceDefinitionId": "RCM-RDEF-016"
  },
  {
    "id": "BA-DISP-018",
    "name": "太ももの後ろ",
    "constructId": "POSTERIOR_THIGH_MUSCLE_DEMAND_TENDENCY",
    "formulaClass": "ROUTE_SELECTED_PROXY",
    "referenceDefinitionId": "RCM-RDEF-018"
  },
  {
    "id": "BA-DISP-019",
    "name": "膝の前",
    "constructId": "PATELLOFEMORAL_CUMULATIVE_STRESS_IMPULSE_TENDENCY",
    "formulaClass": "DIRECT_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-019"
  },
  {
    "id": "BA-DISP-021",
    "name": "すね",
    "constructId": "TIBIAL_CUMULATIVE_TOTAL_STRESS_IMPULSE_TENDENCY",
    "formulaClass": "DIRECT_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-021"
  },
  {
    "id": "BA-DISP-023",
    "name": "ふくらはぎ",
    "constructId": "POSTERIOR_LOWER_LEG_MUSCLE_DEMAND_TENDENCY",
    "formulaClass": "PRIMARY_DOMINANT_COMPOSITE",
    "referenceDefinitionId": "RCM-RDEF-023"
  },
  {
    "id": "BA-DISP-024",
    "name": "足首まわり",
    "constructId": "ANKLE_TOTAL_MECHANICAL_WORK_TENDENCY",
    "formulaClass": "CONDITION_ROUTED_WORK",
    "referenceDefinitionId": "RCM-RDEF-024"
  },
  {
    "id": "BA-DISP-025",
    "name": "足首の後ろ・アキレス腱周辺",
    "constructId": "ACHILLES_CUMULATIVE_STRAIN_IMPULSE_TENDENCY",
    "formulaClass": "DIRECT_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-025"
  },
  {
    "id": "BA-DISP-027",
    "name": "かかと・足裏の後ろ",
    "constructId": "REARFOOT_CUMULATIVE_PRESSURE_TIME_EXPOSURE_TENDENCY",
    "formulaClass": "MASK_WEIGHTED_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-027"
  },
  {
    "id": "BA-DISP-028",
    "name": "土踏まず・足裏の中央",
    "constructId": "MEDIAL_LONGITUDINAL_ARCH_MECHANICAL_CONTROL_TENDENCY",
    "formulaClass": "PRIMARY_DOMINANT_COMPOSITE",
    "referenceDefinitionId": "RCM-RDEF-028"
  },
  {
    "id": "BA-DISP-029",
    "name": "足裏の前・母趾球周辺",
    "constructId": "FOREFOOT_CUMULATIVE_PRESSURE_TIME_EXPOSURE_TENDENCY",
    "formulaClass": "MASK_WEIGHTED_SOURCE_CURVE",
    "referenceDefinitionId": "RCM-RDEF-029"
  }
]);
const FORMAL_INPUT_CATALOG = Object.freeze([
  {
    "id": "RL-IN-001",
    "technicalName": "dayStatus",
    "label": "日状態",
    "groupId": "G01",
    "disposition": "ROUTING_APPLICABILITY",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "UNKNOWN/invalid route => PARTIAL or UNAVAILABLE according to dependent route; never assume reference silently.",
    "doubleCountingGuard": "Routing value is not added to index."
  },
  {
    "id": "RL-IN-002",
    "technicalName": "sessionDate",
    "label": "実施日",
    "groupId": "G01",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-003",
    "technicalName": "activityType",
    "label": "記録種別",
    "groupId": "G01",
    "disposition": "ROUTING_APPLICABILITY",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "UNKNOWN/invalid route => PARTIAL or UNAVAILABLE according to dependent route; never assume reference silently.",
    "doubleCountingGuard": "Routing value is not added to index."
  },
  {
    "id": "RL-IN-004",
    "technicalName": "sessionId",
    "label": "走行記録ID",
    "groupId": "G01",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-005",
    "technicalName": "sessionSequence",
    "label": "同日内順序",
    "groupId": "G01",
    "disposition": "ROUTING_APPLICABILITY",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "UNKNOWN/invalid route => PARTIAL or UNAVAILABLE according to dependent route; never assume reference silently.",
    "doubleCountingGuard": "Routing value is not added to index."
  },
  {
    "id": "RL-IN-006",
    "technicalName": "recordNote",
    "label": "記録メモ",
    "groupId": "G01",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-007",
    "technicalName": "recordRevision",
    "label": "記録改訂番号",
    "groupId": "G01",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-010",
    "technicalName": "distanceStatus",
    "label": "距離の入力状態",
    "groupId": "G02",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-011",
    "technicalName": "distanceKm",
    "label": "距離",
    "groupId": "G02",
    "disposition": "CUMULATIVE_EXPOSURE",
    "numericPermission": "EXPOSURE_ONLY",
    "missingnessBehavior": "Use only an approved fallback hierarchy; if no compatible exposure can be derived, region is UNAVAILABLE.",
    "doubleCountingGuard": "Select exactly one compatible exposure basis per region/section; distance, duration and steps cannot all contribute independently."
  },
  {
    "id": "RL-IN-012",
    "technicalName": "durationStatus",
    "label": "実走時間の入力状態",
    "groupId": "G02",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-013",
    "technicalName": "durationMinutes",
    "label": "実走時間",
    "groupId": "G02",
    "disposition": "CUMULATIVE_EXPOSURE",
    "numericPermission": "EXPOSURE_ONLY",
    "missingnessBehavior": "Use only an approved fallback hierarchy; if no compatible exposure can be derived, region is UNAVAILABLE.",
    "doubleCountingGuard": "Select exactly one compatible exposure basis per region/section; distance, duration and steps cannot all contribute independently."
  },
  {
    "id": "RL-IN-014",
    "technicalName": "stepsStatus",
    "label": "歩数の入力状態",
    "groupId": "G02",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-015",
    "technicalName": "steps",
    "label": "歩数",
    "groupId": "G02",
    "disposition": "CUMULATIVE_EXPOSURE",
    "numericPermission": "EXPOSURE_ONLY",
    "missingnessBehavior": "Use only an approved fallback hierarchy; if no compatible exposure can be derived, region is UNAVAILABLE.",
    "doubleCountingGuard": "Select exactly one compatible exposure basis per region/section; distance, duration and steps cannot all contribute independently."
  },
  {
    "id": "RL-IN-016",
    "technicalName": "stepsProvenance",
    "label": "歩数の出所",
    "groupId": "G02",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-017",
    "technicalName": "runningFormat",
    "label": "走行形式",
    "groupId": "G02",
    "disposition": "INTERACTION_ONLY",
    "numericPermission": "INTERACTION_ONLY",
    "missingnessBehavior": "If any required factor is missing, interaction is inactive and coverage records the missing prerequisite.",
    "doubleCountingGuard": "No main effect; interaction ID must be unique and stacking register must prove non-overlap."
  },
  {
    "id": "RL-IN-018",
    "technicalName": "runSetting",
    "label": "走行環境",
    "groupId": "G02",
    "disposition": "ROUTING_APPLICABILITY",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing or mixed setting disables environment-specific source protocols; no treadmill or track condition is inferred.",
    "doubleCountingGuard": "The setting selects source eligibility only and is never added as an independent numeric effect."
  },
  {
    "id": "RL-DV-019",
    "technicalName": "averageSpeedMps",
    "label": "平均速度",
    "groupId": "G02",
    "disposition": "CONDITIONAL_NUMERIC_EFFECT",
    "numericPermission": "DIRECT_OR_CONDITIONAL",
    "missingnessBehavior": "Missing => omit only that evidence-gated effect and mark PARTIAL when material; never impute reference without disclosure.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-DV-020",
    "technicalName": "averagePaceMinPerKm",
    "label": "平均ペース",
    "groupId": "G02",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-DV-021",
    "technicalName": "averageCadenceSpm",
    "label": "平均ケイデンス",
    "groupId": "G02",
    "disposition": "CONDITIONAL_NUMERIC_EFFECT",
    "numericPermission": "DIRECT_OR_CONDITIONAL",
    "missingnessBehavior": "Missing => omit only that evidence-gated effect and mark PARTIAL when material; never impute reference without disclosure.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-030",
    "technicalName": "courseId",
    "label": "保存コースID",
    "groupId": "G03",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-031",
    "technicalName": "courseName",
    "label": "コース名",
    "groupId": "G03",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-032",
    "technicalName": "gradeKnowledge",
    "label": "勾配情報の把握状態",
    "groupId": "G03",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-033",
    "technicalName": "uphillSharePercent",
    "label": "上り区間割合",
    "groupId": "G03",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-IN-034",
    "technicalName": "downhillSharePercent",
    "label": "下り区間割合",
    "groupId": "G03",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-DV-035",
    "technicalName": "flatSharePercent",
    "label": "平坦区間割合",
    "groupId": "G03",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-IN-036",
    "technicalName": "uphillGradePercent",
    "label": "代表上り勾配",
    "groupId": "G03",
    "disposition": "CONDITIONAL_NUMERIC_EFFECT",
    "numericPermission": "DIRECT_OR_CONDITIONAL",
    "missingnessBehavior": "Missing => omit only that evidence-gated effect and mark PARTIAL when material; never impute reference without disclosure.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-037",
    "technicalName": "downhillGradePercent",
    "label": "代表下り勾配の大きさ",
    "groupId": "G03",
    "disposition": "CONDITIONAL_NUMERIC_EFFECT",
    "numericPermission": "DIRECT_OR_CONDITIONAL",
    "missingnessBehavior": "Missing => omit only that evidence-gated effect and mark PARTIAL when material; never impute reference without disclosure.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-038",
    "technicalName": "routePattern",
    "label": "コース形式",
    "groupId": "G03",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; it remains available for course-history explanation and comparison.",
    "doubleCountingGuard": "No coefficient or route selection in Regional A4."
  },
  {
    "id": "RL-IN-039",
    "technicalName": "courseSections[]",
    "label": "区間情報",
    "groupId": "G03",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-IN-040",
    "technicalName": "surfaceKnowledge",
    "label": "路面把握状態",
    "groupId": "G04",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-041",
    "technicalName": "surfaceComponents[]",
    "label": "路面構成",
    "groupId": "G04",
    "disposition": "SECTION_ROUTING_AND_AGGREGATION",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Use highest available granularity; unknown shares/sections trigger fallback or PARTIAL, not zero-length assumptions.",
    "doubleCountingGuard": "Detailed sections override summary shares; section weights must sum to one within the represented course portion."
  },
  {
    "id": "RL-IN-042",
    "technicalName": "surfaceMaterialLabel",
    "label": "路面の見た目・材質ラベル",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-043",
    "technicalName": "surfaceSharePercent",
    "label": "路面割合",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-044",
    "technicalName": "surfaceHardnessLevel",
    "label": "硬さ",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-045",
    "technicalName": "surfaceUnevennessLevel",
    "label": "凹凸・不整地性",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-046",
    "technicalName": "surfaceGripLevel",
    "label": "グリップ・滑りにくさ",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-047",
    "technicalName": "surfaceSinkLevel",
    "label": "沈み込み・柔らかさ",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-048",
    "technicalName": "surfaceReboundLevel",
    "label": "反発性",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-049",
    "technicalName": "surfaceStabilityLevel",
    "label": "安定性",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing follows the canonical RL-IN-041 surface component record.",
    "doubleCountingGuard": "Canonical numeric/routing data are carried only inside RL-IN-041 surfaceComponents; this field is a preset-derived audit alias and cannot add a second effect."
  },
  {
    "id": "RL-IN-050",
    "technicalName": "surfaceWetSlipState",
    "label": "濡れ・滑り状態",
    "groupId": "G04",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; known wet/slip context remains available for safety-oriented explanation and comparison.",
    "doubleCountingGuard": "No coefficient or interaction is applied in Regional A4."
  },
  {
    "id": "RL-IN-060",
    "technicalName": "weatherState",
    "label": "天候",
    "groupId": "G05",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-061",
    "technicalName": "temperatureC",
    "label": "気温",
    "groupId": "G05",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-062",
    "technicalName": "windLevel",
    "label": "風の感じ",
    "groupId": "G05",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-063",
    "technicalName": "environmentNote",
    "label": "環境メモ",
    "groupId": "G05",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-070",
    "technicalName": "shoeId",
    "label": "保存シューズID",
    "groupId": "G06",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-071",
    "technicalName": "shoeLabel",
    "label": "シューズ名",
    "groupId": "G06",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-072",
    "technicalName": "shoeType",
    "label": "シューズ種類",
    "groupId": "G06",
    "disposition": "PROTOCOL_CONTEXT_NO_NUMERIC_EFFECT",
    "numericPermission": "CONTEXT_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; when present the value is retained as explicit context/protocol provenance and is not assigned an isolated numeric coefficient.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-073",
    "technicalName": "shoeSoftness",
    "label": "やわらかさの自己認識",
    "groupId": "G06",
    "disposition": "PROTOCOL_CONTEXT_NO_NUMERIC_EFFECT",
    "numericPermission": "CONTEXT_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; when present the value is retained as explicit context/protocol provenance and is not assigned an isolated numeric coefficient.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-074",
    "technicalName": "equipmentTags[]",
    "label": "装備・携行品",
    "groupId": "G06",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-075",
    "technicalName": "equipmentNote",
    "label": "シューズ・装備メモ",
    "groupId": "G06",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-080",
    "technicalName": "footPlacementSelfReport",
    "label": "足のつき方の自己認識",
    "groupId": "G07",
    "disposition": "CONDITIONAL_PLANTAR_CONTEXT_NO_ISOLATED_NUMERIC_EFFECT",
    "numericPermission": "CONTEXT_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; when present the value is retained as explicit context/protocol provenance and is not assigned an isolated numeric coefficient.",
    "doubleCountingGuard": "Derived aliases and source-correlated factors require a declared canonical factor; no duplicate main effect and interaction use without decomposition."
  },
  {
    "id": "RL-IN-081",
    "technicalName": "rhythmStrideSelfReport",
    "label": "歩幅・テンポの自己認識",
    "groupId": "G07",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation; the self-report remains available for reflection and comparison.",
    "doubleCountingGuard": "Self-reported rhythm/stride does not substitute for measured or derived cadence and has no canonical numeric effect."
  },
  {
    "id": "RL-IN-082",
    "technicalName": "runningFocusTags[]",
    "label": "実施時に意識したこと",
    "groupId": "G07",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-083",
    "technicalName": "runningStyleNote",
    "label": "走り方メモ",
    "groupId": "G07",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-090",
    "technicalName": "rpeStatus",
    "label": "RPE入力状態",
    "groupId": "G08",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-091",
    "technicalName": "rpeValue",
    "label": "RPE",
    "groupId": "G08",
    "disposition": "SESSION_SUBJECTIVE_PARALLEL_COMPONENT",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing affects parallel context only, not mechanical index availability.",
    "doubleCountingGuard": "Not summed into mechanical C/E/I/P components."
  },
  {
    "id": "RL-IN-092",
    "technicalName": "rpeProvenance",
    "label": "RPEの出所",
    "groupId": "G08",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-093",
    "technicalName": "postRunReflection",
    "label": "今回の感想",
    "groupId": "G08",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-094",
    "technicalName": "perceivedDifference",
    "label": "普段との違い",
    "groupId": "G08",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-100",
    "technicalName": "bodyReviewStatus",
    "label": "身体確認状態",
    "groupId": "G09",
    "disposition": "MISSINGNESS_PROVENANCE_CONFIDENCE",
    "numericPermission": "NON_NUMERIC_GATE",
    "missingnessBehavior": "Apply declared gate; UNKNOWN is not 0 and may downgrade CALCULATED to PARTIAL/UNAVAILABLE.",
    "doubleCountingGuard": "Metadata never contributes numerically."
  },
  {
    "id": "RL-IN-101",
    "technicalName": "bodyAreaObservations[]",
    "label": "部位観察",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "Observation container and fields form one matched-region record; no observation field may enter the canonical numeric index."
  },
  {
    "id": "RL-IN-102",
    "technicalName": "bodyAreaId",
    "label": "部位ID",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation convenience field never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-103",
    "technicalName": "laterality",
    "label": "左右",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation convenience field never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-104",
    "technicalName": "noticedIntensity",
    "label": "気になる程度",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation convenience field never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-105",
    "technicalName": "sensationType",
    "label": "感覚の種類",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation convenience field never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-106",
    "technicalName": "noticedTiming",
    "label": "気づいた時点",
    "groupId": "G09",
    "disposition": "SELF_REPORTED_REGION_STATE_COMPONENT",
    "numericPermission": "SELF_REPORTED_SEPARATE",
    "missingnessBehavior": "NOT_REVIEWED differs from REVIEWED_NO_AREA; absent report is not intensity 0 unless explicitly reviewed with no area.",
    "doubleCountingGuard": "RL-IN-101 observation array is canonical; this single-observation convenience field never creates an independent numeric or overlay contribution."
  },
  {
    "id": "RL-IN-107",
    "technicalName": "bodyAreaNote",
    "label": "部位メモ",
    "groupId": "G09",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-110",
    "technicalName": "runningStartDateOrBand",
    "label": "ランニング開始時期",
    "groupId": "G10",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-111",
    "technicalName": "experienceSelfAssessment",
    "label": "本人の経験認識",
    "groupId": "G10",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-112",
    "technicalName": "runningGoalTags[]",
    "label": "主な目的",
    "groupId": "G10",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-113",
    "technicalName": "heightCm",
    "label": "身長",
    "groupId": "G10",
    "disposition": "PERSONAL_REFERENCE_OR_MODIFIER",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing => canonical app reference with disclosure only where permitted; otherwise applicability gate.",
    "doubleCountingGuard": "Normalization already embedded in source endpoint cannot be applied again."
  },
  {
    "id": "RL-IN-114",
    "technicalName": "weightKg",
    "label": "体重",
    "groupId": "G10",
    "disposition": "PERSONAL_REFERENCE_OR_MODIFIER",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing => canonical app reference with disclosure only where permitted; otherwise applicability gate.",
    "doubleCountingGuard": "Normalization already embedded in source endpoint cannot be applied again."
  },
  {
    "id": "RL-IN-115",
    "technicalName": "ageBand",
    "label": "年齢帯",
    "groupId": "G10",
    "disposition": "PERSONAL_REFERENCE_OR_MODIFIER",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing => canonical app reference with disclosure only where permitted; otherwise applicability gate.",
    "doubleCountingGuard": "Normalization already embedded in source endpoint cannot be applied again."
  },
  {
    "id": "RL-IN-116",
    "technicalName": "sexOrReferenceCategory",
    "label": "性別関連入力",
    "groupId": "G10",
    "disposition": "PERSONAL_REFERENCE_OR_MODIFIER",
    "numericPermission": "ROUTING_ONLY",
    "missingnessBehavior": "Missing => canonical app reference with disclosure only where permitted; otherwise applicability gate.",
    "doubleCountingGuard": "Normalization already embedded in source endpoint cannot be applied again."
  },
  {
    "id": "RL-IN-117",
    "technicalName": "sleepSummary",
    "label": "睡眠の自己記録",
    "groupId": "G10",
    "disposition": "SESSION_SUBJECTIVE_PARALLEL_COMPONENT",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing affects parallel context only, not mechanical index availability.",
    "doubleCountingGuard": "Not summed into mechanical C/E/I/P components."
  },
  {
    "id": "RL-IN-118",
    "technicalName": "nutritionHydrationSummary",
    "label": "食事・水分の自己記録",
    "groupId": "G10",
    "disposition": "SESSION_SUBJECTIVE_PARALLEL_COMPONENT",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing affects parallel context only, not mechanical index availability.",
    "doubleCountingGuard": "Not summed into mechanical C/E/I/P components."
  },
  {
    "id": "RL-IN-119",
    "technicalName": "lifestyleNote",
    "label": "生活背景メモ",
    "groupId": "G10",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-120",
    "technicalName": "reflectionKeyPoint",
    "label": "今回の主な気づき",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-121",
    "technicalName": "nextCheckPoint",
    "label": "次回確認したいこと",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-122",
    "technicalName": "consultationTarget",
    "label": "相談したい相手",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-123",
    "technicalName": "consultationQuestion",
    "label": "相談したい内容",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-124",
    "technicalName": "consultationDataSelection",
    "label": "共有する記録範囲",
    "groupId": "G11",
    "disposition": "TRACE_EXPLANATION_COMPARISON_ONLY",
    "numericPermission": "TRACE_ONLY",
    "missingnessBehavior": "Missing does not block numeric calculation unless separately required for record identity.",
    "doubleCountingGuard": "No coefficient, therefore no contribution stacking."
  },
  {
    "id": "RL-IN-130",
    "technicalName": "scheduledDate",
    "label": "予定日",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-131",
    "technicalName": "planType",
    "label": "予定種別",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-132",
    "technicalName": "plannedDistanceStatus",
    "label": "予定距離の状態",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-133",
    "technicalName": "plannedDistanceKm",
    "label": "予定距離",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-134",
    "technicalName": "plannedDurationStatus",
    "label": "予定時間の状態",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-135",
    "technicalName": "plannedDurationMinutes",
    "label": "予定時間",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-136",
    "technicalName": "plannedCourseSnapshot",
    "label": "予定コーススナップショット",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-137",
    "technicalName": "planNote",
    "label": "予定メモ",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-138",
    "technicalName": "planOutcomeStatus",
    "label": "実施状況",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-139",
    "technicalName": "planChangeReason",
    "label": "変更・未実施理由",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  },
  {
    "id": "RL-IN-140",
    "technicalName": "actualSessionId",
    "label": "実績記録参照",
    "groupId": "G12",
    "disposition": "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT",
    "numericPermission": "PROHIBITED_FOR_COMPLETED_SESSION",
    "missingnessBehavior": "Missing has no effect on completed-session calculation.",
    "doubleCountingGuard": "Separate planned scenario namespace from actual session namespace."
  }
]);
const PARAMETERS = Object.freeze({
  "RCM-P-GLOBAL-QREF": 5.0,
  "RCM-P-GLOBAL-QREF-TIME": 30.0,
  "RCM-P-GLOBAL-QREF-STEPS": 5100.0,
  "RCM-P-GLOBAL-QREF-GAIT-CYCLES": 2550.0,
  "RCM-P-GLOBAL-ALPHAE": 1.0,
  "RCM-P-GLOBAL-VREF": 2.78,
  "RCM-P-GLOBAL-CADREF": 170.0,
  "RCM-P-GLOBAL-BETASTATE": 0.0,
  "RCM-P-GLOBAL-BPROJECT": 0.25,
  "RCM-P-GLOBAL-BINTER": 0.15,
  "RCM-P-015-WGMAX": 0.8,
  "RCM-P-015-WGMED": 0.2,
  "RCM-P-023-WSOL": 0.75,
  "RCM-P-023-WGAS": 0.25,
  "RCM-P-028-WARCH": 0.65,
  "RCM-P-028-WINTR": 0.2,
  "RCM-P-028-WPFA": 0.15,
  "RCM-P-024-WPOS": 0.5,
  "RCM-P-024-WNEG": 0.5,
  "RCM-P-014-KSPEED": 0.04,
  "RCM-P-014-KUP": 0.02,
  "RCM-P-014-KDOWN": 0.015,
  "RCM-P-015-KSPEED": 0.06,
  "RCM-P-016-KUP": 0.01,
  "RCM-P-018-KGRADE": 0.005,
  "RCM-P-023-KSOLSPD": 0.1,
  "RCM-P-023-KGASSPD": 0.06,
  "RCM-P-028-KSPEED": 0.08,
  "RCM-P-015-KGRADEMAIN": 0.0,
  "RCM-P-024-KGRADE": 0.0,
  "RCM-P-SURFACE-ORDINAL": 0.0,
  "RCM-P-BODYMASS-UNIVERSAL": 0.0,
  "RCM-P-PLAN-ACTUAL": 0.0,
  "RCM-P-028-KGAIT": 0.08
});
const PARAMETER_BOUNDS = Object.freeze({
  "RCM-P-GLOBAL-QREF": {
    "lower": 5.0,
    "initial": 5.0,
    "upper": 5.0,
    "role": "FIXED_REFERENCE_NOT_SENSITIVITY_PARAMETER"
  },
  "RCM-P-GLOBAL-QREF-TIME": {
    "lower": 30.0,
    "initial": 30.0,
    "upper": 30.0,
    "role": "FIXED_ENDPOINT_FAMILY_REFERENCE"
  },
  "RCM-P-GLOBAL-QREF-STEPS": {
    "lower": 5100.0,
    "initial": 5100.0,
    "upper": 5100.0,
    "role": "FIXED_ENDPOINT_FAMILY_REFERENCE"
  },
  "RCM-P-GLOBAL-QREF-GAIT-CYCLES": {
    "lower": 2550.0,
    "initial": 2550.0,
    "upper": 2550.0,
    "role": "FIXED_ENDPOINT_FAMILY_REFERENCE"
  },
  "RCM-P-GLOBAL-ALPHAE": {
    "lower": 1.0,
    "initial": 1.0,
    "upper": 1.0,
    "role": "FIXED_LINEAR_REFERENCE_RATIO"
  },
  "RCM-P-GLOBAL-VREF": {
    "lower": 2.78,
    "initial": 2.78,
    "upper": 2.78,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-GLOBAL-CADREF": {
    "lower": 170.0,
    "initial": 170.0,
    "upper": 170.0,
    "role": "FIXED_REFERENCE_NOT_SENSITIVITY_PARAMETER"
  },
  "RCM-P-GLOBAL-BETASTATE": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_SEPARATE_OBSERVATION_OVERLAY"
  },
  "RCM-P-GLOBAL-BPROJECT": {
    "lower": 0.2,
    "initial": 0.25,
    "upper": 0.35,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-GLOBAL-BINTER": {
    "lower": 0.1,
    "initial": 0.15,
    "upper": 0.2,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-015-WGMAX": {
    "lower": 0.7,
    "initial": 0.8,
    "upper": 0.9,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-015-WGMED": {
    "lower": 0.1,
    "initial": 0.2,
    "upper": 0.3,
    "role": "DEPENDENT_COMPLEMENT"
  },
  "RCM-P-023-WSOL": {
    "lower": 0.65,
    "initial": 0.75,
    "upper": 0.85,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-023-WGAS": {
    "lower": 0.15,
    "initial": 0.25,
    "upper": 0.35,
    "role": "DEPENDENT_COMPLEMENT"
  },
  "RCM-P-028-WARCH": {
    "lower": 0.55,
    "initial": 0.65,
    "upper": 0.75,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-028-WINTR": {
    "lower": 0.15,
    "initial": 0.2,
    "upper": 0.3,
    "role": "DEPENDENT_REMAINDER"
  },
  "RCM-P-028-WPFA": {
    "lower": 0.1,
    "initial": 0.15,
    "upper": 0.2,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-024-WPOS": {
    "lower": 0.4,
    "initial": 0.5,
    "upper": 0.6,
    "role": "INDEPENDENT_SIMPLEX_DRIVER"
  },
  "RCM-P-024-WNEG": {
    "lower": 0.4,
    "initial": 0.5,
    "upper": 0.6,
    "role": "DEPENDENT_COMPLEMENT"
  },
  "RCM-P-014-KSPEED": {
    "lower": 0.02,
    "initial": 0.04,
    "upper": 0.08,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-014-KUP": {
    "lower": 0.01,
    "initial": 0.02,
    "upper": 0.03,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-014-KDOWN": {
    "lower": 0.008,
    "initial": 0.015,
    "upper": 0.025,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-015-KSPEED": {
    "lower": 0.03,
    "initial": 0.06,
    "upper": 0.1,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-016-KUP": {
    "lower": 0.005,
    "initial": 0.01,
    "upper": 0.02,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-018-KGRADE": {
    "lower": 0.002,
    "initial": 0.005,
    "upper": 0.01,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-023-KSOLSPD": {
    "lower": 0.06,
    "initial": 0.1,
    "upper": 0.14,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-023-KGASSPD": {
    "lower": 0.03,
    "initial": 0.06,
    "upper": 0.1,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-028-KSPEED": {
    "lower": 0.04,
    "initial": 0.08,
    "upper": 0.12,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  },
  "RCM-P-015-KGRADEMAIN": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-024-KGRADE": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-SURFACE-ORDINAL": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-BODYMASS-UNIVERSAL": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-PLAN-ACTUAL": {
    "lower": 0.0,
    "initial": 0.0,
    "upper": 0.0,
    "role": "FIXED_OR_HARD_ZERO"
  },
  "RCM-P-028-KGAIT": {
    "lower": 0.03,
    "initial": 0.08,
    "upper": 0.12,
    "role": "INDEPENDENT_BOUNDED_PARAMETER"
  }
});
const SOURCE_CURVES = Object.freeze({
  "BA-DISP-019": {
    "speed": [
      [
        2.78,
        1.0
      ],
      [
        3.0,
        0.942821
      ],
      [
        3.33,
        0.885642
      ],
      [
        4.0,
        0.797967
      ],
      [
        5.0,
        0.701398
      ]
    ],
    "grade": [
      [
        -6.0,
        1.222363
      ],
      [
        -3.0,
        1.080051
      ],
      [
        0.0,
        1.0
      ],
      [
        3.0,
        0.931385
      ],
      [
        6.0,
        0.893266
      ]
    ],
    "cadence": [
      [
        -10.0,
        0.995696
      ],
      [
        0.0,
        1.0
      ],
      [
        10.0,
        0.974175
      ]
    ]
  },
  "BA-DISP-021": {
    "speed": [
      [
        2.78,
        1.0
      ],
      [
        3.0,
        0.935608
      ],
      [
        3.33,
        0.849243
      ],
      [
        4.0,
        0.753542
      ],
      [
        5.0,
        0.627978
      ]
    ],
    "grade": [
      [
        -6.0,
        1.068496
      ],
      [
        -3.0,
        0.998149
      ],
      [
        0.0,
        1.0
      ],
      [
        3.0,
        1.010383
      ],
      [
        6.0,
        1.060126
      ]
    ],
    "cadence": [
      [
        -10.0,
        1.003412
      ],
      [
        0.0,
        1.0
      ],
      [
        10.0,
        0.99166
      ]
    ]
  },
  "BA-DISP-025": {
    "speed": [
      [
        2.78,
        1.0
      ],
      [
        3.0,
        0.940774
      ],
      [
        3.33,
        0.851936
      ],
      [
        4.0,
        0.740319
      ],
      [
        5.0,
        0.605923
      ]
    ],
    "grade": [
      [
        -6.0,
        0.738041
      ],
      [
        -3.0,
        0.835991
      ],
      [
        0.0,
        1.0
      ],
      [
        3.0,
        1.175399
      ],
      [
        6.0,
        1.3918
      ]
    ],
    "cadence": [
      [
        -10.0,
        1.064171
      ],
      [
        0.0,
        1.0
      ],
      [
        10.0,
        0.989305
      ]
    ]
  }
});
const SURFACE_CURVES = Object.freeze({
  "BA-DISP-027": {
    "Asphalt": 1.0,
    "Concrete": 1.009648,
    "Grass": 0.950314,
    "Rubber": 0.990835
  },
  "BA-DISP-029": {
    "Asphalt": 1.0,
    "Concrete": 0.965302,
    "Grass": 0.942822,
    "Rubber": 0.963348
  }
});
// RCM-SRC-003 / Abdul Yamin et al. 2021, Table 3. Peak MLA angle under
// heeled-shoe conditions, normalized to Concrete. This is an exact categorical
// endpoint route, not a generic surface-hardness coefficient.
const ARCH_SURFACE_CURVES = Object.freeze({
  "Concrete": 1.0,
  "Rubber": 0.971639866599
});
const PFA_CURVE = Object.freeze({
  "RFS": 1.0,
  "MFS": 1.214516,
  "FFS": 1.445161
});
// BAT-SRC-009: GM is gastrocnemius medialis; MG is gluteus major.
// These exact protocol curves must not be generalized beyond 4.17 m/s and 0/2/7% treadmill grades.
const GASTRO_GRADE_CURVE = Object.freeze([[0, 1.0], [2, 1.0009], [7, 0.9584]]);
const GLUTE_GRADE_CURVE = Object.freeze([[0, 1.0], [2, 1.4142], [7, 1.8327]]);

// BAT-SRC-019 descriptive group-mean grade×speed data. Ratios are normalized
// to the source level condition and are retained for provenance/reproduction
// for source reproduction only. The published speeds are group means from participant-specific
// speed prescriptions, not common protocol targets or individual eligibility
// tolerances. The app cannot reconstruct the source participant-specific 10-km
// performance prescription, so this profile is not numeric-runtime eligible.
const GRADE_SPEED_PROFILE = Object.freeze({
  gradePercent: [-15, -10, -5, 0, 5, 10, 15],
  speedMps: [3.75, 3.583333333333, 3.416666666667, 3.055555555556, 2.277777777778, 1.805555555556, 1.5],
  "BA-DISP-015": {
    gmax: [1.059829059829, 1.135042735043, 0.958974358974, 1, 1.117948717949, 1.217094017094, 1.107692307692],
    gmed: [1.042990654206, 1.153271028037, 1.108411214953, 1, 1.020560747664, 1.03738317757, 1.166355140187]
  },
  "BA-DISP-016": [1.128623188406, 1.164855072464, 1.123188405797, 1, 1.179347826087, 1.101449275362, 1.184782608696],
  "BA-DISP-018": [1.047451669596, 1.137082601054, 1.082601054482, 1, 1.186291739895, 1.138840070299, 1.186291739895],
  "BA-DISP-023": [1.261728395062, 1.093827160494, 1.00987654321, 1, 1.259259259259, 1.333333333333, 1.234567901235]
});

// BAT-SRC-027 source-reported uneven/even endpoint ratios at the study's
// single artificial uneven-treadmill condition (2.3 m/s; height variation up
// to about 2.5 cm). These values are retained for source provenance only. The app's
// ordinal unevennessLevel 1-5 scale is NOT a source scale, and these endpoints
// are not numeric-runtime eligible without an exact representation of the
// source apparatus/protocol.
const UNEVENNESS_UPPER_BOUND_CURVES = Object.freeze({
  "BA-DISP-016": 1.07,
  "BA-DISP-018": 1.19,
  "BA-DISP-024": 0.80
});
const SURFACE_PRESETS = Object.freeze({
  "paved": {
    "key": "paved",
    "label": "舗装路",
    "materialLabel": "PAVED",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 5,
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 2,
    "stabilityLevel": 5,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "ASPHALT_REFERENCE_ZERO_ONLY",
    "numericRouteDefault": "REFERENCE_ZERO_ONLY",
    "confidence": "MODERATE"
  },
  "track": {
    "key": "track",
    "label": "陸上トラック",
    "materialLabel": "TRACK_RUBBER",
    "runSetting": "TRACK",
    "hardnessLevel": 3,
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 5,
    "stabilityLevel": 5,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "RUBBER",
    "numericRouteDefault": "SOURCE_GATED_CURRENT",
    "confidence": "MODERATE"
  },
  "treadmill": {
    "key": "treadmill",
    "label": "トレッドミル",
    "materialLabel": "TREADMILL_BELT",
    "runSetting": "TREADMILL",
    "hardnessLevel": 3,
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 4,
    "stabilityLevel": 5,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "ROUTING_ONLY",
    "confidence": "MODERATE"
  },
  "soil": {
    "key": "soil",
    "label": "締まった土道",
    "materialLabel": "COMPACTED_SOIL",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 3,
    "unevennessLevel": 2,
    "gripLevel": 3,
    "sinkLevel": 2,
    "reboundLevel": 2,
    "stabilityLevel": 3,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "TRACE_AND_COVERAGE_ONLY",
    "confidence": "LOW_TO_MODERATE"
  },
  "trail": {
    "key": "trail",
    "label": "不整地トレイル",
    "materialLabel": "TRAIL_UNEVEN",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": "UNKNOWN",
    "unevennessLevel": 5,
    "gripLevel": "UNKNOWN",
    "sinkLevel": "UNKNOWN",
    "reboundLevel": 1,
    "stabilityLevel": 2,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "NO_GENERIC_NUMERIC_ROUTE",
    "confidence": "LOW"
  },
  "natural_grass": {
    "key": "natural_grass",
    "label": "芝生",
    "materialLabel": "NATURAL_GRASS",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 2,
    "unevennessLevel": 2,
    "gripLevel": 3,
    "sinkLevel": 3,
    "reboundLevel": 2,
    "stabilityLevel": 3,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "GRASS",
    "numericRouteDefault": "SOURCE_GATED_CURRENT",
    "confidence": "MODERATE"
  },
  "artificial_turf": {
    "key": "artificial_turf",
    "label": "人工芝",
    "materialLabel": "ARTIFICIAL_TURF",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": "UNKNOWN",
    "unevennessLevel": 1,
    "gripLevel": 4,
    "sinkLevel": 1,
    "reboundLevel": 4,
    "stabilityLevel": 4,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "TRACE_AND_COVERAGE_ONLY",
    "confidence": "LOW_TO_MODERATE"
  },
  "sand": {
    "key": "sand",
    "label": "砂地",
    "materialLabel": "SAND",
    "runSetting": "OUTDOOR_ROUTE",
    "hardnessLevel": 1,
    "unevennessLevel": 3,
    "gripLevel": 2,
    "sinkLevel": 5,
    "reboundLevel": 1,
    "stabilityLevel": 1,
    "wetSlipDefault": "UNKNOWN",
    "exactSourceCategory": "NONE",
    "numericRouteDefault": "NO_GENERIC_NUMERIC_ROUTE",
    "confidence": "MODERATE_FOR_DIRECTIONAL_PROPERTIES"
  }
});
const ORACLE_EXPECTED = Object.freeze({
  "P9-REF-5KM": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-EXPOSURE-10KM": {
    "BA-DISP-014": 141.421356,
    "BA-DISP-015": 141.421356,
    "BA-DISP-016": 141.421356,
    "BA-DISP-018": 141.421356,
    "BA-DISP-019": 141.421356,
    "BA-DISP-021": 141.421356,
    "BA-DISP-023": 141.421356,
    "BA-DISP-024": 141.421356,
    "BA-DISP-025": 141.421356,
    "BA-DISP-027": 141.421356,
    "BA-DISP-028": 141.421356,
    "BA-DISP-029": 141.421356
  },
  "P9-EXPOSURE-2P5KM": {
    "BA-DISP-014": 70.710678,
    "BA-DISP-015": 70.710678,
    "BA-DISP-016": 70.710678,
    "BA-DISP-018": 70.710678,
    "BA-DISP-019": 70.710678,
    "BA-DISP-021": 70.710678,
    "BA-DISP-023": 70.710678,
    "BA-DISP-024": 70.710678,
    "BA-DISP-025": 70.710678,
    "BA-DISP-027": 70.710678,
    "BA-DISP-028": 70.710678,
    "BA-DISP-029": 70.710678
  },
  "P9-UPHILL-6": {
    "BA-DISP-014": 111.802,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 106.064,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 89.327,
    "BA-DISP-021": 106.013,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 139.18,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-DOWNHILL-6": {
    "BA-DISP-014": 109.014,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 122.236,
    "BA-DISP-021": 106.85,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 73.804,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-SPEED-5MS": {
    "BA-DISP-014": 108.898,
    "BA-DISP-015": 112.962,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 70.14,
    "BA-DISP-021": 62.798,
    "BA-DISP-023": 117.783,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 60.592,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 110.437,
    "BA-DISP-029": 100.0
  },
  "P9-CADENCE-PLUS10": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 97.418,
    "BA-DISP-021": 99.166,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 98.93,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-UNEVEN-EXACT": {
    "BA-DISP-014": 98.102,
    "BA-DISP-015": 97.173,
    "BA-DISP-016": 107.0,
    "BA-DISP-018": 119.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 95.817,
    "BA-DISP-024": 80.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 97.554,
    "BA-DISP-029": 100.0
  },
  "P9-GRASS-EXACT": {
    "BA-DISP-014": 102.232,
    "BA-DISP-015": 103.356,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 105.031,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 95.031,
    "BA-DISP-028": 102.889,
    "BA-DISP-029": 94.282
  },
  "P9-CALF-UP2": {
    "BA-DISP-014": 109.549,
    "BA-DISP-015": 108.376,
    "BA-DISP-016": 102.016,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 119.881,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 107.022,
    "BA-DISP-029": 100.0
  },
  "P9-CALF-UP7": {
    "BA-DISP-014": 117.765,
    "BA-DISP-015": 108.376,
    "BA-DISP-016": 107.061,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 127.907,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 107.022,
    "BA-DISP-029": 100.0
  },
  "P9-ARCH-FFS": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 105.679,
    "BA-DISP-029": 100.0
  },
  "P9-ARCH-WALK": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 92.311635,
    "BA-DISP-029": 100.0
  },
  "P9-MIX-UPDOWN-50": {
    "BA-DISP-014": 110.399199,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 102.987378,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 104.4939,
    "BA-DISP-021": 106.430677,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 101.351077,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-MIX-GRASS-50": {
    "BA-DISP-014": 101.109841,
    "BA-DISP-015": 101.664153,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 102.484633,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 97.483845,
    "BA-DISP-028": 101.434215,
    "BA-DISP-029": 97.098919
  },
  "P9-NOLEAK-PLAN": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-NOLEAK-BODYMASS": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-NOLEAK-SURFACE-ORDINAL": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-SEGMENT-EQUIVALENCE": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": 100.0,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": 100.0
  },
  "P9-MISSING-EXPOSURE": {
    "BA-DISP-014": null,
    "BA-DISP-015": null,
    "BA-DISP-016": null,
    "BA-DISP-018": null,
    "BA-DISP-019": null,
    "BA-DISP-021": null,
    "BA-DISP-023": null,
    "BA-DISP-024": null,
    "BA-DISP-025": null,
    "BA-DISP-027": null,
    "BA-DISP-028": null,
    "BA-DISP-029": null
  },
  "P9-UNKNOWN-SURFACE": {
    "BA-DISP-014": 100.0,
    "BA-DISP-015": 100.0,
    "BA-DISP-016": 100.0,
    "BA-DISP-018": 100.0,
    "BA-DISP-019": 100.0,
    "BA-DISP-021": 100.0,
    "BA-DISP-023": 100.0,
    "BA-DISP-024": 100.0,
    "BA-DISP-025": 100.0,
    "BA-DISP-027": null,
    "BA-DISP-028": 100.0,
    "BA-DISP-029": null
  },
  "P9-OOR-SPEED-6MS": {
    "BA-DISP-014": null,
    "BA-DISP-015": null,
    "BA-DISP-016": null,
    "BA-DISP-018": null,
    "BA-DISP-019": null,
    "BA-DISP-021": null,
    "BA-DISP-023": null,
    "BA-DISP-024": null,
    "BA-DISP-025": null,
    "BA-DISP-027": null,
    "BA-DISP-028": null,
    "BA-DISP-029": null
  }
});
const ORACLE_STATUS = Object.freeze({
  "P9-REF-5KM": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-EXPOSURE-10KM": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-EXPOSURE-2P5KM": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-UPHILL-6": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-DOWNHILL-6": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-SPEED-5MS": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-CADENCE-PLUS10": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-UNEVEN-EXACT": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-GRASS-EXACT": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-CALF-UP2": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-CALF-UP7": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-ARCH-FFS": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-ARCH-WALK": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-MIX-UPDOWN-50": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-MIX-GRASS-50": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-NOLEAK-PLAN": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-NOLEAK-BODYMASS": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-NOLEAK-SURFACE-ORDINAL": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-SEGMENT-EQUIVALENCE": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "CALCULATED"
  },
  "P9-MISSING-EXPOSURE": {
    "BA-DISP-014": "NOT_CALCULABLE",
    "BA-DISP-015": "NOT_CALCULABLE",
    "BA-DISP-016": "NOT_CALCULABLE",
    "BA-DISP-018": "NOT_CALCULABLE",
    "BA-DISP-019": "NOT_CALCULABLE",
    "BA-DISP-021": "NOT_CALCULABLE",
    "BA-DISP-023": "NOT_CALCULABLE",
    "BA-DISP-024": "NOT_CALCULABLE",
    "BA-DISP-025": "NOT_CALCULABLE",
    "BA-DISP-027": "NOT_CALCULABLE",
    "BA-DISP-028": "NOT_CALCULABLE",
    "BA-DISP-029": "NOT_CALCULABLE"
  },
  "P9-UNKNOWN-SURFACE": {
    "BA-DISP-014": "CALCULATED",
    "BA-DISP-015": "CALCULATED",
    "BA-DISP-016": "CALCULATED",
    "BA-DISP-018": "CALCULATED",
    "BA-DISP-019": "CALCULATED",
    "BA-DISP-021": "CALCULATED",
    "BA-DISP-023": "CALCULATED",
    "BA-DISP-024": "CALCULATED",
    "BA-DISP-025": "CALCULATED",
    "BA-DISP-027": "PARTIALLY_CALCULATED",
    "BA-DISP-028": "CALCULATED",
    "BA-DISP-029": "PARTIALLY_CALCULATED"
  },
  "P9-OOR-SPEED-6MS": {
    "BA-DISP-014": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-015": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-016": "PARTIALLY_CALCULATED",
    "BA-DISP-018": "PARTIALLY_CALCULATED",
    "BA-DISP-019": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-021": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-023": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-024": "PARTIALLY_CALCULATED",
    "BA-DISP-025": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-027": "PARTIALLY_CALCULATED",
    "BA-DISP-028": "OUT_OF_SUPPORTED_RANGE",
    "BA-DISP-029": "PARTIALLY_CALCULATED"
  }
});
__exp["AUTHORITY_VERSION"] = AUTHORITY_VERSION;
__exp["PARAMETER_SET_VERSION"] = PARAMETER_SET_VERSION;
__exp["ADAPTER_VERSION"] = ADAPTER_VERSION;
__exp["REGIONS"] = REGIONS;
__exp["FORMAL_INPUT_CATALOG"] = FORMAL_INPUT_CATALOG;
__exp["PARAMETERS"] = PARAMETERS;
__exp["PARAMETER_BOUNDS"] = PARAMETER_BOUNDS;
__exp["SOURCE_CURVES"] = SOURCE_CURVES;
__exp["SURFACE_CURVES"] = SURFACE_CURVES;
__exp["ARCH_SURFACE_CURVES"] = ARCH_SURFACE_CURVES;
__exp["PFA_CURVE"] = PFA_CURVE;
__exp["GASTRO_GRADE_CURVE"] = GASTRO_GRADE_CURVE;
__exp["GLUTE_GRADE_CURVE"] = GLUTE_GRADE_CURVE;
__exp["GRADE_SPEED_PROFILE"] = GRADE_SPEED_PROFILE;
__exp["UNEVENNESS_UPPER_BOUND_CURVES"] = UNEVENNESS_UPPER_BOUND_CURVES;
__exp["SURFACE_PRESETS"] = SURFACE_PRESETS;
__exp["ORACLE_EXPECTED"] = ORACLE_EXPECTED;
__exp["ORACLE_STATUS"] = ORACLE_STATUS;
__mods[17] = __exp;
}

// ===== core/model/currentPrimaryInput/utilities.js =====
{
const __exp = Object.create(null);
const EPS = 1e-12;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function nearlyEqual(a, b, tolerance = 1e-9) {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
}

function logInterpolate(points, x) {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  if (!Number.isFinite(x) || x < sorted[0][0] - EPS || x > sorted.at(-1)[0] + EPS) {
    const error = new RangeError("OUT_OF_SOURCE_DOMAIN");
    error.code = "OUT_OF_SOURCE_DOMAIN";
    throw error;
  }
  for (const [px, py] of sorted) {
    if (Math.abs(px - x) <= EPS) return py;
  }
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const [x0, y0] = sorted[i];
    const [x1, y1] = sorted[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return Math.exp(Math.log(y0) + (Math.log(y1) - Math.log(y0)) * t);
    }
  }
  throw new Error("Interpolation invariant failed");
}

function boundedFactor(raw, bound) {
  if (!(bound > 0)) return 1;
  return Math.exp(bound * Math.tanh(raw / bound));
}

function geometricMeanRatio(weightedRatios) {
  const totalWeight = weightedRatios.reduce((sum, item) => sum + item.weight, 0);
  if (!(totalWeight > 0)) throw new Error("No positive integration weight");
  return Math.exp(weightedRatios.reduce((sum, item) => {
    if (!(item.ratio > 0)) throw new Error("Condition ratio must be positive");
    return sum + (item.weight / totalWeight) * Math.log(item.ratio);
  }, 0));
}

function gradePercentToDegrees(percent) {
  return Math.atan(percent / 100) * 180 / Math.PI;
}

function gradeDegreesToPercent(degrees) {
  return Math.tan(degrees * Math.PI / 180) * 100;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function worstCalculationState(states) {
  const order = ["CALCULATED", "PARTIAL", "OUT_OF_SUPPORTED_RANGE", "NOT_CALCULABLE", "NOT_APPLICABLE"];
  return states.reduce((worst, state) => order.indexOf(state) > order.indexOf(worst) ? state : worst, "CALCULATED");
}

function mergeState(a, b) {
  return worstCalculationState([a, b]);
}

function success(value, warnings = []) { return { ok: true, value, warnings }; }
function failure(code, messageKey, path = "", details = {}) {
  return { ok: false, error: { code, messageKey, path, details } };
}
__exp["EPS"] = EPS;
__exp["clamp"] = clamp;
__exp["nearlyEqual"] = nearlyEqual;
__exp["logInterpolate"] = logInterpolate;
__exp["boundedFactor"] = boundedFactor;
__exp["geometricMeanRatio"] = geometricMeanRatio;
__exp["gradePercentToDegrees"] = gradePercentToDegrees;
__exp["gradeDegreesToPercent"] = gradeDegreesToPercent;
__exp["stableStringify"] = stableStringify;
__exp["worstCalculationState"] = worstCalculationState;
__exp["mergeState"] = mergeState;
__exp["success"] = success;
__exp["failure"] = failure;
__mods[18] = __exp;
}

// ===== core/model/currentPrimaryInput/canonicalHash.js =====
{
const __exp = Object.create(null);
const { stableStringify } = __mods[18];

function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }

function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const bitLength = bytes.length * 8;
  const withOne = bytes.length + 1;
  const paddedLength = Math.ceil((withOne + 8) / 64) * 64;
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  view.setUint32(paddedLength - 8, high, false);
  view.setUint32(paddedLength - 4, low, false);

  const k = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  let h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const w = new Uint32Array(64);
  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rightRotate(w[i-15],7) ^ rightRotate(w[i-15],18) ^ (w[i-15] >>> 3);
      const s1 = rightRotate(w[i-2],17) ^ rightRotate(w[i-2],19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rightRotate(e,6) ^ rightRotate(e,11) ^ rightRotate(e,25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + s1 + ch + k[i] + w[i]) >>> 0;
      const s0 = rightRotate(a,2) ^ rightRotate(a,13) ^ rightRotate(a,22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      hh=g; g=f; f=e; e=(d+temp1)>>>0; d=c; c=b; b=a; a=(temp1+temp2)>>>0;
    }
    h = [(h[0]+a)>>>0,(h[1]+b)>>>0,(h[2]+c)>>>0,(h[3]+d)>>>0,(h[4]+e)>>>0,(h[5]+f)>>>0,(h[6]+g)>>>0,(h[7]+hh)>>>0];
  }
  return h.map(v => v.toString(16).padStart(8,"0")).join("");
}

function hashCanonical(value) { return sha256(stableStringify(value)); }
__exp["sha256"] = sha256;
__exp["hashCanonical"] = hashCanonical;
__mods[19] = __exp;
}

// ===== core/model/currentPrimaryInput/surfacePresets.js =====
{
const __exp = Object.create(null);
const { SURFACE_PRESETS } = __mods[17];
const { failure, success } = __mods[18];

function normalizeExactCategory(preset, subtype) {
  if (preset.key === "paved" && subtype === "asphalt") return "Asphalt";
  if (preset.key === "paved" && subtype === "concrete") return "Concrete";
  if (preset.key === "track" && (subtype == null || subtype === "rubber")) return "Rubber";
  if (preset.key === "natural_grass" && (subtype == null || subtype === "grass")) return "Grass";
  return null;
}

function resolveSurfaceSelections(selections) {
  if (!Array.isArray(selections) || selections.length === 0) {
    return success({ knowledge: "UNKNOWN", components: [], dominant: null }, [{
      code: "UNKNOWN_NOT_IMPUTED", messageKey: "surface.unknown_not_asphalt", path: "course.surfaceSelections", details: {}
    }]);
  }
  const normalized = selections.map((item, index) => {
    const preset = SURFACE_PRESETS[item.presetKey];
    if (!preset) throw Object.assign(new Error(`Unknown surface preset: ${item.presetKey}`), { code: "SCHEMA_INVALID", path: `course.surfaceSelections[${index}].presetKey` });
    const share = item.sharePercent ?? (selections.length === 1 ? 100 : null);
    if (!(share >= 0 && share <= 100)) throw Object.assign(new Error("Invalid surface share"), { code: "SECTION_SHARE_INVALID", path: `course.surfaceSelections[${index}].sharePercent` });
    const overrides = item.propertyOverrides ?? {};
    const profile = {
      hardnessLevel: overrides.hardnessLevel ?? preset.hardnessLevel,
      unevennessLevel: overrides.unevennessLevel ?? preset.unevennessLevel,
      gripLevel: overrides.gripLevel ?? preset.gripLevel,
      sinkLevel: overrides.sinkLevel ?? preset.sinkLevel,
      reboundLevel: overrides.reboundLevel ?? preset.reboundLevel,
      stabilityLevel: overrides.stabilityLevel ?? preset.stabilityLevel,
      wetSlipState: item.wetSlipState ?? preset.wetSlipDefault,
    };
    const exactCategory = normalizeExactCategory(preset, item.subtype);
    const exactEvidence = exactCategory
      ? item.subtype
        ? "EXPLICIT_SUBTYPE"
        : "MATERIAL_SPECIFIC_PRESET"
      : null;
    return {
      componentId: `surface-${index + 1}`, sharePercent: share, presetKey: preset.key,
      materialLabel: preset.materialLabel, runSetting: preset.runSetting,
      propertyProfile: profile, propertyOrigin: Object.keys(overrides).length ? "USER_OVERRIDE" : "PRESET",
      exactSourceCategory: exactCategory,
      exactSourceEvidence: exactEvidence,
      numericRouteDefault: preset.numericRouteDefault,
      confidence: preset.confidence,
    };
  });
  const sum = normalized.reduce((a, b) => a + b.sharePercent, 0);
  if (Math.abs(sum - 100) > 0.01) return failure("SECTION_SHARE_INVALID", "surface.share_sum_must_be_100", "course.surfaceSelections", { sum });
  const dominant = [...normalized].sort((a,b)=>b.sharePercent-a.sharePercent)[0];
  return success({ knowledge: normalized.length === 1 ? "DOMINANT_ONLY" : "MIXTURE_KNOWN", components: normalized, dominant });
}

function isStandardShoeCandidate(shoeType, softness) {
  return shoeType === "TRAINING" && softness === "NORMAL";
}
__exp["resolveSurfaceSelections"] = resolveSurfaceSelections;
__exp["isStandardShoeCandidate"] = isStandardShoeCandidate;
__mods[20] = __exp;
}

// ===== core/model/currentPrimaryInput/formalInputValidation.js =====
{
const __exp = Object.create(null);
const { FORMAL_INPUT_CATALOG, REGIONS } = __mods[17];
const { hashCanonical } = __mods[19];

const REGION_IDS = REGIONS.map((region) => region.id);
const REGION_ID_SET = new Set(REGION_IDS);
const STATUS_VALUES = new Set([
  "KNOWN",
  "UNKNOWN",
  "NOT_RECORDED",
  "NOT_SET",
  "NOT_APPLICABLE",
  "PARTIAL",
]);
const EMPTY_STATUSES = new Set(["UNKNOWN", "NOT_RECORDED", "NOT_SET", "NOT_APPLICABLE"]);
const SECTION_BASES = new Set(["DISTANCE", "TIME", "STEPS", "CONTACTS"]);
const GRADE_DIRECTIONS = new Set(["FLAT", "UPHILL", "DOWNHILL", "UNKNOWN"]);
const TIMINGS = new Set(["PRE_RUN", "DURING_RUN", "IMMEDIATE_POST", "LATER", "UNKNOWN"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function issue(code, path, details = {}) {
  return { code, messageKey: `validation.${code.toLowerCase()}`, path, details };
}

function requireFinite(issues, value, path, { min = -Infinity, max = Infinity, integer = false, nullable = true } = {}) {
  if (value == null && nullable) return;
  if (!finiteNumber(value)) {
    issues.push(issue("NUMBER_REQUIRED", path, { value }));
    return;
  }
  if (integer && !Number.isInteger(value)) issues.push(issue("INTEGER_REQUIRED", path, { value }));
  if (value < min || value > max) issues.push(issue("NUMBER_OUT_OF_RANGE", path, { value, min, max }));
}

function validateSection(section, index, issues, { allowDerivedSurface = false } = {}) {
  const path = `course.sections[${index}]`;
  if (!isObject(section)) {
    issues.push(issue("SECTION_OBJECT_REQUIRED", path));
    return;
  }
  if (!SECTION_BASES.has(section.shareBasis)) {
    issues.push(issue("SECTION_BASIS_INVALID", `${path}.shareBasis`, { value: section.shareBasis }));
  }
  requireFinite(issues, section.shareValue, `${path}.shareValue`, { min: Number.MIN_VALUE, nullable: false });
  requireFinite(issues, section.distanceKm, `${path}.distanceKm`, { min: Number.MIN_VALUE });
  requireFinite(issues, section.durationMinutes, `${path}.durationMinutes`, { min: Number.MIN_VALUE });
  requireFinite(issues, section.steps, `${path}.steps`, { min: 0, integer: true });
  requireFinite(issues, section.speedMps, `${path}.speedMps`, { min: Number.MIN_VALUE });
  requireFinite(issues, section.cadenceSpm, `${path}.cadenceSpm`, { min: Number.MIN_VALUE });
  requireFinite(issues, section.gradePercent, `${path}.gradePercent`, { min: 0 });
  if (!GRADE_DIRECTIONS.has(section.gradeDirection)) {
    issues.push(issue("GRADE_DIRECTION_INVALID", `${path}.gradeDirection`, { value: section.gradeDirection }));
  }
  if (section.gradeDirection === "FLAT" && section.gradePercent != null && section.gradePercent !== 0) {
    issues.push(issue("GRADE_DIRECTION_MAGNITUDE_CONFLICT", `${path}.gradePercent`, {
      gradeDirection: section.gradeDirection,
      gradePercent: section.gradePercent,
    }));
  }
  if (["UPHILL", "DOWNHILL"].includes(section.gradeDirection) && !(section.gradePercent > 0)) {
    issues.push(issue("GRADE_DIRECTION_MAGNITUDE_CONFLICT", `${path}.gradePercent`, {
      gradeDirection: section.gradeDirection,
      gradePercent: section.gradePercent,
    }));
  }
  if (section.gradeDirection === "UNKNOWN" && section.gradePercent != null) {
    issues.push(issue("GRADE_DIRECTION_MAGNITUDE_CONFLICT", `${path}.gradePercent`, {
      gradeDirection: section.gradeDirection,
      gradePercent: section.gradePercent,
    }));
  }
  if (Object.hasOwn(section, "protocolTags")) {
    issues.push(issue("UNTRUSTED_PROTOCOL_TAG_FORBIDDEN", `${path}.protocolTags`));
  }
  if (!allowDerivedSurface && Object.hasOwn(section, "surfaceComponents")) {
    issues.push(issue("UNTRUSTED_DERIVED_SURFACE_FORBIDDEN", `${path}.surfaceComponents`));
  }
}

function validatePrototypeRecordInput(input) {
  const issues = [];
  if (!isObject(input)) return [issue("OBJECT_REQUIRED", "")];
  if (!["run", "rest"].includes(input.activityType)) {
    issues.push(issue("ACTIVITY_TYPE_INVALID", "activityType", { value: input.activityType }));
  }
  if (typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    issues.push(issue("DATE_INVALID", "date", { value: input.date }));
  }
  if (input.activityType === "run") {
    requireFinite(issues, input.distanceKm, "distanceKm", { min: Number.MIN_VALUE, nullable: false });
    requireFinite(issues, input.durationMinutes, "durationMinutes", { min: Number.MIN_VALUE, nullable: false });
  } else if (input.activityType === "rest") {
    for (const field of ["distanceKm", "durationMinutes", "steps"]) {
      if (input[field] != null) issues.push(issue("REST_RUNNING_VALUE_FORBIDDEN", field, { value: input[field] }));
    }
  }
  requireFinite(issues, input.steps, "steps", { min: 0, integer: true });
  requireFinite(issues, input.rpe, "rpe", { min: 0, max: 10 });

  const course = input.course;
  if (course != null && !isObject(course)) {
    issues.push(issue("COURSE_OBJECT_REQUIRED", "course"));
  } else if (course) {
    for (const field of ["uphillSharePercent", "downhillSharePercent"]) {
      requireFinite(issues, course[field], `course.${field}`, { min: 0, max: 100 });
    }
    const up = course.uphillSharePercent ?? 0;
    const down = course.downhillSharePercent ?? 0;
    if (finiteNumber(up) && finiteNumber(down) && up + down > 100 + 1e-9) {
      issues.push(issue("GRADE_SHARE_SUM_INVALID", "course", { uphill: up, downhill: down }));
    }
    for (const field of ["uphillGradePercent", "downhillGradePercent"]) {
      requireFinite(issues, course[field], `course.${field}`, { min: Number.MIN_VALUE });
    }
    if (Array.isArray(course.surfaceSelections)) {
      let surfaceShare = 0;
      course.surfaceSelections.forEach((selection, index) => {
        const path = `course.surfaceSelections[${index}]`;
        if (!isObject(selection)) {
          issues.push(issue("SURFACE_SELECTION_OBJECT_REQUIRED", path));
          return;
        }
        requireFinite(issues, selection.sharePercent, `${path}.sharePercent`, { min: 0, max: 100, nullable: false });
        if (finiteNumber(selection.sharePercent)) surfaceShare += selection.sharePercent;
        if (selection.propertyOverrides != null && !isObject(selection.propertyOverrides)) {
          issues.push(issue("SURFACE_OVERRIDE_OBJECT_REQUIRED", `${path}.propertyOverrides`));
        } else {
          for (const field of ["hardnessLevel", "unevennessLevel", "gripLevel", "sinkLevel", "reboundLevel", "stabilityLevel"]) {
            requireFinite(issues, selection.propertyOverrides?.[field], `${path}.propertyOverrides.${field}`, {
              min: 1,
              max: 5,
              integer: true,
            });
          }
        }
      });
      if (course.surfaceSelections.length && Math.abs(surfaceShare - 100) > 0.01) {
        issues.push(issue("SURFACE_SHARE_SUM_INVALID", "course.surfaceSelections", { sum: surfaceShare }));
      }
    }
    if (Array.isArray(course.sections)) {
      const ids = new Set();
      const bases = new Set();
      course.sections.forEach((section, index) => {
        validateSection(section, index, issues);
        if (section?.sectionId) {
          if (ids.has(section.sectionId)) issues.push(issue("SECTION_ID_DUPLICATE", `course.sections[${index}].sectionId`, { value: section.sectionId }));
          ids.add(section.sectionId);
        }
        if (SECTION_BASES.has(section?.shareBasis)) bases.add(section.shareBasis);
      });
      if (bases.size > 1) issues.push(issue("MIXED_SECTION_BASES_FORBIDDEN", "course.sections", { bases: [...bases] }));
    }
  }

  const observations = input.bodyReview?.observations;
  if (observations != null && !Array.isArray(observations)) {
    issues.push(issue("OBSERVATIONS_ARRAY_REQUIRED", "bodyReview.observations"));
  } else {
    (observations ?? []).forEach((observation, index) => {
      const path = `bodyReview.observations[${index}]`;
      if (!isObject(observation)) {
        issues.push(issue("OBSERVATION_OBJECT_REQUIRED", path));
        return;
      }
      if (!REGION_ID_SET.has(observation.bodyAreaId)) {
        issues.push(issue("REGION_ID_INVALID", `${path}.bodyAreaId`, { value: observation.bodyAreaId }));
      }
      requireFinite(issues, observation.noticedIntensity, `${path}.noticedIntensity`, {
        min: 0,
        max: 5,
        integer: true,
        nullable: false,
      });
      if (!TIMINGS.has(observation.noticedTiming)) {
        issues.push(issue("OBSERVATION_TIMING_INVALID", `${path}.noticedTiming`, { value: observation.noticedTiming }));
      }
    });
  }
  return issues;
}

const NUMERIC_RANGES = new Map([
  ["RL-IN-011", { min: Number.MIN_VALUE }],
  ["RL-IN-013", { min: Number.MIN_VALUE }],
  ["RL-IN-015", { min: 0, integer: true }],
  ["RL-DV-019", { min: Number.MIN_VALUE }],
  ["RL-DV-020", { min: Number.MIN_VALUE }],
  ["RL-DV-021", { min: Number.MIN_VALUE }],
  ["RL-IN-033", { min: 0, max: 100 }],
  ["RL-IN-034", { min: 0, max: 100 }],
  ["RL-DV-035", { min: 0, max: 100 }],
  ["RL-IN-036", { min: Number.MIN_VALUE }],
  ["RL-IN-037", { min: Number.MIN_VALUE }],
  ["RL-IN-043", { min: 0, max: 100 }],
  ["RL-IN-044", { min: 1, max: 5, integer: true }],
  ["RL-IN-045", { min: 1, max: 5, integer: true }],
  ["RL-IN-046", { min: 1, max: 5, integer: true }],
  ["RL-IN-047", { min: 1, max: 5, integer: true }],
  ["RL-IN-048", { min: 1, max: 5, integer: true }],
  ["RL-IN-049", { min: 1, max: 5, integer: true }],
  ["RL-IN-091", { min: 0, max: 10 }],
  ["RL-IN-104", { min: 0, max: 5, integer: true }],
  ["RL-IN-113", { min: 50, max: 250 }],
  ["RL-IN-114", { min: 20, max: 300 }],
]);

function validateFormalBundleSemantics(bundle) {
  const issues = [];
  if (!isObject(bundle) || !isObject(bundle.formalInputs)) return [issue("FORMAL_BUNDLE_INVALID", "")];
  const catalogById = new Map(FORMAL_INPUT_CATALOG.map((item) => [item.id, item]));
  const actualIds = Object.keys(bundle.formalInputs);
  for (const item of FORMAL_INPUT_CATALOG) {
    if (!Object.hasOwn(bundle.formalInputs, item.id)) issues.push(issue("MISSING_FORMAL_INPUT_ENTRY", `formalInputs.${item.id}`));
  }
  for (const id of actualIds) {
    const entry = bundle.formalInputs[id];
    const catalog = catalogById.get(id);
    if (!catalog) {
      issues.push(issue("UNKNOWN_FORMAL_INPUT_ID", `formalInputs.${id}`));
      continue;
    }
    if (!isObject(entry)) {
      issues.push(issue("FORMAL_INPUT_ENTRY_INVALID", `formalInputs.${id}`));
      continue;
    }
    if (entry.inputId !== id) issues.push(issue("FORMAL_INPUT_ID_MISMATCH", `formalInputs.${id}.inputId`, { value: entry.inputId }));
    if (!STATUS_VALUES.has(entry.status)) issues.push(issue("FORMAL_INPUT_STATUS_INVALID", `formalInputs.${id}.status`, { value: entry.status }));
    if (EMPTY_STATUSES.has(entry.status) && entry.value !== null) {
      issues.push(issue("STATUS_VALUE_CONFLICT", `formalInputs.${id}.value`, { status: entry.status }));
    }
    if (entry.status === "KNOWN" && entry.value === null) {
      issues.push(issue("KNOWN_VALUE_MISSING", `formalInputs.${id}.value`));
    }
    if (entry.numericPermission !== catalog.numericPermission) {
      issues.push(issue("NUMERIC_PERMISSION_MISMATCH", `formalInputs.${id}.numericPermission`, {
        value: entry.numericPermission,
        expected: catalog.numericPermission,
      }));
    }
    const range = NUMERIC_RANGES.get(id);
    if (range && entry.status === "KNOWN") requireFinite(issues, entry.value, `formalInputs.${id}.value`, { ...range, nullable: false });
  }
  const sections = bundle.formalInputs["RL-IN-039"]?.value;
  if (bundle.formalInputs["RL-IN-039"]?.status === "KNOWN") {
    if (!Array.isArray(sections)) issues.push(issue("SECTIONS_ARRAY_REQUIRED", "formalInputs.RL-IN-039.value"));
    else {
      const bases = new Set();
      sections.forEach((section, index) => {
        validateSection(section, index, issues, { allowDerivedSurface: true });
        if (SECTION_BASES.has(section?.shareBasis)) bases.add(section.shareBasis);
      });
      if (bases.size > 1) issues.push(issue("MIXED_SECTION_BASES_FORBIDDEN", "formalInputs.RL-IN-039.value", { bases: [...bases] }));
    }
  }
  const observations = bundle.formalInputs["RL-IN-101"]?.value;
  if (bundle.formalInputs["RL-IN-101"]?.status === "KNOWN") {
    if (!Array.isArray(observations)) issues.push(issue("OBSERVATIONS_ARRAY_REQUIRED", "formalInputs.RL-IN-101.value"));
    else {
      observations.forEach((observation, index) => {
        requireFinite(issues, observation?.noticedIntensity, `formalInputs.RL-IN-101.value[${index}].noticedIntensity`, {
          min: 0,
          max: 5,
          integer: true,
          nullable: false,
        });
        if (!REGION_ID_SET.has(observation?.bodyAreaId)) {
          issues.push(issue("REGION_ID_INVALID", `formalInputs.RL-IN-101.value[${index}].bodyAreaId`, { value: observation?.bodyAreaId }));
        }
      });
    }
  }
  if (bundle.recordSnapshot?.inputSnapshotHash && bundle.recordSnapshot.inputSnapshotHash !== hashCanonical(bundle.formalInputs)) {
    issues.push(issue("INPUT_SNAPSHOT_HASH_MISMATCH", "recordSnapshot.inputSnapshotHash"));
  }
  return issues;
}

function validateRegionalEngineInputSemantics(input) {
  const issues = validateFormalBundleSemantics(input);
  if (!isObject(input)) return issues;
  const formalSections = input.formalInputs?.["RL-IN-039"]?.value;
  if (Array.isArray(formalSections) && hashCanonical(formalSections) !== hashCanonical(input.courseSections ?? [])) {
    issues.push(issue("ENGINE_SECTION_SNAPSHOT_MISMATCH", "courseSections"));
  }
  const routeIds = new Set();
  for (const [index, route] of (input.routeEligibility ?? []).entries()) {
    if (routeIds.has(route.routeId)) issues.push(issue("ROUTE_ID_DUPLICATE", `routeEligibility[${index}].routeId`, { value: route.routeId }));
    routeIds.add(route.routeId);
  }
  return issues;
}

function approximatelyEqual(left, right, tolerance = 1e-9) {
  return finiteNumber(left) && finiteNumber(right) && Math.abs(left - right) <= tolerance;
}

function validateRegionalEngineOutput(output) {
  const issues = [];
  if (!isObject(output)) return { valid: false, issues: [issue("OUTPUT_OBJECT_REQUIRED", "")] };
  if (output.traceContractVersion !== "runload-reason-trace-1.2") {
    issues.push(issue("TRACE_CONTRACT_VERSION_INVALID", "traceContractVersion", { value: output.traceContractVersion, expected: "runload-reason-trace-1.2" }));
  }
  if (!Array.isArray(output.regions) || output.regions.length !== REGION_IDS.length) {
    issues.push(issue("REGION_SET_INVALID", "regions", { count: output.regions?.length }));
  } else {
    const ids = output.regions.map((region) => region.regionId);
    if (ids.some((id, index) => id !== REGION_IDS[index])) {
      issues.push(issue("REGION_ORDER_OR_ID_INVALID", "regions", { ids, expected: REGION_IDS }));
    }
    if (new Set(ids).size !== REGION_IDS.length) issues.push(issue("REGION_ID_DUPLICATE", "regions", { ids }));
    output.regions.forEach((region, index) => {
      const path = `regions[${index}]`;
      const numericState = ["CALCULATED", "PARTIAL"].includes(region.calculationState);
      if (numericState) {
        if (!finiteNumber(region.indexExact)) issues.push(issue("NUMERIC_STATE_INDEX_REQUIRED", `${path}.indexExact`));
        if (!approximatelyEqual(region.deltaFromReferenceExact, region.indexExact - 100)) {
          issues.push(issue("DELTA_ARITHMETIC_MISMATCH", `${path}.deltaFromReferenceExact`));
        }
        if (region.displayIndex !== Math.round(region.indexExact)) issues.push(issue("DISPLAY_INDEX_MISMATCH", `${path}.displayIndex`));
        if (region.displayDeltaPoints !== Math.round(region.indexExact - 100)) issues.push(issue("DISPLAY_DELTA_MISMATCH", `${path}.displayDeltaPoints`));
        if (!approximatelyEqual(region.components?.selfReportedStateLog, 0)) {
          issues.push(issue("SELF_REPORT_NUMERIC_LEAKAGE", `${path}.components.selfReportedStateLog`));
        }
        if (!approximatelyEqual(region.components?.selfReportedStateMultiplier, 1)) {
          issues.push(issue("SELF_REPORT_MULTIPLIER_NOT_NEUTRAL", `${path}.components.selfReportedStateMultiplier`));
        }
        if (!approximatelyEqual(region.indexExact, region.components?.mechanicalIndexWithoutSelfState)) {
          issues.push(issue("CANONICAL_INDEX_OBSERVATION_OVERLAY_MISMATCH", `${path}.indexExact`));
        }
      } else {
        for (const field of ["indexExact", "deltaFromReferenceExact", "displayIndex", "displayDeltaPoints"]) {
          if (region[field] !== null) issues.push(issue("NON_NUMERIC_STATE_VALUE_FORBIDDEN", `${path}.${field}`, { state: region.calculationState }));
        }
      }
      if (!isObject(region.componentCoverage) || !Array.isArray(region.componentCoverage.sections)) {
        issues.push(issue("COMPONENT_COVERAGE_REQUIRED", `${path}.componentCoverage`));
      } else {
        const expectedCoverageState = region.componentCoverage.sections.some((section) => section.state === "PARTIAL")
          ? "PARTIAL"
          : region.componentCoverage.sections.length
            ? "FULL"
            : "NONE";
        if (region.componentCoverage.state !== expectedCoverageState) {
          issues.push(issue("COMPONENT_COVERAGE_STATE_MISMATCH", `${path}.componentCoverage.state`, {
            value: region.componentCoverage.state,
            expected: expectedCoverageState,
          }));
        }
        region.componentCoverage.sections.forEach((section, sectionIndex) => {
          const weights = Object.values(section.normalizedWeights ?? {});
          if (weights.length && Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 1) > 1e-9) {
            issues.push(issue("COMPONENT_WEIGHT_RENORMALIZATION_INVALID", `${path}.componentCoverage.sections[${sectionIndex}].normalizedWeights`));
          }
          const declaredFractions = Object.values(section.declaredShareFractions ?? {});
          const representedFraction = section.representedShareFraction;
          if (declaredFractions.length) {
            const declaredSum = declaredFractions.reduce((sum, weight) => sum + weight, 0);
            if (!(declaredSum > 0 && declaredSum <= 1 + 1e-9)) {
              issues.push(issue("DECLARED_COMPONENT_SHARE_INVALID", `${path}.componentCoverage.sections[${sectionIndex}].declaredShareFractions`));
            }
            if (!finiteNumber(representedFraction) || !approximatelyEqual(declaredSum, representedFraction, 1e-9)) {
              issues.push(issue("REPRESENTED_COMPONENT_SHARE_MISMATCH", `${path}.componentCoverage.sections[${sectionIndex}].representedShareFraction`, {value:representedFraction,expected:declaredSum}));
            }
            if (section.state === "PARTIAL" && !(representedFraction < 1 - 1e-9)) {
              issues.push(issue("PARTIAL_COMPONENT_SHARE_NOT_PARTIAL", `${path}.componentCoverage.sections[${sectionIndex}].representedShareFraction`));
            }
          }
        });
      }
      if (!isObject(region.observationOverlay)) {
        issues.push(issue("OBSERVATION_OVERLAY_REQUIRED", `${path}.observationOverlay`));
      }
      if (output.traceContractVersion === "runload-reason-trace-1.2" && numericState) {
        const numericEvents=(region.reasonTrace??[]).filter(event=>event.numericEffectApplied===true);
        if (numericEvents.some(event=>!finiteNumber(event.contributionLog))) {
          issues.push(issue("TRACE_NUMERIC_CONTRIBUTION_NONFINITE", `${path}.reasonTrace`));
        }
        const contributionSum=numericEvents.reduce((sum,event)=>sum+event.contributionLog,0);
        if (!approximatelyEqual(contributionSum, region.components?.totalLog, 1e-12)) {
          issues.push(issue("TRACE_CONTRIBUTION_SUM_MISMATCH", `${path}.reasonTrace`, {value:contributionSum,expected:region.components?.totalLog}));
        }
        const conditionEvents=numericEvents.filter(event=>event.traceCode==="SECTION_CONDITION_CONTRIBUTION");
        const exposureEvents=numericEvents.filter(event=>event.traceCode==="EXPOSURE_CONTRIBUTION");
        if (conditionEvents.length !== region.componentCoverage.sections.length || exposureEvents.length !== 1) {
          issues.push(issue("TRACE_ONE_TO_ONE_CARDINALITY_INVALID", `${path}.reasonTrace`, {conditionEvents:conditionEvents.length,sections:region.componentCoverage.sections.length,exposureEvents:exposureEvents.length}));
        }
        for (const [eventIndex,event] of numericEvents.entries()) {
          if (event.regionId!==region.regionId || !Object.hasOwn(event,"sectionId") || typeof event.routeId!=="string" || !event.routeId || !Array.isArray(event.inputIds) || !event.inputIds.length || !Array.isArray(event.sourceIds) || !Array.isArray(event.parameterIds)) {
            issues.push(issue("TRACE_PROVENANCE_INCOMPLETE", `${path}.reasonTrace[${eventIndex}]`));
          }
        }
      }
    });
  }
  const summary = output.coverageSummary ?? {};
  const count = (state) => (output.regions ?? []).filter((region) => region.calculationState === state).length;
  const expectedCounts = {
    calculatedRegionCount: count("CALCULATED"),
    partialRegionCount: count("PARTIAL"),
    notCalculableRegionCount: count("NOT_CALCULABLE"),
    outOfRangeRegionCount: count("OUT_OF_SUPPORTED_RANGE"),
    notApplicableRegionCount: count("NOT_APPLICABLE"),
  };
  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (summary[key] !== expected) issues.push(issue("COVERAGE_COUNT_MISMATCH", `coverageSummary.${key}`, { value: summary[key], expected }));
  }
  for (const field of ["crossRegionRank", "overallEstimatedLoad", "injuryRisk", "dangerScore", "runRestDecision", "personalHistoryDelta"]) {
    if (output.prohibitedFieldsAbsent?.[field] !== true || Object.hasOwn(output, field)) {
      issues.push(issue("PROHIBITED_FIELD_CONTRACT_VIOLATION", field));
    }
  }
  if (output.resultHash) {
    const { resultHash, ...base } = output;
    if (resultHash !== hashCanonical(base)) issues.push(issue("RESULT_HASH_MISMATCH", "resultHash"));
  } else {
    issues.push(issue("RESULT_HASH_MISSING", "resultHash"));
  }
  return { valid: issues.length === 0, issues };
}
__exp["validatePrototypeRecordInput"] = validatePrototypeRecordInput;
__exp["validateFormalBundleSemantics"] = validateFormalBundleSemantics;
__exp["validateRegionalEngineInputSemantics"] = validateRegionalEngineInputSemantics;
__exp["validateRegionalEngineOutput"] = validateRegionalEngineOutput;
__mods[21] = __exp;
}

// ===== core/model/currentPrimaryInput/formalInputAdapter.js =====
{
const __exp = Object.create(null);
const { ADAPTER_VERSION, AUTHORITY_VERSION, FORMAL_INPUT_CATALOG } = __mods[17];
const { hashCanonical } = __mods[19];
const { resolveSurfaceSelections } = __mods[20];
const { failure, success } = __mods[18];
const { validateFormalBundleSemantics, validatePrototypeRecordInput } = __mods[21];

const catalogById = new Map(FORMAL_INPUT_CATALOG.map(item => [item.id, item]));
const PLAN_IDS = new Set(FORMAL_INPUT_CATALOG.filter(x => x.disposition === "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT").map(x => x.id));
const TEXT_IDS = new Set(FORMAL_INPUT_CATALOG.filter(x => x.disposition === "TRACE_EXPLANATION_COMPARISON_ONLY").map(x => x.id));

function emptyEntry(item) {
  const status = PLAN_IDS.has(item.id) ? "NOT_SET" : TEXT_IDS.has(item.id) ? "NOT_RECORDED" : "UNKNOWN";
  return { inputId:item.id, technicalName:item.technicalName, status, value:null, unit:null,
    provenance:"UNKNOWN", confidence:"UNKNOWN", sourceField:null, presetVersion:ADAPTER_VERSION,
    numericPermission:item.numericPermission, notes:null };
}

function buildEmptyMap() { return Object.fromEntries(FORMAL_INPUT_CATALOG.map(item => [item.id, emptyEntry(item)])); }
function setEntry(map, id, value, {status="KNOWN", unit=null, provenance="USER", confidence="HIGH", sourceField=null, notes=null}={}) {
  if (!catalogById.has(id)) throw new Error(`Unknown formal input ID ${id}`);
  map[id] = {...map[id], status, value, unit, provenance, confidence, sourceField, notes};
}
function setNull(map,id,status="UNKNOWN",provenance="UNKNOWN",sourceField=null) { setEntry(map,id,null,{status,provenance,confidence:"UNKNOWN",sourceField}); }

function deriveRunSetting(surface) {
  if (!surface?.components?.length) return "UNKNOWN";
  const settings = new Set(surface.components.map(c=>c.runSetting));
  if (settings.size === 1) return [...settings][0];
  return "OUTDOOR_ROUTE";
}

function approximatelyEqual(a,b,tolerance=1e-9){
  return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b));
}

function explicitSectionRepresentsWholeRun(section,sectionCount,wholeDistanceKm){
  if(sectionCount!==1)return false;
  if(Number.isFinite(section.distanceKm)&&Number.isFinite(wholeDistanceKm))return approximatelyEqual(section.distanceKm,wholeDistanceKm);
  if(Number.isFinite(section.sharePercent))return approximatelyEqual(section.sharePercent,100);
  if(section.shareBasis==="DISTANCE"&&Number.isFinite(section.shareValue)&&Number.isFinite(wholeDistanceKm))return approximatelyEqual(section.shareValue,wholeDistanceKm);
  return false;
}

function buildSummarySections(ui, surface) {
  const distance = ui.distanceKm;
  const duration = ui.durationMinutes;
  const steps = ui.steps ?? null;
  const speed = distance && duration ? distance * 1000 / (duration * 60) : null;
  const cadence = steps != null && duration ? steps / duration : null;
  const course = ui.course ?? {};
  if (Array.isArray(course.sections) && course.sections.length) {
    const sectionCount=course.sections.length;
    return course.sections.map((s,i)=>{
      const homogeneousWholeRun=explicitSectionRepresentsWholeRun(s,sectionCount,distance);
      const derivedSectionSpeed=s.distanceKm && s.durationMinutes ? s.distanceKm*1000/(s.durationMinutes*60) : null;
      const derivedSectionCadence=s.steps!=null && s.durationMinutes ? s.steps/s.durationMinutes : null;
      return {
        sectionId:s.sectionId ?? `section-${i+1}`, shareBasis:s.shareBasis ?? "DISTANCE", shareValue:s.shareValue ?? s.distanceKm ?? 1,
        distanceKm:s.distanceKm ?? null, durationMinutes:s.durationMinutes ?? null, steps:s.steps ?? null,
        speedMps:Number.isFinite(s.speedMps) ? s.speedMps : (Number.isFinite(derivedSectionSpeed) ? derivedSectionSpeed : (homogeneousWholeRun ? speed : null)),
        cadenceSpm:Number.isFinite(s.cadenceSpm) ? s.cadenceSpm : (Number.isFinite(derivedSectionCadence) ? derivedSectionCadence : (homogeneousWholeRun ? cadence : null)),
        gradeDirection:s.gradeDirection ?? "UNKNOWN", gradePercent:s.gradePercent ?? null,
        runningFormat:s.runningFormat ?? ui.runningFormat ?? "UNKNOWN",
        surfacePresetKeys:surface.components.map(c=>c.presetKey),
        surfaceComponents:surface.components,
      };
    });
  }
  const gradeKnowledge=course.gradeKnowledge ?? "UNKNOWN";
  if (gradeKnowledge === "KNOWN_SUMMARY") {
    const up=course.uphillSharePercent ?? 0, down=course.downhillSharePercent ?? 0, flat=100-up-down;
    if (flat < -0.01) throw Object.assign(new Error("Grade shares exceed 100"),{code:"SECTION_SHARE_INVALID",path:"course"});
    const defs=[];
    if (up>0) defs.push(["UPHILL",up,course.uphillGradePercent]);
    if (down>0) defs.push(["DOWNHILL",down,course.downhillGradePercent]);
    if (flat>0) defs.push(["FLAT",flat,0]);
    const homogeneousWholeRun=defs.length===1&&approximatelyEqual(defs[0][1],100);
    return defs.map(([dir,share,g],i)=>({sectionId:`section-${i+1}`,shareBasis:"DISTANCE",shareValue:distance*share/100,
      distanceKm:distance*share/100,durationMinutes:homogeneousWholeRun?duration:null,steps:homogeneousWholeRun?steps:null,
      speedMps:homogeneousWholeRun?speed:null,cadenceSpm:homogeneousWholeRun?cadence:null,
      gradeDirection:dir,gradePercent:g??null,runningFormat:ui.runningFormat??"UNKNOWN",surfacePresetKeys:surface.components.map(c=>c.presetKey),surfaceComponents:surface.components}));
  }
  return [{sectionId:"section-1",shareBasis:"DISTANCE",shareValue:distance??1,distanceKm:distance??null,durationMinutes:duration??null,steps,
    speedMps:speed,cadenceSpm:cadence,gradeDirection:gradeKnowledge==="KNOWN_FLAT"?"FLAT":"UNKNOWN",gradePercent:gradeKnowledge==="KNOWN_FLAT"?0:null,
    runningFormat:ui.runningFormat??"UNKNOWN",surfacePresetKeys:surface.components.map(c=>c.presetKey),surfaceComponents:surface.components}];
}

function adaptPrototypeRecord(uiInput, context={}) {
  try {
    const inputIssues = validatePrototypeRecordInput(uiInput);
    if (inputIssues.length) return failure("SCHEMA_INVALID","input.schema_invalid",inputIssues[0].path,{issues:inputIssues});
    if (!uiInput || typeof uiInput !== "object") return failure("SCHEMA_INVALID","input.must_be_object","");
    if (!context.sessionId && !uiInput.sessionId) return failure("SCHEMA_INVALID","session_id.required","context.sessionId");
    if (!uiInput.date) return failure("SCHEMA_INVALID","session_date.required","date");
    if (!["run","rest"].includes(uiInput.activityType)) return failure("SCHEMA_INVALID","activity_type.invalid","activityType");
    if (uiInput.activityType === "run" && (!(uiInput.distanceKm>0) || !(uiInput.durationMinutes>0))) return failure("SCHEMA_INVALID","run.distance_duration.required","distanceKm");
    const map=buildEmptyMap();
    const sessionId=context.sessionId ?? uiInput.sessionId;
    const revision=context.recordRevision ?? 1;
    setEntry(map,"RL-IN-001",uiInput.activityType==="run"?"RUNNING_DAY":"RUNNING_REST_DAY",{provenance:"DERIVED",sourceField:"activityType"});
    setEntry(map,"RL-IN-002",uiInput.date,{sourceField:"date"});
    setEntry(map,"RL-IN-003",uiInput.activityType.toUpperCase(),{sourceField:"activityType"});
    setEntry(map,"RL-IN-004",sessionId,{provenance:"SYSTEM",sourceField:"context.sessionId"});
    setEntry(map,"RL-IN-005",context.sessionSequence??1,{provenance:"SYSTEM",sourceField:"context.sessionSequence"});
    setEntry(map,"RL-IN-007",revision,{provenance:"SYSTEM",sourceField:"context.recordRevision"});
    if (uiInput.memo) setEntry(map,"RL-IN-006",uiInput.memo,{sourceField:"memo"});

    if (uiInput.activityType === "rest") {
      for (const id of ["RL-IN-010","RL-IN-011","RL-IN-012","RL-IN-013","RL-IN-014","RL-IN-015","RL-DV-019","RL-DV-020","RL-DV-021"]) setNull(map,id,"NOT_APPLICABLE","DERIVED");
    } else {
      setEntry(map,"RL-IN-010","VALUE",{provenance:"DERIVED"}); setEntry(map,"RL-IN-011",uiInput.distanceKm,{unit:"km",sourceField:"distanceKm"});
      setEntry(map,"RL-IN-012","VALUE",{provenance:"DERIVED"}); setEntry(map,"RL-IN-013",uiInput.durationMinutes,{unit:"min",sourceField:"durationMinutes"});
      const speed=uiInput.distanceKm*1000/(uiInput.durationMinutes*60), pace=uiInput.durationMinutes/uiInput.distanceKm;
      setEntry(map,"RL-DV-019",speed,{unit:"m/s",provenance:"DERIVED"}); setEntry(map,"RL-DV-020",pace,{unit:"min/km",provenance:"DERIVED"});
      if (Number.isInteger(uiInput.steps) && uiInput.steps>=0) {
        setEntry(map,"RL-IN-014","VALUE",{provenance:"DERIVED"}); setEntry(map,"RL-IN-015",uiInput.steps,{unit:"steps",sourceField:"steps"});
        const prov=uiInput.stepsProvenance==="ESTIMATED"?"MANUAL_ESTIMATE":uiInput.stepsProvenance??"UNKNOWN";
        setEntry(map,"RL-IN-016",prov,{sourceField:"stepsProvenance"});
        if (["DEVICE_MEASURED","DEVICE_SYNCED"].includes(prov)) setEntry(map,"RL-DV-021",uiInput.steps/uiInput.durationMinutes,{unit:"steps/min",provenance:"DERIVED"});
        else setNull(map,"RL-DV-021","UNKNOWN","DERIVED");
      } else {
        setEntry(map,"RL-IN-014","NOT_RECORDED",{provenance:"DERIVED"}); setNull(map,"RL-IN-015","NOT_RECORDED","USER","steps"); setNull(map,"RL-IN-016","UNKNOWN","USER","stepsProvenance"); setNull(map,"RL-DV-021","UNKNOWN","DERIVED");
      }
      setEntry(map,"RL-IN-017",uiInput.runningFormat??"UNKNOWN",{sourceField:"runningFormat"});
    }

    const surfaceResult=resolveSurfaceSelections(uiInput.course?.surfaceSelections);
    if (!surfaceResult.ok) return surfaceResult;
    const surface=surfaceResult.value;
    setEntry(map,"RL-IN-018",deriveRunSetting(surface),{provenance:"DERIVED"});
    if (uiInput.course?.courseId) setEntry(map,"RL-IN-030",uiInput.course.courseId,{sourceField:"course.courseId"});
    if (uiInput.course?.courseName) setEntry(map,"RL-IN-031",uiInput.course.courseName,{sourceField:"course.courseName"});
    const gk=uiInput.course?.gradeKnowledge??"UNKNOWN"; setEntry(map,"RL-IN-032",gk,{sourceField:"course.gradeKnowledge"});
    if (gk==="KNOWN_FLAT") {setEntry(map,"RL-IN-033",0,{unit:"%",provenance:"DERIVED"});setEntry(map,"RL-IN-034",0,{unit:"%",provenance:"DERIVED"});setEntry(map,"RL-DV-035",100,{unit:"%",provenance:"DERIVED"});}
    else if (gk==="KNOWN_SUMMARY") {const up=uiInput.course?.uphillSharePercent??0,down=uiInput.course?.downhillSharePercent??0,flat=100-up-down;if(flat<-.01)return failure("SECTION_SHARE_INVALID","grade.share_sum_invalid","course",{up,down});setEntry(map,"RL-IN-033",up,{unit:"%",sourceField:"course.uphillSharePercent"});setEntry(map,"RL-IN-034",down,{unit:"%",sourceField:"course.downhillSharePercent"});setEntry(map,"RL-DV-035",flat,{unit:"%",provenance:"DERIVED"});if(up>0&&uiInput.course.uphillGradePercent!=null)setEntry(map,"RL-IN-036",uiInput.course.uphillGradePercent,{unit:"%",sourceField:"course.uphillGradePercent"});if(down>0&&uiInput.course.downhillGradePercent!=null)setEntry(map,"RL-IN-037",uiInput.course.downhillGradePercent,{unit:"%",sourceField:"course.downhillGradePercent"});}
    setEntry(map,"RL-IN-038",uiInput.course?.routePattern??"UNKNOWN",{sourceField:"course.routePattern"});
    const sections=uiInput.activityType==="run"?buildSummarySections(uiInput,surface):[];
    setEntry(map,"RL-IN-039",sections,{provenance:"DERIVED",sourceField:"course"});
    setEntry(map,"RL-IN-040",surface.knowledge,{provenance:"DERIVED"});
    if(surface.components.length){setEntry(map,"RL-IN-041",surface.components,{provenance:"PRESET"});setEntry(map,"RL-IN-042",surface.components.length===1?surface.dominant.materialLabel:"MIXED",{provenance:"PRESET"});setEntry(map,"RL-IN-043",surface.dominant.sharePercent,{unit:"%",provenance:"PRESET"});for(const [id,key] of [["RL-IN-044","hardnessLevel"],["RL-IN-045","unevennessLevel"],["RL-IN-046","gripLevel"],["RL-IN-047","sinkLevel"],["RL-IN-048","reboundLevel"],["RL-IN-049","stabilityLevel"],["RL-IN-050","wetSlipState"]]){const value=surface.dominant.propertyProfile[key]; if(value==null||value==="UNKNOWN")setNull(map,id,"UNKNOWN","PRESET");else setEntry(map,id,value,{provenance:surface.dominant.propertyOrigin});}}

    const ss=uiInput.shoeAndStyle??{};
    if(ss.shoeId)setEntry(map,"RL-IN-070",ss.shoeId,{sourceField:"shoeAndStyle.shoeId"});if(ss.shoeLabel)setEntry(map,"RL-IN-071",ss.shoeLabel,{sourceField:"shoeAndStyle.shoeLabel"});
    if(ss.shoeType)setEntry(map,"RL-IN-072",ss.shoeType,{sourceField:"shoeAndStyle.shoeType"});if(ss.shoeSoftness)setEntry(map,"RL-IN-073",ss.shoeSoftness,{sourceField:"shoeAndStyle.shoeSoftness"});
    if(ss.footPlacement)setEntry(map,"RL-IN-080",ss.footPlacement,{sourceField:"shoeAndStyle.footPlacement",confidence:"MODERATE"});if(ss.rhythmStride)setEntry(map,"RL-IN-081",ss.rhythmStride,{sourceField:"shoeAndStyle.rhythmStride"});
    if(Array.isArray(ss.focusTags)&&ss.focusTags.length)setEntry(map,"RL-IN-082",ss.focusTags,{sourceField:"shoeAndStyle.focusTags"});if(ss.note)setEntry(map,"RL-IN-083",ss.note,{sourceField:"shoeAndStyle.note"});

    if(uiInput.rpe!=null){setEntry(map,"RL-IN-090","REPORTED",{provenance:"DERIVED"});setEntry(map,"RL-IN-091",uiInput.rpe,{sourceField:"rpe"});setEntry(map,"RL-IN-092","USER_REPORTED",{provenance:"DERIVED"});}
    else {setEntry(map,"RL-IN-090","NOT_REPORTED",{provenance:"DERIVED"});setNull(map,"RL-IN-091","NOT_RECORDED","USER","rpe");setEntry(map,"RL-IN-092","UNKNOWN",{provenance:"DERIVED"});}

    const br=uiInput.bodyReview??{status:"NOT_REVIEWED",observations:[]}; setEntry(map,"RL-IN-100",br.status,{sourceField:"bodyReview.status"});
    const obs=Array.isArray(br.observations)?br.observations:[]; setEntry(map,"RL-IN-101",obs,{sourceField:"bodyReview.observations"});
    if(obs.length===1){const o=obs[0];setEntry(map,"RL-IN-102",o.bodyAreaId,{sourceField:"bodyReview.observations[0].bodyAreaId"});setEntry(map,"RL-IN-103",o.laterality,{sourceField:"bodyReview.observations[0].laterality"});setEntry(map,"RL-IN-104",o.noticedIntensity,{sourceField:"bodyReview.observations[0].noticedIntensity"});setEntry(map,"RL-IN-105",o.sensationType??"NOT_SELECTED",{sourceField:"bodyReview.observations[0].sensationType"});setEntry(map,"RL-IN-106",o.noticedTiming,{sourceField:"bodyReview.observations[0].noticedTiming"});if(o.note)setEntry(map,"RL-IN-107",o.note,{sourceField:"bodyReview.observations[0].note"});}

    const profile=context.profile??{}; for(const [id,key,unit] of [["RL-IN-113","heightCm","cm"],["RL-IN-114","weightKg","kg"],["RL-IN-115","ageBand",null],["RL-IN-116","sexOrReferenceCategory",null]]) if(profile[key]!=null)setEntry(map,id,profile[key],{unit,provenance:"SNAPSHOT",sourceField:`context.profile.${key}`});
    const plan=uiInput.plan??{}; if(plan.scheduledDate)setEntry(map,"RL-IN-130",plan.scheduledDate,{sourceField:"plan.scheduledDate"});if(plan.planType)setEntry(map,"RL-IN-131",plan.planType,{sourceField:"plan.planType"});if(plan.distanceKm!=null){setEntry(map,"RL-IN-132","VALUE",{provenance:"DERIVED"});setEntry(map,"RL-IN-133",plan.distanceKm,{unit:"km",sourceField:"plan.distanceKm"});}if(plan.durationMinutes!=null){setEntry(map,"RL-IN-134","VALUE",{provenance:"DERIVED"});setEntry(map,"RL-IN-135",plan.durationMinutes,{unit:"min",sourceField:"plan.durationMinutes"});}if(plan.course)setEntry(map,"RL-IN-136",plan.course,{sourceField:"plan.course"});if(plan.note)setEntry(map,"RL-IN-137",plan.note,{sourceField:"plan.note"});if(plan.outcomeStatus)setEntry(map,"RL-IN-138",plan.outcomeStatus,{sourceField:"plan.outcomeStatus"});if(plan.changeReason)setEntry(map,"RL-IN-139",plan.changeReason,{sourceField:"plan.changeReason"});if(plan.actualSessionId)setEntry(map,"RL-IN-140",plan.actualSessionId,{sourceField:"plan.actualSessionId"});

    const inputSnapshotHash=hashCanonical(map);
    return success({schemaVersion:"runload-formal-input-bundle-1.0",authorityVersion:AUTHORITY_VERSION,adapterVersion:ADAPTER_VERSION,
      recordSnapshot:{sessionId,recordRevision:revision,sessionDate:uiInput.date,activityType:uiInput.activityType.toUpperCase(),presetSnapshotVersion:ADAPTER_VERSION,inputSnapshotHash},formalInputs:map},surfaceResult.warnings??[]);
  } catch(error){return failure(error.code??"SCHEMA_INVALID","adapter.failed",error.path??"",{message:error.message});}
}

function validateFormalInputBundle(bundle){
  const issues=[]; if(!bundle||typeof bundle!=="object")return {valid:false,issues:[{code:"SCHEMA_INVALID",messageKey:"bundle.invalid",path:"",details:{}}]};
  const actual=Object.keys(bundle.formalInputs??{}), expected=FORMAL_INPUT_CATALOG.map(x=>x.id);
  for(const id of expected)if(!(id in (bundle.formalInputs??{})))issues.push({code:"MISSING_FORMAL_INPUT_ENTRY",messageKey:"formal_input.missing",path:`formalInputs.${id}`,details:{id}});
  for(const id of actual)if(!catalogById.has(id))issues.push({code:"UNKNOWN_FORMAL_INPUT_ID",messageKey:"formal_input.unknown",path:`formalInputs.${id}`,details:{id}});
  for(const id of actual){const e=bundle.formalInputs[id];if(["UNKNOWN","NOT_RECORDED","NOT_SET","NOT_APPLICABLE"].includes(e.status)&&e.value!==null)issues.push({code:"STATUS_VALUE_CONFLICT",messageKey:"formal_input.status_value_conflict",path:`formalInputs.${id}.value`,details:{status:e.status}});}
  issues.push(...validateFormalBundleSemantics(bundle));
  const uniqueIssues=[...new Map(issues.map(item=>[`${item.code}|${item.path}`,item])).values()];
  return {valid:uniqueIssues.length===0,issues:uniqueIssues};
}
__exp["adaptPrototypeRecord"] = adaptPrototypeRecord;
__exp["validateFormalInputBundle"] = validateFormalInputBundle;
__mods[22] = __exp;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2TraceAdapter.js =====
{
const __exp = Object.create(null);
const { adaptStoredRecordToPrimaryRegionalV2Input, primaryRegionalV2ProfileContext } = __mods[16];
const { adaptPrototypeRecord } = __mods[22];

function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}

function buildPrimaryRegionalV2FormalInputTrace({record,feedback={},sessionSequence=1}={}){
  const uiInput=adaptStoredRecordToPrimaryRegionalV2Input(record,feedback);
  const adapted=adaptPrototypeRecord(uiInput,{sessionId:record.id,sessionSequence,recordRevision:1,profile:primaryRegionalV2ProfileContext(record)});
  if(!adapted.ok)return {ok:false,code:adapted.error?.code||"PRIMARY_TRACE_ADAPTER_FAILED",error:adapted.error||null};
  const bundle=clone(adapted.value);
  bundle.contractOnlyInputs={
    runWalkRunningDistanceKm:record.runningFormat==="RUN_WALK"?Number(record.runWalkRunningDistanceKm)||null:null,
    runWalkRunningDurationMinutes:record.runningFormat==="RUN_WALK"?Number(record.runWalkRunningDurationMinutes)||null:null,
    runWalkRunningSections:record.runningFormat==="RUN_WALK"?clone(record.runWalkRunningSections||[]):[],
  };
  return {ok:true,value:bundle,uiInput};
}
__exp["buildPrimaryRegionalV2FormalInputTrace"] = buildPrimaryRegionalV2FormalInputTrace;
__mods[23] = __exp;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2AppAdapter.js =====
{
const __exp = Object.create(null);
const { RETAINED_INPUTS } = __mods[15];
const { buildPrimaryRegionalV2FormalInputTrace } = __mods[23];

function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function finite(v){return typeof v==='number'&&Number.isFinite(v);}
function speedOf(record={}){const d=Number(record.distanceKm),t=Number(record.durationMinutes);return d>0&&t>0?d*1000/(t*60):null;}
function median(values=[]){const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function normalizeSurfaceCategory(v){const x=String(v||'').toUpperCase();if(x.includes('NATURAL_GRASS'))return 'NATURAL_GRASS';if(x==='PAVED'||x==='ASPHALT')return 'ASPHALT';if(x.includes('TRACK')||x.includes('RUBBER'))return 'RUBBER_TRACK';if(x.includes('TREADMILL'))return 'TREADMILL_BELT';if(x.includes('SOIL'))return 'SOIL';if(x.includes('TRAIL'))return 'TRAIL';if(x.includes('ARTIFICIAL'))return 'ARTIFICIAL_TURF';if(x.includes('SAND'))return 'SAND';return x||'UNKNOWN';}
function surfaceComponentsFromCourse(course={}){const defs=[['pavedPercent','ASPHALT'],['trackPercent','RUBBER_TRACK'],['treadmillPercent','TREADMILL_BELT'],['soilPercent','SOIL'],['trailPercent','TRAIL'],['naturalGrassPercent','NATURAL_GRASS'],['artificialTurfPercent','ARTIFICIAL_TURF'],['sandPercent','SAND']];return defs.flatMap(([k,c])=>{const n=Number(course?.[k]||0);return n>0?[{category:c,sharePercent:n}]:[]});}
function runSettingFromCourse(course={}){const t=Number(course?.treadmillPercent||0),other=['pavedPercent','trackPercent','soilPercent','trailPercent','naturalGrassPercent','artificialTurfPercent','sandPercent'].reduce((s,k)=>s+Number(course?.[k]||0),0);if(t>0&&other===0)return 'TREADMILL';if(other>0&&t===0)return 'OUTDOOR_ROUTE';if(t>0&&other>0)return 'MIXED_SETTING';return null;}
function sectionGradePercent(s={}){const g=Math.abs(Number(s.gradePercent||0));const d=String(s.gradeDirection||'FLAT').toUpperCase();if(d==='UPHILL')return g;if(d==='DOWNHILL')return -g;return 0;}
function mapSections(items=[]){return (Array.isArray(items)?items:[]).map(s=>({sharePercent:s.sharePercent??null,distanceKm:s.distanceKm??null,durationMinutes:s.durationMinutes??null,gradePercent:sectionGradePercent(s),surfaceComponents:(Array.isArray(s.surfaceComponents)?s.surfaceComponents:[]).map(c=>({category:normalizeSurfaceCategory(c.userCategory||c.category),sharePercent:Number(c.sharePercent||0)})),runSetting:null}));}
function strikeObservation(record={}){const raw=String(record.personalContext?.footPlacement||'').toUpperCase();let value=null;if(['HEEL','RFS','REARFOOT'].includes(raw))value='RFS';else if(['FOREFOOT','FFS'].includes(raw))value='FFS';else if(['MIDFOOT','MFS'].includes(raw))value='MFS';return value?{value,provenance:'SELF_REPORTED'}:null;}

function personalHabitualCadenceReference(record={},allRecords=[]){
  if(String(record.runningFormat||'').toUpperCase()!=='CONTINUOUS_RUN')return {value:null,state:'REFERENCE_BUILDING',eligibleCount:0};
  const currentSpeed=speedOf(record);if(!(currentSpeed>0))return {value:null,state:'REFERENCE_BUILDING',eligibleCount:0};
  const sorted=[...(allRecords||[])].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.id||'').localeCompare(String(b.id||'')));
  const idx=sorted.findIndex(x=>x.id===record.id);const prior=idx>=0?sorted.slice(0,idx):sorted.filter(x=>x.id!==record.id&&String(x.date||'')<=String(record.date||''));
  const cadences=[];
  for(const r of prior){
    if(String(r.activityType||'').toLowerCase()!=='run'||String(r.runningFormat||'').toUpperCase()!=='CONTINUOUS_RUN')continue;
    if(!['DEVICE_MEASURED','DEVICE_SYNCED'].includes(String(r.stepsProvenance||'').toUpperCase()))continue;
    const sp=speedOf(r),steps=Number(r.steps),dur=Number(r.durationMinutes);if(!(sp>0&&steps>0&&dur>0))continue;
    if(Math.abs(sp-currentSpeed)>0.10+1e-12)continue;
    cadences.push(steps/dur);
  }
  return cadences.length>=3?{value:median(cadences),state:'MODEL_DERIVED_PERSONAL_REFERENCE',eligibleCount:cadences.length,speedNeighborhoodMps:0.10}:{value:null,state:'REFERENCE_BUILDING',eligibleCount:cadences.length,speedNeighborhoodMps:0.10};
}

function rawRepairValue(name,record={},feedback={}){
  const map={
    weatherState:()=>record.environmentContext?.weather,
    temperatureC:()=>record.environmentContext?.temperatureC,
    windLevel:()=>record.environmentContext?.windSummary,
    environmentNote:()=>record.environmentContext?.environmentNote,
    'equipmentTags[]':()=>record.personalContext?.equipmentTags,
    equipmentNote:()=>record.personalContext?.equipmentNote,
    postRunReflection:()=>record.reflectionContext?.postRunReflection,
    perceivedDifference:()=>record.reflectionContext?.perceivedDifference,
    runningStartDateOrBand:()=>record.bodyProfileSnapshot?.runningStartDateOrBand,
    experienceSelfAssessment:()=>record.bodyProfileSnapshot?.experienceSelfAssessment,
    'runningGoalTags[]':()=>record.bodyProfileSnapshot?.runningGoalTags,
    sleepSummary:()=>record.recoveryContext?.sleepSummary,
    nutritionHydrationSummary:()=>record.recoveryContext?.nutritionHydrationSummary,
    lifestyleNote:()=>record.recoveryContext?.lifestyleNote,
    reflectionKeyPoint:()=>record.reflectionContext?.reflectionKeyPoint,
    nextCheckPoint:()=>record.reflectionContext?.nextCheckPoint,
    consultationTarget:()=>record.consultationContext?.consultationTarget,
    consultationQuestion:()=>record.consultationContext?.consultationQuestion,
    consultationDataSelection:()=>record.consultationContext?.consultationDataSelection,
  };return map[name]?clone(map[name]()):undefined;
}

function buildAppRetainedInputTrace({record,feedback={},sessionSequence=1}={}){
  const currentTrace=buildPrimaryRegionalV2FormalInputTrace({record,feedback,sessionSequence});
  if(!currentTrace.ok)return currentTrace;
  const formal=currentTrace.value?.formalInputs||{};
  const entries=RETAINED_INPUTS.map(d=>{
    const f=formal[d.inputId]||null; let value=f?.value??null; let status=f?.status||'MISSING'; let provenance=f?.provenance||null;
    if(d.traceAction==='CURRENT_APP_CONTEXT_TRACE'){
      const raw=rawRepairValue(d.technicalName,record,feedback);
      if(raw!==undefined&&raw!==null&&!(Array.isArray(raw)&&raw.length===0)&&raw!==''){value=raw;status='KNOWN';provenance='CURRENT_RAW_RECORD_CONTEXT';}
    }
    return {...d,present:status==='KNOWN'||status==='EXPLICIT_UNKNOWN',value,status,provenance,currentFormalInput:f};
  });
  return {ok:true,value:{count:entries.length,entries,runSettingProvenance:'SURFACE_DERIVED',traceVersion:'primary-regional-v2-app-input-trace-v1',formalInputCount:Object.keys(formal).length},uiInput:currentTrace.uiInput};
}

function adaptCurrentRecordToPrimaryRegionalV2({record,allRecords=[]}={}){
  const fmt=String(record.runningFormat||'UNKNOWN').toUpperCase();const course=record.course||{};const ref=personalHabitualCadenceReference(record,allRecords);
  const runWalk=fmt==='RUN_WALK';const sections=mapSections(runWalk?record.runWalkRunningSections:course.sections);
  const target={
    runningFormat:runWalk?'RUN_WALK':fmt==='CONTINUOUS_RUN'?'RUN':fmt,
    distanceKm:Number(record.distanceKm)||null,
    durationMinutes:Number(record.durationMinutes)||null,
    runningDistanceKm:runWalk?Number(record.runWalkRunningDistanceKm)||null:null,
    runningDurationMinutes:runWalk?Number(record.runWalkRunningDurationMinutes)||null:null,
    steps:Number(record.steps)||null,
    stepsProvenance:record.stepsProvenance||'UNKNOWN',
    averageCadenceSpm:(!runWalk&&['DEVICE_MEASURED','DEVICE_SYNCED'].includes(String(record.stepsProvenance||'').toUpperCase())&&Number(record.steps)>0&&Number(record.durationMinutes)>0)?Number(record.steps)/Number(record.durationMinutes):null,
    personalHabitualCadenceSpm:ref.value,
    personalHabitualCadenceReferenceState:ref.state,
    personalHabitualCadenceEligibleCount:ref.eligibleCount,
    segments:sections.length?sections:null,
    uphillSharePercent:sections.length?null:Number(course.upPercent||0),
    downhillSharePercent:sections.length?null:Number(course.downPercent||0),
    uphillGradePercent:sections.length?null:Number(course.upGradePercent||0),
    downhillGradePercent:sections.length?null:Number(course.downGradePercent||0),
    surfaceComponents:sections.length?null:surfaceComponentsFromCourse(course),
    runSetting:runSettingFromCourse(course),
    runSettingProvenance:'SURFACE_DERIVED',
    footStrikeObservation:strikeObservation(record),
    allowR12GrassEnvelope:false,
  };
  return target;
}
__exp["personalHabitualCadenceReference"] = personalHabitualCadenceReference;
__exp["buildAppRetainedInputTrace"] = buildAppRetainedInputTrace;
__exp["adaptCurrentRecordToPrimaryRegionalV2"] = adaptCurrentRecordToPrimaryRegionalV2;
__mods[24] = __exp;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2RegionDefs.js =====
{
const __exp = Object.create(null);
const PRIMARY_REGIONAL_V2_REGION_DEFS = Object.freeze([
  { id:"R01", displayId:"BA-DISP-014", name:"股関節部" },
  { id:"R02", displayId:"BA-DISP-015", name:"殿部" },
  { id:"R03", displayId:"BA-DISP-016", name:"大腿前面" },
  { id:"R04", displayId:"BA-DISP-018", name:"大腿後面" },
  { id:"R05", displayId:"BA-DISP-019", name:"膝蓋大腿関節部" },
  { id:"R06", displayId:"BA-DISP-021", name:"脛骨部" },
  { id:"R07", displayId:"BA-DISP-023", name:"下腿後面" },
  { id:"R08", displayId:"BA-DISP-024", name:"足関節部" },
  { id:"R09", displayId:"BA-DISP-025", name:"アキレス腱部" },
  { id:"R10", displayId:"BA-DISP-027", name:"後足部" },
  { id:"R11", displayId:"BA-DISP-028", name:"足底中部・内側縦足弓" },
  { id:"R12", displayId:"BA-DISP-029", name:"前足部" },
]);
__exp["PRIMARY_REGIONAL_V2_REGION_DEFS"] = PRIMARY_REGIONAL_V2_REGION_DEFS;
__mods[25] = __exp;
}

// ===== core/model/primaryRegionalV2/primaryRegionalV2ResultService.js =====
{
const __exp = Object.create(null);
const { BUILD_ID, REGION_DEFS, calculateRun } = __mods[14];
const { adaptCurrentRecordToPrimaryRegionalV2, buildAppRetainedInputTrace } = __mods[24];
const { PRIMARY_REGIONAL_V2_REGION_DEFS } = __mods[25];

const PRIMARY_REGIONAL_V2_MODEL_VERSION = "runload-primary-regional-reference100-v3.0";
const PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION = "runload-primary-regional-reference100-output-v3.0";
const PRIMARY_REGIONAL_V2_AUTHORITY_VERSION = "RunLoad-Calculation-Engine-V1.2Plus-20260916";
const PRIMARY_REGIONAL_V2_BUILD_ID = BUILD_ID;
const LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION = "runload-primary-regional-v2.0";

const DISPLAY_BY_R = new Map(PRIMARY_REGIONAL_V2_REGION_DEFS.map((d) => [d.id, d]));
const DEF_BY_R = new Map(REGION_DEFS.map((d) => [d.id, d]));
const BASE_SOURCE_BY_R = Object.freeze(Object.fromEntries(REGION_DEFS.map((d) => [d.id, d.baselineSource])));
const SOURCE_REGISTRY = Object.freeze({
  FUKUCHI_2017: { label: "Fukuchi et al. 2017", role: "股関節・足関節の速度応答" },
  GAZENDAM_HOF_2007_FIGURE3_DIGITIZED: { label: "Gazendam & Hof 2007", role: "保存原典Figure 3とTable 3から再現した筋活動経路" },
  GAZENDAM_HOF_2007_TABLE3_NORMALIZED: { label: "Gazendam & Hof 2007", role: "Table 3係数と2.5 m/s正規化で再現した下腿後面筋活動経路" },
  HAGEN_2023: { label: "Hagen et al. 2023", role: "膝蓋大腿関節の速度・相対cadence応答" },
  VAN_HOOREN_2024: { label: "Van Hooren et al. 2024", role: "脛骨・アキレス腱の速度/条件応答" },
  HO_2010: { label: "Ho et al. 2010", role: "足底ピーク圧の速度/上り応答" },
  JIN_2018: { label: "Jin 2018", role: "R01/R08 低速側P2 bridge" },
  LI_2020: { label: "Li 2020", role: "R10-R12 高速側P2 bridge" },
});
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function sanitize(v){return String(v||"").replace(/[^0-9A-Za-z._-]/g,"_");}
function revision(record={}){return String(record.updatedAt||record.createdAt||"");}
function unique(xs=[]){return [...new Set(xs.filter(Boolean).map(String))];}
function evidenceRank(s){return ({DIRECT:0,P1_SOURCE_MODEL_EXTENSION:1,P2_CROSS_SOURCE_BRIDGE:2,EVIDENCE_INSUFFICIENT:9})[String(s||"")]??8;}
function weakest(states=[]){const xs=unique(states);return xs.sort((a,b)=>evidenceRank(b)-evidenceRank(a))[0]||"EVIDENCE_INSUFFICIENT";}
function sourceIdsForRegion(rid, rawResult={}){
  const ids=[BASE_SOURCE_BY_R[rid]];const text=JSON.stringify(rawResult||{});
  if((rid==='R01'||rid==='R08')&&text.includes('JIN_2018'))ids.push('JIN_2018');
  if((rid==='R10'||rid==='R11'||rid==='R12')&&text.includes('LI_2020'))ids.push('LI_2020');
  if((rid==='R05'||rid==='R06'||rid==='R09')&&text.includes('VAN_HOOREN'))ids.push('VAN_HOOREN_2024');
  return unique(ids);
}
function aggregateEvidence(regionAgg={}){return weakest(regionAgg.segmentEvidence||[]);}
function axisRows(rawResult={}, rid){
  const axes=rawResult.axisEstimates||{};
  return Object.entries(axes).map(([axis, byRegion])=>{
    const r=byRegion?.[rid]||{};
    return Object.freeze({axis, value:r.value !== null && r.value !== "" && Number.isFinite(Number(r.value))?Number(r.value):null, valueEnvelope:Array.isArray(r.valueEnvelope)?clone(r.valueEnvelope):null, state:r.state||"UNAVAILABLE", evidenceState:aggregateEvidence(r), unsupportedDistanceKm:Number(r.unsupportedDistanceKm||0)});
  });
}
function buildRows(rawResult={}){
  return REGION_DEFS.map((def)=>{
    const display=DISPLAY_BY_R.get(def.id)||{};
    const agg=rawResult?.regions?.[def.id]||{};
    const value=agg.value !== null && agg.value !== "" && Number.isFinite(Number(agg.value))?Number(agg.value):null;
    const evidenceState=aggregateEvidence(agg);
    const axes=axisRows(rawResult,def.id);
    return Object.freeze({
      regionId:display.displayId||def.id,
      primaryRegionId:def.id,
      regionName:def.name,
      value,
      indexValue:value,
      valueEnvelope:Array.isArray(agg.valueEnvelope)?clone(agg.valueEnvelope):null,
      calculationState:value==null?(Number(agg.unsupportedDistanceKm||0)>0?"PARTIAL":"NOT_CALCULABLE"):"CALCULATED",
      provenance:evidenceState,
      evidenceState,
      evidenceStates:Object.freeze(unique(agg.segmentEvidence||[])),
      unsupportedDistanceKm:Number(agg.unsupportedDistanceKm||0),
      construct:def.construct,
      constructId:`PRIMARY_${def.id}_CONSTRUCT_V2`,
      referenceId:`PRIMARY_${def.id}_REFERENCE_V2`,
      referenceAmountKm:null,
      referenceSpeedMps:def.referenceSpeedMps,
      sourceIds:Object.freeze(sourceIdsForRegion(def.id,rawResult)),
      axisEstimates:Object.freeze(axes),
      optionalApplied:Object.freeze(axes.filter((x)=>x.value!=null).map((x)=>Object.freeze({axis:x.axis,evidenceState:x.evidenceState,value:x.value,valueEnvelope:x.valueEnvelope}))),
      coverageProportion:Number.isFinite(Number(agg.coverageProportion))?Number(agg.coverageProportion):null,
      supportedDistanceKm:Number(agg.supportedDistanceKm||0),
      projectCompositeFlag:def.id==="R11"||def.id==="R12",
      fallback:Object.freeze([]),
    });
  });
}
function bodyMap(rows=[]){return Object.freeze({version:"primary-reference100-v3-bodymap-1.0",regions:Object.freeze(rows.map((r)=>Object.freeze({regionId:r.regionId,primaryRegionId:r.primaryRegionId,regionName:r.regionName,value:r.value,calculationState:r.calculationState})))});}
function comparisonSignatures(record={}){return Object.freeze(Object.fromEntries((record.result?.regions||[]).map((row)=>[row.regionId,Object.freeze({regionId:row.regionId,primaryRegionId:row.primaryRegionId,modelVersion:PRIMARY_REGIONAL_V2_MODEL_VERSION,outputSemanticVersion:PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION,constructId:row.constructId,referenceId:row.referenceId,directDeltaAllowed:true})])));}
function buildPrimaryRegionalV2ComparisonSignature(resultRecord={},rowOrRegionId=null){const id=typeof rowOrRegionId==="string"?rowOrRegionId:rowOrRegionId?.regionId;return resultRecord?.comparison_signatures?.[id]||null;}
function comparePrimaryRegionalV2Signatures(a,b){const same=Boolean(a&&b&&a.modelVersion===b.modelVersion&&a.outputSemanticVersion===b.outputSemanticVersion&&a.regionId===b.regionId&&a.constructId===b.constructId&&a.referenceId===b.referenceId);return Object.freeze({directDeltaAllowed:same,status:same?"COMPARABLE":"INCOMPATIBLE",reason:same?"SAME_REGION_SEMANTIC":"SEMANTIC_OR_MODEL_MISMATCH"});}

function createPrimaryRegionalV2ResultRecord({record,feedback={},sessionSequence=1,allRecords=[]}={}){
  const trace=buildAppRetainedInputTrace({record,feedback,sessionSequence}); if(!trace.ok) return trace;
  const common={id:`primary-reference100-v3-result-${sanitize(record.id)}-${sanitize(revision(record))}`,record_id:record.id,source_record_revision:revision(record),generated_at:new Date().toISOString(),model_version:PRIMARY_REGIONAL_V2_MODEL_VERSION,authority_version:PRIMARY_REGIONAL_V2_AUTHORITY_VERSION,engine_build_version:PRIMARY_REGIONAL_V2_BUILD_ID,output_semantic_version:PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION,input_trace:clone(trace.value),formal_input_snapshot:clone(trace.value),input_snapshot:clone(trace.uiInput),source_registry:SOURCE_REGISTRY};
  if(String(record.activityType||"").toLowerCase()==="rest") return {ok:true,resultRecord:Object.freeze({...common,state:"REST",engine_input_snapshot:null,result:null,body_map_payload:Object.freeze({version:"primary-reference100-v3-bodymap-1.0",regions:Object.freeze([])}),comparison_signatures:Object.freeze({})})};
  const engineInput=adaptCurrentRecordToPrimaryRegionalV2({record,allRecords});
  const raw=calculateRun(engineInput);
  const rows=buildRows(raw);
  const result=Object.freeze({state:raw.state||"UNAVAILABLE",courseState:raw.courseState||null,combinedConditionState:raw.combinedConditionState||null,model_version:PRIMARY_REGIONAL_V2_MODEL_VERSION,outputSemanticVersion:PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION,exposure:clone(raw.exposure||null),regions:Object.freeze(rows),axisEstimates:clone(raw.axisEstimates||{}),rawEngineState:raw.state||null});
  const base={...common,state:"RUN",engine_input_snapshot:clone(engineInput),result,body_map_payload:bodyMap(rows),comparison_signatures:null};
  base.comparison_signatures=comparisonSignatures(base);
  return {ok:true,resultRecord:Object.freeze(base)};
}
function validatePrimaryRegionalV2ResultRecord(item={}){
  const issues=[];
  if(item.model_version!==PRIMARY_REGIONAL_V2_MODEL_VERSION)issues.push("MODEL_VERSION");
  if(item.output_semantic_version!==PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION)issues.push("OUTPUT_SEMANTIC_VERSION");
  if(!item.id||!item.record_id)issues.push("IDENTITY");
  if(item.input_trace?.count!==93||!Array.isArray(item.input_trace?.entries)||item.input_trace.entries.length!==93)issues.push("INPUT_TRACE_93_REQUIRED");
  const repairs=(item.input_trace?.entries||[]).filter((x)=>x.traceAction==="CURRENT_APP_CONTEXT_TRACE");
  if(repairs.length!==19)issues.push("TRACE_APP_CONTEXT_19_REQUIRED");
  if(item.state==="REST")return Object.freeze({valid:issues.length===0,issues:Object.freeze(issues)});
  const rows=item.result?.regions;
  if(!Array.isArray(rows)||rows.length!==12)issues.push("REGION_COUNT_12");
  if(!Array.isArray(item.body_map_payload?.regions)||item.body_map_payload.regions.length!==12)issues.push("BODY_MAP_COUNT_12");
  for(const row of Array.isArray(rows)?rows:[]){if(!row.regionId||!row.constructId||!row.referenceId)issues.push(`REGION_IDENTITY:${row.regionId||"UNKNOWN"}`);if(row.value!=null&&!Number.isFinite(Number(row.value)))issues.push(`NONFINITE_VALUE:${row.regionId}`);}
  return Object.freeze({valid:issues.length===0,issues:Object.freeze(issues)});
}
function upsertPrimaryRegionalV2ResultRecord(items=[],resultRecord){const next=(Array.isArray(items)?items:[]).filter((x)=>x.id!==resultRecord.id&&!(x.record_id===resultRecord.record_id&&x.source_record_revision===resultRecord.source_record_revision&&x.model_version===PRIMARY_REGIONAL_V2_MODEL_VERSION));next.push(resultRecord);return next.sort((a,b)=>String(a.record_id).localeCompare(String(b.record_id))||String(a.source_record_revision).localeCompare(String(b.source_record_revision))||String(a.id).localeCompare(String(b.id)));}
__exp["PRIMARY_REGIONAL_V2_MODEL_VERSION"] = PRIMARY_REGIONAL_V2_MODEL_VERSION;
__exp["LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION"] = LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION;
__exp["PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION"] = PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION;
__exp["PRIMARY_REGIONAL_V2_AUTHORITY_VERSION"] = PRIMARY_REGIONAL_V2_AUTHORITY_VERSION;
__exp["PRIMARY_REGIONAL_V2_BUILD_ID"] = PRIMARY_REGIONAL_V2_BUILD_ID;
__exp["buildPrimaryRegionalV2ComparisonSignature"] = buildPrimaryRegionalV2ComparisonSignature;
__exp["comparePrimaryRegionalV2Signatures"] = comparePrimaryRegionalV2Signatures;
__exp["createPrimaryRegionalV2ResultRecord"] = createPrimaryRegionalV2ResultRecord;
__exp["validatePrimaryRegionalV2ResultRecord"] = validatePrimaryRegionalV2ResultRecord;
__exp["upsertPrimaryRegionalV2ResultRecord"] = upsertPrimaryRegionalV2ResultRecord;
__mods[26] = __exp;
}

// ===== core/storage/modelResultRegionalV2Repository.js =====
{
const __exp = Object.create(null);
const { PRIMARY_REGIONAL_V2_MODEL_VERSION, LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION } = __mods[26];
const { createCollectionRepository } = __mods[10];
const { STORAGE_KEYS } = __mods[1];

function normalize(item = {}) {
  if (!item || typeof item !== "object" || ![PRIMARY_REGIONAL_V2_MODEL_VERSION, LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION].includes(item.model_version) || !item.id || !item.record_id) return null;
  return Object.freeze({ ...item, id: String(item.id), record_id: String(item.record_id), source_record_revision: String(item.source_record_revision || ""), generated_at: String(item.generated_at || "") });
}
function sort(items) { return [...items].sort((a,b)=>a.record_id.localeCompare(b.record_id)||a.source_record_revision.localeCompare(b.source_record_revision)||a.id.localeCompare(b.id)); }
function createModelResultRegionalV2Repository(gateway) {
  const repo=createCollectionRepository({gateway,storageKey:STORAGE_KEYS.modelResultsRegionalV2,normalizeItem:normalize,getItemId:x=>x.id,sortItems:sort});
  function loadForRecord(recordId){return repo.loadAll().filter(x=>x.record_id===recordId);}
  function findLatestForRecord(recordId){return loadForRecord(recordId).sort((a,b)=>b.source_record_revision.localeCompare(a.source_record_revision)||b.generated_at.localeCompare(a.generated_at)||b.id.localeCompare(a.id))[0]||null;}
  function latestByRecord(){const map=new Map();repo.loadAll().forEach(x=>{const cur=map.get(x.record_id);if(!cur||x.source_record_revision>cur.source_record_revision||(x.source_record_revision===cur.source_record_revision&&x.id>cur.id))map.set(x.record_id,x);});return map;}
  return Object.freeze({...repo,loadForRecord,findLatestForRecord,latestByRecord});
}
__exp["createModelResultRegionalV2Repository"] = createModelResultRegionalV2Repository;
__mods[27] = __exp;
}

// ===== core/model/v27/bodyAreaTaxonomy.js =====
{
const __exp = Object.create(null);
const BODY_AREA_GROUPS = Object.freeze([
  Object.freeze({ id: "TRUNK", label: "頭・体幹" }),
  Object.freeze({ id: "UPPER_LIMB", label: "上肢" }),
  Object.freeze({ id: "HIP_THIGH", label: "股関節・大腿" }),
  Object.freeze({ id: "KNEE_LOWER_LEG", label: "膝・下腿・足関節" }),
  Object.freeze({ id: "FOOT", label: "足部" }),
]);

const BODY_AREA_LATERALITY = Object.freeze({
  unknown: "UNKNOWN",
  left: "LEFT",
  right: "RIGHT",
  bilateral: "BILATERAL",
});

const BODY_AREA_LATERALITY_LABELS = Object.freeze({
  UNKNOWN: "左右不明",
  LEFT: "左",
  RIGHT: "右",
  BILATERAL: "両側",
});

const BODY_AREA_TAXONOMY = Object.freeze([
  Object.freeze({ id: "BA-010", key: "ba_010", label: "頭", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-020", key: "ba_020", label: "首", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-030", key: "ba_030", label: "胸", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-040", key: "ba_040", label: "上背部", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-050", key: "ba_050", label: "腹部", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-060", key: "ba_060", label: "腰・下背部", groupId: "TRUNK", modelRegionId: "R01" }),
  Object.freeze({ id: "BA-100", key: "ba_100", label: "肩", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-110", key: "ba_110", label: "上腕", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-120", key: "ba_120", label: "肘", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-130", key: "ba_130", label: "前腕", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-140", key: "ba_140", label: "手首", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-150", key: "ba_150", label: "手", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BFR-200-ING", key: "bfr_200_ing", label: "ももの付け根の前側", groupId: "HIP_THIGH", modelRegionId: "R02" }),
  Object.freeze({ id: "BFR-200-COX", key: "bfr_200_cox", label: "股関節の外側周辺", groupId: "HIP_THIGH", modelRegionId: "R02" }),
  Object.freeze({ id: "BFR-210-GLU", key: "bfr_210_glu", label: "お尻", groupId: "HIP_THIGH", modelRegionId: "R02" }),
  Object.freeze({ id: "BFR-220-ANT", key: "bfr_220_ant", label: "太ももの前側", groupId: "HIP_THIGH", modelRegionId: "R03" }),
  Object.freeze({ id: "BFR-220-POST", key: "bfr_220_post", label: "太ももの後ろ側", groupId: "HIP_THIGH", modelRegionId: "R04" }),
  Object.freeze({ id: "BFR-230-ANT", key: "bfr_230_ant", label: "膝の前側", groupId: "KNEE_LOWER_LEG", modelRegionId: "R05" }),
  Object.freeze({ id: "BFR-230-POST", key: "bfr_230_post", label: "膝の後ろ・膝窩周辺", groupId: "KNEE_LOWER_LEG", modelRegionId: "R05" }),
  Object.freeze({ id: "BFR-240-ANT", key: "bfr_240_ant", label: "すね側", groupId: "KNEE_LOWER_LEG", modelRegionId: "R06" }),
  Object.freeze({ id: "BFR-240-POST", key: "bfr_240_post", label: "ふくらはぎ側", groupId: "KNEE_LOWER_LEG", modelRegionId: "R07" }),
  Object.freeze({ id: "BFR-250-ANT", key: "bfr_250_ant", label: "足首の前側", groupId: "KNEE_LOWER_LEG", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-250-POST", key: "bfr_250_post", label: "足首の後ろ", groupId: "KNEE_LOWER_LEG", modelRegionId: "R07" }),
  Object.freeze({ id: "BFR-260-DOR", key: "bfr_260_dor", label: "足の甲", groupId: "FOOT", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-260-REAR", key: "bfr_260_rear", label: "踵・足底の後方", groupId: "FOOT", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-260-MID", key: "bfr_260_mid", label: "足裏の中央・土踏まず周辺", groupId: "FOOT", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-260-FORE", key: "bfr_260_fore", label: "足裏の前方", groupId: "FOOT", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-260-TOE", key: "bfr_260_toe", label: "足の指", groupId: "FOOT", modelRegionId: "R08" }),
]);

const BODY_AREA_BY_ID = Object.freeze(Object.fromEntries(
  BODY_AREA_TAXONOMY.map((area) => [area.id, area]),
));

const BODY_AREA_BY_KEY = Object.freeze(Object.fromEntries(
  BODY_AREA_TAXONOMY.map((area) => [area.key, area]),
));

function normalizeBodyAreaObservations(source = []) {
  if (!Array.isArray(source)) return Object.freeze([]);
  const byId = new Map();
  source.forEach((item) => {
    const area = BODY_AREA_BY_ID[String(item?.areaId || "")];
    const intensity = Number(item?.intensity);
    if (!area || !Number.isInteger(intensity) || intensity < 1 || intensity > 5) return;
    const requestedLaterality = String(item?.laterality || item?.side || "UNKNOWN").toUpperCase();
    const laterality = Object.values(BODY_AREA_LATERALITY).includes(requestedLaterality)
      ? requestedLaterality
      : BODY_AREA_LATERALITY.unknown;
    byId.set(area.id, Object.freeze({
      areaId: area.id,
      label: area.label,
      groupId: area.groupId,
      modelRegionId: area.modelRegionId,
      intensity,
      laterality,
      sensationType: String(item?.sensationType || "NOT_SELECTED"),
      noticedTiming: String(item?.noticedTiming || "UNKNOWN"),
      note: String(item?.note || ""),
    }));
  });
  return Object.freeze(BODY_AREA_TAXONOMY
    .filter((area) => byId.has(area.id))
    .map((area) => byId.get(area.id)));
}

function bodyAreaLateralityLabel(value = "UNKNOWN") {
  return BODY_AREA_LATERALITY_LABELS[String(value || "UNKNOWN").toUpperCase()]
    || BODY_AREA_LATERALITY_LABELS.UNKNOWN;
}
__exp["BODY_AREA_GROUPS"] = BODY_AREA_GROUPS;
__exp["BODY_AREA_LATERALITY"] = BODY_AREA_LATERALITY;
__exp["BODY_AREA_LATERALITY_LABELS"] = BODY_AREA_LATERALITY_LABELS;
__exp["BODY_AREA_TAXONOMY"] = BODY_AREA_TAXONOMY;
__exp["BODY_AREA_BY_ID"] = BODY_AREA_BY_ID;
__exp["BODY_AREA_BY_KEY"] = BODY_AREA_BY_KEY;
__exp["normalizeBodyAreaObservations"] = normalizeBodyAreaObservations;
__exp["bodyAreaLateralityLabel"] = bodyAreaLateralityLabel;
__mods[28] = __exp;
}

// ===== core/safety/supportDecision.js =====
{
const __exp = Object.create(null);
const SUPPORT_ROUTES = Object.freeze(["normal", "review", "consult", "urgent"]);
const SUPPORT_RULE_VERSION = "support-rules-v2";
const SUPPORT_DATA_VERSION = "support-data-v2";

const SAFETY_FLAG_KEYS = Object.freeze([
  "severePain",
  "significantSwelling",
  "cannotBearWeight",
  "movementDifficulty",
  "numbnessOrWeakness",
  "coldPaleBlueLimb",
  "deformityOrMajorTrauma",
  "painAtRestOrNight",
  "chestPainOrPressure",
  "breathingDifficulty",
  "faintingOrConfusion",
  "heavyBleeding",
]);

const URGENT_SAFETY_FLAGS = Object.freeze([
  "chestPainOrPressure",
  "breathingDifficulty",
  "faintingOrConfusion",
  "heavyBleeding",
  "deformityOrMajorTrauma",
]);

const CONSULT_SAFETY_FLAGS = Object.freeze([
  "severePain",
  "significantSwelling",
  "cannotBearWeight",
  "movementDifficulty",
  "numbnessOrWeakness",
  "coldPaleBlueLimb",
  "painAtRestOrNight",
]);

const SUPPORT_BLOCKS = Object.freeze({
  normalPlanSuggestions: "normal_plan_suggestions",
});

const SUPPORT_NEXT_ACTIONS = Object.freeze({
  continue: "continue_normal_flow",
  reviewInput: "review_subjective_input",
  openConsultationMemo: "open_consultation_memo",
  editSubjective: "edit_subjective",
  checkOfficialHelp: "check_official_help",
});

const FLAG_REASON_CODES = Object.freeze({
  severePain: "safety_severe_pain_reported",
  significantSwelling: "safety_significant_swelling_reported",
  cannotBearWeight: "safety_cannot_bear_weight_reported",
  movementDifficulty: "safety_movement_difficulty_reported",
  numbnessOrWeakness: "safety_numbness_or_weakness_reported",
  coldPaleBlueLimb: "safety_cold_pale_blue_limb_reported",
  deformityOrMajorTrauma: "safety_deformity_or_major_trauma_reported",
  painAtRestOrNight: "safety_pain_at_rest_or_night_reported",
  chestPainOrPressure: "safety_chest_pain_or_pressure_reported",
  breathingDifficulty: "safety_breathing_difficulty_reported",
  faintingOrConfusion: "safety_fainting_or_confusion_reported",
  heavyBleeding: "safety_heavy_bleeding_reported",
});


function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function evaluateSupportDecision(input = {}) {
  const feedback = input.feedback && typeof input.feedback === "object" ? input.feedback : input;
  const planOutcome = input.planOutcome && typeof input.planOutcome === "object" ? input.planOutcome : {};
  const sourceFlags = feedback.safetyFlags && typeof feedback.safetyFlags === "object"
    ? feedback.safetyFlags
    : {};
  const safetyFlags = Object.fromEntries(
    SAFETY_FLAG_KEYS.map((key) => [key, Boolean(sourceFlags[key])]),
  );
  const activeSafetyFlags = SAFETY_FLAG_KEYS.filter((key) => safetyFlags[key]);
  const safetyCheckStatus = activeSafetyFlags.length
    ? "reported"
    : ["not_asked", "none_reported", "reported"].includes(String(feedback.safetyCheck?.status || ""))
      ? String(feedback.safetyCheck.status)
      : "not_asked";

  const urgentReasons = URGENT_SAFETY_FLAGS
    .filter((key) => safetyFlags[key])
    .map((key) => FLAG_REASON_CODES[key]);
  const consultReasons = CONSULT_SAFETY_FLAGS
    .filter((key) => safetyFlags[key])
    .map((key) => FLAG_REASON_CODES[key]);
  if (String(planOutcome.reason || "") === "strong_pain") {
    consultReasons.push("plan_change_strong_pain");
  }

  const reviewReasons = [];
  const subjectiveStatus = String(feedback.subjectiveCheck?.status || feedback.checkStatus || "");
  if (Boolean(feedback.unexpectedSymptom ?? feedback.symptomContext?.hasUnexpectedSymptom)) {
    reviewReasons.push("unexpected_symptom_reported");
  }

  let route = "normal";
  let routeReasons = ["no_subjective_concern"];
  if (urgentReasons.length) {
    route = "urgent";
    routeReasons = urgentReasons;
  } else if (consultReasons.length) {
    route = "consult";
    routeReasons = consultReasons;
  } else if (reviewReasons.length) {
    route = "review";
    routeReasons = reviewReasons;
  }

  let safetyContextReason = "safety_check_not_asked";
  if (safetyCheckStatus === "none_reported") safetyContextReason = "safety_check_none_reported";
  if (safetyCheckStatus === "reported" && activeSafetyFlags.length) safetyContextReason = "safety_check_reported";
  if (safetyCheckStatus === "reported" && !activeSafetyFlags.length) safetyContextReason = "safety_check_reported_without_active_flag";

  const contextReasons = [safetyContextReason];
  const blocks = ["consult", "urgent"].includes(route)
    ? [SUPPORT_BLOCKS.normalPlanSuggestions]
    : [];
  const nextActions = route === "urgent"
    ? [SUPPORT_NEXT_ACTIONS.checkOfficialHelp, SUPPORT_NEXT_ACTIONS.openConsultationMemo, SUPPORT_NEXT_ACTIONS.editSubjective]
    : route === "consult"
      ? [SUPPORT_NEXT_ACTIONS.openConsultationMemo, SUPPORT_NEXT_ACTIONS.editSubjective]
      : route === "review"
        ? [SUPPORT_NEXT_ACTIONS.reviewInput, SUPPORT_NEXT_ACTIONS.continue]
        : [SUPPORT_NEXT_ACTIONS.continue];

  return Object.freeze({
    route,
    reasons: Object.freeze(unique([...routeReasons, ...contextReasons])),
    routeReasons: Object.freeze(unique(routeReasons)),
    contextReasons: Object.freeze(unique(contextReasons)),
    blocks: Object.freeze(blocks),
    nextActions: Object.freeze(nextActions),
    safetyCheckStatus,
    activeSafetyFlags: Object.freeze(activeSafetyFlags),
    ruleVersion: SUPPORT_RULE_VERSION,
    modelInputUsed: false,
    qaSupportAffectsDecision: false,
  });
}

function shouldBlockNormalPlanSuggestions(decision = {}) {
  return Array.isArray(decision.blocks)
    && decision.blocks.includes(SUPPORT_BLOCKS.normalPlanSuggestions);
}

function shouldPrioritizeOfficialHelp(decision = {}) {
  return String(decision.route || "") === "urgent"
    && Array.isArray(decision.nextActions)
    && decision.nextActions.includes(SUPPORT_NEXT_ACTIONS.checkOfficialHelp);
}
__exp["SUPPORT_ROUTES"] = SUPPORT_ROUTES;
__exp["SUPPORT_RULE_VERSION"] = SUPPORT_RULE_VERSION;
__exp["SUPPORT_DATA_VERSION"] = SUPPORT_DATA_VERSION;
__exp["SAFETY_FLAG_KEYS"] = SAFETY_FLAG_KEYS;
__exp["URGENT_SAFETY_FLAGS"] = URGENT_SAFETY_FLAGS;
__exp["CONSULT_SAFETY_FLAGS"] = CONSULT_SAFETY_FLAGS;
__exp["SUPPORT_BLOCKS"] = SUPPORT_BLOCKS;
__exp["SUPPORT_NEXT_ACTIONS"] = SUPPORT_NEXT_ACTIONS;
__exp["evaluateSupportDecision"] = evaluateSupportDecision;
__exp["shouldBlockNormalPlanSuggestions"] = shouldBlockNormalPlanSuggestions;
__exp["shouldPrioritizeOfficialHelp"] = shouldPrioritizeOfficialHelp;
__mods[29] = __exp;
}

// ===== core/safety/subjectiveFeedback.js =====
{
const __exp = Object.create(null);
const { normalizeBodyAreaObservations } = __mods[28];
const { normalizePlainText, normalizeSingleLineText } = __mods[6];
const { evaluateSupportDecision, SAFETY_FLAG_KEYS } = __mods[29];

const SUBJECTIVE_CHECK_STATUSES = Object.freeze([
  "not_asked",
  "deferred",
  "none_reported",
  "discomfort_reported",
  "strong_reported",
]);

function normalizeSafetyFlags(source = {}) {
  return Object.freeze(Object.fromEntries(
    SAFETY_FLAG_KEYS.map((key) => [key, Boolean(source[key])]),
  ));
}

function inferSubjectiveCheckStatus(feedback = {}, explicitStatus = "") {
  const hasSafetyFlag = SAFETY_FLAG_KEYS.some((key) => Boolean(feedback.safetyFlags?.[key]));
  if (hasSafetyFlag || Boolean(feedback.unexpectedSymptom ?? feedback.symptomContext?.hasUnexpectedSymptom)) {
    return "strong_reported";
  }
  if (normalizeBodyAreaObservations(feedback.bodyAreaObservations).length) {
    return "discomfort_reported";
  }
  const normalizedExplicitStatus = String(explicitStatus || "");
  if (SUBJECTIVE_CHECK_STATUSES.includes(normalizedExplicitStatus)) return normalizedExplicitStatus;
  if (feedback.safetyCheck?.status === "none_reported") return "none_reported";
  return "not_asked";
}

function normalizeSubjectiveFeedback(input = {}, context = {}) {
  const safetyFlags = normalizeSafetyFlags(input.safetyFlags || {});
  const hasActiveSafetyFlag = SAFETY_FLAG_KEYS.some((key) => safetyFlags[key]);
  const unexpectedSymptom = Boolean(
    input.unexpectedSymptom ?? input.symptomContext?.hasUnexpectedSymptom,
  );
  const bodyAreaObservations = normalizeBodyAreaObservations(input.bodyAreaObservations);
  const checkStatus = inferSubjectiveCheckStatus({
    bodyAreaObservations,
    unexpectedSymptom,
    safetyFlags,
    safetyCheck: input.safetyCheck,
  }, input.checkStatus || input.subjectiveCheck?.status);
  const safetyCheckStatus = hasActiveSafetyFlag
    ? "reported"
    : ["not_asked", "none_reported", "reported"].includes(String(input.safetyCheck?.status || ""))
      ? String(input.safetyCheck.status)
      : "not_asked";

  const normalized = {
    recordId: normalizeSingleLineText(input.recordId, 100),
    date: String(input.date || "").slice(0, 10),
    checkStatus,
    checkedAt: normalizeSingleLineText(input.checkedAt || input.subjectiveCheck?.checkedAt, 40),
    bodyAreaObservations,
    consultationNote: normalizePlainText(input.consultationNote, 500),
    unexpectedSymptom,
    symptomContext: Object.freeze({
      timing: normalizeSingleLineText(input.symptomContext?.timing, 40),
      startedWhen: normalizeSingleLineText(input.symptomContext?.startedWhen, 40),
      triggers: Object.freeze(
        Array.from(new Set(Array.isArray(input.symptomContext?.triggers)
          ? input.symptomContext.triggers.map((value) => normalizeSingleLineText(value, 40)).filter(Boolean)
          : [])).slice(0, 6),
      ),
      note: normalizePlainText(input.symptomContext?.note, 320),
    }),
    safetyFlags,
    safetyCheck: Object.freeze({
      status: safetyCheckStatus,
      checkedAt: normalizeSingleLineText(input.safetyCheck?.checkedAt, 40),
    }),
  };
  const supportDecision = evaluateSupportDecision({
    feedback: normalized,
    planOutcome: context.planOutcome || {},
  });

  return Object.freeze({
    ...normalized,
    supportDecisionSnapshot: supportDecision,
  });
}
__exp["SUBJECTIVE_CHECK_STATUSES"] = SUBJECTIVE_CHECK_STATUSES;
__exp["normalizeSafetyFlags"] = normalizeSafetyFlags;
__exp["inferSubjectiveCheckStatus"] = inferSubjectiveCheckStatus;
__exp["normalizeSubjectiveFeedback"] = normalizeSubjectiveFeedback;
__mods[30] = __exp;
}

// ===== core/storage/subjectiveFeedbackRepository.js =====
{
const __exp = Object.create(null);
const { normalizeSubjectiveFeedback } = __mods[30];
const { createCollectionRepository } = __mods[10];
const { STORAGE_KEYS } = __mods[1];

function createSubjectiveFeedbackRepository(gateway) {
  const repository = createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.subjectiveFeedback,
    normalizeItem: (item) => normalizeSubjectiveFeedback(item, {
      planOutcome: item.planOutcome || {},
    }),
    getItemId: (item) => item.recordId || `feedback-${item.date}`,
    sortItems: (items) => [...items].sort((left, right) => (
      left.date.localeCompare(right.date) || left.recordId.localeCompare(right.recordId)
    )),
  });

  function findByRecordId(recordId) {
    return repository.loadAll().find((feedback) => feedback.recordId === recordId) || null;
  }

  function save(feedback, context = {}) {
    const normalized = normalizeSubjectiveFeedback(feedback, context);
    if (!normalized.recordId && !normalized.date) {
      return { ok: false, code: "SUBJECTIVE_FEEDBACK_TARGET_REQUIRED", item: null };
    }
    return repository.upsert(normalized);
  }

  return Object.freeze({
    loadAll: repository.loadAll,
    loadAllResult: repository.loadAllResult,
    findByRecordId,
    save,
    removeById: repository.removeById,
  });
}
__exp["createSubjectiveFeedbackRepository"] = createSubjectiveFeedbackRepository;
__mods[31] = __exp;
}

// ===== core/storage/planRepository.js =====
{
const __exp = Object.create(null);
const { INPUT_LIMITS, normalizePlainText, normalizeSingleLineText } = __mods[6];
const { createCollectionRepository } = __mods[10];
const { STORAGE_KEYS } = __mods[1];

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeCourse(course = {}) {
  const source = course && typeof course === "object" ? course : {};
  const gradeKnowledge = String(source.gradeKnowledge || "UNKNOWN").toUpperCase();
  const modelSurfaceClass = String(source.modelSurfaceClass || "UNKNOWN").toUpperCase();
  return Object.freeze({
    ...clone(source),
    name: normalizeSingleLineText(source.name, 80),
    gradeKnowledge: ["UNKNOWN", "KNOWN_FLAT", "KNOWN_PROFILE"].includes(gradeKnowledge)
      ? gradeKnowledge
      : "UNKNOWN",
    upPercent: finiteNumber(source.upPercent),
    downPercent: finiteNumber(source.downPercent),
    upGradePercent: finiteNumber(source.upGradePercent),
    downGradePercent: finiteNumber(source.downGradePercent),
    modelSurfaceClass: [
      "REF_HARD_EVEN_STABLE",
      "DRY_STABLE_GRASS_TURF",
      "DEEP_DRY_SOFT_SAND",
      "EXPLICIT_UNEVEN",
      "KNOWN_OTHER",
      "UNKNOWN",
    ].includes(modelSurfaceClass) ? modelSurfaceClass : "UNKNOWN",
  });
}

function normalizeSession(session = {}, planType = "run") {
  const source = session && typeof session === "object" ? session : {};
  const cloned = clone(source);
  delete cloned.steps;
  delete cloned.stepsProvenance;
  delete cloned.perceivedExertion;
  delete cloned.rpeProvenance;
  const runningFormat = String(source.runningFormat || "UNKNOWN").toUpperCase();
  const rawSteps = source.steps;
  const hasSteps = planType !== "rest"
    && rawSteps !== ""
    && rawSteps != null
    && Number.isFinite(Number(rawSteps))
    && Number(rawSteps) > 0;
  const rawRpe = source.perceivedExertion;
  const hasRpe = rawRpe !== "" && rawRpe != null && Number.isFinite(Number(rawRpe));
  return Object.freeze({
    ...cloned,
    activityType: planType,
    distanceKm: planType === "rest" ? 0 : finiteNumber(source.distanceKm),
    durationMinutes: planType === "rest" ? 0 : finiteNumber(source.durationMinutes),
    runningFormat: planType === "rest"
      ? "NOT_APPLICABLE"
      : ["CONTINUOUS_RUN", "RUN_WALK", "UNKNOWN"].includes(runningFormat)
        ? runningFormat
        : "UNKNOWN",
    ...(hasSteps ? {
      steps: Math.round(Math.min(INPUT_LIMITS.steps, Number(rawSteps))),
      stepsProvenance: ["DEVICE_MEASURED", "DEVICE_SYNCED", "ESTIMATED", "UNKNOWN"].includes(
        String(source.stepsProvenance || "UNKNOWN").toUpperCase(),
      )
        ? String(source.stepsProvenance || "UNKNOWN").toUpperCase()
        : "UNKNOWN",
    } : {}),
    perceivedExertion: planType === "rest" || !hasRpe
      ? null
      : Math.min(10, Math.max(0, Number(rawRpe))),
    rpeProvenance: planType === "rest" || !hasRpe
      ? "NOT_REPORTED"
      : String(source.rpeProvenance || "USER_REPORTED"),
    course: normalizeCourse(source.course),
  });
}

function normalizePlan(plan = {}) {
  const scheduledDate = String(plan.scheduledDate || plan.date || "").slice(0, 10);
  const id = normalizeSingleLineText(plan.id, 100)
    || `plan-${scheduledDate || "unscheduled"}-001`;
  const planType = String(plan.planType || "run") === "rest" ? "rest" : "run";
  return Object.freeze({
    ...clone(plan),
    id,
    scheduledDate,
    planType,
    title: normalizeSingleLineText(plan.title, 80),
    memo: normalizePlainText(plan.memo, 500),
    plannedSession: normalizeSession(plan.plannedSession, planType),
    sourceRecordId: normalizeSingleLineText(plan.sourceRecordId, 100),
    sourceCandidateId: normalizeSingleLineText(plan.sourceCandidateId, 80) || "custom",
    previewSnapshot: plan.previewSnapshot && typeof plan.previewSnapshot === "object"
      ? clone(plan.previewSnapshot)
      : null,
    previewGeneratedAt: normalizeSingleLineText(plan.previewGeneratedAt, 50),
    outcomeStatus: normalizeSingleLineText(plan.outcomeStatus, 40),
    actualRecordId: normalizeSingleLineText(plan.actualRecordId, 100),
    changeReason: normalizeSingleLineText(plan.changeReason, 60),
    changeReasonNote: normalizePlainText(plan.changeReasonNote, 240),
    createdAt: normalizeSingleLineText(plan.createdAt, 50) || new Date().toISOString(),
    updatedAt: normalizeSingleLineText(plan.updatedAt, 50) || new Date().toISOString(),
  });
}

function createPlanRepository(gateway) {
  return createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.plans,
    normalizeItem: normalizePlan,
    sortItems: (items) => [...items].sort((left, right) => (
      left.scheduledDate.localeCompare(right.scheduledDate)
      || left.id.localeCompare(right.id)
    )),
  });
}
__exp["createPlanRepository"] = createPlanRepository;
__mods[32] = __exp;
}




// ===== core/model/bodyProfileAdjustment.js =====
{
const __exp = Object.create(null);
const { clampNumber, toFiniteNumber } = __mods[5];

// Current profile data is context-only. It does not create a body-size coefficient.
const PERSONAL_PROFILE_SCHEMA_VERSION = 2;
const PERSONAL_PROFILE_NUMERIC_USE = "CONTEXT_ONLY_NO_A4_OR_V27_COEFFICIENT";

const PROFILE_AGE_BAND_OPTIONS = Object.freeze([
  Object.freeze({ key: "18-29", label: "18〜29歳", minAge: 18, maxAge: 29 }),
  Object.freeze({ key: "30-49", label: "30〜49歳", minAge: 30, maxAge: 49 }),
  Object.freeze({ key: "50-64", label: "50〜64歳", minAge: 50, maxAge: 64 }),
  Object.freeze({ key: "65-74", label: "65〜74歳", minAge: 65, maxAge: 74 }),
  Object.freeze({ key: "75+", label: "75歳以上", minAge: 75, maxAge: 130 }),
]);

function normalizeSex(value = "") {
  const text = String(value || "").trim().toLowerCase();
  if (["male", "m", "man", "男性", "男"].includes(text)) return "male";
  if (["female", "f", "woman", "女性", "女"].includes(text)) return "female";
  return "";
}

function normalizeAgeBand(value = "") {
  const text = String(value || "").trim();
  if (PROFILE_AGE_BAND_OPTIONS.some((item) => item.key === text)) return text;
  if (!text) return "";
  const age = Number(text);
  if (!Number.isFinite(age)) return "";
  return PROFILE_AGE_BAND_OPTIONS.find(
    (item) => age >= item.minAge && age <= item.maxAge,
  )?.key || "";
}

function getAgeBandMetadata(ageBand = "") {
  const normalizedAgeBand = normalizeAgeBand(ageBand);
  return PROFILE_AGE_BAND_OPTIONS.find((item) => item.key === normalizedAgeBand) || null;
}

function normalizedOptionalNumber(value, min, max) {
  const number = toFiniteNumber(value, Number.NaN);
  return Number.isFinite(number)
    ? Number(clampNumber(number, min, max).toFixed(1))
    : "";
}

function normalizeBodyProfile(rawProfile = {}) {
  const source = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
  const heightValue = source.heightCm;
  const weightValue = source.weightKg;
  const goals = Array.isArray(source.runningGoalTags)
    ? source.runningGoalTags
    : String(source.runningGoalTags || "").split(",");
  return Object.freeze({
    schemaVersion: PERSONAL_PROFILE_SCHEMA_VERSION,
    numericUse: PERSONAL_PROFILE_NUMERIC_USE,
    sex: normalizeSex(source.sex || ""),
    ageBand: normalizeAgeBand(source.ageBand || ""),
    heightCm: normalizedOptionalNumber(heightValue, 100, 230),
    weightKg: normalizedOptionalNumber(weightValue, 25, 180),
    runningStartDateOrBand: String(source.runningStartDateOrBand || "").trim().slice(0, 80),
    experienceSelfAssessment: String(source.experienceSelfAssessment || "").trim().slice(0, 80),
    runningGoalTags: Object.freeze([...new Set(goals
      .map((item) => String(item || "").trim().slice(0, 80))
      .filter(Boolean))]),
    updatedAt: String(source.updatedAt || "").slice(0, 50),
  });
}

function calculateBodyWeightAdjustment(rawProfile = {}) {
  const profile = normalizeBodyProfile(rawProfile);
  return Object.freeze({
    ready: false,
    profile,
    reference: null,
    referenceWeightKg: "",
    bodyWeightRatio: 1,
    bodyWeightFactor: 1,
    rawBodyWeightFactor: 1,
    formulaVersion: "disabled-current-profile-boundary-v1",
    sourceName: "",
    sourceYear: "",
    message: "プロフィールは見返し・相談・比較条件の文脈に使い、現行の数値計算には使いません。",
  });
}

function createBodyProfileSnapshot(rawProfile = {}, recordedAt = new Date().toISOString()) {
  const profile = normalizeBodyProfile(rawProfile);
  return Object.freeze({
    schemaVersion: PERSONAL_PROFILE_SCHEMA_VERSION,
    numericUse: PERSONAL_PROFILE_NUMERIC_USE,
    sex: profile.sex || "",
    ageBand: profile.ageBand || "",
    heightCm: profile.heightCm || "",
    weightKg: profile.weightKg || "",
    runningStartDateOrBand: profile.runningStartDateOrBand || "",
    experienceSelfAssessment: profile.experienceSelfAssessment || "",
    runningGoalTags: Object.freeze([...(profile.runningGoalTags || [])]),
    recordedAt,
  });
}

function getBodyWeightFactorFromRecord() { return 1; }
__exp["PERSONAL_PROFILE_SCHEMA_VERSION"] = PERSONAL_PROFILE_SCHEMA_VERSION;
__exp["PERSONAL_PROFILE_NUMERIC_USE"] = PERSONAL_PROFILE_NUMERIC_USE;
__exp["PROFILE_AGE_BAND_OPTIONS"] = PROFILE_AGE_BAND_OPTIONS;
__exp["normalizeSex"] = normalizeSex;
__exp["normalizeAgeBand"] = normalizeAgeBand;
__exp["getAgeBandMetadata"] = getAgeBandMetadata;
__exp["normalizeBodyProfile"] = normalizeBodyProfile;
__exp["calculateBodyWeightAdjustment"] = calculateBodyWeightAdjustment;
__exp["createBodyProfileSnapshot"] = createBodyProfileSnapshot;
__exp["getBodyWeightFactorFromRecord"] = getBodyWeightFactorFromRecord;
__mods[36] = __exp;
}

// ===== core/storage/simpleValueRepositories.js =====
{
const __exp = Object.create(null);
const { normalizeBodyProfile } = __mods[36];
const { normalizePlainText } = __mods[6];
const { STORAGE_KEYS } = __mods[1];

function createProfileRepository(gateway) {
  function loadResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.profile, {});
    return result.ok
      ? { ...result, value: normalizeBodyProfile(result.value) }
      : { ...result, code: "STORAGE_PROFILE_READ_FAILED", value: normalizeBodyProfile({}) };
  }
  return Object.freeze({
    load: () => loadResult().value,
    loadResult,
    save: (profile) => gateway.writeJson(STORAGE_KEYS.profile, normalizeBodyProfile(profile)),
    clear: () => gateway.remove(STORAGE_KEYS.profile),
  });
}

function createSettingsRepository(gateway) {
  function loadResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.settings, {});
    const validValue = result.value && typeof result.value === "object" && !Array.isArray(result.value)
      ? result.value
      : {};
    if (!result.ok) return { ...result, code: "STORAGE_SETTINGS_READ_FAILED", value: {} };
    if (validValue !== result.value) return { ok: false, key: STORAGE_KEYS.settings, code: "STORAGE_SETTINGS_INVALID", value: {} };
    return { ...result, value: validValue };
  }
  return Object.freeze({
    load: () => loadResult().value,
    loadResult,
    save: (settings) => gateway.writeJson(STORAGE_KEYS.settings, settings && typeof settings === "object" ? settings : {}),
    clear: () => gateway.remove(STORAGE_KEYS.settings),
  });
}

function createDraftRepository(gateway) {
  function loadResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.draft, null);
    return result.ok
      ? result
      : { ...result, code: "STORAGE_DRAFT_READ_FAILED", value: null };
  }
  return Object.freeze({
    load: () => loadResult().value,
    loadResult,
    save: (draft) => gateway.writeJson(STORAGE_KEYS.draft, draft == null ? null : {
      ...draft,
      memo: normalizePlainText(draft.memo, 500),
      updatedAt: new Date().toISOString(),
    }),
    clear: () => gateway.remove(STORAGE_KEYS.draft),
  });
}
__exp["createProfileRepository"] = createProfileRepository;
__exp["createSettingsRepository"] = createSettingsRepository;
__exp["createDraftRepository"] = createDraftRepository;
__mods[37] = __exp;
}

// ===== core/model/v27/v27Math.js =====
{
const __exp = Object.create(null);
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function requirePositiveFinite(value, name) {
  if (!isFiniteNumber(value) || value <= 0) {
    throw new RangeError(`${name} must be positive and finite`);
  }
}

function approximatelyEqual(left, right, tolerance = 1e-9) {
  return Math.abs(left - right) <= tolerance;
}

function validateV27Shares(shares, tolerance = 0.01) {
  const values = [...shares];
  if (
    values.length === 0
    || values.some((value) => !isFiniteNumber(value) || value < 0 || value > 100)
  ) {
    throw new RangeError("shares must be finite values in [0, 100]");
  }
  const sum = values.reduce((total, value) => total + value, 0);
  if (Math.abs(sum - 100) > tolerance) {
    throw new RangeError("shares must sum to 100; no normalization is allowed");
  }
  return sum;
}

function linearInterpolate(value, xs, ys) {
  const epsilon = 1e-9;
  if (value < xs[0] - epsilon || value > xs.at(-1) + epsilon) {
    throw new RangeError("out of interpolation domain");
  }
  if (Math.abs(value - xs[0]) <= epsilon) return ys[0];
  if (Math.abs(value - xs.at(-1)) <= epsilon) return ys.at(-1);
  for (let index = 0; index < xs.length - 1; index += 1) {
    const left = xs[index];
    const right = xs[index + 1];
    if (left <= value && value <= right) {
      const fraction = (value - left) / (right - left);
      return ys[index] + fraction * (ys[index + 1] - ys[index]);
    }
  }
  throw new Error("unreachable interpolation interval");
}

function median(values) {
  const numeric = [...values].filter(isFiniteNumber).sort((left, right) => left - right);
  if (!numeric.length) throw new RangeError("median requires at least one finite value");
  const middle = Math.floor(numeric.length / 2);
  return numeric.length % 2
    ? numeric[middle]
    : (numeric[middle - 1] + numeric[middle]) / 2;
}

function weightedMean(items) {
  return items.reduce((total, [weight, value]) => total + weight * value, 0);
}

function weightedRearrangementProduct(left, right, sameOrder) {
  const leftWork = [...left]
    .sort((a, b) => a[1] - b[1])
    .map(([weight, value]) => [weight, value]);
  const rightWork = [...right]
    .sort((a, b) => sameOrder ? a[1] - b[1] : b[1] - a[1])
    .map(([weight, value]) => [weight, value]);
  let leftIndex = 0;
  let rightIndex = 0;
  let result = 0;
  const epsilon = 1e-12;

  while (leftIndex < leftWork.length && rightIndex < rightWork.length) {
    const amount = Math.min(leftWork[leftIndex][0], rightWork[rightIndex][0]);
    result += amount * leftWork[leftIndex][1] * rightWork[rightIndex][1];
    leftWork[leftIndex][0] -= amount;
    rightWork[rightIndex][0] -= amount;
    if (leftWork[leftIndex][0] <= epsilon) leftIndex += 1;
    if (rightWork[rightIndex][0] <= epsilon) rightIndex += 1;
  }
  return result;
}
__exp["isFiniteNumber"] = isFiniteNumber;
__exp["requirePositiveFinite"] = requirePositiveFinite;
__exp["approximatelyEqual"] = approximatelyEqual;
__exp["validateV27Shares"] = validateV27Shares;
__exp["linearInterpolate"] = linearInterpolate;
__exp["median"] = median;
__exp["weightedMean"] = weightedMean;
__exp["weightedRearrangementProduct"] = weightedRearrangementProduct;
__mods[38] = __exp;
}

// ===== core/model/v27/v27Model.js =====
{
const __exp = Object.create(null);
const { V27_CADENCE_CURVES, V27_EMPHASIS_REGION_IDS, V27_GRADE_CURVES, V27_MODEL_VERSION, V27_REGIONS, V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG, V27_SPEED_CURVES, V27_SURFACE_FACTORS, V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT } = __mods[12];
const { approximatelyEqual, isFiniteNumber, linearInterpolate, requirePositiveFinite, validateV27Shares, weightedMean, weightedRearrangementProduct } = __mods[38];

function minettiCost(gradeDecimal) {
  const grade = gradeDecimal;
  return (
    155.4 * grade ** 5
    - 30.4 * grade ** 4
    - 43.3 * grade ** 3
    + 46.3 * grade ** 2
    + 19.5 * grade
    + 3.6
  );
}

function calculateV27TotalGradeFactor(gradePercent) {
  if (gradePercent == null) return Object.freeze({ factor: 1, state: "UNKNOWN" });
  if (!isFiniteNumber(gradePercent)) return Object.freeze({ factor: 1, state: "INVALID" });
  if (
    gradePercent < -V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT
    || gradePercent > V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT
  ) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  return Object.freeze({
    factor: minettiCost(gradePercent / 100) / minettiCost(0),
    state: "KNOWN_APPLIED",
  });
}

function validateBaseSession(session) {
  requirePositiveFinite(session.distance_km, "distance_km");
  requirePositiveFinite(session.active_minutes, "active_minutes");
  if (
    session.rpe != null
    && (!isFiniteNumber(session.rpe) || session.rpe < 0 || session.rpe > 10)
  ) {
    throw new RangeError("RPE must be blank or in [0, 10]");
  }
}

function validateSections(session) {
  const sections = Array.isArray(session.sections) ? session.sections : [];
  if (!sections.length) return null;
  if (sections.some((section) => (
    !isFiniteNumber(section.distance_km) || section.distance_km <= 0
  ))) {
    throw new RangeError("section distances must be positive and finite");
  }
  const distanceSum = sections.reduce((total, section) => total + section.distance_km, 0);
  if (Math.abs(distanceSum - session.distance_km) > 0.01) {
    throw new RangeError("section distance sum mismatch; no rescaling is allowed");
  }
  return sections;
}

function validateMarginalProfiles(session) {
  const gradeProfile = Array.isArray(session.grade_profile) ? session.grade_profile : [];
  const surfaceProfile = Array.isArray(session.surface_profile) ? session.surface_profile : [];
  validateV27Shares(gradeProfile.map((item) => item.share_pct));
  validateV27Shares(surfaceProfile.map((item) => item.share_pct));
  return { gradeProfile, surfaceProfile };
}

function surfaceFactor(surfaceClass) {
  const entry = V27_SURFACE_FACTORS[surfaceClass];
  if (!entry) throw new RangeError(`unknown surface class: ${surfaceClass}`);
  return entry;
}

function calculateV27TotalFromSections(session) {
  validateBaseSession(session);
  const sections = validateSections(session);
  if (!sections) throw new RangeError("paired sections are required");
  let central = 0;
  let low = 0;
  let high = 0;
  let gradeAppliedDistance = 0;
  let surfaceAppliedDistance = 0;
  const sectionResults = [];

  sections.forEach((section) => {
    const gradeResult = calculateV27TotalGradeFactor(section.grade_pct);
    const surfaceResult = surfaceFactor(section.surface_class);
    if (gradeResult.state === "KNOWN_APPLIED") gradeAppliedDistance += section.distance_km;
    if (surfaceResult.state === "KNOWN_APPLIED") surfaceAppliedDistance += section.distance_km;
    const centralFactor = gradeResult.factor * surfaceResult.central;
    let factorLow;
    let factorHigh;
    if (
      gradeResult.state === "KNOWN_APPLIED"
      && surfaceResult.state === "KNOWN_APPLIED"
      && surfaceResult.central !== 1
    ) {
      const candidates = [
        gradeResult.factor * surfaceResult.low,
        gradeResult.factor * surfaceResult.high,
        Math.max(0, gradeResult.factor + surfaceResult.low - 1),
        Math.max(0, gradeResult.factor + surfaceResult.high - 1),
      ];
      factorLow = Math.min(...candidates);
      factorHigh = Math.max(...candidates);
    } else if (surfaceResult.state === "KNOWN_APPLIED") {
      factorLow = gradeResult.factor * surfaceResult.low;
      factorHigh = gradeResult.factor * surfaceResult.high;
    } else {
      factorLow = gradeResult.factor;
      factorHigh = gradeResult.factor;
    }
    central += 100 * section.distance_km * centralFactor;
    low += 100 * section.distance_km * factorLow;
    high += 100 * section.distance_km * factorHigh;
    sectionResults.push(Object.freeze({
      distance_km: section.distance_km,
      grade_state: gradeResult.state,
      surface_state: surfaceResult.state,
      surface_class: section.surface_class,
      central_factor: centralFactor,
      factor_range: Object.freeze([factorLow, factorHigh]),
    }));
  });

  const widthRatio = central > 0 ? (high - low) / central : 0;
  return Object.freeze({
    model_version: V27_MODEL_VERSION,
    central_points: central,
    range_points: Object.freeze([low, high]),
    show_range_primary: widthRatio > 0.2,
    structural_width_ratio: widthRatio,
    grade_coverage: gradeAppliedDistance / session.distance_km,
    surface_coverage: surfaceAppliedDistance / session.distance_km,
    pairing_state: "PAIRED_ORDERED_SECTIONS",
    sections: Object.freeze(sectionResults),
    is_measured_physical_load: false,
    supports_medical_decision: false,
  });
}

function calculateV27TotalFromMarginalProfiles(session) {
  validateBaseSession(session);
  const { gradeProfile, surfaceProfile } = validateMarginalProfiles(session);
  const gradeItems = [];
  const surfaceCentralItems = [];
  const surfaceLowItems = [];
  const surfaceHighItems = [];
  const gradeStates = [];
  const surfaceStates = [];
  let gradeCoverage = 0;
  let surfaceCoverage = 0;

  gradeProfile.forEach((item) => {
    const result = calculateV27TotalGradeFactor(item.grade_pct);
    const fraction = item.share_pct / 100;
    gradeItems.push([fraction, result.factor]);
    gradeStates.push(result.state);
    if (result.state === "KNOWN_APPLIED") gradeCoverage += fraction;
  });
  surfaceProfile.forEach((item) => {
    const result = surfaceFactor(item.surface_class);
    const fraction = item.share_pct / 100;
    surfaceCentralItems.push([fraction, result.central]);
    surfaceLowItems.push([fraction, result.low]);
    surfaceHighItems.push([fraction, result.high]);
    surfaceStates.push(result.state);
    if (result.state === "KNOWN_APPLIED") surfaceCoverage += fraction;
  });

  const meanGrade = weightedMean(gradeItems);
  const meanSurface = weightedMean(surfaceCentralItems);
  const meanSurfaceLow = weightedMean(surfaceLowItems);
  const meanSurfaceHigh = weightedMean(surfaceHighItems);
  const centralFactor = meanGrade * meanSurface;
  const multiplicativeLow = weightedRearrangementProduct(
    gradeItems,
    surfaceLowItems,
    false,
  );
  const multiplicativeHigh = weightedRearrangementProduct(
    gradeItems,
    surfaceHighItems,
    true,
  );
  const additiveLow = Math.max(0, meanGrade + meanSurfaceLow - 1);
  const additiveHigh = Math.max(0, meanGrade + meanSurfaceHigh - 1);
  const factorLow = Math.min(multiplicativeLow, additiveLow, centralFactor);
  const factorHigh = Math.max(multiplicativeHigh, additiveHigh, centralFactor);
  const central = 100 * session.distance_km * centralFactor;
  const low = 100 * session.distance_km * factorLow;
  const high = 100 * session.distance_km * factorHigh;
  const widthRatio = central > 0 ? (high - low) / central : 0;

  return Object.freeze({
    model_version: V27_MODEL_VERSION,
    central_points: central,
    range_points: Object.freeze([low, high]),
    show_range_primary: widthRatio > 0.2,
    structural_width_ratio: widthRatio,
    grade_coverage: gradeCoverage,
    surface_coverage: surfaceCoverage,
    pairing_state: "MARGINAL_OVERLAP_UNKNOWN",
    central_pairing_assumption: "INDEPENDENCE_OF_MARGINAL_PROFILES",
    grade_states: Object.freeze(gradeStates),
    surface_states: Object.freeze(surfaceStates),
    is_measured_physical_load: false,
    supports_medical_decision: false,
  });
}

function calculateV27Total(session) {
  return Array.isArray(session.sections) && session.sections.length
    ? calculateV27TotalFromSections(session)
    : calculateV27TotalFromMarginalProfiles(session);
}

function gradeDegrees(gradePercent) {
  return Math.atan(gradePercent / 100) * 180 / Math.PI;
}

function calculateV27RegionalGradeFactor(regionId, gradePercent) {
  const curve = V27_GRADE_CURVES[regionId];
  if (!curve) return Object.freeze({ factor: 1, state: "NOT_APPLICABLE" });
  if (gradePercent == null) return Object.freeze({ factor: 1, state: "UNKNOWN" });
  if (!isFiniteNumber(gradePercent)) return Object.freeze({ factor: 1, state: "INVALID" });
  let valueDegrees = gradeDegrees(gradePercent);
  if (
    valueDegrees < curve.xs[0] - V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG
    || valueDegrees > curve.xs.at(-1) + V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG
  ) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  if (valueDegrees < curve.xs[0]) valueDegrees = curve.xs[0];
  if (valueDegrees > curve.xs.at(-1)) valueDegrees = curve.xs.at(-1);
  return Object.freeze({
    factor: linearInterpolate(valueDegrees, curve.xs, curve.ys),
    state: "KNOWN_APPLIED",
  });
}

function calculateV27RegionalSpeedFactor(regionId, speedMps, activityType) {
  const curve = V27_SPEED_CURVES[regionId];
  if (!curve || activityType !== "CONTINUOUS_RUN") {
    return Object.freeze({ factor: 1, state: "NOT_APPLICABLE" });
  }
  if (speedMps < curve.xs[0] || speedMps > curve.xs.at(-1)) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  return Object.freeze({
    factor: linearInterpolate(speedMps, curve.xs, curve.ys),
    state: "KNOWN_APPLIED",
  });
}

function calculateV27RegionalCadenceFactor({
  regionId,
  speedMps,
  cadenceDeltaSpm,
  reliable,
  referenceN,
}) {
  const curve = V27_CADENCE_CURVES[regionId];
  if (!curve) return Object.freeze({ factor: 1, state: "NOT_APPLICABLE" });
  if (cadenceDeltaSpm == null) return Object.freeze({ factor: 1, state: "UNKNOWN" });
  if (!reliable || referenceN < 3) {
    return Object.freeze({ factor: 1, state: "NOT_APPLICABLE" });
  }
  if (speedMps < 3 || speedMps > 3.67) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  if (cadenceDeltaSpm < curve.xs[0] || cadenceDeltaSpm > curve.xs.at(-1)) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  return Object.freeze({
    factor: linearInterpolate(cadenceDeltaSpm, curve.xs, curve.ys),
    state: "KNOWN_APPLIED",
  });
}

function regionalGradeSections(session) {
  const sections = validateSections(session);
  if (sections) return sections;
  const { gradeProfile } = validateMarginalProfiles(session);
  return gradeProfile.map((item) => ({
    distance_km: session.distance_km * item.share_pct / 100,
    grade_pct: item.grade_pct,
  }));
}

function regionalSurfaceClasses(session) {
  const sections = Array.isArray(session.sections) ? session.sections : [];
  if (sections.length) return new Set(sections.map((section) => section.surface_class));
  const { surfaceProfile } = validateMarginalProfiles(session);
  return new Set(surfaceProfile.map((item) => item.surface_class));
}

function surfaceContexts(regionId, surfaceClasses) {
  const contexts = [];
  if (surfaceClasses.has("DEEP_DRY_SOFT_SAND")) {
    if (regionId === "R06") {
      contexts.push("SAND_TIBIALIS_ANTERIOR_TESTED_INCREASE_GROUP_DEPENDENT");
    } else if (regionId === "R07") {
      contexts.push("SAND_GASTROCNEMIUS_RESPONSE_LOWER_OR_MIXED");
    } else {
      contexts.push("SAND_REGIONAL_SCALAR_NOT_ESTABLISHED");
    }
  }
  if (surfaceClasses.has("EXPLICIT_UNEVEN")) {
    if (regionId === "R03") {
      contexts.push("UNEVEN_SELECTED_ANTERIOR_THIGH_EMG_INCREASED_IN_TEST");
    } else if (regionId === "R04") {
      contexts.push("UNEVEN_MEDIAL_HAMSTRING_EMG_INCREASED_IN_TEST");
    } else if (regionId === "R08") {
      contexts.push("UNEVEN_ANKLE_WORK_DECREASED_WHILE_VARIABILITY_INCREASED");
    } else {
      contexts.push("UNEVEN_REGIONAL_VARIABILITY_CONTEXT_ONLY");
    }
  }
  if (surfaceClasses.has("KNOWN_OTHER")) {
    contexts.push("KNOWN_SURFACE_WITHOUT_REGIONAL_SCALAR");
  }
  if (surfaceClasses.has("UNKNOWN")) {
    contexts.push("UNKNOWN_SURFACE_NO_REGIONAL_INFERENCE");
  }
  return Object.freeze(contexts);
}

function calculateV27Regional(session) {
  validateBaseSession(session);
  const sections = regionalGradeSections(session);
  const surfaceClasses = regionalSurfaceClasses(session);
  const speedMps = session.distance_km * 1000 / (session.active_minutes * 60);
  const outputs = {};

  V27_REGIONS.forEach((region) => {
    let gradeOnlyExposure = 0;
    let appliedGradeDistance = 0;
    const gradeStates = [];
    sections.forEach((section) => {
      const result = calculateV27RegionalGradeFactor(region.id, section.grade_pct);
      gradeOnlyExposure += section.distance_km * result.factor;
      gradeStates.push(result.state);
      if (result.state === "KNOWN_APPLIED") appliedGradeDistance += section.distance_km;
    });
    const speedResult = calculateV27RegionalSpeedFactor(
      region.id,
      speedMps,
      session.activity_type,
    );
    const cadenceResult = calculateV27RegionalCadenceFactor({
      regionId: region.id,
      speedMps,
      cadenceDeltaSpm: session.cadence_delta_spm,
      reliable: session.cadence_provenance_reliable === true,
      referenceN: session.cadence_reference_n || 0,
    });
    const gradeMeanFactor = gradeOnlyExposure / session.distance_km;
    const multiplicativeFactor = gradeMeanFactor * speedResult.factor * cadenceResult.factor;
    const additiveFactor = Math.max(
      0,
      1
      + (gradeMeanFactor - 1)
      + (speedResult.factor - 1)
      + (cadenceResult.factor - 1),
    );
    const knownGrades = new Set(
      sections
        .filter((section) => isFiniteNumber(section.grade_pct))
        .map((section) => section.grade_pct.toFixed(9)),
    );
    const averageSpeedApproximation = (
      Boolean(V27_SPEED_CURVES[region.id]) && knownGrades.size > 1
    );
    const candidates = [multiplicativeFactor, additiveFactor];
    if (
      session.cadence_robustness_state === "TOLERANCE_DEPENDENT"
      && cadenceResult.state === "KNOWN_APPLIED"
    ) {
      candidates.push(gradeMeanFactor * speedResult.factor);
    }
    if (averageSpeedApproximation) candidates.push(gradeMeanFactor);
    const rawExposure = session.distance_km * multiplicativeFactor;
    const exposureLow = session.distance_km * Math.min(...candidates);
    const exposureHigh = session.distance_km * Math.max(...candidates);
    const widthRatio = rawExposure > 0 ? (exposureHigh - exposureLow) / rawExposure : 0;
    const curve = V27_GRADE_CURVES[region.id];
    const gradeCoverage = curve ? appliedGradeDistance / session.distance_km : null;
    const endpointConfidence = curve?.endpointConfidence || "LOW";
    const endpoint = curve?.endpoint || "volume_only";
    const gradeSignature = gradeCoverage == null ? "NA" : gradeCoverage.toFixed(3);
    const ratio = 100 * rawExposure / session.distance_km;
    outputs[region.id] = Object.freeze({
      region_id: region.id,
      label: region.label,
      raw_exposure: rawExposure,
      raw_exposure_range: Object.freeze([exposureLow, exposureHigh]),
      show_range_primary: widthRatio > 0.1,
      interaction_width_ratio: widthRatio,
      condition_index_same_distance: ratio,
      run_fact_regional_ratio: ratio,
      condition_index_range: Object.freeze([
        100 * exposureLow / session.distance_km,
        100 * exposureHigh / session.distance_km,
      ]),
      primary_display_value: curve ? ratio : null,
      primary_display_mode: curve
        ? "CONDITION_RESPONSIVE_NUMERIC"
        : "VOLUME_ONLY_CONTEXT",
      grade_coverage: gradeCoverage,
      grade_states: Object.freeze(gradeStates),
      speed_factor: speedResult.factor,
      speed_state: speedResult.state,
      cadence_factor: cadenceResult.factor,
      cadence_state: cadenceResult.state,
      cadence_robustness_state: session.cadence_robustness_state || "NOT_EVALUATED",
      session_average_speed_approximation: averageSpeedApproximation,
      coverage_signature: `G:${gradeSignature}|S:${speedResult.state}|C:${cadenceResult.state}`,
      endpoint,
      endpoint_confidence: endpointConfidence,
      surface_contexts: surfaceContexts(region.id, surfaceClasses),
      supports_medical_decision: false,
    });
  });
  return Object.freeze(outputs);
}

function calculateV27WithinRunRegionalEmphasis(regionalResults) {
  if (V27_EMPHASIS_REGION_IDS.some((regionId) => !regionalResults[regionId])) {
    throw new RangeError("all fixed six emphasis regions are required");
  }
  const rows = V27_EMPHASIS_REGION_IDS.map((regionId) => regionalResults[regionId]);
  const centralValues = rows.map((row) => row.run_fact_regional_ratio);
  const ranges = rows.map((row) => row.condition_index_range);
  const gradeCoverages = rows.map((row) => row.grade_coverage);
  if (centralValues.some((value) => !isFiniteNumber(value) || value <= 0)) {
    throw new RangeError("all six run-fact regional ratios must be positive");
  }
  if (ranges.some(([low, high]) => (
    !isFiniteNumber(low)
    || !isFiniteNumber(high)
    || low <= 0
    || high <= 0
    || low > high
  ))) {
    throw new RangeError("all six regional ranges must be positive and ordered");
  }
  if (gradeCoverages.some((value) => !isFiniteNumber(value))) {
    throw new RangeError("all six grade coverage values are required");
  }
  const roundedCoverages = new Set(gradeCoverages.map((value) => value.toFixed(9)));
  if (roundedCoverages.size !== 1) {
    return Object.freeze({
      model_version: V27_MODEL_VERSION,
      state: "UNAVAILABLE_COVERAGE_MISMATCH",
      coverage_values: Object.freeze(gradeCoverages),
      region_ids: V27_EMPHASIS_REGION_IDS,
      rows: Object.freeze([]),
      supports_relative_emphasis_comparison: false,
      supports_absolute_regional_load_comparison: false,
      is_compositional_share: false,
    });
  }

  const commonGradeCoverage = gradeCoverages[0];
  const centralSum = centralValues.reduce((total, value) => total + value, 0);
  const resultRows = V27_EMPHASIS_REGION_IDS.map((regionId, index) => {
    const central = 600 * centralValues[index] / centralSum;
    const [ownLow, ownHigh] = ranges[index];
    const otherHighSum = ranges.reduce(
      (total, range, otherIndex) => total + (otherIndex === index ? 0 : range[1]),
      0,
    );
    const otherLowSum = ranges.reduce(
      (total, range, otherIndex) => total + (otherIndex === index ? 0 : range[0]),
      0,
    );
    const low = 600 * ownLow / (ownLow + otherHighSum);
    const high = 600 * ownHigh / (ownHigh + otherLowSum);
    const widthRatio = central > 0 ? (high - low) / central : 0;
    const direction = central > 100
      ? "ABOVE_SIX_REGION_MEAN"
      : central < 100
        ? "BELOW_SIX_REGION_MEAN"
        : "AT_SIX_REGION_MEAN";
    return Object.freeze({
      region_id: regionId,
      relative_emphasis_index: central,
      relative_emphasis_range: Object.freeze([low, high]),
      show_range_primary: widthRatio > 0.1,
      direction,
      endpoint: rows[index].endpoint,
      endpoint_confidence: rows[index].endpoint_confidence,
    });
  });
  return Object.freeze({
    model_version: V27_MODEL_VERSION,
    state: "AVAILABLE",
    coverage_state: approximatelyEqual(commonGradeCoverage, 1) ? "FULL" : "PARTIAL",
    common_grade_coverage: commonGradeCoverage,
    region_ids: V27_EMPHASIS_REGION_IDS,
    rows: Object.freeze(resultRows),
    mean_index: resultRows.reduce(
      (total, row) => total + row.relative_emphasis_index,
      0,
    ) / resultRows.length,
    supports_relative_emphasis_comparison: true,
    supports_absolute_regional_load_comparison: false,
    is_compositional_share: false,
    fixed_region_count: 6,
  });
}

function calculateV27InternalResponse(session) {
  validateBaseSession(session);
  if (session.rpe == null) {
    return Object.freeze({ state: "UNKNOWN", srpe_au: null });
  }
  return Object.freeze({
    state: "KNOWN",
    srpe_au: session.active_minutes * session.rpe,
    separate_from_objective_model: true,
  });
}

function calculateV27Session(session) {
  const regional = calculateV27Regional(session);
  return Object.freeze({
    model_version: V27_MODEL_VERSION,
    total: calculateV27Total(session),
    regional,
    within_run_regional_emphasis: calculateV27WithinRunRegionalEmphasis(regional),
    internal: calculateV27InternalResponse(session),
  });
}

function assertV27ResultSemantics(result) {
  const errors = [];
  const emphasis = result?.within_run_regional_emphasis;
  if (result?.model_version !== V27_MODEL_VERSION) errors.push("MODEL_VERSION_MISMATCH");
  if (!emphasis) errors.push("MISSING_WITHIN_RUN_EMPHASIS");
  if (emphasis?.state === "AVAILABLE") {
    if (emphasis.fixed_region_count !== 6) errors.push("FIXED_REGION_COUNT_NOT_SIX");
    if (
      JSON.stringify(emphasis.region_ids) !== JSON.stringify(V27_EMPHASIS_REGION_IDS)
    ) {
      errors.push("FIXED_REGION_IDS_MISMATCH");
    }
    const values = emphasis.rows.map((row) => row.relative_emphasis_index);
    if (values.some((value) => !isFiniteNumber(value) || value <= 0)) {
      errors.push("INVALID_EMPHASIS_VALUE");
    }
    const mean = values.reduce((total, value) => total + value, 0) / values.length;
    if (!approximatelyEqual(mean, 100, 1e-9)) errors.push("EMPHASIS_MEAN_NOT_100");
    emphasis.rows.forEach((row) => {
      const [low, high] = row.relative_emphasis_range;
      if (
        low - row.relative_emphasis_index > 1e-9
        || row.relative_emphasis_index - high > 1e-9
      ) {
        errors.push(`EMPHASIS_RANGE_INVALID_${row.region_id}`);
      }
    });
  }
  if (emphasis?.is_compositional_share !== false) errors.push("COMPOSITIONAL_FLAG_INVALID");
  if (emphasis?.supports_absolute_regional_load_comparison !== false) {
    errors.push("ABSOLUTE_COMPARISON_FLAG_INVALID");
  }
  if (result?.total?.supports_medical_decision !== false) {
    errors.push("MEDICAL_SUPPORT_FLAG_INVALID");
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}
__exp["minettiCost"] = minettiCost;
__exp["calculateV27TotalGradeFactor"] = calculateV27TotalGradeFactor;
__exp["calculateV27TotalFromSections"] = calculateV27TotalFromSections;
__exp["calculateV27TotalFromMarginalProfiles"] = calculateV27TotalFromMarginalProfiles;
__exp["calculateV27Total"] = calculateV27Total;
__exp["calculateV27RegionalGradeFactor"] = calculateV27RegionalGradeFactor;
__exp["calculateV27RegionalSpeedFactor"] = calculateV27RegionalSpeedFactor;
__exp["calculateV27RegionalCadenceFactor"] = calculateV27RegionalCadenceFactor;
__exp["calculateV27Regional"] = calculateV27Regional;
__exp["calculateV27WithinRunRegionalEmphasis"] = calculateV27WithinRunRegionalEmphasis;
__exp["calculateV27InternalResponse"] = calculateV27InternalResponse;
__exp["calculateV27Session"] = calculateV27Session;
__exp["assertV27ResultSemantics"] = assertV27ResultSemantics;
__mods[39] = __exp;
}

// ===== core/storage/courseRepository.js =====
{
const __exp = Object.create(null);
const { SURFACE_FIELDS, hasTreadmillOutdoorSurfaceMixFromCourse } = __mods[3];
const { normalizeSingleLineText } = __mods[6];
const { createCollectionRepository } = __mods[10];
const { STORAGE_KEYS } = __mods[1];

const COURSE_NUMERIC_FIELDS = Object.freeze([
  "upPercent", "downPercent", "upGradePercent", "downGradePercent",
  ...SURFACE_FIELDS.map(({ recordKey }) => recordKey),
]);

const GRADE_INPUT_MODES = new Set(["UNKNOWN", "FLAT", "SUMMARY", "SECTIONS"]);
const SURFACE_INPUT_MODES = new Set(["UNKNOWN", "SINGLE", "MIXED"]);
const GRADE_DIRECTIONS = new Set(["UPHILL", "DOWNHILL", "FLAT", "UNKNOWN"]);
const ROUTE_PATTERNS = new Set(["LOOP", "OUT_AND_BACK", "ONE_WAY", "MIXED", "UNKNOWN"]);
const SURFACE_CLASSES = new Set([
  "REF_HARD_EVEN_STABLE",
  "DRY_STABLE_GRASS_TURF",
  "DEEP_DRY_SOFT_SAND",
  "EXPLICIT_UNEVEN",
  "KNOWN_OTHER",
  "UNKNOWN",
]);

function boundedNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return number;
}

function normalizedGradeInputMode(course = {}) {
  const explicit = String(course?.gradeInputMode || "").toUpperCase();
  if (GRADE_INPUT_MODES.has(explicit)) return explicit;
  if (Array.isArray(course?.sections) && course.sections.length) return "SECTIONS";
  if (String(course?.gradeKnowledge || "").toUpperCase() === "KNOWN_FLAT") return "FLAT";
  if (String(course?.gradeKnowledge || "").toUpperCase() === "KNOWN_PROFILE") return "SUMMARY";
  return "UNKNOWN";
}

function normalizedSurfaceInputMode(course = {}) {
  const explicit = String(course?.surfaceInputMode || "").toUpperCase();
  if (SURFACE_INPUT_MODES.has(explicit)) return explicit;
  const positive = SURFACE_FIELDS.filter(({ recordKey }) => Number(course?.[recordKey] || 0) > 0);
  if (!positive.length) return "UNKNOWN";
  if (positive.length === 1 && Math.abs(Number(course?.[positive[0].recordKey] || 0) - 100) <= 0.01) return "SINGLE";
  return "MIXED";
}

function normalizeSections(sections = []) {
  if (!Array.isArray(sections)) return Object.freeze([]);
  return Object.freeze(sections.flatMap((item = {}, index) => {
    const sharePercent = boundedNumber(item.sharePercent);
    const rawDirection = String(item.gradeDirection || "").toUpperCase();
    const rawGrade = boundedNumber(item.gradePercent);
    const gradeDirection = GRADE_DIRECTIONS.has(rawDirection)
      ? rawDirection
      : rawGrade > 0
        ? "UPHILL"
        : rawGrade < 0
          ? "DOWNHILL"
          : "FLAT";
    const gradePercent = gradeDirection === "FLAT" ? 0 : Math.abs(rawGrade);
    if (!(sharePercent > 0)) return [];
    return [Object.freeze({
      sectionId: normalizeSingleLineText(item.sectionId, 80) || `section-${index + 1}`,
      sharePercent,
      distanceKm: Number(item.distanceKm) > 0 ? Number(item.distanceKm) : null,
      durationMinutes: Number(item.durationMinutes) > 0 ? Number(item.durationMinutes) : null,
      steps: item.steps != null && Number.isInteger(Number(item.steps)) && Number(item.steps) >= 0 ? Number(item.steps) : null,
      speedMps: Number(item.speedMps) > 0 ? Number(item.speedMps) : null,
      cadenceSpm: Number(item.cadenceSpm) > 0 ? Number(item.cadenceSpm) : null,
      gradeDirection,
      gradePercent,
    })];
  }));
}

function normalizeSurfaceProfile(profile = []) {
  if (!Array.isArray(profile)) return Object.freeze([]);
  return Object.freeze(profile.flatMap((item = {}) => {
    const sharePercent = boundedNumber(item.sharePercent);
    const surfaceClass = String(item.surfaceClass || "UNKNOWN").toUpperCase();
    if (!(sharePercent > 0)) return [];
    return [Object.freeze({
      sharePercent,
      surfaceClass: SURFACE_CLASSES.has(surfaceClass) ? surfaceClass : "UNKNOWN",
    })];
  }));
}

function normalizeCourseFields(course = {}) {
  const gradeInputMode = normalizedGradeInputMode(course);
  const surfaceInputMode = normalizedSurfaceInputMode(course);
  const gradeKnowledge = gradeInputMode === "FLAT"
    ? "KNOWN_FLAT"
    : ["SUMMARY", "SECTIONS"].includes(gradeInputMode)
      ? "KNOWN_PROFILE"
      : "UNKNOWN";
  const modelSurfaceClass = String(course?.modelSurfaceClass || "UNKNOWN").toUpperCase();
  const normalized = {
    name: normalizeSingleLineText(course?.name, 80),
    routePattern: ROUTE_PATTERNS.has(String(course?.routePattern || "UNKNOWN").toUpperCase())
      ? String(course.routePattern || "UNKNOWN").toUpperCase()
      : "UNKNOWN",
    gradeInputMode,
    surfaceInputMode,
    gradeKnowledge,
    upPercent: boundedNumber(course?.upPercent),
    downPercent: boundedNumber(course?.downPercent),
    upGradePercent: boundedNumber(course?.upGradePercent),
    downGradePercent: boundedNumber(course?.downGradePercent),
    modelSurfaceClass: SURFACE_CLASSES.has(modelSurfaceClass) ? modelSurfaceClass : "UNKNOWN",
    modelSurfaceProfile: normalizeSurfaceProfile(course?.modelSurfaceProfile),
    sections: normalizeSections(course?.sections),
  };
  SURFACE_FIELDS.forEach(({ recordKey }) => {
    normalized[recordKey] = boundedNumber(course?.[recordKey] ?? 0);
  });
  return Object.freeze(normalized);
}

function validateSections(sections = []) {
  if (!sections.length) return { ok: false, code: "COURSE_SECTION_REQUIRED", message: "区間入力では、少なくとも1区間の割合を入力してください。" };
  const invalid = sections.some((section) => (
    !Number.isFinite(Number(section.sharePercent))
    || Number(section.sharePercent) <= 0
    || Number(section.sharePercent) > 100
    || !GRADE_DIRECTIONS.has(String(section.gradeDirection || "").toUpperCase())
    || !Number.isFinite(Number(section.gradePercent))
    || Number(section.gradePercent) < 0
    || Number(section.gradePercent) > 100
  ));
  if (invalid) return { ok: false, code: "COURSE_SECTION_INVALID", message: "区間の割合と勾配を0〜100の範囲で確認してください。" };
  const total = sections.reduce((sum, section) => sum + Number(section.sharePercent || 0), 0);
  if (Math.abs(total - 100) > 0.01) return { ok: false, code: "COURSE_SECTION_SHARE_INVALID", message: `区間割合の合計を100%にしてください。現在は${total}%です。` };
  const missingGrade = sections.some((section) => (
    ["UPHILL", "DOWNHILL"].includes(section.gradeDirection)
    && !(Number(section.gradePercent) > 0)
  ));
  if (missingGrade) return { ok: false, code: "COURSE_SECTION_GRADE_REQUIRED", message: "上り・下り区間には、正の勾配の大きさを入力してください。" };
  return { ok: true };
}

function validateCoursePresetInput(course = {}) {
  const normalized = normalizeCourseFields(course);
  if (!normalized.name) {
    return { ok: false, code: "COURSE_NAME_REQUIRED", message: "コース名を入力してください。", course: normalized };
  }
  const numericValues = COURSE_NUMERIC_FIELDS.map((field) => [field, Number(normalized[field] ?? 0)]);
  const invalidNumeric = numericValues.filter(([, value]) => !Number.isFinite(value) || value < 0 || value > 100);
  if (invalidNumeric.length) {
    return {
      ok: false,
      code: "COURSE_NUMERIC_VALUE_INVALID",
      message: "坂道と路面の値は0〜100の範囲で入力してください。",
      details: { fields: invalidNumeric.map(([field]) => field) },
      course: normalized,
    };
  }
  if (normalized.gradeInputMode === "SUMMARY") {
    const up = normalized.upPercent;
    const down = normalized.downPercent;
    if (up + down > 100.01) return { ok: false, code: "COURSE_GRADE_SHARE_INVALID", message: "上り区間と下り区間の合計は100%以下にしてください。", course: normalized };
    if (up > 0 && normalized.upGradePercent <= 0) return { ok: false, code: "COURSE_UP_GRADE_REQUIRED", message: "上り区間がある場合は、正の代表勾配を入力してください。", course: normalized };
    if (down > 0 && normalized.downGradePercent <= 0) return { ok: false, code: "COURSE_DOWN_GRADE_REQUIRED", message: "下り区間がある場合は、代表勾配の大きさを入力してください。", course: normalized };
  }
  if (normalized.gradeInputMode === "SECTIONS") {
    const sectionValidation = validateSections(normalized.sections);
    if (!sectionValidation.ok) return { ...sectionValidation, course: normalized };
  }
  const surfaceTotal = SURFACE_FIELDS.reduce((sum, { recordKey }) => sum + normalized[recordKey], 0);
  if (normalized.surfaceInputMode === "UNKNOWN" && surfaceTotal > 0.01) {
    return { ok: false, code: "COURSE_SURFACE_MODE_CONFLICT", message: "路面を入力した場合は、1種類または複数種類を選んでください。", course: normalized };
  }
  if (normalized.surfaceInputMode !== "UNKNOWN" && Math.abs(surfaceTotal - 100) > 0.01) {
    return { ok: false, code: "COURSE_SURFACE_TOTAL_INVALID", message: `路面割合の合計を100%にしてください。現在は${surfaceTotal}%です。`, course: normalized };
  }
  if (hasTreadmillOutdoorSurfaceMixFromCourse(normalized)) {
    return { ok: false, code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルは屋外路面と割合で混ぜず、トレッドミルのみのコースとして保存してください。", course: normalized };
  }
  if (!SURFACE_CLASSES.has(normalized.modelSurfaceClass)) {
    return { ok: false, code: "COURSE_SURFACE_CLASS_INVALID", message: "路面の入力内容を確認してください。", course: normalized };
  }
  return { ok: true, course: normalized };
}

function normalizePreset(item = {}) {
  const course = normalizeCourseFields(item.course || item);
  const id = normalizeSingleLineText(item.id, 120);
  if (!id || !course.name) return null;
  return Object.freeze({
    id,
    name: course.name,
    course,
    createdAt: String(item.createdAt || item.updatedAt || new Date().toISOString()),
    updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString()),
  });
}

function createId(courseName, existingIds, nowIso) {
  const slug = normalizeSingleLineText(courseName, 40)
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "") || "course";
  const stamp = nowIso.replace(/[^0-9]/g, "").slice(0, 17);
  let candidate = `course-${slug}-${stamp}`;
  let suffix = 2;
  while (existingIds.has(candidate)) candidate = `course-${slug}-${stamp}-${suffix++}`;
  return candidate;
}

function createCourseRepository(gateway) {
  const repository = createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.courses,
    normalizeItem: normalizePreset,
    sortItems: (items) => [...items].sort((left, right) => left.name.localeCompare(right.name, "ja") || left.id.localeCompare(right.id)),
  });

  function duplicateByName(name, excludingId = "") {
    const normalizedName = normalizeSingleLineText(name, 80).toLocaleLowerCase("ja");
    return repository.loadAll().find((item) => item.id !== excludingId && item.name.toLocaleLowerCase("ja") === normalizedName) || null;
  }

  function create(courseInput) {
    const validation = validateCoursePresetInput(courseInput);
    if (!validation.ok) return { ...validation, item: null };
    const duplicate = duplicateByName(validation.course.name);
    if (duplicate) return { ok: false, code: "COURSE_NAME_DUPLICATE", message: "同じ名前のコースがあります。保存済みコースを選んで更新するか、別の名前にしてください。", item: null, duplicate };
    const items = repository.loadAll();
    const nowIso = new Date().toISOString();
    const preset = normalizePreset({ id: createId(validation.course.name, new Set(items.map((item) => item.id)), nowIso), course: validation.course, createdAt: nowIso, updatedAt: nowIso });
    return repository.upsert(preset);
  }

  function update(id, courseInput) {
    const current = repository.findById(String(id || ""));
    if (!current) return { ok: false, code: "COURSE_NOT_FOUND", message: "更新するコースを選んでください。", item: null };
    const validation = validateCoursePresetInput(courseInput);
    if (!validation.ok) return { ...validation, item: null };
    const duplicate = duplicateByName(validation.course.name, current.id);
    if (duplicate) return { ok: false, code: "COURSE_NAME_DUPLICATE", message: "同じ名前の別コースがあります。別の名前にしてください。", item: null, duplicate };
    const preset = normalizePreset({ ...current, name: validation.course.name, course: validation.course, updatedAt: new Date().toISOString() });
    return repository.upsert(preset);
  }

  return Object.freeze({
    loadAll: repository.loadAll,
    loadAllResult: repository.loadAllResult,
    findById: repository.findById,
    create,
    update,
    removeById: repository.removeById,
    clear: () => gateway.remove(STORAGE_KEYS.courses),
  });
}
__exp["COURSE_NUMERIC_FIELDS"] = COURSE_NUMERIC_FIELDS;
__exp["normalizeCourseFields"] = normalizeCourseFields;
__exp["validateCoursePresetInput"] = validateCoursePresetInput;
__exp["createCourseRepository"] = createCourseRepository;
__mods[40] = __exp;
}

// ===== core/storage/restoreInspection.js =====
{
const __exp = Object.create(null);
const { PERSONAL_PROFILE_SCHEMA_VERSION } = __mods[36];
const { PRIMARY_REGIONAL_V2_MODEL_VERSION, validatePrimaryRegionalV2ResultRecord } = __mods[26];
const { V27_MODEL_VERSION } = __mods[12];
const { assertV27ResultSemantics } = __mods[39];
const { INPUT_LIMITS } = __mods[6];
const { validateRunningRecordInput, normalizeRunningRecord, validateRunningRecord } = __mods[9];
const { validateCoursePresetInput } = __mods[40];
const { STORAGE_KEYS, USER_DATA_STORAGE_KEYS } = __mods[1];

const RESTORE_INSPECTION_VERSION = "runload-restore-inspection-v1";
const RESTORE_STATUS = Object.freeze({
  supported: "SUPPORTED",
  review: "REVIEW_REQUIRED",
  blocked: "RESTORE_BLOCKED",
});

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function issue(severity, code, area, message, itemId = "", details = {}) {
  return Object.freeze({ severity, code, area, message, itemId: String(itemId || ""), details: Object.freeze({ ...details }) });
}


function withinCollectionLimit(value, maximum, area, label, issues) {
  if (!Array.isArray(value)) return false;
  if (value.length <= maximum) return true;
  issues.push(issue(
    "BLOCKING",
    "COLLECTION_LIMIT_EXCEEDED",
    area,
    `${label}の件数が多すぎます。`,
    "",
    { count: value.length, maximum },
  ));
  return false;
}

function addDuplicateIssues(items, getId, area, label, issues) {
  const seen = new Set();
  const duplicates = new Set();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const id = String(getId(item) || "");
    if (!id) return;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  });
  duplicates.forEach((id) => issues.push(issue(
    "BLOCKING",
    "DUPLICATE_ID",
    area,
    `${label}に同じ識別子が複数あります。`,
    id,
  )));
}

function deepFiniteNumbers(value, path = "", issues = [], area = "data", itemId = "") {
  if (typeof value === "number" && !Number.isFinite(value)) {
    issues.push(issue("BLOCKING", "NONFINITE_NUMBER", area, "有限でない数値が含まれています。", itemId, { path }));
    return issues;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => deepFiniteNumbers(item, `${path}[${index}]`, issues, area, itemId));
  } else if (isObject(value)) {
    Object.entries(value).forEach(([key, item]) => deepFiniteNumbers(item, path ? `${path}.${key}` : key, issues, area, itemId));
  }
  return issues;
}

function inspectRecords(records, issues) {
  addDuplicateIssues(records, (item) => item?.id, "records", "走行・休養記録", issues);
  (records || []).forEach((record, index) => {
    const itemId = String(record?.id || `#${index + 1}`);
    if (!isObject(record) || !record.id) {
      issues.push(issue("BLOCKING", "RECORD_OBJECT_OR_ID_REQUIRED", "records", "記録の形式または識別子を確認できません。", itemId));
      return;
    }
    const inputValidation = validateRunningRecordInput(record);
    const normalized = normalizeRunningRecord(record, {
      existingIds: [],
      nowIso: record.updatedAt || record.createdAt || "2000-01-01T00:00:00.000Z",
    });
    const validation = validateRunningRecord(normalized);
    if (!inputValidation.ok || !validation.ok) {
      issues.push(issue("BLOCKING", "RECORD_SCHEMA_INVALID", "records", "走行・休養記録の必須項目または値の範囲が現在の形式に適合しません。", itemId, {
        inputErrors: inputValidation.errors?.map((item) => item.code) || [],
        recordErrors: validation.errors?.map((item) => item.code) || [],
      }));
    }
    deepFiniteNumbers(record, "", issues, "records", itemId);
  });
}

function inspectV27Results(results, recordIds, issues) {
  addDuplicateIssues(results, (item) => item?.id, "v27Results", "走行全体の保存済み結果", issues);
  (results || []).forEach((item, index) => {
    const itemId = String(item?.id || `#${index + 1}`);
    if (!isObject(item) || !item.id || !item.record_id) {
      issues.push(issue("BLOCKING", "V27_RESULT_ID_REQUIRED", "v27Results", "走行全体の保存済み結果の識別情報が不足しています。", itemId));
      return;
    }
    if (item.model_version !== V27_MODEL_VERSION) {
      issues.push(issue("BLOCKING", "V27_VERSION_UNSUPPORTED", "v27Results", "対応していない走行全体の結果形式です。", itemId));
    }
    if (!recordIds.has(String(item.record_id))) {
      issues.push(issue("BLOCKING", "V27_RECORD_REFERENCE_MISSING", "v27Results", "結果が参照する走行・休養記録がバックアップ内にありません。", itemId));
    }
    if (item.input_snapshot?.record?.id && String(item.input_snapshot.record.id) !== String(item.record_id)) {
      issues.push(issue("BLOCKING", "V27_SNAPSHOT_REFERENCE_MISMATCH", "v27Results", "結果と元の記録の対応を確認できません。", itemId));
    }
    if (item.state === "RUN") {
      const semantic = assertV27ResultSemantics(item.result);
      if (!semantic.ok) {
        issues.push(issue("BLOCKING", "V27_SEMANTICS_INVALID", "v27Results", "走行全体の保存済み結果が現在の意味規則に適合しません。", itemId, { errors: semantic.errors }));
      }
    } else if (item.state !== "REST" || item.result !== null) {
      issues.push(issue("BLOCKING", "V27_STATE_INVALID", "v27Results", "走行全体の結果状態を確認できません。", itemId));
    }
    deepFiniteNumbers(item, "", issues, "v27Results", itemId);
  });
}

function inspectRegionalResults(results, recordIds, issues) {
  addDuplicateIssues(results, (item) => item?.id, "regionalResults", "部位別の保存済み結果", issues);
  (results || []).forEach((item, index) => {
    const itemId = String(item?.id || `#${index + 1}`);
    if (!isObject(item) || !item.id || !item.record_id) {
      issues.push(issue("BLOCKING", "REGIONAL_RESULT_ID_REQUIRED", "regionalResults", "部位別の保存済み結果の識別情報が不足しています。", itemId));
      return;
    }
    if (item.model_version !== PRIMARY_REGIONAL_V2_MODEL_VERSION) {
      issues.push(issue("BLOCKING", "REGIONAL_VERSION_UNSUPPORTED", "regionalResults", "このアプリで作成された部位別結果ではありません。", itemId));
    }
    if (!recordIds.has(String(item.record_id))) {
      issues.push(issue("BLOCKING", "REGIONAL_RECORD_REFERENCE_MISSING", "regionalResults", "部位別結果が参照する記録がバックアップ内にありません。", itemId));
    }
    if (item.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION) {
      const outputValidation = validatePrimaryRegionalV2ResultRecord(item);
      if (!outputValidation.valid) issues.push(issue("BLOCKING", "PRIMARY_REGIONAL_V2_OUTPUT_INVALID", "regionalResults", "部位別比較値の12部位・入力追跡情報を確認できません。", itemId, { issueCodes: outputValidation.issues.slice(0, 20) }));
    }
    deepFiniteNumbers(item, "", issues, "regionalResults", itemId);
  });
}

function inspectFeedback(items, recordIds, issues) {
  addDuplicateIssues(items, (item) => item?.recordId || `date:${item?.date || ""}`, "subjectiveFeedback", "本人入力", issues);
  (items || []).forEach((item, index) => {
    const itemId = String(item?.recordId || item?.date || `#${index + 1}`);
    if (!isObject(item) || (!item.recordId && !item.date)) {
      issues.push(issue("BLOCKING", "FEEDBACK_TARGET_REQUIRED", "subjectiveFeedback", "本人入力の対象記録または日付が不足しています。", itemId));
      return;
    }
    if (item.recordId && !recordIds.has(String(item.recordId))) {
      issues.push(issue("BLOCKING", "FEEDBACK_RECORD_REFERENCE_MISSING", "subjectiveFeedback", "本人入力が参照する記録がバックアップ内にありません。", itemId));
    }
    deepFiniteNumbers(item, "", issues, "subjectiveFeedback", itemId);
  });
}

function inspectPlans(plans, recordIds, issues) {
  addDuplicateIssues(plans, (item) => item?.id, "plans", "予定", issues);
  (plans || []).forEach((plan, index) => {
    const itemId = String(plan?.id || `#${index + 1}`);
    if (!isObject(plan) || !plan.id || !String(plan.scheduledDate || plan.date || "").slice(0, 10)) {
      issues.push(issue("BLOCKING", "PLAN_SCHEMA_INVALID", "plans", "予定の識別子または日付が不足しています。", itemId));
      return;
    }
    const sourceRecordId = String(plan.sourceRecordId || "");
    const actualRecordId = String(plan.actualRecordId || "");
    if (sourceRecordId && !recordIds.has(sourceRecordId)) {
      issues.push(issue("WARNING", "PLAN_SOURCE_RECORD_MISSING", "plans", "予定の元になった記録がバックアップ内にありません。予定自体は復元できます。", itemId));
    }
    if (actualRecordId && !recordIds.has(actualRecordId)) {
      issues.push(issue("WARNING", "PLAN_ACTUAL_RECORD_MISSING", "plans", "予定に結び付いた実績記録がバックアップ内にありません。予定自体は復元できます。", itemId));
    }
    deepFiniteNumbers(plan, "", issues, "plans", itemId);
  });
}

function inspectCourses(courses, issues) {
  addDuplicateIssues(courses, (item) => item?.id, "courses", "保存したコース", issues);
  (courses || []).forEach((item, index) => {
    const itemId = String(item?.id || `#${index + 1}`);
    if (!isObject(item) || !item.id) {
      issues.push(issue("BLOCKING", "COURSE_ID_REQUIRED", "courses", "保存したコースの識別子が不足しています。", itemId));
      return;
    }
    const validation = validateCoursePresetInput(item.course || item);
    if (!validation.ok) {
      issues.push(issue("BLOCKING", "COURSE_SCHEMA_INVALID", "courses", "保存したコースの値が現在の形式に適合しません。", itemId, { code: validation.code }));
    }
    deepFiniteNumbers(item, "", issues, "courses", itemId);
  });
}

function collection(snapshot, key, fallback) {
  if (!Object.prototype.hasOwnProperty.call(snapshot.data, key) || snapshot.data[key] == null) return fallback;
  return snapshot.data[key];
}

function inspectBackupSnapshot(snapshot, backupFormatVersion) {
  const issues = [];
  if (!isObject(snapshot)) {
    return Object.freeze({ ok: false, status: RESTORE_STATUS.blocked, canRestore: false, issues: Object.freeze([
      issue("BLOCKING", "BACKUP_OBJECT_REQUIRED", "backup", "バックアップの内容を確認できません。"),
    ]) });
  }
  if (snapshot.formatVersion !== backupFormatVersion) {
    issues.push(issue("BLOCKING", "BACKUP_VERSION_UNSUPPORTED", "backup", "対応していないバックアップ形式です。"));
  }
  if (!isObject(snapshot.data)) {
    issues.push(issue("BLOCKING", "BACKUP_DATA_REQUIRED", "backup", "バックアップにデータ領域がありません。"));
    return Object.freeze({ ok: false, status: RESTORE_STATUS.blocked, canRestore: false, issues: Object.freeze(issues) });
  }
  const unexpectedKeys = Object.keys(snapshot.data).filter((key) => !USER_DATA_STORAGE_KEYS.includes(key));
  if (unexpectedKeys.length) {
    issues.push(issue("BLOCKING", "BACKUP_UNKNOWN_STORAGE_KEY", "backup", "バックアップに現在のアプリで扱えない保存領域があります。"));
  }

  const records = collection(snapshot, STORAGE_KEYS.records, []);
  const v27Results = collection(snapshot, STORAGE_KEYS.modelResultsV27, []);
  const regionalResults = collection(snapshot, STORAGE_KEYS.modelResultsRegionalV2, []);
  const feedback = collection(snapshot, STORAGE_KEYS.subjectiveFeedback, []);
  const plans = collection(snapshot, STORAGE_KEYS.plans, []);
  const profile = collection(snapshot, STORAGE_KEYS.profile, null);
  const settings = collection(snapshot, STORAGE_KEYS.settings, null);
  const draft = collection(snapshot, STORAGE_KEYS.draft, null);
  const courses = collection(snapshot, STORAGE_KEYS.courses, []);
  const secondPillarRofJ = collection(snapshot, STORAGE_KEYS.secondPillarRofJ, null);
  const secondPillarRofJLifecycle = collection(snapshot, STORAGE_KEYS.secondPillarRofJLifecycle, null);

  if (secondPillarRofJ != null) {
    const validEnvelope = isObject(secondPillarRofJ)
      && secondPillarRofJ.schemaVersion === "RUNLOAD_SECOND_PILLAR_ROFJ_STORAGE_V1"
      && isObject(secondPillarRofJ.entries);
    if (!validEnvelope) {
      issues.push(issue("BLOCKING", "ROF_J_STORAGE_INVALID", "secondPillarRofJ", "第二柱ROF-J保存領域の形式が正しくありません。"));
    } else {
      const allowedRevisionTypes = new Set(["INITIAL_MEASUREMENT", "CORRECTION", "LATER_REFLECTION"]);
      const validRofValue = (value) => Number.isInteger(value) && value >= 0 && value <= 10;
      const validTime = (value) => typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
      Object.entries(secondPillarRofJ.entries).forEach(([runId, entry]) => {
        const itemId = String(runId || "");
        if (!isObject(entry) || entry.runId !== runId) {
          issues.push(issue("BLOCKING", "ROF_J_RUN_ENTRY_INVALID", "secondPillarRofJ", "第二柱ROF-J記録の走行識別子が一致しません。", itemId));
          return;
        }
        if (entry.instrumentId !== "ROF_J"
          || entry.instrumentSemanticVersion !== "ROF_J_SUZUKI_ARAI_2026_RUNLOAD_V1"
          || entry.japaneseSourceSha256 !== "f25d0d4cf09f603cb66984606cfdb8e716781ba106f0da44dfa276515838acf8"
          || entry.visualSourceId !== "ROF_ORIGINAL_2017") {
          issues.push(issue("BLOCKING", "ROF_J_SEMANTIC_PROVENANCE_INVALID", "secondPillarRofJ", "第二柱ROF-J記録の尺度・出典情報が現在の仕様と一致しません。", itemId));
        }
        if (!isObject(entry.measurements)) {
          issues.push(issue("BLOCKING", "ROF_J_MEASUREMENTS_INVALID", "secondPillarRofJ", "第二柱ROF-J測定記録の形式が正しくありません。", itemId));
          return;
        }
        ["PRE_RUN", "POST_RUN"].forEach((phase) => {
          const measurement = entry.measurements[phase];
          if (measurement == null) return;
          if (!isObject(measurement) || measurement.phase !== phase || !Array.isArray(measurement.revisions) || measurement.revisions.length === 0) {
            issues.push(issue("BLOCKING", "ROF_J_MEASUREMENT_INVALID", "secondPillarRofJ", "第二柱ROF-J測定記録の形式が正しくありません。", `${itemId}:${phase}`));
            return;
          }
          const initialCount = measurement.revisions.filter((revision) => revision?.revisionType === "INITIAL_MEASUREMENT").length;
          if (initialCount !== 1) {
            issues.push(issue("BLOCKING", "ROF_J_INITIAL_REVISION_INVALID", "secondPillarRofJ", "第二柱ROF-J初回測定の履歴を確認できません。", `${itemId}:${phase}`));
          }
          measurement.revisions.forEach((revision) => {
            if (!isObject(revision) || !validRofValue(revision.value) || !validTime(revision.recordedAt) || !allowedRevisionTypes.has(revision.revisionType)) {
              issues.push(issue("BLOCKING", "ROF_J_REVISION_INVALID", "secondPillarRofJ", "第二柱ROF-J修正履歴の値・日時・種別を確認できません。", `${itemId}:${phase}`));
            }
          });
          if (!measurement.revisions.some((revision) => revision?.revisionId === measurement.effectiveRevisionId)) {
            issues.push(issue("BLOCKING", "ROF_J_EFFECTIVE_REVISION_INVALID", "secondPillarRofJ", "第二柱ROF-Jの有効測定を特定できません。", `${itemId}:${phase}`));
          }
        });
      });
    }
  }
  if (secondPillarRofJLifecycle != null) {
    const validLifecycle = isObject(secondPillarRofJLifecycle)
      && secondPillarRofJLifecycle.schemaVersion === "RUNLOAD_SECOND_PILLAR_ROFJ_LIFECYCLE_V1"
      && isObject(secondPillarRofJLifecycle.pendingByRunId);
    if (!validLifecycle) issues.push(issue("BLOCKING", "ROF_J_LIFECYCLE_STORAGE_INVALID", "secondPillarRofJLifecycle", "第二柱ROF-J入力途中領域の形式が正しくありません。"));
  }

  const expectedArrays = [
    [records, "records", "走行・休養記録"],
    [v27Results, "v27Results", "走行全体の保存済み結果"],
    [regionalResults, "regionalResults", "部位別の保存済み結果"],
    [feedback, "subjectiveFeedback", "本人入力"],
    [plans, "plans", "予定"],
    [courses, "courses", "保存したコース"],
  ];
  expectedArrays.forEach(([value, area, label]) => {
    if (!Array.isArray(value)) issues.push(issue("BLOCKING", "COLLECTION_SHAPE_INVALID", area, `${label}が一覧形式ではありません。`));
  });
  [[profile, "profile", "プロフィール"], [settings, "settings", "設定"], [draft, "draft", "入力途中"]].forEach(([value, area, label]) => {
    if (value != null && !isObject(value)) issues.push(issue("BLOCKING", "OBJECT_SHAPE_INVALID", area, `${label}の形式が正しくありません。`));
  });

  const recordsWithinLimit = withinCollectionLimit(records, INPUT_LIMITS.portableRecords, "records", "走行・休養記録", issues);
  const v27WithinLimit = withinCollectionLimit(v27Results, INPUT_LIMITS.portableModelResults, "v27Results", "走行全体の保存済み結果", issues);
  const regionalWithinLimit = withinCollectionLimit(regionalResults, INPUT_LIMITS.portableModelResults, "regionalResults", "部位別の保存済み結果", issues);
  const feedbackWithinLimit = withinCollectionLimit(feedback, INPUT_LIMITS.portableFeedbackEntries, "subjectiveFeedback", "本人入力", issues);
  const plansWithinLimit = withinCollectionLimit(plans, INPUT_LIMITS.portablePlans, "plans", "予定", issues);
  const coursesWithinLimit = withinCollectionLimit(courses, INPUT_LIMITS.portableCourses, "courses", "保存したコース", issues);

  if (recordsWithinLimit) inspectRecords(records, issues);
  const recordIds = new Set(recordsWithinLimit ? records.map((item) => String(item?.id || "")).filter(Boolean) : []);
  if (v27WithinLimit) inspectV27Results(v27Results, recordIds, issues);
  if (regionalWithinLimit) inspectRegionalResults(regionalResults, recordIds, issues);
  if (feedbackWithinLimit) inspectFeedback(feedback, recordIds, issues);
  if (plansWithinLimit) inspectPlans(plans, recordIds, issues);
  if (coursesWithinLimit) inspectCourses(courses, issues);

  if (profile != null) {
    const version = Number(profile.schemaVersion || 0);
    if (!Number.isFinite(version) || version !== PERSONAL_PROFILE_SCHEMA_VERSION) {
      issues.push(issue("BLOCKING", "PROFILE_VERSION_UNSUPPORTED", "profile", "このアプリで作成されたプロフィール形式ではありません。"));
    }
  }
  deepFiniteNumbers(profile, "", issues, "profile", "profile");
  deepFiniteNumbers(settings, "", issues, "settings", "settings");
  deepFiniteNumbers(draft, "", issues, "draft", "draft");

  const blockingCount = issues.filter((item) => item.severity === "BLOCKING").length;
  const warningCount = issues.filter((item) => item.severity === "WARNING").length;
  const status = blockingCount
    ? RESTORE_STATUS.blocked
    : warningCount
      ? RESTORE_STATUS.review
      : RESTORE_STATUS.supported;
  const counts = Object.freeze({
    records: Array.isArray(records) ? records.length : 0,
    subjectiveFeedback: Array.isArray(feedback) ? feedback.length : 0,
    v27Results: Array.isArray(v27Results) ? v27Results.length : 0,
    regionalResults: Array.isArray(regionalResults) ? regionalResults.length : 0,
    plans: Array.isArray(plans) ? plans.length : 0,
    courses: Array.isArray(courses) ? courses.length : 0,
    profile: profile == null ? 0 : 1,
    settings: settings == null ? 0 : 1,
    draft: draft == null ? 0 : 1,
  });
  return Object.freeze({
    ok: blockingCount === 0,
    inspectionVersion: RESTORE_INSPECTION_VERSION,
    formatVersion: String(snapshot.formatVersion || ""),
    createdAt: String(snapshot.createdAt || ""),
    status,
    canRestore: status !== RESTORE_STATUS.blocked,
    requiresAcknowledgement: status === RESTORE_STATUS.review,
    counts,
    summary: Object.freeze({ blockingCount, warningCount }),
    issues: Object.freeze(issues),
    snapshot,
  });
}
__exp["RESTORE_INSPECTION_VERSION"] = RESTORE_INSPECTION_VERSION;
__exp["RESTORE_STATUS"] = RESTORE_STATUS;
__exp["inspectBackupSnapshot"] = inspectBackupSnapshot;
__mods[41] = __exp;
}

// ===== core/storage/backupService.js =====
{
const __exp = Object.create(null);
const { INPUT_LIMITS, parseJsonText } = __mods[6];
const { inspectBackupSnapshot, RESTORE_STATUS } = __mods[41];
const { STORAGE_KEYS, USER_DATA_STORAGE_KEYS } = __mods[1];

const BACKUP_FORMAT_VERSION = "runner-load-app-new-backup-v1";

function blockedInspection(code, message, details = {}) {
  return Object.freeze({
    ok: false,
    status: RESTORE_STATUS.blocked,
    canRestore: false,
    requiresAcknowledgement: false,
    counts: Object.freeze({}),
    summary: Object.freeze({ blockingCount: 1, warningCount: 0 }),
    issues: Object.freeze([Object.freeze({
      severity: "BLOCKING",
      code,
      area: "backup",
      message,
      itemId: "",
      details: Object.freeze({ ...details }),
    })]),
  });
}

function createRestoreChanges(snapshot) {
  return USER_DATA_STORAGE_KEYS.map((key) => {
    if (!Object.prototype.hasOwnProperty.call(snapshot.data, key) || snapshot.data[key] == null) {
      return { key, remove: true };
    }
    return { key, value: snapshot.data[key] };
  });
}

function createBackupService(gateway) {
  function tryCreateBackupSnapshot() {
    const data = {};
    for (const key of USER_DATA_STORAGE_KEYS) {
      const result = gateway.readJsonResult(key, null);
      if (!result.ok) {
        return {
          ok: false,
          code: result.operation === "parse" ? "BACKUP_SOURCE_DATA_CORRUPT" : "BACKUP_SOURCE_READ_FAILED",
          message: result.operation === "parse"
            ? "端末内データの一部を読み取れないため、バックアップを作成できません。"
            : "端末内データへアクセスできないため、バックアップを作成できません。",
          key,
          cause: result,
        };
      }
      data[key] = result.value;
    }
    return {
      ok: true,
      snapshot: Object.freeze({
        formatVersion: BACKUP_FORMAT_VERSION,
        createdAt: new Date().toISOString(),
        data,
      }),
    };
  }

  function createBackupSnapshot() {
    const result = tryCreateBackupSnapshot();
    if (!result.ok) {
      const error = Object.assign(new Error(result.message), result);
      throw error;
    }
    return result.snapshot;
  }

  function tryExportBackupText() {
    const result = tryCreateBackupSnapshot();
    if (!result.ok) return result;
    try {
      return { ok: true, snapshot: result.snapshot, text: JSON.stringify(result.snapshot, null, 2) };
    } catch (error) {
      return {
        ok: false,
        code: "BACKUP_SERIALIZE_FAILED",
        message: "バックアップファイルを作成できませんでした。",
        cause: error,
      };
    }
  }

  function exportBackupText() {
    const result = tryExportBackupText();
    if (!result.ok) {
      const error = Object.assign(new Error(result.message), result);
      throw error;
    }
    return result.text;
  }

  function inspectBackupText(text) {
    const parsed = parseJsonText(text);
    if (!parsed.ok) {
      return blockedInspection(
        parsed.code || "BACKUP_JSON_INVALID",
        parsed.message || "JSONファイルを読み取れませんでした。",
        parsed.details || {},
      );
    }
    return inspectBackupSnapshot(parsed.value, BACKUP_FORMAT_VERSION);
  }

  async function inspectBackupFile(file) {
    if (!file || typeof file.text !== "function") {
      return blockedInspection("BACKUP_FILE_REQUIRED", "バックアップファイルを選択してください。");
    }
    const size = Number(file.size);
    if (Number.isFinite(size) && size > INPUT_LIMITS.backupBytes) {
      return blockedInspection("JSON_TOO_LARGE", "バックアップが大きすぎます。", {
        bytes: size,
        maximumBytes: INPUT_LIMITS.backupBytes,
      });
    }
    try {
      return inspectBackupText(await file.text());
    } catch (error) {
      return blockedInspection("BACKUP_FILE_READ_FAILED", "バックアップファイルを読み取れませんでした。", {
        message: String(error?.message || error || "file_read_failed"),
      });
    }
  }

  function validateBackupSnapshot(snapshot) {
    return inspectBackupSnapshot(snapshot, BACKUP_FORMAT_VERSION);
  }

  function restoreInspectedBackup(inspection, options = {}) {
    if (!inspection || inspection.inspectionVersion !== "runload-restore-inspection-v1" || !inspection.snapshot) {
      return { ok: false, code: "RESTORE_INSPECTION_REQUIRED", message: "復元前の検査をやり直してください。" };
    }
    const freshInspection = inspectBackupSnapshot(inspection.snapshot, BACKUP_FORMAT_VERSION);
    if (!freshInspection.canRestore) {
      return { ok: false, code: "BACKUP_RESTORE_BLOCKED", message: "復元できない問題があります。", inspection: freshInspection };
    }
    if (freshInspection.requiresAcknowledgement && options.acceptReview !== true) {
      return { ok: false, code: "BACKUP_REVIEW_ACK_REQUIRED", message: "要確認の内容を確認してください。", inspection: freshInspection };
    }

    const previousResult = tryCreateBackupSnapshot();
    if (!previousResult.ok) {
      return {
        ok: false,
        code: "PRE_RESTORE_BACKUP_FAILED",
        message: "現在の端末内データを安全に退避できないため、復元を中止しました。",
        cause: previousResult,
      };
    }
    const changes = createRestoreChanges(freshInspection.snapshot);
    changes.push({ key: STORAGE_KEYS.historyUndo, remove: true });
    changes.push({
      key: STORAGE_KEYS.backups,
      value: [{
        id: `backup-before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`,
        label: "復元前の自動バックアップ",
        createdAt: new Date().toISOString(),
        snapshot: previousResult.snapshot,
      }],
    });
    const result = gateway.transact(changes);
    return {
      ...result,
      restoredFormatVersion: freshInspection.formatVersion,
      restoreStatus: freshInspection.status,
      counts: freshInspection.counts,
    };
  }

  function restoreBackupText(text) {
    const inspection = inspectBackupText(text);
    if (!inspection.canRestore) {
      return { ok: false, code: "BACKUP_RESTORE_BLOCKED", message: inspection.issues?.[0]?.message || "復元できませんでした。", inspection };
    }
    return restoreInspectedBackup(inspection, { acceptReview: false });
  }

  return Object.freeze({
    createBackupSnapshot,
    tryCreateBackupSnapshot,
    exportBackupText,
    tryExportBackupText,
    inspectBackupText,
    inspectBackupFile,
    validateBackupSnapshot,
    restoreInspectedBackup,
    restoreBackupText,
  });
}
__exp["BACKUP_FORMAT_VERSION"] = BACKUP_FORMAT_VERSION;
__exp["createBackupService"] = createBackupService;
__mods[42] = __exp;
}

// ===== core/safety/publicHelpGuidance.js =====
{
const __exp = Object.create(null);
const { SUPPORT_NEXT_ACTIONS, URGENT_SAFETY_FLAGS } = __mods[29];

const PUBLIC_HELP_GUIDANCE_VERSION = "runload-public-help-guidance-v1";
const PUBLIC_HELP_GUIDANCE_REVIEW_DATE = "2026-08-01";

const PUBLIC_FLAG_LABELS = Object.freeze({
  chestPainOrPressure: "胸の痛み・圧迫感",
  breathingDifficulty: "強い息苦しさ",
  faintingOrConfusion: "失神・意識の混乱",
  heavyBleeding: "大量の出血",
  deformityOrMajorTrauma: "変形または大きな外傷",
});

const OFFICIAL_HELP_REFERENCES = Object.freeze([
  Object.freeze({
    id: "MHLW-URGENCY-119",
    label: "厚生労働省『こんな時は迷わず119へ』",
    url: "https://kakarikata.mhlw.go.jp/kakaritsuke/urgency.html",
    purpose: "119番を検討する症状例の確認",
  }),
  Object.freeze({
    id: "FDMA-119-CALL",
    label: "総務省消防庁『119番緊急通報』",
    url: "https://www.fdma.go.jp/mission/enrichment/kyukyumusen_kinkyutuhou/119.html",
    purpose: "119番通報の方法の確認",
  }),
  Object.freeze({
    id: "FDMA-7119",
    label: "総務省消防庁『救急安心センター事業 #7119』",
    url: "https://www.fdma.go.jp/mission/enrichment/appropriate/appropriate007.html",
    purpose: "救急車を呼ぶか迷う場合の相談窓口と対応地域の確認",
  }),
  Object.freeze({
    id: "FDMA-QSUKE",
    label: "総務省消防庁『全国版救急受診アプリ Q助』",
    url: "https://www.fdma.go.jp/mission/enrichment/appropriate/appropriate003.html",
    purpose: "公式の救急受診ガイドの確認",
  }),
]);

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function buildPublicHelpGuidance(decision = {}) {
  const activeFlags = unique(Array.isArray(decision.activeSafetyFlags)
    ? decision.activeSafetyFlags.map(String)
    : []);
  const officialOverlapFlags = activeFlags.filter((flag) => URGENT_SAFETY_FLAGS.includes(flag));
  const nextActions = Array.isArray(decision.nextActions) ? decision.nextActions : [];
  const shouldPrioritize = String(decision.route || "") === "urgent"
    || nextActions.includes(SUPPORT_NEXT_ACTIONS.checkOfficialHelp);
  return Object.freeze({
    version: PUBLIC_HELP_GUIDANCE_VERSION,
    reviewedAt: PUBLIC_HELP_GUIDANCE_REVIEW_DATE,
    shouldPrioritize,
    selectedItems: Object.freeze(officialOverlapFlags.map((flag) => Object.freeze({
      id: flag,
      label: PUBLIC_FLAG_LABELS[flag] || flag,
    }))),
    references: OFFICIAL_HELP_REFERENCES,
    runtimeRequiresNetwork: false,
    externalLinksOptional: true,
    diagnosisPerformed: false,
    urgencyDeterminedByApp: false,
  });
}
__exp["PUBLIC_HELP_GUIDANCE_VERSION"] = PUBLIC_HELP_GUIDANCE_VERSION;
__exp["PUBLIC_HELP_GUIDANCE_REVIEW_DATE"] = PUBLIC_HELP_GUIDANCE_REVIEW_DATE;
__exp["OFFICIAL_HELP_REFERENCES"] = OFFICIAL_HELP_REFERENCES;
__exp["buildPublicHelpGuidance"] = buildPublicHelpGuidance;
__mods[43] = __exp;
}

// ===== core/model/v27/v27Personal.js =====
{
const __exp = Object.create(null);
const { V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS, V27_MODEL_VERSION } = __mods[12];
const { isFiniteNumber, median, requirePositiveFinite } = __mods[38];

function deriveV27PersonalCadenceDelta({
  targetSessionId,
  currentSpeedMps,
  currentCadenceSpm,
  currentCadenceProvenanceReliable,
  priorRecords = [],
  speedToleranceMps = V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS,
}) {
  requirePositiveFinite(speedToleranceMps, "speedToleranceMps");
  if (
    !isFiniteNumber(currentCadenceSpm)
    || currentCadenceSpm <= 0
    || !currentCadenceProvenanceReliable
  ) {
    return Object.freeze({
      state: "NOT_APPLICABLE",
      eligible_n: 0,
      expected_cadence_spm: null,
      delta_spm: null,
    });
  }
  const eligible = priorRecords.filter((item) => (
    item.session_id !== targetSessionId
    && item.model_version === V27_MODEL_VERSION
    && item.activity_type === "CONTINUOUS_RUN"
    && item.cadence_provenance_reliable === true
    && isFiniteNumber(item.speed_mps)
    && isFiniteNumber(item.cadence_spm)
    && item.cadence_spm > 0
    && Math.abs(item.speed_mps - currentSpeedMps) <= speedToleranceMps
  ));
  if (eligible.length < 3) {
    return Object.freeze({
      state: "BUILDING_REFERENCE",
      eligible_n: eligible.length,
      expected_cadence_spm: null,
      delta_spm: null,
    });
  }
  const expected = median(eligible.map((item) => item.cadence_spm));
  return Object.freeze({
    state: "AVAILABLE",
    eligible_n: eligible.length,
    expected_cadence_spm: expected,
    delta_spm: currentCadenceSpm - expected,
    speed_tolerance_mps: speedToleranceMps,
  });
}

function deriveV27PersonalCadenceSensitivity(input) {
  const tolerances = [0.05, 0.1, 0.15];
  const byTolerance = Object.fromEntries(tolerances.map((tolerance) => [
    String(tolerance),
    deriveV27PersonalCadenceDelta({ ...input, speedToleranceMps: tolerance }),
  ]));
  const central = byTolerance["0.1"];
  const allAvailable = Object.values(byTolerance).every((item) => item.state === "AVAILABLE");
  const robustnessState = allAvailable
    ? "ROBUST_ACROSS_DECLARED_TOLERANCES"
    : central.state === "AVAILABLE"
      ? "TOLERANCE_DEPENDENT"
      : "UNAVAILABLE_AT_CENTRAL_TOLERANCE";
  return Object.freeze({
    central,
    by_tolerance_mps: Object.freeze(byTolerance),
    robustness_state: robustnessState,
  });
}

function calculateV27PersonalRelative({
  targetSessionId,
  currentRegionResult,
  priorResults = [],
}) {
  const eligible = priorResults.filter((item) => (
    item.session_id !== targetSessionId
    && item.model_version === V27_MODEL_VERSION
    && item.coverage_signature === currentRegionResult.coverage_signature
    && isFiniteNumber(item.raw_exposure)
    && item.raw_exposure > 0
  ));
  if (eligible.length < 3) {
    return Object.freeze({
      state: "BUILDING_REFERENCE",
      eligible_n: eligible.length,
      value: null,
    });
  }
  const referenceMedian = median(eligible.map((item) => item.raw_exposure));
  const sortedDates = eligible
    .map((item) => item.date)
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")))
    .sort();
  return Object.freeze({
    state: eligible.length < 6 ? "PROVISIONAL" : "AVAILABLE",
    eligible_n: eligible.length,
    reference_median: referenceMedian,
    value: 100 * currentRegionResult.raw_exposure / referenceMedian,
    reference_revision_ids: Object.freeze(eligible.map((item) => item.result_id || item.session_id)),
    first_date: sortedDates[0] || null,
    last_date: sortedDates.at(-1) || null,
    target_excluded: eligible.every((item) => item.session_id !== targetSessionId),
  });
}
__exp["deriveV27PersonalCadenceDelta"] = deriveV27PersonalCadenceDelta;
__exp["deriveV27PersonalCadenceSensitivity"] = deriveV27PersonalCadenceSensitivity;
__exp["calculateV27PersonalRelative"] = calculateV27PersonalRelative;
__mods[44] = __exp;
}

// ===== core/model/v27/v27InputAdapter.js =====
{
const __exp = Object.create(null);
const { V27_ACTIVITY_TYPES, V27_MODEL_VERSION, V27_SURFACE_FACTORS } = __mods[12];
const { deriveV27PersonalCadenceSensitivity } = __mods[44];
const { reportedRpeValue } = __mods[8];

const GRADE_KNOWLEDGE = new Set(["UNKNOWN", "KNOWN_FLAT", "KNOWN_PROFILE"]);
const ACTIVITY_FORMATS = new Set(Object.values(V27_ACTIVITY_TYPES));
const RELIABLE_CADENCE_SOURCES = new Set(["DEVICE_MEASURED", "DEVICE_SYNCED"]);

function optionalFiniteNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function explicitActivityFormat(record) {
  const value = String(record.runningFormat || "UNKNOWN").toUpperCase();
  return ACTIVITY_FORMATS.has(value) ? value : "UNKNOWN";
}

function createGradeProfile(course, errors, warnings) {
  let knowledge = String(course.gradeKnowledge || "UNKNOWN").toUpperCase();
  if (!GRADE_KNOWLEDGE.has(knowledge)) {
    errors.push({ field: "gradeKnowledge", code: "INVALID_GRADE_KNOWLEDGE" });
    knowledge = "UNKNOWN";
  }
  if (knowledge === "UNKNOWN") {
    const hasUnappliedGradeValues = [
      course.upPercent,
      course.downPercent,
      course.upGradePercent,
      course.downGradePercent,
    ].some((value) => Number(value || 0) !== 0);
    if (hasUnappliedGradeValues) {
      warnings.push({
        field: "course",
        code: "GRADE_VALUES_NOT_APPLIED_WITHOUT_KNOWLEDGE_STATE",
      });
    }
    return [{ share_pct: 100, grade_pct: null }];
  }
  if (knowledge === "KNOWN_FLAT") {
    return [{ share_pct: 100, grade_pct: 0 }];
  }

  const upShare = optionalFiniteNumber(course.upPercent);
  const downShare = optionalFiniteNumber(course.downPercent);
  const upGrade = optionalFiniteNumber(course.upGradePercent);
  const downGrade = optionalFiniteNumber(course.downGradePercent);
  const values = [
    ["upPercent", upShare],
    ["downPercent", downShare],
    ["upGradePercent", upGrade],
    ["downGradePercent", downGrade],
  ];
  values.forEach(([field, value]) => {
    if (!Number.isFinite(value) || value < 0) {
      errors.push({ field, code: "INVALID_GRADE_PROFILE_VALUE" });
    }
  });
  if (errors.length) return [{ share_pct: 100, grade_pct: null }];
  if (upShare > 100 || downShare > 100 || upShare + downShare > 100) {
    errors.push({ field: "course", code: "GRADE_SHARE_SUM_EXCEEDS_100" });
    return [{ share_pct: 100, grade_pct: null }];
  }
  if (upShare > 0 && upGrade <= 0) {
    errors.push({ field: "upGradePercent", code: "UPHILL_REQUIRES_POSITIVE_GRADE" });
  }
  if (downShare > 0 && downGrade <= 0) {
    errors.push({ field: "downGradePercent", code: "DOWNHILL_REQUIRES_POSITIVE_MAGNITUDE" });
  }
  if (errors.length) return [{ share_pct: 100, grade_pct: null }];
  const flatShare = 100 - upShare - downShare;
  return [
    ...(flatShare > 0 ? [{ share_pct: flatShare, grade_pct: 0 }] : []),
    ...(upShare > 0 ? [{ share_pct: upShare, grade_pct: upGrade }] : []),
    ...(downShare > 0 ? [{ share_pct: downShare, grade_pct: -downGrade }] : []),
  ];
}

function createSurfaceProfile(course, errors) {
  if (Array.isArray(course.modelSurfaceProfile) && course.modelSurfaceProfile.length) {
    const profile = course.modelSurfaceProfile.map((item, index) => {
      const share = optionalFiniteNumber(item.sharePercent);
      const surfaceClass = String(item.surfaceClass || "UNKNOWN");
      if (!Number.isFinite(share) || share < 0 || share > 100) {
        errors.push({ field: `modelSurfaceProfile.${index}`, code: "INVALID_SURFACE_SHARE" });
      }
      if (!V27_SURFACE_FACTORS[surfaceClass]) {
        errors.push({ field: `modelSurfaceProfile.${index}`, code: "INVALID_SURFACE_CLASS" });
      }
      return { share_pct: share, surface_class: surfaceClass };
    });
    if (
      profile.every((item) => Number.isFinite(item.share_pct))
      && Math.abs(profile.reduce((sum, item) => sum + item.share_pct, 0) - 100) > 0.01
    ) {
      errors.push({ field: "modelSurfaceProfile", code: "SURFACE_SHARE_SUM_NOT_100" });
    }
    return profile;
  }
  const surfaceClass = String(course.modelSurfaceClass || "UNKNOWN");
  if (!V27_SURFACE_FACTORS[surfaceClass]) {
    errors.push({ field: "modelSurfaceClass", code: "INVALID_SURFACE_CLASS" });
    return [{ share_pct: 100, surface_class: "UNKNOWN" }];
  }
  return [{ share_pct: 100, surface_class: surfaceClass }];
}

function createOrderedSections(course, errors) {
  if (!Array.isArray(course.sections) || !course.sections.length) return null;
  const sections = course.sections.map((item, index) => {
    const distance = optionalFiniteNumber(item.distanceKm);
    const grade = optionalFiniteNumber(item.gradePercent);
    const surfaceClass = String(item.surfaceClass || "UNKNOWN");
    if (!Number.isFinite(distance) || distance <= 0) {
      errors.push({ field: `sections.${index}.distanceKm`, code: "INVALID_SECTION_DISTANCE" });
    }
    if (grade !== null && !Number.isFinite(grade)) {
      errors.push({ field: `sections.${index}.gradePercent`, code: "INVALID_SECTION_GRADE" });
    }
    if (!V27_SURFACE_FACTORS[surfaceClass]) {
      errors.push({ field: `sections.${index}.surfaceClass`, code: "INVALID_SURFACE_CLASS" });
    }
    return {
      distance_km: distance,
      grade_pct: grade,
      surface_class: surfaceClass,
    };
  });
  return sections;
}

function readCadence(record, durationMinutes) {
  const source = String(record.cadenceProvenance || record.stepsProvenance || "UNKNOWN").toUpperCase();
  const directCadence = optionalFiniteNumber(record.cadenceSpm);
  const steps = optionalFiniteNumber(record.steps);
  const cadence = Number.isFinite(directCadence) && directCadence > 0
    ? directCadence
    : Number.isFinite(steps) && steps > 0 && durationMinutes > 0
      ? steps / durationMinutes
      : null;
  return Object.freeze({
    cadence_spm: cadence,
    source,
    reliable: cadence != null && RELIABLE_CADENCE_SOURCES.has(source),
    derivation: Number.isFinite(directCadence) && directCadence > 0
      ? "MEASURED_CADENCE"
      : cadence != null
        ? "RELIABLE_STEPS_DIVIDED_BY_ACTIVE_MINUTES"
        : "UNAVAILABLE",
  });
}

function adaptRecordToV27Session(record, { priorCadenceFacts = [] } = {}) {
  const errors = [];
  const warnings = [];
  if (String(record.activityType || "").toLowerCase() === "rest") {
    return Object.freeze({
      ok: true,
      state: "REST",
      errors: Object.freeze([]),
      warnings: Object.freeze([]),
      session: null,
      provenance: Object.freeze({ model_version: V27_MODEL_VERSION }),
    });
  }
  const distance = optionalFiniteNumber(record.distanceKm);
  const duration = optionalFiniteNumber(record.durationMinutes);
  if (!Number.isFinite(distance) || distance <= 0) {
    errors.push({ field: "distanceKm", code: "DISTANCE_REQUIRED_POSITIVE" });
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    errors.push({ field: "durationMinutes", code: "ACTIVE_DURATION_REQUIRED_POSITIVE" });
  }
  const course = record.course && typeof record.course === "object" ? record.course : {};
  const sections = createOrderedSections(course, errors);
  if (
    sections
    && sections.every((section) => Number.isFinite(section.distance_km))
    && Number.isFinite(distance)
    && Math.abs(sections.reduce((sum, section) => sum + section.distance_km, 0) - distance) > 0.01
  ) {
    errors.push({ field: "sections", code: "SECTION_DISTANCE_SUM_MISMATCH" });
  }
  const gradeProfile = sections ? null : createGradeProfile(course, errors, warnings);
  const surfaceProfile = sections ? null : createSurfaceProfile(course, errors);
  const activityType = explicitActivityFormat(record);
  const rpe = reportedRpeValue(record);
  if (rpe != null && (!Number.isFinite(rpe) || rpe < 0 || rpe > 10)) {
    errors.push({ field: "perceivedExertion", code: "INVALID_RPE" });
  }
  if (errors.length) {
    return Object.freeze({
      ok: false,
      state: "INVALID",
      errors: Object.freeze(errors),
      warnings: Object.freeze(warnings),
      session: null,
      provenance: null,
    });
  }

  const speedMps = distance * 1000 / (duration * 60);
  const cadence = readCadence(record, duration);
  const cadenceSensitivity = deriveV27PersonalCadenceSensitivity({
    targetSessionId: record.id,
    currentSpeedMps: speedMps,
    currentCadenceSpm: cadence.cadence_spm,
    currentCadenceProvenanceReliable: cadence.reliable,
    priorRecords: priorCadenceFacts,
  });
  const session = Object.freeze({
    session_id: String(record.id || ""),
    distance_km: distance,
    active_minutes: duration,
    ...(sections ? { sections: Object.freeze(sections) } : {
      grade_profile: Object.freeze(gradeProfile),
      surface_profile: Object.freeze(surfaceProfile),
    }),
    activity_type: activityType,
    rpe,
    cadence_delta_spm: cadenceSensitivity.central.delta_spm,
    cadence_provenance_reliable: cadence.reliable,
    cadence_reference_n: cadenceSensitivity.central.eligible_n,
    cadence_robustness_state: cadenceSensitivity.robustness_state,
  });
  return Object.freeze({
    ok: true,
    state: "RUN",
    errors: Object.freeze([]),
    warnings: Object.freeze(warnings),
    session,
    provenance: Object.freeze({
      model_version: V27_MODEL_VERSION,
      distance_source: "USER_RECORDED",
      active_duration_source: "USER_RECORDED",
      speed_source: "DERIVED_DISTANCE_ACTIVE_DURATION",
      speed_mps: speedMps,
      activity_type_source: activityType === "UNKNOWN" ? "UNKNOWN" : "USER_SELECTED",
      cadence_source: cadence.source,
      cadence_derivation: cadence.derivation,
      cadence_spm: cadence.cadence_spm,
      cadence_sensitivity: cadenceSensitivity,
      grade_representation: sections ? "PAIRED_ORDERED_SECTIONS" : "MARGINAL_PROFILE",
      surface_representation: sections ? "PAIRED_ORDERED_SECTIONS" : "MARGINAL_PROFILE",
      unknown_not_replaced: true,
      no_silent_normalization: true,
    }),
  });
}
__exp["adaptRecordToV27Session"] = adaptRecordToV27Session;
__mods[45] = __exp;
}

// ===== core/model/v27/v27ResultService.js =====
{
const __exp = Object.create(null);
const { V27_EMPHASIS_REGION_IDS, V27_MODEL_VERSION, V27_REGIONAL_VIEW_IDS } = __mods[12];
const { adaptRecordToV27Session } = __mods[45];
const { assertV27ResultSemantics, calculateV27Session } = __mods[39];
const { calculateV27PersonalRelative } = __mods[44];

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function recordOrder(record) {
  return `${String(record.date || "")}\u0000${String(record.id || "")}`;
}

function resultId(record) {
  return [
    "v27-result",
    String(record.id || "").replace(/[^a-zA-Z0-9._-]/g, "_"),
    String(record.updatedAt || record.createdAt || "").replace(/[^0-9A-Za-z]/g, ""),
  ].join("-");
}

function latestPriorSnapshots(targetRecord, allRecords, existingResultRecords) {
  const recordById = new Map(allRecords.map((record) => [record.id, record]));
  const targetOrder = recordOrder(targetRecord);
  const latest = new Map();
  existingResultRecords.forEach((resultRecord) => {
    const sourceRecord = recordById.get(resultRecord.record_id)
      || resultRecord.input_snapshot?.record;
    if (!sourceRecord || recordOrder(sourceRecord) >= targetOrder) return;
    const current = latest.get(resultRecord.record_id);
    if (
      !current
      || resultRecord.source_record_revision > current.source_record_revision
      || (
        resultRecord.source_record_revision === current.source_record_revision
        && resultRecord.id > current.id
      )
    ) {
      latest.set(resultRecord.record_id, resultRecord);
    }
  });
  return [...latest.values()];
}

function cadenceFacts(priorSnapshots) {
  return priorSnapshots
    .filter((snapshot) => snapshot.state === "RUN" && snapshot.derived_facts)
    .map((snapshot) => ({
      session_id: snapshot.record_id,
      model_version: snapshot.model_version,
      activity_type: snapshot.derived_facts.activity_type,
      cadence_provenance_reliable: snapshot.derived_facts.cadence_provenance_reliable,
      speed_mps: snapshot.derived_facts.speed_mps,
      cadence_spm: snapshot.derived_facts.cadence_spm,
    }));
}

function priorRegionalFacts(priorSnapshots, regionId) {
  return priorSnapshots.flatMap((snapshot) => {
    const row = snapshot.result?.regional?.[regionId];
    if (!row) return [];
    return [{
      session_id: snapshot.record_id,
      result_id: snapshot.id,
      model_version: snapshot.model_version,
      coverage_signature: row.coverage_signature,
      raw_exposure: row.raw_exposure,
      date: snapshot.input_snapshot?.record?.date || "",
    }];
  });
}

function personalReferenceSnapshots(record, result, priorSnapshots, generatedAt) {
  return Object.freeze(Object.fromEntries(V27_EMPHASIS_REGION_IDS.map((regionId) => {
    const personal = calculateV27PersonalRelative({
      targetSessionId: record.id,
      currentRegionResult: result.regional[regionId],
      priorResults: priorRegionalFacts(priorSnapshots, regionId),
    });
    return [regionId, Object.freeze({
      ...personal,
      personal_reference_snapshot_id: `${resultId(record)}-personal-${regionId}`,
      region_id: regionId,
      coverage_signature: result.regional[regionId].coverage_signature,
      generated_at_cutoff: generatedAt,
      target_session_id: record.id,
      target_excluded: true,
    })];
  })));
}

function createV27ResultRecord({
  record,
  allRecords = [],
  existingResultRecords = [],
}) {
  const generatedAt = String(record.updatedAt || record.createdAt || new Date().toISOString());
  const priorSnapshots = latestPriorSnapshots(record, allRecords, existingResultRecords);
  const adaptation = adaptRecordToV27Session(record, {
    priorCadenceFacts: cadenceFacts(priorSnapshots),
  });
  if (!adaptation.ok) {
    return Object.freeze({
      ok: false,
      code: "V27_INPUT_ADAPTATION_FAILED",
      validation: adaptation,
      resultRecord: null,
    });
  }
  if (adaptation.state === "REST") {
    return Object.freeze({
      ok: true,
      resultRecord: Object.freeze({
        id: resultId(record),
        record_id: record.id,
        source_record_revision: generatedAt,
        generated_at: generatedAt,
        model_version: V27_MODEL_VERSION,
        state: "REST",
        input_snapshot: Object.freeze({ record: cloneValue(record) }),
        result: null,
        personal_reference_snapshots: Object.freeze({}),
        view_contract: Object.freeze({
          default: V27_REGIONAL_VIEW_IDS.withinRun,
          switchable: Object.freeze(Object.values(V27_REGIONAL_VIEW_IDS)),
        }),
      }),
    });
  }

  let result;
  try {
    result = calculateV27Session(adaptation.session);
  } catch (error) {
    return Object.freeze({
      ok: false,
      code: "V27_CALCULATION_FAILED",
      message: String(error?.message || error),
      validation: adaptation,
      resultRecord: null,
    });
  }
  const semanticValidation = assertV27ResultSemantics(result);
  if (!semanticValidation.ok) {
    return Object.freeze({
      ok: false,
      code: "V27_SEMANTIC_VALIDATION_FAILED",
      validation: semanticValidation,
      resultRecord: null,
    });
  }
  const personalSnapshots = personalReferenceSnapshots(
    record,
    result,
    priorSnapshots,
    generatedAt,
  );
  return Object.freeze({
    ok: true,
    resultRecord: Object.freeze({
      id: resultId(record),
      record_id: record.id,
      source_record_revision: generatedAt,
      generated_at: generatedAt,
      model_version: V27_MODEL_VERSION,
      state: "RUN",
      input_snapshot: Object.freeze({
        record: cloneValue(record),
        session: cloneValue(adaptation.session),
        provenance: cloneValue(adaptation.provenance),
        warnings: cloneValue(adaptation.warnings),
      }),
      derived_facts: Object.freeze({
        speed_mps: adaptation.provenance.speed_mps,
        cadence_spm: adaptation.provenance.cadence_spm,
        cadence_provenance_reliable: adaptation.session.cadence_provenance_reliable,
        activity_type: adaptation.session.activity_type,
      }),
      result,
      personal_reference_snapshots: personalSnapshots,
      view_contract: Object.freeze({
        default: V27_REGIONAL_VIEW_IDS.withinRun,
        switchable: Object.freeze(Object.values(V27_REGIONAL_VIEW_IDS)),
      }),
      claims: Object.freeze({
        is_measured_physical_load: false,
        supports_absolute_regional_load_comparison: false,
        is_compositional_share: false,
        supports_medical_decision: false,
      }),
    }),
  });
}

function upsertV27ResultRecord(items, resultRecord) {
  const nextItems = [...items];
  const index = nextItems.findIndex((item) => item.id === resultRecord.id);
  if (index >= 0) nextItems[index] = resultRecord;
  else nextItems.push(resultRecord);
  return nextItems.sort((left, right) => (
    left.record_id.localeCompare(right.record_id)
    || left.source_record_revision.localeCompare(right.source_record_revision)
    || left.id.localeCompare(right.id)
  ));
}
__exp["createV27ResultRecord"] = createV27ResultRecord;
__exp["upsertV27ResultRecord"] = upsertV27ResultRecord;
__mods[46] = __exp;
}

// ===== core/workflows/recordWorkflow.js =====
{
const __exp = Object.create(null);
const { createBodyProfileSnapshot, normalizeBodyProfile } = __mods[36];
const { createV27ResultRecord, upsertV27ResultRecord } = __mods[46];
const { isPrimaryRegionalV2Record, stampCurrentRegionalModel } = __mods[4];
const { normalizeRunningRecord, validateRunningRecord, validateRunningRecordInput } = __mods[9];
const { normalizeSubjectiveFeedback } = __mods[30];
const { evaluateSupportDecision } = __mods[29];
const { STORAGE_KEYS } = __mods[1];
const { createPrimaryRegionalV2ResultRecord, upsertPrimaryRegionalV2ResultRecord, validatePrimaryRegionalV2ResultRecord, PRIMARY_REGIONAL_V2_MODEL_VERSION, LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION } = __mods[26];

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function sortRecords(records = []) {
  return [...records].sort((left, right) => (
    left.date.localeCompare(right.date) || left.id.localeCompare(right.id)
  ));
}

function sortFeedback(items = []) {
  return [...items].sort((left, right) => (
    left.date.localeCompare(right.date) || left.recordId.localeCompare(right.recordId)
  ));
}

function upsertById(items, item, getId) {
  const id = getId(item);
  const nextItems = [...items];
  const index = nextItems.findIndex((entry) => getId(entry) === id);
  if (index >= 0) nextItems[index] = item;
  else nextItems.push(item);
  return nextItems;
}

function regionalResultCreatorForRecord() { return createPrimaryRegionalV2ResultRecord; }

function regionalModelVersionForRecord(record = {}) {
  const stamped = String(record?.regionalModelSnapshot?.modelVersion || "");
  return stamped === LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION ? LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION : PRIMARY_REGIONAL_V2_MODEL_VERSION;
}

function storedRegionalResultForRecord(repository, record = {}) {
  const expectedVersion = regionalModelVersionForRecord(record);
  const rows = repository?.loadForRecord?.(record.id) || [];
  return [...rows]
    .filter((item) => item?.model_version === expectedVersion)
    .sort((left, right) => (
      String(right.source_record_revision || "").localeCompare(String(left.source_record_revision || ""))
      || String(right.generated_at || "").localeCompare(String(left.generated_at || ""))
      || String(right.id || "").localeCompare(String(left.id || ""))
    ))[0] || null;
}

function createModelExperience(
  records,
  subjectiveFeedback,
  targetRecordId,
  modelResultV27Repository,
  modelResultRegionalV2Repository,
) {
  const sortedRecords = sortRecords(records);
  const index = sortedRecords.findIndex((record) => record.id === targetRecordId);
  if (index < 0) return null;
  const record = sortedRecords[index];
  const v27ByRecord = modelResultV27Repository?.latestByRecord?.() || new Map();
  const v27ResultRecord = v27ByRecord.get(targetRecordId) || null;
  const storedRegionalV2ResultRecord = storedRegionalResultForRecord(modelResultRegionalV2Repository, record);
  const feedback = subjectiveFeedback.find((item) => item.recordId === targetRecordId) || null;
  let regionalV2ResultRecord = storedRegionalV2ResultRecord;
  let regionalV2Recovery = null;
  if (storedRegionalV2ResultRecord && storedRegionalV2ResultRecord.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION) {
    const primaryValidation = validatePrimaryRegionalV2ResultRecord(storedRegionalV2ResultRecord);
    const bodyMapRegions = storedRegionalV2ResultRecord.body_map_payload?.regions;
    const bodyMapValid = storedRegionalV2ResultRecord.state === "REST" || (Array.isArray(bodyMapRegions) && bodyMapRegions.length === 12);
    if (!primaryValidation.valid || !bodyMapValid) {
      const sessionSequence = sortedRecords
        .filter((item) => item.date === record.date)
        .findIndex((item) => item.id === record.id) + 1;
      const recovered = createPrimaryRegionalV2ResultRecord({
        record,
        feedback: feedback || {},
        sessionSequence: Math.max(1, sessionSequence),
        allRecords: sortedRecords,
      });
      if (recovered.ok) {
        regionalV2ResultRecord = Object.freeze({
          ...recovered.resultRecord,
          recovery_status: "TRANSIENT_RECONSTRUCTED",
          recovery_source_result_id: storedRegionalV2ResultRecord.id,
        });
        regionalV2Recovery = Object.freeze({
          status: "RECOVERED",
          sourceResultId: storedRegionalV2ResultRecord.id,
          issueCodes: Object.freeze([
            ...primaryValidation.issues,
            ...(bodyMapValid ? [] : ["BODY_MAP_INVALID"]),
          ]),
        });
      } else {
        regionalV2Recovery = Object.freeze({
          status: "FAILED",
          sourceResultId: storedRegionalV2ResultRecord.id,
          issueCodes: Object.freeze([
            ...primaryValidation.issues,
            ...(bodyMapValid ? [] : ["BODY_MAP_INVALID"]),
            recovered.code || "RECONSTRUCTION_FAILED",
          ]),
        });
      }
    }
  }
  const supportDecision = feedback?.supportDecisionSnapshot
    || evaluateSupportDecision({ feedback: feedback || {}, planOutcome: record.planOutcome || {} });
  return Object.freeze({
    record: cloneValue(record),
    feedback: cloneValue(feedback),
    v27ResultRecord: cloneValue(v27ResultRecord),
    v27Result: cloneValue(v27ResultRecord?.result || null),
    regionalV2ResultRecord: cloneValue(regionalV2ResultRecord),
    regionalV2Result: cloneValue(regionalV2ResultRecord?.result || null),
    bodyMapV2: cloneValue(regionalV2ResultRecord?.body_map_payload || null),
    regionalV2Recovery: cloneValue(regionalV2Recovery),
    regionalSemanticState: regionalV2ResultRecord?.model_version === LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION ? "LEGACY_V2_RESTORED_NOT_REINTERPRETED" : regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION ? "REFERENCE100_V3" : "NONE",
    personalReferenceSnapshots: cloneValue(v27ResultRecord?.personal_reference_snapshots || {}),
    supportDecision: cloneValue(supportDecision),
  });
}

function createRecordWorkflow({
  gateway,
  recordsRepository,
  subjectiveFeedbackRepository,
  profileRepository,
  modelResultV27Repository,
  modelResultRegionalV2Repository,
}) {
  function loadCollectionForMutation(repository, sourceName) {
    const result = repository?.loadAllResult?.();
    if (result?.ok) return result;
    if (result && !result.ok) {
      return {
        ...result,
        code: "STORAGE_SOURCE_READ_FAILED",
        details: { ...(result.details || {}), sourceName, sourceCode: result.code || "" },
      };
    }
    return {
      ok: false,
      code: "STORAGE_SOURCE_READ_FAILED",
      operation: "read",
      message: `Unable to read ${sourceName}.`,
      details: { sourceName, sourceCode: "LOAD_RESULT_UNAVAILABLE" },
      items: [],
    };
  }

  function saveRecordAndFeedback(recordInput = {}, feedbackInput = {}, profileInput = undefined) {
    const inputValidation = validateRunningRecordInput(recordInput);
    if (!inputValidation.ok) {
      return {
        ok: false,
        code: "RUNNING_RECORD_INPUT_VALIDATION_FAILED",
        validation: inputValidation,
      };
    }

    const recordsRead = loadCollectionForMutation(recordsRepository, "records");
    if (!recordsRead.ok) return recordsRead;
    const feedbackRead = loadCollectionForMutation(subjectiveFeedbackRepository, "subjectiveFeedback");
    if (!feedbackRead.ok) return feedbackRead;
    const v27Read = loadCollectionForMutation(modelResultV27Repository, "modelResultsV27");
    if (!v27Read.ok) return v27Read;
    const regionalRead = loadCollectionForMutation(modelResultRegionalV2Repository, "modelResultsRegionalV2");
    if (!regionalRead.ok) return regionalRead;


    const currentRecords = recordsRead.items;
    const currentFeedback = feedbackRead.items;
    const existingRecord = recordInput.id
      ? currentRecords.find((record) => record.id === recordInput.id)
      : null;
    const nowIso = new Date().toISOString();
    const explicitProfile = profileInput && typeof profileInput === "object";
    const profileRead = explicitProfile
      ? { ok: true, value: normalizeBodyProfile(profileInput) }
      : profileRepository?.loadResult?.();
    if (!profileRead?.ok) {
      return {
        ...(profileRead || {}),
        ok: false,
        code: "STORAGE_SOURCE_READ_FAILED",
        operation: profileRead?.operation || "read",
        message: profileRead?.message || "Unable to read profile.",
        details: { ...(profileRead?.details || {}), sourceName: "profile", sourceCode: profileRead?.code || "LOAD_RESULT_UNAVAILABLE" },
      };
    }
    const normalizedProfile = normalizeBodyProfile(profileRead.value || {});
    const bodyProfileSnapshot = normalizedProfile
      ? createBodyProfileSnapshot(normalizedProfile, nowIso)
      : existingRecord?.bodyProfileSnapshot || null;
    const versionedRecordInput = stampCurrentRegionalModel({
      ...recordInput,
      regionalModelSnapshot: existingRecord?.regionalModelSnapshot || recordInput.regionalModelSnapshot,
      bodyProfileSnapshot,
      createdAt: existingRecord?.createdAt || recordInput.createdAt,
    });
    const normalizedRecordBase = normalizeRunningRecord(versionedRecordInput, {
      existingIds: currentRecords
        .filter((record) => record.id !== recordInput.id)
        .map((record) => record.id),
      nowIso,
      assumeExplicitRpe: true,
    });
    const normalizedRecord = stampCurrentRegionalModel(normalizedRecordBase);
    const recordValidation = validateRunningRecord(normalizedRecord);
    if (!recordValidation.ok) {
      return {
        ok: false,
        code: "RUNNING_RECORD_VALIDATION_FAILED",
        validation: recordValidation,
      };
    }

    const normalizedFeedback = normalizeSubjectiveFeedback({
      ...feedbackInput,
      recordId: normalizedRecord.id,
      date: normalizedRecord.date,
      checkedAt: feedbackInput.checkedAt || nowIso,
    }, {
      planOutcome: normalizedRecord.planOutcome || {},
    });

    const nextRecords = sortRecords(upsertById(
      currentRecords,
      normalizedRecord,
      (record) => record.id,
    ));
    const nextFeedback = sortFeedback(upsertById(
      currentFeedback,
      normalizedFeedback,
      (item) => item.recordId,
    ));
    const currentV27Results = v27Read.items;
    const currentRegionalV2Results = regionalRead.items;
    // Secondary V2.7 is legacy-only for new/current records. Existing stored V2.7 results remain untouched for restore/history compatibility.
    const calculation = Object.freeze({ ok: true, resultRecord: null, state: "LEGACY_V27_NEW_GENERATION_RETIRED" });
    const nextV27Results = currentV27Results;
    const regionalCalculation = regionalResultCreatorForRecord(normalizedRecord)({
      record: normalizedRecord,
      feedback: normalizedFeedback,
      sessionSequence: nextRecords.filter((item) => item.date === normalizedRecord.date).findIndex((item) => item.id === normalizedRecord.id) + 1,
      allRecords: nextRecords,
    });
    if (!regionalCalculation.ok) {
      return { ok: false, code: regionalCalculation.code || "REGIONAL_V1_RESULT_CREATION_FAILED", validation: regionalCalculation.validation || null, message: regionalCalculation.error?.messageKey || "" };
    }
    const nextRegionalV2Results = upsertPrimaryRegionalV2ResultRecord(currentRegionalV2Results, regionalCalculation.resultRecord);

    const changes = [
      { key: STORAGE_KEYS.records, value: nextRecords },
      { key: STORAGE_KEYS.subjectiveFeedback, value: nextFeedback },
      { key: STORAGE_KEYS.modelResultsV27, value: nextV27Results },
      { key: STORAGE_KEYS.modelResultsRegionalV2, value: nextRegionalV2Results },
    ];
    if (explicitProfile) {
      changes.push({ key: STORAGE_KEYS.profile, value: normalizedProfile });
    }
    const saveResult = gateway.transact(changes);
    if (!saveResult.ok) {
      return {
        ...saveResult,
        code: "RECORD_EXPERIENCE_SAVE_FAILED",
      };
    }

    return {
      ok: true,
      record: cloneValue(normalizedRecord),
      feedback: cloneValue(normalizedFeedback),
      resultRecord: null,
      primaryRegionalV2ResultRecord: cloneValue(regionalCalculation.resultRecord),
      experience: createModelExperience(
        nextRecords,
        nextFeedback,
        normalizedRecord.id,
        modelResultV27Repository,
        modelResultRegionalV2Repository,
      ),
    };
  }

  function loadExperience(recordId) {
    if (!recordId) return null;
    return createModelExperience(
      recordsRepository.loadAll(),
      subjectiveFeedbackRepository.loadAll(),
      recordId,
      modelResultV27Repository,
      modelResultRegionalV2Repository,
    );
  }

  function loadLatestExperience() {
    const records = recordsRepository.loadAll();
    const latestRecord = [...records].sort((left, right) => (
      right.date.localeCompare(left.date) || right.id.localeCompare(left.id)
    ))[0];
    return latestRecord ? loadExperience(latestRecord.id) : null;
  }

  function loadAllExperiences() {
    const records = recordsRepository.loadAll();
    const feedback = subjectiveFeedbackRepository.loadAll();
    return records.map((record) => createModelExperience(
      records,
      feedback,
      record.id,
      modelResultV27Repository,
      modelResultRegionalV2Repository,
    ));
  }

  return Object.freeze({
    saveRecordAndFeedback,
    loadExperience,
    loadLatestExperience,
    loadAllExperiences,
  });
}
__exp["createRecordWorkflow"] = createRecordWorkflow;
__mods[47] = __exp;
}

// ===== core/history/historyWorkflow.js =====
{
const __exp = Object.create(null);
const { STORAGE_KEYS } = __mods[1];

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function localDateFromOffset(daysAgo = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function filterByPeriod(records, period) {
  if (period === "all") return records;
  const days = Number(period);
  if (!Number.isFinite(days) || days <= 0) return records;
  const minimumDate = localDateFromOffset(days - 1);
  return records.filter((record) => record.date >= minimumDate);
}

function hasCompletedSubjectiveCheck(feedback) {
  const status = String(feedback?.checkStatus || "not_asked");
  return !["not_asked", "deferred"].includes(status);
}

function includesText(value, query) {
  return String(value || "").toLocaleLowerCase("ja-JP").includes(query);
}

function removeRecordReferencesFromPlan(plan, recordId) {
  if (plan.sourceRecordId !== recordId && plan.actualRecordId !== recordId) return plan;
  return {
    ...plan,
    sourceRecordId: plan.sourceRecordId === recordId ? "" : plan.sourceRecordId,
    actualRecordId: plan.actualRecordId === recordId ? "" : plan.actualRecordId,
  };
}

function restorePlanReferences(currentPlan, previousPlan, recordId) {
  if (!currentPlan) return null;
  return {
    ...currentPlan,
    sourceRecordId: previousPlan.sourceRecordId === recordId && !currentPlan.sourceRecordId
      ? recordId
      : currentPlan.sourceRecordId,
    actualRecordId: previousPlan.actualRecordId === recordId && !currentPlan.actualRecordId
      ? recordId
      : currentPlan.actualRecordId,
  };
}

function createHistoryWorkflow({
  gateway,
  recordsRepository,
  modelResultV27Repository,
  modelResultRegionalV2Repository,
  subjectiveFeedbackRepository,
  planRepository,
  secondPillarRofJRepository = null,
  secondPillarLifecycleRepository = null,
}) {
  function readCollectionForMutation(repository, sourceName) {
    const result = repository?.loadAllResult?.();
    if (result?.ok) return result;
    return {
      ...(result || {}),
      ok: false,
      code: "HISTORY_SOURCE_READ_FAILED",
      operation: result?.operation || "read",
      message: result?.message || `Unable to read ${sourceName}.`,
      details: { ...(result?.details || {}), sourceName, sourceCode: result?.code || "LOAD_RESULT_UNAVAILABLE" },
      items: [],
    };
  }

  function readOptionalEnvelopeForMutation(repository, sourceName, emptyEnvelope) {
    if (!repository) return { ok: true, exists: false, envelope: emptyEnvelope() };
    const result = repository?.loadEnvelopeResult?.();
    if (result?.ok) return result;
    return {
      ...(result || {}),
      ok: false,
      code: "HISTORY_SOURCE_READ_FAILED",
      operation: result?.operation || "read",
      message: result?.message || `Unable to read ${sourceName}.`,
      details: { ...(result?.details || {}), sourceName, sourceCode: result?.code || "LOAD_RESULT_UNAVAILABLE" },
      envelope: emptyEnvelope(),
    };
  }

  function search(filters = {}) {
    const query = String(filters.query || "").trim().toLocaleLowerCase("ja-JP");
    const activityType = String(filters.activityType || "all");
    const subjective = String(filters.subjective || "all");
    const allFeedback = subjectiveFeedbackRepository.loadAll();
    const feedbackByRecordId = new Map(allFeedback.map((item) => [item.recordId, item]));
    const records = filterByPeriod(recordsRepository.loadAll(), filters.period || "28")
      .filter((record) => activityType === "all" || record.activityType === activityType)
      .filter((record) => {
        const feedback = feedbackByRecordId.get(record.id) || null;
        const subjectiveCheckCompleted = hasCompletedSubjectiveCheck(feedback);
        if (subjective === "entered" && !subjectiveCheckCompleted) return false;
        if (subjective === "none" && subjectiveCheckCompleted) return false;
        if (!query) return true;
        const searchable = [
          record.date,
          record.memo,
          record.course?.name,
          feedback?.consultationNote,
          ...(feedback?.bodyAreaObservations || []).map((item) => item?.label || item?.areaId || ""),
        ];
        return searchable.some((value) => includesText(value, query));
      })
      .sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id));

    return records.map((record) => ({
      record: cloneValue(record),
      feedback: cloneValue(feedbackByRecordId.get(record.id) || null),
    }));
  }

  function deleteRecord(recordId) {
    const recordsRead = readCollectionForMutation(recordsRepository, "records");
    if (!recordsRead.ok) return recordsRead;
    const records = recordsRead.items;
    const record = records.find((item) => item.id === recordId);
    if (!record) return { ok: false, code: "HISTORY_RECORD_NOT_FOUND" };
    const feedbackRead = readCollectionForMutation(subjectiveFeedbackRepository, "subjectiveFeedback");
    if (!feedbackRead.ok) return feedbackRead;
    const feedbackItems = feedbackRead.items;
    const removedFeedback = feedbackItems.find((item) => item.recordId === recordId) || null;
    const v27Read = readCollectionForMutation(modelResultV27Repository, "modelResultsV27");
    if (!v27Read.ok) return v27Read;
    const modelResultItems = v27Read.items;
    const removedModelResults = modelResultItems.filter((item) => item.record_id === recordId);
    const regionalRead = readCollectionForMutation(modelResultRegionalV2Repository, "modelResultsRegionalV2");
    if (!regionalRead.ok) return regionalRead;
    const regionalV2Items = regionalRead.items;
    const removedRegionalV2Results = regionalV2Items.filter((item) => item.record_id === recordId);
    const rofJRead = readOptionalEnvelopeForMutation(
      secondPillarRofJRepository,
      "secondPillarRofJ",
      () => ({ schemaVersion: "RUNLOAD_SECOND_PILLAR_ROFJ_STORAGE_V1", entries: {} }),
    );
    if (!rofJRead.ok) return rofJRead;
    const removedSecondPillarRofJ = cloneValue(rofJRead.envelope.entries?.[recordId] || null);
    const nextRofJEntries = { ...(rofJRead.envelope.entries || {}) };
    delete nextRofJEntries[recordId];
    const lifecycleRead = readOptionalEnvelopeForMutation(
      secondPillarLifecycleRepository,
      "secondPillarRofJLifecycle",
      () => ({ schemaVersion: "RUNLOAD_SECOND_PILLAR_ROFJ_LIFECYCLE_V1", pendingByRunId: {} }),
    );
    if (!lifecycleRead.ok) return lifecycleRead;
    const removedSecondPillarLifecycle = cloneValue(lifecycleRead.envelope.pendingByRunId?.[recordId] || null);
    const nextLifecycleEntries = { ...(lifecycleRead.envelope.pendingByRunId || {}) };
    delete nextLifecycleEntries[recordId];
    const plansRead = readCollectionForMutation(planRepository, "plans");
    if (!plansRead.ok) return plansRead;
    const plans = plansRead.items;
    const affectedPlans = plans.filter((plan) => plan.sourceRecordId === recordId || plan.actualRecordId === recordId);
    const nextPlans = plans.map((plan) => removeRecordReferencesFromPlan(plan, recordId));
    const undoEntry = {
      version: 5,
      deletedAt: new Date().toISOString(),
      record,
      feedback: removedFeedback,
      modelResultsV27: removedModelResults,
      modelResultsRegionalV2: removedRegionalV2Results,
      secondPillarRofJ: removedSecondPillarRofJ,
      secondPillarLifecycle: removedSecondPillarLifecycle,
      affectedPlans,
    };
    const operations = [
      { key: STORAGE_KEYS.records, value: records.filter((item) => item.id !== recordId) },
      { key: STORAGE_KEYS.subjectiveFeedback, value: feedbackItems.filter((item) => item.recordId !== recordId) },
      { key: STORAGE_KEYS.modelResultsV27, value: modelResultItems.filter((item) => item.record_id !== recordId) },
      { key: STORAGE_KEYS.modelResultsRegionalV2, value: regionalV2Items.filter((item) => item.record_id !== recordId) },
      { key: STORAGE_KEYS.plans, value: nextPlans },
      { key: STORAGE_KEYS.historyUndo, value: undoEntry },
    ];
    if (secondPillarRofJRepository) operations.push({
      key: STORAGE_KEYS.secondPillarRofJ,
      value: { schemaVersion: rofJRead.envelope.schemaVersion, entries: nextRofJEntries },
    });
    if (secondPillarLifecycleRepository) operations.push({
      key: STORAGE_KEYS.secondPillarRofJLifecycle,
      value: { schemaVersion: lifecycleRead.envelope.schemaVersion, pendingByRunId: nextLifecycleEntries },
    });
    const result = gateway.transact(operations);
    return { ...result, deleted: result.ok, undoEntry: result.ok ? cloneValue(undoEntry) : null };
  }

  function loadUndoEntry() {
    return gateway.readJson(STORAGE_KEYS.historyUndo, null);
  }

  function loadUndoEntryResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.historyUndo, null);
    if (!result.ok) return { ...result, code: "HISTORY_SOURCE_READ_FAILED", entry: null };
    if (result.value != null && (typeof result.value !== "object" || Array.isArray(result.value))) {
      return { ok: false, code: "HISTORY_UNDO_INVALID", operation: "validate", key: STORAGE_KEYS.historyUndo, entry: null };
    }
    return { ok: true, key: STORAGE_KEYS.historyUndo, exists: result.exists, entry: result.value };
  }

  function undoDelete() {
    const undoRead = loadUndoEntryResult();
    if (!undoRead.ok) return undoRead;
    const entry = undoRead.entry;
    if (!entry?.record?.id) return { ok: false, code: "HISTORY_UNDO_NOT_AVAILABLE" };
    const recordId = entry.record.id;
    const recordsRead = readCollectionForMutation(recordsRepository, "records");
    if (!recordsRead.ok) return recordsRead;
    const records = recordsRead.items.filter((item) => item.id !== recordId);
    records.push(entry.record);
    const feedbackRead = readCollectionForMutation(subjectiveFeedbackRepository, "subjectiveFeedback");
    if (!feedbackRead.ok) return feedbackRead;
    const feedbackItems = feedbackRead.items.filter((item) => item.recordId !== recordId);
    if (entry.feedback) feedbackItems.push(entry.feedback);
    const removedResultIds = new Set(
      (entry.modelResultsV27 || []).map((item) => item.id),
    );
    const v27Read = readCollectionForMutation(modelResultV27Repository, "modelResultsV27");
    if (!v27Read.ok) return v27Read;
    const modelResultItems = v27Read.items
      .filter((item) => !removedResultIds.has(item.id));
    modelResultItems.push(...(entry.modelResultsV27 || []));
    const removedRegionalV2Ids = new Set((entry.modelResultsRegionalV2 || []).map((item) => item.id));
    const regionalRead = readCollectionForMutation(modelResultRegionalV2Repository, "modelResultsRegionalV2");
    if (!regionalRead.ok) return regionalRead;
    const regionalV2Items = regionalRead.items.filter((item) => !removedRegionalV2Ids.has(item.id));
    regionalV2Items.push(...(entry.modelResultsRegionalV2 || []));

    const rofJRead = readOptionalEnvelopeForMutation(
      secondPillarRofJRepository,
      "secondPillarRofJ",
      () => ({ schemaVersion: "RUNLOAD_SECOND_PILLAR_ROFJ_STORAGE_V1", entries: {} }),
    );
    if (!rofJRead.ok) return rofJRead;
    const nextRofJEntries = { ...(rofJRead.envelope.entries || {}) };
    if (Object.prototype.hasOwnProperty.call(entry, "secondPillarRofJ")) {
      delete nextRofJEntries[recordId];
      if (entry.secondPillarRofJ) nextRofJEntries[recordId] = cloneValue(entry.secondPillarRofJ);
    }
    const lifecycleRead = readOptionalEnvelopeForMutation(
      secondPillarLifecycleRepository,
      "secondPillarRofJLifecycle",
      () => ({ schemaVersion: "RUNLOAD_SECOND_PILLAR_ROFJ_LIFECYCLE_V1", pendingByRunId: {} }),
    );
    if (!lifecycleRead.ok) return lifecycleRead;
    const nextLifecycleEntries = { ...(lifecycleRead.envelope.pendingByRunId || {}) };
    if (Object.prototype.hasOwnProperty.call(entry, "secondPillarLifecycle")) {
      delete nextLifecycleEntries[recordId];
      if (entry.secondPillarLifecycle) nextLifecycleEntries[recordId] = cloneValue(entry.secondPillarLifecycle);
    }

    const plansRead = readCollectionForMutation(planRepository, "plans");
    if (!plansRead.ok) return plansRead;
    const currentPlans = plansRead.items;
    const previousPlansById = new Map((entry.affectedPlans || []).map((plan) => [plan.id, plan]));
    const nextPlans = currentPlans.map((plan) => (
      previousPlansById.has(plan.id)
        ? restorePlanReferences(plan, previousPlansById.get(plan.id), recordId)
        : plan
    )).filter(Boolean);

    const operations = [
      { key: STORAGE_KEYS.records, value: records },
      { key: STORAGE_KEYS.subjectiveFeedback, value: feedbackItems },
      { key: STORAGE_KEYS.modelResultsV27, value: modelResultItems },
      { key: STORAGE_KEYS.modelResultsRegionalV2, value: regionalV2Items },
      { key: STORAGE_KEYS.plans, value: nextPlans },
      { key: STORAGE_KEYS.historyUndo, remove: true },
    ];
    if (secondPillarRofJRepository && Object.prototype.hasOwnProperty.call(entry, "secondPillarRofJ")) operations.push({
      key: STORAGE_KEYS.secondPillarRofJ,
      value: { schemaVersion: rofJRead.envelope.schemaVersion, entries: nextRofJEntries },
    });
    if (secondPillarLifecycleRepository && Object.prototype.hasOwnProperty.call(entry, "secondPillarLifecycle")) operations.push({
      key: STORAGE_KEYS.secondPillarRofJLifecycle,
      value: { schemaVersion: lifecycleRead.envelope.schemaVersion, pendingByRunId: nextLifecycleEntries },
    });
    const result = gateway.transact(operations);
    return { ...result, restored: result.ok, record: result.ok ? cloneValue(entry.record) : null };
  }

  return Object.freeze({ search, deleteRecord, loadUndoEntry, loadUndoEntryResult, undoDelete });
}
__exp["createHistoryWorkflow"] = createHistoryWorkflow;
__mods[48] = __exp;
}

// ===== core/planning/planPreviewV27.js =====
{
const __exp = Object.create(null);
const { SURFACE_FIELDS } = __mods[3];
const { V27_ACTIVITY_TYPES, V27_EMPHASIS_REGION_IDS, V27_MODEL_VERSION, V27_REGIONAL_VIEW_IDS } = __mods[12];
const { adaptRecordToV27Session } = __mods[45];
const { assertV27ResultSemantics, calculateV27Session } = __mods[39];
const { validateRunningRecordInput } = __mods[9];

const GRADE_KNOWLEDGE = new Set(["UNKNOWN", "KNOWN_FLAT", "KNOWN_PROFILE"]);
const SURFACE_CLASSES = new Set([
  "REF_HARD_EVEN_STABLE",
  "DRY_STABLE_GRASS_TURF",
  "DEEP_DRY_SOFT_SAND",
  "EXPLICIT_UNEVEN",
  "KNOWN_OTHER",
  "UNKNOWN",
]);
const RUNNING_FORMATS = new Set(Object.values(V27_ACTIVITY_TYPES));
const PLAN_FACT_PREVIEW_VERSION = "runload-plan-facts-v1";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function provided(value) {
  return value !== undefined && value !== null && value !== "";
}

function validateRawV27PlanSession(session = {}) {
  const errors = [];
  const activityType = String(session?.activityType || "run");
  if (!["run", "rest"].includes(activityType)) {
    errors.push({
      field: "activityType",
      code: "INVALID_PLAN_ACTIVITY_TYPE",
      message: "予定の種類を選び直してください。",
    });
  }
  if (activityType !== "rest") {
    const runningFormat = String(session?.runningFormat || "UNKNOWN").toUpperCase();
    if (!RUNNING_FORMATS.has(runningFormat)) {
      errors.push({
        field: "runningFormat",
        code: "INVALID_PLAN_RUNNING_FORMAT",
        message: "予定の走行形式を選び直してください。",
      });
    }
    const course = session?.course && typeof session.course === "object"
      ? session.course
      : {};
    const gradeKnowledge = String(course.gradeKnowledge || "UNKNOWN").toUpperCase();
    if (!GRADE_KNOWLEDGE.has(gradeKnowledge)) {
      errors.push({
        field: "course.gradeKnowledge",
        code: "INVALID_PLAN_GRADE_KNOWLEDGE",
        message: "予定の坂道の入力方法を選び直してください。",
      });
    }
    const modelSurfaceClass = String(course.modelSurfaceClass || "UNKNOWN").toUpperCase();
    if (!SURFACE_CLASSES.has(modelSurfaceClass)) {
      errors.push({
        field: "course.modelSurfaceClass",
        code: "INVALID_PLAN_SURFACE_CLASS",
        message: "予定の路面材質を選び直してください。",
      });
    }
    const surfaceValues = SURFACE_FIELDS.map(({ recordKey }) => Number(course[recordKey] || 0));
    if (surfaceValues.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
      errors.push({ field: "course", code: "INVALID_PLAN_SURFACE_SHARE", message: "予定の路面割合を0〜100で入力してください。" });
    } else {
      const total = surfaceValues.reduce((sum, value) => sum + value, 0);
      if (total > 0 && Math.abs(total - 100) > 0.01) errors.push({ field: "course", code: "PLAN_SURFACE_SUM_NOT_100", message: "予定の路面割合の合計を100%にしてください。" });
    }
    [
      "upPercent",
      "downPercent",
      "upGradePercent",
      "downGradePercent",
    ].forEach((field) => {
      if (!provided(course[field])) return;
      const value = Number(course[field]);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        errors.push({
          field: `course.${field}`,
          code: "INVALID_PLAN_GRADE_VALUE",
          message: "予定の坂道割合・代表勾配は0〜100の数値で入力してください。",
        });
      }
    });
  }
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
  });
}

function normalizeCourse(course = {}) {
  const source = course && typeof course === "object" ? course : {};
  const gradeKnowledge = String(source.gradeKnowledge || "UNKNOWN").toUpperCase();
  const modelSurfaceClass = String(source.modelSurfaceClass || "UNKNOWN").toUpperCase();
  const normalized = {
    ...JSON.parse(JSON.stringify(source)),
    name: String(source.name || "").trim(),
    gradeKnowledge: GRADE_KNOWLEDGE.has(gradeKnowledge) ? gradeKnowledge : "UNKNOWN",
    upPercent: finiteNumber(source.upPercent),
    downPercent: finiteNumber(source.downPercent),
    upGradePercent: finiteNumber(source.upGradePercent),
    downGradePercent: finiteNumber(source.downGradePercent),
    surfaceInputMode: ["UNKNOWN", "SINGLE", "MIXED"].includes(String(source.surfaceInputMode || "").toUpperCase()) ? String(source.surfaceInputMode).toUpperCase() : "UNKNOWN",
    modelSurfaceClass: SURFACE_CLASSES.has(modelSurfaceClass) ? modelSurfaceClass : "UNKNOWN",
    modelSurfaceProfile: Array.isArray(source.modelSurfaceProfile) ? source.modelSurfaceProfile.map((item) => ({ sharePercent: finiteNumber(item?.sharePercent), surfaceClass: String(item?.surfaceClass || "UNKNOWN") })) : [],
  };
  SURFACE_FIELDS.forEach(({ recordKey }) => { normalized[recordKey] = finiteNumber(source[recordKey]); });
  return Object.freeze(normalized);
}

function normalizeV27PlanSession(session = {}) {
  const activityType = String(session?.activityType || "run") === "rest" ? "rest" : "run";
  const runningFormat = String(session?.runningFormat || "UNKNOWN").toUpperCase();
  return Object.freeze({
    activityType,
    distanceKm: activityType === "rest" ? 0 : finiteNumber(session?.distanceKm),
    durationMinutes: activityType === "rest" ? 0 : finiteNumber(session?.durationMinutes),
    runningFormat: activityType === "rest"
      ? "NOT_APPLICABLE"
      : RUNNING_FORMATS.has(runningFormat)
        ? runningFormat
        : "UNKNOWN",
    course: activityType === "rest" ? normalizeCourse({}) : normalizeCourse(session?.course),
  });
}

function normalizePlanFactSession(session = {}) {
  return normalizeV27PlanSession(session);
}

function clonePlanFactPreview(preview) {
  return preview == null ? preview : JSON.parse(JSON.stringify(preview));
}

function invalidPlanFactPreview(session, validation, message = "") {
  return Object.freeze({
    ok: false,
    state: "INVALID",
    modelVersion: PLAN_FACT_PREVIEW_VERSION,
    session,
    facts: null,
    validation,
    message: message || validation?.errors?.map((item) => item.message || item.code).join(" ") || "予定入力を確認してください。",
  });
}

function createPlanFactPreview({
  session: rawSession = {},
  scheduledDate = "",
  previewId = "plan-fact-preview",
} = {}) {
  const session = normalizePlanFactSession(rawSession);
  const rawValidation = validateRawV27PlanSession(rawSession);
  if (!rawValidation.ok) return invalidPlanFactPreview(session, rawValidation);
  if (session.activityType === "rest") {
    return Object.freeze({
      ok: true,
      state: "REST",
      modelVersion: PLAN_FACT_PREVIEW_VERSION,
      session,
      facts: Object.freeze({ activityType: "rest" }),
      validation: Object.freeze({ ok: true, errors: Object.freeze([]) }),
      message: "休養予定として保存します。",
    });
  }
  const record = previewRecord(session, scheduledDate, previewId);
  const validation = validateRunningRecordInput(record);
  if (!validation.ok) return invalidPlanFactPreview(session, validation);
  return Object.freeze({
    ok: true,
    state: "RUN",
    modelVersion: PLAN_FACT_PREVIEW_VERSION,
    session,
    facts: Object.freeze({
      activityType: "run",
      distanceKm: session.distanceKm,
      durationMinutes: session.durationMinutes,
      runningFormat: session.runningFormat,
      course: session.course,
    }),
    validation,
    message: "入力した予定条件を事実として確認します。旧形式の走行全体スコアは計算しません。",
  });
}

function previewRecord(session, scheduledDate, previewId) {
  return Object.freeze({
    id: previewId,
    date: scheduledDate,
    activityType: session.activityType,
    distanceKm: session.distanceKm,
    durationMinutes: session.durationMinutes,
    runningFormat: session.runningFormat,
    stepsProvenance: "UNKNOWN",
    rpeProvenance: "NOT_REPORTED",
    course: session.course,
  });
}

function invalidPreview(session, validation, message = "") {
  return Object.freeze({
    ok: false,
    state: "INVALID",
    modelVersion: V27_MODEL_VERSION,
    session,
    result: null,
    validation,
    message: message || validation?.errors?.map((item) => item.message || item.code).join(" ") || "予定入力を確認してください。",
    viewContract: Object.freeze({
      available: Object.freeze([
        V27_REGIONAL_VIEW_IDS.withinRun,
        V27_REGIONAL_VIEW_IDS.ownFlat,
      ]),
      personalExcluded: true,
    }),
  });
}

function createV27PlanPreview({
  session: rawSession = {},
  scheduledDate = "",
  previewId = "plan-preview",
} = {}) {
  const session = normalizeV27PlanSession(rawSession);
  const rawValidation = validateRawV27PlanSession(rawSession);
  if (!rawValidation.ok) return invalidPreview(session, rawValidation);
  if (session.activityType === "rest") {
    return Object.freeze({
      ok: true,
      state: "REST",
      modelVersion: V27_MODEL_VERSION,
      session,
      result: null,
      validation: Object.freeze({ ok: true, errors: Object.freeze([]) }),
      message: "休養予定には走行による推定値を作成しません。",
      viewContract: Object.freeze({
        available: Object.freeze([]),
        personalExcluded: true,
      }),
    });
  }
  const record = previewRecord(session, scheduledDate, previewId);
  const validation = validateRunningRecordInput(record);
  if (!validation.ok) return invalidPreview(session, validation);
  const adaptation = adaptRecordToV27Session(record);
  if (!adaptation.ok) return invalidPreview(session, adaptation);
  let result;
  try {
    result = calculateV27Session(adaptation.session);
  } catch (error) {
    return invalidPreview(
      session,
      Object.freeze({
        ok: false,
        errors: Object.freeze([{ code: "PLAN_PREVIEW_CALCULATION_FAILED" }]),
      }),
      String(error?.message || error),
    );
  }
  const semantic = assertV27ResultSemantics(result);
  if (!semantic.ok) return invalidPreview(session, semantic);
  return Object.freeze({
    ok: true,
    state: "RUN",
    modelVersion: V27_MODEL_VERSION,
    session,
    inputSnapshot: Object.freeze({
      session: adaptation.session,
      provenance: adaptation.provenance,
      warnings: adaptation.warnings,
    }),
    result,
    validation,
    message: "予定入力による推定です。実績、処方、最適条件、走行可否を示しません。",
    viewContract: Object.freeze({
      available: Object.freeze([
        V27_REGIONAL_VIEW_IDS.withinRun,
        V27_REGIONAL_VIEW_IDS.ownFlat,
      ]),
      personalExcluded: true,
    }),
    fixedRegionIds: V27_EMPHASIS_REGION_IDS,
  });
}

function cloneV27PlanPreview(preview) {
  return preview == null ? preview : JSON.parse(JSON.stringify(preview));
}
__exp["validateRawV27PlanSession"] = validateRawV27PlanSession;
__exp["normalizeV27PlanSession"] = normalizeV27PlanSession;
__exp["createV27PlanPreview"] = createV27PlanPreview;
__exp["cloneV27PlanPreview"] = cloneV27PlanPreview;
__exp["normalizePlanFactSession"] = normalizePlanFactSession;
__exp["createPlanFactPreview"] = createPlanFactPreview;
__exp["clonePlanFactPreview"] = clonePlanFactPreview;
__exp["PLAN_FACT_PREVIEW_VERSION"] = PLAN_FACT_PREVIEW_VERSION;
__mods[49] = __exp;
}

// ===== core/planning/planWorkflow.js =====
{
const __exp = Object.create(null);
const { clonePlanFactPreview, createPlanFactPreview, normalizePlanFactSession } = __mods[49];
const { normalizePlainText, normalizeSingleLineText } = __mods[6];
const { isValidLocalDate } = __mods[9];

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createReadablePlanId(date, existingIds) {
  const prefix = `plan-${date || "unscheduled"}-`;
  const used = new Set(existingIds
    .filter((id) => String(id).startsWith(prefix))
    .map((id) => Number(String(id).slice(prefix.length)))
    .filter(Number.isFinite));
  let sequence = 1;
  while (used.has(sequence)) sequence += 1;
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

function defaultCourse() {
  return Object.freeze({
    name: "",
    gradeKnowledge: "UNKNOWN",
    upPercent: 0,
    downPercent: 0,
    upGradePercent: 0,
    downGradePercent: 0,
    modelSurfaceClass: "UNKNOWN",
  });
}

function defaultRunSession() {
  return normalizePlanFactSession({
    activityType: "run",
    distanceKm: 0,
    durationMinutes: 20,
    runningFormat: "UNKNOWN",
    course: defaultCourse(),
  });
}

function sourceSession(experience) {
  const record = experience?.record;
  if (!record || record.activityType === "rest") return defaultRunSession();
  return normalizePlanFactSession({
    activityType: "run",
    distanceKm: record.distanceKm,
    durationMinutes: record.durationMinutes,
    runningFormat: record.runningFormat,
    course: record.course,
  });
}

function lighterSession(base) {
  return normalizePlanFactSession({
    ...cloneValue(base),
    distanceKm: Math.round(Number(base.distanceKm || 0) * 80) / 100,
    durationMinutes: Math.round(Number(base.durationMinutes || 0) * 8) / 10,
  });
}

function restSession() {
  return normalizePlanFactSession({ activityType: "rest" });
}

function preview(session, scheduledDate, candidateId) {
  return createPlanFactPreview({
    session,
    scheduledDate,
    previewId: `plan-preview-${candidateId}-${scheduledDate}`,
  });
}

function createPlanWorkflow({ services, planRepository }) {
  function createCandidates({ sourceRecordId = "", scheduledDate = "" } = {}) {
    const latestExperience = services.workflows.records.loadLatestExperience();
    const sourceExperience = sourceRecordId
      ? services.workflows.records.loadExperience(sourceRecordId)
      : latestExperience;
    const blockingExperience = [latestExperience, sourceExperience].find((experience) => (
      experience && services.safety.shouldBlockNormalPlanSuggestions(experience.supportDecision)
    )) || null;
    if (blockingExperience) {
      return { blocked: true, sourceExperience, blockingExperience, candidates: [] };
    }
    const base = sourceSession(sourceExperience);
    const definitions = [
      {
        candidateId: "same-conditions",
        title: "同じ条件を出発点にする",
        description: "前回の距離・時間・把握済みコースを転記します。",
        session: base,
      },
      {
        candidateId: "lighter-session",
        title: "距離と時間を小さくする",
        description: "前回の約8割を編集の出発点にします。",
        session: lighterSession(base),
      },
      {
        candidateId: "rest-day",
        title: "休養を予定する",
        description: "走らない予定も同じ位置づけの候補として扱います。",
        session: restSession(),
      },
    ];
    return {
      blocked: false,
      sourceExperience,
      candidates: definitions.map((candidate) => Object.freeze({
        ...candidate,
        preview: preview(candidate.session, scheduledDate, candidate.candidateId),
      })),
    };
  }

  function savePlan(input = {}) {
    const currentPlans = planRepository.loadAll();
    const existing = input.id ? currentPlans.find((plan) => plan.id === input.id) : null;
    const scheduledDate = String(input.scheduledDate || "").slice(0, 10);
    if (!isValidLocalDate(scheduledDate)) {
      return {
        ok: false,
        code: "PLAN_DATE_REQUIRED",
        message: "予定日を正しく入力してください。",
      };
    }
    if (!["run", "rest"].includes(String(input.planType || "run"))) {
      return {
        ok: false,
        code: "INVALID_PLAN_TYPE",
        message: "予定の種類を選び直してください。",
      };
    }
    const planType = input.planType === "rest" ? "rest" : "run";
    const plannedSession = normalizePlanFactSession({
      ...(input.plannedSession || {}),
      activityType: planType,
    });
    const previewResult = preview(plannedSession, scheduledDate, input.id || "new");
    if (planType === "run" && !previewResult.ok) {
      return {
        ok: false,
        code: "INVALID_PLAN_SESSION",
        message: previewResult.message,
        errors: previewResult.validation?.errors || [],
      };
    }
    const id = normalizeSingleLineText(input.id, 100)
      || createReadablePlanId(scheduledDate, currentPlans.map((plan) => plan.id));
    const now = new Date().toISOString();
    return planRepository.upsert({
      ...input,
      id,
      scheduledDate,
      planType,
      title: normalizeSingleLineText(input.title, 80)
        || (planType === "rest" ? "休養予定" : "次回の走行予定"),
      memo: normalizePlainText(input.memo, 500),
      plannedSession,
      sourceCandidateId: normalizeSingleLineText(input.sourceCandidateId, 80) || "custom",
      previewSnapshot: clonePlanFactPreview(previewResult),
      previewGeneratedAt: now,
      createdAt: existing?.createdAt || input.createdAt || now,
      updatedAt: now,
    });
  }

  function updateOutcome(planId, outcome = {}) {
    const plan = planRepository.findById(planId);
    if (!plan) {
      return {
        ok: false,
        code: "PLAN_NOT_FOUND",
        message: "対象の予定が見つかりません。",
      };
    }
    const allowedStatuses = new Set(["planned", "completed", "changed", "not_completed"]);
    const requestedStatus = normalizeSingleLineText(outcome.status, 40)
      || plan.outcomeStatus
      || "planned";
    const outcomeStatus = allowedStatuses.has(requestedStatus) ? requestedStatus : "planned";
    return planRepository.upsert({
      ...plan,
      outcomeStatus,
      actualRecordId: outcome.actualRecordId === undefined
        ? plan.actualRecordId
        : normalizeSingleLineText(outcome.actualRecordId, 100),
      changeReason: outcome.reason === undefined
        ? plan.changeReason
        : normalizeSingleLineText(outcome.reason, 60),
      changeReasonNote: outcome.reasonNote === undefined
        ? plan.changeReasonNote
        : normalizePlainText(outcome.reasonNote, 240),
      updatedAt: new Date().toISOString(),
    });
  }

  function markActualRecord(planId, recordId, outcome = {}) {
    return updateOutcome(planId, {
      status: outcome.status || "completed",
      actualRecordId: recordId,
      reason: outcome.reason,
      reasonNote: outcome.reasonNote,
    });
  }

  return Object.freeze({
    createCandidates,
    savePlan,
    updateOutcome,
    markActualRecord,
  });
}
__exp["createPlanWorkflow"] = createPlanWorkflow;
__mods[50] = __exp;
}

// ===== data/evidenceGovernanceData.js =====
{
const __exp = Object.create(null);
const EVIDENCE_GOVERNANCE_VERSION = "runload-evidence-governed-columns-v5";
const EVIDENCE_GOVERNANCE_REVIEW_DATE = "2026-08-06";

function freezeList(items = []) {
  return Object.freeze([...items]);
}

function sourceRecord(input) {
  return Object.freeze({
    ...input,
    modelSourceIds: freezeList(input.modelSourceIds),
    anchorIds: freezeList(input.anchorIds),
    relatedInputs: freezeList(input.relatedInputs),
    relatedRoutes: freezeList(input.relatedRoutes),
    relatedRegions: freezeList(input.relatedRegions),
  });
}

function articleRecord(input) {
  return Object.freeze({
    ...input,
    sourceIds: freezeList(input.sourceIds),
    relatedInputs: freezeList(input.relatedInputs),
    relatedRoutes: freezeList(input.relatedRoutes),
    relatedRegions: freezeList(input.relatedRegions),
  });
}

const SOURCE_EVIDENCE_REGISTRY = Object.freeze([
  sourceRecord({
    sourceId: "RUNLOAD-SPEC-CURRENT",
    sourceRole: "CURRENT_INTERNAL_SPECIFICATION",
    title: "RunLoad Current model, output, and claim-boundary specifications",
    locator: "Master V1.10: 02_INPUT_OUTPUT_UI_CURRENT/03_OUTPUT_UI_SEMANTIC_CONTRACT_CURRENT.md; 03_REGIONAL_A4_MODEL_CURRENT/00, 12, 13, 24",
    evidenceStatus: "CURRENT_INTERNAL_SPEC",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: [],
    anchorIds: [],
    relatedInputs: ["記事ごとの関連入力", "表示状態", "比較signature"],
    relatedRoutes: ["表示契約", "情報分離", "非主張境界"],
    relatedRegions: ["記事ごとの対象部位"],
    allowedClaim: "Current仕様で固定した計算の意味、表示状態、情報分離、非主張境界を説明できる。",
    prohibitedClaim: "臨床妥当性、個人の安全、傷害確率、診断、走行可否を証明する資料として扱わない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-MINETTI",
    sourceRole: "V27_ACTIVE_MODEL_AND_APP_READING",
    title: "Energy cost of walking and running at extreme uphill and downhill slopes",
    locator: "Methods/equation and grade-cost results / PDF pp.3-6; Current packaged PDF identity in Source Crosswalk",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["SRC-NEW-001"],
    anchorIds: [],
    relatedInputs: ["代表勾配", "上り区間割合", "下り区間割合"],
    relatedRoutes: ["V2.7 grade energy-cost route"],
    relatedRegions: ["なし（総合推定負荷の別指標）"],
    allowedClaim: "資料内の勾配と代謝コストの方向・比率を、宣言したV2.7比較用変換の範囲で説明できる。",
    prohibitedClaim: "個人の消費エネルギー実測値、疲労、傷害、走行可否へ変換しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-VAN-HOOREN",
    sourceRole: "REGIONAL_A4_V27_AND_APP_READING",
    title: "Per-step and cumulative load at three common running injury locations: The effect of speed, surface gradient, and cadence",
    locator: "Table 2 / PDF p.9",
    evidenceStatus: "FULL_TEXT_AND_A4_ANCHORS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["BAT-SRC-010"],
    anchorIds: ["RCM-ANCH-001..039"],
    relatedInputs: ["速度", "勾配", "cadence"],
    relatedRoutes: ["Regional A4 SPEED", "Regional A4 GRADE", "Regional A4 CADENCE"],
    relatedRegions: ["膝蓋大腿関節領域", "アキレス腱領域", "足底腱膜領域"],
    allowedClaim: "資料の条件・endpoint・範囲内で、3領域の累積代理指標の方向と比率を説明できる。",
    prohibitedClaim: "3領域以外へ一般化せず、傷害確率、危険順位、共通物理単位、因果関係を主張しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-NUCKOLS",
    sourceRole: "REGIONAL_A4_V27_AND_APP_READING",
    title: "Mechanics of walking and running up and downhill: a joint-level perspective",
    locator: "Table 1 / PDF p.6",
    evidenceStatus: "FULL_TEXT_AND_A4_ANCHORS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["SRC-SUP-003"],
    anchorIds: ["RCM-ANCH-A3-001..015"],
    relatedInputs: ["勾配"],
    relatedRoutes: ["Regional A4 GRADE_JOINT_POWER"],
    relatedRegions: ["股関節領域", "大腿前面領域", "足関節領域"],
    allowedClaim: "資料のjoint-power条件と指定proxy変換の範囲で、勾配による方向差を説明できる。",
    prohibitedClaim: "筋・腱・関節の実測負荷や、全12部位の直接測定として扱わない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-YAMIN",
    sourceRole: "REGIONAL_A4_AND_APP_READING",
    title: "Effects of Surface Stiffness on Plantar Pressure and Lower-Limb Muscle Activity during Running",
    locator: "Table 3 / PDF p.12",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["RCM-SRC-003"],
    anchorIds: [],
    relatedInputs: ["路面の硬さ", "シューズ着用条件"],
    relatedRoutes: ["Regional A4 surface context"],
    relatedRegions: ["足底部", "下肢筋群"],
    allowedClaim: "研究条件の範囲で、路面の硬さにより足底圧と下肢筋活動が異なることを一般的に説明できる。",
    prohibitedClaim: "個人の障害原因、最適な路面、走行可否、全路面への一般化には用いない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-VOLOSHINA",
    sourceRole: "REGIONAL_A4_AND_APP_READING",
    title: "Biomechanics and energetics of running on uneven terrain",
    locator: "Results / PDF pp.3-6",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["BAT-SRC-027"],
    anchorIds: [],
    relatedInputs: ["路面の凹凸"],
    relatedRoutes: ["Regional A4 uneven-surface context"],
    relatedRegions: ["下肢全体"],
    allowedClaim: "研究条件の範囲で、凹凸のある路面では平らな路面と身体の安定化やエネルギー面の反応が異なることを一般的に説明できる。",
    prohibitedClaim: "個人の障害原因、転倒確率、走行可否、あらゆる自然路面への一般化には用いない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-HORIGUCHI",
    sourceRole: "REGIONAL_A4_AND_APP_READING",
    title: "Effects of uphill and downhill running on plantar pressure distribution in different foot strike patterns",
    locator: "Table 1 / PDF p.3; Methods / pp.2-3; limitations / pp.7-8",
    evidenceStatus: "FULL_TEXT_AND_A4_ANCHORS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["SRC-A4-001"],
    anchorIds: ["RCM-ANCH-A4-001..011"],
    relatedInputs: ["勾配", "足部接地"],
    relatedRoutes: ["Regional A4 grade and foot-strike context"],
    relatedRegions: ["後足部", "足底中部", "前足部"],
    allowedClaim: "研究条件の範囲で、上り・下りと足部接地の違いにより足底圧分布が異なることを一般的に説明できる。",
    prohibitedClaim: "個人の接地型を推定せず、障害原因、最適な接地、走行可否には用いない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-HADDAD",
    sourceRole: "V27_ACTIVE_MODEL_AND_APP_READING",
    title: "Session-RPE Method for Training Load Monitoring",
    locator: "Session-RPE method and influencing-factor review / PDF pp.2-9",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["SRC-CUR-017"],
    anchorIds: [],
    relatedInputs: ["実走時間", "RPE"],
    relatedRoutes: ["session-RPE separate subjective route"],
    relatedRegions: ["なし（走行全体の本人申告）"],
    allowedClaim: "実走時間と本人RPEを別指標として記録する方法と、影響要因があることを一般的に説明できる。",
    prohibitedClaim: "Regional A4係数、部位別実測値、健康状態、傷害予測へ使用しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-LINTON",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "Running-Centred Injury Prevention Support: A Scoping Review on Current Injury Risk Reduction Practices for Runners",
    locator: "Review scope, support practices, and limitations / PDF pp.1, 25; Current finding CUR-FND-021",
    evidenceStatus: "FULL_TEXT_AND_CURRENT_FINDINGS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-015"],
    anchorIds: [],
    relatedInputs: ["本人申告", "相談用共有範囲", "記録文脈"],
    relatedRoutes: ["deterministic consultation information-organization route"],
    relatedRegions: ["本人が選択した部位のみ"],
    allowedClaim: "ランナー支援で記録・教育・専門家への共有が検討される背景を一般的に説明できる。",
    prohibitedClaim: "RunLoadの傷害予防効果、診断精度、相談結果の有効性を主張しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-BUIST",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "No Effect of a Graded Training Program on the Number of Running-Related Injuries in Novice Runners: A Randomized Controlled Trial",
    locator: "Trial program, results, and limitations / PDF pp.3, 9; Current findings CUR-FND-006..007",
    evidenceStatus: "FULL_TEXT_AND_CURRENT_FINDINGS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-005"],
    anchorIds: [],
    relatedInputs: ["予定距離", "予定時間", "予定と実績"],
    relatedRoutes: ["general-knowledge column route", "plan non-prescription boundary"],
    relatedRegions: ["なし（走行全体の練習計画）"],
    allowedClaim: "初心者を対象に10％ルールを用いた13週間の段階的プログラムが、標準プログラムよりランニング関連傷害を減らさなかったことを研究条件付きで説明できる。",
    prohibitedClaim: "安全な増加率、急増の許容、個人の傷害予防、最適な練習計画を導かない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-KRUKOWSKI",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "Impact of feedback generation and presentation on self-monitoring behaviors, dietary intake, physical activity, and weight: a systematic review and meta-analysis",
    locator: "Physical-activity findings and review limitations / PDF pp.1, 16; Current finding CUR-FND-013",
    evidenceStatus: "FULL_TEXT_AND_CURRENT_FINDINGS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-008"],
    anchorIds: [],
    relatedInputs: ["記録目的", "本人メモ", "フィードバック表示"],
    relatedRoutes: ["general-knowledge column route", "non-evaluative feedback boundary"],
    relatedRegions: ["なし（行動・記録文脈）"],
    allowedClaim: "身体活動介入ではフィードバックに小さな優位がみられた一方、最適な生成・提示方法の証拠は一定しなかったことを説明できる。",
    prohibitedClaim: "RunLoadの行動変容効果、継続効果、初心者ランナーへの個別効果を主張しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-KARAHANOGLU",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "How Are Sports-Trackers Used by Runners? Running-Related Data, Personal Goals, and Self-Tracking in Running",
    locator: "Goals, tracker uses, and design implications / PDF pp.1, 12; Current findings CUR-FND-016..017",
    evidenceStatus: "FULL_TEXT_AND_CURRENT_FINDINGS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-011"],
    anchorIds: [],
    relatedInputs: ["記録目的", "履歴", "本人メモ"],
    relatedRoutes: ["general-knowledge column route", "running-goal reading route"],
    relatedRegions: ["なし（ランナーの記録利用）"],
    allowedClaim: "調査対象者が記録保存と振り返り・行動の両方にデータを使い、状況に応じて目標を変えていたことを説明できる。",
    prohibitedClaim: "経験豊富な機器利用者の結果を初心者全員へ一般化せず、特定の記録方法の優位性を主張しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-JANSSEN",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "Understanding Different Types of Recreational Runners and How They Use Running-Related Technology",
    locator: "Runner profiles and technology-use differences / PDF pp.1, 14; Current finding CUR-FND-018",
    evidenceStatus: "FULL_TEXT_AND_CURRENT_FINDINGS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-012"],
    anchorIds: [],
    relatedInputs: ["記録目的", "技術利用", "本人の関心"],
    relatedRoutes: ["general-knowledge column route", "running-goal reading route"],
    relatedRegions: ["なし（ランナーの多様性）"],
    allowedClaim: "レクリエーショナルランナーの態度・関心・技術利用が一様でなかったことを説明できる。",
    prohibitedClaim: "4類型をRunLoad利用者の分類や自動判定へ使わず、初心者固有の結果としない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-WINTER",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "A Multifactorial Approach to Overuse Running Injuries: A 1-Year Prospective Study",
    locator: "Studied factors and predictor limitations / PDF pp.1, 7; Current finding CUR-FND-022",
    evidenceStatus: "FULL_TEXT_AND_CURRENT_FINDINGS_VERIFIED_WITH_METHOD_LIMITATION",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-016"],
    anchorIds: [],
    relatedInputs: ["生活背景メモ", "練習記録", "過去の経験"],
    relatedRoutes: ["general-knowledge column route", "context-only information route"],
    relatedRegions: ["なし（複数背景要因の説明）"],
    allowedClaim: "複数の練習・身体・既往・バイオメカニクス要因が検討され、研究自体も頑健な個人予測を支持しなかったことを説明できる。",
    prohibitedClaim: "観察された関連を個人の因果関係、傷害予測、RunLoad係数へ変換しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-BESOMI",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "Exploring contextual factors for management and prevention of running-related injuries: runners and experts’ perspectives",
    locator: "Experience, context, and information-reliability findings / PDF pp.1, 3, 9; Current finding CUR-FND-027",
    evidenceStatus: "FULL_TEXT_AND_CURRENT_FINDINGS_VERIFIED_WITH_CONTEXT_LIMITATION",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-021"],
    anchorIds: [],
    relatedInputs: ["生活背景メモ", "本人の経験", "相談用メモ"],
    relatedRoutes: ["general-knowledge column route", "consultation information-organization route"],
    relatedRegions: ["なし（本人と専門家の見方）"],
    allowedClaim: "経験や文脈が認識・行動に関係し、経験の少ないランナーが情報の信頼性判断に迷う場合があったことを説明できる。",
    prohibitedClaim: "限定された傷害関連の質的研究から、全初心者の問題、因果関係、RunLoadの有効性を証明しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-COOLDOWN-VAN-HOOREN",
    sourceRole: "APP_READING_CONTENT",
    title: "Do We Need a Cool-Down After Exercise? A Narrative Review of the Psychophysiological Effects and the Effects on Performance, Injuries and the Long-Term Adaptive Response",
    locator: "Abstract, evidence summary, and conclusions / PDF pp.1, 16; Current source CUR-SRC-022",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED_CC_BY_4_0",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-022"],
    anchorIds: [],
    relatedInputs: ["運動後に行ったこと", "本人の感じ方", "本人メモ"],
    relatedRoutes: ["general-knowledge column route", "non-prescriptive after-run reading route"],
    relatedRegions: ["なし（運動後の一般的な振り返り）"],
    allowedClaim: "能動的クールダウンの回復指標に対する結果が限定的または一定せず、けが予防が確認された方法ではないことを研究範囲付きで説明できる。",
    prohibitedClaim: "個人向けの方法・強さ・時間、治療効果、けが予防、回復保証、走行可否を導かない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-AFONSO",
    sourceRole: "APP_READING_CONTENT",
    title: "The Effectiveness of Post-exercise Stretching in Short-Term and Delayed Recovery of Strength, Range of Motion and Delayed Onset Muscle Soreness: A Systematic Review and Meta-Analysis of Randomized Controlled Trials",
    locator: "Abstract, GRADE assessment, limitations, and conclusions / PDF pp.1, 22-23; Current source CUR-SRC-023",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED_CC_BY_4_0_WITH_VERY_LOW_CERTAINTY",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-023"],
    anchorIds: [],
    relatedInputs: ["運動後のストレッチ記録", "筋肉痛の本人メモ", "本人の感じ方"],
    relatedRoutes: ["general-knowledge column route", "evidence-certainty boundary"],
    relatedRegions: ["なし（運動後の一般的な回復指標）"],
    allowedClaim: "運動後ストレッチは受動的休養と比べ、筋肉痛や筋力回復の明確な改善が確認されず、証拠の確かさがとても低かったことを説明できる。",
    prohibitedClaim: "ストレッチを一律に勧めたり禁止したりせず、個人の治療、予防、回復、走行可否へ一般化しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-HEW-BUTLER",
    sourceRole: "APP_READING_CONTENT",
    title: "Exercise-Associated Hyponatremia: 2017 Update",
    locator: "Abstract, etiology, and prevention discussion / PDF pp.1, 3-4, 8; Current source CUR-SRC-024",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED_CC_BY_4_0",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-024"],
    anchorIds: [],
    relatedInputs: ["走行時間", "天候メモ", "食事・水分の自己記録"],
    relatedRoutes: ["general-knowledge column route", "non-diagnostic hydration reading route"],
    relatedRegions: ["なし（水分摂取の一般的な背景）"],
    allowedClaim: "主に持久性運動の文献で、のどの渇きを超える飲み過ぎが運動関連低ナトリウム血症の主要背景と整理されていることを説明できる。",
    prohibitedClaim: "個人の必要量、脱水・低ナトリウム血症、電解質、治療、走行可否を判定または処方しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-ARENT",
    sourceRole: "APP_READING_CONTENT",
    title: "Nutrient Timing: A Garage Door of Opportunity?",
    locator: "Abstract, post-exercise context, practical application, and conclusion / PDF pp.1, 8-10, 17; Current source CUR-SRC-025",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED_CC_BY_4_0",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-025"],
    anchorIds: [],
    relatedInputs: ["運動内容", "次の運動までの間隔", "食事・水分の自己記録"],
    relatedRoutes: ["general-knowledge column route", "non-prescriptive nutrition reading route"],
    relatedRegions: ["なし（運動後の食事文脈）"],
    allowedClaim: "栄養を取る時機の重要性が運動内容・頻度・次の運動までの間隔などに依存し、一日の摂取全体と切り離せないことを説明できる。",
    prohibitedClaim: "個人の摂取量・食品・補助食品・時刻、栄養状態、回復効果、走行可否を評価または処方しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-DOHERTY-SLEEP",
    sourceRole: "APP_READING_CONTENT",
    title: "The Sleep and Recovery Practices of Athletes",
    locator: "Abstract, sleep domains, self-report limits, and discussion / PDF pp.1, 16-19; Current source CUR-SRC-026",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED_CC_BY_4_0",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-026"],
    anchorIds: [],
    relatedInputs: ["睡眠の本人メモ", "睡眠時間", "本人の感じ方"],
    relatedRoutes: ["general-knowledge column route", "non-diagnostic sleep reading route"],
    relatedRegions: ["なし（睡眠と回復の一般的な背景）"],
    allowedClaim: "競技者の睡眠には個人差があり、時間だけでなく質・量・時機を分け、自己記録の限界も含めて考える必要があることを説明できる。",
    prohibitedClaim: "競技者338人の横断的な自己記録から、初心者個人の必要時間、睡眠障害、回復状態、原因、走行可否を判定または処方しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-GRUNDSTEIN-HEAT",
    sourceRole: "APP_READING_CONTENT",
    title: "Influence of Race Performance and Environmental Conditions on Exertional Heat Stroke Prevalence Among Runners Participating in a Warm Weather Road Race",
    locator: "Abstract, methods, discussion, and limitations / PDF pp.1-5; Current source CUR-SRC-027",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED_CC_BY_4_0",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-027"],
    anchorIds: [],
    relatedInputs: ["気温", "天候メモ", "時間帯", "走行ペース"],
    relatedRoutes: ["general-knowledge column route", "non-diagnostic heat-context reading route"],
    relatedRegions: ["なし（暑熱環境と走行全体の背景）"],
    allowedClaim: "特定の温暖な11.26kmレースの後ろ向き研究で、WBGTと平均ペースを含む複数条件が検討され、関連のみが示されたことを範囲付きで説明できる。",
    prohibitedClaim: "一つの大会の関連から、個人の原因、熱中症、危険度、安全なペース、水分量、運動可否を推定または処方しない。",
  }),
  sourceRecord({
    sourceId: "APP-GUIDE-JSPO-HEAT",
    sourceRole: "PUBLIC_GUIDANCE_FOR_APP_READING",
    title: "スポーツ活動中の熱中症予防ガイドブック",
    locator: "日本スポーツ協会の現行公開ページとガイドブック案内（2026-08-06確認、2025年6月第6版改訂）",
    evidenceStatus: "OFFICIAL_CURRENT_PUBLIC_GUIDANCE_PAGE_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: [],
    anchorIds: [],
    relatedInputs: ["気温", "天候メモ", "走る場所と時間"],
    relatedRoutes: ["public heat guidance link", "external current-information check boundary"],
    relatedRegions: ["なし（スポーツ活動時の暑熱環境）"],
    allowedClaim: "スポーツ活動時の暑さを考える公的指標としてWBGTを紹介し、場所と時間に合う最新の公式情報をアプリ外で確認する必要を説明できる。",
    prohibitedClaim: "公開資料をアプリ内の自動判定へ置き換えず、固定した閾値、個人の安全、診断、運動の中止・実施可否を決めない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-KWON-TALK",
    sourceRole: "APP_READING_CONTENT",
    title: "The talk test as a useful tool to monitor aerobic exercise intensity in healthy population",
    locator: "Abstract, participants, protocol, discussion, and limitations / PDF pp.1-7; Current source CUR-SRC-028",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED_CC_BY_NC_4_0",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-028"],
    anchorIds: [],
    relatedInputs: ["走行ペース", "RPE", "会話のしやすさの本人メモ"],
    relatedRoutes: ["general-knowledge column route", "subjective talk-ease reading route"],
    relatedRegions: ["なし（走行全体の主観的な強さ）"],
    allowedClaim: "健康成人17人のトレッドミル研究で、3段階の会話テストと複数の生理・心理指標に関連があったことを、標本と条件の限界付きで説明できる。",
    prohibitedClaim: "小規模な実験室研究から、初心者全員の正確なペース、心肺機能、病気、安全な強さ、走行可否を評価または処方しない。",
  }),
]);

const SOURCE_BY_ID = new Map(SOURCE_EVIDENCE_REGISTRY.map((source) => [source.sourceId, source]));

const ARTICLE_EVIDENCE_REGISTRY = Object.freeze([
  articleRecord({
    articleId: "model-total-v27", claimId: "COL-CLM-001", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-MINETTI"],
    relatedInputs: ["距離", "代表勾配", "上り・下り割合", "路面性質"], relatedRoutes: ["V2.7 total-load route", "coverage route"], relatedRegions: ["なし（総合推定負荷）"],
    allowedClaim: "距離を土台に、対応資料がある坂と路面だけを比較用推定へ反映する設計を説明する。",
    prohibitedClaim: "実測した身体負荷、消費エネルギー、疲労、傷害リスクとして説明しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "regional-three-views", claimId: "COL-CLM-002", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-VAN-HOOREN", "APP-COL-NUCKOLS"],
    relatedInputs: ["速度", "勾配", "cadence", "路面", "足部接地ほかA4 route入力"], relatedRoutes: ["Regional A4 endpoint-family routes", "coverage/status route"], relatedRegions: ["12部位"],
    allowedClaim: "各部位固有Reference 100、endpoint、算出状態、反映理由の読み方を説明する。",
    prohibitedClaim: "部位間順位、共通物理単位、傷害確率、危険度として読ませない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "regional-six-eight-28", claimId: "COL-CLM-003", sourceIds: ["RUNLOAD-SPEC-CURRENT"],
    relatedInputs: ["詳細身体記録", "左右", "程度", "気づいた時点"], relatedRoutes: ["self-report route", "Regional A4 separate display route"], relatedRegions: ["本人入力28領域", "Regional A4 12部位"],
    allowedClaim: "本人申告と走行条件モデルが異なる情報層であることを説明する。",
    prohibitedClaim: "一致・不一致から原因、診断、走行起因性を推定しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "rpe-separated", claimId: "COL-CLM-004", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-HADDAD"],
    relatedInputs: ["実走時間", "RPE"], relatedRoutes: ["session-RPE subjective route", "A4/V2.7 separation"], relatedRegions: ["なし（走行全体）"],
    allowedClaim: "RPEを本人の走行全体の感じ方として、走行事実モデルとは別に保存・表示する理由を説明する。",
    prohibitedClaim: "RPEを部位係数、健康判定、傷害予測へ変換しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "grade-and-coverage", claimId: "COL-CLM-005", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-MINETTI", "APP-COL-VAN-HOOREN", "APP-COL-NUCKOLS"],
    relatedInputs: ["上り割合", "下り割合", "代表勾配", "勾配把握状態"], relatedRoutes: ["V2.7 grade route", "Regional A4 grade routes", "supported-domain route"], relatedRegions: ["routeごとの対応部位"],
    allowedClaim: "区間割合、代表勾配、資料範囲、反映率を分けて扱う設計を説明する。",
    prohibitedClaim: "範囲外を端値へ丸めず、コース全変化や実測組織負荷として扱わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "surface-missingness", claimId: "COL-CLM-006", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-YAMIN", "APP-COL-VOLOSHINA", "APP-COL-HORIGUCHI"],
    relatedInputs: ["路面性質", "路面の凹凸", "勾配", "足部接地"], relatedRoutes: ["surface and foot-strike explanatory route", "unknown route"], relatedRegions: ["足底部と下肢"],
    allowedClaim: "路面の硬さや凹凸、坂、足部接地により足底圧や身体の反応が異なるという研究知見を一般的に説明する。",
    prohibitedClaim: "路面名だけで個人の反応を決めず、障害原因や最適条件、走行可否を示さない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "personal-reference", claimId: "COL-CLM-007", sourceIds: ["RUNLOAD-SPEC-CURRENT"],
    relatedInputs: ["比較signature", "過去の同一部位結果", "coverage", "model version"], relatedRoutes: ["directly comparable history route"], relatedRegions: ["本人が選択した同一部位"],
    allowedClaim: "適格な過去記録だけを用いる本人内比較の表示条件を説明する。",
    prohibitedClaim: "正常値、適応、危険な変化、因果関係として扱わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "history-compatible", claimId: "COL-CLM-008", sourceIds: ["RUNLOAD-SPEC-CURRENT"],
    relatedInputs: ["活動種別", "model version", "result state", "比較基準"], relatedRoutes: ["history compatibility route"], relatedRegions: ["選択した同一部位"],
    allowedClaim: "同一モデル版・同一比較条件だけを系列化し、空白や休養を0へ補完しないルールを説明する。",
    prohibitedClaim: "異なるモデル・部位・比較基準を同じ系列として比較しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "plan-facts-current", claimId: "COL-CLM-009", sourceIds: ["RUNLOAD-SPEC-CURRENT"],
    relatedInputs: ["予定距離", "予定コース条件"], relatedRoutes: ["plan preview route separated from completed records"], relatedRegions: ["予定表示で選択した部位"],
    allowedClaim: "予定の入力事実が完了記録とは別に保存され、後から条件差を見返せることを説明する。",
    prohibitedClaim: "結果予測、練習処方、実施の推奨、安全保証として扱わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "consultation-prep-v27", claimId: "COL-CLM-010", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-LINTON"],
    relatedInputs: ["本人申告", "走行事実", "選択部位", "共有範囲"], relatedRoutes: ["deterministic consultation route"], relatedRegions: ["本人が明示選択した1部位"],
    allowedClaim: "本人入力、走行事実、モデル表示を分け、共有前に整理する方法を説明する。",
    prohibitedClaim: "診断、原因特定、走行可否、治療・練習処方を行わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "slope-endpoints", claimId: "COL-CLM-011", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-VAN-HOOREN", "APP-COL-NUCKOLS"],
    relatedInputs: ["勾配", "速度", "cadence", "選択部位"], relatedRoutes: ["Regional A4 grade/speed/cadence endpoint routes"], relatedRegions: ["routeとendpointが対応する部位"],
    allowedClaim: "部位ごとに異なるendpointと資料条件を使うため、方向が一致しない場合があることを説明する。",
    prohibitedClaim: "endpoint間を共通単位で順位付けせず、直接測定された身体負荷と呼ばない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "model-limits-v27", claimId: "COL-CLM-012", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-LINTON", "APP-COL-VAN-HOOREN"],
    relatedInputs: ["全入力群", "欠測", "範囲外", "本人申告"], relatedRoutes: ["claim boundary", "unsupported-domain route", "information separation"], relatedRegions: ["12部位と別指標"],
    allowedClaim: "モデルの対応範囲、算出状態、非主張、本人入力との分離を説明する。",
    prohibitedClaim: "測定・診断・傷害確率・危険スコア・走行可否・因果推定を主張しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "training-progression-no-universal-rule", claimId: "COL-CLM-013", sourceIds: ["APP-COL-BUIST", "APP-COL-LINTON"],
    relatedInputs: ["予定距離", "予定時間", "予定と実績", "本人の振り返り"], relatedRoutes: ["general-knowledge column route", "plan non-prescription boundary"], relatedRegions: ["なし（走行全体の練習計画）"],
    allowedClaim: "一定割合の段階的プログラムを普遍的な傷害予防ルールとせず、予定と実績を分けて振り返る考え方を説明する。",
    prohibitedClaim: "安全な増加率、急増の許容、個人の傷害予防、最適な練習処方を提示しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "goals-and-recording-differ", claimId: "COL-CLM-014", sourceIds: ["APP-COL-KARAHANOGLU", "APP-COL-JANSSEN", "APP-COL-KRUKOWSKI"],
    relatedInputs: ["記録目的", "履歴", "本人メモ", "フィードバック表示"], relatedRoutes: ["general-knowledge column route", "running-goal reading route"], relatedRegions: ["なし（記録・目標の利用文脈）"],
    allowedClaim: "ランナーの目標・関心・技術利用が一様でなく、記録とフィードバックは本人の目的や時機に合わせて選べることを説明する。",
    prohibitedClaim: "記録継続、特定目標、利用者分類、RunLoadによる行動変容の効果を保証しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "context-not-single-cause", claimId: "COL-CLM-015", sourceIds: ["APP-COL-LINTON", "APP-COL-WINTER", "APP-COL-BESOMI"],
    relatedInputs: ["天候・環境メモ", "睡眠・生活背景メモ", "本人の感じ方", "相談用メモ"], relatedRoutes: ["general-knowledge column route", "context-only information route", "consultation information-organization route"], relatedRegions: ["なし（複数の背景情報）"],
    allowedClaim: "複数の背景要因、経験差、研究上の予測限界を示し、一つの記録から原因を決めず事実を分けて残す考え方を説明する。",
    prohibitedClaim: "本人メモや数値から原因、診断、傷害確率、走行可否、個人予測を導かない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "cooldown-stretching-limits", claimId: "COL-CLM-016", sourceIds: ["APP-COL-COOLDOWN-VAN-HOOREN", "APP-COL-AFONSO"],
    relatedInputs: ["運動後に行ったこと", "ストレッチ記録", "本人の感じ方"], relatedRoutes: ["general-knowledge column route", "non-prescriptive after-run reading route"], relatedRegions: ["なし（運動後の一般的な振り返り）"],
    allowedClaim: "クールダウンと運動後ストレッチについて、確認された回復効果が限定的または一定せず、証拠にも限界があることを説明する。",
    prohibitedClaim: "実施方法・時間、治療効果、けが予防、回復保証、次の走行可否を提示しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "hydration-not-more-is-better", claimId: "COL-CLM-017", sourceIds: ["APP-COL-HEW-BUTLER"],
    relatedInputs: ["走行時間", "天候メモ", "食事・水分の自己記録"], relatedRoutes: ["general-knowledge column route", "non-diagnostic hydration reading route"], relatedRegions: ["なし（水分摂取の一般的な背景）"],
    allowedClaim: "水分摂取を量の多さだけで評価せず、飲み過ぎにも注意が必要という持久性運動の一般知識を説明する。",
    prohibitedClaim: "個人の必要量、脱水・低ナトリウム血症、電解質、治療、走行可否を判定または処方しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "post-run-food-timing-context", claimId: "COL-CLM-018", sourceIds: ["APP-COL-ARENT"],
    relatedInputs: ["運動内容", "次の運動までの間隔", "食事・水分の自己記録"], relatedRoutes: ["general-knowledge column route", "non-prescriptive nutrition reading route"], relatedRegions: ["なし（運動後の食事文脈）"],
    allowedClaim: "運動後の食事を一つの短い時間帯だけでなく、運動内容、頻度、次の運動までの間隔、一日の食事全体から捉える考え方を説明する。",
    prohibitedClaim: "食事量、食品、補助食品、摂取時刻、栄養状態、回復効果、走行可否を個別に評価または処方しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "sleep-not-hours-only", claimId: "COL-CLM-019", sourceIds: ["APP-COL-DOHERTY-SLEEP"],
    relatedInputs: ["睡眠の本人メモ", "睡眠時間", "本人の感じ方"], relatedRoutes: ["general-knowledge column route", "non-diagnostic sleep reading route"], relatedRegions: ["なし（睡眠と回復の一般的な背景）"],
    allowedClaim: "睡眠を一つの時間だけで正解とせず、時間、質、時機、本人の感じ方を分けて自己記録する考え方を説明する。",
    prohibitedClaim: "必要な睡眠時間、睡眠障害、回復状態、原因、次の走行可否を個人について判定または処方しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "heat-not-temperature-only", claimId: "COL-CLM-020", sourceIds: ["APP-COL-GRUNDSTEIN-HEAT", "APP-GUIDE-JSPO-HEAT"],
    relatedInputs: ["気温", "天候メモ", "時間帯", "走行ペース"], relatedRoutes: ["general-knowledge column route", "external current-information check boundary"], relatedRegions: ["なし（暑熱環境と走行全体の背景）"],
    allowedClaim: "暑さを一つの気温だけで決めず、WBGT、走る場所と時間、走行内容を分けて確認・記録する考え方を説明する。",
    prohibitedClaim: "熱中症、危険度、安全なペース、水分量、運動の中止・実施可否を個人について判定または処方しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "talk-test-as-subjective-cue", claimId: "COL-CLM-021", sourceIds: ["APP-COL-KWON-TALK"],
    relatedInputs: ["走行ペース", "RPE", "会話のしやすさの本人メモ"], relatedRoutes: ["general-knowledge column route", "subjective talk-ease reading route"], relatedRegions: ["なし（走行全体の主観的な強さ）"],
    allowedClaim: "会話のしやすさを、速度やRPEとは別の主観的な手掛かりとして本人が記録・振り返る考え方を説明する。",
    prohibitedClaim: "会話のしやすさから、正確なペース、心肺機能、病気、安全な強さ、走行可否を評価または処方しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
]);

const ARTICLE_BY_ID = new Map(ARTICLE_EVIDENCE_REGISTRY.map((article) => [article.articleId, article]));

function getSourceEvidenceGovernance(sourceId) {
  return SOURCE_BY_ID.get(String(sourceId || "")) || null;
}

function getArticleEvidenceGovernance(articleId) {
  return ARTICLE_BY_ID.get(String(articleId || "")) || null;
}

function buildArticleEvidenceGovernance(articleId, sources = []) {
  const governance = getArticleEvidenceGovernance(articleId);
  if (!governance) return null;
  const declaredSourceIds = sources.map((source) => String(source?.sourceId || "")).filter(Boolean);
  const missingSourceIds = governance.sourceIds.filter((sourceId) => !declaredSourceIds.includes(sourceId));
  return Object.freeze({
    ...governance,
    version: EVIDENCE_GOVERNANCE_VERSION,
    sourceRecords: Object.freeze(governance.sourceIds.map(getSourceEvidenceGovernance).filter(Boolean)),
    sourceIntegrity: Object.freeze({
      declaredSourceIds: Object.freeze(declaredSourceIds),
      missingSourceIds: Object.freeze(missingSourceIds),
      status: missingSourceIds.length ? "MISMATCH" : "PASS",
    }),
  });
}
__exp["EVIDENCE_GOVERNANCE_VERSION"] = EVIDENCE_GOVERNANCE_VERSION;
__exp["EVIDENCE_GOVERNANCE_REVIEW_DATE"] = EVIDENCE_GOVERNANCE_REVIEW_DATE;
__exp["SOURCE_EVIDENCE_REGISTRY"] = SOURCE_EVIDENCE_REGISTRY;
__exp["ARTICLE_EVIDENCE_REGISTRY"] = ARTICLE_EVIDENCE_REGISTRY;
__exp["getSourceEvidenceGovernance"] = getSourceEvidenceGovernance;
__exp["getArticleEvidenceGovernance"] = getArticleEvidenceGovernance;
__exp["buildArticleEvidenceGovernance"] = buildArticleEvidenceGovernance;
__mods[51] = __exp;
}

// ===== data/columnData.js =====
{
const __exp = Object.create(null);
const { buildArticleEvidenceGovernance } = __mods[51];

// RunLoadの利用者向け読みもの。
// 計算の詳しい説明は保存資料側で管理し、ここでは初心者が表示を
// 誤解しないために必要な範囲だけを説明する。

const COLUMN_CATEGORIES = Object.freeze([
  "結果の読み方",
  "入力と振り返り",
  "走りとのつき合い方",
  "走る前・走っている間",
  "走った後の整え方",
  "部位・コース",
  "相談・共有",
]);

const PROJECT_V27 = Object.freeze({
  sourceId: "RUNLOAD-SPEC-CURRENT",
  title: "RunLoadの表示と比較の考え方",
  organization: "RunLoad",
  year: "2026",
  url: "",
  sourceType: "designSpecification",
  sourceTypeLabel: "アプリ内の説明",
  lastChecked: "2026-07-31",
});

const MINETTI_2002 = Object.freeze({
  sourceId: "APP-COL-MINETTI",
  title: "Energy cost of walking and running at extreme uphill and downhill slopes",
  organization: "Journal of Applied Physiology",
  year: "2002",
  url: "https://journals.physiology.org/doi/10.1152/japplphysiol.01177.2001",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-07-31",
});

const VAN_HOOREN_2024 = Object.freeze({
  sourceId: "APP-COL-VAN-HOOREN",
  title: "Per-step and cumulative load at three common running injury locations: The effect of speed, surface gradient, and cadence",
  organization: "Scandinavian Journal of Medicine & Science in Sports",
  year: "2024",
  url: "https://onlinelibrary.wiley.com/doi/full/10.1111/sms.14570",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-07-31",
});

const NUCKOLS_2020 = Object.freeze({
  sourceId: "APP-COL-NUCKOLS",
  title: "Mechanics of walking and running up and downhill: A joint-level perspective to guide design of lower-limb exoskeletons",
  organization: "PLOS ONE",
  year: "2020",
  url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0231996",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-07-31",
});

const YAMIN_2021 = Object.freeze({
  sourceId: "APP-COL-YAMIN",
  title: "Effects of Surface Stiffness on Plantar Pressure and Lower-Limb Muscle Activity during Running",
  organization: "BioMed Research International",
  year: "2021",
  url: "https://doi.org/10.1155/2021/8842591",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-05",
});

const VOLOSHINA_2015 = Object.freeze({
  sourceId: "APP-COL-VOLOSHINA",
  title: "Biomechanics and energetics of running on uneven terrain",
  organization: "Journal of Experimental Biology",
  year: "2015",
  url: "https://doi.org/10.1242/jeb.106518",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-05",
});

const HORIGUCHI_2025 = Object.freeze({
  sourceId: "APP-COL-HORIGUCHI",
  title: "Effects of uphill and downhill running on plantar pressure distribution in different foot strike patterns",
  organization: "Frontiers in Sports and Active Living",
  year: "2025",
  url: "https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1654489/full",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-05",
});

const HADDAD_2017 = Object.freeze({
  sourceId: "APP-COL-HADDAD",
  title: "Session-RPE Method for Training Load Monitoring: Validity, Ecological Usefulness, and Influencing Factors",
  organization: "Frontiers in Neuroscience",
  year: "2017",
  url: "https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2017.00612/full",
  sourceType: "reviewPaper",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-07-31",
});

const LINTON_2025 = Object.freeze({
  sourceId: "APP-COL-LINTON",
  title: "Running-Centred Injury Prevention Support: A Scoping Review on Current Injury Risk Reduction Practices for Runners",
  organization: "Translational Sports Medicine",
  year: "2025",
  url: "https://doi.org/10.1155/tsm2/3007544",
  sourceType: "scopingReview",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-07-31",
});

const BUIST_2008 = Object.freeze({
  sourceId: "APP-COL-BUIST",
  title: "No Effect of a Graded Training Program on the Number of Running-Related Injuries in Novice Runners: A Randomized Controlled Trial",
  organization: "The American Journal of Sports Medicine",
  year: "2008",
  url: "https://doi.org/10.1177/0363546507307505",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const KRUKOWSKI_2024 = Object.freeze({
  sourceId: "APP-COL-KRUKOWSKI",
  title: "Impact of feedback generation and presentation on self-monitoring behaviors, dietary intake, physical activity, and weight: a systematic review and meta-analysis",
  organization: "International Journal of Behavioral Nutrition and Physical Activity",
  year: "2024",
  url: "https://doi.org/10.1186/s12966-023-01555-6",
  sourceType: "systematicReview",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const KARAHANOGLU_2021 = Object.freeze({
  sourceId: "APP-COL-KARAHANOGLU",
  title: "How Are Sports-Trackers Used by Runners? Running-Related Data, Personal Goals, and Self-Tracking in Running",
  organization: "Sensors",
  year: "2021",
  url: "https://doi.org/10.3390/s21113687",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const JANSSEN_2020 = Object.freeze({
  sourceId: "APP-COL-JANSSEN",
  title: "Understanding Different Types of Recreational Runners and How They Use Running-Related Technology",
  organization: "International Journal of Environmental Research and Public Health",
  year: "2020",
  url: "https://doi.org/10.3390/ijerph17072276",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const WINTER_2020 = Object.freeze({
  sourceId: "APP-COL-WINTER",
  title: "A Multifactorial Approach to Overuse Running Injuries: A 1-Year Prospective Study",
  organization: "Sports Health",
  year: "2020",
  url: "https://doi.org/10.1177/1941738119888504",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const BESOMI_2025 = Object.freeze({
  sourceId: "APP-COL-BESOMI",
  title: "Exploring contextual factors for management and prevention of running-related injuries: runners and experts’ perspectives",
  organization: "BMJ Open Sport & Exercise Medicine",
  year: "2025",
  url: "https://doi.org/10.1136/bmjsem-2024-002413",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const COOLDOWN_VAN_HOOREN_2018 = Object.freeze({
  sourceId: "APP-COL-COOLDOWN-VAN-HOOREN",
  title: "Do We Need a Cool-Down After Exercise? A Narrative Review of the Psychophysiological Effects and the Effects on Performance, Injuries and the Long-Term Adaptive Response",
  organization: "Sports Medicine",
  year: "2018",
  url: "https://link.springer.com/article/10.1007/s40279-018-0916-2",
  sourceType: "reviewPaper",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const AFONSO_2021 = Object.freeze({
  sourceId: "APP-COL-AFONSO",
  title: "The Effectiveness of Post-exercise Stretching in Short-Term and Delayed Recovery of Strength, Range of Motion and Delayed Onset Muscle Soreness: A Systematic Review and Meta-Analysis of Randomized Controlled Trials",
  organization: "Frontiers in Physiology",
  year: "2021",
  url: "https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2021.677581/full",
  sourceType: "systematicReview",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const HEW_BUTLER_2017 = Object.freeze({
  sourceId: "APP-COL-HEW-BUTLER",
  title: "Exercise-Associated Hyponatremia: 2017 Update",
  organization: "Frontiers in Medicine",
  year: "2017",
  url: "https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2017.00021/full",
  sourceType: "reviewPaper",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const ARENT_2020 = Object.freeze({
  sourceId: "APP-COL-ARENT",
  title: "Nutrient Timing: A Garage Door of Opportunity?",
  organization: "Nutrients",
  year: "2020",
  url: "https://www.mdpi.com/2072-6643/12/7/1948",
  sourceType: "reviewPaper",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const DOHERTY_2021 = Object.freeze({
  sourceId: "APP-COL-DOHERTY-SLEEP",
  title: "The Sleep and Recovery Practices of Athletes",
  organization: "Nutrients",
  year: "2021",
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8072992/",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const GRUNDSTEIN_2019 = Object.freeze({
  sourceId: "APP-COL-GRUNDSTEIN-HEAT",
  title: "Influence of Race Performance and Environmental Conditions on Exertional Heat Stroke Prevalence Among Runners Participating in a Warm Weather Road Race",
  organization: "Frontiers in Sports and Active Living",
  year: "2019",
  url: "https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2019.00042/full",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const JSPO_HEAT_GUIDANCE_2025 = Object.freeze({
  sourceId: "APP-GUIDE-JSPO-HEAT",
  title: "スポーツ活動中の熱中症予防ガイドブック",
  organization: "公益財団法人日本スポーツ協会",
  year: "2025",
  url: "https://www.japan-sports.or.jp/medicine/heatstroke/tabid523.html",
  sourceType: "publicGuidance",
  sourceTypeLabel: "公的資料",
  lastChecked: "2026-08-06",
});

const KWON_2023 = Object.freeze({
  sourceId: "APP-COL-KWON-TALK",
  title: "The talk test as a useful tool to monitor aerobic exercise intensity in healthy population",
  organization: "Journal of Exercise Rehabilitation",
  year: "2023",
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10331140/",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

function article(input) {
  return Object.freeze({
    ...input,
    tags: Object.freeze([...(input.tags || [])]),
    body: Object.freeze([...(input.body || [])]),
    practicePoints: Object.freeze([...(input.practicePoints || [])]),
    sources: Object.freeze([...(input.sources || [])]),
    evidenceGovernance: buildArticleEvidenceGovernance(input.id, input.sources || []),
    lastReviewed: "2026-08-06",
  });
}

const COLUMN_ARTICLES = Object.freeze([
  article({
    id: "model-total-v27",
    title: "走り全体の目安で、何を見返せるか",
    category: "結果の読み方",
    tags: ["走り全体の目安", "距離", "勾配", "路面"],
    lead: "走った量とコース条件をまとめて振り返り、自分の記録どうしを比べるための目安です。",
    summary: "長い距離を走った日と短い日、平坦な日と坂のある日では、走行の内容が違います。その違いを見返す手掛かりにします。",
    body: [
      "走行距離が増えると、走る動作を繰り返す回数や時間も増えます。上り・下りでは、平坦路と比べて身体の使い方も変わります。",
      "路面の硬さや凹凸も、足の接地や身体の動かし方に関係します。そのため、数値だけを見るのではなく、距離・坂・路面など、その日の記録を一緒に見ることが大切です。",
      "この値は自分の記録を同じ意味で比べるための目安です。身体に加わった力や消費エネルギーを直接測った値ではありません。",
    ],
    practicePoints: [
      "値と一緒に、距離、時間、坂、路面を確認する。",
      "距離が大きく違う日は、まず走った量の違いを考える。",
      "分からない条件がある日は、分かっている範囲の目安として読む。",
    ],
    caution: "この値は実測した力、疲労、障害の有無や確率、走行可否を表しません。",
    sources: [PROJECT_V27, MINETTI_2002],
  }),
  article({
    id: "regional-three-views",
    title: "12部位の目安をどう読むか",
    category: "結果の読み方",
    tags: ["部位の目安", "走行距離", "12部位", "基準100", "身体図"],
    lead: "走行距離と、確認できた走行条件を使って各部位の目安を出し、その部位自身の基準100と比べます。",
    summary: "12部位それぞれで100との差を見ます。別の部位どうしの数値を順位として比べません。",
    body: [
      "坂の向き、走る速さ、足の運び方が変わると、関節の動き、筋肉の働き、足裏の圧のかかり方も変わります。変わり方は部位ごとに同じではありません。",
      "この画面では、走行距離と確認できた走行条件から出した部位の目安を、その部位自身の基準100と比べます。たとえば128なら、その部位の基準より28ポイント上です。別の部位どうしの数値を比べて、どちらの負担が大きいとは判断できません。",
      "走行距離は部位の数値へ掛けず、別の走行事実として扱います。歩数は使える条件がそろった場合だけ一部の部位に反映し、条件が足りないときは無理に補正しません。",
    ],
    practicePoints: [
      "各部位について、その部位自身の基準100との差を確認する。",
      "次に、距離・ペース・坂・路面など、保存した走行条件を一緒に確認する。",
      "過去比較があるときは、同じ意味で比べられる記録かを確認する。",
    ],
    caution: "この部位の目安は、実測した力、けがの確率、危険度、走ってよいかどうか、部位どうしの順位を示すものではありません。基準100は安全値・正常値・初心者平均でもありません。",
    sources: [PROJECT_V27, VAN_HOOREN_2024, NUCKOLS_2020],
  }),
  article({
    id: "regional-six-eight-28",
    title: "12部位の身体図と、自分の身体記録の違い",
    category: "結果の読み方",
    tags: ["身体図", "12部位", "身体記録", "自分の感覚"],
    lead: "12部位の目安と、自分で残す身体記録は目的が異なります。",
    summary: "身体図は走行条件から出した12部位の目安、身体記録は自分が感じたことをそのまま残す記録です。",
    body: [
      "12部位の身体図は、坂・ペース・歩数・路面などの記録から出した目安です。自分が痛みや疲れを感じた場所を示すものではありません。",
      "身体記録では、感じた場所、左右、程度、気づいた時点を残せます。こちらは自分の感覚を記録するもので、12部位の目安とは分けて表示します。",
      "2つの表示が同じ方向でも違っていても、それだけで原因は分かりません。気になったことがあれば、走った条件と自分の感覚を分けて残すと、あとで振り返りやすくなります。",
    ],
    practicePoints: [
      "身体図では、各部位自身の基準100との差を見る。",
      "身体記録では、感じた場所・程度・時点を自分の言葉で残す。",
      "2つが一致したかどうかだけで原因を決めない。",
    ],
    caution: "部位分類はアプリの情報設計であり、診断分類や普遍的な人体区分ではありません。",
    sources: [PROJECT_V27],
  }),
  article({
    id: "rpe-separated",
    title: "走り全体のきつさ（RPE）を別に見る理由",
    category: "入力と振り返り",
    tags: ["RPE", "走り全体のきつさ", "振り返り"],
    lead: "同じ距離やコースでも、自分が感じるきつさは毎回同じとは限りません。",
    summary: "RPEは、走り終えた自分が1回の走行全体をどれくらいきつく感じたかを0〜10で残す方法です。",
    body: [
      "RPEは、走り終えた自分が、この1回をどれくらいきつく感じたかを0〜10で記録する方法です。トレーニングの振り返りに広く使われています。",
      "同じ距離やコースでも、暑さ、睡眠、体調、走る速さなどによって感じ方が違うことがあります。そのため、走行条件の数値だけでなく、自分の感じ方も別に残す意味があります。",
      "履歴では、走行全体の参考値、部位ごとの表示、RPE、自分の身体記録を分けて見ます。似た条件の日に感じ方がどう違ったかを振り返る材料にできます。",
    ],
    practicePoints: [
      "RPEは走行全体を振り返って入力する。",
      "数値とRPEが同じ方向でも違う方向でも、それだけで良し悪しを決めない。",
      "気になった背景は、睡眠や天候を断定せず自分のメモへ残す。",
    ],
    caution: "RPEは部位の実測値、健康状態の判定、障害予測ではありません。",
    sources: [PROJECT_V27, HADDAD_2017],
  }),
  article({
    id: "grade-and-coverage",
    title: "上り・下りで身体の使われ方が変わる理由",
    category: "部位・コース",
    tags: ["上り", "下り", "坂道", "身体の使い方"],
    lead: "上り・下りでは、平坦路と比べて関節の動きや筋肉の働きが変わります。",
    summary: "同じ坂道でも、上りと下り、部位、走る速さによって身体の反応は同じではありません。",
    body: [
      "上りでは身体を持ち上げる動きが増え、下りでは着地しながら速度を調整する動きが増えます。股関節・膝・足首の働き方は、上りと下りで異なります。",
      "膝蓋大腿関節部、下腿後面、足関節部などは、それぞれ違う役割を持ちます。そのため、上りだから全部位が上がる、下りだから全部位が下がる、という単純な関係ではありません。",
      "坂の傾きや区間の長さによっても走り方は変わります。記録するときは、コース全体のおおよその上り・下りと、分かる範囲の傾きを残すと振り返りやすくなります。",
    ],
    practicePoints: [
      "上りと下りを分けて記録する。",
      "坂の区間が短いか長いかも一緒に思い出す。",
      "部位の数値は、坂だけで決まるものとして読まない。",
    ],
    caution: "代表勾配はコースの全変化を再現するものではなく、部位表示は実際の筋・腱・関節力ではありません。",
    sources: [PROJECT_V27, MINETTI_2002, VAN_HOOREN_2024, NUCKOLS_2020],
  }),
  article({
    id: "surface-missingness",
    title: "路面や足のつき方で、足元の使われ方が変わる理由",
    category: "部位・コース",
    tags: ["路面", "足裏", "足のつき方", "凹凸"],
    lead: "路面の硬さや凹凸、足のつき方によって、足裏の圧や身体の動かし方が変わることがあります。",
    summary: "路面名だけで決めつけず、硬さ、安定性、凹凸、乾湿など、実際の状態を一緒に見ることが大切です。",
    body: [
      "路面の硬さが変わると、足裏の圧や脚の使い方も変わります。凹凸のある地面では、平らな地面より身体を安定させる動きが増えることがあります。",
      "上り・下りでは、かかと寄りか前足部寄りかといった足のつき方によっても、足裏の圧が分布する場所が変わることがあります。",
      "実際の路面は、同じ『舗装路』『天然芝』という名前でも状態が同じとは限りません。よく分からない場合は無理に決めず、分からないまま残すと、別の条件と取り違えずに振り返れます。",
    ],
    practicePoints: [
      "路面名だけでなく、硬さ・凹凸・乾湿を思い出す。",
      "自分の足のつき方が分からないときは、推測で選ばない。",
      "迷う条件は『不明』として残す。",
    ],
    caution: "路面による数値の違いは、個人の障害原因や、その路面を走ってよいかを示しません。",
    sources: [PROJECT_V27, YAMIN_2021, VOLOSHINA_2015, HORIGUCHI_2025],
  }),
  article({
    id: "personal-reference",
    title: "部位の前回比較は、いつ表示されるか",
    category: "入力と振り返り",
    tags: ["自分の過去記録", "前回比較", "比べられる記録"],
    lead: "同じ部位で、同じ計算方法で比べられる以前の記録がある場合だけ表示します。",
    summary: "今回の部位の目安を、同じ部位・同じ基準・同じ計算方法で比べられる直近の過去記録とだけ見比べます。",
    body: [
      "部位の目安は、同じ部位・同じ基準・同じ計算方法を使った記録だけを比較候補にします。条件が違う記録でも、同じ意味で比べられる場合だけ前回比較に使います。",
      "直接比べられる以前の記録があるときは、その中で直近の1件と今回の差を表示します。比べられる記録がなければ、無理に差を作らず理由を示します。",
      "この比較は正常値や理想値との比較ではありません。今回と以前の部位の目安を同じ意味の範囲で振り返るための参考です。",
    ],
    practicePoints: [
      "部位の目安を数値で出せる場合は、その部位自身の基準100との関係も確認する。",
      "前回比較が出ないときは、比較できない理由と走行条件を確認する。",
      "前回より上でも下でも、それだけで良し悪しを決めない。",
    ],
    caution: "部位の前回比較は、正常範囲、身体の適応、障害リスク、原因を示しません。異なる条件経路どうしの数値を直接つなぎません。",
    sources: [PROJECT_V27],
  }),
  article({
    id: "history-compatible",
    title: "履歴で比べてよい記録・比べない記録",
    category: "入力と振り返り",
    tags: ["履歴", "過去比較", "未入力", "比べられない記録"],
    lead: "同じ意味で比べられる記録だけを、同じグラフに並べます。",
    summary: "休養、未記録、比較できない記録、数値なしを0で埋めず、線に含めない理由を表示します。",
    body: [
      "走っていない日、記録していない日、同じ意味で比べられない記録は、数値の0ではありません。グラフでは0として線をつながず、含めなかった理由を表示します。",
      "部位別の履歴では、選んだ部位・基準・計算方法がそろった記録だけをつなぎます。意味が違う記録は同じ線にしません。",
      "RPEと自分の身体記録は、数値結果とは別の記録です。並びを見て自分の記録を振り返る材料にはできますが、一致や不一致から原因を自動判定しません。",
    ],
    practicePoints: [
      "グラフの部位名・基準・条件経路の意味を確認する。",
      "空白を0と読まず、線に含めなかった理由を確認する。",
      "書き出したデータでは、比べた記録の件数も一緒に確認する。",
    ],
    caution: "履歴の変化だけから身体状態、原因、障害の発生確率を推定しません。",
    sources: [PROJECT_V27],
  }),
  article({
    id: "plan-facts-current",
    title: "走る予定と、実際の記録を分ける",
    category: "入力と振り返り",
    tags: ["プラン", "予定入力", "実績", "比較"],
    lead: "予定画面は、これから走る距離・時間・コース条件を整理する場所です。",
    summary: "予定を数値スコアにせず、保存した入力条件と実績を後から比べる材料にします。",
    body: [
      "走る前に分かるのは予定です。実際の歩数、走り全体のきつさ（RPE）、走行時間、コースの状態は、走ったあとで予定と違うことがあります。",
      "予定画面では、距離・時間・走行形式・コース条件を予定事実として確認します。旧形式の走行全体スコアは新しい予定には作りません。12部位の結果は、実際に走って記録を保存したあとに確認します。",
      "保存した予定は、その時点で考えていた内容として残ります。実際の記録と並べると、距離、時間、コース条件がどのように違ったかを振り返れます。",
    ],
    practicePoints: [
      "予定画面では距離・時間・コース条件が事実として確認できるかを見る。",
      "予定はおすすめの練習メニューではなく、自分で考えた内容の記録として読む。",
      "走ったあとは、実際の歩数・RPE・走行時間を入力する。",
    ],
    caution: "予定の入力事実は最適な練習、達成可能性、身体状態、走行可否を示しません。",
    sources: [PROJECT_V27],
  }),
  article({
    id: "training-progression-no-universal-rule",
    title: "練習量に『毎週○％』という万能ルールはあるか",
    category: "走りとのつき合い方",
    tags: ["練習量", "10％ルール", "距離", "予定と実績"],
    lead: "毎週同じ割合で距離を増やせば、誰にでも安全になるという決まりは確認されていません。",
    summary: "一つの割合を正解にせず、予定と実績、その日の感じ方や背景を分けて見返すことが大切です。",
    body: [
      "初心者ランナーを対象に、練習量を毎週約10％ずつ増やす方法と別の方法を比べた調査では、10％ずつ増やした方でけがが少なくなるとは確認されませんでした。",
      "これは、練習量を急に増やしてよいという意味ではありません。また、10％という割合を全員に当てはまる安全な増やし方とは言えません。",
      "走り方や生活背景は人によって違うため、一つの増やし方を全員に当てはめないことが大切です。予定は守るべき正解ではなく、実際にどう走ったかを後で振り返るための記録として使えます。",
    ],
    practicePoints: [
      "予定どおり、変更、未実施のどれも事実として残す。",
      "割合だけでなく、距離、時間、回数、コースも分けて見る。",
      "次の予定は、直前の一回だけで決めず、自分の記録を見ながら考える。",
    ],
    caution: "この記事は、個人に合う増加率、けがを防ぐ方法、走ってよいかどうかを示しません。",
    sources: [BUIST_2008, LINTON_2025],
  }),
  article({
    id: "goals-and-recording-differ",
    title: "記録や目標の使い方は、人によって違う",
    category: "走りとのつき合い方",
    tags: ["記録", "目標", "振り返り", "ランニング用機器"],
    lead: "走る目的や、記録から知りたいことは、同じ人でも状況に応じて変わることがあります。",
    summary: "距離や連続日数だけを成功の基準にせず、自分が今知りたいことに合わせて記録を選びます。",
    body: [
      "ランニングの記録は、走った事実を残すためにも、次の行動を考えるためにも使えます。必要な情報や目標は、そのときの状況によって変わります。",
      "走る目的や、記録から知りたいことは人によって違います。他の人と同じ使い方に合わせる必要はありません。",
      "記録は多ければよいとは限りません。今の自分が振り返りたいことに必要な記録を選ぶと、見返しやすくなります。",
    ],
    practicePoints: [
      "今の自分が覚えておきたいことを一つ選ぶ。",
      "目標が変わったら、以前の目標に無理に合わせない。",
      "記録しない日や休む日を、失敗や0点として扱わない。",
    ],
    caution: "この記事は、記録を続けたときの効果や、特定の目標・機器・アプリが他よりよいことを保証しません。",
    sources: [KARAHANOGLU_2021, JANSSEN_2020, KRUKOWSKI_2024],
  }),
  article({
    id: "context-not-single-cause",
    title: "走った日の背景を、一つの原因に決めない",
    category: "走りとのつき合い方",
    tags: ["生活背景", "環境", "個人差", "相談準備"],
    lead: "走った日の感じ方には、練習、過去の経験、生活や環境など、複数の背景が重なることがあります。",
    summary: "一つの記録だけで原因を決めず、分かっている事実と自分の感じ方を分けて残します。",
    body: [
      "走った日の感じ方には、練習だけでなく、休養、生活、環境など複数のことが重なります。一つだけを原因と決めないことが大切です。",
      "練習、過去の経験、身体の特徴、走り方などは別々の情報です。一回の記録だけで、その後の状態を正確に予測することはできません。",
      "ランナーと専門家への聞き取りでは、経験や状況によって情報の受け取り方や行動が異なり、経験の少ない人が情報の確かさを判断しにくい場合も報告されています。これは、どれか一つを原因と決めるのではなく、分かる範囲の事実を整理する意味を示しています。",
      "天候、睡眠、生活背景、自分の感じ方は、それぞれ別の記録として残せます。何日かを見返すときも、同時に記録されていることだけで原因と結果を決めず、必要なら相談相手へ事実として共有します。",
    ],
    practicePoints: [
      "天候、睡眠、走った内容、自分の感じ方を別々に残す。",
      "一回だけの一致から、原因や良し悪しを決めない。",
      "相談するときは、推測より先に日付と記録した事実を伝える。",
    ],
    caution: "自分のメモや数値から、原因、診断、けがの確率、走ってよいかどうかを推定する記事ではありません。",
    sources: [LINTON_2025, WINTER_2020, BESOMI_2025],
  }),
  article({
    id: "cooldown-stretching-limits",
    title: "クールダウンやストレッチで、できること・できないこと",
    category: "走った後の整え方",
    tags: ["クールダウン", "ストレッチ", "筋肉痛", "回復"],
    lead: "クールダウンやストレッチは、行えば必ず筋肉痛やけがを防げる方法ではありません。",
    summary: "目的や感じ方には違いがあります。クールダウンやストレッチだけで回復やけが予防を決めつけないことが大切です。",
    body: [
      "運動後の軽い運動をまとめたレビューでは、翌日以降の運動成績や筋肉痛などへの効果は全体として小さいか、結果が一定していませんでした。また、クールダウンによってけがを防げることが確認されたわけではありません。",
      "運動後のストレッチについては、何もしないで休んだ場合より筋肉痛や筋力の戻り方が明らかに良くなるとは確認されていません。効果を一律に決めつけないようにします。",
      "これらは、クールダウンやストレッチをしてはいけない、または全く意味がないという結論ではありません。気持ちの切り替えや自分の好みなど、回復効果とは別の目的もあります。行った内容と、その後にどう感じたかを分けて残すと振り返りやすくなります。",
    ],
    practicePoints: [
      "行った内容と、その後の自分の感じ方を別々に記録する。",
      "行ったかどうかだけを、その日の成功・失敗にしない。",
      "筋肉痛の有無だけで、次に走ってよいかを決めない。",
    ],
    caution: "この記事は、方法や時間を指定せず、治療効果、けがの予防、回復の保証、走行可否を示しません。",
    sources: [COOLDOWN_VAN_HOOREN_2018, AFONSO_2021],
  }),
  article({
    id: "hydration-not-more-is-better",
    title: "水分補給は、多いほどよいわけではない",
    category: "走った後の整え方",
    tags: ["水分補給", "発汗", "暑さ", "個人差"],
    lead: "走る前後や途中の水分補給は、全員が同じ量を飲めばよいものではありません。",
    summary: "走った時間や環境、自分の記録を分けて振り返り、飲んだ量の多さだけを良し悪しにしません。",
    body: [
      "汗のかき方や走る時間、気温などは人や日によって違います。そのため、全員に共通する一つの量だけで、水分補給の良し悪しを決めることはできません。",
      "長時間の運動などを扱ったレビューでは、のどの渇きを超えて飲み続けることが、運動に伴う低ナトリウム血症（血液中のナトリウム濃度が低くなる状態）の主な背景として整理されています。また、飲み過ぎを避ける考え方として、のどの渇きに応じて飲む方法が示されています。これは、全員に同じ量を示すものではありません。",
      "RunLoadには天候や食事・水分の自己記録を残せますが、必要な水分量や身体の水分状態を計算していません。何をどのくらい飲んだかは事実として残し、量の多さだけを安心や不足の判定に変えないことが大切です。",
    ],
    practicePoints: [
      "走った時間、天候、飲んだものを分けて記録する。",
      "本数や量だけを、水分が足りたかどうかの判定にしない。",
      "体調について気になることがある場合は、アプリで判断せず適切な相談先へ伝える。",
    ],
    caution: "この記事は、個人の水分量、電解質の取り方、脱水や飲み過ぎの判定、治療、走行可否を示しません。",
    sources: [HEW_BUTLER_2017],
  }),
  article({
    id: "post-run-food-timing-context",
    title: "走った後の食事は、早さだけで決まらない",
    category: "走った後の整え方",
    tags: ["食事", "栄養", "走った後", "個人差"],
    lead: "走った後の食事は、何分以内かだけでなく、走った内容や普段の食事も含めて考えます。",
    summary: "一つの短い時間帯を全員共通の正解にせず、運動の内容と一日の食事を分けて見ます。",
    body: [
      "栄養を取る時機についてまとめたレビューでは、運動前・運動中・運動後の食事は互いにつながっており、運動後の一つの短い時間だけで考えるものではないと整理されています。",
      "食事の時機がどれほど重要かは、運動の種類、強さ、長さ、回数や、次の運動までの間隔などによって変わります。同じ日に複数回運動する場合のように、短い時間での回復が必要な場面と、そうでない場面を同じに扱うことはできません。",
      "このレビューでは、一日の食事全体や運動内容が土台にあり、その上で食事の時機を考えるという見方が示されています。RunLoadの食事・水分メモは自分の記録であり、栄養状態や回復を評価するものではありません。",
    ],
    practicePoints: [
      "食べた内容と時刻を、良し悪しを付けずに記録する。",
      "次の運動までの間隔など、その日の予定も別に残す。",
      "早く食べたことや補助食品を使ったことだけを、よりよい回復と決めない。",
    ],
    caution: "この記事は、食事量、食品や補助食品、摂取時刻を個別に勧めず、栄養不足、回復効果、走行可否を判定しません。",
    sources: [ARENT_2020],
  }),
  article({
    id: "sleep-not-hours-only",
    title: "睡眠は、『何時間なら正解』だけで決めない",
    category: "走る前・走っている間",
    tags: ["睡眠", "睡眠時間", "睡眠の質", "自分の感じ方"],
    lead: "睡眠は、長さだけでなく、眠れた感じや普段との違いも分けて振り返ります。",
    summary: "一つの睡眠時間を全員共通の正解にせず、睡眠時間、眠りの質、眠る時間帯、自分の感じ方を別々の情報として見ます。",
    body: [
      "必要な睡眠時間には個人差があります。睡眠時間だけでなく、眠れた感じや眠る時間帯も一緒に振り返ります。",
      "睡眠の記録は思い出し方によるずれもあります。一晩の記録だけで、身体の回復や次に走ってよいかを決めることはできません。",
      "RunLoadの睡眠メモは、自分が覚えている事実や感じ方を残す欄です。睡眠の質や回復を計算するものではありません。『短かった』『途中で目が覚めた』『いつもと違った』のように分けて残すと、後から普段との違いを見返しやすくなります。",
    ],
    practicePoints: [
      "眠った時間と、眠れた感じを別々に記録する。",
      "他の人の時間ではなく、自分の普段の記録と比べる。",
      "一晩の記録だけで、原因や次に走ってよいかを決めない。",
    ],
    caution: "この記事は、睡眠障害、回復状態、治療、必要な睡眠時間、走行可否を判定または処方しません。",
    sources: [DOHERTY_2021],
  }),
  article({
    id: "heat-not-temperature-only",
    title: "暑い日の走りは、気温だけで判断しない",
    category: "走る前・走っている間",
    tags: ["暑さ", "気温", "暑さ指数", "WBGT", "天候"],
    lead: "暑さを考えるときは、気温だけでなく、湿度や日差し、走る内容なども関係します。",
    summary: "一つの気温だけで安全・危険を決めず、走る場所と時間の最新情報を別に確認します。",
    body: [
      "暑さは気温だけでは決まりません。湿度や日差しなどを含む暑さ指数（WBGT）も確認し、一つの数値だけで安全・危険を決めないようにします。",
      "日本スポーツ協会の案内でも、スポーツ時の暑さを考える指標としてWBGTが使われています。公式情報は更新されるため、走る前には、アプリ内の過去記録だけでなく、走る場所と時間の最新のWBGTや公的な案内を確認します。",
      "RunLoadには気温や天候のメモを残せますが、WBGTや暑さによる体調不良の可能性を計算していません。気温、天候、時間帯、日差しなどを分けて残すと、その日の環境を後から思い出しやすくなります。",
    ],
    practicePoints: [
      "走る場所と時間の最新のWBGTや公的な案内を、アプリとは別に確認する。",
      "気温、天候、時間帯、日差しの有無を分けて記録する。",
      "一つの気温や過去記録だけを、安全・危険の判定にしない。",
    ],
    caution: "この記事は、熱中症などの診断、個人の安全、必要な水分量、運動の中止・実施可否を判定しません。",
    sources: [GRUNDSTEIN_2019, JSPO_HEAT_GUIDANCE_2025],
  }),
  article({
    id: "talk-test-as-subjective-cue",
    title: "ペースが分からないときは、会話のしやすさも手掛かりになる",
    category: "走る前・走っている間",
    tags: ["ペース", "会話", "走るときのきつさ", "RPE", "自分の感じ方"],
    lead: "速度だけでなく、話しやすかったかどうかも、走っているときのきつさを振り返る手掛かりになります。",
    summary: "会話できる・話しにくいという自分の感覚を、速度や走り全体のきつさ（RPE）とは別の情報として扱います。",
    body: [
      "会話のしやすさは、走っているときのきつさを振り返る手掛かりの一つです。",
      "ただし、会話のしやすさだけから、正確なペースや安全な強さを決めることはできません。",
      "会話のしやすさは自分の感覚であり、速度やRPEと同じ情報ではありません。『話しやすかった』『短い言葉なら話せた』『話しにくかった』などを自分のメモに残し、同じ人の記録を何回か見返す手掛かりにできます。",
    ],
    practicePoints: [
      "走っている間の話しやすさを、自分の言葉で短く残す。",
      "速度、RPE、会話のしやすさを、それぞれ別の記録として見る。",
      "話せたかどうかだけで、安全・危険や目標ペースを決めない。",
    ],
    caution: "この記事は、心肺機能、病気、個人の目標ペース、走る強さ、走行可否を評価または処方しません。",
    sources: [KWON_2023],
  }),
  article({
    id: "consultation-prep-v27",
    title: "相談資料に入れるもの・入れないもの",
    category: "相談・共有",
    tags: ["相談準備", "自分の記録", "基準100", "共有"],
    lead: "入力した事実と自分の言葉を先に置き、数値には基準100の意味と注意点を添えます。",
    summary: "相談相手が再確認できる情報をそろえ、順位・診断・原因推定は資料へ入れません。",
    body: [
      "相談資料には、日付、距離、実走時間、走り全体のきつさ（RPE）、把握した坂・路面、自分のメモ、自分が選んだ身体部位を入れます。自分が感じたことと数値表示は別の欄にします。",
      "数値結果を入れる場合は、確認できた条件、選択した部位、100の意味、値が表す内容を明記します。自分の過去記録と比べる場合は、参照した件数と期間も添えます。",
      "部位の順位、障害名、原因、発生確率、危険度、走行してよいかという結論は自動で作りません。短文は自分で編集し、アプリから自動送信せず、共有相手も自分で選びます。",
    ],
    practicePoints: [
      "相手に確認してほしいことを自分の言葉で1つ書く。",
      "まず今回の記録を確認し、必要なら同じ計算方法で比べられる最近の記録も添える。",
      "共有前に、見せたくないメモが含まれていないか確認する。",
    ],
    caution: "相談資料は記録整理であり、医学的評価や専門家の判断を代替しません。",
    sources: [PROJECT_V27, LINTON_2025],
  }),
  article({
    id: "slope-endpoints",
    title: "上りと下りで、部位表示の方向が違う理由",
    category: "部位・コース",
    tags: ["上り", "下り", "膝蓋大腿関節部", "脛骨部", "アキレス腱部"],
    lead: "上りと下りでは身体の役割が変わり、その変化も部位ごとに同じではありません。",
    summary: "股関節部、膝蓋大腿関節部、足関節部、アキレス腱部などは走るときの役割が違うため、同じ坂でも表示が別の方向へ動くことがあります。",
    body: [
      "上りでは身体を前上方へ運ぶため、股関節や足首の働き方が平坦路とは変わります。下りでは着地の衝撃を受け止めながら速度を調整する動きが増えます。",
      "速度、坂の傾き、歩数の違いによって、膝蓋大腿関節部、アキレス腱部、足底周辺の目安が違う方向へ動くことがあります。",
      "12部位は同じ単位で測った順位ではありません。部位の目安を数値で出せる場合は、その部位自身の基準100との差と、その日の走行条件を一緒に見ます。数値を出せない部位は「数値なし」のまま確認します。",
    ],
    practicePoints: [
      "部位詳細画面で、その部位が何を表すかを確認する。",
      "数値だけでなく、坂・ペース・歩数も一緒に見る。",
      "上り・下りの一つの結果を、障害名や原因へ結びつけない。",
    ],
    caution: "表示される値は、個人の筋・腱・関節に加わる力の実測値や、けがの予測ではありません。",
    sources: [PROJECT_V27, VAN_HOOREN_2024, NUCKOLS_2020],
  }),
  article({
    id: "model-limits-v27",
    title: "この表示が言えること・言えないこと",
    category: "相談・共有",
    tags: ["非主張", "限界", "多因子", "自己判断"],
    lead: "入力条件の違いを見返す道具であり、身体や障害を判定する道具ではありません。",
    summary: "数値を身体の測定値と思わず、走行記録を振り返るための目安として使うことが大切です。",
    body: [
      "RunLoadは、距離、時間、坂、路面、歩数など、自分が入力した走行記録を振り返るための表示です。似た意味の記録どうしを比べる手掛かりになります。",
      "実際に筋肉・腱・関節へ加わった力を測っているわけではありません。診断、障害の有無や確率、原因、走ってよいかどうかも示しません。",
      "ランニング中の身体の状態には、トレーニングだけでなく、休養、体調、環境など多くのことが関わります。数値と自分の感覚が並んでいても、一方がもう一方の原因だとは限りません。",
    ],
    practicePoints: [
      "値が表す内容、100の意味、その日の条件をセットで読む。",
      "自分の感覚とアプリの数値は別の情報として見る。",
      "分からない条件は、推測で埋めずにそのまま残す。",
    ],
    caution: "アプリの表示を医療判断、障害予防の保証、個別の練習処方へ使用しません。",
    sources: [PROJECT_V27, LINTON_2025, VAN_HOOREN_2024],
  }),
]);
__exp["COLUMN_CATEGORIES"] = COLUMN_CATEGORIES;
__exp["COLUMN_ARTICLES"] = COLUMN_ARTICLES;
__mods[52] = __exp;
}

// ===== core/column/columnService.js =====
{
const __exp = Object.create(null);
const { COLUMN_ARTICLES, COLUMN_CATEGORIES } = __mods[52];
const { EVIDENCE_GOVERNANCE_VERSION, getArticleEvidenceGovernance, getSourceEvidenceGovernance } = __mods[51];

function normalizeQuery(value) {
  return String(value || "").trim().toLocaleLowerCase("ja-JP");
}

function createColumnService() {
  function list({ query = "", category = "all" } = {}) {
    const normalizedQuery = normalizeQuery(query);
    return COLUMN_ARTICLES.filter((article) => category === "all" || article.category === category)
      .filter((article) => {
        if (!normalizedQuery) return true;
        const searchable = [
          article.title,
          article.lead,
          article.summary,
          article.category,
          ...(article.tags || []),
          ...(article.body || []),
          ...(article.practicePoints || []),
        ].join(" ").toLocaleLowerCase("ja-JP");
        return searchable.includes(normalizedQuery);
      });
  }

  function findById(articleId) {
    return COLUMN_ARTICLES.find((article) => article.id === articleId) || null;
  }

  function relatedArticle(article) {
    if (!article) return null;
    return COLUMN_ARTICLES.find((candidate) => (
      candidate.id !== article.id
      && (candidate.category === article.category || candidate.tags?.some((tag) => article.tags?.includes(tag)))
    )) || null;
  }

  function evidenceForArticle(articleId) {
    return getArticleEvidenceGovernance(articleId);
  }

  function evidenceForSource(sourceId) {
    return getSourceEvidenceGovernance(sourceId);
  }

  return Object.freeze({
    categories: COLUMN_CATEGORIES,
    evidenceGovernanceVersion: EVIDENCE_GOVERNANCE_VERSION,
    list,
    findById,
    relatedArticle,
    evidenceForArticle,
    evidenceForSource,
  });
}
__exp["createColumnService"] = createColumnService;
__mods[53] = __exp;
}


// ===== core/dataManagement/dataManagementService.js =====
{
const __exp = Object.create(null);
const { CURRENT_APP_REMOVABLE_STORAGE_KEYS } = __mods[1];

function createDataManagementService(gateway) {
  function clearAllUserData() {
    return gateway.transact(CURRENT_APP_REMOVABLE_STORAGE_KEYS.map((key) => ({ key, remove: true })));
  }
  return Object.freeze({ clearAllUserData });
}
__exp["createDataManagementService"] = createDataManagementService;
__mods[55] = __exp;
}

// ===== core/consultation/consultationReport.js =====
{
const __exp = Object.create(null);
const { PRIMARY_REGIONAL_V2_REGION_DEFS } = __mods[25];
const { PRIMARY_REGIONAL_V2_MODEL_VERSION, buildPrimaryRegionalV2ComparisonSignature, comparePrimaryRegionalV2Signatures } = __mods[26];
const { bodyAreaLateralityLabel } = __mods[28];
const { summarizePersonalContext } = __mods[7];
const { reportedRpeValue } = __mods[8];


const REGIONS = Object.freeze(PRIMARY_REGIONAL_V2_REGION_DEFS.map((region) => Object.freeze({ id: region.displayId, name: region.name })));
const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const DEFAULT_REGION_ID = "BA-DISP-019";

function hasFiniteValue(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function finiteOrNull(value) {
  return hasFiniteValue(value) ? Number(value) : null;
}

function normalizeRegionId(value = "") {
  const requested = String(value || "");
  return REGION_BY_ID.has(requested) ? requested : DEFAULT_REGION_ID;
}

function activitySummary(record = {}) {
  if (record.activityType === "rest") return "休養";
  const parts = [];
  if (Number(record.distanceKm) > 0) parts.push(`${record.distanceKm}km`);
  if (Number(record.durationMinutes) > 0) parts.push(`${record.durationMinutes}分`);
  if (Number(record.steps) > 0) parts.push(`${record.steps}歩`);
  return parts.join("・") || "走行";
}


function normalizeExactObservations(feedback = {}) {
  const observations = Array.isArray(feedback.bodyAreaObservations) ? feedback.bodyAreaObservations : [];
  return observations
    .filter((item) => item && typeof item === "object")
    .map((item) => Object.freeze({
      areaId: String(item.areaId || ""),
      label: String(item.label || "詳細部位"),
      laterality: String(item.laterality || item.side || "UNKNOWN"),
      lateralityLabel: bodyAreaLateralityLabel(item.laterality || item.side),
      intensity: finiteOrNull(item.intensity),
      sensation: String(item.sensation || item.note || ""),
      modelRegionId: String(item.modelRegionId || ""),
    }));
}

function rawFacts(record = {}) {
  return Object.freeze({
    activityType: record.activityType === "rest" ? "rest" : "run",
    distanceKm: record.activityType === "rest" ? null : finiteOrNull(record.distanceKm),
    durationMinutes: record.activityType === "rest" ? null : finiteOrNull(record.durationMinutes),
    steps: record.activityType === "rest" ? null : finiteOrNull(record.steps),
    stepsProvenance: String(record.stepsProvenance || ""),
    rpe: record.activityType === "rest" ? null : reportedRpeValue(record),
    runningFormat: String(record.runningFormat || ""),
    course: record.course && typeof record.course === "object" ? JSON.parse(JSON.stringify(record.course)) : {},
  });
}

function resultRow(experience, regionId) {
  return experience?.regionalV2ResultRecord?.result?.regions?.find((row) => row.regionId === regionId)
    || experience?.regionalV2Result?.regions?.find((row) => row.regionId === regionId)
    || null;
}

function modelDistanceKm(resultRecord = {}, record = {}) {
  const input = resultRecord?.engine_input_snapshot || {};
  const runWalk = String(input.runningFormat || record.runningFormat || "").toUpperCase() === "RUN_WALK";
  const distance = Number(runWalk ? (input.runningDistanceKm ?? record.runWalkRunningDistanceKm) : (input.distanceKm ?? record.distanceKm));
  return Number.isFinite(distance) && distance > 0 ? distance : null;
}

function regionalReference(experience, regionId) {
  const region = REGION_BY_ID.get(regionId);
  const resultRecord = experience?.regionalV2ResultRecord || null;
  const distanceKm = modelDistanceKm(resultRecord || {}, experience?.record || {});
  const referenceValue = 100;
  const base = {
    regionId,
    regionLabel: region?.name || regionId,
    state: "UNAVAILABLE",
    value: null,
    delta: null,
    reference: "基準100",
    referenceDefinitionId: null,
    endpoint: Object.freeze({ label: "部位の目安" }),
    exposure: Object.freeze({
      status: distanceKm == null ? "UNAVAILABLE" : "RECORDED_SEPARATELY",
      basis: "distance_separate_fact",
      label: "走行距離は部位の数値へ掛けず、別の走行事実として扱います",
      shortLabel: "走行距離は別表示",
      unit: "km",
      qEquivalent: distanceKm,
      qReference: distanceKm,
      ratioExact: 1,
      fallbackStatus: "NONE",
    }),
    routeFamilySignature: null,
    primaryRegionalV2: true,
  };
  if (experience?.record?.activityType === "rest") return Object.freeze({ ...base, state: "REST" });
  if (!resultRecord || resultRecord.model_version !== PRIMARY_REGIONAL_V2_MODEL_VERSION) return Object.freeze(base);
  const row = resultRow(experience, regionId);
  if (!row || !hasFiniteValue(row.value)) {
    return Object.freeze({ ...base, state: resultRecord?.result?.state || "UNAVAILABLE" });
  }
  const signature = buildPrimaryRegionalV2ComparisonSignature(resultRecord, row);
  const value = Number(row.value);
  return Object.freeze({
    ...base,
    state: "SUPPORTED_NUMERIC",
    value,
    delta: value - 100,
    referenceDefinitionId: row.referenceId || null,
    routeFamilySignature: signature,
  });
}

function totalReference(experience) {
  const resultRecord = experience?.v27ResultRecord;
  if (!resultRecord || resultRecord.state !== "RUN") return null;
  const total = resultRecord.result?.total;
  return Object.freeze({
    central: finiteOrNull(total?.central_points),
    range: Array.isArray(total?.range_points) ? [...total.range_points] : null,
    showRange: total?.show_range_primary === true,
    gradeCoverage: finiteOrNull(total?.grade_coverage),
    surfaceCoverage: finiteOrNull(total?.surface_coverage),
    pairingState: String(total?.pairing_state || ""),
  });
}

function modelReference(experience, regionId) {
  const isRest = experience?.record?.activityType === "rest";
  const total = totalReference(experience);
  const regional = regionalReference(experience, regionId);
  const rpeWasReported = reportedRpeValue(experience?.record || {}) != null;
  const internal = experience?.v27ResultRecord?.result?.internal;
  return Object.freeze({
    modelVersion: String(experience?.regionalV2ResultRecord?.model_version || experience?.v27ResultRecord?.model_version || ""),
    primaryRegionalV2: experience?.regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION,
    state: isRest ? "REST" : total || regional.state === "SUPPORTED_NUMERIC" ? "RUN" : "NO_NUMERIC_RESULT",
    total,
    regional,
    internalResponse: isRest ? null : Object.freeze({
      state: rpeWasReported ? String(internal?.state || "UNKNOWN") : "UNKNOWN",
      srpeAu: rpeWasReported ? finiteOrNull(internal?.srpe_au) : null,
      separateFromRunFactModel: internal?.separate_from_objective_model === true,
    }),
  });
}

function recordChronology(left, right) {
  return String(left?.record?.date || "").localeCompare(String(right?.record?.date || ""))
    || String(left?.record?.createdAt || "").localeCompare(String(right?.record?.createdAt || ""))
    || String(left?.record?.id || "").localeCompare(String(right?.record?.id || ""));
}

function recentFacts(allExperiences, target, regionId) {
  const currentRow = resultRow(target, regionId);
  const currentSignature = currentRow && target?.regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION
    ? buildPrimaryRegionalV2ComparisonSignature(target.regionalV2ResultRecord, currentRow)
    : null;
  return [...allExperiences]
    .filter((item) => item?.record?.id && item.record.id !== target?.record?.id)
    .filter((item) => recordChronology(item, target) < 0)
    .sort((left, right) => recordChronology(right, left))
    .slice(0, 6)
    .map((item) => {
      const row = resultRow(item, regionId);
      const signature = row && item?.regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION
        ? buildPrimaryRegionalV2ComparisonSignature(item.regionalV2ResultRecord, row)
        : null;
      const compared = currentSignature && signature
        ? comparePrimaryRegionalV2Signatures(currentSignature, signature)
        : { directDeltaAllowed: false, reason: "COMPARISON_SIGNATURE_MISSING" };
      const regional = regionalReference(item, regionId);
      return Object.freeze({
        recordId: item.record.id,
        date: item.record.date,
        activity: activitySummary(item.record),
        activityType: item.record.activityType === "rest" ? "rest" : "run",
        total: totalReference(item)?.central ?? null,
        regionalState: regional.state,
        regionalValue: compared.directDeltaAllowed ? regional.value : null,
        regionalDirectComparable: compared.directDeltaAllowed,
        regionalExclusionReasons: compared.directDeltaAllowed ? [] : [compared.reason || "SEMANTIC_OR_MODEL_MISMATCH"],
        rpe: reportedRpeValue(item.record),
        exactObservations: normalizeExactObservations(item.feedback || {}),
      });
    });
}

function buildConsultationReport(experience, allExperiences = [], options = {}) {
  if (!experience) return null;
  const regionId = normalizeRegionId(options.regionId);
  const feedback = experience.feedback || {};
  const personal = summarizePersonalContext(experience.record.personalContext || {});
  const exactObservations = normalizeExactObservations(feedback);
  const recent = recentFacts(allExperiences, experience, regionId);
  return Object.freeze({
    reportVersion: "runload-consultation-report-v1.0",
    date: experience.record.date,
    activity: activitySummary(experience.record),
    courseName: experience.record.course?.name || "",
    memo: experience.record.memo || "",
    rawFacts: rawFacts(experience.record),
    personalContextItems: personal.hasInput ? personal.items : [],
    subjectiveStatus: feedback.checkStatus || "not_asked",
    exactBodyObservations: Object.freeze(exactObservations),
    consultationNote: feedback.consultationNote || "",
    conditionFlags: Object.entries(feedback.safetyFlags || {}).filter(([, active]) => active).map(([flag]) => flag),
    supportRoute: experience.supportDecision?.route || "normal",
    modelReference: modelReference(experience, regionId),
    recent: Object.freeze(recent),
    comparisonCounts: Object.freeze({
      direct: recent.filter((item) => item.regionalDirectComparable && hasFiniteValue(item.regionalValue)).length,
      excluded: recent.filter((item) => !item.regionalDirectComparable).length,
      nonnumeric: recent.filter((item) => item.regionalDirectComparable && !hasFiniteValue(item.regionalValue)).length,
    }),
    claimBoundary: Object.freeze({
      subjectiveAndModelAreSeparate: true,
      conditionAndExposureAreSeparate: true,
      unsupportedIsNeverReferenceOne: true,
      isDiagnosis: false,
      predictsInjury: false,
      provesCause: false,
      guaranteesSafety: false,
      determinesRunOrNoRun: false,
      isMeasuredPhysicalRegionalLoad: false,
      isAnatomicalShare: false,
    }),
  });
}

function exposureText(exposure = {}) {
  if (!hasFiniteValue(exposure.qEquivalent)) return "走行距離：数値なし";
  return `走行距離：${Number(exposure.qEquivalent)} km（部位の数値とは別の走行事実）`;
}

function regionalText(regional) {
  if (!regional || !hasFiniteValue(regional.value)) {
    const label = regional?.regionLabel || "選択した部位";
    return `部位の目安：${label}／数値なし`;
  }
  const rounded = Math.round(Number(regional.value) * 10) / 10;
  return `部位の目安：${regional.regionLabel} ${rounded}／${regional.reference}`;
}

function bodyObservationLines(report) {
  const exact = report.exactBodyObservations.map((item) => {
    const details = [];
    if (item.lateralityLabel) details.push(item.lateralityLabel);
    if (item.intensity != null) details.push(`程度 ${item.intensity}/5`);
    if (item.sensation) details.push(item.sensation);
    return `- ${item.label}${details.length ? `：${details.join("・")}` : ""}`;
  });
  const saved = (report.subjectiveParts || []).map((item) => {
    const details = [];
    if (item.fatigue > 0) details.push(`疲れ・だるさ ${item.fatigue}/5`);
    if (item.discomfort > 0) details.push(`気になる感じ ${item.discomfort}/5`);
    return `- ${item.label}：${details.join("・") || "確認済み"}`;
  });
  return [...exact, ...saved];
}

function createShortConsultationMemo(report) {
  if (!report) return "";
  const lines = [`${report.date}の${report.activity}について相談したいです。`];
  if (report.personalContextItems.length) lines.push(`今日のシューズ・走り方：${report.personalContextItems.slice(0, 3).join("、")}。`);
  const observations = [...report.exactBodyObservations.map((item) => item.label), ...(report.subjectiveParts || []).map((item) => item.label)];
  if (observations.length) lines.push(`記録した部位：${[...new Set(observations)].join("、")}。`);
  if (report.consultationNote) lines.push(`聞きたいこと：${report.consultationNote}`);
  if (report.modelReference.state === "RUN") {
    const total = report.modelReference.total?.central;
    if (hasFiniteValue(total)) lines.push(`走り全体の目安：${Math.round(total * 10) / 10}ポイント`);
    lines.push(regionalText(report.modelReference.regional));
    lines.push(exposureText(report.modelReference.regional?.exposure));
  }
  lines.push("身体の記録とアプリの目安は別に扱います。走行距離は部位の数値へ掛けず、別の走行事実として扱います。");
  return lines.join("\n");
}

function createStandardConsultationText(report) {
  if (!report) return "";
  const lines = ["相談用レポート", `対象日：${report.date}`, `記録：${report.activity}`];
  if (report.courseName) lines.push(`コース：${report.courseName}`);
  if (report.personalContextItems.length) {
    lines.push("今日のシューズ・走り方：");
    report.personalContextItems.forEach((item) => lines.push(`- ${item}`));
  }
  const observationLines = bodyObservationLines(report);
  lines.push("身体の記録：");
  lines.push(...(observationLines.length ? observationLines : ["- 部位入力なし"]));
  if (report.consultationNote) lines.push(`相談したいこと：${report.consultationNote}`);
  if (report.modelReference.state === "RUN") {
    const total = report.modelReference.total?.central;
    lines.push(hasFiniteValue(total) ? `走り全体の目安：${Math.round(total * 10) / 10}ポイント` : "走り全体の目安：数値なし");
    lines.push(regionalText(report.modelReference.regional));
    lines.push(exposureText(report.modelReference.regional?.exposure));
    lines.push("部位の目安は、その部位自身の固定基準100と比較します。走行距離は数値へ掛けません。安全値・正常値・初心者平均ではなく、別の部位との大小比較にも使いません。");
    if (report.rawFacts.rpe != null) lines.push(`走り全体のきつさ（RPE）：${report.rawFacts.rpe}/10（数値表示とは分けて記載）`);
  } else if (report.modelReference.state === "REST") {
    lines.push("数値表示：休養記録のため走行の目安なし");
  } else {
    lines.push("数値表示：この保存記録では目安を表示できません");
  }
  lines.push("数値表示は走行記録を比べるための参考で、筋肉・腱・関節に加わった実際の力、診断、障害予測、原因、走行可否を示しません。");
  return lines.join("\n");
}

function createDetailedConsultationText(report) {
  const standard = createStandardConsultationText(report);
  if (!report || !report.recent.length) return standard;
  const regionLabel = report.modelReference.regional?.regionLabel || "選択した部位";
  const recent = report.recent.map((item) => {
    const total = item.total == null ? "走行全体 数値なし" : `走行全体 ${Math.round(item.total * 10) / 10}`;
    const regional = item.regionalDirectComparable && hasFiniteValue(item.regionalValue)
      ? `${regionLabel}の部位の目安 ${Math.round(item.regionalValue * 10) / 10}`
      : `${regionLabel}の部位の目安 比較なし`;
    const rpe = item.rpe == null ? "" : `／RPE ${item.rpe}`;
    return `- ${item.date}：${item.activity}／${total}／${regional}${rpe}`;
  });
  return `${standard}\n\n最近の保存記録：\n${recent.join("\n")}\n\n部位の目安の差は、同じ部位・同じ計算方法・同じ基準で比べられる記録だけで扱います。`;
}
__exp["buildConsultationReport"] = buildConsultationReport;
__exp["createShortConsultationMemo"] = createShortConsultationMemo;
__exp["createStandardConsultationText"] = createStandardConsultationText;
__exp["createDetailedConsultationText"] = createDetailedConsultationText;
__mods[56] = __exp;
}

// ===== ui/bodyRegionTerminology.js =====
{
const __exp = Object.create(null);
const BODY_REGION_TERMINOLOGY_VERSION = "runload-body-region-terminology-v1";

const ENTRIES = Object.freeze([
  Object.freeze({ id: "BA-DISP-014", formalJa: "股関節部", familiarJa: "股関節まわり", plainMeaningJa: "股関節部の動きに関する目安", english: "Hip joint region" }),
  Object.freeze({ id: "BA-DISP-015", formalJa: "殿部", familiarJa: "お尻", plainMeaningJa: "殿部の筋肉の使われ方に関する目安", english: "Gluteal region" }),
  Object.freeze({ id: "BA-DISP-016", formalJa: "大腿前面", familiarJa: "太ももの前", plainMeaningJa: "大腿前面の筋肉の使われ方に関する目安", english: "Anterior thigh region" }),
  Object.freeze({ id: "BA-DISP-018", formalJa: "大腿後面", familiarJa: "太ももの後ろ", plainMeaningJa: "大腿後面の筋肉の使われ方に関する目安", english: "Posterior thigh region" }),
  Object.freeze({ id: "BA-DISP-019", formalJa: "膝蓋大腿関節部", familiarJa: "膝の前", plainMeaningJa: "膝蓋大腿関節部の走行条件による変化の目安", english: "Patellofemoral region" }),
  Object.freeze({ id: "BA-DISP-021", formalJa: "脛骨部", familiarJa: "すね", plainMeaningJa: "脛骨部の走行条件による変化の目安", english: "Tibial region" }),
  Object.freeze({ id: "BA-DISP-023", formalJa: "下腿後面", familiarJa: "ふくらはぎ", plainMeaningJa: "下腿後面の筋肉の使われ方に関する目安", english: "Posterior lower-leg region" }),
  Object.freeze({ id: "BA-DISP-024", formalJa: "足関節部", familiarJa: "足首まわり", plainMeaningJa: "足関節部の動きに関する目安", english: "Ankle joint region" }),
  Object.freeze({ id: "BA-DISP-025", formalJa: "アキレス腱部", familiarJa: "足首の後ろ・アキレス腱周辺", plainMeaningJa: "アキレス腱部の走行条件による変化の目安", english: "Achilles tendon region" }),
  Object.freeze({ id: "BA-DISP-027", formalJa: "後足部", familiarJa: "かかと・足裏の後ろ", plainMeaningJa: "後足部の足底圧に関する目安", english: "Rearfoot region" }),
  Object.freeze({ id: "BA-DISP-028", formalJa: "足底中部・内側縦足弓", familiarJa: "土踏まず・足裏の中央", plainMeaningJa: "足底中部・内側縦足弓の足底圧に関する目安", english: "Mid-plantar and medial longitudinal arch region" }),
  Object.freeze({ id: "BA-DISP-029", formalJa: "前足部", familiarJa: "足裏の前・母趾球周辺", plainMeaningJa: "前足部の足底圧に関する目安", english: "Forefoot region" }),
]);

const BODY_REGION_TERMINOLOGY = ENTRIES;
const BY_ID = new Map(ENTRIES.map((item) => [item.id, item]));

function bodyRegionTerminology(regionId) {
  return BY_ID.get(String(regionId || "")) || null;
}

function bodyRegionFormalName(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.formalJa || String(fallback || regionId || "");
}

function bodyRegionFamiliarName(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.familiarJa || String(fallback || "");
}

function bodyRegionPlainMeaning(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.plainMeaningJa || String(fallback || "この部位に関する目安");
}

function bodyRegionDisplayName(regionId, fallback = "", { includeFamiliar = false } = {}) {
  const item = bodyRegionTerminology(regionId);
  if (!item) return String(fallback || regionId || "");
  return includeFamiliar && item.familiarJa && item.familiarJa !== item.formalJa
    ? `${item.formalJa}（${item.familiarJa}）`
    : item.formalJa;
}
__exp["BODY_REGION_TERMINOLOGY_VERSION"] = BODY_REGION_TERMINOLOGY_VERSION;
__exp["BODY_REGION_TERMINOLOGY"] = BODY_REGION_TERMINOLOGY;
__exp["bodyRegionTerminology"] = bodyRegionTerminology;
__exp["bodyRegionFormalName"] = bodyRegionFormalName;
__exp["bodyRegionFamiliarName"] = bodyRegionFamiliarName;
__exp["bodyRegionPlainMeaning"] = bodyRegionPlainMeaning;
__exp["bodyRegionDisplayName"] = bodyRegionDisplayName;
__mods[57] = __exp;
}

// ===== core/consultation/deterministicConsultation.js =====
{
const __exp = Object.create(null);
const { PRIMARY_REGIONAL_V2_REGION_DEFS } = __mods[25];
const { bodyRegionFormalName } = __mods[57];
const { summarizePersonalContext } = __mods[7];
const { PRIMARY_REGIONAL_V2_MODEL_VERSION, buildPrimaryRegionalV2ComparisonSignature, comparePrimaryRegionalV2Signatures } = __mods[26];

const REGIONS = Object.freeze(PRIMARY_REGIONAL_V2_REGION_DEFS.map((region) => Object.freeze({ id: region.displayId, name: region.name })));

const DETERMINISTIC_CONSULTATION_VERSION = "runload-deterministic-consultation-v1";

const CONSULTATION_PURPOSES = Object.freeze([
  Object.freeze({
    id: "body_observation",
    label: "身体の記録を伝える",
    description: "身体の記録を整理します。",
  }),
  Object.freeze({
    id: "run_conditions",
    label: "今回の走りを振り返る",
    description: "走行事実と、身体の使われ方を考えるときに一緒に見たい条件を整理します。",
  }),
  Object.freeze({
    id: "previous_comparison",
    label: "前の記録と比べる",
    description: "同じ部位・同じ基準など、同じ意味で比べられる過去記録がある場合だけ差を表示します。",
  }),
  Object.freeze({
    id: "next_check",
    label: "次回に確認したいことを相談する",
    description: "運動可否や練習内容を決めず、次回に記録・比較したい条件を質問文へ整理します。",
  }),
]);

const PURPOSE_IDS = new Set(CONSULTATION_PURPOSES.map((item) => item.id));
const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const ALLOWED_DATA_SELECTION = new Set(["current-result", "body-record", "course", "personal-note"]);

const DEFAULT_DATA_BY_PURPOSE = Object.freeze({
  body_observation: Object.freeze(["body-record", "course", "personal-note"]),
  run_conditions: Object.freeze(["current-result", "course", "personal-note"]),
  previous_comparison: Object.freeze(["current-result", "course", "personal-note"]),
  next_check: Object.freeze(["current-result", "body-record", "course", "personal-note"]),
});

const SAFETY_FLAG_LABELS = Object.freeze({
  severePain: "強い痛み",
  significantSwelling: "はっきりした腫れ",
  cannotBearWeight: "体重をかけにくい",
  movementDifficulty: "動かしにくい",
  numbnessOrWeakness: "しびれ・力の入りにくさ",
  coldPaleBlueLimb: "手足が冷たい・白い・青い",
  deformityOrMajorTrauma: "変形または大きな外傷",
  painAtRestOrNight: "安静時または夜間の痛み",
  chestPainOrPressure: "胸の痛み・圧迫感",
  breathingDifficulty: "呼吸のしにくさ",
  faintingOrConfusion: "失神・意識の混乱",
  heavyBleeding: "多量の出血",
});

const LATERALITY_LABELS = Object.freeze({
  LEFT: "左",
  RIGHT: "右",
  BILATERAL: "両側",
  MIDLINE: "中央",
  UNKNOWN: "左右不明",
});

const DEFAULT_QUESTION_BY_PURPOSE = Object.freeze({
  body_observation: "今回の身体の記録について、気をつけて見ておく点はありますか？",
  run_conditions: "今回の走りを振り返るとき、次の比較でも揃えて記録する条件を確認したいです。",
  previous_comparison: "前回との違いがあります。何を一緒に確認するとよいですか？",
  next_check: "次回までに記録しておくとよいことはありますか？",
});

function finite(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function normalizePurpose(value = "", supportRoute = "normal") {
  const requested = String(value || "");
  if (PURPOSE_IDS.has(requested)) return requested;
  return ["consult", "urgent"].includes(String(supportRoute || ""))
    ? "body_observation"
    : "run_conditions";
}

function firstObservedRegionId(feedback = {}) {
  const exact = Array.isArray(feedback.bodyAreaObservations) ? feedback.bodyAreaObservations : [];
  return exact.map((item) => String(item?.modelRegionId || "")).find((id) => REGION_BY_ID.has(id)) || "";
}

function normalizeRegionId(value = "", experience = {}) {
  const requested = String(value || "");
  if (REGION_BY_ID.has(requested)) return requested;
  const observed = firstObservedRegionId(experience.feedback || {});
  return observed || REGIONS[0]?.id || "BA-DISP-014";
}

function normalizeDataSelection(value, purpose) {
  const requested = Array.isArray(value)
    ? unique(value).filter((item) => ALLOWED_DATA_SELECTION.has(item))
    : [];
  return Object.freeze(requested.length ? requested : [...(DEFAULT_DATA_BY_PURPOSE[purpose] || [])]);
}

function runningFormatLabel(value = "") {
  return {
    CONTINUOUS_RUN: "途中で歩かず走った",
    RUN_WALK: "走りと歩きを混ぜた",
  }[String(value || "")] || "";
}

function resultStateLabel(value = "") {
  return {
    CALCULATED: "表示あり",
    PARTIAL: "一部の条件で表示",
    NOT_CALCULABLE: "表示なし",
    OUT_OF_SUPPORTED_RANGE: "確認できる範囲外",
    NOT_APPLICABLE: "対象外",
  }[String(value || "")] || "表示状態を確認できません";
}

function comparisonReason(value = "") {
  return {
    COMPARABLE: "前の記録があります",
    NO_COMPARABLE_CONDITION_RECORD: "同じ条件で比べられる過去記録はありません",
    NO_PREVIOUS_CONDITION_RECORD: "前の記録はありません",
    CURRENT_CONDITION_UNAVAILABLE: "今回の目安は表示できません",
  }[String(value || "")] || "比較できる記録を確認できません";
}

function displayNumber(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  const rounded = Number(number.toFixed(digits));
  return String(rounded);
}

function courseSummary(record = {}) {
  if (record.activityType === "rest") return "休養記録";
  const parts = [];
  if (finite(record.distanceKm)) parts.push(`${displayNumber(record.distanceKm, 2)}km`);
  if (finite(record.durationMinutes)) parts.push(`${displayNumber(record.durationMinutes, 1)}分`);
  if (finite(record.steps) && Number(record.steps) > 0) parts.push(`${Math.round(Number(record.steps))}歩`);
  const runningFormat = runningFormatLabel(record.runningFormat);
  if (runningFormat) parts.push(runningFormat);
  if (record.course?.name) parts.push(String(record.course.name));
  else if (record.course?.modelSurfaceClass) parts.push("路面条件の入力あり");
  if (record.course?.gradeKnowledge === "KNOWN_FLAT") parts.push("平坦と把握");
  if (record.course?.gradeKnowledge === "KNOWN_PROFILE") {
    if (Number(record.course.upPercent || 0) > 0) parts.push(`上り区間 ${displayNumber(record.course.upPercent, 1)}%`);
    if (Number(record.course.downPercent || 0) > 0) parts.push(`下り区間 ${displayNumber(record.course.downPercent, 1)}%`);
  }
  if (record.course?.gradeKnowledge === "UNKNOWN") parts.push("勾配不明");
  return parts.join("・") || "走行条件の入力あり";
}

function bodyObservationItems(feedback = {}) {
  const exact = (Array.isArray(feedback.bodyAreaObservations) ? feedback.bodyAreaObservations : [])
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const details = [];
      if (item.laterality) details.push(LATERALITY_LABELS[String(item.laterality)] || String(item.laterality));
      if (finite(item.intensity)) details.push(`程度 ${Number(item.intensity)}/5`);
      if (item.sensation) details.push(String(item.sensation));
      return `${item.label || "詳細部位"}${details.length ? `：${details.join("・")}` : ""}`;
    });
  const summaryNames = new Set([
    ...Object.keys(feedback.fatigueByBodyPart || {}),
    ...Object.keys(feedback.discomfortByBodyPart || {}),
    ...Object.keys(feedback.reviewedBodyParts || {}),
  ]);
  const summary = [...summaryNames].filter((name) => (
    Number(feedback.fatigueByBodyPart?.[name] || 0) > 0
    || Number(feedback.discomfortByBodyPart?.[name] || 0) > 0
    || feedback.reviewedBodyParts?.[name] === true
  )).map((name) => {
    const details = [];
    const fatigue = Number(feedback.fatigueByBodyPart?.[name] || 0);
    const discomfort = Number(feedback.discomfortByBodyPart?.[name] || 0);
    if (fatigue > 0) details.push(`疲れ・だるさ ${fatigue}/5`);
    if (discomfort > 0) details.push(`気になる感じ ${discomfort}/5`);
    return `${name}${details.length ? `：${details.join("・")}` : "：確認済み"}`;
  });
  return Object.freeze(unique([...exact, ...summary]));
}

function activeSafetyFlags(feedback = {}) {
  return Object.entries(feedback.safetyFlags || {})
    .filter(([, active]) => active === true)
    .map(([key]) => SAFETY_FLAG_LABELS[key] || key);
}

function primaryExposureDistanceKm(experience = {}) {
  const input = experience?.regionalV2ResultRecord?.engine_input_snapshot || {};
  const runWalk = String(input.runningFormat || experience?.record?.runningFormat || "").toUpperCase() === "RUN_WALK";
  const value = Number(runWalk ? input.runningDistanceKm : input.distanceKm);
  if (value > 0) return value;
  const record = experience?.record || {};
  const fallback = Number(runWalk ? record.runWalkRunningDistanceKm : record.distanceKm);
  return fallback > 0 ? fallback : null;
}

function primaryPreviousComparable(experience, allExperiences, regionId, currentRow) {
  if (!finite(currentRow?.value)) return Object.freeze({ status: "CURRENT_CONDITION_UNAVAILABLE" });
  const currentSignature = buildPrimaryRegionalV2ComparisonSignature(experience?.regionalV2ResultRecord, currentRow);
  if (!currentSignature) return Object.freeze({ status: "CURRENT_CONDITION_UNAVAILABLE" });
  const currentDate = String(experience?.record?.date || "");
  const currentCreatedAt = String(experience?.record?.createdAt || "");
  const earlier = (allExperiences || []).filter((item) => item?.record?.id && item.record.id !== experience?.record?.id).filter((item) => {
    const date = String(item.record.date || "");
    if (date < currentDate) return true;
    return date === currentDate && String(item.record.createdAt || "") < currentCreatedAt;
  }).sort((a,b)=>String(a.record.date||"").localeCompare(String(b.record.date||"")) || String(a.record.createdAt||"").localeCompare(String(b.record.createdAt||"")));
  let sawRegion = false;
  for (const prior of earlier.reverse()) {
    const priorRecord = prior?.regionalV2ResultRecord;
    const priorRow = prior?.regionalV2Result?.regions?.find((row) => row.regionId === regionId) || null;
    if (!priorRow || !finite(priorRow.value)) continue;
    sawRegion = true;
    if (priorRecord?.model_version !== PRIMARY_REGIONAL_V2_MODEL_VERSION) continue;
    const priorSignature = buildPrimaryRegionalV2ComparisonSignature(priorRecord, priorRow);
    const compatibility = comparePrimaryRegionalV2Signatures(currentSignature, priorSignature);
    if (!compatibility.directDeltaAllowed) continue;
    return Object.freeze({
      status: "COMPARABLE",
      previous: Object.freeze({
        recordId: prior.record.id,
        date: prior.record.date,
        displayConditionIndex: Number(priorRow.value),
        referenceValue: 100,
      }),
      pointDelta: Number(currentRow.value) - Number(priorRow.value),
      compatibility,
    });
  }
  return Object.freeze({ status: sawRegion ? "NO_COMPARABLE_CONDITION_RECORD" : "NO_PREVIOUS_CONDITION_RECORD" });
}

function regionalContext(experience, allExperiences, regionId) {
  const resultRecord = experience?.regionalV2ResultRecord || null;
  const row = resultRecord?.result?.regions?.find((item) => item.regionId === regionId) || null;
  const region = REGION_BY_ID.get(regionId);
  if (experience?.record?.activityType === "rest") {
    return Object.freeze({
      state: "REST", regionId, regionLabel: bodyRegionFormalName(regionId, region?.name || "選択した部位"),
      row: null, displayIndex: null, displayDeltaPoints: null, referenceValue: null, referenceDistanceKm: null,
      endpoint: null, exposure: null, contributors: Object.freeze([]), previousComparable: null, isPrimaryRegionalV2: true,
    });
  }
  if (resultRecord?.model_version !== PRIMARY_REGIONAL_V2_MODEL_VERSION || !row) {
    return Object.freeze({
      state: "UNAVAILABLE", regionId, regionLabel: bodyRegionFormalName(regionId, region?.name || "選択した部位"),
      row: null, displayIndex: null, displayDeltaPoints: null, referenceValue: null, referenceDistanceKm: null,
      endpoint: null, exposure: null, contributors: Object.freeze([]), previousComparable: null, isPrimaryRegionalV2: true,
    });
  }
  const distanceKm = primaryExposureDistanceKm(experience);
  const displayIndex = finite(row.value) ? Number(row.value) : null;
  const referenceValue = 100;
  const displayDeltaPoints = displayIndex !== null ? displayIndex - 100 : null;
  return Object.freeze({
    state: row.calculationState || (displayIndex === null ? "UNAVAILABLE" : "CALCULATED"),
    regionId,
    regionLabel: row.regionName || region?.name || "選択した部位",
    row, displayIndex, displayDeltaPoints, referenceValue, referenceDistanceKm: distanceKm,
    endpoint: Object.freeze({ label: "部位の目安" }),
    exposure: resultRecord?.result?.exposure || null,
    contributors: Object.freeze([]),
    axisEstimates: Object.freeze(Array.isArray(row.axisEstimates) ? row.axisEstimates : []),
    evidenceState: row.evidenceState || row.provenance || "EVIDENCE_INSUFFICIENT",
    combinedConditionState: resultRecord?.result?.combinedConditionState || null,
    previousComparable: primaryPreviousComparable(experience, allExperiences, regionId, row),
    isPrimaryRegionalV2: true,
  });
}

function sourceUseSummary({ purpose, dataSelection, bodyItems, regional, profileItems, question, audience }) {
  const selected = new Set(dataSelection);
  return Object.freeze([
    Object.freeze({ id: "question", label: "相談したい内容", used: Boolean(question), reason: question ? "入力した確認内容" : "確認内容は未入力" }),
    Object.freeze({ id: "audience", label: "相談相手", used: Boolean(audience), reason: audience ? "入力した相談相手" : "相談相手は未入力" }),
    Object.freeze({ id: "body", label: "身体の記録", used: selected.has("body-record") && bodyItems.length > 0, reason: selected.has("body-record") ? (bodyItems.length ? "自分で記録した内容" : "身体記録は未入力") : "共有対象から外しています" }),
    Object.freeze({ id: "course", label: "走行事実・コース", used: selected.has("course"), reason: selected.has("course") ? "今回の保存記録" : "共有対象から外しています" }),
    Object.freeze({ id: "a4", label: "選択した部位の目安", used: selected.has("current-result") && regional.displayIndex !== null, reason: selected.has("current-result") ? (regional.displayIndex !== null ? "今回の部位の目安" : "この記録では数値を表示できません") : "共有対象から外しています" }),
    Object.freeze({ id: "history", label: "前の記録", used: purpose === "previous_comparison" && selected.has("current-result") && regional.previousComparable?.status === "COMPARABLE", reason: purpose === "previous_comparison" ? (selected.has("current-result") ? comparisonReason(regional.previousComparable?.status) : "共有対象から外しています") : "今回の目的には含めません" }),
    Object.freeze({ id: "profile", label: "シューズ・走り方の記録", used: selected.has("personal-note") && profileItems.length > 0, reason: selected.has("personal-note") ? (profileItems.length ? "自分で記録した内容" : "入力はありません") : "共有対象から外しています" }),
  ]);
}

function appendSection(lines, heading, items) {
  const values = (items || []).filter(Boolean);
  if (!values.length) return;
  lines.push(heading);
  values.forEach((item) => lines.push(`- ${item}`));
}

function regionalCurrentLine(regional) {
  if (regional.displayIndex === null) return `${regional.regionLabel}：${regional.isPrimaryRegionalV2 ? "部位の目安" : "部位の目安"}の数値なし`;
  if (regional.isPrimaryRegionalV2) {
    const ref = finite(regional.referenceValue) ? Number(regional.referenceValue) : null;
    const delta = finite(regional.displayDeltaPoints) ? Number(regional.displayDeltaPoints) : null;
    return `${regional.regionLabel}：部位の目安 ${displayNumber(regional.displayIndex, 1)}（基準100${delta === null ? "" : `、差 ${delta >= 0 ? "+" : ""}${displayNumber(delta, 1)}`}）`;
  }
  const delta = regional.displayDeltaPoints == null
    ? ""
    : regional.displayDeltaPoints === 0
      ? "（基準100と同じ）"
      : `（基準100から${regional.displayDeltaPoints > 0 ? "+" : ""}${regional.displayDeltaPoints}ポイント）`;
  return `${regional.regionLabel}：${displayNumber(regional.displayIndex, 1)}${delta}`;
}

function comparisonLines(regional) {
  const comparison = regional.previousComparable;
  if (!comparison) return ["比較情報を作成できませんでした。"]; 
  if (comparison.status === "COMPARABLE") {
    if (regional.isPrimaryRegionalV2) {
      const delta = Number(comparison.pointDelta || 0);
      return [
        `今回：${regionalCurrentLine(regional)}`,
        `前の記録：${comparison.previous.date}／部位の目安 ${displayNumber(comparison.previous.displayConditionIndex, 1)}`,
        `同じ計算方法で比べた差：${delta >= 0 ? "+" : ""}${displayNumber(delta, 1)}ポイント（計算に使った距離は各記録の値に含まれます）`,
      ];
    }
    const sign = comparison.percentChangeRounded > 0 ? "+" : "";
    return [
      `今回：${regionalCurrentLine(regional)}`,
      `前の記録：${comparison.previous.date}／部位の目安 ${displayNumber(comparison.previous.displayConditionIndex, 1)}`,
      `同じ意味で比べた変化：${sign}${comparison.percentChangeRounded}%`,
    ];
  }
  if (comparison.status === "NO_COMPARABLE_CONDITION_RECORD") {
    return ["過去記録はありますが、同じ部位・同じ目安・同じ基準で比べられる記録がないため差を表示しません。"];
  }
  if (comparison.status === "NO_PREVIOUS_CONDITION_RECORD") return ["前の部位の目安記録がないため、自分の過去記録との比較はまだ表示しません。"];
  return ["今回の部位の目安を数値化できないため、自分の過去記録との比較は表示しません。"];
}

function buildMemo({ purpose, record, feedback, audience, question, dataSelection, bodyItems, profileItems, regional }) {
  const selected = new Set(dataSelection);
  const lines = ["相談したいこと：", question];
  if (audience) lines.push(`相談相手：${audience}`);
  lines.push(`記録日：${record.date || "日付未設定"}`);

  if (selected.has("course")) appendSection(lines, "今回の走り：", [courseSummary(record)]);
  if (selected.has("personal-note")) appendSection(lines, "シューズ・走り方のメモ：", profileItems);
  if (selected.has("body-record")) {
    appendSection(lines, "身体の記録：", bodyItems.length ? bodyItems : ["身体の記録なし"]);
    const flags = activeSafetyFlags(feedback);
    if (flags.length) appendSection(lines, "体調の記録：", flags);
  }

  if (selected.has("current-result") && regional.displayIndex !== null) {
    if (regional.isPrimaryRegionalV2) {
      const conditionBoundary = regional.combinedConditionState === "AXES_PRESERVED_NOT_COMBINED"
        ? "複数の条件を同時に計算できない場合は、別々に計算した値を無理に掛け合わせていません。"
        : "計算できる条件だけを使い、扱えない条件は0として加えません。";
      appendSection(lines, "アプリに表示された目安：", [
        regionalCurrentLine(regional),
        "この値の見方：100はこの部位自身のReference-100基準です。走行距離そのものは数値へ掛けず、別の走行事実として扱います。",
        conditionBoundary,
        "100は安全値・正常値・初心者平均ではなく、数値は身体を直接測った値でもありません。",
      ]);
    } else {
      appendSection(lines, "アプリに表示された目安：", [
        regionalCurrentLine(regional),
        "この値の見方：今回の条件から計算できる目安を、この部位自身の基準100と比べます。",
        "走行量はこの部位の目安へ足さず、別の情報として扱います。",
        "100は安全値・正常値・初心者平均ではなく、数値は身体を直接測った値でもありません。",
      ]);
    }
  }

  if (purpose === "run_conditions" && selected.has("current-result")) {
    appendSection(lines, "今回の記録と一緒に確認したい条件：", [
      "坂道、ペース、歩数、路面などを一緒に振り返れます。",
      "目安だけで原因は決めず、走った内容と自分の感じ方を分けて振り返ります。",
    ]);
  }
  if (purpose === "previous_comparison" && selected.has("current-result")) appendSection(lines, "前回との比較：", comparisonLines(regional));
  if (purpose === "previous_comparison" && !selected.has("current-result")) appendSection(lines, "前回との比較：", ["共有する内容に数値結果を含めていないため、目安を記載しません。"]);
  if (purpose === "next_check") {
    const reflection = record.reflectionContext || {};
    appendSection(lines, "次回に残しておきたいメモ：", [
      reflection.nextCheckPoint ? `次回確認したいこと：${reflection.nextCheckPoint}` : "次回確認したいことは未入力",
      reflection.reflectionKeyPoint ? `今回の主な気づき：${reflection.reflectionKeyPoint}` : "",
    ]);
  }

  const boundaryLines = [
    "身体の記録、走った内容、アプリの目安は別の情報です。",
    "このメモは診断や安全の判定をするものではありません。",
  ];
  const boundaryText = boundaryLines.join("\n");
  const bodyText = lines.join("\n");
  const separator = "\n";
  const bodyLimit = Math.max(0, 1200 - boundaryText.length - separator.length);
  const boundedBody = bodyText.length > bodyLimit
    ? `${bodyText.slice(0, Math.max(0, bodyLimit - 12)).trimEnd()}\n（本文を省略）`
    : bodyText;
  return `${boundedBody}${separator}${boundaryText}`.slice(0, 1200);
}

function buildDeterministicConsultation({
  experience,
  allExperiences = [],
  purpose = "",
  regionId = "",
} = {}) {
  if (!experience?.record) return null;
  const supportRoute = experience.supportDecision?.route || "normal";
  const normalizedPurpose = normalizePurpose(purpose, supportRoute);
  const normalizedRegionId = normalizeRegionId(regionId, experience);
  const consultationContext = experience.record.consultationContext || {};
  const dataSelection = normalizeDataSelection(consultationContext.consultationDataSelection, normalizedPurpose);
  const audience = String(consultationContext.consultationTarget || "").trim();
  const question = String(
    consultationContext.consultationQuestion
    || experience.feedback?.consultationNote
    || DEFAULT_QUESTION_BY_PURPOSE[normalizedPurpose]
    || "",
  ).trim();
  const profile = summarizePersonalContext(experience.record.personalContext || {});
  const profileItems = profile.hasInput ? profile.items : [];
  const bodyItems = bodyObservationItems(experience.feedback || {});
  const regional = regionalContext(experience, allExperiences, normalizedRegionId);
  const sources = sourceUseSummary({
    purpose: normalizedPurpose,
    dataSelection,
    bodyItems,
    regional,
    profileItems,
    question,
    audience,
  });
  const memo = buildMemo({
    purpose: normalizedPurpose,
    record: experience.record,
    feedback: experience.feedback || {},
    audience,
    question,
    dataSelection,
    bodyItems,
    profileItems,
    regional,
  });
  return Object.freeze({
    version: DETERMINISTIC_CONSULTATION_VERSION,
    purpose: normalizedPurpose,
    purposeDefinition: CONSULTATION_PURPOSES.find((item) => item.id === normalizedPurpose),
    regionId: normalizedRegionId,
    regionOptions: Object.freeze(REGIONS.map((region) => Object.freeze({ id: region.id, label: bodyRegionFormalName(region.id, region.name) }))),
    supportRoute,
    audience,
    question,
    dataSelection,
    bodyItems,
    profileItems: Object.freeze(profileItems),
    regional,
    sources,
    memo,
    boundaries: Object.freeze({
      deterministicRulesOnly: true,
      modelChangesA4: false,
      usesBodyPartRanking: false,
      diagnosis: false,
      injuryPrediction: false,
      causation: false,
      runPermission: false,
      trainingPrescription: false,
      safetyGuarantee: false,
    }),
  });
}
__exp["DETERMINISTIC_CONSULTATION_VERSION"] = DETERMINISTIC_CONSULTATION_VERSION;
__exp["CONSULTATION_PURPOSES"] = CONSULTATION_PURPOSES;
__exp["buildDeterministicConsultation"] = buildDeterministicConsultation;
__mods[58] = __exp;
}

// ===== core/applicationServices.js =====
{
const __exp = Object.create(null);
const { createStorageGateway } = __mods[2];
const { createRecordRepository } = __mods[11];
const { createModelResultV27Repository } = __mods[13];
const { createModelResultRegionalV2Repository } = __mods[27];
const { createSubjectiveFeedbackRepository } = __mods[31];
const { createPlanRepository } = __mods[32];
const { createProfileRepository, createSettingsRepository, createDraftRepository } = __mods[37];
const { createBackupService } = __mods[42];
const { createCourseRepository } = __mods[40];
const { evaluateSupportDecision, shouldBlockNormalPlanSuggestions, shouldPrioritizeOfficialHelp } = __mods[29];
const { buildPublicHelpGuidance } = __mods[43];
const { normalizeSubjectiveFeedback } = __mods[30];
const { normalizeRunningRecord, validateRunningRecord, validateRunningRecordInput } = __mods[9];
const { createRecordWorkflow } = __mods[47];
const { createHistoryWorkflow } = __mods[48];
const { createPlanWorkflow } = __mods[50];
const { createColumnService } = __mods[53];
const { createDataManagementService } = __mods[55];
const { buildConsultationReport, createShortConsultationMemo, createStandardConsultationText, createDetailedConsultationText } = __mods[56];
const { buildDeterministicConsultation, CONSULTATION_PURPOSES, DETERMINISTIC_CONSULTATION_VERSION } = __mods[58];
const { adaptRecordToV27Session } = __mods[45];
const { assertV27ResultSemantics, calculateV27Session } = __mods[39];
const { createV27ResultRecord } = __mods[46];
const { createPrimaryRegionalV2ResultRecord } = __mods[26];
const { calculateRun: calculatePrimaryRegionalV2 } = __mods[14];

function createApplicationServices(options = {}) {
  const gateway = options.gateway || createStorageGateway(options.storage);
  const records = createRecordRepository(gateway);
  const modelResultsV27 = createModelResultV27Repository(gateway);
  const modelResultsRegionalV2 = createModelResultRegionalV2Repository(gateway);
  const subjectiveFeedback = createSubjectiveFeedbackRepository(gateway);
  const plans = createPlanRepository(gateway);
  const profile = createProfileRepository(gateway);
  const recordWorkflow = createRecordWorkflow({
    gateway,
    recordsRepository: records,
    subjectiveFeedbackRepository: subjectiveFeedback,
    profileRepository: profile,
    modelResultV27Repository: modelResultsV27,
    modelResultRegionalV2Repository: modelResultsRegionalV2,
  });

  const services = {
    model: Object.freeze({
      primaryRegionalV2: Object.freeze({ calculatePrimaryRegionalV2, createPrimaryRegionalV2ResultRecord }),
      v27: Object.freeze({
        adaptRecordToV27Session,
        calculateV27Session,
        assertV27ResultSemantics,
        createV27ResultRecord,
      }),
    }),
    safety: Object.freeze({
      evaluateSupportDecision,
      shouldBlockNormalPlanSuggestions,
      shouldPrioritizeOfficialHelp,
      buildPublicHelpGuidance,
      normalizeSubjectiveFeedback,
      normalizeRunningRecord,
      validateRunningRecord,
      validateRunningRecordInput,
    }),
    storage: Object.freeze({
      gateway,
      records,
      modelResultsV27,
      modelResultsRegionalV2,
      subjectiveFeedback,
      plans,
      profile,
      settings: createSettingsRepository(gateway),
      draft: createDraftRepository(gateway),
      courses: createCourseRepository(gateway),
      backup: createBackupService(gateway),
    }),
    workflows: {},
    consultation: Object.freeze({
      buildConsultationReport,
      createShortConsultationMemo,
      createStandardConsultationText,
      createDetailedConsultationText,
      buildDeterministicConsultation,
      purposes: CONSULTATION_PURPOSES,
      deterministicVersion: DETERMINISTIC_CONSULTATION_VERSION,
    }),
    column: createColumnService(),
    dataManagement: createDataManagementService(gateway),
  };
  services.workflows.records = recordWorkflow;
  services.workflows.history = createHistoryWorkflow({
    gateway,
    recordsRepository: records,
    modelResultV27Repository: modelResultsV27,
    modelResultRegionalV2Repository: modelResultsRegionalV2,
    subjectiveFeedbackRepository: subjectiveFeedback,
    planRepository: plans,
  });
  services.workflows.plans = createPlanWorkflow({ services, planRepository: plans });
  services.workflows = Object.freeze(services.workflows);
  return Object.freeze(services);
}
__exp["createApplicationServices"] = createApplicationServices;
__mods[59] = __exp;
}


// ===== core/privacy/privacyInventory.js =====
{
const __exp = Object.create(null);
const { CURRENT_APP_REMOVABLE_STORAGE_KEYS, INTERNAL_RECOVERY_STORAGE_KEYS, STORAGE_KEYS, USER_DATA_STORAGE_KEYS } = __mods[1];

const PRIVACY_OVERVIEW_VERSION = "runload-privacy-overview-v1";

const STORAGE_GROUPS = Object.freeze([
  Object.freeze({
    id: "records-results",
    label: "走行・休養記録と保存済み結果",
    keys: Object.freeze([
      STORAGE_KEYS.records,
      STORAGE_KEYS.modelResultsV27,
      STORAGE_KEYS.modelResultsRegionalV2,
    ]),
    description: "入力した走行・休養の事実、保存時点のコースや任意プロフィールの内容、走行全体と12部位の保存済み結果を含みます。",
  }),
  Object.freeze({
    id: "person-input",
    label: "身体の記録と共有範囲",
    keys: Object.freeze([STORAGE_KEYS.subjectiveFeedback]),
    description: "自分で選んだ身体の記録、相談相手・相談内容、共有する範囲を記録ごとに保存します。作成した相談文は自動保存しません。",
  }),
  Object.freeze({
    id: "plans",
    label: "保存した予定",
    keys: Object.freeze([STORAGE_KEYS.plans]),
    description: "保存した予定を端末内に保存します。達成度や評価には変換しません。",
  }),
  Object.freeze({
    id: "reusable-settings",
    label: "再利用する設定",
    keys: Object.freeze([STORAGE_KEYS.profile, STORAGE_KEYS.settings, STORAGE_KEYS.courses]),
    description: "表示設定、任意プロフィール、保存シューズ、保存コースを次回の入力や表示に使うため保存します。変更しても過去記録に保存された内容は自動更新しません。",
  }),
  Object.freeze({
    id: "draft",
    label: "入力途中の下書き",
    keys: Object.freeze([STORAGE_KEYS.draft]),
    description: "保存前の入力途中を再開するため、端末内に下書きを保存する場合があります。",
  }),
]);

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

function countProfileFields(profile = {}) {
  return Object.entries(profile || {}).filter(([key, value]) => (
    key !== "updatedAt"
    && value !== ""
    && value !== null
    && value !== undefined
    && (!Array.isArray(value) || value.length > 0)
  )).length;
}

function groupStatus(services, group) {
  const gateway = services.storage.gateway;
  const values = Object.fromEntries(group.keys.map((key) => [key, gateway.readJson(key, null)]));
  if (group.id === "records-results") return `${countArray(values[STORAGE_KEYS.records])}件の記録`;
  if (group.id === "person-input") return `${countArray(values[STORAGE_KEYS.subjectiveFeedback])}件`;
  if (group.id === "plans") return `予定${countArray(values[STORAGE_KEYS.plans])}件`;
  if (group.id === "reusable-settings") {
    const profileCount = countProfileFields(values[STORAGE_KEYS.profile]);
    const courses = countArray(values[STORAGE_KEYS.courses]);
    return `任意プロフィール${profileCount ? "あり" : "なし"}・コース${courses}件`;
  }
  return values[STORAGE_KEYS.draft] ? "下書きあり" : "下書きなし";
}

function buildPrivacyOverview(services) {
  const storageGroups = STORAGE_GROUPS.map((group) => Object.freeze({
    ...group,
    status: groupStatus(services, group),
  }));
  return Object.freeze({
    version: PRIVACY_OVERVIEW_VERSION,
    storageMode: "DEVICE_LOCAL_BROWSER_STORAGE",
    automaticExternalTransfer: false,
    storageGroups: Object.freeze(storageGroups),
    backup: Object.freeze({
      format: "JSON_PLAIN_TEXT",
      encryptedByApp: false,
      includedKeys: USER_DATA_STORAGE_KEYS,
      internalRecoveryKeysIncluded: false,
    }),
    deletion: Object.freeze({
      currentAppKeys: CURRENT_APP_REMOVABLE_STORAGE_KEYS,
      internalRecoveryKeys: INTERNAL_RECOVERY_STORAGE_KEYS,
      exportedFilesDeletedByApp: false,
    }),
  });
}

function privacyStorageCoverage() {
  return Object.freeze({
    persistentUserKeys: USER_DATA_STORAGE_KEYS,
    groupedKeys: Object.freeze(STORAGE_GROUPS.flatMap((group) => group.keys)),
    removableKeys: CURRENT_APP_REMOVABLE_STORAGE_KEYS,
  });
}
__exp["PRIVACY_OVERVIEW_VERSION"] = PRIVACY_OVERVIEW_VERSION;
__exp["buildPrivacyOverview"] = buildPrivacyOverview;
__exp["privacyStorageCoverage"] = privacyStorageCoverage;
__mods[61] = __exp;
}

// Public core API used by the current application modules.
export const ADAPTER_VERSION = __mods[17]["ADAPTER_VERSION"];
export const ARCH_SURFACE_CURVES = __mods[17]["ARCH_SURFACE_CURVES"];
export const ARTICLE_EVIDENCE_REGISTRY = __mods[51]["ARTICLE_EVIDENCE_REGISTRY"];
export const AUTHORITY_VERSION = __mods[17]["AUTHORITY_VERSION"];
export const BACKUP_FORMAT_VERSION = __mods[42]["BACKUP_FORMAT_VERSION"];
export const BODY_AREA_BY_ID = __mods[28]["BODY_AREA_BY_ID"];
export const BODY_AREA_BY_KEY = __mods[28]["BODY_AREA_BY_KEY"];
export const BODY_AREA_GROUPS = __mods[28]["BODY_AREA_GROUPS"];
export const BODY_AREA_LATERALITY = __mods[28]["BODY_AREA_LATERALITY"];
export const BODY_AREA_LATERALITY_LABELS = __mods[28]["BODY_AREA_LATERALITY_LABELS"];
export const BODY_AREA_TAXONOMY = __mods[28]["BODY_AREA_TAXONOMY"];
export const BODY_AREA_TO_PRIMARY_REGIONAL_V2 = __mods[16]["BODY_AREA_TO_PRIMARY_REGIONAL_V2"];
export const BODY_PARTS = __mods[3]["BODY_PARTS"];
export const BODY_PART_KEYS = __mods[3]["BODY_PART_KEYS"];
export const BODY_REGION_TERMINOLOGY = __mods[57]["BODY_REGION_TERMINOLOGY"];
export const BODY_REGION_TERMINOLOGY_VERSION = __mods[57]["BODY_REGION_TERMINOLOGY_VERSION"];
export const BUILD_ID = __mods[14]["BUILD_ID"];
export const COLUMN_ARTICLES = __mods[52]["COLUMN_ARTICLES"];
export const COLUMN_CATEGORIES = __mods[52]["COLUMN_CATEGORIES"];
export const CONSULTATION_PURPOSES = __mods[58]["CONSULTATION_PURPOSES"];
export const CONSULT_SAFETY_FLAGS = __mods[29]["CONSULT_SAFETY_FLAGS"];
export const CONTRACTILE_BODY_PARTS = __mods[3]["CONTRACTILE_BODY_PARTS"];
export const COURSE_NUMERIC_FIELDS = __mods[40]["COURSE_NUMERIC_FIELDS"];
export const CURRENT_APP_REMOVABLE_STORAGE_KEYS = __mods[1]["CURRENT_APP_REMOVABLE_STORAGE_KEYS"];
export const CURRENT_REGIONAL_MODEL_SNAPSHOT = __mods[4]["CURRENT_REGIONAL_MODEL_SNAPSHOT"];
export const DEFAULT_MODEL_CONFIGURATION = __mods[3]["DEFAULT_MODEL_CONFIGURATION"];
export const DETERMINISTIC_CONSULTATION_VERSION = __mods[58]["DETERMINISTIC_CONSULTATION_VERSION"];
export const EPS = __mods[18]["EPS"];
export const EQUIPMENT_TAG_OPTIONS = __mods[7]["EQUIPMENT_TAG_OPTIONS"];
export const EVIDENCE_GOVERNANCE_REVIEW_DATE = __mods[51]["EVIDENCE_GOVERNANCE_REVIEW_DATE"];
export const EVIDENCE_GOVERNANCE_VERSION = __mods[51]["EVIDENCE_GOVERNANCE_VERSION"];
export const FOCUS_TAG_OPTIONS = __mods[7]["FOCUS_TAG_OPTIONS"];
export const FOOT_PLACEMENT_OPTIONS = __mods[7]["FOOT_PLACEMENT_OPTIONS"];
export const FORMAL_INPUT_CATALOG = __mods[17]["FORMAL_INPUT_CATALOG"];
export const FULL_RESPONSE_MAX_ABS_GRADE_PERCENT = __mods[3]["FULL_RESPONSE_MAX_ABS_GRADE_PERCENT"];
export const GASTRO_GRADE_CURVE = __mods[17]["GASTRO_GRADE_CURVE"];
export const GLUTE_GRADE_CURVE = __mods[17]["GLUTE_GRADE_CURVE"];
export const GRADE_SPEED_PROFILE = __mods[17]["GRADE_SPEED_PROFILE"];
export const INPUT_LIMITS = __mods[6]["INPUT_LIMITS"];
export const INTERNAL_RECOVERY_STORAGE_KEYS = __mods[1]["INTERNAL_RECOVERY_STORAGE_KEYS"];
export const LOAD_MODEL_VERSION = __mods[3]["LOAD_MODEL_VERSION"];
export const MODEL_TOTAL_LOAD_UNIT = __mods[3]["MODEL_TOTAL_LOAD_UNIT"];
export const MODEL_TOTAL_LOAD_VERSION = __mods[3]["MODEL_TOTAL_LOAD_VERSION"];
export const MODEL_VERSION = __mods[14]["MODEL_VERSION"];
export const MODEL_WARNING_THRESHOLD = __mods[3]["MODEL_WARNING_THRESHOLD"];
export const OFFICIAL_HELP_REFERENCES = __mods[43]["OFFICIAL_HELP_REFERENCES"];
export const ORACLE_EXPECTED = __mods[17]["ORACLE_EXPECTED"];
export const ORACLE_STATUS = __mods[17]["ORACLE_STATUS"];
export const OUTPUT_SEMANTIC_VERSION = __mods[14]["OUTPUT_SEMANTIC_VERSION"];
export const PARAMETERS = __mods[17]["PARAMETERS"];
export const PARAMETER_BOUNDS = __mods[17]["PARAMETER_BOUNDS"];
export const PARAMETER_SET_VERSION = __mods[17]["PARAMETER_SET_VERSION"];
export const PERSONAL_CONTEXT_SCHEMA_VERSION = __mods[7]["PERSONAL_CONTEXT_SCHEMA_VERSION"];
export const PERSONAL_PROFILE_NUMERIC_USE = __mods[36]["PERSONAL_PROFILE_NUMERIC_USE"];
export const PERSONAL_PROFILE_SCHEMA_VERSION = __mods[36]["PERSONAL_PROFILE_SCHEMA_VERSION"];
export const PFA_CURVE = __mods[17]["PFA_CURVE"];
export const PRIMARY_REGIONAL_V2_AUTHORITY_VERSION = __mods[26]["PRIMARY_REGIONAL_V2_AUTHORITY_VERSION"];
export const PRIMARY_REGIONAL_V2_BUILD_ID = __mods[26]["PRIMARY_REGIONAL_V2_BUILD_ID"];
export const PRIMARY_REGIONAL_V2_MODEL_VERSION = __mods[26]["PRIMARY_REGIONAL_V2_MODEL_VERSION"];
export const LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION = __mods[26]["LEGACY_PRIMARY_REGIONAL_V2_MODEL_VERSION"];
export const PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION = __mods[26]["PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION"];
export const PRIMARY_REGIONAL_V2_REGION_DEFS = __mods[25]["PRIMARY_REGIONAL_V2_REGION_DEFS"];
export const PRIMARY_REGIONAL_V2_SNAPSHOT = __mods[4]["PRIMARY_REGIONAL_V2_SNAPSHOT"];
export const LEGACY_PRIMARY_REGIONAL_V2_SNAPSHOT = __mods[4]["LEGACY_PRIMARY_REGIONAL_V2_SNAPSHOT"];
export const PRIVACY_OVERVIEW_VERSION = __mods[61]["PRIVACY_OVERVIEW_VERSION"];
export const PROFILE_AGE_BAND_OPTIONS = __mods[36]["PROFILE_AGE_BAND_OPTIONS"];
export const PUBLIC_HELP_GUIDANCE_REVIEW_DATE = __mods[43]["PUBLIC_HELP_GUIDANCE_REVIEW_DATE"];
export const PUBLIC_HELP_GUIDANCE_VERSION = __mods[43]["PUBLIC_HELP_GUIDANCE_VERSION"];
export const R12_GRASS_ENVELOPE = __mods[14]["R12_GRASS_ENVELOPE"];
export const REGIONAL_MODEL_SNAPSHOT_ID = __mods[4]["REGIONAL_MODEL_SNAPSHOT_ID"];
export const REGIONS = __mods[17]["REGIONS"];
export const REGION_DEFS = __mods[14]["REGION_DEFS"];
export const RESTORE_INSPECTION_VERSION = __mods[41]["RESTORE_INSPECTION_VERSION"];
export const RESTORE_STATUS = __mods[41]["RESTORE_STATUS"];
export const RETAINED_INPUTS = __mods[15]["RETAINED_INPUTS"];
export const RHYTHM_STRIDE_OPTIONS = __mods[7]["RHYTHM_STRIDE_OPTIONS"];
export const RPE_PROVENANCE = __mods[8]["RPE_PROVENANCE"];
export const SAFETY_FLAG_KEYS = __mods[29]["SAFETY_FLAG_KEYS"];
export const SHOE_SOFTNESS_OPTIONS = __mods[7]["SHOE_SOFTNESS_OPTIONS"];
export const SHOE_TYPE_OPTIONS = __mods[7]["SHOE_TYPE_OPTIONS"];
export const SOURCE_CURVES = __mods[17]["SOURCE_CURVES"];
export const SOURCE_EVIDENCE_REGISTRY = __mods[51]["SOURCE_EVIDENCE_REGISTRY"];
export const STORAGE_NAMESPACE = __mods[1]["STORAGE_NAMESPACE"];
export const STORAGE_KEYS = __mods[1]["STORAGE_KEYS"];
export const SUBJECTIVE_CHECK_STATUSES = __mods[30]["SUBJECTIVE_CHECK_STATUSES"];
export const SUPPORT_BLOCKS = __mods[29]["SUPPORT_BLOCKS"];
export const SUPPORT_DATA_VERSION = __mods[29]["SUPPORT_DATA_VERSION"];
export const SUPPORT_NEXT_ACTIONS = __mods[29]["SUPPORT_NEXT_ACTIONS"];
export const SUPPORT_ROUTES = __mods[29]["SUPPORT_ROUTES"];
export const SUPPORT_RULE_VERSION = __mods[29]["SUPPORT_RULE_VERSION"];
export const SURFACE_CURVES = __mods[17]["SURFACE_CURVES"];
export const SURFACE_FIELDS = __mods[3]["SURFACE_FIELDS"];
export const SURFACE_INTERPRETATION_GUIDE = __mods[3]["SURFACE_INTERPRETATION_GUIDE"];
export const SURFACE_PRESETS = __mods[17]["SURFACE_PRESETS"];
export const SURFACE_TRAITS = __mods[3]["SURFACE_TRAITS"];
export const SURFACE_TRAIT_LABELS = __mods[3]["SURFACE_TRAIT_LABELS"];
export const UNEVENNESS_UPPER_BOUND_CURVES = __mods[17]["UNEVENNESS_UPPER_BOUND_CURVES"];
export const URGENT_SAFETY_FLAGS = __mods[29]["URGENT_SAFETY_FLAGS"];
export const USER_DATA_STORAGE_KEYS = __mods[1]["USER_DATA_STORAGE_KEYS"];
export const V27_ACTIVITY_TYPES = __mods[12]["V27_ACTIVITY_TYPES"];
export const V27_CADENCE_CURVES = __mods[12]["V27_CADENCE_CURVES"];
export const V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS = __mods[12]["V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS"];
export const V27_COMMON_REGIONAL_GRADE_DOMAIN_MAX_PERCENT = __mods[12]["V27_COMMON_REGIONAL_GRADE_DOMAIN_MAX_PERCENT"];
export const V27_COMMON_REGIONAL_GRADE_INPUT_MAX_PERCENT = __mods[12]["V27_COMMON_REGIONAL_GRADE_INPUT_MAX_PERCENT"];
export const V27_EMPHASIS_REGION_IDS = __mods[12]["V27_EMPHASIS_REGION_IDS"];
export const V27_GRADE_CURVES = __mods[12]["V27_GRADE_CURVES"];
export const V27_MISSINGNESS_STATES = __mods[12]["V27_MISSINGNESS_STATES"];
export const V27_MODEL_VERSION = __mods[12]["V27_MODEL_VERSION"];
export const V27_REGIONAL_VIEW_IDS = __mods[12]["V27_REGIONAL_VIEW_IDS"];
export const V27_REGIONS = __mods[12]["V27_REGIONS"];
export const V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG = __mods[12]["V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG"];
export const V27_SPEED_CURVES = __mods[12]["V27_SPEED_CURVES"];
export const V27_SURFACE_FACTORS = __mods[12]["V27_SURFACE_FACTORS"];
export const V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT = __mods[12]["V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT"];
export const adaptCurrentRecordToPrimaryRegionalV2 = __mods[24]["adaptCurrentRecordToPrimaryRegionalV2"];
export const adaptPrototypeRecord = __mods[22]["adaptPrototypeRecord"];
export const adaptRecordToV27Session = __mods[45]["adaptRecordToV27Session"];
export const adaptStoredRecordToPrimaryRegionalV2Input = __mods[16]["adaptStoredRecordToPrimaryRegionalV2Input"];
export const alphaFromTimeConstant = __mods[5]["alphaFromTimeConstant"];
export const approximatelyEqual = __mods[38]["approximatelyEqual"];
export const assertCsvText = __mods[6]["assertCsvText"];
export const assertDaySemantics = __mods[15]["assertDaySemantics"];
export const assertV27ResultSemantics = __mods[39]["assertV27ResultSemantics"];
export const baselineResponse = __mods[14]["baselineResponse"];
export const bodyAreaLateralityLabel = __mods[28]["bodyAreaLateralityLabel"];
export const bodyRegionDisplayName = __mods[57]["bodyRegionDisplayName"];
export const bodyRegionFamiliarName = __mods[57]["bodyRegionFamiliarName"];
export const bodyRegionFormalName = __mods[57]["bodyRegionFormalName"];
export const bodyRegionPlainMeaning = __mods[57]["bodyRegionPlainMeaning"];
export const bodyRegionTerminology = __mods[57]["bodyRegionTerminology"];
export const boundedFactor = __mods[18]["boundedFactor"];
export const buildAppRetainedInputTrace = __mods[24]["buildAppRetainedInputTrace"];
export const buildArticleEvidenceGovernance = __mods[51]["buildArticleEvidenceGovernance"];
export const buildConsultationReport = __mods[56]["buildConsultationReport"];
export const buildDeterministicConsultation = __mods[58]["buildDeterministicConsultation"];
export const buildPrimaryRegionalV2ComparisonSignature = __mods[26]["buildPrimaryRegionalV2ComparisonSignature"];
export const buildPrimaryRegionalV2FormalInputTrace = __mods[23]["buildPrimaryRegionalV2FormalInputTrace"];
export const buildPrivacyOverview = __mods[61]["buildPrivacyOverview"];
export const buildPublicHelpGuidance = __mods[43]["buildPublicHelpGuidance"];
export const buildRetainedInputTrace = __mods[15]["buildRetainedInputTrace"];
export const byteLength = __mods[6]["byteLength"];
export const calculateBodyWeightAdjustment = __mods[36]["calculateBodyWeightAdjustment"];
export const calculateRun = __mods[14]["calculateRun"];
export const calculateV27InternalResponse = __mods[39]["calculateV27InternalResponse"];
export const calculateV27PersonalRelative = __mods[44]["calculateV27PersonalRelative"];
export const calculateV27Regional = __mods[39]["calculateV27Regional"];
export const calculateV27RegionalCadenceFactor = __mods[39]["calculateV27RegionalCadenceFactor"];
export const calculateV27RegionalGradeFactor = __mods[39]["calculateV27RegionalGradeFactor"];
export const calculateV27RegionalSpeedFactor = __mods[39]["calculateV27RegionalSpeedFactor"];
export const calculateV27Session = __mods[39]["calculateV27Session"];
export const calculateV27Total = __mods[39]["calculateV27Total"];
export const calculateV27TotalFromMarginalProfiles = __mods[39]["calculateV27TotalFromMarginalProfiles"];
export const calculateV27TotalFromSections = __mods[39]["calculateV27TotalFromSections"];
export const calculateV27TotalGradeFactor = __mods[39]["calculateV27TotalGradeFactor"];
export const calculateV27WithinRunRegionalEmphasis = __mods[39]["calculateV27WithinRunRegionalEmphasis"];
export const clamp = __mods[18]["clamp"];
export const clampNumber = __mods[5]["clampNumber"];
export const cloneDefaultModelConfiguration = __mods[3]["cloneDefaultModelConfiguration"];
export const cloneV27PlanPreview = __mods[49]["cloneV27PlanPreview"];
export const clonePlanFactPreview = __mods[49]["clonePlanFactPreview"];
export const comparePrimaryRegionalV2Signatures = __mods[26]["comparePrimaryRegionalV2Signatures"];
export const createApplicationServices = __mods[59]["createApplicationServices"];
export const createBackupService = __mods[42]["createBackupService"];
export const createBodyProfileSnapshot = __mods[36]["createBodyProfileSnapshot"];
export const createCollectionRepository = __mods[10]["createCollectionRepository"];
export const createColumnService = __mods[53]["createColumnService"];
export const createCourseRepository = __mods[40]["createCourseRepository"];
export const createDataManagementService = __mods[55]["createDataManagementService"];
export const createDetailedConsultationText = __mods[56]["createDetailedConsultationText"];
export const createDraftRepository = __mods[37]["createDraftRepository"];
export const createHistoryWorkflow = __mods[48]["createHistoryWorkflow"];
export const createMemoryStorage = __mods[2]["createMemoryStorage"];
export const createModelResultRegionalV2Repository = __mods[27]["createModelResultRegionalV2Repository"];
export const createModelResultV27Repository = __mods[13]["createModelResultV27Repository"];
export const createPlanRepository = __mods[32]["createPlanRepository"];
export const createPlanWorkflow = __mods[50]["createPlanWorkflow"];
export const createPrimaryRegionalV2ResultRecord = __mods[26]["createPrimaryRegionalV2ResultRecord"];
export const createProfileRepository = __mods[37]["createProfileRepository"];
export const createReadableRecordId = __mods[9]["createReadableRecordId"];
export const createRecordRepository = __mods[11]["createRecordRepository"];
export const createRecordWorkflow = __mods[47]["createRecordWorkflow"];
export const createSettingsRepository = __mods[37]["createSettingsRepository"];
export const createShortConsultationMemo = __mods[56]["createShortConsultationMemo"];
export const createStandardConsultationText = __mods[56]["createStandardConsultationText"];
export const createStorageGateway = __mods[2]["createStorageGateway"];
export const createSubjectiveFeedbackRepository = __mods[31]["createSubjectiveFeedbackRepository"];
export const createV27PlanPreview = __mods[49]["createV27PlanPreview"];
export const createPlanFactPreview = __mods[49]["createPlanFactPreview"];
export const createV27ResultRecord = __mods[46]["createV27ResultRecord"];
export const currentAppContextTraceNames = __mods[15]["currentAppContextTraceNames"];
export const decodeProtectedSpreadsheetText = __mods[6]["decodeProtectedSpreadsheetText"];
export const deriveV27PersonalCadenceDelta = __mods[44]["deriveV27PersonalCadenceDelta"];
export const deriveV27PersonalCadenceSensitivity = __mods[44]["deriveV27PersonalCadenceSensitivity"];
export const escapeCsvValue = __mods[6]["escapeCsvValue"];
export const evaluateRegionSegment = __mods[14]["evaluateRegionSegment"];
export const evaluateSupportDecision = __mods[29]["evaluateSupportDecision"];
export const failure = __mods[18]["failure"];
export const geometricMeanRatio = __mods[18]["geometricMeanRatio"];
export const getAgeBandMetadata = __mods[36]["getAgeBandMetadata"];
export const getArticleEvidenceGovernance = __mods[51]["getArticleEvidenceGovernance"];
export const getBodyWeightFactorFromRecord = __mods[36]["getBodyWeightFactorFromRecord"];
export const getSourceEvidenceGovernance = __mods[51]["getSourceEvidenceGovernance"];
export const gradeDegreesToPercent = __mods[18]["gradeDegreesToPercent"];
export const gradeIsWithinFullResponseDomain = __mods[3]["gradeIsWithinFullResponseDomain"];
export const gradePercentToDegrees = __mods[18]["gradePercentToDegrees"];
export const hasPersonalContextInput = __mods[7]["hasPersonalContextInput"];
export const hasTreadmillOutdoorSurfaceMixFromComponents = __mods[3]["hasTreadmillOutdoorSurfaceMixFromComponents"];
export const hasTreadmillOutdoorSurfaceMixFromCourse = __mods[3]["hasTreadmillOutdoorSurfaceMixFromCourse"];
export const hashCanonical = __mods[19]["hashCanonical"];
export const inferSubjectiveCheckStatus = __mods[30]["inferSubjectiveCheckStatus"];
export const inspectBackupSnapshot = __mods[41]["inspectBackupSnapshot"];
export const inspectJsonValue = __mods[6]["inspectJsonValue"];
export const isCurrentRegionalModelRecord = __mods[4]["isCurrentRegionalModelRecord"];
export const isFiniteNumber = __mods[38]["isFiniteNumber"];
export const isPrimaryRegionalV2Record = __mods[4]["isPrimaryRegionalV2Record"];
export const isReportedRpeProvenance = __mods[8]["isReportedRpeProvenance"];
export const isStandardShoeCandidate = __mods[20]["isStandardShoeCandidate"];
export const isValidLocalDate = __mods[9]["isValidLocalDate"];
export const labelForOption = __mods[7]["labelForOption"];
export const linearInterpolate = __mods[38]["linearInterpolate"];
export const logInterpolate = __mods[18]["logInterpolate"];
export const median = __mods[38]["median"];
export const mergeState = __mods[18]["mergeState"];
export const minettiCost = __mods[39]["minettiCost"];
export const nearlyEqual = __mods[18]["nearlyEqual"];
export const normalizeAgeBand = __mods[36]["normalizeAgeBand"];
export const normalizeBodyAreaObservations = __mods[28]["normalizeBodyAreaObservations"];
export const normalizeBodyProfile = __mods[36]["normalizeBodyProfile"];
export const normalizeCourseFields = __mods[40]["normalizeCourseFields"];
export const normalizePersonalContext = __mods[7]["normalizePersonalContext"];
export const normalizePlainText = __mods[6]["normalizePlainText"];
export const normalizeRegionalModelSnapshot = __mods[4]["normalizeRegionalModelSnapshot"];
export const normalizeRpeProvenance = __mods[8]["normalizeRpeProvenance"];
export const normalizeRunningRecord = __mods[9]["normalizeRunningRecord"];
export const normalizeSafetyFlags = __mods[30]["normalizeSafetyFlags"];
export const normalizeSex = __mods[36]["normalizeSex"];
export const normalizeSingleLineText = __mods[6]["normalizeSingleLineText"];
export const normalizeSubjectiveFeedback = __mods[30]["normalizeSubjectiveFeedback"];
export const normalizeUserText = __mods[6]["normalizeUserText"];
export const normalizeV27PlanSession = __mods[49]["normalizeV27PlanSession"];
export const normalizePlanFactSession = __mods[49]["normalizePlanFactSession"];
export const PLAN_FACT_PREVIEW_VERSION = __mods[49]["PLAN_FACT_PREVIEW_VERSION"];
export const parseJsonText = __mods[6]["parseJsonText"];
export const personalHabitualCadenceReference = __mods[24]["personalHabitualCadenceReference"];
export const primaryRegionalV2ProfileContext = __mods[16]["primaryRegionalV2ProfileContext"];
export const privacyStorageCoverage = __mods[61]["privacyStorageCoverage"];
export const protectSpreadsheetFormula = __mods[6]["protectSpreadsheetFormula"];
export const regionDefinition = __mods[14]["regionDefinition"];
export const regionalModelGenerationForRecord = __mods[4]["regionalModelGenerationForRecord"];
export const regionalModelSnapshotForRecord = __mods[4]["regionalModelSnapshotForRecord"];
export const registerPwaServiceWorker = __mods[0]["registerPwaServiceWorker"];
export const reportedRpeValue = __mods[8]["reportedRpeValue"];
export const requirePositiveFinite = __mods[38]["requirePositiveFinite"];
export const resolveSurfaceSelections = __mods[20]["resolveSurfaceSelections"];
export const roundNumber = __mods[5]["roundNumber"];
export const sha256 = __mods[19]["sha256"];
export const shouldBlockNormalPlanSuggestions = __mods[29]["shouldBlockNormalPlanSuggestions"];
export const shouldPrioritizeOfficialHelp = __mods[29]["shouldPrioritizeOfficialHelp"];
export const stableStringify = __mods[18]["stableStringify"];
export const stampCurrentRegionalModel = __mods[4]["stampCurrentRegionalModel"];
export const success = __mods[18]["success"];
export const sumNumbers = __mods[5]["sumNumbers"];
export const summarizePersonalContext = __mods[7]["summarizePersonalContext"];
export const toFiniteNumber = __mods[5]["toFiniteNumber"];
export const upsertPrimaryRegionalV2ResultRecord = __mods[26]["upsertPrimaryRegionalV2ResultRecord"];
export const upsertV27ResultRecord = __mods[46]["upsertV27ResultRecord"];
export const validateCoursePresetInput = __mods[40]["validateCoursePresetInput"];
export const validateFormalBundleSemantics = __mods[21]["validateFormalBundleSemantics"];
export const validateFormalInputBundle = __mods[22]["validateFormalInputBundle"];
export const validatePrimaryRegionalV2ResultRecord = __mods[26]["validatePrimaryRegionalV2ResultRecord"];
export const validatePrototypeRecordInput = __mods[21]["validatePrototypeRecordInput"];
export const validateRawV27PlanSession = __mods[49]["validateRawV27PlanSession"];
export const validateRegionalEngineInputSemantics = __mods[21]["validateRegionalEngineInputSemantics"];
export const validateRegionalEngineOutput = __mods[21]["validateRegionalEngineOutput"];
export const validateRunningRecord = __mods[9]["validateRunningRecord"];
export const validateRunningRecordInput = __mods[9]["validateRunningRecordInput"];
export const validateV27Shares = __mods[38]["validateV27Shares"];
export const weightedMean = __mods[38]["weightedMean"];
export const weightedRearrangementProduct = __mods[38]["weightedRearrangementProduct"];
export const worstCalculationState = __mods[18]["worstCalculationState"];

const DB_NAME = "running-record-mobile-media-v1";
const DB_VERSION = 1;
const STORE_NAME = "photoMemos";

export const PHOTO_MEMO_MAX_COUNT = 20;
export const PHOTO_MEMO_MAX_BYTES = 1_000_000;
export const PHOTO_MEMO_MAX_DIMENSION = 1440;

let databasePromise = null;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });
}

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error("IndexedDB is unavailable"));
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error || new Error("IndexedDB open failed"));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error("IndexedDB open blocked"));
    };
  });

  return databasePromise;
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted"));
  });
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function saveFailureReason(error) {
  if (error?.name === "QuotaExceededError") return "quota";
  return "unavailable";
}

export async function listPhotoMemos() {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const entries = await requestResult(transaction.objectStore(STORE_NAME).getAll());
  await transactionDone(transaction);
  return (Array.isArray(entries) ? entries : [])
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export async function savePhotoMemo({ blob, note = "", width = 0, height = 0 } = {}) {
  if (!(blob instanceof Blob) || !blob.size || blob.type !== "image/jpeg") {
    return { ok: false, reason: "image" };
  }
  if (blob.size > PHOTO_MEMO_MAX_BYTES) return { ok: false, reason: "size" };
  const imageWidth = Number(width);
  const imageHeight = Number(height);
  if (!Number.isInteger(imageWidth) || !Number.isInteger(imageHeight)
      || imageWidth < 1 || imageHeight < 1
      || imageWidth > PHOTO_MEMO_MAX_DIMENSION || imageHeight > PHOTO_MEMO_MAX_DIMENSION) {
    return { ok: false, reason: "image" };
  }

  try {
    const imageBytes = await blob.arrayBuffer();
    const record = {
      id: createId(),
      createdAt: new Date().toISOString(),
      note: String(note || "").trim().slice(0, 160),
      imageBytes,
      mimeType: "image/jpeg",
      byteSize: blob.size,
      width: imageWidth,
      height: imageHeight,
    };
    const database = await openDatabase();
    // A separate list + write transaction permits parallel callers to all
    // observe an old count and exceed the 20-photo quota. Count and insert
    // under one readwrite transaction so they serialize across tabs.
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const done = transactionDone(transaction);
    const store = transaction.objectStore(STORE_NAME);
    const count = await requestResult(store.count());
    if (count >= PHOTO_MEMO_MAX_COUNT) {
      transaction.abort();
      await done.catch(() => {});
      return { ok: false, reason: "limit" };
    }
    store.add(record);
    await done;
    return { ok: true, record };
  } catch (error) {
    return { ok: false, reason: saveFailureReason(error) };
  }
}

export async function deletePhotoMemo(id) {
  const key = String(id || "");
  if (!key) return false;
  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(key);
    await transactionDone(transaction);
    return true;
  } catch {
    return false;
  }
}

export async function clearAllPhotoMemos() {
  // The API can be temporarily blocked while an older photo database persists.
  // Never report a full cross-store deletion as successful without verifying it.
  if (!globalThis.indexedDB) return false;
  try {
    if (databasePromise) {
      try {
        const database = await databasePromise;
        database?.close?.();
      } catch {}
    }
    databasePromise = null;
    await new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error || new Error("IndexedDB delete failed"));
      request.onblocked = () => reject(new Error("IndexedDB delete blocked"));
    });
    return true;
  } catch {
    return false;
  }
}

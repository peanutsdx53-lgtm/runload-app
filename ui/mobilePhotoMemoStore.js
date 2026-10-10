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

  // Do not cache a rejected open permanently (the API may recover later).
  // onblocked is not cancellation; close a late success rather than retaining
  // an orphaned handle after the caller has been told the open failed.
  const pending = new Promise((resolve, reject) => {
    let request;
    let blocked = false;
    try {
      request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      if (blocked) {
        database.close();
        return;
      }
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
    request.onblocked = () => {
      blocked = true;
      reject(new Error("IndexedDB open blocked"));
    };
  });
  const guarded = pending.catch((error) => {
    if (databasePromise === guarded) databasePromise = null;
    throw error;
  });
  databasePromise = guarded;

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
  // IndexedDB deleteDatabase.onblocked is not a cancellation: its request can
  // silently complete much later after another tab closes, deleting photos
  // that were added *after* the caller was told cleanup failed. Clearing the
  // records in a committed readwrite transaction has a definitive completion
  // boundary, including when another tab still holds an open database handle.
  // Retain the empty schema; removing all personal rows is the user operation.
  if (!globalThis.indexedDB) return false;
  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore(STORE_NAME).clear();
    await done;
    return true;
  } catch {
    return false;
  }
}

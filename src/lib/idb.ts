/* نگه‌داری فایل‌های اسکن‌شده در IndexedDB.
   تصاویر اسکن‌شده در localStorage جا نمی‌شوند (سهمیه ~۵ مگابایت)،
   بنابراین بدنه فایل اینجا ذخیره و فقط فراداده در استور اصلی می‌ماند. */

const DB_NAME = 'crm-scan-files';
const STORE = 'blobs';
const DB_VERSION = 1;

const memoryStore = new Map<string, Blob>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return dbPromise;
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  const result = await withStore<IDBValidKey>('readwrite', (store) => store.put(blob, key));
  if (result === null) memoryStore.set(key, blob);
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const stored = await withStore<Blob>('readonly', (store) => store.get(key) as IDBRequest<Blob>);
  return stored ?? memoryStore.get(key);
}

export async function deleteBlob(key: string): Promise<void> {
  memoryStore.delete(key);
  await withStore<undefined>('readwrite', (store) => store.delete(key));
}

export async function clearBlobs(): Promise<void> {
  memoryStore.clear();
  await withStore<undefined>('readwrite', (store) => store.clear());
}

export interface StorageEstimate {
  usage: number;
  quota: number;
}

/** تخمین مصرف فضا توسط مرورگر (اگر پشتیبانی شود) */
export async function estimateBlobUsage(): Promise<StorageEstimate | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}

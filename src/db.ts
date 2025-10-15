export const DB_NAME = 'glowup-db';
export const DB_VERSION = 1;
export const STORE = 'entries';

export const BACKEND_URL =
  location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://my-pwa-production-e81a.up.railway.app';

export interface Entry {
  id: number;
  text: string;
  createdAt: number;
  synced: boolean;
}

export interface EntryInput {
  text: string;
  createdAt?: number;
  synced?: boolean;
}

function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

function onComplete(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        os.createIndex('synced', 'synced', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addEntry(data: EntryInput): Promise<number> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);

    const obj: Omit<Entry, 'id'> = {
      text: data.text,
      createdAt: data.createdAt ?? Date.now(),
      synced: data.synced ?? navigator.onLine,
    };

    const addReq = store.add(obj as unknown as Entry);
    const id = (await promisifyRequest<IDBValidKey>(addReq)) as number;
    await onComplete(tx);

    if (navigator.onLine) {
      try {
        const resp = await fetch(`${BACKEND_URL}/api/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entries: [{ id, text: obj.text, createdAt: obj.createdAt }],
          }),
        });

        if (resp.ok) {
          const json = (await resp.json()) as { ok: boolean; syncedIds?: number[] };
          if (json.ok && Array.isArray(json.syncedIds) && json.syncedIds.includes(id)) {
            await markAsSynced([id]);
          }
        } else {
          await markAsPending([id]);
        }
      } catch {
        await markAsPending([id]);
      }
    }

    return id;
  } finally {
    db.close();
  }
}

export async function getAllEntries(): Promise<Entry[]> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    const rows = (await promisifyRequest<Entry[]>(req)) || [];
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  } finally {
    db.close();
  }
}

export async function getPendingEntries(): Promise<Entry[]> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const idx = tx.objectStore(STORE).index('synced');
    const req = idx.getAll(IDBKeyRange.only(false));
    const rows = (await promisifyRequest<Entry[]>(req)) || [];
    return rows;
  } finally {
    db.close();
  }
}

export async function markAsSynced(ids: number[]): Promise<void> {
  if (!ids?.length) return;
  const db = await openDB();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);

    await Promise.all(
      ids.map(async (id) => {
        const getReq = store.get(id);
        const item = (await promisifyRequest<Entry | undefined>(getReq)) as Entry | undefined;
        if (!item) return;
        item.synced = true;
        const putReq = store.put(item);
        await promisifyRequest(putReq);
      })
    );

    await onComplete(tx);
  } finally {
    db.close();
  }
}

export async function markAsPending(ids: number[]): Promise<void> {
  if (!ids?.length) return;
  const db = await openDB();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);

    await Promise.all(
      ids.map(async (id) => {
        const getReq = store.get(id);
        const item = (await promisifyRequest<Entry | undefined>(getReq)) as Entry | undefined;
        if (!item) return;
        item.synced = false;
        const putReq = store.put(item);
        await promisifyRequest(putReq);
      })
    );

    await onComplete(tx);
  } finally {
    db.close();
  }
}

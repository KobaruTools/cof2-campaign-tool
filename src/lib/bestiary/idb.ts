/**
 * Wrapper IndexedDB **minimal et maison** pour le cache persistant du bestiaire
 * (PER-244) — première (et seule) utilisation d'IndexedDB dans le projet. Pas de
 * dépendance externe : la surface nécessaire (ouvrir la base + get/getAll/put/
 * delete sur deux object stores) tient en quelques fonctions promisifiées, dans
 * l'éthos « pattern maison » du codebase (cf. `usePersistedState`, stores zustand,
 * pas de React Query).
 *
 * Deux object stores, tous deux à clé « in-line » (`keyPath`) :
 *   - `sources` (clé `id`)  : la liste légère mise en cache, **groupée par source**
 *                             et estampillée par sa `content_version`.
 *   - `blobs`   (clé `slug`): les blobs de détail déjà consultés, estampillés par
 *                             `(sourceId, updatedAt)` pour l'invalidation fine.
 *
 * Toutes les opérations sont réservées au NAVIGATEUR. Utiliser
 * `isIndexedDbAvailable()` en amont : hors navigateur (SSR, tests node) ou si
 * IndexedDB est indisponible, le store retombe sur un cache mémoire de session.
 */

const DB_NAME = 'cof2-bestiary';
const DB_VERSION = 1;

/** Object store de la liste légère groupée par source (clé = `sources.id`). */
export const SOURCES_STORE = 'sources';
/** Object store des blobs de détail déjà vus (clé = slug de la créature). */
export const BLOBS_STORE = 'blobs';

/** IndexedDB est-il utilisable dans cet environnement (navigateur) ? */
export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

/** Promisifie une `IDBRequest` (succès → valeur, erreur → rejet). */
function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Ouverture unique et partagée de la base (le schéma est créé à la volée).
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB indisponible dans cet environnement.'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SOURCES_STORE)) {
          db.createObjectStore(SOURCES_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(BLOBS_STORE)) {
          db.createObjectStore(BLOBS_STORE, { keyPath: 'slug' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

/** Toutes les valeurs d'un object store. */
export async function idbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(store, 'readonly');
  return requestToPromise(tx.objectStore(store).getAll() as IDBRequest<T[]>);
}

/** Une valeur par clé (`undefined` si absente). */
export async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  const tx = db.transaction(store, 'readonly');
  const result = await requestToPromise(
    tx.objectStore(store).get(key) as IDBRequest<T | undefined>,
  );
  return result ?? undefined;
}

/** Insère/remplace plusieurs valeurs dans une seule transaction. */
export async function idbPutMany<T>(store: string, values: T[]): Promise<void> {
  if (values.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);
  for (const value of values) objectStore.put(value);
  await txDone(tx);
}

/** Insère/remplace une valeur. */
export async function idbPut<T>(store: string, value: T): Promise<void> {
  return idbPutMany(store, [value]);
}

/** Supprime plusieurs clés dans une seule transaction. */
export async function idbDeleteMany(store: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);
  for (const key of keys) objectStore.delete(key);
  await txDone(tx);
}

/** Résout quand la transaction d'écriture est validée (ou rejette en cas d'échec). */
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

import { describe, expect, it, beforeEach } from 'vitest';
import { runStorageMigration } from './migrateLegacyKeys';
import { storageKeys, STORAGE_MIGRATION_MARKER_KEY } from './keys';

// Pas de jsdom dans ce repo (env vitest par défaut = node) : shim minimal
// conforme à l'interface `Storage` (get/set/clear/length/key), suffisant pour
// `runStorageMigration`.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  clear(): void {
    this.store.clear();
  }
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
}

const memoryStorage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true });
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });

describe('runStorageMigration', () => {
  beforeEach(() => {
    memoryStorage.clear();
  });

  it('copie une clé statique vers sa nouvelle clé', () => {
    localStorage.setItem('cof2-characters', '{"foo":"bar"}');
    runStorageMigration();
    expect(localStorage.getItem(storageKeys.store.characters)).toBe('{"foo":"bar"}');
    expect(localStorage.getItem('cof2-characters')).toBe('{"foo":"bar"}');
  });

  it('copie une clé à suffixe dynamique par scan de préfixe', () => {
    localStorage.setItem('cof2-inventory-pinned-desc:abc123', 'true');
    localStorage.setItem('gauge-expanded:mount:mount-9', 'false');
    runStorageMigration();
    expect(localStorage.getItem(storageKeys.inventory.pinnedDesc('abc123'))).toBe('true');
    expect(localStorage.getItem(storageKeys.gauge.mount('mount-9'))).toBe('false');
  });

  it('ne touche pas une nouvelle clé déjà présente', () => {
    localStorage.setItem(storageKeys.store.preferences, 'nouveau');
    localStorage.setItem('cof2-preferences', 'ancien');
    runStorageMigration();
    expect(localStorage.getItem(storageKeys.store.preferences)).toBe('nouveau');
  });

  it("ne tourne qu'une fois (marqueur posé)", () => {
    localStorage.setItem('cof2-characters', 'v1');
    runStorageMigration();
    expect(localStorage.getItem(STORAGE_MIGRATION_MARKER_KEY)).not.toBeNull();

    localStorage.setItem(storageKeys.store.characters, 'v1-modifiee-apres-migration');
    localStorage.setItem('cof2-characters', 'v2-devrait-etre-ignoree');
    runStorageMigration();
    expect(localStorage.getItem(storageKeys.store.characters)).toBe('v1-modifiee-apres-migration');
  });

  it('ignore silencieusement une clé absente', () => {
    expect(() => runStorageMigration()).not.toThrow();
    expect(localStorage.getItem(storageKeys.store.characters)).toBeNull();
  });
});

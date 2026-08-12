import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Teste le GATING (sécurité) et l'aiguillage du chargeur, collaborateurs mockés.
 * `loadPaidContent` mémorise sa promesse au niveau module : on réinitialise les
 * modules entre chaque cas (`vi.resetModules`) pour repartir d'un état propre, et on
 * fixe les variables d'env AVANT l'import (elles sont lues à l'évaluation du module).
 */

// Espions partagés, réinitialisés à chaque test.
const registerContentBundle = vi.fn(() => ({ added: 1, skipped: [] as string[] }));
const fetchSourceManifest = vi.fn();
const fetchPaidContentJson = vi.fn();
const readAllCachedBundles = vi.fn();
const writeCachedBundle = vi.fn(async () => {});
const purgeCachedBundles = vi.fn(async () => {});
const getSession = vi.fn();

vi.mock('@/data', () => ({
  registerContentBundle,
  getContentVersion: () => 0,
  subscribeContent: () => () => {},
  setContentLoading: () => {},
}));
vi.mock('@/lib/bestiary/repo', () => ({ fetchSourceManifest }));
vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => ({ auth: { getSession } }),
}));
vi.mock('./paidContentRepo', () => ({ fetchPaidContentJson }));
vi.mock('./paidContentCache', () => ({
  readAllCachedBundles,
  writeCachedBundle,
  purgeCachedBundles,
}));

async function importLoader() {
  vi.resetModules();
  return import('./loadPaidContent');
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pk_test');
  registerContentBundle.mockClear();
  fetchSourceManifest.mockReset();
  fetchPaidContentJson.mockReset();
  readAllCachedBundles.mockReset().mockResolvedValue([]);
  writeCachedBundle.mockClear();
  purgeCachedBundles.mockClear();
  getSession.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('loadPaidContent — gating', () => {
  it('ne fait RIEN pour un visiteur non connecté (aucun fetch, aucune fusion)', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { loadPaidContent } = await importLoader();

    const result = await loadPaidContent();

    expect(result).toEqual({ registered: [], added: 0 });
    expect(fetchSourceManifest).not.toHaveBeenCalled();
    expect(fetchPaidContentJson).not.toHaveBeenCalled();
    expect(registerContentBundle).not.toHaveBeenCalled();
  });

  it('ne fait RIEN pour une session joueur anonyme (player_id présent)', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { app_metadata: { player_id: 'p1' } } } },
    });
    const { loadPaidContent } = await importLoader();

    const result = await loadPaidContent();

    expect(result).toEqual({ registered: [], added: 0 });
    expect(fetchSourceManifest).not.toHaveBeenCalled();
    expect(registerContentBundle).not.toHaveBeenCalled();
  });
});

describe('loadPaidContent — propriétaire entitlé', () => {
  it('fusionne un lot en cache à jour SANS téléchargement réseau', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { app_metadata: {} } } } });
    fetchSourceManifest.mockResolvedValue([
      { id: 's1', slug: 'companion', name: 'Le Compagnon', contentVersion: 2, isPaid: true },
      { id: 's0', slug: 'drs', name: 'Livre des règles', contentVersion: 1, isPaid: false },
    ]);
    readAllCachedBundles.mockResolvedValue([
      { slug: 'companion', contentVersion: 2, bundle: { ancestries: [{ id: 'x' }] } },
    ]);
    const { loadPaidContent } = await importLoader();

    const result = await loadPaidContent();

    expect(result.registered).toEqual(['companion']);
    expect(registerContentBundle).toHaveBeenCalledTimes(1);
    expect(fetchPaidContentJson).not.toHaveBeenCalled(); // Cache à jour → pas de réseau.
  });

  it('télécharge, fusionne et met en cache une source entitlée non cachée', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { app_metadata: {} } } } });
    fetchSourceManifest.mockResolvedValue([
      { id: 's1', slug: 'companion', name: 'Le Compagnon', contentVersion: 5, isPaid: true },
    ]);
    readAllCachedBundles.mockResolvedValue([]);
    fetchPaidContentJson.mockResolvedValue({ paths: [{ id: 'voie-payante' }] });
    const { loadPaidContent } = await importLoader();

    const result = await loadPaidContent();

    // La version cible est passée au fetch pour le cache-busting d'URL (`?version=`, cf. paidContentRepo).
    expect(fetchPaidContentJson).toHaveBeenCalledWith('companion', 5);
    expect(result.registered).toEqual(['companion']);
    expect(writeCachedBundle).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'companion', contentVersion: 5 }),
    );
  });

  it('ignore silencieusement une source entitlée sans content.json (null)', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { app_metadata: {} } } } });
    fetchSourceManifest.mockResolvedValue([
      { id: 's2', slug: 'bestiaire', name: 'Le Bestiaire', contentVersion: 1, isPaid: true },
    ]);
    readAllCachedBundles.mockResolvedValue([]);
    fetchPaidContentJson.mockResolvedValue(null); // Pas de lot de construction.
    const { loadPaidContent } = await importLoader();

    const result = await loadPaidContent();

    expect(result.registered).toEqual([]);
    expect(registerContentBundle).not.toHaveBeenCalled();
    expect(writeCachedBundle).not.toHaveBeenCalled();
  });
});

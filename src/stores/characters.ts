'use client';

/**
 * Store des personnages — **cloud-first sous une API synchrone** (PER-192).
 *
 * Depuis PER-192, Supabase fait foi pour les personnages possédés. Mais l'UI (la
 * fiche surtout) écrit par micro-modifications (« autosave par frappe ») via un
 * `upsert` **synchrone** : on conserve donc cette API. Le tableau `characters` en
 * mémoire reste la cible immédiate (réactivité + staging localStorage), et un
 * **flush débouncé** propage vers le cloud en arrière-plan, sous **verrou
 * optimiste** (`repo.updateCharacterRow`).
 *
 * Deux natures de personnages coexistent (fusion assumée, PER-192) :
 *  - **cloud** : présents dans `cloudVersions` (id → version chargée). Toute
 *    modification déclenche un flush débouncé ; un conflit de version pose
 *    `conflictId` (l'UI invite à recharger, cf. `CharacterSyncNotifier`).
 *  - **local-only** : hérités / anonymes / importés, pas encore téléversés
 *    (PER-193). Ils vivent en staging localStorage et ne sont **jamais** flushés
 *    automatiquement.
 *
 * `load()` récupère les persos cloud (RLS `owner_id`) et les **fusionne** avec le
 * staging local (cloud prioritaire par id, cf. `repo.mergeCharacters`).
 *
 * Garde-fou : sans variables d'env Supabase (mode 100 % local historique), le
 * store reste `unconfigured` et se comporte comme avant (localStorage seul).
 *
 * Hydratation : le middleware `persist` relit le staging localStorage au montage ;
 * `hasHydrated` gate l'UI le temps de cette relecture (évite un décalage SSR).
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { duplicateCharacter } from '@/lib/character/factory';
import {
  deleteCharacter,
  fetchCharacters,
  insertCharacter,
  mergeCharacters,
  updateCharacterRow,
} from '@/lib/character/repo';
import type { Character } from '@/lib/character/types';
import { migrateCharacter } from '@/lib/engine';

/** Délai d'inactivité avant flush cloud d'un personnage modifié (ms). */
const FLUSH_DELAY_MS = 900;

/** Cycle de vie du chargement cloud. `unconfigured` = env Supabase absente. */
export type CharactersStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured';

interface CharactersState {
  characters: Character[];
  /** Versions cloud chargées, par id. Un id présent ⇒ perso cloud. Non persisté. */
  cloudVersions: Record<string, number>;
  status: CharactersStatus;
  error: string | null;
  /**
   * Id du dernier personnage dont le flush a été **rejeté** par le verrou optimiste
   * (fiche modifiée ailleurs). `null` = aucun conflit en attente d'affichage.
   */
  conflictId: string | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;

  /** Charge les persos cloud et les fusionne au staging local. Idempotent, au montage. */
  load: () => Promise<void>;
  /** Ajoute ou remplace un personnage (par id) ; met à jour `updatedAt`. Flush cloud débouncé si cloud. */
  upsert: (character: Character) => void;
  /**
   * Commit d'un personnage neuf en fin de wizard : insertion cloud (si configuré)
   * puis ajout au cache. Sans Supabase, retombe sur un ajout local (staging). Lève
   * si l'insertion cloud échoue (le wizard conserve alors le brouillon).
   */
  commitNewCharacter: (character: Character) => Promise<Character>;
  /** Duplique un personnage existant ; retourne la copie (ou undefined). */
  duplicate: (id: string) => Character | undefined;
  /** Supprime un personnage (et sa ligne cloud le cas échéant). */
  remove: (id: string) => void;
  /**
   * Détache de leur campagne tous les personnages qui la référençaient
   * (`campaignId`/`playerId` → `null`). Miroir cache du `ON DELETE SET NULL` cloud
   * (déjà appliqué en base par la suppression de campagne) : on ne re-flushe donc
   * PAS. Déclenché par le store `campaigns` à la suppression d'une campagne.
   */
  detachFromCampaign: (campaignId: string) => void;
  /** Récupère un personnage par id. */
  getById: (id: string) => Character | undefined;
  /**
   * Importe un objet JSON quelconque : migration + validation, puis ajout LOCAL
   * (staging) avec un nouvel id si l'id existe déjà. Le téléversement cloud d'un
   * import relève de PER-193/182. Lève en cas de fichier invalide.
   */
  importCharacter: (raw: unknown) => Character;
  /** Force le flush immédiat de tous les personnages en attente (ex. avant fermeture d'onglet). */
  flushAll: () => void;
  /** Acquitte le conflit courant (referme le bandeau). */
  clearConflict: () => void;
}

const withTimestamp = (c: Character): Character => ({ ...c, updatedAt: new Date().toISOString() });

/** L'app est-elle branchée sur Supabase (variables d'env publiques présentes) ? */
function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export const useCharactersStore = create<CharactersState>()(
  persist(
    (set, get) => {
      // Minuteries de flush débouncé, par id. Vivent hors de l'état zustand (opaque
      // à React) : détail d'implémentation de la synchro cloud.
      const flushTimers = new Map<string, ReturnType<typeof setTimeout>>();
      // Chaîne d'écritures par id : sérialise les flushs d'un même personnage pour
      // qu'un flush lise toujours la version produite par le précédent. Sans cela,
      // deux flushs concurrents du MÊME client (réseau lent + édition rapide)
      // liraient la même version chargée et le second se rejetterait lui-même.
      const flushChains = new Map<string, Promise<void>>();

      /** Écrit un personnage cloud sous verrou optimiste ; pose `conflictId` si périmé. */
      const doFlush = async (id: string) => {
        const state = get();
        const character = state.characters.find((c) => c.id === id);
        const version = state.cloudVersions[id];
        if (!character || version === undefined) return; // local-only ou supprimé entre-temps
        try {
          const nextVersion = await updateCharacterRow(character, version);
          if (nextVersion === null) {
            // Verrou : la fiche a été modifiée ailleurs. On NE réécrit PAS (pas de
            // fusion auto) et on signale le conflit à l'UI.
            set({ conflictId: id });
            return;
          }
          set((s) => ({ cloudVersions: { ...s.cloudVersions, [id]: nextVersion } }));
        } catch (e) {
          set({ error: messageOf(e) });
        }
      };

      /** Enchaîne un flush après l'éventuel flush en cours pour le même id (sérialisation). */
      const enqueueFlush = (id: string) => {
        const previous = flushChains.get(id) ?? Promise.resolve();
        const next = previous.then(() => doFlush(id));
        flushChains.set(id, next);
      };

      /** (Ré)arme le flush débouncé d'un personnage cloud. No-op pour un perso local-only. */
      const scheduleFlush = (id: string) => {
        if (!isSupabaseConfigured()) return;
        if (!(id in get().cloudVersions)) return; // local-only : jamais de flush auto
        const existing = flushTimers.get(id);
        if (existing) clearTimeout(existing);
        flushTimers.set(
          id,
          setTimeout(() => {
            flushTimers.delete(id);
            enqueueFlush(id);
          }, FLUSH_DELAY_MS),
        );
      };

      return {
        characters: [],
        cloudVersions: {},
        status: 'idle',
        error: null,
        conflictId: null,
        hasHydrated: false,
        setHasHydrated: (value) => set({ hasHydrated: value }),

        load: async () => {
          if (!isSupabaseConfigured()) {
            set({ status: 'unconfigured' });
            return;
          }
          set({ status: 'loading', error: null });
          try {
            const loaded = await fetchCharacters();
            const cloud = loaded.map((l) => l.character);
            const cloudVersions: Record<string, number> = {};
            for (const l of loaded) cloudVersions[l.character.id] = l.version;
            set((s) => ({
              characters: mergeCharacters(cloud, s.characters),
              cloudVersions,
              status: 'ready',
              error: null,
            }));
          } catch (e) {
            set({ status: 'error', error: messageOf(e) });
          }
        },

        upsert: (character) => {
          const stamped = withTimestamp(character);
          set((state) => {
            const i = state.characters.findIndex((c) => c.id === stamped.id);
            if (i === -1) return { characters: [...state.characters, stamped] };
            const next = state.characters.slice();
            next[i] = stamped;
            return { characters: next };
          });
          scheduleFlush(stamped.id);
        },

        commitNewCharacter: async (character) => {
          const stamped = withTimestamp(character);
          if (!isSupabaseConfigured()) {
            // Mode local dégradé : le perso reste en staging localStorage.
            set((s) => ({ characters: [...s.characters, stamped] }));
            return stamped;
          }
          const version = await insertCharacter(stamped);
          set((s) => ({
            characters: [...s.characters, stamped],
            cloudVersions: { ...s.cloudVersions, [stamped.id]: version },
          }));
          return stamped;
        },

        duplicate: (id) => {
          const source = get().characters.find((c) => c.id === id);
          if (!source) return undefined;
          const copy = duplicateCharacter(source);
          set((state) => ({ characters: [...state.characters, copy] }));
          // Si la source est cloud, la copie l'est aussi : insertion en arrière-plan
          // (l'appelant a déjà la copie pour son retour). En cas d'échec, la copie
          // reste en staging local (récupérable au prochain chargement/téléversement).
          if (isSupabaseConfigured() && id in get().cloudVersions) {
            void insertCharacter(copy)
              .then((version) =>
                set((s) => ({ cloudVersions: { ...s.cloudVersions, [copy.id]: version } })),
              )
              .catch((e) => set({ error: messageOf(e) }));
          }
          return copy;
        },

        remove: (id) => {
          const wasCloud = isSupabaseConfigured() && id in get().cloudVersions;
          const timer = flushTimers.get(id);
          if (timer) {
            clearTimeout(timer);
            flushTimers.delete(id);
          }
          set((state) => {
            const cloudVersions = { ...state.cloudVersions };
            delete cloudVersions[id];
            return { characters: state.characters.filter((c) => c.id !== id), cloudVersions };
          });
          if (wasCloud) void deleteCharacter(id).catch((e) => set({ error: messageOf(e) }));
        },

        detachFromCampaign: (campaignId) =>
          set((state) => ({
            characters: state.characters.map((c) =>
              c.campaignId === campaignId
                ? withTimestamp({ ...c, campaignId: null, playerId: null })
                : c,
            ),
          })),

        getById: (id) => get().characters.find((c) => c.id === id),

        importCharacter: (raw) => {
          const character = migrateCharacter(raw); // lève si invalide
          const exists = get().characters.some((c) => c.id === character.id);
          const toAdd = exists ? { ...character, id: crypto.randomUUID() } : character;
          set((state) => ({ characters: [...state.characters, withTimestamp(toAdd)] }));
          return toAdd;
        },

        flushAll: () => {
          for (const [id, timer] of flushTimers) {
            clearTimeout(timer);
            flushTimers.delete(id);
            enqueueFlush(id);
          }
        },

        clearConflict: () => set({ conflictId: null }),
      };
    },
    {
      name: 'cof2-characters',
      storage: createJSONStorage(() => localStorage),
      // Seuls les personnages sont persistés en staging (les versions cloud et
      // l'état de synchro sont reconstruits par `load()`).
      partialize: (state) => ({ characters: state.characters }),
      // À chaque relecture du staging, on migre les personnages vers le schéma
      // courant (PRD §7), en conservant l'original si la migration échoue.
      merge: (persisted, current) => {
        const stored = (persisted as { characters?: unknown[] } | undefined)?.characters;
        const characters = Array.isArray(stored)
          ? stored.map((raw) => {
              try {
                return migrateCharacter(raw);
              } catch {
                return raw as Character;
              }
            })
          : current.characters;
        return { ...current, characters };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

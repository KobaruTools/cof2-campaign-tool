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
  bindForUpload,
  deleteCharacter,
  fetchCharacters,
  insertCharacter,
  isUniqueViolation,
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
  /**
   * Réclame une fiche NON attribuée de sa campagne pour un joueur (PER-196) :
   * pose `playerId` et écrit **immédiatement** en base (hors flush débouncé, pour
   * un retour direct succès/conflit). La fiche doit avoir été chargée depuis le
   * cloud (présente dans `cloudVersions`). Le trigger `enforce_player_character_scope`
   * (migration 0004) n'autorise cette transition (`player_id` null → soi) que sur
   * une fiche non attribuée de la campagne du joueur. Lève si Supabase est absent,
   * si la fiche est introuvable/non chargée, ou en cas de conflit de version
   * (fiche déjà réclamée/modifiée ailleurs → pose aussi `conflictId`).
   */
  claim: (id: string, playerId: string) => Promise<void>;
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
   * Importe un objet JSON quelconque : migration + validation, nouvel id si l'id
   * existe déjà, puis enregistrement. Le `binding` optionnel (PER-182) force les
   * clés étrangères du personnage importé (campagne + joueur cibles résolus par
   * l'UI) ; sans lui, les FK du fichier sont conservées.
   *
   * Enregistrement (PER-182, aligné sur le wizard `commitNewCharacter`) : **quand
   * Supabase est configuré, l'import crée immédiatement une ligne cloud** (avec ses
   * FK et `version` initialisée) — un perso rattaché à une campagne/un joueur est
   * donc une vraie ligne DB, pas un « split-brain » local. Sans Supabase (mode local
   * historique), retombe sur un ajout local (staging). Async ⇒ **lève** si l'insertion
   * cloud échoue (l'UI conserve le brouillon et affiche l'erreur) ou si le fichier est
   * invalide. En cas de collision d'`id` en base (rare), régénère un id et réessaie.
   */
  importCharacter: (
    raw: unknown,
    binding?: { campaignId: string | null; playerId: string | null },
  ) => Promise<Character>;
  /**
   * Téléverse un personnage LOCAL (staging) vers le cloud (PER-193) : l'affecte à
   * la campagne cible choisie (`campaignId`, `null` = « Non attribué »), conserve le
   * joueur si le perso reste dans sa campagne (sinon le remet à `null`, cf.
   * `bindForUpload` — PER-182), l'insère en base puis le **promeut** en
   * perso cloud (ajout à `cloudVersions`) — le blob reste en cache localStorage,
   * aucune suppression n'a lieu (transition sans perte). No-op si déjà cloud ou
   * introuvable. En cas de collision d'`id` (PK globale), régénère un id et
   * réessaie une fois. Lève si Supabase n'est pas configuré ou si l'insertion
   * échoue (l'UI conserve alors le perso en local et affiche l'erreur).
   */
  uploadToCloud: (id: string, campaignId: string | null) => Promise<void>;
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

        claim: async (id, playerId) => {
          if (!isSupabaseConfigured()) {
            throw new Error('Synchronisation cloud indisponible.');
          }
          const state = get();
          const character = state.characters.find((c) => c.id === id);
          const version = state.cloudVersions[id];
          if (!character || version === undefined) {
            throw new Error('Fiche introuvable ou non chargée depuis le cloud.');
          }
          const claimed = withTimestamp({ ...character, playerId });
          const nextVersion = await updateCharacterRow(claimed, version);
          if (nextVersion === null) {
            // Verrou optimiste : la fiche a changé côté serveur (déjà réclamée ou
            // éditée). On ne réécrit pas et on signale le conflit à l'UI.
            set({ conflictId: id });
            throw new Error('Cette fiche a changé entre-temps. Recharge la page.');
          }
          set((s) => ({
            characters: s.characters.map((c) => (c.id === id ? claimed : c)),
            cloudVersions: { ...s.cloudVersions, [id]: nextVersion },
          }));
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

        importCharacter: async (raw, binding) => {
          const character = migrateCharacter(raw); // lève si invalide
          const exists = get().characters.some((c) => c.id === character.id);
          const withId = exists ? { ...character, id: crypto.randomUUID() } : character;
          // FK résolues par l'UI d'import (PER-182) ; à défaut, on garde celles du fichier.
          const bound = binding
            ? { ...withId, campaignId: binding.campaignId, playerId: binding.playerId }
            : withId;
          let stamped = withTimestamp(bound);
          // Mode local historique (sans Supabase) : ajout en staging, pas de cloud.
          if (!isSupabaseConfigured()) {
            set((state) => ({ characters: [...state.characters, stamped] }));
            return stamped;
          }
          // Connecté : création immédiate d'une ligne cloud (comme le wizard). En cas
          // de collision d'`id` en base (PK globale, très rare avec un UUID mais un blob
          // importé pourrait partager l'id d'une ligne existante), on régénère un id et
          // on réessaie une fois.
          let version: number;
          try {
            version = await insertCharacter(stamped);
          } catch (e) {
            if (!isUniqueViolation(e)) throw e;
            stamped = { ...stamped, id: crypto.randomUUID() };
            version = await insertCharacter(stamped);
          }
          set((state) => ({
            characters: [...state.characters, stamped],
            cloudVersions: { ...state.cloudVersions, [stamped.id]: version },
          }));
          return stamped;
        },

        uploadToCloud: async (id, campaignId) => {
          if (!isSupabaseConfigured()) {
            throw new Error('Synchronisation cloud indisponible.');
          }
          const state = get();
          if (id in state.cloudVersions) return; // déjà synchronisé
          const original = state.characters.find((c) => c.id === id);
          if (!original) return;
          let bound = bindForUpload(original, campaignId, new Date().toISOString());
          let version: number;
          try {
            version = await insertCharacter(bound);
          } catch (e) {
            // Collision de clé primaire (id déjà pris, très rare avec des UUID) :
            // on régénère un id et on réessaie une fois, pour ne jamais bloquer
            // l'adoption d'un perso local (filet « sans perte »).
            if (!isUniqueViolation(e)) throw e;
            bound = { ...bound, id: crypto.randomUUID() };
            version = await insertCharacter(bound);
          }
          set((s) => {
            // Remplace l'ancienne ligne par la version téléversée (l'id peut avoir
            // changé en cas de collision) et bascule l'entrée de `cloudVersions`.
            const characters = s.characters.map((c) => (c.id === id ? bound : c));
            const cloudVersions = { ...s.cloudVersions };
            delete cloudVersions[id];
            cloudVersions[bound.id] = version;
            return { characters, cloudVersions };
          });
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

'use client';

/**
 * Store des personnages — zustand + middleware `persist` (localStorage),
 * sauvegarde automatique (PRD décision #6). 100 % client (phase 1).
 *
 * Hydratation : sous Next (App Router), le premier rendu est côté serveur où
 * `localStorage` n'existe pas. On expose `hasHydrated` pour que l'UI affiche un
 * état de chargement tant que le store n'a pas relu le localStorage, évitant
 * tout décalage d'hydratation.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { duplicateCharacter } from '@/lib/character/factory';
import type { Character } from '@/lib/character/types';
import { migrateCharacter } from '@/lib/engine';

interface CharactersState {
  characters: Character[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;

  /** Ajoute ou remplace un personnage (par id) ; met à jour `updatedAt`. */
  upsert: (character: Character) => void;
  /** Duplique un personnage existant ; retourne la copie (ou undefined). */
  duplicate: (id: string) => Character | undefined;
  /** Supprime un personnage. */
  remove: (id: string) => void;
  /**
   * Supprime tous les personnages rattachés à une campagne (cascade de
   * suppression déclenchée par le store `campaigns` — PER-179).
   */
  removeByCampaign: (campaignId: string) => void;
  /** Récupère un personnage par id. */
  getById: (id: string) => Character | undefined;
  /**
   * Importe un objet JSON quelconque : migration + validation, puis ajout avec
   * un nouvel id si l'id existe déjà. Lève en cas de fichier invalide.
   */
  importCharacter: (raw: unknown) => Character;
}

const withTimestamp = (c: Character): Character => ({ ...c, updatedAt: new Date().toISOString() });

export const useCharactersStore = create<CharactersState>()(
  persist(
    (set, get) => ({
      characters: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      upsert: (character) =>
        set((state) => {
          const stamped = withTimestamp(character);
          const i = state.characters.findIndex((c) => c.id === stamped.id);
          if (i === -1) return { characters: [...state.characters, stamped] };
          const next = state.characters.slice();
          next[i] = stamped;
          return { characters: next };
        }),

      duplicate: (id) => {
        const source = get().characters.find((c) => c.id === id);
        if (!source) return undefined;
        const copy = duplicateCharacter(source);
        set((state) => ({ characters: [...state.characters, copy] }));
        return copy;
      },

      remove: (id) =>
        set((state) => ({ characters: state.characters.filter((c) => c.id !== id) })),

      removeByCampaign: (campaignId) =>
        set((state) => ({
          characters: state.characters.filter((c) => c.campaignId !== campaignId),
        })),

      getById: (id) => get().characters.find((c) => c.id === id),

      importCharacter: (raw) => {
        const character = migrateCharacter(raw); // lève si invalide
        const exists = get().characters.some((c) => c.id === character.id);
        const toAdd = exists ? { ...character, id: crypto.randomUUID() } : character;
        set((state) => ({ characters: [...state.characters, withTimestamp(toAdd)] }));
        return toAdd;
      },
    }),
    {
      name: 'cof2-characters',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ characters: state.characters }),
      // À chaque relecture du localStorage, on migre les personnages vers le
      // schéma courant (PRD §7). Le store ne le faisait qu'à l'import JSON :
      // un personnage créé sous un schéma antérieur arrivait donc sans les
      // champs récents (ex. `baseAbilities`/`ancestryChoices`). On migre
      // défensivement, en conservant l'original si la migration échoue (pas de
      // perte de données).
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

'use client';

/**
 * Buffs de groupe qu'un joueur a ÉCARTÉS DE SA PROPRE FICHE (PER-358).
 *
 * Un buff de groupe est posé par le MJ sur tout un camp, d'un geste. Un personnage peut vouloir s'en
 * passer — il n'écoute pas le barde, il refuse la bénédiction, ou l'effet le gêne (un bonus qui le
 * ferait sortir d'une contrainte de jeu). Ce renoncement lui est PERSONNEL : il ne touche ni l'état de
 * combat du MJ (dont la RLS fait l'auteur unique) ni la fiche de ses camarades. Rien n'est envoyé sur
 * le canal, rien n'est écrit en base — c'est une lecture locale de l'état diffusé.
 *
 * Volontairement NON persisté : un état de combat ne survit pas à la session, son renoncement non
 * plus. `syncPosed` purge d'ailleurs tout renoncement dont le buff n'est plus posé — si le MJ lève
 * puis repose le Chant des héros, c'est une NOUVELLE incantation, et elle s'applique à tout le monde
 * tant que le joueur ne s'en écarte pas de nouveau.
 */
import { create } from 'zustand';

import type { BeneficialEffectId } from '@/data/schema';

interface BuffOptOutState {
  /** Buffs écartés, par personnage. Absent/vide = le personnage subit tout ce que le MJ pose. */
  idsByCharacter: Record<string, BeneficialEffectId[]>;

  /**
   * Le joueur écarte ce buff de SA fiche (effet chiffré compris). Idempotent, et SANS RETOUR : se
   * raviser passe par le MJ, qui repose l'effet — comme pour tout le reste de l'état de combat.
   */
  waiveBuff: (characterId: string, id: BeneficialEffectId) => void;
  /**
   * Aligne les renoncements sur ce qui est RÉELLEMENT posé : un buff levé par le MJ n'a plus à
   * traîner ici. Même référence si rien ne change (appelée à chaque diffusion d'état de combat).
   */
  syncPosed: (characterId: string, posedIds: readonly string[]) => void;
}

export const useBuffOptOutStore = create<BuffOptOutState>()((set, get) => ({
  idsByCharacter: {},

  waiveBuff: (characterId, id) => {
    const current = get().idsByCharacter[characterId] ?? [];
    if (current.includes(id)) return;
    set((s) => ({ idsByCharacter: { ...s.idsByCharacter, [characterId]: [...current, id] } }));
  },

  syncPosed: (characterId, posedIds) => {
    const current = get().idsByCharacter[characterId];
    if (!current || current.length === 0) return;
    const posed = new Set(posedIds);
    const next = current.filter((id) => posed.has(id));
    if (next.length === current.length) return; // rien à purger : pas de rendu de plus
    set((s) => ({ idsByCharacter: { ...s.idsByCharacter, [characterId]: next } }));
  },
}));

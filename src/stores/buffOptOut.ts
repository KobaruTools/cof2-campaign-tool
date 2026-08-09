'use client';

/**
 * Buffs de groupe qu'un joueur a ÉCARTÉS DE SA PROPRE FICHE (PER-358).
 *
 * Un buff de groupe est posé par le MJ sur tout un camp, d'un geste. Un personnage peut vouloir s'en
 * passer — il n'écoute pas le barde, il refuse la bénédiction, ou l'effet le gêne (un bonus qui le
 * ferait sortir d'une contrainte de jeu). Ce renoncement lui est PERSONNEL : il ne touche que sa
 * ligne à lui, jamais la fiche de ses camarades.
 *
 * DEUX EFFETS, dans cet ordre :
 *  1. LOCAL et immédiat — le buff sort de sa fiche (badge, stats dérivées, interrupteur neutralisé)
 *     sans attendre le réseau. C'est une lecture de l'état diffusé, rien n'est écrit en base.
 *  2. ANNONCÉ au MJ (`BUFF_WAIVER_EVENT`) — le joueur ne peut pas écrire `campaign_combat` (RLS, MJ
 *     auteur unique), donc c'est le client du MJ qui retire l'état de ce seul combattant. Sans quoi
 *     la bande d'initiative continuerait d'afficher la puce, chez le MJ comme sur la fiche (elle lit
 *     le même état de combat) : le joueur aurait cliqué dans le vide.
 *
 * Volontairement NON persisté côté joueur : un état de combat ne survit pas à la session, son
 * renoncement non plus. `syncPosed` purge tout renoncement dont le buff n'est plus posé — quand le
 * retrait revient du MJ, l'entrée locale s'efface d'elle-même ; et si le MJ repose le Chant des
 * héros, c'est une NOUVELLE incantation, qui s'applique tant que le joueur ne s'en écarte pas.
 */
import { create } from 'zustand';

import { sessionSendFor } from '@/lib/session/sessionBridge';
import type { BuffWaiver } from '@/lib/session/buffWaiver';
import type { BeneficialEffectId } from '@/data/schema';

/** Événement de broadcast : « ce personnage écarte ce buff ». Traité par le seul client du MJ. */
export const BUFF_WAIVER_EVENT = 'buff-waiver';

interface BuffOptOutState {
  /** Buffs écartés, par personnage. Absent/vide = le personnage subit tout ce que le MJ pose. */
  idsByCharacter: Record<string, BeneficialEffectId[]>;

  /**
   * Le joueur écarte ce buff de SA fiche (effet chiffré compris) ET l'annonce au MJ, qui le retirera
   * de la bande d'initiative. Idempotent, et SANS RETOUR : se raviser passe par le MJ, qui repose
   * l'effet — comme pour tout le reste de l'état de combat.
   *
   * `campaignId` `null` = personnage hors campagne : renoncement purement local, rien à annoncer.
   */
  waiveBuff: (campaignId: string | null, characterId: string, id: BeneficialEffectId) => void;
  /**
   * Aligne les renoncements sur ce qui est RÉELLEMENT posé : un buff levé par le MJ n'a plus à
   * traîner ici. Même référence si rien ne change (appelée à chaque diffusion d'état de combat).
   */
  syncPosed: (characterId: string, posedIds: readonly string[]) => void;
}

export const useBuffOptOutStore = create<BuffOptOutState>()((set, get) => ({
  idsByCharacter: {},

  waiveBuff: (campaignId, characterId, id) => {
    const current = get().idsByCharacter[characterId] ?? [];
    if (current.includes(id)) return;
    set((s) => ({ idsByCharacter: { ...s.idsByCharacter, [characterId]: [...current, id] } }));
    if (!campaignId) return;
    const send = sessionSendFor(campaignId);
    const waiver: BuffWaiver = { characterId, buffId: id };
    if (send) send(BUFF_WAIVER_EVENT, waiver);
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

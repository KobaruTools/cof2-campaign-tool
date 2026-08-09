/**
 * RENONCEMENT d'un joueur à un buff de groupe (PER-358), tel qu'il voyage sur le canal de session.
 *
 * Le joueur écarte l'effet de SA fiche d'un clic, sans arbitrage du MJ (arbitrage du propriétaire).
 * Mais la RLS `campaign_combat` fait du MJ l'auteur UNIQUE de l'état de combat : le joueur ne peut
 * pas retirer lui-même la puce de la bande d'initiative. Il annonce donc son renoncement, et c'est le
 * client du MJ — auteur légitime — qui retire l'état de ce SEUL combattant. Aucune validation
 * humaine : ce n'est pas une demande, c'est une notification.
 *
 * Sans MJ connecté, rien ne remonte : la fiche du joueur reste juste (le buff n'y compte plus), la
 * bande d'initiative garde la puce jusqu'à la prochaine intervention du MJ. Dégradation acceptée —
 * un état de combat n'existe de toute façon qu'en séance.
 */
import { BENEFICIAL_EFFECT_IDS, type BeneficialEffectId } from '@/data/schema';

/** Ce qu'un joueur annonce : « cet effet ne s'applique plus à ce personnage ». */
export interface BuffWaiver {
  /** Personnage qui renonce — clé de combattant dans l'état de combat du MJ. */
  characterId: string;
  /** Buff de groupe écarté. */
  buffId: BeneficialEffectId;
}

const BENEFICIAL_ID_SET: ReadonlySet<string> = new Set(BENEFICIAL_EFFECT_IDS);

/**
 * Relit un renoncement reçu du canal. `null` si la charge utile est illisible ou porte un buff
 * inconnu (donnée d'une version plus récente, ou message forgé) : le MJ ne retire un état de sa
 * table que sur un ordre qu'il comprend.
 */
export function reviveBuffWaiver(payload: unknown): BuffWaiver | null {
  const raw = payload as { characterId?: unknown; buffId?: unknown } | null | undefined;
  if (!raw || typeof raw.characterId !== 'string' || raw.characterId === '') return null;
  if (typeof raw.buffId !== 'string' || !BENEFICIAL_ID_SET.has(raw.buffId)) return null;
  return { characterId: raw.characterId, buffId: raw.buffId as BeneficialEffectId };
}

/**
 * Helpers d'affichage d'un personnage dans les listes (résout les ids de
 * règles en libellés lisibles).
 */
import { ancestryById } from '@/data';
import type { Campaign } from '@/lib/campaign/types';
import type { Character, CharacterStatus } from './types';
import { characterClassName } from './classDisplay';
import { firearmsEffective } from './firearms';

export interface CharacterSummary {
  id: string;
  name: string;
  ancestry: string;
  /** Id du profil — pour l'icône et le code couleur (`ClassIcon`, `classColor`). */
  classId: string;
  characterClass: string;
  /**
   * Armes à feu EFFECTIVES (règle campagne ∧ choix perso, PER-185) — pilote le
   * nom affiché et l'icône « Arbalétrier » (`ClassIcon`).
   */
  firearmsAllowed: boolean;
  level: number;
  /** Campagne de rattachement, ou `null` si « Non attribué » (PER-180). */
  campaignId: string | null;
  /** Joueur attribué dans la campagne, ou `null` si non attribué (PER-184). */
  playerId: string | null;
  /** Statut dans la campagne (actif / mort / retiré) — pilote le split actifs/archivés (PER-183). */
  status: CharacterStatus;
  updatedAt: string;
}

const dash = '—';

function buildSummary(character: Character, firearmsAllowed: boolean): CharacterSummary {
  return {
    id: character.id,
    name: character.name || 'Sans nom',
    ancestry: ancestryById.get(character.ancestryId)?.name ?? dash,
    classId: character.classId,
    characterClass: characterClassName(character, dash, firearmsAllowed),
    firearmsAllowed,
    level: character.level,
    campaignId: character.campaignId,
    playerId: character.playerId,
    status: character.status,
    updatedAt: character.updatedAt,
  };
}

/**
 * Résumé d'un personnage HORS contexte de campagne : l'autorisation des armes à
 * feu suit le seul snapshot du personnage (comportement historique). Arité 1 —
 * utilisable en `characters.map(summarize)`. Pour un nom d'affichage tenant compte
 * de la règle de campagne (Arquebusier ↔ Arbalétrier), voir `summarizeInCampaign`.
 */
export function summarize(character: Character): CharacterSummary {
  return buildSummary(character, firearmsEffective(character, null));
}

/**
 * Résumé tenant compte de la campagne de rattachement (`null`/`undefined` si
 * « Non attribué ») : le nom affiché et l'icône suivent l'autorisation EFFECTIVE
 * des armes à feu (règle campagne ∧ choix perso, PER-185).
 */
export function summarizeInCampaign(
  character: Character,
  campaign: Campaign | null | undefined,
): CharacterSummary {
  return buildSummary(character, firearmsEffective(character, campaign));
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

/** Slug de nom de fichier pour l'export JSON. */
export function fileSlug(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'personnage';
}

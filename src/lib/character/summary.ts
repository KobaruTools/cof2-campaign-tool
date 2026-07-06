/**
 * Helpers d'affichage d'un personnage dans les listes (résout les ids de
 * règles en libellés lisibles).
 */
import { ancestryById } from '@/data';
import type { Character, CharacterStatus } from './types';
import { characterClassName } from './classDisplay';

export interface CharacterSummary {
  id: string;
  name: string;
  ancestry: string;
  /** Id du profil — pour l'icône et le code couleur (`ClassIcon`, `classColor`). */
  classId: string;
  characterClass: string;
  /** Armes à feu autorisées dans l'univers — pilote l'icône « Arbalétrier » (`ClassIcon`). */
  firearmsAllowed: boolean;
  level: number;
  /** Campagne de rattachement, ou `null` si « Non attribué » (PER-180). */
  campaignId: string | null;
  /** Statut dans la campagne (actif / mort / retiré) — pilote le split actifs/archivés (PER-183). */
  status: CharacterStatus;
  updatedAt: string;
}

const dash = '—';

export function summarize(character: Character): CharacterSummary {
  return {
    id: character.id,
    name: character.name || 'Sans nom',
    ancestry: ancestryById.get(character.ancestryId)?.name ?? dash,
    classId: character.classId,
    characterClass: characterClassName(character, dash),
    firearmsAllowed: character.firearmsAllowed,
    level: character.level,
    campaignId: character.campaignId,
    status: character.status,
    updatedAt: character.updatedAt,
  };
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

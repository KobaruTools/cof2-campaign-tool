/**
 * Helpers d'affichage d'un personnage dans les listes (résout les ids de
 * règles en libellés lisibles).
 */
import { ancestryById, classById } from '@/data';
import type { Character } from './types';

export interface CharacterSummary {
  id: string;
  name: string;
  ancestry: string;
  characterClass: string;
  level: number;
  updatedAt: string;
}

const dash = '—';

export function summarize(character: Character): CharacterSummary {
  return {
    id: character.id,
    name: character.name || 'Sans nom',
    ancestry: ancestryById.get(character.ancestryId)?.name ?? dash,
    characterClass: classById.get(character.classId)?.name ?? dash,
    level: character.level,
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

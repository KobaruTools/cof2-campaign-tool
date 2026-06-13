/**
 * Helpers d'affichage d'un personnage dans les listes (résout les ids de
 * règles en libellés lisibles).
 */
import { peupleParId, profilParId } from '@/data';
import type { Character } from './types';

export interface CharacterSummary {
  id: string;
  name: string;
  peuple: string;
  profil: string;
  niveau: number;
  updatedAt: string;
}

const tiret = '—';

export function summarize(character: Character): CharacterSummary {
  return {
    id: character.id,
    name: character.name || 'Sans nom',
    peuple: peupleParId.get(character.peupleId)?.nom ?? tiret,
    profil: profilParId.get(character.profilId)?.nom ?? tiret,
    niveau: character.niveau,
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

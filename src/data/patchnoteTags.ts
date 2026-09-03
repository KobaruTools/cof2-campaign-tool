/**
 * Tags des patchnotes joueur (PER-460) : zones du site concernées par une
 * entrée. Découpage aligné sur les « zones concernées » du futur formulaire
 * de retour utilisateur (PER-465) pour rester cohérent d'un bout à l'autre
 * de l'app.
 */
export type PatchnoteTagId =
  | 'character-sheet'
  | 'creation-levelup'
  | 'codex'
  | 'bestiary'
  | 'gm-screen'
  | 'campaign'
  | 'reference-sheet'
  | 'account'
  | 'other';

export interface PatchnoteTagDef {
  id: PatchnoteTagId;
  label: string;
  color: string;
}

/** Ordre d'affichage stable des groupes de tags dans une entrée. */
export const PATCHNOTE_TAG_ORDER: PatchnoteTagId[] = [
  'character-sheet',
  'creation-levelup',
  'codex',
  'bestiary',
  'gm-screen',
  'campaign',
  'reference-sheet',
  'account',
  'other',
];

export const PATCHNOTE_TAGS: Record<PatchnoteTagId, PatchnoteTagDef> = {
  'character-sheet': { id: 'character-sheet', label: 'Fiche perso', color: '#5B8DEF' },
  'creation-levelup': { id: 'creation-levelup', label: 'Création & montée', color: '#4CAF6D' },
  codex: { id: 'codex', label: 'Codex', color: '#9B6BD9' },
  bestiary: { id: 'bestiary', label: 'Bestiaire', color: '#C9793D' },
  'gm-screen': { id: 'gm-screen', label: 'Écran MJ', color: '#E0575A' },
  campaign: { id: 'campaign', label: 'Campagne', color: '#3FB6AE' },
  'reference-sheet': { id: 'reference-sheet', label: 'Aide-mémoire', color: '#D9A63B' },
  account: { id: 'account', label: 'Compte', color: '#6C7BD8' },
  other: { id: 'other', label: 'Autre', color: '#8A8F98' },
};

export function isPatchnoteTagId(value: string): value is PatchnoteTagId {
  return Object.prototype.hasOwnProperty.call(PATCHNOTE_TAGS, value);
}

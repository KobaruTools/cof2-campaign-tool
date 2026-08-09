import { DRAGON_ELEMENTS, dragonElementById, type DragonElement } from '@/data/dragon-elements';
import type { Feature } from '@/data/schema';
import { getOptionSelections } from './choices';
import type { Character } from './types';

/**
 * DÉCLINAISON D'UNE CAPACITÉ SELON UNE COULEUR DE DRAGON (PER-74).
 *
 * Le livre écrit la voie du chevalier dragon « à partir des symboles liés au dragon rouge, mais elle
 * peut évidemment être déclinée pour d'autres couleurs » (p. 147). Ses capacités portent donc des
 * TOKENS de déclinaison dans leur `name`/`richText`/libellés, résolus ici contre la couleur du drake
 * retenue au rang 5 de la voie du cavalier (`Feature.elementFromChoice`).
 *
 * Module PUR : aucun accès au store, aucune dépendance React. Deux surfaces distinctes, à ne pas
 * confondre :
 *  - `resolveFeatureElement` → l'élément EFFECTIVEMENT choisi, ou `null`. C'est la porte de la
 *    MÉCANIQUE : sans choix, pas de RD, pas de bonus de DM (pas de repli sur le feu).
 *  - `declineText` → texte prêt à afficher. Sans élément, il retombe sur le ROUGE, c'est-à-dire sur
 *    le texte tel qu'IMPRIMÉ dans le livre : un token brut à l'écran serait un bug d'affichage.
 */

/** Couleur dans laquelle le livre écrit la voie (p. 147) — repli d'AFFICHAGE, jamais de mécanique. */
const PRINTED_ELEMENT: DragonElement = DRAGON_ELEMENTS[0];

/**
 * Élément draconique effectivement retenu pour cette capacité, ou `null` si la capacité n'est pas
 * déclinable (`elementFromChoice` absent) ou si le joueur n'a pas encore choisi de couleur (choix
 * « à faire » orange). Un id inconnu (donnée obsolète après renommage) est traité comme absent.
 */
export function resolveFeatureElement(
  character: Character,
  feature: Pick<Feature, 'elementFromChoice'>,
): DragonElement | null {
  const from = feature.elementFromChoice;
  if (!from) return null;
  const chosen = getOptionSelections(character, from.choiceFeatureId, from.choiceIndex)[0];
  return (chosen ? dragonElementById.get(chosen) : undefined) ?? null;
}

/** Tokens reconnus → forme fléchie correspondante de l'élément. Source unique du vocabulaire. */
const TOKEN_FIELDS: Record<string, keyof DragonElement> = {
  '%color%': 'color',
  '%noun%': 'noun',
  '%of%': 'of',
  '%toThe%': 'toThe',
  '%theNoun%': 'theNoun',
  '%breathAdj%': 'breathAdj',
  '%breathPhrase%': 'breathPhrase',
  '%swordAdj%': 'swordAdj',
  '%swordVerbPhrase%': 'swordVerbPhrase',
  '%primordialNoun%': 'primordialNoun',
  '%primordialOf%': 'primordialOf',
};

/**
 * ÉPITHÈTE DE COULEUR facultative, à coller derrière un nom : « Drake%colorSuffix% » → « Drake bleu »,
 * ou « Drake » tout court tant qu'aucune couleur n'est retenue.
 *
 * C'est le SEUL token à repli VIDE, et il lui en faut un : contrairement à la prose de la voie — que le
 * livre imprime bel et bien en rouge, ce qui justifie d'y retomber —, aucune source ne nomme la couleur
 * du drake. Retomber sur « rouge » y affirmerait un choix que le joueur n'a pas fait.
 */
const COLOR_SUFFIX_TOKEN = '%colorSuffix%';

const TOKEN_RE = new RegExp([...Object.keys(TOKEN_FIELDS), COLOR_SUFFIX_TOKEN].join('|'), 'g');

/**
 * Marqueur de BRANCHE élémentaire en tête de ligne (PER-74) : `- %branch:fire%Feu : …`. Le livre
 * décrit d'un bloc les quatre formes de la Métamorphose élémentaire (p. 157), mais un personnage
 * n'en a qu'une : lire les trois autres au milieu de la sienne coûte plus qu'elles n'apprennent.
 * La puce, le tiret ou l'indentation qui précèdent le marqueur sont conservés.
 */
const BRANCH_RE = /^([ \t]*(?:[-•*][ \t]*)?)%branch:([a-zA-Z-]+)%[ \t]*/;

/** En-tête de la note qui recueille les branches NON retenues. */
const OTHER_BRANCHES_NOTE = 'Note — autres formes, non retenues :';

/**
 * Réduit un texte à branches à la SEULE branche de `element`, les autres étant rejetées en note à la
 * fin. Sans élément retenu (choix non fait, capacité non déclinable), rien n'est filtré : on affiche
 * le texte du livre au complet, marqueurs retirés — cacher trois branches sur la foi d'un repli
 * arbitraire affirmerait un choix que le joueur n'a pas fait.
 *
 * Un texte sans marqueur traverse INCHANGÉ (même référence).
 */
function keepElementBranch(value: string, element: DragonElement | null | undefined): string {
  if (!value.includes('%branch:')) return value;
  const kept: string[] = [];
  const others: string[] = [];
  for (const line of value.split('\n')) {
    const m = BRANCH_RE.exec(line);
    if (!m) {
      kept.push(line);
      continue;
    }
    const stripped = m[1] + line.slice(m[0].length);
    // Sans élément retenu, toutes les branches restent en place (texte imprimé).
    if (!element || m[2] === element.id) kept.push(stripped);
    else others.push(stripped);
  }
  if (others.length === 0) return kept.join('\n');
  return `${kept.join('\n')}\n\n${OTHER_BRANCHES_NOTE}\n${others.join('\n')}`;
}

/**
 * Remplace les tokens de déclinaison d'un texte par les formes fléchies de `element`. `element`
 * `null`/absent → repli sur le ROUGE (le texte imprimé du livre), jamais sur un token brut ; seul
 * `%colorSuffix%` s'efface alors (cf. ci-dessus). Une chaîne sans token est renvoyée TELLE QUELLE
 * (même référence) : appelable sans condition sur n'importe quel texte, capacités non déclinables
 * comprises.
 */
export function declineText(value: string, element: DragonElement | null | undefined): string {
  if (!value.includes('%')) return value;
  const el = element ?? PRINTED_ELEMENT;
  // Les branches sont triées AVANT la substitution : le texte d'une branche peut lui-même porter des
  // tokens (`%noun%`), et il n'y a aucune raison de les résoudre sur des lignes qu'on va écarter.
  return keepElementBranch(value, element).replace(TOKEN_RE, (token) =>
    token === COLOR_SUFFIX_TOKEN ? (element ? ` ${element.color}` : '') : el[TOKEN_FIELDS[token]],
  );
}

/**
 * Décline `value` pour la capacité `feature` du personnage — raccourci des deux appels ci-dessus,
 * pour les points de consommation qui n'ont pas besoin de l'élément lui-même (libellés d'effets,
 * nom affiché d'une capacité).
 */
export function declineForFeature(
  character: Character,
  feature: Pick<Feature, 'elementFromChoice'>,
  value: string,
): string {
  if (!value.includes('%')) return value;
  return declineText(value, resolveFeatureElement(character, feature));
}

/**
 * Nom AFFICHÉ d'une capacité, déclinée si elle l'est (« Résistance au feu » → « Résistance à la
 * foudre »). Miroir de `reskinnedItemName` (PER-181) pour les capacités : un helper appelé au point
 * d'affichage, plutôt qu'une copie du catalogue par personnage.
 */
export function declinedFeatureName(character: Character, feature: Feature): string {
  return declineForFeature(character, feature, feature.name);
}

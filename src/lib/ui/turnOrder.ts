/**
 * Progression dans l'ORDRE D'INITIATIVE du tracker de combat (PER-299) : à qui passe le tour, et
 * ce que devient le compteur de manche quand on reboucle.
 *
 * Extrait ici, pur et testable, sur le même modèle que `centerScroll.ts` (PER-297) et
 * `horizontalScroll.ts` (PER-298) : le composant ne fait que fournir l'état courant et APPLIQUER
 * le résultat (`onCurrentTurnKeyChange` + `onRoundNumberChange`).
 *
 * Toute la difficulté est dans les cas limites — roster vide, tour courant portant sur un
 * combattant retiré depuis, bouclage aux deux bouts — et dans la SYMÉTRIE exacte entre « tour
 * suivant » et « tour précédent » : reculer du premier vers le dernier doit défaire ce que le
 * bouclage en avant avait fait au compteur de manche.
 */

/** Sens de progression dans l'ordre d'initiative : +1 = tour suivant, −1 = tour précédent. */
export type TurnDirection = -1 | 1;

/** État courant du tour, tel que le tracker le détient. */
export interface TurnStepInput {
  /** Clés des combattants, DANS l'ordre d'initiative affiché. */
  keys: readonly string[];
  /** Clé du combattant dont c'est le tour (`null` = combat pas encore démarré). */
  currentKey: string | null;
  /** Compteur de manche courant (« Tour N », toujours ≥ 1). */
  roundNumber: number;
  /**
   * Clés sur lesquelles le tour ne s'ARRÊTE PAS (PER-302) : les créatures vaincues, dont le tour
   * n'existe plus. On les franchit sans s'y poser — le MJ peut toujours leur redonner la main au
   * clic sur leur bandeau d'initiative (PER-299). Un personnage joueur à 0 PV n'y figure jamais :
   * il est à terre / mourant (p. 220), pas mort, et son tour existe toujours.
   *
   * Le tour COURANT peut en faire partie sans rien bloquer : on ne fait que partir de sa place.
   */
  skipKeys?: readonly string[];
}

/** Tour à appliquer après un pas. */
export interface TurnStep {
  /** Clé du combattant qui prend le tour. */
  key: string;
  /** Compteur de manche après le pas — INCHANGÉ tant qu'on ne reboucle pas. */
  roundNumber: number;
}

/**
 * Combattant suivant / précédent dans l'ordre d'initiative, et manche qui en résulte.
 *
 * Règles :
 *  - roster vide → `null` (rien à faire, les boutons sont de toute façon désactivés) ;
 *  - tour courant ABSENT de l'ordre (combat pas démarré, ou combattant retiré depuis) → on
 *    DÉMARRE au bout d'où l'on vient : le premier en avant, le dernier en arrière. La manche
 *    n'est PAS touchée — le combat est déjà à sa manche courante, on ne fait que s'y placer ;
 *  - bouclage du dernier vers le premier → manche +1 (fin d'un tour de table) ;
 *  - bouclage du premier vers le dernier → manche −1, jamais en dessous de 1 (« Tour 0 » n'existe
 *    pas) : le MJ qui recule au-delà de la première manche reste sur « Tour 1 » ;
 *  - clés SAUTÉES (`skipKeys`, PER-302) → on continue dans le même sens jusqu'au premier combattant
 *    où l'on peut s'arrêter, en comptabilisant au passage le franchissement de manche. Si TOUTES
 *    les clés sont sautées (dernière créature du combat abattue), le saut est ignoré plutôt que de
 *    ne rendre aucun tour : le MJ garde un curseur à déplacer.
 */
export function stepTurn(
  { keys, currentKey, roundNumber, skipKeys }: TurnStepInput,
  direction: TurnDirection,
): TurnStep | null {
  const count = keys.length;
  if (count === 0) return null;
  const skip = new Set(skipKeys ?? []);
  // Garde-fou : au moins un combattant doit rester « arrêtable », sinon la recherche ci-dessous
  // ferait un tour de bande complet pour rien.
  if (keys.every((key) => skip.has(key))) skip.clear();
  const index = currentKey === null ? -1 : keys.indexOf(currentKey);
  // Démarrage depuis un tour courant inconnu : on se pose au bout d'où l'on vient — sur le premier
  // combattant arrêtable depuis ce bout — sans toucher à la manche (aucun tour de table bouclé).
  if (index < 0) {
    const fromEntryEnd = direction === 1 ? keys : [...keys].reverse();
    // Le `??` ne sert qu'au typage : le garde-fou ci-dessus garantit une clé arrêtable.
    return { key: fromEntryEnd.find((key) => !skip.has(key)) ?? fromEntryEnd[0], roundNumber };
  }
  let cursor = index;
  let round = roundNumber;
  // Au plus un tour de bande : la présence d'une clé arrêtable (garantie plus haut) borne la boucle.
  for (let steps = 0; steps < count; steps += 1) {
    cursor = (cursor + direction + count) % count;
    // Bouclage : en avant on retombe sur le premier, en arrière sur le dernier — dans les deux cas
    // on a franchi la frontière entre deux manches, y compris quand on ne fait que la traverser en
    // sautant des vaincus.
    if (direction === 1 && cursor === 0) round += 1;
    else if (direction === -1 && cursor === count - 1) round = Math.max(1, round - 1);
    if (!skip.has(keys[cursor])) return { key: keys[cursor], roundNumber: round };
  }
  // Inatteignable (une clé arrêtable existe toujours) : le tour ne bouge pas.
  return { key: keys[index], roundNumber };
}

/**
 * Touche pressée → sens de progression du tour, ou `null` si la touche ne pilote pas le tour.
 *
 * `N`/`P` (initiales de « next »/« previous », mêmes places sur AZERTY et QWERTY) et les flèches
 * horizontales, qui suivent le sens de la bande. La BARRE D'ESPACE est volontairement absente :
 * quand le focus est sur un bouton, l'espace le réactive — le tour avancerait deux fois sans que
 * rien ne l'explique.
 *
 * L'appelant filtre en amont les combinaisons à modificateur (Ctrl/⌘/Alt) : `Ctrl + N` ouvre une
 * fenêtre, ce n'est pas un raccourci de combat.
 */
export function turnDirectionFromKey(key: string): TurnDirection | null {
  switch (key) {
    case 'n':
    case 'N':
    case 'ArrowRight':
      return 1;
    case 'p':
    case 'P':
    case 'ArrowLeft':
      return -1;
    default:
      return null;
  }
}

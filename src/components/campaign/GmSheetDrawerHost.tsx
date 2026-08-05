'use client';

/**
 * Câblage URL du panneau latéral de fiche de l'écran de MJ (PER-258). Séparé du panneau
 * lui-même pour cantonner la lecture de `?sheet=` — seul point du tableau de bord qui
 * exige une frontière `Suspense` (précédent : le paramètre `?c=` du bestiaire).
 *
 * L'ouverture passe par l'URL, en VRAIE ancre (`navigation-real-anchors`) : le bouton
 * Retour du navigateur ferme donc le panneau, un rechargement le réouvre, et Ctrl/⌘+Clic
 * sur une carte ouvre l'écran de MJ déjà déplié dans un nouvel onglet.
 *
 * Ce composant ne rappelle PAS `useGmScreenCombat` : la page le fait déjà et une seconde
 * instance dupliquerait l'état du combat en cours. Tout lui arrive en props.
 */
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Character } from '@/lib/character/types';
import type { Campaign } from '@/lib/campaign/types';
import type { Player } from '@/lib/player/types';
import { useCharactersStore } from '@/stores/characters';
import { GmSheetDrawer } from './GmSheetDrawer';

/** Nom du paramètre d'URL portant le personnage affiché dans le panneau. */
export const SHEET_PARAM = 'sheet';

export interface GmSheetDrawerHostProps {
  /** Personnages ouvrables depuis la grille « Joueurs » (réclamés, de cette campagne). */
  characters: Character[];
  /** Campagne courante — autorisation effective des armes à feu dans le panneau. */
  campaign: Campaign | undefined;
  /** Joueur par id, pour le badge enrichi de l'en-tête du panneau. */
  playerById: Map<string, Player>;
}

export function GmSheetDrawerHost({
  characters,
  campaign,
  playerById,
}: GmSheetDrawerHostProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Chargement du store des personnages : un `?sheet=` d'un personnage pas encore
  // redescendu du cloud ne doit pas être pris pour un lien périmé (cf. `invalid` ci-dessous).
  const status = useCharactersStore((s) => s.status);

  const sheetId = searchParams.get(SHEET_PARAM);
  const character = sheetId ? characters.find((c) => c.id === sheetId) : undefined;
  const loading = status === 'idle' || status === 'loading';
  // Lien périmé (personnage supprimé, d'une autre campagne, non réclamé) : on ferme et on
  // retire le paramètre, SANS message d'erreur. Jamais tant que le chargement est en cours.
  const invalid = sheetId !== null && character === undefined && !loading;

  const closeSheet = () => {
    // `scroll: false` : impératif — fermer le panneau ne doit pas ramener le MJ en haut de
    // l'écran de MJ (le combat en cours peut être bien plus bas). On REMPLACE l'entrée
    // `?sheet=` plutôt que de revenir en arrière : un lien direct ne doit pas faire sortir
    // du site. Conséquence assumée : un Retour après fermeture manuelle repasse par
    // l'écran de MJ (déjà refermé) avant de quitter la page.
    router.replace(pathname, { scroll: false });
  };

  useEffect(() => {
    if (invalid) router.replace(pathname, { scroll: false });
  }, [invalid, router, pathname]);

  // Dernier personnage affiché, conservé le temps de l'animation de fermeture : sans lui, le
  // volet glisserait vers la droite vidé de son contenu (le paramètre d'URL disparaît AVANT la
  // fin de la transition). L'effet ne mémorise QUE des personnages présents, donc la valeur
  // survit à la fermeture ; elle n'est lue que dans ce cas.
  const [lastShown, setLastShown] = useState<Character | undefined>(undefined);
  useEffect(() => {
    // Synchronisation ponctuelle d'un instantané d'affichage (pas une boucle) : la condition
    // exclut l'absence de personnage, seul cas où l'effet pourrait se rappeler lui-même.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (character) setLastShown(character);
  }, [character]);
  const shown = sheetId === null ? lastShown : character;

  return (
    <GmSheetDrawer
      character={shown}
      campaign={campaign}
      player={shown?.playerId ? playerById.get(shown.playerId) ?? null : null}
      open={sheetId !== null && !invalid}
      onClose={closeSheet}
    />
  );
}

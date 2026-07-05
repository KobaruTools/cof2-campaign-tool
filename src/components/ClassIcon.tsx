'use client';

import { createContext, useContext, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { CLASS_ICON_PATHS } from '@/lib/ui/classIcons';
import { classColor } from '@/lib/ui/classColors';

/**
 * Profils dont l'ICÔNE change quand les armes à feu sont interdites dans l'univers
 * (`firearmsAllowed === false`) — pendant purement UI de `nameWithoutFirearms` /
 * `pathIdsWithoutFirearms` (variante « Arbalétrier », p. 62). Reste dans la couche
 * UI : les icônes sont hors règles CO2 (cf. `classIcons.ts`). La clé cible
 * (`'arbaletrier'`) n'est pas un id de profil, seulement une clé d'icône générée.
 */
const CLASS_ICON_ID_WITHOUT_FIREARMS: Record<string, string> = {
  arquebusier: 'arbaletrier',
};

/**
 * Id d'icône EFFECTIF d'un profil selon l'autorisation des armes à feu. L'arquebusier
 * « Arbalétrier » (armes à feu interdites) troque le tromblon contre une arbalète. La
 * COULEUR reste celle du profil réel (même profil, arme différente) — cf. `ClassIcon`.
 */
export function effectiveClassIconId(classId: string, firearmsAllowed: boolean | undefined): string {
  return firearmsAllowed === false ? (CLASS_ICON_ID_WITHOUT_FIREARMS[classId] ?? classId) : classId;
}

/**
 * Contexte d'autorisation des armes à feu pour l'affichage des icônes de profil.
 * Fournir la valeur une fois à la racine d'une surface MONO-personnage (fiche,
 * wizard) évite de propager `firearmsAllowed` à chaque `ClassIcon` imbriqué (voies
 * d'emprunt/hybridation comprises). Les listes MULTI-personnages (accueil, import)
 * passent au contraire la prop explicitement, chaque ligne ayant son propre réglage.
 *
 * Préparé pour la portée « campagne » à venir : la valeur fournie pourra dériver des
 * règles de la partie plutôt que du seul personnage, sans toucher aux `ClassIcon`.
 */
const FirearmsAllowedContext = createContext<boolean | undefined>(undefined);

export function FirearmsAllowedProvider({
  value,
  children,
}: {
  value: boolean | undefined;
  children: ReactNode;
}) {
  return <FirearmsAllowedContext.Provider value={value}>{children}</FirearmsAllowedContext.Provider>;
}

export interface ClassIconProps {
  /** Id du profil (ex. `'guerrier'`) — clé dans `CLASS_ICON_PATHS`. */
  classId: string;
  /**
   * Autorisation des armes à feu (variante « Arbalétrier »). Prioritaire sur le
   * contexte `FirearmsAllowedProvider` ; si absente, la valeur du contexte est
   * utilisée (undefined = armes à feu autorisées → icône standard).
   */
  firearmsAllowed?: boolean;
  /** Taille en pixels (carré). Défaut 24. */
  size?: number;
  /**
   * Couleur de l'icône (chaîne CSS). Par défaut, la teinte du profil issue de
   * `CLASS_COLORS`. Passer `'currentColor'` pour hériter de la couleur du texte.
   */
  color?: string;
  /** Texte alternatif accessible ; si absent, l'icône est décorative (aria-hidden). */
  title?: string;
  sx?: SxProps<Theme>;
}

/**
 * Icône d'illustration d'un profil (game-icons.net, cf. classIcons.ts). Rendue
 * en SVG inline pour pouvoir être recolorée via `currentColor`. Ne rend rien si
 * l'id est inconnu. L'arquebusier privé d'armes à feu (« Arbalétrier ») affiche une
 * arbalète, en conservant la couleur du profil.
 */
export function ClassIcon({ classId, firearmsAllowed, size = 24, color, title, sx }: ClassIconProps) {
  const contextFirearms = useContext(FirearmsAllowedContext);
  const effectiveFirearms = firearmsAllowed ?? contextFirearms;
  const iconId = effectiveClassIconId(classId, effectiveFirearms);
  const markup = CLASS_ICON_PATHS[iconId];
  if (!markup) return null;
  return (
    <Box
      component="svg"
      viewBox="0 0 512 512"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      sx={{
        display: 'inline-block',
        flexShrink: 0,
        width: size,
        height: size,
        // Couleur du profil RÉEL : l'arbalétrier garde la teinte de l'arquebusier.
        fill: color ?? classColor(classId),
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

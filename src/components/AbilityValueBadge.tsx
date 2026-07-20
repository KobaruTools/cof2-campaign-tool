'use client';

/**
 * Badge compact d'une caractéristique : son icône (teinte propre d'identité) surmontant
 * sa VALEUR, dont la couleur suit l'échelle fort/faible (`abilityTotalColor` — gris à ≤0,
 * teinte pleine à ≥+5). C'est le bloc réutilisable « icône + chiffre » à afficher PARTOUT
 * où les 7 caractéristiques apparaissent de façon synthétique : micro-fiche (import,
 * écran MJ, listing, réclamation), récapitulatif du wizard, etc.
 *
 * SEULE EXCEPTION délibérée : la section « Caractéristiques » de la fiche
 * (`AbilitiesGrid`), volontairement plus riche (édition, dé bonus, infobulle de détail),
 * qui garde son propre rendu. Tout le reste passe par ici pour rester cohérent — et pour
 * qu'une évolution du code couleur se propage d'un seul endroit.
 */
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { TypographyProps } from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import type { AbilityId } from '@/data/schema';
import { AbilityIcon } from '@/components/AbilityIcon';
import { abilityTotalColor, abilityTotalFontSize } from '@/lib/ui/abilityColors';

/** Modificateur toujours signé (« +0 », « +3 », « −1 ») — convention d'affichage d'une carac. */
const signed = (v: number) => (v >= 0 ? `+${v}` : `${v}`);

export interface AbilityValueBadgeProps {
  ability: AbilityId;
  /** Valeur affichée (total effectif) : teinte le chiffre et, si `scaleBase`, sa taille. */
  value: number;
  /** Taille de l'icône en px. Défaut 18. */
  iconSize?: number;
  /** Affiche le code de la carac (FOR/CON…) entre l'icône et le chiffre. Défaut `false`. */
  showCode?: boolean;
  /** Variante Typography du code (quand `showCode`). Défaut `subtitle1`. */
  codeVariant?: TypographyProps['variant'];
  /** Variante Typography du chiffre. Défaut `body2`. */
  valueVariant?: TypographyProps['variant'];
  /**
   * Taille de police de base du chiffre (ex. `'1.25rem'`) : si fournie, le chiffre
   * GRANDIT avec la valeur (`abilityTotalFontSize`) ; sinon, taille fixe du variant.
   */
  scaleBase?: string;
  /** Élément posé À CÔTÉ du chiffre, sur la même rangée (ex. badge de dé bonus). */
  adornment?: ReactNode;
  /** Style additionnel fusionné sur le conteneur (largeur, marges, `cursor`…). */
  sx?: SxProps<Theme>;
}

/**
 * Icône de la caractéristique + son chiffre teinté, empilés et centrés. Le conteneur
 * reste neutre (pas de bordure/fond) : c'est à l'appelant d'habiller la cellule s'il en
 * a besoin (ex. le carré bordé de la micro-fiche) ou de l'enrober d'une infobulle.
 */
export function AbilityValueBadge({
  ability,
  value,
  iconSize = 18,
  showCode = false,
  codeVariant = 'subtitle1',
  valueVariant = 'body2',
  scaleBase,
  adornment,
  sx,
}: AbilityValueBadgeProps) {
  // `lineHeight: 1` : supprime l'espace bas du line-box qui décentrerait le chiffre.
  const number = (
    <Typography
      variant={valueVariant}
      sx={{
        fontWeight: 'bold',
        lineHeight: 1,
        color: abilityTotalColor(value, ability),
        fontSize: scaleBase ? abilityTotalFontSize(value, scaleBase) : undefined,
      }}
    >
      {signed(value)}
    </Typography>
  );
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, ...sx }}>
      <AbilityIcon ability={ability} size={iconSize} title />
      {showCode && (
        <Typography variant={codeVariant} color="text.secondary" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
          {ability}
        </Typography>
      )}
      {adornment ? (
        <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
          {number}
          {adornment}
        </Stack>
      ) : (
        number
      )}
    </Box>
  );
}

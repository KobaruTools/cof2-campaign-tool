'use client';

import type { Ref } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import type { CharacterClass } from '@/data/schema';
import type { PriestVocation } from '@/lib/character/types';
import { classDisplayName } from '@/lib/character/classDisplay';
import { classColor } from '@/lib/ui/classColors';
import { ClassIcon } from '@/components/ClassIcon';
import { PriestVocationBadge } from '@/components/sheet/PriestVocationBadge';

interface CharacterIdentityLineProps {
  /** Nom du peuple (repli « Peuple à définir » si absent). */
  ancestryName?: string;
  /** Profil principal résolu (repli « Profil à définir » si absent). */
  characterClass?: CharacterClass;
  /** Règle « armes à feu » effective — pilote l'affichage arquebusier ⇄ arbalétrier. */
  firearmsAllowed: boolean;
  /** Vocation du prêtre spécialiste (badge d'identité) — absente pour les autres profils. */
  priestVocation?: PriestVocation | null;
  /** Niveau du personnage. */
  level: number;
  /**
   * Version compacte (icône + police réduites), pour le sous-header de la barre au
   * défilement (PER-239) — le bloc nom du corps de la fiche reste en taille normale.
   */
  dense?: boolean;
  /** Styles supplémentaires posés sur le conteneur (ex. `flexWrap`, positionnement). */
  sx?: SxProps<Theme>;
  /** Ref sur l'élément racine — sert de sentinelle au défilement (cf. en-tête de fiche). */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Ligne d'identité « {peuple} · {profil} · niveau {n} » du personnage : peuple, icône
 * + nom de profil teinté à la couleur de classe (gras), badge de vocation de prêtre,
 * puis niveau. Séparateurs « · » collés au texte comme dans le livre.
 *
 * Extraite pour partager une mise en forme STRICTEMENT identique entre l'en-tête de la
 * fiche (bloc nom + illustrations) et le sous-titre révélé dans la barre d'application
 * au défilement. Ne pas dupliquer ce markup ailleurs — réutiliser ce composant.
 */
export function CharacterIdentityLine({
  ancestryName,
  characterClass,
  firearmsAllowed,
  priestVocation,
  level,
  dense = false,
  sx,
  ref,
}: CharacterIdentityLineProps) {
  const textVariant = dense ? 'body2' : 'body1';
  return (
    <Stack
      ref={ref}
      direction="row"
      spacing={dense ? 0.5 : 0.75}
      sx={[{ alignItems: 'center', color: 'text.secondary' }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Typography variant={textVariant} component="span">
        {ancestryName ?? 'Peuple à définir'} ·
      </Typography>
      {characterClass && <ClassIcon classId={characterClass.id} size={dense ? 16 : 20} />}
      <Typography
        variant={textVariant}
        component="span"
        sx={{
          color: characterClass ? classColor(characterClass.id) : 'text.secondary',
          fontWeight: 600,
        }}
      >
        {characterClass ? classDisplayName(characterClass, firearmsAllowed) : 'Profil à définir'}
      </Typography>
      {/* Vocation du prêtre spécialiste (PER-218) : trait d'identité, visible d'un coup d'œil. */}
      <PriestVocationBadge vocation={priestVocation} />
      <Typography variant={textVariant} component="span">
        · niveau {level}
      </Typography>
    </Stack>
  );
}

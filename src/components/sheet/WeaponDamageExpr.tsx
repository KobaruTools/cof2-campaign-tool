'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { AbilityId } from '@/data/schema';
import type { Abilities } from '@/lib/engine';
import { DamageValue } from '@/components/DamageValue';
import { RichInline } from '@/components/sheet/FeatureRichText';

/**
 * Expression de DM d'arme (PER-141/PER-115), partagée par les cartes Attaque au contact et à
 * distance : le(s) dé(s) via `<DamageValue>` (qui gère `d3`, le `°` évolutif et le nombre de
 * dés), PUIS la ou les caractéristiques ajoutées, RÉSOLUES dynamiquement à leur valeur — meilleure
 * de plusieurs (FOR/AGI/VOL) le cas échéant, comme dans le texte des capacités. Pas de « + FOR »
 * figé. Une liste de caracs VIDE (arme à distance de base, p. 185) n'affiche que le dé.
 *
 * ⚠️ La grammaire de dé du rich-text ne gère pas `d3` → le dé passe par `DamageValue`, la carac
 * par `RichInline`.
 */
export function WeaponDamageExpr({
  dice,
  abilities,
  flat = 0,
  charAbilities,
  level,
}: {
  dice: string;
  abilities: AbilityId[];
  /** Bonus PLAT permanent ajouté aux DM (ex. Spécialisation du maître d'armes, PER-226). 0 = rien. */
  flat?: number;
  charAbilities: Abilities;
  level: number;
}) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap' }}>
      <DamageValue damage={dice} size={22} />
      {abilities.length > 0 && (
        <RichInline text={`+ [${abilities.join('/')}]`} abilities={charAbilities} level={level} rank={0} />
      )}
      {flat > 0 && (
        <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
          + {flat}
        </Typography>
      )}
    </Box>
  );
}

/** Indicateur court « Aucune arme » (aucune arme du mode considéré n'est en main). */
export function NoWeaponHint() {
  return (
    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
      Aucune arme
    </Typography>
  );
}

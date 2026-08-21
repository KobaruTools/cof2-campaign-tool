'use client';

/**
 * Grille des 7 caractéristiques en badges COMPACTS (icône + code + chiffre en taille par
 * défaut, `AbilityValueBadge`, code en `caption`), bordure fine + léger fond teinté, tooltip du
 * nom complet. SOURCE UNIQUE de ce style « micro-fiche » partagé par `CharacterPreviewCard`
 * (joueurs — écran de MJ, modale d'import, listing), `BestiaryStatBlock` en mode `dense`
 * (créatures — écran de MJ) et `GmScreenCompanionCard` (compagnons — écran de MJ) : les trois
 * maintenaient chacun leur propre copie « à parité visuelle » avant cette extraction.
 */
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { AbilityValueBadge } from '@/components/AbilityValueBadge';
import { BonusDieBadge } from '@/components/BonusDieBadge';
import { ABILITY_IDS, type AbilityId } from '@/data/schema';
import { ABILITY_NAMES } from '@/lib/ui/ability';

export interface AbilityCompactGridProps {
  /** Valeurs des 7 caractéristiques (déjà résolues) ; une entrée absente vaut 0. */
  abilities: Partial<Record<AbilityId, number>>;
  /** Caractéristiques bénéficiant d'un DÉ BONUS inné (double-d20) — absent = aucune. */
  bonusDieAbilities?: Set<AbilityId>;
}

export function AbilityCompactGrid({ abilities, bonusDieAbilities }: AbilityCompactGridProps) {
  return (
    <Box
      sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.75 }}
      data-glossary-shot="AbilityCompactGrid"
    >
      {ABILITY_IDS.map((id) => (
        <AppTooltip key={id} title={ABILITY_NAMES[id]}>
          <AbilityValueBadge
            ability={id}
            value={abilities[id] ?? 0}
            showCode
            codeVariant="caption"
            adornment={bonusDieAbilities?.has(id) ? <BonusDieBadge ability={id} size={12} /> : undefined}
            sx={{
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
              py: 0.5,
              cursor: 'help',
              bgcolor: (t) => alpha(t.palette.common.black, 0.15),
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />
        </AppTooltip>
      ))}
    </Box>
  );
}

'use client';

/**
 * Bloc de stats d'une CRÉATURE DU BESTIAIRE (entité `Creature`, stats FIXES du livre —
 * PER-237). DISTINCT de `CreatureStatBlock`, qui rend un `CreatureProfile` (créature
 * octroyée par une capacité, stats résolues contre un maître). Purement de l'affichage,
 * fidèle au bloc imprimé : identité (NC/taille/nature), grille des 7 caractéristiques
 * (dé bonus inné compris), DEF/PV/Init. avec leurs précisions, attaques et capacités
 * spéciales verbatim. Toute référence de page passe par `SourceRef`/`PageRefText`.
 */
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ABILITY_IDS, type Creature } from '@/data/schema';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import {
  CREATURE_NATURE_LABELS,
  CREATURE_SIZE_LABELS,
  creatureNcLabel,
} from '@/lib/ui/creature';
import type { DerivedStatId } from '@/lib/ui/derivedStats';
import { AppTooltip } from '@/components/AppTooltip';
import { AbilityValueBadge } from '@/components/AbilityValueBadge';
import { BonusDieBadge } from '@/components/BonusDieBadge';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { PageRefText, SourceRef } from '@/components/SourceRef';

/** Pilule d'identité neutre (NC, taille, nature) : même habillage discret que `SourceRef`. */
function MetaPill({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.75,
        py: 0.25,
        borderRadius: 1,
        lineHeight: 1,
        fontSize: '0.75rem',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        color: 'text.secondary',
        bgcolor: alpha(theme.palette.text.primary, 0.06),
        border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
      })}
    >
      {label && (
        <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: 0.3 }}>
          {label}
        </Box>
      )}
      {children}
    </Box>
  );
}

/** Bloc « icône cerclée + valeur (+ précision) » d'une stat dérivée fixe (DEF/PV/Init.). */
function StatChip({
  statId,
  value,
  note,
}: {
  statId: DerivedStatId;
  value: number;
  note?: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        alignItems: 'center',
        px: 0.75,
        py: 0.4,
        borderRadius: 0.75,
        border: 1,
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
      }}
    >
      <DerivedStatIcon statId={statId} size={22} title />
      <Box
        component="span"
        sx={{
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          fontSize: '0.9rem',
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 0.5,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
        {note && (
          <Box component="span" sx={{ fontWeight: 500, fontSize: '0.78rem', color: 'text.secondary' }}>
            ({note})
          </Box>
        )}
      </Box>
    </Stack>
  );
}

export interface BestiaryStatBlockProps {
  creature: Creature;
}

export function BestiaryStatBlock({ creature }: BestiaryStatBlockProps) {
  const nc = creatureNcLabel(creature);
  const bonusDice = new Set(creature.bonusDieAbilities ?? []);
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: { xs: 1.25, sm: 1.75 },
        // Fond NOIR (pas blanc) légèrement plus opaque que les autres blocs de la page,
        // avec le même flou d'arrière-plan que l'en-tête : améliore la lisibilité du bloc
        // de stats par-dessus l'illustration de fond.
        bgcolor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      {/* Identité : nom + NC/taille/nature + page source. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap', mb: 1 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700, letterSpacing: 0.5, mr: 'auto' }}>
          {creature.name}
        </Typography>
        <SourceRef page={creature.sourcePage} />
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75, mb: 1.25 }}>
        {nc && <MetaPill label="NC">{nc}</MetaPill>}
        {creature.size && <MetaPill>{CREATURE_SIZE_LABELS[creature.size]}</MetaPill>}
        {creature.nature?.map((n) => (
          <MetaPill key={n}>{CREATURE_NATURE_LABELS[n]}</MetaPill>
        ))}
      </Stack>

      {creature.description && (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', mb: 1.25, lineHeight: 1.55 }}>
          <PageRefText>{creature.description}</PageRefText>
        </Typography>
      )}

      {/* Grille des 7 caractéristiques (valeurs fixes) + dé bonus inné (double-d20). */}
      {creature.abilities && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: 0.5,
            mb: 1.25,
          }}
        >
          {ABILITY_IDS.map((id) => (
            <AppTooltip key={id} title={ABILITY_NAMES[id]}>
              <AbilityValueBadge
                ability={id}
                value={creature.abilities![id]}
                iconSize={16}
                showCode
                codeVariant="caption"
                valueVariant="caption"
                adornment={bonusDice.has(id) ? <BonusDieBadge ability={id} size={12} /> : undefined}
                sx={{ borderRadius: 0.5, py: 0.4, cursor: 'help', bgcolor: (t) => alpha(t.palette.text.primary, 0.05) }}
              />
            </AppTooltip>
          ))}
        </Box>
      )}

      {/* DEF / PV / Init. avec leurs précisions entre parenthèses (verbatim). */}
      {(creature.defense != null || creature.hitPoints != null || creature.initiative != null) && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 0.75, mb: 1.25 }}>
          {creature.defense != null && (
            <StatChip statId="defense" value={creature.defense} note={creature.defenseNote} />
          )}
          {creature.hitPoints != null && (
            <StatChip statId="maxHp" value={creature.hitPoints} note={creature.hitPointsNote} />
          )}
          {creature.initiative != null && (
            <StatChip statId="initiative" value={creature.initiative} note={creature.initiativeNote} />
          )}
        </Stack>
      )}

      {/* Attaques du bloc gras : mode (× nb) · bonus · portée · DM + effet accolé. */}
      {creature.attacks && creature.attacks.length > 0 && (
        <Stack spacing={0.5} sx={{ mb: 1.25 }}>
          {creature.attacks.map((atk, i) => (
            <Stack
              key={i}
              direction="row"
              spacing={0.75}
              sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.25 }}
            >
              <DerivedStatIcon statId={atk.range ? 'rangedAttack' : 'meleeAttack'} size={20} title />
              <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
                {atk.name}
                {atk.attackCount && atk.attackCount > 1 && (
                  <Box component="span" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                    {' '}
                    ({atk.attackCount} attaques)
                  </Box>
                )}
              </Typography>
              {atk.bonus && (
                <Typography component="span" variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {atk.bonus}
                </Typography>
              )}
              {atk.range && <MetaPill>{atk.range}</MetaPill>}
              {atk.damage && (
                <>
                  <Box component="span" sx={{ color: 'text.secondary' }}>
                    ·
                  </Box>
                  <Typography component="span" variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {atk.damage}
                  </Typography>
                </>
              )}
              {atk.rider && (
                <Typography component="span" variant="body2" color="text.secondary">
                  {atk.rider}
                </Typography>
              )}
            </Stack>
          ))}
        </Stack>
      )}

      {/* Renvoi verbatim aux capacités de la base (variantes « Voir ci-dessus »). */}
      {creature.sharedAbilitiesNote && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
          <PageRefText>{creature.sharedAbilitiesNote}</PageRefText>
        </Typography>
      )}

      {/* Capacités spéciales, texte de règle verbatim. */}
      {creature.specialAbilities && creature.specialAbilities.length > 0 && (
        <Stack spacing={0.75}>
          {creature.specialAbilities.map((ability, i) => (
            <Box key={i}>
              <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
                {ability.name}.{' '}
              </Typography>
              <Typography component="span" variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                <PageRefText>{ability.text}</PageRefText>
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

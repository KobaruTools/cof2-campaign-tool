'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { AbilityId, Ancestry } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import type { AncestryChoice } from '@/lib/character/ancestry';
import type { AbilityModSource } from '@/lib/character/effects';
import { abilityTotalColor } from '@/lib/ui/abilityColors';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { AbilityIcon } from '@/components/AbilityIcon';
import { AbilityBreakdownTooltip } from '@/components/AbilityBreakdownTooltip';
import { BonusDieBadge } from '@/components/BonusDieBadge';

export interface AbilitiesGridProps {
  /**
   * Les 7 valeurs SAISIES du personnage (base + modificateurs de peuple déjà inclus).
   * Les modificateurs permanents de capacités (`abilityMods`) viennent PAR-DESSUS.
   */
  abilities: Record<AbilityId, number>;
  /**
   * Édition en place : si fourni, chaque caractéristique devient un champ
   * numérique. Sinon, affichage en lecture seule. La fiche est permissive — la
   * saisie n'est jamais bornée (avertissements gérés ailleurs). On édite la valeur
   * SAISIE (base + peuple) ; le bonus de capacité reste appliqué par-dessus.
   */
  onChange?: (id: AbilityId, value: number) => void;
  /**
   * Détail « base + peuple (+ capacités) = total » au survol du chiffre. Fourni
   * ensemble : valeurs de base, peuple et résolution de ses modificateurs. Absent
   * (peuple inconnu) → pas d'infobulle.
   */
  baseAbilities?: Record<AbilityId, number>;
  ancestry?: Ancestry;
  ancestryChoices?: AncestryChoice;
  /**
   * Modificateurs PERMANENTS de caractéristiques apportés par les capacités (genre
   * `ability-bonus`, ex. « +1 en CON » d'Endurer). S'ajoutent au total affiché.
   */
  abilityMods?: Partial<Record<AbilityId, number>>;
  /** Capacités sources de ces modificateurs, par caractéristique (pour le détail). */
  abilityModSources?: Partial<Record<AbilityId, AbilityModSource[]>>;
  /**
   * Caractéristiques bénéficiant d'un DÉ BONUS permanent (genre `ability-bonus-die`),
   * chacune avec le(s) nom(s) de capacité(s) source(s) — icône double-d20.
   */
  bonusDieSources?: Partial<Record<AbilityId, string[]>>;
}

/**
 * Les 7 caractéristiques de la fiche, en lecture ou en édition. Reprend le
 * langage visuel du récapitulatif du wizard (icône + code + valeur colorée).
 * Au survol du chiffre, une infobulle détaille « base + peuple = total » quand
 * le peuple est fourni.
 */
export function AbilitiesGrid({
  abilities,
  onChange,
  baseAbilities,
  ancestry,
  ancestryChoices,
  abilityMods,
  abilityModSources,
  bonusDieSources,
}: AbilitiesGridProps) {
  const canExplain = baseAbilities != null && ancestry != null && ancestryChoices != null;
  return (
    <Grid container spacing={1}>
      {ABILITY_IDS.map((id) => {
        const entered = abilities[id];
        const mod = abilityMods?.[id] ?? 0;
        // Lecture : on montre le total effectif (saisie + capacités). Édition : on édite
        // la valeur SAISIE, le bonus de capacité restant appliqué par-dessus (chip « +N »).
        const effective = entered + mod;
        const dieSources = bonusDieSources?.[id];
        // Le chiffre (ou champ) seul porte l'infobulle de détail ; l'icône de dé bonus est
        // un FRÈRE, avec sa propre infobulle, pour ne pas imbriquer deux tooltips.
        const value = onChange ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <TextField
              type="number"
              size="small"
              value={entered}
              onChange={(e) => onChange(id, Number(e.target.value) || 0)}
              slotProps={{
                htmlInput: { style: { textAlign: 'center', fontWeight: 700, color: abilityTotalColor(entered) } },
              }}
              sx={{ width: 72 }}
            />
            {mod !== 0 && (
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                {mod > 0 ? '+' : '−'}
                {Math.abs(mod)}
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: abilityTotalColor(effective), cursor: 'help' }}>
            {effective > 0 ? '+' : ''}
            {effective}
          </Typography>
        );
        const featureTerms = (abilityModSources?.[id] ?? []).map((s) => ({
          name: s.name,
          value: s.value,
          featureId: s.featureId,
        }));
        return (
          <Grid key={id} size={{ xs: 6, sm: 12 / 7 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                px: 0.5,
                py: 1,
              }}
            >
              <AbilityIcon ability={id} title size={32} sx={{ color: 'text.secondary' }} />
              <Typography
                variant="subtitle2"
                color="text.secondary"
                title={ABILITY_NAMES[id]}
                sx={{ fontWeight: 'bold' }}
              >
                {id}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                {canExplain ? (
                  <AbilityBreakdownTooltip
                    abilityId={id}
                    baseAbilities={baseAbilities}
                    ancestry={ancestry}
                    ancestryChoices={ancestryChoices}
                    featureTerms={featureTerms}
                  >
                    {value}
                  </AbilityBreakdownTooltip>
                ) : (
                  value
                )}
                {dieSources && <BonusDieBadge ability={id} sources={dieSources} />}
              </Stack>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}

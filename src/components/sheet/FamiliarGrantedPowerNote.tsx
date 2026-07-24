'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, type Theme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { CapabilityChip, FeatureText } from '@/components/sheet/FeatureRichText';
import { classById, featureById } from '@/data';
import { familiarFromOptionId, FANTASTIC_FAMILIAR_R3_ID } from '@/data/fantastic-familiars';
import type { FantasticFamiliar, Feature, UsageResetTrigger } from '@/data/schema';
import { familiarPowerUsedKey, resolveFamiliarGrantedPower } from '@/lib/character/effects';
import type { Character } from '@/lib/character/types';
import type { Abilities } from '@/lib/engine';

/** Familier fantastique retenu au R3 (choix `option` index 0), ou undefined. Même jointure que le moteur. */
function selectedFamiliar(character: Character): FantasticFamiliar | undefined {
  const sel = character.featureChoices?.[FANTASTIC_FAMILIAR_R3_ID]?.[0];
  return familiarFromOptionId(typeof sel === 'string' ? sel : undefined);
}

/** Libellé français du profil de sorts du rang 5 ; `'main-profile'` (minimoï) → « votre profil principal ». */
function spellProfileLabel(profile: string): string {
  if (profile === 'main-profile') return 'votre profil principal';
  return classById.get(profile)?.name ?? profile;
}

/** Rappel de fréquence lisible pour le compteur d'usage (« par jour » / « par combat »). */
function resetLabel(reset: UsageResetTrigger): string {
  if (reset === 'day') return 'par jour';
  if (reset === 'combat') return 'par combat';
  return '';
}

/** Cadre commun des blocs listant une capacité conférée (mêmes tons que les blocs de sorts empruntés). */
const GRANTED_POWER_BLOCK_SX = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  px: 1.25,
  py: 0.75,
  mt: 1.5,
  bgcolor: (theme: Theme) => alpha(theme.palette.common.black, 0.2),
};

/**
 * Carte de la capacité RÉELLE conférée par le familier (ex. Dragon féérique → `illusions-r2` « Image
 * décalée »), sur le patron des pouvoirs empruntés (PER-163) : puce `CapabilityChip` aux couleurs/icône
 * du profil source + carte dépliable `FeatureText` (texte enrichi résolu sur les stats du perso, SANS
 * coût en mana — le pouvoir est conféré, pas lancé). À droite, le compteur d'usage mécanisé : bouton
 * « Utiliser » (consomme une charge) + restauration, dans la limite du familier (2×/jour, 1×/combat…).
 * Le décompte vit dans `Character.usageCounters` sous `familiarPowerUsedKey(host.id)` (convention
 * « absence = plein »), rechargé par les repos selon `usage.reset` (cf. `resetUsageCounters`).
 */
function FamiliarPowerCard({
  host,
  title,
  referenced,
  usage,
  character,
  abilities,
  level,
  onSet,
}: {
  host: Feature;
  title: string;
  referenced: Feature;
  usage?: { max: number; reset: UsageResetTrigger };
  character: Character;
  abilities?: Abilities;
  level?: number;
  onSet?: (counterKey: string, value: number, max: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const key = familiarPowerUsedKey(host.id);
  const max = usage?.max ?? 0;
  const remaining = Math.max(0, Math.min(max, character.usageCounters?.[key] ?? max));
  return (
    <Box sx={GRANTED_POWER_BLOCK_SX}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        {title}
      </Typography>
      {/* `gap` (pas `spacing`) pour ne pas écraser le `ml: auto` de la boîte de droite. */}
      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
        <IconButton
          size="small"
          aria-label={expanded ? 'Replier la capacité' : 'Déplier la capacité'}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          sx={{ p: 0.25 }}
        >
          <ExpandMoreIcon
            sx={{ fontSize: 20, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
          />
        </IconButton>
        <CapabilityChip featureId={referenced.id} label={referenced.name} />
        {usage && (
          <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <AppTooltip title={`Usages restants ${resetLabel(usage.reset)}`}>
              <Chip label={`${remaining} / ${max}`} size="small" variant="outlined" />
            </AppTooltip>
            {onSet && (
              <>
                <AppTooltip title={remaining > 0 ? `Utiliser (${resetLabel(usage.reset)})` : 'Plus de charge disponible'}>
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={remaining <= 0}
                      onClick={() => onSet(key, remaining - 1, max)}
                    >
                      Utiliser
                    </Button>
                  </span>
                </AppTooltip>
                <AppTooltip title="Rendre une charge">
                  <span>
                    <IconButton
                      size="small"
                      aria-label="Rendre une charge"
                      disabled={remaining >= max}
                      onClick={() => onSet(key, remaining + 1, max)}
                    >
                      <RestartAltIcon fontSize="small" />
                    </IconButton>
                  </span>
                </AppTooltip>
              </>
            )}
          </Box>
        )}
      </Stack>
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ pl: 3.5, pt: 0.25 }}>
          <FeatureText feature={referenced} abilities={abilities} level={level} pathRank={referenced.rank} dense />
        </Box>
      </Collapse>
    </Box>
  );
}

/**
 * Affichage du pouvoir que le familier fantastique CHOISI confère au personnage, sous la carte des rangs
 * 4/5/7 de la voie du familier fantastique (PER-74) :
 *   - rang 4 « Pouvoir mineur » / rang 7 « Pouvoir supérieur » → CARTE de la capacité réelle conférée
 *     (puce du profil + carte dépliable + compteur d'usage), sur le modèle des pouvoirs empruntés ; repli
 *     en texte descriptif quand la capacité citée n'est pas peuplée (résolution différée) ;
 *   - rang 5 « Résistance » → profil dont on apprend 1-2 sorts (la RD, elle, est un effet moteur).
 * `null` si la capacité n'est pas concernée ou si aucun familier n'est choisi.
 */
export function FamiliarGrantedPowerNote({
  feature,
  character,
  abilities,
  level,
  onSetUsageCounter,
}: {
  feature: Feature;
  character: Character;
  abilities?: Abilities;
  level?: number;
  onSetUsageCounter?: (counterKey: string, value: number, max: number) => void;
}) {
  const familiar = selectedFamiliar(character);
  if (!familiar) return null;

  // Rang 5 : profil de sorts appris (descriptif ; la RD est un effet moteur affiché ailleurs).
  if (feature.id === 'prestige-familier-fantastique-r5') {
    return (
      <AppAlert severity="info" title={`Sorts appris — ${familiar.name}`} sx={{ mt: 1.5 }}>
        {`Un ou deux sorts (rang 1 ou 2) du profil : ${spellProfileLabel(familiar.spellProfile)}.`}
      </AppAlert>
    );
  }

  // Rangs 4 / 7 : pouvoir conféré.
  const power = resolveFamiliarGrantedPower(feature.id, character.featureChoices);
  if (!power) return null;
  const title = power.slot === 'minor' ? `Pouvoir mineur — ${familiar.name}` : `Pouvoir supérieur — ${familiar.name}`;
  const referenced = power.featureId ? featureById.get(power.featureId) : undefined;

  // Capacité peuplée → carte empruntée + compteur. Sinon → repli descriptif verbatim (résolution différée).
  if (referenced) {
    return (
      <FamiliarPowerCard
        host={feature}
        title={title}
        referenced={referenced}
        usage={power.usage}
        character={character}
        abilities={abilities}
        level={level}
        onSet={onSetUsageCounter}
      />
    );
  }
  return (
    <AppAlert severity="info" title={title} sx={{ mt: 1.5 }}>
      {power.text}
    </AppAlert>
  );
}

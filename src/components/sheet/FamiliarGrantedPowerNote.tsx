'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { ClassIcon } from '@/components/ClassIcon';
import { FeatureMarkerHexes } from '@/components/FeatureMarkerHex';
import { FeatureText } from '@/components/sheet/FeatureRichText';
import { classById, featureById, pathById } from '@/data';
import { familiarFromOptionId, FANTASTIC_FAMILIAR_R3_ID } from '@/data/fantastic-familiars';
import type { FantasticFamiliar, Feature, UsageResetTrigger } from '@/data/schema';
import { familiarPowerUsedKey, resolveFamiliarGrantedPower } from '@/lib/character/effects';
import type { Character } from '@/lib/character/types';
import type { Abilities } from '@/lib/engine';
import { classColor } from '@/lib/ui/classColors';

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

/**
 * Carte de la capacité RÉELLE conférée par le familier (ex. Dragon féérique → `illusions-r2` « Image
 * décalée »), calquée VISUELLEMENT sur la carte des capacités empruntées (`BorrowedFeatureBlock`, PER-120) :
 * cadre + teinte + titre à la COULEUR DE LA VOIE SOURCE, nom + marqueurs d'action (hexagones), puis le
 * texte enrichi COMPLET (pas de repli) résolu sur les stats du perso. Particularités du familier :
 *   - AUCUN coût en mana (pouvoir conféré, pas lancé) → pas de goutte de PM ;
 *   - à la place, un COMPTEUR d'usage mécanisé (« Utiliser » / restauration) dans la limite du familier
 *     (2×/jour, 1×/combat…), suivi dans `Character.usageCounters` sous `familiarPowerUsedKey(host.id)`
 *     (convention « absence = plein »), rechargé par les repos selon `usage.reset`.
 */
function FamiliarPowerCard({
  host,
  slotLabel,
  familiarName,
  referenced,
  usage,
  character,
  abilities,
  level,
  onSet,
}: {
  host: Feature;
  slotLabel: string;
  familiarName: string;
  referenced: Feature;
  usage?: { max: number; reset: UsageResetTrigger };
  character: Character;
  abilities?: Abilities;
  level?: number;
  onSet?: (counterKey: string, value: number, max: number) => void;
}) {
  const path = pathById.get(referenced.pathId);
  const classId = path?.type === 'class' ? path.classIds[0] : undefined;
  const color = classId ? classColor(classId) : undefined;
  const pathName = path?.name ?? referenced.pathId;
  const className = classId ? classById.get(classId)?.name : undefined;

  const key = familiarPowerUsedKey(host.id);
  const max = usage?.max ?? 0;
  const remaining = Math.max(0, Math.min(max, character.usageCounters?.[key] ?? max));

  return (
    <Box
      sx={{
        mt: 1.5,
        p: 1,
        border: 1,
        borderColor: color ?? 'divider',
        borderRadius: 1,
        bgcolor: color ? alpha(color, 0.06) : (theme) => alpha(theme.palette.text.primary, 0.04),
      }}
    >
      <Typography variant="caption" sx={{ color: color ?? 'text.secondary', fontWeight: 700, display: 'block', mb: 0.25 }}>
        <Box component="span" sx={{ mr: 0.5 }}>✦</Box>
        {slotLabel} — {familiarName}
        {className && classId ? (
          <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
            {' · '}
            {pathName} ({className}
            <ClassIcon classId={classId} size={13} sx={{ ml: 0.4, verticalAlign: 'text-bottom' }} />
            {')'}
          </Box>
        ) : (
          ''
        )}
      </Typography>
      {/* Ligne « nom + marqueurs d'action + compteur d'usage » — même gabarit que la carte empruntée,
          mais la goutte de PM est remplacée par le compteur (le pouvoir est conféré, sans coût en mana). */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {referenced.name}
        </Typography>
        <FeatureMarkerHexes feature={referenced} color={color} pathRank={referenced.rank} />
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
      <Box sx={{ mt: 0.25 }}>
        <FeatureText feature={referenced} abilities={abilities} level={level} pathRank={referenced.rank} />
      </Box>
      <Typography
        variant="caption"
        component="div"
        sx={{ mt: 0.75, fontStyle: 'italic', color: (theme) => alpha(theme.palette.text.secondary, 0.85) }}
      >
        Pouvoir conféré par le familier{usage ? ` — ${usage.max} usage${usage.max > 1 ? 's' : ''} ${resetLabel(usage.reset)}` : ''}, sans
        coût en mana.
      </Typography>
    </Box>
  );
}

/**
 * Rendu COMPACT (vue colonne) du pouvoir conféré par le familier, calqué sur la carte « stackée » des
 * capacités empruntées (PER-120) : un cadre décalé derrière (l'hôte « Pouvoir mineur »/« Pouvoir
 * supérieur ») + une carte de devant à la couleur de la voie source portant la capacité RÉELLE conférée
 * (nom + hexagones d'action + indicateur d'usage en lecture seule). Tout le bloc ouvre le détail (modale)
 * au clic — comme un emprunt. `null` si la capacité n'est pas un hôte familier avec pouvoir résolu (le
 * garde côté FeaturesByPath ne l'appelle alors pas ; ce repli reste une sécurité).
 */
export function FamiliarPowerCompactCard({
  host,
  character,
  concentration = false,
  onOpen,
}: {
  host: Feature;
  character: Character;
  concentration?: boolean;
  onOpen: () => void;
}) {
  const power = resolveFamiliarGrantedPower(host.id, character.featureChoices);
  const front = power?.featureId ? featureById.get(power.featureId) : undefined;
  if (!front) return null;
  const path = pathById.get(front.pathId);
  const classId = path?.type === 'class' ? path.classIds[0] : undefined;
  const color = classId ? classColor(classId) : undefined;
  const key = familiarPowerUsedKey(host.id);
  const max = power?.usage?.max ?? 0;
  const remaining = Math.max(0, Math.min(max, character.usageCounters?.[key] ?? max));
  return (
    <Box onClick={onOpen} sx={{ position: 'relative', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
      {/* Cadre décalé décoratif (offset bas-droite) DERRIÈRE — représente la capacité hôte (le rang). */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: -5,
          bottom: 0,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
          zIndex: 0,
        }}
      />
      {/* Carte de devant : la capacité RÉELLE conférée, teintée à la couleur de la voie source. */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          px: 1,
          pt: 1.75,
          pb: 0.75,
          border: 1,
          borderColor: color ?? 'divider',
          borderRadius: 1,
          // Fond OPAQUE pour masquer le cadre décalé derrière (comme la carte de devant d'un emprunt).
          backgroundColor: 'background.paper',
          backgroundImage: color ? `linear-gradient(${alpha(color, 0.06)}, ${alpha(color, 0.06)})` : undefined,
        }}
      >
        <FeatureMarkerHexes
          feature={front}
          color={color}
          concentration={concentration}
          pathRank={front.rank}
          sx={{ position: 'absolute', top: 0, left: 6, transform: 'translateY(-50%)', zIndex: 1 }}
        />
        {max > 0 && (
          <AppTooltip title={`Usages restants ${resetLabel(power!.usage!.reset)}`}>
            <Chip
              label={`${remaining}/${max}`}
              size="small"
              variant="outlined"
              sx={{ position: 'absolute', top: -8, right: -8, height: 20, zIndex: 1, bgcolor: 'background.paper' }}
            />
          </AppTooltip>
        )}
        <Typography variant="body2" sx={{ fontWeight: 600, width: '100%', textAlign: 'left', wordBreak: 'break-word' }}>
          {front.name}
        </Typography>
      </Box>
      {/* Bande de l'hôte EN FLUX, alignée bas-droite : le nom du rang (« Pouvoir mineur ») reste visible. */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          gap: 0.5,
          px: 1,
          pt: 0.25,
          pb: 0.25,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.2, textAlign: 'right', color: 'text.primary', wordBreak: 'break-word' }}>
          {host.name}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Affichage du pouvoir que le familier fantastique CHOISI confère au personnage, sous la carte des rangs
 * 4/5/7 de la voie du familier fantastique (PER-74) :
 *   - rang 4 « Pouvoir mineur » / rang 7 « Pouvoir supérieur » → CARTE de la capacité réelle conférée,
 *     calquée sur les capacités empruntées (cadre coloré, non repliable) + compteur d'usage ; repli en
 *     encadré descriptif quand la capacité citée n'est pas peuplée (résolution différée) ;
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
  const slotLabel = power.slot === 'minor' ? 'Pouvoir mineur' : 'Pouvoir supérieur';
  const referenced = power.featureId ? featureById.get(power.featureId) : undefined;

  // Capacité peuplée → carte empruntée + compteur. Sinon → repli descriptif verbatim (résolution différée).
  if (referenced) {
    return (
      <FamiliarPowerCard
        host={feature}
        slotLabel={slotLabel}
        familiarName={familiar.name}
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
    <AppAlert severity="info" title={`${slotLabel} — ${familiar.name}`} sx={{ mt: 1.5 }}>
      {power.text}
    </AppAlert>
  );
}

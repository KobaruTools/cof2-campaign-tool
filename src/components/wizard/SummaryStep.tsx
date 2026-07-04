'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { featureById, families, ancestryById, classById, pathById } from '@/data';
import { ABILITY_IDS } from '@/data/schema';
import { checkCompliance } from '@/lib/engine';
import { rulesContext } from '@/lib/character/rulesContext';
import { finalAbilities, level1FeatureIds, materializeDraft } from '@/lib/character/wizard';
import { classDisplayName } from '@/lib/character/classDisplay';
import { level1FamilyHp, level1HybridFamilies } from '@/lib/character/hp';
import { effectContext, effectiveAbilities, modsFromFeatures } from '@/lib/character/effects';
import { effectiveFeatureIdsForMods, hasActionableChoice, setFeatureChoice } from '@/lib/character/choices';
import { FeatureChoiceField } from '@/components/sheet/FeatureChoiceField';
import { defenseFromEquipment } from './helpers';
import { abilityTotalColor } from '@/lib/ui/abilityColors';
import { classColor } from '@/lib/ui/classColors';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { AbilityBreakdownTooltip } from '@/components/AbilityBreakdownTooltip';
import { AbilityIcon } from '@/components/AbilityIcon';
import { ClassIcon } from '@/components/ClassIcon';
import { AncestryIcon } from '@/components/AncestryIcon';
import { DerivedStatsGrid } from '@/components/DerivedStatsGrid';
import { FeatureLabel } from '@/components/FeatureLabel';
import type { StepProps } from './types';

const familyById = new Map(families.map((f) => [f.id, f]));

export function SummaryStep({ draft, patch }: StepProps) {
  const ancestry = ancestryById.get(draft.ancestryId);
  const characterClass = classById.get(draft.classId);
  const family = characterClass ? familyById.get(characterClass.familyId) : undefined;
  if (!ancestry || !characterClass || !family) {
    return <Alert severity="warning">Récapitulatif indisponible : étapes incomplètes.</Alert>;
  }

  const abilities = finalAbilities(draft, ancestry);
  const featureIds = level1FeatureIds(draft);
  const spellCount = featureIds.filter((id) => featureById.get(id)?.isSpell).length;
  const preview = materializeDraft(draft, ancestry, draft.createdAt);
  const derivedInput = {
    // Caractéristiques effectives (saisie + peuple + modificateurs permanents de
    // capacités du niveau 1) — cohérent avec la fiche. Cf. `effectiveAbilities`.
    abilities: effectiveAbilities(preview),
    level: 1,
    family,
    defenseEquipment: defenseFromEquipment(draft.equipment),
    spellCount,
    // Bonus des capacités du niveau 1 (PER-63) + capacités empruntées par un
    // choix « capacité d'une autre voie » (PER-66) ; `preview` porte déjà les
    // choix faits dans le wizard. Le contexte (PER-67) résout les valeurs
    // scalantes (ex. PV += FOR) ; aucun interrupteur n'est encore basculé.
    mods: modsFromFeatures(effectiveFeatureIdsForMods(preview), effectContext(preview)),
    // PV de base d'un profil hybride créé au niveau 1 (somme des deux familles,
    // p. 180) ; identique à 2 × baseHp pour un profil standard.
    hpLevel1Family: level1FamilyHp(preview, rulesContext),
    // Détail par famille pour l'infobulle (vide hors hybridation).
    hpLevel1Families: level1HybridFamilies(preview, rulesContext),
  };
  const warnings = checkCompliance(preview, rulesContext);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold' }}>
          {draft.name || 'Nouveau personnage'}
        </Typography>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: 'center', color: 'text.secondary' }}
        >
          <Typography variant="body2" component="span">
            {ancestry.name} ·
          </Typography>
          <ClassIcon classId={characterClass.id} size={18} />
          <Typography
            variant="body2"
            component="span"
            sx={{ color: classColor(characterClass.id), fontWeight: 600 }}
          >
            {classDisplayName(characterClass, draft.firearmsAllowed ?? true)}
          </Typography>
          <Typography variant="body2" component="span">
            · niveau 1
          </Typography>
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Caractéristiques
        </Typography>
        <Stack direction="row" spacing={1}>
          {ABILITY_IDS.map((id) => {
            const total = abilities[id];
            const color = abilityTotalColor(total);
            return (
              <Box
                key={id}
                title={ABILITY_NAMES[id]}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.25,
                  px: 0.5,
                }}
              >
                <AbilityIcon ability={id} title size={32} sx={{ color: 'text.secondary' }} />
                <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  {id}
                </Typography>
                <AbilityBreakdownTooltip
                  abilityId={id}
                  baseAbilities={draft.baseAbilities}
                  ancestry={ancestry}
                  ancestryChoices={draft.ancestryChoices}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color, cursor: 'help' }}>
                    {total > 0 ? '+' : ''}
                    {total}
                  </Typography>
                </AbilityBreakdownTooltip>
              </Box>
            );
          })}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Statistiques dérivées
        </Typography>
        <DerivedStatsGrid
          input={derivedInput}
          featureIds={effectiveFeatureIdsForMods(preview)}
          effectContext={effectContext(preview)}
        />
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Capacités acquises
        </Typography>
        <Grid container spacing={1}>
          {featureIds.map((id) => {
            const feature = featureById.get(id);
            const path = feature ? pathById.get(feature.pathId) : undefined;
            // Capacité liée à un profil = voie de classe → couleur/icône de SON
            // profil (pas du profil principal : en hybride, une voie peut venir
            // d'un autre profil). Voie de peuple / du mage : pas de profil →
            // bordure neutre.
            const featureClassId =
              path?.type === 'class'
                ? characterClass.pathIds.includes(path.id)
                  ? characterClass.id
                  : path.classIds[0]
                : null;
            const color = featureClassId ? classColor(featureClassId) : null;
            // Voie de peuple : pas de profil → icône neutre du peuple (la voie du
            // mage / de prestige n'a pas d'icône, AncestryIcon ne rend alors rien).
            const ancestryId = path?.type === 'ancestry' ? path.id : null;
            return (
              <Grid key={id} size={{ xs: 6, sm: 3 }}>
                <Box
                  sx={{
                    height: '100%',
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: color ?? 'divider',
                    // Voie de peuple / du mage (pas de couleur de profil) : fond gris/blanc
                    // très transparent plutôt que rien, pour montrer qu'elle est active.
                    bgcolor: color ? alpha(color, 0.15) : (theme) => alpha(theme.palette.text.primary, 0.04),
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {feature ? <FeatureLabel feature={feature} /> : id}
                    </Typography>
                    {path && (
                      <Typography variant="caption" color="text.secondary">
                        {path.name}
                      </Typography>
                    )}
                  </Box>
                  {featureClassId ? (
                    <ClassIcon
                      classId={featureClassId}
                      size={20}
                      color="#fff"
                      sx={{ mt: 0.25 }}
                    />
                  ) : (
                    ancestryId && (
                      <AncestryIcon
                        ancestryId={ancestryId}
                        size={20}
                        sx={{ mt: 0.25, color: 'text.secondary' }}
                      />
                    )
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Choix portés par les capacités de niveau 1 (PER-66/68) — bloquant :
          le bouton « Créer » reste désactivé tant qu'ils ne sont pas résolus. */}
      {featureIds.some((id) => hasActionableChoice(preview, id)) && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Choix à faire
          </Typography>
          <Stack spacing={2}>
            {featureIds
              .filter((id) => hasActionableChoice(preview, id))
              .map((id) => {
                const feature = featureById.get(id);
                return (
                  <Box key={id}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {feature ? <FeatureLabel feature={feature} /> : id}
                    </Typography>
                    <FeatureChoiceField
                      character={preview}
                      featureId={id}
                      mode="edit"
                      blocking
                      onChange={(fid, index, value) =>
                        patch({ featureChoices: setFeatureChoice(preview, fid, index, value) })
                      }
                    />
                  </Box>
                );
              })}
          </Stack>
        </Box>
      )}

      {warnings.length > 0 && (
        <Alert severity="warning">
          {warnings.map((a) => a.message).join(' ')}
        </Alert>
      )}
    </Stack>
  );
}

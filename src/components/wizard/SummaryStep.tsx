'use client';

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
import { classDisplayName, effectiveClassPathIds } from '@/lib/character/classDisplay';
import { level1FamilyHp, level1HybridFamilies } from '@/lib/character/hp';
import { activeFeatureIdsForMods, defenseAbility, effectContext, effectiveAbilities, modsFromFeatures } from '@/lib/character/effects';
import { hasActionableChoice, setFeatureChoice } from '@/lib/character/choices';
import { FeatureChoiceField } from '@/components/sheet/FeatureChoiceField';
import { defenseFromEquipment } from './helpers';
import { abilityTotalColor, abilityTotalFontSize } from '@/lib/ui/abilityColors';
import { classColor } from '@/lib/ui/classColors';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { AppAlert } from '@/components/AppAlert';
import { PageRefText } from '@/components/SourceRef';
import {
  EquipConflictsAlert,
  TwoWeaponPenaltyAlert,
  WeaponMasteryAlert,
} from '@/components/sheet/WornEquipmentControls';
import { masteredClassIds, sacredWeaponMasteryIds } from '@/lib/character/mastery';
import { twoWeaponCombatStatus } from '@/lib/character/twoWeaponCombat';
import { AbilityBreakdownTooltip } from '@/components/AbilityBreakdownTooltip';
import { AbilityIcon } from '@/components/AbilityIcon';
import { ClassIcon } from '@/components/ClassIcon';
import { AncestryIcon } from '@/components/AncestryIcon';
import { DerivedStatsGrid } from '@/components/DerivedStatsGrid';
import { FeatureLabel } from '@/components/FeatureLabel';
import type { StepProps } from './types';

const familyById = new Map(families.map((f) => [f.id, f]));

export function SummaryStep({ draft, patch, campaignAllowsFirearms }: StepProps) {
  const ancestry = ancestryById.get(draft.ancestryId);
  const characterClass = classById.get(draft.classId);
  const family = characterClass ? familyById.get(characterClass.familyId) : undefined;
  if (!ancestry || !characterClass || !family) {
    return <AppAlert severity="warning">Récapitulatif indisponible : étapes incomplètes.</AppAlert>;
  }
  // Autorisation EFFECTIVE des armes à feu (règle campagne ∧ choix brouillon, PER-185) :
  // nom affiché, voies effectives et conformité suivent l'effectif, pas le seul choix.
  // Absent = « Non attribué » → pas de contrainte de campagne (fallback historique).
  const firearmsAllowed = (campaignAllowsFirearms ?? true) && (draft.firearmsAllowed ?? true);

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
    // Caractéristique de DEF : AGI par défaut, ou substitution retenue (Peau de pierre : CON, PER-131).
    defAbility: defenseAbility(activeFeatureIdsForMods(preview), effectContext(preview)),
    spellCount,
    // Bonus des capacités du niveau 1 (PER-63) + capacités empruntées par un
    // choix « capacité d'une autre voie » (PER-66) ; `preview` porte déjà les
    // choix faits dans le wizard. Le contexte (PER-67) résout les valeurs
    // scalantes (ex. PV += FOR) ; aucun interrupteur n'est encore basculé.
    mods: modsFromFeatures(activeFeatureIdsForMods(preview), effectContext(preview)),
    // PV de base d'un profil hybride créé au niveau 1 (somme des deux familles,
    // p. 180) ; identique à 2 × baseHp pour un profil standard.
    hpLevel1Family: level1FamilyHp(preview, rulesContext),
    // Détail par famille pour l'infobulle (vide hors hybridation).
    hpLevel1Families: level1HybridFamilies(preview, rulesContext),
  };
  const warnings = checkCompliance(preview, rulesContext, firearmsAllowed);

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
            {classDisplayName(characterClass, firearmsAllowed)}
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
            const color = abilityTotalColor(total, id);
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
                <AbilityIcon ability={id} title size={32} />
                <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  {id}
                </Typography>
                <AbilityBreakdownTooltip
                  abilityId={id}
                  baseAbilities={draft.baseAbilities}
                  ancestry={ancestry}
                  ancestryChoices={draft.ancestryChoices}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color, cursor: 'help', fontSize: abilityTotalFontSize(total, '1.25rem') }}>
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
          featureIds={activeFeatureIdsForMods(preview)}
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
                ? effectiveClassPathIds(characterClass, firearmsAllowed).includes(path.id)
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

      {/* Conflits de port DURS de l'équipement porté (PER-77) — non bloquant, signalé avant « Créer ». */}
      <EquipConflictsAlert equipment={draft.equipment} />

      {/* Arme(s) en main non maîtrisée(s) → dé malus en attaque (PER-79) — consultatif. */}
      <WeaponMasteryAlert
        equipment={draft.equipment}
        masteredIds={masteredClassIds(preview, rulesContext)}
        firearmsAllowed={firearmsAllowed}
        sacredWeaponIds={sacredWeaponMasteryIds(preview)}
      />

      {/* Combat à deux armes (PER-116) : dé malus sur chaque attaque (p. 215) — consultatif. */}
      <TwoWeaponPenaltyAlert status={twoWeaponCombatStatus({ ...preview, equipment: draft.equipment })} />

      {warnings.length > 0 && (
        <AppAlert severity="warning">
          {/* « (p. N) » cité dans un message → puce de source (notion globale PER-207). */}
          <PageRefText>{warnings.map((a) => a.message).join(' ')}</PageRefText>
        </AppAlert>
      )}
    </Stack>
  );
}

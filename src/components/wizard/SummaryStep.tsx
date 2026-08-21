'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { classPortraitPath } from '@/lib/storage/useCharacterPortraitSrc';
import { useCroppedImageSrc } from '@/lib/image/useCroppedImageSrc';
import { featureById, families, ancestryById, classById } from '@/data';
import { ABILITY_IDS } from '@/data/schema';
import { checkCompliance } from '@/lib/engine';
import { rulesContext } from '@/lib/character/rulesContext';
import { finalAbilities, level1FeatureIds, materializeDraft } from '@/lib/character/wizard';
import { classDisplayName } from '@/lib/character/classDisplay';
import { level1FamilyHp, level1HybridFamilies } from '@/lib/character/hp';
import { activeFeatureIdsForMods, defenseAbility, effectContext, effectiveAbilities, modsFromFeatures } from '@/lib/character/effects';
import { hasActionableChoice, setFeatureChoice } from '@/lib/character/choices';
import { FeatureChoiceField } from '@/components/sheet/FeatureChoiceField';
import { defenseFromEquipment } from './helpers';
import { classColor } from '@/lib/ui/classColors';
import { AppAlert } from '@/components/AppAlert';
import { PageRefText } from '@/components/SourceRef';
import {
  EquipConflictsAlert,
  TwoWeaponPenaltyAlert,
  WeaponMasteryAlert,
} from '@/components/sheet/WornEquipmentControls';
import { extraMasteredWeaponIds, masteredClassIds } from '@/lib/character/mastery';
import { twoWeaponCombatStatus } from '@/lib/character/twoWeaponCombat';
import { AbilityValueBadge } from '@/components/AbilityValueBadge';
import { ClassIcon } from '@/components/ClassIcon';
import { DerivedStatsGrid } from '@/components/DerivedStatsGrid';
import { FeatureLabel } from '@/components/FeatureLabel';
import { AcquiredPathsGrid } from './AcquiredPathsGrid';
import type { StepProps } from './types';

const familyById = new Map(families.map((f) => [f.id, f]));

export function SummaryStep({
  draft,
  patch,
  campaignAllowsFirearms,
  portraitFile,
  portraitCropRect,
}: StepProps) {
  // Illustration CHOISIE, en fond flottant du récapitulatif (PER-330 retours) — même esprit que le
  // filigrane du portrait sur la fiche en mobile (`HeaderIllustrations`) : aperçu 100 % local du fichier
  // en attente (aucun envoi tant que le personnage n'existe pas en DB, cf. PER-383), sinon l'illustration
  // statique du profil. Hooks AVANT tout retour anticipé (règles des Hooks).
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!portraitFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(portraitFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [portraitFile]);
  const croppedPreviewUrl = useCroppedImageSrc(previewUrl ?? undefined, portraitCropRect);
  const portraitSrc =
    draft.portraitVariant === 'custom' && previewUrl
      ? croppedPreviewUrl ?? previewUrl
      : classPortraitPath(
          draft.classId,
          draft.portraitVariant === 'custom' ? 'default' : (draft.portraitVariant ?? 'default'),
        );

  const ancestry = ancestryById.get(draft.ancestryId);
  const characterClass = classById.get(draft.classId);
  const family = characterClass ? familyById.get(characterClass.familyId) : undefined;
  if (!ancestry || !characterClass || !family) {
    return (
      <AppAlert severity="warning" data-glossary-shot="SummaryStep">
        Récapitulatif indisponible : étapes incomplètes.
      </AppAlert>
    );
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
    // Bleed jusqu'aux bords du cadre d'étape (`Paper` translucide de `create/page.tsx`, padding
    // {xs:2, sm:3}) : les marges négatives annulent ce padding, `overflow: hidden` clippe le filigrane au
    // cadre, et le padding est réappliqué sur le contenu (`Stack` intérieur).
    <Box
      data-glossary-shot="SummaryStep"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        mx: { xs: -2, sm: -3 },
        my: { xs: -2, sm: -3 },
      }}
    >
      {/* Filigrane flottant de l'illustration choisie : ancré au bord DROIT, pleine hauteur, très
          transparent — purement décoratif (aria-hidden, pointerEvents none, sous le contenu). */}
      <Box
        component="img"
        src={portraitSrc}
        alt=""
        aria-hidden
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          // Taille FIXE (pas dépendante de la hauteur du bloc) — même valeurs que le
          // filigrane portrait de la fiche (`HeaderIllustrations.tsx`), pour un rendu
          // cohérent quel que soit le contenu du récapitulatif.
          height: { xs: 300, md: 600 },
          width: 'auto',
          maxWidth: '75%',
          objectFit: 'cover',
          objectPosition: 'top',
          opacity: 0.32,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
        }}
      />
      <Stack spacing={3} sx={{ position: 'relative', zIndex: 1, p: { xs: 2, sm: 3 } }}>
      {/* `textShadow` hérite sur toute la descendance Typography : lisibilité du nom/profil
          sur le filigrane, sans devoir le répéter ligne par ligne. */}
      <Box sx={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.85)' }}>
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
        {/* Résumé simple : le modèle de carac unique (icône + code + chiffre teinté),
            juste en grande taille. Le détail (breakdown au survol) et l'agrandissement
            du chiffre selon la valeur restent RÉSERVÉS à la fiche (`AbilitiesGrid`). */}
        <Stack direction="row" spacing={1}>
          {ABILITY_IDS.map((id) => (
            <AbilityValueBadge
              key={id}
              ability={id}
              value={abilities[id]}
              iconSize={32}
              showCode
              valueVariant="h6"
              // `filter: drop-shadow` (pas `boxShadow`) : suit la silhouette de l'icône ET du
              // chiffre, contraste lisible sur le filigrane derrière.
              sx={{ flex: 1, minWidth: 0, px: 0.5, filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.85))' }}
            />
          ))}
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

      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          backdropFilter: 'blur(6px)',
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.55),
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          Capacités acquises
        </Typography>
        <AcquiredPathsGrid character={preview} />
      </Box>

      {/* Choix portés par les capacités de niveau 1 (PER-66/68) — bloquant :
          le bouton « Créer » reste désactivé tant qu'ils ne sont pas résolus. */}
      {featureIds.some((id) => hasActionableChoice(preview, id)) && (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            backdropFilter: 'blur(6px)',
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.55),
          }}
        >
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
        extraMasteredWeaponIds={extraMasteredWeaponIds(preview, firearmsAllowed)}
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
    </Box>
  );
}

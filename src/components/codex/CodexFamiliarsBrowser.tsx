'use client';

/**
 * Navigateur « Familiers fantastiques » du Codex (PER-421) — consultation en LECTURE SEULE des 12
 * familiers de la voie de prestige `prestige-familier-fantastique` (`fantastic-familiars.ts`,
 * p. 133-136), SANS personnage. Grille de blocs (patron `CodexGodsBrowser`, PER-420) : pas de
 * sélecteur maître-détail, tout affiché d'un coup.
 *
 * Contenu retenu (cadrage propriétaire) : description + les 3 éléments référencés par la voie
 * (R4 Pouvoir mineur, R5 Résistance/profil de sorts, R7 Pouvoir supérieur). Cartes à hauteur FIXE
 * (retour propriétaire : « toutes la même taille ») avec défilement interne si le contenu déborde
 * — la longueur du texte varie beaucoup d'un familier à l'autre (Toile/Poison très détaillés vs.
 * une phrase courte), un simple `alignItems: 'stretch'` ne suffit qu'à égaliser une même LIGNE de
 * grille, pas la grille entière.
 *
 * Les pouvoirs conférés (capacité de profil réelle OU pouvoir propre au familier) sont rendus par
 * `ReferencedPowerCard`, une réplique STATIQUE du corps repliable de `PathCard` (même bordure/
 * teinte, mêmes hexagones de marqueurs d'action, même `FeatureText`) mais SANS chevron/repli
 * (retour propriétaire : pas besoin d'ouverture ici, juste la même forme) — et surtout avec
 * l'icône de la voie/du profil placée AVANT le nom de la capacité, alors que `PathCard` la place
 * après le renvoi de page en fin d'en-tête (correct pour une carte de SÉLECTION où l'œil lit le nom
 * en premier, mais moins lisible ici où la carte n'affiche qu'UNE capacité déjà connue). Le bonus
 * permanent de caractéristique (R7) est rendu par `StatModifierTag`, partagé avec
 * `CodexMountsBrowser` (bardes) — même encadré signé que `FormulaTotal` (Voies & Capacités), à la
 * place d'un simple `caption` visuellement écrasé face au reste de la carte.
 *
 * Pas de compteur d'usage ni de résolution par caractéristiques (pas de personnage ici) : voir
 * `FamiliarGrantedPowerNote.tsx` pour l'équivalent EN CONTEXTE personnage (compteurs, texte
 * enrichi résolu).
 *
 * Pas de gating payant à prévoir : `fantasticFamiliars` est un tableau statique du livre de base.
 */
import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { classById, featureById, pathById } from '@/data';
import { fantasticFamiliars } from '@/data/fantastic-familiars';
import type { Feature, FantasticFamiliar } from '@/data/schema';
import { AppAlert } from '@/components/AppAlert';
import { ClassIcon } from '@/components/ClassIcon';
import { FeatureMarkerHexes } from '@/components/FeatureMarkerHex';
import { DeclinedFeatureName } from '@/components/sheet/FeatureDeclension';
import { FeatureText } from '@/components/sheet/FeatureRichText';
import { SourceRef } from '@/components/SourceRef';
import { StatModifierTag } from '@/components/StatModifierTag';
import { classColor } from '@/lib/ui/classColors';

/** Hauteur fixe de toutes les cartes (retour propriétaire) : contenu variable → défilement interne. */
const CARD_HEIGHT = 660;

const cardSx = {
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(0, 0, 0, 0.35)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  p: 2.5,
  height: CARD_HEIGHT,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
} as const;

type PowerSlot = 'minor' | 'superior';

/** Rang FIXE du rang de voie portant le pouvoir (R4 mineur / R7 supérieur, p. 132). */
function powerRank(slot: PowerSlot): number {
  return slot === 'minor' ? 4 : 7;
}

/** Nom du profil de sorts du rang 5 ; `'main-profile'` (minimoï) → « votre profil principal ». */
function spellProfileLabel(profile: string): string {
  if (profile === 'main-profile') return 'votre profil principal';
  return classById.get(profile)?.name ?? profile;
}

/**
 * Feature réellement affichable pour un pouvoir mineur/supérieur : la capacité de profil CONFÉRÉE
 * si `grants.featureId` est peuplé, sinon une Feature SYNTHÉTIQUE pour un pouvoir PROPRE au
 * familier (`original`, ex. Toile/Poison) — même construction que `originalPowerFeature` de
 * `FamiliarGrantedPowerNote.tsx`, sans dépendance à un personnage. `undefined` seulement pour le
 * cas résiduel (ex. Exsangue, voie du sang de sorcier absente) : repli verbatim.
 */
function powerFeature(familiar: FantasticFamiliar, slot: PowerSlot): Feature | undefined {
  const power = slot === 'minor' ? familiar.minorPower : familiar.superiorPower;
  if (power.grants?.featureId) return featureById.get(power.grants.featureId);
  if (power.original) {
    return {
      id: `${familiar.id}--${slot}`,
      name: power.original.name,
      pathId: familiar.pathId,
      rank: powerRank(slot),
      isSpell: false,
      actionTypes: power.original.actionTypes ?? [],
      text: power.text,
      richText: power.original.richText,
      sourcePage: familiar.sourcePage,
    };
  }
  return undefined;
}

/**
 * Carte STATIQUE d'une capacité conférée — même langage visuel que le détail repliable de
 * `PathCard` (bordure/fond teintés par la voie source, hexagones de marqueurs d'action, texte
 * enrichi), sans chevron/repli (toujours dépliée) et avec l'icône de la voie/du profil AVANT le
 * nom (au lieu d'après le renvoi de page, ordre de `PathCard` — moins lisible ici où la carte ne
 * présente qu'une seule capacité déjà connue).
 */
function ReferencedPowerCard({
  referenced,
  color,
  classId,
  rankLabel,
}: {
  referenced: Feature;
  color?: string;
  classId?: string;
  rankLabel: string;
}) {
  return (
    <Box
      sx={{
        mt: 0.5,
        p: 1,
        border: 1,
        borderColor: color ?? 'divider',
        borderRadius: 1,
        bgcolor: color ? alpha(color, 0.06) : 'transparent',
      }}
    >
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
        {classId && <ClassIcon classId={classId} size={18} sx={{ color, flexShrink: 0 }} />}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: color ?? 'text.primary' }}>
          <DeclinedFeatureName feature={referenced} />
        </Typography>
        <FeatureMarkerHexes feature={referenced} color={color} pathRank={referenced.rank} />
        <Box sx={{ flexGrow: 1 }} />
        <SourceRef page={referenced.sourcePage} term={referenced.name} />
      </Stack>
      {rankLabel && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {rankLabel}
        </Typography>
      )}
      <FeatureText feature={referenced} pathRank={referenced.rank} />
    </Box>
  );
}

function FamiliarPowerBlock({ familiar, slot }: { familiar: FantasticFamiliar; slot: PowerSlot }) {
  const power = slot === 'minor' ? familiar.minorPower : familiar.superiorPower;
  const label = slot === 'minor' ? 'Pouvoir mineur (rang 4)' : 'Pouvoir supérieur (rang 7)';
  const referenced = powerFeature(familiar, slot);
  const path = referenced ? pathById.get(referenced.pathId) : undefined;
  const classId = path?.type === 'class' ? path.classIds[0] : undefined;
  const color = classId ? classColor(classId) : undefined;
  const className = classId ? classById.get(classId)?.name : undefined;
  const grants = power.grants;
  const abilityBonus = slot === 'superior' ? familiar.superiorPower.abilityBonus : undefined;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}
      >
        {label}
      </Typography>
      {referenced ? (
        <ReferencedPowerCard
          referenced={referenced}
          color={color}
          classId={classId}
          rankLabel={
            grants
              ? `Conféré par ${grants.pathName} (${className ?? grants.profile})${grants.usage ? ` — ${grants.usage}` : ''}`
              : 'Pouvoir propre au familier'
          }
        />
      ) : (
        <AppAlert severity="info" sx={{ mt: 0.5 }}>
          {power.text}
        </AppAlert>
      )}
      {abilityBonus && (
        <Box sx={{ mt: 0.5 }}>
          <StatModifierTag value={1} label={abilityBonus} />
        </Box>
      )}
    </Box>
  );
}

function FamiliarCard({ familiar }: { familiar: FantasticFamiliar }) {
  return (
    <Box sx={cardSx}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
          {familiar.name}
        </Typography>
        <SourceRef page={familiar.sourcePage} term={familiar.name} />
      </Stack>
      <Typography variant="body2" sx={{ mt: 1 }}>
        {familiar.description}
      </Typography>
      {(familiar.abilityOverrides || familiar.abilityNote) && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
          {familiar.abilityNote ??
            Object.entries(familiar.abilityOverrides!)
              .map(([ability, value]) => `${ability} ${value > 0 ? '+' : ''}${value}`)
              .join(', ')}
        </Typography>
      )}

      <FamiliarPowerBlock familiar={familiar} slot="minor" />

      <Typography variant="body2" sx={{ mt: 1.5 }}>
        <strong>Résistance (rang 5) :</strong> un ou deux sorts de rang 1 ou 2 du profil{' '}
        {spellProfileLabel(familiar.spellProfile)}.
      </Typography>

      <FamiliarPowerBlock familiar={familiar} slot="superior" />
    </Box>
  );
}

export function CodexFamiliarsBrowser() {
  const sorted = useMemo(
    () => [...fantasticFamiliars].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [],
  );

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
        alignItems: 'stretch',
      }}
    >
      {sorted.map((familiar) => (
        <FamiliarCard key={familiar.id} familiar={familiar} />
      ))}
    </Box>
  );
}

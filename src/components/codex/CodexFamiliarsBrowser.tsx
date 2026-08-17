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
 * TOUTES les lignes de la carte partagent le MÊME bloc `PathCard` (retour propriétaire : garder les
 * blocs repliables existants, juste leur donner à tous la même forme) — pouvoir mineur, résistance
 * et pouvoir supérieur/bonus permanent sont chacun une carte `PathCard` (`selectable={false}`,
 * capacité figée, patron « Capacité divine » de `CodexGodsBrowser`), avec `iconPosition="start"` :
 * l'icône de la voie/du profil AVANT le nom de la capacité, alors que `PathCard` la place par
 * défaut après le renvoi de page en fin d'en-tête (correct pour une carte de SÉLECTION où l'œil lit
 * le nom en premier, mais moins lisible ici où la carte ne présente qu'une seule capacité déjà
 * connue). Le bonus permanent de caractéristique (R7) est un `PathCard` sans `feature`/`detail`
 * (donc sans chevron, rien à déplier) portant `StatModifierTag` en `endAdornment` — même encadré
 * signé que `FormulaTotal` (Voies & Capacités), mais dans le MÊME cadre que les autres blocs plutôt
 * qu'un `caption` isolé.
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
import { classById, featureById, pathById } from '@/data';
import { fantasticFamiliars } from '@/data/fantastic-familiars';
import type { Feature, FantasticFamiliar } from '@/data/schema';
import { PathCard } from '@/components/PathCard';
import { SourceRef } from '@/components/SourceRef';
import { StatModifierTag } from '@/components/StatModifierTag';
import { GlossaryRichText } from '@/components/sheet/FeatureRichText';
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
 * cas résiduel (ex. Exsangue, voie du sang de sorcier absente) : repli verbatim (`detail` en texte).
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

/** Petite étiquette de slot au-dessus d'un bloc `PathCard` — MÊME traitement pour les 4 lignes
 * de la carte (retour propriétaire : « le même genre de bloc pour chaque ligne »). */
function SlotLabel({ children }: { children: string }) {
  return (
    <Typography
      variant="caption"
      sx={{ display: 'block', mt: 1.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}
    >
      {children}
    </Typography>
  );
}

/** Bloc « Pouvoir mineur/supérieur » — `PathCard` figée, capacité conférée ou pouvoir propre. */
function FamiliarPowerBlock({ familiar, slot }: { familiar: FantasticFamiliar; slot: PowerSlot }) {
  const power = slot === 'minor' ? familiar.minorPower : familiar.superiorPower;
  const label = slot === 'minor' ? 'Pouvoir mineur (rang 4)' : 'Pouvoir supérieur (rang 7)';
  const referenced = powerFeature(familiar, slot);
  const path = referenced ? pathById.get(referenced.pathId) : undefined;
  const classId = path?.type === 'class' ? path.classIds[0] : undefined;
  const color = classId ? classColor(classId) : undefined;
  const className = classId ? classById.get(classId)?.name : undefined;
  const grants = power.grants;

  return (
    <>
      <SlotLabel>{label}</SlotLabel>
      <PathCard
        name={referenced?.name ?? label}
        color={color}
        classId={classId}
        iconPosition="start"
        checked
        selectable={false}
        repeatFeatureName={false}
        rankLabel={
          grants
            ? `Conféré par ${grants.pathName} (${className ?? grants.profile})${grants.usage ? ` — ${grants.usage}` : ''}`
            : referenced
              ? 'Pouvoir propre au familier'
              : ''
        }
        feature={referenced}
        detail={referenced ? undefined : power.text}
        sourcePage={referenced?.sourcePage}
        sx={{ height: 'auto', mt: 0.5 }}
      />
    </>
  );
}

/** Bloc « Bonus permanent » (rang 7) — même cadre `PathCard`, sans chevron (rien à déplier). */
function FamiliarBonusBlock({ abilityBonus }: { abilityBonus: string }) {
  return (
    <>
      <SlotLabel>Bonus permanent (rang 7)</SlotLabel>
      <PathCard
        name="Caractéristique bonifiée"
        checked
        selectable={false}
        endAdornment={<StatModifierTag value={1} label={abilityBonus} />}
        sx={{ height: 'auto', mt: 0.5 }}
      />
    </>
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
      <Typography variant="body2" component="div" sx={{ mt: 1 }}>
        {familiar.descriptionRichText ? (
          <GlossaryRichText>{familiar.descriptionRichText}</GlossaryRichText>
        ) : (
          familiar.description
        )}
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

      <SlotLabel>Résistance (rang 5)</SlotLabel>
      <PathCard
        name="Sort appris"
        checked
        selectable={false}
        detail={`Un ou deux sorts de rang 1 ou 2 du profil ${spellProfileLabel(familiar.spellProfile)}.`}
        sx={{ height: 'auto', mt: 0.5 }}
      />

      <FamiliarPowerBlock familiar={familiar} slot="superior" />
      <FamiliarBonusBlock abilityBonus={familiar.superiorPower.abilityBonus} />
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

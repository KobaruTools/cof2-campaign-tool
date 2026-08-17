'use client';

/**
 * Navigateur « Familiers fantastiques » du Codex (PER-421) — consultation en LECTURE SEULE des 12
 * familiers de la voie de prestige `prestige-familier-fantastique` (`fantastic-familiars.ts`,
 * p. 133-136), SANS personnage. Grille de blocs (patron `CodexGodsBrowser`, PER-420) : pas de
 * sélecteur maître-détail, tout affiché d'un coup.
 *
 * Contenu retenu (cadrage propriétaire) : les 3 blocs de capacité référencés par la voie (R4
 * Pouvoir mineur, R5 Résistance/profil de sorts, R7 Pouvoir supérieur + bonus), PUIS la description
 * (retour propriétaire : la mécanique d'abord, le texte d'ambiance ensuite — plus cohérent qu'une
 * description en tête suivie de blocs). Hauteur de carte NATURELLE (`height: '100%'`, stretch de
 * grille par LIGNE comme `CodexGodsBrowser`) : pas de hauteur fixe ni de défilement interne (retour
 * propriétaire) — la carte grandit avec son contenu, quitte à ce que les lignes de la grille
 * n'aient pas toutes la même hauteur.
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
import type { AbilityId, Feature, FantasticFamiliar } from '@/data/schema';
import { ClassIcon } from '@/components/ClassIcon';
import { PathCard } from '@/components/PathCard';
import { SourceRef } from '@/components/SourceRef';
import { AbilityChipBox, GlossaryRichText } from '@/components/sheet/FeatureRichText';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { classColor } from '@/lib/ui/classColors';

const cardSx = {
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(0, 0, 0, 0.35)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  p: 2.5,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
} as const;

type PowerSlot = 'minor' | 'superior';

/** Rang FIXE du rang de voie portant le pouvoir (R4 mineur / R7 supérieur, p. 132). */
function powerRank(slot: PowerSlot): number {
  return slot === 'minor' ? 4 : 7;
}

/** Id de classe du profil de sorts du rang 5, ou `undefined` pour le sentinel `'main-profile'`
 * (minimoï — « votre profil principal », variable selon le personnage, pas de teinte/icône fixe). */
function spellProfileClassId(profile: string): string | undefined {
  return profile === 'main-profile' ? undefined : profile;
}

/** Nom du profil de sorts, EN LIGNE, teinté et précédé de son icône (retour propriétaire) —
 * même traitement que les autres références de voie/profil de la carte. */
function SpellProfileName({ profile }: { profile: string }) {
  const classId = spellProfileClassId(profile);
  if (!classId) return <>votre profil principal</>;
  const color = classColor(classId);
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, verticalAlign: 'middle', color, fontWeight: 700 }}
    >
      <ClassIcon classId={classId} size={14} sx={{ color }} />
      {classById.get(classId)?.name ?? classId}
    </Box>
  );
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

/** Bloc « Pouvoir mineur/supérieur » — `PathCard` figée, capacité conférée ou pouvoir propre. Pas
 * d'étiquette de rang ici (portée par le `SlotLabel` du parent — groupée avec `FamiliarBonusBlock`
 * pour le rang 7, retour propriétaire : un seul « Rang 7 » pour les deux blocs qui en relèvent). */
function FamiliarPowerBlock({ familiar, slot }: { familiar: FantasticFamiliar; slot: PowerSlot }) {
  const power = slot === 'minor' ? familiar.minorPower : familiar.superiorPower;
  const fallbackName = slot === 'minor' ? 'Pouvoir mineur' : 'Pouvoir supérieur';
  const referenced = powerFeature(familiar, slot);
  const path = referenced ? pathById.get(referenced.pathId) : undefined;
  const classId = path?.type === 'class' ? path.classIds[0] : undefined;
  const color = classId ? classColor(classId) : undefined;
  const className = classId ? classById.get(classId)?.name : undefined;
  const grants = power.grants;

  return (
    <PathCard
      name={referenced?.name ?? fallbackName}
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
      sx={{ height: 'auto', mt: 0.5 }}
    />
  );
}

/** Bloc « Bonus permanent » (rang 7, groupé sous le même `SlotLabel` que le pouvoir supérieur) —
 * même cadre `PathCard`, sans chevron (rien à déplier) : le nom de la carte porte directement
 * « Bonus permanent », plus besoin d'une ligne d'en-tête séparée. Le bonus lui-même reprend la
 * puce de caractéristique (`AbilityChipBox`, PER-224 : teinte propre + bord tireté) — le signe/
 * valeur (« +1 ») reste dans la puce (retour propriétaire). */
function FamiliarBonusBlock({ abilityBonus }: { abilityBonus: AbilityId }) {
  return (
    <PathCard
      name="Bonus permanent"
      checked
      selectable={false}
      endAdornment={
        <AbilityChipBox ability={abilityBonus} title={`${ABILITY_NAMES[abilityBonus]} (${abilityBonus}) : +1`}>
          +1 {abilityBonus}
        </AbilityChipBox>
      }
      sx={{ height: 'auto', mt: 1 }}
    />
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
      <SlotLabel>Rang 4 (pouvoir mineur)</SlotLabel>
      <FamiliarPowerBlock familiar={familiar} slot="minor" />

      <SlotLabel>Rang 5 (résistance)</SlotLabel>
      <PathCard
        name="Sort appris"
        color={spellProfileClassId(familiar.spellProfile) ? classColor(spellProfileClassId(familiar.spellProfile)!) : undefined}
        classId={spellProfileClassId(familiar.spellProfile)}
        iconPosition="start"
        checked
        selectable={false}
        detail={
          <>
            Un ou deux sorts de rang 1 ou 2 du profil <SpellProfileName profile={familiar.spellProfile} />.
          </>
        }
        sx={{ height: 'auto', mt: 0.5 }}
      />

      {/* Rang 7 GROUPÉ (retour propriétaire) : pouvoir supérieur + bonus permanent partagent la
          même étiquette de rang, pas de doublon « Rang 7 » répété deux fois. */}
      <SlotLabel>Rang 7 (pouvoir supérieur)</SlotLabel>
      <FamiliarPowerBlock familiar={familiar} slot="superior" />
      <FamiliarBonusBlock abilityBonus={familiar.superiorPower.abilityBonus} />

      {/* Description APRÈS les blocs de capacité (retour propriétaire) : la mécanique d'abord,
          l'ambiance ensuite — plus cohérent qu'une description en tête coupée des blocs. */}
      <Typography variant="body2" component="div" sx={{ mt: 2 }}>
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

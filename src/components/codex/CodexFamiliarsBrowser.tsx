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
 * (donc sans chevron, rien à déplier) portant `AbilityChipBox` en `endAdornment` — même puce
 * teintée que le texte enrichi (Voies & Capacités), mais dans le MÊME cadre que les autres blocs
 * plutôt qu'un `caption` isolé.
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
import { fantasticFamiliars, FAMILIAR_ENTITY_BY_OPTION } from '@/data/fantastic-familiars';
import type { AbilityId, CreatureProfile, Feature, FantasticFamiliar, OptionFeatureChoice } from '@/data/schema';
import { ClassIcon } from '@/components/ClassIcon';
import { PathCard } from '@/components/PathCard';
import { SourceRef } from '@/components/SourceRef';
import { AbilityChipBox, GlossaryRichText } from '@/components/sheet/FeatureRichText';
import { CreatureAbilitiesGrid, DerivedStatRow } from '@/components/sheet/CreatureStatBlock';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { classColor } from '@/lib/ui/classColors';

/**
 * Mini-fiche de créature du familier (rang 3 de la voie, p. 132) — RÉUTILISE la donnée
 * `CreatureProfile` déjà authored pour le choix du rang 3 (`prestige-familier-fantastique-r3`,
 * `part1.ts`), plutôt que de ré-écrire une seconde copie des caractéristiques/attaque/capacités
 * (source unique). Fée/lutin et pantin/poupée partagent une entité `FantasticFamiliar` mais sont
 * DEUX options distinctes dans la voie (mêmes stats) — on prend la PREMIÈRE (fée, pantin) comme
 * représentante. `undefined` seulement si la voie ou l'option venait à disparaître (jamais en
 * pratique, cf. `scripts/validate-data.ts`).
 */
function familiarCreatureProfile(familiar: FantasticFamiliar): CreatureProfile | undefined {
  const r3 = featureById.get('prestige-familier-fantastique-r3');
  const optionChoice = r3?.choices?.find((c): c is OptionFeatureChoice => c.kind === 'option');
  const option = optionChoice?.options.find(
    (o) => (FAMILIAR_ENTITY_BY_OPTION[o.id] ?? o.id) === familiar.id,
  );
  return option?.creatureProfile;
}

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

/**
 * Bloc « Familier (rang 3) » — mini-fiche de créature STATIQUE (retour propriétaire : pas un
 * bloc dépliable ici, même format que les mini-fiches de compagnon de la fiche de personnage/de
 * l'écran de MJ : `CreatureAbilitiesGrid` pour la grille de caractéristiques — SANS `masterAbilities`
 * (convention déjà établie par l'aperçu du wizard : « maître supposé à 0 », `resolveCreatureAbilities`).
 * Défense/PV/Attaque restent des FORMULES SYMBOLIQUES (`GlossaryRichText`, pas de total calculé) :
 * elles dépendent du rang de voie/niveau/caractéristiques du PERSONNAGE, qu'on n'a pas hors fiche —
 * les afficher comme un nombre concret serait FAUX (contrairement aux dés, dont la face de base est
 * une vraie convention établie ailleurs, `evolvingDieBase`).
 *
 * DEF/PV/Init./attaque reprennent le MÊME langage graphique que l'encadré « Compagnons » de la
 * fiche de personnage (`DerivedStatRow`, icône cerclée + cadre bordé), mais UNE STAT PAR LIGNE
 * (retour propriétaire) : la formule verbatim (« 10 + CHA ») est trop longue pour la puce compacte
 * de la fiche, empilée côte à côte avec ses voisines. Les capacités spéciales suivent le même
 * changement de format — cartes bordées sur 2 colonnes (`FamiliarAbilityBlocks`, moitié largeur
 * chacune) plutôt qu'un texte en italique, sans dupliquer `CreatureSpecialAbilityBlocks` (celui-ci
 * exige des caractéristiques/niveau de PERSONNAGE pour résoudre `RichInline`, absentes ici — on
 * reste sur `GlossaryRichText`, formule symbolique).
 */
function FamiliarStatsBlock({ familiar }: { familiar: FantasticFamiliar }) {
  const profile = familiarCreatureProfile(familiar);
  if (!profile) return null;
  const attack = profile.attack;
  // `fromMaster` est un `DerivedStatId` du schéma (data, plus large — inclut `def`/`recoveryDiceCount`,
  // jamais utilisés pour une attaque) ; on ne retient que les 3 stats d'attaque valables pour l'icône.
  const attackStatId =
    attack?.fromMaster === 'magicAttack' || attack?.fromMaster === 'rangedAttack' ? attack.fromMaster : 'meleeAttack';
  return (
    <Box sx={{ mt: 0.5, p: 1.25, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
        Familier (taille {profile.size ?? 'minuscule'})
      </Typography>
      <CreatureAbilitiesGrid profile={profile} variant="large" />
      <Stack spacing={0.6} sx={{ mt: 1 }}>
        {profile.defense && (
          <DerivedStatRow statId="defense" label="Défense">
            <GlossaryRichText>{profile.defense}</GlossaryRichText>
          </DerivedStatRow>
        )}
        {typeof profile.hitPoints === 'string' && (
          <DerivedStatRow statId="maxHp" label="PV">
            <GlossaryRichText>{profile.hitPoints}</GlossaryRichText>
          </DerivedStatRow>
        )}
        <DerivedStatRow statId="initiative" label="Initiative">
          Initiative du personnage
        </DerivedStatRow>
        {attack && (
          <DerivedStatRow statId={attackStatId} label={attack.label ?? 'Attaque'}>
            Attaque magique du personnage
            {attack.damage && (
              <>
                {' · '}
                <GlossaryRichText>{attack.damage}</GlossaryRichText>
              </>
            )}
          </DerivedStatRow>
        )}
      </Stack>
      <FamiliarAbilityBlocks profile={profile} />
      {profile.note && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, fontStyle: 'italic' }}>
          {profile.note}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Capacités spéciales du familier en cartes bordées sur 2 colonnes (moitié largeur chacune,
 * retour propriétaire) — MÊME présentation visuelle que `CreatureSpecialAbilityBlocks` (nom en
 * gras + texte enrichi), mais en `GlossaryRichText` (formule symbolique, pas de personnage à
 * résoudre ici) plutôt qu'en `RichInline`. `null` si le profil n'en a aucune.
 */
function FamiliarAbilityBlocks({ profile }: { profile: CreatureProfile }) {
  const list = profile.specialAbilities ?? [];
  if (list.length === 0) return null;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 0.75, mt: 0.75 }}>
      {list.map((ability, i) => (
        <Box
          key={i}
          sx={{ border: 1, borderColor: 'divider', borderRadius: 1, px: 1, py: 0.75, bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3, mb: 0.25 }}>
            {ability.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.5 }}>
            <GlossaryRichText>{ability.richText ?? ability.text}</GlossaryRichText>
          </Typography>
        </Box>
      ))}
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
      <Typography variant="body2" component="div" sx={{ mt: 1 }}>
        {familiar.descriptionRichText ? (
          <GlossaryRichText>{familiar.descriptionRichText}</GlossaryRichText>
        ) : (
          familiar.description
        )}
      </Typography>

      <SlotLabel>Rang 3 (familier)</SlotLabel>
      <FamiliarStatsBlock familiar={familiar} />

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
        // MÊME wrapper plein-largeur que les autres grilles du Codex (`CodexGodsBrowser`) : paliers
        // MUI qui stretchent les cartes sur toute la largeur du `Container` de la page (pas de
        // `maxWidth` réduit qui rétrécit tout le bloc — retour propriétaire, l'`auto-fit`/`maxWidth`
        // précédent limitait le CONTENEUR à 992px au lieu de juste plafonner le nombre de colonnes).
        // Plafond à 3 colonnes (`lg`), jamais de palier `xl` supplémentaire.
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
        alignItems: 'stretch',
      }}
    >
      {sorted.map((familiar) => (
        <FamiliarCard key={familiar.id} familiar={familiar} />
      ))}
    </Box>
  );
}

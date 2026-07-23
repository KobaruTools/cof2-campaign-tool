'use client';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import type { Abilities, DerivedStats } from '@/lib/engine';
import type { Depletion } from '@/lib/character/types';
import { resolveCreatureMaxHp, type CompanionEntry } from '@/lib/character/companions';
import type { DamageKind } from './HpGauge';
import { HpGauge } from './HpGauge';
import { resolveCreatureAbilities } from '@/lib/ui/creature';
import {
  CompanionSizePill,
  CreatureAbilitiesGrid,
  CreatureDerivedStats,
  CreatureDescriptionRich,
  CreatureSpecialAbilityBlocks,
} from './CreatureStatBlock';

interface CompanionCardProps {
  entry: CompanionEntry;
  /** Caractéristiques EFFECTIVES du maître — résolvent les valeurs richText (PV, DEF, DM). */
  abilities: Abilities;
  /** Niveau du personnage maître. */
  level: number;
  /** Stats dérivées du maître — Init./attaque recopiées, DEF alternative « en selle ». */
  masterDerived: DerivedStats;
  /** Dépletion de PV de CE compagnon (manque létal/temp), `{}` = PV pleins. */
  depletion: Depletion;
  /** Inflige `amount` dégâts de la nature `kind` au compagnon. */
  onDamage: (amount: number, kind: DamageKind) => void;
  /** Soigne `amount` PV au compagnon. */
  onHeal: (amount: number) => void;
  /** Remet les PV du compagnon à plein. */
  onReset: () => void;
  /**
   * Supprime CETTE instance (zombie uniquement, PER-235). Fourni seulement pour un compagnon
   * multi-instances (`entry.instanceId` présent) : rend une corbeille rouge en bas à droite du
   * bloc. Absent → aucun contrôle de suppression (compagnons classiques).
   */
  onDelete?: () => void;
}

/**
 * Bloc condensé d'un compagnon (PER-233) : en-tête (nom + type), puis une ligne avec la
 * BARRE DE VIE interactive (~50 % de largeur, suivi des dégâts/soins comme la barre du
 * joueur) et, à droite, la grille compacte des caractéristiques ; en dessous, le reste de
 * la description (DEF, Init., attaque, capacités, note). Les PV max sont calculés depuis le
 * `CreatureProfile` (résolution de `hitPoints`) ; s'ils ne se résolvent pas en nombre, on
 * retombe sur l'affichage textuel des PV dans la ligne de stats (pas de barre).
 */
function CompanionCard({ entry, abilities, level, masterDerived, depletion, onDamage, onHeal, onReset, onDelete }: CompanionCardProps) {
  const { profile, pathRank, bonusDieAbilities, defenseAltActive, instanceId, instanceIndex } = entry;
  const maxHp = resolveCreatureMaxHp(profile, abilities, level, pathRank);
  const hasAbilities = !!resolveCreatureAbilities(profile, abilities);
  // La colonne DROITE (carac + stats dérivées) n'existe que si le profil porte des caracs OU au
  // moins une stat dérivée. Une créature « force, pas une créature » (Serviteur invisible :
  // descriptionRich, sans caracs ni DEF/Init.) n'a donc qu'une colonne (gauche pleine largeur).
  const hasDerived = !!(
    profile.defense ||
    profile.defenseAlt ||
    profile.initiative ||
    profile.attack ||
    (maxHp === null && profile.hitPoints) ||
    profile.extraAttacks?.length
  );
  const hasRight = hasAbilities || hasDerived;
  // Compagnon multi-instances (zombie) : numéroter les exemplaires (« ZOMBIE 1, 2… ») pour les
  // distinguer d'un coup d'œil ; un seul compagnon classique n'est jamais numéroté.
  const displayName =
    instanceId !== undefined ? `${profile.name.toUpperCase()} ${(instanceIndex ?? 0) + 1}` : profile.name.toUpperCase();
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.25,
        bgcolor: (t) => alpha(t.palette.text.primary, 0.025),
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap', mb: 0.75 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
          {displayName}
        </Typography>
        {profile.size && <CompanionSizePill size={profile.size} />}
        {profile.type && (
          <Typography variant="caption" color="text.secondary">
            {profile.type}
          </Typography>
        )}
      </Stack>

      {/* Deux colonnes (empilées sous md) — modèle bestiaire :
          — GAUCHE : barre de vie + petite note (déplacement…) + capacités (blocs sur 2 colonnes) ;
          — DROITE : caractéristiques (style bestiaire) puis stats dérivées (DEF, Init., attaque). */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: hasRight ? '1fr 1fr' : '1fr' },
          gap: 1.5,
          alignItems: 'start',
        }}
      >
        {/* Colonne gauche : PV + note + capacités */}
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          {maxHp !== null && (
            <HpGauge
              depletion={depletion}
              maxHp={maxHp}
              onDamage={onDamage}
              onHeal={onHeal}
              onReset={onReset}
              persistKey={`companion:${entry.key}`}
              iconLabel={`Points de vigueur — ${profile.name}`}
            />
          )}
          <CreatureDescriptionRich profile={profile} abilities={abilities} level={level} rank={pathRank} />
          {profile.note && (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.5 }}>
              {profile.note}
            </Typography>
          )}
          <CreatureSpecialAbilityBlocks profile={profile} abilities={abilities} level={level} rank={pathRank} />
        </Stack>

        {/* Colonne droite : caractéristiques (style bestiaire) + stats dérivées empilées */}
        {hasRight && (
          <Stack spacing={0.75} sx={{ minWidth: 0 }}>
            {hasAbilities && (
              <CreatureAbilitiesGrid
                profile={profile}
                masterAbilities={abilities}
                bonusDieAbilities={bonusDieAbilities}
              />
            )}
            <CreatureDerivedStats
              profile={profile}
              abilities={abilities}
              level={level}
              rank={pathRank}
              masterDerived={masterDerived}
              defenseAltActive={defenseAltActive}
              showHitPoints={maxHp === null}
            />
          </Stack>
        )}
      </Box>

      {/* Le TEXTE D'ORIGINE verbatim n'est affiché QUE sur la mini-fiche du RANG (Voies & capacités),
          pas ici (la carte compagnon reste centrée sur le jeu : PV + stats + capacités). */}

      {/* Suppression manuelle d'une instance (zombie, PER-235) : corbeille rouge en bas à droite.
          Exception propre aux compagnons multi-instances — les autres n'ont aucun contrôle d'ajout/
          suppression (pilotés par les rangs de voie). */}
      {onDelete && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 0.5 }}>
          <AppTooltip title={`Supprimer ${displayName.toLowerCase()}`}>
            <IconButton
              size="small"
              color="error"
              aria-label={`Supprimer ${displayName.toLowerCase()}`}
              onClick={onDelete}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
        </Stack>
      )}
    </Box>
  );
}

export interface CompanionsPanelProps {
  /** Compagnons débloqués, déjà résolus (`listCompanions`). */
  companions: CompanionEntry[];
  /** Caractéristiques EFFECTIVES du maître. */
  abilities: Abilities;
  /** Niveau du personnage. */
  level: number;
  /** Stats dérivées du maître. */
  masterDerived: DerivedStats;
  /** Dépletion de PV par compagnon (clé = `id` du rang porteur). */
  companionDepletion: Record<string, Depletion>;
  /** Inflige des dégâts au compagnon `key`. */
  onDamage: (key: string, amount: number, kind: DamageKind) => void;
  /** Soigne le compagnon `key`. */
  onHeal: (key: string, amount: number) => void;
  /** Remet le compagnon `key` à plein. */
  onReset: (key: string) => void;
  /**
   * Supprime l'instance `key` d'un compagnon multi-instances (zombie, PER-235). Appelé
   * uniquement pour les entrées dont `entry.instanceId` est défini (corbeille rouge). Absent →
   * aucune suppression manuelle possible.
   */
  onDelete?: (key: string) => void;
}

/**
 * Panneau « Compagnons » (PER-233) : un `CompanionCard` par compagnon débloqué, empilés.
 * Piloté à 100 % par les rangs de voie (aucun ajout/suppression manuel). L'appelant ne
 * rend ce panneau que si `companions` n'est pas vide (la section reste absente sinon).
 */
export function CompanionsPanel({
  companions,
  abilities,
  level,
  masterDerived,
  companionDepletion,
  onDamage,
  onHeal,
  onReset,
  onDelete,
}: CompanionsPanelProps) {
  return (
    <Stack spacing={1.5}>
      {companions.map((entry) => (
        <CompanionCard
          key={entry.key}
          entry={entry}
          abilities={abilities}
          level={level}
          masterDerived={masterDerived}
          depletion={companionDepletion[entry.key] ?? {}}
          onDamage={(amount, kind) => onDamage(entry.key, amount, kind)}
          onHeal={(amount) => onHeal(entry.key, amount)}
          onReset={() => onReset(entry.key)}
          // Corbeille rendue seulement pour une instance supprimable (zombie).
          onDelete={onDelete && entry.instanceId !== undefined ? () => onDelete(entry.key) : undefined}
        />
      ))}
    </Stack>
  );
}

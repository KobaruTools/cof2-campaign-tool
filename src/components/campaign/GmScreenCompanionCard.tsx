'use client';

/**
 * Carte d'un COMPAGNON dans le roster de l'écran de MJ (section « Compagnons », retour
 * propriétaire 2026-08-10, entre « Joueurs » et « Alliés »). Même coque « verre teinté » que
 * {@link GmScreenCard}/{@link GmScreenCreatureCard} (Paper sombre, dégradé de teinte, coins
 * arrondis), avec l'identité du PROPRIÉTAIRE en en-tête. LECTURE SEULE, comme les cartes
 * joueurs/créatures de cette section (aucune n'y permet d'infliger des dégâts) — la gestion
 * VIVANTE des PV reste réservée au tracker d'initiative plus bas, qui affiche déjà le compagnon.
 *
 * PAS un simple encoquillage de la mini-fiche `CompanionCard` de la fiche personnelle (1er jet,
 * retour propriétaire 2026-08-10) : sa grille 2 colonnes (PV + description à gauche, caracs +
 * stats dérivées à droite) tasse tout sur une carte déjà étroite. Ici, TOUT est empilé sur UNE
 * seule colonne pleine largeur — à l'image d'une carte de joueur (`GmScreenCard`) :
 *  0. Barre de vie CONDENSÉE — `CompactGauges`, EXACTEMENT comme sur les cartes JOUEURS de cette
 *     section (`GmScreenCard`) : plaquée en HAUT DU BLOC, HORS DU FLUX (position absolute, la
 *     carte réserve l'espace via `pt`), PAS en 2e ligne après le nom. Purement présentative (pas
 *     `CompactHpControl`, le contrôle cliquable du tracker) — un aperçu, pas un contrôle ;
 *  1. Nom + taille + type ;
 *  2. Caractéristiques, dans le style COMPACT partagé (`AbilityCompactGrid`) — même famille que
 *     les cartes joueurs/créatures de cette section, sur leur propre ligne pleine largeur ;
 *  3. DEF / Init. / attaque — mêmes blocs qu'avant (`CreatureDerivedStats`, inchangés), qui
 *     profitent MÉCANIQUEMENT de la pleine largeur une fois qu'ils ne partagent plus de colonne
 *     avec les caracs ;
 *  4. Capacités spéciales, puis suppression manuelle / toggle « en selle » si applicables (ces
 *     deux-là restent des actions de GESTION du roster, pas de combat — elles gardent leur callback).
 */
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { AbilityCompactGrid } from '@/components/AbilityCompactGrid';
import { CompactGauges, COMPACT_GAUGES_STRIP_HEIGHT } from '@/components/sheet/CompactGauges';
import {
  CompanionSizePill,
  CreatureDerivedStats,
  CreatureDescriptionRich,
  CreatureSpecialAbilityBlocks,
} from '@/components/sheet/CreatureStatBlock';
import { resolveCreatureAbilities } from '@/lib/ui/creature';
import { resolveCreatureMaxHp, type CompanionEntry } from '@/lib/character/companions';
import type { Depletion } from '@/lib/character/types';
import type { Abilities, DerivedStats } from '@/lib/engine';
import type { AbilityId } from '@/data/schema';

export interface GmScreenCompanionCardProps {
  /** Nom du personnage propriétaire du compagnon (« Compagnon de <nom> »). */
  ownerName: string;
  /** Couleur de thème (voie source du compagnon), teinte la coque comme le camp d'une créature. */
  accentColor: string;
  entry: CompanionEntry;
  /** Caractéristiques EFFECTIVES du maître — résolvent les valeurs richText (PV, DEF, DM). */
  abilities: Abilities;
  /** Niveau du personnage maître. */
  level: number;
  /** Stats dérivées du maître — Init./attaque recopiées, DEF alternative « en selle ». */
  masterDerived?: DerivedStats;
  /** Dépletion de PV de CE compagnon (manque létal/temp), `{}` = PV pleins — lecture seule ici. */
  depletion: Depletion;
  /** Suppression manuelle (zombie uniquement, PER-235). Absent = compagnon classique. */
  onDelete?: () => void;
  /** État « en selle » (PER-216) — `null` = pas une monture de voie chevauchable. */
  mounted?: boolean | null;
  /** Bascule l'état « en selle » (fourni seulement avec `mounted` non nul). */
  onSetMounted?: (on: boolean) => void;
}

export function GmScreenCompanionCard({
  ownerName,
  accentColor,
  entry,
  abilities,
  level,
  masterDerived,
  depletion,
  onDelete,
  mounted,
  onSetMounted,
}: GmScreenCompanionCardProps) {
  const { profile, pathRank, bonusDieAbilities, defenseAltActive, instanceId, instanceIndex } = entry;
  const maxHp = resolveCreatureMaxHp(profile, abilities, level, pathRank);
  const resolvedAbilities = resolveCreatureAbilities(profile, abilities);
  // Dés bonus INNÉS du profil (notés « * » dans le livre) UNIS à ceux octroyés par une option de
  // voie retenue — même union que `CreatureAbilitiesGrid` (dont on ne réutilise plus le rendu ici,
  // remplacé par le style compact partagé `AbilityCompactGrid`).
  const allBonusDice = new Set<AbilityId>([...(profile.bonusDieAbilities ?? []), ...(bonusDieAbilities ?? [])]);
  const displayName =
    instanceId !== undefined ? `${profile.name.toUpperCase()} ${(instanceIndex ?? 0) + 1}` : profile.name.toUpperCase();
  return (
    <Paper
      sx={{
        position: 'relative',
        p: 2,
        // Réserve FIXE en haut pour le bandeau de jauges (hors du flux) — EXACTEMENT comme
        // `GmScreenCard` : le contenu démarre à la même ordonnée qu'il y ait une barre ou pas.
        pt: `${COMPACT_GAUGES_STRIP_HEIGHT + 12}px`,
        bgcolor: 'rgba(20, 20, 23, 0.72)',
        // Même parti que GmScreenCreatureCard (teinte du camp) : ici la teinte de la VOIE source.
        backgroundImage: `linear-gradient(to top left, ${alpha(accentColor, 0.16)}, transparent)`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${alpha(accentColor, 0.28)}`,
        borderRadius: 3,
      }}
    >
      {/* Bandeau de jauges plaqué contre le bord SUPÉRIEUR, hors du flux — copie exacte du
          bandeau de `GmScreenCard` (mêmes valeurs manaMax/luckMax nulles que `CompactHpControl`
          utilise pour une créature/compagnon : pas de mana ni de chance à montrer). */}
      {maxHp !== null && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            overflow: 'hidden',
            borderTopLeftRadius: 'inherit',
            borderTopRightRadius: 'inherit',
          }}
        >
          <CompactGauges depletion={depletion} maxHp={maxHp} manaMax={null} luckMax={0} />
        </Box>
      )}
      <Stack spacing={1.25}>
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            alignSelf: 'flex-start',
            px: 1,
            py: 0.25,
            borderRadius: 1,
            fontSize: '0.8125rem',
            lineHeight: 1.4,
            border: `1px solid ${alpha(accentColor, 0.35)}`,
            bgcolor: alpha(accentColor, 0.12),
            color: 'text.primary',
          }}
        >
          Compagnon de {ownerName}
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
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

        <CreatureDescriptionRich profile={profile} abilities={abilities} level={level} rank={pathRank} />

        {/* Caractéristiques dans le style COMPACT partagé (retour propriétaire) — même famille que
            les cartes joueurs/créatures de cette section, sur leur propre ligne pleine largeur —
            plus de grosses puces sur une grille 2 colonnes partagée avec les stats dérivées. */}
        {resolvedAbilities && <AbilityCompactGrid abilities={resolvedAbilities} bonusDieAbilities={allBonusDice} />}

        {/* DEF / Init. / attaque : composant INCHANGÉ (fonctionne déjà bien) — il occupe
            mécaniquement toute la largeur maintenant qu'il ne partage plus de colonne. */}
        <CreatureDerivedStats
          profile={profile}
          abilities={abilities}
          level={level}
          rank={pathRank}
          masterDerived={masterDerived}
          defenseAltActive={defenseAltActive}
          showHitPoints={maxHp === null}
        />

        <CreatureSpecialAbilityBlocks profile={profile} abilities={abilities} level={level} rank={pathRank} />

        {/* Toggle « En selle » d'une monture de voie (PER-216), comme sur la fiche. */}
        {mounted != null && onSetMounted && (
          <Stack direction="row">
            <AppTooltip title="Le chevalier est-il actuellement en selle sur cette monture ? Active les bonus « en selle » de sa voie (DEF de la monture, +DM au contact, attaque de monture).">
              <span>
                <ToggleButton
                  value="mounted"
                  size="small"
                  selected={mounted}
                  onChange={() => onSetMounted(!mounted)}
                  sx={{ textTransform: 'none', px: 1.5, py: 0.25 }}
                >
                  {mounted ? 'En selle' : 'À pied'}
                </ToggleButton>
              </span>
            </AppTooltip>
          </Stack>
        )}

        {/* Suppression manuelle d'une instance (zombie, PER-235), comme sur la fiche. */}
        {onDelete && (
          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
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
      </Stack>
    </Paper>
  );
}

'use client';

/**
 * Tracker d'initiative de l'écran de MJ (construction à l'arrache, cf. PER-236).
 * Combattants — personnages réclamés + bandits ajoutés — en COLONNES, CLASSÉS par
 * initiative décroissante, avec défilement horizontal si ça dépasse. Chaque colonne
 * affiche le portrait, le nom, le profil et la BARRE DE VIE interactive de la fiche
 * (`HpGauge`, même composant et même mécanique de dégâts/soin). Un bouton « Tour
 * suivant » fait avancer le tour dans l'ordre d'initiative ; le combattant actif est
 * mis en évidence (contour blanc épais + halo blanc). Purement présentatif : les
 * lignes (calcul d'initiative, câblage des PV) sont assemblées par l'appelant, et le
 * TOUR COURANT est CONTRÔLÉ par l'appelant (`currentTurnKey` / `onCurrentTurnKeyChange`)
 * afin d'être persisté avec le reste du combat.
 *
 * ÉTATS DE COMBAT (PER-279) : quand l'appelant fournit `statusControls` (écran de MJ, auteur
 * unique — JAMAIS en projection), chaque colonne devient une ZONE DE DROP (`@dnd-kit`) pour les
 * puces de la palette, et un clic sur son en-tête ouvre un MENU À COCHER de tous les états (repli
 * tactile/accessibilité). L'application/le retrait passent par les mutations de la tranche 2. Sans
 * cette prop (fenêtre de projection), les colonnes restent purement présentatives.
 *
 * PER-280 : sur l'écran de MJ, chaque colonne affiche EN PLUS des PV la DEF et les attaques
 * (contact/distance/magie), en valeurs AJUSTÉES par les états appliqués (valeur baissée en rouge,
 * indicateur de dé malus), et un BADGE par état posé — effet verbatim en tooltip, ✕ de retrait, et
 * compteur ±N pour les états cumulatifs. Les NOMBRES ajustés restent réservés au mode MJ.
 *
 * PER-282 : la PROJECTION affiche elle aussi les badges d'états des combattants visibles, mais en
 * LECTURE SEULE (via `row.appliedStatuses` + `StatusChipVisual`, sans ✕/± ni nombres ajustés) — les
 * DEF/attaque ajustées restent secrètes côté MJ, comme le NC et les PV.
 */
import { useState, type ReactNode } from 'react';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useDroppable } from '@dnd-kit/core';
import type { SituationalEffectId } from '@/data/schema';
import type { Depletion } from '@/lib/character/types';
import {
  clampIntensity,
  isStackingStatus,
  resolveStatusModifiers,
  statusMaxIntensity,
  type AnyStatusEffectId,
  type AppliedStatus,
  type ResolvedStatusModifiers,
} from '@/lib/character/statusEffects';
import { AppTooltip } from '@/components/AppTooltip';
import { HpGauge, type DamageKind } from '@/components/sheet/HpGauge';
import { MalusDieBadge } from '@/components/MalusDieBadge';
import { StatusEffectIcon } from '@/components/StatusEffectIcon';
import {
  buildStatusGroups,
  StatusEffectTooltip,
  statusIconId,
  statusLabel,
} from '@/components/campaign/CombatStatusPalette';
import { DERIVED_STAT_ICON_PATHS } from '@/lib/ui/derivedStatIcons';

/**
 * Type d'attaque d'une valeur de combat affichée — détermine QUEL delta d'état lui appliquer
 * (`meleeAttack`/`rangedAttack`/`magicAttack`) : un état comme Aveuglé baisse le contact de −5 mais
 * la distance de −10.
 */
export type CombatAttackKind = 'melee' | 'ranged' | 'magic';

/** Une valeur d'attaque affichée sur la carte MJ (PER-280), en valeur de BASE (avant états). */
export interface CombatAttackStat {
  /** Clé React stable. */
  key: string;
  /** Libellé court (perso : « Contact »/« Distance »/« Magie » ; créature : nom de l'attaque). */
  label: string;
  /** Valeur de base (avant états). */
  base: number;
  /** Type d'attaque → delta d'état appliqué. */
  kind: CombatAttackKind;
}

/**
 * Statistiques de COMBAT affichées sur la carte de l'écran de MJ (PER-280) : DEF + attaques, en
 * valeurs de BASE (avant états). L'ajustement par les états appliqués est calculé À L'AFFICHAGE
 * (`resolveStatusModifiers`), jamais stocké. Absent = pas encore calculable (blob de créature non
 * chargé, ou personnage sans dérivées).
 */
export interface CombatStats {
  def: number;
  attacks: CombatAttackStat[];
}

export interface InitiativeRow {
  /** Clé React stable (id de perso ou clé de bandit). */
  key: string;
  /** Nom affiché (personnage ou « Bandit N »). */
  name: string;
  /**
   * Combattant PNJ (créature du bestiaire) plutôt que personnage de joueur. En mode
   * projection (PER-248), on masque son profil (NC) — information réservée au MJ.
   */
  isCreature: boolean;
  /** Libellé de profil (nom du profil, ou « NC X » pour une créature). */
  profileLabel: string;
  /** Couleur d'accent du profil (teinte du texte de profil). */
  profileColor: string;
  /**
   * Couleur d'accent de la COLONNE (PER-249) : teinte la bordure du bloc selon le camp de
   * la créature (rouge = adversaire, vert = allié). Absente pour les personnages joueurs
   * (bordure neutre). N'a pas d'effet sur le combattant actif, dont la bordure reste blanche.
   */
  accentColor?: string;
  /** URL du portrait (personnage). Absent → avatar de repli (bandit). */
  portraitSrc?: string;
  /** Nom du joueur qui incarne le personnage (affiché entre parenthèses sous le nom). */
  playerName?: string | null;
  /** Valeur d'initiative (tri décroissant, affichée dans la pastille). */
  initiative: number;
  /** PV maximum. */
  maxHp: number;
  /**
   * Statistiques de combat (DEF + attaques) affichées sur la carte de l'écran de MJ (PER-280), en
   * valeurs de BASE. Absent = non calculable (blob de créature non chargé). Rendu UNIQUEMENT sur
   * l'écran de MJ (jamais en projection : les nombres restent secrets, cf. PER-282).
   */
  combatStats?: CombatStats;
  /**
   * États de combat appliqués à ce combattant (PER-282), en LECTURE SEULE. Alimenté pour TOUTES les
   * lignes (MJ et projection). Sur l'écran de MJ, les badges interactifs (✕/±) passent par le
   * câblage `statusControls` (`ColumnStatusRender`) ; ce champ sert la PROJECTION, qui affiche les
   * mêmes états en badges lecture seule (sans les nombres ajustés, réservés au MJ).
   */
  appliedStatuses?: AppliedStatus[];
  /** Dépletion courante (manque létal + temporaire). */
  depletion: Depletion;
  onDamage: (amount: number, kind: DamageKind) => void;
  onHeal: (amount: number) => void;
  onReset: () => void;
  /** Clé `localStorage` de l'état déplié de la jauge (unique par ligne). */
  persistKey: string;
  /**
   * Combattant masqué aux joueurs (PER-248) : il s'affiche sur l'écran de MJ (œil fermé)
   * mais est EXCLU de la fenêtre projetée. Seules les créatures peuvent l'être.
   */
  hidden?: boolean;
  /**
   * Bascule la visibilité joueurs (créatures seulement). Présent ⇒ un bouton œil est
   * rendu (hors projection) ; absent ⇒ pas de bouton (personnages, toujours visibles).
   */
  onToggleVisible?: () => void;
}

/**
 * Câblage des ÉTATS DE COMBAT (PER-279), fourni par l'écran de MJ (auteur unique). Sa PRÉSENCE
 * active le glisser-déposer (drop sur les colonnes) et le menu au clic ; son absence laisse le
 * tracker purement présentatif (projection en lecture seule).
 */
export interface CombatStatusControls {
  /** États appliqués par combattant (clé = `InitiativeRow.key`). */
  statusesByKey: Record<string, AppliedStatus[]>;
  /**
   * Effets situationnels débloqués par la table (sous-ensemble filtré par `character.featureIds`).
   * Le groupe « Effets situationnels » du menu n'apparaît que s'il est non vide.
   */
  situationalIds: readonly SituationalEffectId[];
  /** Applique un état sur un combattant (intensité 1). */
  onApply: (combatantKey: string, id: AnyStatusEffectId) => void;
  /** Retire un état d'un combattant. */
  onRemove: (combatantKey: string, id: AnyStatusEffectId) => void;
  /** Ajuste de `delta` (±) l'intensité d'un état cumulatif d'un combattant (PER-280). */
  onAdjust: (combatantKey: string, id: AnyStatusEffectId, delta: number) => void;
}

/** Pastille circulaire d'initiative (nombre en gros, en tête de colonne). */
function InitiativeBadge({ value }: { value: number }) {
  return (
    <Box
      sx={(t) => ({
        flexShrink: 0,
        width: 40,
        height: 40,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: '1.05rem',
        fontVariantNumeric: 'tabular-nums',
        color: t.palette.warning.light,
        bgcolor: alpha(t.palette.warning.main, 0.14),
        border: `1px solid ${alpha(t.palette.warning.main, 0.4)}`,
      })}
    >
      {value}
    </Box>
  );
}

/** Portrait d'un combattant : image du personnage, ou avatar rouge pour un bandit. */
function CombatantPortrait({ src, name }: { src?: string; name: string }) {
  if (src) {
    return (
      <Box
        component="img"
        src={src}
        alt=""
        aria-hidden
        sx={{
          width: 44,
          height: 44,
          borderRadius: 1.5,
          objectFit: 'cover',
          objectPosition: 'top',
          flexShrink: 0,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          bgcolor: 'rgba(255, 255, 255, 0.04)',
        }}
      />
    );
  }
  return (
    <Box
      aria-label={name}
      sx={{
        width: 44,
        height: 44,
        borderRadius: 1.5,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e57373',
        bgcolor: 'rgba(229, 115, 115, 0.14)',
        border: '1px solid rgba(229, 115, 115, 0.35)',
      }}
    >
      <PersonOutlineIcon />
    </Box>
  );
}

/** Mappe un type d'attaque vers la clé `DerivedStatId` de son delta d'état (et de son icône dérivée). */
const ATTACK_KIND_DERIVED: Record<CombatAttackKind, 'meleeAttack' | 'rangedAttack' | 'magicAttack'> = {
  melee: 'meleeAttack',
  ranged: 'rangedAttack',
  magic: 'magicAttack',
};

/** Formate une valeur d'attaque signée (« +5 », « -2 »). */
function formatSigned(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

/** Petite glyphe SVG d'une stat dérivée (même banque d'icônes que les cartes de la fiche). */
function StatGlyph({ path, size = 14 }: { path: string; size?: number }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 512 512"
      aria-hidden
      sx={{ width: size, height: size, fill: 'currentColor', flexShrink: 0, opacity: 0.75 }}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}

/** Infobulle « base → ajusté » d'une pastille de stat de combat (PER-280). */
function StatValueTooltip({
  label,
  base,
  adjusted,
  signed,
  malusDie,
  damageMalus,
}: {
  label: string;
  base: number;
  adjusted: number;
  signed?: boolean;
  malusDie?: boolean;
  damageMalus?: number;
}) {
  const fmt = signed ? formatSigned : (n: number) => String(n);
  const changed = adjusted !== base;
  return (
    <Box sx={{ maxWidth: 240 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
        {label}
      </Typography>
      {changed ? (
        <Typography variant="caption" sx={{ display: 'block' }}>
          {`Base ${fmt(base)} → `}
          <Box component="span" sx={{ color: 'error.light', fontWeight: 700 }}>
            {fmt(adjusted)}
          </Box>
          {' (états)'}
        </Typography>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Aucun ajustement d&apos;état.
        </Typography>
      )}
      {malusDie && (
        <Typography variant="caption" sx={{ display: 'block', color: 'error.light' }}>
          Dé malus (2d20, garde le pire).
        </Typography>
      )}
      {damageMalus != null && damageMalus < 0 && (
        <Typography variant="caption" sx={{ display: 'block', color: 'error.light' }}>
          {`${damageMalus} aux DM infligés.`}
        </Typography>
      )}
    </Box>
  );
}

/** Pastille compacte d'une stat de combat (glyphe + valeur ; rouge si un état l'a baissée). */
function StatPill({
  glyph,
  value,
  lowered,
  malusDie,
  tooltip,
}: {
  glyph: string;
  value: string;
  lowered: boolean;
  malusDie?: boolean;
  tooltip: ReactNode;
}) {
  return (
    <AppTooltip title={tooltip}>
      <Box
        sx={{
          // `flex: 1 1 0` : les pastilles se répartissent la largeur de la carte à parts égales
          // (DEF + attaques occupent toute la rangée), avec repli si ça déborde.
          display: 'flex',
          flex: '1 1 0',
          minWidth: 0,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.4,
          height: 22,
          px: 0.6,
          borderRadius: 1,
          cursor: 'help',
          lineHeight: 1,
          bgcolor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          color: 'text.secondary',
        }}
      >
        <StatGlyph path={glyph} />
        <Box
          component="span"
          sx={{
            fontSize: '0.8rem',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: lowered ? 'error.light' : 'text.primary',
          }}
        >
          {value}
        </Box>
        {malusDie && <MalusDieBadge size={12} noTooltip />}
      </Box>
    </AppTooltip>
  );
}

/**
 * Rangée DEF + attaques d'une carte MJ (PER-280). Les valeurs de base (`stats`) sont ajustées par les
 * modificateurs d'état déjà résolus (`resolved`) : delta de DEF, deltas d'attaque par type, malus plat
 * « à tous les tests » (Attaque invalidante) replié dans les attaques, et dé malus (Affaibli/Immobilisé).
 */
function CombatStatsRow({ stats, resolved }: { stats: CombatStats; resolved: ResolvedStatusModifiers }) {
  const defDelta = resolved.derived.def ?? 0;
  const defAdjusted = stats.def + defDelta;
  // Dé malus aux tests d'attaque : Affaibli (tous les tests) OU Immobilisé (tests d'attaque).
  const attackMalusDie = resolved.allTestsMalusDie || resolved.attackTestsMalusDie;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, alignItems: 'center' }}>
      <StatPill
        glyph={DERIVED_STAT_ICON_PATHS.defense}
        value={String(defAdjusted)}
        lowered={defDelta < 0}
        tooltip={<StatValueTooltip label="Défense" base={stats.def} adjusted={defAdjusted} />}
      />
      {stats.attacks.map((atk) => {
        // Delta d'attaque = modificateur dérivé du type + malus plat « à tous les tests » (cumulatif).
        const delta = (resolved.derived[ATTACK_KIND_DERIVED[atk.kind]] ?? 0) + resolved.allTestsFlat;
        const adjusted = atk.base + delta;
        return (
          <StatPill
            key={atk.key}
            glyph={DERIVED_STAT_ICON_PATHS[ATTACK_KIND_DERIVED[atk.kind]]}
            value={formatSigned(adjusted)}
            lowered={delta < 0}
            malusDie={attackMalusDie}
            tooltip={
              <StatValueTooltip
                label={atk.label}
                base={atk.base}
                adjusted={adjusted}
                signed
                malusDie={attackMalusDie}
                damageMalus={resolved.damageDealt}
              />
            }
          />
        );
      })}
    </Box>
  );
}

/** Petit bouton icône d'un badge d'état (± intensité, ✕ retrait). */
function StatusMiniButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <IconButton
      size="small"
      disabled={disabled}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      sx={{ p: 0.15, color: 'error.light', '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.25)' } }}
    >
      {children}
    </IconButton>
  );
}

/**
 * Badge d'un état APPLIQUÉ sur une carte (PER-280) : icône + libellé, effet verbatim en tooltip, ✕ de
 * retrait, et — pour un état cumulatif — le compteur d'intensité « ×N » avec des boutons ± (bornés au
 * plafond du catalogue). Badge custom rouge (jamais un `Chip` MUI, cf. préférence UI).
 */
function AppliedStatusBadge({
  applied,
  onRemove,
  onAdjust,
}: {
  applied: AppliedStatus;
  onRemove: () => void;
  onAdjust: (delta: number) => void;
}) {
  const { id } = applied;
  const iconId = statusIconId(id);
  const stacking = isStackingStatus(id);
  const intensity = clampIntensity(id, applied.intensity ?? 1);
  const max = statusMaxIntensity(id);
  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        pl: 0.75,
        pr: 0.15,
        height: 24,
        borderRadius: 1,
        color: theme.palette.error.light,
        bgcolor: alpha(theme.palette.error.main, 0.14),
        border: `1px solid ${alpha(theme.palette.error.main, 0.45)}`,
      })}
    >
      <AppTooltip title={<StatusEffectTooltip id={id} />}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'help', minWidth: 0 }}>
          {iconId && <StatusEffectIcon effect={iconId} size={14} />}
          <Box component="span" sx={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {statusLabel(id)}
          </Box>
          {stacking && (
            <Box
              component="span"
              sx={{ fontSize: '0.72rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
            >
              {`×${intensity}`}
            </Box>
          )}
        </Box>
      </AppTooltip>
      {stacking && (
        <>
          <StatusMiniButton
            label={`Diminuer l'intensité — ${statusLabel(id)}`}
            disabled={intensity <= 1}
            onClick={() => onAdjust(-1)}
          >
            <RemoveIcon sx={{ fontSize: 13 }} />
          </StatusMiniButton>
          <StatusMiniButton
            label={`Augmenter l'intensité — ${statusLabel(id)}`}
            disabled={intensity >= max}
            onClick={() => onAdjust(1)}
          >
            <AddIcon sx={{ fontSize: 13 }} />
          </StatusMiniButton>
        </>
      )}
      <StatusMiniButton label={`Retirer ${statusLabel(id)}`} onClick={onRemove}>
        <CloseIcon sx={{ fontSize: 13 }} />
      </StatusMiniButton>
    </Box>
  );
}

/**
 * Icône d'un état en LECTURE SEULE pour la PROJECTION (PER-282) : carré rouge aux bords arrondis
 * contenant SEULEMENT l'icône (plus grosse), effet verbatim en info-bulle. L'intensité d'un état
 * cumulatif est portée par une pastille « N » en coin. Repli sur les initiales du libellé pour un
 * effet situationnel sans icône dédiée. Aucun contrôle (pas de ✕/±) ni nombre ajusté (réservés au MJ).
 */
function ProjectionStatusIcon({ applied }: { applied: AppliedStatus }) {
  const { id } = applied;
  const iconId = statusIconId(id);
  const intensity = clampIntensity(id, applied.intensity ?? 1);
  const stacked = isStackingStatus(id) && intensity > 1;
  return (
    <AppTooltip title={<StatusEffectTooltip id={id} />}>
      <Box
        aria-label={statusLabel(id)}
        sx={(theme) => ({
          position: 'relative',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 30,
          borderRadius: 1.25,
          cursor: 'help',
          color: theme.palette.error.light,
          // Fond translucide + flou d'arrière-plan : garde les icônes lisibles quel que soit ce
          // qu'elles recouvrent (illustration de fond, portrait voisin).
          bgcolor: alpha(theme.palette.error.main, 0.28),
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: `1px solid ${alpha(theme.palette.error.main, 0.6)}`,
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
        })}
      >
        {iconId ? (
          <StatusEffectIcon effect={iconId} size={20} />
        ) : (
          <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 800 }}>
            {statusLabel(id).slice(0, 2).toUpperCase()}
          </Box>
        )}
        {stacked && (
          <Box
            component="span"
            sx={(theme) => ({
              position: 'absolute',
              top: -5,
              right: -5,
              minWidth: 15,
              height: 15,
              px: 0.25,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '999px',
              fontSize: '0.6rem',
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              color: theme.palette.common.white,
              bgcolor: theme.palette.error.main,
              border: '1px solid rgba(0, 0, 0, 0.45)',
            })}
          >
            {intensity}
          </Box>
        )}
      </Box>
    </AppTooltip>
  );
}

/**
 * Bande de badges d'états en projection (PER-282), en `position: absolute` ancrée en bas à gauche du
 * bloc du combattant : les icônes s'enchaînent sur une ligne SANS déformer le bloc (repli en 2e ligne
 * seulement en débordement, cas rare). L'appelant réserve un peu de marge basse pour l'accueillir.
 */
function ProjectionStatusStrip({ applied }: { applied: AppliedStatus[] }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        // Ancrée au bord BAS du bloc et débordant vers le bas (`top: 100%`) : les icônes passent
        // SOUS l'identité, jamais par-dessus le texte, et sans réserver de place (le bloc garde sa
        // taille). Débordement horizontal borné à la largeur du bloc (repli en 2e ligne si besoin).
        top: 'calc(100% - 6px)',
        left: 10,
        right: 10,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
      }}
    >
      {applied.map((s) => (
        <ProjectionStatusIcon key={s.id} applied={s} />
      ))}
    </Box>
  );
}

/** Interactions d'états attachées à une colonne (mode écran de MJ uniquement). */
interface ColumnStatusInteractive {
  /** Réf de la zone de drop (`@dnd-kit`). */
  dropRef: (el: HTMLElement | null) => void;
  /** Une puce est actuellement survolée au-dessus de la colonne (surbrillance de drop). */
  isOver: boolean;
  /** Ouvre le menu à cocher des états (ancré sur l'élément cliqué). */
  onOpenMenu: (e: React.MouseEvent<HTMLElement>) => void;
}

/**
 * Rendu des ÉTATS appliqués à une colonne (mode écran de MJ) : la liste des états posés + les rappels
 * de retrait/ajustement. Séparé de `ColumnStatusInteractive` (drop/menu) car présent dès qu'on est en
 * mode MJ, indépendamment du survol d'une puce.
 */
interface ColumnStatusRender {
  /** États actuellement appliqués sur ce combattant. */
  applied: AppliedStatus[];
  /** Retire l'état `id` de ce combattant. */
  onRemove: (id: AnyStatusEffectId) => void;
  /** Ajuste de `delta` (±) l'intensité de l'état cumulatif `id`. */
  onAdjust: (id: AnyStatusEffectId, delta: number) => void;
}

/**
 * Colonne d'un combattant (présentation). `interactive` (optionnel, écran de MJ) transforme la
 * colonne en zone de drop et rend son en-tête cliquable (ouverture du menu d'états).
 */
function CombatantColumn({
  row,
  isActive,
  projection,
  interactive,
  status,
}: {
  row: InitiativeRow;
  isActive: boolean;
  projection: boolean;
  interactive?: ColumnStatusInteractive;
  status?: ColumnStatusRender;
}) {
  const identityClickable = !!interactive;
  const isOver = interactive?.isOver ?? false;
  // États affichés en projection (lecture seule) : bande d'icônes en overlay absolu ancré en bas à
  // gauche. AUCUNE place réservée (pas de padding) → le bloc garde EXACTEMENT la même taille qu'il
  // porte des états ou non, donc tous les blocs restent alignés quel que soit leur nombre d'états.
  const projectionStatuses = projection ? row.appliedStatuses ?? [] : [];
  const hasProjectionStatuses = projectionStatuses.length > 0;
  return (
    <Box
      ref={interactive?.dropRef}
      sx={(t) => ({
        // Un peu plus large que la disposition d'origine (220) : depuis que
        // l'identité passe à DROITE de l'initiative (au lieu de dessous), la
        // rangée a besoin de largeur pour le nom / joueur / profil.
        width: 260,
        flexShrink: 0,
        p: 1.25,
        // Ancre la bande d'états absolue de la projection (PER-282) — overlay, sans réserver de place.
        position: 'relative',
        borderRadius: 2,
        // Bloc quasi opaque (90 %) : lisible même par-dessus l'illustration de
        // fond de l'écran de MJ et sur la projection.
        bgcolor: 'rgba(20, 20, 23, 0.9)',
        // Créature masquée aux joueurs : légèrement estompée sur l'écran de MJ
        // (80 % d'opacité) pour la distinguer d'un coup d'œil — elle est de toute
        // façon absente de la projection (filtrée plus haut). Les personnages ne
        // sont jamais masqués (`hidden` toujours faux).
        opacity: row.hidden ? 0.8 : 1,
        // Bordure toujours de 2px (seule la COULEUR change) pour éviter tout saut de mise en page.
        // Priorité : survol d'une puce d'état (bleu) > tour actif (blanc) > camp (PER-249 : rouge
        // adversaire / vert allié) > neutre (personnages joueurs). On modifie la couleur de la
        // bordure EXISTANTE plutôt que d'ajouter un `outline` (qui cassait le rendu arrondi).
        border: `2px solid ${
          isOver
            ? t.palette.primary.main
            : isActive
              ? 'rgba(255, 255, 255, 0.9)'
              : row.accentColor
                ? alpha(row.accentColor, 0.5)
                : 'rgba(255, 255, 255, 0.08)'
        }`,
        boxShadow: isOver
          ? `0 0 12px 1px ${alpha(t.palette.primary.main, 0.55)}`
          : isActive
            ? '0 0 14px 2px rgba(255, 255, 255, 0.35)'
            : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      })}
    >
      <Stack spacing={1}>
        {/* Identité sur UNE rangée : portrait + initiative, puis nom / joueur /
            profil À DROITE (au lieu d'une rangée dédiée en dessous) — gagne de
            la place en hauteur sur chaque bloc. En mode MJ, cet en-tête est
            cliquable et ouvre le menu à cocher des états (repli tactile de PER-279). */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            // Hauteur d'en-tête CONSTANTE : l'identité fait 2 lignes pour une créature (nom + NC)
            // mais 3 pour un personnage (nom + joueur + profil). Sans plancher, la jauge de PV et
            // les pastilles de stats démarreraient plus haut sur les créatures → colonnes désalignées.
            minHeight: 52,
            borderRadius: 1,
            cursor: identityClickable ? 'pointer' : 'default',
            ...(identityClickable && {
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)' },
            }),
          }}
          onClick={interactive?.onOpenMenu}
          role={identityClickable ? 'button' : undefined}
          aria-label={identityClickable ? `Appliquer un état à ${row.name}` : undefined}
        >
          <CombatantPortrait src={row.portraitSrc} name={row.name} />
          <InitiativeBadge value={row.initiative} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
              {row.name}
            </Typography>
            {row.playerName && (
              <Typography
                variant="caption"
                sx={{ display: 'block', color: 'grey.500', fontStyle: 'italic', lineHeight: 1.2 }}
                noWrap
              >
                ({row.playerName})
              </Typography>
            )}
            {/* NC des créatures masqué en projection (info réservée au MJ) ;
                le profil des personnages (classe) reste, il n'a rien de secret. */}
            {!(projection && row.isCreature) && (
              <Typography variant="caption" sx={{ display: 'block', color: row.profileColor, fontWeight: 600 }} noWrap>
                {row.profileLabel}
              </Typography>
            )}
          </Box>
          {/* Repère visuel « appliquer un état » (écran de MJ) : indique que l'en-tête ouvre le
              menu. Le drop d'une puce fait la même chose sans passer par le menu. */}
          {identityClickable && (
            <AppTooltip title="Appliquer un état">
              <BoltOutlinedIcon fontSize="small" sx={{ flexShrink: 0, color: 'text.secondary' }} />
            </AppTooltip>
          )}
          {/* Bascule de visibilité joueurs (créatures uniquement, hors projection) :
              œil ouvert = visible dans la projection, œil fermé = masquée. */}
          {!projection && row.onToggleVisible && (
            <AppTooltip
              title={row.hidden ? 'Masquée aux joueurs — cliquer pour révéler' : 'Visible par les joueurs — cliquer pour masquer'}
            >
              <IconButton
                size="small"
                // Stoppe la propagation pour ne PAS ouvrir aussi le menu d'états (en-tête cliquable).
                onClick={(e) => {
                  e.stopPropagation();
                  row.onToggleVisible?.();
                }}
                aria-label={row.hidden ? `Rendre ${row.name} visible` : `Masquer ${row.name}`}
                sx={{ flexShrink: 0, color: row.hidden ? 'text.disabled' : 'inherit' }}
              >
                {row.hidden ? (
                  <VisibilityOffOutlinedIcon fontSize="small" />
                ) : (
                  <VisibilityOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            </AppTooltip>
          )}
        </Stack>
        {/* Barre de vie interactive (même composant que la fiche), boutons dessous.
            Masquée en projection : les PV (joueurs ET créatures) ne sont pas montrés
            aux joueurs, et ça libère de la hauteur. */}
        {!projection && (
          <HpGauge
            depletion={row.depletion}
            maxHp={row.maxHp}
            onDamage={row.onDamage}
            onHeal={row.onHeal}
            onReset={row.onReset}
            persistKey={row.persistKey}
            controlsBelow
          />
        )}
        {/* DEF + attaques ajustées (PER-280) : rendues UNIQUEMENT en mode MJ (`status` fourni),
            jamais en projection. Base = `row.combatStats`, ajustement résolu depuis les états posés. */}
        {status && row.combatStats && (
          <CombatStatsRow stats={row.combatStats} resolved={resolveStatusModifiers(status.applied)} />
        )}
        {/* Badges des états appliqués : effet verbatim en tooltip, ✕ de retrait, ±N si cumulatif. */}
        {status && status.applied.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {status.applied.map((s) => (
              <AppliedStatusBadge
                key={s.id}
                applied={s}
                onRemove={() => status.onRemove(s.id)}
                onAdjust={(delta) => status.onAdjust(s.id, delta)}
              />
            ))}
          </Box>
        )}
      </Stack>
      {/* Projection (PER-282) : bande d'icônes d'états en LECTURE SEULE (pas de ✕/±, pas de nombres
          ajustés), en position absolue ancrée en bas à gauche → n'altère pas la mise en page du bloc.
          Le chemin MJ passe par `status` (badges interactifs en flux normal) ci-dessus. */}
      {hasProjectionStatuses && <ProjectionStatusStrip applied={projectionStatuses} />}
    </Box>
  );
}

/**
 * Colonne INTERACTIVE (écran de MJ) : enveloppe `CombatantColumn` d'une zone de drop `@dnd-kit` et
 * gère le menu à cocher des états (repli au clic). Isolée dans son propre composant pour que ses
 * Hooks (`useDroppable`, `useState`) ne soient montés qu'en mode MJ — jamais en projection.
 */
function StatusDroppableColumn({
  row,
  isActive,
  controls,
}: {
  row: InitiativeRow;
  isActive: boolean;
  controls: CombatStatusControls;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: row.key });
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const applied = controls.statusesByKey[row.key] ?? [];
  const appliedIds = new Set(applied.map((s) => s.id));

  const toggle = (id: AnyStatusEffectId) => {
    if (appliedIds.has(id)) controls.onRemove(row.key, id);
    else controls.onApply(row.key, id);
    // Le menu reste ouvert : le MJ peut cocher/décocher plusieurs états d'affilée.
  };

  return (
    <>
      <CombatantColumn
        row={row}
        isActive={isActive}
        projection={false}
        interactive={{
          dropRef: setNodeRef,
          isOver,
          onOpenMenu: (e) => setAnchorEl(e.currentTarget),
        }}
        status={{
          applied,
          onRemove: (id) => controls.onRemove(row.key, id),
          onAdjust: (id, delta) => controls.onAdjust(row.key, id, delta),
        }}
      />
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { maxHeight: 420 } } }}
      >
        {buildStatusGroups(controls.situationalIds).flatMap((group) => [
          <ListSubheader key={group.title} sx={{ bgcolor: 'transparent', lineHeight: '2.2em' }}>
            {group.title}
          </ListSubheader>,
          ...group.ids.map((id) => {
            const iconId = statusIconId(id);
            const on = appliedIds.has(id);
            return (
              <MenuItem key={id} selected={on} onClick={() => toggle(id)} dense>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  {on && <CheckIcon fontSize="small" color="primary" />}
                </ListItemIcon>
                {iconId && <StatusEffectIcon effect={iconId} size={16} sx={{ mr: 1 }} />}
                <Typography variant="body2">{statusLabel(id)}</Typography>
              </MenuItem>
            );
          }),
        ])}
      </Menu>
    </>
  );
}

export interface InitiativeTrackerProps {
  rows: InitiativeRow[];
  /**
   * Tour courant suivi par CLÉ (robuste aux ajouts/retraits de bandits, contrairement
   * à un index). `null` = combat pas encore démarré (aucune mise en évidence).
   * Contrôlé/persisté par l'appelant.
   */
  currentTurnKey: string | null;
  onCurrentTurnKeyChange: (key: string | null) => void;
  /**
   * Mode PROJECTION (PER-248) : la fenêtre « présentation » destinée à être projetée
   * pour les joueurs. On y masque tout ce qui est réservé au MJ ou qui prend de la place
   * inutilement — barres de PV (joueurs ET créatures), NC des créatures, en-tête et
   * bouton « Tour suivant ». Le tour courant reste mis en évidence (piloté depuis
   * l'écran de MJ, reflété ici via la synchro). Ne restent que portrait + initiative +
   * identité — et les badges d'états en lecture seule (PER-282) — en compact.
   */
  projection?: boolean;
  /**
   * Action optionnelle rendue dans l'en-tête, à gauche du bouton « Tour suivant »
   * (ex. « Ouvrir dans une nouvelle fenêtre », PER-248). Ignorée en mode projection.
   */
  headerAction?: ReactNode;
  /**
   * Câblage des ÉTATS DE COMBAT (PER-279), fourni par l'écran de MJ UNIQUEMENT. Présent ⇒ chaque
   * colonne devient une zone de drop et un clic sur son en-tête ouvre le menu à cocher. Ignoré en
   * projection (lecture seule, jamais auteur).
   */
  statusControls?: CombatStatusControls;
}

export function InitiativeTracker({
  rows,
  currentTurnKey,
  onCurrentTurnKeyChange,
  projection = false,
  headerAction,
  statusControls,
}: InitiativeTrackerProps) {
  const advanceTurn = () => {
    if (rows.length === 0) return;
    const idx = rows.findIndex((r) => r.key === currentTurnKey);
    // Introuvable (−1, ex. bandit retiré) ou pas encore démarré → on démarre au premier.
    const next = idx < 0 ? 0 : (idx + 1) % rows.length;
    onCurrentTurnKeyChange(rows[next].key);
  };

  // En PROJECTION, on retire les combattants masqués aux joueurs (créatures cachées) :
  // ils restent visibles côté MJ mais absents de l'écran projeté. Ailleurs, tout s'affiche.
  const displayedRows = projection ? rows.filter((r) => !r.hidden) : rows;
  // Les états ne sont interactifs que hors projection (auteur = MJ uniquement).
  const interactive = !projection && statusControls;

  return (
    <Stack spacing={2}>
      {/* En-tête (titre + actions + « Tour suivant ») : tout se pilote depuis l'écran de
          MJ, donc rien de tout ça en mode projection. */}
      {!projection && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
            {"Ordre d'initiative"}
          </Typography>
          {headerAction}
          <Button
            variant="contained"
            size="small"
            startIcon={<SkipNextIcon />}
            onClick={advanceTurn}
            disabled={rows.length === 0}
          >
            Tour suivant
          </Button>
        </Stack>
      )}

      {displayedRows.length === 0 ? (
        <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Aucun combattant : les personnages reliés à un joueur et les bandits ajoutés apparaîtront
          ici, classés par initiative.
        </Typography>
      ) : (
        // Colonnes côte à côte ; défilement horizontal si la largeur est dépassée. En projection,
        // marge basse plus grande pour accueillir la bande d'états qui déborde SOUS chaque bloc
        // (PER-282) : réservée au conteneur (uniforme), elle ne déforme aucun bloc individuellement.
        // Nécessaire aussi car `overflowX: auto` force `overflow-y` à `auto` → sans cette marge, le
        // débordement des icônes serait rogné.
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: projection ? 5.5 : 1, alignItems: 'stretch' }}>
          {displayedRows.map((row) => {
            const isActive = row.key === currentTurnKey;
            return interactive ? (
              <StatusDroppableColumn key={row.key} row={row} isActive={isActive} controls={statusControls} />
            ) : (
              <CombatantColumn key={row.key} row={row} isActive={isActive} projection={projection} />
            );
          })}
        </Box>
      )}
    </Stack>
  );
}

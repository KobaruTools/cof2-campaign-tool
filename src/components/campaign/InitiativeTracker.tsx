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
 * DEF/attaque ajustées restent secrètes côté MJ, comme le NC et les PV des créatures.
 *
 * La PROJECTION porte en plus, sur les blocs de PERSONNAGES seulement, un bandeau de
 * jauges condensées PV + mana plaqué en haut du bloc (`CompactGauges`, même modèle que les cartes de
 * joueurs de l'écran de MJ) — la table voit ainsi la vie de tout le monde sur l'écran public. Les PV
 * des CRÉATURES restent masqués.
 */
import { useState, type ReactNode } from 'react';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import CheckIcon from '@mui/icons-material/Check';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
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
import { alpha, type Theme } from '@mui/material/styles';
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
import {
  CompactGauges,
  COMPACT_GAUGE_HEIGHT,
  COMPACT_GAUGE_ROW_GAP,
} from '@/components/sheet/CompactGauges';
import { MalusDieBadge } from '@/components/MalusDieBadge';
import { StatusEffectIcon } from '@/components/StatusEffectIcon';
import { StatusEffectTooltip } from '@/components/campaign/CombatStatusPalette';
import {
  buildStatusGroups,
  statusIconId,
  statusLabel,
  statusTone,
  type StatusTone,
} from '@/lib/ui/statusPalette';
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
  /**
   * Valeur d'initiative EFFECTIVE (base + états), triée en décroissant et affichée dans la pastille.
   * Un état comme Aveuglé (-5 en Init.) baisse cette valeur → la pastille passe en rouge et le
   * combattant se reclasse automatiquement dans l'ordre (le tri porte sur cette même valeur).
   */
  initiative: number;
  /**
   * Delta d'initiative apporté par les états posés (0 = aucun). < 0 → pastille rouge (baisse, ex.
   * Aveuglé) ; > 0 → pastille verte (rare). Alimenté pour l'écran de MJ ET la projection : la
   * modification est visible sur les deux. Absent = pas d'état chiffré sur l'initiative.
   */
  initiativeDelta?: number;
  /**
   * Valeur d'AGI effective, utilisée UNIQUEMENT pour départager les égalités d'initiative
   * (`sortByInitiative`) — jamais affichée. Absente = inconnue (bloc de créature sans caracs).
   */
  agility?: number;
  /** PV maximum. */
  maxHp: number;
  /**
   * Réserve de mana maximale du PERSONNAGE, pour le bandeau de jauges condensées de la
   * fenêtre projetée. `null` = personnage sans sort (pas de piste de mana) ; absent = ligne sans
   * mana du tout (créatures, ou personnage au profil incomplet).
   */
  manaMax?: number | null;
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

/** Côté du portrait (px) : le bandeau d'initiative collé dessous fait la MÊME largeur. */
const PORTRAIT_SIZE = 44;

/**
 * Bandeau d'initiative : rectangle aux coins BAS arrondis, collé sous le portrait (le haut reste
 * droit pour souder les deux blocs). Remplace l'ancienne pastille ronde posée À CÔTÉ du portrait :
 * on récupère ainsi ~48 px de large par colonne, donc plus de combattants tiennent dans la fenêtre
 * projetée sans défilement horizontal.
 */
function InitiativeBadge({ value, delta = 0 }: { value: number; delta?: number }) {
  // Teinte selon l'impact des états sur l'initiative : rouge si baissée (Aveuglé…), verte si
  // remontée, ambre par défaut. Même code couleur que les pastilles de stats de combat (rouge =
  // valeur diminuée par un état), pour que la modification saute aux yeux sur le MJ ET la projection.
  const tone: 'lowered' | 'raised' | 'neutral' = delta < 0 ? 'lowered' : delta > 0 ? 'raised' : 'neutral';
  return (
    <Box
      // Info-bulle native : rappelle que l'initiative est modifiée par un état (« 12 → 7 »).
      title={
        delta !== 0
          ? `Initiative modifiée par un état : ${value - delta} → ${value} (${formatSigned(delta)})`
          : undefined
      }
      sx={(t) => {
        const palette =
          tone === 'lowered' ? t.palette.error : tone === 'raised' ? t.palette.success : t.palette.warning;
        return {
          width: PORTRAIT_SIZE,
          height: 18,
          borderBottomLeftRadius: 6,
          borderBottomRightRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '0.8rem',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          color: palette.light,
          bgcolor: alpha(palette.main, 0.14),
          // Bordure sans le haut : le trait du portrait fait déjà la séparation.
          border: `1px solid ${alpha(palette.main, 0.4)}`,
          borderTop: 'none',
        };
      }}
    >
      {value}
    </Box>
  );
}

/**
 * Portrait d'un combattant : image du personnage, ou avatar rouge pour un bandit.
 * Coins BAS droits — le bandeau d'initiative se colle juste en dessous.
 */
function CombatantPortrait({ src, name }: { src?: string; name: string }) {
  if (src) {
    return (
      <Box
        component="img"
        src={src}
        alt=""
        aria-hidden
        sx={{
          width: PORTRAIT_SIZE,
          height: PORTRAIT_SIZE,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          objectFit: 'cover',
          objectPosition: 'top',
          display: 'block',
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
        width: PORTRAIT_SIZE,
        height: PORTRAIT_SIZE,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
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

/**
 * Sépare un nom numéroté en base + numéro (« Gobelin 2 » → `['Gobelin', '2']`). Les créatures sont
 * étiquetées `«<nom> <n>»` par instance (cf. `labeledCreatures` de l'écran de MJ) ; les personnages
 * n'ont pas de suffixe et repartent donc entiers dans la base.
 */
function splitNumberedName(name: string): [base: string, number: string | null] {
  const m = /^(.*\S)\s+(\d+)$/.exec(name);
  return m ? [m[1], m[2]] : [name, null];
}

/**
 * Nom d'un combattant sur UNE ligne, tronqué en « … » si la colonne est trop étroite — la largeur du
 * bloc reste ainsi identique quel que soit le nom. Le NUMÉRO d'instance (« Gobelin 2 ») est rendu à
 * part et ne rétrécit JAMAIS : c'est la seule chose qui distingue deux créatures identiques, elle ne
 * doit pas disparaître dans les points de suspension. Nom complet en infobulle native.
 */
function CombatantName({ name }: { name: string }) {
  const [base, number] = splitNumberedName(name);
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, minWidth: 0 }} title={name}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, minWidth: 0 }} noWrap>
        {base}
      </Typography>
      {number && (
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, lineHeight: 1.2, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
        >
          {number}
        </Typography>
      )}
    </Box>
  );
}

/** Portrait + bandeau d'initiative soudés en UN bloc vertical (largeur `PORTRAIT_SIZE`). */
function CombatantIdentityBlock({
  src,
  name,
  initiative,
  initiativeDelta,
}: {
  src?: string;
  name: string;
  initiative: number;
  initiativeDelta?: number;
}) {
  return (
    <Box sx={{ flexShrink: 0, width: PORTRAIT_SIZE }}>
      <CombatantPortrait src={src} name={name} />
      <InitiativeBadge value={initiative} delta={initiativeDelta} />
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

/** Pastille compacte d'une stat de combat (glyphe + valeur ; rouge si un état l'a baissée). */
function StatPill({
  glyph,
  value,
  lowered,
  malusDie,
}: {
  glyph: string;
  value: string;
  lowered: boolean;
  malusDie?: boolean;
}) {
  return (
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
      <StatPill glyph={DERIVED_STAT_ICON_PATHS.defense} value={String(defAdjusted)} lowered={defDelta < 0} />
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
          />
        );
      })}
    </Box>
  );
}

/** Côté de la taille du carré-icône d'un état (projection PER-282 + écran de MJ PER-283). */
const STATUS_ICON_SQUARE = 30;

/**
 * Style de base du carré-icône d'un état : carré translucide aux bords arrondis, avec flou
 * d'arrière-plan pour rester lisible quel que soit ce qu'il recouvre (illustration de fond, portrait
 * voisin). La `tone` porte la famille de l'état (rouge = subi, bleu = environnement, cf. `statusTone`).
 * Partagé À L'IDENTIQUE par la projection (lecture seule) et l'écran de MJ (interactif) — la seule
 * différence entre les deux tient au curseur et aux commandes ajoutées, pas au visuel.
 */
function statusSquareSx(theme: Theme, tone: StatusTone) {
  return {
    position: 'relative' as const,
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: STATUS_ICON_SQUARE,
    height: STATUS_ICON_SQUARE,
    borderRadius: 1.25,
    color: theme.palette[tone].light,
    bgcolor: alpha(theme.palette[tone].main, 0.28),
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    border: `1px solid ${alpha(theme.palette[tone].main, 0.6)}`,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
  };
}

/** Pastille « N » en coin d'un carré-icône (intensité d'un état cumulatif). */
function StatusIntensityPill({ value, tone }: { value: number; tone: StatusTone }) {
  return (
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
        bgcolor: theme.palette[tone].main,
        border: '1px solid rgba(0, 0, 0, 0.45)',
      })}
    >
      {value}
    </Box>
  );
}

/**
 * Contenu d'un carré-icône : icône game-icons de l'état (ou initiales du libellé en repli pour un effet
 * situationnel sans icône dédiée), plus la pastille d'intensité quand l'état est cumulatif et empilé.
 */
function StatusIconInner({
  id,
  intensity,
  stacked,
}: {
  id: AnyStatusEffectId;
  intensity: number;
  stacked: boolean;
}) {
  const iconId = statusIconId(id);
  return (
    <>
      {iconId ? (
        <StatusEffectIcon effect={iconId} size={20} />
      ) : (
        <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 800 }}>
          {statusLabel(id).slice(0, 2).toUpperCase()}
        </Box>
      )}
      {stacked && <StatusIntensityPill value={intensity} tone={statusTone(id)} />}
    </>
  );
}

/**
 * Icône d'un état en LECTURE SEULE pour la PROJECTION (PER-282) : le carré-icône partagé, effet
 * verbatim en info-bulle, sans aucune commande (pas de ✕/±) ni nombre ajusté (réservés au MJ).
 */
function ProjectionStatusIcon({ applied }: { applied: AppliedStatus }) {
  const { id } = applied;
  const intensity = clampIntensity(id, applied.intensity ?? 1);
  const stacked = isStackingStatus(id) && intensity > 1;
  return (
    <AppTooltip title={<StatusEffectTooltip id={id} />}>
      <Box
        aria-label={statusLabel(id)}
        sx={(theme) => ({ ...statusSquareSx(theme, statusTone(id)), cursor: 'help' })}
      >
        <StatusIconInner id={id} intensity={intensity} stacked={stacked} />
      </Box>
    </AppTooltip>
  );
}

/** Bouton ± d'ajustement d'intensité, en coin bas d'un carré-icône, révélé au survol (états cumulatifs). */
function StatusAdjustButton({
  side,
  label,
  tone,
  disabled,
  onClick,
  children,
}: {
  side: 'left' | 'right';
  label: string;
  tone: StatusTone;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <IconButton
      className="status-adjust"
      size="small"
      disabled={disabled}
      aria-label={label}
      // Stoppe la propagation pour ne PAS déclencher le retrait de l'état (clic sur le carré).
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      sx={(theme) => ({
        position: 'absolute',
        bottom: -7,
        [side]: -7,
        p: 0,
        width: 16,
        height: 16,
        // Masqués au repos, révélés au survol du carré parent (cf. `InteractiveStatusIcon`).
        opacity: 0,
        pointerEvents: 'none',
        transition: 'opacity 0.12s',
        color: theme.palette.common.white,
        bgcolor: theme.palette[tone].main,
        border: '1px solid rgba(0, 0, 0, 0.45)',
        '&:hover': { bgcolor: theme.palette[tone].dark },
        '&.Mui-disabled': { bgcolor: alpha(theme.palette[tone].main, 0.4), color: 'rgba(255, 255, 255, 0.5)' },
      })}
    >
      {children}
    </IconButton>
  );
}

/**
 * Carré-icône d'un état APPLIQUÉ sur l'écran de MJ (PER-283) : MÊME visuel que la projection (PER-282),
 * mais INTERACTIF. Cliquer le carré retire l'état ; pour un état cumulatif, la pastille ×N reste et de
 * petits boutons −/+ (ajustement d'intensité, bornés au plafond) apparaissent au survol. L'ajout d'un
 * état passe toujours par le glisser-déposer ou le menu de l'en-tête. Effet verbatim en info-bulle.
 */
function InteractiveStatusIcon({
  applied,
  onRemove,
  onAdjust,
}: {
  applied: AppliedStatus;
  onRemove: () => void;
  onAdjust: (delta: number) => void;
}) {
  const { id } = applied;
  const stacking = isStackingStatus(id);
  const intensity = clampIntensity(id, applied.intensity ?? 1);
  const max = statusMaxIntensity(id);
  const tone = statusTone(id);
  return (
    <AppTooltip title={<StatusEffectTooltip id={id} />}>
      <Box
        role="button"
        tabIndex={0}
        aria-label={`Retirer ${statusLabel(id)}`}
        onClick={onRemove}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRemove();
          }
        }}
        sx={(theme) => ({
          ...statusSquareSx(theme, tone),
          cursor: 'pointer',
          outline: 'none',
          transition: 'border-color 0.15s, background-color 0.15s',
          '&:hover, &:focus-visible': {
            bgcolor: alpha(theme.palette[tone].main, 0.42),
            borderColor: theme.palette[tone].light,
          },
          // Révèle les boutons ± d'intensité au survol / focus (états cumulatifs uniquement).
          '&:hover .status-adjust, &:focus-visible .status-adjust': { opacity: 1, pointerEvents: 'auto' },
        })}
      >
        <StatusIconInner id={id} intensity={intensity} stacked={stacking && intensity > 1} />
        {stacking && (
          <>
            <StatusAdjustButton
              side="left"
              label={`Diminuer l'intensité — ${statusLabel(id)}`}
              tone={tone}
              disabled={intensity <= 1}
              onClick={() => onAdjust(-1)}
            >
              <RemoveIcon sx={{ fontSize: 12 }} />
            </StatusAdjustButton>
            <StatusAdjustButton
              side="right"
              label={`Augmenter l'intensité — ${statusLabel(id)}`}
              tone={tone}
              disabled={intensity >= max}
              onClick={() => onAdjust(1)}
            >
              <AddIcon sx={{ fontSize: 12 }} />
            </StatusAdjustButton>
          </>
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

/**
 * Hauteur réservée en haut d'un bloc de la fenêtre PROJETÉE pour le bandeau de jauges condensées :
 * 2 pistes (PV + mana) et le filet qui les sépare. Réservée sur TOUS les blocs (créatures comprises,
 * qui n'en portent pas) pour que les portraits restent alignés d'un bloc à l'autre.
 */
const PROJECTION_GAUGES_HEIGHT = 2 * COMPACT_GAUGE_HEIGHT + COMPACT_GAUGE_ROW_GAP;

/**
 * Bandeau de jauges PV + mana d'un PERSONNAGE en fenêtre projetée, plaqué contre le bord
 * SUPÉRIEUR du bloc et HORS DU FLUX — même modèle que les cartes de joueurs de l'écran de MJ
 * (`CompactGauges` : barres très fines, sans chiffre ni contrôle, le coup d'œil seul). Les joueurs
 * voient ainsi la vie de TOUTE la table sur l'écran public ; les PV des CRÉATURES restent secrets
 * (aucun bandeau sur leurs blocs), comme leur NC. La piste de chance est volontairement omise : ce
 * n'est pas une information de combat.
 */
function ProjectionGaugesStrip({
  depletion,
  maxHp,
  manaMax,
}: {
  depletion: Depletion;
  maxHp: number;
  manaMax: number | null;
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        borderTopLeftRadius: 'inherit',
        borderTopRightRadius: 'inherit',
      }}
    >
      <CompactGauges depletion={depletion} maxHp={maxHp} manaMax={manaMax} luckMax={0} />
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
  // Bandeau de jauges de la projection : PERSONNAGES uniquement (les PV des créatures
  // restent réservés au MJ) et seulement si les PV max sont connus (profil complet).
  const showProjectionGauges = projection && !row.isCreature && row.maxHp > 0;
  return (
    <Box
      ref={interactive?.dropRef}
      sx={(t) => ({
        // Écran de MJ : 260 px, le plancher pour garder DEF + les 3 attaques sur UNE rangée de
        // pastilles sous la jauge de PV. PROJECTION : le bandeau d'initiative est passé SOUS le
        // portrait (au lieu d'une pastille ronde à côté) et il ne reste que portrait + identité →
        // 176 px suffisent, ce qui fait tenir bien plus de blocs sans défilement horizontal. Les
        // noms trop longs sont tronqués (« … ») pour que la largeur ne varie JAMAIS d'un bloc à l'autre.
        width: projection ? 176 : 260,
        flexShrink: 0,
        p: 1.25,
        // Projection : réserve FIXE en haut pour le bandeau de jauges PV/mana (hors du flux), sur
        // TOUS les blocs — un bloc de créature n'en porte pas, mais garde la même réserve, donc les
        // portraits ne se décalent jamais d'un bloc à l'autre (même parti pris que les cartes MJ).
        ...(projection && { pt: `${PROJECTION_GAUGES_HEIGHT + 6}px` }),
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
      {/* Projection : bandeau de jauges PV + mana plaqué contre le bord supérieur, hors
          du flux (la réserve `pt` du bloc lui garde la place) et écrêté par l'arrondi du bloc. */}
      {showProjectionGauges && (
        <ProjectionGaugesStrip depletion={row.depletion} maxHp={row.maxHp} manaMax={row.manaMax ?? null} />
      )}
      <Stack spacing={1}>
        {/* Identité sur UNE rangée : portrait + initiative, puis nom / joueur /
            profil À DROITE (au lieu d'une rangée dédiée en dessous) — gagne de
            la place en hauteur sur chaque bloc. En mode MJ, cet en-tête est
            cliquable et ouvre le menu à cocher des états (repli tactile de PER-279). */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            // Identité collée EN HAUT : une créature a moins de lignes qu'un personnage (nom + NC,
            // et le seul nom en projection) ; centrée, son nom tombait plus bas que celui des
            // personnages voisins. Ancré en haut, tous les noms s'alignent sur la même ligne.
            alignItems: 'flex-start',
            // Hauteur d'en-tête CONSTANTE : l'identité fait 2 lignes pour une créature (nom + NC)
            // mais 3 pour un personnage (nom + joueur + profil). Sans plancher, la jauge de PV et
            // les pastilles de stats démarreraient plus haut sur les créatures → colonnes désalignées.
            // Le bloc portrait + bandeau d'initiative (62 px) tient déjà ce rôle, le plancher reste
            // en filet de sécurité si le portrait venait à rétrécir.
            minHeight: 62,
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
          <CombatantIdentityBlock
            src={row.portraitSrc}
            name={row.name}
            initiative={row.initiative}
            initiativeDelta={row.initiativeDelta}
          />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <CombatantName name={row.name} />
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
            Masquée en projection, où elle prendrait trop de hauteur : les personnages y ont à la
            place le bandeau de jauges condensées PV + mana, et les PV des créatures
            restent réservés au MJ. */}
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
        {/* États appliqués (écran de MJ) : MÊMES carrés-icônes que la projection (PER-283), mais
            interactifs — clic = retrait, ±N au survol pour les cumulatifs. Effet verbatim en tooltip. */}
        {status && status.applied.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {status.applied.map((s) => (
              <InteractiveStatusIcon
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
        {buildStatusGroups(controls.situationalIds).flatMap((group, groupIndex) => [
          // Le groupe des états préjudiciables (toujours en tête) n'a pas de sous-titre : il est
          // universel et implicite. Seul le groupe « Effets situationnels » (conditionnel) en garde un.
          ...(groupIndex === 0
            ? []
            : [
                <ListSubheader key={group.title} sx={{ bgcolor: 'transparent', lineHeight: '2.2em' }}>
                  {group.title}
                </ListSubheader>,
              ]),
          ...group.ids.map((id) => {
            const iconId = statusIconId(id);
            const on = appliedIds.has(id);
            // Même code couleur que les puces/carrés : l'icône du menu porte la teinte de la famille.
            const toneColor = `${statusTone(id)}.light`;
            return (
              <MenuItem key={id} selected={on} onClick={() => toggle(id)} dense>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  {on && <CheckIcon fontSize="small" color="primary" />}
                </ListItemIcon>
                {iconId && <StatusEffectIcon effect={iconId} size={16} sx={{ mr: 1, color: toneColor }} />}
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
   * Compteur de MANCHE affiché à côté du titre (« Tour N »). Toujours ≥ 1 (un « Tour 0 » n'existe
   * pas). Contrôlé/persisté par l'appelant, comme le tour courant. Optionnel : la projection ne
   * l'affiche pas (en-tête masqué). Réservé au MJ (auteur unique).
   */
  roundNumber?: number;
  /**
   * Fixe le compteur de manche (valeur absolue, bornée à ≥ 1 par l'appelant). Appelé à l'incrément
   * automatique de fin de manche (« Tour suivant » qui reboucle) et par les réglages manuels (±).
   * Absent en projection.
   */
  onRoundNumberChange?: (roundNumber: number) => void;
  /**
   * Recommence le décompte des manches (bouton ⟳ de l'en-tête) : remet le compteur à 1 ET
   * repositionne le tour courant sur le premier de l'ordre d'initiative (`rows[0]`). Ne touche NI
   * aux états NI aux PV. Fallback sur `onRoundNumberChange(1)` si absent. Absent en projection.
   */
  onRestartRounds?: () => void;
  /**
   * Mode PROJECTION (PER-248) : la fenêtre « présentation » destinée à être projetée
   * pour les joueurs. On y masque tout ce qui est réservé au MJ ou qui prend de la place
   * inutilement — jauge de PV interactive, NC et PV des créatures, en-tête et bouton
   * « Tour suivant ». Le tour courant reste mis en évidence (piloté depuis l'écran de MJ,
   * reflété ici via la synchro). Ne restent que le bandeau de jauges PV + mana des
   * personnages, portrait + initiative + identité, et les badges d'états en
   * lecture seule (PER-282) — en compact.
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
  roundNumber = 1,
  onRoundNumberChange,
  onRestartRounds,
  projection = false,
  headerAction,
  statusControls,
}: InitiativeTrackerProps) {
  // Premier de l'ordre d'initiative (les `rows` sont déjà triées par l'appelant) : cible du
  // repositionnement du bouton ⟳ « recommencer le décompte ». `null` si le roster est vide.
  const firstTurnKey = rows[0]?.key ?? null;
  const advanceTurn = () => {
    if (rows.length === 0) return;
    const idx = rows.findIndex((r) => r.key === currentTurnKey);
    // Introuvable (−1, ex. bandit retiré) ou pas encore démarré → on démarre au premier.
    const next = idx < 0 ? 0 : (idx + 1) % rows.length;
    onCurrentTurnKeyChange(rows[next].key);
    // Fin de tour d'initiative : on reboucle sur le premier combattant (next === 0) alors qu'on
    // était DÉJÀ dans la liste (idx ≥ 0) → nouvelle manche, « Tour N » +1. Le démarrage depuis un
    // tour courant absent (idx < 0) N'incrémente PAS : le combat est déjà à la manche 1.
    if (next === 0 && idx >= 0) onRoundNumberChange?.(roundNumber + 1);
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
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {"Ordre d'initiative"}
          </Typography>
          {/* Compteur de manche (« Tour N », toujours ≥ 1) : +1 auto en fin de tour d'initiative,
              ajustable (±) et « recommencé » par le bouton ⟳ (→ Tour 1 + tour courant au premier de
              l'initiative). La réinitialisation du combat (PER-283) le ramène aussi à 1. */}
          {onRoundNumberChange && (
            <Stack
              direction="row"
              spacing={0.25}
              sx={{
                alignItems: 'center',
                pl: 1,
                pr: 0.25,
                py: 0.25,
                borderRadius: 1.5,
                border: (t) => `1px solid ${alpha(t.palette.divider, 0.8)}`,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                {`Tour ${roundNumber}`}
              </Typography>
              <IconButton
                size="small"
                onClick={() => onRoundNumberChange(roundNumber - 1)}
                disabled={roundNumber <= 1}
                aria-label="Manche précédente"
                title="Manche précédente"
              >
                <RemoveIcon fontSize="inherit" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onRoundNumberChange(roundNumber + 1)}
                aria-label="Manche suivante"
                title="Manche suivante"
              >
                <AddIcon fontSize="inherit" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => (onRestartRounds ? onRestartRounds() : onRoundNumberChange(1))}
                disabled={roundNumber === 1 && currentTurnKey === firstTurnKey}
                aria-label="Recommencer le décompte des manches (Tour 1, premier combattant)"
                title="Recommencer (Tour 1, premier combattant)"
              >
                <RestartAltIcon fontSize="inherit" />
              </IconButton>
            </Stack>
          )}
          <Box sx={{ flexGrow: 1 }} />
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

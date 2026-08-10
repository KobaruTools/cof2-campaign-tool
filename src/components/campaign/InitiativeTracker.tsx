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
 * La PROJECTION porte en plus, sur les blocs du CAMP DES JOUEURS (personnages et créatures ALLIÉES),
 * un bandeau de jauges condensées PV + mana plaqué en haut du bloc (`CompactGauges`, même modèle que
 * les cartes de joueurs de l'écran de MJ) — la table voit ainsi la vie de tous les siens sur l'écran
 * public, PNJ compagnons compris. Les PV des créatures ADVERSES restent masqués, comme leur NC.
 *
 * CRÉATURE À 0 PV : en PROJECTION, son bloc est désaturé de moitié, barré et surmonté d'un
 * pictogramme (`IncapacitatedOverlay`) — c'est ce qui annonce son sort aux joueurs, puisque ses PV ne
 * leur sont pas montrés. Deux issues distinguées (p. 219-220) : TUÉE par des dégâts létaux (croix
 * ROUGE + tête de mort) ou ASSOMMÉE par des dégâts temporaires seuls, donc inconsciente et pas morte
 * (croix JAUNE + tourbillon d'étourdissement). Réservé aux créatures : un personnage à 0 PV est à
 * terre / mourant (p. 220), pas mort.
 *
 * ÉTATS DÉDUITS EN PROJECTION : « affaibli » (1 PV, p. 220) est montré à la table pour tout le CAMP
 * DES JOUEURS — personnages ET créatures alliées. Le masquage protège le seul secret des PV d'un
 * ADVERSAIRE ; du côté des joueurs, la barre de vie est déjà projetée et l'information est utile.
 *
 * RELÉGATION EN FIN DE BANDE (PER-302), écran de MJ uniquement : un combat qui s'étire ne doit pas
 * obliger le MJ à défiler à travers les cadavres pour atteindre les vivants. Les cartes hors du
 * chemin sont donc regroupées à la fin — d'abord les créatures MASQUÉES aux joueurs (renforts pas
 * encore entrés en scène), puis les créatures VAINCUES — et estompées d'autant. L'initiative reste la
 * clé de tri à l'intérieur de chaque groupe (`relegateSidelined`), rien n'est jamais supprimé ni
 * replié derrière un bouton, et le combattant ACTIF est toujours épargné : mettre à 0 PV la créature
 * en train de jouer ne la fait pas filer sous le curseur. « Tour suivant » saute les créatures
 * vaincues (leur tour n'existe plus) mais JAMAIS un personnage à 0 PV (p. 220) ; on peut toujours
 * redonner la main à une créature vaincue en cliquant son bandeau d'initiative. La PROJECTION est
 * inchangée : elle rend l'ordre nu, pour que la croix reste l'annonce de la mort.
 *
 * CONFORT DE DÉFILEMENT (PER-298) : la bande signale ce qui reste hors champ par des ESTOMPES en
 * dégradé sur ses bords — valables aussi en projection, où elles disent à la table qu'il y a
 * d'autres combattants. Deux CHEVRONS d'une carte par clic et une barre de défilement épaissie
 * complètent l'écran de MJ (l'écran projeté n'a pas de souris : pas de chevrons). Détourner la
 * molette VERTICALE vers un défilement horizontal a été essayé puis RETIRÉ (propriétaire,
 * 2026-08-04) : ne pas le réintroduire.
 *
 * PILOTAGE DU TOUR (PER-299) : trois entrées, toutes réservées à l'écran de MJ. « Tour suivant » et
 * « Tour précédent » avancent/reculent d'un cran dans l'ordre d'initiative, avec incrément ou
 * décrément de manche au bouclage (`stepTurn`, borné à « Tour 1 »). Les RACCOURCIS `N`/→ et `P`/←
 * font la même chose sans quitter les dés des yeux — inertes en projection, dans un champ de saisie,
 * ou sous une modale / un menu / le panneau latéral de fiche. Enfin, cliquer le BANDEAU
 * D'INITIATIVE d'une carte donne le tour à ce combattant SANS toucher au compteur de manche (c'est
 * une correction de position) : l'en-tête de la carte reste, lui, dévolu au menu des états.
 *
 * DENSITÉ DES CARTES (PER-300) : une bascule « Détaillé / Compact » dans l'en-tête ramène les cartes
 * de l'écran de MJ de 260 à 176 px — la largeur de la projection — et fait passer ~5 combattants
 * visibles à ~8. Ce qui reste en compact : identité, bandeau d'initiative, badges d'états EN ENTIER
 * (raison d'être du tracker), DEF, et les PV en barre fine dont le clic ouvre le popover de dégâts /
 * soin (`CompactHpControl` : le geste le plus fréquent après « tour suivant » ne doit pas coûter un
 * changement de mode). Ce qui se replie : les attaques, en info-bulle. Le réglage est une préférence
 * d'affichage LOCALE (`localStorage`), jamais poussée dans l'état de combat partagé — la projection
 * l'ignore et son rendu est inchangé. Le DÉTAILLÉ en était le défaut ; PER-301 l'inverse (voir plus
 * bas), le compact portant désormais la barre permanente.
 *
 * BARRE PERMANENTE (PER-301) : la bande se COLLE au bas de l'écran de MJ (`position: sticky`, fond
 * dépoli) — le combattant actif et « Tour suivant » restent donc à portée quand on descend consulter
 * une carte, ce qui obligeait jusqu'ici à remonter toute la page. Le collage est réservé au COMPACT
 * (le détaillé, deux fois plus haut, mangerait la moitié de l'écran) et désactivé sous `md` (sur un
 * téléphone, il ne resterait rien à lire) ; le compact devient DU MÊME COUP le défaut de l'écran de
 * MJ, sans quoi la barre permanente resterait invisible derrière une bascule à trouver. C'est le BAS
 * et non le haut : la bande est en fin de flux, après les trois grilles de cartes — un `sticky top`
 * ne collerait qu'une fois qu'on a défilé jusqu'à elle, il aurait fallu remonter le bloc avant les
 * grilles et réordonner l'écran.
 *
 * La PALETTE d'états (`statusPalette`) déménage à cette occasion DANS le tracker, entre l'en-tête et
 * la bande, derrière un bouton « États » qui la replie : elle vivait au-dessus dans le flux de la
 * page, d'où elle sortait de l'écran dès qu'on défilait — le glisser-déposer devenait alors
 * impossible, la SOURCE du geste étant hors champ. Elle est ouverte par défaut en détaillé (le rendu
 * d'avant, la palette y est un meuble permanent) et fermée par défaut en compact (la barre collante
 * doit rester basse) ; les deux choix se persistent séparément.
 *
 * ÉTATS DÉDUITS : les états d'une ligne (`row.appliedStatuses`) peuvent venir du MJ ou de la
 * SITUATION du combattant (affaibli à 1 PV, p. 220). Les seconds sont rendus en JAUNE et en lecture
 * seule, et RÉSERVÉS À L'ÉCRAN DE MJ : ils comptent dans les stats ajustées de sa carte (dé malus à
 * tous les tests) mais ne sont pas retirables (ils s'effacent dès que les PV remontent) et ne
 * paraissent JAMAIS en projection — un tel badge révélerait aux joueurs que la créature est à 1 PV,
 * alors que ses PV leur sont masqués.
 */
import { forwardRef, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import CheckIcon from '@mui/icons-material/Check';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DensityMediumIcon from '@mui/icons-material/DensityMedium';
import DensitySmallIcon from '@mui/icons-material/DensitySmall';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha, type Theme } from '@mui/material/styles';
import { useDroppable } from '@dnd-kit/core';
import { ClassIcon } from '@/components/ClassIcon';
import type { BeneficialEffectId, SituationalEffectId } from '@/data/schema';
import type { Depletion, PortraitVariant } from '@/lib/character/types';
import { useCharacterPortraitSrc } from '@/lib/storage/useCharacterPortraitSrc';
import {
  clampIntensity,
  isStackingStatus,
  resolveStatusModifiers,
  statusMaxIntensity,
  statusRemainingRounds,
  STATUS_DURATION_MAX,
  type AnyStatusEffectId,
  type AppliedStatus,
  type EffectiveStatus,
  type ResolvedStatusModifiers,
} from '@/lib/character/statusEffects';
import { currentHp, hpHealthState, type HealthState } from '@/lib/character/gauges';
import { centeredScrollLeft } from '@/lib/ui/centerScroll';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';
import {
  scrollEdges,
  stepScrollLeft,
  type ScrollDirection,
  type ScrollEdges,
  type ScrollMetrics,
} from '@/lib/ui/horizontalScroll';
import { stepTurn, turnDirectionFromKey, type TurnDirection } from '@/lib/ui/turnOrder';
import { isDefeatedCreature, relegateSidelined } from '@/lib/session/initiativeOrder';
import type { CreatureSide } from '@/lib/ui/creature';
import { crossOutBackgroundImage } from '@/lib/ui/crossOut';
import { AppTooltip } from '@/components/AppTooltip';
import { CollapsibleLabelButton } from '@/components/CollapsibleLabelButton';
import { SkullIcon } from '@/components/SkullIcon';
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
  originStatusTone,
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
   * Id du profil (ex. `'guerrier'`) — pour l'icône de classe (`ClassIcon`) du condensé replié de
   * la fiche. Absent pour les créatures, qui n'ont pas de profil.
   */
  classId?: string;
  /**
   * Variante de portrait du personnage (PER-391) — `'custom'` déclenche la résolution du
   * portrait personnalisé via `useCharacterPortraitSrc` dans `CombatantColumn` ; absente (ou
   * `'default'`/`'alt'`) → `portraitSrc` (illustration statique) reste tel quel. Absente pour
   * les créatures, qui n'ont pas de portrait personnalisable.
   */
  portraitVariant?: PortraitVariant;
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
   * États de combat EFFECTIFS de ce combattant : ceux que le MJ a posés (`origin: 'manual'`) PLUS
   * ceux déduits de sa situation (`origin: 'auto'`, ex. affaibli à 1 PV, p. 220). Alimenté pour
   * TOUTES les lignes (MJ et projection), à charge pour le rendu de trier : l'écran de MJ montre les
   * deux (les commandes ✕/± n'étant ouvertes que sur les états POSÉS — un état déduit n'est pas
   * retirable à la main, il suit les PV), la projection ne montre que les états POSÉS.
   */
  appliedStatuses?: EffectiveStatus[];
  /** Dépletion courante (manque létal + temporaire). */
  depletion: Depletion;
  onDamage: (amount: number, kind: DamageKind) => void;
  onHeal: (amount: number) => void;
  onReset: () => void;
  /** Clé `localStorage` de l'état déplié de la jauge (unique par ligne). */
  persistKey: string;
  /**
   * Camp de la créature (PER-249). Absent pour les personnages joueurs. Au-delà de l'accent de
   * couleur (`accentColor`), il décide de ce que la PROJECTION révèle : les états DÉDUITS des PV
   * (« affaibli » à 1 PV) sont montrés à la table pour un ALLIÉ, masqués pour un adversaire dont les
   * PV doivent rester secrets.
   */
  side?: CreatureSide;
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
  /**
   * Buffs de GROUPE débloqués par la table (PER-104). Le groupe « Buffs de groupe » du menu (et la
   * 4e ligne de la palette) n'apparaît que s'il est non vide. Absent = aucun.
   */
  groupBuffIds?: readonly BeneficialEffectId[];
  /** Applique un état sur un combattant (intensité 1). */
  onApply: (combatantKey: string, id: AnyStatusEffectId) => void;
  /** Retire un état d'un combattant. */
  onRemove: (combatantKey: string, id: AnyStatusEffectId) => void;
  /**
   * Demande la POSE D'UN BUFF DE GROUPE (PER-104) depuis le combattant `combatantKey`, tenu pour le
   * porteur du sort : c'est l'écran de MJ qui ouvre alors sa fenêtre de pose (choix des combattants du
   * camp, palier, durée). Le tracker ne pose donc JAMAIS un buff de groupe lui-même — sans ce
   * callback, la ligne verte disparaît du menu comme de la palette.
   */
  onOpenGroupBuff?: (combatantKey: string, id: BeneficialEffectId) => void;
  /** Ajuste de `delta` (±) l'intensité d'un état cumulatif d'un combattant (PER-280). */
  onAdjust: (combatantKey: string, id: AnyStatusEffectId, delta: number) => void;
  /**
   * Ajuste de `delta` (±) le COMPTEUR DE TOURS d'un état posé (PER-305). Sans compteur, `+1` l'amorce
   * à 1 tour ; descendre sous 1 le retire (durée redevenue indéterminée) sans retirer l'état.
   */
  onAdjustDuration: (combatantKey: string, id: AnyStatusEffectId, delta: number) => void;
}

/** Côté du portrait (px) : le bandeau d'initiative collé dessous fait la MÊME largeur. */
const PORTRAIT_SIZE = 44;

/**
 * Largeur (px) d'une carte en mode DÉTAILLÉ — l'affichage par défaut de l'écran de MJ. C'est un
 * plancher imposé par le contenu : il faut faire tenir la DEF et les trois valeurs d'attaque sur une
 * seule rangée de pastilles sous la jauge de PV complète.
 */
const COLUMN_WIDTH_DETAILED = 260;

/**
 * Largeur (px) d'une carte en mode COMPACT (PER-300) et en PROJECTION : la même, éprouvée de longue
 * date sur l'écran projeté, où le bloc se limite au portrait, au bandeau d'initiative et à
 * l'identité. Sur l'écran de MJ, elle fait passer le nombre de combattants visibles de ~5 à ~8 — le
 * vrai remède au défilement, dont PER-297 et PER-298 n'ont rendu que le symptôme supportable.
 */
const COLUMN_WIDTH_COMPACT = 176;

/**
 * Bandeau d'initiative : rectangle aux coins BAS arrondis, collé sous le portrait (le haut reste
 * droit pour souder les deux blocs). Remplace l'ancienne pastille ronde posée À CÔTÉ du portrait :
 * on récupère ainsi ~48 px de large par colonne, donc plus de combattants tiennent dans la fenêtre
 * projetée sans défilement horizontal.
 *
 * DONNER LE TOUR (PER-299) : sur l'écran de MJ, ce bandeau — jusqu'ici purement décoratif — devient
 * la zone cliquable qui donne le tour au combattant. Le geste ne pouvait PAS porter sur l'en-tête de
 * la carte (portrait + nom), déjà réservé au menu des états (PER-279) : c'est le geste le plus
 * utilisé de l'écran, il n'est pas question de le lui disputer. Le clic est donc arrêté ici
 * (`stopPropagation`) pour ne pas remonter à l'en-tête et ouvrir le menu par-dessus.
 */
function InitiativeBadge({
  value,
  delta = 0,
  combatantName,
  onGiveTurn,
}: {
  value: number;
  delta?: number;
  /** Nom du combattant, pour l'info-bulle et l'étiquette d'accessibilité de l'action. */
  combatantName: string;
  /** Donne le tour à ce combattant. Absent (projection) ⇒ bandeau décoratif, comme avant. */
  onGiveTurn?: () => void;
}) {
  // Teinte selon l'impact des états sur l'initiative : rouge si baissée (Aveuglé…), verte si
  // remontée, ambre par défaut. Même code couleur que les pastilles de stats de combat (rouge =
  // valeur diminuée par un état), pour que la modification saute aux yeux sur le MJ ET la projection.
  const tone: 'lowered' | 'raised' | 'neutral' = delta < 0 ? 'lowered' : delta > 0 ? 'raised' : 'neutral';
  // Explication du delta d'état sur l'initiative (« 12 → 7 »), réutilisée par les deux info-bulles.
  const deltaNote =
    delta !== 0
      ? `Initiative modifiée par un état : ${value - delta} → ${value} (${formatSigned(delta)})`
      : null;
  const badge = (
    <Box
      // Info-bulle NATIVE quand le bandeau est décoratif (projection) : rien à annoncer d'autre que
      // le delta. Le chemin cliquable passe par une vraie info-bulle (voir plus bas).
      title={onGiveTurn ? undefined : deltaNote ?? undefined}
      {...(onGiveTurn && {
        role: 'button',
        tabIndex: 0,
        'aria-label': `Donner le tour à ${combatantName}`,
        // Arrête le clic AVANT l'en-tête cliquable qui englobe ce bandeau : sans ça, donner le tour
        // ouvrirait aussi le menu des états par-dessus la carte.
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          onGiveTurn();
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onGiveTurn();
          }
        },
      })}
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
          // Écran de MJ : le bandeau s'annonce cliquable (curseur + teinte au survol/focus). Aucune
          // dimension ne change — la mise en page des cartes reste identique au pixel.
          ...(onGiveTurn && {
            cursor: 'pointer',
            outline: 'none',
            transition: 'background-color 0.15s, border-color 0.15s',
            '&:hover, &:focus-visible': {
              bgcolor: alpha(palette.main, 0.34),
              borderColor: palette.light,
            },
          }),
        };
      }}
    >
      {value}
    </Box>
  );
  if (!onGiveTurn) return badge;
  return (
    <AppTooltip
      title={
        <>
          {`Donner le tour à ${combatantName}`}
          {deltaNote && (
            <Box component="span" sx={{ display: 'block', mt: 0.5, opacity: 0.8 }}>
              {deltaNote}
            </Box>
          )}
        </>
      }
    >
      {badge}
    </AppTooltip>
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
  onGiveTurn,
}: {
  src?: string;
  name: string;
  initiative: number;
  initiativeDelta?: number;
  /** Donne le tour à ce combattant (écran de MJ) : porté par le seul bandeau d'initiative. */
  onGiveTurn?: () => void;
}) {
  return (
    <Box sx={{ flexShrink: 0, width: PORTRAIT_SIZE }}>
      <CombatantPortrait src={src} name={name} />
      <InitiativeBadge
        value={initiative}
        delta={initiativeDelta}
        combatantName={name}
        onGiveTurn={onGiveTurn}
      />
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

/**
 * Rangée DEF + attaques d'une carte COMPACTE (PER-300). Sur 176 px, les quatre pastilles du mode
 * détaillé ne tiennent pas sur une ligne : on garde donc VISIBLE la seule DEF — la valeur la plus
 * consultée en combat, celle qu'on compare à chaque jet d'attaque — et les attaques se replient
 * derrière une pastille unique qui les détaille en info-bulle. Les valeurs restent ajustées par les
 * états exactement comme en détaillé, et le DÉ MALUS reste porté par la pastille repliée : sa
 * présence est une information de jeu, elle ne doit pas se perdre dans le repli.
 */
function CompactCombatStatsRow({
  stats,
  resolved,
}: {
  stats: CombatStats;
  resolved: ResolvedStatusModifiers;
}) {
  const defDelta = resolved.derived.def ?? 0;
  const attackMalusDie = resolved.allTestsMalusDie || resolved.attackTestsMalusDie;
  // Attaques ajustées, calculées une fois pour l'info-bulle : même arithmétique que `CombatStatsRow`
  // (delta du type d'attaque + malus plat « à tous les tests »).
  const attacks = stats.attacks.map((atk) => {
    const delta = (resolved.derived[ATTACK_KIND_DERIVED[atk.kind]] ?? 0) + resolved.allTestsFlat;
    return { ...atk, adjusted: atk.base + delta, lowered: delta < 0 };
  });
  // Une seule attaque baissée suffit à teinter la pastille repliée en rouge : sans ça, le repli
  // masquerait le fait qu'un état a mordu sur les attaques.
  const anyLowered = attacks.some((a) => a.lowered);
  return (
    <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center' }}>
      <StatPill
        glyph={DERIVED_STAT_ICON_PATHS.defense}
        value={String(stats.def + defDelta)}
        lowered={defDelta < 0}
      />
      {attacks.length > 0 && (
        <AppTooltip
          title={
            <Box>
              {attacks.map((a) => (
                <Box key={a.key} sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                  <span>{a.label}</span>
                  <Box
                    component="span"
                    sx={{ fontWeight: 700, color: a.lowered ? 'error.light' : 'inherit' }}
                  >
                    {formatSigned(a.adjusted)}
                  </Box>
                </Box>
              ))}
              {attackMalusDie && (
                <Box sx={{ mt: 0.5, opacity: 0.8 }}>Dé malus aux tests d&apos;attaque</Box>
              )}
            </Box>
          }
        >
          {/* `flexGrow: 0` : contrairement aux pastilles du mode détaillé (qui se répartissent la
              largeur), celle-ci reste au strict minimum — la DEF prend tout le reste. */}
          <Box sx={{ display: 'flex', flexGrow: 0, cursor: 'help' }}>
            <StatPill
              glyph={DERIVED_STAT_ICON_PATHS.meleeAttack}
              value="…"
              lowered={anyLowered}
              malusDie={attackMalusDie}
            />
          </Box>
        </AppTooltip>
      )}
    </Box>
  );
}

/**
 * Libellé des états de santé préjudiciables (p. 219-220) pour la carte COMPACTE : sur 176 px, le
 * badge textuel de `HpGauge` ne tient pas, donc l'état se lit à la COULEUR du chiffre de PV et se
 * nomme dans l'info-bulle. Le verbatim de règle reste accessible : le popover de dégâts rend la
 * `HpGauge` complète, badge compris.
 */
const COMPACT_HEALTH_LABEL: Record<Exclude<HealthState, 'normal'>, string> = {
  weakened: 'Affaibli',
  down: 'À terre / mourant',
  stunned: 'Assommé',
};

/** Teinte du chiffre de PV d'une carte compacte selon l'état de santé (cf. `HealthStateBadge`). */
const COMPACT_HEALTH_COLOR: Record<HealthState, string> = {
  normal: 'text.primary',
  weakened: 'warning.light',
  down: 'error.light',
  stunned: 'secondary.light',
};

/**
 * PV d'une carte COMPACTE (PER-300) : jauge fine (`CompactGauges`, même barre que les cartes de
 * joueurs et la projection) + le chiffre `courant / max`, sur UNE ligne cliquable qui ouvre le
 * popover de dégâts / soin.
 *
 * Pourquoi un popover et pas une révélation au survol : infliger des dégâts est le geste le plus
 * fréquent après « tour suivant », et il demande un MONTANT (« le gobelin prend 7 ») — des boutons
 * ±1 révélés au survol ne remplacent pas le formulaire. Le popover rend donc la `HpGauge` COMPLÈTE,
 * formulaire déplié : rien n'est perdu par rapport au mode détaillé, et aucune logique n'est
 * dupliquée. Il ne peut pas s'agir d'un dépliage de la carte au clic : ses deux zones cliquables
 * sont déjà prises (en-tête = menu des états, bandeau d'initiative = donner le tour).
 *
 * Seuls les PV sont montrés (`manaMax: null`) : une seconde piste sur les seuls personnages
 * rouvrirait le désalignement créatures / personnages que le plancher d'en-tête existe pour éviter.
 * Le mana de la table se lit sur les cartes de joueurs de l'écran de MJ.
 *
 * EXPORTÉE (nouvelle demande, écran de MJ) : paramétrée sur les seuls champs dont elle a besoin
 * (pas tout un `InitiativeRow`) pour être réutilisable ailleurs qu'ici — `GmScreenCompanionCard`
 * (roster « Compagnons ») en fait la barre de vie « en haut du bloc », condensée comme sur une
 * carte de joueur, à la place de l'ancienne `HpGauge` complète qui prenait la moitié de la carte.
 */
export function CompactHpControl({
  name,
  maxHp,
  depletion,
  onDamage,
  onHeal,
  onReset,
  persistKey,
}: {
  /** Nom du combattant (info-bulle + libellé d'accessibilité, et titre du popover). */
  name: string;
  maxHp: number;
  depletion: Depletion;
  onDamage: (amount: number, kind: DamageKind) => void;
  onHeal: (amount: number) => void;
  onReset: () => void;
  /** Clé `localStorage` de l'état déplié de la `HpGauge` DANS le popover. */
  persistKey: string;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const current = currentHp(maxHp, depletion);
  const state = hpHealthState(maxHp, depletion);
  const healthNote = state === 'normal' ? null : COMPACT_HEALTH_LABEL[state];
  return (
    <>
      <AppTooltip
        title={
          <>
            {`PV ${current} / ${maxHp} — cliquer pour infliger des dégâts ou soigner`}
            {healthNote && (
              <Box component="span" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                {healthNote}
              </Box>
            )}
          </>
        }
      >
        <Box
          role="button"
          tabIndex={0}
          aria-label={`Points de vie de ${name} : ${current} sur ${maxHp} — infliger des dégâts ou soigner`}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setAnchorEl(e.currentTarget as HTMLElement);
            }
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 0.5,
            py: 0.5,
            borderRadius: 1,
            cursor: 'pointer',
            outline: 'none',
            transition: 'background-color 0.15s',
            '&:hover, &:focus-visible': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
          }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <CompactGauges depletion={depletion} maxHp={maxHp} manaMax={null} luckMax={0} />
          </Box>
          <Box
            component="span"
            sx={{
              flexShrink: 0,
              fontSize: '0.8rem',
              fontWeight: 700,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              color: COMPACT_HEALTH_COLOR[state],
            }}
          >
            {current}
            <Box component="span" sx={{ opacity: 0.6, fontWeight: 500 }}>{`/${maxHp}`}</Box>
          </Box>
        </Box>
      </AppTooltip>
      <Popover
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {/* Largeur confortable, indépendante des 176 px de la carte : le popover flotte au-dessus
            de la bande, c'est justement ce qui permet de garder la carte étroite. */}
        <Box sx={{ p: 1.5, width: 320 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }} noWrap>
            {name}
          </Typography>
          <HpGauge
            depletion={depletion}
            maxHp={maxHp}
            onDamage={onDamage}
            onHeal={onHeal}
            onReset={onReset}
            persistKey={`${persistKey}:compact`}
            defaultExpanded
          />
        </Box>
      </Popover>
    </>
  );
}

/** Côté de la taille du carré-icône d'un état (projection PER-282 + écran de MJ PER-283). */
const STATUS_ICON_SQUARE = 30;

/**
 * Gouttière entre deux badges d'états de l'écran de MJ, en unités d'espacement MUI (1.25 = 10 px).
 * Élargie en PER-305 (elle valait 6 px) : les boutons ±, passés sur les CÔTÉS du carré, en débordent
 * de la moitié de leur largeur et venaient recouvrir le bord du badge voisin.
 */
const STATUS_BADGE_GAP = 1.25;

/**
 * Style de base du carré-icône d'un état : carré translucide aux bords arrondis, avec flou
 * d'arrière-plan pour rester lisible quel que soit ce qu'il recouvre (illustration de fond, portrait
 * voisin). La `tone` porte la famille de l'état (rouge = subi, bleu = environnement, vert = buff de
 * groupe, jaune = déduit — cf. `statusTone` / `originStatusTone`).
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

/**
 * Pastille chiffrée d'un carré-icône, centrée sur un de ses bords : l'INTENSITÉ d'un état cumulatif
 * en haut (« ×N »), le COMPTEUR DE TOURS en bas (« Nt », PER-305).
 *
 * CENTRÉES et non en coin (l'intensité l'était jusqu'en PER-305) : les boutons ± bordent maintenant le
 * carré sur les CÔTÉS, à mi-hauteur ou empilés, et recouvraient une pastille de coin — or c'est
 * précisément en cliquant ± qu'on a besoin de lire la valeur qu'on règle. Les deux axes se répartissent
 * donc : les nombres sur les bords haut/bas, les commandes sur les côtés.
 *
 * `variant` porte la lecture : `intensity` en plein dans la teinte de l'état, `duration` en pastille
 * sombre cerclée de cette teinte, `expired` en ambre — un compteur à 0 n'a PAS retiré l'état (le MJ
 * garde la main), il signale juste que sa durée est passée.
 */
function StatusCountPill({
  edge,
  variant,
  tone,
  label,
  children,
}: {
  edge: 'top' | 'bottom';
  variant: 'intensity' | 'duration' | 'expired';
  tone: StatusTone;
  /** Étiquette d'accessibilité ; absente pour l'intensité, déjà lisible dans le libellé du badge. */
  label?: string;
  children: ReactNode;
}) {
  return (
    <Box
      component="span"
      aria-label={label}
      sx={(theme) => ({
        position: 'absolute',
        [edge]: -6,
        left: '50%',
        transform: 'translateX(-50%)',
        minWidth: 16,
        height: 14,
        px: 0.25,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '999px',
        fontSize: '0.575rem',
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        color: theme.palette.common.white,
        bgcolor:
          variant === 'duration'
            ? alpha(theme.palette.common.black, 0.82)
            : variant === 'expired'
              ? theme.palette.warning.main
              : theme.palette[tone].main,
        border: `1px solid ${
          variant === 'duration' ? alpha(theme.palette[tone].main, 0.85) : 'rgba(0, 0, 0, 0.45)'
        }`,
      })}
    >
      {children}
    </Box>
  );
}

/**
 * Contenu d'un carré-icône : icône game-icons de l'état (ou initiales du libellé en repli pour un effet
 * situationnel sans icône dédiée), plus la pastille d'intensité quand l'état est cumulatif et empilé et
 * celle du compteur de tours quand une durée est posée (PER-305).
 */
function StatusIconInner({
  id,
  intensity,
  stacked,
  remaining,
}: {
  id: AnyStatusEffectId;
  intensity: number;
  stacked: boolean;
  /** Tours restants du compteur de durée. `undefined` = aucun compteur (durée indéterminée). */
  remaining?: number;
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
      {stacked && (
        <StatusCountPill edge="top" variant="intensity" tone={statusTone(id)}>
          ×{intensity}
        </StatusCountPill>
      )}
      {remaining !== undefined && (
        <StatusCountPill
          edge="bottom"
          variant={remaining === 0 ? 'expired' : 'duration'}
          tone={statusTone(id)}
          label={
            remaining === 0
              ? 'durée écoulée'
              : `${remaining} tour${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}`
          }
        >
          {remaining}t
        </StatusCountPill>
      )}
    </>
  );
}

/**
 * Liseré TIRETÉ du carré-icône d'un état dont le compteur de tours est échu (PER-305) : l'état est
 * toujours posé (aucun retrait automatique), mais sa durée est passée — le MJ doit le retirer ou le
 * prolonger. Signal volontairement discret : un état échu reste actif tant qu'il est là.
 */
function expiredSquareSx(theme: Theme) {
  return {
    borderStyle: 'dashed' as const,
    borderColor: theme.palette.warning.light,
  };
}

/**
 * Icône d'un état en LECTURE SEULE : le carré-icône partagé, effet verbatim en info-bulle, sans
 * aucune commande (pas de ✕/±) ni nombre ajusté. Deux emplois :
 *  - les états posés affichés en PROJECTION (PER-282), qui n'est jamais auteur ;
 *  - les états DÉDUITS (`origin: 'auto'`) sur l'écran de MJ — jaunes, et non retirables puisqu'ils
 *    ne sont pas de son fait : ils s'effacent d'eux-mêmes quand la condition cesse (PV remontés).
 */
function ReadonlyStatusIcon({
  applied,
  roundNumber,
}: {
  applied: EffectiveStatus;
  /**
   * Manche courante, pour dériver les tours restants du compteur de durée (PER-305). Un état DÉDUIT
   * (`origin: 'auto'`) n'en porte jamais : il suit les PV, pas la durée.
   */
  roundNumber: number;
}) {
  const { id, origin, autoReason } = applied;
  const intensity = clampIntensity(id, applied.intensity ?? 1);
  const stacked = isStackingStatus(id) && intensity > 1;
  const remaining = statusRemainingRounds(applied, roundNumber);
  return (
    <AppTooltip
      title={<StatusEffectTooltip id={id} autoReason={autoReason} remainingRounds={remaining} />}
      disableInteractive
    >
      <Box
        aria-label={statusLabel(id)}
        sx={(theme) => ({
          ...statusSquareSx(theme, originStatusTone(id, origin)),
          cursor: 'help',
          ...(remaining === 0 ? expiredSquareSx(theme) : {}),
        })}
      >
        <StatusIconInner id={id} intensity={intensity} stacked={stacked} remaining={remaining} />
      </Box>
    </AppTooltip>
  );
}

/**
 * Emplacement vertical d'une paire de boutons ± le long d'un carré-icône : `center` quand une seule
 * paire est en jeu (le cas courant : la durée), `upper`/`lower` quand il en faut deux (état cumulatif
 * → intensité en haut, durée en bas).
 */
type StatusAdjustSlot = 'center' | 'upper' | 'lower';

/** Côté (px) d'un bouton ± selon son emplacement : deux paires empilées tiennent en 14 px chacune. */
const ADJUST_BUTTON_SIZE: Record<StatusAdjustSlot, number> = { center: 16, upper: 14, lower: 14 };

/**
 * Bouton ± bordant un carré-icône SUR LE CÔTÉ, révélé au survol (PER-305 — il était auparavant en coin
 * BAS, pour l'intensité seule).
 *
 * POURQUOI LES CÔTÉS : le survol du carré ouvre l'info-bulle de l'effet, qui occupe l'axe VERTICAL —
 * en dessous par défaut, au-dessus quand la place manque, ce qui est le cas courant depuis que la bande
 * d'initiative est collée en bas de l'écran (PER-301). Aucune position haute ou basse n'est donc sûre,
 * alors que MUI ne fait jamais basculer une bulle sur les côtés. Les bulles de badge sont en plus
 * passées en `disableInteractive` : une bulle ouverte prend sinon `pointer-events: auto` et INTERCEPTE
 * réellement le clic destiné au bouton.
 */
function StatusAdjustButton({
  side,
  slot,
  label,
  tone,
  disabled,
  onClick,
  children,
}: {
  side: 'left' | 'right';
  slot: StatusAdjustSlot;
  label: string;
  tone: StatusTone;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const size = ADJUST_BUTTON_SIZE[slot];
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
        // Débordement latéral de la moitié du bouton : la gouttière entre badges est élargie en
        // conséquence (cf. `STATUS_BADGE_GAP`) pour qu'il ne recouvre pas le carré voisin.
        [side]: -(size / 2 + 1),
        ...(slot === 'center'
          ? { top: '50%', transform: 'translateY(-50%)' }
          : slot === 'upper'
            ? { top: 1 }
            : { bottom: 1 }),
        p: 0,
        width: size,
        height: size,
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
 * mais INTERACTIF. Cliquer le carré retire l'état ; des boutons −/+ bordant le carré apparaissent au
 * survol. L'ajout d'un état passe toujours par le glisser-déposer ou le menu de l'en-tête. Effet
 * verbatim en info-bulle.
 *
 * DEUX RÉGLAGES au survol, chacun sa paire de boutons (PER-305) :
 *  - la DURÉE en tours, sur tout état posé — sans compteur, seul un `+` s'affiche (il l'amorce à 1
 *    tour) ; descendre sous 1 retire le compteur, pas l'état ;
 *  - l'INTENSITÉ, états cumulatifs seulement (bornée au plafond du catalogue).
 *
 * Une seule paire tient sur les côtés au centre : la durée l'occupe (cas courant). Quand l'intensité
 * s'y ajoute, les deux paires s'empilent — intensité en haut (alignée sur sa pastille ×N), durée en bas
 * (alignée sur la sienne).
 */
function InteractiveStatusIcon({
  applied,
  roundNumber,
  onRemove,
  onAdjust,
  onAdjustDuration,
}: {
  applied: AppliedStatus;
  /** Manche courante, dont se dérivent les tours restants du compteur (PER-305). */
  roundNumber: number;
  onRemove: () => void;
  onAdjust: (delta: number) => void;
  onAdjustDuration: (delta: number) => void;
}) {
  const { id } = applied;
  const stacking = isStackingStatus(id);
  const intensity = clampIntensity(id, applied.intensity ?? 1);
  const max = statusMaxIntensity(id);
  const tone = statusTone(id);
  const remaining = statusRemainingRounds(applied, roundNumber);
  // Deux paires à empiler dès que l'intensité entre en jeu ; sinon la durée prend le centre.
  const durationSlot: StatusAdjustSlot = stacking ? 'lower' : 'center';
  return (
    <AppTooltip
      title={<StatusEffectTooltip id={id} remainingRounds={remaining} />}
      disableInteractive
    >
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
          ...(remaining === 0 ? expiredSquareSx(theme) : {}),
          '&:hover, &:focus-visible': {
            bgcolor: alpha(theme.palette[tone].main, 0.42),
            borderColor: theme.palette[tone].light,
            // Les boutons débordent sur les côtés : le badge survolé passe DEVANT ses voisins, sinon
            // le − de l'un se retrouve peint sous le carré d'à côté.
            zIndex: 2,
          },
          // Révèle les boutons ± (durée, et intensité pour un état cumulatif) au survol / focus.
          '&:hover .status-adjust, &:focus-visible .status-adjust': { opacity: 1, pointerEvents: 'auto' },
        })}
      >
        <StatusIconInner
          id={id}
          intensity={intensity}
          stacked={stacking && intensity > 1}
          remaining={remaining}
        />
        {/* DURÉE : le − n'existe que s'il y a un compteur à raccourcir (ou à retirer, à 1 tour). */}
        {remaining !== undefined && (
          <StatusAdjustButton
            side="left"
            slot={durationSlot}
            label={`Raccourcir la durée d'un tour — ${statusLabel(id)}`}
            tone={tone}
            onClick={() => onAdjustDuration(-1)}
          >
            <RemoveIcon sx={{ fontSize: 12 }} />
          </StatusAdjustButton>
        )}
        <StatusAdjustButton
          side="right"
          slot={durationSlot}
          label={
            remaining === undefined
              ? `Poser un compteur de tours — ${statusLabel(id)}`
              : `Prolonger la durée d'un tour — ${statusLabel(id)}`
          }
          tone={tone}
          disabled={remaining !== undefined && remaining >= STATUS_DURATION_MAX}
          onClick={() => onAdjustDuration(1)}
        >
          <AddIcon sx={{ fontSize: 12 }} />
        </StatusAdjustButton>
        {stacking && (
          <>
            <StatusAdjustButton
              side="left"
              slot="upper"
              label={`Diminuer l'intensité — ${statusLabel(id)}`}
              tone={tone}
              disabled={intensity <= 1}
              onClick={() => onAdjust(-1)}
            >
              <RemoveIcon sx={{ fontSize: 12 }} />
            </StatusAdjustButton>
            <StatusAdjustButton
              side="right"
              slot="upper"
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
 * seulement en débordement, cas rare). L'appelant réserve un peu de marge basse pour l'accueillir, et
 * lui passe les seuls états POSÉS (les états déduits des PV restent réservés au MJ).
 */
function ProjectionStatusStrip({
  applied,
  roundNumber,
}: {
  applied: EffectiveStatus[];
  /** Manche courante : les compteurs de tours (PER-305) se voient aussi à la table, en lecture seule. */
  roundNumber: number;
}) {
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
        <ReadonlyStatusIcon key={s.id} applied={s} roundNumber={roundNumber} />
      ))}
    </Box>
  );
}

/**
 * Hauteur réservée en haut d'un bloc de la fenêtre PROJETÉE pour le bandeau de jauges condensées :
 * 2 pistes (PV + mana) et le filet qui les sépare. Réservée sur TOUS les blocs (y compris ceux des
 * créatures adverses, qui n'en portent pas) pour que les portraits restent alignés d'un bloc à l'autre.
 */
const PROJECTION_GAUGES_HEIGHT = 2 * COMPACT_GAUGE_HEIGHT + COMPACT_GAUGE_ROW_GAP;

/**
 * Bandeau de jauges PV + mana d'un PERSONNAGE ou d'une créature ALLIÉE en fenêtre projetée, plaqué
 * contre le bord SUPÉRIEUR du bloc et HORS DU FLUX — même modèle que les cartes de joueurs de l'écran
 * de MJ (`CompactGauges` : barres très fines, sans chiffre ni contrôle, le coup d'œil seul). Les
 * joueurs voient ainsi la vie de tout leur CAMP sur l'écran public, PNJ compagnons compris ; les PV
 * des créatures ADVERSES restent secrets (aucun bandeau sur leurs blocs), comme leur NC. La piste de
 * chance est volontairement omise : ce n'est pas une information de combat.
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

/**
 * Surimpression « créature HORS DE COMBAT » (0 PV) de la fenêtre projetée : le bloc est DÉSATURÉ de
 * 50 %, BARRÉ et surmonté d'un pictogramme. C'est la seule annonce de l'issue du combat aux joueurs,
 * à qui les PV des créatures restent masqués. Même vocabulaire visuel que les blocs « barrés » de la
 * fiche (cf. `crossOut`), en couleur franche.
 *
 * DEUX issues, que le livre distingue et que la table doit distinguer aussi (p. 219-220) : des
 * dégâts LÉTAUX tuent (croix ROUGE + tête de mort), des dégâts TEMPORAIRES seuls ASSOMMENT — la
 * créature est inconsciente, pas morte (croix JAUNE + tourbillon d'étourdissement). Sans cette
 * distinction, la table lisait toute créature assommée comme morte.
 *
 * La désaturation passe par `backdrop-filter` sur CETTE couche, et non par un `filter` posé sur la
 * carte : un filtre s'applique à tous les descendants (pseudo-éléments compris), il aurait donc
 * délavé la croix et le pictogramme avec le reste. Ici, tout ce qui est peint DESSOUS est désaturé,
 * et la couleur de la surimpression reste franche.
 */
function IncapacitatedOverlay({ name, state }: { name: string; state: 'down' | 'stunned' }) {
  const stunned = state === 'stunned';
  return (
    <Box
      role="img"
      aria-label={`${name} — ${stunned ? 'assommé' : 'vaincu'}`}
      sx={(t) => ({
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        borderRadius: 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'grayscale(0.5)',
        WebkitBackdropFilter: 'grayscale(0.5)',
        // La couleur est portée par la couche : le pictogramme d'état l'hérite (`fill: currentColor`).
        color: stunned ? t.palette.warning.main : t.palette.error.main,
        backgroundImage: crossOutBackgroundImage({
          color: alpha(stunned ? t.palette.warning.main : t.palette.error.main, 0.8),
          thickness: 3,
        }),
      })}
    >
      {stunned ? (
        // Le tourbillon de l'état « Étourdi » (p. 214) : le pictogramme d'inconscience le plus
        // lisible de la palette, et déjà connu de la table par les badges d'états.
        <StatusEffectIcon
          effect="dazed"
          size={46}
          // Ombre portée : détache le pictogramme du portrait qu'il recouvre.
          sx={{ filter: 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.7))' }}
        />
      ) : (
        <SkullIcon
          sx={{
            fontSize: 46,
            color: 'error.main',
            // Ombre portée : détache la tête de mort du portrait qu'elle recouvre.
            filter: 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.7))',
          }}
        />
      )}
    </Box>
  );
}

/**
 * Attribut posé sur la carte du combattant dont c'est le TOUR (PER-297) : c'est par lui que le
 * conteneur défilant retrouve la carte à recentrer, sans avoir à faire remonter une réf depuis
 * chaque colonne (celle du drop `@dnd-kit` occupe déjà `ref` sur l'écran de MJ).
 */
const ACTIVE_COMBATANT_ATTR = 'data-active-combatant';

/**
 * Recentrage AUTOMATIQUE de la bande d'initiative sur le combattant actif (PER-297) : au-delà de
 * 4 ou 5 cartes, l'actif sort du champ visible et le MJ devait aller le chercher à la main à chaque
 * « Tour suivant ». Renvoie la réf à poser sur le conteneur défilant.
 *
 * Le déclencheur est le CHANGEMENT de tour courant (`currentTurnKey`), d'où qu'il vienne : bouton
 * « Tour suivant », synchro de session en temps réel, ou seconde fenêtre du tracker. La signature
 * des lignes en est un second, indispensable au rechargement en plein combat : le tour courant est
 * connu dès le montage alors que les combattants n'arrivent qu'ensuite (chargement de la campagne),
 * donc sans lui le premier recentrage n'aurait aucune carte à viser.
 *
 * Vaut aussi en PROJECTION, où c'est le plus utile : personne ne peut y faire défiler la bande.
 */
function useCenterActiveCombatant(currentTurnKey: string | null, rowsSignature: string) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Le premier recentrage se fait SANS animation (cf. plus bas) : un défilement animé au
  // chargement d'une page déjà en plein combat n'aurait aucun sens.
  const hasCenteredOnce = useRef(false);

  useEffect(() => {
    const container = scrollRef.current;
    // Bande vide (pas encore chargée, ou aucun combattant) : rien à recentrer.
    if (!container || rowsSignature === '') return;
    const active = container.querySelector<HTMLElement>(`[${ACTIVE_COMBATANT_ATTR}="true"]`);
    // Combat pas démarré, ou tour courant portant sur un combattant retiré depuis.
    if (!active) return;
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const target = centeredScrollLeft({
      scrollLeft: container.scrollLeft,
      viewportWidth: container.clientWidth,
      contentWidth: container.scrollWidth,
      // Bord gauche de la carte relatif au bord visible du conteneur : les cartes ne sont pas
      // positionnées par rapport à lui (`offsetLeft` viserait un autre ancêtre), on passe donc
      // par les rectangles.
      itemLeft: activeRect.left - containerRect.left,
      itemWidth: activeRect.width,
    });
    // `null` = bande qui ne déborde pas, ou carte déjà centrée : aucune animation à vide.
    if (target === null) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const instant = !hasCenteredOnce.current || reducedMotion;
    hasCenteredOnce.current = true;
    // `scrollTo` sur le SEUL conteneur (et non `scrollIntoView`) : le défilement vertical de la
    // page — l'écran de MJ est long — ne bouge jamais.
    container.scrollTo({ left: target, behavior: instant ? 'auto' : 'smooth' });
  }, [currentTurnKey, rowsSignature]);

  return scrollRef;
}

/**
 * Épaisseur (px) de la barre de défilement de la bande (PER-298) : la barre système par défaut est
 * si fine qu'elle passait inaperçue — première cause du « je ne savais pas que ça défilait ».
 */
const SCROLLBAR_SIZE = 14;

/**
 * Habillage de la barre de défilement horizontale de la bande : franchement visible (curseur clair
 * en pilule sur piste sombre) au lieu du filet effacé du système, première cause du « je ne savais
 * pas que ça défilait ».
 *
 * Les deux familles de propriétés sont EXCLUSIVES sur Chromium : dès que `scrollbar-color` /
 * `scrollbar-width` sont posés, il ignore les pseudo-éléments `::-webkit-scrollbar` et rend sa
 * barre système (seulement recolorée). On réserve donc les propriétés standard à Firefox, via un
 * `@supports` qui teste la prise en charge du pseudo-élément — vrai sur Chromium/Safari (qui
 * prennent alors le chemin webkit), faux sur Firefox.
 *
 * N'affecte PAS la marge basse du conteneur (`pb`), qui réserve la place de la bande d'icônes
 * d'états débordant sous les cartes en projection : la barre se pose sur le bord bas de la boîte,
 * sous ce rembourrage.
 */
const SCROLLBAR_SX = {
  '@supports not selector(::-webkit-scrollbar)': {
    scrollbarWidth: 'auto',
    scrollbarColor: 'rgba(255, 255, 255, 0.34) rgba(255, 255, 255, 0.06)',
  },
  '&::-webkit-scrollbar': { height: SCROLLBAR_SIZE },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: SCROLLBAR_SIZE / 2,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    borderRadius: SCROLLBAR_SIZE / 2,
    border: '3px solid transparent',
    backgroundClip: 'content-box',
    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.55)' },
  },
};

/** Lit sur le DOM les trois mesures dont dépend toute l'arithmétique de défilement. */
function scrollMetrics(container: HTMLElement): ScrollMetrics {
  return {
    scrollLeft: container.scrollLeft,
    viewportWidth: container.clientWidth,
    contentWidth: container.scrollWidth,
  };
}

/**
 * Pas d'un chevron : largeur d'une carte + gouttière. MESURÉ sur la bande (écart entre les bords
 * gauches de deux cartes voisines) plutôt que déduit des constantes de largeur — il suivra donc
 * tout seul un éventuel mode compact. Replis : une seule carte → sa largeur ; bande vide → la
 * largeur visible.
 */
function cardStep(container: HTMLElement): number {
  const [first, second] = container.children as unknown as (HTMLElement | undefined)[];
  if (!first) return container.clientWidth;
  // `offsetLeft` se rapporte au même ancêtre positionné pour les deux cartes : leur écart est
  // exactement « largeur + gouttière », quel que soit le défilement en cours.
  return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
}

/**
 * Confort de défilement de la bande d'initiative (PER-298), monté sur le conteneur défilant : suit
 * les CÔTÉS où il reste du contenu hors champ, ce qui pilote les estompes et les chevrons.
 *
 * Recalcul à chaque défilement, au redimensionnement du conteneur (`ResizeObserver`) et à tout
 * changement du roster (`rowsSignature` — une carte ajoutée/retirée change `scrollWidth` sans
 * toucher à la taille du conteneur, l'observateur seul ne le verrait pas).
 *
 * Le détournement de la molette verticale vers un défilement horizontal, prévu par le ticket, a
 * été implémenté puis RETIRÉ à la demande du propriétaire (2026-08-04) : insupportable à l'usage,
 * même en rendant la main à la page une fois la bande en butée. Ne pas le réintroduire — la bande
 * se parcourt aux chevrons, à la barre de défilement, ou à Maj + molette (natif).
 */
function useBandScroll(scrollRef: RefObject<HTMLDivElement | null>, rowsSignature: string) {
  const [edges, setEdges] = useState<ScrollEdges>({ left: false, right: false });

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const measure = () => {
      const next = scrollEdges(scrollMetrics(container));
      // Comparaison avant mise à jour : un défilement émet des dizaines d'événements, dont
      // quasiment aucun ne change les côtés — inutile de re-rendre la bande à chacun.
      setEdges((prev) => (prev.left === next.left && prev.right === next.right ? prev : next));
    };

    measure();
    container.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => {
      container.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [scrollRef, rowsSignature]);

  /** Avance la bande d'une carte dans le sens demandé (défilement animé). */
  const scrollByStep = useCallback(
    (direction: ScrollDirection) => {
      const container = scrollRef.current;
      if (!container) return;
      const target = stepScrollLeft(scrollMetrics(container), direction, cardStep(container));
      if (target === null) return;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      container.scrollTo({ left: target, behavior: reducedMotion ? 'auto' : 'smooth' });
    },
    [scrollRef],
  );

  return { edges, scrollByStep };
}

/**
 * Estompe en dégradé sur un bord de la bande (PER-298) : dit « il y a d'autres combattants de ce
 * côté » même quand la coupure tombe pile entre deux cartes, cas où rien ne le laissait deviner.
 * Vaut AUSSI en projection, où personne ne peut faire défiler : c'est là une information pour la
 * table, pas une invitation à cliquer — d'où le `pointer-events: none` et l'absence de chevron.
 *
 * S'arrête au-dessus de la barre de défilement pour ne pas la délaver.
 */
function BandFade({ side, visible }: { side: 'left' | 'right'; visible: boolean }) {
  return (
    <Box
      aria-hidden
      sx={(t) => ({
        position: 'absolute',
        top: 0,
        bottom: SCROLLBAR_SIZE,
        [side]: 0,
        width: 48,
        pointerEvents: 'none',
        zIndex: 1,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s',
        backgroundImage: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, ${
          t.palette.background.default
        } 0%, ${alpha(t.palette.background.default, 0.72)} 45%, ${alpha(
          t.palette.background.default,
          0,
        )} 100%)`,
      })}
    />
  );
}

/**
 * Marqueur « il reste du contenu de ce côté » posé sur un chevron de défilement. Il existe pour que
 * la règle de SURVOL du conteneur ne réveille que les chevrons utiles : `'&:hover .band-chevron'`
 * est plus spécifique que l'`opacity: 0` du chevron lui-même et l'écrasait, si bien qu'entrer la
 * souris sur la bande rallumait aussi le chevron en butée (inerte au clic, mais visible).
 */
const CHEVRON_REACHABLE_ATTR = 'data-reachable';

/**
 * Chevron de défilement d'un bord de la bande (PER-298) : un clic avance d'une carte. ÉCRAN DE MJ
 * uniquement — l'écran projeté n'a pas de souris. Discret au repos, plus franc au survol de la
 * bande (classe révélée par le conteneur), et TOTALEMENT effacé dès qu'il n'y a plus rien de ce
 * côté : en butée à droite, seul le chevron gauche subsiste, et inversement.
 */
function BandChevron({
  side,
  visible,
  onClick,
}: {
  side: 'left' | 'right';
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <IconButton
      className="band-chevron"
      size="small"
      onClick={onClick}
      // Retiré du parcours clavier et du survol quand il n'y a rien à atteindre : le bouton reste
      // en place (aucun saut de mise en page) mais devient totalement inerte.
      {...{ [CHEVRON_REACHABLE_ATTR]: visible ? 'true' : 'false' }}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label={side === 'left' ? 'Combattants précédents' : 'Combattants suivants'}
      title={side === 'left' ? 'Combattants précédents' : 'Combattants suivants'}
      sx={{
        position: 'absolute',
        [side]: 2,
        // Centré sur la hauteur des CARTES : la barre de défilement occupe le bas du conteneur.
        top: `calc(50% - ${SCROLLBAR_SIZE / 2}px)`,
        transform: 'translateY(-50%)',
        zIndex: 2,
        color: 'common.white',
        bgcolor: 'rgba(20, 20, 23, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        opacity: visible ? 0.4 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.2s, background-color 0.15s',
        '&:hover': { bgcolor: 'rgba(35, 35, 40, 0.95)' },
      }}
    >
      {side === 'left' ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
    </IconButton>
  );
}

/**
 * Clé `localStorage` de la densité des cartes (PER-300). Préférence d'affichage LOCALE à la machine
 * du MJ : elle n'entre PAS dans l'état de combat partagé (rien à synchroniser en session, rien à
 * pousser vers la projection — ce n'est pas une donnée de partie).
 *
 * Clé RENOMMÉE par PER-301 (`…-compact` → `…-density-compact`) : le réglage ne gouverne plus la seule
 * densité des cartes mais aussi le COLLAGE de la bande, et son défaut s'est inversé. Sans ce
 * renommage, un « Détaillé » enregistré du temps de PER-300 aurait continué de gagner et la barre
 * permanente n'aurait jamais paru.
 */
const COMPACT_STORAGE_KEY = 'initiative-tracker-density-compact';

/**
 * Densité par défaut de l'écran de MJ : COMPACT (PER-301), là où PER-300 laissait le détaillé. C'est le
 * compact qui porte la barre collée en bas de l'écran — la garder derrière une bascule à trouver
 * rendait invisible la seule chose que le ticket apportait. Le détaillé reste à un clic, et la
 * PROJECTION ignore ce réglage de bout en bout.
 */
const COMPACT_BY_DEFAULT = true;

/**
 * Clé `localStorage` du repli ULTRA CONDENSÉ de l'écran de MJ (nouvelle demande) : reprend
 * EXACTEMENT le système du repli de `SheetInitiativeBar` (bandeau titre + `CondensedOrderDots`,
 * corps entièrement masqué) — une option de VISIBILITÉ en plus de la densité (PER-300/301), pour
 * rendre au MJ toute la hauteur d'écran qu'occupent l'en-tête et les cartes quand il n'a besoin que
 * de savoir qui joue. Jamais actif en PROJECTION (forcé plus bas, indépendamment de cette
 * préférence) : la fenêtre projetée n'a pas cette bascule et ne doit pas hériter d'un repli fait
 * côté MJ, la même clé étant lue par les deux (aucun `cid` : préférence LOCALE à la machine du MJ).
 */
const GM_COLLAPSED_STORAGE_KEY = 'gm-screen-initiative-collapsed';

/** Côté (px) d'une puce du condensé replié, normale puis mise en évidence pour le combattant actif. */
const CONDENSED_DOT_SIZE = 20;
const CONDENSED_ACTIVE_DOT_SIZE = 28;

/**
 * Couleur neutre de repli (créatures, ET personnage sans profil résolu) : contour BLANC quel que
 * soit le camp (allié ou adverse) — les créatures n'ont pas de couleur de « profil » à reprendre,
 * contrairement aux personnages joueurs (cf. `condensedRingColorFor`).
 */
const CONDENSED_NEUTRAL_RING = 'rgba(255, 255, 255, 0.92)';

/**
 * Couleur du contour d'une puce : celle du PROFIL pour un personnage joueur (`row.profileColor`,
 * la même teinte que sa carte dans la bande dépliée), BLANCHE pour une créature — alliée ou
 * adverse, cf. demande explicite : les créatures n'ont pas de profil à représenter par une couleur.
 */
function condensedRingColorFor(row: InitiativeRow): string {
  return row.isCreature ? CONDENSED_NEUTRAL_RING : row.profileColor;
}

/**
 * Anneau en `border` plutôt qu'en `box-shadow` (une première version) : à cette taille, le halo
 * d'un `box-shadow` rognait sur les coins de l'anneau côté rendu (cercle un peu « carré ») — la
 * bordure, elle, suit exactement le `border-radius` de la puce.
 */
function condensedRingSx(color: string, isActive: boolean) {
  return { border: `1.5px solid ${alpha(color, isActive ? 0.95 : 0.55)}` };
}

/**
 * Pulsation du combattant actif quand c'est SON PERSONNAGE (`isMine`, cf. `CondensedOrderDots`) —
 * même idiome que `pulseSx` de `SessionConnectionBadge` (anneau qui s'étend puis s'efface,
 * désactivé si `prefers-reduced-motion`), portée plus loin (halo plus large, opacité de départ plus
 * haute) : le joueur doit repérer d'un coup d'œil que c'est SON tour, pas seulement qu'un tour est en
 * cours — le halo blanc reste blanc quel que soit le profil, pour trancher sur n'importe quelle
 * couleur de contour.
 */
const CONDENSED_PULSE_SX = {
  animation: 'initiativeCondensedPulse 1.3s ease-out infinite',
  '@keyframes initiativeCondensedPulse': {
    '0%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.85)' },
    '70%': { boxShadow: '0 0 0 11px rgba(255, 255, 255, 0)' },
    '100%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
} as const;

/**
 * Transition simple (pas une animation en boucle) sur le changement de taille/contour quand un
 * combattant devient actif ou cesse de l'être : la valeur cible reste un changement D'ÉTAT franc
 * (20 → 28 px), seule la TRANSITION vers cette valeur est adoucie.
 */
const CONDENSED_SIZE_TRANSITION = 'transform 0.2s ease, border-color 0.2s ease';

/** Facteur d'agrandissement du combattant ACTIF, dérivé des deux tailles ci-dessus. */
const CONDENSED_ACTIVE_SCALE = CONDENSED_ACTIVE_DOT_SIZE / CONDENSED_DOT_SIZE;

/**
 * Représentation ULTRA CONDENSÉE de l'ordre d'initiative, PARTAGÉE entre la bande d'initiative de la
 * fiche (`SheetInitiativeBar`, replière) et le tracker de l'écran de MJ (repli, nouvelle demande) :
 * l'ICÔNE DE PROFIL de chaque combattant (`ClassIcon`, la même glyphe que le reste de la fiche — pas
 * son portrait illustré, pas une puce de couleur abstraite), dans l'ordre d'initiative. Le combattant
 * ACTIF est agrandi et son contour renforcé ; si c'est en plus SON PROPRE personnage
 * (`characterId`, absent côté écran de MJ — personne n'y est « le sien »), l'anneau PULSE (toujours
 * blanc) pour que le joueur remarque que c'est SON tour sans avoir à dérouler la bande. Sans profil
 * (créature, ou bloc non chargé), repli sur un avatar générique. Nom complet en info-bulle native.
 *
 * AGRANDISSEMENT SANS DÉCALAGE EN X : chaque puce vit dans un conteneur RÉSERVANT toujours la
 * taille MAX (`CONDENSED_ACTIVE_DOT_SIZE`, `flexShrink: 0`) — la largeur de la bande ne bouge donc
 * jamais quand un combattant devient actif/cesse de l'être. La puce elle-même reste à taille FIXE
 * (`CONDENSED_DOT_SIZE`) et se grossit par `transform: scale(...)` en `position: absolute`, centrée
 * sur son conteneur : `transform` est peint PAR-DESSUS la mise en page sans jamais la modifier, donc
 * ni la puce elle-même ni ses voisines ne se décalent horizontalement pendant la transition.
 */
export const CondensedOrderDots = forwardRef<
  HTMLDivElement,
  {
    rows: InitiativeRow[];
    currentTurnKey: string | null;
    /** Personnage propriétaire de la fiche affichant ce condensé : distingue « c'est un tour » de
     * « c'est MON tour ». Absent sur l'écran de MJ, qui n'a pas de personnage à distinguer ainsi. */
    characterId?: string;
  }
  // `ref` + le reste des props (dont `style`) sont injectés par `Fade` — un composant custom placé
  // sous une transition MUI doit les relayer pour que le fondu s'applique réellement.
>(function CondensedOrderDots({ rows, currentTurnKey, characterId, ...other }, ref) {
  return (
    <Stack
      ref={ref}
      direction="row"
      spacing={0.75}
      sx={{ alignItems: 'center', overflow: 'hidden', minWidth: 0 }}
      {...other}
    >
      {rows.map((row) => {
        const isActive = row.key === currentTurnKey;
        const isMine = row.key === characterId;
        const commonSx = {
          position: 'absolute' as const,
          top: '50%',
          left: '50%',
          width: CONDENSED_DOT_SIZE,
          height: CONDENSED_DOT_SIZE,
          borderRadius: '50%',
          boxSizing: 'border-box' as const,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: CONDENSED_SIZE_TRANSITION,
          transform: `translate(-50%, -50%) scale(${isActive ? CONDENSED_ACTIVE_SCALE : 1})`,
          ...condensedRingSx(condensedRingColorFor(row), isActive),
          ...(isActive && isMine ? CONDENSED_PULSE_SX : {}),
        };
        return (
          // Conteneur à taille FIXE (le max des deux états) : c'est LUI qui occupe une place dans
          // la bande, jamais la puce mise à l'échelle — la ligne ne respire donc jamais en largeur.
          <Box
            key={row.key}
            sx={{
              position: 'relative',
              width: CONDENSED_ACTIVE_DOT_SIZE,
              height: CONDENSED_ACTIVE_DOT_SIZE,
              flexShrink: 0,
            }}
          >
            {row.classId ? (
              <Box title={row.name} sx={{ ...commonSx, bgcolor: alpha(row.profileColor, 0.16) }}>
                <ClassIcon classId={row.classId} size={Math.round(CONDENSED_DOT_SIZE * 0.62)} />
              </Box>
            ) : (
              <Box
                title={row.name}
                sx={{
                  ...commonSx,
                  bgcolor: row.accentColor ?? row.profileColor,
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                <PersonOutlineIcon sx={{ fontSize: CONDENSED_DOT_SIZE * 0.62 }} />
              </Box>
            )}
          </Box>
        );
      })}
    </Stack>
  );
});

/**
 * Bascule « Détaillé / Compact » de la bande d'initiative (PER-300), calquée sur `InventoryViewToggle`
 * de l'inventaire (`ToggleButtonGroup` à deux boutons, libellé en info-bulle). Depuis PER-301 le
 * COMPACT est le défaut : c'est lui qui colle la bande en bas de l'écran. Le détaillé devient le mode
 * de confort de lecture (jauge de PV complète, attaques dépliées) pour les combats peu fournis.
 */
function TrackerDensityToggle({
  compact,
  onChange,
}: {
  compact: boolean;
  onChange: (compact: boolean) => void;
}) {
  return (
    <ToggleButtonGroup
      value={compact ? 'compact' : 'detailed'}
      exclusive
      size="small"
      onChange={(_, next) => {
        if (next) onChange(next === 'compact');
      }}
    >
      <ToggleButton value="detailed" aria-label="Cartes détaillées">
        <AppTooltip title="Cartes détaillées — jauge de PV complète, DEF et attaques dépliées">
          <DensityMediumIcon fontSize="small" />
        </AppTooltip>
      </ToggleButton>
      <ToggleButton value="compact" aria-label="Cartes compactes">
        <AppTooltip title="Cartes compactes — plus de combattants d'un coup d'œil, et bande collée en bas de l'écran">
          <DensitySmallIcon fontSize="small" />
        </AppTooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

/**
 * Clés `localStorage` de l'ouverture de la palette d'états dans le tracker (PER-301) : DEUX clés, une
 * par densité, parce que la palette n'y joue pas le même rôle. En DÉTAILLÉ — bande dans le flux de la
 * page — elle reste le meuble permanent qu'elle était avant PER-301, donc OUVERTE par défaut : le
 * rendu de l'écran de MJ est inchangé pour qui ne touche pas au mode compact. En COMPACT — bande
 * COLLÉE en bas de l'écran — elle devient un tiroir qu'on ouvre le temps de poser un état, donc
 * FERMÉE par défaut : une barre permanente doit rester basse, c'est toute sa raison d'être.
 */
const PALETTE_STORAGE_KEY_DETAILED = 'initiative-tracker-palette-detailed';
const PALETTE_STORAGE_KEY_COMPACT = 'initiative-tracker-palette-compact';

/**
 * Bascule d'ouverture de la palette d'états (PER-301), rangée avec le titre et la densité : c'est une
 * commande d'AFFICHAGE, elle n'a rien à faire dans le groupe « Tour précédent / Tour suivant ». Le
 * chevron indique le sens du dépliage — la palette apparaît SOUS le bouton, au-dessus de la bande.
 */
function StatusPaletteToggle({
  open,
  onChange,
}: {
  open: boolean;
  onChange: (open: boolean) => void;
}) {
  return (
    <Button
      variant="outlined"
      size="small"
      onClick={() => onChange(!open)}
      aria-expanded={open}
      endIcon={open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      title={
        open
          ? "Masquer la palette d'états"
          : "Afficher la palette d'états à glisser sur les combattants"
      }
    >
      États
    </Button>
  );
}

/**
 * Empilement de la barre collante (PER-301). Choisi POUR PASSER SOUS la surcouche de glisser de
 * `@dnd-kit` (`DragOverlay`, 999 par défaut) : la puce d'état qu'on traîne doit passer PAR-DESSUS la
 * barre, puisque c'est justement dessus qu'on la dépose. Passe donc aussi sous la barre de navigation
 * d'app (`AppBar`, 1100), le panneau latéral de fiche (`Drawer`, 1200), les modales, menus et
 * popovers (1300) — et au-dessus des cartes des grilles, qui n'ont aucun `z-index`.
 */
const STICKY_Z_INDEX = 900;

/**
 * Habillage de la bande COLLÉE en bas de l'écran de MJ (PER-301) : verre dépoli opaque pour rester
 * lisible par-dessus les cartes qui défilent dessous et l'illustration de fond, filet de séparation
 * et ombre portée vers le haut pour la détacher du contenu.
 *
 * Le collage est coupé sous `md` : sur un téléphone (grilles en 1 colonne), une barre permanente de
 * ~260 px ne laisserait presque rien à lire — la bande y reste dans le flux, comme avant.
 *
 * Le débord horizontal (`mx` négatif compensé par `px`) fait filer la barre d'un bord à l'autre de la
 * fenêtre en reprenant à son compte le rembourrage de la page : sans lui, deux gouttières de fond nu
 * la couperaient de chaque côté.
 *
 * En TOUT BAS de page, la barre remonte à sa place naturelle et le pied de site apparaît sous elle :
 * `sticky` borne l'élément à son bloc conteneur, qui s'arrête avant le pied de page. C'est voulu — on
 * voit qu'on a atteint la fin, et rien n'est jamais masqué (les dernières cartes d'adversaires
 * redeviennent lisibles à cet instant précis). Un `position: fixed` collerait la barre coûte que
 * coûte, mais recouvrirait le pied de page en permanence et exigerait de réserver sa hauteur — pour
 * un gain nul.
 */
const STICKY_BAR_SX = {
  position: { xs: 'static', md: 'sticky' },
  bottom: 0,
  zIndex: STICKY_Z_INDEX,
  mx: { xs: -2, sm: -4 },
  px: { xs: 2, sm: 4 },
  pt: 1.5,
  pb: 0.5,
  bgcolor: 'rgba(16, 16, 19, 0.88)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderTop: '1px solid rgba(255, 255, 255, 0.12)',
  boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.5)',
} as const;

/**
 * Éléments qui CONSOMMENT les touches des raccourcis de tour (PER-299) : champs de saisie (« n »
 * dans le nom d'une créature ne doit pas faire avancer le combat) et commandes pilotées aux flèches
 * (liste déroulante, curseur…). Testé avec `closest` : le focus peut être sur un descendant.
 */
const SHORTCUT_BLOCKING_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="slider"]',
].join(', ');

/**
 * Le tracker est-il recouvert par une couche modale ? Modales, menus et panneau latéral de fiche
 * (`GmSheetDrawer`, ouvert par `?sheet=`) passent tous par le `Modal` de MUI, qui pose
 * `aria-hidden="true"` sur le reste de l'application le temps de son ouverture. On interroge donc ce
 * marqueur STANDARD — « ce sous-arbre n'est plus la couche active » — plutôt que les classes
 * internes de MUI : le jour où le panneau change de composant, la garde tient toujours.
 */
function isCoveredByOverlay(element: HTMLElement | null): boolean {
  return !!element?.closest('[aria-hidden="true"]');
}

/**
 * Raccourcis clavier de pilotage du tour (PER-299) : `N` / flèche droite = tour suivant, `P` /
 * flèche gauche = tour précédent. Le MJ a les mains prises (dés, notes, PDF de règles) et devait
 * jusqu'ici ramener la souris sur « Tour suivant » à chaque combattant.
 *
 * Écoute sur `window` — le raccourci doit marcher sans rien avoir cliqué au préalable — mais
 * strictement bordée :
 *  - ÉCRAN DE MJ seul (`enabled`) : jamais en projection, qui ne pilote rien ;
 *  - jamais quand la frappe est destinée à un champ ou à une commande aux flèches
 *    (`SHORTCUT_BLOCKING_SELECTOR`) ;
 *  - jamais quand une modale, un menu ou le panneau latéral de fiche est ouvert
 *    (`isCoveredByOverlay`, à partir de la racine du tracker) ;
 *  - jamais en combinaison avec Ctrl/⌘/Alt (`Ctrl + N` ouvre une fenêtre) ;
 *  - jamais en RÉPÉTITION : une touche maintenue traverserait tout l'ordre d'initiative en une
 *    seconde, et le compteur de manche avec.
 *
 * La barre d'espace n'est volontairement pas un raccourci (cf. `turnDirectionFromKey`).
 */
function useTurnShortcuts(
  enabled: boolean,
  rootRef: RefObject<HTMLDivElement | null>,
  step: (direction: TurnDirection) => void,
) {
  // L'action change à chaque rendu (elle capture le tour courant) : on publie sa dernière version
  // dans une réf pour ne PAS remonter/démonter l'écouteur à chaque changement d'état du combat.
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const direction = turnDirectionFromKey(e.key);
      if (direction === null) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest(SHORTCUT_BLOCKING_SELECTOR)) return;
      if (isCoveredByOverlay(rootRef.current)) return;
      // Les flèches feraient défiler la page : le raccourci prend la main.
      e.preventDefault();
      stepRef.current(direction);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, rootRef]);
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
  /**
   * États EFFECTIFS de ce combattant : posés par le MJ (badges interactifs) + déduits de sa
   * situation (badges jaunes en lecture seule). Les deux comptent dans les stats ajustées.
   */
  applied: EffectiveStatus[];
  /** Retire l'état `id` de ce combattant (états POSÉS uniquement). */
  onRemove: (id: AnyStatusEffectId) => void;
  /** Ajuste de `delta` (±) l'intensité de l'état cumulatif `id`. */
  onAdjust: (id: AnyStatusEffectId, delta: number) => void;
  /** Ajuste de `delta` (±) le compteur de tours de l'état `id` (PER-305). */
  onAdjustDuration: (id: AnyStatusEffectId, delta: number) => void;
}

/**
 * Colonne d'un combattant (présentation). `interactive` (optionnel, écran de MJ) transforme la
 * colonne en zone de drop et rend son en-tête cliquable (ouverture du menu d'états).
 */
function CombatantColumn({
  row,
  isActive,
  projection,
  compact = false,
  interactive,
  status,
  roundNumber,
  onGiveTurn,
}: {
  row: InitiativeRow;
  isActive: boolean;
  projection: boolean;
  /**
   * Manche courante du combat, dont les badges d'états dérivent leurs tours restants (PER-305).
   * Partagée par l'écran de MJ et la projection : les deux écrans affichent forcément le même
   * décompte, puisqu'il se déduit d'une valeur diffusée.
   */
  roundNumber: number;
  /**
   * Mode COMPACT de l'écran de MJ (PER-300) : carte ramenée à la largeur de la projection, jauge de
   * PV réduite à une barre fine cliquable (popover de dégâts) et attaques repliées en info-bulle.
   * Sans effet en projection, qui est déjà dans sa forme la plus dense — c'est justement le modèle
   * dont ce mode s'inspire.
   */
  compact?: boolean;
  interactive?: ColumnStatusInteractive;
  status?: ColumnStatusRender;
  /**
   * Donne le tour à ce combattant (PER-299) — écran de MJ uniquement, la projection ne pilote
   * jamais le combat. Porté par le SEUL bandeau d'initiative, pour ne pas disputer l'en-tête au
   * menu des états.
   */
  onGiveTurn?: () => void;
}) {
  const identityClickable = !!interactive;
  const isOver = interactive?.isOver ?? false;
  // Résolution du portrait personnalisé (PER-391) : appelé INCONDITIONNELLEMENT (règle des
  // hooks — jamais dans un `if`), même pour une créature ou un compagnon. Sans effet dans ce cas
  // (variant absent → repli statique immédiat, aucun téléchargement) ; le résultat n'est routé
  // vers l'affichage QUE pour un vrai personnage (seul à porter un `classId`) — une créature garde
  // son illustration de bestiaire (`portraitSrc`, cf. plus bas) et un compagnon son avatar de repli.
  const resolvedPortraitSrc = useCharacterPortraitSrc(row.key, row.portraitVariant ?? 'default', row.classId ?? '');
  const portraitSrc = row.classId ? resolvedPortraitSrc : row.portraitSrc;
  // États affichés en projection (lecture seule) : bande d'icônes en overlay absolu ancré en bas à
  // gauche. AUCUNE place réservée (pas de padding) → le bloc garde EXACTEMENT la même taille qu'il
  // porte des états ou non, donc tous les blocs restent alignés quel que soit leur nombre d'états.
  // Projection : les états POSÉS par le MJ sont toujours montrés ; un état DÉDUIT (`origin: 'auto'`,
  // aujourd'hui le seul étant « affaibli » à 1 PV, p. 220) l'est pour tout le CAMP DES JOUEURS —
  // personnages ET créatures alliées. Le motif du masquage est le secret des PV d'un ADVERSAIRE :
  // montrer « affaibli » dirait à la table qu'il est pile à 1 PV. Le camp des joueurs, lui, n'a rien à
  // se cacher (sa barre de vie est déjà projetée) et savoir qui ne tient plus qu'à un point compte.
  const revealAutoStatuses = !row.isCreature || row.side === 'ally';
  const projectionStatuses = projection
    ? (row.appliedStatuses ?? []).filter((s) => revealAutoStatuses || s.origin !== 'auto')
    : [];
  const hasProjectionStatuses = projectionStatuses.length > 0;
  // Bandeau de jauges de la projection : le CAMP DES JOUEURS — personnages, et créatures ALLIÉES
  // (PNJ compagnons, familiers, montures). Les PV des créatures ADVERSES restent réservés au MJ, comme
  // leur NC. Nécessite des PV max connus (profil complet, ou bloc de bestiaire chargé).
  const showProjectionGauges = projection && (!row.isCreature || row.side === 'ally') && row.maxHp > 0;
  // Créature à 0 PV (cf. `isDefeatedCreature` : jamais un personnage, à terre / mourant p. 220, pas
  // mort). En PROJECTION, sa carte est barrée et surmontée d'un pictogramme, seule annonce faite à la
  // table puisque ses PV lui sont masqués — TUÉE (létal) ou ASSOMMÉE (temporaires seuls), cf.
  // `IncapacitatedOverlay`.
  const defeatedCreature = isDefeatedCreature(row);
  const incapacity = projection && defeatedCreature ? hpHealthState(row.maxHp, row.depletion) : null;
  return (
    <Box
      ref={interactive?.dropRef}
      // Repère du combattant ACTIF pour le recentrage automatique de la bande (PER-297) : la réf
      // `@dnd-kit` occupant déjà `ref` sur l'écran de MJ, on marque la carte d'un attribut que le
      // conteneur va chercher (`querySelector`) plutôt que d'entrelacer deux réfs.
      {...(isActive && { [ACTIVE_COMBATANT_ATTR]: 'true' })}
      sx={(t) => ({
        // Trois cas, deux largeurs (cf. `COLUMN_WIDTH_*`) : la PROJECTION et le mode COMPACT de
        // l'écran de MJ (PER-300) partagent les 176 px, le mode DÉTAILLÉ garde son plancher de
        // 260 px. Les noms trop longs sont tronqués (« … ») pour que la largeur ne varie JAMAIS
        // d'un bloc à l'autre.
        width: projection || compact ? COLUMN_WIDTH_COMPACT : COLUMN_WIDTH_DETAILED,
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
        // Cartes RELÉGUÉES de l'écran de MJ (PER-302), estompées d'autant qu'elles sont loin du
        // chemin : créature vaincue 55 %, créature masquée aux joueurs 80 % — la relégation les
        // pousse en fin de bande, l'estompe dit d'un coup d'œil où finissent les vivants. Le
        // combattant ACTIF garde sa pleine opacité quel que soit son groupe : c'est lui qui joue, sa
        // carte doit rester la plus lisible de la bande. Rien de tout ça en projection : les masquées y sont
        // filtrées et les vaincues portent déjà leur croix. Les personnages ne sont jamais masqués.
        opacity: projection || isActive ? 1 : defeatedCreature ? 0.55 : row.hidden ? 0.8 : 1,
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
            src={portraitSrc}
            name={row.name}
            initiative={row.initiative}
            initiativeDelta={row.initiativeDelta}
            onGiveTurn={onGiveTurn}
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
              menu. Le drop d'une puce fait la même chose sans passer par le menu. Sacrifié en
              COMPACT, où ces 20 px valent mieux au nom du combattant : l'en-tête reste cliquable
              (curseur + teinte au survol) et le glisser-déposer depuis la palette est intact. */}
          {identityClickable && !compact && (
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
            restent réservés au MJ.
            En COMPACT (PER-300), elle cède la place à la barre fine + popover de dégâts. */}
        {!projection &&
          (compact ? (
            <CompactHpControl
              name={row.name}
              maxHp={row.maxHp}
              depletion={row.depletion}
              onDamage={row.onDamage}
              onHeal={row.onHeal}
              onReset={row.onReset}
              persistKey={row.persistKey}
            />
          ) : (
            <HpGauge
              depletion={row.depletion}
              maxHp={row.maxHp}
              onDamage={row.onDamage}
              onHeal={row.onHeal}
              onReset={row.onReset}
              persistKey={row.persistKey}
              controlsBelow
            />
          ))}
        {/* DEF + attaques ajustées (PER-280) : rendues UNIQUEMENT en mode MJ (`status` fourni),
            jamais en projection. Base = `row.combatStats`, ajustement résolu depuis les états posés.
            En COMPACT, seule la DEF reste visible, les attaques passent en info-bulle (PER-300). */}
        {status &&
          row.combatStats &&
          (compact ? (
            <CompactCombatStatsRow
              stats={row.combatStats}
              resolved={resolveStatusModifiers(status.applied)}
            />
          ) : (
            <CombatStatsRow
              stats={row.combatStats}
              resolved={resolveStatusModifiers(status.applied)}
            />
          ))}
        {/* États appliqués (écran de MJ) : MÊMES carrés-icônes que la projection (PER-283), mais
            interactifs — clic = retrait, ±N au survol pour les cumulatifs. Effet verbatim en tooltip.
            Un état DÉDUIT (jaune, ex. affaibli à 1 PV) est rendu en lecture seule : le MJ ne l'a pas
            posé, il ne peut pas le retirer — c'est la situation du combattant qui le porte. */}
        {status && status.applied.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: STATUS_BADGE_GAP }}>
            {status.applied.map((s) =>
              s.origin === 'auto' ? (
                <ReadonlyStatusIcon key={s.id} applied={s} roundNumber={roundNumber} />
              ) : (
                <InteractiveStatusIcon
                  key={s.id}
                  applied={s}
                  roundNumber={roundNumber}
                  onRemove={() => status.onRemove(s.id)}
                  onAdjust={(delta) => status.onAdjust(s.id, delta)}
                  onAdjustDuration={(delta) => status.onAdjustDuration(s.id, delta)}
                />
              ),
            )}
          </Box>
        )}
      </Stack>
      {/* Projection (PER-282) : bande d'icônes d'états en LECTURE SEULE (pas de ✕/±, pas de nombres
          ajustés), en position absolue ancrée en bas à gauche → n'altère pas la mise en page du bloc.
          Le chemin MJ passe par `status` (badges interactifs en flux normal) ci-dessus. */}
      {hasProjectionStatuses && (
        <ProjectionStatusStrip applied={projectionStatuses} roundNumber={roundNumber} />
      )}
      {/* Créature vaincue : surimpression barrée + tête de mort, en DERNIER pour peindre par-dessus
          tout le contenu du bloc (bornée à `inset: 0`, elle laisse la bande d'états qui déborde
          en dessous intacte). */}
      {(incapacity === 'down' || incapacity === 'stunned') && (
        <IncapacitatedOverlay name={row.name} state={incapacity} />
      )}
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
  compact,
  controls,
  roundNumber,
  onGiveTurn,
}: {
  row: InitiativeRow;
  isActive: boolean;
  /** Mode compact (PER-300), simplement relayé à la colonne. */
  compact: boolean;
  controls: CombatStatusControls;
  /** Manche courante (PER-305), simplement relayée à la colonne. */
  roundNumber: number;
  /** Donne le tour à ce combattant (PER-299), simplement relayé à la colonne. */
  onGiveTurn: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: row.key });
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  // Les COCHES du menu suivent les seuls états POSÉS (ce que le MJ a effectivement appliqué) : un
  // état déduit des PV n'est pas de son fait, le décocher n'aurait rien à retirer.
  const manualIds = new Set((controls.statusesByKey[row.key] ?? []).map((s) => s.id));
  // Les BADGES, eux, montrent les états EFFECTIFS de la ligne (posés + déduits), comme la projection.
  const applied = row.appliedStatuses ?? [];

  // Buffs de groupe débloqués — proposés dans le menu SEULEMENT si l'écran de MJ sait ouvrir la
  // fenêtre de pose : sans elle, cocher la case poserait le buff sur ce seul combattant, à rebours
  // de la règle (« ses alliés et lui »).
  const groupBuffIds = controls.onOpenGroupBuff ? (controls.groupBuffIds ?? []) : [];
  const groupBuffIdSet = new Set<string>(groupBuffIds);

  const toggle = (id: AnyStatusEffectId) => {
    // Un buff de groupe DÉJÀ posé se décoche comme les autres (ce combattant seulement — le retrait
    // de tout le camp passe par la puce de la palette) ; sa POSE, elle, ouvre la fenêtre de choix.
    if (!manualIds.has(id) && groupBuffIdSet.has(id)) {
      setAnchorEl(null);
      controls.onOpenGroupBuff?.(row.key, id as BeneficialEffectId);
      return;
    }
    if (manualIds.has(id)) controls.onRemove(row.key, id);
    else controls.onApply(row.key, id);
    // Le menu reste ouvert : le MJ peut cocher/décocher plusieurs états d'affilée.
  };

  return (
    <>
      <CombatantColumn
        row={row}
        isActive={isActive}
        projection={false}
        compact={compact}
        onGiveTurn={onGiveTurn}
        interactive={{
          dropRef: setNodeRef,
          isOver,
          onOpenMenu: (e) => setAnchorEl(e.currentTarget),
        }}
        roundNumber={roundNumber}
        status={{
          applied,
          onRemove: (id) => controls.onRemove(row.key, id),
          onAdjust: (id, delta) => controls.onAdjust(row.key, id, delta),
          onAdjustDuration: (id, delta) => controls.onAdjustDuration(row.key, id, delta),
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
        {buildStatusGroups(controls.situationalIds, groupBuffIds).flatMap((group, groupIndex) => [
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
            const on = manualIds.has(id);
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
   * pas). Contrôlé/persisté par l'appelant, comme le tour courant. Son RÉGLAGE est réservé au MJ
   * (auteur unique), mais la PROJECTION doit le recevoir elle aussi : les compteurs de tours des
   * badges d'états s'en déduisent (PER-305), et sans lui la table verrait des durées fausses.
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
  /**
   * Palette d'états à glisser (`CombatStatusPalette`), fournie par l'écran de MJ et rendue ICI, entre
   * l'en-tête et la bande, derrière un bouton « États » qui la replie (PER-301). Elle vivait
   * au-dessus du tracker dans le flux de la page : dès que la bande s'est mise à coller, la palette
   * sortait de l'écran au premier défilement et le glisser-déposer devenait impossible faute de
   * SOURCE visible. Ignorée en projection (jamais auteur d'un état).
   */
  statusPalette?: ReactNode;
  /**
   * Autorise le COLLAGE de la bande en bas de l'écran (PER-301) — écran de MJ uniquement. Effectif
   * seulement en mode COMPACT et à partir de `md` : c'est le tracker qui en décide, l'appelant ne fait
   * que déclarer que sa page s'y prête (elle défile et la bande en occupe la fin).
   */
  stickyBottom?: boolean;
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
  statusPalette,
  stickyBottom = false,
}: InitiativeTrackerProps) {
  // En PROJECTION, on retire les combattants masqués aux joueurs (créatures cachées) : ils restent
  // visibles côté MJ mais absents de l'écran projeté, et l'ordre y est rendu NU — la relégation
  // déplacerait la carte d'une créature à l'instant même où sa croix annonce sa mort à la table.
  // Sur l'ÉCRAN DE MJ, à l'inverse, les combattants hors du chemin sont repoussés en fin de bande
  // (PER-302 : masqués puis vaincus), le combattant actif étant toujours épargné.
  const displayedRows = projection
    ? rows.filter((r) => !r.hidden)
    : relegateSidelined(rows, currentTurnKey);
  /**
   * Avance (+1) ou recule (−1) d'un cran dans l'ordre d'initiative (PER-299). Toute l'arithmétique
   * — bouclage aux deux bouts, incrément/décrément de manche, saut des créatures vaincues, cas
   * limites — vit dans `stepTurn` ; ici on ne fait qu'appliquer. Le compteur de manche n'est notifié
   * QUE s'il change, pour ne pas réécrire l'état du combat (et le diffuser en session) à chaque pas
   * d'un tour de table.
   */
  const step = (direction: TurnDirection) => {
    const next = stepTurn(
      {
        // L'ordre parcouru est celui AFFICHÉ : le tour suit la bande que le MJ a sous les yeux.
        keys: displayedRows.map((r) => r.key),
        currentKey: currentTurnKey,
        roundNumber,
        // Les créatures vaincues n'ont plus de tour ; `isDefeatedCreature` laisse délibérément
        // passer les personnages à 0 PV (à terre / mourant, p. 220 — leur tour existe toujours).
        skipKeys: displayedRows.filter(isDefeatedCreature).map((r) => r.key),
      },
      direction,
    );
    if (!next) return;
    onCurrentTurnKeyChange(next.key);
    if (next.roundNumber !== roundNumber) onRoundNumberChange?.(next.roundNumber);
  };

  // Les états ne sont interactifs que hors projection (auteur = MJ uniquement).
  const interactive = !projection && statusControls;
  // Signature de l'ORDRE des cartes affichées : un ajout, un retrait ou un reclassement par les
  // états (PER-292) déplace la carte active — il faut donc recentrer là aussi, pas seulement quand
  // le tour change — et change la largeur du contenu, donc les côtés encore atteignables (PER-298).
  const rowsSignature = displayedRows.map((r) => r.key).join('|');
  // Recentrage automatique sur le combattant actif (PER-297).
  const scrollRef = useCenterActiveCombatant(currentTurnKey, rowsSignature);
  // Molette horizontale + suivi des bords atteignables (PER-298), sur le même conteneur.
  const { edges, scrollByStep } = useBandScroll(scrollRef, rowsSignature);
  // Racine du tracker : sert de point d'ancrage pour savoir si une couche modale le recouvre
  // (panneau latéral de fiche, modale d'ajout, menu d'états) — cf. `useTurnShortcuts`.
  const rootRef = useRef<HTMLDivElement | null>(null);
  // Raccourcis clavier N/P + flèches : ÉCRAN DE MJ uniquement (jamais en projection, PER-299).
  useTurnShortcuts(!projection, rootRef, step);
  // Densité des cartes (PER-300), préférence LOCALE persistée. La projection l'ignore : elle est
  // déjà à la largeur compacte et son rendu ne doit dépendre d'aucun réglage de l'écran de MJ.
  const [compactPref, setCompactPref] = usePersistedBoolean(COMPACT_STORAGE_KEY, COMPACT_BY_DEFAULT);
  const compact = !projection && compactPref;
  // Ouverture de la palette d'états (PER-301), persistée SÉPARÉMENT par densité : ouverte par défaut
  // en détaillé (le rendu d'avant), fermée par défaut dans la barre collante du compact. Les deux
  // hooks sont appelés inconditionnellement (règle des hooks) ; seul le couple utile est retenu.
  const [paletteOpenDetailed, setPaletteOpenDetailed] = usePersistedBoolean(
    PALETTE_STORAGE_KEY_DETAILED,
    true,
  );
  const [paletteOpenCompact, setPaletteOpenCompact] = usePersistedBoolean(
    PALETTE_STORAGE_KEY_COMPACT,
    false,
  );
  const paletteOpen = compact ? paletteOpenCompact : paletteOpenDetailed;
  const setPaletteOpen = compact ? setPaletteOpenCompact : setPaletteOpenDetailed;
  // La palette n'a de sens que là où les états sont modifiables (écran de MJ) : la projection n'est
  // jamais auteur, et les autres consommateurs du tracker ne la fournissent pas.
  const hasPalette = !projection && !!statusPalette;
  // Barre collée en bas : réservée au COMPACT (le détaillé, deux fois plus haut, mangerait la moitié
  // de l'écran) et à l'écran de MJ (la projection n'a pas de page à défiler). Le repli mobile est
  // porté par le point d'arrêt de `STICKY_BAR_SX`.
  const sticky = stickyBottom && compact && !projection;
  // Repli ULTRA CONDENSÉ (nouvelle demande), même système que `SheetInitiativeBar` : préférence
  // LOCALE lue inconditionnellement (règle des hooks) mais forcée à `false` en PROJECTION — sans ce
  // `!projection`, la fenêtre projetée hériterait du repli fait côté écran de MJ (même clé
  // `localStorage`, cf. `GM_COLLAPSED_STORAGE_KEY`) et disparaîtrait sous les yeux des joueurs.
  const [collapsedPref, setCollapsedPref] = usePersistedBoolean(GM_COLLAPSED_STORAGE_KEY, false);
  const collapsed = !projection && collapsedPref;
  const collapseLabel = collapsed ? "Déplier l'ordre d'initiative" : "Réduire l'ordre d'initiative";
  // Condensé affiché UNIQUEMENT repli + combat COMMENCÉ (`currentTurnKey !== null`), comme sur la
  // fiche : avant le premier tour, l'ordre n'a encore rien de « courant » à mettre en évidence.
  const showCondensedOrder = collapsed && currentTurnKey !== null;

  return (
    <Stack spacing={2} ref={rootRef} sx={sticky ? STICKY_BAR_SX : undefined}>
      {/* En-tête (titre + actions + « Tour suivant ») : tout se pilote depuis l'écran de
          MJ, donc rien de tout ça en mode projection. */}
      {!projection && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {"Ordre d'initiative"}
          </Typography>
          {/* Condensé replié (nouvelle demande) : mêmes puces que le bandeau replié de la fiche
              (`CondensedOrderDots`), pour lire d'un coup d'œil qui joue sans rien redéplier. */}
          <Fade in={showCondensedOrder} unmountOnExit timeout={200}>
            <CondensedOrderDots rows={displayedRows} currentTurnKey={currentTurnKey} />
          </Fade>
          {/* Compteur de manche (« Tour N », toujours ≥ 1) : +1 auto en fin de tour d'initiative,
              ajustable (±) et « recommencé » par le bouton ⟳ (→ Tour 1 + tour courant au premier de
              l'initiative). La réinitialisation du combat (PER-283) le ramène aussi à 1. Masqué en
              repli, comme le reste des réglages/actions : seul le titre + le condensé restent. */}
          {!collapsed && onRoundNumberChange && (
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
                // Rien à recommencer si on est déjà à la manche 1 SANS combat en cours (cf.
                // `onRestartRounds`, qui remet `currentTurnKey` à `null` plutôt que de resélectionner
                // le premier combattant — précisément l'état que ce bouton vise à restaurer).
                disabled={roundNumber === 1 && currentTurnKey === null}
                aria-label="Recommencer le décompte des manches (Tour 1, combat non commencé)"
                title="Recommencer (Tour 1, combat non commencé)"
              >
                <RestartAltIcon fontSize="inherit" />
              </IconButton>
            </Stack>
          )}
          {/* Densité des cartes (PER-300) : rangée avec le titre et le compteur de manche — c'est un
              réglage d'AFFICHAGE, pas une action de jeu, il n'a rien à faire dans le groupe
              « Tour précédent / Tour suivant » à droite. Masquée en repli (cf. condensé plus haut). */}
          {!collapsed && <TrackerDensityToggle compact={compactPref} onChange={setCompactPref} />}
          {/* Palette d'états repliable (PER-301) : même rangée que la densité, c'est un réglage
              d'affichage. Le bouton n'apparaît que si l'appelant fournit une palette (écran de MJ). */}
          {!collapsed && hasPalette && <StatusPaletteToggle open={paletteOpen} onChange={setPaletteOpen} />}
          <Box sx={{ flexGrow: 1 }} />
          {!collapsed && headerAction}
          {!collapsed && (
            <>
              {/* « Tour précédent » (PER-299) : rattrape le clic de trop, sans avoir à refaire tout
                  le tour de table (ce qui incrémentait la manche au passage). Discret — c'est une
                  correction, pas le geste courant — d'où le bouton en retrait à gauche de l'action
                  principale. Les raccourcis sont rappelés dans les deux info-bulles, en `title`
                  natif comme les boutons de manche voisins : une info-bulle MUI ne s'affiche pas
                  sur un bouton désactivé (roster vide) et le fait savoir en console. */}
              {/* Libellé replié sur la seule icône sous `xl` (PER-301) : c'est un bouton
                  SECONDAIRE, il cède son libellé avant « Tour suivant » quand la place manque. */}
              <CollapsibleLabelButton
                variant="outlined"
                size="small"
                icon={<SkipPreviousIcon />}
                label="Tour précédent"
                onClick={() => step(-1)}
                disabled={rows.length === 0}
                title="Tour précédent (P ou ←)"
              />
              {/* Tant que `currentTurnKey` vaut `null` (aucun combattant n'a encore eu la main), ce
                  bouton amorce le combat plutôt que de faire progresser un tour déjà en cours —
                  c'est le même geste (`step(1)`), seul son libellé change pour ne pas laisser
                  croire qu'un combat est déjà lancé. */}
              <Button
                variant="contained"
                size="small"
                startIcon={<SkipNextIcon />}
                onClick={() => step(1)}
                disabled={rows.length === 0}
                title={
                  currentTurnKey === null ? 'Commencer le combat (N ou →)' : 'Tour suivant (N ou →)'
                }
              >
                {currentTurnKey === null ? 'Commencer le combat' : 'Tour suivant'}
              </Button>
            </>
          )}
          {/* Repli ultra condensé (nouvelle demande) : bouton dédié plutôt que tout l'en-tête
              cliquable (contrairement à `SheetInitiativeBar`) — cet en-tête porte déjà de vrais
              contrôles interactifs (compteur de manche, bascules, tour), les rendre cliquables en
              bloc aurait déclenché le repli au moindre clic sur l'un d'eux. */}
          <IconButton
            size="small"
            onClick={() => setCollapsedPref(!collapsed)}
            aria-expanded={!collapsed}
            aria-label={collapseLabel}
            title={collapseLabel}
          >
            {collapsed ? (
              <KeyboardDoubleArrowUpIcon fontSize="small" />
            ) : (
              <KeyboardDoubleArrowDownIcon fontSize="small" />
            )}
          </IconButton>
        </Stack>
      )}

      {/* Palette d'états + bande réunies sous UN enfant du `Stack` : l'espacement du `Stack` sauterait
          une rangée pour le `Collapse` replié (haut de 0, mais espacé quand même), et cet espace mort
          se verrait dans une barre permanente. La marge est donc portée par le contenu DÉPLIÉ. */}
      <Collapse in={!collapsed} unmountOnExit>
      <Box>
        {/* Palette d'états (PER-301) : DANS le tracker, donc dans la barre collante, donc toujours à
            portée de glisser quelle que soit la position de défilement de la page. La surcouche de
            glisser étant portée hors de cet arbre DOM (portail), l'`overflow: hidden` du `Collapse`
            ne rogne jamais la puce en cours de déplacement. */}
        {hasPalette && (
          <Collapse in={paletteOpen} unmountOnExit>
            <Box sx={{ pb: 2 }}>{statusPalette}</Box>
          </Collapse>
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
          // Enveloppe positionnée : elle ancre les estompes et les chevrons de PER-298, posés PAR-DESSUS
          // la bande (et non dedans, où ils défileraient avec les cartes).
          <Box
            sx={{
              position: 'relative',
              // Chevrons discrets au repos, francs dès que la souris entre sur la bande — mais SEULS
              // ceux qui mènent quelque part (`data-reachable`) : sans ce filtre, cette règle (plus
              // spécifique) rallumait aussi le chevron en butée, qui n'a rien à montrer.
              [`&:hover .band-chevron[${CHEVRON_REACHABLE_ATTR}="true"]`]: { opacity: 1 },
            }}
          >
            <Box
              ref={scrollRef}
              sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                pb: projection ? 5.5 : compact ? 0 : 1,
                alignItems: 'stretch',
                ...SCROLLBAR_SX,
              }}
            >
              {displayedRows.map((row) => {
                const isActive = row.key === currentTurnKey;
                // Donner le tour à un combattant en cliquant SON bandeau d'initiative (PER-299) : une
                // correction de position, donc le compteur de manche n'est PAS touché — contrairement
                // à « Tour suivant », qui progresse dans l'ordre. Écran de MJ seul (la projection ne
                // pilote rien).
                const onGiveTurn = projection ? undefined : () => onCurrentTurnKeyChange(row.key);
                return interactive ? (
                  <StatusDroppableColumn
                    key={row.key}
                    row={row}
                    isActive={isActive}
                    compact={compact}
                    controls={statusControls}
                    roundNumber={roundNumber}
                    onGiveTurn={() => onCurrentTurnKeyChange(row.key)}
                  />
                ) : (
                  <CombatantColumn
                    key={row.key}
                    row={row}
                    isActive={isActive}
                    projection={projection}
                    compact={compact}
                    roundNumber={roundNumber}
                    onGiveTurn={onGiveTurn}
                  />
                );
              })}
            </Box>
            {/* Estompes des deux bords : sur l'écran de MJ ET en projection. */}
            <BandFade side="left" visible={edges.left} />
            <BandFade side="right" visible={edges.right} />
            {/* Chevrons : écran de MJ uniquement (pas de souris devant l'écran projeté). */}
            {!projection && (
              <>
                <BandChevron side="left" visible={edges.left} onClick={() => scrollByStep(-1)} />
                <BandChevron side="right" visible={edges.right} onClick={() => scrollByStep(1)} />
              </>
            )}
          </Box>
        )}
      </Box>
      </Collapse>
    </Stack>
  );
}

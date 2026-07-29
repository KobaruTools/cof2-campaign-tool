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
 */
import { useState, type ReactNode } from 'react';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import CheckIcon from '@mui/icons-material/Check';
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
import type { Depletion } from '@/lib/character/types';
import type { AnyStatusEffectId, AppliedStatus } from '@/lib/character/statusEffects';
import { AppTooltip } from '@/components/AppTooltip';
import { HpGauge, type DamageKind } from '@/components/sheet/HpGauge';
import { StatusEffectIcon } from '@/components/StatusEffectIcon';
import { STATUS_GROUPS, statusIconId, statusLabel } from '@/components/campaign/CombatStatusPalette';

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
  /** Applique un état sur un combattant (intensité 1). */
  onApply: (combatantKey: string, id: AnyStatusEffectId) => void;
  /** Retire un état d'un combattant. */
  onRemove: (combatantKey: string, id: AnyStatusEffectId) => void;
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
 * Colonne d'un combattant (présentation). `interactive` (optionnel, écran de MJ) transforme la
 * colonne en zone de drop et rend son en-tête cliquable (ouverture du menu d'états).
 */
function CombatantColumn({
  row,
  isActive,
  projection,
  interactive,
}: {
  row: InitiativeRow;
  isActive: boolean;
  projection: boolean;
  interactive?: ColumnStatusInteractive;
}) {
  const identityClickable = !!interactive;
  return (
    <Box
      ref={interactive?.dropRef}
      sx={{
        // Un peu plus large que la disposition d'origine (220) : depuis que
        // l'identité passe à DROITE de l'initiative (au lieu de dessous), la
        // rangée a besoin de largeur pour le nom / joueur / profil.
        width: 260,
        flexShrink: 0,
        p: 1.25,
        borderRadius: 2,
        // Bloc quasi opaque (90 %) : lisible même par-dessus l'illustration de
        // fond de l'écran de MJ et sur la projection.
        bgcolor: 'rgba(20, 20, 23, 0.9)',
        // Créature masquée aux joueurs : légèrement estompée sur l'écran de MJ
        // (80 % d'opacité) pour la distinguer d'un coup d'œil — elle est de toute
        // façon absente de la projection (filtrée plus haut). Les personnages ne
        // sont jamais masqués (`hidden` toujours faux).
        opacity: row.hidden ? 0.8 : 1,
        // Bordure toujours de 2px (seule la couleur change) pour éviter tout
        // saut de mise en page quand le tour bascule. Actif = contour blanc épais ;
        // sinon on teinte selon le camp (PER-249 : rouge adversaire / vert allié),
        // repli neutre pour les personnages joueurs (pas d'accent de camp).
        border: isActive
          ? '2px solid rgba(255, 255, 255, 0.9)'
          : `2px solid ${row.accentColor ? alpha(row.accentColor, 0.5) : 'rgba(255, 255, 255, 0.08)'}`,
        boxShadow: isActive ? '0 0 14px 2px rgba(255, 255, 255, 0.35)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s, outline-color 0.15s',
        // Survol d'une puce d'état au-dessus de la colonne : liseré bleu net (par-dessus la bordure,
        // sans déplacer la mise en page).
        ...(interactive?.isOver && {
          outline: (t) => `2px solid ${t.palette.primary.main}`,
          outlineOffset: 2,
        }),
      }}
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
      </Stack>
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
      />
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { maxHeight: 420 } } }}
      >
        {STATUS_GROUPS.flatMap((group) => [
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
   * identité, en compact.
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
        // Colonnes côte à côte ; défilement horizontal si la largeur est dépassée.
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1, alignItems: 'stretch' }}>
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

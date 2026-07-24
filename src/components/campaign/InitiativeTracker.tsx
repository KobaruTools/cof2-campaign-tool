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
 */
import type { ReactNode } from 'react';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { Depletion } from '@/lib/character/types';
import { AppTooltip } from '@/components/AppTooltip';
import { HpGauge, type DamageKind } from '@/components/sheet/HpGauge';

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
}

export function InitiativeTracker({
  rows,
  currentTurnKey,
  onCurrentTurnKeyChange,
  projection = false,
  headerAction,
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
            return (
              <Box
                key={row.key}
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
                  // Bordure toujours de 2px (seule la couleur change) pour éviter tout
                  // saut de mise en page quand le tour bascule. Actif = contour blanc épais.
                  border: isActive
                    ? '2px solid rgba(255, 255, 255, 0.9)'
                    : '2px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isActive ? '0 0 14px 2px rgba(255, 255, 255, 0.35)' : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <Stack spacing={1}>
                  {/* Identité sur UNE rangée : portrait + initiative, puis nom / joueur /
                      profil À DROITE (au lieu d'une rangée dédiée en dessous) — gagne de
                      la place en hauteur sur chaque bloc. */}
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
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
                    {/* Bascule de visibilité joueurs (créatures uniquement, hors projection) :
                        œil ouvert = visible dans la projection, œil fermé = masquée. */}
                    {!projection && row.onToggleVisible && (
                      <AppTooltip
                        title={row.hidden ? 'Masquée aux joueurs — cliquer pour révéler' : 'Visible par les joueurs — cliquer pour masquer'}
                      >
                        <IconButton
                          size="small"
                          onClick={row.onToggleVisible}
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
          })}
        </Box>
      )}
    </Stack>
  );
}

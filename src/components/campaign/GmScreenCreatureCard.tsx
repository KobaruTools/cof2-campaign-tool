'use client';

/**
 * Carte d'une créature ajoutée au combat tracker de l'écran de MJ (PER-247, remplace
 * l'ancienne `GmScreenBanditCard` spécifique au bandit). Réutilise la MÊME coque que
 * {@link GmScreenCard} (Paper vitré sombre, coins arrondis) pour rester cohérente avec
 * les cartes des personnages joueurs, mais teintée selon le CAMP (PER-249 : rouge pour
 * un adversaire, vert pour un allié), et rend le bloc de stats de la créature TEL QU'IL
 * APPARAÎT DANS LE BESTIAIRE (`BestiaryStatBlock` via `CreatureBlobView`, blob chargé à
 * la demande).
 */
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { BestiaryStatBlock } from '@/components/bestiary/BestiaryStatBlock';
import { CreatureBlobView } from '@/components/bestiary/CreatureBlobView';
import type { Creature } from '@/data/schema';
import { SIDE_ACCENT, SIDE_LABELS, type CreatureSide } from '@/lib/ui/creature';
import { useBestiaryStore } from '@/stores/bestiary';

/**
 * Une créature « lourde » mérite 2 colonnes dans la grille de l'écran de MJ pour ne
 * pas tasser son contenu (retour proprio) : au moins 2 voies OU au moins 4 capacités
 * (héritées de la base comprises, comme le bloc les affiche). Blob absent = pas encore
 * chargé → carte étroite le temps du chargement, puis reflow.
 */
export function isWideCreatureCard(blob?: Creature, baseBlob?: Creature): boolean {
  if (!blob) return false;
  const pathCount = blob.paths?.length ?? 0;
  const inheritedCount = blob.sharedAbilitiesNote ? baseBlob?.specialAbilities?.length ?? 0 : 0;
  const abilityCount = (blob.specialAbilities?.length ?? 0) + inheritedCount;
  return pathCount >= 2 || abilityCount >= 4;
}

export interface GmScreenCreatureCardProps {
  /** Slug de la créature du bestiaire à afficher (`Creature.id`). */
  slug: string;
  /**
   * Bloc de stats FOURNI par l'appelant — cas d'une créature CRÉÉE À LA MAIN par le MJ, dont le
   * bloc synthétique (`customCreatureBlob`) ne vient pas du bestiaire. Renseigné, il court-circuite
   * le chargement par slug ; absent (cas courant), le bloc est chargé depuis le bestiaire.
   */
  blob?: Creature;
  /** Libellé du badge (ex. « Gobelin 2 ») pour distinguer plusieurs instances. */
  label: string;
  /** Camp de la créature (PER-249) : teinte la carte (rouge adversaire / vert allié). */
  side: CreatureSide;
  /**
   * Visible par les joueurs (fenêtre projetée) : `false` = masquée (œil fermé ; le MJ la
   * voit toujours, mais elle n'apparaît pas dans la projection).
   */
  visible: boolean;
  /** Bascule la visibilité joueurs de cette créature. */
  onToggleVisible: () => void;
  /**
   * Duplique cette instance : un exemplaire de plus, à l'identique, sans repasser par la modale
   * d'ajout — le geste courant quand un combat enfle en cours de scène.
   */
  onDuplicate: () => void;
  /** Ouvre la modale d'édition de cette instance (nom, camp, visibilité, bloc manuel). */
  onEdit: () => void;
  /** Retire cette instance du combat tracker. */
  onRemove: () => void;
}

export function GmScreenCreatureCard({ slug, blob: providedBlob, label, side, visible, onToggleVisible, onDuplicate, onEdit, onRemove }: GmScreenCreatureCardProps) {
  const accent = SIDE_ACCENT[side];
  // Créature « lourde » (≥ 2 voies ou ≥ 4 capacités) → carte sur 2 colonnes. On lit le
  // blob (et sa base pour les capacités héritées) dans le store, alimenté par le rendu ;
  // un bloc fourni (créature manuelle) prime et n'a ni base ni héritage.
  const storeBlob = useBestiaryStore((s) => s.blobs[slug]);
  const blob = providedBlob ?? storeBlob;
  const baseId = !providedBlob && blob?.sharedAbilitiesNote ? blob.baseCreatureId : undefined;
  const baseBlob = useBestiaryStore((s) => (baseId ? s.blobs[baseId] : undefined));
  const wide = isWideCreatureCard(blob, baseBlob);
  return (
    <Paper
      sx={{
        p: 2,
        // Étalement sur 2 colonnes quand la carte est dense — seulement là où la grille a
        // ≥ 2 colonnes (sm+), sinon (xs, 1 colonne) on reste sur la colonne unique.
        ...(wide ? { gridColumn: { xs: 'auto', sm: 'span 2' } } : {}),
        // Créature masquée aux joueurs : légèrement estompée (80 % d'opacité) pour la
        // distinguer d'un coup d'œil sur l'écran de MJ ; elle reste pleinement lisible et
        // gérable (elle est simplement absente de la fenêtre projetée).
        opacity: visible ? 1 : 0.8,
        bgcolor: 'rgba(20, 20, 23, 0.72)',
        // Teinte discrète du camp (bas droite → haut gauche) : rouge = adversaire, vert =
        // allié, en parité de facture avec le dégradé de profil des cartes joueurs.
        backgroundImage: `linear-gradient(to top left, ${alpha(accent, 0.16)}, transparent)`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${alpha(accent, 0.28)}`,
        borderRadius: 3,
      }}
      data-glossary-shot="GmScreenCreatureCard"
    >
      <Stack spacing={1.5}>
        {/* Ligne d'en-tête : badge « adversaire » à gauche, retrait poussé à droite —
            calquée sur la ligne joueur de `GmScreenCard`. */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                px: 1,
                py: 0.25,
                borderRadius: 1,
                fontSize: '0.8125rem',
                lineHeight: 1.4,
                border: `1px solid ${alpha(accent, 0.35)}`,
                bgcolor: alpha(accent, 0.12),
                color: 'text.primary',
              }}
            >
              {label} · {SIDE_LABELS[side]}
            </Box>
          </Box>
          {/* Visibilité joueurs (projection) : œil ouvert = visible, fermé = masquée.
              Placé à GAUCHE de la corbeille, dans l'en-tête du bloc EXTERNE. */}
          <AppTooltip
            title={visible ? 'Visible par les joueurs — cliquer pour masquer' : 'Masquée aux joueurs — cliquer pour révéler'}
          >
            <IconButton
              size="small"
              onClick={onToggleVisible}
              aria-label={visible ? `Masquer ${label}` : `Rendre ${label} visible`}
              sx={{ color: visible ? 'inherit' : 'text.disabled' }}
            >
              {visible ? (
                <VisibilityOutlinedIcon fontSize="small" />
              ) : (
                <VisibilityOffOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </AppTooltip>
          {/* Éditer / dupliquer, entre l'œil et la corbeille : les deux gestes d'entretien du
              roster en cours de scène (retoucher un PNJ, gonfler un groupe d'un exemplaire). */}
          <AppTooltip title="Modifier cette créature">
            <IconButton size="small" onClick={onEdit} aria-label={`Modifier ${label}`}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
          <AppTooltip title="Dupliquer — un exemplaire de plus, à l’identique">
            <IconButton size="small" onClick={onDuplicate} aria-label={`Dupliquer ${label}`}>
              <ContentCopyOutlinedIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
          <AppTooltip title="Retirer du combat">
            <IconButton size="small" onClick={onRemove} aria-label={`Retirer ${label}`}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
        </Stack>
        {/* Carte large (2 colonnes) → sections voies/capacités elles aussi sur 2 colonnes. */}
        {providedBlob ? (
          // Créature créée à la main : le bloc est déjà là (rien à charger). On garde la
          // description saisie par le MJ, qui tient lieu de notes de scène.
          <BestiaryStatBlock
            creature={providedBlob}
            dense
            collapsibleAbilities
            wideColumns={wide}
          />
        ) : (
          <CreatureBlobView slug={slug} hideNotes dense collapsibleAbilities wideColumns={wide} />
        )}
      </Stack>
    </Paper>
  );
}

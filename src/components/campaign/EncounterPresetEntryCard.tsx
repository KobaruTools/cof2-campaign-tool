'use client';

/**
 * Carte d'une ENTRÉE de composition d'un combat préparé (PER-448, retour propriétaire
 * « ça devrait avoir l'apparence de la carte résumé de l'écran de MJ ») — MÊME coque,
 * MÊME rendu de bloc de stats ET MÊMES actions Éditer/Dupliquer/Retirer que
 * `GmScreenCreatureCard`. Seule la visibilité joueurs (fenêtre projetée) n'a pas
 * d'équivalent ici : une entrée de preset n'est pas encore une créature en jeu, rien à
 * révéler avant le lancement (cf. `launchEncounterPreset`, qui décide seul de la
 * visibilité initiale par camp).
 */
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
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
import { isWideCreatureCard } from './GmScreenCreatureCard';

export interface EncounterPresetEntryCardProps {
  /** Slug de la créature du bestiaire (`Creature.id`). */
  slug: string;
  /** Bloc de stats FOURNI (créature créée à la main) — court-circuite le chargement par slug. */
  blob?: Creature;
  /** Libellé (nom + « ×N » si plusieurs exemplaires). */
  label: string;
  /** Camp de l'entrée : teinte la carte (rouge adversaire / vert allié). */
  side: CreatureSide;
  /** Ouvre la modale d'édition de cette entrée (nom, camp, bloc manuel). */
  onEdit: () => void;
  /** Duplique cette entrée : une copie conforme insérée juste après. */
  onDuplicate: () => void;
  /** Retire cette entrée de la composition du preset. */
  onRemove: () => void;
}

export function EncounterPresetEntryCard({
  slug,
  blob: providedBlob,
  label,
  side,
  onEdit,
  onDuplicate,
  onRemove,
}: EncounterPresetEntryCardProps) {
  const accent = SIDE_ACCENT[side];
  const storeBlob = useBestiaryStore((s) => s.blobs[slug]);
  const blob = providedBlob ?? storeBlob;
  const baseId = !providedBlob && blob?.sharedAbilitiesNote ? blob.baseCreatureId : undefined;
  const baseBlob = useBestiaryStore((s) => (baseId ? s.blobs[baseId] : undefined));
  const wide = isWideCreatureCard(blob, baseBlob);
  return (
    <Paper
      sx={{
        p: 2,
        ...(wide ? { gridColumn: { xs: 'auto', sm: 'span 2' } } : {}),
        bgcolor: 'rgba(20, 20, 23, 0.72)',
        backgroundImage: `linear-gradient(to top left, ${alpha(accent, 0.16)}, transparent)`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${alpha(accent, 0.28)}`,
        borderRadius: 3,
      }}
      data-glossary-shot="EncounterPresetEntryCard"
    >
      <Stack spacing={1.5}>
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
          <AppTooltip title="Modifier cette entrée">
            <IconButton size="small" onClick={onEdit} aria-label={`Modifier ${label}`}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
          <AppTooltip title="Dupliquer — un exemplaire de plus, à l’identique">
            <IconButton size="small" onClick={onDuplicate} aria-label={`Dupliquer ${label}`}>
              <ContentCopyOutlinedIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
          <AppTooltip title="Retirer de la composition">
            <IconButton size="small" onClick={onRemove} aria-label={`Retirer ${label}`}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
        </Stack>
        {providedBlob ? (
          <BestiaryStatBlock creature={providedBlob} dense collapsibleAbilities wideColumns={wide} />
        ) : (
          <CreatureBlobView slug={slug} hideNotes dense collapsibleAbilities wideColumns={wide} />
        )}
      </Stack>
    </Paper>
  );
}

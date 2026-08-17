'use client';

/**
 * Navigateur « Montures & véhicules » du Codex (PER-421) — consultation en LECTURE SEULE de la
 * table « Prix des montures » (`mounts.ts`, p. 191), SANS personnage. Contrairement à
 * `CodexFamiliarsBrowser` (grille), le catalogue n'a que 6 entrées avec peu de champs chacune :
 * une simple liste de lignes suffit (cadrage propriétaire). Le bloc de stats de combat (cheval de
 * selle/guerre) est rendu via `BestiaryStatBlock` — MÊME composant que le Bestiaire, aucune
 * duplication de rendu — dans un accordéon replié par défaut (cadrage propriétaire) pour ne pas
 * alourdir la liste.
 *
 * Pas de gating payant à prévoir : `mounts`/`bardes` sont des tableaux statiques du livre de base.
 */
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { bardes, mounts } from '@/data';
import type { BardeCatalogEntry, MountCatalogEntry } from '@/data/mounts';
import type { Price } from '@/data/schema';
import { BestiaryStatBlock } from '@/components/bestiary/BestiaryStatBlock';
import { SourceRef } from '@/components/SourceRef';

const rowSx = {
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(0, 0, 0, 0.35)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
} as const;

/** Prix formaté « 300 pa » (chaîne vide si absent). */
function formatPrice(price: Price): string {
  return price ? `${price.amount} ${price.unit}` : '';
}

function MountRow({ entry }: { entry: MountCatalogEntry }) {
  const kindLabel = entry.kind === 'vehicle' ? 'Véhicule' : 'Monture';
  return (
    <Box sx={rowSx}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {entry.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {kindLabel} · {formatPrice(entry.price)}
        </Typography>
        {entry.canWearBarde && (
          <Typography variant="caption" color="text.secondary">
            Peut porter une barde
          </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <SourceRef page={entry.sourcePage} term={entry.name} />
      </Stack>
      {entry.note && (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: entry.creature ? 1.5 : 2, fontStyle: 'italic' }}>
          {entry.note}
        </Typography>
      )}
      {entry.creature && (
        <Accordion disableGutters sx={{ bgcolor: 'transparent', boxShadow: 'none', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Bloc de stats de combat
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <BestiaryStatBlock creature={entry.creature} />
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}

function BardeRow({ barde }: { barde: BardeCatalogEntry }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', p: 1.5, ...rowSx }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {barde.name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {formatPrice(barde.price)} · +{barde.defBonus} DEF (et −{barde.defBonus} Init. à la monture ET au cavalier)
      </Typography>
      <Box sx={{ flexGrow: 1 }} />
      <SourceRef page={barde.sourcePage} term={barde.name} />
    </Stack>
  );
}

export function CodexMountsBrowser() {
  return (
    <Stack spacing={3}>
      <Stack spacing={1.5}>
        {mounts.map((entry) => (
          <MountRow key={entry.id} entry={entry} />
        ))}
      </Stack>
      <Box>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
          Bardes (protections de monture)
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        <Stack spacing={1}>
          {bardes.map((barde) => (
            <BardeRow key={barde.id} barde={barde} />
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Apte au seul cheval de guerre.
        </Typography>
      </Box>
    </Stack>
  );
}

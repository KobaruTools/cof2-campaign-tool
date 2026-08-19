'use client';

/**
 * Navigateur « Montures & véhicules » du Codex (PER-421) — consultation en LECTURE SEULE de la
 * table « Prix des montures » (`mounts.ts`, p. 191), SANS personnage. TROIS sections distinctes
 * (retour propriétaire) — Montures / Véhicules / Bardes — chacune sa propre grille de blocs (3
 * colonnes maximum), même patron que `CodexFamiliarsBrowser` : `auto-fit`/`minmax` pour un nombre
 * de colonnes dynamique selon la largeur, plafonné via `maxWidth`. Le bloc de stats de combat
 * (cheval de selle/guerre) est rendu via `BestiaryStatBlock` — MÊME composant que le Bestiaire,
 * aucune duplication de rendu — dans un accordéon replié par défaut (cadrage propriétaire) pour
 * ne pas alourdir le bloc.
 *
 * Prix : jeton de monnaie (retour propriétaire) — MÊME langage visuel que le jeton « PA » de
 * `PurseField.tsx` (fiche personnage), en version statique (pas d'info-bulle/animation, catalogue
 * hors personnage). Montant en gras teinté de la couleur de la monnaie, à côté du jeton.
 *
 * Statistiques des bardes (retour propriétaire) : phrase verbatim standard, seules les puces DEF/
 * Init. (`RefChip`, tone="derived", MÊME rendu que le texte enrichi « Voies & capacités ») sont
 * mises en avant — sur une ligne séparée du nom/prix pour la lisibilité.
 *
 * Pas de gating payant à prévoir : `mounts`/`bardes` sont des tableaux statiques du livre de base.
 */
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { bardes, mounts } from '@/data';
import type { BardeCatalogEntry, MountCatalogEntry } from '@/data/mounts';
import { BestiaryStatBlock } from '@/components/bestiary/BestiaryStatBlock';
import { PriceTag } from '@/components/codex/PriceTag';
import { SourceRef } from '@/components/SourceRef';
import { RefChip } from '@/components/sheet/FeatureRichText';
import { bestiaryCreatureHref } from '@/lib/ui/creatureLinks';

const rowSx = {
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(0, 0, 0, 0.35)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  height: '100%',
} as const;

/** MÊME wrapper plein-largeur que les autres grilles du Codex (`CodexGodsBrowser`, `CodexFamiliarsBrowser`) :
 * paliers MUI qui stretchent les cartes sur toute la largeur du `Container` de la page (retour
 * propriétaire : un `maxWidth` réduit rétrécissait tout le bloc au lieu de juste plafonner le
 * nombre de colonnes). Plafond à 3 colonnes (`lg`), jamais de palier `xl` supplémentaire. */
const gridSx = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
  alignItems: 'stretch',
} as const;

function MountRow({ entry, highlighted }: { entry: MountCatalogEntry; highlighted: boolean }) {
  const kindLabel = entry.kind === 'vehicle' ? 'Véhicule' : 'Monture';
  return (
    <Box
      id={`codex-mount-${entry.id}`}
      sx={[
        { ...rowSx, display: 'flex', flexDirection: 'column' },
        highlighted && {
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.6),
          boxShadow: (theme) => `0 0 0 1px ${alpha(theme.palette.primary.main, 0.6)}`,
        },
      ]}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {entry.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {kindLabel}
        </Typography>
        <PriceTag price={entry.price} />
        {entry.canWearBarde && (
          <Typography variant="caption" color="text.secondary">
            Peut porter une barde
          </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <SourceRef
          page={entry.sourcePage}
          term={entry.name}
          // Monture apte au combat (PER-439 suite) : son bloc de stats est le MÊME creature que le
          // Bestiaire (id partagé, cf. `mounts.ts`) — lien direct vers sa fiche.
          bestiaryHref={entry.creature ? bestiaryCreatureHref(entry.creature.id) : undefined}
        />
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
    <Box sx={{ p: 1.5, ...rowSx }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {barde.name}
        </Typography>
        <PriceTag price={barde.price} />
        <Box sx={{ flexGrow: 1 }} />
        <SourceRef page={barde.sourcePage} term={barde.name} />
      </Stack>
      {/* Même formatage que le texte enrichi « Voies & capacités » (retour propriétaire) : seule la
          puce DEF/Init. (`RefChip`, tone="derived") est mise en avant, le reste de la phrase reste
          en verbatim standard — DEF sur la monture, Initiative en malus à la monture ET au cavalier
          (p. 191). */}
      <Typography variant="body2" sx={{ mt: 1 }}>
        +{barde.defBonus} <RefChip label="DEF" title="Défense" tone="derived" />, −{barde.defBonus}{' '}
        <RefChip label="Init." title="Initiative" tone="derived" /> (monture et cavalier)
      </Typography>
    </Box>
  );
}

/** Titre de section + séparateur, MÊME traitement pour les 3 catégories (retour propriétaire). */
function SectionHeading({ children }: { children: string }) {
  return (
    <>
      <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
        {children}
      </Typography>
      <Divider sx={{ mb: 1.5 }} />
    </>
  );
}

export function CodexMountsBrowser() {
  const ridingMounts = mounts.filter((m) => m.kind === 'mount');
  const vehicles = mounts.filter((m) => m.kind === 'vehicle');

  // Défilement direct sur une MONTURE précise (suite bouton codex, `?id=<mountId>`, cf.
  // `mountCodexHref` — branché par `OwnedMountsPanel`) — même patron que les autres sous-pages
  // sans sélecteur maître-détail (`CodexGodsBrowser`, `CodexFamiliarsBrowser`).
  const requestedId = useSearchParams().get('id');
  useEffect(() => {
    if (!requestedId) return;
    const el = document.getElementById(`codex-mount-${requestedId}`);
    if (!el) return;
    const headerHeight = document.getElementById('app-header')?.getBoundingClientRect().height ?? 0;
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
    window.scrollTo({ top, behavior: 'smooth' });
  }, [requestedId]);

  return (
    <Stack spacing={3}>
      <Box>
        <SectionHeading>Montures</SectionHeading>
        <Box sx={gridSx}>
          {ridingMounts.map((entry) => (
            <MountRow key={entry.id} entry={entry} highlighted={requestedId === entry.id} />
          ))}
        </Box>
      </Box>
      <Box>
        <SectionHeading>Véhicules</SectionHeading>
        <Box sx={gridSx}>
          {vehicles.map((entry) => (
            <MountRow key={entry.id} entry={entry} highlighted={requestedId === entry.id} />
          ))}
        </Box>
      </Box>
      <Box>
        <SectionHeading>Bardes (protections de monture)</SectionHeading>
        <Box sx={gridSx}>
          {bardes.map((barde) => (
            <BardeRow key={barde.id} barde={barde} />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Apte au seul cheval de guerre.
        </Typography>
      </Box>
    </Stack>
  );
}

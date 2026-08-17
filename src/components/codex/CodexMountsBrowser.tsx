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
 * Prix : jeton de monnaie (retour propriétaire) — MÊME langage visuel que le jeton « PA » de
 * `PurseField.tsx` (fiche personnage), en version statique (pas d'info-bulle/animation, catalogue
 * hors personnage). Montant en gras teinté de la couleur de la monnaie, à côté du jeton.
 *
 * Statistiques des bardes (retour propriétaire) : PARSÉES en encadrés signés (`StatModifierTag`,
 * `+2 DEF` / `−2 Init.`) plutôt qu'une phrase verbatim, sur une ligne séparée du nom/prix pour la
 * lisibilité — partagé avec `CodexFamiliarsBrowser` (bonus permanent de caractéristique).
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
import { darken, lighten } from '@mui/material/styles';
import { bardes, mounts } from '@/data';
import type { BardeCatalogEntry, MountCatalogEntry } from '@/data/mounts';
import type { Price } from '@/data/schema';
import { CURRENCY_ABBREV, CURRENCY_COLOR, type CoinCurrency } from '@/lib/character/coinPouch';
import { BestiaryStatBlock } from '@/components/bestiary/BestiaryStatBlock';
import { SourceRef } from '@/components/SourceRef';
import { StatModifierTag } from '@/components/StatModifierTag';

const rowSx = {
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(0, 0, 0, 0.35)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
} as const;

/** Retrouve la monnaie (`CoinCurrency`) à partir de son abréviation (« pa » → `'silver'`). */
const CURRENCY_KEY_BY_ABBREV: Record<string, CoinCurrency> = Object.fromEntries(
  (Object.entries(CURRENCY_ABBREV) as [CoinCurrency, string][]).map(([key, abbrev]) => [abbrev, key]),
);

/** Jeton de monnaie statique (pastille + code), MÊME rendu visuel que `PurseField.CoinToken`. */
function CoinBadge({ code, color }: { code: string; color: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        borderRadius: '50%',
        flexShrink: 0,
        fontSize: '0.68rem',
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        textTransform: 'uppercase',
        color: 'rgba(0, 0, 0, 0.2)',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
        border: `1.5px solid ${darken(color, 0.3)}`,
        background: `linear-gradient(135deg, ${color} 0%, ${lighten(color, 0.28)} 100%)`,
      }}
    >
      {code}
    </Box>
  );
}

/** Prix affiché en jeton + montant gras teinté de la couleur de la monnaie. `null` si absent. */
function PriceTag({ price }: { price: Price }) {
  if (!price) return null;
  const currencyKey = CURRENCY_KEY_BY_ABBREV[price.unit] ?? 'silver';
  const color = CURRENCY_COLOR[currencyKey];
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
      <CoinBadge code={price.unit} color={color} />
      <Typography component="span" sx={{ fontWeight: 700, color }}>
        {price.amount}
      </Typography>
    </Stack>
  );
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
          {kindLabel}
        </Typography>
        <PriceTag price={entry.price} />
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
    <Box sx={{ p: 1.5, ...rowSx }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {barde.name}
        </Typography>
        <PriceTag price={barde.price} />
        <Box sx={{ flexGrow: 1 }} />
        <SourceRef page={barde.sourcePage} term={barde.name} />
      </Stack>
      {/* Statistiques PARSÉES (pas de phrase verbatim) sur leur propre ligne (retour propriétaire) :
          DEF sur la monture, Initiative en malus à la monture ET au cavalier (p. 191). */}
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
        <StatModifierTag value={barde.defBonus} label="DEF" />
        <StatModifierTag value={-barde.defBonus} label="Init. (monture et cavalier)" />
      </Stack>
    </Box>
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

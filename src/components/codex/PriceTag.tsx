'use client';

/**
 * Jeton de prix partagé du Codex (extrait de `CodexMountsBrowser`, PER-422 : 3e consommateur —
 * `CodexEquipmentBrowser` — d'où l'extraction plutôt qu'une 3e copie). Même pastille de monnaie
 * que le jeton « PA » de `PurseField.tsx` (fiche personnage), en version statique (pas
 * d'info-bulle d'origine autre que le nom de la monnaie, catalogue hors personnage) — mais ORDRE
 * INVERSÉ (retour propriétaire) : montant D'ABORD, pastille ENSUITE, lecture « 60 [PA] » plutôt
 * que « [PA] 60 », plus naturelle dans un tableau où le prix se lit avant sa monnaie.
 */
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { darken, lighten } from '@mui/material/styles';
import type { Price } from '@/data/schema';
import { CURRENCY_ABBREV, CURRENCY_COLOR, CURRENCY_LABEL, type CoinCurrency } from '@/lib/character/coinPouch';
import { AppTooltip } from '@/components/AppTooltip';

/** Retrouve la monnaie (`CoinCurrency`) à partir de son abréviation (« pa » → `'silver'`). */
const CURRENCY_KEY_BY_ABBREV: Record<string, CoinCurrency> = Object.fromEntries(
  (Object.entries(CURRENCY_ABBREV) as [CoinCurrency, string][]).map(([key, abbrev]) => [abbrev, key]),
);

function CoinBadge({ code, color, title }: { code: string; color: string; title: string }) {
  return (
    <AppTooltip title={title}>
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
          cursor: 'help',
          color: 'rgba(0, 0, 0, 0.2)',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
          border: `1.5px solid ${darken(color, 0.3)}`,
          background: `linear-gradient(135deg, ${color} 0%, ${lighten(color, 0.28)} 100%)`,
        }}
      >
        {code}
      </Box>
    </AppTooltip>
  );
}

/** Montant (nombre déjà formaté) + pastille de monnaie, dans cet ordre — cœur commun à `PriceTag`
 * (montant numérique) et `PriceMention` (montant tel qu'écrit dans une prose, ex. « 5-50 »). */
function AmountAndCoin({ amountText, unit }: { amountText: string; unit: string }) {
  const currencyKey = CURRENCY_KEY_BY_ABBREV[unit] ?? 'silver';
  const color = CURRENCY_COLOR[currencyKey];
  return (
    <Stack component="span" direction="row" spacing={0.5} sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      <Typography component="span" sx={{ fontWeight: 700, color }}>
        {amountText}
      </Typography>
      <CoinBadge code={unit} color={color} title={CURRENCY_LABEL[currencyKey]} />
    </Stack>
  );
}

/** Prix affiché en jeton + montant gras teinté de la couleur de la monnaie. `null` si absent. */
export function PriceTag({ price }: { price: Price }) {
  if (!price) return null;
  return <AmountAndCoin amountText={String(price.amount)} unit={price.unit} />;
}

/**
 * Mention de PRIX dans une PROSE (PER-422, description d'objet exotique — durium, prix « à
 * fourchette » type « 5-50 pa ») — MÊME pastille que `PriceTag`, mais `amountText` reste le texte
 * capté tel quel (peut être une fourchette, contrairement au `price.amount` toujours numérique du
 * catalogue). Voir `splitCurrencyMentions`.
 */
export function PriceMention({ amountText, unit }: { amountText: string; unit: string }) {
  return <AmountAndCoin amountText={amountText} unit={unit} />;
}

/**
 * Valeur d'un `Price` normalisée en pièces de cuivre (pc), pour trier/comparer des prix
 * d'unités différentes (ex. tableau Codex Équipement, PER-422) — 1 po = 10 pa = 100 pc. `null`
 * (objet sans prix catalogué) trie en dernier (`Infinity`).
 */
export function priceToCopper(price: Price): number {
  if (!price) return Number.POSITIVE_INFINITY;
  const perUnit = { pc: 1, pa: 10, po: 100 } as const;
  return price.amount * (perUnit[price.unit as keyof typeof perUnit] ?? 1);
}

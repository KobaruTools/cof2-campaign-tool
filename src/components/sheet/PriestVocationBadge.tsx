'use client';

import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { priestGodById } from '@/data';
import type { PriestVocation } from '@/lib/character/types';
import { AppTooltip } from '@/components/AppTooltip';
import { PageRefText } from '@/components/SourceRef';

/**
 * Badge d'identité (PER-218) signalant qu'un prêtre s'est SPÉCIALISÉ (héraut d'un
 * seul dieu, p. 122). Posé sous le nom, à côté du profil : la vocation est un trait
 * d'IDENTITÉ, visible d'un coup d'œil et indépendant de l'acquisition de la capacité
 * divine. Pastille custom en teinte secondaire (≠ Chip MUI, cf. conventions),
 * info-bulle rappelant la règle verbatim + puce de source. `null` pour un généraliste,
 * un dieu inconnu, ou une vocation absente (non-prêtre).
 */
export function PriestVocationBadge({ vocation }: { vocation?: PriestVocation | null }) {
  if (vocation?.mode !== 'specialist') return null;
  const god = priestGodById.get(vocation.godId);
  if (!god) return null;
  return (
    <AppTooltip
      title={
        <PageRefText>
          {`Prêtre spécialiste : héraut de ${god.name} (${god.domain}). Il maîtrise l’arme sacrée de son dieu et reçoit une capacité divine (p. 122).`}
        </PageRefText>
      }
    >
      <Box
        component="span"
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.75,
          height: 22,
          borderRadius: 1,
          fontSize: '0.72rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          cursor: 'help',
          color: theme.palette.secondary.main,
          bgcolor: alpha(theme.palette.secondary.main, 0.12),
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.45)}`,
        })}
      >
        <AutoAwesomeOutlinedIcon sx={{ fontSize: 14 }} />
        Spécialiste · {god.name}
      </Box>
    </AppTooltip>
  );
}

/**
 * Ligne descriptive de la vocation d'un prêtre spécialiste pour la section Identité
 * (roleplay, PER-218) : « Vocation : héraut de <Dieu>, <domaine> (symbole : …) ». On
 * réutilise le domaine et le symbole déjà portés par la donnée du dieu. `null` hors
 * prêtre spécialiste.
 */
export function PriestVocationIdentityLine({ vocation }: { vocation?: PriestVocation | null }) {
  if (vocation?.mode !== 'specialist') return null;
  const god = priestGodById.get(vocation.godId);
  if (!god) return null;
  return (
    <Typography variant="body2" sx={{ mb: 1.5 }}>
      <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        Vocation
      </Typography>
      Héraut de {god.name}, {god.domain} (symbole : {god.symbol}).
    </Typography>
  );
}

'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { priestGodById } from '@/data';
import { godColor } from '@/lib/ui/godTheme';
import { godCodexHref } from '@/lib/ui/codex';
import type { PriestVocation } from '@/lib/character/types';
import { AppTooltip } from '@/components/AppTooltip';
import { GodIcon } from '@/components/GodIcon';
import { PageRefText, SourceRef } from '@/components/SourceRef';

/**
 * Badge d'identité (PER-218) signalant qu'un prêtre s'est SPÉCIALISÉ (héraut d'un
 * seul dieu, p. 122). Posé sous le nom, à côté du profil : la vocation est un trait
 * d'IDENTITÉ, visible d'un coup d'œil et indépendant de l'acquisition de la capacité
 * divine. Pastille custom teintée à la couleur d'identité du dieu concerné (`godTheme.ts`,
 * même teinte/icône que sa carte dans le Codex, ≠ Chip MUI, cf. conventions), info-bulle
 * rappelant la règle verbatim + puce de source. `null` pour un généraliste, un dieu inconnu,
 * ou une vocation absente (non-prêtre).
 */
export function PriestVocationBadge({ vocation }: { vocation?: PriestVocation | null }) {
  if (vocation?.mode !== 'specialist') return null;
  const god = priestGodById.get(vocation.godId);
  if (!god) return null;
  const color = godColor(god.id) ?? '#9c27b0';
  return (
    <AppTooltip
      title={
        <>
          <PageRefText>
            {`Prêtre spécialiste : héraut de ${god.name} (${god.domain}). Il maîtrise l’arme sacrée de son dieu et reçoit une capacité divine (p. 122).`}
          </PageRefText>{' '}
          <SourceRef page={god.sourcePage} term={god.name} codexHref={godCodexHref(god.id)} />
        </>
      }
    >
      <Box
        component="span"
        data-glossary-shot="PriestVocationBadge"
        sx={{
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
          color,
          bgcolor: alpha(color, 0.12),
          border: `1px solid ${alpha(color, 0.45)}`,
        }}
      >
        <GodIcon godId={god.id} color={color} size={14} />
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

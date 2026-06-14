'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { Fragment } from 'react';
import { progression } from '@/data';
import type { AbilityId, Die, Feature } from '@/data/schema';
import { scalingDie, type Abilities } from '@/lib/engine';
import { DieIcon } from '@/components/DieIcon';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { parseRichText, resolveExpr, type ResolvedExpr } from '@/lib/ui/featureRichText';

const signed = (v: number) => (v >= 0 ? `+${v}` : `${v}`);

/**
 * Simple RÉFÉRENCE à une caractéristique (ex. « FOR »), mise en avant comme un
 * petit bloc pour la lisibilité, sans valeur calculée (c'est un renvoi, pas un
 * modificateur — distinct des encadrés de formule). Info-bulle = nom complet.
 */
function AbilityRefChip({ ability }: { ability: AbilityId }) {
  return (
    <Tooltip title={ABILITY_NAMES[ability]} arrow>
      <Box
        component="span"
        sx={{
          display: 'inline-block',
          verticalAlign: 'baseline',
          px: 0.5,
          mx: 0.15,
          borderRadius: 0.75,
          fontWeight: 700,
          fontSize: '0.85em',
          letterSpacing: 0.3,
          lineHeight: 1.4,
          cursor: 'help',
          color: 'text.primary',
          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
          border: 1,
          borderColor: (theme) => alpha(theme.palette.text.primary, 0.2),
        }}
      >
        {ability}
      </Box>
    </Tooltip>
  );
}

/** Un dé d'une formule ou isolé : icône + multiplicateur éventuel. */
function DiePart({
  count,
  die,
  evolving,
  level,
  noTooltip = false,
}: {
  count: number;
  die: Die;
  evolving: boolean;
  level: number;
  /** Laisse l'info-bulle au conteneur parent (ex. encadré de formule). */
  noTooltip?: boolean;
}) {
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, verticalAlign: 'middle' }}
    >
      {count > 1 && <Box component="span">{count}</Box>}
      <DieIcon die={die} size={22} evolving={evolving} level={level} noTooltip={noTooltip} />
    </Box>
  );
}

/**
 * Encadré d'une formule DÉTERMINISTE (sans dé) : affiche le total calculé, avec
 * le détail du calcul en info-bulle (base + caractéristique + bonus = total),
 * sur le modèle de `derivedStatBreakdown`.
 */
function FormulaTotal({ resolved }: { resolved: ResolvedExpr }) {
  const tooltip = (
    <Box sx={{ minWidth: 160 }}>
      {resolved.parts.map((p, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>{p.label}</span>
          <span style={{ fontWeight: 600 }}>{signed(p.sign * (p.value ?? 0))}</span>
        </Box>
      ))}
      {resolved.parts.length > 1 && (
        <>
          <Divider sx={{ my: 0.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, fontWeight: 700 }}>
            <span>Total</span>
            <span>{resolved.total}</span>
          </Box>
        </>
      )}
    </Box>
  );
  return (
    <Tooltip title={tooltip} arrow>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          px: 0.6,
          mx: 0.15,
          borderRadius: 1,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          cursor: 'help',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
          border: 1,
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.4),
        }}
      >
        {resolved.hasAbility ? (
          <>
            {/* Formule symbolique (ex. « CHA », « FOR + 1 ») pour que la phrase
                garde son sens, suivie du total calculé entre parenthèses. */}
            <Box component="span" sx={{ fontWeight: 600 }}>
              {resolved.parts
                .map((p, i) => (i > 0 || p.sign === -1 ? `${p.sign === -1 ? '−' : '+'} ` : '') + p.symbol)
                .join(' ')}
            </Box>
            <Box component="span" sx={{ ml: 0.5 }}>
              ({signed(resolved.total ?? 0)})
            </Box>
          </>
        ) : (
          signed(resolved.total ?? 0)
        )}
      </Box>
    </Tooltip>
  );
}

/** Formule symbolique telle qu'écrite (ex. « 1d4° + CHA »), pour l'info-bulle. */
function symbolicFormula(resolved: ResolvedExpr): string {
  return resolved.parts
    .map((p, i) => (i > 0 || p.sign === -1 ? `${p.sign === -1 ? '−' : '+'} ` : '') + p.symbol)
    .join(' ');
}

/**
 * Encadré d'une formule contenant un DÉ (non déterministe) : on ne calcule pas
 * de total (le dé est lancé à la table), on rend la suite dé(s) +
 * caractéristiques résolues à leur valeur courante. L'info-bulle décrit la
 * formule entière (dé évolutif + caractéristiques), pas seulement le dé.
 */
function FormulaWithDie({ resolved, level }: { resolved: ResolvedExpr; level: number }) {
  const tooltip = (
    <Box sx={{ minWidth: 180 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {symbolicFormula(resolved)}
      </Typography>
      {resolved.parts.map((p, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>{p.die ? (p.die.evolving ? 'Dé évolutif' : 'Dé') : p.label}</span>
          <span style={{ fontWeight: 600 }}>
            {p.die
              ? `${p.die.count > 1 ? p.die.count : ''}${p.die.displayDie}${p.die.evolving ? ` (niveau ${level})` : ''}`
              : signed(p.sign * (p.value ?? 0))}
          </span>
        </Box>
      ))}
    </Box>
  );
  return (
    <Tooltip title={tooltip} arrow>
      {/* Boîte inline-block : le texte (caractéristiques, nombres) reste sur la
          baseline, seul le dé est centré verticalement (`vertical-align: middle`
          porté par DiePart) pour ne pas « flotter ». */}
      <Box
        component="span"
        sx={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          px: 0.6,
          mx: 0.15,
          lineHeight: 1,
          borderRadius: 1,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          cursor: 'help',
          bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.1),
          border: 1,
          borderColor: (theme) => alpha(theme.palette.secondary.main, 0.35),
        }}
      >
        {resolved.parts.map((p, i) => {
          // Opérateur tel qu'écrit dans la formule (la valeur signée résolue est
          // montrée à part entre parenthèses pour chaque caractéristique).
          const connector = i > 0 ? ` ${p.sign === -1 ? '−' : '+'} ` : p.sign === -1 ? '− ' : '';
          return (
            <Fragment key={i}>
              {connector && <Box component="span">{connector}</Box>}
              {p.die ? (
                <DiePart
                  count={p.die.count}
                  die={p.die.displayDie}
                  evolving={p.die.evolving}
                  level={level}
                  noTooltip
                />
              ) : p.kind === 'ability' ? (
                // Règle générale : on montre toujours le code de la stat pour la
                // lisibilité (ex. « CHA (+5) »).
                <Box component="span">
                  {p.symbol} ({signed(p.value ?? 0)})
                </Box>
              ) : (
                <Box component="span">{p.value}</Box>
              )}
            </Fragment>
          );
        })}
      </Box>
    </Tooltip>
  );
}

export interface FeatureTextProps {
  feature: Feature;
  /** Caractéristiques du personnage : requises pour le rendu enrichi. */
  abilities?: Abilities;
  /** Niveau du personnage : requis pour le rendu enrichi (dé évolutif, formules). */
  level?: number;
}

/**
 * Texte d'une capacité. Si la capacité a un `richText` ET que le contexte du
 * personnage (caractéristiques + niveau) est fourni, on affiche le rendu ENRICHI
 * (dés en icônes, dé évolutif au niveau courant, formules calculées en encadré).
 * Sinon, on retombe proprement sur le `text` verbatim — c'est le comportement
 * par défaut tant qu'une capacité n'a pas été réécrite (PER-64).
 */
export function FeatureText({ feature, abilities, level }: FeatureTextProps) {
  const enriched = feature.richText && abilities && level != null;
  if (!enriched) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ whiteSpace: 'pre-line', fontSize: '1rem' }}
      >
        {feature.text}
      </Typography>
    );
  }

  const segments = parseRichText(feature.richText!);
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      component="div"
      sx={{ whiteSpace: 'pre-line', lineHeight: 1.9, fontSize: '1rem' }}
    >
      {segments.map((seg, i) => {
        if (seg.kind === 'text') return <Fragment key={i}>{seg.value}</Fragment>;
        if (seg.kind === 'abilityRef') return <AbilityRefChip key={i} ability={seg.ability} />;
        if (seg.kind === 'die') {
          // Dé évolutif → valeur concrète au niveau courant (p. 43).
          const displayDie = seg.token.evolving ? scalingDie(level!, progression) : seg.token.die;
          return (
            <DiePart
              key={i}
              count={seg.token.count}
              die={displayDie}
              evolving={seg.token.evolving}
              level={level!}
            />
          );
        }
        const resolved = resolveExpr(seg.terms, abilities!, level!, progression);
        return resolved.hasDie ? (
          <FormulaWithDie key={i} resolved={resolved} level={level!} />
        ) : (
          <FormulaTotal key={i} resolved={resolved} />
        );
      })}
    </Typography>
  );
}

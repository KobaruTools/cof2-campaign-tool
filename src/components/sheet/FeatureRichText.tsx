'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { Fragment } from 'react';
import { progression } from '@/data';
import type { Die, Feature } from '@/data/schema';
import { scalingDie, type Abilities } from '@/lib/engine';
import { DieIcon } from '@/components/DieIcon';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { dieCountAtRank, parseRichText, resolveExpr, type ResolvedExpr } from '@/lib/ui/featureRichText';
import { splitGlossary } from '@/lib/ui/glossary';

const signed = (v: number) => (v >= 0 ? `+${v}` : `${v}`);

/** Tonalité d'une puce de référence : caractéristique (neutre) ou stat dérivée (teinte dédiée). */
type RefTone = 'ability' | 'derived';

/**
 * Référence mise en avant comme une petite puce, sans valeur calculée : une
 * CARACTÉRISTIQUE (« FOR », renvoi `@CODE`) ou une STAT DÉRIVÉE (« DEF », « PV »…,
 * reconnue via le glossaire). La tonalité distingue visuellement les deux familles
 * (couleur légèrement différente pour les stats dérivées). Info-bulle = nom complet.
 */
function RefChip({ label, title, tone }: { label: string; title: string; tone: RefTone }) {
  // Stat dérivée → ambre/orange pâle (`warning`), DISTINCT du bleu déjà utilisé par
  // les quantités (`[=CHA]`) et les formules (`10 + CHA`). Caractéristique → neutre.
  const accent = (theme: { palette: { warning: { main: string }; text: { primary: string } } }) =>
    tone === 'derived' ? theme.palette.warning.main : theme.palette.text.primary;
  return (
    <Tooltip title={title} arrow>
      <Box
        component="span"
        sx={{
          display: 'inline-block',
          verticalAlign: 'baseline',
          px: 0.6,
          mx: 0.2,
          borderRadius: 0.75,
          fontWeight: 700,
          fontSize: '0.95em',
          letterSpacing: 0.3,
          lineHeight: 1.4,
          cursor: 'help',
          color: 'text.primary',
          bgcolor: (theme) => alpha(accent(theme), tone === 'derived' ? 0.12 : 0.08),
          border: 1,
          borderColor: (theme) => alpha(accent(theme), tone === 'derived' ? 0.4 : 0.2),
        }}
      >
        {label}
      </Box>
    </Tooltip>
  );
}

/**
 * Terme de JARGON (NC, RD, DM, MJ…) : ni caractéristique ni stat du personnage,
 * juste un terme de règle. Souligné pointillé discret + info-bulle explicative.
 */
function GlossaryMark({ label, title }: { label: string; title: string }) {
  return (
    <Tooltip title={title} arrow>
      <Box
        component="span"
        sx={{
          cursor: 'help',
          borderBottom: (theme) => `1px dotted ${alpha(theme.palette.text.secondary, 0.7)}`,
        }}
      >
        {label}
      </Box>
    </Tooltip>
  );
}

/**
 * TERME NOMMÉ employé comme SUBSTANTIF (`[#rang]`, `[#niveau]`) : encadré « mot
 * (valeur) » (« rang (5) ») — le MOT pour que la phrase se lise naturellement
 * (« égal au rang »), suivi de sa valeur résolue sur le personnage. Encadré
 * comme les autres blocs, en teinte VERTE (`success`), distinct de la quantité
 * numérique (`[=…]`, bleu) et de la formule de modificateur (primaire). Info-bulle
 * = libellé complet (« Rang atteint dans la voie = 5 »).
 */
function TermWord({ word, value, title }: { word: string; value: number; title: string }) {
  return (
    <Tooltip title={title} arrow>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          verticalAlign: 'middle',
          minHeight: '22px',
          whiteSpace: 'nowrap',
          px: 0.6,
          mx: 0.15,
          lineHeight: 1,
          borderRadius: 1,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          cursor: 'help',
          bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
          border: 1,
          borderColor: (theme) => alpha(theme.palette.success.main, 0.4),
        }}
      >
        {word} ({value})
      </Box>
    </Tooltip>
  );
}

/**
 * Rend une portion de TEXTE LITTÉRAL en mettant en avant les acronymes du glossaire
 * (stats dérivées → puce ; jargon → souligné). Le reste est du texte brut (les
 * sauts de ligne sont préservés par le conteneur `pre-line`). Utilisé pour les
 * segments texte du rendu enrichi ET pour le `text` verbatim de repli.
 */
function RichTextRun({ value }: { value: string }) {
  return (
    <>
      {splitGlossary(value).map((piece, i) =>
        piece.kind === 'text' ? (
          <Fragment key={i}>{piece.value}</Fragment>
        ) : piece.entry.category === 'ability' ? (
          <RefChip key={i} label={piece.term} title={piece.entry.label} tone="ability" />
        ) : piece.entry.category === 'derived' ? (
          <RefChip key={i} label={piece.term} title={piece.entry.label} tone="derived" />
        ) : (
          <GlossaryMark key={i} label={piece.term} title={piece.entry.label} />
        ),
      )}
    </>
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
  // Lecture claire : chaque variable résolue à sa valeur BRUTE entre parenthèses,
  // opérateurs de la formule, puis « = total » — « 10 + CHA (4) = 14 ». Une formule
  // à un seul terme variable s'affiche sans « = » (« CHA (4) »). Sans variable, on
  // montre simplement le total signé.
  const inline = resolved.parts
    .map((p, i) => {
      const connector = i > 0 ? ` ${p.sign === -1 ? '−' : '+'} ` : p.sign === -1 ? '− ' : '';
      const body = p.kind === 'number' ? p.symbol : `${p.symbol} (${p.value ?? 0})`;
      return connector + body;
    })
    .join('');
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
  // Style compact aligné sur l'encadré de dé ; couleur PRIMAIRE pour le distinguer
  // d'une formule à dé (secondaire).
  return (
    <Tooltip title={tooltip} arrow>
      <Box
        component="span"
        sx={{
          // Hauteur alignée sur l'encadré de dé (dont la hauteur est imposée par
          // l'icône de dé, ~22 px) pour que les deux blocs s'accordent dans la phrase.
          display: 'inline-flex',
          alignItems: 'center',
          verticalAlign: 'middle',
          minHeight: '22px',
          whiteSpace: 'nowrap',
          px: 0.6,
          mx: 0.15,
          lineHeight: 1,
          borderRadius: 1,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          cursor: 'help',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
          border: 1,
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.35),
        }}
      >
        {resolved.hasAbility
          ? `${inline}${resolved.parts.length > 1 ? ` = ${resolved.total}` : ''}`
          : signed(resolved.total ?? 0)}
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
 * QUANTITÉ (`[=CHA]`, `[=CHA × 100]`, `[=rang]`…) : une stat/un rang/un niveau
 * utilisé comme valeur brute (durée, portée, nombre de cibles), affiché comme un
 * simple nombre — PAS comme un modificateur signé (« 5 minutes », pas
 * « CHA (+5) minutes »). L'info-bulle rappelle la dérivation (« CHA × 100 = 500 »).
 */
/**
 * Dérivation lisible d'une quantité, multiplicateur explicité (« 5 × 100 = 500 »)
 * pour la clarté/accessibilité. Un seul terme nommé → libellé complet ; sinon une
 * expression valuée.
 */
function quantityTooltip(resolved: ResolvedExpr): string {
  // Valeur de base d'un terme (avant multiplicateur), pour montrer « 5 × 100 ».
  const valued = (p: (typeof resolved.parts)[number]): string => {
    if (p.kind === 'number') return String(p.value);
    if (p.coeff !== undefined && p.value != null) {
      return `${p.symbol.split(' × ')[0]} (${p.value / p.coeff}) × ${p.coeff}`;
    }
    return p.value != null ? `${p.symbol} (${p.value})` : p.symbol;
  };
  if (resolved.parts.length === 1) {
    const p = resolved.parts[0];
    if (p.kind === 'number') return String(p.value);
    // Dérivation TOUJOURS explicite, même sans multiplicateur (× 1), pour la clarté.
    const coeff = p.coeff ?? 1;
    const base = p.value != null ? p.value / coeff : 0;
    return `${p.label} : ${base} × ${coeff} = ${resolved.total}`;
  }
  const body = resolved.parts
    .map((p, i) => (i > 0 ? `${p.sign === -1 ? ' − ' : ' + '}` : p.sign === -1 ? '− ' : '') + valued(p))
    .join('');
  return `${body} = ${resolved.total}`;
}

function QuantityValue({ resolved }: { resolved: ResolvedExpr }) {
  // Quantité déterministe attendue ; au cas (théorique) où un dé s'y glisse, on
  // se rabat sur la forme symbolique pour ne rien afficher de faux.
  const display = resolved.total != null ? String(resolved.total) : symbolicFormula(resolved);
  const tooltip = resolved.total != null ? quantityTooltip(resolved) : symbolicFormula(resolved);
  return (
    <Tooltip title={tooltip} arrow>
      <Box
        component="span"
        sx={{
          display: 'inline-block',
          px: 0.5,
          mx: 0.1,
          borderRadius: 0.75,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          cursor: 'help',
          color: 'text.primary',
          bgcolor: (theme) => alpha(theme.palette.info.main, 0.12),
          borderBottom: (theme) => `1px dashed ${alpha(theme.palette.info.main, 0.6)}`,
        }}
      >
        {display}
      </Box>
    </Tooltip>
  );
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
                // On montre toujours le code de la stat + sa valeur BRUTE entre
                // parenthèses (ex. « CHA (4) »), cohérent avec les formules sans dé.
                <Box component="span">
                  {p.symbol} ({p.value ?? 0})
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
  /**
   * Rang ATTEINT dans la voie hôte de la capacité (le plus haut rang acquis), pour
   * résoudre le terme `rang` des formules/quantités — « son rang » = rang dans la
   * voie courante, qui grandit avec la progression (et non le rang figé de la
   * capacité). Absent → repli sur `feature.rank` (contextes sans personnage).
   */
  pathRank?: number;
}

/**
 * Texte d'une capacité. Si la capacité a un `richText` ET que le contexte du
 * personnage (caractéristiques + niveau) est fourni, on affiche le rendu ENRICHI
 * (dés en icônes, dé évolutif au niveau courant, formules calculées en encadré).
 * Sinon, on retombe proprement sur le `text` verbatim — c'est le comportement
 * par défaut tant qu'une capacité n'a pas été réécrite (PER-64).
 */
export function FeatureText({ feature, abilities, level, pathRank }: FeatureTextProps) {
  const enriched = feature.richText && abilities && level != null;
  if (!enriched) {
    // Repli : `text` verbatim, mais on met quand même en avant les acronymes du
    // glossaire (stats dérivées, jargon) — ils ne dépendent pas du contexte du perso.
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        component="div"
        sx={{ whiteSpace: 'pre-line', fontSize: '1rem' }}
      >
        <RichTextRun value={feature.text} />
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
        if (seg.kind === 'text') return <RichTextRun key={i} value={seg.value} />;
        if (seg.kind === 'abilityRef')
          return <RefChip key={i} label={seg.ability} title={ABILITY_NAMES[seg.ability]} tone="ability" />;
        if (seg.kind === 'die') {
          // Dé évolutif → valeur concrète au niveau courant (p. 43) ; nombre de dés
          // résolu au rang de voie atteint (paliers `countSteps`, ex. 1d4° → 2d4° au rang 4).
          const displayDie = seg.token.evolving ? scalingDie(level!, progression) : seg.token.die;
          return (
            <DiePart
              key={i}
              count={dieCountAtRank(seg.token, pathRank ?? feature.rank)}
              die={displayDie}
              evolving={seg.token.evolving}
              level={level!}
            />
          );
        }
        // `rang` = rang ATTEINT dans la voie hôte (pathRank, le plus haut rang acquis,
        // donc « son rang » dynamique) ; repli sur le rang figé de la capacité si non fourni.
        const resolved = resolveExpr(seg.terms, abilities!, level!, progression, pathRank ?? feature.rank);
        if (seg.kind === 'term') {
          // `[#rang]`/`[#niveau]`/`[#CARAC]` : un seul terme nommé nu (cf. `isBareNamedTerm`),
          // rendu « mot (valeur) » pour que la phrase garde son déterminant.
          const part = resolved.parts[0];
          const title =
            part.kind === 'rank'
              ? `Rang atteint dans la voie = ${part.value ?? 0}`
              : part.kind === 'level'
                ? `Niveau = ${part.value ?? 0}`
                : `${part.label} = ${part.value ?? 0}`; // caractéristique (« Charisme (CHA) = 5 »)
          return <TermWord key={i} word={part.symbol} value={part.value ?? 0} title={title} />;
        }
        if (seg.kind === 'quantity') return <QuantityValue key={i} resolved={resolved} />;
        return resolved.hasDie ? (
          <FormulaWithDie key={i} resolved={resolved} level={level!} />
        ) : (
          <FormulaTotal key={i} resolved={resolved} />
        );
      })}
    </Typography>
  );
}

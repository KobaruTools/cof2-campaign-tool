'use client';

import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha, darken, lighten, type SxProps, type Theme } from '@mui/material/styles';
import { createContext, useContext, Fragment, type ReactNode } from 'react';
import { featureById, pathById, progression } from '@/data';
import type { AbilityId, AbilitySubstitution, Die, Feature, StatusEffectId } from '@/data/schema';
import { STATUS_EFFECTS } from '@/data/schema';
import { scalingDie, type Abilities } from '@/lib/engine';
import { AppTooltip } from '@/components/AppTooltip';
import { SourceRef } from '@/components/SourceRef';
import { ClassIcon } from '@/components/ClassIcon';
import { AncestryIcon } from '@/components/AncestryIcon';
import { DieIcon } from '@/components/DieIcon';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { ANCESTRY_COLOR, MAGE_PATH_COLOR, classColor } from '@/lib/ui/classColors';
import { dieAtRank, parseRichText, resolveExpr, type ResolvedExpr } from '@/lib/ui/featureRichText';
import { splitNotes } from '@/lib/ui/featureNotes';
import { splitGameTerms, splitGlossary } from '@/lib/ui/glossary';

const signed = (v: number) => (v >= 0 ? `+${v}` : `${v}`);

/**
 * Force l'affichage VERBATIM (`Feature.text`) au lieu du rendu enrichi (dés, dé
 * évolutif, encadrés de formule — PER-64), consommé par `FeatureText` (PER-88).
 * Défaut `false` → rendu enrichi (la vue par défaut). Un `Provider` dans l'en-tête
 * de la section « Voies & capacités » bascule toute la section vers le texte d'origine.
 */
export const FeatureVerbatimContext = createContext(false);

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
    <AppTooltip title={title}>
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
    </AppTooltip>
  );
}

/**
 * Référence à une AUTRE capacité (`[&feature-id|texte]`, PER-72) : puce encadrée aux couleurs du
 * PROFIL de la capacité citée. Style UNIQUE (PER-73, unifié) : fond de couleur de voie ASSOMBRIE vers
 * le noir, texte + icône de couleur de voie ÉCLAIRCIE vers le blanc, et une ombre portée noire discrète
 * derrière le texte et l'icône. Lisible sur tout fond (clair, sombre, tooltip) sans variante. Affichage
 * de base UNIFORME (décision propriétaire) : couleur + icône du profil + NOM de la capacité ; l'ORIGINE
 * (« Voie du X, rang N ») passe en info-bulle. Référence inconnue (id erroné) → repli silencieux sur le
 * texte brut.
 */
export function CapabilityChip({
  featureId,
  label,
  sx,
}: {
  featureId: string;
  label: string | null;
  /** Surcharge de style ponctuelle (ex. texte agrandi dans les tooltips de stats dérivées). */
  sx?: SxProps<Theme>;
}) {
  const feature = featureById.get(featureId);
  const path = feature ? pathById.get(feature.pathId) : undefined;
  // Couleur + icône selon le TYPE de voie : profil (`class`) → teinte du profil + icône de profil ;
  // peuple (`ancestry`) → teinte de peuple + icône de peuple (PER-73) ; voie du mage (`mage`) →
  // indigo arcane dédié + icône de chapeau de mage (clé `mage` dans le jeu d'icônes de peuple, la
  // voie du mage occupant l'emplacement peuple). Les voies de PRESTIGE n'ont toujours pas d'identité
  // dédiée → repli silencieux sur le texte brut.
  const classId = path?.type === 'class' ? path.classIds[0] : undefined;
  const ancestryId = path?.type === 'ancestry' ? path.ancestryIds[0] : undefined;
  const isMage = path?.type === 'mage';
  const text = label ?? feature?.name ?? featureId;
  if (!feature || (!classId && !ancestryId && !isMage)) return <>{text}</>;
  const color = classId ? classColor(classId) : isMage ? MAGE_PATH_COLOR : ANCESTRY_COLOR;
  return (
    <AppTooltip title={path ? `${path.name}, rang ${feature.rank}` : feature.name}>
      <Box
        component="span"
        sx={[
          {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.35,
            verticalAlign: 'baseline',
            px: 0.6,
            mx: 0.2,
            borderRadius: 0.75,
            fontWeight: 700,
            fontSize: '0.95em',
            lineHeight: 1.4,
            cursor: 'help',
            // Texte + icône : couleur de voie ÉCLAIRCIE vers le blanc (l'icône suit via `currentColor`).
            color: lighten(color, 0.6),
            // Fond : couleur de voie ASSOMBRIE vers le noir (contraste avec le texte éclairci).
            bgcolor: darken(color, 0.7),
            border: 1,
            borderColor: alpha(color, 0.45),
            // Ombre portée noire discrète derrière le texte et l'icône (SVG) pour renforcer le contraste.
            textShadow: '0 1px 1.5px rgba(0, 0, 0, 0.35)',
            '& svg': { filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35))' },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {classId ? (
          <ClassIcon classId={classId} size={14} color="currentColor" />
        ) : (
          <AncestryIcon ancestryId={isMage ? 'mage' : ancestryId!} size={14} color="currentColor" />
        )}
        {text}
      </Box>
    </AppTooltip>
  );
}

/**
 * Terme de JARGON (NC, RD, DM, MJ…) : ni caractéristique ni stat du personnage,
 * juste un terme de règle. Souligné pointillé discret + info-bulle explicative.
 */
function GlossaryMark({ label, title }: { label: string; title: string }) {
  return (
    <AppTooltip title={title}>
      <Box
        component="span"
        sx={{
          cursor: 'help',
          borderBottom: (theme) => `1px dotted ${alpha(theme.palette.text.secondary, 0.7)}`,
        }}
      >
        {label}
      </Box>
    </AppTooltip>
  );
}

/**
 * ÉTAT PRÉJUDICIABLE de CO2 (« immobilisé », « étourdi »… — glossaire p. 214-215, PER-208) :
 * pastille à dominante ROUGE (`error`), dans l'esprit des autres pastilles inline. Le MOT conserve
 * sa casse et son accord tels qu'écrits dans la prose (« immobilisée ») ; l'info-bulle rappelle
 * l'effet VERBATIM de l'état et sa page source (catalogue `STATUS_EFFECTS`, source unique).
 */
function StatusEffectChip({ label, stateId }: { label: string; stateId: StatusEffectId }) {
  const info = STATUS_EFFECTS[stateId];
  const title = (
    <Box>
      <Box component="span" sx={{ fontWeight: 700, display: 'block' }}>
        {info.label}
      </Box>
      <Box component="span" sx={{ display: 'block', mb: 0.5 }}>
        {info.effect}
      </Box>
      <SourceRef page={info.sourcePage} />
    </Box>
  );
  return (
    <AppTooltip title={title}>
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
          lineHeight: 1.4,
          cursor: 'help',
          color: (theme) => theme.palette.error.main,
          bgcolor: (theme) => alpha(theme.palette.error.main, 0.12),
          border: 1,
          borderColor: (theme) => alpha(theme.palette.error.main, 0.45),
        }}
      >
        {label}
      </Box>
    </AppTooltip>
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
    <AppTooltip title={title}>
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
    </AppTooltip>
  );
}

/**
 * Action de jet (« test », « test opposé ») : simple mise en GRAS, sans info-bulle.
 */
function GameAction({ label }: { label: string }) {
  return (
    <Box component="strong" sx={{ fontWeight: 700 }}>
      {label}
    </Box>
  );
}

/**
 * Rend une portion de TEXTE LITTÉRAL en mettant en avant les notions de jeu :
 *  - locutions de jeu auto-détectées (`splitGameTerms`) : action de jet → gras ;
 *    jet d'attaque → puce de stat dérivée (ambre) ;
 *  - dans le reste, les acronymes du glossaire (`splitGlossary`) : caractéristique
 *    → puce neutre ; stat dérivée → puce ambre ; jargon → souligné.
 * Les sauts de ligne sont préservés par le conteneur `pre-line`. Utilisé pour les
 * segments texte du rendu enrichi ET pour le `text` verbatim de repli.
 */
function GlossaryRun({ value }: { value: string }) {
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

function RichTextRun({ value }: { value: string }) {
  return (
    <>
      {splitGameTerms(value).map((piece, i) =>
        piece.kind === 'text' ? (
          <GlossaryRun key={i} value={piece.value} />
        ) : piece.entry.category === 'attack' ? (
          <RefChip key={i} label={piece.term} title={piece.entry.label} tone="derived" />
        ) : piece.entry.category === 'status' ? (
          // État préjudiciable (« immobilisé », « étourdi »… p. 214-215) : pastille rouge dédiée,
          // info-bulle = effet verbatim + source (cf. StatusEffectChip). `stateId` toujours présent
          // pour la catégorie `status` (généré depuis le catalogue).
          <StatusEffectChip key={i} label={piece.term} stateId={piece.entry.stateId!} />
        ) : piece.entry.category === 'rule' ? (
          // Notion de règle en locution (« attaque sournoise », « dans le dos »…) : même
          // rendu que le jargon acronyme (souligné pointillé + info-bulle).
          <GlossaryMark key={i} label={piece.term} title={piece.entry.label} />
        ) : (
          <GameAction key={i} label={piece.term} />
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
/** Première substitution de caractéristique appliquée dans une formule résolue (PER-163), ou `undefined`. */
function resolvedSubstitution(resolved: ResolvedExpr): { from: AbilityId; to: AbilityId } | undefined {
  return resolved.parts.find((p) => p.substituted)?.substituted;
}

/**
 * Panneau d'AVERTISSEMENT (contenu d'info-bulle) signalant une substitution de caractéristique
 * (PER-163) : le forgesort lance/reproduit ce sort avec sa propre carac de magie (INT) au lieu de
 * celle de l'auteur d'origine. `derivation` = texte de dérivation habituel, ajouté sous l'avertissement.
 */
function SubstitutionWarningPanel({
  from,
  to,
  derivation,
}: {
  from: AbilityId;
  to: AbilityId;
  derivation: ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
      <WarningAmberOutlinedIcon fontSize="small" sx={{ mt: '1px', color: 'warning.light', flexShrink: 0 }} />
      <Box>
        <Box component="span" sx={{ fontWeight: 700, display: 'block' }}>
          Caractéristique remplacée
        </Box>
        <Box component="span" sx={{ display: 'block', mb: 0.5 }}>
          {ABILITY_NAMES[to]} ({to}) remplace {ABILITY_NAMES[from]} ({from}) : le forgesort lance ce sort
          avec sa caractéristique de magie.
        </Box>
        {derivation}
      </Box>
    </Box>
  );
}

/** Petite icône d'avertissement amber accolée à une valeur substituée (repère visuel, PER-163). */
function SubstitutionMark() {
  return (
    <WarningAmberOutlinedIcon
      sx={{ fontSize: '0.95em', ml: 0.3, verticalAlign: 'middle', color: 'warning.main' }}
    />
  );
}

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
  // Substitution de carac appliquée (PER-163) → accent AMBRE + avertissement.
  const sub = resolvedSubstitution(resolved);
  const finalTooltip = sub ? (
    <SubstitutionWarningPanel from={sub.from} to={sub.to} derivation={tooltip} />
  ) : (
    tooltip
  );
  const accent = sub ? 'warning' : 'primary';
  // Style compact aligné sur l'encadré de dé ; couleur PRIMAIRE pour le distinguer
  // d'une formule à dé (secondaire) — ambre si une substitution a eu lieu.
  return (
    <AppTooltip title={finalTooltip} maxWidth={sub ? 300 : undefined}>
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
          bgcolor: (theme) => alpha(theme.palette[accent].main, 0.1),
          border: 1,
          borderColor: (theme) => alpha(theme.palette[accent].main, 0.35),
        }}
      >
        {resolved.hasAbility
          ? `${inline}${resolved.parts.length > 1 ? ` = ${resolved.total}` : ''}`
          : signed(resolved.total ?? 0)}
        {sub && <SubstitutionMark />}
      </Box>
    </AppTooltip>
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
    // Produit de variables (`niveau × INT`) : « niveau (5) × INT (4) [× coeff] = total ».
    if (p.kind === 'product' && p.productParts) {
      const body = p.productParts.map((f) => `${f.symbol} (${f.value})`).join(' × ');
      return `${body}${p.coeff !== undefined ? ` × ${p.coeff}` : ''} = ${resolved.total}`;
    }
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
  const derivation = resolved.total != null ? quantityTooltip(resolved) : symbolicFormula(resolved);
  // Substitution de carac appliquée (PER-163) → accent AMBRE + icône d'avertissement + panneau
  // explicatif dans l'info-bulle (le forgesort lance avec son INT).
  const sub = resolvedSubstitution(resolved);
  const tooltip = sub ? (
    <SubstitutionWarningPanel from={sub.from} to={sub.to} derivation={derivation} />
  ) : (
    derivation
  );
  const accent = sub ? 'warning' : 'info';
  return (
    <AppTooltip title={tooltip} maxWidth={sub ? 300 : undefined}>
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
          bgcolor: (theme) => alpha(theme.palette[accent].main, 0.12),
          borderBottom: (theme) => `1px dashed ${alpha(theme.palette[accent].main, 0.6)}`,
        }}
      >
        {display}
        {sub && <SubstitutionMark />}
      </Box>
    </AppTooltip>
  );
}

/**
 * Encadré d'une formule contenant un DÉ (non déterministe) : on ne calcule pas
 * de total (le dé est lancé à la table), on rend la suite dé(s) +
 * caractéristiques résolues à leur valeur courante. L'info-bulle décrit la
 * formule entière (dé évolutif + caractéristiques), pas seulement le dé.
 */
function FormulaWithDie({ resolved, level }: { resolved: ResolvedExpr; level: number }) {
  // Formule contenant au moins un dé ÉVOLUTIF → renvoi au livre (« D4°, les dés
  // évolutifs », p. 43) en pied d'info-bulle, sur sa propre ligne.
  const hasEvolvingDie = resolved.parts.some((p) => p.die?.evolving);
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
      {hasEvolvingDie && (
        <Box sx={{ mt: 0.75 }}>
          <SourceRef page={43} />
        </Box>
      )}
    </Box>
  );
  // Substitution de carac appliquée (PER-163) → accent AMBRE + avertissement.
  const sub = resolvedSubstitution(resolved);
  const finalTooltip = sub ? (
    <SubstitutionWarningPanel from={sub.from} to={sub.to} derivation={tooltip} />
  ) : (
    tooltip
  );
  const accent = sub ? 'warning' : 'secondary';
  return (
    <AppTooltip title={finalTooltip} maxWidth={sub ? 320 : undefined}>
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
          bgcolor: (theme) => alpha(theme.palette[accent].main, 0.1),
          border: 1,
          borderColor: (theme) => alpha(theme.palette[accent].main, 0.35),
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
              ) : p.kind === 'ability' || p.kind === 'abilityBest' ? (
                // On montre toujours le code de la stat + sa valeur BRUTE entre
                // parenthèses (ex. « CHA (4) ») ; pour une « meilleure de », le code
                // est celui de la carac retenue (ex. « AGI (3) »).
                <Box component="span">
                  {p.symbol} ({p.value ?? 0})
                </Box>
              ) : (
                <Box component="span">{p.value}</Box>
              )}
            </Fragment>
          );
        })}
        {sub && <SubstitutionMark />}
      </Box>
    </AppTooltip>
  );
}

/**
 * Rend un texte balisé EN LIGNE (segments du mini-langage richText) contre un
 * contexte de personnage. Cœur réutilisable du rendu enrichi : utilisé par la
 * description d'une capacité (`FeatureText`) ET par les valeurs d'un profil de
 * créature (`CreatureStatBlock`). `rank` = rang à substituer au terme `rang`
 * (rang atteint dans la voie hôte).
 */
export function RichInline({
  text,
  abilities,
  level,
  rank,
  milestoneBonus = 0,
  abilitySubstitutions,
}: {
  text: string;
  abilities: Abilities;
  level: number;
  rank: number;
  /** Bonus plat cross-voie injecté au terme `paliers` des formules (défaut 0). */
  milestoneBonus?: number;
  /** Substitutions de carac contextuelles (PER-163, ex. forgesort → INT). Passées à `resolveExpr`. */
  abilitySubstitutions?: AbilitySubstitution[];
}) {
  return (
    <>
      {parseRichText(text).map((seg, i) => {
        if (seg.kind === 'text') return <RichTextRun key={i} value={seg.value} />;
        if (seg.kind === 'capabilityRef')
          return <CapabilityChip key={i} featureId={seg.featureId} label={seg.label} />;
        if (seg.kind === 'abilityRef')
          return <RefChip key={i} label={seg.ability} title={ABILITY_NAMES[seg.ability]} tone="ability" />;
        if (seg.kind === 'die') {
          // Nombre, faces ET caractère évolutif résolus au rang de voie (un palier `|1d4°@R`
          // peut rendre le dé évolutif) ; dé évolutif → valeur au niveau courant.
          const { count, die, evolving } = dieAtRank(seg.token, rank);
          const displayDie = evolving ? scalingDie(level, progression) : die;
          return (
            <DiePart key={i} count={count} die={displayDie} evolving={evolving} level={level} />
          );
        }
        const resolved = resolveExpr(seg.terms, abilities, level, progression, rank, milestoneBonus, abilitySubstitutions);
        if (seg.kind === 'term') {
          // `[#…]` : substantif « symboles (valeur) ». Un terme nu garde son mot
          // (« rang (5) », « INT (4) ») ; une formule conserve son écriture, suivie de
          // son total (« AGI + 2 (4) ») — la prose reste lisible là où `[=…]` n'afficherait
          // qu'un nombre nu (« votre 4 »).
          const word = resolved.parts
            .map((p, idx) => {
              const connector = idx > 0 ? ` ${p.sign === -1 ? '−' : '+'} ` : p.sign === -1 ? '−' : '';
              return connector + p.symbol;
            })
            .join('');
          const value = resolved.total ?? 0;
          const part = resolved.parts[0];
          const title =
            resolved.parts.length === 1
              ? part.kind === 'rank'
                ? `Rang atteint dans la voie = ${value}`
                : part.kind === 'level'
                  ? `Niveau = ${value}`
                  : `${part.label} = ${value}`
              : `${word} = ${value}`;
          return <TermWord key={i} word={word} value={value} title={title} />;
        }
        if (seg.kind === 'quantity') return <QuantityValue key={i} resolved={resolved} />;
        return resolved.hasDie ? (
          <FormulaWithDie key={i} resolved={resolved} level={level} />
        ) : (
          <FormulaTotal key={i} resolved={resolved} />
        );
      })}
    </>
  );
}

/**
 * Enveloppe une NOTE : légèrement plus petite et plus grise que le corps, pour
 * la distinguer sans rompre le fil de lecture. Le balisage interne (puces de
 * glossaire, dés…) reste rendu — il hérite simplement de la taille réduite.
 */
function NoteSpan({ children }: { children: ReactNode }) {
  return (
    <Box
      component="div"
      sx={{
        // BLOC (pas span) : indispensable pour que `lineHeight` s'applique — un
        // span inline hérite du strut du conteneur (1.9) et ignore son line-height.
        mt: 0.75,
        fontSize: '0.85em',
        lineHeight: 1.45,
        color: (theme) => alpha(theme.palette.text.secondary, 0.78),
      }}
    >
      {children}
    </Box>
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
  /**
   * Bonus plat cross-voie injecté au terme `paliers` des formules (ex. Marteau de la
   * foi : +1 DM par AUTRE voie de prêtre au rang 4). Calculé par le composant hôte
   * (`FeaturesByPath`) ; absent → 0 (le terme `paliers` est alors omis de l'encadré).
   */
  milestoneBonus?: number;
  /**
   * Rendu COMPACT (PER-163) : taille de police et interligne réduits d'environ 10 %, pour les blocs
   * d'information encadrés qui citent un sort (sorts reproduits, élixirs préparables, pouvoirs
   * empruntés). Défaut `false` (rendu normal du corps de capacité).
   */
  dense?: boolean;
  /**
   * Substitutions de caractéristique CONTEXTUELLES (PER-163) appliquées aux formules du sort : ex. un
   * forgesort reproduisant ce sort le lance avec son INT (CHA→INT, PER→INT). Signalées par un
   * avertissement à l'affichage. Absent = aucune substitution (usage normal du sort).
   */
  abilitySubstitutions?: AbilitySubstitution[];
}

/**
 * Texte d'une capacité. Si la capacité a un `richText` ET que le contexte du
 * personnage (caractéristiques + niveau) est fourni, on affiche le rendu ENRICHI
 * (dés en icônes, dé évolutif au niveau courant, formules calculées en encadré).
 * Sinon, on retombe proprement sur le `text` verbatim — c'est le comportement
 * par défaut tant qu'une capacité n'a pas été réécrite (PER-64).
 */
export function FeatureText({
  feature,
  abilities,
  level,
  pathRank,
  milestoneBonus,
  dense,
  abilitySubstitutions,
}: FeatureTextProps) {
  // Bascule « Texte d'origine » (PER-88) : quand elle est active (Provider dans l'en-tête
  // de la section), on rend le verbatim TOTALEMENT BRUT — le `text` extrait du PDF, tel
  // quel, SANS aucun traitement : ni enrichissement (dés, formules), ni puces de glossaire
  // (carac, DEF, jargon), ni séparation des « Note : ». Destiné à la relecture « comme dans
  // le livre » ; les sauts de ligne du source sont conservés (`pre-line`).
  const verbatim = useContext(FeatureVerbatimContext);
  if (verbatim) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        component="div"
        sx={{ whiteSpace: 'pre-line', fontSize: dense ? '0.9rem' : '1rem' }}
      >
        {feature.text}
      </Typography>
    );
  }
  const enriched = feature.richText && abilities && level != null;
  // Les « Note : » sont rendues plus petites/grises (`NoteSpan`), dans les deux
  // modes ; le balisage interne (puces, dés, formules) reste actif.
  const rank = pathRank ?? feature.rank;
  const renderChunk = (value: string) =>
    enriched ? (
      <RichInline
        text={value}
        abilities={abilities!}
        level={level!}
        rank={rank}
        milestoneBonus={milestoneBonus}
        abilitySubstitutions={abilitySubstitutions}
      />
    ) : (
      <RichTextRun value={value} />
    );
  const source = enriched ? feature.richText! : feature.text;

  // Une NOTE est rendue en BLOC (`NoteSpan` = div) : c'est ce qui lui donne son
  // propre interligne. En inline, la hauteur de ligne reste imposée par le « strut »
  // du conteneur (lineHeight 1.9) et un line-height réduit n'a aucun effet visible.
  // Le bloc gérant déjà sa séparation (marge), on retire les sauts de ligne autour
  // de la note (sinon `pre-line` ajouterait une ligne vide superflue).
  const chunks = splitNotes(source);
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      component="div"
      sx={{
        whiteSpace: 'pre-line',
        // Compact (`dense`) : ~−10 % sur la taille et l'interligne pour les blocs encadrés (PER-163).
        fontSize: dense ? '0.9rem' : '1rem',
        ...(enriched && { lineHeight: dense ? 1.71 : 1.9 }),
      }}
    >
      {chunks.map((chunk, i) => {
        if (chunk.kind === 'note') return <NoteSpan key={i}>{renderChunk(chunk.value)}</NoteSpan>;
        let value = chunk.value;
        if (chunks[i + 1]?.kind === 'note') value = value.replace(/\n+$/, '');
        if (chunks[i - 1]?.kind === 'note') value = value.replace(/^\n+/, '');
        return <Fragment key={i}>{renderChunk(value)}</Fragment>;
      })}
    </Typography>
  );
}

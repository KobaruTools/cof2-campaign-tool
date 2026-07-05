'use client';

import { Fragment, useState } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { darken, lighten } from '@mui/material/styles';
import type { Purse } from '@/lib/character/types';
import { COPPER_PER_SILVER, GOLD_PER_PLATINUM, SILVER_PER_GOLD } from '@/lib/character/purse';
import { AppTooltip } from '@/components/AppTooltip';
import { PurseIcon } from '@/components/PurseIcon';
import { SourceRef } from '@/components/SourceRef';

/** Unité de monnaie affichée dans la bourse (clé du modèle + présentation). */
interface CoinMeta {
  key: keyof Purse;
  /** Code du livre (français, cf. exception CLAUDE.md : codes neutres conservés). */
  code: 'pp' | 'po' | 'pa' | 'pc';
  /** Nom complet de l'unité (info-bulle). */
  name: string;
  /** Couleur du jeton. */
  color: string;
  /** Couleur de la barre de brillance au survol (défaut : blanc vif). */
  shine?: string;
  /** `true` : jeton « précieux » qui scintille (étincelles au survol). */
  sparkle?: boolean;
  /** Verbatim de règle (p. 181) affiché en info-bulle. */
  rule: string;
}

/** Composantes RGB (0–255) d'une couleur hex `#rrggbb`. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/**
 * Couleur interpolée entre le blanc (`t = 0`) et `hex` (`t = 1`), renvoyée en `rgb()`.
 * Sert à teinter chaque étincelle au hasard entre blanc et la couleur de la pièce.
 */
function mixWhiteToColor(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const m = (c: number) => Math.round(255 * (1 - t) + c * t);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

/**
 * Positions/tailles fixes des étincelles autour d'un jeton précieux (px relatifs au
 * jeton 24×24), chacune avec un léger décalage d'animation pour un scintillement
 * échelonné. La teinte et l'opacité, elles, sont tirées au hasard par jeton (cf. `CoinToken`).
 */
const SPARKLES = [
  { top: -5, left: 19, size: 9, delay: '0s' },
  { top: 6, left: 23, size: 5, delay: '0.18s' },
  { top: 19, left: -4, size: 7, delay: '0.08s' },
  { top: -3, left: -3, size: 5, delay: '0.25s' },
  { top: 20, left: 17, size: 4, delay: '0.32s' },
] as const;

const COINS: CoinMeta[] = [
  {
    key: 'platinum',
    code: 'pp',
    name: 'Pièce de platine',
    // Teal profond très saturé : tranche volontairement sur les tons chauds
    // (or/argent/cuivre) pour signaler l'unité la plus précieuse d'un coup d'œil.
    color: '#0d8a7a',
    // Métal froid et éclatant : reflet légèrement bleuté plutôt que blanc pur.
    shine: 'rgba(190, 255, 246, 0.9)',
    sparkle: true,
    rule:
      'La pièce de platine (pp) est la monnaie la plus précieuse, rare et recherchée. ' +
      '1 pp = 10 po = 100 pa = 1000 pc.',
  },
  {
    key: 'gold',
    code: 'po',
    name: 'Pièce d’or',
    color: '#d4af37',
    sparkle: true,
    rule:
      'Les pièces d’or (po) sont rares et précieuses, la plupart des paysans en ' +
      'utilisent rarement. 1 po = 10 pa = 100 pc.',
  },
  {
    key: 'silver',
    code: 'pa',
    name: 'Pièce d’argent',
    color: '#b7bcc4',
    rule:
      'Tous les prix sont exprimés en pièces d’argent (pa) et pièces de cuivre (pc). ' +
      'Unité de référence des prix d’équipement. 1 pa = 10 pc.',
  },
  {
    key: 'copper',
    code: 'pc',
    name: 'Pièce de cuivre',
    color: '#c07a4b',
    // Cuivre = métal humble : brillance plus terne et grisée que l'or/argent.
    shine: 'rgba(205, 205, 210, 0.4)',
    rule:
      'Un aventurier n’a pas vraiment besoin de comptabiliser les pièces de cuivre… ' +
      'Commencez à compter votre argent pour les choses qui valent au moins 1 pa. ' +
      'Unité de base : 10 pc = 1 pa.',
  },
];

/** Étincelle d'un jeton précieux : position/taille fixes + teinte & opacité tirées au hasard. */
interface SparkleParam {
  top: number;
  left: number;
  size: number;
  delay: string;
  /** Teinte tirée entre blanc et la couleur de la pièce. */
  color: string;
  /** Opacité de pic (0.75–1), d'autant plus faible que la teinte est proche du blanc. */
  peak: number;
}

/**
 * Tire au hasard les paramètres d'étincelles d'un jeton précieux : chaque étincelle prend
 * une teinte entre blanc (`t = 0`) et la couleur de la pièce (`t = 1`), et une opacité de pic
 * qui en découle (proche du blanc → plus transparente, de 75 % à 100 %). Appelé à chaque
 * survol du champ (voir `CoinInput`) → le scintillement varie d'une fois sur l'autre.
 */
function rollSparkles(coin: CoinMeta): SparkleParam[] {
  if (!coin.sparkle) return [];
  return SPARKLES.map((s) => {
    const t = Math.random();
    return { ...s, color: mixWhiteToColor(coin.color, t), peak: 0.75 + 0.25 * t };
  });
}

/** Jeton de monnaie coloré (pastille avec le code), info-bulle = verbatim + source. */
function CoinToken({ coin, sparkles }: { coin: CoinMeta; sparkles: SparkleParam[] }) {
  const tooltip = (
    <Box sx={{ maxWidth: 280 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {coin.name} ({coin.code})
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic', mb: 0.5 }}>
        « {coin.rule} »
      </Typography>
      <SourceRef page={181} />
    </Box>
  );
  const shine = coin.shine ?? 'rgba(255,255,255,0.85)';
  return (
    <AppTooltip title={tooltip}>
      {/* Wrapper `overflow: visible` : porte les étincelles qui débordent hors du jeton
          (le jeton lui-même reste `overflow: hidden` pour clipper le code et la brillance). */}
      <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
        <Box
          className="coin-shine"
          sx={{
            position: 'relative',
            // Le contour (bord) recouvre le texte : `overflow: hidden` clippe le code
            // au cercle INTERNE, il ne déborde donc jamais du rond.
            overflow: 'hidden',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: '50%',
            cursor: 'help',
            flexShrink: 0,
            // Code de la pièce (PO/PA/PC) : très gras, grand (débord clippé par le cercle),
            // noir semi-transparent + ombre portée noire → effet « relief ».
            fontSize: '1rem',
            fontWeight: 700,
            // Roboto n'est chargé qu'en 300–700 : `900` retombe sur 700. Pour un rendu
            // vraiment massif (« Black »), on épaissit les glyphes au contour de texte.
            WebkitTextStroke: '0.9px rgba(0, 0, 0, 0.2)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            // Texte plus transparent, mais son ombre portée reste marquée (relief).
            color: 'rgba(0, 0, 0, 0.2)',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
            // Contour de la même teinte, plus foncé (2px), et fond en dégradé vers plus clair.
            border: `2px solid ${darken(coin.color, 0.3)}`,
            background: `linear-gradient(135deg, ${coin.color} 0%, ${lighten(coin.color, 0.28)} 100%)`,
            // Double barre de brillance — au repos hors champ, à gauche. La large (`::before`)
            // précède la fine (`::after`) avec un écart constant : ensemble elles forment un
            // reflet double (« glint ») au balayage. Teinte selon la pièce (`shine`). Le
            // balayage est déclenché par le survol de TOUT le champ (voir `CoinInput`).
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-150%',
              width: '62%',
              height: '100%',
              background: `linear-gradient(120deg, transparent 0%, ${shine} 50%, transparent 100%)`,
              transform: 'skewX(-20deg)',
              // Pas de transition au repos : le retour de la barre est instantané (invisible,
              // hors-champ). La transition n'existe qu'au survol → brillance à l'aller seulement.
            },
            // Seconde barre, plus fine, décalée derrière la première (même course de 300 %
            // → elles balaient en parallèle, séparées par un fin liseré sombre).
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-190%',
              width: '20%',
              height: '100%',
              background: `linear-gradient(120deg, transparent 0%, ${shine} 50%, transparent 100%)`,
              transform: 'skewX(-20deg)',
            },
          }}
        >
          {coin.code}
        </Box>

        {/* Jetons précieux (or, platine) : étincelles scintillantes au survol (voir `CoinInput`).
            Teinte et opacité de pic tirées au hasard par étincelle (cf. `sparkles`). */}
        {sparkles.map((s, i) => (
          <Box
            key={i}
            className="coin-sparkle"
            sx={{
              position: 'absolute',
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              pointerEvents: 'none',
              opacity: 0,
              zIndex: 2,
              animationDelay: s.delay,
              // Opacité de pic propre à l'étincelle, lue par le keyframe via `var()`.
              '--sparkle-peak': s.peak,
              background: `radial-gradient(circle, ${lighten(s.color, 0.5)} 0%, ${s.color} 55%, transparent 74%)`,
              filter: `drop-shadow(0 0 1px ${s.color})`,
              // Étoile à 4 branches.
              clipPath:
                'polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)',
            }}
          />
        ))}
      </Box>
    </AppTooltip>
  );
}

/** Parse une saisie libre en entier ≥ 0 (virgule décimale tolérée, vide → 0). */
function parseCoin(raw: string): number {
  return Math.max(0, Math.floor(Number(raw.replace(',', '.')) || 0));
}

/**
 * Champ éditable d'une unité de monnaie : jeton coloré (adornment) + nombre entier
 * ≥ 0. Tamponne l'affichage en local (frappe libre : effacer, retaper, sans reclamp
 * à chaque caractère) MAIS valide la bourse en direct à chaque frappe. Ce commit
 * immédiat est nécessaire pour que les flèches de conversion — qui lisent la bourse
 * commitée — s'activent/se désactivent dès qu'on franchit un cap de 10 en tapant
 * (sinon elles restaient figées jusqu'à la perte du focus). Le blur normalise
 * seulement l'affichage (« 03 » → « 3 », vide → « 0 »).
 */
function CoinInput({
  coin,
  value,
  onCommit,
}: {
  coin: CoinMeta;
  value: number;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  // Resynchronise le tampon quand la valeur externe change (repos, regroupement,
  // édition d'une autre unité), SANS effet : ajustement d'état pendant le rendu,
  // pattern recommandé par React (évite `set-state-in-effect`). On NE resynchronise
  // pas pendant l'édition, pour ne pas écraser une frappe en cours (champ vidé, etc.).
  const [lastValue, setLastValue] = useState(value);
  if (!focused && value !== lastValue) {
    setLastValue(value);
    setText(String(value));
  }

  // Étincelles du jeton précieux (or, platine) : (re)tirées au hasard à chaque entrée
  // de la souris dans le champ — c'est aussi le survol qui déclenche l'animation CSS
  // (`&:hover .coin-sparkle`). Tirage dans un gestionnaire d'événement → `Math.random`
  // hors rendu (pur). Non précieux → tableau vide (aucune étincelle).
  const [sparkles, setSparkles] = useState<SparkleParam[]>([]);

  return (
    <TextField
      size="small"
      type="number"
      onMouseEnter={() => setSparkles(rollSparkles(coin))}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const parsed = parseCoin(raw);
        if (parsed !== value) onCommit(parsed);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setText(String(parseCoin(text)));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      aria-label={`${coin.name} (${coin.code})`}
      // Survoler n'importe où dans le champ fait « briller » la pièce (balaie la barre)
      // et, pour l'or, déclenche le scintillement échelonné des étincelles.
      sx={{
        // Les deux barres balaient ensemble (même course/durée), en gardant leur écart.
        '&:hover .coin-shine::before': { left: '150%', transition: 'left 0.55s ease' },
        '&:hover .coin-shine::after': { left: '110%', transition: 'left 0.55s ease' },
        '@keyframes coinSparkleTwinkle': {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: 0 },
          // Pic d'opacité propre à chaque étincelle (`--sparkle-peak`, défaut 0.95).
          '35%': { opacity: 'var(--sparkle-peak, 0.95)' },
          '55%': { transform: 'scale(1) rotate(120deg)', opacity: 'var(--sparkle-peak, 0.95)' },
          '100%': { transform: 'scale(0) rotate(180deg)', opacity: 0 },
        },
        '&:hover .coin-sparkle': {
          animationName: 'coinSparkleTwinkle',
          animationDuration: '2s',
          animationTimingFunction: 'ease-in-out',
          // Un seul scintillement par survol (pas de boucle infinie).
          animationIterationCount: 1,
        },
      }}
      slotProps={{
        htmlInput: { min: 0, step: 1, style: { width: 52 } },
        input: {
          startAdornment: (
            <InputAdornment position="start" sx={{ mr: 0.75 }}>
              <CoinToken coin={coin} sparkles={sparkles} />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

/**
 * Contrôle de conversion entre deux unités adjacentes (`higher` = plus forte, à gauche ;
 * `lower` = plus faible, à droite ; `ratio` pièces faibles pour une forte). Deux flèches :
 *  ← regroupe (`ratio` faibles → 1 forte), → fait de la monnaie (1 forte → `ratio` faibles).
 * La valeur totale de la bourse est inchangée (simple change). Chaque flèche est désactivée
 * s'il n'y a pas de quoi convertir.
 */
function CoinConvert({
  purse,
  onChange,
  higher,
  lower,
  higherCode,
  lowerCode,
  ratio,
}: {
  purse: Purse;
  onChange: (purse: Purse) => void;
  higher: keyof Purse;
  lower: keyof Purse;
  higherCode: string;
  lowerCode: string;
  ratio: number;
}) {
  const canGroup = purse[lower] >= ratio;
  const canBreak = purse[higher] >= 1;
  const group = () => onChange({ ...purse, [lower]: purse[lower] - ratio, [higher]: purse[higher] + 1 });
  const breakDown = () => onChange({ ...purse, [higher]: purse[higher] - 1, [lower]: purse[lower] + ratio });
  return (
    <Stack direction="row" sx={{ alignItems: 'center' }}>
      <AppTooltip title={`Regrouper : ${ratio} ${lowerCode} → 1 ${higherCode}`}>
        <span>
          <IconButton
            size="small"
            disabled={!canGroup}
            onClick={group}
            aria-label={`Regrouper ${ratio} ${lowerCode} en 1 ${higherCode}`}
            sx={{ p: 0.25 }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </span>
      </AppTooltip>
      <AppTooltip title={`Faire de la monnaie : 1 ${higherCode} → ${ratio} ${lowerCode}`}>
        <span>
          <IconButton
            size="small"
            disabled={!canBreak}
            onClick={breakDown}
            aria-label={`Convertir 1 ${higherCode} en ${ratio} ${lowerCode}`}
            sx={{ p: 0.25 }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </span>
      </AppTooltip>
    </Stack>
  );
}

/** Taux de conversion entre unités adjacentes (p. 181), dans l'ordre d'affichage des `COINS`. */
const CONVERSION_RATIO: Record<string, number> = {
  platinum: GOLD_PER_PLATINUM, // 1 pp ↔ 10 po
  gold: SILVER_PER_GOLD, // 1 po ↔ 10 pa
  silver: COPPER_PER_SILVER, // 1 pa ↔ 10 pc
};

export interface PurseFieldProps {
  /** Bourse courante du personnage. */
  purse: Purse;
  /** Applique une nouvelle bourse (état de jeu transitoire). */
  onChange: (purse: Purse) => void;
  /**
   * Mode édition du bloc « Inventaire » : n'affiche les flèches de conversion entre unités
   * que dans ce mode (les montants restent éditables en permanence — état de jeu transitoire).
   */
  editing?: boolean;
}

/**
 * Bloc « Bourse » (PER-152) — argent possédé par unité (platine / or / argent / cuivre,
 * p. 181). État de jeu transitoire (montants éditables hors mode « Modifier », non affecté
 * par un repos). En mode édition, des flèches gauche/droite entre unités permettent de
 * regrouper / faire de la monnaie (pp ↔ po ↔ pa ↔ pc) sans changer la valeur totale.
 */
export function PurseField({ purse, onChange, editing = false }: PurseFieldProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
      <AppTooltip title="Bourse — argent possédé" page={181}>
        <Box sx={{ display: 'inline-flex', color: 'text.secondary', flexShrink: 0, cursor: 'help' }}>
          <PurseIcon size={20} title="Bourse" />
        </Box>
      </AppTooltip>

      {COINS.map((coin, i) => {
        const next = COINS[i + 1];
        return (
          <Fragment key={coin.key}>
            <CoinInput
              coin={coin}
              value={purse[coin.key]}
              onCommit={(v) => onChange({ ...purse, [coin.key]: v })}
            />
            {editing && next && (
              <CoinConvert
                purse={purse}
                onChange={onChange}
                higher={coin.key}
                lower={next.key}
                higherCode={coin.code}
                lowerCode={next.code}
                ratio={CONVERSION_RATIO[coin.key]}
              />
            )}
          </Fragment>
        );
      })}
    </Stack>
  );
}

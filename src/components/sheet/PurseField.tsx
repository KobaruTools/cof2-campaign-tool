'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, darken, lighten } from '@mui/material/styles';
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
  /**
   * Brillance au survol (défaut : blanc vif). Une couleur unique → barre monochrome ;
   * un couple `{ from, to }` → barre en dégradé (ex. or jaune→orangé, platine teal clair).
   */
  shine?: string | ShineGradient;
  /** `true` : la barre de brillance balaie DEUX fois (réservé à la pièce la plus précieuse). */
  shineDouble?: boolean;
  /**
   * `true` : ajoute une 3e barre large et semi-transparente qui balaie lentement DERRIÈRE la
   * double barre (couvre toute sa durée). Fondu de sortie si la souris quitte avant la fin.
   */
  shineThick?: boolean;
  /** Profil de scintillement des jetons « précieux » (étincelles au survol) ; absent = aucun. */
  sparkle?: SparkleProfile;
  /** Verbatim de règle (p. 181) affiché en info-bulle. */
  rule: string;
}

/** Brillance en dégradé : deux teintes balayées le long de la barre (bord → bord). */
interface ShineGradient {
  from: string;
  to: string;
}

/** Construit le fond de la barre de brillance : monochrome (couleur unique) ou dégradé. */
function shineBackground(shine: CoinMeta['shine']): string {
  if (shine && typeof shine === 'object') {
    return `linear-gradient(120deg, transparent 0%, ${shine.from} 38%, ${shine.to} 62%, transparent 100%)`;
  }
  const color = shine ?? 'rgba(255,255,255,0.85)';
  return `linear-gradient(120deg, transparent 0%, ${color} 50%, transparent 100%)`;
}

/** Position/taille d'une étincelle (px relatifs au jeton 24×24) + son décalage d'animation. */
interface SparklePos {
  top: number;
  left: number;
  size: number;
  delay: string;
}

/** Profil de scintillement d'un jeton précieux : jeu d'étincelles + durée de l'animation. */
interface SparkleProfile {
  positions: readonly SparklePos[];
  /** Durée du scintillement d'une étincelle. */
  duration: string;
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

/** Or : scintillement discret — 5 étincelles proches du jeton, animation courte. */
const SPARKLES_GOLD: readonly SparklePos[] = [
  { top: -5, left: 19, size: 9, delay: '0s' },
  { top: 6, left: 23, size: 5, delay: '0.18s' },
  { top: 19, left: -4, size: 7, delay: '0.08s' },
  { top: -3, left: -3, size: 5, delay: '0.25s' },
  { top: 20, left: 17, size: 4, delay: '0.32s' },
];

/**
 * Platine : scintillement plus prononcé (unité la plus précieuse) — davantage
 * d'étincelles, plus écartées du jeton et plus grosses ; animation plus longue.
 */
const SPARKLES_PLATINUM: readonly SparklePos[] = [
  { top: -11, left: 10, size: 11, delay: '0s' },
  { top: -8, left: 26, size: 7, delay: '0.16s' },
  { top: 6, left: 31, size: 9, delay: '0.32s' },
  { top: 22, left: 29, size: 6, delay: '0.1s' },
  { top: 29, left: 15, size: 10, delay: '0.24s' },
  { top: 28, left: -4, size: 7, delay: '0.38s' },
  { top: 12, left: -11, size: 9, delay: '0.06s' },
  { top: -4, left: -8, size: 6, delay: '0.3s' },
  { top: 16, left: 9, size: 5, delay: '0.44s' },
];

const COINS: CoinMeta[] = [
  {
    key: 'platinum',
    code: 'pp',
    name: 'Pièce de platine',
    // Teal profond très saturé : tranche volontairement sur les tons chauds
    // (or/argent/cuivre) pour signaler l'unité la plus précieuse d'un coup d'œil.
    color: '#0d8a7a',
    // Reflet en dégradé vert/bleu → vert/bleu plus clair (métal froid et éclatant),
    // et SEULE pièce à double passage de la barre (statut le plus précieux).
    shine: { from: 'rgba(28, 190, 178, 0.85)', to: 'rgba(196, 255, 248, 0.96)' },
    shineDouble: true,
    shineThick: true,
    sparkle: { positions: SPARKLES_PLATINUM, duration: '3.2s' },
    rule:
      'La pièce de platine (pp) est la monnaie la plus précieuse, rare et recherchée. ' +
      '1 pp = 10 po = 100 pa = 1000 pc.',
  },
  {
    key: 'gold',
    code: 'po',
    name: 'Pièce d’or',
    color: '#d4af37',
    // Reflet en dégradé jaune → jaune-orangé (au lieu de la barre blanche), passage unique.
    shine: { from: 'rgba(255, 228, 130, 0.92)', to: 'rgba(255, 160, 66, 0.85)' },
    sparkle: { positions: SPARKLES_GOLD, duration: '2s' },
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
  return coin.sparkle.positions.map((s) => {
    const t = Math.random();
    return { ...s, color: mixWhiteToColor(coin.color, t), peak: 0.75 + 0.25 * t };
  });
}

/**
 * 3e barre de brillance : large, floue et semi-transparente, elle balaie lentement (1,5 s,
 * soit toute la durée de la double barre) DERRIÈRE celle-ci. Pilotée à la main (Web Animations
 * API) pour offrir un fondu de SORTIE : si la souris quitte avant la fin du balayage, la barre
 * se fige à sa position courante et s'estompe doucement, au lieu de disparaître d'un coup.
 */
function ThickShineBar({ coin, hover }: { coin: CoinMeta; hover: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== 'function') return;
    if (hover) {
      // (Re)lance le balayage large et lent, avec fondu d'entrée/sortie intégré au keyframe.
      el.getAnimations().forEach((a) => a.cancel());
      el.style.left = '';
      el.style.opacity = '';
      el.animate(
        [
          { left: '-190%', opacity: 0 },
          { left: '-120%', opacity: 0.5, offset: 0.12 },
          { left: '120%', opacity: 0.5, offset: 0.85 },
          { left: '190%', opacity: 0 },
        ],
        { duration: 1500, easing: 'ease-out', fill: 'forwards' },
      );
    } else {
      const running = el.getAnimations().some((a) => a.playState === 'running');
      if (running) {
        // Sortie en cours de balayage : on fige la position courante puis on estompe.
        const left = getComputedStyle(el).left;
        el.getAnimations().forEach((a) => a.cancel());
        el.style.left = left;
        el.animate([{ opacity: 0.5 }, { opacity: 0 }], { duration: 400, easing: 'ease-out', fill: 'forwards' });
      } else {
        el.getAnimations().forEach((a) => a.cancel());
        el.style.opacity = '0';
      }
    }
  }, [hover]);

  return (
    <Box
      ref={ref}
      sx={{
        position: 'absolute',
        top: 0,
        left: '-190%',
        width: '165%',
        height: '100%',
        opacity: 0,
        zIndex: 1,
        pointerEvents: 'none',
        transform: 'skewX(-20deg)',
        filter: 'blur(2.5px)',
        background: shineBackground(coin.shine),
      }}
    />
  );
}

/** Jeton de monnaie coloré (pastille avec le code), info-bulle = verbatim + source. */
function CoinToken({ coin, sparkles, hover }: { coin: CoinMeta; sparkles: SparkleParam[]; hover: boolean }) {
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
  return (
    <AppTooltip title={tooltip}>
      {/* Wrapper `overflow: visible` : porte les étincelles qui débordent hors du jeton
          (le jeton lui-même reste `overflow: hidden` pour clipper le code et la brillance).
          `--sparkle-dur` : durée du scintillement propre à la pièce (héritée par les étincelles).
          `--shine-passes` : nombre de balayages de la barre (2 pour la platine, 1 sinon). */}
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          flexShrink: 0,
          '--shine-passes': coin.shineDouble ? 2 : 1,
          ...(coin.sparkle ? { '--sparkle-dur': coin.sparkle.duration } : {}),
        }}
      >
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
            // Barre de brillance unique — au repos hors champ, à gauche. Fond selon la pièce
            // (`shine` : couleur unie ou dégradé). Au survol elle balaie le jeton, une fois ou
            // deux selon `--shine-passes` (2 pour la platine). Déclenché par le survol de TOUT
            // le champ (voir `CoinInput`).
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-150%',
              width: '70%',
              height: '100%',
              // Au-dessus de la 3e barre large (`ThickShineBar`, zIndex 1) → double barre nette devant.
              zIndex: 2,
              background: shineBackground(coin.shine),
              transform: 'skewX(-20deg)',
            },
          }}
        >
          {/* 3e barre large et lente, DERRIÈRE la double barre (jetons `shineThick`, ex. platine). */}
          {coin.shineThick && <ThickShineBar coin={coin} hover={hover} />}
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
  // Survol du champ : pilote la 3e barre large (fondu de sortie géré par `ThickShineBar`).
  const [hover, setHover] = useState(false);

  // Incrément/décrément via les boutons −/+ (remplacent les flèches natives). Bornes ≥ 0.
  const step = (delta: number) => {
    const next = Math.max(0, value + delta);
    if (next !== value) onCommit(next);
    setText(String(next));
  };

  // Boutons −/+ : proches du blanc mais légèrement teintés vers la couleur de la pièce ;
  // fond du champ noir courant très légèrement teinté de la même couleur (pour mieux les repérer).
  const btnColor = mixWhiteToColor(coin.color, 0.22);
  const btnHoverColor = mixWhiteToColor(coin.color, 0.5);

  return (
    <TextField
      size="small"
      type="number"
      onMouseEnter={() => {
        setHover(true);
        setSparkles(rollSparkles(coin));
      }}
      onMouseLeave={() => setHover(false)}
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
      // et, pour les jetons précieux, déclenche le scintillement des étincelles.
      sx={{
        // Étincelles clippées à l'input : `overflow: hidden` sur la racine les contient
        // dans le champ (elles ne débordent plus dans la rangée). On réaligne le contour
        // (`top: 0`, sinon son décalage de −5px pour l'encoche du label serait rogné, sans
        // label ici) pour garder la bordure intacte.
        // Fond du champ (noir courant) très légèrement teinté vers la couleur de la pièce,
        // pour mieux détacher les boutons −/+.
        // `pr: 0` : le stepper touche le bord droit. Les enfants restent centrés (le stepper, lui,
        // se met en `alignSelf: stretch` pour occuper 100 % de la hauteur).
        '& .MuiOutlinedInput-root': { overflow: 'hidden', pr: 0, backgroundColor: alpha(coin.color, 0.09) },
        // Contour au survol = couleur de la pièce, avec fondu ; le délai (.4s) porté par l'état
        // de BASE ne joue qu'à la SORTIE (imite le hover des voies & capacités en vue colonne),
        // l'entrée (`:hover`, sans délai) prend le relais → fondu immédiat. Sélecteur volontairement
        // très spécifique (`:not(.Mui-focused)`) pour battre la règle de survol par défaut de MUI
        // (qui, à spécificité égale, imposait sinon le blanc `text.primary` — d'où la mauvaise teinte).
        '& .MuiOutlinedInput-notchedOutline': { top: 0, transition: 'border-color .3s ease .4s' },
        '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
        '& .MuiOutlinedInput-root:hover:not(.Mui-focused) .MuiOutlinedInput-notchedOutline': {
          borderColor: coin.color,
          transition: 'border-color .3s ease',
        },
        // Masque les flèches haut/bas natives du champ number (remplacées par les boutons −/+).
        '& input[type=number]': { MozAppearance: 'textfield' },
        '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
          WebkitAppearance: 'none',
          margin: 0,
        },
        // Balayage de la barre : le keyframe fait un passage (0→65 %) puis maintient la barre
        // hors-champ à droite (65→100 %) — ce maintien ne sert que de pause AVANT un éventuel
        // 2e passage. Le nombre de passages est piloté par `--shine-passes` (2 pour la platine,
        // 1 pour les autres → passage unique simple).
        '@keyframes coinShineSweep': {
          '0%': { left: '-150%' },
          '65%': { left: '150%' },
          '100%': { left: '150%' },
        },
        '&:hover .coin-shine::before': {
          animationName: 'coinShineSweep',
          animationDuration: '0.75s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'var(--shine-passes, 1)',
        },
        '@keyframes coinSparkleTwinkle': {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: 0 },
          // Pic d'opacité propre à chaque étincelle (`--sparkle-peak`, défaut 0.95).
          '35%': { opacity: 'var(--sparkle-peak, 0.95)' },
          '55%': { transform: 'scale(1) rotate(120deg)', opacity: 'var(--sparkle-peak, 0.95)' },
          '100%': { transform: 'scale(0) rotate(180deg)', opacity: 0 },
        },
        '&:hover .coin-sparkle': {
          animationName: 'coinSparkleTwinkle',
          // Durée propre à la pièce (`--sparkle-dur` posé sur le wrapper) : platine plus long.
          animationDuration: 'var(--sparkle-dur, 2s)',
          animationTimingFunction: 'ease-in-out',
          // Un seul scintillement par survol (pas de boucle infinie).
          animationIterationCount: 1,
        },
      }}
      slotProps={{
        htmlInput: { min: 0, step: 1, style: { width: 40, textAlign: 'center' } },
        input: {
          startAdornment: (
            <InputAdornment position="start" sx={{ mr: 0.75 }}>
              <CoinToken coin={coin} sparkles={sparkles} hover={hover} />
            </InputAdornment>
          ),
          // Stepper −/+ HORIZONTAL (boutons plus gros), remplaçant les flèches natives (masquées
          // ci-dessus). Séparé du nombre par un liseré ; couleur proche du blanc, teintée vers la
          // pièce. `−` à gauche, `+` à droite.
          endAdornment: (
            // `alignSelf: stretch` + `maxHeight: none` : l'adornment occupe 100 % de la hauteur
            // du champ, donc le stepper et son liseré aussi (m:0 → collé au bord droit).
            <InputAdornment position="end" sx={{ m: 0, alignSelf: 'stretch', maxHeight: 'none', height: 'auto' }}>
              <Stack direction="row" sx={{ borderLeft: '1px solid', borderColor: 'divider', alignSelf: 'stretch' }}>
                {/* Largeur des deux boutons strictement identique : le séparateur est un élément
                    à part (1px), et non une bordure DANS le bouton `+` — sinon (border-box) son
                    aire serait rognée de 1px et les deux boutons n'auraient pas la même largeur. */}
                <IconButton
                  aria-label={`Retirer 1 ${coin.code}`}
                  onClick={() => step(-1)}
                  disabled={value <= 0}
                  sx={{
                    borderRadius: 0,
                    p: 0,
                    width: 28,
                    flexShrink: 0,
                    color: btnColor,
                    '&:hover': { bgcolor: alpha(coin.color, 0.2), color: btnHoverColor },
                  }}
                >
                  <RemoveIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'divider', flexShrink: 0 }} />
                <IconButton
                  aria-label={`Ajouter 1 ${coin.code}`}
                  onClick={() => step(1)}
                  sx={{
                    borderRadius: 0,
                    p: 0,
                    width: 28,
                    flexShrink: 0,
                    color: btnColor,
                    '&:hover': { bgcolor: alpha(coin.color, 0.2), color: btnHoverColor },
                  }}
                >
                  <AddIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Stack>
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
  breakpoint,
}: {
  purse: Purse;
  onChange: (purse: Purse) => void;
  higher: keyof Purse;
  lower: keyof Purse;
  higherCode: string;
  lowerCode: string;
  ratio: number;
  /** Seuil (px) sous lequel la rangée passe en colonne : les flèches deviennent alors haut/bas. */
  breakpoint: number;
}) {
  const canGroup = purse[lower] >= ratio;
  const canBreak = purse[higher] >= 1;
  const group = () => onChange({ ...purse, [lower]: purse[lower] - ratio, [higher]: purse[higher] + 1 });
  const breakDown = () => onChange({ ...purse, [higher]: purse[higher] - 1, [lower]: purse[lower] + ratio });
  // En layout vertical (container étroit), la paire passe en colonne et les chevrons pivotent :
  // « regrouper » (vers l'unité forte, placée AU-DESSUS) devient ↑, « faire la monnaie » ↓.
  const vertQuery = `@container (max-width: ${breakpoint}px)`;
  const rotate = { [vertQuery]: { transform: 'rotate(90deg)' } };
  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', flexShrink: 0, [vertQuery]: { flexDirection: 'column', alignSelf: 'center' } }}
    >
      <AppTooltip title={`Regrouper : ${ratio} ${lowerCode} → 1 ${higherCode}`}>
        <span>
          <IconButton
            size="small"
            disabled={!canGroup}
            onClick={group}
            aria-label={`Regrouper ${ratio} ${lowerCode} en 1 ${higherCode}`}
            sx={{ p: 0.25 }}
          >
            <ChevronLeftIcon fontSize="small" sx={rotate} />
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
            <ChevronRightIcon fontSize="small" sx={rotate} />
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
 * par un repos). En mode édition, des flèches entre unités permettent de regrouper / faire de
 * la monnaie (pp ↔ po ↔ pa ↔ pc) sans changer la valeur totale.
 *
 * Mise en page adaptative par **container query** (pas de retour à la ligne) : dès que le
 * conteneur devient trop étroit pour tenir la rangée sur une ligne, on bascule d'un coup en
 * colonne (un champ par ligne). Les flèches de conversion passent alors de gauche/droite à
 * haut/bas et se placent entre les blocs empilés. Le seuil dépend du mode (les flèches, présentes
 * en édition, élargissent la rangée).
 */
export function PurseField({ purse, onChange, editing = false }: PurseFieldProps) {
  const breakpoint = editing ? 800 : 620;
  const vertQuery = `@container (max-width: ${breakpoint}px)`;
  return (
    <Box sx={{ containerType: 'inline-size' }}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: 1,
          // Bascule instantanée en colonne quand la rangée ne tiendrait plus sur une ligne.
          // En colonne : tout centré (les champs ET les flèches → flèches alignées sur les champs)
          // et un peu plus d'espacement vertical entre les lignes.
          [vertQuery]: { flexDirection: 'column', alignItems: 'center', gap: 1.5 },
        }}
      >
        {/* En-tête de la bourse : icône seule en ligne (desktop) ; icône + titre « Bourse » en colonne (mobile). */}
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', flexShrink: 0 }}>
          <AppTooltip title="Bourse — argent possédé" page={181}>
            <Box sx={{ display: 'inline-flex', cursor: 'help' }}>
              <PurseIcon size={20} title="Bourse" />
            </Box>
          </AppTooltip>
          <Typography
            variant="subtitle2"
            sx={{ display: 'none', fontWeight: 700, [vertQuery]: { display: 'block' } }}
          >
            Bourse
          </Typography>
        </Box>

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
                  breakpoint={breakpoint}
                />
              )}
            </Fragment>
          );
        })}
      </Stack>
    </Box>
  );
}

'use client';

import { Fragment, useState } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { darken, lighten } from '@mui/material/styles';
import type { Purse } from '@/lib/character/types';
import { COPPER_PER_SILVER, SILVER_PER_GOLD } from '@/lib/character/purse';
import { AppTooltip } from '@/components/AppTooltip';

/** Unité de monnaie affichée dans la bourse (clé du modèle + présentation). */
interface CoinMeta {
  key: keyof Purse;
  /** Code du livre (français, cf. exception CLAUDE.md : codes neutres conservés). */
  code: 'po' | 'pa' | 'pc';
  /** Nom complet de l'unité (info-bulle). */
  name: string;
  /** Couleur du jeton. */
  color: string;
  /** Couleur de la barre de brillance au survol (défaut : blanc vif). */
  shine?: string;
  /** Verbatim de règle (p. 181) affiché en info-bulle. */
  rule: string;
}

/**
 * Étincelles décoratives autour de la pièce d'or — soulignent son statut « rare »
 * au survol. Positions/tailles fixes (px relatifs au jeton 24×24), chacune avec un
 * léger décalage d'animation pour un scintillement échelonné.
 */
const GOLD_SPARKLES = [
  { top: -5, left: 19, size: 9, delay: '0s' },
  { top: 6, left: 23, size: 5, delay: '0.18s' },
  { top: 19, left: -4, size: 7, delay: '0.08s' },
  { top: -3, left: -3, size: 5, delay: '0.25s' },
  { top: 20, left: 17, size: 4, delay: '0.32s' },
] as const;

const COINS: CoinMeta[] = [
  {
    key: 'gold',
    code: 'po',
    name: 'Pièce d’or',
    color: '#d4af37',
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

/** Jeton de monnaie coloré (pastille avec le code), info-bulle = verbatim + source. */
function CoinToken({ coin }: { coin: CoinMeta }) {
  const tooltip = (
    <Box sx={{ maxWidth: 280 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {coin.name} ({coin.code})
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic', mb: 0.5 }}>
        « {coin.rule} »
      </Typography>
      <Typography variant="caption" color="text.secondary">
        p. 181
      </Typography>
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
            // Barre de brillance — au repos hors champ, à gauche. Sa teinte dépend de la
            // pièce (`shine`). Le balayage est déclenché par le survol de TOUT le champ
            // (voir `CoinInput`).
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-150%',
              width: '80%',
              height: '100%',
              background: `linear-gradient(120deg, transparent 0%, ${shine} 50%, transparent 100%)`,
              transform: 'skewX(-20deg)',
              // Pas de transition au repos : le retour de la barre est instantané (invisible,
              // hors-champ). La transition n'existe qu'au survol → brillance à l'aller seulement.
            },
          }}
        >
          {coin.code}
        </Box>

        {/* Pièce d'or « rare » : étincelles scintillantes au survol (voir `CoinInput`). */}
        {coin.code === 'po' &&
          GOLD_SPARKLES.map((s, i) => (
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
                background: 'radial-gradient(circle, #fff7d6 0%, #f2c94c 55%, transparent 72%)',
                filter: 'drop-shadow(0 0 1px rgba(242,201,76,0.9))',
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

/**
 * Champ éditable d'une unité de monnaie : jeton coloré (adornment) + nombre entier
 * ≥ 0. Tamponne la saisie en local et la valide au blur / à Entrée pour permettre
 * une frappe libre (effacer, retaper), sans reclamp à chaque caractère.
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
  // Resynchronise le tampon quand la valeur externe change (repos, regroupement,
  // édition d'une autre unité), SANS effet : ajustement d'état pendant le rendu,
  // pattern recommandé par React (évite `set-state-in-effect`).
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(String(value));
  }

  const commit = () => {
    const parsed = Math.max(0, Math.floor(Number(text.replace(',', '.')) || 0));
    setText(String(parsed));
    if (parsed !== value) onCommit(parsed);
  };

  return (
    <TextField
      size="small"
      type="number"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      aria-label={`${coin.name} (${coin.code})`}
      // Survoler n'importe où dans le champ fait « briller » la pièce (balaie la barre)
      // et, pour l'or, déclenche le scintillement échelonné des étincelles.
      sx={{
        '&:hover .coin-shine::before': { left: '150%', transition: 'left 0.55s ease' },
        '@keyframes coinSparkleTwinkle': {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: 0 },
          '35%': { opacity: 1 },
          '55%': { transform: 'scale(1) rotate(120deg)', opacity: 0.95 },
          '100%': { transform: 'scale(0) rotate(180deg)', opacity: 0 },
        },
        '&:hover .coin-sparkle': {
          animationName: 'coinSparkleTwinkle',
          animationDuration: '1s',
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
              <CoinToken coin={coin} />
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
  gold: SILVER_PER_GOLD, // 1 po ↔ 10 pa
  silver: COPPER_PER_SILVER, // 1 pa ↔ 10 pc
};

export interface PurseFieldProps {
  /** Bourse courante du personnage. */
  purse: Purse;
  /** Applique une nouvelle bourse (état de jeu transitoire). */
  onChange: (purse: Purse) => void;
  /**
   * Mode édition du bloc « Équipement » : n'affiche les flèches de conversion entre unités
   * que dans ce mode (les montants restent éditables en permanence — état de jeu transitoire).
   */
  editing?: boolean;
}

/**
 * Bloc « Bourse » (PER-152) — argent possédé par unité (or / argent / cuivre,
 * p. 181). État de jeu transitoire (montants éditables hors mode « Modifier », non affecté
 * par un repos). En mode édition, des flèches gauche/droite entre unités permettent de
 * regrouper / faire de la monnaie (po ↔ pa ↔ pc) sans changer la valeur totale.
 */
export function PurseField({ purse, onChange, editing = false }: PurseFieldProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
      <AppTooltip title="Bourse — argent possédé (p. 181)">
        <AccountBalanceWalletIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
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

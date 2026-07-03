'use client';

import { useState } from 'react';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { darken, lighten } from '@mui/material/styles';
import type { Purse } from '@/lib/character/types';
import { formatPurse, isPurseCanonical, normalizePurse } from '@/lib/character/purse';
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
  /** Verbatim de règle (p. 181) affiché en info-bulle. */
  rule: string;
}

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
  return (
    <AppTooltip title={tooltip}>
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
          // Barre blanche de brillance — au repos hors champ, à gauche. Le balayage est
          // déclenché par le survol de TOUT le champ (voir `CoinInput`).
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-150%',
            width: '80%',
            height: '100%',
            background: 'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)',
            transform: 'skewX(-20deg)',
            transition: 'left 0.55s ease',
          },
        }}
      >
        {coin.code}
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
      // Survoler n'importe où dans le champ fait « briller » la pièce (balaie la barre blanche).
      sx={{ '&:hover .coin-shine::before': { left: '150%' } }}
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

export interface PurseFieldProps {
  /** Bourse courante du personnage. */
  purse: Purse;
  /** Applique une nouvelle bourse (état de jeu transitoire). */
  onChange: (purse: Purse) => void;
}

/**
 * Bloc « Bourse » (PER-152) — argent possédé par unité (or / argent / cuivre,
 * p. 181). État de jeu transitoire (éditable hors mode « Modifier », non affecté
 * par un repos). Trois champs éditables ; un bouton « regrouper » convertit en
 * monnaie courante (10 pc → 1 pa, 10 pa → 1 po) sans changer la valeur totale.
 */
export function PurseField({ purse, onChange }: PurseFieldProps) {
  const canonical = isPurseCanonical(purse);
  const normalized = normalizePurse(purse);

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
      <AppTooltip title="Bourse — argent possédé (p. 181)">
        <AccountBalanceWalletIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
      </AppTooltip>

      {COINS.map((coin) => (
        <CoinInput
          key={coin.key}
          coin={coin}
          value={purse[coin.key]}
          onCommit={(v) => onChange({ ...purse, [coin.key]: v })}
        />
      ))}

      {/* Conversion en monnaie courante — proposée seulement s'il y a à regrouper. */}
      {!canonical && (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            = {formatPurse(normalized)}
          </Typography>
          <AppTooltip title="Regrouper en monnaie courante (10 pc → 1 pa, 10 pa → 1 po). La valeur totale ne change pas.">
            <IconButton size="small" aria-label="Regrouper en monnaie courante" onClick={() => onChange(normalized)}>
              <AutorenewIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
        </Stack>
      )}
    </Stack>
  );
}

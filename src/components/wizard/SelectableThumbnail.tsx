'use client';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

/**
 * Vignette illustrée sélectionnable (grille Peuple/Profil, PER-403/404) : image pleine largeur,
 * libellé en incrustation dégradée, sélection = bordure couleur d'accent + pastille de coche.
 * Input radio natif invisible (pas de `<Radio>` MUI) pour garder la sémantique/clavier d'un vrai
 * groupe de boutons radio tout en habillant toute la vignette en zone cliquable.
 */
export function SelectableThumbnail({
  groupName,
  value,
  name,
  image,
  selected,
  onSelect,
  accentColor,
  aspectRatio = 700 / 450,
}: {
  groupName: string;
  value: string;
  name: string;
  image: string;
  selected: boolean;
  onSelect: () => void;
  accentColor?: string;
  aspectRatio?: number;
}) {
  const theme = useTheme();
  const tint = accentColor ?? theme.palette.primary.main;
  return (
    <Box
      component="label"
      sx={{
        position: 'relative',
        display: 'block',
        cursor: 'pointer',
        borderRadius: 2,
        overflow: 'hidden',
        border: 2,
        borderColor: selected ? tint : 'divider',
        boxShadow: selected ? `0 0 0 3px ${alpha(tint, 0.35)}` : 'none',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
        '&:hover': { borderColor: tint },
      }}
    >
      <Box
        component="input"
        type="radio"
        name={groupName}
        value={value}
        checked={selected}
        onChange={onSelect}
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          margin: -1,
          overflow: 'hidden',
        }}
      />
      <Box
        component="img"
        src={image}
        alt=""
        sx={{
          display: 'block',
          width: '100%',
          aspectRatio: String(aspectRatio),
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.15) 55%, transparent 75%)',
        }}
      />
      <Typography
        variant="body2"
        sx={{
          position: 'absolute',
          left: 8,
          right: 8,
          bottom: 6,
          color: '#fff',
          fontWeight: 600,
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
        }}
      >
        {name}
      </Typography>
      {selected && (
        <CheckCircleIcon
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            color: tint,
            bgcolor: '#fff',
            borderRadius: '50%',
            fontSize: 22,
          }}
        />
      )}
    </Box>
  );
}

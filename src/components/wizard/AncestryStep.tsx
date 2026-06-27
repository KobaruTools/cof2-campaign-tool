'use client';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { ancestryById, ancestries, pathById } from '@/data';
import type { AbilityModifier } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import { initialChoices } from '@/lib/character/ancestry';
import { AbilityBadge } from '@/components/AbilityBadge';
import type { StepProps } from './types';

function splitDescription(desc: string): {
  intro: string;
  interpretationTitle: string | null;
  interpretationBody: string;
} {
  const idx = desc.search(/^Interpréter /m);
  if (idx === -1) return { intro: desc.trim(), interpretationTitle: null, interpretationBody: '' };
  const rest = desc.slice(idx);
  const nl = rest.indexOf('\n');
  return {
    intro: desc.slice(0, idx).trim(),
    interpretationTitle: (nl === -1 ? rest : rest.slice(0, nl)).trim(),
    interpretationBody: nl === -1 ? '' : rest.slice(nl).trim(),
  };
}

/**
 * Affichage inline d'un modificateur de peuple : la valeur signée puis les
 * caractéristiques concernées sous forme de badges (ex. « +1 [PER] ou [CHA] »).
 * Cas humain (les 7 caracs listées) : « +1 à une de vos deux plus faibles ».
 */
function AncestryModifier({ mod }: { mod: AbilityModifier }) {
  const theme = useTheme();
  const bonus = mod.value > 0;
  const sign = bonus ? '+' : '';
  const tint = bonus ? theme.palette.success.main : theme.palette.error.main;
  const isLowest = mod.abilities.length === ABILITY_IDS.length;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Chip
        label={`${sign}${mod.value}`}
        color={bonus ? 'success' : 'error'}
        variant="outlined"
        size="small"
        sx={{ minWidth: 48, fontWeight: 700, '& .MuiChip-label': { px: 0 } }}
      />
      {isLowest ? (
        <Typography variant="body2" color="text.secondary">
          à une de vos deux plus faibles caractéristiques (au choix)
        </Typography>
      ) : (
        mod.abilities.map((c, j) => (
          <Box
            component="span"
            key={c}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}
          >
            {j > 0 && (
              <Typography component="span" variant="body2" color="text.secondary">
                ou
              </Typography>
            )}
            <AbilityBadge ability={c} color={tint} />
          </Box>
        ))
      )}
    </Stack>
  );
}


export function AncestryStep({ draft, patch }: StepProps) {
  const ancestry = ancestryById.get(draft.ancestryId);
  const desc = ancestry ? splitDescription(ancestry.description) : null;

  const chooseAncestry = (id: string) => {
    const p = ancestryById.get(id);
    if (!p) return;
    patch({
      ancestryId: id,
      ancestryChoices: initialChoices(p),
      ancestryPathId: p.ancestryPathIds.length === 1 ? p.ancestryPathIds[0] : null,
    });
  };

  return (
    <Stack spacing={3}>
      <FormControl>
        <FormLabel>Peuple</FormLabel>
        <RadioGroup value={draft.ancestryId} onChange={(e) => chooseAncestry(e.target.value)}>
          <Grid container spacing={1}>
            {ancestries.map((p) => (
              <Grid key={p.id} size={{ xs: 12, sm: 6 }}>
                <FormControlLabel value={p.id} control={<Radio />} label={p.name} />
              </Grid>
            ))}
          </Grid>
        </RadioGroup>
      </FormControl>

      {ancestry && (
        <Card variant="outlined" sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            image={`/ancestries/${ancestry.id}.webp`}
            alt={`Illustration du peuple ${ancestry.name}`}
            sx={{ maxHeight: 320, objectFit: 'cover', objectPosition: 'center' }}
          />
          {/* Filigrane « homme de vitruve » du peuple, décalé hors du coin bas-droite */}
          <Box
            component="img"
            src={`/ancestries/${ancestry.id}-vitruve.webp`}
            alt=""
            aria-hidden
            sx={{
              position: 'absolute',
              bottom: -24,
              right: -24,
              width: { xs: 160, sm: 220 },
              opacity: 0.75,
              pointerEvents: 'none',
              userSelect: 'none',
              zIndex: 0,
            }}
          />
          <CardContent
            sx={{
              position: 'relative',
              zIndex: 1,
              '&:last-child': { pb: { xs: 15, sm: 21 } },
            }}
          >
            <Typography variant="subtitle1" gutterBottom>
              {ancestry.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
              {desc?.intro}
            </Typography>

            {desc?.interpretationTitle && (
              <Accordion
                disableGutters
                elevation={0}
                sx={{ mb: 2, border: 1, borderColor: 'divider', '&::before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">{desc.interpretationTitle}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ whiteSpace: 'pre-line' }}
                  >
                    {desc.interpretationBody}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Modificateurs de caractéristiques
              </Typography>
              <Stack spacing={1}>
                {ancestry.abilityModifiers.map((mod, i) => (
                  <AncestryModifier key={i} mod={mod} />
                ))}
              </Stack>
            </Box>

            {ancestry.ancestryPathIds.length > 1 && (
              <FormControl sx={{ mt: 1, minWidth: { xs: '100%', sm: 260 } }} size="small">
                <InputLabel>Voie de peuple</InputLabel>
                <Select
                  label="Voie de peuple"
                  value={draft.ancestryPathId ?? ''}
                  onChange={(e) => patch({ ancestryPathId: e.target.value })}
                >
                  {ancestry.ancestryPathIds.map((vid) => (
                    <MenuItem key={vid} value={vid}>
                      {pathById.get(vid)?.name ?? vid}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

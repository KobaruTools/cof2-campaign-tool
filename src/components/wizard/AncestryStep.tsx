'use client';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
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
import { materializeDraft } from '@/lib/character/wizard';
import { setFeatureChoice } from '@/lib/character/choices';
import { AbilityBadge } from '@/components/AbilityBadge';
import { FeatureChoiceField } from '@/components/sheet/FeatureChoiceField';
import { SourceRef } from '@/components/SourceRef';
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
 * Badge de valeur signée d'un modificateur (ex. « +1 », « -2 »). Reprend le
 * style du badge de caractéristique (`AbilityBadge`) mais conserve la couleur
 * verte (bonus) / rouge (malus) pour signaler le sens du modificateur.
 */
function ModifierValueBadge({ value }: { value: number }) {
  const theme = useTheme();
  const bonus = value > 0;
  const tint = bonus ? theme.palette.success.main : theme.palette.error.main;
  const sign = bonus ? '+' : '';
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 0.75,
        py: 0.125,
        minWidth: 40,
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: 0.5,
        lineHeight: 1.4,
        borderRadius: 1,
        border: 1,
        borderColor: tint,
        bgcolor: `color-mix(in srgb, ${tint} 18%, transparent)`,
        color: tint,
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {sign}
      {value}
    </Box>
  );
}

/**
 * Colonne latérale illustrée de la Card détail (remplace l'ancienne bannière paysage) : un portrait
 * au format vertical qui défile en boucle infinie de droite à gauche (retour utilisateur explicite,
 * PER-403 annulé). Une seule illustration existe par peuple (`public/ancestries/*.webp`) — le
 * « carrousel » répète cette même image en continu plutôt que d'alterner plusieurs portraits.
 *
 * Technique du bandeau sans fin : la piste (`display:flex`) contient l'image DEUX fois et anime
 * `translateX(0) → translateX(-50%)` — la translation vaut alors exactement la largeur d'un
 * exemplaire, donc la jointure entre la fin du premier et le début du second est invisible (pixels
 * identiques), quel que soit le rendu réel des images. Pas besoin de connaître leur largeur en px.
 *
 * Chaque exemplaire garde son ratio NATUREL (hauteur bloquée à la colonne, largeur automatique,
 * sans `aspectRatio`/`objectFit` forcés) : forcer un cadrage portrait sur ces illustrations
 * paysage ne montrait qu'une bande centrale rognée. Ici toute l'image défile progressivement dans
 * la fenêtre étroite de la colonne (retour utilisateur explicite).
 */
function AncestryPortraitCarousel({ ancestryId, name }: { ancestryId: string; name: string }) {
  const src = `/ancestries/${ancestryId}.webp`;
  return (
    <Box sx={{ position: 'relative', width: { xs: '100%', sm: 170 }, flexShrink: 0 }}>
      <Box sx={{ position: 'relative', height: { xs: 220, sm: 420 }, overflow: 'hidden', borderRadius: 2 }}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'flex',
            height: '100%',
            width: 'max-content',
            '@keyframes ancestry-portrait-scroll': {
              from: { transform: 'translateX(0)' },
              to: { transform: 'translateX(-50%)' },
            },
            animation: 'ancestry-portrait-scroll 40s linear infinite',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          {[0, 1].map((i) => (
            <Box
              key={i}
              component="img"
              src={src}
              alt={i === 0 ? `Illustration du peuple ${name}` : ''}
              aria-hidden={i !== 0}
              sx={{
                height: '100%',
                width: 'auto',
                flexShrink: 0,
              }}
            />
          ))}
        </Box>
      </Box>
      {/* Filigrane « homme de vitruve » du peuple, décalé hors du coin bas-droite */}
      <Box
        component="img"
        src={`/ancestries/${ancestryId}-vitruve.webp`}
        alt=""
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: -14,
          right: -14,
          width: 96,
          opacity: 0.8,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 1,
        }}
      />
    </Box>
  );
}

/**
 * Affichage inline d'un modificateur de peuple : la valeur signée puis les
 * caractéristiques concernées sous forme de badges (ex. « +1 [PER] ou [CHA] »).
 * Cas humain (les 7 caracs listées) : « +1 à une de vos deux plus faibles ».
 */
function AncestryModifier({ mod }: { mod: AbilityModifier }) {
  const isLowest = mod.abilities.length === ABILITY_IDS.length;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <ModifierValueBadge value={mod.value} />
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
            <AbilityBadge ability={c} />
          </Box>
        ))
      )}
    </Stack>
  );
}


export function AncestryStep({ draft, patch }: StepProps) {
  const ancestry = ancestryById.get(draft.ancestryId);
  const desc = ancestry ? splitDescription(ancestry.description) : null;
  // Personnage de travail pour résoudre/afficher les choix d'identité du peuple (PER-401), au même
  // titre que `PathsStep` pour les choix de rang 1. `null` tant qu'aucun peuple n'est retenu.
  const choicePreview = ancestry ? materializeDraft(draft, ancestry, draft.createdAt) : null;
  const identityChoiceIds = ancestry?.identityChoiceFeatureIds ?? [];

  const chooseAncestry = (id: string) => {
    const p = ancestryById.get(id);
    if (!p) return;
    patch({
      ancestryId: id,
      ancestryChoices: initialChoices(p),
      ancestryPathId: p.ancestryPathIds.length === 1 ? p.ancestryPathIds[0] : null,
      // Changer de peuple efface l'ascendance elfe du demi-elfe « version Le Compagnon » (PER-324).
      demiElfeElfAncestry: undefined,
    });
  };

  // Demi-elfe « version Le Compagnon » (PER-324) : la voie optionnelle n'est proposée que si le
  // contenu payant est chargé (`pathById.has('demi-elfe')`) et le peuple est demi-elfe. La case
  // bascule la voie de peuple sur `demi-elfe` (au lieu du choix culturel humain/elfe) et fait
  // apparaître le choix d'ascendance elfe, requis pour « Sang féerique » (rang 4).
  const companionDemiElfe = draft.ancestryId === 'demi-elfe' && pathById.has('demi-elfe');
  const companionPathActive = companionDemiElfe && draft.ancestryPathId === 'demi-elfe';

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
        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ alignItems: 'flex-start' }}>
              <AncestryPortraitCarousel ancestryId={ancestry.id} name={ancestry.name} />

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">{ancestry.name}</Typography>
                  <SourceRef page={ancestry.sourcePage} term={ancestry.name} />
                </Stack>
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

                {/* Choix d'identité du peuple type option (PER-401) — ex. type de souffle du drakonide
                    (PER-326) : posé dès la création, hors des rangs de voie, réédité ensuite en Identité. */}
                {choicePreview && identityChoiceIds.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Choix du peuple
                    </Typography>
                    <Stack spacing={1}>
                      {identityChoiceIds.map((fid) => (
                        <FeatureChoiceField
                          key={fid}
                          character={choicePreview}
                          featureId={fid}
                          mode="edit"
                          onChange={(id, index, value) =>
                            patch({ featureChoices: setFeatureChoice(choicePreview, id, index, value) })
                          }
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Sélecteur de voie culturelle standard — masqué en mode Compagnon (la voie devient
                    `demi-elfe`, absente de cette liste). */}
                {ancestry.ancestryPathIds.length > 1 && !companionPathActive && (
                  <FormControl sx={{ mt: 1, minWidth: { xs: '100%', sm: 260 } }} size="small">
                    <InputLabel>Voie de peuple</InputLabel>
                    <Select
                      label="Voie de peuple"
                      value={
                        draft.ancestryPathId && ancestry.ancestryPathIds.includes(draft.ancestryPathId)
                          ? draft.ancestryPathId
                          : ''
                      }
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

                {/* Voie du demi-elfe optionnelle (Le Compagnon, PER-324). */}
                {companionDemiElfe && (
                  <Box sx={{ mt: 1.5 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={companionPathActive}
                          onChange={(e) =>
                            patch(
                              e.target.checked
                                ? {
                                    ancestryPathId: 'demi-elfe',
                                    demiElfeElfAncestry: draft.demiElfeElfAncestry ?? 'elfe-haut',
                                  }
                                : { ancestryPathId: null, demiElfeElfAncestry: undefined },
                            )
                          }
                        />
                      }
                      label={pathById.get('demi-elfe')?.name ?? 'Voie du demi-elfe'}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: companionPathActive ? 1.5 : 0 }}>
                      Voie optionnelle pour un demi-elfe qui ne s’est assimilé à aucune de ses deux cultures.
                      Elle remplace le choix de voie culturelle ; l’ascendance elfe reste et détermine le sort
                      de « Sang féerique » (rang 4).
                    </Typography>
                    {companionPathActive && (
                      <FormControl>
                        <FormLabel>Ascendance elfique</FormLabel>
                        <RadioGroup
                          row
                          value={draft.demiElfeElfAncestry ?? 'elfe-haut'}
                          onChange={(e) =>
                            patch({ demiElfeElfAncestry: e.target.value as 'elfe-haut' | 'elfe-sylvain' })
                          }
                        >
                          <FormControlLabel value="elfe-haut" control={<Radio />} label="Elfe haut (sorts d’ensorceleur)" />
                          <FormControlLabel value="elfe-sylvain" control={<Radio />} label="Elfe sylvain (sorts de druide)" />
                        </RadioGroup>
                      </FormControl>
                    )}
                  </Box>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

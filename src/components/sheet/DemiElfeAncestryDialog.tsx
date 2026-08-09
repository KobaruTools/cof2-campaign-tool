'use client';

import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { pathById } from '@/data';
import { AppAlert } from '@/components/AppAlert';
import { SourceRef } from '@/components/SourceRef';

/** Voies de peuple possibles pour un demi-elfe : culturelles (base) + Voie du demi-elfe (Le Compagnon). */
const CULTURE_PATH_IDS = ['humain', 'elfe-haut', 'elfe-sylvain'] as const;
const COMPANION_PATH_ID = 'demi-elfe';

type ElfAncestry = 'elfe-haut' | 'elfe-sylvain';

export interface DemiElfeAncestryDialogProps {
  open: boolean;
  onClose: () => void;
  /** Voie de peuple actuelle du personnage. */
  currentPathId: string | null;
  /** Ascendance elfe actuelle (mode Compagnon), si renseignée. */
  currentElfAncestry?: ElfAncestry;
  /** Applique le changement : nouvelle voie + ascendance elfe (pour la Voie du demi-elfe). */
  onApply: (newPathId: string, elfAncestry?: ElfAncestry) => void;
}

const pathName = (id: string): string => pathById.get(id)?.name ?? id;

/**
 * Modale d'édition RÉTROACTIVE de la voie de peuple d'un demi-elfe (PER-324) : l'assistant de création
 * fige ce choix, et cette modale — accessible en mode édition de la section Identité — permet de basculer
 * entre les voies culturelles du livre de base (humain / elfe haut / elfe sylvain) et la « Voie du demi-elfe »
 * optionnelle (Le Compagnon), ainsi que de fixer l'ascendance elfe (haut/sylvain) qui détermine le sort de
 * « Sang féerique » (rang 4). Changer de voie REMAPPE les capacités de voie de peuple et PURGE leurs choix.
 */
export function DemiElfeAncestryDialog({
  open,
  onClose,
  currentPathId,
  currentElfAncestry,
  onApply,
}: DemiElfeAncestryDialogProps) {
  const [pathId, setPathId] = useState<string>(currentPathId ?? 'humain');
  const [elf, setElf] = useState<ElfAncestry>(currentElfAncestry ?? 'elfe-haut');

  // Re-synchronise l'état local à chaque ouverture (le personnage a pu changer entre-temps).
  useEffect(() => {
    if (open) {
      setPathId(currentPathId ?? 'humain');
      setElf(currentElfAncestry ?? 'elfe-haut');
    }
  }, [open, currentPathId, currentElfAncestry]);

  const isCompanion = pathId === COMPANION_PATH_ID;
  const changed =
    pathId !== (currentPathId ?? '') || (isCompanion && elf !== (currentElfAncestry ?? 'elfe-haut'));
  const companionLoaded = pathById.has(COMPANION_PATH_ID);

  const apply = () => {
    onApply(pathId, isCompanion ? elf : undefined);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Voie de peuple du demi-elfe</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Le demi-elfe choisit une voie entre celle de son ascendance elfique (elfe haut ou elfe sylvain)
            et celle de l’humain. La « Voie du demi-elfe » (Le Compagnon) remplace ce choix pour un demi-elfe
            qui ne s’est assimilé à aucune de ses deux cultures <SourceRef page={10} />.
          </Typography>

          <FormControl>
            <FormLabel>Voie de peuple</FormLabel>
            <RadioGroup value={pathId} onChange={(e) => setPathId(e.target.value)}>
              {CULTURE_PATH_IDS.map((id) => (
                <FormControlLabel key={id} value={id} control={<Radio />} label={pathName(id)} />
              ))}
              {companionLoaded && (
                <FormControlLabel
                  value={COMPANION_PATH_ID}
                  control={<Radio />}
                  label={`${pathName(COMPANION_PATH_ID)} (Le Compagnon)`}
                />
              )}
            </RadioGroup>
          </FormControl>

          {isCompanion && (
            <FormControl>
              <FormLabel>Ascendance elfique</FormLabel>
              <RadioGroup row value={elf} onChange={(e) => setElf(e.target.value as ElfAncestry)}>
                <FormControlLabel value="elfe-haut" control={<Radio />} label="Elfe haut (ensorceleur)" />
                <FormControlLabel value="elfe-sylvain" control={<Radio />} label="Elfe sylvain (druide)" />
              </RadioGroup>
            </FormControl>
          )}

          <AppAlert severity="warning">
            Changer de voie de peuple remappe les capacités de voie de peuple déjà acquises et efface leurs
            choix (origine, sort emprunté…), à re-régler ensuite. Les autres capacités ne sont pas touchées.
          </AppAlert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" disabled={!changed} onClick={apply}>
          Appliquer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

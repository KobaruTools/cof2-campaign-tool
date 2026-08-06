'use client';

/**
 * POSE d'un BUFF DE GROUPE sur l'écran de MJ (PER-104, lot 3).
 *
 * Un buff de groupe (Chant des héros p. 67, Bénédiction p. 124) vise « ses alliés et lui » : le
 * déposer sur une carte du tracker n'affecte donc pas cette seule carte, mais ouvre CETTE fenêtre de
 * pose. Le MJ y voit les combattants du camp du porteur — **tous cochés par défaut** — décoche celui
 * qui est hors de portée de voix et, s'il le veut, pose une durée en tours. Le PALIER (+1, +2 au rang
 * 5) n'est pas demandé : il se déduit du rang du porteur, seule chose dont dépend la règle.
 *
 * Un seul « Appliquer » ⇒ **un seul état** en sortie (`applyStatusToKeys`), donc un seul upsert
 * `campaign_combat` et une seule diffusion Realtime : poser N fois de suite en produirait N.
 *
 * NB — le ticket parlait d'un « popover » ; c'est une modale compacte, faute d'ancre stable : un
 * dépôt `@dnd-kit` ne donne pas le nœud DOM survolé, et la même fenêtre sert aussi au repli au clic.
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { SourceRef } from '@/components/SourceRef';
import { statusEntry, STATUS_DURATION_MAX } from '@/lib/character/statusEffects';
import { statusLabel } from '@/lib/ui/statusPalette';
import type { BeneficialEffectId } from '@/data/schema';

/** Un combattant proposé à la pose : sa clé de tracker et son étiquette affichée. */
export interface GroupBuffCandidate {
  /** Clé du combattant (id de personnage joueur OU id d'instance de créature). */
  key: string;
  /** Étiquette affichée (nom du personnage, ou nom numéroté de l'instance de créature). */
  label: string;
  /**
   * Ce combattant est-il le PORTEUR du sort (celui sur qui la puce a été déposée) ? Signalé dans la
   * liste : la règle l'inclut explicitement (« ses alliés ET LUI »), il ne s'agit pas de l'oublier.
   */
  carrier?: boolean;
}

export interface GroupBuffDialogProps {
  open: boolean;
  onClose: () => void;
  /** Buff à poser (entrée de `BENEFICIAL_EFFECTS`). `null` = fenêtre fermée / rien à poser. */
  buffId: BeneficialEffectId | null;
  /** Combattants du camp du porteur, dans l'ordre d'affichage du tracker. */
  candidates: readonly GroupBuffCandidate[];
  /**
   * Palier du buff, DÉDUIT du rang du porteur dans sa voie (1, ou 2 dès le rang 5) et non demandé au
   * MJ : la règle ne lui laisse aucun arbitrage, et le rang est déjà connu de la fiche du porteur.
   * Une créature porteuse, ou un personnage qui ne porte pas la capacité, retombe sur 1.
   */
  intensity: number;
  /**
   * Pose effective : UN appel, UNE écriture. `rounds` absent = aucun compteur (le buff dure jusqu'à
   * ce que le MJ le retire — « CHA minutes » n'est pas convertible en manches).
   */
  onApply: (keys: string[], options: { intensity: number; rounds?: number }) => void;
  /**
   * Combattants du camp qui portent DÉJÀ ce buff. Non vide, la fenêtre propose de le lever sur tout
   * le camp (`onRemoveAll`) : retirer le badge d'une carte ne concerne QUE cette carte, la levée
   * collective se fait donc depuis la puce, là où la pose a eu lieu.
   */
  posedKeys: readonly string[];
  /** Lève le buff sur tous les `posedKeys`, en une écriture. */
  onRemoveAll: (keys: string[]) => void;
}

/**
 * Enveloppe : la modale elle-même. Le FORMULAIRE est un composant à part, monté seulement quand un
 * buff est en cours de pose — c'est ce montage/démontage qui réamorce les cases, le palier et la
 * durée, plutôt qu'un effet qui les remettrait à zéro à chaque ouverture (React déconseille le
 * `setState` synchrone en effet). Fermer la fenêtre repasse `buffId` à `null` côté écran de MJ, donc
 * le formulaire est démonté et la pose suivante repart toujours propre.
 */
export function GroupBuffDialog({ open, onClose, buffId, ...rest }: GroupBuffDialogProps) {
  return (
    <Dialog open={open && buffId !== null} onClose={onClose} fullWidth maxWidth="xs">
      {buffId !== null && <GroupBuffForm buffId={buffId} onClose={onClose} {...rest} />}
    </Dialog>
  );
}

function GroupBuffForm({
  onClose,
  buffId,
  candidates,
  intensity,
  onApply,
  posedKeys,
  onRemoveAll,
}: Omit<GroupBuffDialogProps, 'open' | 'buffId'> & { buffId: BeneficialEffectId }) {
  // Tous cochés par défaut : à la table, le cas courant est que tout le camp est à portée de voix —
  // on décoche l'exception, on ne coche pas la règle.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(candidates.map((c) => c.key)),
  );
  // Durée en TOURS, saisie libre et VIDE par défaut (durée indéterminée). Chaîne et non nombre :
  // « vide » et « 0 » sont deux réponses différentes, un `number | null` les confondrait à la saisie.
  const [rounds, setRounds] = useState('');

  const entry = statusEntry(buffId);
  const label = statusLabel(buffId);
  const parsedRounds = Number.parseInt(rounds, 10);
  const validRounds = Number.isFinite(parsedRounds) && parsedRounds >= 1 ? parsedRounds : undefined;

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const apply = () => {
    if (selected.size === 0) return;
    // L'ordre du tracker plutôt que l'ordre de cochage : l'état produit reste comparable d'une pose
    // à l'autre (utile aux diffs et aux tests).
    const keys = candidates.filter((c) => selected.has(c.key)).map((c) => c.key);
    onApply(keys, { intensity, ...(validRounds !== undefined ? { rounds: validRounds } : {}) });
    onClose();
  };

  return (
    <>
      <DialogTitle sx={{ pb: 1 }}>{label}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {/* Verbatim du livre + renvoi de page : jamais de règle affichée sans sa source. */}
          {entry && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {entry.effect}
              </Typography>
              <SourceRef page={entry.sourcePage} term={label} />
            </Box>
          )}

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Qui en profite&nbsp;?
            </Typography>
            {candidates.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucun combattant dans ce camp.
              </Typography>
            ) : (
              <Stack>
                {candidates.map((c) => (
                  <FormControlLabel
                    key={c.key}
                    control={
                      <Checkbox
                        size="small"
                        color="success"
                        checked={selected.has(c.key)}
                        onChange={() => toggle(c.key)}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {c.label}
                        {c.carrier && (
                          <Typography component="span" variant="caption" color="text.secondary">
                            {' '}
                            — lance le sort
                          </Typography>
                        )}
                      </Typography>
                    }
                    sx={{ mr: 0, '& .MuiFormControlLabel-label': { lineHeight: 1.3 } }}
                  />
                ))}
              </Stack>
            )}
          </Box>

          {/* Le palier n'est PAS une question : il se lit sur le rang du lanceur dans sa voie, et la
              règle ne laisse aucun arbitrage au MJ. On l'annonce, on ne le demande pas. */}
          <Box>
            <Typography variant="subtitle2">Bonus&nbsp;: +{intensity}</Typography>
            <Typography variant="caption" color="text.secondary">
              D’après le rang du lanceur dans sa voie (+2 à partir du rang 5).
            </Typography>
          </Box>

          <TextField
            label="Durée (tours)"
            type="number"
            size="small"
            value={rounds}
            onChange={(e) => setRounds(e.target.value)}
            slotProps={{ htmlInput: { min: 1, max: STATUS_DURATION_MAX } }}
            helperText="Laisser vide : le buff reste posé jusqu’à ce que vous le retiriez."
            sx={{ maxWidth: 200 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        {posedKeys.length > 0 && (
          <Button
            color="warning"
            onClick={() => {
              onRemoveAll([...posedKeys]);
              onClose();
            }}
            sx={{ mr: 'auto' }}
          >
            Lever sur tout le camp
          </Button>
        )}
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" color="success" onClick={apply} disabled={selected.size === 0}>
          Appliquer
        </Button>
      </DialogActions>
    </>
  );
}

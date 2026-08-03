'use client';

/**
 * Modale « Ajouter une créature » du combat tracker de l'écran de MJ (PER-247).
 * Sélection d'une créature du bestiaire via un sélecteur groupé par catégorie
 * (`CreatureCatalogAutocomplete`), APERÇU de son bloc de stats complet (identique au
 * bestiaire, `BestiaryStatBlock` via `CreatureBlobView`), puis validation pour
 * l'« invoquer » dans le combat.
 *
 * PER-295 : on peut donner à la créature un **nom personnalisé** (« Grishnak le borgne »,
 * « Garde du corps ») et un **nombre d'exemplaires** à ajouter d'un coup (« 5 fois le même
 * bandit de base »). Les exemplaires partagent le nom, la visibilité et le camp choisis ;
 * ils sont numérotés à l'affichage tant qu'ils sont homonymes.
 *
 * Lecture via le store `bestiary` (liste légère, cache PER-244) : aucune source codée
 * en dur, le contenu entitlé remontera tout seul le jour de PER-242.
 */
import { useEffect, useMemo, useState } from 'react';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useBestiaryStore } from '@/stores/bestiary';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { CreatureBlobView } from '@/components/bestiary/CreatureBlobView';
import { SIDE_ACCENT, SIDE_LABELS, type CreatureSide } from '@/lib/ui/creature';
import {
  clampAddCount,
  CREATURE_ADD_COUNT_MAX,
  CREATURE_NAME_MAX_LENGTH,
} from '@/lib/session/combatState';
import { CreatureCatalogAutocomplete } from './CreatureCatalogAutocomplete';

export interface AddCreatureDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Ajoute `count` instances de la créature `slug` au combat, avec leur visibilité joueurs,
   * leur camp et leur nom personnalisé éventuel (`name` absent = nom du bestiaire).
   */
  onAdd: (
    slug: string,
    options: { visible: boolean; side: CreatureSide; name?: string; count: number },
  ) => void;
}

export function AddCreatureDialog({ open, onClose, onAdd }: AddCreatureDialogProps) {
  const list = useBestiaryStore((s) => s.list);
  const status = useBestiaryStore((s) => s.status);
  const loadList = useBestiaryStore((s) => s.loadList);
  const [selected, setSelected] = useState<string | null>(null);
  // Visibilité joueurs (fenêtre projetée) de la créature à ajouter — ON par défaut.
  const [visible, setVisible] = useState(true);
  // Camp de la créature à ajouter (PER-249) — ADVERSAIRE par défaut (cas le plus courant).
  const [side, setSide] = useState<CreatureSide>('enemy');
  // Nom personnalisé (PER-295) — vide = nom du bestiaire.
  const [name, setName] = useState('');
  // Nombre d'exemplaires (PER-295), saisi en TEXTE : un champ numérique doit pouvoir être
  // temporairement vide pendant la frappe. Normalisé (borné) à la validation seulement.
  const [count, setCount] = useState('1');

  // Charge la liste à l'ouverture (idempotent côté store).
  useEffect(() => {
    if (open) void loadList();
  }, [open, loadList]);

  // Nom du bestiaire de la créature choisie : sert d'invite au champ « nom personnalisé »
  // (le MJ voit ce qui s'affichera s'il laisse le champ vide).
  const selectedName = useMemo(
    () => (selected ? list?.find((c) => c.id === selected)?.name : undefined),
    [list, selected],
  );

  // Nombre effectivement ajouté (borné par la couche pure) : saisie vide ou invalide → 1.
  const parsedCount = clampAddCount(Number(count));

  // Ferme la modale en repartant d'un formulaire vierge (remise à zéro à la fermeture plutôt
  // que dans un effet à l'ouverture, cf. `set-state-in-effect`).
  const handleClose = () => {
    setSelected(null);
    setVisible(true);
    setSide('enemy');
    setName('');
    setCount('1');
    onClose();
  };

  const handleAdd = () => {
    if (!selected) return;
    onAdd(selected, { visible, side, name: name.trim() || undefined, count: parsedCount });
    handleClose();
  };

  const loading = !list || status === 'idle' || status === 'loading';

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Ajouter une créature</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {/* Camp de la créature (PER-249) : segmenté Adversaire / Allié, teinté du code
              couleur (rouge / vert) réutilisé sur les cartes et le tracker. */}
          <Stack spacing={0.75}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Camp
            </Typography>
            <ToggleButtonGroup
              value={side}
              exclusive
              size="small"
              onChange={(_e, next: CreatureSide | null) => {
                // `ToggleButtonGroup` renvoie `null` si on reclique le bouton actif : on
                // garde alors la sélection courante (un camp doit toujours être choisi).
                if (next) setSide(next);
              }}
              aria-label="Camp de la créature"
            >
              <ToggleButton
                value="enemy"
                sx={{
                  textTransform: 'none',
                  '&.Mui-selected': {
                    color: SIDE_ACCENT.enemy,
                    bgcolor: alpha(SIDE_ACCENT.enemy, 0.16),
                    '&:hover': { bgcolor: alpha(SIDE_ACCENT.enemy, 0.24) },
                  },
                }}
              >
                {SIDE_LABELS.enemy}
              </ToggleButton>
              <ToggleButton
                value="ally"
                sx={{
                  textTransform: 'none',
                  '&.Mui-selected': {
                    color: SIDE_ACCENT.ally,
                    bgcolor: alpha(SIDE_ACCENT.ally, 0.16),
                    '&:hover': { bgcolor: alpha(SIDE_ACCENT.ally, 0.24) },
                  },
                }}
              >
                {SIDE_LABELS.ally}
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {status === 'error' ? (
            <AppAlert
              severity="error"
              title="Chargement du bestiaire impossible"
              action={
                <Button color="inherit" size="small" onClick={() => loadList({ force: true })}>
                  Réessayer
                </Button>
              }
            >
              Une erreur est survenue en chargeant les créatures.
            </AppAlert>
          ) : status === 'unconfigured' ? (
            <AppAlert severity="info" title="Bestiaire indisponible">
              Le bestiaire est servi depuis la base de données, qui n&apos;est pas configurée dans
              cet environnement.
            </AppAlert>
          ) : loading ? (
            <Skeleton variant="rounded" height={40} />
          ) : (
            <CreatureCatalogAutocomplete
              options={list}
              value={selected}
              onSelect={setSelected}
            />
          )}

          {/* Nom personnalisé + nombre d'exemplaires (PER-295). Champs fluides : ils se
              partagent la ligne et se replient proprement en modale mobile. */}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', flexWrap: 'wrap', rowGap: 1 }}>
            <TextField
              size="small"
              label="Nom personnalisé"
              placeholder={selectedName ?? 'Nom affiché dans le combat'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              helperText="Facultatif — vide = nom du bestiaire"
              sx={{ flex: '1 1 240px', minWidth: 180 }}
              slotProps={{ htmlInput: { maxLength: CREATURE_NAME_MAX_LENGTH } }}
            />
            <TextField
              type="number"
              size="small"
              label="Nombre"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              helperText={`1 à ${CREATURE_ADD_COUNT_MAX}`}
              sx={{ flex: '0 1 120px', minWidth: 100 }}
              slotProps={{ htmlInput: { min: 1, max: CREATURE_ADD_COUNT_MAX, step: 1 } }}
            />
          </Stack>

          {/* Aperçu du bloc de stats « à invoquer », ou invite tant qu'aucune sélection. */}
          {selected ? (
            <CreatureBlobView slug={selected} hideNotes />
          ) : (
            <Box
              sx={{
                p: 3,
                textAlign: 'center',
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'divider',
              }}
            >
              <Typography color="text.secondary">
                Sélectionnez une créature pour afficher son bloc de stats.
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        {/* Visibilité joueurs initiale : ON par défaut. Une créature ajoutée « masquée »
            se prépare sans apparaître dans la fenêtre projetée aux joueurs (PER-248). */}
        <AppTooltip
          title={
            visible
              ? parsedCount > 1
                ? 'Les créatures seront visibles dans la fenêtre projetée aux joueurs'
                : 'La créature sera visible dans la fenêtre projetée aux joueurs'
              : parsedCount > 1
                ? 'Les créatures seront masquées aux joueurs (préparées à l’avance)'
                : 'La créature sera masquée aux joueurs (préparée à l’avance)'
          }
        >
          <FormControlLabel
            control={<Switch checked={visible} onChange={(e) => setVisible(e.target.checked)} />}
            label={
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                {visible ? (
                  <VisibilityOutlinedIcon fontSize="small" />
                ) : (
                  <VisibilityOffOutlinedIcon fontSize="small" />
                )}
                <span>Visible par les joueurs</span>
              </Stack>
            }
            sx={{ ml: 0.5 }}
          />
        </AppTooltip>
        <Stack direction="row" spacing={1}>
          <Button onClick={handleClose}>Annuler</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!selected}>
            {parsedCount > 1 ? `Ajouter ${parsedCount} créatures au combat` : 'Ajouter au combat'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

'use client';

/**
 * Modale « Ajouter une créature » du combat tracker de l'écran de MJ (PER-247).
 *
 * Deux SOURCES, choisies par une bascule en tête de modale :
 *  - **Du bestiaire** : sélection via un sélecteur groupé par catégorie
 *    (`CreatureCatalogAutocomplete`), APERÇU de son bloc de stats complet (identique au
 *    bestiaire, `BestiaryStatBlock` via `CreatureBlobView`), puis validation pour
 *    l'« invoquer » dans le combat.
 *  - **Créée à la main** : le MJ saisit lui-même un bloc minimal pour un adversaire qui n'est
 *    dans aucun livre (PNJ improvisé, variante bricolée). Seuls **initiative, PV et défense**
 *    sont obligatoires ; agilité, NC, description, attaques et capacités sont facultatifs. Le
 *    bloc saisi est copié sur l'instance de combat, donc affiché partout (écran de MJ,
 *    projection, écran joueur) sans rien charger.
 *
 * PER-295 : on peut donner à la créature un **nom personnalisé** (« Grishnak le borgne »,
 * « Garde du corps » — obligatoire pour une créature créée à la main) et un **nombre
 * d'exemplaires** à ajouter d'un coup (« 5 fois le même bandit de base »). Les exemplaires
 * partagent le nom, la visibilité et le camp choisis ; ils sont numérotés à l'affichage tant
 * qu'ils sont homonymes.
 *
 * Lecture via le store `bestiary` (liste légère, cache PER-244) : aucune source codée
 * en dur, le contenu entitlé remontera tout seul le jour de PER-242.
 */
import { useEffect, useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
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
import { BestiaryStatBlock } from '@/components/bestiary/BestiaryStatBlock';
import { CreatureBlobView } from '@/components/bestiary/CreatureBlobView';
import { SIDE_ACCENT, SIDE_LABELS, type CreatureSide } from '@/lib/ui/creature';
import {
  clampAddCount,
  CREATURE_ADD_COUNT_MAX,
  CREATURE_NAME_MAX_LENGTH,
} from '@/lib/session/combatState';
import {
  customCreatureBlob,
  normalizeCustomCreature,
  CUSTOM_FIELD_MAX_LENGTH,
  CUSTOM_LIST_MAX_LENGTH,
  CUSTOM_TEXT_MAX_LENGTH,
  type CustomCreature,
} from '@/lib/session/customCreature';
import { CreatureCatalogAutocomplete } from './CreatureCatalogAutocomplete';

/** Source de la créature à ajouter : catalogue du bestiaire, ou bloc saisi à la main. */
type CreatureSource = 'bestiary' | 'custom';

/** Ligne d'attaque en cours de saisie (champs libres, tous verbatim). */
interface AttackDraft {
  name: string;
  bonus: string;
  damage: string;
  range: string;
}

/** Ligne de capacité spéciale en cours de saisie. */
interface AbilityDraft {
  name: string;
  text: string;
}

const EMPTY_ATTACK: AttackDraft = { name: '', bonus: '', damage: '', range: '' };
const EMPTY_ABILITY: AbilityDraft = { name: '', text: '' };

/**
 * Entier saisi dans un champ numérique, ou `undefined` si le champ est vide / invalide.
 * Les champs numériques sont tenus en TEXTE : ils doivent pouvoir être temporairement vides
 * (ou réduits à « - ») pendant la frappe.
 */
function parseIntegerField(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? Math.trunc(value) : undefined;
}

/** Intitulé d'une section du formulaire de saisie manuelle. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
      {children}
    </Typography>
  );
}

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
  /**
   * Ajoute `count` instances d'une créature CRÉÉE À LA MAIN : le bloc saisi est copié sur
   * chaque instance. `name` porte ici le nom de la créature (obligatoire côté saisie).
   */
  onAddCustom: (
    custom: CustomCreature,
    options: { visible: boolean; side: CreatureSide; name?: string; count: number },
  ) => void;
}

export function AddCreatureDialog({ open, onClose, onAdd, onAddCustom }: AddCreatureDialogProps) {
  const list = useBestiaryStore((s) => s.list);
  const status = useBestiaryStore((s) => s.status);
  const loadList = useBestiaryStore((s) => s.loadList);
  // Source de la créature — le bestiaire par défaut (cas le plus courant).
  const [source, setSource] = useState<CreatureSource>('bestiary');
  const [selected, setSelected] = useState<string | null>(null);
  // Visibilité joueurs (fenêtre projetée) de la créature à ajouter — ON par défaut.
  const [visible, setVisible] = useState(true);
  // Camp de la créature à ajouter (PER-249) — ADVERSAIRE par défaut (cas le plus courant).
  const [side, setSide] = useState<CreatureSide>('enemy');
  // Nom personnalisé (PER-295) — vide = nom du bestiaire ; OBLIGATOIRE en saisie manuelle.
  const [name, setName] = useState('');
  // Nombre d'exemplaires (PER-295), saisi en TEXTE : un champ numérique doit pouvoir être
  // temporairement vide pendant la frappe. Normalisé (borné) à la validation seulement.
  const [count, setCount] = useState('1');
  // Bloc saisi à la main — tous les champs en texte (cf. `parseIntegerField`).
  const [initiative, setInitiative] = useState('');
  const [hitPoints, setHitPoints] = useState('');
  const [defense, setDefense] = useState('');
  const [agility, setAgility] = useState('');
  const [nc, setNc] = useState('');
  const [description, setDescription] = useState('');
  const [attacks, setAttacks] = useState<AttackDraft[]>([]);
  const [abilities, setAbilities] = useState<AbilityDraft[]>([]);

  const custom = source === 'custom';

  // Charge la liste à l'ouverture (idempotent côté store) — inutile en saisie manuelle, mais
  // la bascule de source ne coûte alors rien.
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

  // Bloc manuel normalisé, ou `undefined` tant que le socle obligatoire (initiative, PV,
  // défense) n'est pas complet — la couche pure fait foi, la modale n'en est que le miroir.
  const customDraft = useMemo<CustomCreature | undefined>(
    () =>
      normalizeCustomCreature({
        initiative: parseIntegerField(initiative),
        hitPoints: parseIntegerField(hitPoints),
        defense: parseIntegerField(defense),
        agility: parseIntegerField(agility),
        nc,
        description,
        attacks,
        specialAbilities: abilities,
      }),
    [initiative, hitPoints, defense, agility, nc, description, attacks, abilities],
  );

  // Aperçu du bloc manuel : bloc de bestiaire SYNTHÉTIQUE, rendu exactement comme le sera la
  // carte de l'écran de MJ.
  const customPreview = useMemo(
    () => (customDraft ? customCreatureBlob(customDraft, name.trim()) : undefined),
    [customDraft, name],
  );

  const trimmedName = name.trim();
  const canAdd = custom ? Boolean(customDraft) && Boolean(trimmedName) : Boolean(selected);

  // Ferme la modale en repartant d'un formulaire vierge (remise à zéro à la fermeture plutôt
  // que dans un effet à l'ouverture, cf. `set-state-in-effect`).
  const handleClose = () => {
    setSource('bestiary');
    setSelected(null);
    setVisible(true);
    setSide('enemy');
    setName('');
    setCount('1');
    setInitiative('');
    setHitPoints('');
    setDefense('');
    setAgility('');
    setNc('');
    setDescription('');
    setAttacks([]);
    setAbilities([]);
    onClose();
  };

  const handleAdd = () => {
    const options = { visible, side, name: trimmedName || undefined, count: parsedCount };
    if (custom) {
      if (!customDraft || !trimmedName) return;
      onAddCustom(customDraft, options);
    } else {
      if (!selected) return;
      onAdd(selected, options);
    }
    handleClose();
  };

  const loading = !list || status === 'idle' || status === 'loading';

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Ajouter une créature</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {/* Source (bestiaire / saisie manuelle) et camp (PER-249), côte à côte : deux
              segmentés de même facture, repliés l'un sous l'autre en modale étroite. */}
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
            <Stack spacing={0.75}>
              <FieldLabel>Créature</FieldLabel>
              <ToggleButtonGroup
                value={source}
                exclusive
                size="small"
                onChange={(_e, next: CreatureSource | null) => {
                  // `null` = reclic sur le bouton actif : on garde la source courante.
                  if (next) setSource(next);
                }}
                aria-label="Source de la créature"
              >
                <ToggleButton value="bestiary" sx={{ textTransform: 'none' }}>
                  Du bestiaire
                </ToggleButton>
                <ToggleButton value="custom" sx={{ textTransform: 'none' }}>
                  Créée à la main
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            <Stack spacing={0.75}>
              <FieldLabel>Camp</FieldLabel>
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
          </Stack>

          {/* Sélecteur du bestiaire — masqué en saisie manuelle. */}
          {!custom &&
            (status === 'error' ? (
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
                Le bestiaire est servi depuis la base de données, qui n&apos;est pas configurée
                dans cet environnement.
              </AppAlert>
            ) : loading ? (
              <Skeleton variant="rounded" height={40} />
            ) : (
              <CreatureCatalogAutocomplete
                options={list}
                value={selected}
                onSelect={setSelected}
              />
            ))}

          {/* Nom + nombre d'exemplaires (PER-295). Champs fluides : ils se partagent la ligne
              et se replient proprement en modale mobile. */}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', flexWrap: 'wrap', rowGap: 1 }}>
            <TextField
              size="small"
              required={custom}
              label={custom ? 'Nom de la créature' : 'Nom personnalisé'}
              placeholder={custom ? 'Ex. Grishnak le borgne' : selectedName ?? 'Nom affiché dans le combat'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              helperText={custom ? 'Obligatoire' : 'Facultatif — vide = nom du bestiaire'}
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

          {custom ? (
            <>
              {/* Socle OBLIGATOIRE : ce dont le tracker a besoin pour classer, jauger et opposer. */}
              <Stack spacing={0.75}>
                <FieldLabel>Statistiques de combat</FieldLabel>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                  <TextField
                    type="number"
                    size="small"
                    required
                    label="Initiative"
                    value={initiative}
                    onChange={(e) => setInitiative(e.target.value)}
                    sx={{ flex: '1 1 120px', minWidth: 110 }}
                  />
                  <TextField
                    type="number"
                    size="small"
                    required
                    label="Points de vie"
                    value={hitPoints}
                    onChange={(e) => setHitPoints(e.target.value)}
                    sx={{ flex: '1 1 120px', minWidth: 110 }}
                    slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  />
                  <TextField
                    type="number"
                    size="small"
                    required
                    label="Défense"
                    value={defense}
                    onChange={(e) => setDefense(e.target.value)}
                    sx={{ flex: '1 1 120px', minWidth: 110 }}
                  />
                  <TextField
                    type="number"
                    size="small"
                    label="Agilité"
                    value={agility}
                    onChange={(e) => setAgility(e.target.value)}
                    helperText="Départage les égalités"
                    sx={{ flex: '1 1 120px', minWidth: 110 }}
                  />
                  <TextField
                    size="small"
                    label="NC"
                    value={nc}
                    onChange={(e) => setNc(e.target.value)}
                    helperText="Facultatif"
                    sx={{ flex: '0 1 100px', minWidth: 90 }}
                    slotProps={{ htmlInput: { maxLength: CUSTOM_FIELD_MAX_LENGTH } }}
                  />
                </Stack>
              </Stack>

              <TextField
                size="small"
                label="Description"
                placeholder="Notes libres du MJ (facultatif)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                minRows={2}
                slotProps={{ htmlInput: { maxLength: CUSTOM_TEXT_MAX_LENGTH } }}
              />

              {/* Attaques (facultatives) : une portée renseignée marque l'attaque comme étant
                  à distance (le tracker lui applique alors le bon delta d'état). */}
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <FieldLabel>Attaques</FieldLabel>
                  <Box sx={{ flexGrow: 1 }} />
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    disabled={attacks.length >= CUSTOM_LIST_MAX_LENGTH}
                    onClick={() => setAttacks((prev) => [...prev, { ...EMPTY_ATTACK }])}
                  >
                    Ajouter une attaque
                  </Button>
                </Stack>
                {attacks.map((attack, index) => (
                  <Stack
                    key={index}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'flex-start', flexWrap: 'wrap', rowGap: 1 }}
                  >
                    <TextField
                      size="small"
                      label="Mode"
                      placeholder="Ex. Épée longue"
                      value={attack.name}
                      onChange={(e) =>
                        setAttacks((prev) =>
                          prev.map((a, i) => (i === index ? { ...a, name: e.target.value } : a)),
                        )
                      }
                      sx={{ flex: '2 1 180px', minWidth: 150 }}
                      slotProps={{ htmlInput: { maxLength: CUSTOM_FIELD_MAX_LENGTH } }}
                    />
                    <TextField
                      size="small"
                      label="Bonus"
                      placeholder="+7"
                      value={attack.bonus}
                      onChange={(e) =>
                        setAttacks((prev) =>
                          prev.map((a, i) => (i === index ? { ...a, bonus: e.target.value } : a)),
                        )
                      }
                      sx={{ flex: '0 1 100px', minWidth: 90 }}
                      slotProps={{ htmlInput: { maxLength: CUSTOM_FIELD_MAX_LENGTH } }}
                    />
                    <TextField
                      size="small"
                      label="DM"
                      placeholder="1d8+3"
                      value={attack.damage}
                      onChange={(e) =>
                        setAttacks((prev) =>
                          prev.map((a, i) => (i === index ? { ...a, damage: e.target.value } : a)),
                        )
                      }
                      sx={{ flex: '1 1 120px', minWidth: 100 }}
                      slotProps={{ htmlInput: { maxLength: CUSTOM_FIELD_MAX_LENGTH } }}
                    />
                    <TextField
                      size="small"
                      label="Portée"
                      placeholder="20 m"
                      value={attack.range}
                      onChange={(e) =>
                        setAttacks((prev) =>
                          prev.map((a, i) => (i === index ? { ...a, range: e.target.value } : a)),
                        )
                      }
                      sx={{ flex: '1 1 110px', minWidth: 90 }}
                      slotProps={{ htmlInput: { maxLength: CUSTOM_FIELD_MAX_LENGTH } }}
                    />
                    <AppTooltip title="Retirer cette attaque">
                      <IconButton
                        size="small"
                        aria-label="Retirer cette attaque"
                        onClick={() => setAttacks((prev) => prev.filter((_a, i) => i !== index))}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </AppTooltip>
                  </Stack>
                ))}
              </Stack>

              {/* Capacités spéciales (facultatives) : titre + texte de règle libre. */}
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <FieldLabel>Capacités spéciales</FieldLabel>
                  <Box sx={{ flexGrow: 1 }} />
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    disabled={abilities.length >= CUSTOM_LIST_MAX_LENGTH}
                    onClick={() => setAbilities((prev) => [...prev, { ...EMPTY_ABILITY }])}
                  >
                    Ajouter une capacité
                  </Button>
                </Stack>
                {abilities.map((ability, index) => (
                  <Stack
                    key={index}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'flex-start', flexWrap: 'wrap', rowGap: 1 }}
                  >
                    <TextField
                      size="small"
                      label="Nom"
                      placeholder="Ex. Souffle (L)"
                      value={ability.name}
                      onChange={(e) =>
                        setAbilities((prev) =>
                          prev.map((a, i) => (i === index ? { ...a, name: e.target.value } : a)),
                        )
                      }
                      sx={{ flex: '1 1 160px', minWidth: 140 }}
                      slotProps={{ htmlInput: { maxLength: CUSTOM_FIELD_MAX_LENGTH } }}
                    />
                    <TextField
                      size="small"
                      label="Texte"
                      value={ability.text}
                      onChange={(e) =>
                        setAbilities((prev) =>
                          prev.map((a, i) => (i === index ? { ...a, text: e.target.value } : a)),
                        )
                      }
                      multiline
                      sx={{ flex: '3 1 260px', minWidth: 200 }}
                      slotProps={{ htmlInput: { maxLength: CUSTOM_TEXT_MAX_LENGTH } }}
                    />
                    <AppTooltip title="Retirer cette capacité">
                      <IconButton
                        size="small"
                        aria-label="Retirer cette capacité"
                        onClick={() => setAbilities((prev) => prev.filter((_a, i) => i !== index))}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </AppTooltip>
                  </Stack>
                ))}
              </Stack>

              <Divider />

              {/* Aperçu du bloc « à invoquer », tel qu'il apparaîtra sur la carte de l'écran de MJ. */}
              {customPreview ? (
                <BestiaryStatBlock creature={customPreview} />
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
                    Renseignez l&apos;initiative, les points de vie et la défense pour afficher le
                    bloc de stats.
                  </Typography>
                </Box>
              )}
            </>
          ) : /* Aperçu du bloc de stats « à invoquer », ou invite tant qu'aucune sélection. */
          selected ? (
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
          <Button variant="contained" onClick={handleAdd} disabled={!canAdd}>
            {parsedCount > 1 ? `Ajouter ${parsedCount} créatures au combat` : 'Ajouter au combat'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

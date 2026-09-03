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
 *    sont obligatoires ; agilité, NC, description, attaques, capacités, les 7 caractéristiques
 *    et une RD simple (PER-455) sont facultatifs. Le bloc saisi est copié sur l'instance de
 *    combat, donc affiché partout (écran de MJ, projection, écran joueur) sans rien charger.
 *
 * PER-295 : on peut donner à la créature un **nom personnalisé** (« Grishnak le borgne »,
 * « Garde du corps » — obligatoire pour une créature créée à la main) et un **nombre
 * d'exemplaires** à ajouter d'un coup (« 5 fois le même bandit de base »). Les exemplaires
 * partagent le nom, la visibilité et le camp choisis ; ils sont numérotés à l'affichage tant
 * qu'ils sont homonymes.
 *
 * **Mode ÉDITION** (`editing` renseigné) : la même modale sert à retoucher une instance déjà au
 * combat, depuis le crayon de sa carte. Le formulaire est pré-rempli et l'**identité est figée**
 * — ni la source ni la créature du bestiaire ne changent (changer de créature, c'est en ajouter
 * une autre), et le nombre d'exemplaires disparaît (on édite UNE instance). Restent modifiables
 * le nom, le camp, la visibilité, et le bloc de stats d'une créature créée à la main.
 *
 * L'état du formulaire est initialisé DEPUIS LES PROPS au montage, d'où le découpage
 * coque/corps : `Dialog` démonte ses enfants à la fermeture (`Modal`, `keepMounted` à `false`),
 * donc chaque ouverture remonte le corps avec un état frais. C'est ce qui permet de pré-remplir
 * sans `setState` dans un effet (cf. `set-state-in-effect`).
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
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ABILITY_IDS, RESISTIBLE_DAMAGE_TYPES, type AbilityId, type ResistibleDamageType } from '@/data/schema';
import { useBestiaryStore } from '@/stores/bestiary';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { BestiaryStatBlock } from '@/components/bestiary/BestiaryStatBlock';
import { CreatureBlobView } from '@/components/bestiary/CreatureBlobView';
import { RichTextEditor } from '@/components/sheet/RichTextEditor';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { SCOPE_SHORT } from '@/lib/ui/damageReduction';
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

/**
 * Valeur initiale d'un champ numérique tenu en texte : le nombre rendu tel quel, ou la chaîne
 * vide s'il n'y en a pas (champ facultatif non renseigné). Miroir de `parseIntegerField`.
 */
function numberField(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

/** Intitulé d'une section du formulaire de saisie manuelle. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
      {children}
    </Typography>
  );
}

/**
 * Instance déjà au combat que la modale vient MODIFIER (mode édition). Sa présence bascule la
 * modale de « ajouter » à « enregistrer ».
 */
export interface EditingCreature {
  /** Id de l'instance à modifier. */
  id: string;
  /** Slug de la créature du bestiaire (aperçu en lecture seule ; figé en édition). */
  slug: string;
  /** Bloc de stats saisi à la main, si c'en est une — sa présence rend le formulaire manuel. */
  custom?: CustomCreature;
  /** Nom personnalisé actuel (absent = nom du bestiaire). */
  name?: string;
  /** Camp actuel. */
  side: CreatureSide;
  /** Visibilité joueurs actuelle. */
  visible: boolean;
}

/** Champs que la modale renvoie en mode édition (l'identité de l'instance ne bouge pas). */
export interface EditCreaturePatch {
  name?: string;
  side: CreatureSide;
  visible: boolean;
  custom?: CustomCreature;
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
  /**
   * Instance à MODIFIER. Renseignée, la modale s'ouvre en édition (formulaire pré-rempli,
   * identité figée) ; absente / `null`, c'est la modale d'ajout habituelle.
   */
  editing?: EditingCreature | null;
  /** Enregistre les modifications de l'instance en cours d'édition. */
  onSave: (instanceId: string, patch: EditCreaturePatch) => void;
  /**
   * Appelé quand la modale a FINI de se fermer (fondu terminé). C'est là que l'appelant lâche
   * l'instance éditée : la lâcher dès `onClose` ferait basculer la modale en mode « ajout »
   * sous les yeux de l'utilisateur pendant la fermeture.
   */
  onExited?: () => void;
}

/**
 * Coque de la modale. Tout l'état de saisie vit dans le CORPS, que `Dialog` démonte à la
 * fermeture : chaque ouverture repart donc d'un formulaire initialisé depuis les props
 * (vierge à l'ajout, pré-rempli à l'édition).
 */
export function AddCreatureDialog(props: AddCreatureDialogProps) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      fullWidth
      maxWidth="md"
      slotProps={{ transition: { onExited: props.onExited } }}
      data-glossary-shot="AddCreatureDialog"
    >
      <CreatureDialogBody {...props} />
    </Dialog>
  );
}

function CreatureDialogBody({ onClose, onAdd, onAddCustom, editing, onSave }: AddCreatureDialogProps) {
  const list = useBestiaryStore((s) => s.list);
  const status = useBestiaryStore((s) => s.status);
  const loadList = useBestiaryStore((s) => s.loadList);
  // Mode édition : l'identité (source + créature) est figée, seul le contenu se retouche.
  const editingCustom = editing?.custom;
  // Source de la créature — le bestiaire par défaut (cas le plus courant) ; en édition, celle
  // de l'instance (une créature manuelle porte son bloc, une créature de livre n'en a pas).
  const [source, setSource] = useState<CreatureSource>(
    editing ? (editingCustom ? 'custom' : 'bestiary') : 'bestiary',
  );
  const [selected, setSelected] = useState<string | null>(editing && !editingCustom ? editing.slug : null);
  // Visibilité joueurs (fenêtre projetée) de la créature à ajouter — ON par défaut.
  const [visible, setVisible] = useState(editing?.visible ?? true);
  // Camp de la créature à ajouter (PER-249) — ADVERSAIRE par défaut (cas le plus courant).
  const [side, setSide] = useState<CreatureSide>(editing?.side ?? 'enemy');
  // Nom personnalisé (PER-295) — vide = nom du bestiaire ; OBLIGATOIRE en saisie manuelle.
  const [name, setName] = useState(editing?.name ?? '');
  // Nombre d'exemplaires (PER-295), saisi en TEXTE : un champ numérique doit pouvoir être
  // temporairement vide pendant la frappe. Normalisé (borné) à la validation seulement.
  const [count, setCount] = useState('1');
  // Bloc saisi à la main — tous les champs en texte (cf. `parseIntegerField`).
  const [initiative, setInitiative] = useState(numberField(editingCustom?.initiative));
  const [hitPoints, setHitPoints] = useState(numberField(editingCustom?.hitPoints));
  const [defense, setDefense] = useState(numberField(editingCustom?.defense));
  const [agility, setAgility] = useState(numberField(editingCustom?.agility));
  const [nc, setNc] = useState(editingCustom?.nc ?? '');
  const [description, setDescription] = useState(editingCustom?.description ?? '');
  const [attacks, setAttacks] = useState<AttackDraft[]>(() =>
    (editingCustom?.attacks ?? []).map((a) => ({
      name: a.name,
      bonus: a.bonus ?? '',
      damage: a.damage ?? '',
      range: a.range ?? '',
    })),
  );
  const [abilities, setAbilities] = useState<AbilityDraft[]>(() =>
    (editingCustom?.specialAbilities ?? []).map((a) => ({ name: a.name, text: a.text })),
  );
  // Les 7 caractéristiques (PER-455), facultatives — même patron « texte tenu, entier parsé à la
  // validation » que le reste du socle numérique.
  const [abilityScores, setAbilityScores] = useState<Record<AbilityId, string>>(
    () =>
      Object.fromEntries(
        ABILITY_IDS.map((id) => [id, numberField(editingCustom?.abilities?.[id])]),
      ) as Record<AbilityId, string>,
  );
  // RD simple (PER-455) : une valeur plate + un type de dégât optionnel (liste fermée du jeu).
  const [damageReductionValue, setDamageReductionValue] = useState(
    numberField(editingCustom?.damageReduction?.value),
  );
  const [damageReductionScope, setDamageReductionScope] = useState<ResistibleDamageType | ''>(
    editingCustom?.damageReduction?.scope ?? '',
  );

  const custom = source === 'custom';
  const isEditing = Boolean(editing);

  // Charge la liste au montage (idempotent côté store) — inutile en saisie manuelle, mais
  // la bascule de source ne coûte alors rien.
  useEffect(() => {
    void loadList();
  }, [loadList]);

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
        abilities: Object.fromEntries(
          ABILITY_IDS.map((id) => [id, parseIntegerField(abilityScores[id])]),
        ),
        damageReduction: {
          value: parseIntegerField(damageReductionValue),
          scope: damageReductionScope || undefined,
        },
      }),
    [
      initiative,
      hitPoints,
      defense,
      agility,
      nc,
      description,
      attacks,
      abilities,
      abilityScores,
      damageReductionValue,
      damageReductionScope,
    ],
  );

  // Aperçu du bloc manuel : bloc de bestiaire SYNTHÉTIQUE, rendu exactement comme le sera la
  // carte de l'écran de MJ.
  const customPreview = useMemo(
    () => (customDraft ? customCreatureBlob(customDraft, name.trim()) : undefined),
    [customDraft, name],
  );

  const trimmedName = name.trim();
  const canSubmit = custom ? Boolean(customDraft) && Boolean(trimmedName) : Boolean(selected);

  // Aucune remise à zéro à faire : le corps de la modale est démonté à la fermeture, la
  // prochaine ouverture repart d'un état neuf initialisé depuis les props.
  const handleClose = () => onClose();

  const handleConfirm = () => {
    if (editing) {
      if (!canSubmit) return;
      onSave(editing.id, {
        name: trimmedName,
        side,
        visible,
        // Le bloc n'est renvoyé que pour une créature manuelle ; la couche pure l'ignorerait
        // de toute façon sur une créature du bestiaire.
        ...(custom && customDraft ? { custom: customDraft } : {}),
      });
    } else {
      const options = { visible, side, name: trimmedName || undefined, count: parsedCount };
      if (custom) {
        if (!customDraft || !trimmedName) return;
        onAddCustom(customDraft, options);
      } else {
        if (!selected) return;
        onAdd(selected, options);
      }
    }
    handleClose();
  };

  const loading = !list || status === 'idle' || status === 'loading';

  return (
    <>
      <DialogTitle>{isEditing ? 'Modifier la créature' : 'Ajouter une créature'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {/* Source (bestiaire / saisie manuelle) et camp (PER-249), côte à côte : deux
              segmentés de même facture, repliés l'un sous l'autre en modale étroite.
              En édition, la source est FIGÉE (l'identité de l'instance ne change pas) : le
              segmenté reste affiché, pour dire ce qu'on édite, mais devient inerte. */}
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
            <Stack spacing={0.75}>
              <FieldLabel>Créature</FieldLabel>
              <ToggleButtonGroup
                value={source}
                exclusive
                size="small"
                disabled={isEditing}
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

          {/* Sélecteur du bestiaire — masqué en saisie manuelle, et en édition (changer de
              créature n'est pas une modification : c'est en ajouter une autre). Le bloc de la
              créature reste affiché plus bas, en aperçu. */}
          {!custom &&
            !isEditing &&
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
            {/* Nombre d'exemplaires : à l'ajout seulement — on édite UNE instance à la fois
                (pour en obtenir une de plus, il y a le bouton « dupliquer » de la carte). */}
            {!isEditing && (
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
            )}
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

              {/* Les 7 caractéristiques (PER-455), facultatives : une entrée non renseignée
                  compte pour 0 à l'aperçu, comme sur les micro-fiches de l'écran de MJ. */}
              <Stack spacing={0.75}>
                <FieldLabel>Caractéristiques</FieldLabel>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                  {ABILITY_IDS.map((id) => (
                    <TextField
                      key={id}
                      type="number"
                      size="small"
                      label={ABILITY_NAMES[id]}
                      value={abilityScores[id]}
                      onChange={(e) =>
                        setAbilityScores((prev) => ({ ...prev, [id]: e.target.value }))
                      }
                      helperText="Facultatif"
                      sx={{ flex: '1 1 110px', minWidth: 100 }}
                    />
                  ))}
                </Stack>
              </Stack>

              {/* RD simple (PER-455) : valeur plate + type de dégât facultatif, même liste
                  fermée que la RD du bestiaire — badge et rendu identiques (`DefenseBadge`). */}
              <Stack spacing={0.75}>
                <FieldLabel>Réduction de dégâts</FieldLabel>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                  <TextField
                    type="number"
                    size="small"
                    label="RD"
                    value={damageReductionValue}
                    onChange={(e) => setDamageReductionValue(e.target.value)}
                    helperText="Facultatif"
                    sx={{ flex: '0 1 100px', minWidth: 90 }}
                    slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  />
                  <TextField
                    select
                    size="small"
                    label="Type de dégât"
                    value={damageReductionScope}
                    onChange={(e) =>
                      setDamageReductionScope(e.target.value as ResistibleDamageType | '')
                    }
                    helperText="Facultatif — vide = tous les DM"
                    sx={{ flex: '1 1 180px', minWidth: 160 }}
                  >
                    <MenuItem value="">Tous les DM</MenuItem>
                    {RESISTIBLE_DAMAGE_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {SCOPE_SHORT[type]}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </Stack>

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Description
                </Typography>
                <RichTextEditor value={description} onChange={setDescription} placeholder="Notes libres du MJ (facultatif)" />
              </Box>

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
                    <Box sx={{ flex: '3 1 260px', minWidth: 200 }}>
                      <RichTextEditor
                        value={ability.text}
                        onChange={(text) =>
                          setAbilities((prev) =>
                            prev.map((a, i) => (i === index ? { ...a, text } : a)),
                          )
                        }
                        placeholder="Texte"
                      />
                    </Box>
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
              ? parsedCount > 1 && !isEditing
                ? 'Les créatures seront visibles dans la fenêtre projetée aux joueurs'
                : 'La créature sera visible dans la fenêtre projetée aux joueurs'
              : parsedCount > 1 && !isEditing
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
          <Button variant="contained" onClick={handleConfirm} disabled={!canSubmit}>
            {isEditing
              ? 'Enregistrer'
              : parsedCount > 1
                ? `Ajouter ${parsedCount} créatures au combat`
                : 'Ajouter au combat'}
          </Button>
        </Stack>
      </DialogActions>
    </>
  );
}

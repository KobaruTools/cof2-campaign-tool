'use client';

/**
 * Formulaire de création/édition d'un PNJ (PER-429) — dialogue plein contenu,
 * ouvert depuis `NpcPanel`. Sépare VISUELLEMENT deux blocs qui ne doivent
 * jamais se mélanger (exigence du ticket) :
 * - « Description » — texte potentiellement montrable un jour, avec sa bascule
 *   `descriptionVisibleToPlayers` (même motif que le recap MJ partagé,
 *   `SessionHistoryList`) ;
 * - « Notes du MJ » — encart à part, bordure/icône dédiées, AUCUNE bascule :
 *   ce champ ne doit jamais fuiter à un joueur, quelle que soit une évolution
 *   future du formulaire.
 *
 * Les personnages liés sont sélectionnés (pas de saisie libre) parmi les
 * personnages RATTACHÉS à la campagne (`Character.campaignId`), même source
 * que `campaignCharacters` dans `LootTreasurePanel`.
 */
import { useEffect, useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import CasinoOutlinedIcon from '@mui/icons-material/CasinoOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { BestiaryStatBlock } from '@/components/bestiary/BestiaryStatBlock';
import { RichTextEditor } from '@/components/sheet/RichTextEditor';
import { ancestries, ancestryById } from '@/data';
import type { Character, Sex } from '@/lib/character/types';
import { pickName } from '@/lib/character/names';
import { deriveChallengeRatingFromStats } from '@/lib/campaign/npc';
import { NpcPortraitMenu } from './NpcPortraitMenu';
import {
  useNpcPortraitCropRect,
  useNpcPortraitSrc,
  invalidateNpcPortraitCache,
} from '@/lib/storage/useNpcPortraitSrc';
import { useCroppedImageSrc } from '@/lib/image/useCroppedImageSrc';
import {
  uploadNpcPortrait,
  removeNpcPortrait,
  NpcPortraitValidationError,
} from '@/lib/storage/npcPortrait';
import type { PortraitCropRect } from '@/lib/storage/characterPortrait';
import {
  NPC_DISPOSITION_LABELS,
  NPC_STATUS_LABELS,
  type Npc,
  type NpcDisposition,
  type NpcStatus,
} from '@/lib/campaign/types';
import type { NpcInput } from '@/lib/campaign/repo';
import {
  customCreatureBlob,
  customCreatureFromBestiary,
  normalizeCustomCreature,
  CUSTOM_FIELD_MAX_LENGTH,
  CUSTOM_LIST_MAX_LENGTH,
  CUSTOM_TEXT_MAX_LENGTH,
  type CustomCreature,
} from '@/lib/session/customCreature';
import { useBestiaryStore } from '@/stores/bestiary';
import { CreatureCatalogAutocomplete } from './CreatureCatalogAutocomplete';

/** Source du bloc de stats du PNJ : catalogue du bestiaire (copie figée), ou saisie manuelle. */
type StatsSource = 'bestiary' | 'manual';

/** Ligne d'attaque en cours de saisie (champs libres, tous verbatim) — cf. `AddCreatureDialog`. */
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
 * Entier saisi dans un champ numérique, ou `undefined` si le champ est vide/invalide.
 * Les champs numériques sont tenus en TEXTE : ils doivent pouvoir être temporairement
 * vides pendant la frappe (même motif que `AddCreatureDialog`).
 */
function parseIntegerField(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? Math.trunc(value) : undefined;
}

/** Valeur initiale d'un champ numérique tenu en texte. Miroir de `parseIntegerField`. */
function numberField(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

/** Intitulé d'une sous-section du bloc de stats. */
function StatsFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
      {children}
    </Typography>
  );
}

export interface NpcFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** `undefined` = création, sinon édition du PNJ passé. */
  npc?: Npc;
  /** Personnages RATTACHÉS à la campagne — univers de la sélection multi-PJ. */
  campaignCharacters: Character[];
  /**
   * Noms déjà pris dans la campagne (autres PNJ + PJ), le nom actuel du PNJ
   * édité EXCLU — évités par « Générer un nom » (PER-433), sans jamais bloquer :
   * si la liste du peuple/genre choisi est épuisée par l'exclusion, on retombe
   * sur un nom déjà pris plutôt que de ne rien proposer.
   */
  existingNames: string[];
  onSubmit: (input: NpcInput) => Promise<void>;
}

const DISPOSITIONS: NpcDisposition[] = ['ally', 'neutral', 'enemy'];
const STATUSES: NpcStatus[] = ['not-encountered', 'encountered', 'dead'];

export function NpcFormDialog({
  open,
  onClose,
  npc,
  campaignCharacters,
  existingNames,
  onSubmit,
}: NpcFormDialogProps) {
  const [name, setName] = useState(npc?.name ?? '');
  const [role, setRole] = useState(npc?.role ?? '');
  const [ancestryId, setAncestryId] = useState(npc?.ancestryId ?? '');
  const [sex, setSex] = useState<Sex | ''>(npc?.sex ?? '');
  const [location, setLocation] = useState(npc?.location ?? '');
  const [disposition, setDisposition] = useState<NpcDisposition>(npc?.disposition ?? 'neutral');
  const [status, setStatus] = useState<NpcStatus>(npc?.status ?? 'not-encountered');
  const [description, setDescription] = useState(npc?.description ?? '');
  const [descriptionVisibleToPlayers, setDescriptionVisibleToPlayers] = useState(
    npc?.descriptionVisibleToPlayers ?? false,
  );
  const [gmNotes, setGmNotes] = useState(npc?.gmNotes ?? '');
  const [linkedCharacterIds, setLinkedCharacterIds] = useState<string[]>(
    npc?.linkedCharacterIds ?? [],
  );
  const [saving, setSaving] = useState(false);

  // Illustration du PNJ (PER-437) — pas d'upload possible tant que le PNJ n'a pas
  // encore d'`id` (création) : le chemin de stockage est `{npcId}/portrait`. Comme
  // pour le portrait de personnage dans le wizard, le MJ importe l'image après le
  // premier enregistrement plutôt que de différer l'envoi.
  const portraitSrc = useNpcPortraitSrc(npc?.id);
  const portraitCropRect = useNpcPortraitCropRect(npc?.id);
  const croppedPortraitSrc = useCroppedImageSrc(portraitSrc ?? undefined, portraitCropRect);
  const [portraitBusy, setPortraitBusy] = useState(false);
  const [portraitError, setPortraitError] = useState<string | null>(null);

  const handleSelectPortraitFile = async (file: File, cropRect: PortraitCropRect) => {
    if (!npc) return;
    setPortraitError(null);
    setPortraitBusy(true);
    try {
      await uploadNpcPortrait(npc.id, file, cropRect);
      invalidateNpcPortraitCache(npc.id);
    } catch (e) {
      setPortraitError(
        e instanceof NpcPortraitValidationError ? e.message : "Échec de l'envoi de l'image.",
      );
    } finally {
      setPortraitBusy(false);
    }
  };

  const handleRemovePortrait = async () => {
    if (!npc) return;
    setPortraitError(null);
    setPortraitBusy(true);
    try {
      await removeNpcPortrait(npc.id);
      invalidateNpcPortraitCache(npc.id);
    } catch {
      setPortraitError("Échec du retrait de l'image.");
    } finally {
      setPortraitBusy(false);
    }
  };

  // Statistiques de combat (PER-431) — section repliée par défaut, quel que soit l'état
  // du PNJ édité (le MJ l'ouvre volontairement quand il en a besoin).
  const [statsExpanded, setStatsExpanded] = useState(false);
  // Un PNJ déjà doté de stats est forcément une copie déjà FIGÉE (l'origine bestiaire
  // n'est jamais conservée) : on rouvre directement en saisie manuelle sur ses valeurs.
  const [statsSource, setStatsSource] = useState<StatsSource>(npc?.stats ? 'manual' : 'bestiary');
  const [selectedCreatureSlug, setSelectedCreatureSlug] = useState<string | null>(null);
  const [statsInitiative, setStatsInitiative] = useState(numberField(npc?.stats?.initiative));
  const [statsHitPoints, setStatsHitPoints] = useState(numberField(npc?.stats?.hitPoints));
  const [statsDefense, setStatsDefense] = useState(numberField(npc?.stats?.defense));
  const [statsAgility, setStatsAgility] = useState(numberField(npc?.stats?.agility));
  const [statsNc, setStatsNc] = useState(npc?.stats?.nc ?? '');
  const [statsDescription, setStatsDescription] = useState(npc?.stats?.description ?? '');
  const [statsAttacks, setStatsAttacks] = useState<AttackDraft[]>(() =>
    (npc?.stats?.attacks ?? []).map((a) => ({
      name: a.name,
      bonus: a.bonus ?? '',
      damage: a.damage ?? '',
      range: a.range ?? '',
    })),
  );
  const [statsAbilities, setStatsAbilities] = useState<AbilityDraft[]>(() =>
    (npc?.stats?.specialAbilities ?? []).map((a) => ({ name: a.name, text: a.text })),
  );

  const bestiaryList = useBestiaryStore((s) => s.list);
  const bestiaryStatus = useBestiaryStore((s) => s.status);
  const loadBestiaryList = useBestiaryStore((s) => s.loadList);
  useEffect(() => {
    void loadBestiaryList();
  }, [loadBestiaryList]);
  const bestiaryLoading = !bestiaryList || bestiaryStatus === 'idle' || bestiaryStatus === 'loading';

  // Le catalogue (`list`) ne porte qu'un résumé léger (PER-244) : la copie figée a
  // besoin du BLOB complet (attaques, capacités, description…), chargé à la demande —
  // même mécanisme que `CreatureBlobView` (disque puis réseau, mémoïsé par slug).
  const selectedBlob = useBestiaryStore((s) => (selectedCreatureSlug ? s.blobs[selectedCreatureSlug] : undefined));
  const selectedBlobStatus = useBestiaryStore((s) =>
    selectedCreatureSlug ? s.blobStatus[selectedCreatureSlug] : undefined,
  );
  const loadCreatureBlob = useBestiaryStore((s) => s.loadBlob);
  useEffect(() => {
    if (selectedCreatureSlug) void loadCreatureBlob(selectedCreatureSlug);
  }, [selectedCreatureSlug, loadCreatureBlob]);
  const selectedBlobLoading = Boolean(selectedCreatureSlug) && !selectedBlob && selectedBlobStatus !== 'error';

  const bestiaryDraft = useMemo(
    () => (selectedBlob ? customCreatureFromBestiary(selectedBlob) : undefined),
    [selectedBlob],
  );

  const manualDraft = useMemo<CustomCreature | undefined>(
    () =>
      normalizeCustomCreature({
        initiative: parseIntegerField(statsInitiative),
        hitPoints: parseIntegerField(statsHitPoints),
        defense: parseIntegerField(statsDefense),
        agility: parseIntegerField(statsAgility),
        nc: statsNc,
        description: statsDescription,
        attacks: statsAttacks,
        specialAbilities: statsAbilities,
      }),
    [statsInitiative, statsHitPoints, statsDefense, statsAgility, statsNc, statsDescription, statsAttacks, statsAbilities],
  );

  const effectiveStatsDraft = statsSource === 'bestiary' ? bestiaryDraft : manualDraft;
  const statsPreview = useMemo(
    () => (effectiveStatsDraft ? customCreatureBlob(effectiveStatsDraft, name.trim()) : undefined),
    [effectiveStatsDraft, name],
  );

  /**
   * Bascule de source : quitter « Depuis le bestiaire » copie le dernier bloc
   * sélectionné dans les champs manuels (COPIE FIGÉE, plus aucun lien avec la
   * créature d'origine) avant de basculer, pour que l'édition libre parte de ces
   * valeurs plutôt que de champs vides.
   */
  const handleStatsSourceChange = (next: StatsSource | null) => {
    if (!next || next === statsSource) return;
    if (next === 'manual' && bestiaryDraft) {
      setStatsInitiative(numberField(bestiaryDraft.initiative));
      setStatsHitPoints(numberField(bestiaryDraft.hitPoints));
      setStatsDefense(numberField(bestiaryDraft.defense));
      setStatsAgility(numberField(bestiaryDraft.agility));
      setStatsNc(bestiaryDraft.nc ?? '');
      setStatsDescription(bestiaryDraft.description ?? '');
      setStatsAttacks(
        (bestiaryDraft.attacks ?? []).map((a) => ({
          name: a.name,
          bonus: a.bonus ?? '',
          damage: a.damage ?? '',
          range: a.range ?? '',
        })),
      );
      setStatsAbilities((bestiaryDraft.specialAbilities ?? []).map((a) => ({ name: a.name, text: a.text })));
    }
    setStatsSource(next);
  };

  const linkedCharacters = campaignCharacters.filter((c) => linkedCharacterIds.includes(c.id));

  const ancestry = ancestryId ? ancestryById.get(ancestryId) : undefined;
  const canGenerateName = Boolean(ancestry) && sex !== '';

  const handleGenerateName = () => {
    if (!ancestry || sex === '') return;
    const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
    // Jusqu'à 30 tirages pour éviter un nom déjà pris — au-delà, on retombe sans
    // bloquer sur le dernier tiré (réutilisation acceptée, cf. conception PER-433).
    let candidate: string | null = null;
    for (let i = 0; i < 30; i++) {
      const attempt = pickName(ancestry, sex);
      if (!attempt) break;
      candidate = attempt;
      if (!taken.has(attempt.trim().toLowerCase())) break;
    }
    if (candidate) setName(candidate);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const stats = effectiveStatsDraft ?? null;
    setSaving(true);
    try {
      await onSubmit({
        name: trimmedName,
        role: role.trim() || null,
        ancestryId: ancestryId || null,
        sex: sex || null,
        location: location.trim() || null,
        disposition,
        status,
        description: description.trim() || null,
        descriptionVisibleToPlayers,
        gmNotes: gmNotes.trim() || null,
        linkedCharacterIds,
        stats,
        challengeRating: deriveChallengeRatingFromStats(stats),
      });
      onClose();
    } catch {
      // Déjà signalé par un toast côté appelant (`NpcPanel`) — le dialogue reste
      // ouvert pour permettre une nouvelle tentative.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{npc ? `Modifier « ${npc.name} »` : 'Nouveau PNJ'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                overflow: 'hidden',
                flexShrink: 0,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                bgcolor: 'rgba(255, 255, 255, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {croppedPortraitSrc ?? portraitSrc ? (
                <Box
                  component="img"
                  src={croppedPortraitSrc ?? portraitSrc ?? undefined}
                  alt=""
                  aria-hidden
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                />
              ) : (
                <Diversity3Icon fontSize="small" sx={{ color: 'text.disabled' }} />
              )}
            </Box>
            <NpcPortraitMenu
              hasPortrait={portraitSrc !== null}
              onSelectFile={(file, cropRect) => void handleSelectPortraitFile(file, cropRect)}
              onRemove={() => void handleRemovePortrait()}
              disabled={!npc}
              disabledReason="Enregistrez d'abord le PNJ pour lui ajouter une illustration."
              busy={portraitBusy}
              onValidationError={setPortraitError}
            />
          </Stack>
          {portraitError && (
            <AppAlert severity="error" onClose={() => setPortraitError(null)}>
              {portraitError}
            </AppAlert>
          )}
          <TextField
            label="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            fullWidth
            slotProps={{
              input: {
                endAdornment: (
                  <Tooltip
                    title={canGenerateName ? 'Générer un nom' : 'Choisissez d’abord le peuple et le genre'}
                  >
                    <span>
                      <IconButton
                        size="small"
                        aria-label="Générer un nom"
                        disabled={!canGenerateName}
                        onClick={handleGenerateName}
                      >
                        <CasinoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                ),
              },
            }}
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Rôle"
              placeholder="ex. « Aubergiste »"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              fullWidth
            />
            <TextField
              label="Lieu"
              placeholder="ex. « Taverne du Sanglier »"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              fullWidth
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Peuple"
              value={ancestryId}
              onChange={(e) => setAncestryId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">
                <em>Non renseigné</em>
              </MenuItem>
              {ancestries.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Genre"
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex | '')}
              fullWidth
            >
              <MenuItem value="">
                <em>Non renseigné</em>
              </MenuItem>
              <MenuItem value="male">Homme</MenuItem>
              <MenuItem value="female">Femme</MenuItem>
            </TextField>
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Disposition"
              value={disposition}
              onChange={(e) => setDisposition(e.target.value as NpcDisposition)}
              fullWidth
            >
              {DISPOSITIONS.map((d) => (
                <MenuItem key={d} value={d}>
                  {NPC_DISPOSITION_LABELS[d]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Statut"
              value={status}
              onChange={(e) => setStatus(e.target.value as NpcStatus)}
              fullWidth
            >
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {NPC_STATUS_LABELS[s]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Autocomplete
            multiple
            options={campaignCharacters}
            getOptionLabel={(c) => c.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={linkedCharacters}
            onChange={(_, value) => setLinkedCharacterIds(value.map((c) => c.id))}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Personnages joueurs liés"
                placeholder={campaignCharacters.length === 0 ? 'Aucun personnage dans cette campagne' : ''}
              />
            )}
            disabled={campaignCharacters.length === 0}
          />

          {/* Bloc description — potentiellement publique un jour, bascule de publication. */}
          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Description
              </Typography>
              <FormControlLabel
                sx={{ mr: 0 }}
                control={
                  <Switch
                    size="small"
                    checked={descriptionVisibleToPlayers}
                    onChange={(e) => setDescriptionVisibleToPlayers(e.target.checked)}
                  />
                }
                label={
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    {descriptionVisibleToPlayers ? (
                      <PublicIcon fontSize="small" />
                    ) : (
                      <LockIcon fontSize="small" />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {descriptionVisibleToPlayers ? 'Visible aux joueurs' : 'Privé (MJ uniquement)'}
                    </Typography>
                  </Stack>
                }
                labelPlacement="start"
              />
            </Stack>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Description libre du PNJ…"
            />
          </Box>

          {/* Encart « MJ seul » — visuellement distinct, AUCUNE bascule : jamais montrable. */}
          <Box
            sx={(theme) => ({
              p: 1.5,
              borderRadius: 1,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}`,
              bgcolor: alpha(theme.palette.warning.main, 0.08),
            })}
          >
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 0.5 }}>
              <LockIcon fontSize="small" color="warning" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Notes du MJ — jamais visibles des joueurs
              </Typography>
            </Stack>
            <RichTextEditor
              value={gmNotes}
              onChange={setGmNotes}
              placeholder="ex. « En réalité un espion. »"
            />
          </Box>

          {/* Statistiques de combat (PER-431) — repliées par défaut : facultatives, ne
              concernent que les PNJ amenés à combattre. */}
          <Box>
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setStatsExpanded((v) => !v)}
            >
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); setStatsExpanded((v) => !v); }}>
                {statsExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Statistiques de combat
              </Typography>
              {!statsExpanded && npc?.stats ? (
                <Typography variant="caption" color="text.secondary">
                  (renseignées)
                </Typography>
              ) : null}
            </Stack>
            <Collapse in={statsExpanded}>
              <Stack spacing={2} sx={{ pt: 1.5, pl: { sm: 4.5 } }}>
                <ToggleButtonGroup
                  value={statsSource}
                  exclusive
                  size="small"
                  onChange={(_e, next: StatsSource | null) => handleStatsSourceChange(next)}
                  aria-label="Source des statistiques"
                >
                  <ToggleButton value="bestiary" sx={{ textTransform: 'none' }}>
                    Depuis le bestiaire
                  </ToggleButton>
                  <ToggleButton value="manual" sx={{ textTransform: 'none' }}>
                    Saisie manuelle
                  </ToggleButton>
                </ToggleButtonGroup>

                {statsSource === 'bestiary' &&
                  (bestiaryStatus === 'error' ? (
                    <AppAlert
                      severity="error"
                      title="Chargement du bestiaire impossible"
                      action={
                        <Button color="inherit" size="small" onClick={() => loadBestiaryList({ force: true })}>
                          Réessayer
                        </Button>
                      }
                    >
                      Une erreur est survenue en chargeant les créatures.
                    </AppAlert>
                  ) : bestiaryStatus === 'unconfigured' ? (
                    <AppAlert severity="info" title="Bestiaire indisponible">
                      Le bestiaire est servi depuis la base de données, qui n&apos;est pas configurée
                      dans cet environnement.
                    </AppAlert>
                  ) : bestiaryLoading ? (
                    <Skeleton variant="rounded" height={40} />
                  ) : (
                    <CreatureCatalogAutocomplete
                      options={bestiaryList}
                      value={selectedCreatureSlug}
                      onSelect={setSelectedCreatureSlug}
                    />
                  ))}

                {statsSource === 'manual' && (
                  <>
                    <Stack spacing={0.75}>
                      <StatsFieldLabel>Socle (requis dès qu&apos;un des trois est renseigné)</StatsFieldLabel>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                        <TextField
                          type="number"
                          size="small"
                          label="Initiative"
                          value={statsInitiative}
                          onChange={(e) => setStatsInitiative(e.target.value)}
                          sx={{ flex: '1 1 120px', minWidth: 110 }}
                        />
                        <TextField
                          type="number"
                          size="small"
                          label="Points de vie"
                          value={statsHitPoints}
                          onChange={(e) => setStatsHitPoints(e.target.value)}
                          sx={{ flex: '1 1 120px', minWidth: 110 }}
                          slotProps={{ htmlInput: { min: 0, step: 1 } }}
                        />
                        <TextField
                          type="number"
                          size="small"
                          label="Défense"
                          value={statsDefense}
                          onChange={(e) => setStatsDefense(e.target.value)}
                          sx={{ flex: '1 1 120px', minWidth: 110 }}
                        />
                        <TextField
                          type="number"
                          size="small"
                          label="Agilité"
                          value={statsAgility}
                          onChange={(e) => setStatsAgility(e.target.value)}
                          helperText="Départage les égalités"
                          sx={{ flex: '1 1 120px', minWidth: 110 }}
                        />
                        <TextField
                          size="small"
                          label="NC"
                          value={statsNc}
                          onChange={(e) => setStatsNc(e.target.value)}
                          helperText="Facultatif"
                          sx={{ flex: '0 1 100px', minWidth: 90 }}
                          slotProps={{ htmlInput: { maxLength: CUSTOM_FIELD_MAX_LENGTH } }}
                        />
                      </Stack>
                    </Stack>

                    <TextField
                      size="small"
                      label="Description"
                      placeholder="Notes de combat libres (facultatif)"
                      value={statsDescription}
                      onChange={(e) => setStatsDescription(e.target.value)}
                      multiline
                      minRows={2}
                      slotProps={{ htmlInput: { maxLength: CUSTOM_TEXT_MAX_LENGTH } }}
                    />

                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <StatsFieldLabel>Attaques</StatsFieldLabel>
                        <Box sx={{ flexGrow: 1 }} />
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          disabled={statsAttacks.length >= CUSTOM_LIST_MAX_LENGTH}
                          onClick={() => setStatsAttacks((prev) => [...prev, { ...EMPTY_ATTACK }])}
                        >
                          Ajouter une attaque
                        </Button>
                      </Stack>
                      {statsAttacks.map((attack, index) => (
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
                              setStatsAttacks((prev) =>
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
                              setStatsAttacks((prev) =>
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
                              setStatsAttacks((prev) =>
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
                              setStatsAttacks((prev) =>
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
                              onClick={() => setStatsAttacks((prev) => prev.filter((_a, i) => i !== index))}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </AppTooltip>
                        </Stack>
                      ))}
                    </Stack>

                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <StatsFieldLabel>Capacités spéciales</StatsFieldLabel>
                        <Box sx={{ flexGrow: 1 }} />
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          disabled={statsAbilities.length >= CUSTOM_LIST_MAX_LENGTH}
                          onClick={() => setStatsAbilities((prev) => [...prev, { ...EMPTY_ABILITY }])}
                        >
                          Ajouter une capacité
                        </Button>
                      </Stack>
                      {statsAbilities.map((ability, index) => (
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
                              setStatsAbilities((prev) =>
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
                              setStatsAbilities((prev) =>
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
                              onClick={() => setStatsAbilities((prev) => prev.filter((_a, i) => i !== index))}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </AppTooltip>
                        </Stack>
                      ))}
                    </Stack>
                  </>
                )}

                <Divider />

                {statsSource === 'bestiary' && selectedBlobLoading ? (
                  <Skeleton variant="rounded" height={120} />
                ) : statsSource === 'bestiary' && selectedBlobStatus === 'error' ? (
                  <AppAlert severity="error" title="Chargement du bloc de stats impossible">
                    Une erreur est survenue en chargeant cette créature.
                  </AppAlert>
                ) : statsPreview ? (
                  <BestiaryStatBlock creature={statsPreview} />
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
                      {statsSource === 'bestiary'
                        ? 'Sélectionnez une créature pour copier son bloc de stats.'
                        : "Renseignez l'initiative, les points de vie et la défense pour afficher le bloc de stats."}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Collapse>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving || !name.trim()}>
          {npc ? 'Enregistrer' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

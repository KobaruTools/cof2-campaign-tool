'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import {
  capaciteParId,
  equipement,
  familles,
  peupleParId,
  peuples,
  profils,
  profilParId,
  progression,
  voieParId,
} from '@/data';
import type { CaracId, ModificateurCarac } from '@/data/schema';
import { CARAC_IDS } from '@/data/schema';
import { deriveStats, verifierConformite, type MoteurContexte } from '@/lib/engine';
import {
  choixInitiaux,
  deltasModificateurs,
  deuxPlusFaibles,
} from '@/lib/character/peuple';
import {
  caracsFinales,
  capaciteIdsNiveau1,
  materializeDraft,
  type WizardDraft,
} from '@/lib/character/wizard';
import {
  defenseDepuisEquipement,
  equipementInitial,
  libelleEquipement,
  repartirSerie,
  series,
} from './helpers';
import { couleurProfil } from '@/lib/ui/profilColors';
import { CARAC_NOMS } from '@/lib/ui/carac';
import { CaracBadge, CaracBadgeList } from '@/components/CaracBadge';

const familleParId = new Map(familles.map((f) => [f.id, f]));

/**
 * Découpe la description d'un peuple à la section « Interpréter un … » : le
 * texte avant reste affiché, la section et son corps partent dans un accordéon.
 */
function decouperDescription(desc: string): {
  intro: string;
  interpretationTitre: string | null;
  interpretationCorps: string;
} {
  const idx = desc.search(/^Interpréter /m);
  if (idx === -1) return { intro: desc.trim(), interpretationTitre: null, interpretationCorps: '' };
  const reste = desc.slice(idx);
  const nl = reste.indexOf('\n');
  return {
    intro: desc.slice(0, idx).trim(),
    interpretationTitre: (nl === -1 ? reste : reste.slice(0, nl)).trim(),
    interpretationCorps: nl === -1 ? '' : reste.slice(nl).trim(),
  };
}

/**
 * Affichage inline d'un modificateur de peuple : la valeur signée puis les
 * caractéristiques concernées sous forme de badges (ex. « +1 [PER] ou [CHA] »).
 * Cas humain (les 7 caracs listées) : « +1 à une de vos deux plus faibles ».
 */
function ModificateurPeuple({ mod }: { mod: ModificateurCarac }) {
  const theme = useTheme();
  const bonus = mod.valeur > 0;
  const signe = bonus ? '+' : '';
  const teinte = bonus ? theme.palette.success.main : theme.palette.error.main;
  const estFaibles = mod.caracs.length === CARAC_IDS.length;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Chip
        label={`${signe}${mod.valeur}`}
        color={bonus ? 'success' : 'error'}
        variant="outlined"
        size="small"
        sx={{ minWidth: 48, fontWeight: 700, '& .MuiChip-label': { px: 0 } }}
      />
      {estFaibles ? (
        <Typography variant="body2" color="text.secondary">
          à une de vos deux plus faibles caractéristiques (au choix)
        </Typography>
      ) : (
        mod.caracs.map((c, j) => (
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
            <CaracBadge carac={c} color={teinte} />
          </Box>
        ))
      )}
    </Stack>
  );
}

export interface StepProps {
  draft: WizardDraft;
  patch: (partial: Partial<WizardDraft>) => void;
}

// ---------------------------------------------------------------------------
// Étape 1 — Peuple
// ---------------------------------------------------------------------------

export function PeupleStep({ draft, patch }: StepProps) {
  const peuple = peupleParId.get(draft.peupleId);
  const desc = peuple ? decouperDescription(peuple.description) : null;

  const choisirPeuple = (id: string) => {
    const p = peupleParId.get(id);
    if (!p) return;
    patch({
      peupleId: id,
      peupleChoix: choixInitiaux(p),
      voieDePeupleId: p.voieDePeupleIds.length === 1 ? p.voieDePeupleIds[0] : null,
    });
  };

  return (
    <Stack spacing={3}>
      <FormControl>
        <FormLabel>Peuple</FormLabel>
        <RadioGroup value={draft.peupleId} onChange={(e) => choisirPeuple(e.target.value)}>
          <Grid container spacing={1}>
            {peuples.map((p) => (
              <Grid key={p.id} size={{ xs: 12, sm: 6 }}>
                <FormControlLabel value={p.id} control={<Radio />} label={p.nom} />
              </Grid>
            ))}
          </Grid>
        </RadioGroup>
      </FormControl>

      {peuple && (
        <Card variant="outlined">
          <CardMedia
            component="img"
            image={`/peuples/${peuple.id}.webp`}
            alt={`Illustration du peuple ${peuple.nom}`}
            sx={{ maxHeight: 320, objectFit: 'cover', objectPosition: 'center' }}
          />
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              {peuple.nom}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
              {desc?.intro}
            </Typography>

            {desc?.interpretationTitre && (
              <Accordion
                disableGutters
                elevation={0}
                sx={{ mb: 2, border: 1, borderColor: 'divider', '&::before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">{desc.interpretationTitre}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ whiteSpace: 'pre-line' }}
                  >
                    {desc.interpretationCorps}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Modificateurs de caractéristiques
              </Typography>
              <Stack spacing={1}>
                {peuple.modificateurs.map((mod, i) => (
                  <ModificateurPeuple key={i} mod={mod} />
                ))}
              </Stack>
            </Box>

            {peuple.voieDePeupleIds.length > 1 && (
              <FormControl sx={{ mt: 1, minWidth: 260 }} size="small">
                <InputLabel>Voie de peuple</InputLabel>
                <Select
                  label="Voie de peuple"
                  value={draft.voieDePeupleId ?? ''}
                  onChange={(e) => patch({ voieDePeupleId: e.target.value })}
                >
                  {peuple.voieDePeupleIds.map((vid) => (
                    <MenuItem key={vid} value={vid}>
                      {voieParId.get(vid)?.nom ?? vid}
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

// ---------------------------------------------------------------------------
// Étape 2 — Profil
// ---------------------------------------------------------------------------

export function ProfilStep({ draft, patch }: StepProps) {
  const profil = profilParId.get(draft.profilId);

  const choisirProfil = (id: string) => {
    const p = profilParId.get(id);
    if (!p) return;
    patch({
      profilId: id,
      voiesChoisies: [],
      slotVoieDuMage: false,
      mageBonus: null,
      equipment: equipementInitial(p),
    });
  };

  return (
    <Stack spacing={3}>
      <FormControl>
        <FormLabel>Profil</FormLabel>
        <RadioGroup value={draft.profilId} onChange={(e) => choisirProfil(e.target.value)}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {familles.map((famille) => {
              const profilsFamille = profils.filter((p) => p.familleId === famille.id);
              if (profilsFamille.length === 0) return null;
              return (
                <Box key={famille.id}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}
                  >
                    {famille.nom}
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <Grid container spacing={1}>
                    {profilsFamille.map((p) => {
                      const couleur = couleurProfil(p.id);
                      return (
                        <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
                          <FormControlLabel
                            value={p.id}
                            sx={{
                              m: 0,
                              pl: 1,
                              borderLeft: 3,
                              borderColor: couleur,
                              borderRadius: 1,
                            }}
                            control={
                              <Radio
                                sx={{ color: couleur, '&.Mui-checked': { color: couleur } }}
                              />
                            }
                            label={p.nom}
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              );
            })}
          </Stack>
        </RadioGroup>
      </FormControl>

      {profil && (
        <Card
          variant="outlined"
          sx={{ borderLeft: 5, borderLeftColor: couleurProfil(profil.id) }}
        >
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ color: couleurProfil(profil.id) }}>
              {profil.nom}
            </Typography>
            <Box sx={{ mb: 1.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.5 }}
              >
                Caractéristiques conseillées
              </Typography>
              <CaracBadgeList caracs={profil.caracsConseillees} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {profil.armesEtArmures}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Étape 3 — Caractéristiques
// ---------------------------------------------------------------------------

export function CaracsStep({ draft, patch }: StepProps) {
  const peuple = peupleParId.get(draft.peupleId);
  const profil = profilParId.get(draft.profilId);
  if (!peuple) return <Alert severity="warning">Choisissez d’abord un peuple.</Alert>;

  const deltas = deltasModificateurs(peuple, draft.peupleChoix);
  const faibles = deuxPlusFaibles(draft.caracsBase);

  const appliquerSerie = (valeurs: number[]) => {
    patch({ caracsBase: repartirSerie(valeurs, profil?.caracsConseillees ?? []) });
  };

  const setBase = (id: CaracId, value: number) => {
    patch({ caracsBase: { ...draft.caracsBase, [id]: value } });
  };

  const setChoix = (index: number, carac: CaracId) => {
    const next = [...draft.peupleChoix];
    next[index] = carac;
    patch({ peupleChoix: next });
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Reportez les valeurs déterminées à la table (saisie libre). Les séries du livre sont
          proposées comme point de départ.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {series.map((s) => (
            <Button key={s.id} size="small" variant="outlined" onClick={() => appliquerSerie(s.valeurs)}>
              {s.nom} ({s.valeurs.join(', ')})
            </Button>
          ))}
        </Stack>
      </Box>

      {/* Résolution des modificateurs de peuple à choix */}
      {peuple.modificateurs.some((m) => m.caracs.length > 1) && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Modificateurs de {peuple.nom}
            </Typography>
            <Stack spacing={2}>
              {peuple.modificateurs.map((mod, i) =>
                mod.caracs.length === 1 ? null : (
                  <FormControl key={i} size="small" sx={{ minWidth: 260 }}>
                    <InputLabel>{`${mod.valeur > 0 ? '+' : ''}${mod.valeur} à`}</InputLabel>
                    <Select
                      label={`${mod.valeur > 0 ? '+' : ''}${mod.valeur} à`}
                      value={draft.peupleChoix[i] ?? ''}
                      onChange={(e) => setChoix(i, e.target.value as CaracId)}
                    >
                      {(mod.caracs.length === CARAC_IDS.length ? CARAC_IDS : mod.caracs).map((c) => (
                        <MenuItem key={c} value={c}>
                          {CARAC_NOMS[c]}
                          {mod.caracs.length === CARAC_IDS.length && faibles.includes(c)
                            ? ' (faible)'
                            : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ),
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        {CARAC_IDS.map((id) => {
          const total = draft.caracsBase[id] + deltas[id];
          return (
            <Grid key={id} size={{ xs: 12, sm: 6 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <TextField
                  label={CARAC_NOMS[id]}
                  type="number"
                  size="small"
                  value={draft.caracsBase[id]}
                  onChange={(e) => setBase(id, Number(e.target.value) || 0)}
                  sx={{ width: 130 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                  {deltas[id] !== 0 ? `peuple ${deltas[id] > 0 ? '+' : ''}${deltas[id]}` : ''}
                </Typography>
                <Chip label={`= ${total > 0 ? '+' : ''}${total}`} />
              </Stack>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Étape 4 — Voies & capacités
// ---------------------------------------------------------------------------

export function VoiesStep({ draft, patch }: StepProps) {
  const profil = profilParId.get(draft.profilId);
  if (!profil) return <Alert severity="warning">Choisissez d’abord un profil.</Alert>;
  const estMage = profil.familleId === 'mages';
  const peuple = peupleParId.get(draft.peupleId);

  const toggleVoie = (voieId: string) => {
    const has = draft.voiesChoisies.includes(voieId);
    let next: string[];
    if (has) next = draft.voiesChoisies.filter((v) => v !== voieId);
    else if (draft.voiesChoisies.length >= 2) return; // max 2
    else next = [...draft.voiesChoisies, voieId];
    // si le bonus de mage ciblait une voie retirée, on le réinitialise
    const mageBonus =
      draft.mageBonus?.type === 'profil-rang2' && !next.includes(draft.mageBonus.voieId)
        ? null
        : draft.mageBonus;
    patch({ voiesChoisies: next, mageBonus });
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Choisissez 2 voies de profil ({draft.voiesChoisies.length}/2)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Vous recevez gratuitement la capacité de rang 1 de chaque voie choisie, ainsi que le
          rang 1 de votre voie de peuple.
        </Typography>
        <Stack>
          {profil.voieIds.map((vid) => {
            const voie = voieParId.get(vid);
            const checked = draft.voiesChoisies.includes(vid);
            const disabled = !checked && draft.voiesChoisies.length >= 2;
            return (
              <FormControlLabel
                key={vid}
                control={
                  <Checkbox checked={checked} disabled={disabled} onChange={() => toggleVoie(vid)} />
                }
                label={voie?.nom ?? vid}
              />
            );
          })}
        </Stack>
      </Box>

      {estMage && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Options de mage (niveau 1)
            </Typography>

            <FormControl sx={{ mb: 2 }}>
              <FormLabel>Emplacement de la voie de peuple</FormLabel>
              <RadioGroup
                value={draft.slotVoieDuMage ? 'mage' : 'peuple'}
                onChange={(e) => {
                  const slot = e.target.value === 'mage';
                  const mageBonus =
                    !slot && draft.mageBonus?.type === 'mage-rang2' ? null : draft.mageBonus;
                  patch({ slotVoieDuMage: slot, mageBonus });
                }}
              >
                <FormControlLabel
                  value="peuple"
                  control={<Radio />}
                  label={`Voie de peuple${peuple ? ` (${peuple.nom})` : ''}`}
                />
                <FormControlLabel
                  value="mage"
                  control={<Radio />}
                  label="Voie du mage (remplace la voie de peuple ; rang 1 de peuple conservé)"
                />
              </RadioGroup>
            </FormControl>

            <FormControl>
              <FormLabel>Capacité de rang 2 supplémentaire</FormLabel>
              <RadioGroup
                value={
                  draft.mageBonus?.type === 'mage-rang2'
                    ? 'mage'
                    : draft.mageBonus?.type === 'profil-rang2'
                      ? draft.mageBonus.voieId
                      : ''
                }
                onChange={(e) => {
                  const v = e.target.value;
                  patch({
                    mageBonus:
                      v === 'mage' ? { type: 'mage-rang2' } : { type: 'profil-rang2', voieId: v },
                  });
                }}
              >
                {draft.voiesChoisies.map((vid) => (
                  <FormControlLabel
                    key={vid}
                    value={vid}
                    control={<Radio />}
                    label={`Rang 2 — ${voieParId.get(vid)?.nom ?? vid}`}
                  />
                ))}
                {draft.slotVoieDuMage && (
                  <FormControlLabel
                    value="mage"
                    control={<Radio />}
                    label="Rang 2 — Voie du mage"
                  />
                )}
              </RadioGroup>
            </FormControl>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Étape 5 — Équipement
// ---------------------------------------------------------------------------

export function EquipementStep({ draft, patch }: StepProps) {
  const retirer = (index: number) => {
    patch({ equipment: draft.equipment.filter((_, i) => i !== index) });
  };
  const ajouter = (itemId: string) => {
    patch({ equipment: [...draft.equipment, { itemId, quantite: 1 }] });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Équipement de départ du profil + sac d’aventurier. Ajustez librement.
      </Typography>

      <Stack divider={<Divider />}>
        {draft.equipment.map((ligne, i) => (
          <Stack key={i} direction="row" sx={{ alignItems: 'center', py: 0.5 }}>
            <Typography sx={{ flexGrow: 1 }}>
              {libelleEquipement(ligne)}
              {ligne.quantite > 1 ? ` ×${ligne.quantite}` : ''}
            </Typography>
            <IconButton size="small" color="error" onClick={() => retirer(i)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
        {draft.equipment.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Aucun équipement.
          </Typography>
        )}
      </Stack>

      <Autocomplete
        options={equipement}
        getOptionLabel={(o) => o.nom}
        renderInput={(params) => <TextField {...params} label="Ajouter un objet du catalogue" />}
        onChange={(_, value) => {
          if (value) ajouter(value.id);
        }}
        value={null}
        blurOnSelect
        clearOnBlur
      />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Étape 6 — Identité
// ---------------------------------------------------------------------------

export function IdentiteStep({ draft, patch }: StepProps) {
  return (
    <Stack spacing={2} sx={{ maxWidth: 520 }}>
      <TextField
        label="Nom"
        required
        value={draft.name}
        onChange={(e) => patch({ name: e.target.value })}
        fullWidth
      />
      <Stack direction="row" spacing={2}>
        <TextField
          label="Sexe"
          value={draft.identity.sexe ?? ''}
          onChange={(e) => patch({ identity: { ...draft.identity, sexe: e.target.value } })}
        />
        <TextField
          label="Âge"
          value={draft.identity.age ?? ''}
          onChange={(e) => patch({ identity: { ...draft.identity, age: e.target.value } })}
        />
      </Stack>
      <TextField
        label="Description"
        multiline
        minRows={3}
        value={draft.identity.description ?? ''}
        onChange={(e) => patch({ identity: { ...draft.identity, description: e.target.value } })}
        fullWidth
      />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Étape 7 — Récapitulatif
// ---------------------------------------------------------------------------

const moteurCtx: MoteurContexte = {
  capaciteParId,
  voieParId,
  profilParId,
  familleParId,
  progression,
};

export function RecapStep({ draft }: StepProps) {
  const peuple = peupleParId.get(draft.peupleId);
  const profil = profilParId.get(draft.profilId);
  const famille = profil ? familleParId.get(profil.familleId) : undefined;
  if (!peuple || !profil || !famille) {
    return <Alert severity="warning">Récapitulatif indisponible : étapes incomplètes.</Alert>;
  }

  const caracs = caracsFinales(draft, peuple);
  const capaciteIds = capaciteIdsNiveau1(draft);
  const nbSorts = capaciteIds.filter((id) => capaciteParId.get(id)?.estSort).length;
  const stats = deriveStats({
    caracs,
    niveau: 1,
    famille,
    defenseEquipement: defenseDepuisEquipement(draft.equipment),
    nbSorts,
  });
  const preview = materializeDraft(draft, peuple, draft.createdAt);
  const avertissements = verifierConformite(preview, moteurCtx);

  const statLignes: Array<[string, string | number]> = [
    ['Points de vigueur', stats.pvMax],
    ['Défense', stats.defense],
    ['Initiative', stats.initiative],
    ['Points de chance', stats.pointsChance],
    ['Dés de récupération', `${stats.nbDesRecuperation} ${stats.deRecuperation}`],
    ['Points de mana', stats.pointsMana ?? '—'],
    ['Attaque contact', stats.attaqueContact],
    ['Attaque distance', stats.attaqueDistance],
    ['Attaque magique', stats.attaqueMagique],
  ];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle1">{draft.name || 'Nouveau personnage'}</Typography>
        <Typography variant="body2" color="text.secondary">
          {peuple.nom} · {profil.nom} · niveau 1
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Caractéristiques
        </Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {CARAC_IDS.map((id) => (
            <Chip key={id} label={`${id} ${caracs[id] > 0 ? '+' : ''}${caracs[id]}`} />
          ))}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Statistiques dérivées
        </Typography>
        <Grid container spacing={1}>
          {statLignes.map(([label, value]) => (
            <Grid key={label} size={{ xs: 6, sm: 4 }}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {label}
                  </Typography>
                  <Typography variant="h6">{value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Typography variant="caption" color="text.secondary">
          (Les bonus apportés par les capacités ne sont pas encore appliqués automatiquement.)
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Capacités acquises
        </Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {capaciteIds.map((id) => (
            <Chip key={id} label={capaciteParId.get(id)?.nom ?? id} size="small" />
          ))}
        </Stack>
      </Box>

      {avertissements.length > 0 && (
        <Alert severity="warning">
          {avertissements.map((a) => a.message).join(' ')}
        </Alert>
      )}
    </Stack>
  );
}
